import { API_BASE_URL } from "../utils/apiBase";

export interface User {
  id: string;
  name: string;
  email: string;
  role?: "user" | "admin";
  status?: "active" | "disabled";
  avatar?: string;
  provider?: "email" | "google";
  joinedAt?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface AuthResponse {
  user: User;
}

const API_BASE = API_BASE_URL;
const SESSION_KEY = "lakpdf_session";
const AUTH_CHANGE_EVENT = "lakpdf-auth-changed";

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const readJson = <T>(key: string, fallback: T): T => {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    localStorage.removeItem(key);
    return fallback;
  }
};

const writeJson = (key: string, value: unknown) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // noop
  }
};

const emitAuthChange = () => {
  window.dispatchEvent(new CustomEvent(AUTH_CHANGE_EVENT));
};

const saveSessionUser = (user: User | null) => {
  if (user) {
    const previous = readJson<User | null>(SESSION_KEY, null);
    const mergedUser: User = {
      ...previous,
      ...user,
      avatar: String(user.avatar || previous?.avatar || "").trim(),
    };
    writeJson(SESSION_KEY, mergedUser);
  } else {
    localStorage.removeItem(SESSION_KEY);
  }
  emitAuthChange();
};

const parseApiError = async (response: Response) => {
  try {
    const data = await response.json();
    return String(data?.error || `Request failed (${response.status})`);
  } catch {
    return `Request failed (${response.status})`;
  }
};

const getCsrfToken = (): string => {
  try {
    const match = document.cookie.match(/(?:^|;\s*)lakpdf_csrf=([^;]+)/);
    return match ? decodeURIComponent(match[1]) : "";
  } catch {
    return "";
  }
};

const apiJson = async <T>(path: string, options: RequestInit = {}): Promise<T> => {
  const csrfToken = getCsrfToken();
  const response = await fetch(`${API_BASE}${path}`, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(csrfToken ? { "X-CSRF-Token": csrfToken } : {}),
      ...(options.headers || {}),
    },
    ...options,
  });

  if (!response.ok) {
    throw new Error(await parseApiError(response));
  }

  return (await response.json()) as T;
};

export const authService = {
  async register(name: string, email: string, password: string): Promise<User> {
    await delay(120);
    const result = await apiJson<AuthResponse>("/auth/register", {
      method: "POST",
      body: JSON.stringify({ name, email, password }),
    });
    saveSessionUser(result.user);
    return result.user;
  },

  async login(email: string, password: string): Promise<User> {
    await delay(100);
    const result = await apiJson<AuthResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    saveSessionUser(result.user);
    return result.user;
  },

  async loginWithGoogle(idToken: string): Promise<User> {
    const result = await apiJson<AuthResponse>("/auth/google", {
      method: "POST",
      body: JSON.stringify({ idToken }),
    });
    saveSessionUser(result.user);
    return result.user;
  },

  async refreshSession(): Promise<User | null> {
    try {
      const result = await apiJson<AuthResponse>("/auth/refresh", {
        method: "POST",
      });
      saveSessionUser(result.user);
      return result.user;
    } catch {
      saveSessionUser(null);
      return null;
    }
  },

  async requestPasswordReset(email: string): Promise<void> {
    await delay(100);
    await apiJson<{ ok: boolean; message?: string }>("/auth/request-password-reset", {
      method: "POST",
      body: JSON.stringify({ email }),
    });
  },

  async resetPassword(email: string, otp: string, newPassword: string): Promise<void> {
    await delay(100);
    await apiJson<{ ok: boolean }>("/auth/reset-password", {
      method: "POST",
      body: JSON.stringify({ email, otp, newPassword }),
    });
  },

  async fetchCurrentUser(options: { force?: boolean } = {}): Promise<User | null> {
    const sessionUser = authService.getCurrentUser();
    if (!options.force && !sessionUser) {
      return null;
    }

    try {
      const result = await apiJson<{ user: User }>("/auth/me");
      saveSessionUser(result.user);
      return result.user;
    } catch {
      if (!sessionUser && !options.force) {
        return null;
      }
      return authService.refreshSession();
    }
  },

  async logout() {
    try {
      await apiJson<{ ok: boolean }>("/auth/logout", { method: "POST" });
    } catch {
      // ignore network/logout errors
    }
    saveSessionUser(null);
  },

  async deleteAccount(confirmText: string) {
    await apiJson<{ ok: boolean }>("/auth/delete-account", {
      method: "POST",
      body: JSON.stringify({ confirmText }),
    });
    saveSessionUser(null);
  },

  getCurrentUser(): User | null {
    return readJson<User | null>(SESSION_KEY, null);
  },

  getToken(): string {
    return "";
  },

  getAuthChangeEventName(): string {
    return AUTH_CHANGE_EVENT;
  },
};

export interface AdminUsersResponse {
  users: User[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface AdminToolItem {
  id: string;
  name: string;
  route: string;
  category: string;
  status: string;
  usageCount: number;
}

export interface AdminAnalyticsResponse {
  date: string;
  stats: {
    totalUsers: number;
    adminUsers: number;
    activeSessions: number;
    newUsers24h: number;
    newUsers7d: number;
    newUsers30d: number;
  };
  metrics: {
    filesProcessedToday: number;
    aiRequestsToday: number;
  };
}

export interface SystemControlConfig {
  adsEnabled: boolean;
  maintenanceMode: boolean;
  maintenanceMessage: string;
  announcementBanner: {
    enabled: boolean;
    text: string;
    link: string;
    type: "info" | "warning" | "success";
  };
  aiProvider: string;
  maxUploadSizeMb: number;
  dailySummaryLimit: number;
}

export interface SystemLogEntry {
  id: string;
  timestamp: string;
  type: "info" | "warn" | "error" | "auth";
  message: string;
  ip?: string;
  by?: string;
  path?: string;
}

export interface DatabaseStatsResponse {
  connected: boolean;
  ping: string;
  latencyMs: number;
  dbName: string;
  collections: Array<{ name: string; count: number }>;
  totalCollections: number;
}

export interface AdminToolItem {
  id: string;
  name: string;
  route: string;
  category: string;
  status: "operational" | "maintenance" | "disabled";
  customNotice?: string;
  usageCount: number;
}

export interface AdminSettingsResponse {
  environment: string;
  isProduction: boolean;
  port: number;
  systemControls: SystemControlConfig;
  database: {
    configured: boolean;
    dbName: string;
    mode: string;
  };
  aiProvider: {
    selected: string;
    configured: boolean;
    defaultModel: string;
  };
  smtp: {
    configured: boolean;
    from: string;
  };
  security: {
    rateLimitWindowMs: number;
    askRateLimit: number;
    maxParallelPerIp: number;
  };
}

export const adminService = {
  async login(email: string, password: string): Promise<User> {
    await delay(100);
    const result = await apiJson<AuthResponse>("/admin/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    saveSessionUser(result.user);
    return result.user;
  },

  async logout(): Promise<void> {
    try {
      await apiJson<{ ok: boolean }>("/admin/logout", { method: "POST" });
    } catch {
      // ignore
    }
    saveSessionUser(null);
  },

  async getMe(): Promise<User> {
    const result = await apiJson<{ user: User }>("/admin/me");
    saveSessionUser(result.user);
    return result.user;
  },

  async getUsers(params: { page?: number; limit?: number; search?: string; role?: string } = {}): Promise<AdminUsersResponse> {
    const query = new URLSearchParams();
    if (params.page) query.set("page", String(params.page));
    if (params.limit) query.set("limit", String(params.limit));
    if (params.search) query.set("search", params.search);
    if (params.role) query.set("role", params.role);
    const qs = query.toString();
    return apiJson<AdminUsersResponse>(`/admin/users${qs ? `?${qs}` : ""}`);
  },

  async createUser(data: { name: string; email: string; password: string; role?: string; status?: string }): Promise<User> {
    const result = await apiJson<{ user: User }>("/admin/users/create", {
      method: "POST",
      body: JSON.stringify(data),
    });
    return result.user;
  },

  async updateUser(userId: string, data: { name?: string; email?: string; role?: string; status?: string }): Promise<User> {
    const result = await apiJson<{ user: User }>(`/admin/users/${userId}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
    return result.user;
  },

  async deleteUser(userId: string): Promise<void> {
    await apiJson<{ ok: boolean }>(`/admin/users/${userId}`, {
      method: "DELETE",
    });
  },

  async resetUserPassword(userId: string, newPassword: string): Promise<void> {
    await apiJson<{ ok: boolean; message: string }>(`/admin/users/${userId}/reset-password`, {
      method: "POST",
      body: JSON.stringify({ newPassword }),
    });
  },

  async exportUsers(): Promise<User[]> {
    const result = await apiJson<{ users: User[] }>("/admin/users/export");
    return result.users;
  },

  async updateUserRole(userId: string, role: "admin" | "user"): Promise<User> {
    const result = await apiJson<{ user: User }>(`/admin/users/${userId}/role`, {
      method: "PATCH",
      body: JSON.stringify({ role }),
    });
    return result.user;
  },

  async updateUserStatus(userId: string, status: "active" | "disabled"): Promise<User> {
    const result = await apiJson<{ user: User }>(`/admin/users/${userId}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
    return result.user;
  },

  async getTools(): Promise<{ tools: AdminToolItem[]; totalTools: number }> {
    return apiJson<{ tools: AdminToolItem[]; totalTools: number }>("/admin/tools");
  },

  async updateToolStatus(toolId: string, data: { status?: string; customNotice?: string }): Promise<void> {
    await apiJson<{ ok: boolean }>(`/admin/tools/${toolId}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  },

  async getConfig(): Promise<SystemControlConfig> {
    return apiJson<SystemControlConfig>("/admin/config");
  },

  async updateConfig(config: Partial<SystemControlConfig>): Promise<{ ok: boolean; config: SystemControlConfig }> {
    return apiJson<{ ok: boolean; config: SystemControlConfig }>("/admin/config", {
      method: "POST",
      body: JSON.stringify(config),
    });
  },

  async clearCache(): Promise<{ ok: boolean; message: string }> {
    return apiJson<{ ok: boolean; message: string }>("/admin/cache/clear", {
      method: "POST",
    });
  },

  async getDatabaseStats(): Promise<DatabaseStatsResponse> {
    return apiJson<DatabaseStatsResponse>("/admin/database");
  },

  async getLogs(): Promise<{ logs: SystemLogEntry[]; total: number }> {
    return apiJson<{ logs: SystemLogEntry[]; total: number }>("/admin/logs");
  },

  async getAnalytics(): Promise<AdminAnalyticsResponse> {
    return apiJson<AdminAnalyticsResponse>("/admin/analytics");
  },

  async getSettings(): Promise<AdminSettingsResponse> {
    return apiJson<AdminSettingsResponse>("/admin/settings");
  },

  getCurrentUser(): User | null {
    return authService.getCurrentUser();
  },

  async updatePassword(currentPassword: string, newPassword: string): Promise<void> {
    await apiJson<{ ok: boolean; message: string }>("/admin/settings/password", {
      method: "POST",
      body: JSON.stringify({ currentPassword, newPassword }),
    });
  },
};
