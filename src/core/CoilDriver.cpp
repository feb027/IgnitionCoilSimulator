#include "CoilDriver.h"
#include "config/Pins.h"

// Hardware timer reference
static hw_timer_t * timer = NULL;
static volatile bool isCoilOn = false;
static volatile uint32_t dwellTicks = 0;
static volatile uint32_t periodTicks = 0;
static volatile uint32_t pulsesRemaining = 0;
static volatile bool autoStopped = false;

// The ISR needs to be in IRAM
void IRAM_ATTR onTimer() {
    if (isCoilOn) {
        // Coil is currently ON, so this interrupt means dwell time is over.
        // Turn it off.
        digitalWrite(PIN_COIL_OUT, LOW);
        isCoilOn = false;
        
        // Feature B: Handle Burst/Single mode limits
        if (pulsesRemaining > 0) {
            pulsesRemaining--;
            if (pulsesRemaining == 0) {
                // Done!
                timerAlarmDisable(timer);
                autoStopped = true;
                return;
            }
        }
        
        // Schedule next turn ON (remaining time of the period)
        if (periodTicks > dwellTicks) {
            timerAlarmWrite(timer, periodTicks - dwellTicks, true);
        } else {
            // Safety fallback, should not happen if limits are enforced
            timerAlarmWrite(timer, 1000, true); 
        }
    } else {
        // Coil is currently OFF, so this interrupt means period is over.
        // Turn it ON.
        digitalWrite(PIN_COIL_OUT, HIGH);
        isCoilOn = true;
        // Schedule next turn OFF (dwell time)
        timerAlarmWrite(timer, dwellTicks, true);
    }
}

CoilDriver::CoilDriver(SettingsManager& settingsMgr) : _settingsMgr(settingsMgr) {
}

void CoilDriver::begin() {
    pinMode(PIN_COIL_OUT, OUTPUT);
    digitalWrite(PIN_COIL_OUT, LOW);

    // Setup timer 0, prescaler 80 -> 1 tick = 1 us
    timer = timerBegin(0, 80, true);
    timerAttachInterrupt(timer, &onTimer, true);
}

void CoilDriver::update() {
    AppSettings& s = _settingsMgr.getSettings();
    // Sync auto-stop state from ISR to UI
    if (autoStopped) {
        autoStopped = false;
        s.isRunning = false;
    }
    
    // Auto-Sweep Logic
    if (s.mode == MODE_SWEEP && s.isRunning) {
        if (millis() - _sweepLastUpdate > 100) { // Every 100ms
            s.frequencyHz += 2; // Increase by 2 Hz
            if (s.frequencyHz > MAX_FREQ_HZ) {
                s.frequencyHz = 10; // Reset to 10 Hz when max is reached
            }
            updateTimerConfig();
            _sweepLastUpdate = millis();
        }
    }
}

void CoilDriver::start() {
    AppSettings& s = _settingsMgr.getSettings();
    updateTimerConfig();
    s.isRunning = true;
    s.lastFiredMs = millis(); // Record for UI visual feedback
    autoStopped = false;
    
    // Feature B: Configure pulses for mode
    if (s.mode == MODE_SINGLE) pulsesRemaining = 1;
    else if (s.mode == MODE_BURST) pulsesRemaining = 5;
    else pulsesRemaining = 0; // Continuous
    
    // Start the cycle by turning ON immediately
    digitalWrite(PIN_COIL_OUT, HIGH);
    isCoilOn = true;
    timerAlarmWrite(timer, dwellTicks, true);
    timerAlarmEnable(timer);
}

void CoilDriver::stop() {
    timerAlarmDisable(timer);
    digitalWrite(PIN_COIL_OUT, LOW);
    isCoilOn = false;
    _settingsMgr.getSettings().isRunning = false;
}

void CoilDriver::trigger() {
    // Re-trigger acts exactly like start for our modes
    start();
}

void CoilDriver::emergencyStop() {
    if (timer != NULL) {
        timerAlarmDisable(timer);
    }
    digitalWrite(PIN_COIL_OUT, LOW);
    isCoilOn = false;
}

void CoilDriver::updateTimerConfig() {
    AppSettings& s = _settingsMgr.getSettings();
    
    // Enforce safety limits
    if (s.dwellMs > MAX_DWELL_MS) s.dwellMs = MAX_DWELL_MS;
    if (s.frequencyHz > MAX_FREQ_HZ) s.frequencyHz = MAX_FREQ_HZ;
    if (s.frequencyHz < 1) s.frequencyHz = 1;
    
    // Calculate ticks (1 tick = 1 us)
    dwellTicks = (uint32_t)(s.dwellMs * 1000.0f);
    periodTicks = 1000000 / s.frequencyHz;
    
    // Duty cycle protection: Dwell cannot exceed 80% of period to prevent coil meltdown
    uint32_t maxDwellForFreq = (uint32_t)(periodTicks * 0.8f);
    if (dwellTicks > maxDwellForFreq) {
        dwellTicks = maxDwellForFreq;
    }
}
