/**
 * Run raw SQL against the hosted Turso database.
 * Usage: node scripts/turso-migrate.js "ALTER TABLE Foo ADD COLUMN bar TEXT"
 */
require("dotenv").config();
const { createClient } = require("@libsql/client");

const sql = process.argv[2];
if (!sql) {
  console.error("Usage: node scripts/turso-migrate.js \"<SQL statement>\"");
  process.exit(1);
}

const client = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

client
  .execute(sql)
  .then(() => {
    console.log("✓ Migration applied:", sql);
    process.exit(0);
  })
  .catch((e) => {
    console.error("✗ Migration failed:", e.message);
    process.exit(1);
  });
