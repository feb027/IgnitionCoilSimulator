import { html } from '../preact.js';
import { Dial } from './Dial.js';
import { SparkCadenceCard } from './SparkCadenceCard.js';

export function DashboardCoilPassive({ state, sendAction, modeSelector }) {
    const isSweep = state.runMode === 3;
    
    return html`
        <!-- COMPACT ENGINE SPEED & DWELL TIME CONTROL ROW (SIDE-BY-SIDE) -->
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; grid-column: 1 / -1;">
            <${Dial} 
                compact=${true}
                label=${(isSweep && state.isRunning) ? "SWEEPING..." : (isSweep ? "TARGET RPM" : "ENGINE SPEED")}
                value=${(isSweep && state.isRunning) ? state.currentRpm : state.rpm}
                unit="RPM"
                min="0"
                max="12000"
                step=${state.rpmStep || 50}
                onChange=${(val) => sendAction('setRpm', val)}
                disabled=${!state.connected || (isSweep && state.isRunning)}
            />
            
            <${Dial} 
                compact=${true}
                label="DWELL TIME (IGBT)"
                value=${state.dwellMs}
                unit="MS"
                min="0.5"
                max="5.0"
                step="0.1"
                subInfo=${"Duty: " + (state.dutyCycle ? state.dutyCycle.toFixed(1) : "0.0") + "%"}
                onChange=${(val) => sendAction('setDwell', val)}
                disabled=${!state.connected}
            />
        </div>

        ${modeSelector}
        
        <!-- MASTER RUN BUTTON -->
        <div class="sticky-run-bar">
            <button 
                class="btn btn-run ${state.isRunning ? 'is-running' : ''}"
                onClick=${() => sendAction('toggleRun')}
                disabled=${!state.connected}
            >
                ${state.runMode === 2 
                    ? (state.isRunning ? '⚡ FIRING SINGLE...' : '⚡ FIRE SINGLE PULSE')
                    : (state.runMode === 1
                        ? (state.isRunning ? '⚡ FIRING BURST...' : '⚡ FIRE BURST (10x)')
                        : (state.isRunning ? 'IGBT DRIVE: ON' : 'IGBT DRIVE: OFF'))}
            </button>
        </div>
        
        <!-- UNIFIED TRI-DIMENSION IGNITION & LEAK ANALYZER COCKPIT -->
        <${SparkCadenceCard} state=${state} sendAction=${sendAction} title="2-PIN PASSIVE COIL ANALYZER" />

        <!-- PANDUAN PENGUJIAN & PINOUT (COLLAPSED BY DEFAULT) -->
        <details class="panel" style="margin-top: 10px; grid-column: 1 / -1; border-color: var(--border-sharp);">
            <summary class="panel-header" style="cursor: pointer; user-select: none; color: var(--text-primary); font-weight: bold;">
                📖 PANDUAN PENGUJIAN, PINOUT & WIRING KOIL PASIF 2-PIN ▾
            </summary>
            <div style="padding-top: 10px; font-size: 0.8rem; color: var(--text-primary); line-height: 1.6;">
                <div style="background: rgba(255,255,255,0.02); border: 1px solid var(--border-sharp); border-radius: 4px; padding: 10px; margin-bottom: 8px;">
                    <strong style="color: var(--neon-cyan);">KONEKSI KABEL:</strong><br/>
                    • <strong>Pin (+) / Kl.15:</strong> +12V Aki (via ACS712)<br/>
                    • <strong>Pin (-) / Kl.1:</strong> Output IGBT Driver (Pin 33)<br/>
                    • <strong>Kabel Sekunder:</strong> Spark Gap Tester (10-12 mm)<br/>
                    • <strong>Probe Leak:</strong> Kawat sensor tempel/usap pada leher bodi koil
                </div>

                <div style="background: rgba(255,255,255,0.02); border: 1px solid var(--border-sharp); border-radius: 4px; padding: 10px;">
                    <strong style="color: var(--neon-purple);">TIPS ANALISA KELAYAKAN:</strong><br/>
                    • <strong>Arus Primer Sehat:</strong> 6.0A - 8.5A (>11A = korslet lilitan primer).<br/>
                    • <strong>Dwell Aman:</strong> 2.5ms - 3.5ms (Hindari >4.5ms pada RPM rendah agar koil tidak panas).<br/>
                    • <strong>Insulation Leak:</strong> Jika bunyi alarm, isolator batang koil bocor ke bodi.
                </div>
            </div>
        </details>

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
                    disabled=${!state.connected || (state.runMode === 3 && state.isRunning)}
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
                    disabled=${!state.connected}
                />
            </div>
        </details>
    `;
}
