import { html } from '../preact.js';
import { Dial } from './Dial.js';
import { LeakageCard } from './LeakageCard.js';

export function DashboardCoilActive4P({ state, sendAction, modeSelector }) {
    const isSweep = state.runMode === 3;
    const isAutoDiag = state.coilAutoDiagRunning;
    const health = (state.coilHealthPercent !== undefined) ? state.coilHealthPercent : 100.0;
    const fired = state.coilFiredCount || 0;
    const igf = state.coilIgfCount || 0;
    const missed = state.coilMissedCount || 0;
    const verdict = state.coilDiagVerdict || "READY";
    const currentA = state.coilPeakCurrentA ? state.coilPeakCurrentA.toFixed(1) : "0.0";

    let healthColor = "var(--neon-green)";
    let healthBadge = "HEALTHY";
    if (fired > 20 && health < 90.0) {
        healthColor = "var(--neon-red)";
        healthBadge = "DEFECTIVE / MISFIRE";
    } else if (fired > 20 && health < 99.0) {
        healthColor = "var(--neon-orange)";
        healthBadge = "DEGRADED";
    }

    return html`
        <div class="panel-main">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; flex-wrap: wrap; gap: 6px;">
                <div style="font-size: 0.8rem; font-weight: bold; color: var(--text-muted); letter-spacing: 0.05em;">
                    ⚡ IGT (PIN 25) | IGF (PIN 34) | SENSE (PIN 35)
                </div>
                <span class="status-badge" style="font-size: 0.75rem; border-color: ${state.coilConnected ? 'var(--neon-green)' : 'var(--border-sharp)'}; color: ${state.coilConnected ? 'var(--neon-green)' : 'var(--text-muted)'};">
                    ${state.coilConnected ? '🟢 COIL CONNECTED' : '⚪ NO COIL (AUTO-PING)'}
                </span>
            </div>
            <${Dial} 
                label=${isAutoDiag ? "AUTO DIAGNOSTIC RPM" : ((isSweep && state.isRunning) ? "SWEEPING RPM..." : (isSweep ? "TARGET RPM" : "ENGINE SPEED"))}
                value=${(isSweep && state.isRunning) ? state.currentRpm : state.rpm}
                unit="RPM"
                min="0"
                max="16000"
                step=${state.rpmStep || 50}
                subInfo=${isAutoDiag ? ("Auto Scan Phase " + state.coilDiagPhase + "/3") : null}
                onChange=${(val) => sendAction('setRpm', val)}
                disabled=${!state.connected || (isSweep && state.isRunning) || isAutoDiag}
            />
        </div>
        
        <div class="panel-side-top" style="display: flex; flex-direction: column; gap: var(--space-md);">
            <${Dial} 
                label="DWELL TIME (IGT PULSE)"
                value=${state.dwellMs}
                unit="MS"
                min="0.5"
                max="5.0"
                step="0.1"
                subInfo=${"Duty: " + (state.dutyCycle ? state.dutyCycle.toFixed(1) : "0.0") + "%"}
                onChange=${(val) => sendAction('setDwell', val)}
                disabled=${!state.connected || isAutoDiag}
            />
        </div>

        ${modeSelector}
        
        <!-- MASTER RUN BUTTON -->
        <div class="sticky-run-bar">
            <button 
                class="btn btn-run ${state.isRunning ? 'is-running' : ''}"
                onClick=${() => sendAction('toggleRun')}
                disabled=${!state.connected || isAutoDiag}
            >
                ${state.runMode === 2 
                    ? (state.isRunning ? '⚡ FIRING SINGLE...' : '⚡ FIRE SINGLE PULSE')
                    : (state.runMode === 1
                        ? (state.isRunning ? '⚡ FIRING BURST...' : '⚡ FIRE BURST (10x)')
                        : (state.isRunning ? 'IGT TRIGGER: ON' : 'IGT TRIGGER: OFF'))}
            </button>
        </div>
        
        <!-- COIL HEALTH & IGF DIAGNOSTIC ANALYZER -->
        <div class="panel" style="margin-top: var(--space-md); grid-column: 1 / -1; border-color: ${healthColor};">
            <div class="panel-header" style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border-sharp); padding-bottom: 8px;">
                <span style="font-weight: 700; letter-spacing: 0.1em; color: ${healthColor};">
                    ⚡ 4-PIN COIL HEALTH & IGF DIAGNOSTIC ANALYZER
                </span>
                <span class="status-badge" style="border-color: ${healthColor}; color: ${healthColor};">
                    ${healthBadge}
                </span>
            </div>

            <!-- Telemetry Stats Grid (Including Current Sense) -->
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 12px; margin-top: var(--space-md);">
                <div style="background: rgba(255,255,255,0.03); border: 1px solid var(--border-sharp); border-radius: 4px; padding: 12px; text-align: center;">
                    <div style="font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase;">SPARK HEALTH</div>
                    <div style="font-size: 1.5rem; font-weight: 700; color: ${healthColor}; margin-top: 4px;">
                        ${fired > 0 ? health.toFixed(1) + "%" : "--%"}
                    </div>
                </div>

                <div style="background: rgba(255,255,255,0.03); border: 1px solid var(--border-sharp); border-radius: 4px; padding: 12px; text-align: center;">
                    <div style="font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase;">PEAK CURRENT</div>
                    <div style="font-size: 1.5rem; font-weight: 700; color: ${parseFloat(currentA) >= 5.0 && parseFloat(currentA) <= 10.5 ? 'var(--neon-green)' : (parseFloat(currentA) > 10.5 ? 'var(--neon-red)' : 'var(--neon-orange)')}; margin-top: 4px;">
                        ${currentA} A
                    </div>
                    <div style="font-size: 0.7rem; font-weight: bold; margin-top: 2px; color: ${parseFloat(currentA) >= 5.0 && parseFloat(currentA) <= 10.5 ? 'var(--neon-green)' : (parseFloat(currentA) > 10.5 ? 'var(--neon-red)' : 'var(--text-muted)')};">
                        ${state.coilCurrentStatus || "STANDBY"}
                    </div>
                    <button 
                        class="btn" 
                        style="margin-top: 6px; width: 100%; padding: 4px; font-size: 0.65rem; border-color: var(--neon-cyan); color: var(--neon-cyan);"
                        onClick=${() => sendAction('probeCoil')}
                        disabled=${!state.connected || state.isRunning || isAutoDiag}
                    >
                        🔍 PROBE (1x TEST)
                    </button>
                </div>

                <div style="background: rgba(255,255,255,0.03); border: 1px solid var(--border-sharp); border-radius: 4px; padding: 12px; text-align: center;">
                    <div style="font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase;">FIRED (IGT)</div>
                    <div style="font-size: 1.5rem; font-weight: 700; color: var(--text-primary); margin-top: 4px;">
                        ${fired}
                    </div>
                </div>

                <div style="background: rgba(255,255,255,0.03); border: 1px solid var(--border-sharp); border-radius: 4px; padding: 12px; text-align: center;">
                    <div style="font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase;">IGF CONFIRMED</div>
                    <div style="font-size: 1.5rem; font-weight: 700; color: var(--neon-green); margin-top: 4px;">
                        ${igf}
                    </div>
                </div>

                <div style="background: rgba(255,255,255,0.03); border: 1px solid var(--border-sharp); border-radius: 4px; padding: 12px; text-align: center;">
                    <div style="font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase;">MISSED SPARKS</div>
                    <div style="font-size: 1.5rem; font-weight: 700; color: ${missed > 0 ? 'var(--neon-red)' : 'var(--text-muted)'}; margin-top: 4px;">
                        ${missed}
                    </div>
                </div>
            </div>

            <!-- AUTO SCAN SUITE CONTROLS & PROGRESS -->
            <div style="margin-top: var(--space-lg); background: rgba(0,0,0,0.4); border: 1px solid var(--border-sharp); border-radius: 6px; padding: var(--space-md);">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; flex-wrap: wrap; gap: 8px;">
                    <div>
                        <div style="font-weight: 700; font-size: 0.95rem;">20-SECOND AUTO HEALTH & STRESS SCAN</div>
                        <div style="font-size: 0.8rem; color: var(--text-muted);">
                            Tests Low-Dwell Margin (1.2ms), WOT Throttle Burst (6500 RPM), & High-Temp Stress (7000 RPM).
                        </div>
                    </div>
                    
                    <div style="display: flex; gap: 8px;">
                        <button 
                            class="btn"
                            style="padding: 8px 12px; font-size: 0.8rem;"
                            onClick=${() => sendAction('resetCoilCounters')}
                            disabled=${!state.connected || isAutoDiag}
                        >
                            RESET COUNTERS
                        </button>
                        
                        <button 
                            class="btn ${isAutoDiag ? 'is-running' : 'btn-active'}"
                            style="padding: 8px 16px; font-size: 0.85rem; font-weight: bold; border-color: ${isAutoDiag ? 'var(--neon-red)' : 'var(--neon-green)'}; color: ${isAutoDiag ? '#fff' : '#000'}; background: ${isAutoDiag ? 'var(--neon-red)' : 'var(--neon-green)'};"
                            onClick=${() => sendAction(isAutoDiag ? 'stopCoilDiag' : 'startCoilDiag')}
                            disabled=${!state.connected}
                        >
                            ${isAutoDiag ? 'ABORT SCAN' : 'START AUTO HEALTH SCAN'}
                        </button>
                    </div>
                </div>

                <!-- Progress Bar & Active Phase Message -->
                ${isAutoDiag ? html`
                    <div style="margin-top: 12px;">
                        <div style="display: flex; justify-content: space-between; font-size: 0.8rem; margin-bottom: 4px;">
                            <span>
                                ${state.coilDiagPhase === 1 ? 'Phase 1: Dwell Saturation Margin Sweep (1.2ms → 3.5ms)' :
                state.coilDiagPhase === 2 ? 'Phase 2: Throttle Tip-In Burst (800 → 6500 RPM)' :
                    'Phase 3: High-RPM Thermal Breakdown Stress (7000 RPM)'}
                            </span>
                            <span style="font-weight: bold;">${state.coilDiagProgress || 0}%</span>
                        </div>
                        <div style="width: 100%; height: 10px; background: #222; border-radius: 5px; overflow: hidden; border: 1px solid var(--border-sharp);">
                            <div style="height: 100%; width: ${state.coilDiagProgress || 0}%; background: var(--neon-green); transition: width 0.2s;"></div>
                        </div>
                    </div>
                ` : html`
                    <div style="margin-top: 8px; font-size: 0.85rem; padding: 6px 10px; background: rgba(255,255,255,0.02); border-radius: 4px; display: flex; justify-content: space-between;">
                        <span>LAST SCAN VERDICT:</span>
                        <strong style="color: ${verdict.includes('HEALTHY') ? 'var(--neon-green)' : (verdict.includes('DEGRADED') ? 'var(--neon-orange)' : (verdict.includes('FAIL') ? 'var(--neon-red)' : 'var(--text-primary)'))}">
                            ${verdict}
                        </strong>
                    </div>
                `}
            </div>
        </div>
        
        <!-- BODY LEAKAGE DETECTION CARD -->
        <${LeakageCard} state=${state} sendAction=${sendAction} />

        <!-- ADVANCED SETTINGS ACCORDION -->
        <details class="panel" style="margin-top: var(--space-md); grid-column: 1 / -1;">
            <summary class="panel-header" style="cursor: pointer; user-select: none;">
                <span>ADVANCED SETTINGS ▾</span>
            </summary>
            <div class="responsive-grid-2" style="padding-top: var(--space-md);">
                <${Dial} 
                    label="SWEEP TIME"
                    value=${state.sweepTimeSec}
                    unit="SEC"
                    min="1"
                    max="60"
                    step="1"
                    accentColor="var(--neon-purple)"
                    onChange=${(val) => sendAction('setSweepTime', val)}
                    disabled=${!state.connected || isAutoDiag || (state.runMode === 3 && state.isRunning)}
                />
                <${Dial} 
                    label="RPM STEP SIZE"
                    value=${state.rpmStep}
                    unit="RPM"
                    min="10"
                    max="1000"
                    step="10"
                    onChange=${(val) => sendAction('setRpmStep', val)}
                    disabled=${!state.connected || isAutoDiag}
                />
            </div>
        </details>

        <!-- PANDUAN & TATA CARA PENGUJIAN KOIL 4-PIN -->
        <details class="panel" style="margin-top: var(--space-md); grid-column: 1 / -1; border-color: var(--neon-cyan, #00d4ff);" open>
            <summary class="panel-header" style="cursor: pointer; user-select: none; color: var(--neon-cyan, #00d4ff); font-weight: bold; letter-spacing: 0.05em;">
                📖 TATA CARA & PANDUAN PENGUJIAN KOIL 4-PIN LENGKAP ▾
            </summary>
            <div style="padding-top: var(--space-md); font-size: 0.85rem; color: var(--text-primary); line-height: 1.6;">
                
                <div style="background: rgba(0, 212, 255, 0.06); border-left: 3px solid var(--neon-cyan, #00d4ff); padding: 10px 14px; border-radius: 4px; margin-bottom: 14px;">
                    <strong style="color: var(--neon-cyan, #00d4ff);">🎯 TUJUAN DIAGNOSA:</strong><br/>
                    Mengetahui apakah koil benar-benar sehat di bawah beban kompresi 15 Bar, bebas dari gejala brebet saat akselerasi, bebas kebocoran kilovolt, dan tidak pincang saat mesin panas.
                </div>

                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 14px; margin-bottom: 14px;">
                    <div style="background: rgba(255,255,255,0.02); border: 1px solid var(--border-sharp); border-radius: 4px; padding: 12px;">
                        <strong style="color: var(--neon-orange);">1. KONEKSI KABEL KOIL 4-PIN:</strong>
                        <ul style="margin: 6px 0 0 16px; padding: 0; font-size: 0.8rem;">
                            <li><strong>Pin 1 (+B):</strong> Sambung ke +12V Aki (via ACS712).</li>
                            <li><strong>Pin 2 (IGT):</strong> Sambung ke Pin IGT Output (Pin 25).</li>
                            <li><strong>Pin 3 (IGF):</strong> Sambung ke Pin IGF Input (Pin 34).</li>
                            <li><strong>Pin 4 (GND):</strong> Sambung ke Ground Aki 12V.</li>
                            <li><strong>Probe Leak:</strong> Lilitkan kawat di leher karet koil.</li>
                        </ul>
                    </div>

                    <div style="background: rgba(255,255,255,0.02); border: 1px solid var(--border-sharp); border-radius: 4px; padding: 12px;">
                        <strong style="color: var(--neon-green);">2. SETTING CELAH BUSI (SPARK GAP):</strong>
                        <div style="font-size: 0.8rem; margin-top: 6px;">
                            • Gunakan <strong>Adjustable Spark Gap Tester</strong>.<br/>
                            • Atur celah loncatan ke <strong>10 mm s/d 12 mm</strong> (jarak ini meniru hambatan kompresi 15 Bar di ruang silinder mesin mobil).<br/>
                            • <em>Jangan gunakan celah busi pendek 0.8mm karena tidak mewakili beban mesin nyata!</em>
                        </div>
                    </div>
                </div>

                <div style="background: rgba(255,255,255,0.02); border: 1px solid var(--border-sharp); border-radius: 4px; padding: 12px; margin-bottom: 14px;">
                    <strong style="color: var(--neon-purple);">3. TAHAP PENGUJIAN MANUAL & DETEKSI BREBET:</strong>
                    <ol style="margin: 6px 0 0 16px; padding: 0; font-size: 0.8rem;">
                        <li><strong>Uji Langsam (Idle Test):</strong> Set RPM 1.200, Dwell 3.0 ms → Tekan <strong>MASTER RUN</strong>. Amati api wajib biru tebal dan suara cetak-cetak padat.</li>
                        <li><strong>Uji Arus Primer:</strong> Lihat kotak <strong>PEAK CURRENT</strong>. Koil sehat wajib berada di rentang <strong>6.5A s/d 9.5A</strong>. Jika di bawah 5.0A berarti kumparan loyo.</li>
                        <li><strong>Uji Akselerasi Spontan (Tip-in Response):</strong> Naikkan RPM ke 5.000 dan turunkan Dwell ke <strong>2.0 ms</strong>. Koil sehat tetap memercik kuat tanpa ada <em>Missed Sparks</em>.</li>
                        <li><strong>Uji Ketahanan Panas 5-10 Menit:</strong> Pilih mode <strong>SWEEP</strong> dan biarkan menyala 5-10 menit hingga koil hangat. Jika muncul misfire atau buzzer bunyi, koil mengalami <em>Thermal Breakdown</em>.</li>
                    </ol>
                </div>

                <div style="background: rgba(255,255,255,0.02); border: 1px solid var(--border-sharp); border-radius: 4px; padding: 12px; margin-bottom: 14px;">
                    <strong style="color: var(--neon-green);">4. UJI OTOMATIS (20-DETIK AUTO HEALTH SCAN):</strong>
                    <div style="font-size: 0.8rem; margin-top: 6px;">
                        Tekan tombol <strong>START AUTO HEALTH SCAN</strong> di atas. Sistem akan menguji 3 tahap otomatis (Dwell Sweep → WOT Burst → High-RPM Stress) dan menghitung persentase kesehatan (Health Score %) serta vonis akhir koil secara akurat.
                    </div>
                </div>

                <!-- PANDUAN TROUBLESHOOTING KESALAHAN KONEKSI KABEL -->
                <div style="background: rgba(255, 45, 85, 0.06); border: 1px solid var(--neon-red); border-radius: 4px; padding: 12px;">
                    <strong style="color: var(--neon-red);">⚠️ PANDUAN JIKA PENYAMBUNGAN KABEL TIDAK BENAR / KESALAHAN WIRING:</strong>
                    <div style="margin-top: 8px; font-size: 0.8rem; line-height: 1.5;">
                        • <strong>Gejala: PEAK CURRENT = 0.0A (NO CURRENT) & Tidak Ada Api:</strong><br/>
                        <span style="color: var(--text-muted); margin-left: 12px;">
                            → Kabel <strong>+12V</strong> atau <strong>GND</strong> belum terhubung ke koil.<br/>
                            → Kabel <strong>IGT (Pin 25)</strong> salah colok pin (tertukar dengan IGF/GND).<br/>
                            → Posisi saklar Switch 5V/12V salah atau igniter di dalam koil putus total.
                        </span><br/>

                        • <strong>Gejala: Api Busi Memercik TAPI IGF CONFIRMED = 0 (MISSED SPARKS Naik):</strong><br/>
                        <span style="color: var(--text-muted); margin-left: 12px;">
                            → Kabel <strong>IGF (Pin 34)</strong> belum dicolok atau salah pin di soket koil.<br/>
                            → Resistor Pull-Up 1kΩ ke +5V pada jalur IGF kendor/belum terpasang.<br/>
                            → Sensor feedback IGF di dalam kepala koil sudah mati (meskipun api masih keluar).
                        </span><br/>

                        • <strong>Gejala: OVERCURRENT (>11A) / Cepat Panas:</strong><br/>
                        <span style="color: var(--text-muted); margin-left: 12px;">
                            → <em>SEGERA MATIKAN RUN!</em> Kabel IGT menyentuh +12V atau kumparan primer koil korslet internal.
                        </span><br/>

                        • <strong>Gejala: Api Melompat Liar / Buzzer Kebocoran Berbunyi Terus:</strong><br/>
                        <span style="color: var(--text-muted); margin-left: 12px;">
                            → <strong>Penjepit Ground Logam Busi BELUM terpasang ke Ground Aki!</strong> Tegangan 25.000V tidak punya jalur kembali sehingga melompat liar mencari jalan menembus insulator karet koil.
                        </span>
                    </div>
                </div>

            </div>
        </details>
    `;
}
