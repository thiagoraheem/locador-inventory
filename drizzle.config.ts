
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  out: "./migrations",
  schema: "./shared/schema.ts",
  dialect: "mssql",
  dbCredentials: {
    server: '54.232.194.197',
    database: 'inventory',
    user: 'usrInventory',
    password: 'inv@2025',
    options: {
      encrypt: false,
      trustServerCertificate: true,
    },
  },
});
