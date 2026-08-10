import { html, render, useState, useEffect, useRef } from './preact.mjs';
import { Dial } from './components/Dial.js';
import { ModeSelector } from './components/ModeSelector.js';

function App() {
    const [state, setState] = useState({
        isRunning: false,
        pulseMode: 0,
        runMode: 0,
        rpm: 1000,
        dwellMs: 3.0,
        speedoKmh: 120,
        speedoRpm: 4000,
        speedoTempPercent: 50,
        speedoFuelPercent: 50,
        currentSpeedoKmh: 0,
        dutyCycle: 15.0,
        sweepTimeSec: 5,
        pulsePerKm: 4000,
        rpmStep: 100,
        stepperSpeed: 50,
        connected: false
    });

    const ws = useRef(null);
    const reconnectTimeout = useRef(null);

    const connectWebSocket = () => {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const host = window.location.hostname || '192.168.4.1';
        ws.current = new WebSocket(`${protocol}//${host}/ws`);

        ws.current.onopen = () => {
            setState(s => ({ ...s, connected: true }));
            if (reconnectTimeout.current) clearTimeout(reconnectTimeout.current);
        };

        ws.current.onclose = () => {
            setState(s => ({ ...s, connected: false }));
            reconnectTimeout.current = setTimeout(connectWebSocket, 2000);
        };

        ws.current.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                if (data.type === 'state') {
                    setState(s => ({ ...s, ...data }));
                }
            } catch (e) {
                console.error("Failed to parse WS message", e);
            }
        };
    };

    useEffect(() => {
        connectWebSocket();
        return () => {
            if (ws.current) ws.current.close();
            if (reconnectTimeout.current) clearTimeout(reconnectTimeout.current);
        };
    }, []);

    const sendAction = (action, value) => {
        if (ws.current && ws.current.readyState === WebSocket.OPEN) {
            ws.current.send(JSON.stringify({ action, value }));
            // Optimistic UI update
            if (action === 'toggleRun') setState(s => ({ ...s, isRunning: !s.isRunning }));
            if (action === 'setMode') setState(s => ({ ...s, pulseMode: value }));
            if (action === 'setRunMode') setState(s => ({ ...s, runMode: value }));
            if (action === 'setRpm') setState(s => ({ ...s, rpm: value }));
            if (action === 'setDwell') setState(s => ({ ...s, dwellMs: value }));
            if (action === 'setSpeedoKmh') setState(s => ({ ...s, speedoKmh: value }));
            if (action === 'setSpeedoRpm') setState(s => ({ ...s, speedoRpm: value }));
            if (action === 'setSpeedoTemp') setState(s => ({ ...s, speedoTempPercent: value }));
            if (action === 'setSpeedoFuel') setState(s => ({ ...s, speedoFuelPercent: value }));
            if (action === 'setDuty') setState(s => ({ ...s, dutyCycle: value }));
            if (action === 'setSweepTime') setState(s => ({ ...s, sweepTimeSec: value }));
            if (action === 'setPulsePerKm') setState(s => ({ ...s, pulsePerKm: value }));
            if (action === 'setRpmStep') setState(s => ({ ...s, rpmStep: value }));
            if (action === 'setStepperSpeed') setState(s => ({ ...s, stepperSpeed: value }));
        }
    };

    const isSpeedo = state.pulseMode === 2;
    const isStepper = state.pulseMode === 3;
    const isSweep = state.runMode === 3;

    return html`
        <header>
            <div class="title">IGNITION PRO</div>
            <div class="status-badge">
                <div class="status-dot ${state.connected ? 'connected' : 'disconnected'}"></div>
                ${state.connected ? 'SYS_LINK_OK' : 'SYS_OFFLINE'}
            </div>
        </header>

        <main class="bento-grid">
            <div class="panel-main">
                ${isStepper ? html`
                    <div class="panel" style="display: flex; gap: 20px; align-items: stretch; justify-content: center; min-height: 200px;">
                        <button 
                            class="btn btn-jog"
                            style="flex: 1; font-size: 1.5rem; font-weight: bold; background: var(--surface-color); border: 2px solid var(--border-color); user-select: none;"
                            onPointerDown=${() => sendAction('stepperSpin', -1)}
                            onPointerUp=${() => sendAction('stepperSpin', 0)}
                            onPointerLeave=${() => sendAction('stepperSpin', 0)}
                            disabled=${!state.connected}
                        >
                            PUTAR KIRI
                        </button>
                        <button 
                            class="btn btn-jog"
                            style="flex: 1; font-size: 1.5rem; font-weight: bold; background: var(--surface-color); border: 2px solid var(--border-color); user-select: none;"
                            onPointerDown=${() => sendAction('stepperSpin', 1)}
                            onPointerUp=${() => sendAction('stepperSpin', 0)}
                            onPointerLeave=${() => sendAction('stepperSpin', 0)}
                            disabled=${!state.connected}
                        >
                            PUTAR KANAN
                        </button>
                    </div>
                ` : html`
                    <${Dial} 
                        label=${isSpeedo ? (isSweep ? "TARGET SPEED" : "ACTUAL SPEED") : "ENGINE SPEED"}
                        value=${isSpeedo ? state.speedoKmh : state.rpm}
                        unit=${isSpeedo ? "KM/H" : "RPM"}
                        min=${isSpeedo ? 0 : 0}
                        max=${isSpeedo ? 300 : 16000}
                        step=${isSpeedo ? 10 : state.rpmStep}
                        onChange=${(val) => sendAction(isSpeedo ? 'setSpeedoKmh' : 'setRpm', val)}
                        disabled=${!state.connected}
                    />
                `}
            </div>
            
            <div class="panel-side-top">
                ${state.pulseMode === 0 ? html`
                    <${Dial} 
                        label="DWELL TIME"
                        value=${state.dwellMs}
                        unit="MS"
                        min="0.5"
                        max="5.0"
                        step="0.1"
                        subInfo=${"Calculated Duty: " + (state.dutyCycle ? state.dutyCycle.toFixed(1) : "0.0") + "%"}
                        onChange=${(val) => sendAction('setDwell', val)}
                        disabled=${!state.connected}
                    />
                ` : state.pulseMode === 1 ? html`
                    <${Dial} 
                        label="DUTY CYCLE"
                        value=${state.dutyCycle}
                        unit="%"
                        min="0"
                        max="100"
                        step="1"
                        subInfo=${"Calculated Dwell: " + (state.dwellMs ? state.dwellMs.toFixed(1) : "0.0") + "ms"}
                        onChange=${(val) => sendAction('setDuty', val)}
                        disabled=${!state.connected}
                    />
                ` : isStepper ? html`
                    <${Dial} 
                        label="STEPPER SPEED"
                        value=${state.stepperSpeed}
                        unit="%"
                        min="1"
                        max="100"
                        step="5"
                        onChange=${(val) => sendAction('setStepperSpeed', val)}
                        disabled=${!state.connected}
                    />
                ` : html`
                    <${Dial} 
                        label=${(isSweep && state.isRunning) ? "SWEEPING TACHO..." : (isSweep ? "TARGET TACHO" : "ACTUAL TACHO")}
                        value=${(isSweep && state.isRunning) ? state.rpm : state.speedoRpm}
                        unit="RPM"
                        min="0"
                        max="16000"
                        step="100"
                        onChange=${(val) => sendAction('setSpeedoRpm', val)}
                        disabled=${!state.connected || (isSweep && state.isRunning)}
                    />
                    <${Dial} 
                        label=${(isSweep && state.isRunning) ? "SWEEPING TEMP..." : (isSweep ? "TARGET TEMP" : "ACTUAL TEMP")}
                        value=${(isSweep && state.isRunning) ? state.currentSpeedoTempPercent : state.speedoTempPercent}
                        unit="%"
                        min="0"
                        max="100"
                        step="1"
                        onChange=${(val) => sendAction('setSpeedoTemp', val)}
                        disabled=${!state.connected || (isSweep && state.isRunning)}
                    />
                    <${Dial} 
                        label=${(isSweep && state.isRunning) ? "SWEEPING FUEL..." : (isSweep ? "TARGET FUEL" : "ACTUAL FUEL")}
                        value=${(isSweep && state.isRunning) ? state.currentSpeedoFuelPercent : state.speedoFuelPercent}
                        unit="%"
                        min="0"
                        max="100"
                        step="1"
                        onChange=${(val) => sendAction('setSpeedoFuel', val)}
                        disabled=${!state.connected || (isSweep && state.isRunning)}
                    />
                `}
            </div>

            <div class="panel-side-bottom">
                <${ModeSelector} 
                    mode=${state.pulseMode}
                    runMode=${state.runMode}
                    onSelect=${(val) => sendAction('setMode', val)}
                    onSelectRunMode=${(val) => sendAction('setRunMode', val)}
                    disabled=${!state.connected || state.isRunning}
                />
                
                <div style="position: sticky; bottom: 16px; z-index: 100; margin-top: 16px;">
                    ${!isStepper ? html`
                        <button 
                            class="btn btn-run ${state.isRunning ? 'is-running' : ''}"
                            onClick=${() => sendAction('toggleRun')}
                            disabled=${!state.connected}
                            style="box-shadow: 0 4px 15px rgba(0,0,0,0.5);"
                        >
                            ${state.isRunning ? 'RUNNING' : 'STANDBY'}
                        </button>
                    ` : ''}
                </div>
                
                <details class="panel" style="margin-top: 16px;">
                    <summary class="panel-header">
                        <span>ADVANCED SETTINGS</span>
                    </summary>
                    <div style="display: flex; flex-direction: column; gap: 16px; padding-top: 16px;">
                        <${Dial} 
                            label="SWEEP TIME"
                            value=${state.sweepTimeSec}
                            unit="SEC"
                            min="1"
                            max="60"
                            step="1"
                            onChange=${(val) => sendAction('setSweepTime', val)}
                            disabled=${!state.connected}
                        />
                        <${Dial} 
                            label="RPM STEP"
                            value=${state.rpmStep}
                            unit="RPM"
                            min="10"
                            max="1000"
                            step="10"
                            onChange=${(val) => sendAction('setRpmStep', val)}
                            disabled=${!state.connected}
                        />
                        ${isSpeedo ? html`
                            <${Dial} 
                                label="PULSES / KM"
                                value=${state.pulsePerKm}
                                unit="P/KM"
                                min="1000"
                                max="10000"
                                step="100"
                                onChange=${(val) => sendAction('setPulsePerKm', val)}
                                disabled=${!state.connected}
                            />
                        ` : ''}
                    </div>
                </details>
            </div>
        </main>
    `;
}

render(html`<${App} />`, document.getElementById('app'));
