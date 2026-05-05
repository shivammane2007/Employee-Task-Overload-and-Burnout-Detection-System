const db = require('./backend/config/db');
async function upgrade() {
    try {
        await db.query("UPDATE configurations SET value_type = 'number', updated_by = 1 WHERE key IN ('workload_high_threshold', 'workload_medium_threshold', 'max_weekly_hours')");
        await db.query("UPDATE configurations SET value_type = 'boolean', updated_by = 1 WHERE key IN ('alert_enabled')");
        console.log("Migration successful");
    } catch(e) {
        console.error("Error during migration:", e.message);
    } finally { process.exit(0); }
}
upgrade();
