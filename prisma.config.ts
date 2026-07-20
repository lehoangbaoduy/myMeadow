import path from "node:path";
import "dotenv/config";
import { defineConfig } from "prisma/config";

const databaseUrl = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

if (!databaseUrl || !authToken) {
  throw new Error(
    "Missing TURSO_DATABASE_URL or TURSO_AUTH_TOKEN environment variables. Copy .env.example to .env and fill in values."
  );
}

export default defineConfig({
  schema: path.join("prisma", "schema.prisma"),
  datasource: {
    url: `file:${path.join(process.cwd(), "prisma", `${databaseUrl}?authToken=${authToken}`)}`,
  },
  migrations: {
    seed: "ts-node --compiler-options {\"module\":\"CommonJS\"} prisma/seed.ts",
  },
});
