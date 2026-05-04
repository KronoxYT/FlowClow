import { useState, useEffect, useRef, useCallback } from "react";
import UpdateNotifier, { UpdateBadge, UpdateSheet } from "./updater/UpdateNotifier.jsx";

// ─── Helpers ─────────────────────────────────────────────────────────────────
const pad = (n) => String(n).padStart(2, "0");
const fmtDate = (d) =>
  d.toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long" });

const TABS = ["clock", "tasks", "assistant"];

const ICONS = {
  clock: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
    </svg>
  ),
  tasks: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
    </svg>
  ),
  assistant: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <path d="M12 2a8 8 0 018 8c0 5-8 13-8 13S4 15 4 10a8 8 0 018-8z" /><circle cx="12" cy="10" r="2.5" />
    </svg>
  ),
};

// ─── Global CSS ───────────────────────────────────────────────────────────────
const GlobalStyles = () => (
  <style>{`
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; -webkit-tap-highlight-color: transparent; }

    :root {
      --bg: #0d0d14;
      --surface: rgba(255,255,255,0.04);
      --border: rgba(255,255,255,0.08);
      --text: #f0f0f8;
      --muted: rgba(240,240,248,0.4);
      --accent: #4f8cff;
      --accent2: #7b5ea7;
      --safe-top: env(safe-area-inset-top, 44px);
      --safe-bottom: env(safe-area-inset-bottom, 20px);
    }

    html, body, #root {
      width: 100%; height: 100%;
      background: var(--bg);
      color: var(--text);
      font-family: 'DM Sans', sans-serif;
      overflow: hidden;
    }

    /* ── APP SHELL ── */
    .app-shell {
      display: flex; flex-direction: column;
      width: 100%; height: 100%;
      background: var(--bg);
    }

    /* ── HEADER ── */
    .app-header {
      padding: var(--safe-top) 24px 0;
      flex-shrink: 0;
    }
    .app-header-inner {
      display: flex; align-items: center; justify-content: space-between;
      height: 52px;
    }
    .app-logo {
      font-family: 'Space Mono', monospace;
      font-size: 17px; font-weight: 700; letter-spacing: -0.5px;
      background: linear-gradient(135deg, #fff 30%, #7eb8ff 70%);
      -webkit-background-clip: text; -webkit-text-fill-color: transparent;
    }
    .header-time {
      font-family: 'Space Mono', monospace;
      font-size: 13px; color: var(--muted);
    }

    /* ── CONTENT ── */
    .content-area {
      flex: 1; overflow-y: auto; overflow-x: hidden;
      scrollbar-width: none;
    }
    .content-area::-webkit-scrollbar { display: none; }

    /* ── NAV BAR ── */
    .nav-bar {
      padding: 8px 16px;
      padding-bottom: calc(8px + var(--safe-bottom));
      display: flex; align-items: center; justify-content: space-around;
      border-top: 1px solid var(--border);
      background: rgba(13,13,20,0.97);
      backdrop-filter: blur(20px);
      flex-shrink: 0;
    }
    .nav-btn {
      flex: 1; height: 56px; display: flex; flex-direction: column;
      align-items: center; justify-content: center; gap: 5px;
      border: none; background: transparent; cursor: pointer;
      border-radius: 16px; transition: all 0.2s ease;
      color: rgba(240,240,248,0.3);
      font-family: 'DM Sans', sans-serif; font-size: 10px; font-weight: 500;
      letter-spacing: 0.03em;
    }
    .nav-btn.active { color: #fff; background: rgba(255,255,255,0.07); }
    .nav-btn.active svg { filter: drop-shadow(0 0 8px rgba(100,160,255,0.5)); }

    /* ── CLOCK TAB ── */
    .clock-screen { padding: 12px 24px 24px; }
    .time-hero { text-align: center; padding: 24px 0 28px; }
    .time-big {
      font-family: 'Space Mono', monospace;
      font-size: 80px; font-weight: 700; letter-spacing: -3px; line-height: 1;
      background: linear-gradient(135deg, #fff 30%, #7eb8ff 70%, #a78bfa 100%);
      -webkit-background-clip: text; -webkit-text-fill-color: transparent;
    }
    .time-ampm {
      font-size: 18px; font-weight: 500; color: rgba(240,240,248,0.5);
      vertical-align: super; margin-left: 6px; font-family: 'DM Sans', sans-serif;
      -webkit-text-fill-color: rgba(240,240,248,0.5);
    }
    .time-date {
      margin-top: 8px; font-size: 14px; color: var(--muted);
      text-transform: capitalize; letter-spacing: 0.03em;
    }
    .section-title {
      font-size: 11px; font-weight: 600; letter-spacing: 0.12em;
      text-transform: uppercase; color: rgba(240,240,248,0.25);
      margin: 24px 0 12px;
    }
    .alarm-list { display: flex; flex-direction: column; gap: 10px; }
    .alarm-card {
      background: var(--surface); border: 1px solid var(--border);
      border-radius: 20px; padding: 16px 20px;
      display: flex; align-items: center; justify-content: space-between;
      transition: all 0.2s;
    }
    .alarm-card.inactive { opacity: 0.4; }
    .alarm-time-display {
      font-family: 'Space Mono', monospace; font-size: 32px; font-weight: 700; color: #fff;
    }
    .alarm-label { font-size: 12px; color: var(--muted); margin-top: 3px; }
    .alarm-days { display: flex; gap: 5px; margin-top: 8px; }
    .day-dot {
      width: 24px; height: 24px; border-radius: 50%;
      background: rgba(255,255,255,0.06); font-size: 9px; font-weight: 700;
      color: rgba(240,240,248,0.3);
      display: flex; align-items: center; justify-content: center;
    }
    .day-dot.on { background: rgba(100,160,255,0.18); color: #7eb8ff; }
    .toggle {
      width: 52px; height: 30px; border-radius: 15px;
      background: rgba(255,255,255,0.1); border: none; cursor: pointer;
      position: relative; transition: all 0.25s ease; flex-shrink: 0;
    }
    .toggle.on { background: linear-gradient(90deg, #4f8cff, #7b5ea7); }
    .toggle::after {
      content: ''; position: absolute; top: 3px; left: 3px;
      width: 24px; height: 24px; border-radius: 50%;
      background: #fff; transition: all 0.25s ease;
      box-shadow: 0 2px 6px rgba(0,0,0,0.4);
    }
    .toggle.on::after { left: calc(100% - 27px); }
    .quick-tools { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 12px; }
    .tool-card {
      background: var(--surface); border: 1px solid var(--border);
      border-radius: 20px; padding: 18px;
      display: flex; flex-direction: column; gap: 8px; cursor: pointer;
      transition: all 0.2s; text-align: left; color: var(--text);
      font-family: 'DM Sans', sans-serif;
    }
    .tool-card:active { transform: scale(0.96); background: rgba(255,255,255,0.07); }
    .tool-icon { font-size: 24px; }
    .tool-name { font-size: 13px; font-weight: 600; }
    .tool-value { font-family: 'Space Mono', monospace; font-size: 20px; color: var(--accent); }

    /* ── TASKS TAB ── */
    .tasks-screen { padding: 12px 24px 24px; }
    .tasks-headline { font-size: 28px; font-weight: 600; }
    .tasks-sub { font-size: 13px; color: var(--muted); margin-top: 4px; }
    .add-task-row { display: flex; gap: 10px; margin: 20px 0; }
    .add-input {
      flex: 1; background: var(--surface); border: 1px solid var(--border);
      border-radius: 14px; padding: 14px 16px;
      color: var(--text); font-family: 'DM Sans', sans-serif; font-size: 15px;
      outline: none; transition: border 0.2s;
    }
    .add-input::placeholder { color: rgba(240,240,248,0.25); }
    .add-input:focus { border-color: rgba(100,160,255,0.4); }
    .add-btn {
      width: 50px; height: 50px; border-radius: 14px; border: none;
      background: linear-gradient(135deg, #4f8cff, #7b5ea7);
      color: #fff; font-size: 24px; cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0; transition: transform 0.15s;
    }
    .add-btn:active { transform: scale(0.91); }
    .task-group { margin-bottom: 24px; }
    .task-group-label {
      font-size: 11px; font-weight: 600; letter-spacing: 0.12em;
      text-transform: uppercase; color: rgba(240,240,248,0.25); margin-bottom: 10px;
    }
    .task-list { display: flex; flex-direction: column; gap: 8px; }
    .task-item {
      background: var(--surface); border: 1px solid var(--border);
      border-radius: 16px; padding: 16px;
      display: flex; align-items: center; gap: 12px;
      transition: all 0.25s; cursor: pointer;
    }
    .task-item:active { transform: scale(0.98); }
    .task-item.done { opacity: 0.35; }
    .task-check {
      width: 24px; height: 24px; border-radius: 50%; flex-shrink: 0;
      border: 2px solid rgba(255,255,255,0.2); background: transparent;
      display: flex; align-items: center; justify-content: center; transition: all 0.2s;
    }
    .task-item.done .task-check { background: linear-gradient(135deg, #4f8cff, #7b5ea7); border-color: transparent; }
    .task-text { font-size: 15px; font-weight: 400; flex: 1; }
    .task-item.done .task-text { text-decoration: line-through; }
    .task-priority { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }

    /* ── ASSISTANT TAB ── */
    .assistant-screen { display: flex; flex-direction: column; height: 100%; }
    .assistant-header {
      padding: 12px 24px 14px;
      border-bottom: 1px solid var(--border); flex-shrink: 0;
    }
    .flow-badge {
      display: inline-flex; align-items: center; gap: 8px;
      background: rgba(255,255,255,0.05); border: 1px solid var(--border);
      border-radius: 20px; padding: 6px 14px 6px 8px;
      font-size: 12px; font-weight: 500; color: rgba(240,240,248,0.8);
      margin-bottom: 6px;
    }
    .flow-orb {
      width: 20px; height: 20px; border-radius: 50%;
      background: conic-gradient(from 0deg, #4f8cff, #a78bfa, #f472b6, #4f8cff);
      animation: spin 4s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    .assistant-title { font-size: 22px; font-weight: 600; }

    .chat-messages {
      flex: 1; overflow-y: auto; padding: 16px 24px;
      display: flex; flex-direction: column; gap: 12px;
      scrollbar-width: none;
    }
    .chat-messages::-webkit-scrollbar { display: none; }
    .msg { max-width: 82%; display: flex; flex-direction: column; gap: 4px; animation: msgIn 0.3s ease; }
    @keyframes msgIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
    .msg.user { align-self: flex-end; align-items: flex-end; }
    .msg.ai { align-self: flex-start; align-items: flex-start; }
    .msg-bubble { padding: 11px 15px; border-radius: 18px; font-size: 14.5px; line-height: 1.5; }
    .msg.user .msg-bubble { background: linear-gradient(135deg, #4f8cff, #7b5ea7); color: #fff; border-bottom-right-radius: 4px; }
    .msg.ai .msg-bubble { background: rgba(255,255,255,0.07); color: var(--text); border-bottom-left-radius: 4px; border: 1px solid var(--border); }
    .msg-time { font-size: 10px; color: rgba(240,240,248,0.25); padding: 0 4px; }
    .typing-dots { display: flex; gap: 4px; align-items: center; padding: 2px 0; }
    .typing-dots span {
      width: 6px; height: 6px; border-radius: 50%;
      background: rgba(240,240,248,0.35); animation: bounce 1.2s infinite;
    }
    .typing-dots span:nth-child(2) { animation-delay: 0.2s; }
    .typing-dots span:nth-child(3) { animation-delay: 0.4s; }
    @keyframes bounce { 0%, 60%, 100% { transform: translateY(0); } 30% { transform: translateY(-6px); } }

    .chat-input-area {
      padding: 10px 24px;
      padding-bottom: calc(10px + var(--safe-bottom));
      border-top: 1px solid var(--border); flex-shrink: 0;
    }
    .suggest-chips {
      display: flex; gap: 8px; overflow-x: auto; padding-bottom: 8px;
      margin-bottom: 8px; scrollbar-width: none;
    }
    .suggest-chips::-webkit-scrollbar { display: none; }
    .chip {
      white-space: nowrap; padding: 8px 14px; border-radius: 20px; border: none;
      background: rgba(255,255,255,0.07); color: rgba(240,240,248,0.65);
      font-family: 'DM Sans', sans-serif; font-size: 12.5px; cursor: pointer;
      transition: all 0.15s; flex-shrink: 0;
    }
    .chip:active { background: rgba(100,160,255,0.2); color: #7eb8ff; }
    .chat-row { display: flex; gap: 10px; align-items: flex-end; }
    .chat-input {
      flex: 1; background: rgba(255,255,255,0.05); border: 1px solid var(--border);
      border-radius: 16px; padding: 13px 16px;
      color: var(--text); font-family: 'DM Sans', sans-serif; font-size: 15px;
      outline: none; resize: none; max-height: 80px; line-height: 1.4;
      transition: border 0.2s;
    }
    .chat-input::placeholder { color: rgba(240,240,248,0.25); }
    .chat-input:focus { border-color: rgba(100,160,255,0.4); }
    .send-btn {
      width: 48px; height: 48px; border-radius: 14px; border: none;
      background: linear-gradient(135deg, #4f8cff, #7b5ea7);
      color: #fff; cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0; transition: transform 0.15s, opacity 0.2s;
    }
    .send-btn:disabled { opacity: 0.35; cursor: default; }
    .send-btn:not(:disabled):active { transform: scale(0.88); }

    /* ── SPLASH ── */
    .splash {
      position: fixed; inset: 0; z-index: 999;
      background: #0d0d14;
      display: flex; flex-direction: column;
      align-items: center; justify-content: center; gap: 18px;
      animation: splashOut 0.6s ease 2.2s forwards;
    }
    @keyframes splashOut { to { opacity: 0; pointer-events: none; } }
    .splash-logo {
      width: 90px; height: 90px; border-radius: 26px;
      background: linear-gradient(135deg, #1a2a4a, #2a1a4a);
      border: 1px solid rgba(255,255,255,0.1);
      display: flex; align-items: center; justify-content: center;
      font-size: 44px;
      box-shadow: 0 0 60px rgba(100,160,255,0.18), 0 0 0 1px rgba(100,160,255,0.1);
    }
    .splash-name {
      font-family: 'Space Mono', monospace;
      font-size: 32px; font-weight: 700; letter-spacing: -1px;
      background: linear-gradient(135deg, #fff 30%, #7eb8ff 70%);
      -webkit-background-clip: text; -webkit-text-fill-color: transparent;
    }
    .splash-tag { font-size: 14px; color: rgba(240,240,248,0.3); letter-spacing: 0.05em; }
    .splash-dot {
      width: 6px; height: 6px; border-radius: 50%;
      background: linear-gradient(135deg, #4f8cff, #7b5ea7);
      animation: pulse 1s ease infinite;
    }
    @keyframes pulse { 0%, 100% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.6); opacity: 0.5; } }
  `}</style>
);

// ─── Clock Tab ────────────────────────────────────────────────────────────────
const DAYS_SHORT = ["D", "L", "M", "X", "J", "V", "S"];
const initialAlarms = [
  { id: 1, time: "06:30", label: "Buenos días", days: [1, 2, 3, 4, 5], on: true },
  { id: 2, time: "08:00", label: "Reunión diaria", days: [1, 3], on: true },
  { id: 3, time: "22:00", label: "Descanso", days: [0, 1, 2, 3, 4, 5, 6], on: false },
];

function ClockTab() {
  const [now, setNow] = useState(new Date());
  const [alarms, setAlarms] = useState(initialAlarms);
  const [sw, setSw] = useState(0);
  const [swRunning, setSwRunning] = useState(false);
  const swRef = useRef(null);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (swRunning) {
      swRef.current = setInterval(() => setSw((s) => s + 100), 100);
    } else clearInterval(swRef.current);
    return () => clearInterval(swRef.current);
  }, [swRunning]);

  const swDisplay = `${pad(Math.floor(sw / 60000))}:${pad(Math.floor((sw % 60000) / 1000))}.${pad(Math.floor((sw % 1000) / 10))}`;
  const h = now.getHours();
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 || 12;

  return (
    <div className="clock-screen">
      <div className="time-hero">
        <div>
          <span className="time-big">{`${pad(h12)}:${pad(now.getMinutes())}`}</span>
          <span className="time-ampm">{ampm}</span>
        </div>
        <div className="time-date">{fmtDate(now)}</div>
      </div>

      <div className="section-title">Alarmas</div>
      <div className="alarm-list">
        {alarms.map((a) => (
          <div key={a.id} className={`alarm-card ${a.on ? "" : "inactive"}`}>
            <div>
              <div className="alarm-time-display">{a.time}</div>
              <div className="alarm-label">{a.label}</div>
              <div className="alarm-days">
                {DAYS_SHORT.map((d, i) => (
                  <div key={i} className={`day-dot ${a.days.includes(i) ? "on" : ""}`}>{d}</div>
                ))}
              </div>
            </div>
            <button
              className={`toggle ${a.on ? "on" : ""}`}
              onClick={() => setAlarms((prev) => prev.map((x) => x.id === a.id ? { ...x, on: !x.on } : x))}
            />
          </div>
        ))}
      </div>

      <div className="section-title">Cronómetro</div>
      <div className="quick-tools">
        <button className="tool-card" onClick={() => setSwRunning((r) => !r)}>
          <div className="tool-icon">{swRunning ? "⏸" : "▶️"}</div>
          <div className="tool-name">{swRunning ? "Pausar" : "Iniciar"}</div>
          <div className="tool-value">{swDisplay}</div>
        </button>
        <button className="tool-card" onClick={() => { setSw(0); setSwRunning(false); }}>
          <div className="tool-icon">🔄</div>
          <div className="tool-name">Reiniciar</div>
          <div className="tool-value">00:00.00</div>
        </button>
      </div>
    </div>
  );
}

// ─── Tasks Tab ────────────────────────────────────────────────────────────────
const initTasks = [
  { id: 1, text: "Revisar informe del Q1", done: false, priority: "#f472b6", group: "Trabajo" },
  { id: 2, text: "Llamar al cliente @ 15:00", done: false, priority: "#7eb8ff", group: "Trabajo" },
  { id: 3, text: "Comprar víveres", done: true, priority: "#34d399", group: "Personal" },
  { id: 4, text: "Ejercicio 30 min", done: false, priority: "#34d399", group: "Personal" },
];

function TasksTab() {
  const [tasks, setTasks] = useState(initTasks);
  const [input, setInput] = useState("");

  const toggle = (id) => setTasks((prev) => prev.map((t) => t.id === id ? { ...t, done: !t.done } : t));
  const add = () => {
    if (!input.trim()) return;
    setTasks((prev) => [{ id: Date.now(), text: input.trim(), done: false, priority: "#7eb8ff", group: "Personal" }, ...prev]);
    setInput("");
  };

  const grouped = tasks.reduce((acc, t) => { (acc[t.group] = acc[t.group] || []).push(t); return acc; }, {});
  const done = tasks.filter((t) => t.done).length;

  return (
    <div className="tasks-screen">
      <div style={{ marginBottom: 4 }}>
        <div className="tasks-headline">Mis Tareas</div>
        <div className="tasks-sub">{done} de {tasks.length} completadas</div>
      </div>

      <div className="add-task-row">
        <input
          className="add-input" placeholder="Nueva tarea…"
          value={input} onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && add()}
        />
        <button className="add-btn" onClick={add}>+</button>
      </div>

      {Object.entries(grouped).map(([group, items]) => (
        <div key={group} className="task-group">
          <div className="task-group-label">{group}</div>
          <div className="task-list">
            {items.map((t) => (
              <div key={t.id} className={`task-item ${t.done ? "done" : ""}`} onClick={() => toggle(t.id)}>
                <div className="task-priority" style={{ background: t.priority }} />
                <div className="task-check">
                  {t.done && (
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                      <path d="M2 6l3 3 5-5" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" />
                    </svg>
                  )}
                </div>
                <div className="task-text">{t.text}</div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Assistant Tab ────────────────────────────────────────────────────────────
const SUGGESTIONS = ["¿Qué tareas tengo?", "Resume mi día", "Pon alarma 7am", "Prioriza mis tareas", "¿Cuántas completé?"];

function timeNow() {
  const d = new Date();
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const SYSTEM_PROMPT = `Eres Flow AI, el asistente inteligente integrado en FlowClock — una app móvil que fusiona reloj, alarmas y gestor de tareas.
Eres amigable, conciso y útil. Respondes siempre en español.
El usuario tiene estas tareas: revisar informe Q1 (pendiente), llamar cliente 15:00 (pendiente), comprar víveres (completada), ejercicio 30 min (pendiente).
Puedes ayudar a organizar el tiempo, recordar tareas, sugerir prioridades y responder preguntas sobre su día.`;

function AssistantTab() {
  const [messages, setMessages] = useState([
    { role: "ai", text: "Hola 👋 Soy Flow AI. ¿En qué te ayudo hoy?", time: timeNow() },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const endRef = useRef(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, loading]);

  const send = useCallback(async (text) => {
    const msg = text || input.trim();
    if (!msg || loading) return;
    setInput("");
    const userMsg = { role: "user", text: msg, time: timeNow() };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);
    try {
      const history = [...messages, userMsg].map((m) => ({
        role: m.role === "ai" ? "assistant" : "user",
        content: m.text,
      }));
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 400,
          system: SYSTEM_PROMPT,
          messages: history,
        }),
      });
      const data = await res.json();
      const reply = data.content?.[0]?.text || "Lo siento, no pude procesar eso.";
      setMessages((prev) => [...prev, { role: "ai", text: reply, time: timeNow() }]);
    } catch {
      setMessages((prev) => [...prev, { role: "ai", text: "Error de conexión. Revisa tu internet.", time: timeNow() }]);
    } finally {
      setLoading(false);
    }
  }, [input, messages, loading]);

  return (
    <div className="assistant-screen">
      <div className="assistant-header">
        <div className="flow-badge">
          <div className="flow-orb" />
          Flow AI · Activo
        </div>
        <div className="assistant-title">Tu Asistente</div>
      </div>
      <div className="chat-messages">
        {messages.map((m, i) => (
          <div key={i} className={`msg ${m.role}`}>
            <div className="msg-bubble">{m.text}</div>
            <div className="msg-time">{m.time}</div>
          </div>
        ))}
        {loading && (
          <div className="msg ai">
            <div className="msg-bubble">
              <div className="typing-dots"><span /><span /><span /></div>
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>
      <div className="chat-input-area">
        <div className="suggest-chips">
          {SUGGESTIONS.map((s) => <button key={s} className="chip" onClick={() => send(s)}>{s}</button>)}
        </div>
        <div className="chat-row">
          <textarea
            className="chat-input" placeholder="Pregunta algo…" rows={1}
            value={input} onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
          />
          <button className="send-btn" disabled={!input.trim() || loading} onClick={() => send()}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────
const APP_VERSION = typeof __APP_VERSION__ !== "undefined" ? __APP_VERSION__ : "1.0.1";

export default function App() {
  const [tab, setTab] = useState("clock");
  const [now, setNow] = useState(new Date());
  const [updateSheetOpen, setUpdateSheetOpen] = useState(false);

  useEffect(() => { const t = setInterval(() => setNow(new Date()), 30000); return () => clearInterval(t); }, []);

  return (
    <>
      <GlobalStyles />

      {/* Auto-update controller – mounts once, starts background checks */}
      <UpdateNotifier currentVersion={APP_VERSION} />

      {/* Full update modal (also auto-opens on discovery) */}
      <UpdateSheet open={updateSheetOpen} onClose={() => setUpdateSheetOpen(false)} />

      <div className="splash">
        <div className="splash-logo">⏳</div>
        <div className="splash-name">FlowClock</div>
        <div className="splash-tag">Tu tiempo, en flujo</div>
        <div className="splash-dot" />
      </div>
      <div className="app-shell">
        <div className="app-header">
          <div className="app-header-inner">
            <div className="app-logo">FlowClock</div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              {/* Update badge – only visible when a newer version exists */}
              <UpdateBadge onOpen={() => setUpdateSheetOpen(true)} />
              <div className="header-time">
                {pad(now.getHours())}:{pad(now.getMinutes())}
              </div>
            </div>
          </div>
        </div>
        <div className="content-area">
          {tab === "clock" && <ClockTab />}
          {tab === "tasks" && <TasksTab />}
          {tab === "assistant" && <AssistantTab />}
        </div>
        <nav className="nav-bar">
          {TABS.map((t) => (
            <button key={t} className={`nav-btn ${tab === t ? "active" : ""}`} onClick={() => setTab(t)}>
              {ICONS[t]}
              <span>{t === "clock" ? "Reloj" : t === "tasks" ? "Tareas" : "Flow AI"}</span>
            </button>
          ))}
        </nav>
      </div>
    </>
  );
}
