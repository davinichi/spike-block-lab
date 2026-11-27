# Immutable v0.8.3 braking reference from cc0c851b09754464e69ad8c5f8ff3e90b19a2831
def _lab_braking_plan(speed, configured_ms, profile, response_ms, control_ms, minimum=0):
    speed = max(0, speed)
    factor = 1.5 if profile == 's' else 1
    duration = max(20, int(configured_ms), math.ceil(speed * factor * 1000 / 525))
    response = max(500, min(1000, response_ms))
    reaction = max(40, min(200, control_ms))
    distance = (speed + min(speed, minimum)) * duration / 2000 + speed * (response + reaction) / 1000 + max(2, speed * 0.02)
    return duration, distance

async def _lab_managed_move(ports, velocities, amount, unit):
    _lab_positive(amount, 3600 if unit == 'time' else 360000)
    if any(p in _lab_active_motors and _lab_active_motors[p].get('bounded') for p in ports):
        raise ValueError('Motor already has an active bounded movement')
    maximum = max(abs(v) for v in velocities)
    if not maximum:
        raise ValueError('Speed cannot be zero')
    degrees = amount * (360 if unit == 'rotation' else 1)
    config = dict(_lab_motion_config)
    profile = config['profile']
    base = max(1, min(100, int(maximum / 10.5 + 0.5)))
    ratio_base = base
    up, down = int(config['up'] * 1000), int(config['down'] * 1000)
    total = int(amount * 1000) if unit == 'time' else 0
    if unit == 'time':
        _lab_range(total, 1, 3600000)
    if profile != 'none' and unit == 'time':
        base, up, down = _lab_ramp_timing(base, total, up, down)
    # SPIKE uses deg/s, EBL uses integer percent. Keep EBL's profile arithmetic
    # in percent and convert only when sending a command to the SPIKE API.
    weights = [max(1, int(abs(v) / 10.5 + 0.5)) if v else 0 for v in velocities]
    targets = [int((degrees * weight + ratio_base // 2) / ratio_base) for weight in weights] if profile != 'none' else [degrees * abs(v) / maximum for v in velocities]
    started = time.ticks_ms()
    timeout = total if unit == 'time' else int(degrees * 500 / ratio_base) + 5000 + up + down if profile != 'none' else 600000
    if profile != 'none' and unit != 'time':
        _lab_range(timeout, 1, 180000)
    previous, previous_time, braking = 0, 0, 0
    nonzero_weights = [weight for weight in weights if weight]
    approach = min(base, math.ceil(config.get('minimum', 8) * ratio_base / min(nonzero_weights)))
    angular_floor = profile != 'none' and unit != 'time'
    loop_previous = started
    decel_ceiling = base
    decel_start, decel_duration, decel_base = None, 0, 0
    states = []
    for p, velocity in zip(ports, velocities):
        state = {'velocity': velocity, 'direction': 1 if velocity >= 0 else -1, 'start': started, 'position': motor.relative_position(p), 'bounded': True, 'observed_at': started, 'observed_position': 0, 'observed_command': 0, 'measured_speed': 0, 'response_ms': 500}
        _lab_active_motors[p] = state
        states.append(state)
    try:
        while True:
            if any(state.get('movement_stopped') for state in states):
                break
            if any(_lab_active_motors.get(p) is not state for p, state in zip(ports, states)):
                raise ValueError('Movement was interrupted by another motor command')
            elapsed = time.ticks_diff(time.ticks_ms(), started)
            progress = [(motor.relative_position(p) - state['position']) * state['direction'] for p, state in zip(ports, states)]
            if (unit == 'time' and elapsed >= total) or (unit != 'time' and all(pos >= target for pos, target in zip(progress, targets))):
                break
            if unit != 'time' and elapsed >= timeout:
                raise RuntimeError('Motor movement timed out')
            phases = [int(pos * ratio_base / weight) if weight else 0 for pos, weight in zip(progress, weights)]
            common = min([degrees] + [phase for phase, target in zip(phases, targets) if target >= 1])
            remaining = degrees - common
            cap = base
            control_ms = max(20, time.ticks_diff(time.ticks_ms(), loop_previous))
            loop_previous = time.ticks_ms()
            for state, pos in zip(states, progress):
                dt = time.ticks_diff(time.ticks_ms(), state['observed_at'])
                if dt >= 60:
                    measured = max(0, pos - state['observed_position']) * 1000 / dt
                    state['measured_speed'] = max(measured, (state['measured_speed'] + measured) / 2)
                    command = abs(state.get('command', 0))
                    falling = (state['observed_command'] - command) * 1000 / dt
                    if falling >= 52.5 and state['measured_speed'] > command:
                        estimate = (state['measured_speed'] - command) * 1000 / falling
                        state['response_ms'] = max(state['response_ms'], min(1000, estimate))
                    state['observed_at'] = time.ticks_ms()
                    state['observed_position'] = pos
                    state['observed_command'] = command
            angular_brake = profile != 'none' and down > 0 and unit != 'time'
            speed_for_stop = max([0] + [max(state['measured_speed'], abs(state.get('command', 0))) * ratio_base / weight for state, weight in zip(states, weights) if weight])
            response_ms = max(state['response_ms'] for state in states)
            first_remaining = min([max(0, target - pos) * ratio_base / weight for pos, target, weight in zip(progress, targets, weights) if weight])
            planned_duration = 0
            if angular_brake:
                configured = down * min(base, max(1, speed_for_stop / 10.5)) / base
                planned_duration, braking = _lab_braking_plan(speed_for_stop, configured, profile, response_ms, control_ms, approach * 10.5)
            if profile != 'none':
                if not angular_brake and unit != 'time' and elapsed - previous_time >= 100:
                    delta = max(0, common - previous)
                    braking = int(delta * down / (elapsed - previous_time)) // 2
                    previous, previous_time = common, elapsed
                if up and elapsed <= up:
                    cap = base * _lab_ramp_curve(elapsed, up, profile) // 1000
                cap = max(approach if angular_floor else 1, min(100, cap))
                if down:
                    if unit == 'time':
                        if total - elapsed <= down:
                            cap = min(cap, base * _lab_ramp_curve(total - elapsed, down, profile) // 1000)
                            cap = max(1, min(100, cap))
                    else:
                        if decel_start is None and first_remaining <= braking:
                            decel_start, decel_base = elapsed, cap
                            decel_duration = max(planned_duration, 20, min(10000, down * cap // base))
                        if decel_start is not None:
                            cap = max(approach, min(100, approach + (decel_base - approach) * _lab_ramp_curve(decel_duration - (elapsed - decel_start), decel_duration, profile) // 1000))
                            # Spatial cap also reserves distance for response lag and the
                            # command slew limiter. Keep a small approach speed at the target.
                            acceleration = min(525, max(10.5, base * 10.5 * 1000 / max(20, down)))
                            lag = max(500, min(1000, response_ms)) / 1000 + control_ms / 1000
                            available = max(0, first_remaining - 2)
                            safe_speed = max(0, math.sqrt((acceleration * lag) ** 2 + 2 * acceleration * available) - acceleration * lag)
                            decel_ceiling = min(decel_ceiling, max(approach, cap), max(approach, safe_speed / 10.5))
                            cap = max(approach, decel_ceiling)
            # Do not keep driving a stuck motor until it suddenly breaks free.
            # The guard applies only after reaching the terminal speed range.
            for state, pos, target, weight in zip(states, progress, targets, weights):
                terminal = angular_brake and decel_start is not None and cap <= approach and weight and pos < target
                if terminal:
                    now = time.ticks_ms()
                    anchor = state.get('minimum_anchor')
                    if anchor is None or abs(pos - anchor[1]) >= 2:
                        state['minimum_anchor'] = (now, pos)
                    elif time.ticks_diff(now, anchor[0]) >= 400:
                        raise RuntimeError('Motor stopped at minimum speed; increase the minimum speed setting or check the load')
                else:
                    state.pop('minimum_anchor', None)
            sync_phases = [pos * maximum / abs(v) for pos, v in zip(progress, velocities) if v]
            sync_common = min(sync_phases) if sync_phases else 0
            for p, state, pos, target, phase, weight, initial in zip(ports, states, progress, targets, phases, weights, velocities):
                velocity = state['velocity']
                state['phase'] = 3 if (profile != 'none' and ((unit == 'time' and down and total - elapsed <= down) or decel_start is not None)) else 1 if profile != 'none' and up and elapsed <= up else 2
                if profile == 'none':
                    command = velocity
                else:
                    percent = cap
                    if percent and weight:
                        percent = max(1, min(100, int(percent * weight / ratio_base)))
                    else:
                        percent = 0
                    command = (1 if initial >= 0 else -1) * percent * 10.5
                    # A separate speed-change command retains the original goal.
                    if initial and velocity != initial:
                        command *= velocity / initial
                ahead = pos * maximum / abs(initial) - sync_common if initial else 0
                if unit != 'time' and pos >= target:
                    command = 0
                command = _lab_sync_command(state, command, ahead, config['sync'] and len(ports) == 2 and all(velocities), time.ticks_ms(), min(abs(initial), config.get('minimum', 8) * 10.5) if angular_floor else 0)
                if command:
                    motor.run(p, int(max(-1050, min(1050, command))))
                else:
                    motor.stop(p, stop=motor.BRAKE)
            await runloop.sleep_ms(20)
    finally:
        for p, state in zip(ports, states):
            if _lab_active_motors.get(p) is state:
                _lab_active_motors.pop(p, None)
                motor.stop(p, stop=_lab_stop_modes.get(p, motor.BRAKE))


