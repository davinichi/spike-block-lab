import {test} from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import * as Blockly from 'blockly';
import {pythonGenerator} from 'blockly/python';
import {setupClassroom} from './classroom-blocks.js';
import {classroomSample,SAMPLE_NAMES} from './classroom-samples.js';
import {generateStandard} from './standard.js';
import {saveMyBlock} from './myblocks.js';
import {validateProject} from './model.js';
import {EXTRA_RUNTIME} from './enhancements.js';
import {MOTOR_SYNC_RUNTIME} from './motor-sync.js';
setupClassroom(Blockly);
const n=NUM=>({shadow:{type:'math_number',fields:{NUM}}});
const config=(a='A',b='B',ad='1',bd='-1')=>({type:'lab_motor_sync_setup',fields:{FIRST:a,SECOND:b,FIRST_DIRECTION:ad,SECOND_DIRECTION:bd}});
const chain=nodes=>nodes.reduceRight((next,b)=>({...b,...(next?{next:{block:next}}:{})}),null);
function generate(nodes){const ws=new Blockly.Workspace();try{Blockly.serialization.workspaces.load({blocks:{languageVersion:0,blocks:[{type:'spike_start',next:{block:chain(nodes)}}]}},ws);return generateStandard(ws,pythonGenerator);}finally{ws.dispose();}}
function python(body){const runtime=EXTRA_RUNTIME.replace('_lab_native_drive = _lab_drive','_lab_native_drive = None').replace('_lab_native_turn = _lab_turn','_lab_native_turn = None').replace('_lab_native_pair = _lab_pair','_lab_native_pair = None');
 const p=spawnSync('python',['-'],{input:`import asyncio,types,math
${runtime}
${MOTOR_SYNC_RUNTIME}
def _lab_range(x,a,b):
    if not isinstance(x,(int,float)) or not a<=x<=b:raise ValueError()
    return x
def _lab_positive(x,b):return _lab_range(x,.001,b)
def _lab_speed_percent(x):
    if not isinstance(x,(int,float)) or not math.isfinite(x):raise ValueError()
    return max(-100,min(100,x))
def _lab_speed(x):return int(_lab_speed_percent(x)*10.5)
clock=[0];positions={p:0.0 for p in range(6)};velocities={p:0 for p in range(6)};calls=[]
def run(p,v):velocities[p]=v;calls.append(('run',p,v))
def stop(p,stop=None):velocities[p]=0;calls.append(('stop',p,stop))
def read(p):return round(positions[p])
motor=types.SimpleNamespace(run=run,stop=stop,relative_position=read,BRAKE=1,COAST=2,HOLD=3)
time=types.SimpleNamespace(ticks_ms=lambda:clock[0],ticks_diff=lambda a,b:a-b)
async def sleep(ms):
    clock[0]+=ms
    for p in positions:positions[p]+=velocities[p]*ms/1000*(.98 if p==1 else 1)
    await asyncio.sleep(0)
runloop=types.SimpleNamespace(sleep_ms=sleep)
_lab_capture_motion=lambda:None
${body}`,encoding:'utf8',env:{...process.env,PYTHONUTF8:'1'}});assert.equal(p.status,0,p.stderr||String(p.error));}

test('sync blocks preserve independent directions, inputs and settings through project JSON',()=>{
 for(const ad of ['1','-1'])for(const bd of ['1','-1']){
  const ws=new Blockly.Workspace(),again=new Blockly.Workspace();try{
   Blockly.serialization.workspaces.load(classroomSample('syncMotors'),ws);
   const setup=ws.getAllBlocks(false).find(b=>b.type==='lab_motor_sync_setup');setup.setFieldValue(ad,'FIRST_DIRECTION');setup.setFieldValue(bd,'SECOND_DIRECTION');
   const before=generateStandard(ws,pythonGenerator).source;
   const project={format:'spike-block-lab',version:1,name:SAMPLE_NAMES.syncMotors,language:'standard',workspace:Blockly.serialization.workspaces.save(ws)};
   validateProject(project);Blockly.serialization.workspaces.load(JSON.parse(JSON.stringify(project.workspace)),again);
   assert.equal(generateStandard(again,pythonGenerator).source,before);
   assert.ok(before.includes(`_lab_set_sync_motors(port.A, ${ad}, port.B, ${bd})`));
  }finally{ws.dispose();again.dispose();}
 }
});

test('sync configuration is mandatory, checks every conditional path, and rejects duplicate or sensor ports',()=>{
 const move={type:'lab_motor_sync_angle',inputs:{SPEED:n(20),DEGREES:n(90)}};
 assert.throws(()=>generate([move]),/同期.*設定/);
 assert.throws(()=>generate([config('A','A'),move]),/違う2個/);
 assert.throws(()=>generate([config(),{type:'lab_text',inputs:{TEXT:{block:{type:'lab_distance',fields:{PORT:'A'}}}}}]),/違う種類/);
 assert.throws(()=>generate([{type:'controls_if',inputs:{IF0:{shadow:{type:'logic_boolean',fields:{BOOL:'TRUE'}}},DO0:{block:config()}}},move]),/同期.*設定/);
 assert.ok(generate([config(),move]).source.includes('await _lab_sync_move(20, 90'));
});

test('finite synchronization uses both configured directions and a local forced-sync option for every unit',()=>{
 python(`original=_lab_sync_command;enabled=[]
def track(s,n,a,on,*args):enabled.append(on);return original(s,n,a,on,*args)
_lab_sync_command=track
for unit,amount in [('angle',90),('rotation',.25),('time',.3)]:
 for da in [-1,1]:
  for db in [-1,1]:
   for speed in [-120,20]:
    _lab_motion_config.update({'profile':'none','sync':False})
    _lab_set_sync_motors(0,da,1,db);start=dict(positions);enabled.clear();calls.clear()
    asyncio.run(_lab_sync_move(speed,amount,unit))
    signs=[1 if speed*da>0 else -1,1 if speed*db>0 else -1]
    for p,sign in enumerate(signs):
        assert (positions[p]-start[p])*sign>0,(unit,da,db,speed,positions,start)
    assert enabled and all(enabled)
    assert _lab_motion_config['sync'] is False and not _lab_active_motors
    assert all(abs(c[2])<=1050 for c in calls if c[0]=='run')
    assert velocities[0]==velocities[1]==0
`);
});

test('continuous sync retains anchors on repeated calls, survives waits, and releases the partner after an individual command',()=>{
 python(`_lab_motion_config['sync']=False
_lab_pair_ports=(4,5)
_lab_set_sync_motors(0,1,1,-1)
assert _lab_pair_ports==(4,5)
_lab_sync_run(20);first=_lab_active_motors[0];group=first['group'];positions[0]=30
_lab_sync_run(20);assert _lab_active_motors[0] is first
async def check():
    global _lab_task_count
    _lab_task_count=[1]
    service=asyncio.create_task(_lab_service())
    for _ in range(40):await asyncio.sleep(0)
    assert first['sync_reduction']>0 and velocities[0]>0 and velocities[1]<0
    assert _lab_active_motors[0] is first
    _lab_start_velocities((0,),(100,))
    for _ in range(3):await asyncio.sleep(0)
    assert 1 not in _lab_active_motors and velocities[1]==0
    assert velocities[0]==100
    _lab_task_count[0]=0;await service
asyncio.run(check())
_lab_sync_run(0);assert velocities[0]==velocities[1]==0
`);
});

test('reconfiguration and dedicated stop affect only their motors and validate before changing settings',()=>{
 python(`_lab_set_sync_motors(0,1,1,-1);_lab_sync_run(20);old=_lab_sync_motors
for args in [(0,1,0,1),(0,0,1,1),(0,1,9,1)]:
    calls.clear()
    try:_lab_set_sync_motors(*args);raise AssertionError('invalid setup accepted')
    except (ValueError,KeyError):pass
    assert _lab_sync_motors==old and not calls
_lab_set_sync_motors(2,-1,3,1);assert velocities[0]==velocities[1]==0
_lab_sync_run(-30);_lab_change_speed(2,40)
assert velocities[3]==0 and not _lab_active_motors[2].get('mechanism_sync')
_lab_sync_run(-30);_lab_start_velocities((4,),(100,));_lab_sync_stop(motor.HOLD)
assert velocities[2]==velocities[3]==0 and velocities[4]==100
assert ('stop',2,motor.HOLD) in calls and ('stop',3,motor.HOLD) in calls
`);
});

test('sync settings inside a My Block remain effective for subsequent calls and survive save/load',()=>{
 const ws=new Blockly.Workspace(),again=new Blockly.Workspace();try{
  const def=saveMyBlock(Blockly,ws,'同期設定',[]);
  const setup=Blockly.serialization.blocks.append(config('C','D','-1','1'),ws);def.getInput('STACK').connection.connect(setup.previousConnection);
  const call=Blockly.serialization.blocks.append({type:'procedures_callnoreturn',extraState:{name:'同期設定',params:[]},next:{block:{type:'lab_motor_sync_rotation',inputs:{SPEED:n(20),ROTATIONS:n(.25)}}}},ws);
  const start=ws.newBlock('spike_start');start.nextConnection.connect(call.previousConnection);
  const code=generateStandard(ws,pythonGenerator).source;
  Blockly.serialization.workspaces.load(JSON.parse(JSON.stringify(Blockly.serialization.workspaces.save(ws))),again);
  assert.equal(generateStandard(again,pythonGenerator).source,code);
  assert.ok(code.includes('_lab_set_sync_motors(port.C, -1, port.D, 1)'));
  assert.ok(code.includes('await _lab_sync_move(20, 0.25'));
 }finally{ws.dispose();again.dispose();}
});
