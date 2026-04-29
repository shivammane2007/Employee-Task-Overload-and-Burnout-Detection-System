/**
 * =====================================================
 * Workload Analysis Routes
 * Endpoints for workload scoring and analysis
 * =====================================================
 */

const express = require('express');
const router = express.Router();
const { param, query, validationResult } = require('express-validator');
const db = require('../config/db');
const { authenticate } = require('../middleware/auth');
const { requireManager, requireAdmin } = require('../middleware/roleCheck');
const workloadEngine = require('../services/workloadEngine');
const burnoutDetector = require('../services/burnoutDetector');
const alertService = require('../services/alertService');

/**
 * @route   GET /api/workload/score
 * @desc    Get current user's workload score
 * @access  Private
 */
router.get('/score', authenticate, async (req, res) => {
    try {
        // Calculate fresh workload score
        const workload = await workloadEngine.processEmployeeWorkload(req.user.id);

        res.json({
            success: true,
            data: workload
        });

    } catch (error) {
        console.error('Get workload score error:', error);
        res.status(500).json({
            success: false,
            message: 'Error calculating workload score'
        });
    }
});

/**
 * @route   GET /api/workload/score/:userId
 * @desc    Get specific user's workload score
 * @access  Manager/Admin
 */
router.get('/score/:userId', authenticate, requireManager, [
    param('userId').isInt().withMessage('User ID must be an integer')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                errors: errors.array()
            });
        }

        const userId = parseInt(req.params.userId);

        // Managers can only view their team members
        if (req.user.role === 'manager') {
            const teamCheck = await db.query(
                'SELECT id FROM users WHERE id = $1 AND manager_id = $2',
                [userId, req.user.id]
            );
            if (teamCheck.rows.length === 0) {
                return res.status(403).json({
                    success: false,
                    message: 'Access denied. Not your team member.'
                });
            }
        }

        const workload = await workloadEngine.processEmployeeWorkload(userId);

        // Get employee info
        const userResult = await db.query(
            'SELECT id, name, email, department FROM users WHERE id = $1',
            [userId]
        );

        res.json({
            success: true,
            data: {
                employee: userResult.rows[0],
                workload
            }
        });

    } catch (error) {
        console.error('Get user workload error:', error);
        res.status(500).json({
            success: false,
            message: 'Error calculating workload score'
        });
    }
});

/**
 * @route   GET /api/workload/team
 * @desc    Get team workload summary (for managers)
 * @access  Manager/Admin
 */
router.get('/team', authenticate, requireManager, async (req, res) => {
    try {
        let managerId = req.user.id;

        // Admins can view any manager's team
        if (req.query.managerId && req.user.role === 'admin') {
            managerId = parseInt(req.query.managerId);
        }

        const summary = await workloadEngine.getTeamWorkloadSummary(managerId);

        res.json({
            success: true,
            data: summary
        });

    } catch (error) {
        console.error('Get team workload error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching team workload'
        });
    }
});

/**
 * @route   GET /api/workload/history
 * @desc    Get workload history for current user
 * @access  Private
 */
router.get('/history', authenticate, [
    query('days').optional().isInt({ min: 1, max: 90 }).withMessage('Days must be between 1 and 90'),
    query('userId').optional().isInt()
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                errors: errors.array()
            });
        }

        const days = parseInt(req.query.days) || 30;
        let userId = req.user.id;

        // Managers/Admins can view others' history
        if (req.query.userId && req.user.role !== 'employee') {
            userId = parseInt(req.query.userId);

            // Verify access for managers
            if (req.user.role === 'manager') {
                const teamCheck = await db.query(
                    'SELECT id FROM users WHERE id = $1 AND manager_id = $2',
                    [userId, req.user.id]
                );
                if (teamCheck.rows.length === 0 && userId !== req.user.id) {
                    return res.status(403).json({
                        success: false,
                        message: 'Access denied'
                    });
                }
            }
        }

        const history = await workloadEngine.getWorkloadHistory(userId, days);

        res.json({
            success: true,
            data: history
        });

    } catch (error) {
        console.error('Get workload history error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching workload history'
        });
    }
});

/**
 * @route   POST /api/workload/calculate
 * @desc    Trigger workload calculation (manual refresh)
 * @access  Private
 */
router.post('/calculate', authenticate, async (req, res) => {
    try {
        const workload = await workloadEngine.processEmployeeWorkload(req.user.id);

        // Also assess burnout risk
        const burnoutAssessment = await burnoutDetector.assessBurnoutRisk(req.user.id, workload);

        res.json({
            success: true,
            message: 'Workload calculated successfully',
            data: {
                workload,
                burnoutAssessment
            }
        });

    } catch (error) {
        console.error('Calculate workload error:', error);
        res.status(500).json({
            success: false,
            message: 'Error calculating workload'
        });
    }
});

/**
 * @route   POST /api/workload/calculate-all
 * @desc    Calculate workload for all employees (Admin/scheduled job)
 * @access  Admin
 */
router.post('/calculate-all', authenticate, requireAdmin, async (req, res) => {
    try {
        const results = await workloadEngine.processAllEmployeesWorkload();

        // Generate alerts for high-risk employees
        let alertsGenerated = 0;
        for (const result of results) {
            if (result.riskLevel === 'high' || result.riskLevel === 'medium') {
                // Get employee details
                const empResult = await db.query(
                    'SELECT id, name, email, manager_id FROM users WHERE id = $1',
                    [result.employeeId]
                );
                if (empResult.rows.length > 0) {
                    await alertService.createHighWorkloadAlert(empResult.rows[0], result);
                    alertsGenerated++;
                }
            }
        }

        res.json({
            success: true,
            message: 'Workload calculated for all employees',
            data: {
                processed: results.length,
                highRisk: results.filter(r => r.riskLevel === 'high').length,
                mediumRisk: results.filter(r => r.riskLevel === 'medium').length,
                lowRisk: results.filter(r => r.riskLevel === 'low').length,
                alertsGenerated,
                errors: results.filter(r => r.error).length
            }
        });

    } catch (error) {
        console.error('Calculate all workloads error:', error);
        res.status(500).json({
            success: false,
            message: 'Error calculating workloads'
        });
    }
});

/**
 * @route   GET /api/workload/burnout
 * @desc    Get burnout risk assessment for current user
 * @access  Private
 */
router.get('/burnout', authenticate, async (req, res) => {
    try {
        const assessment = await burnoutDetector.assessBurnoutRisk(req.user.id);

        res.json({
            success: true,
            data: assessment
        });

    } catch (error) {
        console.error('Get burnout assessment error:', error);
        res.status(500).json({
            success: false,
            message: 'Error assessing burnout risk'
        });
    }
});

/**
 * @route   GET /api/workload/burnout/:userId
 * @desc    Get burnout risk assessment for specific user
 * @access  Manager/Admin
 */
router.get('/burnout/:userId', authenticate, requireManager, [
    param('userId').isInt()
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                errors: errors.array()
            });
        }

        const userId = parseInt(req.params.userId);

        // Verify access for managers
        if (req.user.role === 'manager') {
            const teamCheck = await db.query(
                'SELECT id FROM users WHERE id = $1 AND manager_id = $2',
                [userId, req.user.id]
            );
            if (teamCheck.rows.length === 0) {
                return res.status(403).json({
                    success: false,
                    message: 'Access denied'
                });
            }
        }

        const assessment = await burnoutDetector.assessBurnoutRisk(userId);

        // Get employee info
        const userResult = await db.query(
            'SELECT id, name, email, department FROM users WHERE id = $1',
            [userId]
        );

        res.json({
            success: true,
            data: {
                employee: userResult.rows[0],
                assessment
            }
        });

    } catch (error) {
        console.error('Get user burnout assessment error:', error);
        res.status(500).json({
            success: false,
            message: 'Error assessing burnout risk'
        });
    }
});

/**
 * @route   GET /api/workload/organization
 * @desc    Get organization-wide burnout statistics
 * @access  Admin
 */
router.get('/organization', authenticate, requireAdmin, async (req, res) => {
    try {
        const stats = await burnoutDetector.getOrganizationBurnoutStats();

        // Get department breakdown
        const deptResult = await db.query(
            `SELECT 
                u.department,
                COUNT(DISTINCT u.id) as employee_count,
                AVG(ws.score) as avg_score,
                SUM(CASE WHEN ws.risk_level = 'high' THEN 1 ELSE 0 END) as high_risk,
                SUM(CASE WHEN ws.risk_level = 'medium' THEN 1 ELSE 0 END) as medium_risk
             FROM users u
             LEFT JOIN workload_scores ws ON u.id = ws.user_id 
                AND ws.calculated_date = date('now')
             WHERE u.role = 'employee' AND u.is_active = 1
             GROUP BY u.department
             ORDER BY high_risk DESC, avg_score DESC`
        );

        res.json({
            success: true,
            data: {
                ...stats,
                departmentBreakdown: deptResult.rows
            }
        });

    } catch (error) {
        console.error('Get organization stats error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching organization statistics'
        });
    }
});

module.exports = router;
