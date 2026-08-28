import { html, useState, useEffect } from '../preact.js';

function SliderItem({ label, val, unit = "", min, max, step = 1, color, onInput }) {
    return html`
        <div style="background: rgba(255,255,255,0.03); border: 1px solid ${color}; border-radius: 4px; padding: 4px 6px;">
            <div style="display: flex; justify-content: space-between; font-size: 0.65rem; color: ${color};">
                <strong>${label}:</strong><strong>${val}${unit}</strong>
            </div>
            <input type="range" min=${min} max=${max} step=${step} value=${val} style="width: 100%; accent-color: ${color};" onInput=${(e) => onInput(parseFloat(e.target.value))} />
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
    const [activeTab, setActiveTab] = useState(state.pulseMode === 2 ? 'igf' : 'spark');

    const [spPrima, setSpPrima] = useState(state.calSparkPrima || 45.0), [spBaik, setSpBaik] = useState(state.calSparkBaik || 35.0);
    const [spCukup, setSpCukup] = useState(state.calSparkCukup || 25.0), [spKurang, setSpKurang] = useState(state.calSparkKurang || 15.0), [spGain, setSpGain] = useState(state.calSparkGain || 1.00);
    const [cdPrima, setCdPrima] = useState(state.calCadencePrima || 98.0), [cdBaik, setCdBaik] = useState(state.calCadenceBaik || 90.0);
    const [cdCukup, setCdCukup] = useState(state.calCadenceCukup || 80.0), [cdKurang, setCdKurang] = useState(state.calCadenceKurang || 60.0);
    const [cdDebounce, setCdDebounce] = useState(state.calCadenceDebounceMs || 1.5), [cdWindow, setCdWindow] = useState(state.calCadenceWindowMs || 3.5);
    const [crPrima, setCrPrima] = useState(state.calCurrentPrima || 6.5), [crBaik, setCrBaik] = useState(state.calCurrentBaik || 5.5);
    const [crCukup, setCrCukup] = useState(state.calCurrentCukup || 4.5), [crKurang, setCrKurang] = useState(state.calCurrentKurang || 3.0);
    const [crMax, setCrMax] = useState(state.calCurrentMax || 11.5), [crZero, setCrZero] = useState(state.calCurrentZeroVolt || 1.85);
    const [tpPrima, setTpPrima] = useState(state.calTempPrima || 45.0), [tpBaik, setTpBaik] = useState(state.calTempBaik || 55.0);
    const [tpCukup, setTpCukup] = useState(state.calTempCukup || 65.0), [tpPanas, setTpPanas] = useState(state.calTempPanas || 75.0);
    const [tpCutoff, setTpCutoff] = useState(state.calTempCutoff || 85.0), [tpOffset, setTpOffset] = useState(state.calTempOffset || 0.0);
    const [cutIn, setCutIn] = useState(state.leakArcCutIn || 10), [arc25, setArc25] = useState(state.leakArc25 || 20);
    const [arc50, setArc50] = useState(state.leakArc50 || 30), [arc75, setArc75] = useState(state.leakArc75 || 40), [arc100, setArc100] = useState(state.leakArc100 || 50);
    const currentSens = state.coilLeakSensitivity || 1, [localTh, setLocalTh] = useState(state.coilLeakThreshold || 4);
    const [localDb, setLocalDb] = useState(state.coilLeakDebounceMs !== undefined ? Number(state.coilLeakDebounceMs).toFixed(1) : "3.0");
    const [vtGain, setVtGain] = useState(state.calVoltGain || 1.00), [vtOffset, setVtOffset] = useState(state.calVoltOffset || 0.00);
    const [dcGain, setDcGain] = useState(state.calDcCurrentGain || 1.00), [dcOffset, setDcOffset] = useState(state.calDcCurrentOffset || 0.00);
    const [igfPrima, setIgfPrima] = useState(state.calIgfPrima || 98.0), [igfBaik, setIgfBaik] = useState(state.calIgfBaik || 90.0);
    const [igfCukup, setIgfCukup] = useState(state.calIgfCukup || 80.0), [igfKurang, setIgfKurang] = useState(state.calIgfKurang || 60.0);
    const [igfDebounce, setIgfDebounce] = useState(state.calIgfDebounceUs || 50.0), [igfWindow, setIgfWindow] = useState(state.calIgfWindowMs || 4.0);

    const [msg, setMsg] = useState(''), [initialized, setInitialized] = useState(false);

    useEffect(() => {
        if (!initialized && state.calSparkPrima !== undefined) {
            const s = state;
            setSpPrima(s.calSparkPrima); setSpBaik(s.calSparkBaik); setSpCukup(s.calSparkCukup); setSpKurang(s.calSparkKurang); setSpGain(s.calSparkGain);
            setCdPrima(s.calCadencePrima); setCdBaik(s.calCadenceBaik); setCdCukup(s.calCadenceCukup); setCdKurang(s.calCadenceKurang); setCdDebounce(s.calCadenceDebounceMs); setCdWindow(s.calCadenceWindowMs);
            setCrPrima(s.calCurrentPrima); setCrBaik(s.calCurrentBaik); setCrCukup(s.calCurrentCukup); setCrKurang(s.calCurrentKurang); setCrMax(s.calCurrentMax); setCrZero(s.calCurrentZeroVolt);
            setTpPrima(s.calTempPrima); setTpBaik(s.calTempBaik); setTpCukup(s.calTempCukup); setTpPanas(s.calTempPanas); setTpCutoff(s.calTempCutoff); setTpOffset(s.calTempOffset);
            setCutIn(s.leakArcCutIn); setArc25(s.leakArc25); setArc50(s.leakArc50); setArc75(s.leakArc75); setArc100(s.leakArc100);
            if (s.coilLeakThreshold !== undefined) setLocalTh(s.coilLeakThreshold);
            if (s.coilLeakDebounceMs !== undefined) setLocalDb(Number(s.coilLeakDebounceMs).toFixed(1));
            setVtGain(s.calVoltGain); setVtOffset(s.calVoltOffset); setDcGain(s.calDcCurrentGain); setDcOffset(s.calDcCurrentOffset);
            if (s.calIgfPrima !== undefined) { setIgfPrima(s.calIgfPrima); setIgfBaik(s.calIgfBaik); setIgfCukup(s.calIgfCukup); setIgfKurang(s.calIgfKurang); setIgfDebounce(s.calIgfDebounceUs); setIgfWindow(s.calIgfWindowMs); }
            setInitialized(true);
        }
    }, [state.calSparkPrima, initialized]);

    const getPayload = (d = {}) => ({
        sparkPrima: d.spPrima ?? parseFloat(spPrima), sparkBaik: d.spBaik ?? parseFloat(spBaik), sparkCukup: d.spCukup ?? parseFloat(spCukup), sparkKurang: d.spKurang ?? parseFloat(spKurang), sparkGain: d.spGain ?? parseFloat(spGain),
        cadencePrima: d.cdPrima ?? parseFloat(cdPrima), cadenceBaik: d.cdBaik ?? parseFloat(cdBaik), cadenceCukup: d.cdCukup ?? parseFloat(cdCukup), cadenceKurang: d.cdKurang ?? parseFloat(cdKurang), cadenceDebounceMs: d.cdDebounce ?? parseFloat(cdDebounce), cadenceWindowMs: d.cdWindow ?? parseFloat(cdWindow),
        currentPrima: d.crPrima ?? parseFloat(crPrima), currentBaik: d.crBaik ?? parseFloat(crBaik), currentCukup: d.crCukup ?? parseFloat(crCukup), currentKurang: d.crKurang ?? parseFloat(crKurang), currentMax: d.crMax ?? parseFloat(crMax), currentZeroVolt: d.crZero ?? parseFloat(crZero),
        tempPrima: d.tpPrima ?? parseFloat(tpPrima), tempBaik: d.tpBaik ?? parseFloat(tpBaik), tempCukup: d.tpCukup ?? parseFloat(tpCukup), tempPanas: d.tpPanas ?? parseFloat(tpPanas), tempCutoff: d.tpCutoff ?? parseFloat(tpCutoff), tempOffset: d.tpOffset ?? parseFloat(tpOffset),
        voltGain: d.vtGain ?? parseFloat(vtGain), voltOffset: d.vtOffset ?? parseFloat(vtOffset), dcCurrentGain: d.dcGain ?? parseFloat(dcGain), dcCurrentOffset: d.dcOffset ?? parseFloat(dcOffset),
        igfPrima: d.igfPrima ?? parseFloat(igfPrima), igfBaik: d.igfBaik ?? parseFloat(igfBaik), igfCukup: d.igfCukup ?? parseFloat(igfCukup), igfKurang: d.igfKurang ?? parseFloat(igfKurang), igfDebounceUs: d.igfDebounce ?? parseFloat(igfDebounce), igfWindowMs: d.igfWindow ?? parseFloat(igfWindow),
        cutIn: d.cutIn ?? parseInt(cutIn), arc25: d.arc25 ?? parseInt(arc25), arc50: d.arc50 ?? parseInt(arc50), arc75: d.arc75 ?? parseInt(arc75), arc100: d.arc100 ?? parseInt(arc100), arcMax: 50
    });

    const saveAll = () => {
        if (sendAction) sendAction('setFullCalibrationMatrix', getPayload());
        setMsg('✅ Matriks Kalibrasi Disimpan!'); setTimeout(() => setMsg(''), 3500);
    };

    const resetAll = () => {
        const defs = { spPrima:45, spBaik:35, spCukup:25, spKurang:15, spGain:1.0, cdPrima:98, cdBaik:90, cdCukup:80, cdKurang:60, cdDebounce:1.5, cdWindow:3.5, crPrima:6.5, crBaik:5.5, crCukup:4.5, crKurang:3.0, crMax:11.5, crZero:1.85, tpPrima:45, tpBaik:55, tpCukup:65, tpPanas:75, tpCutoff:85, tpOffset:0, vtGain:1.0, vtOffset:0.0, dcGain:1.0, dcOffset:0.0, igfPrima:98, igfBaik:90, igfCukup:80, igfKurang:60, igfDebounce:50, igfWindow:4.0, cutIn:10, arc25:20, arc50:30, arc75:40, arc100:50 };
        setSpPrima(45); setSpBaik(35); setSpCukup(25); setSpKurang(15); setSpGain(1); setCdPrima(98); setCdBaik(90); setCdCukup(80); setCdKurang(60); setCdDebounce(1.5); setCdWindow(3.5); setCrPrima(6.5); setCrBaik(5.5); setCrCukup(4.5); setCrKurang(3.0); setCrMax(11.5); setCrZero(1.85); setTpPrima(45); setTpBaik(55); setTpCukup(65); setTpPanas(75); setTpCutoff(85); setTpOffset(0); setVtGain(1.0); setVtOffset(0.0); setDcGain(1.0); setDcOffset(0.0); setIgfPrima(98); setIgfBaik(90); setIgfCukup(80); setIgfKurang(60); setIgfDebounce(50); setIgfWindow(4.0); setCutIn(10); setArc25(20); setArc50(30); setArc75(40); setArc100(50);
        if (sendAction) sendAction('setFullCalibrationMatrix', getPayload(defs));
        setMsg('🔄 Reset Matriks ke Standar'); setTimeout(() => setMsg(''), 3500);
    };

    const liveSparkmA = state.coilSparkCurrentmA || 0.0, fired = state.coilFiredCount || 0, confirmed = state.coilSparkReturnCount || state.coilIgfCount || 0;
    const liveCadence = fired > 0 ? (confirmed / fired) * 100 : 100.0, liveCurrentA = state.coilPeakCurrentA || 0.0, liveTemp = state.tempCoilC !== undefined ? state.tempCoilC : 28.5;
    const liveVolt = state.supplyVoltage !== undefined ? state.supplyVoltage : 12.60, liveDcAmps = state.realCurrentA !== undefined ? state.realCurrentA : 0.00;
    const liveIgf = fired > 0 ? ((state.coilIgfCount || 0) / fired) * 100 : 100.0;

    const tabs = [
        { id: 'spark', label: '⚡ 1. API', color: 'var(--neon-cyan)' }, { id: 'cadence', label: '🎯 2. DETAK', color: 'var(--neon-purple)' },
        { id: 'igf', label: '🔌 3. IGF 4P', color: '#c084fc' }, { id: 'current', label: '⚡ 4. ARUS', color: 'var(--neon-green)' },
        { id: 'temp', label: '🌡️ 5. SUHU', color: 'var(--neon-orange)' }, { id: 'leak', label: '🛡️ 6. BOCOR', color: 'var(--neon-yellow)' }, { id: 'power', label: '🔋 7. POWER', color: '#00d4ff' }
    ];
    const sensLabels = [{ id: 1, name: "0% (10A)" }, { id: 2, name: "25% (20A)" }, { id: 3, name: "50% (30A)" }, { id: 4, name: "75% (40A)" }, { id: 5, name: "100% (50A)" }, { id: 6, name: "⚙️ CUSTOM" }];

    return html`
        <div style="display: flex; flex-direction: column; gap: 8px; margin-top: 4px; background: rgba(0,0,0,0.3); border: 1px solid var(--border-sharp); border-radius: 6px; padding: 10px;">
            <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border-sharp); padding-bottom: 6px; flex-wrap: wrap; gap: 6px;">
                <span style="font-size: 0.74rem; font-weight: 800; color: var(--neon-cyan);">⚖️ KALIBRASI MANUAL 7 MATRIKS SENSOR:</span>
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
                    <div style="margin-top: 6px; display: flex; justify-content: space-between; align-items: center; font-size: 0.68rem;">
                        <span style="color: var(--neon-cyan); font-weight: bold;">🎯 GAIN ADC SEKUNDER:</span>
                        <div style="display: flex; align-items: center; gap: 8px;"><span>${Number(spGain).toFixed(2)}x</span><input type="range" min="0.50" max="2.00" step="0.05" value=${spGain} style="width: 120px; accent-color: var(--neon-cyan);" onInput=${(e) => setSpGain(parseFloat(e.target.value))} /></div>
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
                    <div style="margin-top: 6px; display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 0.68rem;">
                        <div style="display: flex; justify-content: space-between; align-items: center;"><span style="color: var(--neon-purple); font-weight: bold;">DEBOUNCE:</span><div style="display: flex; align-items: center; gap: 4px;"><span>${Number(cdDebounce).toFixed(1)}ms</span><input type="range" min="0.5" max="5.0" step="0.1" value=${cdDebounce} style="width: 70px;" onInput=${(e) => setCdDebounce(parseFloat(e.target.value))} /></div></div>
                        <div style="display: flex; justify-content: space-between; align-items: center;"><span style="color: var(--neon-cyan); font-weight: bold;">TIME-GATE:</span><div style="display: flex; align-items: center; gap: 4px;"><span>${Number(cdWindow).toFixed(1)}ms</span><input type="range" min="1.0" max="8.0" step="0.1" value=${cdWindow} style="width: 70px;" onInput=${(e) => setCdWindow(parseFloat(e.target.value))} /></div></div>
                    </div>
                </div>
            ` : ''}

            <!-- TAB 3: IGF (PIN 34) -->
            ${activeTab === 'igf' ? html`
                <div>
                    <${LiveBar} liveVal=${liveIgf} maxVal=${100} color="#c084fc" label="LIVE RESPON IGF (PIN 34)" unit="%" gradientStr="linear-gradient(90deg, #ff2d55 0%, #ff9500 ${igfKurang}%, #ffe600 ${igfCukup}%, #a6ff00 ${igfBaik}%, #00ff66 ${igfPrima}%)" />
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(105px, 1fr)); gap: 6px;">
                        <${SliderItem} label="PRIMA (≥)" val=${igfPrima} unit="%" min=${90} max=${100} color="var(--neon-green)" onInput=${setIgfPrima} />
                        <${SliderItem} label="BAIK (≥)" val=${igfBaik} unit="%" min=${80} max=${95} color="#a6ff00" onInput=${setIgfBaik} />
                        <${SliderItem} label="CUKUP (≥)" val=${igfCukup} unit="%" min=${60} max=${89} color="var(--neon-yellow)" onInput=${setIgfCukup} />
                        <${SliderItem} label="KURANG (≥)" val=${igfKurang} unit="%" min=${40} max=${75} color="var(--neon-orange)" onInput=${setIgfKurang} />
                    </div>
                    <div style="margin-top: 6px; display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 0.68rem;">
                        <div style="display: flex; justify-content: space-between; align-items: center;"><span style="color: #c084fc; font-weight: bold;">FILTER DEBOUNCE:</span><div style="display: flex; align-items: center; gap: 4px;"><span>${Number(igfDebounce).toFixed(0)}µs</span><input type="range" min="10" max="500" step="10" value=${igfDebounce} style="width: 70px;" onInput=${(e) => setIgfDebounce(parseFloat(e.target.value))} /></div></div>
                        <div style="display: flex; justify-content: space-between; align-items: center;"><span style="color: var(--neon-cyan); font-weight: bold;">CAPTURE WINDOW:</span><div style="display: flex; align-items: center; gap: 4px;"><span>${Number(igfWindow).toFixed(1)}ms</span><input type="range" min="0.5" max="10.0" step="0.5" value=${igfWindow} style="width: 70px;" onInput=${(e) => setIgfWindow(parseFloat(e.target.value))} /></div></div>
                    </div>
                </div>
            ` : ''}

            <!-- TAB 4: CURRENT -->
            ${activeTab === 'current' ? html`
                <div>
                    <${LiveBar} liveVal=${liveCurrentA} maxVal=${15} color="var(--neon-green)" label="LIVE ARUS PEAK" unit="A" gradientStr="linear-gradient(90deg, #ff2d55 0%, #ff9500 ${(crKurang/15)*100}%, #ffe600 ${(crCukup/15)*100}%, #00ff66 ${(crPrima/15)*100}%, #ff9500 ${(crMax/15)*100}%, #ff2d55 100%)" />
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(105px, 1fr)); gap: 6px;">
                        <${SliderItem} label="PRIMA (≥)" val=${crPrima} unit="A" min=${5.0} max=${9.0} step=${0.1} color="var(--neon-green)" onInput=${setCrPrima} /> <${SliderItem} label="BAIK (≥)" val=${crBaik} unit="A" min=${4.0} max=${7.0} step=${0.1} color="#a6ff00" onInput=${setCrBaik} />
                        <${SliderItem} label="CUKUP (≥)" val=${crCukup} unit="A" min=${3.0} max=${6.0} step=${0.1} color="var(--neon-yellow)" onInput=${setCrCukup} /> <${SliderItem} label="TERLALU KECIL" val=${crKurang} unit="A" min=${1.0} max=${4.0} step=${0.1} color="var(--neon-orange)" onInput=${setCrKurang} />
                        <${SliderItem} label="MAX KONSLET" val=${crMax} unit="A" min=${9.0} max=${14.0} step=${0.1} color="var(--neon-red)" onInput=${setCrMax} />
                    </div>
                    <div style="margin-top: 6px; display: flex; justify-content: space-between; align-items: center; font-size: 0.68rem;">
                        <span style="color: var(--neon-green); font-weight: bold;">🎯 ZERO VOLTAGE ACS712:</span>
                        <div style="display: flex; align-items: center; gap: 8px;"><span>${Number(crZero).toFixed(2)}V</span><input type="range" min="1.50" max="2.20" step="0.01" value=${crZero} style="width: 120px;" onInput=${(e) => setCrZero(parseFloat(e.target.value))} /></div>
                    </div>
                </div>
            ` : ''}

            <!-- TAB 5: TEMP -->
            ${activeTab === 'temp' ? html`
                <div>
                    <${LiveBar} liveVal=${liveTemp} maxVal=${100} color="var(--neon-orange)" label="LIVE SUHU KOIL" unit="°C" gradientStr="linear-gradient(90deg, #00ff66 0%, #a6ff00 ${(tpPrima/100)*100}%, #ffe600 ${(tpBaik/100)*100}%, #ff9500 ${(tpPanas/100)*100}%, #ff2d55 ${(tpCutoff/100)*100}%)" />
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(105px, 1fr)); gap: 6px;">
                        <${SliderItem} label="PRIMA (≤)" val=${tpPrima} unit="°C" min=${30} max=${60} color="var(--neon-green)" onInput=${setTpPrima} /> <${SliderItem} label="BAIK (≤)" val=${tpBaik} unit="°C" min=${45} max=${70} color="#a6ff00" onInput=${setTpBaik} />
                        <${SliderItem} label="CUKUP (≤)" val=${tpCukup} unit="°C" min=${55} max=${80} color="var(--neon-yellow)" onInput=${setTpCukup} /> <${SliderItem} label="PANAS (≥)" val=${tpPanas} unit="°C" min=${65} max=${90} color="var(--neon-orange)" onInput=${setTpPanas} />
                        <${SliderItem} label="CUTOFF (🔥)" val=${tpCutoff} unit="°C" min=${75} max=${105} color="var(--neon-red)" onInput=${setTpCutoff} />
                    </div>
                    <div style="margin-top: 6px; display: flex; justify-content: space-between; align-items: center; font-size: 0.68rem;">
                        <span style="color: var(--neon-orange); font-weight: bold;">🌡️ OFFSET KALIBRASI SUHU:</span>
                        <div style="display: flex; align-items: center; gap: 8px;"><span>${tpOffset > 0 ? '+' : ''}${Number(tpOffset).toFixed(1)}°C</span><input type="range" min="-10.0" max="10.0" step="0.5" value=${tpOffset} style="width: 120px;" onInput=${(e) => setTpOffset(parseFloat(e.target.value))} /></div>
                    </div>
                </div>
            ` : ''}

            <!-- TAB 6: LEAK -->
            ${activeTab === 'leak' ? html`
                <div>
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; font-size: 0.72rem;"><span style="color: var(--text-muted);">SENSITIFITAS KEBOCORAN BODI:</span><span style="color: var(--neon-yellow); font-weight: bold;">${sensLabels.find(s => s.id === currentSens)?.name || "CUSTOM"}</span></div>
                    <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 4px; margin-bottom: 6px;">
                        ${sensLabels.map(s => html`<button class="btn ${currentSens === s.id ? 'btn-active' : ''}" style="padding: 4px; font-size: 0.65rem;" onClick=${() => sendAction('setLeakPreset', s.id)}>${s.name}</button>`)}
                    </div>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 0.68rem;">
                        <div style="background: rgba(255,255,255,0.02); border: 1px solid var(--border-sharp); border-radius: 4px; padding: 6px;"><div style="display: flex; justify-content: space-between; color: var(--neon-yellow);"><span>THRESHOLD:</span><strong>${localTh} / 100</strong></div><input type="range" min="1" max="50" step="1" value=${localTh} style="width: 100%;" onInput=${(e) => { setLocalTh(parseInt(e.target.value)); sendAction('setLeakThreshold', parseInt(e.target.value)); }} /></div>
                        <div style="background: rgba(255,255,255,0.02); border: 1px solid var(--border-sharp); border-radius: 4px; padding: 6px;"><div style="display: flex; justify-content: space-between; color: var(--neon-yellow);"><span>DEBOUNCE:</span><strong>${localDb} ms</strong></div><input type="range" min="0.5" max="10.0" step="0.5" value=${localDb} style="width: 100%;" onInput=${(e) => { setLocalDb(e.target.value); sendAction('setLeakDebounce', parseFloat(e.target.value)); }} /></div>
                    </div>
                </div>
            ` : ''}

            <!-- TAB 7: POWER -->
            ${activeTab === 'power' ? html`
                <div>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 6px;">
                        <div style="background: rgba(0,212,255,0.05); border: 1px solid #00d4ff; border-radius: 4px; padding: 6px;"><div style="font-size: 0.65rem; color: #00d4ff; font-weight: bold;">LIVE VOLT (ADS1115)</div><div style="font-size: 1.2rem; font-weight: 900; color: #fff;">${Number(liveVolt).toFixed(2)} V</div></div>
                        <div style="background: rgba(0,255,102,0.05); border: 1px solid var(--neon-green); border-radius: 4px; padding: 6px;"><div style="font-size: 0.65rem; color: var(--neon-green); font-weight: bold;">LIVE DC AMPS</div><div style="font-size: 1.2rem; font-weight: 900; color: #fff;">${Number(liveDcAmps).toFixed(2)} A</div></div>
                    </div>
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(110px, 1fr)); gap: 6px;">
                        <${SliderItem} label="VOLT GAIN" val=${Number(vtGain).toFixed(3)} min=${0.5} max=${1.5} step=${0.005} color="#00d4ff" onInput=${setVtGain} />
                        <${SliderItem} label="VOLT OFFSET" val=${(vtOffset > 0 ? '+' : '') + Number(vtOffset).toFixed(2)} unit="V" min=${-3.0} max=${3.0} step=${0.05} color="#00d4ff" onInput=${setVtOffset} />
                        <${SliderItem} label="DC GAIN" val=${Number(dcGain).toFixed(3)} min=${0.5} max=${1.5} step=${0.005} color="var(--neon-green)" onInput=${setDcGain} />
                        <${SliderItem} label="DC OFFSET" val=${(dcOffset > 0 ? '+' : '') + Number(dcOffset).toFixed(2)} unit="A" min=${-2.0} max=${2.0} step=${0.05} color="var(--neon-green)" onInput=${setDcOffset} />
                    </div>
                </div>
            ` : ''}

            <!-- FOOTER ACTION BUTTONS -->
            <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid var(--border-sharp); padding-top: 6px; margin-top: 2px; flex-wrap: wrap; gap: 6px;">
                <span style="font-size: 0.68rem; color: var(--neon-green); font-weight: bold;">${msg}</span>
                <div style="display: flex; gap: 6px;">
                    <button class="btn" style="padding: 4px 8px; font-size: 0.7rem;" onClick=${resetAll}>🔄 RESET STANDAR</button>
                    <button class="btn btn-active" style="padding: 4px 12px; font-size: 0.72rem; font-weight: bold; background: var(--neon-cyan); color: #000;" onClick=${saveAll}>💾 SIMPAN MATRIKS</button>
                </div>
            </div>
        </div>
    `;
}
