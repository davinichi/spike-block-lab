// SPIKE App 3 BLE protocol. Reference: https://lego.github.io/spike-prime-docs/
import {crc32} from './zip.js';
export const SERVICE='0000fd02-0000-1000-8000-00805f9b34fb';
export const RX='0000fd02-0001-1000-8000-00805f9b34fb';
export const TX='0000fd02-0002-1000-8000-00805f9b34fb';
export function encodeFrame(data) {
  const out=[0];let at=0,block=1;
  for (const b of data) {
    if (b>2) {out.push(b);block++;}
    if (b<=2 || block>84) {
      out[at]=b<=2 ? b*84+block+2 : 255;
      at=out.length;out.push(0);block=1;
    }
  }
  out[at]=block+2;
  return Uint8Array.from([...out.map(b=>b^3),2]);
}
export function decodePayload(bytes) {
  const data=Array.from(bytes,b=>b^3), out=[];
  let i=0;
  while (i<data.length) {
    const code=data[i++];
    if (code<3) throw Error('通信データの区切りが不正です。');
    let delimiter=null,length;
    if (code===255) length=84;
    else {delimiter=Math.floor((code-2)/84);length=(code-2)%84;if(length===0){length=84;delimiter--;}length--;}
    const n=length;
    if(i+n>data.length) throw Error('通信データが途中で終わりました。');
    out.push(...data.slice(i,i+n));i+=n;
    if (delimiter!==null && i<data.length) out.push(delimiter);
  }
  return Uint8Array.from(out);
}
export class FrameReader {
  constructor(onFrame) {this.onFrame=onFrame;this.low=[];this.high=null;}
  push(bytes) {
    for(const b of bytes) {
      if(b===1) {this.high=[];continue;}
      if(b===2) {
        const packet=this.high??this.low;
        if(this.high!==null)this.high=null;else this.low=[];
        if(packet.length)this.onFrame(decodePayload(packet));
      } else {
        const queue=this.high??this.low;queue.push(b);
        if(queue.length>65536)throw Error('通信データが大きすぎます。接続し直してください。');
      }
    }
  }
}
export function alignedCRC(bytes, seed=0) {
  const padded=new Uint8Array(Math.ceil(bytes.length/4)*4);padded.set(bytes);return crc32(padded,seed);
}
export function connectionError(error,stage) {
  const name=error?.name??'Error',detail=error?.message??String(error);
  if(name==='NotFoundError'&&stage==='本体を選択')return '本体が選択されませんでした。公式SPIKEアプリの接続を切り、本体のBluetoothボタンを押してから、もう一度選んでください。';
  if(name==='SecurityError'||name==='NotAllowedError')return 'ブラウザがBluetooth接続を許可していません。アプリのURLをChromeまたはEdgeの通常のタブで直接開き、サイトと端末のBluetooth許可を確認してください。';
  if(name==='NetworkError')return `「${stage}」で接続できませんでした。公式SPIKEアプリと他の接続中のタブを閉じ、本体の電源を入れ直して接続してください。`;
  return `「${stage}」で失敗しました：${detail}`;
}
export function bluetoothEnvironment(context=globalThis) {
  if(context.isSecureContext===false)return {available:false,message:'HTTPSでアプリを開いてください。'};
  if(!context.navigator?.bluetooth)return {available:false,message:'このブラウザ内ではBluetooth接続を利用できません。アプリのURLをChromeまたはEdgeの通常のタブで直接開いてください。'};
  const policy=context.document?.permissionsPolicy??context.document?.featurePolicy;
  if(policy?.allowsFeature&&!policy.allowsFeature('bluetooth'))return {available:false,message:'この表示枠ではBluetooth接続が許可されていません。アプリのURLをChromeまたはEdgeの通常のタブで直接開いてください。'};
  return {available:true,message:'公式SPIKEアプリの接続を切り、本体のBluetoothボタンを押してから接続先を選びます。'};
}
export class SpikeConnection {
  constructor({bluetooth=globalThis.navigator?.bluetooth,timeout=10000,handshakeTimeout=2000,onLog=()=>{},onConsole=()=>{},onChange=()=>{},onDevices=()=>{},onDeviceError=()=>{}}={}) {
    Object.assign(this,{bluetooth,timeout,handshakeTimeout,onLog,onConsole,onChange,onDevices,onDeviceError});this.pending=null;this.device=null;this.busy=false;this.sensorParseWarned=false;
  }
  get connected(){return !!this.rx && !!this.device?.gatt?.connected;}
  async connect() {
    if(this.device)throw Error('一度接続を切ってから、つなぎ直してください。');
    if(!this.bluetooth)throw Error('このブラウザはBluetooth接続に対応していません。ChromebookのChromeで開いてください。');
    let stage='本体を選択';
    const step=name=>{stage=name;this.onLog('接続確認：'+name);};
    try {
      step('本体を選択');
      this.device=await this.bluetooth.requestDevice({filters:[{services:[SERVICE]}]});
      this.onLog('選択した本体：'+(this.device.name||'SPIKE PRIME'));
      this.onDisconnected=()=>{this.onLog('本体との接続が切れました。');this.reset(Error('本体との接続が切れました。'));};
      this.device.addEventListener('gattserverdisconnected',this.onDisconnected);
      step('Bluetoothで接続');
      const server=await this.device.gatt.connect();
      step('SPIKEの通信機能を確認');
      const service=await server.getPrimaryService(SERVICE);
      step('送受信の準備');
      this.rx=await service.getCharacteristic(RX);this.tx=await service.getCharacteristic(TX);
      this.reader=new FrameReader(frame=>this.receive(frame));
      this.onNotify=e=>{try{this.reader.push(new Uint8Array(e.target.value.buffer,e.target.value.byteOffset,e.target.value.byteLength));}catch(error){this.onLog(error.message);this.disconnect();}};
      this.tx.addEventListener('characteristicvaluechanged',this.onNotify);await this.tx.startNotifications();
      step('本体情報を取得');
      for(let attempt=1;attempt<=2;attempt++){
        this.onLog(`Bluetooth本体情報の要求：${attempt}/2`);
        try{await this.negotiate({timeout:this.handshakeTimeout,disconnectOnTimeout:false});break;}
        catch(error){if(attempt===2||error.name!=='TimeoutError'||!this.connected)throw error;}
      }
      step('接続完了');
      this.onChange();return this.info;
    } catch(error) {
      this.onLog(`接続失敗：${stage} / ${error?.name??'Error'} / ${error?.message??error}`);
      this.disconnect();throw Error(connectionError(error,stage));
    }
  }
  async negotiate(options) {
    const info=await this.request(Uint8Array.of(0),1,options);
    if(info.length<17)throw Error('本体情報を読み取れませんでした。');
    const v=new DataView(info.buffer,info.byteOffset,info.byteLength);
    this.info={rpc:info[1],firmware:`${info[5]}.${info[6]}.${v.getUint16(7,true)}`,packet:v.getUint16(9,true),message:v.getUint16(11,true),chunk:v.getUint16(13,true)};
    this.onLog(`本体情報：RPC ${this.info.rpc}.${info[2]} / firmware ${this.info.firmware} / packet ${this.info.packet} / message ${this.info.message} / chunk ${this.info.chunk}`);
    // SPIKE App's version is not the hub firmware version. Negotiate by protocol/capabilities.
    if(this.info.rpc!==1)throw Error(`未対応の通信規格です（RPC ${this.info.rpc}）。ログを保存してください。`);
    if(this.info.packet<1 || this.info.chunk<4 || this.info.message<12)throw Error('本体から届いた転送サイズが不正です。ログを保存してください。');
    return this.info;
  }
  async writePacket(bytes){await this.rx.writeValueWithoutResponse(bytes);}
  reset(error) {
    const device=this.device;
    this.device=null;this.rx=null;this.info=null;
    this.tx?.removeEventListener('characteristicvaluechanged',this.onNotify);
    this.tx=null;device?.removeEventListener('gattserverdisconnected',this.onDisconnected);
    if(this.pending){clearTimeout(this.pending.timer);this.pending.reject(error);this.pending=null;}
    this.onChange();
  }
  disconnect(){const device=this.device;this.reset(Error('接続を切りました。'));device?.gatt?.disconnect();}
  receive(frame) {
    if(frame[0]===0x21){const text=new TextDecoder().decode(frame.slice(1)).replace(/\0+$/,'');this.onConsole(text);this.onLog(text);}
    if(frame[0]===0x3c){
      let readings;
      try{readings=parseDevices(frame);}catch(error){
        this.onDeviceError('接続は維持しています。'+error.message);
        if(!this.sensorParseWarned){
          this.sensorParseWarned=true;
          this.onLog(`値の読み取りエラー（接続は維持）：${error.message}`);
          this.onLog(`センサー通知 ${frame.length} bytes / Hub OS ${this.info?.firmware??'不明'} / HEX ${Array.from(frame.slice(0,256),b=>b.toString(16).padStart(2,'0')).join(' ')}${frame.length>256?' …（先頭256バイト）':''}`);
        }
        return;
      }
      this.onDevices(readings);
    }
    if(this.pending?.type===frame[0]) {const p=this.pending;this.pending=null;clearTimeout(p.timer);p.resolve(frame);}
  }
  async request(payload,type,{timeout=this.timeout,disconnectOnTimeout=true}={}) {
    if(!this.connected)throw Error('本体をつないでください。');
    if(this.pending)throw Error('前の通信が終わるまで待ってください。');
    const frame=encodeFrame(payload), packet=this.info?.packet??20;
    const response=new Promise((resolve,reject)=>{
      const timer=setTimeout(()=>{if(this.pending?.timer===timer){this.pending=null;reject(Object.assign(Error('本体から返事がありません。接続し直してください。'),{name:'TimeoutError'}));}},timeout);
      this.pending={resolve,reject,timer,type};
    });
    // Attach a handler before writes; a disconnect may reject while a write is pending.
    response.catch(()=>{});
    let cancelled=false;
    try {
      const writes=(async()=>{for(let i=0;i<frame.length;i+=packet){if(cancelled)throw Error('接続を切りました。');await this.writePacket(frame.slice(i,i+packet));}})();
      const [,reply]=await Promise.all([writes,response]);if(!this.connected)throw Error('本体との接続が切れました。');return reply;
    } catch(error){cancelled=true;if(disconnectOnTimeout||error.name!=='TimeoutError')this.disconnect();throw error;}
  }
  async status(payload,type,label='処理') {
    const response=await this.request(payload,type);
    if(response.length!==2||response[1]!==0)throw Error(`「${label}」を本体が受け付けませんでした（${response[1]??'応答不正'}）。`);
  }
  async prepareStatus(payload,type,label) {
    const response=await this.request(payload,type);
    if(response.length!==2||![0,1].includes(response[1]))throw Error(`「${label}」の応答が不正です。`);
    this.onLog(`${label}：${response[1]===0?'確認できました':'対象がない場合もあるため、次の要求で準備状態を確認します'}（応答 ${response[1]}）`);
  }
  async upload(source, slot, progress=()=>{}) {
    if(this.busy)throw Error('転送が終わるまで待ってください。');
    if(!this.info)throw Error('本体をつないでください。');
    if(!Number.isInteger(slot)||slot<0||slot>19)throw Error('本体の保存番号は0〜19です。');
    const bytes=new TextEncoder().encode(source);
    if(!bytes.length||bytes.length>128*1024)throw Error('転送できるプログラムは128 KiBまでです。');
    this.busy=true;this.onChange();
    try {
      this.onLog(`転送準備：番号 ${slot} の停止確認`);
      // A stopped hub can NAK Stop. Do not mistake that for a failed file upload.
      await this.prepareStatus(Uint8Array.of(0x1e,1,slot),0x1f,'転送前の停止確認');
      this.onLog(`転送準備：番号 ${slot} の保存先を空にします`);
      // Official example clears the slot before upload; NAK is allowed for an empty slot.
      await this.prepareStatus(Uint8Array.of(0x46,slot),0x47,'保存先の準備');
      const name=new TextEncoder().encode('program.py\0');
      const start=new Uint8Array(1+name.length+1+4);start[0]=0x0c;start.set(name,1);start[1+name.length]=slot;
      new DataView(start.buffer).setUint32(2+name.length,alignedCRC(bytes),true);
      this.onLog(`転送開始：番号 ${slot} / ${bytes.length} bytes`);
      await this.status(start,0x0d,'転送の開始');
      const chunkSize=Math.floor(Math.min(this.info.chunk,this.info.message-7)/4)*4;
      if(chunkSize<4)throw Error('本体の転送サイズに対応できません。');
      let crc=0;
      for(let i=0;i<bytes.length;i+=chunkSize) {
        const chunk=bytes.slice(i,i+chunkSize);crc=alignedCRC(chunk,crc);
        const data=new Uint8Array(7+chunk.length),v=new DataView(data.buffer);data[0]=0x10;v.setUint32(1,crc,true);v.setUint16(5,chunk.length,true);data.set(chunk,7);
        await this.status(data,0x11,`データの転送 ${i+chunk.length}/${bytes.length} bytes`);progress(Math.round((i+chunk.length)*100/bytes.length));
      }
      return {slot,bytes:bytes.length,crc};
    } finally {this.busy=false;this.onChange();}
  }
  async clearSlot(slot){
    if(!Number.isInteger(slot)||slot<0||slot>19)throw Error('本体の保存番号は0〜19です。');
    if(!this.connected||!this.info)throw Error('本体をつないでください。');
    if(this.busy||this.pending)throw Error('前の通信が終わるまで待ってください。');
    this.busy=true;this.onChange();
    try{
      this.onLog(`削除準備：番号 ${slot} の停止確認`);
      await this.prepareStatus(Uint8Array.of(0x1e,1,slot),0x1f,'削除前の停止確認');
      this.onLog(`削除要求：番号 ${slot}`);
      // Unlike upload preparation, deletion must receive an explicit ACK.
      await this.status(Uint8Array.of(0x46,slot),0x47,'プログラムの削除');
      this.onLog(`削除完了：番号 ${slot}（本体の応答を確認）`);
      return {slot};
    }finally{this.busy=false;this.onChange();}
  }
  async run(slot){if(this.busy)throw Error('転送が終わるまで待ってください。');this.onLog(`実行要求：番号 ${slot}`);await this.status(Uint8Array.of(0x1e,0,slot),0x1f,'プログラムの実行');}
  async stop(slot=0){if(this.busy)throw Error('転送が終わるまで待ってください。');await this.status(Uint8Array.of(0x1e,1,slot),0x1f,'プログラムの停止');}
  async observe(interval=500){if(this.busy)throw Error('転送が終わるまで待ってください。');this.sensorParseWarned=false;const data=new Uint8Array(3);data[0]=0x28;new DataView(data.buffer).setUint16(1,interval,true);await this.status(data,0x29);}
}
// The published protocol describes 9-byte color records. Hub OS 1.8.149
// additionally sends a 0..100 reflection byte before the three RGB channels.
// Validate a COMPLETE layout; never scan forward past an unknown byte.
export function parseDevices(frame) {
  if(frame.length<3)throw Error('センサー通知が途中で終わりました。');
  const v=new DataView(frame.buffer,frame.byteOffset,frame.byteLength),size=v.getUint16(1,true);
  if(frame[0]!==0x3c||size!==frame.length-3||frame.length>4096)throw Error('センサー通知のサイズが不正です。');
  const lengths={0:2,1:21,2:26,10:12,11:4,12:9,13:4,14:11};
  const memo=new Map();let deepest={offset:-1,message:'センサー通知の形式を確認できません。'};
  const issue=(i,message)=>{if(i>=deepest.offset)deepest={offset:i,message};};
  const visit=i=>{
    if(i===frame.length)return [{rows:[],ports:0}];
    if(memo.has(i))return memo.get(i);
    const type=frame[i],length=lengths[type],paths=[];
    if(!length){issue(i,`未対応のセンサー通知です（種類 ${type}、位置 ${i}）。`);memo.set(i,paths);return paths;}
    for(const count of type===12?[10,9]:[length]){
      if(i+count>frame.length){issue(i,`センサー通知が途中で終わりました（種類 ${type}、位置 ${i}、必要 ${count}、残り ${frame.length-i}）。`);continue;}
      let row=null;
      if(type>=10){
        const portIndex=frame[i+1];if(portIndex>5){issue(i,'センサー通知のポート番号が不正です。');continue;}
        const port='ABCDEF'[portIndex],bit=1<<portIndex;
        if(type===10){const deviceId=frame[i+2],position=v.getInt32(i+8,true),speed=v.getInt8(i+7);row={port,device:({48:'Mモーター',49:'Lモーター',65:'Sモーター'})[deviceId]??'モーター',deviceId,position,speed,text:`${position}° / ${speed}％`};}
        if(type===11){const value=frame[i+2],pressed=!!frame[i+3];if(value>100||frame[i+3]>1)continue;row={port,device:'フォースセンサー',value,pressed,text:`力の値 ${value} / ${pressed?'押されている':'離されている'}`};}
        if(type===12){
          const color=v.getInt8(i+2),reflection=count===10?frame[i+3]:null,rgbAt=i+(count===10?4:3),rgb=[0,2,4].map(n=>v.getUint16(rgbAt+n,true));
          // Hub OS 1.8.149 real notifications can saturate RGB channels at 1024.
          if(color< -1||color>10||reflection>100||rgb.some(n=>n>1024)){issue(i,'カラーセンサー通知の値・形式が不正です。');continue;}
          const colorName=['黒','マゼンタ','紫','青','空色','ターコイズ','緑','黄','オレンジ','赤','白'][color]??'色なし';
          row={port,device:'カラーセンサー',color,colorName,reflection,rgb,format:count===10?'reflection':'legacy',text:`色：${colorName}（${color}）\n反射光：${reflection===null?'この本体の通知では未取得':reflection+'％'}`};
        }
        if(type===13){const mm=v.getInt16(i+2,true);row={port,device:'距離センサー',distance:mm<0?null:mm/10,text:mm<0?'測定できません':`${mm/10} cm`};}
        if(type===14)row={port,device:'3×3カラーマトリックス',text:'接続されています'};
        for(const tail of visit(i+count))if(!(tail.ports&bit)){paths.push({rows:[row,...tail.rows],ports:tail.ports|bit});if(paths.length>=2)break;}
      }else for(const tail of visit(i+count)){paths.push(tail);if(paths.length>=2)break;}
      if(paths.length>=2)break;
    }
    memo.set(i,paths);return paths;
  };
  const candidates=visit(3);
  if(!candidates.length)throw Error(deepest.message);
  if(candidates.length>1)throw Error('センサー通知の形式を一意に判定できません。通信ログを保存してください。');
  return candidates[0].rows;
}
