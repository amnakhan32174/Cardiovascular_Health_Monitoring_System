# ECG 125 Samples for Live Waveform

Use **ESP32_ECG_PPG_125Samples.ino** instead of the single-value ECG sketch to get a proper live ECG waveform on the dashboard.

## What Changed

| Your current code | New sketch |
|-------------------|------------|
| 1 ECG value per reading | **125 ECG samples** per reading |
| Sends `ecg: [single_value]` | Sends `ecg: [125 values]` |
| No waveform shape | Full P-QRS-T-like waveform visible |

## How It Works

1. **ECG sampling**: Collects 125 samples at ~250 Hz (4 ms between samples) = ~500 ms of ECG data before each PPG read.
2. **Same pins**: AD8232 on GPIO 34, LO+ 32, LO- 33.
3. **Same payload shape**: Same `hr`, `spo2`, `ecg`, `ppg` fields; only `ecg` is now an array of 125 values.

## Dashboard Behavior

- **Live ECG section**: Shown whenever ECG data is received.
- **Rolling buffer**: If the old sketch sends 1 value per reading, values are accumulated into a rolling buffer and shown.
- **125-sample sketch**: Sends 125 values per reading, so the waveform is fully visible every update.

## Upload Steps

1. Open `ESP32_ECG_PPG_125Samples.ino` in Arduino IDE.
2. Confirm WiFi and server URL.
3. Upload to the ESP32.

You can switch back to your original sketch at any time.

## Patch for Your Existing Sketch

If you prefer to edit your current code, add these and replace the ECG send logic:

```cpp
#define ECG_SAMPLES 125
#define ECG_SAMPLE_INTERVAL_US 4000  // 250Hz
uint16_t ecgBuffer[ECG_SAMPLES];

// In loop(), BEFORE reading PPG, add:
void collectECG() {
  bool leadsOff = (digitalRead(loPlusPin) == HIGH || digitalRead(loMinusPin) == HIGH);
  for (int i = 0; i < ECG_SAMPLES; i++) {
    unsigned long t = micros();
    ecgBuffer[i] = leadsOff ? 0 : (uint16_t)analogRead(ecgPin);
    while (micros() - t < ECG_SAMPLE_INTERVAL_US) { }
  }
}
// Call collectECG() then build ecg array from ecgBuffer[0..124]
```
