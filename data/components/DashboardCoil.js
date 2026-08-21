import { html } from '../preact.mjs';
import { Dial } from './Dial.js';

export function DashboardCoil({ state, sendAction, modeSelector }) {
    const isSweep = state.runMode === 3;
    const isAutoDiag = state.coilAutoDiagRunning;
    const health = (state.coilHealthPercent !== undefined) ? state.coilHealthPercent : 100.0;
    const fired = state.coilFiredCount || 0;
    const igf = state.coilIgfCount || 0;
    const missed = state.coilMissedCount || 0;
    const currentA = state.coilPeakCurrentA ? state.coilPeakCurrentA.toFixed(1) : "0.0";
    const verdict = state.coilDiagVerdict || "READY";

    // Dynamic color coding based on health
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
                label="DWELL TIME"
                value=${state.dwellMs}
                unit="MS"
                min="0.5"
                max="5.0"
                step="0.1"
                subInfo=${"Calculated Duty: " + (state.dutyCycle ? state.dutyCycle.toFixed(1) : "0.0") + "%"}
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
                ${state.isRunning ? 'COIL TRIGGER: ON' : 'COIL TRIGGER: OFF'}
            </button>
        </div>
        
        <!-- COIL HEALTH & IGF DIAGNOSTIC ANALYZER -->
        <div class="panel" style="margin-top: var(--space-md); grid-column: 1 / -1; border-color: ${healthColor};">
            <div class="panel-header" style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border-sharp); padding-bottom: 8px;">
                <span style="font-weight: 700; letter-spacing: 0.1em; color: ${healthColor};">
                    ⚡ COIL HEALTH & IGF DIAGNOSTIC ANALYZER
                </span>
                <span class="status-badge" style="border-color: ${healthColor}; color: ${healthColor};">
                    ${healthBadge}
                </span>
            </div>

            <!-- Telemetry Stats 4-Column Grid -->
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 12px; margin-top: var(--space-md);">
                <div style="background: rgba(255,255,255,0.03); border: 1px solid var(--border-sharp); border-radius: 4px; padding: 12px; text-align: center;">
                    <div style="font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase;">SPARK HEALTH</div>
                    <div style="font-size: 1.6rem; font-weight: 700; color: ${healthColor}; margin-top: 4px;">
                        ${fired > 0 ? health.toFixed(1) + "%" : "--%"}
                    </div>
                </div>

                <div style="background: rgba(255,255,255,0.03); border: 1px solid var(--border-sharp); border-radius: 4px; padding: 12px; text-align: center;">
                    <div style="font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase;">FIRED (IGT)</div>
                    <div style="font-size: 1.6rem; font-weight: 700; color: var(--text-primary); margin-top: 4px;">
                        ${fired}
                    </div>
                </div>

                <div style="background: rgba(255,255,255,0.03); border: 1px solid var(--border-sharp); border-radius: 4px; padding: 12px; text-align: center;">
                    <div style="font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase;">IGF CONFIRMED</div>
                    <div style="font-size: 1.6rem; font-weight: 700; color: var(--neon-green); margin-top: 4px;">
                        ${igf}
                    </div>
                </div>

                <div style="background: rgba(255,255,255,0.03); border: 1px solid var(--border-sharp); border-radius: 4px; padding: 12px; text-align: center;">
                    <div style="font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase;">MISSED SPARKS</div>
                    <div style="font-size: 1.6rem; font-weight: 700; color: ${missed > 0 ? 'var(--neon-red)' : 'var(--text-muted)'}; margin-top: 4px;">
                        ${missed}
                    </div>
                </div>

                <div style="background: rgba(255,255,255,0.03); border: 1px solid var(--border-sharp); border-radius: 4px; padding: 12px; text-align: center;">
                    <div style="font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase;">PEAK CURRENT (I_pk)</div>
                    <div style="font-size: 1.6rem; font-weight: 700; color: ${parseFloat(currentA) >= 5.5 && parseFloat(currentA) <= 10.5 ? 'var(--neon-green)' : (parseFloat(currentA) > 10.5 ? 'var(--neon-red)' : 'var(--neon-orange)')}; margin-top: 4px;">
                        ${currentA} A
                    </div>
                    <div style="font-size: 0.7rem; font-weight: bold; margin-top: 2px; color: ${parseFloat(currentA) >= 5.5 && parseFloat(currentA) <= 10.5 ? 'var(--neon-green)' : (parseFloat(currentA) > 10.5 ? 'var(--neon-red)' : 'var(--text-muted)')};">
                        ${state.coilCurrentStatus || "STANDBY"}
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

        <!-- PANDUAN & TATA CARA PENGUJIAN KOIL UMUM -->
        <details class="panel" style="margin-top: var(--space-md); grid-column: 1 / -1; border-color: var(--neon-cyan, #00d4ff);" open>
            <summary class="panel-header" style="cursor: pointer; user-select: none; color: var(--neon-cyan, #00d4ff); font-weight: bold; letter-spacing: 0.05em;">
                📖 TATA CARA & STANDAR PENGUJIAN KOIL PENGAPIAN ▾
            </summary>
            <div style="padding-top: var(--space-md); font-size: 0.85rem; color: var(--text-primary); line-height: 1.6;">
                
                <div style="background: rgba(0, 212, 255, 0.06); border-left: 3px solid var(--neon-cyan, #00d4ff); padding: 10px 14px; border-radius: 4px; margin-bottom: 14px;">
                    <strong style="color: var(--neon-cyan, #00d4ff);">🎯 STANDAR KELAYAKAN KOIL MOBIL:</strong><br/>
                    Koil yang lolos uji wajib memercik di celah 10-12 mm (setara kompresi 15 Bar), arus primer 6.5A-9.5A, dan tidak putus apinya saat mesin panas.
                </div>

                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 14px; margin-bottom: 14px;">
                    <div style="background: rgba(255,255,255,0.02); border: 1px solid var(--border-sharp); border-radius: 4px; padding: 12px;">
                        <strong style="color: var(--neon-green);">1. CELAH UJI (SPARK GAP 10 - 12 MM):</strong>
                        <div style="font-size: 0.8rem; margin-top: 6px;">
                            • Jarak celah 10-12 mm meniru hambatan kompresi 15 Bar di mobil.<br/>
                            • Koil sehat: Api biru keunguan tebal & padat.<br/>
                            • Koil lemah/brebet: Api kemerahan/kuning tipis & sering putus.
                        </div>
                    </div>

                    <div style="background: rgba(255,255,255,0.02); border: 1px solid var(--border-sharp); border-radius: 4px; padding: 12px;">
                        <strong style="color: var(--neon-orange);">2. TARGET ARUS PRIMER (PEAK CURRENT):</strong>
                        <div style="font-size: 0.8rem; margin-top: 6px;">
                            • <strong>6.5A - 9.5A:</strong> Normal (Optimal).<br/>
                            • <strong>Di bawah 5.0A:</strong> Kumparan/Igniter Loyo (Penyebab brebet).<br/>
                            • <strong>Di atas 11.0A:</strong> Kumparan Korslet Sebagian.
                        </div>
                    </div>
                </div>

                <div style="background: rgba(255,255,255,0.02); border: 1px solid var(--border-sharp); border-radius: 4px; padding: 12px; margin-bottom: 14px;">
                    <strong style="color: var(--neon-purple);">3. UJI PANAS DINAMIS (THERMAL TEST 5-10 MENIT):</strong>
                    <div style="font-size: 0.8rem; margin-top: 6px;">
                        Gunakan mode <strong>SWEEP</strong> selama 5-10 menit. Koil yang hanya pincang saat mesin panas akan mulai mengalami misfire / penurunan loncatan api setelah koil terasa hangat.
                    </div>
                </div>

                <!-- PANDUAN TROUBLESHOOTING KESALAHAN KONEKSI KABEL -->
                <div style="background: rgba(255, 45, 85, 0.06); border: 1px solid var(--neon-red); border-radius: 4px; padding: 12px;">
                    <strong style="color: var(--neon-red);">⚠️ PANDUAN JIKA PENYAMBUNGAN KABEL TIDAK BENAR:</strong>
                    <div style="margin-top: 8px; font-size: 0.8rem; line-height: 1.5;">
                        • <strong>Arus 0.0A & Tidak Ada Api:</strong> Periksa kabel +12V/GND dan pastikan sinyal trigger IGT terhubung ke pin yang benar di soket koil.<br/>
                        • <strong>Koil Sangat Cepat Panas (>11A):</strong> Matikan segera! Sinyal trigger atau kabel daya mengalami korsleting.<br/>
                        • <strong>Api Melompat Liar ke Bodi:</strong> Pastikan penjepit ground busi/spark gap terpasang kencang ke Ground Aki 12V.
                    </div>
                </div>

            </div>
        </details>
    `;
}
