import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as Blockly from 'blockly';
import {JSDOM} from 'jsdom';
import {halfWidthNumberText,installNumericTextNormalization} from './numeric-text.js';

test('full-width digits, minus and decimal point normalize without changing other text',()=>{
 assert.equal(halfWidthNumberText('－１２．５'),'-12.5');
 assert.equal(halfWidthNumberText('−８０'),'-80');
 assert.equal(halfWidthNumberText('０１２３４５６７８９'),'0123456789');
 assert.equal(halfWidthNumberText('12.5'), '12.5');
 assert.equal(halfWidthNumberText('名前ー。'), '名前ー。');
});

function fixture(){
 const dom=new JSDOM('<input><span hidden></span>'),document=dom.window.document;
 const input=document.querySelector('input'),notice=document.querySelector('span'),jobs=new Map();let next=0;
 const dispose=installNumericTextNormalization(Blockly,{document,notice,setTimer:fn=>{jobs.set(++next,fn);return next;},clearTimer:id=>jobs.delete(id)});
 const field=new Blockly.FieldNumber(0,-100,100);field.htmlInput_=input;
 const handler=()=>field.setValue(field.getValueFromEditorText_(input.value));input.addEventListener('input',handler);
 const enter=text=>{input.value=text;input.dispatchEvent(new dom.window.Event('input',{bubbles:true}));};
 return {dom,document,input,notice,jobs,field,enter,dispose};
}

test('actual number field validates normalized input, preserves limits and ignores text fields',()=>{
 const f=fixture();try{
  f.enter('－１２．５');assert.equal(f.field.getValue(),-12.5);assert.equal(f.input.value,'-12.5');assert.equal(f.notice.textContent,'半角に直しました');assert.equal(f.notice.hidden,false);
  f.enter('９９９');assert.equal(f.field.getValue(),100);
  const text=new Blockly.FieldTextInput('');text.setValue('変数１２');assert.equal(text.getValue(),'変数１２');
  f.enter('１２x');assert.equal(f.field.getValue(),100); // invalid input still rejected
  assert.equal(f.jobs.size,1);for(const fn of f.jobs.values())fn();assert.equal(f.notice.hidden,true);
 }finally{f.dispose();}
});

test('IME composition is left alone until committed and converts only once',()=>{
 const f=fixture();try{
  f.input.dispatchEvent(new f.dom.window.CompositionEvent('compositionstart',{bubbles:true}));
  f.enter('－８．５');assert.equal(f.input.value,'－８．５');assert.equal(f.notice.hidden,true);
  f.input.dispatchEvent(new f.dom.window.CompositionEvent('compositionend',{bubbles:true}));
  assert.equal(f.input.value,'-8.5');assert.equal(f.field.getValue(),-8.5);assert.equal(f.jobs.size,1);
  const saved=Blockly.serialization.workspaces;assert.ok(saved);
 }finally{f.dispose();}
});

test('conversion participates in real block save/reload and generated numeric values',()=>{
 const f=fixture(),ws=new Blockly.Workspace(),again=new Blockly.Workspace();try{
  const b=ws.newBlock('math_number'),field=b.getField('NUM');field.setValue(field.getValueFromEditorText_('－２０．５'));
  Blockly.serialization.workspaces.load(Blockly.serialization.workspaces.save(ws),again);
  assert.equal(again.getAllBlocks(false)[0].getFieldValue('NUM'),-20.5);
 }finally{ws.dispose();again.dispose();f.dispose();}
});
