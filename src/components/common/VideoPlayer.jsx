import React, { useEffect, useRef, useState } from "react";
import Hls from "hls.js";
import {
  PlayIcon,
  PauseIcon,
  SpeakerWaveIcon,
  SpeakerXMarkIcon,
  ArrowsPointingOutIcon,
  ArrowsPointingInIcon,
} from "@heroicons/react/24/solid";

function formatTime(seconds) {
  if (!seconds || isNaN(seconds)) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function getQualityLabel(level) {
  if (!level) return "";
  if (level.height >= 1080) return "1080p";
  if (level.height >= 720) return "720p";
  if (level.height >= 480) return "480p";
  if (level.height >= 360) return "360p";
  return `${level.height}p`;
}

const SPEEDS = [0.5, 1, 1.5, 2];

export default function VideoPlayer({ fileUrl, hlsUrl, title }) {
  const videoRef = useRef(null);
  const hlsRef = useRef(null);
  const containerRef = useRef(null);
  const hideTimer = useRef(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [levels, setLevels] = useState([]);
  const [currentLevel, setCurrentLevel] = useState(-1);
  const [isBuffering, setIsBuffering] = useState(true);
  const [showControls, setShowControls] = useState(true);
  const [showQualityMenu, setShowQualityMenu] = useState(false);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);

  // Init HLS or MP4
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !fileUrl) return;

    if (hlsUrl && Hls.isSupported()) {
      const hls = new Hls({ enableWorker: true });
      hlsRef.current = hls;
      hls.loadSource(hlsUrl);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        setLevels(hls.levels);
        setIsBuffering(false);
      });

      hls.on(Hls.Events.ERROR, (_, data) => {
        if (data.fatal) {
          hls.destroy();
          hlsRef.current = null;
          video.src = fileUrl; // fallback to MP4
          setIsBuffering(false);
        }
      });

      return () => {
        hlsRef.current?.destroy();
        hlsRef.current = null;
      };
    } else if (hlsUrl && video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = hlsUrl; // Safari native HLS
    } else {
      video.src = fileUrl; // MP4 fallback (video cũ chưa có hlsUrl)
      setIsBuffering(false);
    }
  }, [fileUrl, hlsUrl]);

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

  const anyMenuOpen = showQualityMenu || showSpeedMenu;

  const resetControlsTimer = () => {
    setShowControls(true);
    clearTimeout(hideTimer.current);
    if (isPlaying && !anyMenuOpen) {
      hideTimer.current = setTimeout(() => setShowControls(false), 3000);
    }
  };

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    video.paused ? video.play() : video.pause();
  };

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
    document.fullscreenElement
      ? document.exitFullscreen?.()
      : container.requestFullscreen?.();
  };

  const setQuality = (levelIndex) => {
    const hls = hlsRef.current;
    if (hls) hls.currentLevel = levelIndex;
    setCurrentLevel(levelIndex);
    setShowQualityMenu(false);
  };

  const handleSetSpeed = (speed) => {
    const video = videoRef.current;
    if (video) video.playbackRate = speed;
    setPlaybackSpeed(speed);
    setShowSpeedMenu(false);
  };

  const progress = duration ? (currentTime / duration) * 100 : 0;
  const currentQualityLabel =
    currentLevel === -1 ? "Auto" : (levels[currentLevel] ? getQualityLabel(levels[currentLevel]) : "Auto");

  return (
    <div
      ref={containerRef}
      className="relative w-full aspect-video bg-black rounded-xl overflow-hidden select-none"
      onMouseMove={resetControlsTimer}
      onMouseLeave={() => { if (isPlaying && !anyMenuOpen) setShowControls(false); }}
      onClick={togglePlay}
    >
      <video ref={videoRef} className="w-full h-full object-contain" playsInline preload="metadata" />

      {/* Buffering spinner */}
      {isBuffering && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-12 h-12 border-4 border-white/30 border-t-white rounded-full animate-spin" />
        </div>
      )}

      {/* Controls overlay */}
      <div
        className={`absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20 flex flex-col justify-end transition-opacity duration-300 ${
          showControls || !isPlaying ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {title && (
          <div className="absolute top-0 left-0 right-0 p-3 pb-10 bg-gradient-to-b from-black/50 to-transparent pointer-events-none">
            <p className="text-white text-sm font-medium truncate">{title}</p>
          </div>
        )}

        <div className="px-4 pb-3 flex flex-col gap-2">
          {/* Seek bar */}
          <div
            className="relative h-1 bg-white/30 rounded-full cursor-pointer hover:h-2 transition-all duration-150 group"
            onClick={handleSeek}
          >
            <div
              className="absolute left-0 top-0 h-full bg-primary rounded-full transition-none"
              style={{ width: `${progress}%` }}
            />
            <div
              className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow opacity-0 group-hover:opacity-100 transition-opacity"
              style={{ left: `${progress}%`, transform: `translateX(-50%) translateY(-50%)` }}
            />
          </div>

          {/* Buttons row */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-3">
              <button onClick={togglePlay} className="text-white hover:text-primary transition-colors">
                {isPlaying ? <PauseIcon className="h-6 w-6" /> : <PlayIcon className="h-6 w-6" />}
              </button>

              {/* Volume */}
              <div className="flex items-center gap-1.5 group/vol">
                <button onClick={toggleMute} className="text-white hover:text-primary transition-colors">
                  {isMuted || volume === 0
                    ? <SpeakerXMarkIcon className="h-5 w-5" />
                    : <SpeakerWaveIcon className="h-5 w-5" />}
                </button>
                <input
                  type="range" min="0" max="1" step="0.05"
                  value={isMuted ? 0 : volume}
                  onChange={handleVolumeChange}
                  className="w-0 group-hover/vol:w-16 transition-all duration-300 accent-primary h-1 cursor-pointer"
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
                  onClick={(e) => { e.stopPropagation(); setShowSpeedMenu((v) => !v); setShowQualityMenu(false); }}
                  className="text-white text-xs font-bold px-2 py-0.5 rounded border border-white/40 hover:border-white transition-colors min-w-[40px] text-center"
                >
                  {playbackSpeed === 1 ? "1x" : `${playbackSpeed}x`}
                </button>
                {showSpeedMenu && (
                  <div className="absolute bottom-full right-0 mb-2 bg-black/60 backdrop-blur border border-white/20 rounded-lg overflow-hidden min-w-[72px] z-20 shadow-xl">
                    {SPEEDS.map((speed) => (
                      <button
                        key={speed}
                        onClick={(e) => { e.stopPropagation(); handleSetSpeed(speed); }}
                        className={`w-full text-left px-4 py-2 text-xs transition-colors hover:bg-white/10 ${
                          playbackSpeed === speed ? "text-primary font-bold" : "text-white"
                        }`}
                      >
                        {speed === 1 ? "1x" : `${speed}x`}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Quality selector */}
              {levels.length > 0 && (
                <div className="relative">
                  <button
                    onClick={(e) => { e.stopPropagation(); setShowQualityMenu((v) => !v); setShowSpeedMenu(false); }}
                    className="text-white text-xs font-bold px-2 py-0.5 rounded border border-white/40 hover:border-white transition-colors min-w-[46px] text-center"
                  >
                    {currentQualityLabel}
                  </button>
                  {showQualityMenu && (
                    <div className="absolute bottom-full right-0 mb-2 bg-black/60 backdrop-blur border border-white/20 rounded-lg overflow-hidden min-w-[80px] z-20 shadow-xl">
                      {[{ label: "Auto", idx: -1 }, ...[...levels].map((l, i) => ({ label: getQualityLabel(l), idx: i })).reverse()].map(({ label, idx }) => (
                        <button
                          key={idx}
                          onClick={(e) => { e.stopPropagation(); setQuality(idx); }}
                          className={`w-full text-left px-4 py-2 text-xs transition-colors hover:bg-white/10 ${
                            currentLevel === idx ? "text-primary font-bold" : "text-white"
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <button onClick={toggleFullscreen} className="text-white hover:text-primary transition-colors">
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
