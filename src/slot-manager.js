// The public RPC protocol has ClearSlot, but no read-only slot inventory.
// Do not infer occupancy by running programs or clearing slots.
export function installSlotManager({dialog,trigger,closeButton,select,deleteButton,status,hubLabel,getConnection,isBusy,runAction,onDeleted,confirmDelete=message=>confirm(message)}){
  let target=null,locked=false;
  const session=c=>c.session??c.device;
  function sync(){
    const c=getConnection(),blocked=!!(locked||isBusy()||!c.connected);
    trigger.disabled=blocked;deleteButton.disabled=blocked||!/^(?:[0-9]|1[0-9])$/.test(select.value)||!target||target.connection!==c||target.session!==session(c);
    select.disabled=locked||isBusy();closeButton.disabled=locked;
    if(dialog.open&&(!c.connected||target?.connection!==c||target?.session!==session(c))){
      status.textContent='接続先が変わりました。閉じて開き直してください。';deleteButton.disabled=true;
    }
  }
  trigger.onclick=()=>{
    const c=getConnection();if(isBusy()||!c.connected)return;
    target={connection:c,session:session(c),name:c.device?.name||'SPIKE PRIME'};
    select.replaceChildren();
    const OptionClass=select.ownerDocument.defaultView.Option;
    select.add(new OptionClass('保存番号を選んでください',''));
    for(let i=0;i<20;i++)select.add(new OptionClass(`番号 ${i}（保存の有無は未取得）`,String(i)));
    hubLabel.textContent=target.name;status.textContent='削除する保存番号を選んでください。';
    dialog.showModal();sync();select.focus();
  };
  select.onchange=()=>{status.textContent='削除する保存番号を確認してください。';sync();};
  closeButton.onclick=()=>{if(!locked){dialog.close();trigger.focus();}};
  dialog.addEventListener('cancel',event=>{if(locked)event.preventDefault();});
  deleteButton.onclick=async()=>{
    const c=getConnection(),raw=select.value,slot=Number(raw);
    if(locked||isBusy()||!c.connected||!target||target.connection!==c||target.session!==session(c))return;
    if(!/^(?:[0-9]|1[0-9])$/.test(raw)){status.textContent='本体の保存番号は0〜19です。';return;}
    if(!confirmDelete(`「${target.name}」の保存番号 ${slot} を削除します。\n本体のプログラムは元に戻せません。PCに保存した作品は残ります。\n番号を確認しましたか？`))return;
    if(getConnection()!==c||!c.connected||target.session!==session(c)||isBusy())return;
    locked=true;sync();
    try{await runAction(async()=>{
      try{await c.clearSlot(slot);onDeleted(slot);status.textContent=`番号 ${slot} の削除応答を確認しました。`;}
      catch(error){status.textContent='削除完了は確認できません。'+error.message;throw error;}
    });}finally{locked=false;sync();}
  };
  return {sync};
}
