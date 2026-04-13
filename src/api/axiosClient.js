import axios from "axios";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8081';

const axiosClient = axios.create({
  baseURL: `${BACKEND_URL}/api/v1/lms`, // Removed trailing slash
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

    // Skip interceptor if:
    // 1. It's an authentication request (login/refresh/register/verify-otp)
    // 2. Error is not 401
    const isAuthRequest = originalRequest.url.includes('/auth/login') || 
                         originalRequest.url.includes('/auth/refresh') ||
                         originalRequest.url.includes('/auth/register') ||
                         originalRequest.url.includes('/auth/verify-otp');

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
        axiosClient.put('/auth/refresh')
          .then(({ data }) => {
            // Backend returns ApiResponse<LoginResponse>, so data is { code, message, data: { accessToken, ... } }
            const payload = data.data; 
            const newAccessToken = payload.accessToken;
            
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
