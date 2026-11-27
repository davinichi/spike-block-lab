import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as Blockly from 'blockly';
import {pythonGenerator} from 'blockly/python';
import {setupClassroom,classroomToolbox} from './classroom-blocks.js';
import {classroomSample,SAMPLE_NAMES} from './classroom-samples.js';
import {generateStandard} from './standard.js';
import {numericInputDefaults,ensureNumericInputShadows} from './numeric-inputs.js';
setupClassroom(Blockly);
const defaults=numericInputDefaults(classroomToolbox());
const repair=ws=>ensureNumericInputShadows(ws,Blockly,defaults);
function load(state){const ws=new Blockly.Workspace();Blockly.serialization.workspaces.load(state,ws);return ws;}

test('every sample numeric input stays editable in place and cannot be dragged out',()=>{
 for(const name of Object.keys(SAMPLE_NAMES)){
  const ws=load(classroomSample(name));try{
   for(const block of ws.getAllBlocks(false))if(block.type==='math_number'&&block.getParent()){
    assert.equal(block.isShadow(),true,name);assert.equal(block.isMovable(),false,name);
    block.setFieldValue(2,'NUM');assert.equal(Number(block.getFieldValue('NUM')),2);
   }
  }finally{ws.dispose();}
 }
});

test('old attached numbers retain IDs, negative/fractional values and generated Python through repair and reload',()=>{
 const state=classroomSample('ramp');
 function legacy(x){if(!x||typeof x!=='object')return;for(const input of Object.values(x.inputs??{})){if(input.shadow?.type==='math_number'){input.block=input.shadow;delete input.shadow;}}for(const v of Object.values(x))legacy(v);}
 legacy(state);
 const ws=load(state),again=new Blockly.Workspace();try{
  const numbers=ws.getAllBlocks(false).filter(b=>b.type==='math_number');
  numbers[0].setFieldValue(0.25,'NUM');
  ws.getAllBlocks(false).find(b=>b.type==='lab_drive_forward').getInputTargetBlock('SPEED').setFieldValue(-20,'NUM');
  const before=numbers.map(b=>[b.id,b.getFieldValue('NUM')]);
  const source=generateStandard(ws,pythonGenerator).source;
  repair(ws);
  assert.deepEqual(before.map(([id])=>[id,ws.getBlockById(id)?.getFieldValue('NUM')]),before);
  assert.ok(before.every(([id])=>ws.getBlockById(id).isShadow()&&!ws.getBlockById(id).isMovable()));
  assert.equal(generateStandard(ws,pythonGenerator).source,source);
  Blockly.serialization.workspaces.load(Blockly.serialization.workspaces.save(ws),again);repair(again);
  assert.equal(generateStandard(again,pythonGenerator).source,source);
  assert.ok(again.getAllBlocks(false).filter(b=>b.type==='math_number'&&b.getParent()).every(b=>b.isShadow()));
 }finally{ws.dispose();again.dispose();}
});

test('variables and expressions replace numeric inputs and removing them restores an editable shadow',()=>{
 const ws=load(classroomSample('ramp'));try{
  const ramp=ws.getAllBlocks(false).find(b=>b.type==='lab_ramp'),conn=ramp.getInput('DOWN').connection;
  const variable=ws.newBlock('variables_get');variable.setFieldValue(ws.getVariableMap().createVariable('減速').getId(),'VAR');
  conn.connect(variable.outputConnection);repair(ws);
  assert.equal(conn.targetBlock(),variable);assert.equal(variable.isShadow(),false);assert.equal(variable.isMovable(),true);
  variable.unplug();
  const literal=conn.targetBlock();assert.equal(literal.type,'math_number');assert.equal(literal.isShadow(),true);assert.equal(literal.isMovable(),false);
  literal.setFieldValue(0.75,'NUM');assert.equal(literal.getFieldValue('NUM'),0.75);
  const saved=Blockly.serialization.workspaces.save(ws);repair(ws);assert.deepEqual(Blockly.serialization.workspaces.save(ws),saved);
 }finally{ws.dispose();}
});

test('empty old numeric sockets recover defaults while standalone numbers and conditions stay movable or empty',()=>{
 const ws=load(classroomSample('ramp'));try{
  const ramp=ws.getAllBlocks(false).find(b=>b.type==='lab_ramp'),conn=ramp.getInput('DOWN').connection;
  conn.setShadowState(null);conn.targetBlock()?.dispose();
  const standalone=ws.newBlock('math_number');standalone.setFieldValue(-12.5,'NUM');
  const condition=ws.newBlock('lab_wait_until');
  repair(ws);
  assert.equal(conn.targetBlock().getFieldValue('NUM'),.5);assert.ok(conn.targetBlock().isShadow());
  assert.equal(standalone.getFieldValue('NUM'),-12.5);assert.equal(standalone.isShadow(),false);assert.equal(standalone.isMovable(),true);
  assert.equal(condition.getInputTargetBlock('BOOL'),null);
 }finally{ws.dispose();}
});
