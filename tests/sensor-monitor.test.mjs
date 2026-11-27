import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {FrameReader,encodeFrame,parseDevices,SpikeConnection} from './spike-ble.js';
import {SensorMonitor} from './sensor-monitor.js';
const fixture=JSON.parse(readFileSync(new URL('./sensor-notification-fixture.json',import.meta.url),'utf8'));
const bytes=Uint8Array.from(fixture.hex.split(' '),x=>parseInt(x,16));
const packet=body=>Uint8Array.of(0x3c,body.length&255,body.length>>8,...body);
function color(port,{reflection=null,code=9,rgb=[100,200,300]}={}){return [12,port,code&255,...(reflection===null?[]:[reflection]),...rgb.flatMap(x=>[x&255,x>>8])];}

test('actual 102-byte Hub OS 1.8.149 notification decodes all connected ports and reflection without shifting',()=>{
 assert.equal(bytes.length,102);const result=parseDevices(bytes);assert.deepEqual(result.map(r=>r.port),['A','B','C','E','F']);
 assert.equal(result[0].device,'Mモーター');assert.equal(result[0].position,33);assert.equal(result[1].position,74);assert.equal(result[2].distance,null);assert.equal(result[3].device,'Lモーター');assert.equal(result[3].position,63);
 const c=result[4];assert.equal(c.color,7);assert.equal(c.colorName,'黄');assert.equal(c.reflection,100);assert.deepEqual(c.rgb,[606,459,404]);assert.match(c.text,/反射光：100％/);
});

test('captured color extension survives every BLE chunk size and priority interleaving',()=>{
 const encoded=encodeFrame(bytes);
 for(let size=1;size<=20;size++){
  const result=[],reader=new FrameReader(f=>result.push([...f]));
  for(let i=0;i<encoded.length;i+=size){reader.push(encoded.slice(i,i+size));if(i===0)reader.push(Uint8Array.of(1,...encodeFrame(Uint8Array.of(0x29,0))));}
  assert.deepEqual(result.at(-1),[...bytes]);assert.equal(parseDevices(Uint8Array.from(result.at(-1))).at(-1).reflection,100);
 }
});

test('old and reflection formats support signed no-color, zero and 100 percent without fabricating reflection from RGB',()=>{
 for(const reflection of [null,0,1,50,100])for(const code of [-1,0,7,10])for(const rgb of [[0,0,0],[1023,1023,1023],[1024,1024,1024],[1024,1023,1024],[606,459,404]]){
  const result=parseDevices(packet([...color(5,{reflection,code,rgb}),13,2,150,0]));assert.equal(result[0].reflection,reflection);assert.equal(result[0].color,code);assert.deepEqual(result[0].rgb,rgb);assert.equal(result[1].distance,15);
  if(reflection===null)assert.match(result[0].text,/未取得/);
 }
});

test('mixed color layouts and following records resolve only through valid complete boundaries',()=>{
 for(const records of [[color(0),color(1,{reflection:10}),[13,2,255,255]],[color(1,{reflection:0,rgb:[0,0,0]}),[0,100],color(2)],[color(5,{reflection:100}),[11,0,50,1]]]){
  const result=parseDevices(packet(records.flat()));assert.equal(new Set(result.map(r=>r.port)).size,result.length);
 }
 assert.throws(()=>parseDevices(packet([12,6,0,0,0,0,0,0,0])),/ポート/);
 assert.throws(()=>parseDevices(packet([99,0,0])),/未対応/);
 assert.throws(()=>parseDevices(bytes.slice(0,-1)),/サイズ/);
 for(let n=1;n<10;n++)assert.throws(()=>parseDevices(packet([...bytes.slice(3,92),...bytes.slice(92,92+n)])));
});

test('actual and malformed notifications do not disconnect BLE or expose partially decoded values',()=>{
 const readings=[],errors=[],logs=[],connection=new SpikeConnection({onDevices:v=>readings.push(v),onDeviceError:e=>errors.push(e),onLog:m=>logs.push(m)});
 connection.device={gatt:{connected:true}};connection.rx={};connection.info={firmware:'1.8.149'};
 connection.receive(bytes);assert.equal(readings.length,1);assert.equal(errors.length,0);assert.equal(connection.connected,true);
 const invalid=bytes.slice();invalid[93]=7;connection.receive(invalid);assert.equal(readings.length,1);assert.equal(errors.length,1);assert.equal(connection.connected,true);
 connection.receive(bytes);assert.equal(readings.length,2);assert.equal(connection.connected,true);
});

test('monitor distinguishes current zero reflection, old values, stopped updates, errors, missing ports and disconnect',()=>{
 const m=new SensorMonitor();assert.equal(m.view(0).status,'未接続');m.connect();assert.equal(m.view(0).status,'未取得');m.start(1000);assert.equal(m.view(1100).status,'読取り待ち');
 m.accept(parseDevices(packet(color(5,{reflection:0}))),1200);let view=m.view(1200);assert.equal(view.fresh,true);assert.equal(view.rows[5].reflection,0);assert.match(view.rows[5].text,/反射光：0％/);assert.equal(view.rows[0].state,'通知なし');
 view=m.view(4201);assert.equal(view.fresh,false);assert.equal(view.status,'更新が届いていません');assert.equal(view.rows[5].state,'前回の値');
 m.fail('形式エラー');assert.match(m.view(4300).status,/読取りエラー/);assert.equal(m.view(4300).rows[5].device,'カラーセンサー');
 m.accept([],4400);assert.equal(m.view(4400).rows[5].device,'接続機器の通知なし');m.stop();assert.equal(m.view(4500).status,'更新停止中');
 m.accept(parseDevices(bytes),4600);assert.equal(m.view(4600).status,'更新停止中');m.disconnect();assert.equal(m.view(4700).rows[5].device,'未取得');
 m.connect();m.start(5000);assert.equal(m.view(8001).status,'更新が届いていません');
});


test('reported saturated RGB snapshots preserve reflection and BLE connection',()=>{
 const captures=JSON.parse(readFileSync(new URL('./sensor-saturation-fixtures.json',import.meta.url),'utf8'));
 const readings=[],errors=[],connection=new SpikeConnection({onDevices:v=>readings.push(v),onDeviceError:e=>errors.push(e)});
 connection.device={gatt:{connected:true}};connection.rx={};connection.info={firmware:'1.8.149'};
 for(const capture of captures){
  const frame=Uint8Array.from(capture.hex.split(' '),x=>parseInt(x,16));
  assert.equal(frame.length,102);const result=parseDevices(frame),c=result.at(-1);
  assert.equal(c.port,'F');assert.equal(c.color,10);assert.equal(c.colorName,'白');assert.equal(c.reflection,99);assert.deepEqual(c.rgb,capture.rgb);
  connection.receive(frame);assert.equal(connection.connected,true);
 }
 assert.equal(readings.length,4);assert.deepEqual(errors,[]);
 for(const reflection of [null,0,99,100])for(const rgb of [[1025,0,0],[0,65535,0],[0,0,1025]])assert.throws(()=>parseDevices(packet(color(5,{reflection,rgb}))));
 assert.throws(()=>parseDevices(packet(color(5,{reflection:101,rgb:[1024,1024,1024]}))));
});
