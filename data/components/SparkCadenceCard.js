import { html } from '../preact.js';

export function SparkCadenceCard({ state, sendAction, title = "IGNITION & INSULATION ANALYZER", is4Pin = false, isLocked = true, onToggleLock }) {
    const fired = state.coilFiredCount || 0, confirmed = state.coilSparkReturnCount || state.coilIgfCount || 0;
    const missed = state.coilMissedCount || Math.max(0, fired - confirmed), sparkmA = state.coilSparkCurrentmA || 0.0;
    const currentA = state.coilPeakCurrentA ? state.coilPeakCurrentA.toFixed(1) : "0.0";
    const realA = state.realCurrentA !== undefined ? state.realCurrentA.toFixed(2) : "0.00", vBat = state.supplyVoltage !== undefined ? state.supplyVoltage.toFixed(2) : "12.60";
    const tempCoil = state.tempCoilC !== undefined ? state.tempCoilC.toFixed(1) : "28.5", tempDriver = state.tempDriverC !== undefined ? state.tempDriverC.toFixed(1) : "29.0";
    const isStandby = (fired === 0 && !state.isRunning);
    const cadenceRate = fired > 0 ? Math.min(100, Math.max(0, (confirmed / fired) * 100)) : 0;
    const arrhythmiaRate = fired > 0 ? (100 - cadenceRate) : 0, energyFactor = sparkmA > 0 ? Math.min(1.0, Math.max(0.0, sparkmA / 50.0)) : 1.0;

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

    // Gauge 1: Kualitas Api (mA) - Murni 0% saat standby tanpa warna merah
    let gauge1Border = '2px solid rgba(0, 212, 255, 0.25)', gauge1Shadow = 'none';
    let gauge1ValColor = 'var(--text-muted)', gauge1BarColor = 'transparent', gauge1BarWidth = 0, gauge1Text = 'STANDBY';
    if (!isStandby) {
        gauge1BarWidth = Math.min(100, (sparkmA / 60) * 100);
        if (sparkmA >= 45.0) {
            gauge1Border = '2px solid var(--neon-green)'; gauge1Shadow = '0 0 12px rgba(0, 255, 102, 0.3)';
            gauge1ValColor = 'var(--neon-green)'; gauge1BarColor = 'var(--neon-green)'; gauge1Text = 'API BIRU TEBAL';
        } else if (sparkmA >= 30.0) {
            gauge1Border = '2px solid #A6FF00'; gauge1Shadow = '0 0 10px rgba(166, 255, 0, 0.25)';
            gauge1ValColor = '#A6FF00'; gauge1BarColor = '#A6FF00'; gauge1Text = 'API STANDAR';
        } else if (sparkmA >= 15.0) {
            gauge1Border = '2px solid var(--neon-orange)'; gauge1Shadow = '0 0 12px rgba(255, 149, 0, 0.35)';
            gauge1ValColor = 'var(--neon-orange)'; gauge1BarColor = 'var(--neon-orange)'; gauge1Text = 'API KECIL';
        } else {
            gauge1Border = '2px solid var(--neon-red)'; gauge1Shadow = '0 0 16px rgba(255, 45, 85, 0.6)';
            gauge1ValColor = 'var(--neon-red)'; gauge1BarColor = 'var(--neon-red)'; gauge1Text = 'API LILIN / MATI';
        }
    }

    // Gauge 2: Keteraturan Detak (%) - Murni 0% saat standby tanpa warna merah
    let gauge2Border = '2px solid rgba(189, 0, 255, 0.25)', gauge2Shadow = 'none';
    let gauge2ValColor = 'var(--text-muted)', gauge2BarColor = 'transparent', gauge2BarWidth = 0, gauge2Text = 'STANDBY';
    if (!isStandby) {
        gauge2BarWidth = cadenceRate;
        if (cadenceRate >= 95.0) {
            gauge2Border = '2px solid var(--neon-green)'; gauge2Shadow = '0 0 12px rgba(0, 255, 102, 0.3)';
            gauge2ValColor = 'var(--neon-green)'; gauge2BarColor = 'var(--neon-green)'; gauge2Text = 'IRAMA SINKRON';
        } else if (cadenceRate >= 80.0) {
            gauge2Border = '2px solid var(--neon-orange)'; gauge2Shadow = '0 0 12px rgba(255, 149, 0, 0.35)';
            gauge2ValColor = 'var(--neon-orange)'; gauge2BarColor = 'var(--neon-orange)'; gauge2Text = 'DETAK LONCAT';
        } else {
            gauge2Border = '2px solid var(--neon-red)'; gauge2Shadow = '0 0 16px rgba(255, 45, 85, 0.6)';
            gauge2ValColor = 'var(--neon-red)'; gauge2BarColor = 'var(--neon-red)'; gauge2Text = 'ARITMIA / MISSED';
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

            <!-- 4 BOLD GLOWING CENTERED METRIC CARDS -->
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 8px; margin-top: 8px;">
                <!-- Card 1: TOTAL DETAK -->
                <div style="background: rgba(0, 212, 255, 0.05); border: 2px solid rgba(0, 212, 255, 0.5); border-radius: 6px; padding: 8px 10px; height: 104px; box-sizing: border-box; display: flex; flex-direction: column; justify-content: space-between; align-items: center; text-align: center; box-shadow: 0 0 10px rgba(0, 212, 255, 0.15);">
                    <div style="font-size: 0.68rem; color: var(--text-muted); font-weight: 700; width: 100%; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">TOTAL DETAK (IGT)</div>
                    <div style="font-size: 1.55rem; font-weight: 900; font-variant-numeric: tabular-nums; line-height: 1; color: var(--neon-cyan);">${fired}</div>
                    <div style="font-size: 0.65rem; color: var(--neon-cyan); font-weight: 700; width: 100%; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">Detak Terpicu</div>
                </div>

                <!-- Card 2: RESPON DETAK -->
                <div style="background: rgba(0, 255, 102, 0.05); border: 2px solid var(--neon-green); border-radius: 6px; padding: 8px 10px; height: 104px; box-sizing: border-box; display: flex; flex-direction: column; justify-content: space-between; align-items: center; text-align: center; box-shadow: 0 0 12px rgba(0, 255, 102, 0.2);">
                    <div style="font-size: 0.68rem; color: var(--text-muted); font-weight: 700; width: 100%; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">RESPON (CONFIRMED)</div>
                    <div style="font-size: 1.55rem; font-weight: 900; font-variant-numeric: tabular-nums; line-height: 1; color: var(--neon-green);">${confirmed}</div>
                    <div style="font-size: 0.65rem; color: var(--neon-green); font-weight: 700; width: 100%; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${cadenceRate.toFixed(0)}% Terkonfirmasi</div>
                </div>

                <!-- Card 3: DETAK HILANG -->
                <div style="background: ${missed > 0 ? 'rgba(255, 45, 85, 0.12)' : 'rgba(255, 45, 85, 0.03)'}; border: 2px solid ${missed > 0 ? 'var(--neon-red)' : 'rgba(255, 45, 85, 0.4)'}; border-radius: 6px; padding: 8px 10px; height: 104px; box-sizing: border-box; display: flex; flex-direction: column; justify-content: space-between; align-items: center; text-align: center; box-shadow: ${missed > 0 ? '0 0 14px rgba(255, 45, 85, 0.35)' : 'none'};">
                    <div style="font-size: 0.68rem; color: var(--text-muted); font-weight: 700; width: 100%; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">DETAK HILANG (MISSED)</div>
                    <div style="font-size: 1.55rem; font-weight: 900; font-variant-numeric: tabular-nums; line-height: 1; color: ${missed > 0 ? 'var(--neon-red)' : 'var(--text-muted)'};">${missed}</div>
                    <div style="font-size: 0.65rem; color: ${missed > 0 ? 'var(--neon-red)' : 'var(--text-muted)'}; font-weight: 700; width: 100%; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${arrhythmiaRate.toFixed(0)}% Hilang Api</div>
                </div>

                <!-- Card 4: ARUS PRIMER PEAK -->
                <div style="background: rgba(0, 212, 255, 0.06); border: 2px solid var(--neon-cyan, #00d4ff); border-radius: 6px; padding: 8px 10px; height: 104px; box-sizing: border-box; display: flex; flex-direction: column; justify-content: space-between; align-items: center; text-align: center; box-shadow: 0 0 12px rgba(0, 212, 255, 0.25);">
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
