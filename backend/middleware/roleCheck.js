/**
 * =====================================================
 * Role-Based Access Control Middleware
 * Restricts access based on user roles
 * =====================================================
 */

/**
 * Role hierarchy for permission inheritance
 * Higher roles inherit permissions from lower roles
 */
const roleHierarchy = {
    employee: 1,
    manager: 2,
    admin: 3
};

/**
 * Check if user has required role
 * @param {...string} allowedRoles - Roles that are allowed access
 * @returns {Function} Middleware function
 */
const requireRole = (...allowedRoles) => {
    return (req, res, next) => {
        // Ensure user is authenticated
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required.'
            });
        }

        const userRole = req.user.role;

        // Check if user's role is in allowed roles
        if (allowedRoles.includes(userRole)) {
            return next();
        }

        // Access denied
        return res.status(403).json({
            success: false,
            message: `Access denied. Required role: ${allowedRoles.join(' or ')}`
        });
    };
};

/**
 * Check if user has minimum role level
 * Uses role hierarchy for inheritance
 * @param {string} minimumRole - Minimum required role
 * @returns {Function} Middleware function
 */
const requireMinimumRole = (minimumRole) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required.'
            });
        }

        const userRoleLevel = roleHierarchy[req.user.role] || 0;
        const requiredLevel = roleHierarchy[minimumRole] || 0;

        if (userRoleLevel >= requiredLevel) {
            return next();
        }

        return res.status(403).json({
            success: false,
            message: `Access denied. Minimum role required: ${minimumRole}`
        });
    };
};

/**
 * Check if user is admin
 */
const requireAdmin = requireRole('admin');

/**
 * Check if user is manager or admin
 */
const requireManager = requireRole('manager', 'admin');

/**
 * Check if user is employee, manager, or admin (any authenticated user)
 */
const requireAuthenticated = requireRole('employee', 'manager', 'admin');

/**
 * Check if user owns the resource or is a manager/admin
 * @param {Function} getOwnerId - Function to extract owner ID from request
 * @returns {Function} Middleware function
 */
const requireOwnerOrManager = (getOwnerId) => {
    return async (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required.'
            });
        }

        // Admins and managers can access any resource
        if (req.user.role === 'admin' || req.user.role === 'manager') {
            return next();
        }

        // Check if user owns the resource
        const ownerId = await getOwnerId(req);

        if (ownerId && ownerId === req.user.id) {
            return next();
        }

        return res.status(403).json({
            success: false,
            message: 'Access denied. You can only access your own resources.'
        });
    };
};

/**
 * Check if manager has access to employee's data
 * Manager can only access data of employees assigned to them
 * @param {Function} getEmployeeId - Function to extract employee ID from request
 * @returns {Function} Middleware function
 */
const requireTeamAccess = (getEmployeeId) => {
    return async (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required.'
            });
        }

        // Admins can access any employee
        if (req.user.role === 'admin') {
            return next();
        }

        const employeeId = await getEmployeeId(req);

        // If accessing own data, allow
        if (employeeId === req.user.id) {
            return next();
        }

        // Managers can only access their team members
        if (req.user.role === 'manager') {
            const db = require('../config/db');
            const result = await db.query(
                'SELECT id FROM users WHERE id = $1 AND manager_id = $2',
                [employeeId, req.user.id]
            );

            if (result.rows.length > 0) {
                return next();
            }
        }

        return res.status(403).json({
            success: false,
            message: 'Access denied. You can only access your team members\' data.'
        });
    };
};

module.exports = {
    requireRole,
    requireMinimumRole,
    requireAdmin,
    requireManager,
    requireAuthenticated,
    requireOwnerOrManager,
    requireTeamAccess,
    roleHierarchy
};
