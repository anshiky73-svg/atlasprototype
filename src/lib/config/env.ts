import { z } from "zod";

const geminiEnvSchema = z.object({
  GEMINI_API_KEY: z.string().min(1, "Set GEMINI_API_KEY in .env to enable extraction."),
  GEMINI_MODEL: z.string().min(1, "Set GEMINI_MODEL to a currently available permitted model."),
});
const cronSecretSchema = z.string().min(
  32,
  "Set CRON_SECRET to a random value of at least 32 characters.",
);

export function requireGeminiConfig() {
  return geminiEnvSchema.parse(process.env);
}

export function hasGeminiConfig(): boolean {
  return geminiEnvSchema.safeParse(process.env).success;
}

export function requireCronSecret(): string {
  return cronSecretSchema.parse(process.env["CRON_SECRET"] ?? "");
}

export function hasCronSecret(): boolean {
  return cronSecretSchema.safeParse(process.env["CRON_SECRET"] ?? "").success;
}

export function hasDatabaseConfig(): boolean {
  return Boolean(process.env["DATABASE_URL_POOLED"] || process.env["DATABASE_URL"]);
}
