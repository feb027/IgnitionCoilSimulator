import { html } from '../preact.js';

export function SparkCadenceCard({ state, sendAction, title = "IGNITION & INSULATION ANALYZER", is4Pin = false, isLocked = true, onToggleLock }) {
    const fired = state.coilFiredCount || 0, confirmed = state.coilSparkReturnCount || state.coilIgfCount || 0;
    const missed = state.coilMissedCount || Math.max(0, fired - confirmed), sparkmA = state.coilSparkCurrentmA || 0.0;
    const currentA = state.coilPeakCurrentA ? state.coilPeakCurrentA.toFixed(1) : "0.0";
    const realA = state.realCurrentA !== undefined ? state.realCurrentA.toFixed(2) : "0.00", vBat = state.supplyVoltage !== undefined ? state.supplyVoltage.toFixed(2) : "12.60";
    const tempCoil = state.tempCoilC !== undefined ? state.tempCoilC.toFixed(1) : "28.5", tempDriver = state.tempDriverC !== undefined ? state.tempDriverC.toFixed(1) : "29.0";
    // Dynamic Calibration Thresholds from State (with smart fallbacks)
    const spP = state.calSparkPrima !== undefined ? state.calSparkPrima : 45.0;
    const spB = state.calSparkBaik !== undefined ? state.calSparkBaik : 35.0;
    const spC = state.calSparkCukup !== undefined ? state.calSparkCukup : 25.0;
    const spK = state.calSparkKurang !== undefined ? state.calSparkKurang : 15.0;

    const cdP = state.calCadencePrima !== undefined ? state.calCadencePrima : 98.0;
    const cdB = state.calCadenceBaik !== undefined ? state.calCadenceBaik : 90.0;
    const cdC = state.calCadenceCukup !== undefined ? state.calCadenceCukup : 80.0;
    const cdK = state.calCadenceKurang !== undefined ? state.calCadenceKurang : 60.0;

    const crP = state.calCurrentPrima !== undefined ? state.calCurrentPrima : 6.5;
    const crB = state.calCurrentBaik !== undefined ? state.calCurrentBaik : 5.5;
    const crC = state.calCurrentCukup !== undefined ? state.calCurrentCukup : 4.5;
    const crK = state.calCurrentKurang !== undefined ? state.calCurrentKurang : 3.0;
    const crM = state.calCurrentMax !== undefined ? state.calCurrentMax : 11.5;

    const tpP = state.calTempPrima !== undefined ? state.calTempPrima : 45.0;
    const tpB = state.calTempBaik !== undefined ? state.calTempBaik : 55.0;
    const tpC = state.calTempCukup !== undefined ? state.calTempCukup : 65.0;
    const tpPanas = state.calTempPanas !== undefined ? state.calTempPanas : 75.0;
    const tpCut = state.calTempCutoff !== undefined ? state.calTempCutoff : 85.0;

    const isStandby = (fired === 0 && !state.isRunning);
    const cadenceRate = fired > 0 ? Math.min(100, Math.max(0, (confirmed / fired) * 100)) : 0;
    const arrhythmiaRate = fired > 0 ? (100 - cadenceRate) : 0, energyFactor = sparkmA > 0 ? Math.min(1.0, Math.max(0.0, sparkmA / spP)) : 1.0;

    const isLeaking = state.coilLeakDetected, leakCount = state.coilLeakCount || 0, leakRate = state.coilLeakRate || 0;
    const leakPercent = state.coilLeakPercent !== undefined ? state.coilLeakPercent : 0;
    const leakSeverity = state.coilLeakSeverity || (leakPercent === 0 ? "ISOLASI UTUH (0%)" : "MIKRO LEAK");

    let insulationFactor = 1.0, leakBadgeColor = "var(--neon-green)", leakStatusText = state.coilLeakSeverity || "ISOLASI UTUH (0%)";
    if (leakPercent >= 75 || leakSeverity.includes("JEBOL") || leakSeverity.includes("SEVERE") || leakRate > 25) {
        insulationFactor = 0.20; leakBadgeColor = "var(--neon-red)"; leakStatusText = state.coilLeakSeverity || `🚨 JEBOL TOTAL (${leakPercent}%)`;
    } else if (leakPercent >= 50 || leakSeverity.includes("BOCOR") || leakSeverity.includes("MEDIUM") || leakRate > 5) {
        insulationFactor = 0.50; leakBadgeColor = "var(--neon-orange)"; leakStatusText = state.coilLeakSeverity || `⚠️ BOCOR PARAH (${leakPercent}%)`;
    } else if (leakPercent >= 25 || isLeaking || leakCount > 0) {
        insulationFactor = 0.75; leakBadgeColor = "var(--neon-yellow, #ffe600)"; leakStatusText = state.coilLeakSeverity || `⚡ MIKRO LEAK (${leakPercent}%)`;
    }

    const maxTemp = Math.max(parseFloat(tempCoil), parseFloat(tempDriver));
    const thermalFactor = maxTemp >= tpCut ? 0.25 : (maxTemp >= tpPanas ? 0.65 : (maxTemp >= tpC ? 0.85 : 1.0));

    const totalHealthScore = fired > 0 ? (cadenceRate * energyFactor * insulationFactor * thermalFactor) : 100;
    let healthColor = 'var(--neon-green)', healthBadge = '🟢 PRIMA (100%)', healthDesc = 'Sangat Baik & Siap Pakai';
    const numCurr = parseFloat(currentA);
    const isAlarm = (fired >= 10 && (totalHealthScore < 50 || numCurr > crM || maxTemp >= tpCut || leakSeverity.includes("SEVERE") || confirmed === 0 || (sparkmA < spK && sparkmA > 0)));

    if (isStandby) {
        healthColor = 'var(--text-muted)'; healthBadge = 'STANDBY'; healthDesc = 'Tekan Trigger / Run';
    } else if (numCurr > crM) {
        healthColor = 'var(--neon-red)'; healthBadge = '❌ OVERCURRENT'; healthDesc = `Korsleting Primer (>${crM}A)`;
    } else if (maxTemp >= tpCut) {
        healthColor = 'var(--neon-red)'; healthBadge = '🔥 OVERHEAT'; healthDesc = `Suhu Kritis (>${tpCut}°C)`;
    } else if (leakPercent >= 75 || leakSeverity.includes("JEBOL") || leakRate > 25) {
        healthColor = 'var(--neon-red)'; healthBadge = '🚨 JEBOL TOTAL'; healthDesc = 'Isolasi Bodi Rusak Total';
    } else if (totalHealthScore < 25 || (sparkmA < spK && sparkmA > 0) || cadenceRate < cdK) {
        healthColor = 'var(--neon-red)'; healthBadge = '🔴 RUSAK (0%)'; healthDesc = 'Api Lilin / Aritmia Misfire';
    } else if (totalHealthScore < 50 || sparkmA < spC || cadenceRate < cdC || (numCurr < crK && numCurr > 0) || maxTemp >= tpPanas) {
        healthColor = 'var(--neon-orange)'; healthBadge = '🟧 TIDAK LAYAK (25%)'; healthDesc = maxTemp >= tpPanas ? 'Thermal Stress / Daya Drop' : 'Daya Drop / Arus Lemah';
    } else if (totalHealthScore < 75 || sparkmA < spB || cadenceRate < cdB || isLeaking || leakCount > 0 || maxTemp >= tpC) {
        healthColor = 'var(--neon-yellow)'; healthBadge = '🟨 BISA DIGUNAKAN (50%)'; healthDesc = 'Penurunan Daya / Mikro Leak';
    } else if (totalHealthScore < 90 || sparkmA < spP || cadenceRate < cdP || numCurr < crP || maxTemp >= tpB) {
        healthColor = '#A6FF00'; healthBadge = '🟩 BAIK (75%)'; healthDesc = 'Koil Normal & Layak Pakai';
    } else {
        healthColor = 'var(--neon-green)'; healthBadge = '🟢 PRIMA (100%)'; healthDesc = 'Kondisi Sempurna & Efisien';
    }

    // Gauge 1: Kualitas Api (mA) - Murni 0% saat standby tanpa warna merah
    let gauge1Border = '2px solid rgba(0, 212, 255, 0.25)', gauge1Shadow = 'none';
    let gauge1ValColor = 'var(--text-muted)', gauge1BarColor = 'transparent', gauge1BarWidth = 0, gauge1Text = 'STANDBY';
    if (!isStandby) {
        gauge1BarWidth = Math.min(100, (sparkmA / 60) * 100);
        if (sparkmA >= spP) {
            gauge1Border = '2px solid var(--neon-green)'; gauge1Shadow = '0 0 12px rgba(0, 255, 102, 0.3)';
            gauge1ValColor = 'var(--neon-green)'; gauge1BarColor = 'var(--neon-green)'; gauge1Text = 'PRIMA (TEBAL)';
        } else if (sparkmA >= spB) {
            gauge1Border = '2px solid #A6FF00'; gauge1Shadow = '0 0 10px rgba(166, 255, 0, 0.25)';
            gauge1ValColor = '#A6FF00'; gauge1BarColor = '#A6FF00'; gauge1Text = 'BAIK (STANDAR)';
        } else if (sparkmA >= spC) {
            gauge1Border = '2px solid var(--neon-yellow)'; gauge1Shadow = '0 0 10px rgba(255, 230, 0, 0.25)';
            gauge1ValColor = 'var(--neon-yellow)'; gauge1BarColor = 'var(--neon-yellow)'; gauge1Text = 'CUKUP (SEDANG)';
        } else if (sparkmA >= spK) {
            gauge1Border = '2px solid var(--neon-orange)'; gauge1Shadow = '0 0 12px rgba(255, 149, 0, 0.35)';
            gauge1ValColor = 'var(--neon-orange)'; gauge1BarColor = 'var(--neon-orange)'; gauge1Text = 'KURANG (LEMAH)';
        } else {
            gauge1Border = '2px solid var(--neon-red)'; gauge1Shadow = '0 0 16px rgba(255, 45, 85, 0.6)';
            gauge1ValColor = 'var(--neon-red)'; gauge1BarColor = 'var(--neon-red)'; gauge1Text = 'RUSAK (LILIN/MATI)';
        }
    }

    // Gauge 2: Keteraturan Detak (%) - Murni 0% saat standby tanpa warna merah
    let gauge2Border = '2px solid rgba(189, 0, 255, 0.25)', gauge2Shadow = 'none';
    let gauge2ValColor = 'var(--text-muted)', gauge2BarColor = 'transparent', gauge2BarWidth = 0, gauge2Text = 'STANDBY';
    if (!isStandby) {
        gauge2BarWidth = cadenceRate;
        if (cadenceRate >= cdP) {
            gauge2Border = '2px solid var(--neon-green)'; gauge2Shadow = '0 0 12px rgba(0, 255, 102, 0.3)';
            gauge2ValColor = 'var(--neon-green)'; gauge2BarColor = 'var(--neon-green)'; gauge2Text = 'PRIMA (SINKRON)';
        } else if (cadenceRate >= cdB) {
            gauge2Border = '2px solid #A6FF00'; gauge2Shadow = '0 0 10px rgba(166, 255, 0, 0.25)';
            gauge2ValColor = '#A6FF00'; gauge2BarColor = '#A6FF00'; gauge2Text = 'BAIK (STABIL)';
        } else if (cadenceRate >= cdC) {
            gauge2Border = '2px solid var(--neon-yellow)'; gauge2Shadow = '0 0 10px rgba(255, 230, 0, 0.25)';
            gauge2ValColor = 'var(--neon-yellow)'; gauge2BarColor = 'var(--neon-yellow)'; gauge2Text = 'CUKUP (LONCAT)';
        } else if (cadenceRate >= cdK) {
            gauge2Border = '2px solid var(--neon-orange)'; gauge2Shadow = '0 0 12px rgba(255, 149, 0, 0.35)';
            gauge2ValColor = 'var(--neon-orange)'; gauge2BarColor = 'var(--neon-orange)'; gauge2Text = 'KURANG (MISSED)';
        } else {
            gauge2Border = '2px solid var(--neon-red)'; gauge2Shadow = '0 0 16px rgba(255, 45, 85, 0.6)';
            gauge2ValColor = 'var(--neon-red)'; gauge2BarColor = 'var(--neon-red)'; gauge2Text = 'RUSAK (ARITMIA)';
        }
    }

    const checkPulses = state.checkCoilPulseCount || 3, checkVerdict = state.checkCoilVerdict || "READY (SIAP)";
    const handleFullReset = () => { sendAction('resetCounters'); sendAction('resetLeakCounter'); };

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
                        <div style="font-size: 1.85rem; font-weight: 900; line-height: 1; font-variant-numeric: tabular-nums; color: ${gauge1ValColor}">
                            ${isStandby ? '--' : sparkmA.toFixed(1)} <span style="font-size: 0.85rem; font-weight: 600; color: var(--text-muted);">mA</span>
                        </div>
                        <div style="font-size: 0.74rem; font-weight: 800; white-space: nowrap; color: ${gauge1ValColor}">
                            ${gauge1Text}
                        </div>
                    </div>
                    <div style="width: 100%; height: 6px; background: rgba(255,255,255,0.08); border-radius: 3px; overflow: hidden; margin-top: 4px;">
                        <div style="width: ${gauge1BarWidth}%; height: 100%; background: ${gauge1BarColor}; transition: width 0.2s ease;"></div>
                    </div>
                </div>

                <!-- GAUGE 2: KETERATURAN DETAK IGT/IGF -->
                <div style="background: rgba(0,0,0,0.35); border: ${gauge2Border}; border-radius: 6px; padding: 10px 14px; box-shadow: ${gauge2Shadow}; min-height: 98px; height: 98px; display: flex; flex-direction: column; justify-content: space-between; box-sizing: border-box;">
                    <div style="display: flex; justify-content: space-between; align-items: center; height: 16px;">
                        <span style="font-size: 0.75rem; font-weight: 700; color: var(--neon-purple);">🎯 GAUGE 2: KETERATURAN DETAK</span>
                        <span style="font-size: 0.7rem; color: var(--text-muted);">Sinkron: 100%</span>
                    </div>
                    <div style="display: flex; align-items: baseline; justify-content: space-between; margin-top: 2px;">
                        <div style="font-size: 1.85rem; font-weight: 900; line-height: 1; font-variant-numeric: tabular-nums; color: ${gauge2ValColor}">
                            ${isStandby ? '--' : cadenceRate.toFixed(1)} <span style="font-size: 0.85rem; font-weight: 600; color: var(--text-muted);">%</span>
                        </div>
                        <div style="font-size: 0.74rem; font-weight: 800; white-space: nowrap; color: ${gauge2ValColor}">
                            ${gauge2Text}
                        </div>
                    </div>
                    <div style="width: 100%; height: 6px; background: rgba(255,255,255,0.08); border-radius: 3px; overflow: hidden; margin-top: 4px;">
                        <div style="width: ${gauge2BarWidth}%; height: 100%; background: ${gauge2BarColor}; transition: width 0.2s ease;"></div>
                    </div>
                </div>
            </div>

            <!-- 6 BOLD GLOWING COMPACT METRIC CARDS -->
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(110px, 1fr)); gap: 6px; margin-top: 8px;">
                <!-- Card 1: TOTAL DETAK -->
                <div style="background: rgba(0, 212, 255, 0.05); border: 2px solid rgba(0, 212, 255, 0.5); border-radius: 6px; padding: 6px 8px; height: 88px; box-sizing: border-box; display: flex; flex-direction: column; justify-content: space-between; align-items: center; text-align: center;">
                    <div style="font-size: 0.65rem; color: var(--text-muted); font-weight: 700; width: 100%; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">TOTAL DETAK</div>
                    <div style="font-size: 1.45rem; font-weight: 900; font-variant-numeric: tabular-nums; line-height: 1; color: var(--neon-cyan);">${fired}</div>
                    <div style="font-size: 0.62rem; color: var(--neon-cyan); font-weight: 700; width: 100%; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">Terpicu (IGT)</div>
                </div>

                <!-- Card 2: RESPON DETAK -->
                <div style="background: rgba(0, 255, 102, 0.05); border: 2px solid var(--neon-green); border-radius: 6px; padding: 6px 8px; height: 88px; box-sizing: border-box; display: flex; flex-direction: column; justify-content: space-between; align-items: center; text-align: center;">
                    <div style="font-size: 0.65rem; color: var(--text-muted); font-weight: 700; width: 100%; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">RESPON DETAK</div>
                    <div style="font-size: 1.45rem; font-weight: 900; font-variant-numeric: tabular-nums; line-height: 1; color: var(--neon-green);">${confirmed}</div>
                    <div style="font-size: 0.62rem; color: var(--neon-green); font-weight: 700; width: 100%; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${cadenceRate.toFixed(0)}% Konfirmasi</div>
                </div>

                <!-- Card 3: DETAK HILANG -->
                <div style="background: ${missed > 0 ? 'rgba(255, 45, 85, 0.12)' : 'rgba(255, 45, 85, 0.03)'}; border: 2px solid ${missed > 0 ? 'var(--neon-red)' : 'rgba(255, 45, 85, 0.4)'}; border-radius: 6px; padding: 6px 8px; height: 88px; box-sizing: border-box; display: flex; flex-direction: column; justify-content: space-between; align-items: center; text-align: center;">
                    <div style="font-size: 0.65rem; color: var(--text-muted); font-weight: 700; width: 100%; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">DETAK HILANG</div>
                    <div style="font-size: 1.45rem; font-weight: 900; font-variant-numeric: tabular-nums; line-height: 1; color: ${missed > 0 ? 'var(--neon-red)' : 'var(--text-muted)'};">${missed}</div>
                    <div style="font-size: 0.62rem; color: ${missed > 0 ? 'var(--neon-red)' : 'var(--text-muted)'}; font-weight: 700; width: 100%; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${arrhythmiaRate.toFixed(0)}% Missed</div>
                </div>

                <!-- Card 4: ARUS PRIMER PEAK -->
                <div style="background: rgba(0, 212, 255, 0.06); border: 2px solid var(--neon-cyan); border-radius: 6px; padding: 6px 8px; height: 88px; box-sizing: border-box; display: flex; flex-direction: column; justify-content: space-between; align-items: center; text-align: center;">
                    <div style="font-size: 0.65rem; color: var(--text-muted); font-weight: 700; width: 100%; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">ARUS PEAK</div>
                    <div style="font-size: 1.45rem; font-weight: 900; font-variant-numeric: tabular-nums; line-height: 1; color: var(--neon-cyan);">${isStandby ? '--' : currentA}<span style="font-size: 0.75rem; font-weight: 600; color: var(--text-muted);">A</span></div>
                    <div style="font-size: 0.62rem; color: var(--neon-cyan); font-weight: 700; width: 100%; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">Primer ACS712</div>
                </div>

                <!-- Card 5: SUHU KOIL -->
                <div style="background: rgba(255, 149, 0, 0.05); border: 2px solid ${parseFloat(tempCoil) >= 75 ? 'var(--neon-red)' : 'rgba(255, 149, 0, 0.6)'}; border-radius: 6px; padding: 6px 8px; height: 88px; box-sizing: border-box; display: flex; flex-direction: column; justify-content: space-between; align-items: center; text-align: center;">
                    <div style="font-size: 0.65rem; color: var(--text-muted); font-weight: 700; width: 100%; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">SUHU KOIL</div>
                    <div style="font-size: 1.45rem; font-weight: 900; font-variant-numeric: tabular-nums; line-height: 1; color: ${parseFloat(tempCoil) >= 75 ? 'var(--neon-red)' : 'var(--neon-orange)'};">${tempCoil}<span style="font-size: 0.75rem; font-weight: 600; color: var(--text-muted);">°C</span></div>
                    <div style="font-size: 0.62rem; color: var(--neon-orange); font-weight: 700; width: 100%; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">Probe DS18B20</div>
                </div>

                <!-- Card 6: SUHU IGBT -->
                <div style="background: rgba(189, 0, 255, 0.05); border: 2px solid ${parseFloat(tempDriver) >= 80 ? 'var(--neon-red)' : 'rgba(189, 0, 255, 0.6)'}; border-radius: 6px; padding: 6px 8px; height: 88px; box-sizing: border-box; display: flex; flex-direction: column; justify-content: space-between; align-items: center; text-align: center;">
                    <div style="font-size: 0.65rem; color: var(--text-muted); font-weight: 700; width: 100%; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">SUHU IGBT</div>
                    <div style="font-size: 1.45rem; font-weight: 900; font-variant-numeric: tabular-nums; line-height: 1; color: ${parseFloat(tempDriver) >= 80 ? 'var(--neon-red)' : 'var(--neon-purple)'};">${tempDriver}<span style="font-size: 0.75rem; font-weight: 600; color: var(--text-muted);">°C</span></div>
                    <div style="font-size: 0.62rem; color: var(--neon-purple); font-weight: 700; width: 100%; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">Driver Heatsink</div>
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

            <!-- DUAL ROW: KEBOCORAN BODI (LEFT 50%) & PRE-FLIGHT CHECK COIL (RIGHT 50%) -->
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 8px; margin-top: 8px;">
                <!-- LEFT 50%: KEBOCORAN BODI (PIN 36) -->
                <div style="background: rgba(0,0,0,0.3); border: 2px solid ${leakBadgeColor}; border-radius: 6px; padding: 8px 12px; display: flex; flex-direction: column; justify-content: space-between; min-height: 76px; box-sizing: border-box;">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <span style="font-size: 0.74rem; font-weight: 800; color: ${leakBadgeColor};">🛡️ KEBOCORAN BODI (PIN 36):</span>
                        <span class="status-badge" style="border-color: ${leakBadgeColor}; color: ${leakBadgeColor}; font-weight: 800; font-size: 0.65rem;">${leakStatusText}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 4px; font-size: 0.74rem; font-variant-numeric: tabular-nums;">
                        <span>Loncatan: <strong style="color: ${leakCount > 0 ? 'var(--neon-orange)' : 'var(--neon-green)'}; font-size: 0.95rem;">${leakCount} Arcs</strong></span>
                        <span>Frekuensi: <strong style="color: ${leakRate > 5 ? 'var(--neon-red)' : 'var(--neon-cyan)'}; font-size: 0.95rem;">${leakRate}/dtk</strong></span>
                    </div>
                </div>

                <!-- RIGHT 50%: PRE-FLIGHT CHECK COIL (WITH LOCK INTERLOCK) -->
                <div style="background: rgba(0,0,0,0.3); border: 2px solid ${isLocked ? 'rgba(255, 149, 0, 0.4)' : 'rgba(255, 230, 0, 0.5)'}; border-radius: 6px; padding: 8px 12px; display: flex; flex-direction: column; justify-content: space-between; min-height: 76px; box-sizing: border-box;">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <div style="display: flex; gap: 4px; align-items: center;">
                            <span style="font-size: 0.74rem; font-weight: 800; color: ${isLocked ? 'var(--neon-orange)' : 'var(--neon-yellow)'};">⚡ PRE-FLIGHT:</span>
                            <button class="btn" style="padding: 1px 5px; font-size: 0.65rem; font-weight: 800; border-color: ${isLocked ? 'var(--neon-orange)' : 'var(--neon-green)'}; background: ${isLocked ? 'rgba(255, 149, 0, 0.15)' : 'rgba(0, 255, 102, 0.15)'}; color: ${isLocked ? 'var(--neon-orange)' : 'var(--neon-green)'};" onClick=${onToggleLock} title="Klik untuk Buka/Kunci Pengaman Utama">
                                ${isLocked ? '🔒 KUNCI' : '🔓 BUKA'}
                            </button>
                        </div>
                        <div style="display: flex; gap: 3px;">
                            ${[1, 2, 3, 5, 10].map(p => html`
                                <button class="btn ${checkPulses === p ? 'btn-active' : ''}" style="padding: 1px 5px; font-size: 0.65rem; font-weight: 800; border-color: ${checkPulses === p ? 'var(--neon-yellow)' : 'var(--border-sharp)'}; background: ${checkPulses === p ? 'rgba(255, 230, 0, 0.25)' : 'transparent'}; color: ${checkPulses === p ? 'var(--neon-yellow)' : 'var(--text-muted)'};" onClick=${() => sendAction('setCheckCoilPulses', p)} disabled=${!state.connected}>${p}x</button>
                            `)}
                        </div>
                    </div>
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 4px; gap: 6px;">
                        <button class="btn" style="padding: 4px 10px; font-size: 0.72rem; font-weight: 900; background: ${isLocked ? 'rgba(255,255,255,0.06)' : '#FFE600'}; color: ${isLocked ? 'var(--text-muted)' : '#000'}; border-color: ${isLocked ? 'var(--border-sharp)' : '#FFE600'}; cursor: ${isLocked ? 'not-allowed' : 'pointer'};" 
                            onClick=${() => { if (!isLocked) sendAction('runCheckCoil'); }} 
                            disabled=${!state.connected || state.isRunning || isLocked}>
                            ${isLocked ? '🔒 TERKUNCI' : `⚡ RUN (${checkPulses}x)`}
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
