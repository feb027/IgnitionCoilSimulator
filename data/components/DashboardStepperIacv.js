import { html } from '../preact.mjs';
import { Dial } from './Dial.js';

export function DashboardStepperIacv({ state, sendAction, modeSelector }) {
    const targetSteps = state.iacvTargetSteps || 0;
    const currentSteps = state.iacvCurrentSteps || 0;
    const isHoming = state.iacvAutoCalibrating;

    return html`
        <div class="panel-main">
            <div style="margin-bottom: 8px; font-size: 0.85rem; font-weight: bold; color: var(--neon-green); letter-spacing: 0.05em;">
                ⚙️ HARDWARE: IACV 4-PIN BIPOLAR/UNIPOLAR (PINS 16, 17, 18, 19)
            </div>
            <${Dial} 
                label=${isHoming ? "CALIBRATING TO HOME STOP..." : "TARGET VALVE POSITION (STEPS)"}
                value=${targetSteps}
                unit="STEPS"
                min="0"
                max="255"
                step="5"
                subInfo=${"Live Valve Position: " + currentSteps + " / 255 Steps"}
                onChange=${(val) => sendAction('setIacvSteps', val)}
                disabled=${!state.connected || isHoming}
            />
        </div>
        
        <div class="panel-side-top" style="display: flex; flex-direction: column; gap: var(--space-md);">
            <div class="panel" style="display: flex; flex-direction: column; justify-content: center; height: 100%;">
                <div class="panel-header">
                    <span>VALVE QUICK PRESETS</span>
                </div>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 8px;">
                    <button 
                        class="btn ${targetSteps === 0 ? 'btn-active' : ''}"
                        style="padding: 12px 6px; font-size: 0.85rem; font-weight: bold;"
                        onClick=${() => sendAction('setIacvSteps', 0)}
                        disabled=${!state.connected || isHoming}
                    >
                        CLOSE (0 STP)
                    </button>
                    <button 
                        class="btn ${targetSteps === 64 ? 'btn-active' : ''}"
                        style="padding: 12px 6px; font-size: 0.85rem; font-weight: bold;"
                        onClick=${() => sendAction('setIacvSteps', 64)}
                        disabled=${!state.connected || isHoming}
                    >
                        IDLE (64 STP)
                    </button>
                    <button 
                        class="btn ${targetSteps === 128 ? 'btn-active' : ''}"
                        style="padding: 12px 6px; font-size: 0.85rem; font-weight: bold;"
                        onClick=${() => sendAction('setIacvSteps', 128)}
                        disabled=${!state.connected || isHoming}
                    >
                        HALF (128 STP)
                    </button>
                    <button 
                        class="btn ${targetSteps === 255 ? 'btn-active' : ''}"
                        style="padding: 12px 6px; font-size: 0.85rem; font-weight: bold;"
                        onClick=${() => sendAction('setIacvSteps', 255)}
                        disabled=${!state.connected || isHoming}
                    >
                        OPEN (255 STP)
                    </button>
                </div>
            </div>
        </div>

        ${modeSelector}
        
        <!-- AUTOMATED DIAGNOSTIC FUNCTIONS CARD -->
        <div class="panel" style="margin-top: var(--space-md); grid-column: 1 / -1; border-color: var(--neon-green);">
            <div class="panel-header" style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border-sharp); padding-bottom: 8px;">
                <span style="font-weight: 700; letter-spacing: 0.05em; color: var(--neon-green);">
                    🛠️ IACV VALVE DIAGNOSTIC & CALIBRATION SUITE
                </span>
                <span class="status-badge" style="border-color: var(--neon-green); color: var(--neon-green);">
                    ${isHoming ? 'HOMING...' : (currentSteps === targetSteps ? 'POSITION REACHED' : 'MOVING')}
                </span>
            </div>

            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px; margin-top: 12px;">
                <button 
                    class="btn"
                    style="padding: 14px 10px; font-weight: bold; border-color: var(--neon-green);"
                    onClick=${() => sendAction('iacvHome')}
                    disabled=${!state.connected || isHoming}
                >
                    🔄 AUTO HOME / KALIBRASI TITIK 0
                </button>

                <button 
                    class="btn"
                    style="padding: 14px 10px; font-weight: bold; border-color: var(--neon-blue);"
                    onClick=${() => sendAction('iacvCycle')}
                    disabled=${!state.connected || isHoming}
                >
                    🔁 CYCLE SWEEP TEST (BUKA-TUTUP OTOMATIS)
                </button>
            </div>

            <div style="margin-top: 12px; font-size: 0.8rem; color: var(--text-muted); line-height: 1.5; border-top: 1px dashed var(--border-sharp); padding-top: 8px;">
                💡 <strong>Catatan:</strong> Gunakan <em>Auto Home</em> sebelum pengujian agar katup mundur sampai mentok ke stopper mekanis dan mereset langkah ke posisi 0 secara presisi.
            </div>
        </div>
    `;
}
