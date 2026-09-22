import "./env.js";
import OpenAI from "openai";

const AI_PROVIDER = String(process.env.AI_PROVIDER || "openrouter").trim().toLowerCase();
const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";
const GROQ_BASE_URL = "https://api.groq.com/openai/v1";
const GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/openai/";
const DEEPINFRA_BASE_URL = "https://api.deepinfra.com/v1/openai";

const DEFAULT_GPT_MODEL = process.env.AI_DEFAULT_MODEL || process.env.OPENROUTER_DEFAULT_MODEL || "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free";
const MAX_PROVIDER_OUTPUT_TOKENS = Number(process.env.AI_MAX_OUTPUT_TOKENS || 3500);
const OPENROUTER_MAX_RETRIES = Math.max(0, Number(process.env.OPENROUTER_MAX_RETRIES || 1));
const OPENROUTER_RETRY_BASE_MS = Math.max(200, Number(process.env.OPENROUTER_RETRY_BASE_MS || 500));

// Curated high-availability free models on OpenRouter
const OPENROUTER_FALLBACK_MODELS = String(
  process.env.OPENROUTER_FALLBACK_MODELS ||
    "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free,openrouter/free,nex-agi/nex-n2.5-mini:free"
)
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);

// Free models on Groq (ultra fast inference, 14,400 free requests/day)
const GROQ_FREE_MODELS = [
  "llama-3.3-70b-versatile",
  "llama-3.1-8b-instant",
];

// Free models on Google Gemini (1,500 free requests/day + 1M tokens/min via Google AI Studio)
const GEMINI_FREE_MODELS = [
  "gemini-2.5-flash",
  "gemini-flash-latest",
  "gemini-2.5-flash-lite",
];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const toNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
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

const createServiceError = (message, statusCode = 500, retryAfterSec = 0) => {
  /** @type {Error & {statusCode?: number, retryAfterSec?: number}} */
  const err = new Error(message);
  err.statusCode = statusCode;
  if (retryAfterSec > 0) err.retryAfterSec = retryAfterSec;
  return err;
};

// ── Multi-API-Key Pool & Auto-Rotation Manager ─────────────────────────
class ApiKeyManager {
  constructor() {
    /** @type {Array<{id: string, provider: string, key: string, masked: string, baseURL: string, cooldownUntil: number, consecutiveFails: number, totalSuccesses: number, lastUsedAt: number}>} */
    this.keyPool = [];
    this.reloadKeys();
  }

  maskKey(key = "") {
    if (!key || key.length < 10) return "****";
    return `${key.slice(0, 8)}...${key.slice(-4)}`;
  }

  reloadKeys() {
    const openrouterKeys = new Set();
    const groqKeys = new Set();
    const geminiKeys = new Set();
    const deepinfraKeys = new Set();

    // 1. OPENROUTER_API_KEYS (comma, semicolon, pipe, or newline separated)
    if (process.env.OPENROUTER_API_KEYS) {
      process.env.OPENROUTER_API_KEYS.split(/[,;\n|]/).forEach((k) => {
        const clean = k.trim();
        if (clean && !clean.includes("REDACTED") && !clean.includes("your_")) openrouterKeys.add(clean);
      });
    }
    // 2. OPENROUTER_API_KEY
    if (process.env.OPENROUTER_API_KEY) {
      const clean = process.env.OPENROUTER_API_KEY.trim();
      if (clean && !clean.includes("REDACTED") && !clean.includes("your_")) openrouterKeys.add(clean);
    }
    // 3. OPENROUTER_API_KEY_1, OPENROUTER_API_KEY_2 ... up to _30
    for (let i = 1; i <= 30; i++) {
      const key = process.env[`OPENROUTER_API_KEY_${i}`];
      if (key) {
        const clean = key.trim();
        if (clean && !clean.includes("REDACTED") && !clean.includes("your_")) openrouterKeys.add(clean);
      }
    }

    // Groq keys (14,400 requests/day free tier)
    if (process.env.GROQ_API_KEYS) {
      process.env.GROQ_API_KEYS.split(/[,;\n|]/).forEach((k) => {
        const clean = k.trim();
        if (clean && !clean.includes("REDACTED") && !clean.includes("your_")) groqKeys.add(clean);
      });
    }
    if (process.env.GROQ_API_KEY) {
      const clean = process.env.GROQ_API_KEY.trim();
      if (clean && !clean.includes("REDACTED") && !clean.includes("your_")) groqKeys.add(clean);
    }
    for (let i = 1; i <= 20; i++) {
      const key = process.env[`GROQ_API_KEY_${i}`];
      if (key && key.trim()) groqKeys.add(key.trim());
    }

    // Gemini keys (1,500 requests/day free tier via Google AI Studio)
    if (process.env.GEMINI_API_KEYS) {
      process.env.GEMINI_API_KEYS.split(/[,;\n|]/).forEach((k) => {
        const clean = k.trim();
        if (clean && !clean.includes("REDACTED") && !clean.includes("your_")) geminiKeys.add(clean);
      });
    }
    if (process.env.GEMINI_API_KEY) {
      const clean = process.env.GEMINI_API_KEY.trim();
      if (clean && !clean.includes("REDACTED") && !clean.includes("your_")) geminiKeys.add(clean);
    }
    for (let i = 1; i <= 20; i++) {
      const key = process.env[`GEMINI_API_KEY_${i}`];
      if (key && key.trim()) geminiKeys.add(key.trim());
    }

    // DeepInfra keys
    if (process.env.DEEPINFRA_API_KEYS) {
      process.env.DEEPINFRA_API_KEYS.split(/[,;\n|]/).forEach((k) => {
        const clean = k.trim();
        if (clean) deepinfraKeys.add(clean);
      });
    }
    if (process.env.DEEPINFRA_API_KEY) {
      const clean = process.env.DEEPINFRA_API_KEY.trim();
      if (clean) deepinfraKeys.add(clean);
    }

    const existingMap = new Map(this.keyPool.map((k) => [k.key, k]));
    const newPool = [];

    let orIdx = 1;
    for (const key of openrouterKeys) {
      const existing = existingMap.get(key);
      newPool.push(
        existing || {
          id: `openrouter_${orIdx++}`,
          provider: "openrouter",
          key,
          masked: this.maskKey(key),
          baseURL: OPENROUTER_BASE_URL,
          cooldownUntil: 0,
          consecutiveFails: 0,
          totalSuccesses: 0,
          lastUsedAt: 0,
        }
      );
    }

    let groqIdx = 1;
    for (const key of groqKeys) {
      const existing = existingMap.get(key);
      newPool.push(
        existing || {
          id: `groq_${groqIdx++}`,
          provider: "groq",
          key,
          masked: this.maskKey(key),
          baseURL: GROQ_BASE_URL,
          cooldownUntil: 0,
          consecutiveFails: 0,
          totalSuccesses: 0,
          lastUsedAt: 0,
        }
      );
    }

    let gemIdx = 1;
    for (const key of geminiKeys) {
      const existing = existingMap.get(key);
      newPool.push(
        existing || {
          id: `gemini_${gemIdx++}`,
          provider: "gemini",
          key,
          masked: this.maskKey(key),
          baseURL: GEMINI_BASE_URL,
          cooldownUntil: 0,
          consecutiveFails: 0,
          totalSuccesses: 0,
          lastUsedAt: 0,
        }
      );
    }

    let diIdx = 1;
    for (const key of deepinfraKeys) {
      const existing = existingMap.get(key);
      newPool.push(
        existing || {
          id: `deepinfra_${diIdx++}`,
          provider: "deepinfra",
          key,
          masked: this.maskKey(key),
          baseURL: DEEPINFRA_BASE_URL,
          cooldownUntil: 0,
          consecutiveFails: 0,
          totalSuccesses: 0,
          lastUsedAt: 0,
        }
      );
    }

    this.keyPool = newPool;
    console.log(
      `[AI KeyPool] Initialized with ${this.keyPool.length} keys (OpenRouter: ${openrouterKeys.size}, Groq: ${groqKeys.size}, Gemini: ${geminiKeys.size}, DeepInfra: ${deepinfraKeys.size})`
    );
  }

  // Get active keys for a provider, sorted by least-recently-used for load balancing
  getAvailableKeys(provider = "openrouter") {
    const now = Date.now();
    const available = this.keyPool
      .filter((k) => k.provider === provider && k.cooldownUntil <= now)
      .sort((a, b) => a.lastUsedAt - b.lastUsedAt);

    // If all keys for this provider are cooling down, return the one whose cooldown will end first
    if (available.length === 0) {
      const allForProvider = this.keyPool.filter((k) => k.provider === provider);
      if (allForProvider.length > 0) {
        return allForProvider.sort((a, b) => a.cooldownUntil - b.cooldownUntil).slice(0, 1);
      }
    }

    return available;
  }

  // Report error for a key so it is temporarily put on cooldown and next key takes over
  reportFailure(keyStr, statusCode, retryAfterSec = 0) {
    const entry = this.keyPool.find((k) => k.key === keyStr);
    if (!entry) return;

    entry.consecutiveFails += 1;
    const now = Date.now();

    if (statusCode === 429) {
      // Rate-limited: cooldown for retryAfter or default 45s
      const coolMs = Math.max(30_000, (retryAfterSec || 45) * 1000);
      entry.cooldownUntil = now + coolMs;
      console.warn(
        `[AI KeyPool] Key ${entry.masked} (${entry.provider}) rate-limited (429). Cooldown: ${Math.round(coolMs / 1000)}s. Rotating to next key in pool.`
      );
    } else if (statusCode === 402) {
      // Quota exhausted: cooldown for 20 minutes
      const coolMs = 20 * 60 * 1000;
      entry.cooldownUntil = now + coolMs;
      console.warn(
        `[AI KeyPool] Key ${entry.masked} (${entry.provider}) quota exhausted (402). Cooldown: 20m. Rotating to next key in pool.`
      );
    } else if (statusCode === 401 || statusCode === 403) {
      // Invalid/Expired key: cooldown for 24 hours so it doesn't block valid keys
      const coolMs = 24 * 60 * 60 * 1000;
      entry.cooldownUntil = now + coolMs;
      console.warn(
        `[AI KeyPool] Key ${entry.masked} (${entry.provider}) invalid or expired (${statusCode}). Disabled for 24h. Auto-switched to backup key.`
      );
    } else if (statusCode === 400 || statusCode === 404) {
      // Bad Request / Model Not Found: not an API key issue, do not cooldown
      return;
    } else {
      // General error: brief 5s cooldown
      entry.cooldownUntil = now + 5_000;
    }
  }

  reportSuccess(keyStr) {
    const entry = this.keyPool.find((k) => k.key === keyStr);
    if (!entry) return;
    entry.lastUsedAt = Date.now();
    entry.consecutiveFails = 0;
    entry.totalSuccesses += 1;
    entry.cooldownUntil = 0;
  }

  getPoolStats() {
    const now = Date.now();
    return {
      totalKeys: this.keyPool.length,
      activeKeys: this.keyPool.filter((k) => k.cooldownUntil <= now).length,
      coolingDownKeys: this.keyPool.filter((k) => k.cooldownUntil > now).length,
      providers: [...new Set(this.keyPool.map((k) => k.provider))],
    };
  }
}

export const keyManager = new ApiKeyManager();

export const aiConfig = {
  openrouterConfigured: keyManager.getAvailableKeys("openrouter").length > 0,
  selectedProvider: AI_PROVIDER || "openrouter",
  providerConfigured: keyManager.keyPool.length > 0,
  defaultModels: {
    gpt: DEFAULT_GPT_MODEL,
  },
  maxOutputTokens: MAX_PROVIDER_OUTPUT_TOKENS,
  getPoolStats: () => keyManager.getPoolStats(),
};

const normalizeOpenRouterError = (error, provider = "") => {
  const status = toNumber(error?.status || error?.statusCode);
  const retryAfterSec = toNumber(
    error?.headers?.["retry-after"] || error?.response?.headers?.["retry-after"]
  );

  const providerLabel = provider ? provider.charAt(0).toUpperCase() + provider.slice(1) : "AI";

  if (status === 429) {
    return createServiceError(`${providerLabel} rate limit exceeded. Please retry shortly.`, 429, retryAfterSec);
  }
  if (status === 401 || status === 403) {
    return createServiceError(`${providerLabel} API key is invalid or unauthorized.`, status);
  }
  if (status === 402) {
    return createServiceError(`${providerLabel} API key has insufficient credits or quota.`, 402);
  }
  if (status >= 500) {
    return createServiceError(`${providerLabel} upstream is temporarily unavailable. Please retry.`, 503, retryAfterSec);
  }

  const rawMessage = String(error?.message || "").toLowerCase();
  if (rawMessage.includes("timeout") || rawMessage.includes("network") || rawMessage.includes("econnreset")) {
    return createServiceError(`${providerLabel} network timeout. Please retry.`, 503);
  }

  return createServiceError(
    String(error?.message || `${providerLabel} request failed`),
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

/**
 * Executes an AI chat completion with a specific client and model
 */
async function callOpenAICompatible(client, model, messages, maxOutputTokens, options = {}) {
  const requireJson = Boolean(options?.requireJson);
  const temperature = clampTemperature(options?.temperature ?? 0.7);
  const stop = Array.isArray(options?.stop)
    ? options.stop.map((s) => String(s || "").trim()).filter(Boolean).slice(0, 4)
    : [];

  // When requireJson is true, ensure at least one message contains the word "json" (required by Groq & OpenAI specs)
  let finalMessages = messages;
  if (requireJson) {
    const hasJsonWord = messages.some((m) => {
      if (typeof m?.content === "string") return m.content.toLowerCase().includes("json");
      if (Array.isArray(m?.content)) return JSON.stringify(m.content).toLowerCase().includes("json");
      return false;
    });
    if (!hasJsonWord) {
      finalMessages = [
        ...messages,
        { role: "system", content: "You must return valid JSON output only." },
      ];
    }
  }

  const response = await client.chat.completions.create(
    {
      model,
      messages: finalMessages,
      max_tokens: clampOutputTokens(maxOutputTokens),
      temperature,
      ...(stop.length ? { stop } : {}),
      ...(requireJson ? { response_format: { type: "json_object" } } : {}),
    },
    { timeout: 25000 } // 25s timeout so failover can complete before reverse proxy 504 timeout
  );

  const content = response?.choices?.[0]?.message?.content;
  if (!content) {
    throw createServiceError("No response received from model", 502);
  }
  return content;
}

/**
 * Universal Ask AI with Multi-Key Pool Auto-Rotation & Multi-Model Failover
 */
export async function askAI(prompt, options = {}) {
  let gptModel = String(options.gptModel || DEFAULT_GPT_MODEL);
  if (!gptModel || gptModel.includes("nex-agi") || gptModel === "default") {
    gptModel = DEFAULT_GPT_MODEL;
  }

  const maxOutputTokens = clampOutputTokens(options.maxOutputTokens);
  const requireJson = Boolean(options.requireJson);
  const systemPrompt = typeof options.systemPrompt === "string" ? options.systemPrompt.trim() : "";
  const userPrompt =
    typeof options.userPrompt === "string" && options.userPrompt.trim()
      ? options.userPrompt.trim()
      : typeof prompt === "string"
        ? prompt.trim()
        : "";
  const temperature = clampTemperature(options.temperature ?? 0.7);
  const customApiKey = String(options.apiKey || "").trim();
  const stop = Array.isArray(options.stop)
    ? options.stop.map((s) => String(s || "").trim()).filter(Boolean).slice(0, 4)
    : [];

  const effectiveUserContent = userPrompt || (typeof prompt === "string" ? prompt.trim() : "") || "Please respond to this request.";

  /** @type {import("openai/resources/chat/completions").ChatCompletionMessageParam[]} */
  const messages = [];
  if (systemPrompt) {
    messages.push({ role: "system", content: systemPrompt });
  }
  messages.push({ role: "user", content: effectiveUserContent });

  let lastError = null;

  // 1. If user supplied their own custom API key (from frontend modal), try it first with highest priority
  if (customApiKey) {
    let customBaseURL = OPENROUTER_BASE_URL;
    let customDefaultModel = gptModel;
    let customProvider = "openrouter-custom";

    if (customApiKey.startsWith("gsk_")) {
      customBaseURL = GROQ_BASE_URL;
      customProvider = "groq-custom";
      if (!gptModel || gptModel.includes("nemotron") || gptModel.includes("nex-agi") || gptModel.includes("llama")) {
        customDefaultModel = "llama-3.3-70b-versatile";
      }
    } else if (customApiKey.startsWith("AIza") || customApiKey.startsWith("AQ.")) {
      customBaseURL = GEMINI_BASE_URL;
      customProvider = "gemini-custom";
      if (!gptModel || gptModel.includes("nemotron") || gptModel.includes("nex-agi") || gptModel.includes("oss") || gptModel.includes("llama")) {
        customDefaultModel = "gemini-2.5-flash";
      }
    }

    const userClient = new OpenAI({
      baseURL: customBaseURL,
      apiKey: customApiKey,
    });
    try {
      const text = await callOpenAICompatible(userClient, customDefaultModel, messages, maxOutputTokens, {
        requireJson,
        temperature,
        stop,
      });
      return { provider: customProvider, model: customDefaultModel, text };
    } catch (err) {
      console.warn(`[AI CustomKey] User API key failed (${err?.message || err}). Falling back to system multi-key pool.`);
    }
  }

  const wantsGemini = gptModel.startsWith("gemini");
  const groqKeys = keyManager.getAvailableKeys("groq");
  const geminiKeys = keyManager.getAvailableKeys("gemini");

  // Helper function to try Groq
  const tryGroq = async () => {
    if (groqKeys.length === 0) return null;
    for (const groqModel of GROQ_FREE_MODELS) {
      for (const groqKeyEntry of groqKeys) {
        const groqClient = new OpenAI({
          baseURL: groqKeyEntry.baseURL,
          apiKey: groqKeyEntry.key,
        });

        try {
          const text = await callOpenAICompatible(groqClient, groqModel, messages, maxOutputTokens, {
            requireJson,
            temperature,
            stop,
          });

          keyManager.reportSuccess(groqKeyEntry.key);
          return {
            provider: "groq",
            model: groqModel,
            text,
            keyUsed: groqKeyEntry.masked,
          };
        } catch (err) {
          lastError = err;
          console.error(`[AI Groq Error] Model ${groqModel}:`, err?.message || err, err?.status || err?.statusCode);
          const statusCode = toNumber(err?.status || err?.statusCode || 500);
          keyManager.reportFailure(groqKeyEntry.key, statusCode);
        }
      }
    }
    return null;
  };

  // Helper function to try Gemini
  const tryGemini = async () => {
    if (geminiKeys.length === 0) return null;
    const modelsToTry = gptModel.startsWith("gemini")
      ? [gptModel, ...GEMINI_FREE_MODELS.filter((m) => m !== gptModel)]
      : GEMINI_FREE_MODELS;

    for (const geminiModel of modelsToTry) {
      for (const geminiKeyEntry of geminiKeys) {
        const geminiClient = new OpenAI({
          baseURL: geminiKeyEntry.baseURL,
          apiKey: geminiKeyEntry.key,
        });

        try {
          const text = await callOpenAICompatible(geminiClient, geminiModel, messages, maxOutputTokens, {
            requireJson,
            temperature,
            stop,
          });

          keyManager.reportSuccess(geminiKeyEntry.key);
          return {
            provider: "gemini",
            model: geminiModel,
            text,
            keyUsed: geminiKeyEntry.masked,
          };
        } catch (err) {
          lastError = err;
          console.error(`[AI Gemini Error] Model ${geminiModel}:`, err?.message || err, err?.status || err?.statusCode);
          const statusCode = toNumber(err?.status || err?.statusCode || 500);
          keyManager.reportFailure(geminiKeyEntry.key, statusCode);
        }
      }
    }
    return null;
  };

  // 2. Execute with Primary & Backup Failover
  if (wantsGemini || AI_PROVIDER === "gemini") {
    // Gemini primary, Groq backup
    const geminiResult = await tryGemini();
    if (geminiResult) return geminiResult;
    console.info("[AI Failover] Gemini failed or exhausted, failing over to Groq...");
    const groqResult = await tryGroq();
    if (groqResult) return groqResult;
  } else {
    // Groq primary (14,400 req/day), Gemini backup (1,500 req/day)
    const groqResult = await tryGroq();
    if (groqResult) return groqResult;
    console.info("[AI Failover] Groq quota/keys exhausted, seamlessly failing over to Google Gemini backup...");
    const geminiResult = await tryGemini();
    if (geminiResult) return geminiResult;
  }

  // 4. Multi-Model candidate chain on OpenRouter
  const modelCandidates = [
    ...new Set([gptModel, DEFAULT_GPT_MODEL, ...OPENROUTER_FALLBACK_MODELS]),
  ].filter((m) => m && m !== "nex-agi/nex-n2.5-pro:free").slice(0, 3);

  const availableOpenRouterKeys = keyManager.getAvailableKeys("openrouter");

  // Iterate through OpenRouter model candidates
  for (const modelCandidate of modelCandidates) {
    const keysToTry = availableOpenRouterKeys;

    for (const keyEntry of keysToTry) {
      const client = new OpenAI({
        baseURL: keyEntry.baseURL,
        apiKey: keyEntry.key,
      });

      try {
        const text = await callOpenAICompatible(client, modelCandidate, messages, maxOutputTokens, {
          requireJson,
          temperature,
          stop,
        });

        // SUCCESS! Mark key healthy and return
        keyManager.reportSuccess(keyEntry.key);
        return {
          provider: "openrouter",
          model: modelCandidate,
          text,
          keyUsed: keyEntry.masked,
        };
      } catch (err) {
        lastError = err;
        const statusCode = toNumber(err?.status || err?.statusCode || 500);
        const retryAfter = toNumber(err?.headers?.["retry-after"] || 0);

        // Report failure to put this key in cooldown and switch to NEXT key
        keyManager.reportFailure(keyEntry.key, statusCode, retryAfter);
        console.info(
          `[AI Auto-Failover] Key ${keyEntry.masked} encountered status ${statusCode} on model ${modelCandidate}. Trying next key...`
        );
      }
    }
  }

  // 5. Fallback to Groq if not tried yet
  if (groqKeys.length > 0 && AI_PROVIDER !== "groq") {
    console.info("[AI Provider Failover] OpenRouter keys exhausted. Switching to Groq free API pool...");
    for (const groqModel of GROQ_FREE_MODELS) {
      for (const groqKeyEntry of groqKeys) {
        const groqClient = new OpenAI({
          baseURL: groqKeyEntry.baseURL,
          apiKey: groqKeyEntry.key,
        });

        try {
          const text = await callOpenAICompatible(groqClient, groqModel, messages, maxOutputTokens, {
            requireJson,
            temperature,
            stop,
          });

          keyManager.reportSuccess(groqKeyEntry.key);
          return {
            provider: "groq",
            model: groqModel,
            text,
            keyUsed: groqKeyEntry.masked,
          };
        } catch (err) {
          lastError = err;
          const statusCode = toNumber(err?.status || err?.statusCode || 500);
          keyManager.reportFailure(groqKeyEntry.key, statusCode);
        }
      }
    }
  }

  // 6. Fallback to Gemini if not tried yet
  if (geminiKeys.length > 0 && AI_PROVIDER !== "gemini") {
    console.info("[AI Provider Failover] OpenRouter/Groq keys exhausted. Switching to Google Gemini free API pool...");
    for (const geminiModel of GEMINI_FREE_MODELS) {
      for (const geminiKeyEntry of geminiKeys) {
        const geminiClient = new OpenAI({
          baseURL: geminiKeyEntry.baseURL,
          apiKey: geminiKeyEntry.key,
        });

        try {
          const text = await callOpenAICompatible(geminiClient, geminiModel, messages, maxOutputTokens, {
            requireJson,
            temperature,
            stop,
          });

          keyManager.reportSuccess(geminiKeyEntry.key);
          return {
            provider: "gemini",
            model: geminiModel,
            text,
            keyUsed: geminiKeyEntry.masked,
          };
        } catch (err) {
          lastError = err;
          const statusCode = toNumber(err?.status || err?.statusCode || 500);
          keyManager.reportFailure(geminiKeyEntry.key, statusCode);
        }
      }
    }
  }

  throw normalizeOpenRouterError(lastError || createServiceError("All API keys and fallback models exhausted", 503), AI_PROVIDER);
}

