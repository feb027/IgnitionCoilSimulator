import { html, useState } from '../preact.js';
import { Dial } from './Dial.js';
import { SparkCadenceCard } from './SparkCadenceCard.js';
import { SweepControlPanel } from './SweepControlPanel.js';
import { AutoRandomPanel } from './AutoRandomPanel.js';
import { AdvancedTuningPanel } from './AdvancedTuningPanel.js';
import { CoilDatabaseCard } from './CoilDatabaseCard.js';
import { SafetyTriggerBar } from './SafetyTriggerBar.js';

export function DashboardCoilActive4P({ state, sendAction, modeSelector }) {
    const isSweep = state.runMode === 3;
    const isRandom = state.runMode === 4;
    const isAutoDiag = state.coilAutoDiagRunning;
    const verdict = state.coilDiagVerdict || "READY";

    const [maxRpmLimit, setMaxRpmLimit] = useState(16000);
    const [maxDwellLimit, setMaxDwellLimit] = useState(5.0);
    const [isLocked, setIsLocked] = useState(true);
    const handleToggleLock = (val) => {
        if (typeof val === 'boolean') setIsLocked(val);
        else setIsLocked(prev => !prev);
    };

    const handleMaxRpmChange = (newMax) => {
        setMaxRpmLimit(newMax);
        if (state.rpm > newMax) sendAction('setRpm', newMax);
    };

    const handleMaxDwellChange = (newMax) => {
        setMaxDwellLimit(newMax);
        if (state.dwellMs > newMax) sendAction('setDwell', newMax);
    };

    return html`
        <!-- 4-PIN DUAL-CHANNEL COMPARATOR & BODY LEAK MONITOR (UNIFIED TOP TELEMETRY) -->
        <${SparkCadenceCard} state=${state} sendAction=${sendAction} title="4-PIN DUAL-CHANNEL COMPARATOR (IGF + SPARK)" is4Pin=${true} isLocked=${isLocked} onToggleLock=${handleToggleLock} />

        <!-- 20-SECOND AUTO HEALTH & STRESS SCAN PANEL -->
        <div class="panel" style="margin-top: 6px; grid-column: 1 / -1; background: rgba(0,0,0,0.4); border: 1px solid var(--border-sharp); border-radius: 6px; padding: 10px 14px;">
            <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;">
                <div>
                    <div style="font-weight: 700; font-size: 0.85rem;">20-SECOND AUTO HEALTH & STRESS SCAN</div>
                    <div style="font-size: 0.72rem; color: var(--text-muted);">
                        Tests Low-Dwell Margin (1.2ms), WOT Throttle Burst (6500 RPM), & High-Temp Stress (7000 RPM).
                    </div>
                </div>
                
                <div style="display: flex; gap: 8px;">
                    <button class="btn" style="padding: 6px 10px; font-size: 0.75rem;" onClick=${() => sendAction('resetCoilCounters')} disabled=${!state.connected || isAutoDiag}>RESET</button>
                    <button class="btn ${isAutoDiag ? 'is-running' : 'btn-active'}" style="padding: 6px 14px; font-size: 0.8rem; font-weight: bold; border-color: ${isAutoDiag ? 'var(--neon-red)' : 'var(--neon-green)'}; color: ${isAutoDiag ? '#fff' : '#000'}; background: ${isAutoDiag ? 'var(--neon-red)' : 'var(--neon-green)'};" onClick=${() => sendAction(isAutoDiag ? 'stopCoilDiag' : 'startCoilDiag')} disabled=${!state.connected}>
                        ${isAutoDiag ? 'ABORT SCAN' : 'START AUTO HEALTH SCAN'}
                    </button>
                </div>
            </div>

            <!-- Progress Bar & Active Phase Message -->
            ${isAutoDiag ? html`
                <div style="margin-top: 10px;">
                    <div style="display: flex; justify-content: space-between; font-size: 0.75rem; margin-bottom: 3px;">
                        <span>${state.coilDiagPhase === 1 ? 'Phase 1: Dwell Saturation Margin Sweep (1.2ms → 3.5ms)' : state.coilDiagPhase === 2 ? 'Phase 2: Throttle Tip-In Burst (800 → 6500 RPM)' : 'Phase 3: High-RPM Thermal Breakdown Stress (7000 RPM)'}</span>
                        <span style="font-weight: bold;">${state.coilDiagProgress || 0}%</span>
                    </div>
                    <div style="width: 100%; height: 8px; background: #222; border-radius: 4px; overflow: hidden; border: 1px solid var(--border-sharp);">
                        <div style="height: 100%; width: ${state.coilDiagProgress || 0}%; background: var(--neon-green); transition: width 0.2s;"></div>
                    </div>
                </div>
            ` : html`
                <div style="margin-top: 6px; font-size: 0.78rem; padding: 4px 8px; background: rgba(255,255,255,0.02); border-radius: 4px; display: flex; justify-content: space-between;">
                    <span>LAST SCAN VERDICT:</span>
                    <strong style="color: ${verdict.includes('HEALTHY') ? 'var(--neon-green)' : (verdict.includes('DEGRADED') ? 'var(--neon-orange)' : (verdict.includes('FAIL') ? 'var(--neon-red)' : 'var(--text-primary)'))}">
                        ${verdict}
                    </strong>
                </div>
            `}
        </div>

        <!-- MODE SELECTION TOOLBAR -->
        <div style="display: flex; gap: 4px; grid-column: 1 / -1; margin-top: 4px; background: rgba(0,0,0,0.3); padding: 4px; border-radius: 6px; border: 1px solid var(--border-sharp); overflow-x: auto;">
            <button class="btn ${state.runMode === 0 ? 'btn-active' : ''}" style="flex: 1; padding: 4px 8px; font-size: 0.72rem; font-weight: 800; min-width: 80px;" onClick=${() => sendAction('setRunMode', 0)} disabled=${isAutoDiag}>
                ⚡ KONTINU
            </button>
            <button class="btn ${state.runMode === 3 ? 'btn-active' : ''}" style="flex: 1; padding: 4px 8px; font-size: 0.72rem; font-weight: 800; min-width: 80px;" onClick=${() => sendAction('setRunMode', 3)} disabled=${isAutoDiag}>
                📈 SAPUAN
            </button>
            <button class="btn ${state.runMode === 4 ? 'btn-active' : ''}" style="flex: 1; padding: 4px 8px; font-size: 0.72rem; font-weight: 800; min-width: 110px; border-color: ${state.runMode === 4 ? '#c084fc' : 'var(--border-sharp)'}; color: ${state.runMode === 4 ? '#fff' : '#c084fc'};" onClick=${() => sendAction('setRunMode', 4)} disabled=${isAutoDiag}>
                🔀 SIMULASI ACAK
            </button>
            <button class="btn ${state.runMode === 1 ? 'btn-active' : ''}" style="padding: 4px 8px; font-size: 0.72rem; font-weight: 800;" onClick=${() => sendAction('setRunMode', 1)} disabled=${isAutoDiag}>
                📦 BURST
            </button>
            <button class="btn ${state.runMode === 2 ? 'btn-active' : ''}" style="padding: 4px 8px; font-size: 0.72rem; font-weight: 800;" onClick=${() => sendAction('setRunMode', 2)} disabled=${isAutoDiag}>
                🎯 SINGLE
            </button>
        </div>

        <!-- AUTO-RANDOM / SWEEP MODE DUAL SLIDER / STANDARD ENGINE SPEED & DWELL DIALS ROW -->
        ${isRandom ? html`
            <${AutoRandomPanel} 
                state=${state} 
                sendAction=${sendAction} 
                maxRpmLimit=${maxRpmLimit} 
                maxDwellLimit=${maxDwellLimit} 
            />
        ` : (isSweep ? html`
            <${SweepControlPanel} 
                state=${state} 
                sendAction=${sendAction} 
                maxRpmLimit=${maxRpmLimit} 
                maxDwellLimit=${maxDwellLimit} 
            />
        ` : html`
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; grid-column: 1 / -1; margin-top: 4px;">
                <${Dial} 
                    compact=${true}
                    label=${isAutoDiag ? "AUTO DIAG..." : "ENGINE SPEED"}
                    value=${state.rpm}
                    unit="RPM"
                    min="0"
                    max=${maxRpmLimit}
                    step=${state.rpmStep || 50}
                    onChange=${(val) => sendAction('setRpm', val)}
                    disabled=${!state.connected || isAutoDiag}
                />
                
                <${Dial} 
                    compact=${true}
                    label="DWELL TIME (IGT)"
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
        `)}

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

        <!-- PIN INFO CARD -->
        <div class="panel" style="margin-top: 8px; grid-column: 1 / -1;">
            <div class="panel-header">
                <span>4-PIN ACTIVE COIL PINOUT & WIRING</span>
            </div>
            <div style="font-size: 0.85rem; color: var(--text-primary); line-height: 1.6;">
                • <strong>PIN 1 (+B):</strong> +12V Power Supply / Aki (via sensor arus ACS712)<br/>
                • <strong>PIN 2 (IGT):</strong> Terminal IGT Output (Pin 25)<br/>
                • <strong>PIN 3 (IGF):</strong> Terminal IGF Input (Pin 34)<br/>
                • <strong>PIN 4 (GND):</strong> Terminal Ground Aki 12V<br/>
                • <strong>Probe Leak (Pin 36):</strong> Lilitkan kawat sensor di leher karet koil
            </div>
        </div>

        <!-- STICKY BOTTOM SAFETY TRIGGER & EMERGENCY STOP BAR (LOCKED TO BOTTOM) -->
        <${SafetyTriggerBar} state=${state} sendAction=${sendAction} label="IGT TRIGGER" is4Pin=${true} isLocked=${isLocked} onToggleLock=${handleToggleLock} />
    `;
}
