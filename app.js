import {VERSION,validateProject} from './model.js';
import {setupClassroom,classroomToolbox} from './classroom-blocks.js';
import {setBlockLanguage} from './blocks.js';
import {generateStandard} from './standard.js';
import {classroomSample,SAMPLE_NAMES} from './classroom-samples.js';
import {SpikeConnection} from './spike-ble.js';
const $=id=>document.getElementById(id), STORAGE='spike-block-lab-v1';
setupClassroom(Blockly);setBlockLanguage(Blockly,'standard');
const theme=Blockly.Theme.defineTheme('spikelab',{base:Blockly.Themes.Classic,fontStyle:{family:'"Yu Gothic UI", Meiryo, sans-serif',size:12},componentStyles:{workspaceBackgroundColour:'#fbfcfd',toolboxBackgroundColour:'#f4f7f8',flyoutBackgroundColour:'#eef3f5',flyoutOpacity:1,scrollbarColour:'#b9c9ce',insertionMarkerColour:'#126c67'}});
const workspace=Blockly.inject('blocklyDiv',{toolbox:classroomToolbox(),theme,renderer:'zelos',media:'vendor/media/',trashcan:true,grid:{spacing:24,length:2,colour:'#e5ebee',snap:false},zoom:{controls:true,wheel:true,startScale:.85,minScale:.35,maxScale:1.5},move:{scrollbars:true,drag:true,wheel:true},sounds:false});
let loading=false,dirty=false,latest=null,transferred=null,acting=false,checking=false;
const logs=[];
function log(message){logs.push(`${new Date().toISOString()} ${message}`);if(logs.length>300)logs.shift();$('log').textContent=logs.join('\n');$('lastLog').textContent=message.slice(0,80);}
function feedback(text,error=false){$('actionStatus').textContent=text;$('actionStatus').style.color=error?'#a13f35':'#176b65';}
function download(content,name,type='application/json') {const url=URL.createObjectURL(new Blob([content],{type})),a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);}
const filename=()=>($('projectName').value.trim()||'作品').replace(/[<>:"/\\|?*\x00-\x1f]/g,'_').slice(0,80);
const connection=new SpikeConnection({onLog:log,onChange:()=>{if(!connection.connected){transferred=null;clearSensors();}update();},onDevices:showSensors});
for(let i=0;i<20;i++)$('slot').add(new Option(String(i),String(i)));
for(const p of ['A','B','C','D','E','F']){const row=document.createElement('div');row.innerHTML=`<dt>ポート ${p}<small id="device${p}">未取得</small></dt><dd id="value${p}">—</dd>`;$('sensorValues').append(row);}
function showSensors(readings){clearSensors();for(const r of readings){if(!r.port)continue;const label=$('device'+r.port),value=$('value'+r.port);if(label){label.textContent=r.device;value.textContent=r.text;}}$('sensorStatus').textContent='本体の値を更新しています。';}
function clearSensors(){for(const p of ['A','B','C','D','E','F'])if($('device'+p)){$('device'+p).textContent='未取得';$('value'+p).textContent='—';}}
function project(){return {format:'spike-block-lab',version:1,appVersion:VERSION,name:$('projectName').value,language:$('language').value,workspace:Blockly.serialization.workspaces.save(workspace)};}
function saveLocal(){if(loading)return;try{localStorage.setItem(STORAGE,JSON.stringify(project()));$('saveState').textContent='✓ この端末に自動保存済み';}catch{$('saveState').textContent='自動保存できません。「保存」でファイルに残してください。';}}
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
    // Keep call arguments directly editable, just as in EV3 Block Lab.
    for(const b of workspace.getAllBlocks(false))if(b.type==='procedures_callnoreturn')for(const input of b.inputList)if(/^ARG\d+$/.test(input.name)&&input.connection&&!input.connection.targetBlock())input.connection.setShadowState({type:'math_number',fields:{NUM:0}});
    latest=generateStandard(workspace,Blockly.Python);$('code').textContent=latest.source;$('buildStatus').textContent='✓ 転送用プログラムを生成できます';$('buildStatus').className='build-status';$('blockCount').textContent=`${latest.count} ブロック / ${latest.threads} 処理`;
  }catch(error){latest=null;$('buildStatus').textContent=error.message;$('buildStatus').className='build-status error';$('blockCount').textContent='';$('code').textContent='ブロックを修正すると、自動で確認します。';if(error.blockId)workspace.getBlockById(error.blockId)?.setWarningText(error.message);}
  finally{checking=false;}update();
}
function update(){
  const busy=acting||connection.busy, connected=connection.connected;
  $('connect').hidden=connected;$('disconnect').hidden=!connected;$('connect').disabled=busy||!isSecureContext||!navigator.bluetooth;$('disconnect').disabled=busy;
  for(const id of ['upload','transferRun'])$(id).disabled=busy||!connected||!latest;
  $('run').disabled=busy||!connected||!latest||!transferred||transferred.source!==latest.source||transferred.slot!==Number($('slot').value);
  for(const id of ['stop','readSensors','stopSensors'])$(id).disabled=busy||!connected;
  $('slot').disabled=busy;$('python').disabled=busy||!latest;
  $('connection').classList.toggle('connected',connected);$('connectionLabel').textContent=connected?'接続中':'未接続';
  $('connectionState').textContent=connected?`${connection.device.name||'SPIKE PRIME'} / Hub OS ${connection.info?.firmware??'確認中'}`:!isSecureContext?'HTTPSまたはlocalhostで開いてください。':!navigator.bluetooth?'Bluetooth接続に非対応です。ChromebookのChromeで開いてください。':'本体のBluetoothボタンを押し、接続先を選びます。';
}
async function action(fn){if(acting)return;acting=true;feedback('');update();try{await fn();}catch(error){feedback(error.message,true);log(error.message);}finally{acting=false;update();}}
function openPanel(open){$('connectionPanel').hidden=!open;$('toggleConnectionPanel').setAttribute('aria-expanded',String(open));Blockly.svgResize(workspace);}
$('toggleConnectionPanel').onclick=()=>openPanel($('connectionPanel').hidden);$('closeConnectionPanel').onclick=()=>openPanel(false);
$('toggleLog').onclick=()=>{const open=$('logContent').hidden;$('logContent').hidden=!open;$('toggleLog').setAttribute('aria-expanded',String(open));Blockly.svgResize(workspace);};
workspace.addChangeListener(event=>{if(loading||checking||event.isUiEvent)return;dirty=true;transferred=null;check();saveLocal();});
$('projectName').oninput=()=>{dirty=true;saveLocal();};
$('saveProject').onclick=()=>{download(JSON.stringify(project(),null,2),filename()+'.spikelab');dirty=false;feedback('作品を保存しました。');};
$('openProject').onclick=()=>{if(!dirty||confirm('現在の作品を置き換えます。残す場合は先に保存してください。'))$('projectFile').click();};
$('projectFile').onchange=()=>action(async()=>{const file=$('projectFile').files[0];if(!file)return;try{if(file.size>1024*1024)throw Error('1 MiBまでの作品を選んでください。');restore(JSON.parse(await file.text()));}finally{$('projectFile').value='';}});
$('newProject').onclick=()=>{if(dirty&&!confirm('新しくつくります。今の作品を残す場合は先に保存してください。'))return;restore({format:'spike-block-lab',version:1,name:'MyProgram',language:$('language').value,workspace:{blocks:{languageVersion:0,blocks:[{type:'spike_start',x:60,y:40}]}}});dirty=true;};
$('sample').onchange=()=>{const name=$('sample').value;$('sample').value='';if(!name)return;if(dirty&&!confirm('サンプルに置き換えます。残したい作品は先に保存してください。'))return;restore({format:'spike-block-lab',version:1,name:SAMPLE_NAMES[name],language:$('language').value,workspace:classroomSample(name)});dirty=true;};
$('language').onchange=()=>{restore(project());dirty=true;};
$('undo').onclick=()=>workspace.undo(false);$('redo').onclick=()=>workspace.undo(true);$('fit').onclick=()=>workspace.zoomToFit();$('slot').onchange=update;
$('connect').onclick=()=>action(async()=>{const info=await connection.connect();log(`接続: ${connection.device.name}, Hub OS ${info.firmware}`);feedback('接続しました。保存番号を確認してください。');});
$('disconnect').onclick=()=>{connection.disconnect();feedback('接続を切りました。本体で保存番号を選んで実行できます。');};
async function transfer(run){
  if(!latest)return;const slot=Number($('slot').value),source=latest.source;
  if(!confirm(`本体の番号 ${slot} を上書きします。${run?'転送後、すぐ動き始めます。':'転送だけでは動きません。'}`))return;
  transferred=null;$('progress').hidden=false;$('progress').value=0;$('transferStatus').textContent='転送しています…';
  try{const result=await connection.upload(source,slot,n=>$('progress').value=n);transferred={slot,source};$('transferStatus').textContent=`番号 ${slot} への転送応答を確認しました。`;log(`転送完了: slot ${slot}, ${result.bytes} bytes, CRC ${result.crc.toString(16)}`);if(run){await connection.run(slot);$('transferStatus').textContent+=' 実行の指示を送りました。';}}
  catch(error){$('transferStatus').textContent=transferred?'保存済みです。実行の指示に失敗しました。':'転送は完了していません。再接続してやり直してください。';throw error;}finally{$('progress').hidden=true;}
}
$('upload').onclick=()=>action(()=>transfer(false));$('transferRun').onclick=()=>action(()=>transfer(true));
$('run').onclick=()=>action(async()=>{if(transferred&&latest?.source===transferred.source&&confirm('プログラムを実行します。準備はできていますか？'))await connection.run(transferred.slot);});
$('stop').onclick=()=>action(async()=>{await connection.stop(Number($('slot').value));feedback('停止の指示を送りました。');});
$('readSensors').onclick=()=>action(async()=>{await connection.observe(500);$('sensorStatus').textContent='本体から値が届くまで待っています。';});
$('stopSensors').onclick=()=>action(async()=>{await connection.observe(0);$('sensorStatus').textContent='更新を止めました。';});
$('python').onclick=()=>{if(latest)download(latest.source,filename()+'.py','text/x-python');};
$('showCode').onclick=()=>$('codeDialog').showModal();$('help').onclick=()=>$('helpDialog').showModal();
$('saveLog').onclick=()=>download(JSON.stringify({appVersion:VERSION,userAgent:navigator.userAgent,hub:connection.info,logs},null,2),'spike-test-log.json');
$('createMyBlock').onclick=()=>{$('myBlockError').textContent='';$('myBlockDialog').showModal();};$('cancelMyBlock').onclick=()=>$('myBlockDialog').close();
$('myBlockForm').onsubmit=event=>{event.preventDefault();try{
  const name=$('myBlockName').value.trim(),args=$('myBlockArgs').value.split(/[,、]/).map(s=>s.trim()).filter(Boolean);
  if(!name||name.length>60||args.length>8||new Set(args).size!==args.length)throw Error('名前と、重複しない8個までの引数を入力してください。');
  if(workspace.getAllBlocks(false).some(b=>b.type==='procedures_defnoreturn'&&b.getFieldValue('NAME')===name))throw Error('同じ名前のマイブロックがあります。');
  const block=Blockly.serialization.blocks.append({type:'procedures_defnoreturn',fields:{NAME:name},extraState:{params:args.map(name=>({name,id:crypto.randomUUID()}))},x:70,y:220},workspace);
  block.select();$('myBlockDialog').close();$('myBlockName').value='';$('myBlockArgs').value='';check();saveLocal();
}catch(error){$('myBlockError').textContent=error.message;}};
$('exportMyBlocks').onclick=()=>{const state=Blockly.serialization.workspaces.save(workspace),defs=state.blocks.blocks.filter(b=>b.type==='procedures_defnoreturn');if(!defs.length){feedback('マイブロックを作ってから書き出してください。',true);return;}download(JSON.stringify({format:'spike-block-library',version:1,workspace:{...state,blocks:{...state.blocks,blocks:defs}}},null,2),'my-blocks.spikeblocks');};
$('importMyBlocks').onclick=()=>$('libraryFile').click();
$('libraryFile').onchange=()=>action(async()=>{
  const file=$('libraryFile').files[0];if(!file)return;
  try{
    if(file.size>1024*1024)throw Error('1 MiBまでのファイルを選んでください。');
    const data=JSON.parse(await file.text());if(data.format!=='spike-block-library'||data.version!==1)throw Error('SPIKEのマイブロック集を選んでください。');
    validateProject({format:'spike-block-lab',version:1,name:'library',language:'standard',workspace:data.workspace});
    const backup=project(),defs=data.workspace.blocks.blocks,existing=backup.workspace.blocks.blocks;
    if(!defs.length||defs.some(b=>b.type!=='procedures_defnoreturn'))throw Error('マイブロックの定義を確認してください。');
    const names=new Set(existing.filter(b=>b.type==='procedures_defnoreturn').map(b=>b.fields.NAME.toLowerCase()));
    for(const b of defs){const key=b.fields.NAME.toLowerCase();if(names.has(key))throw Error('同じ名前のマイブロックがあります。');names.add(key);}
    const map=new Map(),variables=backup.workspace.variables??[];
    for(const variable of data.workspace.variables??[]){let target=variables.find(v=>v.name===variable.name);if(!target){target={...variable,id:crypto.randomUUID()};variables.push(target);}map.set(variable.id,target.id);}
    function remap(value){if(!value||typeof value!=='object')return;if(value.type)delete value.id;if(value.fields?.VAR?.id)value.fields.VAR.id=map.get(value.fields.VAR.id)??value.fields.VAR.id;if(value.extraState?.params)for(const p of value.extraState.params)p.id=map.get(p.id)??p.id;for(const child of Object.values(value))remap(child);}
    remap(defs);const bottom=Math.max(0,...existing.map(b=>b.y??0))+350;defs.forEach((b,i)=>{b.x=50+i*300;b.y=bottom;});
    backup.workspace.variables=variables;backup.workspace.blocks.blocks.push(...defs);restore(backup);dirty=true;feedback('マイブロックを読み込みました。');
  }finally{$('libraryFile').value='';}
});
window.addEventListener('resize',()=>Blockly.svgResize(workspace));window.addEventListener('beforeunload',event=>{if(dirty){event.preventDefault();event.returnValue='';}});
try{const saved=localStorage.getItem(STORAGE);if(saved)restore(JSON.parse(saved));else restore({format:'spike-block-lab',version:1,name:'DisplayTest',language:'standard',workspace:classroomSample('lights')});}
catch(error){log('復元できませんでした: '+error.message);loading=true;Blockly.serialization.workspaces.load(classroomSample('lights'),workspace);loading=false;check();$('saveState').textContent='前の自動保存を復元できませんでした。';}
