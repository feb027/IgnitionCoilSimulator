#include "NetworkManager.h"
#include <WiFi.h>
#include <LittleFS.h>
#include <ArduinoJson.h>
#include "PeripheralManager.h"
#include "../ui/MenuSystem.h"
#include "../modes/PeripheralCoilActive4P.h"
#include "../modes/PeripheralInjector.h"
#include "../modes/PeripheralStepperIacv.h"
#include "../modes/PeripheralStepperUni.h"
#include "CoilLeakSensor.h"
#include "services/Ads1115Service.h"
#include "services/TempSensorService.h"

NetworkManager::NetworkManager(SettingsManager& settingsMgr, PeripheralManager& peripheralMgr, MenuSystem& menuSys)
    : _settingsMgr(settingsMgr), 
      _peripheralMgr(peripheralMgr),
      _menuSys(menuSys),
      _server(80), 
      _ws("/ws"), 
      _lastBroadcastMs(0) {
    _lastBroadcastedState = _settingsMgr.getSettings();
}

void NetworkManager::begin() {
    // 1. Initialize LittleFS for web UI assets
    if (!LittleFS.begin(true)) {
        Serial.println("LittleFS Mount Failed");
    }

    // 2. Setup Access Point (Open, No Password)
    WiFi.mode(WIFI_AP);
    WiFi.softAP("Coil_Simulator_AP");
    Serial.print("AP IP Address: ");
    Serial.println(WiFi.softAPIP());

    // 3. Setup WebSocket
    _ws.onEvent([this](AsyncWebSocket *server, AsyncWebSocketClient *client, AwsEventType type, void *arg, uint8_t *data, size_t len) {
        this->onWebSocketEvent(server, client, type, arg, data, len);
    });
    _server.addHandler(&_ws);

    // 4. Serve static files from LittleFS
    _server.serveStatic("/", LittleFS, "/").setDefaultFile("index.html");

    // 5. Start Server
    _server.begin();
    Serial.println("HTTP Server & WebSocket started");
}

void NetworkManager::update() {
    _ws.cleanupClients();
    
    uint32_t now = millis();
    AppSettings& current = _settingsMgr.getSettings();
    
    bool isSweeping = (current.isRunning && current.mode == MODE_SWEEP);
    bool runStateChanged = (current.isRunning != _lastBroadcastedState.isRunning);
    bool modeChanged = (current.pulseMode != _lastBroadcastedState.pulseMode) || (current.mode != _lastBroadcastedState.mode);
    bool timeDue = (now - _lastBroadcastMs > 100);
    
    bool dirty = isSweeping || runStateChanged || modeChanged || (timeDue && (
                 (current.rpm != _lastBroadcastedState.rpm) ||
                 (current.dwellMs != _lastBroadcastedState.dwellMs) ||
                 (current.iscDuty != _lastBroadcastedState.iscDuty) ||
                 (current.iscFreq != _lastBroadcastedState.iscFreq) ||
                 (current.speedoEnableRpm != _lastBroadcastedState.speedoEnableRpm) ||
                 (current.speedoEnableKmh != _lastBroadcastedState.speedoEnableKmh) ||
                 (current.speedoEnableTemp != _lastBroadcastedState.speedoEnableTemp) ||
                 (current.speedoEnableFuel != _lastBroadcastedState.speedoEnableFuel) ||
                 (current.speedoTachoPpr != _lastBroadcastedState.speedoTachoPpr) ||
                 (current.speedoGaugeCurve != _lastBroadcastedState.speedoGaugeCurve) ||
                 (current.speedoDacRouting != _lastBroadcastedState.speedoDacRouting) ||
                 (current.speedoTempCalMin != _lastBroadcastedState.speedoTempCalMin) ||
                 (current.speedoTempCalMid != _lastBroadcastedState.speedoTempCalMid) ||
                 (current.speedoTempCalMax != _lastBroadcastedState.speedoTempCalMax) ||
                 (current.speedoFuelCalMin != _lastBroadcastedState.speedoFuelCalMin) ||
                 (current.speedoFuelCalMid != _lastBroadcastedState.speedoFuelCalMid) ||
                 (current.speedoFuelCalMax != _lastBroadcastedState.speedoFuelCalMax) ||
                 (current.speedoKmh != _lastBroadcastedState.speedoKmh) ||
                 (current.speedoRpm != _lastBroadcastedState.speedoRpm) ||
                 (current.speedoTempPercent != _lastBroadcastedState.speedoTempPercent) ||
                 (current.speedoFuelPercent != _lastBroadcastedState.speedoFuelPercent) ||
                 (current.currentSpeedoKmh != _lastBroadcastedState.currentSpeedoKmh) ||
                 (current.currentSpeedoRpm != _lastBroadcastedState.currentSpeedoRpm) ||
                 (current.currentSpeedoTempPercent != _lastBroadcastedState.currentSpeedoTempPercent) ||
                 (current.currentSpeedoFuelPercent != _lastBroadcastedState.currentSpeedoFuelPercent) ||
                 (current.currentRpm != _lastBroadcastedState.currentRpm) ||
                 (fabs(current.coilPeakCurrentA - _lastBroadcastedState.coilPeakCurrentA) > 0.05f) ||
                 (fabs(current.coilSparkCurrentmA - _lastBroadcastedState.coilSparkCurrentmA) > 0.5f) ||
                 (current.coilSparkHealthScore != _lastBroadcastedState.coilSparkHealthScore) ||
                 (current.coilConnected != _lastBroadcastedState.coilConnected) ||
                 (strcmp(current.coilCurrentStatus, _lastBroadcastedState.coilCurrentStatus) != 0) ||
                 (current.coilFiredCount != _lastBroadcastedState.coilFiredCount) ||
                 (current.coilIgfCount != _lastBroadcastedState.coilIgfCount) ||
                 (current.coilSparkReturnCount != _lastBroadcastedState.coilSparkReturnCount) ||
                 (current.coilAutoDiagRunning != _lastBroadcastedState.coilAutoDiagRunning) ||
                 (current.coilDiagProgress != _lastBroadcastedState.coilDiagProgress)));
                 
    if (dirty) {
        broadcastState();
        _lastBroadcastMs = now;
    }
}

void NetworkManager::broadcastState() {
    AppSettings& s = _settingsMgr.getSettings();
    _lastBroadcastedState = s;
    if (_ws.count() == 0 || !_ws.availableForWriteAll()) return;
    
    JsonDocument doc;
    
    doc["type"] = "state";
    doc["isRunning"] = s.isRunning;
    doc["pulseMode"] = (int)s.pulseMode;
    doc["runMode"] = (int)s.mode;
    doc["rpm"] = s.rpm;
    doc["rpmStep"] = s.rpmStep;
    doc["dwellMs"] = s.dwellMs;
    doc["dutyCycle"] = s.dutyCycle;
    doc["iscDuty"] = s.iscDuty;
    doc["iscFreq"] = s.iscFreq;
    doc["sweepTimeSec"] = s.sweepTimeSec;
    doc["sweepMinRpm"] = s.sweepMinRpm;
    doc["sweepMaxRpm"] = s.sweepMaxRpm;
    doc["pulsePerKm"] = s.pulsePerKm;
    doc["stepperSpeed"] = s.stepperSpeed;
    doc["stepperSpinDir"] = s.stepperSpinDir;
    doc["speedoKmh"] = s.speedoKmh;
    doc["speedoRpm"] = s.speedoRpm;
    doc["speedoTemp"] = s.speedoTempPercent;
    doc["speedoFuel"] = s.speedoFuelPercent;
    doc["speedoRpmStep"] = s.speedoRpmStep;
    doc["speedoKmhStep"] = s.speedoKmhStep;
    doc["speedoTempStep"] = s.speedoTempStep;
    doc["speedoFuelStep"] = s.speedoFuelStep;
    doc["speedoEnableRpm"] = s.speedoEnableRpm;
    doc["speedoEnableKmh"] = s.speedoEnableKmh;
    doc["speedoEnableTemp"] = s.speedoEnableTemp;
    doc["speedoEnableFuel"] = s.speedoEnableFuel;
    doc["speedoTachoPpr"] = s.speedoTachoPpr;
    doc["speedoGaugeCurve"] = s.speedoGaugeCurve;
    doc["speedoDacRouting"] = s.speedoDacRouting;
    doc["speedoPwmFreqHz"] = s.speedoPwmFreqHz;
    doc["speedoTempCalMin"] = s.speedoTempCalMin;
    doc["speedoTempCalMid"] = s.speedoTempCalMid;
    doc["speedoTempCalMax"] = s.speedoTempCalMax;
    doc["speedoFuelCalMin"] = s.speedoFuelCalMin;
    doc["speedoFuelCalMid"] = s.speedoFuelCalMid;
    doc["speedoFuelCalMax"] = s.speedoFuelCalMax;
    doc["speedoDacFuelDetected"] = s.speedoDacFuelFound;
    doc["speedoDacTempDetected"] = s.speedoDacTempFound;
    
    // Read-only live values for speedo & coil sweeping
    doc["currentSpeedoKmh"] = s.currentSpeedoKmh;
    doc["currentSpeedoRpm"] = s.currentSpeedoRpm;
    doc["currentSpeedoTemp"] = s.currentSpeedoTempPercent;
    doc["currentSpeedoFuel"] = s.currentSpeedoFuelPercent;
    doc["currentRpm"] = s.currentRpm;
    
    // Coil Diagnostic Telemetry
    doc["coilFiredCount"] = s.coilFiredCount;
    doc["coilIgfCount"] = s.coilIgfCount;
    doc["coilSparkReturnCount"] = s.coilSparkReturnCount;
    doc["coilMissedCount"] = s.coilMissedCount;
    doc["coilHealthPercent"] = s.coilHealthPercent;
    doc["coilPeakCurrentA"] = s.coilPeakCurrentA;
    doc["coilSparkCurrentmA"] = s.coilSparkCurrentmA;
    doc["coilSparkHealthScore"] = s.coilSparkHealthScore;
    doc["coilAutoDiagRunning"] = s.coilAutoDiagRunning;
    doc["coilDiagPhase"] = s.coilDiagPhase;
    doc["coilDiagProgress"] = s.coilDiagProgress;
    doc["coilDiagVerdict"] = s.coilDiagVerdict;
    doc["coilLeakCount"] = s.coilLeakCount;
    doc["coilLeakRate"] = s.coilLeakRate;
    doc["coilLeakDetected"] = s.coilLeakDetected;
    doc["coilLeakSensitivity"] = s.coilLeakSensitivity;
    doc["coilLeakThreshold"] = s.coilLeakThreshold;
    doc["coilLeakDebounceMs"] = s.coilLeakDebounceMs;
    doc["coilLeakPercent"] = s.coilLeakPercent;
    doc["leakArcCutIn"] = s.leakArcCutIn;
    doc["leakArc25"] = s.leakArc25;
    doc["leakArc50"] = s.leakArc50;
    doc["leakArc75"] = s.leakArc75;
    doc["leakArc100"] = s.leakArc100;
    doc["leakArcMax"] = s.leakArcMax;
    doc["calSparkPrima"] = s.calSparkPrima;
    doc["calSparkBaik"] = s.calSparkBaik;
    doc["calSparkCukup"] = s.calSparkCukup;
    doc["calSparkKurang"] = s.calSparkKurang;
    doc["calSparkGain"] = s.calSparkGain;
    doc["calCadencePrima"] = s.calCadencePrima;
    doc["calCadenceBaik"] = s.calCadenceBaik;
    doc["calCadenceCukup"] = s.calCadenceCukup;
    doc["calCadenceKurang"] = s.calCadenceKurang;
    doc["calCadenceDebounceMs"] = s.calCadenceDebounceMs;
    doc["calCadenceWindowMs"] = s.calCadenceWindowMs;
    doc["calCurrentPrima"] = s.calCurrentPrima;
    doc["calCurrentBaik"] = s.calCurrentBaik;
    doc["calCurrentCukup"] = s.calCurrentCukup;
    doc["calCurrentKurang"] = s.calCurrentKurang;
    doc["calCurrentMax"] = s.calCurrentMax;
    doc["calCurrentZeroVolt"] = s.calCurrentZeroVolt;
    doc["calTempPrima"] = s.calTempPrima;
    doc["calTempBaik"] = s.calTempBaik;
    doc["calTempCukup"] = s.calTempCukup;
    doc["calTempPanas"] = s.calTempPanas;
    doc["calTempCutoff"] = s.calTempCutoff;
    doc["calTempOffset"] = s.calTempOffset;
    doc["calVoltGain"] = s.calVoltGain;
    doc["calVoltOffset"] = s.calVoltOffset;
    doc["calDcCurrentGain"] = s.calDcCurrentGain;
    doc["calDcCurrentOffset"] = s.calDcCurrentOffset;
    doc["coilLeakSeverity"] = s.coilLeakSeverity;
    doc["coilCurrentStatus"] = s.coilCurrentStatus;
    doc["coilConnected"] = s.coilConnected;

    // Auxiliary Sensor Telemetry (ADS1115 ADC Voltmeter, Dual DS18B20 Temp & Real Current)
    doc["supplyVoltage"] = Ads1115Service::getInstance().getSupplyVoltage(s.calVoltGain, s.calVoltOffset);
    doc["realCurrentA"] = s.realCurrentA;
    doc["tempCoilC"] = TempSensorService::getInstance().getCoilTempC();
    doc["tempDriverC"] = TempSensorService::getInstance().getDriverTempC();
    doc["checkCoilPulseCount"] = s.checkCoilPulseCount;
    doc["checkCoilVerdict"] = s.checkCoilVerdict;
    
    // Injector Telemetry
    doc["injectorMs"] = s.injectorMs;
    doc["injectorRpm"] = s.injectorRpm;
    doc["injectorFlowPulses"] = s.injectorFlowPulses;
    doc["injectorPulsesLeft"] = s.injectorPulsesLeft;
    doc["injectorFlowRunning"] = s.injectorFlowRunning;
    doc["injectorPeakCurrentA"] = s.injectorPeakCurrentA;
    doc["injectorResistanceOhm"] = s.injectorResistanceOhm;
    doc["injectorAutoDiagRunning"] = s.injectorAutoDiagRunning;
    doc["injectorDiagPhase"] = s.injectorDiagPhase;
    doc["injectorDiagProgress"] = s.injectorDiagProgress;
    doc["injectorDiagVerdict"] = s.injectorDiagVerdict;
    
    // IACV Stepper Telemetry
    doc["iacvTargetSteps"] = s.iacvTargetSteps;
    doc["iacvCurrentSteps"] = s.iacvCurrentSteps;
    doc["iacvAutoCalibrating"] = s.iacvAutoCalibrating;
    
    // Hall & VADJ DAC Telemetry
    doc["hallDacVoltage"] = s.hallDacVoltage;
    doc["hallDacFreqHz"] = s.hallDacFreqHz;
    doc["hallDacWaveform"] = s.hallDacWaveform;
    doc["hallDacProfile"] = s.hallDacProfile;
    doc["hallDacDomain"] = s.hallDacDomain;
    doc["hallDacConnected"] = s.hallDacConnected;
    
    String output;
    serializeJson(doc, output);
    _ws.textAll(output);
    
    _lastBroadcastedState = s;
}

void NetworkManager::onWebSocketEvent(AsyncWebSocket *server, AsyncWebSocketClient *client, AwsEventType type, void *arg, uint8_t *data, size_t len) {
    if (type == WS_EVT_CONNECT) {
        Serial.printf("WebSocket client #%u connected from %s\n", client->id(), client->remoteIP().toString().c_str());
        AppSettings& s = _settingsMgr.getSettings();
        JsonDocument doc;
        doc["type"] = "state";
        doc["isRunning"] = s.isRunning;
        doc["pulseMode"] = (int)s.pulseMode;
        doc["runMode"] = (int)s.mode;
        doc["rpm"] = s.rpm;
        doc["rpmStep"] = s.rpmStep;
        doc["dwellMs"] = s.dwellMs;
        doc["dutyCycle"] = s.dutyCycle;
        doc["iscDuty"] = s.iscDuty;
        doc["iscFreq"] = s.iscFreq;
        doc["sweepTimeSec"] = s.sweepTimeSec;
        doc["sweepMinRpm"] = s.sweepMinRpm;
        doc["sweepMaxRpm"] = s.sweepMaxRpm;
        doc["pulsePerKm"] = s.pulsePerKm;
        doc["stepperSpeed"] = s.stepperSpeed;
        doc["stepperSpinDir"] = s.stepperSpinDir;
        doc["speedoKmh"] = s.speedoKmh;
        doc["speedoRpm"] = s.speedoRpm;
        doc["speedoTemp"] = s.speedoTempPercent;
        doc["speedoFuel"] = s.speedoFuelPercent;
        doc["speedoRpmStep"] = s.speedoRpmStep;
        doc["speedoKmhStep"] = s.speedoKmhStep;
        doc["speedoTempStep"] = s.speedoTempStep;
        doc["speedoFuelStep"] = s.speedoFuelStep;
        doc["speedoEnableRpm"] = s.speedoEnableRpm;
        doc["speedoEnableKmh"] = s.speedoEnableKmh;
        doc["speedoEnableTemp"] = s.speedoEnableTemp;
        doc["speedoEnableFuel"] = s.speedoEnableFuel;
        doc["speedoTachoPpr"] = s.speedoTachoPpr;
        doc["speedoGaugeCurve"] = s.speedoGaugeCurve;
        doc["speedoDacRouting"] = s.speedoDacRouting;
        doc["speedoDacFuelDetected"] = s.speedoDacFuelFound;
        doc["speedoDacTempDetected"] = s.speedoDacTempFound;
        doc["currentSpeedoKmh"] = s.currentSpeedoKmh;
        doc["currentSpeedoRpm"] = s.currentSpeedoRpm;
        doc["currentSpeedoTemp"] = s.currentSpeedoTempPercent;
        doc["currentSpeedoFuel"] = s.currentSpeedoFuelPercent;
        doc["currentRpm"] = s.currentRpm;
        
        doc["coilFiredCount"] = s.coilFiredCount;
        doc["coilIgfCount"] = s.coilIgfCount;
        doc["coilSparkReturnCount"] = s.coilSparkReturnCount;
        doc["coilMissedCount"] = s.coilMissedCount;
        doc["coilHealthPercent"] = s.coilHealthPercent;
        doc["coilPeakCurrentA"] = s.coilPeakCurrentA;
        doc["coilSparkCurrentmA"] = s.coilSparkCurrentmA;
        doc["coilSparkHealthScore"] = s.coilSparkHealthScore;
        doc["coilAutoDiagRunning"] = s.coilAutoDiagRunning;
        doc["coilDiagPhase"] = s.coilDiagPhase;
        doc["coilDiagProgress"] = s.coilDiagProgress;
        doc["coilDiagVerdict"] = s.coilDiagVerdict;
        doc["coilLeakCount"] = s.coilLeakCount;
        doc["coilLeakRate"] = s.coilLeakRate;
        doc["coilLeakDetected"] = s.coilLeakDetected;
        doc["coilLeakPercent"] = s.coilLeakPercent;
        doc["leakArcCutIn"] = s.leakArcCutIn;
        doc["leakArc25"] = s.leakArc25;
        doc["leakArc50"] = s.leakArc50;
        doc["leakArc75"] = s.leakArc75;
        doc["leakArc100"] = s.leakArc100;
        doc["leakArcMax"] = s.leakArcMax;
        doc["calSparkPrima"] = s.calSparkPrima;
        doc["calSparkBaik"] = s.calSparkBaik;
        doc["calSparkCukup"] = s.calSparkCukup;
        doc["calSparkKurang"] = s.calSparkKurang;
        doc["calSparkGain"] = s.calSparkGain;
        doc["calCadencePrima"] = s.calCadencePrima;
        doc["calCadenceBaik"] = s.calCadenceBaik;
        doc["calCadenceCukup"] = s.calCadenceCukup;
        doc["calCadenceKurang"] = s.calCadenceKurang;
        doc["calCadenceDebounceMs"] = s.calCadenceDebounceMs;
        doc["calCadenceWindowMs"] = s.calCadenceWindowMs;
        doc["calCurrentPrima"] = s.calCurrentPrima;
        doc["calCurrentBaik"] = s.calCurrentBaik;
        doc["calCurrentCukup"] = s.calCurrentCukup;
        doc["calCurrentKurang"] = s.calCurrentKurang;
        doc["calCurrentMax"] = s.calCurrentMax;
        doc["calCurrentZeroVolt"] = s.calCurrentZeroVolt;
        doc["calTempPrima"] = s.calTempPrima;
        doc["calTempBaik"] = s.calTempBaik;
        doc["calTempCukup"] = s.calTempCukup;
        doc["calTempPanas"] = s.calTempPanas;
        doc["calTempCutoff"] = s.calTempCutoff;
        doc["calTempOffset"] = s.calTempOffset;
        doc["calVoltGain"] = s.calVoltGain;
        doc["calVoltOffset"] = s.calVoltOffset;
        doc["calDcCurrentGain"] = s.calDcCurrentGain;
        doc["calDcCurrentOffset"] = s.calDcCurrentOffset;
        doc["coilLeakSeverity"] = s.coilLeakSeverity;
        doc["coilCurrentStatus"] = s.coilCurrentStatus;
        doc["coilConnected"] = s.coilConnected;
        doc["supplyVoltage"] = Ads1115Service::getInstance().getSupplyVoltage(s.calVoltGain, s.calVoltOffset);
        doc["realCurrentA"] = s.realCurrentA;
        doc["tempCoilC"] = TempSensorService::getInstance().getCoilTempC();
        doc["tempDriverC"] = TempSensorService::getInstance().getDriverTempC();
        doc["checkCoilPulseCount"] = s.checkCoilPulseCount;
        doc["checkCoilVerdict"] = s.checkCoilVerdict;
        
        doc["injectorMs"] = s.injectorMs;
        doc["injectorRpm"] = s.injectorRpm;
        doc["injectorFlowPulses"] = s.injectorFlowPulses;
        doc["injectorPulsesLeft"] = s.injectorPulsesLeft;
        doc["injectorFlowRunning"] = s.injectorFlowRunning;
        doc["injectorPeakCurrentA"] = s.injectorPeakCurrentA;
        doc["injectorResistanceOhm"] = s.injectorResistanceOhm;
        doc["injectorAutoDiagRunning"] = s.injectorAutoDiagRunning;
        doc["injectorDiagPhase"] = s.injectorDiagPhase;
        doc["injectorDiagProgress"] = s.injectorDiagProgress;
        doc["injectorDiagVerdict"] = s.injectorDiagVerdict;
        
        doc["iacvTargetSteps"] = s.iacvTargetSteps;
        doc["iacvCurrentSteps"] = s.iacvCurrentSteps;
        doc["iacvAutoCalibrating"] = s.iacvAutoCalibrating;
        
        doc["hallDacVoltage"] = s.hallDacVoltage;
        doc["hallDacFreqHz"] = s.hallDacFreqHz;
        doc["hallDacWaveform"] = s.hallDacWaveform;
        doc["hallDacProfile"] = s.hallDacProfile;
        doc["hallDacDomain"] = s.hallDacDomain;
        doc["hallDacConnected"] = s.hallDacConnected;
        
        String output;
        serializeJson(doc, output);
        client->text(output);
    } else if (type == WS_EVT_DISCONNECT) {
        Serial.printf("WebSocket client #%u disconnected\n", client->id());
    } else if (type == WS_EVT_DATA) {
        handleWebSocketMessage(arg, data, len);
    }
}

void NetworkManager::handleWebSocketMessage(void *arg, uint8_t *data, size_t len) {
    AwsFrameInfo *info = (AwsFrameInfo*)arg;
    if (info->final && info->index == 0 && info->len == len && info->opcode == WS_TEXT) {
        data[len] = 0;
        
        JsonDocument doc;
        DeserializationError error = deserializeJson(doc, (char*)data);
        if (error) {
            Serial.print("deserializeJson() failed: ");
            Serial.println(error.c_str());
            return;
        }

        String action = doc["action"].as<String>();
        AppSettings& s = _settingsMgr.getSettings();
        bool changed = false;

        if (action == "toggleRun") {
            s.isRunning = !s.isRunning;
            if (s.isRunning) {
                _peripheralMgr.start();
            } else {
                _peripheralMgr.stop();
            }
            changed = true;
        } else if (action == "setMode") {
            int m = doc["value"].as<int>();
            s.pulseMode = (PulseMode)m;
            changed = true;
        } else if (action == "setRunMode") {
            s.mode = (CoilMode)doc["value"].as<int>();
            changed = true;
        } else if (action == "setRpm") {
            s.rpm = doc["value"].as<int>();
            changed = true;
        } else if (action == "setDwell") {
            s.dwellMs = doc["value"].as<float>();
            changed = true;
        } else if (action == "setDuty") {
            s.dutyCycle = doc["value"].as<float>();
            changed = true;
        } else if (action == "setIscDuty") {
            s.iscDuty = doc["value"].as<float>();
            changed = true;
        } else if (action == "setIscFreq") {
            s.iscFreq = doc["value"].as<int>();
            changed = true;
        } else if (action == "setSweepTime") {
            s.sweepTimeSec = doc["value"].as<float>();
            if (s.sweepTimeSec < 0.2f) s.sweepTimeSec = 0.2f;
            if (s.sweepTimeSec > 60.0f) s.sweepTimeSec = 60.0f;
            changed = true;
        } else if (action == "setSweepMinRpm") {
            s.sweepMinRpm = doc["value"].as<int>();
            changed = true;
        } else if (action == "setSweepMaxRpm") {
            s.sweepMaxRpm = doc["value"].as<int>();
            s.rpm = s.sweepMaxRpm;
            changed = true;
        } else if (action == "setRpmStep") {
            s.rpmStep = doc["value"].as<int>();
            changed = true;
        } else if (action == "setPulsePerKm") {
            s.pulsePerKm = doc["value"].as<int>();
            changed = true;
        } else if (action == "setSpeedoKmh") {
            s.speedoKmh = doc["value"].as<int>();
            changed = true;
        } else if (action == "setSpeedoRpm") {
            s.speedoRpm = doc["value"].as<int>();
            changed = true;
        } else if (action == "setSpeedoTemp") {
            s.speedoTempPercent = doc["value"].as<int>();
            changed = true;
        } else if (action == "setSpeedoFuel") {
            s.speedoFuelPercent = doc["value"].as<int>();
            changed = true;
        } else if (action == "setSpeedoRpmStep") {
            s.speedoRpmStep = doc["value"].as<int>();
            changed = true;
        } else if (action == "setSpeedoKmhStep") {
            s.speedoKmhStep = doc["value"].as<int>();
            changed = true;
        } else if (action == "setSpeedoTempStep") {
            s.speedoTempStep = doc["value"].as<int>();
            changed = true;
        } else if (action == "setSpeedoFuelStep") {
            s.speedoFuelStep = doc["value"].as<int>();
            changed = true;
        } else if (action == "setSpeedoEnable" || action == "toggleSpeedoChannel") {
            String ch = "";
            bool val = true;
            if (doc["value"].is<JsonObject>()) {
                ch = doc["value"]["channel"].as<String>();
                val = doc["value"]["value"].as<bool>();
            } else if (doc["channel"].is<const char*>()) {
                ch = doc["channel"].as<String>();
                val = doc["value"].as<bool>();
            }
            if (ch == "rpm") s.speedoEnableRpm = val;
            else if (ch == "kmh") s.speedoEnableKmh = val;
            else if (ch == "temp") s.speedoEnableTemp = val;
            else if (ch == "fuel") s.speedoEnableFuel = val;
            
            if (_peripheralMgr.getActive() != nullptr) {
                _peripheralMgr.getActive()->syncHardware();
            }
            changed = true;
        } else if (action == "setTachoPpr") {
            s.speedoTachoPpr = doc["value"].as<float>();
            changed = true;
        } else if (action == "setSpeedoGaugeCurve") {
            s.speedoGaugeCurve = doc["value"].as<int>();
            changed = true;
        } else if (action == "setSpeedoDacRouting") {
            s.speedoDacRouting = doc["value"].as<int>();
            if (_peripheralMgr.getActive() != nullptr) {
                _peripheralMgr.getActive()->syncHardware();
            }
            changed = true;
        } else if (action == "setSpeedoPwmFreq" || action == "setSpeedoPwmFreqHz") {
            int f = doc["value"].as<int>();
            if (f < 10) f = 10;
            if (f > 5000) f = 5000;
            s.speedoPwmFreqHz = f;
            _settingsMgr.save();
            if (_peripheralMgr.getActive() != nullptr) {
                _peripheralMgr.getActive()->syncHardware();
            }
            changed = true;
        } else if (action == "setSpeedoTempCal") {
            JsonObject valObj = doc["value"];
            if (valObj["min"].is<int>()) s.speedoTempCalMin = valObj["min"].as<int>();
            if (valObj["mid"].is<int>()) s.speedoTempCalMid = valObj["mid"].as<int>();
            if (valObj["max"].is<int>()) s.speedoTempCalMax = valObj["max"].as<int>();
            if (doc["min"].is<int>()) s.speedoTempCalMin = doc["min"].as<int>();
            if (doc["mid"].is<int>()) s.speedoTempCalMid = doc["mid"].as<int>();
            if (doc["max"].is<int>()) s.speedoTempCalMax = doc["max"].as<int>();
            _settingsMgr.save();
            if (_peripheralMgr.getActive() != nullptr) {
                _peripheralMgr.getActive()->syncHardware();
            }
            changed = true;
        } else if (action == "setSpeedoFuelCal") {
            JsonObject valObj = doc["value"];
            if (valObj["min"].is<int>()) s.speedoFuelCalMin = valObj["min"].as<int>();
            if (valObj["mid"].is<int>()) s.speedoFuelCalMid = valObj["mid"].as<int>();
            if (valObj["max"].is<int>()) s.speedoFuelCalMax = valObj["max"].as<int>();
            if (doc["min"].is<int>()) s.speedoFuelCalMin = doc["min"].as<int>();
            if (doc["mid"].is<int>()) s.speedoFuelCalMid = doc["mid"].as<int>();
            if (doc["max"].is<int>()) s.speedoFuelCalMax = doc["max"].as<int>();
            _settingsMgr.save();
            if (_peripheralMgr.getActive() != nullptr) {
                _peripheralMgr.getActive()->syncHardware();
            }
            changed = true;
        } else if (action == "setInjectorMs") {
            s.injectorMs = doc["value"].as<float>();
            changed = true;
        } else if (action == "setInjectorRpm") {
            s.injectorRpm = doc["value"].as<int>();
            changed = true;
        } else if (action == "startInjectorFlow") {
            if (s.pulseMode == PULSE_INJECTOR && _peripheralMgr.getActive() != nullptr) {
                int p = doc["value"].as<int>();
                ((PeripheralInjector*)_peripheralMgr.getActive())->startFlowTest(p);
                changed = true;
            }
        } else if (action == "stopInjectorFlow") {
            if (s.pulseMode == PULSE_INJECTOR && _peripheralMgr.getActive() != nullptr) {
                ((PeripheralInjector*)_peripheralMgr.getActive())->stopFlowTest();
                changed = true;
            }
        } else if (action == "startInjectorDiag") {
            if (s.pulseMode == PULSE_INJECTOR && _peripheralMgr.getActive() != nullptr) {
                ((PeripheralInjector*)_peripheralMgr.getActive())->startAutoDiag();
                changed = true;
            }
        } else if (action == "stopInjectorDiag") {
            if (s.pulseMode == PULSE_INJECTOR && _peripheralMgr.getActive() != nullptr) {
                ((PeripheralInjector*)_peripheralMgr.getActive())->stopAutoDiag();
                changed = true;
            }
        } else if (action == "setIacvSteps") {
            if (s.pulseMode == PULSE_STEPPER_IACV && _peripheralMgr.getActive() != nullptr) {
                int stp = doc["value"].as<int>();
                ((PeripheralStepperIacv*)_peripheralMgr.getActive())->setTargetSteps(stp);
                changed = true;
            }
        } else if (action == "iacvHome") {
            if (s.pulseMode == PULSE_STEPPER_IACV && _peripheralMgr.getActive() != nullptr) {
                ((PeripheralStepperIacv*)_peripheralMgr.getActive())->startAutoCalibrate();
                changed = true;
            }
        } else if (action == "iacvCycle") {
            if (s.pulseMode == PULSE_STEPPER_IACV && _peripheralMgr.getActive() != nullptr) {
                ((PeripheralStepperIacv*)_peripheralMgr.getActive())->cycleSweepTest();
                changed = true;
            }
        } else if (action == "setHallDacVoltage") {
            s.hallDacVoltage = doc["value"].as<float>();
            changed = true;
        } else if (action == "setHallDacFreq") {
            s.hallDacFreqHz = doc["value"].as<int>();
            changed = true;
        } else if (action == "setHallDacWaveform") {
            s.hallDacWaveform = doc["value"].as<int>();
            changed = true;
        } else if (action == "setHallDacProfile") {
            int p = doc["value"].as<int>();
            s.hallDacProfile = p;
            switch (p) {
                // 5V Domain Profiles
                case 0: s.hallDacWaveform = 0; s.hallDacDomain = 0; break;
                case 1: s.hallDacWaveform = 0; s.hallDacVoltage = 0.75f; s.hallDacDomain = 0; break;
                case 2: s.hallDacWaveform = 0; s.hallDacVoltage = 2.50f; s.hallDacDomain = 0; break;
                case 3: s.hallDacWaveform = 0; s.hallDacVoltage = 2.50f; s.hallDacDomain = 0; break;
                case 4: s.hallDacWaveform = 0; s.hallDacVoltage = 1.80f; s.hallDacDomain = 0; break;
                case 5: s.hallDacWaveform = 0; s.hallDacVoltage = 0.80f; s.hallDacDomain = 0; break;
                case 6: s.hallDacWaveform = 0; s.hallDacVoltage = 0.45f; s.hallDacDomain = 0; break;
                case 7: s.hallDacWaveform = 2; s.hallDacFreqHz = 50; s.hallDacDomain = 0; break;
                case 8: s.hallDacWaveform = 2; s.hallDacFreqHz = 66; s.hallDacDomain = 0; break;
                // 12V Domain Profiles
                case 11: s.hallDacWaveform = 2; s.hallDacFreqHz = 66; s.hallDacDomain = 1; break;  // VSS 12V
                case 12: s.hallDacWaveform = 2; s.hallDacFreqHz = 50; s.hallDacDomain = 1; break;  // CKP 12V
                case 13: s.hallDacWaveform = 2; s.hallDacFreqHz = 100; s.hallDacDomain = 1; break; // ABS 12V
                case 14: s.hallDacWaveform = 0; s.hallDacVoltage = 2.50f; s.hallDacDomain = 1; break; // GAUGE 12V
                case 15: s.hallDacWaveform = 0; s.hallDacVoltage = 5.00f; s.hallDacDomain = 1; break; // VADJ 0-12V
            }
            changed = true;
        } else if (action == "setHallDacDomain") {
            int d = doc["value"].as<int>();
            s.hallDacDomain = d;
            if (d == 0) {
                s.hallDacProfile = 1;
                s.hallDacWaveform = 0;
                s.hallDacVoltage = 0.75f;
            } else {
                s.hallDacProfile = 11;
                s.hallDacWaveform = 2;
                s.hallDacFreqHz = 66;
            }
            changed = true;
        } else if (action == "setStepperSpeed") {
            s.stepperSpeed = doc["value"].as<int>();
            changed = true;
        } else if (action == "stepperSpin") {
            if (s.pulseMode == PULSE_STEPPER_UNI && _peripheralMgr.getActive() != nullptr) {
                int dir = doc["value"].as<int>();
                ((PeripheralStepperUni*)_peripheralMgr.getActive())->setSpinDirection(dir);
                bool wantRun = (dir != 0);
                if (wantRun != s.isRunning) {
                    if (wantRun) _peripheralMgr.start();
                    else _peripheralMgr.stop();
                }
                changed = true;
            }
        } else if (action == "startCoilDiag") {
            if (s.pulseMode == PULSE_COIL_ACTIVE_4P && _peripheralMgr.getActive() != nullptr) {
                ((PeripheralCoilActive4P*)_peripheralMgr.getActive())->startAutoDiag();
                changed = true;
            }
        } else if (action == "stopCoilDiag") {
            if (s.pulseMode == PULSE_COIL_ACTIVE_4P && _peripheralMgr.getActive() != nullptr) {
                ((PeripheralCoilActive4P*)_peripheralMgr.getActive())->stopAutoDiag();
                changed = true;
            }
        } else if (action == "resetCoilCounters" || action == "resetCounters") {
            if (_peripheralMgr.getActive() != nullptr) {
                _peripheralMgr.getActive()->resetCounters();
            }
            changed = true;
        } else if (action == "resetLeakCounter") {
            CoilLeakSensor::reset(s);
            changed = true;
        } else if (action == "setLeakSensitivity") {
            int sens = doc["value"].as<int>();
            if (sens >= 1 && sens <= 6) {
                s.coilLeakSensitivity = sens;
                _settingsMgr.save();
                broadcastState();
            }
            return;
        } else if (action == "setLeakThreshold") {
            int th = doc["value"].as<int>();
            if (th >= 1 && th <= 50) {
                s.coilLeakThreshold = th;
                s.coilLeakSensitivity = 6; // Switch to Custom mode
                _settingsMgr.save();
                broadcastState();
            }
            return;
        } else if (action == "setLeakDebounce") {
            float db = doc["value"].as<float>();
            if (db >= 0.1f && db <= 8.0f) {
                s.coilLeakDebounceMs = db;
                s.coilLeakSensitivity = 6; // Switch to Custom mode
                _settingsMgr.save();
                broadcastState();
            }
            return;
        } else if (action == "setCustomLeakMatrix") {
            if (doc["cutIn"].is<int>()) s.leakArcCutIn = doc["cutIn"].as<int>();
            if (doc["arc25"].is<int>()) s.leakArc25 = doc["arc25"].as<int>();
            if (doc["arc50"].is<int>()) s.leakArc50 = doc["arc50"].as<int>();
            if (doc["arc75"].is<int>()) s.leakArc75 = doc["arc75"].as<int>();
            if (doc["arc100"].is<int>()) s.leakArc100 = doc["arc100"].as<int>();
            if (doc["arcMax"].is<int>()) s.leakArcMax = doc["arcMax"].as<int>();
            s.coilLeakSensitivity = 6; // Custom mode
            _settingsMgr.save(true);
            broadcastState();
            return;
        } else if (action == "setFullCalibrationMatrix") {
            if (doc["sparkPrima"].is<float>()) s.calSparkPrima = doc["sparkPrima"].as<float>();
            if (doc["sparkBaik"].is<float>()) s.calSparkBaik = doc["sparkBaik"].as<float>();
            if (doc["sparkCukup"].is<float>()) s.calSparkCukup = doc["sparkCukup"].as<float>();
            if (doc["sparkKurang"].is<float>()) s.calSparkKurang = doc["sparkKurang"].as<float>();
            if (doc["sparkGain"].is<float>()) s.calSparkGain = doc["sparkGain"].as<float>();
            
            if (doc["cadencePrima"].is<float>()) s.calCadencePrima = doc["cadencePrima"].as<float>();
            if (doc["cadenceBaik"].is<float>()) s.calCadenceBaik = doc["cadenceBaik"].as<float>();
            if (doc["cadenceCukup"].is<float>()) s.calCadenceCukup = doc["cadenceCukup"].as<float>();
            if (doc["cadenceKurang"].is<float>()) s.calCadenceKurang = doc["cadenceKurang"].as<float>();
            if (doc["cadenceDebounceMs"].is<float>()) s.calCadenceDebounceMs = doc["cadenceDebounceMs"].as<float>();
            if (doc["cadenceWindowMs"].is<float>()) s.calCadenceWindowMs = doc["cadenceWindowMs"].as<float>();
            
            if (doc["currentPrima"].is<float>()) s.calCurrentPrima = doc["currentPrima"].as<float>();
            if (doc["currentBaik"].is<float>()) s.calCurrentBaik = doc["currentBaik"].as<float>();
            if (doc["currentCukup"].is<float>()) s.calCurrentCukup = doc["currentCukup"].as<float>();
            if (doc["currentKurang"].is<float>()) s.calCurrentKurang = doc["currentKurang"].as<float>();
            if (doc["currentMax"].is<float>()) s.calCurrentMax = doc["currentMax"].as<float>();
            if (doc["currentZeroVolt"].is<float>()) s.calCurrentZeroVolt = doc["currentZeroVolt"].as<float>();
            
            if (doc["tempPrima"].is<float>()) s.calTempPrima = doc["tempPrima"].as<float>();
            if (doc["tempBaik"].is<float>()) s.calTempBaik = doc["tempBaik"].as<float>();
            if (doc["tempCukup"].is<float>()) s.calTempCukup = doc["tempCukup"].as<float>();
            if (doc["tempPanas"].is<float>()) s.calTempPanas = doc["tempPanas"].as<float>();
            if (doc["tempCutoff"].is<float>()) s.calTempCutoff = doc["tempCutoff"].as<float>();
            if (doc["tempOffset"].is<float>()) s.calTempOffset = doc["tempOffset"].as<float>();
            
            if (doc["voltGain"].is<float>()) s.calVoltGain = doc["voltGain"].as<float>();
            if (doc["voltOffset"].is<float>()) s.calVoltOffset = doc["voltOffset"].as<float>();
            if (doc["dcCurrentGain"].is<float>()) s.calDcCurrentGain = doc["dcCurrentGain"].as<float>();
            if (doc["dcCurrentOffset"].is<float>()) s.calDcCurrentOffset = doc["dcCurrentOffset"].as<float>();
            
            if (doc["cutIn"].is<int>()) s.leakArcCutIn = doc["cutIn"].as<int>();
            if (doc["arc25"].is<int>()) s.leakArc25 = doc["arc25"].as<int>();
            if (doc["arc50"].is<int>()) s.leakArc50 = doc["arc50"].as<int>();
            if (doc["arc75"].is<int>()) s.leakArc75 = doc["arc75"].as<int>();
            if (doc["arc100"].is<int>()) s.leakArc100 = doc["arc100"].as<int>();
            if (doc["arcMax"].is<int>()) s.leakArcMax = doc["arcMax"].as<int>();
            
            _settingsMgr.save(true);
            broadcastState();
            return;
        } else if (action == "probeCoil" || action == "runCheckCoil") {
            if (_peripheralMgr.getActive() != nullptr) {
                _peripheralMgr.getActive()->probeCoil();
                // Formulate multi-case diagnostic verdict
                float vBat = Ads1115Service::getInstance().getSupplyVoltage();
                if (vBat < 9.0f && vBat > 0.1f) {
                    snprintf(s.checkCoilVerdict, sizeof(s.checkCoilVerdict), "⚠️ LOW SUPPLY VOLTAGE (%.1fV)", vBat);
                } else if (s.coilPeakCurrentA > 11.0f) {
                    snprintf(s.checkCoilVerdict, sizeof(s.checkCoilVerdict), "🚨 DANGER: OVERCURRENT SHORT (>11A)");
                } else if (s.coilPeakCurrentA < 0.5f && s.coilFiredCount > 0) {
                    snprintf(s.checkCoilVerdict, sizeof(s.checkCoilVerdict), "⚠️ OPEN CIRCUIT: NO PRIMARY CURRENT (0A)");
                } else if (s.coilLeakDetected || s.coilLeakCount > 0) {
                    snprintf(s.checkCoilVerdict, sizeof(s.checkCoilVerdict), "⚠️ INSULATION LEAK DETECTED (PIN 36)");
                } else if (s.coilPeakCurrentA >= 5.0f) {
                    snprintf(s.checkCoilVerdict, sizeof(s.checkCoilVerdict), "✅ PASS: COIL & WIRING READY (%.1fA)", s.coilPeakCurrentA);
                } else {
                    snprintf(s.checkCoilVerdict, sizeof(s.checkCoilVerdict), "✓ PRE-FLIGHT CHECK COMPLETED (%.1fA)", s.coilPeakCurrentA);
                }
                changed = true;
            }
        } else if (action == "setCheckCoilPulses") {
            int p = doc["value"].as<int>();
            if (p >= 1 && p <= 10) {
                s.checkCoilPulseCount = p;
                _settingsMgr.save();
                changed = true;
            }
        }

        if (changed) {
            if (_peripheralMgr.getActive() != nullptr) {
                _peripheralMgr.getActive()->syncHardware();
            }
            _settingsMgr.save();
            _menuSys.wakeUp();
            broadcastState();
        }
    }
}
