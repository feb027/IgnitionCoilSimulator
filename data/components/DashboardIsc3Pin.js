import { html } from '../preact.mjs';
import { Dial } from './Dial.js';

export function DashboardIsc3Pin({ state, sendAction, modeSelector }) {
    const openingPercent = (state.iscDuty !== undefined) ? state.iscDuty : 50;
    const iscFreq = state.iscFreq || 250;
    const rsoPercent = openingPercent;
    const rscPercent = (100 - openingPercent).toFixed(0);

    return html`
        <div class="panel-main" style="display: flex; flex-direction: column; gap: var(--space-md);">
            <div class="panel" style="padding: 20px;">
                <div class="panel-header" style="margin-bottom: 12px;">
                    <span>ROTARY VALVE POSITION</span>
                    <span class="badge ${state.isRunning ? 'badge-run' : ''}">
                        ${state.isRunning ? 'ACTIVE' : 'STANDBY'}
                    </span>
                </div>

                <!-- Visual Balance Bar -->
                <div style="background: rgba(0,0,0,0.4); border-radius: 8px; padding: 16px; border: 1px solid var(--border-color);">
                    <div style="display: flex; justify-content: space-between; font-size: 0.85rem; font-weight: bold; margin-bottom: 8px; opacity: 0.8;">
                        <span>◀ CLOSE (RSC: ${rscPercent}%)</span>
                        <span>50% MID</span>
                        <span>OPEN (RSO: ${rsoPercent}%) ▶</span>
                    </div>

                    <div style="position: relative; height: 28px; background: rgba(255,255,255,0.05); border-radius: 6px; overflow: hidden; border: 1px solid rgba(255,255,255,0.1);">
                        <!-- Center guideline -->
                        <div style="position: absolute; left: 50%; top: 0; bottom: 0; width: 2px; background: rgba(255,255,255,0.3); z-index: 2;"></div>
                        
                        <!-- Progress indicator bar -->
                        <div style="
                            position: absolute;
                            left: 0;
                            top: 0;
                            bottom: 0;
                            width: ${openingPercent}%;
                            background: linear-gradient(90deg, #ef4444 0%, #eab308 50%, #22c55e 100%);
                            border-radius: 4px;
                            transition: width 0.15s ease-out;
                            box-shadow: 0 0 12px rgba(34, 197, 94, 0.4);
                        "></div>
                    </div>
                </div>

                <div style="margin-top: 16px;">
                    <${Dial} 
                        label="VALVE OPENING TARGET"
                        value=${openingPercent}
                        unit="%"
                        min="0"
                        max="100"
                        step="1"
                        subInfo=${"Pin 33 (RSO): " + rsoPercent + "% | Pin 32 (RSC): " + rscPercent + "%"}
                        onChange=${(val) => sendAction('setIscDuty', val)}
                        disabled=${!state.connected}
                    />
                </div>
            </div>
        </div>
        
        <div class="panel-side-top" style="display: flex; flex-direction: column; gap: 16px;">
            <${Dial} 
                label="PWM FREQUENCY"
                value=${iscFreq}
                unit="Hz"
                min="50"
                max="500"
                step="10"
                subInfo="Standard Toyota/Denso ISC is ~250 Hz"
                onChange=${(val) => sendAction('setIscFreq', val)}
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
    `;
}
