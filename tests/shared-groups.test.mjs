import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import * as Blockly from 'blockly';
import {pythonGenerator} from 'blockly/python';
import {setupClassroom,classroomToolbox} from './classroom-blocks.js';
import {installCommonWorkspace} from './common-blocks.js';
import {SHARED_RUNTIME,ordinaryVariables} from './shared-groups.js';
import {COMMON_RUNTIME} from './common-runtime.js';
import {generateStandard} from './standard.js';
import {saveMyBlock,configureMyBlockBlocks,installMyBlockFlyout} from './myblocks.js';
import {validateProject} from './model.js';
setupClassroom(Blockly);configureMyBlockBlocks(Blockly,()=>{});
const reference=JSON.parse(readFileSync(new URL('./shared-groups-reference.json',import.meta.url),'utf8'));
const special={ev3_tone:'lab_sound_tone',ev3_wait_seconds:'lab_wait',ev3_forever:'lab_forever',ev3_wait_until:'lab_wait_until',ev3_program_end:'lab_end',ev3_myblock_return:'lab_return',ev3_text:'lab_string_literal',ev3_text_join:'lab_string_join',ev3_text_length:'lab_string_length',ev3_text_letter:'lab_string_letter',ev3_text_contains:'lab_string_includes',ev3_text_equal:'lab_string_equals',ev3_text_number:'lab_string_number',ev3_text_to_number:'lab_string_parse'};
const mapped=t=>special[t]??t.replace('ev3_','lab_');
const normalize=x=>{if(Array.isArray(x))return x.map(normalize);if(!x||typeof x!=='object')return x;return Object.fromEntries(Object.entries(x).map(([k,v])=>[k,k==='type'?mapped(v):normalize(v)]));};
const n=x=>({shadow:{type:'math_number',fields:{NUM:x}}});
function py(body){const r=spawnSync('python',['-X','utf8','-'],{input:`import math,types,asyncio\n${SHARED_RUNTIME}\n${COMMON_RUNTIME}\n${body}`,encoding:'utf8'});assert.equal(r.status,0,r.stderr);return r.stdout;}

test('five static groups match both reference palettes, defaults and order; debug trace is excluded from the public palette',()=>{
 const actual=classroomToolbox();
 for(const ref of Object.values(reference))for(const group of ref.groups.filter(c=>Array.isArray(c.contents))){
  const current=actual.contents.find(c=>c.name===group.name);assert.equal(current.colour,group.colour);
  const items=group.name==='記録'?current.contents.slice(0,3):current.contents;
  assert.deepEqual(items,normalize(group.contents),ref.version+' '+group.name);
 }
 const logs=actual.contents.find(c=>c.name==='記録').contents;assert.equal(logs.length,3);assert.ok(!logs.some(b=>['lab_log_motion','lab_log_pid'].includes(b.type)));
});

test('common visible blocks use reference wording and sound volume field, legacy volume input still reloads',()=>{
 const ws=new Blockly.Workspace();try{
  for(const d of reference.ebl.definitions)Blockly.defineBlocksWithJsonArray([d]);
  for(const type of ['ev3_tone','ev3_pid','ev3_pid_reset','ev3_text_get','ev3_text_set','ev3_log_start','ev3_log_value','ev3_log_end','ev3_list_clear','ev3_list_add','ev3_list_set','ev3_list_delete','ev3_list_item','ev3_list_length','ev3_list_contains','ev3_list_stat']){
   const a=ws.newBlock(type),b=ws.newBlock(mapped(type));assert.equal(b.toString(),a.toString(),type);assert.equal(b.getColour(),a.getColour(),type+' colour');a.dispose();b.dispose();
  }
  const old=Blockly.serialization.blocks.append({type:'lab_tone_ms',inputs:{FREQUENCY:n(440),MS:n(200),VOLUME:n(40)}},ws);
  const tone=ws.newBlock('lab_sound_tone');assert.equal(tone.getInput('VOLUME'),null);assert.equal(tone.getFieldValue('VOLUME'),25);assert.equal(old.getInputTargetBlock('VOLUME').getFieldValue('NUM'),40);
 }finally{ws.dispose();}
});

test('common numeric operations follow EBL remainder and rounding, validate bounds and never accept invalid finite numbers',()=>{
 py(`for a,b,want in [(-5,3,1),(5,-3,-1),(-5,-3,-2),(5,3,2),(5.5,2,1.5)]:assert _lab_numeric('mod',a,b)==want
for a,want in [(1.5,2),(-1.5,-1),(-.5,0),(.5,1)]:assert _lab_numeric('round',a)==want
assert _lab_numeric('min',2,3)==2 and _lab_numeric('max',2,3)==3
assert _lab_numeric('clamp',120,0,-100,100)==100
assert _lab_numeric('random',7,7)==7
for _ in range(100):assert -3<=_lab_numeric('random',-3,3)<=3
for args in [('mod',1,0),('random',2,1),('random',1.5,2),('random',-32768,0),('clamp',0,0,5,1),('round',float('nan')),('round',float('inf')),('round',1e39)]:
 try:_lab_numeric(*args);raise AssertionError(args)
 except ValueError:pass
`);
});

test('common Unicode text covers UTF-8 limits, 1-based access, empty out-of-range and strict decimal parsing',()=>{
 py(`assert _lab_text_value('あ'*40)=='あ'*40
assert _lab_common_letter('あいう',2)=='い' and _lab_common_letter('あいう',4)==''
for value,want in [('12.5',12.5),('-.5',-.5),('1.',1),('+2e-3',.002),('-0',0)]:assert _lab_parse_number(value)==want
for value in ['', ' ', ' 1', '1 ', 'nan', 'inf', '0x10', '1_0', '1e', '+', '１', '1e100']:
 try:_lab_parse_number(value);raise AssertionError(value)
 except ValueError:pass
for value in ['あ'*41,'a'+chr(0),123]:
 try:_lab_text_value(value);raise AssertionError(value)
 except ValueError:pass
for index in [0,-1,1.5,121]:
 try:_lab_common_letter('a',index);raise AssertionError(index)
 except ValueError:pass
`);
});

test('sound waits for completion with shared EBL ranges; invalid parameters fail before any sound',()=>{
 py(`calls=[]
async def beep(*args):calls.append(args);await asyncio.sleep(0);calls.append('done')
sound=types.SimpleNamespace(beep=beep)
async def check():
 await _lab_common_tone(262,1000,25);assert calls==[(262,1000,25),'done']
 for args in [(249,200,25),(10001,200,25),(440,0,25),(440,30001,25),(440,200,101),(440.5,200,25)]:
  try:await _lab_common_tone(*args);raise AssertionError(args)
  except ValueError:pass
 assert len(calls)==2
asyncio.run(check())
`);
});

test('PID shares cached same-ms output, independent names and a P-only restart after more than 60 seconds',()=>{
 py(`clock=[0];time=types.SimpleNamespace(ticks_ms=lambda:clock[0],ticks_diff=lambda a,b:a-b);_lab_pid_state={}
assert _lab_pid('P',10,4,2,1,1)==12
assert _lab_pid('P',100,0,2,1,1)==12
clock[0]=1000;assert _lab_pid('P',10,5,2,1,1)==14
assert _lab_pid('other',10,5,2,1,1)==10
clock[0]=61001;assert _lab_pid('P',10,5,2,1,1)==10
assert _lab_pid_state['P'][2]==0
_lab_pid_state.pop('P');assert _lab_pid('P',10,4,2,1,1)==12
`);
});

function callbacks(ws){const callbacks=new Map();ws.registerToolboxCategoryCallback=(k,v)=>callbacks.set(k,v);ws.registerButtonCallback=()=>{};installCommonWorkspace(ws,Blockly);installMyBlockFlyout(ws,()=>{});return callbacks;}
test('variable and argument flyouts hide argument-only models but retain same-name global uses and selectors',()=>{
 const ws=new Blockly.Workspace();try{
  const cb=callbacks(ws),def=saveMyBlock(Blockly,ws,'計算',[{name:'値'}]),arg=def.getVarModels()[0];
  const ordinary=ws.getVariableMap().createVariable('結果');assert.deepEqual(ordinaryVariables(ws).map(m=>m.getName()),['結果']);
  const getter=ws.newBlock('variables_get');getter.setFieldValue(arg.getId(),'VAR');assert.ok(ordinaryVariables(ws).includes(arg));
  getter.dispose();assert.ok(!ordinaryVariables(ws).includes(arg));
  const vars=cb.get('LAB_VARIABLES')(ws).filter(b=>b.type==='variables_get');assert.ok(vars.some(b=>b.fields.VAR.id===ordinary.getId()));assert.ok(!vars.some(b=>b.fields.VAR.id===arg.getId()));
  const items=cb.get('ARGUMENTS')(ws);assert.equal(items.find(b=>b.type==='lab_argument').extraState.name,'値');assert.match(items.at(-1).text,/同じ名前/);
  const setter=ws.newBlock('variables_set');setter.setFieldValue(ordinary.getId(),'VAR');const ids=setter.getField('VAR').getOptions(false).map(x=>x[1]);assert.ok(!ids.includes(arg.getId()));
 }finally{ws.dispose();}
});

test('eight named inputs and eight named results preserve types, values, horizontal calls and early-return blocks through save/load',()=>{
 const ws=new Blockly.Workspace();try{
  const cb=callbacks(ws),params=Array.from({length:8},(_,i)=>({name:'引数'+i})),outputs=Array.from({length:8},(_,i)=>'結果'+i);
  const def=saveMyBlock(Blockly,ws,'計算',params,null,true,outputs);
  const items=cb.get('PROCEDURE')(ws);assert.equal(items[0].text,'マイブロックを作る');const call=items.find(x=>x.type==='procedures_callreturn');assert.equal(Object.keys(call.inputs).length,8);
  const block=Blockly.serialization.blocks.append({...call,inputs:Object.fromEntries(params.map((_,i)=>['ARG'+i,n(i+1)]))},ws);block.setFieldValue('7','RESULT');assert.equal(block.getInputsInline(),true);
  const project={format:'spike-block-lab',version:1,name:'Common',language:'standard',workspace:Blockly.serialization.workspaces.save(ws)};validateProject(project);
  const copy=new Blockly.Workspace();try{Blockly.serialization.workspaces.load(project.workspace,copy);const c=copy.getAllBlocks(false).find(b=>b.type==='procedures_callreturn');assert.equal(c.getFieldValue('RESULT'),'7');assert.deepEqual(c.returnNames_,outputs);assert.equal(c.getInputTargetBlock('ARG7').getFieldValue('NUM'),8);}finally{copy.dispose();}
  assert.ok(items.some(x=>x.type==='lab_call_outputs'));assert.ok(items.some(x=>x.type==='lab_return_values'));assert.ok(items.some(x=>x.type==='lab_return_value'));
  assert.equal(def.getVarModels().length,8);
 }finally{ws.dispose();}
});

test('new shared blocks and legacy text/numeric/sound blocks generate through project save and reload',()=>{
 const ws=new Blockly.Workspace();try{
  const entries=classroomToolbox().contents.filter(c=>['音','演算','データ','記録'].includes(c.name)).flatMap(c=>c.contents??[]).filter(b=>b.kind==='block');
  for(const entry of entries){const b=Blockly.serialization.blocks.append(entry,ws);const state=Blockly.serialization.blocks.save(b);b.dispose();const restored=Blockly.serialization.blocks.append(state,ws);assert.equal(restored.type,entry.type);restored.dispose();}
  const start=ws.newBlock('spike_start'),setter=Blockly.serialization.blocks.append({type:'lab_text_set',inputs:{VALUE:{block:{type:'lab_string_join',inputs:{A:{shadow:{type:'lab_string_literal',fields:{TEXT:'あ'}}},B:{shadow:{type:'lab_string_literal',fields:{TEXT:'いう'}}}}}}}},ws);start.nextConnection.connect(setter.previousConnection);
  const text=Blockly.serialization.blocks.append({type:'lab_log_value',inputs:{VALUE:{block:{type:'lab_string_length',inputs:{VALUE:{block:{type:'lab_text_get'}}}}}}},ws);setter.nextConnection.connect(text.previousConnection);
  const source=generateStandard(ws,pythonGenerator).source;assert.match(source,/_lab_text_value\(_lab_text_value/);assert.match(source,/len\(_lab_text_value/);
 }finally{ws.dispose();}
});
import {classroomSample} from './classroom-samples.js';
test('common data sample executes Unicode, arithmetic, recording and completion sound on a simulated hub',()=>{
 const ws=new Blockly.Workspace();try{
  Blockly.serialization.workspaces.load(classroomSample('commonData'),ws);const source=generateStandard(ws,pythonGenerator).source;
  const r=spawnSync('python',['-X','utf8','-c',`import sys,json,types,asyncio,time,io,csv
source=json.load(sys.stdin);files={};clock=[0];sounds=[]
class File(io.BytesIO):
 def close(self):files['csv']=self.getvalue();super().close()
for name in ['motor','motor_pair','distance_sensor','color_sensor','force_sensor','color','hub','runloop']:sys.modules[name]=types.ModuleType(name)
hub=sys.modules['hub'];hub.port=types.SimpleNamespace(**{c:i for i,c in enumerate('ABCDEF')})
async def beep(*args):sounds.append(args)
hub.sound=types.SimpleNamespace(beep=beep,stop=lambda:None);hub.light_matrix=hub.light=hub.button=hub.motion_sensor=types.SimpleNamespace()
sys.modules['motor'].stop=lambda *args,**kwargs:None
async def sleep(ms):clock[0]+=ms;await asyncio.sleep(0)
async def gather(tasks):await asyncio.gather(*tasks)
sys.modules['runloop'].sleep_ms=sleep;sys.modules['runloop'].run=lambda *tasks:asyncio.run(gather(tasks))
time.ticks_ms=lambda:clock[0];time.ticks_diff=lambda a,b:a-b
scope={'open':lambda *args,**kwargs:File()};exec(source,scope)
rows=list(csv.DictReader(io.StringIO(files['csv'].decode('utf-8'))));values={r['label']:r['value'] for r in rows}
assert values=={'text':'こんにちはSPIKE','length':'10','remainder':'1','rounded':'-1'},values
assert sounds==[(440,300,25)],sounds
`],{input:JSON.stringify(source),encoding:'utf8'});assert.equal(r.status,0,r.stderr);
 }finally{ws.dispose();}
});

test('uninitialized ordinary variables generate zero and domain errors never reach a numeric output',()=>{
 const ws=new Blockly.Workspace();try{
  const model=ws.getVariableMap().createVariable('count');const state={blocks:{languageVersion:0,blocks:[{type:'spike_start',next:{block:{type:'lab_log_value',inputs:{VALUE:{block:{type:'variables_get',fields:{VAR:{id:model.getId()}}}}}}}}]}};
  Blockly.serialization.workspaces.load({...state,variables:[{id:model.getId(),name:'count'}]},ws);const source=generateStandard(ws,pythonGenerator).source;assert.match(source,/count = 0/);assert.doesNotMatch(source,/count = None/);
 }finally{ws.dispose();}
 py(`assert _lab_binary('div',3,2)==1.5
for args in [('div',1,0),('mul',1e30,1e30),('add',float('inf'),1)]:
 try:_lab_binary(*args);raise AssertionError(args)
 except ValueError:pass
for op,value in [('sqrt',-1),('ln',0),('log',-1),('asin',2),('acos',-2),('tan',90),('tan',-270)]:
 try:_lab_common_math(op,value);raise AssertionError((op,value))
 except ValueError:pass
`);
});
