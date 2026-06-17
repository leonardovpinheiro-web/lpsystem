import { useEffect, useRef } from "react";
import type { Lesson } from "@/data/lessons";

interface VideoPlayerProps {
  lesson: Lesson;
  onProgress?: (lessonId: string, percent: number) => void;
}

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady?: () => void;
  }
}

let apiPromise: Promise<void> | null = null;
function loadYouTubeAPI(): Promise<void> {
  if (apiPromise) return apiPromise;
  apiPromise = new Promise((resolve) => {
    if (window.YT && window.YT.Player) return resolve();
    const tag = document.createElement("script");
    tag.src = "https://www.youtube.com/iframe_api";
    document.head.appendChild(tag);
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      prev?.();
      resolve();
    };
  });
  return apiPromise;
}

export function VideoPlayer({ lesson, onProgress }: VideoPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<any>(null);
  const intervalRef = useRef<number | null>(null);
  const lastSentRef = useRef<number>(0);
  const onProgressRef = useRef(onProgress);
  useEffect(() => { onProgressRef.current = onProgress; }, [onProgress]);

  useEffect(() => {
    let cancelled = false;

    loadYouTubeAPI().then(() => {
      if (cancelled || !containerRef.current) return;

      if (playerRef.current) {
        try { playerRef.current.destroy(); } catch {}
        playerRef.current = null;
      }
      containerRef.current.innerHTML = '<div id="yt-player-mount"></div>';

      playerRef.current = new window.YT.Player("yt-player-mount", {
        videoId: lesson.videoId,
        width: "100%",
        height: "100%",
        playerVars: { rel: 0, modestbranding: 1, playsinline: 1 },
        events: {
          onStateChange: (e: any) => {
            if (e.data === 1) {
              if (intervalRef.current) window.clearInterval(intervalRef.current);
              intervalRef.current = window.setInterval(() => sendProgress(), 5000);
            } else {
              if (intervalRef.current) window.clearInterval(intervalRef.current);
              intervalRef.current = null;
              if (e.data === 0) sendProgress(100);
              else sendProgress();
            }
          },
        },
      });
    });

    const sendProgress = (override?: number) => {
      try {
        const p = playerRef.current;
        if (!p || !p.getDuration) return;
        const duration = p.getDuration();
        const current = p.getCurrentTime();
        if (!duration || duration <= 0) return;
        const pct = override ?? (current / duration) * 100;
        if (pct > lastSentRef.current) {
          lastSentRef.current = pct;
          onProgress?.(lesson.id, pct);
        }
      } catch {}
    };

    return () => {
      cancelled = true;
      if (intervalRef.current) window.clearInterval(intervalRef.current);
      intervalRef.current = null;
      lastSentRef.current = 0;
      if (playerRef.current) {
        try { playerRef.current.destroy(); } catch {}
        playerRef.current = null;
      }
    };
  }, [lesson.id, lesson.videoId, onProgress]);

  return (
    <div className="flex flex-col gap-4">
      <div className="relative w-full overflow-hidden rounded-xl bg-foreground/5" style={{ paddingBottom: "56.25%" }}>
        <div ref={containerRef} className="absolute inset-0 h-full w-full [&_iframe]:h-full [&_iframe]:w-full [&>div]:h-full [&>div]:w-full" />
      </div>
      <div>
        <h1 className="text-xl font-semibold text-foreground">{lesson.title}</h1>
      </div>
    </div>
  );
}
