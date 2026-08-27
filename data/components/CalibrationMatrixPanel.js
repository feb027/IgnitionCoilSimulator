import { html, useState, useEffect } from '../preact.js';

export function CalibrationMatrixPanel({ state = {}, sendAction }) {
    const defaultMatrix = {
        gradeA: 90,
        gradeB: 75,
        gradeC: 50,
        gradeD: 25,
        minCurrentA: 6.0,
        maxCurrentA: 9.5,
        minSparkmA: 40.0
    };

    const [matrix, setMatrix] = useState(() => {
        try {
            const saved = localStorage.getItem('coil_cal_matrix');
            return saved ? JSON.parse(saved) : defaultMatrix;
        } catch (e) {
            return defaultMatrix;
        }
    });

    // Custom ARC Percentage Thresholds (0%, 25%, 50%, 75%, 100% on 0-30 scale)
    const [cutIn, setCutIn] = useState(state.leakArcCutIn || 2);
    const [arc25, setArc25] = useState(state.leakArc25 || 5);
    const [arc50, setArc50] = useState(state.leakArc50 || 10);
    const [arc75, setArc75] = useState(state.leakArc75 || 18);
    const [arc100, setArc100] = useState(state.leakArc100 || 25);
    const [msg, setMsg] = useState('');

    useEffect(() => {
        if (state.leakArcCutIn !== undefined) setCutIn(state.leakArcCutIn);
        if (state.leakArc25 !== undefined) setArc25(state.leakArc25);
        if (state.leakArc50 !== undefined) setArc50(state.leakArc50);
        if (state.leakArc75 !== undefined) setArc75(state.leakArc75);
        if (state.leakArc100 !== undefined) setArc100(state.leakArc100);
    }, [state.leakArcCutIn, state.leakArc25, state.leakArc50, state.leakArc75, state.leakArc100]);

    const liveArcs = state.coilLeakRate !== undefined ? state.coilLeakRate : (state.coilLeakCount || 0);
    const livePercent = state.coilLeakPercent !== undefined ? state.coilLeakPercent : 0;
    const clampedArcPos = Math.min(30, Math.max(0, liveArcs));
    const needlePercent = (clampedArcPos / 30) * 100;

    const saveCustomLeakMatrix = () => {
        if (sendAction) {
            sendAction('setCustomLeakMatrix', {
                cutIn: parseInt(cutIn) || 2,
                arc25: parseInt(arc25) || 5,
                arc50: parseInt(arc50) || 10,
                arc75: parseInt(arc75) || 18,
                arc100: parseInt(arc100) || 25,
                arcMax: 30
            });
        }
        try {
            localStorage.setItem('coil_cal_matrix', JSON.stringify(matrix));
        } catch (e) {}
        setMsg('✅ Kalibrasi ARC & Matriks Berhasil Disimpan ke ESP32!');
        setTimeout(() => setMsg(''), 3500);
    };

    const resetCustomLeakMatrix = () => {
        setCutIn(2); setArc25(5); setArc50(10); setArc75(18); setArc100(25);
        if (sendAction) {
            sendAction('setCustomLeakMatrix', { cutIn: 2, arc25: 5, arc50: 10, arc75: 18, arc100: 25, arcMax: 30 });
        }
        setMatrix(defaultMatrix);
        localStorage.removeItem('coil_cal_matrix');
        setMsg('🔄 Reset ke Standar Pabrikan (2, 5, 10, 18, 25 ARC)');
        setTimeout(() => setMsg(''), 3500);
    };

    return html`
        <div style="display: flex; flex-direction: column; gap: 10px; margin-top: 4px;">
            
            <!-- 1. LIVE ARC VISUALIZER BAR (0 - 30 ARC) -->
            <div style="background: rgba(0,0,0,0.35); border: 1px solid var(--border-sharp); border-radius: 6px; padding: 10px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; font-size: 0.72rem;">
                    <span style="font-weight: bold; color: var(--neon-yellow);">📊 LIVE ARC VISUALIZER BAR (0 - 30 ARC):</span>
                    <div style="display: flex; gap: 6px; align-items: center;">
                        <span style="font-size: 0.7rem; color: var(--text-muted);">LIVE RATE:</span>
                        <strong style="color: ${liveArcs > 0 ? 'var(--neon-red)' : 'var(--neon-green)'}; font-size: 0.8rem;">
                            ${liveArcs} ARC (${livePercent}%)
                        </strong>
                        <span style="background: ${livePercent >= 75 ? 'rgba(255,45,85,0.2)' : livePercent >= 25 ? 'rgba(255,230,0,0.2)' : 'rgba(0,255,102,0.2)'}; border: 1px solid ${livePercent >= 75 ? 'var(--neon-red)' : livePercent >= 25 ? 'var(--neon-yellow)' : 'var(--neon-green)'}; color: ${livePercent >= 75 ? 'var(--neon-red)' : livePercent >= 25 ? 'var(--neon-yellow)' : 'var(--neon-green)'}; padding: 1px 6px; border-radius: 3px; font-size: 0.65rem; font-weight: bold;">
                            ${state.coilLeakSeverity || (livePercent === 0 ? "ISOLASI UTUH (0%)" : "LEAK")}
                        </span>
                    </div>
                </div>

                <!-- GAUGE BAR TRACK WITH 0-30 GRADIENT & TICKS -->
                <div style="position: relative; height: 22px; background: #111; border: 1px solid #333; border-radius: 4px; overflow: hidden; margin-bottom: 4px;">
                    <!-- Colored Zones -->
                    <div style="position: absolute; left: 0; width: ${(arc25/30)*100}%; height: 100%; background: linear-gradient(90deg, #00ff66, #a6ff00); opacity: 0.45;"></div>
                    <div style="position: absolute; left: ${(arc25/30)*100}%; width: ${((arc50-arc25)/30)*100}%; height: 100%; background: linear-gradient(90deg, #a6ff00, #ffe600); opacity: 0.45;"></div>
                    <div style="position: absolute; left: ${(arc50/30)*100}%; width: ${((arc75-arc50)/30)*100}%; height: 100%; background: linear-gradient(90deg, #ffe600, #ff9500); opacity: 0.5;"></div>
                    <div style="position: absolute; left: ${(arc75/30)*100}%; width: ${((30-arc75)/30)*100}%; height: 100%; background: linear-gradient(90deg, #ff9500, #ff2d55); opacity: 0.6;"></div>
                    
                    <!-- Live Progress Fill -->
                    <div style="position: absolute; left: 0; width: ${needlePercent}%; height: 100%; background: rgba(255,255,255,0.25); transition: width 0.1s ease-out;"></div>
                    
                    <!-- Live Needle Indicator -->
                    <div style="position: absolute; left: calc(${needlePercent}% - 2px); top: 0; width: 4px; height: 100%; background: #fff; box-shadow: 0 0 6px #fff; z-index: 5;"></div>
                </div>

                <!-- SCALE LABELS 0 TO 30 -->
                <div style="display: flex; justify-content: space-between; font-size: 0.62rem; color: var(--text-muted); font-family: monospace;">
                    <span>0 ARC (0%)</span>
                    <span>${cutIn}A (Cut-In)</span>
                    <span>${arc25}A (25%)</span>
                    <span>${arc50}A (50%)</span>
                    <span>${arc75}A (75%)</span>
                    <span>${arc100}A (100%)</span>
                    <span>30 ARC</span>
                </div>
            </div>

            <!-- 2. CUSTOM ARC THRESHOLD MATRIX (PERSENTASE 0% - 100%) -->
            <div style="background: rgba(255,255,255,0.02); border: 1px solid var(--border-sharp); border-radius: 6px; padding: 10px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                    <span style="font-size: 0.72rem; font-weight: bold; color: var(--neon-cyan);">🎛️ KALIBRASI AMBANG KEBOCORAN (0%, 25%, 50%, 75%, 100%):</span>
                    <span style="font-size: 0.65rem; color: var(--text-muted);">Tentukan jumlah ARC di setiap batas persentase</span>
                </div>

                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(135px, 1fr)); gap: 6px;">
                    <!-- 0% CUT-IN -->
                    <div style="background: rgba(0,255,102,0.05); border: 1px solid var(--neon-green); border-radius: 4px; padding: 6px;">
                        <div style="display: flex; justify-content: space-between; font-size: 0.68rem; margin-bottom: 2px;">
                            <strong style="color: var(--neon-green);">0% (CUT-IN):</strong>
                            <strong style="color: #fff;">${cutIn} ARC</strong>
                        </div>
                        <input type="range" min="1" max="10" value=${cutIn} style="width: 100%; accent-color: var(--neon-green);" onInput=${(e) => setCutIn(parseInt(e.target.value))} />
                    </div>

                    <!-- 25% MIKRO LEAK -->
                    <div style="background: rgba(166,255,0,0.05); border: 1px solid #a6ff00; border-radius: 4px; padding: 6px;">
                        <div style="display: flex; justify-content: space-between; font-size: 0.68rem; margin-bottom: 2px;">
                            <strong style="color: #a6ff00;">25% (MIKRO):</strong>
                            <strong style="color: #fff;">${arc25} ARC</strong>
                        </div>
                        <input type="range" min="2" max="15" value=${arc25} style="width: 100%; accent-color: #a6ff00;" onInput=${(e) => setArc25(parseInt(e.target.value))} />
                    </div>

                    <!-- 50% SEDANG -->
                    <div style="background: rgba(255,230,0,0.05); border: 1px solid var(--neon-yellow); border-radius: 4px; padding: 6px;">
                        <div style="display: flex; justify-content: space-between; font-size: 0.68rem; margin-bottom: 2px;">
                            <strong style="color: var(--neon-yellow);">50% (SEDANG):</strong>
                            <strong style="color: #fff;">${arc50} ARC</strong>
                        </div>
                        <input type="range" min="5" max="20" value=${arc50} style="width: 100%; accent-color: var(--neon-yellow);" onInput=${(e) => setArc50(parseInt(e.target.value))} />
                    </div>

                    <!-- 75% BOCOR PARAH -->
                    <div style="background: rgba(255,149,0,0.05); border: 1px solid var(--neon-orange); border-radius: 4px; padding: 6px;">
                        <div style="display: flex; justify-content: space-between; font-size: 0.68rem; margin-bottom: 2px;">
                            <strong style="color: var(--neon-orange);">75% (BOCOR):</strong>
                            <strong style="color: #fff;">${arc75} ARC</strong>
                        </div>
                        <input type="range" min="10" max="28" value=${arc75} style="width: 100%; accent-color: var(--neon-orange);" onInput=${(e) => setArc75(parseInt(e.target.value))} />
                    </div>

                    <!-- 100% JEBOL TOTAL -->
                    <div style="background: rgba(255,45,85,0.05); border: 1px solid var(--neon-red); border-radius: 4px; padding: 6px;">
                        <div style="display: flex; justify-content: space-between; font-size: 0.68rem; margin-bottom: 2px;">
                            <strong style="color: var(--neon-red);">100% (JEBOL):</strong>
                            <strong style="color: #fff;">${arc100} ARC</strong>
                        </div>
                        <input type="range" min="15" max="30" value=${arc100} style="width: 100%; accent-color: var(--neon-red);" onInput=${(e) => setArc100(parseInt(e.target.value))} />
                    </div>
                </div>

                <!-- SAVE & ACTION BUTTONS -->
                <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 10px; flex-wrap: wrap; gap: 6px;">
                    <div style="display: flex; gap: 8px;">
                        <button class="btn" style="padding: 5px 12px; font-size: 0.72rem; font-weight: bold; border-color: var(--neon-green); color: var(--neon-green); background: rgba(0,255,102,0.1);" onClick=${saveCustomLeakMatrix}>
                            💾 SIMPAN KALIBRASI KE ESP32
                        </button>
                        <button class="btn" style="padding: 5px 10px; font-size: 0.72rem;" onClick=${resetCustomLeakMatrix}>
                            🔄 RESET DEFAULT
                        </button>
                    </div>
                    ${msg ? html`<span style="font-size: 0.72rem; color: var(--neon-green); font-weight: bold;">${msg}</span>` : ''}
                </div>
            </div>
        </div>
    `;
}
