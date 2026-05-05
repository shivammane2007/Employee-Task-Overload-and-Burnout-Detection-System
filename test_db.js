const db = require('./backend/config/db');
async function test() {
    try {
        const res = await db.query("SELECT sql FROM sqlite_master WHERE name='configurations';");
        console.log("Schema:", res.rows);
    } catch(e) {
        console.error("Error:", e);
    } finally { process.exit(0); }
}
test();
