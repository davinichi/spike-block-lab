// Relative heading turns; no reset of the user's shared yaw reference.
export const GYRO_TURN_RUNTIME=String.raw`
def _lab_gyro_yaw():
    value = motion_sensor.tilt_angles()[0] / 10
    return _lab_range(value, -180, 180)

def _lab_gyro_commands(heading, commands, now, minimum):
    yaw = _lab_gyro_yaw()
    delta = (yaw - heading['previous'] + 180) % 360 - 180
    heading['previous'] = yaw
    heading['angle'] += delta
    if abs(heading['angle']) > 45:
        raise RuntimeError('Gyro straight heading exceeded 45 degrees; check hub orientation and motors')
    dt = max(1, time.ticks_diff(now, heading['at']))
    heading['at'] = now
    # Filter the derivative and limit correction authority and changes.
    heading['rate'] += dt / (40 + dt) * (delta * 1000 / dt - heading['rate'])
    base = min(abs(c) for c in commands) / 10.5
    limit = min(15, base * .25)
    target = max(-limit, min(limit, 1.8 * heading['angle'] + .05 * heading['rate']))
    step = 30 * min(50, dt) / 1000
    correction = heading['correction'] + max(-step, min(step, target - heading['correction']))
    correction = max(-limit, min(limit, correction))
    heading['correction'] = correction
    result = []
    for c in commands:
        # Same physical correction sign on mirrored motors, in both travel directions.
        sign = 1 if c > 0 else -1
        floor = min(abs(c), minimum * 10.5)
        value = max(floor, min(1050, (c - correction * 10.5) * sign))
        result.append(sign * max(1, int(value)))
    return result

async def _lab_gyro_drive(speed, cm):
    ports = _lab_motion_ports()
    speed = _lab_speed_percent(speed)
    if speed == 0:
        raise ValueError('Gyro straight speed cannot be zero')
    cm = _lab_positive(cm, 360000)
    diameter = _lab_positive(_lab_wheel, 200)
    yaw = _lab_gyro_yaw()
    heading = {'previous': yaw, 'angle': 0, 'rate': 0, 'correction': 0, 'at': time.ticks_ms()}
    degrees = cm * 10 * 360 / (math.pi * diameter)
    await _lab_managed_move(ports, _lab_steering_velocities(speed, 0, True), degrees, 'angle', False, heading)

async def _lab_gyro_turn(kind, direction, angle, speed):
    ports = _lab_motion_ports()
    angle = _lab_range(angle, 0, 3600)
    speed = _lab_speed_percent(speed)
    if kind not in ('pivot', 'spin') or direction not in (-1, 1) or speed <= 0:
        raise ValueError('Gyro turn: choose direction and a positive speed')
    if any(_lab_active_motors.get(p, {}).get('bounded') for p in ports):
        raise ValueError('Motor already has an active bounded movement')
    # Read before acquiring the motors. A missing gyro must never start a turn.
    previous = _lab_gyro_yaw()
    started = time.ticks_ms()
    states = []
    for p in ports:
        state = {'bounded': True, 'mechanism_finite': True, 'velocity': 0,
                 'direction': 1, 'position': motor.relative_position(p),
                 'start': started, 'command': 0, 'phase': 4}
        states.append(state)
    try:
        for p, state in zip(ports, states):
            _lab_stop_port(p, motor.BRAKE)
            _lab_active_motors[p] = state
        progress, anchor = 0, 0
        anchor_at, last_at = started, started
        minimum = min(speed, _lab_motion_config.get('minimum', 8))
        command = minimum
        # Independent of wheel diameter/tread; enough time for slow large turns.
        timeout = min(180000, max(5000, angle * 500 / max(1, speed) + 3000))
        while angle > 0:
            if any(s.get('movement_stopped') for s in states):
                return
            if any(_lab_active_motors.get(p) is not s for p, s in zip(ports, states)):
                raise RuntimeError('Gyro turn interrupted by another motor command')
            now = time.ticks_ms()
            yaw = _lab_gyro_yaw()
            delta = (yaw - previous + 180) % 360 - 180
            previous = yaw
            # The standard hub's yaw decreases during a right turn.
            progress -= delta * direction
            remaining = angle - progress
            dt = max(1, time.ticks_diff(now, last_at))
            rate = max(0, -delta * direction * 1000 / dt)
            last_at = now
            if remaining <= max(1, min(4, rate * .03)):
                break
            if time.ticks_diff(now, started) >= timeout:
                raise RuntimeError('Gyro turn timed out; check hub orientation and motors')
            if abs(progress - anchor) >= .5:
                anchor, anchor_at = progress, now
            elif time.ticks_diff(now, anchor_at) >= 1500:
                raise RuntimeError('Gyro turn stalled; check load, speed and hub orientation')
            target = max(minimum, min(speed, remaining * .8))
            # Limit increases and decreases to avoid sudden commands.
            step = 80 * dt / 1000
            command += max(-step, min(step, target - command))
            velocity = _lab_speed(command)
            velocities = ((-velocity, 0) if kind == 'pivot' else (-velocity, -velocity)) if direction > 0 else ((0, velocity) if kind == 'pivot' else (velocity, velocity))
            for p, state, v in zip(ports, states, velocities):
                state['velocity'], state['command'] = v, v
                state['phase'] = 3 if target < speed else 2
                if v:
                    motor.run(p, v)
                else:
                    motor.stop(p, stop=motor.BRAKE)
            await runloop.sleep_ms(10)
    finally:
        # Always brake both sides, even after a read error or interruption.
        try:
            _lab_stop_port(ports[0], motor.BRAKE)
        finally:
            _lab_stop_port(ports[1], motor.BRAKE)
    await runloop.sleep_ms(100)
`;
