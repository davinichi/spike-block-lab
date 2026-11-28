import {installNumericTextNormalization} from './numeric-text.js?v=1.0.1';
import {installNotices} from './notices.js?v=hint-label1';
import {installSlotManager} from './slot-manager.js?v=1.0.1';
import {SpikeUsbConnection,usbEnvironment} from './spike-usb.js?v=transport4';
import {installLanguageSwitch} from './language-switch.js';
import {zipPythonFiles} from './python-files.js?v=1.0.1';
import {installCodePanel} from './code-panel.js?v=1.0.1';
import {DEBUG_EDITION} from './edition.js';
import {SensorMonitor,MONITOR_PORTS} from './sensor-monitor.js?v=1.0.1';
import {numericInputDefaults,ensureNumericInputShadows} from './numeric-inputs.js?v=1.0.1';
import {isMyBlockDefinition,outputNames} from './returns.js?v=1.0.1';
import {recordingReader,RecordingReceiver} from './recording.js';
import {configureMyBlockBlocks,installMyBlockFlyout,saveMyBlock} from './myblocks.js?v=1.0.1';
import {VERSION,validateProject} from './model.js';
import {setupClassroom,classroomToolbox,ensureComparisonInputs} from './classroom-blocks.js?v=1.0.1-fixed-loops1';
import {installCommonWorkspace,syncArgumentColours} from './common-blocks.js?v=1.0.1-fixed-loops1';
import {setBlockLanguage} from './blocks.js';
import {generateStandard} from './standard.js?v=1.0.1';
import {classroomSample,SAMPLE_NAMES} from './classroom-samples.js?v=1.0.1-school2';
import {SpikeConnection,bluetoothEnvironment} from './spike-ble.js?v=transport4';
const $=id=>document.getElementById(id), STORAGE='spike-block-lab-v1';
if(!DEBUG_EDITION)for(const value of ['pidRecording','syncGentle','syncNone','syncTrap','syncS','distanceRamp'])document.querySelector(`#sample option[value="${value}"]`)?.remove();
setupClassroom(Blockly);configureMyBlockBlocks(Blockly,openMyBlockDialog);setBlockLanguage(Blockly,'standard');
const theme=Blockly.Theme.defineTheme('spikelab',{base:Blockly.Themes.Classic,fontStyle:{family:'"Yu Gothic UI", Meiryo, sans-serif',size:12},componentStyles:{workspaceBackgroundColour:'#fbfcfd',toolboxBackgroundColour:'#fff8d6',flyoutBackgroundColour:'#eef3f5',flyoutOpacity:1,scrollbarColour:'#b9c9ce',insertionMarkerColour:'#126c67'}});
const workspace=Blockly.inject('blocklyDiv',{toolbox:classroomToolbox(),theme,renderer:'zelos',media:'vendor/media/',trashcan:true,grid:{spacing:24,length:2,colour:'#e5ebee',snap:false},zoom:{controls:true,wheel:true,startScale:.85,minScale:.35,maxScale:1.5},move:{scrollbars:true,drag:true,wheel:true},sounds:false});
installCommonWorkspace(workspace,Blockly);
const numericDefaults=numericInputDefaults(classroomToolbox());
installNumericTextNormalization(Blockly,{document,notice:$('numberInputNotice')});
workspace.registerButtonCallback('LAB_CREATE_VARIABLE',()=>{$('variableName').value='';$('variableError').textContent='';$('variableDialog').showModal();$('variableName').focus();});
const duplicate=Blockly.ContextMenuRegistry.registry.getItem('blockDuplicate');
Blockly.Msg.DUPLICATE_BLOCK='複製';
if(duplicate)duplicate.callback=({block})=>{const data=block.toCopyData(true);if(!data)return;data.typeCounts=Object.create(null);for(const child of block.getDescendants(false))data.typeCounts[child.type]=(data.typeCounts[child.type]||0)+1;Blockly.clipboard.paste(data,block.workspace);};
workspace.getFlyout().setAutoClose(false);
workspace.addChangeListener(e=>{if(e.type===Blockly.Events.CLICK&&e.targetType==='workspace')workspace.getToolbox().clearSelection();});
$('variableCancel').onclick=()=>$('variableDialog').close();
$('variableForm').onsubmit=e=>{e.preventDefault();const name=$('variableName').value.trim();if(!name||name.length>40){$('variableError').textContent='名前を1〜40文字にしてください。';return;}if(workspace.getVariableMap().getAllVariables().some(m=>Blockly.Names.equals(m.getName(),name))){$('variableError').textContent='同じ名前が使われています。';return;}workspace.getVariableMap().createVariable(name);workspace.refreshToolboxSelection();$('variableDialog').close();saveLocal();};
installMyBlockFlyout(workspace,openMyBlockDialog);
let loading=false,dirty=false,latest=null,transferred=null,acting=false,checking=false,connecting=false,autosaveFailed=false;
const codePreview=installCodePanel({root:$('programLayout'),panel:$('codePanel'),splitter:$('codeSplitter'),trigger:$('showCode'),closeButton:$('closeCodePanel'),code:$('code'),status:$('codeStatus'),jumpButton:$('jumpToProgram'),programTab:$('codeProgramTab'),runtimeTab:$('codeRuntimeTab'),filename:$('codeFilename'),returnFocus:$('fileMenu').querySelector('summary'),beforeOpen:()=>openPanel(false,false),onResize:()=>Blockly.svgResize(workspace)});
let recordReceiver=null,slotManager=null;
const logs=[];
function log(message){logs.push(`${new Date().toISOString()} ${message}`);if(logs.length>300)logs.shift();$('log').textContent=logs.join('\n');$('lastLog').textContent=message.slice(0,80);}
const notices=installNotices({workspace,programPanel:$('programNotice'),programText:$('buildStatus'),hint:$('editorHint'),programAction:$('programActionStatus'),saveNotice:$('saveNotice'),targets:{connect:$('connectStatus'),transfer:$('actionStatus'),sensor:$('sensorActionStatus'),recording:$('recordActionStatus')},onResize:()=>requestAnimationFrame(()=>Blockly.svgResize(workspace)),showConnection:()=>openPanel(true,false)});
function feedback(text,error=false,where='program'){notices.notify(text,error,where);}
function download(content,name,type='application/json') {const url=URL.createObjectURL(new Blob([content],{type})),a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);}
const filename=()=>($('projectName').value.trim()||'作品').replace(/[<>:"/\\|?*\x00-\x1f]/g,'_').slice(0,80);
const sensorMonitor=new SensorMonitor();
const connectionCallbacks={onLog:log,onConsole:text=>recordReceiver?.push(text),onChange:()=>{if(!connection.connected){transferred=null;sensorMonitor.disconnect();renderSensors();}update();},onDevices:readings=>{sensorMonitor.accept(readings);renderSensors();},onDeviceError:message=>{sensorMonitor.fail(message);renderSensors();}};
let connection=$('connectionMethod').value==='usb'?new SpikeUsbConnection(connectionCallbacks):new SpikeConnection(connectionCallbacks);
for(let i=0;i<20;i++)$('slot').add(new Option(String(i),String(i)));
for(const p of MONITOR_PORTS){
 const row=document.createElement('div'),title=document.createElement('dt'),port=document.createElement('span'),name=document.createElement('small'),value=document.createElement('dd'),text=document.createElement('span'),state=document.createElement('small');
 port.textContent='ポート '+p;name.id='device'+p;text.id='value'+p;state.id='sensorState'+p;
 title.append(port,name);value.append(text,state);row.append(title,value);$('sensorValues').append(row);
}
function renderSensors(){
 const view=sensorMonitor.view();for(const row of view.rows){$('device'+row.port).textContent=row.device;$('value'+row.port).textContent=row.text;$('sensorState'+row.port).textContent=row.state;}
 $('sensorStatus').textContent=view.status;$('sensorUpdated').textContent=view.updated;$('sensorValues').classList.toggle('sensor-values-stale',!view.fresh);
}
async function startSensorReading(){
 sensorMonitor.start();renderSensors();
 try{await connection.observe(500);}catch(error){sensorMonitor.fail(error.message);renderSensors();throw error;}
}
renderSensors();setInterval(renderSensors,1000);
function project(){return {format:'spike-block-lab',version:1,appVersion:VERSION,name:$('projectName').value,language:$('language').value,workspace:Blockly.serialization.workspaces.save(workspace)};}
function saveLocal(){if(loading)return;try{localStorage.setItem(STORAGE,JSON.stringify(project()));$('saveState').textContent='✓ この端末に自動保存済み';if(autosaveFailed){autosaveFailed=false;feedback('',false,'save');}}catch{autosaveFailed=true;$('saveState').textContent='自動保存できません。「保存」でファイルに残してください。';feedback('自動保存できません。「保存」でファイルに残してください。',true,'save');}}
function restore(data){
  validateProject(data);const backup=project();loading=true;
  try{setBlockLanguage(Blockly,data.language);workspace.updateToolbox(classroomToolbox(data.language));Blockly.serialization.workspaces.load(data.workspace,workspace);$('projectName').value=data.name;$('language').value=data.language;workspace.clearUndo();}
  catch(error){setBlockLanguage(Blockly,backup.language);workspace.updateToolbox(classroomToolbox(backup.language));Blockly.serialization.workspaces.load(backup.workspace,workspace);throw error;}finally{loading=false;}
  transferred=null;dirty=false;check();saveLocal();
}
function check(){
  if(checking)return;checking=true;
  try{
    for(const b of workspace.getAllBlocks(false))b.setWarningText(null);
    ensureNumericInputShadows(workspace,Blockly,numericDefaults);
    ensureComparisonInputs(workspace);
    syncArgumentColours(workspace);
    for(const block of workspace.getAllBlocks(false))if(['procedures_callnoreturn','procedures_callreturn','lab_call_outputs'].includes(block.type)&&!block.getInputsInline())block.setInputsInline(true);
    latest=generateStandard(workspace,Blockly.Python);codePreview.showSource(latest.programSource,'',latest.runtimeSource);notices.program();
  }catch(error){latest=null;notices.program(error.message,error.blockId);codePreview.showSource('',error.message);if(error.blockId)workspace.getBlockById(error.blockId)?.setWarningText(error.message);}
  finally{checking=false;}update();
}
function update(){
  slotManager?.sync();
  const busy=acting||connection.busy||connection.closing, connected=connection.connected,environment=$('connectionMethod').value==='usb'?usbEnvironment():bluetoothEnvironment();
  $('connectionMethod').disabled=!!(busy||connected||connecting);
  $('connect').hidden=connected;$('disconnect').hidden=!connected;$('connect').disabled=busy||!environment.available;$('disconnect').disabled=busy;
  for(const id of ['upload','transferRun'])$(id).disabled=busy||!connected||!latest;
  $('run').disabled=busy||!connected||!latest||!transferred||transferred.source!==latest.source||transferred.slot!==Number($('slot').value);
  for(const id of ['stop','readSensors','retrieveRecording'])$(id).disabled=busy||!connected;
  $('stopSensors').disabled=busy||!connected||!sensorMonitor.active;
  $('slot').disabled=busy;for(const id of ['python','pythonCombined'])$(id).disabled=busy||!latest;
  $('transferNotice').textContent=`番号 ${$('slot').value} のプログラムを上書きします。「転送して実行」は転送後すぐ動き始めます。`;
  $('connection').classList.toggle('connected',connected);$('connection').classList.toggle('connecting',connecting);
  $('connectionLabel').textContent=connecting?'SPIKE 接続確認中':connected?'SPIKE 接続中':'SPIKE 未接続';
  const connectionDescription=connecting?'SPIKEへの接続を確認しています。':connected?`${connection.device.name||'SPIKE PRIME'}に接続中です。`:'SPIKEは未接続です。';
  $('connection').title=connectionDescription+' 接続・転送を開く';$('connection').setAttribute('aria-label',connectionDescription+' 接続・転送を開く');
  $('connectionState').textContent=connected?`${connection.device.name||'SPIKE PRIME'} / 本体 ${connection.info?.firmware??'確認中'}`:environment.message;
}
async function action(fn,where='transfer'){if(acting)return;acting=true;feedback('',false,where);update();try{await fn();}catch(error){feedback(error.message,true,where);log(error.message);}finally{acting=false;update();}}
let connectionLayoutFrame=0;
function openPanel(open,focus=true){
  if(open)codePreview.setOpen(false,false);
  $('connectionPanel').hidden=!open;
  $('toggleConnectionPanel').setAttribute('aria-expanded',String(open));$('connection').setAttribute('aria-expanded',String(open));
  cancelAnimationFrame(connectionLayoutFrame);
  connectionLayoutFrame=requestAnimationFrame(()=>{connectionLayoutFrame=0;Blockly.svgResize(workspace);});
  if(focus)$(open?'closeConnectionPanel':'toggleConnectionPanel').focus();
}
document.addEventListener('keydown',event=>{if(event.key!=='Escape'||document.querySelector('dialog[open]'))return;if($('fileMenu').open){$('fileMenu').open=false;$('fileMenu').querySelector('summary').focus();event.preventDefault();return;}if(!$('codePanel').hidden){codePreview.setOpen(false);event.preventDefault();return;}if(!$('connectionPanel').hidden)openPanel(false);});
$('fileMenu').querySelector('.menu-items').addEventListener('click',event=>{if(event.target.closest('button,a'))$('fileMenu').open=false;});
document.addEventListener('pointerdown',event=>{if($('fileMenu').open&&!$('fileMenu').contains(event.target))$('fileMenu').open=false;});
$('connection').onclick=()=>{ $('fileMenu').open=false;openPanel($('connectionPanel').hidden);};
$('toggleConnectionPanel').onclick=()=>openPanel($('connectionPanel').hidden);$('closeConnectionPanel').onclick=()=>openPanel(false);
$('toggleLog').onclick=()=>{const open=$('logContent').hidden;$('logContent').hidden=!open;$('toggleLog').setAttribute('aria-expanded',String(open));Blockly.svgResize(workspace);};
workspace.addChangeListener(event=>{if(loading||checking||event.isUiEvent)return;dirty=true;transferred=null;check();saveLocal();});
$('projectName').oninput=()=>{dirty=true;saveLocal();};
$('saveProject').onclick=()=>{try{download(JSON.stringify(project(),null,2),filename()+'.spikelab');dirty=false;feedback('作品ファイルのダウンロードを開始しました。',false,'save');}catch(error){feedback(error.message,true,'save');log(error.message);}};
$('openProject').onclick=()=>{if(!dirty||confirm('現在の作品を置き換えます。残す場合は先に保存してください。'))$('projectFile').click();};
$('projectFile').onchange=()=>action(async()=>{const file=$('projectFile').files[0];if(!file)return;try{if(file.size>1024*1024)throw Error('1 MiBまでの作品を選んでください。');restore(JSON.parse(await file.text()));}finally{$('projectFile').value='';}},'program');
$('newProject').onclick=()=>{if(dirty&&!confirm('新しくつくります。今の作品を残す場合は先に保存してください。'))return;restore({format:'spike-block-lab',version:1,name:'MyProgram',language:$('language').value,workspace:{blocks:{languageVersion:0,blocks:[{type:'spike_start',x:60,y:40}]}}});dirty=true;};
$('sample').onchange=()=>{const name=$('sample').value;$('sample').value='';if(!name)return;if(dirty&&!confirm('サンプルに置き換えます。残したい作品は先に保存してください。'))return;restore({format:'spike-block-lab',version:1,name:SAMPLE_NAMES[name],language:$('language').value,workspace:classroomSample(name)});if(name==='primarySchool01'||name==='primarySchool02'){const start=workspace.getTopBlocks(false).find(block=>block.type==='spike_start');if(start)requestAnimationFrame(()=>{workspace.setScale(.85);workspace.centerOnBlock(start.id);});}dirty=true;};
$('language').onchange=()=>{restore(project());dirty=true;};
$('undo').onclick=()=>workspace.undo(false);$('redo').onclick=()=>workspace.undo(true);$('fit').onclick=()=>workspace.zoomToFit();$('slot').onchange=update;
$('connect').onclick=()=>action(async()=>{connecting=true;update();try{const info=await connection.connect();log(`接続: ${connection.device.name}, Hub OS ${info.firmware}`);sensorMonitor.connect();renderSensors();try{await startSensorReading();feedback('接続しました。接続機器と値を約0.5秒ごとに表示します。',false,'connect');}catch(error){feedback('接続しましたが、値の読取りを開始できませんでした。'+error.message,true,'connect');}}finally{connecting=false;update();}},'connect');
$('connectionMethod').onchange=()=>{if(connection.connected||acting||connection.closing)return;connection=$('connectionMethod').value==='usb'?new SpikeUsbConnection(connectionCallbacks):new SpikeConnection(connectionCallbacks);transferred=null;update();};
$('disconnect').onclick=()=>action(async()=>{await connection.disconnect();feedback('接続を切りました。本体で保存番号を選んで実行できます。',false,'connect');},'connect');
async function transfer(run){
  if(!latest)return;const slot=Number($('slot').value),source=latest.source;
  transferred=null;$('progress').hidden=false;$('progress').value=0;$('transferStatus').textContent='転送しています…';
  try{const result=await connection.upload(source,slot,n=>$('progress').value=n);transferred={slot,source};$('transferStatus').textContent=`番号 ${slot} への転送応答を確認しました。`;log(`転送完了: slot ${slot}, ${result.bytes} bytes, CRC ${result.crc.toString(16)}`);if(run){await connection.run(slot);$('transferStatus').textContent+=' 実行の指示を送りました。';}}
  catch(error){$('transferStatus').textContent=transferred?'保存済みです。実行の指示に失敗しました。':'転送は完了していません。近くのエラーと通信ログを確認してください。';throw error;}finally{$('progress').hidden=true;}
}
$('upload').onclick=()=>action(()=>transfer(false));$('transferRun').onclick=()=>action(()=>transfer(true));
$('run').onclick=()=>action(async()=>{if(transferred&&latest?.source===transferred.source)await connection.run(transferred.slot);});
$('stop').onclick=()=>action(async()=>{await connection.stop(Number($('slot').value));feedback('停止の指示を送りました。',false,'transfer');});
$('readSensors').onclick=()=>action(startSensorReading,'sensor');
$('stopSensors').onclick=()=>action(async()=>{await connection.observe(0);sensorMonitor.stop();renderSensors();},'sensor');
$('python').onclick=()=>{if(latest)download(zipPythonFiles(latest),filename()+'-python.zip','application/zip');};
$('pythonCombined').onclick=()=>{if(latest)download(latest.source,filename()+'.py','text/x-python');};
$('help').onclick=()=>$('helpDialog').showModal();
slotManager=installSlotManager({dialog:$('slotManagerDialog'),trigger:$('manageSlots'),closeButton:$('closeSlotManager'),select:$('deleteSlotNumber'),deleteButton:$('deleteSlotProgram'),status:$('slotDeleteStatus'),hubLabel:$('slotManagerHub'),getConnection:()=>connection,isBusy:()=>acting||connecting||connection.busy||connection.closing,runAction:action,onDeleted:slot=>{if(transferred?.slot===slot){transferred=null;$('transferStatus').textContent=`番号 ${slot} は削除済みです。実行するには再転送してください。`;}feedback(`本体の番号 ${slot} の削除応答を確認しました。`,false,'transfer');update();}});

$('retrieveRecording').onclick=()=>action(async()=>{
  const name=$('recordName').value.trim(),slot=Number($('recordSlot').value);
  const token=Array.from(crypto.getRandomValues(new Uint8Array(12)),x=>x.toString(16).padStart(2,'0')).join('');
  const source=recordingReader(name,token);
  if(!confirm(`記録「${name}」を取り出します。実行中のプログラムを停止し、番号 ${slot} を記録読み出し用に上書きします。この番号の作品は先に保存してください。記録ファイルは消しません。`))return;
  const receiver=new RecordingReceiver(token,size=>{$('recordStatus').textContent=`取り出しています… ${size} バイト`;});recordReceiver=receiver;
  try{
    log(`記録読出し：記録名「${name}」 / 保存先 /flash/sbl_${name}.csv / 読出し用番号 ${slot}`);
    transferred=null;await connection.upload(source,slot,()=>{});await connection.run(slot);
    const deadline=Date.now()+180000;
    while(!receiver.finished){if(!connection.connected)throw Error('接続が切れました。再接続して取り出してください。');if(Date.now()>deadline)throw Error('記録の応答がありません。記録名と本体のファイル対応を確認してください。');await new Promise(resolve=>setTimeout(resolve,100));}
    if(receiver.error)throw receiver.error;
    download(receiver.bytes,name+'.csv','text/csv;charset=utf-8');$('recordStatus').textContent=`${name}.csv（${receiver.size} バイト）を照合して保存しました。`;
  }catch(error){$('recordStatus').textContent=error.message;throw error;}finally{recordReceiver=null;}
},'recording');
$('saveLog').onclick=()=>download(JSON.stringify({appVersion:VERSION,userAgent:navigator.userAgent,hub:connection.info,logs},null,2),'spike-test-log.json');
$('clearLog').onclick=()=>{logs.length=0;$('log').textContent='';$('lastLog').textContent='ログを消去しました';};
let editingMyBlockId=null;
function myBlockArgumentRow(name='',id=''){
  const row=document.createElement('div');row.className='myblock-argument';row.dataset.parameterId=id;
  const input=document.createElement('input');input.value=name;input.maxLength=40;input.placeholder='例：距離';input.setAttribute('aria-label','引数の名前');
  const remove=document.createElement('button');remove.type='button';remove.textContent='削除';remove.onclick=()=>row.remove();
  row.append(input,remove);$('myBlockArguments').append(row);
}
function myBlockReturnRow(name=''){
 const row=document.createElement('div');row.className='myblock-argument';const input=document.createElement('input');input.value=name;input.maxLength=40;input.placeholder='例：距離';input.setAttribute('aria-label','戻り値の名前');const remove=document.createElement('button');remove.type='button';remove.textContent='削除';remove.onclick=()=>row.remove();row.append(input,remove);$('myBlockReturns').append(row);
}
function showMyBlockReturns(){$('myBlockReturnSettings').hidden=$('myBlockReturn').value!=='number';if($('myBlockReturn').value==='number'&&!$('myBlockReturns').children.length)myBlockReturnRow('値');}
$('myBlockReturn').onchange=showMyBlockReturns;
$('myBlockAddReturn').onclick=()=>{if($('myBlockReturns').children.length>=8){$('myBlockError').textContent='戻り値は8個までです。';return;}myBlockReturnRow();};
function openMyBlockDialog(id=null){
  editingMyBlockId=id;const def=id?workspace.getBlockById(id):null;
  $('myBlockReturn').value=def?.type==='procedures_defreturn'?'number':'none';$('myBlockReturns').replaceChildren();for(const name of outputNames(def))myBlockReturnRow(name);showMyBlockReturns();
  $('myBlockTitle').textContent=def?'マイブロックを編集':'マイブロックを作る';
  $('myBlockName').value=def?.getFieldValue('NAME')??'';$('myBlockArguments').replaceChildren();$('myBlockError').textContent='';
  for(const model of def?.getVarModels()??[])myBlockArgumentRow(model.getName(),model.getId());
  $('myBlockSubmit').textContent=def?'変更を保存':'作る';$('myBlockDialog').showModal();$('myBlockName').focus();
}
$('createMyBlock').onclick=()=>openMyBlockDialog();
$('myBlockAddArgument').onclick=()=>{if($('myBlockArguments').children.length>=8){$('myBlockError').textContent='引数は8個までです。';return;}myBlockArgumentRow();$('myBlockArguments').lastElementChild.querySelector('input').focus();};
$('myBlockCancel').onclick=()=>$('myBlockDialog').close();
$('myBlockForm').onsubmit=event=>{
  event.preventDefault();
  try{
    const rows=[...$('myBlockArguments').children].map(row=>({id:row.dataset.parameterId,name:row.querySelector('input').value}));
    const def=saveMyBlock(Blockly,workspace,$('myBlockName').value,rows,editingMyBlockId,$('myBlockReturn').value==='number',[...$('myBlockReturns').children].map(row=>row.querySelector('input').value.trim()));
    syncArgumentColours(workspace);
    for(const block of workspace.getAllBlocks(false))if(['procedures_callnoreturn','procedures_callreturn','lab_call_outputs'].includes(block.type)&&!block.getInputsInline())block.setInputsInline(true);workspace.refreshToolboxSelection();dirty=true;check();saveLocal();$('myBlockDialog').close();workspace.centerOnBlock(def.id);
    feedback(outputNames(def).length?'定義の各「返す値」に計算式を入れます。丸い呼び出しは数値欄へ、変数へ受け取る呼び出しは命令としてつなぎます。':'定義の中に命令をつなぎ、マイブロックの同じ名前のブロックをスタートにつなげて使います。');
  }catch(error){$('myBlockError').textContent=error.message;}
};
$('exportMyBlocks').onclick=()=>{const state=Blockly.serialization.workspaces.save(workspace),defs=state.blocks.blocks.filter(isMyBlockDefinition);if(!defs.length){feedback('マイブロックを作ってから書き出してください。',true);return;}download(JSON.stringify({format:'spike-block-library',version:1,workspace:{...state,blocks:{...state.blocks,blocks:defs}}},null,2),'my-blocks.spikeblocks');};
$('importMyBlocks').onclick=()=>$('libraryFile').click();
$('libraryFile').onchange=()=>action(async()=>{
  const file=$('libraryFile').files[0];if(!file)return;
  try{
    if(file.size>1024*1024)throw Error('1 MiBまでのファイルを選んでください。');
    const data=JSON.parse(await file.text());if(data.format!=='spike-block-library'||data.version!==1)throw Error('SPIKEのマイブロック集を選んでください。');
    validateProject({format:'spike-block-lab',version:1,name:'library',language:'standard',workspace:data.workspace});
    const backup=project(),defs=data.workspace.blocks.blocks,existing=backup.workspace.blocks.blocks;
    if(!defs.length||defs.some(b=>!isMyBlockDefinition(b)))throw Error('マイブロックの定義を確認してください。');
    const names=new Set(existing.filter(isMyBlockDefinition).map(b=>b.fields.NAME.toLowerCase()));
    for(const b of defs){const key=b.fields.NAME.toLowerCase();if(names.has(key))throw Error('同じ名前のマイブロックがあります。');names.add(key);}
    const map=new Map(),variables=backup.workspace.variables??[];
    for(const variable of data.workspace.variables??[]){let target=variables.find(v=>v.name===variable.name);if(!target){target={...variable,id:crypto.randomUUID()};variables.push(target);}map.set(variable.id,target.id);}
    function remap(value){if(!value||typeof value!=='object')return;if(value.type)delete value.id;if(value.fields?.VAR?.id)value.fields.VAR.id=map.get(value.fields.VAR.id)??value.fields.VAR.id;if(value.extraState?.parameterId)value.extraState.parameterId=map.get(value.extraState.parameterId)??value.extraState.parameterId;if(value.fields)for(const [key,field] of Object.entries(value.fields))if(/^OUT\d+$/.test(key)&&field?.id)field.id=map.get(field.id)??field.id;if(value.extraState?.params)for(const p of value.extraState.params)p.id=map.get(p.id)??p.id;for(const child of Object.values(value))remap(child);}
    remap(defs);const bottom=Math.max(0,...existing.map(b=>b.y??0))+350;defs.forEach((b,i)=>{b.x=50+i*300;b.y=bottom;});
    backup.workspace.variables=variables;backup.workspace.blocks.blocks.push(...defs);restore(backup);dirty=true;feedback('マイブロックを読み込みました。');
  }finally{$('libraryFile').value='';}
},'program');
new ResizeObserver(()=>Blockly.svgResize(workspace)).observe($('blocklyDiv'));
window.addEventListener('resize',()=>Blockly.svgResize(workspace));window.addEventListener('beforeunload',event=>{if(dirty){event.preventDefault();event.returnValue='';}});
try{const saved=localStorage.getItem(STORAGE);if(saved)restore(JSON.parse(saved));else restore({format:'spike-block-lab',version:1,name:'DisplayTest',language:'standard',workspace:classroomSample('lights')});}
catch(error){log('復元できませんでした: '+error.message);loading=true;Blockly.serialization.workspaces.load(classroomSample('lights'),workspace);loading=false;check();$('saveState').textContent='前の自動保存を復元できませんでした。';}

installLanguageSwitch({save:()=>localStorage.setItem(STORAGE,JSON.stringify(project())),connected:()=>connection.connected,clearDirty:()=>{dirty=false;}});
