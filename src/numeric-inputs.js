// Numeric literals are editable, non-draggable input shadows, as in EBL.
// Expressions and variables remain ordinary, replaceable blocks.
export function numericInputDefaults(toolbox) {
  const defaults=new Map();
  function visit(entry) {
    if(entry.type)for(const [name,input] of Object.entries(entry.inputs??{})) {
      if(input.shadow?.type==='math_number'&&!defaults.has(entry.type+':'+name))defaults.set(entry.type+':'+name,structuredClone(input.shadow));
    }
    for(const child of entry.contents??[])visit(child);
  }
  visit(toolbox);
  return defaults;
}

export function ensureNumericInputShadows(workspace,Blockly,defaults) {
  const group=Blockly.Events.getGroup();
  Blockly.Events.setGroup(group||true);
  try {
    for(const block of workspace.getAllBlocks(false))for(const input of block.inputList) {
      const connection=input.connection;
      if(!connection)continue;
      const target=connection.targetBlock();
      if(target?.type==='math_number') {
        // Preserve the value and ID when repairing an older saved project.
        if(!target.isShadow())target.setShadow(true);
        if(!connection.getShadowState(false))connection.setShadowState(Blockly.serialization.blocks.save(target));
      } else if(!connection.getShadowState(false)) {
        const argument=['procedures_callnoreturn','procedures_callreturn','lab_call_outputs'].includes(block.type)&&/^ARG\d+$/.test(input.name);
        if(connection.getCheck()?.includes('Number')||argument) {
          connection.setShadowState(structuredClone(defaults.get(block.type+':'+input.name)??{type:'math_number',fields:{NUM:0}}));
        }
      }
    }
  } finally {
    Blockly.Events.setGroup(group);
  }
}
