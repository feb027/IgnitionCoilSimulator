import { html, useState, useEffect, useRef } from '../preact.js';

export function SparkCadenceCard({ state, sendAction, title = "IGNITION & INSULATION ANALYZER", is4Pin = false }) {
    const historyRef = useRef([]), [history, setHistory] = useState([]);
    const isDragTh = useRef(false), isDragDb = useRef(false);
    const [localTh, setLocalTh] = useState(state.coilLeakThreshold || 6);
    const [localDb, setLocalDb] = useState(state.coilLeakDebounceMs !== undefined ? Number(state.coilLeakDebounceMs).toFixed(1) : "1.5");

    useEffect(() => { if (!isDragTh.current && state.coilLeakThreshold !== undefined) setLocalTh(state.coilLeakThreshold); }, [state.coilLeakThreshold]);
    useEffect(() => { if (!isDragDb.current && state.coilLeakDebounceMs !== undefined) setLocalDb(Number(state.coilLeakDebounceMs).toFixed(1)); }, [state.coilLeakDebounceMs]);

    const fired = state.coilFiredCount || 0, confirmed = state.coilSparkReturnCount || state.coilIgfCount || 0;
    const missed = state.coilMissedCount || Math.max(0, fired - confirmed), sparkmA = state.coilSparkCurrentmA || 0.0;
    const currentA = state.coilPeakCurrentA ? state.coilPeakCurrentA.toFixed(1) : "0.0";
    const realA = state.realCurrentA !== undefined ? state.realCurrentA.toFixed(2) : "0.00", vBat = state.supplyVoltage !== undefined ? state.supplyVoltage.toFixed(2) : "12.60";
    const tempCoil = state.tempCoilC !== undefined ? state.tempCoilC.toFixed(1) : "28.5", tempDriver = state.tempDriverC !== undefined ? state.tempDriverC.toFixed(1) : "29.0";
    const rpm = state.currentRpm || state.rpm || 800, isStandby = (fired === 0 && !state.isRunning);
    const cadenceRate = fired > 0 ? Math.min(100, Math.max(0, (confirmed / fired) * 100)) : 0;
    const arrhythmiaRate = fired > 0 ? (100 - cadenceRate) : 0, energyFactor = sparkmA > 0 ? Math.min(1.0, Math.max(0.0, sparkmA / 50.0)) : 1.0;

    const isLeaking = state.coilLeakDetected, leakCount = state.coilLeakCount || 0, leakRate = state.coilLeakRate || 0;
    const leakSeverity = state.coilLeakSeverity || (leakCount === 0 ? "PERFECT (0 LEAK)" : "MICRO-LEAKAGE");

    let insulationFactor = 1.0, leakBadgeColor = "var(--neon-green)", leakStatusText = "ISOLASI UTUH (0 LEAK)";
    if (leakSeverity.includes("SEVERE") || leakRate > 25) {
        insulationFactor = 0.20; leakBadgeColor = "var(--neon-red)"; leakStatusText = "🚨 BOCOR PARAH";
    } else if (leakSeverity.includes("MEDIUM") || leakRate > 5) {
        insulationFactor = 0.50; leakBadgeColor = "var(--neon-orange)"; leakStatusText = "⚠️ ISOLASI BOCOR";
    } else if (isLeaking || leakCount > 0) {
        insulationFactor = 0.75; leakBadgeColor = "var(--neon-yellow, #ffe600)"; leakStatusText = "⚡ MIKRO LEAK";
    }

    const totalHealthScore = fired > 0 ? (cadenceRate * energyFactor * insulationFactor) : 100;
    let healthColor = 'var(--neon-green)', healthBadge = '🟢 100% PRIMA', healthDesc = 'Detak Sinkron & Api Normal';
    const isAlarm = (fired >= 10 && (totalHealthScore < 50 || parseFloat(currentA) > 11.5 || leakSeverity.includes("SEVERE") || confirmed === 0 || (sparkmA < 15.0 && sparkmA > 0)));

    if (isStandby) {
        healthColor = 'var(--text-muted)'; healthBadge = 'STANDBY'; healthDesc = 'Tekan Trigger / Run';
    } else if (parseFloat(currentA) > 11.5) {
        healthColor = 'var(--neon-red)'; healthBadge = '❌ OVERCURRENT'; healthDesc = 'Korsleting Primer (>11A)';
    } else if (leakSeverity.includes("SEVERE") || leakRate > 25) {
        healthColor = 'var(--neon-red)'; healthBadge = '🚨 BOCOR PARAH'; healthDesc = 'Isolasi Bodi Jebol';
    } else if (fired >= 10 && (totalHealthScore < 50 || (sparkmA < 15.0 && sparkmA > 0))) {
        healthColor = 'var(--neon-red)'; healthBadge = '🔴 <50% RUSAK'; healthDesc = 'Api Lilin / Misfire';
    } else if (totalHealthScore < 75 || isLeaking || leakCount > 0) {
        healthColor = '#FFE600'; healthBadge = '🟡 75% DEGRADASI'; healthDesc = 'Penurunan Daya';
    } else {
        healthColor = 'var(--neon-green)'; healthBadge = '🟢 100% PRIMA'; healthDesc = 'Detak 100% Sinkron';
    }

    let gauge1Border = '2px solid rgba(0, 212, 255, 0.4)', gauge1Shadow = '0 0 10px rgba(0, 212, 255, 0.15)';
    if (!isStandby) {
        if (sparkmA >= 45.0) { gauge1Border = '2px solid var(--neon-green)'; gauge1Shadow = '0 0 12px rgba(0, 255, 102, 0.3)'; }
        else if (sparkmA >= 30.0) { gauge1Border = '2px solid #A6FF00'; gauge1Shadow = '0 0 10px rgba(166, 255, 0, 0.25)'; }
        else if (sparkmA >= 15.0) { gauge1Border = '2px solid var(--neon-orange)'; gauge1Shadow = '0 0 12px rgba(255, 149, 0, 0.35)'; }
        else { gauge1Border = '2px solid var(--neon-red)'; gauge1Shadow = '0 0 16px rgba(255, 45, 85, 0.6)'; }
    }

    let gauge2Border = '2px solid rgba(189, 0, 255, 0.4)', gauge2Shadow = '0 0 10px rgba(189, 0, 255, 0.15)';
    if (!isStandby) {
        if (cadenceRate >= 95.0) { gauge2Border = '2px solid var(--neon-green)'; gauge2Shadow = '0 0 12px rgba(0, 255, 102, 0.3)'; }
        else if (cadenceRate >= 80.0) { gauge2Border = '2px solid var(--neon-orange)'; gauge2Shadow = '0 0 12px rgba(255, 149, 0, 0.35)'; }
        else { gauge2Border = '2px solid var(--neon-red)'; gauge2Shadow = '0 0 16px rgba(255, 45, 85, 0.6)'; }
    }

    const currentSens = state.coilLeakSensitivity || 3;
    const checkPulses = state.checkCoilPulseCount || 3, checkVerdict = state.checkCoilVerdict || "READY";
    const sensLabels = [{ id: 1, name: "1: ULTRA" }, { id: 2, name: "2: TINGGI" }, { id: 3, name: "3: STANDAR" }, { id: 4, name: "4: KEBAL" }, { id: 5, name: "5: CUSTOM" }];

    const handleFullReset = () => { historyRef.current = []; setHistory([]); sendAction('resetCounters'); sendAction('resetLeakCounter'); };

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
        <div class="panel ${isAlarm ? 'pulse-alarm-red' : ''}" style="margin-top: 4px; grid-column: 1 / -1; border-color: ${healthColor}; box-sizing: border-box;">
            <!-- SCANNER-STYLE LIVE VOLTMETER & TEMPERATURE STRIP -->
            <div style="background: rgba(0,0,0,0.45); border: 1px solid var(--border-sharp); border-radius: 4px; padding: 6px 10px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 6px; font-size: 0.72rem; margin-bottom: 8px;">
                <div style="display: flex; gap: 8px; align-items: center;">
                    <span>🔋 SUPPLY: <strong style="color: ${parseFloat(vBat) >= 11.5 ? 'var(--neon-green)' : (parseFloat(vBat) > 0 ? 'var(--neon-orange)' : 'var(--neon-red)')}; font-variant-numeric: tabular-nums;">${vBat} V</strong></span>
                    <span class="status-badge" style="padding: 1px 6px; font-size: 0.65rem; border-color: ${parseFloat(vBat) >= 11.5 ? 'var(--neon-green)' : 'var(--neon-orange)'}; color: ${parseFloat(vBat) >= 11.5 ? 'var(--neon-green)' : 'var(--neon-orange)'};">
                        ${parseFloat(vBat) >= 11.5 ? 'VOLTAGE OK' : (parseFloat(vBat) > 0 ? 'LOW VOLT' : 'NO POWER')}
                    </span>
                </div>
                <div style="display: flex; gap: 10px; color: var(--text-muted); font-variant-numeric: tabular-nums;">
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

            <!-- DUAL GAUGES -->
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 10px; margin-top: 8px;">
                <!-- GAUGE 1: KUALITAS API (mA) -->
                <div style="background: rgba(0,0,0,0.35); border: ${gauge1Border}; border-radius: 6px; padding: 10px 14px; box-shadow: ${gauge1Shadow}; min-height: 98px; height: 98px; display: flex; flex-direction: column; justify-content: space-between; box-sizing: border-box;">
                    <div style="display: flex; justify-content: space-between; align-items: center; height: 16px;">
                        <span style="font-size: 0.75rem; font-weight: 700; color: var(--neon-cyan);">⚡ GAUGE 1: KUALITAS API (mA)</span>
                        <span style="font-size: 0.7rem; color: var(--text-muted);">Target: >45 mA</span>
                    </div>
                    <div style="display: flex; align-items: baseline; justify-content: space-between; margin-top: 2px;">
                        <div style="font-size: 1.85rem; font-weight: 900; line-height: 1; font-variant-numeric: tabular-nums; color: ${isStandby ? 'var(--text-muted)' : (sparkmA >= 45 ? 'var(--neon-green)' : (sparkmA >= 30 ? '#A6FF00' : (sparkmA >= 15 ? 'var(--neon-orange)' : 'var(--neon-red)')))}">
                            ${isStandby ? '--' : sparkmA.toFixed(1)} <span style="font-size: 0.85rem; font-weight: 600; color: var(--text-muted);">mA</span>
                        </div>
                        <div style="font-size: 0.74rem; font-weight: 800; white-space: nowrap; color: ${isStandby ? 'var(--text-muted)' : (sparkmA >= 45 ? 'var(--neon-green)' : (sparkmA >= 15 ? 'var(--neon-orange)' : 'var(--neon-red)'))}">
                            ${isStandby ? 'STANDBY' : (sparkmA >= 45 ? 'API BIRU TEBAL' : (sparkmA >= 30 ? 'API STANDAR' : (sparkmA >= 15 ? 'API KECIL' : 'API LILIN / MATI')))}
                        </div>
                    </div>
                    <div style="width: 100%; height: 6px; background: rgba(255,255,255,0.08); border-radius: 3px; overflow: hidden; margin-top: 4px;">
                        <div style="width: ${isStandby ? '0%' : Math.min(100, (sparkmA / 60) * 100)}%; height: 100%; background: ${sparkmA >= 45 ? 'var(--neon-green)' : (sparkmA >= 30 ? '#A6FF00' : (sparkmA >= 15 ? 'var(--neon-orange)' : 'var(--neon-red)'))}; transition: width 0.15s ease;"></div>
                    </div>
                </div>

                <!-- GAUGE 2: KETERATURAN DETAK IGT/IGF -->
                <div style="background: rgba(0,0,0,0.35); border: ${gauge2Border}; border-radius: 6px; padding: 10px 14px; box-shadow: ${gauge2Shadow}; min-height: 98px; height: 98px; display: flex; flex-direction: column; justify-content: space-between; box-sizing: border-box;">
                    <div style="display: flex; justify-content: space-between; align-items: center; height: 16px;">
                        <span style="font-size: 0.75rem; font-weight: 700; color: var(--neon-purple);">🎯 GAUGE 2: KETERATURAN DETAK</span>
                        <span style="font-size: 0.7rem; color: var(--text-muted);">Sinkron: 100%</span>
                    </div>
                    <div style="display: flex; align-items: baseline; justify-content: space-between; margin-top: 2px;">
                        <div style="font-size: 1.85rem; font-weight: 900; line-height: 1; font-variant-numeric: tabular-nums; color: ${isStandby ? 'var(--text-muted)' : (cadenceRate >= 95 ? 'var(--neon-green)' : (cadenceRate >= 80 ? 'var(--neon-orange)' : 'var(--neon-red)'))}">
                            ${isStandby ? '--' : cadenceRate.toFixed(1)} <span style="font-size: 0.85rem; font-weight: 600; color: var(--text-muted);">%</span>
                        </div>
                        <div style="font-size: 0.74rem; font-weight: 800; white-space: nowrap; color: ${isStandby ? 'var(--text-muted)' : (cadenceRate >= 95 ? 'var(--neon-green)' : (cadenceRate >= 80 ? 'var(--neon-orange)' : 'var(--neon-red)'))}">
                            ${isStandby ? 'STANDBY' : (cadenceRate >= 95 ? 'IRAMA SINKRON' : (cadenceRate >= 80 ? 'DETAK LONCAT' : 'ARITMIA / MISSED'))}
                        </div>
                    </div>
                    <div style="width: 100%; height: 6px; background: rgba(255,255,255,0.08); border-radius: 3px; overflow: hidden; margin-top: 4px;">
                        <div style="width: ${isStandby ? '0%' : cadenceRate}%; height: 100%; background: ${cadenceRate >= 95 ? 'var(--neon-green)' : (cadenceRate >= 80 ? 'var(--neon-orange)' : 'var(--neon-red)')}; transition: width 0.15s ease;"></div>
                    </div>
                </div>
            </div>

            <!-- 4 CENTERED METRIC CARDS WITH BOLD IDENTITY BORDERS -->
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 8px; margin-top: 8px;">
                <!-- Card 1: TOTAL DETAK -->
                <div style="background: rgba(0, 212, 255, 0.03); border: 2px solid rgba(0, 212, 255, 0.4); border-radius: 6px; padding: 8px 10px; height: 104px; box-sizing: border-box; display: flex; flex-direction: column; justify-content: space-between; align-items: center; text-align: center; box-shadow: 0 0 10px rgba(0, 212, 255, 0.1);">
                    <div style="font-size: 0.68rem; color: var(--text-muted); font-weight: 700; width: 100%; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">TOTAL DETAK (IGT)</div>
                    <div style="font-size: 1.55rem; font-weight: 900; font-variant-numeric: tabular-nums; line-height: 1;">${fired}</div>
                    <div style="font-size: 0.65rem; color: var(--neon-cyan); font-weight: 700; width: 100%; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">Detak Terpicu</div>
                </div>

                <!-- Card 2: RESPON DETAK -->
                <div style="background: rgba(0, 255, 102, 0.04); border: 2px solid var(--neon-green); border-radius: 6px; padding: 8px 10px; height: 104px; box-sizing: border-box; display: flex; flex-direction: column; justify-content: space-between; align-items: center; text-align: center; box-shadow: 0 0 10px rgba(0, 255, 102, 0.15);">
                    <div style="font-size: 0.68rem; color: var(--text-muted); font-weight: 700; width: 100%; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">RESPON (CONFIRMED)</div>
                    <div style="font-size: 1.55rem; font-weight: 900; font-variant-numeric: tabular-nums; line-height: 1; color: var(--neon-green);">${confirmed}</div>
                    <div style="font-size: 0.65rem; color: var(--neon-green); font-weight: 700; width: 100%; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${cadenceRate.toFixed(0)}% Terkonfirmasi</div>
                </div>

                <!-- Card 3: DETAK HILANG -->
                <div style="background: ${missed > 0 ? 'rgba(255, 45, 85, 0.08)' : 'rgba(0,0,0,0.25)'}; border: 2px solid ${missed > 0 ? 'var(--neon-red)' : 'rgba(255,255,255,0.15)'}; border-radius: 6px; padding: 8px 10px; height: 104px; box-sizing: border-box; display: flex; flex-direction: column; justify-content: space-between; align-items: center; text-align: center; box-shadow: ${missed > 0 ? '0 0 12px rgba(255, 45, 85, 0.25)' : 'none'};">
                    <div style="font-size: 0.68rem; color: var(--text-muted); font-weight: 700; width: 100%; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">DETAK HILANG (MISSED)</div>
                    <div style="font-size: 1.55rem; font-weight: 900; font-variant-numeric: tabular-nums; line-height: 1; color: ${missed > 0 ? 'var(--neon-red)' : 'var(--text-muted)'};">${missed}</div>
                    <div style="font-size: 0.65rem; color: ${missed > 0 ? 'var(--neon-red)' : 'var(--text-muted)'}; font-weight: 700; width: 100%; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${arrhythmiaRate.toFixed(0)}% Hilang Api</div>
                </div>

                <!-- Card 4: ARUS PRIMER PEAK -->
                <div style="background: rgba(0, 212, 255, 0.04); border: 2px solid var(--neon-cyan); border-radius: 6px; padding: 8px 10px; height: 104px; box-sizing: border-box; display: flex; flex-direction: column; justify-content: space-between; align-items: center; text-align: center; box-shadow: 0 0 10px rgba(0, 212, 255, 0.15);">
                    <div style="font-size: 0.68rem; color: var(--text-muted); font-weight: 700; width: 100%; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">ARUS PRIMER PEAK</div>
                    <div style="font-size: 1.55rem; font-weight: 900; font-variant-numeric: tabular-nums; line-height: 1; color: var(--neon-cyan);">${isStandby ? '--' : currentA} <span style="font-size: 0.85rem; font-weight: 600; color: var(--text-muted);">A</span></div>
                    <div style="font-size: 0.65rem; color: var(--neon-cyan); font-weight: 700; width: 100%; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">ACS712 Peak-Hold</div>
                </div>
            </div>

            <!-- PROMINENT GRAND DIAGNOSTIC CONCLUSION BANNER -->
            <div style="background: rgba(0,0,0,0.55); border: 2px solid ${healthColor}; border-radius: 6px; padding: 10px 14px; margin-top: 8px; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 0 14px ${healthColor}33; box-sizing: border-box; flex-wrap: wrap; gap: 8px;">
                <div>
                    <div style="font-size: 0.68rem; color: var(--text-muted); font-weight: 800; letter-spacing: 0.05em;">📋 KESIMPULAN HASIL UJI KOIL:</div>
                    <div style="font-size: 1.05rem; font-weight: 900; color: ${healthColor}; margin-top: 2px; letter-spacing: 0.02em;">
                        ${isStandby ? 'STANDBY (SIAP PENGUJIAN)' : (state.coilCurrentStatus || healthBadge + ' - ' + healthDesc)}
                    </div>
                </div>
                <div style="text-align: right;">
                    <div style="font-size: 0.68rem; color: var(--text-muted); font-weight: 800;">SKOR KESEHATAN:</div>
                    <div style="font-size: 1.45rem; font-weight: 900; color: ${healthColor}; font-variant-numeric: tabular-nums; line-height: 1.1;">
                        ${isStandby ? '--' : Math.round(totalHealthScore)}%
                    </div>
                </div>
            </div>

            <!-- LEAKAGE STRIP -->
            <div style="background: rgba(0,0,0,0.3); border: 2px solid ${leakBadgeColor}; border-radius: 6px; padding: 8px 12px; margin-top: 8px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px; box-sizing: border-box;">
                <div style="display: flex; gap: 10px; align-items: center;">
                    <span style="font-size: 0.8rem; font-weight: 800; color: ${leakBadgeColor};">🛡️ KEBOCORAN BODI (PIN 36):</span>
                    <span class="status-badge" style="border-color: ${leakBadgeColor}; color: ${leakBadgeColor}; font-weight: 800; font-size: 0.72rem;">${leakStatusText}</span>
                </div>
                <div style="display: flex; gap: 14px; font-size: 0.75rem; font-variant-numeric: tabular-nums;">
                    <span>Total Loncatan: <strong style="color: ${leakCount > 0 ? 'var(--neon-orange)' : 'var(--neon-green)'}; font-size: 0.95rem;">${leakCount} Arcs</strong></span>
                    <span>Frekuensi: <strong style="color: ${leakRate > 5 ? 'var(--neon-red)' : 'var(--neon-cyan)'}; font-size: 0.95rem;">${leakRate} /dtk</strong></span>
                </div>
            </div>

            <!-- PRE-FLIGHT CHECK COIL -->
            <details style="margin-top: 8px; background: rgba(0,0,0,0.3); border: 1px solid var(--border-sharp); border-radius: 6px; padding: 8px;">
                <summary style="cursor: pointer; user-select: none; font-size: 0.74rem; font-weight: 700; color: var(--neon-yellow); display: flex; justify-content: space-between; align-items: center;">
                    <span>⚡ PRE-FLIGHT CHECK COIL (UJI AMAN SEBELUM RUN) ▾</span>
                    <span style="font-size: 0.68rem; color: var(--text-muted);">${checkVerdict}</span>
                </summary>
                <div style="padding-top: 8px; display: flex; flex-direction: column; gap: 6px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 6px;">
                        <div style="display: flex; gap: 4px; align-items: center;">
                            <span style="font-size: 0.68rem; color: var(--text-muted);">Jumlah Pulsa:</span>
                            ${[1, 2, 3, 5, 10].map(p => html`<button class="btn ${checkPulses === p ? 'btn-active' : ''}" style="padding: 2px 6px; font-size: 0.68rem; border-color: ${checkPulses === p ? 'var(--neon-yellow)' : 'var(--border-sharp)'}; background: ${checkPulses === p ? 'rgba(255, 230, 0, 0.2)' : 'transparent'}; color: ${checkPulses === p ? 'var(--neon-yellow)' : 'var(--text-muted)'};" onClick=${() => sendAction('setCheckCoilPulses', p)} disabled=${!state.connected}>${p}x</button>`)}
                        </div>
                        <button class="btn" style="padding: 6px 12px; font-size: 0.75rem; font-weight: 800; background: #FFE600; color: #000;" onClick=${() => sendAction('runCheckCoil')} disabled=${!state.connected || state.isRunning}>⚡ JALANKAN CHECK COIL (${checkPulses}x)</button>
                    </div>
                    <div style="background: rgba(255,255,255,0.03); border: 1px solid var(--border-sharp); border-radius: 4px; padding: 6px 10px; font-size: 0.74rem; display: flex; justify-content: space-between; align-items: center;">
                        <span>HASIL DIAGNOSIS PRE-FLIGHT:</span>
                        <strong style="color: ${checkVerdict.includes('PASS') ? 'var(--neon-green)' : (checkVerdict.includes('DANGER') ? 'var(--neon-red)' : 'var(--neon-yellow)')};">${checkVerdict}</strong>
                    </div>
                </div>
            </details>

            <!-- PROBE SENSITIVITY FILTER -->
            <details style="margin-top: 8px; background: rgba(0,0,0,0.3); border: 1px solid var(--border-sharp); border-radius: 6px; padding: 8px;">
                <summary style="cursor: pointer; user-select: none; font-size: 0.74rem; font-weight: 700; color: var(--neon-cyan); display: flex; justify-content: space-between; align-items: center;">
                    <span>🎯 PENGATURAN SENSITIFITAS PROBE LEAK (PIN 36) ▾</span>
                    <span style="font-size: 0.68rem; color: var(--text-muted);">Aktif: <strong>${sensLabels.find(s => s.id === currentSens)?.name || ""}</strong></span>
                </summary>
                <div style="padding-top: 8px;">
                    <div style="display: grid; grid-template-columns: repeat(5, 1fr); gap: 4px;">
                        ${sensLabels.map(s => html`<button class="btn ${currentSens === s.id ? 'btn-active' : ''}" style="padding: 4px 2px; font-size: 0.68rem; font-weight: bold; border-color: ${currentSens === s.id ? 'var(--neon-green)' : 'var(--border-sharp)'}; background: ${currentSens === s.id ? 'rgba(0, 255, 102, 0.15)' : 'transparent'}; color: ${currentSens === s.id ? 'var(--neon-green)' : 'var(--text-muted)'};" onClick=${() => sendAction('setLeakSensitivity', s.id)} disabled=${!state.connected}>${s.name}</button>`)}
                    </div>
                    ${currentSens === 5 ? html`
                        <div style="margin-top: 8px; padding-top: 8px; border-top: 1px dashed var(--border-sharp); display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                            <div>
                                <div style="display: flex; justify-content: space-between; font-size: 0.68rem; color: var(--text-muted); margin-bottom: 2px;">
                                    <span>AMBANG TRIGGER:</span><strong style="color: var(--neon-yellow);">${localTh} Arcs</strong>
                                </div>
                                <input type="range" min="1" max="25" step="1" value=${localTh} style="width: 100%; accent-color: var(--neon-yellow);"
                                    onPointerDown=${() => { isDragTh.current = true; }}
                                    onInput=${(e) => { setLocalTh(parseInt(e.target.value)); }}
                                    onChange=${(e) => { isDragTh.current = false; const v = parseInt(e.target.value); setLocalTh(v); sendAction('setLeakThreshold', v); }}
                                    disabled=${!state.connected} />
                            </div>
                            <div>
                                <div style="display: flex; justify-content: space-between; font-size: 0.68rem; color: var(--text-muted); margin-bottom: 2px;">
                                    <span>FILTER (DEBOUNCE):</span><strong style="color: var(--neon-cyan);">${localDb} ms</strong>
                                </div>
                                <input type="range" min="0.1" max="5.0" step="0.1" value=${localDb} style="width: 100%; accent-color: var(--neon-cyan);"
                                    onPointerDown=${() => { isDragDb.current = true; }}
                                    onInput=${(e) => { setLocalDb(parseFloat(e.target.value).toFixed(1)); }}
                                    onChange=${(e) => { isDragDb.current = false; const v = parseFloat(e.target.value); setLocalDb(v.toFixed(1)); sendAction('setLeakDebounce', v); }}
                                    disabled=${!state.connected} />
                            </div>
                        </div>
                    ` : ''}
                </div>
            </details>

            <!-- TREND GRAPH (SVG) -->
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
