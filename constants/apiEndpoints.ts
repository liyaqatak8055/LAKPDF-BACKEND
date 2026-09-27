/**
 * Centralized API Endpoints for LAKPDF
 * Matches the Express server route architecture in /server/index.js.
 */

export const API_ENDPOINTS = {
  // Authentication
  AUTH: {
    REGISTER: '/api/auth/register',
    LOGIN: '/api/auth/login',
    GOOGLE: '/api/auth/google',
    REFRESH: '/api/auth/refresh',
    ME: '/api/auth/me',
    LOGOUT: '/api/auth/logout',
    REQUEST_PASSWORD_RESET: '/api/auth/request-password-reset',
    RESET_PASSWORD: '/api/auth/reset-password',
    DELETE_ACCOUNT: '/api/auth/delete-account',
  },

  // AI & Processing
  AI: {
    ASK: '/api/ai/ask',
    VISION_OCR: '/api/ai/vision-ocr',
    OPENROUTER: '/api/ai/openrouter',
    USAGE_LIMIT: '/api/usage/summary-limit',
  },

  // Interview AI Suite
  INTERVIEW: {
    ANALYZE_RESUME: '/api/interview/analyze-resume',
    GENERATE_QUESTIONS: '/api/interview/generate-questions',
    EVALUATE_ANSWER: '/api/interview/evaluate-answer',
    MOCK: '/api/interview/mock',
  },

  // MCQ Generator
  MCQ: {
    GENERATE: '/api/mcq/generate',
    VALIDATE: '/api/mcq/validate',
  },

  // Metrics & Health
  METRICS: {
    EVENT: '/api/metrics/event',
    WEB_VITAL: '/api/metrics/web-vital',
    FILES_PROCESSED: '/api/metrics/files-processed-today',
    AI_LATENCY: '/api/metrics/ai-latency',
    CORE_WEB_VITALS: '/api/metrics/core-web-vitals',
  },
  HEALTH: '/api/health',
  CONFIG_PUBLIC: '/api/config/public',

  // Admin API
  ADMIN: {
    LOGIN: '/api/admin/login',
    LOGOUT: '/api/admin/logout',
    ME: '/api/admin/me',
    USERS: '/api/admin/users',
    USERS_CREATE: '/api/admin/users/create',
    USER_DELETE: (id: string | number) => `/api/admin/users/${id}`,
    USER_RESET_PASSWORD: (id: string | number) => `/api/admin/users/${id}/reset-password`,
    USERS_EXPORT: '/api/admin/users/export',
    TOOLS: '/api/admin/tools',
    CONFIG: '/api/admin/config',
    CACHE_CLEAR: '/api/admin/cache/clear',
    DATABASE: '/api/admin/database',
    LOGS: '/api/admin/logs',
    ANALYTICS: '/api/admin/analytics',
    SETTINGS: '/api/admin/settings',
    SETTINGS_PASSWORD: '/api/admin/settings/password',
  },
} as const;
