import { html, useState, useEffect } from '../preact.js';

function SliderItem({ label, val, unit = "", min, max, step = 1, color, onInput }) {
    return html`
        <div style="background: rgba(255,255,255,0.03); border: 1px solid ${color}; border-radius: 4px; padding: 4px 6px;">
            <div style="display: flex; justify-content: space-between; font-size: 0.65rem; color: ${color};">
                <strong>${label}:</strong><strong>${val}${unit}</strong>
            </div>
            <input type="range" min=${min} max=${max} step=${step} value=${val} 
                style="width: 100%; accent-color: ${color};" onInput=${(e) => onInput(parseFloat(e.target.value))} />
        </div>
    `;
}

function LiveBar({ liveVal, maxVal, gradientStr, unit = "", color = "var(--neon-cyan)", label = "LIVE NILAI" }) {
    const pos = Math.max(0, Math.min(100, (liveVal / maxVal) * 100));
    return html`
        <div style="margin-bottom: 8px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; font-size: 0.72rem;">
                <span style="color: var(--text-muted);">${label}: <strong style="color: ${color};">${Number(liveVal).toFixed(1)} ${unit}</strong></span>
                <span style="font-size: 0.65rem; color: var(--text-muted);">Skala: 0 - ${maxVal} ${unit}</span>
            </div>
            <div style="position: relative; height: 18px; background: #111; border: 1px solid #333; border-radius: 4px; overflow: hidden;">
                <div style="position: absolute; left: 0; width: 100%; height: 100%; background: ${gradientStr}; opacity: 0.45;"></div>
                <div style="position: absolute; left: calc(${pos}% - 2px); top: 0; width: 4px; height: 100%; background: #fff; box-shadow: 0 0 6px #fff; z-index: 5;"></div>
            </div>
        </div>
    `;
}

export function CalibrationMatrixPanel({ state = {}, sendAction }) {
    const [activeTab, setActiveTab] = useState('spark');

    // 1: Spark mA & Gain
    const [spPrima, setSpPrima] = useState(state.calSparkPrima || 45.0), [spBaik, setSpBaik] = useState(state.calSparkBaik || 35.0);
    const [spCukup, setSpCukup] = useState(state.calSparkCukup || 25.0), [spKurang, setSpKurang] = useState(state.calSparkKurang || 15.0), [spGain, setSpGain] = useState(state.calSparkGain || 1.00);

    // 2: Cadence % & Debounce/Window
    const [cdPrima, setCdPrima] = useState(state.calCadencePrima || 98.0), [cdBaik, setCdBaik] = useState(state.calCadenceBaik || 90.0);
    const [cdCukup, setCdCukup] = useState(state.calCadenceCukup || 80.0), [cdKurang, setCdKurang] = useState(state.calCadenceKurang || 60.0);
    const [cdDebounce, setCdDebounce] = useState(state.calCadenceDebounceMs || 1.5), [cdWindow, setCdWindow] = useState(state.calCadenceWindowMs || 3.5);

    // 3: Current A & Zero Volt
    const [crPrima, setCrPrima] = useState(state.calCurrentPrima || 6.5), [crBaik, setCrBaik] = useState(state.calCurrentBaik || 5.5);
    const [crCukup, setCrCukup] = useState(state.calCurrentCukup || 4.5), [crKurang, setCrKurang] = useState(state.calCurrentKurang || 3.0);
    const [crMax, setCrMax] = useState(state.calCurrentMax || 11.5), [crZero, setCrZero] = useState(state.calCurrentZeroVolt || 1.85);

    // 4: Temp °C & Cutoff/Offset
    const [tpPrima, setTpPrima] = useState(state.calTempPrima || 45.0), [tpBaik, setTpBaik] = useState(state.calTempBaik || 55.0);
    const [tpCukup, setTpCukup] = useState(state.calTempCukup || 65.0), [tpPanas, setTpPanas] = useState(state.calTempPanas || 75.0);
    const [tpCutoff, setTpCutoff] = useState(state.calTempCutoff || 85.0), [tpOffset, setTpOffset] = useState(state.calTempOffset || 0.0);

    // 5: Leak ARC & Modes
    const [cutIn, setCutIn] = useState(state.leakArcCutIn || 10), [arc25, setArc25] = useState(state.leakArc25 || 20);
    const [arc50, setArc50] = useState(state.leakArc50 || 30), [arc75, setArc75] = useState(state.leakArc75 || 40), [arc100, setArc100] = useState(state.leakArc100 || 50);
    const currentSens = state.coilLeakSensitivity || 1;
    const [localTh, setLocalTh] = useState(state.coilLeakThreshold || 4);
    const [localDb, setLocalDb] = useState(state.coilLeakDebounceMs !== undefined ? Number(state.coilLeakDebounceMs).toFixed(1) : "3.0");

    // 6: Power DC Calibration (Volt & Real DC Current)
    const [vtGain, setVtGain] = useState(state.calVoltGain || 1.00), [vtOffset, setVtOffset] = useState(state.calVoltOffset || 0.00);
    const [dcGain, setDcGain] = useState(state.calDcCurrentGain || 1.00), [dcOffset, setDcOffset] = useState(state.calDcCurrentOffset || 0.00);
    const [msg, setMsg] = useState('');

    useEffect(() => {
        const s = state;
        if (s.calSparkPrima !== undefined) { setSpPrima(s.calSparkPrima); setSpBaik(s.calSparkBaik); setSpCukup(s.calSparkCukup); setSpKurang(s.calSparkKurang); setSpGain(s.calSparkGain); }
        if (s.calCadencePrima !== undefined) { setCdPrima(s.calCadencePrima); setCdBaik(s.calCadenceBaik); setCdCukup(s.calCadenceCukup); setCdKurang(s.calCadenceKurang); setCdDebounce(s.calCadenceDebounceMs); setCdWindow(s.calCadenceWindowMs); }
        if (s.calCurrentPrima !== undefined) { setCrPrima(s.calCurrentPrima); setCrBaik(s.calCurrentBaik); setCrCukup(s.calCurrentCukup); setCrKurang(s.calCurrentKurang); setCrMax(s.calCurrentMax); setCrZero(s.calCurrentZeroVolt); }
        if (s.calTempPrima !== undefined) { setTpPrima(s.calTempPrima); setTpBaik(s.calTempBaik); setTpCukup(s.calTempCukup); setTpPanas(s.calTempPanas); setTpCutoff(s.calTempCutoff); setTpOffset(s.calTempOffset); }
        if (s.leakArcCutIn !== undefined) { setCutIn(s.leakArcCutIn); setArc25(s.leakArc25); setArc50(s.leakArc50); setArc75(s.leakArc75); setArc100(s.leakArc100); }
        if (s.coilLeakThreshold !== undefined) setLocalTh(s.coilLeakThreshold);
        if (s.coilLeakDebounceMs !== undefined) setLocalDb(Number(s.coilLeakDebounceMs).toFixed(1));
        if (s.calVoltGain !== undefined) { setVtGain(s.calVoltGain); setVtOffset(s.calVoltOffset); setDcGain(s.calDcCurrentGain); setDcOffset(s.calDcCurrentOffset); }
    }, [state]);

    const getPayload = (d = {}) => ({
        sparkPrima: d.spPrima ?? parseFloat(spPrima), sparkBaik: d.spBaik ?? parseFloat(spBaik), sparkCukup: d.spCukup ?? parseFloat(spCukup), sparkKurang: d.spKurang ?? parseFloat(spKurang), sparkGain: d.spGain ?? parseFloat(spGain),
        cadencePrima: d.cdPrima ?? parseFloat(cdPrima), cadenceBaik: d.cdBaik ?? parseFloat(cdBaik), cadenceCukup: d.cdCukup ?? parseFloat(cdCukup), cadenceKurang: d.cdKurang ?? parseFloat(cdKurang), cadenceDebounceMs: d.cdDebounce ?? parseFloat(cdDebounce), cadenceWindowMs: d.cdWindow ?? parseFloat(cdWindow),
        currentPrima: d.crPrima ?? parseFloat(crPrima), currentBaik: d.crBaik ?? parseFloat(crBaik), currentCukup: d.crCukup ?? parseFloat(crCukup), currentKurang: d.crKurang ?? parseFloat(crKurang), currentMax: d.crMax ?? parseFloat(crMax), currentZeroVolt: d.crZero ?? parseFloat(crZero),
        tempPrima: d.tpPrima ?? parseFloat(tpPrima), tempBaik: d.tpBaik ?? parseFloat(tpBaik), tempCukup: d.tpCukup ?? parseFloat(tpCukup), tempPanas: d.tpPanas ?? parseFloat(tpPanas), tempCutoff: d.tpCutoff ?? parseFloat(tpCutoff), tempOffset: d.tpOffset ?? parseFloat(tpOffset),
        voltGain: d.vtGain ?? parseFloat(vtGain), voltOffset: d.vtOffset ?? parseFloat(vtOffset), dcCurrentGain: d.dcGain ?? parseFloat(dcGain), dcCurrentOffset: d.dcOffset ?? parseFloat(dcOffset),
        cutIn: d.cutIn ?? parseInt(cutIn), arc25: d.arc25 ?? parseInt(arc25), arc50: d.arc50 ?? parseInt(arc50), arc75: d.arc75 ?? parseInt(arc75), arc100: d.arc100 ?? parseInt(arc100), arcMax: 50
    });

    const saveAll = () => {
        if (sendAction) sendAction('setFullCalibrationMatrix', getPayload());
        setMsg('✅ Seluruh Matriks Kalibrasi Disimpan ke ESP32!'); setTimeout(() => setMsg(''), 3500);
    };

    const resetAll = () => {
        const defs = { spPrima:45, spBaik:35, spCukup:25, spKurang:15, spGain:1.0, cdPrima:98, cdBaik:90, cdCukup:80, cdKurang:60, cdDebounce:1.5, cdWindow:3.5, crPrima:6.5, crBaik:5.5, crCukup:4.5, crKurang:3.0, crMax:11.5, crZero:1.85, tpPrima:45, tpBaik:55, tpCukup:65, tpPanas:75, tpCutoff:85, tpOffset:0, vtGain:1.0, vtOffset:0.0, dcGain:1.0, dcOffset:0.0, cutIn:10, arc25:20, arc50:30, arc75:40, arc100:50 };
        setSpPrima(45); setSpBaik(35); setSpCukup(25); setSpKurang(15); setSpGain(1); setCdPrima(98); setCdBaik(90); setCdCukup(80); setCdKurang(60); setCdDebounce(1.5); setCdWindow(3.5); setCrPrima(6.5); setCrBaik(5.5); setCrCukup(4.5); setCrKurang(3.0); setCrMax(11.5); setCrZero(1.85); setTpPrima(45); setTpBaik(55); setTpCukup(65); setTpPanas(75); setTpCutoff(85); setTpOffset(0); setVtGain(1.0); setVtOffset(0.0); setDcGain(1.0); setDcOffset(0.0); setCutIn(10); setArc25(20); setArc50(30); setArc75(40); setArc100(50);
        if (sendAction) sendAction('setFullCalibrationMatrix', getPayload(defs));
        setMsg('🔄 Reset Seluruh Matriks ke Standar Pabrikan'); setTimeout(() => setMsg(''), 3500);
    };

    // Live Metrics
    const liveSparkmA = state.coilSparkCurrentmA || 0.0, fired = state.coilFiredCount || 0, confirmed = state.coilSparkReturnCount || state.coilIgfCount || 0;
    const liveCadence = fired > 0 ? (confirmed / fired) * 100 : 100.0, liveCurrentA = state.coilPeakCurrentA || 0.0, liveTemp = state.tempCoilC !== undefined ? state.tempCoilC : 28.5;
    const liveArcs = state.coilLeakRate !== undefined ? state.coilLeakRate : (state.coilLeakCount || 0), liveVolt = state.supplyVoltage !== undefined ? state.supplyVoltage : 12.60, liveDcAmps = state.realCurrentA !== undefined ? state.realCurrentA : 0.00;

    const tabs = [
        { id: 'spark', label: '⚡ 1. API', color: 'var(--neon-cyan)' }, { id: 'cadence', label: '🎯 2. DETAK', color: 'var(--neon-purple)' },
        { id: 'current', label: '🔌 3. ARUS', color: 'var(--neon-green)' }, { id: 'temp', label: '🌡️ 4. SUHU', color: 'var(--neon-orange)' },
        { id: 'leak', label: '🛡️ 5. BOCOR', color: 'var(--neon-yellow)' }, { id: 'power', label: '⚡ 6. POWER DC', color: '#00d4ff' }
    ];
    const sensLabels = [{ id: 1, name: "0% (10A)" }, { id: 2, name: "25% (20A)" }, { id: 3, name: "50% (30A)" }, { id: 4, name: "75% (40A)" }, { id: 5, name: "100% (50A)" }, { id: 6, name: "⚙️ CUSTOM" }];

    return html`
        <div style="display: flex; flex-direction: column; gap: 8px; margin-top: 4px; background: rgba(0,0,0,0.3); border: 1px solid var(--border-sharp); border-radius: 6px; padding: 10px;">
            <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border-sharp); padding-bottom: 6px; flex-wrap: wrap; gap: 6px;">
                <span style="font-size: 0.74rem; font-weight: 800; color: var(--neon-cyan);">⚖️ KALIBRASI MANUAL 6 PARAMETER & SENSITIFITAS:</span>
                <div style="display: flex; gap: 4px; flex-wrap: wrap;">
                    ${tabs.map(t => html`
                        <button class="btn ${activeTab === t.id ? 'btn-active' : ''}" 
                            style="padding: 3px 6px; font-size: 0.66rem; font-weight: bold; border-color: ${activeTab === t.id ? t.color : 'var(--border-sharp)'}; background: ${activeTab === t.id ? 'rgba(255,255,255,0.12)' : 'transparent'}; color: ${activeTab === t.id ? t.color : 'var(--text-muted)'};"
                            onClick=${() => setActiveTab(t.id)}>${t.label}</button>
                    `)}
                </div>
            </div>

            <!-- TAB 1: SPARK -->
            ${activeTab === 'spark' ? html`
                <div>
                    <${LiveBar} liveVal=${liveSparkmA} maxVal=${60} color="var(--neon-cyan)" label="LIVE ARUS SEKUNDER" unit="mA" gradientStr="linear-gradient(90deg, #ff2d55 0%, #ff9500 ${(spKurang/60)*100}%, #ffe600 ${(spCukup/60)*100}%, #a6ff00 ${(spBaik/60)*100}%, #00ff66 ${(spPrima/60)*100}%)" />
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(105px, 1fr)); gap: 6px;">
                        <${SliderItem} label="PRIMA (≥)" val=${spPrima} unit="mA" min=${35} max=${60} color="var(--neon-green)" onInput=${setSpPrima} /> <${SliderItem} label="BAIK (≥)" val=${spBaik} unit="mA" min=${25} max=${45} color="#a6ff00" onInput=${setSpBaik} />
                        <${SliderItem} label="CUKUP (≥)" val=${spCukup} unit="mA" min=${15} max=${35} color="var(--neon-yellow)" onInput=${setSpCukup} /> <${SliderItem} label="KURANG (≥)" val=${spKurang} unit="mA" min=${5} max=${25} color="var(--neon-orange)" onInput=${setSpKurang} />
                    </div>
                    <div style="margin-top: 8px; padding-top: 6px; border-top: 1px dashed var(--border-sharp); display: flex; justify-content: space-between; align-items: center; font-size: 0.68rem;">
                        <span style="color: var(--neon-cyan); font-weight: bold;">🎯 GAIN ADC SEKUNDER:</span>
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <span>${Number(spGain).toFixed(2)}x</span>
                            <input type="range" min="0.50" max="2.00" step="0.05" value=${spGain} style="width: 120px; accent-color: var(--neon-cyan);" onInput=${(e) => setSpGain(parseFloat(e.target.value))} />
                        </div>
                    </div>
                </div>
            ` : ''}

            <!-- TAB 2: CADENCE -->
            ${activeTab === 'cadence' ? html`
                <div>
                    <${LiveBar} liveVal=${liveCadence} maxVal=${100} color="var(--neon-purple)" label="LIVE SINKRONISASI" unit="%" gradientStr="linear-gradient(90deg, #ff2d55 0%, #ff9500 ${cdKurang}%, #ffe600 ${cdCukup}%, #a6ff00 ${cdBaik}%, #00ff66 ${cdPrima}%)" />
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(105px, 1fr)); gap: 6px;">
                        <${SliderItem} label="PRIMA (≥)" val=${cdPrima} unit="%" min=${90} max=${100} color="var(--neon-green)" onInput=${setCdPrima} /> <${SliderItem} label="BAIK (≥)" val=${cdBaik} unit="%" min=${80} max=${95} color="#a6ff00" onInput=${setCdBaik} />
                        <${SliderItem} label="CUKUP (≥)" val=${cdCukup} unit="%" min=${60} max=${89} color="var(--neon-yellow)" onInput=${setCdCukup} /> <${SliderItem} label="KURANG (≥)" val=${cdKurang} unit="%" min=${40} max=${75} color="var(--neon-orange)" onInput=${setCdKurang} />
                    </div>
                    <div style="margin-top: 8px; padding-top: 6px; border-top: 1px dashed var(--border-sharp); display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 0.68rem;">
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <span style="color: var(--neon-purple); font-weight: bold;">DEBOUNCE:</span>
                            <div style="display: flex; align-items: center; gap: 6px;">
                                <span>${Number(cdDebounce).toFixed(1)}ms</span>
                                <input type="range" min="0.5" max="5.0" step="0.1" value=${cdDebounce} style="width: 80px; accent-color: var(--neon-purple);" onInput=${(e) => setCdDebounce(parseFloat(e.target.value))} />
                            </div>
                        </div>
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <span style="color: var(--neon-cyan); font-weight: bold;">TIME-GATE:</span>
                            <div style="display: flex; align-items: center; gap: 6px;">
                                <span>${Number(cdWindow).toFixed(1)}ms</span>
                                <input type="range" min="1.0" max="8.0" step="0.1" value=${cdWindow} style="width: 80px; accent-color: var(--neon-cyan);" onInput=${(e) => setCdWindow(parseFloat(e.target.value))} />
                            </div>
                        </div>
                    </div>
                </div>
            ` : ''}

            <!-- TAB 3: CURRENT -->
            ${activeTab === 'current' ? html`
                <div>
                    <${LiveBar} liveVal=${liveCurrentA} maxVal=${15} color="var(--neon-green)" label="LIVE ARUS PEAK" unit="A" gradientStr="linear-gradient(90deg, #ff2d55 0%, #ff9500 ${(crKurang/15)*100}%, #ffe600 ${(crCukup/15)*100}%, #00ff66 ${(crPrima/15)*100}%, #ff9500 ${(crMax/15)*100}%, #ff2d55 100%)" />
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(105px, 1fr)); gap: 6px;">
                        <${SliderItem} label="PRIMA (≥)" val=${crPrima} unit="A" min=${5.0} max=${9.0} step=${0.1} color="var(--neon-green)" onInput=${setCrPrima} /> <${SliderItem} label="BAIK (≥)" val=${crBaik} unit="A" min=${4.0} max=${7.0} step=${0.1} color="#a6ff00" onInput=${setCrBaik} />
                        <${SliderItem} label="CUKUP (≥)" val=${crCukup} unit="A" min=${3.0} max=${6.0} step=${0.1} color="var(--neon-yellow)" onInput=${setCrCukup} /> <${SliderItem} label="TERLALU KECIL" val=${crKurang} unit="A" min=${1.0} max=${4.0} step=${0.1} color="var(--neon-orange)" onInput=${setCrKurang} />
                        <${SliderItem} label="MAX KONSLET" val=${crMax} unit="A" min=${9.0} max=${14.0} step=${0.1} color="var(--neon-red)" onInput=${setCrMax} />
                    </div>
                    <div style="margin-top: 8px; padding-top: 6px; border-top: 1px dashed var(--border-sharp); display: flex; justify-content: space-between; align-items: center; font-size: 0.68rem;">
                        <span style="color: var(--neon-green); font-weight: bold;">🎯 ZERO OFFSET ACS712:</span>
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <span>${Number(crZero).toFixed(2)}V</span>
                            <input type="range" min="1.50" max="2.20" step="0.01" value=${crZero} style="width: 120px; accent-color: var(--neon-green);" onInput=${(e) => setCrZero(parseFloat(e.target.value))} />
                        </div>
                    </div>
                </div>
            ` : ''}

            <!-- TAB 4: TEMP -->
            ${activeTab === 'temp' ? html`
                <div>
                    <${LiveBar} liveVal=${liveTemp} maxVal=${100} color="var(--neon-orange)" label="LIVE SUHU KOIL" unit="°C" gradientStr="linear-gradient(90deg, #00ff66 0%, #a6ff00 ${tpPrima}%, #ffe600 ${tpBaik}%, #ff9500 ${tpCukup}%, #ff2d55 ${tpPanas}%)" />
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(105px, 1fr)); gap: 6px;">
                        <${SliderItem} label="ADEM (<)" val=${tpPrima} unit="°C" min=${30} max=${55} color="var(--neon-green)" onInput=${setTpPrima} /> <${SliderItem} label="NORMAL (<)" val=${tpBaik} unit="°C" min=${45} max=${65} color="#a6ff00" onInput=${setTpBaik} />
                        <${SliderItem} label="HANGAT (<)" val=${tpCukup} unit="°C" min=${55} max=${75} color="var(--neon-yellow)" onInput=${setTpCukup} /> <${SliderItem} label="PANAS (<)" val=${tpPanas} unit="°C" min=${65} max=${85} color="var(--neon-orange)" onInput=${setTpPanas} />
                        <${SliderItem} label="OVERHEAT (≥)" val=${tpCutoff} unit="°C" min=${75} max=${95} color="var(--neon-red)" onInput=${setTpCutoff} />
                    </div>
                    <div style="margin-top: 8px; padding-top: 6px; border-top: 1px dashed var(--border-sharp); display: flex; justify-content: space-between; align-items: center; font-size: 0.68rem;">
                        <span style="color: var(--neon-orange); font-weight: bold;">🎯 OFFSET SUHU DS18B20:</span>
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <span>${tpOffset >= 0 ? '+' : ''}${Number(tpOffset).toFixed(1)}°C</span>
                            <input type="range" min="-5.0" max="5.0" step="0.5" value=${tpOffset} style="width: 120px; accent-color: var(--neon-orange);" onInput=${(e) => setTpOffset(parseFloat(e.target.value))} />
                        </div>
                    </div>
                </div>
            ` : ''}

            <!-- TAB 5: LEAK -->
            ${activeTab === 'leak' ? html`
                <div>
                    <${LiveBar} liveVal=${liveArcs} maxVal=${50} color="${liveArcs > 0 ? 'var(--neon-red)' : 'var(--neon-green)'}" label="LIVE ARC PROBE" unit="ARC" gradientStr="linear-gradient(90deg, #00ff66 0%, #a6ff00 ${(arc25/50)*100}%, #ffe600 ${(arc50/50)*100}%, #ff9500 ${(arc75/50)*100}%, #ff2d55 100%)" />
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(105px, 1fr)); gap: 6px;">
                        <${SliderItem} label="0% (CUT-IN)" val=${cutIn} unit="A" min=${1} max=${15} color="var(--neon-green)" onInput=${setCutIn} /> <${SliderItem} label="25% (MIKRO)" val=${arc25} unit="A" min=${5} max=${25} color="#a6ff00" onInput=${setArc25} />
                        <${SliderItem} label="50% (SEDANG)" val=${arc50} unit="A" min=${15} max=${35} color="var(--neon-yellow)" onInput=${setArc50} /> <${SliderItem} label="75% (BOCOR)" val=${arc75} unit="A" min=${25} max=${45} color="var(--neon-orange)" onInput=${setArc75} />
                        <${SliderItem} label="100% (JEBOL)" val=${arc100} unit="A" min=${35} max=${50} color="var(--neon-red)" onInput=${setArc100} />
                    </div>
                    <div style="margin-top: 8px; padding-top: 6px; border-top: 1px dashed var(--border-sharp);">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; font-size: 0.68rem;">
                            <span style="font-weight: bold; color: var(--neon-yellow);">🎯 SENSITIVITAS PROBE BODI (PIN 36):</span>
                            <span style="font-size: 0.65rem; color: var(--text-muted);">Aktif: <strong>${sensLabels.find(s => s.id === currentSens)?.name || ""}</strong></span>
                        </div>
                        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(70px, 1fr)); gap: 4px;">
                            ${sensLabels.map(s => html`
                                <button class="btn ${currentSens === s.id ? 'btn-active' : ''}" 
                                    style="padding: 4px 2px; font-size: 0.66rem; font-weight: bold; border-color: ${currentSens === s.id ? 'var(--neon-green)' : 'var(--border-sharp)'}; background: ${currentSens === s.id ? 'rgba(0, 255, 102, 0.2)' : 'transparent'}; color: ${currentSens === s.id ? 'var(--neon-green)' : 'var(--text-muted)'};" 
                                    onClick=${() => sendAction('setLeakSensitivity', s.id)} disabled=${!state.connected}>${s.name}</button>
                            `)}
                        </div>
                        ${currentSens === 6 ? html`
                            <div style="margin-top: 6px; display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 0.68rem;">
                                <div>
                                    <div style="display: flex; justify-content: space-between; margin-bottom: 2px;"><span>AMBANG TRIGGER:</span><strong style="color: var(--neon-yellow);">${localTh} Arcs</strong></div>
                                    <input type="range" min="1" max="50" step="1" value=${localTh} style="width: 100%; accent-color: var(--neon-yellow);"
                                        onInput=${(e) => { setLocalTh(parseInt(e.target.value)); sendAction('setLeakThreshold', parseInt(e.target.value)); }} disabled=${!state.connected} />
                                </div>
                                <div>
                                    <div style="display: flex; justify-content: space-between; margin-bottom: 2px;"><span>FILTER DEBOUNCE:</span><strong style="color: var(--neon-cyan);">${localDb} ms</strong></div>
                                    <input type="range" min="0.1" max="8.0" step="0.1" value=${localDb} style="width: 100%; accent-color: var(--neon-cyan);"
                                        onInput=${(e) => { setLocalDb(parseFloat(e.target.value).toFixed(1)); sendAction('setLeakDebounce', parseFloat(e.target.value)); }} disabled=${!state.connected} />
                                </div>
                            </div>
                        ` : ''}
                    </div>
                </div>
            ` : ''}

            <!-- TAB 6: POWER DC -->
            ${activeTab === 'power' ? html`
                <div style="display: flex; flex-direction: column; gap: 8px;">
                    <div style="background: rgba(255,255,255,0.02); border: 1px solid var(--border-sharp); border-radius: 4px; padding: 6px 8px;">
                        <${LiveBar} liveVal=${liveVolt} maxVal=${20} color="var(--neon-green)" label="LIVE SUPPLY VOLTAGE" unit="V" gradientStr="linear-gradient(90deg, #ff2d55 0%, #ff9500 50%, #00ff66 65%, #00d4ff 100%)" />
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 0.68rem; margin-top: 4px;">
                            <div style="display: flex; justify-content: space-between; align-items: center;">
                                <span style="color: var(--neon-green); font-weight: bold;">OFFSET VOLT:</span>
                                <div style="display: flex; align-items: center; gap: 6px;"><span>${vtOffset >= 0 ? '+' : ''}${Number(vtOffset).toFixed(2)}V</span><input type="range" min="-3.00" max="3.00" step="0.05" value=${vtOffset} style="width: 80px; accent-color: var(--neon-green);" onInput=${(e) => setVtOffset(parseFloat(e.target.value))} /></div>
                            </div>
                            <div style="display: flex; justify-content: space-between; align-items: center;">
                                <span style="color: var(--neon-cyan); font-weight: bold;">GAIN VOLT:</span>
                                <div style="display: flex; align-items: center; gap: 6px;"><span>${Number(vtGain).toFixed(2)}x</span><input type="range" min="0.80" max="1.20" step="0.01" value=${vtGain} style="width: 80px; accent-color: var(--neon-cyan);" onInput=${(e) => setVtGain(parseFloat(e.target.value))} /></div>
                            </div>
                        </div>
                    </div>
                    <div style="background: rgba(255,255,255,0.02); border: 1px solid var(--border-sharp); border-radius: 4px; padding: 6px 8px;">
                        <${LiveBar} liveVal=${liveDcAmps} maxVal=${2.0} color="#00d4ff" label="LIVE ARUS DC BEBAN" unit="A" gradientStr="linear-gradient(90deg, #00ff66 0%, #00d4ff 40%, #ffe600 70%, #ff2d55 100%)" />
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 0.68rem; margin-top: 4px;">
                            <div style="display: flex; justify-content: space-between; align-items: center;">
                                <span style="color: #00d4ff; font-weight: bold;">OFFSET ARUS:</span>
                                <div style="display: flex; align-items: center; gap: 6px;"><span>${(dcOffset * 1000).toFixed(0)}mA</span><input type="range" min="-0.50" max="0.50" step="0.01" value=${dcOffset} style="width: 80px; accent-color: #00d4ff;" onInput=${(e) => setDcOffset(parseFloat(e.target.value))} /></div>
                            </div>
                            <div style="display: flex; justify-content: space-between; align-items: center;">
                                <span style="color: var(--neon-yellow); font-weight: bold;">GAIN ARUS:</span>
                                <div style="display: flex; align-items: center; gap: 6px;"><span>${Number(dcGain).toFixed(2)}x</span><input type="range" min="0.50" max="2.00" step="0.05" value=${dcGain} style="width: 80px; accent-color: var(--neon-yellow);" onInput=${(e) => setDcGain(parseFloat(e.target.value))} /></div>
                            </div>
                        </div>
                    </div>
                </div>
            ` : ''}

            <!-- ACTIONS -->
            <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 6px; flex-wrap: wrap; gap: 6px;">
                <div style="display: flex; gap: 8px;">
                    <button class="btn" style="padding: 5px 12px; font-size: 0.72rem; font-weight: bold; border-color: var(--neon-green); color: var(--neon-green); background: rgba(0,255,102,0.1);" onClick=${saveAll}>💾 SIMPAN SEMUA KALIBRASI KE ESP32</button>
                    <button class="btn" style="padding: 5px 10px; font-size: 0.72rem;" onClick=${resetAll}>🔄 RESET STANDAR PABRIKAN</button>
                </div>
                ${msg ? html`<span style="font-size: 0.72rem; color: var(--neon-green); font-weight: bold;">${msg}</span>` : ''}
            </div>
        </div>
    `;
}