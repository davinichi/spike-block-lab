import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as Blockly from 'blockly';
import {classroomSample,SAMPLE_NAMES} from './classroom-samples.js';
// Resolve the actual entry point imports, including cache query strings.
const app=readFileSync(new URL('./app.js',import.meta.url),'utf8');
const specifier=name=>app.match(new RegExp("from '(\\./"+name+"[^']*)'"))[1];
const model=await import(new URL(specifier('model.js'),import.meta.url));
const {setupClassroom}=await import(new URL(specifier('classroom-blocks.js'),import.meta.url));
setupClassroom(Blockly);
const project=workspace=>({format:'spike-block-lab',version:1,name:'Sample',language:'standard',workspace});
test('entry point validation loads every sample and saved workspace with cache query imports',()=>{
 for(const name of Object.keys(SAMPLE_NAMES)){
  const sample=project(classroomSample(name));
  assert.doesNotThrow(()=>model.validateProject(sample),name);
  const ws=new Blockly.Workspace(),again=new Blockly.Workspace();
  try{
   Blockly.serialization.workspaces.load(sample.workspace,ws);
   const saved=project(Blockly.serialization.workspaces.save(ws));
   assert.doesNotThrow(()=>model.validateProject(saved),name+' saved');
   Blockly.serialization.workspaces.load(saved.workspace,again);
   assert.equal(again.getAllBlocks(false).length,ws.getAllBlocks(false).length,name);
  }finally{ws.dispose();again.dispose();}
 }
});
test('entry point validation still rejects unsupported blocks and more than 500 blocks',()=>{
 assert.throws(()=>model.validateProject(project({blocks:{blocks:[{type:'unknown_block'}]}})),/未対応/);
 assert.throws(()=>model.validateProject(project({blocks:{blocks:Array.from({length:501},()=>({type:'math_number',fields:{NUM:0}}))}})),/500/);
 assert.doesNotThrow(()=>model.validateProject(project({blocks:{blocks:Array.from({length:500},()=>({type:'math_number',fields:{NUM:0}}))}})));
});
