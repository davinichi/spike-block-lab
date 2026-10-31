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
export class SpikeConnection {
  constructor({bluetooth=globalThis.navigator?.bluetooth,timeout=10000,onLog=()=>{},onChange=()=>{}}={}) {
    Object.assign(this,{bluetooth,timeout,onLog,onChange});this.pending=null;this.device=null;this.busy=false;
  }
  get connected(){return !!this.rx && !!this.device?.gatt?.connected;}
  async connect() {
    if(this.device)throw Error('一度接続を切ってから、つなぎ直してください。');
    if(!this.bluetooth)throw Error('このブラウザはBluetooth接続に対応していません。ChromebookのChromeで開いてください。');
    this.device=await this.bluetooth.requestDevice({filters:[{services:[SERVICE]}]});
    this.onDisconnected=()=>this.reset(Error('本体との接続が切れました。'));
    this.device.addEventListener('gattserverdisconnected',this.onDisconnected);
    try {
      const server=await this.device.gatt.connect(), service=await server.getPrimaryService(SERVICE);
      this.rx=await service.getCharacteristic(RX);this.tx=await service.getCharacteristic(TX);
      this.reader=new FrameReader(frame=>this.receive(frame));
      this.onNotify=e=>{try{this.reader.push(new Uint8Array(e.target.value.buffer,e.target.value.byteOffset,e.target.value.byteLength));}catch(error){this.onLog(error.message);this.disconnect();}};
      this.tx.addEventListener('characteristicvaluechanged',this.onNotify);await this.tx.startNotifications();
      const info=await this.request(Uint8Array.of(0),1);
      if(info.length<15)throw Error('本体情報を読み取れませんでした。');
      const v=new DataView(info.buffer,info.byteOffset,info.byteLength);
      this.info={rpc:info[1],firmware:`${info[5]}.${info[6]}.${v.getUint16(7,true)}`,packet:v.getUint16(9,true),message:v.getUint16(11,true),chunk:v.getUint16(13,true)};
      if(this.info.rpc!==1 || this.info.firmware.split('.')[0]!=='3' || this.info.packet<1 || this.info.chunk<4 || this.info.message<12)throw Error('対応するSPIKE App 3のHub OSか確認してください。');
      this.onChange();return this.info;
    } catch(error) {this.disconnect();throw error;}
  }
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
    if(frame[0]===0x21)this.onLog(new TextDecoder().decode(frame.slice(1)).replace(/\0+$/,''));
    if(this.pending?.type===frame[0]) {const p=this.pending;this.pending=null;clearTimeout(p.timer);p.resolve(frame);}
  }
  async request(payload,type) {
    if(!this.connected)throw Error('本体をつないでください。');
    if(this.pending)throw Error('前の通信が終わるまで待ってください。');
    const frame=encodeFrame(payload), packet=this.info?.packet??20;
    const response=new Promise((resolve,reject)=>{
      const timer=setTimeout(()=>{if(this.pending?.timer===timer){this.pending=null;reject(Error('本体から返事がありません。接続し直してください。'));}},this.timeout);
      this.pending={resolve,reject,timer,type};
    });
    // Attach a handler before writes; a disconnect may reject while a write is pending.
    response.catch(()=>{});
    try {
      for(let i=0;i<frame.length;i+=packet) await this.rx.writeValueWithoutResponse(frame.slice(i,i+packet));
      return await response;
    } catch(error){this.disconnect();throw error;}
  }
  async status(payload,type) {
    const response=await this.request(payload,type);
    if(response.length!==2||response[1]!==0)throw Error(`本体が処理を受け付けませんでした（${response[1]??'応答不正'}）。`);
  }
  async upload(source, slot, progress=()=>{}) {
    if(this.busy)throw Error('転送が終わるまで待ってください。');
    if(!this.info)throw Error('本体をつないでください。');
    if(!Number.isInteger(slot)||slot<0||slot>19)throw Error('本体の保存番号は0〜19です。');
    const bytes=new TextEncoder().encode(source);
    if(!bytes.length||bytes.length>128*1024)throw Error('転送できるプログラムは128 KiBまでです。');
    this.busy=true;this.onChange();
    try {
      // No ClearSlot: do not erase a slot before the replacement transfer is accepted.
      await this.status(Uint8Array.of(0x1e,1,slot),0x1f);
      const name=new TextEncoder().encode('program.py\0');
      const start=new Uint8Array(1+name.length+1+4);start[0]=0x0c;start.set(name,1);start[1+name.length]=slot;
      new DataView(start.buffer).setUint32(2+name.length,alignedCRC(bytes),true);
      await this.status(start,0x0d);
      const chunkSize=Math.floor(Math.min(this.info.chunk,this.info.message-7)/4)*4;
      if(chunkSize<4)throw Error('本体の転送サイズに対応できません。');
      let crc=0;
      for(let i=0;i<bytes.length;i+=chunkSize) {
        const chunk=bytes.slice(i,i+chunkSize);crc=alignedCRC(chunk,crc);
        const data=new Uint8Array(7+chunk.length),v=new DataView(data.buffer);data[0]=0x10;v.setUint32(1,crc,true);v.setUint16(5,chunk.length,true);data.set(chunk,7);
        await this.status(data,0x11);progress(Math.round((i+chunk.length)*100/bytes.length));
      }
      return {slot,bytes:bytes.length,crc};
    } finally {this.busy=false;this.onChange();}
  }
  async run(slot){if(this.busy)throw Error('転送が終わるまで待ってください。');await this.status(Uint8Array.of(0x1e,0,slot),0x1f);}
  async stop(slot=0){if(this.busy)throw Error('転送が終わるまで待ってください。');await this.status(Uint8Array.of(0x1e,1,slot),0x1f);}
}
