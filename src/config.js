// Point this at your Strolium backend. Override in a .env file with
// VITE_API_BASE=https://your-domain  (no trailing slash, no /api).
export const API_BASE =
  import.meta.env.VITE_API_BASE || "https://strolium.orbidefence.com";

// The bot the Telegram Login Widget authenticates against. Its domain must be
// registered with BotFather (/setdomain) or Telegram refuses to render the button.
export const TG_BOT = import.meta.env.VITE_TG_BOT || "strolium_bot";

// ---- Demo video on the login screen ---------------------------------------
//
// Set ONE of these.
//
// DEMO_VIDEO_EMBED — an unlisted YouTube (or Vimeo) embed URL. Use this if you
//   care about people on slow connections: the platform serves several bitrates
//   and the player picks one per viewer. A self-hosted MP4 has exactly ONE
//   bitrate, so a 40 MB file on a 3G phone pauses no matter how the player is
//   written. Example:
//     "https://www.youtube-nocookie.com/embed/XXXXXXXXXXX?rel=0&modestbranding=1"
//
// DEMO_VIDEO_SRC — a file you host yourself, e.g. dropped in public/ and served
//   from Netlify as "/demo.mp4". Simplest, no third party, no adaptive bitrate.
//   Keep it under ~15 MB if you go this way.
//
// DEMO_VIDEO_POSTER — a still frame. Worth setting either way: it paints
//   instantly, so the card never shows an empty black box while the video loads.
export const DEMO_VIDEO_EMBED = import.meta.env.VITE_DEMO_VIDEO_EMBED || "";
export const DEMO_VIDEO_SRC = import.meta.env.VITE_DEMO_VIDEO_SRC || "";
export const DEMO_VIDEO_POSTER = import.meta.env.VITE_DEMO_VIDEO_POSTER || "";

// Chapters, like YouTube's. Edit this list directly -- it is content, not config,
// so it does not belong in an env var. `at` is seconds from the start.
//
// Clicking a chapter seeks the video. That works for a self-hosted file and for a
// YouTube embed (the embed gets enablejsapi=1 and is driven by postMessage).
// The "currently playing" highlight only works for a self-hosted file: YouTube
// does not report playback position back to us without loading its full JS API,
// which is a few hundred KB we are deliberately not pulling in.
export const DEMO_VIDEO_CHAPTERS = [
  { at: 0, label: "Stroliumda ro'yxatdan o'tish" },
  { at: 85, label: "Strolium funksionalligi" },
  { at: 131, label: "Topshiriqlar berish va qabul qilish" },
  { at: 167, label: "Xarajatlarni boshqarish" },
];
