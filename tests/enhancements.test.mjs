import {test} from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import * as Blockly from 'blockly';
import {pythonGenerator} from 'blockly/python';
import {setupClassroom} from './classroom-blocks.js';
import {generateStandard} from './standard.js';
import {classroomSample} from './classroom-samples.js';
import {EXTRA_RUNTIME} from './enhancements.js';
import {RecordingReceiver,recordingReader} from './recording.js';
setupClassroom(Blockly);
const py=script=>{const result=spawnSync(process.platform==='win32'?'python':'python3',['-'],{input:script,encoding:'utf8',env:{...process.env,PYTHONUTF8:'1'}});assert.equal(result.status,0,result.stderr);};
test('battery value uses hub API and abacus pixels match five-bead digits and right alignment',()=>{
 py(`import sys,types,math
${EXTRA_RUNTIME.replace('_lab_native_drive = _lab_drive','_lab_native_drive = None').replace('_lab_native_turn = _lab_turn','_lab_native_turn = None').replace('_lab_native_pair = _lab_pair','_lab_native_pair = None')}
pixels={};cleared=[]
def clear():pixels.clear();cleared.append(True)
def pixel(x,y,v):
    assert 0<=x<5 and 0<=y<5 and v==100
    pixels[x,y]=v
light_matrix=types.SimpleNamespace(clear=clear,set_pixel=pixel)
hub=types.ModuleType('hub');hub.battery_voltage=lambda:7800;sys.modules['hub']=hub
assert _lab_battery_voltage()==7800
_lab_display_abacus(_lab_battery_voltage())
assert set(pixels)=={(1,0),(1,1),(1,2),(2,0),(2,1),(2,2),(2,3)},pixels
for number in list(range(10))+[12345,50789,99999,0]:
    _lab_display_abacus(number)
    digits=str(number);decoded=[]
    for x in range(5-len(digits),5):
        decoded.append(5*((x,0) in pixels)+sum((x,y) in pixels for y in range(1,5)))
    assert decoded==[int(c) for c in digits],(number,pixels)
for invalid in [-1,1.5,100000,float('nan'),float('inf'),'7800']:
    before=len(cleared)
    try:_lab_display_abacus(invalid);raise AssertionError(invalid)
    except ValueError:pass
    assert len(cleared)==before
del hub.battery_voltage
try:_lab_battery_voltage();raise AssertionError()
except RuntimeError:pass
`);
});
test('CSV receiver checks fragment boundaries, sequence, byte count and checksum',()=>{
 const token='123456789012abcdefabcdef',r=new RecordingReceiver(token),bytes=new TextEncoder().encode('time_s,label,value\n0,"温度","20"\n');let h=2166136261;
 for(const byte of bytes)h=Math.imul(h^byte,16777619)>>>0;
 const response=`SBLCSV:${token}:BEGIN\nSBLCSV:${token}:DATA:0:${Buffer.from(bytes).toString('hex')}\nSBLCSV:${token}:END:1:${bytes.length}:${h}\n`;
 for(let i=0;i<response.length;i+=7)r.push(response.slice(i,i+7));assert.deepEqual(r.bytes,bytes);assert.equal(r.error,null);
 const missing=new RecordingReceiver(token);missing.push(`SBLCSV:${token}:BEGIN\nSBLCSV:${token}:DATA:1:ff\n`);assert.match(missing.error.message,/順番/);
 const corrupt=new RecordingReceiver(token);corrupt.push(response.replace(`:${h}\n`,':0\n'));assert.match(corrupt.error.message,/照合/);
 assert.throws(()=>recordingReader('../secret',token),/記録名/);
});
test('message wait rejects indirect cycles through My Blocks and handles receiver completion',()=>{
 const ws=new Blockly.Workspace();try{
  Blockly.serialization.workspaces.load({blocks:{languageVersion:0,blocks:[{type:'lab_message_hat',fields:{MESSAGE:'A'},next:{block:{type:'lab_message_wait',fields:{MESSAGE:'B'}}}},{type:'lab_message_hat',fields:{MESSAGE:'B'},next:{block:{type:'lab_message_wait',fields:{MESSAGE:'A'}}}}]}},ws);
  assert.throws(()=>generateStandard(ws,pythonGenerator),/循環/);
 }finally{ws.dispose();}
 py(`import asyncio,math\n${EXTRA_RUNTIME}\n_lab_messages={'m':0,'empty':0}\n_lab_receivers={'m':[1,2],'empty':[]}\n_lab_message_done={}\nasync def tick():\n    await asyncio.sleep(0)\n_lab_tick=tick\nasync def test():\n    done=[]\n    async def sender():\n        await _lab_send_wait('m')\n        done.append(True)\n    async def receivers():\n        while _lab_messages['m']==0: await tick()\n        _lab_message_done[1]=1\n        await tick()\n        assert not done\n        _lab_message_done[2]=1\n    await asyncio.gather(sender(),receivers())\n    assert done\n    await _lab_send_wait('empty')\nasyncio.run(test())` .replace('_lab_native_drive = _lab_drive','_lab_native_drive = None').replace('_lab_native_turn = _lab_turn','_lab_native_turn = None').replace('_lab_native_pair = _lab_pair','_lab_native_pair = None'));
});
test('managed motion keeps target on speed change, applies ramp and configured stop',()=>{
 py(`import asyncio,math,types
clock=[0];positions={0:0.0,1:0.0};velocities={0:0,1:0};commands=[];stops=[]
time=types.SimpleNamespace(ticks_ms=lambda:clock[0],ticks_diff=lambda a,b:a-b)
def run(p,v): velocities[p]=v;commands.append((clock[0],p,v))
def stop(p,stop=1):velocities[p]=0;stops.append((p,stop))
motor=types.SimpleNamespace(run=run,stop=stop,relative_position=lambda p:int(positions[p]),BRAKE=1,HOLD=2)
async def sleep(ms):
    for p in positions: positions[p]+=velocities[p]*ms/1000*(0.8 if p==1 else 1)
    clock[0]+=ms
    await asyncio.sleep(0)
runloop=types.SimpleNamespace(sleep_ms=sleep)
def _lab_range(x,a,b):
    if not a<=x<=b:raise ValueError()
    return x
def _lab_positive(x,b):
    if not 0<x<=b:raise ValueError()
    return x
def _lab_speed_percent(x):return _lab_range(x,-100,100)
def _lab_speed(x):return int(_lab_speed_percent(x)*10.5)
${EXTRA_RUNTIME.replace('_lab_native_drive = _lab_drive','_lab_native_drive = None').replace('_lab_native_turn = _lab_turn','_lab_native_turn = None').replace('_lab_native_pair = _lab_pair','_lab_native_pair = None')}
async def test():
    _lab_set_ramp('s',0.2,0.2)
    _lab_stop_modes[0]=2
    _lab_motion_config['sync']=False
    async def change():
        while clock[0]<100:await sleep(10)
        _lab_change_speed(0,40)
    await asyncio.gather(_lab_managed_move([0,1],[210,210],180,'angle'),change())
    assert 180<=positions[0]<200,positions
    assert 180<=positions[1]<200,positions
    assert (0,2) in stops
    assert any(30<=abs(v)<210 for _,_,v in commands)
    assert any(v>210 for _,p,v in commands if p==0)
    assert not _lab_active_motors
asyncio.run(test())`);
});
test('persistent CSV flushes rows, survives a fresh reader, escapes strings and rejects traversal',()=>{
 py(`import asyncio,types,math,tempfile,builtins,os
folder=tempfile.TemporaryDirectory();real_open=builtins.open
def open(path,mode):
    assert path.startswith('/flash/'),path
    return real_open(folder.name+'/'+path.split('/')[-1],mode,**({'encoding':'utf-8'} if 'b' not in mode else {}))
time=types.SimpleNamespace(ticks_ms=lambda:1200,ticks_diff=lambda a,b:a-b)
def _lab_range(x,a,b):
    if not a<=x<=b:raise ValueError()
    return x
def _lab_csv(x):return '"'+str(x).replace('"','""')+'"'
${EXTRA_RUNTIME.replace('_lab_native_drive = _lab_drive','_lab_native_drive = None').replace('_lab_native_turn = _lab_turn','_lab_native_turn = None').replace('_lab_native_pair = _lab_pair','_lab_native_pair = None')}
_lab_log_start('Record1');_lab_log_value('a,"b','温度');_lab_log_end()
assert '"a,""b","温度"' in open('/flash/sbl_Record1.csv','r').read()
try:_lab_log_start('../bad');raise AssertionError()
except ValueError:pass
assert _lab_string_op('char','Hello',1)=='H'
assert _lab_string_op('contains','Hello','ell')
assert _lab_string_op('to_number','12.5',0)==12.5
assert abs(_lab_math('sin',30)-0.5)<1e-9
try:_lab_string('あ'*41);raise AssertionError()
except ValueError:pass
folder.cleanup()`);
});

test('CSV reader prefers flash, reads legacy files only when absent, and preserves storage errors',()=>{
 py(`import sys,types,asyncio,io,contextlib
reader=${JSON.stringify(recordingReader('Encoder_1','1234567890abcdef12345678'))}
runloop=types.ModuleType('runloop')
async def sleep(ms):pass
runloop.sleep_ms=sleep;runloop.run=lambda task:asyncio.run(task);sys.modules['runloop']=runloop
for mode in ['flash','legacy','denied']:
    calls=[]
    def open_file(path,access):
        calls.append((path,access));assert access=='rb'
        if path.startswith('/flash/'):
            if mode=='legacy':raise OSError(2,'not found')
            if mode=='denied':raise OSError(13,'permission denied')
        return io.BytesIO(b'time_s,label,value\\n0,A,123\\n')
    output=io.StringIO()
    with contextlib.redirect_stdout(output):exec(reader,{'open':open_file})
    text=output.getvalue()
    assert calls[0]==('/flash/sbl_Encoder_1.csv','rb'),calls
    if mode=='legacy':assert calls[1]==('/sbl_Encoder_1.csv','rb'),calls
    else:assert len(calls)==1,calls
    if mode=='denied':assert ':ERROR:' in text and 'permission denied' in text and ':BEGIN' not in text,text
    else:assert ':BEGIN' in text and ':END:' in text,text
`);
});

test('CSV save failure reports original storage cause and closes partial handles',()=>{
 py(`import types
time=types.SimpleNamespace(ticks_ms=lambda:1200,ticks_diff=lambda a,b:a-b)
${EXTRA_RUNTIME.replace('_lab_native_drive = _lab_drive','_lab_native_drive = None').replace('_lab_native_turn = _lab_turn','_lab_native_turn = None').replace('_lab_native_pair = _lab_pair','_lab_native_pair = None')}
for mode in ['open','flush']:
    closed=[]
    class Broken:
        def write(self,text):return len(text)
        def flush(self):raise OSError(28,'no space left')
        def close(self):closed.append(True)
    def open(path,access):
        assert path=='/flash/sbl_Encoder_1.csv' and access=='wb'
        if mode=='open':raise OSError(30,'read-only filesystem')
        return Broken()
    _lab_log.clear();_lab_log_start('Encoder_1')
    try:_lab_log_end();raise AssertionError('failure hidden')
    except RuntimeError as e:
        text=str(e);assert '/flash/sbl_Encoder_1.csv' in text and ('read-only' if mode=='open' else 'no space') in text,text
    assert _lab_log['rows']==0
    assert closed==([] if mode=='open' else [True]),closed
`);
});

test('missing named CSV does not mask ENOENT with an unmounted legacy-root ENODEV',()=>{
 py(`import sys,types,asyncio,io,contextlib
reader=${JSON.stringify(recordingReader('Encoder_1','1234567890abcdef12345678'))}
runloop=types.ModuleType('runloop');runloop.run=lambda task:asyncio.run(task);sys.modules['runloop']=runloop
for primary,legacy in [(2,19),(2,2),(19,2),(13,19),(2,13)]:
    calls=[]
    def open_file(path,mode):
        calls.append(path)
        raise OSError(primary if path.startswith('/flash/') else legacy,'test storage error')
    output=io.StringIO()
    with contextlib.redirect_stdout(output):exec(reader,{'open':open_file})
    result=output.getvalue()
    if primary==2 and legacy in (2,19):assert ':ERROR:SBL_NOT_FOUND:Encoder_1' in result,result
    else:assert 'SBL_NOT_FOUND' not in result and ':ERROR:' in result,result
    assert len(calls)==(2 if primary==2 else 1),calls
`);
 const receiver=new RecordingReceiver('1234567890abcdef12345678');
 receiver.push('SBLCSV:1234567890abcdef12345678:ERROR:SBL_NOT_FOUND:Encoder_1\n');
 assert.ok(receiver.finished);assert.equal(receiver.bytes,null);
 assert.match(receiver.error.message,/記録「Encoder_1」が見つかりません/);
 assert.match(receiver.error.message,/同じ記録名/);
});

test('recording buffers captured timestamps with no file operations until motors stop',()=>{
 py(`import types,io,csv
clock=[100];time=types.SimpleNamespace(ticks_ms=lambda:clock[0],ticks_diff=lambda a,b:a-b)
def _lab_csv(x):return '"'+str(x).replace('"','""')+'"'
${EXTRA_RUNTIME.replace('_lab_native_drive = _lab_drive','_lab_native_drive = None').replace('_lab_native_turn = _lab_turn','_lab_native_turn = None').replace('_lab_native_pair = _lab_pair','_lab_native_pair = None')}
files=[]
class File(io.BytesIO):
    def flush(self):files.append('flush')
    def close(self):files.append(self.getvalue());super().close()
def open(path,mode):
    assert not _lab_active_motors
    files.append((path,mode));return File()
_lab_log_start('Buffered');assert files==[]
_lab_active_motors[0]={'bounded':False}
for ms,value in [(150,11),(250,22)]:clock[0]=ms;_lab_log_value('A',value)
assert files==[]
try:_lab_log_end();raise AssertionError('wrote while moving')
except ValueError:pass
assert files==[]
_lab_active_motors.clear();clock[0]=5000;_lab_log_end()
assert files[0]==('/flash/sbl_Buffered.csv','wb') and files[1]=='flush'
rows=list(csv.DictReader(io.StringIO(files[2].decode())))
assert [float(r['time_s']) for r in rows]==[.05,.15],rows
assert [r['value'] for r in rows]==['11','22']
assert not _lab_log
`);
});

test('motion snapshots group nine values under capture time and bound memory without corrupting earlier rows',()=>{
 py(`import types
clock=[0];time=types.SimpleNamespace(ticks_ms=lambda:clock[0],ticks_diff=lambda a,b:a-b)
def _lab_csv(x):return '"'+str(x).replace('"','""')+'"'
def _lab_range(x,a,b):
    if not a<=x<=b:raise ValueError()
    return x
${EXTRA_RUNTIME.replace('_lab_native_drive = _lab_drive','_lab_native_drive = None').replace('_lab_native_turn = _lab_turn','_lab_native_turn = None').replace('_lab_native_pair = _lab_pair','_lab_native_pair = None')}
def _lab_motion_ports():return (1,0)
motor=types.SimpleNamespace(relative_position=lambda p:-20 if p==1 else 20,velocity=lambda p:-210 if p==1 else 200)
_lab_log_start('Motion');_lab_trace_motion(100)
_lab_active_motors.update({1:{'command':-210,'phase':1},0:{'command':210,'phase':1}})
clock[0]=100;_lab_capture_motion();assert _lab_log['rows']==9
clock[0]=150;_lab_capture_motion();assert _lab_log['rows']==9
clock[0]=200;_lab_capture_motion();assert _lab_log['rows']==18
text=bytes(_lab_log['buffer'][:_lab_log['size']]).decode().splitlines()
assert all(float(line.split(',')[0])==.1 for line in text[1:10]),text
assert '"phase","1"' in text[8] and '"sample_span_ms","0"' in text[9],text
for interval in [0,19,1001,50.5]:
    try:_lab_trace_motion(interval);raise AssertionError(interval)
    except ValueError:pass
_lab_log['trace']=None
for i in range(982):_lab_log_value('x',1)
assert _lab_log['rows']==1000
before=bytes(_lab_log['buffer'])
try:_lab_log_value('x',1);raise AssertionError('accepted row overflow')
except ValueError:pass
assert bytes(_lab_log['buffer'])==before and _lab_log['rows']==1000
_lab_active_motors.clear();_lab_log.clear();_lab_log_start('Bytes');_lab_log['size']=32760
before=bytes(_lab_log['buffer'])
try:_lab_log_value('x',123456789);raise AssertionError('accepted byte overflow')
except ValueError:pass
assert bytes(_lab_log['buffer'])==before and len(_lab_log['buffer'])==32768
`);
});

test('all three diagnostic samples run, capture ramp phases, then save only after motors stop',()=>{
 const sources={};for(const name of ['syncNone','syncTrap','syncS']){const ws=new Blockly.Workspace();try{Blockly.serialization.workspaces.load(classroomSample(name),ws);sources[name]=generateStandard(ws,pythonGenerator).source;}finally{ws.dispose();}}
 const script=`import json,sys,types,asyncio,time,io,csv
for name,source in json.load(sys.stdin).items():
    clock=[0];pos={p:0.0 for p in range(6)};speed={p:0 for p in range(6)};files={};events=[]
    for mod in ['runloop','motor','motor_pair','distance_sensor','color_sensor','force_sensor','color','hub']:sys.modules[mod]=types.ModuleType(mod)
    hub=sys.modules['hub'];hub.port=types.SimpleNamespace(**{c:i for i,c in enumerate('ABCDEF')});hub.sound=types.SimpleNamespace(stop=lambda:None);hub.light_matrix=hub.light=hub.button=hub.motion_sensor=types.SimpleNamespace()
    async def beep(*args):pass
    hub.sound.beep=beep
    motor=sys.modules['motor'];motor.BRAKE=1;motor.READY=0
    motor.relative_position=lambda p:int(pos[p]);motor.velocity=lambda p:int(speed[p]*(.9 if p==1 else 1))
    motor.run=lambda p,v:speed.__setitem__(p,v);motor.stop=lambda p,**kw:speed.__setitem__(p,0)
    pair=sys.modules['motor_pair'];pair.PAIR_1=0;pair.pair=lambda *args:None
    async def sleep(ms):
        clock[0]+=ms
        if clock[0]>30000:raise AssertionError('sample did not finish')
        for p in pos:pos[p]+=speed[p]*ms/1000*(.9 if p==1 else 1)
        await asyncio.sleep(0)
    async def gather(*tasks):await asyncio.gather(*tasks)
    sys.modules['runloop'].sleep_ms=sleep;sys.modules['runloop'].run=lambda *tasks:asyncio.run(gather(*tasks))
    time.ticks_ms=lambda:clock[0];time.ticks_diff=lambda a,b:a-b
    class File(io.BytesIO):
        def close(self):files['data']=self.getvalue();super().close()
    def open_file(path,mode):
        assert all(v==0 for v in speed.values()),'file I/O during movement'
        assert path.startswith('/flash/') and mode=='wb'
        events.append(('save',clock[0]));return File()
    exec(compile(source,name,'exec'),{'open':open_file})
    rows=list(csv.DictReader(io.StringIO(files['data'].decode())))
    assert 18<=len(rows)<=1000 and len(rows)%9==0,(name,len(rows))
    assert len(files['data'])<=32768 and len(events)==1
    assert all(v==0 for v in speed.values())
    assert max(abs(v) for v in pos.values())>600
    for i in range(0,len(rows),9):assert len(set(r['time_s'] for r in rows[i:i+9]))==1
    phases=set(int(r['value']) for r in rows if r['label']=='phase')
    assert {0,2}<=phases if name=='syncNone' else {0,1,2,3}<=phases,(name,phases)
    print(name,len(rows),'rows',len(files['data']),'bytes',sorted(phases))
`;
 const result=spawnSync('python',['-c',script],{input:JSON.stringify(sources),encoding:'utf8',env:{...process.env,PYTHONUTF8:'1'}});assert.equal(result.status,0,result.stderr);
});
