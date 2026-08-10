import { html } from '../preact.mjs';

export function Dial({ label, value, unit, min, max, step, onChange, disabled }) {
    const handleInput = (e) => {
        onChange(Number(e.target.value));
    };

    return html`
        <div class="panel">
            <div class="panel-header">
                <span>${label}</span>
                <span>${min} - ${max} ${unit}</span>
            </div>
            <div class="huge-value">
                ${value}<span class="value-unit">${unit}</span>
            </div>
            <div class="slider-container">
                <input 
                    type="range" 
                    min=${min} 
                    max=${max} 
                    step=${step} 
                    value=${value} 
                    onInput=${handleInput}
                    disabled=${disabled}
                />
            </div>
        </div>
    `;
}
