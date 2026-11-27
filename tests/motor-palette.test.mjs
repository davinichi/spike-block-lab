import {test} from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import * as Blockly from 'blockly';
import {pythonGenerator} from 'blockly/python';
import {setupClassroom,classroomToolbox} from './classroom-blocks.js';
import {classroomSample} from './classroom-samples.js';
import {generateStandard} from './standard.js';
import {validateProject} from './model.js';
setupClassroom(Blockly);
const items=classroomToolbox().contents.find(c=>c.name==='モーター').contents;
const newTypes=['l','m'].flatMap(k=>['single','pair'].flatMap(n=>['run','angle','rotation','time'].map(a=>'lab_motor_'+k+'_'+n+'_'+a)));
function sourceFor(block){const ws=new Blockly.Workspace();try{Blockly.serialization.workspaces.load({blocks:{languageVersion:0,blocks:[{type:'spike_start',next:{block}}]}},ws);return generateStandard(ws,pythonGenerator).source;}finally{ws.dispose();}}
function python(script,data){const p=spawnSync('python',['-c',script],{input:JSON.stringify(data),encoding:'utf8',env:{...process.env,PYTHONUTF8:'1'}});assert.equal(p.status,0,p.stderr);}
test('motor palette presents one L/M-neutral motor set and a separate direction-aware sync group',()=>{
 const types=items.filter(x=>x.kind==='block').map(x=>x.type);
 for(const action of ['run','angle','rotation','time'])assert.ok(types.includes('lab_motor_single_'+action));
 for(const action of ['setup','run','angle','rotation','time','stop'])assert.ok(types.includes('lab_motor_sync_'+action));
 assert.ok(!types.some(x=>/^lab_motor_[lm]_/.test(x)||/^lab_motor_pair_/.test(x)));
 assert.ok(types.includes('lab_motor_absolute')&&types.includes('lab_motor_single_stop'));
 assert.ok(types.length<25);
});

test('new and legacy motor instructions retain ports and code through project save/load',()=>{
 for(const type of [...newTypes,...['single','pair'].flatMap(n=>['run','angle','rotation','time'].map(a=>'lab_motor_'+n+'_'+a)),'lab_motor_absolute','lab_motors_stop']){
  const ws=new Blockly.Workspace(),again=new Blockly.Workspace();try{
   const entry=items.find(x=>x.type===type)??{type,inputs:{SPEED:{shadow:{type:'math_number',fields:{NUM:-20}}},DEGREES:{shadow:{type:'math_number',fields:{NUM:90}}},ROTATIONS:{shadow:{type:'math_number',fields:{NUM:1}}},SECONDS:{shadow:{type:'math_number',fields:{NUM:1}}}}};
   const probe=ws.newBlock(type);for(const key of Object.keys(entry.inputs??{}))if(!probe.getInput(key))delete entry.inputs[key];probe.dispose();
   Blockly.serialization.workspaces.load({blocks:{languageVersion:0,blocks:[{type:'spike_start',next:{block:entry}}]}},ws);
   const code=generateStandard(ws,pythonGenerator).source;
   const project={format:'spike-block-lab',version:1,name:'Motors',language:'standard',workspace:Blockly.serialization.workspaces.save(ws)};validateProject(project);
   Blockly.serialization.workspaces.load(JSON.parse(JSON.stringify(project.workspace)),again);
   assert.equal(generateStandard(again,pythonGenerator).source,code,type);
   const b=again.getAllBlocks(false).find(b=>b.type===type);
   if(newTypes.includes(type))assert.equal(b.getFieldValue('PORTS'),type.includes('_pair_')?'B,C':type.includes('_l_')?'B':'A');
  }finally{ws.dispose();again.dispose();}
 }
});
test('new L/M blocks detect motor/sensor port conflicts',()=>{
 for(const type of newTypes) {
  const entry={type,inputs:{SPEED:{shadow:{type:'math_number',fields:{NUM:20}}},...Object.fromEntries((type.endsWith('_run')?[]:[type.endsWith('_angle')?'DEGREES':type.endsWith('_rotation')?'ROTATIONS':'SECONDS']).map(k=>[k,{shadow:{type:'math_number',fields:{NUM:1}}}]))}};entry.fields={PORTS:type.includes('_pair_')?'A,B':'A'};
  entry.next={block:{type:'lab_log_value',fields:{LABEL:'distance'},inputs:{VALUE:{block:{type:'lab_distance',fields:{PORT:'A'}}}}}};
  assert.throws(()=>sourceFor(entry),/違う種類の機器/,type);
 }
});
test('absolute position uses strict SPIKE API directions, speed, stop mode and completion checks',()=>{
 const ws=new Blockly.Workspace();let code;try{Blockly.serialization.workspaces.load(classroomSample('absolute'),ws);code=generateStandard(ws,pythonGenerator).source;}finally{ws.dispose();}
 python(`import json,sys,types,time,asyncio
source=json.load(sys.stdin)
for name in ['runloop','motor','motor_pair','distance_sensor','color_sensor','force_sensor','color','hub']:sys.modules[name]=types.ModuleType(name)
hub=sys.modules['hub'];hub.port=types.SimpleNamespace(**{c:i for i,c in enumerate('ABCDEF')});hub.sound=types.SimpleNamespace(stop=lambda:None)
hub.light_matrix=hub.light=hub.button=hub.motion_sensor=types.SimpleNamespace()
motor=sys.modules['motor'];motor.READY=0;motor.BRAKE=1;motor.HOLD=2;motor.SHORTEST_PATH=10;motor.CLOCKWISE=11;motor.COUNTERCLOCKWISE=12
seen=[];stops=[];result=[0]
motor.stop=lambda p,**k:stops.append(p)
async def absolute(p,position,velocity,*,direction,stop):
    assert isinstance(position,int) and 0<=position<=359
    assert 0<velocity<=1050
    assert direction in [10,11,12]
    seen.append((p,position,velocity,direction,stop));return result[0]
motor.run_to_absolute_position=absolute
sys.modules['runloop'].run=lambda *tasks:[t.close() for t in tasks]
time.ticks_ms=lambda:0;time.ticks_diff=lambda a,b:a-b
scope={};exec(source,scope)
fn=scope['_lab_motor_absolute'];active=scope['_lab_active_motors'];active[0]={'bounded':False};active[1]={'bounded':False};stops.clear()
for direction in [10,11,12]:asyncio.run(fn(0,20,359,direction))
assert seen==[(0,359,210,d,1) for d in [10,11,12]],seen
for direction in [10,11,12]:
    angle_from_variable=360
    asyncio.run(fn(0,20,angle_from_variable,direction))
assert seen[-3:]==[(0,0,210,d,1) for d in [10,11,12]],seen
asyncio.run(fn(0,20,360.0,10));assert seen[-1][1]==0
assert stops==[0] and 0 not in active and 1 in active,(stops,active)
scope['_lab_stop_modes'][0]=2;asyncio.run(fn(0,100,0,10));assert seen[-1]==(0,0,1050,10,2)
asyncio.run(fn(0,150,0,10));assert seen[-1]==(0,0,1050,10,2)
for speed,angle,direction in [(0,0,10),(-20,0,10),(20,-1,10),(20,361,10),(20,360.5,10),(20,1.5,10),(20,0,13),(float('nan'),0,10)]:
    before=len(seen)
    try:asyncio.run(fn(0,speed,angle,direction));raise AssertionError((speed,angle,direction))
    except ValueError:pass
    assert len(seen)==before
active[0]={'bounded':True}
try:asyncio.run(fn(0,20,90,10));raise AssertionError('accepted overlapping motion')
except ValueError:pass
active.pop(0);result[0]=3
try:asyncio.run(fn(0,20,90,10));raise AssertionError('accepted failed move')
except RuntimeError:pass
`,code);
});
test('stop-all stops only motors and does not close recordings or stop sound',()=>{
 const code=sourceFor({type:'lab_motors_stop'}),body=code.split('async def _lab_task_0():')[1].split('try:')[0];
 assert.equal((body.match(/_lab_stop_port\(/g)??[]).length,6);
 assert.ok(!/sound|_lab_stop_all|_lab_log_end/.test(body));
});


test('minimum speed setting survives save/load and emits validated shared configuration',()=>{
 const ws=new Blockly.Workspace(),again=new Blockly.Workspace();try{
  Blockly.serialization.workspaces.load({blocks:{languageVersion:0,blocks:[{type:'spike_start',next:{block:{type:'lab_minimum_speed',inputs:{SPEED:{shadow:{type:'math_number',fields:{NUM:12}}}}}}}]}},ws);
  const project={format:'spike-block-lab',version:1,name:'Minimum',language:'standard',workspace:Blockly.serialization.workspaces.save(ws)};
  validateProject(project);Blockly.serialization.workspaces.load(JSON.parse(JSON.stringify(project.workspace)),again);
  const code=generateStandard(ws,pythonGenerator).source;
  assert.equal(generateStandard(again,pythonGenerator).source,code);
  assert.match(code,/_lab_motion_config\['minimum'\] = _lab_range\(12, 1, 100\)/);
 }finally{ws.dispose();again.dispose();}
});


test('distance percentage block retains named inputs and profile across save/load',()=>{
 const ws=new Blockly.Workspace(),again=new Blockly.Workspace();try{
  Blockly.serialization.workspaces.load(classroomSample('distanceRamp'),ws);
  const project={format:'spike-block-lab',version:1,name:'RatioRamp',language:'standard',workspace:Blockly.serialization.workspaces.save(ws)};
  validateProject(project);Blockly.serialization.workspaces.load(JSON.parse(JSON.stringify(project.workspace)),again);
  const code=generateStandard(ws,pythonGenerator).source;
  assert.equal(generateStandard(again,pythonGenerator).source,code);
  assert.match(code,/_lab_set_distance_ramp\('trapezoid', 10, 10\)/);
  const b=again.getAllBlocks(false).find(b=>b.type==='lab_ramp_distance');
  for(const key of ['UP','DOWN'])assert.equal(b.getInputTargetBlock(key).getFieldValue('NUM'),10);
 }finally{ws.dispose();again.dispose();}
});
