import { html, useState, useEffect, useRef } from '../preact.js';

export function SparkCadenceCard({ state, sendAction, title = "IGNITION & INSULATION ANALYZER", is4Pin = false }) {
    const historyRef = useRef([]);
    const [history, setHistory] = useState([]);

    const fired = state.coilFiredCount || 0;
    const confirmed = state.coilSparkReturnCount || state.coilIgfCount || 0;
    const missed = state.coilMissedCount || Math.max(0, fired - confirmed);
    const sparkmA = state.coilSparkCurrentmA || 0.0;
    const currentA = state.coilPeakCurrentA ? state.coilPeakCurrentA.toFixed(1) : "0.0";
    const rpm = state.currentRpm || state.rpm || 800;

    const cadenceRate = fired > 0 ? Math.min(100, Math.max(0, (confirmed / fired) * 100)) : 100;
    const arrhythmiaRate = 100 - cadenceRate;
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
    let healthColor = 'var(--neon-green)', healthBadge = '🟢 100% PRIMA', healthDesc = 'Detak Sinkron & Api Normal';

    if (fired === 0) {
        healthColor = 'var(--text-muted)'; healthBadge = 'STANDBY'; healthDesc = 'Tekan Trigger / Run untuk Menguji';
    } else if (parseFloat(currentA) > 11.5) {
        healthColor = 'var(--neon-red)'; healthBadge = '❌ OVERCURRENT (>11A)'; healthDesc = 'Korsleting Primer / IGBT Rusak';
    } else if (leakSeverity.includes("SEVERE") || leakRate > 25) {
        healthColor = 'var(--neon-red)'; healthBadge = '🚨 20% BOCOR PARAH'; healthDesc = 'Isolasi Koil Jebol / Arcing Bodi Ekstrem!';
    } else if (leakSeverity.includes("MEDIUM") || leakRate > 5) {
        healthColor = 'var(--neon-orange)'; healthBadge = '⚠️ 50% ISOLASI BOCOR'; healthDesc = 'Terjadi Arcing / Rambatan Tegangan Tinggi';
    } else if (isLeaking || leakCount > 0) {
        healthColor = '#FFE600'; healthBadge = '⚡ 75% MIKRO LEAKAGE'; healthDesc = 'Retak Rambut / Kebocoran Bodi Terdeteksi';
    } else if (confirmed > 0 && cadenceRate >= 95 && (sparkmA >= 30 || sparkmA === 0)) {
        healthColor = 'var(--neon-green)'; healthBadge = '🟢 100% PRIMA'; healthDesc = 'Api Normal & Detak 100% Sinkron';
    } else if (confirmed > 0 && cadenceRate >= 80) {
        healthColor = '#A6FF00'; healthBadge = '🟡 75% BAIK'; healthDesc = 'Layak Pakai, Irama Teratur';
    } else if (confirmed > 0 && cadenceRate >= 50) {
        healthColor = 'var(--neon-orange)'; healthBadge = '🟠 50% DROP BEBAN'; healthDesc = '⚠️ Aritmia / Detak Hilang Sebagian!';
    } else if (confirmed > 0) {
        healthColor = 'var(--neon-red)'; healthBadge = '🔴 25% SEKARAT'; healthDesc = 'Banyak Detak Hilang (>50% Misfire)';
    } else {
        healthColor = 'var(--neon-red)'; healthBadge = '❌ 0% MATI / MISFIRE'; healthDesc = 'Misfire Total (0 Detak Terkonfirmasi)';
    }

    const currentSens = state.coilLeakSensitivity || 3;
    const customThreshold = state.coilLeakThreshold || 3;
    const customDebounce = state.coilLeakDebounceMs !== undefined ? Number(state.coilLeakDebounceMs).toFixed(1) : "1.0";
    const sensLabels = [
        { id: 1, name: "1: ULTRA", desc: "Bawah: Peka Mikro Leak (0.2ms/1 Arc)" },
        { id: 2, name: "2: TINGGI", desc: "Tinggi: Retak Leher Resin (0.5ms/2 Arcs)" },
        { id: 3, name: "3: STANDAR", desc: "Standar: Redam Radiasi Udara (1.0ms/3 Arcs)" },
        { id: 4, name: "4: KEBAL", desc: "Atas: Celah Busi Langsung (1.5ms/5 Arcs)" },
        { id: 5, name: "5: CUSTOM", desc: "Setel Bebas (0.1-3.0ms / 1-10 Arcs)" }
    ];

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
        <div class="panel" style="margin-top: 4px; grid-column: 1 / -1; border-color: ${healthColor};">
            <!-- HEADER -->
            <div class="panel-header" style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border-sharp); padding-bottom: 8px; flex-wrap: wrap; gap: 8px;">
                <span style="font-weight: 700; letter-spacing: 0.05em; color: ${healthColor};">⚡ ${title}</span>
                <div style="display: flex; gap: 8px; align-items: center;">
                    <button class="btn" style="padding: 4px 10px; font-size: 0.72rem; font-weight: 700; background: rgba(255,255,255,0.08);" onClick=${() => { historyRef.current = []; setHistory([]); sendAction('resetCounters'); sendAction('resetLeakCounter'); }} disabled=${!state.connected}>🔄 RESET</button>
                    <span class="status-badge" style="border-color: ${healthColor}; color: ${healthColor};">${healthBadge}</span>
                </div>
            </div>

            <!-- DUAL INDEPENDENT GAUGES -->
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 10px; margin-top: 10px;">
                <!-- GAUGE 1: KUALITAS API (mA) -->
                <div style="background: rgba(0,0,0,0.35); border: 1px solid var(--border-sharp); border-radius: 6px; padding: 10px 14px;">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <span style="font-size: 0.75rem; font-weight: 700; color: var(--neon-cyan);">⚡ GAUGE 1: KUALITAS API (mA)</span>
                        <span style="font-size: 0.7rem; color: var(--text-muted);">Target: >45 mA</span>
                    </div>
                    <div style="display: flex; align-items: baseline; justify-content: space-between; margin-top: 6px;">
                        <div style="font-size: 1.8rem; font-weight: 800; color: ${sparkmA >= 45 ? 'var(--neon-green)' : (sparkmA >= 30 ? '#A6FF00' : (sparkmA >= 15 ? 'var(--neon-orange)' : 'var(--neon-red)'))};">
                            ${sparkmA.toFixed(1)} <span style="font-size: 0.9rem; font-weight: 600; color: var(--text-muted);">mA</span>
                        </div>
                        <div style="font-size: 0.75rem; font-weight: 700; color: ${sparkmA >= 45 ? 'var(--neon-green)' : (sparkmA >= 15 ? 'var(--neon-orange)' : 'var(--neon-red)')};">
                            ${sparkmA >= 45 ? 'API BIRU TEBAL' : (sparkmA >= 30 ? 'API STANDAR' : (sparkmA >= 15 ? 'API KECIL / DROP' : 'API LILIN / MATI'))}
                        </div>
                    </div>
                    <div style="width: 100%; height: 6px; background: rgba(255,255,255,0.08); border-radius: 3px; overflow: hidden; margin-top: 6px;">
                        <div style="width: ${Math.min(100, (sparkmA / 80.0) * 100)}%; height: 100%; background: ${sparkmA >= 45 ? 'var(--neon-green)' : (sparkmA >= 30 ? '#A6FF00' : (sparkmA >= 15 ? 'var(--neon-orange)' : 'var(--neon-red)'))}; transition: width 0.2s;"></div>
                    </div>
                </div>

                <!-- GAUGE 2: IRAMA DETAK (%) -->
                <div style="background: rgba(0,0,0,0.35); border: 1px solid var(--border-sharp); border-radius: 6px; padding: 10px 14px;">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <span style="font-size: 0.75rem; font-weight: 700; color: var(--neon-purple);">⏱️ GAUGE 2: KETERATURAN DETAK (IRAMA)</span>
                        <span style="font-size: 0.7rem; color: var(--text-muted);">Target: 100%</span>
                    </div>
                    <div style="display: flex; align-items: baseline; justify-content: space-between; margin-top: 6px;">
                        <div style="font-size: 1.8rem; font-weight: 800; color: ${cadenceRate >= 95 ? 'var(--neon-green)' : (cadenceRate >= 80 ? 'var(--neon-orange)' : 'var(--neon-red)')};">
                            ${cadenceRate.toFixed(1)} <span style="font-size: 0.9rem; font-weight: 600; color: var(--text-muted);">%</span>
                        </div>
                        <div style="font-size: 0.75rem; font-weight: 700; color: ${missed === 0 ? 'var(--neon-green)' : 'var(--neon-red)'};">
                            ${missed === 0 ? 'IRAMA NORMAL' : (missed + ' HILANG (' + arrhythmiaRate.toFixed(1) + '%)')}
                        </div>
                    </div>
                    <div style="width: 100%; height: 6px; background: rgba(255,255,255,0.08); border-radius: 3px; overflow: hidden; margin-top: 6px;">
                        <div style="width: ${cadenceRate}%; height: 100%; background: ${cadenceRate >= 95 ? 'var(--neon-green)' : (cadenceRate >= 80 ? 'var(--neon-orange)' : 'var(--neon-red)')}; transition: width 0.2s;"></div>
                    </div>
                </div>
            </div>

            <!-- UNIFIED METRICS ROW: SKOR, ARUS PRIMER, LEAK BODI, & DETAK -->
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 8px; margin-top: 10px;">
                <div style="background: rgba(255,255,255,0.03); border: 1px solid var(--border-sharp); border-radius: 4px; padding: 8px; text-align: center;">
                    <div style="font-size: 0.68rem; color: var(--text-muted); text-transform: uppercase;">SKOR KELAYAKAN</div>
                    <div style="font-size: 1.35rem; font-weight: 800; color: ${healthColor}; margin-top: 2px;">${totalHealthScore.toFixed(0)}%</div>
                    <div style="font-size: 0.62rem; color: var(--text-muted);">${healthDesc}</div>
                </div>

                <div style="background: rgba(255,255,255,0.03); border: 1px solid var(--border-sharp); border-radius: 4px; padding: 8px; text-align: center;">
                    <div style="font-size: 0.68rem; color: var(--text-muted); text-transform: uppercase;">ARUS PRIMER PEAK</div>
                    <div style="font-size: 1.35rem; font-weight: 800; color: ${parseFloat(currentA) >= 5.0 && parseFloat(currentA) <= 10.5 ? 'var(--neon-green)' : 'var(--neon-orange)'}; margin-top: 2px;">${currentA} A</div>
                    <button class="btn" style="margin-top: 2px; width: 100%; padding: 2px 4px; font-size: 0.65rem; font-weight: 800; background: #FFE600; color: #000;" onClick=${() => sendAction('probeCoil')} disabled=${!state.connected || state.isRunning}>🔍 CHECK COIL</button>
                </div>

                <div style="background: rgba(255,255,255,0.03); border: 1px solid ${leakBadgeColor}; border-radius: 4px; padding: 8px; text-align: center;">
                    <div style="font-size: 0.68rem; color: var(--text-muted); text-transform: uppercase;">LEAK BODI (PIN 36)</div>
                    <div style="font-size: 0.82rem; font-weight: 800; color: ${leakBadgeColor}; margin-top: 4px; line-height: 1.2;">${leakStatusText}</div>
                    <div style="font-size: 0.62rem; color: var(--text-muted); margin-top: 2px;">${leakCount} Arcs (${leakRate}/s)</div>
                </div>

                <div style="background: rgba(255,255,255,0.03); border: 1px solid var(--border-sharp); border-radius: 4px; padding: 8px; text-align: center;">
                    <div style="font-size: 0.68rem; color: var(--text-muted); text-transform: uppercase;">DETAK IGT / RESPON</div>
                    <div style="font-size: 1.15rem; font-weight: 800; color: var(--text-primary); margin-top: 2px;">${fired} <span style="font-size: 0.8rem; color: var(--neon-green);">/ ${confirmed}</span></div>
                    <div style="font-size: 0.62rem; color: ${missed > 0 ? 'var(--neon-red)' : 'var(--text-muted)'}; margin-top: 2px;">${missed} Missed</div>
                </div>
            </div>

            <!-- COLLAPSIBLE PROBE SENSITIVITY FILTER -->
            <details style="margin-top: 10px; background: rgba(0,0,0,0.3); border: 1px solid var(--border-sharp); border-radius: 6px; padding: 8px;">
                <summary style="cursor: pointer; user-select: none; font-size: 0.74rem; font-weight: 700; color: var(--neon-cyan); display: flex; justify-content: space-between; align-items: center;">
                    <span>🎯 PENGATURAN SENSITIFITAS PROBE LEAK (PIN 36) ▾</span>
                    <span style="font-size: 0.68rem; color: var(--text-muted); font-weight: normal;">Aktif: <strong>${sensLabels.find(s => s.id === currentSens)?.name || ""}</strong></span>
                </summary>
                <div style="padding-top: 8px;">
                    <div style="font-size: 0.72rem; color: var(--neon-cyan); margin-bottom: 6px;">${sensLabels.find(s => s.id === currentSens)?.desc || ""}</div>
                    <div style="display: grid; grid-template-columns: repeat(5, 1fr); gap: 4px;">
                        ${sensLabels.map(s => html`
                            <button class="btn ${currentSens === s.id ? 'btn-active' : ''}" style="padding: 4px 2px; font-size: 0.68rem; font-weight: bold; text-align: center; border-color: ${currentSens === s.id ? 'var(--neon-green)' : 'var(--border-sharp)'}; background: ${currentSens === s.id ? 'rgba(0, 255, 102, 0.15)' : 'transparent'}; color: ${currentSens === s.id ? 'var(--neon-green)' : 'var(--text-muted)'};" onClick=${() => sendAction('setLeakSensitivity', s.id)} disabled=${!state.connected}>${s.name}</button>
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
                                    <span>FILTER WAKTU (DEBOUNCE):</span><strong style="color: var(--neon-cyan);">${customDebounce} ms</strong>
                                </div>
                                <input type="range" min="0.1" max="3.0" step="0.1" value=${customDebounce} style="width: 100%; accent-color: var(--neon-cyan);" onInput=${(e) => sendAction('setLeakDebounce', parseFloat(e.target.value))} disabled=${!state.connected} />
                            </div>
                        </div>
                    ` : ''}
                    <div style="margin-top: 8px; display: flex; justify-content: space-between; align-items: center; font-size: 0.7rem; color: var(--text-muted);">
                        <span>Buzzer Status: ${state.isRunning ? (isLeaking ? 'BEEPING 🔊' : 'STANDBY') : 'MUTED (RUN OFF)'}</span>
                        <button class="btn" style="padding: 2px 8px; font-size: 0.68rem;" onClick=${() => sendAction('resetLeakCounter')} disabled=${!state.connected}>Reset Counter Leak</button>
                    </div>
                </div>
            </details>

            <!-- COLLAPSIBLE REAL-TIME PERFORMANCE TREND GRAPH (SVG) -->
            <details style="margin-top: 8px; background: rgba(0,0,0,0.3); border: 1px solid var(--border-sharp); border-radius: 6px; padding: 8px;">
                <summary style="cursor: pointer; user-select: none; font-size: 0.74rem; font-weight: 700; color: var(--text-primary); display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 6px;">
                    <span>📈 GRAFIK TREN PERFORMA vs RPM (LIVE SWEEP ANALYZER) ▾</span>
                    <div style="display: flex; gap: 8px; font-size: 0.65rem;">
                        <span style="color: var(--neon-cyan);">■ Arus Api (0-80mA)</span>
                        <span style="color: var(--neon-purple);">■ Irama Detak (0-100%)</span>
                    </div>
                </summary>
                <div style="margin-top: 8px;">
                    <div style="width: 100%; height: 85px; background: rgba(10,12,16,0.8); border: 1px solid rgba(255,255,255,0.05); border-radius: 4px; position: relative; overflow: hidden;">
                        <div style="position: absolute; width: 100%; top: 25%; border-top: 1px dashed rgba(255,255,255,0.08);"></div>
                        <div style="position: absolute; width: 100%; top: 50%; border-top: 1px dashed rgba(255,255,255,0.08);"></div>
                        <div style="position: absolute; width: 100%; top: 75%; border-top: 1px dashed rgba(255,255,255,0.08);"></div>
                        <svg viewBox="0 0 ${chartW} ${chartH}" preserveAspectRatio="none" style="width: 100%; height: 100%; display: block;">
                            ${sparkPts ? html`<polyline fill="none" stroke="var(--neon-cyan)" stroke-width="2" points="${sparkPts}" stroke-linecap="round" stroke-linejoin="round" />` : ''}
                            ${cadencePts ? html`<polyline fill="none" stroke="var(--neon-purple)" stroke-width="2" points="${cadencePts}" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="3,2" />` : ''}
                        </svg>
                        ${ptsCount === 0 ? html`
                            <div style="position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; font-size: 0.72rem; color: var(--text-muted);">
                                Nyalakan Trigger / Sweep untuk merekam grafik tren performa
                            </div>
                        ` : ''}
                    </div>
                    <div style="display: flex; justify-content: space-between; font-size: 0.65rem; color: var(--text-muted); margin-top: 4px;">
                        <span>◀ Awal Uji</span>
                        <span>Live RPM: <strong style="color: var(--neon-cyan);">${rpm} RPM</strong></span>
                        <span>Riwayat (50 Sampel) ▶</span>
                    </div>
                </div>
            </details>
        </div>
    `;
}
