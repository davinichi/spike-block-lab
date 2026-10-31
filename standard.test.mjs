import {test} from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import * as Blockly from 'blockly';
import {pythonGenerator} from 'blockly/python';
import {setupClassroom,classroomToolbox,STANDARD_TYPES} from './classroom-blocks.js';
import {classroomSample,SAMPLE_NAMES} from './classroom-samples.js';
import {generateStandard} from './standard.js';
import {validateProject} from './model.js';
import {parseDevices} from './spike-ble.js';
setupClassroom(Blockly);
const generate=name=>{const ws=new Blockly.Workspace();try{Blockly.serialization.workspaces.load(classroomSample(name),ws);return generateStandard(ws,pythonGenerator);}finally{ws.dispose();}};
test('all advertised classroom blocks construct and serialize using the real Blockly library',()=>{
  const types=new Set(STANDARD_TYPES);function visit(x){if(x.type)types.add(x.type);for(const item of x.contents??[])visit(item);}visit(classroomToolbox());
  for(const type of types){const ws=new Blockly.Workspace();try{const b=ws.newBlock(type);const p={format:'spike-block-lab',version:1,name:'test',language:'standard',workspace:Blockly.serialization.workspaces.save(ws)};validateProject(p);assert.ok(b);}finally{ws.dispose();}}
});
test('all ten standard-Hub-OS samples generate Python after project save and reload',()=>{
  const sources=[];
  for(const name of Object.keys(SAMPLE_NAMES)) {
    const ws=new Blockly.Workspace(),again=new Blockly.Workspace();
    try {
      Blockly.serialization.workspaces.load(classroomSample(name),ws);
      const saved=Blockly.serialization.workspaces.save(ws);validateProject({format:'spike-block-lab',version:1,name,language:'standard',workspace:saved});
      Blockly.serialization.workspaces.load(saved,again);
      const result=generateStandard(again,pythonGenerator);assert.ok(result.count>1);assert.doesNotMatch(result.source,/from numbers|from app|ev3|\.rbf/);
      sources.push(result.source);
    }finally{ws.dispose();again.dispose();}
  }
  const py=process.platform==='win32'?'python':'python3';
  const result=spawnSync(py,['-c','import ast,json,sys\nfor source in json.load(sys.stdin): ast.parse(source)'],{input:JSON.stringify(sources),encoding:'utf8'});
  assert.equal(result.status,0,result.stderr);
});
test('My Block calls await async definitions and preserve input arguments',()=>{
  const source=generate('myblock').source;
  assert.match(source,/async def _E5/);assert.match(source,/await _E5[^\n]+\(10\)/);assert.match(source,/await _lab_drive\(20, _E8/);
});
test('parallel roots share one final cleanup and variable-change code uses MicroPython builtins',()=>{
  const parallel=generate('parallel');assert.equal(parallel.threads,2);
  assert.match(parallel.source,/runloop.run\(_lab_task_0\(\), _lab_task_1\(\)\)/);
  assert.equal(parallel.source.match(/finally:\n    _lab_stop_all\(\)/g).length,1);
  assert.match(generate('variables').source,/isinstance\([^\n]+\(int, float\)\)/);
});
test('generated standard programs execute variable, My Block and parallel control using a simulated Hub API',()=>{
  const sources=Object.fromEntries(['variables','myblock','parallel','motor','sound'].map(name=>[name,generate(name).source]));
  const harness=`import asyncio,json,sys,types,time
sources=json.load(sys.stdin)
for name,source in sources.items():
    calls=[]
    async def pause(ms): await asyncio.sleep(0)
    async def completed(*args,**kwargs): calls.append(('move',args)); await asyncio.sleep(0); return 0
    async def text(value): calls.append(('text',value)); await asyncio.sleep(0)
    async def gather(*coroutines): await asyncio.gather(*coroutines)
    def stop(*args,**kwargs): calls.append(('stop',args))
    for module_name in ['motor','motor_pair','distance_sensor','color_sensor','force_sensor','color']:
        sys.modules[module_name]=types.ModuleType(module_name)
    motor=sys.modules['motor'];motor.READY=0;motor.run_for_time=completed;motor.run_for_degrees=completed;motor.stop=stop
    pair=sys.modules['motor_pair'];pair.PAIR_1=1;pair.pair=lambda *args:calls.append(('pair',args));pair.move_for_time=completed;pair.move_for_degrees=completed
    runloop=types.ModuleType('runloop');runloop.sleep_ms=pause;runloop.run=lambda *c:asyncio.run(gather(*c));sys.modules['runloop']=runloop
    hub=types.ModuleType('hub');hub.port=types.SimpleNamespace(**{c:i for i,c in enumerate('ABCDEF')})
    hub.light_matrix=types.SimpleNamespace(write=text,set_pixel=lambda *args:None)
    hub.sound=types.SimpleNamespace(beep=completed,stop=lambda:None)
    hub.light=hub.button=hub.motion_sensor=types.SimpleNamespace()
    sys.modules['hub']=hub
    time.ticks_ms=lambda:0;time.ticks_diff=lambda a,b:a-b
    exec(compile(source,name,'exec'),{})
    if name=='variables': assert [c[1] for c in calls if c[0]=='text']==['1','2','3'],calls
    if name=='myblock': assert len([c for c in calls if c[0]=='move'])==1,calls
    if name=='parallel': assert len([c for c in calls if c[0]=='move'])==1,calls
    assert len([c for c in calls if c[0]=='stop'])==6,calls
`;
  const result=spawnSync(process.platform==='win32'?'python':'python3',['-c',harness],{input:JSON.stringify(sources),encoding:'utf8'});
  assert.equal(result.status,0,result.stderr);
});
test('device notifications decode signed distance, motor position and port IDs without treating no target as zero',()=>{
  const bytes=Uint8Array.of(0x3c,16,0,10,0,0,0,0,0,0,0,0x98,0xfe,0xff,0xff,13,3,0xff,0xff);
  const readings=parseDevices(bytes);
  assert.equal(readings[0].port,'A');assert.match(readings[0].text,/-360°/);
  assert.equal(readings[1].port,'D');assert.equal(readings[1].text,'測定できません');
  assert.throws(()=>parseDevices(bytes.slice(0,-1)),/サイズ/);
});
