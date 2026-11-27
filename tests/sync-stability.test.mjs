import {test} from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {EXTRA_RUNTIME} from './enhancements.js';
const runtime=EXTRA_RUNTIME.replace('_lab_native_drive = _lab_drive','_lab_native_drive = None').replace('_lab_native_turn = _lab_turn','_lab_native_turn = None').replace('_lab_native_pair = _lab_pair','_lab_native_pair = None');
function python(body){const r=spawnSync('python',['-'],{input:`import types,math,asyncio,io,csv
${runtime}
def _lab_range(x,a,b):
    if not isinstance(x,(int,float)) or not a<=x<=b:raise ValueError()
    return x
def _lab_positive(x,b):return _lab_range(x,.001,b)
def _lab_speed_percent(x):return _lab_range(x,-100,100)
def _lab_speed(x):return int(_lab_speed_percent(x)*10.5)
def _lab_csv(x):return '"'+str(x).replace('"','""')+'"'
${body}`,encoding:'utf8',env:{...process.env,PYTHONUTF8:'1'}});assert.equal(r.status,0,r.stderr);return r.stdout;}

test('gentle sync bounds correction and command slew, preserves signs and never cancels low-speed motion',()=>{
 python(`time=types.SimpleNamespace(ticks_diff=lambda a,b:a-b)
for nominal in [10,21,52,53,105,210,1050,-10,-52,-210,-1050]:
 for ahead in [0,1,2,6,20,100]:
    state={'command':nominal,'command_time':0}
    previous=nominal
    for now in range(20,1020,20):
        command=_lab_sync_command(state,nominal,ahead,True,now)
        assert command*nominal>0,(nominal,ahead,command)
        assert abs(command-previous)<=11,(nominal,ahead,previous,command)
        assert abs(command)<=abs(nominal)
        previous=command
    assert abs(command)>=max(1,int(abs(nominal)*.85)),(nominal,ahead,command)
    if abs(nominal)<=52.5 or ahead<=1:assert command==nominal,(nominal,ahead,command)
assert _lab_sync_command({'command':525,'command_time':0},84,0,True,20)>=514
assert _lab_sync_command({'command':525,'command_time':0,'profile_nominal':525},84,0,True,20,84,True)==84
assert _lab_sync_command({},0,100,True,0)==0
assert _lab_sync_command({'command':100},210,100,False,0)==210
state={'command':210,'command_time':0}
for now in range(20,1020,20):
 old=state['command'];new=_lab_sync_command(state,210,20 if now%40 else 0,True,now)
 assert new>0 and abs(new-old)<=11
# Large scheduling gap is still capped to a 50ms change.
old=state['command'];new=_lab_sync_command(state,1050,0,True,10000)
assert abs(new-old)<=27
`);
});

test('trace speed derives degrees per second from measured interval without calling motor.velocity',()=>{
 python(`clock=[0];positions={0:0,1:0}
time=types.SimpleNamespace(ticks_ms=lambda:clock[0],ticks_diff=lambda a,b:a-b)
motor=types.SimpleNamespace(relative_position=lambda p:positions[p])
def _lab_motion_ports():return (0,1)
_lab_log_start('Speed');_lab_trace_motion(20)
_lab_capture_motion();assert _lab_log['rows']==9
clock[0]=125;positions.update({0:20,1:25});_lab_capture_motion()
clock[0]=325;positions.update({0:12,1:45});_lab_capture_motion()
rows=list(csv.DictReader(io.StringIO(bytes(_lab_log['buffer'][:_lab_log['size']]).decode())))
assert rows[3]['value']=='' and rows[4]['value']==''
assert float(rows[12]['value'])==160 and float(rows[13]['value'])==200,rows
assert float(rows[21]['value'])==40 and float(rows[22]['value'])==100,rows
assert rows[9]['time_s']=='0.125' and rows[18]['time_s']=='0.325'
_lab_capture_motion(True);assert _lab_log['rows']==27
`);
});

test('ramped finite moves with asymmetric lag stay nonzero before the target and obey command rate bounds',()=>{
 python(`for profile in ['trapezoid','s']:
 for directions in [(1,1),(-1,1),(1,-1)]:
    clock=[0];position=[0.0,0.0];actual=[0.0,0.0];commands=[0,0];last=[None,None];updates=[0,0];stops=[]
    gains=[.94,1.0]
    def encoder(p):return int(round(position[p]))
    def run(p,v):
        assert v*directions[p]>0
        if last[p] is not None:assert abs(v-last[p])<=19,(profile,directions,clock[0],p,last[p],v)
        commands[p]=v;last[p]=v;updates[p]+=1
    def stop(p,stop=1):
        stops.append((clock[0],p,encoder(p)));commands[p]=0;actual[p]=0;last[p]=None
    async def sleep(ms):
        for _ in range(ms//2):
            for p in [0,1]:
                actual[p]+=(commands[p]*gains[p]-actual[p])*.025
                position[p]+=actual[p]*.002
        clock[0]+=ms
        if clock[0]>20000:raise AssertionError('did not finish')
    time=types.SimpleNamespace(ticks_ms=lambda:clock[0],ticks_diff=lambda a,b:a-b)
    motor=types.SimpleNamespace(relative_position=encoder,run=run,stop=stop,BRAKE=1)
    runloop=types.SimpleNamespace(sleep_ms=sleep)
    _lab_motion_config.update({'sync':True,'profile':profile,'up':.5,'down':.5})
    _lab_active_motors.clear()
    asyncio.run(_lab_managed_move([0,1],[210*d for d in directions],614,'angle'))
    assert all(position[p]*directions[p]>=613.5 for p in [0,1]),position
    assert all(v==0 for v in commands) and not _lab_active_motors
    assert min(updates)>100
    assert all(pos*directions[p]>=614 for _,p,pos in stops),(profile,stops)
`);
});

test('continuous two-axis sync uses the same bounded commands without stopping a moving side',()=>{
 python(`clock=[0];positions=[0.0,0.0];commands=[0,0];last=[None,None]
time=types.SimpleNamespace(ticks_ms=lambda:clock[0],ticks_diff=lambda a,b:a-b)
def run(p,v):
    assert v!=0
    if last[p] is not None:assert abs(v-last[p])<=11,(p,last[p],v)
    last[p]=v;commands[p]=v
motor=types.SimpleNamespace(relative_position=lambda p:int(round(positions[p])),run=run)
async def sleep(ms):
    for p in [0,1]:positions[p]+=commands[p]*ms/1000*(.95 if p==0 else 1)
    clock[0]+=ms
    if clock[0]>=1000:_lab_task_count[0]=0
runloop=types.SimpleNamespace(sleep_ms=sleep)
_lab_task_count=[1];_lab_motion_config['sync']=True
_lab_start_velocities([0,1],[-210,210]);asyncio.run(_lab_service())
assert positions[0]<-190 and positions[1]>190,positions
assert all(commands) and len(_lab_active_motors)==2
`);
});


test('early braking reaches every target with low commands and measured response before stopping',()=>{
 python(`cases=0
for profile in ['trapezoid','s']:
 for peak in [210,525]:
  for goal in [100,614,2046]:
   for lag,ramp in [(lag,ramp) for lag in [.08,.15,.3,.5] for ramp in [.1,.5]]:
    for sync in [True,False]:
     clock=[0];position=[0.,0.];actual=[0.,0.];commands=[0,0];ends=[];last=[None,None]
     def encoder(p):return round(position[p])
     def run(p,v):
      assert v>0
      if sync and last[p] is not None:assert abs(v-last[p])<=math.ceil((peak-84)*1.5*.02/ramp+11)
      commands[p]=v;last[p]=v
     def stop(p,stop=1):
      if commands[p]:
       ends.append((p,encoder(p),commands[p],actual[p]))
      commands[p]=0;actual[p]=0;last[p]=None
     async def sleep(ms):
      for _ in range(ms//2):
       for p in [0,1]:
        actual[p]+=(commands[p]*(.94 if p==0 else 1)-actual[p])*min(1,.002/lag)
        position[p]+=actual[p]*.002
      clock[0]+=ms
      assert clock[0]<60000
     time=types.SimpleNamespace(ticks_ms=lambda:clock[0],ticks_diff=lambda a,b:a-b)
     motor=types.SimpleNamespace(relative_position=encoder,run=run,stop=stop,BRAKE=1)
     runloop=types.SimpleNamespace(sleep_ms=sleep)
     _lab_motion_config.update({'sync':sync,'profile':profile,'up':ramp,'down':ramp})
     _lab_active_motors.clear()
     asyncio.run(_lab_managed_move([0,1],[peak,peak],goal,'angle'))
     assert len(ends)==2,(profile,peak,goal,lag,sync,ends)
     assert all(pos>=goal and cmd<=84 and speed<=105 for p,pos,cmd,speed in ends),(profile,peak,goal,lag,sync,ends)
     cases+=1
assert cases==192
`);
});


test('minimum-speed ramp avoids a simulated low-speed stop and burst while retaining signs and ratios',()=>{
 python(`cases=0
for profile in ['trapezoid','s']:
 for velocities in [[210],[210,210],[-210,210],[210,105]]:
  for minimum in [3,8,12]:
   clock=[0];position=[0.]*len(velocities);actual=[0.]*len(velocities);commands=[0]*len(velocities);last=[None]*len(velocities);bursts=[0];under=[0];ends=[]
   def encoder(p):return round(position[p])
   def run(p,v):
    assert v*velocities[p]>0 and abs(v)<=abs(velocities[p])
    if minimum>=8:assert abs(v)>=min(abs(velocities[p]),minimum*10.5),(minimum,velocities,v)
    if last[p] is not None and len(velocities)==2:assert abs(v-last[p])<=math.ceil((max(map(abs,velocities))-minimum*10.5)*1.5*.02/.5+11),(profile,velocities,minimum,clock[0],last[p],v)
    commands[p]=v;last[p]=v
   def stop(p,stop=1):
    if commands[p]:ends.append((p,encoder(p)))
    commands[p]=0;actual[p]=0;last[p]=None
   async def sleep(ms):
    for p in range(len(velocities)):
     command=commands[p]
     if command and abs(command)<63:
      # A deliberately adverse device model: low commands stick, then jump.
      under[0]+=1
      pulse=(clock[0]//20)%12==11
      actual[p]=(150 if command>0 else -150) if pulse else 0
      bursts[0]+=int(pulse)
     else:actual[p]+=(command-actual[p])*.2
     position[p]+=actual[p]*ms/1000
    clock[0]+=ms
    assert clock[0]<60000
   time=types.SimpleNamespace(ticks_ms=lambda:clock[0],ticks_diff=lambda a,b:a-b)
   motor=types.SimpleNamespace(relative_position=encoder,run=run,stop=stop,BRAKE=1)
   runloop=types.SimpleNamespace(sleep_ms=sleep)
   _lab_motion_config.update({'sync':True,'profile':profile,'up':.5,'down':.5,'minimum':minimum})
   _lab_active_motors.clear()
   if minimum==3:
    # Demonstrate the model reproduces the previous low-speed problem.
    try:asyncio.run(_lab_managed_move(list(range(len(velocities))),velocities,614,'angle'))
    except RuntimeError:pass
    assert under[0]>0 and bursts[0]>0
   else:
    asyncio.run(_lab_managed_move(list(range(len(velocities))),velocities,614,'angle'))
    assert under[0]==0 and bursts[0]==0 and len(ends)==len(velocities)
    maximum=max(map(abs,velocities))
    assert all(abs(pos)>=round(614*abs(velocities[p])/maximum)-1 for p,pos in ends)
   cases+=1
assert cases==24
`);
});


test('terminal stall stops all selected motors rather than waiting for a later burst',()=>{
 python(`clock=[0];position=[0.,0.];commands=[0,0];stops=[];freeze=[None]
def run(p,v):commands[p]=v
def stop(p,stop=1):stops.append((clock[0],p));commands[p]=0
async def sleep(ms):
 for p in [0,1]:
  if abs(commands[p])>84:position[p]+=commands[p]*ms/1000
  elif freeze[0] is None:freeze[0]=clock[0]
 clock[0]+=ms
 assert clock[0]<10000
time=types.SimpleNamespace(ticks_ms=lambda:clock[0],ticks_diff=lambda a,b:a-b)
motor=types.SimpleNamespace(relative_position=lambda p:round(position[p]),run=run,stop=stop,BRAKE=1)
runloop=types.SimpleNamespace(sleep_ms=sleep)
_lab_motion_config.update({'sync':True,'profile':'s','up':0,'down':.5,'minimum':8})
_lab_active_motors.clear()
try:asyncio.run(_lab_managed_move([0,1],[210,210],614,'angle'));raise AssertionError('stalled move succeeded')
except RuntimeError as e:assert 'minimum speed' in str(e)
assert not any(commands) and not _lab_active_motors and {p for _,p in stops}=={0,1}
assert clock[0]-freeze[0]<=440,(clock,freeze)
`);
});




test('configured ramp times measure minimum-to-maximum and maximum-to-minimum commands',()=>{
 python(`cases=0
for profile in ['trapezoid','s']:
 for percent in [20,50]:
  for up,down in [(.1,.1),(.5,1),(1,.5)]:
   for sync in [True,False]:
    for unit in ['angle','time']:
     clock=[0];position=[0.,0.];commands=[0,0];rows=[]
     def run(p,v):
      commands[p]=v
      if p==0:rows.append((clock[0],v,_lab_active_motors[p]['phase']))
     def stop(p,stop=1):commands[p]=0
     async def sleep(ms):
      for p in [0,1]:position[p]+=commands[p]*ms/1000
      clock[0]+=ms
      assert clock[0]<30000
     time=types.SimpleNamespace(ticks_ms=lambda:clock[0],ticks_diff=lambda a,b:a-b)
     motor=types.SimpleNamespace(relative_position=lambda p:round(position[p]),run=run,stop=stop,BRAKE=1)
     runloop=types.SimpleNamespace(sleep_ms=sleep)
     _lab_motion_config.update({'sync':sync,'profile':profile,'up':up,'down':down,'minimum':8})
     _lab_active_motors.clear()
     asyncio.run(_lab_managed_move([0,1],[percent*10.5]*2,2046 if unit=='angle' else 4,unit))
     peak=int(percent*10.5);floor=84
     assert rows[0][1]==floor
     assert next(v for t,v,phase in rows if t==round(up*1000))==peak,(profile,percent,unit,up,rows[:10])
     assert all(v<peak for t,v,phase in rows if t<round(up*1000))
     dec=[r for r in rows if r[2]==3]
     start=dec[0][0];duration=round(down*1000)
     assert dec[0][1]==peak,(profile,percent,unit,dec[0])
     endpoint=next((r for r in dec if r[0]>=start+duration),None)
     assert endpoint is not None and endpoint[0]==start+duration and endpoint[1]==floor,(profile,percent,unit,dec)
     assert all(v>floor for t,v,phase in dec if t<start+duration),(profile,percent,unit,dec)
     # Independently check intermediate samples against linear / smoothstep shape.
     for t,v,phase in dec:
      if t>=start+duration:break
      u=(t-start)/duration;shape=u*u*(3-2*u) if profile=='s' else u
      expected=percent-(percent-8)*shape
      assert abs(v/10.5-expected)<=1.1,(profile,t,v,expected)
     cases+=1
assert cases==48
`);
});

test('short timed ramps preserve the minimum, scale unreachable peaks, and zero times are immediate',()=>{
 python(`for profile in ['trapezoid','s']:
 for up,down in [(1,1),(0,0),(0,.1),(.1,0)]:
  clock=[0];positions=[0.,0.];cmd=[0,0];rows=[]
  def run(p,v):
   cmd[p]=v
   if p==0:rows.append((clock[0],v))
  async def sleep(ms):
   for p in [0,1]:positions[p]+=cmd[p]*ms/1000
   clock[0]+=ms
  time=types.SimpleNamespace(ticks_ms=lambda:clock[0],ticks_diff=lambda a,b:a-b)
  motor=types.SimpleNamespace(relative_position=lambda p:round(positions[p]),run=run,stop=lambda p,**kw:None,BRAKE=1)
  runloop=types.SimpleNamespace(sleep_ms=sleep)
  _lab_motion_config.update({'sync':True,'profile':profile,'up':up,'down':down,'minimum':8})
  _lab_active_motors.clear()
  asyncio.run(_lab_managed_move([0,1],[525,525],.2,'time'))
  assert clock[0]==200 and min(v for t,v in rows)>=84
  if up==down==1:
   assert max(v for t,v in rows)==126 and rows[0]==(0,84) and rows[-1]==(200,84),rows
  if up==0:assert rows[0][1]==525,rows
`);
});


test('distance ratios use the requested travel sections and reject overlapping ranges atomically',()=>{
 python(`for profile in ['trapezoid','s']:
 _lab_set_distance_ramp(profile,10,10)
 for x,want in [(0,8),(.05,29),(.1,50),(.5,50),(.9,50),(.95,29),(1,8)]:
  got,phase=_lab_ratio_level(x,50,8,10,10,profile)
  assert abs(got-want)<.0001,(profile,x,got,want)
 assert _lab_ratio_level(.001,50,8,0,0,profile)==(50,2)
 assert abs(_lab_ratio_level(.5,50,8,50,50,profile)[0]-50)<.0001
 before=dict(_lab_motion_config)
 for up,down in [(-1,10),(10,-1),(101,0),(60,41),(float('nan'),0)]:
  try:_lab_set_distance_ramp(profile,up,down);raise AssertionError('accepted invalid ratios')
  except ValueError:pass
  assert _lab_motion_config==before
 _lab_set_ramp('s',.5,.1);assert _lab_motion_config['basis']=='time'
 _lab_set_distance_ramp(profile,10,10);assert _lab_motion_config['basis']=='distance'
`);
});

test('distance mode follows normalized encoder travel across signs, ratios and move lengths',()=>{
 python(`cases=0
for profile in ['trapezoid','s']:
 for peak in [210,525]:
  for directions in [(1,1),(-1,1),(1,-1)]:
   for weights in [(1,1),(1,.5)]:
    for up,down in [(10,10),(0,20),(20,0),(50,50)]:
     clock=[0];pos=[0.,0.];cmd=[0,0];seen=[]
     velocities=[peak*directions[p]*weights[p] for p in [0,1]]
     def encoder(p):return round(pos[p])
     def run(p,v):
      assert v*directions[p]>0 and abs(v)<=abs(velocities[p]) and abs(v)>=min(84,abs(velocities[p]))
      cmd[p]=v
      if p==0:
       targets=[2046*w for w in weights]
       fraction=sum(max(0,min(1,encoder(p)*directions[p]/targets[p])) for p in [0,1])/2
       seen.append((fraction,abs(v),_lab_active_motors[p]['phase']))
     def stop(p,stop=1):cmd[p]=0
     async def sleep(ms):
      for p in [0,1]:pos[p]+=cmd[p]*ms/1000
      clock[0]+=ms
      assert clock[0]<60000
     time=types.SimpleNamespace(ticks_ms=lambda:clock[0],ticks_diff=lambda a,b:a-b)
     motor=types.SimpleNamespace(relative_position=encoder,run=run,stop=stop,BRAKE=1)
     runloop=types.SimpleNamespace(sleep_ms=sleep)
     _lab_motion_config.update({'sync':False,'minimum':8})
     _lab_set_distance_ramp(profile,up,down);_lab_active_motors.clear()
     asyncio.run(_lab_managed_move([0,1],velocities,2046,'angle'))
     assert not any(cmd) and all(pos[p]*directions[p]>=2046*weights[p]-.5 for p in [0,1])
     # Measured transitions are determined by travel, not a clock duration.
     if up:
      assert seen[0][1]==int((8/ min(weights))*10.5)
      assert all(phase==1 for x,v,phase in seen if x<up/100-.002)
     if down:
      assert all(phase==3 for x,v,phase in seen if x>1-down/100+.002)
      assert min(v for x,v,phase in seen if x>.98)<=int(8/min(weights)*10.5)+42
     if up+down<100:
      assert max(v for x,v,phase in seen if up/100+.005<x<1-down/100-.005)==peak
     cases+=1
assert cases==96
`);
});

test('distance mode rejects timed movement before issuing motor commands and time settings restore it',()=>{
 python(`time=types.SimpleNamespace(ticks_ms=lambda:0,ticks_diff=lambda a,b:a-b)
called=[]
motor=types.SimpleNamespace(run=lambda *args:called.append(args))
_lab_set_distance_ramp('s',10,10)
try:asyncio.run(_lab_managed_move([0,1],[210,210],1,'time'));raise AssertionError('accepted timed movement')
except ValueError as e:assert 'Distance-percentage' in str(e)
assert not called and not _lab_active_motors
_lab_set_ramp('s',.1,.1);assert _lab_motion_config['basis']=='time'
`);
});


test('distance ratio ramp completes with asymmetric motor response while respecting the speed floor',()=>{
 python(`cases=0
for profile in ['trapezoid','s']:
 for peak in [210,525]:
  for lag in [.08,.2,.5]:
   clock=[0];pos=[0.,0.];actual=[0.,0.];cmd=[0,0];phases=set()
   def run(p,v):
    assert 84<=v<=peak
    cmd[p]=v;phases.add(_lab_active_motors[p]['phase'])
   def stop(p,stop=1):cmd[p]=0;actual[p]=0
   async def sleep(ms):
    for _ in range(ms//2):
     for p in [0,1]:
      actual[p]+=(cmd[p]*(.94 if p==0 else 1)-actual[p])*min(1,.002/lag)
      pos[p]+=actual[p]*.002
    clock[0]+=ms
    assert clock[0]<60000
   time=types.SimpleNamespace(ticks_ms=lambda:clock[0],ticks_diff=lambda a,b:a-b)
   motor=types.SimpleNamespace(relative_position=lambda p:round(pos[p]),run=run,stop=stop,BRAKE=1)
   runloop=types.SimpleNamespace(sleep_ms=sleep)
   _lab_motion_config.update({'sync':True,'minimum':8});_lab_set_distance_ramp(profile,10,10)
   _lab_active_motors.clear()
   asyncio.run(_lab_managed_move([0,1],[peak,peak],2046,'angle'))
   assert phases=={1,2,3} and all(p>=2045.5 for p in pos) and not any(cmd)
   cases+=1
assert cases==12
`);
});


test('80 percent 100cm 20/20 distance ramp retains floor and suppresses correction hunting against v0.8.7',()=>{
 const legacy=readFileSync(new URL('./sync-v087-reference.py',import.meta.url),'utf8');
 const report=python(`${legacy}
new_sync=_lab_sync_command
summaries=[]
for profile in ['trapezoid','s']:
 for directions in [(1,1),(-1,1),(1,-1)]:
  for lag in [.08,.15,.3,.5]:
   for gain in [1.,.995,.97]:
    results={}
    for mode in ['off','old','new']:
     _lab_sync_command = _lab_sync_v087 if mode=='old' else new_sync
     clock=[0];pos=[0.,0.];actual=[0.,0.];cmd=[0,0];rows=[];ends=[]
     goal=1000/(56*math.pi)*360
     def encoder(p):return round(pos[p])
     def run(p,v):
      assert v*directions[p]>0 and 84<=abs(v)<=840,(mode,v)
      cmd[p]=v
     def stop(p,stop=1):
      if cmd[p]:ends.append((p,encoder(p)*directions[p],abs(cmd[p])))
      cmd[p]=0;actual[p]=0
     async def sleep(ms):
      for _ in range(ms//2):
       for p in [0,1]:
        response=lag*(1 if p==0 else 1.1)
        actual[p]+=(cmd[p]*(gain if p==0 else 1)-actual[p])*min(1,.002/response)
        pos[p]+=actual[p]*.002
      clock[0]+=ms
      if all(cmd):rows.append((clock[0],encoder(0)*directions[0]-encoder(1)*directions[1],abs(actual[0])-abs(actual[1]),abs(cmd[0])-abs(cmd[1]),_lab_active_motors[0]['phase']))
      assert clock[0]<30000
     time=types.SimpleNamespace(ticks_ms=lambda:clock[0],ticks_diff=lambda a,b:a-b)
     motor=types.SimpleNamespace(relative_position=encoder,run=run,stop=stop,BRAKE=1)
     runloop=types.SimpleNamespace(sleep_ms=sleep)
     _lab_motion_config.update({'sync':mode!='off','minimum':8})
     _lab_set_distance_ramp(profile,20,20);_lab_active_motors.clear()
     asyncio.run(_lab_managed_move([0,1],[840*d for d in directions],goal,'angle'))
     assert len(ends)==2 and all(p>=round(goal) for _,p,_ in ends) and not any(cmd),(mode,ends,goal)
     cruise=[r for r in rows if r[4]==2]
     gap=sum(abs(r[2]) for r in cruise)/len(cruise)
     variation=sum(abs(b[3]-a[3]) for a,b in zip(cruise,cruise[1:]))
     results[mode]=(gap,variation,max(abs(r[3]) for r in cruise),max(abs(r[1]) for r in rows))
     if mode=='new':
      assert max(abs(r[3]) for r in rows)<=26
      # Encoder correction changes gently, without increasing the nominal floor.
      assert all(abs(b[3]-a[3])<=3 for a,b in zip(cruise,cruise[1:]))
    assert results['new'][1]<=results['old'][1]+1,(profile,directions,lag,gain,results)
    summaries.append((profile,directions,lag,gain,results))
# A large persistent mismatch exceeds the deliberately limited authority.
# Report it rather than promising heading control for every mechanical load.
print('80pct/100cm/20pct/8pct cases:',len(summaries)*3)
for profile in ['trapezoid','s']:
 selected=[r for r in summaries if r[0]==profile and r[1]==(1,1)]
 for mode in ['off','old','new']:
  print(profile,mode,'mean cruise speed gap',round(sum(r[4][mode][0] for r in selected)/len(selected),3),'mean command variation',round(sum(r[4][mode][1] for r in selected)/len(selected),3))
`);
 console.log(report.trim());
});

test('weak sync ignores quantization noise, has bounded authority, resets and preserves an 8 percent floor',()=>{
 python(`time=types.SimpleNamespace(ticks_diff=lambda a,b:a-b)
state={}
for now in range(0,2000,20):
 command=_lab_sync_command(state,840,2 if now%40 else 0,True,now,84,True)
 assert command==840
state={};previous=0
for now in range(0,3000,20):
 command=_lab_sync_command(state,840,100,True,now,84,True)
 correction=state['sync_reduction']
 assert 0<=correction<=25.2 and abs(correction-previous)<=.630001
 assert 814<=command<=840
 previous=correction
assert state['sync_reduction']>25
assert _lab_sync_command(state,84,100,True,3020,84,True)==84
assert _lab_sync_command(state,0,100,True,3040,84,True)==0 and state['sync_reduction']==0
assert _lab_sync_command(state,-840,0,True,3060,84,True)==-840
assert _lab_sync_command(state,-840,100,False,3080,84,True)==-840 and state['sync_error']==0
`);
});
