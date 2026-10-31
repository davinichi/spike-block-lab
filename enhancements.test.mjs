import {test} from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import * as Blockly from 'blockly';
import {pythonGenerator} from 'blockly/python';
import {setupClassroom} from './classroom-blocks.js';
import {generateStandard} from './standard.js';
import {EXTRA_RUNTIME} from './enhancements.js';
import {RecordingReceiver,recordingReader} from './recording.js';
setupClassroom(Blockly);
const py=script=>{const result=spawnSync(process.platform==='win32'?'python':'python3',['-c',script],{encoding:'utf8',env:{...process.env,PYTHONUTF8:'1'}});assert.equal(result.status,0,result.stderr);};
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
test('managed motion keeps target on speed change, applies ramp, sync and configured stop',()=>{
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
def _lab_speed(x):return int(_lab_range(x,-100,100)*10.5)
${EXTRA_RUNTIME.replace('_lab_native_drive = _lab_drive','_lab_native_drive = None').replace('_lab_native_turn = _lab_turn','_lab_native_turn = None').replace('_lab_native_pair = _lab_pair','_lab_native_pair = None')}
async def test():
    _lab_set_ramp('s',0.2,0.2)
    _lab_stop_modes[0]=2
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
def open(path,mode):return real_open(folder.name+'/'+path.split('/')[-1],mode,**({'encoding':'utf-8'} if 'b' not in mode else {}))
time=types.SimpleNamespace(ticks_ms=lambda:1200,ticks_diff=lambda a,b:a-b)
def _lab_range(x,a,b):
    if not a<=x<=b:raise ValueError()
    return x
def _lab_csv(x):return '"'+str(x).replace('"','""')+'"'
${EXTRA_RUNTIME.replace('_lab_native_drive = _lab_drive','_lab_native_drive = None').replace('_lab_native_turn = _lab_turn','_lab_native_turn = None').replace('_lab_native_pair = _lab_pair','_lab_native_pair = None')}
_lab_log_start('Record1');_lab_log_value('a,"b','温度');_lab_log_end()
assert '"a,""b","温度"' in open('/sbl_Record1.csv','r').read()
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
