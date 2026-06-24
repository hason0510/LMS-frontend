import React, { useState, useEffect } from "react";
import { Select } from "antd";
import { useTranslation } from "react-i18next";
import { useTheme } from "../../../contexts/ThemeContext";
import {
  isNotifSoundMuted,
  setNotifSoundMuted,
  onNotifSoundMuteChange,
} from "../../../utils/notificationSound";

export default function AccountSettings() {
  const { t, i18n } = useTranslation();
  const { isDarkMode, toggleTheme } = useTheme();

  const [language, setLanguage] = useState(() => {
    if (typeof window !== "undefined") {
      const savedLang = localStorage.getItem("i18nextLng") || "vi";
      // Normalize to just language code (vi or en, not vi-VN)
      return savedLang.split("-")[0];
    }
    return "vi";
  });

  const [isEditing, setIsEditing] = useState(false);

  // Âm thanh thông báo (bật mặc định). Lưu localStorage, không đụng DB.
  const [soundOn, setSoundOn] = useState(() => !isNotifSoundMuted());

  // Đồng bộ với icon loa trên header nếu được bật/tắt ở nơi khác.
  useEffect(() => onNotifSoundMuteChange((muted) => setSoundOn(!muted)), []);

  const handleToggleSound = () => {
    const next = !soundOn;
    setSoundOn(next);
    setNotifSoundMuted(!next);
  };

  const handleLanguageChange = (newLang) => {
    setLanguage(newLang);
    i18n.changeLanguage(newLang);
    localStorage.setItem("i18nextLng", newLang);
  };

  return (
    <div className="account-settings">
      <div className="flex flex-wrap justify-between items-start gap-4 pb-6 border-b border-black/10 dark:border-white/10">
        <div className="flex min-w-72 flex-col !gap-1">
          <p className="!mb-0 text-3xl font-bold tracking-tight text-[#111418] dark:text-white">
            {t("settings.caiDatHeThong")}
          </p>
          <p className="!mt-0 mb-1 text-[#617589] dark:text-gray-400 text-base font-normal leading-normal">
            {t("settings.quanLyCaiDat")}
          </p>
        </div>
      </div>
      <div className="py-6 flex flex-col gap-6">
        {/* Language Setting */}
        <div className="flex gap-4 items-center">
          <h3 className="text-lg font-bold text-[#111418] dark:text-white">
            {t("settings.ngonNgu")}:
          </h3>
          <div className="flex flex-col min-w-40 max-w-md">
            <Select
              value={language}
              onChange={handleLanguageChange}
              className="w-full h-11"
              showSearch
              optionFilterProp="label"
              options={[
                { value: "vi", label: t("settings.tiengViet") },
                { value: "en", label: t("settings.english") },
              ]}
            />
          </div>
        </div>

        {/* Dark Mode Setting */}
        <div className="flex items-center gap-4">
          <h3 className="text-lg font-bold text-[#111418] dark:text-white">
            {t("settings.giaoDien")}:
          </h3>

          <div className="flex items-center justify-between gap-4 max-w-md p-4 border border-black/10 dark:border-white/10 rounded-lg">
            <div className="flex flex-col">
              <span className="text-base font-medium text-[#111418] dark:text-white">
                {t("settings.cheDo Toi")}
              </span>
              <span className="text-sm text-[#617589] dark:text-gray-400">
                {t("settings.dieuChinhGiaoDien")}
              </span>
            </div>

            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={isDarkMode}
                onChange={toggleTheme}
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/30 dark:peer-focus:ring-primary/80 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary"></div>
            </label>
          </div>
        </div>

        {/* Notification Sound Setting */}
        <div className="flex items-center gap-4">
          <h3 className="text-lg font-bold text-[#111418] dark:text-white">
            {t("settings.amThanhThongBao")}:
          </h3>

          <div className="flex items-center justify-between gap-4 max-w-md p-4 border border-black/10 dark:border-white/10 rounded-lg">
            <div className="flex flex-col">
              <span className="text-base font-medium text-[#111418] dark:text-white">
                {t("settings.phatAmThanh")}
              </span>
              <span className="text-sm text-[#617589] dark:text-gray-400">
                {t("settings.amThanhThongBaoMoTa")}
              </span>
            </div>

            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={soundOn}
                onChange={handleToggleSound}
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/30 dark:peer-focus:ring-primary/80 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary"></div>
            </label>
          </div>
        </div>

      </div>
      {isEditing && (
        <div className="flex justify-end gap-4 pt-6 border-t border-black/10 dark:border-white/10">
          <button
            onClick={() => setIsEditing(false)}
            className="flex items-center justify-center h-10 px-6 rounded-lg bg-background-light dark:bg-white/10 text-black dark:text-white text-sm font-bold leading-normal tracking-[-0.015em] hover:bg-black/5 dark:hover:bg-white/20 transition-colors"
          >
            Hủy
          </button>
          <button
            onClick={() => setIsEditing(false)}
            className="flex items-center justify-center h-10 px-6 rounded-lg bg-primary text-white text-sm font-bold leading-normal tracking-[-0.015em] hover:bg-primary/90 transition-colors"
          >
            Lưu thay đổi
          </button>
        </div>
      )}
    </div>
  );
}
