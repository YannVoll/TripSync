import axios from "axios";

const api = axios.create({
  baseURL: "/api",
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

const PUBLIC_AUTH_ROUTES = ["/auth/login", "/auth/register"];

api.interceptors.response.use(
  (res) => res,
  (err) => {
    const isAuthAttempt = PUBLIC_AUTH_ROUTES.some((route) => err.config?.url?.startsWith(route));
    if (err.response?.status === 401 && !isAuthAttempt) {
      localStorage.removeItem("token");
      if (window.location.pathname !== "/login") {
        const from = window.location.pathname + window.location.search;
        window.location.href = `/login?expired=1&from=${encodeURIComponent(from)}`;
      }
    }
    return Promise.reject(err);
  }
);

export function getErrorMessage(error: unknown, fallback: string) {
  if (axios.isAxiosError<{ error?: string }>(error)) {
    if (!error.response) return "Não foi possível conectar ao servidor. O backend está rodando?";
    if (error.response.status >= 500 && !error.response.data?.error) {
      return "Erro no servidor. Tente novamente em instantes.";
    }
    return error.response.data?.error ?? fallback;
  }
  return error instanceof Error ? error.message : fallback;
}

export default api;
