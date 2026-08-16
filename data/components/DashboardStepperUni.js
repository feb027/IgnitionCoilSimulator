import { html } from '../preact.mjs';
import { Dial } from './Dial.js';

export function DashboardStepperUni({ state, sendAction, modeSelector }) {
    const isSpinning = state.isRunning && state.stepperSpinDir !== 0;
    const spinDir = state.stepperSpinDir || 0;

    return html`
        <div class="panel-main">
            <div style="margin-bottom: 8px; font-size: 0.85rem; font-weight: bold; color: var(--neon-orange); letter-spacing: 0.05em;">
                🔄 HARDWARE: 4-WIRE STEPPER CONTINUOUS DRIVE (PINS 16, 17, 18, 19)
            </div>
            <${Dial} 
                label="STEPPER ROTATION SPEED"
                value=${state.stepperSpeed || 50}
                unit="%"
                min="1"
                max="100"
                step="5"
                onChange=${(val) => sendAction('setStepperSpeed', val)}
                disabled=${!state.connected}
            />
        </div>
        
        <div class="panel-side-top" style="display: flex; flex-direction: column; gap: var(--space-md);">
            <div class="panel" style="display: flex; flex-direction: column; justify-content: center; height: 100%;">
                <div class="panel-header">
                    <span>DIRECTION & CONTINUOUS SPIN</span>
                </div>
                <div style="display: flex; flex-direction: column; gap: 8px; margin-top: 8px;">
                    <button 
                        class="btn ${spinDir === 1 ? 'btn-active' : ''}"
                        style="padding: 12px; font-weight: bold;"
                        onClick=${() => sendAction('stepperSpin', spinDir === 1 ? 0 : 1)}
                        disabled=${!state.connected}
                    >
                        ${spinDir === 1 ? 'SPINNING FORWARD (CW) - STOP' : 'SPIN FORWARD (CW) ⏩'}
                    </button>
                    <button 
                        class="btn ${spinDir === -1 ? 'btn-active' : ''}"
                        style="padding: 12px; font-weight: bold;"
                        onClick=${() => sendAction('stepperSpin', spinDir === -1 ? 0 : -1)}
                        disabled=${!state.connected}
                    >
                        ${spinDir === -1 ? 'SPINNING REVERSE (CCW) - STOP' : 'SPIN REVERSE (CCW) ⏪'}
                    </button>
                </div>
            </div>
        </div>

        ${modeSelector}
        
        <!-- SINGLE STEP JOGGING CONTROLS -->
        <div class="panel" style="margin-top: var(--space-md); grid-column: 1 / -1;">
            <div class="panel-header">
                <span>MANUAL STEP JOGGING (STEP BY STEP)</span>
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 10px;">
                <button 
                    class="btn"
                    style="padding: 14px; font-weight: bold;"
                    onClick=${() => sendAction('stepperSpin', -1)}
                    disabled=${!state.connected || isSpinning}
                >
                    ◀ JOG STEP CCW (-1)
                </button>
                <button 
                    class="btn"
                    style="padding: 14px; font-weight: bold;"
                    onClick=${() => sendAction('stepperSpin', 1)}
                    disabled=${!state.connected || isSpinning}
                >
                    JOG STEP CW (+1) ▶
                </button>
            </div>
        </div>
    `;
}
