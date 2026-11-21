import { api, ApiError } from "@/lib/api";

// Calls to /api/admin/*. The bearer token is the one /admin sign-in issues (the
// same one the subscriber page uses). The server checks it on every request; a
// 401 here means it expired, so the session is dropped and the gate shows the
// sign-in form again.

export const ADMIN_TOKEN_KEY = "apsoluts_admin_token";
export const ADMIN_UNAUTHORIZED = "apsoluts-admin-unauthorized";

const auth = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem(ADMIN_TOKEN_KEY) ?? ""}` } });

async function guard<T>(call: () => Promise<T>): Promise<T> {
  try {
    return await call();
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) {
      localStorage.removeItem(ADMIN_TOKEN_KEY);
      window.dispatchEvent(new Event(ADMIN_UNAUTHORIZED));
    }
    throw err;
  }
}

export const adminApi = {
  get: <T>(path: string) => guard(() => api.get<T>(path, auth())),
  post: <T>(path: string, body: unknown = {}) => guard(() => api.post<T>(path, body, auth())),
  patch: <T>(path: string, body: unknown = {}) => guard(() => api.patch<T>(path, body, auth())),
  delete: <T>(path: string) => guard(() => api.delete<T>(path, auth())),
};
