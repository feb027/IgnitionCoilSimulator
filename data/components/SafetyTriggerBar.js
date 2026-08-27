import { html, useState } from '../preact.js';

export function SafetyTriggerBar({ state, sendAction, label = "IGT TRIGGER", is4Pin = false }) {
    const [isLocked, setIsLocked] = useState(true);
    const [lastTapTime, setLastTapTime] = useState(0);

    const isRunning = state.isRunning;
    const isAutoDiag = state.coilAutoDiagRunning;

    const handleDoubleTap = () => {
        const now = Date.now();
        if (now - lastTapTime < 400) {
            setIsLocked(!isLocked);
        }
        setLastTapTime(now);
    };

    const handleTriggerClick = () => {
        if (!state.connected || isAutoDiag) return;
        if (isRunning) {
            sendAction('toggleRun');
        } else {
            if (isLocked) {
                // Flash or unlock
                setIsLocked(false);
            } else {
                sendAction('toggleRun');
            }
        }
    };

    return html`
        <div class="safety-bottom-bar" style="position: sticky; bottom: 0; left: 0; right: 0; z-index: 999; background: rgba(10, 12, 16, 0.95); backdrop-filter: blur(12px); border-top: 1px solid ${isRunning ? 'var(--neon-red)' : 'var(--border-sharp)'}; padding: 6px 12px; margin-top: 14px; box-shadow: 0 -4px 20px rgba(0,0,0,0.7);">
            <div style="max-width: 1200px; margin: 0 auto; display: flex; align-items: center; justify-content: space-between; gap: 8px;">
                
                <!-- SAFETY LOCK STATUS TOGGLE (KETUK 2x ATAU KLIK TOMBOL) -->
                ${!isRunning ? html`
                    <button
                        class="btn"
                        style="padding: 6px 10px; font-size: 0.72rem; font-weight: bold; border-color: ${isLocked ? 'var(--neon-orange)' : 'var(--neon-green)'}; background: ${isLocked ? 'rgba(255, 149, 0, 0.15)' : 'rgba(0, 255, 102, 0.15)'}; color: ${isLocked ? 'var(--neon-orange)' : 'var(--neon-green)'}; cursor: pointer; white-space: nowrap;"
                        onClick=${() => setIsLocked(!isLocked)}
                        title="Klik untuk Mengunci / Membuka Kunci Trigger"
                    >
                        ${isLocked ? '🔒 TERKUNCI (AMAN)' : '🔓 BUKA KUNCI (SIAP)'}
                    </button>
                ` : html`
                    <span class="status-badge" style="border-color: var(--neon-red); color: var(--neon-red); font-size: 0.72rem; font-weight: bold; animation: pulse 1s infinite;">
                        ⚡ HIGH VOLTAGE
                    </span>
                `}

                <!-- MASTER TRIGGER ON / OFF BUTTON -->
                <div style="flex: 1;" onClick=${handleDoubleTap}>
                    ${isRunning ? html`
                        <button 
                            class="btn is-running"
                            style="width: 100%; padding: 10px; font-size: 0.95rem; font-weight: 900; letter-spacing: 0.05em; background: var(--neon-red); border-color: #ff0044; color: #ffffff; cursor: pointer; box-shadow: 0 0 16px rgba(255, 45, 85, 0.6);"
                            onClick=${handleTriggerClick}
                        >
                            🚨 EMERGENCY STOP (MATIKAN SEGERA)
                        </button>
                    ` : (isLocked ? html`
                        <button 
                            class="btn"
                            style="width: 100%; padding: 10px; font-size: 0.82rem; font-weight: 700; background: rgba(255, 255, 255, 0.03); border: 1px dashed var(--neon-orange); color: var(--neon-orange); cursor: pointer;"
                            onClick=${handleTriggerClick}
                        >
                            🛡️ TRIGGER TERKUNCI (KLIK / KETUK 2x UNTUK BUKA)
                        </button>
                    ` : html`
                        <button 
                            class="btn"
                            style="width: 100%; padding: 10px; font-size: 0.92rem; font-weight: 800; letter-spacing: 0.05em; border-color: var(--neon-green); background: rgba(0, 255, 102, 0.15); color: var(--neon-green); cursor: pointer; box-shadow: 0 0 10px rgba(0, 255, 102, 0.25);"
                            onClick=${handleTriggerClick}
                            disabled=${!state.connected || isAutoDiag}
                        >
                            ${state.runMode === 2 
                                ? '⚡ FIRE SINGLE PULSE (TRIGGER)' 
                                : (state.runMode === 1 
                                    ? '⚡ FIRE BURST (10x PULSES)' 
                                    : `⚡ ${label}: START (FIRE COIL)`)}
                        </button>
                    `)}
                </div>

            </div>
        </div>
    `;
}
