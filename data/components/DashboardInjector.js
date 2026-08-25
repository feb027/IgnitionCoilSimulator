import { html } from '../preact.js';
import { Dial } from './Dial.js';

export function DashboardInjector({ state, sendAction, modeSelector }) {
    const isSweep = state.runMode === 3;
    const isFlow = state.injectorFlowRunning;
    const isAutoDiag = state.injectorAutoDiagRunning;
    const pulsesLeft = state.injectorPulsesLeft || 0;
    const currentA = state.injectorPeakCurrentA ? state.injectorPeakCurrentA.toFixed(2) : "0.00";
    const resOhm = (state.injectorResistanceOhm && state.injectorResistanceOhm > 0) ? state.injectorResistanceOhm.toFixed(1) : "--";
    const verdict = state.injectorDiagVerdict || "READY";

    let coilHealthColor = "var(--neon-blue)";
    let coilHealthBadge = "STANDBY";

    if (state.isRunning) {
        const cur = state.injectorPeakCurrentA || 0;
        if (cur >= 0.70 && cur <= 1.40) {
            coilHealthColor = "var(--neon-green)";
            coilHealthBadge = "COIL NORMAL (" + resOhm + " Ω)";
        } else if (cur > 1.50) {
            coilHealthColor = "var(--neon-red)";
            coilHealthBadge = "COIL SHORT CIRCUIT! (" + resOhm + " Ω)";
        } else if (cur >= 0.15 && cur < 0.70) {
            coilHealthColor = "var(--neon-orange)";
            coilHealthBadge = "COIL WEAK / HIGH-R (" + resOhm + " Ω)";
        } else {
            coilHealthColor = "var(--text-muted)";
            coilHealthBadge = "NO CURRENT DETECTED";
        }
    }

    return html`
        <div class="panel-main">
            <div style="margin-bottom: 8px; font-size: 0.85rem; font-weight: bold; color: var(--neon-blue); letter-spacing: 0.05em;">
                ⛽ HARDWARE: INJECTOR MOSFET (PIN 32) + CURRENT SENSE (PIN 35)
            </div>
            <${Dial} 
                label=${isAutoDiag ? "AUTO SCANNING SPEED..." : ((isSweep && state.isRunning) ? "CLEANING SWEEP RPM..." : (isSweep ? "TARGET RPM" : "SIMULATED ENGINE RPM"))}
                value=${(isSweep && state.isRunning) ? state.currentRpm : (state.injectorRpm || 1500)}
                unit="RPM"
                min="500"
                max="8000"
                step="100"
                onChange=${(val) => sendAction('setInjectorRpm', val)}
                disabled=${!state.connected || (isSweep && state.isRunning) || isFlow || isAutoDiag}
            />
        </div>
        
        <div class="panel-side-top" style="display: flex; flex-direction: column; gap: var(--space-md);">
            <${Dial} 
                label="INJECTION DURATION / PULSE WIDTH"
                value=${state.injectorMs || 3.0}
                unit="MS"
                min="0.5"
                max="25.0"
                step="0.1"
                subInfo=${"Duty: " + (state.dutyCycle ? state.dutyCycle.toFixed(1) : "0.0") + "% (Max 85% Clamped)"}
                onChange=${(val) => sendAction('setInjectorMs', val)}
                disabled=${!state.connected || isFlow || isAutoDiag}
            />
        </div>

        ${modeSelector}
        
        <!-- MASTER RUN BUTTON -->
        <div class="sticky-run-bar">
            <button 
                class="btn btn-run ${state.isRunning ? 'is-running' : ''}"
                onClick=${() => {
                    if (isFlow) sendAction('stopInjectorFlow');
                    else if (isAutoDiag) sendAction('stopInjectorDiag');
                    else sendAction('toggleRun');
                }}
                disabled=${!state.connected}
            >
                ${isAutoDiag ? 'AUTO DIAG IN PROGRESS - ABORT' : 
                  (isFlow ? ('FLOW TEST IN PROGRESS (' + pulsesLeft + ' LEFT) - STOP') : 
                  (state.runMode === 2 
                    ? (state.isRunning ? 'FIRING SINGLE PULSE...' : '⚡ TRIGGER SINGLE PULSE') 
                    : (state.runMode === 1
                        ? (state.isRunning ? 'FIRING BURST (10x)...' : '⚡ TRIGGER BURST (10x)')
                        : (state.isRunning ? 'INJECTOR SPRAY: ACTIVE (STOP)' : 'INJECTOR SPRAY: OFF (START)'))))}
            </button>
        </div>
        
        <!-- INJECTOR COIL HEALTH & ELECTRICAL CURRENT MONITOR (PIN 35) -->
        <div class="panel" style="margin-top: var(--space-md); grid-column: 1 / -1; border-color: ${coilHealthColor};">
            <div class="panel-header" style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border-sharp); padding-bottom: 8px;">
                <span style="font-weight: 700; letter-spacing: 0.05em; color: ${coilHealthColor};">
                    ⚡ INJECTOR COIL HEALTH & REAL-TIME CURRENT SENSING (PIN 35)
                </span>
                <span class="status-badge" style="border-color: ${coilHealthColor}; color: ${coilHealthColor}; font-weight: bold;">
                    ${coilHealthBadge}
                </span>
            </div>

            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 10px; margin-top: var(--space-md);">
                <div style="background: rgba(255,255,255,0.03); border: 1px solid var(--border-sharp); border-radius: 4px; padding: 12px; text-align: center;">
                    <div style="font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase;">PEAK SOLENOID CURRENT</div>
                    <div style="font-size: 2.0rem; font-weight: 700; color: ${coilHealthColor}; margin-top: 4px;">
                        ${currentA} <span style="font-size: 1rem; font-weight: normal;">A</span>
                    </div>
                </div>

                <div style="background: rgba(255,255,255,0.03); border: 1px solid var(--border-sharp); border-radius: 4px; padding: 12px; text-align: center;">
                    <div style="font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase;">ESTIMATED COIL RESISTANCE</div>
                    <div style="font-size: 2.0rem; font-weight: 700; color: var(--text-primary); margin-top: 4px;">
                        ${resOhm} <span style="font-size: 1rem; font-weight: normal;">Ω</span>
                    </div>
                </div>

                <div style="background: rgba(255,255,255,0.03); border: 1px solid var(--border-sharp); border-radius: 4px; padding: 12px; display: flex; flex-direction: column; justify-content: center;">
                    <div style="font-size: 0.75rem; color: var(--text-muted); margin-bottom: 2px;">STANDAR NORMAL INJEKTOR BENSIN:</div>
                    <div style="font-size: 0.82rem; color: var(--text-primary); line-height: 1.4;">
                        • <strong>Normal:</strong> 0.8A - 1.2A (12Ω - 16Ω)<br/>
                        • <strong>Korslet:</strong> Di atas 1.5A (&lt;8Ω)<br/>
                        • <strong>Spul Lemah/Oksidasi:</strong> Di bawah 0.6A
                    </div>
                </div>
            </div>

            <!-- 20-SECOND AUTO HEALTH SCAN SUITE -->
            <div style="margin-top: var(--space-lg); background: rgba(0,0,0,0.4); border: 1px solid var(--border-sharp); border-radius: 6px; padding: var(--space-md);">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; flex-wrap: wrap; gap: 8px;">
                    <div>
                        <div style="font-weight: 700; font-size: 0.95rem;">20-SECOND AUTO INJECTOR HEALTH & DYNAMIC SCAN</div>
                        <div style="font-size: 0.8rem; color: var(--text-muted);">
                            Uji Respon Angkat Jarum (1.2ms Margin), Sapuan RPM Tinggi (6500 RPM), & Ketahanan Termal Panas.
                        </div>
                    </div>
                    
                    <div>
                        <button 
                            class="btn ${isAutoDiag ? 'is-running' : 'btn-active'}"
                            style="padding: 8px 16px; font-size: 0.85rem; font-weight: bold; border-color: ${isAutoDiag ? 'var(--neon-red)' : 'var(--neon-green)'}; color: ${isAutoDiag ? '#fff' : '#000'}; background: ${isAutoDiag ? 'var(--neon-red)' : 'var(--neon-green)'};"
                            onClick=${() => sendAction(isAutoDiag ? 'stopInjectorDiag' : 'startInjectorDiag')}
                            disabled=${!state.connected || isFlow}
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
                                ${state.injectorDiagPhase === 1 ? 'Phase 1: Low-Pulse Needle Lift Margin (1.2ms → 2.0ms)' : 
                                  state.injectorDiagPhase === 2 ? 'Phase 2: High-RPM Tip-In Burst (1200 → 6500 RPM)' : 
                                  'Phase 3: High Thermal Duty Saturation (7.5ms @ 3500 RPM)'}
                            </span>
                            <span style="font-weight: bold;">${state.injectorDiagProgress || 0}%</span>
                        </div>
                        <div style="width: 100%; height: 10px; background: #222; border-radius: 5px; overflow: hidden; border: 1px solid var(--border-sharp);">
                            <div style="height: 100%; width: ${state.injectorDiagProgress || 0}%; background: var(--neon-green); transition: width 0.2s;"></div>
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

        <!-- FLOW VOLUME & DEBIT TEST SUITE CARD -->
        <div class="panel" style="margin-top: var(--space-md); grid-column: 1 / -1; border-color: var(--neon-blue);">
            <div class="panel-header" style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border-sharp); padding-bottom: 8px;">
                <span style="font-weight: 700; letter-spacing: 0.05em; color: var(--neon-blue);">
                    🧪 INJECTOR FLOW RATE & DEBIT MEASUREMENT (TABUNG UKUR)
                </span>
                <span class="status-badge" style="border-color: var(--neon-blue); color: var(--neon-blue);">
                    DEBIT TEST
                </span>
            </div>

            <div style="margin-top: 12px; font-size: 0.85rem; color: var(--text-muted);">
                Pilih jumlah pulsa semprotan otomatis untuk mengukur kesamaan debit bensin (cc/menit) pada tabung ukur / gelas ukur kalibrasi:
            </div>

            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 10px; margin-top: 12px;">
                <button 
                    class="btn"
                    style="padding: 12px 8px; font-weight: bold; border-color: var(--neon-blue);"
                    onClick=${() => sendAction('startInjectorFlow', 100)}
                    disabled=${!state.connected || isFlow || isAutoDiag}
                >
                    100 SHOTS
                </button>
                <button 
                    class="btn"
                    style="padding: 12px 8px; font-weight: bold; border-color: var(--neon-blue);"
                    onClick=${() => sendAction('startInjectorFlow', 500)}
                    disabled=${!state.connected || isFlow || isAutoDiag}
                >
                    500 SHOTS
                </button>
                <button 
                    class="btn"
                    style="padding: 12px 8px; font-weight: bold; border-color: var(--neon-blue);"
                    onClick=${() => sendAction('startInjectorFlow', 1000)}
                    disabled=${!state.connected || isFlow || isAutoDiag}
                >
                    1000 SHOTS
                </button>
            </div>
        </div>
    `;
}
