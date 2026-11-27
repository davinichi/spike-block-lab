import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as Blockly from 'blockly';
import {pythonGenerator} from 'blockly/python';
import {setupClassroom} from './classroom-blocks.js';
import {configureMyBlockBlocks,saveMyBlock} from './myblocks.js';
import {generateStandard} from './standard.js';
setupClassroom(Blockly);configureMyBlockBlocks(Blockly,()=>{});
function fixture(ws){
  const def=saveMyBlock(Blockly,ws,'進む',[{name:'距離'},{name:'速さ'}]);
  const params=def.getVarModels().map(model=>({name:model.getName(),id:model.getId()}));
  const body=Blockly.serialization.blocks.append({type:'lab_motor_single_angle',fields:{PORT:'A'},inputs:{SPEED:{block:{type:'lab_argument',extraState:{name:params[1].name,parameterId:params[1].id}}},DEGREES:{block:{type:'lab_argument',extraState:{name:params[0].name,parameterId:params[0].id}}}}},ws);
  def.getInput('STACK').connection.connect(body.previousConnection);
  const call=Blockly.serialization.blocks.append({type:'procedures_callnoreturn',extraState:{name:'進む',params:params.map(p=>p.name)},inputs:{ARG0:{block:{type:'lab_distance',fields:{PORT:'D'}}},ARG1:{shadow:{type:'math_number',fields:{NUM:20}}}}},ws);
  const start=ws.newBlock('spike_start');start.nextConnection.connect(call.previousConnection);
  return {def,body,call,params};
}
test('form edits preserve caller expressions by parameter identity when renaming and reordering',()=>{
  const ws=new Blockly.Workspace();try{
    const {def,body,call,params}=fixture(ws),distanceId=call.getInputTargetBlock('ARG0').id;
    assert.equal(def.getIcon(Blockly.icons.MutatorIcon.TYPE),undefined);
    saveMyBlock(Blockly,ws,'指定して進む',[params[1],{id:params[0].id,name:'長さ'},{name:'回数'}],def.id);
    assert.equal(call.getProcedureCall(),'指定して進む');
    assert.equal(call.getInputTargetBlock('ARG0').getFieldValue('NUM'),20);
    assert.equal(call.getInputTargetBlock('ARG1').id,distanceId);
    assert.equal(call.getInputTargetBlock('ARG1').getFieldValue('PORT'),'D');
    assert.equal(call.getInputTargetBlock('ARG2').getFieldValue('NUM'),0);
    assert.equal(body.getInputTargetBlock('DEGREES').getFieldValue('ARG_NAME'),'長さ');
    assert.equal(body.getInputTargetBlock('DEGREES').parameterId,def.getVarModels()[1].getId());
    const state=Blockly.serialization.workspaces.save(ws),restored=new Blockly.Workspace();
    try{
      Blockly.serialization.workspaces.load(state,restored);
      const savedCall=restored.getBlockById(call.id);
      assert.equal(savedCall.getInputTargetBlock('ARG1').id,distanceId);
      assert.match(generateStandard(restored,pythonGenerator).source,/_lab_distance\(port.D\), 0\)/);
    }finally{restored.dispose();}
  }finally{ws.dispose();}
});
test('removing a used argument fails without changing the program; unused added arguments can be removed',()=>{
  const ws=new Blockly.Workspace();try{
    const {def,params,call}=fixture(ws),before=JSON.stringify(Blockly.serialization.workspaces.save(ws));
    assert.throws(()=>saveMyBlock(Blockly,ws,'進む',[params[1]],def.id),/使っている引数/);
    assert.equal(JSON.stringify(Blockly.serialization.workspaces.save(ws)),before);
    saveMyBlock(Blockly,ws,'進む',[...params,{name:'回数'}],def.id);
    assert.ok(call.getInput('ARG2'));
    saveMyBlock(Blockly,ws,'進む',params,def.id);
    assert.equal(call.getInput('ARG2'),null);
    assert.equal(call.getInputTargetBlock('ARG0').type,'lab_distance');
  }finally{ws.dispose();}
});
test('form rejects duplicate names and malformed edit metadata before mutation',()=>{
  const ws=new Blockly.Workspace();try{
    const def=saveMyBlock(Blockly,ws,'Move',[]);
    assert.throws(()=>saveMyBlock(Blockly,ws,'move',[]),/同じ名前/);
    assert.throws(()=>saveMyBlock(Blockly,ws,'別名',[{name:'Speed'},{name:'speed'}]),/別々の名前/);
    assert.throws(()=>saveMyBlock(Blockly,ws,'Move',[{name:'距離',id:'unknown'}],def.id),/編集情報/);
    assert.equal(ws.getAllBlocks(false).filter(b=>b.type==='procedures_defnoreturn').length,1);
  }finally{ws.dispose();}
});
