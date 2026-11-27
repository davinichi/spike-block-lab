// Direction-aware mechanism synchronization; movement settings are separate.
export const MOTOR_SYNC_RUNTIME=String.raw`
_lab_sync_motors = None

def _lab_sync_ports():
    if _lab_sync_motors is None:
        raise ValueError('Set synchronized motor ports and directions first')
    return (_lab_sync_motors[0], _lab_sync_motors[2])

def _lab_set_sync_motors(first, first_direction, second, second_direction):
    global _lab_sync_motors
    if first == second or first_direction not in (-1, 1) or second_direction not in (-1, 1):
        raise ValueError('Choose two different motor ports and valid directions')
    # Validate both devices before stopping or changing the previous configuration.
    motor.relative_position(first)
    motor.relative_position(second)
    previous = _lab_sync_ports() if _lab_sync_motors is not None else ()
    for p in set(previous + (first, second)):
        state = _lab_active_motors.get(p)
        if state is not None:
            state['movement_stopped'] = True
        _lab_stop_port(p, motor.BRAKE)
    _lab_sync_motors = (first, first_direction, second, second_direction)

def _lab_sync_stop(mode):
    for p in _lab_sync_ports():
        state = _lab_active_motors.get(p)
        if state is not None:
            state['movement_stopped'] = True
        _lab_stop_port(p, mode)

def _lab_sync_velocities(speed, finite=False):
    _lab_sync_ports()
    velocity = _lab_profile_speed(speed) if finite else _lab_speed(speed)
    return (velocity * _lab_sync_motors[1], velocity * _lab_sync_motors[3])

def _lab_sync_run(speed):
    ports = _lab_sync_ports()
    velocities = _lab_sync_velocities(speed)
    if not any(velocities):
        _lab_sync_stop(motor.BRAKE)
        return
    if any(_lab_active_motors.get(p, {}).get('bounded') for p in ports):
        raise ValueError('Motor already has an active bounded movement')
    states = [_lab_active_motors.get(p) for p in ports]
    # Repeating the same continuous command must not reset synchronization anchors.
    if all(s is not None and s.get('mechanism_sync') and s['velocity'] == v and tuple(q for q, other in s['group']) == ports and all(_lab_active_motors.get(q) is other for q, other in s['group']) for s, v in zip(states, velocities)):
        return
    _lab_start_velocities(ports, velocities)
    for p in ports:
        _lab_active_motors[p]['mechanism_sync'] = True

async def _lab_sync_move(speed, amount, unit):
    await _lab_managed_move(_lab_sync_ports(), _lab_sync_velocities(speed, True), amount, unit, True)
`;
