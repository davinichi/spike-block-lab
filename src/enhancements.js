// EBL classroom behaviour, implemented with the standard SPIKE App 3 API.
const input=(name,check='Number')=>({type:'input_value',name,...(check?{check}:{})});
const menu=(name,options)=>({type:'field_dropdown',name,options});
const ports=['A','B','C','D','E','F'];
const port=()=>menu('PORT',ports.map(p=>[p,p]));
const stmt={previousStatement:null,nextStatement:null,inputsInline:true};
const defs=[];
const add=(type,message0,args0,properties)=>defs.push({type,message0,args0,...properties});
const operators={add:['＋','+','Number'],sub:['−','-','Number'],mul:['×','*','Number'],div:['÷','/','Number'],lt:['＜','<','Boolean'],eq:['＝','==','Boolean'],gt:['＞','>','Boolean'],lte:['≦','<=','Boolean'],gte:['≧','>=','Boolean'],neq:['≠','!=','Boolean'],and:['かつ','and','Boolean'],or:['または','or','Boolean']};
for(const [op,[label,,output]] of Object.entries(operators))add('lab_op_'+op,'%1 '+label+' %2',[input('A',['and','or'].includes(op)?'Boolean':'Number'),input('B',['and','or'].includes(op)?'Boolean':'Number')],{output,inputsInline:true,colour:'#00b84a'});
const modes=menu('MODE',[['ブレーキ','BRAKE'],['惰性','COAST'],['保持','HOLD']]);
add('lab_battery_voltage','本体のバッテリー電圧（mV）',[],{output:'Number',colour:'#34ccf1',tooltip:'本体の電圧をmVで読みます。1000mV＝1V。対応する標準Hub OSで使用できます。'});
add('lab_display_abacus','数値 %1 をそろばん形式で表示',[input('VALUE')],{...stmt,colour:'#9966ff',tooltip:'0〜99999の整数を右詰めで表示。1列が1桁で、最上段は5、下4段は1の玉です。0の桁は点灯しません。'});
add('lab_log_pid','PID走行を %1 ミリ秒ごとに記録する',[input('INTERVAL')],{message1:'反射光 %1 PID出力 %2',args1:[input('REFLECTION'),input('OUTPUT')],message2:'左速度 %1 ％ 右速度 %2 ％',args2:[input('LEFT_SPEED'),input('RIGHT_SPEED')],...stmt,colour:'#c58245',tooltip:'繰り返し内でモーター指示の後に置き、計算済みの変数を入れます。4値と呼出し間隔を同じ時刻で記録。20〜60000ミリ秒。周期を遅らせる待ちは入りません。最大1000行・32KiB、1組5行。'});
add('lab_log_motion','左右モーターの同期を %1 ミリ秒ごとに記録する',[input('INTERVAL')],{...stmt,colour:'#c58245',tooltip:'共通の左右設定と記録開始の後に置きます。角度差・実速度・速度指令・動作区間を同じ採取時刻でメモリへ記録。20〜1000ミリ秒、標準100。停止後に記録を終えて保存します。'});
add('lab_motor_velocity','モーター %1 の速度の読取値（本体の値）',[port()],{output:'Number',colour:'#0090f5',tooltip:'本体APIの読取値です。度/秒ではありません。度/秒で記録するには左右同期の自動記録を使います。'});
add('lab_motor_stop_mode','モーター %1 の動作後の停止方法を %2 にする',[menu('PORTS',[...ports.map(p=>[p,p]),['すべて','ALL']]),modes],{...stmt,colour:'#0090f5'});
add('lab_motor_change_speed','モーター %1 の速さを %2 ％にする',[port(),input('SPEED')],{...stmt,colour:'#0090f5',tooltip:'動作中の目標角度・終了時刻を保ったまま速さを変えます。0は一時停止。'});
add('lab_motor_power','モーター %1 をパワー %2 ％で回し続ける',[port(),input('POWER')],{...stmt,colour:'#0090f5',tooltip:'−100〜100％の出力。負荷に合わせた速さの補正はしません。'});
add('lab_ramp','加減速を %1 にする 加速 %2 秒 減速 %3 秒',[menu('PROFILE',[['なし','none'],['台形','trapezoid'],['S字','s']]),input('UP'),input('DOWN')],{...stmt,colour:'#0090f5',tooltip:'モーター・動き共通。有限の角度・回転数・時間・前後進・旋回に適用。各0〜10秒。加速は最低→最高、減速は最高→最低の速度指令の変化時間です。実速度の追従時間は保証しません。短い動作は到達速度や時間を調整します。回し続ける・即時停止は対象外です。'});
add('lab_ramp_distance','加減速を %1 にする 加速区間 %2 ％ 減速区間 %3 ％',[menu('PROFILE',[['台形','trapezoid'],['S字','s']]),input('UP'),input('DOWN')],{...stmt,colour:'#0090f5',tooltip:'総移動量に対する加速・減速の区間。100cm・各10％なら最初と最後の10cmです。各0〜100％、合計100％以下。最低速度は共通設定。時間指定・連続運転には使えません。後から実行した加減速設定へ切り替わります。'});
add('lab_minimum_speed','加減速の最低速度を %1 ％にする',[input('SPEED')],{...stmt,colour:'#0090f5',tooltip:'モーター・動き共通。角度・回転数・距離・時間指定の加減速で使う最低速度。標準8％、1〜100％。実機で安定して回る値に調整してください。指定速度を超えて増速はしません。回し続ける・絶対角度には適用しません。'});
add('lab_sync','2個のモーターの同期補正を %1 にする',[menu('ENABLED',[['有効','TRUE'],['無効','FALSE']])],{...stmt,colour:'#0090f5',tooltip:'先行量を200msで平滑化し、不感帯4度・最大3％の弱い減速で補正。補正量の変化は毎秒31.5度/秒以内。最低速度を維持します。タイヤの滑り・車体の方位は補正しません。'});
const funcs=[['絶対値','abs'],['切り下げ','floor'],['切り上げ','ceil'],['平方根','sqrt'],['sin','sin'],['cos','cos'],['tan','tan'],['asin','asin'],['acos','acos'],['atan','atan'],['ln','ln'],['log','log'],['e^','exp'],['10^','pow10']];
add('lab_math_function','%1 の %2',[input('VALUE'),menu('FUNCTION',funcs)],{output:'Number',inputsInline:true,colour:'#00b84a',tooltip:'三角関数は度で指定。逆三角関数の答えも度です。'});
add('lab_minmax','%1 と %2 の %3',[input('A'),input('B'),menu('OP',[['小さい方','min'],['大きい方','max']])],{output:'Number',inputsInline:true,colour:'#00b85b'});
for(const [type,label,args,output] of [
 ['char','文字 %1 の %2 番目',[input('TEXT',null),input('INDEX')],'String'],
 ['contains','文字 %1 に %2 が含まれる',[input('TEXT',null),input('FIND',null)],'Boolean'],
 ['equal','文字 %1 と %2 が同じ',[input('TEXT',null),input('OTHER',null)],'Boolean'],
 ['to_number','文字 %1 を数値にする',[input('TEXT',null)],'Number'],
 ['from_number','数値 %1 を文字にする',[input('VALUE')],'String']
])add('lab_string_'+type,label,args,{output,inputsInline:true,colour:'#00b85b'});
for(const kind of ['blink','pulse'])add('lab_light_'+kind,'本体のランプを %1 で'+(kind==='blink'?'点滅':'ゆっくり明暗')+' 周期 %2 秒',[menu('COLOR',[['赤','RED'],['黄','YELLOW'],['緑','GREEN'],['青','BLUE'],['白','WHITE']]),input('SECONDS')],{...stmt,colour:'#9966ff'});
export const EXTRA_TYPES=defs.map(d=>d.type);
const n=x=>({shadow:{type:'math_number',fields:{NUM:x}}}),t=x=>({shadow:{type:'text',fields:{TEXT:x}}});
const b=(type,inputs={})=>({kind:'block',type,inputs:Object.fromEntries(Object.entries(inputs).map(([k,v])=>[k,typeof v==='number'?n(v):t(v)]))});
export function extraPalette(group){return {
 motor:[b('lab_motor_velocity'),b('lab_motor_stop_mode'),b('lab_motor_change_speed',{SPEED:20}),b('lab_motor_power',{POWER:20})],
 operators:Object.keys(operators).map(op=>['and','or'].includes(op)?{kind:'block',type:'lab_op_'+op,inputs:{A:{shadow:{type:'logic_boolean',fields:{BOOL:'FALSE'}}},B:{shadow:{type:'logic_boolean',fields:{BOOL:'FALSE'}}}}}:b('lab_op_'+op,{A:0,B:['add','sub','mul','div'].includes(op)?1:100})),
 ramp:[b('lab_ramp',{UP:1,DOWN:1}),b('lab_sync')],
 math:[b('lab_math_function',{VALUE:1}),b('lab_minmax',{A:1,B:2})],
 text:[b('lab_string_char',{TEXT:'Hello',INDEX:1}),b('lab_string_contains',{TEXT:'Hello',FIND:'ell'}),b('lab_string_equal',{TEXT:'Hello',OTHER:'Hello'}),b('lab_string_to_number',{TEXT:'12.5'}),b('lab_string_from_number',{VALUE:12.5})],
 lamp:[b('lab_light_blink',{SECONDS:1}),b('lab_light_pulse',{SECONDS:2})]
}[group]??[];}
export function setupEnhancements(Blockly){
 Blockly.Msg.CONTROLS_IF_MSG_THEN='';Blockly.Msg.CONTROLS_IF_MSG_ELSE='';Blockly.Msg.CONTROLS_IF_MSG_ELSEIF='でなければ、もし';Blockly.Msg.CONTROLS_REPEAT_INPUT_DO='';
 Blockly.defineBlocksWithJsonArray(defs);
 const footer=b=>{if(!b.getInput('LAB_LOOP_ICON'))b.appendDummyInput('LAB_LOOP_ICON').setAlign(Blockly.inputs.Align.RIGHT).appendField('↻');};
 const shape=b=>{b.setColour('#f5a400');b.setInputsInline(true);for(let i=0;b.getInput('IF'+i);i++){const name='LAB_THEN_'+i;if(!b.getInput(name)){b.appendDummyInput(name).appendField('なら');b.moveInputBefore(name,'DO'+i);}}if(b.getInput('ELSE')&&!b.getInput('LAB_ELSE_LABEL')){b.appendDummyInput('LAB_ELSE_LABEL').appendField('でなければ');b.moveInputBefore('LAB_ELSE_LABEL','ELSE');}};
 const orig=Blockly.Blocks.controls_if._labShapeInit??Blockly.Blocks.controls_if.init;Blockly.Blocks.controls_if._labShapeInit=orig;
 Blockly.Blocks.controls_if.init=function(){orig.call(this);this.setMutator(null);const update=this.updateShape_;this.updateShape_=function(){for(const i of [...this.inputList])if(i.name.startsWith('LAB_THEN_')||i.name==='LAB_ELSE_LABEL')this.removeInput(i.name);update.call(this);shape(this);};shape(this);};
 Blockly.Blocks.controls_whileUntil.init=function(){
 // Keep the legacy MODE value for JSON/XML, code generation and undo. Only fixed labels are visible.
 this.jsonInit({message0:'%1 %2 %3 %4',args0:[{type:'input_value',name:'BOOL',check:'Boolean'},{type:'field_label_serializable',name:'MODE',text:'UNTIL'},{type:'field_label',name:'UNTIL_LABEL',text:'まで繰り返す'},{type:'field_label',name:'WHILE_LABEL',text:'の間繰り返す'}],message1:'%1',args1:[{type:'input_statement',name:'DO'}],...stmt,colour:'#f5a400'});
 const mode=this.getField('MODE'),update=mode.doValueUpdate_;
 const refresh=()=>{this.getField('UNTIL_LABEL').setVisible(mode.getValue()!=='WHILE');this.getField('WHILE_LABEL').setVisible(mode.getValue()==='WHILE');};
 mode.doClassValidation_=value=>['UNTIL','WHILE'].includes(value)?value:null;
 mode.doValueUpdate_=function(value){update.call(this,value);refresh();};
 mode.setVisible(false);refresh();footer(this);
};
 for(const type of ['controls_repeat_ext','lab_forever']){const orig=Blockly.Blocks[type]._labShapeInit??Blockly.Blocks[type].init;Blockly.Blocks[type]._labShapeInit=orig;Blockly.Blocks[type].init=function(){orig.call(this);this.setInputsInline(true);footer(this);};}
}
export function checkMessageCycles(hats,workspace,fail){
 const edges=new Map();
 const waits=(root,seen=new Set())=>{const result=new Set();for(const b of root.getDescendants(false)){if(!b.isEnabled())continue;if(b.type==='lab_message_wait')result.add(b.getFieldValue('MESSAGE').trim());if(['procedures_callnoreturn','procedures_callreturn','lab_call_outputs'].includes(b.type)){const name=b.getProcedureCall();if(!seen.has(name)){seen.add(name);const d=workspace.getAllBlocks(false).find(d=>['procedures_defnoreturn','procedures_defreturn'].includes(d.type)&&d.getFieldValue('NAME')===name);if(d)for(const m of waits(d,seen))result.add(m);}}}return result;};
 for(const h of hats.filter(h=>h.type==='lab_message_hat')){const name=h.getFieldValue('MESSAGE').trim();const set=edges.get(name)??new Set();for(const m of waits(h))set.add(m);edges.set(name,set);}
 const visit=(name,path)=>{if(path.has(name))fail(hats.find(h=>h.type==='lab_message_hat'&&h.getFieldValue('MESSAGE').trim()===name),'メッセージを送って待つ処理が循環しています。');for(const next of edges.get(name)??[])visit(next,new Set([...path,name]));};
 for(const name of edges.keys())visit(name,new Set());
}
export function registerEnhancements({g,emit,v,stat}){
 const p=b=>'port.'+b.getFieldValue('PORT');
 emit('lab_log_pid',b=>stat(`_lab_log_pid(${['INTERVAL','REFLECTION','OUTPUT','LEFT_SPEED','RIGHT_SPEED'].map(key=>v(b,key)).join(', ')})\n`));
 emit('lab_log_motion',b=>stat(`_lab_trace_motion(${v(b,'INTERVAL')})\n`));
 emit('lab_battery_voltage',()=>['_lab_battery_voltage()',g.ORDER_ATOMIC]);
 emit('lab_display_abacus',b=>stat(`_lab_display_abacus(${v(b,'VALUE')})\n`));
 for(const [op,[,symbol]] of Object.entries(operators))emit('lab_op_'+op,b=>[`((${v(b,'A',['and','or'].includes(op)?'False':'0')}) ${symbol} (${v(b,'B',['and','or'].includes(op)?'False':'0')}))`,g.ORDER_ATOMIC]);
 emit('math_round',b=>{const op=b.getFieldValue('OP');return [op==='ROUND'?`math.floor((${v(b,'NUM')}) + 0.5)`:`math.${op==='ROUNDUP'?'ceil':'floor'}(${v(b,'NUM')})`,g.ORDER_ATOMIC];});
 emit('lab_math_function',b=>[`_lab_math(${JSON.stringify(b.getFieldValue('FUNCTION'))}, ${v(b,'VALUE')})`,g.ORDER_ATOMIC]);
 emit('lab_minmax',b=>[`${b.getFieldValue('OP')}(${v(b,'A')}, ${v(b,'B')})`,g.ORDER_ATOMIC]);
 for(const kind of ['char','contains','equal','to_number','from_number'])emit('lab_string_'+kind,b=>[`_lab_string_op('${kind}', ${v(b,kind==='from_number'?'VALUE':'TEXT')}, ${kind==='char'?v(b,'INDEX'):kind==='contains'?v(b,'FIND'):kind==='equal'?v(b,'OTHER'):'0'})`,g.ORDER_ATOMIC]);
 emit('lab_motor_velocity',b=>[`motor.velocity(${p(b)})`,g.ORDER_ATOMIC]);
 emit('lab_motor_stop_mode',b=>stat((b.getFieldValue('PORTS')==='ALL'?['A','B','C','D','E','F']:[b.getFieldValue('PORTS')]).map(p=>`_lab_stop_modes[port.${p}] = motor.${b.getFieldValue('MODE')}\n`).join('')));
 emit('lab_motor_change_speed',b=>stat(`_lab_change_speed(${p(b)}, ${v(b,'SPEED')})\n`));
 emit('lab_motor_power',b=>stat(`_lab_power(${p(b)}, ${v(b,'POWER')})\n`));
 emit('lab_ramp',b=>stat(`_lab_set_ramp('${b.getFieldValue('PROFILE')}', ${v(b,'UP')}, ${v(b,'DOWN')})\n`));
 emit('lab_minimum_speed',b=>stat(`_lab_motion_config['minimum'] = _lab_range(${v(b,'SPEED')}, 1, 100)\n`));
 emit('lab_ramp_distance',b=>stat(`_lab_set_distance_ramp('${b.getFieldValue('PROFILE')}', ${v(b,'UP')}, ${v(b,'DOWN')})\n`));
 emit('lab_sync',b=>stat(`_lab_motion_config['sync'] = ${b.getFieldValue('ENABLED')==='TRUE'?'True':'False'}\n`));
 for(const kind of ['blink','pulse'])emit('lab_light_'+kind,b=>stat(`_lab_lamp_start('${kind}', color.${b.getFieldValue('COLOR')}, ${v(b,'SECONDS')})\n`));
 emit('lab_light',b=>stat(`_lab_lamp.clear()\nlight.color(light.POWER, color.${b.getFieldValue('COLOR')})\n`));
 emit('lab_light_off',()=>stat('_lab_lamp.clear()\nlight.color(light.POWER, color.BLACK)\n'));
}
export const EXTRA_RUNTIME=String.raw`
_lab_stop_modes = {}
_lab_active_motors = {}
_lab_motion_config = {'profile': 'none', 'up': 0, 'down': 0, 'sync': True, 'minimum': 8, 'basis': 'time'}
_lab_lamp = {}
_lab_log = {}

def _lab_battery_voltage():
    import hub
    read = getattr(hub, 'battery_voltage', None)
    if read is None:
        raise RuntimeError('This Hub OS does not support hub.battery_voltage()')
    return read()

def _lab_display_abacus(value):
    if not isinstance(value, (int, float)) or not 0 <= value <= 99999 or value != int(value):
        raise ValueError('Abacus display needs an integer from 0 to 99999')
    digits = str(int(value))
    start_x = 5 - len(digits)
    light_matrix.clear()
    for i in range(len(digits)):
        digit = int(digits[i])
        x = start_x + i
        if digit >= 5:
            light_matrix.set_pixel(x, 0, 100)
            digit -= 5
        for y in range(digit):
            light_matrix.set_pixel(x, y + 1, 100)

def _lab_string(value):
    text = str(value)
    if len(text.encode('utf-8')) > 120:
        raise ValueError('Text exceeds 120 UTF-8 bytes')
    return text

def _lab_string_op(op, value, extra):
    if op == 'from_number':
        return _lab_string(value)
    text = _lab_string(value)
    if op == 'char':
        if extra != int(extra) or not 1 <= extra <= len(text):
            raise ValueError('Character index out of range')
        return text[int(extra) - 1]
    if op == 'contains':
        return str(extra) in text
    if op == 'equal':
        return text == str(extra)
    result = float(text)
    return _lab_range(result, -1e12, 1e12)

def _lab_math(op, x):
    if op in ('sin', 'cos', 'tan'):
        return getattr(math, op)(x * math.pi / 180)
    if op in ('asin', 'acos', 'atan'):
        return getattr(math, op)(x) * 180 / math.pi
    if op == 'pow10':
        return 10 ** x
    if op == 'abs':
        return abs(x)
    return getattr(math, 'log' if op == 'ln' else 'log10' if op == 'log' else op)(x)

def _lab_send(name):
    _lab_messages[name] += 1
    return _lab_messages[name]

async def _lab_send_wait(name):
    token = _lab_send(name)
    while any(_lab_message_done.get(i, 0) < token for i in _lab_receivers[name]):
        await _lab_tick()

def _lab_set_ramp(profile, up, down):
    if profile not in ('none', 'trapezoid', 's'):
        raise ValueError('Unknown acceleration profile')
    _lab_motion_config.update({'profile': profile, 'up': _lab_range(up, 0, 10), 'down': _lab_range(down, 0, 10), 'basis': 'time'})

def _lab_set_distance_ramp(profile, up, down):
    if profile not in ('trapezoid', 's'):
        raise ValueError('Unknown distance acceleration profile')
    up, down = _lab_range(up, 0, 100), _lab_range(down, 0, 100)
    if up + down > 100:
        raise ValueError('Acceleration and deceleration distance percentages must total 100 or less')
    _lab_motion_config.update({'profile': profile, 'basis': 'distance', 'distance_up': up, 'distance_down': down})

def _lab_ratio_level(fraction, base, minimum, up, down, profile):
    fraction = max(0, min(1, fraction))
    factor, phase = 1, 2
    if up > 0 and fraction < up / 100:
        factor, phase = fraction * 100 / up, 1
    if down > 0 and fraction >= 1 - down / 100:
        factor, phase = min(factor, (1 - fraction) * 100 / down), 3
    factor = max(0, min(1, factor))
    if profile == 's':
        factor = factor * factor * (3 - 2 * factor)
    return minimum + (base - minimum) * factor, phase

def _lab_profile_speed(percent):
    percent = _lab_speed_percent(percent)
    return _lab_speed(int(percent) if _lab_motion_config['profile'] != 'none' else percent)

def _lab_ramp_curve(milliseconds, duration, profile):
    # EBL v0.25.6: Q1000 linear / smoothstep with integer division.
    u = max(0, min(1000, int(milliseconds * 1000 / duration)))
    return u * u * (3000 - 2 * u) // 1000000 if profile == 's' else u

def _lab_ramp_timing(base, total, up, down, minimum=0):
    # A short timed move preserves slopes by lowering the peak and times.
    if up + down >= total:
        combined = up + down
        base = max(minimum, min(100, minimum + (base - minimum) * total // combined))
        up = up * total // combined
        down = total - up
    return base, up, down


def _lab_change_speed(p, speed):
    velocity = _lab_speed(speed)
    state = _lab_active_motors.get(p)
    if state is None:
        raise ValueError('Motor is not running')
    if state.get('bounded') and velocity and state['direction'] * velocity < 0:
        raise ValueError('Cannot reverse a bounded movement')
    if state.get('mechanism_finite'):
        raise ValueError('Cannot change one motor speed during synchronized movement')
    if state.get('mechanism_sync'):
        for q, other in state['group']:
            if q != p and _lab_active_motors.get(q) is other:
                _lab_stop_port(q, motor.BRAKE)
        state['mechanism_sync'] = False
        state['group'] = [(p, state)]
    state['velocity'] = velocity

def _lab_power(p, power):
    _lab_active_motors.pop(p, None)
    motor.set_duty_cycle(p, int(_lab_speed_percent(power) * 100))

def _lab_motor_group_run(ports, speed):
    _lab_start_velocities(ports, [_lab_speed(speed)] * len(ports))

def _lab_stop_port(p, mode, optional=False):
    _lab_active_motors.pop(p, None)
    try:
        motor.stop(p, stop=mode)
    except Exception:
        if not optional:
            raise

def _lab_sync_command(state, nominal, ahead, enabled, now, minimum=0, follow_profile=False):
    same_direction = state.get('profile_nominal', 0) * nominal > 0
    dt = max(1, min(50, time.ticks_diff(now, state.get('command_time', now - 20))))
    if not nominal:
        state.update({'command': 0, 'command_time': now, 'profile_nominal': 0, 'sync_error': 0, 'sync_reduction': 0})
        return 0
    if not enabled:
        state['sync_error'] = 0
        state['sync_reduction'] = 0
        command = int(max(-1050, min(1050, nominal)))
    else:
        # Time-based filtering tolerates encoder quantization and scheduling jitter.
        error = state.get('sync_error', 0) if same_direction else 0
        error += dt / (200 + dt) * (max(0, ahead) - error)
        state['sync_error'] = error
        magnitude = abs(nominal)
        reduction = 0 if magnitude <= 52.5 else min(0.03, max(0, error - 4) * 0.0015)
        target = min(max(0, magnitude - minimum), magnitude * reduction)
        previous_reduction = state.get('sync_reduction', 0) if same_direction else 0
        step = 31.5 * dt / 1000
        correction = max(previous_reduction - step, min(previous_reduction + step, target))
        correction = max(0, min(correction, magnitude * 0.03, max(0, magnitude - minimum)))
        state['sync_reduction'] = correction
        desired = magnitude - correction
        # Continuous speed changes retain their existing slew protection.
        # Finite ramp profiles change only the correction, not the ramp timing.
        if not follow_profile and 'command' in state and state['command'] * nominal > 0:
            previous = abs(state['command'])
            step = 525 * dt / 1000
            desired = max(previous - step, min(previous + step, desired))
        if follow_profile:
            desired = min(magnitude, max(min(magnitude, minimum), desired))
        command = (1 if nominal > 0 else -1) * max(1, min(1050, int(desired)))
    state['profile_nominal'] = nominal
    state['command'] = command
    state['command_time'] = now
    return command

async def _lab_managed_move(ports, velocities, amount, unit, sync=None, heading=None):
    _lab_positive(amount, 3600 if unit == 'time' else 360000)
    if any(p in _lab_active_motors and _lab_active_motors[p].get('bounded') for p in ports):
        raise ValueError('Motor already has an active bounded movement')
    maximum = max(abs(v) for v in velocities)
    if not maximum:
        raise ValueError('Speed cannot be zero')
    degrees = amount * (360 if unit == 'rotation' else 1)
    config = dict(_lab_motion_config)
    if heading is not None:
        config['sync'] = False
    elif sync is not None:
        config['sync'] = sync
    profile = config['profile']
    ratio_mode = profile != 'none' and config.get('basis', 'time') == 'distance'
    if ratio_mode and unit == 'time':
        raise ValueError('Distance-percentage acceleration requires a distance, angle or rotation movement; select a time acceleration block for timed movement')
    base = max(1, min(100, int(maximum / 10.5 + 0.5)))
    ratio_base = base
    up, down = int(config['up'] * 1000), int(config['down'] * 1000)
    total = int(amount * 1000) if unit == 'time' else 0
    if unit == 'time':
        _lab_range(total, 1, 3600000)
    # SPIKE uses deg/s, EBL uses integer percent. Keep EBL's profile arithmetic
    # in percent and convert only when sending a command to the SPIKE API.
    weights = [max(1, int(abs(v) / 10.5 + 0.5)) if v else 0 for v in velocities]
    targets = [int((degrees * weight + ratio_base // 2) / ratio_base) for weight in weights] if profile != 'none' else [degrees * abs(v) / maximum for v in velocities]
    started = time.ticks_ms()
    timeout = total if unit == 'time' else int(degrees * 500 / ratio_base) + 5000 + up + down if profile != 'none' else 600000
    if profile != 'none' and unit != 'time':
        _lab_range(timeout, 1, 180000)
    nonzero_weights = [weight for weight in weights if weight]
    approach = min(base, math.ceil(config.get('minimum', 8) * ratio_base / min(nonzero_weights)))
    if profile != 'none' and unit == 'time':
        base, up, down = _lab_ramp_timing(base, total, up, down, approach)
    profile_floor = profile != 'none'
    loop_previous = started
    decel_start, decel_base, decel_duration = None, 0, 0
    states = []
    for p, velocity in zip(ports, velocities):
        state = {'velocity': velocity, 'direction': 1 if velocity >= 0 else -1, 'start': started, 'position': motor.relative_position(p), 'bounded': True, 'observed_at': started, 'observed_position': 0, 'observed_command': 0, 'measured_speed': 0, 'response_ms': 500}
        state['mechanism_finite'] = sync is True or heading is not None
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
            reached = sum(progress) / len(progress) >= degrees if heading is not None else all(pos >= target for pos, target in zip(progress, targets))
            if (unit == 'time' and elapsed >= total and (profile == 'none' or not down)) or (unit != 'time' and reached):
                break
            if unit != 'time' and elapsed >= timeout:
                raise RuntimeError('Motor movement timed out')
            if heading is not None:
                for state, pos in zip(states, progress):
                    anchor_at, anchor_pos = state.get('gyro_progress', (started, 0))
                    if pos - anchor_pos >= 2:
                        state['gyro_progress'] = (time.ticks_ms(), pos)
                    elif time.ticks_diff(time.ticks_ms(), anchor_at) >= 800:
                        raise RuntimeError('Gyro straight motor stalled; check load and motor direction')
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
                    if abs(command - state['observed_command']) <= 2:
                        old_error = state['observed_command'] - state.get('observed_speed', measured)
                        new_error = command - measured
                        if old_error > 15 and 5 < new_error < old_error:
                            estimate = -dt / math.log(new_error / old_error) + 80
                            state['learned_response'] = max(state.get('learned_response', 200), min(500, estimate))
                            state['response_ms'] = state['learned_response'] if state['learned_response'] <= 350 else max(500, state['learned_response'])
                    state['observed_speed'] = measured
                    falling = (state['observed_command'] - command) * 1000 / dt
                    if falling >= 52.5 and state['measured_speed'] > command:
                        estimate = (state['measured_speed'] - command) * 1000 / falling
                        state['response_ms'] = max(state['response_ms'], min(1000, estimate))
                    state['observed_at'] = time.ticks_ms()
                    state['observed_position'] = pos
                    state['observed_command'] = command
            angular_brake = profile != 'none' and unit != 'time' and (config.get('distance_down', 0) > 0 if ratio_mode else down > 0)
            speed_for_stop = max([0] + [max(state['measured_speed'], abs(state.get('command', 0))) * ratio_base / weight for state, weight in zip(states, weights) if weight])
            response_ms = max(state['response_ms'] for state in states)
            first_remaining = min([max(0, target - pos) * ratio_base / weight for pos, target, weight in zip(progress, targets, weights) if weight])
            if heading is not None:
                first_remaining = max(0, degrees - sum(progress) / len(progress))
            ratio_phase = 2
            if ratio_mode:
                fractions = [max(0, min(1, pos / target)) for pos, target, weight in zip(progress, targets, weights) if weight and target > 0]
                fraction = sum(fractions) / len(fractions)
                cap, ratio_phase = _lab_ratio_level(fraction, base, approach, config['distance_up'], config['distance_down'], profile)
            elif profile != 'none':
                if up and elapsed <= up:
                    cap = approach + (base - approach) * _lab_ramp_curve(elapsed, up, profile) // 1000
                cap = max(approach if profile_floor else 1, min(100, cap))
                if down:
                    if unit == 'time':
                        if total - elapsed <= down:
                            left_ms = total - elapsed
                            level = approach + (base - approach) * _lab_ramp_curve(left_ms, down, profile) / 1000
                            cap = min(cap, min(base, max(approach + 1, math.ceil(level))) if left_ms > 0 and base > approach else approach)
                            cap = max(1, min(100, cap))
                    else:
                        if decel_start is None:
                            duration = down if base <= approach else down * max(0, cap - approach) / (base - approach)
                            distance = (cap + approach) * 10.5 * duration / 2000
                            distance += max(0, speed_for_stop - approach * 10.5) * max(200, min(1000, response_ms)) / 1000
                            distance += max(2, approach * 10.5 * 1.4)
                            if first_remaining <= distance:
                                decel_start, decel_base, decel_duration = elapsed, cap, duration
                        if decel_start is not None:
                            left_ms = decel_duration - (elapsed - decel_start)
                            if decel_duration <= 0 or left_ms <= 0:
                                cap = approach
                            else:
                                level = approach + (decel_base - approach) * _lab_ramp_curve(left_ms, decel_duration, profile) / 1000
                                cap = min(decel_base, max(approach + 1, math.ceil(level))) if decel_base > approach else approach
            # Do not keep driving a stuck motor until it suddenly breaks free.
            # The guard applies only after reaching the terminal speed range.
            for state, pos, target, weight in zip(states, progress, targets, weights):
                terminal = ((angular_brake and decel_start is not None) or ratio_mode) and cap < approach + 1 and weight and pos < target
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
            gyro_commands = []
            for p, state, pos, target, phase, weight, initial in zip(ports, states, progress, targets, phases, weights, velocities):
                velocity = state['velocity']
                state['phase'] = ratio_phase if ratio_mode else 3 if (profile != 'none' and ((unit == 'time' and down and total - elapsed <= down) or decel_start is not None)) else 1 if profile != 'none' and up and elapsed <= up else 2
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
                if unit != 'time' and pos >= target and heading is None:
                    command = 0
                command = _lab_sync_command(state, command, ahead, config['sync'] and len(ports) == 2 and all(velocities), time.ticks_ms(), min(abs(initial), config.get('minimum', 8) * 10.5) if profile_floor else 0, profile != 'none')
                if heading is not None:
                    gyro_commands.append(command)
                elif command:
                    motor.run(p, int(max(-1050, min(1050, command))))
                else:
                    motor.stop(p, stop=motor.BRAKE)
            if heading is not None:
                adjusted = _lab_gyro_commands(heading, gyro_commands, time.ticks_ms(), config.get('minimum', 8))
                for p, state, command in zip(ports, states, adjusted):
                    state['command'] = command
                    motor.run(p, command)
            if unit == 'time' and elapsed >= total:
                break
            await runloop.sleep_ms(20)
    finally:
        for p, state in zip(ports, states):
            if heading is not None or _lab_active_motors.get(p) is state:
                _lab_active_motors.pop(p, None)
                motor.stop(p, stop=_lab_stop_modes.get(p, motor.BRAKE))


async def _lab_motor_absolute(p, speed, position, direction):
    velocity = _lab_speed(_lab_range(_lab_speed_percent(speed), 1, 100))
    position = _lab_range(position, 0, 360)
    if int(position) != position:
        raise ValueError('Absolute position must be an integer from 0 to 360')
    position = int(position) % 360
    if direction not in (motor.SHORTEST_PATH, motor.CLOCKWISE, motor.COUNTERCLOCKWISE):
        raise ValueError('Invalid absolute position direction')
    if p in _lab_active_motors and _lab_active_motors[p].get('bounded'):
        raise ValueError('Motor already has an active bounded movement')
    # Cancel continuous background commands before handing control to the hub API.
    if p in _lab_active_motors:
        _lab_stop_port(p, motor.BRAKE)
    status = await motor.run_to_absolute_position(p, int(position), velocity, direction=direction, stop=_lab_stop_modes.get(p, motor.BRAKE))
    # Hub OS variants return either READY or a one-item tuple containing it.
    completion = status[0] if isinstance(status, tuple) and len(status) == 1 else status
    if completion != motor.READY:
        raise RuntimeError('Absolute motor movement did not complete: ' + str(status))

async def _lab_motor_group(ports, speed, amount, unit):
    await _lab_managed_move(ports, [_lab_profile_speed(speed)] * len(ports), amount, unit)

def _lab_start_velocities(ports, velocities):
    now = time.ticks_ms()
    group = []
    for p, velocity in zip(ports, velocities):
        s = {'velocity': int(velocity), 'direction': 1 if velocity >= 0 else -1, 'start': now, 'position': motor.relative_position(p), 'bounded': False, 'group': group, 'command': int(velocity), 'phase': 4}
        _lab_active_motors[p] = s
        group.append((p, s))
        motor.run(p, int(velocity))

def _lab_steering_run(left, right, turn, speed, amount):
    _lab_pair(left, right)
    _lab_start_velocities((left, right), _lab_steering_velocities(speed, turn))

def _lab_tank_run(left, right, left_speed, right_speed, amount):
    _lab_pair(left, right)
    _lab_start_velocities((left, right), (-_lab_speed(left_speed), _lab_speed(right_speed)))

_lab_native_drive = _lab_drive
_lab_native_turn = _lab_turn
_lab_native_pair = _lab_pair
_lab_pair_ports = None

def _lab_pair(left, right):
    global _lab_pair_ports, _lab_pair_ready
    if left == right:
        raise ValueError('Choose two different motor ports')
    if _lab_pair_ports == (left, right):
        return
    if _lab_pair_ports is not None:
        motor_pair.unpair(motor_pair.PAIR_1)
        _lab_pair_ports = None
        _lab_pair_ready = False
    _lab_native_pair(left, right)
    _lab_pair_ports = (left, right)

def _lab_motion_ports():
    _lab_require_pair()
    return _lab_pair_ports

def _lab_movement_stop():
    for p in _lab_motion_ports():
        state = _lab_active_motors.get(p)
        if state is not None:
            state['movement_stopped'] = True
        _lab_stop_port(p, motor.BRAKE)

def _lab_set_motion_pair(left, right):
    if left == right:
        raise ValueError('Choose two different motor ports')
    if _lab_pair_ports is not None and _lab_pair_ports != (left, right):
        for p in _lab_pair_ports:
            _lab_stop_port(p, motor.BRAKE)
    _lab_pair(left, right)

def _lab_use_managed():
    return _lab_motion_config.get('managed', False) or _lab_motion_config['profile'] != 'none' or any(p in _lab_stop_modes for p in _lab_pair_ports)

def _lab_steering_velocities(speed, turn, finite=False):
    speed = _lab_speed_percent(speed)
    t = _lab_range(turn, -100, 100)
    # Motors are mirrored on the standard drive base.
    percentages = (-speed if t <= 0 else -speed * (1 - t / 50), speed if t >= 0 else speed * (1 + t / 50))
    return tuple(_lab_profile_speed(p) if finite else _lab_speed(p) for p in percentages)

async def _lab_drive(speed, amount, unit, steering):
    _lab_require_pair()
    if not _lab_use_managed():
        return await _lab_native_drive(speed, amount, unit, steering)
    degrees = amount * 10 * 360 / (math.pi * _lab_wheel) if unit == 'cm' else amount
    await _lab_managed_move(_lab_pair_ports, _lab_steering_velocities(speed, steering, True), degrees, 'time' if unit == 'seconds' else 'angle')

async def _lab_turn(left, right, speed, angle, pivot, direction):
    _lab_pair(left, right)
    if not _lab_use_managed():
        return await _lab_native_turn(left, right, speed, angle, pivot, direction)
    velocity = _lab_profile_speed(speed)
    if velocity == 0:
        raise ValueError('Speed cannot be zero')
    degrees = _lab_positive(angle, 3600) * _lab_tread / _lab_wheel * (2 if pivot else 1)
    lv, rv = (velocity, 0 if pivot else -velocity) if direction > 0 else (0 if pivot else -velocity, velocity)
    await _lab_managed_move((left, right), (-lv, rv), degrees, 'angle')

async def _lab_tank_angle(left, right, left_speed, right_speed, amount):
    _lab_pair(left, right)
    await _lab_managed_move((left, right), (-_lab_profile_speed(left_speed), _lab_profile_speed(right_speed)), amount, 'angle')

async def _lab_tank_time(left, right, left_speed, right_speed, amount):
    _lab_pair(left, right)
    await _lab_managed_move((left, right), (-_lab_profile_speed(left_speed), _lab_profile_speed(right_speed)), amount, 'time')

def _lab_lamp_start(kind, colour, seconds):
    _lab_lamp.update({'kind': kind, 'colour': colour, 'period': int(_lab_range(seconds, 0.1, 60) * 1000), 'start': time.ticks_ms()})

async def _lab_service():
    while _lab_task_count[0]:
        now = time.ticks_ms()
        for p, s in list(_lab_active_motors.items()):
            if _lab_active_motors.get(p) is not s:
                continue
            if s.get('mechanism_sync') and any(_lab_active_motors.get(q) is not other for q, other in s['group']):
                for q, other in s['group']:
                    if _lab_active_motors.get(q) is other:
                        _lab_stop_port(q, motor.BRAKE)
                continue
            if not s['bounded']:
                c = _lab_motion_config
                group = s.get('group', [])
                enabled = (s.get('mechanism_sync', False) or c['sync']) and len(group) == 2 and all(_lab_active_motors.get(q) is other and other['velocity'] for q, other in group)
                ahead = 0
                if enabled:
                    maximum = max(abs(other['velocity']) for q, other in group)
                    phases = [abs(motor.relative_position(q) - other['position']) * maximum / abs(other['velocity']) for q, other in group]
                    ahead = abs(motor.relative_position(p) - s['position']) * maximum / abs(s['velocity']) - min(phases)
                command = _lab_sync_command(s, s['velocity'], ahead, enabled, now)
                motor.run(p, command)
        _lab_capture_motion()
        if _lab_lamp:
            phase = time.ticks_diff(now, _lab_lamp['start']) % _lab_lamp['period'] / _lab_lamp['period']
            if _lab_lamp['kind'] == 'blink':
                light.color(light.POWER, _lab_lamp['colour'] if phase < 0.5 else color.BLACK)
            else:
                # Standard hub.light exposes discrete colours only. Temporal
                # dithering gives a software brightness envelope without HSV.
                duty = (1 - math.cos(2 * math.pi * phase)) / 2
                accumulator = _lab_lamp.get('accumulator', 0) + duty
                light.color(light.POWER, _lab_lamp['colour'] if accumulator >= 1 else color.BLACK)
                _lab_lamp['accumulator'] = accumulator % 1
        await runloop.sleep_ms(5 if _lab_lamp.get('kind') == 'pulse' else 20)

async def _lab_track(task):
    try:
        await task()
    finally:
        _lab_task_count[0] -= 1

def _lab_log_start(name):
    if not name or len(name) > 31 or any(not ('a' <= c <= 'z' or 'A' <= c <= 'Z' or '0' <= c <= '9' or c in '-_') for c in name):
        raise ValueError('CSV name: 1-31 letters, digits, - or _')
    _lab_log_end()
    buffer = bytearray(32768)
    header = b'time_s,label,value\n'
    buffer[:len(header)] = header
    _lab_log.update({'path': '/flash/sbl_' + name + '.csv', 'buffer': buffer, 'size': len(header), 'rows': 0, 'start': time.ticks_ms(), 'trace': None})

def _lab_log_append(data, count):
    if _lab_log['rows'] + count > 1000 or _lab_log['size'] + len(data) > 32768:
        _lab_log['trace'] = None
        raise ValueError('Recording memory full (1000 rows or 32 KiB); increase sampling interval')
    offset = _lab_log['size']
    _lab_log['buffer'][offset:offset + len(data)] = data
    _lab_log['size'] += len(data)
    _lab_log['rows'] += count

def _lab_log_row(label, value, elapsed):
    return (str(elapsed / 1000) + ',' + _lab_csv(_lab_string(label)) + ',' + _lab_csv(_lab_string(value)) + '\n').encode('utf-8')

def _lab_log_value(label, value):
    if not _lab_log:
        raise ValueError('Start recording first')
    elapsed = time.ticks_diff(time.ticks_ms(), _lab_log['start'])
    _lab_log_append(_lab_log_row(label, value, elapsed), 1)

def _lab_log_pid(interval, reflection, output, left_speed, right_speed):
    if not _lab_log:
        raise ValueError('Start recording first')
    interval = _lab_range(interval, 20, 60000)
    if int(interval) != interval:
        raise ValueError('Sampling interval must be an integer')
    values = tuple(_lab_number(value) for value in (reflection, output, left_speed, right_speed))
    captured = time.ticks_ms()
    previous = _lab_log.get('pid_call')
    period = time.ticks_diff(captured, previous) if previous is not None else ''
    _lab_log['pid_call'] = captured
    last = _lab_log.get('pid_sample')
    if last is not None and time.ticks_diff(captured, last) < interval:
        return
    elapsed = time.ticks_diff(captured, _lab_log['start'])
    rows = tuple(zip(('reflection', 'pid', 'left_cmd', 'right_cmd'), values)) + (('control_interval_ms', period),)
    _lab_log_append(b''.join(_lab_log_row(label, value, elapsed) for label, value in rows), 5)
    _lab_log['pid_sample'] = captured

def _lab_trace_motion(interval):
    if not _lab_log:
        raise ValueError('Start recording first')
    interval = _lab_range(interval, 20, 1000)
    if int(interval) != interval:
        raise ValueError('Sampling interval must be an integer')
    left, right = _lab_motion_ports()
    _lab_log['trace'] = {'ports': (left, right), 'origins': (motor.relative_position(left), motor.relative_position(right)), 'interval': int(interval), 'last': None}

def _lab_capture_motion(force=False):
    trace = _lab_log.get('trace')
    if trace is None:
        return
    captured = time.ticks_ms()
    if trace['last'] is not None and time.ticks_diff(captured, trace['last']) <= 0:
        return
    if not force and trace['last'] is not None and time.ticks_diff(captured, trace['last']) < trace['interval']:
        return
    left, right = trace['ports']
    lp, rp = motor.relative_position(left), motor.relative_position(right)
    previous = trace.get('previous')
    dt = time.ticks_diff(captured, previous[0]) if previous is not None else 0
    lv = abs(lp - previous[1]) * 1000 / dt if dt > 0 else ''
    rv = abs(rp - previous[2]) * 1000 / dt if dt > 0 else ''
    ls, rs = _lab_active_motors.get(left, {}), _lab_active_motors.get(right, {})
    left_degrees, right_degrees = abs(lp - trace['origins'][0]), abs(rp - trace['origins'][1])
    values = (('left_deg', left_degrees), ('right_deg', right_degrees), ('difference_deg', left_degrees - right_degrees), ('left_speed_dps', lv), ('right_speed_dps', rv), ('left_command_dps', abs(ls.get('command', 0))), ('right_command_dps', abs(rs.get('command', 0))), ('phase', max(ls.get('phase', 0), rs.get('phase', 0))), ('sample_span_ms', time.ticks_diff(time.ticks_ms(), captured)))
    elapsed = time.ticks_diff(captured, _lab_log['start'])
    _lab_log_append(b''.join(_lab_log_row(label, value, elapsed) for label, value in values), len(values))
    trace['last'] = captured
    trace['previous'] = (captured, lp, rp)

def _lab_log_end():
    if not _lab_log:
        return
    if _lab_active_motors:
        raise ValueError('Stop motors before saving recording')
    if _lab_log.get('trace') and _lab_log['rows'] <= 990 and _lab_log['size'] <= 31744:
        _lab_capture_motion(True)
    path = _lab_log['path']
    f = None
    try:
        f = open(path, 'wb')
        view = memoryview(_lab_log['buffer'])
        offset = 0
        while offset < _lab_log['size']:
            written = f.write(view[offset:min(offset + 512, _lab_log['size'])])
            if not isinstance(written, int) or written <= 0:
                raise OSError('CSV write did not complete')
            offset += written
        f.flush()
    except Exception as e:
        raise RuntimeError('CSV save failed at ' + path + ': ' + str(e))
    finally:
        if f is not None:
            f.close()
    _lab_log.clear()
`;
