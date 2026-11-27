import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as Blockly from 'blockly';
import {pythonGenerator} from 'blockly/python';
import {setupClassroom,classroomToolbox} from './classroom-blocks.js';
import {classroomSample,SAMPLE_NAMES} from './classroom-samples.js';
import {generateStandard} from './standard.js';
import {validateProject} from './model.js';
setupClassroom(Blockly);
test('published palette and samples omit images while old image projects still reload and generate',()=>{
 const entries=classroomToolbox().contents.flatMap(c=>c.contents??[]);
 assert.ok(!entries.some(b=>b.type==='spike_image'));
 for(const name of Object.keys(SAMPLE_NAMES))assert.ok(!JSON.stringify(classroomSample(name)).includes('spike_image'),name);
 const ws=new Blockly.Workspace(),again=new Blockly.Workspace();try{
  Blockly.serialization.workspaces.load({blocks:{languageVersion:0,blocks:[{type:'spike_start',next:{block:{type:'spike_image',fields:{IMAGE:'heart'}}}}]}},ws);
  const project={format:'spike-block-lab',version:1,name:'old',language:'standard',workspace:Blockly.serialization.workspaces.save(ws)};
  validateProject(project);Blockly.serialization.workspaces.load(project.workspace,again);
  assert.ok(again.getAllBlocks(false).some(b=>b.type==='spike_image'));
  assert.match(generateStandard(again,pythonGenerator).source,/light_matrix/);
 }finally{ws.dispose();again.dispose();}
});
test('manual covers every selectable block plus dynamic variables, calls and arguments',()=>{
 const manual=JSON.parse(readFileSync(new URL('./manual-data.json',import.meta.url),'utf8'));
 const documented=new Set(manual.pages.flatMap(p=>p.blocks??[]));
 const advertised=classroomToolbox().contents.flatMap(c=>c.contents??[]).filter(b=>b.kind==='block').map(b=>b.type);
 advertised.push('variables_get','variables_set','math_change','procedures_defnoreturn','procedures_callnoreturn','procedures_defreturn','procedures_callreturn','lab_call_outputs','lab_return_value','lab_return_values','lab_argument');
 assert.deepEqual([...new Set(advertised)].filter(type=>!documented.has(type)),[]);
 assert.equal(manual.chapters.length,20);
 assert.deepEqual([...new Set(manual.pages.map(p=>p.chapter))],Array.from({length:20},(_,i)=>i+1));
 for(const page of manual.pages){assert.ok(page.table.rows.length>=4,page.title);assert.ok(page.sections.length>=2,page.title);}
});
