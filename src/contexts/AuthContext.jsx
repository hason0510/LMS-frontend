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

const normalizeFullUser = (userData, fallbackUser = null) => {
  if (!userData && !fallbackUser) return null;

  return {
    ...fallbackUser,
    ...userData,
    id: userData?.id || fallbackUser?.id,
    userName: userData?.userName || fallbackUser?.userName || fallbackUser?.username,
    username: userData?.userName || userData?.username || fallbackUser?.username || fallbackUser?.userName,
    role: normalizeRole(userData?.roleName || userData?.role || fallbackUser?.role),
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
        const fullUserData = await getUserById(loginData.id);
        const processedUser = normalizeFullUser(fullUserData, basicUser);

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
