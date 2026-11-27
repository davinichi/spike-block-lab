import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import * as Blockly from 'blockly';
import {validateProgram,validateProject,SAMPLES} from './model.js';
import {setupBlocks,setBlockLanguage,sampleWorkspace,workspaceProgram} from './blocks.js';
import {generatePython,generateC,generateRTProject} from './generate.js';
import {crc32,zipFiles} from './zip.js';
setupBlocks(Blockly);

test('classroom samples retain their semantics through real Blockly serialization and language changes',()=>{
  const strip=x=>JSON.parse(JSON.stringify(x,(key,value)=>key==='id'?undefined:value));
  for(const name of Object.keys(SAMPLES))for(const language of ['basic','standard','basic']) {
    setBlockLanguage(Blockly,language);
    const ws=new Blockly.Workspace();
    Blockly.serialization.workspaces.load(sampleWorkspace(name),ws);
    const project={format:'spike-block-lab',version:1,name:'作品',language,workspace:Blockly.serialization.workspaces.save(ws)};
    validateProject(project);
    const restored=new Blockly.Workspace();Blockly.serialization.workspaces.load(project.workspace,restored);
    assert.deepEqual(strip(workspaceProgram(restored)),SAMPLES[name]);
    assert.ok(validateProgram(workspaceProgram(restored)).count>0);
    ws.dispose();restored.dispose();
  }
});
test('rejects conflicting ports, unsupported commands and non-finite motor input before generation',()=>{
  for(const body of [
    [{type:'motor',port:'G',speed:90,seconds:1}],
    [{type:'motor',port:'A',speed:Infinity,seconds:1}],
    [{type:'motor',port:'A',speed:0,seconds:1}],
    [{type:'motor',port:'A',speed:90,seconds:1},{type:'ifDistance',port:'A',cm:15,then:[],else:[]}],
    [{type:'unknown'}],[]
  ])assert.throws(()=>generateC({version:1,body}));
});
test('rejects a damaged project without invoking Blockly',()=>{
  const good={format:'spike-block-lab',version:1,name:'作品',language:'basic',workspace:sampleWorkspace('lights')};
  assert.equal(validateProject(good),good);
  assert.throws(()=>validateProject({...good,format:'ev3-block-lab'}));
  assert.throws(()=>validateProject({...good,workspace:{blocks:{blocks:[{type:'arbitrary_script'}]}}}));
});
test('a forever block followed by reachable-looking code reports the exact block',()=>{
  const ws=new Blockly.Workspace();
  Blockly.serialization.workspaces.load({blocks:{languageVersion:0,blocks:[{type:'spike_start',next:{block:{id:'loop',type:'spike_forever',next:{block:{type:'spike_wait'}}}}}]}},ws);
  assert.throws(()=>workspaceProgram(ws),error=>error.blockId==='loop');ws.dispose();
});
test('Python and C preserve explicit speed units, distance units, cleanup and yielding loops',()=>{
  const program={version:1,body:[...SAMPLES.motor.body,...SAMPLES.distance.body,{type:'forever',body:[]}]};
  const py=generatePython(program),c=generateC(program);
  assert.match(py,/motor.run\(port.A, -90\)/);assert.match(py,/distance_mm < 150/);
  assert.match(py,/finally:/);assert.match(py,/while True:\n\s+pass\n\s+await runloop.sleep_ms\(10\)/);
  assert.match(c,/pup_motor_set_speed\(motor_A, -90\)/);assert.match(c,/near_D\(150\)/);
  assert.match(c,/if \(!await_start\(\)\) goto cleanup/);assert.match(c,/cleanup:\n    stop_all\(\)/);
  assert.match(c,/step \* 1000U/);assert.match(c,/HUB_BUTTON_CENTER/);
});
test('SPIKE-RT project contains the entry point, task config, template and target version',async()=>{
  const cdl=await readFile(new URL('./rt-template.cdl',import.meta.url),'utf8');
  const files=generateRTProject(SAMPLES.lights,cdl);
  assert.match(files['app.c'],/void main_task\(intptr_t exinf\)/);
  assert.match(files['app.cfg'],/CRE_TSK\(APP_MAIN_TASK/);assert.match(files['app.h'],/MAIN_STACK_SIZE 4096/);
  assert.equal(files['app.cdl'],cdl);assert.equal(JSON.parse(files['target.json']).ref,'v0.2.0');
  assert.match(files['BUILD.md'],/-A app/);assert.throws(()=>generateRTProject(SAMPLES.lights,''));
});
test('CRC32 matches the published check value and ZIP records contain the actual UTF-8 data',()=>{
  assert.equal(crc32(new TextEncoder().encode('123456789')),0xcbf43926);
  const bytes=zipFiles({'app.c':'/* 日本語 */\n','app.cfg':'task\n'}),v=new DataView(bytes.buffer);
  assert.equal(v.getUint32(0,true),0x04034b50);
  const size=v.getUint32(18,true),nameLength=v.getUint16(26,true),start=30+nameLength;
  assert.equal(new TextDecoder().decode(bytes.slice(start,start+size)),'/* 日本語 */\n');
  assert.equal(v.getUint32(14,true),crc32(bytes.slice(start,start+size)));
  assert.equal(v.getUint32(bytes.length-22,true),0x06054b50);assert.equal(v.getUint16(bytes.length-12,true),2);
});
