import { html, useState, useEffect, useRef } from '../preact.js';

export function SweepControlPanel({ state, sendAction, maxRpmLimit = 16000, maxDwellLimit = 5.0 }) {
    const isRunning = state.isRunning;
    const minRpm = state.sweepMinRpm !== undefined ? state.sweepMinRpm : 500;
    const maxRpm = state.sweepMaxRpm !== undefined ? state.sweepMaxRpm : (state.rpm || 6000);
    const liveRpm = isRunning ? (state.currentRpm || minRpm) : minRpm;
    const dwell = state.dwellMs !== undefined ? Number(state.dwellMs) : 3.0;
    const sweepSec = state.sweepTimeSec !== undefined ? Number(state.sweepTimeSec) : 5.0;
    const duty = state.dutyCycle !== undefined ? state.dutyCycle.toFixed(1) : "0.0";
    const rpmPerSec = sweepSec > 0 ? Math.round(Math.abs(maxRpm - minRpm) / sweepSec) : 0;

    // Smooth real-time local drag state tracking for 100% interactive responsiveness
    const isDragMin = useRef(false);
    const isDragMax = useRef(false);
    const isDragSpeed = useRef(false);
    const isDragDwell = useRef(false);

    const [localMin, setLocalMin] = useState(minRpm);
    const [localMax, setLocalMax] = useState(maxRpm);
    const [localSpeed, setLocalSpeed] = useState(sweepSec);
    const [localDwell, setLocalDwell] = useState(dwell);

    useEffect(() => { if (!isDragMin.current) setLocalMin(minRpm); }, [minRpm]);
    useEffect(() => { if (!isDragMax.current) setLocalMax(maxRpm); }, [maxRpm]);
    useEffect(() => { if (!isDragSpeed.current) setLocalSpeed(sweepSec); }, [sweepSec]);
    useEffect(() => { if (!isDragDwell.current) setLocalDwell(dwell); }, [dwell]);

    const adjustMinRpm = (delta) => {
        const next = Math.max(200, Math.min(localMax - 200, localMin + delta));
        setLocalMin(next);
        sendAction('setSweepMinRpm', next);
    };

    const adjustMaxRpm = (delta) => {
        const next = Math.max(localMin + 200, Math.min(maxRpmLimit, localMax + delta));
        setLocalMax(next);
        sendAction('setSweepMaxRpm', next);
    };

    const adjustSweepSpeed = (delta) => {
        const next = Math.max(0.2, Math.min(30.0, Number((localSpeed + delta).toFixed(1))));
        setLocalSpeed(next);
        sendAction('setSweepTime', next);
    };

    const adjustDwell = (delta) => {
        const next = Math.max(0.2, Math.min(maxDwellLimit, Number((localDwell + delta).toFixed(2))));
        setLocalDwell(next);
        sendAction('setDwell', next);
    };

    // Calculate live progress percentage within [minRpm .. maxRpm]
    const range = Math.max(100, maxRpm - minRpm);
    const liveSweepPct = Math.min(100, Math.max(0, ((liveRpm - minRpm) / range) * 100));

    const minPresets = [500, 800, 1000, 1500, 2000];
    const maxPresets = [4000, 6000, 8000, 12000, 16000];
    const speedPresets = [
        { sec: 0.2, label: "⚡ 0.2s (MAX FAST)" },
        { sec: 0.5, label: "⚡ 0.5s (ULTRA FAST)" },
        { sec: 1.0, label: "🚀 1s (KILAT)" },
        { sec: 2.0, label: "🏎️ 2s (SGT CEPAT)" },
        { sec: 3.0, label: "🏎️ 3s (CEPAT)" },
        { sec: 5.0, label: "⏱️ 5s (NORMAL)" },
        { sec: 10.0, label: "🐢 10s (LAMBAT)" },
        { sec: 20.0, label: "🧘 20s" }
    ];

    return html`
        <div class="panel" style="margin-top: 6px; grid-column: 1 / -1; background: rgba(0,0,0,0.5); border: 2px solid var(--neon-cyan); border-radius: 6px; padding: 10px 14px; box-shadow: 0 0 16px rgba(0, 212, 255, 0.15); box-sizing: border-box;">
            <!-- HEADER -->
            <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border-sharp); padding-bottom: 6px; margin-bottom: 10px; flex-wrap: wrap; gap: 6px;">
                <div style="display: flex; align-items: center; gap: 8px;">
                    <span style="font-size: 0.88rem; font-weight: 900; letter-spacing: 0.05em; color: var(--neon-cyan);">
                        🔄 KONTROL SAPUAN RPM (LIVE REAL-TIME)
                    </span>
                    <span class="status-badge" style="border-color: ${isRunning ? 'var(--neon-green)' : 'var(--neon-cyan)'}; color: ${isRunning ? 'var(--neon-green)' : 'var(--neon-cyan)'}; font-weight: 800; font-size: 0.68rem;">
                        ${isRunning ? `⚡ SWEEPING: ${liveRpm} RPM` : 'STANDBY'}
                    </span>
                </div>
                <div style="font-size: 0.72rem; color: var(--text-muted);">
                    Rentang: <strong style="color: var(--neon-cyan);">${localMin}</strong> s/d <strong style="color: var(--neon-green);">${localMax} RPM</strong>
                </div>
            </div>

            <!-- LIVE SWEEP VISUALIZER BAR -->
            <div style="background: rgba(0, 212, 255, 0.06); border: 1px solid rgba(0, 212, 255, 0.25); border-radius: 6px; padding: 8px 12px; margin-bottom: 10px;">
                <div style="display: flex; justify-content: space-between; font-size: 0.75rem; font-weight: 800; margin-bottom: 4px;">
                    <span style="color: var(--neon-cyan);">📉 MIN: ${localMin} RPM</span>
                    <span style="color: ${isRunning ? 'var(--neon-green)' : 'var(--text-muted)'}; font-variant-numeric: tabular-nums;">
                        ${isRunning ? `LIVE: ${liveRpm} RPM (${Math.round(liveSweepPct)}%)` : 'STANDBY (SIAP DISAPU)'}
                    </span>
                    <span style="color: var(--neon-green);">📈 MAX: ${localMax} RPM</span>
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
                            ${localMin} <span style="font-size: 0.7rem; color: var(--text-muted);">RPM</span>
                        </div>
                    </div>
                    
                    <!-- Min Presets -->
                    <div style="display: flex; gap: 4px; margin-bottom: 6px; flex-wrap: wrap;">
                        ${minPresets.map(p => html`
                            <button 
                                class="btn ${localMin === p ? 'btn-active' : ''}" 
                                style="padding: 2px 6px; font-size: 0.65rem; border-color: ${localMin === p ? 'var(--neon-cyan)' : 'var(--border-sharp)'}; background: ${localMin === p ? 'rgba(0, 212, 255, 0.2)' : 'transparent'}; color: ${localMin === p ? 'var(--neon-cyan)' : 'var(--text-muted)'};"
                                onClick=${() => { setLocalMin(p); sendAction('setSweepMinRpm', p); }}
                                disabled=${!state.connected}
                            >
                                ${p === 500 ? '500 (Idle)' : p}
                            </button>
                        `)}
                    </div>

                    <div style="display: flex; gap: 4px; align-items: center;">
                        <button class="btn" style="padding: 4px 6px; font-size: 0.68rem; font-weight: 800;" onClick=${() => adjustMinRpm(-100)} disabled=${!state.connected}>-100</button>
                        <div style="flex: 1; padding: 0 4px; display: flex; align-items: center;">
                            <input 
                                type="range" min="200" max="8000" step="50" value=${localMin} 
                                style="width: 100%; height: 24px; accent-color: var(--neon-cyan); cursor: pointer;" 
                                onPointerDown=${() => { isDragMin.current = true; }}
                                onPointerUp=${() => { isDragMin.current = false; }}
                                onInput=${(e) => {
                                    const val = parseInt(e.target.value);
                                    setLocalMin(val);
                                    sendAction('setSweepMinRpm', val);
                                }} 
                                disabled=${!state.connected}
                            />
                        </div>
                        <button class="btn" style="padding: 4px 6px; font-size: 0.68rem; font-weight: 800;" onClick=${() => adjustMinRpm(+100)} disabled=${!state.connected}>+100</button>
                    </div>
                </div>

                <!-- SLIDER 2: BATAS ATAS SAPUAN RPM (MAX RPM) -->
                <div style="background: rgba(0, 255, 102, 0.03); border: 1px solid rgba(0, 255, 102, 0.3); border-radius: 6px; padding: 8px 10px;">
                    <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 4px;">
                        <span style="font-size: 0.72rem; font-weight: 800; color: var(--neon-green);">📈 BATAS ATAS SAPUAN (MAX):</span>
                        <div style="font-size: 1.05rem; font-weight: 900; font-variant-numeric: tabular-nums; color: var(--neon-green);">
                            ${localMax} <span style="font-size: 0.7rem; color: var(--text-muted);">RPM</span>
                        </div>
                    </div>
                    
                    <!-- Max Presets -->
                    <div style="display: flex; gap: 4px; margin-bottom: 6px; flex-wrap: wrap;">
                        ${maxPresets.map(p => html`
                            <button 
                                class="btn ${localMax === p ? 'btn-active' : ''}" 
                                style="padding: 2px 6px; font-size: 0.65rem; border-color: ${localMax === p ? 'var(--neon-green)' : 'var(--border-sharp)'}; background: ${localMax === p ? 'rgba(0, 255, 102, 0.2)' : 'transparent'}; color: ${localMax === p ? 'var(--neon-green)' : 'var(--text-muted)'};"
                                onClick=${() => { setLocalMax(p); sendAction('setSweepMaxRpm', p); }}
                                disabled=${!state.connected}
                            >
                                ${p}
                            </button>
                        `)}
                    </div>

                    <div style="display: flex; gap: 4px; align-items: center;">
                        <button class="btn" style="padding: 4px 6px; font-size: 0.68rem; font-weight: 800;" onClick=${() => adjustMaxRpm(-500)} disabled=${!state.connected}>-500</button>
                        <button class="btn" style="padding: 4px 6px; font-size: 0.68rem; font-weight: 800;" onClick=${() => adjustMaxRpm(-100)} disabled=${!state.connected}>-100</button>
                        <div style="flex: 1; padding: 0 4px; display: flex; align-items: center;">
                            <input 
                                type="range" min="1000" max=${maxRpmLimit} step="100" value=${localMax} 
                                style="width: 100%; height: 24px; accent-color: var(--neon-green); cursor: pointer;" 
                                onPointerDown=${() => { isDragMax.current = true; }}
                                onPointerUp=${() => { isDragMax.current = false; }}
                                onInput=${(e) => {
                                    const val = parseInt(e.target.value);
                                    setLocalMax(val);
                                    sendAction('setSweepMaxRpm', val);
                                }} 
                                disabled=${!state.connected}
                            />
                        </div>
                        <button class="btn" style="padding: 4px 6px; font-size: 0.68rem; font-weight: 800;" onClick=${() => adjustMaxRpm(+100)} disabled=${!state.connected}>+100</button>
                        <button class="btn" style="padding: 4px 6px; font-size: 0.68rem; font-weight: 800;" onClick=${() => adjustMaxRpm(+500)} disabled=${!state.connected}>+500</button>
                    </div>
                </div>
            </div>

            <!-- SLIDER 3: KECEPATAN SAPUAN (SWEEP SPEED / DURASI) DENGAN JUMP -5s & SUB-SECOND SPEEDS -->
            <div style="background: rgba(255, 214, 0, 0.03); border: 1px solid rgba(255, 214, 0, 0.3); border-radius: 6px; padding: 8px 12px; margin-bottom: 10px;">
                <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 4px; flex-wrap: wrap; gap: 4px;">
                    <span style="font-size: 0.75rem; font-weight: 800; color: var(--neon-yellow);">⚡ KECEPATAN SAPUAN (DURASI SWEEP):</span>
                    <div style="font-size: 1.05rem; font-weight: 900; font-variant-numeric: tabular-nums; color: var(--neon-yellow);">
                        ${localSpeed.toFixed(1)} <span style="font-size: 0.72rem; color: var(--text-muted);">DETIK</span>
                        <span style="font-size: 0.72rem; color: #A6FF00; margin-left: 8px; font-weight: normal;">(Laju: ~${rpmPerSec} RPM/dtk)</span>
                    </div>
                </div>

                <!-- Speed Presets with Sub-Second Ultra Fast Speeds -->
                <div style="display: flex; gap: 4px; margin-bottom: 6px; flex-wrap: wrap;">
                    ${speedPresets.map(sp => html`
                        <button 
                            class="btn ${Math.abs(localSpeed - sp.sec) < 0.05 ? 'btn-active' : ''}" 
                            style="padding: 2px 6px; font-size: 0.65rem; border-color: ${Math.abs(localSpeed - sp.sec) < 0.05 ? 'var(--neon-yellow)' : 'var(--border-sharp)'}; background: ${Math.abs(localSpeed - sp.sec) < 0.05 ? 'rgba(255, 214, 0, 0.2)' : 'transparent'}; color: ${Math.abs(localSpeed - sp.sec) < 0.05 ? 'var(--neon-yellow)' : 'var(--text-muted)'};"
                            onClick=${() => { setLocalSpeed(sp.sec); sendAction('setSweepTime', sp.sec); }}
                            disabled=${!state.connected}
                        >
                            ${sp.label}
                        </button>
                    `)}
                </div>

                <!-- Fast Decrement Buttons (-5s, -1s, -0.2s) and Increment Buttons (+0.2s, +1s, +5s) -->
                <div style="display: flex; gap: 4px; align-items: center; flex-wrap: wrap;">
                    <button class="btn" style="padding: 4px 6px; font-size: 0.68rem; font-weight: 900; background: rgba(255, 214, 0, 0.1); border-color: var(--neon-yellow); color: var(--neon-yellow);" onClick=${() => adjustSweepSpeed(-5.0)} disabled=${!state.connected} title="Lompat Cepat -5s">-5s</button>
                    <button class="btn" style="padding: 4px 6px; font-size: 0.68rem; font-weight: 800;" onClick=${() => adjustSweepSpeed(-1.0)} disabled=${!state.connected}>-1s</button>
                    <button class="btn" style="padding: 4px 6px; font-size: 0.68rem; font-weight: 800;" onClick=${() => adjustSweepSpeed(-0.2)} disabled=${!state.connected}>-0.2s</button>
                    <div style="flex: 1; min-width: 120px; padding: 0 4px; display: flex; align-items: center;">
                        <input 
                            type="range" min="0.2" max="30.0" step="0.1" value=${localSpeed} 
                            style="width: 100%; height: 26px; accent-color: var(--neon-yellow); cursor: pointer;" 
                            onPointerDown=${() => { isDragSpeed.current = true; }}
                            onPointerUp=${() => { isDragSpeed.current = false; }}
                            onInput=${(e) => {
                                const val = parseFloat(e.target.value);
                                setLocalSpeed(val);
                                sendAction('setSweepTime', val);
                            }} 
                            disabled=${!state.connected}
                        />
                    </div>
                    <button class="btn" style="padding: 4px 6px; font-size: 0.68rem; font-weight: 800;" onClick=${() => adjustSweepSpeed(+0.2)} disabled=${!state.connected}>+0.2s</button>
                    <button class="btn" style="padding: 4px 6px; font-size: 0.68rem; font-weight: 800;" onClick=${() => adjustSweepSpeed(+1.0)} disabled=${!state.connected}>+1s</button>
                    <button class="btn" style="padding: 4px 6px; font-size: 0.68rem; font-weight: 800;" onClick=${() => adjustSweepSpeed(+5.0)} disabled=${!state.connected}>+5s</button>
                </div>
            </div>

            <!-- SLIDER 4: DWELL TIME GESER KIRI KANAN -->
            <div style="background: rgba(189, 0, 255, 0.03); border: 1px solid rgba(189, 0, 255, 0.3); border-radius: 6px; padding: 8px 12px;">
                <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 6px;">
                    <span style="font-size: 0.75rem; font-weight: 800; color: var(--neon-purple);">⏱️ WAKTU PENGISIAN DWELL TIME:</span>
                    <div style="font-size: 1.05rem; font-weight: 900; font-variant-numeric: tabular-nums; color: var(--neon-purple);">
                        ${localDwell.toFixed(1)} <span style="font-size: 0.72rem; color: var(--text-muted);">MS</span> 
                        <span style="font-size: 0.72rem; color: var(--neon-cyan); margin-left: 6px;">(Duty ${duty}%)</span>
                    </div>
                </div>

                <div style="display: flex; gap: 6px; align-items: center;">
                    <button class="btn" style="padding: 4px 8px; font-size: 0.7rem; font-weight: 800;" onClick=${() => adjustDwell(-0.5)} disabled=${!state.connected}>-0.5</button>
                    <button class="btn" style="padding: 4px 8px; font-size: 0.7rem; font-weight: 800;" onClick=${() => adjustDwell(-0.1)} disabled=${!state.connected}>-0.1</button>
                    <div style="flex: 1; padding: 0 4px; display: flex; align-items: center;">
                        <input 
                            type="range" min="0.2" max=${maxDwellLimit} step="0.05" value=${localDwell} 
                            style="width: 100%; height: 26px; accent-color: var(--neon-purple); cursor: pointer;" 
                            onPointerDown=${() => { isDragDwell.current = true; }}
                            onPointerUp=${() => { isDragDwell.current = false; }}
                            onInput=${(e) => {
                                const val = parseFloat(e.target.value);
                                setLocalDwell(val);
                                sendAction('setDwell', val);
                            }} 
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
