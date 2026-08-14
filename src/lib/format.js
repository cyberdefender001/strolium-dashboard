export function fmtSom(n, withUnit = true) {
  const abs = Math.abs(n);
  let out;
  if (abs >= 1e9) out = (n / 1e9).toFixed(1) + " mlrd";
  else if (abs >= 1e6) out = (n / 1e6).toFixed(1) + " mln";
  else if (abs >= 1e3) out = Math.round(n / 1e3) + " ming";
  else out = String(Math.round(n));
  return withUnit ? out + " so'm" : out;
}

// Exact, grouped so'm. Use for prices and invoice figures, where "2.4 mln"
// loses digits the reader needs. fmtSom stays the default for dashboard stats.
export function fmtSomExact(n, withUnit = true) {
  const v = Number(n);
  if (!Number.isFinite(v)) return String(n);
  const out = Math.round(v).toLocaleString("ru-RU").replace(/\u00a0/g, " ");
  return withUnit ? out + " so'm" : out;
}

export function fmtSigned(n) {
  const s = fmtSom(Math.abs(n));
  return (n < 0 ? "−" : "") + s;
}

export function initials(name = "") {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");
}
