import { html } from '../preact.js';
import { Dial } from './Dial.js';

export function DashboardCoil({ state, sendAction, modeSelector }) {
    const isSweep = state.runMode === 3;
    const isAutoDiag = state.coilAutoDiagRunning;
    const health = (state.coilHealthPercent !== undefined) ? state.coilHealthPercent : 100.0;
    const fired = state.coilFiredCount || 0;
    const igf = state.coilIgfCount || 0;
    const missed = state.coilMissedCount || 0;
    const currentA = state.coilPeakCurrentA ? state.coilPeakCurrentA.toFixed(1) : "0.0";
    const verdict = state.coilDiagVerdict || "READY";

    let healthColor = "var(--neon-green)";
    let healthBadge = "HEALTHY";
    if (state.coilLeakSeverity && state.coilLeakSeverity.includes("SEVERE")) {
        healthColor = "var(--neon-red)";
        healthBadge = "CRITICAL: LEAKING";
    } else if (state.coilLeakSeverity && state.coilLeakSeverity.includes("MEDIUM")) {
        healthColor = "var(--neon-orange)";
        healthBadge = "LEAKAGE WARNING";
    } else if (state.coilLeakDetected || (state.coilLeakCount && state.coilLeakCount > 0)) {
        healthColor = "var(--neon-yellow, #ffe600)";
        healthBadge = "MICRO-LEAK";
    } else if (fired > 20 && health < 90.0) {
        healthColor = "var(--neon-red)";
        healthBadge = "DEFECTIVE / MISFIRE";
    } else if (fired > 20 && health < 99.0) {
        healthColor = "var(--neon-orange)";
        healthBadge = "DEGRADED";
    }

    return html`
        <!-- COMPACT ENGINE SPEED & DWELL TIME CONTROL ROW (SIDE-BY-SIDE) -->
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; grid-column: 1 / -1;">
            <${Dial} 
                compact=${true}
                label=${isAutoDiag ? "AUTO DIAG..." : ((isSweep && state.isRunning) ? "SWEEPING..." : (isSweep ? "TARGET RPM" : "ENGINE SPEED"))}
                value=${(isSweep && state.isRunning) ? state.currentRpm : state.rpm}
                unit="RPM"
                min="0"
                max="16000"
                step=${state.rpmStep || 50}
                onChange=${(val) => sendAction('setRpm', val)}
                disabled=${!state.connected || (isSweep && state.isRunning) || isAutoDiag}
            />
            
            <${Dial} 
                compact=${true}
                label="DWELL TIME"
                value=${state.dwellMs}
                unit="MS"
                min="0.5"
                max="5.0"
                step="0.1"
                subInfo=${"Duty: " + (state.dutyCycle ? state.dutyCycle.toFixed(1) : "0.0") + "%"}
                onChange=${(val) => sendAction('setDwell', val)}
                disabled=${!state.connected || isAutoDiag}
            />
        </div>

        ${modeSelector}
        
        <!-- MASTER RUN BUTTON -->
        <div class="sticky-run-bar">
            <button 
                class="btn btn-run ${state.isRunning ? 'is-running' : ''}"
                onClick=${() => sendAction('toggleRun')}
                disabled=${!state.connected || isAutoDiag}
            >
                ${state.isRunning ? 'COIL TRIGGER: ON' : 'COIL TRIGGER: OFF'}
            </button>
        </div>
        
        <!-- COIL HEALTH & IGF DIAGNOSTIC ANALYZER -->
        <div class="panel" style="margin-top: 10px; grid-column: 1 / -1; border-color: ${healthColor};">
            <div class="panel-header" style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border-sharp); padding-bottom: 6px; margin-bottom: 8px;">
                <span style="font-weight: 700; color: ${healthColor}; font-size: 0.8rem;">
                    ⚡ COIL HEALTH & IGF DIAGNOSTIC ANALYZER
                </span>
                <span class="status-badge" style="border-color: ${healthColor}; color: ${healthColor}; font-size: 0.72rem; padding: 2px 6px;">
                    ${healthBadge}
                </span>
            </div>

            <!-- Telemetry Stats Grid -->
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 8px;">
                <div style="background: rgba(255,255,255,0.03); border: 1px solid var(--border-sharp); border-radius: 4px; padding: 8px; text-align: center;">
                    <div style="font-size: 0.68rem; color: var(--text-muted);">SPARK HEALTH</div>
                    <div style="font-size: 1.4rem; font-weight: 800; color: ${healthColor}; margin-top: 2px;">
                        ${fired > 0 ? health.toFixed(1) + "%" : "--%"}
                    </div>
                </div>

                <div style="background: rgba(255,255,255,0.03); border: 1px solid var(--border-sharp); border-radius: 4px; padding: 8px; text-align: center;">
                    <div style="font-size: 0.68rem; color: var(--text-muted);">FIRED (IGT)</div>
                    <div style="font-size: 1.4rem; font-weight: 800; color: var(--text-primary); margin-top: 2px;">
                        ${fired}
                    </div>
                </div>

                <div style="background: rgba(255,255,255,0.03); border: 1px solid var(--border-sharp); border-radius: 4px; padding: 8px; text-align: center;">
                    <div style="font-size: 0.68rem; color: var(--text-muted);">IGF CONFIRMED</div>
                    <div style="font-size: 1.4rem; font-weight: 800; color: var(--neon-green); margin-top: 2px;">
                        ${igf}
                    </div>
                </div>

                <div style="background: rgba(255,255,255,0.03); border: 1px solid var(--border-sharp); border-radius: 4px; padding: 8px; text-align: center;">
                    <div style="font-size: 0.68rem; color: var(--text-muted);">MISSED SPARKS</div>
                    <div style="font-size: 1.4rem; font-weight: 800; color: ${missed > 0 ? 'var(--neon-red)' : 'var(--text-muted)'}; margin-top: 2px;">
                        ${missed}
                    </div>
                </div>

                <div style="background: rgba(255,255,255,0.03); border: 1px solid var(--border-sharp); border-radius: 4px; padding: 8px; text-align: center;">
                    <div style="font-size: 0.68rem; color: var(--text-muted);">PEAK CURRENT</div>
                    <div style="font-size: 1.4rem; font-weight: 800; color: ${parseFloat(currentA) >= 5.5 && parseFloat(currentA) <= 10.5 ? 'var(--neon-green)' : 'var(--neon-orange)'}; margin-top: 2px;">
                        ${currentA} A
                    </div>
                </div>
            </div>

            <!-- AUTO SCAN SUITE CONTROLS & PROGRESS -->
            <div style="margin-top: 10px; background: rgba(0,0,0,0.3); border: 1px solid var(--border-sharp); border-radius: 4px; padding: 8px;">
                <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 6px;">
                    <div>
                        <div style="font-weight: 700; font-size: 0.82rem;">20-SECOND AUTO HEALTH & STRESS SCAN</div>
                        <div style="font-size: 0.7rem; color: var(--text-muted);">
                            Tests Low-Dwell Margin, WOT Throttle Burst, & High-Temp Stress.
                        </div>
                    </div>
                    
                    <div style="display: flex; gap: 6px;">
                        <button class="btn" style="padding: 4px 8px; font-size: 0.72rem;" onClick=${() => sendAction('resetCoilCounters')} disabled=${!state.connected || isAutoDiag}>RESET</button>
                        <button class="btn ${isAutoDiag ? 'is-running' : 'btn-active'}" style="padding: 4px 10px; font-size: 0.75rem; font-weight: bold; border-color: ${isAutoDiag ? 'var(--neon-red)' : 'var(--neon-green)'}; color: ${isAutoDiag ? '#fff' : '#000'}; background: ${isAutoDiag ? 'var(--neon-red)' : 'var(--neon-green)'};" onClick=${() => sendAction(isAutoDiag ? 'stopCoilDiag' : 'startCoilDiag')} disabled=${!state.connected}>
                            ${isAutoDiag ? 'ABORT SCAN' : 'START AUTO SCAN'}
                        </button>
                    </div>
                </div>

                ${isAutoDiag ? html`
                    <div style="margin-top: 8px;">
                        <div style="display: flex; justify-content: space-between; font-size: 0.72rem; margin-bottom: 2px;">
                            <span>${state.coilDiagPhase === 1 ? 'Phase 1: Dwell Sweep (1.2ms → 3.5ms)' : state.coilDiagPhase === 2 ? 'Phase 2: Burst (800 → 6500 RPM)' : 'Phase 3: Stress (7000 RPM)'}</span>
                            <strong>${state.coilDiagProgress || 0}%</strong>
                        </div>
                        <div style="width: 100%; height: 6px; background: #222; border-radius: 3px; overflow: hidden; border: 1px solid var(--border-sharp);">
                            <div style="height: 100%; width: ${state.coilDiagProgress || 0}%; background: var(--neon-green);"></div>
                        </div>
                    </div>
                ` : html`
                    <div style="margin-top: 6px; font-size: 0.75rem; padding: 4px 8px; background: rgba(255,255,255,0.02); border-radius: 3px; display: flex; justify-content: space-between;">
                        <span>LAST SCAN VERDICT:</span>
                        <strong style="color: ${verdict.includes('HEALTHY') ? 'var(--neon-green)' : (verdict.includes('DEGRADED') ? 'var(--neon-orange)' : (verdict.includes('FAIL') ? 'var(--neon-red)' : 'var(--text-primary)'))}">
                            ${verdict}
                        </strong>
                    </div>
                `}
            </div>
        </div>
        
        <!-- ADVANCED SETTINGS ACCORDION -->
        <details class="panel" style="margin-top: 8px; grid-column: 1 / -1;">
            <summary class="panel-header" style="cursor: pointer; user-select: none; font-size: 0.72rem; color: var(--text-muted);">
                ⚙️ ADVANCED SWEEP & STEP SETTINGS ▾
            </summary>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; padding-top: 8px;">
                <${Dial} 
                    compact=${true}
                    label="SWEEP TIME"
                    value=${state.sweepTimeSec}
                    unit="SEC"
                    min="1"
                    max="60"
                    step="1"
                    accentColor="var(--neon-purple)"
                    onChange=${(val) => sendAction('setSweepTime', val)}
                    disabled=${!state.connected || isAutoDiag || (state.runMode === 3 && state.isRunning)}
                />
                <${Dial} 
                    compact=${true}
                    label="RPM STEP"
                    value=${state.rpmStep}
                    unit="RPM"
                    min="10"
                    max="1000"
                    step="10"
                    onChange=${(val) => sendAction('setRpmStep', val)}
                    disabled=${!state.connected || isAutoDiag}
                />
            </div>
        </details>

        <!-- PANDUAN PENGUJIAN KOIL (COLLAPSED BY DEFAULT) -->
        <details class="panel" style="margin-top: 8px; grid-column: 1 / -1; border-color: var(--border-sharp);">
            <summary class="panel-header" style="cursor: pointer; user-select: none; color: var(--text-primary); font-weight: bold;">
                📖 PANDUAN & STANDAR PENGUJIAN KOIL PENGAPIAN ▾
            </summary>
            <div style="padding-top: 10px; font-size: 0.8rem; color: var(--text-primary); line-height: 1.6;">
                <div style="background: rgba(255,255,255,0.02); border: 1px solid var(--border-sharp); border-radius: 4px; padding: 10px; margin-bottom: 8px;">
                    <strong style="color: var(--neon-cyan);">STANDAR KELAYAKAN KOIL:</strong><br/>
                    • Spark Gap 10-12 mm (kompresi 15 Bar) wajib api biru tebal.<br/>
                    • Arus Primer optimal 6.5A - 9.5A (<5A = loyo/brebet, >11A = korslet).<br/>
                    • Uji Sweep 5-10 menit untuk deteksi kelemahan saat panas (*Thermal Breakdown*).
                </div>
            </div>
        </details>
    `;
}
