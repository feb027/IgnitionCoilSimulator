import { html } from '../preact.mjs';

export function ModeSelector({ mode, runMode, onSelect, onSelectRunMode, disabled }) {
    const modes = [
        { id: 0, label: 'COIL', desc: 'Direct Dwell Control' },
        { id: 1, label: 'PWM', desc: 'Solenoid Duty Cycle' },
        { id: 2, label: 'SPEEDO', desc: 'Dashboard Sweep' }
    ];

    // mode 2 is Speedo. Speedo only supports Cont and Sweep.
    // other modes support Cont, Burst, Single, Sweep.
    const isSpeedo = mode === 2;
    
    let runModes = [
        { id: 0, label: 'CONT' },
        { id: 3, label: 'SWEEP' }
    ];
    
    if (!isSpeedo) {
        runModes = [
            { id: 0, label: 'CONT' },
            { id: 1, label: 'BURST' },
            { id: 2, label: 'SINGLE' },
            { id: 3, label: 'SWEEP' }
        ];
    }

    return html`
        <div style="display: flex; flex-direction: column; gap: var(--space-md);">
            <div class="panel">
                <div class="panel-header">
                    <span>OPERATING MODE</span>
                </div>
                <div style="display: flex; flex-direction: column; gap: 8px;">
                    ${modes.map(m => html`
                        <button 
                            class="btn ${mode === m.id ? 'btn-active' : ''}"
                            onClick=${() => {
                                onSelect(m.id);
                                // Fallback if switching from coil (with single) to speedo (no single)
                                if (m.id === 2 && (runMode === 1 || runMode === 2)) {
                                    onSelectRunMode(0); // Reset to CONT
                                }
                            }}
                            disabled=${disabled}
                            style="text-align: left; display: flex; justify-content: space-between; align-items: center;"
                        >
                            <span>${m.label}</span>
                            <span style="font-size: 0.7em; opacity: 0.7;">${m.desc}</span>
                        </button>
                    `)}
                </div>
            </div>

            <div class="panel">
                <div class="panel-header">
                    <span>RUN MODE</span>
                </div>
                <div style="display: flex; gap: 4px;">
                    ${runModes.map(rm => html`
                        <button 
                            class="btn ${runMode === rm.id ? 'btn-active' : ''}"
                            onClick=${() => onSelectRunMode(rm.id)}
                            disabled=${disabled}
                            style="flex: 1; padding: 8px 4px; font-size: 0.75rem;"
                        >
                            ${rm.label}
                        </button>
                    `)}
                </div>
            </div>
        </div>
    `;
}
