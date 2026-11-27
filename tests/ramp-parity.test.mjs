import {test} from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {EXTRA_RUNTIME} from './enhancements.js';
function python(script){const r=spawnSync(process.platform==='win32'?'python':'python3',['-'],{input:script,encoding:'utf8',env:{...process.env,PYTHONUTF8:'1'}});assert.equal(r.status,0,r.stderr||String(r.error));}
const runtime=EXTRA_RUNTIME.replace('_lab_native_drive = _lab_drive','_lab_native_drive = None').replace('_lab_native_turn = _lab_turn','_lab_native_turn = None').replace('_lab_native_pair = _lab_pair','_lab_native_pair = None');

test('ramp bounds, Q1000 curves, compressed timed peaks and continuous commands follow EBL rules',()=>{
 python(`import math,types
${runtime}
def _lab_range(x,a,b):
    if not isinstance(x,(int,float)) or not a<=x<=b:raise ValueError()
    return x
def _lab_speed_percent(x):return _lab_range(x,-100,100)
def _lab_speed(x):return int(_lab_speed_percent(x)*10.5)
assert [_lab_ramp_curve(t,1000,'s') for t in [0,250,500,750,1000]]==[0,156,500,843,1000]
assert _lab_ramp_timing(40,500,1000,1000)==(10,250,250)
assert _lab_ramp_timing(40,500,1000,500)==(13,333,167)
assert _lab_ramp_timing(40,3000,1000,1000)==(40,1000,1000)
_lab_set_ramp('s',1,1)
assert _lab_profile_speed(1.9)==10
assert _lab_profile_speed(-1.9)==-10
_lab_set_ramp('none',1,1)
assert _lab_profile_speed(1.9)==19
for profile,up,down in [('s',-1,1),('s',1,10.01),('other',1,1)]:
    try:_lab_set_ramp(profile,up,down);raise AssertionError()
    except ValueError:pass
calls=[];time=types.SimpleNamespace(ticks_ms=lambda:0)
motor=types.SimpleNamespace(run=lambda p,v:calls.append((p,v)),relative_position=lambda p:0)
_lab_set_ramp('s',1,1);_lab_start_velocities([0],[210])
assert calls==[(0,210)],calls
_lab_active_motors.clear()
`,null);
});
