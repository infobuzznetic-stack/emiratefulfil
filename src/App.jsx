import React, { useEffect, useRef, useState, useContext, createContext } from "react";
import {
  Package, Warehouse, Truck, ClipboardCheck, RotateCcw, Boxes, ShieldCheck,
  Zap, Globe2, ChevronDown, ChevronRight, Menu, X, ArrowUpRight, Star,
  MapPin, PackageCheck, ScanBarcode, PlaneTakeoff, CheckCircle2, Sparkles,
  Layers, Receipt, Clock, CreditCard,
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

const FONT_LINK_ID = "emiratefulfil-fonts";

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
          <a href="#pricing" className="hover:text-white transition-colors">Pricing</a>
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
          <a href="#pricing">Pricing</a>
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

/* ---------------- FEATURES ---------------- */
function Features() {
  const items = [
    { icon: Zap, title: "Same-day dispatch", desc: "Orders placed before 2 PM ship the same day from any of our regional hubs." },
    { icon: ShieldCheck, title: "Verified suppliers", desc: "Every supplier on the network is vetted for quality, stock accuracy, and reliability." },
    { icon: Globe2, title: "Six-country reach", desc: "One integration delivers into the UAE, KSA, Qatar, Oman, Bahrain and Kuwait." },
    { icon: ClipboardCheck, title: "COD handled for you", desc: "Cash-on-delivery collection, reconciliation, and payout — fully managed." },
    { icon: Boxes, title: "Real-time inventory", desc: "Stock levels sync across every warehouse the moment they change." },
    { icon: RotateCcw, title: "Effortless returns", desc: "Customers initiate returns in a click; suppliers restock automatically." },
  ];
  return (
    <section id="services" className="py-28" style={{ background: "#F8FAFC" }}>
      <div className="max-w-7xl mx-auto px-6">
        <Reveal>
          <div className="max-w-xl">
            <span className="text-xs font-bold tracking-widest uppercase" style={{ color: "#00a67e" }}>Why EmirateFulfil</span>
            <h2 className="mt-3 text-4xl md:text-5xl font-extrabold" style={{ color: "#0B1F3A", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              Everything fulfillment needs, under one roof.
            </h2>
          </div>
        </Reveal>

        <div className="mt-14 grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {items.map((f, i) => (
            <Reveal key={i} delay={i * 80}>
              <div
                className="group h-full p-7 rounded-2xl bg-white transition-all duration-300 hover:-translate-y-1.5"
                style={{ border: "1px solid #E5E7EB", boxShadow: "0 1px 2px rgba(16,24,40,0.04)" }}
                onMouseEnter={(e) => (e.currentTarget.style.boxShadow = "0 20px 40px rgba(0,200,150,0.15)")}
                onMouseLeave={(e) => (e.currentTarget.style.boxShadow = "0 1px 2px rgba(16,24,40,0.04)")}
              >
                <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-5" style={{ background: "linear-gradient(135deg,#00C896,#0B1F3A)" }}>
                  <f.icon className="w-5 h-5 text-white" />
                </div>
                <h3 className="font-bold text-lg" style={{ color: "#111827", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed" style={{ color: "#6B7280" }}>{f.desc}</p>
              </div>
            </Reveal>
          ))}
        </div>
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
          <div className="rounded-2xl p-5" style={{ background: "#0B1F3A", boxShadow: "0 30px 70px rgba(11,31,58,0.35)" }}>
            <div className="flex items-center gap-1.5 mb-4">
              <div className="w-2.5 h-2.5 rounded-full bg-red-400/70" />
              <div className="w-2.5 h-2.5 rounded-full bg-yellow-400/70" />
              <div className="w-2.5 h-2.5 rounded-full bg-green-400/70" />
            </div>
            <div className="grid grid-cols-3 gap-3 mb-5">
              {[
                { label: "Today's orders", val: 214, color: "#00C896" },
                { label: "Pending", val: 32, color: "#F8B400" },
                { label: "Delivered", val: 178, color: "#3B82F6" },
              ].map((c, i) => (
                <div key={i} className="rounded-xl p-4" style={{ background: "rgba(255,255,255,0.05)" }}>
                  <div className="text-2xl font-bold text-white"><Counter to={c.val} /></div>
                  <div className="text-[11px] mt-1" style={{ color: c.color }}>{c.label}</div>
                </div>
              ))}
            </div>
            <div className="rounded-xl p-5" style={{ background: "rgba(255,255,255,0.05)" }}>
              <div className="text-xs text-white/50 mb-4">Weekly fulfillment volume</div>
              <div className="flex items-end gap-2.5 h-32">
                {bars.map((h, i) => (
                  <div key={i} className="flex-1 rounded-t-md" style={{ height: `${h}%`, background: "linear-gradient(180deg,#00C896,#0B4a3a)", transition: "height 1s ease", animation: `growBar 1.2s ease ${i * 0.08}s both` }} />
                ))}
              </div>
              <style>{`@keyframes growBar { from { transform: scaleY(0); transform-origin: bottom; } to { transform: scaleY(1); transform-origin: bottom; } }`}</style>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ---------------- PRICING ---------------- */
function Pricing() {
  const plans = [
    { name: "Starter", price: 0, unit: "/mo", desc: "For sellers testing the market", features: ["Up to 50 orders/mo", "1 warehouse zone", "Email support", "Standard shipping rates"], cta: "Start free" },
    { name: "Growth", price: 349, unit: "/mo", desc: "For sellers scaling across the Gulf", features: ["Up to 2,000 orders/mo", "All 6 GCC markets", "Priority support", "COD management", "API access"], cta: "Start free trial", highlighted: true },
    { name: "Enterprise", price: null, unit: "", desc: "For high-volume brands & marketplaces", features: ["Unlimited orders", "Dedicated warehouse space", "Dedicated account manager", "Custom integrations"], cta: "Talk to sales" },
  ];
  return (
    <section id="pricing" className="py-28" style={{ background: "#0B1F3A" }}>
      <div className="max-w-7xl mx-auto px-6">
        <Reveal>
          <div className="text-center max-w-xl mx-auto">
            <span className="text-xs font-bold tracking-widest uppercase" style={{ color: "#F8B400" }}>Pricing</span>
            <h2 className="mt-3 text-4xl md:text-5xl font-extrabold text-white" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              Simple pricing, built to scale with you.
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
                <button
                  className="mt-8 w-full text-sm font-semibold py-3 rounded-full transition-transform hover:scale-[1.02]"
                  style={p.highlighted ? { background: "linear-gradient(135deg,#00C896,#00a67e)", color: "#04140f" } : { background: "rgba(255,255,255,0.08)", color: "#fff" }}
                >
                  {p.cta}
                </button>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------------- TESTIMONIALS ---------------- */
function Testimonials() {
  const items = [
    { name: "Sara Al Mansoori", role: "Founder, Noon Threads", quote: "Dispatch time dropped from three days to same-day. Our Riyadh customers noticed immediately.", rating: 5 },
    { name: "Hamdan Al Suwaidi", role: "Ops Lead, Gulf Gadgets", quote: "The dashboard replaced four spreadsheets. Stock, orders, and payouts finally live in one place.", rating: 5 },
    { name: "Fatima Khalil", role: "Seller, Doha Beauty Co.", quote: "Returns used to be a nightmare across borders. Now it's a single click for our customers.", rating: 5 },
  ];
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
    <section id="faq" className="py-28" style={{ background: "#0B1F3A" }}>
      <div className="max-w-3xl mx-auto px-6">
        <Reveal>
          <div className="text-center">
            <span className="text-xs font-bold tracking-widest uppercase" style={{ color: "#F8B400" }}>FAQ</span>
            <h2 className="mt-3 text-4xl font-extrabold text-white" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Questions, answered.</h2>
          </div>
        </Reveal>
        <div className="mt-12 space-y-3">
          {qs.map((item, i) => (
            <Reveal key={i} delay={i * 60}>
              <div className="rounded-xl overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.1)" }}>
                <button
                  className="w-full flex items-center justify-between px-6 py-5 text-left text-white font-semibold text-sm"
                  onClick={() => setOpen(open === i ? -1 : i)}
                >
                  {item.q}
                  <ChevronDown className="w-4 h-4 flex-shrink-0 transition-transform" style={{ transform: open === i ? "rotate(180deg)" : "none" }} />
                </button>
                <div style={{ maxHeight: open === i ? "160px" : "0px", overflow: "hidden", transition: "max-height 0.35s ease" }}>
                  <p className="px-6 pb-5 text-sm text-white/55 leading-relaxed">{item.a}</p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
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
  return data.map((p) => ({ id: p.id, name: p.name, category: p.category, cost: Number(p.cost), sell: Number(p.sell), emoji: p.emoji, description: p.description, image_url: p.image_url, images: Array.isArray(p.images) ? p.images : [] }));
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
    customerEmail: o.customer_email, customerPhone: o.customer_phone, customerAddress: o.customer_address,
    trackingNumber: o.tracking_number, paymentStatus: o.payment_status || "unpaid",
    deliveryCharge: o.delivery_charge != null ? Number(o.delivery_charge) : DELIVERY_CHARGE,
    createdAt: o.created_at,
  }));
}

/* ============================================================
   TOAST
============================================================ */
function Toast({ message }) {
  if (!message) return null;
  return (
    <div
      className="fixed top-5 left-1/2 -translate-x-1/2 z-[100] px-5 py-3 rounded-full text-sm font-semibold text-white shadow-xl"
      style={{ background: "#0B1F3A" }}
    >
      {message}
    </div>
  );
}

/* ============================================================
   AUTH PAGE (Signup / Login)
============================================================ */
function AuthPage({ mode, onAuthed, onSwitch, notify }) {
  const isSignup = mode === "signup";
  const [form, setForm] = useState({ name: "", phone: "", company: "", country: "UAE", email: "", password: "" });
  const [busy, setBusy] = useState(false);
  useGoogleFonts();

  const update = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    const email = form.email.trim().toLowerCase();
    if (isSignup) {
      if (!form.name || !email || !form.password) { notify("Please fill in all required fields."); setBusy(false); return; }
      const { data, error } = await supabase.auth.signUp({
        email, password: form.password,
        options: { data: { name: form.name, phone: form.phone, company: form.company, country: form.country } },
      });
      if (error) { notify(error.message); setBusy(false); return; }
      notify("Thanks for signing up, " + form.name.split(" ")[0] + "! Please check your email to verify your account, then log in.");
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
      onAuthed({ email, name: displayName, company: profile?.company, country: profile?.country });
      notify("Welcome back, " + displayName.split(" ")[0] + ".");
    }
    setBusy(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-16" style={{ background: "#081221", fontFamily: "Inter, sans-serif" }}>
      <div className="w-full max-w-md">
        <button onClick={() => onSwitch("home")} className="flex items-center gap-2.5 justify-center mb-8 w-full">
          <Logo />
          <span className="font-bold text-white text-lg" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            Emirate<span style={{ color: "#00C896" }}>Fulfil</span>
          </span>
        </button>

        <div className="rounded-2xl p-8" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
          <h2 className="text-2xl font-bold text-white" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            {isSignup ? "Create your seller account" : "Welcome back"}
          </h2>
          <p className="text-sm text-white/45 mt-1">{isSignup ? "Start selling on COD in under a minute." : "Log in to your seller portal."}</p>

          <form onSubmit={submit} className="mt-6 space-y-4">
            {isSignup && (
              <>
                <Field label="Full name" value={form.name} onChange={update("name")} placeholder="Ahmed Khan" required />
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Phone" value={form.phone} onChange={update("phone")} placeholder="+971 5x xxx xxxx" />
                  <div>
                    <label className="text-xs text-white/50">Country</label>
                    <select value={form.country} onChange={update("country")} className="mt-1 w-full rounded-xl px-3 py-2.5 text-white text-sm outline-none" style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)" }}>
                      <option value="UAE" style={{ color: "#000" }}>UAE</option>
                      <option value="KSA" style={{ color: "#000" }}>KSA</option>
                    </select>
                  </div>
                </div>
                <Field label="Company (optional)" value={form.company} onChange={update("company")} placeholder="Your store name" />
              </>
            )}
            <Field label="Email" type="email" value={form.email} onChange={update("email")} placeholder="you@example.com" required />
            <Field label="Password" type="password" value={form.password} onChange={update("password")} placeholder="••••••••" required />
            <button
              type="submit"
              disabled={busy}
              className="w-full font-semibold py-3 rounded-full mt-2 transition-transform hover:scale-[1.02] disabled:opacity-60"
              style={{ background: "linear-gradient(135deg,#00C896,#00a67e)", color: "#04140f" }}
            >
              {busy ? "Please wait…" : isSignup ? "Create account" : "Log in"}
            </button>
          </form>

          <p className="text-center text-sm text-white/45 mt-5">
            {isSignup ? "Already have an account?" : "Don't have an account?"}{" "}
            <button onClick={() => onSwitch(isSignup ? "login" : "signup")} className="font-semibold" style={{ color: "#00C896" }}>
              {isSignup ? "Log in" : "Sign up"}
            </button>
          </p>
        </div>
        <p className="text-center text-xs text-white/25 mt-6">Demo prototype — accounts are stored for this app only, not production-secure.</p>
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
   SELLER DASHBOARD
============================================================ */
function Dashboard({ session, onLogout, notify }) {
  const isAdmin = ADMIN_EMAILS.includes(session.email);
  const [tab, setTab] = useState(() => readLocal("ef_tab", "overview"));
  const [region, setRegion] = useState("UAE"); // UAE | KSA — which country's dashboard is showing
  const [catalog, setCatalog] = useState([]);
  const [listings, setListings] = useState([]);
  const [orders, setOrders] = useState([]);
  const [sellerCount, setSellerCount] = useState(0);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  // Remember which sidebar tab the seller was on, so refreshing the page doesn't bounce them back to Dashboard.
  useEffect(() => { writeLocal("ef_tab", tab); }, [tab]);

  const reload = async () => {
    setCatalog(await fetchCatalog());
    setListings(await fetchListings(session.email));
    setOrders(await fetchOrders(session.email));
    if (isAdmin) {
      const { count } = await supabase.from("profiles").select("*", { count: "exact", head: true });
      setSellerCount(count || 0);
    }
  };
  useEffect(() => { reload(); }, []); // eslint-disable-line

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
      status: "pending", payment_status: "unpaid", delivery_charge: newOrder.deliveryCharge,
    });
    if (error) { notify("Could not save order."); return null; }
    setOrders([newOrder, ...orders]);
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
    { id: "categories", label: "Categories", icon: Layers },
    { id: "orders", label: "Orders", icon: Truck },
    { id: "invoices", label: "Invoices", icon: Receipt },
    { id: "settings", label: "Settings", icon: Sparkles },
    ...(isAdmin ? [{ id: "admin", label: "Admin", icon: Globe2 }] : []),
  ];

  return (
    <div style={{ fontFamily: "Inter, sans-serif", background: "linear-gradient(180deg,#EEF2F8 0%,#F8FAFC 320px,#F8FAFC 100%)", position: "relative", overflow: "hidden" }} className="min-h-screen flex">
      <div className="pointer-events-none absolute -top-24 -left-24 w-[420px] h-[420px] rounded-full opacity-[0.10] blur-3xl" style={{ background: "#00C896" }} />
      <div className="pointer-events-none absolute top-40 -right-32 w-[380px] h-[380px] rounded-full opacity-[0.08] blur-3xl" style={{ background: "#F8B400" }} />
      <div className="pointer-events-none absolute top-0 left-0 right-0 h-72" style={{ background: "linear-gradient(180deg, rgba(11,31,58,0.04), transparent)" }} />
      {/* Sidebar */}
      <aside className="hidden md:flex flex-col w-64 px-5 py-6 min-h-screen relative z-10" style={{ background: "#0B1F3A" }}>
        <div className="flex items-center gap-2.5 px-2">
          <Logo />
          <span className="font-bold text-white text-lg" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            Emirate<span style={{ color: "#00C896" }}>Fulfil</span>
          </span>
        </div>
        <div className="mt-8 space-y-1">
          {NAV.map((n) => (
            <button
              key={n.id} onClick={() => setTab(n.id)}
              className="group w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 ease-out hover:scale-[1.03] hover:translate-x-1 active:scale-95"
              style={
                tab === n.id
                  ? { background: "rgba(0,200,150,0.15)", color: "#00C896", boxShadow: "0 4px 14px rgba(0,200,150,0.18)" }
                  : { color: "rgba(255,255,255,0.6)" }
              }
            >
              <n.icon
                className="w-4.5 h-4.5 transition-transform duration-300 ease-out group-hover:rotate-6 group-hover:scale-110"
                style={tab === n.id ? { color: "#00C896" } : {}}
              />
              <span className="transition-transform duration-300 group-hover:translate-x-0.5">{n.label}</span>
            </button>
          ))}
        </div>
        <div className="mt-auto pt-6" style={{ borderTop: "1px solid rgba(255,255,255,0.1)" }}>
          <div className="text-white text-sm font-semibold">{session.name}</div>
          <div className="text-white/40 text-xs">{session.company || "Seller account"}</div>
          <button onClick={onLogout} className="mt-3 text-white/60 text-xs font-semibold hover:text-white">Log out</button>
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
              onClick={() => { setTab(n.id); setMobileNavOpen(false); }}
              className="group w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-white/80 transition-all duration-300 ease-out hover:scale-[1.02] hover:translate-x-1 active:scale-95"
              style={{
                animation: `dashFadeIn 0.35s ease-out ${i * 60}ms both`,
                ...(tab === n.id ? { background: "rgba(0,200,150,0.15)", color: "#00C896" } : {}),
              }}
            >
              <n.icon className="w-4.5 h-4.5 transition-transform duration-300 group-hover:rotate-6 group-hover:scale-110" /> {n.label}
            </button>
          ))}
          <button onClick={onLogout} className="w-full text-left px-3 py-2.5 text-sm font-semibold text-red-300 transition-transform duration-300 hover:translate-x-1 active:scale-95">Log out</button>
        </div>
      )}
      <style>{`
        @keyframes dashFadeIn {
          from { opacity: 0; transform: translateY(-6px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes dashTabIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* Main */}
      <main className="flex-1 px-6 md:px-10 py-8 md:py-8 pt-24 md:pt-8 max-w-6xl relative z-10">
        <div key={tab + region} style={{ animation: "dashTabIn 0.35s ease-out both" }}>
          {tab === "overview" && (
            <OverviewTab
              session={session} orders={orders} listings={listings} catalog={catalog} setTab={setTab}
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
          {/* Settings and Admin aren't country-specific, so they stay open regardless of the region switch.
              Every other tab is UAE-only for now — switching to KSA/Qatar shows Coming Soon everywhere. */}
          {tab !== "overview" && tab !== "settings" && tab !== "admin" && region !== "UAE" && (
            <ComingSoonPanel region={region} />
          )}
          {(tab === "settings" || region === "UAE") && (
            <>
              {tab === "products" && <CatalogTab catalog={catalog} onAdd={addListing} onPlaceOrder={addOrder} notify={notify} onViewOrders={() => setTab("orders")} sellerEmail={session.email} isAdmin={isAdmin} onCatalogChanged={reload} />}
              {tab === "categories" && <CategoriesTab catalog={catalog} listings={listings} onAdd={addListing} />}
              {tab === "orders" && (
                <OrdersTab orders={orders} confirmedProfit={confirmedProfit} deliveredRevenue={paidInvoice} returnedCount={returned.length} />
              )}
              {tab === "invoices" && <InvoicesTab orders={orders} session={session} unpaidInvoice={unpaidInvoice} paidInvoice={paidInvoice} />}
              {tab === "settings" && <SettingsTab session={session} />}
            </>
          )}
          {tab === "admin" && isAdmin && <AdminTab catalog={catalog} sellerCount={sellerCount} notify={notify} onCatalogChanged={reload} />}
        </div>
      </main>
    </div>
  );
}

function StatCard({ label, value, color = "#0B1F3A", sub, prefix = "", delay = 0, icon: Icon }) {
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
      className="rounded-2xl p-5 bg-white transition-all duration-500 cursor-default"
      style={{
        border: "1px solid #E5E7EB",
        opacity: shown ? 1 : 0,
        transform: shown ? (hover ? "translateY(-4px) scale(1.02)" : "translateY(0px) scale(1)") : "translateY(14px) scale(0.97)",
        boxShadow: hover ? "0 14px 30px rgba(11,31,58,0.12)" : "0 0px 0px rgba(0,0,0,0)",
      }}
    >
      <div className="flex items-center justify-between">
        <div className="text-xs text-gray-500">{label}</div>
        {Icon && (
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center transition-transform duration-500"
            style={{ background: color + "1A", transform: hover ? "rotate(-8deg) scale(1.08)" : "rotate(0deg) scale(1)" }}
          >
            <Icon className="w-4 h-4" style={{ color }} />
          </div>
        )}
      </div>
      <div className="text-2xl font-bold mt-2" style={{ color, fontFamily: "'Space Grotesk', sans-serif" }}>
        {prefix}{display.toLocaleString()}
      </div>
      {sub && <div className="text-xs text-gray-400 mt-1">{sub}</div>}
    </div>
  );
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
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  return { dateLabel, timeLabel, greeting };
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
  session, orders, listings, catalog, setTab,
  region, setRegion,
  regionOrders, regionConfirmedProfit,
  regionUnpaidInvoice, regionPaidInvoice,
  regionPending, regionShipped, regionDelivered, regionCancelled, regionReturned,
}) {
  const topListing = catalog.find((p) => p.id === listings[0]);
  const { dateLabel, timeLabel, greeting } = LiveClock();
  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const ordersThisWeek = orders.filter((o) => o.createdAt && new Date(o.createdAt).getTime() >= sevenDaysAgo).length;

  const cards = [
    { label: "Total orders", value: regionOrders.length, color: "#0B1F3A", icon: Boxes },
    { label: "Pending", value: regionPending.length, color: "#F8B400", icon: ClipboardCheck },
    { label: "Shipped", value: regionShipped.length, color: "#3B82F6", icon: Truck },
    { label: "Delivered", value: regionDelivered.length, color: "#00C896", icon: CheckCircle2 },
    { label: "Cancelled", value: regionCancelled.length, color: "#9CA3AF", icon: X },
    { label: "Returned", value: regionReturned.length, color: "#EF4444", icon: RotateCcw },
    { label: "Confirmed profit", value: regionConfirmedProfit, prefix: "AED ", color: "#00C896", icon: ShieldCheck },
    { label: "Unpaid invoice", value: regionUnpaidInvoice, prefix: "AED ", color: "#F8B400", icon: Receipt },
    { label: "Paid invoice", value: regionPaidInvoice, prefix: "AED ", color: "#00C896", icon: CheckCircle2 },
  ];
  const breakdown = [
    { label: "Pending", count: regionPending.length, color: "#F8B400" },
    { label: "Shipped", count: regionShipped.length, color: "#3B82F6" },
    { label: "Delivered", count: regionDelivered.length, color: "#00C896" },
    { label: "Cancelled", count: regionCancelled.length, color: "#9CA3AF" },
    { label: "Returned", count: regionReturned.length, color: "#EF4444" },
  ];
  const totalForBar = regionOrders.length || 1;
  const regions = [
    { id: "UAE", flag: "🇦🇪", live: true },
    { id: "KSA", flag: "🇸🇦", live: false },
    { id: "QATAR", flag: "🇶🇦", live: false },
  ];

  const quickActions = [
    { label: "Add product", tab: "products", icon: Package, color: "#00C896" },
    { label: "Log order", tab: "orders", icon: Truck, color: "#3B82F6" },
    { label: "View invoices", tab: "invoices", icon: PackageCheck, color: "#F8B400" },
    { label: "Browse categories", tab: "categories", icon: ClipboardCheck, color: "#0B1F3A" },
  ];

  return (
    <div>
      <div className="relative overflow-hidden rounded-3xl px-7 py-8 mb-7" style={{ background: "linear-gradient(120deg,#0B1F3A 0%,#0F2E52 55%,#0B7A5E 130%)" }}>
        <div className="absolute -top-16 -right-10 w-56 h-56 rounded-full opacity-25 blur-2xl" style={{ background: "#00C896" }} />
        <div className="absolute -bottom-20 left-1/3 w-64 h-64 rounded-full opacity-10 blur-2xl" style={{ background: "#F8B400" }} />
        <div className="relative flex flex-col sm:flex-row sm:items-end sm:justify-between gap-5">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-semibold tracking-widest uppercase" style={{ color: "#7FE8C9" }}>{dateLabel}</span>
              <span className="text-white/30">·</span>
              <span className="text-xs font-semibold tracking-widest" style={{ color: "#7FE8C9", fontFamily: "'Space Grotesk', sans-serif" }}>{timeLabel}</span>
            </div>
            <h1 className="mt-2 text-3xl font-extrabold text-white" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              {greeting}, {session.name.split(" ")[0]}
            </h1>
            <p className="mt-1.5 text-sm text-white/60 max-w-md">
              {region === "UAE"
                ? <>Here's how your UAE store is doing today — {regionOrders.length} order{regionOrders.length === 1 ? "" : "s"} logged so far.</>
                : <>Preview your future {region === "KSA" ? "Saudi" : "Qatar"} storefront below.</>}
            </p>
          </div>
          <div className="flex items-center gap-4 flex-wrap">
            {/* UAE / KSA / Qatar region switch */}
            <div className="flex items-center rounded-full p-1 relative" style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.14)" }}>
              {regions.map((r) => (
                <button
                  key={r.id}
                  onClick={() => setRegion(r.id)}
                  className="relative z-10 px-4 py-1.5 rounded-full text-xs font-bold transition-all duration-300 ease-out hover:scale-[1.04] active:scale-95 flex items-center gap-1"
                  style={
                    region === r.id
                      ? { background: "#00C896", color: "#04140f", boxShadow: "0 4px 14px rgba(0,200,150,0.35)" }
                      : { color: "rgba(255,255,255,0.55)" }
                  }
                >
                  {r.flag} {r.id}
                  {!r.live && <span className="ml-1 text-[9px] font-semibold px-1.5 py-0.5 rounded-full" style={{ background: "rgba(248,180,0,0.25)", color: "#FFD98A" }}>SOON</span>}
                </button>
              ))}
            </div>
            {region === "UAE" && (
              <>
                <div className="text-right">
                  <div className="text-xs text-white/50">Confirmed profit</div>
                  <div className="text-2xl font-bold text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>AED {regionConfirmedProfit.toLocaleString()}</div>
                </div>
                <div className="w-11 h-11 rounded-2xl flex items-center justify-center" style={{ background: "rgba(0,200,150,0.18)" }}>
                  <Sparkles className="w-5 h-5" style={{ color: "#00e0aa" }} />
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {region !== "UAE" ? (
        <ComingSoonPanel region={region} />
      ) : (
        <>
          <div key={region} className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4" style={{ animation: "dashTabIn 0.35s ease-out both" }}>
            {cards.map((c, i) => (
              <StatCard key={c.label} label={c.label} value={c.value} prefix={c.prefix} color={c.color} icon={c.icon} delay={i * 60} />
            ))}
          </div>

          {/* Quick actions */}
          <div className="rounded-2xl p-5 bg-white mt-6" style={{ border: "1px solid #E5E7EB" }}>
            <div className="font-bold text-sm mb-4" style={{ color: "#111827", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Quick actions</div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {quickActions.map((q) => (
                <button
                  key={q.label}
                  onClick={() => setTab(q.tab)}
                  className="group flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all duration-300 ease-out hover:-translate-y-0.5 hover:shadow-md active:scale-95"
                  style={{ border: "1px solid #F3F4F6" }}
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
            <div className="lg:col-span-2 rounded-2xl p-6 bg-white" style={{ border: "1px solid #E5E7EB" }}>
              <div className="font-bold text-sm mb-4" style={{ color: "#111827", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Recent UAE orders</div>
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
              <div className="rounded-2xl p-6 bg-white" style={{ border: "1px solid #E5E7EB" }}>
                <div className="font-bold text-sm mb-4" style={{ color: "#111827", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Top listing</div>
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
              <div className="rounded-2xl p-6 bg-white" style={{ border: "1px solid #E5E7EB" }}>
                <div className="font-bold text-sm mb-1" style={{ color: "#111827", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>This week</div>
                <div className="text-3xl font-bold mt-2" style={{ color: "#00C896", fontFamily: "'Space Grotesk', sans-serif" }}>{ordersThisWeek}</div>
                <div className="text-xs text-gray-400 mt-1">order{ordersThisWeek === 1 ? "" : "s"} logged in the last 7 days</div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl p-6 bg-white mt-5" style={{ border: "1px solid #E5E7EB" }}>
            <div className="font-bold text-sm mb-4" style={{ color: "#111827", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>UAE order status breakdown</div>
            <div className="flex w-full h-3 rounded-full overflow-hidden" style={{ background: "#F3F4F6" }}>
              {breakdown.map((b) => (
                <div key={b.label} className="h-full transition-all duration-700" style={{ width: `${(b.count / totalForBar) * 100}%`, background: b.color }} />
              ))}
            </div>
            <div className="flex flex-wrap gap-x-6 gap-y-2 mt-4">
              {breakdown.map((b) => (
                <div key={b.label} className="flex items-center gap-2 text-xs text-gray-500">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ background: b.color }} />
                  {b.label} <b style={{ color: "#111827" }}>{b.count}</b>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function StatusPill({ status }) {
  const styles = {
    delivered: { background: "rgba(0,200,150,0.15)", color: "#00a67e" },
    shipped: { background: "rgba(59,130,246,0.12)", color: "#3B82F6" },
    cancelled: { background: "rgba(156,163,175,0.18)", color: "#6B7280" },
    returned: { background: "rgba(239,68,68,0.12)", color: "#EF4444" },
    pending: { background: "rgba(248,180,0,0.15)", color: "#b07d00" },
  };
  return <span className="text-xs font-semibold px-2.5 py-1 rounded-full" style={styles[status] || styles.pending}>{status}</span>;
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

function reviewsForProduct(product) {
  const seed = seededFrom(product.id || product.name);
  const names = ["Amina K.", "Rashid M.", "Sara A.", "Yousef H.", "Fatima R."];
  const bodies = [
    "Arrived fast and exactly as described. Packaging was solid, no damage at all.",
    "Good quality for the price. Would order again for sure.",
    "Works well, seller was responsive when I had a question about delivery.",
    "Nice product overall — matches the photos and description closely.",
    "Delivery was quicker than expected, everything felt well made.",
  ];
  const count = 3 + (seed % 3); // 3–5 reviews
  const avg = 4.2 + ((seed % 8) / 10 - 0.3); // roughly 3.9–4.6
  const list = Array.from({ length: count }).map((_, i) => ({
    name: names[(seed + i) % names.length],
    body: bodies[(seed + i * 3) % bodies.length],
    rating: 4 + ((seed + i) % 2),
    daysAgo: 3 + ((seed + i * 7) % 40),
  }));
  return { avg: Math.min(5, Math.round(avg * 10) / 10), count, list };
}

function daysAgoFromDate(iso) {
  if (!iso) return 0;
  const diff = Date.now() - new Date(iso).getTime();
  return Math.max(0, Math.floor(diff / 86400000));
}

function ProductLandingPage({ product, onBack, onAddToCart, onBuyNow, catalog = [], onOpenProduct }) {
  const [qty, setQty] = useState(1);
  const [tab, setTab] = useState("description");
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
  useEffect(() => { setActiveImg(0); }, [product.id]);
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
  const sampleReviews = reviewsForProduct(product);
  const hasRealReviews = Array.isArray(dbReviews) && dbReviews.length > 0;
  const reviewList = hasRealReviews
    ? dbReviews.map((r) => ({ name: r.name, body: r.body, rating: r.rating, daysAgo: daysAgoFromDate(r.createdAt) }))
    : sampleReviews.list;
  const count = hasRealReviews ? dbReviews.length : sampleReviews.count;
  const avg = hasRealReviews
    ? Math.round((dbReviews.reduce((s, r) => s + r.rating, 0) / dbReviews.length) * 10) / 10
    : sampleReviews.avg;
  const related = (catalog || []).filter((p) => p.id !== product.id && p.category === product.category).slice(0, 4);
  const relatedFallback = related.length > 0 ? related : (catalog || []).filter((p) => p.id !== product.id).slice(0, 4);

  const tabs = [
    { key: "description", label: "Description" },
    { key: "specs", label: "Specifications" },
    { key: "reviews", label: `Reviews (${count})` },
  ];

  return (
    <div style={{ animation: "dashTabIn 0.3s ease-out both" }}>
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-4">
        <button onClick={onBack} className="hover:text-gray-700 font-medium">Products</button>
        <ChevronRight className="w-3.5 h-3.5" />
        <span className="font-semibold" style={{ color: "#0B1F3A" }}>{product.name}</span>
      </div>

      <button onClick={onBack} className="text-sm font-semibold text-gray-500 hover:text-gray-800 flex items-center gap-1">
        <ChevronDown className="w-4 h-4 rotate-90" /> Back to products
      </button>

      <div className="mt-5 grid lg:grid-cols-10 gap-6">
        {/* Image column with badge + mini gallery */}
        <div className="lg:col-span-4">
          <div className="relative rounded-3xl bg-white flex items-center justify-center overflow-hidden" style={{ border: "1px solid #E5E7EB", minHeight: 360 }}>
            <span className="absolute top-4 left-4 text-xs font-bold px-3 py-1.5 rounded-full text-white" style={{ background: "linear-gradient(135deg,#F8B400,#e0a300)" }}>Best Seller</span>
            {galleryImages.length > 0 ? (
              <img src={galleryImages[activeImg] || galleryImages[0]} alt={product.name} className="w-full h-full object-cover" style={{ minHeight: 360 }} />
            ) : (
              <span style={{ fontSize: 150 }}>{product.emoji}</span>
            )}
          </div>
          {galleryImages.length > 0 && (
            <div className="mt-3 grid grid-cols-4 gap-3">
              {galleryImages.map((url, i) => (
                <button
                  key={i}
                  onClick={() => setActiveImg(i)}
                  className="rounded-xl bg-white flex items-center justify-center py-4 overflow-hidden"
                  style={{ border: i === activeImg ? "2px solid #00C896" : "1px solid #E5E7EB", opacity: i === activeImg ? 1 : 0.55 }}
                >
                  <img src={url} alt={`${product.name} ${i + 1}`} className="w-full h-10 object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="lg:col-span-3">
          <div className="flex items-center justify-between">
            <div className="text-xs font-bold uppercase tracking-widest" style={{ color: "#00a67e" }}>{category}</div>
          </div>
          <h1 className="mt-2 text-2xl md:text-3xl font-extrabold leading-tight" style={{ color: "#0B1F3A", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{product.name}</h1>

          <div className="mt-2 flex items-center gap-2">
            <StarRow rating={avg} />
            <span className="text-xs font-semibold text-gray-600">{avg.toFixed(1)}</span>
            <span className="text-xs text-gray-400">({count} reviews)</span>
          </div>

          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold" style={{ color: "#00C896", fontFamily: "'Space Grotesk', sans-serif" }}>AED {product.sell}</span>
            <span className="text-sm text-gray-300 line-through" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>AED {Math.round(product.sell * 1.35)}</span>
          </div>

          <p className="mt-4 text-sm text-gray-600 leading-relaxed">{description}</p>

          <ul className="mt-4 space-y-2">
            {highlights.map((h, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-gray-600">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: "#00C896" }} />
                {h}
              </li>
            ))}
          </ul>

          {/* Trust badges */}
          <div className="mt-5 grid grid-cols-2 gap-2">
            {trustBadges.map((b, i) => (
              <div key={i} className="flex items-center gap-2 rounded-xl px-3 py-2" style={{ background: "#F8FAFC", border: "1px solid #E5E7EB" }}>
                <b.icon className="w-4 h-4 flex-shrink-0" style={{ color: "#00a67e" }} />
                <span className="text-xs font-medium text-gray-600">{b.label}</span>
              </div>
            ))}
          </div>

          <div className="mt-6 rounded-2xl p-5" style={{ background: "#F8FAFC", border: "1px solid #E5E7EB" }}>
            <div className="flex items-center gap-3">
              <label className="text-xs font-semibold text-gray-500">Quantity</label>
              <div className="flex items-center rounded-full bg-white" style={{ border: "1px solid #E5E7EB" }}>
                <button onClick={() => setQty((q) => Math.max(1, q - 1))} className="w-9 h-9 text-sm font-bold text-gray-600">−</button>
                <span className="w-8 text-center text-sm font-semibold" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{qty}</span>
                <button onClick={() => setQty((q) => q + 1)} className="w-9 h-9 text-sm font-bold text-gray-600">+</button>
              </div>
            </div>
            <div className="mt-2 text-sm text-gray-500">
              Total: <b style={{ color: "#0B1F3A", fontFamily: "'Space Grotesk', sans-serif" }}>AED {product.sell * qty + DELIVERY_CHARGE}</b>
              <span className="ml-1 text-xs text-gray-400">(incl. AED {DELIVERY_CHARGE} delivery)</span>
            </div>

            <div className="mt-5 flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => onAddToCart(qty)}
                className="flex-1 text-sm font-semibold py-3.5 rounded-full bg-white transition-transform duration-200 hover:scale-[1.02] active:scale-95"
                style={{ border: "1px solid #0B1F3A", color: "#0B1F3A" }}
              >
                🛒 Add to Cart
              </button>
              <button
                onClick={() => onBuyNow(qty)}
                className="flex-1 text-sm font-semibold py-3.5 rounded-full text-white transition-transform duration-200 hover:scale-[1.02] active:scale-95"
                style={{ background: "linear-gradient(135deg,#00C896,#00a67e)", boxShadow: "0 8px 24px rgba(0,200,150,0.35)" }}
              >
                Buy Now
              </button>
            </div>
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

function CheckoutForm({ items, onBack, onSubmit, onUpdateItemPrice }) {
  const [form, setForm] = useState({ name: "", phone: "", emirate: EMIRATES[0], address: "" });
  const [busy, setBusy] = useState(false);
  const itemsTotal = items.reduce((s, it) => s + it.sell * it.qty, 0);
  const deliveryTotal = items.length * DELIVERY_CHARGE;
  const total = itemsTotal + deliveryTotal;
  const profitTotal = items.reduce((s, it) => s + (it.sell * it.qty + DELIVERY_CHARGE) - (it.listSell * it.qty + DELIVERY_CHARGE), 0);

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.phone || !form.address) return;
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
              const itemProfit = codAmount - baseTotal;
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
                  <div className="mt-3 flex items-center justify-between gap-2">
                    <label className="text-xs text-gray-500 whitespace-nowrap">COD Amount (what customer pays)</label>
                    <input
                      type="number" min={baseTotal} value={codAmount}
                      onChange={(e) => {
                        const entered = Math.max(parseFloat(e.target.value) || 0, baseTotal);
                        const newSell = (entered - DELIVERY_CHARGE) / it.qty;
                        onUpdateItemPrice(it.id, newSell);
                      }}
                      className="w-24 rounded-lg px-2 py-1.5 text-sm text-right font-semibold"
                      style={{ border: "1px solid #E5E7EB" }}
                    />
                  </div>
                  <div className="mt-1.5 flex items-center justify-between text-xs font-semibold" style={{ color: "#00a67e" }}>
                    <span>Your profit is</span>
                    <span>AED {itemProfit.toFixed(2)}</span>
                  </div>
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

function CatalogTab({ catalog, onAdd, onPlaceOrder, notify, onViewOrders, sellerEmail, isAdmin = false, onCatalogChanged }) {
  const [view, setView] = useState("list"); // list | detail | cart | checkout | success
  const [activeProduct, setActiveProduct] = useState(null);
  const [cart, setCart] = useState(() => readLocal(`ef_cart_${sellerEmail}`, []));
  const [checkoutItems, setCheckoutItems] = useState([]);
  const [checkoutFrom, setCheckoutFrom] = useState("detail"); // where "Back" should return to
  const [placedOrders, setPlacedOrders] = useState([]);

  // Admin-only inline product editing, right from this grid.
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState(null);
  const [editImageUploading, setEditImageUploading] = useState(false);
  const startEdit = (p) => {
    setEditingId(p.id);
    const images = Array.isArray(p.images) && p.images.length ? p.images : (p.image_url ? [p.image_url] : []);
    setEditForm({ name: p.name || "", category: p.category || "", cost: p.cost, sell: p.sell, emoji: p.emoji || "📦", description: p.description || "", images });
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
  const saveEdit = async (id) => {
    if (!editForm.name || editForm.cost === "" || editForm.sell === "") { notify && notify("Fill in name, cost and sell price."); return; }
    const images = editForm.images || [];
    const { error } = await supabase.from("products").update({
      name: editForm.name, category: editForm.category || "General",
      cost: parseFloat(editForm.cost), sell: parseFloat(editForm.sell),
      emoji: editForm.emoji || "📦", description: editForm.description || null,
      images, image_url: images[0] || null,
    }).eq("id", id);
    if (error) { notify && notify("Could not save changes."); return; }
    notify && notify("Product updated.");
    cancelEdit();
    onCatalogChanged && onCatalogChanged();
  };

  // Keep the cart across a page refresh — nothing is lost if the seller reloads mid-checkout.
  useEffect(() => { writeLocal(`ef_cart_${sellerEmail}`, cart); }, [cart, sellerEmail]);

  const addToCart = (product, qty) => {
    setCart((prev) => {
      const existing = prev.find((c) => c.id === product.id);
      if (existing) return prev.map((c) => (c.id === product.id ? { ...c, qty: c.qty + qty } : c));
      return [...prev, { id: product.id, name: product.name, sell: product.sell, listSell: product.sell, cost: product.cost, emoji: product.emoji, image_url: product.image_url, qty }];
    });
    notify && notify("Added to cart.");
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
  // Lets the seller charge this particular customer more than the catalog price —
  // the gap between what they charge and the catalog price becomes extra profit.
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
        customerPhone: customer.phone, customerAddress: customer.address,
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
    return <CheckoutForm items={checkoutItems} onBack={() => setView(checkoutFrom)} onSubmit={placeOrder} onUpdateItemPrice={updateCheckoutItemPrice} />;
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
        style={{ background: "linear-gradient(135deg,#0B1F3A,#0F2E52 55%,#00997a)" }}
      >
        <div
          className="absolute -left-8 -bottom-12 w-44 h-44 rounded-full"
          style={{ background: "radial-gradient(circle, rgba(0,200,150,0.3), transparent 70%)" }}
        />
        <div className="relative">
          <h1 className="text-2xl font-extrabold" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Products</h1>
          <p className="text-sm text-white/70 mt-1">Click a product to view it, or add it to cart / buy it now for a customer.</p>
        </div>
        <button onClick={() => setView("cart")} className="relative flex-shrink-0 flex items-center gap-2 text-sm font-semibold px-4 py-2.5 rounded-full transition-transform duration-200 hover:scale-105" style={{ background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)", color: "#fff" }}>
          🛒 Cart
          {cartCount > 0 && (
            <span className="absolute -top-2 -right-2 w-5 h-5 rounded-full text-white text-[10px] font-bold flex items-center justify-center" style={{ background: "#00C896" }}>{cartCount}</span>
          )}
        </button>
      </div>
      <div className="mt-6 grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {catalog.map((p, i) => {
          const color = catColor(p.category);
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
                      <div key={idx} className="relative w-12 h-12 rounded-lg overflow-hidden flex-shrink-0" style={{ border: "1px solid #E5E7EB" }}>
                        <img src={url} alt="" className="w-full h-full object-cover" />
                        <button onClick={() => removeEditImage(idx)} title="Remove this picture" className="absolute top-0 right-0 w-4 h-4 flex items-center justify-center text-white text-[10px]" style={{ background: "rgba(0,0,0,0.55)" }}>×</button>
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
                    <input value={editForm.emoji} onChange={(e) => setEditForm({ ...editForm, emoji: e.target.value })} title="Fallback emoji (shown until a picture is uploaded)" className="w-14 rounded-lg px-2 py-1.5 text-lg text-center" style={{ border: "1px solid #E5E7EB" }} />
                    <input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} placeholder="Product name" className="flex-1 rounded-lg px-2 py-1.5 text-sm font-semibold" style={{ border: "1px solid #E5E7EB" }} />
                  </div>
                  <input value={editForm.category} onChange={(e) => setEditForm({ ...editForm, category: e.target.value })} placeholder="Category" className="w-full rounded-lg px-2 py-1.5 text-xs" style={{ border: "1px solid #E5E7EB" }} />
                  <div className="flex items-center gap-2">
                    <input type="number" value={editForm.cost} onChange={(e) => setEditForm({ ...editForm, cost: e.target.value })} placeholder="Cost" className="w-1/2 rounded-lg px-2 py-1.5 text-xs" style={{ border: "1px solid #E5E7EB" }} />
                    <input type="number" value={editForm.sell} onChange={(e) => setEditForm({ ...editForm, sell: e.target.value })} placeholder="Sell" className="w-1/2 rounded-lg px-2 py-1.5 text-xs" style={{ border: "1px solid #E5E7EB" }} />
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
          return (
            <div
              key={p.id}
              onClick={() => openProduct(p)}
              className="group relative rounded-2xl p-5 bg-white transition-all duration-300 ease-out hover:-translate-y-1.5 cursor-pointer overflow-hidden"
              style={{
                border: "1px solid #E5E7EB",
                animation: `dashTabIn 0.35s ease-out ${i * 40}ms both`,
                boxShadow: "0 0 0 rgba(0,0,0,0)",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.boxShadow = `0 16px 32px ${color}22`)}
              onMouseLeave={(e) => (e.currentTarget.style.boxShadow = "0 0 0 rgba(0,0,0,0)")}
            >
              <div className="absolute top-0 left-0 right-0 h-1" style={{ background: `linear-gradient(90deg, ${color}, transparent)` }} />
              {isAdmin && (
                <button
                  onClick={(e) => { e.stopPropagation(); startEdit(p); }}
                  className="absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center transition-colors"
                  style={{ background: "#F8FAFC", border: "1px solid #E5E7EB", color: "#6B7280" }}
                  title="Edit product"
                >
                  ✏️
                </button>
              )}
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl overflow-hidden transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3"
                style={{ background: `${color}18` }}
              >
                <ProductThumb product={p} size={30} />
              </div>
              <div className="mt-3 font-semibold text-sm" style={{ color: "#111827" }}>{p.name}</div>
              <span className="inline-block mt-1 text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: `${color}18`, color }}>{p.category}</span>
              <div className="mt-2 text-lg font-bold" style={{ color: "#0B1F3A", fontFamily: "'Space Grotesk', sans-serif" }}>AED {p.sell}</div>
              <div className="mt-4 flex gap-2" onClick={(e) => e.stopPropagation()}>
                <button onClick={() => addToCart(p, 1)} className="flex-1 text-xs font-semibold py-2.5 rounded-full transition-transform duration-200 hover:scale-[1.03] active:scale-95" style={{ border: "1px solid #0B1F3A", color: "#0B1F3A" }}>
                  🛒 Add to Cart
                </button>
                <button onClick={() => buyNow(p, 1)} className="flex-1 text-xs font-semibold py-2.5 rounded-full text-white transition-transform duration-200 hover:scale-[1.03] active:scale-95" style={{ background: "linear-gradient(135deg,#00C896,#00a67e)" }}>
                  Buy Now
                </button>
              </div>
              <button onClick={(e) => { e.stopPropagation(); openProduct(p); }} className="mt-2 w-full text-xs font-semibold py-1.5 text-gray-500 hover:text-gray-800">View product →</button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function CategoriesTab({ catalog, listings, onAdd }) {
  const [openCat, setOpenCat] = useState(null);
  const categories = Array.from(new Set(catalog.map((p) => p.category || "General")));

  return (
    <div>
      <h1 className="text-2xl font-extrabold" style={{ color: "#0B1F3A", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Categories</h1>
      <p className="text-sm text-gray-500 mt-1">Browse products grouped by category.</p>
      <div className="mt-6 space-y-3">
        {categories.length === 0 && <div className="text-sm text-gray-400 py-10 text-center">No categories yet.</div>}
        {categories.map((cat, i) => {
          const items = catalog.filter((p) => (p.category || "General") === cat);
          const isOpen = openCat === cat;
          return (
            <div
              key={cat}
              className="rounded-2xl bg-white overflow-hidden transition-all duration-300 ease-out"
              style={{ border: "1px solid #E5E7EB", animation: `dashTabIn 0.35s ease-out ${i * 50}ms both` }}
            >
              <button
                onClick={() => setOpenCat(isOpen ? null : cat)}
                className="w-full flex items-center justify-between px-5 py-4 transition-colors duration-200 hover:bg-gray-50 active:scale-[0.99]"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "rgba(0,200,150,0.12)" }}>
                    <Layers className="w-4.5 h-4.5" style={{ color: "#00C896" }} />
                  </div>
                  <div className="text-left">
                    <div className="font-semibold text-sm" style={{ color: "#111827" }}>{cat}</div>
                    <div className="text-xs text-gray-400">{items.length} product{items.length === 1 ? "" : "s"}</div>
                  </div>
                </div>
                <ChevronDown className="w-4 h-4 text-gray-400 transition-transform duration-300" style={{ transform: isOpen ? "rotate(180deg)" : "rotate(0deg)" }} />
              </button>
              <div
                className="transition-all duration-300 ease-out overflow-hidden"
                style={{ maxHeight: isOpen ? `${items.length * 90 + 40}px` : "0px" }}
              >
                <div className="px-5 pb-5 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {items.map((p) => {
                    const already = listings.includes(p.id);
                    return (
                      <div key={p.id} className="rounded-xl p-4 flex items-center justify-between gap-3" style={{ border: "1px solid #F3F4F6" }}>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg overflow-hidden flex items-center justify-center flex-shrink-0" style={{ background: "#F8FAFC" }}>
                            <ProductThumb product={p} size={22} />
                          </div>
                          <div>
                            <div className="font-semibold text-sm">{p.name}</div>
                            <div className="text-xs text-gray-400">AED {p.sell}</div>
                          </div>
                        </div>
                        <button
                          onClick={() => onAdd(p.id)}
                          disabled={already}
                          className="text-xs font-semibold px-3 py-1.5 rounded-full text-white transition-transform duration-200 hover:scale-[1.05] active:scale-95 disabled:opacity-40"
                          style={{ background: "#0B1F3A" }}
                        >
                          {already ? "Added" : "+ Add"}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function InvoicesTab({ orders, session, unpaidInvoice, paidInvoice }) {
  // Cancelled orders were never billed, so they're excluded from every invoice total below.
  // Amount billed = product price + the flat delivery charge (delivery isn't seller profit, but it is part of what's invoiced).
  const billable = orders.filter((o) => o.status !== "cancelled");
  const totalBilled = billable.reduce((s, o) => s + o.sellPrice * o.qty + (o.deliveryCharge || 0), 0);
  return (
    <div>
      <h1 className="text-2xl font-extrabold" style={{ color: "#0B1F3A", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Invoices</h1>
      <p className="text-sm text-gray-500 mt-1">An invoice is generated automatically for every order you log. Admin reviews and approves each one before it counts as Paid.</p>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
        <StatCard label="Total invoices" value={orders.length} color="#0B1F3A" icon={Receipt} />
        <StatCard label="Total billed" value={totalBilled} prefix="AED " color="#0B1F3A" icon={ShieldCheck} />
        <StatCard label="Unpaid invoice" value={unpaidInvoice} prefix="AED " color="#F8B400" icon={Receipt} />
        <StatCard label="Paid invoice" value={paidInvoice} prefix="AED " color="#00C896" icon={CheckCircle2} />
      </div>
      <div className="mt-6 rounded-2xl bg-white overflow-x-auto" style={{ border: "1px solid #E5E7EB" }}>
        {orders.length === 0 ? (
          <div className="text-sm text-gray-400 py-10 text-center">No invoices yet — they appear here once you log an order.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-400" style={{ borderBottom: "1px solid #F3F4F6" }}>
                <th className="px-4 py-3">Invoice #</th>
                <th className="px-4 py-3">Product</th>
                <th className="px-4 py-3">Buyer</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Order status</th>
                <th className="px-4 py-3">Payment</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o, i) => (
                <tr
                  key={o.id}
                  className="transition-colors duration-200 hover:bg-gray-50"
                  style={{ borderBottom: "1px solid #FAFAFA", animation: `dashTabIn 0.3s ease-out ${i * 30}ms both` }}
                >
                  <td className="px-4 py-3 text-xs text-gray-500" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>INV-{o.id}</td>
                  <td className="px-4 py-3">{o.productName} <span className="text-gray-400">×{o.qty}</span></td>
                  <td className="px-4 py-3 text-gray-500">{o.buyer || "—"}{o.city ? ", " + o.city : ""}</td>
                  <td className="px-4 py-3" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                    {(o.status === "cancelled" || o.status === "returned") ? "AED 0" : `AED ${o.sellPrice * o.qty + (o.deliveryCharge || 0)}`}
                  </td>
                  <td className="px-4 py-3"><StatusPill status={o.status} /></td>
                  <td className="px-4 py-3">{o.status === "cancelled" ? <span className="text-xs text-gray-300">—</span> : <PaymentPill status={o.paymentStatus} />}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function OrdersTab({ orders, confirmedProfit, deliveredRevenue, returnedCount }) {
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

      <div className="grid sm:grid-cols-3 gap-4 mt-6">
        <StatCard label="Confirmed profit" value={confirmedProfit} prefix="AED " color="#00C896" icon={ShieldCheck} delay={0} />
        <StatCard label="Paid COD" value={deliveredRevenue} prefix="AED " color="#3B82F6" icon={CreditCard} delay={100} />
        <StatCard label="Returned" value={returnedCount} color="#EF4444" icon={RotateCcw} delay={200} />
      </div>

      <div className="mt-8 rounded-2xl bg-white overflow-x-auto" style={{ border: "1px solid #E5E7EB" }}>
        {orders.length === 0 ? (
          <div className="text-sm text-gray-400 py-10 text-center">No orders yet — place one from the Products tab.</div>
        ) : (
          <table className="w-full text-sm">
            <thead><tr className="text-left text-xs text-gray-400" style={{ borderBottom: "1px solid #F3F4F6" }}>
              <th className="px-4 py-3">Order</th><th className="px-4 py-3">Product</th><th className="px-4 py-3">Buyer/City</th>
              <th className="px-4 py-3">Sell</th><th className="px-4 py-3">Delivery</th><th className="px-4 py-3">Profit</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Tracking #</th>
            </tr></thead>
            <tbody>
              {orders.map((o, i) => (
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
                  <td className="px-4 py-3 text-xs text-gray-500">{o.trackingNumber || <span className="text-gray-300">Not assigned yet</span>}</td>
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

function SettingsTab({ session }) {
  return (
    <div>
      <h1 className="text-2xl font-extrabold" style={{ color: "#0B1F3A", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Settings</h1>
      <p className="text-sm text-gray-500 mt-1">Your account details.</p>
      <div className="mt-6 rounded-2xl p-6 bg-white max-w-lg space-y-4" style={{ border: "1px solid #E5E7EB" }}>
        {[["Full name", session.name], ["Email", session.email], ["Company", session.company || "—"], ["Country", session.country || "—"]].map(([label, value]) => (
          <div key={label}>
            <label className="text-xs text-gray-500">{label}</label>
            <div className="mt-1 text-sm font-semibold" style={{ color: "#111827" }}>{value}</div>
          </div>
        ))}
        <p className="text-xs text-gray-400 pt-2" style={{ borderTop: "1px solid #F3F4F6" }}>Editing profile fields isn't wired up yet in this prototype — say the word and I'll add it next.</p>
      </div>
    </div>
  );
}

function AdminTab({ catalog, sellerCount, notify, onCatalogChanged }) {
  const [form, setForm] = useState({ name: "", category: "", cost: "", sell: "", emoji: "📦", description: "", images: [] });
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
  const [allOrders, setAllOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [sellers, setSellers] = useState([]);
  const [sellersLoading, setSellersLoading] = useState(true);
  const [sellerSearch, setSellerSearch] = useState("");

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
  useEffect(() => { loadAllOrders(); loadSellers(); }, []); // eslint-disable-line

  const setAdminOrderStatus = async (id, status) => {
    await supabase.from("orders").update({ status }).eq("id", id);
    setAllOrders(allOrders.map((o) => (o.id === id ? { ...o, status } : o)));
  };

  // Only Admin can approve an invoice as Paid — this is what moves it out of
  // the seller's "Unpaid invoice" box and into "Paid invoice".
  const setAdminPaymentStatus = async (id, payment_status) => {
    await supabase.from("orders").update({ payment_status }).eq("id", id);
    setAllOrders(allOrders.map((o) => (o.id === id ? { ...o, payment_status } : o)));
    notify(payment_status === "paid" ? "Invoice approved as paid." : "Invoice marked unpaid.");
  };

  const [trackingDrafts, setTrackingDrafts] = useState({});
  const saveTracking = async (id) => {
    const value = trackingDrafts[id] ?? "";
    await supabase.from("orders").update({ tracking_number: value }).eq("id", id);
    setAllOrders(allOrders.map((o) => (o.id === id ? { ...o, tracking_number: value } : o)));
    notify("Tracking number saved.");
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
    });
    if (error) { notify("Could not add product."); return; }
    setForm({ name: "", category: "", cost: "", sell: "", emoji: "📦", description: "", images: [] });
    notify("Product added to catalog.");
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
    setEditForm({ name: p.name || "", category: p.category || "", cost: p.cost, sell: p.sell, emoji: p.emoji || "📦", description: p.description || "", images });
  };
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
  const saveEdit = async (id) => {
    if (!editForm.name || editForm.cost === "" || editForm.sell === "") { notify("Fill in name, cost and sell price."); return; }
    const images = editForm.images || [];
    const { error } = await supabase.from("products").update({
      name: editForm.name, category: editForm.category || "General",
      cost: parseFloat(editForm.cost), sell: parseFloat(editForm.sell),
      emoji: editForm.emoji || "📦", description: editForm.description || null,
      images, image_url: images[0] || null,
    }).eq("id", id);
    if (error) { notify("Could not save changes."); return; }
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

  const sellerOrderCount = (email) => allOrders.filter((o) => o.seller_email === email).length;
  const filteredSellers = sellers.filter((s) => {
    const q = sellerSearch.trim().toLowerCase();
    if (!q) return true;
    return (s.email || "").toLowerCase().includes(q) || (s.name || "").toLowerCase().includes(q) || (s.company || "").toLowerCase().includes(q);
  });

  return (
    <div>
      <h1 className="text-2xl font-extrabold" style={{ color: "#0B1F3A", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Admin</h1>
      <p className="text-sm text-gray-500 mt-1">Manage the shared product catalog every seller sees, and track signups.</p>

      <div className="grid sm:grid-cols-3 gap-4 mt-6">
        <StatCard label="Total sellers signed up" value={sellers.length || sellerCount} color="#00C896" />
        <StatCard label="Products in catalog" value={catalog.length} />
        <StatCard label="Customer orders (all sellers)" value={allOrders.length} color="#F8B400" />
      </div>

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
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-400 uppercase tracking-wide" style={{ background: "#F8FAFC" }}>
                  <th className="px-5 py-3">Seller</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Phone</th>
                  <th className="px-4 py-3">Company</th>
                  <th className="px-4 py-3">Country</th>
                  <th className="px-4 py-3">Orders</th>
                  <th className="px-4 py-3">Signed up</th>
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
                    <td className="px-4 py-3 text-gray-500">{s.company || "—"}</td>
                    <td className="px-4 py-3 text-gray-500">{s.country || "—"}</td>
                    <td className="px-4 py-3 text-gray-500">{sellerOrderCount(s.email)}</td>
                    <td className="px-4 py-3 text-gray-400 text-xs" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                      {s.created_at ? new Date(s.created_at).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <form onSubmit={addProduct} className="mt-8 rounded-2xl p-6 bg-white grid sm:grid-cols-6 gap-3 items-end" style={{ border: "1px solid #E5E7EB" }}>
        <div className="sm:col-span-2"><label className="text-xs text-gray-500">Product name</label><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="mt-1 w-full rounded-lg px-3 py-2 text-sm" style={{ border: "1px solid #E5E7EB" }} /></div>
        <div><label className="text-xs text-gray-500">Category</label><input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="mt-1 w-full rounded-lg px-3 py-2 text-sm" style={{ border: "1px solid #E5E7EB" }} /></div>
        <div><label className="text-xs text-gray-500">Cost (AED)</label><input type="number" value={form.cost} onChange={(e) => setForm({ ...form, cost: e.target.value })} className="mt-1 w-full rounded-lg px-3 py-2 text-sm" style={{ border: "1px solid #E5E7EB" }} /></div>
        <div><label className="text-xs text-gray-500">Sell (AED)</label><input type="number" value={form.sell} onChange={(e) => setForm({ ...form, sell: e.target.value })} className="mt-1 w-full rounded-lg px-3 py-2 text-sm" style={{ border: "1px solid #E5E7EB" }} /></div>
        <div><label className="text-xs text-gray-500">Emoji (fallback)</label><input value={form.emoji} onChange={(e) => setForm({ ...form, emoji: e.target.value })} className="mt-1 w-full rounded-lg px-3 py-2 text-sm" style={{ border: "1px solid #E5E7EB" }} /></div>
        <div className="sm:col-span-6 flex items-center gap-3 flex-wrap">
          {(form.images || []).map((url, idx) => (
            <div key={idx} className="relative w-14 h-14 rounded-xl overflow-hidden flex-shrink-0" style={{ border: "1px solid #E5E7EB" }}>
              <img src={url} alt="" className="w-full h-full object-cover" />
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
        <div className="sm:col-span-6"><label className="text-xs text-gray-500">Description (shown on the product's page)</label><textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="mt-1 w-full rounded-lg px-3 py-2 text-sm" style={{ border: "1px solid #E5E7EB" }} /></div>
        <button className="sm:col-span-6 text-sm font-semibold py-2.5 rounded-full text-white" style={{ background: "#0B1F3A" }}>+ Add product to catalog</button>
      </form>

      <div className="mt-8 grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {catalog.map((p) => (
          <div key={p.id} className="rounded-2xl p-5 bg-white" style={{ border: "1px solid #E5E7EB" }}>
            {editingId === p.id ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  {(editForm.images || []).map((url, idx) => (
                    <div key={idx} className="relative w-12 h-12 rounded-lg overflow-hidden flex-shrink-0" style={{ border: "1px solid #E5E7EB" }}>
                      <img src={url} alt="" className="w-full h-full object-cover" />
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

      {/* Every order every seller has logged — this is where fulfillment happens */}
      <div className="mt-10 rounded-2xl bg-white overflow-x-auto" style={{ border: "1px solid #E5E7EB" }}>
        <div className="px-5 pt-5 pb-1">
          <div className="font-bold text-sm" style={{ color: "#111827", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Customer orders — all sellers</div>
          <p className="text-xs text-gray-400 mt-1">Every order any seller logs lands here for you to fulfill and update.</p>
        </div>
        {ordersLoading ? (
          <div className="text-sm text-gray-400 py-10 text-center">Loading orders…</div>
        ) : allOrders.length === 0 ? (
          <div className="text-sm text-gray-400 py-10 text-center">No customer orders yet.</div>
        ) : (
          <table className="w-full text-sm mt-3">
            <thead>
              <tr className="text-left text-xs text-gray-400" style={{ borderBottom: "1px solid #F3F4F6" }}>
                <th className="px-4 py-3">Order</th>
                <th className="px-4 py-3">Seller</th>
                <th className="px-4 py-3">Product</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Email / Phone</th>
                <th className="px-4 py-3">Address / Emirate</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Payment</th>
                <th className="px-4 py-3">Tracking #</th>
              </tr>
            </thead>
            <tbody>
              {allOrders.map((o) => (
                <tr key={o.id} className="transition-colors duration-200 hover:bg-gray-50" style={{ borderBottom: "1px solid #FAFAFA" }}>
                  <td className="px-4 py-3 text-xs text-gray-500" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{o.id}</td>
                  <td className="px-4 py-3 text-gray-500">{o.seller_email}</td>
                  <td className="px-4 py-3">{o.product_name} <span className="text-gray-400">×{o.qty}</span></td>
                  <td className="px-4 py-3 text-gray-700 font-medium">{o.buyer || "—"}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    <div>{o.customer_email || "—"}</div>
                    <div className="text-gray-400">{o.customer_phone || ""}</div>
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs max-w-[180px]">
                    <div>{o.city || "—"}</div>
                    <div className="text-gray-400 truncate" title={o.customer_address}>{o.customer_address || ""}</div>
                  </td>
                  <td className="px-4 py-3" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>AED {(o.status === "cancelled" || o.status === "returned") ? 0 : o.sell_price * o.qty + (Number(o.delivery_charge) || 0)}</td>
                  <td className="px-4 py-3">
                    <select
                      value={o.status}
                      onChange={(e) => setAdminOrderStatus(o.id, e.target.value)}
                      className="text-xs rounded-full px-2 py-1 font-semibold border-0"
                      style={
                        o.status === "delivered" ? { background: "rgba(0,200,150,0.15)", color: "#00a67e" } :
                        o.status === "shipped" ? { background: "rgba(59,130,246,0.12)", color: "#3B82F6" } :
                        o.status === "cancelled" ? { background: "rgba(156,163,175,0.18)", color: "#6B7280" } :
                        o.status === "returned" ? { background: "rgba(239,68,68,0.12)", color: "#EF4444" } :
                        { background: "rgba(248,180,0,0.15)", color: "#b07d00" }
                      }
                    >
                      <option value="pending">Pending</option>
                      <option value="shipped">Shipped</option>
                      <option value="delivered">Delivered</option>
                      <option value="cancelled">Cancelled</option>
                      <option value="returned">Returned</option>
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    {o.status === "cancelled" ? (
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
                    <div className="flex items-center gap-1.5">
                      <input
                        defaultValue={o.tracking_number || ""}
                        onChange={(e) => setTrackingDrafts((prev) => ({ ...prev, [o.id]: e.target.value }))}
                        placeholder="e.g. AWB123456"
                        className="w-28 rounded-lg px-2 py-1.5 text-xs"
                        style={{ border: "1px solid #E5E7EB" }}
                      />
                      <button onClick={() => saveTracking(o.id)} className="text-xs font-semibold px-2 py-1.5 rounded-lg" style={{ background: "#0B1F3A", color: "#fff" }}>Save</button>
                    </div>
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

function SupportTab() {
  return (
    <div>
      <h1 className="text-2xl font-extrabold" style={{ color: "#0B1F3A", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Support</h1>
      <p className="text-sm text-gray-500 mt-1">Reach the EmirateFulfil seller support team.</p>
      <div className="mt-6 grid sm:grid-cols-2 gap-5 max-w-2xl">
        <div className="rounded-2xl p-6 bg-white" style={{ border: "1px solid #E5E7EB" }}>
          <div className="text-2xl">💬</div>
          <div className="font-bold text-sm mt-3" style={{ color: "#111827", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>WhatsApp support</div>
          <div className="text-xs text-gray-400 mt-1">Fastest response — usually under 10 minutes.</div>
        </div>
        <div className="rounded-2xl p-6 bg-white" style={{ border: "1px solid #E5E7EB" }}>
          <div className="text-2xl">✉️</div>
          <div className="font-bold text-sm mt-3" style={{ color: "#111827", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Email support</div>
          <div className="text-xs text-gray-400 mt-1">sellers@emiratefulfil.com — replies within 24h.</div>
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
      <OrderFlow />
      <DashboardPreview />
      <Pricing />
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
export default function EmirateFulfilApp() {
  useGoogleFonts();
  const [view, setView] = useState("home"); // home | signup | login | dashboard
  const [session, setSession] = useState(null);
  const [toastMsg, setToastMsg] = useState("");
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [logoUrl, setLogoUrl] = useState(null);

  const notify = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(""), msg.length > 60 ? 5000 : 2600);
  };

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
  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      try {
        const authUser = data.session?.user;
        if (authUser) {
          const { data: profile } = await supabase.from("profiles").select("*").eq("id", authUser.id).single();
          setSession({ email: authUser.email, name: profile?.name || authUser.email.split("@")[0], company: profile?.company, country: profile?.country });
          setView("dashboard");
        }
      } finally {
        setCheckingAuth(false);
      }
    });
  }, []);

  const handleAuthed = (s) => { setSession(s); setView("dashboard"); };
  const handleLogout = async () => { await supabase.auth.signOut(); setSession(null); setView("home"); };

  if (checkingAuth) return <SplashLoader />;

  return (
    <LogoContext.Provider value={{ logoUrl, setLogoUrl }}>
      <Toast message={toastMsg} />
      {view === "home" && <HomePage session={session} onNav={setView} onLogout={handleLogout} />}
      {(view === "signup" || view === "login") && (
        <AuthPage mode={view} onAuthed={handleAuthed} onSwitch={setView} notify={notify} />
      )}
      {view === "dashboard" && session && <Dashboard session={session} onLogout={handleLogout} notify={notify} />}
    </LogoContext.Provider>
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
