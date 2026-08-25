import { html } from '../preact.js';
import { Dial } from './Dial.js';

export function DashboardHallDac({ state, sendAction, modeSelector }) {
    const isRunning = state.isRunning;
    const voltage = Number(state.hallDacVoltage !== undefined ? state.hallDacVoltage : 2.50);
    const waveform = Number(state.hallDacWaveform !== undefined ? state.hallDacWaveform : 0);
    const freq = Number(state.hallDacFreqHz || 50);
    const domain = Number(state.hallDacDomain || 0); // 0: 5V Domain, 1: 12V Domain
    const profile = Number(state.hallDacProfile !== undefined ? state.hallDacProfile : (domain === 1 ? 11 : 1));
    const isFound = state.hallDacConnected;

    const profiles5V = [
        { id: 1, tag: 'TPS', title: 'TPS / PEDAL', sub: 'Gas & DBW' },
        { id: 2, tag: 'MAP', title: 'MAP SENSOR', sub: 'Tekanan Intake' },
        { id: 3, tag: 'AC-P', title: 'FREON AC', sub: 'Kompresor AC' },
        { id: 4, tag: 'FRP', title: 'FUEL RAIL', sub: 'Tekanan Rel' },
        { id: 5, tag: 'ECT', title: 'SUHU ECT', sub: 'Suhu Radiator' },
        { id: 6, tag: 'O2', title: 'SENSOR O2', sub: 'Lambda Knalpot' },
        { id: 7, tag: 'CKP', title: 'CKP 5V', sub: 'Pulsa Kruk As' },
        { id: 8, tag: 'VSS', title: 'VSS 5V', sub: 'Spidometer 5V' },
        { id: 0, tag: 'VADJ', title: 'MANUAL 5V', sub: 'Tegangan Bebas' }
    ];

    const profiles12V = [
        { id: 11, tag: 'VSS 12V', title: 'SPEEDO VSS', sub: 'Gearbox 12V NPN' },
        { id: 12, tag: 'CKP 12V', title: 'DELCO CKP', sub: 'Distributor 12V' },
        { id: 13, tag: 'ABS 12V', title: 'SENSOR ABS', sub: 'Roda Aktif 12V' },
        { id: 14, tag: 'GAUGE 12V', title: 'JARUM SPEEDO', sub: 'Kluster 0-12V' },
        { id: 15, tag: 'VADJ 12V', title: 'MANUAL 12V', sub: 'Op-Amp 0-12V' }
    ];

    const activeList = (domain === 1) ? profiles12V : profiles5V;
    const currentProfile = (activeList && activeList.length > 0)
        ? (activeList.find(p => p.id === profile) || activeList[0])
        : { id: 1, tag: 'TPS', title: 'TPS / PEDAL', sub: 'Gas & DBW' };

    const selectDomain = (d) => {
        sendAction('setHallDacDomain', d);
    };

    const selectProfile = (profId) => {
        sendAction('setHallDacProfile', profId);
    };

    const renderPresets = () => {
        // --- 5V PRESETS ---
        if (domain === 0) {
            if (profile === 1) { // TPS
                return html`
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px;">
                        <button class="btn ${Math.abs(voltage - 0.75) < 0.05 ? 'btn-active' : ''}" style="padding: 10px 4px; font-size: 0.75rem;" onClick=${() => { sendAction('setHallDacWaveform', 0); sendAction('setHallDacVoltage', 0.75); }}>0.75V [IDLE 0%]</button>
                        <button class="btn ${Math.abs(voltage - 2.50) < 0.05 ? 'btn-active' : ''}" style="padding: 10px 4px; font-size: 0.75rem;" onClick=${() => { sendAction('setHallDacWaveform', 0); sendAction('setHallDacVoltage', 2.50); }}>2.50V [SEDANG 50%]</button>
                        <button class="btn ${Math.abs(voltage - 4.50) < 0.05 ? 'btn-active' : ''}" style="padding: 10px 4px; font-size: 0.75rem;" onClick=${() => { sendAction('setHallDacWaveform', 0); sendAction('setHallDacVoltage', 4.50); }}>4.50V [GAS PENUH]</button>
                        <button class="btn ${waveform === 1 ? 'btn-active' : ''}" style="padding: 10px 4px; font-size: 0.75rem; border-color: var(--neon-green);" onClick=${() => sendAction('setHallDacWaveform', waveform === 1 ? 0 : 1)}>SAPUAN GAS</button>
                    </div>
                `;
            }
            if (profile === 2) { // MAP
                return html`
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px;">
                        <button class="btn ${Math.abs(voltage - 1.00) < 0.05 ? 'btn-active' : ''}" style="padding: 10px 4px; font-size: 0.75rem;" onClick=${() => sendAction('setHallDacVoltage', 1.00)}>1.00V [VAKUM IDLE]</button>
                        <button class="btn ${Math.abs(voltage - 2.50) < 0.05 ? 'btn-active' : ''}" style="padding: 10px 4px; font-size: 0.75rem;" onClick=${() => sendAction('setHallDacVoltage', 2.50)}>2.50V [1-BAR ATM]</button>
                        <button class="btn ${Math.abs(voltage - 3.50) < 0.05 ? 'btn-active' : ''}" style="padding: 10px 4px; font-size: 0.75rem;" onClick=${() => sendAction('setHallDacVoltage', 3.50)}>3.50V [+0.5 BAR]</button>
                        <button class="btn ${Math.abs(voltage - 4.50) < 0.05 ? 'btn-active' : ''}" style="padding: 10px 4px; font-size: 0.75rem;" onClick=${() => sendAction('setHallDacVoltage', 4.50)}>4.50V [+1.0 BAR]</button>
                    </div>
                `;
            }
            if (profile === 3) { // AC Pressure
                return html`
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px;">
                        <button class="btn ${Math.abs(voltage - 1.00) < 0.05 ? 'btn-active' : ''}" style="padding: 10px 4px; font-size: 0.75rem;" onClick=${() => sendAction('setHallDacVoltage', 1.00)}>1.00V [KURANG FREON]</button>
                        <button class="btn ${Math.abs(voltage - 2.50) < 0.05 ? 'btn-active' : ''}" style="padding: 10px 4px; font-size: 0.75rem; border-color: var(--neon-green);" onClick=${() => sendAction('setHallDacVoltage', 2.50)}>2.50V [KOMPRESOR ON]</button>
                        <button class="btn ${Math.abs(voltage - 3.80) < 0.05 ? 'btn-active' : ''}" style="padding: 10px 4px; font-size: 0.75rem;" onClick=${() => sendAction('setHallDacVoltage', 3.80)}>3.80V [KIPAS CEPAT]</button>
                        <button class="btn ${Math.abs(voltage - 4.50) < 0.05 ? 'btn-active' : ''}" style="padding: 10px 4px; font-size: 0.75rem;" onClick=${() => sendAction('setHallDacVoltage', 4.50)}>4.50V [OVERPRESSURE]</button>
                    </div>
                `;
            }
            if (profile === 4) { // Fuel Rail
                return html`
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px;">
                        <button class="btn ${Math.abs(voltage - 0.80) < 0.05 ? 'btn-active' : ''}" style="padding: 10px 4px; font-size: 0.75rem;" onClick=${() => sendAction('setHallDacVoltage', 0.80)}>0.80V [0 BAR]</button>
                        <button class="btn ${Math.abs(voltage - 1.50) < 0.05 ? 'btn-active' : ''}" style="padding: 10px 4px; font-size: 0.75rem;" onClick=${() => sendAction('setHallDacVoltage', 1.50)}>1.50V [IDLE 300B]</button>
                        <button class="btn ${Math.abs(voltage - 2.60) < 0.05 ? 'btn-active' : ''}" style="padding: 10px 4px; font-size: 0.75rem;" onClick=${() => sendAction('setHallDacVoltage', 2.60)}>2.60V [SEDANG 800B]</button>
                        <button class="btn ${Math.abs(voltage - 4.20) < 0.05 ? 'btn-active' : ''}" style="padding: 10px 4px; font-size: 0.75rem;" onClick=${() => sendAction('setHallDacVoltage', 4.20)}>4.20V [MAKS 1600B]</button>
                    </div>
                `;
            }
            if (profile === 5) { // ECT/IAT
                return html`
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px;">
                        <button class="btn ${Math.abs(voltage - 4.00) < 0.05 ? 'btn-active' : ''}" style="padding: 10px 4px; font-size: 0.75rem;" onClick=${() => sendAction('setHallDacVoltage', 4.00)}>4.00V [DINGIN 0°C]</button>
                        <button class="btn ${Math.abs(voltage - 2.50) < 0.05 ? 'btn-active' : ''}" style="padding: 10px 4px; font-size: 0.75rem;" onClick=${() => sendAction('setHallDacVoltage', 2.50)}>2.50V [HANGAT 40°C]</button>
                        <button class="btn ${Math.abs(voltage - 0.80) < 0.05 ? 'btn-active' : ''}" style="padding: 10px 4px; font-size: 0.75rem;" onClick=${() => sendAction('setHallDacVoltage', 0.80)}>0.80V [NORM 90°C]</button>
                        <button class="btn ${Math.abs(voltage - 0.45) < 0.05 ? 'btn-active' : ''}" style="padding: 10px 4px; font-size: 0.75rem; border-color: var(--neon-red);" onClick=${() => sendAction('setHallDacVoltage', 0.45)}>0.45V [KIPAS ON 98°C]</button>
                    </div>
                `;
            }
            if (profile === 6) { // O2 Lambda
                return html`
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px;">
                        <button class="btn ${Math.abs(voltage - 0.15) < 0.05 ? 'btn-active' : ''}" style="padding: 10px 4px; font-size: 0.75rem;" onClick=${() => { sendAction('setHallDacWaveform', 0); sendAction('setHallDacVoltage', 0.15); }}>0.15V [KURUS]</button>
                        <button class="btn ${Math.abs(voltage - 0.45) < 0.05 ? 'btn-active' : ''}" style="padding: 10px 4px; font-size: 0.75rem;" onClick=${() => { sendAction('setHallDacWaveform', 0); sendAction('setHallDacVoltage', 0.45); }}>0.45V [IDEAL]</button>
                        <button class="btn ${Math.abs(voltage - 0.85) < 0.05 ? 'btn-active' : ''}" style="padding: 10px 4px; font-size: 0.75rem;" onClick=${() => { sendAction('setHallDacWaveform', 0); sendAction('setHallDacVoltage', 0.85); }}>0.85V [BOROS]</button>
                        <button class="btn ${waveform === 3 ? 'btn-active' : ''}" style="padding: 10px 4px; font-size: 0.75rem; border-color: var(--neon-green);" onClick=${() => { sendAction('setHallDacWaveform', waveform === 3 ? 0 : 3); sendAction('setHallDacFreq', 1); }}>SIKLUS 1 HZ</button>
                    </div>
                `;
            }
            if (profile === 7) { // CKP 5V
                return html`
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px;">
                        <button class="btn ${freq === 26 ? 'btn-active' : ''}" style="padding: 10px 4px; font-size: 0.75rem;" onClick=${() => sendAction('setHallDacFreq', 26)}>26 Hz [800 RPM]</button>
                        <button class="btn ${freq === 83 ? 'btn-active' : ''}" style="padding: 10px 4px; font-size: 0.75rem;" onClick=${() => sendAction('setHallDacFreq', 83)}>83 Hz [2500 RPM]</button>
                        <button class="btn ${freq === 133 ? 'btn-active' : ''}" style="padding: 10px 4px; font-size: 0.75rem;" onClick=${() => sendAction('setHallDacFreq', 133)}>133 Hz [4000 RPM]</button>
                        <button class="btn ${freq === 200 ? 'btn-active' : ''}" style="padding: 10px 4px; font-size: 0.75rem;" onClick=${() => sendAction('setHallDacFreq', 200)}>200 Hz [6000 RPM]</button>
                    </div>
                `;
            }
            if (profile === 8) { // VSS 5V
                return html`
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px;">
                        <button class="btn ${freq === 22 ? 'btn-active' : ''}" style="padding: 10px 4px; font-size: 0.75rem;" onClick=${() => sendAction('setHallDacFreq', 22)}>22 Hz [20 KM/JAM]</button>
                        <button class="btn ${freq === 66 ? 'btn-active' : ''}" style="padding: 10px 4px; font-size: 0.75rem;" onClick=${() => sendAction('setHallDacFreq', 66)}>66 Hz [60 KM/JAM]</button>
                        <button class="btn ${freq === 111 ? 'btn-active' : ''}" style="padding: 10px 4px; font-size: 0.75rem;" onClick=${() => sendAction('setHallDacFreq', 111)}>111 Hz [100 KM/JAM]</button>
                        <button class="btn ${freq === 177 ? 'btn-active' : ''}" style="padding: 10px 4px; font-size: 0.75rem;" onClick=${() => sendAction('setHallDacFreq', 177)}>177 Hz [160 KM/JAM]</button>
                    </div>
                `;
            }
            // Default 5V VADJ
            return html`
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px;">
                    <button class="btn" style="padding: 10px 4px; font-size: 0.75rem;" onClick=${() => sendAction('setHallDacVoltage', 0.50)}>0.50 V</button>
                    <button class="btn" style="padding: 10px 4px; font-size: 0.75rem;" onClick=${() => sendAction('setHallDacVoltage', 1.80)}>1.80 V</button>
                    <button class="btn" style="padding: 10px 4px; font-size: 0.75rem;" onClick=${() => sendAction('setHallDacVoltage', 3.30)}>3.30 V</button>
                    <button class="btn" style="padding: 10px 4px; font-size: 0.75rem;" onClick=${() => sendAction('setHallDacVoltage', 5.00)}>5.00 V</button>
                </div>
            `;
        }

        // --- 12V PRESETS ---
        if (profile === 11) { // VSS 12V
            return html`
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px;">
                    <button class="btn ${freq === 22 ? 'btn-active' : ''}" style="padding: 10px 4px; font-size: 0.75rem;" onClick=${() => sendAction('setHallDacFreq', 22)}>22 Hz [20 KM/J]</button>
                    <button class="btn ${freq === 66 ? 'btn-active' : ''}" style="padding: 10px 4px; font-size: 0.75rem;" onClick=${() => sendAction('setHallDacFreq', 66)}>66 Hz [60 KM/J]</button>
                    <button class="btn ${freq === 111 ? 'btn-active' : ''}" style="padding: 10px 4px; font-size: 0.75rem;" onClick=${() => sendAction('setHallDacFreq', 111)}>111 Hz [100 KM/J]</button>
                    <button class="btn ${freq === 177 ? 'btn-active' : ''}" style="padding: 10px 4px; font-size: 0.75rem;" onClick=${() => sendAction('setHallDacFreq', 177)}>177 Hz [160 KM/J]</button>
                </div>
            `;
        }
        if (profile === 12) { // CKP 12V
            return html`
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px;">
                    <button class="btn ${freq === 26 ? 'btn-active' : ''}" style="padding: 10px 4px; font-size: 0.75rem;" onClick=${() => sendAction('setHallDacFreq', 26)}>26 Hz [800 RPM]</button>
                    <button class="btn ${freq === 83 ? 'btn-active' : ''}" style="padding: 10px 4px; font-size: 0.75rem;" onClick=${() => sendAction('setHallDacFreq', 83)}>83 Hz [2500 RPM]</button>
                    <button class="btn ${freq === 133 ? 'btn-active' : ''}" style="padding: 10px 4px; font-size: 0.75rem;" onClick=${() => sendAction('setHallDacFreq', 133)}>133 Hz [4000 RPM]</button>
                    <button class="btn ${freq === 200 ? 'btn-active' : ''}" style="padding: 10px 4px; font-size: 0.75rem;" onClick=${() => sendAction('setHallDacFreq', 200)}>200 Hz [6000 RPM]</button>
                </div>
            `;
        }
        if (profile === 13) { // ABS 12V
            return html`
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px;">
                    <button class="btn ${freq === 50 ? 'btn-active' : ''}" style="padding: 10px 4px; font-size: 0.75rem;" onClick=${() => sendAction('setHallDacFreq', 50)}>50 Hz [30 KM/J]</button>
                    <button class="btn ${freq === 100 ? 'btn-active' : ''}" style="padding: 10px 4px; font-size: 0.75rem;" onClick=${() => sendAction('setHallDacFreq', 100)}>100 Hz [60 KM/J]</button>
                    <button class="btn ${freq === 150 ? 'btn-active' : ''}" style="padding: 10px 4px; font-size: 0.75rem;" onClick=${() => sendAction('setHallDacFreq', 150)}>150 Hz [90 KM/J]</button>
                    <button class="btn ${freq === 200 ? 'btn-active' : ''}" style="padding: 10px 4px; font-size: 0.75rem;" onClick=${() => sendAction('setHallDacFreq', 200)}>200 Hz [120 KM/J]</button>
                </div>
            `;
        }
        if (profile === 14) { // GAUGE 12V
            return html`
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px;">
                    <button class="btn ${Math.abs(voltage - 1.25) < 0.1 ? 'btn-active' : ''}" style="padding: 10px 4px; font-size: 0.75rem;" onClick=${() => sendAction('setHallDacVoltage', 1.25)}>3.0V [MIN/E]</button>
                    <button class="btn ${Math.abs(voltage - 2.50) < 0.1 ? 'btn-active' : ''}" style="padding: 10px 4px; font-size: 0.75rem;" onClick=${() => sendAction('setHallDacVoltage', 2.50)}>6.0V [HALF]</button>
                    <button class="btn ${Math.abs(voltage - 3.75) < 0.1 ? 'btn-active' : ''}" style="padding: 10px 4px; font-size: 0.75rem;" onClick=${() => sendAction('setHallDacVoltage', 3.75)}>9.0V [3/4]</button>
                    <button class="btn ${Math.abs(voltage - 5.00) < 0.1 ? 'btn-active' : ''}" style="padding: 10px 4px; font-size: 0.75rem;" onClick=${() => sendAction('setHallDacVoltage', 5.00)}>12.0V [FULL/F]</button>
                </div>
            `;
        }
        // Default 12V VADJ
        return html`
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px;">
                <button class="btn" style="padding: 10px 4px; font-size: 0.75rem;" onClick=${() => sendAction('setHallDacVoltage', 1.25)}>3.0 V (25%)</button>
                <button class="btn" style="padding: 10px 4px; font-size: 0.75rem;" onClick=${() => sendAction('setHallDacVoltage', 2.50)}>6.0 V (50%)</button>
                <button class="btn" style="padding: 10px 4px; font-size: 0.75rem;" onClick=${() => sendAction('setHallDacVoltage', 3.75)}>9.0 V (75%)</button>
                <button class="btn" style="padding: 10px 4px; font-size: 0.75rem;" onClick=${() => sendAction('setHallDacVoltage', 5.00)}>12.0 V (100%)</button>
            </div>
        `;
    };

    const isFreqMode = (profile === 7 || profile === 8 || profile === 11 || profile === 12 || profile === 13);
    const scaledVoltage12V = Number((voltage * 2.4).toFixed(2));

    return html`
        <!-- PILIHAN DOMAIN TEGANGAN: 5V STANDAR vs 12V TINGGI -->
        <div style="grid-column: 1 / -1; margin-bottom: 12px;">
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                <button 
                    class="btn ${domain === 0 ? 'btn-active' : ''}"
                    style="padding: 12px 6px; font-weight: 800; font-size: 0.82rem; border-color: ${domain === 0 ? 'var(--neon-green)' : 'var(--border-sharp)'};"
                    onClick=${() => selectDomain(0)}
                    disabled=${!state.connected}
                >
                    DOMAIN 5V (STANDAR ECU)
                </button>
                <button 
                    class="btn ${domain === 1 ? 'btn-active' : ''}"
                    style="padding: 12px 6px; font-weight: 800; font-size: 0.82rem; border-color: ${domain === 1 ? 'var(--neon-orange)' : 'var(--border-sharp)'}; color: ${domain === 1 ? 'var(--neon-orange)' : 'var(--text-primary)'};"
                    onClick=${() => selectDomain(1)}
                    disabled=${!state.connected}
                >
                    DOMAIN 12V (PULSA & OP-AMP)
                </button>
            </div>
        </div>

        <!-- GRID PROFIL SENSOR -->
        <div style="grid-column: 1 / -1; margin-bottom: 14px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                <span style="font-size: 0.75rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.08em;">
                    ${domain === 0 ? 'PROFIL SENSOR 5V (9 PILIHAN):' : 'PROFIL SENSOR 12V (5 PILIHAN):'}
                </span>
                <span style="font-size: 0.75rem; font-weight: bold; color: ${domain === 0 ? 'var(--neon-green)' : 'var(--neon-orange)'};">
                    ${currentProfile.tag}: ${currentProfile.title}
                </span>
            </div>
            
            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px;">
                ${activeList.map(p => html`
                    <button 
                        class="btn ${profile === p.id ? 'btn-active' : ''}"
                        style="padding: 10px 4px; text-align: center; border-radius: 4px; display: flex; flex-direction: column; justify-content: center; align-items: center; min-height: 52px; border-color: ${profile === p.id ? (domain === 1 ? 'var(--neon-orange)' : 'var(--neon-green)') : 'var(--border-sharp)'};"
                        onClick=${() => selectProfile(p.id)}
                        disabled=${!state.connected}
                    >
                        <div style="font-size: 0.82rem; font-weight: 800; letter-spacing: 0.05em; line-height: 1.2;">
                            ${p.tag}
                        </div>
                        <div style="font-size: 0.68rem; opacity: 0.75; margin-top: 3px; line-height: 1.1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%;">
                            ${p.sub}
                        </div>
                    </button>
                `)}
            </div>
        </div>

        <div class="panel-main">
            <div style="margin-bottom: 8px; font-size: 0.8rem; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: var(--text-muted);">
                TARGET: ${currentProfile.title} — ${currentProfile.sub}
            </div>
            
            ${isFreqMode ? html`
                <${Dial} 
                    label=${domain === 1 ? "FREKUENSI PULSA 12V (NPN OPEN-COLLECTOR)" : "FREKUENSI PULSA SENSOR 5V"}
                    value=${freq}
                    unit="HZ"
                    min="1"
                    max="500"
                    step="1"
                    subInfo=${(profile === 7 || profile === 12) ? ("Setara Putaran Mesin: ~" + (freq * 30) + " RPM") : ("Setara Laju Kendaraan: ~" + Math.round(freq * 0.9) + " KM/JAM")}
                    onChange=${(val) => sendAction('setHallDacFreq', val)}
                    disabled=${!state.connected}
                />
            ` : html`
                <${Dial} 
                    label=${waveform === 1 ? "SAPUAN TEGANGAN BERJALAN..." : (domain === 1 ? "TEGANGAN ANALOG 0 - 12V (VIA OP-AMP LM358)" : "TEGANGAN OUTPUT ANALOG 0 - 5.00V")}
                    value=${domain === 1 ? scaledVoltage12V : voltage}
                    unit="VOLT"
                    min=${domain === 1 ? "0.00" : "0.00"}
                    max=${domain === 1 ? "12.00" : "5.00"}
                    step=${domain === 1 ? "0.10" : "0.05"}
                    subInfo=${domain === 1 ? ("DAC Raw: " + Math.round((voltage / 5.0) * 4095) + " -> Output Op-Amp LM358: " + scaledVoltage12V + " V") : ("DAC 12-Bit: " + Math.round((voltage / 5.0) * 4095) + " / 4095 RAW (Resolusi 1.2 mV)")}
                    onChange=${(val) => {
                        const baseVolt = domain === 1 ? (val / 2.4) : val;
                        sendAction('setHallDacVoltage', Number(baseVolt.toFixed(2)));
                    }}
                    disabled=${!state.connected || (waveform === 1 && isRunning)}
                />
            `}
        </div>
        
        <div class="panel-side-top" style="display: flex; flex-direction: column; gap: var(--space-md);">
            <div class="panel" style="display: flex; flex-direction: column; justify-content: center; height: 100%; padding: 14px;">
                <div class="panel-header" style="margin-bottom: 8px;">
                    <span style="font-weight: 700; letter-spacing: 0.1em;">PRESET ${currentProfile.tag} CEPAT</span>
                </div>
                ${renderPresets()}
            </div>
        </div>

        ${modeSelector}
        
        <!-- TOMBOL RUN UTAMA -->
        <div class="sticky-run-bar">
            <button 
                class="btn btn-run ${isRunning ? 'is-running' : ''}"
                onClick=${() => sendAction('toggleRun')}
                disabled=${!state.connected}
            >
                ${isRunning ? (domain === 1 ? 'OUTPUT SENSOR 12V: AKTIF (ON)' : 'OUTPUT SENSOR 5V: AKTIF (ON)') : 'OUTPUT SENSOR: MATI (MUTED)'}
            </button>
        </div>
        
        <!-- PANDUAN PENGKABELAN & MODUL HARDWARE TAMBAHAN -->
        <div class="panel" style="margin-top: var(--space-md); grid-column: 1 / -1;">
            <div class="panel-header" style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border-sharp); padding-bottom: 8px;">
                <span style="font-weight: 700; letter-spacing: 0.1em; color: ${domain === 1 ? 'var(--neon-orange)' : 'var(--neon-green)'};">
                    ${domain === 1 ? '🛠️ HARDWARE TAMBAHAN & PANDUAN SENSOR 12V' : '📋 PANDUAN DIAGNOSA SENSOR 5V (LANGSUNG MCP4725)'}
                </span>
                <span class="status-badge" style="border-color: ${isFound ? 'var(--neon-green)' : 'var(--neon-red)'}; color: ${isFound ? 'var(--neon-green)' : 'var(--neon-red)'}; font-size: 0.75rem;">
                    ${isFound ? 'MCP4725: TERHUBUNG' : 'MCP4725: OFFLINE'}
                </span>
            </div>

            <div style="font-size: 0.82rem; color: var(--text-primary); line-height: 1.6; margin-top: 10px; font-family: monospace;">
                ${domain === 1 ? html`
                    [SKEMA 1: PULSA HALL 12V (NPN OPEN-COLLECTOR untuk VSS 12V / DELCO)]<br/>
                    • Komponen: 1x Transistor NPN (BC547 / 2N2222) + 1x Resistor 1k (Base) + 1x Resistor 4.7k (Pull-up ke 12V).<br/>
                    • Pin OUT MCP4725 -> Resistor 1k -> Base Transistor.<br/>
                    • Emitter Transistor -> GND Simulator & Bodi Mobil.<br/>
                    • Collector Transistor -> Sambung ke Kabel Sinyal Sensor 12V (Spidometer / ECU Delco).<br/>
                    <br/>
                    [SKEMA 2: ANALOG 0-12V LINIER (UNTUK JARUM SPEEDO / SENSOR 12V)]<br/>
                    • Gunakan IC Op-Amp LM358 (Non-Inverting Amplifier Gain 2.4x) dengan suplai 12V.<br/>
                    • Input Pin 3 LM358 <- Pin OUT MCP4725 (0-5V).<br/>
                    • Output Pin 1 LM358 -> Menghasilkan tegangan linier bersih 0.0V hingga 12.0V!
                ` : (profile === 1 ? html`
                    [KONEKSI] Hubungkan Pin OUT MCP4725 ke kabel sinyal TPS pada soket Throttle Body / ECU.<br/>
                    [UJI 1]   Pilih 0.75V [IDLE 0%]    -> Data scanner wajib terbaca Bukaan Gas 0%.<br/>
                    [UJI 2]   Pilih 4.50V [GAS PENUH]  -> Data scanner terbaca 100% dan motor DBW membuka penuh.
                ` : profile === 2 ? html`
                    [KONEKSI] Hubungkan Pin OUT MCP4725 ke kabel sinyal sensor MAP pada ECU.<br/>
                    [UJI 1]   Pilih 1.00V [VAKUM IDLE] -> Simulasi kondisi kevakuman intake stasioner (~30 kPa).<br/>
                    [UJI 2]   Pilih 2.50V [1-BAR ATM]  -> Tekanan atmosfer standar luar (~101 kPa).<br/>
                    [UJI 3]   Pilih 4.50V [+1.0 BAR]   -> Uji respon penambahan bensin & batas boost limiter ECU.
                ` : profile === 3 ? html`
                    [KONEKSI] Hubungkan Pin OUT MCP4725 ke kabel sinyal sensor tekanan Freon AC (3-Pin).<br/>
                    [UJI 1]   Pilih 2.50V [KOMPRESOR ON]  -> ECU mengizinkan relay magnetic clutch kompresor AC menyala.<br/>
                    [UJI 2]   Pilih 3.80V [KIPAS CEPAT]   -> ECU langsung menyalakan Extra Fan radiator kecepatan tinggi.<br/>
                    [UJI 3]   Pilih 1.00V [KURANG FREON]  -> ECU memutus kompresor AC (proteksi sistem).
                ` : profile === 4 ? html`
                    [KONEKSI] Hubungkan Pin OUT MCP4725 ke kabel sinyal Fuel Rail Pressure (Common Rail / GDI).<br/>
                    [UJI 1]   Pilih 1.50V [IDLE 300B]     -> Simulasi tekanan bensin/solar stasioner.<br/>
                    [UJI 2]   Pilih 4.20V [MAKS 1600B]    -> Uji beban tinggi (periksa koreksi buka-tutup katup SCV).
                ` : profile === 5 ? html`
                    [KONEKSI] Hubungkan Pin OUT MCP4725 ke kabel sinyal sensor suhu air radiator (ECT).<br/>
                    [UJI 1]   Pilih 4.00V [DINGIN 0°C]    -> Uji kenaikan RPM idle (choke otomatis aktif).<br/>
                    [UJI 2]   Pilih 0.45V [KIPAS ON 98°C] -> Relay kipas pendingin radiator wajib menyala otomatis.
                ` : profile === 6 ? html`
                    [KONEKSI] Hubungkan Pin OUT MCP4725 ke kabel sinyal sensor O2 knalpot.<br/>
                    [UJI 1]   Pilih 0.15V [KURUS]         -> Koreksi bahan bakar STFT scanner wajib positif (+%).<br/>
                    [UJI 2]   Pilih 0.85V [BOROS]         -> Koreksi bahan bakar STFT scanner wajib negatif (-%).<br/>
                    [UJI 3]   Pilih SIKLUS 1 HZ           -> Uji grafik osilasi gelombang Closed-Loop ECU.
                ` : profile === 7 ? html`
                    [KONEKSI] Hubungkan Pin OUT MCP4725 ke pin input sensor CKP/CMP pada ECU.<br/>
                    [UJI 1]   Pilih 26 Hz [800 RPM]       -> Pompa bensin dan injektor harus mulai menyemprot sinkron.<br/>
                    [UJI 2]   Pilih 83 Hz [2500 RPM]      -> Uji pengapian dan pembacaan takometer ECU.
                ` : profile === 8 ? html`
                    [KONEKSI] Hubungkan Pin OUT MCP4725 ke kabel sinyal sensor kecepatan 5V.<br/>
                    [UJI 1]   Pilih 66 Hz [60 KM/JAM]     -> Jarum spidometer speedometer naik menunjuk ke 60 km/jam.<br/>
                    [UJI 2]   Pilih 111 Hz [100 KM/JAM]   -> Jarum spidometer naik menunjuk ke 100 km/jam.
                ` : html`
                    [KONEKSI] Terminal OUT MCP4725 mengeluarkan tegangan analog murni 0.00V - 5.00V (Resolusi 1.2 mV).<br/>
                    [KONTROL] Putar dial untuk memasukkan tegangan referensi presisi ke pin input analog ECU.
                `)}
            </div>
        </div>
    `;
}
