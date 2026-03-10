-- =====================================================
-- Employee Task Overload and Burnout Detection System
-- Database Schema for PostgreSQL
-- =====================================================

-- Drop tables if they exist (for clean setup)
DROP TABLE IF EXISTS alerts CASCADE;
DROP TABLE IF EXISTS workload_scores CASCADE;
DROP TABLE IF EXISTS tasks CASCADE;
DROP TABLE IF EXISTS configurations CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- =====================================================
-- USERS TABLE
-- Stores all system users with role-based access
-- =====================================================
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'employee',
    manager_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    department VARCHAR(100),
    avatar_url VARCHAR(500),
    is_active BOOLEAN DEFAULT TRUE,
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT valid_role CHECK (role IN ('employee', 'manager', 'admin'))
);

-- Index for faster email lookups during authentication
CREATE INDEX idx_users_email ON users(email);
-- Index for manager-employee relationship queries
CREATE INDEX idx_users_manager ON users(manager_id);
-- Index for role-based queries
CREATE INDEX idx_users_role ON users(role);

-- =====================================================
-- TASKS TABLE
-- Stores all employee tasks with priority and status
-- =====================================================
CREATE TABLE tasks (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    priority VARCHAR(10) NOT NULL DEFAULT 'medium',
    deadline TIMESTAMP NOT NULL,
    estimated_hours DECIMAL(5,2) NOT NULL,
    actual_hours DECIMAL(5,2) DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    progress INTEGER DEFAULT 0,
    tags VARCHAR(255)[],
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    CONSTRAINT valid_priority CHECK (priority IN ('low', 'medium', 'high')),
    CONSTRAINT valid_status CHECK (status IN ('pending', 'in_progress', 'completed', 'overdue')),
    CONSTRAINT valid_progress CHECK (progress >= 0 AND progress <= 100)
);

-- Index for employee task queries
CREATE INDEX idx_tasks_employee ON tasks(employee_id);
-- Index for status filtering
CREATE INDEX idx_tasks_status ON tasks(status);
-- Index for deadline queries
CREATE INDEX idx_tasks_deadline ON tasks(deadline);
-- Index for priority filtering
CREATE INDEX idx_tasks_priority ON tasks(priority);
-- Composite index for common dashboard queries
CREATE INDEX idx_tasks_employee_status ON tasks(employee_id, status);

-- =====================================================
-- WORKLOAD SCORES TABLE
-- Stores daily workload calculations per employee
-- =====================================================
CREATE TABLE workload_scores (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    score DECIMAL(5,2) NOT NULL,
    risk_level VARCHAR(10) NOT NULL,
    task_count INTEGER NOT NULL DEFAULT 0,
    high_priority_count INTEGER NOT NULL DEFAULT 0,
    medium_priority_count INTEGER NOT NULL DEFAULT 0,
    low_priority_count INTEGER NOT NULL DEFAULT 0,
    overdue_count INTEGER NOT NULL DEFAULT 0,
    total_estimated_hours DECIMAL(6,2) DEFAULT 0,
    deadline_pressure_score DECIMAL(5,2) DEFAULT 0,
    calculated_date DATE NOT NULL,
    calculation_details JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT valid_risk_level CHECK (risk_level IN ('low', 'medium', 'high')),
    CONSTRAINT valid_score CHECK (score >= 0 AND score <= 100),
    UNIQUE(employee_id, calculated_date)
);

-- Index for employee workload history
CREATE INDEX idx_workload_employee ON workload_scores(employee_id);
-- Index for date-based queries
CREATE INDEX idx_workload_date ON workload_scores(calculated_date);
-- Index for risk level filtering
CREATE INDEX idx_workload_risk ON workload_scores(risk_level);
-- Composite index for trend analysis
CREATE INDEX idx_workload_employee_date ON workload_scores(employee_id, calculated_date DESC);

-- =====================================================
-- ALERTS TABLE
-- Stores all system alerts and notifications
-- =====================================================
CREATE TABLE alerts (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    manager_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    alert_type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    severity VARCHAR(10) NOT NULL DEFAULT 'medium',
    is_read BOOLEAN DEFAULT FALSE,
    is_dismissed BOOLEAN DEFAULT FALSE,
    action_url VARCHAR(500),
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    read_at TIMESTAMP,
    CONSTRAINT valid_severity CHECK (severity IN ('low', 'medium', 'high')),
    CONSTRAINT valid_alert_type CHECK (alert_type IN (
        'workload_high',
        'burnout_risk',
        'deadline_approaching',
        'task_overdue',
        'consecutive_overload',
        'weekly_report',
        'system'
    ))
);

-- Index for user alerts
CREATE INDEX idx_alerts_employee ON alerts(employee_id);
-- Index for manager alerts
CREATE INDEX idx_alerts_manager ON alerts(manager_id);
-- Index for unread alerts
CREATE INDEX idx_alerts_unread ON alerts(is_read) WHERE is_read = FALSE;
-- Index for alert type filtering
CREATE INDEX idx_alerts_type ON alerts(alert_type);
-- Index for recent alerts
CREATE INDEX idx_alerts_created ON alerts(created_at DESC);

-- =====================================================
-- CONFIGURATIONS TABLE
-- Stores system-wide configuration settings
-- =====================================================
CREATE TABLE configurations (
    id SERIAL PRIMARY KEY,
    key VARCHAR(100) UNIQUE NOT NULL,
    value TEXT NOT NULL,
    value_type VARCHAR(20) NOT NULL DEFAULT 'string',
    category VARCHAR(50) NOT NULL DEFAULT 'general',
    description TEXT,
    is_editable BOOLEAN DEFAULT TRUE,
    updated_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT valid_value_type CHECK (value_type IN ('string', 'number', 'boolean', 'json'))
);

-- Index for key lookups
CREATE INDEX idx_config_key ON configurations(key);
-- Index for category filtering
CREATE INDEX idx_config_category ON configurations(category);

-- =====================================================
-- FUNCTIONS AND TRIGGERS
-- =====================================================

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for users table
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger for tasks table
CREATE TRIGGER update_tasks_updated_at
    BEFORE UPDATE ON tasks
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger for configurations table
CREATE TRIGGER update_configurations_updated_at
    BEFORE UPDATE ON configurations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Function to auto-update task status to overdue
CREATE OR REPLACE FUNCTION check_overdue_tasks()
RETURNS void AS $$
BEGIN
    UPDATE tasks
    SET status = 'overdue'
    WHERE deadline < CURRENT_TIMESTAMP
    AND status NOT IN ('completed', 'overdue');
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- SEED DATA - Default Configurations
-- =====================================================
INSERT INTO configurations (key, value, value_type, category, description) VALUES
    ('workload_high_threshold', '70', 'number', 'workload', 'Score threshold for high workload warning'),
    ('workload_medium_threshold', '50', 'number', 'workload', 'Score threshold for medium workload warning'),
    ('burnout_consecutive_days', '5', 'number', 'burnout', 'Consecutive high-workload days to trigger burnout alert'),
    ('max_weekly_hours', '50', 'number', 'workload', 'Maximum recommended weekly hours'),
    ('deadline_warning_days', '3', 'number', 'alerts', 'Days before deadline to send warning'),
    ('auto_calculate_workload', 'true', 'boolean', 'system', 'Automatically calculate workload scores daily'),
    ('email_notifications', 'true', 'boolean', 'notifications', 'Enable email notifications'),
    ('dashboard_refresh_interval', '300', 'number', 'system', 'Dashboard auto-refresh interval in seconds'),
    ('task_priority_weight_high', '3', 'number', 'algorithm', 'Weight multiplier for high priority tasks'),
    ('task_priority_weight_medium', '2', 'number', 'algorithm', 'Weight multiplier for medium priority tasks'),
    ('task_priority_weight_low', '1', 'number', 'algorithm', 'Weight multiplier for low priority tasks');

-- =====================================================
-- SEED DATA - Demo Users (passwords are hashed 'password123')
-- In production, use proper password hashing
-- =====================================================
-- Note: The password hash below is for 'password123' using bcrypt
-- $2b$10$rQZ5v5F5v5F5v5F5v5F5v.5F5v5F5v5F5v5F5v5F5v5F5v5F5v5F

-- Admin user
INSERT INTO users (name, email, password, role, department) VALUES
    ('System Admin', 'admin@company.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin', 'Administration');

-- Manager users
INSERT INTO users (name, email, password, role, department) VALUES
    ('John Manager', 'manager@company.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'manager', 'Engineering'),
    ('Sarah Lead', 'sarah.lead@company.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'manager', 'Design');

-- Employee users (assigned to managers)
INSERT INTO users (name, email, password, role, manager_id, department) VALUES
    ('Alice Employee', 'alice@company.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'employee', 2, 'Engineering'),
    ('Bob Developer', 'bob@company.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'employee', 2, 'Engineering'),
    ('Carol Designer', 'carol@company.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'employee', 3, 'Design'),
    ('David Analyst', 'david@company.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'employee', 2, 'Engineering');

-- =====================================================
-- SEED DATA - Sample Tasks
-- =====================================================
INSERT INTO tasks (employee_id, title, description, priority, deadline, estimated_hours, status, progress) VALUES
    (4, 'Complete API Documentation', 'Write comprehensive API documentation for the new endpoints', 'high', CURRENT_TIMESTAMP + INTERVAL '2 days', 8, 'in_progress', 60),
    (4, 'Fix Authentication Bug', 'Resolve the JWT token refresh issue', 'high', CURRENT_TIMESTAMP + INTERVAL '1 day', 4, 'in_progress', 30),
    (4, 'Code Review - Feature Branch', 'Review pull request for new feature implementation', 'medium', CURRENT_TIMESTAMP + INTERVAL '3 days', 2, 'pending', 0),
    (5, 'Database Optimization', 'Optimize slow queries in the reporting module', 'high', CURRENT_TIMESTAMP + INTERVAL '4 days', 12, 'pending', 0),
    (5, 'Unit Tests for User Module', 'Write unit tests for user authentication module', 'medium', CURRENT_TIMESTAMP + INTERVAL '5 days', 6, 'pending', 0),
    (6, 'Dashboard UI Redesign', 'Redesign the manager dashboard with new wireframes', 'high', CURRENT_TIMESTAMP + INTERVAL '3 days', 16, 'in_progress', 45),
    (6, 'Mobile Responsive Fixes', 'Fix responsive issues on mobile devices', 'medium', CURRENT_TIMESTAMP + INTERVAL '4 days', 8, 'pending', 0),
    (7, 'Performance Analysis Report', 'Create monthly performance analysis report', 'low', CURRENT_TIMESTAMP + INTERVAL '7 days', 4, 'pending', 0);

-- =====================================================
-- VIEWS for Common Queries
-- =====================================================

-- View for employee workload summary
CREATE OR REPLACE VIEW employee_workload_summary AS
SELECT 
    u.id,
    u.name,
    u.email,
    u.department,
    u.manager_id,
    COUNT(t.id) as total_tasks,
    COUNT(CASE WHEN t.status = 'pending' THEN 1 END) as pending_tasks,
    COUNT(CASE WHEN t.status = 'in_progress' THEN 1 END) as in_progress_tasks,
    COUNT(CASE WHEN t.status = 'completed' THEN 1 END) as completed_tasks,
    COUNT(CASE WHEN t.status = 'overdue' THEN 1 END) as overdue_tasks,
    COUNT(CASE WHEN t.priority = 'high' AND t.status NOT IN ('completed') THEN 1 END) as high_priority_pending,
    COALESCE(SUM(t.estimated_hours), 0) as total_estimated_hours,
    COALESCE(ws.score, 0) as current_workload_score,
    COALESCE(ws.risk_level, 'low') as current_risk_level
FROM users u
LEFT JOIN tasks t ON u.id = t.employee_id AND t.status != 'completed'
LEFT JOIN workload_scores ws ON u.id = ws.employee_id AND ws.calculated_date = CURRENT_DATE
WHERE u.role = 'employee' AND u.is_active = TRUE
GROUP BY u.id, u.name, u.email, u.department, u.manager_id, ws.score, ws.risk_level;

-- View for manager team overview
CREATE OR REPLACE VIEW manager_team_overview AS
SELECT 
    m.id as manager_id,
    m.name as manager_name,
    m.department,
    COUNT(DISTINCT e.id) as team_size,
    COUNT(DISTINCT CASE WHEN ws.risk_level = 'high' THEN e.id END) as high_risk_employees,
    COUNT(DISTINCT CASE WHEN ws.risk_level = 'medium' THEN e.id END) as medium_risk_employees,
    AVG(ws.score) as avg_team_workload
FROM users m
LEFT JOIN users e ON m.id = e.manager_id AND e.is_active = TRUE
LEFT JOIN workload_scores ws ON e.id = ws.employee_id AND ws.calculated_date = CURRENT_DATE
WHERE m.role = 'manager' AND m.is_active = TRUE
GROUP BY m.id, m.name, m.department;

-- =====================================================
-- END OF SCHEMA
-- =====================================================
