import { html, useState } from '../preact.js';
import { Dial } from './Dial.js';
import { SparkCadenceCard } from './SparkCadenceCard.js';
import { SweepControlPanel } from './SweepControlPanel.js';
import { AutoRandomPanel } from './AutoRandomPanel.js';
import { AdvancedTuningPanel } from './AdvancedTuningPanel.js';
import { CoilDatabaseCard } from './CoilDatabaseCard.js';
import { SafetyTriggerBar } from './SafetyTriggerBar.js';

export function DashboardCoilPassive({ state, sendAction, modeSelector }) {
    const isSweep = state.runMode === 3;
    const isRandom = state.runMode === 4;
    const [maxRpmLimit, setMaxRpmLimit] = useState(12000);
    const [maxDwellLimit, setMaxDwellLimit] = useState(5.0);
    const [isLocked, setIsLocked] = useState(true);
    const handleToggleLock = (val) => {
        if (typeof val === 'boolean') setIsLocked(val);
        else setIsLocked(prev => !prev);
    };

    const handleMaxRpmChange = (newMax) => {
        setMaxRpmLimit(newMax);
        if (state.rpm > newMax) sendAction('setRpm', newMax);
    };

    const handleMaxDwellChange = (newMax) => {
        setMaxDwellLimit(newMax);
        if (state.dwellMs > newMax) sendAction('setDwell', newMax);
    };
    
    return html`
        <!-- 2-PIN TRI-DIMENSION IGNITION ANALYZER & BODY LEAK MONITOR (UNIFIED TOP TELEMETRY) -->
        <${SparkCadenceCard} state=${state} sendAction=${sendAction} title="2-PIN IGNITION & INSULATION ANALYZER" isLocked=${isLocked} onToggleLock=${handleToggleLock} />

        <!-- MODE SELECTION TOOLBAR -->
        <div style="display: flex; gap: 4px; grid-column: 1 / -1; margin-top: 4px; background: rgba(0,0,0,0.3); padding: 4px; border-radius: 6px; border: 1px solid var(--border-sharp); overflow-x: auto;">
            <button class="btn ${state.runMode === 0 ? 'btn-active' : ''}" style="flex: 1; padding: 4px 8px; font-size: 0.72rem; font-weight: 800; min-width: 80px;" onClick=${() => sendAction('setRunMode', 0)}>
                ⚡ KONTINU
            </button>
            <button class="btn ${state.runMode === 3 ? 'btn-active' : ''}" style="flex: 1; padding: 4px 8px; font-size: 0.72rem; font-weight: 800; min-width: 80px;" onClick=${() => sendAction('setRunMode', 3)}>
                📈 SAPUAN
            </button>
            <button class="btn ${state.runMode === 4 ? 'btn-active' : ''}" style="flex: 1; padding: 4px 8px; font-size: 0.72rem; font-weight: 800; min-width: 110px; border-color: ${state.runMode === 4 ? '#c084fc' : 'var(--border-sharp)'}; color: ${state.runMode === 4 ? '#fff' : '#c084fc'};" onClick=${() => sendAction('setRunMode', 4)}>
                🔀 SIMULASI ACAK
            </button>
            <button class="btn ${state.runMode === 1 ? 'btn-active' : ''}" style="padding: 4px 8px; font-size: 0.72rem; font-weight: 800;" onClick=${() => sendAction('setRunMode', 1)}>
                📦 BURST
            </button>
            <button class="btn ${state.runMode === 2 ? 'btn-active' : ''}" style="padding: 4px 8px; font-size: 0.72rem; font-weight: 800;" onClick=${() => sendAction('setRunMode', 2)}>
                🎯 SINGLE
            </button>
        </div>

        <!-- AUTO-RANDOM / SWEEP MODE DUAL SLIDER / STANDARD DIALS -->
        ${isRandom ? html`
            <${AutoRandomPanel} 
                state=${state} 
                sendAction=${sendAction} 
                maxRpmLimit=${maxRpmLimit} 
                maxDwellLimit=${maxDwellLimit} 
            />
        ` : (isSweep ? html`
            <${SweepControlPanel} 
                state=${state} 
                sendAction=${sendAction} 
                maxRpmLimit=${maxRpmLimit} 
                maxDwellLimit=${maxDwellLimit} 
            />
        ` : html`
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; grid-column: 1 / -1; margin-top: 4px;">
                <${Dial} 
                    compact=${true}
                    label="ENGINE SPEED"
                    value=${state.rpm}
                    unit="RPM"
                    min="0"
                    max=${maxRpmLimit}
                    step=${state.rpmStep || 50}
                    onChange=${(val) => sendAction('setRpm', val)}
                    disabled=${!state.connected}
                />
                
                <${Dial} 
                    compact=${true}
                    label="DWELL TIME (IGBT)"
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
        `)}

        <!-- ADVANCED RANGE LIMITS, CALIBRATION MATRIX & FINE TUNING -->
        <${AdvancedTuningPanel} 
            state=${state} 
            sendAction=${sendAction} 
            maxRpmLimit=${maxRpmLimit} 
            onMaxRpmChange=${handleMaxRpmChange}
            maxDwellLimit=${maxDwellLimit}
            onMaxDwellChange=${handleMaxDwellChange}
        />

        <!-- VEHICLE SPECIFICATION & COIL BENCHMARK DATABASE -->
        <${CoilDatabaseCard} state=${state} sendAction=${sendAction} />

        ${modeSelector}

        <!-- PANDUAN PENGUJIAN & PINOUT (COLLAPSIBLE BY DEFAULT) -->
        <details class="panel" style="margin-top: 8px; grid-column: 1 / -1; border-color: var(--border-sharp);">
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

                <!-- PANDUAN TROUBLESHOOTING KESALAHAN KONEKSI KABEL -->
                <div style="background: rgba(255, 45, 85, 0.06); border: 1px solid var(--neon-red); border-radius: 4px; padding: 12px;">
                    <strong style="color: var(--neon-red);">⚠️ PANDUAN JIKA PENYAMBUNGAN KABEL TIDAK BENAR:</strong>
                    <div style="margin-top: 8px; font-size: 0.8rem; line-height: 1.5;">
                        • <strong>Tidak Ada Percikan Api & Arus 0.0A:</strong> Periksa kabel +12V Aki, kabel Pin 33 (IGBT Driver), atau lilitan primer koil putus.<br/>
                        • <strong>Arus Primer Sangat Tinggi (>12A) & Koil Panas Kilat:</strong> Matikan segera! Terminal (-) koil terhubung langsung ke Ground.<br/>
                        • <strong>Api Melompat Liar ke Bodi:</strong> Bodi spark tester/busi belum dijepitkan ke Ground Aki 12V!
                    </div>
                </div>

            </div>
        </details>

        <!-- STICKY BOTTOM SAFETY TRIGGER & EMERGENCY STOP BAR (LOCKED TO BOTTOM) -->
        <${SafetyTriggerBar} state=${state} sendAction=${sendAction} label="IGBT DRIVE" isLocked=${isLocked} onToggleLock=${handleToggleLock} />
    `;
}
