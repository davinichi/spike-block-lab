import {test} from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import * as Blockly from 'blockly';
import {pythonGenerator} from 'blockly/python';
import {setupClassroom} from './classroom-blocks.js';
import {saveMyBlock,configureMyBlockBlocks} from './myblocks.js';
import {generateStandard} from './standard.js';
import {validateProject} from './model.js';
setupClassroom(Blockly);configureMyBlockBlocks(Blockly,()=>{});
const n=x=>({shadow:{type:'math_number',fields:{NUM:x}}});
const text=b=>({type:'lab_text',inputs:{TEXT:{block:b}}});
const chain=items=>items.reduceRight((next,b)=>({...b,...(next?{next:{block:next}}:{})}),null);
function append(ws,state){return Blockly.serialization.blocks.append(state,ws);}
function fixture(ws,outputs=['合計','差']){
 const def=saveMyBlock(Blockly,ws,'計算',[{name:'a'},{name:'b'}],null,true,outputs);
 const args=def.getVarModels().map(m=>({name:m.getName(),id:m.getId()}));
 for(let i=0;i<outputs.length;i++){
  const expr=append(ws,{type:i?'lab_op_sub':'lab_op_add',inputs:{A:{block:{type:'lab_argument',extraState:{name:args[0].name,parameterId:args[0].id}}},B:{block:{type:'lab_argument',extraState:{name:args[1].name,parameterId:args[1].id}}}}});
  def.getInput(i?'RETURN'+i:'RETURN').connection.connect(expr.outputConnection);
 }
 return {def,args};
}
function execute(source){
 const script=`import asyncio,json,sys,types,time
source=json.load(sys.stdin);values=[]
for mod in ['motor','motor_pair','distance_sensor','color_sensor','force_sensor','color']:sys.modules[mod]=types.ModuleType(mod)
sys.modules['motor'].stop=lambda *a,**k:None
async def write(value):values.append(value)
hub=types.ModuleType('hub');hub.port=types.SimpleNamespace(**{c:i for i,c in enumerate('ABCDEF')});hub.sound=types.SimpleNamespace(stop=lambda:None)
hub.light_matrix=types.SimpleNamespace(write=write);hub.light=hub.button=hub.motion_sensor=types.SimpleNamespace();sys.modules['hub']=hub
async def pause(ms):await asyncio.sleep(0)
async def all_tasks(*tasks):await asyncio.gather(*tasks)
runloop=types.ModuleType('runloop');runloop.sleep_ms=pause;runloop.run=lambda *tasks:asyncio.run(all_tasks(*tasks));sys.modules['runloop']=runloop
time.ticks_ms=lambda:0;time.ticks_diff=lambda a,b:a-b
exec(compile(source,'generated.py','exec'),{})
print(json.dumps(values))`;
 const result=spawnSync(process.platform==='win32'?'python':'python3',['-c',script],{input:JSON.stringify(source),encoding:'utf8',env:{...process.env,PYTHONUTF8:'1'}});
 assert.equal(result.status,0,result.stderr);return JSON.parse(result.stdout.trim());
}
test('named returns survive project save/reload and execute once for all targets, once per round call',()=>{
 const ws=new Blockly.Workspace();try{
  const {def}=fixture(ws);const count=ws.getVariableMap().createVariable('count');
  const increment=append(ws,{type:'math_change',fields:{VAR:{id:count.getId()}},inputs:{DELTA:n(1)}});def.getInput('STACK').connection.connect(increment.previousConnection);
  const call={type:'lab_call_outputs',extraState:{name:'計算',params:['a','b'],outputs:['合計','差']},inputs:{ARG0:n(8),ARG1:n(5)}};
  const instance=append(ws,call),sum=instance.getField('OUT0').getVariable(),diff=instance.getField('OUT1').getVariable();
  const round={type:'procedures_callreturn',extraState:{name:'計算',params:['a','b'],outputs:['合計','差'],output:1},inputs:{ARG0:n(8),ARG1:n(5)}};
  const start=append(ws,{type:'spike_start',next:{block:chain([text({type:'variables_get',fields:{VAR:{id:sum.getId()}}}),text({type:'variables_get',fields:{VAR:{id:diff.getId()}}}),text({type:'variables_get',fields:{VAR:{id:count.getId()}}}),text(round),text({type:'variables_get',fields:{VAR:{id:count.getId()}}})])}});
  const next=start.getNextBlock();next.unplug();start.nextConnection.connect(instance.previousConnection);instance.nextConnection.connect(next.previousConnection);
  const project={format:'spike-block-lab',version:1,name:'Returns',language:'standard',workspace:Blockly.serialization.workspaces.save(ws)};validateProject(project);
  const copy=new Blockly.Workspace();try{Blockly.serialization.workspaces.load(project.workspace,copy);assert.deepEqual(execute(generateStandard(copy,pythonGenerator).source),['13','3','1','3','2']);}finally{copy.dispose();}
 }finally{ws.dispose();}
});
test('returned definitions support argument reorder/rename while retaining formulas and selected output',()=>{
 const ws=new Blockly.Workspace();try{
  const {def,args}=fixture(ws),formula=def.getInputTargetBlock('RETURN1').id;
  const call=append(ws,{type:'procedures_callreturn',extraState:{name:'計算',params:['a','b'],outputs:['合計','差'],output:1},inputs:{ARG0:n(8),ARG1:n(5)}});
  saveMyBlock(Blockly,ws,'計算変更',[args[1],{...args[0],name:'入力'}],def.id,true,['和','差分']);
  assert.equal(call.getFieldValue('RESULT'),'1');assert.equal(call.getInputTargetBlock('ARG0').getFieldValue('NUM'),5);assert.equal(def.getInputTargetBlock('RETURN1').id,formula);
  assert.deepEqual(call.returnNames_,['和','差分']);
  const state=Blockly.serialization.workspaces.save(ws),copy=new Blockly.Workspace();try{Blockly.serialization.workspaces.load(state,copy);assert.equal(copy.getBlockById(call.id).getFieldValue('RESULT'),'1');}finally{copy.dispose();}
 }finally{ws.dispose();}
});
test('return-mode/count/name validation preserves existing work on rejection',()=>{
 const ws=new Blockly.Workspace();try{
  const {def,args}=fixture(ws);const call=append(ws,{type:'procedures_callreturn',extraState:{name:'計算',params:['a','b'],outputs:['合計','差']},inputs:{ARG0:n(1),ARG1:n(2)}});
  const before=JSON.stringify(Blockly.serialization.workspaces.save(ws));
  for(const names of [[],['値','値'],Array.from({length:9},(_,i)=>'値'+i)])assert.throws(()=>saveMyBlock(Blockly,ws,'計算',args,def.id,true,names),/戻り値/);
  assert.throws(()=>saveMyBlock(Blockly,ws,'計算',args,def.id,false),/呼び出し/);
  assert.throws(()=>saveMyBlock(Blockly,ws,'計算',args,def.id,true,['値']),/呼び出し/);
  assert.equal(JSON.stringify(Blockly.serialization.workspaces.save(ws)),before);
  call.dispose();assert.throws(()=>saveMyBlock(Blockly,ws,'計算',args,def.id,true,['値']),/計算ブロック/);
 }finally{ws.dispose();}
});
test('early named return skips remaining commands and numeric output default',()=>{
 const ws=new Blockly.Workspace();try{
  const def=saveMyBlock(Blockly,ws,'早く戻る',[],null,true,['x','y']);
  const early=append(ws,{type:'lab_return_values',extraState:{outputs:['x','y']},inputs:{VALUE0:n(7),VALUE1:n(9)}});def.getInput('STACK').connection.connect(early.previousConnection);
  append(ws,{type:'spike_start',next:{block:text({type:'procedures_callreturn',extraState:{name:'早く戻る',params:[],outputs:['x','y'],output:1}})}});
  assert.deepEqual(execute(generateStandard(ws,pythonGenerator).source),['9']);
 }finally{ws.dispose();}
});
test('one numeric return and nested asynchronous calls evaluate correctly',()=>{
 const ws=new Blockly.Workspace();try{
  const def=saveMyBlock(Blockly,ws,'値',[],null,true,['答え']);def.getInput('RETURN').connection.setShadowState({type:'math_number',fields:{NUM:21}});
  const round={type:'procedures_callreturn',extraState:{name:'値',params:[],outputs:['答え']}};
  append(ws,{type:'spike_start',next:{block:text({type:'lab_op_add',inputs:{A:{block:round},B:{block:structuredClone(round)}}})}});
  assert.deepEqual(execute(generateStandard(ws,pythonGenerator).source),['42']);
  const eight=saveMyBlock(Blockly,ws,'8個',[],null,true,Array.from({length:8},(_,i)=>'値'+i));assert.ok(eight.getInput('RETURN7'));
 }finally{ws.dispose();}
});
test('numeric early return is restricted to definitions and return metadata is bounded',()=>{
 const ws=new Blockly.Workspace();try{
  append(ws,{type:'spike_start',next:{block:{type:'lab_return_value',inputs:{VALUE:n(1)}}}});
  assert.throws(()=>generateStandard(ws,pythonGenerator),/定義の中/);
 }finally{ws.dispose();}
 const ws2=new Blockly.Workspace();try{assert.throws(()=>append(ws2,{type:'procedures_defreturn',extraState:{outputs:Array(9).fill('x')}}),/戻り値/);}finally{ws2.dispose();}
});

test('return-mode conversion without callers preserves the definition body',()=>{
 const ws=new Blockly.Workspace();try{
  const original=saveMyBlock(Blockly,ws,'互換',[]),id=original.id;
  const body=append(ws,{type:'lab_wait',inputs:{SECONDS:n(0)}});original.getInput('STACK').connection.connect(body.previousConnection);
  const number=saveMyBlock(Blockly,ws,'互換',[],id,true,['値']);assert.equal(number.id,id);assert.equal(number.getInputTargetBlock('STACK').id,body.id);
  const restored=saveMyBlock(Blockly,ws,'互換',[],id,false);assert.equal(restored.type,'procedures_defnoreturn');assert.equal(restored.getInputTargetBlock('STACK').id,body.id);
 }finally{ws.dispose();}
});
test('parallel numeric calls keep arguments independent while awaiting',()=>{
 const ws=new Blockly.Workspace();try{
  const def=saveMyBlock(Blockly,ws,'そのまま返す',[{name:'入力'}],null,true,['値']),arg=def.getVarModels()[0];
  const body=append(ws,{type:'lab_wait',inputs:{SECONDS:n(0)}});def.getInput('STACK').connection.connect(body.previousConnection);
  const value=append(ws,{type:'lab_argument',extraState:{name:'入力',parameterId:arg.getId()}});def.getInput('RETURN').connection.connect(value.outputConnection);
  for(const value of [3,8])append(ws,{type:'spike_start',next:{block:text({type:'procedures_callreturn',extraState:{name:'そのまま返す',params:['入力'],outputs:['値']},inputs:{ARG0:n(value)}})}});
  assert.deepEqual(execute(generateStandard(ws,pythonGenerator).source).sort(),['3','8']);
 }finally{ws.dispose();}
});
