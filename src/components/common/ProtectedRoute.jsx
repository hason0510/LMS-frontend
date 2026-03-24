import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";

export default function ProtectedRoute({ element, allowedRoles }) {
  const { isLoggedIn, user, loading } = useAuth();

  if (loading) {
    return <div className="flex justify-center items-center h-screen">Loading...</div>;
  }

  // Nếu chưa đăng nhập thì redirect về /login
  if (!isLoggedIn) {
    return <Navigate to="/login" replace />;
  }

  // Check role if allowedRoles is provided
  if (allowedRoles && user) {
    if (!allowedRoles.includes(user.role)) {
      // Nếu chưa login mà không có quyền, redirect về login
      // Nếu đã login nhưng không có quyền, redirect về dashboard của họ
      if (!isLoggedIn) {
        return <Navigate to="/login" replace />;
      }
      
      // Redirect user to their dashboard based on role
      const roleRedirects = {
        'STUDENT': '/home',
        'TEACHER': '/teacher/dashboard',
        'ADMIN': '/admin/dashboard'
      };
      const redirectPath = roleRedirects[user.role] || '/home';
      
      return <Navigate to={redirectPath} replace />;
    }
  }

  // Nếu đã đăng nhập thì hiển thị component
  return element;
}
