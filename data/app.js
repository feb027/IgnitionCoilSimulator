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
        }
    };

    const isSpeedo = state.pulseMode === 2;

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
                <${Dial} 
                    label=${isSpeedo ? "TARGET SPEED" : "ENGINE SPEED"}
                    value=${isSpeedo ? state.speedoKmh : state.rpm}
                    unit=${isSpeedo ? "KM/H" : "RPM"}
                    min=${isSpeedo ? 0 : 0}
                    max=${isSpeedo ? 300 : 16000}
                    step=${isSpeedo ? 10 : 100}
                    onChange=${(val) => sendAction(isSpeedo ? 'setSpeedoKmh' : 'setRpm', val)}
                    disabled=${!state.connected}
                />
            </div>
            
            <div class="panel-side-top" style="display: flex; flex-direction: column; gap: 16px;">
                ${!isSpeedo ? html`
                    <${Dial} 
                        label="DWELL TIME"
                        value=${state.dwellMs}
                        unit="MS"
                        min="0.5"
                        max="10.0"
                        step="0.1"
                        onChange=${(val) => sendAction('setDwell', val)}
                        disabled=${!state.connected}
                    />
                ` : html`
                    <${Dial} 
                        label="TARGET TACHO"
                        value=${state.speedoRpm}
                        unit="RPM"
                        min="0"
                        max="16000"
                        step="100"
                        onChange=${(val) => sendAction('setSpeedoRpm', val)}
                        disabled=${!state.connected}
                    />
                    <${Dial} 
                        label="TEMPERATURE"
                        value=${state.speedoTempPercent}
                        unit="%"
                        min="0"
                        max="100"
                        step="1"
                        onChange=${(val) => sendAction('setSpeedoTemp', val)}
                        disabled=${!state.connected}
                    />
                    <${Dial} 
                        label="FUEL LEVEL"
                        value=${state.speedoFuelPercent}
                        unit="%"
                        min="0"
                        max="100"
                        step="1"
                        onChange=${(val) => sendAction('setSpeedoFuel', val)}
                        disabled=${!state.connected}
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
                
                <button 
                    class="btn btn-run ${state.isRunning ? 'is-running' : ''}"
                    onClick=${() => sendAction('toggleRun')}
                    disabled=${!state.connected}
                >
                    ${state.isRunning ? 'OFF' : 'ON'}
                </button>
            </div>
        </main>
    `;
}

render(html`<${App} />`, document.getElementById('app'));
