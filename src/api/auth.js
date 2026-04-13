import axiosClient from "./axiosClient";

export async function login(username, password) {
  const response = await axiosClient.post('/auth/login', { username, password });
  return response.data; // Trả về ApiResponse chứa data (LoginResponse)
}

export async function register(userData) {
  const response = await axiosClient.post('/auth/register', userData);
  return response.data;
}

// Xác thực OTP
export async function verifyOtp(otpCode, userId) {
  const response = await axiosClient.post('/auth/verify-otp', { code: otpCode, userId: userId });
  return response.data;
}

// Đăng nhập bằng Google
export async function googleLogin(credentialResponse) {
  const response = await axiosClient.post('/auth/google', { token: credentialResponse.credential });
  return response.data;
}

// Refresh token manually (if needed outside interceptor)
export async function refreshToken() {
  const response = await axiosClient.put('/auth/refresh');
  return response.data;
}
