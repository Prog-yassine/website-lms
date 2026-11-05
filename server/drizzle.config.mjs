import { relative } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "sqlite",
  schema: fileURLToPath(new URL("./db/schema.js", import.meta.url)),
  // Drizzle Kit's snapshot reader requires a relative output directory.
  out: relative(process.cwd(), fileURLToPath(new URL("../drizzle", import.meta.url))) || ".",
});
