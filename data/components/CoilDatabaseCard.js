import { html, useState, useEffect } from '../preact.js';

export function CoilDatabaseCard({ state, sendAction }) {
    const defaultProfiles = [
        { id: 'toyota_avanza', name: 'Toyota Avanza 1.3/1.5 (1NR/2NR)', make: 'Toyota/Denso', type: '3-Pin Active', dwell: 3.0, currentMin: 6.5, currentMax: 8.5, sparkMin: 45 },
        { id: 'toyota_innova', name: 'Toyota Innova 2.0 (1TR-FE)', make: 'Toyota/Denso', type: '3-Pin Active', dwell: 3.2, currentMin: 7.0, currentMax: 9.0, sparkMin: 48 },
        { id: 'honda_jazz', name: 'Honda Jazz/City/Brio (L15A/L12B)', make: 'Honda/Hitachi', type: '3-Pin Active', dwell: 2.8, currentMin: 6.0, currentMax: 8.0, sparkMin: 45 },
        { id: 'mitsubishi_xpander', name: 'Mitsubishi Xpander (4A91)', make: 'Mitsubishi/Diamond', type: '3-Pin Active', dwell: 3.0, currentMin: 6.5, currentMax: 8.5, sparkMin: 46 },
        { id: 'suzuki_ertiga', name: 'Suzuki Ertiga (K15B/K14B)', make: 'Suzuki/Diamond', type: '3-Pin Active', dwell: 3.0, currentMin: 6.2, currentMax: 8.2, sparkMin: 45 },
        { id: 'nissan_livina', name: 'Nissan Grand Livina (HR15DE)', make: 'Nissan/Hanshin', type: '3-Pin Active', dwell: 2.9, currentMin: 6.0, currentMax: 8.2, sparkMin: 44 },
        { id: 'toyota_smart4p', name: 'Toyota Vios/Yaris Smart Coil', make: 'Toyota/Denso', type: '4-Pin Smart IGF', dwell: 3.0, currentMin: 6.5, currentMax: 8.5, sparkMin: 48 },
        { id: 'granmax_pasif', name: 'Gran Max / Kijang 7K Pasif', make: 'Daihatsu/Denso', type: '2-Pin Passive', dwell: 3.2, currentMin: 6.0, currentMax: 8.5, sparkMin: 40 }
    ];

    const [selectedProfileId, setSelectedProfileId] = useState('toyota_avanza');
    const [coldLog, setColdLog] = useState(null);
    const [hotLog, setHotLog] = useState(null);
    const [savedReportMessage, setSavedReportMessage] = useState('');

    const currentProfile = defaultProfiles.find(p => p.id === selectedProfileId) || defaultProfiles[0];

    const applyProfile = (p) => {
        setSelectedProfileId(p.id);
        sendAction('setDwell', p.dwell);
    };

    const captureColdSnapshot = () => {
        setColdLog({
            timestamp: new Date().toLocaleTimeString(),
            peakA: state.coilPeakCurrentA || 0,
            sparkmA: state.coilSparkCurrentmA || 0,
            tempC: state.tempCoilC || 28.5,
            health: state.coilHealthPercent || 100,
            leakCount: state.coilLeakCount || 0
        });
    };

    const captureHotSnapshot = () => {
        setHotLog({
            timestamp: new Date().toLocaleTimeString(),
            peakA: state.coilPeakCurrentA || 0,
            sparkmA: state.coilSparkCurrentmA || 0,
            tempC: state.tempCoilC || 55.0,
            health: state.coilHealthPercent || 95,
            leakCount: state.coilLeakCount || 0
        });
    };

    const saveTestReport = () => {
        const report = {
            profile: currentProfile,
            cold: coldLog,
            hot: hotLog,
            savedAt: new Date().toLocaleString()
        };
        try {
            localStorage.setItem('coil_test_last_report', JSON.stringify(report));
            setSavedReportMessage('✅ Laporan Pengujian Berhasil Disimpan!');
            setTimeout(() => setSavedReportMessage(''), 4000);
        } catch (e) {
            setSavedReportMessage('❌ Gagal menyimpan laporan');
        }
    };

    return html`
        <details class="panel" style="margin-top: 8px; grid-column: 1 / -1; border-color: var(--border-sharp); background: rgba(0,0,0,0.3);">
            <summary class="panel-header" style="cursor: pointer; user-select: none; color: var(--neon-cyan); font-weight: 700; font-size: 0.78rem; display: flex; justify-content: space-between; align-items: center;">
                <span>🚗 DATABASE PROFIL KOIL & LOG HASIL UJI KENDARAAN ▾</span>
                <span style="font-size: 0.68rem; color: var(--text-muted); font-weight: normal;">
                    Profil: <strong>${currentProfile.name}</strong>
                </span>
            </summary>

            <div style="padding-top: 10px; display: flex; flex-direction: column; gap: 10px;">
                
                <!-- ROW 1: PRESET SELECTION & QUICK TARGET SPECS -->
                <div style="background: rgba(255,255,255,0.02); border: 1px solid var(--border-sharp); border-radius: 4px; padding: 10px;">
                    <div style="font-size: 0.72rem; font-weight: bold; color: var(--neon-cyan); margin-bottom: 6px;">
                        PILIH MODEL MOBIL / SPESIFIKASI STANDAR PABRIKAN:
                    </div>

                    <div style="display: flex; gap: 6px; flex-wrap: wrap;">
                        ${defaultProfiles.map(p => html`
                            <button
                                class="btn ${selectedProfileId === p.id ? 'btn-active' : ''}"
                                style="padding: 4px 8px; font-size: 0.7rem; border-color: ${selectedProfileId === p.id ? 'var(--neon-cyan)' : 'var(--border-sharp)'}; background: ${selectedProfileId === p.id ? 'rgba(0, 212, 255, 0.2)' : 'transparent'}; color: ${selectedProfileId === p.id ? 'var(--neon-cyan)' : 'var(--text-muted)'};"
                                onClick=${() => applyProfile(p)}
                            >
                                ${p.name}
                            </button>
                        `)}
                    </div>

                    <!-- Target Spec Info Strip -->
                    <div style="margin-top: 8px; display: flex; justify-content: space-between; font-size: 0.72rem; background: rgba(0,0,0,0.4); padding: 6px 10px; border-radius: 4px;">
                        <span>Target Dwell: <strong style="color: var(--neon-purple);">${currentProfile.dwell} ms</strong></span>
                        <span>Target Arus: <strong style="color: var(--neon-green);">${currentProfile.currentMin}A - ${currentProfile.currentMax}A</strong></span>
                        <span>Api Min: <strong style="color: var(--neon-cyan);">${currentProfile.sparkMin} mA</strong></span>
                    </div>
                </div>

                <!-- ROW 2: THERMAL STRESS COMPARISON (COLD vs HOT TEST LOG) -->
                <div style="background: rgba(255,255,255,0.02); border: 1px solid var(--border-sharp); border-radius: 4px; padding: 10px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                        <span style="font-size: 0.72rem; font-weight: bold; color: var(--neon-orange);">
                            📊 KOMPARASI KETAHANAN PANAS (UJI AWAL DINGIN vs UJI PANAS 5-10 MENIT):
                        </span>
                        <div style="display: flex; gap: 6px;">
                            <button class="btn" style="padding: 4px 8px; font-size: 0.68rem;" onClick=${captureColdSnapshot}>
                                📸 SNAPSHOT DINGIN
                            </button>
                            <button class="btn" style="padding: 4px 8px; font-size: 0.68rem;" onClick=${captureHotSnapshot}>
                                📸 SNAPSHOT PANAS
                            </button>
                        </div>
                    </div>

                    <!-- Comparison Table Grid -->
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 0.72rem;">
                        <!-- Cold Column -->
                        <div style="background: rgba(0, 212, 255, 0.05); border: 1px solid rgba(0, 212, 255, 0.2); border-radius: 4px; padding: 8px;">
                            <strong style="color: var(--neon-cyan);">KONDISI AWAL (DINGIN):</strong>
                            ${coldLog ? html`
                                <div style="margin-top: 4px; line-height: 1.5;">
                                    • Jam: ${coldLog.timestamp}<br/>
                                    • Arus Peak: <strong style="color: var(--neon-green);">${coldLog.peakA.toFixed(1)} A</strong><br/>
                                    • Arus Api: <strong style="color: var(--neon-cyan);">${coldLog.sparkmA.toFixed(1)} mA</strong><br/>
                                    • Suhu Bodi: ${coldLog.tempC.toFixed(1)} °C<br/>
                                    • Skor: <strong>${coldLog.health.toFixed(1)}%</strong>
                                </div>
                            ` : html`<div style="color: var(--text-muted); margin-top: 4px;">(Klik tombol Snapshot Dingin)</div>`}
                        </div>

                        <!-- Hot Column -->
                        <div style="background: rgba(255, 45, 85, 0.05); border: 1px solid rgba(255, 45, 85, 0.2); border-radius: 4px; padding: 8px;">
                            <strong style="color: var(--neon-red);">KONDISI AKHIR (PANAS):</strong>
                            ${hotLog ? html`
                                <div style="margin-top: 4px; line-height: 1.5;">
                                    • Jam: ${hotLog.timestamp}<br/>
                                    • Arus Peak: <strong style="color: var(--neon-green);">${hotLog.peakA.toFixed(1)} A</strong><br/>
                                    • Arus Api: <strong style="color: var(--neon-cyan);">${hotLog.sparkmA.toFixed(1)} mA</strong><br/>
                                    • Suhu Bodi: ${hotLog.tempC.toFixed(1)} °C<br/>
                                    • Skor: <strong>${hotLog.health.toFixed(1)}%</strong>
                                </div>
                            ` : html`<div style="color: var(--text-muted); margin-top: 4px;">(Klik tombol Snapshot Panas)</div>`}
                        </div>
                    </div>

                    <!-- Save / Export Action -->
                    <div style="margin-top: 10px; display: flex; justify-content: space-between; align-items: center;">
                        <button class="btn" style="padding: 6px 12px; font-size: 0.75rem; font-weight: bold; border-color: var(--neon-green); color: var(--neon-green);" onClick=${saveTestReport}>
                            💾 SIMPAN LAPORAN DIAGNOSTIK KE MEMORI
                        </button>
                        ${savedReportMessage ? html`<span style="font-size: 0.72rem; color: var(--neon-green); font-weight: bold;">${savedReportMessage}</span>` : ''}
                    </div>
                </div>

            </div>
        </details>
    `;
}
