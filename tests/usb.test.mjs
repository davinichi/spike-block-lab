import {test} from 'node:test';
import assert from 'node:assert/strict';
import {SpikeUsbConnection,usbEnvironment,LEGO_USB_VENDOR_ID} from './spike-usb.js';
import {encodeFrame,FrameReader,alignedCRC} from './spike-ble.js';

function mock({dropType=null,failType=null,rpc=1,dropFirstInfo=false,rawInfoReply=null}={}){
  const requests=[],writes=[],options=[],closeStates=[];let input,portReader,opened=false;
  const port=new EventTarget();
  port.getInfo=()=>({usbVendorId:1684,usbProductId:9});
  const info=Uint8Array.of(1,rpc,0,0,0,1,8,149,0,20,0,64,0,16,0,0,0);
  const notify=payload=>{
    const frame=encodeFrame(payload);
    for(let i=0;i<frame.length;i+=3)input.enqueue(frame.slice(i,i+3));
  };
  port.open=async config=>{
    assert.equal(opened,false);opened=true;options.push(config);
    portReader=new FrameReader(payload=>{
      requests.push(payload);
      if(payload[0]===0&&dropFirstInfo&&requests.filter(x=>x[0]===0).length===1)return;
      if(payload[0]===0&&rawInfoReply){input.enqueue(rawInfoReply);return;}
      if(payload[0]===dropType)return;
      notify(payload[0]===0?info:Uint8Array.of(({0x1e:0x1f,0x46:0x47,0x0c:0x0d,0x10:0x11,0x28:0x29})[payload[0]],payload[0]===failType?1:0));
    });
    port.readable=new ReadableStream({start(controller){input=controller;}});
    port.writable=new WritableStream({write(bytes){writes.push(bytes);portReader.push(bytes);}});
  };
  port.close=async()=>{closeStates.push({readLocked:port.readable?.locked,writeLocked:port.writable?.locked});assert.equal(port.readable?.locked,false);assert.equal(port.writable?.locked,false);opened=false;};
  const serial={requestPort:async config=>{options.push(config);return port;}};
  const connection=new SpikeUsbConnection({serial,timeout:250,handshakeTimeout:75});
  const unplug=()=>{input.error(Error('Cable unplugged'));port.dispatchEvent(new Event('disconnect'));};
  return {connection,requests,writes,options,closeStates,notify,unplug,port};
}

test('USB negotiates and uploads with protocol CRC, then runs/stops and receives sensor/console frames',async()=>{
  const m=mock(),{connection,requests}=m,progress=[],readings=[],consoleText=[];
  connection.onDevices=x=>readings.push(x);connection.onConsole=x=>consoleText.push(x);
  await connection.connect();assert.equal(connection.connected,true);
  assert.deepEqual(m.options,[{filters:[{usbVendorId:LEGO_USB_VENDOR_ID}]},{baudRate:115200}]);
  assert.equal(connection.info.firmware,'1.8.149');
  const source='print("USB transfer")\n'.repeat(3),bytes=new TextEncoder().encode(source);
  const result=await connection.upload(source,3,n=>progress.push(n));
  assert.deepEqual(requests.slice(0,4).map(x=>x[0]),[0,0x1e,0x46,0x0c]);
  const chunks=requests.filter(x=>x[0]===0x10);assert.deepEqual(Uint8Array.from(chunks.flatMap(x=>[...x.slice(7)])),bytes);
  let crc=0;for(const chunk of chunks){crc=alignedCRC(chunk.slice(7),crc);assert.equal(new DataView(chunk.buffer).getUint32(1,true),crc);}
  assert.equal(result.crc,crc);assert.equal(progress.at(-1),100);
  assert.ok(m.writes.every(packet=>packet.length<=20));
  assert.ok(!requests.some(x=>x[0]===0x1e&&x[1]===0));
  await connection.run(3);assert.deepEqual([...requests.at(-1)],[0x1e,0,3]);
  await connection.stop(3);await connection.observe(500);
  m.notify(Uint8Array.of(0x3c,4,0,13,3,150,0));m.notify(Uint8Array.of(0x21,...new TextEncoder().encode('USB log')));
  await new Promise(r=>setTimeout(r,0));assert.equal(readings[0][0].text,'15 cm');assert.equal(consoleText[0],'USB log');
  await connection.disconnect();assert.equal(connection.connected,false);assert.deepEqual(m.closeStates,[{readLocked:false,writeLocked:false}]);
  await connection.connect();await connection.disconnect();assert.equal(m.closeStates.length,2);
});

test('USB unplug during upload rejects it, releases locks and allows a fresh connection',async()=>{
  const m=mock({dropType:0x10});await m.connection.connect();
  const task=m.connection.upload('print(1)',0);const rejected=assert.rejects(task,/USBケーブル|接続/);
  while(!m.requests.some(x=>x[0]===0x10))await new Promise(r=>setTimeout(r,5));
  m.unplug();await rejected;await m.connection.disconnect();
  assert.equal(m.connection.busy,false);assert.equal(m.connection.connected,false);assert.equal(m.closeStates.length,1);
  await m.connection.connect();await m.connection.disconnect();
});

test('USB timeout and rejected transfer never report success or start a program',async()=>{
 for(const config of [{dropType:0x10},{failType:0x10}]){
  const m=mock(config);await m.connection.connect();
  await assert.rejects(m.connection.upload('print(1)',0),/返事がありません|受け付けません/);
  assert.ok(!m.requests.some(x=>x[0]===0x1e&&x[1]===0));
  await m.connection.disconnect();assert.equal(m.connection.busy,false);
 }
});

test('USB cancellation, port-in-use and unsupported firmware leave no active connection',async()=>{
 for(const name of ['NotFoundError','SecurityError','NetworkError']){
   const serial={requestPort:async()=>{throw Object.assign(Error('test'),{name});}};
   const c=new SpikeUsbConnection({serial});await assert.rejects(c.connect(),/選択されません|許可|開けません/);assert.equal(c.connected,false);
 }
 const m=mock({rpc:2});await assert.rejects(m.connection.connect(),/RPC 2/);assert.equal(m.connection.connected,false);assert.equal(m.closeStates.length,1);
});

test('USB availability is independent of Bluetooth and respects secure context and serial policy',()=>{
 assert.equal(usbEnvironment({navigator:{serial:{}},isSecureContext:true}).available,true);
 assert.equal(usbEnvironment({navigator:{bluetooth:{}},isSecureContext:true}).available,false);
 assert.equal(usbEnvironment({navigator:{serial:{}},isSecureContext:false}).available,false);
 const context={navigator:{serial:{}},document:{permissionsPolicy:{allowsFeature:name=>name!=='serial'}}};
 assert.equal(usbEnvironment(context).available,false);
});

test('USB unplug immediately after an info reply cannot report a successful connection',async()=>{
 const m=mock();const connecting=m.connection.connect();const rejected=assert.rejects(connecting,/接続が切れました/);
 while(!m.requests.some(x=>x[0]===0))await new Promise(r=>setTimeout(r,1));
 m.unplug();await rejected;assert.equal(m.connection.connected,false);assert.equal(m.connection.info,null);
});

test('USB retries a lost initial request without closing the port or changing the wire payload',async()=>{
 const m=mock({dropFirstInfo:true}),logs=[];m.connection.onLog=x=>logs.push(x);
 await m.connection.connect();assert.equal(m.connection.connected,true);
 assert.deepEqual(m.requests.map(x=>[...x]),[[0],[0]]);
 assert.deepEqual(m.writes.map(x=>[...x]),[[0,0,2],[0,0,2]]);
 assert.equal(m.closeStates.length,0);assert.equal(m.options.length,2);
 assert.ok(logs.some(x=>x.includes('2/2')));await m.connection.disconnect();
});

test('USB diagnostics distinguish no bytes from unframed text and never send reset or run commands',async()=>{
 for(const rawInfoReply of [null,new TextEncoder().encode('MicroPython >>> '.repeat(10))]){
  const m=mock({dropType:rawInfoReply?null:0,rawInfoReply}),logs=[];m.connection.onLog=x=>logs.push(x);
  await assert.rejects(m.connection.connect(),/返事がありません/);
  assert.deepEqual(m.requests.map(x=>[...x]),[[0],[0]]);assert.equal(m.closeStates.length,1);
  const diagnostic=logs.find(x=>x.startsWith('USB診断：'));
  assert.match(diagnostic,rawInfoReply?/受信 320 bytes \/ 完了フレーム 0/:/送信 6 bytes \/ 受信 0 bytes/);
  if(rawInfoReply){const captured=logs.find(x=>x.startsWith('USB初期受信HEX'));assert.equal(captured.split('：')[1].split(' ').length,64);}
  else assert.ok(logs.some(x=>x.includes('USB初期受信は0バイト')));
 }
});


test('USB deletion uses the shared ClearSlot protocol and an explicit success response',async()=>{
 const {connection,requests}=mock();await connection.connect();await connection.clearSlot(3);
 assert.deepEqual(requests.slice(1).map(x=>[...x]),[[0x1e,1,3],[0x46,3]]);
 assert.equal(connection.busy,false);await connection.disconnect();
});
