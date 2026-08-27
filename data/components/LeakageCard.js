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

    const currentSens = state.coilLeakSensitivity || 3;
    const customThreshold = state.coilLeakThreshold || 3;
    const customDebounce = state.coilLeakDebounceMs !== undefined ? Number(state.coilLeakDebounceMs).toFixed(1) : "1.0";

    const sensLabels = [
        { id: 1, name: "1: ULTRA", desc: "Batas Bawah: Peka Mikro Leak (0.2ms/1 Arc)" },
        { id: 2, name: "2: TINGGI", desc: "Peka Tinggi: Retak Resin (0.5ms/2 Arcs)" },
        { id: 3, name: "3: STANDAR", desc: "Standar: Redam Radiasi Udara (1.0ms/3 Arcs)" },
        { id: 4, name: "4: KEBAL", desc: "Batas Atas: Celah Busi Langsung (1.5ms/5 Arcs)" },
        { id: 5, name: "5: CUSTOM", desc: "Setel Bebas Manual (0.1-3.0ms / 1-10 Arcs)" }
    ];

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

            <!-- Sensitivity Selection Bar -->
            <div style="margin-top: 12px; padding: 10px 12px; background: rgba(0,0,0,0.25); border: 1px solid var(--border-sharp); border-radius: 4px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; flex-wrap: wrap; gap: 6px;">
                    <span style="font-size: 0.75rem; font-weight: bold; color: var(--text-muted); text-transform: uppercase;">
                        🎯 PROBE SENSITIVITY FILTER (KEPEKAAN)
                    </span>
                    <span style="font-size: 0.75rem; color: var(--neon-cyan, #00f0ff); font-weight: bold;">
                        ${sensLabels.find(s => s.id === currentSens)?.desc || ""}
                    </span>
                </div>
                <div style="display: grid; grid-template-columns: repeat(5, 1fr); gap: 6px;">
                    ${sensLabels.map(s => html`
                        <button
                            class="btn ${currentSens === s.id ? 'btn-active' : ''}"
                            style="padding: 6px 2px; font-size: 0.72rem; font-weight: bold; text-align: center; border-color: ${currentSens === s.id ? 'var(--neon-green)' : 'var(--border-sharp)'}; background: ${currentSens === s.id ? 'rgba(0, 255, 102, 0.15)' : 'transparent'}; color: ${currentSens === s.id ? 'var(--neon-green)' : 'var(--text-muted)'};"
                            onClick=${() => sendAction('setLeakSensitivity', s.id)}
                            disabled=${!state.connected}
                        >
                            ${s.name}
                        </button>
                    `)}
                </div>

                <!-- Custom Sensitivity Controls (Visible when CUSTOM is selected or active) -->
                ${currentSens === 5 ? html`
                    <div style="margin-top: 10px; padding-top: 10px; border-top: 1px dashed var(--border-sharp); display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                        <div>
                            <div style="display: flex; justify-content: space-between; font-size: 0.72rem; color: var(--text-muted); margin-bottom: 4px;">
                                <span>AMBANG TRIGGER (HITS):</span>
                                <strong style="color: var(--neon-yellow);">${customThreshold} Arcs</strong>
                            </div>
                            <input 
                                type="range" 
                                min="1" 
                                max="10" 
                                step="1"
                                value=${customThreshold} 
                                style="width: 100%; accent-color: var(--neon-yellow);"
                                onInput=${(e) => sendAction('setLeakThreshold', parseInt(e.target.value))}
                                disabled=${!state.connected}
                            />
                        </div>

                        <div>
                            <div style="display: flex; justify-content: space-between; font-size: 0.72rem; color: var(--text-muted); margin-bottom: 4px;">
                                <span>FILTER WAKTU (DEBOUNCE):</span>
                                <strong style="color: var(--neon-cyan);">${customDebounce} ms</strong>
                            </div>
                            <input 
                                type="range" 
                                min="0.1" 
                                max="3.0" 
                                step="0.1"
                                value=${customDebounce} 
                                style="width: 100%; accent-color: var(--neon-cyan);"
                                onInput=${(e) => sendAction('setLeakDebounce', parseFloat(e.target.value))}
                                disabled=${!state.connected}
                            />
                        </div>
                    </div>
                ` : ''}
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
                💡 <strong>Batas Ukur:</strong> Batas bawah (1: ULTRA) sanggup menangkap kebocoran mikro saat koil hidup (diam saat koil OFF). Batas atas (4: KEBAL) hanya bunyi jika ditempelkan langsung ke celah busi.
            </div>
        </div>
    `;
}
