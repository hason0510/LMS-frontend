import { useAuth } from '../contexts/AuthContext';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export function useTokenExpiration() {
  const { logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Bắt lỗi 401/403 từ fetch (token hết hạn)
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      const response = await originalFetch(...args);
      
      if (response.status === 401 || response.status === 403) {
        // Token hết hạn
        logout();
        navigate('/login');
      }
      
      return response;
    };

    return () => {
      window.fetch = originalFetch;
    };
  }, [logout, navigate]);
}
