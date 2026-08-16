import { html } from '../preact.mjs';
import { Dial } from './Dial.js';
import { LeakageCard } from './LeakageCard.js';

export function DashboardCoilPassive({ state, sendAction, modeSelector }) {
    const isSweep = state.runMode === 3;
    const currentA = state.coilPeakCurrentA ? state.coilPeakCurrentA.toFixed(1) : "0.0";
    
    return html`
        <div class="panel-main">
            <div style="margin-bottom: 8px; font-size: 0.85rem; font-weight: bold; color: var(--neon-orange); letter-spacing: 0.05em;">
                🔌 HARDWARE: DEDICATED IGBT DRIVER (PIN 33)
            </div>
            <${Dial} 
                label=${(isSweep && state.isRunning) ? "SWEEPING RPM..." : (isSweep ? "TARGET RPM" : "ENGINE SPEED")}
                value=${(isSweep && state.isRunning) ? state.currentRpm : state.rpm}
                unit="RPM"
                min="0"
                max="12000"
                step=${state.rpmStep || 50}
                onChange=${(val) => sendAction('setRpm', val)}
                disabled=${!state.connected || (isSweep && state.isRunning)}
            />
        </div>
        
        <div class="panel-side-top" style="display: flex; flex-direction: column; gap: var(--space-md);">
            <${Dial} 
                label="DWELL TIME (IGBT CHARGE)"
                value=${state.dwellMs}
                unit="MS"
                min="0.5"
                max="5.0"
                step="0.1"
                subInfo=${"Duty: " + (state.dutyCycle ? state.dutyCycle.toFixed(1) : "0.0") + "% (Max 80% Safety Clamped)"}
                onChange=${(val) => sendAction('setDwell', val)}
                disabled=${!state.connected}
            />
        </div>

        ${modeSelector}
        
        <!-- MASTER RUN BUTTON -->
        <div style="position: sticky; bottom: 16px; z-index: 100; margin-top: var(--space-md); grid-column: 1 / -1;">
            <button 
                class="btn btn-run ${state.isRunning ? 'is-running' : ''}"
                onClick=${() => sendAction('toggleRun')}
                disabled=${!state.connected}
                style="box-shadow: 0 4px 20px rgba(0,0,0,0.6);"
            >
                ${state.isRunning ? 'IGBT DRIVE: ON' : 'IGBT DRIVE: OFF'}
            </button>
        </div>
        
        <!-- PRIMARY CURRENT MONITOR CARD -->
        <div class="panel" style="margin-top: var(--space-md); grid-column: 1 / -1; border-color: var(--neon-orange);">
            <div class="panel-header" style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border-sharp); padding-bottom: 8px;">
                <span style="font-weight: 700; letter-spacing: 0.1em; color: var(--neon-orange);">
                    ⚡ PRIMARY CURRENT SENSING & WINDING HEALTH (PIN 35)
                </span>
                <span class="status-badge" style="border-color: var(--neon-orange); color: var(--neon-orange);">
                    IGBT SATURATION
                </span>
            </div>

            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px; margin-top: var(--space-md);">
                <div style="background: rgba(255,255,255,0.03); border: 1px solid var(--border-sharp); border-radius: 4px; padding: 14px; text-align: center;">
                    <div style="font-size: 0.8rem; color: var(--text-muted); text-transform: uppercase;">PEAK PRIMARY CURRENT (I_peak)</div>
                    <div style="font-size: 2.2rem; font-weight: 700; color: var(--neon-orange); margin-top: 4px;">
                        ${currentA} A
                    </div>
                </div>

                <div style="background: rgba(255,255,255,0.03); border: 1px solid var(--border-sharp); border-radius: 4px; padding: 14px; display: flex; flex-direction: column; justify-content: center;">
                    <div style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 4px;">TARGET RANGE:</div>
                    <div style="font-size: 0.95rem; font-weight: bold; color: var(--text-primary);">
                        • Normal: 6.5A - 9.0A (At 3.0ms Dwell)<br/>
                        • Weak Coil: Di bawah 5.0A | Shorted: Di atas 11.0A
                    </div>
                </div>
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
                    disabled=${!state.connected}
                />
                <${Dial} 
                    label="RPM STEP SIZE"
                    value=${state.rpmStep}
                    unit="RPM"
                    min="10"
                    max="1000"
                    step="10"
                    onChange=${(val) => sendAction('setRpmStep', val)}
                    disabled=${!state.connected}
                />
            </div>
        </details>
    `;
}
