import {test} from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import * as B from 'blockly';
import {pythonGenerator} from 'blockly/python';
import {setupClassroom} from './classroom-blocks.js';
import {saveMyBlock} from './myblocks.js';
import {generateStandard} from './standard.js';
setupClassroom(B);
function program(){const w=new B.Workspace();try{
 const n=NUM=>({shadow:{type:'math_number',fields:{NUM}}});const def=saveMyBlock(B,w,'距離センサ',[{name:'スピード'},{name:'距離'}]);const params=def.getVarModels();const arg=i=>({block:{type:'lab_argument',extraState:{name:params[i].getName(),parameterId:params[i].getId()}}});
 const loop=B.serialization.blocks.append({type:'controls_whileUntil',fields:{MODE:'WHILE'},inputs:{BOOL:{block:{type:'lab_distance_compare',fields:{PORT:'C',OP:'GT'},inputs:{VALUE:arg(1)}}},DO:{block:{type:'lab_steering_run',inputs:{TURN:n(0),SPEED:arg(0)}}}}},w);def.getInput('STACK').connection.connect(loop.previousConnection);
 B.serialization.blocks.append({type:'spike_start',next:{block:{type:'lab_pair',fields:{LEFT:'B',RIGHT:'A'},next:{block:{type:'procedures_callnoreturn',extraState:{name:'距離センサ',params:params.map(p=>p.getName())},inputs:{ARG0:n(50),ARG1:n(15)}}}}}},w);
 const saved=B.serialization.workspaces.save(w);w.clear();B.serialization.workspaces.load(saved,w);return generateStandard(w,pythonGenerator).source;
}finally{w.dispose();}}
const harness=String.raw`
import sys,json,types,time,asyncio,operator
source=json.load(sys.stdin)
def load(values,execute=False):
    queue=list(values);reads=[];runs=[];stops=[];clock=[0]
    for name in ['runloop','motor','motor_pair','distance_sensor','color_sensor','force_sensor','color','hub']:sys.modules[name]=types.ModuleType(name)
    hub=sys.modules['hub'];hub.port=types.SimpleNamespace(**{c:i for i,c in enumerate('ABCDEF')});hub.sound=types.SimpleNamespace(stop=lambda:None)
    hub.light_matrix=hub.light=hub.button=hub.motion_sensor=types.SimpleNamespace()
    motor=sys.modules['motor'];motor.READY=0;motor.BRAKE=1;motor.relative_position=lambda p:0;motor.run=lambda p,v:runs.append((len(reads),p,v));motor.stop=lambda p,**kw:stops.append(p)
    pair=sys.modules['motor_pair'];pair.PAIR_1=0;pair.pair=lambda *args:None
    def distance(p):
        assert queue,'unexpected extra sensor read'
        value=queue.pop(0);reads.append((p,value))
        if isinstance(value,Exception):raise value
        return value
    sys.modules['distance_sensor'].distance=distance
    async def pause(ms):clock[0]+=ms;await asyncio.sleep(0)
    async def main(*tasks):await asyncio.gather(*tasks)
    def run(*tasks):
        tasks[0].close()
        if execute:asyncio.run(main(*tasks[1:]))
        else:
            for task in tasks[1:]:task.close()
    sys.modules['runloop'].sleep_ms=pause;sys.modules['runloop'].run=run
    time.ticks_ms=lambda:clock[0];time.ticks_diff=lambda a,b:a-b
    scope={};exec(source,scope)
    return scope,reads,runs,stops
`;
function py(body){const r=spawnSync('python',['-X','utf8','-c',harness+body],{input:JSON.stringify(program()),encoding:'utf8',timeout:15000});assert.equal(r.status,0,r.stderr);}
test('distance comparisons read once and consistently compare a valid cm value or no target',()=>{
 py(String.raw`
ops={'LT':operator.lt,'LTE':operator.le,'EQ':operator.eq,'GT':operator.gt,'GTE':operator.ge,'NEQ':operator.ne}
for raw in [0,140,150,160,2000,-1,None]:
    for op,compare in ops.items():
        scope,reads,runs,stops=load([raw])
        result=scope['_lab_distance_compare'](2,op,15)
        expected=compare(float('inf') if raw is None or raw<0 else raw/10,15)
        assert result==expected,(raw,op,result,expected)
        assert len(reads)==1,reads
`);
});
test('reported distance My Block starts with no echo and exits at exactly 15cm',()=>{
 py(String.raw`
for empty in [-1,None]:
    scope,reads,runs,stops=load([empty,300,200,150],True)
    assert len(reads)==4,reads
    assert {n for n,p,v in runs}=={1,2,3},runs
    assert all(v!=0 for n,p,v in runs)
    assert {p for n,p,v in runs}=={0,1}
    assert set(stops)==set(range(6)),stops
`);
});
test('distance comparison preserves disconnected-device errors instead of treating them as clear space',()=>{
 py(String.raw`
scope,reads,runs,stops=load([OSError(19,'ENODEV')])
try:scope['_lab_distance_compare'](2,'GT',15);raise AssertionError('ignored missing device')
except OSError as e:assert e.errno==19
assert len(reads)==1
scope,reads,runs,stops=load([100])
for op,threshold in [('bad',15),('GT',float('nan'))]:
    try:scope['_lab_distance_compare'](2,op,threshold);raise AssertionError('invalid input')
    except ValueError:pass
assert not reads
`);
});
