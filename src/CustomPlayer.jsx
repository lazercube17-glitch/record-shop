import {
  useEffect,
  useRef,
  useState,
  forwardRef,
  useImperativeHandle,
} from "react";
import {
  PlayIcon,
  PauseIcon,
  ArrowDownIcon,
  PreviousIcon,
  NextIcon,
} from "./icons/PlayerIcons";

const CustomPlayer = forwardRef(function CustomPlayer(
  {
    currentTrack,
    liveMetadata,
    onClose,
    onPlayingChange,
    onNext,
    onPrevious,
  },
  ref,
) {
  const audioRef = useRef(null);

  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);

  // NEW: controls the expanded mobile player
  const [mobileExpanded, setMobileExpanded] = useState(false);

  // NEW: drag-to-dismiss state for the expanded mobile player
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const dragStartY = useRef(null);

  const isLive = currentTrack?.type === "live";

  useEffect(() => {
    const audio = audioRef.current;

    if (!audio) return;

    audio.volume = volume;
  }, [volume]);

  // NEW: hook into the OS-level media controls (lock screen, Control
  // Center, and whatever native control surface iOS/Android decide to
  // show for an actively-playing <audio> element). Without this, those
  // native controls have no real track info and no working buttons.
  useEffect(() => {
    if (!("mediaSession" in navigator) || !currentTrack) return;

    const displayed = isLive ? { ...currentTrack, ...liveMetadata } : currentTrack;

    navigator.mediaSession.metadata = new MediaMetadata({
      title: displayed.title || "Record Shop Radio",
      artist: displayed.artist || displayed.station || "",
      album: isLive ? displayed.playlist || "" : displayed.station || "",
      artwork: displayed.artwork
        ? [
            { src: displayed.artwork, sizes: "512x512", type: "image/jpeg" },
          ]
        : [],
    });

    navigator.mediaSession.setActionHandler("play", () => togglePlay());
    navigator.mediaSession.setActionHandler("pause", () => togglePlay());
    navigator.mediaSession.setActionHandler(
      "previoustrack",
      isLive ? null : () => onPrevious?.(),
    );
    navigator.mediaSession.setActionHandler(
      "nexttrack",
      isLive ? null : () => onNext?.(),
    );
    navigator.mediaSession.setActionHandler("stop", () => handleClose());

    navigator.mediaSession.playbackState = playing ? "playing" : "paused";
  }, [currentTrack?.id, liveMetadata, playing, isLive]);

  // NEW: report playing state up to App whenever it changes
  useEffect(() => {
    onPlayingChange?.(playing);
  }, [playing, onPlayingChange]);

  /*
    Only load a new audio source when the actual track changes.

    IMPORTANT:
    Live metadata can update without restarting the radio.
  */
  useEffect(() => {
    const audio = audioRef.current;

    if (!audio) return;

    if (!currentTrack) {
      audio.pause();
      audio.removeAttribute("src");
      audio.load();

      setPlaying(false);
      setProgress(0);
      setDuration(0);
      setMobileExpanded(false);
      setIsClosing(false);
      setIsDragging(false);
      setDragOffset(0);

      return;
    }

    audio.pause();
    audio.src = currentTrack.src;

    setPlaying(false);
    setProgress(0);
    setDuration(0);

    audio.load();

    audio
      .play()
      .then(() => {
        setPlaying(true);
      })
      .catch((error) => {
        console.error("PLAYER PLAY ERROR:", error);
        setPlaying(false);
      });
  }, [currentTrack?.id, currentTrack?.src]);

  // NEW: lock the page scroll while the expanded mobile player is open,
  // otherwise iOS lets the page behind it scroll/rubber-band and it looks
  // like the controls are "moving around"
  useEffect(() => {
    if (!mobileExpanded) return;

    const scrollY = window.scrollY;
    const { style } = document.body;

    const previous = {
      position: style.position,
      top: style.top,
      left: style.left,
      right: style.right,
      overflow: style.overflow,
    };

    style.position = "fixed";
    style.top = `-${scrollY}px`;
    style.left = "0";
    style.right = "0";
    style.overflow = "hidden";

    return () => {
      style.position = previous.position;
      style.top = previous.top;
      style.left = previous.left;
      style.right = previous.right;
      style.overflow = previous.overflow;
      window.scrollTo(0, scrollY);
    };
  }, [mobileExpanded]);

  // NEW: animate the expanded player sliding down, then actually collapse it.
  // Used both by the arrow button and by a drag-past-threshold gesture.
  const collapsePlayer = () => {
    setIsClosing(true);

    window.setTimeout(() => {
      setMobileExpanded(false);
      setIsClosing(false);
      setIsDragging(false);
      setDragOffset(0);
    }, 300);
  };

  const handleExpandedTouchStart = (event) => {
    // Ignore drags that start on interactive controls (sliders, buttons)
    if (event.target.closest("input, button")) return;

    dragStartY.current = event.touches[0].clientY;
    setIsDragging(true);
  };

  const handleExpandedTouchMove = (event) => {
    if (dragStartY.current === null) return;

    const delta = event.touches[0].clientY - dragStartY.current;

    if (delta > 0) {
      setDragOffset(delta);
    }
  };

  const handleExpandedTouchEnd = () => {
    if (dragStartY.current === null) return;

    const shouldClose = dragOffset > 120;

    dragStartY.current = null;
    setIsDragging(false);

    if (shouldClose) {
      collapsePlayer();
    } else {
      setDragOffset(0);
    }
  };

  const togglePlay = (event) => {
    if (event) {
      event.stopPropagation();
    }

    const audio = audioRef.current;

    if (!audio || !currentTrack) return;

    if (audio.paused) {
      if (isLive) {
        // Live streams go stale while paused — the old connection has
        // fallen behind, so reconnect fresh instead of trying to resume it.
        // A cache-busting query param forces a genuinely new connection
        // instead of the browser potentially reusing/resuming the old
        // buffered one, which is what was causing the glitch/stutter.
        audio.pause();
        audio.src = `${currentTrack.src}${
          currentTrack.src.includes("?") ? "&" : "?"
        }_=${Date.now()}`;
        setProgress(0);
        setDuration(0);
        audio.load();
      }

      audio
        .play()
        .then(() => {
          setPlaying(true);
        })
        .catch((error) => {
          console.error("PLAY ERROR:", error);
        });
    } else {
      audio.pause();
      setPlaying(false);
    }
  };

  // NEW: expose togglePlay (and a safe, non-toggling pause) to the parent
  // (App) via ref
  useImperativeHandle(ref, () => ({
    togglePlay,
    pause: () => {
      const audio = audioRef.current;

      if (audio && !audio.paused) {
        audio.pause();
        setPlaying(false);
      }
    },
  }));

  const handleTimeUpdate = () => {
    const audio = audioRef.current;

    if (!audio) return;

    setProgress(audio.currentTime);
  };

  const handleLoadedMetadata = () => {
    const audio = audioRef.current;

    if (!audio) return;

    if (Number.isFinite(audio.duration)) {
      setDuration(audio.duration);
    }
  };

  const handleSeek = (event) => {
    const audio = audioRef.current;

    if (!audio || isLive) return;

    const newTime = Number(event.target.value);

    audio.currentTime = newTime;
    setProgress(newTime);
  };

  const handleVolumeChange = (event) => {
    setVolume(Number(event.target.value));
  };

  const handleEnded = () => {
    setPlaying(false);
    setProgress(0);
  };

  const formatTime = (seconds) => {
    if (!Number.isFinite(seconds) || seconds <= 0) {
      return "00:00";
    }

    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);

    return `${String(minutes).padStart(2, "0")}:${String(
      remainingSeconds,
    ).padStart(2, "0")}`;
  };

  const handleClose = () => {
    const audio = audioRef.current;

    if (audio) {
      audio.pause();
      audio.removeAttribute("src");
      audio.load();
    }

    setPlaying(false);
    setProgress(0);
    setDuration(0);
    setMobileExpanded(false);
    setIsClosing(false);
    setIsDragging(false);
    setDragOffset(0);

    onClose();
  };

  if (!currentTrack) {
    return null;
  }

  /*
    For LIVE, use the constantly updating AzuraCast metadata.
    For SETS, use the normal set information.
  */
  const displayedTrack = isLive
    ? {
        ...currentTrack,
        ...liveMetadata,
      }
    : currentTrack;

  const displayTitle = displayedTrack.artist
    ? `${displayedTrack.artist} — ${displayedTrack.title}`
    : displayedTrack.title;

  return (
    <>
      <audio
        ref={audioRef}
        preload="metadata"
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleEnded}
      />

      {/* =========================
          DESKTOP PLAYER
      ========================= */}

      <div
        className={`new-player desktop-player ${
          isLive ? "live-player" : "set-player"
        }`}
      >
        {!isLive && (
          <div className="desktop-set-timeline">
            <input
              className="desktop-progress"
              type="range"
              min="0"
              max={duration || 0}
              value={progress}
              onChange={handleSeek}
              style={{
                "--progress":
                  duration > 0 ? `${(progress / duration) * 100}%` : "0%",
              }}
            />

            <span className="desktop-duration">
              {formatTime(progress)} / {formatTime(duration)}
            </span>
          </div>
        )}

        <div className="desktop-player-row">
          <div className="desktop-player-left">
            {displayedTrack.artwork && (
              <img
                className="desktop-player-artwork"
                src={displayedTrack.artwork}
                alt=""
              />
            )}

            <div className="desktop-player-info">
              <span className="desktop-player-city">
                {isLive
                  ? displayedTrack.playlist || "RECORD SHOP RADIO"
                  : displayedTrack.station}
              </span>

              <div className="desktop-player-ticker">{displayTitle}</div>
            </div>
          </div>

          <div className="desktop-player-controls">
            <button
              className={`desktop-skip ${isLive ? "disabled" : ""}`}
              type="button"
              onClick={onPrevious}
              disabled={isLive}
              aria-label="Previous"
            >
              <PreviousIcon size={16} />
            </button>

            <button
              className="desktop-play"
              type="button"
              onClick={togglePlay}
              aria-label={playing ? "Pause" : "Play"}
            >
              {playing ? <PauseIcon size={18} /> : <PlayIcon size={20} />}
            </button>

            <button
              className={`desktop-skip ${isLive ? "disabled" : ""}`}
              type="button"
              onClick={onNext}
              disabled={isLive}
              aria-label="Next"
            >
              <NextIcon size={16} />
            </button>
          </div>

          <div className="desktop-player-right">
            {isLive && (
              <span className="desktop-live">
                <span className="desktop-live-dot" />
                LIVE
              </span>
            )}

            <div className="desktop-volume">
              <span className="volume-icon">🔊</span>

              <input
                className="desktop-volume-slider"
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={volume}
                onChange={handleVolumeChange}
              />
            </div>

            <button
              className="desktop-close"
              onClick={handleClose}
              aria-label="Close player"
            >
              ×
            </button>
          </div>
        </div>
      </div>

      {/* =========================
          MOBILE MINI PLAYER
      ========================= */}

      {!mobileExpanded && (
        <div
          className="new-player mobile-player"
          onClick={() => setMobileExpanded(true)}
        >
          <div className="mobile-player-statusbar">
            {isLive ? (
              <div className="mobile-live-indicator">
                <span className="mobile-live-dot" />
                <span>LIVE</span>
              </div>
            ) : (
              <div className="mobile-mini-timeline">
                <div
                  className="mobile-mini-progress-track"
                  style={{
                    "--progress":
                      duration > 0 ? `${(progress / duration) * 100}%` : "0%",
                  }}
                >
                  <div className="mobile-mini-progress-fill" />
                </div>

                <span className="mobile-mini-time">
                  {formatTime(progress)} / {formatTime(duration)}
                </span>
              </div>
            )}
          </div>

          <div className="mobile-player-controls">
            {displayedTrack.artwork && (
              <img
                className="mobile-player-artwork"
                src={displayedTrack.artwork}
                alt=""
              />
            )}

            <div className="mobile-player-ticker">
              <div className="mobile-ticker-track">
                <span>{displayTitle}</span>
                <span>{displayTitle}</span>
              </div>
            </div>

            <button
              className={`mobile-skip ${isLive ? "disabled" : ""}`}
              onClick={(event) => {
                event.stopPropagation();
                onPrevious?.();
              }}
              disabled={isLive}
              aria-label="Previous"
            >
              <PreviousIcon size={15} />
            </button>

            <button
              className="mobile-play"
              onClick={togglePlay}
              aria-label={playing ? "Pause" : "Play"}
            >
              {playing ? <PauseIcon size={18} /> : <PlayIcon size={20} />}
            </button>

            <button
              className={`mobile-skip ${isLive ? "disabled" : ""}`}
              onClick={(event) => {
                event.stopPropagation();
                onNext?.();
              }}
              disabled={isLive}
              aria-label="Next"
            >
              <NextIcon size={15} />
            </button>
          </div>
        </div>
      )}

      {/* =========================
          MOBILE EXPANDED PLAYER
      ========================= */}

      {mobileExpanded && (
        <div
          className="mobile-expanded-player"
          onTouchStart={handleExpandedTouchStart}
          onTouchMove={handleExpandedTouchMove}
          onTouchEnd={handleExpandedTouchEnd}
          style={{
            transform: isClosing
              ? "translateY(100%)"
              : `translateY(${dragOffset}px)`,
            transition: isDragging ? "none" : "transform 0.3s ease",
          }}
        >
          <button
            className="mobile-expanded-close"
            onClick={collapsePlayer}
            aria-label="Collapse player"
          >
            <ArrowDownIcon size={24} />
          </button>

          {isLive && (
            <div className="mobile-expanded-live">
              <span>●</span> LIVE
            </div>
          )}

          {displayedTrack.artwork && (
            <img
              className="mobile-expanded-artwork"
              src={displayedTrack.artwork}
              alt=""
            />
          )}

          <div className="mobile-expanded-info">
            <span className="mobile-expanded-station">
              {isLive
                ? displayedTrack.playlist || "RECORD SHOP RADIO"
                : displayedTrack.station}
            </span>

            <h2 className="mobile-expanded-title">{displayTitle}</h2>
          </div>

          {!isLive && (
            <div className="mobile-expanded-timeline">
              <input
                type="range"
                min="0"
                max={duration || 0}
                value={progress}
                onChange={handleSeek}
              />

              <div className="mobile-expanded-times">
                <span>{formatTime(progress)}</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>
          )}

          <div className="mobile-expanded-controls">
            <button
              className={`mobile-expanded-skip ${isLive ? "disabled" : ""}`}
              onClick={onPrevious}
              disabled={isLive}
              aria-label="Previous"
            >
              <PreviousIcon size={22} />
            </button>

            <button
              className="mobile-expanded-play"
              onClick={togglePlay}
              aria-label={playing ? "Pause" : "Play"}
            >
              {playing ? <PauseIcon size={22} /> : <PlayIcon size={24} />}
            </button>

            <button
              className={`mobile-expanded-skip ${isLive ? "disabled" : ""}`}
              onClick={onNext}
              disabled={isLive}
              aria-label="Next"
            >
              <NextIcon size={22} />
            </button>
          </div>
        </div>
      )}
    </>
  );
});

export default CustomPlayer;
