import { html } from '../preact.js';
import { Dial } from './Dial.js';
import { LeakageCard } from './LeakageCard.js';

export function DashboardCoilActive3P({ state, sendAction, modeSelector }) {
    const isSweep = state.runMode === 3;
    const currentA = state.coilPeakCurrentA ? state.coilPeakCurrentA.toFixed(1) : "0.0";
    
    return html`
        <div class="panel-main">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; flex-wrap: wrap; gap: 6px;">
                <div style="font-size: 0.8rem; font-weight: bold; color: var(--text-muted); letter-spacing: 0.05em;">
                    ⚡ DEDICATED LOGIC IGT (PIN 25 - 5V/3.3V)
                </div>
                <span class="status-badge" style="font-size: 0.75rem; border-color: ${state.coilConnected ? 'var(--neon-green)' : 'var(--border-sharp)'}; color: ${state.coilConnected ? 'var(--neon-green)' : 'var(--text-muted)'};">
                    ${state.coilConnected ? '🟢 COIL CONNECTED' : '⚪ NO COIL (AUTO-PING)'}
                </span>
            </div>
            <${Dial} 
                label=${(isSweep && state.isRunning) ? "SWEEPING RPM..." : (isSweep ? "TARGET RPM" : "ENGINE SPEED")}
                value=${(isSweep && state.isRunning) ? state.currentRpm : state.rpm}
                unit="RPM"
                min="0"
                max="16000"
                step=${state.rpmStep || 50}
                onChange=${(val) => sendAction('setRpm', val)}
                disabled=${!state.connected || (isSweep && state.isRunning)}
            />
        </div>
        
        <div class="panel-side-top" style="display: flex; flex-direction: column; gap: var(--space-md);">
            <${Dial} 
                label="DWELL TIME (IGT PULSE WIDTH)"
                value=${state.dwellMs}
                unit="MS"
                min="0.5"
                max="5.0"
                step="0.1"
                subInfo=${"Duty: " + (state.dutyCycle ? state.dutyCycle.toFixed(1) : "0.0") + "%"}
                onChange=${(val) => sendAction('setDwell', val)}
                disabled=${!state.connected}
            />
        </div>

        ${modeSelector}
        
        <!-- MASTER RUN BUTTON -->
        <div class="sticky-run-bar">
            <button 
                class="btn btn-run ${state.isRunning ? 'is-running' : ''}"
                onClick=${() => sendAction('toggleRun')}
                disabled=${!state.connected}
            >
                ${state.runMode === 2 
                    ? (state.isRunning ? '⚡ FIRING SINGLE...' : '⚡ FIRE SINGLE PULSE')
                    : (state.runMode === 1
                        ? (state.isRunning ? '⚡ FIRING BURST...' : '⚡ FIRE BURST (10x)')
                        : (state.isRunning ? 'IGT TRIGGER: ON' : 'IGT TRIGGER: OFF'))}
            </button>
        </div>
        
        <!-- 3-PIN CURRENT SENSING & DIAGNOSTIC CARD -->
        <div class="panel" style="margin-top: var(--space-md); grid-column: 1 / -1; border-color: var(--neon-orange);">
            <div class="panel-header" style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border-sharp); padding-bottom: 8px;">
                <span style="font-weight: 700; letter-spacing: 0.1em; color: var(--neon-orange);">
                    ⚡ 3-PIN PRIMARY CURRENT MONITOR & SATURATION HEALTH (PIN 35)
                </span>
                <span class="status-badge" style="border-color: var(--neon-orange); color: var(--neon-orange);">
                    IGNITER HEALTH
                </span>
            </div>

            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px; margin-top: var(--space-md);">
                <div style="background: rgba(255,255,255,0.03); border: 1px solid var(--border-sharp); border-radius: 4px; padding: 14px; text-align: center;">
                    <div style="font-size: 0.8rem; color: var(--text-muted); text-transform: uppercase;">PEAK PRIMARY CURRENT (I_peak)</div>
                    <div style="font-size: 2.2rem; font-weight: 700; color: ${parseFloat(currentA) >= 5.5 && parseFloat(currentA) <= 10.5 ? 'var(--neon-green)' : (parseFloat(currentA) > 10.5 ? 'var(--neon-red)' : 'var(--neon-orange)')}; margin-top: 4px;">
                        ${currentA} A
                    </div>
                    <div style="font-size: 0.8rem; font-weight: bold; margin-top: 4px; color: ${parseFloat(currentA) >= 5.0 && parseFloat(currentA) <= 10.5 ? 'var(--neon-green)' : (parseFloat(currentA) > 10.5 ? 'var(--neon-red)' : 'var(--text-muted)')};">
                        STATUS: ${state.coilCurrentStatus || "STANDBY"}
                    </div>
                    <button 
                        class="btn" 
                        style="margin-top: 10px; width: 100%; padding: 6px; font-size: 0.75rem; border-color: var(--neon-cyan); color: var(--neon-cyan);"
                        onClick=${() => sendAction('probeCoil')}
                        disabled=${!state.connected || state.isRunning}
                    >
                        🔍 CHECK COIL / PROBE (1x TEST)
                    </button>
                </div>

                <div style="background: rgba(255,255,255,0.03); border: 1px solid var(--border-sharp); border-radius: 4px; padding: 14px; display: flex; flex-direction: column; justify-content: center;">
                    <div style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 4px;">3-PIN DIAGNOSTIC CRITERIA:</div>
                    <div style="font-size: 0.85rem; color: var(--text-primary); line-height: 1.5;">
                        • <strong>6.5A - 9.0A:</strong> Transistor Internal Prima (Optimal)<br/>
                        • <strong>Di bawah 5.0A:</strong> Igniter Loyo / Degraded (Gejala Brebet)<br/>
                        • <strong>0.0A:</strong> Transistor Internal Putus / Rusak Total
                    </div>
                </div>
            </div>
        </div>

        <!-- BODY LEAKAGE DETECTION CARD -->
        <${LeakageCard} state=${state} sendAction=${sendAction} />

        <!-- PIN INFO CARD -->
        <div class="panel" style="margin-top: var(--space-md); grid-column: 1 / -1;">
            <div class="panel-header">
                <span>3-PIN ACTIVE COIL PINOUT & WIRING</span>
            </div>
            <div style="font-size: 0.85rem; color: var(--text-primary); line-height: 1.6;">
                • <strong>PIN 1 (+12V):</strong> Sambungkan ke +12V Power Supply<br/>
                • <strong>PIN 2 (GND):</strong> Sambungkan ke Terminal Ground Alat (Melalui Sensor Arus)<br/>
                • <strong>PIN 3 (IGT):</strong> Sambungkan ke Terminal <strong>IGT Pin 25</strong>
            </div>
        </div>
        
        <!-- PANDUAN & TATA CARA PENGUJIAN KOIL 3-PIN -->
        <details class="panel" style="margin-top: var(--space-md); grid-column: 1 / -1; border-color: var(--neon-orange);" open>
            <summary class="panel-header" style="cursor: pointer; user-select: none; color: var(--neon-orange); font-weight: bold; letter-spacing: 0.05em;">
                📖 TATA CARA & PANDUAN PENGUJIAN KOIL 3-PIN LENGKAP ▾
            </summary>
            <div style="padding-top: var(--space-md); font-size: 0.85rem; color: var(--text-primary); line-height: 1.6;">
                
                <div style="background: rgba(255, 149, 0, 0.06); border-left: 3px solid var(--neon-orange); padding: 10px 14px; border-radius: 4px; margin-bottom: 14px;">
                    <strong style="color: var(--neon-orange);">🎯 TUJUAN DIAGNOSA KOIL 3-PIN:</strong><br/>
                    Memastikan kekuatan pengapian transistor igniter internal koil di bawah beban kompresi tinggi, mendeteksi igniter drop (penyebab brebet saat nanjak/beban AC), dan kebocoran kilovolt.
                </div>

                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 14px; margin-bottom: 14px;">
                    <div style="background: rgba(255,255,255,0.02); border: 1px solid var(--border-sharp); border-radius: 4px; padding: 12px;">
                        <strong style="color: var(--neon-cyan, #00d4ff);">1. KONEKSI KABEL KOIL 3-PIN:</strong>
                        <ul style="margin: 6px 0 0 16px; padding: 0; font-size: 0.8rem;">
                            <li><strong>Pin 1 (+B):</strong> Sambung ke +12V Aki (via ACS712).</li>
                            <li><strong>Pin 2 (GND):</strong> Sambung ke Ground Aki 12V.</li>
                            <li><strong>Pin 3 (IGT):</strong> Sambung ke Pin IGT Output (Pin 25).</li>
                            <li><strong>Probe Leak:</strong> Pasang kawat sensor di karet batang koil.</li>
                        </ul>
                    </div>

                    <div style="background: rgba(255,255,255,0.02); border: 1px solid var(--border-sharp); border-radius: 4px; padding: 12px;">
                        <strong style="color: var(--neon-green);">2. SETTING CELAH BUSI (SPARK GAP):</strong>
                        <div style="font-size: 0.8rem; margin-top: 6px;">
                            • Gunakan <strong>Adjustable Spark Gap Tester</strong>.<br/>
                            • Pasang celah di <strong>10 mm s/d 12 mm</strong> (setara tekanan kompresi 15 Bar di mobil).<br/>
                            • Koil sehat wajib melompati celah 10-12 mm dengan kilatan biru tebal dan suara cetak-cetak nyaring.
                        </div>
                    </div>
                </div>

                <div style="background: rgba(255,255,255,0.02); border: 1px solid var(--border-sharp); border-radius: 4px; padding: 12px; margin-bottom: 14px;">
                    <strong style="color: var(--neon-purple);">3. TAHAP PENGUJIAN & DETEKSI KERUSAKAN:</strong>
                    <ol style="margin: 6px 0 0 16px; padding: 0; font-size: 0.8rem;">
                        <li><strong>Uji Arus Primer (PEAK CURRENT):</strong> Koil sehat menarik arus <strong>6.5A s/d 9.0A</strong>. Jika di bawah 5.0A berarti igniter internal drop (penyebab brebet). Jika >11.0A berarti kumparan korslet.</li>
                        <li><strong>Uji Dwell Singkat (2.0 ms @ 5000 RPM):</strong> Geser Dwell ke 2.0 ms. Koil prima tetap mampu menembak api stabil. Jika api mati/redup, koil sudah lemah.</li>
                        <li><strong>Uji Ketahanan Panas (Endurance Test):</strong> Jalankan mode <strong>SWEEP</strong> selama 5-10 menit. Koil yang rusak akan mulai putus-putus apinya saat badan koil mulai hangat.</li>
                        <li><strong>Uji Kebocoran Bodi:</strong> Perhatikan kartu <strong>LEAKAGE DETECTOR</strong> di atas. Jika muncul status kuning/merah atau buzzer berbunyi, isolator batang koil bocor.</li>
                    </ol>
                </div>

                <!-- PANDUAN TROUBLESHOOTING KESALAHAN KONEKSI KABEL -->
                <div style="background: rgba(255, 45, 85, 0.06); border: 1px solid var(--neon-red); border-radius: 4px; padding: 12px;">
                    <strong style="color: var(--neon-red);">⚠️ PANDUAN JIKA PENYAMBUNGAN KABEL TIDAK BENAR:</strong>
                    <div style="margin-top: 8px; font-size: 0.8rem; line-height: 1.5;">
                        • <strong>Arus Primer Terbaca 0.0A (NO CURRENT):</strong><br/>
                        <span style="color: var(--text-muted); margin-left: 12px;">
                            → Kabel <strong>+12V</strong> atau <strong>GND</strong> belum terhubung ke koil.<br/>
                            → Kabel <strong>IGT (Pin 25)</strong> salah colok pin atau switch tegangan 5V/12V salah.<br/>
                            → Transistor igniter di dalam kepala koil putus total.
                        </span><br/>

                        • <strong>Status OVERCURRENT (>11A) / Koil Sangat Panas:</strong><br/>
                        <span style="color: var(--text-muted); margin-left: 12px;">
                            → <em>MATIKAN SEGERA!</em> Kabel IGT atau +12V tersambung ke pin yang salah, atau kumparan primer korslet internal.
                        </span><br/>

                        • <strong>Buzzer Kebocoran Berbunyi / Api Melompat Liar:</strong><br/>
                        <span style="color: var(--text-muted); margin-left: 12px;">
                            → <strong>Penjepit Ground Busi belum terpasang ke Ground Aki!</strong> Pasang penjepit buaya spark gap ke Ground Aki agar api tidak melompat liar ke bodi.
                        </span>
                    </div>
                </div>

            </div>
        </details>

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
                    disabled=${!state.connected || (state.runMode === 3 && state.isRunning)}
                />
                <${Dial} 
                    label="RPM STEP SIZE"
                    value=${state.rpmStep}
                    unit="RPM"
                    min="10"
                    max="1000"
                    step="10"
                    onChange=${(val) => sendAction('setRpmStep', val)}
                    disabled=${!state.connected}
                />
            </div>
        </details>
    `;
}
