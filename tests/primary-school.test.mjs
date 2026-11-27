import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
import * as Blockly from 'blockly';
import {pythonGenerator} from 'blockly/python';
import {setupClassroom} from './classroom-blocks.js';
import {classroomSample,SAMPLE_NAMES} from './classroom-samples.js';
import {generateStandard} from './standard.js';
setupClassroom(Blockly);
test('the two attached primary-school samples lead both palettes and replace the old sample',()=>{
 for(const path of ['./index.html','./dist/en/index.html']){
  const dom=new JSDOM(readFileSync(new URL(path,import.meta.url),'utf8'));
  const options=[...dom.window.document.querySelector('#sample').options].filter(x=>x.value);
  assert.deepEqual(options.slice(0,2).map(x=>[x.value,x.text]),[['primarySchool01','Primary_School_01'],['primarySchool02','Primary_School_02']]);
  assert.ok(!options.some(x=>x.value==='primarySchool'));dom.window.close();
 }
 assert.ok(!('primarySchool' in SAMPLE_NAMES));
});
test('school samples clone independently and keep their generated program through project reload',()=>{
 for(const name of ['primarySchool01','primarySchool02']){
  const original=classroomSample(name),ws=new Blockly.Workspace(),again=new Blockly.Workspace();
  try{Blockly.serialization.workspaces.load(original,ws);const code=generateStandard(ws,pythonGenerator);
   assert.ok(code.threads>0);assert.ok(code.count>0);assert.ok(ws.getAllBlocks(false).some(b=>b.type==='procedures_defnoreturn'));
   Blockly.serialization.workspaces.load(Blockly.serialization.workspaces.save(ws),again);
   assert.equal(generateStandard(again,pythonGenerator).programSource,code.programSource);
   const changed=classroomSample(name);changed.blocks.blocks.length=0;assert.deepEqual(classroomSample(name),original);
  }finally{ws.dispose();again.dispose();}
 }
});
