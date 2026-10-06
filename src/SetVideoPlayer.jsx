import { useEffect, useRef, useState } from "react";
import Hls from "hls.js";
import { PlayIcon, PauseIcon } from "./icons/PlayerIcons";
import { BUNNY_CDN_HOSTNAME, BUNNY_LIBRARY_ID } from "./setsData";

/* Small local icons (kept here so PlayerIcons.jsx stays untouched) */

function FullscreenIcon({ size = 18 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ display: "block", flexShrink: 0 }}
    >
      <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />
    </svg>
  );
}

function VolumeIcon({ size = 18, muted = false }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ display: "block", flexShrink: 0 }}
    >
      <path d="M4 10v4h4l5 4V6L8 10H4z" fill="currentColor" stroke="none" />
      {muted ? (
        <path d="M16.5 9.5l5 5M21.5 9.5l-5 5" />
      ) : (
        <>
          <path d="M16 9c1.3 1.1 1.3 4.9 0 6" />
          <path d="M18.5 6.5c3 2.6 3 8.4 0 11" />
        </>
      )}
    </svg>
  );
}

const formatTime = (seconds) => {
  if (!Number.isFinite(seconds) || seconds <= 0) return "00:00";

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  const mm = String(minutes).padStart(2, "0");
  const ss = String(secs).padStart(2, "0");

  // DJ sets are long, so show hours once they matter
  return hours > 0 ? `${hours}:${mm}:${ss}` : `${mm}:${ss}`;
};

function SetVideoPlayer({ video, onStart }) {
  const containerRef = useRef(null);
  const videoRef = useRef(null);

  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [buffering, setBuffering] = useState(false);
  const [failed, setFailed] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);

  const hlsUrl = BUNNY_CDN_HOSTNAME
    ? `https://${BUNNY_CDN_HOSTNAME}/${video.id}/playlist.m3u8`
    : "";

  const posterUrl = BUNNY_CDN_HOSTNAME
    ? `https://${BUNNY_CDN_HOSTNAME}/${video.id}/thumbnail.jpg`
    : undefined;

  /*
    Attach the Bunny HLS stream.
    - Safari / iPhone play HLS natively.
    - Chrome / Firefox / Edge use hls.js.
  */
  useEffect(() => {
    const el = videoRef.current;

    if (!el || !hlsUrl) return;

    setFailed(false);

    let hls = null;

    if (el.canPlayType("application/vnd.apple.mpegurl")) {
      el.src = hlsUrl;
    } else if (Hls.isSupported()) {
      hls = new Hls();
      hls.loadSource(hlsUrl);
      hls.attachMedia(el);

      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (data.fatal) {
          console.error("SET VIDEO ERROR:", data);
          setFailed(true);
        }
      });
    } else {
      setFailed(true);
    }

    return () => {
      if (hls) hls.destroy();

      el.pause();
      el.removeAttribute("src");
      el.load();
    };
  }, [hlsUrl]);

  useEffect(() => {
    const el = videoRef.current;

    if (!el) return;

    el.volume = volume;
    el.muted = muted;
  }, [volume, muted]);

  // Keep the fullscreen button state in sync (Esc key, swipe, etc.)
  useEffect(() => {
    const onChange = () => {
      const active =
        document.fullscreenElement || document.webkitFullscreenElement;

      setFullscreen(active === containerRef.current);
    };

    document.addEventListener("fullscreenchange", onChange);
    document.addEventListener("webkitfullscreenchange", onChange);

    return () => {
      document.removeEventListener("fullscreenchange", onChange);
      document.removeEventListener("webkitfullscreenchange", onChange);
    };
  }, []);

  const togglePlay = () => {
    const el = videoRef.current;

    if (!el) return;

    if (el.paused) {
      el.play().catch((error) => {
        console.error("SET PLAY ERROR:", error);
      });
    } else {
      el.pause();
    }
  };

  const handleSeek = (event) => {
    const el = videoRef.current;

    if (!el) return;

    const time = Number(event.target.value);

    el.currentTime = time;
    setProgress(time);
  };

  const handleVolume = (event) => {
    const next = Number(event.target.value);

    setVolume(next);
    setMuted(next === 0);
  };

  const toggleFullscreen = () => {
    const box = containerRef.current;
    const el = videoRef.current;

    if (document.fullscreenElement || document.webkitFullscreenElement) {
      (document.exitFullscreen || document.webkitExitFullscreen)?.call(
        document,
      );
      return;
    }

    if (box?.requestFullscreen) {
      box.requestFullscreen();
    } else if (box?.webkitRequestFullscreen) {
      box.webkitRequestFullscreen();
    } else if (el?.webkitEnterFullscreen) {
      // iPhone Safari only allows fullscreen on the <video> element itself
      el.webkitEnterFullscreen();
    }
  };

  /* Fallback: no CDN hostname configured yet -> Bunny's own embed */
  if (!hlsUrl) {
    return (
      <div className="set-player">
        <div className="set-player-stage set-player-embed">
          <iframe
            src={`https://iframe.mediadelivery.net/embed/${BUNNY_LIBRARY_ID}/${video.id}?autoplay=false&preload=true`}
            title={video.title}
            loading="lazy"
            allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture"
            allowFullScreen
          />
        </div>
      </div>
    );
  }

  const progressPercent =
    duration > 0 ? `${(progress / duration) * 100}%` : "0%";

  return (
    <div
      ref={containerRef}
      className={`set-player ${fullscreen ? "is-fullscreen" : ""}`}
    >
      <div className="set-player-stage" onClick={togglePlay}>
        <video
          ref={videoRef}
          className="set-player-video"
          poster={posterUrl}
          playsInline
          preload="metadata"
          onPlay={() => {
            setPlaying(true);
            onStart?.();
          }}
          onPause={() => setPlaying(false)}
          onEnded={() => setPlaying(false)}
          onTimeUpdate={(event) => setProgress(event.currentTarget.currentTime)}
          onLoadedMetadata={(event) => {
            if (Number.isFinite(event.currentTarget.duration)) {
              setDuration(event.currentTarget.duration);
            }
          }}
          onDurationChange={(event) => {
            if (Number.isFinite(event.currentTarget.duration)) {
              setDuration(event.currentTarget.duration);
            }
          }}
          onWaiting={() => setBuffering(true)}
          onCanPlay={() => setBuffering(false)}
          onPlaying={() => setBuffering(false)}
        />

        {failed && <div className="set-player-message">STREAM UNAVAILABLE</div>}

        {!failed && playing && buffering && (
          <div className="set-player-message">LOADING…</div>
        )}

        {!failed && !playing && (
          <button
            className="set-player-bigplay"
            type="button"
            aria-label="Play"
            onClick={(event) => {
              event.stopPropagation();
              togglePlay();
            }}
          >
            <PlayIcon size={28} />
          </button>
        )}
      </div>

      <div className="set-player-bar">
        <div className="set-player-timeline">
          <input
            className="set-player-progress"
            type="range"
            min="0"
            max={duration || 0}
            step="any"
            value={progress}
            onChange={handleSeek}
            aria-label="Seek"
            style={{ "--progress": progressPercent }}
          />
        </div>

        <div className="set-player-row">
          <button
            className="set-player-play"
            type="button"
            onClick={togglePlay}
            aria-label={playing ? "Pause" : "Play"}
          >
            {playing ? <PauseIcon size={18} /> : <PlayIcon size={20} />}
          </button>

          <div className="set-player-info">
            <span className="set-player-eyebrow">SHYLO&apos;S ARCHIVE</span>
            <span className="set-player-title">{video.title}</span>
          </div>

          <span className="set-player-time">
            {formatTime(progress)} / {formatTime(duration)}
          </span>

          <div className="set-player-volume">
            <button
              className="set-player-icon-btn"
              type="button"
              onClick={() => setMuted((value) => !value)}
              aria-label={muted ? "Unmute" : "Mute"}
            >
              <VolumeIcon muted={muted || volume === 0} />
            </button>

            <input
              className="set-player-volume-slider"
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={muted ? 0 : volume}
              onChange={handleVolume}
              aria-label="Volume"
              style={{
                "--progress": `${(muted ? 0 : volume) * 100}%`,
              }}
            />
          </div>

          <button
            className="set-player-icon-btn"
            type="button"
            onClick={toggleFullscreen}
            aria-label={fullscreen ? "Exit fullscreen" : "Fullscreen"}
          >
            <FullscreenIcon />
          </button>
        </div>
      </div>
    </div>
  );
}

export default SetVideoPlayer;
