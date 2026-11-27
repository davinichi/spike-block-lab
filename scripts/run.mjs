// Keep the published app and its relative imports unchanged while classifying files.
import {readFile,mkdir,mkdtemp,copyFile,symlink,cp,readdir} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
const root=path.resolve(fileURLToPath(new URL('..',import.meta.url)));
const command=process.argv[2]??'build',args=process.argv.slice(3);
const entries={build:'build.mjs',start:'server.mjs',export:'export-sample.mjs',manual:'make-manual.py'};
if(command!=='test'&&!entries[command])throw Error('Unknown command: '+command);
const map=JSON.parse(await readFile(path.join(root,'scripts/file-map.json'),'utf8'));
await mkdir(path.join(root,'.cache'),{recursive:true});
const work=await mkdtemp(path.join(root,'.cache','run-'));
for(const [name,source] of Object.entries(map))await copyFile(path.join(root,source),path.join(work,name));
await copyFile(path.join(root,'package.json'),path.join(work,'package.json'));
await copyFile(path.join(root,'THIRD_PARTY.md'),path.join(work,'THIRD_PARTY.md'));
await symlink(path.join(root,'node_modules'),path.join(work,'node_modules'),process.platform==='win32'?'junction':'dir');
function run(exe,params){const r=spawnSync(exe,params,{cwd:work,stdio:'inherit',env:{...process.env,PYTHONUTF8:'1'}});if(r.error)throw r.error;if(r.status!==0)process.exit(r.status??1);}
if(command==='test'){
 run(process.execPath,['build.mjs']);
 const tests=(await readdir(work)).filter(n=>n.endsWith('.test.mjs')).sort();
 run(process.execPath,['--test',...tests]);
}else if(command==='build'){
 run(process.execPath,['build.mjs',...(args.includes('--out')?args:['--out',path.join(root,'dist'),...args])]);
}else if(command==='start'){
 await cp(path.join(root,'dist'),path.join(work,'dist'),{recursive:true});
 run(process.execPath,['server.mjs',...args]);
}else if(command==='export'){
 run(process.execPath,['export-sample.mjs',...args]);
 await cp(path.join(work,'generated'),path.join(root,'generated'),{recursive:true});
}else{
 run(process.platform==='win32'?'python':'python3',['make-manual.py',...args]);
 const version=JSON.parse(await readFile(path.join(work,'manual-data.json'),'utf8')).version;
 for(const name of [`manual-v${version}.html`,`SPIKE-Block-Lab-manual-v${version}.pdf`])await copyFile(path.join(work,name),path.join(root,'docs/manuals',name));
}
