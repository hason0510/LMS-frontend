import axios from "axios";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8081';
const API_BASE = `${BACKEND_URL}/api/v1/lms`;

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

let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// Request Interceptor
axiosClient.interceptors.request.use(
  (config) => {
    if (isAuthHeaderSkipRequest(config?.url)) {
      return config;
    }
    const token = localStorage.getItem("accessToken");
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

    // Skip interceptor if:
    // 1. It's an authentication request (login/refresh/register/verify-otp)
    // 2. Error is not 401
    const isAuthRequest = isAuthHeaderSkipRequest(requestUrl);

    if (error.response?.status === 401 && !isAuthRequest && !originalRequest._retry) {
      
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return axiosClient(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      return new Promise((resolve, reject) => {
        axios.put(`${API_BASE}/auth/refresh`, null, { withCredentials: true })
          .then(({ data }) => {
            const payload = data?.data ?? data;
            const newAccessToken = payload.accessToken;
            if (!newAccessToken) {
              throw new Error("Missing access token in refresh response");
            }
            
            localStorage.setItem("accessToken", newAccessToken);
            
            const userStore = JSON.parse(localStorage.getItem('user-store') || '{}');
            if (userStore.state) {
              userStore.state.accessToken = newAccessToken;
              localStorage.setItem('user-store', JSON.stringify(userStore));
            }

            axiosClient.defaults.headers.common['Authorization'] = `Bearer ${newAccessToken}`;
            processQueue(null, newAccessToken);
            resolve(axiosClient(originalRequest));
          })
          .catch((err) => {
            processQueue(err, null);
            console.error("Session expired, redirecting to login...");
            
            // Only redirect if NOT on login page to avoid infinite loop
            if (window.location.pathname !== '/login') {
              localStorage.removeItem("accessToken");
              localStorage.removeItem("user");
              localStorage.removeItem("user-store");
              window.location.href = '/login';
            }
            
            reject(err);
          })
          .finally(() => {
            isRefreshing = false;
          });
      });
    }

    return Promise.reject(error);
  }
);

export default axiosClient;
