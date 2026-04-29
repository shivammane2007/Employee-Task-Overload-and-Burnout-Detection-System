/**
 * =====================================================
 * Reports Routes - SQLite Compatible
 * Endpoints for generating reports and analytics
 * =====================================================
 */

const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { authenticate } = require('../middleware/auth');
const { requireManager, requireAdmin } = require('../middleware/roleCheck');

/**
 * @route   GET /api/reports/workload
 * @desc    Get workload report data for charts
 * @access  Manager/Admin
 */
router.get('/workload', authenticate, requireManager, async (req, res) => {
    try {
        const days = parseInt(req.query.days) || 30;

        // Get daily averages
        const dailyResult = await db.query(
            `SELECT 
                ws.calculated_date,
                AVG(ws.score) as avg_score,
                SUM(CASE WHEN ws.risk_level = 'high' THEN 1 ELSE 0 END) as high_risk_count,
                SUM(CASE WHEN ws.risk_level = 'medium' THEN 1 ELSE 0 END) as medium_risk_count,
                SUM(CASE WHEN ws.risk_level = 'low' THEN 1 ELSE 0 END) as low_risk_count
             FROM workload_scores ws
             JOIN users u ON ws.user_id = u.id
             WHERE ws.calculated_date >= date('now', '-' || $1 || ' days')
             AND u.role = 'employee' AND u.is_active = 1
             GROUP BY ws.calculated_date
             ORDER BY ws.calculated_date ASC`,
            [days]
        );

        // Get current distribution
        const currentResult = await db.query(
            `SELECT 
                ws.risk_level,
                COUNT(*) as count,
                AVG(ws.score) as avg_score
             FROM workload_scores ws
             JOIN users u ON ws.user_id = u.id
             WHERE ws.calculated_date = date('now')
             AND u.role = 'employee' AND u.is_active = 1
             GROUP BY ws.risk_level`
        );

        res.json({
            success: true,
            data: {
                dailyTrend: dailyResult.rows.map(row => ({
                    date: row.calculated_date,
                    avgScore: parseFloat(row.avg_score) || 0,
                    highRisk: parseInt(row.high_risk_count) || 0,
                    mediumRisk: parseInt(row.medium_risk_count) || 0,
                    lowRisk: parseInt(row.low_risk_count) || 0
                })),
                currentDistribution: currentResult.rows.reduce((acc, row) => {
                    acc[row.risk_level] = {
                        count: parseInt(row.count),
                        avgScore: parseFloat(row.avg_score)
                    };
                    return acc;
                }, { high: { count: 0, avgScore: 0 }, medium: { count: 0, avgScore: 0 }, low: { count: 0, avgScore: 0 } })
            }
        });

    } catch (error) {
        console.error('Get workload report error:', error);
        res.status(500).json({
            success: false,
            message: 'Error generating workload report'
        });
    }
});

/**
 * @route   GET /api/reports/burnout
 * @desc    Get burnout statistics report
 * @access  Manager/Admin
 */
router.get('/burnout', authenticate, requireManager, async (req, res) => {
    try {
        // Get burnout trends over past 30 days
        const trendResult = await db.query(
            `SELECT 
                ws.calculated_date,
                SUM(CASE WHEN ws.risk_level = 'high' THEN 1 ELSE 0 END) as high_risk,
                COUNT(*) as total,
                ROUND(
                    CAST(SUM(CASE WHEN ws.risk_level = 'high' THEN 1 ELSE 0 END) AS FLOAT) / 
                    MAX(COUNT(*), 1) * 100, 2
                ) as high_risk_percentage
             FROM workload_scores ws
             JOIN users u ON ws.user_id = u.id
             WHERE u.role = 'employee' AND u.is_active = 1
             AND ws.calculated_date >= date('now', '-30 days')
             GROUP BY ws.calculated_date
             ORDER BY ws.calculated_date ASC`
        );

        // Get employees with high risk
        const atRiskResult = await db.query(
            `SELECT 
                u.id as employee_id,
                u.name,
                u.email,
                u.department,
                ws.score as current_score,
                ws.risk_level
             FROM users u
             JOIN workload_scores ws ON u.id = ws.user_id
             WHERE u.role = 'employee' AND u.is_active = 1
             AND ws.calculated_date = date('now')
             AND ws.risk_level = 'high'
             ORDER BY ws.score DESC`
        );

        res.json({
            success: true,
            data: {
                trend: trendResult.rows.map(row => ({
                    date: row.calculated_date,
                    highRisk: parseInt(row.high_risk) || 0,
                    total: parseInt(row.total) || 0,
                    percentage: parseFloat(row.high_risk_percentage) || 0
                })),
                atRiskEmployees: atRiskResult.rows.map(row => ({
                    employeeId: row.employee_id,
                    name: row.name,
                    email: row.email,
                    department: row.department,
                    currentScore: parseFloat(row.current_score) || 0
                }))
            }
        });

    } catch (error) {
        console.error('Get burnout report error:', error);
        res.status(500).json({
            success: false,
            message: 'Error generating burnout report'
        });
    }
});

/**
 * @route   GET /api/reports/tasks
 * @desc    Get task completion metrics
 * @access  Manager/Admin
 */
router.get('/tasks', authenticate, requireManager, async (req, res) => {
    try {
        const period = req.query.period || 'month';
        let days = 30;
        if (period === 'week') days = 7;
        if (period === 'quarter') days = 90;

        // Get task completion statistics
        const statsResult = await db.query(
            `SELECT 
                COUNT(*) as total_tasks,
                SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
                SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) as in_progress,
                SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
                SUM(CASE WHEN deadline < datetime('now') AND status != 'completed' THEN 1 ELSE 0 END) as overdue,
                ROUND(
                    CAST(SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) AS FLOAT) / 
                    MAX(COUNT(*), 1) * 100, 2
                ) as completion_rate,
                AVG(estimated_hours) as avg_estimated_hours,
                AVG(CASE WHEN status = 'completed' THEN actual_hours END) as avg_actual_hours
             FROM tasks
             WHERE created_at >= date('now', '-' || $1 || ' days')`,
            [days]
        );

        // Get priority breakdown
        const priorityResult = await db.query(
            `SELECT 
                priority,
                COUNT(*) as total,
                SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed
             FROM tasks
             WHERE created_at >= date('now', '-' || $1 || ' days')
             GROUP BY priority`,
            [days]
        );

        res.json({
            success: true,
            data: {
                summary: {
                    total: parseInt(statsResult.rows[0]?.total_tasks) || 0,
                    completed: parseInt(statsResult.rows[0]?.completed) || 0,
                    inProgress: parseInt(statsResult.rows[0]?.in_progress) || 0,
                    pending: parseInt(statsResult.rows[0]?.pending) || 0,
                    overdue: parseInt(statsResult.rows[0]?.overdue) || 0,
                    completionRate: parseFloat(statsResult.rows[0]?.completion_rate) || 0,
                    avgEstimatedHours: parseFloat(statsResult.rows[0]?.avg_estimated_hours) || 0,
                    avgActualHours: parseFloat(statsResult.rows[0]?.avg_actual_hours) || 0
                },
                byPriority: priorityResult.rows.map(row => ({
                    priority: row.priority,
                    total: parseInt(row.total) || 0,
                    completed: parseInt(row.completed) || 0,
                    completionRate: row.total > 0 ? Math.round(row.completed / row.total * 100) : 0
                }))
            }
        });

    } catch (error) {
        console.error('Get task report error:', error);
        res.status(500).json({
            success: false,
            message: 'Error generating task report'
        });
    }
});

/**
 * @route   GET /api/reports/team
 * @desc    Get team performance report
 * @access  Manager/Admin
 */
router.get('/team', authenticate, requireManager, async (req, res) => {
    try {
        // Get team member performance
        const teamResult = await db.query(
            `SELECT 
                u.id,
                u.name,
                u.email,
                u.department,
                COUNT(t.id) as total_tasks,
                SUM(CASE WHEN t.status = 'completed' THEN 1 ELSE 0 END) as completed_tasks,
                SUM(CASE WHEN t.deadline < datetime('now') AND t.status != 'completed' THEN 1 ELSE 0 END) as overdue_tasks,
                COALESCE(ws.score, 0) as current_workload,
                COALESCE(ws.risk_level, 'low') as risk_level
             FROM users u
             LEFT JOIN tasks t ON u.id = t.employee_id AND t.created_at >= date('now', '-30 days')
             LEFT JOIN workload_scores ws ON u.id = ws.user_id AND ws.calculated_date = date('now')
             WHERE u.role = 'employee' AND u.is_active = 1
             GROUP BY u.id, u.name, u.email, u.department, ws.score, ws.risk_level
             ORDER BY ws.score DESC`
        );

        // Get department summary
        const deptResult = await db.query(
            `SELECT 
                u.department,
                COUNT(DISTINCT u.id) as employee_count,
                AVG(ws.score) as avg_workload,
                SUM(CASE WHEN ws.risk_level = 'high' THEN 1 ELSE 0 END) as high_risk_count
             FROM users u
             LEFT JOIN workload_scores ws ON u.id = ws.user_id AND ws.calculated_date = date('now')
             WHERE u.role = 'employee' AND u.is_active = 1
             GROUP BY u.department`
        );

        res.json({
            success: true,
            data: {
                teamMembers: teamResult.rows.map(row => ({
                    id: row.id,
                    name: row.name,
                    email: row.email,
                    department: row.department,
                    totalTasks: parseInt(row.total_tasks) || 0,
                    completedTasks: parseInt(row.completed_tasks) || 0,
                    overdueTasks: parseInt(row.overdue_tasks) || 0,
                    currentWorkload: parseFloat(row.current_workload) || 0,
                    riskLevel: row.risk_level
                })),
                departmentSummary: deptResult.rows.map(row => ({
                    department: row.department || 'Unassigned',
                    employeeCount: parseInt(row.employee_count) || 0,
                    avgWorkload: parseFloat(row.avg_workload) || 0,
                    highRiskCount: parseInt(row.high_risk_count) || 0
                }))
            }
        });

    } catch (error) {
        console.error('Get team report error:', error);
        res.status(500).json({
            success: false,
            message: 'Error generating team report'
        });
    }
});

/**
 * @route   GET /api/reports/dashboard
 * @desc    Get dashboard summary data
 * @access  Private (role-based data)
 */
router.get('/dashboard', authenticate, async (req, res) => {
    try {
        const userId = req.user.id;
        const userRole = req.user.role;

        let dashboardData = {};

        if (userRole === 'employee') {
            // Employee dashboard
            const tasksResult = await db.query(
                `SELECT 
                    COUNT(*) as total,
                    SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
                    SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) as in_progress,
                    SUM(CASE WHEN deadline < datetime('now') AND status != 'completed' THEN 1 ELSE 0 END) as overdue,
                    SUM(CASE WHEN deadline BETWEEN datetime('now') AND datetime('now', '+3 days') AND status != 'completed' THEN 1 ELSE 0 END) as due_soon
                 FROM tasks WHERE employee_id = $1`,
                [userId]
            );

            const workloadResult = await db.query(
                `SELECT score, risk_level FROM workload_scores 
                 WHERE user_id = $1 ORDER BY calculated_date DESC LIMIT 1`,
                [userId]
            );

            dashboardData = {
                tasks: {
                    total: parseInt(tasksResult.rows[0]?.total) || 0,
                    completed: parseInt(tasksResult.rows[0]?.completed) || 0,
                    in_progress: parseInt(tasksResult.rows[0]?.in_progress) || 0,
                    overdue: parseInt(tasksResult.rows[0]?.overdue) || 0,
                    due_soon: parseInt(tasksResult.rows[0]?.due_soon) || 0
                },
                workload: workloadResult.rows[0] || { score: 0, risk_level: 'low' }
            };

        } else if (userRole === 'manager') {
            // Manager dashboard
            const teamResult = await db.query(
                `SELECT 
                    COUNT(DISTINCT u.id) as team_size,
                    SUM(CASE WHEN ws.risk_level = 'high' THEN 1 ELSE 0 END) as high_risk,
                    SUM(CASE WHEN ws.risk_level = 'medium' THEN 1 ELSE 0 END) as medium_risk,
                    AVG(ws.score) as avg_workload
                 FROM users u
                 LEFT JOIN workload_scores ws ON u.id = ws.user_id AND ws.calculated_date = date('now')
                 WHERE u.manager_id = $1 AND u.is_active = 1`,
                [userId]
            );

            const tasksResult = await db.query(
                `SELECT 
                    COUNT(*) as total,
                    SUM(CASE WHEN t.deadline < datetime('now') AND t.status != 'completed' THEN 1 ELSE 0 END) as overdue
                 FROM tasks t
                 JOIN users u ON t.employee_id = u.id
                 WHERE u.manager_id = $1`,
                [userId]
            );

            dashboardData = {
                team: {
                    team_size: parseInt(teamResult.rows[0]?.team_size) || 0,
                    high_risk: parseInt(teamResult.rows[0]?.high_risk) || 0,
                    medium_risk: parseInt(teamResult.rows[0]?.medium_risk) || 0,
                    avg_workload: parseFloat(teamResult.rows[0]?.avg_workload) || 0
                },
                tasks: {
                    total: parseInt(tasksResult.rows[0]?.total) || 0,
                    overdue: parseInt(tasksResult.rows[0]?.overdue) || 0
                }
            };

        } else if (userRole === 'admin') {
            // Admin dashboard
            const usersResult = await db.query(
                `SELECT 
                    COUNT(*) as total,
                    SUM(CASE WHEN role = 'employee' THEN 1 ELSE 0 END) as employees,
                    SUM(CASE WHEN role = 'manager' THEN 1 ELSE 0 END) as managers,
                    SUM(CASE WHEN is_active = 0 THEN 1 ELSE 0 END) as inactive
                 FROM users WHERE role != 'admin'`
            );

            const workloadResult = await db.query(
                `SELECT 
                    SUM(CASE WHEN risk_level = 'high' THEN 1 ELSE 0 END) as high_risk,
                    SUM(CASE WHEN risk_level = 'medium' THEN 1 ELSE 0 END) as medium_risk,
                    SUM(CASE WHEN risk_level = 'low' THEN 1 ELSE 0 END) as low_risk,
                    AVG(score) as avg_score
                 FROM workload_scores WHERE calculated_date = date('now')`
            );

            dashboardData = {
                users: {
                    total: parseInt(usersResult.rows[0]?.total) || 0,
                    employees: parseInt(usersResult.rows[0]?.employees) || 0,
                    managers: parseInt(usersResult.rows[0]?.managers) || 0,
                    inactive: parseInt(usersResult.rows[0]?.inactive) || 0
                },
                workload: {
                    high_risk: parseInt(workloadResult.rows[0]?.high_risk) || 0,
                    medium_risk: parseInt(workloadResult.rows[0]?.medium_risk) || 0,
                    low_risk: parseInt(workloadResult.rows[0]?.low_risk) || 0,
                    avg_score: parseFloat(workloadResult.rows[0]?.avg_score) || 0
                }
            };
        }

        res.json({
            success: true,
            data: dashboardData
        });

    } catch (error) {
        console.error('Get dashboard error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching dashboard data'
        });
    }
});

module.exports = router;
