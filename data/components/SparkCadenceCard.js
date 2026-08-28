import { html, useState, useEffect } from '../preact.js';

export function SparkCadenceCard({ state, sendAction, title = "IGNITION & INSULATION ANALYZER", is4Pin = false, isLocked = true, onToggleLock }) {
    const [isPreFlightLocked, setIsPreFlightLocked] = useState(true);
    const [showMasterAlert, setShowMasterAlert] = useState(false);

    useEffect(() => {
        if (isLocked) setIsPreFlightLocked(true);
    }, [isLocked]);

    const handleTogglePreFlight = (e) => {
        if (e) e.stopPropagation();
        if (isLocked) { setShowMasterAlert(true); setTimeout(() => setShowMasterAlert(false), 2500); return; }
        setIsPreFlightLocked(!isPreFlightLocked);
    };

    const handleRunPreFlight = (e) => {
        if (e) e.stopPropagation();
        if (isLocked) { setShowMasterAlert(true); setTimeout(() => setShowMasterAlert(false), 2500); return; }
        if (isPreFlightLocked) return;
        sendAction('runCheckCoil');
    };

    const fired = state.coilFiredCount || 0;
    const igfCount = state.coilIgfCount || 0;
    const sparkCount = state.coilSparkReturnCount || 0;
    const confirmed = is4Pin ? (sparkCount > 0 ? sparkCount : igfCount) : sparkCount;
    const missed = state.coilMissedCount || Math.max(0, fired - confirmed);
    const sparkmA = state.coilSparkCurrentmA || 0.0;
    const currentA = state.coilPeakCurrentA ? state.coilPeakCurrentA.toFixed(1) : "0.0";
    const realA = state.realCurrentA !== undefined ? state.realCurrentA.toFixed(2) : "0.00";
    const vBat = state.supplyVoltage !== undefined ? state.supplyVoltage.toFixed(2) : "12.60";
    const tempCoil = state.tempCoilC !== undefined ? state.tempCoilC.toFixed(1) : "28.5";
    const tempDriver = state.tempDriverC !== undefined ? state.tempDriverC.toFixed(1) : "29.0";

    const spP = state.calSparkPrima || 45.0, spB = state.calSparkBaik || 35.0, spC = state.calSparkCukup || 25.0, spK = state.calSparkKurang || 15.0;
    const cdP = state.calCadencePrima || 98.0, cdB = state.calCadenceBaik || 90.0, cdC = state.calCadenceCukup || 80.0, cdK = state.calCadenceKurang || 60.0;
    const crP = state.calCurrentPrima || 6.5, crB = state.calCurrentBaik || 5.5, crC = state.calCurrentCukup || 4.5, crK = state.calCurrentKurang || 3.0, crM = state.calCurrentMax || 11.5;
    const tpP = state.calTempPrima || 45.0, tpB = state.calTempBaik || 55.0, tpC = state.calTempCukup || 65.0, tpPanas = state.calTempPanas || 75.0, tpCut = state.calTempCutoff || 85.0;
    const igfP = state.calIgfPrima || 98.0, igfB = state.calIgfBaik || 90.0, igfC = state.calIgfCukup || 80.0, igfK = state.calIgfKurang || 60.0;

    const isStandby = (fired === 0 && !state.isRunning);
    const cadenceRate = fired > 0 ? Math.min(100, Math.max(0, (confirmed / fired) * 100)) : 0;
    const igfRate = fired > 0 ? Math.min(100, Math.max(0, (igfCount / fired) * 100)) : 0;
    const arrhythmiaRate = fired > 0 ? (100 - cadenceRate) : 0;
    const energyFactor = sparkmA > 0 ? Math.min(1.0, Math.max(0.0, sparkmA / spP)) : 1.0;

    const isLeaking = state.coilLeakDetected, leakCount = state.coilLeakCount || 0, leakRate = state.coilLeakRate || 0, leakPercent = state.coilLeakPercent || 0;
    let insulationFactor = 1.0, leakBadgeColor = "var(--neon-green)", leakStatusText = state.coilLeakSeverity || "ISOLASI UTUH (0%)";
    if (leakPercent >= 75 || leakStatusText.includes("JEBOL") || leakRate > 25) { insulationFactor = 0.20; leakBadgeColor = "var(--neon-red)"; }
    else if (leakPercent >= 50 || leakStatusText.includes("BOCOR") || leakRate > 5) { insulationFactor = 0.50; leakBadgeColor = "var(--neon-orange)"; }
    else if (leakPercent >= 25 || isLeaking || leakCount > 0) { insulationFactor = 0.75; leakBadgeColor = "var(--neon-yellow, #ffe600)"; }

    const maxTemp = Math.max(parseFloat(tempCoil), parseFloat(tempDriver));
    const thermalFactor = maxTemp >= tpCut ? 0.25 : (maxTemp >= tpPanas ? 0.65 : (maxTemp >= tpC ? 0.85 : 1.0));
    const totalHealthScore = fired > 0 ? (cadenceRate * energyFactor * insulationFactor * thermalFactor) : 100;
    let healthColor = 'var(--neon-green)', healthBadge = '🟢 PRIMA (100%)', healthDesc = 'Sangat Baik & Siap Pakai';
    const numCurr = parseFloat(currentA), isAlarm = (fired >= 10 && (totalHealthScore < 50 || numCurr > crM || maxTemp >= tpCut || confirmed === 0));

    if (isStandby) { healthColor = 'var(--text-muted)'; healthBadge = 'STANDBY'; healthDesc = 'Tekan Trigger / Run'; }
    else if (numCurr > crM) { healthColor = 'var(--neon-red)'; healthBadge = '❌ OVERCURRENT'; healthDesc = `Korsleting (>${crM}A)`; }
    else if (maxTemp >= tpCut) { healthColor = 'var(--neon-red)'; healthBadge = '🔥 OVERHEAT'; healthDesc = `Suhu Kritis (>${tpCut}°C)`; }
    else if (totalHealthScore < 25 || cadenceRate < cdK || (is4Pin && igfRate < igfK)) { healthColor = 'var(--neon-red)'; healthBadge = '🔴 RUSAK (0%)'; healthDesc = is4Pin && igfRate < igfK ? 'IGF Hilang / Misfire' : 'Api Lilin / Misfire'; }
    else if (totalHealthScore < 50 || sparkmA < spC || cadenceRate < cdC || (is4Pin && igfRate < igfC)) { healthColor = 'var(--neon-orange)'; healthBadge = '🟧 TIDAK LAYAK (25%)'; healthDesc = 'Daya Drop / IGF Drop'; }
    else if (totalHealthScore < 75 || sparkmA < spB || cadenceRate < cdB || (is4Pin && igfRate < igfB) || isLeaking) { healthColor = 'var(--neon-yellow)'; healthBadge = '🟨 BISA DIGUNAKAN (50%)'; healthDesc = 'Penurunan Daya / Bocor'; }
    else if (totalHealthScore < 90 || sparkmA < spP || cadenceRate < cdP || (is4Pin && igfRate < igfP)) { healthColor = '#A6FF00'; healthBadge = '🟩 BAIK (75%)'; healthDesc = 'Koil Normal & Layak'; }

    let g1Color = 'var(--text-muted)', g1Text = 'STANDBY', g1W = 0;
    if (!isStandby) {
        g1W = Math.min(100, (sparkmA / 60) * 100);
        if (sparkmA >= spP) { g1Color = 'var(--neon-green)'; g1Text = 'PRIMA (TEBAL)'; }
        else if (sparkmA >= spB) { g1Color = '#A6FF00'; g1Text = 'BAIK (STANDAR)'; }
        else if (sparkmA >= spC) { g1Color = 'var(--neon-yellow)'; g1Text = 'CUKUP (SEDANG)'; }
        else if (sparkmA >= spK) { g1Color = 'var(--neon-orange)'; g1Text = 'KURANG (LEMAH)'; }
        else { g1Color = 'var(--neon-red)'; g1Text = 'RUSAK (LILIN/MATI)'; }
    }

    let g2Color = 'var(--text-muted)', g2Text = 'STANDBY', g2W = 0;
    if (!isStandby) {
        g2W = cadenceRate;
        if (cadenceRate >= cdP) { g2Color = 'var(--neon-green)'; g2Text = 'PRIMA (SINKRON)'; }
        else if (cadenceRate >= cdB) { g2Color = '#A6FF00'; g2Text = 'BAIK (STABIL)'; }
        else if (cadenceRate >= cdC) { g2Color = 'var(--neon-yellow)'; g2Text = 'CUKUP (LONCAT)'; }
        else if (cadenceRate >= cdK) { g2Color = 'var(--neon-orange)'; g2Text = 'KURANG (MISSED)'; }
        else { g2Color = 'var(--neon-red)'; g2Text = 'RUSAK (ARITMIA)'; }
    }

    let g3Color = 'var(--text-muted)', g3Text = 'STANDBY', g3W = 0;
    if (!isStandby && is4Pin) {
        g3W = igfRate;
        if (igfRate >= igfP) { g3Color = 'var(--neon-green)'; g3Text = 'PRIMA (SINKRON)'; }
        else if (igfRate >= igfB) { g3Color = '#A6FF00'; g3Text = 'BAIK (STABIL)'; }
        else if (igfRate >= igfC) { g3Color = 'var(--neon-yellow)'; g3Text = 'CUKUP (LONCAT)'; }
        else if (igfRate >= igfK) { g3Color = 'var(--neon-orange)'; g3Text = 'KURANG (MISSED)'; }
        else { g3Color = 'var(--neon-red)'; g3Text = 'FAULT (NO IGF)'; }
    }

    const checkPulses = state.checkCoilPulseCount || 3, checkVerdict = state.checkCoilVerdict || "READY (SIAP)";
    const handleFullReset = () => { sendAction('resetCounters'); sendAction('resetLeakCounter'); };
    const canRunCheck = state.connected && !state.isRunning && !isLocked && !isPreFlightLocked;

    return html`
        <div class="panel ${isAlarm ? 'pulse-alarm-red' : ''}" style="margin-top: 4px; grid-column: 1 / -1; border-color: ${healthColor}; box-sizing: border-box; display: flex; flex-direction: column; gap: 8px;">
            <!-- TOP SCANNER STRIP -->
            <div style="background: rgba(0,0,0,0.45); border: 1px solid var(--border-sharp); border-radius: 4px; padding: 6px 10px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 6px; font-size: 0.72rem;">
                <div style="display: flex; gap: 8px; align-items: center;">
                    <span>🔋 SUPPLY: <strong style="color: ${parseFloat(vBat) >= 11.5 ? 'var(--neon-green)' : 'var(--neon-orange)'}; font-variant-numeric: tabular-nums;">${vBat} V</strong></span>
                    <span class="status-badge" style="padding: 1px 6px; font-size: 0.65rem; border-color: ${parseFloat(vBat) >= 11.5 ? 'var(--neon-green)' : 'var(--neon-orange)'}; color: ${parseFloat(vBat) >= 11.5 ? 'var(--neon-green)' : 'var(--neon-orange)'};">${parseFloat(vBat) >= 11.5 ? 'VOLTAGE OK' : 'LOW VOLT'}</span>
                </div>
                <div style="display: flex; gap: 10px; color: var(--text-muted); font-variant-numeric: tabular-nums;">
                    <span>🌡️ Koil: <strong style="color: var(--neon-cyan);">${tempCoil} °C</strong></span>
                    <span>🌡️ IGBT: <strong style="color: var(--neon-purple);">${tempDriver} °C</strong></span>
                    <span>⚡ Arus DC: <strong style="color: var(--neon-green);">${realA} A</strong></span>
                </div>
                <div style="display: flex; gap: 6px; align-items: center;">
                    <button class="btn" style="padding: 2px 8px; font-size: 0.68rem; font-weight: 700;" onClick=${handleFullReset} disabled=${!state.connected}>🔄 RESET</button>
                    <span class="status-badge" style="border-color: ${healthColor}; color: ${healthColor}; font-weight: 800;">${healthBadge}</span>
                </div>
            </div>

            <!-- ===================== BARIS 1: GAUGES MONITOR ===================== -->
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 8px;">
                <!-- GAUGE 1: SPARK CURRENT mA -->
                <div style="background: rgba(0,0,0,0.35); border: 2px solid ${g1Color}; border-radius: 6px; padding: 8px 12px; min-height: 88px; display: flex; flex-direction: column; justify-content: space-between; box-sizing: border-box;">
                    <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.72rem; font-weight: 700; color: var(--neon-cyan);">
                        <span>⚡ ARUS API SEKUNDER</span><span style="font-size: 0.65rem; color: var(--text-muted);">>45 mA</span>
                    </div>
                    <div style="display: flex; align-items: baseline; justify-content: space-between;">
                        <div style="font-size: 1.65rem; font-weight: 900; color: ${g1Color}">${isStandby ? '--' : sparkmA.toFixed(1)} <span style="font-size: 0.78rem; color: var(--text-muted);">mA</span></div>
                        <div style="font-size: 0.72rem; font-weight: 800; color: ${g1Color}">${g1Text}</div>
                    </div>
                    <div style="width: 100%; height: 5px; background: rgba(255,255,255,0.08); border-radius: 3px; overflow: hidden;"><div style="width: ${g1W}%; height: 100%; background: ${g1Color}; transition: width 0.2s;"></div></div>
                </div>

                <!-- GAUGE 2: SPARK CADENCE % -->
                <div style="background: rgba(0,0,0,0.35); border: 2px solid ${g2Color}; border-radius: 6px; padding: 8px 12px; min-height: 88px; display: flex; flex-direction: column; justify-content: space-between; box-sizing: border-box;">
                    <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.72rem; font-weight: 700; color: var(--neon-purple);">
                        <span>🎯 SINKRONISASI API</span><span style="font-size: 0.65rem; color: var(--text-muted);">100%</span>
                    </div>
                    <div style="display: flex; align-items: baseline; justify-content: space-between;">
                        <div style="font-size: 1.65rem; font-weight: 900; color: ${g2Color}">${isStandby ? '--' : cadenceRate.toFixed(1)} <span style="font-size: 0.78rem; color: var(--text-muted);">%</span></div>
                        <div style="font-size: 0.72rem; font-weight: 800; color: ${g2Color}">${g2Text}</div>
                    </div>
                    <div style="width: 100%; height: 5px; background: rgba(255,255,255,0.08); border-radius: 3px; overflow: hidden;"><div style="width: ${g2W}%; height: 100%; background: ${g2Color}; transition: width 0.2s;"></div></div>
                </div>

                <!-- GAUGE 3: IGF MONITOR (KHUSUS KOIL 4-PIN) -->
                ${is4Pin ? html`
                    <div style="background: rgba(0,0,0,0.35); border: 2px solid ${g3Color}; border-radius: 6px; padding: 8px 12px; min-height: 88px; display: flex; flex-direction: column; justify-content: space-between; box-sizing: border-box;">
                        <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.72rem; font-weight: 700; color: #c084fc;">
                            <span>🔌 SENSOR IGF (PIN 34)</span><span style="font-size: 0.65rem; color: var(--text-muted);">Feedback</span>
                        </div>
                        <div style="display: flex; align-items: baseline; justify-content: space-between;">
                            <div style="font-size: 1.65rem; font-weight: 900; color: ${g3Color}">${isStandby ? '--' : igfRate.toFixed(1)} <span style="font-size: 0.78rem; color: var(--text-muted);">%</span></div>
                            <div style="font-size: 0.72rem; font-weight: 800; color: ${g3Color}">${g3Text}</div>
                        </div>
                        <div style="width: 100%; height: 5px; background: rgba(255,255,255,0.08); border-radius: 3px; overflow: hidden;"><div style="width: ${g3W}%; height: 100%; background: ${g3Color}; transition: width 0.2s;"></div></div>
                    </div>
                ` : ''}
            </div>

            <!-- ===================== BARIS 2: UNIFIED METRICS & DIAGNOSIS ===================== -->
            <div style="background: rgba(0,0,0,0.4); border: 1px solid var(--border-sharp); border-radius: 6px; padding: 8px 10px; display: flex; flex-direction: column; gap: 6px;">
                <!-- METRIC CHIPS STRIP -->
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(100px, 1fr)); gap: 6px;">
                    <div style="background: rgba(0,229,255,0.06); border: 1px solid #00E5FF; border-radius: 4px; padding: 4px 6px; text-align: center;">
                        <div style="font-size: 0.62rem; color: var(--text-muted); font-weight: 700;">TOTAL IGT</div>
                        <div style="font-size: 1.15rem; font-weight: 900; color: var(--neon-cyan);">${fired}</div>
                    </div>
                    ${is4Pin ? html`
                        <div style="background: rgba(192,132,252,0.06); border: 1px solid #c084fc; border-radius: 4px; padding: 4px 6px; text-align: center;">
                            <div style="font-size: 0.62rem; color: var(--text-muted); font-weight: 700;">RESPON IGF (34)</div>
                            <div style="font-size: 1.15rem; font-weight: 900; color: #c084fc;">${igfCount} <span style="font-size: 0.65rem;">(${igfRate.toFixed(0)}%)</span></div>
                        </div>
                    ` : ''}
                    <div style="background: rgba(0,255,102,0.06); border: 1px solid #00FF66; border-radius: 4px; padding: 4px 6px; text-align: center;">
                        <div style="font-size: 0.62rem; color: var(--text-muted); font-weight: 700;">RESPON API</div>
                        <div style="font-size: 1.15rem; font-weight: 900; color: var(--neon-green);">${confirmed} <span style="font-size: 0.65rem;">(${cadenceRate.toFixed(0)}%)</span></div>
                    </div>
                    <div style="background: ${missed > 0 ? 'rgba(255,45,85,0.12)' : 'rgba(255,255,255,0.03)'}; border: 1px solid ${missed > 0 ? '#FF3333' : '#444444'}; border-radius: 4px; padding: 4px 6px; text-align: center;">
                        <div style="font-size: 0.62rem; color: var(--text-muted); font-weight: 700;">MISSED</div>
                        <div style="font-size: 1.15rem; font-weight: 900; color: ${missed > 0 ? 'var(--neon-red)' : 'var(--text-muted)'};">${missed}</div>
                    </div>
                    <div style="background: rgba(0,229,255,0.06); border: 1px solid #00E5FF; border-radius: 4px; padding: 4px 6px; text-align: center;">
                        <div style="font-size: 0.62rem; color: var(--text-muted); font-weight: 700;">ARUS PEAK</div>
                        <div style="font-size: 1.15rem; font-weight: 900; color: var(--neon-cyan);">${isStandby ? '--' : currentA}A</div>
                    </div>
                    <div style="background: rgba(255,149,0,0.05); border: 1px solid #FF9900; border-radius: 4px; padding: 4px 6px; text-align: center;">
                        <div style="font-size: 0.62rem; color: var(--text-muted); font-weight: 700;">SUHU KOIL</div>
                        <div style="font-size: 1.15rem; font-weight: 900; color: var(--neon-orange);">${tempCoil}°C</div>
                    </div>
                </div>

                <!-- DIAGNOSTIC CONCLUSION STRIP -->
                <div style="background: rgba(0,0,0,0.3); border-top: 1px dashed var(--border-sharp); padding-top: 6px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 6px;">
                    <div style="display: flex; gap: 6px; align-items: center;">
                        <span style="font-size: 0.68rem; color: var(--text-muted); font-weight: 800;">📋 HASIL UJI:</span>
                        <strong style="font-size: 0.85rem; color: ${healthColor};">${isStandby ? 'STANDBY (SIAP PENGUJIAN)' : (state.coilCurrentStatus || healthBadge + ' - ' + healthDesc)}</strong>
                    </div>
                    <div style="display: flex; gap: 6px; align-items: center;">
                        <span style="font-size: 0.68rem; color: var(--text-muted); font-weight: 800;">SKOR:</span>
                        <strong style="font-size: 1.1rem; color: ${healthColor};">${isStandby ? '--' : Math.round(totalHealthScore)}%</strong>
                    </div>
                </div>
            </div>

            <!-- ===================== BARIS 3: KEBOCORAN BODI & PRE-FLIGHT ===================== -->
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 8px;">
                <!-- KIRI: KEBOCORAN BODI -->
                <div style="background: rgba(0,0,0,0.3); border: 2px solid ${leakBadgeColor}; border-radius: 6px; padding: 8px 12px; display: flex; flex-direction: column; justify-content: space-between; min-height: 72px;">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <span style="font-size: 0.74rem; font-weight: 800; color: ${leakBadgeColor};">🛡️ KEBOCORAN BODI (PIN 36):</span>
                        <span class="status-badge" style="border-color: ${leakBadgeColor}; color: ${leakBadgeColor}; font-weight: 800; font-size: 0.65rem;">${leakStatusText}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 4px; font-size: 0.74rem;">
                        <span>Loncatan: <strong style="color: ${leakCount > 0 ? 'var(--neon-orange)' : 'var(--neon-green)'}; font-size: 0.95rem;">${leakCount} Arcs</strong></span>
                        <span>Frekuensi: <strong style="color: ${leakRate > 5 ? 'var(--neon-red)' : 'var(--neon-cyan)'}; font-size: 0.95rem;">${leakRate}/dtk</strong></span>
                    </div>
                </div>

                <!-- KANAN: PRE-FLIGHT CHECK COIL -->
                <div style="background: rgba(0,0,0,0.3); border: 2px solid ${isLocked ? 'rgba(255, 45, 85, 0.4)' : (isPreFlightLocked ? 'rgba(255, 149, 0, 0.4)' : 'rgba(0, 255, 102, 0.5)')}; border-radius: 6px; padding: 8px 12px; display: flex; flex-direction: column; justify-content: space-between; min-height: 72px;">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <div style="display: flex; gap: 4px; align-items: center;">
                            <span style="font-size: 0.74rem; font-weight: 800; color: ${isLocked ? 'var(--neon-red)' : (isPreFlightLocked ? 'var(--neon-orange)' : 'var(--neon-green)')};">⚡ PRE-FLIGHT:</span>
                            <button class="btn" style="padding: 1px 6px; font-size: 0.65rem; font-weight: 800; border-color: ${isLocked ? 'var(--neon-red)' : (isPreFlightLocked ? 'var(--neon-orange)' : 'var(--neon-green)')}; color: ${isLocked ? 'var(--neon-red)' : (isPreFlightLocked ? 'var(--neon-orange)' : 'var(--neon-green)')}; cursor: ${isLocked ? 'not-allowed' : 'pointer'};" onClick=${handleTogglePreFlight}>
                                ${isLocked ? '🔒 TERKUNCI (TRIGGER BAWAH MATI)' : (isPreFlightLocked ? '🔒 KUNCI PRE-FLIGHT' : '🔓 TERBUKA')}
                            </button>
                        </div>
                        <div style="display: flex; gap: 3px;">
                            ${[1, 2, 3, 5, 10].map(p => html`<button class="btn ${checkPulses === p ? 'btn-active' : ''}" style="padding: 1px 5px; font-size: 0.65rem; font-weight: 800;" onClick=${() => sendAction('setCheckCoilPulses', p)} disabled=${!state.connected}>${p}x</button>`)}
                        </div>
                    </div>
                    ${showMasterAlert ? html`<div style="background: rgba(255, 45, 85, 0.25); border: 1px solid var(--neon-red); color: #fff; font-size: 0.65rem; font-weight: 900; padding: 2px 6px; border-radius: 3px; margin: 3px 0; text-align: center;">⚠️ BUKA KUNCI TRIGGER UTAMA DI BAWAH DAHULU!</div>` : ''}
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 4px; gap: 6px;">
                        <button class="btn" style="padding: 4px 10px; font-size: 0.72rem; font-weight: 900; ${canRunCheck ? 'background: #FFE600; color: #000; cursor: pointer;' : 'background: rgba(255,255,255,0.05); color: #666; cursor: not-allowed;'}" onClick=${handleRunPreFlight} disabled=${!canRunCheck}>
                            ${isLocked ? '🔒 TRIGGER BAWAH TERKUNCI' : (isPreFlightLocked ? '🔒 BUKA KUNCI PRE-FLIGHT' : `⚡ RUN (${checkPulses}x)`)}
                        </button>
                        <span style="font-size: 0.72rem; font-weight: 800; color: ${checkVerdict.includes('PASS') || checkVerdict.includes('PERFECT') ? 'var(--neon-green)' : (checkVerdict.includes('DANGER') || checkVerdict.includes('SHORT') ? 'var(--neon-red)' : 'var(--neon-yellow)')};">${checkVerdict}</span>
                    </div>
                </div>
            </div>
        </div>
    `;
}
