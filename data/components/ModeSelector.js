import { html } from '../preact.mjs';

export function ModeSelector({ mode, runMode, isOpen, onClose, onSelect, onSelectRunMode, disabled }) {
    const categories = [
        {
            name: 'PENGUJI KOIL PENGAPIAN',
            color: 'var(--neon-orange)',
            modes: [
                { id: 0, label: 'COIL 2P PASIF', desc: 'Driver IGBT (Pin 33) + Sensor Arus' },
                { id: 1, label: 'COIL 3P AKTIF', desc: 'Logic IGT 5V/3.3V (Pin 25)' },
                { id: 2, label: 'COIL 4P AKTIF', desc: 'Logic IGT + IGF (Pin 34) + Diagnostik' }
            ]
        },
        {
            name: 'PENGUJI INJEKTOR & AKTUATOR',
            color: 'var(--neon-blue)',
            modes: [
                { id: 3, label: 'INJEKTOR BENSIN', desc: 'Uji Debit Semprot & Pulsa (Pin 32)' },
                { id: 4, label: 'SOLENOID 2-PIN', desc: 'Aktuator Katup PWM (Pin 32)' },
                { id: 5, label: 'ISC 3-PIN', desc: 'Rotary Solenoid Dual-Drive' }
            ]
        },
        {
            name: 'MOTOR STEPPER & SPEEDOMETER',
            color: 'var(--neon-green)',
            modes: [
                { id: 7, label: 'STEPPER IACV', desc: 'Posisi Langkah 4-Pin & Kalibrasi' },
                { id: 8, label: 'STEPPER KONTINU', desc: 'Putaran Bebas 4-Kabel (CW/CCW)' },
                { id: 6, label: 'SPEEDOMETER', desc: 'Sapuan & Kalibrasi Spidometer' }
            ]
        },
        {
            name: 'SIMULATOR SENSOR (MCP4725 DAC)',
            color: '#a855f7',
            modes: [
                { id: 9, label: 'HALL & VADJ 0-5V', desc: 'MCP4725 DAC: TPS, MAP, CKP/CMP Sensor' }
            ]
        }
    ];

    return html`
        <div class="panel-side-bottom mode-container ${isOpen ? 'open' : ''}">
            <!-- Pinned Header: Always locked at top 0 with zero gap -->
            <div class="drawer-fixed-header">
                <span style="font-weight: 700; font-size: 0.95rem; letter-spacing: 0.05em;">PILIH MODE OPERASI</span>
                <button class="btn-drawer-close" onClick=${onClose}>✕</button>
            </div>

            <!-- Scrollable Body: Content scrolls cleanly inside -->
            <div class="mode-scroll-body">
                ${categories.map(cat => html`
                    <div style="margin-bottom: 12px;">
                        <div class="mode-category-title" style="color: ${cat.color};">
                            ${cat.name}
                        </div>
                        <div class="mode-grid">
                            ${cat.modes.map(m => html`
                                <button 
                                    class="btn mode-btn-card ${mode === m.id ? 'btn-active' : ''}"
                                    onClick=${() => {
                                        onSelect(m.id);
                                        if ((m.id === 5 || m.id === 6 || m.id === 7 || m.id === 8 || m.id === 9) && (runMode === 1 || runMode === 2)) {
                                            onSelectRunMode(0); // Reset to CONT
                                        }
                                    }}
                                    disabled=${disabled}
                                    style="${mode === m.id ? 'border-color: ' + cat.color + ';' : ''}"
                                >
                                    <div>
                                        <div style="font-size: 0.9rem; font-weight: bold; line-height: 1.2;">
                                            ${m.label}
                                        </div>
                                        <div style="font-size: 0.72rem; opacity: 0.7; margin-top: 2px;">
                                            ${m.desc}
                                        </div>
                                    </div>
                                    <div style="font-size: 0.85rem; margin-left: 8px; font-weight: bold; color: ${mode === m.id ? 'var(--bg-base)' : cat.color};">
                                        ${mode === m.id ? '● AKTIF' : '○'}
                                    </div>
                                </button>
                            `)}
                        </div>
                    </div>
                `)}
            </div>
        </div>
    `;
}
