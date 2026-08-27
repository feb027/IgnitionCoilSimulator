import { html, useState } from '../preact.js';
import { Dial } from './Dial.js';

export function AdvancedTuningPanel({ 
    state, 
    sendAction, 
    maxRpmLimit = 16000, 
    onMaxRpmChange, 
    maxDwellLimit = 5.0, 
    onMaxDwellChange 
}) {
    const isSweep = state.runMode === 3;
    const isAutoDiag = state.coilAutoDiagRunning;
    const currentRpm = state.rpm || 800;
    const currentDwell = state.dwellMs !== undefined ? Number(state.dwellMs) : 3.0;

    const rpmPresets = [4000, 6000, 8000, 12000, 16000];
    const dwellPresets = [2.0, 3.0, 3.5, 4.0, 5.0];

    const adjustRpm = (delta) => {
        const nextRpm = Math.max(0, Math.min(maxRpmLimit, currentRpm + delta));
        sendAction('setRpm', nextRpm);
    };

    const adjustDwell = (delta) => {
        const nextDwell = Math.max(0.0, Math.min(maxDwellLimit, Number((currentDwell + delta).toFixed(2))));
        sendAction('setDwell', nextDwell);
    };

    return html`
        <!-- ADVANCED TUNING, RANGE LIMITS & FINE SLIDERS (DIRECTLY BELOW SPEED & DWELL) -->
        <details class="panel" style="margin-top: 6px; grid-column: 1 / -1; border-color: var(--border-sharp); background: rgba(0,0,0,0.25);">
            <summary class="panel-header" style="cursor: pointer; user-select: none; font-size: 0.74rem; font-weight: 700; color: var(--neon-cyan); display: flex; justify-content: space-between; align-items: center;">
                <span>⚙️ BATAS RENTANG & FINE TUNING (SPEED & DWELL) ▾</span>
                <span style="font-size: 0.68rem; color: var(--text-muted); font-weight: normal;">
                    Batas: <strong>${maxRpmLimit} RPM / ${maxDwellLimit.toFixed(1)}ms</strong>
                </span>
            </summary>

            <div style="padding-top: 8px; display: flex; flex-direction: column; gap: 10px;">
                
                <!-- SECTION 1: BATAS ATAS RPM (MAX SPEED LIMIT SELECTION & FINE SLIDER) -->
                <div style="background: rgba(255,255,255,0.02); border: 1px solid var(--border-sharp); border-radius: 4px; padding: 8px 10px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; font-size: 0.72rem; flex-wrap: wrap; gap: 4px;">
                        <span style="font-weight: bold; color: var(--neon-cyan);">🎯 BATAS SKALA ENGINE SPEED (0 - 100%):</span>
                        <div style="display: flex; gap: 4px;">
                            ${rpmPresets.map(preset => html`
                                <button 
                                    class="btn ${maxRpmLimit === preset ? 'btn-active' : ''}" 
                                    style="padding: 2px 6px; font-size: 0.68rem; border-color: ${maxRpmLimit === preset ? 'var(--neon-cyan)' : 'var(--border-sharp)'}; background: ${maxRpmLimit === preset ? 'rgba(0, 212, 255, 0.2)' : 'transparent'}; color: ${maxRpmLimit === preset ? 'var(--neon-cyan)' : 'var(--text-muted)'};"
                                    onClick=${() => onMaxRpmChange && onMaxRpmChange(preset)}
                                >
                                    ${preset}
                                </button>
                            `)}
                        </div>
                    </div>
                    
                    <!-- Fine RPM Adjustment Slider -->
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
                    <div style="font-size: 0.65rem; color: var(--text-muted); margin-top: 4px; text-align: right;">
                        Slide dial utama di atas kini bergerak presisi dari <strong>0 s/d ${maxRpmLimit} RPM</strong>.
                    </div>
                </div>

                <!-- SECTION 2: BATAS ATAS DWELL TIME (MAX DWELL LIMIT SELECTION & FINE SLIDER) -->
                <div style="background: rgba(255,255,255,0.02); border: 1px solid var(--border-sharp); border-radius: 4px; padding: 8px 10px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; font-size: 0.72rem; flex-wrap: wrap; gap: 4px;">
                        <span style="font-weight: bold; color: var(--neon-purple);">⏱️ BATAS SKALA DWELL TIME (0.0 - ${maxDwellLimit.toFixed(1)} MS):</span>
                        <div style="display: flex; gap: 4px;">
                            ${dwellPresets.map(preset => html`
                                <button 
                                    class="btn ${maxDwellLimit === preset ? 'btn-active' : ''}" 
                                    style="padding: 2px 6px; font-size: 0.68rem; border-color: ${maxDwellLimit === preset ? 'var(--neon-purple)' : 'var(--border-sharp)'}; background: ${maxDwellLimit === preset ? 'rgba(189, 0, 255, 0.2)' : 'transparent'}; color: ${maxDwellLimit === preset ? 'var(--neon-purple)' : 'var(--text-muted)'};"
                                    onClick=${() => onMaxDwellChange && onMaxDwellChange(preset)}
                                >
                                    ${preset.toFixed(1)}ms
                                </button>
                            `)}
                        </div>
                    </div>

                    <!-- Fine Dwell Adjustment Slider -->
                    <div style="display: flex; gap: 4px; align-items: center;">
                        <button class="btn" style="padding: 4px 8px; font-size: 0.68rem;" onClick=${() => adjustDwell(-0.5)} disabled=${!state.connected || isAutoDiag}>-0.5</button>
                        <button class="btn" style="padding: 4px 8px; font-size: 0.68rem;" onClick=${() => adjustDwell(-0.1)} disabled=${!state.connected || isAutoDiag}>-0.1</button>
                        
                        <div style="flex: 1; padding: 0 4px;">
                            <input 
                                type="range" 
                                min="0.0" 
                                max=${maxDwellLimit} 
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
                    <div style="font-size: 0.65rem; color: var(--text-muted); margin-top: 4px; text-align: right;">
                        Slide dial dwell utama di atas kini bergerak dari <strong>0.0 s/d ${maxDwellLimit.toFixed(1)} ms</strong>.
                    </div>
                </div>

                <!-- SECTION 3: SWEEP TIME & RPM STEP SIZE DIALS -->
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
