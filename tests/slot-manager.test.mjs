import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
import {installSlotManager} from './slot-manager.js';
function fixture(){
 const dom=new JSDOM(readFileSync(new URL('./index.html',import.meta.url),'utf8'));const d=dom.window.document,$=id=>d.getElementById(id);
 const dialog=$('slotManagerDialog');dialog.showModal=()=>dialog.open=true;dialog.close=()=>dialog.open=false;
 const calls=[],prompts=[],deleted=[];let allow=true,busy=false,hook=()=>{},release;
 let connection={connected:true,device:{name:'Class Hub'},clearSlot:async n=>{calls.push(n);if(release)await release;}};
 const api=installSlotManager({dialog,trigger:$('manageSlots'),closeButton:$('closeSlotManager'),select:$('deleteSlotNumber'),deleteButton:$('deleteSlotProgram'),status:$('slotDeleteStatus'),hubLabel:$('slotManagerHub'),getConnection:()=>connection,isBusy:()=>busy,runAction:fn=>fn(),onDeleted:n=>deleted.push(n),confirmDelete:s=>{prompts.push(s);hook();return allow;}});
 return {dom,$,api,calls,prompts,deleted,connection,allow:v=>allow=v,busy:v=>busy=v,hook:fn=>hook=fn,swap:()=>connection={...connection,device:{name:'Other hub'}},hold:p=>release=p,open:()=>$('manageSlots').onclick(),select:n=>{$('deleteSlotNumber').value=String(n);$('deleteSlotNumber').onchange();},remove:()=>$('deleteSlotProgram').onclick()};
}
test('slot chooser has 0–19 with unknown occupancy, cancels without writes and confirms exact hub and slot',async()=>{
 const f=fixture();f.api.sync();assert.ok(!f.$('manageSlots').disabled);f.open();
 assert.equal(f.$('deleteSlotNumber').options.length,21);assert.equal(f.$('deleteSlotNumber').value,'');assert.ok(f.$('deleteSlotProgram').disabled);
 assert.match(f.$('deleteSlotNumber').options[20].text,/19.*未取得/);await f.remove();assert.equal(f.prompts.length,0);
 f.select(7);f.allow(false);await f.remove();assert.deepEqual(f.calls,[]);assert.deepEqual(f.deleted,[]);
 assert.match(f.prompts[0],/Class Hub.*7/);assert.match(f.prompts[0],/元に戻せません/);
 f.allow(true);await f.remove();assert.deepEqual(f.calls,[7]);assert.deepEqual(f.deleted,[7]);assert.match(f.$('slotDeleteStatus').textContent,/7.*応答/);f.dom.window.close();
});
test('busy, disconnect and changed hub disable deletion; reconnect during confirmation cancels the command',async()=>{
 for(const mode of ['busy','disconnect','swap','duringConfirm']){
  const f=fixture();f.open();f.select(3);
  if(mode==='busy')f.busy(true);if(mode==='disconnect')f.connection.connected=false;if(mode==='swap')f.swap();if(mode==='duringConfirm')f.hook(()=>{f.connection.device={name:'Reconnected'};});
  f.api.sync();if(mode!=='duringConfirm')assert.ok(f.$('deleteSlotProgram').disabled);
  await f.remove();assert.deepEqual(f.calls,[]);f.dom.window.close();
 }
});
test('in-flight deletion locks controls and double clicks; failures never invalidate a transferred program',async()=>{
 const f=fixture();f.open();f.select(0);let finish;f.hold(new Promise(resolve=>finish=resolve));
 const pending=f.remove();assert.ok(f.$('deleteSlotProgram').disabled);assert.ok(f.$('closeSlotManager').disabled);await f.remove();assert.deepEqual(f.calls,[0]);finish();await pending;assert.ok(!f.$('closeSlotManager').disabled);
 f.connection.clearSlot=async()=>{throw Error('NAK');};f.select(1);await assert.rejects(f.remove(),/NAK/);assert.deepEqual(f.deleted,[0]);assert.match(f.$('slotDeleteStatus').textContent,/確認できません/);f.dom.window.close();
});
