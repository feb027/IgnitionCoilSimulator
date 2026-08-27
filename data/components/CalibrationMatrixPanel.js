import { html, useState, useEffect } from '../preact.js';

export function CalibrationMatrixPanel({ state = {}, sendAction }) {
    const [activeTab, setActiveTab] = useState('spark'); // 'spark', 'cadence', 'current', 'leak'

    // Parameter 1: Kualitas Api (mA)
    const [spPrima, setSpPrima] = useState(state.calSparkPrima || 45.0);
    const [spBaik, setSpBaik] = useState(state.calSparkBaik || 35.0);
    const [spCukup, setSpCukup] = useState(state.calSparkCukup || 25.0);
    const [spKurang, setSpKurang] = useState(state.calSparkKurang || 15.0);

    // Parameter 2: Keteraturan Detak (%)
    const [cdPrima, setCdPrima] = useState(state.calCadencePrima || 98.0);
    const [cdBaik, setCdBaik] = useState(state.calCadenceBaik || 90.0);
    const [cdCukup, setCdCukup] = useState(state.calCadenceCukup || 80.0);
    const [cdKurang, setCdKurang] = useState(state.calCadenceKurang || 60.0);

    // Parameter 3: Arus Primer Peak (A)
    const [crPrima, setCrPrima] = useState(state.calCurrentPrima || 6.5);
    const [crBaik, setCrBaik] = useState(state.calCurrentBaik || 5.5);
    const [crCukup, setCrCukup] = useState(state.calCurrentCukup || 4.5);
    const [crKurang, setCrKurang] = useState(state.calCurrentKurang || 3.0);
    const [crMax, setCrMax] = useState(state.calCurrentMax || 11.5);

    // Parameter 4: Kebocoran Bodi (ARC)
    const [cutIn, setCutIn] = useState(state.leakArcCutIn || 10);
    const [arc25, setArc25] = useState(state.leakArc25 || 20);
    const [arc50, setArc50] = useState(state.leakArc50 || 30);
    const [arc75, setArc75] = useState(state.leakArc75 || 40);
    const [arc100, setArc100] = useState(state.leakArc100 || 50);

    const [msg, setMsg] = useState('');

    useEffect(() => {
        if (state.calSparkPrima !== undefined) setSpPrima(state.calSparkPrima);
        if (state.calSparkBaik !== undefined) setSpBaik(state.calSparkBaik);
        if (state.calSparkCukup !== undefined) setSpCukup(state.calSparkCukup);
        if (state.calSparkKurang !== undefined) setSpKurang(state.calSparkKurang);

        if (state.calCadencePrima !== undefined) setCdPrima(state.calCadencePrima);
        if (state.calCadenceBaik !== undefined) setCdBaik(state.calCadenceBaik);
        if (state.calCadenceCukup !== undefined) setCdCukup(state.calCadenceCukup);
        if (state.calCadenceKurang !== undefined) setCdKurang(state.calCadenceKurang);

        if (state.calCurrentPrima !== undefined) setCrPrima(state.calCurrentPrima);
        if (state.calCurrentBaik !== undefined) setCrBaik(state.calCurrentBaik);
        if (state.calCurrentCukup !== undefined) setCrCukup(state.calCurrentCukup);
        if (state.calCurrentKurang !== undefined) setCrKurang(state.calCurrentKurang);
        if (state.calCurrentMax !== undefined) setCrMax(state.calCurrentMax);

        if (state.leakArcCutIn !== undefined) setCutIn(state.leakArcCutIn);
        if (state.leakArc25 !== undefined) setArc25(state.leakArc25);
        if (state.leakArc50 !== undefined) setArc50(state.leakArc50);
        if (state.leakArc75 !== undefined) setArc75(state.leakArc75);
        if (state.leakArc100 !== undefined) setArc100(state.leakArc100);
    }, [state]);

    const saveAllCalibration = () => {
        if (sendAction) {
            sendAction('setFullCalibrationMatrix', {
                sparkPrima: parseFloat(spPrima), sparkBaik: parseFloat(spBaik), sparkCukup: parseFloat(spCukup), sparkKurang: parseFloat(spKurang),
                cadencePrima: parseFloat(cdPrima), cadenceBaik: parseFloat(cdBaik), cadenceCukup: parseFloat(cdCukup), cadenceKurang: parseFloat(cdKurang),
                currentPrima: parseFloat(crPrima), currentBaik: parseFloat(crBaik), currentCukup: parseFloat(crCukup), currentKurang: parseFloat(crKurang), currentMax: parseFloat(crMax),
                cutIn: parseInt(cutIn), arc25: parseInt(arc25), arc50: parseInt(arc50), arc75: parseInt(arc75), arc100: parseInt(arc100), arcMax: 50
            });
        }
        setMsg('✅ Seluruh 4 Matriks Kalibrasi Berhasil Disimpan ke ESP32!');
        setTimeout(() => setMsg(''), 3500);
    };

    const resetAllCalibration = () => {
        setSpPrima(45.0); setSpBaik(35.0); setSpCukup(25.0); setSpKurang(15.0);
        setCdPrima(98.0); setCdBaik(90.0); setCdCukup(80.0); setCdKurang(60.0);
        setCrPrima(6.5); setCrBaik(5.5); setCrCukup(4.5); setCrKurang(3.0); setCrMax(11.5);
        setCutIn(10); setArc25(20); setArc50(30); setArc75(40); setArc100(50);
        if (sendAction) {
            sendAction('setFullCalibrationMatrix', {
                sparkPrima: 45.0, sparkBaik: 35.0, sparkCukup: 25.0, sparkKurang: 15.0,
                cadencePrima: 98.0, cadenceBaik: 90.0, cadenceCukup: 80.0, cadenceKurang: 60.0,
                currentPrima: 6.5, currentBaik: 5.5, currentCukup: 4.5, currentKurang: 3.0, currentMax: 11.5,
                cutIn: 10, arc25: 20, arc50: 30, arc75: 40, arc100: 50, arcMax: 50
            });
        }
        setMsg('🔄 Reset Seluruh Matriks ke Standar Pabrikan');
        setTimeout(() => setMsg(''), 3500);
    };

    // Live Metrics
    const liveSparkmA = state.coilSparkCurrentmA || 0.0;
    const fired = state.coilFiredCount || 0, confirmed = state.coilSparkReturnCount || state.coilIgfCount || 0;
    const liveCadence = fired > 0 ? (confirmed / fired) * 100 : 100.0;
    const liveCurrentA = state.coilPeakCurrentA || 0.0;
    const liveArcs = state.coilLeakRate !== undefined ? state.coilLeakRate : (state.coilLeakCount || 0);

    const tabs = [
        { id: 'spark', label: '⚡ 1. KUALITAS API (mA)', color: 'var(--neon-cyan)' },
        { id: 'cadence', label: '🎯 2. KETERATURAN DETAK (%)', color: 'var(--neon-purple)' },
        { id: 'current', label: '🔌 3. ARUS PRIMER (A)', color: 'var(--neon-green)' },
        { id: 'leak', label: '🛡️ 4. KEBOCORAN BODI (ARC)', color: 'var(--neon-yellow)' }
    ];

    return html`
        <div style="display: flex; flex-direction: column; gap: 8px; margin-top: 4px; background: rgba(0,0,0,0.3); border: 1px solid var(--border-sharp); border-radius: 6px; padding: 10px;">
            
            <!-- HEADER WITH TAB SELECTOR -->
            <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border-sharp); padding-bottom: 6px; flex-wrap: wrap; gap: 6px;">
                <span style="font-size: 0.74rem; font-weight: 800; color: var(--neon-cyan);">⚖️ KALIBRASI MANUAL 4 PARAMETER (5 TIER KELAYAKAN):</span>
                <div style="display: flex; gap: 4px; flex-wrap: wrap;">
                    ${tabs.map(t => html`
                        <button class="btn ${activeTab === t.id ? 'btn-active' : ''}" 
                            style="padding: 3px 8px; font-size: 0.68rem; font-weight: bold; border-color: ${activeTab === t.id ? t.color : 'var(--border-sharp)'}; background: ${activeTab === t.id ? 'rgba(255,255,255,0.1)' : 'transparent'}; color: ${activeTab === t.id ? t.color : 'var(--text-muted)'};"
                            onClick=${() => setActiveTab(t.id)}>
                            ${t.label}
                        </button>
                    `)}
                </div>
            </div>

            <!-- TAB 1: KUALITAS API (0 - 60 mA) -->
            ${activeTab === 'spark' ? html`
                <div>
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; font-size: 0.72rem;">
                        <span style="color: var(--text-muted);">LIVE API BUSI: <strong style="color: var(--neon-cyan);">${liveSparkmA.toFixed(1)} mA</strong></span>
                        <span style="font-size: 0.65rem; color: var(--text-muted);">Skala: 0 - 60 mA</span>
                    </div>
                    <div style="position: relative; height: 20px; background: #111; border: 1px solid #333; border-radius: 4px; overflow: hidden; margin-bottom: 8px;">
                        <div style="position: absolute; left: 0; width: 100%; height: 100%; background: linear-gradient(90deg, #ff2d55 0%, #ff9500 ${(spKurang/60)*100}%, #ffe600 ${(spCukup/60)*100}%, #a6ff00 ${(spBaik/60)*100}%, #00ff66 ${(spPrima/60)*100}%); opacity: 0.45;"></div>
                        <div style="position: absolute; left: calc(${Math.min(100, (liveSparkmA/60)*100)}% - 2px); top: 0; width: 4px; height: 100%; background: #fff; box-shadow: 0 0 6px #fff; z-index: 5;"></div>
                    </div>
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(115px, 1fr)); gap: 6px;">
                        <div style="background: rgba(0,255,102,0.05); border: 1px solid var(--neon-green); border-radius: 4px; padding: 4px 6px;">
                            <div style="display: flex; justify-content: space-between; font-size: 0.65rem; color: var(--neon-green);"><strong>PRIMA (≥):</strong><strong>${spPrima}mA</strong></div>
                            <input type="range" min="30" max="60" step="1" value=${spPrima} style="width: 100%; accent-color: var(--neon-green);" onInput=${(e) => setSpPrima(parseFloat(e.target.value))} />
                        </div>
                        <div style="background: rgba(166,255,0,0.05); border: 1px solid #a6ff00; border-radius: 4px; padding: 4px 6px;">
                            <div style="display: flex; justify-content: space-between; font-size: 0.65rem; color: #a6ff00;"><strong>BAIK (≥):</strong><strong>${spBaik}mA</strong></div>
                            <input type="range" min="20" max="45" step="1" value=${spBaik} style="width: 100%; accent-color: #a6ff00;" onInput=${(e) => setSpBaik(parseFloat(e.target.value))} />
                        </div>
                        <div style="background: rgba(255,230,0,0.05); border: 1px solid var(--neon-yellow); border-radius: 4px; padding: 4px 6px;">
                            <div style="display: flex; justify-content: space-between; font-size: 0.65rem; color: var(--neon-yellow);"><strong>CUKUP (≥):</strong><strong>${spCukup}mA</strong></div>
                            <input type="range" min="15" max="35" step="1" value=${spCukup} style="width: 100%; accent-color: var(--neon-yellow);" onInput=${(e) => setSpCukup(parseFloat(e.target.value))} />
                        </div>
                        <div style="background: rgba(255,149,0,0.05); border: 1px solid var(--neon-orange); border-radius: 4px; padding: 4px 6px;">
                            <div style="display: flex; justify-content: space-between; font-size: 0.65rem; color: var(--neon-orange);"><strong>KURANG (≥):</strong><strong>${spKurang}mA</strong></div>
                            <input type="range" min="5" max="25" step="1" value=${spKurang} style="width: 100%; accent-color: var(--neon-orange);" onInput=${(e) => setSpKurang(parseFloat(e.target.value))} />
                        </div>
                    </div>
                </div>
            ` : ''}

            <!-- TAB 2: KETERATURAN DETAK (0 - 100%) -->
            ${activeTab === 'cadence' ? html`
                <div>
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; font-size: 0.72rem;">
                        <span style="color: var(--text-muted);">LIVE SINKRONISASI: <strong style="color: var(--neon-purple);">${liveCadence.toFixed(1)}%</strong></span>
                        <span style="font-size: 0.65rem; color: var(--text-muted);">Skala: 0 - 100%</span>
                    </div>
                    <div style="position: relative; height: 20px; background: #111; border: 1px solid #333; border-radius: 4px; overflow: hidden; margin-bottom: 8px;">
                        <div style="position: absolute; left: 0; width: 100%; height: 100%; background: linear-gradient(90deg, #ff2d55 0%, #ff9500 ${cdKurang}%, #ffe600 ${cdCukup}%, #a6ff00 ${cdBaik}%, #00ff66 ${cdPrima}%); opacity: 0.45;"></div>
                        <div style="position: absolute; left: calc(${liveCadence}% - 2px); top: 0; width: 4px; height: 100%; background: #fff; box-shadow: 0 0 6px #fff; z-index: 5;"></div>
                    </div>
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(115px, 1fr)); gap: 6px;">
                        <div style="background: rgba(0,255,102,0.05); border: 1px solid var(--neon-green); border-radius: 4px; padding: 4px 6px;">
                            <div style="display: flex; justify-content: space-between; font-size: 0.65rem; color: var(--neon-green);"><strong>PRIMA (≥):</strong><strong>${cdPrima}%</strong></div>
                            <input type="range" min="90" max="100" step="1" value=${cdPrima} style="width: 100%; accent-color: var(--neon-green);" onInput=${(e) => setCdPrima(parseFloat(e.target.value))} />
                        </div>
                        <div style="background: rgba(166,255,0,0.05); border: 1px solid #a6ff00; border-radius: 4px; padding: 4px 6px;">
                            <div style="display: flex; justify-content: space-between; font-size: 0.65rem; color: #a6ff00;"><strong>BAIK (≥):</strong><strong>${cdBaik}%</strong></div>
                            <input type="range" min="80" max="95" step="1" value=${cdBaik} style="width: 100%; accent-color: #a6ff00;" onInput=${(e) => setCdBaik(parseFloat(e.target.value))} />
                        </div>
                        <div style="background: rgba(255,230,0,0.05); border: 1px solid var(--neon-yellow); border-radius: 4px; padding: 4px 6px;">
                            <div style="display: flex; justify-content: space-between; font-size: 0.65rem; color: var(--neon-yellow);"><strong>CUKUP (≥):</strong><strong>${cdCukup}%</strong></div>
                            <input type="range" min="60" max="89" step="1" value=${cdCukup} style="width: 100%; accent-color: var(--neon-yellow);" onInput=${(e) => setCdCukup(parseFloat(e.target.value))} />
                        </div>
                        <div style="background: rgba(255,149,0,0.05); border: 1px solid var(--neon-orange); border-radius: 4px; padding: 4px 6px;">
                            <div style="display: flex; justify-content: space-between; font-size: 0.65rem; color: var(--neon-orange);"><strong>KURANG (≥):</strong><strong>${cdKurang}%</strong></div>
                            <input type="range" min="40" max="75" step="1" value=${cdKurang} style="width: 100%; accent-color: var(--neon-orange);" onInput=${(e) => setCdKurang(parseFloat(e.target.value))} />
                        </div>
                    </div>
                </div>
            ` : ''}

            <!-- TAB 3: ARUS PRIMER (0 - 15 A) -->
            ${activeTab === 'current' ? html`
                <div>
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; font-size: 0.72rem;">
                        <span style="color: var(--text-muted);">LIVE ARUS PEAK: <strong style="color: var(--neon-green);">${liveCurrentA.toFixed(1)} A</strong></span>
                        <span style="font-size: 0.65rem; color: var(--text-muted);">Skala: 0 - 15 A</span>
                    </div>
                    <div style="position: relative; height: 20px; background: #111; border: 1px solid #333; border-radius: 4px; overflow: hidden; margin-bottom: 8px;">
                        <div style="position: absolute; left: 0; width: 100%; height: 100%; background: linear-gradient(90deg, #ff2d55 0%, #ff9500 ${(crKurang/15)*100}%, #ffe600 ${(crCukup/15)*100}%, #00ff66 ${(crPrima/15)*100}%, #ff9500 ${(crMax/15)*100}%, #ff2d55 100%); opacity: 0.45;"></div>
                        <div style="position: absolute; left: calc(${Math.min(100, (liveCurrentA/15)*100)}% - 2px); top: 0; width: 4px; height: 100%; background: #fff; box-shadow: 0 0 6px #fff; z-index: 5;"></div>
                    </div>
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(115px, 1fr)); gap: 6px;">
                        <div style="background: rgba(0,255,102,0.05); border: 1px solid var(--neon-green); border-radius: 4px; padding: 4px 6px;">
                            <div style="display: flex; justify-content: space-between; font-size: 0.65rem; color: var(--neon-green);"><strong>PRIMA (≥):</strong><strong>${crPrima}A</strong></div>
                            <input type="range" min="5.0" max="9.0" step="0.1" value=${crPrima} style="width: 100%; accent-color: var(--neon-green);" onInput=${(e) => setCrPrima(parseFloat(e.target.value))} />
                        </div>
                        <div style="background: rgba(166,255,0,0.05); border: 1px solid #a6ff00; border-radius: 4px; padding: 4px 6px;">
                            <div style="display: flex; justify-content: space-between; font-size: 0.65rem; color: #a6ff00;"><strong>BAIK (≥):</strong><strong>${crBaik}A</strong></div>
                            <input type="range" min="4.0" max="7.0" step="0.1" value=${crBaik} style="width: 100%; accent-color: #a6ff00;" onInput=${(e) => setCrBaik(parseFloat(e.target.value))} />
                        </div>
                        <div style="background: rgba(255,230,0,0.05); border: 1px solid var(--neon-yellow); border-radius: 4px; padding: 4px 6px;">
                            <div style="display: flex; justify-content: space-between; font-size: 0.65rem; color: var(--neon-yellow);"><strong>CUKUP (≥):</strong><strong>${crCukup}A</strong></div>
                            <input type="range" min="3.0" max="6.0" step="0.1" value=${crCukup} style="width: 100%; accent-color: var(--neon-yellow);" onInput=${(e) => setCrCukup(parseFloat(e.target.value))} />
                        </div>
                        <div style="background: rgba(255,45,85,0.05); border: 1px solid var(--neon-red); border-radius: 4px; padding: 4px 6px;">
                            <div style="display: flex; justify-content: space-between; font-size: 0.65rem; color: var(--neon-red);"><strong>MAX KORSLET:</strong><strong>${crMax}A</strong></div>
                            <input type="range" min="9.0" max="14.0" step="0.1" value=${crMax} style="width: 100%; accent-color: var(--neon-red);" onInput=${(e) => setCrMax(parseFloat(e.target.value))} />
                        </div>
                    </div>
                </div>
            ` : ''}

            <!-- TAB 4: KEBOCORAN BODI (0 - 50 ARC) -->
            ${activeTab === 'leak' ? html`
                <div>
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; font-size: 0.72rem;">
                        <span style="color: var(--text-muted);">LIVE ARC: <strong style="color: ${liveArcs > 0 ? 'var(--neon-red)' : 'var(--neon-green)'};">${liveArcs} ARC (${state.coilLeakPercent || 0}%)</strong></span>
                        <span style="font-size: 0.65rem; color: var(--text-muted);">Skala: 0 - 50 ARC</span>
                    </div>
                    <div style="position: relative; height: 20px; background: #111; border: 1px solid #333; border-radius: 4px; overflow: hidden; margin-bottom: 8px;">
                        <div style="position: absolute; left: 0; width: ${(arc25/50)*100}%; height: 100%; background: linear-gradient(90deg, #00ff66, #a6ff00); opacity: 0.45;"></div>
                        <div style="position: absolute; left: ${(arc25/50)*100}%; width: ${((arc50-arc25)/50)*100}%; height: 100%; background: linear-gradient(90deg, #a6ff00, #ffe600); opacity: 0.45;"></div>
                        <div style="position: absolute; left: ${(arc50/50)*100}%; width: ${((arc75-arc50)/50)*100}%; height: 100%; background: linear-gradient(90deg, #ffe600, #ff9500); opacity: 0.5;"></div>
                        <div style="position: absolute; left: ${(arc75/50)*100}%; width: ${((50-arc75)/50)*100}%; height: 100%; background: linear-gradient(90deg, #ff9500, #ff2d55); opacity: 0.6;"></div>
                        <div style="position: absolute; left: calc(${Math.min(100, (liveArcs/50)*100)}% - 2px); top: 0; width: 4px; height: 100%; background: #fff; box-shadow: 0 0 6px #fff; z-index: 5;"></div>
                    </div>
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(115px, 1fr)); gap: 6px;">
                        <div style="background: rgba(0,255,102,0.05); border: 1px solid var(--neon-green); border-radius: 4px; padding: 4px 6px;">
                            <div style="display: flex; justify-content: space-between; font-size: 0.65rem; color: var(--neon-green);"><strong>0% (CUT-IN):</strong><strong>${cutIn}A</strong></div>
                            <input type="range" min="1" max="15" value=${cutIn} style="width: 100%; accent-color: var(--neon-green);" onInput=${(e) => setCutIn(parseInt(e.target.value))} />
                        </div>
                        <div style="background: rgba(166,255,0,0.05); border: 1px solid #a6ff00; border-radius: 4px; padding: 4px 6px;">
                            <div style="display: flex; justify-content: space-between; font-size: 0.65rem; color: #a6ff00;"><strong>25% (MIKRO):</strong><strong>${arc25}A</strong></div>
                            <input type="range" min="5" max="25" value=${arc25} style="width: 100%; accent-color: #a6ff00;" onInput=${(e) => setArc25(parseInt(e.target.value))} />
                        </div>
                        <div style="background: rgba(255,230,0,0.05); border: 1px solid var(--neon-yellow); border-radius: 4px; padding: 4px 6px;">
                            <div style="display: flex; justify-content: space-between; font-size: 0.65rem; color: var(--neon-yellow);"><strong>50% (SEDANG):</strong><strong>${arc50}A</strong></div>
                            <input type="range" min="15" max="35" value=${arc50} style="width: 100%; accent-color: var(--neon-yellow);" onInput=${(e) => setArc50(parseInt(e.target.value))} />
                        </div>
                        <div style="background: rgba(255,149,0,0.05); border: 1px solid var(--neon-orange); border-radius: 4px; padding: 4px 6px;">
                            <div style="display: flex; justify-content: space-between; font-size: 0.65rem; color: var(--neon-orange);"><strong>75% (BOCOR):</strong><strong>${arc75}A</strong></div>
                            <input type="range" min="25" max="45" value=${arc75} style="width: 100%; accent-color: var(--neon-orange);" onInput=${(e) => setArc75(parseInt(e.target.value))} />
                        </div>
                        <div style="background: rgba(255,45,85,0.05); border: 1px solid var(--neon-red); border-radius: 4px; padding: 4px 6px;">
                            <div style="display: flex; justify-content: space-between; font-size: 0.65rem; color: var(--neon-red);"><strong>100% (JEBOL):</strong><strong>${arc100}A</strong></div>
                            <input type="range" min="35" max="50" value=${arc100} style="width: 100%; accent-color: var(--neon-red);" onInput=${(e) => setArc100(parseInt(e.target.value))} />
                        </div>
                    </div>
                </div>
            ` : ''}

            <!-- ACTION BUTTONS -->
            <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 6px; flex-wrap: wrap; gap: 6px;">
                <div style="display: flex; gap: 8px;">
                    <button class="btn" style="padding: 5px 12px; font-size: 0.72rem; font-weight: bold; border-color: var(--neon-green); color: var(--neon-green); background: rgba(0,255,102,0.1);" onClick=${saveAllCalibration}>
                        💾 SIMPAN SEMUA KALIBRASI KE ESP32
                    </button>
                    <button class="btn" style="padding: 5px 10px; font-size: 0.72rem;" onClick=${resetAllCalibration}>
                        🔄 RESET STANDAR PABRIKAN
                    </button>
                </div>
                ${msg ? html`<span style="font-size: 0.72rem; color: var(--neon-green); font-weight: bold;">${msg}</span>` : ''}
            </div>
        </div>
    `;
}
    `;
}
