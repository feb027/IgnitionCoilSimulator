import { html } from '../preact.js';

export function SweepControlPanel({ state, sendAction, maxRpmLimit = 16000, maxDwellLimit = 5.0 }) {
    const isRunning = state.isRunning;
    const minRpm = state.sweepMinRpm !== undefined ? state.sweepMinRpm : 500;
    const maxRpm = state.sweepMaxRpm !== undefined ? state.sweepMaxRpm : (state.rpm || 6000);
    const liveRpm = isRunning ? (state.currentRpm || minRpm) : minRpm;
    const dwell = state.dwellMs !== undefined ? Number(state.dwellMs) : 3.0;
    const sweepSec = state.sweepTimeSec || 5;
    const duty = state.dutyCycle !== undefined ? state.dutyCycle.toFixed(1) : "0.0";
    const rpmPerSec = sweepSec > 0 ? Math.round(Math.abs(maxRpm - minRpm) / sweepSec) : 0;

    const adjustMinRpm = (delta) => {
        const next = Math.max(200, Math.min(maxRpm - 200, minRpm + delta));
        sendAction('setSweepMinRpm', next);
    };

    const adjustMaxRpm = (delta) => {
        const next = Math.max(minRpm + 200, Math.min(maxRpmLimit, maxRpm + delta));
        sendAction('setSweepMaxRpm', next);
    };

    const adjustSweepSpeed = (delta) => {
        const next = Math.max(1, Math.min(60, sweepSec + delta));
        sendAction('setSweepTime', next);
    };

    const adjustDwell = (delta) => {
        const next = Math.max(0.2, Math.min(maxDwellLimit, Number((dwell + delta).toFixed(2))));
        sendAction('setDwell', next);
    };

    // Calculate live progress percentage within [minRpm .. maxRpm]
    const range = Math.max(100, maxRpm - minRpm);
    const liveSweepPct = Math.min(100, Math.max(0, ((liveRpm - minRpm) / range) * 100));

    const minPresets = [500, 800, 1000, 1500, 2000];
    const maxPresets = [4000, 6000, 8000, 12000, 16000];
    const speedPresets = [
        { sec: 1, label: "⚡ 1s (KILAT)" },
        { sec: 3, label: "🚀 3s (CEPAT)" },
        { sec: 5, label: "⏱️ 5s (NORMAL)" },
        { sec: 10, label: "🐢 10s (LAMBAT)" },
        { sec: 20, label: "🧘 20s (SANGAT LAMBAT)" }
    ];

    return html`
        <div class="panel" style="margin-top: 6px; grid-column: 1 / -1; background: rgba(0,0,0,0.5); border: 2px solid var(--neon-cyan); border-radius: 6px; padding: 10px 14px; box-shadow: 0 0 16px rgba(0, 212, 255, 0.15); box-sizing: border-box;">
            <!-- HEADER -->
            <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border-sharp); padding-bottom: 6px; margin-bottom: 10px; flex-wrap: wrap; gap: 6px;">
                <div style="display: flex; align-items: center; gap: 8px;">
                    <span style="font-size: 0.88rem; font-weight: 900; letter-spacing: 0.05em; color: var(--neon-cyan);">
                        🔄 KONTROL SAPUAN RPM (SWEEP CONTROLLER)
                    </span>
                    <span class="status-badge" style="border-color: ${isRunning ? 'var(--neon-green)' : 'var(--neon-cyan)'}; color: ${isRunning ? 'var(--neon-green)' : 'var(--neon-cyan)'}; font-weight: 800; font-size: 0.68rem;">
                        ${isRunning ? `⚡ SWEEPING: ${liveRpm} RPM` : 'STANDBY'}
                    </span>
                </div>
                <div style="font-size: 0.72rem; color: var(--text-muted);">
                    Rentang Sapuan: <strong style="color: var(--neon-cyan);">${minRpm}</strong> s/d <strong style="color: var(--neon-green);">${maxRpm} RPM</strong>
                </div>
            </div>

            <!-- LIVE SWEEP VISUALIZER BAR -->
            <div style="background: rgba(0, 212, 255, 0.06); border: 1px solid rgba(0, 212, 255, 0.25); border-radius: 6px; padding: 8px 12px; margin-bottom: 10px;">
                <div style="display: flex; justify-content: space-between; font-size: 0.75rem; font-weight: 800; margin-bottom: 4px;">
                    <span style="color: var(--neon-cyan);">📉 MIN: ${minRpm} RPM</span>
                    <span style="color: ${isRunning ? 'var(--neon-green)' : 'var(--text-muted)'}; font-variant-numeric: tabular-nums;">
                        ${isRunning ? `LIVE: ${liveRpm} RPM (${Math.round(liveSweepPct)}%)` : 'STANDBY (SIAP DISAPU)'}
                    </span>
                    <span style="color: var(--neon-green);">📈 MAX: ${maxRpm} RPM</span>
                </div>
                <div style="width: 100%; height: 8px; background: rgba(255,255,255,0.08); border-radius: 4px; overflow: hidden; position: relative;">
                    <div style="width: ${liveSweepPct}%; height: 100%; background: linear-gradient(90deg, #00d4ff, #00ff66); transition: width 0.08s linear;"></div>
                </div>
            </div>

            <!-- GRID 2 KOLOM: SLIDER BATAS BAWAH (MIN RPM) & BATAS ATAS (MAX RPM) -->
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 10px; margin-bottom: 10px;">
                
                <!-- SLIDER 1: BATAS BAWAH SAPUAN RPM (MIN RPM) -->
                <div style="background: rgba(0, 212, 255, 0.03); border: 1px solid rgba(0, 212, 255, 0.3); border-radius: 6px; padding: 8px 10px;">
                    <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 4px;">
                        <span style="font-size: 0.72rem; font-weight: 800; color: var(--neon-cyan);">📉 BATAS BAWAH SAPUAN (MIN):</span>
                        <div style="font-size: 1.05rem; font-weight: 900; font-variant-numeric: tabular-nums; color: var(--neon-cyan);">
                            ${minRpm} <span style="font-size: 0.7rem; color: var(--text-muted);">RPM</span>
                        </div>
                    </div>
                    
                    <!-- Min Presets -->
                    <div style="display: flex; gap: 4px; margin-bottom: 6px; flex-wrap: wrap;">
                        ${minPresets.map(p => html`
                            <button 
                                class="btn ${minRpm === p ? 'btn-active' : ''}" 
                                style="padding: 2px 6px; font-size: 0.65rem; border-color: ${minRpm === p ? 'var(--neon-cyan)' : 'var(--border-sharp)'}; background: ${minRpm === p ? 'rgba(0, 212, 255, 0.2)' : 'transparent'}; color: ${minRpm === p ? 'var(--neon-cyan)' : 'var(--text-muted)'};"
                                onClick=${() => sendAction('setSweepMinRpm', p)}
                                disabled=${!state.connected || isRunning}
                            >
                                ${p === 500 ? '500 (Idle)' : p}
                            </button>
                        `)}
                    </div>

                    <div style="display: flex; gap: 4px; align-items: center;">
                        <button class="btn" style="padding: 4px 6px; font-size: 0.68rem; font-weight: 800;" onClick=${() => adjustMinRpm(-100)} disabled=${!state.connected || isRunning}>-100</button>
                        <div style="flex: 1; padding: 0 4px; display: flex; align-items: center;">
                            <input 
                                type="range" min="200" max="8000" step="50" value=${minRpm} 
                                style="width: 100%; height: 24px; accent-color: var(--neon-cyan); cursor: pointer;" 
                                onInput=${(e) => sendAction('setSweepMinRpm', parseInt(e.target.value))} 
                                disabled=${!state.connected || isRunning}
                            />
                        </div>
                        <button class="btn" style="padding: 4px 6px; font-size: 0.68rem; font-weight: 800;" onClick=${() => adjustMinRpm(+100)} disabled=${!state.connected || isRunning}>+100</button>
                    </div>
                </div>

                <!-- SLIDER 2: BATAS ATAS SAPUAN RPM (MAX RPM) -->
                <div style="background: rgba(0, 255, 102, 0.03); border: 1px solid rgba(0, 255, 102, 0.3); border-radius: 6px; padding: 8px 10px;">
                    <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 4px;">
                        <span style="font-size: 0.72rem; font-weight: 800; color: var(--neon-green);">📈 BATAS ATAS SAPUAN (MAX):</span>
                        <div style="font-size: 1.05rem; font-weight: 900; font-variant-numeric: tabular-nums; color: var(--neon-green);">
                            ${maxRpm} <span style="font-size: 0.7rem; color: var(--text-muted);">RPM</span>
                        </div>
                    </div>
                    
                    <!-- Max Presets -->
                    <div style="display: flex; gap: 4px; margin-bottom: 6px; flex-wrap: wrap;">
                        ${maxPresets.map(p => html`
                            <button 
                                class="btn ${maxRpm === p ? 'btn-active' : ''}" 
                                style="padding: 2px 6px; font-size: 0.65rem; border-color: ${maxRpm === p ? 'var(--neon-green)' : 'var(--border-sharp)'}; background: ${maxRpm === p ? 'rgba(0, 255, 102, 0.2)' : 'transparent'}; color: ${maxRpm === p ? 'var(--neon-green)' : 'var(--text-muted)'};"
                                onClick=${() => sendAction('setSweepMaxRpm', p)}
                                disabled=${!state.connected || isRunning}
                            >
                                ${p}
                            </button>
                        `)}
                    </div>

                    <div style="display: flex; gap: 4px; align-items: center;">
                        <button class="btn" style="padding: 4px 6px; font-size: 0.68rem; font-weight: 800;" onClick=${() => adjustMaxRpm(-500)} disabled=${!state.connected || isRunning}>-500</button>
                        <button class="btn" style="padding: 4px 6px; font-size: 0.68rem; font-weight: 800;" onClick=${() => adjustMaxRpm(-100)} disabled=${!state.connected || isRunning}>-100</button>
                        <div style="flex: 1; padding: 0 4px; display: flex; align-items: center;">
                            <input 
                                type="range" min="1000" max=${maxRpmLimit} step="100" value=${maxRpm} 
                                style="width: 100%; height: 24px; accent-color: var(--neon-green); cursor: pointer;" 
                                onInput=${(e) => sendAction('setSweepMaxRpm', parseInt(e.target.value))} 
                                disabled=${!state.connected || isRunning}
                            />
                        </div>
                        <button class="btn" style="padding: 4px 6px; font-size: 0.68rem; font-weight: 800;" onClick=${() => adjustMaxRpm(+100)} disabled=${!state.connected || isRunning}>+100</button>
                        <button class="btn" style="padding: 4px 6px; font-size: 0.68rem; font-weight: 800;" onClick=${() => adjustMaxRpm(+500)} disabled=${!state.connected || isRunning}>+500</button>
                    </div>
                </div>
            </div>

            <!-- SLIDER 3: KECEPATAN SAPUAN (SWEEP SPEED / DURASI) -->
            <div style="background: rgba(255, 214, 0, 0.03); border: 1px solid rgba(255, 214, 0, 0.3); border-radius: 6px; padding: 8px 12px; margin-bottom: 10px;">
                <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 4px; flex-wrap: wrap; gap: 4px;">
                    <span style="font-size: 0.75rem; font-weight: 800; color: var(--neon-yellow);">⚡ KECEPATAN SAPUAN (DURASI SWEEP):</span>
                    <div style="font-size: 1.05rem; font-weight: 900; font-variant-numeric: tabular-nums; color: var(--neon-yellow);">
                        ${sweepSec} <span style="font-size: 0.72rem; color: var(--text-muted);">DETIK</span>
                        <span style="font-size: 0.72rem; color: #A6FF00; margin-left: 8px; font-weight: normal;">(Laju: ~${rpmPerSec} RPM/dtk)</span>
                    </div>
                </div>

                <!-- Speed Presets -->
                <div style="display: flex; gap: 4px; margin-bottom: 6px; flex-wrap: wrap;">
                    ${speedPresets.map(sp => html`
                        <button 
                            class="btn ${sweepSec === sp.sec ? 'btn-active' : ''}" 
                            style="padding: 2px 6px; font-size: 0.65rem; border-color: ${sweepSec === sp.sec ? 'var(--neon-yellow)' : 'var(--border-sharp)'}; background: ${sweepSec === sp.sec ? 'rgba(255, 214, 0, 0.2)' : 'transparent'}; color: ${sweepSec === sp.sec ? 'var(--neon-yellow)' : 'var(--text-muted)'};"
                            onClick=${() => sendAction('setSweepTime', sp.sec)}
                            disabled=${!state.connected || isRunning}
                        >
                            ${sp.label}
                        </button>
                    `)}
                </div>

                <div style="display: flex; gap: 6px; align-items: center;">
                    <button class="btn" style="padding: 4px 8px; font-size: 0.7rem; font-weight: 800;" onClick=${() => adjustSweepSpeed(-1)} disabled=${!state.connected || isRunning}>-1s (Lebih Cepat)</button>
                    <div style="flex: 1; padding: 0 4px; display: flex; align-items: center;">
                        <input 
                            type="range" min="1" max="60" step="1" value=${sweepSec} 
                            style="width: 100%; height: 26px; accent-color: var(--neon-yellow); cursor: pointer;" 
                            onInput=${(e) => sendAction('setSweepTime', parseInt(e.target.value))} 
                            disabled=${!state.connected || isRunning}
                        />
                    </div>
                    <button class="btn" style="padding: 4px 8px; font-size: 0.7rem; font-weight: 800;" onClick=${() => adjustSweepSpeed(+1)} disabled=${!state.connected || isRunning}>+1s (Lebih Lambat)</button>
                </div>
            </div>

            <!-- SLIDER 4: DWELL TIME GESER KIRI KANAN -->
            <div style="background: rgba(189, 0, 255, 0.03); border: 1px solid rgba(189, 0, 255, 0.3); border-radius: 6px; padding: 8px 12px;">
                <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 6px;">
                    <span style="font-size: 0.75rem; font-weight: 800; color: var(--neon-purple);">⏱️ WAKTU PENGISIAN DWELL TIME:</span>
                    <div style="font-size: 1.05rem; font-weight: 900; font-variant-numeric: tabular-nums; color: var(--neon-purple);">
                        ${dwell.toFixed(1)} <span style="font-size: 0.72rem; color: var(--text-muted);">MS</span> 
                        <span style="font-size: 0.72rem; color: var(--neon-cyan); margin-left: 6px;">(Duty ${duty}%)</span>
                    </div>
                </div>

                <div style="display: flex; gap: 6px; align-items: center;">
                    <button class="btn" style="padding: 4px 8px; font-size: 0.7rem; font-weight: 800;" onClick=${() => adjustDwell(-0.5)} disabled=${!state.connected}>-0.5</button>
                    <button class="btn" style="padding: 4px 8px; font-size: 0.7rem; font-weight: 800;" onClick=${() => adjustDwell(-0.1)} disabled=${!state.connected}>-0.1</button>
                    <div style="flex: 1; padding: 0 4px; display: flex; align-items: center;">
                        <input 
                            type="range" min="0.2" max=${maxDwellLimit} step="0.05" value=${dwell} 
                            style="width: 100%; height: 26px; accent-color: var(--neon-purple); cursor: pointer;" 
                            onInput=${(e) => sendAction('setDwell', parseFloat(e.target.value))} 
                            disabled=${!state.connected}
                        />
                    </div>
                    <button class="btn" style="padding: 4px 8px; font-size: 0.7rem; font-weight: 800;" onClick=${() => adjustDwell(+0.1)} disabled=${!state.connected}>+0.1</button>
                    <button class="btn" style="padding: 4px 8px; font-size: 0.7rem; font-weight: 800;" onClick=${() => adjustDwell(+0.5)} disabled=${!state.connected}>+0.5</button>
                </div>
            </div>
        </div>
    `;
}
