import { html, useState, useEffect, useRef } from '../preact.js';
import { Dial } from './Dial.js';
import { CalibrationMatrixPanel } from './CalibrationMatrixPanel.js';

export function AdvancedTuningPanel({ 
    state, 
    sendAction, 
    maxRpmLimit = 16000, 
    onMaxRpmChange, 
    maxDwellLimit = 5.0, 
    onMaxDwellChange 
}) {
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

    // Probe Sensitivity Controls (5 Percentages + 1 Custom)
    const currentSens = state.coilLeakSensitivity || 1;
    const sensLabels = [
        { id: 1, name: "0% (10A)", tip: "Cut-In s/d 10 ARC" },
        { id: 2, name: "25% (20A)", tip: "Mikro s/d 20 ARC" },
        { id: 3, name: "50% (30A)", tip: "Sedang s/d 30 ARC" },
        { id: 4, name: "75% (40A)", tip: "Bocor s/d 40 ARC" },
        { id: 5, name: "100% (50A)", tip: "Jebol s/d 50 ARC" },
        { id: 6, name: "⚙️ CUSTOM", tip: "Atur Bebas" }
    ];

    const isDragTh = useRef(false), isDragDb = useRef(false);
    const [localTh, setLocalTh] = useState(state.coilLeakThreshold || 4);
    const [localDb, setLocalDb] = useState(state.coilLeakDebounceMs !== undefined ? Number(state.coilLeakDebounceMs).toFixed(1) : "3.0");

    useEffect(() => { if (!isDragTh.current && state.coilLeakThreshold !== undefined) setLocalTh(state.coilLeakThreshold); }, [state.coilLeakThreshold]);
    useEffect(() => { if (!isDragDb.current && state.coilLeakDebounceMs !== undefined) setLocalDb(Number(state.coilLeakDebounceMs).toFixed(1)); }, [state.coilLeakDebounceMs]);

    return html`
        <!-- ADVANCED TUNING, RANGE LIMITS, PROBE SENSITIVITY & CALIBRATION MATRIX (AT BOTTOM) -->
        <details class="panel" style="margin-top: 8px; grid-column: 1 / -1; border-color: var(--border-sharp); background: rgba(0,0,0,0.25);">
            <summary class="panel-header" style="cursor: pointer; user-select: none; font-size: 0.74rem; font-weight: 700; color: var(--neon-cyan); display: flex; justify-content: space-between; align-items: center;">
                <span>⚙️ PENGATURAN KALIBRASI, SENSITIFITAS & DIAGNOSIS ADVANCED ▾</span>
                <span style="font-size: 0.68rem; color: var(--text-muted); font-weight: normal;">
                    Batas: <strong>${maxRpmLimit} RPM / ${maxDwellLimit.toFixed(1)}ms</strong>
                </span>
            </summary>

            <div style="padding-top: 8px; display: flex; flex-direction: column; gap: 10px;">
                
                <!-- SECTION 1: BATAS ATAS RPM -->
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
                    <div style="display: flex; gap: 4px; align-items: center;">
                        <button class="btn" style="padding: 4px 8px; font-size: 0.68rem;" onClick=${() => adjustRpm(-100)} disabled=${!state.connected || isAutoDiag}>-100</button>
                        <button class="btn" style="padding: 4px 8px; font-size: 0.68rem;" onClick=${() => adjustRpm(-10)} disabled=${!state.connected || isAutoDiag}>-10</button>
                        <div style="flex: 1; padding: 0 4px;">
                            <input 
                                type="range" min="0" max=${maxRpmLimit} step="10" value=${currentRpm} 
                                style="width: 100%; accent-color: var(--neon-cyan);" 
                                onInput=${(e) => sendAction('setRpm', parseInt(e.target.value))} 
                                disabled=${!state.connected || isAutoDiag} 
                            />
                        </div>
                        <button class="btn" style="padding: 4px 8px; font-size: 0.68rem;" onClick=${() => adjustRpm(+10)} disabled=${!state.connected || isAutoDiag}>+10</button>
                        <button class="btn" style="padding: 4px 8px; font-size: 0.68rem;" onClick=${() => adjustRpm(+100)} disabled=${!state.connected || isAutoDiag}>+100</button>
                    </div>
                </div>

                <!-- SECTION 2: BATAS ATAS DWELL TIME -->
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
                    <div style="display: flex; gap: 4px; align-items: center;">
                        <button class="btn" style="padding: 4px 8px; font-size: 0.68rem;" onClick=${() => adjustDwell(-0.5)} disabled=${!state.connected || isAutoDiag}>-0.5</button>
                        <button class="btn" style="padding: 4px 8px; font-size: 0.68rem;" onClick=${() => adjustDwell(-0.1)} disabled=${!state.connected || isAutoDiag}>-0.1</button>
                        <div style="flex: 1; padding: 0 4px;">
                            <input 
                                type="range" min="0.0" max=${maxDwellLimit} step="0.05" value=${currentDwell} 
                                style="width: 100%; accent-color: var(--neon-purple);" 
                                onInput=${(e) => sendAction('setDwell', parseFloat(e.target.value))} 
                                disabled=${!state.connected || isAutoDiag} 
                            />
                        </div>
                        <button class="btn" style="padding: 4px 8px; font-size: 0.68rem;" onClick=${() => adjustDwell(+0.1)} disabled=${!state.connected || isAutoDiag}>+0.1</button>
                        <button class="btn" style="padding: 4px 8px; font-size: 0.68rem;" onClick=${() => adjustDwell(+0.5)} disabled=${!state.connected || isAutoDiag}>+0.5</button>
                    </div>
                </div>

                <!-- SECTION 3: 5-PARAMETER CALIBRATION & SUB-SENSITIVITIES MATRIX -->
                <${CalibrationMatrixPanel} state=${state} sendAction=${sendAction} />

                <!-- SECTION 4: SWEEP TIME & RPM STEP SIZE DIALS -->
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
                        disabled=${!state.connected || isAutoDiag}
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
