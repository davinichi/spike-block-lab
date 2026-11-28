import {buildEnglish} from './build-english.mjs';
import {mkdir,cp,copyFile,readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const root=fileURLToPath(new URL('.',import.meta.url));
const debug=process.argv.includes('--debug'),outArg=process.argv.indexOf('--out');
if(debug&&outArg<0)throw Error('Debug build requires a separate --out directory');
const out=outArg<0?path.join(root,'dist'):path.resolve(process.argv[outArg+1]);
if(debug&&out===path.join(root,'dist'))throw Error('Debug build must not overwrite public dist');
await mkdir(path.join(out,'vendor'),{recursive:true});
const files=['project-interop-guide.html','project-interop-guide.pdf','PROJECT-INTEROP.md','project-interop.js','numeric-text.js','notices.js','gyro-initialize.js','slot-manager.js','spike-usb.js','language-switch.js','python-comments.js','python-files.js','code-panel.js','gyro-turn.js','motor-sync.js','edition.js','index.html','style.css','app.js','numeric-inputs.js','blocks.js','model.js','classroom-blocks.js','classroom-samples.js','primary-school-sample.js','standard.js','common-blocks.js','shared-groups.js','common-runtime.js','myblocks.js','returns.js','return-runtime.js','enhancements.js','recording.js','spike-ble.js','sensor-monitor.js','zip.js','credits.html','THIRD_PARTY.md','TESTING.md','EBL-RT-COMMON-GROUPS.txt','manual-v1.1.0.html','SPIKE-Block-Lab-manual-v1.1.0.pdf','manual-overview.jpg'];
for(const file of files)await copyFile(path.join(root,file),path.join(out,file));
for(const [from,to] of [['blockly_compressed.js','blockly_compressed.js'],['blocks_compressed.js','blocks_compressed.js'],['python_compressed.js','python_compressed.js'],['msg/ja.js','ja.js']])await copyFile(path.join(root,'node_modules/blockly',from),path.join(out,'vendor',to));
await cp(path.join(root,'node_modules/blockly/media'),path.join(out,'vendor/media'),{recursive:true});
const license=await readFile(path.join(root,'node_modules/blockly/LICENSE'),'utf8');
await import('node:fs/promises').then(fs=>fs.writeFile(path.join(out,'vendor/LICENSE'),license));
if(!debug){const fs=await import('node:fs/promises'),file=path.join(out,'index.html');let html=await readFile(file,'utf8');for(const value of ['pidRecording','syncGentle','syncNone','syncTrap','syncS','distanceRamp'])html=html.replace(new RegExp('<option value="'+value+'">[^<]*</option>','g'),'');await fs.writeFile(file,html);}
if(debug)await import('node:fs/promises').then(fs=>fs.writeFile(path.join(out,'edition.js'),'export const DEBUG_EDITION=true;\n'));
console.log('Built dist/ (Blockly 13.4.0 bundled locally; no CDN required).');





await buildEnglish(root,out,files);
