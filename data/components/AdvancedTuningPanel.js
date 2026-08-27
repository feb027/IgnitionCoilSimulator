import { html, useState } from '../preact.js';
import { Dial } from './Dial.js';

export function AdvancedTuningPanel({ state, sendAction, maxRpmLimit = 16000 }) {
    const isSweep = state.runMode === 3;
    const isAutoDiag = state.coilAutoDiagRunning;
    const currentRpm = state.rpm || 800;
    const currentDwell = state.dwellMs !== undefined ? Number(state.dwellMs) : 3.0;

    const [fineRpmDelta, setFineRpmDelta] = useState(0);

    const adjustRpm = (delta) => {
        const nextRpm = Math.max(0, Math.min(maxRpmLimit, currentRpm + delta));
        sendAction('setRpm', nextRpm);
    };

    const adjustDwell = (delta) => {
        const nextDwell = Math.max(0.0, Math.min(5.0, Number((currentDwell + delta).toFixed(2))));
        sendAction('setDwell', nextDwell);
    };

    return html`
        <!-- ADVANCED TUNING, RANGE LIMITS & FINE SLIDERS (DIRECTLY BELOW SPEED & DWELL) -->
        <details class="panel" style="margin-top: 6px; grid-column: 1 / -1; border-color: var(--border-sharp); background: rgba(0,0,0,0.25);">
            <summary class="panel-header" style="cursor: pointer; user-select: none; font-size: 0.74rem; font-weight: 700; color: var(--neon-cyan); display: flex; justify-content: space-between; align-items: center;">
                <span>⚙️ ADVANCED SPEED & DWELL FINE TUNING ▾</span>
                <span style="font-size: 0.68rem; color: var(--text-muted); font-weight: normal;">
                    Step: <strong>${state.rpmStep || 50} RPM</strong> | Sweep: <strong>${state.sweepTimeSec || 5}s</strong>
                </span>
            </summary>

            <div style="padding-top: 8px; display: flex; flex-direction: column; gap: 10px;">
                
                <!-- ROW 1: FINE RPM ADJUSTMENT SLIDER & QUICK STEP BUTTONS -->
                <div style="background: rgba(255,255,255,0.02); border: 1px solid var(--border-sharp); border-radius: 4px; padding: 8px 10px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; font-size: 0.72rem;">
                        <span style="font-weight: bold; color: var(--neon-cyan);">🎛️ SPEED FINE TUNING (HALUS):</span>
                        <span style="color: var(--text-muted);">Current: <strong style="color: var(--neon-cyan);">${currentRpm} RPM</strong></span>
                    </div>
                    
                    <div style="display: flex; gap: 4px; align-items: center;">
                        <button class="btn" style="padding: 4px 8px; font-size: 0.68rem;" onClick=${() => adjustRpm(-100)} disabled=${!state.connected || isAutoDiag}>-100</button>
                        <button class="btn" style="padding: 4px 8px; font-size: 0.68rem;" onClick=${() => adjustRpm(-10)} disabled=${!state.connected || isAutoDiag}>-10</button>
                        
                        <div style="flex: 1; padding: 0 4px;">
                            <input 
                                type="range" 
                                min="0" 
                                max=${maxRpmLimit} 
                                step="10" 
                                value=${currentRpm} 
                                style="width: 100%; accent-color: var(--neon-cyan);" 
                                onInput=${(e) => sendAction('setRpm', parseInt(e.target.value))} 
                                disabled=${!state.connected || isAutoDiag} 
                            />
                        </div>

                        <button class="btn" style="padding: 4px 8px; font-size: 0.68rem;" onClick=${() => adjustRpm(+10)} disabled=${!state.connected || isAutoDiag}>+10</button>
                        <button class="btn" style="padding: 4px 8px; font-size: 0.68rem;" onClick=${() => adjustRpm(+100)} disabled=${!state.connected || isAutoDiag}>+100</button>
                    </div>
                </div>

                <!-- ROW 2: FINE DWELL ADJUSTMENT SLIDER (ALLOWS DOWN TO 0.0 MS) -->
                <div style="background: rgba(255,255,255,0.02); border: 1px solid var(--border-sharp); border-radius: 4px; padding: 8px 10px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; font-size: 0.72rem;">
                        <span style="font-weight: bold; color: var(--neon-purple);">⏱️ DWELL FINE TUNING (BATAS 0.0 - 5.0 MS):</span>
                        <span style="color: var(--text-muted);">Current: <strong style="color: var(--neon-purple);">${currentDwell.toFixed(1)} ms</strong></span>
                    </div>

                    <div style="display: flex; gap: 4px; align-items: center;">
                        <button class="btn" style="padding: 4px 8px; font-size: 0.68rem;" onClick=${() => adjustDwell(-0.5)} disabled=${!state.connected || isAutoDiag}>-0.5</button>
                        <button class="btn" style="padding: 4px 8px; font-size: 0.68rem;" onClick=${() => adjustDwell(-0.1)} disabled=${!state.connected || isAutoDiag}>-0.1</button>
                        
                        <div style="flex: 1; padding: 0 4px;">
                            <input 
                                type="range" 
                                min="0.0" 
                                max="5.0" 
                                step="0.05" 
                                value=${currentDwell} 
                                style="width: 100%; accent-color: var(--neon-purple);" 
                                onInput=${(e) => sendAction('setDwell', parseFloat(e.target.value))} 
                                disabled=${!state.connected || isAutoDiag} 
                            />
                        </div>

                        <button class="btn" style="padding: 4px 8px; font-size: 0.68rem;" onClick=${() => adjustDwell(+0.1)} disabled=${!state.connected || isAutoDiag}>+0.1</button>
                        <button class="btn" style="padding: 4px 8px; font-size: 0.68rem;" onClick=${() => adjustDwell(+0.5)} disabled=${!state.connected || isAutoDiag}>+0.5</button>
                    </div>
                </div>

                <!-- ROW 3: SWEEP TIME & RPM STEP SIZE DIALS -->
                <div class="responsive-grid-2" style="margin-top: 2px;">
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
                        disabled=${!state.connected || isAutoDiag || (state.runMode === 3 && state.isRunning)}
                    />
                    <${Dial} 
                        compact=${true}
                        label="RPM STEP SIZE"
                        value=${state.rpmStep}
                        unit="RPM"
                        min="10"
                        max="1000"
                        step="10"
                        onChange=${(val) => sendAction('setRpmStep', val)}
                        disabled=${!state.connected || isAutoDiag}
                    />
                </div>

            </div>
        </details>
    `;
}
