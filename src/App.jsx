import { useState, useEffect, useCallback, createContext, useContext } from "react";

// ─── GLOBAL STYLES ────────────────────────────────────────────────────────────
const GlobalStyles = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;1,9..40,300&display=swap');
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    :root {
      --bg: #0e0f13; --surface: #16181f; --surface2: #1e2028;
      --border: #2a2d38; --accent: #e8ff47; --accent2: #7c6af7;
      --danger: #ff4f4f; --success: #3dffa0; --warning: #ffb547;
      --text: #f0f1f5; --muted: #7a7f96;
      --font-display: 'Syne', sans-serif; --font-body: 'DM Sans', sans-serif;
      --radius: 12px; --radius-sm: 8px; --shadow: 0 4px 24px rgba(0,0,0,0.4);
    }
    html, body, #root {
      height: 100%; background: var(--bg); color: var(--text);
      font-family: var(--font-body); font-size: 15px; line-height: 1.6;
      -webkit-font-smoothing: antialiased;
    }
    ::-webkit-scrollbar { width: 4px; }
    ::-webkit-scrollbar-track { background: var(--bg); }
    ::-webkit-scrollbar-thumb { background: var(--border); border-radius: 4px; }
    button { cursor: pointer; font-family: var(--font-body); }
    input, textarea, select { font-family: var(--font-body); }
    select { appearance: none; }
    @keyframes fadeIn  { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:none; } }
    @keyframes spin    { to { transform:rotate(360deg); } }
    @keyframes float   { 0%,100% { transform:translateY(0); } 50% { transform:translateY(-8px); } }
    .fade-in { animation: fadeIn 0.3s ease forwards; }
    .spinner {
      width:20px; height:20px; border:2px solid var(--border);
      border-top-color:var(--accent); border-radius:50%;
      animation:spin 0.7s linear infinite; display:inline-block;
    }
    @media (min-width: 768px) {
      .sidebar-nav   { transform: translateX(0) !important; }
      .sidebar-overlay { display: none !important; }
      .app-content   { margin-left: 220px !important; }
      .topbar-hamburger { display: none !important; }
    }
  `}</style>
);

// ─── API ──────────────────────────────────────────────────────────────────────
const BASE_URL = "https://merchant.tornac.cloud";

const api = {
  token: null,

  async request(path, options = {}) {
    const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
    if (this.token) headers["Authorization"] = `Bearer ${this.token}`;
    let res;
    try {
      res = await fetch(`${BASE_URL}${path}`, { ...options, headers });
    } catch (err) {
      console.error("[API] network error:", err);
      throw { status: 0, data: { detail: "Sem conexão com o servidor." } };
    }
    console.log(`[API] ${options.method || "GET"} ${path} => ${res.status}`);
    if (res.status === 204) return null;
    const data = await res.json().catch(() => ({}));
    if (!res.ok) { console.error("[API] error body:", data); throw { status: res.status, data }; }
    return data;
  },

  async login(email, password) {
    const data = await this.request("/auth/token/", { method: "POST", body: JSON.stringify({ email, password }) });
    this.token = data.access;
    localStorage.setItem("access", data.access);
    localStorage.setItem("refresh", data.refresh);
    return data;
  },

  async refreshToken() {
    const refresh = localStorage.getItem("refresh");
    if (!refresh) throw new Error("no refresh token");
    const data = await this.request("/auth/token/refresh/", { method: "POST", body: JSON.stringify({ refresh }) });
    this.token = data.access;
    localStorage.setItem("access", data.access);
    return data;
  },

  logout() {
    this.token = null;
    localStorage.removeItem("access");
    localStorage.removeItem("refresh");
  },

  get:    (path)       => api.request(path),
  post:   (path, body) => api.request(path, { method: "POST",   body: JSON.stringify(body) }),
  put:    (path, body) => api.request(path, { method: "PUT",    body: JSON.stringify(body) }),
  patch:  (path, body) => api.request(path, { method: "PATCH",  body: JSON.stringify(body) }),
  delete: (path)       => api.request(path, { method: "DELETE" }),
};

// ─── CONTEXT ──────────────────────────────────────────────────────────────────
const AuthContext = createContext(null);
const useAuth = () => useContext(AuthContext);

// ─── UI PRIMITIVES ────────────────────────────────────────────────────────────
const Btn = ({ children, variant = "primary", size = "md", onClick, disabled, type = "button", style }) => {
  const V = {
    primary:   { background: "var(--accent)",   color: "#0e0f13",     border: "none" },
    secondary: { background: "var(--surface2)", color: "var(--text)", border: "1px solid var(--border)" },
    danger:    { background: "transparent",     color: "var(--danger)", border: "1px solid var(--danger)" },
    ghost:     { background: "transparent",     color: "var(--muted)", border: "1px solid var(--border)" },
  };
  const S = {
    sm: { padding: "6px 14px",  fontSize: "13px", borderRadius: "var(--radius-sm)" },
    md: { padding: "10px 20px", fontSize: "14px", borderRadius: "var(--radius-sm)" },
    lg: { padding: "13px 28px", fontSize: "15px", borderRadius: "var(--radius)" },
  };
  return (
    <button type={type} onClick={onClick} disabled={disabled} style={{
      ...V[variant], ...S[size], fontFamily: "var(--font-body)", fontWeight: 500,
      cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.5 : 1,
      transition: "all 0.15s", display: "inline-flex", alignItems: "center",
      justifyContent: "center", gap: 6, ...style,
    }}>{children}</button>
  );
};

const Input = ({ label, error, ...props }) => (
  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
    {label && <label style={{ fontSize: 12, color: "var(--muted)", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase" }}>{label}</label>}
    <input {...props} style={{
      background: "var(--surface2)", border: `1px solid ${error ? "var(--danger)" : "var(--border)"}`,
      borderRadius: "var(--radius-sm)", padding: "10px 14px",
      color: "var(--text)", fontSize: 14, outline: "none", width: "100%",
      transition: "border-color 0.15s", ...props.style,
    }}
      onFocus={e => (e.target.style.borderColor = "var(--accent)")}
      onBlur={e  => (e.target.style.borderColor = error ? "var(--danger)" : "var(--border)")}
    />
    {error && <span style={{ fontSize: 12, color: "var(--danger)" }}>{error}</span>}
  </div>
);

const SelectField = ({ label, children, value, onChange }) => (
  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
    {label && <label style={{ fontSize: 12, color: "var(--muted)", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase" }}>{label}</label>}
    <div style={{ position: "relative" }}>
      <select value={value} onChange={onChange} style={{
        background: "var(--surface2)", border: "1px solid var(--border)",
        borderRadius: "var(--radius-sm)", padding: "10px 36px 10px 14px",
        color: "var(--text)", fontSize: 14, width: "100%", cursor: "pointer",
      }}>{children}</select>
      <span style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", color: "var(--muted)", fontSize: 11 }}>▾</span>
    </div>
  </div>
);

const Badge = ({ status }) => {
  const map = {
    pending:        { bg: "#2a2318", color: "var(--warning)",  label: "Pendente"   },
    on_route:       { bg: "#1a2535", color: "#60a5fa",         label: "A caminho"  },
    delivered:      { bg: "#162a20", color: "var(--success)",  label: "Entregue"   },
    issue:          { bg: "#2a1818", color: "var(--danger)",   label: "Problema"   },
    in_preparation: { bg: "#21172a", color: "var(--accent2)",  label: "Preparando" },
    returned:       { bg: "#2a2020", color: "#f97316",         label: "Devolvido"  },
    scheduled:      { bg: "#1a2030", color: "#94a3b8",         label: "Agendado"   },
  };
  const s = map[status] || { bg: "var(--surface2)", color: "var(--muted)", label: status };
  return (
    <span style={{
      background: s.bg, color: s.color, padding: "3px 10px", borderRadius: 999,
      fontSize: 12, fontWeight: 600, letterSpacing: "0.04em",
      border: `1px solid ${s.color}33`, whiteSpace: "nowrap",
    }}>{s.label}</span>
  );
};

const Card = ({ children, style }) => (
  <div className="fade-in" style={{
    background: "var(--surface)", border: "1px solid var(--border)",
    borderRadius: "var(--radius)", padding: 20, ...style,
  }}>{children}</div>
);

const Modal = ({ title, children, onClose }) => (
  <div style={{
    position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)",
    display: "flex", alignItems: "center", justifyContent: "center",
    zIndex: 1000, padding: 16, backdropFilter: "blur(6px)",
  }} onClick={e => e.target === e.currentTarget && onClose()}>
    <div className="fade-in" style={{
      background: "var(--surface)", border: "1px solid var(--border)",
      borderRadius: "var(--radius)", width: "100%", maxWidth: 480,
      maxHeight: "90vh", overflow: "auto", padding: 24,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h3 style={{ fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 700 }}>{title}</h3>
        <button onClick={onClose} style={{ background: "none", border: "none", color: "var(--muted)", fontSize: 22, lineHeight: 1, cursor: "pointer" }}>×</button>
      </div>
      {children}
    </div>
  </div>
);

const Toast = ({ msg, type, onDone }) => {
  useEffect(() => { const t = setTimeout(onDone, 3500); return () => clearTimeout(t); }, [onDone]);
  const c = { success: "var(--success)", error: "var(--danger)", info: "var(--accent2)", warning: "var(--warning)" };
  return (
    <div className="fade-in" style={{
      position: "fixed", bottom: 24, right: 24, zIndex: 2000,
      background: "var(--surface2)", border: `1px solid ${c[type] || "var(--border)"}`,
      borderLeft: `4px solid ${c[type] || "var(--accent)"}`,
      borderRadius: "var(--radius-sm)", padding: "12px 18px",
      fontSize: 14, maxWidth: 340, boxShadow: "var(--shadow)",
    }}>{msg}</div>
  );
};

const Empty = ({ icon, text }) => (
  <div style={{ textAlign: "center", padding: "48px 24px", color: "var(--muted)" }}>
    <div style={{ fontSize: 40, marginBottom: 12 }}>{icon}</div>
    <div style={{ fontSize: 14 }}>{text}</div>
  </div>
);

// ─── HOME PAGE ────────────────────────────────────────────────────────────────
const HomePage = ({ onEnter }) => {
  const features = [
    { icon: "📦", title: "Pedidos em tempo real",  desc: "Acompanhe cada etapa — da preparação à entrega — com status atualizados na hora." },
    { icon: "👥", title: "Gestão de clientes",     desc: "Cadastre e organize clientes com histórico completo, acessível do celular ou desktop." },
    { icon: "🏷️", title: "Controle de produtos",   desc: "Gerencie SKUs, preços e quantidades sem planilhas complicadas." },
    { icon: "🏢", title: "Multi-usuário",           desc: "Convide sua equipe, defina papéis e trabalhem em sincronia no mesmo espaço." },
  ];
  const steps = [
    { n: "01", title: "Crie sua empresa",    desc: "Cadastre-se e configure seu espaço em menos de 2 minutos." },
    { n: "02", title: "Adicione sua equipe", desc: "Convide colaboradores e comece a operar juntos." },
    { n: "03", title: "Gerencie tudo",       desc: "Pedidos, clientes e produtos em um único painel." },
  ];
  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", overflowX: "hidden" }}>
      {/* Nav */}
      <header style={{
        position: "sticky", top: 0, zIndex: 50,
        background: "rgba(14,15,19,0.88)", backdropFilter: "blur(14px)",
        borderBottom: "1px solid var(--border)",
        padding: "0 24px", display: "flex", alignItems: "center",
        justifyContent: "space-between", height: 60,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 32, height: 32, background: "var(--accent)", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>⚡</div>
          <span style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 17, letterSpacing: "-0.02em" }}>Orderly</span>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <Btn variant="ghost" size="sm" onClick={() => onEnter("login")}>Entrar</Btn>
          <Btn size="sm" onClick={() => onEnter("signup")}>Começar grátis</Btn>
        </div>
      </header>

      {/* Hero */}
      <section style={{ minHeight: "88vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "80px 24px", textAlign: "center", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", width: 600, height: 600, borderRadius: "50%", background: "radial-gradient(circle, rgba(124,106,247,0.12) 0%, transparent 70%)", top: "5%", left: "50%", transform: "translateX(-50%)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", width: 280, height: 280, borderRadius: "50%", background: "radial-gradient(circle, rgba(232,255,71,0.07) 0%, transparent 70%)", bottom: "10%", right: "8%", pointerEvents: "none", animation: "float 6s ease-in-out infinite" }} />
        <div style={{ maxWidth: 680, position: "relative" }} className="fade-in">
          <div style={{ display: "inline-block", background: "rgba(232,255,71,0.1)", border: "1px solid rgba(232,255,71,0.25)", borderRadius: 999, padding: "5px 16px", fontSize: 12, fontWeight: 600, color: "var(--accent)", letterSpacing: "0.08em", marginBottom: 28 }}>
            GESTÃO DE PEDIDOS SIMPLIFICADA
          </div>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(36px, 7vw, 68px)", fontWeight: 800, lineHeight: 1.08, letterSpacing: "-0.03em", marginBottom: 24 }}>
            Tudo que seu negócio<br />
            <span style={{ background: "linear-gradient(90deg, var(--accent), var(--accent2))", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>precisa, em um lugar.</span>
          </h1>
          <p style={{ fontSize: "clamp(15px, 2vw, 18px)", color: "var(--muted)", maxWidth: 520, margin: "0 auto 40px", lineHeight: 1.7 }}>
            Orderly conecta sua equipe, seus clientes e seus pedidos — do celular ao computador, sem complicação.
          </p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <Btn size="lg" onClick={() => onEnter("signup")} style={{ minWidth: 180 }}>Criar conta grátis →</Btn>
            <Btn variant="secondary" size="lg" onClick={() => onEnter("login")} style={{ minWidth: 130 }}>Fazer login</Btn>
          </div>
          <div style={{ marginTop: 56, display: "flex", justifyContent: "center", gap: 40, flexWrap: "wrap" }}>
            {[["500+","Empresas"],["12k+","Pedidos/mês"],["99.9%","Uptime"]].map(([v,l]) => (
              <div key={l} style={{ textAlign: "center" }}>
                <p style={{ fontFamily: "var(--font-display)", fontSize: 26, fontWeight: 800, color: "var(--accent)" }}>{v}</p>
                <p style={{ fontSize: 12, color: "var(--muted)", letterSpacing: "0.06em" }}>{l.toUpperCase()}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section style={{ padding: "80px 24px", maxWidth: 1000, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 52 }}>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(24px, 4vw, 38px)", fontWeight: 800, letterSpacing: "-0.02em", marginBottom: 10 }}>Tudo que você precisa</h2>
          <p style={{ color: "var(--muted)", fontSize: 15 }}>Funcionalidades pensadas para quem trabalha de verdade.</p>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: 16 }}>
          {features.map((f, i) => (
            <div key={i} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: 24, transition: "border-color 0.2s, transform 0.2s", cursor: "default" }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(232,255,71,0.3)"; e.currentTarget.style.transform = "translateY(-3px)"; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.transform = "none"; }}
            >
              <div style={{ fontSize: 28, marginBottom: 14 }}>{f.icon}</div>
              <h3 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 16, marginBottom: 8 }}>{f.title}</h3>
              <p style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.65 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section style={{ padding: "80px 24px", background: "linear-gradient(180deg,transparent,rgba(124,106,247,0.05),transparent)", borderTop: "1px solid var(--border)", borderBottom: "1px solid var(--border)" }}>
        <div style={{ maxWidth: 700, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 52 }}>
            <h2 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(24px, 4vw, 38px)", fontWeight: 800, letterSpacing: "-0.02em", marginBottom: 10 }}>Como funciona</h2>
            <p style={{ color: "var(--muted)", fontSize: 15 }}>Três passos para começar a operar.</p>
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            {steps.map((s, i) => (
              <div key={i} style={{ display: "flex", gap: 22, alignItems: "flex-start", position: "relative", paddingBottom: i < steps.length - 1 ? 40 : 0 }}>
                {i < steps.length - 1 && <div style={{ position: "absolute", left: 21, top: 48, bottom: 0, width: 1, background: "linear-gradient(to bottom, var(--accent2), transparent)" }} />}
                <div style={{ minWidth: 42, height: 42, borderRadius: "50%", background: "var(--surface2)", border: "2px solid var(--accent2)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 11, color: "var(--accent2)", letterSpacing: "0.04em", flexShrink: 0 }}>{s.n}</div>
                <div style={{ paddingTop: 8 }}>
                  <h3 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 16, marginBottom: 5 }}>{s.title}</h3>
                  <p style={{ fontSize: 14, color: "var(--muted)", lineHeight: 1.6 }}>{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ padding: "96px 24px", textAlign: "center" }}>
        <div className="fade-in" style={{ maxWidth: 520, margin: "0 auto" }}>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(26px, 5vw, 46px)", fontWeight: 800, letterSpacing: "-0.03em", marginBottom: 14 }}>Pronto para começar?</h2>
          <p style={{ color: "var(--muted)", fontSize: 16, marginBottom: 36 }}>Crie sua conta em segundos e comece a gerenciar seus pedidos hoje mesmo.</p>
          <Btn size="lg" onClick={() => onEnter("signup")} style={{ minWidth: 200 }}>Criar conta grátis →</Btn>
        </div>
      </section>

      <footer style={{ borderTop: "1px solid var(--border)", padding: "20px 24px", textAlign: "center" }}>
        <p style={{ fontSize: 13, color: "var(--muted)" }}>© {new Date().getFullYear()} Orderly — Gestão de pedidos</p>
      </footer>
    </div>
  );
};

// ─── AUTH PAGE ────────────────────────────────────────────────────────────────
const AuthPage = ({ initialMode = "login", onSuccess, onBack }) => {
  const [mode, setMode]         = useState(initialMode);
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");

  const handle = async () => {
    if (!email.trim() || !password.trim()) { setError("Preencha e-mail e senha."); return; }
    setLoading(true); setError("");
    try {
      if (mode === "signup") {
        await api.post("/v1/accounts/signup/", { email: email.trim(), password });
      }
      await api.login(email.trim(), password);
      const me = await api.get("/v1/accounts/me/");
      onSuccess(me);
    } catch (e) {
      console.error("[Auth] error:", e);
      const msg =
        e?.data?.detail ||
        e?.data?.email?.[0] ||
        e?.data?.password?.[0] ||
        e?.data?.non_field_errors?.[0] ||
        (e?.status === 0 ? "Sem conexão com o servidor." : "Credenciais inválidas.");
      setError(msg);
    } finally { setLoading(false); }
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 16, background: "var(--bg)", backgroundImage: "radial-gradient(ellipse 60% 50% at 50% -10%, rgba(124,106,247,0.18), transparent)" }}>
      <div style={{ width: "100%", maxWidth: 400 }} className="fade-in">
        <button onClick={onBack} style={{ background: "none", border: "none", color: "var(--muted)", fontSize: 13, cursor: "pointer", marginBottom: 24, display: "flex", alignItems: "center", gap: 6 }}>← Voltar ao início</button>
        <div style={{ textAlign: "center", marginBottom: 34 }}>
          <div style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 54, height: 54, background: "var(--accent)", borderRadius: 14, marginBottom: 14 }}>
            <span style={{ fontSize: 24 }}>⚡</span>
          </div>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: 25, fontWeight: 800, letterSpacing: "-0.02em" }}>Orderly</h1>
          <p style={{ color: "var(--muted)", fontSize: 14, marginTop: 4 }}>{mode === "login" ? "Entre na sua conta" : "Crie sua conta grátis"}</p>
        </div>

        <Card style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <Input label="E-mail" type="email" placeholder="voce@empresa.com" value={email}
            onChange={e => setEmail(e.target.value)} onKeyDown={e => e.key === "Enter" && handle()} autoComplete="email" />
          <Input label="Senha" type="password" placeholder="••••••••" value={password}
            onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === "Enter" && handle()}
            autoComplete={mode === "login" ? "current-password" : "new-password"} />
          {error && (
            <div style={{ fontSize: 13, color: "var(--danger)", background: "rgba(255,79,79,0.08)", border: "1px solid rgba(255,79,79,0.2)", padding: "10px 14px", borderRadius: "var(--radius-sm)", lineHeight: 1.5 }}>{error}</div>
          )}
          <Btn size="lg" disabled={loading} onClick={handle} style={{ width: "100%", marginTop: 4 }}>
            {loading ? <span className="spinner" /> : (mode === "login" ? "Entrar" : "Criar conta")}
          </Btn>
          <p style={{ textAlign: "center", fontSize: 13, color: "var(--muted)" }}>
            {mode === "login" ? "Não tem conta?" : "Já tem conta?"}{" "}
            <span onClick={() => { setMode(mode === "login" ? "signup" : "login"); setError(""); }}
              style={{ color: "var(--accent)", cursor: "pointer", fontWeight: 500 }}>
              {mode === "login" ? "Cadastre-se" : "Entrar"}
            </span>
          </p>
        </Card>
      </div>
    </div>
  );
};

// ─── SIDEBAR ──────────────────────────────────────────────────────────────────
const navItems = [
  { id: "dashboard", icon: "◈",  label: "Dashboard" },
  { id: "orders",    icon: "📦", label: "Pedidos"   },
  { id: "clients",   icon: "👥", label: "Clientes"  },
  { id: "products",  icon: "🏷️", label: "Produtos"  },
  { id: "workplace", icon: "🏢", label: "Empresa"   },
];

const Sidebar = ({ page, setPage, user, onLogout, mobileOpen, setMobileOpen }) => (
  <>
    <div className="sidebar-overlay" onClick={() => setMobileOpen(false)} style={{ display: mobileOpen ? "block" : "none", position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 90 }} />
    <nav className="sidebar-nav" style={{ position: "fixed", left: 0, top: 0, bottom: 0, width: 220, background: "var(--surface)", borderRight: "1px solid var(--border)", display: "flex", flexDirection: "column", zIndex: 100, transform: mobileOpen ? "translateX(0)" : "translateX(-100%)", transition: "transform 0.25s ease" }}>
      <div style={{ padding: "18px 18px 14px", borderBottom: "1px solid var(--border)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 32, height: 32, background: "var(--accent)", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15 }}>⚡</div>
          <span style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 17, letterSpacing: "-0.02em" }}>Orderly</span>
        </div>
      </div>
      <div style={{ flex: 1, padding: "12px 10px", overflowY: "auto" }}>
        {navItems.map(item => {
          const active = page === item.id;
          return (
            <button key={item.id} onClick={() => { setPage(item.id); setMobileOpen(false); }} style={{ width: "100%", display: "flex", alignItems: "center", gap: 11, padding: "10px 12px", borderRadius: "var(--radius-sm)", background: active ? "rgba(232,255,71,0.08)" : "transparent", border: active ? "1px solid rgba(232,255,71,0.18)" : "1px solid transparent", color: active ? "var(--accent)" : "var(--muted)", fontSize: 14, fontWeight: active ? 600 : 400, marginBottom: 2, cursor: "pointer", textAlign: "left", transition: "all 0.15s" }}>
              <span style={{ fontSize: 16, width: 20, textAlign: "center" }}>{item.icon}</span>{item.label}
            </button>
          );
        })}
      </div>
      <div style={{ padding: "12px 10px", borderTop: "1px solid var(--border)" }}>
        <div style={{ padding: "8px 12px 10px" }}>
          <p style={{ fontSize: 11, color: "var(--muted)", marginBottom: 2, letterSpacing: "0.06em" }}>LOGADO COMO</p>
          <p style={{ fontSize: 13, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user?.email || "—"}</p>
        </div>
        <button onClick={onLogout} style={{ width: "100%", padding: "9px 12px", borderRadius: "var(--radius-sm)", background: "transparent", border: "1px solid var(--border)", color: "var(--danger)", fontSize: 13, cursor: "pointer", textAlign: "left", transition: "all 0.15s" }}>⬡ Sair</button>
      </div>
    </nav>
  </>
);

// ─── DASHBOARD ────────────────────────────────────────────────────────────────
const Dashboard = ({ setPage }) => {
  const [stats, setStats]               = useState({ orders: 0, clients: 0, products: 0, active: 0 });
  const [recentOrders, setRecentOrders] = useState([]);
  const [loading, setLoading]           = useState(true);

  useEffect(() => {
    Promise.all([api.get("/v1/orders/"), api.get("/v1/clients/"), api.get("/v1/products/"), api.get("/v1/orders/active/")])
      .then(([o, c, p, a]) => {
        setStats({ orders: o?.length || 0, clients: c?.length || 0, products: p?.length || 0, active: a?.length || 0 });
        setRecentOrders((o || []).slice(0, 5));
      }).catch(console.error).finally(() => setLoading(false));
  }, []);

  const cards = [
    { label: "Total Pedidos", value: stats.orders,   icon: "📦", color: "var(--accent2)" },
    { label: "Ativos",        value: stats.active,   icon: "🔄", color: "var(--accent)"  },
    { label: "Clientes",      value: stats.clients,  icon: "👥", color: "#60a5fa"        },
    { label: "Produtos",      value: stats.products, icon: "🏷️", color: "var(--success)" },
  ];

  return (
    <div className="fade-in">
      <h2 style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 800, marginBottom: 20, letterSpacing: "-0.02em" }}>Dashboard</h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12, marginBottom: 22 }}>
        {cards.map(s => (
          <Card key={s.label} style={{ padding: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <p style={{ fontSize: 11, color: "var(--muted)", marginBottom: 8, fontWeight: 600, letterSpacing: "0.05em" }}>{s.label.toUpperCase()}</p>
                <p style={{ fontFamily: "var(--font-display)", fontSize: 30, fontWeight: 800, color: s.color, lineHeight: 1 }}>{loading ? "—" : s.value}</p>
              </div>
              <span style={{ fontSize: 20 }}>{s.icon}</span>
            </div>
          </Card>
        ))}
      </div>
      <Card>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <h3 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 15 }}>Pedidos Recentes</h3>
          <Btn variant="ghost" size="sm" onClick={() => setPage("orders")}>Ver todos →</Btn>
        </div>
        {loading ? <div style={{ textAlign: "center", padding: 32 }}><span className="spinner" /></div>
          : recentOrders.length === 0 ? <Empty icon="📭" text="Nenhum pedido ainda." />
          : <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {recentOrders.map(o => (
              <div key={o.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 12px", background: "var(--surface2)", borderRadius: "var(--radius-sm)", gap: 12, flexWrap: "wrap" }}>
                <div style={{ flex: 1, minWidth: 100 }}>
                  <p style={{ fontWeight: 500, fontSize: 14 }}>{o.client_data?.name || "—"}</p>
                  <p style={{ fontSize: 12, color: "var(--muted)" }}>{new Date(o.created).toLocaleDateString("pt-BR")}</p>
                </div>
                <Badge status={o.status} />
              </div>
            ))}
          </div>}
      </Card>
    </div>
  );
};

// ─── ORDERS ───────────────────────────────────────────────────────────────────
const STATUS_OPTIONS = ["pending","on_route","delivered","issue","in_preparation","returned","scheduled"];

const OrdersPage = () => {
  const { toast } = useAuth();
  const [orders, setOrders]   = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal]     = useState(null);
  const [form, setForm]       = useState({ client: "", due_date: "", status: "pending" });
  const [saving, setSaving]   = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try { const [o, c] = await Promise.all([api.get("/v1/orders/"), api.get("/v1/clients/")]); setOrders(o || []); setClients(c || []); }
    catch (e) { console.error(e); } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const save = async () => {
    if (!form.client || !form.due_date) { toast("Selecione cliente e data de entrega.", "error"); return; }
    setSaving(true);
    try {
      const body = { ...form, due_date: new Date(form.due_date).toISOString() };
      modal === "create" ? await api.post("/v1/orders/", body) : await api.put(`/v1/orders/${modal.id}/`, body);
      toast(modal === "create" ? "Pedido criado!" : "Pedido atualizado!", "success");
      setModal(null); load();
    } catch (e) { console.error(e); toast("Erro ao salvar pedido.", "error"); } finally { setSaving(false); }
  };

  const del = async (id) => {
    if (!confirm("Excluir este pedido?")) return;
    try { await api.delete(`/v1/orders/${id}/`); toast("Excluído.", "info"); load(); }
    catch { toast("Erro ao excluir.", "error"); }
  };

  return (
    <div className="fade-in">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 10 }}>
        <h2 style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 800, letterSpacing: "-0.02em" }}>Pedidos</h2>
        <Btn onClick={() => { setForm({ client: "", due_date: "", status: "pending" }); setModal("create"); }}>+ Novo Pedido</Btn>
      </div>
      <Card style={{ padding: 0, overflow: "hidden" }}>
        {loading ? <div style={{ textAlign: "center", padding: 48 }}><span className="spinner" /></div>
          : orders.length === 0 ? <Empty icon="📦" text="Nenhum pedido encontrado." />
          : <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead><tr style={{ borderBottom: "1px solid var(--border)" }}>
                {["Cliente","Criado em","Entrega","Status",""].map(h => <th key={h} style={{ padding: "12px 16px", textAlign: "left", fontSize: 11, fontWeight: 600, color: "var(--muted)", letterSpacing: "0.06em", whiteSpace: "nowrap" }}>{h.toUpperCase()}</th>)}
              </tr></thead>
              <tbody>
                {orders.map((o, i) => (
                  <tr key={o.id} style={{ borderBottom: i < orders.length-1 ? "1px solid var(--border)" : "none", transition: "background 0.1s" }}
                    onMouseEnter={e => e.currentTarget.style.background = "var(--surface2)"}
                    onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                    <td style={{ padding: "13px 16px" }}>
                      <p style={{ fontWeight: 500, fontSize: 14 }}>{o.client_data?.name}</p>
                      <p style={{ fontSize: 12, color: "var(--muted)" }}>{o.client_data?.phone}</p>
                    </td>
                    <td style={{ padding: "13px 16px", fontSize: 13, color: "var(--muted)", whiteSpace: "nowrap" }}>{new Date(o.created).toLocaleDateString("pt-BR")}</td>
                    <td style={{ padding: "13px 16px", fontSize: 13, whiteSpace: "nowrap" }}>{new Date(o.due_date).toLocaleDateString("pt-BR")}</td>
                    <td style={{ padding: "13px 16px" }}><Badge status={o.status} /></td>
                    <td style={{ padding: "13px 16px" }}>
                      <div style={{ display: "flex", gap: 6 }}>
                        <Btn variant="ghost" size="sm" onClick={() => { setForm({ client: o.client, due_date: o.due_date?.slice(0,16), status: o.status }); setModal(o); }}>Editar</Btn>
                        <Btn variant="danger" size="sm" onClick={() => del(o.id)}>×</Btn>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>}
      </Card>
      {modal && (
        <Modal title={modal === "create" ? "Novo Pedido" : "Editar Pedido"} onClose={() => setModal(null)}>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <SelectField label="Cliente" value={form.client} onChange={e => setForm(f => ({ ...f, client: e.target.value }))}>
              <option value="">Selecionar cliente...</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </SelectField>
            <Input label="Data de Entrega" type="datetime-local" value={form.due_date} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))} />
            <SelectField label="Status" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
              {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
            </SelectField>
            <div style={{ display: "flex", gap: 10, marginTop: 6 }}>
              <Btn variant="secondary" onClick={() => setModal(null)} style={{ flex: 1 }}>Cancelar</Btn>
              <Btn onClick={save} disabled={saving} style={{ flex: 1 }}>{saving ? <span className="spinner" /> : "Salvar"}</Btn>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

// ─── CLIENTS ──────────────────────────────────────────────────────────────────
const ClientsPage = () => {
  const { toast } = useAuth();
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal]     = useState(null);
  const [form, setForm]       = useState({ name: "", phone: "", observations: "", is_active: true });
  const [saving, setSaving]   = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try { setClients(await api.get("/v1/clients/") || []); }
    catch (e) { console.error(e); } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const save = async () => {
    if (!form.name.trim() || !form.phone.trim()) { toast("Nome e telefone são obrigatórios.", "error"); return; }
    setSaving(true);
    try {
      modal === "create" ? await api.post("/v1/clients/", form) : await api.put(`/v1/clients/${modal.id}/`, form);
      toast(modal === "create" ? "Cliente criado!" : "Cliente atualizado!", "success");
      setModal(null); load();
    } catch (e) { console.error(e); toast("Erro ao salvar.", "error"); } finally { setSaving(false); }
  };

  const del = async (id) => {
    if (!confirm("Excluir cliente?")) return;
    try { await api.delete(`/v1/clients/${id}/`); toast("Excluído.", "info"); load(); }
    catch { toast("Erro ao excluir.", "error"); }
  };

  const avatarColor = n => ["#7c6af7","#e8ff47","#3dffa0","#60a5fa","#f97316","#ffb547"][n.charCodeAt(0) % 6];

  return (
    <div className="fade-in">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 10 }}>
        <h2 style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 800, letterSpacing: "-0.02em" }}>Clientes</h2>
        <Btn onClick={() => { setForm({ name: "", phone: "", observations: "", is_active: true }); setModal("create"); }}>+ Novo Cliente</Btn>
      </div>
      {loading ? <div style={{ textAlign: "center", padding: 48 }}><span className="spinner" /></div>
        : clients.length === 0 ? <Empty icon="👥" text="Nenhum cliente cadastrado." />
        : <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(230px, 1fr))", gap: 14 }}>
          {clients.map(c => (
            <Card key={c.id} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ width: 40, height: 40, borderRadius: "50%", background: avatarColor(c.name), display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 16, color: "#0e0f13" }}>{c.name[0].toUpperCase()}</div>
                <span style={{ fontSize: 11, padding: "3px 9px", borderRadius: 999, fontWeight: 600, background: c.is_active ? "rgba(61,255,160,0.08)" : "rgba(255,79,79,0.08)", color: c.is_active ? "var(--success)" : "var(--danger)", border: `1px solid ${c.is_active ? "rgba(61,255,160,0.2)" : "rgba(255,79,79,0.2)"}` }}>{c.is_active ? "Ativo" : "Inativo"}</span>
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontWeight: 600, fontSize: 15, marginBottom: 3 }}>{c.name}</p>
                <p style={{ fontSize: 13, color: "var(--muted)" }}>📞 {c.phone}</p>
                {c.observations && <p style={{ fontSize: 12, color: "var(--muted)", marginTop: 5, lineHeight: 1.5 }}>{c.observations}</p>}
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <Btn variant="secondary" size="sm" onClick={() => { setForm({ name: c.name, phone: c.phone, observations: c.observations || "", is_active: c.is_active }); setModal(c); }} style={{ flex: 1 }}>Editar</Btn>
                <Btn variant="danger" size="sm" onClick={() => del(c.id)}>×</Btn>
              </div>
            </Card>
          ))}
        </div>}
      {modal && (
        <Modal title={modal === "create" ? "Novo Cliente" : "Editar Cliente"} onClose={() => setModal(null)}>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <Input label="Nome" placeholder="Nome do cliente" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            <Input label="Telefone" placeholder="(11) 99999-9999" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label style={{ fontSize: 12, color: "var(--muted)", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase" }}>Observações</label>
              <textarea value={form.observations} onChange={e => setForm(f => ({ ...f, observations: e.target.value }))} style={{ background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", padding: "10px 14px", color: "var(--text)", fontSize: 14, width: "100%", resize: "vertical", minHeight: 80 }} />
            </div>
            <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", fontSize: 14 }}>
              <input type="checkbox" checked={form.is_active} onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))} />
              Cliente ativo
            </label>
            <div style={{ display: "flex", gap: 10, marginTop: 6 }}>
              <Btn variant="secondary" onClick={() => setModal(null)} style={{ flex: 1 }}>Cancelar</Btn>
              <Btn onClick={save} disabled={saving} style={{ flex: 1 }}>{saving ? <span className="spinner" /> : "Salvar"}</Btn>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

// ─── PRODUCTS ─────────────────────────────────────────────────────────────────
const ProductsPage = () => {
  const { toast } = useAuth();
  const [products, setProducts] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [modal, setModal]       = useState(null);
  const [form, setForm]         = useState({ name: "", sku: "", price: "", quantity: 0, is_active: true });
  const [saving, setSaving]     = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try { setProducts(await api.get("/v1/products/") || []); }
    catch (e) { console.error(e); } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const save = async () => {
    if (!form.name.trim() || !form.sku.trim() || !form.price) { toast("Nome, SKU e preço são obrigatórios.", "error"); return; }
    setSaving(true);
    try {
      await api.post("/v1/products/", form);
      toast("Produto criado!", "success"); setModal(null); load();
    } catch (e) { console.error(e); toast("Erro ao salvar.", "error"); } finally { setSaving(false); }
  };

  return (
    <div className="fade-in">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 10 }}>
        <h2 style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 800, letterSpacing: "-0.02em" }}>Produtos</h2>
        <Btn onClick={() => { setForm({ name: "", sku: "", price: "", quantity: 0, is_active: true }); setModal("create"); }}>+ Novo Produto</Btn>
      </div>
      {loading ? <div style={{ textAlign: "center", padding: 48 }}><span className="spinner" /></div>
        : products.length === 0 ? <Empty icon="🏷️" text="Nenhum produto cadastrado." />
        : <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(190px, 1fr))", gap: 14 }}>
          {products.map(p => (
            <Card key={p.id} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 11, color: "var(--muted)", fontWeight: 600, letterSpacing: "0.08em" }}>SKU: {p.sku}</span>
                <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 999, fontWeight: 600, background: p.is_active ? "rgba(61,255,160,0.08)" : "rgba(255,79,79,0.08)", color: p.is_active ? "var(--success)" : "var(--danger)" }}>{p.is_active ? "Ativo" : "Inativo"}</span>
              </div>
              <p style={{ fontWeight: 600, fontSize: 15, flex: 1 }}>{p.name}</p>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 800, color: "var(--accent)" }}>R$ {parseFloat(p.price).toFixed(2)}</span>
                <span style={{ fontSize: 12, color: "var(--muted)" }}>Qtd: {p.quantity ?? 0}</span>
              </div>
              <Btn variant="ghost" size="sm" onClick={() => { setForm({ name: p.name, sku: p.sku, price: p.price, quantity: p.quantity ?? 0, is_active: p.is_active }); setModal(p); }} style={{ width: "100%" }}>Editar</Btn>
            </Card>
          ))}
        </div>}
      {modal && (
        <Modal title={modal === "create" ? "Novo Produto" : "Editar Produto"} onClose={() => setModal(null)}>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <Input label="Nome" placeholder="Nome do produto" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            <Input label="SKU" placeholder="SKU-001" value={form.sku} onChange={e => setForm(f => ({ ...f, sku: e.target.value }))} />
            <Input label="Preço (R$)" type="number" step="0.01" min="0" placeholder="0.00" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} />
            <Input label="Quantidade" type="number" min="0" value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: parseInt(e.target.value) || 0 }))} />
            <div style={{ display: "flex", gap: 10, marginTop: 6 }}>
              <Btn variant="secondary" onClick={() => setModal(null)} style={{ flex: 1 }}>Cancelar</Btn>
              <Btn onClick={save} disabled={saving} style={{ flex: 1 }}>{saving ? <span className="spinner" /> : "Salvar"}</Btn>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

// ─── WORKPLACE ────────────────────────────────────────────────────────────────
const WorkplacePage = () => {
  const { toast } = useAuth();
  const [wp, setWp]           = useState(null);
  const [loading, setLoading] = useState(true);
  const [joinId, setJoinId]   = useState("");

  useEffect(() => {
    api.get("/v1/workplace/current/")
      .then(d => { if (d) setWp(d); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const join = async () => {
    if (!joinId.trim()) return;
    try { await api.post("/v1/workplace/join/", { workplace_id: joinId.trim() }); toast("Entrou na empresa!", "success"); window.location.reload(); }
    catch { toast("ID inválido ou sem permissão.", "error"); }
  };

  const create = async () => {
    try { await api.post("/v1/workplace/", {}); toast("Empresa criada!", "success"); window.location.reload(); }
    catch { toast("Erro ao criar empresa.", "error"); }
  };

  return (
    <div className="fade-in">
      <h2 style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 800, marginBottom: 20, letterSpacing: "-0.02em" }}>Empresa</h2>
      {loading ? <div style={{ textAlign: "center", padding: 48 }}><span className="spinner" /></div>
        : wp ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <Card>
              <p style={{ fontSize: 11, color: "var(--muted)", marginBottom: 6, fontWeight: 600, letterSpacing: "0.06em" }}>ID DA EMPRESA</p>
              <p style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 13, wordBreak: "break-all" }}>{wp.id}</p>
            </Card>
            <Card>
              <p style={{ fontSize: 11, color: "var(--muted)", marginBottom: 14, fontWeight: 600, letterSpacing: "0.06em" }}>MEMBROS ({wp.members?.length || 0})</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {(wp.members || []).map(m => (
                  <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ width: 36, height: 36, borderRadius: "50%", background: "linear-gradient(135deg, var(--accent2), var(--accent))", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 14, color: "#0e0f13" }}>{m.email[0].toUpperCase()}</div>
                    <div>
                      <p style={{ fontSize: 14, fontWeight: 500 }}>{m.email}</p>
                      {wp.owner === m.id && <p style={{ fontSize: 11, color: "var(--accent)", fontWeight: 600 }}>Proprietário</p>}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <Card>
              <h3 style={{ fontFamily: "var(--font-display)", fontWeight: 700, marginBottom: 12 }}>Entrar em uma empresa</h3>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <input value={joinId} onChange={e => setJoinId(e.target.value)} placeholder="Cole o ID (UUID)..." style={{ flex: 1, minWidth: 180, background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", padding: "10px 14px", color: "var(--text)", fontSize: 14 }} />
                <Btn onClick={join}>Entrar</Btn>
              </div>
            </Card>
            <Card>
              <h3 style={{ fontFamily: "var(--font-display)", fontWeight: 700, marginBottom: 8 }}>Criar nova empresa</h3>
              <p style={{ fontSize: 13, color: "var(--muted)", marginBottom: 14 }}>Configure seu espaço e convide sua equipe.</p>
              <Btn onClick={create}>Criar empresa</Btn>
            </Card>
          </div>
        )}
    </div>
  );
};

// ─── APP ROOT ─────────────────────────────────────────────────────────────────
export default function App() {
  const [screen, setScreen] = useState(() => {
    const token = localStorage.getItem("access");
    if (token) { api.token = token; return "app"; }
    return "home";
  });
  const [user, setUser]           = useState(null);
  const [toast, setToast]         = useState(null);
  const [page, setPage]           = useState("dashboard");
  const [mobileNav, setMobileNav] = useState(false);

  const showToast = useCallback((msg, type = "info") => setToast({ msg, type }), []);

  // Validate saved token on mount
  useEffect(() => {
    if (screen === "app" && !user) {
      api.get("/v1/accounts/me/")
        .then(me => setUser(me))
        .catch(async () => {
          try {
            await api.refreshToken();
            const me = await api.get("/v1/accounts/me/");
            setUser(me);
          } catch {
            api.logout();
            setScreen("home");
          }
        });
    }
  }, [screen]);

  const handleAuthSuccess = useCallback((me) => {
    setUser(me);
    setScreen("app");
  }, []);

  const logout = useCallback(() => {
    api.logout();
    setUser(null);
    setPage("dashboard");
    setScreen("home");
  }, []);

  const pages = {
    dashboard: <Dashboard setPage={setPage} />,
    orders:    <OrdersPage />,
    clients:   <ClientsPage />,
    products:  <ProductsPage />,
    workplace: <WorkplacePage />,
  };

  return (
    <AuthContext.Provider value={{ user, toast: showToast }}>
      <GlobalStyles />

      {screen === "home" && <HomePage onEnter={setScreen} />}

      {(screen === "login" || screen === "signup") && (
        <AuthPage initialMode={screen} onSuccess={handleAuthSuccess} onBack={() => setScreen("home")} />
      )}

      {screen === "app" && (
        <>
          <Sidebar page={page} setPage={setPage} user={user} onLogout={logout} mobileOpen={mobileNav} setMobileOpen={setMobileNav} />
          <div className="app-content" style={{ marginLeft: 0 }}>
            <div style={{ position: "sticky", top: 0, zIndex: 50, background: "rgba(14,15,19,0.92)", backdropFilter: "blur(12px)", borderBottom: "1px solid var(--border)", padding: "0 20px", height: 56, display: "flex", alignItems: "center", gap: 14 }}>
              <button className="topbar-hamburger" onClick={() => setMobileNav(true)} style={{ background: "none", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", color: "var(--text)", padding: "5px 10px", fontSize: 16, cursor: "pointer" }}>☰</button>
              <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 15 }}>{navItems.find(n => n.id === page)?.label}</span>
            </div>
            <main style={{ padding: "24px 20px", maxWidth: 960, margin: "0 auto" }}>
              {pages[page]}
            </main>
          </div>
        </>
      )}

      {toast && <Toast {...toast} onDone={() => setToast(null)} />}
    </AuthContext.Provider>
  );
}
