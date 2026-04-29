/**
 * =====================================================
 * Workload Engine - SQLite Compatible
 * Calculates employee workload scores
 * =====================================================
 */

const db = require('../config/db');

/**
 * Configuration thresholds
 */
const CONFIG = {
    WORKLOAD_HIGH_THRESHOLD: 70,
    WORKLOAD_MEDIUM_THRESHOLD: 40,
    MAX_WEEKLY_HOURS: 40,
    TASK_WEIGHT: 0.25,
    PRIORITY_WEIGHT: 0.25,
    DEADLINE_WEIGHT: 0.25,
    HOURS_WEIGHT: 0.25
};

/**
 * Calculate risk level based on score
 */
function getRiskLevel(score) {
    if (score >= CONFIG.WORKLOAD_HIGH_THRESHOLD) return 'high';
    if (score >= CONFIG.WORKLOAD_MEDIUM_THRESHOLD) return 'medium';
    return 'low';
}

/**
 * Process workload for a single employee
 */
async function processEmployeeWorkload(employeeId) {
    try {
        // Get task statistics
        const taskResult = await db.query(
            `SELECT 
                COUNT(*) as total_tasks,
                SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_tasks,
                SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) as in_progress_tasks,
                SUM(CASE WHEN priority = 'high' AND status != 'completed' THEN 1 ELSE 0 END) as high_priority_tasks,
                SUM(CASE WHEN deadline < datetime('now') AND status != 'completed' THEN 1 ELSE 0 END) as overdue_tasks,
                SUM(CASE WHEN deadline BETWEEN datetime('now') AND datetime('now', '+3 days') AND status != 'completed' THEN 1 ELSE 0 END) as due_soon_tasks,
                COALESCE(SUM(CASE WHEN status != 'completed' THEN estimated_hours ELSE 0 END), 0) as pending_hours
             FROM tasks
             WHERE employee_id = $1`,
            [employeeId]
        );

        const stats = taskResult.rows[0] || {};
        const totalTasks = parseInt(stats.total_tasks) || 0;
        const pendingTasks = parseInt(stats.pending_tasks) || 0;
        const inProgressTasks = parseInt(stats.in_progress_tasks) || 0;
        const highPriorityTasks = parseInt(stats.high_priority_tasks) || 0;
        const overdueTasks = parseInt(stats.overdue_tasks) || 0;
        const dueSoonTasks = parseInt(stats.due_soon_tasks) || 0;
        const pendingHours = parseFloat(stats.pending_hours) || 0;

        // Calculate component scores (0-100)
        const activeTasks = pendingTasks + inProgressTasks;
        const taskScore = Math.min(100, activeTasks * 10);
        const priorityScore = Math.min(100, highPriorityTasks * 20);
        const deadlineScore = Math.min(100, (overdueTasks * 30) + (dueSoonTasks * 15));
        const hoursScore = Math.min(100, (pendingHours / CONFIG.MAX_WEEKLY_HOURS) * 100);

        // Calculate weighted average
        const totalScore = Math.round(
            (taskScore * CONFIG.TASK_WEIGHT) +
            (priorityScore * CONFIG.PRIORITY_WEIGHT) +
            (deadlineScore * CONFIG.DEADLINE_WEIGHT) +
            (hoursScore * CONFIG.HOURS_WEIGHT)
        );

        const riskLevel = getRiskLevel(totalScore);

        // Save to database
        const today = new Date().toISOString().split('T')[0];

        // Check if record exists for today
        const existingResult = await db.query(
            `SELECT id FROM workload_scores WHERE user_id = $1 AND calculated_date = $2`,
            [employeeId, today]
        );

        if (existingResult.rows.length > 0) {
            // Update existing record
            await db.query(
                `UPDATE workload_scores 
                 SET score = $1, risk_level = $2, breakdown = $3
                 WHERE user_id = $4 AND calculated_date = $5`,
                [totalScore, riskLevel, JSON.stringify({ taskScore, priorityScore, deadlineScore, hoursScore }), employeeId, today]
            );
        } else {
            // Insert new record
            await db.query(
                `INSERT INTO workload_scores (user_id, score, risk_level, breakdown, calculated_date)
                 VALUES ($1, $2, $3, $4, $5)`,
                [employeeId, totalScore, riskLevel, JSON.stringify({ taskScore, priorityScore, deadlineScore, hoursScore }), today]
            );
        }

        return {
            employeeId,
            score: totalScore,
            riskLevel,
            breakdown: {
                taskScore,
                priorityScore,
                deadlineScore,
                hoursScore
            },
            taskStats: {
                total: totalTasks,
                pending: pendingTasks,
                inProgress: inProgressTasks,
                highPriority: highPriorityTasks,
                overdue: overdueTasks,
                dueSoon: dueSoonTasks,
                pendingHours
            }
        };

    } catch (error) {
        console.error('Process employee workload error:', error);
        throw error;
    }
}

/**
 * Process workload for all employees
 */
async function processAllEmployeesWorkload() {
    try {
        const employeesResult = await db.query(
            `SELECT id FROM users WHERE role = 'employee' AND is_active = 1`
        );

        const results = [];
        for (const employee of employeesResult.rows) {
            try {
                const workload = await processEmployeeWorkload(employee.id);
                results.push(workload);
            } catch (error) {
                results.push({ employeeId: employee.id, error: error.message });
            }
        }

        return results;
    } catch (error) {
        console.error('Process all employees error:', error);
        throw error;
    }
}

/**
 * Get workload history for an employee
 */
async function getWorkloadHistory(employeeId, days = 30) {
    try {
        const result = await db.query(
            `SELECT calculated_date, score, risk_level, breakdown
             FROM workload_scores
             WHERE user_id = $1
             AND calculated_date >= date('now', '-' || $2 || ' days')
             ORDER BY calculated_date ASC`,
            [employeeId, days]
        );

        return result.rows.map(row => ({
            date: row.calculated_date,
            score: row.score,
            riskLevel: row.risk_level,
            breakdown: typeof row.breakdown === 'string' ? JSON.parse(row.breakdown) : row.breakdown
        }));
    } catch (error) {
        console.error('Get workload history error:', error);
        throw error;
    }
}

/**
 * Get team workload summary for a manager
 */
async function getTeamWorkloadSummary(managerId) {
    try {
        const result = await db.query(
            `SELECT 
                u.id as employee_id,
                u.name,
                u.email,
                u.department,
                COALESCE(ws.score, 0) as score,
                COALESCE(ws.risk_level, 'low') as risk_level,
                COUNT(t.id) as active_tasks
             FROM users u
             LEFT JOIN workload_scores ws ON u.id = ws.user_id 
                AND ws.calculated_date = date('now')
             LEFT JOIN tasks t ON u.id = t.employee_id 
                AND t.status IN ('pending', 'in_progress')
             WHERE u.manager_id = $1 AND u.is_active = 1
             GROUP BY u.id, u.name, u.email, u.department, ws.score, ws.risk_level
             ORDER BY ws.score DESC`,
            [managerId]
        );

        const teamMembers = result.rows.map(row => ({
            id: row.employee_id,
            name: row.name,
            email: row.email,
            department: row.department,
            workloadScore: row.score,
            riskLevel: row.risk_level,
            activeTasks: row.active_tasks
        }));

        const highRisk = teamMembers.filter(m => m.riskLevel === 'high').length;
        const mediumRisk = teamMembers.filter(m => m.riskLevel === 'medium').length;
        const lowRisk = teamMembers.filter(m => m.riskLevel === 'low').length;
        const avgScore = teamMembers.length > 0
            ? teamMembers.reduce((sum, m) => sum + (m.workloadScore || 0), 0) / teamMembers.length
            : 0;

        return {
            teamSize: teamMembers.length,
            avgScore: Math.round(avgScore),
            riskDistribution: { high: highRisk, medium: mediumRisk, low: lowRisk },
            members: teamMembers
        };
    } catch (error) {
        console.error('Get team workload summary error:', error);
        throw error;
    }
}

module.exports = {
    processEmployeeWorkload,
    processAllEmployeesWorkload,
    getWorkloadHistory,
    getTeamWorkloadSummary,
    CONFIG
};
