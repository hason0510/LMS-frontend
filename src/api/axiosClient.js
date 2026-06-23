import axios from "axios";
import useUserStore from "../store/useUserStore";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8081';
const API_BASE = `${BACKEND_URL}/api/v1/lms`;
const ACCOUNT_LOCKED_ERROR = "ACCOUNT_LOCKED";

const AUTH_HEADER_SKIP_PATHS = [
  '/auth/login',
  '/auth/register',
  '/auth/verify-otp',
  '/auth/google',
  '/auth/refresh',
  '/auth/resend-register-otp',
  '/auth/resend-reset-password-otp',
  '/auth/reset-password/request',
  '/auth/reset-password/confirm',
];

const isAuthHeaderSkipRequest = (url = '') =>
  AUTH_HEADER_SKIP_PATHS.some((path) => String(url).includes(path));

const axiosClient = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

export const clearAuthHeader = () => {
  delete axiosClient.defaults.headers.common.Authorization;
};

const clearLocalAuthState = () => {
  clearAuthHeader();
  useUserStore.getState().clearUser();
};

let refreshPromise = null;

const getErrorMessage = (error) => error?.response?.data?.message || error?.message;

const performRefresh = () =>
  axios.put(`${API_BASE}/auth/refresh`, null, { withCredentials: true })
    .then(({ data }) => {
      const payload = data?.data ?? data;
      const newAccessToken = payload?.accessToken;

      if (!newAccessToken) {
        throw new Error("Missing access token in refresh response");
      }

      useUserStore.getState().setAccessToken(newAccessToken);
      return payload;
    });

export const refreshAccessToken = () => {
  // Single-flight trong cùng một tab: các caller đồng thời share chung 1 request.
  if (refreshPromise) {
    return refreshPromise;
  }

  // Web Locks serialize việc refresh giữa MỌI tab cùng origin, nên hai tab không
  // thể cùng rotate refresh cookie (dùng chung) một lúc -> tránh tab thua bị 401.
  // Backend atomic CAS là chốt chặn cuối. Browser cũ không hỗ trợ -> fallback về
  // single-flight trong tab ở trên.
  const run = 'locks' in navigator
    ? () => navigator.locks.request('lms_refresh_token', performRefresh)
    : performRefresh;

  refreshPromise = run().finally(() => {
    refreshPromise = null;
  });

  return refreshPromise;
};

// Request Interceptor
axiosClient.interceptors.request.use(
  (config) => {
    if (isAuthHeaderSkipRequest(config?.url)) {
      return config;
    }
    const token = useUserStore.getState().accessToken;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor
axiosClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (!originalRequest) {
      return Promise.reject(error);
    }
    const requestUrl = originalRequest?.url || '';
    const errorMessage = getErrorMessage(error);

    if (errorMessage === ACCOUNT_LOCKED_ERROR) {
      clearLocalAuthState();
      if (window.location.pathname !== '/login') {
        window.location.href = '/login?locked=1';
      }
      return Promise.reject(error);
    }

    // Skip interceptor if:
    // 1. It's an authentication request (login/refresh/register/verify-otp)
    // 2. Error is not 401
    const isAuthRequest = isAuthHeaderSkipRequest(requestUrl);

    if (error.response?.status === 401 && !isAuthRequest && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const payload = await refreshAccessToken();
        originalRequest.headers = originalRequest.headers || {};
        originalRequest.headers.Authorization = `Bearer ${payload.accessToken}`;
        return axiosClient(originalRequest);
      } catch (err) {
        // Lỗi mạng/timeout (không có response) — vd Render cold start — KHÔNG đăng xuất:
        // giữ phiên, để request thật kế tiếp tự refresh lại. Chỉ logout khi server
        // từ chối dứt khoát (401/403). Cùng nguyên tắc với useTokenExpiration.
        if (!err?.response) {
          return Promise.reject(err);
        }

        console.error("Session expired, redirecting to login...");
        clearLocalAuthState();

        // Only redirect if NOT on login page to avoid infinite loop
        if (window.location.pathname !== '/login') {
          const locked = getErrorMessage(err) === ACCOUNT_LOCKED_ERROR;
          window.location.href = locked ? '/login?locked=1' : '/login';
        }

        return Promise.reject(err);
      }
    }

    return Promise.reject(error);
  }
);

export default axiosClient;
