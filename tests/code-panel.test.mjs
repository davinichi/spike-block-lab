import {installNotices} from './notices.js';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
import {installCodePanel} from './code-panel.js';
import vm from 'node:vm';
import * as Blockly from 'blockly';
import {pythonGenerator} from 'blockly/python';
import {setupClassroom,classroomToolbox,ensureComparisonInputs} from './classroom-blocks.js';
import {classroomSample} from './classroom-samples.js';
import {generateStandard} from './standard.js';
import {numericInputDefaults,ensureNumericInputShadows} from './numeric-inputs.js';
import {syncArgumentColours} from './common-blocks.js';
function fixture(){
 const dom=new JSDOM(readFileSync(new URL('./index.html',import.meta.url),'utf8'),{pretendToBeVisual:true});
 const d=dom.window.document,$=id=>d.getElementById(id),root=$('programLayout');let width=1210,resizes=0,opens=0,capture=null;
 root.getBoundingClientRect=()=>({left:10,width});
 const splitter=$('codeSplitter');splitter.setPointerCapture=id=>capture=id;splitter.hasPointerCapture=id=>id===capture;splitter.releasePointerCapture=()=>capture=null;
 const api=installCodePanel({root,panel:$('codePanel'),splitter,trigger:$('showCode'),closeButton:$('closeCodePanel'),code:$('code'),status:$('codeStatus'),jumpButton:$('jumpToProgram'),programTab:$('codeProgramTab'),runtimeTab:$('codeRuntimeTab'),filename:$('codeFilename'),returnFocus:$('fileMenu').querySelector('summary'),beforeOpen:()=>opens++,onResize:()=>resizes++,requestFrame:fn=>fn()});
 const event=(type,props)=>{const e=new dom.window.Event(type,{bubbles:true,cancelable:true});Object.assign(e,props);splitter.dispatchEvent(e);return e;};
 return {api,dom,$,root,event,width:n=>{width=n;dom.window.dispatchEvent(new dom.window.Event('resize'));},counts:()=>({resizes,opens,capture})};
}
test('Python view opens without a modal, closes with full-width editing, retains width and returns focus',()=>{
 const f=fixture();try{
  assert.equal(f.$('codeDialog'),null);assert.ok(f.$('codePanel').hidden);
  f.$('showCode').click();assert.ok(!f.$('codePanel').hidden&&!f.$('codeSplitter').hidden);
  assert.ok(f.root.classList.contains('python-open'));assert.equal(f.counts().opens,1);
  assert.equal(f.$('showCode').getAttribute('aria-expanded'),'true');assert.equal(f.dom.window.document.activeElement,f.$('closeCodePanel'));
  f.event('keydown',{key:'ArrowLeft',shiftKey:true});const width=f.root.style.getPropertyValue('--block-width');
  f.$('closeCodePanel').click();assert.ok(f.$('codePanel').hidden&&f.$('codeSplitter').hidden);assert.ok(!f.root.classList.contains('python-open'));
  assert.equal(f.$('showCode').getAttribute('aria-expanded'),'false');assert.equal(f.dom.window.document.activeElement,f.$('fileMenu').querySelector('summary'));
  f.api.setOpen(true,false);assert.equal(f.root.style.getPropertyValue('--block-width'),width);
  assert.ok(f.counts().resizes>=3);
 }finally{f.dom.window.close();}
});
test('splitter supports pointer capture, bounds, cancellation and keyboard resizing after viewport changes',()=>{
 const f=fixture();try{
  f.api.setOpen(true);
  f.event('pointerdown',{button:0,pointerId:7});assert.equal(f.counts().capture,7);
  f.event('pointermove',{pointerId:8,clientX:1500});assert.equal(f.$('codeSplitter').getAttribute('aria-valuenow'),'60');
  f.event('pointermove',{pointerId:7,clientX:-500});assert.equal(parseFloat(f.root.style.getPropertyValue('--block-width')),320);
  f.event('pointermove',{pointerId:7,clientX:9999});assert.equal(parseFloat(f.root.style.getPropertyValue('--block-width')),960);
  f.event('pointercancel',{});assert.equal(f.counts().capture,null);assert.ok(!f.root.classList.contains('resizing-code'));
  f.width(610);assert.ok(parseFloat(f.root.style.getPropertyValue('--block-width'))<=360);
  f.event('keydown',{key:'Home'});assert.equal(parseFloat(f.root.style.getPropertyValue('--block-width')),320);
  const e=f.event('keydown',{key:'ArrowRight'});assert.ok(e.defaultPrevented);assert.ok(parseFloat(f.root.style.getPropertyValue('--block-width'))>320);
  f.event('keydown',{key:'End'});assert.equal(parseFloat(f.root.style.getPropertyValue('--block-width')),360);
  f.event('pointerdown',{button:0,pointerId:9});f.api.setOpen(false,false);assert.equal(f.counts().capture,null);
 }finally{f.dom.window.close();}
});
test('live code replaces changed output, clears stale code on errors and restores it after repair',()=>{
 const f=fixture();try{
  f.api.setOpen(true);const pre=f.$('code');f.api.showSource('print(1)');pre.scrollTop=70;pre.scrollLeft=25;const node=pre.firstChild;
  f.api.showSource('print(1)');assert.equal(pre.firstChild,node);
  f.api.showSource('print(2)');assert.equal(pre.textContent,'print(2)');assert.equal(pre.scrollTop,70);assert.equal(pre.scrollLeft,25);
  f.api.showSource('','左右モーターを設定してください');assert.ok(!pre.textContent.includes('print(2)'));assert.match(pre.textContent,/左右モーター/);assert.ok(f.$('codeStatus').classList.contains('error'));
  f.api.showSource('<script>unsafe()</script>\nasync def _lab_task_0():\n    pass');assert.equal(pre.querySelector('script'),null);assert.ok(!f.$('jumpToProgram').disabled);
  pre.style.lineHeight='22px';f.$('jumpToProgram').click();assert.equal(pre.scrollTop,22);assert.equal(f.dom.window.document.activeElement,pre);
  assert.ok(!f.$('codeStatus').classList.contains('error'));
 }finally{f.dom.window.close();}
});
test('actual application check refreshes Python after a Blockly value change, project replacement and error repair',()=>{
 setupClassroom(Blockly);const f=fixture(),workspace=new Blockly.Workspace();
 try{
  const app=readFileSync(new URL('./app.js',import.meta.url),'utf8');
  const check=app.slice(app.indexOf('function check(){'),app.indexOf('function update(){'));
  const notices=installNotices({workspace,programPanel:f.$('programNotice'),programText:f.$('buildStatus'),programAction:f.$('programActionStatus'),saveNotice:f.$('saveNotice'),targets:{}});
  const context={notices,checking:false,latest:null,workspace,Blockly:{...Blockly,Python:pythonGenerator},$:f.$,codePreview:f.api,generateStandard,ensureNumericInputShadows,ensureComparisonInputs,syncArgumentColours,numericDefaults:numericInputDefaults(classroomToolbox()),update:()=>{}};
  vm.createContext(context);vm.runInContext(check,context);
  Blockly.serialization.workspaces.load(classroomSample('sound'),workspace);context.check();
  const before=f.$('code').textContent;assert.equal(before,context.latest.programSource);
  const frequency=workspace.getAllBlocks(false).find(b=>b.type==='lab_sound_tone').getInputTargetBlock('FREQUENCY');
  frequency.setFieldValue('880','NUM');context.check();
  assert.notEqual(f.$('code').textContent,before);assert.match(f.$('code').textContent,/await _lab_common_tone\(880,/);
  Blockly.serialization.workspaces.load(classroomSample('lights'),workspace);context.check();
  assert.match(f.$('code').textContent,/light_matrix.clear\(\)/);
  workspace.clear();context.check();assert.equal(context.latest,null);assert.match(f.$('code').textContent,/Pythonを生成できません/);assert.ok(!f.$('code').textContent.includes('async def _lab_task_0'));
  Blockly.serialization.workspaces.load(classroomSample('sound'),workspace);context.check();assert.equal(f.$('code').textContent,context.latest.programSource);assert.ok(!f.$('codeStatus').classList.contains('error'));
 }finally{workspace.dispose();f.dom.window.close();}
});
test('learner file is shown first and file switching preserves selection, updates both files and clears both on error',()=>{
 const f=fixture();try{
  f.api.showSource('async def _lab_task_0():\n    pass','','class _LabStop(Exception):\n    pass');f.api.setOpen(true);
  assert.equal(f.$('codeFilename').textContent,'program.py');assert.ok(!f.$('code').textContent.includes('class _LabStop'));
  f.$('codeRuntimeTab').click();assert.match(f.$('code').textContent,/class _LabStop/);assert.equal(f.$('codeFilename').textContent,'sbl_runtime.py');
  assert.ok(f.$('jumpToProgram').hidden);assert.equal(f.$('codeRuntimeTab').getAttribute('aria-selected'),'true');
  f.api.showSource('new program','','new runtime');assert.equal(f.$('code').textContent,'new runtime');
  f.api.showSource('','設定不足');assert.ok(!f.$('code').textContent.includes('new runtime'));
  f.$('codeProgramTab').click();assert.match(f.$('code').textContent,/設定不足/);assert.ok(!f.$('code').textContent.includes('new program'));
  f.api.showSource('latest program','','latest runtime');f.$('codeRuntimeTab').click();f.api.setOpen(false,false);f.api.setOpen(true);
  assert.equal(f.$('code').textContent,'latest program');assert.equal(f.$('codeProgramTab').getAttribute('aria-selected'),'true');
 }finally{f.dom.window.close();}
});
