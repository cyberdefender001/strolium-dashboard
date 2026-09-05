import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

// Every password field in the product gets the same eye. Keeps the caller's
// className so existing eauth styling applies untouched; all other props
// (value, onChange, autoComplete, onKeyDown, autoFocus...) pass through.
export default function PwInput(props) {
  const [show, setShow] = useState(false);
  const { className, style, ...rest } = props;
  return (
    <div style={{ position: "relative" }}>
      <input
        {...rest}
        type={show ? "text" : "password"}
        className={className}
        style={{ paddingRight: 42, width: "100%", boxSizing: "border-box", ...(style || {}) }}
      />
      <button
        type="button"
        tabIndex={-1}
        onClick={() => setShow((s) => !s)}
        aria-label={show ? "Parolni yashirish" : "Parolni ko'rsatish"}
        style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)",
                 background: "none", border: "none", cursor: "pointer",
                 color: "inherit", opacity: 0.6, padding: 4, lineHeight: 0 }}
      >
        {show ? <EyeOff size={16} /> : <Eye size={16} />}
      </button>
    </div>
  );
}
