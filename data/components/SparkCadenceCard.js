import { html, useState, useEffect, useRef } from '../preact.js';

export function SparkCadenceCard({ state, sendAction, title = "TRI-DIMENSION IGNITION ANALYZER", is4Pin = false }) {
    const historyRef = useRef([]);
    const [history, setHistory] = useState([]);

    const fired = state.coilFiredCount || 0;
    const confirmed = state.coilSparkReturnCount || state.coilIgfCount || 0;
    const missed = state.coilMissedCount || Math.max(0, fired - confirmed);
    const sparkmA = state.coilSparkCurrentmA || 0.0;
    const currentA = state.coilPeakCurrentA ? state.coilPeakCurrentA.toFixed(1) : "0.0";
    const rpm = state.currentRpm || state.rpm || 800;

    // 1. Cadence Consistency (% of pulses successfully fired)
    const cadenceRate = fired > 0 ? Math.min(100, Math.max(0, (confirmed / fired) * 100)) : 100;
    const arrhythmiaRate = 100 - cadenceRate;

    // 2. Energy Factor
    const energyFactor = sparkmA > 0 ? Math.min(1.0, Math.max(0.0, sparkmA / 50.0)) : 1.0;

    // 3. Body Insulation Integrity Factor (Pin 36 Leakage)
    const isLeaking = state.coilLeakDetected;
    const leakCount = state.coilLeakCount || 0;
    const leakRate = state.coilLeakRate || 0;
    const leakSeverity = state.coilLeakSeverity || "";

    let insulationFactor = 1.0;
    if (leakSeverity.includes("SEVERE") || leakRate > 25) {
        insulationFactor = 0.20;
    } else if (leakSeverity.includes("MEDIUM") || leakRate > 5) {
        insulationFactor = 0.50;
    } else if (isLeaking || leakCount > 0) {
        insulationFactor = 0.75;
    }

    // 4. Composite Total Health Score (%)
    const totalHealthScore = fired > 0 ? (cadenceRate * energyFactor * insulationFactor) : 100;

    // 5. Determine Health Classification
    let healthColor = 'var(--neon-green)';
    let healthBadge = '🟢 100% PRIMA';
    let healthDesc = 'Detak Sinkron & Bunga Api Normal';

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
        healthBadge = '⚡ 75% MIKRO LEAKAGE';
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

    // 6. Update Rolling History for Real-time Chart
    useEffect(() => {
        if (!state.isRunning && fired === 0) return;
        const now = Date.now();
        const buf = historyRef.current;
        buf.push({
            t: now,
            rpm: rpm,
            mA: sparkmA,
            cadence: cadenceRate,
            health: totalHealthScore
        });
        if (buf.length > 50) buf.shift();
        setHistory([...buf]);
    }, [fired, sparkmA, rpm, state.isRunning]);

    const chartW = 400;
    const chartH = 95;
    const ptsCount = history.length;
    
    let sparkPts = "";
    let cadencePts = "";
    
    if (ptsCount > 1) {
        history.forEach((pt, i) => {
            const x = (i / (ptsCount - 1)) * chartW;
            const ySpark = chartH - Math.min(chartH, Math.max(0, (pt.mA / 80.0) * chartH));
            const yCadence = chartH - Math.min(chartH, Math.max(0, (pt.cadence / 100.0) * chartH));
            sparkPts += `${x.toFixed(1)},${ySpark.toFixed(1)} `;
            cadencePts += `${x.toFixed(1)},${yCadence.toFixed(1)} `;
        });
    }

    return html`
        <div class="panel" style="margin-top: var(--space-md); grid-column: 1 / -1; border-color: ${healthColor};">
            <!-- HEADER -->
            <div class="panel-header" style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border-sharp); padding-bottom: 8px; flex-wrap: wrap; gap: 8px;">
                <span style="font-weight: 700; letter-spacing: 0.1em; color: ${healthColor};">
                    ⚡ ${title}
                </span>
                <div style="display: flex; gap: 8px; align-items: center;">
                    <button 
                        class="btn" 
                        style="padding: 4px 10px; font-size: 0.72rem; font-weight: 700; background: rgba(255,255,255,0.08); border: 1px solid var(--border-sharp); color: var(--text-primary); cursor: pointer;"
                        onClick=${() => { historyRef.current = []; setHistory([]); sendAction('resetCounters'); }}
                        disabled=${!state.connected}
                    >
                        🔄 RESET
                    </button>
                    <span class="status-badge" style="border-color: ${healthColor}; color: ${healthColor};">
                        ${healthBadge}
                    </span>
                </div>
            </div>

            <!-- DUAL INDEPENDENT GAUGES -->
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 14px; margin-top: var(--space-md);">
                
                <!-- GAUGE 1: KUALITAS / ENERGI API (mA) -->
                <div style="background: rgba(0,0,0,0.35); border: 1px solid var(--border-sharp); border-radius: 6px; padding: 14px;">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <span style="font-size: 0.75rem; font-weight: 700; color: var(--neon-cyan); letter-spacing: 0.05em;">
                            ⚡ GAUGE 1: KUALITAS API (mA)
                        </span>
                        <span style="font-size: 0.72rem; color: var(--text-muted);">Target: >45 mA</span>
                    </div>
                    
                    <div style="display: flex; align-items: baseline; justify-content: space-between; margin-top: 8px;">
                        <div style="font-size: 2rem; font-weight: 800; color: ${sparkmA >= 45 ? 'var(--neon-green)' : (sparkmA >= 30 ? '#A6FF00' : (sparkmA >= 15 ? 'var(--neon-orange)' : 'var(--neon-red)'))};">
                            ${sparkmA.toFixed(1)} <span style="font-size: 1rem; font-weight: 600; color: var(--text-muted);">mA</span>
                        </div>
                        <div style="font-size: 0.8rem; font-weight: 700; color: ${sparkmA >= 45 ? 'var(--neon-green)' : (sparkmA >= 15 ? 'var(--neon-orange)' : 'var(--neon-red)')};">
                            ${sparkmA >= 45 ? 'API BIRU TEBAL' : (sparkmA >= 30 ? 'API STANDAR' : (sparkmA >= 15 ? 'API KECIL / DROP' : 'API LILIN / MATI'))}
                        </div>
                    </div>

                    <div style="width: 100%; height: 8px; background: rgba(255,255,255,0.08); border-radius: 4px; overflow: hidden; margin-top: 8px; position: relative;">
                        <div style="width: ${Math.min(100, (sparkmA / 80.0) * 100)}%; height: 100%; background: ${sparkmA >= 45 ? 'var(--neon-green)' : (sparkmA >= 30 ? '#A6FF00' : (sparkmA >= 15 ? 'var(--neon-orange)' : 'var(--neon-red)'))}; transition: width 0.2s ease;"></div>
                    </div>
                    <div style="display: flex; justify-content: space-between; font-size: 0.65rem; color: var(--text-muted); margin-top: 4px;">
                        <span>0mA (Mati)</span>
                        <span>15mA (Drop)</span>
                        <span>45mA (Prima)</span>
                        <span>80mA</span>
                    </div>
                </div>

                <!-- GAUGE 2: KETERATURAN DETAK / ARITMIA (%) -->
                <div style="background: rgba(0,0,0,0.35); border: 1px solid var(--border-sharp); border-radius: 6px; padding: 14px;">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <span style="font-size: 0.75rem; font-weight: 700; color: var(--neon-purple); letter-spacing: 0.05em;">
                            ⏱️ GAUGE 2: KETERATURAN DETAK (IRAMA)
                        </span>
                        <span style="font-size: 0.72rem; color: var(--text-muted);">Target: 100%</span>
                    </div>

                    <div style="display: flex; align-items: baseline; justify-content: space-between; margin-top: 8px;">
                        <div style="font-size: 2rem; font-weight: 800; color: ${cadenceRate >= 95 ? 'var(--neon-green)' : (cadenceRate >= 80 ? 'var(--neon-orange)' : 'var(--neon-red)')};">
                            ${cadenceRate.toFixed(1)} <span style="font-size: 1rem; font-weight: 600; color: var(--text-muted);">%</span>
                        </div>
                        <div style="font-size: 0.8rem; font-weight: 700; color: ${missed === 0 ? 'var(--neon-green)' : 'var(--neon-red)'};">
                            ${missed === 0 ? 'IRAMA NORMAL' : (missed + ' DETAK HILANG (' + arrhythmiaRate.toFixed(1) + '% ARITMIA)')}
                        </div>
                    </div>

                    <div style="width: 100%; height: 8px; background: rgba(255,255,255,0.08); border-radius: 4px; overflow: hidden; margin-top: 8px;">
                        <div style="width: ${cadenceRate}%; height: 100%; background: ${cadenceRate >= 95 ? 'var(--neon-green)' : (cadenceRate >= 80 ? 'var(--neon-orange)' : 'var(--neon-red)')}; transition: width 0.2s ease;"></div>
                    </div>
                    <div style="display: flex; justify-content: space-between; font-size: 0.65rem; color: var(--text-muted); margin-top: 4px;">
                        <span>0% (Misfire Total)</span>
                        <span>75% (Aritmia)</span>
                        <span>100% (Sinkron)</span>
                    </div>
                </div>
            </div>

            <!-- COMPOSITE SCORE & TELEMETRY ROW (ALL METRICS INTACT) -->
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 10px; margin-top: 14px;">
                <div style="background: rgba(255,255,255,0.03); border: 1px solid var(--border-sharp); border-radius: 4px; padding: 10px; text-align: center;">
                    <div style="font-size: 0.7rem; color: var(--text-muted); text-transform: uppercase;">SKOR TOTAL KELAYAKAN</div>
                    <div style="font-size: 1.4rem; font-weight: 800; color: ${healthColor}; margin-top: 2px;">
                        ${totalHealthScore.toFixed(0)}%
                    </div>
                    <div style="font-size: 0.65rem; color: var(--text-muted); margin-top: 2px;">${healthDesc}</div>
                </div>

                <div style="background: rgba(255,255,255,0.03); border: 1px solid var(--border-sharp); border-radius: 4px; padding: 10px; text-align: center;">
                    <div style="font-size: 0.7rem; color: var(--text-muted); text-transform: uppercase;">ARUS PRIMER PEAK</div>
                    <div style="font-size: 1.4rem; font-weight: 800; color: ${parseFloat(currentA) >= 5.0 && parseFloat(currentA) <= 10.5 ? 'var(--neon-green)' : 'var(--neon-orange)'}; margin-top: 2px;">
                        ${currentA} A
                    </div>
                    <button 
                        class="btn" 
                        style="margin-top: 4px; width: 100%; padding: 4px 6px; font-size: 0.68rem; font-weight: 800; background: #FFE600; color: #000000; border: 1px solid #FFD700; cursor: pointer;"
                        onClick=${() => sendAction('probeCoil')}
                        disabled=${!state.connected || state.isRunning}
                    >
                        🔍 CHECK COIL
                    </button>
                </div>

                <div style="background: rgba(255,255,255,0.03); border: 1px solid var(--border-sharp); border-radius: 4px; padding: 10px; text-align: center;">
                    <div style="font-size: 0.7rem; color: var(--text-muted); text-transform: uppercase;">DETAK PERINTAH (IGT)</div>
                    <div style="font-size: 1.4rem; font-weight: 800; color: var(--text-primary); margin-top: 2px;">
                        ${fired}
                    </div>
                </div>

                <div style="background: rgba(255,255,255,0.03); border: 1px solid var(--border-sharp); border-radius: 4px; padding: 10px; text-align: center;">
                    <div style="font-size: 0.7rem; color: var(--text-muted); text-transform: uppercase;">DETAK DIRESPON (API)</div>
                    <div style="font-size: 1.4rem; font-weight: 800; color: var(--neon-green); margin-top: 2px;">
                        ${confirmed}
                    </div>
                </div>

                <div style="background: rgba(255,255,255,0.03); border: 1px solid var(--border-sharp); border-radius: 4px; padding: 10px; text-align: center;">
                    <div style="font-size: 0.7rem; color: var(--text-muted); text-transform: uppercase;">DETAK HILANG / ARITMIA</div>
                    <div style="font-size: 1.4rem; font-weight: 800; color: ${missed > 0 ? 'var(--neon-red)' : 'var(--text-muted)'}; margin-top: 2px;">
                        ${missed}
                    </div>
                </div>
            </div>

            <!-- REAL-TIME PERFORMANCE TREND GRAPH (SVG) -->
            <div style="margin-top: 14px; background: rgba(0,0,0,0.5); border: 1px solid var(--border-sharp); border-radius: 6px; padding: 12px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                    <span style="font-size: 0.75rem; font-weight: 700; color: var(--text-primary);">
                        📈 GRAFIK TREN PERFORMA vs RPM (LIVE SWEEP ANALYZER)
                    </span>
                    <div style="display: flex; gap: 12px; font-size: 0.68rem;">
                        <span style="color: var(--neon-cyan);">■ Arus Api (0-80mA)</span>
                        <span style="color: var(--neon-purple);">■ Keteraturan Detak (0-100%)</span>
                    </div>
                </div>

                <div style="width: 100%; height: 95px; background: rgba(10,12,16,0.8); border: 1px solid rgba(255,255,255,0.05); border-radius: 4px; position: relative; overflow: hidden;">
                    <div style="position: absolute; width: 100%; top: 25%; border-top: 1px dashed rgba(255,255,255,0.08);"></div>
                    <div style="position: absolute; width: 100%; top: 50%; border-top: 1px dashed rgba(255,255,255,0.08);"></div>
                    <div style="position: absolute; width: 100%; top: 75%; border-top: 1px dashed rgba(255,255,255,0.08);"></div>

                    <svg viewBox="0 0 ${chartW} ${chartH}" preserveAspectRatio="none" style="width: 100%; height: 100%; display: block;">
                        ${sparkPts ? html`<polyline fill="none" stroke="var(--neon-cyan)" stroke-width="2" points="${sparkPts}" stroke-linecap="round" stroke-linejoin="round" />` : ''}
                        ${cadencePts ? html`<polyline fill="none" stroke="var(--neon-purple)" stroke-width="2" points="${cadencePts}" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="3,2" />` : ''}
                    </svg>

                    ${ptsCount === 0 ? html`
                        <div style="position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; font-size: 0.75rem; color: var(--text-muted);">
                            Nyalakan Trigger / Sweep untuk merekam grafik tren performa
                        </div>
                    ` : ''}
                </div>

                <div style="display: flex; justify-content: space-between; font-size: 0.65rem; color: var(--text-muted); margin-top: 4px;">
                    <span>◀ Titik Awal Pengujian</span>
                    <span>RPM: <strong style="color: var(--neon-cyan);">${rpm} RPM</strong></span>
                    <span>Live Riwayat (50 Sampel) ▶</span>
                </div>
            </div>
        </div>
    `;
}
