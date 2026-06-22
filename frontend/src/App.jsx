import { useState } from "react";
import axios from "axios";

const EVENT_TYPES = [
    "Political Rally",
    "Sports Event",
    "Concert / Festival",
    "Religious Gathering",
    "Marathon / Road Race",
    "Public Protest",
    "State Funeral / Parade",
    "Exhibition / Trade Fair",
];

const PRIORITY_OPTIONS = [
    { label: "Low", value: 1 },
    { label: "Medium", value: 2 },
    { label: "High", value: 3 },
];

const initialForm = {
    event_type: EVENT_TYPES[0],
    duration_minutes: 60,
    priority: 1,
};

function ScoreRing({ score }) {
    const clamped = Math.min(Math.max(score, 0), 100);
    const radius = 52;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (clamped / 100) * circumference;
    const color = clamped >= 65 ? "#ef4444" : clamped >= 35 ? "#f59e0b" : "#22c55e";

    return (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "6px" }}>
            <svg width="130" height="130" viewBox="0 0 130 130">
                <circle cx="65" cy="65" r={radius} fill="none" stroke="#1e293b" strokeWidth="10" />
                <circle
                    cx="65"
                    cy="65"
                    r={radius}
                    fill="none"
                    stroke={color}
                    strokeWidth="10"
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                    strokeLinecap="round"
                    transform="rotate(-90 65 65)"
                    style={{ transition: "stroke-dashoffset 0.6s ease, stroke 0.4s ease" }}
                />
                <text x="65" y="60" textAnchor="middle" fill={color} fontSize="22" fontWeight="700" fontFamily="'Inter', sans-serif">
                    {clamped.toFixed(1)}
                </text>
                <text x="65" y="78" textAnchor="middle" fill="#64748b" fontSize="10" fontFamily="'Inter', sans-serif">
                    / 100
                </text>
            </svg>
            <span style={{ fontSize: "11px", letterSpacing: "0.12em", color: "#64748b", textTransform: "uppercase" }}>
                Congestion Score
            </span>
        </div>
    );
}

function StatCard({ label, value, accent }) {
    return (
        <div style={{
            background: "#0f172a",
            border: `1px solid ${accent}33`,
            borderRadius: "12px",
            padding: "20px 24px",
            display: "flex",
            flexDirection: "column",
            gap: "6px",
            flex: "1",
            minWidth: "120px",
        }}>
            <span style={{ fontSize: "28px", fontWeight: "700", color: accent, fontVariantNumeric: "tabular-nums" }}>
                {value}
            </span>
            <span style={{ fontSize: "11px", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.1em" }}>
                {label}
            </span>
        </div>
    );
}

function DiversionBadge({ required }) {
    return (
        <div style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            padding: "14px 20px",
            borderRadius: "12px",
            background: required ? "#ef444415" : "#22c55e15",
            border: `1px solid ${required ? "#ef4444" : "#22c55e"}`,
            marginTop: "4px",
        }}>
            <div style={{
                width: "10px",
                height: "10px",
                borderRadius: "50%",
                background: required ? "#ef4444" : "#22c55e",
                boxShadow: `0 0 8px ${required ? "#ef4444" : "#22c55e"}`,
                flexShrink: 0,
            }} />
            <span style={{
                fontSize: "13px",
                fontWeight: "600",
                color: required ? "#ef4444" : "#22c55e",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
            }}>
                {required ? "Traffic Diversion Required" : "No Diversion Needed"}
            </span>
        </div>
    );
}

const inputStyle = {
    width: "100%",
    background: "#0f172a",
    border: "1px solid #1e293b",
    borderRadius: "8px",
    padding: "11px 14px",
    color: "#f1f5f9",
    fontSize: "14px",
    outline: "none",
    boxSizing: "border-box",
    appearance: "none",
    WebkitAppearance: "none",
};

const labelStyle = {
    fontSize: "11px",
    color: "#64748b",
    textTransform: "uppercase",
    letterSpacing: "0.1em",
    marginBottom: "6px",
    display: "block",
};

export default function App() {
    const [form, setForm] = useState(initialForm);
    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm((prev) => ({
            ...prev,
            [name]: name === "duration_minutes" || name === "priority" ? Number(value) : value,
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setResult(null);
        try {
            const { data } = await axios.post("http://localhost:3000/api/forecast", {
                event_type: form.event_type.toLowerCase().replace(/ \/ /g, "_").replace(/ /g, "_"),
                duration_minutes: form.duration_minutes,
                priority: form.priority,
            });
            setResult(data);
        } catch (err) {
            setError(err.response?.data?.error || "Forecast service unavailable.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{
            minHeight: "100vh",
            background: "#020817",
            color: "#f1f5f9",
            fontFamily: "'Inter', 'Segoe UI', sans-serif",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            padding: "48px 16px",
        }}>
            <div style={{ width: "100%", maxWidth: "760px", display: "flex", flexDirection: "column", gap: "32px" }}>

                <div style={{ borderBottom: "1px solid #1e293b", paddingBottom: "24px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "6px" }}>
                        <div style={{
                            width: "8px", height: "8px", borderRadius: "50%",
                            background: "#38bdf8", boxShadow: "0 0 10px #38bdf8",
                        }} />
                        <span style={{ fontSize: "11px", color: "#38bdf8", letterSpacing: "0.15em", textTransform: "uppercase" }}>
                            Grid Lock · Operations Console
                        </span>
                    </div>
                    <h1 style={{ fontSize: "28px", fontWeight: "700", margin: 0, letterSpacing: "-0.02em", color: "#f8fafc" }}>
                        Event Impact Forecaster
                    </h1>
                    <p style={{ margin: "6px 0 0", fontSize: "14px", color: "#475569" }}>
                        Predict congestion load and compute operational resource requirements.
                    </p>
                </div>

                <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>

                        <div style={{ gridColumn: "1 / -1" }}>
                            <label style={labelStyle}>Event Type</label>
                            <select name="event_type" value={form.event_type} onChange={handleChange} style={{ ...inputStyle, cursor: "pointer" }}>
                                {EVENT_TYPES.map((et) => (
                                    <option key={et} value={et}>{et}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label style={labelStyle}>Duration (minutes)</label>
                            <input
                                type="number"
                                name="duration_minutes"
                                value={form.duration_minutes}
                                onChange={handleChange}
                                min={1}
                                max={1440}
                                required
                                style={inputStyle}
                            />
                        </div>

                        <div>
                            <label style={labelStyle}>Priority Level</label>
                            <select name="priority" value={form.priority} onChange={handleChange} style={{ ...inputStyle, cursor: "pointer" }}>
                                {PRIORITY_OPTIONS.map((p) => (
                                    <option key={p.value} value={p.value}>{p.label}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        style={{
                            background: loading ? "#1e293b" : "linear-gradient(135deg, #0ea5e9, #6366f1)",
                            color: loading ? "#475569" : "#fff",
                            border: "none",
                            borderRadius: "8px",
                            padding: "13px 28px",
                            fontSize: "14px",
                            fontWeight: "600",
                            cursor: loading ? "not-allowed" : "pointer",
                            letterSpacing: "0.04em",
                            transition: "opacity 0.2s",
                            alignSelf: "flex-start",
                        }}
                    >
                        {loading ? "Running Forecast…" : "Run Forecast"}
                    </button>
                </form>

                {error && (
                    <div style={{
                        background: "#ef444410",
                        border: "1px solid #ef4444",
                        borderRadius: "10px",
                        padding: "14px 18px",
                        color: "#ef4444",
                        fontSize: "13px",
                    }}>
                        {error}
                    </div>
                )}

                {result && (
                    <div style={{ display: "flex", flexDirection: "column", gap: "20px", animation: "fadeIn 0.4s ease" }}>
                        <div style={{
                            background: "#0a1628",
                            border: "1px solid #1e293b",
                            borderRadius: "16px",
                            padding: "28px",
                            display: "flex",
                            flexDirection: "column",
                            gap: "24px",
                        }}>
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "20px" }}>
                                <div>
                                    <p style={{ margin: 0, fontSize: "11px", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.1em" }}>
                                        Forecast Result
                                    </p>
                                    <p style={{ margin: "4px 0 0", fontSize: "15px", fontWeight: "600", color: "#cbd5e1" }}>
                                        {form.event_type} · {form.duration_minutes} min ·{" "}
                                        {PRIORITY_OPTIONS.find((p) => p.value === form.priority)?.label} Priority
                                    </p>
                                </div>
                                <ScoreRing score={result.congestion_impact_score} />
                            </div>

                            <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
                                <StatCard label="Manpower" value={result.recommended_manpower} accent="#38bdf8" />
                                <StatCard label="Barricades" value={result.recommended_barricades} accent="#a78bfa" />
                            </div>

                            <DiversionBadge required={result.requires_diversion} />
                        </div>
                    </div>
                )}
            </div>

            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
                * { box-sizing: border-box; margin: 0; padding: 0; }
                select option { background: #0f172a; }
                input[type=number]::-webkit-inner-spin-button { -webkit-appearance: none; }
                @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
            `}</style>
        </div>
    );
}