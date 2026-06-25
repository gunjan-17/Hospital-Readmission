import { useState, useEffect, useCallback } from "react";

const API = "http://localhost:5000/api";

function FilterSlider({ label, value, min, max, step, onChange, unit, color }) {
  return (
    <div style={s.filterRow}>
      <div style={s.filterTop}>
        <span style={s.filterLabel}>{label}</span>
        <span style={{ ...s.filterVal, color }}>{value}{unit}</span>
      </div>
      <input
        type="range" min={min} max={max} step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ ...s.slider, accentColor: color }}
      />
      <div style={s.filterScale}>
        <span>{min}{unit}</span>
        <span>{max}{unit}</span>
      </div>
    </div>
  );
}

function RuleCard({ rule, index }) {
  const [expanded, setExpanded] = useState(false);
  const liftColor = rule.lift >= 2.0 ? "#e74c3c" : rule.lift >= 1.5 ? "#f59e0b" : "#3b82f6";

  return (
    <div style={s.ruleCard} onClick={() => setExpanded(!expanded)}>
      {/* Header row */}
      <div style={s.ruleHeader}>
        <div style={s.ruleIndex}>#{index + 1}</div>

        <div style={s.ruleMain}>
          <div style={s.ruleIf}>
            <span style={s.ruleIfLabel}>IF</span>
            <span style={s.ruleAnt}>{rule.antecedents}</span>
          </div>
          <div style={s.ruleThen}>
            <span style={s.ruleThenLabel}>THEN</span>
            <span style={s.ruleCon}>{rule.consequents}</span>
          </div>
        </div>

        <div style={s.ruleMetrics}>
          <div style={s.metricChip}>
            <span style={s.chipLabel}>Conf</span>
            <span style={s.chipVal}>{rule.confidence_pct}%</span>
          </div>
          <div style={{ ...s.metricChip, borderColor: `${liftColor}44` }}>
            <span style={s.chipLabel}>Lift</span>
            <span style={{ ...s.chipVal, color: liftColor }}>{rule.lift}</span>
          </div>
          <div style={s.metricChip}>
            <span style={s.chipLabel}>Supp</span>
            <span style={s.chipVal}>{rule.support_pct}%</span>
          </div>
        </div>

        <div style={s.expandIcon}>{expanded ? "▲" : "▼"}</div>
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div style={s.ruleDetail} className="fade-up">
          <div style={s.detailGrid}>

            <div style={s.detailBlock}>
              <div style={s.detailBlockTitle}>Plain English</div>
              <div style={s.plainEnglish}>{rule.plain_english}</div>
            </div>

            <div style={s.detailBlock}>
              <div style={s.detailBlockTitle}>Metric Breakdown</div>
              <MetricBar label="Confidence" value={rule.confidence_pct} max={100} color="#e74c3c"
                         hint="% of time this rule is correct" />
              <MetricBar label="Support"    value={rule.support_pct}    max={100} color="#3b82f6"
                         hint="% of patients this pattern appears in" />
              <MetricBar label="Lift"       value={Math.min(rule.lift, 5)} max={5} color={liftColor}
                         hint={`${rule.lift}x better than random chance`} />
            </div>

            <div style={s.detailBlock}>
              <div style={s.detailBlockTitle}>Interpretation</div>
              <div style={s.interpretText}>
                {rule.lift >= 2.0
                  ? `🔴 Strong rule — ${rule.lift}x more likely than chance. High clinical significance.`
                  : rule.lift >= 1.5
                  ? `🟡 Moderate rule — ${rule.lift}x more likely than chance. Noteworthy pattern.`
                  : `🔵 Weak rule — marginally better than random. Consider with caution.`}
              </div>
              {rule.leverage !== undefined && (
                <div style={s.leverageRow}>
                  <span style={s.leverageLabel}>Leverage:</span>
                  <span style={s.leverageVal}>{rule.leverage}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function MetricBar({ label, value, max, color, hint }) {
  return (
    <div style={s.mBarRow}>
      <div style={s.mBarTop}>
        <span style={s.mBarLabel}>{label}</span>
        <span style={{ ...s.mBarVal, color }}>{value}{label !== "Lift" ? "%" : "x"}</span>
      </div>
      <div style={s.mBarTrack}>
        <div style={{ ...s.mBarFill, width: `${(value / max) * 100}%`, background: color }} />
      </div>
      <div style={s.mBarHint}>{hint}</div>
    </div>
  );
}

export default function RulesExplorer() {
  const [rules,      setRules]      = useState([]);
  const [total,      setTotal]      = useState(0);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState(null);
  const [minConf,    setMinConf]    = useState(0.05);
  const [minLift,    setMinLift]    = useState(1.00);
  const [minSupport, setMinSupport] = useState(0.02);
  const [limit,      setLimit]      = useState(30);
  const [sortBy,     setSortBy]     = useState("lift");

  const fetchRules = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams({
      min_confidence: minConf,
      min_lift:       minLift,
      min_support:    minSupport,
      limit,
    });
    fetch(`${API}/rules?${params}`)
      .then((r) => r.json())
      .then((d) => {
        setRules(d.rules || []);
        setTotal(d.total_rules || 0);
        setLoading(false);
      })
      .catch(() => {
        setError("Cannot reach Flask API on localhost:5000");
        setLoading(false);
      });
  }, [minConf, minLift, minSupport, limit]);

  useEffect(() => { fetchRules(); }, [fetchRules]);

  const sorted = [...rules].sort((a, b) => {
    if (sortBy === "lift")       return b.lift       - a.lift;
    if (sortBy === "confidence") return b.confidence - a.confidence;
    if (sortBy === "support")    return b.support    - a.support;
    return 0;
  });

  return (
    <div style={s.layout}>
      {/* ── Left: Filters ── */}
      <div style={s.filterPanel}>
        <div style={s.filterPanelTitle}>Filter Rules</div>

        <FilterSlider
          label="Min Confidence" value={minConf}
          min={0.05} max={0.12} step={0.001}
          onChange={setMinConf} unit="%" color="#e74c3c"
        />
        <FilterSlider
          label="Min Lift" value={minLift}
          min={1.00} max={1.04} step={0.001}
          onChange={setMinLift} unit="x" color="#f59e0b"
        />
        <FilterSlider
          label="Min Support" value={minSupport}
          min={0.03} max={0.12} step={0.001}
          onChange={setMinSupport} unit="" color="#3b82f6"
        />
        <FilterSlider
          label="Max Rules" value={limit}
          min={10} max={100} step={10}
          onChange={setLimit} unit="" color="#a855f7"
        />

        {/* Sort */}
        <div style={s.sortSection}>
          <div style={s.filterLabel}>Sort By</div>
          <div style={s.sortBtns}>
            {["lift", "confidence", "support"].map((opt) => (
              <button key={opt} onClick={() => setSortBy(opt)}
                style={{ ...s.sortBtn,
                  background: sortBy === opt ? "rgba(231,76,60,0.15)" : "transparent",
                  color: sortBy === opt ? "#e74c3c" : "#4a5a7a",
                  border: sortBy === opt ? "1px solid rgba(231,76,60,0.3)" : "1px solid #1a2235",
                }}>
                {opt.charAt(0).toUpperCase() + opt.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Stats */}
        <div style={s.statsBox}>
          <div style={s.statsRow}>
            <span style={s.statsLabel}>Rules shown</span>
            <span style={s.statsVal}>{rules.length}</span>
          </div>
          <div style={s.statsRow}>
            <span style={s.statsLabel}>Total matching</span>
            <span style={s.statsVal}>{total}</span>
          </div>
          <div style={s.statsRow}>
            <span style={s.statsLabel}>Avg lift</span>
            <span style={s.statsVal}>
              {rules.length ? (rules.reduce((a, r) => a + r.lift, 0) / rules.length).toFixed(2) : "—"}x
            </span>
          </div>
          <div style={s.statsRow}>
            <span style={s.statsLabel}>Avg confidence</span>
            <span style={s.statsVal}>
              {rules.length ? (rules.reduce((a, r) => a + r.confidence_pct, 0) / rules.length).toFixed(1) : "—"}%
            </span>
          </div>
        </div>

        <div style={s.legendSection}>
          <div style={s.filterLabel}>Lift Legend</div>
          <div style={s.legendItem}><span style={{ ...s.legendDot, background: "#e74c3c" }} /> ≥ 2.0 — Strong</div>
          <div style={s.legendItem}><span style={{ ...s.legendDot, background: "#f59e0b" }} /> ≥ 1.5 — Moderate</div>
          <div style={s.legendItem}><span style={{ ...s.legendDot, background: "#3b82f6" }} /> ≥ 1.2 — Weak</div>
        </div>
      </div>

      {/* ── Right: Rules List ── */}
      <div style={s.rulesPanel}>
        <div style={s.rulesHeader}>
          <div style={s.rulesTitle}>
            Association Rules
            <span style={s.rulesCount}>{rules.length} rules</span>
          </div>
          <div style={s.rulesHint}>Click any rule to expand details</div>
        </div>

        {loading && <LoadingRules />}
        {error   && <ErrorBanner msg={error} />}

        {!loading && !error && sorted.length === 0 && (
          <div style={s.emptyRules}>
            <div style={s.emptyIcon}>◆</div>
            <div style={s.emptyTitle}>No rules match current filters</div>
            <div style={s.emptySub}>Try lowering the minimum confidence or lift thresholds.</div>
          </div>
        )}

        {!loading && !error && sorted.map((rule, i) => (
          <RuleCard key={i} rule={rule} index={i} />
        ))}
      </div>
    </div>
  );
}

function LoadingRules() {
  return (
    <div style={s.loadingWrap}>
      <div style={s.spinner} />
      <span style={s.loadingTxt}>Fetching rules…</span>
    </div>
  );
}

function ErrorBanner({ msg }) {
  return (
    <div style={s.errorBanner}>⚠ {msg}</div>
  );
}

const s = {
  layout:      { display: "grid", gridTemplateColumns: "260px 1fr", gap: 20, alignItems: "start" },

  filterPanel: { background: "var(--bg-card)", border: "1px solid var(--border)",
                 borderRadius: 14, padding: "22px 20px",
                 position: "sticky", top: 80, display: "flex",
                 flexDirection: "column", gap: 20 },
  filterPanelTitle: { fontFamily: "'Syne', sans-serif", fontWeight: 700,
                      fontSize: 14, color: "var(--text-primary)", marginBottom: 4 },
  filterRow:   { display: "flex", flexDirection: "column", gap: 6 },
  filterTop:   { display: "flex", justifyContent: "space-between" },
  filterLabel: { fontSize: 11.5, color: "#8899bb", fontFamily: "'DM Mono', monospace" },
  filterVal:   { fontSize: 12, fontFamily: "'DM Mono', monospace", fontWeight: 600 },
  slider:      { width: "100%", cursor: "pointer" },
  filterScale: { display: "flex", justifyContent: "space-between",
                 fontSize: 9.5, color: "#2a3a5a", fontFamily: "'DM Mono', monospace" },

  sortSection: { display: "flex", flexDirection: "column", gap: 8 },
  sortBtns:    { display: "flex", gap: 6 },
  sortBtn:     { flex: 1, padding: "6px 4px", borderRadius: 8,
                 fontSize: 11, fontFamily: "'DM Mono', monospace",
                 cursor: "pointer", transition: "all 0.15s" },

  statsBox:    { background: "#0a0d14", border: "1px solid #141c2e",
                 borderRadius: 10, padding: "14px 16px",
                 display: "flex", flexDirection: "column", gap: 8 },
  statsRow:    { display: "flex", justifyContent: "space-between", alignItems: "center" },
  statsLabel:  { fontSize: 11, color: "#3a4a6a", fontFamily: "'DM Mono', monospace" },
  statsVal:    { fontSize: 12, color: "#c8d0e0", fontFamily: "'DM Mono', monospace" },

  legendSection: { display: "flex", flexDirection: "column", gap: 8 },
  legendItem:  { display: "flex", alignItems: "center", gap: 8,
                 fontSize: 11.5, color: "#8899bb" },
  legendDot:   { width: 8, height: 8, borderRadius: "50%", flexShrink: 0 },

  rulesPanel:  { display: "flex", flexDirection: "column", gap: 10 },
  rulesHeader: { display: "flex", justifyContent: "space-between",
                 alignItems: "baseline", marginBottom: 4 },
  rulesTitle:  { fontFamily: "'Syne', sans-serif", fontWeight: 700,
                 fontSize: 15, color: "#fff", display: "flex",
                 alignItems: "center", gap: 10 },
  rulesCount:  { background: "rgba(231,76,60,0.12)", border: "1px solid rgba(231,76,60,0.2)",
                 color: "#e74c3c", padding: "2px 10px", borderRadius: 20,
                 fontSize: 11, fontFamily: "'DM Mono', monospace" },
  rulesHint:   { fontSize: 11, color: "#2a3a5a", fontFamily: "'DM Mono', monospace" },

  ruleCard:    { background: "#0d1117", border: "1px solid #1a2235",
                 borderRadius: 12, padding: "16px 18px", cursor: "pointer",
                 transition: "border-color 0.2s" },
  ruleHeader:  { display: "flex", alignItems: "center", gap: 14 },
  ruleIndex:   { fontFamily: "'DM Mono', monospace", fontSize: 11, color: "#2a3a5a",
                 width: 28, flexShrink: 0 },
  ruleMain:    { flex: 1, display: "flex", flexDirection: "column", gap: 4 },
  ruleIf:      { display: "flex", alignItems: "center", gap: 8 },
  ruleThen:    { display: "flex", alignItems: "center", gap: 8 },
  ruleIfLabel: { fontSize: 9.5, color: "#3b82f6", fontFamily: "'DM Mono', monospace",
                 background: "rgba(59,130,246,0.1)", border: "1px solid rgba(59,130,246,0.2)",
                 padding: "1px 6px", borderRadius: 4, flexShrink: 0 },
  ruleThenLabel:{ fontSize: 9.5, color: "#2ecc71", fontFamily: "'DM Mono', monospace",
                 background: "rgba(46,204,113,0.1)", border: "1px solid rgba(46,204,113,0.2)",
                 padding: "1px 6px", borderRadius: 4, flexShrink: 0 },
  ruleAnt:     { fontSize: 12.5, color: "#c8d0e0" },
  ruleCon:     { fontSize: 12.5, color: "#2ecc71" },

  ruleMetrics: { display: "flex", gap: 6, flexShrink: 0 },
  metricChip:  { display: "flex", flexDirection: "column", alignItems: "center",
                 background: "#141c2e", border: "1px solid #1a2235",
                 borderRadius: 8, padding: "5px 10px", minWidth: 52 },
  chipLabel:   { fontSize: 9, color: "#3a4a6a", fontFamily: "'DM Mono', monospace",
                 textTransform: "uppercase" },
  chipVal:     { fontSize: 13, fontFamily: "'DM Mono', monospace", color: "#c8d0e0",
                 fontWeight: 600, marginTop: 1 },
  expandIcon:  { fontSize: 10, color: "#3a4a6a", flexShrink: 0, width: 16 },

  ruleDetail:  { marginTop: 16, paddingTop: 16, borderTop: "1px solid #141c2e" },
  detailGrid:  { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 },
  detailBlock: { display: "flex", flexDirection: "column", gap: 8 },
  detailBlockTitle: { fontSize: 10.5, color: "#3a4a6a", fontFamily: "'DM Mono', monospace",
                      textTransform: "uppercase", letterSpacing: "0.5px" },
  plainEnglish:{ fontSize: 12.5, color: "#c8d0e0", lineHeight: 1.7,
                 background: "#0a0d14", border: "1px solid #141c2e",
                 borderRadius: 8, padding: "10px 12px" },
  interpretText:{ fontSize: 12, color: "#c8d0e0", lineHeight: 1.7 },
  leverageRow: { display: "flex", gap: 8, alignItems: "center", marginTop: 8 },
  leverageLabel:{ fontSize: 11, color: "#3a4a6a", fontFamily: "'DM Mono', monospace" },
  leverageVal: { fontSize: 12, color: "#8899bb", fontFamily: "'DM Mono', monospace" },

  mBarRow:     { marginBottom: 8 },
  mBarTop:     { display: "flex", justifyContent: "space-between", marginBottom: 4 },
  mBarLabel:   { fontSize: 11, color: "#8899bb" },
  mBarVal:     { fontSize: 11, fontFamily: "'DM Mono', monospace", fontWeight: 600 },
  mBarTrack:   { height: 6, background: "#141c2e", borderRadius: 3, overflow: "hidden" },
  mBarFill:    { height: "100%", borderRadius: 3, transition: "width 0.4s ease" },
  mBarHint:    { fontSize: 9.5, color: "#2a3a5a", fontFamily: "'DM Mono', monospace",
                 marginTop: 3 },

  loadingWrap: { display: "flex", alignItems: "center", gap: 12, padding: 24,
                 justifyContent: "center" },
  spinner:     { width: 24, height: 24, border: "2px solid #1a2235",
                 borderTopColor: "#e74c3c", borderRadius: "50%",
                 animation: "spin 0.8s linear infinite" },
  loadingTxt:  { color: "#3a4a6a", fontFamily: "'DM Mono', monospace", fontSize: 12 },
  errorBanner: { background: "rgba(231,76,60,0.1)", border: "1px solid rgba(231,76,60,0.3)",
                 borderRadius: 12, padding: "16px 20px", color: "#e74c3c", fontSize: 13 },
  emptyRules:  { display: "flex", flexDirection: "column", alignItems: "center",
                 justifyContent: "center", padding: "80px 0", gap: 12, textAlign: "center" },
  emptyIcon:   { fontSize: 40, color: "#1a2235" },
  emptyTitle:  { fontFamily: "'Syne', sans-serif", fontWeight: 700,
                 fontSize: 16, color: "#2a3a5a" },
  emptySub:    { fontSize: 12.5, color: "#2a3a5a", maxWidth: 300, lineHeight: 1.6 },
};