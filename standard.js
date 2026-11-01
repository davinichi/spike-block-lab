import {registerReturnGenerators,RETURN_RUNTIME} from './return-runtime.js';
import {registerEnhancements,EXTRA_RUNTIME,checkMessageCycles} from './enhancements.js?v=0.6.0';
import {IMAGES,PORTS} from './model.js';
import {STANDARD_TYPES} from './classroom-blocks.js';
import {registerCommonGenerators,COMMON_RUNTIME} from './common-runtime.js?v=0.6.0';
const VALID=new Set([...STANDARD_TYPES,'spike_start','spike_image','spike_wait','spike_motor','spike_repeat','spike_forever','spike_if_distance']);
export function generateStandard(workspace,generator,settings={}) {
  const roots=workspace.getTopBlocks(true).filter(b=>b.isEnabled());
  const hats=roots.filter(b=>['spike_start','lab_when','lab_when_changed','lab_message_hat'].includes(b.type));
  if(!hats.length)throw Error('「スタート」またはイベントのブロックを置いてください。');
  if(hats.length>16)throw Error('スタートとイベントは合計16個までです。');
  if(workspace.getAllBlocks(false).length>500)throw Error('ブロックは500個までにしてください。');
  const used=new Map(),messages=new Set();
  const fail=(b,text)=>{const e=Error(text);e.blockId=b.id;throw e;};
  const device=(b,p,kind)=>{if(used.has(p)&&used.get(p)!==kind)fail(b,`ポート${p}に違う種類の機器が指定されています。`);used.set(p,kind);};
  const reachable=new Set();
  function walk(b,depth=0) {
    if(!b||reachable.has(b.id)||!b.isEnabled())return;
    if(depth>100)fail(b,'ブロックの入れ子が深すぎます。');
    reachable.add(b.id);
    if(!VALID.has(b.type))fail(b,'未対応のブロックがあります。');
    if(/^lab_motor/.test(b.type)||/^lab_encoder/.test(b.type)||b.type==='spike_motor') {const p=b.getFieldValue('PORT');if(p&&p!=='ALL')device(b,p,'motor');}
    if(b.type.startsWith('lab_motor_pair_')||['lab_motor_group_stop','lab_motor_stop_mode'].includes(b.type))for(const p of (b.getFieldValue('PORTS')==='ALL'?[]:b.getFieldValue('PORTS').split(',')))device(b,p,'motor');
    if(/^lab_(distance|color|reflection|force|pressed)/.test(b.type))device(b,b.getFieldValue('PORT'),b.type.includes('distance')?'distance':/color|reflection/.test(b.type)?'color':'force');
    if(b.type==='lab_pair') {if(b.getFieldValue('LEFT')===b.getFieldValue('RIGHT'))fail(b,'動きには違う2個のポートを選んでください。');for(const p of ['LEFT','RIGHT'])device(b,b.getFieldValue(p),'motor');}
    if(['lab_message_hat','lab_broadcast','lab_message_wait'].includes(b.type)){const name=b.getFieldValue('MESSAGE').trim();if(!name||name.length>40)fail(b,'メッセージ名を1〜40文字にしてください。');messages.add(name);}
    if(['procedures_callnoreturn','procedures_callreturn','lab_call_outputs'].includes(b.type)) {
      const name=b.getProcedureCall(),def=workspace.getAllBlocks(false).find(d=>['procedures_defnoreturn','procedures_defreturn'].includes(d.type)&&d.getFieldValue('NAME')===name);
      if(!def)fail(b,'呼び出すマイブロックの定義がありません。');if(b.type==='procedures_callnoreturn'&&def.type!=='procedures_defnoreturn')fail(b,'戻り値ありの呼び出しを置き直してください。');walk(def,depth+1);
    }
    for(const input of b.inputList)if(input.connection)walk(input.connection.targetBlock(),depth+1);
    walk(b.getNextBlock(),depth+1);
  }
  hats.forEach(h=>walk(h));
  checkMessageCycles(hats,workspace,fail);
  const isMotion=b=>/^lab_(drive_(forward|backward)|(?:spin|pivot)_(right|left)|(?:steering|tank)_(run|angle|time))$/.test(b.type);
  const hasPair=[...reachable].some(id=>workspace.getBlockById(id).type==='lab_pair');
  for(const id of reachable){const b=workspace.getBlockById(id);if(isMotion(b)&&!hasPair)fail(b,'動きに使うモーターを設定してください。');}
  // A single start has a known order. Branches must establish settings on every path.
  function checkMotionOrder(b,ready,visiting=new Set()){
    for(;b&&b.isEnabled();b=b.getNextBlock()){
      if(b.type==='lab_pair')ready=true;
      if(isMotion(b)&&!ready)fail(b,'この動きの前に、動きに使うモーターを設定してください。');
      if(['procedures_callnoreturn','procedures_callreturn','lab_call_outputs'].includes(b.type)){
        const def=workspace.getAllBlocks(false).find(d=>['procedures_defnoreturn','procedures_defreturn'].includes(d.type)&&d.getFieldValue('NAME')===b.getProcedureCall());
        if(def&&!visiting.has(def.id)){const seen=new Set(visiting);seen.add(def.id);ready=checkMotionOrder(def.getInputTargetBlock('STACK'),ready,seen);}
      }else if(b.type==='controls_if'){
        const paths=[];for(let i=0;b.getInput('DO'+i);i++)paths.push(checkMotionOrder(b.getInputTargetBlock('DO'+i),ready,visiting));
        paths.push(b.getInput('ELSE')?checkMotionOrder(b.getInputTargetBlock('ELSE'),ready,visiting):ready);ready=paths.every(Boolean);
      }else{for(const input of b.inputList)if(input.type===3)checkMotionOrder(input.connection?.targetBlock(),ready,visiting);}
    }return ready;
  }
  if(hats.length===1&&hats[0].type==='spike_start')checkMotionOrder(hats[0].getNextBlock(),false);
  if([...reachable].every(id=>['spike_start','lab_when','lab_message_hat'].includes(workspace.getBlockById(id).type)))throw Error('「スタート」の下にブロックをつないでみましょう。');
  const g=generator;
  // Custom loops, event tasks and Blockly statements must share one indent.
  g.INDENT='    ';
  const v=(b,name,fallback='0')=>{const input=b.getInput(name);if(input?.connection&&!input.connection.targetBlock())fail(b,'空いている入力欄に、数値や条件のブロックを入れてください。');return g.valueToCode(b,name,g.ORDER_NONE)||fallback;};
  const p=b=>'port.'+b.getFieldValue('PORT');
  const emit=(name,fn)=>{g.forBlock[name]=fn;};
  const stat=(code)=>'await _lab_tick()\n'+code;
  registerCommonGenerators({g,emit,v,stat,fail});
  emit('spike_start',()=> '');emit('lab_when',()=> '');emit('lab_message_hat',()=> '');
  emit('spike_image',b=>stat(IMAGES[b.getFieldValue('IMAGE')].flatMap((row,y)=>[...row].map((x,col)=>`light_matrix.set_pixel(${col}, ${y}, ${x==='1'?100:0})\n`)).join('')));
  emit('spike_wait',b=>stat(`await _lab_pause(${Number(b.getFieldValue('SECONDS'))})\n`));
  emit('spike_motor',b=>stat(`await _lab_motor(${p(b)}, ${Number(b.getFieldValue('SPEED'))*Number(b.getFieldValue('DIRECTION'))}, ${Number(b.getFieldValue('SECONDS'))}, 'seconds', False)\n`));
  emit('lab_motor',b=>stat(`await _lab_motor(${p(b)}, ${v(b,'SPEED')}, ${v(b,'AMOUNT')}, '${b.getFieldValue('UNIT')}', True)\n`));
  emit('lab_motor_run',b=>stat(`motor.run(${p(b)}, _lab_speed(${v(b,'SPEED')}))\n`));
  emit('lab_motor_stop',b=>stat(b.getFieldValue('PORT')==='ALL'?'_lab_stop_all()\n':`motor.stop(${p(b)}, stop=motor.${b.getFieldValue('MODE')})\n`));
  emit('lab_pair',b=>stat(`_lab_set_motion_pair(port.${b.getFieldValue('LEFT')}, port.${b.getFieldValue('RIGHT')})\n`));
  emit('lab_geometry',b=>stat(`_lab_wheel = ${Number(b.getFieldValue('DIAMETER'))}\n`));
  emit('lab_drive',b=>stat(`await _lab_drive(${v(b,'SPEED')}, ${v(b,'AMOUNT')}, '${b.getFieldValue('UNIT')}', ${v(b,'STEERING')})\n`));
  emit('lab_tank',b=>stat(`_lab_require_pair()\nmotor_pair.move_tank(motor_pair.PAIR_1, _lab_speed(${v(b,'LEFT')}), _lab_speed(${v(b,'RIGHT')}))\n`));
  emit('lab_wait',b=>stat(`await _lab_pause(${v(b,'SECONDS')})\n`));
  emit('lab_wait_until',b=>stat(`while not (${v(b,'BOOL','False')}):\n    await _lab_tick()\n`));
  emit('lab_forever',b=>`while True:\n${g.statementToCode(b,'DO')}    await _lab_tick()\n`);
  emit('spike_forever',b=>`while True:\n${g.statementToCode(b,'BODY')}    await _lab_tick()\n`);
  emit('spike_repeat',b=>`for _ in range(${Number(b.getFieldValue('COUNT'))}):\n${g.statementToCode(b,'BODY')}    await _lab_tick()\n`);
  emit('spike_if_distance',b=>`if _lab_near(port.${b.getFieldValue('PORT')}, ${Number(b.getFieldValue('CM'))}):\n${g.statementToCode(b,'THEN')||'    pass\n'}else:\n${g.statementToCode(b,'ELSE')||'    pass\n'}`);
  emit('lab_end',()=> 'raise _LabStop()\n');
  emit('lab_text',b=>stat(`await light_matrix.write(_lab_text(${v(b,'TEXT',"''")}))\n`));
  emit('lab_pixel',b=>stat(`light_matrix.set_pixel(int(_lab_range(${v(b,'X')}, 0, 4)), int(_lab_range(${v(b,'Y')}, 0, 4)), int(_lab_range(${v(b,'BRIGHTNESS')}, 0, 100)))\n`));
  emit('lab_light',b=>stat(`light.color(light.POWER, color.${b.getFieldValue('COLOR')})\n`));
  emit('lab_tone',b=>stat(`await sound.beep(int(_lab_range(${v(b,'HZ')}, 44, 10000)), int(_lab_range(${v(b,'SECONDS')}, 0, 60) * 1000), int(_lab_range(${v(b,'VOLUME')}, 0, 100)))\n`));
  for(const [type,fn] of Object.entries({lab_distance:b=>`_lab_distance(${p(b)})`,lab_distance_valid:b=>`(distance_sensor.distance(${p(b)}) >= 0)`,lab_color:b=>`color_sensor.color(${p(b)})`,lab_color_is:b=>`(color_sensor.color(${p(b)}) == color.${b.getFieldValue('COLOR')})`,lab_reflection:b=>`color_sensor.reflection(${p(b)})`,lab_force:b=>`(force_sensor.force(${p(b)}) / 10)`,lab_pressed:b=>`force_sensor.pressed(${p(b)})`,lab_encoder:b=>`motor.relative_position(${p(b)})`,lab_button:b=>`(button.pressed(button.${b.getFieldValue('BUTTON')}) > 0)`,lab_angle:b=>`(motion_sensor.tilt_angles()[${b.getFieldValue('AXIS')}] / 10)`,lab_timer:()=>`(time.ticks_diff(time.ticks_ms(), _lab_timer_start) / 1000)`}))emit(type,b=>[fn(b),g.ORDER_ATOMIC]);
  emit('lab_encoder_reset',b=>stat(`motor.reset_relative_position(${p(b)}, 0)\n`));
  emit('lab_timer_reset',()=>stat('_lab_timer_start = time.ticks_ms()\n'));
  emit('lab_yaw_reset',()=>stat('motion_sensor.reset_yaw(0)\n'));
  emit('lab_broadcast',b=>stat(`_lab_send(${JSON.stringify(b.getFieldValue('MESSAGE').trim())})\n`));
  // MicroPython does not provide CPython's numbers module used by Blockly's default.
  emit('math_change',(b,gen)=>{const name=gen.getVariableName(b.getField('VAR').getVariable().getId());return stat(`${name} = (${name} if isinstance(${name}, (int, float)) else 0) + (${v(b,'DELTA')})\n`);});
  if(!g._labOriginalProcedure)g._labOriginalProcedure=g.forBlock.procedures_defnoreturn;
  emit('procedures_defnoreturn',(b,gen)=>{
    const result=g._labOriginalProcedure(b,gen);
    const key='%'+gen.getProcedureName(b.getFieldValue('NAME'));
    if(gen.definitions_[key])gen.definitions_[key]=gen.definitions_[key].replace(/^def /,'async def ');
    return result;
  });
  emit('procedures_callnoreturn',(b,gen)=>{
    const name=gen.getProcedureName(b.getFieldValue('NAME'));
    const args=b.getVarModels().map((_,i)=>v(b,'ARG'+i));return stat(`await ${name}(${args.join(', ')})\n`);
  });
  registerEnhancements({g,emit,v,stat});
  registerReturnGenerators({g,emit,v,stat,fail,workspace});
  g.INFINITE_LOOP_TRAP='await _lab_tick()\n';
  g.init(workspace);
  const allGlobals=[...workspace.getVariableMap().getAllVariables().map(variable=>g.getVariableName(variable.getId())),'_lab_wheel','_lab_tread','_lab_timer_start','_lab_log_name'];
  const globalLine=allGlobals.length?'    global '+[...new Set(allGlobals)].join(', ')+'\n':'';
  for(const b of roots.filter(b=>['procedures_defnoreturn','procedures_defreturn'].includes(b.type)&&reachable.has(b.id)))g.blockToCode(b);
  const tasks=[];
  hats.forEach((hat,index)=>{
    const body=g.blockToCode(hat)||'pass\n';
    let inner=body;
    if(hat.type==='lab_when') {
      const condition=v(hat,'BOOL','False');
      inner=`_previous = False\nwhile True:\n    _current = bool(${condition})\n    if _current and not _previous:\n${indent(body,8)}    _previous = _current\n    await _lab_tick()\n`;
    }
    if(hat.type==='lab_when_changed') {
      const expression=v(hat,'VALUE');
      inner=`_previous = ${expression}\nwhile True:\n    _current = ${expression}\n    if _current != _previous:\n${indent(body,8)}    _previous = _current\n    await _lab_tick()\n`;
    }
    if(hat.type==='lab_message_hat') {
      const message=JSON.stringify(hat.getFieldValue('MESSAGE').trim());
      inner=`_seen = 0\nwhile True:\n    if _lab_messages[${message}] != _seen:\n        _seen += 1\n${indent(body,8)}        _lab_message_done[${index}] = _seen\n    await _lab_tick()\n`;
    }
    tasks.push(`async def _lab_task_${index}():\n${globalLine}${indent(inner,4)}\n`);
  });
  // Procedure blocks need the same shared configuration globals as start stacks.
  for(const key of Object.keys(g.definitions_))if(g.definitions_[key].startsWith('async def '))g.definitions_[key]=g.definitions_[key].replace(/^(async def [^\n]+\n)/,'$1'+g.INDENT+'global _lab_wheel, _lab_tread, _lab_timer_start, _lab_log_name\n');
  const managed=[...reachable].some(id=>['lab_motor_change_speed','lab_sync'].includes(workspace.getBlockById(id).type));
  const definitions=g.finish('');
  const source=`# SPIKE Block Lab 0.6.0 / Standard SPIKE App 3 Hub OS\n# Hardware verification pending. All control runs on the hub.\nimport runloop, motor, motor_pair, distance_sensor, color_sensor, force_sensor, color, time, math\nfrom hub import port, light_matrix, light, sound, button, motion_sensor\n\n${RUNTIME}\n${COMMON_RUNTIME}\n${EXTRA_RUNTIME}\n${RETURN_RUNTIME}\n_lab_motion_config['managed'] = ${managed?'True':'False'}\n_lab_receivers = ${JSON.stringify(Object.fromEntries([...messages].map(m=>[m,hats.flatMap((h,i)=>h.type==='lab_message_hat'&&h.getFieldValue('MESSAGE').trim()===m?[i]:[])])))}\n_lab_message_done = {}\n_lab_tread = 112\n_lab_lists = {}\n_lab_text_values = {}\n_lab_pid_state = {}\n_lab_log_name = ''\n_lab_wheel = ${Number(settings.wheel)||56}\n_lab_timer_start = time.ticks_ms()\n_lab_pair_ready = False\n_lab_messages = ${JSON.stringify(Object.fromEntries([...messages].map(m=>[m,0])))}\n\n${definitions}\n${tasks.join('\n')}\ntry:\n    _lab_task_count = [${tasks.length}]\n    runloop.run(_lab_service(), ${tasks.map((_,i)=>`_lab_track(_lab_task_${i})`).join(', ')})\nexcept _LabStop:\n    pass\nfinally:\n    _lab_stop_all()\n`;
  return {source,count:reachable.size,threads:hats.length,devices:Object.fromEntries(used)};
}
const indent=(s,n)=>s.split('\n').filter((line,i,a)=>i<a.length-1||line).map(line=>' '.repeat(n)+line+'\n').join('');
const RUNTIME=`class _LabStop(Exception):\n    pass\n\ndef _lab_range(value, lo, hi):\n    if not isinstance(value, (int, float)) or not lo <= value <= hi:\n        raise ValueError('Value out of range')\n    return value\n\ndef _lab_speed(percent):\n    return int(_lab_range(percent, -100, 100) * 10.5)\n\nasync def _lab_tick():\n    await runloop.sleep_ms(10)\n\nasync def _lab_pause(seconds):\n    await runloop.sleep_ms(int(_lab_range(seconds, 0, 3600) * 1000))\n\ndef _lab_stop_all():\n    try:\n        _lab_log_end()\n    except Exception as e:\n        print('CSV close failed: ' + str(e))\n    sound.stop()\n    for p in (port.A, port.B, port.C, port.D, port.E, port.F):\n        try:\n            motor.stop(p)\n        except Exception:\n            pass\n\ndef _lab_distance(p):\n    mm = distance_sensor.distance(p)\n    return mm / 10 if mm is not None and mm >= 0 else 9999\n\ndef _lab_near(p, cm):\n    return _lab_distance(p) < cm\n\ndef _lab_text(value):\n    text = str(value)\n    if any(ord(c) < 32 or ord(c) > 126 for c in text):\n        raise ValueError('Hub text supports ASCII only')\n    return text[:120]\n\nasync def _lab_motor(p, speed, amount, unit, percent):\n    velocity = _lab_speed(speed) if percent else int(_lab_range(speed, -1050, 1050))\n    if velocity == 0:\n        raise ValueError('Motor speed cannot be zero')\n    if unit == 'seconds':\n        status = await motor.run_for_time(p, int(_lab_range(amount, 0.001, 3600) * 1000), velocity)\n    else:\n        degrees = _lab_range(amount, 0.001, 360000) * (360 if unit == 'rotations' else 1)\n        status = await motor.run_for_degrees(p, int(degrees), velocity)\n    if status != motor.READY:\n        raise RuntimeError('Motor did not complete: ' + str(status))\n\ndef _lab_pair(left, right):\n    global _lab_pair_ready\n    if left == right:\n        raise ValueError('Choose two different motor ports')\n    motor_pair.pair(motor_pair.PAIR_1, left, right)\n    _lab_pair_ready = True\n\ndef _lab_require_pair():\n    if not _lab_pair_ready:\n        raise ValueError('Set movement motors first')\n\nasync def _lab_drive(speed, amount, unit, steering):\n    _lab_require_pair()\n    velocity = _lab_speed(speed)\n    if velocity == 0:\n        raise ValueError('Speed cannot be zero')\n    steering = int(_lab_range(steering, -100, 100))\n    if unit == 'seconds':\n        status = await motor_pair.move_for_time(motor_pair.PAIR_1, int(_lab_range(amount, 0.001, 3600) * 1000), steering, velocity=velocity)\n    else:\n        value = _lab_range(amount, 0.001, 360000)\n        degrees = value * 10 * 360 / (math.pi * _lab_wheel) if unit == 'cm' else value\n        status = await motor_pair.move_for_degrees(motor_pair.PAIR_1, int(degrees) * (-1 if velocity < 0 else 1), steering, velocity=abs(velocity))\n    if status != motor.READY:\n        raise RuntimeError('Drive did not complete: ' + str(status))\n`;

