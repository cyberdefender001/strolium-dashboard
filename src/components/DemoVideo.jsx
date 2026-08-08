import { useEffect, useRef, useState } from "react";
import { Play, Maximize2, Minimize2, X, GripVertical } from "lucide-react";
import {
  DEMO_VIDEO_EMBED,
  DEMO_VIDEO_SRC,
  DEMO_VIDEO_POSTER,
  DEMO_VIDEO_CHAPTERS,
} from "../config";

// A floating "how it works" player for the login screen, with YouTube-style
// chapters.
//
// Four things it has to get right:
//
//   1. NEVER be in the way. Someone who came to sign in should not have to fight
//      a video. It starts small in a corner, drags anywhere, and can be
//      dismissed for good.
//   2. Cost nothing until wanted. Neither the <video> nor the YouTube iframe
//      exists before the play button is pressed. An idle YouTube iframe pulls
//      several hundred KB of player code, and a signup page must not spend a
//      visitor's data on a video they never watch.
//   3. Let people skip. One long video is right -- four files is four downloads
//      -- but only if a boss can jump to the part he cares about, which is what
//      the chapter list is for.
//   4. Not lie about buffering. A single self-hosted file has ONE bitrate and
//      will stall on a slow connection. Only a platform embed adapts. Both are
//      supported; the choice lives in config.js.
const KEY = "strolium_demo_video";

const mmss = (n) => `${Math.floor(n / 60)}:${String(Math.floor(n % 60)).padStart(2, "0")}`;

// `controlled` distinguishes the two places this is used. On the login page it is
// uninvited, so it starts small and can be dismissed FOREVER (localStorage). In
// the app it is opened deliberately from Qo'llanma, so it starts enlarged, closing
// just closes it, and the login page's dismissal must not hide it -- otherwise
// anyone who dismissed it once could never open the guide again.
export default function DemoVideo({
  title = "Strolium qanday ishlaydi",
  controlled = false,
  onClose,
}) {
  const hasVideo = Boolean(DEMO_VIDEO_EMBED || DEMO_VIDEO_SRC);
  const chapters = Array.isArray(DEMO_VIDEO_CHAPTERS) ? DEMO_VIDEO_CHAPTERS : [];

  const [dismissed, setDismissed] = useState(() => {
    if (controlled) return false;
    try {
      return localStorage.getItem(KEY) === "off";
    } catch {
      return false;
    }
  });
  // Opened on purpose from the app, so start at a useful size.
  const [big, setBig] = useState(controlled);
  const [started, setStarted] = useState(false);
  const [at, setAt] = useState(0);
  // null means "use the CSS default corner", so the card stays responsive until
  // it is deliberately moved.
  const [pos, setPos] = useState(null);
  // Freely dragged width. null means "use whatever the CSS says", so the two-state
  // toggle keeps working until someone grabs the corner. Height follows from the
  // 16:9 aspect-ratio on the stage, so width is the only thing to track.
  const [size, setSize] = useState(null);

  const cardRef = useRef(null);
  const videoRef = useRef(null);
  const frameRef = useRef(null);
  const drag = useRef(null);
  const resz = useRef(null);

  // Pointer events rather than mouse events: one code path for trackpad, mouse
  // and touch, and pointer capture means a fast drag leaving the handle does not
  // strand the card mid-move.
  useEffect(() => {
    const onMove = (e) => {
      // Resizing takes precedence: the handle sits inside the card, so a drag
      // starting there must not also move it.
      const r = resz.current;
      if (r) {
        const min = 240;
        const max = Math.min(1100, window.innerWidth - 24);
        setSize(Math.min(Math.max(min, r.w + (e.clientX - r.x)), max));
        return;
      }
      const d = drag.current;
      if (!d) return;
      const w = cardRef.current ? cardRef.current.offsetWidth : 300;
      const h = cardRef.current ? cardRef.current.offsetHeight : 220;
      // Clamped so it can never be dragged off-screen and lost.
      const x = Math.min(Math.max(8, d.left + (e.clientX - d.x)), window.innerWidth - w - 8);
      const y = Math.min(Math.max(8, d.top + (e.clientY - d.y)), window.innerHeight - h - 8);
      setPos({ left: x, top: y });
    };
    const onUp = () => {
      drag.current = null;
      resz.current = null;
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, []);

  // A card dragged low in a tall window, then resized smaller, would end up
  // off-screen. Re-clamp on resize.
  useEffect(() => {
    if (!pos) return;
    const onResize = () => {
      const w = cardRef.current ? cardRef.current.offsetWidth : 300;
      const h = cardRef.current ? cardRef.current.offsetHeight : 220;
      setPos((p) =>
        p
          ? {
              left: Math.min(p.left, Math.max(8, window.innerWidth - w - 8)),
              top: Math.min(p.top, Math.max(8, window.innerHeight - h - 8)),
            }
          : p
      );
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [pos]);

  const startDrag = (e) => {
    // The close and resize buttons live INSIDE this bar. Without this guard,
    // pressing one bubbles up here, setPointerCapture below retargets the
    // pointerup to the bar, and the browser then fires `click` on the bar rather
    // than on the button -- so neither button ever worked.
    if (e.target.closest && e.target.closest("button")) return;
    const r = cardRef.current.getBoundingClientRect();
    drag.current = { x: e.clientX, y: e.clientY, left: r.left, top: r.top };
    setPos({ left: r.left, top: r.top });
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      /* older browsers: the window listeners still cover it */
    }
  };

  const startResize = (e) => {
    e.stopPropagation();
    const r = cardRef.current.getBoundingClientRect();
    resz.current = { x: e.clientX, w: r.width };
    // Pin the corner it grew from, or a card in the default bottom-right corner
    // would appear to slide as it widens.
    if (!pos) setPos({ left: r.left, top: r.top });
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      /* older browsers: the window listeners still cover it */
    }
  };

  const close = () => {
    if (controlled) {
      onClose && onClose();
      return;
    }
    setDismissed(true);
    try {
      localStorage.setItem(KEY, "off");
    } catch {
      /* private mode: it reappears next visit, which is acceptable */
    }
  };

  // Seeking. A local file is direct. A YouTube embed is driven by postMessage,
  // which needs enablejsapi=1 on the URL -- added below -- and avoids pulling in
  // YouTube's full JS API just to move the playhead.
  const seek = (sec) => {
    setAt(sec);
    if (!started) setStarted(true);
    if (DEMO_VIDEO_SRC && videoRef.current) {
      videoRef.current.currentTime = sec;
      videoRef.current.play().catch(() => {});
      return;
    }
    const f = frameRef.current;
    if (f && f.contentWindow) {
      f.contentWindow.postMessage(
        JSON.stringify({ event: "command", func: "seekTo", args: [sec, true] }),
        "*"
      );
      f.contentWindow.postMessage(
        JSON.stringify({ event: "command", func: "playVideo", args: [] }),
        "*"
      );
    }
  };

  if (!hasVideo || dismissed) return null;

  const style = {
    ...(pos ? { left: pos.left, top: pos.top, right: "auto", bottom: "auto" } : null),
    // A hand-set width wins over both the default and the --big class.
    ...(size ? { width: size } : null),
  };

  // Which chapter are we in? Only meaningful for a local file, since YouTube does
  // not report position back without its full API.
  const activeIdx = DEMO_VIDEO_SRC
    ? chapters.reduce((acc, c, i) => (at + 0.25 >= c.at ? i : acc), 0)
    : -1;

  const embedUrl = DEMO_VIDEO_EMBED
    ? DEMO_VIDEO_EMBED +
      (DEMO_VIDEO_EMBED.includes("?") ? "&" : "?") +
      "enablejsapi=1&autoplay=1&rel=0&modestbranding=1" +
      (at ? `&start=${Math.floor(at)}` : "")
    : "";

  return (
    <div ref={cardRef} className={"dvid" + (big ? " dvid--big" : "")} style={style}>
      <div className="dvid__bar" onPointerDown={startDrag}>
        <GripVertical size={14} className="dvid__grip" />
        <span className="dvid__title">{title}</span>
        <button
          className="dvid__icon"
          onClick={() => {
            // The toggle is a shortcut, so it has to drop any dragged width or
            // pressing it would appear to do nothing.
            setSize(null);
            setBig((v) => !v);
          }}
          type="button"
          aria-label={big ? "Kichraytirish" : "Kattalashtirish"}
        >
          {big ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
        </button>
        <button className="dvid__icon" onClick={close} type="button" aria-label="Yopish">
          <X size={15} />
        </button>
      </div>

      <div className="dvid__stage">
        {!started ? (
          // Until this is clicked nothing streams. The poster is a plain image.
          <button className="dvid__poster" onClick={() => setStarted(true)} type="button">
            {DEMO_VIDEO_POSTER && <img src={DEMO_VIDEO_POSTER} alt="" />}
            <span className="dvid__play">
              <Play size={20} />
            </span>
            <span className="dvid__hint">Ko'rish</span>
          </button>
        ) : DEMO_VIDEO_EMBED ? (
          <iframe
            ref={frameRef}
            src={embedUrl}
            title={title}
            allow="accelerometer; autoplay; encrypted-media; picture-in-picture; fullscreen"
            allowFullScreen
            loading="lazy"
          />
        ) : (
          <video
            ref={videoRef}
            src={DEMO_VIDEO_SRC}
            poster={DEMO_VIDEO_POSTER || undefined}
            controls
            autoPlay
            playsInline
            preload="metadata"
            onTimeUpdate={(e) => setAt(e.currentTarget.currentTime)}
          />
        )}
      </div>

      {/* Chapters. Hidden while collapsed -- at 300px wide a list of five rows
          would be taller than the video it belongs to. */}
      {big && chapters.length > 0 && (
        <div className="dvid__chapters">
          {chapters.map((c, i) => (
            <button
              key={c.at}
              className={"dvid__chapter" + (i === activeIdx ? " is-on" : "")}
              onClick={() => seek(c.at)}
              type="button"
            >
              <span className="dvid__chapter-at">{mmss(c.at)}</span>
              <span className="dvid__chapter-label">{c.label}</span>
            </button>
          ))}
        </div>
      )}

      {/* Drag to resize. Sized generously because it sits over video: a 6px
          hotspot on a moving image is a fight. */}
      <span
        className="dvid__resize"
        onPointerDown={startResize}
        role="separator"
        aria-label="O'lchamni o'zgartirish"
      />
    </div>
  );
}
