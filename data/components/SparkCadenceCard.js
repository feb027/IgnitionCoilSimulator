import { html, useState, useEffect, useRef } from '../preact.js';

export function SparkCadenceCard({ state, sendAction, title = "IGNITION & INSULATION ANALYZER", is4Pin = false }) {
    const historyRef = useRef([]);
    const [history, setHistory] = useState([]);

    const fired = state.coilFiredCount || 0;
    const confirmed = state.coilSparkReturnCount || state.coilIgfCount || 0;
    const missed = state.coilMissedCount || Math.max(0, fired - confirmed);
    const sparkmA = state.coilSparkCurrentmA || 0.0;
    const currentA = state.coilPeakCurrentA ? state.coilPeakCurrentA.toFixed(1) : "0.0";
    const realA = state.realCurrentA !== undefined ? state.realCurrentA.toFixed(2) : "0.00";
    const vBat = state.supplyVoltage !== undefined ? state.supplyVoltage.toFixed(2) : "12.60";
    const tempCoil = state.tempCoilC !== undefined ? state.tempCoilC.toFixed(1) : "28.5";
    const tempDriver = state.tempDriverC !== undefined ? state.tempDriverC.toFixed(1) : "29.0";
    const rpm = state.currentRpm || state.rpm || 800;

    const isStandby = (fired === 0 && !state.isRunning);
    const cadenceRate = fired > 0 ? Math.min(100, Math.max(0, (confirmed / fired) * 100)) : 0;
    const arrhythmiaRate = fired > 0 ? (100 - cadenceRate) : 0;
    const energyFactor = sparkmA > 0 ? Math.min(1.0, Math.max(0.0, sparkmA / 50.0)) : 1.0;

    const isLeaking = state.coilLeakDetected;
    const leakCount = state.coilLeakCount || 0;
    const leakRate = state.coilLeakRate || 0;
    const leakSeverity = state.coilLeakSeverity || (leakCount === 0 ? "PERFECT (0 LEAK)" : "MICRO-LEAKAGE");

    let insulationFactor = 1.0, leakBadgeColor = "var(--neon-green)", leakStatusText = "ISOLASI UTUH (0 LEAK)";
    if (leakSeverity.includes("SEVERE") || leakRate > 25) {
        insulationFactor = 0.20; leakBadgeColor = "var(--neon-red)"; leakStatusText = "🚨 BOCOR PARAH (JEBOL)";
    } else if (leakSeverity.includes("MEDIUM") || leakRate > 5) {
        insulationFactor = 0.50; leakBadgeColor = "var(--neon-orange)"; leakStatusText = "⚠️ ISOLASI BOCOR";
    } else if (isLeaking || leakCount > 0) {
        insulationFactor = 0.75; leakBadgeColor = "var(--neon-yellow, #ffe600)"; leakStatusText = "⚡ MIKRO LEAKAGE";
    }

    const totalHealthScore = fired > 0 ? (cadenceRate * energyFactor * insulationFactor) : 100;
    let healthColor = 'var(--neon-green)', healthBadge = '🟢 100% PRIMA', healthDesc = 'Detak Sinkron & Api Normal', isAlarm = false;

    if (fired === 0) {
        healthColor = 'var(--text-muted)'; healthBadge = 'STANDBY'; healthDesc = 'Tekan Trigger / Run untuk Menguji';
    } else if (parseFloat(currentA) > 11.5) {
        healthColor = 'var(--neon-red)'; healthBadge = '❌ OVERCURRENT (>11A)'; healthDesc = 'Korsleting Primer / IGBT Rusak'; isAlarm = true;
    } else if (leakSeverity.includes("SEVERE") || leakRate > 25) {
        healthColor = 'var(--neon-red)'; healthBadge = '🚨 20% BOCOR PARAH'; healthDesc = 'Isolasi Koil Jebol / Arcing Ekstrem!'; isAlarm = true;
    } else if (totalHealthScore < 50 || cadenceRate < 50) {
        healthColor = 'var(--neon-red)'; healthBadge = '🔴 <50% MATI SURI'; healthDesc = 'Kerusakan Berat / Banyak Misfire'; isAlarm = true;
    } else if (totalHealthScore < 75 || isLeaking || leakCount > 0) {
        healthColor = '#FFE600'; healthBadge = '🟡 75% DEGRADASI'; healthDesc = 'Penurunan Daya / Mikro Leak';
    } else {
        healthColor = 'var(--neon-green)'; healthBadge = '🟢 100% PRIMA'; healthDesc = 'Api Normal & Detak 100% Sinkron';
    }

    const currentSens = state.coilLeakSensitivity || 3;
    const customThreshold = state.coilLeakThreshold || 3;
    const customDebounce = state.coilLeakDebounceMs !== undefined ? Number(state.coilLeakDebounceMs).toFixed(1) : "1.0";
    const checkPulses = state.checkCoilPulseCount || 3;
    const checkVerdict = state.checkCoilVerdict || "READY";

    const sensLabels = [
        { id: 1, name: "1: ULTRA" },
        { id: 2, name: "2: TINGGI" },
        { id: 3, name: "3: STANDAR" },
        { id: 4, name: "4: KEBAL" },
        { id: 5, name: "5: CUSTOM" }
    ];

    const handleFullReset = () => {
        historyRef.current = [];
        setHistory([]);
        sendAction('resetCounters');
        sendAction('resetLeakCounter');
    };

    useEffect(() => {
        if (!state.isRunning && fired === 0) return;
        const buf = historyRef.current;
        buf.push({ t: Date.now(), rpm, mA: sparkmA, cadence: cadenceRate, health: totalHealthScore });
        if (buf.length > 50) buf.shift();
        setHistory([...buf]);
    }, [fired, sparkmA, rpm, state.isRunning]);

    const chartW = 400, chartH = 95, ptsCount = history.length;
    let sparkPts = "", cadencePts = "";
    if (ptsCount > 1) {
        history.forEach((pt, i) => {
            const x = (i / (ptsCount - 1)) * chartW;
            sparkPts += `${x.toFixed(1)},${(chartH - Math.min(chartH, Math.max(0, (pt.mA / 80.0) * chartH))).toFixed(1)} `;
            cadencePts += `${x.toFixed(1)},${(chartH - Math.min(chartH, Math.max(0, (pt.cadence / 100.0) * chartH))).toFixed(1)} `;
        });
    }

    return html`
        <div class="panel ${isAlarm ? 'pulse-alarm-red' : ''}" style="margin-top: 4px; grid-column: 1 / -1; border-color: ${healthColor};">
            <!-- SCANNER-STYLE LIVE VOLTMETER & DUAL TEMPERATURE STATUS STRIP -->
            <div style="background: rgba(0,0,0,0.45); border: 1px solid var(--border-sharp); border-radius: 4px; padding: 6px 10px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 6px; font-size: 0.72rem; margin-bottom: 8px;">
                <div style="display: flex; gap: 8px; align-items: center;">
                    <span>🔋 SUPPLY: <strong style="color: ${parseFloat(vBat) >= 11.5 ? 'var(--neon-green)' : (parseFloat(vBat) > 0 ? 'var(--neon-orange)' : 'var(--neon-red)')};">${vBat} V</strong></span>
                    <span class="status-badge" style="padding: 1px 6px; font-size: 0.65rem; border-color: ${parseFloat(vBat) >= 11.5 ? 'var(--neon-green)' : 'var(--neon-orange)'}; color: ${parseFloat(vBat) >= 11.5 ? 'var(--neon-green)' : 'var(--neon-orange)'};">
                        ${parseFloat(vBat) >= 11.5 ? 'VOLTAGE OK' : (parseFloat(vBat) > 0 ? 'LOW VOLT' : 'NO POWER')}
                    </span>
                </div>
                <div style="display: flex; gap: 10px; color: var(--text-muted);">
                    <span>🌡️ Koil: <strong style="color: var(--neon-cyan);">${tempCoil} °C</strong></span>
                    <span>🌡️ IGBT: <strong style="color: var(--neon-purple);">${tempDriver} °C</strong></span>
                    <span>⚡ Arus DC: <strong style="color: var(--neon-green);">${realA} A</strong></span>
                </div>
            </div>

            <!-- HEADER -->
            <div class="panel-header" style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border-sharp); padding-bottom: 8px; flex-wrap: wrap; gap: 8px;">
                <span style="font-weight: 800; letter-spacing: 0.05em; color: ${healthColor};">⚡ ${title}</span>
                <div style="display: flex; gap: 8px; align-items: center;">
                    <button class="btn" style="padding: 4px 10px; font-size: 0.72rem; font-weight: 700; background: rgba(255,255,255,0.08);" onClick=${handleFullReset} disabled=${!state.connected}>🔄 RESET</button>
                    <span class="status-badge" style="border-color: ${healthColor}; color: ${healthColor}; font-weight: 800;">${healthBadge}</span>
                </div>
            </div>

            <!-- DUAL INDEPENDENT GAUGES -->
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 10px; margin-top: 8px;">
                <!-- GAUGE 1: KUALITAS API (mA) -->
                <div style="background: rgba(0,0,0,0.35); border: 1.5px solid var(--neon-cyan); border-radius: 6px; padding: 10px 14px; box-shadow: 0 0 10px rgba(0, 212, 255, 0.15);">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <span style="font-size: 0.75rem; font-weight: 700; color: var(--neon-cyan);">⚡ GAUGE 1: KUALITAS API (mA)</span>
                        <span style="font-size: 0.7rem; color: var(--text-muted);">Target: >45 mA</span>
                    </div>
                    <div style="display: flex; align-items: baseline; justify-content: space-between; margin-top: 6px;">
                        <div style="font-size: 1.85rem; font-weight: 900; color: ${isStandby ? 'var(--text-muted)' : (sparkmA >= 45 ? 'var(--neon-green)' : (sparkmA >= 30 ? '#A6FF00' : (sparkmA >= 15 ? 'var(--neon-orange)' : 'var(--neon-red)')))}">
                            ${isStandby ? '--' : sparkmA.toFixed(1)} <span style="font-size: 0.9rem; font-weight: 600; color: var(--text-muted);">mA</span>
                        </div>
                        <div style="font-size: 0.75rem; font-weight: 700; color: ${isStandby ? 'var(--text-muted)' : (sparkmA >= 45 ? 'var(--neon-green)' : (sparkmA >= 15 ? 'var(--neon-orange)' : 'var(--neon-red)'))}">
                            ${isStandby ? 'STANDBY' : (sparkmA >= 45 ? 'API BIRU TEBAL' : (sparkmA >= 30 ? 'API STANDAR' : (sparkmA >= 15 ? 'API KECIL' : 'API LILIN / MATI')))}
                        </div>
                    </div>
                    <div style="width: 100%; height: 6px; background: rgba(255,255,255,0.08); border-radius: 3px; overflow: hidden; margin-top: 6px;">
                        <div style="width: ${isStandby ? 0 : Math.min(100, (sparkmA / 80.0) * 100)}%; height: 100%; background: ${sparkmA >= 45 ? 'var(--neon-green)' : (sparkmA >= 30 ? '#A6FF00' : (sparkmA >= 15 ? 'var(--neon-orange)' : 'var(--neon-red)'))}; transition: width 0.2s;"></div>
                    </div>
                </div>

                <!-- GAUGE 2: IRAMA DETAK (%) -->
                <div style="background: rgba(0,0,0,0.35); border: 1.5px solid var(--neon-purple); border-radius: 6px; padding: 10px 14px; box-shadow: 0 0 10px rgba(189, 0, 255, 0.15);">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <span style="font-size: 0.75rem; font-weight: 700; color: var(--neon-purple);">⏱️ GAUGE 2: KETERATURAN DETAK</span>
                        <span style="font-size: 0.7rem; color: var(--text-muted);">Target: 100%</span>
                    </div>
                    <div style="display: flex; align-items: baseline; justify-content: space-between; margin-top: 6px;">
                        <div style="font-size: 1.85rem; font-weight: 900; color: ${isStandby ? 'var(--text-muted)' : (cadenceRate >= 95 ? 'var(--neon-green)' : (cadenceRate >= 80 ? 'var(--neon-orange)' : 'var(--neon-red)'))}">
                            ${isStandby ? '--' : cadenceRate.toFixed(1)} <span style="font-size: 0.9rem; font-weight: 600; color: var(--text-muted);">%</span>
                        </div>
                        <div style="font-size: 0.75rem; font-weight: 700; color: ${isStandby ? 'var(--text-muted)' : (missed === 0 ? 'var(--neon-green)' : 'var(--neon-red)')}">
                            ${isStandby ? 'SIAP DIUJI' : (missed === 0 ? 'IRAMA NORMAL' : (missed + ' MISSED (' + arrhythmiaRate.toFixed(1) + '%)'))}
                        </div>
                    </div>
                    <div style="width: 100%; height: 6px; background: rgba(255,255,255,0.08); border-radius: 3px; overflow: hidden; margin-top: 6px;">
                        <div style="width: ${isStandby ? 0 : cadenceRate}%; height: 100%; background: ${cadenceRate >= 95 ? 'var(--neon-green)' : (cadenceRate >= 80 ? 'var(--neon-orange)' : 'var(--neon-red)')}; transition: width 0.2s;"></div>
                    </div>
                </div>
            </div>

            <!-- UNIFIED METRICS ROW: SKOR, ARUS PRIMER, LEAK BODI, & DETAK (ENLARGED VALUES & BORDER HIGHLIGHTS) -->
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 8px; margin-top: 10px;">
                <!-- 1. SKOR KELAYAKAN -->
                <div class="${isAlarm ? 'pulse-alarm-red' : ''}" style="background: rgba(0,0,0,0.4); border: 1.5px solid ${healthColor}; box-shadow: 0 0 12px ${healthColor}33; border-radius: 6px; padding: 10px 8px; text-align: center;">
                    <div style="font-size: 0.7rem; font-weight: bold; color: ${healthColor}; text-transform: uppercase;">SKOR KELAYAKAN</div>
                    <div style="font-size: 1.55rem; font-weight: 900; color: ${healthColor}; margin-top: 2px;">${isStandby ? '--%' : totalHealthScore.toFixed(0) + '%'}</div>
                    <div style="font-size: 0.65rem; color: var(--text-muted); font-weight: bold;">${healthDesc}</div>
                </div>

                <!-- 2. ARUS PRIMER PEAK -->
                <div style="background: rgba(0,0,0,0.4); border: 1.5px solid ${parseFloat(currentA) >= 5.0 && parseFloat(currentA) <= 10.5 ? 'var(--neon-green)' : (parseFloat(currentA) > 11.5 ? 'var(--neon-red)' : 'var(--border-sharp)')}; border-radius: 6px; padding: 10px 8px; text-align: center;">
                    <div style="font-size: 0.7rem; font-weight: bold; color: var(--neon-cyan); text-transform: uppercase;">ARUS PRIMER PEAK</div>
                    <div style="font-size: 1.55rem; font-weight: 900; color: ${parseFloat(currentA) >= 5.0 && parseFloat(currentA) <= 10.5 ? 'var(--neon-green)' : (parseFloat(currentA) > 11.5 ? 'var(--neon-red)' : 'var(--text-primary)')}; margin-top: 2px;">${currentA} A</div>
                    <div style="font-size: 0.65rem; color: var(--text-muted);">DC: <strong style="color: var(--neon-green);">${realA} A</strong></div>
                </div>

                <!-- 3. LEAK BODI (PIN 36) - ENLARGED ARC COUNTS & IDENTITY COLOR -->
                <div style="background: rgba(0,0,0,0.4); border: 1.5px solid ${leakBadgeColor}; box-shadow: 0 0 10px ${leakBadgeColor}33; border-radius: 6px; padding: 10px 8px; text-align: center;">
                    <div style="font-size: 0.7rem; font-weight: bold; color: ${leakBadgeColor}; text-transform: uppercase;">LEAK BODI (PIN 36)</div>
                    <div style="font-size: 1.45rem; font-weight: 900; color: ${leakBadgeColor}; margin-top: 2px;">${leakCount} <span style="font-size: 0.85rem; font-weight: 700;">Arcs</span></div>
                    <div style="font-size: 0.68rem; color: ${leakBadgeColor}; font-weight: 800;">(${leakRate}/s) • ${leakStatusText}</div>
                </div>

                <!-- 4. DETAK IGT / RESPON / MISSED - ENLARGED NUMBERS & GREEN BORDER -->
                <div style="background: rgba(0,0,0,0.4); border: 1.5px solid ${missed > 0 ? 'var(--neon-red)' : 'var(--neon-green)'}; box-shadow: 0 0 10px ${missed > 0 ? 'rgba(255,45,85,0.3)' : 'rgba(0,255,102,0.2)'}; border-radius: 6px; padding: 10px 8px; text-align: center;">
                    <div style="font-size: 0.7rem; font-weight: bold; color: var(--neon-green); text-transform: uppercase;">DETAK IGT / RESPON</div>
                    <div style="font-size: 1.45rem; font-weight: 900; color: #ffffff; margin-top: 2px;">${fired} <span style="font-size: 1.15rem; color: var(--neon-green); font-weight: 900;">/ ${confirmed}</span></div>
                    <div style="font-size: 0.68rem; font-weight: 800; color: ${missed > 0 ? 'var(--neon-red)' : 'var(--neon-green)'};">${missed > 0 ? missed + ' MISSED' : '0 MISSED (100% SINKRON)'}</div>
                </div>
            </div>

            <!-- COLLAPSIBLE PRE-FLIGHT CHECK COIL MULTI-DIAGNOSIS DRAWER -->
            <details style="margin-top: 8px; background: rgba(0,0,0,0.3); border: 1px solid var(--border-sharp); border-radius: 6px; padding: 8px;">
                <summary style="cursor: pointer; user-select: none; font-size: 0.74rem; font-weight: 700; color: var(--neon-yellow, #ffe600); display: flex; justify-content: space-between; align-items: center;">
                    <span>🔍 PRE-FLIGHT CHECK COIL & DIAGNOSIS KONEKSI ▾</span>
                    <span style="font-size: 0.68rem; color: var(--text-muted);">Siklus: <strong>${checkPulses}x Pulses</strong></span>
                </summary>
                <div style="padding-top: 8px; display: flex; flex-direction: column; gap: 8px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 6px;">
                        <span style="font-size: 0.72rem; color: var(--text-muted);">PILIH JUMLAH PULSA UJI KILAT:</span>
                        <div style="display: flex; gap: 4px;">
                            ${[1, 2, 3, 5, 10].map(p => html`
                                <button class="btn ${checkPulses === p ? 'btn-active' : ''}" style="padding: 2px 6px; font-size: 0.68rem; border-color: ${checkPulses === p ? 'var(--neon-yellow)' : 'var(--border-sharp)'}; background: ${checkPulses === p ? 'rgba(255, 230, 0, 0.2)' : 'transparent'}; color: ${checkPulses === p ? 'var(--neon-yellow)' : 'var(--text-muted)'};" onClick=${() => sendAction('setCheckCoilPulses', p)} disabled=${!state.connected}>${p}x</button>
                            `)}
                        </div>
                        <button class="btn" style="padding: 6px 12px; font-size: 0.75rem; font-weight: 800; background: #FFE600; color: #000;" onClick=${() => sendAction('runCheckCoil')} disabled=${!state.connected || state.isRunning}>
                            ⚡ JALANKAN CHECK COIL (${checkPulses}x)
                        </button>
                    </div>

                    <!-- Diagnosis Verdict Banner -->
                    <div style="background: rgba(255,255,255,0.03); border: 1px solid var(--border-sharp); border-radius: 4px; padding: 6px 10px; font-size: 0.74rem; display: flex; justify-content: space-between; align-items: center;">
                        <span>HASIL DIAGNOSIS PRE-FLIGHT:</span>
                        <strong style="color: ${checkVerdict.includes('PASS') ? 'var(--neon-green)' : (checkVerdict.includes('DANGER') ? 'var(--neon-red)' : 'var(--neon-yellow)')};">${checkVerdict}</strong>
                    </div>
                </div>
            </details>

            <!-- COLLAPSIBLE PROBE SENSITIVITY FILTER -->
            <details style="margin-top: 8px; background: rgba(0,0,0,0.3); border: 1px solid var(--border-sharp); border-radius: 6px; padding: 8px;">
                <summary style="cursor: pointer; user-select: none; font-size: 0.74rem; font-weight: 700; color: var(--neon-cyan); display: flex; justify-content: space-between; align-items: center;">
                    <span>🎯 PENGATURAN SENSITIFITAS PROBE LEAK (PIN 36) ▾</span>
                    <span style="font-size: 0.68rem; color: var(--text-muted);">Aktif: <strong>${sensLabels.find(s => s.id === currentSens)?.name || ""}</strong></span>
                </summary>
                <div style="padding-top: 8px;">
                    <div style="display: grid; grid-template-columns: repeat(5, 1fr); gap: 4px;">
                        ${sensLabels.map(s => html`
                            <button class="btn ${currentSens === s.id ? 'btn-active' : ''}" style="padding: 4px 2px; font-size: 0.68rem; font-weight: bold; border-color: ${currentSens === s.id ? 'var(--neon-green)' : 'var(--border-sharp)'}; background: ${currentSens === s.id ? 'rgba(0, 255, 102, 0.15)' : 'transparent'}; color: ${currentSens === s.id ? 'var(--neon-green)' : 'var(--text-muted)'};" onClick=${() => sendAction('setLeakSensitivity', s.id)} disabled=${!state.connected}>${s.name}</button>
                        `)}
                    </div>
                    ${currentSens === 5 ? html`
                        <div style="margin-top: 8px; padding-top: 8px; border-top: 1px dashed var(--border-sharp); display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                            <div>
                                <div style="display: flex; justify-content: space-between; font-size: 0.68rem; color: var(--text-muted); margin-bottom: 2px;">
                                    <span>AMBANG TRIGGER:</span><strong style="color: var(--neon-yellow);">${customThreshold} Arcs</strong>
                                </div>
                                <input type="range" min="1" max="10" step="1" value=${customThreshold} style="width: 100%; accent-color: var(--neon-yellow);" onInput=${(e) => sendAction('setLeakThreshold', parseInt(e.target.value))} disabled=${!state.connected} />
                            </div>
                            <div>
                                <div style="display: flex; justify-content: space-between; font-size: 0.68rem; color: var(--text-muted); margin-bottom: 2px;">
                                    <span>FILTER (DEBOUNCE):</span><strong style="color: var(--neon-cyan);">${customDebounce} ms</strong>
                                </div>
                                <input type="range" min="0.1" max="3.0" step="0.1" value=${customDebounce} style="width: 100%; accent-color: var(--neon-cyan);" onInput=${(e) => sendAction('setLeakDebounce', parseFloat(e.target.value))} disabled=${!state.connected} />
                            </div>
                        </div>
                    ` : ''}
                </div>
            </details>

            <!-- COLLAPSIBLE REAL-TIME PERFORMANCE TREND GRAPH (SVG) -->
            <details style="margin-top: 8px; background: rgba(0,0,0,0.3); border: 1px solid var(--border-sharp); border-radius: 6px; padding: 8px;">
                <summary style="cursor: pointer; user-select: none; font-size: 0.74rem; font-weight: 700; color: var(--text-primary); display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 6px;">
                    <span>📈 GRAFIK TREN PERFORMA vs RPM (LIVE SWEEP) ▾</span>
                    <div style="display: flex; gap: 8px; font-size: 0.65rem;">
                        <span style="color: var(--neon-cyan);">■ Arus Api (mA)</span>
                        <span style="color: var(--neon-purple);">■ Irama Detak (%)</span>
                    </div>
                </summary>
                <div style="margin-top: 8px;">
                    <div style="width: 100%; height: 80px; background: rgba(10,12,16,0.8); border: 1px solid rgba(255,255,255,0.05); border-radius: 4px; position: relative; overflow: hidden;">
                        <svg viewBox="0 0 ${chartW} ${chartH}" preserveAspectRatio="none" style="width: 100%; height: 100%; display: block;">
                            ${sparkPts ? html`<polyline fill="none" stroke="var(--neon-cyan)" stroke-width="2" points="${sparkPts}" stroke-linecap="round" stroke-linejoin="round" />` : ''}
                            ${cadencePts ? html`<polyline fill="none" stroke="var(--neon-purple)" stroke-width="2" points="${cadencePts}" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="3,2" />` : ''}
                        </svg>
                    </div>
                </div>
            </details>
        </div>
    `;
}
