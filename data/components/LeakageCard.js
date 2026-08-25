import { html } from '../preact.js';

export function LeakageCard({ state, sendAction }) {
    const isLeaking = state.coilLeakDetected;
    const count = state.coilLeakCount || 0;
    const rate = state.coilLeakRate || 0;
    const severity = state.coilLeakSeverity || (count === 0 ? "PERFECT (0 LEAK)" : "MICRO-LEAKAGE");

    let cardColor = "var(--neon-green)";
    let badgeText = severity;
    let statusText = "NO BODY LEAKAGE DETECTED (INSULATION PERFECT)";

    if (severity.includes("SEVERE") || rate > 50) {
        cardColor = "var(--neon-red)";
        badgeText = "🚨 CRITICAL: " + severity;
        statusText = "SEVERE HIGH-VOLTAGE BREAKDOWN DETECTED (REPLACE COIL)!";
    } else if (severity.includes("MEDIUM") || rate > 10) {
        cardColor = "var(--neon-orange)";
        badgeText = "⚠️ CAUTION: " + severity;
        statusText = "MEDIUM ARCING / INSULATION DEGRADATION DETECTED";
    } else if (severity.includes("MICRO") || rate > 0 || count > 0) {
        cardColor = "var(--neon-yellow, #ffcc00)";
        badgeText = "⚡ WARNING: " + severity;
        statusText = "MICRO-LEAKAGE (CORONA DISCHARGE / HAIRLINE CRACK DETECTED)";
    }

    return html`
        <div class="panel" style="margin-top: var(--space-md); grid-column: 1 / -1; border-color: ${cardColor}; transition: border-color 0.2s;">
            <div class="panel-header" style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border-sharp); padding-bottom: 8px; flex-wrap: wrap; gap: 8px;">
                <span style="font-weight: 700; letter-spacing: 0.05em; color: ${cardColor};">
                    ⚡ BODY INSULATION & HIGH-VOLTAGE LEAKAGE DETECTOR (PIN 36)
                </span>
                <span class="status-badge" style="border-color: ${cardColor}; color: ${cardColor}; font-weight: bold;">
                    ${badgeText}
                </span>
            </div>

            <!-- Real-time Live Alert Banner -->
            <div style="margin-top: 12px; padding: 10px 14px; background: ${isLeaking ? 'rgba(255, 45, 85, 0.15)' : 'rgba(255, 255, 255, 0.02)'}; border: 1px solid ${cardColor}; border-radius: 4px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;">
                <div style="font-size: 0.9rem; font-weight: bold; color: ${cardColor};">
                    ${statusText}
                </div>
                <div style="font-size: 0.8rem; color: var(--text-muted);">
                    BUZZER ALARM: ${state.isRunning ? (isLeaking ? 'BEEPING 🔊' : 'STANDBY') : 'MUTED (RUN OFF)'}
                </div>
            </div>

            <!-- Stats Grid -->
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 12px; margin-top: var(--space-md);">
                <div style="background: rgba(255,255,255,0.03); border: 1px solid var(--border-sharp); border-radius: 4px; padding: 12px; text-align: center;">
                    <div style="font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase;">TOTAL LEAK ARCS</div>
                    <div style="font-size: 1.8rem; font-weight: 700; color: ${count > 0 ? 'var(--neon-red)' : 'var(--neon-green)'}; margin-top: 4px;">
                        ${count}
                    </div>
                </div>

                <div style="background: rgba(255,255,255,0.03); border: 1px solid var(--border-sharp); border-radius: 4px; padding: 12px; text-align: center;">
                    <div style="font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase;">LEAKAGE RATE</div>
                    <div style="font-size: 1.8rem; font-weight: 700; color: ${rate > 0 ? 'var(--neon-red)' : 'var(--text-primary)'}; margin-top: 4px;">
                        ${rate} <span style="font-size: 0.9rem; font-weight: normal; color: var(--text-muted);">Arcs/s</span>
                    </div>
                </div>

                <div style="background: rgba(255,255,255,0.03); border: 1px solid var(--border-sharp); border-radius: 4px; padding: 12px; display: flex; flex-direction: column; justify-content: center; align-items: center;">
                    <button 
                        class="btn"
                        style="padding: 10px 16px; font-size: 0.8rem; font-weight: bold; width: 100%; border-color: var(--border-sharp);"
                        onClick=${() => sendAction('resetLeakCounter')}
                        disabled=${!state.connected}
                    >
                        RESET LEAK COUNTER
                    </button>
                </div>
            </div>

            <!-- Testing Guide -->
            <div style="margin-top: 12px; font-size: 0.8rem; color: var(--text-muted); line-height: 1.5; border-top: 1px dashed var(--border-sharp); padding-top: 8px;">
                💡 <strong>Cara Pakai:</strong> Tempelkan jarum Probe Deteksi (Pin 36) dan usapkan ke seluruh permukaan bodi plastik, selongsong karet (boot), dan leher koil saat koil dihidupkan. Jika buzzer berbunyi dan indikator di atas menyala merah, maka titik tersebut bocor/retak.
            </div>
        </div>
    `;
}
