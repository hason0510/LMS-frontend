import soundUrl from "../assets/message_facebook_pc.mp3";

const STORAGE_KEY = "notif_sound_muted";
const MUTE_EVENT = "notif-sound-muted-changed";
const THROTTLE_MS = 1000; // gộp các tiếng phát sát nhau thành 1
const MAX_TRACKED_IDS = 500;

let audio = null;
let lastPlayedAt = 0;
let audioUnlocked = false;
// Module-level → dùng chung cho MỌI nơi gọi (STOMP store + polling hook).
// Đây là chốt chống lặp tiếng khi 2 kênh cùng phát hiện 1 thông báo.
const beepedIds = new Set();

function getAudioEl() {
  if (!audio) {
    audio = new Audio(soundUrl);
    audio.volume = 0.5;
  }
  return audio;
}

// Mở khóa autoplay: trình duyệt chặn audio.play() do JS gọi cho tới khi user
// tương tác trang lần đầu. Ở lần tương tác ĐẦU TIÊN (click/gõ phím/chạm),
// ta "mồi" audio bằng cách phát TẮT TIẾNG rồi dừng → các tiếng thông báo sau
// phát được kể cả khi người nhận đang ngồi yên (vd học viên chờ được duyệt).
function removeUnlockListeners() {
  window.removeEventListener("pointerdown", unlockAudioOnce);
  window.removeEventListener("keydown", unlockAudioOnce);
  window.removeEventListener("touchstart", unlockAudioOnce);
}

function unlockAudioOnce() {
  if (audioUnlocked) return;
  audioUnlocked = true;
  removeUnlockListeners();

  const el = getAudioEl();
  const prevMuted = el.muted;
  el.muted = true;
  const restore = () => {
    try {
      el.pause();
      el.currentTime = 0;
    } catch {
      /* bỏ qua */
    }
    el.muted = prevMuted;
  };
  try {
    const p = el.play();
    if (p && typeof p.then === "function") {
      p.then(restore).catch(() => {
        el.muted = prevMuted;
      });
    } else {
      restore();
    }
  } catch {
    el.muted = prevMuted;
  }
}

if (typeof window !== "undefined") {
  window.addEventListener("pointerdown", unlockAudioOnce);
  window.addEventListener("keydown", unlockAudioOnce);
  window.addEventListener("touchstart", unlockAudioOnce);
}

export function isNotifSoundMuted() {
  return localStorage.getItem(STORAGE_KEY) === "1";
}

export function setNotifSoundMuted(muted) {
  localStorage.setItem(STORAGE_KEY, muted ? "1" : "0");
  // Báo cho các component (icon trên header + mục trong trang Cài đặt)
  // cập nhật đồng bộ ngay, kể cả khi mở cùng lúc.
  window.dispatchEvent(new CustomEvent(MUTE_EVENT, { detail: muted }));
}

export function onNotifSoundMuteChange(handler) {
  const listener = (event) => handler(Boolean(event.detail));
  window.addEventListener(MUTE_EVENT, listener);
  return () => window.removeEventListener(MUTE_EVENT, listener);
}

/**
 * Phát âm thanh khi có thông báo mới.
 * Chống lặp / race:
 *  - dedupe theo id: cùng 1 notif do STOMP push + polling cùng bắt → chỉ kêu 1 lần.
 *  - throttle THROTTLE_MS: nhiều notif đến sát nhau → gộp thành 1 tiếng, không "ríu".
 *  - JS đơn luồng: has()/add() chạy trọn vẹn trong 1 callback nên không có race thật.
 */
export function playNotificationSound(notifId) {
  if (isNotifSoundMuted()) return;

  if (notifId != null) {
    if (beepedIds.has(notifId)) return; // notif này đã kêu rồi
    beepedIds.add(notifId);
    if (beepedIds.size > MAX_TRACKED_IDS) {
      // Tránh phình bộ nhớ trong phiên dài; id cũ không còn được "phát hiện mới" nữa.
      beepedIds.clear();
      beepedIds.add(notifId);
    }
  }

  const now = Date.now();
  if (now - lastPlayedAt < THROTTLE_MS) return; // gộp burst thành 1 tiếng
  lastPlayedAt = now;

  const el = getAudioEl();
  el.muted = false;
  try {
    el.currentTime = 0;
  } catch {
    /* một số trình duyệt chặn seek khi chưa load xong — bỏ qua */
  }
  el.play().catch(() => {
    /* trình duyệt chặn autoplay tới khi user tương tác trang — bỏ qua, không vỡ UI */
  });
}
