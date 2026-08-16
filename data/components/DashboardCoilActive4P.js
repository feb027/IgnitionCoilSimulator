import { html } from '../preact.mjs';
import { Dial } from './Dial.js';
import { LeakageCard } from './LeakageCard.js';

export function DashboardCoilActive4P({ state, sendAction, modeSelector }) {
    const isSweep = state.runMode === 3;
    const isAutoDiag = state.coilAutoDiagRunning;
    const health = (state.coilHealthPercent !== undefined) ? state.coilHealthPercent : 100.0;
    const fired = state.coilFiredCount || 0;
    const igf = state.coilIgfCount || 0;
    const missed = state.coilMissedCount || 0;
    const verdict = state.coilDiagVerdict || "READY";
    const currentA = state.coilPeakCurrentA ? state.coilPeakCurrentA.toFixed(1) : "0.0";

    let healthColor = "var(--neon-green)";
    let healthBadge = "HEALTHY";
    if (fired > 20 && health < 90.0) {
        healthColor = "var(--neon-red)";
        healthBadge = "DEFECTIVE / MISFIRE";
    } else if (fired > 20 && health < 99.0) {
        healthColor = "var(--neon-orange)";
        healthBadge = "DEGRADED";
    }

    return html`
        <div class="panel-main">
            <div style="margin-bottom: 8px; font-size: 0.85rem; font-weight: bold; color: ${healthColor}; letter-spacing: 0.05em;">
                ⚡ HARDWARE: IGT OUT (PIN 25) | IGF IN (PIN 34) | SENSE (PIN 35)
            </div>
            <${Dial} 
                label=${isAutoDiag ? "AUTO DIAGNOSTIC RPM" : ((isSweep && state.isRunning) ? "SWEEPING RPM..." : (isSweep ? "TARGET RPM" : "ENGINE SPEED"))}
                value=${(isSweep && state.isRunning) ? state.currentRpm : state.rpm}
                unit="RPM"
                min="0"
                max="16000"
                step=${state.rpmStep || 50}
                subInfo=${isAutoDiag ? ("Auto Scan Phase " + state.coilDiagPhase + "/3") : null}
                onChange=${(val) => sendAction('setRpm', val)}
                disabled=${!state.connected || (isSweep && state.isRunning) || isAutoDiag}
            />
        </div>
        
        <div class="panel-side-top" style="display: flex; flex-direction: column; gap: var(--space-md);">
            <${Dial} 
                label="DWELL TIME (IGT PULSE)"
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
        <div style="position: sticky; bottom: 16px; z-index: 100; margin-top: var(--space-md); grid-column: 1 / -1;">
            <button 
                class="btn btn-run ${state.isRunning ? 'is-running' : ''}"
                onClick=${() => sendAction('toggleRun')}
                disabled=${!state.connected || isAutoDiag}
                style="box-shadow: 0 4px 20px rgba(0,0,0,0.6);"
            >
                ${state.isRunning ? 'IGT TRIGGER: ON' : 'IGT TRIGGER: OFF'}
            </button>
        </div>
        
        <!-- COIL HEALTH & IGF DIAGNOSTIC ANALYZER -->
        <div class="panel" style="margin-top: var(--space-md); grid-column: 1 / -1; border-color: ${healthColor};">
            <div class="panel-header" style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border-sharp); padding-bottom: 8px;">
                <span style="font-weight: 700; letter-spacing: 0.1em; color: ${healthColor};">
                    ⚡ 4-PIN COIL HEALTH & IGF DIAGNOSTIC ANALYZER
                </span>
                <span class="status-badge" style="border-color: ${healthColor}; color: ${healthColor};">
                    ${healthBadge}
                </span>
            </div>

            <!-- Telemetry Stats Grid (Including Current Sense) -->
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 12px; margin-top: var(--space-md);">
                <div style="background: rgba(255,255,255,0.03); border: 1px solid var(--border-sharp); border-radius: 4px; padding: 12px; text-align: center;">
                    <div style="font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase;">SPARK HEALTH</div>
                    <div style="font-size: 1.5rem; font-weight: 700; color: ${healthColor}; margin-top: 4px;">
                        ${fired > 0 ? health.toFixed(1) + "%" : "--%"}
                    </div>
                </div>

                <div style="background: rgba(255,255,255,0.03); border: 1px solid var(--border-sharp); border-radius: 4px; padding: 12px; text-align: center;">
                    <div style="font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase;">PEAK CURRENT</div>
                    <div style="font-size: 1.5rem; font-weight: 700; color: var(--neon-orange); margin-top: 4px;">
                        ${currentA} A
                    </div>
                </div>

                <div style="background: rgba(255,255,255,0.03); border: 1px solid var(--border-sharp); border-radius: 4px; padding: 12px; text-align: center;">
                    <div style="font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase;">FIRED (IGT)</div>
                    <div style="font-size: 1.5rem; font-weight: 700; color: var(--text-primary); margin-top: 4px;">
                        ${fired}
                    </div>
                </div>

                <div style="background: rgba(255,255,255,0.03); border: 1px solid var(--border-sharp); border-radius: 4px; padding: 12px; text-align: center;">
                    <div style="font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase;">IGF CONFIRMED</div>
                    <div style="font-size: 1.5rem; font-weight: 700; color: var(--neon-green); margin-top: 4px;">
                        ${igf}
                    </div>
                </div>

                <div style="background: rgba(255,255,255,0.03); border: 1px solid var(--border-sharp); border-radius: 4px; padding: 12px; text-align: center;">
                    <div style="font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase;">MISSED SPARKS</div>
                    <div style="font-size: 1.5rem; font-weight: 700; color: ${missed > 0 ? 'var(--neon-red)' : 'var(--text-muted)'}; margin-top: 4px;">
                        ${missed}
                    </div>
                </div>
            </div>

            <!-- AUTO SCAN SUITE CONTROLS & PROGRESS -->
            <div style="margin-top: var(--space-lg); background: rgba(0,0,0,0.4); border: 1px solid var(--border-sharp); border-radius: 6px; padding: var(--space-md);">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; flex-wrap: wrap; gap: 8px;">
                    <div>
                        <div style="font-weight: 700; font-size: 0.95rem;">20-SECOND AUTO HEALTH & STRESS SCAN</div>
                        <div style="font-size: 0.8rem; color: var(--text-muted);">
                            Tests Low-Dwell Margin (1.2ms), WOT Throttle Burst (6500 RPM), & High-Temp Stress (7000 RPM).
                        </div>
                    </div>
                    
                    <div style="display: flex; gap: 8px;">
                        <button 
                            class="btn"
                            style="padding: 8px 12px; font-size: 0.8rem;"
                            onClick=${() => sendAction('resetCoilCounters')}
                            disabled=${!state.connected || isAutoDiag}
                        >
                            RESET COUNTERS
                        </button>
                        
                        <button 
                            class="btn ${isAutoDiag ? 'is-running' : 'btn-active'}"
                            style="padding: 8px 16px; font-size: 0.85rem; font-weight: bold; border-color: ${isAutoDiag ? 'var(--neon-red)' : 'var(--neon-green)'}; color: ${isAutoDiag ? '#fff' : '#000'}; background: ${isAutoDiag ? 'var(--neon-red)' : 'var(--neon-green)'};"
                            onClick=${() => sendAction(isAutoDiag ? 'stopCoilDiag' : 'startCoilDiag')}
                            disabled=${!state.connected}
                        >
                            ${isAutoDiag ? 'ABORT SCAN' : 'START AUTO HEALTH SCAN'}
                        </button>
                    </div>
                </div>

                <!-- Progress Bar & Active Phase Message -->
                ${isAutoDiag ? html`
                    <div style="margin-top: 12px;">
                        <div style="display: flex; justify-content: space-between; font-size: 0.8rem; margin-bottom: 4px;">
                            <span>
                                ${state.coilDiagPhase === 1 ? 'Phase 1: Dwell Saturation Margin Sweep (1.2ms → 3.5ms)' : 
                                  state.coilDiagPhase === 2 ? 'Phase 2: Throttle Tip-In Burst (800 → 6500 RPM)' : 
                                  'Phase 3: High-RPM Thermal Breakdown Stress (7000 RPM)'}
                            </span>
                            <span style="font-weight: bold;">${state.coilDiagProgress || 0}%</span>
                        </div>
                        <div style="width: 100%; height: 10px; background: #222; border-radius: 5px; overflow: hidden; border: 1px solid var(--border-sharp);">
                            <div style="height: 100%; width: ${state.coilDiagProgress || 0}%; background: var(--neon-green); transition: width 0.2s;"></div>
                        </div>
                    </div>
                ` : html`
                    <div style="margin-top: 8px; font-size: 0.85rem; padding: 6px 10px; background: rgba(255,255,255,0.02); border-radius: 4px; display: flex; justify-content: space-between;">
                        <span>LAST SCAN VERDICT:</span>
                        <strong style="color: ${verdict.includes('HEALTHY') ? 'var(--neon-green)' : (verdict.includes('DEGRADED') ? 'var(--neon-orange)' : (verdict.includes('FAIL') ? 'var(--neon-red)' : 'var(--text-primary)'))}">
                            ${verdict}
                        </strong>
                    </div>
                `}
            </div>
        </div>
        
        <!-- BODY LEAKAGE DETECTION CARD -->
        <${LeakageCard} state=${state} sendAction=${sendAction} />

        <!-- ADVANCED SETTINGS ACCORDION -->
        <details class="panel" style="margin-top: var(--space-md); grid-column: 1 / -1;">
            <summary class="panel-header" style="cursor: pointer; user-select: none;">
                <span>ADVANCED SETTINGS ▾</span>
            </summary>
            <div class="responsive-grid-2" style="padding-top: var(--space-md);">
                <${Dial} 
                    label="SWEEP TIME"
                    value=${state.sweepTimeSec}
                    unit="SEC"
                    min="1"
                    max="60"
                    step="1"
                    onChange=${(val) => sendAction('setSweepTime', val)}
                    disabled=${!state.connected || isAutoDiag}
                />
                <${Dial} 
                    label="RPM STEP SIZE"
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
    `;
}
