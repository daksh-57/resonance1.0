const IS_DEV = import.meta.env.DEV;
const API_BASE = IS_DEV ? "http://localhost:4000/api" : "/api";

async function request(path: string, opts: RequestInit = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...opts,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(opts.headers || {}),
    },
  });
  if (res.status === 204) return null;
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return { error: text || res.statusText };
  }
}

export const api = {
  auth: {
    register: (body: Record<string, unknown>) => request("/auth/register", { method: "POST", body: JSON.stringify(body) }),
    login: (body: Record<string, unknown>) => request("/auth/login", { method: "POST", body: JSON.stringify(body) }),
    logout: () => request("/auth/logout", { method: "POST" }),
    me: () => request("/auth/me"),
    forgotPassword: (body: { email: string }) => request("/auth/forgot-password", { method: "POST", body: JSON.stringify(body) }),
    resetPassword: (body: { token: string; password: string }) => request("/auth/reset-password", { method: "POST", body: JSON.stringify(body) }),
  },
  dashboard: () => request("/dashboard"),
  sources: {
    list: () => request("/sources"),
    create: (body: Record<string, unknown>) => request("/sources", { method: "POST", body: JSON.stringify(body) }),
    update: (id: string, body: Record<string, unknown>) => request(`/sources/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  },
  rules: {
    get: () => request("/rules"),
    put: (body: Record<string, unknown>) => request("/rules", { method: "PUT", body: JSON.stringify(body) }),
  },
  datasets: {
    list: () => request("/datasets"),
    get: (id: string) => request(`/datasets/${id}`),
    setMapping: (id: string, mapping: Record<string, string>) => request(`/datasets/${id}/mapping`, { method: "POST", body: JSON.stringify({ mapping }) }),
    import: (id: string) => request(`/datasets/${id}/import`, { method: "POST" }),
    remove: (id: string) => request(`/datasets/${id}`, { method: "DELETE" }),
  },
  upload: {
    start: (form: FormData) => {
      return fetch(`${API_BASE}/upload`, {
        method: "POST",
        credentials: "include",
        body: form,
      }).then(async (res) => {
        const text = await res.text();
        if (!text) return { status: res.status, data: null };
        try {
          return { status: res.status, data: JSON.parse(text) };
        } catch {
          return { status: res.status, data: { error: text || res.statusText } };
        }
      });
    },
  },
  jobs: {
    get: (id: string) => request(`/jobs/${id}`),
  },
  entities: {
    list: (params?: Record<string, string | number>) => {
      const qs = new URLSearchParams();
      if (params) for (const [k, v] of Object.entries(params)) qs.set(k, String(v));
      return request(`/entities?${qs.toString()}`);
    },
    get: (id: string) => request(`/entities/${id}`),
    confirmMatch: (id: string) => request(`/entities/${id}/confirm-match`, { method: "POST" }),
    rejectMatch: (id: string) => request(`/entities/${id}/reject-match`, { method: "POST" }),
    split: (id: string, body: { sourceRecordIds: string[] }) => request(`/entities/${id}/split`, { method: "POST", body: JSON.stringify(body) }),
  },
  duplicates: {
    list: () => request("/duplicates"),
  },
  conflicts: {
    list: (params?: Record<string, string | number>) => {
      const qs = new URLSearchParams();
      if (params) for (const [k, v] of Object.entries(params)) qs.set(k, String(v));
      return request(`/conflicts?${qs.toString()}`);
    },
    get: (id: string) => request(`/conflicts/${id}`),
    resolve: (id: string, body: { action: string; value?: string; reason?: string }) => request(`/conflicts/${id}/resolve`, { method: "POST", body: JSON.stringify(body) }),
  },
  review: {
    list: () => request("/review"),
  },
  canonical: {
    list: () => request("/canonical-records"),
    get: (id: string) => request(`/canonical-records/${id}`),
  },
  audit: {
    list: (params?: Record<string, string | number>) => {
      const qs = new URLSearchParams();
      if (params) for (const [k, v] of Object.entries(params)) qs.set(k, String(v));
      return request(`/audit?${qs.toString()}`);
    },
  },
  search: (q: string) => request(`/search?q=${encodeURIComponent(q)}`),
  notifications: {
    list: () => request("/notifications"),
    read: (id: string) => request(`/notifications/${id}/read`, { method: "POST" }),
  },
  settings: {
    get: () => request("/settings"),
    patch: (body: Record<string, unknown>) => request("/settings", { method: "PATCH", body: JSON.stringify(body) }),
  },
  apiKeys: {
    list: () => request("/api-keys"),
    create: (name: string) => request("/api-keys", { method: "POST", body: JSON.stringify({ name }) }),
    revoke: (id: string) => request(`/api-keys/${id}/revoke`, { method: "POST" }),
    rotate: (id: string) => request(`/api-keys/${id}/rotate`, { method: "POST" }),
  },
  schedules: {
    list: () => request("/schedules"),
    create: (body: Record<string, unknown>) => request("/schedules", { method: "POST", body: JSON.stringify(body) }),
  },
  export: (kind: string) => request(`/export/${kind}.csv`),
  docs: () => request("/docs"),
  ml: () => request("/ml"),
};
