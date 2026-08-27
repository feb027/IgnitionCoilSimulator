import { html, useState } from '../preact.js';
import { Dial } from './Dial.js';
import { AdvancedTuningPanel } from './AdvancedTuningPanel.js';
import { CoilDatabaseCard } from './CoilDatabaseCard.js';
import { SafetyTriggerBar } from './SafetyTriggerBar.js';

export function DashboardCoil({ state, sendAction, modeSelector }) {
    const isSweep = state.runMode === 3;
    const isAutoDiag = state.coilAutoDiagRunning;
    const health = (state.coilHealthPercent !== undefined) ? state.coilHealthPercent : 100.0;
    const fired = state.coilFiredCount || 0;
    const igf = state.coilIgfCount || 0;
    const missed = state.coilMissedCount || 0;
    const currentA = state.coilPeakCurrentA ? state.coilPeakCurrentA.toFixed(1) : "0.0";
    const verdict = state.coilDiagVerdict || "READY";

    const [maxRpmLimit, setMaxRpmLimit] = useState(16000);
    const [maxDwellLimit, setMaxDwellLimit] = useState(5.0);

    const handleMaxRpmChange = (newMax) => {
        setMaxRpmLimit(newMax);
        if (state.rpm > newMax) sendAction('setRpm', newMax);
    };

    const handleMaxDwellChange = (newMax) => {
        setMaxDwellLimit(newMax);
        if (state.dwellMs > newMax) sendAction('setDwell', newMax);
    };

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
    }

    return html`
        <!-- COIL HEALTH & IGF DIAGNOSTIC ANALYZER (TOP TELEMETRY) -->
        <div class="panel" style="margin-top: 4px; grid-column: 1 / -1; border-color: ${healthColor};">
            <div class="panel-header" style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border-sharp); padding-bottom: 8px;">
                <span style="font-weight: 700; letter-spacing: 0.05em; color: ${healthColor};">
                    ⚡ COIL HEALTH & IGF DIAGNOSTIC ANALYZER
                </span>
                <span class="status-badge" style="border-color: ${healthColor}; color: ${healthColor};">
                    ${healthBadge}
                </span>
            </div>

            <!-- Telemetry Stats 4-Column Grid -->
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 10px; margin-top: 10px;">
                <div style="background: rgba(255,255,255,0.03); border: 1px solid var(--border-sharp); border-radius: 4px; padding: 10px; text-align: center;">
                    <div style="font-size: 0.7rem; color: var(--text-muted); text-transform: uppercase;">SPARK HEALTH</div>
                    <div style="font-size: 1.4rem; font-weight: 800; color: ${healthColor}; margin-top: 2px;">
                        ${fired > 0 ? health.toFixed(1) + "%" : "--%"}
                    </div>
                </div>

                <div style="background: rgba(255,255,255,0.03); border: 1px solid var(--border-sharp); border-radius: 4px; padding: 10px; text-align: center;">
                    <div style="font-size: 0.7rem; color: var(--text-muted); text-transform: uppercase;">FIRED (IGT)</div>
                    <div style="font-size: 1.4rem; font-weight: 800; color: var(--text-primary); margin-top: 2px;">
                        ${fired}
                    </div>
                </div>

                <div style="background: rgba(255,255,255,0.03); border: 1px solid var(--border-sharp); border-radius: 4px; padding: 10px; text-align: center;">
                    <div style="font-size: 0.7rem; color: var(--text-muted); text-transform: uppercase;">IGF CONFIRMED</div>
                    <div style="font-size: 1.4rem; font-weight: 800; color: var(--neon-green); margin-top: 2px;">
                        ${igf}
                    </div>
                </div>

                <div style="background: rgba(255,255,255,0.03); border: 1px solid var(--border-sharp); border-radius: 4px; padding: 10px; text-align: center;">
                    <div style="font-size: 0.7rem; color: var(--text-muted); text-transform: uppercase;">MISSED SPARKS</div>
                    <div style="font-size: 1.4rem; font-weight: 800; color: ${missed > 0 ? 'var(--neon-red)' : 'var(--text-muted)'}; margin-top: 2px;">
                        ${missed}
                    </div>
                </div>

                <div style="background: rgba(255,255,255,0.03); border: 1px solid var(--border-sharp); border-radius: 4px; padding: 10px; text-align: center;">
                    <div style="font-size: 0.7rem; color: var(--text-muted); text-transform: uppercase;">PEAK CURRENT (I_pk)</div>
                    <div style="font-size: 1.4rem; font-weight: 800; color: ${parseFloat(currentA) >= 5.5 && parseFloat(currentA) <= 10.5 ? 'var(--neon-green)' : 'var(--neon-orange)'}; margin-top: 2px;">
                        ${currentA} A
                    </div>
                </div>
            </div>
        </div>

        <!-- ENGINE SPEED & DWELL TIME CONTROL ROW (DYNAMIC 0-100% SCALING ACCORDING TO LIMITS) -->
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; grid-column: 1 / -1; margin-top: 6px;">
            <${Dial} 
                compact=${true}
                label=${isAutoDiag ? "AUTO DIAG..." : ((isSweep && state.isRunning) ? "SWEEPING..." : (isSweep ? "TARGET RPM" : "ENGINE SPEED"))}
                value=${(isSweep && state.isRunning) ? state.currentRpm : state.rpm}
                unit="RPM"
                min="0"
                max=${maxRpmLimit}
                step=${state.rpmStep || 50}
                onChange=${(val) => sendAction('setRpm', val)}
                disabled=${!state.connected || (isSweep && state.isRunning) || isAutoDiag}
            />
            
            <${Dial} 
                compact=${true}
                label="DWELL TIME"
                value=${state.dwellMs}
                unit="MS"
                min="0.0"
                max=${maxDwellLimit}
                step="0.1"
                subInfo=${"Duty: " + (state.dutyCycle ? state.dutyCycle.toFixed(1) : "0.0") + "%"}
                onChange=${(val) => sendAction('setDwell', val)}
                disabled=${!state.connected || isAutoDiag}
            />
        </div>

        <!-- ADVANCED RANGE LIMITS, CALIBRATION MATRIX & FINE TUNING -->
        <${AdvancedTuningPanel} 
            state=${state} 
            sendAction=${sendAction} 
            maxRpmLimit=${maxRpmLimit} 
            onMaxRpmChange=${handleMaxRpmChange}
            maxDwellLimit=${maxDwellLimit}
            onMaxDwellChange=${handleMaxDwellChange}
        />

        <!-- VEHICLE SPECIFICATION & COIL BENCHMARK DATABASE -->
        <${CoilDatabaseCard} state=${state} sendAction=${sendAction} />

        ${modeSelector}

        <!-- STICKY BOTTOM SAFETY TRIGGER & EMERGENCY STOP BAR (LOCKED TO BOTTOM) -->
        <${SafetyTriggerBar} state=${state} sendAction=${sendAction} label="COIL TRIGGER" />
    `;
}
