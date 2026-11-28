"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { getWorkspace, saveSupplier, saveProduct, manageVisit, evaluateProduct, getTeam, inviteMember, changeMember, revokeInvitation, saveSettings, type Workspace } from "@/lib/sourcing.functions";
import { canManage, canWrite } from "@/lib/sourcing-schema";
import { getGps, uploadPhoto, download, toCsv, downloadXls, fmtDate, bdt, LOGO_URL, friendlyError, type Gps } from "@/lib/app-utils";
import { Sel, Toggle, DateField, Splash } from "@/components/primitives";
import { LayoutDashboard, Store, Package, MapPin, GitCompareArrows, Map as MapIcon, BarChart3, Users, ScrollText, Settings, LogOut, Menu, PanelLeftClose, Plus, Search, Camera, Navigation, Star, Heart, Download, Play, Square, X, Trash2, WifiOff, RefreshCw, Compass, Clock3, CircleCheck, Printer } from "lucide-react";

type View = "dashboard" | "suppliers" | "products" | "visits" | "compare" | "map" | "reports" | "users" | "logs" | "settings";
const NAV: { id: View; label: string; icon: any }[] = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard }, { id: "suppliers", label: "Supplier Management", icon: Store },
  { id: "products", label: "Product Catalog", icon: Package }, { id: "visits", label: "Sourcing Visits", icon: MapPin },
  { id: "compare", label: "Product Comparison", icon: GitCompareArrows }, { id: "map", label: "Market & Location Map", icon: MapIcon },
  { id: "reports", label: "Reports & Analytics", icon: BarChart3 }, { id: "users", label: "User Management", icon: Users },
  { id: "logs", label: "Activity Logs", icon: ScrollText }, { id: "settings", label: "Settings", icon: Settings },
];
type AnyRec = any;
const tierOf = (p: AnyRec, q: number) => (p.product_price_tiers ?? []).find((t: AnyRec) => t.quantity === q);
const evalOf = (p: AnyRec) => (Array.isArray(p.product_evaluations) ? p.product_evaluations[0] : p.product_evaluations) ?? { favorite: false, score: null, status: "Unreviewed", notes: "" };

export default function App() {
  const [session, setSession] = useState<any>(null); const [authReady, setAuthReady] = useState(false);
  useEffect(() => { supabase.auth.getSession().then(({ data }) => { setSession(data.session); setAuthReady(true); }); const { data: l } = supabase.auth.onAuthStateChange((_e, s) => setSession(s)); return () => l.subscription.unsubscribe(); }, []);
  if (!authReady) return <Splash />;
  return <>{session ? <WorkspaceShell key={session.user.id} userId={session.user.id} email={session.user.email ?? ""} /> : <Login />}</>;
}

function Login() {
  const [email, setEmail] = useState(""); const [password, setPassword] = useState(""); const [busy, setBusy] = useState(false); const [mode, setMode] = useState<"login" | "reset">("login");
  const submit = async (e: React.FormEvent) => { e.preventDefault(); setBusy(true); try {
    if (mode === "reset") { const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${location.origin}/reset-password` }); if (error) throw error; toast.success("Password reset email sent. Check your inbox."); setMode("login"); }
    else { const { error } = await supabase.auth.signInWithPassword({ email, password }); if (error) throw error; }
  } catch (err: any) { toast.error(friendlyError(err)); } finally { setBusy(false); } };
  return <div className="auth-page"><Toaster /><div className="auth-panel">
    <img className="auth-logo" src={LOGO_URL} alt="TASMEEM" onError={(e) => { (e.target as HTMLImageElement).src = "/favicon.png"; }} />
    <h1>TASMEEM SOURCE</h1><p>Discover. Evaluate. Source.<br />Supplier Sourcing &amp; Procurement Intelligence</p>
    <form className="auth-form" onSubmit={submit}>
      <div className="form-field"><label>Email address</label><input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" placeholder="you@company.com" /></div>
      {mode === "login" && <div className="form-field"><label>Password</label><input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" placeholder="••••••••" /></div>}
      <Button type="submit" disabled={busy}>{busy ? "Please wait…" : mode === "login" ? "Sign in securely" : "Send reset email"}</Button>
    </form>
    <p className="auth-note">{mode === "login" ? <>Forgot your password? <button type="button" onClick={() => setMode("reset")} style={{ textDecoration: "underline" }}>Reset it</button></> : <>Remembered it? <button type="button" onClick={() => setMode("login")} style={{ textDecoration: "underline" }}>Back to sign in</button></>}<br />Invite-only system. Public registration is disabled — contact the Super Admin for access.</p>
  </div></div>;
}

export function ResetPassword() {
  const [password, setPassword] = useState(""); const [busy, setBusy] = useState(false);
  const submit = async (e: React.FormEvent) => { e.preventDefault(); setBusy(true); const { error } = await supabase.auth.updateUser({ password }); setBusy(false); if (error) toast.error(friendlyError(error)); else { toast.success("Password set. You can now sign in."); location.href = "/"; } };
  return <div className="auth-page"><Toaster /><div className="auth-panel">
    <img className="auth-logo" src={LOGO_URL} alt="TASMEEM" onError={(e) => { (e.target as HTMLImageElement).src = "/favicon.png"; }} />
    <h1>Set your password</h1><p>Complete your TASMEEM SOURCE invitation or password reset.</p>
    <form className="auth-form" onSubmit={submit}><div className="form-field"><label>New password (min. 8 characters)</label><input type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" /></div><Button type="submit" disabled={busy}>{busy ? "Saving…" : "Set password & continue"}</Button></form>
  </div></div>;
}

function WorkspaceShell({ userId, email }: { userId: string; email: string }) {
  const [ws, setWs] = useState<Workspace | null>(null); const [error, setError] = useState(""); const [view, setView] = useState<View>("dashboard");
  const [collapsed, setCollapsed] = useState(false); const [mobileOpen, setMobileOpen] = useState(false); const [online, setOnline] = useState(typeof navigator !== "undefined" ? navigator.onLine : true);
  const [supplierModal, setSupplierModal] = useState(false); const [productModal, setProductModal] = useState<null | { supplierId?: string | undefined }>(null);
  const [selectedSupplier, setSelectedSupplier] = useState<string | null>(null); const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const load = useCallback(async () => { try { setWs(await getWorkspace()); setError(""); } catch (e: any) { setError(friendlyError(e)); } }, []);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { const on = () => setOnline(true), off = () => setOnline(false); addEventListener("online", on); addEventListener("offline", off); return () => { removeEventListener("online", on); removeEventListener("offline", off); }; }, []);
  const go = (v: View) => { setView(v); setMobileOpen(false); setSelectedSupplier(null); };
  if (error && !ws) return <div className="auth-page"><Toaster /><div className="auth-panel"><h1>Access pending</h1><p>{error}</p><p className="auth-note">Signed in as {email}. If you were invited, your role may still be provisioning — try again shortly, or ask the Super Admin.</p><Button onClick={load}>Retry</Button>{" "}<Button variant="outline" onClick={() => supabase.auth.signOut()}>Sign out</Button></div></div>;
  if (!ws) return <Splash note="Loading suppliers, products and visits…" />;
  const activeVisit = (ws.visits as AnyRec[]).find((v) => v.status === "active" && v.created_by === userId);
  const ctx = { ws, userId, reload: load, go, openSupplier: () => setSupplierModal(true), openProduct: (supplierId?: string) => setProductModal({ supplierId }), setSelectedSupplier, selectedProducts, setSelectedProducts };
  return <div className={`workspace ${collapsed ? "collapsed" : ""} ${mobileOpen ? "mobile-open" : ""}`}><Toaster />
    <div className="mobile-backdrop" onClick={() => setMobileOpen(false)} />
    <aside className="workspace-sidebar">
      <div className="sidebar-brand"><img className="sidebar-logo" src={LOGO_URL} alt="" onError={(e) => { (e.target as HTMLImageElement).src = "/favicon.png"; }} /><div><strong>TASMEEM</strong><small>SOURCE</small></div></div>
      <nav className="sidebar-nav"><p className="nav-label">SOURCING</p>
        {NAV.slice(0, 6).map((n) => <button key={n.id} className={`nav-item ${view === n.id ? "active" : ""}`} onClick={() => go(n.id)}><n.icon /><span>{n.label}</span>{n.id === "suppliers" && <span className="nav-count">{(ws.stats as AnyRec)?.suppliers ?? 0}</span>}{n.id === "products" && <span className="nav-count">{(ws.stats as AnyRec)?.products ?? 0}</span>}</button>)}
        <p className="nav-label secondary">ADMINISTRATION</p>
        {NAV.slice(6).map((n) => <button key={n.id} className={`nav-item ${view === n.id ? "active" : ""}`} onClick={() => go(n.id)}><n.icon /><span>{n.label}</span></button>)}
      </nav>
      <div className="sidebar-bottom"><div style={{ display: "flex", alignItems: "center", gap: 10 }}><span className="avatar">{(ws.profile?.display_name || email).slice(0, 2).toUpperCase()}</span><div><div style={{ fontSize: 12, fontWeight: 700 }}>{ws.profile?.display_name || email}</div><div style={{ fontSize: 10, opacity: .6, textTransform: "capitalize" }}>{String(ws.role).replace("_", " ")}</div></div></div>
      <button className="nav-item" style={{ width: "100%", marginTop: 12 }} onClick={() => supabase.auth.signOut()}><LogOut /><span>Sign out</span></button><p className="sidebar-tagline">Discover. Evaluate. Source.</p></div>
    </aside>
    <div className="workspace-body">
      <header className="workspace-header">
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button className="subtle-button" aria-label="Menu" onClick={() => (innerWidth <= 760 ? setMobileOpen(true) : setCollapsed(!collapsed))}>{innerWidth <= 760 ? <Menu size={18} /> : <PanelLeftClose size={18} />}</button>
          <div className="breadcrumb"><span>TASMEEM SOURCE</span>/<b>{NAV.find((n) => n.id === view)?.label}</b></div>
        </div>
        <div className="header-actions"><span className="header-date">{new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</span>
          <span className="connection">{online ? <><span className="connection-dot" /> Online — synced</> : <><WifiOff size={13} /> Offline — drafts stay on this device</>}</span>
          {activeVisit && <span className="badge-status pending"><Clock3 size={11} /> Visit active: {activeVisit.market}</span>}
          <span className="avatar">{(ws.profile?.display_name || email).slice(0, 2).toUpperCase()}</span></div>
      </header>
      <main className="page-content">
        {!online && <div className="lock-banner"><span><WifiOff size={15} /> You are offline. New entries are kept as on-device drafts and must be synced before they count as Submitted.</span></div>}
        {view === "dashboard" && <Dashboard {...ctx} />}
        {view === "suppliers" && <Suppliers {...ctx} />}
        {view === "products" && <Products {...ctx} />}
        {view === "visits" && <Visits {...ctx} />}
        {view === "compare" && <Compare {...ctx} />}
        {view === "map" && <MapView {...ctx} />}
        {view === "reports" && <Reports {...ctx} />}
        {view === "users" && <UsersView {...ctx} />}
        {view === "logs" && <Logs {...ctx} />}
        {view === "settings" && <SettingsView {...ctx} />}
        <footer className="workspace-footer"><span>© {new Date().getFullYear()} TASMEEM SOURCE — Procurement Intelligence</span><span>Currency: BDT (৳) · GPS check-ins are explicit &amp; transparent</span></footer>
      </main>
    </div>
    {supplierModal && <SupplierForm ws={ws} userId={userId} activeVisit={activeVisit} close={() => setSupplierModal(false)} done={async () => { setSupplierModal(false); await load(); }} />}
    {productModal && <ProductForm ws={ws} userId={userId} activeVisit={activeVisit} presetSupplier={productModal.supplierId} close={() => setProductModal(null)} done={async () => { setProductModal(null); await load(); }} />}
    {selectedSupplier && <SupplierDetail ws={ws} id={selectedSupplier} close={() => setSelectedSupplier(null)} openProduct={(s: string) => setProductModal({ supplierId: s })} />}
    <nav className="mobile-bottom-nav" aria-label="Quick navigation">
      {([["dashboard", LayoutDashboard, "Home"], ["suppliers", Store, "Suppliers"], ["products", Package, "Products"], ["visits", MapPin, "Visits"]] as const).map(([id, Icon, label]) => <button key={id} className={view === id ? "active" : ""} onClick={() => go(id)}><Icon /><span>{label}</span></button>)}
      <button onClick={() => setMobileOpen(true)}><Menu /><span>More</span></button>
    </nav>
  </div>;
}
type Ctx = { ws: Workspace; userId: string; reload: () => Promise<void>; go: (v: View) => void; openSupplier: () => void; openProduct: (s?: string) => void; setSelectedSupplier: (id: string | null) => void; selectedProducts: string[]; setSelectedProducts: (ids: string[]) => void };

function Heading({ eyebrow, title, sub, children }: any) { return <div className="page-heading"><div><p className="eyebrow">{eyebrow}</p><h1>{title}</h1><p>{sub}</p></div><div className="page-heading-actions">{children}</div></div>; }

function Dashboard({ ws, go, openSupplier, openProduct }: Ctx) {
  const s = (ws.stats ?? {}) as AnyRec; const suppliers = ws.suppliers as AnyRec[]; const products = ws.products as AnyRec[]; const logs = ws.logs as AnyRec[]; const gps = ws.gps as AnyRec[];
  const byDay = useMemo(() => { const m = new Map<string, number>(); products.forEach((p) => { const d = String(p.created_at).slice(0, 10); m.set(d, (m.get(d) ?? 0) + 1); }); return [...m.entries()].sort().slice(-14); }, [products]);
  const max = Math.max(1, ...byDay.map(([, v]) => v));
  const best = [...products].filter((p) => tierOf(p, 100)?.unit_price != null).sort((a, b) => Number(tierOf(a, 100).unit_price) - Number(tierOf(b, 100).unit_price)).slice(0, 5);
  const stats = [
    { label: "Total Suppliers", value: s.suppliers ?? 0, icon: Store, foot: `${s.markets ?? 0} markets covered` }, { label: "Products Discovered", value: s.products ?? 0, icon: Package, foot: `${s.photos ?? 0} photographs`, cls: "gold" },
    { label: "Sourcing Visits", value: s.visits ?? 0, icon: MapPin, foot: `${s.reports ?? 0} submitted reports`, cls: "green" }, { label: "Pending Drafts", value: s.drafts ?? 0, icon: Clock3, foot: `${s.agents ?? 0} active sourcing agents`, cls: "gold" },
  ];
  return <><Heading eyebrow="Overview" title="Sourcing Dashboard" sub="Live numbers from your actual sourcing database — nothing here is sample data.">
    <Button variant="outline" className="export-overview" onClick={() => download("tasmeem-products.csv", toCsv(products.map((p) => ({ name: p.name, supplier: p.suppliers?.name, quality: p.quality, price_100: tierOf(p, 100)?.unit_price ?? "Not Available" }))))}><Download size={14} /> Export</Button>
    {canWrite(ws.role) && <Button onClick={openSupplier}><Plus size={14} /> New Supplier</Button>}</Heading>
    <div className="welcome-band"><div><p className="welcome-label">FIELD SOURCING WORKFLOW</p><h2>Start a visit, capture GPS, add suppliers &amp; products — all from your phone.</h2><p>Login → Start Visit → GPS → Supplier + photo → Products + color photos → BDT price tiers (10 / 100 / 500) → End Visit → Submit report.</p></div><div className="welcome-icon"><Compass /></div></div>
    <div className="stats-grid">{stats.map((x) => <div className="stat-card" key={x.label}><div className="stat-label">{x.label}<span className={`stat-symbol ${x.cls ?? ""}`}><x.icon size={15} /></span></div><div className="stat-number">{x.value}</div><div className="stat-foot"><CircleCheck />{x.foot}</div></div>)}</div>
    <div className="summary-strip"><span className="summary-item"><MapPin /> Markets visited <b>{s.markets ?? 0}</b></span><span className="summary-item"><Camera /> Photographs <b>{s.photos ?? 0}</b></span><span className="summary-item"><ScrollText /> Submitted reports <b>{s.reports ?? 0}</b></span><span className="summary-item"><Users /> Active agents <b>{s.agents ?? 0}</b></span></div>
    <div className="dashboard-columns">
      <section className="unframed-section"><div className="section-title"><div><h2>Product discovery timeline</h2><p>Products added per day (real records)</p></div></div>
        <div className="chart-surface"><div className="chart-legend"><span className="legend-key"><span className="legend-dot" /> Products</span><span>Last {byDay.length} active days</span></div>
        {byDay.length ? <div style={{ display: "flex", alignItems: "flex-end", gap: 6, flex: 1, marginTop: 16 }}>{byDay.map(([d, v]) => <div key={d} title={`${d}: ${v}`} style={{ flex: 1, background: "var(--gold)", borderRadius: 3, height: `${(v / max) * 100}%`, minHeight: 6 }} />)}</div> : <div className="empty-chart"><div className="chart-empty-label">No products yet — discoveries will chart here.</div>{[4, 3, 2, 1].map((n) => <div className="chart-line" key={n}><span>{n}</span></div>)}</div>}
        <div className="chart-x"><span>{byDay[0]?.[0] ?? ""}</span><span>{byDay.at(-1)?.[0] ?? ""}</span></div></div>
        <div className="recent-section"><div className="section-title"><div><h2>Best 100-piece prices</h2><p>Lowest verified unit prices — quality shown separately</p></div><button onClick={() => go("compare")}>Compare →</button></div>
        <div className="table-wrap"><table className="data-table"><thead><tr><th>Product</th><th>Supplier</th><th>Quality</th><th>100 pcs</th></tr></thead><tbody>{best.map((p) => <tr key={p.id}><td>{p.name}</td><td>{p.suppliers?.name}</td><td>{p.quality}</td><td><b>{bdt(tierOf(p, 100)?.unit_price)}</b></td></tr>)}{!best.length && <tr><td colSpan={4}>No priced products yet.</td></tr>}</tbody></table></div></div>
      </section>
      <section className="unframed-section"><div className="section-title"><div><h2>Recent activity</h2><p>Latest sourcing events &amp; GPS check-ins</p></div></div>
        <div className="activity-surface">{logs.length ? logs.slice(0, 8).map((l) => <div className="activity-row" key={l.id}><span className="activity-dot"><CircleCheck /></span><div><b>{l.action}</b><p>{fmtDate(l.created_at)}</p></div></div>) : <div className="empty-block"><span className="empty-symbol"><ScrollText /></span><h3>No activity yet</h3><p>Logins, suppliers, products and GPS check-ins will appear here.</p></div>}
        {gps.slice(0, 3).map((g) => <div className="activity-row" key={g.id}><span className="activity-dot"><Navigation /></span><div><b>{g.kind}</b><p>{g.latitude.toFixed(5)}, {g.longitude.toFixed(5)} · {fmtDate(g.created_at)}</p></div></div>)}</div>
        <div className="recent-section"><div className="section-title"><div><h2>Recently added suppliers</h2></div><button onClick={() => go("suppliers")}>View all →</button></div>
        {suppliers.slice(0, 4).map((x) => <div className="activity-row" key={x.id} style={{ cursor: "pointer" }}><span className="activity-dot"><Store size={12} /></span><div><b>{x.name}</b><p>{x.market} · {fmtDate(x.created_at)}</p></div></div>)}</div>
      </section>
    </div></>;
}

function PhotoPicker({ userId, value, onChange, label }: { userId: string; value: string[]; onChange: (v: string[]) => void; label: string }) {
  const [busy, setBusy] = useState(false); const ref = useRef<HTMLInputElement>(null);
  const pick = async (files: FileList | null) => { if (!files?.length) return; setBusy(true); try { const paths: string[] = []; for (const f of Array.from(files)) paths.push(await uploadPhoto(userId, f)); onChange([...value, ...paths]); toast.success(`${paths.length} photo(s) uploaded`); } catch (e: any) { toast.error(friendlyError(e)); } finally { setBusy(false); } };
  return <div className="form-field"><label>{label} *</label><div className="photo-picker">
    {value.map((p) => <span className="photo-preview" key={p}><img src={URL.createObjectURL(new Blob())} alt="" style={{ display: "none" }} /><span style={{ fontSize: 9, wordBreak: "break-all" }}>✓ {p.split("/").pop()}</span><button type="button" className="remove-photo" onClick={() => onChange(value.filter((x) => x !== p))}><X size={11} /></button></span>)}
    <input ref={ref} type="file" accept="image/*" capture="environment" multiple hidden onChange={(e) => pick(e.target.files)} />
    <Button type="button" variant="outline" disabled={busy} onClick={() => ref.current?.click()}><Camera size={14} /> {busy ? "Uploading & compressing…" : "Camera / Gallery"}</Button>
    <span className="photo-progress">{value.length} uploaded — at least 1 required. Images are compressed automatically.</span></div></div>;
}
function GpsField({ gps, setGps }: { gps: Gps | null; setGps: (g: Gps) => void }) {
  const [busy, setBusy] = useState(false);
  const capture = async () => { setBusy(true); try { const g = await getGps(); setGps(g); toast.success(`GPS captured: ${g.latitude.toFixed(5)}, ${g.longitude.toFixed(5)}`); } catch (e: any) { toast.error(friendlyError(e)); } finally { setBusy(false); } };
  return <div className="form-field"><label>GPS location * (explicit check-in — you will be told when it is captured)</label>
    {gps ? <p style={{ fontSize: 12 }}><Navigation size={13} /> {gps.latitude.toFixed(6)}, {gps.longitude.toFixed(6)} {gps.accuracy != null && `· accuracy ±${Math.round(gps.accuracy)}m`} <a href={`https://www.google.com/maps?q=${gps.latitude},${gps.longitude}`} target="_blank" rel="noreferrer" style={{ textDecoration: "underline" }}>Open in Google Maps</a></p> : <p style={{ fontSize: 11, color: "var(--muted-foreground)" }}>No GPS yet — submission is blocked without coordinates.</p>}
    <Button type="button" variant="outline" disabled={busy} onClick={capture}><Navigation size={14} /> {busy ? "Getting location…" : gps ? "Re-capture GPS" : "Capture GPS"}</Button></div>;
}
const F = ({ label, children, span }: any) => <div className="form-field" style={span ? { gridColumn: "1 / -1" } : undefined}><label>{label}</label>{children}</div>;

function SupplierForm({ ws, userId, activeVisit, close, done }: any) {
  const [f, setF] = useState<AnyRec>({ name: "", contact_person: "", mobile: "", whatsapp: "", alt_mobile: "", email: "", facebook: "", website: "", shop_number: "", market: activeVisit?.market ?? "", address: "", district: "", area: "", floor: "", building: "", visit_date: new Date().toISOString().slice(0, 10), type: "Wholesaler", relationship: "New", notes: "" });
  const [photos, setPhotos] = useState<string[]>([]); const [gps, setGps] = useState<Gps | null>(null); const [busy, setBusy] = useState(false); const [err, setErr] = useState("");
  const set = (k: string) => (e: any) => setF({ ...f, [k]: e.target.value });
  const setV = (k: string) => (v: string) => setF((prev: AnyRec) => ({ ...prev, [k]: v }));
  const save = async (status: "draft" | "submitted") => { setErr(""); if (!photos.length) return setErr("At least one supplier/shop photograph is required."); if (!gps) return setErr("GPS is mandatory for supplier creation — capture it first."); setBusy(true); try {
    await saveSupplier({ data: { id: crypto.randomUUID(), name: f.name, contact_person: f.contact_person, mobile: f.mobile, shop_number: f.shop_number, market: f.market, address: f.address, visit_date: f.visit_date, type: f.type, relationship: f.relationship, notes: f.notes, details: { whatsapp: f.whatsapp, alt_mobile: f.alt_mobile, email: f.email, facebook: f.facebook, website: f.website, district: f.district, area: f.area, floor: f.floor, building: f.building }, photos, gps, visit_id: activeVisit?.id ?? null, status } });
    toast.success(status === "draft" ? "Supplier saved as draft" : "Supplier submitted"); done(); } catch (e: any) { setErr(friendlyError(e)); } finally { setBusy(false); } };
  const draftLocal = () => { localStorage.setItem("tasmeem-supplier-draft", JSON.stringify({ f, photos })); toast.success("Draft kept on this device (offline-safe). It is NOT submitted until you save it to the server."); };
  return <div style={{ position: "fixed", inset: 0, background: "var(--overlay)", zIndex: 50, display: "grid", placeItems: "center", padding: 12 }}><div className="modal-wide" style={{ padding: 26, borderRadius: 8 }}>
    <div className="section-title"><div><h2 style={{ fontSize: 17 }}>Add Supplier</h2><p>One profile per shop — the same supplier can join many visits without duplicates.</p></div><button onClick={close}><X /></button></div>
    <div className="form-grid">
      <F label="Supplier / Shop Name *"><input required value={f.name} onChange={set("name")} /></F><F label="Contact Person *"><input required value={f.contact_person} onChange={set("contact_person")} /></F>
      <F label="Primary Mobile *"><input required value={f.mobile} onChange={set("mobile")} placeholder="01XXXXXXXXX" /></F><F label="WhatsApp Number"><input value={f.whatsapp} onChange={set("whatsapp")} /></F>
      <F label="Alternative Mobile"><input value={f.alt_mobile} onChange={set("alt_mobile")} /></F><F label="Email"><input type="email" value={f.email} onChange={set("email")} /></F>
      <F label="Shop Number *"><input required value={f.shop_number} onChange={set("shop_number")} /></F><F label="Market / Shopping Complex *"><input required value={f.market} onChange={set("market")} /></F>
      <F label="Full Address *" span><textarea required value={f.address} onChange={set("address")} style={{ minHeight: 50 }} /></F>
      <F label="District"><input value={f.district} onChange={set("district")} /></F><F label="Area"><input value={f.area} onChange={set("area")} /></F>
      <F label="Floor Number"><input value={f.floor} onChange={set("floor")} /></F><F label="Building Name"><input value={f.building} onChange={set("building")} /></F>
      <F label="Facebook Page"><input value={f.facebook} onChange={set("facebook")} /></F><F label="Website"><input value={f.website} onChange={set("website")} /></F>
      <F label="Visit Date *"><DateField value={f.visit_date} onChange={(v) => setF({ ...f, visit_date: v })} /></F>
      <F label="Supplier Type"><Sel value={f.type} onValueChange={setV("type")}>{["Manufacturer", "Importer", "Wholesaler", "Distributor", "Retailer", "Other"].map((x) => <option key={x}>{x}</option>)}</Sel></F>
      <F label="Relationship"><Sel value={f.relationship} onValueChange={setV("relationship")}>{["New", "Contacted", "Promising", "Verified", "Preferred", "Rejected"].map((x) => <option key={x}>{x}</option>)}</Sel></F>
      <F label="Additional Notes" span><textarea value={f.notes} onChange={set("notes")} /></F>
    </div>
    <div className="form-section"><PhotoPicker userId={userId} value={photos} onChange={setPhotos} label="Supplier / Shop Photograph" /></div>
    <div className="form-section"><GpsField gps={gps} setGps={setGps} /></div>
    {err && <p className="form-error">{err}</p>}
    <div className="form-actions"><Button type="button" variant="ghost" onClick={draftLocal}>Keep on-device draft</Button><Button type="button" variant="outline" disabled={busy} onClick={() => save("draft")}>Save Draft</Button><Button type="button" disabled={busy} onClick={() => save("submitted")}>{busy ? "Saving…" : "Submit Supplier"}</Button></div>
  </div></div>;
}

function Suppliers({ ws, openSupplier, setSelectedSupplier, openProduct }: Ctx) {
  const [q, setQ] = useState(""); const [type, setType] = useState("All"); const [rel, setRel] = useState("All"); const [page, setPage] = useState(0);
  const rows = (ws.suppliers as AnyRec[]).filter((s) => (type === "All" || s.type === type) && (rel === "All" || s.relationship === rel) && (`${s.name} ${s.market} ${s.mobile} ${s.contact_person}`.toLowerCase().includes(q.toLowerCase())));
  const pageRows = rows.slice(page * 10, page * 10 + 10);
  return <><Heading eyebrow="Suppliers" title="Supplier Management" sub={`${rows.length} suppliers — search, filter and open a full profile.`}>
    <Button variant="outline" onClick={() => download("suppliers.csv", toCsv(rows.map((s) => ({ name: s.name, contact: s.contact_person, mobile: s.mobile, market: s.market, type: s.type, relationship: s.relationship, address: s.address }))))}><Download size={14} /> CSV</Button>
    {canWrite(ws.role) && <Button onClick={openSupplier}><Plus size={14} /> Add Supplier</Button>}</Heading>
    <div className="toolbar"><div className="search-field"><Search /><input className="field-input" placeholder="Search name, market, mobile…" value={q} onChange={(e) => setQ(e.target.value)} /></div>
    <div style={{ display: "flex", gap: 8 }}><Sel className="field-input" value={type} onValueChange={setType}><option>All</option>{["Manufacturer", "Importer", "Wholesaler", "Distributor", "Retailer", "Other"].map((x) => <option key={x}>{x}</option>)}</Sel>
    <Sel className="field-input" value={rel} onValueChange={setRel}><option>All</option>{["New", "Contacted", "Promising", "Verified", "Preferred", "Rejected"].map((x) => <option key={x}>{x}</option>)}</Sel></div></div>
    <div className="table-wrap"><table className="data-table"><thead><tr><th>Supplier</th><th>Contact</th><th>Market</th><th>Type</th><th>Relationship</th><th>Rating</th><th>Status</th><th></th></tr></thead><tbody>
      {pageRows.map((s) => { const rating = (Array.isArray(s.supplier_ratings) ? s.supplier_ratings[0] : s.supplier_ratings)?.rating; const img = s.supplier_photos?.[0]?.path ? ws.urls[s.supplier_photos[0].path] : null; return <tr key={s.id}><td><span className="table-person">{img && <img src={img} alt="" />}<span><b>{s.name}</b><small>Shop {s.shop_number} · {s.visit_date}</small></span></span></td><td>{s.contact_person}<br /><small>{s.mobile}</small></td><td>{s.market}</td><td>{s.type}</td><td>{s.relationship}</td><td>{rating ? `${rating}/5 ★` : "—"}</td><td><span className={`badge-status ${s.status === "draft" ? "pending" : ""}`}>{s.status}</span></td><td><Button size="sm" variant="outline" onClick={() => setSelectedSupplier(s.id)}>Profile</Button>{" "}{canWrite(ws.role) && <Button size="sm" onClick={() => openProduct(s.id)}>+ Product</Button>}</td></tr>; })}
      {!pageRows.length && <tr><td colSpan={8}><div className="empty-block table-empty"><h3>No suppliers found</h3><p>Add your first supplier or adjust the filters.</p></div></td></tr>}
    </tbody></table></div>
    <div className="table-footer"><span>Showing {pageRows.length} of {rows.length}</span><span><button disabled={page === 0} onClick={() => setPage(page - 1)}>← Prev</button>{"  "}<button disabled={(page + 1) * 10 >= rows.length} onClick={() => setPage(page + 1)}>Next →</button></span></div></>;
}

function SupplierDetail({ ws, id, close, openProduct }: any) {
  const s = (ws.suppliers as AnyRec[]).find((x) => x.id === id); if (!s) return null;
  const products = (ws.products as AnyRec[]).filter((p) => p.supplier_id === id); const gps = (ws.gps as AnyRec[]).filter((g) => g.supplier_id === id);
  const rating = (Array.isArray(s.supplier_ratings) ? s.supplier_ratings[0] : s.supplier_ratings);
  const d = (s.details ?? {}) as AnyRec;
  return <div style={{ position: "fixed", inset: 0, background: "var(--overlay)", zIndex: 50, display: "grid", placeItems: "center", padding: 12 }}><div className="modal-wide" style={{ padding: 26, borderRadius: 8 }}>
    <div className="section-title"><div><h2 style={{ fontSize: 17 }}>{s.name}</h2><p>{s.market} · Shop {s.shop_number} · {s.relationship}{rating ? ` · ★ ${rating.rating}/5` : ""}</p></div><button onClick={close}><X /></button></div>
    <div className="photo-gallery">{(s.supplier_photos ?? []).map((p: AnyRec) => ws.urls[p.path] && <img key={p.id} src={ws.urls[p.path]} alt="Supplier" />)}</div>
    <dl className="detail-grid">
      <div><dt>Contact Person</dt><dd>{s.contact_person}</dd></div><div><dt>Mobile / WhatsApp</dt><dd>{s.mobile}{d.whatsapp ? ` / ${d.whatsapp}` : ""}</dd></div>
      <div><dt>Address</dt><dd>{s.address}{d.district ? `, ${d.district}` : ""}{d.floor ? `, Floor ${d.floor}` : ""}</dd></div><div><dt>Type / Visit Date</dt><dd>{s.type} · {s.visit_date}</dd></div>
      <div><dt>GPS</dt><dd>{s.latitude.toFixed(6)}, {s.longitude.toFixed(6)} — <a href={`https://www.google.com/maps?q=${s.latitude},${s.longitude}`} target="_blank" rel="noreferrer" style={{ textDecoration: "underline" }}>Navigate</a></dd></div>
      <div><dt>Created</dt><dd>{fmtDate(s.created_at)}</dd></div>
    </dl>
    {s.notes && <p style={{ marginTop: 14, fontSize: 12 }}>{s.notes}</p>}
    <div className="form-section"><h3>Products from this supplier ({products.length})</h3>{products.map((p) => <div className="activity-row" key={p.id}><span className="activity-dot"><Package size={12} /></span><div><b>{p.name}</b><p>{p.quality} · 100 pcs: {bdt(tierOf(p, 100)?.unit_price)}</p></div></div>)}{!products.length && <p style={{ fontSize: 11, color: "var(--muted-foreground)" }}>No products yet.</p>}
    <h3 style={{ marginTop: 18 }}>Visit / GPS history ({gps.length})</h3>{gps.map((g) => <p key={g.id} style={{ fontSize: 11 }}>{g.kind} — {g.latitude.toFixed(5)}, {g.longitude.toFixed(5)} · {fmtDate(g.created_at)}</p>)}
    <div className="form-actions">{canWrite(ws.role) && <Button onClick={() => { close(); openProduct(id); }}><Plus size={14} /> Add Product</Button>}<Button variant="outline" onClick={() => window.print()}><Printer size={14} /> Print Sourcing Sheet (A4)</Button></div></div>
  </div></div>;
}

function ProductForm({ ws, userId, activeVisit, presetSupplier, close, done }: any) {
  const cats = ws.categories as AnyRec[];
  const [f, setF] = useState<AnyRec>({ supplier_id: presetSupplier ?? (ws.suppliers[0]?.id ?? ""), category_id: cats[0]?.id ?? "", custom_category: "", name: "", description: "", quality: "Standard", material: "", brand: "", model: "", sku: "", origin: "", weight: "", dimensions: "", packaging_info: "", material_quality: "Good", packaging: "Individual Packaging Available", branding: "Need to Discuss", production: "Ready Stock", daily_capacity: "", restock: "", production_time: "", return_policy: "", payment: "Advance Payment", delivery_available: "Yes", delivery_time: "", moq: 10, stock: "", sample_price: "", sample_available: "Yes", negotiable: "Yes", bulk_discount: "Yes", branding_price: "", packaging_cost: "", delivery_cost: "", price_validity: "", last_verified: new Date().toISOString().slice(0, 10), remarks: "" });
  const [photos, setPhotos] = useState<string[]>([]); const [gps, setGps] = useState<Gps | null>(null); const [busy, setBusy] = useState(false); const [err, setErr] = useState("");
  const [colorMode, setColorMode] = useState("No"); const [colors, setColors] = useState<AnyRec[]>([]);
  const [sizeMode, setSizeMode] = useState("No"); const [sizes, setSizes] = useState<AnyRec[]>([]);
  const [tiers, setTiers] = useState<AnyRec[]>([{ quantity: 10, price: "", unavailable: false }, { quantity: 100, price: "", unavailable: false }, { quantity: 500, price: "", unavailable: false }]);
  const set = (k: string) => (e: any) => setF({ ...f, [k]: e.target.value });
  const setV = (k: string) => (v: string) => setF((prev: AnyRec) => ({ ...prev, [k]: v }));
  const save = async (status: "draft" | "submitted") => { setErr("");
    if (!f.supplier_id) return setErr("Choose a supplier first — add a supplier if none exists.");
    if (!photos.length) return setErr("At least one actual product photograph is mandatory.");
    if (!gps) return setErr("GPS is mandatory for product submission — capture it first.");
    if (colorMode === "Yes" && (!colors.length || colors.some((c) => !c.name || !c.photos?.length))) return setErr("Every color variation needs a name and its own photograph.");
    if (sizeMode === "Yes" && (!sizes.length || sizes.some((s) => !s.name))) return setErr("Add at least one size with a name.");
    if (tiers.some((t) => !t.unavailable && !(Number(t.price) > 0))) return setErr("Each quantity tier needs a per-unit BDT price or an explicit Not Available.");
    setBusy(true); try {
      let categoryId = f.category_id;
      if (f.custom_category.trim()) { const { supabase: sb } = await import("@/integrations/supabase/client"); const { data, error } = await sb.from("product_categories").insert({ name: f.custom_category.trim() }).select("id").single(); if (error) throw error; categoryId = data.id; }
      await saveProduct({ data: { id: crypto.randomUUID(), supplier_id: f.supplier_id, category_id: categoryId, visit_id: activeVisit?.id ?? null, name: f.name, description: f.description, quality: f.quality, material: f.material, moq: Number(f.moq) || 1, stock: f.stock === "" ? null : Number(f.stock), color_mode: colorMode as any, size_mode: sizeMode as any, details: { brand: f.brand, model: f.model, sku: f.sku, origin: f.origin, weight: f.weight, dimensions: f.dimensions, packaging_info: f.packaging_info, material_quality: f.material_quality, packaging: f.packaging, branding: f.branding, production: f.production, daily_capacity: f.daily_capacity, restock: f.restock, production_time: f.production_time, return_policy: f.return_policy, payment: f.payment, delivery_available: f.delivery_available, delivery_time: f.delivery_time, sample_price: f.sample_price, sample_available: f.sample_available, negotiable: f.negotiable, bulk_discount: f.bulk_discount, branding_price: f.branding_price, packaging_cost: f.packaging_cost, delivery_cost: f.delivery_cost, price_validity: f.price_validity, last_verified: f.last_verified, remarks: f.remarks }, photos, colors: colorMode === "Yes" ? colors.map((c) => ({ name: c.name, code: c.code ?? "", photos: c.photos, availability: c.availability ?? "Available", remarks: c.remarks ?? "" })) : [], sizes: sizeMode === "Yes" ? sizes.map((s) => ({ name: s.name, availability: s.availability ?? "Available", remarks: s.remarks ?? "" })) : [], tiers: tiers.map((t) => ({ quantity: Number(t.quantity), unit_price: t.unavailable ? null : Number(t.price), unavailable: !!t.unavailable })), gps, status } });
      toast.success(status === "draft" ? "Product saved as draft" : "Product submitted"); done(); } catch (e: any) { setErr(friendlyError(e)); } finally { setBusy(false); } };
  return <div style={{ position: "fixed", inset: 0, background: "var(--overlay)", zIndex: 50, display: "grid", placeItems: "center", padding: 12 }}><div className="modal-wide" style={{ padding: 26, borderRadius: 8 }}>
    <div className="section-title"><div><h2 style={{ fontSize: 17 }}>Add Product</h2><p>Prices are per individual piece in BDT (৳) — never the total order price.</p></div><button onClick={close}><X /></button></div>
    <div className="form-grid">
      <F label="Supplier *"><Sel value={f.supplier_id} onValueChange={setV("supplier_id")}>{(ws.suppliers as AnyRec[]).map((s) => <option key={s.id} value={s.id}>{s.name} — {s.market}</option>)}</Sel></F>
      <F label="Product Name *"><input value={f.name} onChange={set("name")} /></F>
      <F label="Category *"><Sel value={f.category_id} onValueChange={setV("category_id")}>{cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</Sel></F>
      <F label="Custom Category (optional)"><input value={f.custom_category} onChange={set("custom_category")} placeholder="Overrides selection if filled" /></F>
      <F label="Quality *"><Sel value={f.quality} onValueChange={setV("quality")}>{["Premium", "Standard", "Budget", "Needs Verification"].map((x) => <option key={x}>{x}</option>)}</Sel></F>
      <F label="Material"><input value={f.material} onChange={set("material")} /></F>
      <F label="Brand"><input value={f.brand} onChange={set("brand")} /></F><F label="Model"><input value={f.model} onChange={set("model")} /></F>
      <F label="SKU / Product Code"><input value={f.sku} onChange={set("sku")} /></F><F label="Country of Origin"><input value={f.origin} onChange={set("origin")} /></F>
      <F label="Weight"><input value={f.weight} onChange={set("weight")} /></F><F label="Dimensions"><input value={f.dimensions} onChange={set("dimensions")} /></F>
      <F label="Description *" span><textarea value={f.description} onChange={set("description")} /></F>
    </div>
    <div className="form-section"><PhotoPicker userId={userId} value={photos} onChange={setPhotos} label="Product Photographs (front / back / side / packaging / details)" /></div>
    <div className="form-section"><h3>Color Variations</h3>
      <div className="form-field"><label>Does this product have color variations?</label><Sel value={colorMode} onValueChange={setColorMode}><option>Yes</option><option>No</option><option>Not Applicable</option></Sel></div>
      {colorMode === "Yes" && <>{colors.map((c, i) => <div key={i} style={{ border: "1px solid var(--border)", borderRadius: 6, padding: 14, marginTop: 12 }}>
        <div className="form-grid"><F label="Color Name *"><input value={c.name ?? ""} onChange={(e) => { const n = [...colors]; n[i] = { ...c, name: e.target.value }; setColors(n); }} placeholder="Black, Navy Blue, Beige…" /></F>
        <F label="Color Code"><input value={c.code ?? ""} onChange={(e) => { const n = [...colors]; n[i] = { ...c, code: e.target.value }; setColors(n); }} /></F>
        <F label="Availability"><Sel value={c.availability ?? "Available"} onValueChange={(v) => { const n = [...colors]; n[i] = { ...c, availability: v }; setColors(n); }}><option>Available</option><option>Limited</option><option>Out of Stock</option></Sel></F>
        <F label="Remarks"><input value={c.remarks ?? ""} onChange={(e) => { const n = [...colors]; n[i] = { ...c, remarks: e.target.value }; setColors(n); }} /></F></div>
        <div style={{ marginTop: 10 }}><PhotoPicker userId={userId} value={c.photos ?? []} onChange={(v) => { const n = [...colors]; n[i] = { ...c, photos: v }; setColors(n); }} label={`Photograph for ${c.name || "this color"} *`} /></div>
        <Button type="button" variant="ghost" size="sm" onClick={() => setColors(colors.filter((_, j) => j !== i))}><Trash2 size={13} /> Remove color</Button></div>)}
      <Button type="button" variant="outline" size="sm" style={{ marginTop: 10 }} onClick={() => setColors([...colors, { name: "", code: "", photos: [], availability: "Available", remarks: "" }])}><Plus size={13} /> Add Color</Button></>}
      {colorMode === "No" && <p style={{ fontSize: 11, color: "var(--muted-foreground)", marginTop: 8 }}>Recorded: this product has no color variations.</p>}
    </div>
    <div className="form-section"><h3>Size Variations</h3>
      <div className="form-field"><label>Does this product have different sizes?</label><Sel value={sizeMode} onValueChange={setSizeMode}><option>Yes</option><option>No</option><option>Not Applicable</option></Sel></div>
      {sizeMode === "Yes" && <>{sizes.map((s, i) => <div className="variation-row" key={i}><input className="field-input" placeholder="S, M, L, XL, Custom…" value={s.name ?? ""} onChange={(e) => { const n = [...sizes]; n[i] = { ...s, name: e.target.value }; setSizes(n); }} /><Sel className="field-input" value={s.availability ?? "Available"} onValueChange={(v) => { const n = [...sizes]; n[i] = { ...s, availability: v }; setSizes(n); }}><option>Available</option><option>Limited</option><option>Out of Stock</option></Sel><Button type="button" variant="ghost" size="sm" onClick={() => setSizes(sizes.filter((_, j) => j !== i))}><Trash2 size={13} /></Button></div>)}
      <Button type="button" variant="outline" size="sm" onClick={() => setSizes([...sizes, { name: "", availability: "Available", remarks: "" }])}><Plus size={13} /> Add Size</Button></>}
    </div>
    <div className="form-section"><h3>Wholesale Prices — per unit, BDT (৳)</h3>
      {tiers.map((t, i) => <div className="price-row" key={i}><span>{i < 3 ? `${t.quantity} Pieces` : <input className="field-input" type="number" value={t.quantity} onChange={(e) => { const n = [...tiers]; n[i] = { ...t, quantity: Number(e.target.value) }; setTiers(n); }} />}</span>
        <input className="field-input" type="number" min="0" step="0.01" disabled={t.unavailable} placeholder="৳ per piece" value={t.price} onChange={(e) => { const n = [...tiers]; n[i] = { ...t, price: e.target.value }; setTiers(n); }} />
        <label style={{ fontSize: 11, display: "flex", gap: 6, alignItems: "center" }}><Toggle checked={!!t.unavailable} onCheckedChange={(v) => { const n = [...tiers]; n[i] = { ...t, unavailable: v, price: "" }; setTiers(n); }} /> Not Available</label></div>)}
      <Button type="button" variant="outline" size="sm" onClick={() => setTiers([...tiers, { quantity: 1000, price: "", unavailable: false }])}><Plus size={13} /> Add custom quantity tier</Button>
      <div className="form-grid" style={{ marginTop: 16 }}>
        <F label="Minimum Order Quantity (MOQ) *"><input type="number" min="1" value={f.moq} onChange={set("moq")} /></F><F label="Current Available Stock"><input type="number" min="0" value={f.stock} onChange={set("stock")} /></F>
        <F label="Sample Price (৳)"><input value={f.sample_price} onChange={set("sample_price")} /></F><F label="Sample Availability"><Sel value={f.sample_available} onValueChange={setV("sample_available")}><option>Yes</option><option>No</option></Sel></F>
        <F label="Negotiable Price"><Sel value={f.negotiable} onValueChange={setV("negotiable")}><option>Yes</option><option>No</option></Sel></F><F label="Bulk Discount Available"><Sel value={f.bulk_discount} onValueChange={setV("bulk_discount")}><option>Yes</option><option>No</option></Sel></F>
        <F label="Custom Branding Price (৳)"><input value={f.branding_price} onChange={set("branding_price")} /></F><F label="Packaging Cost (৳)"><input value={f.packaging_cost} onChange={set("packaging_cost")} /></F>
        <F label="Delivery Cost (৳)"><input value={f.delivery_cost} onChange={set("delivery_cost")} /></F><F label="Price Validity"><input value={f.price_validity} onChange={set("price_validity")} placeholder="e.g. 30 days" /></F>
        <F label="Last Verified Date"><DateField value={f.last_verified} onChange={(v) => setF({ ...f, last_verified: v })} /></F>
      </div>
    </div>
    <div className="form-section"><h3>Quality &amp; Business Information</h3><div className="form-grid">
      <F label="Material Quality"><Sel value={f.material_quality} onValueChange={setV("material_quality")}>{["Excellent", "Good", "Average", "Poor", "Not Checked"].map((x) => <option key={x}>{x}</option>)}</Sel></F>
      <F label="Packaging"><Sel value={f.packaging} onValueChange={setV("packaging")}>{["Individual Packaging Available", "Bulk Packaging Only", "Custom Packaging Available", "No Packaging"].map((x) => <option key={x}>{x}</option>)}</Sel></F>
      <F label="TASMEEM Logo Customization Possible?"><Sel value={f.branding} onValueChange={setV("branding")}><option>Yes</option><option>No</option><option>Need to Discuss</option></Sel></F>
      <F label="Production"><Sel value={f.production} onValueChange={setV("production")}>{["Ready Stock", "Made to Order", "Imported", "Locally Manufactured"].map((x) => <option key={x}>{x}</option>)}</Sel></F>
      <F label="Estimated Daily Supply Capacity"><input value={f.daily_capacity} onChange={set("daily_capacity")} /></F><F label="Restocking Time"><input value={f.restock} onChange={set("restock")} /></F>
      <F label="Minimum Production Time"><input value={f.production_time} onChange={set("production_time")} /></F>
      <F label="Defective Policy (return / exchange / warranty)"><input value={f.return_policy} onChange={set("return_policy")} /></F>
      <F label="Payment Terms"><Sel value={f.payment} onValueChange={setV("payment")}>{["Advance Payment", "Full Payment", "Partial Payment", "Other"].map((x) => <option key={x}>{x}</option>)}</Sel></F>
      <F label="Supplier Delivery Available?"><Sel value={f.delivery_available} onValueChange={setV("delivery_available")}><option>Yes</option><option>No</option></Sel></F>
      <F label="Delivery Time"><input value={f.delivery_time} onChange={set("delivery_time")} /></F><F label="Additional Remarks"><input value={f.remarks} onChange={set("remarks")} /></F>
    </div></div>
    <div className="form-section"><GpsField gps={gps} setGps={setGps} /></div>
    {err && <p className="form-error">{err}</p>}
    <div className="form-actions"><Button type="button" variant="ghost" onClick={() => { localStorage.setItem("tasmeem-product-draft", JSON.stringify({ f, tiers })); toast.success("Draft kept on this device — not submitted yet."); }}>Keep on-device draft</Button><Button type="button" variant="outline" disabled={busy} onClick={() => save("draft")}>Save Draft</Button><Button type="button" disabled={busy} onClick={() => save("submitted")}>{busy ? "Saving…" : "Submit Product"}</Button></div>
  </div></div>;
}

function Products({ ws, openProduct, reload }: Ctx) {
  const [q, setQ] = useState(""); const [cat, setCat] = useState("All"); const [status, setStatus] = useState("All"); const [sort, setSort] = useState("new");
  const rows = (ws.products as AnyRec[]).filter((p) => (cat === "All" || p.product_categories?.name === cat) && (status === "All" || evalOf(p).status === status || (status === "Favorite" && evalOf(p).favorite)) && (`${p.name} ${p.suppliers?.name}`.toLowerCase().includes(q.toLowerCase())));
  const sorted = [...rows].sort((a, b) => sort === "price100" ? (Number(tierOf(a, 100)?.unit_price ?? 1e12) - Number(tierOf(b, 100)?.unit_price ?? 1e12)) : String(b.created_at).localeCompare(String(a.created_at)));
  return <><Heading eyebrow="Catalog" title="Product Catalog" sub={`${sorted.length} products with real wholesale price tiers.`}>{canWrite(ws.role) && <Button onClick={() => openProduct()}><Plus size={14} /> Add Product</Button>}</Heading>
    <div className="toolbar"><div className="search-field"><Search /><input className="field-input" placeholder="Search products or suppliers…" value={q} onChange={(e) => setQ(e.target.value)} /></div>
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}><Sel className="field-input" value={cat} onValueChange={setCat}><option>All</option>{(ws.categories as AnyRec[]).map((c) => <option key={c.id}>{c.name}</option>)}</Sel>
    <Sel className="field-input" value={status} onValueChange={setStatus}><option>All</option><option>Favorite</option><option>Unreviewed</option><option>Shortlisted</option><option>Rejected</option><option>Approved for Further Research</option></Sel>
    <Sel className="field-input" value={sort} onValueChange={setSort}><option value="new">Newest first</option><option value="price100">Lowest 100-pc price</option></Sel></div></div>
    <div className="product-grid">{sorted.map((p) => { const img = p.product_photos?.[0]?.path ? ws.urls[p.product_photos[0].path] : null; const ev = evalOf(p); return <article className="product-card" key={p.id}>
      {img ? <img className="product-image" src={img} alt={p.name} /> : <div className="product-image" style={{ display: "grid", placeItems: "center" }}><Package /></div>}
      <div className="product-details"><h3>{p.name} {ev.favorite && <Heart size={13} fill="currentColor" style={{ display: "inline" }} />}</h3><p>{p.suppliers?.name} · {p.product_categories?.name} · {p.quality}{ev.score ? ` · Score ${ev.score}/10` : ""}</p>
      <p>{p.description}</p>
      {(p.product_colors ?? []).length > 0 && <p>Colors: {(p.product_colors as AnyRec[]).map((c) => c.name).join(", ")}</p>}
      {(p.product_sizes ?? []).length > 0 && <p>Sizes: {(p.product_sizes as AnyRec[]).map((s) => s.name).join(", ")}</p>}
      <div className="product-prices">{[10, 100, 500].map((n) => <span key={n}><small>{n} pcs</small><b>{bdt(tierOf(p, n)?.unit_price)}</b></span>)}<span><small>MOQ</small><b>{p.moq}</b></span></div>
      {canManage(ws.role) && <EvaluationEditor product={p} reload={reload} />}</div></article>; })}
    </div>{!sorted.length && <div className="empty-block"><span className="empty-symbol"><Package /></span><h3>No products found</h3><p>Add a product under a supplier, or adjust filters.</p></div>}</>;
}
function EvaluationEditor({ product, reload }: any) {
  const ev = evalOf(product); const [score, setScore] = useState(ev.score ?? ""); const [status, setStatus] = useState(ev.status); const [notes, setNotes] = useState(ev.notes ?? ""); const [fav, setFav] = useState(!!ev.favorite);
  const save = async () => { try { await evaluateProduct({ data: { product_id: product.id, favorite: fav, score: score === "" ? null : Number(score), status, notes } }); toast.success("Evaluation saved"); reload(); } catch (e: any) { toast.error(friendlyError(e)); } };
  return <div style={{ marginTop: 14, borderTop: "1px solid var(--border)", paddingTop: 12, display: "grid", gap: 8 }}>
    <label style={{ fontSize: 11, display: "flex", gap: 6, alignItems: "center" }}><Toggle checked={fav} onCheckedChange={setFav} /> <Star size={12} /> Favorite</label>
    <div style={{ display: "flex", gap: 8 }}><input className="field-input" type="number" min="1" max="10" placeholder="Score 1–10" value={score} onChange={(e) => setScore(e.target.value)} />
    <Sel className="field-input" value={status} onValueChange={setStatus}><option>Unreviewed</option><option>Shortlisted</option><option>Rejected</option><option>Approved for Further Research</option></Sel></div>
    <input className="field-input" placeholder="Internal evaluation notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
    <Button size="sm" variant="outline" onClick={save}>Save evaluation</Button></div>;
}

function Compare({ ws }: Ctx) {
  const [cat, setCat] = useState("All"); const [sortAsc, setSortAsc] = useState(true);
  const rows = (ws.products as AnyRec[]).filter((p) => cat === "All" || p.product_categories?.name === cat);
  const sorted = [...rows].sort((a, b) => (sortAsc ? 1 : -1) * (Number(tierOf(a, 100)?.unit_price ?? 1e12) - Number(tierOf(b, 100)?.unit_price ?? 1e12)));
  const lowest = (q: number) => Math.min(...rows.map((p) => Number(tierOf(p, q)?.unit_price ?? Infinity)));
  const cell = (p: AnyRec, q: number) => { const t = tierOf(p, q); const isLow = t?.unit_price != null && Number(t.unit_price) === lowest(q); return <td style={isLow ? { background: "var(--success-soft)", fontWeight: 800 } : undefined}>{bdt(t?.unit_price)}{isLow ? " ★ lowest" : ""}</td>; };
  return <><Heading eyebrow="Compare" title="Product Comparison" sub="Same/similar products across suppliers. Cheapest is highlighted — but quality stays a separate dimension, never auto-merged.">
    <Sel className="field-input" value={cat} onValueChange={setCat}><option>All</option>{(ws.categories as AnyRec[]).map((c) => <option key={c.id}>{c.name}</option>)}</Sel>
    <Button variant="outline" onClick={() => setSortAsc(!sortAsc)}>Sort by 100-pc price {sortAsc ? "↑" : "↓"}</Button></Heading>
    <div className="table-wrap"><table className="data-table"><thead><tr><th>Product</th><th>Supplier</th><th>Photo</th><th>10 pcs</th><th>100 pcs</th><th>500 pcs</th><th>MOQ</th><th>Quality</th><th>Material</th><th>Packaging</th><th>Branding</th><th>Stock</th></tr></thead><tbody>
    {sorted.map((p) => { const img = p.product_photos?.[0]?.path ? ws.urls[p.product_photos[0].path] : null; const d = p.details ?? {}; return <tr key={p.id}><td><b>{p.name}</b></td><td>{p.suppliers?.name}</td><td>{img && <img src={img} alt="" style={{ width: 44, height: 44, objectFit: "cover", borderRadius: 5 }} />}</td>{cell(p, 10)}{cell(p, 100)}{cell(p, 500)}<td>{p.moq}</td><td>{p.quality}</td><td>{p.material || "—"}</td><td>{d.packaging ?? "—"}</td><td>{d.branding ?? "—"}</td><td>{p.stock ?? "—"}</td></tr>; })}
    {!sorted.length && <tr><td colSpan={12}>No products to compare yet.</td></tr>}</tbody></table></div></>;
}

function Visits({ ws, userId, reload, openSupplier, openProduct }: Ctx & { userId?: string }) {
  const [market, setMarket] = useState(""); const [notes, setNotes] = useState(""); const [busy, setBusy] = useState(false);
  const visits = ws.visits as AnyRec[]; const active = visits.find((v) => v.status === "active" && v.created_by === (userId ?? ws.userId));
  const act = async (action: "start" | "end", visit?: AnyRec) => { setBusy(true); try { const gps = await getGps(); toast.info("GPS captured for this check-in — recording it transparently."); await manageVisit({ data: { id: action === "start" ? crypto.randomUUID() : visit.id, action, market: action === "start" ? market : visit.market, notes, gps } }); toast.success(action === "start" ? "Visit started" : "Visit ended & report submitted"); setMarket(""); setNotes(""); reload(); } catch (e: any) { toast.error(friendlyError(e)); } finally { setBusy(false); } };
  return <><Heading eyebrow="Field work" title="Sourcing Visits" sub="Foreground GPS check-ins only — no covert or background tracking. GPS is captured at start, per supplier/product, and at end.">
    {canWrite(ws.role) && !active && <span className="badge-status pending">No active visit</span>}</Heading>
    {canWrite(ws.role) && <div className="report-option" style={{ marginBottom: 22 }}><h2>{active ? `Active visit — ${active.market}` : "Start a sourcing visit"}</h2>
      {!active ? <><div className="form-grid"><F label="Market / Area *"><input value={market} onChange={(e) => setMarket(e.target.value)} placeholder="e.g. Islampur, Dhaka" /></F><F label="Visit Notes"><input value={notes} onChange={(e) => setNotes(e.target.value)} /></F></div>
      <div className="form-actions"><Button disabled={busy || market.trim().length < 2} onClick={() => act("start")}><Play size={14} /> Capture GPS &amp; Start Visit</Button></div></>
      : <><p style={{ fontSize: 12, color: "var(--muted-foreground)" }}>Started {fmtDate(active.started_at)}. Add suppliers and products — they will attach to this visit automatically.</p>
      <div className="form-field" style={{ marginTop: 12 }}><label>Closing notes</label><input className="field-input" value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
      <div className="form-actions"><Button variant="outline" onClick={openSupplier}><Plus size={14} /> Add Supplier</Button><Button variant="outline" onClick={() => openProduct()}>+ Add Product</Button><Button disabled={busy} onClick={() => act("end", active)}><Square size={14} /> Capture GPS, End Visit &amp; Submit Report</Button></div></>}</div>}
    <div className="table-wrap"><table className="data-table"><thead><tr><th>Visit</th><th>Market</th><th>Started</th><th>Ended</th><th>Suppliers</th><th>Status</th></tr></thead><tbody>
      {visits.map((v) => <tr key={v.id}><td><small>{v.id.slice(0, 8)}</small></td><td><b>{v.market}</b>{v.notes && <><br /><small>{v.notes}</small></>}</td><td>{fmtDate(v.started_at)}</td><td>{fmtDate(v.ended_at)}</td><td>{(v.visit_suppliers ?? []).length}</td><td><span className={`badge-status ${v.status === "active" ? "pending" : ""}`}>{v.status === "active" ? "Active" : "Submitted"}</span></td></tr>)}
      {!visits.length && <tr><td colSpan={6}>No visits yet.</td></tr>}</tbody></table></div></>;
}

function MapView({ ws }: Ctx) {
  const points = (ws.gps as AnyRec[]); const suppliers = ws.suppliers as AnyRec[];
  const first = points[0] ?? suppliers[0];
  const bbox = first ? `${first.longitude - 0.03},${first.latitude - 0.02},${first.longitude + 0.03},${first.latitude + 0.02}` : "";
  return <><Heading eyebrow="Locations" title="Market & Location Map" sub="Every pin is an explicit, timestamped GPS check-in recorded with the agent's knowledge." />
    {first ? <iframe title="Sourcing map" className="map-frame" src={`https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${first.latitude},${first.longitude}`} /> : <div className="empty-block"><span className="empty-symbol"><MapPin /></span><h3>No GPS records yet</h3><p>Start a visit to record the first location.</p></div>}
    <div className="recent-section"><div className="section-title"><div><h2>All recorded locations ({points.length + suppliers.length})</h2></div></div>
    <div className="table-wrap"><table className="data-table"><thead><tr><th>Kind</th><th>Coordinates</th><th>Accuracy</th><th>Time</th><th>Navigate</th></tr></thead><tbody>
      {points.map((g) => <tr key={g.id}><td>{g.kind}</td><td>{g.latitude.toFixed(6)}, {g.longitude.toFixed(6)}</td><td>{g.accuracy != null ? `±${Math.round(g.accuracy)}m` : "—"}</td><td>{fmtDate(g.created_at)}</td><td><a href={`https://www.google.com/maps?q=${g.latitude},${g.longitude}`} target="_blank" rel="noreferrer" style={{ textDecoration: "underline" }}>Google Maps →</a></td></tr>)}
      {suppliers.map((s) => <tr key={s.id}><td>Supplier — {s.name}</td><td>{s.latitude.toFixed(6)}, {s.longitude.toFixed(6)}</td><td>—</td><td>{fmtDate(s.created_at)}</td><td><a href={`https://www.google.com/maps?q=${s.latitude},${s.longitude}`} target="_blank" rel="noreferrer" style={{ textDecoration: "underline" }}>Google Maps →</a></td></tr>)}
    </tbody></table></div></div></>;
}

function Reports({ ws }: Ctx) {
  const suppliers = ws.suppliers as AnyRec[]; const products = ws.products as AnyRec[]; const visits = ws.visits as AnyRec[];
  const supplierRows = suppliers.map((s) => ({ name: s.name, contact_person: s.contact_person, mobile: s.mobile, whatsapp: (s.details as AnyRec)?.whatsapp ?? "", shop: s.shop_number, market: s.market, address: s.address, type: s.type, relationship: s.relationship, latitude: s.latitude, longitude: s.longitude, visit_date: s.visit_date, products: products.filter((p) => p.supplier_id === s.id).length }));
  const productRows = products.map((p) => ({ name: p.name, supplier: p.suppliers?.name, category: p.product_categories?.name, quality: p.quality, material: p.material, moq: p.moq, stock: p.stock ?? "", price_10_bdt: tierOf(p, 10)?.unit_price ?? "Not Available", price_100_bdt: tierOf(p, 100)?.unit_price ?? "Not Available", price_500_bdt: tierOf(p, 500)?.unit_price ?? "Not Available", colors: (p.product_colors ?? []).map((c: AnyRec) => c.name).join("; "), sizes: (p.product_sizes ?? []).map((s: AnyRec) => s.name).join("; "), status: evalOf(p).status, score: evalOf(p).score ?? "" }));
  const visitRows = visits.map((v) => ({ id: v.id, market: v.market, status: v.status, started: v.started_at, ended: v.ended_at ?? "", suppliers: (v.visit_suppliers ?? []).length, notes: v.notes }));
  const card = (title: string, desc: string, rows: Record<string, unknown>[], base: string) => <div className="report-option"><BarChart3 /><h2>{title}</h2><p>{desc} ({rows.length} records, real data only)</p>
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}><Button size="sm" variant="outline" onClick={() => download(`${base}.csv`, toCsv(rows))}><Download size={13} /> CSV</Button><Button size="sm" variant="outline" onClick={() => downloadXls(`${base}.xls`, rows)}><Download size={13} /> Excel</Button><Button size="sm" onClick={() => window.print()}><Printer size={13} /> PDF / Print A4</Button></div></div>;
  return <><Heading eyebrow="Exports" title="Reports & Analytics" sub="TASMEEM-branded printable A4 sheets, CSV and Excel exports — generated from live records." />
    <div className="report-options">{card("Supplier Report", "Supplier & contact info, location, GPS, product counts", supplierRows, "tasmeem-suppliers")}
    {card("Product Report", "Products with variations, price tiers and supplier info", productRows, "tasmeem-products")}
    {card("Sourcing Visit Report", "Visits with dates, suppliers, products and GPS trail", visitRows, "tasmeem-visits")}</div>
    <div className="recent-section"><div className="section-title"><div><h2>Printable Supplier Sourcing Sheet (A4)</h2><p>Use PDF / Print above — print styles hide navigation automatically.</p></div></div>
    <div className="table-wrap"><table className="data-table"><thead><tr><th>Supplier</th><th>Contact</th><th>Market</th><th>Products</th><th>GPS</th></tr></thead><tbody>{supplierRows.map((r, i) => <tr key={i}><td><b>{String(r.name)}</b></td><td>{String(r.contact_person)} · {String(r.mobile)}</td><td>{String(r.market)}</td><td>{String(r.products)}</td><td>{Number(r.latitude).toFixed(4)}, {Number(r.longitude).toFixed(4)}</td></tr>)}</tbody></table></div></div></>;
}

function UsersView({ ws, reload }: Ctx) {
  const [team, setTeam] = useState<AnyRec | null>(null); const [email, setEmail] = useState(""); const [role, setRole] = useState("agent"); const [busy, setBusy] = useState(false);
  const loadTeam = useCallback(async () => { try { setTeam(await getTeam() as any); } catch (e: any) { toast.error(friendlyError(e)); } }, []);
  useEffect(() => { if (canManage(ws.role)) loadTeam(); }, [loadTeam, ws.role]);
  if (!canManage(ws.role)) return <><Heading eyebrow="Team" title="User Management" sub="" /><div className="empty-block"><h3>Administrator access required</h3><p>Only Admins and the Super Admin can view team management.</p></div></>;
  const roleOf = (uid: string) => team?.roles?.find((r: AnyRec) => r.user_id === uid)?.role ?? "—";
  const [shareLink, setShareLink] = useState(""); const [shareEmail, setShareEmail] = useState("");
  const invite = async (inv?: AnyRec) => { setBusy(true); setShareLink(""); try { const res: AnyRec = await inviteMember({ data: { email: inv?.email ?? email, role: (inv?.role ?? role) as any, origin: location.origin, invitation_id: inv?.id ?? null } });
    if (res?.mode === "link" && res.link) { setShareLink(res.link); setShareEmail(inv?.email ?? email); toast.success("Email পাঠানো যায়নি, তবে সরাসরি পাঠানোর লিংক তৈরি হয়েছে — নিচে দেখুন।"); }
    else if (res?.mode === "existing") toast.success("This email already has an active account — role updated, no invitation email needed.");
    else toast.success("Invitation email sent — they set their own password from the secure link.");
    setEmail(""); loadTeam(); } catch (e: any) { toast.error(friendlyError(e)); } finally { setBusy(false); } };
  return <><Heading eyebrow="Team" title="User Management" sub="Invite-only. The Super Admin (haquenahian1961@gmail.com) is provisioned securely — nobody gains that role by registering with the email alone." />
    {ws.role === "super_admin" && <div className="report-option" style={{ marginBottom: 22 }}><h2>Invite a team member</h2><p>They receive an email with a secure link, set their own password, and become active. You never create or know their password.</p>
    <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}><input className="field-input" style={{ flex: "1 1 240px" }} type="email" placeholder="teammate@email.com" value={email} onChange={(e) => setEmail(e.target.value)} />
    <Sel className="field-input" style={{ width: 180 }} value={role} onValueChange={setRole}><option value="admin">Admin</option><option value="agent">Sourcing Agent</option><option value="viewer">Viewer</option></Sel>
    <Button disabled={busy || !email.includes("@")} onClick={() => invite()}>{busy ? "Sending…" : "Send Invitation"}</Button></div>
    {shareLink && <div style={{ marginTop: 14, border: "1px solid var(--gold)", background: "var(--gold-soft)", borderRadius: 10, padding: 14 }}>
      <p style={{ fontSize: 12, fontWeight: 700, marginBottom: 6 }}>Direct invite link for {shareEmail}</p>
      <p style={{ fontSize: 11, color: "var(--muted-foreground)", marginBottom: 10 }}>The email service could not send this one. Copy this secure link and send it to them directly (e.g. WhatsApp) — they will set their own password. The link expires soon, so send it now.</p>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}><input className="field-input" readOnly value={shareLink} style={{ flex: "1 1 260px", fontSize: 11 }} onFocus={(e) => e.target.select()} />
      <Button size="sm" onClick={async () => { try { await navigator.clipboard.writeText(shareLink); toast.success("Invite link copied"); } catch { toast.error("Copy failed — long-press the link field to copy it manually."); } }}>Copy Link</Button>
      <Button size="sm" variant="ghost" onClick={() => setShareLink("")}>Dismiss</Button></div></div>}</div>}
    <div className="section-title"><div><h2>Team members</h2></div><Button size="sm" variant="outline" onClick={loadTeam}><RefreshCw size={13} /> Refresh</Button></div>
    <div className="table-wrap"><table className="data-table"><thead><tr><th>Member</th><th>Role</th><th>Active</th><th>Joined</th>{ws.role === "super_admin" && <th>Actions</th>}</tr></thead><tbody>
      {(team?.profiles ?? []).map((p: AnyRec) => <tr key={p.id}><td><b>{p.display_name || p.id.slice(0, 8)}</b></td><td style={{ textTransform: "capitalize" }}>{String(roleOf(p.id)).replace("_", " ")}</td><td>{p.active ? "Yes" : "Deactivated"}</td><td>{fmtDate(p.created_at)}</td>
      {ws.role === "super_admin" && <td>{roleOf(p.id) !== "super_admin" && <span style={{ display: "flex", gap: 6 }}><Sel className="field-input" style={{ width: 130 }} value={roleOf(p.id)} onValueChange={async (v) => { try { await changeMember({ data: { user_id: p.id, active: p.active, role: v as any } }); toast.success("Role updated"); loadTeam(); reload(); } catch (err: any) { toast.error(friendlyError(err)); } }}><option value="admin">Admin</option><option value="agent">Sourcing Agent</option><option value="viewer">Viewer</option></Sel>
      <Button size="sm" variant="outline" onClick={async () => { try { await changeMember({ data: { user_id: p.id, active: !p.active, role: (roleOf(p.id) === "super_admin" ? "admin" : roleOf(p.id)) as any } }); toast.success(p.active ? "User deactivated" : "User reactivated"); loadTeam(); } catch (err: any) { toast.error(friendlyError(err)); } }}>{p.active ? "Deactivate" : "Activate"}</Button></span>}</td>}</tr>)}
    </tbody></table></div>
    <div className="recent-section"><div className="section-title"><div><h2>Invitations</h2><p>Pending · Accepted · Expired (past 7 days &amp; still pending) · Revoked</p></div></div>
    <div className="table-wrap"><table className="data-table"><thead><tr><th>Email</th><th>Role</th><th>Status</th><th>Expires</th>{ws.role === "super_admin" && <th>Actions</th>}</tr></thead><tbody>
      {(team?.invitations ?? []).map((i: AnyRec) => { const expired = i.status === "pending" && new Date(i.expires_at) < new Date(); return <tr key={i.id}><td>{i.email}</td><td style={{ textTransform: "capitalize" }}>{i.role}</td><td><span className={`badge-status ${i.status === "pending" && !expired ? "pending" : ""}`}>{expired ? "Expired" : i.status}</span></td><td>{fmtDate(i.expires_at)}</td>
      {ws.role === "super_admin" && <td>{i.status === "pending" && <span style={{ display: "flex", gap: 6 }}><Button size="sm" variant="outline" disabled={busy} onClick={() => invite(i)}>Resend</Button><Button size="sm" variant="ghost" onClick={async () => { try { await revokeInvitation({ data: { id: i.id } }); toast.success("Invitation revoked"); loadTeam(); } catch (e: any) { toast.error(friendlyError(e)); } }}>Revoke</Button></span>}</td>}</tr>; })}
      {!(team?.invitations ?? []).length && <tr><td colSpan={5}>No invitations yet.</td></tr>}</tbody></table></div></div></>;
}

function Logs({ ws }: Ctx) {
  const [q, setQ] = useState("");
  const rows = (ws.logs as AnyRec[]).filter((l) => l.action.toLowerCase().includes(q.toLowerCase()));
  return <><Heading eyebrow="Audit" title="Activity Logs" sub="Logins, suppliers, products, uploads, visits, GPS check-ins, invitations and permission changes. Ordinary users cannot modify this history." />
  <div className="toolbar"><div className="search-field"><Search /><input className="field-input" placeholder="Filter actions…" value={q} onChange={(e) => setQ(e.target.value)} /></div></div>
  <div className="table-wrap"><table className="data-table"><thead><tr><th>Action</th><th>User</th><th>Entity</th><th>Date &amp; Time</th></tr></thead><tbody>
  {rows.map((l) => <tr key={l.id}><td><b>{l.action}</b></td><td><small>{l.user_id ? String(l.user_id).slice(0, 8) : "system"}</small></td><td><small>{l.entity_id ? String(l.entity_id).slice(0, 8) : "—"}</small></td><td>{fmtDate(l.created_at)}</td></tr>)}
  {!rows.length && <tr><td colSpan={4}>No activity recorded yet.</td></tr>}</tbody></table></div></>;
}

function SettingsView({ ws, reload }: Ctx) {
  const [name, setName] = useState(ws.settings?.company_name ?? "TASMEEM"); const [notif, setNotif] = useState(ws.settings?.notifications ?? true); const [busy, setBusy] = useState(false);
  const save = async () => { setBusy(true); try { await saveSettings({ data: { company_name: name, notifications: notif } }); toast.success("Settings saved"); reload(); } catch (e: any) { toast.error(friendlyError(e)); } finally { setBusy(false); } };
  const row = (t: string, d: string, c: any) => <div className="settings-row"><div><h3>{t}</h3><p>{d}</p></div>{c}</div>;
  return <><Heading eyebrow="System" title="Settings" sub="Brand, currency, GPS policy and data controls." />
  <div className="settings-layout">
    {row("Company Name", "Shown across TASMEEM SOURCE and branded PDF reports.", <input className="field-input" style={{ width: 220 }} value={name} onChange={(e) => setName(e.target.value)} disabled={ws.role !== "super_admin"} />)}
    {row("Brand", "Navy + gold palette extracted from the official TASMEEM logo. Logo is used unmodified in the sidebar, login and header.", <img src={LOGO_URL} alt="TASMEEM" style={{ width: 52, height: 52, objectFit: "contain" }} onError={(e) => { (e.target as HTMLImageElement).src = "/favicon.png"; }} />)}
    {row("Default Currency", "All wholesale prices are recorded per unit in BDT.", <b>BDT (৳)</b>)}
    {row("GPS Requirements", "GPS is mandatory for supplier creation and product submission; check-ins are explicit and transparent. No background tracking.", <span className="badge-status">Enforced by database</span>)}
    {row("Email Notifications", "Invitations use the auth provider's secure email flow. Visit/supplier/product alerts require a verified sending domain + email provider keys in Lovable Cloud secrets — configure those there; until then invitation & reset emails are the live channel.", <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 12 }}><Toggle checked={notif} onCheckedChange={setNotif} disabled={ws.role !== "super_admin"} /> Enabled</label>)}
    {row("Product Categories", (ws.categories as AnyRec[]).map((c) => c.name).join(" · ") + " — custom categories can be added from the product form (admin).", <span />)}
    {row("Data Export", "Full sourcing data export in CSV / Excel.", <span style={{ display: "flex", gap: 6 }}><Button size="sm" variant="outline" onClick={() => download("tasmeem-all-suppliers.csv", toCsv((ws.suppliers as AnyRec[]).map((s) => ({ name: s.name, mobile: s.mobile, market: s.market, address: s.address }))))}>Suppliers CSV</Button><Button size="sm" variant="outline" onClick={() => download("tasmeem-all-products.csv", toCsv((ws.products as AnyRec[]).map((p) => ({ name: p.name, supplier: p.suppliers?.name, price_100: tierOf(p, 100)?.unit_price ?? "Not Available" }))))}>Products CSV</Button></span>)}
    {row("System Information", `Role: ${String(ws.role).replace("_", " ")} · Backend: Lovable Cloud (Supabase) with Row Level Security · Storage: private bucket with signed URLs · PWA: installable, offline drafts on-device.`, <span />)}
    {ws.role === "super_admin" && <div className="form-actions"><Button disabled={busy} onClick={save}>{busy ? "Saving…" : "Save Settings"}</Button></div>}
  </div></>;
}
