import { html, render, useState, useEffect, useRef } from './preact.mjs';
import { Dial } from './components/Dial.js';
import { ModeSelector } from './components/ModeSelector.js';
import { DashboardCoil } from './components/DashboardCoil.js';
import { DashboardPwm } from './components/DashboardPwm.js';
import { DashboardSpeedo } from './components/DashboardSpeedo.js';
import { DashboardStepper } from './components/DashboardStepper.js';

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
        connected: false,
        isDrawerOpen: false
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

    useEffect(() => {
        if (state.isDrawerOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
    }, [state.isDrawerOpen]);

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

    const renderModeSelector = () => html`
        <div class="panel-side-bottom mode-container ${state.isDrawerOpen ? 'open' : ''}">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; border-bottom: 1px solid var(--border-sharp); padding-bottom: 8px;" class="drawer-only-header">
                <span style="font-weight: bold;">SELECT MODE</span>
                <button class="btn" style="padding: 4px 12px;" onClick=${() => setState(s => ({ ...s, isDrawerOpen: false }))}>X</button>
            </div>
            <${ModeSelector} 
                mode=${state.pulseMode}
                runMode=${state.runMode}
                onSelect=${(val) => {
                    sendAction('setMode', val);
                    setState(s => ({ ...s, isDrawerOpen: false }));
                }}
                onSelectRunMode=${(val) => {
                    sendAction('setRunMode', val);
                    setState(s => ({ ...s, isDrawerOpen: false }));
                }}
                disabled=${!state.connected || state.isRunning}
            />
        </div>
    `;

    const renderDashboard = () => {
        if (state.pulseMode === 0) return html`<${DashboardCoil} state=${state} sendAction=${sendAction} modeSelector=${renderModeSelector()} />`;
        if (state.pulseMode === 1) return html`<${DashboardPwm} state=${state} sendAction=${sendAction} modeSelector=${renderModeSelector()} />`;
        if (state.pulseMode === 2) return html`<${DashboardSpeedo} state=${state} sendAction=${sendAction} modeSelector=${renderModeSelector()} />`;
        if (state.pulseMode === 3) return html`<${DashboardStepper} state=${state} sendAction=${sendAction} modeSelector=${renderModeSelector()} />`;
        return null;
    };

    return html`
        <header>
            <div class="title">IGNITION PRO</div>
            <div class="status-badge">
                <div class="status-dot ${state.connected ? 'connected' : 'disconnected'}"></div>
                ${state.connected ? 'SYS_LINK_OK' : 'SYS_OFFLINE'}
            </div>
        </header>

        <div 
            class="drawer-overlay ${state.isDrawerOpen ? 'open' : ''}" 
            onClick=${() => setState(s => ({ ...s, isDrawerOpen: false }))}
        ></div>

        <button class="btn-mode-drawer" onClick=${() => setState(s => ({ ...s, isDrawerOpen: true }))}>
            <span>MODE: ${state.pulseMode === 0 ? 'COIL' : state.pulseMode === 1 ? 'PWM' : state.pulseMode === 2 ? 'SPEEDO' : 'STEP MOTOR'}</span>
            <span>▼</span>
        </button>

        ${!isStepper ? html`
            <div style="display: flex; gap: 8px; margin-bottom: 24px;">
                ${[
                    { id: 0, label: 'CONT' },
                    ...(isSpeedo ? [] : [
                        { id: 1, label: 'BURST' },
                        { id: 2, label: 'SINGLE' }
                    ]),
                    { id: 3, label: 'SWEEP' }
                ].map(rm => html`
                    <button 
                        class="btn ${state.runMode === rm.id ? 'btn-active' : ''}"
                        onClick=${() => sendAction('setRunMode', rm.id)}
                        disabled=${!state.connected || state.isRunning}
                        style="flex: 1; padding: 12px 4px; font-size: 0.9rem; font-weight: bold; border-radius: 6px;"
                    >
                        ${rm.label}
                    </button>
                `)}
            </div>
        ` : null}

        <main class="bento-grid">
            ${renderDashboard()}
        </main>
    `;
}

render(html`<${App} />`, document.getElementById('app'));
