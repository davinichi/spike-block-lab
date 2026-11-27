import {test} from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import * as Blockly from 'blockly';
import {pythonGenerator} from 'blockly/python';
import {setupClassroom} from './classroom-blocks.js';
import {generateStandard} from './standard.js';
setupClassroom(Blockly);
const n=NUM=>({shadow:{type:'math_number',fields:{NUM}}});
function source(type,speed,mode='literal'){
 const ws=new Blockly.Workspace();try{
  const block=ws.newBlock(type),state=Blockly.serialization.blocks.save(block);block.dispose();
  state.inputs??={};for(const input of ['SPEED','LEFT_SPEED','RIGHT_SPEED'])if(['SPEED', 'LEFT_SPEED','RIGHT_SPEED'].includes(input)&&((type.startsWith('lab_tank')&&input!=='SPEED')||(!type.startsWith('lab_tank')&&input==='SPEED'))){
   state.inputs[input]=mode==='literal'?n(speed):mode==='expression'?{block:{type:'math_arithmetic',fields:{OP:'ADD'},inputs:{A:n(speed/2),B:n(speed/2)}}}:{block:{type:'variables_get',fields:{VAR:{id:'speed',name:'speed'}}}};
  }
  const probe=ws.newBlock(type);for(const [key,value]of Object.entries({CM:10,ANGLE:90,DEGREES:90,ROTATIONS:1,SECONDS:1,TURN:25,POSITION:90}))if(probe.getInput(key))state.inputs[key]=n(value);probe.dispose();
  if(type==='lab_motor_power'){state.inputs.POWER=state.inputs.SPEED;delete state.inputs.SPEED;}
  let command=state;if(type==='lab_motor_change_speed'){state.fields??={};state.fields.PORT='B';command={type:'lab_motor_l_single_run',inputs:{SPEED:n(20)},next:{block:state}};}
  if(mode==='variable')command={type:'variables_set',fields:{VAR:{id:'speed',name:'speed'}},inputs:{VALUE:n(speed)},next:{block:command}};
  const project={variables:mode==='variable'?[{id:'speed',name:'speed'}]:[],blocks:{languageVersion:0,blocks:[{type:'spike_start',next:{block:{type:'lab_pair',fields:{LEFT:'B',RIGHT:'C'},next:{block:command}}}}]}};
  Blockly.serialization.workspaces.load(project,ws);const saved=Blockly.serialization.workspaces.save(ws);ws.clear();Blockly.serialization.workspaces.load(saved,ws);return generateStandard(ws,pythonGenerator).source;
 }finally{ws.dispose();}
}
const harness=String.raw`
import ast,asyncio,json,types,sys
payload=json.load(sys.stdin)
def setup(source):
    calls=[];active={}
    scope={'_lab_motion_config':{'profile':'none'},'_lab_active_motors':active,'_lab_stop_modes':{},'_lab_pair_ports':(1,2),'_lab_wheel':56,'_lab_tread':112,'_lab_timer_start':0,'_lab_log_name':'','port':types.SimpleNamespace(**{c:i for i,c in enumerate('ABCDEF')})}
    def start(ports,velocities):
        calls.append(tuple(velocities))
        for p,v in zip(ports,velocities):active[p]={'velocity':v,'bounded':False}
    async def managed(ports,velocities,*args):calls.append(tuple(velocities))
    async def absolute(p,angle,velocity,**kwargs):calls.append((velocity,));return 0
    async def tick(*args):pass
    scope.update(_lab_tick=tick,_lab_pair=lambda *a:None,_lab_set_motion_pair=lambda *a:None,_lab_require_pair=lambda:None,_lab_use_managed=lambda:True,_lab_start_velocities=start,_lab_managed_move=managed,_lab_motion_ports=lambda:(1,2))
    scope['motor']=types.SimpleNamespace(READY=0,BRAKE=1,SHORTEST_PATH=10,CLOCKWISE=11,COUNTERCLOCKWISE=12,run_to_absolute_position=absolute,set_duty_cycle=lambda p,v:calls.append((v/10000*1050,)))
    scope['math']=__import__('math')
    wanted={'_lab_speed_percent','_lab_speed','_lab_range','_lab_positive','_lab_number','_lab_binary','_lab_profile_speed','_lab_steering_velocities','_lab_task_0','_lab_motor_group','_lab_motor_group_run','_lab_drive','_lab_turn','_lab_tank_run','_lab_tank_angle','_lab_tank_time','_lab_steering_run','_lab_steering_angle','_lab_steering_time','_lab_change_speed','_lab_power','_lab_motor_absolute'}
    tree=ast.parse(source);exec(compile(ast.Module(body=[n for n in tree.body if isinstance(n,(ast.FunctionDef,ast.AsyncFunctionDef)) and n.name in wanted],type_ignores=[]),'generated','exec'),scope)
    return scope,calls,active
`;
function py(code,input){const r=spawnSync('python',['-X','utf8','-c',code],{input:JSON.stringify(input),encoding:'utf8',timeout:30000});assert.equal(r.status,0,r.stderr);}
test('generated speed conversion clamps finite values, preserves fractional signs and rejects non-finite values',()=>{
 py(harness+String.raw`
s,calls,active=setup(payload)
for x,y in [(-1e300,-100),(-150,-100),(-100,-100),(-.5,-.5),(0,0),(.5,.5),(100,100),(150,100),(1e300,100)]:
    assert s['_lab_speed_percent'](x)==y,(x,y)
    assert s['_lab_speed'](x)==int(y*10.5)
for x in [None,'150',float('nan'),float('inf'),-float('inf')]:
    try:s['_lab_speed'](x);raise AssertionError(x)
    except ValueError:pass
for profile in ['none','s']:
    s['_lab_motion_config']['profile']=profile
    assert s['_lab_profile_speed'](150)==1050
    assert s['_lab_profile_speed'](-150)==-1050
    assert s['_lab_steering_velocities'](150,25,True)==(-525,1050)
    assert s['_lab_steering_velocities'](-150,25,True)==(525,-1050)
`,source('lab_motor_l_single_run',20));
});
test('saved literal, calculated and variable speeds saturate across motor and movement command paths',()=>{
 const types=[...['l','m'].flatMap(k=>['single','pair'].flatMap(p=>['run','angle','rotation','time'].map(a=>`lab_motor_${k}_${p}_${a}`))),'lab_drive_forward','lab_drive_backward','lab_spin_right','lab_spin_left','lab_pivot_right','lab_pivot_left',...['steering','tank'].flatMap(k=>['run','angle','time'].map(a=>`lab_${k}_${a}`)),'lab_motor_change_speed','lab_motor_power','lab_motor_absolute'];
 const cases=[];for(const type of types)for(const mode of ['literal','expression','variable'])for(const speed of [150,-150]){if(type==='lab_motor_absolute'&&speed<0)continue;cases.push({type,mode,speed,source:source(type,speed,mode)});}
 py(harness+String.raw`
for case in payload:
    s,calls,active=setup(case['source']);asyncio.run(s['_lab_task_0']())
    if case['type']=='lab_motor_change_speed':
        assert any(v['velocity']==(1050 if case['speed']>0 else -1050) for v in active.values()),case
    else:
        assert calls,case
        assert max(abs(v) for v in calls[-1])==1050,(case['type'],case['mode'],case['speed'],calls)
        assert all(abs(v)<=1050 for row in calls for v in row),case
`,cases);
});
