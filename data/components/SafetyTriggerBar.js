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

    const handleToggleDock = (e) => {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }
        setIsVisible(!isVisible);
    };

    const handleTriggerClick = (e) => {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }
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
            style="position: fixed; bottom: 0; left: 0; right: 0; z-index: 10000; background: rgba(8, 10, 14, 0.97); backdrop-filter: blur(16px); border-top: 2px solid ${isRunning ? 'var(--neon-red)' : (isVisible ? 'var(--neon-cyan)' : 'rgba(0, 212, 255, 0.4)')}; box-shadow: 0 -4px 30px rgba(0,0,0,0.95); user-select: none; touch-action: none; transition: all 0.2s ease;"
        >
            ${!isVisible && !isRunning ? html`
                <!-- COMPACT BOTTOM STRIP (SINGLE TAP / CLICK TO OPEN - NO SCROLL) -->
                <div 
                    style="padding: 8px 16px; display: flex; justify-content: space-between; align-items: center; cursor: pointer; touch-action: none;"
                    onClick=${handleToggleDock}
                    onTouchStart=${(e) => e.stopPropagation()}
                >
                    <div style="font-size: 0.76rem; font-weight: 800; color: var(--neon-cyan); display: flex; align-items: center; gap: 8px;">
                        <span>⚡ DOCK TRIGGER (KLIK 1x UNTUK MUNCULKAN)</span>
                        <span style="font-size: 0.65rem; color: #aaa; font-weight: normal; background: rgba(255,255,255,0.06); padding: 1px 6px; border-radius: 3px;">👆 Ketuk Di Sini</span>
                    </div>
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <span class="status-badge" style="font-size: 0.68rem; font-weight: 800; border-color: ${isLocked ? 'var(--neon-orange)' : 'var(--neon-green)'}; color: ${isLocked ? 'var(--neon-orange)' : 'var(--neon-green)'}; padding: 2px 8px;">
                            ${isLocked ? '🔒 KUNCI AKTIF' : '🔓 TERBUKA'}
                        </span>
                        <button class="btn" style="padding: 2px 8px; font-size: 0.72rem; font-weight: 900; background: var(--neon-cyan); color: #000; border-color: var(--neon-cyan);">
                            ▲ BUKA
                        </button>
                    </div>
                </div>
            ` : html`
                <!-- FULL TRIGGER DOCK (EXPANDED) -->
                <div 
                    style="max-width: 1200px; margin: 0 auto; padding: 8px 12px; display: flex; align-items: stretch; gap: 8px; touch-action: none;"
                    onTouchStart=${(e) => e.stopPropagation()}
                >
                    ${!isRunning ? html`
                        <button
                            class="btn"
                            style="padding: 10px 14px; font-size: 0.8rem; font-weight: bold; border-color: ${isLocked ? 'var(--neon-orange)' : 'var(--neon-green)'}; background: ${isLocked ? 'rgba(255, 149, 0, 0.15)' : 'rgba(0, 255, 102, 0.15)'}; color: ${isLocked ? 'var(--neon-orange)' : 'var(--neon-green)'}; cursor: pointer; white-space: nowrap; display: flex; align-items: center; gap: 4px; touch-action: none;"
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
                        style="flex: 1; padding: 12px; font-size: 0.95rem; font-weight: 900; letter-spacing: 0.05em; border-color: ${isRunning ? 'var(--neon-red)' : (isLocked ? 'var(--border-sharp)' : 'var(--neon-green)')}; background: ${isRunning ? 'var(--neon-red)' : (isLocked ? 'rgba(255,255,255,0.03)' : 'rgba(0, 255, 102, 0.15)')}; color: ${isRunning ? '#ffffff' : (isLocked ? 'var(--text-muted)' : 'var(--neon-green)')}; cursor: ${isLocked && !isRunning ? 'not-allowed' : 'pointer'}; box-shadow: ${isRunning ? '0 0 18px rgba(255, 45, 85, 0.7)' : 'none'}; opacity: ${isLocked && !isRunning ? '0.7' : '1'}; touch-action: none;"
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
                            style="padding: 10px 14px; font-size: 0.8rem; font-weight: 900; background: rgba(255,255,255,0.08); color: var(--text-muted); border-color: var(--border-sharp); cursor: pointer; display: flex; align-items: center; gap: 4px; touch-action: none;"
                            onClick=${handleToggleDock}
                            title="Sembunyikan Menu Trigger"
                        >
                            ▼ TUTUP
                        </button>
                    ` : ''}
                </div>
            `}
        </div>
    `;
}
