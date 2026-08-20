import { useState } from "react";
import { ExternalLink as ExternalLinkIcon, Check, Copy } from "lucide-react";

/**
 * External link that actually works inside an embedded/sandboxed frame.
 *
 * WHY THIS EXISTS
 * A plain <a target="_blank"> is silently swallowed when the app runs inside an
 * iframe whose sandbox attribute omits `allow-popups` — which is how the Base44
 * preview (and some embeds) render it. The anchor looks correct, the markup is
 * correct, the click does nothing. No error, no navigation.
 *
 * THE FIX
 * Intercept the click and open the window ourselves. window.open returns null
 * (or throws) when the sandbox blocks it, which gives us a reliable signal —
 * unlike the anchor, which fails silently. On block, fall back to navigating
 * the top-level frame, and if even that is denied, surface a copy-link control
 * so the host is never stuck staring at a dead link.
 *
 * Keep rel="noopener noreferrer" on the anchor: it still governs the fallback
 * path and keeps the markup correct for anyone reading it or middle-clicking.
 */
export default function ExternalLink({ href, children, className = "", showIcon = true }) {
  const [blocked, setBlocked] = useState(false);
  const [copied, setCopied] = useState(false);

  const open = (e) => {
    if (!href) return;
    // Let modified clicks (new tab/window, middle click) behave natively.
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button === 1) return;
    e.preventDefault();

    let win = null;
    try {
      win = window.open(href, "_blank", "noopener,noreferrer");
    } catch {
      win = null;
    }
    if (win) {
      try { win.opener = null; } catch { /* already severed by noopener */ }
      return;
    }

    // Popup blocked by the sandbox. Try navigating the outermost frame.
    try {
      const target = window.top || window;
      target.location.href = href;
      return;
    } catch {
      /* cross-origin top frame — cannot navigate it */
    }
    try {
      window.location.href = href;
      return;
    } catch {
      /* fall through */
    }
    setBlocked(true);
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <span className="inline-flex flex-col gap-1">
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        onClick={open}
        onAuxClick={(e) => { if (e.button === 1) e.stopPropagation(); }}
        className={`cursor-pointer ${className}`}
      >
        {children}
        {showIcon && <ExternalLinkIcon className="w-3.5 h-3.5 text-brand-mutedtext inline-block ml-1.5 align-[-2px]" />}
      </a>

      {blocked && (
        <span className="inline-flex items-center gap-2 text-xs text-brand-mutedtext">
          <span>Your browser blocked the pop-up.</span>
          <button
            type="button"
            onClick={copy}
            className="inline-flex items-center gap-1 text-brand-gold hover:underline"
          >
            {copied ? <><Check className="w-3 h-3" /> Copied</> : <><Copy className="w-3 h-3" /> Copy link</>}
          </button>
        </span>
      )}
    </span>
  );
}
