const clean=text=>String(text).replace(/[\r\n\t\u2028\u2029]/g,' ').trim();

export function preparePythonNames(g,workspace,definitions){
  if(!g.nameDB_)g.init(workspace);
  const Names=g.nameDB_.constructor;
  const db=new Names(g.RESERVED_WORDS_+',async,await,port,motor,motor_pair,runloop,time,math,color,color_sensor,distance_sensor,force_sensor,light_matrix,light,sound,button,motion_sensor,_LabStop');
  const argumentsSet=new Set(definitions.flatMap(b=>b.getVarModels().map(m=>m.getName())));
  const original=db.safeName;
  db.safeName=function(raw){
    if(argumentsSet.has(raw)){
      const normalized=raw.normalize('NFKC');
      if(/^[_\p{ID_Start}][_\p{ID_Continue}]*$/u.test(normalized))return normalized.startsWith('_lab_')?'arg'+normalized:normalized;
    }
    return original.call(this,raw);
  };
  g.nameDB_=db;
}

export function installPythonComments(g){
  if(!g._sblOriginalScrub)g._sblOriginalScrub=g.scrub_;
  g.scrub_=function(block,code,thisOnly){
    if(code&&block.previousConnection&&!block.outputConnection){
      code='# '+clean(block.toString(100))+'\n'+code;
    }
    return this._sblOriginalScrub(block,code,thisOnly);
  };
}
export function taskComment(hat,index){
  const label=hat.type==='spike_start'?'スタート：下につないだ命令を順番に実行します。':hat.type==='lab_message_hat'?`「${clean(hat.getFieldValue('MESSAGE'))}」の合図を受け取ったときの命令です。`:'条件が変わったときに実行する命令です。';
  return `# 処理${index+1}：${label}\n`;
}
export const myBlockComment=name=>`# マイブロック「${clean(name)}」：何度も使う命令をまとめています。\n`;
