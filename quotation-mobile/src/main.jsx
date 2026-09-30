import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { Toaster } from "sonner";
import InquiryQuotationBuilder from "../../frontend/src/components/InquiryQuotationBuilder.jsx";
import { api } from "./api.js";
import "./style.css";

function App() {
  const [state, setState] = useState("checking");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let active = true;
    const match = location.hash.match(/(?:^#|&)session_id=([^&]+)/);
    if (match) history.replaceState(null, "", location.pathname + location.search);
    const check = match ? api.authSession(decodeURIComponent(match[1])) : api.authMe();
    check.then(user => { if (active) { setEmail(user.email); setState("ready"); } })
      .catch(err => { if (active) { setError(err.response?.status === 403 ? "This Google account is not authorised." : match ? "Sign-in failed. Please try again." : ""); setState("signed-out"); } });
    return () => { active = false; };
  }, []);
  const signIn = () => { location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(location.origin + "/")}`; };
  const signOut = async () => { try { await api.authLogout(); } finally { setOpen(false); setState("signed-out"); setEmail(""); } };

  return <main className="mx-auto max-w-lg px-5 py-12">
    <div className="eyebrow">Samrat Glass Emporium</div>
    <h1 className="font-serif mt-4 text-4xl">Quotations</h1>
    {state === "checking" ? <p className="mt-8 text-white/60">Verifying session…</p> : state === "signed-out" ? <section className="mt-8 border border-white/15 p-5">
      <p className="text-sm text-white/70">Sign in with your authorised admin Google account to use the same saved quotations as the website.</p>
      {error && <p role="alert" className="mt-3 text-red-300">{error}</p>}
      <button type="button" onClick={signIn} className="mt-5 w-full bg-[#d4af37] px-5 py-4 font-semibold text-black">Sign in with Google</button>
    </section> : <section className="mt-8">
      <p className="text-xs text-white/55">Signed in as {email}</p>
      <button type="button" onClick={() => setOpen(true)} className="mt-5 w-full bg-[#d4af37] px-5 py-4 font-semibold text-black">New quotation / saved quotations</button>
      <button type="button" onClick={signOut} className="mt-5 text-sm text-white/60 underline">Sign out</button>
      {open && <InquiryQuotationBuilder inquiry={{}} onClose={() => setOpen(false)} />}
    </section>}
    <Toaster richColors position="top-center" />
  </main>;
}

createRoot(document.getElementById("root")).render(<App />);
