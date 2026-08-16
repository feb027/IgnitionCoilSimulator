import { html } from '../preact.mjs';
import { Dial } from './Dial.js';

export function DashboardSpeedo({ state, sendAction, modeSelector }) {
    const isSweep = state.runMode === 3;
    const isRunning = state.isRunning;
    const ppr = state.speedoTachoPpr || 2.0;
    const ppk = state.pulsePerKm || 4000;
    const gaugeCurve = state.speedoGaugeCurve !== undefined ? state.speedoGaugeCurve : 0; // 0: Non-Linear (sqrt), 1: Linear
    const dacRouting = state.speedoDacRouting !== undefined ? state.speedoDacRouting : 3; // 0: Dual PWM, 1: DAC Fuel, 2: DAC Temp, 3: Dual MCP4725

    const dacFuelDetected = state.speedoDacFuelDetected || false;
    const dacTempDetected = state.speedoDacTempDetected || false;

    const enableKmh = state.speedoEnableKmh !== false;
    const enableRpm = state.speedoEnableRpm !== false;
    const enableTemp = state.speedoEnableTemp !== false;
    const enableFuel = state.speedoEnableFuel !== false;

    // Per-channel sweeping status
    const isKmhSweeping = isSweep && isRunning && enableKmh;
    const isRpmSweeping = isSweep && isRunning && enableRpm;
    const isTempSweeping = isSweep && isRunning && enableTemp;
    const isFuelSweeping = isSweep && isRunning && enableFuel;

    const liveKmh = isKmhSweeping ? (state.currentSpeedoKmh !== undefined ? state.currentSpeedoKmh : state.speedoKmh) : (enableKmh ? state.speedoKmh : 0);
    const liveRpm = isRpmSweeping ? (state.currentSpeedoRpm !== undefined ? state.currentSpeedoRpm : state.speedoRpm) : (enableRpm ? state.speedoRpm : 0);
    const liveTemp = isTempSweeping ? (state.currentSpeedoTemp !== undefined ? state.currentSpeedoTemp : state.speedoTempPercent) : (enableTemp ? state.speedoTempPercent : 0);
    const liveFuel = isFuelSweeping ? (state.currentSpeedoFuel !== undefined ? state.currentSpeedoFuel : state.speedoFuelPercent) : (enableFuel ? state.speedoFuelPercent : 0);

    const hzKmh = enableKmh ? ((liveKmh * ppk) / 3600.0).toFixed(1) : '0.0';
    const hzRpm = enableRpm ? ((liveRpm * ppr) / 60.0).toFixed(1) : '0.0';

    // Calculate effective PWM duty cycle & DAC Voltage for thermal/sqrt compensation
    const calcEffectiveFrac = (percent) => {
        const frac = Math.max(0, Math.min(1, Number(percent) / 100));
        return (gaugeCurve === 0) ? Math.sqrt(frac) : frac;
    };

    const fuelFrac = calcEffectiveFrac(liveFuel);
    const tempFrac = calcEffectiveFrac(liveTemp);

    const fuelPwmDuty = (fuelFrac * 100).toFixed(1);
    const tempPwmDuty = (tempFrac * 100).toFixed(1);
    const fuelDacVolt = (fuelFrac * 5.0).toFixed(2);
    const tempDacVolt = (tempFrac * 5.0).toFixed(2);

    const isFuelDacActive = (dacRouting === 3 || dacRouting === 1);
    const isTempDacActive = (dacRouting === 3 || dacRouting === 2);

    const renderChannelToggle = (label, channelKey, isEnabled, liveHz) => html`
        <div class="channel-toggle-bar">
            <span style="font-size: 0.82rem; font-weight: 700; letter-spacing: 0.05em;">
                ${label} ${liveHz && isEnabled ? html`<span style="opacity: 0.6; font-size: 0.72rem; margin-left: 4px;">(${liveHz} Hz)</span>` : ''}
            </span>
            <button 
                class="btn ${isEnabled ? 'btn-active' : ''}" 
                style="padding: 6px 12px; font-size: 0.75rem; border-radius: 3px; letter-spacing: 0.05em;"
                onClick=${() => sendAction('setSpeedoEnable', { channel: channelKey, value: !isEnabled })}
                disabled=${!state.connected}
            >
                ${isEnabled ? 'CH: ON (AKTIF)' : 'CH: OFF (MUTED)'}
            </button>
        </div>
    `;

    const ppkPresets = [
        { label: '2548 (JIS Japan)', val: 2548 },
        { label: '4000 (Universal)', val: 4000 },
        { label: '6000 (Custom)', val: 6000 },
        { label: '8000 (Euro)', val: 8000 }
    ];

    const pprPresets = [
        { label: '1.0 PPR (1-Cyl/ECU)', val: 1.0 },
        { label: '2.0 PPR (4-Cyl)', val: 2.0 },
        { label: '3.0 PPR (6-Cyl)', val: 3.0 },
        { label: '4.0 PPR (8-Cyl)', val: 4.0 },
        { label: '0.5 PPR (Wasted)', val: 0.5 }
    ];

    return html`
        <div class="panel-main" style="display: flex; flex-direction: column; gap: var(--space-sm);">
            ${renderChannelToggle('SPEED (KM/H)', 'kmh', enableKmh, isRunning && enableKmh ? hzKmh : '0.0')}
            <${Dial} 
                label=${isSweep ? ("TARGET SPEED (MAKS SWEEP: " + state.speedoKmh + " KM/H)") : "ACTUAL SPEED"}
                value=${state.speedoKmh}
                displayValue=${!enableKmh ? (isRunning ? 0 : state.speedoKmh) : (isKmhSweeping ? liveKmh : state.speedoKmh)}
                unit="KM/H"
                min="0"
                max="300"
                step=${state.speedoKmhStep || 10}
                subInfo=${!enableKmh 
                    ? "CH: OFF (Muted) — Pin 2 diam / tidak di-sweep" 
                    : (isKmhSweeping 
                        ? ("Live Sweep: " + liveKmh + " KM/H (" + hzKmh + " Hz) [Pin 2 AKTIF]") 
                        : (isRunning ? ("Output: " + hzKmh + " Hz [Pin 2 AKTIF]") : "Standby (Siap)"))}
                onChange=${(val) => sendAction('setSpeedoKmh', val)}
                disabled=${!state.connected || isKmhSweeping}
            />
        </div>
        
        <div class="panel-side-top" style="display: flex; flex-direction: column; gap: var(--space-md);">
            <!-- TACHO RPM PANEL -->
            <div class="panel" style="padding: 14px;">
                ${renderChannelToggle('TACHO (RPM)', 'rpm', enableRpm, isRunning && enableRpm ? hzRpm : '0.0')}
                <${Dial} 
                    label=${isSweep ? ("TARGET TACHO (MAKS SWEEP: " + state.speedoRpm + " RPM)") : "ACTUAL TACHO"}
                    value=${state.speedoRpm}
                    displayValue=${!enableRpm ? (isRunning ? 0 : state.speedoRpm) : (isRpmSweeping ? liveRpm : state.speedoRpm)}
                    unit="RPM"
                    min="0"
                    max="16000"
                    step=${state.speedoRpmStep || 500}
                    subInfo=${!enableRpm 
                        ? "CH: OFF (Muted) — Pin 4 diam / tidak di-sweep" 
                        : (isRpmSweeping 
                            ? ("Live Sweep: " + liveRpm + " RPM (" + hzRpm + " Hz) [Pin 4 AKTIF]") 
                            : (isRunning ? ("Output: " + hzRpm + " Hz [Pin 4] (" + ppr + " PPR)") : "Standby (Siap)"))}
                    onChange=${(val) => sendAction('setSpeedoRpm', val)}
                    disabled=${!state.connected || isRpmSweeping}
                />
            </div>

            <!-- TEMPERATURE GAUGE PANEL -->
            <div class="panel" style="padding: 14px;">
                ${renderChannelToggle('TEMPERATURE GAUGE', 'temp', enableTemp, null)}
                <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 4px; margin-bottom: 8px;">
                    <button class="btn ${state.speedoTempPercent === 0 ? 'btn-active' : ''}" style="padding: 6px 2px; font-size: 0.72rem;" onClick=${() => sendAction('setSpeedoTemp', 0)} disabled=${!state.connected || isTempSweeping}>COLD 0%</button>
                    <button class="btn ${state.speedoTempPercent === 50 ? 'btn-active' : ''}" style="padding: 6px 2px; font-size: 0.72rem;" onClick=${() => sendAction('setSpeedoTemp', 50)} disabled=${!state.connected || isTempSweeping}>NORM 50%</button>
                    <button class="btn ${state.speedoTempPercent === 80 ? 'btn-active' : ''}" style="padding: 6px 2px; font-size: 0.72rem;" onClick=${() => sendAction('setSpeedoTemp', 80)} disabled=${!state.connected || isTempSweeping}>HOT 80%</button>
                    <button class="btn ${state.speedoTempPercent === 100 ? 'btn-active' : ''}" style="padding: 6px 2px; font-size: 0.72rem; color: var(--neon-red);" onClick=${() => sendAction('setSpeedoTemp', 100)} disabled=${!state.connected || isTempSweeping}>MAX 100%</button>
                </div>
                <${Dial} 
                    label=${isSweep ? ("TARGET SUHU (MAKS: " + state.speedoTempPercent + "%)") : "ACTUAL TEMP"}
                    value=${state.speedoTempPercent}
                    displayValue=${!enableTemp ? (isRunning ? 0 : state.speedoTempPercent) : (isTempSweeping ? liveTemp : state.speedoTempPercent)}
                    unit="%"
                    min="0"
                    max="100"
                    step=${state.speedoTempStep || 5}
                    subInfo=${!enableTemp 
                        ? "CH: OFF (Muted) — Pin 13 diam" 
                        : (isTempDacActive 
                            ? ("DAC OUT 2 (0x61) -> " + tempDacVolt + "V DC Murni [Untuk LM358 Sink]") 
                            : ("Pin 13 PWM 5kHz -> " + tempPwmDuty + "% Duty [Filter LC/RC]"))}
                    onChange=${(val) => sendAction('setSpeedoTemp', val)}
                    disabled=${!state.connected || isTempSweeping}
                />
            </div>

            <!-- FUEL GAUGE PANEL -->
            <div class="panel" style="padding: 14px;">
                ${renderChannelToggle('FUEL GAUGE', 'fuel', enableFuel, null)}
                <div style="display: grid; grid-template-columns: repeat(5, 1fr); gap: 4px; margin-bottom: 8px;">
                    <button class="btn ${state.speedoFuelPercent === 0 ? 'btn-active' : ''}" style="padding: 6px 2px; font-size: 0.72rem;" onClick=${() => sendAction('setSpeedoFuel', 0)} disabled=${!state.connected || isFuelSweeping}>E (0%)</button>
                    <button class="btn ${state.speedoFuelPercent === 25 ? 'btn-active' : ''}" style="padding: 6px 2px; font-size: 0.72rem;" onClick=${() => sendAction('setSpeedoFuel', 25)} disabled=${!state.connected || isFuelSweeping}>1/4</button>
                    <button class="btn ${state.speedoFuelPercent === 50 ? 'btn-active' : ''}" style="padding: 6px 2px; font-size: 0.72rem;" onClick=${() => sendAction('setSpeedoFuel', 50)} disabled=${!state.connected || isFuelSweeping}>1/2</button>
                    <button class="btn ${state.speedoFuelPercent === 75 ? 'btn-active' : ''}" style="padding: 6px 2px; font-size: 0.72rem;" onClick=${() => sendAction('setSpeedoFuel', 75)} disabled=${!state.connected || isFuelSweeping}>3/4</button>
                    <button class="btn ${state.speedoFuelPercent === 100 ? 'btn-active' : ''}" style="padding: 6px 2px; font-size: 0.72rem;" onClick=${() => sendAction('setSpeedoFuel', 100)} disabled=${!state.connected || isFuelSweeping}>F (100%)</button>
                </div>
                <${Dial} 
                    label=${isSweep ? ("TARGET BENSIN (MAKS: " + state.speedoFuelPercent + "%)") : "ACTUAL FUEL"}
                    value=${state.speedoFuelPercent}
                    displayValue=${!enableFuel ? (isRunning ? 0 : state.speedoFuelPercent) : (isFuelSweeping ? liveFuel : state.speedoFuelPercent)}
                    unit="%"
                    min="0"
                    max="100"
                    step=${state.speedoFuelStep || 5}
                    subInfo=${!enableFuel 
                        ? "CH: OFF (Muted) — Pin 15 diam" 
                        : (isFuelDacActive 
                            ? ("DAC OUT 1 (0x60) -> " + fuelDacVolt + "V DC Murni [Untuk LM358 Sink]") 
                            : ("Pin 15 PWM 5kHz -> " + fuelPwmDuty + "% Duty [Filter LC/RC]"))}
                    onChange=${(val) => sendAction('setSpeedoFuel', val)}
                    disabled=${!state.connected || isFuelSweeping}
                />
            </div>
        </div>

        ${modeSelector}
        
        <div style="position: sticky; bottom: 16px; z-index: 100; margin-top: var(--space-md); grid-column: 1 / -1;">
            <button 
                class="btn btn-run ${state.isRunning ? 'is-running' : ''}"
                onClick=${() => sendAction('toggleRun')}
                disabled=${!state.connected}
                style="box-shadow: 0 4px 20px rgba(0,0,0,0.6);"
            >
                ${state.isRunning ? 'MASTER RUN: ON (AKTIF)' : 'MASTER RUN: OFF (STANDBY)'}
            </button>
        </div>
        
        <!-- ADVANCED SETTINGS & HARDWARE CROSS-ROUTING ACCORDION -->
        <details class="panel" style="margin-top: var(--space-md); grid-column: 1 / -1;">
            <summary class="panel-header" style="cursor: pointer; user-select: none; padding-bottom: 4px;">
                <span style="font-weight: 700; letter-spacing: 0.08em;">PENGATURAN JALUR OUTPUT HARDWARE & KALIBRASI ▾</span>
            </summary>
            
            <div style="display: flex; flex-direction: column; gap: var(--space-md); padding-top: var(--space-md);">
                
                <!-- HARDWARE ROUTING SELECTION -->
                <div style="background-color: #1a1a1a; padding: 12px; border-radius: 4px; border: 1px solid var(--border-sharp);">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                        <span style="font-size: 0.8rem; font-weight: 700; letter-spacing: 0.05em; color: var(--neon-blue);">
                            PILIHAN JALUR HARDWARE FUEL & TEMP (DUAL PILIHAN):
                        </span>
                        <div style="display: flex; gap: 6px;">
                            <span class="status-badge" style="font-size: 0.68rem; border-color: ${dacFuelDetected ? 'var(--neon-green)' : 'var(--border-sharp)'}; color: ${dacFuelDetected ? 'var(--neon-green)' : 'var(--text-muted)'};">
                                ${dacFuelDetected ? 'DAC 1 (0x60 FUEL): ON' : 'DAC 1 (0x60): OFFLINE'}
                            </span>
                            <span class="status-badge" style="font-size: 0.68rem; border-color: ${dacTempDetected ? 'var(--neon-green)' : 'var(--border-sharp)'}; color: ${dacTempDetected ? 'var(--neon-green)' : 'var(--text-muted)'};">
                                ${dacTempDetected ? 'DAC 2 (0x61 TEMP): ON' : 'DAC 2 (0x61): OFFLINE'}
                            </span>
                        </div>
                    </div>

                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 8px;">
                        <button 
                            class="btn ${dacRouting === 3 ? 'btn-active' : ''}"
                            style="padding: 10px 6px; font-size: 0.74rem; font-weight: bold; border-color: ${dacRouting === 3 ? 'var(--neon-green)' : 'var(--border-sharp)'};"
                            onClick=${() => sendAction('setSpeedoDacRouting', 3)}
                            disabled=${!state.connected || isSweep}
                        >
                            DUAL MCP4725 (0x60 FUEL + 0x61 TEMP DC MURNI)
                        </button>
                        <button 
                            class="btn ${dacRouting === 1 ? 'btn-active' : ''}"
                            style="padding: 10px 6px; font-size: 0.74rem; font-weight: bold; border-color: ${dacRouting === 1 ? 'var(--neon-green)' : 'var(--border-sharp)'};"
                            onClick=${() => sendAction('setSpeedoDacRouting', 1)}
                            disabled=${!state.connected || isSweep}
                        >
                            SINGLE MCP4725 FUEL (0x60) + PWM TEMP (PIN 13)
                        </button>
                        <button 
                            class="btn ${dacRouting === 0 ? 'btn-active' : ''}"
                            style="padding: 10px 6px; font-size: 0.74rem; font-weight: bold; border-color: ${dacRouting === 0 ? 'var(--neon-orange)' : 'var(--border-sharp)'};"
                            onClick=${() => sendAction('setSpeedoDacRouting', 0)}
                            disabled=${!state.connected || isSweep}
                        >
                            STANDAR DUAL PWM (PIN 13 & PIN 15 + FILTER LC/RC)
                        </button>
                        <button 
                            class="btn ${dacRouting === 2 ? 'btn-active' : ''}"
                            style="padding: 10px 6px; font-size: 0.74rem; font-weight: bold; border-color: ${dacRouting === 2 ? 'var(--neon-blue)' : 'var(--border-sharp)'};"
                            onClick=${() => sendAction('setSpeedoDacRouting', 2)}
                            disabled=${!state.connected || isSweep}
                        >
                            SINGLE MCP4725 TEMP (0x61) + PWM FUEL (PIN 15)
                        </button>
                    </div>
                    <div style="font-size: 0.72rem; color: var(--text-muted); margin-top: 8px; line-height: 1.4;">
                        • <b>Dual MCP4725:</b> Modul 1 (A0 ke GND -> Alamat 0x60) untuk Fuel dan Modul 2 (A0 ke VCC -> Alamat 0x61) untuk Temp. Keduanya menghasilkan tegangan analog 0-5V DC murni tanpa riak gelombang.<br/>
                        • <b>Standar Dual PWM:</b> Mengeluarkan pulsa PWM 5kHz di Pin 13 dan Pin 15 untuk digunakan bersama rangkaian Filter Perata Elco / LC / RC eksternal.
                    </div>
                </div>

                <!-- GAUGE CURVE SELECTION -->
                <div style="background-color: #1a1a1a; padding: 12px; border-radius: 4px; border: 1px solid var(--border-sharp);">
                    <label style="font-size: 0.8rem; font-weight: 700; letter-spacing: 0.05em; display: block; margin-bottom: 8px; color: var(--neon-green);">
                        KURVA RESPON JARUM BENSIN & SUHU:
                    </label>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                        <button 
                            class="btn ${gaugeCurve === 0 ? 'btn-active' : ''}"
                            style="padding: 10px 4px; font-size: 0.75rem; font-weight: bold; border-color: ${gaugeCurve === 0 ? 'var(--neon-green)' : 'var(--border-sharp)'};"
                            onClick=${() => sendAction('setSpeedoGaugeCurve', 0)}
                            disabled=${!state.connected || isSweep}
                        >
                            NON-LINIER (TERKALIBRASI THERMAL / AKAR KUADRAT)
                        </button>
                        <button 
                            class="btn ${gaugeCurve === 1 ? 'btn-active' : ''}"
                            style="padding: 10px 4px; font-size: 0.75rem; font-weight: bold; border-color: ${gaugeCurve === 1 ? 'var(--neon-orange)' : 'var(--border-sharp)'};"
                            onClick=${() => sendAction('setSpeedoGaugeCurve', 1)}
                            disabled=${!state.connected || isSweep}
                        >
                            LINIER 1:1 (STANDAR DC / PWM)
                        </button>
                    </div>
                </div>

                <!-- TACHO PPR PRESETS -->
                <div>
                    <label style="font-size: 0.8rem; font-weight: 700; letter-spacing: 0.05em; display: block; margin-bottom: 8px; color: var(--text-muted);">
                        TACHOMETER PULSES PER REV (PPR / CYLINDERS):
                    </label>
                    <div class="preset-btn-group">
                        ${pprPresets.map(p => html`
                            <button 
                                class="btn ${ppr === p.val ? 'btn-active' : ''}"
                                onClick=${() => sendAction('setTachoPpr', p.val)}
                                disabled=${!state.connected || isSweep}
                            >
                                ${p.label}
                            </button>
                        `)}
                    </div>
                </div>

                <!-- PPK PRESETS -->
                <div>
                    <label style="font-size: 0.8rem; font-weight: 700; letter-spacing: 0.05em; display: block; margin-bottom: 8px; color: var(--text-muted);">
                        PULSES PER KM (PPK PRESETS):
                    </label>
                    <div class="preset-btn-group">
                        ${ppkPresets.map(p => html`
                            <button 
                                class="btn ${ppk === p.val ? 'btn-active' : ''}"
                                onClick=${() => sendAction('setPulsePerKm', p.val)}
                                disabled=${!state.connected || isSweep}
                            >
                                ${p.label}
                            </button>
                        `)}
                    </div>
                </div>

                <!-- FINE TUNE PPK & SWEEP TIME -->
                <div class="responsive-grid-2">
                    <${Dial} 
                        label="FINE TUNE PPK"
                        value=${state.pulsePerKm}
                        unit="P/KM"
                        min="1000"
                        max="20000"
                        step="10"
                        onChange=${(val) => sendAction('setPulsePerKm', val)}
                        disabled=${!state.connected || isSweep}
                    />
                    <${Dial} 
                        label="SWEEP TIME"
                        value=${state.sweepTimeSec}
                        unit="SEC"
                        min="1"
                        max="60"
                        step="1"
                        onChange=${(val) => sendAction('setSweepTime', val)}
                        disabled=${!state.connected || isSweep}
                    />
                </div>

                <!-- STEP SIZES ROW 1: SPEED & RPM -->
                <div class="responsive-grid-2">
                    <${Dial} 
                        label="KMH STEP (ENCODER/UI)"
                        value=${state.speedoKmhStep}
                        unit="KM/H"
                        min="1"
                        max="50"
                        step="1"
                        onChange=${(val) => sendAction('setSpeedoKmhStep', val)}
                        disabled=${!state.connected || isSweep}
                    />
                    <${Dial} 
                        label="RPM STEP (ENCODER/UI)"
                        value=${state.speedoRpmStep}
                        unit="RPM"
                        min="10"
                        max="1000"
                        step="10"
                        onChange=${(val) => sendAction('setSpeedoRpmStep', val)}
                        disabled=${!state.connected || isSweep}
                    />
                </div>

                <!-- STEP SIZES ROW 2: TEMP & FUEL -->
                <div class="responsive-grid-2">
                    <${Dial} 
                        label="TEMP STEP (ENCODER/UI)"
                        value=${state.speedoTempStep}
                        unit="%"
                        min="1"
                        max="25"
                        step="1"
                        onChange=${(val) => sendAction('setSpeedoTempStep', val)}
                        disabled=${!state.connected || isSweep}
                    />
                    <${Dial} 
                        label="FUEL STEP (ENCODER/UI)"
                        value=${state.speedoFuelStep}
                        unit="%"
                        min="1"
                        max="25"
                        step="1"
                        onChange=${(val) => sendAction('setSpeedoFuelStep', val)}
                        disabled=${!state.connected || isSweep}
                    />
                </div>
            </div>
        </details>
    `;
}
