import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";

export default function MediaLibraryRedirectPage() {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="flex justify-center items-center h-screen">Loading...</div>;
  }

  if (user?.role === "ADMIN") {
    return <Navigate to="/admin/media" replace />;
  }

  return <Navigate to="/teacher/media" replace />;
}
