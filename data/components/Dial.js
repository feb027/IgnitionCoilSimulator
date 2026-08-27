import { html, useRef, useEffect } from '../preact.js';

export function Dial({ label, value, unit, min, max, step, onChange, disabled, subInfo, displayValue, accentColor, panelClass, compact = false }) {
    const trackRef = useRef(null);
    const thumbRef = useRef(null);

    const handlePointerDown = (e) => {
        if (disabled) return;
        updateValueFromEvent(e);
        if (thumbRef.current) {
            thumbRef.current.setPointerCapture(e.pointerId);
        }
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

    const numMin = Number(min) || 0;
    const numMax = Number(max) || 100;
    const numStep = Number(step) || 1;
    const numVal = Number(value) || 0;
    const dispVal = (displayValue !== undefined) ? displayValue : numVal;

    const updateValueFromEvent = (e) => {
        if (!trackRef.current) return;
        const rect = trackRef.current.getBoundingClientRect();
        if (rect.width <= 0) return;
        
        let percentage = (e.clientX - rect.left) / rect.width;
        percentage = Math.max(0, Math.min(1, percentage));
        
        const rawValue = (percentage * (numMax - numMin)) + numMin;
        const steppedValue = Math.round(rawValue / numStep) * numStep;
        const decimals = (numStep.toString().split('.')[1] || '').length;
        const finalValue = Number(steppedValue.toFixed(decimals));
        
        if (finalValue !== numVal && onChange) {
            onChange(finalValue);
        }
    };

    const range = numMax - numMin;
    const percentage = range > 0 ? Math.max(0, Math.min(100, ((numVal - numMin) / range) * 100)) : 0;

    return html`
        <div class="${panelClass || 'panel'}" style="${compact ? 'padding: 8px 12px;' : ''}">
            <div class="panel-header" style="${compact ? 'margin-bottom: 2px; font-size: 0.7rem;' : ''}">
                <span style="${accentColor ? ('color: ' + accentColor + '; font-weight: 700;') : ''}">${label}</span>
                <span>${min}-${max}${unit}</span>
            </div>
            <div class="huge-value" style="${compact ? 'font-size: 1.7rem; line-height: 1.1;' : ''}">
                ${dispVal}<span class="value-unit" style="${accentColor ? ('color: ' + accentColor + ';') : ''} ${compact ? 'font-size: 0.8rem; margin-left: 4px;' : ''}">${unit}</span>
            </div>
            ${subInfo ? html`<div style="font-size: 0.72em; color: var(--text-muted); text-align: center; margin-top: ${compact ? '-2px' : '-8px'}; margin-bottom: ${compact ? '4px' : '8px'};">${subInfo}</div>` : ''}
            <div class="slider-container" style="opacity: ${disabled ? 0.3 : 1}; pointer-events: ${disabled ? 'none' : 'auto'}; ${compact ? 'padding-top: 6px;' : ''}">
                <div 
                    class="fader-track" 
                    ref=${trackRef}
                    style="pointer-events: none; ${compact ? 'height: 12px; border-radius: 6px;' : ''}"
                >
                    <div class="fader-fill" style="width: ${percentage}%; background: ${accentColor || 'var(--text-primary)'}; box-shadow: ${accentColor ? '0 0 8px ' + accentColor : 'none'}; ${compact ? 'border-radius: 6px;' : ''}"></div>
                    <div 
                        class="fader-thumb" 
                        ref=${thumbRef}
                        style="left: ${percentage}%; cursor: grab; pointer-events: auto; touch-action: none; border-color: ${accentColor || 'var(--surface-matte)'}; ${compact ? 'width: 20px; height: 20px; margin-left: -10px; margin-top: -10px;' : ''}"
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
