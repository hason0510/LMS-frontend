import React, { createContext, useContext } from "react";
import { useTranslation } from "react-i18next";
import useUserStore from "../store/useUserStore";
import { getUserById } from "../api/user";

const AuthContext = createContext();

const normalizeRole = (rawRole) => {
  const role = String(rawRole || "").toUpperCase().trim();
  if (role === "TEACHER" || role === "ADMIN" || role === "STUDENT") return role;
  return rawRole;
};

const normalizeBasicUser = (loginData) => {
  if (!loginData) return null;

  // Backend fields vary a bit across endpoints; keep it defensive.
  const role = normalizeRole(loginData.roleName || loginData.role);
  return {
    ...loginData,
    id: loginData.id,
    username: loginData.userName || loginData.username,
    role,
  };
};

export function AuthProvider({ children }) {
  const { i18n } = useTranslation();
  const {
    user,
    accessToken,
    loading: storeLoading,
    setUser,
    setAccessToken,
    clearUser,
  } = useUserStore();
  const isLoggedIn = Boolean(accessToken && user);
  const loading = storeLoading;

  // Hàm logout
  const logout = () => {
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
      setAccessToken(accessToken);

      // Set basic user immediately so routing/guards don't "flash" another role UI.
      const basicUser = normalizeBasicUser(loginData);
      if (basicUser) {
        setUser(basicUser);
      }

      // Fetch full user data including imageUrl
      if (basicUser?.id) {
        const res = await getUserById(loginData.id);
        const fullUserData = res.data;

        const processedUser = {
          ...fullUserData,
          id: fullUserData.id || basicUser.id,
          username: fullUserData.userName || basicUser.username,
          role: normalizeRole(fullUserData.roleName || fullUserData.role || basicUser.role),
        };

        setUser(processedUser);
        return processedUser;
      } else {
        // Fallback if id is not available
        if (!basicUser) {
          setUser(loginData);
          return loginData;
        }
        return basicUser;
      }
    } catch (err) {
      console.error("Failed to fetch user data after login:", err);
      // Still set the basic user data from login response
      const basicUser = normalizeBasicUser(loginData) || loginData;
      setUser(basicUser);
      return basicUser;
    }
  };

  return (
    <AuthContext.Provider
      value={{ isLoggedIn, user, logout, loginUser, loading }}
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
