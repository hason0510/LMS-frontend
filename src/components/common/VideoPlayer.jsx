import React, { useEffect, useRef, useState } from "react";
import {
  PlayIcon,
  PauseIcon,
  SpeakerWaveIcon,
  SpeakerXMarkIcon,
  ArrowsPointingOutIcon,
  ArrowsPointingInIcon,
  ArrowUturnLeftIcon,
  ArrowUturnRightIcon,
} from "@heroicons/react/24/solid";

function formatTime(seconds) {
  if (!seconds || isNaN(seconds)) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

const SPEEDS = [0.5, 1, 1.5, 2];

// Trình phát cho video UPLOAD (mp4). Đã bỏ HLS / đa chất lượng.
export default function VideoPlayer({ fileUrl }) {
  const videoRef = useRef(null);
  const containerRef = useRef(null);
  const hideTimer = useRef(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);

  // Nguồn video (mp4)
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !fileUrl) return;
    video.src = fileUrl;
  }, [fileUrl]);

  // Video event listeners
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handlers = {
      timeupdate: () => setCurrentTime(video.currentTime),
      durationchange: () => setDuration(video.duration),
      play: () => setIsPlaying(true),
      pause: () => setIsPlaying(false),
      waiting: () => setIsBuffering(true),
      playing: () => setIsBuffering(false),
      volumechange: () => { setVolume(video.volume); setIsMuted(video.muted); },
    };

    Object.entries(handlers).forEach(([evt, fn]) => video.addEventListener(evt, fn));
    return () => Object.entries(handlers).forEach(([evt, fn]) => video.removeEventListener(evt, fn));
  }, []);

  // Fullscreen change
  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    video.paused ? video.play() : video.pause();
  };

  const skip = (delta) => {
    const video = videoRef.current;
    if (!video) return;
    const max = video.duration || duration || 0;
    video.currentTime = Math.max(0, Math.min(max, video.currentTime + delta));
  };

  // Auto-hide thanh điều khiển khi đang phát và chuột đứng yên (kiểu YouTube).
  const showControlsTemporarily = () => {
    setShowControls(true);
    clearTimeout(hideTimer.current);
    if (isPlaying && !showSpeedMenu) {
      hideTimer.current = setTimeout(() => setShowControls(false), 2500);
    }
  };

  // Đặt/huỷ timer ẩn theo trạng thái phát — đảm bảo ẩn cả khi bấm play mà không rê chuột.
  useEffect(() => {
    clearTimeout(hideTimer.current);
    if (isPlaying && !showSpeedMenu) {
      hideTimer.current = setTimeout(() => setShowControls(false), 2500);
    } else {
      setShowControls(true);
    }
    return () => clearTimeout(hideTimer.current);
  }, [isPlaying, showSpeedMenu]);

  const handleSeek = (e) => {
    const video = videoRef.current;
    if (!video || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    video.currentTime = ((e.clientX - rect.left) / rect.width) * duration;
  };

  const handleVolumeChange = (e) => {
    const video = videoRef.current;
    if (!video) return;
    const val = parseFloat(e.target.value);
    video.volume = val;
    video.muted = val === 0;
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (video) video.muted = !video.muted;
  };

  const toggleFullscreen = () => {
    const container = containerRef.current;
    if (!container) return;
    document.fullscreenElement ? document.exitFullscreen?.() : container.requestFullscreen?.();
  };

  const handleSetSpeed = (speed) => {
    const video = videoRef.current;
    if (video) video.playbackRate = speed;
    setPlaybackSpeed(speed);
    setShowSpeedMenu(false);
  };

  // Phím tắt chỉ chạy khi player đang focus -> không ảnh hưởng ô bình luận hay phần khác.
  const handleKeyDown = (e) => {
    if (e.key === " " || e.code === "Space") {
      e.preventDefault();
      togglePlay();
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      skip(-10);
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      skip(10);
    }
  };

  const progress = duration ? (currentTime / duration) * 100 : 0;
  const controlsVisible = showControls || !isPlaying;

  return (
    <div
      ref={containerRef}
      tabIndex={0}
      className={`relative w-full aspect-video bg-black rounded-xl overflow-hidden select-none outline-none ${
        !showControls && isPlaying ? "cursor-none" : ""
      }`}
      onMouseMove={showControlsTemporarily}
      onMouseLeave={() => { if (isPlaying && !showSpeedMenu) setShowControls(false); }}
      onClick={() => { containerRef.current?.focus(); togglePlay(); }}
      onKeyDown={handleKeyDown}
    >
      <video ref={videoRef} className="w-full h-full object-contain" playsInline preload="metadata" />

      {/* Buffering spinner */}
      {isBuffering && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-12 h-12 border-4 border-white/30 border-t-white rounded-full animate-spin" />
        </div>
      )}

      {/* Controls overlay — luôn pointer-events-none để click vùng video = play/pause;
          chỉ thanh điều khiển bắt sự kiện khi đang hiện */}
      <div
        className={`absolute inset-0 flex flex-col justify-end pointer-events-none transition-opacity duration-300 ${
          controlsVisible ? "opacity-100" : "opacity-0"
        }`}
      >
        <div
          className={`flex flex-col gap-2 bg-gradient-to-t from-black/90 via-black/60 to-transparent px-4 pb-3 pt-12 text-white [&_button]:drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)] ${
            controlsVisible ? "pointer-events-auto" : "pointer-events-none"
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Seek bar (đỏ) */}
          <div
            className="relative h-1 bg-white/30 rounded-full cursor-pointer hover:h-2 transition-all duration-150 group"
            onClick={handleSeek}
          >
            <div className="absolute left-0 top-0 h-full bg-red-600 rounded-full" style={{ width: `${progress}%` }} />
            <div
              className="absolute top-1/2 w-3 h-3 bg-red-600 rounded-full shadow opacity-0 group-hover:opacity-100 transition-opacity"
              style={{ left: `${progress}%`, transform: "translateX(-50%) translateY(-50%)" }}
            />
          </div>

          {/* Buttons row */}
          <div className="flex items-center justify-between gap-2 text-white">
            <div className="flex items-center gap-3">
              <button
                onClick={() => skip(-10)}
                className="text-white hover:text-white/70 transition-colors"
                aria-label="Tua lùi 10 giây"
              >
                <ArrowUturnLeftIcon className="h-6 w-6" />
              </button>
              <button onClick={togglePlay} className="text-white hover:text-white/70 transition-colors">
                {isPlaying ? <PauseIcon className="h-7 w-7" /> : <PlayIcon className="h-7 w-7" />}
              </button>
              <button
                onClick={() => skip(10)}
                className="text-white hover:text-white/70 transition-colors"
                aria-label="Tua tới 10 giây"
              >
                <ArrowUturnRightIcon className="h-6 w-6" />
              </button>

              {/* Volume */}
              <div className="flex items-center gap-1.5 group/vol">
                <button onClick={toggleMute} className="text-white hover:text-white/70 transition-colors">
                  {isMuted || volume === 0
                    ? <SpeakerXMarkIcon className="h-5 w-5" />
                    : <SpeakerWaveIcon className="h-5 w-5" />}
                </button>
                <input
                  type="range" min="0" max="1" step="0.05"
                  value={isMuted ? 0 : volume}
                  onChange={handleVolumeChange}
                  onClick={(e) => e.stopPropagation()}
                  className="w-0 opacity-0 group-hover/vol:w-16 group-hover/vol:opacity-100 transition-all duration-300 accent-white h-1 cursor-pointer"
                />
              </div>

              <span className="text-white/90 text-xs font-mono tabular-nums hidden sm:block">
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>
            </div>

            <div className="flex items-center gap-2">
              {/* Speed selector */}
              <div className="relative">
                <button
                  onClick={(e) => { e.stopPropagation(); setShowSpeedMenu((v) => !v); }}
                  className="text-white text-xs font-bold px-2 py-0.5 rounded border border-white/40 hover:border-white transition-colors min-w-[40px] text-center"
                >
                  {playbackSpeed === 1 ? "1x" : `${playbackSpeed}x`}
                </button>
                {showSpeedMenu && (
                  <div className="absolute bottom-full right-0 mb-2 bg-black/70 backdrop-blur border border-white/20 rounded-lg overflow-hidden min-w-[72px] z-20 shadow-xl">
                    {SPEEDS.map((speed) => (
                      <button
                        key={speed}
                        onClick={(e) => { e.stopPropagation(); handleSetSpeed(speed); }}
                        className={`w-full text-left px-4 py-2 text-xs transition-colors hover:bg-white/10 ${
                          playbackSpeed === speed ? "text-white font-bold" : "text-white/60"
                        }`}
                      >
                        {speed === 1 ? "1x" : `${speed}x`}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <button onClick={toggleFullscreen} className="text-white hover:text-white/70 transition-colors">
                {isFullscreen
                  ? <ArrowsPointingInIcon className="h-5 w-5" />
                  : <ArrowsPointingOutIcon className="h-5 w-5" />}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
