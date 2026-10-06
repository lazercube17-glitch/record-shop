import { useEffect, useState, useRef } from "react";
import CustomPlayer from "./CustomPlayer";
import YouTubeVideo from "./YouTubeVideo";
import { PlayIcon, PauseIcon } from "./icons/PlayerIcons";
import "./App.css";

// Podcasts are turned off for now (client's YouTube video takes their spot
// on the Archive page), but the AzuraCast integration below is kept intact
// in case it's needed again later — just flip this back to true.
const SHOW_PODCASTS = false;

const YOUTUBE_VIDEO_IDS = ["6yu8l3iR-50", "klBKv77BoMg", "XCTaYW7f4hI"];

const PODCASTS = [
  {
    station: "MUTANT RADIO",
    feed: "/rss/public/650/podcast/1f1adf05-4886-67a2-a367-176fa9313c0a/feed",
  },
  {
    station: "THF RADIO",
    feed: "/rss/public/650/podcast/1f1ae011-0e62-6258-af93-91a11fb3f1f2/feed",
  },
  {
    station: "THE LOT RADIO",
    feed: "/rss/public/650/podcast/1f1ae03d-a568-611c-99c7-47cdf8d7d79d/feed",
  },
];

const LIVE_TRACK = {
  id: "live-radio",
  type: "live",
  station: "RECORD SHOP RADIO",
  city: "TBILISI",
  title: "RECORD SHOP RADIO — LIVE FROM TBILISI",
  artist: "",
  artwork: "",
  playlist: "",
  src: "https://a6.asurahosting.com:7060/radio.mp3",
};

function App() {
  const [activeFilter, setActiveFilter] = useState("ALL");
  const [currentTrack, setCurrentTrack] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const playerRef = useRef(null);
  const youtubeRefs = useRef([]);

  // Live radio starts playing -> pause every YouTube video on the page
  useEffect(() => {
    if (isPlaying && currentTrack?.type === "live") {
      youtubeRefs.current.forEach((videoRef) => videoRef?.pause());
    }
  }, [isPlaying, currentTrack]);

  // A YouTube video starts playing -> pause the radio, and pause every
  // other YouTube video so sound doesn't overlap
  const handleYouTubePlay = (startedVideoId) => {
    playerRef.current?.pause();

    YOUTUBE_VIDEO_IDS.forEach((id, index) => {
      if (id !== startedVideoId) {
        youtubeRefs.current[index]?.pause();
      }
    });
  };

  const [sets, setSets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [liveMetadata, setLiveMetadata] = useState({
    title: "RECORD SHOP RADIO — LIVE FROM TBILISI",
    artist: "",
    artwork: "",
    playlist: "",
  });

  // LOAD PODCAST SETS
  useEffect(() => {
    if (!SHOW_PODCASTS) {
      setLoading(false);
      return;
    }

    const loadFeeds = async () => {
      try {
        setLoading(true);
        setError(null);

        const results = await Promise.all(
          PODCASTS.map(async (podcast) => {
            const response = await fetch(podcast.feed);

            if (!response.ok) {
              throw new Error(`Failed to load ${podcast.station}`);
            }

            const xmlText = await response.text();

            return {
              station: podcast.station,
              xmlText,
            };
          }),
        );

        const parser = new DOMParser();

        const allSets = results.flatMap(({ station, xmlText }) => {
          const xml = parser.parseFromString(xmlText, "text/xml");
          const items = Array.from(xml.querySelectorAll("item"));

          return items.map((item) => {
            const title =
              item.querySelector("title")?.textContent?.trim() || "Untitled";

            const enclosure = item.querySelector("enclosure");
            const src = enclosure?.getAttribute("url") || "";

            const imageElement = item.getElementsByTagNameNS(
              "http://www.itunes.com/dtds/podcast-1.0.dtd",
              "image",
            )[0];

            const artwork =
              imageElement?.getAttribute("href") ||
              xml.querySelector("image url")?.textContent ||
              "";

            const durationSeconds = Number(
              enclosure?.getAttribute("length") || 0,
            );

            const duration = durationSeconds
              ? `${Math.round(durationSeconds / 60)} MIN`
              : "";

            const dateText = item.querySelector("pubDate")?.textContent || "";

            const date = dateText
              ? new Date(dateText).toLocaleDateString("en-GB")
              : "";

            return {
              id:
                item.querySelector("guid")?.textContent ||
                `${station}-${title}`,
              type: "set",
              station,
              city: station,
              title,
              artist: "",
              artwork,
              src,
              duration,
              date,
            };
          });
        });

        setSets(allSets);
      } catch (err) {
        console.error(err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    loadFeeds();
  }, []);

  // LOAD LIVE METADATA FROM AZURACAST
  useEffect(() => {
    const fetchLiveMetadata = async () => {
      try {
        const response = await fetch(
          "https://a6.asurahosting.com/api/nowplaying/recordshoptbilisi",
        );

        if (!response.ok) {
          throw new Error("Failed to fetch live metadata");
        }

        const data = await response.json();

        const song = data.now_playing?.song;

        if (!song) return;

        setLiveMetadata({
          title: song.title || "RECORD SHOP RADIO",
          artist: song.artist || "",
          artwork: song.art || "",
          playlist: data.now_playing?.playlist || "",
        });
      } catch (error) {
        console.error("LIVE METADATA ERROR:", error);
      }
    };

    fetchLiveMetadata();

    const interval = setInterval(fetchLiveMetadata, 10000);

    return () => clearInterval(interval);
  }, []);

  const filteredSets =
    activeFilter === "ALL"
      ? sets
      : sets.filter((set) => set.station === activeFilter);

  const playSet = (set) => {
    // If this set is already loaded, just toggle play/pause on it
    if (currentTrack?.id === set.id) {
      playerRef.current?.togglePlay();
      return;
    }

    setCurrentTrack({
      ...set,
      type: "set",
    });
  };

  const playLive = () => {
    // If live radio is already loaded, just toggle play/pause on it
    if (currentTrack?.type === "live") {
      playerRef.current?.togglePlay();
      return;
    }

    setCurrentTrack({
      ...LIVE_TRACK,
      title: liveMetadata.title,
      artist: liveMetadata.artist,
      artwork: liveMetadata.artwork,
      playlist: liveMetadata.playlist,
    });
  };

  const closePlayer = () => {
    setCurrentTrack(null);
  };

  const playNext = () => {
    if (!currentTrack || currentTrack.type !== "set") return;
    if (filteredSets.length === 0) return;

    const index = filteredSets.findIndex((set) => set.id === currentTrack.id);
    if (index === -1) return;

    const next = filteredSets[(index + 1) % filteredSets.length];
    playSet(next);
  };

  const playPrevious = () => {
    if (!currentTrack || currentTrack.type !== "set") return;
    if (filteredSets.length === 0) return;

    const index = filteredSets.findIndex((set) => set.id === currentTrack.id);
    if (index === -1) return;

    const previousIndex =
      (index - 1 + filteredSets.length) % filteredSets.length;

    playSet(filteredSets[previousIndex]);
  };

  return (
    <div className="app-container">
      <header className="navbar">
        <div className="logo">
          <img className="logo-icon" src="/logo.svg" alt="" />
          <span className="logo-text">Shylo&apos;s Archive</span>
        </div>

        <div className="live-header">
          <span className="live-dot">●</span>
          <span className="live-label">ON AIR</span>

          <div className="live-marquee">
            <div className="live-marquee-track">
              <span>
                {liveMetadata.playlist
                  ? `${liveMetadata.playlist} — ${liveMetadata.title}`
                  : "RECORD SHOP RADIO — LIVE FROM TBILISI"}
              </span>
            </div>
          </div>

          <button className="live-play-btn" onClick={playLive}>
            {isPlaying && currentTrack?.type === "live" ? (
              <PauseIcon size={16} />
            ) : (
              <PlayIcon size={16} />
            )}
          </button>
        </div>
      </header>

      <main className="content">
        <h1 className="page-title">Archive</h1>

        {SHOW_PODCASTS && (
          <div className="filter-bar">
            <button
              className={`filter-btn ${
                activeFilter === "ALL" ? "active" : ""
              }`}
              onClick={() => setActiveFilter("ALL")}
            >
              ALL
            </button>

            {PODCASTS.map((podcast) => (
              <button
                key={podcast.station}
                className={`filter-btn ${
                  activeFilter === podcast.station ? "active" : ""
                }`}
                onClick={() => setActiveFilter(podcast.station)}
              >
                {podcast.station}
              </button>
            ))}
          </div>
        )}

        {SHOW_PODCASTS ? (
          <>
            {loading && <p>LOADING SETS...</p>}
            {error && <p>ERROR: {error}</p>}

            {!loading && !error && (
              <div className="sets-grid">
                {filteredSets.map((set) => (
                  <article
                    className="set-card"
                    key={set.id}
                    onClick={() => playSet(set)}
                  >
                    <div className="artwork-wrapper">
                      {set.artwork && (
                        <img src={set.artwork} alt={set.title} />
                      )}
                    </div>

                    <span className="card-city">{set.station}</span>

                    <h2 className="card-title">{set.title}</h2>

                    <div className="card-footer">
                      <span className="card-meta">{set.duration}</span>

                      <button
                        className="play-card-btn"
                        onClick={(event) => {
                          event.stopPropagation();
                          playSet(set);
                        }}
                      >
                        {isPlaying && currentTrack?.id === set.id ? (
                          <PauseIcon size={16} />
                        ) : (
                          <PlayIcon size={16} />
                        )}
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </>
        ) : (
          <div className="videos-grid">
            {YOUTUBE_VIDEO_IDS.map((videoId, index) => (
              <div className="video-wrapper" key={videoId}>
                <YouTubeVideo
                  videoId={videoId}
                  ref={(el) => {
                    youtubeRefs.current[index] = el;
                  }}
                  onPlay={handleYouTubePlay}
                />
              </div>
            ))}
          </div>
        )}
      </main>

      <CustomPlayer
        ref={playerRef}
        currentTrack={currentTrack}
        liveMetadata={liveMetadata}
        onClose={closePlayer}
        onPlayingChange={setIsPlaying}
        onNext={playNext}
        onPrevious={playPrevious}
      />
    </div>
  );
}

export default App;
