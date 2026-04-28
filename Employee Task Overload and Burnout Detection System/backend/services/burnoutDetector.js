/**
 * =====================================================
 * Burnout Detector - SQLite Compatible
 * Analyzes workload patterns to detect burnout risk
 * =====================================================
 */

const db = require('../config/db');

/**
 * Get burnout risk factors
 */
async function getBurnoutFactors(employeeId) {
    try {
        // Get workload trend (last 7 days)
        const trendResult = await db.query(
            `SELECT score, risk_level, calculated_date
             FROM workload_scores
             WHERE user_id = $1
             AND calculated_date >= date('now', '-7 days')
             ORDER BY calculated_date DESC`,
            [employeeId]
        );

        // Get task overdue count
        const overdueResult = await db.query(
            `SELECT COUNT(*) as overdue_count
             FROM tasks
             WHERE employee_id = $1
             AND status != 'completed'
             AND deadline < datetime('now')`,
            [employeeId]
        );

        // Get upcoming deadline pressure
        const upcomingResult = await db.query(
            `SELECT COUNT(*) as due_soon_count
             FROM tasks
             WHERE employee_id = $1
             AND status != 'completed'
             AND deadline BETWEEN datetime('now') AND datetime('now', '+3 days')`,
            [employeeId]
        );

        return {
            recentScores: trendResult.rows,
            overdueCount: parseInt(overdueResult.rows[0]?.overdue_count) || 0,
            dueSoonCount: parseInt(upcomingResult.rows[0]?.due_soon_count) || 0
        };
    } catch (error) {
        console.error('Get burnout factors error:', error);
        throw error;
    }
}

/**
 * Assess burnout risk for an employee
 */
async function assessBurnoutRisk(employeeId, currentWorkload = null) {
    try {
        const factors = await getBurnoutFactors(employeeId);

        // Calculate burnout risk indicators
        const recentScores = factors.recentScores;
        const avgScore = recentScores.length > 0
            ? recentScores.reduce((sum, r) => sum + r.score, 0) / recentScores.length
            : 0;

        const highRiskDays = recentScores.filter(r => r.risk_level === 'high').length;
        const trendDirection = recentScores.length >= 2
            ? (recentScores[0]?.score || 0) - (recentScores[recentScores.length - 1]?.score || 0)
            : 0;

        // Calculate overall burnout risk
        let riskScore = 0;
        let riskFactors = [];

        // High workload average
        if (avgScore >= 70) {
            riskScore += 30;
            riskFactors.push('Consistently high workload');
        } else if (avgScore >= 50) {
            riskScore += 15;
            riskFactors.push('Elevated workload');
        }

        // Consecutive high-risk days
        if (highRiskDays >= 5) {
            riskScore += 25;
            riskFactors.push('5+ consecutive high-risk days');
        } else if (highRiskDays >= 3) {
            riskScore += 15;
            riskFactors.push('3+ consecutive high-risk days');
        }

        // Overdue tasks
        if (factors.overdueCount >= 3) {
            riskScore += 20;
            riskFactors.push('Multiple overdue tasks');
        } else if (factors.overdueCount >= 1) {
            riskScore += 10;
            riskFactors.push('Has overdue tasks');
        }

        // Upcoming deadline pressure
        if (factors.dueSoonCount >= 5) {
            riskScore += 15;
            riskFactors.push('Heavy upcoming deadlines');
        } else if (factors.dueSoonCount >= 3) {
            riskScore += 10;
            riskFactors.push('Multiple upcoming deadlines');
        }

        // Worsening trend
        if (trendDirection > 20) {
            riskScore += 10;
            riskFactors.push('Worsening workload trend');
        }

        // Determine risk level
        let riskLevel = 'low';
        if (riskScore >= 60) riskLevel = 'high';
        else if (riskScore >= 30) riskLevel = 'medium';

        // Generate recommendations
        const recommendations = generateRecommendations(riskLevel, riskFactors, factors);

        return {
            riskScore,
            riskLevel,
            riskFactors,
            recommendations,
            metrics: {
                avgWorkload: Math.round(avgScore),
                highRiskDays,
                overdueCount: factors.overdueCount,
                dueSoonCount: factors.dueSoonCount,
                trend: trendDirection > 0 ? 'worsening' : trendDirection < 0 ? 'improving' : 'stable'
            }
        };
    } catch (error) {
        console.error('Assess burnout risk error:', error);
        throw error;
    }
}

/**
 * Generate recommendations based on risk factors
 */
function generateRecommendations(riskLevel, riskFactors, factors) {
    const recommendations = [];

    if (riskLevel === 'high') {
        recommendations.push({
            priority: 'high',
            title: 'Immediate Workload Review Required',
            description: 'Consider redistributing tasks or extending deadlines to reduce immediate pressure.'
        });
    }

    if (factors.overdueCount > 0) {
        recommendations.push({
            priority: 'high',
            title: 'Address Overdue Tasks',
            description: 'Review and prioritize overdue tasks. Consider marking as blocked if dependencies exist.'
        });
    }

    if (factors.dueSoonCount >= 3) {
        recommendations.push({
            priority: 'medium',
            title: 'Manage Upcoming Deadlines',
            description: 'Focus on highest priority items first. Consider negotiating deadline extensions if needed.'
        });
    }

    if (riskLevel !== 'low') {
        recommendations.push({
            priority: 'medium',
            title: 'Take Regular Breaks',
            description: 'Schedule short breaks throughout the day to maintain productivity and mental health.'
        });
    }

    return recommendations;
}

/**
 * Get organization-wide burnout statistics
 */
async function getOrganizationBurnoutStats() {
    try {
        const result = await db.query(
            `SELECT 
                COUNT(*) as total_employees,
                SUM(CASE WHEN ws.risk_level = 'high' THEN 1 ELSE 0 END) as high_risk,
                SUM(CASE WHEN ws.risk_level = 'medium' THEN 1 ELSE 0 END) as medium_risk,
                SUM(CASE WHEN ws.risk_level = 'low' THEN 1 ELSE 0 END) as low_risk,
                AVG(ws.score) as avg_score
             FROM users u
             LEFT JOIN workload_scores ws ON u.id = ws.user_id 
                AND ws.calculated_date = date('now')
             WHERE u.role = 'employee' AND u.is_active = 1`
        );

        const stats = result.rows[0] || {};

        return {
            totalEmployees: parseInt(stats.total_employees) || 0,
            riskDistribution: {
                high: parseInt(stats.high_risk) || 0,
                medium: parseInt(stats.medium_risk) || 0,
                low: parseInt(stats.low_risk) || 0
            },
            avgScore: Math.round(parseFloat(stats.avg_score) || 0)
        };
    } catch (error) {
        console.error('Get organization burnout stats error:', error);
        throw error;
    }
}

module.exports = {
    assessBurnoutRisk,
    getBurnoutFactors,
    getOrganizationBurnoutStats,
    generateRecommendations
};
