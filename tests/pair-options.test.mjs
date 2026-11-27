import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as Blockly from 'blockly';
import {setupClassroom} from './classroom-blocks.js';
setupClassroom(Blockly);
const ports=['A','B','C','D','E','F'];
const types=[...['','l_','m_'].flatMap(kind=>['run','angle','rotation','time'].map(action=>'lab_motor_'+kind+'pair_'+action)),'lab_motor_group_stop'];
test('motor pair menus contain each unordered port combination once and preserve legacy reversed values',()=>{
 const ws=new Blockly.Workspace();
 try{
  for(const type of types){
   const b=ws.newBlock(type),options=b.getField('PORTS').getOptions(false).filter(o=>o[1].includes(','));
   assert.equal(options.length,15,type);assert.equal(new Set(options.map(o=>o[1])).size,15);
   for(const [,value]of options)assert.ok(value[0]<value[2],value);
   b.dispose();
   for(const left of ports)for(const right of ports)if(left!==right){
    const canonical=[left,right].sort().join(',');
    const loaded=Blockly.serialization.blocks.append({type,fields:{PORTS:left+','+right}},ws);
    assert.equal(loaded.getFieldValue('PORTS'),canonical,type+' '+left+right);
    const saved=Blockly.serialization.blocks.save(loaded);loaded.dispose();
    const restored=Blockly.serialization.blocks.append(saved,ws);
    assert.equal(restored.getFieldValue('PORTS'),canonical);restored.dispose();
   }
  }
 }finally{ws.dispose();}
});
test('movement motor wiring preserves left and right order',()=>{
 const ws=new Blockly.Workspace();try{
  const b=Blockly.serialization.blocks.append({type:'lab_pair',fields:{LEFT:'B',RIGHT:'A'}},ws);
  assert.equal(b.getFieldValue('LEFT'),'B');assert.equal(b.getFieldValue('RIGHT'),'A');
 }finally{ws.dispose();}
});
