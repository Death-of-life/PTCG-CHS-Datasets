import fs from "node:fs";

import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";

import { dataDirPath, sqlitePath } from "@/lib/db/paths";

let sqlite: Database.Database | null = null;

export function getSqlite() {
  if (!sqlite) {
    fs.mkdirSync(dataDirPath, { recursive: true });
    sqlite = new Database(sqlitePath);
    sqlite.pragma("journal_mode = WAL");
    sqlite.pragma("foreign_keys = ON");
  }

  return sqlite;
}

export function getDb() {
  return drizzle(getSqlite());
}
