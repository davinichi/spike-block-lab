// Read-only presentation state. No program upload, slot overwrite or sensor mode commands.
export const MONITOR_PORTS=['A','B','C','D','E','F'];
export class SensorMonitor {
 constructor(){this.disconnect();}
 disconnect(){this.mode='disconnected';this.active=false;this.receivedAt=null;this.waitingAt=null;this.error='';this.readings=new Map();}
 connect(){this.disconnect();this.mode='idle';}
 start(now=Date.now()){this.active=true;this.mode='waiting';this.error='';this.waitingAt=now;}
 accept(readings,now=Date.now()){if(!this.active)return;this.readings=new Map(readings.map(r=>[r.port,{...r}]));this.receivedAt=now;this.mode='live';this.error='';}
 fail(message){if(!this.active)return;this.mode='error';this.error=message;}
 stop(){this.active=false;this.mode='paused';this.error='';}
 view(now=Date.now()){
  const stale=this.active&&((this.mode==='live'&&now-this.receivedAt>3000)||(this.mode==='waiting'&&now-this.waitingAt>3000));
  const fresh=this.mode==='live'&&!stale;
  const label=this.mode==='disconnected'?'未接続':this.mode==='paused'?'更新停止中':this.mode==='error'?'読取りエラー':stale?'更新が届いていません':this.mode==='waiting'?'読取り待ち':this.mode==='idle'?'未取得':'更新中';
  return {active:this.active,fresh,status:label+(this.error?'：'+this.error:''),updated:this.receivedAt===null?'':`最終受信 ${Math.max(0,Math.floor((now-this.receivedAt)/1000))}秒前`,rows:MONITOR_PORTS.map(port=>{
   const r=this.readings.get(port),known=this.receivedAt!==null;
   return {port,device:r?.device??(known?'接続機器の通知なし':'未取得'),text:r?.text??'—',state:fresh?(r?'現在値':'通知なし'):(known?'前回の値':label),fresh,reflection:r?.reflection??null};
  })};
 }
}
