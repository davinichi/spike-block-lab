import {test} from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import * as Blockly from 'blockly';
import {pythonGenerator} from 'blockly/python';
import {setupClassroom} from './classroom-blocks.js';
import {saveMyBlock} from './myblocks.js';
import {generateStandard} from './standard.js';
setupClassroom(Blockly);
function armProgram(){
 const ws=new Blockly.Workspace();try{
  const def=saveMyBlock(Blockly,ws,'7_アーム(角度)',[{name:'スピード(%)'},{name:'角度(°)'}]);
  const args=def.getVarModels(),n=NUM=>({shadow:{type:'math_number',fields:{NUM}}});
  const arg=i=>({block:{type:'lab_argument',extraState:{name:args[i].getName(),parameterId:args[i].getId()}}});
  const body=Blockly.serialization.blocks.append({type:'lab_motor_absolute',fields:{PORT:'E',DIRECTION:'SHORTEST_PATH'},inputs:{SPEED:arg(0),POSITION:{block:{type:'math_arithmetic',fields:{OP:'MINUS'},inputs:{A:n(360),B:arg(1)}}}}},ws);
  def.getInput('STACK').connection.connect(body.previousConnection);
  const call=angle=>({type:'procedures_callnoreturn',extraState:{name:def.getFieldValue('NAME'),params:args.map(m=>m.getName())},inputs:{ARG0:n(10),ARG1:n(angle)}});
  const first=call(90);first.next={block:call(0)};Blockly.serialization.blocks.append({type:'spike_start',next:{block:first}},ws);
  const saved=Blockly.serialization.workspaces.save(ws);ws.clear();Blockly.serialization.workspaces.load(saved,ws);
  return generateStandard(ws,pythonGenerator).source;
 }finally{ws.dispose();}
}
const harness=String.raw`
import sys,json,types,time,asyncio
source=json.load(sys.stdin)
def execute(status):
    for name in ['runloop','motor','motor_pair','distance_sensor','color_sensor','force_sensor','color','hub']:sys.modules[name]=types.ModuleType(name)
    hub=sys.modules['hub'];hub.port=types.SimpleNamespace(**{c:i for i,c in enumerate('ABCDEF')});hub.sound=types.SimpleNamespace(stop=lambda:None)
    hub.light_matrix=hub.light=hub.button=hub.motion_sensor=types.SimpleNamespace()
    motor=sys.modules['motor'];motor.READY=0;motor.BRAKE=1;motor.SHORTEST_PATH=10;motor.CLOCKWISE=11;motor.COUNTERCLOCKWISE=12
    seen=[];stopped=[];motor.stop=lambda p,**k:stopped.append(p)
    async def absolute(p,position,velocity,**kwargs):
        seen.append((p,position,velocity));await asyncio.sleep(0);return status
    motor.run_to_absolute_position=absolute
    async def pause(ms):await asyncio.sleep(0)
    async def main(*tasks):await asyncio.gather(*tasks)
    sys.modules['runloop'].sleep_ms=pause;sys.modules['runloop'].run=lambda *tasks:asyncio.run(main(*tasks))
    time.ticks_ms=lambda:0;time.ticks_diff=lambda a,b:a-b
    error=None
    try:exec(source,{})
    except RuntimeError as e:error=e
    return seen,stopped,error
`;
function run(body){const r=spawnSync('python',['-X','utf8','-c',harness+body],{input:JSON.stringify(armProgram()),encoding:'utf8',timeout:15000});assert.equal(r.status,0,r.stderr);}
test('consecutive saved arm My Blocks await both targets for scalar and one-item-tuple completion',()=>{
 run(String.raw`
for status in [0,(0,)]:
    seen,stopped,error=execute(status)
    assert error is None,(status,error)
    assert seen==[(4,270,105),(4,0,105)],seen
    assert stopped==list(range(6)),stopped
`);
});
test('failed or malformed absolute completion aborts the chain and preserves final motor cleanup',()=>{
 run(String.raw`
for status in [1,2,3,(1,),(2,),(3,),(),(0,0),((0,),),None]:
    seen,stopped,error=execute(status)
    assert error is not None,status
    assert 'Absolute motor movement did not complete' in str(error),error
    assert seen==[(4,270,105)],(status,seen)
    assert stopped==list(range(6)),stopped
`);
});
