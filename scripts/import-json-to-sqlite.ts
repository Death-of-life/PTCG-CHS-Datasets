import { importJsonToSqlite } from "../lib/db/importer";

async function main() {
  await importJsonToSqlite();
  console.log("SQLite database imported successfully.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
