// The Strolium mark, drawn as SVG rather than loaded as a PNG.
//
// Why a component and not <img src="/logo.png">: the mark appears at 18px in the
// sidebar and 22px on the login page, where a raster shrinks badly on non-retina
// screens; and it must take the surrounding text colour (it sits on dark panels
// in the app and on white in exports). One path, currentColor, no request.
//
// Geometry traced from Icon_navi_blue.png: a rule at top and bottom, and two
// angled blades meeting at a point just right of centre — an hourglass, which is
// the right mark for a product about deadlines.

export function StroliumMark({ size = 20, className = "" }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 512 594"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      {/* top rule */}
      <rect x="0" y="0" width="508" height="18" rx="2" fill="currentColor" />
      {/* upper blade: full width, narrowing to a point at the right of centre */}
      <path
        d="M0 40 H508 V96 Q508 124 484 140 L340 300 L16 128 Q0 118 0 96 Z"
        fill="currentColor"
      />
      {/* lower blade: mirrors the upper one, widening back out */}
      <path
        d="M172 296 L496 468 Q512 478 512 500 V556 H4 V500 Q4 478 20 462 Z"
        fill="currentColor"
      />
      {/* bottom rule */}
      <rect x="0" y="576" width="508" height="18" rx="2" fill="currentColor" />
    </svg>
  );
}

// Mark plus wordmark, for the login page and anywhere the brand is introduced
// rather than merely indicated.
export function StroliumLogo({ size = 22, className = "" }) {
  return (
    <span className={"stlogo " + className}>
      <StroliumMark size={size} />
      <span className="stlogo__word">Strolium</span>
    </span>
  );
}

export default StroliumMark;
