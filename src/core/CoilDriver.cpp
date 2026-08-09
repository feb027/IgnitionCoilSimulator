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
            s.rpm += 120; // Increase by 2 Hz equivalent
            if (s.rpm > MAX_RPM) {
                s.rpm = 600; // Reset to 600 RPM (10 Hz)
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
    if (s.rpm > MAX_RPM) s.rpm = MAX_RPM;
    if (s.rpm < 0) s.rpm = 0; 
    
    // Safety handle for 0 RPM (engine off)
    if (s.rpm == 0) {
        periodTicks = 1000000; // Arbitrary 1 sec period
        dwellTicks = 0;        // No dwell, coil will not turn on
        s.dutyCycle = 0.0f;
        s.dwellMs = 0.0f;
        return;
    }
    
    // Calculate ticks (1 tick = 1 us)
    periodTicks = 60000000 / s.rpm;
    
    if (s.pulseMode == PULSE_DWELL) {
        if (s.dwellMs > MAX_DWELL_MS) s.dwellMs = MAX_DWELL_MS;
        dwellTicks = (uint32_t)(s.dwellMs * 1000.0f);
        
        // Duty cycle protection for coil: Dwell cannot exceed 80% of period
        uint32_t maxDwellForFreq = (uint32_t)(periodTicks * 0.8f);
        if (dwellTicks > maxDwellForFreq) {
            dwellTicks = maxDwellForFreq;
        }
        
        // Sync dutyCycle for display (so UI shows correct calculated DC)
        s.dutyCycle = ((float)dwellTicks / periodTicks) * 100.0f;
    } else {
        // PULSE_DUTY mode (e.g., Stepper / PWM)
        if (s.dutyCycle > 100.0f) s.dutyCycle = 100.0f;
        if (s.dutyCycle < 0.0f) s.dutyCycle = 0.0f;
        
        dwellTicks = (uint32_t)(periodTicks * (s.dutyCycle / 100.0f));
        
        // Sync dwellMs for display (so UI shows correct calculated Dwell)
        s.dwellMs = (float)dwellTicks / 1000.0f;
    }
}
