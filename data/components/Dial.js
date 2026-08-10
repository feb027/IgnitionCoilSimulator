import { html, useRef, useEffect } from '../preact.mjs';

export function Dial({ label, value, unit, min, max, step, onChange, disabled }) {
    const trackRef = useRef(null);

    const handlePointerDown = (e) => {
        if (disabled) return;
        updateValueFromEvent(e);
        trackRef.current.setPointerCapture(e.pointerId);
    };

    const handlePointerMove = (e) => {
        if (disabled) return;
        if (trackRef.current.hasPointerCapture(e.pointerId)) {
            updateValueFromEvent(e);
        }
    };

    const handlePointerUp = (e) => {
        if (disabled) return;
        trackRef.current.releasePointerCapture(e.pointerId);
    };

    const updateValueFromEvent = (e) => {
        const rect = trackRef.current.getBoundingClientRect();
        let percentage = (e.clientX - rect.left) / rect.width;
        percentage = Math.max(0, Math.min(1, percentage));
        
        const rawValue = (percentage * (max - min)) + min;
        
        // Apply step
        const steppedValue = Math.round(rawValue / step) * step;
        
        // Handle floating point precision issues for small steps (e.g. 0.1)
        const decimals = (step.toString().split('.')[1] || '').length;
        const finalValue = Number(steppedValue.toFixed(decimals));
        
        if (finalValue !== value) {
            onChange(finalValue);
        }
    };

    const percentage = ((value - min) / (max - min)) * 100;

    return html`
        <div class="panel">
            <div class="panel-header">
                <span>${label}</span>
                <span>${min} - ${max} ${unit}</span>
            </div>
            <div class="huge-value">
                ${value}<span class="value-unit">${unit}</span>
            </div>
            <div class="slider-container" style="opacity: ${disabled ? 0.3 : 1}; pointer-events: ${disabled ? 'none' : 'auto'};">
                <div 
                    class="fader-track" 
                    ref=${trackRef}
                    onPointerDown=${handlePointerDown}
                    onPointerMove=${handlePointerMove}
                    onPointerUp=${handlePointerUp}
                    onPointerCancel=${handlePointerUp}
                >
                    <div class="fader-fill" style="width: ${percentage}%"></div>
                    <div class="fader-thumb" style="left: ${percentage}%"></div>
                </div>
            </div>
        </div>
    `;
}
