import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {SAMPLES} from './model.js';
import {generateRTProject,generatePython} from './generate.js';
import {zipFiles} from './zip.js';
await mkdir('generated',{recursive:true});
const cdl=await readFile(new URL('./rt-template.cdl',import.meta.url),'utf8');
for(const [name,program] of Object.entries(SAMPLES)) {
  const files=generateRTProject(program,cdl);
  files['THIRD_PARTY.txt']=await readFile(new URL('./RT-NOTICE.txt',import.meta.url),'utf8');
  await writeFile(`generated/${name}-spike-rt.zip`,zipFiles(files));
  await writeFile(`generated/${name}.py`,generatePython(program));
  await mkdir(`generated/${name}`,{recursive:true});
  for(const [file,text] of Object.entries(files))await writeFile(`generated/${name}/${file}`,text);
}
console.log('Exported lights, motor and distance samples to generated/.');
