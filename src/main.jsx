import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { ConfigProvider, App as AntdApp, theme as antdTheme } from "antd";
import "antd/dist/reset.css";

import "./i18n/config";
import App from "./App";
import "./index.css";
import { ThemeProvider, bootstrapTheme, useTheme } from "./contexts/ThemeContext";

bootstrapTheme();

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
    <ThemeProvider>
      <ThemeConfigProvider>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </ThemeConfigProvider>
    </ThemeProvider>
  </React.StrictMode>
);
