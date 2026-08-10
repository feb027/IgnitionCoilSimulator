import { html, useRef, useEffect } from '../preact.mjs';

export function Dial({ label, value, unit, min, max, step, onChange, disabled }) {
    const trackRef = useRef(null);

    const thumbRef = useRef(null);

    const handlePointerDown = (e) => {
        if (disabled) return;
        updateValueFromEvent(e);
        thumbRef.current.setPointerCapture(e.pointerId);
    };

    const handlePointerMove = (e) => {
        if (disabled) return;
        if (thumbRef.current && thumbRef.current.hasPointerCapture(e.pointerId)) {
            updateValueFromEvent(e);
        }
    };

    const handlePointerUp = (e) => {
        if (disabled) return;
        if (thumbRef.current && thumbRef.current.hasPointerCapture(e.pointerId)) {
            thumbRef.current.releasePointerCapture(e.pointerId);
        }
    };

    const numMin = Number(min);
    const numMax = Number(max);
    const numStep = Number(step);

    const updateValueFromEvent = (e) => {
        const rect = trackRef.current.getBoundingClientRect();
        let percentage = (e.clientX - rect.left) / rect.width;
        percentage = Math.max(0, Math.min(1, percentage));
        
        const rawValue = (percentage * (numMax - numMin)) + numMin;
        
        // Apply step
        const steppedValue = Math.round(rawValue / numStep) * numStep;
        
        // Handle floating point precision issues for small steps (e.g. 0.1)
        const decimals = (numStep.toString().split('.')[1] || '').length;
        const finalValue = Number(steppedValue.toFixed(decimals));
        
        if (finalValue !== value) {
            onChange(finalValue);
        }
    };

    const percentage = ((value - numMin) / (numMax - numMin)) * 100;

    return html`
        <div class="panel">
            <div class="panel-header">
                <span>${label}</span>
                <span>${min} - ${max} ${unit}</span>
            </div>
            <div class="huge-value">
                ${value}<span class="value-unit">${unit}</span>
            </div>
            ${arguments[0].subInfo ? html`<div style="font-size: 0.8em; color: #888; text-align: center; margin-top: -8px; margin-bottom: 8px;">${arguments[0].subInfo}</div>` : ''}
            <div class="slider-container" style="opacity: ${disabled ? 0.3 : 1}; pointer-events: ${disabled ? 'none' : 'auto'};">
                <div 
                    class="fader-track" 
                    ref=${trackRef}
                    style="pointer-events: none;"
                >
                    <div class="fader-fill" style="width: ${percentage}%"></div>
                    <div 
                        class="fader-thumb" 
                        ref=${thumbRef}
                        style="left: ${percentage}%; cursor: grab; pointer-events: auto; touch-action: none;"
                        onPointerDown=${handlePointerDown}
                        onPointerMove=${handlePointerMove}
                        onPointerUp=${handlePointerUp}
                        onPointerCancel=${handlePointerUp}
                    ></div>
                </div>
            </div>
        </div>
    `;
}
