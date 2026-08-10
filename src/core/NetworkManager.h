#ifndef NETWORK_MANAGER_H
#define NETWORK_MANAGER_H

#include <Arduino.h>
#include <WiFi.h>
#include <ESPAsyncWebServer.h>
#include "SettingsManager.h"

class NetworkManager {
public:
    NetworkManager(SettingsManager& settingsMgr);
    
    // Initialize WiFi AP, LittleFS, and Web Server
    void begin();
    
    // Process incoming WebSocket messages and broadcast state changes
    void update();
    
    // Broadcast the current state to all connected WebSocket clients
    void broadcastState();

private:
    SettingsManager& _settingsMgr;
    AsyncWebServer _server;
    AsyncWebSocket _ws;
    
    // Track the last state we broadcasted to avoid spamming
    AppSettings _lastBroadcastedState;
    uint32_t _lastBroadcastMs;
    
    void onWebSocketEvent(AsyncWebSocket *server, AsyncWebSocketClient *client, AwsEventType type, void *arg, uint8_t *data, size_t len);
    void handleWebSocketMessage(void *arg, uint8_t *data, size_t len);
};

#endif // NETWORK_MANAGER_H
