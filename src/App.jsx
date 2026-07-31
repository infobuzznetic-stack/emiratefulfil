import React, { useState, useEffect, createContext, useContext } from "react";
import { createClient } from "@supabase/supabase-[#DYNAMIC_REPLACEMENT]";

/* ============================================================
   SUPABASE CLIENT CONFIGURATION
============================================================ */
const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL || "https://your-supabase-url.supabase.co";
const SUPABASE_ANON_KEY = process.env.REACT_APP_SUPABASE_ANON_KEY || "your-anon-key";
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const LogoContext = createContext({ logoUrl: null, setLogoUrl: () => {} });
const DELIVERY_CHARGE = 15;

/* ============================================================
   CUSTOM HOOKS & UTILS
============================================================ */
function useGoogleFonts() {
  useEffect(() => {
    const link = document.createElement("link");
    link.href =
      "https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Space+Grotesk:wght@500;600;700&display=swap";
    link.rel = "stylesheet";
    document.head.appendChild(link);
  }, []);
}

function Toast({ message }) {
  if (!message) return null;
  return (
    <div className="fixed bottom-5 right-5 z-50 bg-slate-900 text-white text-xs font-semibold px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2 animate-bounce">
      <span>✨</span>
      <span>{message}</span>
    </div>
  );
}

function StatusPill({ status }) {
  const styles = {
    pending: "bg-amber-50 text-amber-600 border-amber-200",
    fulfilled: "bg-blue-50 text-blue-600 border-blue-200",
    shipped: "bg-purple-50 text-purple-600 border-purple-200",
    delivered: "bg-emerald-50 text-emerald-600 border-emerald-200",
    returned: "bg-rose-50 text-rose-600 border-rose-200",
  };
  return (
    <span className={`text-[10px] uppercase font-bold px-2.5 py-1 rounded-full border ${styles[status] || "bg-gray-50 text-gray-600 border-gray-200"}`}>
      {status}
    </span>
  );
}

function PaymentPill({ status }) {
  const isPaid = status === "paid";
  return (
    <span className={`text-[10px] uppercase font-bold px-2.5 py-1 rounded-full border ${isPaid ? "bg-emerald-50 text-emerald-600 border-emerald-200" : "bg-gray-100 text-gray-500 border-gray-200"}`}>
      {isPaid ? "Paid" : "Unpaid"}
    </span>
  );
}

/* ============================================================
   LANDING PAGE COMPONENTS
============================================================ */
function Navbar({ session, onNav, onLogout }) {
  return (
    <nav className="border-b border-gray-100 bg-white/80 backdrop-blur-md sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => onNav("home")}>
          <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-extrabold text-lg shadow-md" style={{ background: "linear-gradient(135deg, #0B1F3A, #00C896)" }}>
            E
          </div>
          <span className="font-extrabold text-xl tracking-tight" style={{ color: "#0B1F3A", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            Emirate<span style={{ color: "#00C896" }}>Fulfil</span>
          </span>
        </div>
        <div className="flex items-center gap-4">
          {session ? (
            <>
              <button onClick={() => onNav("dashboard")} className="text-xs font-semibold px-4 py-2 rounded-xl text-white" style={{ background: "#0B1F3A" }}>
                Dashboard
              </button>
              <button onClick={onLogout} className="text-xs font-semibold text-gray-500 hover:text-gray-800">
                Logout
              </button>
            </>
          ) : (
            <>
              <button onClick={() => onNav("login")} className="text-xs font-semibold text-gray-600 hover:text-gray-900">
                Log In
              </button>
              <button onClick={() => onNav("signup")} className="text-xs font-semibold px-4 py-2 rounded-xl text-white" style={{ background: "#00C896" }}>
                Get Started
              </button>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}

function Hero({ onSignup }) {
  return (
    <div className="py-20 px-4 text-center max-w-4xl mx-auto">
      <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-full">
        🇦🇪 UAE Cash on Delivery Sourcing & Fulfillment
      </span>
      <h1 className="text-4xl sm:text-6xl font-extrabold mt-6 leading-tight" style={{ color: "#0B1F3A", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
        Scale Your UAE E-Commerce Store Without Inventory
      </h1>
      <p className="text-gray-600 mt-4 text-base sm:text-lg max-w-2xl mx-auto">
        Source winning products, automate COD fulfillment across all 7 Emirates, and receive instant payouts directly to your account.
      </p>
      <div className="mt-8 flex justify-center gap-4">
        <button onClick={onSignup} className="px-8 py-3.5 rounded-full text-white font-bold text-sm shadow-xl hover:scale-105 transition-transform" style={{ background: "linear-gradient(135deg,#00C896,#00a67e)" }}>
          Start Selling Free
        </button>
      </div>
    </div>
  );
}

function TrustStrip() {
  return (
    <div className="border-y border-gray-100 py-6 bg-gray-50/50">
      <div className="max-w-5xl mx-auto px-4 flex flex-wrap justify-around items-center gap-6 text-xs font-bold text-gray-400 uppercase tracking-widest">
        <span>Dubai</span>
        <span>Abu Dhabi</span>
        <span>Sharjah</span>
        <span>Ajman</span>
        <span>Ras Al Khaimah</span>
        <span>Fujairah</span>
        <span>Umm Al Quwain</span>
      </div>
    </div>
  );
}

function Features() { return null; }
function OrderFlow() { return null; }
function DashboardPreview() { return null; }
function Pricing() { return null; }
function Testimonials() { return null; }
function FAQ() { return null; }
function CTA({ onSignup }) { return null; }
function Footer() { return null; }

/* ============================================================
   AUTH PAGES
============================================================ */
function AuthPage({ mode, onAuthed, onSwitch, notify }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setBusy(true);
    if (mode === "signup") {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { name, company } },
      });
      setBusy(false);
      if (error) { notify(error.message); return; }
      if (data?.user) {
        onAuthed({ email: data.user.email, name, company });
        notify("Account created successfully!");
      }
    } else {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      setBusy(false);
      if (error) { notify(error.message); return; }
      if (data?.user) {
        onAuthed({
          email: data.user.email,
          name: data.user.user_metadata?.name || email.split("@")[0],
          company: data.user.user_metadata?.company,
        });
        notify("Logged in successfully!");
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="max-w-md w-full bg-white p-8 rounded-2xl border border-gray-200 shadow-xl">
        <h2 className="text-2xl font-extrabold text-center mb-6" style={{ color: "#0B1F3A" }}>
          {mode === "signup" ? "Create your Seller Account" : "Log In to EmirateFulfil"}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === "signup" && (
            <>
              <div>
                <label className="text-xs font-semibold text-gray-600">Full Name</label>
                <input required value={name} onChange={(e) => setName(e.target.value)} placeholder="John Doe" className="mt-1 w-full p-2.5 border rounded-xl text-sm" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600">Company Name</label>
                <input value={company} onChange={(e) => setCompany(e.target.value)} placeholder="My Store LLC" className="mt-1 w-full p-2.5 border rounded-xl text-sm" />
              </div>
            </>
          )}
          <div>
            <label className="text-xs font-semibold text-gray-600">Email Address</label>
            <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="seller@example.com" className="mt-1 w-full p-2.5 border rounded-xl text-sm" />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-600">Password</label>
            <input required type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="mt-1 w-full p-2.5 border rounded-xl text-sm" />
          </div>
          <button type="submit" disabled={busy} className="w-full py-3 rounded-xl text-white font-bold text-sm bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50">
            {busy ? "Processing..." : mode === "signup" ? "Create Account" : "Sign In"}
          </button>
        </form>
        <div className="text-center mt-6 text-xs text-gray-500">
          {mode === "signup" ? (
            <span>Already have an account? <button onClick={() => onSwitch("login")} className="text-emerald-600 font-bold">Log In</button></span>
          ) : (
            <span>Don't have an account? <button onClick={() => onSwitch("signup")} className="text-emerald-600 font-bold">Sign Up</button></span>
          )}
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   PRODUCT LANDING / CART / CHECKOUT
============================================================ */
function ProductLandingPage({ product, catalog, onBack, onAddToCart, onBuyNow, onOpenProduct }) {
  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-2xl border border-gray-200">
      <button onClick={onBack} className="text-xs font-semibold text-gray-500 hover:text-gray-800 mb-6 flex items-center gap-1">← Back to Catalog</button>
      <div className="grid md:grid-cols-2 gap-8">
        <div className="rounded-2xl bg-gray-50 p-8 flex items-center justify-center h-80 overflow-hidden">
          {product.image_url ? (
            <img src={product.image_url} alt={product.name} className="max-h-full max-w-full object-contain" />
          ) : (
            <span className="text-8xl">{product.emoji || "📦"}</span>
          )}
        </div>
        <div>
          <span className="text-xs font-bold uppercase text-emerald-600">{product.category}</span>
          <h1 className="text-2xl font-bold mt-1 text-slate-900">{product.name}</h1>
          <p className="text-sm text-gray-500 mt-2">{product.description}</p>
          <div className="mt-6 flex items-baseline gap-4">
            <span className="text-3xl font-extrabold text-emerald-600">AED {product.sell}</span>
            <span className="text-xs text-gray-400">Supplier Cost: AED {product.cost}</span>
          </div>
          <div className="mt-8 flex gap-3">
            <button onClick={() => onAddToCart(1)} className="flex-1 py-3 border border-slate-300 font-semibold text-slate-700 rounded-xl text-sm hover:bg-slate-50">Add to Cart</button>
            <button onClick={() => onBuyNow(1)} className="flex-1 py-3 text-white font-semibold rounded-xl text-sm bg-emerald-500 hover:bg-emerald-600">Buy Now COD</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function CartView({ items, onUpdateQty, onRemove, onBack, onCheckout, total }) {
  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-2xl border border-gray-200">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-slate-900">Your Shopping Cart</h2>
        <button onClick={onBack} className="text-xs text-gray-500 hover:text-gray-800">← Back</button>
      </div>
      {items.length === 0 ? (
        <div className="text-center py-12 text-sm text-gray-400">Your cart is empty.</div>
      ) : (
        <div className="space-y-4">
          {items.map((it) => (
            <div key={it.id} className="flex items-center justify-between p-4 border rounded-xl">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg bg-gray-50 flex items-center justify-center overflow-hidden">
                  {it.image_url ? (
                    <img src={it.image_url} alt={it.name} className="w-full h-full object-contain" />
                  ) : (
                    <span className="text-xl">{it.emoji || "📦"}</span>
                  )}
                </div>
                <div>
                  <div className="font-semibold text-sm text-slate-800">{it.name}</div>
                  <div className="text-xs font-bold text-emerald-600">AED {it.sell}</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center border rounded-lg">
                  <button onClick={() => onUpdateQty(it.id, it.qty - 1)} className="px-2 py-1 text-xs">-</button>
                  <span className="px-3 text-xs font-semibold">{it.qty}</span>
                  <button onClick={() => onUpdateQty(it.id, it.qty + 1)} className="px-2 py-1 text-xs">+</button>
                </div>
                <button onClick={() => onRemove(it.id)} className="text-xs text-rose-500">Remove</button>
              </div>
            </div>
          ))}
          <div className="pt-4 border-t flex justify-between items-center">
            <span className="font-bold text-slate-800">Subtotal:</span>
            <span className="text-xl font-extrabold text-emerald-600">AED {total}</span>
          </div>
          <button onClick={onCheckout} className="w-full py-3 bg-emerald-500 text-white font-bold rounded-xl text-sm hover:bg-emerald-600">Proceed to COD Checkout</button>
        </div>
      )}
    </div>
  );
}

function CheckoutForm({ items, onBack, onSubmit }) {
  const [form, setForm] = useState({ name: "", phone: "", emirate: "Dubai", address: "" });
  const [busy, setBusy] = useState(false);

  const itemsTotal = items.reduce((s, i) => s + i.sell * i.qty, 0);
  const deliveryTotal = DELIVERY_CHARGE;
  const total = itemsTotal + deliveryTotal;
  const profitTotal = items.reduce((s, i) => s + (i.sell - i.cost) * i.qty, 0);

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setBusy(true);
    await onSubmit(form);
    setBusy(false);
  };

  const inputStyle = { border: "1px solid #E5E7EB", backgroundColor: "#F9FAFB" };

  return (
    <div className="max-w-3xl mx-auto p-6 bg-white rounded-2xl border border-gray-200">
      <button onClick={onBack} className="text-xs text-gray-500 hover:text-gray-800 mb-6">← Back to Cart</button>
      <h2 className="text-xl font-bold mb-6 text-slate-900">Cash on Delivery (COD) Customer Details</h2>
      <div className="grid md:grid-cols-5 gap-8">
        <form onSubmit={handleFormSubmit} className="md:col-span-3 space-y-4">
          <div>
            <label className="text-xs text-gray-500">Customer Full Name <span className="text-red-500">*</span></label>
            <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Mohammed Al Maktoum" className="mt-1 w-full rounded-lg px-3 py-2 text-sm" style={inputStyle} />
          </div>
          <div>
            <label className="text-xs text-gray-500">UAE Phone Number <span className="text-red-500">*</span></label>
            <input required type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+971 50 123 4567" className="mt-1 w-full rounded-lg px-3 py-2 text-sm" style={inputStyle} />
          </div>
          <div>
            <label className="text-xs text-gray-500">Emirate / City <span className="text-red-500">*</span></label>
            <select value={form.emirate} onChange={(e) => setForm({ ...form, emirate: e.target.value })} className="mt-1 w-full rounded-lg px-3 py-2 text-sm bg-white" style={inputStyle}>
              <option value="Dubai">Dubai</option>
              <option value="Abu Dhabi">Abu Dhabi</option>
              <option value="Sharjah">Sharjah</option>
              <option value="Ajman">Ajman</option>
              <option value="Ras Al Khaimah">Ras Al Khaimah</option>
              <option value="Fujairah">Fujairah</option>
              <option value="Umm Al Quwain">Umm Al Quwain</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-500">Delivery Address <span className="text-red-500">*</span></label>
            <textarea required value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Building, street, area / landmark" rows={3} className="mt-1 w-full rounded-lg px-3 py-2 text-sm" style={inputStyle} />
          </div>
          <button type="submit" disabled={busy} className="w-full text-sm font-semibold py-3.5 rounded-full text-white bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50">
            {busy ? "Placing Order..." : "Place COD Order"}
          </button>
        </form>

        <div className="md:col-span-2 space-y-4">
          <div className="rounded-2xl p-5 bg-white border border-gray-200">
            <div className="font-bold text-sm mb-3 text-slate-900">Order Summary</div>
            <div className="space-y-3">
              {items.map((it) => (
                <div key={it.id} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span>{it.emoji || "📦"}</span>
                    <span className="font-medium text-gray-700">{it.name} (x{it.qty})</span>
                  </div>
                  <span className="font-semibold">AED {it.sell * it.qty}</span>
                </div>
              ))}
              <div className="pt-3 border-t border-gray-100 space-y-1.5 text-xs text-gray-500">
                <div className="flex justify-between"><span>Items Subtotal</span><span>AED {itemsTotal}</span></div>
                <div className="flex justify-between"><span>Delivery Charge</span><span>AED {deliveryTotal}</span></div>
                <div className="flex justify-between text-sm font-bold text-gray-900 pt-2 border-t border-gray-100">
                  <span>Total COD</span>
                  <span className="text-emerald-600">AED {total}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl p-5 bg-emerald-50/60 border border-emerald-100">
            <div className="text-xs font-bold text-emerald-800 uppercase tracking-wider mb-1">Estimated Profit</div>
            <div className="text-2xl font-bold text-emerald-600">AED {profitTotal}</div>
            <div className="text-xs text-emerald-700 mt-1">Calculated on delivered COD orders after cost deduction.</div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   SELLER DASHBOARD TABS
============================================================ */

/* ---------------- CATALOG TAB ---------------- */
function CatalogTab({ catalog, onAdd, onPlaceOrder, notify, onViewOrders }) {
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [cart, setCart] = useState([]);
  const [view, setView] = useState("grid");

  const handleAddToCart = (qty = 1) => {
    if (!selectedProduct) return;
    const existing = cart.find((c) => c.id === selectedProduct.id);
    if (existing) {
      setCart(cart.map((c) => (c.id === selectedProduct.id ? { ...c, qty: c.qty + qty } : c)));
    } else {
      setCart([...cart, { ...selectedProduct, qty, listSell: selectedProduct.sell }]);
    }
    notify(`Added ${selectedProduct.name} to cart.`);
  };

  const handleBuyNow = (qty = 1) => {
    handleAddToCart(qty);
    setView("checkout");
  };

  const handleCheckoutSubmit = async (formData) => {
    for (const item of cart) {
      await onPlaceOrder({
        productId: item.id,
        productName: item.name,
        qty: item.qty,
        sellPrice: item.sell,
        costPrice: item.cost,
        listPrice: item.listSell,
        buyer: formData.name,
        city: formData.emirate,
        customerEmail: null,
        customerPhone: formData.phone,
        customerAddress: formData.address,
        deliveryCharge: DELIVERY_CHARGE,
      });
    }
    setCart([]);
    setView("grid");
    onViewOrders();
  };

  if (view === "product" && selectedProduct) {
    return (
      <ProductLandingPage
        product={selectedProduct}
        catalog={catalog}
        onBack={() => setView("grid")}
        onAddToCart={handleAddToCart}
        onBuyNow={handleBuyNow}
        onOpenProduct={(p) => setSelectedProduct(p)}
      />
    );
  }

  if (view === "cart") {
    return (
      <CartView
        items={cart}
        onUpdateQty={(id, qty) => setCart(qty <= 0 ? cart.filter((c) => c.id !== id) : cart.map((c) => (c.id === id ? { ...c, qty } : c)))}
        onRemove={(id) => setCart(cart.filter((c) => c.id !== id))}
        onBack={() => setView("grid")}
        onCheckout={() => setView("checkout")}
        total={cart.reduce((s, c) => s + c.sell * c.qty, 0)}
      />
    );
  }

  if (view === "checkout") {
    return (
      <CheckoutForm
        items={cart}
        onBack={() => setView("cart")}
        onSubmit={handleCheckoutSubmit}
      />
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-extrabold" style={{ color: "#0B1F3A", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Sourcing Catalog</h1>
          <p className="text-sm text-gray-500 mt-1">Browse and list winning products for your store.</p>
        </div>
        {cart.length > 0 && (
          <button
            onClick={() => setView("cart")}
            className="flex items-center gap-2 px-4 py-2.5 rounded-full text-white text-sm font-semibold shadow-lg bg-emerald-500 hover:bg-emerald-600"
          >
            <span>🛒 Cart</span>
            <span className="w-5 h-5 rounded-full bg-white text-emerald-800 text-xs flex items-center justify-center font-bold">{cart.length}</span>
          </button>
        )}
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {catalog.map((p) => (
          <div key={p.id} className="rounded-2xl p-5 bg-white flex flex-col justify-between" style={{ border: "1px solid #E5E7EB" }}>
            <div>
              <div className="rounded-xl flex items-center justify-center py-6 mb-4 bg-gray-50 overflow-hidden h-44">
                {p.image_url ? (
                  <img src={p.image_url} alt={p.name} className="h-full w-full object-contain" />
                ) : (
                  <span className="text-6xl">{p.emoji || "📦"}</span>
                )}
              </div>
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-600">{p.category}</span>
              <h3 className="font-bold text-base mt-1" style={{ color: "#0B1F3A" }}>{p.name}</h3>
              <p className="text-xs text-gray-500 mt-1.5 line-clamp-2">{p.description}</p>
            </div>

            <div className="mt-6 pt-4 border-t border-gray-100">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="text-xs text-gray-400">Cost Price</div>
                  <div className="text-sm font-semibold">AED {p.cost}</div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-gray-400">Retail Price</div>
                  <div className="text-sm font-bold text-emerald-600">AED {p.sell}</div>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => { setSelectedProduct(p); setView("product"); }}
                  className="flex-1 text-xs font-semibold py-2.5 rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50"
                >
                  View Details
                </button>
                <button
                  onClick={() => onAdd(p.id)}
                  className="flex-1 text-xs font-semibold py-2.5 rounded-xl text-white"
                  style={{ background: "#0B1F3A" }}
                >
                  + Add Listing
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------------- CATEGORIES TAB ---------------- */
function CategoriesTab({ catalog, listings, onAdd }) {
  const categories = Array.from(new Set(catalog.map((p) => p.category)));

  return (
    <div>
      <h1 className="text-2xl font-extrabold mb-1" style={{ color: "#0B1F3A", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Categories</h1>
      <p className="text-sm text-gray-500 mb-6">Explore products sorted by operational categories.</p>

      <div className="space-y-8">
        {categories.map((cat) => {
          const catProducts = catalog.filter((p) => p.category === cat);
          return (
            <div key={cat} className="rounded-2xl p-6 bg-white" style={{ border: "1px solid #E5E7EB" }}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold" style={{ color: "#0B1F3A" }}>{cat}</h2>
                <span className="text-xs font-semibold px-3 py-1 rounded-full bg-gray-100 text-gray-600">{catProducts.length} items</span>
              </div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {catProducts.map((p) => (
                  <div key={p.id} className="rounded-xl p-4 border border-gray-100 bg-gray-50 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center overflow-hidden border border-gray-200">
                        {p.image_url ? (
                          <img src={p.image_url} alt={p.name} className="h-full w-full object-contain" />
                        ) : (
                          <span className="text-xl">{p.emoji || "📦"}</span>
                        )}
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-gray-800 line-clamp-1">{p.name}</div>
                        <div className="text-xs font-bold text-emerald-600">AED {p.sell}</div>
                      </div>
                    </div>
                    <button
                      onClick={() => onAdd(p.id)}
                      className="text-xs font-bold px-2.5 py-1.5 rounded-lg bg-emerald-500 text-white hover:bg-emerald-600"
                    >
                      {listings.includes(p.id) ? "Listed" : "+ List"}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ---------------- ORDERS TAB ---------------- */
function OrdersTab({ orders }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-extrabold" style={{ color: "#0B1F3A", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Orders Log</h1>
          <p className="text-sm text-gray-500 mt-1">Track all fulfilled, pending, and returned orders.</p>
        </div>
      </div>

      <div className="rounded-2xl bg-white overflow-hidden border border-gray-200">
        {orders.length === 0 ? (
          <div className="text-center py-12 text-sm text-gray-400">No orders logged yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-100 text-xs font-semibold text-gray-400 bg-gray-50/50">
                  <th className="py-3.5 px-4">Order ID</th>
                  <th className="py-3.5 px-4">Product</th>
                  <th className="py-3.5 px-4">Customer</th>
                  <th className="py-3.5 px-4">City</th>
                  <th className="py-3.5 px-4">Total COD</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Payment</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-sm">
                {orders.map((o) => (
                  <tr key={o.id} className="hover:bg-gray-50/50">
                    <td className="py-3.5 px-4 font-mono text-xs font-semibold text-gray-600">{o.id}</td>
                    <td className="py-3.5 px-4 font-medium text-gray-900">{o.productName} <span className="text-xs text-gray-400">(x{o.qty})</span></td>
                    <td className="py-3.5 px-4 text-gray-600">{o.buyer || "N/A"}</td>
                    <td className="py-3.5 px-4 text-gray-600">{o.city}</td>
                    <td className="py-3.5 px-4 font-bold">AED {o.sellPrice * o.qty + (o.deliveryCharge || 0)}</td>
                    <td className="py-3.5 px-4"><StatusPill status={o.status} /></td>
                    <td className="py-3.5 px-4"><PaymentPill status={o.paymentStatus} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------------- INVOICES TAB ---------------- */
function InvoicesTab({ orders, unpaidInvoice, paidInvoice }) {
  const deliveredOrders = orders.filter((o) => o.status === "delivered");

  return (
    <div>
      <h1 className="text-2xl font-extrabold mb-1" style={{ color: "#0B1F3A", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Invoices & Earnings</h1>
      <p className="text-sm text-gray-500 mb-6">Reconcile delivered orders and track payouts.</p>

      <div className="grid sm:grid-cols-2 gap-4 mb-8">
        <div className="rounded-2xl p-6 bg-white border border-gray-200">
          <div className="text-xs text-gray-400">Unpaid Invoice Balance</div>
          <div className="text-3xl font-extrabold mt-2 text-amber-500">AED {unpaidInvoice}</div>
        </div>
        <div className="rounded-2xl p-6 bg-white border border-gray-200">
          <div className="text-xs text-gray-400">Total Paid Out</div>
          <div className="text-3xl font-extrabold mt-2 text-emerald-500">AED {paidInvoice}</div>
        </div>
      </div>

      <div className="rounded-2xl bg-white p-6 border border-gray-200">
        <h2 className="font-bold text-base mb-4" style={{ color: "#0B1F3A" }}>Delivered Order Receipts</h2>
        {deliveredOrders.length === 0 ? (
          <div className="text-sm text-gray-400 py-6 text-center">No delivered orders ready for invoicing yet.</div>
        ) : (
          <div className="space-y-3">
            {deliveredOrders.map((o) => (
              <div key={o.id} className="flex items-center justify-between p-4 rounded-xl border border-gray-100 bg-gray-50">
                <div>
                  <div className="font-semibold text-sm text-gray-800">{o.productName} ({o.id})</div>
                  <div className="text-xs text-gray-500">Customer: {o.buyer} · {o.city}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold text-emerald-600">+AED {(o.sellPrice - o.listPrice) * o.qty} Profit</div>
                  <PaymentPill status={o.paymentStatus} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------------- SETTINGS TAB ---------------- */
function SettingsTab({ session }) {
  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-extrabold mb-1" style={{ color: "#0B1F3A", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Account Settings</h1>
      <p className="text-sm text-gray-500 mb-6">Manage seller profile details.</p>

      <div className="rounded-2xl bg-white p-6 space-y-4 border border-gray-200">
        <div>
          <label className="text-xs text-gray-400">Seller Name</label>
          <div className="text-sm font-semibold text-gray-800 mt-0.5">{session.name}</div>
        </div>
        <div>
          <label className="text-xs text-gray-400">Email Address</label>
          <div className="text-sm font-semibold text-gray-800 mt-0.5">{session.email}</div>
        </div>
        <div>
          <label className="text-xs text-gray-400">Company Name</label>
          <div className="text-sm font-semibold text-gray-800 mt-0.5">{session.company || "Independent Seller"}</div>
        </div>
      </div>
    </div>
  );
}

/* ---------------- ADMIN TAB (WITH IMAGE URL & EDIT FEATURE) ---------------- */
function AdminTab({ catalog, sellerCount, notify, onCatalogChanged }) {
  const [newProd, setNewProd] = useState({
    name: "",
    category: "Electronics",
    cost: "",
    sell: "",
    emoji: "📦",
    image_url: "",
    description: "",
  });

  const [editingId, setEditingId] = useState(null);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!newProd.name || !newProd.cost || !newProd.sell) return;

    if (editingId) {
      // Update existing product
      const { error } = await supabase
        .from("products")
        .update({
          name: newProd.name,
          category: newProd.category,
          cost: Number(newProd.cost),
          sell: Number(newProd.sell),
          emoji: newProd.emoji || "📦",
          image_url: newProd.image_url || null,
          description: newProd.description,
        })
        .eq("id", editingId);

      if (error) {
        notify("Error updating product: " + error.message);
        return;
      }
      notify("Product updated successfully!");
      setEditingId(null);
    } else {
      // Add new product
      const { error } = await supabase.from("products").insert({
        name: newProd.name,
        category: newProd.category,
        cost: Number(newProd.cost),
        sell: Number(newProd.sell),
        emoji: newProd.emoji || "📦",
        image_url: newProd.image_url || null,
        description: newProd.description,
      });

      if (error) {
        notify("Error adding product: " + error.message);
        return;
      }
      notify("New product added to catalog!");
    }

    setNewProd({ name: "", category: "Electronics", cost: "", sell: "", emoji: "📦", image_url: "", description: "" });
    onCatalogChanged();
  };

  const startEdit = (p) => {
    setEditingId(p.id);
    setNewProd({
      name: p.name || "",
      category: p.category || "Electronics",
      cost: p.cost || "",
      sell: p.sell || "",
      emoji: p.emoji || "📦",
      image_url: p.image_url || "",
      description: p.description || "",
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setNewProd({ name: "", category: "Electronics", cost: "", sell: "", emoji: "📦", image_url: "", description: "" });
  };

  return (
    <div>
      <h1 className="text-2xl font-extrabold mb-1" style={{ color: "#0B1F3A", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Admin Control Panel</h1>
      <p className="text-sm text-gray-500 mb-6">Manage global catalog, product images, and system metrics.</p>

      <div className="grid sm:grid-cols-2 gap-4 mb-8">
        <div className="rounded-2xl p-5 bg-white border border-gray-200">
          <div className="text-xs text-gray-400">Total Registered Sellers</div>
          <div className="text-3xl font-extrabold mt-2" style={{ color: "#0B1F3A" }}>{sellerCount}</div>
        </div>
        <div className="rounded-2xl p-5 bg-white border border-gray-200">
          <div className="text-xs text-gray-400">Catalog Items</div>
          <div className="text-3xl font-extrabold mt-2 text-emerald-600">{catalog.length}</div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Form Column */}
        <div className="rounded-2xl bg-white p-6 border border-gray-200 h-fit">
          <h2 className="font-bold text-base mb-4" style={{ color: "#0B1F3A" }}>
            {editingId ? "✏️ Edit Catalog Product" : "➕ Add Catalog Product"}
          </h2>
          <form onSubmit={handleSave} className="space-y-3">
            <div className="grid grid-cols-4 gap-2">
              <input value={newProd.emoji} onChange={(e) => setNewProd({ ...newProd, emoji: e.target.value })} placeholder="Emoji" className="p-2 border rounded-xl text-center text-xl" />
              <input required value={newProd.name} onChange={(e) => setNewProd({ ...newProd, name: e.target.value })} placeholder="Product Name" className="col-span-3 p-2 border rounded-xl text-sm" />
            </div>

            {/* Image URL Input */}
            <div>
              <label className="text-[11px] font-semibold text-gray-500">Product Image URL</label>
              <input
                type="url"
                value={newProd.image_url}
                onChange={(e) => setNewProd({ ...newProd, image_url: e.target.value })}
                placeholder="https://images.unsplash.com/photo-..."
                className="w-full p-2 border rounded-xl text-sm mt-1"
              />
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-[11px] font-semibold text-gray-500">Cost (AED)</label>
                <input required type="number" value={newProd.cost} onChange={(e) => setNewProd({ ...newProd, cost: e.target.value })} placeholder="Cost" className="w-full p-2 border rounded-xl text-sm" />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-gray-500">Sell (AED)</label>
                <input required type="number" value={newProd.sell} onChange={(e) => setNewProd({ ...newProd, sell: e.target.value })} placeholder="Sell" className="w-full p-2 border rounded-xl text-sm" />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-gray-500">Category</label>
                <select value={newProd.category} onChange={(e) => setNewProd({ ...newProd, category: e.target.value })} className="w-full p-2 border rounded-xl text-sm bg-white">
                  <option value="Electronics">Electronics</option>
                  <option value="Home & Kitchen">Home & Kitchen</option>
                  <option value="Beauty">Beauty</option>
                  <option value="Accessories">Accessories</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-[11px] font-semibold text-gray-500">Description</label>
              <textarea value={newProd.description} onChange={(e) => setNewProd({ ...newProd, description: e.target.value })} placeholder="Product description..." rows={2} className="w-full p-2 border rounded-xl text-sm" />
            </div>

            <div className="flex gap-2 pt-2">
              <button type="submit" className="flex-1 py-2.5 rounded-xl text-white font-semibold text-sm bg-emerald-500 hover:bg-emerald-600">
                {editingId ? "Update Product" : "Add to Catalog"}
              </button>
              {editingId && (
                <button type="button" onClick={cancelEdit} className="px-4 py-2.5 rounded-xl border border-gray-300 text-gray-600 text-sm font-semibold hover:bg-gray-50">
                  Cancel
                </button>
              )}
            </div>
          </form>
        </div>

        {/* Existing Products List Column */}
        <div className="lg:col-span-2 space-y-3">
          <h2 className="font-bold text-base mb-2" style={{ color: "#0B1F3A" }}>Manage Products ({catalog.length})</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {catalog.map((p) => (
              <div key={p.id} className="rounded-xl p-4 bg-white border border-gray-200 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 rounded-lg bg-gray-50 flex items-center justify-center overflow-hidden border border-gray-100 flex-shrink-0">
                    {p.image_url ? (
                      <img src={p.image_url} alt={p.name} className="h-full w-full object-contain" />
                    ) : (
                      <span className="text-2xl">{p.emoji || "📦"}</span>
                    )}
                  </div>
                  <div>
                    <div className="font-bold text-sm text-slate-800 line-clamp-1">{p.name}</div>
                    <div className="text-xs text-gray-400">{p.category}</div>
                    <div className="text-xs font-semibold text-emerald-600 mt-0.5">AED {p.cost} / AED {p.sell}</div>
                  </div>
                </div>
                <button
                  onClick={() => startEdit(p)}
                  className="p-2 rounded-lg border border-gray-200 text-xs font-semibold hover:bg-gray-50 text-slate-700"
                >
                  ✏️ Edit
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   MAIN DASHBOARD COMPONENT
============================================================ */
function Dashboard({ session, onLogout, notify }) {
  const [activeTab, setActiveTab] = useState("catalog");
  const [catalog, setCatalog] = useState([]);
  const [listings, setListings] = useState([]);
  const [orders, setOrders] = useState([]);
  const [sellerCount, setSellerCount] = useState(1);

  const fetchCatalog = async () => {
    const { data } = await supabase.from("products").select("*");
    if (data) setCatalog(data);
  };

  const fetchOrders = async () => {
    const { data } = await supabase.from("orders").select("*");
    if (data) setOrders(data);
  };

  useEffect(() => {
    fetchCatalog();
    fetchOrders();
  }, []);

  const handlePlaceOrder = async (orderData) => {
    const { error } = await supabase.from("orders").insert({
      ...orderData,
      sellerEmail: session.email,
      status: "pending",
      paymentStatus: "unpaid",
    });
    if (error) { notify(error.message); return; }
    notify("COD Order placed successfully!");
    fetchOrders();
  };

  const unpaidInvoice = orders.filter((o) => o.paymentStatus === "unpaid" && o.status === "delivered").reduce((s, o) => s + (o.sellPrice - o.listPrice) * o.qty, 0);
  const paidInvoice = orders.filter((o) => o.paymentStatus === "paid").reduce((s, o) => s + (o.sellPrice - o.listPrice) * o.qty, 0);

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 text-white p-6 flex flex-col justify-between hidden md:flex">
        <div>
          <div className="flex items-center gap-2 mb-8">
            <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center font-extrabold text-slate-900">E</div>
            <span className="font-bold text-lg">EmirateFulfil</span>
          </div>
          <nav className="space-y-1">
            {[
              { id: "catalog", label: "Products", icon: "📦" },
              { id: "categories", label: "Categories", icon: "🏷️" },
              { id: "orders", label: "Orders", icon: "🚚" },
              { id: "invoices", label: "Invoices", icon: "💳" },
              { id: "settings", label: "Settings", icon: "⚙️" },
              { id: "admin", label: "Admin", icon: "👑" },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors ${activeTab === t.id ? "bg-emerald-500 text-slate-900 font-bold" : "text-slate-400 hover:text-white hover:bg-slate-800"}`}
              >
                <span>{t.icon}</span>
                <span>{t.label}</span>
              </button>
            ))}
          </nav>
        </div>
        <div>
          <div className="text-xs text-slate-400 font-semibold">{session.name}</div>
          <div className="text-[10px] text-slate-500 truncate mb-3">{session.email}</div>
          <button onClick={onLogout} className="w-full py-2 rounded-lg border border-slate-700 text-slate-300 text-xs font-semibold hover:bg-slate-800">
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 p-6 sm:p-10 max-w-7xl">
        {activeTab === "catalog" && <CatalogTab catalog={catalog} onAdd={(id) => setListings([...listings, id])} onPlaceOrder={handlePlaceOrder} notify={notify} onViewOrders={() => setActiveTab("orders")} />}
        {activeTab === "categories" && <CategoriesTab catalog={catalog} listings={listings} onAdd={(id) => setListings([...listings, id])} />}
        {activeTab === "orders" && <OrdersTab orders={orders} />}
        {activeTab === "invoices" && <InvoicesTab orders={orders} unpaidInvoice={unpaidInvoice} paidInvoice={paidInvoice} />}
        {activeTab === "settings" && <SettingsTab session={session} />}
        {activeTab === "admin" && <AdminTab catalog={catalog} sellerCount={sellerCount} notify={notify} onCatalogChanged={fetchCatalog} />}
      </main>
    </div>
  );
}

/* ============================================================
   MAIN APP WRAPPER
============================================================ */
export default function App() {
  const [view, setView] = useState("home");
  const [session, setSession] = useState(null);
  const [toastMsg, setToastMsg] = useState("");
  const [logoUrl, setLogoUrl] = useState(null);

  useGoogleFonts();

  const notify = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(""), 3500);
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      if (s?.user) {
        setSession({
          email: s.user.email,
          name: s.user.user_metadata?.name || s.user.email.split("@")[0],
          company: s.user.user_metadata?.company,
        });
      }
    });
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setView("home");
    notify("Logged out successfully.");
  };

  return (
    <LogoContext.Provider value={{ logoUrl, setLogoUrl }}>
      <div className="min-h-screen text-slate-800 selection:bg-emerald-400 selection:text-slate-900 bg-white">
        <Toast message={toastMsg} />

        {view === "home" && (
          <>
            <Navbar session={session} onNav={(v) => setView(v)} onLogout={handleLogout} />
            <Hero onSignup={() => setView("signup")} />
            <TrustStrip />
          </>
        )}

        {(view === "login" || view === "signup") && (
          <AuthPage
            mode={view}
            onAuthed={(user) => {
              setSession(user);
              setView("dashboard");
            }}
            onSwitch={(v) => setView(v)}
            notify={notify}
          />
        )}

        {view === "dashboard" && session && (
          <Dashboard session={session} onLogout={handleLogout} notify={notify} />
        )}
      </div>
    </LogoContext.Provider>
  );
}
