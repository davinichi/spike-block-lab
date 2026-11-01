import {mkdir,cp,copyFile,readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const root=fileURLToPath(new URL('.',import.meta.url));
const out=path.join(root,'dist');
await mkdir(path.join(out,'vendor'),{recursive:true});
const files=['index.html','style.css','app.js','blocks.js','model.js','classroom-blocks.js','classroom-samples.js','standard.js','common-blocks.js','common-runtime.js','myblocks.js','returns.js','return-runtime.js','enhancements.js','recording.js','spike-ble.js','zip.js','THIRD_PARTY.md','TESTING.md','manual-v0.7.0.html','SPIKE-Block-Lab-manual-v0.7.0.pdf','manual-overview.jpg'];
for(const file of files)await copyFile(path.join(root,file),path.join(out,file));
for(const [from,to] of [['blockly_compressed.js','blockly_compressed.js'],['blocks_compressed.js','blocks_compressed.js'],['python_compressed.js','python_compressed.js'],['msg/ja.js','ja.js']])await copyFile(path.join(root,'node_modules/blockly',from),path.join(out,'vendor',to));
await cp(path.join(root,'node_modules/blockly/media'),path.join(out,'vendor/media'),{recursive:true});
const license=await readFile(path.join(root,'node_modules/blockly/LICENSE'),'utf8');
await import('node:fs/promises').then(fs=>fs.writeFile(path.join(out,'vendor/LICENSE'),license));
console.log('Built dist/ (Blockly 13.4.0 bundled locally; no CDN required).');




