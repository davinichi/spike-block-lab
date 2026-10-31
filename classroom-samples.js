import {sampleWorkspace} from './blocks.js';
const num=n=>({type:'math_number',fields:{NUM:n}});
const input=block=>({block});
const node=(type,fields={},inputs={})=>({type,fields,inputs:Object.fromEntries(Object.entries(inputs).map(([k,v])=>[k,input(typeof v==='number'?num(v):v)]))});
function chain(nodes){let next;for(const b of [...nodes].reverse())next={...b,...(next?{next:{block:next}}:{})};return next;}
const start=(nodes,x=50,y=40)=>({type:'spike_start',x,y,next:{block:chain(nodes)}});
const image=name=>node('spike_image',{IMAGE:name});
const wait=seconds=>node('lab_wait',{}, {SECONDS:seconds});
const tone=()=>node('lab_tone_ms',{}, {FREQUENCY:440,MS:300,VOLUME:25});
const pair=()=>node('lab_pair',{LEFT:'B',RIGHT:'C'});
const drive=(speed,amount=10)=>node(speed<0?'lab_drive_backward':'lab_drive_forward',{PORTS:'B,C'},{SPEED:Math.abs(speed),CM:amount});
export function classroomSample(name) {
  if(name==='lights')return sampleWorkspace('lights');
  const blockList={
    recording:[start([node('lab_log_start',{NAME:'Record1'}),node('controls_repeat_ext',{}, {TIMES:10,DO:chain([node('lab_log_value',{LABEL:'time_s'},{VALUE:node('lab_timer')}),wait(.1)])}),node('lab_log_end'),node('lab_text',{}, {TEXT:{type:'text',fields:{TEXT:'DONE'}}})])],
    ramp:[start([node('lab_ramp',{PROFILE:'s'},{UP:1,DOWN:1}),node('lab_geometry',{DIAMETER:56}),drive(20,30),wait(1),drive(-20,30)])],
    sound:[start([tone()])],
    motor:[start([node('lab_motor_single_angle',{PORT:'A'},{SPEED:20,DEGREES:90}),wait(.5),node('lab_motor_single_angle',{PORT:'A'},{SPEED:-20,DEGREES:90})])],
    drive:[start([node('lab_geometry',{DIAMETER:56}),drive(20),wait(1),drive(-20)])],
    distance:[start([node('lab_tank_run',{LEFT:'B',RIGHT:'C'}, {LEFT_SPEED:20,RIGHT_SPEED:20}),node('lab_wait_until',{}, {BOOL:node('logic_compare',{OP:'LT'},{A:node('lab_distance',{PORT:'D'}),B:15})}),node('lab_motor_group_stop',{PORTS:'ALL',MODE:'BRAKE'})])],
    turn:[start([node('lab_geometry',{DIAMETER:56}),node('lab_tread',{TREAD:112}),node('lab_spin_right',{LEFT:'B',RIGHT:'C'},{SPEED:20,ANGLE:90}),wait(1),node('lab_pivot_left',{LEFT:'B',RIGHT:'C'},{SPEED:20,ANGLE:90})])],
    color:[start([node('lab_wait_until',{}, {BOOL:node('lab_color_is',{PORT:'D',COLOR:'RED'})}),tone()])],
    variables:[start([node('variables_set',{VAR:{id:'count',name:'回数'}},{VALUE:0}),node('controls_repeat_ext',{}, {TIMES:3,DO:chain([node('math_change',{VAR:{id:'count',name:'回数'}},{DELTA:1}),node('lab_text',{}, {TEXT:node('variables_get',{VAR:{id:'count',name:'回数'}})}),wait(.5)])})])],
    myblock:[start([{...node('procedures_callnoreturn',{}, {ARG0:10}),extraState:{name:'前に進む',params:['距離']}}]),{...node('procedures_defnoreturn',{NAME:'前に進む'},{STACK:drive(20,node('variables_get',{VAR:{id:'distance-arg',name:'距離'}}))}),x:420,y:50,extraState:{params:[{name:'距離',id:'distance-arg'}]}}],
    parallel:[start([drive(20,30)]),start([node('controls_repeat_ext',{}, {TIMES:5,DO:chain([image('heart'),wait(.2),image('smile'),wait(.2)])})],450,50)],
    message:[start([wait(1),node('lab_broadcast',{MESSAGE:'合図'})]),{type:'lab_message_hat',fields:{MESSAGE:'合図'},x:450,y:50,next:{block:tone()}}]
  }[name];
  if(!blockList)throw Error('サンプルが見つかりません。');
  const result={blocks:{languageVersion:0,blocks:blockList}};
  if(name==='variables')result.variables=[{id:'count',name:'回数'}];
  if(name==='myblock')result.variables=[{id:'distance-arg',name:'距離'}];
  return result;
}
export const SAMPLE_NAMES={lights:'DisplayTest',sound:'SoundTest',motor:'MotorTest',drive:'DriveTest',turn:'TurnTest',distance:'DistanceStop',color:'ColorSound',variables:'Variables',myblock:'MyBlock',parallel:'ParallelTest',message:'MessageTest',recording:'RecordingTest',ramp:'RampTest'};


