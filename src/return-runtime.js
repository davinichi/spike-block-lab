import {outputNames,isMyBlockDefinition} from './returns.js?v=0.9.0';
export function registerReturnGenerators({g,emit,v,stat,fail,workspace}) {
  const defFor=b=>workspace.getAllBlocks(false).find(d=>isMyBlockDefinition(d)&&d.getFieldValue('NAME')===b.getProcedureCall());
  const tuple=(b,values)=>'('+values.map(name=>`_lab_result(${v(b,name)})`).join(', ')+(values.length===1?',':'')+')';
  const checked=b=>{const def=defFor(b),names=outputNames(def);if(!names.length||JSON.stringify(b.returnNames_??['値'])!==JSON.stringify(names))fail(b,'戻り値の定義・名前を確認し、呼び出しを置き直してください。');return def;};
  const call=(b,def)=>`await ${g.getProcedureName(def.getFieldValue('NAME'))}(${def.getVarModels().map((_,i)=>v(b,'ARG'+i)).join(', ')})`;
  emit('procedures_defreturn',(b)=>{
    const args=b.getVarModels(),locals=new Set(args.map(m=>m.getId()));
    const globals=workspace.getVariableMap().getAllVariables().filter(m=>!locals.has(m.getId())).map(m=>g.getVariableName(m.getId()));
    const body=g.statementToCode(b,'STACK');
    const names=outputNames(b),result=tuple(b,names.map((_,i)=>i?'RETURN'+i:'RETURN'));
    g.definitions_['%'+g.getProcedureName(b.getFieldValue('NAME'))]=`async def ${g.getProcedureName(b.getFieldValue('NAME'))}(${args.map(m=>g.getVariableName(m.getId())).join(', ')}):\n${globals.length?'    global '+globals.join(', ')+'\n':''}${body}    return ${result}\n`;
    return null;
  });
  emit('procedures_callreturn',b=>{const def=checked(b),index=Number(b.getFieldValue('RESULT')??0);if(!Number.isInteger(index)||index<0||index>=outputNames(def).length)fail(b,'戻り値の選択を確認してください。');return [`(${call(b,def)})[${index}]`,g.ORDER_ATOMIC];});
  emit('lab_call_outputs',b=>{
    const def=checked(b),targets=outputNames(def).map((_,i)=>{const model=b.getField('OUT'+i)?.getVariable();if(!model)fail(b,'受け取る変数を選んでください。');const root=b.getRootBlock();if(isMyBlockDefinition(root)&&root.getVarModels().some(m=>m.getId()===model.getId()))fail(b,'戻り値は通常の変数に受け取ってください。引数には代入できません。');return g.getVariableName(model.getId());});
    if(new Set(targets).size!==targets.length)fail(b,'戻り値は別々の変数に受け取ってください。');
    return stat(`${targets.join(', ')}${targets.length===1?',':''} = ${call(b,def)}\n`);
  });
  emit('lab_return_value',b=>{const def=b.getRootBlock();if(outputNames(def).length!==1)fail(b,'1個の数値を返す定義の中で使ってください。');return `return ${tuple(b,['VALUE'])}\n`;});
  emit('lab_return_values',b=>{const def=b.getRootBlock();if(!outputNames(def).length||JSON.stringify(outputNames(def))!==JSON.stringify(b.returnNames_))fail(b,'返す値の名前・個数を定義とそろえてください。');return `return ${tuple(b,outputNames(def).map((_,i)=>'VALUE'+i))}\n`;});
  emit('lab_return',b=>{const def=b.getRootBlock();if(!isMyBlockDefinition(def))fail(b,'「このマイブロックを終了する」は定義の中に入れてください。');return outputNames(def).length?`return ${tuple(def,outputNames(def).map((_,i)=>i?'RETURN'+i:'RETURN'))}\n`:'return\n';});
}
export const RETURN_RUNTIME=`
def _lab_result(value):
    if isinstance(value, bool) or not isinstance(value, (int, float)) or not -3.4028234663852886e38 <= value <= 3.4028234663852886e38:
        raise ValueError('My Block must return numbers')
    return value
`;
