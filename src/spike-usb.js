// Standard SPIKE App 3 hub protocol over USB CDC (Web Serial).
// Transport reference: https://developer.chrome.com/blog/lego-education-spike-web-bluetooth-web-serial/
import {SpikeConnection,FrameReader} from './spike-ble.js?v=transport4';
export const LEGO_USB_VENDOR_ID=1684;
const hex=bytes=>Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join(' ');

export function usbEnvironment(context=globalThis){
  if(context.isSecureContext===false)return {available:false,message:'HTTPSでアプリを開いてください。'};
  if(!context.navigator?.serial)return {available:false,message:'このブラウザではUSB接続を利用できません。ChromeまたはEdgeの通常のタブで開いてください。'};
  const policy=context.document?.permissionsPolicy??context.document?.featurePolicy;
  if(policy?.allowsFeature&&!policy.allowsFeature('serial'))return {available:false,message:'この表示枠ではUSB接続が許可されていません。ChromeまたはEdgeの通常のタブで直接開いてください。'};
  return {available:true,message:'データ通信対応のUSBケーブルでSPIKEをつなぎ、電源を入れてください。公式SPIKEアプリの接続を切ってから「接続する」で本体を選びます。'};
}
export function usbConnectionError(error,stage){
  if(error?.name==='NotFoundError')return 'USBの本体が選択されませんでした。データ通信対応ケーブルと本体の電源を確認して、もう一度選んでください。';
  if(['SecurityError','NotAllowedError'].includes(error?.name))return 'ブラウザがUSB接続を許可していません。ChromeまたはEdgeの通常のタブで開き、サイトと端末のUSB接続の許可を確認してください。';
  if(error?.name==='NetworkError')return 'USBポートを開けませんでした。公式SPIKEアプリや他の接続中のタブを閉じ、USBケーブルをつなぎ直してください。';
  return `USB接続の「${stage}」で失敗しました：${error?.message??error}`;
}

export class SpikeUsbConnection extends SpikeConnection{
  constructor({serial=globalThis.navigator?.serial,handshakeTimeout=2000,...options}={}){
    super(options);this.serial=serial;this.handshakeTimeout=handshakeTimeout;this.transport='usb';this.session=null;this.closePromise=null;this.opening=false;
  }
  get connected(){return !!this.session?.active&&!!this.session?.writer;}
  get closing(){return !!this.closePromise;}
  async connect(){
    if(this.session||this.opening||this.closing)throw Error('USB接続の終了を待ってから、つなぎ直してください。');
    if(!this.serial)throw Error('このブラウザではUSB接続を利用できません。ChromeまたはEdgeの通常のタブで開いてください。');
    this.opening=true;
    let stage='本体を選択';
    let diagnostics;
    const step=name=>{stage=name;this.onLog('USB接続確認：'+name);};
    try{
      // Must run directly from a user gesture; never auto-open remembered ports.
      const port=await this.serial.requestPort({filters:[{usbVendorId:LEGO_USB_VENDOR_ID}]});
      diagnostics={rxBytes:0,txBytes:0,frames:0,rxHead:[],handshaking:true};
      const identity=port.getInfo?.()??{};
      this.onLog(`USB診断 usb2：VID ${identity.usbVendorId??'unknown'} / PID ${identity.usbProductId??'unknown'} / baud 115200`);
      const session={port,active:true,reader:null,writer:null,loop:null,diagnostics};this.session=session;
      step('USBポートを開く');session.openPromise=port.open({baudRate:115200});await session.openPromise;
      if(!session.active)throw Error('接続を切りました。');
      if(!port.readable||!port.writable)throw Error('USBの送受信を開始できませんでした。');
      session.reader=port.readable.getReader();session.writer=port.writable.getWriter();
      this.device={name:'SPIKE PRIME (USB)'};
      this.reader=new FrameReader(frame=>{if(diagnostics.handshaking){diagnostics.frames++;this.onLog(`USB初期応答：type ${frame[0]} / ${frame.length} bytes`);}this.receive(frame);});
      session.onDisconnect=()=>{if(this.session===session)void this.disconnect(Error('USBケーブルが外れたか、本体との接続が切れました。'));};
      port.addEventListener?.('disconnect',session.onDisconnect);
      session.loop=this.readLoop(session);
      step('本体情報を取得');
      // Like the official app, retry this read-only request once. Never retry
      // uploads or execution here, and never reset firmware/enter the REPL.
      for(let attempt=1;attempt<=2;attempt++){
        this.onLog(`USB本体情報の要求：${attempt}/2`);
        try{await this.negotiate({timeout:this.handshakeTimeout,disconnectOnTimeout:false});break;}
        catch(error){if(attempt===2||error.name!=='TimeoutError'||!this.connected)throw error;}
      }
      diagnostics.handshaking=false;
      step('接続完了');this.onChange();return this.info;
    }catch(error){
      if(diagnostics){
        this.onLog(`USB診断：送信 ${diagnostics.txBytes} bytes / 受信 ${diagnostics.rxBytes} bytes / 完了フレーム ${diagnostics.frames}`);
        if(diagnostics.rxHead.length)this.onLog('USB初期受信HEX（先頭64バイトまで）：'+hex(diagnostics.rxHead));
        else this.onLog('USB初期受信は0バイトです。本体情報の応答を確認できませんでした。');
      }
      this.onLog(`USB接続失敗：${stage} / ${error?.name??'Error'} / ${error?.message??error}`);
      await this.disconnect(error);throw Error(usbConnectionError(error,stage));
    }finally{this.opening=false;}
  }
  async readLoop(session){
    let failure=Error('USBケーブルが外れたか、本体との接続が切れました。');
    try{
      while(session.active){
        const {value,done}=await session.reader.read();
        if(done)break;
        if(session.active&&value?.length){
          if(session.diagnostics.handshaking){
            session.diagnostics.rxBytes+=value.length;
            session.diagnostics.rxHead.push(...value.subarray(0,64-session.diagnostics.rxHead.length));
          }
          this.reader.push(value);
        }
      }
    }catch(error){failure=error;}
    finally{
      session.reader.releaseLock();
      if(session.active)void this.disconnect(failure);
    }
  }
  async writePacket(bytes){
    const session=this.session,writer=session?.writer;
    if(!writer)throw Error('本体をつないでください。');
    await writer.write(bytes);
    if(session.diagnostics.handshaking){session.diagnostics.txBytes+=bytes.length;this.onLog('USB初期送信HEX：'+hex(bytes.subarray(0,64)));}
    // Official SPIKE app spaces USB transport packets by 25 ms.
    await new Promise(resolve=>setTimeout(resolve,25));
  }
  disconnect(error=Error('接続を切りました。')){
    const session=this.session;
    if(!session)return this.closePromise??Promise.resolve();
    session.active=false;this.session=null;this.device=null;this.info=null;
    session.port.removeEventListener?.('disconnect',session.onDisconnect);
    if(this.pending){clearTimeout(this.pending.timer);this.pending.reject(error);this.pending=null;}
    this.onLog(error.message);
    const cleanup=async()=>{
      try{await session.openPromise;}catch{}
      try{await session.reader?.cancel();}catch{}
      await session.loop;
      try{await session.writer?.abort();}catch{}
      try{session.writer?.releaseLock();}catch{}
      try{await session.port.close();}catch(error){this.onLog('USBポートの終了：'+error.message);}
    };
    this.closePromise=cleanup().finally(()=>{this.closePromise=null;this.onChange();});
    this.onChange();return this.closePromise;
  }
}
