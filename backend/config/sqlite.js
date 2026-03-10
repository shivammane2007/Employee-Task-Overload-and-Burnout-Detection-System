/**
 * SQLite Database Configuration
 * Uses better-sqlite3 for synchronous SQLite operations
 */
const Database = require('better-sqlite3');
const path = require('path');
const bcrypt = require('bcryptjs');

// Create database file
const dbPath = path.join(__dirname, '..', 'data', 'seapm.db');
const fs = require('fs');

// Ensure data directory exists
const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

const db = new Database(dbPath);

// Enable foreign keys
db.pragma('foreign_keys = ON');

/**
 * Initialize database schema
 */
function initDatabase() {
    // Create tables
    db.exec(`
        -- Users table
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            name TEXT NOT NULL,
            role TEXT DEFAULT 'employee' CHECK(role IN ('employee', 'manager', 'admin')),
            department TEXT,
            manager_id INTEGER REFERENCES users(id),
            is_active INTEGER DEFAULT 1,
            avatar_url TEXT,
            last_login TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        );

        -- Tasks table
        CREATE TABLE IF NOT EXISTS tasks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            description TEXT,
            employee_id INTEGER NOT NULL REFERENCES users(id),
            created_by INTEGER REFERENCES users(id),
            priority TEXT DEFAULT 'medium' CHECK(priority IN ('low', 'medium', 'high')),
            status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'in_progress', 'completed', 'cancelled', 'overdue')),
            deadline TEXT NOT NULL,
            estimated_hours REAL,
            actual_hours REAL,
            progress INTEGER DEFAULT 0,
            notes TEXT,
            completed_at TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        );

        -- Workload scores table
        CREATE TABLE IF NOT EXISTS workload_scores (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL REFERENCES users(id),
            score REAL NOT NULL,
            risk_level TEXT CHECK(risk_level IN ('low', 'medium', 'high')),
            breakdown TEXT,
            calculated_date TEXT DEFAULT (date('now')),
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        );

        -- Alerts table
        CREATE TABLE IF NOT EXISTS alerts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL REFERENCES users(id),
            type TEXT NOT NULL,
            title TEXT NOT NULL,
            message TEXT NOT NULL,
            priority TEXT DEFAULT 'medium',
            is_read INTEGER DEFAULT 0,
            is_dismissed INTEGER DEFAULT 0,
            related_id INTEGER,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        );

        -- Notifications table
        CREATE TABLE IF NOT EXISTS notifications (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            receiver_id INTEGER NOT NULL REFERENCES users(id),
            sender_id INTEGER NOT NULL REFERENCES users(id),
            task_id INTEGER REFERENCES tasks(id),
            type TEXT NOT NULL,
            message TEXT NOT NULL,
            is_read INTEGER DEFAULT 0,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        );

        -- Configurations table
        CREATE TABLE IF NOT EXISTS configurations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            key TEXT UNIQUE NOT NULL,
            value TEXT NOT NULL,
            description TEXT,
            category TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        );

        -- Create indexes
        CREATE INDEX IF NOT EXISTS idx_tasks_employee ON tasks(employee_id);
        CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
        CREATE INDEX IF NOT EXISTS idx_workload_user_date ON workload_scores(user_id, calculated_date);
        CREATE INDEX IF NOT EXISTS idx_alerts_user ON alerts(user_id);
        CREATE INDEX IF NOT EXISTS idx_notifications_receiver ON notifications(receiver_id);
    `);

    // Insert seed data if tables are empty
    const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get();
    if (userCount.count === 0) {
        seedDatabase();
    }

    console.log('SQLite database initialized successfully');
}

/**
 * Add seed data
 */
function seedDatabase() {
    const hashedPassword = bcrypt.hashSync('password', 10);

    // Insert users
    const insertUser = db.prepare(`
        INSERT INTO users (email, password, name, role, department, manager_id)
        VALUES (?, ?, ?, ?, ?, ?)
    `);

    // Admin
    insertUser.run('admin@company.com', hashedPassword, 'System Admin', 'admin', 'IT', null);

    // Manager
    insertUser.run('manager@company.com', hashedPassword, 'Sarah Johnson', 'manager', 'Engineering', null);

    // Employees
    insertUser.run('alice@company.com', hashedPassword, 'Alice Brown', 'employee', 'Engineering', 2);
    insertUser.run('bob@company.com', hashedPassword, 'Bob Wilson', 'employee', 'Engineering', 2);
    insertUser.run('carol@company.com', hashedPassword, 'Carol Davis', 'employee', 'Engineering', 2);

    // Insert sample tasks
    const insertTask = db.prepare(`
        INSERT INTO tasks (title, description, employee_id, created_by, priority, status, deadline, estimated_hours, progress)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    insertTask.run('Complete API Documentation', 'Write comprehensive API docs for all endpoints', 3, 2, 'high', 'in_progress', tomorrow.toISOString(), 8, 40);
    insertTask.run('Review Pull Request #123', 'Code review for authentication module', 3, 2, 'high', 'pending', tomorrow.toISOString(), 2, 0);
    insertTask.run('Fix Login Bug', 'Users cannot login with special characters in password', 3, 2, 'high', 'pending', yesterday.toISOString(), 4, 0);
    insertTask.run('Database Optimization', 'Optimize slow queries in reports module', 4, 2, 'medium', 'pending', nextWeek.toISOString(), 16, 0);
    insertTask.run('Unit Tests for User Service', 'Write unit tests for user service module', 4, 2, 'medium', 'in_progress', nextWeek.toISOString(), 12, 60);
    insertTask.run('Update Dependencies', 'Update npm packages to latest versions', 5, 2, 'low', 'completed', yesterday.toISOString(), 2, 100);

    // Insert sample workload scores
    const insertWorkload = db.prepare(`
        INSERT INTO workload_scores (user_id, score, risk_level, breakdown, calculated_date)
        VALUES (?, ?, ?, ?, ?)
    `);

    const today = new Date().toISOString().split('T')[0];
    insertWorkload.run(3, 72, 'high', JSON.stringify({ taskLoad: 80, priorityScore: 75, deadlineScore: 70, hoursLoad: 65 }), today);
    insertWorkload.run(4, 55, 'medium', JSON.stringify({ taskLoad: 50, priorityScore: 60, deadlineScore: 55, hoursLoad: 55 }), today);
    insertWorkload.run(5, 25, 'low', JSON.stringify({ taskLoad: 20, priorityScore: 30, deadlineScore: 25, hoursLoad: 25 }), today);

    // Insert configurations
    const insertConfig = db.prepare(`
        INSERT INTO configurations (key, value, description, category)
        VALUES (?, ?, ?, ?)
    `);

    insertConfig.run('workload_high_threshold', '70', 'Score above this is high risk', 'workload');
    insertConfig.run('workload_medium_threshold', '40', 'Score above this is medium risk', 'workload');
    insertConfig.run('max_weekly_hours', '40', 'Standard weekly working hours', 'workload');
    insertConfig.run('alert_enabled', 'true', 'Enable alert notifications', 'alerts');

    console.log('Seed data inserted successfully');
}

/**
 * Query helper - mimics pg pool query interface
 */
const pool = {
    query: (text, params = []) => {
        try {
            // Convert $1, $2 style params to ? style
            let convertedText = text;
            let paramIndex = 1;
            while (convertedText.includes('$' + paramIndex)) {
                convertedText = convertedText.replace('$' + paramIndex, '?');
                paramIndex++;
            }

            // Handle RETURNING clause (SQLite doesn't support it natively)
            const hasReturning = convertedText.toLowerCase().includes('returning');

            if (hasReturning) {
                // Remove RETURNING clause for execution
                const returningMatch = convertedText.match(/returning\s+(.+)$/i);
                convertedText = convertedText.replace(/\s+returning\s+.+$/i, '');

                const stmt = db.prepare(convertedText);
                const isSelect = convertedText.trim().toLowerCase().startsWith('select');

                if (isSelect) {
                    const rows = stmt.all(...params);
                    return Promise.resolve({ rows, rowCount: rows.length });
                } else {
                    const result = stmt.run(...params);
                    // Fetch the inserted/updated row
                    if (result.lastInsertRowid) {
                        const tableName = extractTableName(text);
                        if (tableName) {
                            const row = db.prepare(`SELECT * FROM ${tableName} WHERE id = ?`).get(result.lastInsertRowid);
                            return Promise.resolve({ rows: [row], rowCount: 1 });
                        }
                    }
                    return Promise.resolve({ rows: [], rowCount: result.changes });
                }
            }

            const stmt = db.prepare(convertedText);
            const isSelect = convertedText.trim().toLowerCase().startsWith('select');

            if (isSelect) {
                const rows = stmt.all(...params);
                return Promise.resolve({ rows, rowCount: rows.length });
            } else {
                const result = stmt.run(...params);
                return Promise.resolve({
                    rows: [],
                    rowCount: result.changes,
                    lastInsertRowid: result.lastInsertRowid
                });
            }
        } catch (error) {
            console.error('Database query error:', error.message);
            console.error('Query:', text);
            console.error('Params:', params);
            return Promise.reject(error);
        }
    }
};

/**
 * Extract table name from SQL query
 */
function extractTableName(sql) {
    const match = sql.match(/(?:insert\s+into|update|from)\s+(\w+)/i);
    return match ? match[1] : null;
}

/**
 * Get a client for transactions
 */
pool.connect = async () => {
    return {
        query: pool.query,
        release: () => { }
    };
};

// Initialize database on load
initDatabase();

module.exports = {
    pool,
    query: pool.query
};
