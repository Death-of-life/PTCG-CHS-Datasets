import type { Config } from "drizzle-kit";

import { sqlitePath } from "./lib/db/paths";

export default {
  schema: "./lib/db/schema.ts",
  out: "./drizzle",
  dialect: "sqlite",
  dbCredentials: {
    url: sqlitePath,
  },
} satisfies Config;
