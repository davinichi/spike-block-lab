import {VERSION, IMAGES, validateProgram, validateProject} from './model.js';
import {setupBlocks, setBlockLanguage, toolbox, workspaceProgram, sampleWorkspace} from './blocks.js';
import {generatePython, generateC, generateRTProject} from './generate.js';
import {zipFiles} from './zip.js';
import {SpikeConnection} from './spike-ble.js';

const $=id=>document.getElementById(id), STORAGE='spike-block-lab-v1';
setupBlocks(Blockly);setBlockLanguage(Blockly,'basic');
const theme=Blockly.Theme.defineTheme('spikelab',{base:Blockly.Themes.Classic,fontStyle:{family:'"Yu Gothic UI", Meiryo, sans-serif',size:13},componentStyles:{workspaceBackgroundColour:'#fbfcfa',toolboxBackgroundColour:'#f1f5f1',flyoutBackgroundColour:'#eaf1eb',flyoutOpacity:1,insertionMarkerColour:'#176b65'}});
const workspace=Blockly.inject('blocklyDiv',{toolbox,theme,renderer:'zelos',media:'vendor/media/',trashcan:true,grid:{spacing:24,length:2,colour:'#dce7df',snap:false},zoom:{controls:true,wheel:true,startScale:.85,minScale:.4,maxScale:1.6},move:{scrollbars:true,drag:true,wheel:true},sounds:false});
let loading=false, dirty=false, latest=null, transferred=null, connecting=false, acting=false;
const logs=[];
function log(message){logs.push(`${new Date().toISOString()} ${message}`);if(logs.length>300)logs.shift();$('log').textContent=logs.join('\n');}
function status(message,error=false){$('actionStatus').textContent=message;$('actionStatus').style.color=error?'#a13f35':'#176b65';}
function download(content,name,type='application/json') {
  const url=URL.createObjectURL(new Blob([content],{type})), a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
const fileName=()=>($('projectName').value.trim()||'作品').replace(/[<>:"/\\|?*\x00-\x1f]/g,'_').slice(0,80);
const connection=new SpikeConnection({onLog:log,onChange:()=>{if(!connection.connected)transferred=null;update();}});
for(let i=0;i<20;i++)$('slot').add(new Option(String(i),String(i)));
function project(){return {format:'spike-block-lab',version:1,appVersion:VERSION,name:$('projectName').value,language:$('language').value,workspace:Blockly.serialization.workspaces.save(workspace)};}
function saveLocal(){if(loading)return;try{localStorage.setItem(STORAGE,JSON.stringify(project()));$('saveState').textContent='✓ この端末に自動保存済み';}catch{$('saveState').textContent='自動保存できません。「作品を保存」で残してください。';}}
function restore(data) {
  validateProject(data);
  const backup=project();loading=true;
  try {
    setBlockLanguage(Blockly,data.language);Blockly.serialization.workspaces.load(data.workspace,workspace);
    $('projectName').value=data.name;$('language').value=data.language;workspace.clearUndo();
  } catch(error) {
    setBlockLanguage(Blockly,backup.language);Blockly.serialization.workspaces.load(backup.workspace,workspace);throw error;
  } finally {loading=false;}
  transferred=null;dirty=false;check();saveLocal();
}
function check(){
  for(const b of workspace.getAllBlocks(false))b.setWarningText(null);
  try {
    const program=workspaceProgram(workspace),info=validateProgram(program);
    const python=generatePython(program),c=generateC(program);latest={program,python,c};
    $('buildStatus').textContent='✓ ためす準備ができました';$('buildStatus').className='';$('blockCount').textContent=`${info.count} ブロック`;
    $('code').textContent=$('target').value==='rt'?c:python;
  } catch(error) {
    latest=null;$('buildStatus').textContent=error.message;$('buildStatus').className='error';$('blockCount').textContent='';$('code').textContent='ブロックを直すと、ここにコードが表示されます。';
    if(error.blockId)workspace.getBlockById(error.blockId)?.setWarningText(error.message);
  }
  update();
}
function update(){
  const rt=$('target').value==='rt',busy=acting||connecting||connection.busy;
  $('standardPanel').hidden=rt;$('rtPanel').hidden=!rt;$('codeLabel').textContent=rt?'C / SPIKE-RT':'Python / 標準Hub OS';
  $('connect').hidden=connection.connected;$('disconnect').hidden=!connection.connected;
  $('connect').disabled=busy||!isSecureContext||!navigator.bluetooth;$('disconnect').disabled=busy;
  $('upload').disabled=busy||!connection.connected||!latest;
  $('run').disabled=busy||!connection.connected||!latest||!transferred||transferred.source!==latest.python||transferred.slot!==Number($('slot').value);
  $('stop').disabled=busy||!connection.connected;$('slot').disabled=busy;
  $('python').disabled=busy||!latest;$('rtExport').disabled=busy||!latest;$('target').disabled=busy;
  $('connectionState').textContent=connection.connected?`● ${connection.device.name||'SPIKE PRIME'} / Hub OS ${connection.info?.firmware??'確認中'}`:!isSecureContext?'HTTPSまたはlocalhostで開いてください。':!navigator.bluetooth?'このブラウザはBluetooth接続に非対応です。ChromebookのChromeで試してください。':'● まだつながっていません';
}
async function action(fn){
  if(acting)return;acting=true;status('');update();
  try{await fn();}catch(error){status(error.message,true);log(error.message);}finally{acting=false;update();}
}
function replaceSample(name) {
  if(dirty&&!confirm('今の作品をお手本に置きかえます。残したい作品は先に「作品を保存」で保存してください。'))return;
  const names={lights:'ひかりであいさつ',motor:'まわして、もどす',distance:'ちかづくとハート'};
  restore({format:'spike-block-lab',version:1,name:names[name],language:$('language').value,workspace:sampleWorkspace(name)});dirty=true;
}
workspace.addChangeListener(event=>{
  if(loading||event.isUiEvent)return;
  dirty=true;transferred=null;check();saveLocal();
});
$('projectName').addEventListener('input',()=>{dirty=true;saveLocal();});
$('saveProject').onclick=()=>{download(JSON.stringify(project(),null,2),`${fileName()}.spikelab`);dirty=false;status('作品を保存しました。あとで「開く」から直せます。');};
$('openProject').onclick=()=>{if(!dirty||confirm('今の作品を開く作品に置きかえます。保存が必要ならキャンセルしてください。'))$('projectFile').click();};
$('projectFile').onchange=()=>action(async()=>{
  const file=$('projectFile').files[0];if(!file)return;
  try{if(file.size>1024*1024)throw Error('1 MiBまでの作品ファイルを選んでください。');restore(JSON.parse(await file.text()));status('作品を開きました。');}finally{$('projectFile').value='';}
});
$('newProject').onclick=()=>{
  if(dirty&&!confirm('新しくつくります。今の作品を残す場合は先に「作品を保存」をしてください。'))return;
  restore({format:'spike-block-lab',version:1,name:'新しい作品',language:$('language').value,workspace:{blocks:{languageVersion:0,blocks:[{type:'spike_start',x:50,y:40}]}}});dirty=true;
};
$('sample').onchange=()=>{const name=$('sample').value;if(name)replaceSample(name);$('sample').value='';};
$('language').onchange=()=>{const data=project();data.language=$('language').value;restore(data);dirty=true;};
$('undo').onclick=()=>workspace.undo(false);$('redo').onclick=()=>workspace.undo(true);$('fit').onclick=()=>workspace.zoomToFit();
$('target').onchange=()=>{if($('target').value==='rt'&&connection.connected)connection.disconnect();check();};
$('slot').onchange=()=>{update();};
$('connect').onclick=()=>action(async()=>{connecting=true;update();try{const info=await connection.connect();log(`接続: ${connection.device.name}, Hub OS ${info.firmware}`);status('つながりました。保存番号を確認してください。');}finally{connecting=false;}});
$('disconnect').onclick=()=>{connection.disconnect();status('接続を切りました。本体の操作でためせます。');};
$('upload').onclick=()=>action(async()=>{
  if(!latest)return;
  const slot=Number($('slot').value),source=latest.python;
  if(!confirm(`本体の番号 ${slot} におくります。同じ番号のプログラムは置きかわります。転送だけでは動き始めません。`))return;
  transferred=null;$('progress').hidden=false;$('progress').value=0;$('transferStatus').textContent='本体におくっています…';
  try {
    const result=await connection.upload(source,slot,n=>$('progress').value=n);
    transferred={slot,source};log(`転送応答確認: slot ${slot}, ${result.bytes} bytes, CRC ${result.crc.toString(16)}`);
    $('transferStatus').textContent=`番号 ${slot} への転送応答を確認しました。接続を切って、本体だけで動くかためしましょう。`;
  } catch(error){$('transferStatus').textContent='転送は完了していません。再接続して、もう一度おくってください。';throw error;}
  finally{$('progress').hidden=true;}
});
$('run').onclick=()=>action(async()=>{if(!transferred||transferred.source!==latest?.python)return;if(confirm('プログラムを動かします。モーターが動く場合があります。準備はできていますか？')){await connection.run(transferred.slot);status('実行の指示をおくりました。');}});
$('stop').onclick=()=>action(async()=>{await connection.stop(Number($('slot').value));status('停止の指示をおくりました。');});
$('python').onclick=()=>{if(latest)download(latest.python,`${fileName()}.py`,'text/x-python');};
$('rtExport').onclick=()=>action(async()=>{
  if(!latest)return;const response=await fetch('rt-template.cdl');if(!response.ok)throw Error('構成テンプレートを読み込めませんでした。');
  const files=generateRTProject(latest.program,await response.text());files['THIRD_PARTY.txt']=await(await fetch('RT-NOTICE.txt')).text();
  download(zipFiles(files),`${fileName()}-spike-rt.zip`,'application/zip');status('Cソース一式を保存しました。ZIP内のBUILD.mdを確認してください。');
});
$('saveLog').onclick=()=>download(JSON.stringify({appVersion:VERSION,userAgent:navigator.userAgent,hub:connection.info,logs},null,2),'spike-lab-log.json');
$('help').onclick=()=>$('helpDialog').showModal();$('closeHelp').onclick=()=>$('helpDialog').close();
for(const bit of IMAGES.smile.join('')){const pixel=document.createElement('span');pixel.className='pixel'+(bit==='1'?' on':'');$('hubPixels').append(pixel);}
window.addEventListener('resize',()=>Blockly.svgResize(workspace));
window.addEventListener('beforeunload',event=>{if(dirty){event.preventDefault();event.returnValue='';}});
try {
  const saved=localStorage.getItem(STORAGE);
  if(saved)restore(JSON.parse(saved));else replaceSample('lights');
} catch(error) {
  log(`復元できませんでした: ${error.message}`);
  // Keep the saved value untouched so a damaged file is not silently overwritten.
  loading=true;Blockly.serialization.workspaces.load(sampleWorkspace('lights'),workspace);loading=false;check();
  $('saveState').textContent='前の自動保存を復元できませんでした。必要ならブラウザのデータを残してください。';
}
