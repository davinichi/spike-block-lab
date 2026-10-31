// Same form, argument rows, editing entries and connection preservation as EV3 Lab.
export function configureMyBlockBlocks(Blockly,openDialog) {
  const call=Blockly.Blocks.procedures_callnoreturn;
  const callInit=call._formInit??call.init;call._formInit=callInit;
  call.init=function(){callInit.call(this);this.setInputsInline(true);};
  const definition=Blockly.Blocks.procedures_defnoreturn;
  const original=definition._formInit??definition.init;definition._formInit=original;
  definition.init=function(){
    original.call(this);this.setMutator(null);
    const menu=this.customContextMenu;
    this.customContextMenu=function(options){menu?.call(this,options);options.unshift({text:'名前・引数を編集',enabled:true,callback:()=>openDialog(this.id)});};
  };
}
export function installMyBlockFlyout(workspace,openDialog) {
  workspace.registerButtonCallback('LAB_CREATE_MYBLOCK',()=>openDialog());
  workspace.registerToolboxCategoryCallback('PROCEDURE',ws=>{
    const items=[{kind:'button',text:'マイブロックを作る',callbackKey:'LAB_CREATE_MYBLOCK'}];
    for(const def of ws.getAllBlocks(false).filter(b=>b.type==='procedures_defnoreturn')){
      const name=def.getFieldValue('NAME'),models=def.getVarModels(),key='LAB_EDIT_'+def.id;
      workspace.registerButtonCallback(key,()=>openDialog(def.id));
      items.push({kind:'block',type:'procedures_callnoreturn',extraState:{name,params:models.map(m=>m.getName())},inputs:Object.fromEntries(models.map((m,i)=>['ARG'+i,{shadow:{type:'math_number',fields:{NUM:0}}}]))},{kind:'button',text:'「'+name+'」を編集',callbackKey:key});
    }
    return items;
  });
}
export function saveMyBlock(Blockly,ws,name,rows,definitionId=null) {
  name=String(name).trim();rows=rows.map(row=>({name:String(row.name).trim(),id:row.id||''}));
  const defs=ws.getAllBlocks(false).filter(b=>b.type==='procedures_defnoreturn');
  const def=definitionId?ws.getBlockById(definitionId):null;
  if(definitionId&&(!def||def.type!=='procedures_defnoreturn'))throw Error('編集する定義が見つかりません。');
  if(!name||name.length>60)throw Error('マイブロックの名前を1〜60文字で入力してください。');
  if(defs.some(b=>b!==def&&b.getFieldValue('NAME').toLowerCase()===name.toLowerCase()))throw Error('同じ名前のマイブロックがあります。');
  if(!def&&defs.length>=32)throw Error('マイブロックは32個までです。');
  if(rows.length>8||rows.some(r=>!r.name||r.name.length>40))throw Error('引数は8個まで、名前は1〜40文字で入力してください。');
  if(new Set(rows.map(r=>r.name.toLowerCase())).size!==rows.length)throw Error('引数には別々の名前を付けてください。');
  const oldModels=def?.getVarModels()??[],oldIds=oldModels.map(m=>m.getId());
  if(rows.some(r=>r.id&&!oldIds.includes(r.id))||new Set(rows.filter(r=>r.id).map(r=>r.id)).size!==rows.filter(r=>r.id).length)throw Error('引数の編集情報を確認してください。');
  const body=def?.getDescendants(false)??[];
  const bodyIds=new Map(body.map(b=>{
    if(b.type!=='lab_argument')return [b.id,b.getFieldValue('VAR')];
    const parameter=oldModels.find(m=>m.getId()===b.parameterId)??oldModels.find(m=>m.getName()===b.getFieldValue('ARG_NAME'));
    return [b.id,parameter?.getId()??b.parameterId];
  }));
  for(const block of body){const id=bodyIds.get(block.id);if(oldIds.includes(id)&&!rows.some(r=>r.id===id))throw Error('使っている引数は削除できません。定義の中の引数ブロックを先に外してください。');}
  const backup=Blockly.serialization.workspaces.save(ws),oldName=def?.getFieldValue('NAME');
  const calls=def?Blockly.Procedures.getCallers(oldName,ws).map(call=>({call,args:oldIds.map((id,i)=>({id,block:call.getInputTargetBlock('ARG'+i)}))})):[];
  const previousGroup=Blockly.Events.getGroup();Blockly.Events.setGroup(previousGroup||true);
  try{
    for(const {args} of calls)for(const argument of args)if(argument.block){argument.state=Blockly.serialization.blocks.save(argument.block);argument.block.unplug();}
    const models=rows.map(row=>ws.getVariableMap().getVariable(row.name,'')??ws.getVariableMap().createVariable(row.name));
    const target=def??ws.newBlock('procedures_defnoreturn');
    target.setFieldValue(name,'NAME');target.loadExtraState({params:models.map(m=>({name:m.getName(),id:m.getId()}))});
    for(const block of body){const i=rows.findIndex(row=>row.id===bodyIds.get(block.id));if(i<0)continue;
      if(block.type==='lab_argument'){block.parameterId=models[i].getId();block.setFieldValue(rows[i].name,'ARG_NAME');}
      else if(['variables_get','variables_set','math_change'].includes(block.type))block.setFieldValue(models[i].getId(),'VAR');
    }
    for(const {call,args} of calls){
      call.renameProcedure(call.getProcedureCall(),name);call.loadExtraState({name,params:rows.map(row=>row.name)});
      rows.forEach((row,i)=>{
        const previous=args.find(argument=>argument.id===row.id),connection=call.getInput('ARG'+i).connection;
        if(previous?.state){let child=ws.getBlockById(previous.state.id);if(!child)child=Blockly.serialization.blocks.append(previous.state,ws);connection.connect(child.outputConnection);}
        else connection.setShadowState({type:'math_number',fields:{NUM:0}});
      });
    }
    target.initSvg?.();target.render?.();
    if(!def){const bottom=Math.max(20,...ws.getTopBlocks(false).filter(b=>b!==target).map(b=>b.getRelativeToSurfaceXY().y+(b.getHeightWidth?.().height??80)));target.moveBy(60,bottom+60);}
    return target;
  }catch(error){Blockly.serialization.workspaces.load(backup,ws);throw error;}
  finally{Blockly.Events.setGroup(previousGroup);}
}
