
import dotenv from "dotenv";
import { defineConfig } from "drizzle-kit";
dotenv.config();

const url = process.env.MIGRATE_URL ?? process.env.DATABASE_URL;

if (!url) {
  throw new Error("MIGRATE_URL or DATABASE_URL is not set in .env file");
}

export default defineConfig({
  schema: "./src/db/schema/index.ts",
  out: "./drizzle",
  dialect: "postgresql",
  
  dbCredentials: {
    url,
  },
});





// import dotenv from "dotenv";
// import { defineConfig } from "drizzle-kit";
// dotenv.config();
// const url = process.env.MIGRATE_URL ?? process.env.DATABASE_URL;

// if (!url) {
//   throw new Error("MIGRATE_URL or DATABASE_URL must be set in .env");
// }

// export default defineConfig({
//   schema: "./src/db/schema/index.ts",
//   out: "./drizzle",
//   dialect: "postgresql",
//   dbCredentials: { url },
// });
