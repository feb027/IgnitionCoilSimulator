import { html } from '../preact.mjs';
import { Dial } from './Dial.js';

export function DashboardPwm({ state, sendAction, modeSelector }) {
    const isSweep = state.runMode === 3;
    
    return html`
        <div class="panel-main">
            <${Dial} 
                label=${(isSweep && state.isRunning) ? "SWEEPING RPM..." : (isSweep ? "TARGET RPM" : "ENGINE SPEED")}
                value=${(isSweep && state.isRunning) ? state.currentRpm : state.rpm}
                unit="RPM"
                min="0"
                max="16000"
                step=${state.rpmStep}
                onChange=${(val) => sendAction('setRpm', val)}
                disabled=${!state.connected || (isSweep && state.isRunning)}
            />
        </div>
        
        <div class="panel-side-top" style="display: flex; flex-direction: column; gap: 16px;">
            <${Dial} 
                label="DUTY CYCLE"
                value=${state.dutyCycle}
                unit="%"
                min="0"
                max="100"
                step="1"
                subInfo=${"Calculated Dwell: " + (state.dwellMs ? state.dwellMs.toFixed(1) : "0.0") + "ms"}
                onChange=${(val) => sendAction('setDuty', val)}
                disabled=${!state.connected}
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
