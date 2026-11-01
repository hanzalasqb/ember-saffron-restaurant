import "dotenv/config";
import { z } from "zod";

const Env = z.object({
  NODE_ENV: z.string().default("development"),
  PORT: z.coerce.number().default(4100),
  DATABASE_URL: z.string().default(""),
  JWT_SECRET: z.string().default("dev-only-insecure-secret-change-me-in-production"),
  ADMIN_EMAIL: z.string().default("manager@ember-saffron.local"),
  ADMIN_PASSWORD: z.string().default(""),
  LLM_BASE_URL: z.string().default("https://api.openai.com/v1"),
  LLM_API_KEY: z.string().default(""),
  LLM_MODEL: z.string().default("gpt-4o-mini"),
  CORS_ORIGIN: z.string().default("http://localhost:5173"),
});

export const config = Env.parse(process.env);
if (config.NODE_ENV === "production" && config.JWT_SECRET.startsWith("dev-only")) throw new Error("JWT_SECRET must be set in production");
