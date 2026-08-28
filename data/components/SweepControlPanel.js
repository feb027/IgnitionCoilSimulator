import { html, useState, useEffect, useRef } from '../preact.js';

export function SweepControlPanel({ state, sendAction, maxRpmLimit = 16000, maxDwellLimit = 5.0 }) {
    const isRunning = state.isRunning;
    const minRpm = state.sweepMinRpm !== undefined ? state.sweepMinRpm : 500;
    const maxRpm = state.sweepMaxRpm !== undefined ? state.sweepMaxRpm : (state.rpm || 6000);
    const liveRpm = isRunning ? (state.currentRpm || minRpm) : minRpm;
    
    const dwellMode = state.dwellSweepMode !== undefined ? Number(state.dwellSweepMode) : 0;
    const dwellMin = state.dwellMinMs !== undefined ? Number(state.dwellMinMs) : 1.0;
    const dwellMax = state.dwellMaxMs !== undefined ? Number(state.dwellMaxMs) : 4.5;
    const dwellStatic = state.dwellMs !== undefined ? Number(state.dwellMs) : 3.0;
    const liveDwell = isRunning ? (state.currentDwellMs !== undefined ? Number(state.currentDwellMs) : dwellStatic) : dwellStatic;
    const dwellSpeed = state.dwellSweepTimeSec !== undefined ? Number(state.dwellSweepTimeSec) : 5.0;
    
    const sweepSec = state.sweepTimeSec !== undefined ? Number(state.sweepTimeSec) : 5.0;
    const duty = state.dutyCycle !== undefined ? state.dutyCycle.toFixed(1) : "0.0";
    const rpmPerSec = sweepSec > 0 ? Math.round(Math.abs(maxRpm - minRpm) / sweepSec) : 0;

    const isDragMin = useRef(false);
    const isDragMax = useRef(false);
    const isDragSpeed = useRef(false);
    const isDragDwMin = useRef(false);
    const isDragDwMax = useRef(false);
    const isDragDwSpeed = useRef(false);
    const isDragDwStatic = useRef(false);

    const [localMin, setLocalMin] = useState(minRpm);
    const [localMax, setLocalMax] = useState(maxRpm);
    const [localSpeed, setLocalSpeed] = useState(sweepSec);
    const [localDwMin, setLocalDwMin] = useState(dwellMin);
    const [localDwMax, setLocalDwMax] = useState(dwellMax);
    const [localDwSpeed, setLocalDwSpeed] = useState(dwellSpeed);
    const [localDwStatic, setLocalDwStatic] = useState(dwellStatic);

    useEffect(() => { if (!isDragMin.current) setLocalMin(minRpm); }, [minRpm]);
    useEffect(() => { if (!isDragMax.current) setLocalMax(maxRpm); }, [maxRpm]);
    useEffect(() => { if (!isDragSpeed.current) setLocalSpeed(sweepSec); }, [sweepSec]);
    useEffect(() => { if (!isDragDwMin.current) setLocalDwMin(dwellMin); }, [dwellMin]);
    useEffect(() => { if (!isDragDwMax.current) setLocalDwMax(dwellMax); }, [dwellMax]);
    useEffect(() => { if (!isDragDwSpeed.current) setLocalDwSpeed(dwellSpeed); }, [dwellSpeed]);
    useEffect(() => { if (!isDragDwStatic.current) setLocalDwStatic(dwellStatic); }, [dwellStatic]);

    const adjMin = (d) => { const n = Math.max(200, Math.min(localMax - 200, localMin + d)); setLocalMin(n); sendAction('setSweepMinRpm', n); };
    const adjMax = (d) => { const n = Math.max(localMin + 200, Math.min(maxRpmLimit, localMax + d)); setLocalMax(n); sendAction('setSweepMaxRpm', n); };
    const adjSpeed = (d) => { const n = Math.max(0.01, Math.min(60.0, Number((localSpeed + d).toFixed(2)))); setLocalSpeed(n); sendAction('setSweepTime', n); };
    const adjDwMin = (d) => { const n = Math.max(0.2, Math.min(localDwMax - 0.2, Number((localDwMin + d).toFixed(2)))); setLocalDwMin(n); sendAction('setDwellMinMs', n); };
    const adjDwMax = (d) => { const n = Math.max(localDwMin + 0.2, Math.min(maxDwellLimit, Number((localDwMax + d).toFixed(2)))); setLocalDwMax(n); sendAction('setDwellMaxMs', n); };
    const adjDwSpeed = (d) => { const n = Math.max(0.01, Math.min(30.0, Number((localDwSpeed + d).toFixed(2)))); setLocalDwSpeed(n); sendAction('setDwellSweepTime', n); };
    const adjDwStatic = (d) => { const n = Math.max(0.2, Math.min(maxDwellLimit, Number((localDwStatic + d).toFixed(2)))); setLocalDwStatic(n); sendAction('setDwell', n); };

    const rpmRange = Math.max(100, maxRpm - minRpm);
    const liveSweepPct = Math.min(100, Math.max(0, ((liveRpm - minRpm) / rpmRange) * 100));
    const dwRange = Math.max(0.1, localDwMax - localDwMin);
    const liveDwPct = Math.min(100, Math.max(0, ((liveDwell - localDwMin) / dwRange) * 100));

    const minPresets = [500, 800, 1000, 1500, 2000];
    const maxPresets = [4000, 6000, 8000, 12000, 16000];
    const speedPresets = [{ s: 0.01, l: "⚡ 0.01s" }, { s: 0.05, l: "⚡ 0.05s" }, { s: 0.1, l: "⚡ 0.1s" }, { s: 0.5, l: "0.5s" }, { s: 1, l: "🚀 1s" }, { s: 3, l: "3s" }, { s: 5, l: "⏱️ 5s" }, { s: 10, l: "10s" }];
    const dwMinPresets = [0.5, 0.8, 1.0, 1.5, 2.0];
    const dwMaxPresets = [3.0, 3.5, 4.0, 4.5, 5.0];

    const dwellModes = [
        { id: 0, label: "🔒 Dwell Tetap", desc: "Konstan" },
        { id: 1, label: "🔄 Mandiri (Indep)", desc: "Kecepatan Lepas" },
        { id: 2, label: "📈 Searah RPM", desc: "RPM Naik -> Dwell Naik" },
        { id: 3, label: "📉 Berlawanan RPM", desc: "RPM Naik -> Dwell Turun (ECU)" }
    ];

    return html`
        <div class="panel" style="margin-top: 6px; grid-column: 1 / -1; background: rgba(0,0,0,0.55); border: 2px solid var(--neon-cyan); border-radius: 6px; padding: 10px 14px; box-shadow: 0 0 16px rgba(0, 212, 255, 0.15); box-sizing: border-box;">
            <!-- HEADER -->
            <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border-sharp); padding-bottom: 6px; margin-bottom: 8px; flex-wrap: wrap; gap: 6px;">
                <div style="display: flex; align-items: center; gap: 8px;">
                    <span style="font-size: 0.88rem; font-weight: 900; letter-spacing: 0.05em; color: var(--neon-cyan);">🔄 KONTROL SAPUAN RPM & DWELL DINAMIS</span>
                    <span class="status-badge" style="border-color: ${isRunning ? 'var(--neon-green)' : 'var(--neon-cyan)'}; color: ${isRunning ? 'var(--neon-green)' : 'var(--neon-cyan)'}; font-weight: 800; font-size: 0.68rem;">
                        ${isRunning ? `⚡ LIVE: ${liveRpm} RPM | ${liveDwell.toFixed(2)} ms` : 'STANDBY'}
                    </span>
                </div>
                <div style="font-size: 0.72rem; color: var(--text-muted);">
                    RPM: <strong style="color: var(--neon-cyan);">${localMin}</strong>-<strong style="color: var(--neon-green);">${localMax}</strong> | Dwell: <strong style="color: var(--neon-purple);">${dwellMode === 0 ? localDwStatic.toFixed(1) : `${localDwMin.toFixed(1)}-${localDwMax.toFixed(1)}`} ms</strong>
                </div>
            </div>

            <!-- LIVE RPM PROGRESS BAR -->
            <div style="background: rgba(0, 212, 255, 0.06); border: 1px solid rgba(0, 212, 255, 0.25); border-radius: 6px; padding: 6px 10px; margin-bottom: 8px;">
                <div style="display: flex; justify-content: space-between; font-size: 0.72rem; font-weight: 800; margin-bottom: 3px;">
                    <span style="color: var(--neon-cyan);">📉 MIN: ${localMin} RPM</span>
                    <span style="color: ${isRunning ? 'var(--neon-green)' : 'var(--text-muted)'}; font-variant-numeric: tabular-nums;">
                        ${isRunning ? `LIVE: ${liveRpm} RPM (${Math.round(liveSweepPct)}%)` : 'STANDBY'}
                    </span>
                    <span style="color: var(--neon-green);">📈 MAX: ${localMax} RPM</span>
                </div>
                <div style="width: 100%; height: 7px; background: rgba(255,255,255,0.08); border-radius: 4px; overflow: hidden;">
                    <div style="width: ${liveSweepPct}%; height: 100%; background: linear-gradient(90deg, #00d4ff, #00ff66); transition: width 0.05s linear;"></div>
                </div>
            </div>

            <!-- GRID 2 KOLOM: MIN RPM & MAX RPM -->
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 8px; margin-bottom: 8px;">
                <div style="background: rgba(0, 212, 255, 0.03); border: 1px solid rgba(0, 212, 255, 0.3); border-radius: 6px; padding: 6px 10px;">
                    <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 3px;">
                        <span style="font-size: 0.72rem; font-weight: 800; color: var(--neon-cyan);">📉 BATAS BAWAH (MIN RPM):</span>
                        <div style="font-size: 1rem; font-weight: 900; color: var(--neon-cyan);">${localMin} <span style="font-size: 0.65rem; color: var(--text-muted);">RPM</span></div>
                    </div>
                    <div style="display: flex; gap: 3px; margin-bottom: 4px; flex-wrap: wrap;">
                        ${minPresets.map(p => html`<button class="btn ${localMin === p ? 'btn-active' : ''}" style="padding: 1px 5px; font-size: 0.63rem;" onClick=${() => { setLocalMin(p); sendAction('setSweepMinRpm', p); }} disabled=${!state.connected}>${p === 500 ? '500 (Idle)' : p}</button>`)}
                    </div>
                    <div style="display: flex; gap: 3px; align-items: center;">
                        <button class="btn" style="padding: 3px 6px; font-size: 0.65rem; font-weight: 800;" onClick=${() => adjMin(-100)} disabled=${!state.connected}>-100</button>
                        <input type="range" min="200" max="8000" step="50" value=${localMin} style="flex: 1; accent-color: var(--neon-cyan); cursor: pointer;" onPointerDown=${() => { isDragMin.current = true; }} onPointerUp=${() => { isDragMin.current = false; }} onInput=${(e) => { const v = parseInt(e.target.value); setLocalMin(v); sendAction('setSweepMinRpm', v); }} disabled=${!state.connected}/>
                        <button class="btn" style="padding: 3px 6px; font-size: 0.65rem; font-weight: 800;" onClick=${() => adjMin(+100)} disabled=${!state.connected}>+100</button>
                    </div>
                </div>

                <div style="background: rgba(0, 255, 102, 0.03); border: 1px solid rgba(0, 255, 102, 0.3); border-radius: 6px; padding: 6px 10px;">
                    <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 3px;">
                        <span style="font-size: 0.72rem; font-weight: 800; color: var(--neon-green);">📈 BATAS ATAS (MAX RPM):</span>
                        <div style="font-size: 1rem; font-weight: 900; color: var(--neon-green);">${localMax} <span style="font-size: 0.65rem; color: var(--text-muted);">RPM</span></div>
                    </div>
                    <div style="display: flex; gap: 3px; margin-bottom: 4px; flex-wrap: wrap;">
                        ${maxPresets.map(p => html`<button class="btn ${localMax === p ? 'btn-active' : ''}" style="padding: 1px 5px; font-size: 0.63rem;" onClick=${() => { setLocalMax(p); sendAction('setSweepMaxRpm', p); }} disabled=${!state.connected}>${p}</button>`)}
                    </div>
                    <div style="display: flex; gap: 3px; align-items: center;">
                        <button class="btn" style="padding: 3px 5px; font-size: 0.65rem; font-weight: 800;" onClick=${() => adjMax(-500)} disabled=${!state.connected}>-500</button>
                        <input type="range" min="1000" max=${maxRpmLimit} step="100" value=${localMax} style="flex: 1; accent-color: var(--neon-green); cursor: pointer;" onPointerDown=${() => { isDragMax.current = true; }} onPointerUp=${() => { isDragMax.current = false; }} onInput=${(e) => { const v = parseInt(e.target.value); setLocalMax(v); sendAction('setSweepMaxRpm', v); }} disabled=${!state.connected}/>
                        <button class="btn" style="padding: 3px 5px; font-size: 0.65rem; font-weight: 800;" onClick=${() => adjMax(+500)} disabled=${!state.connected}>+500</button>
                    </div>
                </div>
            </div>

            <!-- KECEPATAN SAPUAN RPM (DURASI SWEEP) -->
            <div style="background: rgba(255, 214, 0, 0.03); border: 1px solid rgba(255, 214, 0, 0.3); border-radius: 6px; padding: 6px 10px; margin-bottom: 8px;">
                <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 3px; flex-wrap: wrap; gap: 4px;">
                    <span style="font-size: 0.72rem; font-weight: 800; color: var(--neon-yellow);">⚡ KECEPATAN SAPUAN RPM:</span>
                    <div style="font-size: 1rem; font-weight: 900; color: var(--neon-yellow);">${localSpeed < 0.1 ? localSpeed.toFixed(2) : localSpeed.toFixed(1)} <span style="font-size: 0.65rem; color: var(--text-muted);">DETIK</span> <span style="font-size: 0.65rem; color: #A6FF00;">(~${rpmPerSec.toLocaleString()} RPM/s)</span></div>
                </div>
                <div style="display: flex; gap: 3px; margin-bottom: 4px; flex-wrap: wrap;">
                    ${speedPresets.map(sp => html`<button class="btn ${Math.abs(localSpeed - sp.s) < 0.005 ? 'btn-active' : ''}" style="padding: 1px 5px; font-size: 0.63rem;" onClick=${() => { setLocalSpeed(sp.s); sendAction('setSweepTime', sp.s); }} disabled=${!state.connected}>${sp.l}</button>`)}
                </div>
                <div style="display: flex; gap: 3px; align-items: center; flex-wrap: wrap;">
                    <button class="btn" style="padding: 3px 5px; font-size: 0.65rem; font-weight: 900; color: var(--neon-red);" onClick=${() => adjSpeed(-20.0)} disabled=${!state.connected}>-20s</button>
                    <button class="btn" style="padding: 3px 5px; font-size: 0.65rem; font-weight: 800;" onClick=${() => adjSpeed(-1.0)} disabled=${!state.connected}>-1s</button>
                    <button class="btn" style="padding: 3px 5px; font-size: 0.65rem; font-weight: 900; color: #00ffcc;" onClick=${() => adjSpeed(-0.01)} disabled=${!state.connected}>-0.01s</button>
                    <input type="range" min="0.01" max="60.0" step="0.01" value=${localSpeed} style="flex: 1; min-width: 80px; accent-color: var(--neon-yellow); cursor: pointer;" onPointerDown=${() => { isDragSpeed.current = true; }} onPointerUp=${() => { isDragSpeed.current = false; }} onInput=${(e) => { const v = parseFloat(e.target.value); setLocalSpeed(v); sendAction('setSweepTime', v); }} disabled=${!state.connected}/>
                    <button class="btn" style="padding: 3px 5px; font-size: 0.65rem; font-weight: 900; color: #00ffcc;" onClick=${() => adjSpeed(+0.01)} disabled=${!state.connected}>+0.01s</button>
                    <button class="btn" style="padding: 3px 5px; font-size: 0.65rem; font-weight: 800;" onClick=${() => adjSpeed(+1.0)} disabled=${!state.connected}>+1s</button>
                    <button class="btn" style="padding: 3px 5px; font-size: 0.65rem; font-weight: 900; color: var(--neon-green);" onClick=${() => adjSpeed(+20.0)} disabled=${!state.connected}>+20s</button>
                </div>
            </div>

            <!-- MODULASI DWELL DINAMIS (4 PILIHAN MODE) -->
            <div style="background: rgba(189, 0, 255, 0.04); border: 2px solid var(--neon-purple); border-radius: 6px; padding: 8px 10px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; flex-wrap: wrap; gap: 4px;">
                    <span style="font-size: 0.76rem; font-weight: 900; color: var(--neon-purple);">🎛️ MODULASI DWELL DEGRADASI (4 MODE):</span>
                    <span style="font-size: 0.72rem; color: #ff00ea; font-weight: 800;">LIVE DWELL: ${liveDwell.toFixed(2)} ms (Duty: ${duty}%)</span>
                </div>

                <!-- 4 Mode Selector Pills -->
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 4px; margin-bottom: 8px;">
                    ${dwellModes.map(m => html`
                        <button class="btn ${dwellMode === m.id ? 'btn-active' : ''}" style="padding: 4px 6px; font-size: 0.65rem; font-weight: 800; border-color: ${dwellMode === m.id ? 'var(--neon-purple)' : 'var(--border-sharp)'}; background: ${dwellMode === m.id ? 'rgba(189, 0, 255, 0.25)' : 'transparent'}; color: ${dwellMode === m.id ? '#ffffff' : 'var(--text-muted)'}; text-align: center;" onClick=${() => sendAction('setDwellSweepMode', m.id)} disabled=${!state.connected}>
                            <div>${m.label}</div>
                            <div style="font-size: 0.58rem; color: #bbb; margin-top: 2px;">${m.desc}</div>
                        </button>
                    `)}
                </div>

                ${dwellMode === 0 ? html`
                    <!-- MODE 0: DWELL TETAP / KONSTAN -->
                    <div style="display: flex; gap: 4px; align-items: center; background: rgba(0,0,0,0.3); padding: 6px 8px; border-radius: 4px;">
                        <span style="font-size: 0.72rem; font-weight: 800; color: var(--neon-purple); min-width: 90px;">DWELL TETAP:</span>
                        <button class="btn" style="padding: 3px 6px; font-size: 0.65rem;" onClick=${() => adjDwStatic(-0.1)} disabled=${!state.connected}>-0.1</button>
                        <input type="range" min="0.2" max=${maxDwellLimit} step="0.05" value=${localDwStatic} style="flex: 1; accent-color: var(--neon-purple); cursor: pointer;" onPointerDown=${() => { isDragDwStatic.current = true; }} onPointerUp=${() => { isDragDwStatic.current = false; }} onInput=${(e) => { const v = parseFloat(e.target.value); setLocalDwStatic(v); sendAction('setDwell', v); }} disabled=${!state.connected}/>
                        <button class="btn" style="padding: 3px 6px; font-size: 0.65rem;" onClick=${() => adjDwStatic(+0.1)} disabled=${!state.connected}>+0.1</button>
                        <span style="font-size: 0.85rem; font-weight: 900; color: var(--neon-purple); min-width: 50px; text-align: right;">${localDwStatic.toFixed(1)} ms</span>
                    </div>
                ` : html`
                    <!-- MODE 1, 2, 3: SAPUAN DWELL DINAMIS (MIN, MAX & LIVE BAR) -->
                    <div>
                        <!-- LIVE DWELL BAR -->
                        <div style="background: rgba(189, 0, 255, 0.08); border: 1px solid rgba(189, 0, 255, 0.3); border-radius: 4px; padding: 4px 8px; margin-bottom: 6px;">
                            <div style="display: flex; justify-content: space-between; font-size: 0.68rem; font-weight: 800; margin-bottom: 2px;">
                                <span style="color: #00d4ff;">📉 MIN: ${localDwMin.toFixed(1)} ms</span>
                                <span style="color: #ff00ea;">LIVE: ${liveDwell.toFixed(2)} ms</span>
                                <span style="color: #00ff66;">📈 MAX: ${localDwMax.toFixed(1)} ms</span>
                            </div>
                            <div style="width: 100%; height: 6px; background: rgba(255,255,255,0.08); border-radius: 3px; overflow: hidden;">
                                <div style="width: ${liveDwPct}%; height: 100%; background: linear-gradient(90deg, #00d4ff, #ff00ea, #00ff66); transition: width 0.05s linear;"></div>
                            </div>
                        </div>

                        <!-- SLIDERS DWELL MIN & DWELL MAX -->
                        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 6px; margin-bottom: 6px;">
                            <!-- Dwell Min -->
                            <div style="background: rgba(0,0,0,0.25); border: 1px solid rgba(189, 0, 255, 0.2); border-radius: 4px; padding: 4px 8px;">
                                <div style="display: flex; justify-content: space-between; font-size: 0.68rem; font-weight: 800; margin-bottom: 2px;">
                                    <span style="color: var(--neon-cyan);">BATAS BAWAH DWELL (MIN):</span>
                                    <span style="color: var(--neon-cyan); font-weight: 900;">${localDwMin.toFixed(1)} ms</span>
                                </div>
                                <div style="display: flex; gap: 2px; margin-bottom: 3px;">
                                    ${dwMinPresets.map(p => html`<button class="btn ${Math.abs(localDwMin - p) < 0.05 ? 'btn-active' : ''}" style="padding: 1px 4px; font-size: 0.6rem;" onClick=${() => { setLocalDwMin(p); sendAction('setDwellMinMs', p); }} disabled=${!state.connected}>${p}ms</button>`)}
                                </div>
                                <div style="display: flex; gap: 3px; align-items: center;">
                                    <button class="btn" style="padding: 2px 5px; font-size: 0.63rem;" onClick=${() => adjDwMin(-0.1)} disabled=${!state.connected}>-0.1</button>
                                    <input type="range" min="0.2" max="3.0" step="0.05" value=${localDwMin} style="flex: 1; accent-color: var(--neon-cyan); cursor: pointer;" onPointerDown=${() => { isDragDwMin.current = true; }} onPointerUp=${() => { isDragDwMin.current = false; }} onInput=${(e) => { const v = parseFloat(e.target.value); setLocalDwMin(v); sendAction('setDwellMinMs', v); }} disabled=${!state.connected}/>
                                    <button class="btn" style="padding: 2px 5px; font-size: 0.63rem;" onClick=${() => adjDwMin(+0.1)} disabled=${!state.connected}>+0.1</button>
                                </div>
                            </div>

                            <!-- Dwell Max -->
                            <div style="background: rgba(0,0,0,0.25); border: 1px solid rgba(189, 0, 255, 0.2); border-radius: 4px; padding: 4px 8px;">
                                <div style="display: flex; justify-content: space-between; font-size: 0.68rem; font-weight: 800; margin-bottom: 2px;">
                                    <span style="color: var(--neon-green);">BATAS ATAS DWELL (MAX):</span>
                                    <span style="color: var(--neon-green); font-weight: 900;">${localDwMax.toFixed(1)} ms</span>
                                </div>
                                <div style="display: flex; gap: 2px; margin-bottom: 3px;">
                                    ${dwMaxPresets.map(p => html`<button class="btn ${Math.abs(localDwMax - p) < 0.05 ? 'btn-active' : ''}" style="padding: 1px 4px; font-size: 0.6rem;" onClick=${() => { setLocalDwMax(p); sendAction('setDwellMaxMs', p); }} disabled=${!state.connected}>${p}ms</button>`)}
                                </div>
                                <div style="display: flex; gap: 3px; align-items: center;">
                                    <button class="btn" style="padding: 2px 5px; font-size: 0.63rem;" onClick=${() => adjDwMax(-0.1)} disabled=${!state.connected}>-0.1</button>
                                    <input type="range" min="2.0" max=${maxDwellLimit} step="0.05" value=${localDwMax} style="flex: 1; accent-color: var(--neon-green); cursor: pointer;" onPointerDown=${() => { isDragDwMax.current = true; }} onPointerUp=${() => { isDragDwMax.current = false; }} onInput=${(e) => { const v = parseFloat(e.target.value); setLocalDwMax(v); sendAction('setDwellMaxMs', v); }} disabled=${!state.connected}/>
                                    <button class="btn" style="padding: 2px 5px; font-size: 0.63rem;" onClick=${() => adjDwMax(+0.1)} disabled=${!state.connected}>+0.1</button>
                                </div>
                            </div>
                        </div>

                        ${dwellMode === 1 ? html`
                            <!-- MODE 1: KECEPATAN SAPUAN DWELL MANDIRI -->
                            <div style="background: rgba(0,0,0,0.3); border: 1px solid rgba(255, 214, 0, 0.3); border-radius: 4px; padding: 4px 8px;">
                                <div style="display: flex; justify-content: space-between; font-size: 0.68rem; font-weight: 800; margin-bottom: 2px;">
                                    <span style="color: var(--neon-yellow);">⚡ KECEPATAN SAPUAN DWELL MANDIRI:</span>
                                    <span style="color: var(--neon-yellow); font-weight: 900;">${localDwSpeed < 0.1 ? localDwSpeed.toFixed(2) : localDwSpeed.toFixed(1)} DETIK</span>
                                </div>
                                <div style="display: flex; gap: 2px; align-items: center; flex-wrap: wrap;">
                                    <button class="btn" style="padding: 2px 5px; font-size: 0.6rem; font-weight: 800;" onClick=${() => adjDwSpeed(-1.0)} disabled=${!state.connected}>-1s</button>
                                    <button class="btn" style="padding: 2px 5px; font-size: 0.6rem; font-weight: 900; color: #00ffcc;" onClick=${() => adjDwSpeed(-0.01)} disabled=${!state.connected}>-0.01s</button>
                                    <input type="range" min="0.01" max="20.0" step="0.01" value=${localDwSpeed} style="flex: 1; min-width: 70px; accent-color: var(--neon-yellow); cursor: pointer;" onPointerDown=${() => { isDragDwSpeed.current = true; }} onPointerUp=${() => { isDragDwSpeed.current = false; }} onInput=${(e) => { const v = parseFloat(e.target.value); setLocalDwSpeed(v); sendAction('setDwellSweepTime', v); }} disabled=${!state.connected}/>
                                    <button class="btn" style="padding: 2px 5px; font-size: 0.6rem; font-weight: 900; color: #00ffcc;" onClick=${() => adjDwSpeed(+0.01)} disabled=${!state.connected}>+0.01s</button>
                                    <button class="btn" style="padding: 2px 5px; font-size: 0.6rem; font-weight: 800;" onClick=${() => adjDwSpeed(+1.0)} disabled=${!state.connected}>+1s</button>
                                </div>
                            </div>
                        ` : ''}
                    </div>
                `}
            </div>
        </div>
    `;
}
