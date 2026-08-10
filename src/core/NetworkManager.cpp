#include "NetworkManager.h"
#include <LittleFS.h>
#include <ArduinoJson.h>

#include "../ui/MenuSystem.h"

NetworkManager::NetworkManager(SettingsManager& settingsMgr, PeripheralManager& peripheralMgr, MenuSystem& menuSys) 
    : _settingsMgr(settingsMgr), _peripheralMgr(peripheralMgr), _menuSys(menuSys), _server(80), _ws("/ws"), _lastBroadcastMs(0) {
}

void NetworkManager::begin() {
    Serial.println("Starting NetworkManager...");

    // Initialize LittleFS
    if(!LittleFS.begin(true)){
        Serial.println("LittleFS Mount Failed");
        return;
    }

    // Start WiFi Access Point
    WiFi.softAP("Ignition_Pro"); // No password
    IPAddress IP = WiFi.softAPIP();
    Serial.print("AP IP address: ");
    Serial.println(IP);

    // Setup WebSocket
    _ws.onEvent([this](AsyncWebSocket *server, AsyncWebSocketClient *client, AwsEventType type, void *arg, uint8_t *data, size_t len) {
        this->onWebSocketEvent(server, client, type, arg, data, len);
    });
    _server.addHandler(&_ws);

    // Serve static files from LittleFS
    _server.serveStatic("/", LittleFS, "/").setDefaultFile("index.html");

    // Catch-all for 404
    _server.onNotFound([](AsyncWebServerRequest *request){
        request->send(404, "text/plain", "Not found");
    });

    _server.begin();
    
    // Copy current state for tracking
    _lastBroadcastedState = _settingsMgr.getSettings();
}

void NetworkManager::update() {
    _ws.cleanupClients();
    
    // Broadcast state every 100ms if changed, or periodically
    uint32_t now = millis();
    if (now - _lastBroadcastMs > 100) {
        AppSettings& current = _settingsMgr.getSettings();
        
        // Simple dirty check (compare a few key values)
        bool dirty = (current.isRunning != _lastBroadcastedState.isRunning) ||
                     (current.pulseMode != _lastBroadcastedState.pulseMode) ||
                     (current.mode != _lastBroadcastedState.mode) ||
                     (current.rpm != _lastBroadcastedState.rpm) ||
                     (current.dwellMs != _lastBroadcastedState.dwellMs) ||
                     (current.currentSpeedoKmh != _lastBroadcastedState.currentSpeedoKmh);
                     
        if (dirty) {
            broadcastState();
            _lastBroadcastedState = current;
        }
        _lastBroadcastMs = now;
    }
}

void NetworkManager::broadcastState() {
    if (_ws.count() == 0) return;
    
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
    doc["sweepTimeSec"] = s.sweepTimeSec;
    doc["pulsePerKm"] = s.pulsePerKm;
    doc["speedoKmh"] = s.speedoKmh;
    doc["speedoRpm"] = s.speedoRpm;
    doc["speedoTempPercent"] = s.speedoTempPercent;
    doc["speedoFuelPercent"] = s.speedoFuelPercent;
    
    // Read-only values for speedo sweeping
    doc["currentSpeedoKmh"] = s.currentSpeedoKmh;
    doc["currentSpeedoRpm"] = s.currentSpeedoRpm;
    
    String output;
    serializeJson(doc, output);
    _ws.textAll(output);
}

void NetworkManager::onWebSocketEvent(AsyncWebSocket *server, AsyncWebSocketClient *client, AwsEventType type, void *arg, uint8_t *data, size_t len) {
    if (type == WS_EVT_CONNECT) {
        Serial.printf("WS Client connected: %u\n", client->id());
        // Send immediate state sync on connect
        broadcastState();
    } else if (type == WS_EVT_DISCONNECT) {
        Serial.printf("WS Client disconnected: %u\n", client->id());
    } else if (type == WS_EVT_DATA) {
        AwsFrameInfo *info = (AwsFrameInfo*)arg;
        if (info->final && info->index == 0 && info->len == len && info->opcode == WS_TEXT) {
            handleWebSocketMessage(arg, data, len);
        }
    }
}

void NetworkManager::handleWebSocketMessage(void *arg, uint8_t *data, size_t len) {
    data[len] = 0; // Null terminate
    JsonDocument doc;
    DeserializationError error = deserializeJson(doc, (char*)data);
    
    if (error) {
        Serial.println("Failed to parse WS JSON");
        return;
    }
    
    if (!doc["action"].is<String>()) return;
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
        s.pulseMode = static_cast<PulseMode>(doc["value"].as<int>());
        changed = true;
    } else if (action == "setRunMode") {
        s.mode = static_cast<CoilMode>(doc["value"].as<int>());
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
    } else if (action == "setSweepTime") {
        s.sweepTimeSec = doc["value"].as<int>();
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
    } else if (action == "trigger") {
        // We need a way to pass trigger event, maybe we add a flag in settings
        // For now, we will just ignore or add it later if needed
    }
    
    if (changed || action == "trigger") {
        _menuSys.wakeUp(); // Wake up the screensaver
        
        if (_peripheralMgr.getActive() != nullptr) {
            _peripheralMgr.getActive()->syncHardware();
        }
    }
    
    if (changed) {
        _settingsMgr.save(); // Not ideal to save to NVS on every slider move, but we will throttle it on frontend
        broadcastState();
    }
}
