import { html, useRef, useState, useEffect } from '../preact.js';

export function Dial({ label, value, unit, min, max, step, onChange, disabled, subInfo, displayValue, accentColor, panelClass, compact = false }) {
    const trackRef = useRef(null);
    const isDraggingRef = useRef(false);
    const lastSentValRef = useRef(null);
    const throttleTimerRef = useRef(null);

    const numMin = Number(min) || 0;
    const numMax = Number(max) || 100;
    const numStep = Number(step) || 1;
    const incomingVal = Number(value) || 0;

    const [dragVal, setDragVal] = useState(incomingVal);
    const [isDragging, setIsDragging] = useState(false);

    // Keep dragVal in sync with incoming prop ONLY when NOT dragging
    useEffect(() => {
        if (!isDraggingRef.current) {
            setDragVal(incomingVal);
        }
    }, [incomingVal]);

    const activeVal = isDragging ? dragVal : incomingVal;
    const dispVal = (displayValue !== undefined) ? displayValue : activeVal;

    const calculateValueFromPointer = (e) => {
        if (!trackRef.current) return activeVal;
        const rect = trackRef.current.getBoundingClientRect();
        if (rect.width <= 0) return activeVal;
        
        let percentage = (e.clientX - rect.left) / rect.width;
        percentage = Math.max(0, Math.min(1, percentage));
        
        const rawValue = (percentage * (numMax - numMin)) + numMin;
        const steppedValue = Math.round(rawValue / numStep) * numStep;
        const decimals = (numStep.toString().split('.')[1] || '').length;
        return Math.max(numMin, Math.min(numMax, Number(steppedValue.toFixed(decimals))));
    };

    const emitChange = (val, immediate = false) => {
        if (!onChange || val === lastSentValRef.current) return;
        
        if (immediate) {
            if (throttleTimerRef.current) clearTimeout(throttleTimerRef.current);
            lastSentValRef.current = val;
            onChange(val);
            return;
        }

        if (!throttleTimerRef.current) {
            throttleTimerRef.current = setTimeout(() => {
                throttleTimerRef.current = null;
                lastSentValRef.current = val;
                onChange(val);
            }, 45);
        }
    };

    const handlePointerDown = (e) => {
        if (disabled) return;
        e.preventDefault();
        isDraggingRef.current = true;
        setIsDragging(true);
        if (trackRef.current) {
            trackRef.current.setPointerCapture(e.pointerId);
        }
        const newVal = calculateValueFromPointer(e);
        setDragVal(newVal);
        emitChange(newVal);
    };

    const handlePointerMove = (e) => {
        if (disabled || !isDraggingRef.current) return;
        e.preventDefault();
        const newVal = calculateValueFromPointer(e);
        setDragVal(newVal);
        emitChange(newVal);
    };

    const handlePointerUp = (e) => {
        if (!isDraggingRef.current) return;
        isDraggingRef.current = false;
        setIsDragging(false);
        if (trackRef.current && trackRef.current.hasPointerCapture(e.pointerId)) {
            trackRef.current.releasePointerCapture(e.pointerId);
        }
        const finalVal = calculateValueFromPointer(e);
        setDragVal(finalVal);
        emitChange(finalVal, true);
    };

    const range = numMax - numMin;
    const percentage = range > 0 ? Math.max(0, Math.min(100, ((activeVal - numMin) / range) * 100)) : 0;

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
                    style="touch-action: none; cursor: pointer; ${compact ? 'height: 14px; border-radius: 7px;' : ''}"
                    onPointerDown=${handlePointerDown}
                    onPointerMove=${handlePointerMove}
                    onPointerUp=${handlePointerUp}
                    onPointerCancel=${handlePointerUp}
                >
                    <div class="fader-fill" style="width: ${percentage}%; background: ${accentColor || 'var(--text-primary)'}; box-shadow: ${accentColor ? '0 0 8px ' + accentColor : 'none'}; ${compact ? 'border-radius: 7px;' : ''}; pointer-events: none;"></div>
                    <div 
                        class="fader-thumb" 
                        style="left: ${percentage}%; pointer-events: none; border-color: ${accentColor || 'var(--surface-matte)'}; ${compact ? 'width: 22px; height: 22px; margin-left: -11px; margin-top: -11px;' : ''}"
                    ></div>
                </div>
            </div>
        </div>
    `;
}
