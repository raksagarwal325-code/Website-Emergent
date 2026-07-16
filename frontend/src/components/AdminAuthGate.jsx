import React, { useEffect, useState } from "react";
import { LogIn, LogOut, ShieldCheck, ShieldAlert } from "lucide-react";
import { api } from "../lib/api";

/**
 * Wraps every admin route. Handles three states:
 *   • checking     — verifying cookie via /api/auth/me (null user, no error)
 *   • authenticated — renders children
 *   • not-authenticated — renders Google sign-in card
 *
 * Also handles the OAuth return trip: if the URL contains a
 * `#session_id=…` fragment (dropped there by auth.emergentagent.com), we
 * synchronously exchange it for a session cookie BEFORE the me-check runs,
 * so the user lands directly on the admin instead of the login card.
 *
 * REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
 */
export default function AdminAuthGate({ children }) {
  const [state, setState] = useState("checking"); // "checking" | "ok" | "anon" | "denied"
  const [user, setUser] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      // 1) Handle the OAuth callback fragment FIRST. We must exchange the
      //    one-time session_id for a cookie session before /auth/me runs,
      //    otherwise /auth/me sees no cookie and shows the login card.
      const hash = window.location.hash || "";
      const m = hash.match(/session_id=([^&]+)/);
      if (m) {
        const sid = decodeURIComponent(m[1]);
        // Clean the hash immediately so a refresh doesn't re-exchange.
        try {
          window.history.replaceState(null, "", window.location.pathname + window.location.search);
        } catch {} // eslint-disable-line no-empty
        try {
          const u = await api.authSession(sid);
          if (!cancelled) {
            setUser(u);
            setState("ok");
          }
          return;
        } catch (err) {
          if (!cancelled) {
            const status = err?.response?.status;
            if (status === 403) {
              setError(err.response.data?.detail || "This Google account is not authorised for this admin area.");
              setState("denied");
            } else {
              setError("Sign-in failed. Please try again.");
              setState("anon");
            }
          }
          return;
        }
      }

      // 2) Otherwise, ask the backend if there's a valid cookie session.
      try {
        const u = await api.authMe();
        if (!cancelled) {
          setUser(u);
          setState("ok");
        }
      } catch (err) {
        if (!cancelled) setState("anon");
      }
    }

    bootstrap();
    return () => { cancelled = true; };
  }, []);

  const signIn = () => {
    // REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
    const redirectUrl = window.location.origin + "/admin";
    window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
  };

  const signOut = async () => {
    try { await api.authLogout(); } catch { /* ignore */ }
    setUser(null);
    setState("anon");
  };

  if (state === "checking") {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-white/60 flex items-center justify-center text-sm tracking-widest uppercase">
        Verifying session…
      </div>
    );
  }

  if (state === "denied") {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center px-4">
        <div className="max-w-sm w-full border border-red-500/40 p-8 text-center space-y-4">
          <ShieldAlert size={32} className="mx-auto text-red-400" />
          <div className="font-serif text-xl text-white">Access denied</div>
          <p className="text-white/60 text-sm leading-relaxed">{error}</p>
          <button
            onClick={signIn}
            className="mt-2 inline-flex items-center gap-2 text-[11px] uppercase tracking-widest border border-[#D4AF37]/60 text-[#D4AF37] hover:bg-[#D4AF37] hover:text-black transition px-4 py-2"
            data-testid="admin-signin-btn"
          >
            <LogIn size={14} /> Try a different account
          </button>
        </div>
      </div>
    );
  }

  if (state === "anon") {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center px-4">
        <div className="max-w-sm w-full border border-white/10 p-8 text-center space-y-4">
          <ShieldCheck size={32} className="mx-auto text-[#D4AF37]" />
          <div className="font-serif text-2xl text-white">Admin sign-in</div>
          <p className="text-white/50 text-xs leading-relaxed">
            Only allowlisted Google accounts can access the Samrat Glass Emporium admin panel.
          </p>
          {error && <p className="text-red-400 text-xs">{error}</p>}
          <button
            onClick={signIn}
            data-testid="admin-signin-btn"
            className="w-full inline-flex items-center justify-center gap-2 text-xs uppercase tracking-widest border border-[#D4AF37]/60 text-[#D4AF37] hover:bg-[#D4AF37] hover:text-black transition px-4 py-3"
          >
            <LogIn size={14} /> Sign in with Google
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Small admin toolbar shown across all admin views */}
      <div className="border-b border-white/10 bg-[#0a0a0a] px-6 py-2 flex items-center justify-between text-xs text-white/60">
        <div className="flex items-center gap-2">
          <ShieldCheck size={12} className="text-[#D4AF37]" />
          <span className="uppercase tracking-widest text-[10px]">Signed in as</span>
          <span className="text-white/80" data-testid="admin-email">{user?.email}</span>
        </div>
        <button
          onClick={signOut}
          data-testid="admin-signout-btn"
          className="inline-flex items-center gap-1 hover:text-[#D4AF37]"
        >
          <LogOut size={12} /> Sign out
        </button>
      </div>
      {children}
    </div>
  );
}
