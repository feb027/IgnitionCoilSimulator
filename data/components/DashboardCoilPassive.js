import { html } from '../preact.js';
import { Dial } from './Dial.js';
import { SparkCadenceCard } from './SparkCadenceCard.js';

export function DashboardCoilPassive({ state, sendAction, modeSelector }) {
    const isSweep = state.runMode === 3;
    
    return html`
        <!-- 2-PIN TRI-DIMENSION IGNITION ANALYZER & BODY LEAK MONITOR (UNIFIED TOP TELEMETRY) -->
        <${SparkCadenceCard} state=${state} sendAction=${sendAction} title="2-PIN IGNITION & INSULATION ANALYZER" />

        <!-- ENGINE SPEED & DWELL TIME CONTROL ROW (SIDE-BY-SIDE) -->
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; grid-column: 1 / -1; margin-top: 6px;">
            <${Dial} 
                compact=${true}
                label=${(isSweep && state.isRunning) ? "SWEEPING..." : (isSweep ? "TARGET RPM" : "ENGINE SPEED")}
                value=${(isSweep && state.isRunning) ? state.currentRpm : state.rpm}
                unit="RPM"
                min="0"
                max="12000"
                step=${state.rpmStep || 50}
                onChange=${(val) => sendAction('setRpm', val)}
                disabled=${!state.connected || (isSweep && state.isRunning)}
            />
            
            <${Dial} 
                compact=${true}
                label="DWELL TIME (IGBT)"
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
        
        <!-- COMPACT & HIGH-SAFETY MASTER TRIGGER BUTTON (BOTTOM) -->
        <div style="grid-column: 1 / -1; margin-top: 4px; padding: 6px; background: rgba(0,0,0,0.3); border: 1px solid var(--border-sharp); border-radius: 6px;">
            <button 
                class="btn ${state.isRunning ? 'is-running' : ''}"
                style="width: 100%; padding: 10px; font-size: 0.9rem; font-weight: 800; letter-spacing: 0.05em; border-color: ${state.isRunning ? 'var(--neon-red)' : 'var(--neon-green)'}; background: ${state.isRunning ? 'var(--neon-red)' : 'rgba(0, 255, 102, 0.12)'}; color: ${state.isRunning ? '#ffffff' : 'var(--neon-green)'}; cursor: pointer;"
                onClick=${() => sendAction('toggleRun')}
                disabled=${!state.connected}
            >
                ${state.runMode === 2 
                    ? (state.isRunning ? '⚡ FIRING SINGLE PULSE...' : '⚡ FIRE SINGLE PULSE')
                    : (state.runMode === 1
                        ? (state.isRunning ? '⚡ FIRING BURST 10x...' : '⚡ FIRE BURST (10x)')
                        : (state.isRunning ? '🔥 IGBT DRIVE: ON (RUNNING ⚡)' : '⚡ IGBT DRIVE: OFF (STANDBY 🛡️)'))}
            </button>
        </div>

        <!-- PANDUAN PENGUJIAN & PINOUT (COLLAPSIBLE BY DEFAULT) -->
        <details class="panel" style="margin-top: 10px; grid-column: 1 / -1; border-color: var(--border-sharp);">
            <summary class="panel-header" style="cursor: pointer; user-select: none; color: var(--neon-purple); font-weight: bold; letter-spacing: 0.05em;">
                📖 PANDUAN PENGUJIAN, PINOUT & WIRING KOIL PASIF (2-PIN) ▾
            </summary>
            <div style="padding-top: var(--space-md); font-size: 0.85rem; color: var(--text-primary); line-height: 1.6;">
                
                <div style="background: rgba(189, 0, 255, 0.06); border-left: 3px solid var(--neon-purple); padding: 10px 14px; border-radius: 4px; margin-bottom: 14px;">
                    <strong style="color: var(--neon-purple);">🎯 TUJUAN DIAGNOSA KOIL PASIF:</strong><br/>
                    Menguji induktansi kumparan primer & sekunder murni menggunakan IGBT internal tester, mengukur titik saturasi arus, serta menguji ketahanan isolasi terhadap tegangan tembus kilovolt.
                </div>

                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 14px; margin-bottom: 14px;">
                    <div style="background: rgba(255,255,255,0.02); border: 1px solid var(--border-sharp); border-radius: 4px; padding: 12px;">
                        <strong style="color: var(--neon-cyan, #00d4ff);">1. KONEKSI KABEL KOIL 2-PIN:</strong>
                        <ul style="margin: 6px 0 0 16px; padding: 0; font-size: 0.8rem;">
                            <li><strong>Pin (+) / Kl.15:</strong> Sambung ke +12V Aki (via ACS712).</li>
                            <li><strong>Pin (-) / Kl.1:</strong> Sambung ke Output IGBT Driver Tester (Pin 33).</li>
                            <li><strong>Kabel Busi Sekunder:</strong> Sambung ke Spark Gap Tester.</li>
                            <li><strong>Probe Leak:</strong> Pasang kawat sensor di leher bodi koil.</li>
                        </ul>
                    </div>

                    <div style="background: rgba(255,255,255,0.02); border: 1px solid var(--border-sharp); border-radius: 4px; padding: 12px;">
                        <strong style="color: var(--neon-green);">2. SETTING CELAH BUSI (SPARK GAP):</strong>
                        <div style="font-size: 0.8rem; margin-top: 6px;">
                            • Pasang celah jarum di <strong>10 mm s/d 12 mm</strong>.<br/>
                            • Koil pasif yang sehat wajib mampu melompati celah 10-12 mm secara padat dan stabil tanpa putus-putus.
                        </div>
                    </div>
                </div>

                <div style="background: rgba(255,255,255,0.02); border: 1px solid var(--border-sharp); border-radius: 4px; padding: 12px; margin-bottom: 14px;">
                    <strong style="color: var(--neon-orange);">3. TAHAP PENGUJIAN & DETEKSI KERUSAKAN:</strong>
                    <ol style="margin: 6px 0 0 16px; padding: 0; font-size: 0.8rem;">
                        <li><strong>Batas Dwell Aman (2.5 ms – 3.5 ms):</strong> Jangan menyetel Dwell melebihi 4.5 ms pada RPM rendah agar kumparan primer koil tidak mengalami panas berlebih.</li>
                        <li><strong>Uji Arus Primer (PEAK CURRENT):</strong> Koil sehat menarik arus <strong>6.0A s/d 8.5A</strong>. Jika arus melonjak >11A berarti ada lilitan primer yang korslet sebagian (*shorted turns*).</li>
                        <li><strong>Uji Ketahanan Panas:</strong> Jalankan mode <strong>SWEEP</strong> selama 5-10 menit. Koil yang rusak akan mengalami penurunan api saat badan koil mulai hangat.</li>
                    </ol>
                </div>

                <!-- PANDUAN TROUBLESHOOTING KESALAHAN KONEKSI KABEL -->
                <div style="background: rgba(255, 45, 85, 0.06); border: 1px solid var(--neon-red); border-radius: 4px; padding: 12px;">
                    <strong style="color: var(--neon-red);">⚠️ PANDUAN JIKA PENYAMBUNGAN KABEL TIDAK BENAR:</strong>
                    <div style="margin-top: 8px; font-size: 0.8rem; line-height: 1.5;">
                        • <strong>Tidak Ada Percikan Api & Arus 0.0A:</strong> Periksa kabel +12V Aki, kabel Pin 33 (IGBT Driver), atau lilitan primer koil putus.<br/>
                        • <strong>Arus Primer Sangat Tinggi (>12A) & Koil Panas Kilat:</strong> Matikan segera! Terminal (-) koil terhubung langsung ke Ground (tanpa melewati IGBT) atau primer korslet.<br/>
                        • <strong>Api Melompat Liar ke Bodi:</strong> Bodi spark tester/busi belum dijepitkan ke Ground Aki 12V!
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
