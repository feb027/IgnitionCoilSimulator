import { html } from '../preact.mjs';
import { Dial } from './Dial.js';

export function DashboardStepper({ state, sendAction, modeSelector }) {
    return html`
        <div class="panel-main" style="display: flex; justify-content: space-between; gap: 20px; align-items: stretch; padding: 30px;">
            <button 
                class="btn btn-jog"
                style="flex: 1; font-size: 1.5rem; font-weight: bold; background: ${state.stepperSpinDir === -1 ? 'var(--text-primary)' : 'var(--surface-color)'}; color: ${state.stepperSpinDir === -1 ? 'var(--bg-base)' : 'var(--text-primary)'}; border: 2px solid var(--border-sharp); user-select: none;"
                onPointerDown=${() => sendAction('stepperSpin', -1)}
                onPointerUp=${() => sendAction('stepperSpin', 0)}
                onPointerLeave=${() => sendAction('stepperSpin', 0)}
                disabled=${!state.connected}
            >
                PUTAR KIRI
            </button>
            <button 
                class="btn btn-jog"
                style="flex: 1; font-size: 1.5rem; font-weight: bold; background: ${state.stepperSpinDir === 1 ? 'var(--text-primary)' : 'var(--surface-color)'}; color: ${state.stepperSpinDir === 1 ? 'var(--bg-base)' : 'var(--text-primary)'}; border: 2px solid var(--border-sharp); user-select: none;"
                onPointerDown=${() => sendAction('stepperSpin', 1)}
                onPointerUp=${() => sendAction('stepperSpin', 0)}
                onPointerLeave=${() => sendAction('stepperSpin', 0)}
                disabled=${!state.connected}
            >
                PUTAR KANAN
            </button>
        </div>
        
        <div class="panel-side-top" style="display: flex; flex-direction: column; gap: 16px;">
            <${Dial} 
                label="STEPPER SPEED"
                value=${state.stepperSpeed}
                unit="%"
                min="1"
                max="100"
                step="5"
                onChange=${(val) => sendAction('setStepperSpeed', val)}
                disabled=${!state.connected}
            />
        </div>

        ${modeSelector}
        
        <!-- Stepper does not have a RUN button or advanced settings in the original UI -->
    `;
}
