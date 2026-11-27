import {SHARED_TYPES,setupSharedGroups,sharedGroupToolbox,ordinaryVariables} from './shared-groups.js?v=0.11.6';
import {EXTRA_TYPES,setupEnhancements,extraPalette} from './enhancements.js?v=0.11.6-fixed-loops1';
// EV3 Block Lab v0.22 classroom organization, adapted to SPIKE hardware.
const ports=['A','B','C','D','E','F'];
const field=(name,options)=>({type:'field_dropdown',name,options});
const port=(name='PORT',first='A')=>field(name,[first,...ports.filter(p=>p!==first)].map(p=>[p,p]));
const pairs=ports.flatMap(left=>ports.filter(right=>right>left).map(right=>[left+' + '+right,left+','+right]));
const pairPort=()=>field('PORTS',[pairs.find(p=>p[1]==='B,C'),...pairs.filter(p=>p[1]!=='B,C')]);
const value=(name,check='Number')=>({type:'input_value',name,...(check?{check}:{})});
const textField=(name,text)=>({type:'field_input',name,text});
const stmt={previousStatement:null,nextStatement:null,inputsInline:true};
const motion='#ff4ccd',motor='#0090f5',sensor='#34ccf1',control='#f5a400',operator='#00b84a';
const definitions=[];
function define(type,message0,args0,properties={}){definitions.push({type,message0,...(args0.length?{args0}:{}),...properties});}
const comparison=()=>field('OP',[['＜','LT'],['＝','EQ'],['＞','GT'],['≦','LTE'],['≧','GTE'],['≠','NEQ']]);
// Empty kind keeps previously saved L/M-common blocks readable.
for(const kind of ['', 'l', 'm'])for(const paired of [false,true])for(const action of ['run','angle','rotation','time']) {
  const amount={angle:'DEGREES',rotation:'ROTATIONS',time:'SECONDS'}[action];
  const suffix={run:'を速さ %2 ％で回し続ける',angle:'速さ %2 ％で %3 度回す',rotation:'速さ %2 ％で %3 回転する',time:'速さ %2 ％で %3 秒動かす'}[action];
  define('lab_motor_'+(kind?kind+'_':'')+(paired?'pair':'single')+'_'+action,(kind?kind.toUpperCase():'')+'モーター'+(paired?'2個':'1個')+' %1 '+suffix,[paired?pairPort():port(kind?'PORTS':'PORT',kind==='l'?'B':'A'),value('SPEED'),...(amount?[value(amount)]:[])],{...stmt,colour:motor,tooltip:'SPIKEのL/Mモーター共通。速さは−100〜100％へ自動制限（150→100、−150→−100）。負は逆回転。2個指定は各軸を同じ向きに回します。車体の移動には「動き」を使います。'});
}

define('lab_motor_sync_setup','同期するモーターを %1 %2 と %3 %4 にする',[port('FIRST','A'),field('FIRST_DIRECTION',[['正方向','1'],['逆方向','-1']]),port('SECOND','B'),field('SECOND_DIRECTION',[['正方向','1'],['逆方向','-1']])],{...stmt,colour:motor,tooltip:'異なる2ポートと各軸の正方向を設定。設定時に以前と新しい対象を停止します。動きの左右設定とは別です。歯車・取り付け方向に合わせて選びます。同期は軸の回転量を1対1で揃える補正で、異なるギア比は対象外。'});
for(const action of ['run','angle','rotation','time'])define('lab_motor_sync_'+action,'同期モーターを速さ %1 ％で '+({run:'回し続ける',angle:'%2 度回す',rotation:'%2 回転する',time:'%2 秒動かす'}[action]),[value('SPEED'),...(action==='run'?[]:[value({angle:'DEGREES',rotation:'ROTATIONS',time:'SECONDS'}[action])])],{...stmt,colour:motor,tooltip:'同期するモーターの設定を先に実行。負の速さでは2軸とも設定方向の逆へ回ります。速さは−100〜100％へ自動制限。軸の回転量に弱い同期補正を常時適用します。連続以外は加減速設定を使います。'});
define('lab_motor_sync_stop','同期モーターを %1 で停止',[field('MODE',[['ブレーキ','BRAKE'],['惰性','COAST'],['保持','HOLD']])],{...stmt,colour:motor,tooltip:'同期設定した2軸を停止して次へ進みます。ほかのモーターは停止しません。'});
define('lab_motor_single_stop','モーター %1 を %2 で停止',[port(),field('MODE',[['ブレーキ','BRAKE'],['惰性','COAST'],['保持','HOLD']])],{...stmt,colour:motor});

define('lab_motors_stop','すべてのモーターを停止',[],{...stmt,colour:motor,tooltip:'A〜Fのモーターをブレーキ停止します。音・表示・プログラムは止めず、次の命令へ進みます。'});
define('lab_motor_group_stop','モーター %1 を %2 で停止',[field('PORTS',[...ports.map(p=>[p,p]),...pairs,['すべて','ALL']]),field('MODE',[['ブレーキ','BRAKE'],['惰性','COAST'],['保持','HOLD']])],{...stmt,colour:motor});
define('lab_motor_absolute','モーター %1 速さ %2 ％で 絶対角度 %3 度へ %4 で動かす',[port(),value('SPEED'),value('POSITION'),field('DIRECTION',[['最短','SHORTEST_PATH'],['時計回り','CLOCKWISE'],['反時計回り','COUNTERCLOCKWISE']])],{...stmt,colour:motor,tooltip:'SPIKE固有。モーターの目印を0度とする0〜360度（360度は0度として扱います）の整数位置へ動かし、完了を待ちます。速さは正の値を指定し、100％超は100％へ自動制限。0以下は不可。方向は選択欄で指定。共通の加減速・同期補正は適用せず、本体標準の加減速で動作します。L/M共通です。'});
define('lab_movement_stop','停止',[],{...stmt,colour:motion,tooltip:'動きに使うモーターで設定した左右2個だけをブレーキ停止し、次の命令へ進みます。ほかのモーターやプログラムは止めません。左右設定を先に実行してください。タイヤ直径・トレッドは不要です。'});
define('lab_gyro_drive','ジャイロで 速さ %1 ％で %2 cm 直進',[value('SPEED'),value('CM')],{...stmt,colour:motion,tooltip:'開始時の向きをジャイロで保ち、左右エンコーダの平均で距離を判断。共通左右モーター・タイヤ直径・加減速設定を使用。負の速さで後退。速さは−100〜100％へ制限（0不可）。同期補正はこの動作中のみ適用しません。本体を水平固定し実機で確認してください。'});
define('lab_gyro_turn','ジャイロで %1 %2 に %3 度 速さ %4 ％',[field('KIND',[['ピボットターン','pivot'],['スピンターン','spin']]),field('DIRECTION',[['右','1'],['左','-1']]),value('ANGLE'),value('SPEED')],{...stmt,colour:motion,tooltip:'開始時の向きから内蔵ジャイロで旋回角度を測り、減速してブレーキ停止。共通の左右設定を使用。速さは正の値（100％超は100％）、角度0〜3600度。本体は上面を上に水平固定。最低速度設定を使用し、共通の加減速時間・距離比率と同期補正は適用しません。実機で精度の確認が必要です。'});
define('lab_tread','トレッド（タイヤ中心どうしの間隔）を %1 mm にする',[{type:'field_number',name:'TREAD',value:112,min:10,max:1000}],{...stmt,colour:motion,tooltip:'左右のタイヤの中心間を測ります。スピンターンとピボットターンの角度計算に使います。'});
for(const [direction,label] of [['forward','前に進む'],['backward','後ろに下がる']])
  define('lab_drive_'+direction,'速さ %1 ％で %2 cm '+label,[value('SPEED'),value('CM')],{...stmt,colour:motion,tooltip:'入力・計算後の速さを−100〜100％へ自動制限（0を除く）。距離は正の値。負の速さで表示と逆向きに進みます。左右のモーターとタイヤ直径を先に設定します。'});
for(const kind of ['spin','pivot'])for(const [direction,label] of [['right','右'],['left','左']])
  define('lab_'+kind+'_'+direction,'速さ %1 ％で '+label+'に %2 度'+(kind==='spin'?'スピンターン':'ピボットターン'),[value('SPEED'),value('ANGLE')],{...stmt,colour:motion,tooltip:kind==='spin'?'左右の車輪を逆方向に回してその場で旋回。車体の角度を指定します。入力・計算後の速さを−100〜100％へ自動制限（0を除く）。負の速さで各車輪が逆回転します。タイヤ直径とトレッドを先に設定します。':'内側の車輪を止め、外側だけを回して旋回。車体の角度を指定します。入力・計算後の速さを−100〜100％へ自動制限（0を除く）。負の速さで各車輪が逆回転します。タイヤ直径とトレッドを先に設定します。'});
for(const action of ['run','angle','time']) {
  const amount=action==='angle'?'DEGREES':'SECONDS';
  define('lab_steering_'+action,'ステアリング %1 速さ %2 ％で '+({run:'回し続ける',angle:'外側を %3 度回す',time:'%3 秒走る'}[action]),[value('TURN'),value('SPEED'),...(action==='run'?[]:[value(amount)])],{...stmt,colour:motion,tooltip:'発展用。ステアリング−100〜100。0は直進。これは車体の旋回角度ではありません。角度指定は外側のモーター軸の角度です。'});
  define('lab_tank_'+action,'左の速さ %1 ％ 右の速さ %2 ％で'+({run:'回し続ける',angle:'速い側を %3 度回す',time:' %3 秒走る'}[action]),[value('LEFT_SPEED'),value('RIGHT_SPEED'),...(action==='run'?[]:[value(amount)])],{...stmt,colour:motion});
}
for(const [type,label] of [['distance','距離センサ %1 の距離が %2 %3 cm'],['reflection','カラーセンサ %1 の反射光が %2 %3 ％'],['force','フォースセンサ %1 の力が %2 %3 N']])
  define('lab_'+type+'_compare',label,[port(),comparison(),value('VALUE')],{output:'Boolean',inputsInline:true,colour:sensor,...(type==='distance'?{tooltip:'距離を1回読み取って比較。対象なし・測定範囲外は、＜・≦・＝を偽、＞・≧・≠を真として扱います。実際に測れたかは「測れている」で確認します。未接続の機器はエラーになります。'}:{})});
define('lab_display_clear','本体の表示を消す',[],{...stmt,colour:'#9966ff'});
define('lab_display_number','本体に数値 %1 を表示',[value('VALUE')],{...stmt,colour:'#9966ff',tooltip:'SPIKE本体の5×5ライトに英数字として流して表示します。'});
define('lab_light_off','本体のランプを消す',[],{...stmt,colour:'#9966ff'});
define('lab_tone_ms','音 %1 Hz を %2 ミリ秒 鳴らす 音量 %3',[value('FREQUENCY'),value('MS'),value('VOLUME')],{...stmt,colour:'#a570b3'});
define('lab_when_changed','%1 が変わったとき',[value('VALUE',null)],{nextStatement:null,colour:'#d3a238'});
define('lab_message_wait','メッセージ %1 を送って待つ',[textField('MESSAGE','合図')],{...stmt,colour:'#d3a238'});
define('lab_return','このマイブロックを終了する',[],{previousStatement:null,colour:control});
define('lab_pid','PID %1 目標値 %2 測定値 %3',[textField('NAME','PID1'),value('TARGET'),value('MEASURED')],{message1:'P %1 I %2 D %3 の出力',args1:[value('KP'),value('KI'),value('KD')],output:'Number',inputsInline:true,colour:operator});
define('lab_pid_reset','PID %1 をリセットする',[textField('NAME','PID1')],{...stmt,colour:control});
define('lab_text_get','文字 %1',[textField('NAME','文字1')],{output:'String',colour:operator});
define('lab_text_set','文字 %1 を %2 にする',[textField('NAME','文字1'),value('VALUE',null)],{...stmt,colour:'#ff8c1a'});
for(const [action,label] of [['clear','を空にする'],['add','に %2 を追加する'],['set','の %2 番目を %3 にする'],['delete','の %2 番目を削除する'],['item','の %2 番目'],['length','の長さ'],['contains','に %2 が含まれる'],['stat','の %2']]) {
  const indexed=['set','delete','item'].includes(action),valued=['add','set','contains'].includes(action);
  define('lab_list_'+action,'リスト %1 '+label,[textField('NAME','リスト1'),...(indexed?[value('INDEX')]:[]),...(valued?[value('VALUE')]:[]),...(action==='stat'?[field('OP',[['合計','sum'],['平均','average'],['最小','min'],['最大','max']])]:[])],['item','length','contains','stat'].includes(action)?{output:action==='contains'?'Boolean':'Number',inputsInline:true,colour:operator}:{...stmt,colour:'#ff8c1a'});
}
define('lab_log_start','記録 %1 を始める',[textField('NAME','Record1')],{...stmt,colour:'#c58245',tooltip:'メモリに記録を始めます（最大1000行・32KiB）。モーター停止後に「記録を終える」でCSVへ保存。電源断では未保存分を失います。'});
define('lab_log_value','項目 %1 の値 %2 を記録する',[textField('LABEL','値1'),value('VALUE',null)],{...stmt,colour:'#c58245'});
define('lab_log_end','記録を終える',[],{...stmt,colour:'#c58245',tooltip:'モーターを停止してから使います。メモリの記録を本体のCSVへ保存します。保存完了前に電源を切らないでください。'});
export const COMMON_TYPES=[...definitions.map(d=>d.type),'lab_argument',...EXTRA_TYPES,...SHARED_TYPES];
export function setupCommon(Blockly) {
  Blockly.defineBlocksWithJsonArray(definitions);
  // Motor groups are unordered sets. Accept reversed ports from saved projects
  // before dropdown validation, without touching ordered movement wiring.
  for(const def of definitions.filter(d=>d.args0?.some(a=>a.name==='PORTS'&&a.options?.some(o=>o[1].includes(','))))){
    const init=Blockly.Blocks[def.type].init;
    Blockly.Blocks[def.type].init=function(){
      init.call(this);const field=this.getField('PORTS'),validate=field.doClassValidation_;
      field.doClassValidation_=function(value){
        if(typeof value==='string'&&/^[A-F],[A-F]$/.test(value))value=value.split(',').sort().join(',');
        return validate.call(this,value);
      };
    };
  }

  Blockly.Blocks.lab_argument={init(){this.parameterId='';this.appendDummyInput().appendField(new Blockly.FieldLabelSerializable('引数'),'ARG_NAME');this.setOutput(true,'Number');this.setColour('#d32f2f');this.setTooltip('同じ引数名を定義したマイブロックの中で使えます。値は呼び出しごとに別々です。');},saveExtraState(){return {parameterId:this.parameterId,name:this.getFieldValue('ARG_NAME')};},loadExtraState(state){this.parameterId=String(state.parameterId??'');this.setFieldValue(String(state.name??'引数'),'ARG_NAME');}};
  setupEnhancements(Blockly);setupSharedGroups(Blockly);
  // Standard operators use the same green as EV3 Block Lab.
  for(const type of ['math_number','math_arithmetic','logic_compare','logic_operation','logic_negate','logic_boolean','math_single','math_trig','math_round','math_modulo','math_random_int','math_constrain','text','text_join','text_length','text_isEmpty','text_charAt','text_indexOf','math_minmax']) {
    if(!Blockly.Blocks[type])continue;
    const original=Blockly.Blocks[type]._commonInit??Blockly.Blocks[type].init;Blockly.Blocks[type]._commonInit=original;
    Blockly.Blocks[type].init=function(){original.call(this);this.setColour(operator);};
  }
  for(const type of ['variables_get','variables_set','math_change']){
    const base=Blockly.Blocks[type],init=base._sharedVariableInit??base.init;base._sharedVariableInit=init;
    base.init=function(){init.call(this);const field=this.getField('VAR'),original=field.getOptions.bind(field);field.getOptions=function(cache){const ws=this.getSourceBlock().workspace.targetWorkspace??this.getSourceBlock().workspace,allowed=new Set(ordinaryVariables(ws).map(m=>m.getId()));return original(cache).filter(option=>!ws.getVariableMap().getVariableById(option[1])||allowed.has(option[1])||option[1]===this.getValue());};};
  }
  // Blockly built-ins otherwise retain their default category colours.
  // Apply the EV3 palette after every definition, including restored blocks.
  const recolour=(types,colour)=>{for(const type of types){
    const definition=Blockly.Blocks[type];if(!definition)continue;
    const original=definition._ev3ColourInit??definition.init;definition._ev3ColourInit=original;
    definition.init=function(){original.call(this);this.setColour(colour);};
  }};
  recolour(['spike_start','lab_when','lab_when_changed','lab_message_hat','lab_broadcast','lab_message_wait'],'#d3a238');
  recolour(['lab_wait','lab_wait_until','lab_forever','lab_end','lab_return','lab_pid_reset','controls_if','controls_repeat_ext','controls_whileUntil'],control);
  recolour(['lab_distance','lab_distance_valid','lab_color','lab_color_is','lab_reflection','lab_force','lab_pressed','lab_angle','lab_encoder','lab_encoder_reset','lab_button','lab_timer','lab_timer_reset','lab_yaw_reset','lab_angular_velocity','lab_acceleration','lab_gyro_initialize','lab_distance_compare','lab_reflection_compare','lab_force_compare'],sensor);
  recolour(['lab_text','lab_pixel','spike_image','lab_light','lab_light_off','lab_distance_lights','lab_display_clear','lab_display_number'],'#9966ff');
  recolour(['text','text_join','text_length','text_isEmpty','text_print','text_charAt','text_indexOf','lab_text_get','lab_text_set',...COMMON_TYPES.filter(type=>type.startsWith('lab_list_')),'lists_create_with','lists_length','lists_isEmpty','lists_getIndex','lists_setIndex','lists_indexOf','math_modulo','math_random_int','math_round','math_constrain'],'#00b85b');
  recolour(['lab_text_get','lab_text_set',...COMMON_TYPES.filter(type=>type.startsWith('lab_list_'))],'#ff8c1a');
  recolour(['variables_get','variables_set','math_change'],'#ff8c1a');
  recolour(['procedures_defnoreturn','procedures_callnoreturn','procedures_defreturn','procedures_callreturn','lab_call_outputs','lab_return_values','lab_return_value','lab_argument'],'#d32f2f');
  recolour(['lab_pid'],'#00b85d');
  recolour(['lab_pid_reset'],'#d19636');
}
export function syncArgumentColours(workspace) {
  for(const block of workspace.getAllBlocks(false))if(block.type==='variables_get'){
    const root=block.getRootBlock(),model=block.getField('VAR')?.getVariable();
    const argument=['procedures_defnoreturn','procedures_defreturn'].includes(root.type)&&root.getVarModels().some(parameter=>parameter.getId()===model?.getId());
    const colour=argument?'#d32f2f':'#ff8c1a';if(block.getColour()!==colour)block.setColour(colour);
  }
}
const shadow=n=>({shadow:{type:'math_number',fields:{NUM:n}}});
const textShadow=t=>({shadow:{type:'text',fields:{TEXT:t}}});
const block=(type,values={},fields={})=>({kind:'block',type,fields,inputs:Object.fromEntries(Object.entries(values).map(([name,n])=>[name,typeof n==='number'?shadow(n):textShadow(n)]))});
const label=text=>({kind:'label',text});
const category=(name,colour,contents)=>({kind:'category',name,colour,contents});
export function commonToolbox() {
  const motors=[label('加速・減速（モーター・動き共通）'),block('lab_ramp',{UP:.5,DOWN:.5},{PROFILE:'trapezoid'}),block('lab_ramp_distance',{UP:10,DOWN:10},{PROFILE:'trapezoid'})];
  motors.push(label('モーター1個（L・M共通）'));
  for(const action of ['run','angle','rotation','time'])motors.push(block('lab_motor_single_'+action,{SPEED:20,...(action==='run'?{}:{[{angle:'DEGREES',rotation:'ROTATIONS',time:'SECONDS'}[action]]:action==='angle'?90:1})}));
  motors.push(label('2個を同期（ポートと方向を先に設定）'),block('lab_motor_sync_setup'));
  for(const action of ['run','angle','rotation','time'])motors.push(block('lab_motor_sync_'+action,{SPEED:20,...(action==='run'?{}:{[{angle:'DEGREES',rotation:'ROTATIONS',time:'SECONDS'}[action]]:action==='angle'?90:1})}));
  motors.push(block('lab_motor_sync_stop'));
  const motorExtras=extraPalette('motor');
  motors.push(label('速度・パワー・停止方法'),...['lab_motor_change_speed','lab_motor_power','lab_motor_stop_mode'].map(type=>motorExtras.find(item=>item.type===type)),label('モーターを停止'),block('lab_motor_single_stop'),block('lab_motors_stop'),label('SPIKE固有：絶対角度'),block('lab_motor_absolute',{SPEED:20,POSITION:0}),label('加減速の最低速度（モーター・動き共通）'),block('lab_minimum_speed',{SPEED:8}));
  const advanced=['run','angle','time'].map(action=>block('lab_steering_'+action,{TURN:25,SPEED:20,...(action==='run'?{}:{[action==='angle'?'DEGREES':'SECONDS']:action==='angle'?360:2})}));
  return sharedGroupToolbox({kind:'categoryToolbox',contents:[
    category('スタート','#d3a238',[block('spike_start')]),
    category('イベント','#d3a238',[label('センサー・比較を条件の欄に入れます'),block('lab_when'),block('lab_when_changed',{VALUE:0}),label('同じ名前のメッセージで連携します'),block('lab_message_hat'),block('lab_broadcast'),block('lab_message_wait')]),
    category('モーター',motor,motors),
    category('動き',motion,[block('lab_pair'),block('lab_geometry'),block('lab_tread'),label('加速・減速（モーター・動き共通）'),block('lab_ramp',{UP:.5,DOWN:.5},{PROFILE:'trapezoid'}),block('lab_ramp_distance',{UP:10,DOWN:10},{PROFILE:'trapezoid'}),...advanced,...['angle','time'].map(action=>block('lab_tank_'+action,{LEFT_SPEED:30,RIGHT_SPEED:15,[action==='angle'?'DEGREES':'SECONDS']:action==='angle'?360:1})),{...block('lab_tank_run',{LEFT_SPEED:20,RIGHT_SPEED:20}),gap:40},{...label('旋回前にタイヤ直径・トレッドを設定'),gap:16},...['spin','pivot'].flatMap(kind=>['right','left'].map(direction=>block('lab_'+kind+'_'+direction,{SPEED:20,ANGLE:90}))),label('ジャイロで動く（本体を水平に固定）'),block('lab_gyro_turn',{ANGLE:90,SPEED:20}),block('lab_gyro_drive',{SPEED:20,CM:30}),block('lab_drive_forward',{SPEED:20,CM:20}),block('lab_drive_backward',{SPEED:20,CM:20}),block('lab_movement_stop')]),
    category('センサー',sensor,[label('本体のバッテリー'),block('lab_battery_voltage'),label('タイマー'),block('lab_timer'),block('lab_timer_reset'),label('モーターのエンコーダ'),block('lab_encoder'),block('lab_motor_velocity'),block('lab_encoder_reset'),label('本体のジャイロ・ボタン'),block('lab_angle'),block('lab_angular_velocity'),block('lab_acceleration'),block('lab_yaw_reset'),block('lab_gyro_initialize',{TIMEOUT:5}),block('lab_button'),label('フォースセンサー'),block('lab_pressed'),block('lab_force'),block('lab_force_compare',{VALUE:2}),label('カラーセンサー'),block('lab_color_is'),block('lab_color'),block('lab_reflection_compare',{VALUE:50}),block('lab_reflection'),label('距離センサー'),block('lab_distance_compare',{VALUE:15}),block('lab_distance'),block('lab_distance_valid')]),
    category('音','#a570b3',[block('lab_tone_ms',{FREQUENCY:440,MS:200,VOLUME:25})]),
    category('制御',control,[block('lab_wait',{SECONDS:1}),block('controls_if'),{...block('controls_if'),extraState:{hasElse:true}},block('lab_forever'),block('controls_repeat_ext',{TIMES:10}),block('controls_whileUntil',{}, {MODE:'UNTIL'}),block('controls_whileUntil',{}, {MODE:'WHILE'}),block('lab_wait_until'),block('lab_end'),block('lab_return')]),
    category('演算',operator,[block('math_number'),...extraPalette('operators'),...extraPalette('math'),block('logic_negate'),block('logic_boolean'),block('math_modulo',{DIVIDEND:1,DIVISOR:10}),block('math_random_int',{FROM:1,TO:10}),block('math_round',{NUM:1.5}),block('math_constrain',{VALUE:120,LOW:-100,HIGH:100}),label('PID制御'),block('lab_pid',{TARGET:0,MEASURED:0,KP:1,KI:0,KD:0}),block('lab_pid_reset')]),
    category('表示','#9966ff',[label('SPIKE本体：5×5ライト／英数字を表示'),block('lab_display_clear'),block('lab_text',{TEXT:'Hello'}),block('lab_display_number',{VALUE:12.5}),block('lab_display_abacus',{VALUE:7800}),block('lab_pixel',{X:2,Y:2,BRIGHTNESS:100}),label('本体ランプ：中央ボタンの色・点滅・明暗'),block('lab_light'),block('lab_light_off'),...extraPalette('lamp'),label('距離センサーのランプ'),block('lab_distance_lights',{BRIGHTNESS:100})]),
    category('データ','#ff8c1a',[label('文字列'),block('text'),block('lab_text_get'),block('lab_text_set',{VALUE:'Hello'}),block('text_join'),block('text_length',{VALUE:'Hello'}),block('text_isEmpty',{VALUE:'Hello'}),...extraPalette('text'),label('数値リスト（同じ名前で共有）'),...['clear','add','set','delete','item','length','contains','stat'].map(action=>block('lab_list_'+action,{...(['set','delete','item'].includes(action)?{INDEX:1}:{}),...(['add','set','contains'].includes(action)?{VALUE:0}:{})}))]),
    category('記録','#c58245',[label('本体にCSVを保存・再接続して取り出す'),block('lab_log_start'),block('lab_log_value',{VALUE:0}),block('lab_log_motion',{INTERVAL:100}),block('lab_log_end')]),
    {kind:'category',name:'変数',colour:'#ff8c1a',custom:'LAB_VARIABLES'},
    {kind:'category',name:'マイブロック',colour:'#d32f2f',custom:'PROCEDURE'},
    {kind:'category',name:'引数',colour:'#668b6d',custom:'ARGUMENTS'}
  ]});
}
export function installCommonWorkspace(workspace,Blockly) {
  workspace.registerToolboxCategoryCallback('ARGUMENTS',ws=>{
    const names=new Map();for(const def of ws.getAllBlocks(false).filter(b=>['procedures_defnoreturn','procedures_defreturn'].includes(b.type)))for(const model of def.getVarModels())if(!names.has(model.getName()))names.set(model.getName(),model);
    return [label('定義の中だけで使う引数'),...[...names.values()].map(model=>({kind:'block',type:'lab_argument',extraState:{parameterId:model.getId(),name:model.getName()}})),...(!names.size?[label('「マイブロックを作る」で引数を追加します')]:[label('同じ名前を定義したマイブロックで使えます')])];
  });
  workspace.registerToolboxCategoryCallback('LAB_VARIABLES',ws=>{
    const variables=ordinaryVariables(ws);
    return [label('プログラム全体で使う変数'),{kind:'button',text:'変数をつくる',callbackKey:'LAB_CREATE_VARIABLE'},...(variables.length?[block('variables_set',{VALUE:0},{VAR:{id:variables[0].getId()}}),block('math_change',{DELTA:1},{VAR:{id:variables[0].getId()}}),...variables.map(m=>block('variables_get',{}, {VAR:{id:m.getId()}}))]:[label('「変数をつくる」で名前を付けます')])];
  });
  workspace.registerButtonCallback('LAB_CREATE_VARIABLE',()=>Blockly.Variables.createVariableButtonHandler(workspace));
}

