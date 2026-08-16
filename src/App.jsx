import React, { useEffect, useRef, useState, useContext, createContext } from "react";
import {
  Package, Warehouse, Truck, ClipboardCheck, RotateCcw, Boxes, ShieldCheck,
  Zap, Globe2, ChevronDown, ChevronRight, Menu, X, ArrowUpRight, Star,
  MapPin, PackageCheck, ScanBarcode, PlaneTakeoff, CheckCircle2, Sparkles,
  Receipt, Clock, CreditCard, LifeBuoy,
  User, Store, Phone, MessageCircle, Landmark, Hash, TrendingUp, Mail, BadgeCheck, ImagePlus,
  Eye, Printer, FileText, Bell, Crown, Download,
} from "lucide-react";
import { supabase, ADMIN_EMAILS } from "./supabaseClient.js";

/* ---------------------------------------------------------
   EmirateFulfil — Homepage
   Palette: Royal Navy #0B1F3A · Emerald #00C896 · Gold #F8B400
   Type: Plus Jakarta Sans (display) · Inter (body) · Space Grotesk (numerals)
--------------------------------------------------------- */

// Site logo: admin can upload a custom picture from the Admin tab (stored in
// Supabase Storage + app_settings table). Until one is set, every spot that
// shows the logo falls back to the original PackageCheck icon in a gradient
// box, so nothing looks broken on a fresh install.
const LogoContext = createContext({ logoUrl: null, setLogoUrl: () => {} });

function Logo({ box = "w-9 h-9", icon = "w-5 h-5" }) {
  const { logoUrl } = useContext(LogoContext);
  if (logoUrl) {
    return (
      <img
        src={logoUrl}
        alt="EmirateFulfil logo"
        className={`${box} rounded-xl object-cover flex-shrink-0`}
      />
    );
  }
  return (
    <div className={`${box} rounded-xl flex items-center justify-center flex-shrink-0`} style={{ background: "linear-gradient(135deg,#00C896,#0B1F3A)" }}>
      <PackageCheck className={`${icon} text-white`} />
    </div>
  );
}

// Product picture: shows the uploaded image if a product has one, otherwise
// falls back to the emoji (so old products without a picture still look fine).
// `size` sets the emoji font-size fallback; pass a wrapper with your own
// width/height/rounded classes around this.
function ProductThumb({ product, size = 40, className = "" }) {
  if (product?.image_url) {
    return (
      <img
        src={product.image_url}
        alt={product.name || "Product"}
        className={`w-full h-full object-cover ${className}`}
      />
    );
  }
  return <span style={{ fontSize: size }} className={className}>{product?.emoji || "📦"}</span>;
}

// Reusable "upload a picture to Supabase Storage" helper — same public-assets
// bucket the site logo uses, just under a products/ prefix so files don't clash.
async function uploadProductImage(file) {
  if (!file) return { url: null, error: "No file" };
  if (!file.type.startsWith("image/")) return { url: null, error: "Please choose an image file." };
  const ext = file.name.split(".").pop() || "jpg";
  const path = `products/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error: upErr } = await supabase.storage.from("public-assets").upload(path, file, { upsert: true, cacheControl: "3600" });
  if (upErr) return { url: null, error: "Could not upload the picture." };
  const { data } = supabase.storage.from("public-assets").getPublicUrl(path);
  return { url: data?.publicUrl || null, error: null };
}

// Same "upload to Supabase Storage" pattern as the logo/product pictures,
// used for photos attached to ticket messages (seller or Customer Support).
async function uploadTicketImage(file) {
  if (!file) return { url: null, error: "No file" };
  if (!file.type.startsWith("image/")) return { url: null, error: "Please choose an image file." };
  const ext = file.name.split(".").pop() || "jpg";
  const path = `tickets/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error: upErr } = await supabase.storage.from("public-assets").upload(path, file, { upsert: true, cacheControl: "3600" });
  if (upErr) return { url: null, error: "Could not upload the picture." };
  const { data } = supabase.storage.from("public-assets").getPublicUrl(path);
  return { url: data?.publicUrl || null, error: null };
}

// Shortens a product title to its first N words for tight table cells (the
// full title is still available via a `title` tooltip on the element that
// uses this, so nothing is actually lost — just not shown inline).
function truncateWords(text, n = 4) {
  if (!text) return "—";
  const words = text.trim().split(/\s+/);
  if (words.length <= n) return text;
  return words.slice(0, n).join(" ") + "…";
}

// Cleans up how a raw seller-entered product title *displays* — collapses
// double spaces, straightens stray punctuation, and normalizes unit casing
// (e.g. "60Ml" / "60ML" -> "60ml", "500Gm" -> "500g") so listings look tidy
// even when the underlying title was typed inconsistently. Purely cosmetic:
// the stored product.name is never modified.
function formatTitle(name) {
  if (!name) return "";
  let t = name.trim().replace(/\s+/g, " ");
  t = t.replace(/\s+([,.])/g, "$1");
  t = t.replace(/(\d+)\s*(ml|l|kg|g|gm|mg|pcs|pc|oz)\b/gi, (_, num, unit) => {
    const map = { ml: "ml", l: "L", kg: "kg", g: "g", gm: "g", mg: "mg", pcs: "pcs", pc: "pc", oz: "oz" };
    return `${num}${map[unit.toLowerCase()] || unit}`;
  });
  return t;
}

const FONT_LINK_ID = "emiratefulfil-fonts";


// Some `app_settings` values (like the customer-reviews JSON, which can
// include long Arabic quotes) can be bigger than a single row's `value`
// column comfortably holds. Rather than requiring anyone to go into
// Supabase and widen the column by hand, we just split big values into
// small numbered rows (key, key:1, key:2, ...) and reassemble them on
// read. Small values still fit in one row exactly like before.
const SETTINGS_CHUNK_SIZE = 180;

async function saveChunkedSetting(baseKey, value) {
  const str = value ?? "";
  const chunks = [];
  for (let i = 0; i < str.length; i += SETTINGS_CHUNK_SIZE) chunks.push(str.slice(i, i + SETTINGS_CHUNK_SIZE));
  if (chunks.length === 0) chunks.push("");

  // Clean up any leftover chunk rows from a previous, longer save before
  // writing the new ones (so old trailing chunks don't linger).
  const { data: existing } = await supabase.from("app_settings").select("key").like("key", `${baseKey}:%`);
  const keepKeys = chunks.map((_, i) => `${baseKey}:${i}`);
  const staleKeys = (existing || []).map((r) => r.key).filter((k) => !keepKeys.includes(k));
  if (staleKeys.length) await supabase.from("app_settings").delete().in("key", staleKeys);

  const rows = chunks.map((c, i) => ({ key: `${baseKey}:${i}`, value: c }));
  const { error } = await supabase.from("app_settings").upsert(rows, { onConflict: "key" });
  return { error };
}

async function loadChunkedSetting(baseKey) {
  const { data: rows, error } = await supabase
    .from("app_settings")
    .select("key,value")
    .like("key", `${baseKey}:%`);
  if (error || !rows || !rows.length) return null;
  rows.sort((a, b) => (parseInt(a.key.split(":").pop(), 10) || 0) - (parseInt(b.key.split(":").pop(), 10) || 0));
  return rows.map((r) => r.value ?? "").join("");
}

function useGoogleFonts() {
  useEffect(() => {
    if (document.getElementById(FONT_LINK_ID)) return;
    const link = document.createElement("link");
    link.id = FONT_LINK_ID;
    link.rel = "stylesheet";
    link.href =
      "https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@500;600;700;800&family=Inter:wght@400;500;600&family=Space+Grotesk:wght@500;600;700&display=swap";
    document.head.appendChild(link);
  }, []);
}

function useReveal() {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          io.disconnect();
        }
      },
      { threshold: 0.18 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return [ref, visible];
}

function Reveal({ children, delay = 0, className = "" }) {
  const [ref, visible] = useReveal();
  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0px)" : "translateY(28px)",
        transition: `opacity 0.7s cubic-bezier(.2,.7,.2,1) ${delay}ms, transform 0.7s cubic-bezier(.2,.7,.2,1) ${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}

function Counter({ to, suffix = "", prefix = "", duration = 1600 }) {
  const [ref, visible] = useReveal();
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!visible) return;
    let start = null;
    const step = (ts) => {
      if (!start) start = ts;
      const p = Math.min((ts - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setVal(Math.floor(eased * to));
      if (p < 1) requestAnimationFrame(step);
      else setVal(to);
    };
    requestAnimationFrame(step);
  }, [visible, to, duration]);
  return (
    <span ref={ref} style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
      {prefix}
      {val.toLocaleString()}
      {suffix}
    </span>
  );
}

/* ---------------- NAVBAR ---------------- */
function Navbar({ session, onNav, onLogout }) {
  const [open, setOpen] = useState(false);
  const [mega, setMega] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const services = [
    { icon: Package, label: "Dropshipping", desc: "Ship without holding stock" },
    { icon: Warehouse, label: "Warehousing", desc: "Storage across the Gulf" },
    { icon: Boxes, label: "Pick & Pack", desc: "Order prep, done right" },
    { icon: Truck, label: "Last Mile Delivery", desc: "To every emirate & beyond" },
    { icon: RotateCcw, label: "Returns Management", desc: "Reverse logistics handled" },
    { icon: ScanBarcode, label: "Amazon FBA Prep", desc: "Label, box, ship to FBA" },
  ];

  return (
    <div
      className="fixed top-0 left-0 right-0 z-50 transition-all duration-300"
      style={{
        background: scrolled ? "rgba(8,18,33,0.85)" : "transparent",
        backdropFilter: scrolled ? "blur(14px)" : "none",
        borderBottom: scrolled ? "1px solid rgba(255,255,255,0.08)" : "1px solid transparent",
      }}
    >
      <div className="text-center text-xs py-1.5 tracking-wide" style={{ background: "linear-gradient(90deg,#00C896,#0B1F3A)", color: "#fff", display: scrolled ? "none" : "block" }}>
        Now fulfilling across UAE · KSA · Qatar · Oman · Bahrain · Kuwait
      </div>
      <nav className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        <a href="#" className="flex items-center gap-2.5">
          <Logo />
          <span className="font-bold text-white text-lg" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            Emirate<span style={{ color: "#00C896" }}>Fulfil</span>
          </span>
        </a>

        <div className="hidden lg:flex items-center gap-8 text-sm font-medium text-white/80">
          <div className="relative" onMouseEnter={() => setMega(true)} onMouseLeave={() => setMega(false)}>
            <button className="flex items-center gap-1 hover:text-white transition-colors">
              Services <ChevronDown className="w-3.5 h-3.5" />
            </button>
            <div
              className="absolute top-full left-1/2 -translate-x-1/2 pt-4"
              style={{
                opacity: mega ? 1 : 0,
                visibility: mega ? "visible" : "hidden",
                transform: mega ? "translate(-50%,0)" : "translate(-50%,-8px)",
                transition: "all 0.25s ease",
              }}
            >
              <div className="grid grid-cols-2 gap-1 p-4 rounded-2xl w-[440px]" style={{ background: "#0F2440", border: "1px solid rgba(255,255,255,0.08)", boxShadow: "0 24px 60px rgba(0,0,0,0.45)" }}>
                {services.map((s, i) => (
                  <a key={i} href="#services" className="flex items-start gap-3 p-3 rounded-xl hover:bg-white/5 transition-colors">
                    <s.icon className="w-4.5 h-4.5 mt-0.5" style={{ color: "#00C896" }} />
                    <div>
                      <div className="text-white text-sm font-semibold">{s.label}</div>
                      <div className="text-white/50 text-xs mt-0.5">{s.desc}</div>
                    </div>
                  </a>
                ))}
              </div>
            </div>
          </div>
          <a href="#how" className="hover:text-white transition-colors">How it works</a>
          <a href="#testimonials" className="hover:text-white transition-colors">Customers</a>
          <a href="#faq" className="hover:text-white transition-colors">FAQ</a>
        </div>

        <div className="hidden lg:flex items-center gap-3">
          {session ? (
            <>
              <button onClick={() => onNav("dashboard")} className="text-sm font-semibold text-white/85 hover:text-white transition-colors px-4 py-2">Dashboard</button>
              <button
                onClick={onLogout}
                className="text-sm font-semibold px-5 py-2.5 rounded-full transition-transform hover:scale-105"
                style={{ background: "rgba(255,255,255,0.08)", color: "#fff" }}
              >
                Log out
              </button>
            </>
          ) : (
            <>
              <button onClick={() => onNav("login")} className="text-sm font-semibold text-white/85 hover:text-white transition-colors px-4 py-2">Log in</button>
              <button
                onClick={() => onNav("signup")}
                className="text-sm font-semibold px-5 py-2.5 rounded-full transition-transform hover:scale-105"
                style={{ background: "linear-gradient(135deg,#00C896,#00a67e)", color: "#04140f", boxShadow: "0 8px 24px rgba(0,200,150,0.35)" }}
              >
                Start free
              </button>
            </>
          )}
        </div>

        <button className="lg:hidden text-white" onClick={() => setOpen(!open)}>
          {open ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </nav>

      {open && (
        <div className="lg:hidden px-6 pb-6 flex flex-col gap-4 text-white/85 text-sm" style={{ background: "#0B1F3A" }}>
          <a href="#services">Services</a>
          <a href="#how">How it works</a>
          <a href="#testimonials">Customers</a>
          <a href="#faq">FAQ</a>
          {session ? (
            <button onClick={() => onNav("dashboard")} className="mt-2 text-sm font-semibold px-5 py-2.5 rounded-full" style={{ background: "#00C896", color: "#04140f" }}>
              Go to dashboard
            </button>
          ) : (
            <button onClick={() => onNav("signup")} className="mt-2 text-sm font-semibold px-5 py-2.5 rounded-full" style={{ background: "#00C896", color: "#04140f" }}>
              Start free
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/* ---------------- HERO ---------------- */
function Hero({ onSignup }) {
  const icons = [Package, Truck, Warehouse, Boxes, PlaneTakeoff];
  return (
    <section className="relative overflow-hidden" style={{ background: "linear-gradient(180deg,#081221 0%,#0B1F3A 55%,#0B1F3A 100%)" }}>
      <style>{`
        @keyframes blobMove { 0%,100%{ transform: translate(0,0) scale(1);} 33%{ transform: translate(30px,-40px) scale(1.08);} 66%{ transform: translate(-25px,25px) scale(0.96);} }
        @keyframes floatY { 0%,100%{ transform: translateY(0);} 50%{ transform: translateY(-16px);} }
        @keyframes boatDrift { 0%,100%{ transform: translateX(0);} 50%{ transform: translateX(24px);} }
        @keyframes shimmer { 0%{ background-position: -200% 0;} 100%{ background-position: 200% 0;} }
      `}</style>

      <div className="absolute -top-40 -left-40 w-[520px] h-[520px] rounded-full opacity-30 blur-3xl" style={{ background: "#00C896", animation: "blobMove 14s ease-in-out infinite" }} />
      <div className="absolute top-20 -right-40 w-[560px] h-[560px] rounded-full opacity-20 blur-3xl" style={{ background: "#F8B400", animation: "blobMove 18s ease-in-out infinite reverse" }} />

      {icons.map((Icon, i) => (
        <div
          key={i}
          className="hidden md:block absolute opacity-20"
          style={{
            top: `${14 + i * 15}%`,
            left: i % 2 === 0 ? `${6 + i * 3}%` : undefined,
            right: i % 2 !== 0 ? `${6 + i * 4}%` : undefined,
            animation: `floatY ${5 + i}s ease-in-out infinite`,
            animationDelay: `${i * 0.4}s`,
          }}
        >
          <Icon className="w-10 h-10 text-white" />
        </div>
      ))}

      {/* Happy courier illustration — wears an EmirateFulfil-branded uniform.
          Hand-drawn flat vector (not a photo) to match the site's own icon/skyline
          illustration style used elsewhere. Hidden on small screens so it never
          crowds the headline. */}
      <div className="hidden xl:block absolute right-6 bottom-0 w-56 opacity-95 pointer-events-none" style={{ animation: "floatY 7s ease-in-out infinite" }}>
        <svg viewBox="0 0 220 320" xmlns="http://www.w3.org/2000/svg">
          <ellipse cx="110" cy="300" rx="50" ry="9" fill="#ffffff" opacity="0.06" />
          {/* legs */}
          <rect x="84" y="205" width="20" height="62" rx="8" fill="#374151" />
          <rect x="116" y="205" width="20" height="62" rx="8" fill="#374151" />
          {/* shoes */}
          <rect x="78" y="260" width="30" height="14" rx="6" fill="#1F2937" />
          <rect x="112" y="260" width="30" height="14" rx="6" fill="#1F2937" />
          {/* back arm holding a parcel */}
          <rect x="52" y="150" width="20" height="55" rx="10" fill="#00a67e" transform="rotate(20 62 150)" />
          <rect x="34" y="192" width="36" height="30" rx="4" fill="#F8B400" />
          <rect x="40" y="198" width="24" height="4" fill="#0B1F3A" opacity="0.35" />
          {/* torso / branded vest */}
          <path d="M78 130 Q110 118 142 130 L148 214 Q110 227 72 214 Z" fill="#00C896" />
          <rect x="98" y="176" width="24" height="18" rx="3" fill="#00a67e" />
          <text x="110" y="151" textAnchor="middle" fontFamily="'Plus Jakarta Sans', sans-serif" fontWeight="800" fontSize="11" fill="#ffffff">EmirateFulfil</text>
          {/* name badge */}
          <circle cx="88" cy="168" r="7" fill="#ffffff" />
          <text x="88" y="171" textAnchor="middle" fontFamily="'Space Grotesk', sans-serif" fontWeight="700" fontSize="7" fill="#0B7A5E">EF</text>
          {/* front arm — thumbs up */}
          <rect x="132" y="140" width="20" height="52" rx="10" fill="#00C896" transform="rotate(-32 142 140)" />
          <circle cx="172" cy="118" r="10" fill="#F2C9A0" />
          <rect x="168" y="108" width="7" height="14" rx="3" fill="#F2C9A0" />
          {/* neck */}
          <rect x="100" y="108" width="20" height="18" fill="#F2C9A0" />
          {/* head */}
          <circle cx="110" cy="88" r="30" fill="#F2C9A0" />
          {/* cap */}
          <path d="M76 80 Q110 56 144 80 L144 87 Q110 66 76 87 Z" fill="#00C896" />
          <ellipse cx="128" cy="87" rx="15" ry="5" fill="#0B7A5E" />
          {/* happy face */}
          <circle cx="100" cy="90" r="2.4" fill="#1F2937" />
          <circle cx="120" cy="90" r="2.4" fill="#1F2937" />
          <path d="M98 100 Q110 109 122 100" stroke="#1F2937" strokeWidth="2.2" fill="none" strokeLinecap="round" />
          {/* twinkling sparkle stars — the courier just made a happy delivery */}
          <circle cx="150" cy="55" r="2.2" fill="#F8B400"><animate attributeName="opacity" values="1;0.15;1" dur="1.8s" repeatCount="indefinite" /></circle>
          <circle cx="170" cy="72" r="1.6" fill="#7FE8C9"><animate attributeName="opacity" values="1;0.15;1" dur="2.3s" repeatCount="indefinite" begin="0.4s" /></circle>
          <circle cx="60" cy="65" r="1.8" fill="#F8B400"><animate attributeName="opacity" values="1;0.15;1" dur="2.1s" repeatCount="indefinite" begin="0.8s" /></circle>
        </svg>
      </div>

      {/* Delivery truck drifting along the bottom of the hero, on a loop */}
      <div className="hidden md:block absolute left-0 right-0 bottom-6 h-14 overflow-hidden pointer-events-none opacity-40">
        <div style={{ animation: "truckDrive 16s linear infinite" }}>
          <svg viewBox="0 0 200 90" className="w-44 h-auto" xmlns="http://www.w3.org/2000/svg">
            {/* van body */}
            <path d="M8 60 L8 30 Q8 24 14 24 L120 24 L120 14 Q120 10 124 10 L160 10 Q166 10 170 16 L182 34 Q186 38 186 44 L186 60 Z" fill="#F4F6F9" stroke="#0B1F3A" strokeWidth="1.5" />
            {/* cab window */}
            <path d="M126 16 L126 24 L164 24 L156 16 Z" fill="#0B1F3A" opacity="0.55" />
            {/* brand stripe */}
            <rect x="8" y="46" width="178" height="10" fill="#00C896" />
            {/* brand wordmark on the side panel */}
            <text x="60" y="53.5" fontFamily="'Plus Jakarta Sans', sans-serif" fontWeight="800" fontSize="9" fill="#0B1F3A">EmirateFulfil</text>
            {/* logo mark */}
            <circle cx="30" cy="35" r="9" fill="#0B1F3A" />
            <path d="M26 35 L29 38 L35 31" stroke="#00C896" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            {/* wheels */}
            <circle cx="40" cy="62" r="9" fill="#1F2937" />
            <circle cx="40" cy="62" r="3.5" fill="#9CA3AF" />
            <circle cx="150" cy="62" r="9" fill="#1F2937" />
            <circle cx="150" cy="62" r="3.5" fill="#9CA3AF" />
          </svg>
        </div>
      </div>
      <style>{`
        @keyframes truckDrive {
          from { transform: translateX(-180px); }
          to { transform: translateX(calc(100vw + 180px)); }
        }
      `}</style>

      <div className="relative max-w-7xl mx-auto px-6 pt-40 pb-28 text-center">
        <Reveal>
          <span className="inline-flex items-center gap-2 text-xs font-semibold px-4 py-1.5 rounded-full" style={{ background: "rgba(0,200,150,0.12)", color: "#00e0aa", border: "1px solid rgba(0,200,150,0.3)" }}>
            <Sparkles className="w-3.5 h-3.5" /> Built for GCC ecommerce
          </span>
        </Reveal>

        <Reveal delay={100}>
          <h1 className="mt-7 text-white font-extrabold leading-[1.05] text-5xl md:text-7xl" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            Powering UAE
            <br />
            <span style={{ background: "linear-gradient(90deg,#00C896,#F8B400)", WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}>
              Ecommerce Fulfillment
            </span>
          </h1>
        </Reveal>

        <Reveal delay={200}>
          <p className="mt-6 text-lg text-white/60 max-w-2xl mx-auto" style={{ fontFamily: "Inter, sans-serif" }}>
            One platform to source, warehouse, pack, and deliver — across the UAE, Saudi Arabia, Qatar, Oman, Bahrain and Kuwait. Built for suppliers and sellers who move fast.
          </p>
        </Reveal>

        <Reveal delay={300}>
          <div className="mt-9 flex flex-col sm:flex-row items-center justify-center gap-4">
            <button onClick={onSignup} className="group text-sm font-semibold px-7 py-3.5 rounded-full flex items-center gap-2 transition-transform hover:scale-105" style={{ background: "linear-gradient(135deg,#00C896,#00a67e)", color: "#04140f", boxShadow: "0 12px 32px rgba(0,200,150,0.4)" }}>
              Get started free <ArrowUpRight className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </button>
            <button className="text-sm font-semibold px-7 py-3.5 rounded-full text-white border border-white/20 hover:bg-white/5 transition-colors">
              Talk to sales
            </button>
          </div>
        </Reveal>

        <Reveal delay={420}>
          <div className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-8 max-w-3xl mx-auto">
            {[
              { to: 6, suffix: "", label: "GCC markets" },
              { to: 1200, suffix: "+", label: "Active suppliers" },
              { to: 98, suffix: "%", label: "On-time delivery" },
              { to: 24, suffix: "h", label: "Avg. dispatch time" },
            ].map((s, i) => (
              <div key={i}>
                <div className="text-3xl md:text-4xl font-bold text-white"><Counter to={s.to} suffix={s.suffix} /></div>
                <div className="text-xs text-white/45 mt-1 tracking-wide uppercase">{s.label}</div>
              </div>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ---------------- TRUST STRIP ---------------- */
function TrustStrip() {
  const names = ["Noon Express", "Aramex", "Shopify", "Salla", "Zid", "SMSA"];
  return (
    <div className="py-10" style={{ background: "#081221" }}>
      <p className="text-center text-xs tracking-[0.2em] text-white/35 uppercase mb-6">Integrated with the platforms sellers already use</p>
      <div className="flex flex-wrap justify-center gap-x-12 gap-y-4 max-w-5xl mx-auto px-6">
        {names.map((n, i) => (
          <span key={i} className="text-white/40 font-semibold text-lg" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{n}</span>
        ))}
      </div>
    </div>
  );
}

/* ---------------- FEATURES (plan comparison table) ---------------- */
// Replaces the old icon-grid Features section with a "Our Features" style
// comparison table: feature rows down the left, plan columns across the
// top (each cell either a short text value or a check/cross). Content is
// admin-editable (Admin tab → "Features comparison"), stored as JSON in
// app_settings under key "features_table_content" (chunked — see
// saveChunkedSetting/loadChunkedSetting — since the full table can exceed
// one row's column size). Falls back to DEFAULT_FEATURES_TABLE until an
// admin saves their own version, so a fresh install still looks complete.
const DEFAULT_FEATURES_TABLE = {
  headline: "Our Features",
  plans: [
    { name: "Starter", badge: "FREE", subtitle: "For experts", price: "$0" },
    { name: "Growth", badge: "POPULAR", subtitle: "For growing sellers", price: "$349" },
    { name: "Enterprise", badge: "GOLD", subtitle: "For beginners", price: "Custom" },
  ],
  rows: [
    { label: "Account manager", type: "text", values: ["Junior", "Mid-level", "Senior"] },
    { label: "Response time", type: "text", values: ["4 hours", "2 hours", "On priority basis"] },
    { label: "Dropshipping available in", type: "text", values: ["PAK, KSA, UAE", "All GCC markets", "All available markets"] },
    { label: "WhatsApp group access", type: "check", values: [false, true, true] },
    { label: "Trending winning products", type: "check", values: [false, true, true] },
    { label: "Winning creatives & strategy", type: "check", values: [false, true, true] },
    { label: "Private sourcing products", type: "check", values: [false, false, true] },
    { label: "Customer support", type: "check", values: [true, true, true] },
    { label: "Custom packaging", type: "check", values: [false, true, true] },
    { label: "Product financing", type: "check", values: [false, false, true] },
  ],
};

// Header background per plan column, cycled by index so the table still
// looks intentional whether an admin has 2, 3, or more plan columns.
const FEATURES_TABLE_HEADER_STYLES = [
  { bg: "#12294a", badgeBg: "rgba(255,255,255,0.14)", badgeColor: "#fff", text: "#fff", sub: "rgba(255,255,255,0.65)" },
  { bg: "#00C896", badgeBg: "rgba(11,31,58,0.18)", badgeColor: "#0B1F3A", text: "#fff", sub: "rgba(11,31,58,0.65)" },
  { bg: "#F8B400", badgeBg: "rgba(11,31,58,0.15)", badgeColor: "#0B1F3A", text: "#0B1F3A", sub: "rgba(11,31,58,0.65)" },
];

function Features() {
  const [content, setContent] = useState(DEFAULT_FEATURES_TABLE);
  useEffect(() => {
    (async () => {
      // Prefer the new chunked rows; fall back to the original single-row
      // value for sites that saved before this change.
      let raw = await loadChunkedSetting("features_table_content");
      if (!raw) {
        const { data } = await supabase.from("app_settings").select("value").eq("key", "features_table_content").maybeSingle();
        raw = data?.value || null;
      }
      if (!raw) return;
      try {
        const parsed = JSON.parse(raw);
        if (parsed?.plans?.length && parsed?.rows?.length) setContent(parsed);
      } catch { /* keep defaults if stored value is malformed */ }
    })();
  }, []);

  const { headline, plans, rows } = content;

  return (
    <section id="services" className="py-28" style={{ background: "#F8FAFC" }}>
      <div className="max-w-7xl mx-auto px-6">
        <Reveal>
          <span className="text-xs font-bold tracking-widest uppercase" style={{ color: "#00a67e" }}>Why EmirateFulfil</span>
        </Reveal>

        <Reveal delay={80}>
          <div
            className="mt-6 rounded-2xl overflow-hidden"
            style={{ border: "1px solid #E5E7EB", boxShadow: "0 20px 50px rgba(11,31,58,0.08)" }}
          >
            <div className="overflow-x-auto">
              <div style={{ minWidth: 760 }}>
                <div className="grid" style={{ gridTemplateColumns: `1.5fr repeat(${plans.length}, 1fr)` }}>
                  {/* header row */}
                  <div className="p-7 flex items-end" style={{ background: "#fff" }}>
                    <h2 className="text-3xl md:text-4xl font-extrabold" style={{ color: "#0B1F3A", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                      {headline}
                    </h2>
                  </div>
                  {plans.map((p, i) => {
                    const s = FEATURES_TABLE_HEADER_STYLES[i % FEATURES_TABLE_HEADER_STYLES.length];
                    return (
                      <div key={i} className="p-6 text-center" style={{ background: s.bg }}>
                        <span
                          className="inline-block text-[10px] font-bold tracking-widest uppercase px-2.5 py-1 rounded-full"
                          style={{ background: s.badgeBg, color: s.badgeColor }}
                        >
                          {p.badge}
                        </span>
                        <div className="mt-2 text-xs font-semibold" style={{ color: s.sub }}>{p.subtitle}</div>
                        <div className="mt-1 text-2xl font-extrabold" style={{ color: s.text, fontFamily: "'Space Grotesk', sans-serif" }}>{p.price}</div>
                      </div>
                    );
                  })}

                  {/* feature rows */}
                  {rows.map((r, ri) => (
                    <React.Fragment key={ri}>
                      <div
                        className="px-7 py-4 text-sm font-semibold flex items-center"
                        style={{ color: "#111827", background: ri % 2 === 0 ? "#fff" : "#F8FAFC", borderTop: "1px solid #EEF1F5" }}
                      >
                        {r.label}
                      </div>
                      {plans.map((_, pi) => (
                        <div
                          key={pi}
                          className="px-4 py-4 flex items-center justify-center text-xs"
                          style={{ background: ri % 2 === 0 ? "#fff" : "#F8FAFC", borderTop: "1px solid #EEF1F5" }}
                        >
                          {r.type === "text" ? (
                            <span className="font-semibold text-center" style={{ color: "#374151" }}>{r.values?.[pi] ?? ""}</span>
                          ) : r.values?.[pi] ? (
                            <span className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: "#E6FBF4", color: "#00a67e" }}>
                              <CheckCircle2 className="w-3.5 h-3.5" />
                            </span>
                          ) : (
                            <span className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: "#F3F4F6", color: "#9CA3AF" }}>
                              <X className="w-3.5 h-3.5" />
                            </span>
                          )}
                        </div>
                      ))}
                    </React.Fragment>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ---------------- ORDER FLOW TIMELINE (signature element) ---------------- */
function OrderFlow() {
  const steps = [
    { icon: Package, label: "Order placed", who: "Customer" },
    { icon: ClipboardCheck, label: "Order reviewed", who: "Admin" },
    { icon: Warehouse, label: "Order received", who: "Supplier" },
    { icon: Boxes, label: "Packed", who: "Supplier" },
    { icon: ScanBarcode, label: "Tracking uploaded", who: "Supplier" },
    { icon: Truck, label: "Shipping started", who: "Carrier" },
    { icon: MapPin, label: "Order tracked", who: "Customer" },
    { icon: CheckCircle2, label: "Delivered", who: "Customer" },
  ];
  const [ref, visible] = useReveal();
  const [active, setActive] = useState(0);

  useEffect(() => {
    if (!visible) return;
    const id = setInterval(() => setActive((a) => (a + 1) % (steps.length + 2)), 900);
    return () => clearInterval(id);
  }, [visible]);

  return (
    <section id="how" className="py-28" style={{ background: "#0B1F3A" }}>
      <div className="max-w-7xl mx-auto px-6">
        <Reveal>
          <div className="text-center max-w-xl mx-auto">
            <span className="text-xs font-bold tracking-widest uppercase" style={{ color: "#F8B400" }}>How it works</span>
            <h2 className="mt-3 text-4xl md:text-5xl font-extrabold text-white" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              One order, eight checkpoints, zero guesswork.
            </h2>
            <p className="mt-4 text-white/55">Every order moves through the same tracked path — visible to your customer the entire way.</p>
          </div>
        </Reveal>

        <div ref={ref} className="mt-16 relative">
          <div className="hidden lg:block absolute top-6 left-0 right-0 h-[2px] bg-white/10" />
          <div
            className="hidden lg:block absolute top-6 left-0 h-[2px] transition-all duration-700 ease-out"
            style={{
              width: `${(Math.min(active, steps.length - 1) / (steps.length - 1)) * 100}%`,
              background: "linear-gradient(90deg,#00C896,#F8B400)",
            }}
          />
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-y-10 gap-x-4">
            {steps.map((s, i) => {
              const isActive = i <= active;
              return (
                <div key={i} className="flex flex-col items-center text-center relative">
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center relative z-10 transition-all duration-500"
                    style={{
                      background: isActive ? "linear-gradient(135deg,#00C896,#00a67e)" : "#12294a",
                      boxShadow: isActive ? "0 0 0 6px rgba(0,200,150,0.15)" : "none",
                      transform: isActive ? "scale(1.06)" : "scale(1)",
                    }}
                  >
                    <s.icon className="w-5 h-5" style={{ color: isActive ? "#04140f" : "#ffffff60" }} />
                  </div>
                  <div className="mt-3 text-xs font-bold" style={{ color: "#F8B400" }}>{s.who}</div>
                  <div className="mt-1 text-sm text-white/75 max-w-[100px]">{s.label}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------------- IN ACTION (real fleet / warehouse / delivery photos) ---------------- */
function InAction() {
  const shots = [
    { src: "/images/fleet-warehouse.png", label: "Source → Warehouse → Pack → Deliver", caption: "Our branded fleet & fulfillment hubs across the UAE" },
    { src: "/images/fleet-doorstep.png", label: "Doorstep delivery", caption: "Every order lands right at the customer's door, on time" },
    { src: "/images/fleet-handoff.png", label: "Verified handoff", caption: "Friendly, uniformed riders your customers can trust" },
  ];
  return (
    <section className="py-28" style={{ background: "#0B1F3A" }}>
      <div className="max-w-7xl mx-auto px-6">
        <Reveal>
          <div className="text-center max-w-xl mx-auto">
            <span className="text-xs font-bold tracking-widest uppercase" style={{ color: "#00e0aa" }}>On the ground</span>
            <h2 className="mt-3 text-4xl md:text-5xl font-extrabold text-white" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              A real fleet. A real network.
            </h2>
            <p className="mt-4 text-white/55">From our warehouse floor to the customer's doorstep — this is EmirateFulfil in action.</p>
          </div>
        </Reveal>

        <div className="mt-14 grid md:grid-cols-3 gap-6">
          {shots.map((s, i) => (
            <Reveal key={i} delay={i * 120}>
              <div className="group rounded-2xl overflow-hidden relative" style={{ boxShadow: "0 20px 50px rgba(0,0,0,0.35)" }}>
                <img
                  src={s.src}
                  alt={s.label}
                  className="w-full h-72 object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, rgba(11,31,58,0) 40%, rgba(8,18,33,0.92) 100%)" }} />
                <div className="absolute bottom-0 left-0 right-0 p-5">
                  <div className="text-xs font-bold tracking-wide uppercase" style={{ color: "#F8B400" }}>{s.label}</div>
                  <div className="mt-1 text-sm text-white/85">{s.caption}</div>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------------- DASHBOARD PREVIEW ---------------- */
function DashboardPreview() {
  const bars = [40, 65, 50, 80, 62, 90, 74];
  return (
    <section className="py-28" style={{ background: "#F8FAFC" }}>
      <div className="max-w-7xl mx-auto px-6 grid lg:grid-cols-2 gap-16 items-center">
        <Reveal>
          <span className="text-xs font-bold tracking-widest uppercase" style={{ color: "#00a67e" }}>Supplier dashboard</span>
          <h2 className="mt-3 text-4xl font-extrabold" style={{ color: "#0B1F3A", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            See every order, unit, and dirham in one view.
          </h2>
          <p className="mt-4" style={{ color: "#6B7280" }}>
            Track pending, packed, and shipped orders, monitor stock across every warehouse, and reconcile payouts — without leaving the dashboard.
          </p>
          <ul className="mt-6 space-y-3">
            {["Live order status across all channels", "Automatic low-stock alerts", "One-click tracking upload", "Downloadable reports & invoices"].map((t, i) => (
              <li key={i} className="flex items-center gap-3 text-sm" style={{ color: "#111827" }}>
                <CheckCircle2 className="w-4.5 h-4.5 flex-shrink-0" style={{ color: "#00C896" }} /> {t}
              </li>
            ))}
          </ul>
        </Reveal>

        <Reveal delay={150}>
          <div className="relative">
            <div className="rounded-2xl overflow-hidden" style={{ boxShadow: "0 30px 70px rgba(11,31,58,0.35)" }}>
              <img
                src="/images/dashboard-screenshot.png"
                alt="EmirateFulfil supplier dashboard"
                className="w-full h-auto block"
              />
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ---------------- PRICING ---------------- */
const DEFAULT_PRICING = {
  headline: "Simple pricing, built to scale with you.",
  plans: [
    { name: "Starter", price: 0, unit: "/mo", desc: "For sellers testing the market", features: ["Up to 50 orders/mo", "1 warehouse zone", "Email support", "Standard shipping rates"], cta: "Contact Support To Buy Plans" },
    { name: "Growth", price: 349, unit: "/mo", desc: "For sellers scaling across the Gulf", features: ["Up to 2,000 orders/mo", "All 6 GCC markets", "Priority support", "COD management", "API access"], cta: "Contact Support To Buy Plans", highlighted: true },
    { name: "Enterprise", price: null, unit: "", desc: "For high-volume brands & marketplaces", features: ["Unlimited orders", "Dedicated warehouse space", "Dedicated account manager", "Custom integrations"], cta: "Contact Support To Buy Plans" },
  ],
};

function Pricing() {
  // Pricing text is admin-editable (Admin tab → "Pricing section"), stored as
  // JSON in app_settings under key "pricing_content". Falls back to the
  // built-in defaults above until an admin saves their own copy.
  const [content, setContent] = useState(DEFAULT_PRICING);
  useEffect(() => {
    supabase
      .from("app_settings")
      .select("value")
      .eq("key", "pricing_content")
      .maybeSingle()
      .then(({ data }) => {
        if (data?.value) {
          try {
            const parsed = JSON.parse(data.value);
            if (parsed?.plans?.length) setContent(parsed);
          } catch { /* keep defaults if stored value is malformed */ }
        }
      });
  }, []);
  const { headline, plans } = content;
  return (
    <section id="pricing" className="py-28" style={{ background: "#0B1F3A" }}>
      <div className="max-w-7xl mx-auto px-6">
        <Reveal>
          <div className="text-center max-w-xl mx-auto">
            <span className="text-xs font-bold tracking-widest uppercase" style={{ color: "#F8B400" }}>Pricing</span>
            <h2 className="mt-3 text-4xl md:text-5xl font-extrabold text-white" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              {headline}
            </h2>
          </div>
        </Reveal>

        <div className="mt-14 grid md:grid-cols-3 gap-6 items-stretch">
          {plans.map((p, i) => (
            <Reveal key={i} delay={i * 100}>
              <div
                className="h-full rounded-2xl p-8 flex flex-col"
                style={{
                  background: p.highlighted ? "linear-gradient(160deg,#0F2E52,#0B1F3A)" : "#0F2440",
                  border: p.highlighted ? "1px solid #00C896" : "1px solid rgba(255,255,255,0.08)",
                  boxShadow: p.highlighted ? "0 24px 60px rgba(0,200,150,0.2)" : "none",
                  transform: p.highlighted ? "translateY(-8px)" : "none",
                }}
              >
                {p.highlighted && (
                  <span className="self-start text-[11px] font-bold px-3 py-1 rounded-full mb-4" style={{ background: "#00C896", color: "#04140f" }}>MOST POPULAR</span>
                )}
                <h3 className="text-white font-bold text-xl" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{p.name}</h3>
                <p className="text-white/50 text-sm mt-1">{p.desc}</p>
                <div className="mt-6 flex items-baseline gap-1">
                  {p.price === null ? (
                    <span className="text-3xl font-bold text-white">Custom</span>
                  ) : (
                    <>
                      <span className="text-4xl font-bold text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>AED {p.price}</span>
                      <span className="text-white/40 text-sm">{p.unit}</span>
                    </>
                  )}
                </div>
                <ul className="mt-7 space-y-3 flex-1">
                  {p.features.map((f, j) => (
                    <li key={j} className="flex items-center gap-2.5 text-sm text-white/75">
                      <CheckCircle2 className="w-4 h-4 flex-shrink-0" style={{ color: "#00C896" }} /> {f}
                    </li>
                  ))}
                </ul>
                <a
                  href={`https://wa.me/971568328274?text=${encodeURIComponent(`Hi, I'd like to buy the ${p.name} plan on EmirateFulfil.`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-8 w-full text-sm font-semibold py-3 rounded-full transition-transform hover:scale-[1.02] flex items-center justify-center"
                  style={p.highlighted ? { background: "linear-gradient(135deg,#00C896,#00a67e)", color: "#04140f" } : { background: "rgba(255,255,255,0.08)", color: "#fff" }}
                >
                  {p.cta}
                </a>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------------- TESTIMONIALS ---------------- */
const DEFAULT_TESTIMONIALS = [
  { name: "Sara Al Mansoori", role: "Founder, Noon Threads", quote: "Dispatch time dropped from three days to same-day. Our Riyadh customers noticed immediately.", rating: 5 },
  { name: "Hamdan Al Suwaidi", role: "Ops Lead, Gulf Gadgets", quote: "The dashboard replaced four spreadsheets. Stock, orders, and payouts finally live in one place.", rating: 5 },
  { name: "Fatima Khalil", role: "Seller, Doha Beauty Co.", quote: "Returns used to be a nightmare across borders. Now it's a single click for our customers.", rating: 5 },
];

function Testimonials() {
  // Customer reviews are admin-editable (Admin tab → "Customer reviews"),
  // stored as JSON in app_settings under key "testimonials_content".
  const [items, setItems] = useState(DEFAULT_TESTIMONIALS);
  useEffect(() => {
    (async () => {
      let raw = await loadChunkedSetting("testimonials_content");
      if (!raw) {
        const { data } = await supabase.from("app_settings").select("value").eq("key", "testimonials_content").maybeSingle();
        raw = data?.value || null;
      }
      if (!raw) return;
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length) setItems(parsed);
      } catch { /* keep defaults if stored value is malformed */ }
    })();
  }, []);
  return (
    <section id="testimonials" className="py-28" style={{ background: "#F8FAFC" }}>
      <div className="max-w-7xl mx-auto px-6">
        <Reveal>
          <div className="text-center max-w-xl mx-auto">
            <span className="text-xs font-bold tracking-widest uppercase" style={{ color: "#00a67e" }}>Customers</span>
            <h2 className="mt-3 text-4xl md:text-5xl font-extrabold" style={{ color: "#0B1F3A", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              Trusted by sellers across the Gulf.
            </h2>
          </div>
        </Reveal>
        <div className="mt-14 grid md:grid-cols-3 gap-6">
          {items.map((t, i) => (
            <Reveal key={i} delay={i * 100}>
              <div className="h-full p-7 rounded-2xl bg-white" style={{ border: "1px solid #E5E7EB" }}>
                <div className="flex gap-0.5 mb-4">
                  {Array.from({ length: t.rating }).map((_, j) => (
                    <Star key={j} className="w-4 h-4" fill="#F8B400" stroke="none" />
                  ))}
                </div>
                <p className="text-sm leading-relaxed" style={{ color: "#111827" }}>&ldquo;{t.quote}&rdquo;</p>
                <div className="mt-6 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white" style={{ background: "linear-gradient(135deg,#00C896,#0B1F3A)" }}>
                    {t.name.split(" ").map((n) => n[0]).join("")}
                  </div>
                  <div>
                    <div className="text-sm font-semibold" style={{ color: "#111827" }}>{t.name}</div>
                    <div className="text-xs" style={{ color: "#6B7280" }}>{t.role}</div>
                  </div>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------------- FAQ ---------------- */
function FAQ() {
  const qs = [
    { q: "Which countries does EmirateFulfil deliver to?", a: "We currently fulfill orders across the UAE, Saudi Arabia, Qatar, Oman, Bahrain, and Kuwait, with warehouse hubs positioned to serve each market directly." },
    { q: "Do you support cash on delivery?", a: "Yes — COD collection, reconciliation, and payout are fully managed, so you never have to chase cash across borders." },
    { q: "Can I connect my Shopify or Salla store?", a: "Yes, native integrations sync orders, stock, and tracking automatically once connected." },
    { q: "How fast do orders ship?", a: "Orders placed before 2 PM local time are dispatched the same day from the nearest fulfillment hub." },
  ];
  const [open, setOpen] = useState(0);
  return (
    <section id="faq" className="py-28 relative overflow-hidden" style={{ background: "#0B1F3A" }}>
      {/* soft glow blobs — same premium treatment as the Hero */}
      <div className="absolute top-10 -left-32 w-96 h-96 rounded-full opacity-15 blur-3xl pointer-events-none" style={{ background: "#00C896", animation: "blobMove 16s ease-in-out infinite" }} />
      <div className="absolute bottom-0 -right-32 w-96 h-96 rounded-full opacity-10 blur-3xl pointer-events-none" style={{ background: "#F8B400", animation: "blobMove 20s ease-in-out infinite reverse" }} />

      <div className="max-w-3xl mx-auto px-6 relative">
        <Reveal>
          <div className="text-center">
            <span className="inline-flex items-center gap-2 text-xs font-bold tracking-widest uppercase px-3.5 py-1.5 rounded-full" style={{ color: "#F8B400", background: "rgba(248,180,0,0.1)", border: "1px solid rgba(248,180,0,0.25)" }}>FAQ</span>
            <h2 className="mt-4 text-4xl md:text-5xl font-extrabold text-white" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Questions, answered.</h2>
            <p className="mt-3 text-sm text-white/45">Everything you need to know before you get started.</p>
          </div>
        </Reveal>

        <div className="mt-14 space-y-4">
          {qs.map((item, i) => {
            const isOpen = open === i;
            return (
              <Reveal key={i} delay={i * 70}>
                <div
                  className="rounded-2xl overflow-hidden transition-all duration-300"
                  style={{
                    background: isOpen ? "linear-gradient(160deg,rgba(0,200,150,0.08),rgba(255,255,255,0.03))" : "rgba(255,255,255,0.03)",
                    border: isOpen ? "1px solid rgba(0,200,150,0.35)" : "1px solid rgba(255,255,255,0.08)",
                    boxShadow: isOpen ? "0 16px 40px rgba(0,200,150,0.12)" : "none",
                    backdropFilter: "blur(6px)",
                  }}
                >
                  <button
                    className="w-full flex items-center gap-4 px-6 py-5 text-left group"
                    onClick={() => setOpen(isOpen ? -1 : i)}
                  >
                    <span
                      className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors duration-300"
                      style={isOpen ? { background: "linear-gradient(135deg,#00C896,#00a67e)", color: "#04140f" } : { background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.5)" }}
                    >
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span className="flex-1 text-white font-semibold text-sm md:text-[15px]">{item.q}</span>
                    <ChevronDown
                      className="w-4.5 h-4.5 flex-shrink-0 transition-transform duration-300"
                      style={{ color: isOpen ? "#00C896" : "rgba(255,255,255,0.35)", transform: isOpen ? "rotate(180deg)" : "none" }}
                    />
                  </button>
                  <div style={{ maxHeight: isOpen ? "200px" : "0px", overflow: "hidden", transition: "max-height 0.4s ease" }}>
                    <p className="pl-[4.5rem] pr-6 pb-5 text-sm text-white/55 leading-relaxed">{item.a}</p>
                  </div>
                </div>
              </Reveal>
            );
          })}
        </div>

        <Reveal delay={280}>
          <div className="mt-12 text-center">
            <p className="text-sm text-white/45">Still have questions?</p>
            <a
              href="https://wa.me/971568328274"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex items-center gap-2 text-sm font-semibold px-6 py-3 rounded-full transition-transform hover:scale-105"
              style={{ background: "linear-gradient(135deg,#00C896,#00a67e)", color: "#04140f", boxShadow: "0 12px 32px rgba(0,200,150,0.35)" }}
            >
              <MessageCircle className="w-4 h-4" /> Chat with us on WhatsApp
            </a>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ---------------- CTA + FOOTER ---------------- */
function CTA({ onSignup }) {
  return (
    <section className="py-24 relative overflow-hidden" style={{ background: "linear-gradient(135deg,#0B1F3A,#081221)" }}>
      <div className="absolute inset-0 opacity-20" style={{ background: "linear-gradient(120deg, transparent 0%, #00C896 50%, transparent 100%)", backgroundSize: "200% 100%", animation: "shimmer 6s linear infinite" }} />
      <div className="relative max-w-3xl mx-auto px-6 text-center">
        <Reveal>
          <h2 className="text-4xl md:text-5xl font-extrabold text-white" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            Ready to fulfill smarter across the Gulf?
          </h2>
          <p className="mt-4 text-white/60">Join over 1,200 suppliers already shipping through EmirateFulfil.</p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <button onClick={onSignup} className="text-sm font-semibold px-7 py-3.5 rounded-full transition-transform hover:scale-105" style={{ background: "linear-gradient(135deg,#00C896,#00a67e)", color: "#04140f", boxShadow: "0 12px 32px rgba(0,200,150,0.4)" }}>
              Create free account
            </button>
            <button className="text-sm font-semibold px-7 py-3.5 rounded-full text-white border border-white/20 hover:bg-white/5 transition-colors">
              Book a demo
            </button>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function Footer() {
  const cols = [
    { title: "Company", links: ["About", "Services", "Pricing", "Blog", "Careers"] },
    { title: "Support", links: ["Contact", "Help Center", "Knowledge Base", "Status"] },
    { title: "Legal", links: ["Privacy Policy", "Terms & Conditions", "Refund Policy"] },
  ];
  return (
    <footer className="pt-20 pb-10" style={{ background: "#081221" }}>
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid md:grid-cols-5 gap-10">
          <div className="md:col-span-2">
            <div className="flex items-center gap-2.5">
              <Logo />
              <span className="font-bold text-white text-lg" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                Emirate<span style={{ color: "#00C896" }}>Fulfil</span>
              </span>
            </div>
            <p className="mt-4 text-sm text-white/45 max-w-xs">Powering UAE ecommerce fulfillment — from warehouse to doorstep, across the Gulf.</p>
          </div>
          {cols.map((c, i) => (
            <div key={i}>
              <div className="text-white text-sm font-semibold mb-4">{c.title}</div>
              <ul className="space-y-2.5">
                {c.links.map((l, j) => (
                  <li key={j}>
                    <a href="#" className="text-sm text-white/45 hover:text-white transition-colors">{l}</a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-16 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4" style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}>
          <p className="text-xs text-white/35">© 2026 EmirateFulfil. All rights reserved.</p>
          <div className="flex gap-5 text-xs text-white/40">
            <a href="#" className="hover:text-white transition-colors">WhatsApp</a>
            <a href="#" className="hover:text-white transition-colors">LinkedIn</a>
            <a href="#" className="hover:text-white transition-colors">Instagram</a>
          </div>
        </div>
      </div>
    </footer>
  );
}

/* ============================================================
   SUPABASE DATA HELPERS
============================================================ */
async function fetchCatalog() {
  const { data, error } = await supabase.from("products").select("*").order("created_at");
  if (error) { console.error(error); return []; }
  return data.map((p) => ({ id: p.id, name: p.name, category: p.category, cost: Number(p.cost), sell: Number(p.sell), emoji: p.emoji, description: p.description, image_url: p.image_url, images: Array.isArray(p.images) ? p.images : [], stock: Number(p.stock ?? 0), assignedSellerEmails: Array.isArray(p.assigned_seller_emails) ? p.assigned_seller_emails : [], isPremium: !!p.is_premium, sourceUrl: p.source_url || null }));
}
// Which sellers Admin has marked as "Premium" — just a list of emails, stored
// as JSON in app_settings (same chunked mechanism as the homepage content).
// This is a status/badge Admin controls per seller — separate from which
// specific sellers a product is assigned to (that lives on the product itself).
const PREMIUM_SELLERS_KEY = "premium_sellers_content";
async function fetchPremiumSellerEmails() {
  const raw = await loadChunkedSetting(PREMIUM_SELLERS_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch { return []; }
}
async function savePremiumSellerEmails(list) {
  return saveChunkedSetting(PREMIUM_SELLERS_KEY, JSON.stringify(list));
}
// Custom display order for the Products page — a plain list of product IDs,
// stored the same chunked way as the premium-sellers list above. Admin sets
// this by dragging products up/down in the "Reorder products" panel; every
// seller (and the buyer-facing product grid) then shows products in this
// order instead of database insert order. Any product not yet in this list
// (e.g. one just added) falls back to the end, in its normal catalog order.
const PRODUCT_ORDER_KEY = "product_display_order";
async function fetchProductOrder() {
  const raw = await loadChunkedSetting(PRODUCT_ORDER_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch { return []; }
}
async function saveProductOrder(list) {
  return saveChunkedSetting(PRODUCT_ORDER_KEY, JSON.stringify(list));
}
function applyProductOrder(catalog, orderIds) {
  if (!orderIds || !orderIds.length) return catalog;
  const byId = new Map(catalog.map((p) => [p.id, p]));
  const ordered = [];
  const seen = new Set();
  for (const id of orderIds) {
    const p = byId.get(id);
    if (p) { ordered.push(p); seen.add(id); }
  }
  for (const p of catalog) { if (!seen.has(p.id)) ordered.push(p); }
  return ordered;
}
async function fetchListings(email) {
  const { data, error } = await supabase.from("listings").select("product_id").eq("seller_email", email);
  if (error) { console.error(error); return []; }
  return data.map((r) => r.product_id);
}
async function fetchReviews(productId) {
  const { data, error } = await supabase.from("reviews").select("*").eq("product_id", productId).order("created_at", { ascending: false });
  if (error) { console.error(error); return []; }
  return data.map((r) => ({ id: r.id, name: r.name, rating: Number(r.rating), body: r.body, createdAt: r.created_at }));
}
async function fetchOrders(email) {
  const { data, error } = await supabase.from("orders").select("*").eq("seller_email", email).order("created_at", { ascending: false });
  if (error) { console.error(error); return []; }
  return data.map((o) => ({
    id: o.id, productId: o.product_id, productName: o.product_name, qty: o.qty,
    sellPrice: Number(o.sell_price), costPrice: Number(o.cost_price),
    listPrice: o.list_price != null ? Number(o.list_price) : Number(o.sell_price),
    buyer: o.buyer, city: o.city, status: o.status,
    customerEmail: o.customer_email, customerPhone: o.customer_phone, customerAddress: o.customer_address, notes: o.notes,
    trackingNumber: o.tracking_number, paymentStatus: o.payment_status || "unpaid",
    deliveryCharge: o.delivery_charge != null ? Number(o.delivery_charge) : DELIVERY_CHARGE,
    whatsappProofUrl: o.whatsapp_proof_url || null,
    courier: o.courier || null, trackingUrl: o.tracking_url || null,
    createdAt: o.created_at,
  }));
}
async function fetchTickets(email, category = "support") {
  const { data, error } = await supabase.from("tickets").select("*").eq("seller_email", email).eq("category", category).order("created_at", { ascending: false });
  if (error) { console.error(error); return []; }
  return data.map((t) => ({ id: t.id, sellerEmail: t.seller_email, sellerName: t.seller_name, subject: t.subject, status: t.status || "open", createdAt: t.created_at }));
}
async function fetchAllTickets(category = "support") {
  const { data, error } = await supabase.from("tickets").select("*").eq("category", category).order("created_at", { ascending: false });
  if (error) { console.error(error); return []; }
  return data.map((t) => ({ id: t.id, sellerEmail: t.seller_email, sellerName: t.seller_name, subject: t.subject, status: t.status || "open", createdAt: t.created_at }));
}
async function fetchTicketMessages(ticketId) {
  const { data, error } = await supabase.from("ticket_messages").select("*").eq("ticket_id", ticketId).order("created_at", { ascending: true });
  if (error) { console.error(error); return []; }
  return data.map((m) => ({ id: m.id, ticketId: m.ticket_id, sender: m.sender, senderName: m.sender_name, body: m.body, imageUrl: m.image_url, createdAt: m.created_at }));
}

/* ============================================================
   SELLER INVOICES (Admin-generated tax invoice per seller)
   Admin picks specific orders for one seller, edits the fee/VAT/COD/RTC
   figures per row, and saves a snapshot to seller_invoices — the seller
   then sees it read-only under their own Invoices tab.
============================================================ */
const INVOICE_VAT_RATE = 5; // %

function genInvoiceNumber() {
  return "INV" + Date.now().toString().slice(-9);
}

// Orders belonging to one seller that haven't been pulled into an invoice yet.
async function fetchUninvoicedOrders(email) {
  const { data, error } = await supabase.from("orders").select("*").eq("seller_email", email).is("invoiced_at", null).order("created_at", { ascending: false });
  if (error) { console.error(error); return []; }
  return data.map((o) => ({
    id: o.id, productName: o.product_name, qty: Number(o.qty),
    sellPrice: Number(o.sell_price), deliveryCharge: o.delivery_charge != null ? Number(o.delivery_charge) : 0,
    status: o.status, createdAt: o.created_at,
  }));
}

async function fetchSellerInvoices(email) {
  const { data, error } = await supabase.from("seller_invoices").select("*").eq("seller_email", email).order("created_at", { ascending: false });
  if (error) { console.error(error); return []; }
  return data;
}

/* ============================================================
   TOAST
============================================================ */
function Toast({ message }) {
  if (!message) return null;
  return (
    <div
      className="fixed top-5 left-1/2 -translate-x-1/2 z-[100] px-5 py-3 rounded-2xl text-sm font-semibold text-white shadow-xl max-w-[90vw] sm:max-w-md text-center"
      style={{ background: "#0B1F3A" }}
    >
      {message}
    </div>
  );
}

/* ============================================================
   PWA INSTALL PROMPT
   Shows a small "Install EmirateFulfil" banner (matches the Toast style)
   once the browser signals the app is installable. Dismissal is
   remembered in localStorage so it doesn't nag on every visit.
============================================================ */
function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [show, setShow] = useState(false);
  const [dismissed, setDismissed] = useState(() => localStorage.getItem("ef_install_dismissed") === "1");

  useEffect(() => {
    // Pick up an install signal that fired before React mounted (captured
    // early by the inline script in index.html) — this is the common case,
    // since the signal can fire while we're still checking the login session.
    if (window.__pwaInstallEvent && !dismissed) {
      setDeferredPrompt(window.__pwaInstallEvent);
      setShow(true);
    }
    const onReady = () => {
      if (window.__pwaInstallEvent && !dismissed) {
        setDeferredPrompt(window.__pwaInstallEvent);
        setShow(true);
      }
    };
    window.addEventListener("pwaInstallReady", onReady);
    // Also listen live, in case it fires after mount (e.g. slower connections).
    const onBeforeInstall = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      if (!dismissed) setShow(true);
    };
    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    return () => {
      window.removeEventListener("pwaInstallReady", onReady);
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
    };
  }, [dismissed]);

  if (!show || !deferredPrompt) return null;

  const install = async () => {
    setShow(false);
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
  };

  const dismiss = () => {
    setShow(false);
    localStorage.setItem("ef_install_dismissed", "1");
    setDismissed(true);
  };

  return (
    <div
      className="fixed bottom-5 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-3 px-4 py-3 rounded-2xl shadow-xl max-w-[92vw]"
      style={{ background: "#0B1F3A" }}
    >
      <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "linear-gradient(135deg,#00C896,#0B1F3A)" }}>
        <Download className="w-5 h-5 text-white" />
      </div>
      <div className="text-white text-sm font-medium">Install EmirateFulfil for quick access</div>
      <button
        onClick={install}
        className="px-3 py-1.5 rounded-lg text-sm font-semibold flex-shrink-0"
        style={{ background: "#00C896", color: "#04140f" }}
      >
        Install
      </button>
      <button onClick={dismiss} className="text-white/50 text-sm flex-shrink-0 px-1">✕</button>
    </div>
  );
}

/* ============================================================
   AUTH PAGE (Signup / Login)
============================================================ */
// Countries a seller can sign up from, each with its WhatsApp/mobile dial code —
// picking a country updates the phone placeholders so the format always matches.
const SIGNUP_COUNTRIES = [
  { code: "UAE", label: "United Arab Emirates", dial: "+971", sample: "5x xxx xxxx", bankSample: "e.g. Emirates NBD", ibanSample: "AE07 0331 2345..." },
  { code: "KSA", label: "Saudi Arabia", dial: "+966", sample: "5x xxx xxxx", bankSample: "e.g. Al Rajhi Bank", ibanSample: "SA03 8000 0000..." },
  { code: "PK", label: "Pakistan", dial: "+92", sample: "3xx xxxxxxx", bankSample: "e.g. HBL, Meezan Bank", ibanSample: "PK36 SCBL 0000..." },
  { code: "QA", label: "Qatar", dial: "+974", sample: "xxxx xxxx", bankSample: "e.g. Qatar National Bank", ibanSample: "QA58 DOHB 0000..." },
  { code: "KW", label: "Kuwait", dial: "+965", sample: "xxxx xxxx", bankSample: "e.g. National Bank of Kuwait", ibanSample: "KW81 CBKU 0000..." },
  { code: "BH", label: "Bahrain", dial: "+973", sample: "xxxx xxxx", bankSample: "e.g. Ahli United Bank", ibanSample: "BH67 BMAG 0000..." },
  { code: "OM", label: "Oman", dial: "+968", sample: "xxxx xxxx", bankSample: "e.g. Bank Muscat", ibanSample: "OM81 0180 0000..." },
  { code: "EG", label: "Egypt", dial: "+20", sample: "1xx xxx xxxx", bankSample: "e.g. National Bank of Egypt", ibanSample: "EG38 0019 0005..." },
  { code: "IN", label: "India", dial: "+91", sample: "xxxxx xxxxx", bankSample: "e.g. State Bank of India", ibanSample: "Account / IFSC code" },
  { code: "GB", label: "United Kingdom", dial: "+44", sample: "7xxx xxxxxx", bankSample: "e.g. Barclays", ibanSample: "GB29 NWBK 6016..." },
  { code: "US", label: "United States", dial: "+1", sample: "xxx xxx xxxx", bankSample: "e.g. Bank of America", ibanSample: "Routing / account no." },
  { code: "OTHER", label: "Other country", dial: "", sample: "xxx xxx xxxx", bankSample: "e.g. your bank's name", ibanSample: "IBAN / account number" },
];
const MONTHLY_ORDER_OPTIONS = ["0 – 10", "10 – 50", "50 – 100", "100 – 500", "500+"];

function AuthPage({ mode, onAuthed, onSwitch, notify }) {
  const isSignup = mode === "signup";
  const isForgot = mode === "forgot";
  const [form, setForm] = useState({
    name: "", phone: "", country: "UAE", email: "", password: "",
    storeName: "", monthlyOrders: "", whatsapp: "",
    bankName: "", accountTitle: "", accountNumber: "", iban: "",
  });
  const [busy, setBusy] = useState(false);
  useGoogleFonts();

  const update = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const selectedCountry = SIGNUP_COUNTRIES.find((c) => c.code === form.country) || SIGNUP_COUNTRIES[0];

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    const email = form.email.trim().toLowerCase();
    if (isForgot) {
      if (!email) { notify("Please enter your email."); setBusy(false); return; }
      const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin });
      if (error) {
        notify(error.message || "Could not send the reset email right now — please check the SMTP settings or try again shortly.");
        setBusy(false);
        return;
      }
      notify("If an account exists for that email, a reset link has been sent. Please check your inbox.");
      setBusy(false);
      return;
    }
    if (isSignup) {
      if (!form.name || !email || !form.password || !form.storeName || !form.monthlyOrders || !form.phone || !form.whatsapp || !form.bankName || !form.accountTitle || !form.accountNumber || !form.iban) {
        notify("Please fill in all required fields.");
        setBusy(false);
        return;
      }
      const { data, error } = await supabase.auth.signUp({
        email, password: form.password,
        options: {
          data: {
            name: form.name, phone: form.phone, company: form.storeName, country: form.country,
            store_name: form.storeName, monthly_orders: form.monthlyOrders, whatsapp: form.whatsapp,
            bank_name: form.bankName, account_title: form.accountTitle, account_number: form.accountNumber, iban: form.iban,
          },
        },
      });
      if (error) { notify(error.message); setBusy(false); return; }
      notify("Thanks for signing up, " + form.name.split(" ")[0] + "! Please check your email to verify your account. After that, an Admin still needs to approve your account before you can log in.");
      onSwitch("login");
    } else {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password: form.password });
      if (error) {
        if (error.message.toLowerCase().includes("confirm")) {
          notify("Please verify your email first — check your inbox for the confirmation link.");
        } else {
          notify("Incorrect email or password.");
        }
        setBusy(false); return;
      }
      const { data: profile } = await supabase.from("profiles").select("*").eq("id", data.user.id).single();
      const displayName = profile?.name || email.split("@")[0];
      const approval = profile?.approval_status || "pending";
      const isAdmin = ADMIN_EMAILS.includes(email);
      if (!isAdmin && approval !== "approved") {
        await supabase.auth.signOut();
        notify(
          approval === "deactivated"
            ? "Your account has been deactivated by Admin. Please contact support."
            : "Your account is still waiting for Admin approval. Please check back soon."
        );
        setBusy(false);
        return;
      }
      onAuthed({
        email, name: displayName, company: profile?.company, country: profile?.country,
        storeName: profile?.store_name, monthlyOrders: profile?.monthly_orders, whatsapp: profile?.whatsapp,
        phone: profile?.phone, bankName: profile?.bank_name, accountTitle: profile?.account_title,
        accountNumber: profile?.account_number, iban: profile?.iban,
      });
      notify("Welcome back, " + displayName.split(" ")[0] + ".");
    }
    setBusy(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-16 relative overflow-hidden" style={{ background: "#081221", fontFamily: "Inter, sans-serif" }}>
      {/* ambient glow blobs */}
      <div className="pointer-events-none absolute -top-24 -left-20 w-[380px] h-[380px] rounded-full opacity-[0.14] blur-3xl" style={{ background: "#00C896" }} />
      <div className="pointer-events-none absolute -bottom-32 -right-16 w-[420px] h-[420px] rounded-full opacity-[0.10] blur-3xl" style={{ background: "#F8B400" }} />

      {/* faint twinkling stars scattered across the page */}
      <svg className="pointer-events-none absolute inset-0 w-full h-full opacity-70" preserveAspectRatio="none">
        {[
          [6, 12], [14, 30], [22, 8], [34, 22], [48, 15], [58, 34], [68, 10],
          [78, 26], [88, 18], [94, 38], [12, 55], [30, 62], [70, 58], [90, 60],
        ].map(([x, y], i) => (
          <circle key={i} cx={`${x}%`} cy={`${y}%`} r={i % 3 === 0 ? 1.6 : 1.1} fill={i % 2 === 0 ? "#F8B400" : "#FFD98A"}>
            <animate attributeName="opacity" values="0.8;0.15;0.8" dur={`${2.4 + (i % 5) * 0.6}s`} repeatCount="indefinite" />
          </circle>
        ))}
      </svg>

      {/* Gulf skyline silhouette along the bottom of the page */}
      <svg
        viewBox="0 0 900 160"
        preserveAspectRatio="xMidYMax slice"
        className="pointer-events-none absolute bottom-0 left-0 w-full h-40 opacity-[0.16]"
      >
        <path d="M0 160 L0 120 Q20 108 40 120 L40 160 Z" fill="#7FE8C9" />
        <rect x="55" y="90" width="20" height="70" fill="#7FE8C9" />
        <rect x="85" y="60" width="16" height="100" fill="#7FE8C9" />
        <rect x="110" y="100" width="18" height="60" fill="#7FE8C9" />
        {/* Burj Al Arab sail */}
        <path d="M150 160 L150 100 Q150 55 195 42 L195 58 Q168 68 168 100 L168 160 Z" fill="#7FE8C9" />
        <rect x="210" y="80" width="17" height="80" fill="#7FE8C9" />
        <rect x="238" y="50" width="15" height="110" fill="#7FE8C9" />
        {/* Burj Khalifa spire */}
        <polygon points="420,4 438,72 458,72 458,160 386,160 386,72 404,72" fill="#F8B400" />
        <rect x="416" y="0" width="4" height="8" fill="#F8B400" />
        <rect x="480" y="70" width="16" height="90" fill="#7FE8C9" />
        <rect x="506" y="45" width="14" height="115" fill="#7FE8C9" />
        <rect x="530" y="85" width="18" height="75" fill="#7FE8C9" />
        <rect x="560" y="60" width="15" height="100" fill="#7FE8C9" />
        <rect x="600" y="95" width="17" height="65" fill="#7FE8C9" />
        <rect x="630" y="70" width="14" height="90" fill="#7FE8C9" />
        <rect x="660" y="105" width="16" height="55" fill="#7FE8C9" />
        <rect x="700" y="80" width="15" height="80" fill="#7FE8C9" />
        <rect x="730" y="55" width="17" height="105" fill="#7FE8C9" />
        <rect x="770" y="95" width="14" height="65" fill="#7FE8C9" />
        <rect x="800" y="72" width="16" height="88" fill="#7FE8C9" />
        <rect x="840" y="100" width="18" height="60" fill="#7FE8C9" />
        <rect x="0" y="160" width="900" height="1.5" fill="#7FE8C9" opacity="0.4" />
      </svg>

      <div className="relative z-10 w-full flex items-center justify-center">
      <div className={`w-full ${isSignup ? "max-w-2xl" : "max-w-md"}`}>
        <button onClick={() => onSwitch("home")} className="flex items-center gap-2.5 justify-center mb-8 w-full">
          <Logo />
          <span className="font-bold text-white text-lg" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            Emirate<span style={{ color: "#00C896" }}>Fulfil</span>
          </span>
        </button>

        <style>{`
          @keyframes authFadeUp { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: translateY(0); } }
          .auth-box { animation: authFadeUp 0.5s ease both; }
        `}</style>

        <div
          className="rounded-2xl p-8 auth-box"
          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", animationDelay: "0.05s" }}
        >
          <h2 className="text-2xl font-bold text-white" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            {isSignup ? "Create your seller account" : isForgot ? "Reset your password" : "Welcome back"}
          </h2>
          <p className="text-sm text-white/45 mt-1">
            {isSignup ? "Tell us about your store so we can get you selling." : isForgot ? "Enter your email and we'll send you a link to reset it." : "Log in to your seller portal."}
          </p>

          <form onSubmit={submit} className="mt-6 space-y-5">
            {isSignup && (
              <>
                <div className="rounded-xl px-4 py-3 text-xs leading-relaxed" style={{ background: "rgba(0,200,150,0.08)", border: "1px solid rgba(0,200,150,0.25)", color: "#B7F3E0" }}>
                  Looking for 3PL fulfillment services, or want us to stock your products? Please contact our customer care team — this form is only for creating a seller dashboard account.
                </div>

                {/* --- Your details --- */}
                <AuthSection title="Your details" delay="0.1s">
                  <div className="grid sm:grid-cols-2 gap-3">
                    <Field label="Full name" value={form.name} onChange={update("name")} placeholder="Ahmed Khan" required />
                    <Field label="Email" type="email" value={form.email} onChange={update("email")} placeholder="you@example.com" required />
                  </div>
                  <Field label="Password" type="password" value={form.password} onChange={update("password")} placeholder="••••••••" required />
                </AuthSection>

                {/* --- Store details --- */}
                <AuthSection title="Store details" delay="0.18s">
                  <div className="grid sm:grid-cols-2 gap-3">
                    <Field label="Store name" value={form.storeName} onChange={update("storeName")} placeholder="Your store name" required />
                    <div>
                      <label className="text-xs text-white/50">Monthly avg. orders</label>
                      <select
                        value={form.monthlyOrders}
                        onChange={update("monthlyOrders")}
                        required
                        className="mt-1 w-full rounded-xl px-3 py-2.5 text-white text-sm outline-none"
                        style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)" }}
                      >
                        <option value="" disabled style={{ color: "#666" }}>Select…</option>
                        {MONTHLY_ORDER_OPTIONS.map((o) => (
                          <option key={o} value={o} style={{ color: "#000" }}>{o}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </AuthSection>

                {/* --- Contact numbers --- */}
                <AuthSection title="Contact numbers" delay="0.26s">
                  <div className="grid sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-white/50">Country</label>
                      <select
                        value={form.country}
                        onChange={update("country")}
                        className="mt-1 w-full rounded-xl px-3 py-2.5 text-white text-sm outline-none"
                        style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)" }}
                      >
                        {SIGNUP_COUNTRIES.map((c) => (
                          <option key={c.code} value={c.code} style={{ color: "#000" }}>{c.label}</option>
                        ))}
                      </select>
                    </div>
                    <Field label="Mobile" value={form.phone} onChange={update("phone")} placeholder={`${selectedCountry.dial} ${selectedCountry.sample}`} required />
                  </div>
                  <Field label="WhatsApp" value={form.whatsapp} onChange={update("whatsapp")} placeholder={`${selectedCountry.dial} ${selectedCountry.sample}`} required />
                </AuthSection>

                {/* --- Bank details (for payouts) --- */}
                <AuthSection title="Bank details" subtitle="Used to send your weekly payouts." delay="0.34s">
                  <div className="grid sm:grid-cols-2 gap-3">
                    <Field label="Bank name" value={form.bankName} onChange={update("bankName")} placeholder={selectedCountry.bankSample} required />
                    <Field label="Account title" value={form.accountTitle} onChange={update("accountTitle")} placeholder="Name on account" required />
                  </div>
                  <div className="grid sm:grid-cols-2 gap-3">
                    <Field label="Account number" value={form.accountNumber} onChange={update("accountNumber")} placeholder="0123456789" required />
                    <Field label="IBAN" value={form.iban} onChange={update("iban")} placeholder={selectedCountry.ibanSample} required />
                  </div>
                </AuthSection>
              </>
            )}

            {isForgot && (
              <Field label="Email" type="email" value={form.email} onChange={update("email")} placeholder="you@example.com" required />
            )}

            {!isSignup && !isForgot && (
              <>
                <Field label="Email" type="email" value={form.email} onChange={update("email")} placeholder="you@example.com" required />
                <Field label="Password" type="password" value={form.password} onChange={update("password")} placeholder="••••••••" required />
                <div className="text-right -mt-2">
                  <button type="button" onClick={() => onSwitch("forgot")} className="text-xs font-semibold" style={{ color: "#00C896" }}>
                    Forgot password?
                  </button>
                </div>
              </>
            )}

            <button
              type="submit"
              disabled={busy}
              className="w-full font-semibold py-3 rounded-full mt-2 transition-transform hover:scale-[1.02] disabled:opacity-60 auth-box"
              style={{ background: "linear-gradient(135deg,#00C896,#00a67e)", color: "#04140f", animationDelay: "0.42s" }}
            >
              {busy ? "Please wait…" : isSignup ? "Create account" : isForgot ? "Send reset link" : "Log in"}
            </button>
          </form>

          {isForgot ? (
            <p className="text-center text-sm text-white/45 mt-5">
              <button onClick={() => onSwitch("login")} className="font-semibold" style={{ color: "#00C896" }}>
                Back to log in
              </button>
            </p>
          ) : (
            <p className="text-center text-sm text-white/45 mt-5">
              {isSignup ? "Already have an account?" : "Don't have an account?"}{" "}
              <button onClick={() => onSwitch(isSignup ? "login" : "signup")} className="font-semibold" style={{ color: "#00C896" }}>
                {isSignup ? "Log in" : "Sign up"}
              </button>
            </p>
          )}
        </div>
        <p className="text-center text-xs text-white/25 mt-6 auth-box" style={{ animationDelay: "0.48s" }}>Demo prototype — accounts are stored for this app only, not production-secure.</p>
      </div>
      </div>
    </div>
  );
}

// Shown when the seller clicks the reset link from their email — Supabase
// signs them into a temporary "recovery" session, and this lets them pick
// a new password via supabase.auth.updateUser().
function ResetPasswordPage({ onDone, notify }) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  useGoogleFonts();

  const submit = async (e) => {
    e.preventDefault();
    if (!password || password.length < 6) { notify("Password must be at least 6 characters."); return; }
    if (password !== confirm) { notify("Passwords don't match."); return; }
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) { notify(error.message); return; }
    notify("Password updated. You're all set.");
    onDone();
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-16" style={{ background: "#081221", fontFamily: "Inter, sans-serif" }}>
      <div className="w-full max-w-md">
        <div className="flex items-center gap-2.5 justify-center mb-8 w-full">
          <Logo />
          <span className="font-bold text-white text-lg" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            Emirate<span style={{ color: "#00C896" }}>Fulfil</span>
          </span>
        </div>
        <div className="rounded-2xl p-8" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
          <h2 className="text-2xl font-bold text-white" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Set a new password</h2>
          <p className="text-sm text-white/45 mt-1">Choose a new password for your account.</p>
          <form onSubmit={submit} className="mt-6 space-y-5">
            <Field label="New password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required />
            <Field label="Confirm password" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="••••••••" required />
            <button
              type="submit"
              disabled={busy}
              className="w-full font-semibold py-3 rounded-full mt-2 transition-transform hover:scale-[1.02] disabled:opacity-60"
              style={{ background: "linear-gradient(135deg,#00C896,#00a67e)", color: "#04140f" }}
            >
              {busy ? "Please wait…" : "Update password"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

function Field({ label, type = "text", value, onChange, placeholder, required }) {
  return (
    <div>
      <label className="text-xs text-white/50">{label}</label>
      <input
        type={type} value={value} onChange={onChange} placeholder={placeholder} required={required}
        className="mt-1 w-full rounded-xl px-4 py-2.5 text-white text-sm outline-none"
        style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)" }}
      />
    </div>
  );
}

// A labeled "box" grouping a few related signup fields together, with its
// own staggered fade-in so each section animates in one after another.
function AuthSection({ title, subtitle, delay = "0s", children }) {
  return (
    <div
      className="auth-box rounded-xl p-4 space-y-3"
      style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", animationDelay: delay }}
    >
      <div>
        <div className="text-xs font-bold uppercase tracking-wide" style={{ color: "#00C896" }}>{title}</div>
        {subtitle && <div className="text-xs text-white/35 mt-0.5">{subtitle}</div>}
      </div>
      {children}
    </div>
  );
}

/* ---------------- Region helpers: classify a buyer city as UAE or KSA ---------------- */
const UAE_CITIES = ["dubai", "abu dhabi", "sharjah", "ajman", "fujairah", "ras al khaimah", "rak", "umm al quwain", "al ain"];
const KSA_CITIES = ["riyadh", "jeddah", "jedda", "mecca", "makkah", "medina", "madinah", "dammam", "khobar", "al khobar", "jubail", "taif", "abha", "tabuk", "jizan"];
function isUAECity(city) {
  const c = (city || "").trim().toLowerCase();
  return UAE_CITIES.some((u) => c.includes(u));
}
function isKSACity(city) {
  const c = (city || "").trim().toLowerCase();
  return KSA_CITIES.some((k) => c.includes(k));
}

/* ============================================================
   LOCAL PERSISTENCE — keeps the seller on the same tab/cart after a refresh
============================================================ */
function readLocal(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}
function writeLocal(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* ignore */ }
}

/* ============================================================
   URL ROUTING — keeps the address bar in sync with the current
   page/tab (e.g. /dashboard/products) instead of always staying
   on "/", so refreshing or sharing a link lands on the right page.
============================================================ */
const DASHBOARD_TABS = ["overview", "products", "orders", "invoices", "settings", "requests", "support", "tickets", "admin"];

function pathToRoute(pathname) {
  const parts = pathname.replace(/^\/+|\/+$/g, "").split("/").filter(Boolean);
  if (parts.length === 0) return { view: "home", tab: null };
  if (parts[0] === "signup") return { view: "signup", tab: null };
  if (parts[0] === "login") return { view: "login", tab: null };
  if (parts[0] === "forgot-password") return { view: "forgot", tab: null };
  if (parts[0] === "reset-password") return { view: "reset-password", tab: null };
  if (parts[0] === "dashboard") {
    const tab = DASHBOARD_TABS.includes(parts[1]) ? parts[1] : null;
    return { view: "dashboard", tab };
  }
  return { view: "home", tab: null };
}

function routeToPath(view, tab) {
  if (view === "signup") return "/signup";
  if (view === "login") return "/login";
  if (view === "forgot") return "/forgot-password";
  if (view === "reset-password") return "/reset-password";
  if (view === "dashboard") return tab ? `/dashboard/${tab}` : "/dashboard";
  return "/";
}

/* ============================================================
   SELLER DASHBOARD
============================================================ */
function Dashboard({ session, onLogout, notify, initialTab, onTabChange }) {
  const isAdmin = ADMIN_EMAILS.includes(session.email);
  // Initial tab comes from the URL (e.g. landing on /dashboard/products)
  // when present, otherwise falls back to whatever tab was last used.
  const [tab, setTabRaw] = useState(() => initialTab || readLocal("ef_tab", "overview"));
  const setTab = (t) => { setTabRaw(t); onTabChange && onTabChange(t); };
  // Let the parent know the actual starting tab right after mount, so the
  // address bar reflects it even when it came from localStorage rather than the URL.
  useEffect(() => { onTabChange && onTabChange(tab); }, []); // eslint-disable-line
  const [region, setRegion] = useState("UAE"); // UAE | KSA — which country's dashboard is showing
  // Which order status the Orders tab should open pre-filtered to — set when
  // a dashboard stat card (Pending / Delivered / etc.) is clicked. "all"
  // shows everything, same as opening Orders from the sidebar normally.
  const [ordersStatusFilter, setOrdersStatusFilter] = useState("all");
  const goToOrders = (status = "all") => { setOrdersStatusFilter(status); setTab("orders"); };
  const [catalog, setCatalog] = useState([]);
  const [listings, setListings] = useState([]);
  const [orders, setOrders] = useState([]);
  const [sellerCount, setSellerCount] = useState(0);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  // "Install App" button in the mobile menu — reads the install signal
  // captured early in index.html (window.__pwaInstallEvent) so it works
  // even if the auto-popup banner was missed or dismissed. On iOS, where
  // Safari never fires an install signal, tapping it just shows the
  // manual "Add to Home Screen" instructions instead.
  const [canInstall, setCanInstall] = useState(() => !!window.__pwaInstallEvent);
  useEffect(() => {
    const onReady = () => setCanInstall(!!window.__pwaInstallEvent);
    window.addEventListener("pwaInstallReady", onReady);
    return () => window.removeEventListener("pwaInstallReady", onReady);
  }, []);
  const isStandaloneApp = window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
  const isIOSDevice = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const handleInstallClick = async () => {
    setMobileNavOpen(false);
    if (window.__pwaInstallEvent) {
      window.__pwaInstallEvent.prompt();
      await window.__pwaInstallEvent.userChoice;
      window.__pwaInstallEvent = null;
      setCanInstall(false);
    } else if (isIOSDevice) {
      notify('Tap the Share icon, then "Add to Home Screen" to install the app.');
    } else {
      notify('Open your browser menu and choose "Add to Home Screen" or "Install app".');
    }
  };

  // Remember which sidebar tab the seller was on, so refreshing the page doesn't bounce them back to Dashboard.
  useEffect(() => { writeLocal("ef_tab", tab); }, [tab]);

  // Language switcher — only English is available today, so the dropdown
  // just opens and shows that (with more languages coming soon), rather
  // than doing nothing when clicked.
  const [langOpen, setLangOpen] = useState(false);
  const langRef = useRef(null);

  // Notification bell — tracks order status changes (shipped / delivered /
  // returned) for this seller. Persisted per-seller in localStorage so the
  // list and read/unread state survive a refresh.
  const [notifOpen, setNotifOpen] = useState(false);
  const notifRef = useRef(null);
  const [notifications, setNotifications] = useState(() => readLocal(`ef_notifs_${session.email}`, []));
  useEffect(() => { writeLocal(`ef_notifs_${session.email}`, notifications); }, [notifications, session.email]);
  const unreadCount = notifications.filter((n) => !n.read).length;
  const ordersRef = useRef(orders);
  useEffect(() => { ordersRef.current = orders; }, [orders]);

  // Profile menu — Customer Support / Tickets / Seller Details.
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef(null);

  // Close any open dropdown when clicking outside of it.
  useEffect(() => {
    const onClickOutside = (e) => {
      if (langRef.current && !langRef.current.contains(e.target)) setLangOpen(false);
      if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false);
      if (profileRef.current && !profileRef.current.contains(e.target)) setProfileOpen(false);
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const STATUS_NOTIF_TEXT = {
    shipped: (id) => `Order #${id} has been shipped.`,
    delivered: (id) => `Order #${id} has been delivered.`,
    returned: (id) => `Order #${id} was returned.`,
  };
  const pushNotification = (orderId, status) => {
    const text = STATUS_NOTIF_TEXT[status];
    if (!text) return;
    setNotifications((prev) => [
      { id: `${orderId}-${status}-${Date.now()}`, orderId, status, message: text(orderId), createdAt: new Date().toISOString(), read: false },
      ...prev,
    ].slice(0, 30));
  };
  const markNotificationsRead = () => setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));

  // Whether Admin has marked this seller as "Premium" — just a badge/status,
  // doesn't change which products they see (that's the per-product "Visible to" list).
  const [isPremiumSeller, setIsPremiumSeller] = useState(() => readLocal(`ef_premium_${session.email}`, false));

  const reload = async () => {
    const rawCatalog = await fetchCatalog();
    const order = await fetchProductOrder();
    setCatalog(applyProductOrder(rawCatalog, order));
    setListings(await fetchListings(session.email));
    setOrders(await fetchOrders(session.email));
    const premiumEmails = await fetchPremiumSellerEmails();
    const premium = premiumEmails.includes(session.email);
    setIsPremiumSeller(premium);
    writeLocal(`ef_premium_${session.email}`, premium);
    if (isAdmin) {
      const { count } = await supabase.from("profiles").select("*", { count: "exact", head: true });
      setSellerCount(count || 0);
    }
  };
  useEffect(() => { reload(); }, []); // eslint-disable-line

  // Admin drags products into a new order in the "Reorder products" panel —
  // update on screen immediately (optimistic), then persist the new order so
  // it sticks for every seller after their next reload.
  const reorderCatalog = async (newOrderedList) => {
    setCatalog(newOrderedList);
    await saveProductOrder(newOrderedList.map((p) => p.id));
  };

  // A product Admin has assigned to specific sellers only shows up for
  // those sellers (and for Admin, who manages everything). A product with
  // no assignment (assignedSellerEmails is empty) stays visible to everyone,
  // exactly like before. On top of that, a product Admin has marked
  // "Premium" only shows up for sellers Admin has separately marked as
  // Premium (isPremiumSeller) — everyone else never sees it in their catalog.
  const visibleCatalog = isAdmin
    ? catalog
    : catalog
        .filter((p) => !(p.assignedSellerEmails || []).length || p.assignedSellerEmails.includes(session.email));

  // Live-updates: when Admin changes an order's status (ship / deliver /
  // return it), reflect the new status here right away and drop a
  // notification in the bell for this seller.
  useEffect(() => {
    const channel = supabase
      .channel(`orders-status-${session.email}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "orders", filter: `seller_email=eq.${session.email}` },
        (payload) => {
          const newRow = payload.new;
          if (!newRow) return;
          const prevOrder = ordersRef.current.find((o) => o.id === newRow.id);
          const prevStatus = prevOrder?.status;
          const nextStatus = newRow.status;
          setOrders((prev) => prev.map((o) => (o.id === newRow.id ? { ...o, status: nextStatus } : o)));
          if (nextStatus && nextStatus !== prevStatus && STATUS_NOTIF_TEXT[nextStatus]) {
            pushNotification(newRow.id, nextStatus);
          }
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [session.email]); // eslint-disable-line

  const addListing = async (id) => {
    if (listings.includes(id)) { notify("Already in your listings."); return; }
    const { error } = await supabase.from("listings").insert({ seller_email: session.email, product_id: id });
    if (error) { notify("Could not add listing."); return; }
    setListings([...listings, id]);
    notify("Added to your listings.");
  };
  const removeListing = async (id) => {
    await supabase.from("listings").delete().eq("seller_email", session.email).eq("product_id", id);
    setListings(listings.filter((x) => x !== id));
  };
  const addOrder = async (order) => {
    const newOrder = { ...order, id: "ORD" + Date.now().toString().slice(-6) + Math.floor(Math.random() * 90 + 10), status: "pending", paymentStatus: "unpaid", deliveryCharge: order.deliveryCharge ?? DELIVERY_CHARGE };
    const { error } = await supabase.from("orders").insert({
      id: newOrder.id, seller_email: session.email, product_id: newOrder.productId, product_name: newOrder.productName,
      qty: newOrder.qty, sell_price: newOrder.sellPrice, cost_price: newOrder.costPrice, list_price: newOrder.listPrice ?? newOrder.sellPrice, buyer: newOrder.buyer, city: newOrder.city,
      customer_email: newOrder.customerEmail || null, customer_phone: newOrder.customerPhone || null, customer_address: newOrder.customerAddress || null,
      notes: newOrder.notes || null,
      status: "pending", payment_status: "unpaid", delivery_charge: newOrder.deliveryCharge,
    });
    if (error) { notify("Could not save order."); return null; }
    setOrders([newOrder, ...orders]);

    // Every order pulls straight from stock, so once enough orders land the
    // product flips to Out of Stock on its own — Admin never has to zero it
    // out by hand.
    const product = catalog.find((p) => p.id === newOrder.productId);
    if (product) {
      const newStock = Math.max(0, (Number(product.stock) || 0) - Number(newOrder.qty || 0));
      const { error: stockError } = await supabase.from("products").update({ stock: newStock }).eq("id", newOrder.productId);
      if (!stockError) setCatalog((prev) => prev.map((p) => (p.id === newOrder.productId ? { ...p, stock: newStock } : p)));
    }

    notify("Order added — tracking as Pending.");
    return newOrder;
  };
  const setOrderStatus = async (id, status) => {
    await supabase.from("orders").update({ status }).eq("id", id);
    setOrders(orders.map((o) => (o.id === id ? { ...o, status } : o)));
  };

  const delivered = orders.filter((o) => o.status === "delivered");
  const pending = orders.filter((o) => o.status === "pending");
  const shipped = orders.filter((o) => o.status === "shipped");
  const cancelled = orders.filter((o) => o.status === "cancelled");
  const returned = orders.filter((o) => o.status === "returned");
  // Delivery charge is money collected from the customer, not seller profit — profit stays product-only.
  const billTotal = (o) => o.sellPrice * o.qty + (o.deliveryCharge || 0);
  const itemProfit = (o) => (o.sellPrice - o.listPrice) * o.qty;
  const confirmedProfit = delivered.reduce((s, o) => s + itemProfit(o), 0);
  const pendingCOD = pending.reduce((s, o) => s + billTotal(o), 0);
  const deliveredRevenue = delivered.reduce((s, o) => s + billTotal(o), 0);
  // Invoice only reflects profit on delivered orders — pending/shipped/cancelled/returned aren't billed yet.
  const unpaidInvoice = delivered.filter((o) => o.paymentStatus !== "paid").reduce((s, o) => s + itemProfit(o), 0);
  const paidInvoice = delivered.filter((o) => o.paymentStatus === "paid").reduce((s, o) => s + itemProfit(o), 0);

  // Split orders by country so the Dashboard tab can show a UAE-only or KSA-only view
  const regionOrders = orders.filter((o) => (region === "UAE" ? isUAECity(o.city) : isKSACity(o.city)));
  const regionDelivered = regionOrders.filter((o) => o.status === "delivered");
  const regionPending = regionOrders.filter((o) => o.status === "pending");
  const regionShipped = regionOrders.filter((o) => o.status === "shipped");
  const regionCancelled = regionOrders.filter((o) => o.status === "cancelled");
  const regionReturned = regionOrders.filter((o) => o.status === "returned");
  const regionConfirmedProfit = regionDelivered.reduce((s, o) => s + itemProfit(o), 0);
  const regionUnpaidInvoice = regionDelivered.filter((o) => o.paymentStatus !== "paid").reduce((s, o) => s + itemProfit(o), 0);
  const regionPaidInvoice = regionDelivered.filter((o) => o.paymentStatus === "paid").reduce((s, o) => s + itemProfit(o), 0);
  const regionDeliveredRevenue = regionDelivered.reduce((s, o) => s + billTotal(o), 0);


  const NAV = [
    { id: "overview", label: "Dashboard", icon: Boxes },
    { id: "products", label: "Products", icon: Package },
    { id: "orders", label: "Orders", icon: Truck, count: orders.length },
    { id: "invoices", label: "Invoices", icon: Receipt },
    { id: "settings", label: "Seller Details", icon: Sparkles },
    { id: "requests", label: "Product Requests", icon: Package },
    { id: "support", label: "Customer Support", icon: LifeBuoy },
    { id: "tickets", label: "Tickets", icon: MessageCircle },
    ...(isAdmin ? [{ id: "admin", label: "Admin", icon: Globe2 }] : []),
  ];

  return (
    <div style={{ fontFamily: "Inter, sans-serif", background: "linear-gradient(180deg,#EEF2F8 0%,#F8FAFC 320px,#F8FAFC 100%)", position: "relative", overflow: "hidden" }} className="min-h-screen flex">
      <div className="pointer-events-none absolute -top-24 -left-24 w-[420px] h-[420px] rounded-full opacity-[0.10] blur-3xl" style={{ background: isPremiumSeller ? "#F8B400" : "#00C896" }} />
      <div className="pointer-events-none absolute top-40 -right-32 w-[380px] h-[380px] rounded-full opacity-[0.08] blur-3xl" style={{ background: "#F8B400" }} />
      <div className="pointer-events-none absolute top-0 left-0 right-0 h-72" style={{ background: "linear-gradient(180deg, rgba(11,31,58,0.04), transparent)" }} />
      {/* Sidebar */}
      <aside className="hidden md:flex flex-col w-64 px-5 py-6 min-h-screen relative z-10 overflow-hidden" style={{ background: "#0B1F3A" }}>
        {/* faint gold diamond-lattice texture — a nod to Gulf geometric patterns */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.05]"
          style={{
            backgroundImage: "linear-gradient(45deg, #F8B400 1px, transparent 1px), linear-gradient(-45deg, #F8B400 1px, transparent 1px)",
            backgroundSize: "26px 26px",
          }}
        />
        <div className="pointer-events-none absolute -bottom-10 -left-10 w-48 h-48 rounded-full opacity-[0.10] blur-3xl" style={{ background: "#F8B400" }} />

        <div className="relative flex items-center gap-2.5 px-2">
          <Logo />
          <span className="font-extrabold text-white text-xl tracking-tight" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            Emirate<span style={{ color: isPremiumSeller ? "#F8B400" : "#00C896" }}>Fulfil</span>
          </span>
        </div>
        <div className="mt-8 space-y-1">
          {NAV.map((n) => (
            <button
              key={n.id} onClick={() => { if (n.id === "orders") setOrdersStatusFilter("all"); setTab(n.id); }}
              className="group w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 ease-out hover:scale-[1.03] hover:translate-x-1 active:scale-95"
              style={
                tab === n.id
                  ? (isPremiumSeller
                      ? { background: "rgba(248,180,0,0.16)", color: "#F8B400", boxShadow: "0 4px 14px rgba(248,180,0,0.22)" }
                      : { background: "rgba(0,200,150,0.15)", color: "#00C896", boxShadow: "0 4px 14px rgba(0,200,150,0.18)" })
                  : { color: "rgba(255,255,255,0.6)" }
              }
            >
              <n.icon
                className="w-4.5 h-4.5 transition-transform duration-300 ease-out group-hover:rotate-6 group-hover:scale-110"
                style={tab === n.id ? { color: isPremiumSeller ? "#F8B400" : "#00C896" } : {}}
              />
              <span className="flex-1 text-left transition-transform duration-300 group-hover:translate-x-0.5">{n.label}</span>
              {n.count > 0 && (
                <span
                  className="text-[11px] font-bold px-2 py-0.5 rounded-full"
                  style={tab === n.id ? { background: "#00C896", color: "#04140f" } : { background: "rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.7)" }}
                >
                  {n.count}
                </span>
              )}
            </button>
          ))}
        </div>
        <div className="relative mt-6 flex-1 min-h-[150px] rounded-2xl overflow-hidden flex flex-col items-center justify-center text-center px-4 py-6" style={{ background: "linear-gradient(160deg, rgba(0,200,150,0.10), rgba(11,31,58,0.35))", border: "1px solid rgba(0,200,150,0.18)" }}>
          <div className="pointer-events-none absolute -top-10 -right-10 w-32 h-32 rounded-full opacity-30 blur-2xl" style={{ background: "#00C896", animation: "blobMove 8s ease-in-out infinite" }} />
          <div className="pointer-events-none absolute -bottom-10 -left-10 w-28 h-28 rounded-full opacity-20 blur-2xl" style={{ background: "#F8B400", animation: "blobMove 10s ease-in-out infinite reverse" }} />
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.06]"
            style={{ backgroundImage: "radial-gradient(circle, #ffffff 1px, transparent 1px)", backgroundSize: "14px 14px" }}
          />
          <div className="relative w-14 h-14 flex items-center justify-center mb-3">
            <div className="absolute inset-0 rounded-2xl flex items-center justify-center" style={{ background: "linear-gradient(135deg,#00C896,#0B7A5E)", boxShadow: "0 10px 24px rgba(0,200,150,0.35)" }}>
              <Globe2 className="w-7 h-7 text-white" />
            </div>
            {/* Tiny package/truck/warehouse icons orbiting the globe — just for fun */}
            <div className="absolute inset-0" style={{ animation: "orbitSpin 9s linear infinite" }}>
              <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-5 h-5 rounded-full flex items-center justify-center" style={{ background: "#F8B400", boxShadow: "0 4px 10px rgba(248,180,0,0.4)" }}>
                <Package className="w-3 h-3 text-white" />
              </div>
            </div>
            <div className="absolute inset-0" style={{ animation: "orbitSpin 9s linear -3s infinite" }}>
              <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-5 h-5 rounded-full flex items-center justify-center" style={{ background: "#0EA5E9", boxShadow: "0 4px 10px rgba(14,165,233,0.4)" }}>
                <Truck className="w-3 h-3 text-white" />
              </div>
            </div>
            <div className="absolute inset-0" style={{ animation: "orbitSpin 9s linear -6s infinite" }}>
              <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-5 h-5 rounded-full flex items-center justify-center" style={{ background: "#EC4899", boxShadow: "0 4px 10px rgba(236,72,153,0.4)" }}>
                <Warehouse className="w-3 h-3 text-white" />
              </div>
            </div>
          </div>
          <div className="relative text-white text-sm font-bold" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Delivering across the Gulf</div>
          <p className="relative text-white/50 text-xs mt-1.5 leading-relaxed">UAE · KSA · Qatar · Oman · Bahrain · Kuwait</p>
          <div className="relative mt-4 flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1.5 rounded-full" style={{ background: "rgba(0,200,150,0.15)", color: "#00C896" }}>
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: "#00C896", animation: "livePulse 2s infinite" }} />
            UAE is live now
          </div>
        </div>
        <div className="relative mt-6 pt-6" style={{ borderTop: "1px solid rgba(255,255,255,0.1)" }}>
          <div className="text-white text-base font-semibold">{session.name}</div>
          <div className="text-white/40 text-sm">{session.company || "Seller account"}</div>
          <button onClick={onLogout} className="mt-3 text-white/60 text-sm font-semibold hover:text-white">Log out</button>
          <div className="mt-5 h-[3px] w-full rounded-full overflow-hidden flex opacity-60">
            <div className="flex-[7]" style={{ background: "#FF0000" }} />
            <div className="flex-[24] flex flex-col">
              <div className="flex-1" style={{ background: "#00732F" }} />
              <div className="flex-1" style={{ background: "#FFFFFF" }} />
              <div className="flex-1" style={{ background: "#000000" }} />
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile top bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-5 py-4" style={{ background: "#0B1F3A" }}>
        <span className="font-bold text-white text-base" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Emirate<span style={{ color: "#00C896" }}>Fulfil</span></span>
        <button onClick={() => setMobileNavOpen((v) => !v)} className="text-white">{mobileNavOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}</button>
      </div>
      {mobileNavOpen && (
        <div className="md:hidden fixed top-16 left-0 right-0 z-40 px-5 py-4 space-y-1" style={{ background: "#0B1F3A" }}>
          {NAV.map((n, i) => (
            <button
              key={n.id}
              onClick={() => { if (n.id === "orders") setOrdersStatusFilter("all"); setTab(n.id); setMobileNavOpen(false); }}
              className="group w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-white/80 transition-all duration-300 ease-out hover:scale-[1.02] hover:translate-x-1 active:scale-95"
              style={{
                animation: `dashFadeIn 0.35s ease-out ${i * 60}ms both`,
                ...(tab === n.id ? { background: "rgba(0,200,150,0.15)", color: "#00C896" } : {}),
              }}
            >
              <n.icon className="w-4.5 h-4.5 transition-transform duration-300 group-hover:rotate-6 group-hover:scale-110" />
              <span className="flex-1 text-left">{n.label}</span>
              {n.count > 0 && (
                <span
                  className="text-[11px] font-bold px-2 py-0.5 rounded-full"
                  style={tab === n.id ? { background: "#00C896", color: "#04140f" } : { background: "rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.7)" }}
                >
                  {n.count}
                </span>
              )}
            </button>
          ))}
          {!isStandaloneApp && (
            <button
              onClick={handleInstallClick}
              className="group w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-white/80 transition-all duration-300 ease-out hover:scale-[1.02] hover:translate-x-1 active:scale-95"
              style={{ animation: `dashFadeIn 0.35s ease-out ${NAV.length * 60}ms both` }}
            >
              <Download className="w-4.5 h-4.5 transition-transform duration-300 group-hover:rotate-6 group-hover:scale-110" style={{ color: "#00C896" }} />
              <span className="flex-1 text-left">{canInstall ? "Install App" : "Add to Home Screen"}</span>
            </button>
          )}
          <button onClick={onLogout} className="w-full text-left px-3 py-2.5 text-sm font-semibold text-red-300 transition-transform duration-300 hover:translate-x-1 active:scale-95">Log out</button>
        </div>
      )}
      <style>{`
        @keyframes waveHand {
          0%, 60%, 100% { transform: rotate(0deg); }
          10% { transform: rotate(14deg); }
          20% { transform: rotate(-8deg); }
          30% { transform: rotate(14deg); }
          40% { transform: rotate(-4deg); }
          50% { transform: rotate(10deg); }
        }
        @keyframes dashFadeIn {
          from { opacity: 0; transform: translateY(-6px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes dashTabIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes livePulse {
          0% { box-shadow: 0 0 0 0 rgba(0,200,150,0.55); }
          70% { box-shadow: 0 0 0 8px rgba(0,200,150,0); }
          100% { box-shadow: 0 0 0 0 rgba(0,200,150,0); }
        }
        @keyframes orbitSpin {
          from { transform: rotate(0deg) translateX(38px) rotate(0deg); }
          to { transform: rotate(360deg) translateX(38px) rotate(-360deg); }
        }
        @keyframes sparkleTwinkle {
          0%, 100% { opacity: 0.55; transform: scale(0.85); }
          50% { opacity: 1; transform: scale(1.15); }
        }
        @keyframes goldShimmer {
          0% { transform: translateX(-120%) skewX(-15deg); }
          100% { transform: translateX(220%) skewX(-15deg); }
        }
        @keyframes goldPulseRing {
          0% { box-shadow: 0 0 0 0 rgba(248,180,0,0.45); }
          70% { box-shadow: 0 0 0 10px rgba(248,180,0,0); }
          100% { box-shadow: 0 0 0 0 rgba(248,180,0,0); }
        }
        @keyframes marqueeScroll {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
        @keyframes heartPop {
          0% { transform: scale(1); }
          35% { transform: scale(1.35); }
          60% { transform: scale(0.92); }
          100% { transform: scale(1); }
        }
        @keyframes productImgIn {
          from { opacity: 0.4; transform: scale(1.02); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>

      {/* Main */}
      <main className="flex-1 min-w-0 w-full px-6 md:px-10 py-8 md:py-8 pt-24 md:pt-8 max-w-6xl relative z-10 overflow-x-hidden">
        {/* Top bar — language selector, notifications, and account profile.
            Desktop only; the mobile top bar (logo + menu button) covers small screens. */}
        <div className="hidden md:flex items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4" style={{ color: "#0B1F3A" }} />
            <span className="text-sm font-bold" style={{ color: "#111827" }}>Dubai, UAE</span>
            <span className="w-1 h-1 rounded-full" style={{ background: "#9CA3AF" }} />
            <span className="w-2 h-2 rounded-full" style={{ background: "#00C896", animation: "livePulse 2s infinite" }} />
            <span className="text-sm font-medium" style={{ color: "#6B7280" }}>Live Operations</span>
            {isPremiumSeller && (
              <span
                className="ml-2 flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full"
                style={{ background: "linear-gradient(135deg,#FFE29A,#F8B400,#c98f00)", color: "#3a2a0b", animation: "goldPulseRing 2.4s infinite" }}
              >
                <Crown className="w-3 h-3" /> Premium Seller
              </span>
            )}
          </div>
          <div className="flex items-center gap-4">
          <div className="relative" ref={langRef}>
            <button
              onClick={() => { setLangOpen((v) => !v); setNotifOpen(false); }}
              className="flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-full bg-white"
              style={{ border: "1px solid #E5E7EB", color: "#111827" }}
            >
              <Globe2 className="w-4 h-4" style={{ color: "#0B1F3A" }} /> English <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
            </button>
            {langOpen && (
              <div className="absolute right-0 top-12 w-56 rounded-2xl bg-white shadow-xl z-50 overflow-hidden" style={{ border: "1px solid #E5E7EB" }}>
                <button
                  onClick={() => setLangOpen(false)}
                  className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold text-left"
                  style={{ color: "#0B1F3A", background: "rgba(0,200,150,0.08)" }}
                >
                  English
                  <CheckCircle2 className="w-4 h-4" style={{ color: "#00C896" }} />
                </button>
                <div className="px-4 py-3 text-xs text-gray-400 flex items-center justify-between border-t" style={{ borderColor: "#F1F1F1" }}>
                  <span>العربية (Arabic)</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: "#F3F4F6", color: "#9CA3AF" }}>Soon</span>
                </div>
              </div>
            )}
          </div>
          <div className="relative" ref={notifRef}>
            <button
              onClick={() => {
                setNotifOpen((v) => {
                  const next = !v;
                  if (next) markNotificationsRead();
                  return next;
                });
                setLangOpen(false);
              }}
              className="relative w-10 h-10 rounded-full bg-white flex items-center justify-center"
              style={{ border: "1px solid #E5E7EB" }}
            >
              <Bell className="w-4.5 h-4.5" style={{ color: "#0B1F3A" }} />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4.5 h-4.5 rounded-full flex items-center justify-center text-[10px] font-bold text-white" style={{ background: "#00C896" }}>
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </button>
            {notifOpen && (
              <div className="absolute right-0 top-12 w-80 max-h-96 overflow-y-auto rounded-2xl bg-white shadow-xl z-50" style={{ border: "1px solid #E5E7EB" }}>
                <div className="px-4 py-3 text-sm font-bold border-b" style={{ color: "#111827", borderColor: "#F1F1F1" }}>Notifications</div>
                {notifications.length === 0 ? (
                  <div className="px-4 py-8 text-sm text-gray-400 text-center">No notifications yet.<br />You'll see updates here when an order ships, is delivered, or is returned.</div>
                ) : (
                  notifications.map((n) => (
                    <div key={n.id} className="px-4 py-3 text-sm border-b flex items-start gap-2" style={{ borderColor: "#F1F1F1" }}>
                      <span
                        className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0"
                        style={{ background: n.status === "delivered" ? "#00C896" : n.status === "returned" ? "#EF4444" : "#F8B400" }}
                      />
                      <div>
                        <div className="font-medium" style={{ color: "#111827" }}>{n.message}</div>
                        <div className="text-xs text-gray-400 mt-0.5">{new Date(n.createdAt).toLocaleString()}</div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
          <div className="w-px h-8" style={{ background: "#E5E7EB" }} />
          <div className="relative" ref={profileRef}>
            <button
              onClick={() => { setProfileOpen((v) => !v); setLangOpen(false); setNotifOpen(false); }}
              className="flex items-center gap-3"
            >
              <div className="relative flex-shrink-0">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white"
                  style={
                    isPremiumSeller
                      ? { background: "linear-gradient(135deg,#F8B400,#c98f00)", boxShadow: "0 0 0 2px #FFE29A, 0 6px 14px rgba(248,180,0,0.45)" }
                      : { background: "linear-gradient(135deg,#00C896,#0B7A5E)" }
                  }
                >
                  {(session.name || session.email || "?").trim()[0]?.toUpperCase()}
                </div>
                {isPremiumSeller && (
                  <div
                    className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full flex items-center justify-center"
                    style={{ background: "linear-gradient(135deg,#FFE29A,#F8B400)", boxShadow: "0 2px 6px rgba(248,180,0,0.6)" }}
                  >
                    <Crown className="w-3 h-3" style={{ color: "#3a2a0b" }} />
                  </div>
                )}
              </div>
              <div className="text-left">
                <div className="text-sm font-bold" style={{ color: "#111827" }}>{session.name || session.email}</div>
                <div className="text-xs flex items-center gap-1" style={isPremiumSeller ? { color: "#c98f00" } : { color: "#6B7280" }}>
                  {isPremiumSeller && <Crown className="w-3 h-3" />} {isPremiumSeller ? "Premium Account" : "Business Account"}
                </div>
              </div>
              <ChevronDown className="w-4 h-4 text-gray-400" />
            </button>
            {profileOpen && (
              <div className="absolute right-0 top-14 w-60 rounded-2xl bg-white shadow-xl z-50 overflow-hidden" style={{ border: "1px solid #E5E7EB" }}>
                {[
                  { icon: Package, label: "Product Requests", tab: "requests" },
                  { icon: LifeBuoy, label: "Customer Support", tab: "support" },
                  { icon: FileText, label: "Tickets", tab: "tickets" },
                  { icon: User, label: "Seller Details", tab: "settings" },
                ].map((item) => (
                  <button
                    key={item.tab}
                    onClick={() => { setTab(item.tab); setProfileOpen(false); }}
                    className="w-full flex items-center gap-3 px-4 py-3 text-sm font-semibold text-left transition-colors duration-150 hover:bg-gray-50"
                    style={{ color: "#111827" }}
                  >
                    <item.icon className="w-4 h-4" style={{ color: "#0B1F3A" }} />
                    {item.label}
                  </button>
                ))}
              </div>
            )}
          </div>
          </div>
        </div>

        <div key={tab + region} style={{ animation: "dashTabIn 0.35s ease-out both" }}>
          {tab === "overview" && (
            <OverviewTab
              session={session} orders={orders} listings={listings} catalog={catalog} setTab={setTab} goToOrders={goToOrders} isPremiumSeller={isPremiumSeller}
              confirmedProfit={confirmedProfit} deliveredRevenue={deliveredRevenue}
              pending={pending} shipped={shipped} delivered={delivered} cancelled={cancelled} returned={returned}
              region={region} setRegion={setRegion}
              regionOrders={regionOrders} regionConfirmedProfit={regionConfirmedProfit}
              regionDeliveredRevenue={regionDeliveredRevenue}
              regionUnpaidInvoice={regionUnpaidInvoice} regionPaidInvoice={regionPaidInvoice}
              regionPending={regionPending} regionShipped={regionShipped} regionDelivered={regionDelivered}
              regionCancelled={regionCancelled} regionReturned={regionReturned}
            />
          )}
          {/* Settings, Product Requests, Support, Tickets, and Admin aren't country-specific, so they stay open regardless of the region switch.
              Every other tab is UAE-only for now — switching to KSA/Qatar shows Coming Soon everywhere. */}
          {tab !== "overview" && tab !== "settings" && tab !== "requests" && tab !== "support" && tab !== "tickets" && tab !== "admin" && region !== "UAE" && (
            <ComingSoonPanel region={region} />
          )}
          {(tab === "settings" || tab === "requests" || tab === "support" || tab === "tickets" || region === "UAE") && (
            <>
              {tab === "products" && <CatalogTab catalog={visibleCatalog} onAdd={addListing} onPlaceOrder={addOrder} notify={notify} onViewOrders={() => setTab("orders")} sellerEmail={session.email} isAdmin={isAdmin} isPremiumSeller={isPremiumSeller} onCatalogChanged={reload} />}
              {tab === "orders" && (
                isAdmin
                  ? <AdminOrdersPanel notify={notify} />
                  : <OrdersTab orders={orders} confirmedProfit={confirmedProfit} deliveredRevenue={paidInvoice} returnedCount={returned.length} initialStatusFilter={ordersStatusFilter} />
              )}
              {tab === "invoices" && <InvoicesTab session={session} />}
              {tab === "settings" && <SettingsTab session={session} notify={notify} />}
              {tab === "requests" && (
                isAdmin
                  ? <AdminTicketsPanel notify={notify} category="product_request" icon={Package} idPrefix="PRQ" heading="Product Requests — all sellers" subheading={(openCount) => `${openCount} open request${openCount === 1 ? "" : "s"} waiting on a reply.`} emptyText="No product requests here." replyPlaceholder="Reply as Admin…" senderDisplayName="Admin" />
                  : <TicketsTab session={session} notify={notify} category="product_request" icon={Package} idPrefix="PRQ" heading="Product Requests" subheading="Can't find a product in the catalog? Tell Admin what you're after and they'll source it." newButtonLabel="+ New request" listLabel="Your requests" emptyText="No product requests yet — ask for something not in the catalog." subjectLabel="Product name" subjectPlaceholder="e.g. Wireless earbuds with charging case" bodyLabel="Details" bodyPlaceholder="Quantity, budget, a reference link or photo, target price…" createdMsg="Request sent — Admin will reply here." adminDisplayName="Admin" />
              )}
              {tab === "support" && <SupportTab session={session} />}
              {tab === "tickets" && (
                isAdmin
                  ? <AdminTicketsPanel notify={notify} />
                  : <TicketsTab session={session} notify={notify} />
              )}
            </>
          )}
          {tab === "admin" && isAdmin && <AdminTab catalog={catalog} sellerCount={sellerCount} notify={notify} onCatalogChanged={reload} onReorder={reorderCatalog} />}
        </div>
      </main>
    </div>
  );
}

function StatCard({ label, value, color = "#0B1F3A", sub, prefix = "", suffix = "", delay = 0, icon: Icon, onClick, goldRing = false }) {
  const [shown, setShown] = useState(false);
  const [hover, setHover] = useState(false);
  const [display, setDisplay] = useState(0);
  const numeric = typeof value === "number" ? value : parseFloat(String(value).replace(/[^0-9.]/g, "")) || 0;

  useEffect(() => {
    const t = setTimeout(() => setShown(true), delay);
    return () => clearTimeout(t);
  }, [delay]);

  useEffect(() => {
    if (!shown) return;
    let start = null;
    const duration = 800;
    const step = (ts) => {
      if (!start) start = ts;
      const p = Math.min((ts - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(Math.round(eased * numeric));
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [shown, numeric]);

  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => { if (e.key === "Enter" || e.key === " ") onClick(); } : undefined}
      className={`relative rounded-2xl p-5 transition-all duration-500 overflow-hidden ${onClick ? "cursor-pointer" : "cursor-default"}`}
      style={{
        background: hover
          ? `linear-gradient(160deg, ${color}10, #ffffff 55%)`
          : "#ffffff",
        border: `1px solid ${hover ? color + "55" : (goldRing ? "rgba(248,180,0,0.35)" : "#E5E7EB")}`,
        opacity: shown ? 1 : 0,
        transform: shown ? (hover ? "translateY(-6px) scale(1.02)" : "translateY(0px) scale(1)") : "translateY(14px) scale(0.97)",
        boxShadow: hover ? `0 22px 40px -12px ${color}55` : (goldRing ? "0 2px 10px -2px rgba(248,180,0,0.25)" : "0 1px 2px rgba(16,24,40,0.04)"),
      }}
    >
      <div
        className="absolute top-0 left-0 right-0 h-[3px] rounded-full transition-all duration-500"
        style={{
          background: `linear-gradient(90deg, ${color}, ${color}00)`,
          boxShadow: hover ? `0 0 12px 1px ${color}90` : "none",
        }}
      />
      <div
        className="absolute -top-6 -right-6 w-24 h-24 rounded-full transition-opacity duration-500"
        style={{ background: `radial-gradient(circle, ${color}25, transparent 70%)`, opacity: hover ? 1 : 0.5 }}
      />
      <div className="relative flex items-center justify-between">
        <div className="text-xs font-medium text-gray-500">{label}</div>
        {Icon && (
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-500"
            style={{
              background: hover ? `linear-gradient(135deg, ${color}, ${color}CC)` : color + "1A",
              boxShadow: hover ? `0 8px 18px -4px ${color}80` : "none",
              transform: hover ? "rotate(-8deg) scale(1.1)" : "rotate(0deg) scale(1)",
            }}
          >
            <Icon className="w-5 h-5 transition-colors duration-500" style={{ color: hover ? "#fff" : color }} />
          </div>
        )}
      </div>
      <div className="relative text-[26px] leading-tight font-extrabold mt-2.5 tracking-tight" style={{ color, fontFamily: "'Space Grotesk', sans-serif" }}>
        {prefix}{display.toLocaleString()}{suffix}
      </div>
      {sub && <div className="relative text-xs text-gray-400 mt-1">{sub}</div>}
    </div>
  );
}

// Real vector flags (simplified) — Windows renders emoji flags as plain "AE"/"SA"/"QA"
// letter badges, so we draw the actual flags ourselves for a proper look everywhere.
function MiniFlag({ id, className = "w-5 h-3.5" }) {
  const common = "rounded-[2px] overflow-hidden flex-shrink-0 ring-1 ring-black/10";
  if (id === "UAE") {
    return (
      <svg viewBox="0 0 24 16" className={`${className} ${common}`}>
        <rect width="24" height="16" fill="#00732F" />
        <rect y="0" width="24" height="5.33" fill="#00732F" />
        <rect y="5.33" width="24" height="5.34" fill="#FFFFFF" />
        <rect y="10.67" width="24" height="5.33" fill="#000000" />
        <rect width="7" height="16" fill="#FF0000" />
      </svg>
    );
  }
  if (id === "KSA") {
    return (
      <svg viewBox="0 0 24 16" className={`${className} ${common}`}>
        <rect width="24" height="16" fill="#006C35" />
        <rect y="6.2" width="24" height="1.4" fill="#FFFFFF" />
        <rect y="10" width="14" height="1.1" fill="#FFFFFF" />
      </svg>
    );
  }
  if (id === "QATAR") {
    return (
      <svg viewBox="0 0 24 16" className={`${className} ${common}`}>
        <rect width="24" height="16" fill="#8D1B3D" />
        <rect width="8" height="16" fill="#FFFFFF" />
        <polygon points="8,0 10,0 8,2 10,3.2 8,4.4 10,5.6 8,6.8 10,8 8,9.2 10,10.4 8,11.6 10,12.8 8,14 10,16 8,16" fill="#FFFFFF" />
      </svg>
    );
  }
  return null;
}

function LiveClock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  const dateLabel = now.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });
  const timeLabel = now.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  const hour = now.getHours();
  const greeting = hour < 12 ? "Good Morning" : hour < 17 ? "Good Afternoon" : "Good Evening";
  return { dateLabel, timeLabel, greeting };
}

// Continuously-scrolling announcement strip for the top of the seller
// dashboard (e.g. "UAE Dropshipping is Live · Returns & Order Confirmation
// are FREE"). Text is duplicated into two back-to-back groups and the
// track is animated from 0% to -50%, so the loop is seamless no matter
// how long the text is.
function MarqueeTicker({ text, speedSec = 20 }) {
  const copies = Array.from({ length: 4 });
  const Group = () => (
    <div className="flex items-center flex-shrink-0">
      {copies.map((_, i) => (
        <span
          key={i}
          className="flex items-center gap-2 px-6 text-xs sm:text-sm font-semibold whitespace-nowrap"
          style={{ color: "#7FE8C9", fontFamily: "'Plus Jakarta Sans', sans-serif" }}
        >
          <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: "#00C896", animation: "livePulse 2s infinite" }} />
          {text}
        </span>
      ))}
    </div>
  );
  return (
    <div
      className="relative overflow-hidden rounded-full mb-7"
      style={{ background: "#0B1F3A", border: "1px solid rgba(0,200,150,0.22)" }}
    >
      <div className="flex py-2.5" style={{ width: "max-content", animation: `marqueeScroll ${speedSec}s linear infinite` }}>
        <Group />
        <Group />
      </div>
    </div>
  );
}

function ComingSoonPanel({ region }) {
  const info = {
    KSA: { flag: "🇸🇦", name: "Saudi Arabia" },
    QATAR: { flag: "🇶🇦", name: "Qatar" },
  }[region];
  return (
    <div
      className="rounded-3xl p-14 flex flex-col items-center justify-center text-center bg-white mt-2"
      style={{ border: "1px dashed #D1D5DB", animation: "dashTabIn 0.4s ease-out both" }}
    >
      <div className="text-6xl mb-4 transition-transform duration-500 hover:scale-110">{info.flag}</div>
      <h2 className="text-xl font-extrabold" style={{ color: "#0B1F3A", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
        {info.name} dashboard — Coming soon
      </h2>
      <p className="text-sm text-gray-500 mt-2 max-w-sm">
        We're setting up fulfillment and COD tracking for {info.name}. This tab will light up the moment it's ready — stay tuned!
      </p>
      <span className="mt-5 text-xs font-semibold px-3 py-1.5 rounded-full" style={{ background: "rgba(248,180,0,0.15)", color: "#b07d00" }}>🚧 In progress</span>
    </div>
  );
}

function OverviewTab({
  session, orders, listings, catalog, setTab, goToOrders, isPremiumSeller,
  region, setRegion,
  regionOrders, regionConfirmedProfit, regionDeliveredRevenue,
  regionUnpaidInvoice, regionPaidInvoice,
  regionPending, regionShipped, regionDelivered, regionCancelled, regionReturned,
}) {
  const topListing = catalog.find((p) => p.id === listings[0]);
  const { dateLabel, timeLabel, greeting } = LiveClock();
  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const regionOrdersThisWeek = regionOrders.filter((o) => o.createdAt && new Date(o.createdAt).getTime() >= sevenDaysAgo).length;
  const avgOrderValue = regionDelivered.length ? Math.round(regionDeliveredRevenue / regionDelivered.length) : 0;
  // What share of all UAE orders have actually reached the customer —
  // rounded to a whole percent; 0 orders shows 0% rather than dividing by zero.
  const regionDeliveryRate = regionOrders.length ? Math.round((regionDelivered.length / regionOrders.length) * 100) : 0;

  const cards = [
    { label: "Total orders", value: regionOrders.length, color: "#0B1F3A", icon: Boxes, nav: { tab: "orders", status: "all" } },
    { label: "Pending", value: regionPending.length, color: "#F8B400", icon: ClipboardCheck, nav: { tab: "orders", status: "pending" } },
    { label: "Shipped", value: regionShipped.length, color: "#3B82F6", icon: Truck, nav: { tab: "orders", status: "shipped" } },
    { label: "Delivered", value: regionDelivered.length, color: "#00C896", icon: CheckCircle2, nav: { tab: "orders", status: "delivered" } },
    { label: "Delivery rate", value: regionDeliveryRate, suffix: "%", color: "#00C896", icon: TrendingUp, nav: { tab: "orders", status: "delivered" } },
    { label: "Cancelled", value: regionCancelled.length, color: "#9CA3AF", icon: X, nav: { tab: "orders", status: "cancelled" } },
    { label: "Returned", value: regionReturned.length, color: "#EF4444", icon: RotateCcw, nav: { tab: "orders", status: "returned" } },
    { label: "Confirmed profit", value: regionConfirmedProfit, prefix: "AED ", color: "#00C896", icon: ShieldCheck, nav: { tab: "orders", status: "delivered" } },
    { label: "Unpaid invoice", value: regionUnpaidInvoice, prefix: "AED ", color: "#F8B400", icon: Receipt, nav: { tab: "invoices" } },
    { label: "Paid invoice", value: regionPaidInvoice, prefix: "AED ", color: "#00C896", icon: CheckCircle2, nav: { tab: "invoices" } },
    { label: "Orders this week", value: regionOrdersThisWeek, color: "#3B82F6", icon: Clock, nav: { tab: "orders", status: "all" } },
    { label: "Avg. order value", value: avgOrderValue, prefix: "AED ", color: "#8B5CF6", icon: CreditCard, nav: { tab: "orders", status: "delivered" } },
  ];
  const breakdown = [
    { label: "Pending", count: regionPending.length, color: "#F8B400", status: "pending" },
    { label: "Shipped", count: regionShipped.length, color: "#3B82F6", status: "shipped" },
    { label: "Delivered", count: regionDelivered.length, color: "#00C896", status: "delivered" },
    { label: "Cancelled", count: regionCancelled.length, color: "#9CA3AF", status: "cancelled" },
    { label: "Returned", count: regionReturned.length, color: "#EF4444", status: "returned" },
  ];
  const totalForBar = regionOrders.length || 1;
  const regions = [
    { id: "UAE", flag: "🇦🇪", live: true },
    { id: "KSA", flag: "🇸🇦", live: false },
    { id: "QATAR", flag: "🇶🇦", live: false },
  ];

  const quickActions = [
    { label: "Order Product", tab: "products", icon: Package, color: "#00C896" },
    { label: "See Orders", tab: "orders", icon: Truck, color: "#3B82F6" },
    { label: "View invoices", tab: "invoices", icon: PackageCheck, color: "#F8B400" },
    { label: "Contact Customer Support", tab: "support", icon: LifeBuoy, color: "#0B1F3A" },
  ];

  return (
    <div>
      <MarqueeTicker text="🇦🇪 UAE Dropshipping is Live  ·  Returns & Order Confirmation are FREE" />
      <div
        className="relative overflow-hidden rounded-3xl px-4 py-6 sm:px-7 sm:py-8 mb-7"
        style={
          isPremiumSeller
            ? { background: "linear-gradient(120deg,#1a1405 0%,#3a2a0b 45%,#7a5a0a 90%,#F8B400 145%)", border: "1px solid rgba(248,180,0,0.45)", boxShadow: "0 0 0 1px rgba(248,180,0,0.12), 0 20px 50px -20px rgba(248,180,0,0.35)" }
            : { background: "linear-gradient(120deg,#0B1F3A 0%,#0F2E52 55%,#0B7A5E 130%)" }
        }
      >
        {/* subtle dot-grid texture */}
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{ backgroundImage: "radial-gradient(circle, #ffffff 1px, transparent 1px)", backgroundSize: "18px 18px" }}
        />
        {isPremiumSeller && (
          <div
            className="absolute inset-y-0 w-1/3 pointer-events-none"
            style={{ background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.16), transparent)", animation: "goldShimmer 4.5s ease-in-out infinite" }}
          />
        )}
        {isPremiumSeller && (
          <span
            className="absolute top-3 right-3 sm:top-5 sm:right-6 flex items-center gap-1 sm:gap-1.5 text-[10px] sm:text-xs font-bold px-2 sm:px-3 py-1 sm:py-1.5 rounded-full z-10 whitespace-nowrap"
            style={{ background: "linear-gradient(135deg,#FFE29A,#F8B400,#c98f00)", color: "#3a2a0b", boxShadow: "0 6px 16px rgba(248,180,0,0.5)", animation: "goldPulseRing 2.4s infinite" }}
          >
            <Crown className="w-3 h-3 sm:w-3.5 sm:h-3.5" style={{ animation: "sparkleTwinkle 2s ease-in-out infinite" }} /> Premium Seller
          </span>
        )}
        <div className="absolute -top-16 -right-10 w-64 h-64 rounded-full opacity-30 blur-3xl" style={{ background: isPremiumSeller ? "#F8B400" : "#00C896", animation: "blobMove 9s ease-in-out infinite" }} />
        <div className="absolute -bottom-24 left-1/3 w-72 h-72 rounded-full opacity-20 blur-3xl" style={{ background: "#F8B400", animation: "blobMove 11s ease-in-out infinite reverse" }} />
        <div className="absolute top-1/2 left-10 w-40 h-40 rounded-full opacity-10 blur-3xl -translate-y-1/2" style={{ background: isPremiumSeller ? "#FFD98A" : "#3B82F6", animation: "floatY 7s ease-in-out infinite" }} />

        {/* soft gold desert-dune wave along the very bottom edge of the card */}
        {region === "UAE" && (
          <svg
            viewBox="0 0 500 40"
            preserveAspectRatio="none"
            className="absolute bottom-0 left-0 w-full h-8 opacity-[0.12] pointer-events-none"
          >
            <path d="M0 30 Q60 10 130 24 T260 20 T390 26 T500 16 L500 40 L0 40 Z" fill="#F8B400" />
          </svg>
        )}

        <div className="relative flex flex-col sm:flex-row sm:items-end sm:justify-between gap-5">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="w-2 h-2 rounded-full" style={{ background: "#00C896", animation: "livePulse 2s infinite" }} />
              <span className="text-xs font-semibold tracking-widest uppercase" style={{ color: "#7FE8C9" }}>{dateLabel}</span>
              <span className="text-white/30">·</span>
              <span className="text-xs font-semibold tracking-widest" style={{ color: "#7FE8C9", fontFamily: "'Space Grotesk', sans-serif" }}>{timeLabel}</span>
            </div>
            <h1 className="mt-2 text-3xl sm:text-4xl font-extrabold text-white tracking-tight" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              {greeting}, <span style={{ color: isPremiumSeller ? "#F8B400" : "#00C896" }}>{session.name.split(" ")[0]}</span>! <span style={{ display: "inline-block", animation: "waveHand 2.2s ease-in-out infinite" }}>👋</span>
            </h1>
            <p className="mt-1.5 text-sm text-white/60 max-w-md">
              {region === "UAE"
                ? <>Your UAE fulfillment partner is working smoothly. {regionOrders.length} order{regionOrders.length === 1 ? "" : "s"} logged so far.</>
                : <>Preview your future {region === "KSA" ? "Saudi" : "Qatar"} storefront below.</>}
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
            {/* UAE / KSA / Qatar region switch */}
            <div className="flex items-center rounded-full p-1 relative w-full sm:w-auto" style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.14)" }}>
              {regions.map((r) => (
                <button
                  key={r.id}
                  onClick={() => setRegion(r.id)}
                  className="relative z-10 flex-1 sm:flex-initial px-4 py-1.5 rounded-full text-xs font-bold transition-all duration-300 ease-out hover:scale-[1.04] active:scale-95 flex items-center justify-center gap-1.5"
                  style={
                    region === r.id
                      ? { background: "#00C896", color: "#04140f", boxShadow: "0 4px 14px rgba(0,200,150,0.35)" }
                      : { color: "rgba(255,255,255,0.55)" }
                  }
                >
                  <MiniFlag id={r.id} />
                  {r.id}
                  {!r.live && <span className="ml-0.5 text-[9px] font-semibold px-1.5 py-0.5 rounded-full" style={{ background: "rgba(248,180,0,0.25)", color: "#FFD98A" }}>SOON</span>}
                </button>
              ))}
            </div>
            {region === "UAE" && (
              <div
                className="flex items-center gap-3 pl-4 pr-5 py-2.5 rounded-2xl w-full sm:w-auto"
                style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.16)", backdropFilter: "blur(6px)" }}
              >
                <div className="relative w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: isPremiumSeller ? "linear-gradient(135deg,#F8B400,#c98f00)" : "linear-gradient(135deg,#00C896,#00a67e)", boxShadow: isPremiumSeller ? "0 6px 16px rgba(248,180,0,0.5)" : "0 6px 16px rgba(0,200,150,0.4)", animation: "livePulse 2.4s infinite" }}>
                  <Sparkles className="w-5 h-5 text-white" style={{ animation: "sparkleTwinkle 2.2s ease-in-out infinite" }} />
                  <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full" style={{ background: "#F8B400", animation: "sparkleTwinkle 1.6s ease-in-out infinite 0.3s" }} />
                  <span className="absolute -bottom-1 -left-1 w-1.5 h-1.5 rounded-full" style={{ background: isPremiumSeller ? "#FFE29A" : "#7FE8C9", animation: "sparkleTwinkle 1.9s ease-in-out infinite 0.7s" }} />
                </div>
                <div className="text-right flex-1 sm:flex-initial">
                  <div className="text-[11px] font-medium text-white/50 uppercase tracking-wide">Confirmed profit</div>
                  <div className="text-2xl font-extrabold" style={{ color: isPremiumSeller ? "#FFE29A" : "#fff", fontFamily: "'Space Grotesk', sans-serif" }}>AED {regionConfirmedProfit.toLocaleString()}</div>
                </div>
              </div>
            )}
          </div>
        </div>
        {/* UAE flag-colored accent strip along the bottom for a distinctly local touch */}
        {region === "UAE" && (
          <div className="relative mt-6 h-[3px] w-full rounded-full overflow-hidden flex opacity-70">
            <div className="flex-[7]" style={{ background: "#FF0000" }} />
            <div className="flex-[24] flex flex-col">
              <div className="flex-1" style={{ background: "#00732F" }} />
              <div className="flex-1" style={{ background: "#FFFFFF" }} />
              <div className="flex-1" style={{ background: "#000000" }} />
            </div>
          </div>
        )}
      </div>

      {region !== "UAE" ? (
        <ComingSoonPanel region={region} />
      ) : (
        <>
          {isPremiumSeller && (
            <div className="flex items-center gap-2 mb-3">
              <Crown className="w-4 h-4" style={{ color: "#F8B400" }} />
              <span className="text-xs font-bold tracking-wide uppercase" style={{ color: "#c98f00" }}>Premium insights</span>
              <div className="flex-1 h-px" style={{ background: "linear-gradient(90deg, rgba(248,180,0,0.4), transparent)" }} />
            </div>
          )}
          <div key={region} className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4" style={{ animation: "dashTabIn 0.35s ease-out both" }}>
            {cards.map((c, i) => (
              <StatCard
                key={c.label} label={c.label} value={c.value} prefix={c.prefix} suffix={c.suffix} color={c.color} icon={c.icon} delay={i * 60}
                onClick={c.nav ? () => (c.nav.tab === "orders" ? goToOrders(c.nav.status) : setTab(c.nav.tab)) : undefined}
                goldRing={isPremiumSeller}
              />
            ))}
          </div>

          {/* Quick actions */}
          <div className="rounded-2xl p-5 bg-white mt-6 transition-all duration-300 hover:shadow-lg" style={{ border: "1px solid #E5E7EB" }}>
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: "rgba(139,92,246,0.14)" }}>
                <Zap className="w-4 h-4" style={{ color: "#8B5CF6" }} />
              </div>
              <div className="font-bold text-sm" style={{ color: "#111827", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Quick actions</div>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {quickActions.map((q) => (
                <button
                  key={q.label}
                  onClick={() => setTab(q.tab)}
                  className="group flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all duration-300 ease-out hover:-translate-y-0.5 active:scale-95"
                  style={{ border: "1px solid #F3F4F6" }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = q.color + "55"; e.currentTarget.style.boxShadow = `0 12px 24px -8px ${q.color}45`; e.currentTarget.style.background = q.color + "0A"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#F3F4F6"; e.currentTarget.style.boxShadow = "none"; e.currentTarget.style.background = "transparent"; }}
                >
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center transition-transform duration-300 group-hover:rotate-6 group-hover:scale-110" style={{ background: q.color + "1A" }}>
                    <q.icon className="w-4.5 h-4.5" style={{ color: q.color }} />
                  </div>
                  <span className="text-sm font-semibold" style={{ color: "#111827" }}>{q.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="grid lg:grid-cols-3 gap-5 mt-6">
            <div className="lg:col-span-2 rounded-2xl p-6 bg-white transition-all duration-300 hover:shadow-lg" style={{ border: "1px solid #E5E7EB" }}>
              <div className="flex items-center gap-2.5 mb-4">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: "rgba(0,200,150,0.12)" }}>
                  <Truck className="w-4 h-4" style={{ color: "#00C896" }} />
                </div>
                <div className="font-bold text-sm" style={{ color: "#111827", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Recent UAE orders</div>
              </div>
              {regionOrders.length === 0 ? (
                <div className="text-sm text-gray-400">No UAE orders yet — log one from Orders with a buyer city in Dubai, Abu Dhabi, Sharjah…</div>
              ) : (
                regionOrders.slice(0, 5).map((o) => (
                  <div key={o.id} className="flex items-center justify-between py-2.5" style={{ borderBottom: "1px solid #F3F4F6" }}>
                    <div>
                      <div className="font-semibold text-sm" style={{ color: "#111827" }}>{o.productName}</div>
                      <div className="text-xs text-gray-400">{o.id} · {o.buyer || "Unnamed buyer"}{o.city ? ", " + o.city : ""}</div>
                    </div>
                    <StatusPill status={o.status} />
                  </div>
                ))
              )}
            </div>
            <div className="space-y-5">
              <div className="rounded-2xl p-6 bg-white transition-all duration-300 hover:shadow-lg" style={{ border: "1px solid #E5E7EB" }}>
                <div className="flex items-center gap-2.5 mb-4">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: "rgba(248,180,0,0.14)" }}>
                    <Star className="w-4 h-4" style={{ color: "#F8B400" }} />
                  </div>
                  <div className="font-bold text-sm" style={{ color: "#111827", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Top listing</div>
                </div>
                {topListing ? (
                  <>
                    <div className="w-14 h-14 rounded-xl overflow-hidden flex items-center justify-center" style={{ background: "#F8FAFC" }}>
                      <ProductThumb product={topListing} size={30} />
                    </div>
                    <div className="mt-2 font-semibold text-sm">{topListing.name}</div>
                    <div className="text-xs mt-1 font-semibold" style={{ color: "#F8B400" }}>Profit/unit: AED {topListing.sell - topListing.cost}</div>
                  </>
                ) : (
                  <div className="text-sm text-gray-400">Add a listing to see it here.</div>
                )}
              </div>
              <div className="relative rounded-2xl p-6 overflow-hidden transition-all duration-300 hover:shadow-lg" style={{ background: "linear-gradient(155deg, rgba(0,200,150,0.08), #ffffff 60%)", border: "1px solid #E5E7EB" }}>
                <div className="pointer-events-none absolute -top-8 -right-8 w-28 h-28 rounded-full opacity-40 blur-2xl" style={{ background: "#00C896" }} />
                <div className="relative flex items-center gap-2.5 mb-1">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: "rgba(0,200,150,0.14)" }}>
                    <TrendingUp className="w-4 h-4" style={{ color: "#00C896" }} />
                  </div>
                  <div className="font-bold text-sm" style={{ color: "#111827", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>This week</div>
                </div>
                <div className="relative text-3xl font-bold mt-2" style={{ color: "#00C896", fontFamily: "'Space Grotesk', sans-serif" }}>{regionOrdersThisWeek}</div>
                <div className="relative text-xs text-gray-400 mt-1">order{regionOrdersThisWeek === 1 ? "" : "s"} logged in the last 7 days</div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl p-6 bg-white mt-5 transition-all duration-300 hover:shadow-lg" style={{ border: "1px solid #E5E7EB" }}>
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: "rgba(59,130,246,0.14)" }}>
                <ClipboardCheck className="w-4 h-4" style={{ color: "#3B82F6" }} />
              </div>
              <div className="font-bold text-sm" style={{ color: "#111827", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>UAE order status breakdown</div>
            </div>
            <div className="flex w-full h-3 rounded-full overflow-hidden" style={{ background: "#F3F4F6" }}>
              {breakdown.map((b) => (
                <div key={b.label} className="h-full transition-all duration-700" style={{ width: `${(b.count / totalForBar) * 100}%`, background: b.color, boxShadow: b.count > 0 ? `0 0 8px 0 ${b.color}80 inset` : "none" }} />
              ))}
            </div>
            <div className="flex flex-wrap gap-x-6 gap-y-2 mt-4">
              {breakdown.map((b) => (
                <button key={b.label} onClick={() => goToOrders(b.status)} className="flex items-center gap-2 text-xs text-gray-500 hover:text-gray-700 transition-colors duration-150">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ background: b.color }} />
                  {b.label} <b style={{ color: "#111827" }}>{b.count}</b>
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// Shared across the Admin and Seller order tables so every status pill/select
// uses the same colors and human-readable label for a given status value.
const ORDER_STATUS_STYLES = {
  pending: { background: "rgba(248,180,0,0.15)", color: "#b07d00" },
  confirmation_pending: { background: "rgba(234,88,12,0.12)", color: "#c2410c" },
  confirmed: { background: "rgba(14,165,233,0.12)", color: "#0284c7" },
  customer_not_replying: { background: "rgba(217,119,6,0.12)", color: "#b45309" },
  customer_not_picking_call: { background: "rgba(202,138,4,0.12)", color: "#a16207" },
  wrong_number: { background: "rgba(107,114,128,0.15)", color: "#4B5563" },
  customer_cancelled_confirmation: { background: "rgba(244,63,94,0.12)", color: "#e11d48" },
  dispatched: { background: "rgba(139,92,246,0.14)", color: "#7c3aed" },
  shipped: { background: "rgba(59,130,246,0.12)", color: "#3B82F6" },
  delivered: { background: "rgba(0,200,150,0.15)", color: "#00a67e" },
  returned: { background: "rgba(239,68,68,0.12)", color: "#EF4444" },
  cancelled: { background: "rgba(156,163,175,0.18)", color: "#6B7280" },
};
const ORDER_STATUS_LABELS = {
  pending: "Pending",
  confirmation_pending: "Order confirmation pending",
  confirmed: "Order confirmed",
  customer_not_replying: "Customer not replying",
  customer_not_picking_call: "Customer not picking call",
  wrong_number: "Wrong number",
  customer_cancelled_confirmation: "Customer cancel on confirmation",
  dispatched: "Order dispatched",
  shipped: "Shipped",
  delivered: "Delivered",
  returned: "Returned",
  cancelled: "Cancelled",
};

// Known couriers used across UAE/KSA COD deliveries — each maps a tracking
// number straight to that courier's public tracking page. "Other" lets Admin
// paste a full tracking link instead (used for couriers not in this list,
// or when a courier changes its URL format).
const COURIER_OPTIONS = [
  { value: "", label: "Select courier…" },
  { value: "aramex", label: "Aramex" },
  { value: "smsa", label: "SMSA Express" },
  { value: "dhl", label: "DHL" },
  { value: "fedex", label: "FedEx" },
  { value: "naqel", label: "Naqel Express" },
  { value: "other", label: "Other (paste link)" },
];
const COURIER_TRACKING_URL = {
  aramex: (t) => `https://www.aramex.com/track/results?ShipmentNumber=${encodeURIComponent(t)}`,
  smsa: (t) => `https://www.smsaexpress.com/trackingdetails?TrackNo=${encodeURIComponent(t)}`,
  dhl: (t) => `https://www.dhl.com/global-en/home/tracking.html?tracking-id=${encodeURIComponent(t)}`,
  fedex: (t) => `https://www.fedex.com/fedextrack/?trknbr=${encodeURIComponent(t)}`,
  naqel: (t) => `https://www.naqelexpress.com/en/tracking?awb=${encodeURIComponent(t)}`,
};
// Builds the clickable tracking link for an order, or null if there's not
// enough info yet (no tracking #, no courier picked, or "other" with no
// custom link pasted in).
function buildTrackingLink(o) {
  if (!o) return null;
  if (o.courier === "other") return o.tracking_url || o.trackingUrl || null;
  if (o.courier && COURIER_TRACKING_URL[o.courier] && (o.tracking_number || o.trackingNumber)) {
    return COURIER_TRACKING_URL[o.courier](o.tracking_number || o.trackingNumber);
  }
  return null;
}

function StatusPill({ status }) {
  return <span className="text-xs font-semibold px-2.5 py-1 rounded-full" style={ORDER_STATUS_STYLES[status] || ORDER_STATUS_STYLES.pending}>{ORDER_STATUS_LABELS[status] || status}</span>;
}

function PaymentPill({ status }) {
  const paid = status === "paid";
  return (
    <span
      className="text-xs font-semibold px-2.5 py-1 rounded-full"
      style={paid ? { background: "rgba(0,200,150,0.15)", color: "#00a67e" } : { background: "rgba(248,180,0,0.15)", color: "#b07d00" }}
    >
      {paid ? "Paid" : "Unpaid"}
    </span>
  );
}

/* ---------------- Storefront: product landing page, cart, checkout ---------------- */
const EMIRATES = ["Dubai", "Abu Dhabi", "Sharjah", "Ajman", "Fujairah", "Ras Al Khaimah", "Umm Al Quwain", "Al Ain"];
// Flat delivery/handling charge added on top of the product's selling price.
// This is collected from the customer on COD but is NOT part of the seller's profit.
const DELIVERY_CHARGE = 18;

// Deterministic small "randomness" so the same product always shows the same
// rating/review count/spec values instead of jumping around on every render.
function seededFrom(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  return h;
}

function StarRow({ rating, size = "w-3.5 h-3.5" }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          className={size}
          style={{
            color: n <= Math.round(rating) ? "#F8B400" : "#E5E7EB",
            fill: n <= Math.round(rating) ? "#F8B400" : "#E5E7EB",
          }}
        />
      ))}
    </div>
  );
}

function specsForProduct(product) {
  const category = (product.category || "").toLowerCase();
  const base = [
    ["Brand", "EmirateFulfil Select"],
    ["Warranty", "6-month seller warranty"],
    ["Country of Origin", "Imported, regionally warehoused"],
  ];
  if (category.includes("electronic")) {
    return [
      ["Power", "USB-C rechargeable"],
      ["Connectivity", "Bluetooth 5.0"],
      ...base,
    ];
  }
  if (category.includes("home")) {
    return [
      ["Material", "Food-grade / BPA-free where applicable"],
      ["Care", "Wipe clean, easy to store"],
      ...base,
    ];
  }
  if (category.includes("beauty")) {
    return [
      ["Volume", "50ml"],
      ["Skin/Use Type", "All types"],
      ...base,
    ];
  }
  if (category.includes("accessor")) {
    return [
      ["Compatibility", "Universal fit"],
      ["Material", "Durable ABS + metal"],
      ...base,
    ];
  }
  return base;
}

function daysAgoFromDate(iso) {
  if (!iso) return 0;
  const diff = Date.now() - new Date(iso).getTime();
  return Math.max(0, Math.floor(diff / 86400000));
}

function ProductLandingPage({ product, onBack, onAddToCart, onBuyNow, catalog = [], onOpenProduct }) {
  const [qty, setQty] = useState(1);
  const [tab, setTab] = useState("description");
  // Wishlist heart — a small, purely-for-delight touch (no backend needed).
  // `justLiked` drives a one-shot pop animation, then clears itself.
  const [liked, setLiked] = useState(false);
  const [justLiked, setJustLiked] = useState(false);
  useEffect(() => { setLiked(false); }, [product.id]);
  const toggleLiked = () => {
    setLiked((v) => {
      const next = !v;
      if (next) { setJustLiked(true); setTimeout(() => setJustLiked(false), 550); }
      return next;
    });
  };
  const [descExpanded, setDescExpanded] = useState(false);
  // Real reviews come from Supabase (added by Admin). Until a product has at
  // least one, we fall back to sample reviews so the page isn't empty.
  const [dbReviews, setDbReviews] = useState(null); // null = still loading
  useEffect(() => {
    let active = true;
    setDbReviews(null);
    fetchReviews(product.id).then((r) => { if (active) setDbReviews(r); });
    return () => { active = false; };
  }, [product.id]);
  const galleryImages = Array.isArray(product.images) && product.images.length ? product.images : (product.image_url ? [product.image_url] : []);
  const [activeImg, setActiveImg] = useState(0);
  const [galleryHover, setGalleryHover] = useState(false);
  useEffect(() => { setActiveImg(0); }, [product.id]);
  // Auto-scroll through the product images every 3s. Pauses while the
  // user's mouse is over the gallery so it doesn't fight with manual clicks.
  useEffect(() => {
    if (galleryImages.length <= 1 || galleryHover) return;
    const id = setInterval(() => {
      setActiveImg((i) => (i + 1) % galleryImages.length);
    }, 3000);
    return () => clearInterval(id);
  }, [galleryImages.length, galleryHover]);
  const category = product.category || "Product";
  const description = product.description || `${product.name} is one of our best-selling ${category.toLowerCase()} items — carefully sourced, quality-checked, and shipped from our regional warehouse. It's fulfilled across every emirate with cash-on-delivery, so customers can pay when the order arrives at their door.`;
  const highlights = [
    "Ships fast — dispatched within 24 hours from our UAE warehouse",
    "Cash on Delivery available in every emirate",
    "Quality-checked before packing, easy 7-day returns",
  ];
  const deliveryDetails = [
    { icon: Truck, label: "Shipping Charges", value: `AED ${DELIVERY_CHARGE}` },
    { icon: Clock, label: "Delivery Time", value: "1 – 3 days" },
    { icon: CreditCard, label: "Payment Mode", value: "Cash on delivery available" },
    { icon: RotateCcw, label: "Return Window", value: "Free within 7 days" },
  ];
  const trustBadges = [
    { icon: ShieldCheck, label: "Quality Verified" },
    { icon: Zap, label: "Fast Dispatch" },
    { icon: RotateCcw, label: "Easy 7-Day Returns" },
    { icon: CreditCard, label: "Cash on Delivery" },
  ];
  const specs = specsForProduct(product);
  // Reviews are real only — no more auto-generated sample reviews. Until a
  // product has an actual review (added by Admin), the tab just shows "no
  // reviews yet" instead of made-up names/ratings.
  const reviewList = Array.isArray(dbReviews)
    ? dbReviews.map((r) => ({ name: r.name, body: r.body, rating: r.rating, daysAgo: daysAgoFromDate(r.createdAt) }))
    : [];
  const count = reviewList.length;
  const avg = count > 0 ? Math.round((reviewList.reduce((s, r) => s + r.rating, 0) / count) * 10) / 10 : 0;
  const inStock = (product.stock ?? 0) > 0;
  const related = (catalog || []).filter((p) => p.id !== product.id && p.category === product.category).slice(0, 4);
  const relatedFallback = related.length > 0 ? related : (catalog || []).filter((p) => p.id !== product.id).slice(0, 4);

  const tabs = [
    { key: "description", label: "Description" },
    { key: "specs", label: "Specifications" },
    { key: "reviews", label: `Reviews (${count})` },
  ];

  return (
    <div style={{ animation: "dashTabIn 0.3s ease-out both", position: "relative" }}>
      {/* Soft color wash behind the whole page so it doesn't sit flat on white */}
      <div className="pointer-events-none absolute -top-10 -left-16 w-[380px] h-[380px] rounded-full opacity-[0.08] blur-3xl" style={{ background: "#00C896" }} />
      <div className="pointer-events-none absolute top-24 -right-20 w-[340px] h-[340px] rounded-full opacity-[0.07] blur-3xl" style={{ background: "#F8B400" }} />

      {/* Breadcrumb */}
      <div className="relative flex items-center gap-1.5 text-xs text-gray-400 mb-4">
        <button onClick={onBack} className="hover:text-gray-700 font-medium">Products</button>
        <ChevronRight className="w-3.5 h-3.5" />
        <span className="font-semibold" style={{ color: "#0B1F3A" }}>{formatTitle(product.name)}</span>
      </div>

      <button onClick={onBack} className="relative text-sm font-semibold text-gray-500 hover:text-gray-800 flex items-center gap-1">
        <ChevronDown className="w-4 h-4 rotate-90" /> Back to products
      </button>

      <div className="relative mt-5 grid lg:grid-cols-10 gap-6">
        {/* Image column with badge + mini gallery */}
        <div className="lg:col-span-4">
          <div
            className="relative rounded-3xl p-4"
            style={{ background: "linear-gradient(145deg,#0B1F3A 0%,#0F2E52 45%,#0B7A5E 130%)" }}
          >
            <div
              className="pointer-events-none absolute inset-0 rounded-3xl opacity-[0.08]"
              style={{ backgroundImage: "radial-gradient(circle, #ffffff 1px, transparent 1px)", backgroundSize: "16px 16px" }}
            />
            <div className="pointer-events-none absolute -top-10 -right-10 w-40 h-40 rounded-full opacity-30 blur-3xl" style={{ background: "#00C896" }} />
            <div className="pointer-events-none absolute -bottom-10 -left-10 w-40 h-40 rounded-full opacity-25 blur-3xl" style={{ background: "#F8B400" }} />
            <div
              className="relative rounded-2xl bg-white flex items-center justify-center overflow-hidden"
              style={{ minHeight: 360, boxShadow: "0 20px 45px rgba(0,0,0,0.25)" }}
              onMouseEnter={() => setGalleryHover(true)}
              onMouseLeave={() => setGalleryHover(false)}
            >
              <span className="absolute top-4 left-4 text-xs font-bold px-3 py-1.5 rounded-full text-white flex items-center gap-1" style={{ background: "linear-gradient(135deg,#F8B400,#e0a300)", boxShadow: "0 6px 16px rgba(248,180,0,0.4)" }}>
                <Sparkles className="w-3 h-3" style={{ animation: "sparkleTwinkle 1.8s ease-in-out infinite" }} />
                Best Seller
              </span>
              <button
                onClick={toggleLiked}
                aria-label={liked ? "Remove from wishlist" : "Save to wishlist"}
                className="absolute top-4 right-4 w-9 h-9 rounded-full flex items-center justify-center transition-transform duration-200 hover:scale-110 active:scale-90 z-10"
                style={{ background: "rgba(255,255,255,0.92)", boxShadow: "0 6px 16px rgba(11,31,58,0.18)", animation: justLiked ? "heartPop 0.5s ease-out" : "none" }}
              >
                <svg viewBox="0 0 24 24" className="w-4.5 h-4.5" fill={liked ? "#EF4444" : "none"} stroke={liked ? "#EF4444" : "#0B1F3A"} strokeWidth="2">
                  <path d="M12 21s-6.7-4.35-9.3-8.28C1 10.1 1.6 6.6 4.6 5.1c2.4-1.2 4.9-.3 6.4 1.9.6.9.9 1.4 1 1.6.1-.2.4-.7 1-1.6 1.5-2.2 4-3.1 6.4-1.9 3 1.5 3.6 5 1.9 7.62C18.7 16.65 12 21 12 21z"/>
                </svg>
              </button>
              {galleryImages.length > 0 ? (
                <img
                  key={activeImg}
                  src={galleryImages[activeImg] || galleryImages[0]}
                  alt={product.name}
                  className="w-full h-full object-cover transition-transform duration-700 ease-out hover:scale-[1.04]"
                  style={{ minHeight: 360, animation: "productImgIn 0.45s ease-out both" }}
                />
              ) : (
                <span style={{ fontSize: 150 }}>{product.emoji}</span>
              )}
            </div>
          </div>
          {galleryImages.length > 0 && (
            <div className="mt-3 grid grid-cols-4 gap-3">
              {galleryImages.map((url, i) => (
                <button
                  key={i}
                  onClick={() => setActiveImg(i)}
                  className="rounded-xl bg-white flex items-center justify-center py-4 overflow-hidden transition-all duration-200"
                  style={{ border: i === activeImg ? "2px solid #00C896" : "1px solid #E5E7EB", opacity: i === activeImg ? 1 : 0.55, boxShadow: i === activeImg ? "0 6px 16px rgba(0,200,150,0.25)" : "none" }}
                >
                  <img src={url} alt={`${product.name} ${i + 1}`} className="w-full h-10 object-cover" />
                </button>
              ))}
            </div>
          )}

          <div
            className="mt-4 rounded-2xl p-5 relative overflow-hidden"
            style={{ background: "linear-gradient(160deg, rgba(0,200,150,0.07), rgba(248,180,0,0.05))", border: "1px solid rgba(0,200,150,0.25)", boxShadow: "0 10px 30px rgba(11,31,58,0.06)" }}
          >
            <div className="flex items-center gap-3">
              <label className="text-xs font-semibold text-gray-500">Quantity</label>
              <div className="flex items-center rounded-full bg-white" style={{ border: "1px solid #E5E7EB" }}>
                <button onClick={() => setQty((q) => Math.max(1, q - 1))} className="w-9 h-9 text-sm font-bold text-gray-600">−</button>
                <span className="w-8 text-center text-sm font-semibold" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{qty}</span>
                <button onClick={() => setQty((q) => Math.min((product.stock ?? 0) || 1, q + 1))} className="w-9 h-9 text-sm font-bold text-gray-600">+</button>
              </div>
            </div>
            <div className="mt-2 text-sm text-gray-500">
              Total: <b style={{ color: "#0B1F3A", fontFamily: "'Space Grotesk', sans-serif" }}>AED {product.sell * qty + DELIVERY_CHARGE}</b>
              <span className="ml-1 text-xs text-gray-400">(incl. AED {DELIVERY_CHARGE} delivery)</span>
            </div>

            <div className="mt-5">
              <button
                disabled={!inStock}
                onClick={() => onBuyNow(qty)}
                className="w-full text-lg font-extrabold py-5 rounded-2xl text-white transition-transform duration-200 hover:scale-[1.015] active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-2 relative overflow-hidden"
                style={{ background: inStock ? "linear-gradient(135deg,#00C896,#00a67e)" : "#D1D5DB", boxShadow: inStock ? "0 14px 34px rgba(0,200,150,0.45)" : "none", animation: inStock ? "livePulse 2.6s ease-out infinite" : "none" }}
              >
                {inStock && (
                  <span
                    className="pointer-events-none absolute inset-y-0 w-1/3"
                    style={{ background: "linear-gradient(115deg, transparent, rgba(255,255,255,0.35), transparent)", animation: "goldShimmer 3.2s ease-in-out infinite" }}
                  />
                )}
                <Zap className="w-5 h-5" />
                {inStock ? "Buy Now" : "Out of Stock"}
              </button>
              <button
                disabled={!inStock}
                onClick={() => onAddToCart(qty)}
                className="mt-2.5 w-full text-sm font-semibold py-3 rounded-xl bg-white transition-transform duration-200 hover:scale-[1.01] active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100"
                style={{ border: "1px solid #0B1F3A", color: "#0B1F3A" }}
              >
                🛒 Add to Cart
              </button>
            </div>
          </div>
        </div>

        <div className="lg:col-span-3">
          <div className="flex items-center justify-between">
            <div className="text-xs font-bold uppercase tracking-widest" style={{ color: "#00a67e" }}>{category}</div>
          </div>
          <h1 className="mt-2 text-2xl md:text-3xl font-extrabold leading-tight tracking-tight" style={{ color: "#0B1F3A", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{formatTitle(product.name)}</h1>

          <div className="mt-2 flex items-center gap-2">
            {count > 0 ? (
              <>
                <StarRow rating={avg} />
                <span className="text-xs font-semibold text-gray-600">{avg.toFixed(1)}</span>
                <span className="text-xs text-gray-400">({count} reviews)</span>
              </>
            ) : (
              <span className="text-xs text-gray-400">No reviews yet</span>
            )}
          </div>

          <div className="mt-3 flex items-baseline gap-2 flex-wrap">
            <span className="text-3xl font-extrabold" style={{ color: "#00C896", fontFamily: "'Space Grotesk', sans-serif" }}>AED {product.sell}</span>
            <span className="text-sm text-gray-300 line-through" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>AED {Math.round(product.sell * 1.35)}</span>
            <span className="text-xs font-bold px-2 py-1 rounded-full text-white" style={{ background: "linear-gradient(135deg,#F8B400,#e0a300)", animation: "goldPulseRing 2.4s ease-out infinite" }}>Save 26%</span>
            <span
              className="text-xs font-semibold px-2.5 py-1 rounded-full"
              style={inStock ? { background: "rgba(0,200,150,0.12)", color: "#00a67e" } : { background: "rgba(239,68,68,0.1)", color: "#EF4444" }}
            >
              {inStock ? "In Stock" : "Out of Stock"}
            </span>
          </div>

          <div className="mt-4">
            <div className="text-[11px] font-bold uppercase tracking-wide mb-1.5" style={{ color: "#9CA3AF" }}>About this product</div>
            <p
              className="text-sm text-gray-600 leading-7"
              style={!descExpanded ? { display: "-webkit-box", WebkitLineClamp: 4, WebkitBoxOrient: "vertical", overflow: "hidden" } : {}}
            >
              {description}
            </p>
            {description.length > 220 && (
              <button
                onClick={() => setDescExpanded((v) => !v)}
                className="mt-1.5 text-xs font-bold"
                style={{ color: "#00a67e" }}
              >
                {descExpanded ? "Show less" : "Read more"}
              </button>
            )}
          </div>

          <ul className="mt-4 space-y-2">
            {highlights.map((h, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-gray-600">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: "#00C896" }} />
                {h}
              </li>
            ))}
          </ul>

          {/* A little warmth — reassures without being salesy */}
          <div className="mt-3 flex items-center gap-2 text-xs font-medium" style={{ color: "#B8890C" }}>
            <span style={{ display: "inline-block", animation: "sparkleTwinkle 2.2s ease-in-out infinite" }}>💛</span>
            Hand-checked and packed with care before it leaves our warehouse
          </div>

          {/* Trust badges */}
          <div className="mt-5 grid grid-cols-2 gap-2">
            {trustBadges.map((b, i) => {
              const badgeColor = ["#00C896", "#F8B400", "#3B82F6", "#8B5CF6"][i % 4];
              return (
                <div key={i} className="flex items-center gap-2 rounded-xl px-3 py-2 transition-transform duration-200 hover:-translate-y-0.5" style={{ background: `${badgeColor}0D`, border: `1px solid ${badgeColor}30` }}>
                  <b.icon className="w-4 h-4 flex-shrink-0" style={{ color: badgeColor }} />
                  <span className="text-xs font-medium" style={{ color: "#0B1F3A" }}>{b.label}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Delivery Details sidebar */}
        <div className="lg:col-span-3 rounded-2xl bg-white h-fit overflow-hidden" style={{ border: "1px solid #E5E7EB" }}>
          <div className="h-1.5" style={{ background: "linear-gradient(90deg,#F8B400,#00C896)" }} />
          <div className="p-5">
            <div className="text-center font-extrabold text-sm mb-4" style={{ color: "#0B1F3A", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Delivery Details</div>
            <div className="space-y-0">
              {deliveryDetails.map((d, i) => (
                <div key={d.label} className="flex items-center gap-3 py-3" style={i > 0 ? { borderTop: "1px solid #F3F4F6" } : {}}>
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "rgba(0,200,150,0.12)" }}>
                    <d.icon className="w-4.5 h-4.5" style={{ color: "#00a67e" }} />
                  </div>
                  <div>
                    <div className="text-sm font-bold" style={{ color: "#111827" }}>{d.label}</div>
                    <div className="text-xs text-gray-500">{d.value}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Gulf-wide coverage strip */}
            <div className="mt-4 pt-4" style={{ borderTop: "1px solid #F3F4F6" }}>
              <div className="flex items-center gap-2 mb-2.5">
                <Globe2 className="w-3.5 h-3.5" style={{ color: "#00a67e" }} />
                <span className="text-[11px] font-bold uppercase tracking-wide text-gray-400">We deliver across the Gulf</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {["UAE", "KSA", "Qatar", "Oman", "Bahrain", "Kuwait"].map((country) => {
                  const isLive = country === "UAE";
                  return (
                    <span
                      key={country}
                      title={isLive ? "Available now" : "Coming soon"}
                      className="text-[11px] font-semibold px-2.5 py-1 rounded-full flex items-center gap-1"
                      style={isLive ? { background: "rgba(0,200,150,0.12)", color: "#00a67e", border: "1px solid rgba(0,200,150,0.3)" } : { background: "#F3F4F6", color: "#9CA3AF" }}
                    >
                      {isLive && <span className="w-1.5 h-1.5 rounded-full" style={{ background: "#00C896" }} />}
                      {country}
                    </span>
                  );
                })}
              </div>
              <div className="mt-1.5 text-[10px] text-gray-400">UAE is live now · other countries coming soon</div>
            </div>

            {/* WhatsApp quick-help card */}
            <div className="mt-4 rounded-xl p-3.5 relative overflow-hidden" style={{ background: "rgba(37,211,102,0.06)", border: "1px solid rgba(37,211,102,0.25)" }}>
              <div className="flex items-center gap-2.5">
                <div className="relative w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "rgba(37,211,102,0.15)" }}>
                  <svg viewBox="0 0 24 24" className="w-4.5 h-4.5" fill="#25D366"><path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.7.44 3.35 1.29 4.81L2 22l5.4-1.41a9.9 9.9 0 0 0 4.64 1.18h.01c5.46 0 9.9-4.45 9.9-9.91C21.95 6.45 17.5 2 12.04 2zm0 18.13h-.01a8.2 8.2 0 0 1-4.19-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.18 8.18 0 0 1-1.26-4.36c0-4.52 3.68-8.2 8.21-8.2 2.19 0 4.25.86 5.8 2.4a8.14 8.14 0 0 1 2.4 5.8c0 4.52-3.68 8.2-8.16 8.2zm4.5-6.13c-.25-.12-1.47-.72-1.69-.81-.23-.08-.4-.12-.56.13-.17.25-.64.81-.79.97-.14.17-.29.19-.54.06-.25-.12-1.04-.38-1.98-1.22-.73-.65-1.23-1.46-1.37-1.71-.14-.25-.02-.38.11-.51.11-.11.25-.29.37-.43.12-.14.16-.25.25-.41.08-.17.04-.31-.02-.44-.06-.12-.56-1.35-.77-1.85-.2-.48-.41-.42-.56-.43h-.48c-.17 0-.44.06-.67.31-.23.25-.87.85-.87 2.08 0 1.22.89 2.4 1.02 2.57.12.17 1.75 2.67 4.24 3.74.59.26 1.05.41 1.41.52.59.19 1.13.16 1.55.1.47-.07 1.47-.6 1.68-1.18.21-.58.21-1.08.14-1.18-.06-.11-.23-.17-.48-.29z"/></svg>
                  <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full" style={{ background: "#25D366", border: "2px solid #fff", animation: "livePulse 2s ease-out infinite" }} />
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-bold truncate" style={{ color: "#111827" }}>Need help deciding?</div>
                  <div className="text-xs text-gray-500">Usually replies within a few minutes</div>
                </div>
              </div>
              <a
                href="https://wa.me/971568328274"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 flex items-center justify-center gap-2 w-full text-xs font-semibold py-2.5 rounded-full text-white transition-transform duration-200 hover:scale-[1.02] active:scale-95"
                style={{ background: "#25D366" }}
              >
                Chat on WhatsApp
              </a>
            </div>

            {/* Trust seal */}
            <div className="mt-4 flex items-center justify-center gap-2 text-gray-400">
              <ShieldCheck className="w-3.5 h-3.5" style={{ color: "#00a67e" }} />
              <span className="text-[11px] font-medium">Verified seller · Secure Cash on Delivery</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabbed content: Description / Specifications / Reviews */}
      <div className="mt-8 rounded-2xl bg-white overflow-hidden" style={{ border: "1px solid #E5E7EB" }}>
        <div className="flex items-center gap-1 px-2" style={{ borderBottom: "1px solid #E5E7EB" }}>
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className="text-sm font-semibold px-4 py-3.5 relative"
              style={{ color: tab === t.key ? "#0B1F3A" : "#9CA3AF" }}
            >
              {t.label}
              {tab === t.key && (
                <span className="absolute left-3 right-3 bottom-0 h-0.5 rounded-full" style={{ background: "#00C896" }} />
              )}
            </button>
          ))}
        </div>

        <div className="p-6">
          {tab === "description" && (
            <div className="max-w-2xl">
              <p className="text-sm text-gray-600 leading-relaxed">{description}</p>
              <p className="mt-3 text-sm text-gray-600 leading-relaxed">
                Every order is quality-checked before it leaves our warehouse and shipped with careful packaging so it
                arrives in the same condition it left in. Cash on Delivery means your customer only pays once the
                order is in their hands — no upfront risk, no awkward conversations.
              </p>
              <ul className="mt-4 space-y-2">
                {highlights.map((h, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-gray-600">
                    <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: "#00C896" }} />
                    {h}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {tab === "specs" && (
            <div className="max-w-xl divide-y" style={{ borderColor: "#F3F4F6" }}>
              {specs.map(([label, value], i) => (
                <div key={i} className="flex items-center justify-between py-3" style={i > 0 ? { borderTop: "1px solid #F3F4F6" } : {}}>
                  <span className="text-xs font-semibold text-gray-500">{label}</span>
                  <span className="text-sm font-medium" style={{ color: "#111827" }}>{value}</span>
                </div>
              ))}
            </div>
          )}

          {tab === "reviews" && (
            <div className="max-w-2xl">
              {count === 0 ? (
                <div className="text-sm text-gray-400 py-6">No reviews yet — be the first to order and review this product.</div>
              ) : (
                <>
                  <div className="flex items-center gap-4 pb-5" style={{ borderBottom: "1px solid #F3F4F6" }}>
                    <div className="text-4xl font-extrabold" style={{ color: "#0B1F3A", fontFamily: "'Space Grotesk', sans-serif" }}>{avg.toFixed(1)}</div>
                    <div>
                      <StarRow rating={avg} size="w-4 h-4" />
                      <div className="text-xs text-gray-400 mt-1">Based on {count} verified orders</div>
                    </div>
                  </div>
                  <div className="mt-4 space-y-4">
                    {reviewList.map((r, i) => (
                      <div key={i} className="flex gap-3">
                        <div
                          className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                          style={{ background: `linear-gradient(135deg,#0B1F3A,#00a67e)` }}
                        >
                          {r.name.charAt(0)}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold" style={{ color: "#111827" }}>{r.name}</span>
                            <span className="text-xs text-gray-300">·</span>
                            <span className="text-xs text-gray-400">{r.daysAgo}d ago</span>
                          </div>
                          <StarRow rating={r.rating} />
                          <p className="text-xs text-gray-600 mt-1 leading-relaxed">{r.body}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Related products */}
      {relatedFallback.length > 0 && (
        <div className="mt-8">
          <h2 className="text-lg font-extrabold" style={{ color: "#0B1F3A", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>You may also like</h2>
          <div className="mt-4 grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {relatedFallback.map((p) => (
              <button
                key={p.id}
                onClick={() => onOpenProduct && onOpenProduct(p)}
                className="text-left rounded-2xl bg-white p-4 transition-transform duration-200 hover:scale-[1.02]"
                style={{ border: "1px solid #E5E7EB" }}
              >
                <div className="rounded-xl flex items-center justify-center py-5 overflow-hidden" style={{ background: "#F8FAFC", height: p.image_url ? 80 : "auto" }}>
                  <ProductThumb product={p} size={40} />
                </div>
                <div className="mt-3 text-sm font-semibold truncate" style={{ color: "#111827" }}>{p.name}</div>
                <div className="mt-1 text-sm font-bold" style={{ color: "#00C896", fontFamily: "'Space Grotesk', sans-serif" }}>AED {p.sell}</div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function CartView({ items, onUpdateQty, onRemove, onBack, onCheckout, total }) {
  return (
    <div style={{ animation: "dashTabIn 0.3s ease-out both" }}>
      <button onClick={onBack} className="text-sm font-semibold text-gray-500 hover:text-gray-800 flex items-center gap-1">
        <ChevronDown className="w-4 h-4 rotate-90" /> Continue shopping
      </button>
      <h1 className="mt-4 text-2xl font-extrabold" style={{ color: "#0B1F3A", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Your cart</h1>
      {items.length === 0 ? (
        <div className="mt-8 text-sm text-gray-400 text-center py-16 rounded-2xl bg-white" style={{ border: "1px solid #E5E7EB" }}>Your cart is empty.</div>
      ) : (
        <>
          <div className="mt-6 rounded-2xl bg-white overflow-hidden" style={{ border: "1px solid #E5E7EB" }}>
            {items.map((it, i) => (
              <div key={it.id} className="flex items-center gap-4 px-5 py-4" style={{ borderBottom: i < items.length - 1 ? "1px solid #F3F4F6" : "none" }}>
                <div className="w-12 h-12 rounded-lg overflow-hidden flex items-center justify-center flex-shrink-0" style={{ background: "#F8FAFC" }}>
                  <ProductThumb product={it} size={26} />
                </div>
                <div className="flex-1">
                  <div className="text-sm font-semibold" style={{ color: "#111827" }}>{it.name}</div>
                  <div className="text-xs text-gray-400 mt-0.5">AED {it.sell} each</div>
                </div>
                <div className="flex items-center rounded-full" style={{ border: "1px solid #E5E7EB" }}>
                  <button onClick={() => onUpdateQty(it.id, it.qty - 1)} className="w-8 h-8 text-sm font-bold text-gray-600">−</button>
                  <span className="w-7 text-center text-sm font-semibold">{it.qty}</span>
                  <button onClick={() => onUpdateQty(it.id, it.qty + 1)} className="w-8 h-8 text-sm font-bold text-gray-600">+</button>
                </div>
                <div className="w-20 text-right text-sm font-semibold" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>AED {it.sell * it.qty}</div>
                <button onClick={() => onRemove(it.id)} className="text-gray-300 hover:text-red-500"><X className="w-4 h-4" /></button>
              </div>
            ))}
          </div>
          <div className="mt-6 flex items-center justify-between rounded-2xl p-5 bg-white" style={{ border: "1px solid #E5E7EB" }}>
            <div className="text-sm text-gray-500">Total</div>
            <div className="text-xl font-bold" style={{ color: "#00C896", fontFamily: "'Space Grotesk', sans-serif" }}>AED {total}</div>
          </div>
          <button onClick={onCheckout} className="mt-5 w-full sm:w-auto text-sm font-semibold px-8 py-3 rounded-full text-white transition-transform duration-200 hover:scale-[1.02] active:scale-95" style={{ background: "linear-gradient(135deg,#00C896,#00a67e)" }}>
            Proceed to checkout
          </button>
        </>
      )}
    </div>
  );
}

// Standalone COD-amount box for one checkout line item. Keeps its OWN typed
// text in local state (instead of a value derived straight from the order
// total), so selecting-all + Backspace/Cut genuinely empties the box and the
// seller can type a fresh number — nothing snaps back mid-typing. The order
// total only gets clamped to the actual price once the seller leaves the
// field (onBlur); typing itself is never blocked or auto-corrected.
function CodAmountRow({ it, baseTotal, initialCodAmount, onUpdateItemPrice }) {
  const [raw, setRaw] = useState(String(initialCodAmount));
  const parsed = raw === "" ? NaN : parseFloat(raw);
  const itemProfit = isNaN(parsed) ? null : parsed - baseTotal;

  const commit = () => {
    let entered = parseFloat(raw);
    if (isNaN(entered) || entered < 0) entered = baseTotal;
    setRaw(String(entered));
    onUpdateItemPrice(it.id, (entered - DELIVERY_CHARGE) / it.qty);
  };

  return (
    <>
      <div className="mt-3 flex items-center justify-between gap-2">
        <label className="text-xs text-gray-500 whitespace-nowrap">COD Amount (what customer pays)</label>
        <input
          type="number" inputMode="decimal" value={raw}
          onChange={(e) => setRaw(e.target.value)}
          onFocus={(e) => e.target.select()}
          onBlur={commit}
          className="w-24 rounded-lg px-2 py-1.5 text-sm text-right font-semibold"
          style={{ border: "1px solid #E5E7EB" }}
        />
      </div>
      <div className="mt-1.5 flex items-center justify-between text-xs font-semibold" style={{ color: "#00a67e" }}>
        <span>Your profit is</span>
        <span>AED {itemProfit === null ? "—" : itemProfit.toFixed(2)}</span>
      </div>
    </>
  );
}

function CheckoutForm({ items, onBack, onSubmit, onUpdateItemPrice, notify }) {
  const [form, setForm] = useState({ name: "", phone: "", emirate: EMIRATES[0], address: "", notes: "" });
  const [busy, setBusy] = useState(false);
  const itemsTotal = items.reduce((s, it) => s + it.sell * it.qty, 0);
  const deliveryTotal = items.length * DELIVERY_CHARGE;
  const total = itemsTotal + deliveryTotal;
  const baseTotal = items.reduce((s, it) => s + it.listSell * it.qty + DELIVERY_CHARGE, 0);
  const profitTotal = items.reduce((s, it) => s + (it.sell * it.qty + DELIVERY_CHARGE) - (it.listSell * it.qty + DELIVERY_CHARGE), 0);

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.phone || !form.address) return;
    if (total <= baseTotal) {
      notify?.("COD amount should be greater than the order price.");
      return;
    }
    setBusy(true);
    await onSubmit(form);
    setBusy(false);
  };

  const inputStyle = { border: "1px solid #E5E7EB" };
  return (
    <div style={{ animation: "dashTabIn 0.3s ease-out both" }}>
      <button onClick={onBack} className="text-sm font-semibold text-gray-500 hover:text-gray-800 flex items-center gap-1">
        <ChevronDown className="w-4 h-4 rotate-90" /> Back
      </button>
      <h1 className="mt-4 text-2xl font-extrabold" style={{ color: "#0B1F3A", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Checkout</h1>
      <p className="text-sm text-gray-500 mt-1">Enter the customer's delivery details to place this order.</p>

      <div className="mt-6 grid md:grid-cols-5 gap-6">
        <form onSubmit={submit} className="md:col-span-3 rounded-2xl p-6 bg-white space-y-3" style={{ border: "1px solid #E5E7EB" }}>
          <div>
            <label className="text-xs text-gray-500">Customer name <span className="text-red-500">*</span></label>
            <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Full name" className="mt-1 w-full rounded-lg px-3 py-2 text-sm" style={inputStyle} />
          </div>
          <div>
            <label className="text-xs text-gray-500">Phone <span className="text-red-500">*</span></label>
            <input required type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="05XXXXXXXX" className="mt-1 w-full rounded-lg px-3 py-2 text-sm" style={inputStyle} />
          </div>
          <div>
            <label className="text-xs text-gray-500">Emirate <span className="text-red-500">*</span></label>
            <select value={form.emirate} onChange={(e) => setForm({ ...form, emirate: e.target.value })} className="mt-1 w-full rounded-lg px-3 py-2 text-sm" style={inputStyle}>
              {EMIRATES.map((em) => <option key={em} value={em}>{em}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-500">Delivery address <span className="text-red-500">*</span></label>
            <textarea required value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Building, street, area / landmark" rows={3} className="mt-1 w-full rounded-lg px-3 py-2 text-sm" style={inputStyle} />
          </div>
          <div>
            <label className="text-xs text-gray-500">Any instructions for this order (optional)</label>
            <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="e.g. call before delivery, gift wrap, deliver after 6pm…" rows={2} className="mt-1 w-full rounded-lg px-3 py-2 text-sm" style={inputStyle} />
          </div>
          <button disabled={busy} className="w-full mt-2 text-sm font-semibold py-3 rounded-full text-white transition-transform duration-200 hover:scale-[1.02] active:scale-95 disabled:opacity-60" style={{ background: "linear-gradient(135deg,#00C896,#00a67e)" }}>
            {busy ? "Placing order…" : `Place order — AED ${total}`}
          </button>
        </form>

        <div className="md:col-span-2 rounded-2xl p-6 bg-white h-fit" style={{ border: "1px solid #E5E7EB" }}>
          <div className="font-bold text-sm" style={{ color: "#111827" }}>Order summary</div>
          <div className="mt-4 space-y-5">
            {items.map((it) => {
              const subtotal = it.listSell * it.qty;
              const baseTotal = subtotal + DELIVERY_CHARGE;
              const codAmount = it.sell * it.qty + DELIVERY_CHARGE;
              return (
                <div key={it.id} className="text-sm">
                  <div className="flex items-center justify-between font-semibold" style={{ color: "#111827" }}>
                    <span>{it.name} <span className="text-gray-400 font-normal">×{it.qty}</span></span>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-gray-500">
                    <span>Subtotal</span>
                    <span style={{ fontFamily: "'Space Grotesk', sans-serif" }}>AED {subtotal}</span>
                  </div>
                  <div className="mt-1 flex items-center justify-between text-gray-500">
                    <span>Shipping</span>
                    <span style={{ fontFamily: "'Space Grotesk', sans-serif" }}>AED {DELIVERY_CHARGE}</span>
                  </div>
                  <div className="mt-1 flex items-center justify-between font-semibold" style={{ color: "#0B1F3A" }}>
                    <span>Total (actual price)</span>
                    <span style={{ fontFamily: "'Space Grotesk', sans-serif" }}>AED {baseTotal}</span>
                  </div>
                  <CodAmountRow
                    key={it.id}
                    it={it}
                    baseTotal={baseTotal}
                    initialCodAmount={codAmount}
                    onUpdateItemPrice={onUpdateItemPrice}
                  />
                </div>
              );
            })}
          </div>
          <div className="mt-4 pt-4 space-y-2 text-sm" style={{ borderTop: "1px solid #F3F4F6" }}>
            <div className="flex items-center justify-between font-bold" style={{ color: "#0B1F3A" }}>
              <span>Total (cash to collect)</span>
              <span style={{ color: "#00C896", fontFamily: "'Space Grotesk', sans-serif" }}>AED {total}</span>
            </div>
            <div className="flex items-center justify-between text-xs" style={{ color: "#00a67e" }}>
              <span>Your total profit</span>
              <span style={{ fontFamily: "'Space Grotesk', sans-serif" }}>AED {profitTotal}</span>
            </div>
          </div>
          <div className="mt-3 text-xs text-gray-400">Cash on delivery — payment collected on arrival.</div>
        </div>
      </div>
    </div>
  );
}

function CatalogTab({ catalog, onAdd, onPlaceOrder, notify, onViewOrders, sellerEmail, isAdmin = false, isPremiumSeller = false, onCatalogChanged }) {
  const [showGoldModal, setShowGoldModal] = useState(false);
  const [view, setView] = useState("list"); // list | detail | cart | checkout | success
  const [activeProduct, setActiveProduct] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [cart, setCart] = useState(() => readLocal(`ef_cart_${sellerEmail}`, []));
  const [checkoutItems, setCheckoutItems] = useState([]);
  const [checkoutFrom, setCheckoutFrom] = useState("detail");
  const [placedOrders, setPlacedOrders] = useState([]);

  // Admin-only inline product editing
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState(null);
  const [editImageUploading, setEditImageUploading] = useState(false);

  // Per-card quantity counters (productId → qty)
  const [cardQtys, setCardQtys] = useState({});
  const getQty = (id) => cardQtys[id] || 1;
  const setQty = (id, q) => setCardQtys((prev) => ({ ...prev, [id]: Math.max(1, q) }));

  const startEdit = (p) => {
    setEditingId(p.id);
    const images = Array.isArray(p.images) && p.images.length ? p.images : (p.image_url ? [p.image_url] : []);
    setEditForm({ name: p.name || "", category: p.category || "", cost: p.cost, sell: p.sell, emoji: p.emoji || "📦", description: p.description || "", images, stock: p.stock ?? 0 });
  };
  const cancelEdit = () => { setEditingId(null); setEditForm(null); };
  const uploadEditImages = async (e) => {
    const files = Array.from(e.target.files || []);
    e.target.value = "";
    if (!files.length) return;
    const room = 4 - (editForm.images || []).length;
    if (room <= 0) { notify && notify("You can add up to 4 pictures per product."); return; }
    setEditImageUploading(true);
    const uploaded = [];
    for (const file of files.slice(0, room)) {
      const { url, error } = await uploadProductImage(file);
      if (error) { notify && notify(error); continue; }
      if (url) uploaded.push(url);
    }
    setEditImageUploading(false);
    if (uploaded.length) setEditForm((f) => ({ ...f, images: [...(f.images || []), ...uploaded] }));
  };
  const removeEditImage = (idx) => setEditForm((f) => ({ ...f, images: (f.images || []).filter((_, i) => i !== idx) }));
  // Drag-and-drop reordering of a product's pictures while editing — drag a
  // thumbnail onto another to move it to that position in the images array.
  const reorderEditImages = (fromIdx, toIdx) => setEditForm((f) => {
    const imgs = [...(f.images || [])];
    if (fromIdx === toIdx || fromIdx < 0 || toIdx < 0 || fromIdx >= imgs.length || toIdx >= imgs.length) return f;
    const [moved] = imgs.splice(fromIdx, 1);
    imgs.splice(toIdx, 0, moved);
    return { ...f, images: imgs };
  });
  const saveEdit = async (id) => {
    if (!editForm.name || editForm.sell === "") { notify && notify("Fill in name and sell price."); return; }
    const images = editForm.images || [];
    const { error } = await supabase.from("products").update({
      name: editForm.name, category: editForm.category || "General",
      cost: parseFloat(editForm.cost) || 0, sell: parseFloat(editForm.sell),
      emoji: editForm.emoji || "📦", description: editForm.description || null,
      images, image_url: images[0] || null,
      stock: Math.max(0, parseInt(editForm.stock, 10) || 0),
    }).eq("id", id);
    if (error) { console.error("Product save failed:", error); notify && notify(`Could not save: ${error.message || "unknown error"}`); return; }
    notify && notify("Product updated.");
    cancelEdit();
    onCatalogChanged && onCatalogChanged();
  };

  useEffect(() => { writeLocal(`ef_cart_${sellerEmail}`, cart); }, [cart, sellerEmail]);

  const addToCart = (product, qty) => {
    setCart((prev) => {
      const existing = prev.find((c) => c.id === product.id);
      if (existing) return prev.map((c) => (c.id === product.id ? { ...c, qty: c.qty + qty } : c));
      return [...prev, { id: product.id, name: product.name, sell: product.sell, listSell: product.sell, cost: product.cost, emoji: product.emoji, image_url: product.image_url, qty }];
    });
    notify && notify(`${qty > 1 ? qty + "x " : ""}Added to cart.`);
  };
  const updateCartQty = (id, qty) => setCart((prev) => prev.map((c) => (c.id === id ? { ...c, qty } : c)).filter((c) => c.qty > 0));
  const removeFromCart = (id) => setCart((prev) => prev.filter((c) => c.id !== id));
  const cartCount = cart.reduce((s, c) => s + c.qty, 0);
  const cartTotal = cart.reduce((s, c) => s + c.sell * c.qty, 0);

  const openProduct = (p) => { setActiveProduct(p); setView("detail"); };
  const buyNow = (product, qty) => {
    setCheckoutItems([{ id: product.id, name: product.name, sell: product.sell, listSell: product.sell, cost: product.cost, emoji: product.emoji, image_url: product.image_url, qty }]);
    setCheckoutFrom("detail");
    setView("checkout");
  };
  const goToCartCheckout = () => {
    if (cart.length === 0) { notify && notify("Your cart is empty."); return; }
    setCheckoutItems(cart);
    setCheckoutFrom("cart");
    setView("checkout");
  };
  const updateCheckoutItemPrice = (id, sell) => {
    setCheckoutItems((prev) => prev.map((it) => (it.id === id ? { ...it, sell: Math.max(0, sell) } : it)));
  };

  const placeOrder = async (customer) => {
    const created = [];
    for (const item of checkoutItems) {
      const result = await onPlaceOrder({
        productId: item.id, productName: item.name, qty: item.qty,
        sellPrice: item.sell, costPrice: item.cost, listPrice: item.listSell, deliveryCharge: DELIVERY_CHARGE,
        buyer: customer.name, city: customer.emirate,
        customerPhone: customer.phone, customerAddress: customer.address, notes: customer.notes,
      });
      if (result) created.push(result);
    }
    if (checkoutFrom === "cart") setCart([]);
    setCheckoutItems([]);
    setActiveProduct(null);
    setPlacedOrders(created);
    setView(created.length > 0 ? "success" : "list");
  };

  if (view === "success") {
    return (
      <div className="max-w-xl mx-auto text-center py-14" style={{ animation: "dashTabIn 0.3s ease-out both" }}>
        <div className="w-16 h-16 mx-auto rounded-full flex items-center justify-center" style={{ background: "rgba(0,200,150,0.12)" }}>
          <CheckCircle2 className="w-8 h-8" style={{ color: "#00C896" }} />
        </div>
        <h1 className="mt-5 text-2xl font-extrabold" style={{ color: "#0B1F3A", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Order placed!</h1>
        <p className="mt-2 text-sm text-gray-500">It's saved as Pending, and will also show up for the Admin to fulfill.</p>
        <div className="mt-6 rounded-2xl bg-white text-left divide-y" style={{ border: "1px solid #E5E7EB" }}>
          {placedOrders.map((o) => (
            <div key={o.id} className="px-5 py-3 flex items-center justify-between text-sm">
              <span className="text-gray-500" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{o.id}</span>
              <span className="font-semibold" style={{ color: "#111827" }}>{o.productName} <span className="text-gray-400 font-normal">×{o.qty}</span></span>
              <StatusPill status="pending" />
            </div>
          ))}
        </div>
        <div className="mt-7 flex flex-col sm:flex-row items-center justify-center gap-3">
          <button onClick={onViewOrders} className="text-sm font-semibold px-6 py-3 rounded-full text-white" style={{ background: "linear-gradient(135deg,#00C896,#00a67e)" }}>View in Orders</button>
          <button onClick={() => setView("list")} className="text-sm font-semibold px-6 py-3 rounded-full" style={{ border: "1px solid #E5E7EB", color: "#0B1F3A" }}>Continue shopping</button>
        </div>
      </div>
    );
  }

  if (view === "detail" && activeProduct) {
    return (
      <ProductLandingPage
        product={activeProduct}
        catalog={catalog}
        onOpenProduct={openProduct}
        onBack={() => setView("list")}
        onAddToCart={(qty) => addToCart(activeProduct, qty)}
        onBuyNow={(qty) => buyNow(activeProduct, qty)}
      />
    );
  }
  if (view === "cart") {
    return <CartView items={cart} onUpdateQty={updateCartQty} onRemove={removeFromCart} onBack={() => setView("list")} onCheckout={goToCartCheckout} total={cartTotal} />;
  }
  if (view === "checkout") {
    return <CheckoutForm items={checkoutItems} onBack={() => setView(checkoutFrom)} onSubmit={placeOrder} onUpdateItemPrice={updateCheckoutItemPrice} notify={notify} />;
  }

  const CATEGORY_COLORS = {
    Electronics: "#3B82F6",
    Home: "#F8B400",
    Accessories: "#8B5CF6",
    Beauty: "#EC4899",
  };
  const catColor = (cat) => CATEGORY_COLORS[cat] || "#00C896";

  return (
    <div>
      <div
        className="rounded-2xl p-6 text-white relative overflow-hidden flex items-start justify-between gap-4 flex-wrap"
        style={{ background: "linear-gradient(120deg,#0B1F3A 0%,#0F2E52 55%,#0B7A5E 130%)" }}
      >
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{ backgroundImage: "radial-gradient(circle, #ffffff 1px, transparent 1px)", backgroundSize: "18px 18px" }}
        />
        <div
          className="absolute -left-8 -bottom-12 w-52 h-52 rounded-full opacity-70 blur-3xl"
          style={{ background: "rgba(0,200,150,0.3)", animation: "blobMove 9s ease-in-out infinite" }}
        />
        <div
          className="absolute -top-14 right-16 w-40 h-40 rounded-full opacity-40 blur-3xl"
          style={{ background: "rgba(248,180,0,0.35)", animation: "blobMove 11s ease-in-out infinite reverse" }}
        />
        <div className="relative">
          <h1 className="text-2xl font-extrabold" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Products</h1>
          <p className="text-sm text-white/70 mt-1">Click a product to view it, or add it to cart / buy it now for a customer.</p>
        </div>
        <button onClick={() => setView("cart")} className="relative flex-shrink-0 flex items-center gap-2 text-sm font-semibold px-4 py-2.5 rounded-full transition-all duration-300 hover:scale-105 active:scale-95" style={{ background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)", color: "#fff", backdropFilter: "blur(6px)" }}>
          🛒 Cart
          {cartCount > 0 && (
            <span className="absolute -top-2 -right-2 w-5 h-5 rounded-full text-white text-[10px] font-bold flex items-center justify-center" style={{ background: "#00C896", animation: "livePulse 2s infinite" }}>{cartCount}</span>
          )}
        </button>
      </div>
      {/* Search bar */}
      <div className="mt-5 relative">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="🔍 Search products..."
          className="w-full rounded-2xl px-5 py-3 text-sm font-medium outline-none placeholder-gray-400"
          style={{ background: "#fff", border: "1px solid #E5E7EB", color: "#0B1F3A", boxShadow: "0 1px 2px rgba(0,0,0,0.04)" }}
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery("")}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 text-lg leading-none"
          >✕</button>
        )}
      </div>
      <div className="mt-6 grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {catalog.filter((p) => p.name.toLowerCase().includes(searchQuery.toLowerCase()) || (p.category || "").toLowerCase().includes(searchQuery.toLowerCase())).map((p, i) => {
          const color = catColor(p.category);
          const qty = getQty(p.id);
          if (isAdmin && editingId === p.id) {
            return (
              <div
                key={p.id}
                className="relative rounded-2xl p-5 bg-white overflow-hidden"
                style={{ border: "1px solid #E5E7EB", animation: `dashTabIn 0.35s ease-out ${i * 40}ms both` }}
              >
                <div className="absolute top-0 left-0 right-0 h-1" style={{ background: `linear-gradient(90deg, ${color}, transparent)` }} />
                <div className="space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    {(editForm.images || []).map((url, idx) => (
                      <div
                        key={idx}
                        draggable
                        onDragStart={(e) => { e.dataTransfer.effectAllowed = "move"; e.dataTransfer.setData("text/plain", String(idx)); }}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => { e.preventDefault(); reorderEditImages(Number(e.dataTransfer.getData("text/plain")), idx); }}
                        title="Drag to reorder"
                        className="relative w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 cursor-move"
                        style={{ border: "1px solid #E5E7EB" }}
                      >
                        <img src={url} alt="" className="w-full h-full object-cover" draggable={false} />
                        <button onClick={() => removeEditImage(idx)} title="Remove" className="absolute top-0 right-0 w-4 h-4 flex items-center justify-center text-white text-[10px]" style={{ background: "rgba(0,0,0,0.55)" }}>×</button>
                      </div>
                    ))}
                    {(editForm.images || []).length < 4 && (
                      <label className="text-xs font-semibold px-3 py-2 rounded-full cursor-pointer text-center" style={{ border: "1px solid #E5E7EB", color: "#0B1F3A", opacity: editImageUploading ? 0.6 : 1 }}>
                        {editImageUploading ? "Uploading…" : "Upload pictures"}
                        <input type="file" accept="image/*" multiple onChange={uploadEditImages} disabled={editImageUploading} className="hidden" />
                      </label>
                    )}
                  </div>
                  <p className="text-[11px] text-gray-400">{(editForm.images || []).length}/4 pictures</p>
                  <div className="flex items-center gap-2">
                    <input value={editForm.emoji} onChange={(e) => setEditForm({ ...editForm, emoji: e.target.value })} title="Fallback emoji" className="w-14 rounded-lg px-2 py-1.5 text-lg text-center" style={{ border: "1px solid #E5E7EB" }} />
                    <input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} placeholder="Product name" className="flex-1 rounded-lg px-2 py-1.5 text-sm font-semibold" style={{ border: "1px solid #E5E7EB" }} />
                  </div>
                  <input value={editForm.category} onChange={(e) => setEditForm({ ...editForm, category: e.target.value })} placeholder="Category" className="w-full rounded-lg px-2 py-1.5 text-xs" style={{ border: "1px solid #E5E7EB" }} />
                  {/* SELL PRICE ONLY — cost is admin-internal, not shown here */}
                  <input type="number" value={editForm.sell} onChange={(e) => setEditForm({ ...editForm, sell: e.target.value })} placeholder="Sell price (AED)" className="w-full rounded-lg px-2 py-1.5 text-xs" style={{ border: "1px solid #E5E7EB" }} />
                  <div>
                    <label className="text-[11px] text-gray-400">Stock quantity (only you see this number — sellers just see In Stock / Out of Stock)</label>
                    <input type="number" min="0" value={editForm.stock} onChange={(e) => setEditForm({ ...editForm, stock: e.target.value })} placeholder="Stock quantity" className="mt-1 w-full rounded-lg px-2 py-1.5 text-xs" style={{ border: "1px solid #E5E7EB" }} />
                  </div>
                  <textarea rows={3} value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} placeholder="Description" className="w-full rounded-lg px-2 py-1.5 text-xs" style={{ border: "1px solid #E5E7EB" }} />
                  <div className="flex gap-2 pt-1">
                    <button onClick={() => saveEdit(p.id)} className="flex-1 text-xs font-semibold py-2 rounded-full text-white" style={{ background: "#00C896" }}>Save</button>
                    <button onClick={cancelEdit} className="flex-1 text-xs font-semibold py-2 rounded-full" style={{ border: "1px solid #E5E7EB", color: "#6B7280" }}>Cancel</button>
                  </div>
                </div>
              </div>
            );
          }
          const inStock = (p.stock ?? 0) > 0;
          const isLocked = p.isPremium && !isPremiumSeller && !isAdmin;
          return (
            <div
              key={p.id}
              onClick={() => isLocked ? setShowGoldModal(true) : openProduct(p)}
              className="group relative rounded-2xl bg-white transition-all duration-300 ease-out hover:-translate-y-1.5 cursor-pointer overflow-hidden flex flex-col"
              style={{
                border: isLocked ? "1px solid #F8B400" : "1px solid #E5E7EB",
                animation: `dashTabIn 0.35s ease-out ${i * 40}ms both`,
                boxShadow: isLocked ? "0 2px 12px rgba(248,180,0,0.18)" : "0 1px 2px rgba(16,24,40,0.04)",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.boxShadow = isLocked ? "0 8px 28px rgba(248,180,0,0.35)" : `0 24px 40px -14px ${color}45`)}
              onMouseLeave={(e) => (e.currentTarget.style.boxShadow = isLocked ? "0 2px 12px rgba(248,180,0,0.18)" : "0 1px 2px rgba(16,24,40,0.04)")}
            >
              {/* Gold lock overlay for non-premium sellers */}
              {isLocked && (
                <div className="absolute inset-0 z-20 flex flex-col items-center justify-center rounded-2xl" style={{ background: "rgba(11,31,58,0.72)", backdropFilter: "blur(3px)" }}>
                  <div className="w-12 h-12 rounded-full flex items-center justify-center mb-2" style={{ background: "linear-gradient(135deg,#F8B400,#c98f00)", boxShadow: "0 6px 20px rgba(248,180,0,0.5)" }}>
                    <svg viewBox="0 0 24 24" className="w-6 h-6 fill-white"><path d="M18 8h-1V6A5 5 0 0 0 7 6v2H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V10a2 2 0 0 0-2-2zM9 6a3 3 0 0 1 6 0v2H9V6zm9 14H6V10h12v10zm-6-3a2 2 0 1 0 0-4 2 2 0 0 0 0 4z"/></svg>
                  </div>
                  <div className="text-white font-bold text-xs text-center px-3" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Gold Plan Only</div>
                  <div className="mt-1.5 text-[10px] text-white/60 text-center px-4">Tap to unlock this premium product</div>
                </div>
              )}
              {/* Gradient accent bar, same touch used across the dashboard's cards */}
              <div className="absolute top-0 left-0 right-0 h-[3px] z-10" style={{ background: `linear-gradient(90deg, ${color}, ${color}00)` }} />

              {/* ── Image ── */}
              <div className="relative w-full aspect-square flex items-center justify-center overflow-hidden" style={{ background: `linear-gradient(160deg, ${color}14, ${color}05)` }}>
                <div className={`transition-transform duration-500 ease-out group-hover:scale-110 flex items-center justify-center w-full h-full${isLocked ? " blur-sm select-none pointer-events-none" : ""}`}>
                  <ProductThumb product={p} size={56} className="w-full h-full" />
                </div>
                {/* Diagonal shine sweep on hover */}
                <div
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                  style={{
                    background: "linear-gradient(115deg, transparent 30%, rgba(255,255,255,0.45) 50%, transparent 70%)",
                    backgroundSize: "220% 220%",
                    animation: "shimmer 1.6s ease-in-out",
                  }}
                />
                <span
                  className="absolute top-3 left-3 inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide px-2 py-1 rounded-full backdrop-blur-sm shadow-sm"
                  style={inStock ? { background: "rgba(255,255,255,0.92)", color: "#00a67e" } : { background: "rgba(255,255,255,0.92)", color: "#EF4444" }}
                >
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: inStock ? "#00C896" : "#EF4444", animation: inStock ? "livePulse 2s infinite" : "none" }} />
                  {inStock ? "In Stock" : "Out of Stock"}
                </span>
                {p.isPremium && (
                  <span
                    className="absolute top-3 right-3 inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide px-2 py-1 rounded-full shadow-sm"
                    style={{ background: "#F8B400", color: "#04140f" }}
                  >
                    <Sparkles className="w-3 h-3" /> Premium
                  </span>
                )}
                {isAdmin && (
                  <button
                    onClick={(e) => { e.stopPropagation(); startEdit(p); }}
                    className="absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center transition-colors shadow-sm"
                    style={{ background: "rgba(255,255,255,0.95)", border: "1px solid #E5E7EB", color: "#6B7280" }}
                    title="Edit product"
                  >
                    ✏️
                  </button>
                )}
              </div>

              {/* ── Content ── */}
              <div className="p-4 flex flex-col flex-1">
                <span className="inline-block w-fit text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full" style={{ color, background: color + "16" }}>{p.category}</span>
                <div className="mt-2 font-semibold text-sm leading-snug line-clamp-2 min-h-[2.5rem]" style={{ color: "#111827" }}>{p.name}</div>
                <div
                  className="mt-2 text-xl font-extrabold"
                  style={{ fontFamily: "'Space Grotesk', sans-serif", color: "#0B1F3A" }}
                >
                  AED {Number(p.sell).toLocaleString()}
                </div>

                {/* ── Quantity counter ── */}
                <div className="mt-3 flex items-center justify-between" onClick={(e) => e.stopPropagation()}>
                  <span className="text-xs text-gray-400 font-medium">Quantity</span>
                  <div className="flex items-center rounded-full" style={{ border: "1px solid #E5E7EB" }}>
                    <button
                      onClick={() => setQty(p.id, qty - 1)}
                      className="w-7 h-7 text-sm font-bold text-gray-500 hover:text-gray-800 transition-colors"
                    >−</button>
                    <span className="w-6 text-center text-sm font-semibold" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{qty}</span>
                    <button
                      onClick={() => setQty(p.id, Math.min((p.stock ?? 0) || 1, qty + 1))}
                      className="w-7 h-7 text-sm font-bold text-gray-500 hover:text-gray-800 transition-colors"
                    >+</button>
                  </div>
                </div>

                <div className="mt-3 flex gap-2 mt-auto pt-3" onClick={(e) => e.stopPropagation()}>
                  <button disabled={!inStock} onClick={() => addToCart(p, qty)} className="flex-1 text-xs font-semibold py-2.5 rounded-full transition-transform duration-200 hover:scale-[1.03] active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100" style={{ border: "1px solid #0B1F3A", color: "#0B1F3A" }}>
                    Add to Cart
                  </button>
                  <button disabled={!inStock} onClick={() => buyNow(p, qty)} className="flex-1 text-xs font-semibold py-2.5 rounded-full text-white transition-transform duration-200 hover:scale-[1.03] active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100" style={{ background: inStock ? "linear-gradient(135deg,#00C896,#00a67e)" : "#D1D5DB" }}>
                    {inStock ? "Buy Now" : "Unavailable"}
                  </button>
                </div>
                <button onClick={(e) => { e.stopPropagation(); openProduct(p); }} className="mt-2 w-full text-xs font-semibold py-1 text-center transition-colors" style={{ color: "#9CA3AF" }}>
                  View full details →
                </button>
              </div>
            </div>
          );
        })}
      </div>
      {searchQuery && catalog.filter((p) => p.name.toLowerCase().includes(searchQuery.toLowerCase()) || (p.category || "").toLowerCase().includes(searchQuery.toLowerCase())).length === 0 && (
        <div className="text-center py-16 text-white/50 text-sm">No products found for "{searchQuery}"</div>
      )}

      {/* Gold Plan Unlock Modal */}
      {showGoldModal && (
        <div className="fixed inset-0 z-[99] flex items-center justify-center px-4" style={{ background: "rgba(11,31,58,0.75)", backdropFilter: "blur(6px)" }} onClick={() => setShowGoldModal(false)}>
          <div
            className="relative w-full max-w-sm rounded-3xl overflow-hidden"
            style={{ background: "#0B1F3A", border: "1px solid rgba(248,180,0,0.4)", boxShadow: "0 32px 80px rgba(0,0,0,0.6)", animation: "dashTabIn 0.3s ease-out both" }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Gold shimmer top bar */}
            <div className="h-1.5 w-full" style={{ background: "linear-gradient(90deg, #F8B400, #FFE29A, #c98f00)" }} />

            {/* Glowing orbs */}
            <div className="pointer-events-none absolute -top-10 -right-10 w-40 h-40 rounded-full opacity-30 blur-3xl" style={{ background: "#F8B400" }} />
            <div className="pointer-events-none absolute -bottom-10 -left-10 w-32 h-32 rounded-full opacity-20 blur-3xl" style={{ background: "#00C896" }} />

            <div className="relative px-8 pt-8 pb-7 text-center">
              {/* Lock icon */}
              <div className="mx-auto w-16 h-16 rounded-2xl flex items-center justify-center mb-4" style={{ background: "linear-gradient(135deg,#F8B400,#c98f00)", boxShadow: "0 10px 30px rgba(248,180,0,0.5)" }}>
                <svg viewBox="0 0 24 24" className="w-8 h-8 fill-white"><path d="M18 8h-1V6A5 5 0 0 0 7 6v2H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V10a2 2 0 0 0-2-2zM9 6a3 3 0 0 1 6 0v2H9V6zm9 14H6V10h12v10zm-6-3a2 2 0 1 0 0-4 2 2 0 0 0 0 4z"/></svg>
              </div>

              <div className="inline-flex items-center gap-1.5 text-[11px] font-bold tracking-widest uppercase px-3 py-1 rounded-full mb-3" style={{ background: "rgba(248,180,0,0.18)", color: "#F8B400" }}>
                <Crown className="w-3 h-3" /> Premium Product
              </div>

              <h2 className="text-xl font-extrabold text-white" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                Purchase Gold Plan<br />To Unlock Products
              </h2>
              <p className="mt-2.5 text-sm text-white/55 leading-relaxed">
                This is an exclusive product available only to Gold Plan sellers. Upgrade your account to get access to premium sourcing, winning products & private creatives.
              </p>

              {/* Benefits list */}
              <div className="mt-5 text-left space-y-2.5">
                {[
                  "Access to all premium & trending products",
                  "Winning creatives & ad strategy included",
                  "Private sourcing & product financing",
                  "Senior account manager — priority support",
                ].map((b, i) => (
                  <div key={i} className="flex items-start gap-2.5">
                    <div className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: "rgba(248,180,0,0.2)" }}>
                      <svg viewBox="0 0 12 12" className="w-2.5 h-2.5" fill="#F8B400"><path d="M10 3L5 8.5 2 5.5" stroke="#F8B400" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/></svg>
                    </div>
                    <span className="text-xs text-white/70">{b}</span>
                  </div>
                ))}
              </div>

              {/* CTA buttons */}
              <div className="mt-6 flex flex-col gap-2.5">
                <a
                  href="https://wa.me/?text=Hi%2C+I%27m+interested+in+upgrading+to+the+Gold+Plan+on+EmirateFulfil"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full text-sm font-bold py-3 rounded-xl text-center transition-transform duration-200 hover:scale-[1.02] active:scale-95"
                  style={{ background: "linear-gradient(135deg,#F8B400,#c98f00)", color: "#04140f", boxShadow: "0 8px 20px rgba(248,180,0,0.4)" }}
                >
                  🚀 Upgrade to Gold Plan
                </a>
                <button
                  onClick={() => setShowGoldModal(false)}
                  className="w-full text-sm font-semibold py-2.5 rounded-xl text-white/50 hover:text-white/80 transition-colors"
                >
                  Maybe later
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
function InvoicesTab({ session }) {
  return (
    <div>
      <div
        className="rounded-2xl p-6 text-white relative overflow-hidden mb-6"
        style={{ background: "linear-gradient(120deg,#0B1F3A 0%,#0F2E52 55%,#0B7A5E 130%)" }}
      >
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{ backgroundImage: "radial-gradient(circle, #ffffff 1px, transparent 1px)", backgroundSize: "18px 18px" }}
        />
        <div
          className="absolute -top-14 -right-10 w-56 h-56 rounded-full opacity-30 blur-3xl"
          style={{ background: "#00C896", animation: "blobMove 9s ease-in-out infinite" }}
        />
        <div
          className="absolute -bottom-20 left-1/4 w-52 h-52 rounded-full opacity-20 blur-3xl"
          style={{ background: "#F8B400", animation: "blobMove 11s ease-in-out infinite reverse" }}
        />
        <div className="relative flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background: "rgba(0,200,150,0.18)" }}>
            <Receipt className="w-7 h-7" style={{ color: "#00e0aa" }} />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Invoices</h1>
            <p className="text-sm text-white/70 mt-1">Tax invoices Admin has created for you show up here.</p>
          </div>
        </div>
      </div>
      <SellerInvoicesPanel email={session.email} showEmptyState />
    </div>
  );
}

// Full branded tax invoice document — shared by Admin (preview/print + mark
// paid) and Seller (read-only view + print). Rendered as a fixed overlay so
// it can be opened from anywhere without disturbing the page underneath.
function InvoiceDocument({ invoice, isAdmin, onClose, onMarkStatus }) {
  const items = Array.isArray(invoice.items) ? invoice.items : [];
  return (
    <div className="fixed inset-0 z-[95] flex items-start justify-center overflow-y-auto py-8 px-3" style={{ background: "rgba(11,31,58,0.6)" }}>
      <style>{`
        @media print {
          body * { visibility: hidden; }
          .invoice-print-area, .invoice-print-area * { visibility: visible; }
          .invoice-print-area { position: absolute; top: 0; left: 0; width: 100%; }
          .no-print { display: none !important; }
        }
      `}</style>
      <div className="w-full max-w-4xl bg-white rounded-2xl overflow-hidden shadow-2xl">
        <div className="no-print flex flex-wrap items-center justify-between gap-2 px-5 py-3" style={{ borderBottom: "1px solid #E5E7EB" }}>
          <span className="text-sm font-semibold" style={{ color: "#0B1F3A" }}>Invoice {invoice.invoice_number}</span>
          <div className="flex items-center gap-2">
            {isAdmin && (
              <button
                onClick={() => onMarkStatus(invoice.status === "paid" ? "unpaid" : "paid")}
                className="text-xs font-semibold px-3 py-1.5 rounded-full text-white"
                style={{ background: invoice.status === "paid" ? "#6B7280" : "#00C896" }}
              >
                {invoice.status === "paid" ? "Mark unpaid" : "Mark paid"}
              </button>
            )}
            <button onClick={() => window.print()} className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full text-white" style={{ background: "#0B1F3A" }}>
              <Printer className="w-3.5 h-3.5" /> Print / Save PDF
            </button>
            <button onClick={onClose} className="text-xs font-semibold px-3 py-1.5 rounded-full" style={{ border: "1px solid #E5E7EB", color: "#6B7280" }}>Close</button>
          </div>
        </div>

        <div className="invoice-print-area p-8" style={{ fontFamily: "Inter, sans-serif" }}>
          <div className="text-center">
            <div className="flex items-center justify-center gap-2">
              <Logo box="w-10 h-10" icon="w-5 h-5" />
              <span className="text-2xl font-extrabold" style={{ color: "#0B1F3A", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                Emirate<span style={{ color: "#00C896" }}>Fulfil</span>
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-start justify-between gap-4 mt-6 text-sm">
            <div>
              <div className="text-xs text-gray-400">Store Name</div>
              <div className="font-bold" style={{ color: "#0B1F3A" }}>{invoice.store_name || "—"}</div>
              <div className="text-xs text-gray-400 mt-2">Seller Email</div>
              <div className="text-gray-700">{invoice.seller_email}</div>
            </div>
            <div className="text-right">
              <div className="font-bold" style={{ color: "#0B1F3A" }}>Tax Invoice</div>
              {invoice.trn_no && <div className="text-xs text-gray-500">TRN No. {invoice.trn_no}</div>}
              <div className="text-xs text-gray-500 mt-2">Invoice No. {invoice.invoice_number}</div>
              <div className="text-xs text-gray-500">Dated: {invoice.invoice_date}</div>
              {invoice.payment_date && <div className="text-xs text-gray-500">Payment Date: {invoice.payment_date}</div>}
            </div>
          </div>

          <div className="mt-6 overflow-x-auto">
            <table className="w-full text-[11px]">
              <thead>
                <tr className="text-left" style={{ borderBottom: "2px solid #0B1F3A" }}>
                  <th className="px-2 py-2">Order Date</th>
                  <th className="px-2 py-2">Order ID</th>
                  <th className="px-2 py-2">Product</th>
                  <th className="px-2 py-2 text-right">Qty</th>
                  <th className="px-2 py-2 text-right">Sale Price/Unit</th>
                  <th className="px-2 py-2 text-right">Product Value (A)</th>
                  <th className="px-2 py-2 text-right">Service Fee (B)</th>
                  <th className="px-2 py-2 text-right">Value Excl. VAT (A+B)</th>
                  <th className="px-2 py-2 text-right">VAT {invoice.vat_rate ?? INVOICE_VAT_RATE}%</th>
                  <th className="px-2 py-2 text-right">Value Incl. VAT</th>
                  <th className="px-2 py-2 text-right">COD</th>
                  <th className="px-2 py-2 text-right">RTC Deduction</th>
                  <th className="px-2 py-2 text-right">Payable</th>
                  <th className="px-2 py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {items.map((it, i) => (
                  <tr key={it.orderId || i} style={{ borderBottom: "1px solid #F3F4F6" }}>
                    <td className="px-2 py-2 whitespace-nowrap">{it.orderDate || "—"}</td>
                    <td className="px-2 py-2 whitespace-nowrap">{it.orderId}</td>
                    <td className="px-2 py-2">{it.productName}</td>
                    <td className="px-2 py-2 text-right">{it.qty}</td>
                    <td className="px-2 py-2 text-right">{Number(it.salePrice).toFixed(2)}</td>
                    <td className="px-2 py-2 text-right">{Number(it.productValue).toFixed(2)}</td>
                    <td className="px-2 py-2 text-right">{Number(it.serviceFee).toFixed(2)}</td>
                    <td className="px-2 py-2 text-right">{Number(it.exclVat).toFixed(2)}</td>
                    <td className="px-2 py-2 text-right">{Number(it.vatAmount).toFixed(2)}</td>
                    <td className="px-2 py-2 text-right">{Number(it.inclVat).toFixed(2)}</td>
                    <td className="px-2 py-2 text-right">{Number(it.cod).toFixed(2)}</td>
                    <td className="px-2 py-2 text-right">{Number(it.rtcDeduction).toFixed(2)}</td>
                    <td className="px-2 py-2 text-right font-semibold">{Number(it.payable).toFixed(2)}</td>
                    <td className="px-2 py-2 capitalize">{it.status}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="font-bold" style={{ borderTop: "2px solid #0B1F3A" }}>
                  <td className="px-2 py-2" colSpan={7}>Totals</td>
                  <td className="px-2 py-2 text-right">{Number(invoice.subtotal_excl_vat).toFixed(2)}</td>
                  <td className="px-2 py-2 text-right">{Number(invoice.vat_total).toFixed(2)}</td>
                  <td className="px-2 py-2 text-right">{Number(invoice.subtotal_incl_vat).toFixed(2)}</td>
                  <td className="px-2 py-2 text-right">{Number(invoice.cod_total).toFixed(2)}</td>
                  <td className="px-2 py-2 text-right">{Number(invoice.rtc_deductions_total).toFixed(2)}</td>
                  <td className="px-2 py-2 text-right">{Number(invoice.payable_total ?? invoice.net_payable).toFixed(2)}</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>

          <div className="flex flex-wrap items-start justify-between gap-4 mt-6">
            <div className="text-sm">
              <div className="font-bold" style={{ color: "#0B1F3A" }}>Bank Details</div>
              <div className="text-xs text-gray-600 mt-1">A/C Title: {invoice.account_title || "—"}</div>
              <div className="text-xs text-gray-600">A/C No: {invoice.account_number || "—"}</div>
              <div className="text-xs text-gray-600">Bank Name: {invoice.bank_name || "—"}</div>
            </div>
            <div className="text-right">
              <div className="text-xs text-gray-400">Net Payable (AED)</div>
              <div className="text-2xl font-extrabold" style={{ color: "#00C896", fontFamily: "'Space Grotesk', sans-serif" }}>{Number(invoice.net_payable).toFixed(2)}</div>
              <div className="mt-2">
                <span
                  className="text-xs font-semibold px-2.5 py-1 rounded-full"
                  style={invoice.status === "paid" ? { background: "rgba(0,200,150,0.15)", color: "#00a67e" } : { background: "rgba(248,180,0,0.15)", color: "#b07d00" }}
                >
                  {invoice.status === "paid" ? "Paid" : "Unpaid"}
                </span>
              </div>
            </div>
          </div>

          {invoice.company_address && <div className="text-xs text-gray-400 mt-6">{invoice.company_address}</div>}
        </div>
      </div>
    </div>
  );
}

// Admin-only: build a new invoice for one seller (pick orders with checkboxes,
// edit fee/COD/RTC per row) and browse that seller's past invoices.
function SellerInvoiceManager({ seller, notify, onClose }) {
  const [view, setView] = useState("create"); // create | history
  const [uninvoiced, setUninvoiced] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [selected, setSelected] = useState({});
  const [rowEdits, setRowEdits] = useState({});
  const [vatRate, setVatRate] = useState(INVOICE_VAT_RATE);
  const [invoiceDate, setInvoiceDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [paymentDate, setPaymentDate] = useState("");
  const [trnNo, setTrnNo] = useState("");
  const [companyAddress, setCompanyAddress] = useState("");
  const [bankOverride, setBankOverride] = useState({
    bank_name: seller.bank_name || "", account_title: seller.account_title || "", account_number: seller.account_number || "",
  });
  const [saving, setSaving] = useState(false);

  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [openInvoice, setOpenInvoice] = useState(null);

  const loadOrders = async () => { setLoadingOrders(true); setUninvoiced(await fetchUninvoicedOrders(seller.email)); setLoadingOrders(false); };
  const loadHistory = async () => { setHistoryLoading(true); setHistory(await fetchSellerInvoices(seller.email)); setHistoryLoading(false); };
  useEffect(() => { loadOrders(); loadHistory(); }, []); // eslint-disable-line

  const toggleSelect = (o) => {
    setSelected((s) => {
      const next = { ...s };
      if (next[o.id]) {
        delete next[o.id];
      } else {
        next[o.id] = true;
        setRowEdits((r) => (r[o.id] ? r : {
          ...r,
          [o.id]: {
            serviceFee: 0,
            cod: o.status === "delivered" ? (o.sellPrice * o.qty + (o.deliveryCharge || 0)) : 0,
            rtcDeduction: (o.status === "returned" || o.status === "cancelled") ? -5 : 0,
          },
        }));
      }
      return next;
    });
  };
  const editRow = (id, field, value) => setRowEdits((r) => ({ ...r, [id]: { ...r[id], [field]: value } }));

  const selectedOrders = uninvoiced.filter((o) => selected[o.id]);
  const computedItems = selectedOrders.map((o) => {
    const edit = rowEdits[o.id] || { serviceFee: 0, cod: 0, rtcDeduction: 0 };
    const serviceFee = Number(edit.serviceFee) || 0;
    const cod = Number(edit.cod) || 0;
    const rtcDeduction = Number(edit.rtcDeduction) || 0;
    const productValue = o.sellPrice * o.qty;
    const exclVat = productValue + serviceFee;
    const vatAmount = exclVat * (Number(vatRate) / 100);
    const inclVat = exclVat + vatAmount;
    const payable = cod + rtcDeduction;
    return {
      orderId: o.id, orderDate: o.createdAt ? new Date(o.createdAt).toLocaleDateString() : "",
      productName: o.productName, qty: o.qty, salePrice: o.sellPrice, productValue, serviceFee,
      exclVat, vatAmount, inclVat, cod, rtcDeduction, payable, status: o.status,
    };
  });
  const totals = computedItems.reduce((t, it) => ({
    excl: t.excl + it.exclVat, vat: t.vat + it.vatAmount, incl: t.incl + it.inclVat,
    cod: t.cod + it.cod, rtc: t.rtc + it.rtcDeduction, payable: t.payable + it.payable,
  }), { excl: 0, vat: 0, incl: 0, cod: 0, rtc: 0, payable: 0 });

  const saveInvoice = async () => {
    if (!computedItems.length) { notify("Select at least one order for this invoice."); return; }
    setSaving(true);
    const invoice_number = genInvoiceNumber();
    const payload = {
      invoice_number, seller_email: seller.email, store_name: seller.store_name || seller.company || "",
      trn_no: trnNo || null, invoice_date: invoiceDate, payment_date: paymentDate || null, vat_rate: Number(vatRate) || INVOICE_VAT_RATE,
      items: computedItems, subtotal_excl_vat: totals.excl, vat_total: totals.vat, subtotal_incl_vat: totals.incl,
      cod_total: totals.cod, rtc_deductions_total: totals.rtc, payable_total: totals.payable, net_payable: totals.payable,
      bank_name: bankOverride.bank_name || null, account_title: bankOverride.account_title || null, account_number: bankOverride.account_number || null,
      company_address: companyAddress || null, status: "unpaid",
    };
    const { error } = await supabase.from("seller_invoices").insert(payload);
    if (error) { console.error(error); notify("Could not create invoice."); setSaving(false); return; }
    await supabase.from("orders").update({ invoiced_at: new Date().toISOString() }).in("id", selectedOrders.map((o) => o.id));
    setSaving(false);
    notify("Invoice created — visible in the seller's Invoices tab now.");
    setSelected({});
    setRowEdits({});
    loadOrders();
    loadHistory();
    setView("history");
  };

  const markStatus = async (invoice, status) => {
    await supabase.from("seller_invoices").update({ status }).eq("id", invoice.id);
    setHistory((h) => h.map((x) => (x.id === invoice.id ? { ...x, status } : x)));
    setOpenInvoice((cur) => (cur && cur.id === invoice.id ? { ...cur, status } : cur));
    notify(status === "paid" ? "Invoice marked paid." : "Invoice marked unpaid.");
  };

  return (
    <>
      <div className="fixed inset-0 z-[85] flex items-start justify-center overflow-y-auto py-8 px-3" style={{ background: "rgba(11,31,58,0.55)" }}>
        <div className="w-full max-w-5xl bg-white rounded-2xl overflow-hidden shadow-2xl">
          <div className="flex flex-wrap items-center justify-between gap-2 px-6 py-4" style={{ borderBottom: "1px solid #E5E7EB" }}>
            <div>
              <div className="text-base font-extrabold" style={{ color: "#0B1F3A" }}>{seller.name || seller.email}</div>
              <div className="text-xs text-gray-400">{seller.email}</div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setView("create")} className="text-xs font-semibold px-3 py-1.5 rounded-full" style={view === "create" ? { background: "#0B1F3A", color: "#fff" } : { border: "1px solid #E5E7EB", color: "#6B7280" }}>Create invoice</button>
              <button onClick={() => setView("history")} className="text-xs font-semibold px-3 py-1.5 rounded-full" style={view === "history" ? { background: "#0B1F3A", color: "#fff" } : { border: "1px solid #E5E7EB", color: "#6B7280" }}>History ({history.length})</button>
              <button onClick={onClose} className="text-xs font-semibold px-3 py-1.5 rounded-full" style={{ border: "1px solid #E5E7EB", color: "#6B7280" }}>Close</button>
            </div>
          </div>

          <div className="p-6 max-h-[75vh] overflow-y-auto">
            {view === "create" ? (
              <>
                <div className="grid sm:grid-cols-4 gap-3">
                  <div><label className="text-xs text-gray-500">Invoice date</label><input type="date" value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)} className="mt-1 w-full rounded-lg px-3 py-2 text-sm" style={{ border: "1px solid #E5E7EB" }} /></div>
                  <div><label className="text-xs text-gray-500">Payment date</label><input type="date" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} className="mt-1 w-full rounded-lg px-3 py-2 text-sm" style={{ border: "1px solid #E5E7EB" }} /></div>
                  <div><label className="text-xs text-gray-500">TRN No.</label><input value={trnNo} onChange={(e) => setTrnNo(e.target.value)} className="mt-1 w-full rounded-lg px-3 py-2 text-sm" style={{ border: "1px solid #E5E7EB" }} /></div>
                  <div><label className="text-xs text-gray-500">VAT %</label><input type="number" value={vatRate} onChange={(e) => setVatRate(e.target.value)} className="mt-1 w-full rounded-lg px-3 py-2 text-sm" style={{ border: "1px solid #E5E7EB" }} /></div>
                </div>
                <div className="grid sm:grid-cols-3 gap-3 mt-3">
                  <div><label className="text-xs text-gray-500">Bank name</label><input value={bankOverride.bank_name} onChange={(e) => setBankOverride({ ...bankOverride, bank_name: e.target.value })} className="mt-1 w-full rounded-lg px-3 py-2 text-sm" style={{ border: "1px solid #E5E7EB" }} /></div>
                  <div><label className="text-xs text-gray-500">Account title</label><input value={bankOverride.account_title} onChange={(e) => setBankOverride({ ...bankOverride, account_title: e.target.value })} className="mt-1 w-full rounded-lg px-3 py-2 text-sm" style={{ border: "1px solid #E5E7EB" }} /></div>
                  <div><label className="text-xs text-gray-500">Account / IBAN</label><input value={bankOverride.account_number} onChange={(e) => setBankOverride({ ...bankOverride, account_number: e.target.value })} className="mt-1 w-full rounded-lg px-3 py-2 text-sm" style={{ border: "1px solid #E5E7EB" }} /></div>
                </div>
                <div className="mt-3"><label className="text-xs text-gray-500">Company address (printed on invoice)</label><input value={companyAddress} onChange={(e) => setCompanyAddress(e.target.value)} className="mt-1 w-full rounded-lg px-3 py-2 text-sm" style={{ border: "1px solid #E5E7EB" }} /></div>

                <div className="mt-5">
                  <div className="text-sm font-bold" style={{ color: "#0B1F3A" }}>Select orders ({uninvoiced.length} not yet invoiced)</div>
                  {loadingOrders ? (
                    <div className="text-sm text-gray-400 py-6 text-center">Loading orders…</div>
                  ) : uninvoiced.length === 0 ? (
                    <div className="text-sm text-gray-400 py-6 text-center">No un-invoiced orders for this seller.</div>
                  ) : (
                    <div className="mt-2 overflow-x-auto rounded-xl" style={{ border: "1px solid #E5E7EB" }}>
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="text-left text-gray-400" style={{ background: "#F8FAFC" }}>
                            <th className="px-3 py-2"></th>
                            <th className="px-3 py-2">Order</th>
                            <th className="px-3 py-2">Product</th>
                            <th className="px-3 py-2">Qty</th>
                            <th className="px-3 py-2">Sale/Unit</th>
                            <th className="px-3 py-2">Status</th>
                            <th className="px-3 py-2">Service Fee</th>
                            <th className="px-3 py-2">COD</th>
                            <th className="px-3 py-2">RTC Deduction</th>
                            <th className="px-3 py-2">Payable</th>
                          </tr>
                        </thead>
                        <tbody>
                          {uninvoiced.map((o) => {
                            const isSel = !!selected[o.id];
                            const edit = rowEdits[o.id] || { serviceFee: 0, cod: 0, rtcDeduction: 0 };
                            const payable = (Number(edit.cod) || 0) + (Number(edit.rtcDeduction) || 0);
                            return (
                              <tr key={o.id} style={{ borderTop: "1px solid #F3F4F6" }}>
                                <td className="px-3 py-2"><input type="checkbox" checked={isSel} onChange={() => toggleSelect(o)} /></td>
                                <td className="px-3 py-2 text-gray-500">{o.id}</td>
                                <td className="px-3 py-2">{o.productName}</td>
                                <td className="px-3 py-2">{o.qty}</td>
                                <td className="px-3 py-2">{o.sellPrice}</td>
                                <td className="px-3 py-2 capitalize">{o.status}</td>
                                <td className="px-3 py-2"><input type="number" disabled={!isSel} value={edit.serviceFee} onChange={(e) => editRow(o.id, "serviceFee", e.target.value)} className="w-20 rounded px-2 py-1" style={{ border: "1px solid #E5E7EB" }} /></td>
                                <td className="px-3 py-2"><input type="number" disabled={!isSel} value={edit.cod} onChange={(e) => editRow(o.id, "cod", e.target.value)} className="w-20 rounded px-2 py-1" style={{ border: "1px solid #E5E7EB" }} /></td>
                                <td className="px-3 py-2"><input type="number" disabled={!isSel} value={edit.rtcDeduction} onChange={(e) => editRow(o.id, "rtcDeduction", e.target.value)} className="w-20 rounded px-2 py-1" style={{ border: "1px solid #E5E7EB" }} /></td>
                                <td className="px-3 py-2 font-semibold">{isSel ? payable.toFixed(2) : "—"}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {computedItems.length > 0 && (
                  <div className="mt-4 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3" style={{ background: "#F8FAFC", border: "1px solid #E5E7EB" }}>
                    <div className="text-xs text-gray-500">
                      {computedItems.length} order{computedItems.length === 1 ? "" : "s"} selected · VAT {vatRate}% · Excl {totals.excl.toFixed(2)} · VAT {totals.vat.toFixed(2)} · Incl {totals.incl.toFixed(2)}
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-gray-400">Net payable</div>
                      <div className="text-lg font-extrabold" style={{ color: "#00C896" }}>AED {totals.payable.toFixed(2)}</div>
                    </div>
                    <button onClick={saveInvoice} disabled={saving} className="text-sm font-semibold px-5 py-2.5 rounded-full text-white" style={{ background: "#0B1F3A", opacity: saving ? 0.6 : 1 }}>
                      {saving ? "Creating…" : "Create invoice"}
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div>
                {historyLoading ? (
                  <div className="text-sm text-gray-400 py-8 text-center">Loading invoices…</div>
                ) : history.length === 0 ? (
                  <div className="text-sm text-gray-400 py-8 text-center">No invoices created for this seller yet.</div>
                ) : (
                  <div className="overflow-x-auto rounded-xl" style={{ border: "1px solid #E5E7EB" }}>
                    <table className="w-full min-w-[640px] text-sm">
                      <thead>
                        <tr className="text-left text-xs text-gray-400" style={{ background: "#F8FAFC" }}>
                          <th className="px-4 py-2">Invoice #</th>
                          <th className="px-4 py-2">Date</th>
                          <th className="px-4 py-2">Net Payable</th>
                          <th className="px-4 py-2">Status</th>
                          <th className="px-4 py-2"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {history.map((inv) => (
                          <tr key={inv.id} style={{ borderTop: "1px solid #F3F4F6" }}>
                            <td className="px-4 py-2" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{inv.invoice_number}</td>
                            <td className="px-4 py-2 text-gray-500">{inv.invoice_date}</td>
                            <td className="px-4 py-2 font-semibold">AED {Number(inv.net_payable).toFixed(2)}</td>
                            <td className="px-4 py-2">
                              <span className="text-xs font-semibold px-2.5 py-1 rounded-full" style={inv.status === "paid" ? { background: "rgba(0,200,150,0.15)", color: "#00a67e" } : { background: "rgba(248,180,0,0.15)", color: "#b07d00" }}>
                                {inv.status === "paid" ? "Paid" : "Unpaid"}
                              </span>
                            </td>
                            <td className="px-4 py-2">
                              <button onClick={() => setOpenInvoice(inv)} className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-full" style={{ border: "1px solid #E5E7EB", color: "#0B1F3A" }}><Eye className="w-3.5 h-3.5" /> View</button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
      {openInvoice && (
        <InvoiceDocument invoice={openInvoice} isAdmin onClose={() => setOpenInvoice(null)} onMarkStatus={(status) => markStatus(openInvoice, status)} />
      )}
    </>
  );
}

// Seller-facing, read-only: statements Admin has created for this seller —
// shown at the top of the seller's own Invoices tab, above the per-order list.
function SellerInvoicesPanel({ email, showEmptyState = false }) {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openInvoice, setOpenInvoice] = useState(null);

  useEffect(() => {
    (async () => { setLoading(true); setInvoices(await fetchSellerInvoices(email)); setLoading(false); })();
  }, [email]);

  if (loading) {
    return showEmptyState ? (
      <div className="rounded-2xl bg-white text-sm text-gray-400 py-14 text-center" style={{ border: "1px solid #E5E7EB" }}>Loading invoices…</div>
    ) : null;
  }
  if (invoices.length === 0) {
    if (!showEmptyState) return null;
    return (
      <div className="flex flex-col items-center justify-center py-14 text-center rounded-2xl bg-white" style={{ border: "1px solid #E5E7EB" }}>
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-3" style={{ background: "rgba(11,31,58,0.06)" }}>
          <Receipt className="w-7 h-7" style={{ color: "#9CA3AF" }} />
        </div>
        <div className="text-sm text-gray-400">No invoices yet — Admin will create one for you here once it's ready.</div>
      </div>
    );
  }

  return (
    <div className="mb-6">
      <h2 className="text-base font-extrabold mb-2 flex items-center gap-2" style={{ color: "#0B1F3A", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
        <FileText className="w-4 h-4" /> Statements from Admin
      </h2>
      <div className="rounded-2xl bg-white overflow-x-auto" style={{ border: "1px solid #E5E7EB" }}>
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="text-left text-xs text-gray-400" style={{ borderBottom: "1px solid #F3F4F6" }}>
              <th className="px-4 py-3">Invoice #</th>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Net Payable</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {invoices.map((inv) => (
              <tr key={inv.id} style={{ borderBottom: "1px solid #FAFAFA" }}>
                <td className="px-4 py-3" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{inv.invoice_number}</td>
                <td className="px-4 py-3 text-gray-500">{inv.invoice_date}</td>
                <td className="px-4 py-3 font-semibold">AED {Number(inv.net_payable).toFixed(2)}</td>
                <td className="px-4 py-3">
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full" style={inv.status === "paid" ? { background: "rgba(0,200,150,0.15)", color: "#00a67e" } : { background: "rgba(248,180,0,0.15)", color: "#b07d00" }}>
                    {inv.status === "paid" ? "Paid" : "Unpaid"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <button onClick={() => setOpenInvoice(inv)} className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-full" style={{ border: "1px solid #E5E7EB", color: "#0B1F3A" }}><Eye className="w-3.5 h-3.5" /> View</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {openInvoice && <InvoiceDocument invoice={openInvoice} isAdmin={false} onClose={() => setOpenInvoice(null)} onMarkStatus={() => {}} />}
    </div>
  );
}

function AdminOrdersPanel({ notify }) {
  const [allOrders, setAllOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [trackingDrafts, setTrackingDrafts] = useState({});
  // Courier picked per order (before Save) — defaults to whatever's already
  // saved on the order once orders load, via the select's defaultValue.
  const [courierDrafts, setCourierDrafts] = useState({});
  // Only used when courierDrafts[id] === "other" — the pasted custom link.
  const [customUrlDrafts, setCustomUrlDrafts] = useState({});
  // Order id -> true while its WhatsApp-proof screenshot is uploading, so we
  // can disable that row's upload control and show "Uploading…" briefly.
  const [proofUploading, setProofUploading] = useState({});
  // Seller bank details, keyed by email — pulled from profiles so the payout
  // account each seller filled in (and can update from Seller Details) shows
  // right here next to their orders, no need to jump to the Sellers table.
  const [sellerBankInfo, setSellerBankInfo] = useState({});
  // Which seller groups are expanded — keyed by seller email. Only the very
  // first (busiest/most-recent) seller starts open so Admin isn't scrolling
  // past every other seller's full order table just to find one.
  const [openSellers, setOpenSellers] = useState(null);
  const toggleSeller = (key) => setOpenSellers((prev) => ({ ...prev, [key]: !prev[key] }));
  // Default to only the first (busiest/most-recent) seller open, once orders
  // have loaded — runs a single time, right after the first successful load.
  useEffect(() => {
    if (openSellers === null && allOrders.length) {
      const firstKey = allOrders[0].seller_email || "Unknown seller";
      setOpenSellers({ [firstKey]: true });
    }
  }, [allOrders]); // eslint-disable-line
  // Product picture + emoji per product_id, so each order row can show a
  // small thumbnail next to the (truncated) product name instead of the
  // full raw title. Keyed by product id, pulled from the catalog once.
  const [productMap, setProductMap] = useState({});

  const loadAllOrders = async () => {
    setOrdersLoading(true);
    const [{ data, error }, { data: profiles }, products] = await Promise.all([
      supabase.from("orders").select("*").order("created_at", { ascending: false }),
      supabase.from("profiles").select("email, bank_name, account_title, account_number, iban"),
      fetchCatalog(),
    ]);
    if (!error) setAllOrders(data || []);
    const bankMap = {};
    (profiles || []).forEach((p) => { if (p.email) bankMap[p.email] = p; });
    setSellerBankInfo(bankMap);
    const pMap = {};
    (products || []).forEach((p) => { pMap[p.id] = p; });
    setProductMap(pMap);
    setOrdersLoading(false);
  };
  useEffect(() => { loadAllOrders(); }, []); // eslint-disable-line

  const setAdminOrderStatus = async (id, status) => {
    await supabase.from("orders").update({ status }).eq("id", id);
    setAllOrders(allOrders.map((o) => (o.id === id ? { ...o, status } : o)));
  };
  const setAdminPaymentStatus = async (id, payment_status) => {
    await supabase.from("orders").update({ payment_status }).eq("id", id);
    setAllOrders(allOrders.map((o) => (o.id === id ? { ...o, payment_status } : o)));
    notify && notify(payment_status === "paid" ? "Invoice approved as paid." : "Invoice marked unpaid.");
  };
  const saveTracking = async (id) => {
    const value = trackingDrafts[id] ?? "";
    const courier = courierDrafts[id];
    const patch = { tracking_number: value };
    // Only touch courier/tracking_url if Admin actually picked something for
    // this row — so rows nobody's touched yet keep whatever was there before.
    if (courier !== undefined) {
      patch.courier = courier || null;
      patch.tracking_url = courier === "other" ? (customUrlDrafts[id] ?? "") : null;
    }
    await supabase.from("orders").update(patch).eq("id", id);
    setAllOrders(allOrders.map((o) => (o.id === id ? { ...o, ...patch } : o)));
    notify && notify("Tracking info saved.");
  };

  // Upload a WhatsApp-chat screenshot (proof the customer confirmed the
  // order) and save its public URL on the order. Same public-assets bucket
  // as product/logo/ticket images, just under its own prefix.
  const uploadWhatsappProof = async (id, file) => {
    if (!file) return;
    setProofUploading((prev) => ({ ...prev, [id]: true }));
    if (!file.type.startsWith("image/")) {
      notify && notify("Please choose an image file.");
      setProofUploading((prev) => ({ ...prev, [id]: false }));
      return;
    }
    const ext = file.name.split(".").pop() || "jpg";
    const path = `whatsapp-proof/${id}-${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage.from("public-assets").upload(path, file, { upsert: true, cacheControl: "3600" });
    if (upErr) {
      notify && notify("Could not upload the screenshot.");
      setProofUploading((prev) => ({ ...prev, [id]: false }));
      return;
    }
    const { data } = supabase.storage.from("public-assets").getPublicUrl(path);
    const url = data?.publicUrl || null;
    await supabase.from("orders").update({ whatsapp_proof_url: url }).eq("id", id);
    setAllOrders(allOrders.map((o) => (o.id === id ? { ...o, whatsapp_proof_url: url } : o)));
    setProofUploading((prev) => ({ ...prev, [id]: false }));
    notify && notify("WhatsApp proof uploaded.");
  };

  // Group every order by seller, in the order each seller's most recent order appeared —
  // so the busiest / most-recent seller naturally floats to the top.
  const sellerGroups = [];
  const seenSellers = new Map();
  for (const o of allOrders) {
    const key = o.seller_email || "Unknown seller";
    if (!seenSellers.has(key)) {
      seenSellers.set(key, sellerGroups.length);
      sellerGroups.push({ seller: key, orders: [] });
    }
    sellerGroups[seenSellers.get(key)].orders.push(o);
  }
  const SELLER_COLORS = ["#00C896", "#3B82F6", "#F8B400", "#8B5CF6", "#EC4899", "#0B7A5E"];

  return (
    <div>
      <div className="relative overflow-hidden rounded-3xl px-7 py-8 mb-6" style={{ background: "linear-gradient(120deg,#0B1F3A 0%,#0F2E52 55%,#0B7A5E 130%)" }}>
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{ backgroundImage: "radial-gradient(circle, #ffffff 1px, transparent 1px)", backgroundSize: "18px 18px" }}
        />
        <div className="absolute -top-14 -right-10 w-56 h-56 rounded-full opacity-30 blur-3xl" style={{ background: "#00C896", animation: "blobMove 9s ease-in-out infinite" }} />
        <div className="absolute -bottom-20 left-1/4 w-52 h-52 rounded-full opacity-20 blur-3xl" style={{ background: "#F8B400", animation: "blobMove 11s ease-in-out infinite reverse" }} />
        <div className="relative flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background: "rgba(0,200,150,0.18)" }}>
            <Truck className="w-7 h-7" style={{ color: "#00e0aa" }} />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-white" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Orders — all sellers</h1>
            <p className="text-sm text-white/70 mt-1">Every order any seller logs lands here immediately for you to fulfill and update.</p>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes adminOrdersFadeIn { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes adminOrderRowFadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes sellerGroupFadeIn { from { opacity: 0; transform: translateY(18px) scale(0.99); } to { opacity: 1; transform: translateY(0) scale(1); } }
        .admin-orders-panel { animation: adminOrdersFadeIn 0.5s cubic-bezier(.2,.7,.2,1) both; }
        .admin-order-row { opacity: 0; animation: adminOrderRowFadeIn 0.4s cubic-bezier(.2,.7,.2,1) forwards; }
        .seller-group { opacity: 0; animation: sellerGroupFadeIn 0.5s cubic-bezier(.2,.7,.2,1) forwards; }
      `}</style>

      {!ordersLoading && allOrders.length > 0 && (
        <div className="flex items-center justify-between mb-4">
          <div className="text-sm text-gray-500">Update status, approve payments, and save tracking numbers below.</div>
          <span className="text-xs font-semibold px-3 py-1.5 rounded-full" style={{ background: "rgba(0,200,150,0.12)", color: "#00a67e" }}>
            {allOrders.length} order{allOrders.length === 1 ? "" : "s"} · {sellerGroups.length} seller{sellerGroups.length === 1 ? "" : "s"}
          </span>
        </div>
      )}

      {ordersLoading ? (
        <div className="rounded-2xl bg-white text-sm text-gray-400 py-10 text-center" style={{ border: "1px solid #E5E7EB" }}>Loading orders…</div>
      ) : allOrders.length === 0 ? (
        <div className="rounded-2xl bg-white text-sm text-gray-400 py-10 text-center" style={{ border: "1px solid #E5E7EB" }}>No customer orders yet.</div>
      ) : (
        <div className="space-y-6">
          {sellerGroups.map((group, gi) => {
            const color = SELLER_COLORS[gi % SELLER_COLORS.length];
            return (
              <div
                key={group.seller}
                className="seller-group admin-orders-panel rounded-2xl bg-white overflow-hidden"
                style={{ border: "1px solid #E5E7EB", animationDelay: `${gi * 90}ms`, boxShadow: "0 1px 2px rgba(16,24,40,0.04)" }}
              >
                {/* Seller header — colored, one per seller, sits above their own orders. Click to expand/collapse. */}
                <div
                  onClick={() => toggleSeller(group.seller)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggleSeller(group.seller); } }}
                  className="flex flex-wrap items-center justify-between gap-2 px-5 py-4 transition-all duration-300 cursor-pointer select-none"
                  style={{ background: `linear-gradient(90deg, ${color}1A, ${color}05)`, borderBottom: openSellers?.[group.seller] ? `1px solid ${color}30` : "none" }}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <ChevronRight
                      className="w-4 h-4 flex-shrink-0 transition-transform duration-200"
                      style={{ color: "#9CA3AF", transform: openSellers?.[group.seller] ? "rotate(90deg)" : "rotate(0deg)" }}
                    />
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 text-white text-xs font-extrabold"
                      style={{ background: `linear-gradient(135deg, ${color}, ${color}CC)`, boxShadow: `0 6px 14px ${color}40`, fontFamily: "'Space Grotesk', sans-serif" }}
                    >
                      {(group.seller[0] || "?").toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="font-bold text-sm truncate" style={{ color: "#111827", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{group.seller}</div>
                      {(() => {
                        const bank = sellerBankInfo[group.seller];
                        if (!bank || (!bank.bank_name && !bank.account_number && !bank.iban)) return null;
                        return (
                          <div
                            className="flex items-center gap-1 text-[11px] text-gray-500 truncate mt-0.5"
                            title={`Account title: ${bank.account_title || "—"}  ·  IBAN: ${bank.iban || "—"}`}
                          >
                            <Landmark className="w-3 h-3 flex-shrink-0" style={{ color }} />
                            <span className="truncate">{bank.bank_name || "—"} · {bank.account_number || "—"}</span>
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                  <span className="text-[11px] font-bold px-2.5 py-1 rounded-full flex-shrink-0" style={{ background: color + "22", color }}>
                    {group.orders.length} order{group.orders.length === 1 ? "" : "s"}
                  </span>
                </div>

                {openSellers?.[group.seller] && (
                <div className="overflow-x-auto" style={{ WebkitOverflowScrolling: "touch" }}>
                  <table className="w-full min-w-[1420px] text-sm">
                    <thead>
                      <tr className="text-left text-xs text-gray-400" style={{ borderBottom: "1px solid #F3F4F6" }}>
                        <th className="px-4 py-3">Order</th>
                        <th className="px-4 py-3">Product</th>
                        <th className="px-4 py-3">Customer</th>
                        <th className="px-4 py-3">Email / Phone</th>
                        <th className="px-4 py-3">Address / Emirate</th>
                        <th className="px-4 py-3">Instructions</th>
                        <th className="px-4 py-3">Amount</th>
                        <th className="px-4 py-3">Profit</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3">Payment</th>
                        <th className="px-4 py-3">Tracking #</th>
                        <th className="px-4 py-3">WhatsApp Proof</th>
                      </tr>
                    </thead>
                    <tbody>
                      {group.orders.map((o, i) => (
                        <tr key={o.id} className="admin-order-row transition-colors duration-200 hover:bg-gray-50" style={{ borderBottom: "1px solid #FAFAFA", animationDelay: `${gi * 90 + Math.min(i, 20) * 35}ms` }}>
                          <td className="px-4 py-3 text-xs text-gray-500" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{o.id}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2 min-w-[150px] max-w-[220px]">
                              <div
                                className="w-9 h-9 rounded-lg overflow-hidden flex-shrink-0 flex items-center justify-center"
                                style={{ background: "#F8FAFC", border: "1px solid #F3F4F6" }}
                              >
                                <ProductThumb product={productMap[o.product_id]} size={18} />
                              </div>
                              <div className="min-w-0">
                                <div className="truncate font-medium text-gray-800" title={o.product_name}>
                                  {truncateWords(o.product_name, 4)}
                                </div>
                                <span className="text-gray-400 text-xs">×{o.qty}</span>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-gray-700 font-medium">{o.buyer || "—"}</td>
                          <td className="px-4 py-3 text-gray-500 text-xs">
                            <div>{o.customer_email || "—"}</div>
                            <div className="text-gray-400">{o.customer_phone || ""}</div>
                          </td>
                          <td className="px-4 py-3 text-gray-500 text-xs min-w-[200px] max-w-[260px]">
                            <div className="text-gray-700 font-medium">{o.city || "—"}</div>
                            <div className="text-gray-400 whitespace-normal break-words">{o.customer_address || "—"}</div>
                          </td>
                          <td className="px-4 py-3 text-xs min-w-[160px] max-w-[220px] whitespace-normal break-words" style={{ color: o.notes ? "#0B1F3A" : "#9CA3AF" }}>
                            {o.notes || "—"}
                          </td>
                          <td className="px-4 py-3" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>AED {(o.status === "cancelled" || o.status === "returned" || o.status === "customer_cancelled_confirmation") ? 0 : o.sell_price * o.qty + (Number(o.delivery_charge) || 0)}</td>
                          <td className="px-4 py-3 font-semibold" style={{ color: "#00C896", fontFamily: "'Space Grotesk', sans-serif" }}>
                            AED {(o.status === "cancelled" || o.status === "returned" || o.status === "customer_cancelled_confirmation") ? 0 : (Number(o.sell_price) - Number(o.list_price != null ? o.list_price : o.sell_price)) * o.qty}
                          </td>
                          <td className="px-4 py-3">
                            <select
                              value={o.status}
                              onChange={(e) => setAdminOrderStatus(o.id, e.target.value)}
                              className="text-xs rounded-full px-2 py-1 font-semibold border-0"
                              style={ORDER_STATUS_STYLES[o.status] || ORDER_STATUS_STYLES.pending}
                            >
                              <option value="pending">Pending</option>
                              <option value="confirmation_pending">Order confirmation pending</option>
                              <option value="confirmed">Order confirmed</option>
                              <option value="customer_not_replying">Customer not replying</option>
                              <option value="customer_not_picking_call">Customer not picking call</option>
                              <option value="wrong_number">Wrong number</option>
                              <option value="customer_cancelled_confirmation">Customer cancel on confirmation</option>
                              <option value="dispatched">Order dispatched</option>
                              <option value="shipped">Shipped</option>
                              <option value="delivered">Delivered</option>
                              <option value="returned">Returned</option>
                              <option value="cancelled">Cancelled</option>
                            </select>
                          </td>
                          <td className="px-4 py-3">
                            {(o.status === "cancelled" || o.status === "customer_cancelled_confirmation") ? (
                              <span className="text-xs text-gray-300">—</span>
                            ) : (
                              <div className="flex items-center gap-1.5">
                                <PaymentPill status={o.payment_status} />
                                {o.payment_status === "paid" ? (
                                  <button onClick={() => setAdminPaymentStatus(o.id, "unpaid")} className="text-xs font-semibold px-2 py-1.5 rounded-lg" style={{ border: "1px solid #E5E7EB", color: "#6B7280" }}>Undo</button>
                                ) : (
                                  <button onClick={() => setAdminPaymentStatus(o.id, "paid")} className="text-xs font-semibold px-2 py-1.5 rounded-lg text-white" style={{ background: "#00C896" }}>Approve</button>
                                )}
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex flex-col gap-1.5 min-w-[170px]">
                              <div className="flex items-center gap-1.5">
                                <select
                                  defaultValue={o.courier || ""}
                                  onChange={(e) => setCourierDrafts((prev) => ({ ...prev, [o.id]: e.target.value }))}
                                  className="rounded-lg px-1.5 py-1.5 text-xs"
                                  style={{ border: "1px solid #E5E7EB" }}
                                >
                                  {COURIER_OPTIONS.map((c) => (
                                    <option key={c.value} value={c.value}>{c.label}</option>
                                  ))}
                                </select>
                                <input
                                  defaultValue={o.tracking_number || ""}
                                  onChange={(e) => setTrackingDrafts((prev) => ({ ...prev, [o.id]: e.target.value }))}
                                  placeholder="e.g. AWB123456"
                                  className="w-24 rounded-lg px-2 py-1.5 text-xs"
                                  style={{ border: "1px solid #E5E7EB" }}
                                />
                              </div>
                              {(courierDrafts[o.id] ?? o.courier) === "other" && (
                                <input
                                  defaultValue={o.tracking_url || ""}
                                  onChange={(e) => setCustomUrlDrafts((prev) => ({ ...prev, [o.id]: e.target.value }))}
                                  placeholder="Paste tracking link"
                                  className="rounded-lg px-2 py-1.5 text-xs"
                                  style={{ border: "1px solid #E5E7EB" }}
                                />
                              )}
                              <div className="flex items-center gap-1.5">
                                <button onClick={() => saveTracking(o.id)} className="text-xs font-semibold px-2 py-1.5 rounded-lg" style={{ background: "#0B1F3A", color: "#fff" }}>Save</button>
                                {buildTrackingLink(o) && (
                                  <a href={buildTrackingLink(o)} target="_blank" rel="noreferrer" className="text-xs font-semibold px-2 py-1.5 rounded-lg" style={{ border: "1px solid #E5E7EB", color: "#0284c7" }}>Track ↗</a>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              {o.whatsapp_proof_url && (
                                <a href={o.whatsapp_proof_url} target="_blank" rel="noreferrer" title="View WhatsApp proof">
                                  <img
                                    src={o.whatsapp_proof_url}
                                    alt="WhatsApp proof"
                                    className="w-9 h-9 rounded-lg object-cover flex-shrink-0"
                                    style={{ border: "1px solid #E5E7EB" }}
                                  />
                                </a>
                              )}
                              <label
                                className={`rounded-lg cursor-pointer flex-shrink-0 flex items-center justify-center ${o.whatsapp_proof_url ? "text-xs font-semibold px-2 py-1.5" : "w-7 h-7"}`}
                                title={o.whatsapp_proof_url ? "Replace WhatsApp proof" : "Upload WhatsApp proof"}
                                style={{ border: "1px solid #E5E7EB", color: "#6B7280", opacity: proofUploading[o.id] ? 0.6 : 1 }}
                              >
                                {proofUploading[o.id] ? (
                                  o.whatsapp_proof_url ? "Uploading…" : <span className="text-[9px]">…</span>
                                ) : o.whatsapp_proof_url ? (
                                  "Replace"
                                ) : (
                                  <ImagePlus className="w-3.5 h-3.5" />
                                )}
                                <input
                                  type="file"
                                  accept="image/*"
                                  className="hidden"
                                  disabled={!!proofUploading[o.id]}
                                  onChange={(e) => { uploadWhatsappProof(o.id, e.target.files?.[0]); e.target.value = ""; }}
                                />
                              </label>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function OrdersTab({ orders, confirmedProfit, deliveredRevenue, returnedCount, initialStatusFilter = "all" }) {
  // Seeded from the dashboard card that was clicked (e.g. "Delivered" opens
  // here pre-filtered to delivered). Local state after that so the pills
  // below can change it without needing to talk back to the Dashboard.
  const [filter, setFilter] = useState(initialStatusFilter);
  const deliveredCount = orders.filter((o) => o.status === "delivered").length;
  const deliveryRate = orders.length ? Math.round((deliveredCount / orders.length) * 100) : 0;
  const FILTER_OPTIONS = ["all", "pending", "confirmation_pending", "confirmed", "customer_not_replying", "customer_not_picking_call", "wrong_number", "customer_cancelled_confirmation", "dispatched", "shipped", "delivered", "returned", "cancelled"];
  const filteredOrders = filter === "all" ? orders : orders.filter((o) => o.status === filter);

  return (
    <div>
      <div
        className="rounded-2xl p-6 text-white relative overflow-hidden"
        style={{ background: "linear-gradient(135deg,#0B1F3A,#0F2E52 55%,#00997a)" }}
      >
        <div
          className="absolute -right-10 -top-10 w-40 h-40 rounded-full"
          style={{ background: "radial-gradient(circle, rgba(0,200,150,0.35), transparent 70%)" }}
        />
        <h1 className="text-2xl font-extrabold relative" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
          Orders &amp; COD tracking
        </h1>
        <p className="text-sm text-white/70 mt-1 relative">Track your COD orders and their status as they move.</p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
        <StatCard label="Confirmed profit" value={confirmedProfit} prefix="AED " color="#00C896" icon={ShieldCheck} delay={0} />
        <StatCard label="Paid COD" value={deliveredRevenue} prefix="AED " color="#3B82F6" icon={CreditCard} delay={100} />
        <StatCard label="Delivery rate" value={deliveryRate} suffix="%" color="#00C896" icon={TrendingUp} delay={150} />
        <StatCard label="Returned" value={returnedCount} color="#EF4444" icon={RotateCcw} delay={200} />
      </div>

      {/* Status filter pills — jump here pre-selected from a dashboard card, or pick one manually */}
      <div className="flex flex-wrap gap-2 mt-6">
        {FILTER_OPTIONS.map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className="text-xs font-semibold px-3 py-1.5 rounded-full transition-all duration-150"
            style={
              filter === s
                ? { background: "#0B1F3A", color: "#fff" }
                : { background: "#F8FAFC", color: "#6B7280", border: "1px solid #E5E7EB" }
            }
          >
            {s === "all" ? "All" : ORDER_STATUS_LABELS[s]}
          </button>
        ))}
      </div>

      <div className="mt-4 rounded-2xl bg-white overflow-x-auto" style={{ border: "1px solid #E5E7EB", WebkitOverflowScrolling: "touch" }}>
        {filteredOrders.length === 0 ? (
          <div className="text-sm text-gray-400 py-10 text-center">
            {orders.length === 0 ? "No orders yet — place one from the Products tab." : "No orders with this status."}
          </div>
        ) : (
          <table className="w-full min-w-[950px] text-sm">
            <thead><tr className="text-left text-xs text-gray-400" style={{ borderBottom: "1px solid #F3F4F6" }}>
              <th className="px-4 py-3">Order</th><th className="px-4 py-3">Product</th><th className="px-4 py-3">Buyer/City</th>
              <th className="px-4 py-3">Sell</th><th className="px-4 py-3">Delivery</th><th className="px-4 py-3">Profit</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Tracking #</th><th className="px-4 py-3">WhatsApp Proof</th>
            </tr></thead>
            <tbody>
              {filteredOrders.map((o, i) => (
                <tr
                  key={o.id}
                  className="transition-colors duration-200 hover:bg-[#F5FBF9]"
                  style={{ borderBottom: "1px solid #FAFAFA", animation: `dashTabIn 0.4s ease-out ${i * 60}ms both` }}
                >
                  <td className="px-4 py-3 text-xs text-gray-500" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{o.id}</td>
                  <td className="px-4 py-3">{o.productName} <span className="text-gray-400">×{o.qty}</span></td>
                  <td className="px-4 py-3 text-gray-500">{o.buyer || "—"}{o.city ? ", " + o.city : ""}</td>
                  <td className="px-4 py-3" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>AED {o.sellPrice * o.qty}</td>
                  <td className="px-4 py-3 text-gray-400" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>AED {o.deliveryCharge || 0}</td>
                  <td className="px-4 py-3 font-semibold" style={{ color: "#00C896", fontFamily: "'Space Grotesk', sans-serif" }}>AED {(o.sellPrice - o.listPrice) * o.qty}</td>
                  <td className="px-4 py-3"><StatusPill status={o.status} /></td>
                  <td className="px-4 py-3 text-xs">
                    {o.trackingNumber ? (
                      buildTrackingLink(o) ? (
                        <a href={buildTrackingLink(o)} target="_blank" rel="noreferrer" className="font-semibold" style={{ color: "#0284c7" }}>
                          {o.trackingNumber} ↗
                        </a>
                      ) : (
                        <span className="text-gray-500">{o.trackingNumber}</span>
                      )
                    ) : (
                      <span className="text-gray-300">Not assigned yet</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {o.whatsappProofUrl ? (
                      <a href={o.whatsappProofUrl} target="_blank" rel="noreferrer" title="View WhatsApp proof">
                        <img
                          src={o.whatsappProofUrl}
                          alt="WhatsApp proof"
                          className="w-9 h-9 rounded-lg object-cover"
                          style={{ border: "1px solid #E5E7EB" }}
                        />
                      </a>
                    ) : (
                      <span className="text-xs text-gray-300">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function WalletTab({ confirmedProfit, pending, notify }) {
  const [amount, setAmount] = useState("");
  const inTransit = pending.reduce((s, o) => s + (o.sellPrice - o.listPrice) * o.qty, 0);
  const requestPayout = () => {
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) { notify("Enter a valid amount."); return; }
    if (amt > confirmedProfit) { notify("Amount exceeds available balance."); return; }
    notify("Payout of AED " + amt + " requested — demo only, no real transfer.");
    setAmount("");
  };
  return (
    <div>
      <h1 className="text-2xl font-extrabold" style={{ color: "#0B1F3A", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Wallet &amp; payouts</h1>
      <p className="text-sm text-gray-500 mt-1">Your available balance is calculated from delivered COD orders, minus product cost.</p>
      <div className="grid sm:grid-cols-3 gap-4 mt-6">
        <StatCard label="Available balance" value={confirmedProfit} prefix="AED " color="#00C896" />
        <StatCard label="In transit (pending)" value={inTransit} prefix="AED " color="#F8B400" />
        <StatCard label="Lifetime payouts" value={0} prefix="AED " />
      </div>
      <div className="mt-8 rounded-2xl p-6 bg-white" style={{ border: "1px solid #E5E7EB" }}>
        <div className="font-bold text-sm mb-1" style={{ color: "#111827", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Request payout</div>
        <p className="text-xs text-gray-400 mb-4">Payouts are sent weekly to your registered bank account (demo only — no real transfer occurs).</p>
        <div className="flex flex-col sm:flex-row gap-3">
          <input type="number" placeholder="Amount (AED)" value={amount} onChange={(e) => setAmount(e.target.value)} className="flex-1 rounded-lg px-3 py-2.5 text-sm" style={{ border: "1px solid #E5E7EB" }} />
          <button onClick={requestPayout} className="text-sm font-semibold px-6 py-2.5 rounded-full text-white" style={{ background: "#0B1F3A" }}>Request payout</button>
        </div>
      </div>
    </div>
  );
}

function DetailRow({ icon: Icon, label, value, color, delay = 0 }) {
  return (
    <div
      className="flex items-start gap-3 py-3 transition-all duration-300"
      style={{ borderBottom: "1px solid #F3F4F6", animation: `dashTabIn 0.4s ease-out both`, animationDelay: `${delay}ms` }}
    >
      <div
        className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
        style={{ background: color + "1A" }}
      >
        <Icon className="w-4 h-4" style={{ color }} />
      </div>
      <div className="min-w-0">
        <div className="text-xs text-gray-500">{label}</div>
        <div className="mt-0.5 text-sm font-semibold truncate" style={{ color: value === "—" ? "#C0C5CE" : "#111827" }}>{value}</div>
      </div>
    </div>
  );
}

function DetailSection({ title, icon: Icon, color, rows, delay = 0 }) {
  return (
    <div
      className="rounded-2xl p-6 bg-white transition-all duration-500 hover:-translate-y-0.5"
      style={{ border: "1px solid #E5E7EB", boxShadow: "0 1px 2px rgba(16,24,40,0.04)", animation: "dashTabIn 0.45s ease-out both", animationDelay: `${delay}ms` }}
    >
      <div className="flex items-center gap-2.5 mb-1">
        <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${color}, ${color}CC)`, boxShadow: `0 6px 14px ${color}40` }}>
          <Icon className="w-4 h-4 text-white" />
        </div>
        <div className="font-bold text-sm" style={{ color: "#111827", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{title}</div>
      </div>
      <div>
        {rows.map((r, i) => (
          <DetailRow key={r.label} icon={r.icon} label={r.label} value={r.value} color={color} delay={i * 60} />
        ))}
      </div>
    </div>
  );
}

function SettingsTab({ session, notify }) {
  const initials = (session.name || session.email || "?")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0])
    .join("")
    .toUpperCase();

  const personal = [
    { icon: User, label: "Full name", value: session.name || "—" },
    { icon: Mail, label: "Email", value: session.email || "—" },
    { icon: Phone, label: "Mobile", value: session.phone || "—" },
    { icon: MessageCircle, label: "WhatsApp", value: session.whatsapp || "—" },
  ];
  const store = [
    { icon: Store, label: "Store name", value: session.storeName || session.company || "—" },
    { icon: Globe2, label: "Country", value: session.country || "—" },
    { icon: TrendingUp, label: "Monthly avg. orders", value: session.monthlyOrders || "—" },
  ];

  // Bank details are editable — everything else on this page still isn't.
  // savedBank reflects what's actually in Supabase; bankForm is the draft
  // being edited. Saving writes to profiles by email, so Admin's Orders and
  // Sellers views (which read from the same table) pick up the change too.
  const [editingBank, setEditingBank] = useState(false);
  const [savingBank, setSavingBank] = useState(false);
  const [savedBank, setSavedBank] = useState({
    bankName: session.bankName || "", accountTitle: session.accountTitle || "",
    accountNumber: session.accountNumber || "", iban: session.iban || "",
  });
  const [bankForm, setBankForm] = useState(savedBank);

  const startEditBank = () => { setBankForm(savedBank); setEditingBank(true); };
  const cancelEditBank = () => { setEditingBank(false); setBankForm(savedBank); };
  const updateBankField = (k) => (e) => setBankForm((f) => ({ ...f, [k]: e.target.value }));

  const saveBank = async () => {
    if (!bankForm.bankName || !bankForm.accountTitle || !bankForm.accountNumber || !bankForm.iban) {
      notify && notify("Please fill in all bank details.");
      return;
    }
    setSavingBank(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        bank_name: bankForm.bankName, account_title: bankForm.accountTitle,
        account_number: bankForm.accountNumber, iban: bankForm.iban,
      })
      .eq("email", session.email);
    setSavingBank(false);
    if (error) { notify && notify("Could not save bank details."); return; }
    setSavedBank(bankForm);
    setEditingBank(false);
    notify && notify("Bank details updated.");
  };

  const banking = [
    { icon: Landmark, label: "Bank name", value: savedBank.bankName || "—" },
    { icon: User, label: "Account title", value: savedBank.accountTitle || "—" },
    { icon: Hash, label: "Account number", value: savedBank.accountNumber || "—" },
    { icon: Hash, label: "IBAN", value: savedBank.iban || "—" },
  ];

  return (
    <div>
      {/* Profile header banner, matching the dashboard's visual language */}
      <div className="relative overflow-hidden rounded-3xl px-7 py-8 mb-7" style={{ background: "linear-gradient(120deg,#0B1F3A 0%,#0F2E52 55%,#0B7A5E 130%)" }}>
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{ backgroundImage: "radial-gradient(circle, #ffffff 1px, transparent 1px)", backgroundSize: "18px 18px" }}
        />
        <div className="absolute -top-16 -right-10 w-64 h-64 rounded-full opacity-30 blur-3xl" style={{ background: "#00C896", animation: "blobMove 9s ease-in-out infinite" }} />
        <div className="absolute -bottom-24 left-1/3 w-72 h-72 rounded-full opacity-20 blur-3xl" style={{ background: "#F8B400", animation: "blobMove 11s ease-in-out infinite reverse" }} />

        <div className="relative flex items-center gap-5">
          <div
            className="w-20 h-20 rounded-2xl flex items-center justify-center flex-shrink-0 text-2xl font-extrabold text-white"
            style={{ background: "linear-gradient(135deg,#00C896,#00a67e)", boxShadow: "0 10px 24px rgba(0,200,150,0.4)", fontFamily: "'Space Grotesk', sans-serif" }}
          >
            {initials}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                {session.name || "Seller"}
              </h1>
              <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full" style={{ background: "rgba(0,200,150,0.18)", color: "#7FE8C9" }}>
                <BadgeCheck className="w-3 h-3" /> Verified Seller
              </span>
            </div>
            <p className="mt-1 text-sm text-white/60">{session.storeName || session.company || "Your store"} · {session.country || "UAE"}</p>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        <DetailSection title="Personal information" icon={User} color="#3B82F6" rows={personal} delay={0} />
        <DetailSection title="Store information" icon={Store} color="#F8B400" rows={store} delay={80} />
        <div className="lg:col-span-2">
          {!editingBank ? (
            <div
              className="rounded-2xl p-6 bg-white transition-all duration-500 hover:-translate-y-0.5"
              style={{ border: "1px solid #E5E7EB", boxShadow: "0 1px 2px rgba(16,24,40,0.04)", animation: "dashTabIn 0.45s ease-out both", animationDelay: "160ms" }}
            >
              <div className="flex items-center justify-between gap-2 mb-1">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg,#8B5CF6,#8B5CF6CC)", boxShadow: "0 6px 14px #8B5CF640" }}>
                    <Landmark className="w-4 h-4 text-white" />
                  </div>
                  <div className="font-bold text-sm" style={{ color: "#111827", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Banking information</div>
                </div>
                <button
                  onClick={startEditBank}
                  className="text-xs font-semibold px-3 py-1.5 rounded-full transition-transform hover:scale-105"
                  style={{ background: "rgba(139,92,246,0.12)", color: "#8B5CF6" }}
                >
                  Edit
                </button>
              </div>
              <div>
                {banking.map((r, i) => (
                  <DetailRow key={r.label} icon={r.icon} label={r.label} value={r.value} color="#8B5CF6" delay={i * 60} />
                ))}
              </div>
            </div>
          ) : (
            <div
              className="rounded-2xl p-6 bg-white"
              style={{ border: "1px solid #E5E7EB", boxShadow: "0 1px 2px rgba(16,24,40,0.04)" }}
            >
              <div className="flex items-center gap-2.5 mb-4">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg,#8B5CF6,#8B5CF6CC)", boxShadow: "0 6px 14px #8B5CF640" }}>
                  <Landmark className="w-4 h-4 text-white" />
                </div>
                <div className="font-bold text-sm" style={{ color: "#111827", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Edit banking information</div>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <LightField label="Bank name" value={bankForm.bankName} onChange={updateBankField("bankName")} />
                <LightField label="Account title" value={bankForm.accountTitle} onChange={updateBankField("accountTitle")} />
                <LightField label="Account number" value={bankForm.accountNumber} onChange={updateBankField("accountNumber")} />
                <LightField label="IBAN" value={bankForm.iban} onChange={updateBankField("iban")} />
              </div>
              <div className="flex items-center gap-2 mt-5">
                <button
                  onClick={saveBank}
                  disabled={savingBank}
                  className="text-sm font-semibold px-5 py-2.5 rounded-full text-white transition-transform hover:scale-105"
                  style={{ background: "linear-gradient(135deg,#00C896,#00a67e)", opacity: savingBank ? 0.6 : 1 }}
                >
                  {savingBank ? "Saving…" : "Save changes"}
                </button>
                <button
                  onClick={cancelEditBank}
                  disabled={savingBank}
                  className="text-sm font-semibold px-5 py-2.5 rounded-full"
                  style={{ border: "1px solid #E5E7EB", color: "#6B7280" }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <p className="text-xs text-gray-400 mt-5 px-1">Personal and store details aren't editable yet — only banking information can be updated for now.</p>
    </div>
  );
}

// Light-background input used on the Seller Details page (unlike Field,
// which is styled for the dark Auth page).
function LightField({ label, type = "text", value, onChange, placeholder }) {
  return (
    <div>
      <label className="text-xs text-gray-500">{label}</label>
      <input
        type={type} value={value} onChange={onChange} placeholder={placeholder}
        className="mt-1 w-full rounded-xl px-4 py-2.5 text-sm outline-none"
        style={{ background: "#F8FAFC", border: "1px solid #E5E7EB", color: "#111827" }}
      />
    </div>
  );
}

function AdminTab({ catalog, sellerCount, notify, onCatalogChanged, onReorder }) {
  const [form, setForm] = useState({ name: "", category: "", cost: "", sell: "", emoji: "📦", description: "", images: [], stock: "", assignedSellers: [], isPremium: false });
  // "Import from link" — Admin pastes a product URL from Temu / Noon / Amazon /
  // Wavebit / a dropshipping site, we fetch the page server-side (Edge
  // Function "fetch-product") and pull out title/price/pictures/description
  // to prefill the form below. Admin still reviews everything (and sets
  // Cost + Category, which the source page never tells us) before saving.
  const IMPORT_SOURCES = ["Amazon", "Noon", "Temu", "MyZamil", "Arabia Dropshipping", "Wavebit", "Other"];
  const [importSource, setImportSource] = useState("Amazon");
  const [importUrl, setImportUrl] = useState("");
  const [importLoading, setImportLoading] = useState(false);
  const [importError, setImportError] = useState("");
  const fetchProductFromLink = async () => {
    if (!importUrl.trim()) { setImportError("Paste a product link first."); return; }
    setImportLoading(true);
    setImportError("");
    const { data, error } = await supabase.functions.invoke("fetch-product", { body: { url: importUrl.trim() } });
    setImportLoading(false);
    if (error || !data?.ok) {
      setImportError((data && data.error) || "Could not read that link. Please fill the form in manually.");
      return;
    }
    setForm((f) => ({
      ...f,
      name: data.title || f.name,
      description: data.description || f.description,
      sell: data.price != null ? String(data.price) : f.sell,
      images: (data.images || []).slice(0, 4),
      sourceUrl: importUrl.trim(),
    }));
    notify(`Pulled details from ${data.sourceHost || importSource} — check them below, add Cost + Category, then save.`);
  };
  // Prefill from the "EmirateFulfil Product Importer" browser extension —
  // it scrapes a product page (Temu, and later Noon/Amazon) right in the
  // seller's own browser (so no bot-block like the server-side link-fetch
  // above), then opens this Admin page with the scraped data attached as
  // ?import=<base64 JSON>. We pick that up here, prefill the same form the
  // link-fetch uses, then strip the param so a refresh doesn't reapply it.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const raw = params.get("import");
    if (!raw) return;
    try {
      const decoded = JSON.parse(decodeURIComponent(escape(atob(decodeURIComponent(raw)))));
      setForm((f) => ({
        ...f,
        name: decoded.title || f.name,
        description: decoded.description || f.description,
        sell: decoded.price != null ? String(decoded.price) : f.sell,
        images: (decoded.images || []).slice(0, 4),
        sourceUrl: decoded.url || f.sourceUrl,
      }));
      notify(`Pulled details from ${decoded.sourceHost || "the extension"} — check them below, add Cost + Category, then save.`);
    } catch {
      // malformed/old import param — ignore quietly
    } finally {
      params.delete("import");
      const clean = window.location.pathname + (params.toString() ? `?${params}` : "");
      window.history.replaceState(null, "", clean);
    }
  }, []); // eslint-disable-line
  const toggleFormSeller = (email) => setForm((f) => ({ ...f, assignedSellers: f.assignedSellers.includes(email) ? f.assignedSellers.filter((e) => e !== email) : [...f.assignedSellers, email] }));
  const [formImageUploading, setFormImageUploading] = useState(false);
  const uploadFormImages = async (e) => {
    const files = Array.from(e.target.files || []);
    e.target.value = "";
    if (!files.length) return;
    const room = 4 - (form.images || []).length;
    if (room <= 0) { notify("You can add up to 4 pictures per product."); return; }
    setFormImageUploading(true);
    const uploaded = [];
    for (const file of files.slice(0, room)) {
      const { url, error } = await uploadProductImage(file);
      if (error) { notify(error); continue; }
      if (url) uploaded.push(url);
    }
    setFormImageUploading(false);
    if (uploaded.length) setForm((f) => ({ ...f, images: [...(f.images || []), ...uploaded] }));
  };
  const removeFormImage = (idx) => setForm((f) => ({ ...f, images: (f.images || []).filter((_, i) => i !== idx) }));
  const reorderFormImages = (fromIdx, toIdx) => setForm((f) => {
    const imgs = [...(f.images || [])];
    if (fromIdx === toIdx || fromIdx < 0 || toIdx < 0 || fromIdx >= imgs.length || toIdx >= imgs.length) return f;
    const [moved] = imgs.splice(fromIdx, 1);
    imgs.splice(toIdx, 0, moved);
    return { ...f, images: imgs };
  });
  const [allOrders, setAllOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [sellers, setSellers] = useState([]);
  const [sellersLoading, setSellersLoading] = useState(true);
  const [sellerSearch, setSellerSearch] = useState("");
  // Which seller's invoice-builder modal is open (create + history) — null when closed.
  const [invoiceManagerSeller, setInvoiceManagerSeller] = useState(null);
  // Sellers Admin has marked as "Premium" — a plain badge/status, doesn't
  // affect which products they see (that's the per-product "Visible to" list).
  const [premiumSellerEmails, setPremiumSellerEmails] = useState([]);
  const [premiumTogglingEmail, setPremiumTogglingEmail] = useState(null);
  const togglePremiumSeller = async (email) => {
    setPremiumTogglingEmail(email);
    const isPremium = premiumSellerEmails.includes(email);
    const next = isPremium ? premiumSellerEmails.filter((e) => e !== email) : [...premiumSellerEmails, email];
    const { error } = await savePremiumSellerEmails(next);
    setPremiumTogglingEmail(null);
    if (error) { notify("Could not update premium status."); return; }
    setPremiumSellerEmails(next);
    notify(isPremium ? "Premium badge removed for this seller." : "Seller marked as Premium.");
  };

  // Bulk visibility manager — pick a target once (All sellers / Premium /
  // one specific seller), then tick products in a simple checklist and each
  // one is assigned to that target immediately, instead of opening the
  // pencil-edit form product by product.
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkTarget, setBulkTarget] = useState("all"); // "all" | "premium" | a seller's email
  const [bulkSearch, setBulkSearch] = useState("");
  const [bulkTogglingId, setBulkTogglingId] = useState(null);
  const isProductInBulkTarget = (p) => {
    if (bulkTarget === "all") return !(p.assignedSellerEmails || []).length && !p.isPremium;
    if (bulkTarget === "premium") return !!p.isPremium;
    return (p.assignedSellerEmails || []).includes(bulkTarget);
  };
  const toggleBulkTarget = async (p) => {
    const already = isProductInBulkTarget(p);
    let patch = null;
    if (bulkTarget === "all") {
      // "All sellers" only supports turning a product public — there's no
      // meaningful "remove from everyone" here, so unchecking is a no-op
      // (use the Premium or a specific-seller target to restrict it instead).
      if (already) { notify("To restrict this product, pick Premium or a specific seller above instead."); return; }
      patch = { assigned_seller_emails: [], is_premium: false };
    } else if (bulkTarget === "premium") {
      patch = { is_premium: !already };
    } else {
      const emails = p.assignedSellerEmails || [];
      const next = already ? emails.filter((e) => e !== bulkTarget) : [...emails, bulkTarget];
      patch = { assigned_seller_emails: next };
    }
    setBulkTogglingId(p.id);
    const { error } = await supabase.from("products").update(patch).eq("id", p.id);
    setBulkTogglingId(null);
    if (error) { notify("Could not update visibility."); return; }
    onCatalogChanged();
  };

  // "Select all" — applies the current target to every product in the
  // (search-filtered) list at once, instead of ticking one by one. Toggles
  // back off the same way, except for "All sellers" where unchecking has no
  // meaningful effect (same rule as the single-product checkbox above).
  const [bulkSelectAllLoading, setBulkSelectAllLoading] = useState(false);
  const buildBulkPatch = (p, turningOn) => {
    if (bulkTarget === "all") return { assigned_seller_emails: [], is_premium: false };
    if (bulkTarget === "premium") return { is_premium: turningOn };
    const emails = p.assignedSellerEmails || [];
    const next = turningOn ? [...emails, bulkTarget] : emails.filter((e) => e !== bulkTarget);
    return { assigned_seller_emails: next };
  };
  const toggleSelectAllBulk = async (filteredProducts, allCurrentlySelected) => {
    if (filteredProducts.length === 0) return;
    const turningOn = !allCurrentlySelected;
    if (bulkTarget === "all" && !turningOn) {
      notify("To restrict these products, pick Premium or a specific seller above instead.");
      return;
    }
    const targets = filteredProducts.filter((p) => isProductInBulkTarget(p) !== turningOn);
    if (targets.length === 0) return;

    // Safety confirmation — this can change a lot of products in one click,
    // so make sure that's really the intent before writing to the database.
    if (targets.length > 5) {
      const targetLabel = bulkTarget === "all" ? "All sellers (public)" : bulkTarget === "premium" ? "Premium" : bulkTarget;
      const ok = window.confirm(
        `${turningOn ? "Mark" : "Unmark"} ${targets.length} product${targets.length === 1 ? "" : "s"} as "${targetLabel}"?\n\nThis updates them all right away — this can't be undone in one click.`
      );
      if (!ok) return;
    }

    setBulkSelectAllLoading(true);
    const results = await Promise.all(
      targets.map((p) => supabase.from("products").update(buildBulkPatch(p, turningOn)).eq("id", p.id))
    );
    setBulkSelectAllLoading(false);
    const failed = results.filter((r) => r.error).length;
    onCatalogChanged();
    if (failed) notify(`Updated ${targets.length - failed} of ${targets.length} — ${failed} failed, try again.`);
    else notify(turningOn ? `Marked ${targets.length} product${targets.length === 1 ? "" : "s"}.` : `Unmarked ${targets.length} product${targets.length === 1 ? "" : "s"}.`);
  };

  // Reorder products — drag a row up/down to change the order everyone
  // (sellers + the buyer-facing grid) sees them in. Plain HTML5 drag & drop,
  // no library needed. Search only filters what's visible in this admin
  // list; dragging is disabled while a search is active because moving a
  // row within a filtered subset can't unambiguously map to a position in
  // the full list.
  const [reorderOpen, setReorderOpen] = useState(false);
  const [reorderSearch, setReorderSearch] = useState("");
  const [dragIndex, setDragIndex] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);
  const [reorderSaving, setReorderSaving] = useState(false);
  const moveProduct = async (fromIndex, toIndex) => {
    if (fromIndex === toIndex || fromIndex == null || toIndex == null) return;
    const next = catalog.slice();
    const [moved] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, moved);
    setReorderSaving(true);
    await onReorder(next);
    setReorderSaving(false);
  };

  // Site logo: pick a picture from your computer, it's uploaded to Supabase
  // Storage and saved as the shared logo everyone sees (navbar, footer,
  // login page, dashboard sidebar).
  const { logoUrl, setLogoUrl } = useContext(LogoContext);
  const [logoUploading, setLogoUploading] = useState(false);
  const uploadLogo = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow picking the same file again later
    if (!file) return;
    if (!file.type.startsWith("image/")) { notify("Please choose an image file."); return; }
    setLogoUploading(true);
    const ext = file.name.split(".").pop() || "png";
    const path = `logo-${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage.from("public-assets").upload(path, file, { upsert: true, cacheControl: "3600" });
    if (upErr) { notify("Could not upload the picture."); setLogoUploading(false); return; }
    const { data } = supabase.storage.from("public-assets").getPublicUrl(path);
    const url = data?.publicUrl;
    const { error: dbErr } = await supabase.from("app_settings").upsert({ key: "logo_url", value: url });
    setLogoUploading(false);
    if (dbErr) { notify("Uploaded, but could not save it as the logo."); return; }
    setLogoUrl(url);
    notify("Logo updated — everyone sees the new picture now.");
  };
  const removeLogo = async () => {
    await supabase.from("app_settings").upsert({ key: "logo_url", value: null });
    setLogoUrl(null);
    notify("Logo removed — back to the default icon.");
  };

  const loadAllOrders = async () => {
    setOrdersLoading(true);
    const { data, error } = await supabase.from("orders").select("*").order("created_at", { ascending: false });
    if (!error) setAllOrders(data || []);
    setOrdersLoading(false);
  };
  // Every seller who has ever signed up, newest first — this is what powers
  // the Sellers table below (name, email, phone, company, country, joined date).
  const loadSellers = async () => {
    setSellersLoading(true);
    const { data, error } = await supabase.from("profiles").select("*").order("created_at", { ascending: false });
    if (!error) setSellers(data || []);
    setSellersLoading(false);
  };
  useEffect(() => {
    loadAllOrders();
    loadSellers();
    fetchPremiumSellerEmails().then(setPremiumSellerEmails);
  }, []); // eslint-disable-line

  // Approve a newly-signed-up seller (lets them log in), or deactivate/reactivate
  // an existing one (blocks/unblocks their next login) — Admin only.
  const setSellerApproval = async (id, approval_status) => {
    const { error } = await supabase.from("profiles").update({ approval_status }).eq("id", id);
    if (error) { notify("Could not update this seller's status."); return; }
    setSellers(sellers.map((s) => (s.id === id ? { ...s, approval_status } : s)));
    notify(
      approval_status === "approved" ? "Seller approved — they can now log in." :
      approval_status === "deactivated" ? "Seller deactivated — they can no longer log in." :
      "Seller status updated."
    );
  };

  const addProduct = async (e) => {
    e.preventDefault();
    if (!form.name || !form.cost || !form.sell) { notify("Fill in name, cost and sell price."); return; }
    const id = "p" + Date.now().toString().slice(-8);
    const images = form.images || [];
    const { error } = await supabase.from("products").insert({
      id, name: form.name, category: form.category || "General",
      cost: parseFloat(form.cost), sell: parseFloat(form.sell), emoji: form.emoji || "📦",
      description: form.description || null, images, image_url: images[0] || null,
      stock: Math.max(0, parseInt(form.stock, 10) || 0),
      assigned_seller_emails: form.assignedSellers,
      is_premium: form.isPremium,
      source_url: form.sourceUrl || null,
    });
    if (error) { notify("Could not add product."); return; }
    setForm({ name: "", category: "", cost: "", sell: "", emoji: "📦", description: "", images: [], stock: "", assignedSellers: [], isPremium: false });
    setImportUrl(""); setImportError("");
    notify(form.isPremium ? "Premium product added — only visible to Premium sellers." : (form.assignedSellers.length ? `Product added — only visible to ${form.assignedSellers.length} seller(s).` : "Product added to catalog."));
    onCatalogChanged();
  };

  const deleteProduct = async (id) => {
    await supabase.from("products").delete().eq("id", id);
    notify("Product removed.");
    onCatalogChanged();
  };

  // Inline product editing — click Edit on a card to turn it into a small
  // form, Save writes the changes straight to Supabase.
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState(null);
  const [editImageUploading, setEditImageUploading] = useState(false);
  const startEdit = (p) => {
    setEditingId(p.id);
    const images = Array.isArray(p.images) && p.images.length ? p.images : (p.image_url ? [p.image_url] : []);
    setEditForm({ name: p.name || "", category: p.category || "", cost: p.cost, sell: p.sell, emoji: p.emoji || "📦", description: p.description || "", images, stock: p.stock ?? 0, assignedSellers: p.assignedSellerEmails || [], isPremium: !!p.isPremium, sourceUrl: p.sourceUrl || "" });
  };
  const toggleEditSeller = (email) => setEditForm((f) => ({ ...f, assignedSellers: f.assignedSellers.includes(email) ? f.assignedSellers.filter((e) => e !== email) : [...f.assignedSellers, email] }));
  const cancelEdit = () => { setEditingId(null); setEditForm(null); };
  const uploadEditImages = async (e) => {
    const files = Array.from(e.target.files || []);
    e.target.value = "";
    if (!files.length) return;
    const room = 4 - (editForm.images || []).length;
    if (room <= 0) { notify("You can add up to 4 pictures per product."); return; }
    setEditImageUploading(true);
    const uploaded = [];
    for (const file of files.slice(0, room)) {
      const { url, error } = await uploadProductImage(file);
      if (error) { notify(error); continue; }
      if (url) uploaded.push(url);
    }
    setEditImageUploading(false);
    if (uploaded.length) setEditForm((f) => ({ ...f, images: [...(f.images || []), ...uploaded] }));
  };
  const removeEditImage = (idx) => setEditForm((f) => ({ ...f, images: (f.images || []).filter((_, i) => i !== idx) }));
  // Drag-and-drop reordering of a product's pictures while editing — drag a
  // thumbnail onto another to move it to that position in the images array.
  const reorderEditImages = (fromIdx, toIdx) => setEditForm((f) => {
    const imgs = [...(f.images || [])];
    if (fromIdx === toIdx || fromIdx < 0 || toIdx < 0 || fromIdx >= imgs.length || toIdx >= imgs.length) return f;
    const [moved] = imgs.splice(fromIdx, 1);
    imgs.splice(toIdx, 0, moved);
    return { ...f, images: imgs };
  });
  const saveEdit = async (id) => {
    if (!editForm.name || editForm.cost === "" || editForm.sell === "") { notify("Fill in name, cost and sell price."); return; }
    const images = editForm.images || [];
    const { error } = await supabase.from("products").update({
      name: editForm.name, category: editForm.category || "General",
      cost: parseFloat(editForm.cost), sell: parseFloat(editForm.sell),
      emoji: editForm.emoji || "📦", description: editForm.description || null,
      images, image_url: images[0] || null,
      stock: Math.max(0, parseInt(editForm.stock, 10) || 0),
      assigned_seller_emails: editForm.assignedSellers || [],
      is_premium: !!editForm.isPremium,
      source_url: editForm.sourceUrl || null,
    }).eq("id", id);
    if (error) { console.error("Product save failed:", error); notify(`Could not save: ${error.message || "unknown error"}`); return; }
    notify("Product updated.");
    cancelEdit();
    onCatalogChanged();
  };

  // Reviews management — Admin can open a product's reviews, add new ones,
  // edit or delete existing ones. Loaded on demand per product.
  const [reviewsOpenId, setReviewsOpenId] = useState(null);
  const [reviewsByProduct, setReviewsByProduct] = useState({});
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [newReview, setNewReview] = useState({ name: "", rating: 5, body: "" });
  const [editingReviewId, setEditingReviewId] = useState(null);
  const [editReviewForm, setEditReviewForm] = useState(null);

  const toggleReviews = async (productId) => {
    if (reviewsOpenId === productId) { setReviewsOpenId(null); return; }
    setReviewsOpenId(productId);
    setNewReview({ name: "", rating: 5, body: "" });
    setEditingReviewId(null);
    if (!reviewsByProduct[productId]) {
      setReviewsLoading(true);
      const list = await fetchReviews(productId);
      setReviewsByProduct((prev) => ({ ...prev, [productId]: list }));
      setReviewsLoading(false);
    }
  };

  const addReview = async (productId) => {
    if (!newReview.name || !newReview.body) { notify("Fill in the reviewer name and review text."); return; }
    const { data, error } = await supabase.from("reviews").insert({
      product_id: productId, name: newReview.name, rating: Number(newReview.rating) || 5, body: newReview.body,
    }).select().single();
    if (error) { notify("Could not add review."); return; }
    const mapped = { id: data.id, name: data.name, rating: Number(data.rating), body: data.body, createdAt: data.created_at };
    setReviewsByProduct((prev) => ({ ...prev, [productId]: [mapped, ...(prev[productId] || [])] }));
    setNewReview({ name: "", rating: 5, body: "" });
    notify("Review added.");
  };

  const startEditReview = (r) => { setEditingReviewId(r.id); setEditReviewForm({ name: r.name, rating: r.rating, body: r.body }); };
  const cancelEditReview = () => { setEditingReviewId(null); setEditReviewForm(null); };
  const saveEditReview = async (productId, reviewId) => {
    if (!editReviewForm.name || !editReviewForm.body) { notify("Fill in the reviewer name and review text."); return; }
    const { error } = await supabase.from("reviews").update({
      name: editReviewForm.name, rating: Number(editReviewForm.rating) || 5, body: editReviewForm.body,
    }).eq("id", reviewId);
    if (error) { notify("Could not save changes."); return; }
    setReviewsByProduct((prev) => ({
      ...prev,
      [productId]: (prev[productId] || []).map((r) => (r.id === reviewId ? { ...r, name: editReviewForm.name, rating: Number(editReviewForm.rating) || 5, body: editReviewForm.body } : r)),
    }));
    cancelEditReview();
    notify("Review updated.");
  };
  const deleteReview = async (productId, reviewId) => {
    await supabase.from("reviews").delete().eq("id", reviewId);
    setReviewsByProduct((prev) => ({ ...prev, [productId]: (prev[productId] || []).filter((r) => r.id !== reviewId) }));
    notify("Review removed.");
  };

  // Pricing section text: editable copy of the homepage pricing plans, saved
  // as JSON in app_settings under "pricing_content". Loaded once on mount;
  // starts from the same defaults the homepage falls back to.
  const [pricingForm, setPricingForm] = useState(DEFAULT_PRICING);
  const [pricingSaving, setPricingSaving] = useState(false);
  useEffect(() => {
    supabase
      .from("app_settings")
      .select("value")
      .eq("key", "pricing_content")
      .maybeSingle()
      .then(({ data }) => {
        if (data?.value) {
          try {
            const parsed = JSON.parse(data.value);
            if (parsed?.plans?.length) setPricingForm(parsed);
          } catch { /* keep defaults if stored value is malformed */ }
        }
      });
  }, []);
  const updatePricingPlan = (idx, field, value) => {
    setPricingForm((f) => ({ ...f, plans: f.plans.map((p, i) => (i === idx ? { ...p, [field]: value } : p)) }));
  };
  const savePricing = async () => {
    setPricingSaving(true);
    const { error } = await supabase.from("app_settings").upsert({ key: "pricing_content", value: JSON.stringify(pricingForm) });
    setPricingSaving(false);
    if (error) { notify("Could not save the pricing section."); return; }
    notify("Pricing section updated — changes are live on the homepage.");
  };

  // Features comparison table: editable copy of the homepage's "Our
  // Features" plan-comparison table (Home → Features section), saved as
  // JSON in app_settings under "features_table_content" — chunked the same
  // way testimonials are, since headline + plans + rows can add up to more
  // than one row's column comfortably holds.
  const [featuresTableForm, setFeaturesTableForm] = useState(DEFAULT_FEATURES_TABLE);
  const [featuresTableSaving, setFeaturesTableSaving] = useState(false);
  useEffect(() => {
    (async () => {
      let raw = await loadChunkedSetting("features_table_content");
      if (!raw) {
        const { data } = await supabase.from("app_settings").select("value").eq("key", "features_table_content").maybeSingle();
        raw = data?.value || null;
      }
      if (!raw) return;
      try {
        const parsed = JSON.parse(raw);
        if (parsed?.plans?.length && parsed?.rows?.length) setFeaturesTableForm(parsed);
      } catch { /* keep defaults if stored value is malformed */ }
    })();
  }, []);
  const updateFeaturesPlan = (idx, field, value) => {
    setFeaturesTableForm((f) => ({ ...f, plans: f.plans.map((p, i) => (i === idx ? { ...p, [field]: value } : p)) }));
  };
  const updateFeaturesRow = (rowIdx, field, value) => {
    setFeaturesTableForm((f) => ({ ...f, rows: f.rows.map((r, i) => (i === rowIdx ? { ...r, [field]: value } : r)) }));
  };
  const updateFeaturesRowCell = (rowIdx, planIdx, value) => {
    setFeaturesTableForm((f) => ({
      ...f,
      rows: f.rows.map((r, i) => {
        if (i !== rowIdx) return r;
        const values = [...(r.values || [])];
        values[planIdx] = value;
        return { ...r, values };
      }),
    }));
  };
  const addFeaturesRow = () => {
    setFeaturesTableForm((f) => ({
      ...f,
      rows: [...f.rows, { label: "New feature", type: "check", values: f.plans.map(() => false) }],
    }));
  };
  const removeFeaturesRow = (rowIdx) => {
    setFeaturesTableForm((f) => ({ ...f, rows: f.rows.filter((_, i) => i !== rowIdx) }));
  };
  const saveFeaturesTable = async () => {
    setFeaturesTableSaving(true);
    const payload = JSON.stringify(featuresTableForm);
    const { error } = await saveChunkedSetting("features_table_content", payload);
    setFeaturesTableSaving(false);
    if (error) {
      console.error("Save features table failed:", error, "payload size:", payload.length);
      notify(error.message ? `Could not save the features table: ${error.message}` : "Could not save the features table.");
      return;
    }
    notify("Features section updated — changes are live on the homepage.");
  };

  // Customer reviews: editable copy of the homepage testimonials, saved as
  // JSON in app_settings under "testimonials_content" — split across
  // several rows via saveChunkedSetting/loadChunkedSetting since this JSON
  // (long quotes, Arabic names) can be bigger than one row comfortably holds.
  const [testimonialsForm, setTestimonialsForm] = useState(DEFAULT_TESTIMONIALS);
  const [testimonialsSaving, setTestimonialsSaving] = useState(false);
  useEffect(() => {
    (async () => {
      // Prefer the new chunked rows; fall back to the original single-row
      // value for sites that saved before this change.
      let raw = await loadChunkedSetting("testimonials_content");
      if (!raw) {
        const { data } = await supabase.from("app_settings").select("value").eq("key", "testimonials_content").maybeSingle();
        raw = data?.value || null;
      }
      if (!raw) return;
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length) setTestimonialsForm(parsed);
      } catch { /* keep defaults if stored value is malformed */ }
    })();
  }, []);
  const updateTestimonial = (idx, field, value) => {
    setTestimonialsForm((list) => list.map((t, i) => (i === idx ? { ...t, [field]: value } : t)));
  };
  const addTestimonial = () => {
    setTestimonialsForm((list) => [...list, { name: "", role: "", quote: "", rating: 5 }]);
  };
  const removeTestimonial = (idx) => {
    setTestimonialsForm((list) => list.filter((_, i) => i !== idx));
  };
  const saveTestimonials = async () => {
    setTestimonialsSaving(true);
    const payload = JSON.stringify(testimonialsForm);
    const { error } = await saveChunkedSetting("testimonials_content", payload);
    setTestimonialsSaving(false);
    if (error) {
      console.error("Save reviews failed:", error, "payload size:", payload.length);
      notify(error.message ? `Could not save the reviews: ${error.message}` : "Could not save the reviews.");
      return;
    }
    notify("Customer reviews updated — changes are live on the homepage.");
  };

  const sellerOrderCount = (email) => allOrders.filter((o) => o.seller_email === email).length;
  const filteredSellers = sellers.filter((s) => {
    const q = sellerSearch.trim().toLowerCase();
    if (!q) return true;
    return (s.email || "").toLowerCase().includes(q) || (s.name || "").toLowerCase().includes(q) || (s.company || "").toLowerCase().includes(q) || (s.store_name || "").toLowerCase().includes(q);
  });

  return (
    <div>
      <h1 className="text-2xl font-extrabold" style={{ color: "#0B1F3A", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Admin</h1>
      <p className="text-sm text-gray-500 mt-1">Manage the shared product catalog every seller sees, and track signups.</p>

      <div className="mt-6 rounded-2xl p-6" style={{ border: "1px solid #E5E7EB", background: "linear-gradient(135deg,#0B1F3A08,#00C89608)" }}>
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4" style={{ color: "#F8B400" }} />
          <h3 className="font-bold text-sm" style={{ color: "#0B1F3A" }}>Import product from a link</h3>
        </div>
        <p className="text-xs text-gray-500 mt-1">Paste a product page URL from Temu, Noon, Amazon, MyZamil, Arabia Dropshipping, Wavebit, etc. — we'll try to pull the title, price, pictures and description into the form below for you to review before saving.</p>
        <div className="mt-3 grid sm:grid-cols-6 gap-3 items-end">
          <div className="sm:col-span-1">
            <label className="text-xs text-gray-500">Source</label>
            <select value={importSource} onChange={(e) => setImportSource(e.target.value)} className="mt-1 w-full rounded-lg px-3 py-2 text-sm" style={{ border: "1px solid #E5E7EB" }}>
              {IMPORT_SOURCES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="sm:col-span-4">
            <label className="text-xs text-gray-500">Product link</label>
            <input value={importUrl} onChange={(e) => setImportUrl(e.target.value)} placeholder="https://…" className="mt-1 w-full rounded-lg px-3 py-2 text-sm" style={{ border: "1px solid #E5E7EB" }} />
          </div>
          <div className="sm:col-span-1">
            <button type="button" onClick={fetchProductFromLink} disabled={importLoading} className="w-full text-sm font-semibold py-2.5 rounded-full text-white disabled:opacity-60" style={{ background: "#0B1F3A" }}>
              {importLoading ? "Fetching…" : "Fetch"}
            </button>
          </div>
        </div>
        {importError && <p className="mt-2 text-xs font-medium" style={{ color: "#EF4444" }}>{importError} — no problem, just fill the form below in by hand.</p>}
        <p className="mt-2 text-[11px] text-gray-400">Some sites (especially Amazon and Temu) block automatic access — if fetching fails, add the details manually in the form below. Either way, always double-check Cost, Category and price before saving.</p>
      </div>

      <form onSubmit={addProduct} className="mt-6 rounded-2xl p-6 bg-white grid sm:grid-cols-6 gap-3 items-end" style={{ border: "1px solid #E5E7EB" }}>
        <div className="sm:col-span-2"><label className="text-xs text-gray-500">Product name</label><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="mt-1 w-full rounded-lg px-3 py-2 text-sm" style={{ border: "1px solid #E5E7EB" }} /></div>
        <div><label className="text-xs text-gray-500">Category</label><input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="mt-1 w-full rounded-lg px-3 py-2 text-sm" style={{ border: "1px solid #E5E7EB" }} /></div>
        <div><label className="text-xs text-gray-500">Cost (AED)</label><input type="number" value={form.cost} onChange={(e) => setForm({ ...form, cost: e.target.value })} className="mt-1 w-full rounded-lg px-3 py-2 text-sm" style={{ border: "1px solid #E5E7EB" }} /></div>
        <div><label className="text-xs text-gray-500">Sell (AED)</label><input type="number" value={form.sell} onChange={(e) => setForm({ ...form, sell: e.target.value })} className="mt-1 w-full rounded-lg px-3 py-2 text-sm" style={{ border: "1px solid #E5E7EB" }} /></div>
        <div><label className="text-xs text-gray-500">Stock quantity</label><input type="number" min="0" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} className="mt-1 w-full rounded-lg px-3 py-2 text-sm" style={{ border: "1px solid #E5E7EB" }} /></div>
        <div><label className="text-xs text-gray-500">Emoji (fallback)</label><input value={form.emoji} onChange={(e) => setForm({ ...form, emoji: e.target.value })} className="mt-1 w-full rounded-lg px-3 py-2 text-sm" style={{ border: "1px solid #E5E7EB" }} /></div>
        <div className="sm:col-span-6 flex items-center gap-3 flex-wrap">
          {(form.images || []).map((url, idx) => (
            <div
              key={idx}
              draggable
              onDragStart={(e) => { e.dataTransfer.effectAllowed = "move"; e.dataTransfer.setData("text/plain", String(idx)); }}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => { e.preventDefault(); reorderFormImages(Number(e.dataTransfer.getData("text/plain")), idx); }}
              title="Drag to reorder"
              className="relative w-14 h-14 rounded-xl overflow-hidden flex-shrink-0 cursor-move"
              style={{ border: "1px solid #E5E7EB" }}
            >
              <img src={url} alt="" className="w-full h-full object-cover" draggable={false} />
              <button type="button" onClick={() => removeFormImage(idx)} title="Remove this picture" className="absolute top-0 right-0 w-5 h-5 flex items-center justify-center text-white text-xs" style={{ background: "rgba(0,0,0,0.55)" }}>×</button>
            </div>
          ))}
          {(form.images || []).length === 0 && (
            <div className="w-14 h-14 rounded-xl overflow-hidden flex items-center justify-center flex-shrink-0" style={{ background: "#F8FAFC", border: "1px solid #E5E7EB" }}>
              <ProductThumb product={form} size={26} />
            </div>
          )}
          {(form.images || []).length < 4 && (
            <label className="text-sm font-semibold px-4 py-2 rounded-full cursor-pointer" style={{ border: "1px solid #E5E7EB", color: "#0B1F3A", opacity: formImageUploading ? 0.6 : 1 }}>
              {formImageUploading ? "Uploading…" : "Upload pictures (up to 4)"}
              <input type="file" accept="image/*" multiple onChange={uploadFormImages} disabled={formImageUploading} className="hidden" />
            </label>
          )}
          <span className="text-xs text-gray-400">{(form.images || []).length}/4</span>
        </div>
        <div className="sm:col-span-6">
          <label className="text-xs text-gray-500">Visible to</label>
          <div className="mt-1 flex items-center gap-2 flex-wrap">
            <label className="text-xs font-semibold flex items-center gap-1.5 px-3 py-1.5 rounded-full cursor-pointer" style={form.assignedSellers.length === 0 ? { background: "#0B1F3A", color: "#fff" } : { border: "1px solid #E5E7EB", color: "#6B7280" }}>
              <input type="checkbox" className="hidden" checked={form.assignedSellers.length === 0} onChange={() => setForm((f) => ({ ...f, assignedSellers: [] }))} />
              All sellers
            </label>
            {sellers.map((s) => (
              <label key={s.id} className="text-xs font-medium flex items-center gap-1.5 px-3 py-1.5 rounded-full cursor-pointer" style={form.assignedSellers.includes(s.email) ? { background: "#F8B400", color: "#04140f" } : { border: "1px solid #E5E7EB", color: "#6B7280" }}>
                <input type="checkbox" className="hidden" checked={form.assignedSellers.includes(s.email)} onChange={() => toggleFormSeller(s.email)} />
                {s.email}
              </label>
            ))}
          </div>
          <p className="mt-1 text-[11px] text-gray-400">{form.assignedSellers.length === 0 ? "This product will be visible to every seller." : `Only visible to ${form.assignedSellers.length} selected seller(s).`}</p>
        </div>
        <div className="sm:col-span-6">
          <label className="text-xs font-semibold flex items-center gap-1.5 px-3 py-1.5 rounded-full cursor-pointer w-fit" style={form.isPremium ? { background: "#F8B400", color: "#04140f" } : { border: "1px solid #E5E7EB", color: "#6B7280" }}>
            <input type="checkbox" className="hidden" checked={form.isPremium} onChange={() => setForm((f) => ({ ...f, isPremium: !f.isPremium }))} />
            <Sparkles className="w-3.5 h-3.5" /> Premium product
          </label>
          <p className="mt-1 text-[11px] text-gray-400">{form.isPremium ? "Only shown to sellers marked Premium (see the Sellers table below)." : "Not marked Premium — visible to all sellers per the setting above."}</p>
        </div>
        <div className="sm:col-span-6"><label className="text-xs text-gray-500">Description (shown on the product's page)</label><textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="mt-1 w-full rounded-lg px-3 py-2 text-sm" style={{ border: "1px solid #E5E7EB" }} /></div>
        <button className="sm:col-span-6 text-sm font-semibold py-2.5 rounded-full text-white" style={{ background: "#0B1F3A" }}>+ Add product to catalog</button>
      </form>

      <div className="mt-8 rounded-2xl p-5 bg-white" style={{ border: "1px solid #E5E7EB" }}>
        <button onClick={() => setBulkOpen((v) => !v)} className="w-full flex items-center justify-between text-left">
          <span className="text-sm font-semibold flex items-center gap-2" style={{ color: "#0B1F3A" }}>
            <BadgeCheck className="w-4 h-4" /> Bulk visibility manager
          </span>
          <ChevronDown className="w-4 h-4 transition-transform" style={{ transform: bulkOpen ? "rotate(180deg)" : "none", color: "#6B7280" }} />
        </button>
        <p className="mt-1 text-[11px] text-gray-400">Pick who below, then tick products in the list — each one is assigned to that group right away, no need to open Edit on every product.</p>

        {bulkOpen && (
          <div className="mt-4">
            <label className="text-xs text-gray-500">Who should see the ticked products?</label>
            <div className="mt-1 flex items-center gap-2 flex-wrap">
              <button
                onClick={() => setBulkTarget("all")}
                className="text-xs font-semibold flex items-center gap-1.5 px-3 py-1.5 rounded-full"
                style={bulkTarget === "all" ? { background: "#0B1F3A", color: "#fff" } : { border: "1px solid #E5E7EB", color: "#6B7280" }}
              >
                🌐 All sellers
              </button>
              <button
                onClick={() => setBulkTarget("premium")}
                className="text-xs font-semibold flex items-center gap-1.5 px-3 py-1.5 rounded-full"
                style={bulkTarget === "premium" ? { background: "#F8B400", color: "#04140f" } : { border: "1px solid #E5E7EB", color: "#6B7280" }}
              >
                <Sparkles className="w-3.5 h-3.5" /> Premium
              </button>
              {sellers.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setBulkTarget(s.email)}
                  className="text-xs font-medium px-3 py-1.5 rounded-full"
                  style={bulkTarget === s.email ? { background: "#F8B400", color: "#04140f" } : { border: "1px solid #E5E7EB", color: "#6B7280" }}
                >
                  {s.email}
                </button>
              ))}
            </div>
            <p className="mt-1.5 text-[11px] text-gray-400">
              {bulkTarget === "all" && "Ticking a product makes it public to every seller and clears Premium/seller-only restrictions."}
              {bulkTarget === "premium" && "Ticking a product marks it Premium — only visible to sellers marked Premium in the Sellers table."}
              {bulkTarget !== "all" && bulkTarget !== "premium" && `Ticking a product adds ${bulkTarget} to its allowed sellers (other sellers already assigned stay assigned too).`}
            </p>

            <input
              value={bulkSearch}
              onChange={(e) => setBulkSearch(e.target.value)}
              placeholder="Search products…"
              className="mt-3 w-full rounded-lg px-3 py-2 text-sm"
              style={{ border: "1px solid #E5E7EB" }}
            />

            {(() => {
              const filteredBulkProducts = catalog.filter((p) => p.name.toLowerCase().includes(bulkSearch.trim().toLowerCase()));
              const selectedCount = filteredBulkProducts.filter(isProductInBulkTarget).length;
              const allSelected = filteredBulkProducts.length > 0 && selectedCount === filteredBulkProducts.length;
              return (
                <>
                  <div className="mt-2 flex items-center justify-between px-1">
                    <label className="flex items-center gap-2 text-xs font-medium cursor-pointer select-none" style={{ color: "#374151" }}>
                      <input
                        type="checkbox"
                        checked={allSelected}
                        ref={(el) => { if (el) el.indeterminate = selectedCount > 0 && !allSelected; }}
                        disabled={bulkSelectAllLoading || filteredBulkProducts.length === 0}
                        onChange={() => toggleSelectAllBulk(filteredBulkProducts, allSelected)}
                      />
                      {bulkSelectAllLoading ? "Updating…" : "Select all"}
                    </label>
                    <span className="text-[11px] text-gray-400">{selectedCount} of {filteredBulkProducts.length} selected</span>
                  </div>

                  <div className="mt-1 max-h-96 overflow-y-auto rounded-xl" style={{ border: "1px solid #E5E7EB" }}>
                    {filteredBulkProducts.map((p) => (
                      <label
                        key={p.id}
                        className="flex items-center gap-3 px-3 py-2 cursor-pointer"
                        style={{ borderBottom: "1px solid #F3F4F6" }}
                      >
                        <input
                          type="checkbox"
                          checked={isProductInBulkTarget(p)}
                          disabled={bulkTogglingId === p.id || bulkSelectAllLoading}
                          onChange={() => toggleBulkTarget(p)}
                        />
                        <div className="w-8 h-8 rounded-lg overflow-hidden flex items-center justify-center flex-shrink-0" style={{ background: "#F8FAFC" }}>
                          <ProductThumb product={p} size={16} />
                        </div>
                        <span className="text-sm font-medium flex-1 truncate">{p.name}</span>
                        {bulkTogglingId === p.id ? (
                          <span className="text-[11px] text-gray-400 flex-shrink-0">Saving…</span>
                        ) : (
                          <span className="text-[11px] flex-shrink-0" style={{ color: (p.assignedSellerEmails || []).length ? "#F8B400" : "#9CA3AF" }}>
                            {p.isPremium ? "✨ Premium" : (p.assignedSellerEmails || []).length ? `🔒 ${p.assignedSellerEmails.length}` : "🌐 All"}
                          </span>
                        )}
                      </label>
                    ))}
                    {filteredBulkProducts.length === 0 && (
                      <div className="px-3 py-6 text-center text-xs text-gray-400">No products match.</div>
                    )}
                  </div>
                </>
              );
            })()}
          </div>
        )}
      </div>

      {/* Reorder products — drag rows to set the order sellers see them in */}
      <div className="mt-6 rounded-2xl p-5 bg-white" style={{ border: "1px solid #E5E7EB" }}>
        <button onClick={() => setReorderOpen((v) => !v)} className="w-full flex items-center justify-between text-left">
          <span className="text-sm font-semibold flex items-center gap-2" style={{ color: "#0B1F3A" }}>
            <Boxes className="w-4 h-4" /> Reorder products
          </span>
          <ChevronDown className="w-4 h-4 transition-transform" style={{ transform: reorderOpen ? "rotate(180deg)" : "none", color: "#6B7280" }} />
        </button>
        <p className="mt-1 text-[11px] text-gray-400">Drag a product up or down to change the order it shows up in on every seller's Products page — the top of this list is the first product they see.</p>

        {reorderOpen && (
          <div className="mt-4">
            <input
              value={reorderSearch}
              onChange={(e) => setReorderSearch(e.target.value)}
              placeholder="Search products…"
              className="w-full rounded-lg px-3 py-2 text-sm"
              style={{ border: "1px solid #E5E7EB" }}
            />
            {reorderSearch.trim() && (
              <p className="mt-1.5 text-[11px]" style={{ color: "#F8B400" }}>Clear the search box to drag and reorder — dragging is only available on the full, unfiltered list.</p>
            )}

            <div className="mt-2 max-h-96 overflow-y-auto rounded-xl" style={{ border: "1px solid #E5E7EB", opacity: reorderSaving ? 0.6 : 1, pointerEvents: reorderSaving ? "none" : "auto" }}>
              {catalog
                .map((p, i) => ({ p, i }))
                .filter(({ p }) => p.name.toLowerCase().includes(reorderSearch.trim().toLowerCase()))
                .map(({ p, i }) => (
                  <div
                    key={p.id}
                    draggable={!reorderSearch.trim()}
                    onDragStart={() => setDragIndex(i)}
                    onDragOver={(e) => { e.preventDefault(); if (!reorderSearch.trim()) setDragOverIndex(i); }}
                    onDragLeave={() => setDragOverIndex((cur) => (cur === i ? null : cur))}
                    onDrop={(e) => {
                      e.preventDefault();
                      moveProduct(dragIndex, i);
                      setDragIndex(null);
                      setDragOverIndex(null);
                    }}
                    onDragEnd={() => { setDragIndex(null); setDragOverIndex(null); }}
                    className="flex items-center gap-3 px-3 py-2"
                    style={{
                      borderBottom: "1px solid #F3F4F6",
                      background: dragOverIndex === i ? "#F0FDF9" : "transparent",
                      cursor: reorderSearch.trim() ? "default" : "grab",
                    }}
                  >
                    <span className="text-gray-300 flex-shrink-0" style={{ fontSize: 16, lineHeight: 1 }}>⠿</span>
                    <span className="text-[11px] w-6 flex-shrink-0 text-gray-400">{i + 1}</span>
                    <div className="w-8 h-8 rounded-lg overflow-hidden flex items-center justify-center flex-shrink-0" style={{ background: "#F8FAFC" }}>
                      <ProductThumb product={p} size={16} />
                    </div>
                    <span className="text-sm font-medium flex-1 truncate">{p.name}</span>
                  </div>
                ))}
              {catalog.filter((p) => p.name.toLowerCase().includes(reorderSearch.trim().toLowerCase())).length === 0 && (
                <div className="px-3 py-6 text-center text-xs text-gray-400">No products match.</div>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
        <StatCard label="Total sellers signed up" value={sellers.length || sellerCount} color="#00C896" />
        <StatCard label="Pending seller approvals" value={sellers.filter((s) => s.approval_status !== "approved" && s.approval_status !== "deactivated").length} color="#F8B400" />
        <StatCard label="Products in catalog" value={catalog.length} />
        <StatCard label="Customer orders (all sellers)" value={allOrders.length} color="#F8B400" />
      </div>

      {/* Full order management for every seller now lives under the "Orders"
          tab in the sidebar (shown there for Admin logins) — see AdminOrdersPanel. */}

      {/* Site logo: upload a picture from your computer to replace the default icon everywhere */}
      <div className="mt-6 rounded-2xl bg-white p-5" style={{ border: "1px solid #E5E7EB" }}>
        <h2 className="text-base font-extrabold" style={{ color: "#0B1F3A", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Site logo</h2>
        <p className="text-xs text-gray-400 mt-0.5">Replace the default icon with your own picture — it shows up in the navbar, footer, login page, and dashboard sidebar for everyone.</p>
        <div className="mt-4 flex items-center gap-4">
          <Logo box="w-14 h-14" icon="w-7 h-7" />
          <div className="flex items-center gap-2">
            <label
              className="text-sm font-semibold px-4 py-2.5 rounded-full cursor-pointer text-white transition-transform hover:scale-105"
              style={{ background: "linear-gradient(135deg,#00C896,#0B1F3A)", opacity: logoUploading ? 0.6 : 1 }}
            >
              {logoUploading ? "Uploading…" : "Upload picture"}
              <input type="file" accept="image/*" onChange={uploadLogo} disabled={logoUploading} className="hidden" />
            </label>
            {logoUrl && (
              <button onClick={removeLogo} className="text-sm font-semibold px-4 py-2.5 rounded-full" style={{ border: "1px solid #E5E7EB", color: "#6B7280" }}>
                Remove
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Features comparison table: edit the "Our Features" plan-comparison
          table shown on the homepage's Features section. Saves to Supabase,
          live instantly. */}
      <div className="mt-6 rounded-2xl bg-white p-5" style={{ border: "1px solid #E5E7EB" }}>
        <h2 className="text-base font-extrabold" style={{ color: "#0B1F3A", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Features comparison</h2>
        <p className="text-xs text-gray-400 mt-0.5">Edit the "Our Features" table shown on the homepage — the heading, the {featuresTableForm.plans.length} plan columns, and every feature row.</p>

        <div className="mt-4">
          <label className="text-xs font-semibold text-gray-500">Table heading</label>
          <input
            value={featuresTableForm.headline}
            onChange={(e) => setFeaturesTableForm((f) => ({ ...f, headline: e.target.value }))}
            className="mt-1 w-full text-sm rounded-lg px-3 py-2"
            style={{ border: "1px solid #E5E7EB" }}
          />
        </div>

        {/* Plan column headers */}
        <div className="mt-5 grid md:grid-cols-3 gap-4">
          {featuresTableForm.plans.map((p, i) => (
            <div key={i} className="rounded-xl p-4 space-y-2.5" style={{ border: "1px solid #E5E7EB" }}>
              <div>
                <label className="text-xs font-semibold text-gray-500">Plan name (internal)</label>
                <input value={p.name} onChange={(e) => updateFeaturesPlan(i, "name", e.target.value)} className="mt-1 w-full text-sm rounded-lg px-3 py-2" style={{ border: "1px solid #E5E7EB" }} />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500">Badge (e.g. FREE, GOLD)</label>
                <input value={p.badge} onChange={(e) => updateFeaturesPlan(i, "badge", e.target.value)} className="mt-1 w-full text-sm rounded-lg px-3 py-2" style={{ border: "1px solid #E5E7EB" }} />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500">Subtitle</label>
                <input value={p.subtitle} onChange={(e) => updateFeaturesPlan(i, "subtitle", e.target.value)} className="mt-1 w-full text-sm rounded-lg px-3 py-2" style={{ border: "1px solid #E5E7EB" }} />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500">Price label (e.g. $0, Custom)</label>
                <input value={p.price} onChange={(e) => updateFeaturesPlan(i, "price", e.target.value)} className="mt-1 w-full text-sm rounded-lg px-3 py-2" style={{ border: "1px solid #E5E7EB" }} />
              </div>
            </div>
          ))}
        </div>

        {/* Feature rows */}
        <div className="mt-6 space-y-3">
          <label className="text-xs font-semibold text-gray-500">Feature rows</label>
          {featuresTableForm.rows.map((r, ri) => (
            <div key={ri} className="rounded-xl p-4" style={{ border: "1px solid #E5E7EB" }}>
              <div className="flex items-center gap-2">
                <input
                  value={r.label}
                  onChange={(e) => updateFeaturesRow(ri, "label", e.target.value)}
                  placeholder="Feature name"
                  className="flex-1 text-sm rounded-lg px-3 py-2"
                  style={{ border: "1px solid #E5E7EB" }}
                />
                <select
                  value={r.type}
                  onChange={(e) => updateFeaturesRow(ri, "type", e.target.value)}
                  className="text-sm rounded-lg px-2 py-2"
                  style={{ border: "1px solid #E5E7EB" }}
                >
                  <option value="check">Check / cross</option>
                  <option value="text">Text value</option>
                </select>
                <button onClick={() => removeFeaturesRow(ri)} className="text-xs font-semibold px-3 py-2 rounded-lg" style={{ border: "1px solid #FCA5A5", color: "#DC2626" }}>
                  Remove
                </button>
              </div>

              <div className="mt-3 grid" style={{ gridTemplateColumns: `repeat(${featuresTableForm.plans.length}, 1fr)`, gap: "0.5rem" }}>
                {featuresTableForm.plans.map((p, pi) => (
                  <div key={pi}>
                    <label className="text-[11px] font-semibold text-gray-400">{p.name}</label>
                    {r.type === "text" ? (
                      <input
                        value={r.values?.[pi] ?? ""}
                        onChange={(e) => updateFeaturesRowCell(ri, pi, e.target.value)}
                        className="mt-1 w-full text-sm rounded-lg px-3 py-2"
                        style={{ border: "1px solid #E5E7EB" }}
                      />
                    ) : (
                      <label className="mt-1 flex items-center gap-2 text-xs font-semibold text-gray-500 rounded-lg px-3 py-2" style={{ border: "1px solid #E5E7EB" }}>
                        <input type="checkbox" checked={!!r.values?.[pi]} onChange={(e) => updateFeaturesRowCell(ri, pi, e.target.checked)} />
                        {r.values?.[pi] ? "Included" : "Not included"}
                      </label>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}

          <button onClick={addFeaturesRow} className="text-sm font-semibold px-4 py-2 rounded-full" style={{ border: "1px solid #E5E7EB", color: "#0B1F3A" }}>
            + Add feature row
          </button>
        </div>

        <button
          onClick={saveFeaturesTable}
          disabled={featuresTableSaving}
          className="mt-5 text-sm font-semibold px-5 py-2.5 rounded-full text-white transition-transform hover:scale-105"
          style={{ background: "linear-gradient(135deg,#00C896,#0B1F3A)", opacity: featuresTableSaving ? 0.6 : 1 }}
        >
          {featuresTableSaving ? "Saving…" : "Save features section"}
        </button>
      </div>

      {/* Customer reviews: edit the testimonial cards shown on the homepage's
          "Trusted by sellers" section. Saves to Supabase, live instantly. */}
      <div className="mt-6 rounded-2xl bg-white p-5" style={{ border: "1px solid #E5E7EB" }}>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-extrabold" style={{ color: "#0B1F3A", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Customer reviews</h2>
            <p className="text-xs text-gray-400 mt-0.5">Edit the testimonial cards shown on the homepage's "Trusted by sellers across the Gulf" section.</p>
          </div>
          <button
            onClick={addTestimonial}
            className="text-xs font-semibold px-3.5 py-2 rounded-full flex-shrink-0"
            style={{ border: "1px solid #E5E7EB", color: "#0B1F3A" }}
          >
            + Add review
          </button>
        </div>

        <div className="mt-5 grid md:grid-cols-3 gap-4">
          {testimonialsForm.map((t, i) => (
            <div key={i} className="rounded-xl p-4 space-y-2.5 relative" style={{ border: "1px solid #E5E7EB" }}>
              <button
                onClick={() => removeTestimonial(i)}
                className="absolute top-3 right-3 text-gray-300 hover:text-red-400"
                title="Remove this review"
              >
                <X className="w-4 h-4" />
              </button>
              <div>
                <label className="text-xs font-semibold text-gray-500">Reviewer name</label>
                <input value={t.name} onChange={(e) => updateTestimonial(i, "name", e.target.value)} className="mt-1 w-full text-sm rounded-lg px-3 py-2" style={{ border: "1px solid #E5E7EB" }} />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500">Role / company</label>
                <input value={t.role} onChange={(e) => updateTestimonial(i, "role", e.target.value)} className="mt-1 w-full text-sm rounded-lg px-3 py-2" style={{ border: "1px solid #E5E7EB" }} />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500">Quote</label>
                <textarea
                  value={t.quote}
                  onChange={(e) => updateTestimonial(i, "quote", e.target.value)}
                  rows={3}
                  className="mt-1 w-full text-sm rounded-lg px-3 py-2"
                  style={{ border: "1px solid #E5E7EB" }}
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500">Rating (1–5 stars)</label>
                <input
                  type="number"
                  min={1}
                  max={5}
                  value={t.rating}
                  onChange={(e) => updateTestimonial(i, "rating", Math.max(1, Math.min(5, Number(e.target.value) || 5)))}
                  className="mt-1 w-full text-sm rounded-lg px-3 py-2"
                  style={{ border: "1px solid #E5E7EB" }}
                />
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={saveTestimonials}
          disabled={testimonialsSaving}
          className="mt-5 text-sm font-semibold px-5 py-2.5 rounded-full text-white transition-transform hover:scale-105"
          style={{ background: "linear-gradient(135deg,#00C896,#0B1F3A)", opacity: testimonialsSaving ? 0.6 : 1 }}
        >
          {testimonialsSaving ? "Saving…" : "Save reviews"}
        </button>
      </div>

      {/* Sellers table: every signed-up seller, with contact details and signup date */}
      <div className="mt-8 rounded-2xl bg-white overflow-hidden" style={{ border: "1px solid #E5E7EB" }}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-5" style={{ borderBottom: "1px solid #F3F4F6" }}>
          <div>
            <h2 className="text-base font-extrabold" style={{ color: "#0B1F3A", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Sellers ({sellers.length})</h2>
            <p className="text-xs text-gray-400 mt-0.5">Every account that has signed up, newest first.</p>
          </div>
          <input
            value={sellerSearch}
            onChange={(e) => setSellerSearch(e.target.value)}
            placeholder="Search by name, email, or company…"
            className="text-sm rounded-full px-4 py-2 w-full sm:w-72"
            style={{ border: "1px solid #E5E7EB" }}
          />
        </div>
        {sellersLoading ? (
          <div className="p-8 text-center text-sm text-gray-400">Loading sellers…</div>
        ) : filteredSellers.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-400">No sellers found.</div>
        ) : (
          <div className="overflow-x-auto" style={{ WebkitOverflowScrolling: "touch" }}>
            <table className="w-full min-w-[900px] text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-400 uppercase tracking-wide" style={{ background: "#F8FAFC" }}>
                  <th className="px-5 py-3">Seller</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Mobile</th>
                  <th className="px-4 py-3">WhatsApp</th>
                  <th className="px-4 py-3">Store</th>
                  <th className="px-4 py-3">Country</th>
                  <th className="px-4 py-3">Avg. orders/mo</th>
                  <th className="px-4 py-3">Bank</th>
                  <th className="px-4 py-3">Orders</th>
                  <th className="px-4 py-3">Signed up</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Approval</th>
                  <th className="px-4 py-3">Premium</th>
                  <th className="px-4 py-3">Invoices</th>
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: "#F3F4F6" }}>
                {filteredSellers.map((s) => (
                  <tr key={s.id}>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0" style={{ background: "linear-gradient(135deg,#0B1F3A,#00a67e)" }}>
                          {(s.name || s.email || "?").charAt(0).toUpperCase()}
                        </div>
                        <span className="font-semibold" style={{ color: "#111827" }}>{s.name || "—"}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{s.email}</td>
                    <td className="px-4 py-3 text-gray-500">{s.phone || "—"}</td>
                    <td className="px-4 py-3 text-gray-500">{s.whatsapp || "—"}</td>
                    <td className="px-4 py-3 text-gray-500">{s.store_name || s.company || "—"}</td>
                    <td className="px-4 py-3 text-gray-500">{s.country || "—"}</td>
                    <td className="px-4 py-3 text-gray-500">{s.monthly_orders || "—"}</td>
                    <td className="px-4 py-3">
                      {s.bank_name || s.account_number || s.iban ? (
                        <div className="text-xs text-gray-500 leading-tight" title={`IBAN: ${s.iban || "—"}`}>
                          <div className="font-semibold" style={{ color: "#111827" }}>{s.bank_name || "—"}</div>
                          <div>{s.account_title || "—"}</div>
                          <div>{s.account_number || "—"}</div>
                        </div>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-500">{sellerOrderCount(s.email)}</td>
                    <td className="px-4 py-3 text-gray-400 text-xs" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                      {s.created_at ? new Date(s.created_at).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }) : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className="text-xs font-semibold px-2.5 py-1 rounded-full"
                        style={
                          s.approval_status === "approved" ? { background: "rgba(0,200,150,0.15)", color: "#00a67e" } :
                          s.approval_status === "deactivated" ? { background: "rgba(239,68,68,0.12)", color: "#EF4444" } :
                          { background: "rgba(248,180,0,0.15)", color: "#b07d00" }
                        }
                      >
                        {s.approval_status === "approved" ? "Approved" : s.approval_status === "deactivated" ? "Deactivated" : "Pending"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {s.approval_status === "approved" ? (
                        <button onClick={() => setSellerApproval(s.id, "deactivated")} className="text-xs font-semibold px-3 py-1.5 rounded-full text-red-500" style={{ border: "1px solid #FECACA" }}>
                          Deactivate
                        </button>
                      ) : (
                        <button onClick={() => setSellerApproval(s.id, "approved")} className="text-xs font-semibold px-3 py-1.5 rounded-full text-white" style={{ background: "#00C896" }}>
                          {s.approval_status === "deactivated" ? "Reactivate" : "Approve"}
                        </button>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => togglePremiumSeller(s.email)}
                        disabled={premiumTogglingEmail === s.email}
                        className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-full disabled:opacity-60"
                        style={
                          premiumSellerEmails.includes(s.email)
                            ? { background: "linear-gradient(135deg,#F8B400,#c98f00)", color: "#04140f" }
                            : { border: "1px solid #E5E7EB", color: "#6B7280" }
                        }
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        {premiumTogglingEmail === s.email ? "…" : premiumSellerEmails.includes(s.email) ? "Premium ✓" : "Make Premium"}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => setInvoiceManagerSeller(s)}
                        className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-full"
                        style={{ border: "1px solid #E5E7EB", color: "#0B1F3A" }}
                      >
                        <FileText className="w-3.5 h-3.5" /> Invoices
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {invoiceManagerSeller && (
        <SellerInvoiceManager seller={invoiceManagerSeller} notify={notify} onClose={() => setInvoiceManagerSeller(null)} />
      )}

      <div className="mt-8 grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {catalog.map((p) => (
          <div key={p.id} className="rounded-2xl p-5 bg-white" style={{ border: "1px solid #E5E7EB" }}>
            {editingId === p.id ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  {(editForm.images || []).map((url, idx) => (
                    <div
                      key={idx}
                      draggable
                      onDragStart={(e) => { e.dataTransfer.effectAllowed = "move"; e.dataTransfer.setData("text/plain", String(idx)); }}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => { e.preventDefault(); reorderEditImages(Number(e.dataTransfer.getData("text/plain")), idx); }}
                      title="Drag to reorder"
                      className="relative w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 cursor-move"
                      style={{ border: "1px solid #E5E7EB" }}
                    >
                      <img src={url} alt="" className="w-full h-full object-cover" draggable={false} />
                      <button onClick={() => removeEditImage(idx)} title="Remove this picture" className="absolute top-0 right-0 w-4 h-4 flex items-center justify-center text-white text-[10px]" style={{ background: "rgba(0,0,0,0.55)" }}>×</button>
                    </div>
                  ))}
                  {(editForm.images || []).length < 4 && (
                    <label className="text-xs font-semibold px-3 py-1.5 rounded-full cursor-pointer" style={{ border: "1px solid #E5E7EB", color: "#0B1F3A", opacity: editImageUploading ? 0.6 : 1 }}>
                      {editImageUploading ? "Uploading…" : "Upload pictures"}
                      <input type="file" accept="image/*" multiple onChange={uploadEditImages} disabled={editImageUploading} className="hidden" />
                    </label>
                  )}
                </div>
                <p className="text-[11px] text-gray-400">{(editForm.images || []).length}/4 pictures</p>
                <div className="flex items-center gap-2">
                  <input value={editForm.emoji} onChange={(e) => setEditForm({ ...editForm, emoji: e.target.value })} title="Fallback emoji" className="w-14 rounded-lg px-2 py-1.5 text-lg text-center" style={{ border: "1px solid #E5E7EB" }} />
                  <input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} placeholder="Product name" className="flex-1 rounded-lg px-2 py-1.5 text-sm font-semibold" style={{ border: "1px solid #E5E7EB" }} />
                </div>
                <input value={editForm.category} onChange={(e) => setEditForm({ ...editForm, category: e.target.value })} placeholder="Category" className="w-full rounded-lg px-2 py-1.5 text-xs" style={{ border: "1px solid #E5E7EB" }} />
                <div className="flex items-center gap-2">
                  <input type="number" value={editForm.cost} onChange={(e) => setEditForm({ ...editForm, cost: e.target.value })} placeholder="Cost" className="w-1/2 rounded-lg px-2 py-1.5 text-xs" style={{ border: "1px solid #E5E7EB" }} />
                  <input type="number" value={editForm.sell} onChange={(e) => setEditForm({ ...editForm, sell: e.target.value })} placeholder="Sell" className="w-1/2 rounded-lg px-2 py-1.5 text-xs" style={{ border: "1px solid #E5E7EB" }} />
                </div>
                <input type="number" min="0" value={editForm.stock} onChange={(e) => setEditForm({ ...editForm, stock: e.target.value })} placeholder="Stock quantity" className="w-full rounded-lg px-2 py-1.5 text-xs" style={{ border: "1px solid #E5E7EB" }} />
                <div>
                  <label className="text-[11px] text-gray-400">Visible to</label>
                  <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                    <label className="text-[11px] font-semibold flex items-center gap-1 px-2.5 py-1 rounded-full cursor-pointer" style={editForm.assignedSellers.length === 0 ? { background: "#0B1F3A", color: "#fff" } : { border: "1px solid #E5E7EB", color: "#6B7280" }}>
                      <input type="checkbox" className="hidden" checked={editForm.assignedSellers.length === 0} onChange={() => setEditForm((f) => ({ ...f, assignedSellers: [] }))} />
                      All sellers
                    </label>
                    {sellers.map((s) => (
                      <label key={s.id} className="text-[11px] font-medium flex items-center gap-1 px-2.5 py-1 rounded-full cursor-pointer" style={editForm.assignedSellers.includes(s.email) ? { background: "#F8B400", color: "#04140f" } : { border: "1px solid #E5E7EB", color: "#6B7280" }}>
                        <input type="checkbox" className="hidden" checked={editForm.assignedSellers.includes(s.email)} onChange={() => toggleEditSeller(s.email)} />
                        {s.email}
                      </label>
                    ))}
                  </div>
                </div>
                <label className="text-[11px] font-semibold flex items-center gap-1 px-2.5 py-1 rounded-full cursor-pointer w-fit" style={editForm.isPremium ? { background: "#F8B400", color: "#04140f" } : { border: "1px solid #E5E7EB", color: "#6B7280" }}>
                  <input type="checkbox" className="hidden" checked={editForm.isPremium} onChange={() => setEditForm((f) => ({ ...f, isPremium: !f.isPremium }))} />
                  <Sparkles className="w-3 h-3" /> Premium product
                </label>
                <textarea rows={3} value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} placeholder="Description" className="w-full rounded-lg px-2 py-1.5 text-xs" style={{ border: "1px solid #E5E7EB" }} />
                <div className="flex gap-2 pt-1">
                  <button onClick={() => saveEdit(p.id)} className="flex-1 text-xs font-semibold py-2 rounded-full text-white" style={{ background: "#00C896" }}>Save</button>
                  <button onClick={cancelEdit} className="flex-1 text-xs font-semibold py-2 rounded-full" style={{ border: "1px solid #E5E7EB", color: "#6B7280" }}>Cancel</button>
                </div>
              </div>
            ) : (
              <>
                <div className="w-16 h-16 rounded-xl overflow-hidden flex items-center justify-center" style={{ background: "#F8FAFC" }}>
                  <ProductThumb product={p} size={36} />
                </div>
                <div className="mt-3 font-semibold text-sm">{p.name}</div>
                <div className="text-xs text-gray-400 mt-0.5">{p.category}</div>
                <div className="mt-1 text-xs text-gray-500">Cost AED {p.cost} · Sell AED {p.sell}</div>
                <div className="mt-1 text-xs font-semibold" style={{ color: (p.stock ?? 0) > 0 ? "#00a67e" : "#EF4444" }}>
                  Stock: {p.stock ?? 0} {(p.stock ?? 0) > 0 ? "" : "(Out of Stock)"}
                </div>
                <div className="mt-1 text-[11px] font-semibold truncate" style={{ color: (p.assignedSellerEmails || []).length ? "#F8B400" : "#9CA3AF" }} title={(p.assignedSellerEmails || []).join(", ")}>
                  {(p.assignedSellerEmails || []).length ? `🔒 ${p.assignedSellerEmails.length} seller(s): ${p.assignedSellerEmails.join(", ")}` : "🌐 All sellers"}
                </div>
                {p.isPremium && (
                  <div className="mt-1 text-[11px] font-semibold flex items-center gap-1" style={{ color: "#F8B400" }}>
                    <Sparkles className="w-3 h-3" /> Premium — Premium sellers only
                  </div>
                )}
                {p.sourceUrl && (
                  <a href={p.sourceUrl} target="_blank" rel="noopener noreferrer" className="mt-1 text-[11px] font-medium truncate block" style={{ color: "#6B7280" }}>
                    🔗 View original source
                  </a>
                )}
                <div className="mt-4 flex gap-2">
                  <button onClick={() => startEdit(p)} className="flex-1 text-xs font-semibold py-2 rounded-full" style={{ border: "1px solid #E5E7EB", color: "#0B1F3A" }}>Edit</button>
                  <button onClick={() => deleteProduct(p.id)} className="flex-1 text-xs font-semibold py-2 rounded-full text-red-500" style={{ border: "1px solid #FECACA" }}>Remove</button>
                </div>
                <button onClick={() => toggleReviews(p.id)} className="mt-2 w-full text-xs font-semibold py-2 rounded-full" style={{ border: "1px solid #E5E7EB", color: "#6B7280" }}>
                  {reviewsOpenId === p.id ? "Hide reviews" : `Manage reviews${reviewsByProduct[p.id] ? ` (${reviewsByProduct[p.id].length})` : ""}`}
                </button>

                {reviewsOpenId === p.id && (
                  <div className="mt-3 pt-3 space-y-3" style={{ borderTop: "1px solid #F3F4F6" }}>
                    {reviewsLoading && !reviewsByProduct[p.id] ? (
                      <div className="text-xs text-gray-400 text-center py-3">Loading reviews…</div>
                    ) : (
                      <>
                        {(reviewsByProduct[p.id] || []).length === 0 && (
                          <p className="text-[11px] text-gray-400">No real reviews yet — the storefront shows sample reviews until you add one.</p>
                        )}
                        {(reviewsByProduct[p.id] || []).map((r) => (
                          <div key={r.id} className="rounded-lg p-2.5" style={{ background: "#F8FAFC", border: "1px solid #F3F4F6" }}>
                            {editingReviewId === r.id ? (
                              <div className="space-y-1.5">
                                <div className="flex items-center gap-2">
                                  <input value={editReviewForm.name} onChange={(e) => setEditReviewForm({ ...editReviewForm, name: e.target.value })} placeholder="Reviewer name" className="flex-1 rounded-lg px-2 py-1.5 text-xs" style={{ border: "1px solid #E5E7EB" }} />
                                  <select value={editReviewForm.rating} onChange={(e) => setEditReviewForm({ ...editReviewForm, rating: e.target.value })} className="rounded-lg px-2 py-1.5 text-xs" style={{ border: "1px solid #E5E7EB" }}>
                                    {[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{n} ★</option>)}
                                  </select>
                                </div>
                                <textarea rows={2} value={editReviewForm.body} onChange={(e) => setEditReviewForm({ ...editReviewForm, body: e.target.value })} placeholder="Review text" className="w-full rounded-lg px-2 py-1.5 text-xs" style={{ border: "1px solid #E5E7EB" }} />
                                <div className="flex gap-2">
                                  <button onClick={() => saveEditReview(p.id, r.id)} className="flex-1 text-xs font-semibold py-1.5 rounded-full text-white" style={{ background: "#00C896" }}>Save</button>
                                  <button onClick={cancelEditReview} className="flex-1 text-xs font-semibold py-1.5 rounded-full" style={{ border: "1px solid #E5E7EB", color: "#6B7280" }}>Cancel</button>
                                </div>
                              </div>
                            ) : (
                              <>
                                <div className="flex items-center justify-between">
                                  <span className="text-xs font-semibold">{r.name}</span>
                                  <span className="text-xs" style={{ color: "#F8B400" }}>{"★".repeat(r.rating)}{"☆".repeat(5 - r.rating)}</span>
                                </div>
                                <p className="text-xs text-gray-500 mt-1">{r.body}</p>
                                <div className="flex gap-2 mt-2">
                                  <button onClick={() => startEditReview(r)} className="flex-1 text-[11px] font-semibold py-1 rounded-full" style={{ border: "1px solid #E5E7EB", color: "#0B1F3A" }}>Edit</button>
                                  <button onClick={() => deleteReview(p.id, r.id)} className="flex-1 text-[11px] font-semibold py-1 rounded-full text-red-500" style={{ border: "1px solid #FECACA" }}>Delete</button>
                                </div>
                              </>
                            )}
                          </div>
                        ))}

                        <div className="rounded-lg p-2.5 space-y-1.5" style={{ border: "1px dashed #D1D5DB" }}>
                          <div className="flex items-center gap-2">
                            <input value={newReview.name} onChange={(e) => setNewReview({ ...newReview, name: e.target.value })} placeholder="Reviewer name" className="flex-1 rounded-lg px-2 py-1.5 text-xs" style={{ border: "1px solid #E5E7EB" }} />
                            <select value={newReview.rating} onChange={(e) => setNewReview({ ...newReview, rating: e.target.value })} className="rounded-lg px-2 py-1.5 text-xs" style={{ border: "1px solid #E5E7EB" }}>
                              {[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{n} ★</option>)}
                            </select>
                          </div>
                          <textarea rows={2} value={newReview.body} onChange={(e) => setNewReview({ ...newReview, body: e.target.value })} placeholder="Review text" className="w-full rounded-lg px-2 py-1.5 text-xs" style={{ border: "1px solid #E5E7EB" }} />
                          <button onClick={() => addReview(p.id)} className="w-full text-xs font-semibold py-1.5 rounded-full text-white" style={{ background: "#0B1F3A" }}>+ Add review</button>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        ))}
      </div>

    </div>
  );
}


function SupportChannelCard({ icon, iconBg, title, subtitle, action, delay = 0 }) {
  return (
    <div
      className="rounded-2xl p-6 bg-white transition-all duration-500 hover:-translate-y-1 hover:shadow-lg"
      style={{ border: "1px solid #E5E7EB", animation: "dashTabIn 0.45s ease-out both", animationDelay: `${delay}ms` }}
    >
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background: iconBg }}>
          {icon}
        </div>
        <div className="min-w-0">
          <div className="font-bold text-sm" style={{ color: "#111827", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{title}</div>
          <div className="text-xs text-gray-400 mt-0.5">{subtitle}</div>
        </div>
      </div>
      {action}
    </div>
  );
}

function SupportTab({ session }) {
  const email = "info.buzznetic@gmail.com";
  const address = "99 Al Waha St - Al Qouz Third - Al Quoz - Dubai - United Arab Emirates";
  return (
    <div>
      <div className="relative overflow-hidden rounded-3xl px-7 py-8 mb-6" style={{ background: "linear-gradient(120deg,#0B1F3A 0%,#0F2E52 55%,#0B7A5E 130%)" }}>
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{ backgroundImage: "radial-gradient(circle, #ffffff 1px, transparent 1px)", backgroundSize: "18px 18px" }}
        />
        <div className="absolute -top-16 -right-10 w-56 h-56 rounded-full opacity-25 blur-3xl" style={{ background: "#00C896", animation: "blobMove 9s ease-in-out infinite" }} />
        <div className="absolute -bottom-20 left-1/4 w-64 h-64 rounded-full opacity-20 blur-3xl" style={{ background: "#F8B400", animation: "blobMove 11s ease-in-out infinite reverse" }} />
        <div className="relative flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background: "rgba(0,200,150,0.18)" }}>
            <LifeBuoy className="w-7 h-7" style={{ color: "#00e0aa" }} />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-white" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Customer Support</h1>
            <p className="text-sm text-white/60 mt-1">We're here to help, {session?.name ? session.name.split(" ")[0] : "there"}.</p>
          </div>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
        <SupportChannelCard
          delay={0}
          iconBg="rgba(37,211,102,0.12)"
          icon={<svg viewBox="0 0 24 24" className="w-6 h-6" fill="#25D366"><path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.7.44 3.35 1.29 4.81L2 22l5.4-1.41a9.9 9.9 0 0 0 4.64 1.18h.01c5.46 0 9.9-4.45 9.9-9.91C21.95 6.45 17.5 2 12.04 2zm0 18.13h-.01a8.2 8.2 0 0 1-4.19-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.18 8.18 0 0 1-1.26-4.36c0-4.52 3.68-8.2 8.21-8.2 2.19 0 4.25.86 5.8 2.4a8.14 8.14 0 0 1 2.4 5.8c0 4.52-3.68 8.2-8.16 8.2zm4.5-6.13c-.25-.12-1.47-.72-1.69-.81-.23-.08-.4-.12-.56.13-.17.25-.64.81-.79.97-.14.17-.29.19-.54.06-.25-.12-1.04-.38-1.98-1.22-.73-.65-1.23-1.46-1.37-1.71-.14-.25-.02-.38.11-.51.11-.11.25-.29.37-.43.12-.14.16-.25.25-.41.08-.17.04-.31-.02-.44-.06-.12-.56-1.35-.77-1.85-.2-.48-.41-.42-.56-.43h-.48c-.17 0-.44.06-.67.31-.23.25-.87.85-.87 2.08 0 1.22.89 2.4 1.02 2.57.12.17 1.75 2.67 4.24 3.74.59.26 1.05.41 1.41.52.59.19 1.13.16 1.55.1.47-.07 1.47-.6 1.68-1.18.21-.58.21-1.08.14-1.18-.06-.11-.23-.17-.48-.29z"/></svg>}
          title="WhatsApp support"
          subtitle="+971 56 832 8274 · replies within minutes"
          action={
            <a
              href="https://wa.me/971568328274"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 flex items-center justify-center gap-2 w-full text-sm font-semibold py-3 rounded-full text-white transition-transform duration-200 hover:scale-[1.02] active:scale-95"
              style={{ background: "#25D366" }}
            >
              Chat on WhatsApp
            </a>
          }
        />

        <SupportChannelCard
          delay={90}
          iconBg="rgba(59,130,246,0.12)"
          icon={<Mail className="w-6 h-6" style={{ color: "#3B82F6" }} />}
          title="Email support"
          subtitle="We reply within one business day."
          action={
            <a
              href={`mailto:${email}`}
              className="mt-4 flex items-center justify-center gap-2 w-full text-sm font-semibold py-3 rounded-full text-white transition-transform duration-200 hover:scale-[1.02] active:scale-95"
              style={{ background: "#3B82F6" }}
            >
              {email}
            </a>
          }
        />

        <SupportChannelCard
          delay={180}
          iconBg="rgba(248,180,0,0.15)"
          icon={<MapPin className="w-6 h-6" style={{ color: "#F8B400" }} />}
          title="Our office"
          subtitle="Dubai, United Arab Emirates"
          action={
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 flex items-center justify-center gap-2 w-full text-xs sm:text-sm font-semibold py-3 rounded-full text-white text-center transition-transform duration-200 hover:scale-[1.02] active:scale-95 leading-snug px-2"
              style={{ background: "#F8B400" }}
            >
              {address}
            </a>
          }
        />
      </div>
    </div>
  );
}

function TicketStatusPill({ status }) {
  const resolved = status === "resolved";
  return (
    <span
      className="text-xs font-semibold px-2.5 py-1 rounded-full flex-shrink-0"
      style={resolved ? { background: "rgba(0,200,150,0.15)", color: "#00a67e" } : { background: "rgba(248,180,0,0.15)", color: "#b07d00" }}
    >
      {resolved ? "Resolved" : "Open"}
    </span>
  );
}

// Shared chat-thread UI used by both the seller's ticket view and the
// admin's ticket panel — bubbles align right for whoever is currently
// looking at the thread, left for the other side.
function TicketThread({ messages, loading, viewerRole }) {
  if (loading) return <div className="text-xs text-gray-400 text-center py-6">Loading conversation…</div>;
  if (!messages || messages.length === 0) return <div className="text-xs text-gray-400 text-center py-6">No messages yet.</div>;
  return (
    <div className="space-y-3">
      {messages.map((m) => {
        const mine = m.sender === viewerRole;
        return (
          <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
            <div
              className="max-w-[80%] rounded-2xl px-4 py-2.5"
              style={
                mine
                  ? { background: "linear-gradient(135deg,#00C896,#00a67e)", color: "#fff", borderBottomRightRadius: 4 }
                  : { background: "#F8FAFC", border: "1px solid #E5E7EB", color: "#111827", borderBottomLeftRadius: 4 }
              }
            >
              <div className={`text-[10px] font-semibold mb-0.5 ${mine ? "text-white/70" : "text-gray-400"}`}>
                {m.senderName || (m.sender === "admin" ? "Admin" : "Seller")}
              </div>
              {m.imageUrl && (
                <img
                  src={m.imageUrl}
                  alt="Attachment"
                  className="rounded-xl max-w-full mb-1.5"
                  style={{ maxHeight: 240, cursor: "pointer" }}
                  onClick={() => window.open(m.imageUrl, "_blank")}
                />
              )}
              {m.body && <div className="text-sm leading-relaxed whitespace-pre-wrap">{m.body}</div>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function TicketsTab({
  session, notify, category = "support", icon: HeaderIcon = MessageCircle, idPrefix = "TCK",
  heading = "Tickets", subheading = "Raise an issue and chat with Customer Support directly until it's resolved.",
  newButtonLabel = "+ New ticket", listLabel = "Your tickets", emptyText = "No tickets yet — raise one if you need help.",
  subjectLabel = "Subject", subjectPlaceholder = "e.g. Payout for order ORD123456 is late",
  bodyLabel = "Message", bodyPlaceholder = "Describe the issue in detail…",
  createdMsg = "Ticket created — Customer Support will reply here.", adminDisplayName = "Customer Support",
}) {
  const [tickets, setTickets] = useState([]);
  const [ticketsLoading, setTicketsLoading] = useState(true);
  const [selectedId, setSelectedId] = useState(null);
  const [messages, setMessages] = useState({});
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [showNewForm, setShowNewForm] = useState(false);
  const [newSubject, setNewSubject] = useState("");
  const [newBody, setNewBody] = useState("");
  const [newImageFile, setNewImageFile] = useState(null);
  const [newImagePreview, setNewImagePreview] = useState(null);
  const [creating, setCreating] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef(null);
  const newFormFileInputRef = useRef(null);

  const loadTickets = async () => {
    setTicketsLoading(true);
    setTickets(await fetchTickets(session.email, category));
    setTicketsLoading(false);
  };
  useEffect(() => { loadTickets(); }, [category]); // eslint-disable-line

  const openTicket = async (id) => {
    setSelectedId(id);
    if (!messages[id]) {
      setMessagesLoading(true);
      const list = await fetchTicketMessages(id);
      setMessages((prev) => ({ ...prev, [id]: list }));
      setMessagesLoading(false);
    }
  };

  const pickNewImage = (file) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) { notify && notify("Please choose an image file."); return; }
    setNewImageFile(file);
    setNewImagePreview(URL.createObjectURL(file));
  };
  const clearNewImage = () => { setNewImageFile(null); setNewImagePreview(null); if (newFormFileInputRef.current) newFormFileInputRef.current.value = ""; };

  const createTicket = async () => {
    if (!newSubject.trim() || !newBody.trim()) { notify && notify(`Add a ${subjectLabel.toLowerCase()} and a message.`); return; }
    setCreating(true);
    let imageUrl = null;
    if (newImageFile) {
      const { url, error: imgErr } = await uploadTicketImage(newImageFile);
      if (imgErr) { setCreating(false); notify && notify(imgErr); return; }
      imageUrl = url;
    }
    const id = idPrefix + Date.now().toString().slice(-6) + Math.floor(Math.random() * 90 + 10);
    const { error } = await supabase.from("tickets").insert({
      id, seller_email: session.email, seller_name: session.name || session.email, subject: newSubject.trim(), status: "open", category,
    });
    if (error) { setCreating(false); notify && notify("Could not create it — please try again."); return; }
    const { error: msgError } = await supabase.from("ticket_messages").insert({
      ticket_id: id, sender: "seller", sender_name: session.name || session.email, body: newBody.trim(), image_url: imageUrl,
    });
    setCreating(false);
    if (msgError) { notify && notify("Sent, but the message failed to attach."); }
    const newTicket = { id, sellerEmail: session.email, sellerName: session.name || session.email, subject: newSubject.trim(), status: "open", createdAt: new Date().toISOString() };
    setTickets((prev) => [newTicket, ...prev]);
    setMessages((prev) => ({ ...prev, [id]: [{ id: "local-" + id, ticketId: id, sender: "seller", senderName: session.name || session.email, body: newBody.trim(), imageUrl, createdAt: new Date().toISOString() }] }));
    setNewSubject(""); setNewBody(""); clearNewImage(); setShowNewForm(false);
    setSelectedId(id);
    notify && notify(createdMsg);
  };

  const sendReply = async () => {
    if (!reply.trim() || !selectedId) return;
    setSending(true);
    const { error } = await supabase.from("ticket_messages").insert({
      ticket_id: selectedId, sender: "seller", sender_name: session.name || session.email, body: reply.trim(),
    });
    // A seller replying to a resolved ticket reopens it, so it lands back in Admin's open queue.
    const ticket = tickets.find((t) => t.id === selectedId);
    if (!error && ticket?.status === "resolved") {
      await supabase.from("tickets").update({ status: "open" }).eq("id", selectedId);
      setTickets((prev) => prev.map((t) => (t.id === selectedId ? { ...t, status: "open" } : t)));
    }
    setSending(false);
    if (error) { notify && notify("Could not send message."); return; }
    setMessages((prev) => ({
      ...prev,
      [selectedId]: [...(prev[selectedId] || []), { id: "local-" + Date.now(), ticketId: selectedId, sender: "seller", senderName: session.name || session.email, body: reply.trim(), createdAt: new Date().toISOString() }],
    }));
    setReply("");
  };

  const sendImage = async (file) => {
    if (!file || !selectedId) return;
    setUploadingImage(true);
    const { url, error: upErr } = await uploadTicketImage(file);
    if (upErr) { setUploadingImage(false); notify && notify(upErr); return; }
    const { error } = await supabase.from("ticket_messages").insert({
      ticket_id: selectedId, sender: "seller", sender_name: session.name || session.email, body: "", image_url: url,
    });
    // A seller replying to a resolved ticket reopens it, so it lands back in Customer Support's open queue.
    const ticket = tickets.find((t) => t.id === selectedId);
    if (!error && ticket?.status === "resolved") {
      await supabase.from("tickets").update({ status: "open" }).eq("id", selectedId);
      setTickets((prev) => prev.map((t) => (t.id === selectedId ? { ...t, status: "open" } : t)));
    }
    setUploadingImage(false);
    if (error) { notify && notify("Could not send the picture."); return; }
    setMessages((prev) => ({
      ...prev,
      [selectedId]: [...(prev[selectedId] || []), { id: "local-" + Date.now(), ticketId: selectedId, sender: "seller", senderName: session.name || session.email, body: "", imageUrl: url, createdAt: new Date().toISOString() }],
    }));
  };

  const selectedTicket = tickets.find((t) => t.id === selectedId);

  return (
    <div>
      <div className="relative overflow-hidden rounded-3xl px-7 py-8 mb-6" style={{ background: "linear-gradient(120deg,#0B1F3A 0%,#0F2E52 55%,#0B7A5E 130%)" }}>
        <div className="absolute inset-0 opacity-[0.07]" style={{ backgroundImage: "radial-gradient(circle, #ffffff 1px, transparent 1px)", backgroundSize: "18px 18px" }} />
        <div className="absolute -top-16 -right-10 w-56 h-56 rounded-full opacity-25 blur-3xl" style={{ background: "#00C896", animation: "blobMove 9s ease-in-out infinite" }} />
        <div className="absolute -bottom-20 left-1/4 w-64 h-64 rounded-full opacity-20 blur-3xl" style={{ background: "#F8B400", animation: "blobMove 11s ease-in-out infinite reverse" }} />
        <div className="relative flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            <div className="relative w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background: "rgba(0,200,150,0.18)" }}>
              <span className="absolute inset-0 rounded-2xl" style={{ boxShadow: "0 0 0 1px rgba(0,224,170,0.35)" }} />
              <HeaderIcon className="w-7 h-7" style={{ color: "#00e0aa" }} />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-white" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{heading}</h1>
              <p className="text-sm text-white/60 mt-1">{subheading}</p>
            </div>
          </div>
          <button
            onClick={() => { setShowNewForm((v) => !v); clearNewImage(); }}
            className="text-sm font-semibold px-5 py-2.5 rounded-full text-white transition-all duration-300 hover:scale-105 active:scale-95"
            style={{ background: "linear-gradient(135deg,#00C896,#00a67e)", boxShadow: "0 8px 22px rgba(0,200,150,0.35)" }}
          >
            {showNewForm ? "Cancel" : newButtonLabel}
          </button>
        </div>
      </div>

      {showNewForm && (
        <div className="relative overflow-hidden rounded-2xl bg-white p-5 mb-6 animate-[dashTabIn_0.35s_ease-out]" style={{ border: "1px solid #E5E7EB", boxShadow: "0 12px 30px rgba(11,31,58,0.06)" }}>
          <div className="absolute top-0 left-0 right-0 h-[3px]" style={{ background: "linear-gradient(90deg,#00C896,#F8B400)" }} />
          <div className="flex items-center gap-2.5 mb-4">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "rgba(0,200,150,0.12)" }}>
              <Sparkles className="w-[18px] h-[18px]" style={{ color: "#00a67e" }} />
            </div>
            <div className="font-bold text-sm" style={{ color: "#0B1F3A", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{newButtonLabel.replace("+ New ", "Raise a new ").replace(/^./, (c) => c.toUpperCase())}</div>
          </div>
          <div className="space-y-3.5">
            <div>
              <label className="text-xs font-semibold text-gray-500">{subjectLabel}</label>
              <input
                value={newSubject}
                onChange={(e) => setNewSubject(e.target.value)}
                placeholder={subjectPlaceholder}
                className="mt-1.5 w-full rounded-xl px-4 py-2.5 text-sm outline-none transition-shadow duration-200 focus:shadow-[0_0_0_3px_rgba(0,200,150,0.15)]"
                style={{ border: "1px solid #E5E7EB" }}
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500">{bodyLabel}</label>
              <textarea
                value={newBody}
                onChange={(e) => setNewBody(e.target.value)}
                rows={4}
                placeholder={bodyPlaceholder}
                className="mt-1.5 w-full rounded-xl px-4 py-2.5 text-sm outline-none resize-none transition-shadow duration-200 focus:shadow-[0_0_0_3px_rgba(0,200,150,0.15)]"
                style={{ border: "1px solid #E5E7EB" }}
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500">Photo (optional)</label>
              <input
                type="file"
                accept="image/*"
                ref={newFormFileInputRef}
                className="hidden"
                onChange={(e) => pickNewImage(e.target.files?.[0])}
              />
              {newImagePreview ? (
                <div className="mt-1.5 relative inline-block">
                  <img src={newImagePreview} alt="Selected" className="rounded-xl max-h-40 object-cover" style={{ border: "1px solid #E5E7EB" }} />
                  <button
                    onClick={clearNewImage}
                    type="button"
                    className="absolute -top-2 -right-2 w-6 h-6 rounded-full flex items-center justify-center text-white transition-transform duration-200 hover:scale-110"
                    style={{ background: "#EF4444" }}
                    title="Remove picture"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => newFormFileInputRef.current?.click()}
                  className="mt-1.5 w-full sm:w-auto flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors duration-200 hover:bg-gray-50"
                  style={{ border: "1px dashed #D1D5DB", color: "#6B7280" }}
                >
                  <ImagePlus className="w-4 h-4" /> Attach a picture
                </button>
              )}
            </div>
            <button
              onClick={createTicket}
              disabled={creating}
              className="text-sm font-semibold px-5 py-2.5 rounded-full text-white transition-all duration-300 hover:scale-105 active:scale-95 disabled:hover:scale-100"
              style={{ background: "linear-gradient(135deg,#00C896,#00a67e)", opacity: creating ? 0.6 : 1, boxShadow: "0 8px 20px rgba(0,200,150,0.3)" }}
            >
              {creating ? "Submitting…" : "Submit"}
            </button>
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-5 gap-5">
        {/* Ticket list */}
        <div className="lg:col-span-2 rounded-2xl bg-white overflow-hidden" style={{ border: "1px solid #E5E7EB", boxShadow: "0 12px 30px rgba(11,31,58,0.05)" }}>
          <div className="px-5 py-3.5 flex items-center justify-between" style={{ borderBottom: "1px solid #F3F4F6" }}>
            <span className="text-xs font-bold uppercase tracking-wide text-gray-400">{listLabel}</span>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ background: "rgba(11,31,58,0.06)", color: "#0B1F3A" }}>{tickets.length}</span>
          </div>
          {ticketsLoading ? (
            <div className="p-8 text-center text-sm text-gray-400">Loading…</div>
          ) : tickets.length === 0 ? (
            <div className="p-8 text-center">
              <div className="w-14 h-14 rounded-2xl mx-auto flex items-center justify-center mb-3" style={{ background: "rgba(11,31,58,0.05)" }}>
                <HeaderIcon className="w-6 h-6" style={{ color: "#9CA3AF" }} />
              </div>
              <div className="text-sm text-gray-400">{emptyText}</div>
            </div>
          ) : (
            <div className="divide-y" style={{ borderColor: "#F3F4F6" }}>
              {tickets.map((t) => {
                const isSelected = selectedId === t.id;
                const isOpen = t.status !== "resolved";
                return (
                  <button
                    key={t.id}
                    onClick={() => openTicket(t.id)}
                    className="relative w-full text-left px-5 py-4 flex items-start gap-3 transition-all duration-200 hover:bg-gray-50"
                    style={isSelected ? { background: "rgba(0,200,150,0.06)" } : {}}
                  >
                    {isSelected && <span className="absolute left-0 top-0 bottom-0 w-1" style={{ background: "linear-gradient(180deg,#00C896,#00a67e)" }} />}
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                      style={{ background: isOpen ? "linear-gradient(135deg,#F8B400,#e0a200)" : "linear-gradient(135deg,#00C896,#00a67e)" }}
                    >
                      <HeaderIcon className="w-4 h-4 text-white" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-semibold truncate" style={{ color: "#111827" }}>{t.subject}</span>
                        <TicketStatusPill status={t.status} />
                      </div>
                      <div className="text-[11px] text-gray-400 mt-1">{t.id} · {new Date(t.createdAt).toLocaleDateString(undefined, { day: "numeric", month: "short" })}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Conversation */}
        <div className="lg:col-span-3 rounded-2xl bg-white overflow-hidden flex flex-col" style={{ border: "1px solid #E5E7EB", minHeight: 360, boxShadow: "0 12px 30px rgba(11,31,58,0.05)" }}>
          {!selectedTicket ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center px-6">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: "rgba(0,200,150,0.08)" }}>
                <MessageCircle className="w-7 h-7" style={{ color: "#00a67e" }} />
              </div>
              <div className="text-sm text-gray-400">Select a ticket to see the conversation.</div>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between gap-3 px-5 py-3.5" style={{ borderBottom: "1px solid #F3F4F6" }}>
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "linear-gradient(135deg,#0B1F3A,#0F2E52)" }}>
                    <LifeBuoy className="w-4 h-4 text-white" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-bold truncate" style={{ color: "#111827" }}>{selectedTicket.subject}</div>
                    <div className="text-[11px] text-gray-400">{selectedTicket.id}</div>
                  </div>
                </div>
                <TicketStatusPill status={selectedTicket.status} />
              </div>
              <div className="flex-1 p-5 overflow-y-auto" style={{ maxHeight: 420, background: "linear-gradient(180deg,#FAFBFC,#ffffff)" }}>
                <TicketThread messages={messages[selectedId]} loading={messagesLoading} viewerRole="seller" />
              </div>
              <div className="p-4 flex items-center gap-2" style={{ borderTop: "1px solid #F3F4F6" }}>
                <input
                  type="file"
                  accept="image/*"
                  ref={fileInputRef}
                  className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) sendImage(f); e.target.value = ""; }}
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingImage}
                  title="Attach a picture"
                  className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-200 hover:scale-110 active:scale-95 disabled:opacity-40 disabled:hover:scale-100"
                  style={{ border: "1px solid #E5E7EB", color: uploadingImage ? "#00a67e" : "#6B7280" }}
                >
                  <ImagePlus className={`w-4 h-4 ${uploadingImage ? "animate-pulse" : ""}`} />
                </button>
                <input
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") sendReply(); }}
                  placeholder="Type a reply…"
                  className="flex-1 rounded-full px-4 py-2.5 text-sm outline-none transition-shadow duration-200 focus:shadow-[0_0_0_3px_rgba(0,200,150,0.15)]"
                  style={{ border: "1px solid #E5E7EB" }}
                />
                <button onClick={sendReply} disabled={sending || !reply.trim()} className="text-sm font-semibold px-5 py-2.5 rounded-full text-white transition-all duration-300 hover:scale-105 active:scale-95 disabled:opacity-40 disabled:hover:scale-100" style={{ background: "linear-gradient(135deg,#00C896,#00a67e)", boxShadow: "0 6px 16px rgba(0,200,150,0.3)" }}>
                  Send
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function AdminTicketsPanel({
  notify, category = "support", icon: HeaderIcon = MessageCircle, idPrefix = "TCK",
  heading = "Tickets — all sellers", subheading = (openCount) => `${openCount} open ticket${openCount === 1 ? "" : "s"} waiting on a reply.`,
  emptyText = "No tickets here.", replyPlaceholder = "Reply as Customer Support…", senderDisplayName = "Customer Support",
}) {
  const [tickets, setTickets] = useState([]);
  const [ticketsLoading, setTicketsLoading] = useState(true);
  const [filter, setFilter] = useState("open"); // all | open | resolved
  const [selectedId, setSelectedId] = useState(null);
  const [messages, setMessages] = useState({});
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef(null);

  const loadTickets = async () => {
    setTicketsLoading(true);
    setTickets(await fetchAllTickets(category));
    setTicketsLoading(false);
  };
  useEffect(() => { loadTickets(); }, [category]); // eslint-disable-line

  const openTicket = async (id) => {
    setSelectedId(id);
    if (!messages[id]) {
      setMessagesLoading(true);
      const list = await fetchTicketMessages(id);
      setMessages((prev) => ({ ...prev, [id]: list }));
      setMessagesLoading(false);
    }
  };

  const sendReply = async () => {
    if (!reply.trim() || !selectedId) return;
    setSending(true);
    const { error } = await supabase.from("ticket_messages").insert({
      ticket_id: selectedId, sender: "admin", sender_name: senderDisplayName, body: reply.trim(),
    });
    setSending(false);
    if (error) { notify && notify("Could not send message."); return; }
    setMessages((prev) => ({
      ...prev,
      [selectedId]: [...(prev[selectedId] || []), { id: "local-" + Date.now(), ticketId: selectedId, sender: "admin", senderName: senderDisplayName, body: reply.trim(), createdAt: new Date().toISOString() }],
    }));
    setReply("");
  };

  const sendImage = async (file) => {
    if (!file || !selectedId) return;
    setUploadingImage(true);
    const { url, error: upErr } = await uploadTicketImage(file);
    if (upErr) { setUploadingImage(false); notify && notify(upErr); return; }
    const { error } = await supabase.from("ticket_messages").insert({
      ticket_id: selectedId, sender: "admin", sender_name: senderDisplayName, body: "", image_url: url,
    });
    setUploadingImage(false);
    if (error) { notify && notify("Could not send the picture."); return; }
    setMessages((prev) => ({
      ...prev,
      [selectedId]: [...(prev[selectedId] || []), { id: "local-" + Date.now(), ticketId: selectedId, sender: "admin", senderName: senderDisplayName, body: "", imageUrl: url, createdAt: new Date().toISOString() }],
    }));
  };

  const toggleResolve = async (id, currentStatus) => {
    const nextStatus = currentStatus === "resolved" ? "open" : "resolved";
    setResolving(true);
    const { error } = await supabase.from("tickets").update({ status: nextStatus }).eq("id", id);
    setResolving(false);
    if (error) { notify && notify("Could not update ticket status."); return; }
    setTickets((prev) => prev.map((t) => (t.id === id ? { ...t, status: nextStatus } : t)));
    notify && notify(nextStatus === "resolved" ? "Ticket marked resolved." : "Ticket reopened.");
  };

  const selectedTicket = tickets.find((t) => t.id === selectedId);
  const filteredTickets = tickets.filter((t) => (filter === "all" ? true : t.status === filter));
  const openCount = tickets.filter((t) => t.status !== "resolved").length;

  return (
    <div>
      <div className="relative overflow-hidden rounded-3xl px-7 py-8 mb-6" style={{ background: "linear-gradient(120deg,#0B1F3A 0%,#0F2E52 55%,#0B7A5E 130%)" }}>
        <div className="absolute inset-0 opacity-[0.07]" style={{ backgroundImage: "radial-gradient(circle, #ffffff 1px, transparent 1px)", backgroundSize: "18px 18px" }} />
        <div className="absolute -top-14 -right-10 w-56 h-56 rounded-full opacity-30 blur-3xl" style={{ background: "#00C896", animation: "blobMove 9s ease-in-out infinite" }} />
        <div className="absolute -bottom-20 left-1/4 w-52 h-52 rounded-full opacity-20 blur-3xl" style={{ background: "#F8B400", animation: "blobMove 11s ease-in-out infinite reverse" }} />
        <div className="relative flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background: "rgba(0,200,150,0.18)" }}>
            <HeaderIcon className="w-7 h-7" style={{ color: "#00e0aa" }} />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-white" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{heading}</h1>
            <p className="text-sm text-white/70 mt-1">{subheading(openCount)}</p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 mb-4">
        {[{ id: "open", label: "Open" }, { id: "resolved", label: "Resolved" }, { id: "all", label: "All" }].map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className="text-xs font-semibold px-3.5 py-2 rounded-full transition-colors"
            style={filter === f.id ? { background: "#0B1F3A", color: "#fff" } : { background: "#F3F4F6", color: "#6B7280" }}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="grid lg:grid-cols-5 gap-5">
        {/* Ticket list */}
        <div className="lg:col-span-2 rounded-2xl bg-white overflow-hidden" style={{ border: "1px solid #E5E7EB" }}>
          {ticketsLoading ? (
            <div className="p-6 text-center text-sm text-gray-400">Loading tickets…</div>
          ) : filteredTickets.length === 0 ? (
            <div className="p-6 text-center text-sm text-gray-400">{emptyText}</div>
          ) : (
            <div className="divide-y" style={{ borderColor: "#F3F4F6" }}>
              {filteredTickets.map((t) => (
                <button
                  key={t.id}
                  onClick={() => openTicket(t.id)}
                  className="w-full text-left px-5 py-3.5 transition-colors hover:bg-gray-50"
                  style={selectedId === t.id ? { background: "rgba(0,200,150,0.06)" } : {}}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold truncate" style={{ color: "#111827" }}>{t.subject}</span>
                    <TicketStatusPill status={t.status} />
                  </div>
                  <div className="text-[11px] text-gray-400 mt-1 truncate">{t.sellerName || t.sellerEmail} · {t.sellerEmail}</div>
                  <div className="text-[11px] text-gray-300 mt-0.5">{t.id} · {new Date(t.createdAt).toLocaleDateString(undefined, { day: "numeric", month: "short" })}</div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Conversation */}
        <div className="lg:col-span-3 rounded-2xl bg-white overflow-hidden flex flex-col" style={{ border: "1px solid #E5E7EB", minHeight: 360 }}>
          {!selectedTicket ? (
            <div className="flex-1 flex items-center justify-center text-sm text-gray-400">Select a ticket to see the conversation.</div>
          ) : (
            <>
              <div className="flex items-center justify-between gap-2 px-5 py-3.5" style={{ borderBottom: "1px solid #F3F4F6" }}>
                <div className="min-w-0">
                  <div className="text-sm font-bold truncate" style={{ color: "#111827" }}>{selectedTicket.subject}</div>
                  <div className="text-[11px] text-gray-400 truncate">{selectedTicket.sellerName || selectedTicket.sellerEmail} · {selectedTicket.sellerEmail}</div>
                </div>
                <button
                  onClick={() => toggleResolve(selectedTicket.id, selectedTicket.status)}
                  disabled={resolving}
                  className="text-xs font-semibold px-3.5 py-2 rounded-full flex-shrink-0"
                  style={selectedTicket.status === "resolved" ? { border: "1px solid #E5E7EB", color: "#6B7280" } : { background: "#00C896", color: "#fff" }}
                >
                  {selectedTicket.status === "resolved" ? "Reopen" : "Mark resolved"}
                </button>
              </div>
              <div className="flex-1 p-5 overflow-y-auto" style={{ maxHeight: 420 }}>
                <TicketThread messages={messages[selectedId]} loading={messagesLoading} viewerRole="admin" />
              </div>
              <div className="p-4 flex items-center gap-2" style={{ borderTop: "1px solid #F3F4F6" }}>
                <input
                  type="file"
                  accept="image/*"
                  ref={fileInputRef}
                  className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) sendImage(f); e.target.value = ""; }}
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingImage}
                  title="Attach a picture"
                  className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 disabled:opacity-40"
                  style={{ border: "1px solid #E5E7EB", color: "#6B7280" }}
                >
                  <ImagePlus className="w-4 h-4" />
                </button>
                <input
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") sendReply(); }}
                  placeholder={replyPlaceholder}
                  className="flex-1 rounded-full px-4 py-2.5 text-sm outline-none"
                  style={{ border: "1px solid #E5E7EB" }}
                />
                <button onClick={sendReply} disabled={sending || !reply.trim()} className="text-sm font-semibold px-5 py-2.5 rounded-full text-white transition-transform hover:scale-105 disabled:opacity-40" style={{ background: "linear-gradient(135deg,#00C896,#00a67e)" }}>
                  Send
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   HOME PAGE (marketing site, composed from sections above)
============================================================ */
function HomePage({ session, onNav, onLogout }) {
  return (
    <div style={{ fontFamily: "Inter, sans-serif" }}>
      <Navbar session={session} onNav={onNav} onLogout={onLogout} />
      <Hero onSignup={() => onNav("signup")} />
      <TrustStrip />
      <Features />
      <InAction />
      <OrderFlow />
      <DashboardPreview />
      <Testimonials />
      <FAQ />
      <CTA onSignup={() => onNav("signup")} />
      <Footer />
    </div>
  );
}

/* ============================================================
   ROOT APP — routes between Home / Signup / Login / Dashboard
============================================================ */
// Floating WhatsApp button — sits bottom-right on every page, always one tap away.
function FloatingWhatsApp() {
  return (
    <a
      href="https://wa.me/971568328274"
      target="_blank"
      rel="noopener noreferrer"
      title="Chat with us on WhatsApp"
      className="fixed bottom-5 right-5 z-50 w-14 h-14 rounded-full flex items-center justify-center transition-transform duration-300 hover:scale-110 active:scale-95"
      style={{ background: "#25D366", boxShadow: "0 10px 24px rgba(37,211,102,0.45)" }}
    >
      <span className="absolute inset-0 rounded-full" style={{ background: "#25D366", animation: "livePulse 2.2s infinite" }} />
      <svg viewBox="0 0 24 24" className="relative w-7 h-7" fill="#fff"><path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.7.44 3.35 1.29 4.81L2 22l5.4-1.41a9.9 9.9 0 0 0 4.64 1.18h.01c5.46 0 9.9-4.45 9.9-9.91C21.95 6.45 17.5 2 12.04 2zm0 18.13h-.01a8.2 8.2 0 0 1-4.19-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.18 8.18 0 0 1-1.26-4.36c0-4.52 3.68-8.2 8.21-8.2 2.19 0 4.25.86 5.8 2.4a8.14 8.14 0 0 1 2.4 5.8c0 4.52-3.68 8.2-8.16 8.2zm4.5-6.13c-.25-.12-1.47-.72-1.69-.81-.23-.08-.4-.12-.56.13-.17.25-.64.81-.79.97-.14.17-.29.19-.54.06-.25-.12-1.04-.38-1.98-1.22-.73-.65-1.23-1.46-1.37-1.71-.14-.25-.02-.38.11-.51.11-.11.25-.29.37-.43.12-.14.16-.25.25-.41.08-.17.04-.31-.02-.44-.06-.12-.56-1.35-.77-1.85-.2-.48-.41-.42-.56-.43h-.48c-.17 0-.44.06-.67.31-.23.25-.87.85-.87 2.08 0 1.22.89 2.4 1.02 2.57.12.17 1.75 2.67 4.24 3.74.59.26 1.05.41 1.41.52.59.19 1.13.16 1.55.1.47-.07 1.47-.6 1.68-1.18.21-.58.21-1.08.14-1.18-.06-.11-.23-.17-.48-.29z"/></svg>
    </a>
  );
}

export default function EmirateFulfilApp() {
  useGoogleFonts();

  // Register the PWA service worker (public/sw.js) so the app is
  // installable and the app shell loads instantly on repeat visits.
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);

  const initialRoute = pathToRoute(window.location.pathname);
  const [view, setView] = useState(initialRoute.view); // home | signup | login | forgot | reset-password | dashboard
  const [dashboardTab, setDashboardTab] = useState(initialRoute.tab); // synced with /dashboard/<tab> in the URL
  const [dashRemountKey, setDashRemountKey] = useState(0); // bumped on browser back/forward so Dashboard re-reads the URL's tab
  const isFirstRoute = useRef(true);
  const fromPopstate = useRef(false);
  const [session, setSession] = useState(null);
  const [toastMsg, setToastMsg] = useState("");
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [logoUrl, setLogoUrl] = useState(null);

  const notify = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(""), msg.length > 60 ? 5000 : 2600);
  };

  // Keep the address bar in sync with view/tab. Skips the very first render
  // (the URL already matches on initial load) and skips right after a
  // browser back/forward navigation (that already changed the URL — pushing
  // again would break the back button).
  useEffect(() => {
    if (isFirstRoute.current) { isFirstRoute.current = false; return; }
    if (fromPopstate.current) { fromPopstate.current = false; return; }
    const path = routeToPath(view, dashboardTab);
    if (path !== window.location.pathname) window.history.pushState(null, "", path);
  }, [view, dashboardTab]);

  // Handle the browser's Back/Forward buttons — re-read the URL and update
  // our state to match, remounting the Dashboard so it picks up the tab.
  useEffect(() => {
    const onPopState = () => {
      const route = pathToRoute(window.location.pathname);
      fromPopstate.current = true;
      setView(route.view);
      setDashboardTab(route.tab);
      setDashRemountKey((k) => k + 1);
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  // Load the custom logo (if the admin has uploaded one) so it shows up
  // everywhere immediately — no login required, works on the public homepage.
  useEffect(() => {
    supabase
      .from("app_settings")
      .select("value")
      .eq("key", "logo_url")
      .maybeSingle()
      .then(({ data }) => {
        if (data?.value) setLogoUrl(data.value);
      });
  }, []);

  // Restore session on page load/refresh so users stay logged in.
  // Nothing renders until this finishes, so refreshing never flashes the
  // homepage before landing back on the dashboard.
  //
  // Exception: a password-reset email link also arrives with a session
  // (Supabase logs the user in temporarily so they can set a new password).
  // Without this check, this effect would race the recovery listener below
  // and send the seller straight to the dashboard, skipping the "set a new
  // password" screen entirely — so we detect that case up front and bail.
  useEffect(() => {
    const isRecoveryLink = window.location.hash.includes("type=recovery");
    if (isRecoveryLink) {
      setView("reset-password");
      setCheckingAuth(false);
      return;
    }
    supabase.auth.getSession().then(async ({ data }) => {
      try {
        const authUser = data.session?.user;
        if (authUser) {
          const { data: profile } = await supabase.from("profiles").select("*").eq("id", authUser.id).single();
          const approval = profile?.approval_status || "pending";
          const isAdmin = ADMIN_EMAILS.includes(authUser.email);
          if (!isAdmin && approval !== "approved") {
            await supabase.auth.signOut();
            notify(
              approval === "deactivated"
                ? "Your account has been deactivated by Admin. Please contact support."
                : "Your account is still waiting for Admin approval. Please check back soon."
            );
          } else {
            setSession({
              email: authUser.email, name: profile?.name || authUser.email.split("@")[0], company: profile?.company, country: profile?.country,
              storeName: profile?.store_name, monthlyOrders: profile?.monthly_orders, whatsapp: profile?.whatsapp,
              phone: profile?.phone, bankName: profile?.bank_name, accountTitle: profile?.account_title,
              accountNumber: profile?.account_number, iban: profile?.iban,
            });
            setView("dashboard");
          }
        } else if (view === "dashboard") {
          // URL pointed straight at /dashboard but there's no session — bounce to login instead of a blank page.
          setView("login");
        }
      } finally {
        setCheckingAuth(false);
      }
    });
  }, []); // eslint-disable-line

  // Backup for the same recovery case — if the link is opened while the
  // page is already loaded (rare, but possible), this listener catches the
  // PASSWORD_RECOVERY event Supabase fires once it finishes parsing the link.
  useEffect(() => {
    const { data: listener } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setView("reset-password");
    });
    return () => listener?.subscription?.unsubscribe();
  }, []);

  const handleAuthed = (s) => { setSession(s); setView("dashboard"); };
  const handleLogout = async () => { await supabase.auth.signOut(); setSession(null); setView("home"); };

  if (checkingAuth) return <SplashLoader />;

  return (
    <div style={{ maxWidth: "none", width: "100%", margin: 0, padding: 0, textAlign: "left", overflowX: "hidden" }}>
      <style>{`
        html, body { margin: 0; padding: 0; width: 100%; max-width: 100%; overflow-x: hidden; }
        #root { max-width: none !important; width: 100% !important; margin: 0 !important; padding: 0 !important; text-align: left !important; overflow-x: hidden !important; }
      `}</style>
      <LogoContext.Provider value={{ logoUrl, setLogoUrl }}>
        <Toast message={toastMsg} />
        <InstallPrompt />
        {view === "home" && <HomePage session={session} onNav={setView} onLogout={handleLogout} />}
        {(view === "signup" || view === "login" || view === "forgot") && (
          <AuthPage mode={view} onAuthed={handleAuthed} onSwitch={setView} notify={notify} />
        )}
        {view === "reset-password" && (
          <ResetPasswordPage notify={notify} onDone={() => { supabase.auth.signOut(); setView("login"); }} />
        )}
        {view === "dashboard" && session && (
          <Dashboard key={dashRemountKey} session={session} onLogout={handleLogout} notify={notify} initialTab={dashboardTab} onTabChange={setDashboardTab} />
        )}
        <FloatingWhatsApp />
      </LogoContext.Provider>
    </div>
  );
}

function SplashLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "#0B1F3A" }}>
      <div className="flex flex-col items-center gap-4">
        <div
          className="w-12 h-12 rounded-full animate-spin"
          style={{ border: "3px solid rgba(255,255,255,0.15)", borderTopColor: "#00C896" }}
        />
        <span className="text-white/50 text-sm font-medium" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Loading…</span>
      </div>
    </div>
  );
}
