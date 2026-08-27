import { html, render, useState, useEffect, useRef } from './preact.js';
import { Dial } from './components/Dial.js';
import { ModeSelector } from './components/ModeSelector.js';
import { DashboardCoilPassive } from './components/DashboardCoilPassive.js';
import { DashboardCoilActive3P } from './components/DashboardCoilActive3P.js';
import { DashboardCoilActive4P } from './components/DashboardCoilActive4P.js';
import { DashboardInjector } from './components/DashboardInjector.js';
import { DashboardPwm } from './components/DashboardPwm.js';
import { DashboardIsc3Pin } from './components/DashboardIsc3Pin.js';
import { DashboardSpeedo } from './components/DashboardSpeedo.js';
import { DashboardStepperIacv } from './components/DashboardStepperIacv.js';
import { DashboardStepperUni } from './components/DashboardStepperUni.js';
import { DashboardHallDac } from './components/DashboardHallDac.js';

function App() {
    const [state, setState] = useState({
        isRunning: false,
        pulseMode: 0,
        runMode: 0,
        rpm: 1000,
        dwellMs: 3.0,
        iscDuty: 50.0,
        iscFreq: 250,
        speedoKmh: 120,
        speedoRpm: 4000,
        speedoMaxRpm: parseInt(localStorage.getItem('speedoMaxRpm')) || 16000,
        speedoTempPercent: 50,
        speedoFuelPercent: 50,
        speedoEnableRpm: true,
        speedoEnableKmh: true,
        speedoEnableTemp: true,
        speedoEnableFuel: true,
        speedoTachoPpr: 2.0,
        speedoTempCalMin: 0,
        speedoTempCalMid: 50,
        speedoTempCalMax: 100,
        speedoFuelCalMin: 0,
        speedoFuelCalMid: 50,
        speedoFuelCalMax: 100,
        speedoPwmFreqHz: 5000,
        currentSpeedoKmh: 0,
        dutyCycle: 15.0,
        sweepTimeSec: 5,
        pulsePerKm: 4000,
        rpmStep: 100,
        stepperSpeed: 50,
        stepperSpinDir: 0,
        injectorMs: 3.0,
        injectorRpm: 1500,
        injectorFlowPulses: 100,
        injectorPulsesLeft: 0,
        injectorFlowRunning: false,
        injectorPeakCurrentA: 0.0,
        injectorResistanceOhm: 0.0,
        injectorAutoDiagRunning: false,
        injectorDiagPhase: 0,
        injectorDiagProgress: 0,
        injectorDiagVerdict: "READY",
        iacvTargetSteps: 50,
        iacvCurrentSteps: 0,
        iacvAutoCalibrating: false,
        hallDacVoltage: 2.50,
        hallDacFreqHz: 50,
        hallDacWaveform: 0,
        hallDacConnected: false,
        coilFiredCount: 0,
        coilIgfCount: 0,
        coilMissedCount: 0,
        coilHealthPercent: 100.0,
        coilPeakCurrentA: 0.0,
        coilAutoDiagRunning: false,
        coilDiagPhase: 0,
        coilDiagProgress: 0,
        coilDiagVerdict: "READY",
        coilLeakCount: 0,
        coilLeakRate: 0,
        coilLeakDetected: false,
        coilLeakSeverity: "PERFECT (0 LEAK)",
        coilCurrentStatus: "STANDBY",
        coilConnected: false,
        connected: false,
        isDrawerOpen: false
    });

    const ws = useRef(null);
    const reconnectTimeout = useRef(null);

    useEffect(() => {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const host = window.location.hostname || '192.168.4.1';
        const wsUrl = `${protocol}//${host}/ws`;

        function connect() {
            if (reconnectTimeout.current) clearTimeout(reconnectTimeout.current);
            
            try {
                ws.current = new WebSocket(wsUrl);
                
                ws.current.onopen = () => {
                    setState(s => ({ ...s, connected: true }));
                    if (reconnectTimeout.current) clearTimeout(reconnectTimeout.current);
                };
                
                ws.current.onclose = () => {
                    setState(s => ({ ...s, connected: false }));
                    reconnectTimeout.current = setTimeout(connect, 2000);
                };

                ws.current.onerror = () => {
                    setState(s => ({ ...s, connected: false }));
                };
                
                ws.current.onmessage = (e) => {
                    try {
                        const data = JSON.parse(e.data);
                        if (data.type === 'state') {
                            setState(s => ({
                                ...s,
                                ...data,
                                connected: true
                            }));
                        }
                    } catch (err) { }
                };
            } catch (err) {
                reconnectTimeout.current = setTimeout(connect, 2000);
            }
        }

        connect();

        return () => {
            if (reconnectTimeout.current) clearTimeout(reconnectTimeout.current);
            if (ws.current) ws.current.close();
        };
    }, []);

    const sendAction = (action, value = null) => {
        if (ws.current && ws.current.readyState === WebSocket.OPEN) {
            const payload = { action };
            if (value !== null) payload.value = value;
            ws.current.send(JSON.stringify(payload));

            // Optimistic UI updates
            if (action === 'toggleRun') {
                if (state.runMode === 2) { // SINGLE
                    setState(s => ({ ...s, isRunning: true }));
                    setTimeout(() => setState(s => ({ ...s, isRunning: false })), 200);
                } else if (state.runMode === 1) { // BURST
                    setState(s => ({ ...s, isRunning: true }));
                    setTimeout(() => setState(s => ({ ...s, isRunning: false })), 600);
                } else {
                    setState(s => ({ ...s, isRunning: !s.isRunning }));
                }
            }
            if (action === 'probeCoil') setState(s => ({ ...s, coilCurrentStatus: 'PROBING...' }));
            if (action === 'setRpm') setState(s => ({ ...s, rpm: value }));
            if (action === 'setDwell') setState(s => ({ ...s, dwellMs: value }));
            if (action === 'setMode') setState(s => ({ ...s, pulseMode: value, isRunning: false }));
            if (action === 'setRunMode') setState(s => ({ ...s, runMode: value, isRunning: false }));
            if (action === 'setIscDuty') setState(s => ({ ...s, iscDuty: value }));
            if (action === 'setIscFreq') setState(s => ({ ...s, iscFreq: value }));
            if (action === 'setSpeedoKmh') setState(s => ({ ...s, speedoKmh: value }));
            if (action === 'setSpeedoRpm') setState(s => ({ ...s, speedoRpm: value }));
            if (action === 'setSpeedoMaxRpm') {
                const maxVal = Number(value) || 16000;
                localStorage.setItem('speedoMaxRpm', maxVal);
                setState(s => {
                    if (s.speedoRpm > maxVal) {
                        setTimeout(() => sendAction('setSpeedoRpm', maxVal), 10);
                    }
                    return { ...s, speedoMaxRpm: maxVal };
                });
            }
            if (action === 'setSpeedoTemp') setState(s => ({ ...s, speedoTempPercent: value }));
            if (action === 'setSpeedoFuel') setState(s => ({ ...s, speedoFuelPercent: value }));
            if (action === 'toggleSpeedoChannel') {
                if (value.channel === 'rpm') setState(s => ({ ...s, speedoEnableRpm: value.value }));
                if (value.channel === 'kmh') setState(s => ({ ...s, speedoEnableKmh: value.value }));
                if (value.channel === 'temp') setState(s => ({ ...s, speedoEnableTemp: value.value }));
                if (value.channel === 'fuel') setState(s => ({ ...s, speedoEnableFuel: value.value }));
            }
            if (action === 'setTachoPpr') setState(s => ({ ...s, speedoTachoPpr: value }));
            if (action === 'setSpeedoGaugeCurve') setState(s => ({ ...s, speedoGaugeCurve: value }));
            if (action === 'setSpeedoDacRouting') setState(s => ({ ...s, speedoDacRouting: value }));
            if (action === 'setSpeedoPwmFreq') setState(s => ({ ...s, speedoPwmFreqHz: value }));
            if (action === 'setSpeedoTempCal') {
                setState(s => ({
                    ...s,
                    speedoTempCalMin: value.min !== undefined ? value.min : s.speedoTempCalMin,
                    speedoTempCalMid: value.mid !== undefined ? value.mid : s.speedoTempCalMid,
                    speedoTempCalMax: value.max !== undefined ? value.max : s.speedoTempCalMax
                }));
            }
            if (action === 'setSpeedoFuelCal') {
                setState(s => ({
                    ...s,
                    speedoFuelCalMin: value.min !== undefined ? value.min : s.speedoFuelCalMin,
                    speedoFuelCalMid: value.mid !== undefined ? value.mid : s.speedoFuelCalMid,
                    speedoFuelCalMax: value.max !== undefined ? value.max : s.speedoFuelCalMax
                }));
            }
            if (action === 'setDuty') setState(s => ({ ...s, dutyCycle: value }));
            if (action === 'setSweepTime') setState(s => ({ ...s, sweepTimeSec: value }));
            if (action === 'setPulsePerKm') setState(s => ({ ...s, pulsePerKm: value }));
            if (action === 'setRpmStep') setState(s => ({ ...s, rpmStep: value }));
            if (action === 'setInjectorMs') setState(s => ({ ...s, injectorMs: value }));
            if (action === 'setInjectorRpm') setState(s => ({ ...s, injectorRpm: value }));
            if (action === 'startInjectorFlow') setState(s => ({ ...s, injectorFlowRunning: true, injectorFlowPulses: value, injectorPulsesLeft: value, isRunning: true }));
            if (action === 'stopInjectorFlow') setState(s => ({ ...s, injectorFlowRunning: false, isRunning: false }));
            if (action === 'startInjectorDiag') setState(s => ({ ...s, injectorAutoDiagRunning: true, injectorDiagPhase: 1, injectorDiagProgress: 0, isRunning: true }));
            if (action === 'stopInjectorDiag') setState(s => ({ ...s, injectorAutoDiagRunning: false, injectorDiagPhase: 0, isRunning: false }));
            if (action === 'setIacvSteps') setState(s => ({ ...s, iacvTargetSteps: value }));
            if (action === 'iacvHome') setState(s => ({ ...s, iacvAutoCalibrating: true }));
            if (action === 'setStepperSpeed') setState(s => ({ ...s, stepperSpeed: value }));
            if (action === 'stepperSpin') setState(s => ({ ...s, stepperSpinDir: value, isRunning: (value !== 0) }));
            if (action === 'setHallDacVoltage') setState(s => ({ ...s, hallDacVoltage: value }));
            if (action === 'setHallDacFreq') setState(s => ({ ...s, hallDacFreqHz: value }));
            if (action === 'setHallDacWaveform') setState(s => ({ ...s, hallDacWaveform: value }));
            if (action === 'setHallDacProfile') {
                const p = value;
                setState(s => {
                    let v = s.hallDacVoltage;
                    let w = 0;
                    let f = s.hallDacFreqHz;
                    let d = s.hallDacDomain || 0;
                    if (p === 0) { w = 0; d = 0; }
                    else if (p === 1) { w = 0; v = 0.75; d = 0; }
                    else if (p === 2 || p === 3) { w = 0; v = 2.50; d = 0; }
                    else if (p === 4) { w = 0; v = 1.80; d = 0; }
                    else if (p === 5) { w = 0; v = 0.80; d = 0; }
                    else if (p === 6) { w = 0; v = 0.45; d = 0; }
                    else if (p === 7) { w = 2; f = 50; d = 0; }
                    else if (p === 8) { w = 2; f = 66; d = 0; }
                    else if (p === 11) { w = 2; f = 66; d = 1; }
                    else if (p === 12) { w = 2; f = 50; d = 1; }
                    else if (p === 13) { w = 2; f = 100; d = 1; }
                    else if (p === 14) { w = 0; v = 2.50; d = 1; }
                    else if (p === 15) { w = 0; v = 5.00; d = 1; }
                    return { ...s, hallDacProfile: p, hallDacVoltage: v, hallDacWaveform: w, hallDacFreqHz: f, hallDacDomain: d };
                });
            }
            if (action === 'setHallDacDomain') {
                const d = value;
                setState(s => {
                    if (d === 0) {
                        return { ...s, hallDacDomain: 0, hallDacProfile: 1, hallDacWaveform: 0, hallDacVoltage: 0.75 };
                    } else {
                        return { ...s, hallDacDomain: 1, hallDacProfile: 11, hallDacWaveform: 2, hallDacFreqHz: 66 };
                    }
                });
            }
            if (action === 'startCoilDiag') setState(s => ({ ...s, coilAutoDiagRunning: true, coilDiagPhase: 1, coilDiagProgress: 0 }));
            if (action === 'stopCoilDiag') setState(s => ({ ...s, coilAutoDiagRunning: false, coilDiagPhase: 0 }));
            if (action === 'resetCoilCounters') setState(s => ({ ...s, coilFiredCount: 0, coilIgfCount: 0, coilMissedCount: 0, coilHealthPercent: 100.0 }));
            if (action === 'resetLeakCounter') setState(s => ({ ...s, coilLeakCount: 0, coilLeakRate: 0, coilLeakDetected: false }));
        }
    };

    const isIsc = state.pulseMode === 5;
    const isSpeedo = state.pulseMode === 6;
    const isIacv = state.pulseMode === 7;
    const isStepperUni = state.pulseMode === 8;
    const isHallDac = state.pulseMode === 9;

    const renderModeSelector = () => html`
        <${ModeSelector} 
            mode=${state.pulseMode}
            runMode=${state.runMode}
            isOpen=${state.isDrawerOpen}
            onClose=${() => setState(s => ({ ...s, isDrawerOpen: false }))}
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
    `;

    const renderDashboard = () => {
        if (state.pulseMode === 0) return html`<${DashboardCoilPassive} state=${state} sendAction=${sendAction} modeSelector=${renderModeSelector()} />`;
        if (state.pulseMode === 1) return html`<${DashboardCoilActive3P} state=${state} sendAction=${sendAction} modeSelector=${renderModeSelector()} />`;
        if (state.pulseMode === 2) return html`<${DashboardCoilActive4P} state=${state} sendAction=${sendAction} modeSelector=${renderModeSelector()} />`;
        if (state.pulseMode === 3) return html`<${DashboardInjector} state=${state} sendAction=${sendAction} modeSelector=${renderModeSelector()} />`;
        if (state.pulseMode === 4) return html`<${DashboardPwm} state=${state} sendAction=${sendAction} modeSelector=${renderModeSelector()} />`;
        if (state.pulseMode === 5) return html`<${DashboardIsc3Pin} state=${state} sendAction=${sendAction} modeSelector=${renderModeSelector()} />`;
        if (state.pulseMode === 6) return html`<${DashboardSpeedo} state=${state} sendAction=${sendAction} modeSelector=${renderModeSelector()} />`;
        if (state.pulseMode === 7) return html`<${DashboardStepperIacv} state=${state} sendAction=${sendAction} modeSelector=${renderModeSelector()} />`;
        if (state.pulseMode === 8) return html`<${DashboardStepperUni} state=${state} sendAction=${sendAction} modeSelector=${renderModeSelector()} />`;
        if (state.pulseMode === 9) return html`<${DashboardHallDac} state=${state} sendAction=${sendAction} modeSelector=${renderModeSelector()} />`;
        return null;
    };

    const getModeLabel = () => {
        switch (state.pulseMode) {
            case 0: return 'COIL 2P (PASIF)';
            case 1: return 'COIL 3P (AKTIF)';
            case 2: return 'COIL 4P (AKTIF)';
            case 3: return 'INJEKTOR BENSIN';
            case 4: return 'SOLENOID (2P)';
            case 5: return 'ISC (3-PIN)';
            case 6: return 'SPEEDOMETER';
            case 7: return 'STEPPER IACV';
            case 8: return 'STEPPER KONTINU';
            case 9: return 'HALL & VADJ (0-5V)';
            default: return 'UNKNOWN';
        }
    };

    return html`
        <header>
            <div class="title">IGNITION PRO <span style="font-size: 0.65rem; color: var(--neon-cyan); margin-left: 4px; font-weight: normal;">v2.5.0</span></div>
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
            <span>MODE: ${getModeLabel()}</span>
            <span>▼</span>
        </button>

        ${(!isIacv && !isStepperUni && !isIsc && !isHallDac) ? html`
            <div class="submode-container">
                ${[
                    { id: 0, label: 'CONT' },
                    ...(isSpeedo ? [] : [
                        { id: 1, label: 'BURST' },
                        { id: 2, label: 'SINGLE' }
                    ]),
                    { id: 3, label: state.pulseMode === 3 ? 'CLEAN' : 'SWEEP' }
                ].map(rm => html`
                    <button 
                        class="btn btn-submode ${state.runMode === rm.id ? 'btn-active' : ''}"
                        onClick=${() => sendAction('setRunMode', rm.id)}
                        disabled=${!state.connected || state.isRunning}
                    >
                        ${rm.label}
                    </button>
                `)}
            </div>
        ` : null}

        <div class="grid">
            ${renderDashboard()}
        </div>
    `;
}

render(html`<${App} />`, document.getElementById('app'));
