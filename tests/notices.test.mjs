import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {JSDOM} from 'jsdom';
import * as Blockly from 'blockly';
import {pythonGenerator} from 'blockly/python';
import {setupClassroom} from './classroom-blocks.js';
import {generateStandard} from './standard.js';
import {installNotices} from './notices.js';
setupClassroom(Blockly);
function fixture(){
 const dom=new JSDOM(readFileSync(new URL('./index.html',import.meta.url),'utf8')),$=id=>dom.window.document.getElementById(id);
 const blocks=new Map(),jobs=new Map();let next=0,opened=0,resized=0;
 const api=installNotices({workspace:{getBlockById:id=>blocks.get(id)},programPanel:$('programNotice'),programText:$('buildStatus'),hint:$('editorHint'),programAction:$('programActionStatus'),saveNotice:$('saveNotice'),targets:{connect:$('connectStatus'),transfer:$('actionStatus'),sensor:$('sensorActionStatus'),recording:$('recordActionStatus')},showConnection:()=>opened++,onResize:()=>resized++,setTimer:fn=>{jobs.set(++next,fn);return next;},clearTimer:id=>jobs.delete(id)});
 return {api,$,dom,blocks,jobs,opened:()=>opened};
}
test('a real generation error appears above the editor, marks its block and clears after repair without a navigation button',()=>{
 const f=fixture(),w=new Blockly.Workspace();try{
 const start=w.newBlock('spike_start'),pair=w.newBlock('lab_pair');pair.setFieldValue('B','LEFT');pair.setFieldValue('B','RIGHT');start.nextConnection.connect(pair.previousConnection);
 let error;try{generateStandard(w,pythonGenerator);}catch(e){error=e;}assert.equal(error.blockId,pair.id);
 const svg=f.dom.window.document.createElement('div');f.blocks.set(pair.id,{getSvgRoot:()=>svg});f.api.program(error.message,error.blockId);
 assert.equal(f.$('programNotice').hidden,false);assert.equal(f.$('editorHint').hidden,true);assert.match(f.$('buildStatus').textContent,/違う2個/);assert.ok(svg.classList.contains('sbl-error-block'));
 assert.ok(f.$('programNotice').compareDocumentPosition(f.$('blocklyDiv'))&4);assert.equal(f.$('jumpToError'),null);assert.equal(f.$('programNotice').querySelector('button'),null);
 pair.setFieldValue('C','RIGHT');generateStandard(w,pythonGenerator);f.api.program();assert.equal(f.$('programNotice').hidden,true);assert.equal(f.$('editorHint').hidden,false);assert.equal(svg.classList.contains('sbl-error-block'),false);
 f.api.program('Unknown source error');assert.equal(f.$('programNotice').hidden,false);
 }finally{w.dispose();}
});
test('operation errors stay by their own controls and file notifications never clear connection or program errors',()=>{
 const f=fixture();f.api.program('Bad program');
 for(const [channel,id] of [['connect','connectStatus'],['transfer','actionStatus'],['sensor','sensorActionStatus'],['recording','recordActionStatus']]){f.api.notify('<unsafe> '+channel,true,channel);assert.equal(f.$(id).textContent,'<unsafe> '+channel);assert.equal(f.$(id).querySelector('unsafe'),null);assert.equal(f.$(id).hidden,false);}
 assert.equal(f.opened(),4);f.api.notify('File download started',false,'save');assert.equal(f.$('saveNotice').parentElement.querySelector('#saveProject'),f.$('saveProject'));assert.equal(f.$('saveNotice').hidden,false);
 for(const [id,fn] of [...f.jobs]){f.jobs.delete(id);fn();}assert.equal(f.$('saveNotice').hidden,true);assert.equal(f.$('connectStatus').hidden,false);assert.equal(f.$('programNotice').hidden,false);
 f.api.notify('Saved',false,'save');f.api.notify('Storage full',true,'save');assert.equal(f.jobs.size,0);
 assert.equal(f.$('saveNotice').textContent,'Storage full');assert.ok(f.$('saveNotice').classList.contains('notice-error'));
 assert.ok(f.$('logContent'));assert.ok(f.$('log'));assert.ok(f.$('logContent').compareDocumentPosition(f.$('log'))&16);
});
test('failed actions route errors to the chosen notice, retain detailed logs, and always release the busy state',async()=>{
 const f=fixture(),app=readFileSync(new URL('./app.js',import.meta.url),'utf8'),source=app.slice(app.indexOf('async function action('),app.indexOf('let connectionLayoutFrame='));
 const logs=[],c=vm.createContext({acting:false,feedback:f.api.notify,update:()=>{},log:message=>logs.push(message),fail:async()=>{throw Error('Transfer failed');}});vm.runInContext(source,c);
 await vm.runInContext("action(fail,'connect')",c);assert.equal(f.$('connectStatus').textContent,'Transfer failed');assert.equal(c.acting,false);assert.deepEqual(logs,['Transfer failed']);
 await vm.runInContext("action(fail,'program')",c);assert.equal(f.$('programActionStatus').textContent,'Transfer failed');assert.equal(f.$('actionStatus').hidden,true);
});
