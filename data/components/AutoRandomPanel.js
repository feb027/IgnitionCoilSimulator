import { html } from '../preact.js';

export function AutoRandomPanel({ state, sendAction, maxRpmLimit = 16000, maxDwellLimit = 5.0 }) {
    const isRunning = state.isRunning;
    const isRandom = state.runMode === 4;

    const minRpm = state.randomMinRpm !== undefined ? state.randomMinRpm : 600;
    const maxRpm = state.randomMaxRpm !== undefined ? state.randomMaxRpm : 9000;
    const minDwell = state.randomMinDwell !== undefined ? state.randomMinDwell : 1.5;
    const maxDwell = state.randomMaxDwell !== undefined ? state.randomMaxDwell : 4.2;
    const intervalSec = state.randomIntervalSec !== undefined ? state.randomIntervalSec : 2.0;
    const transMode = state.randomTransitionMode !== undefined ? state.randomTransitionMode : 0;

    const currentRpm = (isRandom && isRunning) ? (state.randomCurrentRpm || minRpm) : minRpm;
    const currentDwell = (isRandom && isRunning) ? (state.randomCurrentDwell || minDwell) : minDwell;
    const timeLeft = (isRandom && isRunning) ? (state.randomTimeLeftSec !== undefined ? state.randomTimeLeftSec : intervalSec) : intervalSec;

    const progressPct = intervalSec > 0 ? Math.max(0, Math.min(100, ((intervalSec - timeLeft) / intervalSec) * 100)) : 0;

    const handleIntervalChange = (val) => {
        let rounded = Math.round(Number(val) * 10) / 10;
        if (rounded < 0.5) rounded = 0.5;
        if (rounded > 10.0) rounded = 10.0;
        sendAction('setRandomIntervalSec', rounded);
    };

    const handleStepInterval = (delta) => {
        handleIntervalChange(intervalSec + delta);
    };

    return html`
        <div class="panel" style="margin-top: 4px; border-color: #a855f7; box-shadow: 0 0 16px rgba(168, 85, 247, 0.2); box-sizing: border-box;">
            <!-- HEADER -->
            <div class="panel-header" style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border-sharp); padding-bottom: 6px; flex-wrap: wrap; gap: 6px;">
                <div style="display: flex; align-items: center; gap: 8px;">
                    <span style="font-weight: 900; letter-spacing: 0.05em; color: #c084fc; font-size: 0.85rem;">🔀 SIMULASI OTOMATIS ACAK (DYNAMIC CHAOS)</span>
                    <span class="status-badge" style="border-color: ${isRandom && isRunning ? 'var(--neon-green)' : '#c084fc'}; color: ${isRandom && isRunning ? 'var(--neon-green)' : '#c084fc'}; font-size: 0.65rem; font-weight: 800;">
                        ${isRandom && isRunning ? '⚡ RUNNING (CHAOS TEST)' : 'STANDBY'}
                    </span>
                </div>
                <div style="display: flex; gap: 4px;">
                    <button class="btn ${transMode === 0 ? 'btn-active' : ''}" 
                        style="padding: 2px 8px; font-size: 0.68rem; font-weight: 800; border-color: ${transMode === 0 ? '#c084fc' : 'var(--border-sharp)'}; background: ${transMode === 0 ? 'rgba(168, 85, 247, 0.25)' : 'transparent'}; color: ${transMode === 0 ? '#fff' : 'var(--text-muted)'};"
                        onClick=${() => sendAction('setRandomTransitionMode', 0)}
                    >
                        ⚡ LOMPAT SEKETIKA
                    </button>
                    <button class="btn ${transMode === 1 ? 'btn-active' : ''}" 
                        style="padding: 2px 8px; font-size: 0.68rem; font-weight: 800; border-color: ${transMode === 1 ? '#c084fc' : 'var(--border-sharp)'}; background: ${transMode === 1 ? 'rgba(168, 85, 247, 0.25)' : 'transparent'}; color: ${transMode === 1 ? '#fff' : 'var(--text-muted)'};"
                        onClick=${() => sendAction('setRandomTransitionMode', 1)}
                    >
                        🌊 TRANSISI MELUNCUR
                    </button>
                </div>
            </div>

            <!-- LIVE STATUS METERS (ACTIVE RPM, DWELL & COUNTDOWN) -->
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 8px; margin-top: 8px;">
                <!-- LIVE RPM -->
                <div style="background: rgba(0,0,0,0.4); border: 2px solid var(--neon-cyan); border-radius: 6px; padding: 8px 12px; display: flex; flex-direction: column; justify-content: space-between;">
                    <div style="font-size: 0.68rem; font-weight: 800; color: var(--neon-cyan);">RPM AKTIF SAAT INI</div>
                    <div style="font-size: 1.65rem; font-weight: 900; color: #fff; font-variant-numeric: tabular-nums; line-height: 1.1; margin: 2px 0;">
                        ${currentRpm} <span style="font-size: 0.8rem; color: var(--text-muted);">RPM</span>
                    </div>
                    <div style="font-size: 0.65rem; color: #aaa;">Rentang: ${minRpm} - ${maxRpm} RPM</div>
                </div>

                <!-- LIVE DWELL -->
                <div style="background: rgba(0,0,0,0.4); border: 2px solid var(--neon-orange); border-radius: 6px; padding: 8px 12px; display: flex; flex-direction: column; justify-content: space-between;">
                    <div style="font-size: 0.68rem; font-weight: 800; color: var(--neon-orange);">DWELL AKTIF SAAT INI</div>
                    <div style="font-size: 1.65rem; font-weight: 900; color: #fff; font-variant-numeric: tabular-nums; line-height: 1.1; margin: 2px 0;">
                        ${currentDwell.toFixed(1)} <span style="font-size: 0.8rem; color: var(--text-muted);">ms</span>
                    </div>
                    <div style="font-size: 0.65rem; color: #aaa;">Rentang: ${minDwell.toFixed(1)} - ${maxDwell.toFixed(1)} ms</div>
                </div>

                <!-- COUNTDOWN TIMER -->
                <div style="background: rgba(0,0,0,0.4); border: 2px solid #c084fc; border-radius: 6px; padding: 8px 12px; display: flex; flex-direction: column; justify-content: space-between;">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <span style="font-size: 0.68rem; font-weight: 800; color: #c084fc;">WAKTU PERUBAHAN</span>
                        <span style="font-size: 0.65rem; color: #fff; font-weight: 900;">Setiap ${intervalSec.toFixed(1)}s</span>
                    </div>
                    <div style="font-size: 1.65rem; font-weight: 900; color: #c084fc; font-variant-numeric: tabular-nums; line-height: 1.1; margin: 2px 0;">
                        ${timeLeft.toFixed(1)} <span style="font-size: 0.8rem; color: var(--text-muted);">detik lagi</span>
                    </div>
                    <div style="width: 100%; height: 6px; background: rgba(255,255,255,0.08); border-radius: 3px; overflow: hidden;">
                        <div style="width: ${progressPct}%; height: 100%; background: #c084fc; transition: width 0.1s linear;"></div>
                    </div>
                </div>
            </div>

            <!-- CONTROLS GRID -->
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 10px; margin-top: 10px;">
                <!-- 1. INTERVAL HOLD TIME SLIDER -->
                <div style="background: rgba(0,0,0,0.25); border: 1px solid var(--border-sharp); border-radius: 6px; padding: 8px 12px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                        <span style="font-size: 0.74rem; font-weight: 800; color: #c084fc;">⏱️ DURASI TAHAN PER LANGKAH:</span>
                        <span style="font-size: 0.95rem; font-weight: 900; color: #fff; font-variant-numeric: tabular-nums;">${intervalSec.toFixed(1)}s</span>
                    </div>
                    <div style="display: flex; gap: 3px; margin-bottom: 6px;">
                        <button class="btn" style="flex: 1; padding: 2px 4px; font-size: 0.65rem; font-weight: 800;" onClick=${() => handleStepInterval(-1.0)}>-1s</button>
                        <button class="btn" style="flex: 1; padding: 2px 4px; font-size: 0.65rem; font-weight: 800;" onClick=${() => handleStepInterval(-0.1)}>-0.1s</button>
                        <button class="btn" style="flex: 1; padding: 2px 4px; font-size: 0.65rem; font-weight: 800;" onClick=${() => handleStepInterval(0.1)}>+0.1s</button>
                        <button class="btn" style="flex: 1; padding: 2px 4px; font-size: 0.65rem; font-weight: 800;" onClick=${() => handleStepInterval(1.0)}>+1s</button>
                    </div>
                    <input 
                        type="range" 
                        min="0.5" 
                        max="10.0" 
                        step="0.1" 
                        value=${intervalSec} 
                        style="width: 100%; touch-action: none;" 
                        onInput=${(e) => handleIntervalChange(e.target.value)}
                        onTouchStart=${(e) => e.stopPropagation()}
                    />
                    <div style="display: flex; justify-content: space-between; font-size: 0.65rem; color: var(--text-muted); margin-top: 2px;">
                        <span>0.5s (Cepat)</span>
                        <span>5.0s</span>
                        <span>10.0s (Lambat)</span>
                    </div>
                </div>

                <!-- 2. RPM BOUNDS SLIDERS -->
                <div style="background: rgba(0,0,0,0.25); border: 1px solid var(--border-sharp); border-radius: 6px; padding: 8px 12px; display: flex; flex-direction: column; gap: 6px;">
                    <div>
                        <div style="display: flex; justify-content: space-between; font-size: 0.72rem; font-weight: 800;">
                            <span style="color: var(--neon-cyan);">🔽 RPM MINIMUM:</span>
                            <span style="color: #fff; font-variant-numeric: tabular-nums;">${minRpm} RPM</span>
                        </div>
                        <input 
                            type="range" 
                            min="300" 
                            max="6000" 
                            step="50" 
                            value=${minRpm} 
                            style="width: 100%; touch-action: none;" 
                            onInput=${(e) => sendAction('setRandomMinRpm', parseInt(e.target.value))}
                            onTouchStart=${(e) => e.stopPropagation()}
                        />
                    </div>
                    <div>
                        <div style="display: flex; justify-content: space-between; font-size: 0.72rem; font-weight: 800;">
                            <span style="color: var(--neon-cyan);">🔼 RPM MAKSIMUM:</span>
                            <span style="color: #fff; font-variant-numeric: tabular-nums;">${maxRpm} RPM</span>
                        </div>
                        <input 
                            type="range" 
                            min="2000" 
                            max=${maxRpmLimit} 
                            step="100" 
                            value=${maxRpm} 
                            style="width: 100%; touch-action: none;" 
                            onInput=${(e) => sendAction('setRandomMaxRpm', parseInt(e.target.value))}
                            onTouchStart=${(e) => e.stopPropagation()}
                        />
                    </div>
                </div>

                <!-- 3. DWELL BOUNDS SLIDERS -->
                <div style="background: rgba(0,0,0,0.25); border: 1px solid var(--border-sharp); border-radius: 6px; padding: 8px 12px; display: flex; flex-direction: column; gap: 6px;">
                    <div>
                        <div style="display: flex; justify-content: space-between; font-size: 0.72rem; font-weight: 800;">
                            <span style="color: var(--neon-orange);">🔽 DWELL MINIMUM:</span>
                            <span style="color: #fff; font-variant-numeric: tabular-nums;">${minDwell.toFixed(1)} ms</span>
                        </div>
                        <input 
                            type="range" 
                            min="0.5" 
                            max="3.0" 
                            step="0.1" 
                            value=${minDwell} 
                            style="width: 100%; touch-action: none;" 
                            onInput=${(e) => sendAction('setRandomMinDwell', parseFloat(e.target.value))}
                            onTouchStart=${(e) => e.stopPropagation()}
                        />
                    </div>
                    <div>
                        <div style="display: flex; justify-content: space-between; font-size: 0.72rem; font-weight: 800;">
                            <span style="color: var(--neon-orange);">🔼 DWELL MAKSIMUM:</span>
                            <span style="color: #fff; font-variant-numeric: tabular-nums;">${maxDwell.toFixed(1)} ms</span>
                        </div>
                        <input 
                            type="range" 
                            min="2.0" 
                            max=${maxDwellLimit} 
                            step="0.1" 
                            value=${maxDwell} 
                            style="width: 100%; touch-action: none;" 
                            onInput=${(e) => sendAction('setRandomMaxDwell', parseFloat(e.target.value))}
                            onTouchStart=${(e) => e.stopPropagation()}
                        />
                    </div>
                </div>
            </div>
        </div>
    `;
}
