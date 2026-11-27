import {test} from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {readFileSync,readdirSync} from 'node:fs';

function run(executable,args,input){
 const r=spawnSync(executable,args,{input,encoding:'utf8',maxBuffer:32*1024*1024,env:{...process.env,PYTHONUTF8:'1'}});
 assert.equal(r.status,0,r.stderr||String(r.error));return r.stdout;
}
const base=`import * as Blockly from 'blockly';import {pythonGenerator} from 'blockly/python';`;
const japanese=()=>JSON.parse(run(process.execPath,['--input-type=module','-e',base+`
 import {setupClassroom} from './classroom-blocks.js';
 import {classroomSample,SAMPLE_NAMES} from './classroom-samples.js';
 import {generateStandard} from './standard.js';setupClassroom(Blockly);
 console.log(JSON.stringify(Object.keys(SAMPLE_NAMES).map(name=>{const ws=new Blockly.Workspace();
 try{Blockly.serialization.workspaces.load(classroomSample(name),ws);return {name,state:Blockly.serialization.workspaces.save(ws),...generateStandard(ws,pythonGenerator)};}finally{ws.dispose();}})));
`]));

test('English restores every Japanese sample with unchanged data and Python behavior',()=>{
 const ja=japanese();
 const en=JSON.parse(run(process.execPath,['--input-type=module','-e',base+`
 import {readFileSync} from 'node:fs';import {setupClassroom} from './dist/en/classroom-blocks.js';
 import {generateStandard} from './dist/en/standard.js';import {pythonDownloadFiles} from './dist/en/python-files.js';setupClassroom(Blockly);
 const data=JSON.parse(readFileSync(0,'utf8'));console.log(JSON.stringify(data.map(item=>{const ws=new Blockly.Workspace();
 try{Blockly.serialization.workspaces.load(item.state,ws);const result=generateStandard(ws,pythonGenerator);return {name:item.name,state:Blockly.serialization.workspaces.save(ws),...result,files:pythonDownloadFiles(result)};}finally{ws.dispose();}})));
`],JSON.stringify(ja)));
 for(let i=0;i<ja.length;i++){
   assert.deepEqual(en[i].state,ja[i].state,ja[i].name+' project data changed');
   assert.match(en[i].programSource,/# Task 1:/);
   assert.doesNotMatch(en[i].programSource,/ブロックで作ったプログラム|ここからプログラム|# 処理/);
   assert.equal(en[i].files['program.py'],en[i].programSource);
   assert.match(en[i].files['README.txt'],/English comments/);
   assert.equal(en[i].source,en[i].runtimeSource+'\n'+en[i].programSource);
 }
 run('python',['-X','utf8','-c',`import ast,json,sys
ja,en=json.load(sys.stdin)
for a,b in zip(ja,en):
 for key in ('programSource','runtimeSource','source'): ast.parse(b[key])
 assert ast.dump(ast.parse(a['programSource']))==ast.dump(ast.parse(b['programSource'])),a['name']
`],JSON.stringify([ja,en]));
});

test('English supports Japanese custom argument and My Block names',()=>{
 const output=run(process.execPath,['--input-type=module','-e',base+`
 import {setupClassroom} from './dist/en/classroom-blocks.js';import {saveMyBlock} from './dist/en/myblocks.js';
 import {generateStandard} from './dist/en/standard.js';setupClassroom(Blockly);const ws=new Blockly.Workspace();
 const def=saveMyBlock(Blockly,ws,'前へ進む',[{name:'距離'}],null,false,[]);
 Blockly.serialization.blocks.append({type:'spike_start',next:{block:{type:'procedures_callnoreturn',extraState:{name:'前へ進む',params:['距離']},inputs:{ARG0:{shadow:{type:'math_number',fields:{NUM:10}}}}}}},ws);
 console.log(generateStandard(ws,pythonGenerator).programSource);ws.dispose();
`]);
 assert.match(output,/# My Block 前へ進む:/);assert.match(output,/\(距離\)/);
 run('python',['-X','utf8','-c','import ast,sys;ast.parse(sys.stdin.read())'],output);
});

test('English modules parse and both pages include the language switch',()=>{
 for(const name of readdirSync('dist/en').filter(name=>name.endsWith('.js')))run(process.execPath,['--check','dist/en/'+name]);
 const html=readFileSync('dist/en/index.html','utf8');
 assert.match(html,/<html lang="en">/);assert.match(html,/\.\.\/vendor\/en.js/);
 assert.match(html,/English quick-start guide/);
 for(const path of ['dist/app.js','dist/en/app.js'])assert.match(readFileSync(path,'utf8'),/installLanguageSwitch\(/);
});
