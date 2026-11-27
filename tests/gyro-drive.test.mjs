import {test} from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import * as Blockly from 'blockly';
import {pythonGenerator} from 'blockly/python';
import {setupClassroom,classroomToolbox} from './classroom-blocks.js';
import {classroomSample} from './classroom-samples.js';
import {generateStandard} from './standard.js';
import {EXTRA_RUNTIME} from './enhancements.js';
import {GYRO_TURN_RUNTIME} from './gyro-turn.js';
import {SHARED_RUNTIME} from './shared-groups.js';
setupClassroom(Blockly);
function source(name){const ws=new Blockly.Workspace();try{Blockly.serialization.workspaces.load(classroomSample(name),ws);return generateStandard(ws,pythonGenerator).source;}finally{ws.dispose();}}
test('gyro straight and recording samples round trip with ordered motion settings and intact numeric inputs',()=>{
 assert.ok(classroomToolbox().contents.find(c=>c.name==='動き').contents.some(b=>b.type==='lab_gyro_drive'));
 for(const name of ['gyroDrive','gyroTurnRecord']){
  const ws=new Blockly.Workspace(),again=new Blockly.Workspace();try{
   Blockly.serialization.workspaces.load(classroomSample(name),ws);
   const before=generateStandard(ws,pythonGenerator).source;
   Blockly.serialization.workspaces.load(JSON.parse(JSON.stringify(Blockly.serialization.workspaces.save(ws))),again);
   assert.equal(generateStandard(again,pythonGenerator).source,before);
   if(name==='gyroDrive'){
    assert.ok(before.includes('await _lab_gyro_drive(-20, 50)'));
    ws.getAllBlocks(false).find(b=>b.type==='lab_pair').dispose(true);
    assert.throws(()=>generateStandard(ws,pythonGenerator),/モーター.*設定/);
   }
  }finally{ws.dispose();again.dispose();}
 }
});
const runtime=EXTRA_RUNTIME.replace('_lab_native_drive = _lab_drive','_lab_native_drive = None').replace('_lab_native_turn = _lab_turn','_lab_native_turn = None').replace('_lab_native_pair = _lab_pair','_lab_native_pair = None');
function simulate(body){const p=spawnSync('python',['-'],{input:`import asyncio,types,math,ast,json
${runtime}
${GYRO_TURN_RUNTIME}
${SHARED_RUNTIME}
def _lab_range(x,a,b):
    if not isinstance(x,(int,float)) or not a<=x<=b:raise ValueError('range')
    return x
def _lab_positive(x,b):return _lab_range(x,.001,b)
def _lab_speed_percent(x):
    if not isinstance(x,(int,float)) or not math.isfinite(x):raise ValueError('speed')
    return max(-100,min(100,x))
def _lab_speed(x):return int(_lab_speed_percent(x)*10.5)
def _lab_require_pair():pass
_lab_pair_ports=(0,1);_lab_wheel=56
clock=[0];positions={0:0.,1:0.};commands={0:0,1:0};actual={0:0.,1:0.};heading=[175.];max_error=[0];origin=[175.];gain={0:1.,1:.92};calls=[];fault=[False];stuck=[False];hook=[None];read_count=[0];stops=[]
def yaw():
    read_count[0]+=1
    if fault[0] and read_count[0]>4:raise OSError('gyro read failed')
    return (round(((heading[0]+180)%360-180)*10),0,0)
def run(p,v):commands[p]=v;calls.append((clock[0],p,v))
def stop(p,stop=None):commands[p]=0;stops.append(p)
def position(p):return round(positions[p])
async def sleep(ms):
    clock[0]+=ms
    for p in actual:
        desired=0 if stuck[0] and p==1 else commands[p]*gain[p]
        actual[p]+=(desired-actual[p])*min(1,ms/60)
        positions[p]+=actual[p]*ms/1000
    heading[0]+=(actual[0]+actual[1])*.25*ms/1000
    max_error[0]=max(max_error[0],abs(heading[0]-origin[0]))
    if hook[0]:hook[0]()
    await asyncio.sleep(0)
time=types.SimpleNamespace(ticks_ms=lambda:clock[0],ticks_diff=lambda a,b:a-b)
motion_sensor=types.SimpleNamespace(tilt_angles=yaw)
motor=types.SimpleNamespace(run=run,stop=stop,relative_position=position,BRAKE=1,COAST=2,HOLD=3)
runloop=types.SimpleNamespace(sleep_ms=sleep)
_lab_capture_motion=lambda:None
def reset():
    _lab_active_motors.clear();positions.update({0:0.,1:0.});commands.update({0:0,1:0});actual.update({0:0.,1:0.});heading[0]=175.;origin[0]=175.;max_error[0]=0;calls.clear();stops.clear();clock[0]=0;read_count[0]=0
${body}`,encoding:'utf8',env:{...process.env,PYTHONUTF8:'1'}});assert.equal(p.status,0,p.stderr||String(p.error));return p.stdout;}
test('gyro heading feedback reduces unequal-motor drift for forward/reverse and honors ramps, speed floor and distance',()=>{
 simulate(`
for speed in [8,20,80,-8,-20,-80,120,-120]:
 for profile,basis in [('none','time'),('trapezoid','time'),('s','time'),('trapezoid','distance'),('s','distance')]:
  reset();_lab_motion_config.update({'profile':profile,'basis':basis,'up':.5,'down':.5,'distance_up':20,'distance_down':20,'sync':True,'minimum':8})
  asyncio.run(_lab_gyro_drive(speed,100))
  distance=(-positions[0]+positions[1])*(1 if speed>0 else -1)/2*math.pi*56/3600
  assert 99.8<=distance<=104,(speed,profile,basis,distance)
  assert abs(heading[0]-175)<5,(speed,profile,basis,heading)
  assert max_error[0]<6,(speed,profile,basis,max_error)
  assert not _lab_active_motors and commands[0]==commands[1]==0
  assert _lab_motion_config['sync'] is True
  assert all(v*(-1 if p==0 else 1)*(1 if speed>0 else -1)>0 and abs(v)<=1050 for t,p,v in calls)
  assert min(abs(v) for t,p,v in calls)>=83,(speed,profile,basis)
  if profile!='none':assert max(abs(v) for t,p,v in calls)>abs(calls[-1][2]) or abs(speed)==8
reset();_lab_motion_config['profile']='none';_lab_motion_config['sync']=False
degrees=100*3600/(math.pi*56)
asyncio.run(_lab_managed_move((0,1),(-210,210),degrees,'angle',False))
uncorrected=abs(heading[0]-175)
reset();asyncio.run(_lab_gyro_drive(20,100))
assert abs(heading[0]-175)<uncorrected/3,(heading,uncorrected)
print('Uncorrected/corrected yaw drift:',uncorrected,abs(heading[0]-175))
`);
});
test('gyro straight rejects invalid inputs and stops both sides on faults, stall, emergency stop and command conflict',()=>simulate(`
for speed,cm in [(0,30),(20,0),(20,-1),(float('inf'),30),(20,float('nan'))]:
 reset()
 try:asyncio.run(_lab_gyro_drive(speed,cm));assert False
 except ValueError:pass
 assert not calls
reset();fault[0]=True
try:asyncio.run(_lab_gyro_drive(20,100));assert False
except OSError:pass
assert set(stops)=={0,1} and not _lab_active_motors and not any(commands.values())
fault[0]=False;reset();stuck[0]=True
try:asyncio.run(_lab_gyro_drive(20,100));assert False
except RuntimeError as e:assert 'stalled' in str(e)
assert clock[0]<2000 and set(stops)=={0,1} and not any(commands.values())
stuck[0]=False;reset()
def interrupt():_lab_stop_port(0,motor.BRAKE)
hook[0]=interrupt
try:asyncio.run(_lab_gyro_drive(-20,30));assert False
except ValueError as e:assert 'interrupted' in str(e)
assert set(stops)=={0,1} and not any(commands.values())
hook[0]=None;reset()
def emergency():_lab_movement_stop()
hook[0]=emergency
asyncio.run(_lab_gyro_drive(20,30))
assert set(stops)=={0,1} and not any(commands.values())
hook[0]=None;reset()
_lab_active_motors[0]={'bounded':True}
try:asyncio.run(_lab_gyro_drive(20,30));assert False
except ValueError:pass
assert not calls
`));
test('five-turn accuracy sample logs target, stopped angle and error using the same sign and reference',()=>{
 const s=JSON.stringify(source('gyroTurnRecord'));
 simulate(`reset();heading[0]=0;gain[1]=1
rows=[];names=[]
def reset_yaw(v):heading[0]=v
motion_sensor.reset_yaw=reset_yaw
_lab_set_motion_pair=lambda a,b:None
port=types.SimpleNamespace(B=0,C=1)
_lab_log_start=lambda name:names.append(name)
_lab_log_end=lambda:None
_lab_log_value=lambda label,value:rows.append((label,value))
async def _lab_pause(seconds):await sleep(int(seconds*1000))
async def _lab_tick(force=True):await sleep(0)
task=next(n for n in ast.parse(json.loads(${JSON.stringify(s)})).body if isinstance(n,ast.AsyncFunctionDef) and n.name=='_lab_task_0')
exec(compile(ast.Module(body=[task],type_ignores=[]),'sample','exec'),globals())
asyncio.run(_lab_task_0())
assert names==['GyroTurn'] and len(rows)==15,rows
for i in range(0,len(rows),3):
 assert [r[0] for r in rows[i:i+3]]==['target_deg','actual_deg','error_deg']
 target,actual,error=[r[1] for r in rows[i:i+3]]
 assert target==90 and abs(actual-90)<5 and abs(error-(actual-target))<.01,rows
`);
});
