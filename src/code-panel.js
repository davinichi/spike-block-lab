// Read-only live Python beside Blockly. No project or connection state is stored here.
export function installCodePanel({root,panel,splitter,trigger,closeButton,code,status,jumpButton,programTab,runtimeTab,filename,returnFocus=trigger,beforeOpen=()=>{},onResize=()=>{},requestFrame=requestAnimationFrame}) {
  let share=.6,dragging=null,source='',selected='program',error='';
  const files={program:'',runtime:''},scrolls={program:[0,0],runtime:[0,0]};
  const view=root.ownerDocument.defaultView;
  function bounds(){
    const width=Math.max(1,root.getBoundingClientRect().width-10);
    return {width,min:width>=560?320/width:.55,max:width>=560?1-240/width:.6};
  }
  function resize(){requestFrame(onResize);}
  function setShare(value){
    const b=bounds();share=Math.max(b.min,Math.min(b.max,value));
    root.style.setProperty('--block-width',`${share*b.width}px`);
    splitter.setAttribute('aria-valuemin',String(Math.round(b.min*100)));
    splitter.setAttribute('aria-valuemax',String(Math.round(b.max*100)));
    splitter.setAttribute('aria-valuenow',String(Math.round(share*100)));
    splitter.setAttribute('aria-valuetext',`ブロック ${Math.round(share*100)}％、Python ${100-Math.round(share*100)}％`);
    resize();
  }
  function endDrag(){
    const id=dragging;dragging=null;root.classList.remove('resizing-code');
    if(id!==null&&splitter.hasPointerCapture?.(id))splitter.releasePointerCapture(id);
  }
  function setOpen(open,focus=true){
    if(open)beforeOpen();else endDrag();
    panel.hidden=!open;splitter.hidden=!open;root.classList.toggle('python-open',open);
    trigger.setAttribute('aria-expanded',String(open));
    if(open){selectFile('program',false);setShare(share);}else resize();
    if(focus)(open?closeButton:returnFocus).focus();
  }
  trigger.onclick=()=>setOpen(panel.hidden);
  closeButton.onclick=()=>setOpen(false);
  splitter.addEventListener('pointerdown',event=>{
    if(event.button!==0||panel.hidden)return;
    event.preventDefault();dragging=event.pointerId;
    splitter.setPointerCapture(event.pointerId);splitter.focus();root.classList.add('resizing-code');
  });
  splitter.addEventListener('pointermove',event=>{
    if(dragging!==event.pointerId)return;
    setShare((event.clientX-root.getBoundingClientRect().left-5)/bounds().width);
  });
  for(const type of ['pointerup','pointercancel','lostpointercapture'])splitter.addEventListener(type,endDrag);
  splitter.addEventListener('keydown',event=>{
    const b=bounds(),step=event.shiftKey ? .1 : .02;
    const next={ArrowLeft:share-step,ArrowRight:share+step,Home:b.min,End:b.max}[event.key];
    if(next===undefined)return;event.preventDefault();setShare(next);
  });
  view.addEventListener('resize',()=>{if(!panel.hidden)setShare(share);});
  jumpButton.onclick=()=>{
    const index=source.search(/^async def _lab_task_0\(/m);
    if(index<0)return;
    const line=source.slice(0,index).split('\n').length-1;
    code.scrollTop=line*(parseFloat(view.getComputedStyle(code).lineHeight)||22);
    code.focus();
  };
  function render(){
    source=error?'':files[selected];
    const next=error?`Pythonを生成できません。\n${error}\nブロックを修正すると自動で更新します。`:source;
    if(code.textContent!==next){const {scrollTop,scrollLeft}=code;code.textContent=next;code.scrollTop=scrollTop;code.scrollLeft=scrollLeft;}
    status.textContent=error?'ブロックを確認してください':selected==='program'?'作ったプログラム・変更時に自動更新（表示専用）':'SBLの内部処理・通常は確認不要（表示専用）';
    status.classList.toggle('error',!!error);
    jumpButton.hidden=selected==='runtime';jumpButton.disabled=!!error||!/^async def _lab_task_0\(/m.test(source);
  }
  function selectFile(kind,focus=true){
    scrolls[selected]=[code.scrollTop,code.scrollLeft];selected=kind;
    for(const [name,tab] of [['program',programTab],['runtime',runtimeTab]]){
      tab.setAttribute('aria-selected',String(name===kind));tab.tabIndex=name===kind?0:-1;
    }
    code.setAttribute('aria-labelledby',kind==='program'?'codeProgramTab':'codeRuntimeTab');
    code.setAttribute('aria-label',kind==='program'?'作ったプログラム program.py（表示専用）':'内部処理 sbl_runtime.py（表示専用）');
    filename.textContent=kind==='program'?'program.py':'sbl_runtime.py';render();
    [code.scrollTop,code.scrollLeft]=scrolls[kind];
    if(focus)(kind==='program'?programTab:runtimeTab).focus();
  }
  for(const [kind,tab] of [['program',programTab],['runtime',runtimeTab]]){
    tab.onclick=()=>selectFile(kind);
    tab.addEventListener('keydown',event=>{
      if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;
      event.preventDefault();selectFile(event.key==='Home'?'program':event.key==='End'?'runtime':selected==='program'?'runtime':'program');
    });
  }
  function showSource(text,message='',runtime=''){
    error=message;files.program=message?'':text;files.runtime=message?'':runtime;render();
  }
  return {setOpen,showSource};
}
