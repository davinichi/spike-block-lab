import {readFileSync,writeFileSync} from 'node:fs';
import vm from 'node:vm';
import * as Blockly from 'blockly';
const paths={ebl:'D:/Codex/Files/EBLRT-PID-motion-20261113/ebl-standard/dist/app.js',eblrt:'D:/Codex/Files/EBLRT-Windows-035-20261115/EBL-RT-Windows-0.3.5/resources/app/dist/app.js'};
const snapshots={};
for(const [name,path] of Object.entries(paths)){
 const source=readFileSync(path,'utf8');const definitions=[];
 const B={...Blockly,Msg:{...Blockly.Msg},Blocks:{...Blockly.Blocks},defineBlocksWithJsonArray(defs){definitions.push(...defs);Blockly.defineBlocksWithJsonArray(defs);Object.assign(this.Blocks,Blockly.Blocks);}};
 let code=source.slice(0,source.indexOf('function argumentModel(')).replace(/^import .*;.*$/gm,'');
 const context={Blockly:B,document:{querySelector:()=>({})},DISPLAY_IMAGES:[],definitions,console};
 vm.runInNewContext(code+'\nglobalThis.result={version:VERSION,toolbox,definitions};',context);
 const keep=['音','制御','演算','データ','記録','変数','マイブロック','引数'];
 const result=context.result;snapshots[name]={path,version:result.version,groups:result.toolbox.contents.filter(c=>keep.includes(c.name)),definitions:result.definitions.filter(d=>result.toolbox.contents.filter(c=>keep.includes(c.name)).flatMap(c=>c.contents??[]).some(e=>e.type===d.type))};
}
writeFileSync('shared-groups-reference.json',JSON.stringify(snapshots,null,2)+'\n');
console.log(Object.fromEntries(Object.entries(snapshots).map(([name,s])=>[name,{version:s.version,groups:s.groups.map(g=>[g.name,g.contents?.length??g.custom])}])));

