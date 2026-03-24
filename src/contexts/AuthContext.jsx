import React, { createContext, useContext, useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import useUserStore from "../store/useUserStore";
import { getUserById } from "../api/user";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const { i18n } = useTranslation();
  const {
    user,
    accessToken,
    setUser,
    setAccessToken,
    clearUser,
    initializeAuth,
    setLoading,
  } = useUserStore();
  const [loading, setAuthLoading] = useState(true);

  // Kiểm tra trạng thái đăng nhập lúc app khởi tạo
  useEffect(() => {
    const initAuth = async () => {
      try {
        const storedToken = localStorage.getItem("accessToken");
        const storedUser = localStorage.getItem("user");

        if (storedToken && storedUser) {
          const userData = JSON.parse(storedUser);
          setIsLoggedIn(true);
          initializeAuth(userData, storedToken);
          setAuthLoading(false);
        } else {
          setLoading(false);
          setAuthLoading(false);
        }
      } catch (err) {
        console.error("Failed to initialize auth:", err);
        setAuthLoading(false);
      }
    };

    initAuth();
  }, []);

  // Hàm logout
  const logout = () => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("user");
    setIsLoggedIn(false);
    clearUser();
    // Reset language to Vietnamese
    i18n.changeLanguage('vi');
    // Reset dark mode to light mode (default)
    localStorage.setItem("theme", "light");
    document.documentElement.classList.remove("dark");
  };

  // Hàm login - fetch full user data after login
  const loginUser = async (accessToken, loginData) => {
    try {
      localStorage.setItem("accessToken", accessToken);
      setAccessToken(accessToken);
      setIsLoggedIn(true);

      // Fetch full user data including imageUrl
      if (loginData?.id) {
        const res = await getUserById(loginData.id);
        const fullUserData = res.data || res;

        const processedUser = {
          ...fullUserData,
          id: fullUserData.id || loginData.id,
          username: fullUserData.userName || loginData.username,
          role: fullUserData.roleName || loginData.role,
        };

        localStorage.setItem("user", JSON.stringify(processedUser));
        setUser(processedUser);
      } else {
        // Fallback if id is not available
        localStorage.setItem("user", JSON.stringify(loginData));
        setUser(loginData);
      }
    } catch (err) {
      console.error("Failed to fetch user data after login:", err);
      // Still set the basic user data from login response
      localStorage.setItem("user", JSON.stringify(loginData));
      setUser(loginData);
    }
  };

  return (
    <AuthContext.Provider
      value={{ isLoggedIn, setIsLoggedIn, user, logout, loginUser, loading }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth phải được sử dụng trong AuthProvider");
  }
  return context;
}
