import React, { useEffect, useRef, useState } from "react";
import {
  Package, Warehouse, Truck, ClipboardCheck, RotateCcw, Boxes, ShieldCheck,
  Zap, Globe2, ChevronDown, ChevronRight, Menu, X, ArrowUpRight, Star,
  MapPin, PackageCheck, ScanBarcode, PlaneTakeoff, CheckCircle2, Sparkles,
} from "lucide-react";

/* ---------------------------------------------------------
   EmirateFulfil — Homepage
   Palette: Royal Navy #0B1F3A · Emerald #00C896 · Gold #F8B400
   Type: Plus Jakarta Sans (display) · Inter (body) · Space Grotesk (numerals)
--------------------------------------------------------- */

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
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg,#00C896,#0B1F3A)" }}>
            <PackageCheck className="w-5 h-5 text-white" />
          </div>
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
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg,#00C896,#0B1F3A)" }}>
                <PackageCheck className="w-5 h-5 text-white" />
              </div>
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
   STORAGE HELPERS (persistent, shared across sessions)
============================================================ */
async function sGet(key) {
  try { const r = await window.storage.get(key, true); return r ? JSON.parse(r.value) : null; }
  catch (e) { return null; }
}
async function sSet(key, value) {
  try { return await window.storage.set(key, JSON.stringify(value), true); }
  catch (e) { console.error("storage set failed", e); return null; }
}

const CATALOG_SEED = [
  { id: "p1", name: 'Smart LED Ring Light 10"', category: "Electronics", cost: 38, sell: 129, emoji: "💡" },
  { id: "p2", name: "Wireless Earbuds Pro X", category: "Electronics", cost: 52, sell: 169, emoji: "🎧" },
  { id: "p3", name: "Portable Blender Bottle", category: "Home", cost: 29, sell: 99, emoji: "🧃" },
  { id: "p4", name: "Magnetic Car Phone Mount", category: "Accessories", cost: 14, sell: 59, emoji: "📱" },
  { id: "p5", name: "Arabic Oud Perfume 50ml", category: "Beauty", cost: 41, sell: 149, emoji: "🧴" },
  { id: "p6", name: "Smart Fitness Band S3", category: "Electronics", cost: 47, sell: 159, emoji: "⌚" },
  { id: "p7", name: "Non-Stick Cookware Set", category: "Home", cost: 88, sell: 249, emoji: "🍳" },
  { id: "p8", name: "LED Galaxy Star Projector", category: "Home", cost: 33, sell: 119, emoji: "🌌" },
];

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
      const exists = await sGet("users:" + email);
      if (exists) { notify("An account with this email already exists — please log in."); setBusy(false); return; }
      const user = { ...form, email, createdAt: new Date().toISOString() };
      await sSet("users:" + email, user);
      await sSet("listings:" + email, []);
      await sSet("orders:" + email, []);
      onAuthed({ email, name: form.name, company: form.company, country: form.country });
      notify("Account created — welcome to EmirateFulfil, " + form.name.split(" ")[0] + ".");
    } else {
      const user = await sGet("users:" + email);
      if (!user || user.password !== form.password) { notify("Incorrect email or password."); setBusy(false); return; }
      onAuthed({ email: user.email, name: user.name, company: user.company, country: user.country });
      notify("Welcome back, " + user.name.split(" ")[0] + ".");
    }
    setBusy(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-16" style={{ background: "#081221", fontFamily: "Inter, sans-serif" }}>
      <div className="w-full max-w-md">
        <button onClick={() => onSwitch("home")} className="flex items-center gap-2.5 justify-center mb-8 w-full">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg,#00C896,#0B1F3A)" }}>
            <PackageCheck className="w-5 h-5 text-white" />
          </div>
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

/* ============================================================
   SELLER DASHBOARD
============================================================ */
function Dashboard({ session, onLogout, notify }) {
  const [tab, setTab] = useState("overview");
  const [catalog] = useState(CATALOG_SEED);
  const [listings, setListings] = useState([]);
  const [orders, setOrders] = useState([]);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const reload = async () => {
    setListings((await sGet("listings:" + session.email)) || []);
    setOrders((await sGet("orders:" + session.email)) || []);
  };
  useEffect(() => { reload(); }, []); // eslint-disable-line

  const addListing = async (id) => {
    if (listings.includes(id)) { notify("Already in your listings."); return; }
    const next = [...listings, id];
    setListings(next);
    await sSet("listings:" + session.email, next);
    notify("Added to your listings.");
  };
  const removeListing = async (id) => {
    const next = listings.filter((x) => x !== id);
    setListings(next);
    await sSet("listings:" + session.email, next);
  };
  const addOrder = async (order) => {
    const next = [{ ...order, id: "ORD" + Date.now().toString().slice(-6), status: "pending", createdAt: new Date().toISOString() }, ...orders];
    setOrders(next);
    await sSet("orders:" + session.email, next);
    notify("Order added — tracking as Pending.");
  };
  const setOrderStatus = async (id, status) => {
    const next = orders.map((o) => (o.id === id ? { ...o, status } : o));
    setOrders(next);
    await sSet("orders:" + session.email, next);
  };

  const delivered = orders.filter((o) => o.status === "delivered");
  const pending = orders.filter((o) => o.status === "pending");
  const returned = orders.filter((o) => o.status === "returned");
  const confirmedProfit = delivered.reduce((s, o) => s + (o.sellPrice - o.costPrice) * o.qty, 0);
  const pendingCOD = pending.reduce((s, o) => s + o.sellPrice * o.qty, 0);
  const deliveredRevenue = delivered.reduce((s, o) => s + o.sellPrice * o.qty, 0);

  const NAV = [
    { id: "overview", label: "Overview", icon: Boxes },
    { id: "catalog", label: "Catalog", icon: Package },
    { id: "listings", label: "My Listings", icon: ClipboardCheck },
    { id: "orders", label: "Orders & COD", icon: Truck },
    { id: "wallet", label: "Wallet & Payouts", icon: ShieldCheck },
    { id: "settings", label: "Settings", icon: Sparkles },
    { id: "support", label: "Support", icon: MapPin },
  ];

  return (
    <div style={{ fontFamily: "Inter, sans-serif", background: "#F8FAFC" }} className="min-h-screen flex">
      {/* Sidebar */}
      <aside className="hidden md:flex flex-col w-64 px-5 py-6 min-h-screen" style={{ background: "#0B1F3A" }}>
        <div className="flex items-center gap-2.5 px-2">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg,#00C896,#0B1F3A)" }}>
            <PackageCheck className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-white text-lg" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            Emirate<span style={{ color: "#00C896" }}>Fulfil</span>
          </span>
        </div>
        <div className="mt-8 space-y-1">
          {NAV.map((n) => (
            <button
              key={n.id} onClick={() => setTab(n.id)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-colors"
              style={tab === n.id ? { background: "rgba(0,200,150,0.15)", color: "#00C896" } : { color: "rgba(255,255,255,0.6)" }}
            >
              <n.icon className="w-4.5 h-4.5" /> {n.label}
            </button>
          ))}
        </div>
        <div className="mt-auto pt-6" style={{ borderTop: "1px solid rgba(255,255,255,0.1)" }}>
          <div className="text-white text-sm font-semibold">{session.name}</div>
          <div className="text-white/40 text-xs">{session.company || session.email}</div>
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
          {NAV.map((n) => (
            <button key={n.id} onClick={() => { setTab(n.id); setMobileNavOpen(false); }} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-white/80">
              <n.icon className="w-4.5 h-4.5" /> {n.label}
            </button>
          ))}
          <button onClick={onLogout} className="w-full text-left px-3 py-2.5 text-sm font-semibold text-red-300">Log out</button>
        </div>
      )}

      {/* Main */}
      <main className="flex-1 px-6 md:px-10 py-8 md:py-8 pt-24 md:pt-8 max-w-6xl">
        {tab === "overview" && (
          <OverviewTab session={session} orders={orders} listings={listings} catalog={catalog} confirmedProfit={confirmedProfit} deliveredRevenue={deliveredRevenue} pending={pending} />
        )}
        {tab === "catalog" && <CatalogTab catalog={catalog} onAdd={addListing} />}
        {tab === "listings" && <ListingsTab catalog={catalog} listings={listings} onRemove={removeListing} />}
        {tab === "orders" && (
          <OrdersTab catalog={catalog} orders={orders} onAddOrder={addOrder} onSetStatus={setOrderStatus} confirmedProfit={confirmedProfit} pendingCOD={pendingCOD} returnedCount={returned.length} />
        )}
        {tab === "wallet" && <WalletTab confirmedProfit={confirmedProfit} pending={pending} notify={notify} />}
        {tab === "settings" && <SettingsTab session={session} />}
        {tab === "support" && <SupportTab />}
      </main>
    </div>
  );
}

function StatCard({ label, value, color = "#0B1F3A", sub }) {
  return (
    <div className="rounded-2xl p-5 bg-white" style={{ border: "1px solid #E5E7EB" }}>
      <div className="text-xs text-gray-500">{label}</div>
      <div className="text-2xl font-bold mt-1" style={{ color, fontFamily: "'Space Grotesk', sans-serif" }}>{value}</div>
      {sub && <div className="text-xs text-gray-400 mt-1">{sub}</div>}
    </div>
  );
}

function OverviewTab({ session, orders, listings, catalog, confirmedProfit, deliveredRevenue, pending }) {
  const topListing = catalog.find((p) => p.id === listings[0]);
  return (
    <div>
      <h1 className="text-2xl font-extrabold" style={{ color: "#0B1F3A", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Welcome back, {session.name.split(" ")[0]}</h1>
      <p className="text-sm text-gray-500 mt-1">Here's how your store is doing.</p>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
        <StatCard label="Total orders" value={orders.length} />
        <StatCard label="Pending" value={pending.length} color="#F8B400" />
        <StatCard label="Delivered revenue" value={"AED " + deliveredRevenue.toLocaleString()} />
        <StatCard label="Confirmed profit" value={"AED " + confirmedProfit.toLocaleString()} color="#00C896" />
      </div>
      <div className="grid lg:grid-cols-3 gap-5 mt-6">
        <div className="lg:col-span-2 rounded-2xl p-6 bg-white" style={{ border: "1px solid #E5E7EB" }}>
          <div className="font-bold text-sm mb-4" style={{ color: "#111827", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Recent orders</div>
          {orders.length === 0 ? (
            <div className="text-sm text-gray-400">No orders yet — add one from Orders &amp; COD.</div>
          ) : (
            orders.slice(0, 5).map((o) => (
              <div key={o.id} className="flex items-center justify-between py-2.5" style={{ borderBottom: "1px solid #F3F4F6" }}>
                <div>
                  <div className="font-semibold text-sm" style={{ color: "#111827" }}>{o.productName}</div>
                  <div className="text-xs text-gray-400">{o.id} · {o.buyer || "Unnamed buyer"}</div>
                </div>
                <StatusPill status={o.status} />
              </div>
            ))
          )}
        </div>
        <div className="rounded-2xl p-6 bg-white" style={{ border: "1px solid #E5E7EB" }}>
          <div className="font-bold text-sm mb-4" style={{ color: "#111827", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Top listing</div>
          {topListing ? (
            <>
              <div className="text-3xl">{topListing.emoji}</div>
              <div className="mt-2 font-semibold text-sm">{topListing.name}</div>
              <div className="text-xs mt-1 font-semibold" style={{ color: "#F8B400" }}>Profit/unit: AED {topListing.sell - topListing.cost}</div>
            </>
          ) : (
            <div className="text-sm text-gray-400">Add a listing to see it here.</div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatusPill({ status }) {
  const styles = {
    delivered: { background: "rgba(0,200,150,0.15)", color: "#00a67e" },
    returned: { background: "rgba(239,68,68,0.12)", color: "#EF4444" },
    pending: { background: "rgba(248,180,0,0.15)", color: "#b07d00" },
  };
  return <span className="text-xs font-semibold px-2.5 py-1 rounded-full" style={styles[status]}>{status}</span>;
}

function CatalogTab({ catalog, onAdd }) {
  return (
    <div>
      <h1 className="text-2xl font-extrabold" style={{ color: "#0B1F3A", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Product catalog</h1>
      <p className="text-sm text-gray-500 mt-1">Pick products to add to your listings. Cost price is what you pay us; sell price is your suggested COD price.</p>
      <div className="mt-6 grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {catalog.map((p) => (
          <div key={p.id} className="rounded-2xl p-5 bg-white" style={{ border: "1px solid #E5E7EB" }}>
            <div className="text-4xl">{p.emoji}</div>
            <div className="mt-3 font-semibold text-sm" style={{ color: "#111827" }}>{p.name}</div>
            <div className="text-xs text-gray-400 mt-0.5">{p.category}</div>
            <div className="mt-3 flex items-center justify-between text-sm">
              <span className="text-gray-500">Cost <b style={{ color: "#111827", fontFamily: "'Space Grotesk', sans-serif" }}>AED {p.cost}</b></span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">Sell <b style={{ color: "#00C896", fontFamily: "'Space Grotesk', sans-serif" }}>AED {p.sell}</b></span>
            </div>
            <div className="mt-1 text-xs font-semibold" style={{ color: "#F8B400" }}>Profit/unit: AED {p.sell - p.cost}</div>
            <button onClick={() => onAdd(p.id)} className="mt-4 w-full text-xs font-semibold py-2.5 rounded-full text-white" style={{ background: "#0B1F3A" }}>+ Add to my listings</button>
          </div>
        ))}
      </div>
    </div>
  );
}

function ListingsTab({ catalog, listings, onRemove }) {
  return (
    <div>
      <h1 className="text-2xl font-extrabold" style={{ color: "#0B1F3A", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>My listings</h1>
      <p className="text-sm text-gray-500 mt-1">Products you're actively selling.</p>
      <div className="mt-6 grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {listings.length === 0 && <div className="col-span-full text-sm text-gray-400 py-10 text-center">No listings yet — add products from the Catalog tab.</div>}
        {listings.map((id) => {
          const p = catalog.find((x) => x.id === id);
          if (!p) return null;
          return (
            <div key={id} className="rounded-2xl p-5 bg-white" style={{ border: "1px solid #E5E7EB" }}>
              <div className="text-4xl">{p.emoji}</div>
              <div className="mt-3 font-semibold text-sm">{p.name}</div>
              <div className="mt-1 text-xs font-semibold" style={{ color: "#F8B400" }}>Profit/unit: AED {p.sell - p.cost}</div>
              <button onClick={() => onRemove(id)} className="mt-4 w-full text-xs font-semibold py-2 rounded-full text-red-500" style={{ border: "1px solid #FECACA" }}>Remove</button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function OrdersTab({ catalog, orders, onAddOrder, onSetStatus, confirmedProfit, pendingCOD, returnedCount }) {
  const [form, setForm] = useState({ productId: catalog[0]?.id, qty: 1, sellPrice: "", buyer: "", city: "" });
  const submit = (e) => {
    e.preventDefault();
    const product = catalog.find((p) => p.id === form.productId);
    onAddOrder({
      productId: product.id, productName: product.name,
      qty: parseInt(form.qty) || 1,
      sellPrice: parseFloat(form.sellPrice) || product.sell,
      costPrice: product.cost, buyer: form.buyer, city: form.city,
    });
    setForm({ productId: catalog[0]?.id, qty: 1, sellPrice: "", buyer: "", city: "" });
  };
  return (
    <div>
      <h1 className="text-2xl font-extrabold" style={{ color: "#0B1F3A", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Orders &amp; COD tracking</h1>
      <p className="text-sm text-gray-500 mt-1">Log new COD orders and update their status as they move.</p>
      <div className="grid sm:grid-cols-3 gap-4 mt-6">
        <StatCard label="Confirmed profit" value={"AED " + confirmedProfit.toLocaleString()} color="#00C896" />
        <StatCard label="Pending COD value" value={"AED " + pendingCOD.toLocaleString()} color="#F8B400" />
        <StatCard label="Returned" value={returnedCount} color="#EF4444" />
      </div>
      <form onSubmit={submit} className="mt-8 rounded-2xl p-6 bg-white grid sm:grid-cols-5 gap-3 items-end" style={{ border: "1px solid #E5E7EB" }}>
        <div className="sm:col-span-2">
          <label className="text-xs text-gray-500">Product</label>
          <select value={form.productId} onChange={(e) => setForm({ ...form, productId: e.target.value })} className="mt-1 w-full rounded-lg px-3 py-2 text-sm" style={{ border: "1px solid #E5E7EB" }}>
            {catalog.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <div><label className="text-xs text-gray-500">Qty</label><input type="number" min="1" value={form.qty} onChange={(e) => setForm({ ...form, qty: e.target.value })} className="mt-1 w-full rounded-lg px-3 py-2 text-sm" style={{ border: "1px solid #E5E7EB" }} /></div>
        <div><label className="text-xs text-gray-500">Sell price (AED)</label><input type="number" placeholder="auto" value={form.sellPrice} onChange={(e) => setForm({ ...form, sellPrice: e.target.value })} className="mt-1 w-full rounded-lg px-3 py-2 text-sm" style={{ border: "1px solid #E5E7EB" }} /></div>
        <div><label className="text-xs text-gray-500">Buyer city</label><input placeholder="Dubai" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} className="mt-1 w-full rounded-lg px-3 py-2 text-sm" style={{ border: "1px solid #E5E7EB" }} /></div>
        <div className="sm:col-span-4"><label className="text-xs text-gray-500">Buyer name</label><input placeholder="Optional" value={form.buyer} onChange={(e) => setForm({ ...form, buyer: e.target.value })} className="mt-1 w-full rounded-lg px-3 py-2 text-sm" style={{ border: "1px solid #E5E7EB" }} /></div>
        <button className="text-sm font-semibold py-2.5 rounded-full" style={{ background: "#00C896", color: "#04140f" }}>+ Add order</button>
      </form>
      <div className="mt-8 rounded-2xl bg-white overflow-x-auto" style={{ border: "1px solid #E5E7EB" }}>
        {orders.length === 0 ? (
          <div className="text-sm text-gray-400 py-10 text-center">No orders yet — add one above.</div>
        ) : (
          <table className="w-full text-sm">
            <thead><tr className="text-left text-xs text-gray-400" style={{ borderBottom: "1px solid #F3F4F6" }}>
              <th className="px-4 py-3">Order</th><th className="px-4 py-3">Product</th><th className="px-4 py-3">Buyer/City</th>
              <th className="px-4 py-3">Sell</th><th className="px-4 py-3">Profit</th><th className="px-4 py-3">Status</th>
            </tr></thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id} style={{ borderBottom: "1px solid #FAFAFA" }}>
                  <td className="px-4 py-3 text-xs text-gray-500" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{o.id}</td>
                  <td className="px-4 py-3">{o.productName} <span className="text-gray-400">×{o.qty}</span></td>
                  <td className="px-4 py-3 text-gray-500">{o.buyer || "—"}{o.city ? ", " + o.city : ""}</td>
                  <td className="px-4 py-3" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>AED {o.sellPrice * o.qty}</td>
                  <td className="px-4 py-3" style={{ color: "#00C896", fontFamily: "'Space Grotesk', sans-serif" }}>AED {(o.sellPrice - o.costPrice) * o.qty}</td>
                  <td className="px-4 py-3">
                    <select value={o.status} onChange={(e) => onSetStatus(o.id, e.target.value)} className="text-xs rounded-full px-2 py-1 font-semibold border-0" style={
                      o.status === "delivered" ? { background: "rgba(0,200,150,0.15)", color: "#00a67e" } :
                      o.status === "returned" ? { background: "rgba(239,68,68,0.12)", color: "#EF4444" } :
                      { background: "rgba(248,180,0,0.15)", color: "#b07d00" }
                    }>
                      <option value="pending">Pending</option>
                      <option value="delivered">Delivered</option>
                      <option value="returned">Returned</option>
                    </select>
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
  const inTransit = pending.reduce((s, o) => s + (o.sellPrice - o.costPrice) * o.qty, 0);
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
        <StatCard label="Available balance" value={"AED " + confirmedProfit.toLocaleString()} color="#00C896" />
        <StatCard label="In transit (pending)" value={"AED " + inTransit.toLocaleString()} color="#F8B400" />
        <StatCard label="Lifetime payouts" value="AED 0" />
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

  const notify = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(""), 2600);
  };

  const handleAuthed = (s) => { setSession(s); setView("dashboard"); };
  const handleLogout = () => { setSession(null); setView("home"); };

  return (
    <>
      <Toast message={toastMsg} />
      {view === "home" && <HomePage session={session} onNav={setView} onLogout={handleLogout} />}
      {(view === "signup" || view === "login") && (
        <AuthPage mode={view} onAuthed={handleAuthed} onSwitch={setView} notify={notify} />
      )}
      {view === "dashboard" && session && <Dashboard session={session} onLogout={handleLogout} notify={notify} />}
    </>
  );
}
