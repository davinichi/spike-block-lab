import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as Blockly from 'blockly';
import {JSDOM} from 'jsdom';
import {pythonGenerator} from 'blockly/python';
import {setupClassroom} from './classroom-blocks.js';
import {generateStandard} from './standard.js';
import {validateProject} from './model.js';
import {convertProject,UNCONVERTED,assertConverted,installInteropUI} from './project-interop.js';
import {sharedProject,mixedProject} from './project-interop-fixtures.js';
setupClassroom(Blockly);
test('common blocks round-trip without changing variables, arguments, loop modes, list names or source files',()=>{
 const source=sharedProject(),before=structuredClone(source),ebl=convertProject(source,'ebl','Common.spikelab');
 assert.equal(ebl.unsupported.length,0);assert.equal(ebl.project.programName,'CommonProject_EBL');
 assert.deepEqual(source,before);assert.deepEqual(ebl.project.importedFrom.original,source);
 const sbl=convertProject(ebl.project,'sbl','Converted.ev3lab');assert.equal(sbl.unsupported.length,0);
 assert.deepEqual(sbl.project.workspace,source.workspace);validateProject(sbl.project);
 const ws=new Blockly.Workspace(),again=new Blockly.Workspace();try{
  Blockly.serialization.workspaces.load(sbl.project.workspace,ws);const code=generateStandard(ws,pythonGenerator);
  Blockly.serialization.workspaces.load(Blockly.serialization.workspaces.save(ws),again);
  assert.equal(generateStandard(again,pythonGenerator).programSource,code.programSource);assert.match(code.programSource,/440/);assert.match(code.programSource,/880/);
 }finally{ws.dispose();again.dispose();}
});
test('unknown statements and values survive conversion, saved reload and conversion back; all block generation is blocked',()=>{
 const source=mixedProject(),converted=convertProject(source,'ebl');assert.equal(converted.unsupported.length,2);
 const returned=convertProject(converted.project,'sbl');assert.deepEqual(returned.project.workspace,source.workspace);
 const ebl={format:'ev3-block-lab',version:1,name:'Brick',workspace:{blocks:{languageVersion:0,blocks:[{type:'ev3_start',next:{block:{type:'ev3_motor_l_single_angle',id:'hold',fields:{PORTS:'2'},inputs:{DEGREES:{shadow:{type:'math_number',fields:{NUM:90}}}}}}}]}}};
 const result=convertProject(ebl,'sbl');validateProject(result.project);
 const ws=new Blockly.Workspace(),again=new Blockly.Workspace();try{
  Blockly.serialization.workspaces.load(result.project.workspace,ws);assert.throws(()=>generateStandard(ws,pythonGenerator),/変換できない/);
  const saved=Blockly.serialization.workspaces.save(ws);validateProject({...result.project,workspace:saved});Blockly.serialization.workspaces.load(saved,again);
  assert.deepEqual(again.getBlockById('hold').saveExtraState().original,ebl.workspace.blocks.blocks[0].next.block);
  again.getBlockById('hold').setDisabledReason(true,'test');assert.throws(()=>assertConverted(again),/変換できない/);
  again.getBlockById('hold').unplug();assert.throws(()=>assertConverted(again),/変換できない/);
 }finally{ws.dispose();again.dispose();}
});
test('review uses text-only labels, cancellation does not alter the current project, original can be recovered later',async()=>{
 const dom=new JSDOM('<body><details id="fileMenu"><div class="menu-group"></div></details></body>'),d=dom.window.document;
 dom.window.HTMLDialogElement.prototype.showModal=function(){this.open=true;};dom.window.HTMLDialogElement.prototype.close=function(){this.open=false;};
 const report=convertProject(sharedProject(),'ebl','Original.spikelab'),downloads=[];let current={name:'KeepMe'};
 const ui=installInteropUI({document:d,target:'ebl',download:(...x)=>downloads.push(x),getProject:()=>current});
 const first=ui.review(report);d.querySelector('#projectInteropDialog button:nth-child(2)').click();assert.equal(await first,false);assert.deepEqual(current,{name:'KeepMe'});
 const next=ui.review(report);d.querySelector('#projectInteropDialog button').click();assert.deepEqual(JSON.parse(downloads[0][0]),sharedProject());
 d.querySelector('#projectInteropDialog button:nth-child(3)').click();assert.equal(await next,true);
 current=JSON.parse(JSON.stringify(report.project));ui.update();assert.equal(d.querySelector('#saveOriginalProject').hidden,false);d.querySelector('#saveOriginalProject').click();assert.deepEqual(JSON.parse(downloads[1][0]),sharedProject());
 dom.window.close();
});
test('math aliases transform supported operations and preserve unsupported operations instead of guessing',()=>{
 const source=sharedProject();source.workspace.blocks.blocks=[{type:'math_arithmetic',fields:{OP:'POWER'},inputs:{A:{shadow:{type:'math_number',fields:{NUM:2}}},B:{shadow:{type:'math_number',fields:{NUM:3}}}}}];
 assert.equal(convertProject(source,'ebl').project.workspace.blocks.blocks[0].type,UNCONVERTED);
 source.workspace.blocks.blocks[0].fields.OP='DIVIDE';assert.equal(convertProject(source,'ebl').project.workspace.blocks.blocks[0].type,'ev3_op_div');
 assert.throws(()=>convertProject({format:'LEGO',version:1},'sbl'),/SBLまたはEBL/);
});
