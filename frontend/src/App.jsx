import { useState, useEffect } from "react";
import Dashboard from "./pages/Dashboard";
import RiskAssessor from "./pages/RiskAssessor";
import ClusterExplorer from "./pages/ClusterExplorer";
import RulesExplorer from "./pages/RulesExplorer";

const NAV_ITEMS = [
  { id: "dashboard",  label: "Dashboard",        icon: "⬡" },
  { id: "risk",       label: "Risk Assessor",     icon: "◈" },
  { id: "clusters",   label: "Patient Clusters",  icon: "◉" },
  { id: "rules",      label: "Rule Explorer",     icon: "◆" },
];

export default function App() {
  const [activePage, setActivePage] = useState("dashboard");
  const [theme, setTheme] = useState("dark");

  useEffect(() => {
    const savedTheme = localStorage.getItem("theme") || "dark";
    setTheme(savedTheme);
  }, []);

  useEffect(() => {
    localStorage.setItem("theme", theme);
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === "dark" ? "light" : "dark");
  };

  const renderPage = () => {
    switch (activePage) {
      case "dashboard": return <Dashboard />;
      case "risk":      return <RiskAssessor />;
      case "clusters":  return <ClusterExplorer />;
      case "rules":     return <RulesExplorer />;
      default:          return <Dashboard />;
    }
  };

  return (
    <div style={styles.app} data-theme={theme}>
      {/* Sidebar */}
      <aside style={styles.sidebar}>
        <div style={styles.logo}>
          <div style={styles.logoIcon}>✚</div>
          <div>
            <div style={styles.logoTitle}>MedPredict</div>
            <div style={styles.logoSub}>Readmission AI</div>
          </div>
        </div>

        <nav style={styles.nav}>
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              onClick={() => setActivePage(item.id)}
              style={{
                ...styles.navBtn,
                ...(activePage === item.id ? styles.navBtnActive : {}),
              }}
            >
              <span style={styles.navIcon}>{item.icon}</span>
              <span>{item.label}</span>
              {activePage === item.id && <div style={styles.navIndicator} />}
            </button>
          ))}
        </nav>

        <div style={styles.sidebarFooter}>
          <div style={styles.statusDot} />
          <span style={styles.statusText}>API Connected</span>
        </div>
      </aside>

      {/* Main content */}
      <main style={styles.main}>
        <div style={styles.topBar}>
          <div>
            <div style={styles.pageTitle}>
              {NAV_ITEMS.find((n) => n.id === activePage)?.label}
            </div>
            <div style={styles.pageSub}>
              Hospital Readmission Prediction System — Diabetes 130-US Dataset
            </div>
          </div>
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <div style={styles.badge}>Data Mining Project</div>
            <button onClick={toggleTheme} style={styles.themeToggle}>
              {theme === "dark" ? "🌞" : "🌙"}
            </button>
          </div>
        </div>
        <div style={styles.content}>{renderPage()}</div>
        <div style={styles.footer}>© 2026 Hospital Readmission Prediction System</div>
      </main>

      <style>{globalCSS}</style>
    </div>
  );
}

const globalCSS = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=Syne:wght@400;600;700;800&family=DM+Sans:wght@300;400;500&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  
  :root {
    --transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    
    /* Dark Mode */
    --bg-primary: #010209;
    --bg-secondary: #0a0f1f;
    --bg-card: #0c1228;
    --bg-card-alt: #111633;
    --border: #1e2a44;
    --text-primary: #f1f5f9;
    --text-secondary: #cbd5e1;
    --text-muted: #94a3b8;
    --brand: linear-gradient(135deg, #c0392b, #e74c3c);
    --brand-rgb: 192, 57, 43;
    --accent-primary: linear-gradient(135deg, #3b82f6, #1d4ed8);
    --success: #34d399;
    --warning: #fbbf24;
    --danger: #f87171;
  }
  
  [data-theme="light"] {
    --bg-primary: #f8faff;
    --bg-secondary: #f0f4fe;
    --bg-card: #fdfdff;
    --bg-card-alt: #f8fbff;
    --border: #e2e8f0;
    --text-primary: #1e293b;
    --text-secondary: #475569;
    --text-muted: #64748b;
    --brand-rgb: 239, 68, 68;
  }
  
  body { 
    background: var(--bg-primary); 
    color: var(--text-primary); 
    font-family: 'DM Sans', sans-serif;
    transition: var(--transition);
  }
  
  [data-theme] * {
    transition: var(--transition);
  }
  
  ::-webkit-scrollbar { width: 4px; }
  ::-webkit-scrollbar-track { background: var(--bg-card-alt); }
  ::-webkit-scrollbar-thumb { background: var(--text-muted); border-radius: 2px; }

  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(16px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes pulse {
    0%, 100% { opacity: 1; } 50% { opacity: 0.4; }
  }
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
  .fade-up { animation: fadeUp 0.45s ease both; }
  .fade-up-2 { animation: fadeUp 0.45s ease 0.08s both; }
  .fade-up-3 { animation: fadeUp 0.45s ease 0.16s both; }
  .fade-up-4 { animation: fadeUp 0.45s ease 0.24s both; }
`;

const styles = {
  app: {
    display: "flex",
    minHeight: "100vh",
    background: "var(--bg-primary)",
  },
  sidebar: {
    width: 230,
    minHeight: "100vh",
    background: "var(--bg-secondary)",
    borderRight: "1px solid var(--border)",
    display: "flex",
    flexDirection: "column",
    padding: "28px 16px",
    position: "fixed",
    top: 0,
    left: 0,
    bottom: 0,
    zIndex: 100,
  },
  logo: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    marginBottom: 40,
    paddingLeft: 4,
  },
  logoIcon: {
    width: 38,
    height: 38,
    background: "linear-gradient(135deg, #c0392b, #e74c3c)",
    borderRadius: 10,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 18,
    color: "#fff",
    fontWeight: 700,
    flexShrink: 0,
    boxShadow: "0 4px 16px rgba(231,76,60,0.3)",
  },
  logoTitle: {
    fontFamily: "'Syne', sans-serif",
    fontWeight: 800,
    fontSize: 16,
    color: "#fff",
    letterSpacing: "-0.3px",
  },
  logoSub: {
    fontSize: 10,
    color: "#4a5a7a",
    letterSpacing: "0.5px",
    textTransform: "uppercase",
    fontFamily: "'DM Mono', monospace",
  },
  nav: {
    display: "flex",
    flexDirection: "column",
    gap: 4,
    flex: 1,
  },
  navBtn: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "11px 14px",
    borderRadius: 10,
    border: "none",
    background: "transparent",
    color: "#4a5a7a",
    fontSize: 13.5,
    fontFamily: "'DM Sans', sans-serif",
    fontWeight: 500,
    cursor: "pointer",
    transition: "all 0.2s",
    position: "relative",
    textAlign: "left",
    width: "100%",
  },
  navBtnActive: {
    background: "rgba(231,76,60,0.10)",
    color: "#e74c3c",
  },
  navIcon: {
    fontSize: 15,
    width: 20,
    textAlign: "center",
  },
  navIndicator: {
    position: "absolute",
    right: 0,
    top: "50%",
    transform: "translateY(-50%)",
    width: 3,
    height: 22,
    background: "#e74c3c",
    borderRadius: "2px 0 0 2px",
  },
  sidebarFooter: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    paddingLeft: 4,
    marginTop: 24,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: "50%",
    background: "#2ecc71",
    animation: "pulse 2s ease infinite",
  },
  statusText: {
    fontSize: 11,
    color: "#3a4a6a",
    fontFamily: "'DM Mono', monospace",
  },
  main: {
    marginLeft: 230,
    flex: 1,
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
  },
  topBar: {
    padding: "22px 32px",
    borderBottom: "1px solid var(--border)",
    background: "var(--bg-secondary)",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    position: "sticky",
    top: 0,
    zIndex: 50,
  },
  pageTitle: {
    fontFamily: "'Syne', sans-serif",
    fontWeight: 700,
    fontSize: 20,
    color: "var(--text-primary)",
    letterSpacing: "-0.4px",
  },
  pageSub: {
    fontSize: 11.5,
    color: "var(--text-muted)",
    fontFamily: "'DM Mono', monospace",
    marginTop: 2,
  },
  badge: {
    background: "rgba(var(--brand-rgb), 0.12)",
    border: "1px solid rgba(var(--brand-rgb), 0.25)",
    color: "rgb(var(--brand-rgb))",
    padding: "5px 14px",
    borderRadius: 20,
    fontSize: 11,
    fontFamily: "'DM Mono', monospace",
    letterSpacing: "0.5px",
  },
  themeToggle: {
    width: 40,
    height: 40,
    borderRadius: "50%",
    border: "none",
    background: "var(--bg-card)",
    color: "var(--text-secondary)",
    fontSize: 18,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "all 0.2s ease",
  },
  content: {
    padding: "28px 32px",
    flex: 1,
  },
  footer: {
    padding: "24px 32px",
    borderTop: "1px solid var(--border)",
    background: "var(--bg-secondary)",
    textAlign: "center",
    fontSize: 12,
    color: "var(--text-muted)",
    fontFamily: "'DM Mono', monospace",
  },
};
