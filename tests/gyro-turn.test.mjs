import {test} from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import * as Blockly from 'blockly';
import {pythonGenerator} from 'blockly/python';
import {setupClassroom,classroomToolbox} from './classroom-blocks.js';
import {classroomSample} from './classroom-samples.js';
import {generateStandard} from './standard.js';
import {validateProject} from './model.js';
import {GYRO_TURN_RUNTIME} from './gyro-turn.js';
setupClassroom(Blockly);
test('gyro turn is in movement, preserves fields/expressions on reload, requires ordered motor configuration',()=>{
 const category=classroomToolbox().contents.find(c=>c.name==='動き');
 assert.equal(category.contents.filter(b=>b.type==='lab_gyro_turn').length,1);
 const ws=new Blockly.Workspace(),again=new Blockly.Workspace();try{
  Blockly.serialization.workspaces.load(classroomSample('gyroTurn'),ws);
  for(const kind of ['pivot','spin'])for(const direction of ['1','-1']){
   const turn=ws.getAllBlocks(false).find(b=>b.type==='lab_gyro_turn');turn.setFieldValue(kind,'KIND');turn.setFieldValue(direction,'DIRECTION');
   const source=generateStandard(ws,pythonGenerator).source;
   assert.ok(source.includes(`await _lab_gyro_turn('${kind}', ${direction}, 90, 20)`));
   const project={format:'spike-block-lab',version:1,name:'gyro',language:'standard',workspace:Blockly.serialization.workspaces.save(ws)};
   validateProject(project);again.clear();Blockly.serialization.workspaces.load(JSON.parse(JSON.stringify(project.workspace)),again);
   assert.equal(generateStandard(again,pythonGenerator).source,source);
  }
  const pair=ws.getAllBlocks(false).find(b=>b.type==='lab_pair');pair.dispose(true);
  assert.throws(()=>generateStandard(ws,pythonGenerator),/モーター.*設定/);
 }finally{ws.dispose();again.dispose();}
});
function simulate(body){
 const result=spawnSync('python',['-'],{encoding:'utf8',input:`import asyncio,types,math
${GYRO_TURN_RUNTIME}
clock=[0];heading=[170.0];commands={0:0,1:0};actual={0:0.,1:0.};calls=[];reads=[0];fault=[False];frozen=[False]
_lab_active_motors={};_lab_motion_config={'minimum':8};sleep_hook=[None]
def _lab_range(x,a,b):
    if not isinstance(x,(int,float)) or not a<=x<=b:raise ValueError('range')
    return x
def _lab_speed_percent(x):
    if not isinstance(x,(int,float)) or not math.isfinite(x):raise ValueError('speed')
    return max(-100,min(100,x))
def _lab_speed(x):return int(_lab_speed_percent(x)*10.5)
def _lab_motion_ports():return (0,1)
def _lab_stop_port(p,mode):_lab_active_motors.pop(p,None);commands[p]=0;calls.append(('stop',p))
def yaw():
    reads[0]+=1
    if fault[0] and reads[0]>4:raise OSError('gyro failed')
    return (round(((heading[0]+180)%360-180)*10),0,0)
def run(p,v):commands[p]=v;calls.append(('run',p,v))
def stop(p,stop=None):commands[p]=0
async def sleep(ms):
    clock[0]+=ms
    for p in commands:actual[p]+=(commands[p]-actual[p])*min(1,ms/60)
    if not frozen[0]:heading[0]+=(actual[0]+actual[1])*.25*ms/1000
    if sleep_hook[0]:sleep_hook[0]()
    await asyncio.sleep(0)
time=types.SimpleNamespace(ticks_ms=lambda:clock[0],ticks_diff=lambda a,b:a-b)
motion_sensor=types.SimpleNamespace(tilt_angles=yaw)
motor=types.SimpleNamespace(run=run,stop=stop,relative_position=lambda p:0,BRAKE=1)
runloop=types.SimpleNamespace(sleep_ms=sleep)
${body}`});
 assert.equal(result.status,0,result.stderr||String(result.error));
}
test('both gyro turn modes and directions decelerate, wrap yaw, complete sequentially, and brake both motors',()=>simulate(`
for kind in ['pivot','spin']:
 for direction in [-1,1]:
  for angle in [0,45,90,180,360,720]:
   for speed in [8,20,120]:
    commands.update({0:0,1:0});actual.update({0:0,1:0});heading[0]=170;calls.clear()
    asyncio.run(_lab_gyro_turn(kind,direction,angle,speed))
    measured=-(heading[0]-170)*direction
    assert abs(measured-angle)<5,(kind,direction,angle,speed,measured)
    assert commands[0]==commands[1]==0 and not _lab_active_motors
    moving=[c for c in calls if c[0]=='run']
    assert all(abs(c[2])<=1050 for c in moving)
    if kind=='pivot':assert all(c[1]==(0 if direction>0 else 1) for c in moving)
    if angle>=90 and speed>=20:assert abs(moving[-1][2])<max(abs(c[2]) for c in moving)
`));
test('gyro faults, stationary hub, invalid inputs and concurrent changes cannot leave motors running',()=>simulate(`
for kind,direction,angle,speed in [('spin',1,-1,20),('pivot',1,90,0),('spin',1,90,-1),('spin',1,float('nan'),20),('spin',1,90,float('inf'))]:
 try:asyncio.run(_lab_gyro_turn(kind,direction,angle,speed));assert False
 except ValueError:pass
 assert not any(commands.values())
fault[0]=True
try:asyncio.run(_lab_gyro_turn('spin',1,90,20));assert False
except OSError:pass
assert not any(commands.values()) and not _lab_active_motors
fault[0]=False;frozen[0]=True
try:asyncio.run(_lab_gyro_turn('spin',1,90,20));assert False
except RuntimeError as e:assert 'stalled' in str(e)
assert clock[0]<4000 and not any(commands.values())
frozen[0]=False
def interrupt():_lab_active_motors.pop(0,None)
sleep_hook[0]=interrupt
try:asyncio.run(_lab_gyro_turn('pivot',-1,90,20));assert False
except RuntimeError as e:assert 'interrupted' in str(e)
assert not any(commands.values()) and not _lab_active_motors
sleep_hook[0]=None
_lab_active_motors[0]={'bounded':True}
try:asyncio.run(_lab_gyro_turn('spin',1,90,20));assert False
except ValueError:pass
`));
