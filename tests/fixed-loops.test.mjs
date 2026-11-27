import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as Blockly from 'blockly';
import {setupClassroom} from './classroom-blocks.js';
import {pythonGenerator} from 'blockly/python';
setupClassroom(Blockly);
test('legacy repeat modes keep fixed labels, JSON/XML values and Python semantics',()=>{
 for(const mode of ['UNTIL','WHILE']){
 const w=new Blockly.Workspace(),copy=new Blockly.Workspace();try{
 Blockly.serialization.workspaces.load({blocks:{languageVersion:0,blocks:[{type:'controls_whileUntil',fields:{MODE:mode},inputs:{BOOL:{block:{type:'logic_boolean',fields:{BOOL:'TRUE'}}}}}]}},w);
 const b=w.getTopBlocks(false)[0],f=b.getField('MODE');assert.equal(f.getValue(),mode);assert.equal(f.EDITABLE,false);assert.equal(f.isVisible(),false);assert.equal(typeof f.getOptions,'undefined');
 assert.equal(b.getField('UNTIL_LABEL').isVisible(),mode==='UNTIL');assert.equal(b.getField('WHILE_LABEL').isVisible(),mode==='WHILE');
 const state=Blockly.serialization.workspaces.save(w);assert.equal(state.blocks.blocks[0].fields.MODE,mode);
 Blockly.serialization.workspaces.load(state,copy);assert.equal(copy.getTopBlocks(false)[0].getFieldValue('MODE'),mode);
 const py=pythonGenerator.workspaceToCode(copy);assert.match(py,mode==='WHILE'?/while True:/:/while not True:/);
 const xml=Blockly.Xml.workspaceToDom(w);copy.clear();Blockly.Xml.domToWorkspace(xml,copy);assert.equal(copy.getTopBlocks(false)[0].getFieldValue('MODE'),mode);
 b.setFieldValue(mode==='WHILE'?'UNTIL':'WHILE','MODE');assert.equal(b.getField('WHILE_LABEL').isVisible(),mode!=='WHILE');
 }finally{w.dispose();copy.dispose();}
 }
});
