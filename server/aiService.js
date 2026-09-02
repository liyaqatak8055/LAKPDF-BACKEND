import "./env.js";
import OpenAI from "openai";

const AI_PROVIDER = String(process.env.AI_PROVIDER || "openrouter").trim().toLowerCase();
const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";
const GROQ_BASE_URL = "https://api.groq.com/openai/v1";
const DEEPINFRA_BASE_URL = "https://api.deepinfra.com/v1/openai";
const DEFAULT_GPT_MODEL = process.env.AI_DEFAULT_MODEL || process.env.OPENROUTER_DEFAULT_MODEL || "meta-llama/llama-3.1-8b-instruct:free";
const MAX_PROVIDER_OUTPUT_TOKENS = Number(process.env.AI_MAX_OUTPUT_TOKENS || 500);
const OPENROUTER_MAX_RETRIES = Math.max(0, Number(process.env.OPENROUTER_MAX_RETRIES || 2));
const OPENROUTER_RETRY_BASE_MS = Math.max(200, Number(process.env.OPENROUTER_RETRY_BASE_MS || 700));
const OPENROUTER_FALLBACK_MODELS = String(
  process.env.OPENROUTER_FALLBACK_MODELS ||
    "meta-llama/llama-3.1-8b-instruct:free,meta-llama/llama-3.3-70b-instruct:free,openai/gpt-4o-mini"
)
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);

const openrouterKey = process.env.OPENROUTER_API_KEY || "";
const groqKey = process.env.GROQ_API_KEY || "";
const deepinfraKey = process.env.DEEPINFRA_API_KEY || "";

const providerConfigMap = {
  openrouter: {
    key: openrouterKey,
    baseURL: OPENROUTER_BASE_URL,
  },
  groq: {
    key: groqKey,
    baseURL: GROQ_BASE_URL,
  },
  deepinfra: {
    key: deepinfraKey,
    baseURL: DEEPINFRA_BASE_URL,
  },
};

const selectedProvider = providerConfigMap[AI_PROVIDER] ? AI_PROVIDER : "openrouter";
const selectedProviderConfig = providerConfigMap[selectedProvider];

const llmClient = selectedProviderConfig.key
  ? new OpenAI({
    baseURL: selectedProviderConfig.baseURL,
    apiKey: selectedProviderConfig.key,
  })
  : null;

export const aiConfig = {
  openrouterConfigured: Boolean(openrouterKey),
  selectedProvider,
  providerConfigured: Boolean(selectedProviderConfig.key),
  defaultModels: {
    gpt: DEFAULT_GPT_MODEL,
  },
  maxOutputTokens: MAX_PROVIDER_OUTPUT_TOKENS,
};

const clampOutputTokens = (value) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return Math.min(MAX_PROVIDER_OUTPUT_TOKENS, 500);
  return Math.min(Math.max(64, Math.floor(parsed)), MAX_PROVIDER_OUTPUT_TOKENS);
};

const clampTemperature = (value) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 0.7;
  return Math.min(2, Math.max(0, parsed));
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const toNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const createServiceError = (message, statusCode = 500, retryAfterSec = 0) => {
  /** @type {Error & {statusCode?: number, retryAfterSec?: number}} */
  const err = new Error(message);
  err.statusCode = statusCode;
  if (retryAfterSec > 0) err.retryAfterSec = retryAfterSec;
  return err;
};

const normalizeOpenRouterError = (error) => {
  const status = toNumber(error?.status || error?.statusCode);
  const retryAfterSec = toNumber(
    error?.headers?.["retry-after"] || error?.response?.headers?.["retry-after"]
  );

  if (status === 429) {
    return createServiceError("OpenRouter rate limit exceeded. Please retry shortly.", 429, retryAfterSec);
  }
  if (status === 401 || status === 403) {
    return createServiceError("OpenRouter API key is invalid or unauthorized.", status);
  }
  if (status >= 500) {
    return createServiceError("OpenRouter upstream is temporarily unavailable. Please retry.", 503, retryAfterSec);
  }

  const rawMessage = String(error?.message || "").toLowerCase();
  if (rawMessage.includes("timeout") || rawMessage.includes("network") || rawMessage.includes("econnreset")) {
    return createServiceError("OpenRouter network timeout. Please retry.", 503);
  }

  return createServiceError(
    String(error?.message || "OpenRouter request failed"),
    status >= 400 ? status : 500,
    retryAfterSec
  );
};

const isRetryableOpenRouterError = (error) => {
  const status = toNumber(error?.status || error?.statusCode);
  if (status === 429 || status === 408 || status === 409 || status >= 500) {
    return true;
  }

  const message = String(error?.message || "").toLowerCase();
  return (
    message.includes("timeout") ||
    message.includes("timed out") ||
    message.includes("network") ||
    message.includes("econnreset")
  );
};

export async function useOpenRouter(model, prompt, maxOutputTokens = MAX_PROVIDER_OUTPUT_TOKENS, options = {}) {
  if (!llmClient) {
    throw createServiceError(`${selectedProvider.toUpperCase()} API key is not configured`, 500);
  }

  const requireJson = Boolean(options?.requireJson);
  const userPrompt = String(options?.userPrompt || prompt);
  const systemPrompt = typeof options?.systemPrompt === "string" ? options.systemPrompt : "";
  const temperature = clampTemperature(options?.temperature ?? 0.7);
  const stop = Array.isArray(options?.stop)
    ? options.stop.map((s) => String(s || "").trim()).filter(Boolean).slice(0, 4)
    : [];
  /** @type {import("openai/resources/chat/completions").ChatCompletionMessageParam[]} */
  const messages = [];
  if (systemPrompt) {
    messages.push({ role: "system", content: systemPrompt });
  }
  messages.push({ role: "user", content: userPrompt });

  const attempts = OPENROUTER_MAX_RETRIES + 1;
  let lastError = null;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await llmClient.chat.completions.create({
        model: model || DEFAULT_GPT_MODEL,
        messages,
        max_tokens: clampOutputTokens(maxOutputTokens),
        temperature,
        ...(stop.length ? { stop } : {}),
        ...(requireJson ? { response_format: { type: "json_object" } } : {}),
      });

      const content = response?.choices?.[0]?.message?.content;
      if (!content) {
        throw createServiceError("No response from OpenRouter model", 502);
      }
      return content;
    } catch (error) {
      lastError = error;
      if (!isRetryableOpenRouterError(error) || attempt >= attempts) break;
      const backoff = Math.min(5000, OPENROUTER_RETRY_BASE_MS * 2 ** (attempt - 1));
      await sleep(backoff);
    }
  }

  throw normalizeOpenRouterError(lastError);
}

export async function askAI(prompt, options = {}) {
  const gptModel = String(options.gptModel || DEFAULT_GPT_MODEL);
  const maxOutputTokens = clampOutputTokens(options.maxOutputTokens);
  const requireJson = Boolean(options.requireJson);
  const systemPrompt = typeof options.systemPrompt === "string" ? options.systemPrompt : "";
  const userPrompt = typeof options.userPrompt === "string" ? options.userPrompt : prompt;
  const temperature = clampTemperature(options.temperature ?? 0.7);
  const stop = Array.isArray(options.stop)
    ? options.stop.map((s) => String(s || "").trim()).filter(Boolean).slice(0, 4)
    : [];
  const modelCandidates = [...new Set([gptModel, ...OPENROUTER_FALLBACK_MODELS])].filter(Boolean);

  let lastOpenRouterError = null;
  for (const modelCandidate of modelCandidates) {
    try {
      const text = await useOpenRouter(modelCandidate, prompt, maxOutputTokens, {
        requireJson,
        systemPrompt,
        userPrompt,
        temperature,
        stop,
      });
      return { provider: selectedProvider, model: modelCandidate, text };
    } catch (error) {
      lastOpenRouterError = error;
      const status = toNumber(error?.statusCode || error?.status);
      // For auth/config errors no benefit in trying more models.
      if (status === 401 || status === 403) {
        break;
      }
    }
  }

  throw lastOpenRouterError || createServiceError("OpenRouter request failed", 503);
}
