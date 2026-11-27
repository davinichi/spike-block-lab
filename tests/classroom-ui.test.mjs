import {test} from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('./app.js',import.meta.url),'utf8');
const updateSource=source.slice(source.indexOf('function update(){'),source.indexOf('async function action('));
test('connection badge distinguishes offline, connecting and connected states and names the chosen hub',()=>{
 const nodes=new Map();
 const $=id=>{if(!nodes.has(id))nodes.set(id,{value:'0',attrs:{},classes:new Set(),setAttribute(name,value){this.attrs[name]=value;},classList:{toggle(name,on){const e=nodes.get(id);if(on)e.classes.add(name);else e.classes.delete(name);}}});return nodes.get(id);};
 const context={slotManager:null,$,acting:false,connecting:false,connection:{busy:false,connected:false,device:{name:'Class Hub'},info:{firmware:'test'}},bluetoothEnvironment:()=>({available:true,message:'Ready'}),latest:null,transferred:null,sensorMonitor:{active:false}};
 vm.createContext(context);vm.runInContext(updateSource,context);context.update();
 assert.equal($('connectionLabel').textContent,'SPIKE 未接続');assert.ok(!$('connection').classes.has('connected'));
 context.connecting=true;context.update();assert.equal($('connectionLabel').textContent,'SPIKE 接続確認中');assert.ok($('connection').classes.has('connecting'));
 context.connecting=false;context.connection.connected=true;context.update();assert.equal($('connectionLabel').textContent,'SPIKE 接続中');assert.ok($('connection').classes.has('connected'));assert.ok(!$('connection').classes.has('connecting'));assert.match($('connection').attrs['aria-label'],/Class Hub/);
 context.connection.connected=false;context.update();assert.equal($('connectionLabel').textContent,'SPIKE 未接続');assert.ok(!$('connection').classes.has('connected'));
});
