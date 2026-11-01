import { createApp } from "./app";
import { config } from "./config";
import { createDatabase } from "./db/client";
import { createLLM } from "./lib/llm";
import { seed } from "./services/seed";

const { db, close } = await createDatabase(config.DATABASE_URL);
await seed(db);
const llm = createLLM(config.LLM_BASE_URL, config.LLM_API_KEY, config.LLM_MODEL);
const server = createApp(db, llm, { corsOrigin: config.CORS_ORIGIN }).listen(config.PORT, () => {
  console.log(`Ember & Saffron API on http://localhost:${config.PORT} (AI: ${llm.enabled ? "LLM" : "rule-based fallback"})`);
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => server.close(async () => { await close(); process.exit(0); }));
}
