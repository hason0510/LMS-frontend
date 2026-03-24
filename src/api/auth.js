// API xác thực cho frontend

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8080';

const API_URL = `${BACKEND_URL}/api/v1/lms/auth`;

export async function login(username, password) {
  const response = await fetch(`${API_URL}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include', // nhận cookie refresh_token
    body: JSON.stringify({ username, password })
  });
  if (!response.ok) throw new Error('Sai tài khoản hoặc mật khẩu');
  return await response.json(); // trả về accessToken, user info
}

export async function register(userData) {
  const response = await fetch(`${API_URL}/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(userData)
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || 'Đăng ký thất bại');
  }
  return await response.json();
}

// Xác thực OTP
export async function verifyOtp(otpCode, userId) {
  const response = await fetch(`${API_URL}/verify-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ code: otpCode, userId: userId })
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || 'Xác thực OTP thất bại');
  }
  return await response.json();
}

// Đăng nhập bằng Google
export async function googleLogin(credentialResponse) {
  const response = await fetch(`${API_URL}/google`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include', // nhận cookie refresh_token
    body: JSON.stringify({ token: credentialResponse.credential })
  });
  if (!response.ok) throw new Error('Đăng nhập bằng Google thất bại');
  return await response.json(); // trả về accessToken, user info
}
