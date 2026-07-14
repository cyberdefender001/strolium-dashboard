// Point this at your Strolium backend. Override in a .env file with
// VITE_API_BASE=https://your-domain  (no trailing slash, no /api).
export const API_BASE =
  import.meta.env.VITE_API_BASE || "https://strolium.orbidefence.com";

// The bot the Telegram Login Widget authenticates against. Its domain must be
// registered with BotFather (/setdomain) or Telegram refuses to render the button.
export const TG_BOT = import.meta.env.VITE_TG_BOT || "strolium_bot";
