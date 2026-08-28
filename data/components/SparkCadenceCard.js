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

    const fired = state.coilFiredCount || 0, igfCount = state.coilIgfCount || 0, sparkCount = state.coilSparkReturnCount || 0;
    const confirmed = is4Pin ? (sparkCount > 0 ? sparkCount : igfCount) : sparkCount;
    const missed = state.coilMissedCount || Math.max(0, fired - confirmed), sparkmA = state.coilSparkCurrentmA || 0.0;
    const currentA = state.coilPeakCurrentA ? state.coilPeakCurrentA.toFixed(1) : "0.0";
    const realA = state.realCurrentA !== undefined ? state.realCurrentA.toFixed(2) : "0.00", vBat = state.supplyVoltage !== undefined ? state.supplyVoltage.toFixed(2) : "12.60";
    const tempCoil = state.tempCoilC !== undefined ? state.tempCoilC.toFixed(1) : "28.5", tempDriver = state.tempDriverC !== undefined ? state.tempDriverC.toFixed(1) : "29.0";

    const spP = state.calSparkPrima || 45.0, spB = state.calSparkBaik || 35.0, spC = state.calSparkCukup || 25.0, spK = state.calSparkKurang || 15.0;
    const cdP = state.calCadencePrima || 98.0, cdB = state.calCadenceBaik || 90.0, cdC = state.calCadenceCukup || 80.0, cdK = state.calCadenceKurang || 60.0;
    const crP = state.calCurrentPrima || 6.5, crB = state.calCurrentBaik || 5.5, crC = state.calCurrentCukup || 4.5, crK = state.calCurrentKurang || 3.0, crM = state.calCurrentMax || 11.5;
    const tpP = state.calTempPrima || 45.0, tpB = state.calTempBaik || 55.0, tpC = state.calTempCukup || 65.0, tpPanas = state.calTempPanas || 75.0, tpCut = state.calTempCutoff || 85.0;
    const igfP = state.calIgfPrima || 98.0, igfB = state.calIgfBaik || 90.0, igfC = state.calIgfCukup || 80.0, igfK = state.calIgfKurang || 60.0;

    const isStandby = (fired === 0 && !state.isRunning);
    const cadenceRate = fired > 0 ? Math.min(100, Math.max(0, (confirmed / fired) * 100)) : 0;
    const igfRate = fired > 0 ? Math.min(100, Math.max(0, (igfCount / fired) * 100)) : 0;
    const arrhythmiaRate = fired > 0 ? (100 - cadenceRate) : 0, energyFactor = sparkmA > 0 ? Math.min(1.0, Math.max(0.0, sparkmA / spP)) : 1.0;

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

    let g4Color = 'var(--text-muted)', g4Text = 'STANDBY', g4W = 0;
    if (!isStandby) {
        g4W = Math.min(100, (numCurr / 12.0) * 100);
        if (numCurr > crM) { g4Color = 'var(--neon-red)'; g4Text = 'OVERCURRENT'; }
        else if (numCurr >= crP && numCurr <= 10.5) { g4Color = 'var(--neon-green)'; g4Text = 'PRIMA (STANDAR)'; }
        else if (numCurr >= crB) { g4Color = '#A6FF00'; g4Text = 'BAIK (NORMAL)'; }
        else if (numCurr >= crC) { g4Color = 'var(--neon-yellow)'; g4Text = 'CUKUP (SEDANG)'; }
        else if (numCurr >= crK) { g4Color = 'var(--neon-orange)'; g4Text = 'KURANG (LEMAH)'; }
        else { g4Color = 'var(--neon-red)'; g4Text = 'DROP (<3A)'; }
    }

    const checkPulses = state.checkCoilPulseCount || 3, checkVerdict = state.checkCoilVerdict || "READY (SIAP)";
    const handleFullReset = () => { sendAction('resetCounters'); sendAction('resetLeakCounter'); };
    const canRunCheck = state.connected && !state.isRunning && !isLocked && !isPreFlightLocked;

    return html`
        <div class="panel ${isAlarm ? 'pulse-alarm-red' : ''}" style="margin-top: 4px; grid-column: 1 / -1; border-color: ${healthColor}; box-sizing: border-box;">
            <!-- TOP SCANNER STRIP -->
            <div style="background: rgba(0,0,0,0.45); border: 1px solid var(--border-sharp); border-radius: 4px; padding: 6px 10px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 6px; font-size: 0.72rem; margin-bottom: 8px;">
                <div style="display: flex; gap: 8px; align-items: center;">
                    <span>🔋 SUPPLY: <strong style="color: ${parseFloat(vBat) >= 11.5 ? 'var(--neon-green)' : 'var(--neon-orange)'}; font-variant-numeric: tabular-nums;">${vBat} V</strong></span>
                    <span class="status-badge" style="padding: 1px 6px; font-size: 0.65rem; border-color: ${parseFloat(vBat) >= 11.5 ? 'var(--neon-green)' : 'var(--neon-orange)'}; color: ${parseFloat(vBat) >= 11.5 ? 'var(--neon-green)' : 'var(--neon-orange)'};">${parseFloat(vBat) >= 11.5 ? 'VOLTAGE OK' : 'LOW VOLT'}</span>
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

            <!-- BARIS 1: GAUGES MONITOR (FULL SIZE 98px, 4 GAUGES ON 4-PIN - NO GAP) -->
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 10px; margin-top: 8px;">
                <!-- GAUGE 1: KUALITAS API (mA) -->
                <div style="background: rgba(0,0,0,0.35); border: 2px solid ${g1Color}; border-radius: 6px; padding: 10px 14px; min-height: 98px; height: 98px; display: flex; flex-direction: column; justify-content: space-between; box-sizing: border-box;">
                    <div style="display: flex; justify-content: space-between; align-items: center; height: 16px;">
                        <span style="font-size: 0.75rem; font-weight: 700; color: var(--neon-cyan);">⚡ GAUGE 1: ARUS SEKUNDER</span>
                        <span style="font-size: 0.7rem; color: var(--text-muted);">Target: >45 mA</span>
                    </div>
                    <div style="display: flex; align-items: baseline; justify-content: space-between; margin-top: 2px;">
                        <div style="font-size: 1.85rem; font-weight: 900; line-height: 1; color: ${g1Color}">${isStandby ? '--' : sparkmA.toFixed(1)} <span style="font-size: 0.85rem; font-weight: 600; color: var(--text-muted);">mA</span></div>
                        <div style="font-size: 0.74rem; font-weight: 800; white-space: nowrap; color: ${g1Color}">${g1Text}</div>
                    </div>
                    <div style="width: 100%; height: 6px; background: rgba(255,255,255,0.08); border-radius: 3px; overflow: hidden; margin-top: 4px;">
                        <div style="width: ${g1W}%; height: 100%; background: ${g1Color}; transition: width 0.2s ease;"></div>
                    </div>
                </div>

                <!-- GAUGE 2: SINKRONISASI DETAK API (%) -->
                <div style="background: rgba(0,0,0,0.35); border: 2px solid ${g2Color}; border-radius: 6px; padding: 10px 14px; min-height: 98px; height: 98px; display: flex; flex-direction: column; justify-content: space-between; box-sizing: border-box;">
                    <div style="display: flex; justify-content: space-between; align-items: center; height: 16px;">
                        <span style="font-size: 0.75rem; font-weight: 700; color: var(--neon-purple);">🎯 GAUGE 2: SINKRONISASI API</span>
                        <span style="font-size: 0.7rem; color: var(--text-muted);">Sinkron: 100%</span>
                    </div>
                    <div style="display: flex; align-items: baseline; justify-content: space-between; margin-top: 2px;">
                        <div style="font-size: 1.85rem; font-weight: 900; line-height: 1; color: ${g2Color}">${isStandby ? '--' : cadenceRate.toFixed(1)} <span style="font-size: 0.85rem; font-weight: 600; color: var(--text-muted);">%</span></div>
                        <div style="font-size: 0.74rem; font-weight: 800; white-space: nowrap; color: ${g2Color}">${g2Text}</div>
                    </div>
                    <div style="width: 100%; height: 6px; background: rgba(255,255,255,0.08); border-radius: 3px; overflow: hidden; margin-top: 4px;">
                        <div style="width: ${g2W}%; height: 100%; background: ${g2Color}; transition: width 0.2s ease;"></div>
                    </div>
                </div>

                ${is4Pin ? html`
                    <!-- GAUGE 3: SENSOR IGF PIN 34 -->
                    <div style="background: rgba(0,0,0,0.35); border: 2px solid ${g3Color}; border-radius: 6px; padding: 10px 14px; min-height: 98px; height: 98px; display: flex; flex-direction: column; justify-content: space-between; box-sizing: border-box;">
                        <div style="display: flex; justify-content: space-between; align-items: center; height: 16px;">
                            <span style="font-size: 0.75rem; font-weight: 700; color: #c084fc;">🔌 GAUGE 3: RESPON IGF</span>
                            <span style="font-size: 0.7rem; color: var(--text-muted);">Pin 34 Feedback</span>
                        </div>
                        <div style="display: flex; align-items: baseline; justify-content: space-between; margin-top: 2px;">
                            <div style="font-size: 1.85rem; font-weight: 900; line-height: 1; color: ${g3Color}">${isStandby ? '--' : igfRate.toFixed(1)} <span style="font-size: 0.85rem; font-weight: 600; color: var(--text-muted);">%</span></div>
                            <div style="font-size: 0.74rem; font-weight: 800; white-space: nowrap; color: ${g3Color}">${g3Text}</div>
                        </div>
                        <div style="width: 100%; height: 6px; background: rgba(255,255,255,0.08); border-radius: 3px; overflow: hidden; margin-top: 4px;">
                            <div style="width: ${g3W}%; height: 100%; background: ${g3Color}; transition: width 0.2s ease;"></div>
                        </div>
                    </div>

                    <!-- GAUGE 4: ARUS PRIMER PEAK (MENGISI KEKOSONGAN SEBELAH KANAN IGF) -->
                    <div style="background: rgba(0,0,0,0.35); border: 2px solid ${g4Color}; border-radius: 6px; padding: 10px 14px; min-height: 98px; height: 98px; display: flex; flex-direction: column; justify-content: space-between; box-sizing: border-box;">
                        <div style="display: flex; justify-content: space-between; align-items: center; height: 16px;">
                            <span style="font-size: 0.75rem; font-weight: 700; color: var(--neon-cyan);">⚡ GAUGE 4: ARUS PRIMER PEAK</span>
                            <span style="font-size: 0.7rem; color: var(--text-muted);">ACS712 (>6A)</span>
                        </div>
                        <div style="display: flex; align-items: baseline; justify-content: space-between; margin-top: 2px;">
                            <div style="font-size: 1.85rem; font-weight: 900; line-height: 1; color: ${g4Color}">${isStandby ? '--' : currentA} <span style="font-size: 0.85rem; font-weight: 600; color: var(--text-muted);">A</span></div>
                            <div style="font-size: 0.74rem; font-weight: 800; white-space: nowrap; color: ${g4Color}">${g4Text}</div>
                        </div>
                        <div style="width: 100%; height: 6px; background: rgba(255,255,255,0.08); border-radius: 3px; overflow: hidden; margin-top: 4px;">
                            <div style="width: ${g4W}%; height: 100%; background: ${g4Color}; transition: width 0.2s ease;"></div>
                        </div>
                    </div>
                ` : ''}
            </div>

            <!-- BARIS 2: 6 METRIC CARDS (FULL ORIGINAL SIZE 88px) -->
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(110px, 1fr)); gap: 6px; margin-top: 8px;">
                <div style="background: rgba(0, 229, 255, 0.06); border: 2px solid #00E5FF; border-radius: 6px; padding: 6px 8px; height: 88px; box-sizing: border-box; display: flex; flex-direction: column; justify-content: space-between; align-items: center; text-align: center;">
                    <div style="font-size: 0.65rem; color: var(--text-muted); font-weight: 700;">TOTAL DETAK</div>
                    <div style="font-size: 1.45rem; font-weight: 900; color: var(--neon-cyan);">${fired}</div>
                    <div style="font-size: 0.62rem; color: var(--neon-cyan); font-weight: 700;">Terpicu (IGT)</div>
                </div>
                ${is4Pin ? html`
                    <div style="background: rgba(192, 132, 252, 0.06); border: 2px solid #c084fc; border-radius: 6px; padding: 6px 8px; height: 88px; box-sizing: border-box; display: flex; flex-direction: column; justify-content: space-between; align-items: center; text-align: center;">
                        <div style="font-size: 0.65rem; color: var(--text-muted); font-weight: 700;">RESPON IGF</div>
                        <div style="font-size: 1.45rem; font-weight: 900; color: #c084fc;">${igfCount}</div>
                        <div style="font-size: 0.62rem; color: #c084fc; font-weight: 700;">${igfRate.toFixed(0)}% Pin 34</div>
                    </div>
                ` : ''}
                <div style="background: rgba(0, 255, 102, 0.06); border: 2px solid #00FF66; border-radius: 6px; padding: 6px 8px; height: 88px; box-sizing: border-box; display: flex; flex-direction: column; justify-content: space-between; align-items: center; text-align: center;">
                    <div style="font-size: 0.65rem; color: var(--text-muted); font-weight: 700;">RESPON API</div>
                    <div style="font-size: 1.45rem; font-weight: 900; color: var(--neon-green);">${confirmed}</div>
                    <div style="font-size: 0.62rem; color: var(--neon-green); font-weight: 700;">${cadenceRate.toFixed(0)}% Konfirmasi</div>
                </div>
                <div style="background: ${missed > 0 ? 'rgba(255, 45, 85, 0.12)' : 'rgba(255, 255, 255, 0.03)'}; border: 2px solid ${missed > 0 ? '#FF3333' : '#444444'}; border-radius: 6px; padding: 6px 8px; height: 88px; box-sizing: border-box; display: flex; flex-direction: column; justify-content: space-between; align-items: center; text-align: center;">
                    <div style="font-size: 0.65rem; color: var(--text-muted); font-weight: 700;">DETAK HILANG</div>
                    <div style="font-size: 1.45rem; font-weight: 900; color: ${missed > 0 ? 'var(--neon-red)' : 'var(--text-muted)'};">${missed}</div>
                    <div style="font-size: 0.62rem; color: ${missed > 0 ? 'var(--neon-red)' : 'var(--text-muted)'}; font-weight: 700;">${arrhythmiaRate.toFixed(0)}% Missed</div>
                </div>
                <div style="background: rgba(255, 149, 0, 0.05); border: 2px solid ${parseFloat(tempCoil) >= 75 ? '#FF3333' : '#FF9900'}; border-radius: 6px; padding: 6px 8px; height: 88px; box-sizing: border-box; display: flex; flex-direction: column; justify-content: space-between; align-items: center; text-align: center;">
                    <div style="font-size: 0.65rem; color: var(--text-muted); font-weight: 700;">SUHU KOIL</div>
                    <div style="font-size: 1.45rem; font-weight: 900; color: ${parseFloat(tempCoil) >= 75 ? 'var(--neon-red)' : 'var(--neon-orange)'};">${tempCoil}<span style="font-size: 0.75rem; color: var(--text-muted);">°C</span></div>
                    <div style="font-size: 0.62rem; color: var(--neon-orange); font-weight: 700;">DS18B20 Probe</div>
                </div>
                <div style="background: rgba(189, 0, 255, 0.05); border: 2px solid ${parseFloat(tempDriver) >= 80 ? '#FF3333' : '#C084FC'}; border-radius: 6px; padding: 6px 8px; height: 88px; box-sizing: border-box; display: flex; flex-direction: column; justify-content: space-between; align-items: center; text-align: center;">
                    <div style="font-size: 0.65rem; color: var(--text-muted); font-weight: 700;">SUHU IGBT</div>
                    <div style="font-size: 1.45rem; font-weight: 900; color: ${parseFloat(tempDriver) >= 80 ? 'var(--neon-red)' : 'var(--neon-purple)'};">${tempDriver}<span style="font-size: 0.75rem; color: var(--text-muted);">°C</span></div>
                    <div style="font-size: 0.62rem; color: var(--neon-purple); font-weight: 700;">Driver Heatsink</div>
                </div>
            </div>

            <!-- BARIS 3: DIAGNOSTIC CONCLUSION BANNER (FULL ORIGINAL SIZE) -->
            <div style="background: rgba(0,0,0,0.55); border: 2px solid ${healthColor}; border-radius: 6px; padding: 10px 14px; margin-top: 8px; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 0 14px ${healthColor}33; box-sizing: border-box; flex-wrap: wrap; gap: 8px;">
                <div>
                    <div style="font-size: 0.68rem; color: var(--text-muted); font-weight: 800;">📋 KESIMPULAN HASIL UJI KOIL:</div>
                    <div style="font-size: 1.05rem; font-weight: 900; color: ${healthColor}; margin-top: 2px;">
                        ${isStandby ? 'STANDBY (SIAP PENGUJIAN)' : (state.coilCurrentStatus || healthBadge + ' - ' + healthDesc)}
                    </div>
                </div>
                <div style="text-align: right;">
                    <div style="font-size: 0.68rem; color: var(--text-muted); font-weight: 800;">SKOR KESEHATAN:</div>
                    <div style="font-size: 1.45rem; font-weight: 900; color: ${healthColor}; line-height: 1.1;">
                        ${isStandby ? '--' : Math.round(totalHealthScore)}%
                    </div>
                </div>
            </div>

            <!-- BARIS 4: KEBOCORAN BODI & PRE-FLIGHT CHECK -->
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 8px; margin-top: 8px;">
                <!-- LEFT: KEBOCORAN BODI -->
                <div style="background: rgba(0,0,0,0.3); border: 2px solid ${leakBadgeColor}; border-radius: 6px; padding: 8px 12px; display: flex; flex-direction: column; justify-content: space-between; min-height: 76px; box-sizing: border-box;">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <span style="font-size: 0.74rem; font-weight: 800; color: ${leakBadgeColor};">🛡️ KEBOCORAN BODI (PIN 36):</span>
                        <span class="status-badge" style="border-color: ${leakBadgeColor}; color: ${leakBadgeColor}; font-weight: 800; font-size: 0.65rem;">${leakStatusText}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 4px; font-size: 0.74rem;">
                        <span>Loncatan: <strong style="color: ${leakCount > 0 ? 'var(--neon-orange)' : 'var(--neon-green)'}; font-size: 0.95rem;">${leakCount} Arcs</strong></span>
                        <span>Frekuensi: <strong style="color: ${leakRate > 5 ? 'var(--neon-red)' : 'var(--neon-cyan)'}; font-size: 0.95rem;">${leakRate}/dtk</strong></span>
                    </div>
                </div>

                <!-- RIGHT: PRE-FLIGHT CHECK COIL WITH STRICT 2-TIER SAFETY INTERLOCK -->
                <div style="background: rgba(0,0,0,0.3); border: 2px solid ${isLocked ? 'rgba(255, 45, 85, 0.4)' : (isPreFlightLocked ? 'rgba(255, 149, 0, 0.4)' : 'rgba(0, 255, 102, 0.5)')}; border-radius: 6px; padding: 8px 12px; display: flex; flex-direction: column; justify-content: space-between; min-height: 76px; box-sizing: border-box;">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <div style="display: flex; gap: 4px; align-items: center;">
                            <span style="font-size: 0.74rem; font-weight: 800; color: ${isLocked ? 'var(--neon-red)' : (isPreFlightLocked ? 'var(--neon-orange)' : 'var(--neon-green)')};">⚡ PRE-FLIGHT:</span>
                            <button class="btn" style="padding: 1px 6px; font-size: 0.65rem; font-weight: 800; border-color: ${isLocked ? 'var(--neon-red)' : (isPreFlightLocked ? 'var(--neon-orange)' : 'var(--neon-green)')}; background: ${isLocked ? 'rgba(255, 45, 85, 0.15)' : (isPreFlightLocked ? 'rgba(255, 149, 0, 0.15)' : 'rgba(0, 255, 102, 0.15)')}; color: ${isLocked ? 'var(--neon-red)' : (isPreFlightLocked ? 'var(--neon-orange)' : 'var(--neon-green)')}; cursor: ${isLocked ? 'not-allowed' : 'pointer'};" onClick=${handleTogglePreFlight} title="${isLocked ? 'Kunci Terkunci Mutlak: Buka Kunci Trigger Bawah Dahulu' : 'Klik untuk Buka/Kunci Pre-Flight'}">
                                ${isLocked ? '🔒 TERKUNCI (TRIGGER BAWAH MATI)' : (isPreFlightLocked ? '🔒 KUNCI PRE-FLIGHT' : '🔓 TERBUKA')}
                            </button>
                        </div>
                        <div style="display: flex; gap: 3px;">
                            ${[1, 2, 3, 5, 10].map(p => html`<button class="btn ${checkPulses === p ? 'btn-active' : ''}" style="padding: 1px 5px; font-size: 0.65rem; font-weight: 800; border-color: ${checkPulses === p ? 'var(--neon-yellow)' : 'var(--border-sharp)'}; background: ${checkPulses === p ? 'rgba(255, 230, 0, 0.25)' : 'transparent'}; color: ${checkPulses === p ? 'var(--neon-yellow)' : 'var(--text-muted)'};" onClick=${() => sendAction('setCheckCoilPulses', p)} disabled=${!state.connected}>${p}x</button>`)}
                        </div>
                    </div>

                    ${showMasterAlert ? html`<div style="background: rgba(255, 45, 85, 0.25); border: 1px solid var(--neon-red); color: #fff; font-size: 0.65rem; font-weight: 900; padding: 2px 6px; border-radius: 3px; margin: 3px 0; text-align: center;" class="pulse-alarm-red">⚠️ BUKA KUNCI TRIGGER UTAMA DI BAWAH DAHULU!</div>` : ''}

                    <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 4px; gap: 6px;">
                        <button class="btn" style="padding: 4px 10px; font-size: 0.72rem; font-weight: 900; ${canRunCheck ? 'background: #FFE600; color: #000; border-color: #FFE600; cursor: pointer;' : 'background: rgba(255,255,255,0.05); color: #666; border-color: #444; cursor: not-allowed;'}" onClick=${handleRunPreFlight} disabled=${!canRunCheck}>
                            ${isLocked ? '🔒 TRIGGER BAWAH TERKUNCI' : (isPreFlightLocked ? '🔒 BUKA KUNCI PRE-FLIGHT' : `⚡ RUN (${checkPulses}x)`)}
                        </button>
                        <span style="font-size: 0.72rem; font-weight: 800; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: ${checkVerdict.includes('PASS') || checkVerdict.includes('PERFECT') ? 'var(--neon-green)' : (checkVerdict.includes('DANGER') || checkVerdict.includes('SHORT') ? 'var(--neon-red)' : 'var(--neon-yellow)')};">
                            ${checkVerdict}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    `;
}
