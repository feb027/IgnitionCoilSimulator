import { html, useState, useEffect } from '../preact.js';

export function SafetyTriggerBar({ state, sendAction, label = "IGT TRIGGER", is4Pin = false }) {
    const [isLocked, setIsLocked] = useState(true);
    const isRunning = state.isRunning;
    const isAutoDiag = state.coilAutoDiagRunning;

    // GLOBAL DOUBLE-TAP / DOUBLE-CLICK LISTENER ANYWHERE ON SCREEN
    useEffect(() => {
        let lastTap = 0;
        const handleGlobalDoubleTap = (e) => {
            // Ignore if user is clicking sliders/inputs or specific buttons
            if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT')) return;
            const now = Date.now();
            if (now - lastTap < 380) {
                setIsLocked(prev => !prev);
            }
            lastTap = now;
        };

        window.addEventListener('click', handleGlobalDoubleTap);
        window.addEventListener('touchend', handleGlobalDoubleTap);
        return () => {
            window.removeEventListener('click', handleGlobalDoubleTap);
            window.removeEventListener('touchend', handleGlobalDoubleTap);
        };
    }, []);

    const handleTriggerClick = (e) => {
        e.stopPropagation();
        if (!state.connected || isAutoDiag) return;
        
        if (isRunning) {
            // Instant emergency stop is ALWAYS allowed
            sendAction('toggleRun');
        } else {
            // If locked, do NOT fire trigger! User must unlock first
            if (isLocked) {
                // Flash unlock message or unlock directly if desired
                setIsLocked(false);
            } else {
                sendAction('toggleRun');
            }
        }
    };

    const toggleLockManual = (e) => {
        e.stopPropagation();
        setIsLocked(!isLocked);
    };

    return html`
        <div class="safety-dock-bottom" style="position: sticky; bottom: 0; left: 0; right: 0; z-index: 1000; background: rgba(10, 12, 16, 0.95); backdrop-filter: blur(12px); border-top: 1px solid ${isRunning ? 'var(--neon-red)' : (isLocked ? 'var(--border-sharp)' : 'var(--neon-green)')}; padding: 8px 12px; margin-top: 12px; box-shadow: 0 -4px 24px rgba(0,0,0,0.85);">
            <div style="max-width: 1200px; margin: 0 auto; display: flex; align-items: stretch; gap: 8px;">
                
                <!-- TOMBOL INDIKATOR KUNCI PENGAMAN (BISA DIKLIK ATAU KETUK LAYAR 2X) -->
                ${!isRunning ? html`
                    <button
                        class="btn"
                        style="padding: 10px 12px; font-size: 0.8rem; font-weight: bold; border-color: ${isLocked ? 'var(--neon-orange)' : 'var(--neon-green)'}; background: ${isLocked ? 'rgba(255, 149, 0, 0.15)' : 'rgba(0, 255, 102, 0.15)'}; color: ${isLocked ? 'var(--neon-orange)' : 'var(--neon-green)'}; cursor: pointer; white-space: nowrap; display: flex; align-items: center; gap: 4px;"
                        onClick=${toggleLockManual}
                        title="Ketuk 2x di layar atau klik tombol ini untuk Mengunci / Membuka Kunci"
                    >
                        ${isLocked ? '🔒 TERKUNCI' : '🔓 TERBUKA'}
                    </button>
                ` : html`
                    <span class="status-badge" style="border-color: var(--neon-red); color: var(--neon-red); font-size: 0.75rem; font-weight: bold; display: flex; align-items: center; padding: 0 10px;">
                        ⚡ HIGH VOLTAGE
                    </span>
                `}

                <!-- MASTER TRIGGER ON / OFF BUTTON (TAMPILAN ASLI JELAS & TEGAS) -->
                <button 
                    class="btn ${isRunning ? 'is-running' : ''}"
                    style="flex: 1; padding: 12px; font-size: 0.95rem; font-weight: 900; letter-spacing: 0.05em; border-color: ${isRunning ? 'var(--neon-red)' : (isLocked ? 'var(--neon-orange)' : 'var(--neon-green)')}; background: ${isRunning ? 'var(--neon-red)' : (isLocked ? 'rgba(255, 149, 0, 0.08)' : 'rgba(0, 255, 102, 0.15)')}; color: ${isRunning ? '#ffffff' : (isLocked ? 'var(--neon-orange)' : 'var(--neon-green)')}; cursor: pointer; box-shadow: ${isRunning ? '0 0 16px rgba(255, 45, 85, 0.7)' : 'none'};"
                    onClick=${handleTriggerClick}
                    disabled=${!state.connected || isAutoDiag}
                >
                    ${isRunning 
                        ? '🔥 IGT TRIGGER: ON (RUNNING ⚡ - KLIK UNTUK MATIKAN)' 
                        : (isLocked 
                            ? '🛡️ TRIGGER TERKUNCI (KETUK LAYAR 2X / KLIK UNTUK BUKA)' 
                            : (state.runMode === 2 
                                ? '⚡ FIRE SINGLE PULSE' 
                                : (state.runMode === 1 
                                    ? '⚡ FIRE BURST (10x PULSES)' 
                                    : `⚡ ${label}: OFF (STANDBY - KLIK UNTUK HIDUPKAN)`)))}
                </button>

            </div>
        </div>
    `;
}
