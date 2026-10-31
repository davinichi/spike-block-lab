import {test} from 'node:test';
import assert from 'node:assert/strict';
import {encodeFrame,decodePayload,FrameReader,alignedCRC,SpikeConnection} from './spike-ble.js';
import {crc32} from './zip.js';

test('SPIKE COBS matches independent protocol examples including all three escaped values',()=>{
  assert.deepEqual([...encodeFrame(Uint8Array.of(0,1,2))],[0,84,168,0,2]);
  assert.deepEqual([...encodeFrame(Uint8Array.of(0x1e,0,0))],[7,29,0,0,2]);
  for(const length of [0,1,83,84,85,167,168,255,1024]) {
    for(const bytes of [Uint8Array.from({length},(_,i)=>i%256),new Uint8Array(length).fill(5)]) {
      const frame=encodeFrame(bytes);assert.deepEqual(decodePayload(frame.slice(0,-1)),bytes);
      assert.ok([...frame.slice(0,-1)].every(b=>b!==1&&b!==2&&b!==3));
    }
  }
});
test('fragmented low-priority frames resume correctly after an interleaved priority notification',()=>{
  const frames=[],reader=new FrameReader(x=>frames.push([...x]));
  const a=encodeFrame(Uint8Array.of(0x11,0)),b=encodeFrame(Uint8Array.of(0x20,1));
  reader.push(a.slice(0,1));reader.push(Uint8Array.of(1,...b));reader.push(a.slice(1));
  assert.deepEqual(frames,[[0x20,1],[0x11,0]]);
});
test('protocol CRC pads to four bytes, and aligned chunk CRC equals the full-file CRC',()=>{
  const bytes=new TextEncoder().encode('abcdefghijk');
  assert.equal(alignedCRC(Uint8Array.of(1)),crc32(Uint8Array.of(1,0,0,0)));
  assert.equal(alignedCRC(bytes),alignedCRC(bytes.slice(8),alignedCRC(bytes.slice(0,8))));
});

function mock({timeout=100,failType=null,dropType=null}={}) {
  const requests=[],listeners=new Map();let connection;
  const info=Uint8Array.of(1,1,0,0,0,3,6,0,0,20,0,64,0,16,0,0,0);
  const reader=new FrameReader(payload=>{
    requests.push(payload);
    if(payload[0]===dropType)return;
    const reply=payload[0]===0?info:Uint8Array.of(({0x1e:0x1f,0x0c:0x0d,0x10:0x11})[payload[0]],payload[0]===failType?1:0);
    queueMicrotask(()=>{
      const frame=encodeFrame(reply);
      for(let i=0;i<frame.length;i+=3){const value=new DataView(frame.buffer,i,Math.min(3,frame.length-i));listeners.get('characteristicvaluechanged')?.({target:{value}});}
    });
  });
  const tx={addEventListener:(name,fn)=>listeners.set(name,fn),removeEventListener:name=>listeners.delete(name),startNotifications:async()=>{}};
  const rx={writeValueWithoutResponse:async bytes=>reader.push(bytes)};
  const device={name:'Fake SPIKE',addEventListener:(name,fn)=>listeners.set(name,fn),removeEventListener:name=>listeners.delete(name)};
  device.gatt={connected:false,connect:async()=>{device.gatt.connected=true;return {getPrimaryService:async()=>({getCharacteristic:async uuid=>uuid.includes('0001-')?rx:tx})};},disconnect:()=>{device.gatt.connected=false;listeners.get('gattserverdisconnected')?.();}};
  connection=new SpikeConnection({bluetooth:{requestDevice:async()=>device},timeout});
  return {connection,requests,device};
}
test('connect, source upload, separate run and stop use the expected slot without erasing first',async()=>{
  const {connection,requests}=mock();await connection.connect();assert.equal(connection.info.firmware,'3.6.0');
  const source='print("こんにちは")\n',result=await connection.upload(source,7);
  assert.equal(result.slot,7);assert.ok(connection.connected);
  const start=requests.find(p=>p[0]===0x0c),nameEnd=start.indexOf(0,1);
  assert.equal(new TextDecoder().decode(start.slice(1,nameEnd)),'program.py');assert.equal(start[nameEnd+1],7);
  const chunks=requests.filter(p=>p[0]===0x10);
  const reconstructed=Uint8Array.from(chunks.flatMap(p=>[...p.slice(7)]));
  assert.equal(new TextDecoder().decode(reconstructed),source);
  assert.equal(new DataView(chunks.at(-1).buffer).getUint32(1,true),result.crc);
  assert.ok(!requests.some(p=>p[0]===0x46));
  assert.ok(!requests.some(p=>p[0]===0x1e&&p[1]===0));
  await connection.run(7);assert.deepEqual([...requests.at(-1)],[0x1e,0,7]);
  await connection.stop(7);assert.deepEqual([...requests.at(-1)],[0x1e,1,7]);connection.disconnect();
});
test('a rejected chunk never reports successful upload or launches the program',async()=>{
  const {connection,requests}=mock({failType:0x10});await connection.connect();
  await assert.rejects(()=>connection.upload('print(1)',0),/受け付けません/);
  assert.equal(connection.busy,false);assert.ok(!requests.some(p=>p[0]===0x1e&&p[1]===0));connection.disconnect();
});
test('timeout closes the connection and permits reconnection',async()=>{
  const {connection}=mock({dropType:0x10,timeout:15});await connection.connect();
  await assert.rejects(()=>connection.upload('print(1)',0),/返事がありません/);
  assert.equal(connection.connected,false);assert.equal(connection.busy,false);await connection.connect();connection.disconnect();
});
test('disconnect rejects a pending response and invalid slots fail before writing',async()=>{
  const {connection,device}=mock({dropType:0x10});await connection.connect();
  await assert.rejects(()=>connection.upload('x',20),/保存番号/);
  const upload=connection.upload('print(1)',0);setTimeout(()=>device.gatt.disconnect(),5);
  await assert.rejects(()=>upload,/接続が切れました/);assert.equal(connection.connected,false);
});
