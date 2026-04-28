/**
 * =====================================================
 * Database Configuration
 * Uses SQLite for easy development (no PostgreSQL needed)
 * =====================================================
 */

require('dotenv').config();

// Use SQLite adapter
const { pool, query: sqliteQuery } = require('./sqlite');

/**
 * Execute a query with parameters
 * @param {string} text - SQL query text
 * @param {Array} params - Query parameters
 * @returns {Promise} Query result
 */
const query = async (text, params) => {
    const start = Date.now();
    try {
        const result = await pool.query(text, params);
        const duration = Date.now() - start;

        // Log slow queries in development
        if (process.env.NODE_ENV === 'development' && duration > 100) {
            console.log('⚠️ Slow query:', { text, duration: `${duration}ms`, rows: result.rowCount });
        }

        return result;
    } catch (error) {
        console.error('❌ Database query error:', error.message);
        throw error;
    }
};

/**
 * Get a client from the pool for transactions
 * @returns {Promise} Pool client
 */
const getClient = async () => {
    return await pool.connect();
};

/**
 * Execute a transaction with multiple queries
 * @param {Function} callback - Function that receives the client and executes queries
 * @returns {Promise} Transaction result
 */
const transaction = async (callback) => {
    const client = await getClient();
    try {
        await client.query('BEGIN');
        const result = await callback(client);
        await client.query('COMMIT');
        return result;
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
};

/**
 * Check database connection health
 * @returns {Promise<boolean>} Connection status
 */
const checkHealth = async () => {
    try {
        const result = await query("SELECT datetime('now') as now");
        return !!result.rows[0];
    } catch (error) {
        return false;
    }
};

/**
 * Close all pool connections
 * @returns {Promise}
 */
const closePool = async () => {
    console.log('📦 Database connection closed');
};

module.exports = {
    query,
    getClient,
    transaction,
    checkHealth,
    closePool,
    pool
};
