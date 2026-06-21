import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { refreshAccessToken } from '../api/axiosClient';
import { useAuth } from '../contexts/AuthContext';
import useUserStore from '../store/useUserStore';

const REFRESH_LEEWAY_MS = 60 * 1000;

const decodeJwtPayload = (token) => {
  try {
    const parts = String(token).split('.');
    if (parts.length < 2) return null;
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const pad = '='.repeat((4 - (base64.length % 4)) % 4);
    return JSON.parse(atob(base64 + pad));
  } catch {
    return null;
  }
};

const getTokenExpiryMs = (token) => {
  const payload = decodeJwtPayload(token);
  return payload?.exp ? payload.exp * 1000 : null;
};

export function useTokenExpiration() {
  const { isLoggedIn, logout } = useAuth();
  const navigate = useNavigate();
  const accessToken = useUserStore((state) => state.accessToken);

  useEffect(() => {
    if (!isLoggedIn || !accessToken) {
      return;
    }

    const expiresAtMs = getTokenExpiryMs(accessToken);
    if (!expiresAtMs) {
      return;
    }

    const delayMs = Math.max(0, expiresAtMs - Date.now() - REFRESH_LEEWAY_MS);
    let cancelled = false;

    const refreshTokenBeforeExpiry = async () => {
      try {
        const payload = await refreshAccessToken();
        const newAccessToken = payload?.accessToken;
        if (!newAccessToken) {
          throw new Error("Missing access token in refresh response");
        }
      } catch (error) {
        if (cancelled) return;
        // Chỉ ép logout khi server từ chối refresh một cách rõ ràng
        // (refresh token hết hạn/không hợp lệ -> 401, hoặc tài khoản bị khóa -> 403).
        // Với lỗi mạng tạm thời (không có response), giữ nguyên phiên và để
        // interceptor 401 (reactive) tự refresh lại ở request thật kế tiếp.
        if (!error?.response) return;
        await logout({ remote: false });
        navigate('/login', { replace: true });
      }
    };

    const timeoutId = window.setTimeout(() => {
      void refreshTokenBeforeExpiry();
    }, delayMs);

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [isLoggedIn, accessToken, logout, navigate]);
}
