import "dotenv/config";
import { readFile } from "node:fs/promises";
import { getDb, closeDb } from "./client.js";

async function main() {
  const sql = await readFile(new URL("../../db/schema.sql", import.meta.url), "utf8");
  const db = getDb();
  await db.query("BEGIN");
  try {
    await db.query(sql);
    await db.query("COMMIT");
    console.log("Database schema applied successfully.");
  } catch (error) {
    await db.query("ROLLBACK");
    throw error;
  } finally {
    await closeDb();
  }
}

main().catch((error) => {
  console.error("Database migration failed.");
  console.error(error instanceof Error ? error.message : "Unknown error");
  process.exitCode = 1;
});
