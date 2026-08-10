import { html } from '../preact.mjs';

export function ModeSelector({ mode, runMode, onSelect, onSelectRunMode, disabled }) {
    const modes = [
        { id: 0, label: 'COIL', desc: 'Direct Dwell Control' },
        { id: 1, label: 'PWM', desc: 'Solenoid Duty Cycle' },
        { id: 2, label: 'SPEEDO', desc: 'Dashboard Sweep' }
    ];

    const runModes = [
        { id: 0, label: 'CONT', desc: 'Continuous' },
        { id: 3, label: 'SWEEP', desc: 'Sweep Range' },
        { id: 2, label: '1-SHOT', desc: 'Single Pulse' }
    ]; // Based on CoilMode enum: MODE_CONTINUOUS=0, MODE_BURST=1, MODE_SINGLE=2, MODE_SWEEP=3. We skip burst for now.

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
                        style="text-align: left; display: flex; justify-content: space-between; align-items: center;"
                    >
                        <span>${m.label}</span>
                        <span style="font-size: 0.7em; opacity: 0.7;">${m.desc}</span>
                    </button>
                    ${mode === m.id ? html`
                        <div style="display: flex; gap: 4px; padding-left: 12px; margin-bottom: 4px;">
                            ${runModes.map(rm => html`
                                <button 
                                    class="btn ${runMode === rm.id ? 'btn-active' : ''}"
                                    onClick=${() => onSelectRunMode(rm.id)}
                                    disabled=${disabled}
                                    style="flex: 1; padding: 4px; font-size: 0.7rem; border-width: 1px; min-height: unset;"
                                >
                                    ${rm.label}
                                </button>
                            `)}
                        </div>
                    ` : null}
                `)}
            </div>
        </div>
    `;
}
