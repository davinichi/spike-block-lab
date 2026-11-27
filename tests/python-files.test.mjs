import {test} from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import * as Blockly from 'blockly';
import {pythonGenerator} from 'blockly/python';
import {setupClassroom} from './classroom-blocks.js';
import {classroomSample,SAMPLE_NAMES} from './classroom-samples.js';
import {generateStandard} from './standard.js';
import {saveMyBlock} from './myblocks.js';
import {combinePythonFiles,pythonDownloadFiles,zipPythonFiles} from './python-files.js';
setupClassroom(Blockly);
function python(script,data){const r=spawnSync('python',['-X','utf8','-c',script],{input:JSON.stringify(data),encoding:'utf8',env:{...process.env,PYTHONUTF8:'1'}});assert.equal(r.status,0,r.stderr||String(r.error));return r.stdout;}
test('every sample separates user code from helpers and recombines the exact transferred source',()=>{
 const results=[];
 for(const name of Object.keys(SAMPLE_NAMES)){
  const ws=new Blockly.Workspace();try{
   Blockly.serialization.workspaces.load(classroomSample(name),ws);const r=generateStandard(ws,pythonGenerator);
   assert.equal(combinePythonFiles(r.runtimeSource,r.programSource),r.source);
   assert.ok(!r.programSource.includes('class _LabStop'));assert.ok(!r.programSource.includes('def _lab_range('));
   assert.match(r.runtimeSource,/class _LabStop/);assert.ok(!r.runtimeSource.includes('async def _lab_task_0('));
   assert.match(r.programSource,/# 処理1：/);results.push({name,...r});
  }finally{ws.dispose();}
 }
 python(`import ast,json,sys
for r in json.load(sys.stdin):
 for key in ['programSource','runtimeSource','source']:ast.parse(r[key])
 program=ast.parse(r['programSource']);runtime=ast.parse(r['runtimeSource'])
 assert not any(isinstance(n,ast.ClassDef) for n in program.body),r['name']
 assert any(isinstance(n,ast.AsyncFunctionDef) and n.name=='_lab_task_0' for n in program.body),r['name']
 assert not any(isinstance(n,ast.AsyncFunctionDef) and n.name=='_lab_task_0' for n in runtime.body),r['name']
`,results);
});
test('Python ZIP retains the exact two UTF-8 files, Japanese comments and assembly instructions',()=>{
 const ws=new Blockly.Workspace();try{
  Blockly.serialization.workspaces.load(classroomSample('sound'),ws);const r=generateStandard(ws,pythonGenerator),files=pythonDownloadFiles(r);
  assert.match(files['program.py'],/# 音.*Hz/);assert.match(files['README.txt'],/単体|結合/);
  python(`import zipfile,io,base64,json,sys
d=json.load(sys.stdin)
z=zipfile.ZipFile(io.BytesIO(base64.b64decode(d['zip'])))
assert z.testzip() is None
assert sorted(z.namelist())==['README.txt','program.py','sbl_runtime.py']
for name,text in d['files'].items():assert z.read(name).decode('utf-8')==text,name
assert z.read('sbl_runtime.py').decode()+'\\n'+z.read('program.py').decode()==d['source']
`,{zip:Buffer.from(zipPythonFiles(r)).toString('base64'),files,source:r.source});
 }finally{ws.dispose();}
});
function argumentProgram(names){
 const ws=new Blockly.Workspace();try{
  const def=saveMyBlock(Blockly,ws,'引数を足す',names.map(name=>({name})),null,true,['合計']);
  const args=def.getVarModels().map(m=>({type:'lab_argument',extraState:{name:m.getName(),parameterId:m.getId()}}));
  const sum=args.reduce((a,b)=>({type:'math_arithmetic',fields:{OP:'ADD'},inputs:{A:{block:a},B:{block:b}}}));
  const expression=Blockly.serialization.blocks.append(sum,ws);def.getInput('RETURN').connection.connect(expression.outputConnection);
  Blockly.serialization.blocks.append({type:'spike_start',next:{block:{type:'lab_text',inputs:{TEXT:{block:{type:'procedures_callreturn',extraState:{name:'引数を足す',params:names,outputs:['合計'],output:0},inputs:Object.fromEntries(names.map((_,i)=>['ARG'+i,{shadow:{type:'math_number',fields:{NUM:i+1}}}]))}}}}}},ws);
  const first=generateStandard(ws,pythonGenerator);const saved=Blockly.serialization.workspaces.save(ws),again=new Blockly.Workspace();
  try{Blockly.serialization.workspaces.load(JSON.parse(JSON.stringify(saved)),again);assert.equal(generateStandard(again,pythonGenerator).programSource,first.programSource);}finally{again.dispose();}
  return first;
 }finally{ws.dispose();}
}
test('valid Japanese My Block arguments remain readable and invalid, reserved and normalized collisions execute safely',()=>{
 const good=argumentProgram(['距離','速さ','回数']);assert.match(good.programSource,/async def [^(]+\(距離, 速さ, 回数\)/);
 assert.match(good.programSource,/# マイブロック「引数を足す」/);
 const special=argumentProgram(['class','motor','_lab_wheel','スピード(%)','A','Ａ','1st','二番']);
 python(`import ast,asyncio,json,sys,keyword
for item,count in zip(json.load(sys.stdin),[3,8]):
 tree=ast.parse(item['programSource']);fn=next(n for n in tree.body if isinstance(n,ast.AsyncFunctionDef) and not n.name.startswith('_lab_task_'))
 names=[a.arg for a in fn.args.args]
 assert len(set(names))==count and all(n.isidentifier() and not keyword.iskeyword(n) for n in names),names
 assert 'motor' not in names and '_lab_wheel' not in names,names
 helpers=[n for n in ast.parse(item['runtimeSource']).body if isinstance(n,ast.FunctionDef) and n.name in ('_lab_number','_lab_result')]
 scope={}
 exec(compile(ast.Module(body=helpers+[fn],type_ignores=[]),'files','exec'),scope)
 value=asyncio.run(scope[fn.name](*range(1,count+1)))
 assert (value[0] if isinstance(value,tuple) else value)==count*(count+1)/2,value
`,[good,special]);
});
