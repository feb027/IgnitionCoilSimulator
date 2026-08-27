import { html, useState, useEffect, useRef } from '../preact.js';

export function SparkCadenceCard({ state, sendAction, title = "TRI-DIMENSION IGNITION & LEAK ANALYZER" }) {
    const historyRef = useRef([]);
    const [history, setHistory] = useState([]);
    const [showGraph, setShowGraph] = useState(false);

    const fired = state.coilFiredCount || 0;
    const confirmed = state.coilSparkReturnCount || state.coilIgfCount || 0;
    const missed = state.coilMissedCount || Math.max(0, fired - confirmed);
    const sparkmA = state.coilSparkCurrentmA || 0.0;
    const currentA = state.coilPeakCurrentA ? state.coilPeakCurrentA.toFixed(1) : "0.0";
    const rpm = state.currentRpm || state.rpm || 800;

    const cadenceRate = fired > 0 ? Math.min(100, Math.max(0, (confirmed / fired) * 100)) : 100;
    const energyFactor = sparkmA > 0 ? Math.min(1.0, Math.max(0.0, sparkmA / 50.0)) : 1.0;

    const isLeaking = state.coilLeakDetected;
    const leakCount = state.coilLeakCount || 0;
    const leakRate = state.coilLeakRate || 0;
    const leakSeverity = state.coilLeakSeverity || "";
    const currentSens = state.coilLeakSensitivity || 3;
    const customThreshold = state.coilLeakThreshold || 3;
    const customDebounce = state.coilLeakDebounceMs !== undefined ? Number(state.coilLeakDebounceMs).toFixed(1) : "1.0";

    let insulationFactor = 1.0;
    if (leakSeverity.includes("SEVERE") || leakRate > 25) {
        insulationFactor = 0.20;
    } else if (leakSeverity.includes("MEDIUM") || leakRate > 5) {
        insulationFactor = 0.50;
    } else if (isLeaking || leakCount > 0) {
        insulationFactor = 0.75;
    }

    const totalHealthScore = fired > 0 ? (cadenceRate * energyFactor * insulationFactor) : 100;

    let healthColor = 'var(--neon-green)';
    let healthBadge = '🟢 100% PRIMA';
    let healthDesc = 'Koil Sehat & Detak 100% Sinkron';

    if (fired === 0) {
        healthColor = 'var(--text-muted)';
        healthBadge = 'STANDBY';
        healthDesc = 'Tekan Trigger / Run untuk Menguji';
    } else if (parseFloat(currentA) > 11.5) {
        healthColor = 'var(--neon-red)';
        healthBadge = '❌ OVERCURRENT (>11A)';
        healthDesc = 'Korsleting Primer / IGBT Rusak';
    } else if (leakSeverity.includes("SEVERE") || leakRate > 25) {
        healthColor = 'var(--neon-red)';
        healthBadge = '🚨 20% BOCOR PARAH';
        healthDesc = 'Isolasi Koil Jebol / Arcing Bodi Ekstrem!';
    } else if (leakSeverity.includes("MEDIUM") || leakRate > 5) {
        healthColor = 'var(--neon-orange)';
        healthBadge = '⚠️ 50% ISOLASI BOCOR';
        healthDesc = 'Terjadi Arcing / Rambatan Tegangan Tinggi';
    } else if (isLeaking || leakCount > 0) {
        healthColor = '#FFE600';
        healthBadge = '⚡ 75% MIKRO LEAK';
        healthDesc = 'Retak Rambut / Kebocoran Bodi Terdeteksi';
    } else if (confirmed > 0 && cadenceRate >= 95 && (sparkmA >= 30 || sparkmA === 0)) {
        healthColor = 'var(--neon-green)';
        healthBadge = '🟢 100% PRIMA';
        healthDesc = 'Api Normal & Detak 100% Sinkron';
    } else if (confirmed > 0 && cadenceRate >= 80) {
        healthColor = '#A6FF00';
        healthBadge = '🟡 75% BAIK';
        healthDesc = 'Layak Pakai, Irama Teratur';
    } else if (confirmed > 0 && cadenceRate >= 50) {
        healthColor = 'var(--neon-orange)';
        healthBadge = '🟠 50% DROP BEBAN';
        healthDesc = '⚠️ Aritmia / Detak Hilang Sebagian!';
    } else if (confirmed > 0) {
        healthColor = 'var(--neon-red)';
        healthBadge = '🔴 25% SEKARAT';
        healthDesc = 'Banyak Detak Hilang (>50% Misfire)';
    } else {
        healthColor = 'var(--neon-red)';
        healthBadge = '❌ 0% MATI / MISFIRE';
        healthDesc = 'Misfire Total (0 Detak Terkonfirmasi)';
    }

    useEffect(() => {
        if (!showGraph || (!state.isRunning && fired === 0)) return;
        const now = Date.now();
        const buf = historyRef.current;
        buf.push({ t: now, rpm: rpm, mA: sparkmA, cadence: cadenceRate, health: totalHealthScore });
        if (buf.length > 40) buf.shift();
        setHistory([...buf]);
    }, [fired, sparkmA, rpm, state.isRunning, showGraph]);

    const sensButtons = [
        { id: 1, name: "1:ULTRA" }, { id: 2, name: "2:TINGGI" },
        { id: 3, name: "3:STANDAR" }, { id: 4, name: "4:KEBAL" }, { id: 5, name: "5:CUSTOM" }
    ];

    const chartW = 380;
    const chartH = 90;
    let sparkPts = "", cadencePts = "";
    if (showGraph && history.length > 1) {
        history.forEach((pt, i) => {
            const x = (i / (history.length - 1)) * chartW;
            const yS = chartH - Math.min(chartH, Math.max(0, (pt.mA / 80.0) * chartH));
            const yC = chartH - Math.min(chartH, Math.max(0, (pt.cadence / 100.0) * chartH));
            sparkPts += `${x.toFixed(1)},${yS.toFixed(1)} `;
            cadencePts += `${x.toFixed(1)},${yC.toFixed(1)} `;
        });
    }

    return html`
        <div class="panel" style="margin-top: 10px; grid-column: 1 / -1; border-color: ${healthColor};">
            <!-- HEADER -->
            <div class="panel-header" style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border-sharp); padding-bottom: 6px; flex-wrap: wrap; gap: 6px; margin-bottom: 8px;">
                <span style="font-weight: 700; letter-spacing: 0.05em; color: ${healthColor}; font-size: 0.8rem;">
                    ⚡ ${title}
                </span>
                <div style="display: flex; gap: 6px; align-items: center;">
                    <button class="btn" style="padding: 2px 8px; font-size: 0.7rem; font-weight: 700;" onClick=${() => { historyRef.current = []; setHistory([]); sendAction('resetCounters'); }} disabled=${!state.connected}>🔄 RESET</button>
                    <span class="status-badge" style="border-color: ${healthColor}; color: ${healthColor}; font-size: 0.72rem; padding: 2px 6px;">${healthBadge}</span>
                </div>
            </div>

            <!-- UNIFIED 4-PILLAR DIAGNOSTIC GRID (ALL IN ONE VIEW) -->
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(135px, 1fr)); gap: 8px;">
                <!-- PILLAR 1: TOTAL HEALTH -->
                <div style="background: rgba(0,0,0,0.35); border: 1px solid var(--border-sharp); border-radius: 4px; padding: 8px; text-align: center;">
                    <div style="font-size: 0.68rem; color: var(--text-muted); font-weight: bold;">SKOR KELAYAKAN</div>
                    <div style="font-size: 1.6rem; font-weight: 800; color: ${healthColor}; margin: 2px 0;">${totalHealthScore.toFixed(0)}%</div>
                    <div style="font-size: 0.62rem; color: var(--text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${healthDesc}</div>
                </div>

                <!-- PILLAR 2: KUALITAS API (mA) -->
                <div style="background: rgba(0,0,0,0.35); border: 1px solid var(--border-sharp); border-radius: 4px; padding: 8px; text-align: center;">
                    <div style="font-size: 0.68rem; color: var(--neon-cyan); font-weight: bold;">KUALITAS API</div>
                    <div style="font-size: 1.6rem; font-weight: 800; color: ${sparkmA >= 45 ? 'var(--neon-green)' : (sparkmA >= 20 ? 'var(--neon-orange)' : 'var(--neon-red)')}; margin: 2px 0;">
                        ${sparkmA.toFixed(1)} <span style="font-size: 0.75rem; color: var(--text-muted);">mA</span>
                    </div>
                    <div style="width: 100%; height: 4px; background: rgba(255,255,255,0.08); border-radius: 2px; overflow: hidden; margin-top: 2px;">
                        <div style="width: ${Math.min(100, (sparkmA / 80.0) * 100)}%; height: 100%; background: ${sparkmA >= 45 ? 'var(--neon-green)' : (sparkmA >= 20 ? 'var(--neon-orange)' : 'var(--neon-red)')};"></div>
                    </div>
                </div>

                <!-- PILLAR 3: IRAMA / SINKRONISASI -->
                <div style="background: rgba(0,0,0,0.35); border: 1px solid var(--border-sharp); border-radius: 4px; padding: 8px; text-align: center;">
                    <div style="font-size: 0.68rem; color: var(--neon-purple); font-weight: bold;">IRAMA / CADENCE</div>
                    <div style="font-size: 1.6rem; font-weight: 800; color: ${cadenceRate >= 95 ? 'var(--neon-green)' : (cadenceRate >= 80 ? 'var(--neon-orange)' : 'var(--neon-red)')}; margin: 2px 0;">
                        ${cadenceRate.toFixed(0)}%
                    </div>
                    <div style="font-size: 0.62rem; color: ${missed > 0 ? 'var(--neon-red)' : 'var(--neon-green)'};">${missed === 0 ? 'Detak Sinkron' : (missed + ' Miss / Drop')}</div>
                </div>

                <!-- PILLAR 4: ISOLASI BODI (PIN 36) -->
                <div style="background: ${isLeaking ? 'rgba(255, 45, 85, 0.15)' : 'rgba(0,0,0,0.35)'}; border: 1px solid ${isLeaking ? 'var(--neon-red)' : (leakCount > 0 ? 'var(--neon-yellow)' : 'var(--border-sharp)')}; border-radius: 4px; padding: 8px; text-align: center;">
                    <div style="font-size: 0.68rem; color: ${isLeaking ? 'var(--neon-red)' : 'var(--neon-yellow)'}; font-weight: bold;">ISOLASI BODI (P36)</div>
                    <div style="font-size: 1.4rem; font-weight: 800; color: ${leakCount > 0 ? 'var(--neon-red)' : 'var(--neon-green)'}; margin: 2px 0;">
                        ${leakCount} <span style="font-size: 0.7rem; font-weight: normal; color: var(--text-muted);">Arcs (${leakRate}/s)</span>
                    </div>
                    <div style="font-size: 0.62rem; color: ${isLeaking ? 'var(--neon-red)' : (leakCount > 0 ? 'var(--neon-yellow)' : 'var(--neon-green)')}; font-weight: bold;">
                        ${isLeaking ? '🚨 BOCOR AKTIF' : (leakCount > 0 ? '⚡ PERNAH BOCOR' : '🟢 ISOLASI UTUH')}
                    </div>
                </div>
            </div>

            <!-- PROBE SENSITIVITY FILTER & ACTION ROW -->
            <div style="margin-top: 8px; padding: 6px 8px; background: rgba(0,0,0,0.25); border: 1px solid var(--border-sharp); border-radius: 4px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; flex-wrap: wrap; gap: 4px;">
                    <span style="font-size: 0.68rem; font-weight: bold; color: var(--text-muted);">🎯 KEPEKAAN PROBE LEAK (PIN 36):</span>
                    <button class="btn" style="padding: 1px 6px; font-size: 0.65rem;" onClick=${() => sendAction('resetLeakCounter')} disabled=${!state.connected}>RESET LEAK</button>
                </div>
                <div style="display: grid; grid-template-columns: repeat(5, 1fr); gap: 4px;">
                    ${sensButtons.map(s => html`
                        <button
                            class="btn ${currentSens === s.id ? 'btn-active' : ''}"
                            style="padding: 4px 2px; font-size: 0.68rem; font-weight: bold; text-align: center; border-color: ${currentSens === s.id ? 'var(--neon-green)' : 'var(--border-sharp)'}; background: ${currentSens === s.id ? 'rgba(0, 255, 102, 0.15)' : 'transparent'}; color: ${currentSens === s.id ? 'var(--neon-green)' : 'var(--text-muted)'};"
                            onClick=${() => sendAction('setLeakSensitivity', s.id)}
                            disabled=${!state.connected}
                        >
                            ${s.name}
                        </button>
                    `)}
                </div>

                ${currentSens === 5 ? html`
                    <div style="margin-top: 6px; padding-top: 6px; border-top: 1px dashed var(--border-sharp); display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                        <div>
                            <div style="display: flex; justify-content: space-between; font-size: 0.65rem; color: var(--text-muted);">
                                <span>AMBANG:</span><strong style="color: var(--neon-yellow);">${customThreshold} Arcs</strong>
                            </div>
                            <input type="range" min="1" max="10" step="1" value=${customThreshold} style="width: 100%; height: 10px; accent-color: var(--neon-yellow);" onInput=${(e) => sendAction('setLeakThreshold', parseInt(e.target.value))} disabled=${!state.connected} />
                        </div>
                        <div>
                            <div style="display: flex; justify-content: space-between; font-size: 0.65rem; color: var(--text-muted);">
                                <span>FILTER:</span><strong style="color: var(--neon-cyan);">${customDebounce} ms</strong>
                            </div>
                            <input type="range" min="0.1" max="3.0" step="0.1" value=${customDebounce} style="width: 100%; height: 10px; accent-color: var(--neon-cyan);" onInput=${(e) => sendAction('setLeakDebounce', parseFloat(e.target.value))} disabled=${!state.connected} />
                        </div>
                    </div>
                ` : ''}
            </div>

            <!-- COMPACT TELEMETRY FOOTER -->
            <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; margin-top: 8px; text-align: center; font-size: 0.68rem; color: var(--text-muted);">
                <div style="background: rgba(255,255,255,0.02); border: 1px solid var(--border-sharp); border-radius: 3px; padding: 4px;">
                    <div>ARUS PRIMER</div>
                    <strong style="color: ${parseFloat(currentA) >= 5 && parseFloat(currentA) <= 10.5 ? 'var(--neon-green)' : 'var(--neon-orange)'}; font-size: 0.85rem;">${currentA}A</strong>
                </div>
                <div style="background: rgba(255,255,255,0.02); border: 1px solid var(--border-sharp); border-radius: 3px; padding: 4px;">
                    <div>PERINTAH IGT</div>
                    <strong style="color: var(--text-primary); font-size: 0.85rem;">${fired}</strong>
                </div>
                <div style="background: rgba(255,255,255,0.02); border: 1px solid var(--border-sharp); border-radius: 3px; padding: 4px;">
                    <div>RESPON API</div>
                    <strong style="color: var(--neon-green); font-size: 0.85rem;">${confirmed}</strong>
                </div>
                <div style="background: rgba(255,255,255,0.02); border: 1px solid var(--border-sharp); border-radius: 3px; padding: 4px;">
                    <div>MISFIRE</div>
                    <strong style="color: ${missed > 0 ? 'var(--neon-red)' : 'var(--text-muted)'}; font-size: 0.85rem;">${missed}</strong>
                </div>
            </div>

            <!-- COLLAPSIBLE PERFORMANCE TREND GRAPH (SAVING CPU/GPU) -->
            <div style="margin-top: 8px; border-top: 1px dashed var(--border-sharp); padding-top: 6px;">
                <div style="display: flex; justify-content: space-between; align-items: center; cursor: pointer;" onClick=${() => setShowGraph(!showGraph)}>
                    <span style="font-size: 0.72rem; font-weight: bold; color: var(--neon-cyan);">
                        📈 GRAFIK TREN PERFORMA vs RPM ${showGraph ? '▴ (SEMBUNYIKAN)' : '▾ (TAMPILKAN)'}
                    </span>
                    <span style="font-size: 0.65rem; color: var(--text-muted);">${showGraph ? 'Aktif' : 'Hemat Daya'}</span>
                </div>

                ${showGraph ? html`
                    <div style="margin-top: 6px; background: rgba(10,12,16,0.9); border: 1px solid var(--border-sharp); border-radius: 4px; padding: 8px;">
                        <div style="display: flex; justify-content: space-between; font-size: 0.62rem; margin-bottom: 4px;">
                            <span style="color: var(--neon-cyan);">■ Arus Api (0-80mA)</span>
                            <span style="color: var(--neon-purple);">■ Irama Detak (0-100%)</span>
                            <span>RPM: <strong style="color: var(--neon-cyan);">${rpm}</strong></span>
                        </div>
                        <div style="width: 100%; height: 90px; position: relative;">
                            <svg viewBox="0 0 ${chartW} ${chartH}" preserveAspectRatio="none" style="width: 100%; height: 100%;">
                                ${sparkPts ? html`<polyline fill="none" stroke="var(--neon-cyan)" stroke-width="2" points="${sparkPts}" stroke-linecap="round" stroke-linejoin="round" />` : ''}
                                ${cadencePts ? html`<polyline fill="none" stroke="var(--neon-purple)" stroke-width="2" points="${cadencePts}" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="3,2" />` : ''}
                            </svg>
                        </div>
                    </div>
                ` : ''}
            </div>
        </div>
    `;
}
