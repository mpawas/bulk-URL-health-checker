import { prisma } from "./prisma.js";
import { startUrlCheckWorker } from "./modules/url-check/url-check.worker.js";

const worker = startUrlCheckWorker();

async function shutdown(signal: string): Promise<void> {
  console.log(`received ${signal}, shutting down worker`);
  await worker.close();
  await prisma.$disconnect();
  process.exit(0);
}

process.on("SIGTERM", () => {
  void shutdown("SIGTERM");
});
process.on("SIGINT", () => {
  void shutdown("SIGINT");
});
