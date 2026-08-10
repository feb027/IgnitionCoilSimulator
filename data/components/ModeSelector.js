import { html } from '../preact.mjs';

export function ModeSelector({ mode, onSelect, disabled }) {
    const modes = [
        { id: 0, label: 'COIL', desc: 'Direct Dwell Control' },
        { id: 1, label: 'PWM', desc: 'Solenoid Duty Cycle' },
        { id: 2, label: 'SPEEDO', desc: 'Dashboard Sweep' }
    ];

    return html`
        <div class="panel">
            <div class="panel-header">
                <span>OPERATING MODE</span>
            </div>
            <div style="display: flex; flex-direction: column; gap: 8px;">
                ${modes.map(m => html`
                    <button 
                        class="btn ${mode === m.id ? 'btn-active' : ''}"
                        onClick=${() => onSelect(m.id)}
                        disabled=${disabled}
                        style="text-align: left; display: flex; justify-content: space-between;"
                    >
                        <span>${m.label}</span>
                        <span style="font-size: 0.7em; opacity: 0.7;">${m.desc}</span>
                    </button>
                `)}
            </div>
        </div>
    `;
}
