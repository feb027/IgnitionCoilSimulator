import { html } from '../preact.mjs';

export function ModeSelector({ mode, runMode, onSelect, onSelectRunMode, disabled }) {
    const modes = [
        { id: 0, label: 'COIL', desc: 'Direct Dwell Control' },
        { id: 1, label: 'PWM', desc: 'Solenoid Duty Cycle' },
        { id: 2, label: 'SPEEDO', desc: 'Dashboard Sweep' },
        { id: 3, label: 'STEP MOTOR', desc: '4-Pin IACV Tester' }
    ];
    ];

    return html`
        <div style="display: flex; flex-direction: column; gap: var(--space-md);">
            <div class="panel">
                <div class="panel-header">
                    <span>OPERATING MODE</span>
                </div>
                <div style="display: flex; flex-direction: column; gap: 8px;">
                    ${modes.map(m => html`
                        <div style="display: flex; flex-direction: column; gap: 4px;">
                            <button 
                                class="btn ${mode === m.id ? 'btn-active' : ''}"
                                onClick=${() => {
                                    onSelect(m.id);
                                    if ((m.id === 2 || m.id === 3) && (runMode === 1 || runMode === 2)) {
                                        onSelectRunMode(0); // Reset to CONT
                                    }
                                }}
                                disabled=${disabled}
                                style="text-align: left; display: flex; justify-content: space-between; align-items: center; padding: 16px 12px;"
                            >
                                <span style="font-size: 1.1rem; font-weight: bold;">${m.label}</span>
                                <span style="font-size: 0.85rem; opacity: 0.7;">${m.desc}</span>
                            </button>
                        </div>
                    `)}
                </div>
            </div>
        </div>
    `;
}
