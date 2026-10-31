import {test} from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import * as Blockly from 'blockly';
import {pythonGenerator} from 'blockly/python';
import {setupClassroom,classroomToolbox} from './classroom-blocks.js';
import {classroomSample} from './classroom-samples.js';
import {generateStandard} from './standard.js';
import {COMMON_TYPES} from './common-blocks.js';
setupClassroom(Blockly);
const palette=classroomToolbox().contents.flatMap(c=>c.contents??[]).filter(b=>b.kind==='block');
function program(block){return {blocks:{languageVersion:0,blocks:[{type:'spike_start',next:{block}}]}};}
function generate(state){const ws=new Blockly.Workspace();try{Blockly.serialization.workspaces.load(state,ws);return generateStandard(ws,pythonGenerator).source;}finally{ws.dispose();}}
const python=(script,data)=>{const result=spawnSync(process.platform==='win32'?'python':'python3',['-c',script],{input:JSON.stringify(data),encoding:'utf8',env:{...process.env,PYTHONUTF8:'1'}});assert.equal(result.status,0,result.stderr);};
test('categories follow EV3 order, motion separates straight drives and spin/pivot turns',()=>{
  assert.deepEqual(classroomToolbox().contents.map(c=>c.name),['スタート','イベント','モーター','動き','センサー','音','制御','演算','表示','ランプ','データ','記録','変数','マイブロック','引数']);
  const types=classroomToolbox().contents.find(c=>c.name==='動き').contents.map(b=>b.type);
  for(const type of ['lab_drive_forward','lab_drive_backward','lab_spin_right','lab_spin_left','lab_pivot_right','lab_pivot_left'])assert.ok(types.includes(type));
  assert.ok(!types.includes('lab_drive'));assert.ok(!types.includes('lab_pair'));
  const ws=new Blockly.Workspace();try{const block=ws.newBlock('lab_drive_forward');assert.ok(block.getField('PORTS').getOptions().some(o=>o[1]==='B,A'));}finally{ws.dispose();}
});
test('every new palette instruction and expression generates valid Python',()=>{
  const sources=[];
  for(const entry of palette.filter(b=>COMMON_TYPES.includes(b.type)&&!['lab_return','lab_when_changed'].includes(b.type))){
    const ws=new Blockly.Workspace();try{
      const instance=ws.newBlock(entry.type),expression=!!instance.outputConnection;instance.dispose();
      const state={...entry};delete state.kind;
      sources.push(generate(program(expression?{type:'lab_text',inputs:{TEXT:{block:state}}}:state)));
    }finally{ws.dispose();}
  }
  sources.push(generate({blocks:{languageVersion:0,blocks:[{type:'lab_when_changed',inputs:{VALUE:{shadow:{type:'math_number',fields:{NUM:0}}}},next:{block:{type:'lab_wait',inputs:{SECONDS:{shadow:{type:'math_number',fields:{NUM:1}}}}}}}]}}));
  python('import ast,json,sys\nfor source in json.load(sys.stdin): ast.parse(source)',sources);
});
test('forward/backward and spin/pivot geometry execute with strict motor-pair signatures',()=>{
  const sources=Object.fromEntries(['lab_drive_forward','lab_drive_backward','lab_spin_right','lab_spin_left','lab_pivot_right','lab_pivot_left'].map(type=>[type,generate(program({...palette.find(b=>b.type===type)}))]));
  python(`import asyncio,json,sys,types,time,math
sources=json.load(sys.stdin)
for name,source in sources.items():
    calls=[]
    motor=types.ModuleType('motor');motor.READY=0;motor.BRAKE=1;motor.stop=lambda *a,**k:calls.append(('stop',a))
    pair=types.ModuleType('motor_pair');pair.PAIR_1=0
    pair.pair=lambda slot,left,right:calls.append(('pair',left,right))
    async def move(slot,degrees,steering,*,velocity):
        assert degrees!=0 and velocity>0
        calls.append(('drive',degrees,steering,velocity));return 0
    async def tank(slot,degrees,left_velocity,right_velocity,*,stop):
        calls.append(('turn',degrees,left_velocity,right_velocity));return 0
    pair.move_for_degrees=move;pair.move_tank_for_degrees=tank
    sys.modules['motor']=motor;sys.modules['motor_pair']=pair
    for mod in ['distance_sensor','color_sensor','force_sensor','color']:sys.modules[mod]=types.ModuleType(mod)
    async def pause(ms):pass
    async def all_tasks(*tasks):await asyncio.gather(*tasks)
    runloop=types.ModuleType('runloop');runloop.sleep_ms=pause;runloop.run=lambda *tasks:asyncio.run(all_tasks(*tasks));sys.modules['runloop']=runloop
    hub=types.ModuleType('hub');hub.port=types.SimpleNamespace(**{c:i for i,c in enumerate('ABCDEF')});hub.sound=types.SimpleNamespace(stop=lambda:None)
    hub.light_matrix=hub.light=hub.button=hub.motion_sensor=types.SimpleNamespace();sys.modules['hub']=hub
    time.ticks_ms=lambda:0;time.ticks_diff=lambda a,b:a-b
    exec(compile(source,name,'exec'),{})
    if name.startswith('lab_drive'):
        move=next(c for c in calls if c[0]=='drive')
        expected=int(20*10*360/(math.pi*56))
        assert move[1]==(-expected if name.endswith('backward') else expected),calls
        assert move[2:]==(0,210),calls
    else:
        turn=next(c for c in calls if c[0]=='turn')
        assert turn[1]==(360 if 'pivot' in name else 180),calls
        assert turn[2:]==((210,0) if name=='lab_pivot_right' else (0,210) if name=='lab_pivot_left' else (210,-210) if name=='lab_spin_right' else (-210,210)),calls
    assert len([c for c in calls if c[0]=='stop'])>=6,calls
`,sources);
});
test('new named data and PID helpers preserve state and reject invalid list indices',()=>{
  python(`import json,sys,types,time
source=json.load(sys.stdin)
for mod in ['runloop','motor','motor_pair','distance_sensor','color_sensor','force_sensor','color','hub']:sys.modules[mod]=types.ModuleType(mod)
hub=sys.modules['hub'];hub.port=types.SimpleNamespace(**{c:i for i,c in enumerate('ABCDEF')})
hub.sound=types.SimpleNamespace(stop=lambda:None);hub.light_matrix=hub.light=hub.button=hub.motion_sensor=types.SimpleNamespace()
sys.modules['motor'].stop=lambda p:None
def consume(*tasks):
    for task in tasks:task.close()
sys.modules['runloop'].run=consume
clock=[1000];time.ticks_ms=lambda:clock[0];time.ticks_diff=lambda a,b:a-b
scope={};exec(source,scope)
items=scope['_lab_list'];pid=scope['_lab_pid']
items('one','add',0,3,'sum');items('one','add',0,7,'sum')
assert items('one','stat',0,0,'average')==5
items('one','set',2,9,'sum');assert items('one','item',2,0,'sum')==9
assert items('two','length',0,0,'sum')==0
for index in [0,3,1.5]:
    try:items('one','item',index,0,'sum');raise AssertionError(index)
    except ValueError:pass
assert pid('p',10,4,2,1,1)==12
clock[0]=2000
assert pid('p',10,5,2,1,1)==14
assert scope['_lab_csv']('a,"b')=='"a,""b"'
`,generate(classroomSample('sound')));
});
test('new port checks reject conflicting devices and invalid My Block return/arguments',()=>{
  assert.throws(()=>generate(program({type:'lab_spin_left',fields:{LEFT:'A',RIGHT:'A'}})),/違う2個/);
  assert.throws(()=>generate(program({type:'lab_return'})),/定義/);
  assert.throws(()=>generate(program({type:'lab_text',inputs:{TEXT:{block:{type:'lab_argument',extraState:{name:'距離'}}}}})),/引数/);
});

