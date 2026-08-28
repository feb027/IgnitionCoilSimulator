import { html } from '../preact.js';

export function SweepControlPanel({ state, sendAction, maxRpmLimit = 16000, maxDwellLimit = 5.0 }) {
    const isRunning = state.isRunning;
    const targetRpm = state.rpm || 1000;
    const liveRpm = isRunning ? (state.currentRpm || targetRpm) : targetRpm;
    const dwell = state.dwellMs !== undefined ? Number(state.dwellMs) : 3.0;
    const sweepSec = state.sweepTimeSec || 5;
    const stepSize = state.rpmStep || 100;
    const duty = state.dutyCycle !== undefined ? state.dutyCycle.toFixed(1) : "0.0";

    const adjustRpm = (delta) => {
        const next = Math.max(200, Math.min(maxRpmLimit, targetRpm + delta));
        sendAction('setRpm', next);
    };

    const adjustDwell = (delta) => {
        const next = Math.max(0.2, Math.min(maxDwellLimit, Number((dwell + delta).toFixed(2))));
        sendAction('setDwell', next);
    };

    const sweepProgressPct = Math.min(100, Math.max(0, (liveRpm / maxRpmLimit) * 100));

    return html`
        <div class="panel" style="margin-top: 6px; grid-column: 1 / -1; background: rgba(0,0,0,0.45); border: 2px solid var(--neon-cyan); border-radius: 6px; padding: 10px 14px; box-shadow: 0 0 16px rgba(0, 212, 255, 0.15); box-sizing: border-box;">
            <!-- HEADER -->
            <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border-sharp); padding-bottom: 6px; margin-bottom: 8px; flex-wrap: wrap; gap: 6px;">
                <div style="display: flex; align-items: center; gap: 8px;">
                    <span style="font-size: 0.85rem; font-weight: 900; letter-spacing: 0.05em; color: var(--neon-cyan);">
                        🔄 PENGATURAN SWEEP OTOMATIS (SLIDE GESER)
                    </span>
                    <span class="status-badge" style="border-color: ${isRunning ? 'var(--neon-green)' : 'var(--neon-cyan)'}; color: ${isRunning ? 'var(--neon-green)' : 'var(--neon-cyan)'}; font-weight: 800; font-size: 0.65rem;">
                        ${isRunning ? '⚡ SWEEPING LIVE' : 'STANDBY'}
                    </span>
                </div>
                <div style="font-size: 0.72rem; color: var(--text-muted);">
                    Batas: <strong>${maxRpmLimit} RPM / ${maxDwellLimit.toFixed(1)}ms</strong>
                </div>
            </div>

            <!-- SLIDER 1: TARGET ENGINE SPEED (RPM) GESER KIRI KANAN -->
            <div style="background: rgba(0, 212, 255, 0.04); border: 1px solid rgba(0, 212, 255, 0.3); border-radius: 6px; padding: 8px 12px; margin-bottom: 8px;">
                <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 4px;">
                    <span style="font-size: 0.75rem; font-weight: 800; color: var(--neon-cyan);">🎯 TARGET RPM SAPUAN (ENGINE SPEED):</span>
                    <div style="font-size: 1.15rem; font-weight: 900; font-variant-numeric: tabular-nums; color: ${isRunning ? 'var(--neon-green)' : 'var(--neon-cyan)'};">
                        ${isRunning ? html`<span>LIVE: <strong style="color: var(--neon-green);">${liveRpm}</strong></span> <span style="font-size: 0.72rem; color: var(--text-muted);">/ ${targetRpm} RPM</span>` : html`<span>${targetRpm} <span style="font-size: 0.75rem; color: var(--text-muted);">RPM</span></span>`}
                    </div>
                </div>

                <!-- Live visual progress indicator during sweep -->
                <div style="width: 100%; height: 5px; background: rgba(255,255,255,0.06); border-radius: 3px; overflow: hidden; margin-bottom: 6px;">
                    <div style="width: ${sweepProgressPct}%; height: 100%; background: linear-gradient(90deg, #00d4ff, #00ff66); transition: width 0.1s linear;"></div>
                </div>

                <div style="display: flex; gap: 6px; align-items: center;">
                    <button class="btn" style="padding: 4px 8px; font-size: 0.7rem; font-weight: 800;" onClick=${() => adjustRpm(-500)} disabled=${!state.connected || isRunning}>-500</button>
                    <button class="btn" style="padding: 4px 8px; font-size: 0.7rem; font-weight: 800;" onClick=${() => adjustRpm(-100)} disabled=${!state.connected || isRunning}>-100</button>
                    <div style="flex: 1; padding: 0 4px; display: flex; align-items: center;">
                        <input 
                            type="range" 
                            min="200" 
                            max=${maxRpmLimit} 
                            step=${stepSize} 
                            value=${targetRpm} 
                            style="width: 100%; height: 26px; accent-color: var(--neon-cyan); cursor: pointer;" 
                            onInput=${(e) => sendAction('setRpm', parseInt(e.target.value))} 
                            disabled=${!state.connected || isRunning}
                        />
                    </div>
                    <button class="btn" style="padding: 4px 8px; font-size: 0.7rem; font-weight: 800;" onClick=${() => adjustRpm(+100)} disabled=${!state.connected || isRunning}>+100</button>
                    <button class="btn" style="padding: 4px 8px; font-size: 0.7rem; font-weight: 800;" onClick=${() => adjustRpm(+500)} disabled=${!state.connected || isRunning}>+500</button>
                </div>
            </div>

            <!-- SLIDER 2: DWELL TIME GESER KIRI KANAN -->
            <div style="background: rgba(189, 0, 255, 0.04); border: 1px solid rgba(189, 0, 255, 0.3); border-radius: 6px; padding: 8px 12px; margin-bottom: 8px;">
                <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 6px;">
                    <span style="font-size: 0.75rem; font-weight: 800; color: var(--neon-purple);">⏱️ WAKTU PENGISIAN DWELL TIME:</span>
                    <div style="font-size: 1.15rem; font-weight: 900; font-variant-numeric: tabular-nums; color: var(--neon-purple);">
                        ${dwell.toFixed(1)} <span style="font-size: 0.75rem; color: var(--text-muted);">MS</span> 
                        <span style="font-size: 0.72rem; color: var(--neon-cyan); margin-left: 6px;">(Duty ${duty}%)</span>
                    </div>
                </div>

                <div style="display: flex; gap: 6px; align-items: center;">
                    <button class="btn" style="padding: 4px 8px; font-size: 0.7rem; font-weight: 800;" onClick=${() => adjustDwell(-0.5)} disabled=${!state.connected}>-0.5</button>
                    <button class="btn" style="padding: 4px 8px; font-size: 0.7rem; font-weight: 800;" onClick=${() => adjustDwell(-0.1)} disabled=${!state.connected}>-0.1</button>
                    <div style="flex: 1; padding: 0 4px; display: flex; align-items: center;">
                        <input 
                            type="range" 
                            min="0.2" 
                            max=${maxDwellLimit} 
                            step="0.05" 
                            value=${dwell} 
                            style="width: 100%; height: 26px; accent-color: var(--neon-purple); cursor: pointer;" 
                            onInput=${(e) => sendAction('setDwell', parseFloat(e.target.value))} 
                            disabled=${!state.connected}
                        />
                    </div>
                    <button class="btn" style="padding: 4px 8px; font-size: 0.7rem; font-weight: 800;" onClick=${() => adjustDwell(+0.1)} disabled=${!state.connected}>+0.1</button>
                    <button class="btn" style="padding: 4px 8px; font-size: 0.7rem; font-weight: 800;" onClick=${() => adjustDwell(+0.5)} disabled=${!state.connected}>+0.5</button>
                </div>
            </div>

            <!-- SLIDER 3 & 4: SWEEP DURATION & STEP SIZE GESER KIRI KANAN -->
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 8px;">
                <!-- DURATION -->
                <div style="background: rgba(255,255,255,0.02); border: 1px solid var(--border-sharp); border-radius: 4px; padding: 6px 10px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.72rem; margin-bottom: 4px;">
                        <span style="font-weight: 700; color: var(--neon-yellow);">⏳ DURASI SAPUAN:</span>
                        <strong style="font-size: 0.85rem; color: var(--neon-yellow); font-variant-numeric: tabular-nums;">${sweepSec} Detik</strong>
                    </div>
                    <input 
                        type="range" min="1" max="60" step="1" value=${sweepSec} 
                        style="width: 100%; accent-color: var(--neon-yellow); cursor: pointer;" 
                        onInput=${(e) => sendAction('setSweepTime', parseInt(e.target.value))} 
                        disabled=${!state.connected || isRunning}
                    />
                </div>

                <!-- STEP SIZE -->
                <div style="background: rgba(255,255,255,0.02); border: 1px solid var(--border-sharp); border-radius: 4px; padding: 6px 10px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.72rem; margin-bottom: 4px;">
                        <span style="font-weight: 700; color: #A6FF00;">📈 KENAIKAN RPM (STEP):</span>
                        <strong style="font-size: 0.85rem; color: #A6FF00; font-variant-numeric: tabular-nums;">${stepSize} RPM</strong>
                    </div>
                    <input 
                        type="range" min="10" max="500" step="10" value=${stepSize} 
                        style="width: 100%; accent-color: #A6FF00; cursor: pointer;" 
                        onInput=${(e) => sendAction('setRpmStep', parseInt(e.target.value))} 
                        disabled=${!state.connected || isRunning}
                    />
                </div>
            </div>
        </div>
    `;
}
