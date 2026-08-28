import { html, useState, useEffect } from '../preact.js';

export function SafetyTriggerBar({ state, sendAction, label = "IGT TRIGGER", is4Pin = false, isLocked: extLocked, onToggleLock: extToggleLock }) {
    const isRunning = state.isRunning;
    const isAutoDiag = state.coilAutoDiagRunning;

    const [isVisible, setIsVisible] = useState(false);
    const [localLocked, setLocalLocked] = useState(true);

    const isLocked = extLocked !== undefined ? extLocked : localLocked;
    const handleToggleLock = (e) => {
        if (e) e.stopPropagation();
        if (extToggleLock) extToggleLock();
        else setLocalLocked(!localLocked);
    };

    useEffect(() => {
        if (isRunning) {
            setIsVisible(true);
            if (extToggleLock && isLocked) extToggleLock();
            else setLocalLocked(false);
        }
    }, [isRunning]);

    let lastTap = 0;
    const handleBottomBarTap = (e) => {
        const now = Date.now();
        if (now - lastTap < 380) {
            setIsVisible(!isVisible);
        }
        lastTap = now;
    };

    const handleTriggerClick = (e) => {
        e.stopPropagation();
        if (!state.connected || isAutoDiag) return;
        
        if (isRunning) {
            sendAction('toggleRun');
        } else {
            if (isLocked) {
                if (extToggleLock) extToggleLock();
                else setLocalLocked(false);
            }
            sendAction('toggleRun');
        }
    };

    return html`
        <div 
            class="safety-dock-fixed" 
            style="position: fixed; bottom: 0; left: 0; right: 0; z-index: 10000; background: rgba(8, 10, 14, 0.96); backdrop-filter: blur(14px); border-top: 1px solid ${isRunning ? 'var(--neon-red)' : (isVisible ? 'var(--border-sharp)' : 'rgba(255,255,255,0.08)')}; box-shadow: 0 -4px 28px rgba(0,0,0,0.9); user-select: none; transition: all 0.25s ease;"
            onClick=${handleBottomBarTap}
        >
            ${!isVisible && !isRunning ? html`
                <div style="padding: 6px 14px; display: flex; justify-content: space-between; align-items: center; cursor: pointer;">
                    <div style="font-size: 0.72rem; font-weight: 700; color: var(--neon-cyan); display: flex; align-items: center; gap: 6px;">
                        <span>⚡ DOCK TRIGGER TERSEMBUNYI</span>
                        <span style="font-size: 0.65rem; color: var(--text-muted); font-weight: normal;">(Ketuk 2x di sini untuk memunculkan)</span>
                    </div>
                    <span class="status-badge" style="font-size: 0.65rem; border-color: ${isLocked ? 'var(--neon-orange)' : 'var(--neon-green)'}; color: ${isLocked ? 'var(--neon-orange)' : 'var(--neon-green)'}; padding: 1px 6px;">
                        ${isLocked ? '🔒 KUNCI AKTIF' : '🔓 TERBUKA'}
                    </span>
                </div>
            ` : html`
                <div style="max-width: 1200px; margin: 0 auto; padding: 8px 12px; display: flex; align-items: stretch; gap: 8px;">
                    ${!isRunning ? html`
                        <button
                            class="btn"
                            style="padding: 10px 14px; font-size: 0.8rem; font-weight: bold; border-color: ${isLocked ? 'var(--neon-orange)' : 'var(--neon-green)'}; background: ${isLocked ? 'rgba(255, 149, 0, 0.15)' : 'rgba(0, 255, 102, 0.15)'}; color: ${isLocked ? 'var(--neon-orange)' : 'var(--neon-green)'}; cursor: pointer; white-space: nowrap; display: flex; align-items: center; gap: 4px;"
                            onClick=${handleToggleLock}
                            title="Klik untuk Mengunci / Membuka Kunci Trigger"
                        >
                            ${isLocked ? '🔒 TERKUNCI' : '🔓 BUKA KUNCI'}
                        </button>
                    ` : html`
                        <span class="status-badge" style="border-color: var(--neon-red); color: var(--neon-red); font-size: 0.75rem; font-weight: bold; display: flex; align-items: center; padding: 0 10px;">
                            ⚡ HIGH VOLTAGE
                        </span>
                    `}

                    <button 
                        class="btn ${isRunning ? 'is-running' : ''}"
                        style="flex: 1; padding: 12px; font-size: 0.95rem; font-weight: 900; letter-spacing: 0.05em; border-color: ${isRunning ? 'var(--neon-red)' : (isLocked ? 'var(--border-sharp)' : 'var(--neon-green)')}; background: ${isRunning ? 'var(--neon-red)' : (isLocked ? 'rgba(255,255,255,0.03)' : 'rgba(0, 255, 102, 0.15)')}; color: ${isRunning ? '#ffffff' : (isLocked ? 'var(--text-muted)' : 'var(--neon-green)')}; cursor: ${isLocked && !isRunning ? 'not-allowed' : 'pointer'}; box-shadow: ${isRunning ? '0 0 18px rgba(255, 45, 85, 0.7)' : 'none'}; opacity: ${isLocked && !isRunning ? '0.7' : '1'};"
                        onClick=${handleTriggerClick}
                        disabled=${!state.connected || isAutoDiag}
                    >
                        ${isRunning 
                            ? '🚨 EMERGENCY STOP (OFF) - KLIK UNTUK MATIKAN' 
                            : (isLocked 
                                ? '🛡️ TRIGGER TERKUNCI (BUKA KUNCI DULU SEBELUM MENEKAN)' 
                                : (state.runMode === 2 
                                    ? '⚡ FIRE SINGLE PULSE' 
                                    : (state.runMode === 1 
                                        ? '⚡ FIRE BURST (10x PULSES)' 
                                        : `⚡ ${label}: OFF (STANDBY - KLIK UNTUK HIDUPKAN)`)))}
                    </button>

                    ${!isRunning ? html`
                        <button
                            class="btn"
                            style="padding: 10px 10px; font-size: 0.75rem; font-weight: bold; background: rgba(255,255,255,0.05); color: var(--text-muted); cursor: pointer;"
                            onClick=${(e) => { e.stopPropagation(); setIsVisible(false); }}
                            title="Sembunyikan Menu Trigger"
                        >
                            ✕
                        </button>
                    ` : ''}
                </div>
            `}
        </div>
    `;
}
