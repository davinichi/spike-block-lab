import {test} from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import * as Blockly from 'blockly';
import {pythonGenerator} from 'blockly/python';
import {setupClassroom,classroomToolbox} from './classroom-blocks.js';
import {classroomSample} from './classroom-samples.js';
import {generateStandard} from './standard.js';
setupClassroom(Blockly);
function source(state=classroomSample('pidRecording')){const w=new Blockly.Workspace(),again=new Blockly.Workspace();try{Blockly.serialization.workspaces.load(state,w);Blockly.serialization.workspaces.load(Blockly.serialization.workspaces.save(w),again);return generateStandard(again,pythonGenerator).source;}finally{w.dispose();again.dispose();}}
function py(code,input){const r=spawnSync('python',['-X','utf8','-c',code],{input:JSON.stringify(input),encoding:'utf8',timeout:20000});assert.equal(r.status,0,r.stderr);return r.stdout;}
const harness=String.raw`
import ast,asyncio,csv,io,json,statistics,types,sys
original=json.load(sys.stdin)
names={'_lab_tick','_lab_pause','_lab_range','_lab_number','_lab_pid','_lab_log_start','_lab_log_append','_lab_log_row','_lab_log_value','_lab_log_pid','_lab_log_end','_lab_string','_lab_csv','_lab_task_0'}
def setup(source=original,old=False):
    clock=[0];commands=[];saved=[];stopped=[];sleeps=[];background=[0]
    scope={'time':types.SimpleNamespace(ticks_ms=lambda:clock[0],ticks_diff=lambda a,b:((a-b+(1<<29))%(1<<30))-(1<<29)), '_lab_yield_at':0,'_lab_log':{},'_lab_pid_state':{},'_lab_active_motors':{},'port':types.SimpleNamespace(A=0,B=1,F=5),'motor':types.SimpleNamespace(BRAKE=1),'color_sensor':types.SimpleNamespace(reflection=lambda p:60+(len(commands)%5)), '_lab_set_motion_pair':lambda *args:None,'_lab_motion_ports':lambda:(1,0),'_lab_tank_run':lambda *args:commands.append((clock[0],args)), '_lab_stop_port':lambda *args:stopped.append(args)}
    class File(io.BytesIO):
        def close(self):saved.append(self.getvalue());super().close()
    def opened(path,mode):
        assert stopped,'file write before motor stop'
        return File()
    scope['open']=opened
    async def sleep(ms):
        sleeps.append(ms);clock[0]=(clock[0]+ms)%(1<<30);await asyncio.sleep(0)
    scope['runloop']=types.SimpleNamespace(sleep_ms=sleep)
    tree=ast.parse(source)
    exec(compile(ast.Module(body=[n for n in tree.body if isinstance(n,(ast.FunctionDef,ast.AsyncFunctionDef)) and n.name in names],type_ignores=[]),'generated','exec'),scope)
    if old:
        async def tick(force=True):await sleep(10)
        scope['_lab_tick']=tick
    return scope,clock,commands,saved,stopped,sleeps,background
`;

test('saved PID sample batches four values after the motor command while the public palette hides the debug block',()=>{
 const s=source();assert.match(s,/_lab_log_pid\(100,/);assert.ok(s.lastIndexOf('_lab_tank_run(')<s.lastIndexOf('_lab_log_pid('));
 assert.ok(!classroomToolbox().contents.find(c=>c.name==='記録').contents.some(b=>b.type==='lab_log_pid'));
});

test('generated PID loop has no per-statement fixed sleep, preserves explicit delay and cooperates with other tasks',()=>{
 const s=source();
 const result=py(harness+String.raw`
async def main():
    reports={}
    for mode in ['snapshot','legacy4','none','old_legacy4']:
        src=original
        line=next(line for line in src.splitlines() if line.strip().startswith('_lab_log_pid(100,'))
        call=ast.parse(line.strip()).body[0].value
        args=[ast.unparse(a) for a in call.args[1:]]
        if 'legacy4' in mode:
            replacement=('\n        await _lab_tick(False)\n        ').join('_lab_log_value('+repr(k)+', '+v+')' for k,v in zip(['reflection','pid','left_cmd','right_cmd'],args))
            src=src.replace(line,'        '+replacement)
        elif mode=='none':src=src.replace(line,'        pass')
        env,clock,commands,saved,stopped,sleeps,bg=setup(src,mode=='old_legacy4')
        done=[False]
        async def observer():
            while not done[0]:
                bg[0]+=1;await asyncio.sleep(0)
        async def task():
            try:await env['_lab_task_0']()
            finally:done[0]=True
        await asyncio.gather(task(),observer())
        gaps=[b[0]-a[0] for a,b in zip(commands,commands[1:])]
        reports[mode]=statistics.median(gaps)
        assert len(stopped)==2 and bg[0]>10 and len(saved)==1
        if mode!='old_legacy4':assert reports[mode]==21,reports
        if mode=='snapshot':
            rows=list(csv.DictReader(io.StringIO(saved[0].decode())))
            assert 100<len(rows)<200,len(rows)
            for i in range(0,len(rows),5):
                group=rows[i:i+5];assert len({r['time_s'] for r in group})==1
                assert [r['label'] for r in group]==['reflection','pid','left_cmd','right_cmd','control_interval_ms']
                assert abs(float(group[2]['value'])+float(group[3]['value'])-36)<1e-9
            assert rows[4]['value']==''
            assert all(float(rows[i]['value'])==21 for i in range(9,len(rows),5))
    assert reports['old_legacy4']>=140,reports
    print(json.dumps(reports))
asyncio.run(main())
`,s);console.log('Simulated loop intervals (ms):',result.trim());
});

test('cooperative checkpoints yield only after a CPU budget, including clock wrap; tight loops can be interrupted',()=>{
 py(harness+String.raw`
async def main():
    env,clock,commands,saved,stopped,sleeps,bg=setup()
    tick=env['_lab_tick']
    for _ in range(50):await tick(False)
    assert sleeps==[]
    clock[0]=5;await tick(False);assert sleeps==[1]
    await tick();assert sleeps==[1,1]
    clock[0]=(1<<30)-2;env['_lab_yield_at']=clock[0];clock[0]=4;await tick(False);assert sleeps==[1,1,1]
    count=[0];interrupt=[False]
    async def tight():
        while not interrupt[0]:
            count[0]+=1;await tick()
    async def stop():
        for _ in range(5):await asyncio.sleep(0)
        interrupt[0]=True
    await asyncio.gather(tight(),stop())
    assert 1<=count[0]<100
    # A long straight chain also yields without relying on a loop guard.
    before=len(sleeps)
    for _ in range(50):clock[0]+=1;await tick(False)
    assert len(sleeps)>before
asyncio.run(main())
`,source());
});

test('PID snapshots decimate without sleeping, report call intervals, reset and reject invalid or overflowing groups atomically',()=>{
 py(harness+String.raw`
env,clock,commands,saved,stopped,sleeps,bg=setup()
start,record=env['_lab_log_start'],env['_lab_log_pid']
try:record(100,1,2,3,4);raise AssertionError('missing start')
except ValueError:pass
start('LinePID');log=env['_lab_log']
for t in [0,20,40,60,80,100,120]:clock[0]=t;record(100,66,.5,18.5,17.5)
assert log['rows']==10 and sleeps==[] and saved==[]
rows=list(csv.DictReader(io.StringIO(bytes(log['buffer'][:log['size']]).decode())))
assert rows[4]['value']=='' and rows[9]['value']=='20'
assert {r['time_s'] for r in rows[:5]}=={'0.0'}
assert {r['time_s'] for r in rows[5:]}=={'0.1'}
for args in [(19,1,2,3,4),(60001,1,2,3,4),(20.5,1,2,3,4),(100,float('nan'),2,3,4)]:
    before=(log['rows'],log['size'],bytes(log['buffer']))
    try:record(*args);raise AssertionError('invalid')
    except ValueError:pass
    assert before==(log['rows'],log['size'],bytes(log['buffer']))
clock[0]=220;log['rows']=998;before=bytes(log['buffer'])
try:record(100,1,2,3,4);raise AssertionError('overflow')
except ValueError:pass
assert log['rows']==998 and bytes(log['buffer'])==before
log['rows']=10;log['size']=32760;before=bytes(log['buffer'])
try:record(100,1,2,3,4);raise AssertionError('bytes overflow')
except ValueError:pass
assert log['rows']==10 and bytes(log['buffer'])==before
log.clear();start('Again');record(100,1,2,3,4)
assert log['rows']==5 and log['pid_call']==clock[0]
`,source());
});

test('120 second PID run can log at 1000ms within the existing CSV limits while control remains at 21ms in simulation',()=>{
 py(harness+String.raw`
src=original.replace(') > 3:',') > 120:').replace('_lab_log_pid(100,','_lab_log_pid(1000,')
env,clock,commands,saved,stopped,sleeps,bg=setup(src)
asyncio.run(env['_lab_task_0']())
rows=list(csv.DictReader(io.StringIO(saved[0].decode())))
assert len(rows)==600,len(rows)
assert len(saved[0])<32768,len(saved[0])
assert len(commands)>5500 and max(b[0]-a[0] for a,b in zip(commands,commands[1:]))==21
print('120s snapshot rows:',len(rows),'bytes:',len(saved[0]))
`,source());
});
