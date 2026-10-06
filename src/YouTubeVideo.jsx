import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { PlayIcon } from "./icons/PlayerIcons";

// The YouTube IFrame API script + its "ready" callback are shared across
// every video on the page — only ever load/create this once.
let apiPromise = null;

function loadYouTubeApi() {
  if (window.YT && window.YT.Player) {
    return Promise.resolve(window.YT);
  }

  if (apiPromise) return apiPromise;

  apiPromise = new Promise((resolve) => {
    const previousCallback = window.onYouTubeIframeAPIReady;

    window.onYouTubeIframeAPIReady = () => {
      previousCallback?.();
      resolve(window.YT);
    };

    const script = document.createElement("script");
    script.src = "https://www.youtube.com/iframe_api";
    document.head.appendChild(script);
  });

  return apiPromise;
}

/*
  Renders a thumbnail + play button first (no iframe, no YouTube JS loaded at
  all) so the page loads fast. Only once someone actually clicks it do we
  mount the real embed — that's also the point we hook into the YouTube
  IFrame API so this player can be told to pause from the outside (used to
  stop it automatically when the live radio starts playing).
*/
const YouTubeVideo = forwardRef(function YouTubeVideo(
  { videoId, title = "Archive video", onPlay },
  ref,
) {
  const [loaded, setLoaded] = useState(false);
  const iframeRef = useRef(null);
  const playerRef = useRef(null);

  useImperativeHandle(ref, () => ({
    pause: () => {
      playerRef.current?.pauseVideo?.();
    },
  }));

  useEffect(() => {
    if (!loaded) return;

    let cancelled = false;

    loadYouTubeApi().then((YT) => {
      if (cancelled || !iframeRef.current) return;

      playerRef.current = new YT.Player(iframeRef.current, {
        events: {
          onStateChange: (event) => {
            if (event.data === YT.PlayerState.PLAYING) {
              onPlay?.(videoId);
            }
          },
        },
      });
    });

    return () => {
      cancelled = true;
      playerRef.current?.destroy?.();
      playerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded]);

  if (!loaded) {
    return (
      <button
        type="button"
        className="yt-facade"
        onClick={() => setLoaded(true)}
        aria-label={`Play ${title}`}
      >
        <img
          className="yt-facade-thumb"
          src={`https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`}
          alt=""
          loading="lazy"
        />

        <span className="yt-facade-play">
          <PlayIcon size={28} />
        </span>
      </button>
    );
  }

  return (
    <iframe
      ref={iframeRef}
      src={`https://www.youtube.com/embed/${videoId}?enablejsapi=1&autoplay=1`}
      title={title}
      frameBorder="0"
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
      allowFullScreen
    />
  );
});

export default YouTubeVideo;
