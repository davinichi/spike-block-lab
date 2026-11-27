def _lab_sync_v087(state, nominal, ahead, enabled, now, minimum=0, follow_profile=False):
    if not nominal:
        state['command'] = 0
        state['command_time'] = now
        return 0
    if not enabled:
        command = int(max(-1050, min(1050, nominal)))
    else:
        error = state.get('sync_error', 0) + 0.25 * (max(0, ahead) - state.get('sync_error', 0))
        state['sync_error'] = error
        magnitude = abs(nominal)
        reduction = 0 if magnitude <= 52.5 else min(0.15, max(0, error - 1) * 0.02)
        desired = max(min(magnitude, minimum), magnitude * (1 - reduction))
        if 'command' in state and state['command'] * nominal > 0:
            dt = max(1, min(50, time.ticks_diff(now, state.get('command_time', now - 20))))
            step = 525 * dt / 1000
            previous = abs(state['command'])
            if follow_profile:
                previous += magnitude - abs(state.get('profile_nominal', nominal))
            desired = max(previous - step, min(previous + step, desired))
        if follow_profile:
            desired = min(magnitude, max(min(magnitude, minimum), desired))
        command = (1 if nominal > 0 else -1) * max(1, min(1050, int(desired)))
    state['profile_nominal'] = nominal
    state['command'] = command
    state['command_time'] = now
    return command

