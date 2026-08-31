import { buildApp } from "./app.js";
import { runMigrations } from "./plugins/prisma.js";

const port = Number(process.env.PORT ?? 4000);

try {
  await runMigrations();
  const app = await buildApp();
  await app.listen({ port, host: "0.0.0.0" });
} catch (err) {
  console.error(err);
  process.exit(1);
}
