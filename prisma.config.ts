import path from "node:path";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: path.join("prisma", "schema.prisma"),
  datasource: {
    url: `file:${path.join(process.cwd(), "prisma", "libsql://mymeadow-duyle2408.aws-us-east-2.turso.io?authToken=eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3NzM5NzUxODUsImlkIjoiMDE5ZDA4ZWItM2YwMS03MjcxLTgyMWQtZmQxNDk0YTg3NTIyIiwicmlkIjoiNzllNmI2MDctZmZhZi00MTNhLThhN2MtNGY3NDgzZDFlNDRmIn0.ct491w4pjm5EjgtezwjnBOfS0B78L2gI9Ow1fhhxh-ZRh2inLfxPBPuiUSouHNK18B4BmKG53GUWlFXSqaD8Bg")}`,
  },
  migrations: {
    seed: "ts-node --compiler-options {\"module\":\"CommonJS\"} prisma/seed.ts",
  },
});
