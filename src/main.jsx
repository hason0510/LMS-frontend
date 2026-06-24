import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { ConfigProvider, App as AntdApp, theme as antdTheme } from "antd";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "antd/dist/reset.css";

import "./i18n/config";
import App from "./App";
import "./index.css";
import { ThemeProvider, bootstrapTheme, useTheme } from "./contexts/ThemeContext";

bootstrapTheme();

// staleTime khớp TTL cache report ở backend (60s) → bớt request thừa;
// refetchOnWindowFocus thay cho cơ chế poll/foreground-refresh tự viết.
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      refetchOnWindowFocus: true,
      retry: 1,
    },
  },
});

function ThemeConfigProvider({ children }) {
  const { isDarkMode } = useTheme();

  return (
    <ConfigProvider
      theme={{
        algorithm: isDarkMode ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
        token: {
          colorPrimary: "#137fec",
          colorBgBase: isDarkMode ? "#0b1116" : "#ffffff",
          colorTextBase: isDarkMode ? "#f3f4f6" : "#111418",
          fontFamily: "Inter, ui-sans-serif, system-ui",
        },
      }}
    >
      <AntdApp>{children}</AntdApp>
    </ConfigProvider>
  );
}

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <ThemeConfigProvider>
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </ThemeConfigProvider>
      </ThemeProvider>
    </QueryClientProvider>
  </React.StrictMode>
);
