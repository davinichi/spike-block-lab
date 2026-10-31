import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {SAMPLES} from './model.js';
import {generateRTProject,generatePython} from './generate.js';
import {zipFiles} from './zip.js';
import * as Blockly from 'blockly';
import {pythonGenerator} from 'blockly/python';
import {setupClassroom} from './classroom-blocks.js';
import {classroomSample,SAMPLE_NAMES} from './classroom-samples.js';
import {generateStandard} from './standard.js';
await mkdir('generated',{recursive:true});
const cdl=await readFile(new URL('./rt-template.cdl',import.meta.url),'utf8');
if(process.argv.includes('--rt'))for(const [name,program] of Object.entries(SAMPLES)) {
  const files=generateRTProject(program,cdl);
  files['THIRD_PARTY.txt']=await readFile(new URL('./RT-NOTICE.txt',import.meta.url),'utf8');
  await writeFile(`generated/${name}-spike-rt.zip`,zipFiles(files));
  await writeFile(`generated/${name}.py`,generatePython(program));
  await mkdir(`generated/${name}`,{recursive:true});
  for(const [file,text] of Object.entries(files))await writeFile(`generated/${name}/${file}`,text);
}
setupClassroom(Blockly);
await mkdir('generated/standard',{recursive:true});
for(const name of Object.keys(SAMPLE_NAMES)) {
  const workspace=new Blockly.Workspace();
  try {
    Blockly.serialization.workspaces.load(classroomSample(name),workspace);
    await writeFile(`generated/standard/${name}.py`,generateStandard(workspace,pythonGenerator).source);
    await writeFile(`generated/standard/${name}.spikelab`,JSON.stringify({format:'spike-block-lab',version:1,appVersion:'0.4.8',name:SAMPLE_NAMES[name],language:'standard',workspace:Blockly.serialization.workspaces.save(workspace)},null,2));
  }finally{workspace.dispose();}
}
console.log(`Exported ${Object.keys(SAMPLE_NAMES).length} standard Hub OS samples and editable projects to generated/standard/.`);

