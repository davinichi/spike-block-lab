// Stabilization aid using documented tilt_angles/reset_yaw, not hardware calibration.
export const GYRO_INITIALIZE_RUNTIME=String.raw`
def _lab_gyro_sample():
    values = motion_sensor.tilt_angles()
    if len(values) != 3:
        raise RuntimeError('Gyro angle data is invalid')
    return [_lab_range(value / 10, -180, 180) for value in values]

async def _lab_gyro_initialize(timeout):
    limit = int(_lab_range(timeout, 1.1, 30) * 1000)
    started = time.ticks_ms()
    anchor = _lab_gyro_sample()
    stable_since = started
    while time.ticks_diff(time.ticks_ms(), started) < limit:
        await _lab_pause(0.02)
        now = time.ticks_ms()
        current = _lab_gyro_sample()
        # Wrapped differences avoid a false movement at +180/-180 degrees.
        if any(abs((current[i] - anchor[i] + 180) % 360 - 180) > 0.5 for i in range(3)):
            anchor = current
            stable_since = now
        elif time.ticks_diff(now, stable_since) >= 1000:
            motion_sensor.reset_yaw(0)
            return
    raise RuntimeError('Gyro initialization timed out: keep the hub still and retry')

`;
