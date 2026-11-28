import {PRIMARY_SCHOOL_WORKSPACES} from './primary-school-sample.js?v=primary-school-20261128';
const num=n=>({type:'math_number',fields:{NUM:n}});
const input=block=>({[block.type==='math_number'?'shadow':'block']:block});
const node=(type,fields={},inputs={})=>({type,fields,inputs:Object.fromEntries(Object.entries(inputs).map(([k,v])=>[k,input(typeof v==='number'?num(v):v)]))});
function chain(nodes){let next;for(const b of [...nodes].reverse())next={...b,...(next?{next:{block:next}}:{})};return next;}
const start=(nodes,x=50,y=40)=>({type:'spike_start',x,y,next:{block:chain(nodes)}});
const pixel=brightness=>node('lab_pixel',{}, {X:2,Y:2,BRIGHTNESS:brightness});
const wait=seconds=>node('lab_wait',{}, {SECONDS:seconds});
const tone=()=>node('lab_sound_tone',{VOLUME:25}, {FREQUENCY:440,MS:300});
const pair=()=>node('lab_pair',{LEFT:'B',RIGHT:'C'});
const drive=(speed,amount=10)=>node(speed<0?'lab_drive_backward':'lab_drive_forward',{},{SPEED:Math.abs(speed),CM:amount});
export function classroomSample(name) {

  if(name==='stallMonitor'){
    const names=['走行秒','停止判定秒','確認間隔','最小変化角','左前回角度','右前回角度','左進行時刻','右進行時刻','左現在角度','右現在角度','異常停止'];
    const variable=name=>({id:'stall-'+names.indexOf(name),name});
    const get=name=>node('variables_get',{VAR:variable(name)}),set=(name,value)=>node('variables_set',{VAR:variable(name)},{VALUE:value});
    const cmp=(op,a,b)=>node('logic_compare',{OP:op},{A:a,B:b});
    const sub=(a,b)=>node('math_arithmetic',{OP:'MINUS'},{A:a,B:b});
    const abs=x=>node('math_single',{OP:'ABS'},{NUM:x});
    const timer=()=>node('lab_timer');
    const steps=[set('左現在角度',node('lab_encoder',{PORT:'B'})),set('右現在角度',node('lab_encoder',{PORT:'C'}))];
    for(const side of ['左','右'])steps.push(node('controls_if',{}, {IF0:cmp('GTE',abs(sub(get(side+'現在角度'),get(side+'前回角度'))),get('最小変化角')),DO0:chain([set(side+'前回角度',get(side+'現在角度')),set(side+'進行時刻',timer())])}));
    steps.push(node('controls_if',{}, {IF0:node('logic_operation',{OP:'OR'},{A:cmp('GTE',sub(timer(),get('左進行時刻')),get('停止判定秒')),B:cmp('GTE',sub(timer(),get('右進行時刻')),get('停止判定秒'))}),DO0:set('異常停止',1)}),node('lab_wait',{}, {SECONDS:get('確認間隔')}));
    const loop=node('controls_whileUntil',{MODE:'WHILE'},{BOOL:node('logic_operation',{OP:'AND'},{A:cmp('LT',timer(),get('走行秒')),B:cmp('EQ',get('異常停止'),0)}),DO:chain(steps)});
    const alert=node('controls_if',{}, {IF0:cmp('EQ',get('異常停止'),1),DO0:chain([node('lab_light',{COLOR:'RED'}),node('lab_sound_tone',{VOLUME:25},{FREQUENCY:880,MS:500})])});
    return {variables:names.map(variable),blocks:{languageVersion:0,blocks:[start([pair(),node('lab_movement_stop'),node('lab_encoder_reset',{PORT:'B'}),node('lab_encoder_reset',{PORT:'C'}),set('走行秒',5),set('停止判定秒',1),set('確認間隔',.1),set('最小変化角',5),set('異常停止',0),set('左前回角度',node('lab_encoder',{PORT:'B'})),set('右前回角度',node('lab_encoder',{PORT:'C'})),set('左進行時刻',0),set('右進行時刻',0),node('lab_timer_reset'),node('lab_tank_run',{}, {LEFT_SPEED:20,RIGHT_SPEED:20}),loop,node('lab_movement_stop'),alert])]}};
  }
  if(name==='distanceLights')return {blocks:{languageVersion:0,blocks:[start([node('lab_distance_lights',{PORT:'C'},{BRIGHTNESS:100}),wait(1),node('lab_distance_lights',{PORT:'C'},{BRIGHTNESS:0})])]}};
  if(name==='gyroValues')return {blocks:{languageVersion:0,blocks:[start([node('lab_gyro_initialize',{}, {TIMEOUT:5}),node('controls_repeat_ext',{}, {TIMES:5,DO:chain([node('lab_display_number',{}, {VALUE:node('lab_angle',{AXIS:'0'})}),wait(.5)])})])]}};

  if(name==='gyroDrive')return {blocks:{languageVersion:0,blocks:[start([pair(),node('lab_geometry',{DIAMETER:56}),node('lab_ramp_distance',{PROFILE:'trapezoid'},{UP:20,DOWN:20}),node('lab_gyro_drive',{}, {SPEED:20,CM:50}),wait(1),node('lab_gyro_drive',{}, {SPEED:-20,CM:50})])]}};
  if(name==='gyroTurnRecord'){
    const names=['目標角度','実際の角度','角度誤差'];
    const variable=name=>({id:'gyro-'+names.indexOf(name),name});
    const get=name=>node('variables_get',{VAR:variable(name)});
    const set=(name,value)=>node('variables_set',{VAR:variable(name)},{VALUE:value});
    const subtract=(a,b)=>node('math_arithmetic',{OP:'MINUS'},{A:a,B:b});
    const record=(label,value)=>node('lab_log_value',{LABEL:label},{VALUE:value});
    const trial=chain([node('lab_yaw_reset'),wait(.1),node('lab_gyro_turn',{KIND:'pivot',DIRECTION:'1'},{ANGLE:get('目標角度'),SPEED:20}),wait(.2),set('実際の角度',subtract(0,node('lab_angle',{AXIS:'0'}))),set('角度誤差',subtract(get('実際の角度'),get('目標角度'))),record('target_deg',get('目標角度')),record('actual_deg',get('実際の角度')),record('error_deg',get('角度誤差')),wait(1)]);
    return {variables:names.map(variable),blocks:{languageVersion:0,blocks:[start([pair(),set('目標角度',90),node('lab_log_start',{NAME:'GyroTurn'}),node('controls_repeat_ext',{}, {TIMES:5,DO:trial}),node('lab_log_end')])]}};
  }
  if(name==='gyroTurn')return {blocks:{languageVersion:0,blocks:[start([pair(),node('lab_gyro_turn',{KIND:'pivot',DIRECTION:'1'},{ANGLE:90,SPEED:20}),wait(1),node('lab_gyro_turn',{KIND:'spin',DIRECTION:'-1'},{ANGLE:90,SPEED:20})])]}};
  if(name==='syncMotors')return {blocks:{languageVersion:0,blocks:[start([node('lab_motor_sync_setup',{FIRST:'A',FIRST_DIRECTION:'1',SECOND:'B',SECOND_DIRECTION:'-1'}),node('lab_motor_sync_angle',{}, {SPEED:20,DEGREES:90}),wait(1),node('lab_motor_sync_angle',{}, {SPEED:-20,DEGREES:90}),node('lab_motor_sync_stop',{MODE:'BRAKE'})])]}};
  if(name==='primarySchool01'||name==='primarySchool02')return structuredClone(PRIMARY_SCHOOL_WORKSPACES[name==='primarySchool01'?'Primary_School_01':'Primary_School_02']);
  if(name==='pidRecording'){
    const names=['反射光','PID出力','補正値','左速度','右速度'];
    const variable=name=>({id:'pid-'+names.indexOf(name),name});
    const get=name=>node('variables_get',{VAR:variable(name)});
    const set=(name,value)=>node('variables_set',{VAR:variable(name)},{VALUE:value});
    const limit=(value,low,high)=>node('math_constrain',{}, {VALUE:value,LOW:low,HIGH:high});
    const steps=[set('反射光',node('lab_reflection',{PORT:'F'})),set('PID出力',node('lab_pid',{NAME:'PID1'},{TARGET:66,MEASURED:get('反射光'),KP:.22,KI:0,KD:.002})),set('補正値',limit(get('PID出力'),-18,18)),set('左速度',limit(node('math_arithmetic',{OP:'ADD'},{A:18,B:get('補正値')}),0,36)),set('右速度',limit(node('math_arithmetic',{OP:'MINUS'},{A:18,B:get('補正値')}),0,36)),node('lab_tank_run',{}, {LEFT_SPEED:get('左速度'),RIGHT_SPEED:get('右速度')}),node('lab_log_pid',{}, {INTERVAL:100,REFLECTION:get('反射光'),OUTPUT:get('PID出力'),LEFT_SPEED:get('左速度'),RIGHT_SPEED:get('右速度')}),wait(.02)];
    return {variables:names.map(variable),blocks:{languageVersion:0,blocks:[start([node('lab_pair',{LEFT:'B',RIGHT:'A'}),node('lab_pid_reset',{NAME:'PID1'}),node('lab_log_start',{NAME:'LinePID'}),node('lab_timer_reset'),node('controls_whileUntil',{MODE:'UNTIL'},{BOOL:node('logic_compare',{OP:'GT'},{A:node('lab_timer'),B:3}),DO:chain(steps)}),node('lab_motor_group_stop',{PORTS:'A,B',MODE:'BRAKE'}),node('lab_log_end')])]}};
  }
  if(['syncNone','syncTrap','syncS'].includes(name)) {
    const profile={syncNone:'none',syncTrap:'trapezoid',syncS:'s'}[name],record={syncNone:'SyncNoneOn',syncTrap:'SyncTrapOn',syncS:'SyncSOn'}[name];
    return {blocks:{languageVersion:0,blocks:[start([node('lab_pair',{LEFT:'B',RIGHT:'A'}),node('lab_geometry',{DIAMETER:56}),node('lab_sync',{ENABLED:'TRUE'}),node('lab_ramp',{PROFILE:profile},{UP:1,DOWN:1}),node('lab_log_start',{NAME:record}),node('lab_log_motion',{}, {INTERVAL:100}),node('lab_drive_forward',{}, {SPEED:20,CM:30}),node('lab_movement_stop'),node('lab_log_end'),tone()])]}};
  }
  if(name==='lights')return {blocks:{languageVersion:0,blocks:[start([node('lab_display_clear'),pixel(100),wait(1),pixel(0),wait(1),node('lab_text',{}, {TEXT:{type:'text',fields:{TEXT:'HELLO'}}})])]}};
  if(name==='returns'||name==='multiReturns'){
    const outputs=name==='returns'?['平均']:['合計','差'];
    const a={type:'lab_argument',extraState:{name:'a',parameterId:'return-a'}},b={type:'lab_argument',extraState:{name:'b',parameterId:'return-b'}};
    const expression=op=>node('lab_op_'+op,{}, {A:structuredClone(a),B:structuredClone(b)});
    const def={type:'procedures_defreturn',fields:{NAME:name==='returns'?'平均を求める':'和と差'},x:480,y:60,extraState:{params:[{name:'a',id:'return-a'},{name:'b',id:'return-b'}],outputs},inputs:{RETURN:input(name==='returns'?node('lab_op_div',{}, {A:expression('add'),B:2}):expression('add')),...(outputs.length>1?{RETURN1:input(expression('sub'))}:{})}};
    const call={...node(outputs.length>1?'lab_call_outputs':'procedures_callreturn',outputs.length>1?{OUT0:{id:'return-sum',name:'合計'},OUT1:{id:'return-diff',name:'差'}}:{}, {ARG0:name==='returns'?440:8,ARG1:name==='returns'?880:5}),extraState:{name:def.fields.NAME,params:['a','b'],outputs,output:0}};
    const steps=outputs.length>1?[call,node('lab_display_number',{}, {VALUE:node('variables_get',{VAR:{id:'return-sum',name:'合計'}})}),wait(1),node('lab_display_number',{}, {VALUE:node('variables_get',{VAR:{id:'return-diff',name:'差'}})})]:[node('lab_tone_ms',{}, {FREQUENCY:call,MS:500,VOLUME:25})];
    return {blocks:{languageVersion:0,blocks:[start(steps),def]},variables:[{id:'return-a',name:'a'},{id:'return-b',name:'b'},...(outputs.length>1?[{id:'return-sum',name:'合計'},{id:'return-diff',name:'差'}]:[])]};
  }
  const blockList={
    syncGentle:[start([pair(),node('lab_geometry',{DIAMETER:56}),node('lab_minimum_speed',{}, {SPEED:8}),node('lab_sync',{ENABLED:'TRUE'}),node('lab_ramp_distance',{PROFILE:'s'},{UP:20,DOWN:20}),node('lab_log_start',{NAME:'Sync80On'}),node('lab_log_motion',{}, {INTERVAL:100}),drive(80,100),node('lab_movement_stop'),node('lab_log_end'),tone()])],
    distanceRamp:[start([pair(),node('lab_geometry',{DIAMETER:56}),node('lab_minimum_speed',{}, {SPEED:8}),node('lab_ramp_distance',{PROFILE:'trapezoid'},{UP:10,DOWN:10}),node('lab_log_start',{NAME:'RatioRamp'}),node('lab_log_motion',{}, {INTERVAL:200}),drive(50,100),node('lab_movement_stop'),node('lab_log_end'),tone()])],
    commonData:[start([node('lab_log_start',{NAME:'CommonData'}),node('lab_text_set',{NAME:'メッセージ'},{VALUE:node('lab_string_join',{}, {A:node('lab_string_literal',{TEXT:'こんにちは'}),B:node('lab_string_literal',{TEXT:'SPIKE'})})}),node('lab_log_value',{LABEL:'text'},{VALUE:node('lab_text_get',{NAME:'メッセージ'})}),node('lab_log_value',{LABEL:'length'},{VALUE:node('lab_string_length',{}, {VALUE:node('lab_text_get',{NAME:'メッセージ'})})}),node('lab_log_value',{LABEL:'remainder'},{VALUE:node('lab_data_mod',{}, {A:-5,B:3})}),node('lab_log_value',{LABEL:'rounded'},{VALUE:node('lab_data_round',{}, {A:-1.5})}),node('lab_log_end'),tone()])],
    recording:[start([node('lab_log_start',{NAME:'Record1'}),node('controls_repeat_ext',{}, {TIMES:10,DO:chain([node('lab_log_value',{LABEL:'time_s'},{VALUE:node('lab_timer')}),wait(.1)])}),node('lab_log_end'),node('lab_text',{}, {TEXT:{type:'text',fields:{TEXT:'DONE'}}})])],
    ramp:[start([pair(),node('lab_ramp',{PROFILE:'s'},{UP:1,DOWN:1}),node('lab_geometry',{DIAMETER:56}),drive(20,30),wait(1),drive(-20,30)])],
    battery:[start([node('lab_wait_until',{}, {BOOL:node('lab_button',{BUTTON:'LEFT'})}),node('lab_tone_ms',{}, {FREQUENCY:262,MS:1000,VOLUME:25}),node('lab_display_abacus',{}, {VALUE:node('lab_battery_voltage')})])],
    sound:[start([tone()])],
    absolute:[start([node('lab_motor_absolute',{PORT:'A',DIRECTION:'SHORTEST_PATH'},{SPEED:20,POSITION:0}),wait(1),node('lab_motor_absolute',{PORT:'A',DIRECTION:'CLOCKWISE'},{SPEED:20,POSITION:90}),wait(1),node('lab_motor_absolute',{PORT:'A',DIRECTION:'COUNTERCLOCKWISE'},{SPEED:20,POSITION:0})])],
    motor:[start([node('lab_motor_single_angle',{PORT:'A'},{SPEED:20,DEGREES:90}),wait(.5),node('lab_motor_single_angle',{PORT:'A'},{SPEED:-20,DEGREES:90})])],
    drive:[start([pair(),node('lab_geometry',{DIAMETER:56}),drive(20),wait(1),drive(-20)])],
    distance:[start([pair(),node('lab_tank_run',{}, {LEFT_SPEED:20,RIGHT_SPEED:20}),node('lab_wait_until',{}, {BOOL:node('logic_compare',{OP:'LT'},{A:node('lab_distance',{PORT:'D'}),B:15})}),node('lab_motor_group_stop',{PORTS:'ALL',MODE:'BRAKE'})])],
    turn:[start([pair(),node('lab_geometry',{DIAMETER:56}),node('lab_tread',{TREAD:112}),node('lab_spin_right',{},{SPEED:20,ANGLE:90}),wait(1),node('lab_pivot_left',{},{SPEED:20,ANGLE:90})])],
    color:[start([node('lab_wait_until',{}, {BOOL:node('lab_color_is',{PORT:'D',COLOR:'RED'})}),tone()])],
    variables:[start([node('variables_set',{VAR:{id:'count',name:'回数'}},{VALUE:0}),node('controls_repeat_ext',{}, {TIMES:3,DO:chain([node('math_change',{VAR:{id:'count',name:'回数'}},{DELTA:1}),node('lab_text',{}, {TEXT:node('variables_get',{VAR:{id:'count',name:'回数'}})}),wait(.5)])})])],
    myblock:[start([pair(),{...node('procedures_callnoreturn',{}, {ARG0:10}),extraState:{name:'前に進む',params:['距離']}}]),{...node('procedures_defnoreturn',{NAME:'前に進む'},{STACK:drive(20,node('variables_get',{VAR:{id:'distance-arg',name:'距離'}}))}),x:420,y:50,extraState:{params:[{name:'距離',id:'distance-arg'}]}}],
    parallel:[start([pair(),drive(20,30)]),start([node('controls_repeat_ext',{}, {TIMES:5,DO:chain([pixel(100),wait(.2),pixel(0),wait(.2)])})],450,50)],
    message:[start([wait(1),node('lab_broadcast',{MESSAGE:'合図'})]),{type:'lab_message_hat',fields:{MESSAGE:'合図'},x:450,y:50,next:{block:tone()}}]
  }[name];
  if(!blockList)throw Error('サンプルが見つかりません。');
  const result={blocks:{languageVersion:0,blocks:blockList}};
  if(name==='variables')result.variables=[{id:'count',name:'回数'}];
  if(name==='myblock')result.variables=[{id:'distance-arg',name:'距離'}];
  return result;
}
export const SAMPLE_NAMES={stallMonitor:'StallMonitor',distanceLights:'DistanceLights',gyroValues:'GyroValues',primarySchool01:'Primary_School_01',primarySchool02:'Primary_School_02',gyroDrive:'GyroStraight',gyroTurnRecord:'GyroTurnRecord',gyroTurn:'GyroTurn',pidRecording:'LinePID',commonData:'CommonData',syncGentle:'Sync80On',distanceRamp:'RatioRamp',syncNone:'SyncNoneOn',syncTrap:'SyncTrapOn',syncS:'SyncSOn',lights:'DisplayTest',sound:'SoundTest',motor:'MotorTest',syncMotors:'SyncMotors',absolute:'AbsoluteAngle',drive:'DriveTest',turn:'TurnTest',distance:'DistanceStop',color:'ColorSound',variables:'Variables',myblock:'MyBlock',parallel:'ParallelTest',message:'MessageTest',recording:'RecordingTest',ramp:'RampTest',battery:'BatteryAbacus',returns:'NumericReturn',multiReturns:'NamedReturns'};


