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
        digitalWrite(PIN_SOLENOID, LOW);
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
        digitalWrite(PIN_SOLENOID, HIGH);
        isCoilOn = true;
        // Schedule next turn OFF (dwell time)
        timerAlarmWrite(timer, dwellTicks, true);
    }
}

CoilDriver::CoilDriver(SettingsManager& settingsMgr) 
    : _settingsMgr(settingsMgr),
      _tempPot(PIN_X9C_INC, PIN_X9C_UD, PIN_X9C_CS_TEMP),
      _fuelPot(PIN_X9C_INC, PIN_X9C_UD, PIN_X9C_CS_FUEL) {
}

void CoilDriver::begin() {
    pinMode(PIN_COIL_OUT, OUTPUT);
    digitalWrite(PIN_COIL_OUT, LOW);
    
    pinMode(PIN_SOLENOID, OUTPUT);
    digitalWrite(PIN_SOLENOID, LOW);
    
    _tempPot.begin();
    _fuelPot.begin();
    
    ledcSetup(1, 50, 10);
    ledcAttachPin(PIN_RPM, 1);
    ledcWrite(1, 0);
    
    ledcSetup(2, 50, 10);
    ledcAttachPin(PIN_KMH, 2);
    ledcWrite(2, 0);

    // Setup timer 0, prescaler 80 -> 1 tick = 1 us
    timer = timerBegin(0, 80, true);
    timerAttachInterrupt(timer, &onTimer, true);
}

void CoilDriver::update() {
    AppSettings& s = _settingsMgr.getSettings();
    
    // Always sync current display values to target unless we are actively sweeping
    if (!s.isRunning || s.mode != MODE_SWEEP) {
        s.currentSpeedoKmh = s.speedoKmh;
        s.currentSpeedoRpm = s.speedoRpm;
        s.currentSpeedoTempPercent = s.speedoTempPercent;
        s.currentSpeedoFuelPercent = s.speedoFuelPercent;
    }

    // Sync auto-stop state from ISR to UI
    if (autoStopped) {
        autoStopped = false;
        s.isRunning = false;
    }

    if (!s.isRunning) {
        return;
    }
    
    // Auto-Sweep Logic (Smooth Triangle Wave)
    if (s.mode == MODE_SWEEP && s.isRunning) {
        uint32_t now = millis();
        uint32_t dt = now - _sweepLastUpdate;
        
        if (dt > 10) { // Update every 10ms for smooth sweep
            float valPerMs = 1.0f / (s.sweepTimeSec * 1000.0f);
            
            if (_sweepUp) {
                _currentSweepVal += (valPerMs * dt);
                if (_currentSweepVal >= 1.0f) {
                    _currentSweepVal = 1.0f;
                    _sweepUp = false;
                }
            } else {
                _currentSweepVal -= (valPerMs * dt);
                if (_currentSweepVal <= 0.0f) {
                    _currentSweepVal = 0.0f;
                    _sweepUp = true;
                }
            }
            
            if (s.pulseMode == PULSE_SPEEDO) {
                s.currentSpeedoKmh = (int)(_currentSweepVal * _targetKmh);
                s.currentSpeedoRpm = (int)(_currentSweepVal * _targetRpm);
                s.currentSpeedoTempPercent = (int)(_currentSweepVal * _targetTemp);
                s.currentSpeedoFuelPercent = (int)(_currentSweepVal * _targetFuel);
            } else {
                s.rpm = (int)(_currentSweepVal * _targetRpmNormal);
            }
            
            // Rate limit hardware updates for LEDC to prevent phase resets (Speedometer PWM glitching)
            if (s.pulseMode == PULSE_SPEEDO) {
                if (now - _lastHardwareUpdate > 150) { // 150ms allows frequencies down to 6.6 Hz to complete a cycle
                    updateTimerConfig();
                    _lastHardwareUpdate = now;
                }
            } else {
                updateTimerConfig(); // Safe for Coil mode
            }
            _sweepLastUpdate = now;
        }
    }
}

void CoilDriver::start() {
    AppSettings& s = _settingsMgr.getSettings();
    _targetKmh = s.speedoKmh;
    if (_targetKmh <= 0) _targetKmh = 120; // Fallback so sweep is always visible
    _targetRpm = s.speedoRpm;
    if (_targetRpm <= 0) _targetRpm = 4000;
    _targetTemp = s.speedoTempPercent;
    if (_targetTemp <= 0) _targetTemp = 50;
    _targetFuel = s.speedoFuelPercent;
    if (_targetFuel <= 0) _targetFuel = 50;
    _targetRpmNormal = s.rpm;
    
    updateTimerConfig();
    _lastHardwareUpdate = millis();
    s.isRunning = true;
    s.lastFiredMs = millis(); // Record for UI visual feedback
    // Reset sweep state
    _currentSweepVal = 0.0f;
    _sweepUp = true;
    _sweepLastUpdate = millis();
    
    autoStopped = false;
    
    // Feature B: Configure pulses for mode
    if (s.mode == MODE_SINGLE) pulsesRemaining = 1;
    else if (s.mode == MODE_BURST) pulsesRemaining = 5;
    else pulsesRemaining = 0; // Continuous
    
    // Start the cycle by turning ON immediately for coil mode
    if (s.pulseMode != PULSE_SPEEDO) {
        digitalWrite(PIN_COIL_OUT, HIGH);
        digitalWrite(PIN_SOLENOID, HIGH);
        isCoilOn = true;
        timerAlarmWrite(timer, dwellTicks, true);
        timerAlarmEnable(timer);
    }
}

void CoilDriver::stop() {
    timerAlarmDisable(timer);
    digitalWrite(PIN_COIL_OUT, LOW);
    digitalWrite(PIN_SOLENOID, LOW);
    ledcWrite(1, 0); // Turn off RPM
    ledcWrite(2, 0); // Turn off KMH
    isCoilOn = false;
    
    AppSettings& s = _settingsMgr.getSettings();
    s.isRunning = false;
    
    // Restore targets
    if (s.mode == MODE_SWEEP) {
        if (s.pulseMode == PULSE_SPEEDO) {
            s.speedoKmh = _targetKmh;
            s.speedoRpm = _targetRpm;
            s.speedoTempPercent = _targetTemp;
            s.speedoFuelPercent = _targetFuel;
        } else {
            s.rpm = _targetRpmNormal;
        }
    }
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
    digitalWrite(PIN_SOLENOID, LOW);
    ledcWrite(1, 0);
    ledcWrite(2, 0);
    isCoilOn = false;
}

void CoilDriver::updateTimerConfig() {
    AppSettings& s = _settingsMgr.getSettings();
    
    // Handle Speedometer mode first to bypass coil RPM limits
    if (s.pulseMode == PULSE_SPEEDO) {
        // Speedometer calculation
        float hzKmh = ((float)s.currentSpeedoKmh * s.pulsePerKm) / 3600.0f;
        float hzRpm = (float)s.currentSpeedoRpm / 30.0f; // 4-cylinder assumption
        
        if (hzKmh > 1.0f) {
            ledcWriteTone(2, hzKmh);
        } else {
            ledcWriteTone(2, 0);
            ledcWrite(2, 0);
        }
        
        if (hzRpm > 1.0f) {
            ledcWriteTone(1, hzRpm);
        } else {
            ledcWriteTone(1, 0);
            ledcWrite(1, 0);
        }
        
        _tempPot.setPercent(s.currentSpeedoTempPercent);
        _fuelPot.setPercent(s.currentSpeedoFuelPercent);
        
        timerAlarmDisable(timer);
        digitalWrite(PIN_COIL_OUT, LOW);
        digitalWrite(PIN_SOLENOID, LOW);
        isCoilOn = false;
        
        s.dutyCycle = 50.0f;
        s.dwellMs = 0.0f;
        return;
    }
    
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
