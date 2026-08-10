import { html } from '../preact.mjs';

export function ModeSelector({ mode, runMode, onSelect, onSelectRunMode, disabled }) {
    const modes = [
        { id: 0, label: 'COIL', desc: 'Direct Dwell Control' },
        { id: 1, label: 'PWM', desc: 'Solenoid Duty Cycle' },
        { id: 2, label: 'SPEEDO', desc: 'Dashboard Sweep' },
        { id: 3, label: 'STEP MOTOR', desc: '4-Pin IACV Tester' }
    ];

    // mode 2 is Speedo, mode 3 is Stepper. Both only support Cont and Sweep.
    // other modes support Cont, Burst, Single, Sweep.
    const isLimitedRunMode = (mode === 2 || mode === 3);
    
    let runModes = [
        { id: 0, label: 'CONT' },
        { id: 3, label: 'SWEEP' }
    ];
    
    if (!isLimitedRunMode) {
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
                            
                            ${mode === m.id ? html`
                                <div style="display: flex; gap: 4px; margin-top: 4px; margin-bottom: 4px;">
                                    ${runModes.map(rm => html`
                                        <button 
                                            class="btn ${runMode === rm.id ? 'btn-active' : ''}"
                                            onClick=${() => onSelectRunMode(rm.id)}
                                            disabled=${disabled}
                                            style="flex: 1; padding: 12px 4px; font-size: 0.85rem; font-weight: bold;"
                                        >
                                            ${rm.label}
                                        </button>
                                    `)}
                                </div>
                            ` : ''}
                        </div>
                    `)}
                </div>
            </div>
        </div>
    `;
}
