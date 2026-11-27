import {test} from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import * as Blockly from 'blockly';
import {pythonGenerator} from 'blockly/python';
import {setupClassroom,classroomToolbox} from './classroom-blocks.js';
import {classroomSample} from './classroom-samples.js';
import {generateStandard} from './standard.js';
setupClassroom(Blockly);
function source(name){const w=new Blockly.Workspace();try{Blockly.serialization.workspaces.load(classroomSample(name),w);return generateStandard(w,pythonGenerator).source;}finally{w.dispose();}}
function py(code,input){const r=spawnSync('python',['-X','utf8','-c',code],{input:JSON.stringify(input),encoding:'utf8',timeout:20000});assert.equal(r.status,0,r.stderr);}
test('new sensor and display blocks preserve inputs, fields and generated Python on project reload',()=>{
 const palette=classroomToolbox().contents;
 assert.ok(palette.find(c=>c.name==='表示').contents.some(b=>b.type==='lab_distance_lights'));
 for(const type of ['lab_angle','lab_angular_velocity','lab_acceleration','lab_yaw_reset','lab_gyro_initialize'])assert.ok(palette.find(c=>c.name==='センサー').contents.some(b=>b.type===type));
 for(const name of ['gyroValues','distanceLights','stallMonitor']){
  const w=new Blockly.Workspace(),again=new Blockly.Workspace();try{
   Blockly.serialization.workspaces.load(classroomSample(name),w);const generated=generateStandard(w,pythonGenerator);
   Blockly.serialization.workspaces.load(Blockly.serialization.workspaces.save(w),again);
   assert.equal(generateStandard(again,pythonGenerator).source,generated.source);
  }finally{w.dispose();again.dispose();}
 }
});
const harness=String.raw`
import ast,asyncio,json,sys,types,math
source=json.load(sys.stdin)
clock=[0];resets=[];angles=lambda:[0,0,0]
def ticks_diff(a,b):return ((a-b+(1<<29))%(1<<30))-(1<<29)
async def pause(seconds):clock[0]=(clock[0]+int(seconds*1000))%(1<<30);await asyncio.sleep(0)
imu=types.SimpleNamespace(tilt_angles=lambda:angles(),reset_yaw=lambda n:resets.append((clock[0],n)),angular_velocity=lambda raw:[0,0,0],acceleration=lambda raw:[0,0,1000])
scope={'time':types.SimpleNamespace(ticks_ms=lambda:clock[0],ticks_diff=ticks_diff),'motion_sensor':imu,'_lab_pause':pause}
names={'_lab_range','_lab_gyro_sample','_lab_gyro_initialize','_lab_update_still','_lab_hub_still'}
exec(compile(ast.Module(body=[n for n in ast.parse(source).body if isinstance(n,(ast.FunctionDef,ast.AsyncFunctionDef)) and n.name in names],type_ignores=[]),'generated','exec'),scope)
`;
test('gyro initialization waits for three-axis stability, retries movement, handles wrap and never resets on failure',()=>{
 py(harness+String.raw`
async def main():
 global angles
 await scope['_lab_gyro_initialize'](5);assert resets==[(1000,0)]
 clock[0]=0;resets.clear();angles=lambda:[int(clock[0]/20)*10 if clock[0]<800 else 400,0,0]
 await scope['_lab_gyro_initialize'](5);assert resets[0][0]>=1800
 clock[0]=(1<<30)-500;resets.clear();angles=lambda:[1799 if clock[0]%40 else -1799,0,0]
 await scope['_lab_gyro_initialize'](5);assert len(resets)==1
 for pattern,error in [(lambda:[clock[0]*10,0,0],Exception),(lambda:[float('nan'),0,0],ValueError),(lambda:[0,0],RuntimeError)]:
  clock[0]=0;resets.clear();angles=pattern
  try:await scope['_lab_gyro_initialize'](1.1)
  except error:pass
  else:raise AssertionError('should fail')
  assert not resets
 for limit in [0,1,31,float('nan')]:
  try:await scope['_lab_gyro_initialize'](limit)
  except ValueError:pass
  else:raise AssertionError(limit)
 assert not resets
asyncio.run(main())
`,source('gyroValues'));
});
test('lights map brightness to all four pixels and fail before hardware calls for invalid values',()=>{
 py(String.raw`
import ast,asyncio,json,types,sys
source=json.load(sys.stdin);calls=[]
def check(v,lo,hi):
 if not isinstance(v,(int,float)) or not lo<=v<=hi:raise ValueError()
 return v
async def tick(force=True):pass
scope={'_lab_range':check,'_lab_tick':tick,'_lab_pause':tick,'port':types.SimpleNamespace(C=2),'distance_sensor':types.SimpleNamespace(show=lambda p,pixels:calls.append((p,pixels)))}
n=next(n for n in ast.parse(source).body if isinstance(n,ast.AsyncFunctionDef) and n.name=='_lab_task_0')
exec(compile(ast.Module(body=[n],type_ignores=[]),'generated','exec'),scope)
asyncio.run(scope['_lab_task_0']());assert calls==[(2,[100]*4),(2,[0]*4)]
for value in [-1,101,float('nan'),float('inf')]:
 calls.clear()
 try:eval('distance_sensor.show(port.C, [int(_lab_range(VALUE,0,100))]*4)',{**scope,'VALUE':value})
 except ValueError:pass
 else:raise AssertionError(value)
 assert not calls
`,source('distanceLights'));
});


test('stall-monitor sample stops before alerting for either jammed wheel and does not alert for normal motion',()=>{
 py(String.raw`
import ast,asyncio,json,sys,types,math
source=json.load(sys.stdin);tree=ast.parse(source)
async def scenario(jam=None,jam_at=1500,jitter=False):
 clock=[0];active=[False];started=[0];stops=[];alerts=[]
 def position(p):
  elapsed=clock[0]-started[0]
  if not active[0]:return 0
  if jitter:return (clock[0]//100)%2*2
  if jam in ('both',p):elapsed=min(elapsed,jam_at)
  return int(elapsed*0.21)*(-1 if p==1 else 1)
 async def tick(force=True):
  if force:clock[0]+=1
  await asyncio.sleep(0)
 async def pause(seconds):clock[0]+=round(seconds*1000);await asyncio.sleep(0)
 def run(*args):active[0]=True;started[0]=clock[0]
 def stop():stops.append(clock[0]);active[0]=False
 def alert(*args):assert not active[0];alerts.append(args)
 async def tone(*args):alert(*args)
 scope={'math':math,'time':types.SimpleNamespace(ticks_ms=lambda:clock[0],ticks_diff=lambda a,b:a-b),'port':types.SimpleNamespace(B=1,C=2),'motor':types.SimpleNamespace(relative_position=position,reset_relative_position=lambda *args:None),'_lab_set_motion_pair':lambda *args:None,'_lab_motion_ports':lambda:(1,2),'_lab_tank_run':run,'_lab_movement_stop':stop,'_lab_number':lambda x:x,'_lab_tick':tick,'_lab_pause':pause,'_lab_lamp':{},'light':types.SimpleNamespace(POWER=0,color=alert),'color':types.SimpleNamespace(RED=9),'_lab_common_tone':tone}
 nodes=[n for n in tree.body if isinstance(n,ast.Assign) and isinstance(n.value,ast.Constant) and all(isinstance(t,ast.Name) for t in n.targets) or isinstance(n,ast.AsyncFunctionDef) and n.name=='_lab_task_0']
 exec(compile(ast.Module(body=nodes,type_ignores=[]),'sample','exec'),scope)
 await scope['_lab_task_0']()
 assert not active[0] and len(stops)==2
 if jam is None and not jitter:assert not alerts and 5000<=clock[0]<5200
 else:assert alerts and clock[0]<(jam_at+1300 if not jitter else 1300)
async def main():
 await scenario()
 await scenario('both',0)
 await scenario(1)
 await scenario(2)
 await scenario(jitter=True)
asyncio.run(main())
`,source('stallMonitor'));
});

test('angular velocity uses filtered decidegrees per second and acceleration preserves filtered mG on all axes',()=>{
 const w=new Blockly.Workspace();try{
  const vars=Array.from({length:6},(_,i)=>({id:'v'+i,name:'v'+i}));let next;
  for(let i=5;i>=0;i--)next={type:'variables_set',fields:{VAR:vars[i]},inputs:{VALUE:{block:{type:i<3?'lab_angular_velocity':'lab_acceleration',fields:{AXIS:String(i%3)}}}},...(next?{next:{block:next}}:{})};
  Blockly.serialization.workspaces.load({variables:vars,blocks:{languageVersion:0,blocks:[{type:'spike_start',next:{block:next}}]}},w);
  py(String.raw`
import ast,asyncio,json,sys,types
source=json.load(sys.stdin);calls=[]
def angular(raw):assert raw is False;calls.append('rate');return [-125,250,3]
def accel(raw):assert raw is False;calls.append('accel');return [1000,-2000,500]
async def tick(*args):pass
scope={'motion_sensor':types.SimpleNamespace(angular_velocity=angular,acceleration=accel),'_lab_tick':tick,'_lab_number':lambda x:x}
tree=ast.parse(source);nodes=[n for n in tree.body if isinstance(n,ast.Assign) and isinstance(n.value,ast.Constant) and all(isinstance(t,ast.Name) for t in n.targets) or isinstance(n,ast.AsyncFunctionDef) and n.name=='_lab_task_0']
exec(compile(ast.Module(body=nodes,type_ignores=[]),'sample','exec'),scope);asyncio.run(scope['_lab_task_0']())
assert [scope['v'+str(i)] for i in range(6)]==[-12.5,25,0.3,1000,-2000,500]
assert calls==['rate']*3+['accel']*3
`,generateStandard(w,pythonGenerator).source);
 }finally{w.dispose();}
});
