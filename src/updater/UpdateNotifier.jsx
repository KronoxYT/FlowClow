import { useState, useEffect, useCallback } from 'react';
import autoUpdater from './autoUpdater.js';

// ── CSS injected once ─────────────────────────────────────────────────────────
const CSS = `
.upd-badge {
  display: inline-flex; align-items: center; gap: 5px;
  padding: 4px 10px; border-radius: 20px;
  background: rgba(79,140,255,0.15);
  border: 1px solid rgba(79,140,255,0.3);
  color: #7eb8ff; font-size: 11px; font-weight: 600;
  cursor: pointer; transition: background 0.2s, transform 0.15s;
  letter-spacing: 0.02em; white-space: nowrap;
}
.upd-badge:hover  { background: rgba(79,140,255,0.25); }
.upd-badge:active { transform: scale(0.94); }
.upd-badge-dot {
  width: 5px; height: 5px; border-radius: 50%;
  background: #4f8cff; animation: updPulse 1.6s ease infinite;
}
@keyframes updPulse {
  0%,100% { opacity:1; transform:scale(1); }
  50%      { opacity:0.4; transform:scale(0.6); }
}

/* ── OVERLAY ── */
.upd-overlay {
  position: fixed; inset: 0; z-index: 9999;
  background: rgba(8,8,16,0.75);
  backdrop-filter: blur(8px);
  display: flex; align-items: flex-end; justify-content: center;
  padding: 0 0 env(safe-area-inset-bottom, 20px);
  animation: updFadeIn 0.22s ease;
}
@keyframes updFadeIn { from { opacity:0; } to { opacity:1; } }

/* ── SHEET ── */
.upd-sheet {
  width: 100%; max-width: 480px;
  background: #0f0f1c;
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 28px 28px 0 0;
  padding: 0 0 env(safe-area-inset-bottom, 16px);
  animation: updSlideUp 0.28s cubic-bezier(0.34,1.2,0.64,1);
  overflow: hidden;
}
@keyframes updSlideUp {
  from { transform: translateY(100%); opacity:0.6; }
  to   { transform: translateY(0);    opacity:1; }
}

.upd-handle {
  width: 36px; height: 4px; border-radius: 2px;
  background: rgba(255,255,255,0.12);
  margin: 12px auto 0;
}

.upd-body { padding: 20px 24px 24px; }

/* ── VERSION HEADER ── */
.upd-ver-row {
  display: flex; align-items: center; gap: 14px; margin-bottom: 20px;
}
.upd-app-icon {
  width: 56px; height: 56px; border-radius: 16px; flex-shrink: 0;
  background: linear-gradient(145deg, #1a2240, #1e1040);
  border: 1px solid rgba(79,140,255,0.2);
  display: flex; align-items: center; justify-content: center;
  font-size: 26px;
}
.upd-ver-title { font-size: 18px; font-weight: 700; margin-bottom: 3px; }
.upd-ver-sub   { font-size: 13px; color: rgba(240,240,248,0.45); }

.upd-ver-chips { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 18px; }
.upd-chip {
  padding: 5px 11px; border-radius: 100px;
  font-size: 12px; font-weight: 600;
}
.upd-chip-old { background: rgba(255,255,255,0.06); color: rgba(240,240,248,0.4); }
.upd-chip-new { background: rgba(79,140,255,0.15); border: 1px solid rgba(79,140,255,0.3); color: #7eb8ff; }
.upd-chip-size{ background: rgba(52,211,153,0.1); border: 1px solid rgba(52,211,153,0.2); color: #34d399; }

/* ── NOTES ── */
.upd-notes {
  background: rgba(255,255,255,0.03);
  border: 1px solid rgba(255,255,255,0.06);
  border-radius: 14px;
  padding: 12px 14px;
  font-size: 13px; color: rgba(240,240,248,0.55); line-height: 1.6;
  max-height: 90px; overflow-y: auto; margin-bottom: 20px;
  scrollbar-width: none;
}
.upd-notes::-webkit-scrollbar { display: none; }

/* ── BUTTONS ── */
.upd-btn-install {
  width: 100%; padding: 15px;
  border: none; border-radius: 16px; cursor: pointer;
  background: linear-gradient(135deg, #2a4aaa 0%, #3a2a8a 100%);
  color: #fff; font-family: inherit; font-size: 15px; font-weight: 700;
  display: flex; align-items: center; justify-content: center; gap: 8px;
  transition: transform 0.15s, box-shadow 0.2s;
  box-shadow: 0 4px 20px rgba(79,140,255,0.25);
  margin-bottom: 10px;
}
.upd-btn-install:active { transform: scale(0.97); }
.upd-btn-install:disabled { opacity: 0.5; cursor: not-allowed; }

.upd-btn-install.installing {
  background: linear-gradient(135deg, #1a6640 0%, #0d4428 100%);
  box-shadow: 0 4px 20px rgba(52,211,153,0.2);
}

.upd-btn-snooze {
  width: 100%; padding: 12px;
  border: 1px solid rgba(255,255,255,0.07); border-radius: 16px; cursor: pointer;
  background: transparent; color: rgba(240,240,248,0.45);
  font-family: inherit; font-size: 13px; font-weight: 500;
  transition: color 0.2s, border-color 0.2s;
}
.upd-btn-snooze:hover { color: rgba(240,240,248,0.7); border-color: rgba(255,255,255,0.14); }

/* ── PROGRESS BAR (indeterminate while "installing") ── */
.upd-progress-bar {
  height: 3px; border-radius: 2px;
  background: rgba(255,255,255,0.07);
  margin-bottom: 16px; overflow: hidden;
}
.upd-progress-fill {
  height: 100%; border-radius: 2px;
  background: linear-gradient(90deg, #4f8cff, #a78bfa);
  animation: updProgress 1.4s ease infinite;
}
@keyframes updProgress {
  0%   { transform: translateX(-100%) scaleX(0.5); }
  50%  { transform: translateX(0%)    scaleX(1); }
  100% { transform: translateX(100%)  scaleX(0.5); }
}

/* ── CHECKING STATE ── */
.upd-checking {
  text-align: center; padding: 28px 0 8px;
  color: rgba(240,240,248,0.4); font-size: 14px;
}
.upd-spin {
  width: 28px; height: 28px; border-radius: 50%;
  border: 2px solid rgba(79,140,255,0.2);
  border-top-color: #4f8cff;
  animation: updSpin 0.8s linear infinite;
  margin: 0 auto 12px;
}
@keyframes updSpin { to { transform: rotate(360deg); } }
`;

let cssInjected = false;
function injectCSS() {
  if (cssInjected) return;
  const s = document.createElement('style');
  s.textContent = CSS;
  document.head.appendChild(s);
  cssInjected = true;
}

// ── Format helpers ────────────────────────────────────────────────────────────
function fmtSize(bytes) {
  if (!bytes) return '';
  return bytes >= 1024 * 1024
    ? `${(bytes / 1024 / 1024).toFixed(1)} MB`
    : `${Math.round(bytes / 1024)} KB`;
}

function cleanNotes(body) {
  if (!body) return '';
  return body
    .replace(/## .*\n?/g, '')
    .replace(/###? .*\n?/g, '')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\[(.*?)\]\(.*?\)/g, '$1')
    .trim()
    .slice(0, 280);
}

// ── Hook ──────────────────────────────────────────────────────────────────────
export function useAutoUpdater() {
  const [state, setState] = useState(autoUpdater.state);

  useEffect(() => {
    injectCSS();
    const handler = (e) => setState({ ...e.detail });
    autoUpdater.addEventListener('change', handler);
    return () => autoUpdater.removeEventListener('change', handler);
  }, []);

  return state;
}

// ── Badge shown in header ────────────────────────────────────────────────────
export function UpdateBadge({ onOpen }) {
  const { status } = useAutoUpdater();
  if (status !== 'available') return null;
  return (
    <button className="upd-badge" onClick={onOpen} aria-label="Actualización disponible">
      <span className="upd-badge-dot" />
      Actualizar
    </button>
  );
}

// ── Full update sheet / modal ────────────────────────────────────────────────
export function UpdateSheet({ open, onClose }) {
  const state = useAutoUpdater();
  const { status, release, apkAsset, currentVersion, error } = state;
  const [installing, setInstalling] = useState(false);

  useEffect(() => {
    if (status !== 'installing') setInstalling(false);
  }, [status]);

  const handleInstall = useCallback(() => {
    setInstalling(true);
    autoUpdater.install();
    setTimeout(() => {
      setInstalling(false);
      onClose?.();
    }, 3000);
  }, [onClose]);

  const handleSnooze = useCallback(() => {
    autoUpdater.snooze(24);
    onClose?.();
  }, [onClose]);

  if (!open) return null;

  const isChecking = status === 'checking';
  const isAvail   = status === 'available';
  const isError   = status === 'error';
  const isUpToDate = status === 'up-to-date';

  const newVer = release?.tag_name || '—';
  const notes  = cleanNotes(release?.body);
  const size   = fmtSize(apkAsset?.size);

  return (
    <div className="upd-overlay" onClick={(e) => e.target === e.currentTarget && onClose?.()}>
      <div className="upd-sheet" role="dialog" aria-modal="true" aria-label="Actualización de FlowClock">
        <div className="upd-handle" />
        <div className="upd-body">

          {isChecking && (
            <div className="upd-checking">
              <div className="upd-spin" />
              Buscando actualizaciones…
            </div>
          )}

          {isUpToDate && (
            <div style={{ textAlign: 'center', padding: '20px 0 8px' }}>
              <div style={{ fontSize: 36, marginBottom: 10 }}>✅</div>
              <div style={{ fontWeight: 700, marginBottom: 6 }}>Tienes la última versión</div>
              <div style={{ fontSize: 13, color: 'rgba(240,240,248,0.4)', marginBottom: 20 }}>
                {currentVersion} — todo actualizado
              </div>
              <button className="upd-btn-snooze" onClick={onClose}>Cerrar</button>
            </div>
          )}

          {isError && (
            <div style={{ textAlign: 'center', padding: '16px 0 8px' }}>
              <div style={{ fontSize: 32, marginBottom: 10 }}>⚠️</div>
              <div style={{ fontWeight: 600, marginBottom: 6 }}>No se pudo verificar</div>
              <div style={{ fontSize: 13, color: 'rgba(240,240,248,0.4)', marginBottom: 20 }}>{error}</div>
              <button className="upd-btn-install" onClick={() => autoUpdater.forceCheck()}>
                Reintentar
              </button>
              <button className="upd-btn-snooze" onClick={onClose}>Cancelar</button>
            </div>
          )}

          {isAvail && (
            <>
              <div className="upd-ver-row">
                <div className="upd-app-icon">⏱</div>
                <div>
                  <div className="upd-ver-title">Nueva versión disponible</div>
                  <div className="upd-ver-sub">FlowClock {newVer}</div>
                </div>
              </div>

              <div className="upd-ver-chips">
                <span className="upd-chip upd-chip-old">Actual: {currentVersion}</span>
                <span className="upd-chip upd-chip-new">Nueva: {newVer}</span>
                {size && <span className="upd-chip upd-chip-size">{size}</span>}
              </div>

              {notes ? (
                <div className="upd-notes">{notes}</div>
              ) : null}

              {installing && (
                <div className="upd-progress-bar">
                  <div className="upd-progress-fill" />
                </div>
              )}

              <button
                className={`upd-btn-install${installing ? ' installing' : ''}`}
                onClick={handleInstall}
                disabled={installing}
              >
                {installing ? (
                  <>⬇️ Abriendo descarga…</>
                ) : (
                  <>⬇️ Instalar {newVer}</>
                )}
              </button>

              <button className="upd-btn-snooze" onClick={handleSnooze}>
                Recordar en 24 horas
              </button>
            </>
          )}

        </div>
      </div>
    </div>
  );
}

// ── Combined controller component (mount this once in App) ───────────────────
export default function UpdateNotifier({ currentVersion }) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const { status } = useAutoUpdater();

  useEffect(() => {
    autoUpdater.start(currentVersion);
  }, [currentVersion]);

  // Auto-open sheet when update is found (only on first detection)
  const prevStatus = useState(null);
  useEffect(() => {
    if (status === 'available' && prevStatus[0] !== 'available') {
      setSheetOpen(true);
    }
    prevStatus[0] = status;
  }, [status]);

  return (
    <>
      <UpdateSheet open={sheetOpen} onClose={() => setSheetOpen(false)} />
    </>
  );
}

export { autoUpdater };
