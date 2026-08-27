import { html, useState } from '../preact.js';
import { Dial } from './Dial.js';
import { SparkCadenceCard } from './SparkCadenceCard.js';
import { AdvancedTuningPanel } from './AdvancedTuningPanel.js';
import { SafetyTriggerBar } from './SafetyTriggerBar.js';

export function DashboardCoilActive3P({ state, sendAction, modeSelector }) {
    const isSweep = state.runMode === 3;
    const [maxRpmLimit, setMaxRpmLimit] = useState(16000);
    const [maxDwellLimit, setMaxDwellLimit] = useState(5.0);

    const handleMaxRpmChange = (newMax) => {
        setMaxRpmLimit(newMax);
        if (state.rpm > newMax) sendAction('setRpm', newMax);
    };

    const handleMaxDwellChange = (newMax) => {
        setMaxDwellLimit(newMax);
        if (state.dwellMs > newMax) sendAction('setDwell', newMax);
    };
    
    return html`
        <!-- 3-PIN TRI-DIMENSION IGNITION ANALYZER & BODY LEAK MONITOR (UNIFIED TOP TELEMETRY) -->
        <${SparkCadenceCard} state=${state} sendAction=${sendAction} title="3-PIN IGNITION & INSULATION ANALYZER" />

        <!-- ENGINE SPEED & DWELL TIME CONTROL ROW (DYNAMIC 0-100% SCALING ACCORDING TO LIMITS) -->
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; grid-column: 1 / -1; margin-top: 6px;">
            <${Dial} 
                compact=${true}
                label=${(isSweep && state.isRunning) ? "SWEEPING..." : (isSweep ? "TARGET RPM" : "ENGINE SPEED")}
                value=${(isSweep && state.isRunning) ? state.currentRpm : state.rpm}
                unit="RPM"
                min="0"
                max=${maxRpmLimit}
                step=${state.rpmStep || 50}
                onChange=${(val) => sendAction('setRpm', val)}
                disabled=${!state.connected || (isSweep && state.isRunning)}
            />
            
            <${Dial} 
                compact=${true}
                label="DWELL TIME (IGT)"
                value=${state.dwellMs}
                unit="MS"
                min="0.0"
                max=${maxDwellLimit}
                step="0.1"
                subInfo=${"Duty: " + (state.dutyCycle ? state.dutyCycle.toFixed(1) : "0.0") + "%"}
                onChange=${(val) => sendAction('setDwell', val)}
                disabled=${!state.connected}
            />
        </div>

        <!-- ADVANCED RANGE LIMITS & FINE TUNING DIRECTLY BELOW ENGINE SPEED & DWELL -->
        <${AdvancedTuningPanel} 
            state=${state} 
            sendAction=${sendAction} 
            maxRpmLimit=${maxRpmLimit} 
            onMaxRpmChange=${handleMaxRpmChange}
            maxDwellLimit=${maxDwellLimit}
            onMaxDwellChange=${handleMaxDwellChange}
        />

        ${modeSelector}

        <!-- PANDUAN PENGUJIAN & PINOUT (COLLAPSIBLE BY DEFAULT) -->
        <details class="panel" style="margin-top: 8px; grid-column: 1 / -1; border-color: var(--border-sharp);">
            <summary class="panel-header" style="cursor: pointer; user-select: none; color: var(--neon-orange); font-weight: bold; letter-spacing: 0.05em;">
                📖 PANDUAN PENGUJIAN, PINOUT & WIRING KOIL 3-PIN ▾
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
                        <li><strong>Uji Kebocoran Bodi:</strong> Perhatikan status <strong>LEAK BODI</strong> di atas. Jika muncul status kuning/merah atau buzzer berbunyi, isolator batang koil bocor.</li>
                    </ol>
                </div>

                <!-- PANDUAN TROUBLESHOOTING KESALAHAN KONEKSI KABEL -->
                <div style="background: rgba(255, 45, 85, 0.06); border: 1px solid var(--neon-red); border-radius: 4px; padding: 12px;">
                    <strong style="color: var(--neon-red);">⚠️ PANDUAN JIKA PENYAMBUNGAN KABEL TIDAK BENAR:</strong>
                    <div style="margin-top: 8px; font-size: 0.8rem; line-height: 1.5;">
                        • <strong>Arus Primer Terbaca 0.0A (NO CURRENT):</strong> Periksa kabel +12V/GND, switch tegangan 5V/12V, atau igniter koil putus.<br/>
                        • <strong>Status OVERCURRENT (>11A) / Koil Sangat Panas:</strong> Matikan segera! Kabel IGT/+12V salah colok atau kumparan primer korslet internal.<br/>
                        • <strong>Buzzer Kebocoran Berbunyi / Api Melompat Liar:</strong> Penjepit Ground Busi belum terpasang ke Ground Aki!
                    </div>
                </div>

            </div>
        </details>

        <!-- STICKY BOTTOM SAFETY TRIGGER & EMERGENCY STOP BAR (LOCKED TO BOTTOM) -->
        <${SafetyTriggerBar} state=${state} sendAction=${sendAction} label="IGT TRIGGER" />
    `;
}
