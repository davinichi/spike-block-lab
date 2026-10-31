export function registerCommonGenerators({g,emit,v,stat,fail}) {
  const quote=x=>JSON.stringify(String(x)),name=b=>quote(b.getFieldValue('NAME'));
  const pair=b=>`port.${b.getFieldValue('LEFT')}, port.${b.getFieldValue('RIGHT')}`;
  for(const paired of [false,true])for(const action of ['run','angle','rotation','time'])emit('lab_motor_'+(paired?'pair':'single')+'_'+action,b=>{
    const ports=paired?b.getFieldValue('PORTS').split(','):[b.getFieldValue('PORT')];
    const list='['+ports.map(p=>'port.'+p).join(', ')+']',speed=v(b,'SPEED');
    if(action==='run')return stat(`_lab_motor_group_run(${list}, ${speed})\n`);
    const amount=v(b,{angle:'DEGREES',rotation:'ROTATIONS',time:'SECONDS'}[action]);
    return stat(`await _lab_motor_group(${list}, ${speed}, ${amount}, '${action}')\n`);
  });
  emit('lab_motor_group_stop',b=>{const selected=b.getFieldValue('PORTS'),ports=selected==='ALL'?['A','B','C','D','E','F']:selected.split(',');return stat(ports.map(p=>`_lab_stop_port(port.${p}, motor.${b.getFieldValue('MODE')}, ${selected==='ALL'?'True':'False'})\n`).join(''));});
  emit('lab_tread',b=>stat(`_lab_tread = ${Number(b.getFieldValue('TREAD'))}\n`));
  for(const direction of ['forward','backward'])emit('lab_drive_'+direction,b=>{const [left,right]=b.getFieldValue('PORTS').split(',');return stat(`_lab_pair(port.${left}, port.${right})\nawait _lab_drive(${direction==='backward'?'-':''}_lab_positive(${v(b,'SPEED')}, 100), _lab_positive(${v(b,'CM')}, 360000), 'cm', 0)\n`);});
  for(const kind of ['spin','pivot'])for(const direction of ['right','left'])emit('lab_'+kind+'_'+direction,b=>stat(`await _lab_turn(${pair(b)}, ${v(b,'SPEED')}, ${v(b,'ANGLE')}, ${kind==='pivot'?'True':'False'}, ${direction==='right'?1:-1})\n`));
  for(const action of ['run','angle','time']) {
    const amount=b=>action==='run'?'0':v(b,action==='angle'?'DEGREES':'SECONDS');
    emit('lab_steering_'+action,b=>stat(`${action==='run'?'':'await '}_lab_steering_${action}(${pair(b)}, ${v(b,'TURN')}, ${v(b,'SPEED')}, ${amount(b)})\n`));
    emit('lab_tank_'+action,b=>stat(`${action==='run'?'':'await '}_lab_tank_${action}(${pair(b)}, ${v(b,'LEFT_SPEED')}, ${v(b,'RIGHT_SPEED')}, ${amount(b)})\n`));
  }
  const ops={LT:'<',EQ:'==',GT:'>',LTE:'<=',GTE:'>=',NEQ:'!='};
  for(const type of ['distance','reflection','force'])emit('lab_'+type+'_compare',b=>{
    const port='port.'+b.getFieldValue('PORT'),read=type==='distance'?`_lab_distance(${port})`:type==='reflection'?`color_sensor.reflection(${port})`:`(force_sensor.force(${port}) / 10)`;
    const expression=`(${read} ${ops[b.getFieldValue('OP')]} ${v(b,'VALUE')})`;
    return [type==='distance'?`(distance_sensor.distance(${port}) >= 0 and ${expression})`:expression,g.ORDER_ATOMIC];
  });
  emit('lab_display_clear',()=>stat('light_matrix.clear()\n'));
  emit('lab_display_number',b=>stat(`await light_matrix.write(_lab_text(${v(b,'VALUE')}))\n`));
  emit('lab_light_off',()=>stat('light.color(light.POWER, color.BLACK)\n'));
  emit('lab_tone_ms',b=>stat(`await sound.beep(int(_lab_range(${v(b,'FREQUENCY')}, 44, 10000)), int(_lab_range(${v(b,'MS')}, 0, 60000)), int(_lab_range(${v(b,'VOLUME')}, 0, 100)))\n`));
  emit('lab_when_changed',()=> '');
  emit('lab_message_wait',b=>stat(`_message_seen = _lab_messages[${quote(b.getFieldValue('MESSAGE').trim())}]\nwhile _lab_messages[${quote(b.getFieldValue('MESSAGE').trim())}] == _message_seen:\n    await _lab_tick()\n`));
  emit('lab_return',b=>{if(b.getRootBlock().type!=='procedures_defnoreturn')fail(b,'「このマイブロックを終了する」は定義の中に入れてください。');return 'return\n';});
  emit('lab_argument',b=>{
    const root=b.getRootBlock(),models=root.type==='procedures_defnoreturn'?root.getVarModels():[];
    const model=models.find(m=>m.getId()===b.parameterId)??models.find(m=>m.getName()===b.getFieldValue('ARG_NAME'));
    if(!model)fail(b,'引数は、同じ名前の引数があるマイブロックの定義の中で使ってください。');
    return [g.getVariableName(model.getId()),g.ORDER_ATOMIC];
  });
  emit('lab_pid',b=>[`_lab_pid(${name(b)}, ${['TARGET','MEASURED','KP','KI','KD'].map(input=>v(b,input)).join(', ')})`,g.ORDER_ATOMIC]);
  emit('lab_pid_reset',b=>stat(`_lab_pid_state.pop(${name(b)}, None)\n`));
  emit('lab_text_get',b=>[`_lab_text_values.get(${name(b)}, '')`,g.ORDER_ATOMIC]);
  emit('lab_text_set',b=>stat(`_lab_text_values[${name(b)}] = str(${v(b,'VALUE',"''")})[:120]\n`));
  for(const action of ['clear','add','set','delete','item','length','contains','stat'])emit('lab_list_'+action,b=>{
    const args=[name(b),quote(action),['set','delete','item'].includes(action)?v(b,'INDEX'):'0',['add','set','contains'].includes(action)?v(b,'VALUE'):'0',quote(b.getFieldValue('OP')??'sum')];
    const expression=`_lab_list(${args.join(', ')})`;
    return ['item','length','contains','stat'].includes(action)?[expression,g.ORDER_ATOMIC]:stat(expression+'\n');
  });
  emit('lab_log_start',b=>stat(`_lab_log_name = ${name(b)}\nprint('record,time_ms,label,value')\n`));
  emit('lab_log_value',b=>stat(`print(_lab_csv(_lab_log_name) + ',' + str(time.ticks_ms()) + ',' + _lab_csv(${quote(b.getFieldValue('LABEL'))}) + ',' + str(${v(b,'VALUE')}))\n`));
  emit('lab_log_end',()=>stat("print('record_end,' + _lab_csv(_lab_log_name))\n"));
}
export const COMMON_RUNTIME=`
def _lab_positive(value, maximum):
    if not isinstance(value, (int, float)) or not 0 < value <= maximum:
        raise ValueError('Value must be positive')
    return value

def _lab_stop_port(p, mode, optional=False):
    try:
        motor.stop(p, stop=mode)
    except Exception:
        if not optional:
            raise

def _lab_motor_group_run(ports, speed):
    velocity = _lab_speed(speed)
    for p in ports:
        if velocity == 0:
            motor.stop(p)
        else:
            motor.run(p, velocity)

async def _lab_motor_group(ports, speed, amount, unit):
    _lab_positive(amount, 60 if unit == 'time' else 360000)
    velocity = _lab_speed(speed)
    if velocity == 0:
        raise ValueError('Motor speed cannot be zero')
    if len(ports) == 1:
        await _lab_motor(ports[0], speed, amount, 'seconds' if unit == 'time' else 'rotations' if unit == 'rotation' else 'degrees', True)
        return
    degrees = amount * (360 if unit == 'rotation' else 1)
    starts = [motor.relative_position(p) for p in ports]
    pending = list(ports)
    started = time.ticks_ms()
    timeout = int(amount * 1000) if unit == 'time' else int(degrees / abs(velocity) * 4000 + 2000)
    try:
        _lab_motor_group_run(ports, speed)
        while pending:
            elapsed = time.ticks_diff(time.ticks_ms(), started)
            for p in pending[:]:
                finished = elapsed >= timeout if unit == 'time' else abs(motor.relative_position(p) - starts[ports.index(p)]) >= degrees
                if finished:
                    motor.stop(p)
                    pending.remove(p)
            if pending and unit != 'time' and elapsed > timeout:
                raise RuntimeError('Motor movement timed out')
            await _lab_tick()
    finally:
        for p in ports:
            motor.stop(p)

async def _lab_turn(left, right, speed, angle, pivot, direction):
    _lab_pair(left, right)
    velocity = _lab_speed(_lab_positive(speed, 100))
    degrees = max(1, int(_lab_positive(angle, 3600) * _lab_tread / _lab_wheel * (2 if pivot else 1)))
    lv, rv = (velocity, 0 if pivot else -velocity) if direction > 0 else (0 if pivot else -velocity, velocity)
    if pivot:
        motor.stop(right if direction > 0 else left, stop=motor.BRAKE)
    status = await motor_pair.move_tank_for_degrees(motor_pair.PAIR_1, degrees, lv, rv, stop=motor.BRAKE)
    if status != motor.READY:
        raise RuntimeError('Turn did not complete: ' + str(status))

def _lab_steering_run(left, right, turn, speed, amount):
    _lab_pair(left, right)
    motor_pair.move(motor_pair.PAIR_1, int(_lab_range(turn, -100, 100)), velocity=_lab_speed(speed))

async def _lab_steering_angle(left, right, turn, speed, amount):
    _lab_pair(left, right)
    await _lab_drive(speed, amount, 'degrees', turn)

async def _lab_steering_time(left, right, turn, speed, amount):
    _lab_pair(left, right)
    await _lab_drive(speed, amount, 'seconds', turn)

def _lab_tank_run(left, right, left_speed, right_speed, amount):
    _lab_pair(left, right)
    motor_pair.move_tank(motor_pair.PAIR_1, _lab_speed(left_speed), _lab_speed(right_speed))

async def _lab_tank_angle(left, right, left_speed, right_speed, amount):
    _lab_pair(left, right)
    status = await motor_pair.move_tank_for_degrees(motor_pair.PAIR_1, int(_lab_positive(amount, 360000)), _lab_speed(left_speed), _lab_speed(right_speed))
    if status != motor.READY:
        raise RuntimeError('Tank movement did not complete: ' + str(status))

async def _lab_tank_time(left, right, left_speed, right_speed, amount):
    _lab_pair(left, right)
    status = await motor_pair.move_tank_for_time(motor_pair.PAIR_1, int(_lab_positive(amount, 60) * 1000), _lab_speed(left_speed), _lab_speed(right_speed))
    if status != motor.READY:
        raise RuntimeError('Tank movement did not complete: ' + str(status))

def _lab_pid(name, target, measured, kp, ki, kd):
    now = time.ticks_ms()
    error = target - measured
    old = _lab_pid_state.get(name)
    integral, derivative = 0, 0
    if old is not None:
        dt = time.ticks_diff(now, old[0]) / 1000
        if dt <= 0:
            return old[3]
        integral = old[2] + error * dt
        derivative = (error - old[1]) / dt
    result = kp * error + ki * integral + kd * derivative
    _lab_pid_state[name] = (now, error, integral, result)
    return result

def _lab_list(name, action, index, value, operation):
    items = _lab_lists.setdefault(name, [])
    if action == 'clear':
        items.clear()
    elif action == 'add':
        if len(items) >= 1000:
            raise ValueError('List has 1000 items')
        items.append(_lab_range(value, -1e12, 1e12))
    elif action == 'length':
        return len(items)
    elif action == 'contains':
        return value in items
    elif action == 'stat':
        if not items:
            return 0
        return sum(items) if operation == 'sum' else sum(items) / len(items) if operation == 'average' else min(items) if operation == 'min' else max(items)
    else:
        if not isinstance(index, (int, float)) or index != int(index) or not 1 <= index <= len(items):
            raise ValueError('List index out of range')
        i = int(index) - 1
        if action == 'set':
            items[i] = _lab_range(value, -1e12, 1e12)
        elif action == 'delete':
            items.pop(i)
        elif action == 'item':
            return items[i]

def _lab_csv(value):
    return '"' + str(value).replace('"', '""') + '"'
`;
