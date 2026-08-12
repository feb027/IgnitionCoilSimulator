import { html } from '../preact.mjs';
import { Dial } from './Dial.js';

export function DashboardSpeedo({ state, sendAction, modeSelector }) {
    const isSweep = state.runMode === 3;
    
    return html`
        <div class="panel-main">
            <${Dial} 
                label=${isSweep ? "TARGET SPEED" : "ACTUAL SPEED"}
                value=${state.speedoKmh}
                unit="KM/H"
                min="0"
                max="300"
                step=${state.speedoKmhStep || 10}
                onChange=${(val) => sendAction('setSpeedoKmh', val)}
                disabled=${!state.connected}
            />
        </div>
        
        <div class="panel-side-top" style="display: flex; flex-direction: column; gap: 16px;">
            <${Dial} 
                label=${(isSweep && state.isRunning) ? "SWEEPING TACHO..." : (isSweep ? "TARGET TACHO" : "ACTUAL TACHO")}
                value=${(isSweep && state.isRunning) ? state.rpm : state.speedoRpm}
                unit="RPM"
                min="0"
                max="16000"
                step=${state.speedoRpmStep || 500}
                onChange=${(val) => sendAction('setSpeedoRpm', val)}
                disabled=${!state.connected || (isSweep && state.isRunning)}
            />
            <${Dial} 
                label=${(isSweep && state.isRunning) ? "SWEEPING TEMP..." : (isSweep ? "TARGET TEMP" : "ACTUAL TEMP")}
                value=${(isSweep && state.isRunning) ? state.currentSpeedoTempPercent : state.speedoTempPercent}
                unit="%"
                min="0"
                max="100"
                step=${state.speedoTempStep || 5}
                onChange=${(val) => sendAction('setSpeedoTemp', val)}
                disabled=${!state.connected || (isSweep && state.isRunning)}
            />
            <${Dial} 
                label=${(isSweep && state.isRunning) ? "SWEEPING FUEL..." : (isSweep ? "TARGET FUEL" : "ACTUAL FUEL")}
                value=${(isSweep && state.isRunning) ? state.currentSpeedoFuelPercent : state.speedoFuelPercent}
                unit="%"
                min="0"
                max="100"
                step=${state.speedoFuelStep || 5}
                onChange=${(val) => sendAction('setSpeedoFuel', val)}
                disabled=${!state.connected || (isSweep && state.isRunning)}
            />
        </div>

        ${modeSelector}
        
        <div style="position: sticky; bottom: 16px; z-index: 100; margin-top: 16px; grid-column: 1 / -1;">
            <button 
                class="btn btn-run ${state.isRunning ? 'is-running' : ''}"
                onClick=${() => sendAction('toggleRun')}
                disabled=${!state.connected}
                style="box-shadow: 0 4px 15px rgba(0,0,0,0.5);"
            >
                ${state.isRunning ? 'ON' : 'OFF'}
            </button>
        </div>
        
        <details class="panel" style="margin-top: 16px; grid-column: 1 / -1;">
            <summary class="panel-header">
                <span>ADVANCED SETTINGS</span>
            </summary>
            <div style="display: flex; flex-direction: column; gap: 16px; padding-top: 16px;">
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
                    label="PULSES / KM"
                    value=${state.pulsePerKm}
                    unit="P/KM"
                    min="1000"
                    max="10000"
                    step="100"
                    onChange=${(val) => sendAction('setPulsePerKm', val)}
                    disabled=${!state.connected}
                />
                <${Dial} 
                    label="RPM STEP (UI/PHYSICAL)"
                    value=${state.speedoRpmStep}
                    unit=""
                    min="10"
                    max="1000"
                    step="10"
                    onChange=${(val) => sendAction('setSpeedoRpmStep', val)}
                    disabled=${!state.connected}
                />
                <${Dial} 
                    label="KMH STEP (UI/PHYSICAL)"
                    value=${state.speedoKmhStep}
                    unit=""
                    min="1"
                    max="50"
                    step="1"
                    onChange=${(val) => sendAction('setSpeedoKmhStep', val)}
                    disabled=${!state.connected}
                />
                <${Dial} 
                    label="TEMP STEP (UI/PHYSICAL)"
                    value=${state.speedoTempStep}
                    unit="%"
                    min="1"
                    max="25"
                    step="1"
                    onChange=${(val) => sendAction('setSpeedoTempStep', val)}
                    disabled=${!state.connected}
                />
                <${Dial} 
                    label="FUEL STEP (UI/PHYSICAL)"
                    value=${state.speedoFuelStep}
                    unit="%"
                    min="1"
                    max="25"
                    step="1"
                    onChange=${(val) => sendAction('setSpeedoFuelStep', val)}
                    disabled=${!state.connected}
                />
            </div>
        </details>
    `;
}
