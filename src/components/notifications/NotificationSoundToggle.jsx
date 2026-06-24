import { useEffect, useState } from "react";
import { SpeakerWaveIcon, SpeakerXMarkIcon } from "@heroicons/react/24/outline";
import { useTranslation } from "react-i18next";
import {
  isNotifSoundMuted,
  setNotifSoundMuted,
  onNotifSoundMuteChange,
} from "../../utils/notificationSound";

/** Nút bật/tắt nhanh âm thanh thông báo, đặt cạnh chuông trên header. */
export default function NotificationSoundToggle({ className = "" }) {
  const { t } = useTranslation();
  const [muted, setMuted] = useState(isNotifSoundMuted());

  // Đồng bộ với toggle trong trang Cài đặt (và các header khác).
  useEffect(() => onNotifSoundMuteChange(setMuted), []);

  const label = t(
    muted ? "notifications.unmuteSound" : "notifications.muteSound"
  );

  return (
    <button
      type="button"
      onClick={() => setNotifSoundMuted(!muted)}
      title={label}
      aria-label={label}
      className={`text-[#111418] dark:text-white hover:text-primary transition-colors p-1 focus:outline-none ${className}`}
    >
      {muted ? (
        <SpeakerXMarkIcon className="h-6 w-6" />
      ) : (
        <SpeakerWaveIcon className="h-6 w-6" />
      )}
    </button>
  );
}
