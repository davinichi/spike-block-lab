import {DEBUG_EDITION} from './edition.js';
// Public classroom contract shared with EBL 0.25.6 / EBL-RT editor 0.34.2-ev3rt.1.
// SPIKE motor control and buffered CSV storage remain platform-specific.
const definitions = [
  {
    "type": "lab_sound_tone",
    "message0": "音 %1 Hz を %2 ミリ秒 鳴らす 音量 %3",
    "args0": [
      {
        "type": "input_value",
        "name": "FREQUENCY",
        "check": "Number"
      },
      {
        "type": "input_value",
        "name": "MS",
        "check": "Number"
      },
      {
        "type": "field_number",
        "name": "VOLUME",
        "value": 25,
        "min": 0,
        "max": 100,
        "precision": 1
      }
    ],
    "previousStatement": null,
    "nextStatement": null,
    "inputsInline": true,
    "colour": "#a570b3"
  },
  {
    "type": "lab_data_mod",
    "message0": "%1 を %2 で割った余り",
    "args0": [
      {
        "type": "input_value",
        "name": "A",
        "check": "Number"
      },
      {
        "type": "input_value",
        "name": "B",
        "check": "Number"
      }
    ],
    "output": "Number",
    "inputsInline": true,
    "colour": "#00b85b"
  },
  {
    "type": "lab_data_random",
    "message0": "%1 から %2 までの整数乱数",
    "args0": [
      {
        "type": "input_value",
        "name": "A",
        "check": "Number"
      },
      {
        "type": "input_value",
        "name": "B",
        "check": "Number"
      }
    ],
    "output": "Number",
    "inputsInline": true,
    "colour": "#00b85b"
  },
  {
    "type": "lab_data_min",
    "message0": "%1 と %2 の小さい方",
    "args0": [
      {
        "type": "input_value",
        "name": "A",
        "check": "Number"
      },
      {
        "type": "input_value",
        "name": "B",
        "check": "Number"
      }
    ],
    "output": "Number",
    "inputsInline": true,
    "colour": "#00b85b"
  },
  {
    "type": "lab_data_max",
    "message0": "%1 と %2 の大きい方",
    "args0": [
      {
        "type": "input_value",
        "name": "A",
        "check": "Number"
      },
      {
        "type": "input_value",
        "name": "B",
        "check": "Number"
      }
    ],
    "output": "Number",
    "inputsInline": true,
    "colour": "#00b85b"
  },
  {
    "type": "lab_data_round",
    "message0": "%1 を四捨五入",
    "args0": [
      {
        "type": "input_value",
        "name": "A",
        "check": "Number"
      }
    ],
    "output": "Number",
    "colour": "#00b85b",
    "tooltip": "0.5を足して切り下げます。1.5→2、−1.5→−1。"
  },
  {
    "type": "lab_data_clamp",
    "message0": "%1 を %2 から %3 の範囲に収める",
    "args0": [
      {
        "type": "input_value",
        "name": "A",
        "check": "Number"
      },
      {
        "type": "input_value",
        "name": "LOW",
        "check": "Number"
      },
      {
        "type": "input_value",
        "name": "HIGH",
        "check": "Number"
      }
    ],
    "output": "Number",
    "inputsInline": true,
    "colour": "#00b85b"
  },
  {
    "type": "lab_string_literal",
    "message0": "文字列 %1",
    "args0": [
      {
        "type": "field_input",
        "name": "TEXT",
        "text": "こんにちは"
      }
    ],
    "output": "String",
    "colour": "#00b85b",
    "tooltip": "UTF-8で120バイト以内。日本語は通常40文字以内。"
  },
  {
    "type": "lab_string_join",
    "message0": "%1 と %2 をつなぐ",
    "args0": [
      {
        "type": "input_value",
        "name": "A",
        "check": "String"
      },
      {
        "type": "input_value",
        "name": "B",
        "check": "String"
      }
    ],
    "output": "String",
    "inputsInline": true,
    "colour": "#00b85b"
  },
  {
    "type": "lab_string_length",
    "message0": "%1 の文字数",
    "args0": [
      {
        "type": "input_value",
        "name": "VALUE",
        "check": "String"
      }
    ],
    "output": "Number",
    "colour": "#00b85b",
    "tooltip": "日本語も1文字として数えます。結合文字は別に数えます。"
  },
  {
    "type": "lab_string_letter",
    "message0": "%1 の %2 番目の文字",
    "args0": [
      {
        "type": "input_value",
        "name": "VALUE",
        "check": "String"
      },
      {
        "type": "input_value",
        "name": "INDEX",
        "check": "Number"
      }
    ],
    "output": "String",
    "inputsInline": true,
    "colour": "#00b85b"
  },
  {
    "type": "lab_string_includes",
    "message0": "%1 に %2 が含まれる",
    "args0": [
      {
        "type": "input_value",
        "name": "A",
        "check": "String"
      },
      {
        "type": "input_value",
        "name": "B",
        "check": "String"
      }
    ],
    "output": "Boolean",
    "inputsInline": true,
    "colour": "#00b85b"
  },
  {
    "type": "lab_string_equals",
    "message0": "%1 と %2 が同じ",
    "args0": [
      {
        "type": "input_value",
        "name": "A",
        "check": "String"
      },
      {
        "type": "input_value",
        "name": "B",
        "check": "String"
      }
    ],
    "output": "Boolean",
    "inputsInline": true,
    "colour": "#00b85b"
  },
  {
    "type": "lab_string_number",
    "message0": "数値 %1 を文字列にする",
    "args0": [
      {
        "type": "input_value",
        "name": "VALUE",
        "check": "Number"
      }
    ],
    "output": "String",
    "colour": "#00b85b"
  },
  {
    "type": "lab_string_parse",
    "message0": "文字列 %1 を数値にする",
    "args0": [
      {
        "type": "input_value",
        "name": "VALUE",
        "check": "String"
      }
    ],
    "output": "Number",
    "colour": "#00b85b",
    "tooltip": "数値として読める文字列を使います。"
  }
];
export const SHARED_TYPES=definitions.map(d=>d.type);
const groups=[
  {
    "kind": "category",
    "name": "音",
    "colour": "#a570b3",
    "contents": [
      {
        "kind": "block",
        "type": "lab_sound_tone",
        "inputs": {
          "FREQUENCY": {
            "shadow": {
              "type": "math_number",
              "fields": {
                "NUM": 440
              }
            }
          },
          "MS": {
            "shadow": {
              "type": "math_number",
              "fields": {
                "NUM": 200
              }
            }
          }
        }
      }
    ]
  },
  {
    "kind": "category",
    "name": "制御",
    "colour": "#f5a400",
    "contents": [
      {
        "kind": "block",
        "type": "lab_wait",
        "inputs": {
          "SECONDS": {
            "shadow": {
              "type": "math_number",
              "fields": {
                "NUM": 1
              }
            }
          }
        }
      },
      {
        "kind": "block",
        "type": "controls_if"
      },
      {
        "kind": "block",
        "type": "controls_if",
        "extraState": {
          "hasElse": true
        }
      },
      {
        "kind": "block",
        "type": "lab_forever"
      },
      {
        "kind": "block",
        "type": "controls_repeat_ext",
        "inputs": {
          "TIMES": {
            "shadow": {
              "type": "math_number",
              "fields": {
                "NUM": 10
              }
            }
          }
        }
      },
      {
        "kind": "block",
        "type": "controls_whileUntil",
        "fields": {
          "MODE": "UNTIL"
        }
      },
      {
        "kind": "block",
        "type": "controls_whileUntil",
        "fields": {
          "MODE": "WHILE"
        }
      },
      {
        "kind": "block",
        "type": "lab_wait_until"
      },
      {
        "kind": "block",
        "type": "lab_end"
      },
      {
        "kind": "block",
        "type": "lab_return"
      }
    ]
  },
  {
    "kind": "category",
    "name": "演算",
    "colour": "#00b84a",
    "contents": [
      {
        "kind": "block",
        "type": "math_number",
        "fields": {
          "NUM": 0
        }
      },
      {
        "kind": "block",
        "type": "lab_op_add",
        "inputs": {
          "A": {
            "shadow": {
              "type": "math_number",
              "fields": {
                "NUM": 1
              }
            }
          },
          "B": {
            "shadow": {
              "type": "math_number",
              "fields": {
                "NUM": 1
              }
            }
          }
        }
      },
      {
        "kind": "block",
        "type": "lab_op_sub",
        "inputs": {
          "A": {
            "shadow": {
              "type": "math_number",
              "fields": {
                "NUM": 1
              }
            }
          },
          "B": {
            "shadow": {
              "type": "math_number",
              "fields": {
                "NUM": 1
              }
            }
          }
        }
      },
      {
        "kind": "block",
        "type": "lab_op_mul",
        "inputs": {
          "A": {
            "shadow": {
              "type": "math_number",
              "fields": {
                "NUM": 1
              }
            }
          },
          "B": {
            "shadow": {
              "type": "math_number",
              "fields": {
                "NUM": 1
              }
            }
          }
        }
      },
      {
        "kind": "block",
        "type": "lab_op_div",
        "inputs": {
          "A": {
            "shadow": {
              "type": "math_number",
              "fields": {
                "NUM": 1
              }
            }
          },
          "B": {
            "shadow": {
              "type": "math_number",
              "fields": {
                "NUM": 1
              }
            }
          }
        }
      },
      {
        "kind": "block",
        "type": "lab_math_function",
        "inputs": {
          "VALUE": {
            "shadow": {
              "type": "math_number",
              "fields": {
                "NUM": 1
              }
            }
          }
        }
      },
      {
        "kind": "block",
        "type": "lab_op_lt",
        "inputs": {
          "A": {
            "shadow": {
              "type": "math_number",
              "fields": {
                "NUM": 0
              }
            }
          },
          "B": {
            "shadow": {
              "type": "math_number",
              "fields": {
                "NUM": 100
              }
            }
          }
        }
      },
      {
        "kind": "block",
        "type": "lab_op_eq",
        "inputs": {
          "A": {
            "shadow": {
              "type": "math_number",
              "fields": {
                "NUM": 0
              }
            }
          },
          "B": {
            "shadow": {
              "type": "math_number",
              "fields": {
                "NUM": 100
              }
            }
          }
        }
      },
      {
        "kind": "block",
        "type": "lab_op_gt",
        "inputs": {
          "A": {
            "shadow": {
              "type": "math_number",
              "fields": {
                "NUM": 0
              }
            }
          },
          "B": {
            "shadow": {
              "type": "math_number",
              "fields": {
                "NUM": 100
              }
            }
          }
        }
      },
      {
        "kind": "block",
        "type": "lab_op_lte",
        "inputs": {
          "A": {
            "shadow": {
              "type": "math_number",
              "fields": {
                "NUM": 0
              }
            }
          },
          "B": {
            "shadow": {
              "type": "math_number",
              "fields": {
                "NUM": 100
              }
            }
          }
        }
      },
      {
        "kind": "block",
        "type": "lab_op_gte",
        "inputs": {
          "A": {
            "shadow": {
              "type": "math_number",
              "fields": {
                "NUM": 0
              }
            }
          },
          "B": {
            "shadow": {
              "type": "math_number",
              "fields": {
                "NUM": 100
              }
            }
          }
        }
      },
      {
        "kind": "block",
        "type": "lab_op_neq",
        "inputs": {
          "A": {
            "shadow": {
              "type": "math_number",
              "fields": {
                "NUM": 0
              }
            }
          },
          "B": {
            "shadow": {
              "type": "math_number",
              "fields": {
                "NUM": 100
              }
            }
          }
        }
      },
      {
        "kind": "block",
        "type": "lab_op_and"
      },
      {
        "kind": "block",
        "type": "lab_op_or"
      },
      {
        "kind": "block",
        "type": "logic_negate"
      },
      {
        "kind": "block",
        "type": "logic_boolean"
      },
      {
        "kind": "block",
        "type": "lab_data_mod",
        "inputs": {
          "A": {
            "shadow": {
              "type": "math_number",
              "fields": {
                "NUM": 1
              }
            }
          },
          "B": {
            "shadow": {
              "type": "math_number",
              "fields": {
                "NUM": 10
              }
            }
          }
        }
      },
      {
        "kind": "block",
        "type": "lab_data_random",
        "inputs": {
          "A": {
            "shadow": {
              "type": "math_number",
              "fields": {
                "NUM": 1
              }
            }
          },
          "B": {
            "shadow": {
              "type": "math_number",
              "fields": {
                "NUM": 10
              }
            }
          }
        }
      },
      {
        "kind": "block",
        "type": "lab_data_min",
        "inputs": {
          "A": {
            "shadow": {
              "type": "math_number",
              "fields": {
                "NUM": 1
              }
            }
          },
          "B": {
            "shadow": {
              "type": "math_number",
              "fields": {
                "NUM": 10
              }
            }
          }
        }
      },
      {
        "kind": "block",
        "type": "lab_data_max",
        "inputs": {
          "A": {
            "shadow": {
              "type": "math_number",
              "fields": {
                "NUM": 1
              }
            }
          },
          "B": {
            "shadow": {
              "type": "math_number",
              "fields": {
                "NUM": 10
              }
            }
          }
        }
      },
      {
        "kind": "block",
        "type": "lab_data_round",
        "inputs": {
          "A": {
            "shadow": {
              "type": "math_number",
              "fields": {
                "NUM": 1.5
              }
            }
          }
        }
      },
      {
        "kind": "block",
        "type": "lab_data_clamp",
        "inputs": {
          "A": {
            "shadow": {
              "type": "math_number",
              "fields": {
                "NUM": 120
              }
            }
          },
          "LOW": {
            "shadow": {
              "type": "math_number",
              "fields": {
                "NUM": -100
              }
            }
          },
          "HIGH": {
            "shadow": {
              "type": "math_number",
              "fields": {
                "NUM": 100
              }
            }
          }
        }
      },
      {
        "kind": "label",
        "text": "PID制御"
      },
      {
        "kind": "block",
        "type": "lab_pid",
        "inputs": {
          "TARGET": {
            "shadow": {
              "type": "math_number",
              "fields": {
                "NUM": 0
              }
            }
          },
          "MEASURED": {
            "shadow": {
              "type": "math_number",
              "fields": {
                "NUM": 0
              }
            }
          },
          "KP": {
            "shadow": {
              "type": "math_number",
              "fields": {
                "NUM": 1
              }
            }
          },
          "KI": {
            "shadow": {
              "type": "math_number",
              "fields": {
                "NUM": 0
              }
            }
          },
          "KD": {
            "shadow": {
              "type": "math_number",
              "fields": {
                "NUM": 0
              }
            }
          }
        }
      },
      {
        "kind": "block",
        "type": "lab_pid_reset"
      }
    ]
  },
  {
    "kind": "category",
    "name": "データ",
    "colour": "#ff8c1a",
    "contents": [
      {
        "kind": "label",
        "text": "文字列（UTF-8で120バイトまで）"
      },
      {
        "kind": "block",
        "type": "lab_string_literal"
      },
      {
        "kind": "block",
        "type": "lab_text_get"
      },
      {
        "kind": "block",
        "type": "lab_text_set",
        "inputs": {
          "VALUE": {
            "shadow": {
              "type": "lab_string_literal",
              "fields": {
                "TEXT": "こんにちは"
              }
            }
          }
        }
      },
      {
        "kind": "block",
        "type": "lab_string_join",
        "inputs": {
          "A": {
            "shadow": {
              "type": "lab_string_literal",
              "fields": {
                "TEXT": "こんにちは"
              }
            }
          },
          "B": {
            "shadow": {
              "type": "lab_string_literal",
              "fields": {
                "TEXT": "EV3"
              }
            }
          }
        }
      },
      {
        "kind": "block",
        "type": "lab_string_length",
        "inputs": {
          "VALUE": {
            "shadow": {
              "type": "lab_string_literal",
              "fields": {
                "TEXT": "こんにちは"
              }
            }
          }
        }
      },
      {
        "kind": "block",
        "type": "lab_string_letter",
        "inputs": {
          "VALUE": {
            "shadow": {
              "type": "lab_string_literal",
              "fields": {
                "TEXT": "こんにちは"
              }
            }
          },
          "INDEX": {
            "shadow": {
              "type": "math_number",
              "fields": {
                "NUM": 1
              }
            }
          }
        }
      },
      {
        "kind": "block",
        "type": "lab_string_includes",
        "inputs": {
          "A": {
            "shadow": {
              "type": "lab_string_literal",
              "fields": {
                "TEXT": "こんにちは"
              }
            }
          },
          "B": {
            "shadow": {
              "type": "lab_string_literal",
              "fields": {
                "TEXT": "こん"
              }
            }
          }
        }
      },
      {
        "kind": "block",
        "type": "lab_string_equals",
        "inputs": {
          "A": {
            "shadow": {
              "type": "lab_string_literal",
              "fields": {
                "TEXT": "こんにちは"
              }
            }
          },
          "B": {
            "shadow": {
              "type": "lab_string_literal",
              "fields": {
                "TEXT": "こん"
              }
            }
          }
        }
      },
      {
        "kind": "block",
        "type": "lab_string_number",
        "inputs": {
          "VALUE": {
            "shadow": {
              "type": "math_number",
              "fields": {
                "NUM": 12.5
              }
            }
          }
        }
      },
      {
        "kind": "block",
        "type": "lab_string_parse",
        "inputs": {
          "VALUE": {
            "shadow": {
              "type": "lab_string_literal",
              "fields": {
                "TEXT": "12.5"
              }
            }
          }
        }
      },
      {
        "kind": "label",
        "text": "数値リスト（同じ名前で共有）"
      },
      {
        "kind": "block",
        "type": "lab_list_clear",
        "inputs": {}
      },
      {
        "kind": "block",
        "type": "lab_list_add",
        "inputs": {
          "VALUE": {
            "shadow": {
              "type": "math_number",
              "fields": {
                "NUM": 0
              }
            }
          }
        }
      },
      {
        "kind": "block",
        "type": "lab_list_set",
        "inputs": {
          "INDEX": {
            "shadow": {
              "type": "math_number",
              "fields": {
                "NUM": 1
              }
            }
          },
          "VALUE": {
            "shadow": {
              "type": "math_number",
              "fields": {
                "NUM": 0
              }
            }
          }
        }
      },
      {
        "kind": "block",
        "type": "lab_list_delete",
        "inputs": {
          "INDEX": {
            "shadow": {
              "type": "math_number",
              "fields": {
                "NUM": 1
              }
            }
          }
        }
      },
      {
        "kind": "block",
        "type": "lab_list_item",
        "inputs": {
          "INDEX": {
            "shadow": {
              "type": "math_number",
              "fields": {
                "NUM": 1
              }
            }
          }
        }
      },
      {
        "kind": "block",
        "type": "lab_list_length",
        "inputs": {}
      },
      {
        "kind": "block",
        "type": "lab_list_contains",
        "inputs": {
          "VALUE": {
            "shadow": {
              "type": "math_number",
              "fields": {
                "NUM": 0
              }
            }
          }
        }
      },
      {
        "kind": "block",
        "type": "lab_list_stat",
        "inputs": {}
      }
    ]
  },
  {
    "kind": "category",
    "name": "記録",
    "colour": "#c58245",
    "contents": [
      {
        "kind": "block",
        "type": "lab_log_start"
      },
      {
        "kind": "block",
        "type": "lab_log_value",
        "inputs": {
          "VALUE": {
            "shadow": {
              "type": "math_number",
              "fields": {
                "NUM": 0
              }
            }
          }
        }
      },
      {
        "kind": "block",
        "type": "lab_log_end"
      }
    ]
  }
];
export function setupSharedGroups(Blockly){
 Blockly.defineBlocksWithJsonArray(definitions);
 Blockly.Msg.PROCEDURES_DEFRETURN_TITLE='定義';Blockly.Msg.PROCEDURES_DEFRETURN_RETURN='返す値';
 Blockly.Msg.PROCEDURES_CALLNORETURN_TOOLTIP='マイブロックを呼び出します。';
 // Keep all serialized field/input names on existing blocks.
 for(const [type,label] of [['lab_end','プログラムを終了する'],['lab_log_start','CSVログ'],['lab_log_end','CSVログの記録を終了する']]){
  const base=Blockly.Blocks[type],init=base._sharedInit??base.init;base._sharedInit=init;
  base.init=function(){init.call(this);if(type==='lab_log_start'){
   this.inputList[0].fieldRow[0].setValue('CSVログ');this.inputList[0].fieldRow.at(-1).setValue('の記録を開始する');this.getField('NAME').setValue('Log');
  }else this.inputList[0].fieldRow[0].setValue(label);};
 }
 const labelUpdates={lab_text_get:[''],lab_text_set:['文字列変数','を','にする'],lab_log_value:['項目','値','をCSVに記録する'],lab_list_add:['リスト','に','を追加'],lab_list_delete:['リスト','の','番目を削除'],lab_list_length:['リスト','の項目数']};
 for(const [type,labels] of Object.entries(labelUpdates)){
  const base=Blockly.Blocks[type],init=base._sharedInit??base.init;base._sharedInit=init;
  base.init=function(){init.call(this);let i=0;for(const input of this.inputList)for(const f of input.fieldRow)if(f instanceof Blockly.FieldLabel)f.setValue(labels[i++]??f.getValue());};
 }
 const getters=['lab_text_get','lab_text_set',...['clear','add','set','delete','item','length','contains','stat'].map(x=>'lab_list_'+x)];
 for(const type of getters){const base=Blockly.Blocks[type],init=base._sharedNameInit??base.init;base._sharedNameInit=init;base.init=function(){init.call(this);this.getField('NAME').setValue(type.startsWith('lab_list_')?'データ':'メッセージ');};}
 const logValue=Blockly.Blocks.lab_log_value,logInit=logValue._sharedLabelInit??logValue.init;logValue._sharedLabelInit=logInit;logValue.init=function(){logInit.call(this);this.getField('LABEL').setValue('値');};
 const stat=Blockly.Blocks.lab_list_stat,init=stat._sharedStatInit??stat.init;stat._sharedStatInit=init;stat.init=function(){init.call(this);this.getField('OP').setOptions([['合計','sum'],['平均','average'],['最小値','min'],['最大値','max']]);};
 const pid=Blockly.Blocks.lab_pid,pidInit=pid._sharedInit??pid.init;pid._sharedInit=pidInit;pid.init=function(){pidInit.call(this);const labels=['kp','ki','kd','の出力'];let i=0;for(const input of this.inputList.filter(i=>['KP','KI','KD'].includes(i.name)))for(const f of input.fieldRow)if(f instanceof Blockly.FieldLabel)f.setValue(labels[i++]??f.getValue());};
}
export function sharedGroupToolbox(toolbox){
 for(const c of groups){const target=toolbox.contents.find(g=>g.name===c.name);target.contents=structuredClone(c.contents);}
 const recording=toolbox.contents.find(c=>c.name==='記録');
 if(DEBUG_EDITION)recording.contents.push({kind:'label',text:'SPIKE固有：PID走行の記録'},{kind:'block',type:'lab_log_pid',inputs:Object.fromEntries(Object.entries({INTERVAL:100,REFLECTION:0,OUTPUT:0,LEFT_SPEED:0,RIGHT_SPEED:0}).map(([name,NUM])=>[name,{shadow:{type:'math_number',fields:{NUM}}}]))});
 if(DEBUG_EDITION)recording.contents.push({kind:'label',text:'SPIKE固有：左右モーターの同期記録'},{kind:'block',type:'lab_log_motion',inputs:{INTERVAL:{shadow:{type:'math_number',fields:{NUM:100}}}}});
 return toolbox;
}
const isDefinition=b=>['procedures_defnoreturn','procedures_defreturn'].includes(b?.type);
export function ordinaryVariables(ws){
 const parameters=new Set(),globalUses=new Set();
 for(const b of ws.getAllBlocks(false)){
  if(isDefinition(b))for(const m of b.getVarModels())parameters.add(m.getId());
  if(['variables_get','variables_set','math_change'].includes(b.type)||b.type==='lab_call_outputs'){
   const fields=b.type==='lab_call_outputs'?b.inputList.flatMap(i=>i.fieldRow).filter(f=>f instanceof Object&&f.name?.startsWith('OUT')):[b.getField('VAR')];
   for(const field of fields){const m=field?.getVariable?.();if(!m)continue;const root=b.getRootBlock();if(b.type==='lab_call_outputs'||!isDefinition(root)||!root.getVarModels().some(p=>p.getId()===m.getId()))globalUses.add(m.getId());}
  }
 }
 return ws.getVariableMap().getAllVariables().filter(m=>!parameters.has(m.getId())||globalUses.has(m.getId()));
}
export function validateSharedNames(workspace,ids,fail){
 const counts={text:new Set(),list:new Set(),pid:new Set()};
 for(const id of ids){const b=workspace.getBlockById(id);let kind=b.type.startsWith('lab_list_')?'list':['lab_text_get','lab_text_set'].includes(b.type)?'text':['lab_pid','lab_pid_reset'].includes(b.type)?'pid':null;if(!kind)continue;const name=b.getFieldValue('NAME');if(!name?.trim()||name.length>40||name.includes(String.fromCharCode(0)))fail(b,'名前は空白以外を含む1〜40文字にしてください。');counts[kind].add(name);if(counts[kind].size>16)fail(b,'文字列変数・リスト・PIDは、それぞれ16個までです。');}
}
export function registerSharedGenerators({g,emit,v,stat}){
 emit('lab_math_function',b=>[`_lab_common_math(${JSON.stringify(b.getFieldValue('FUNCTION'))}, ${v(b,'VALUE')})`,g.ORDER_ATOMIC]);
 for(const op of ['add','sub','mul','div'])emit('lab_op_'+op,b=>[`_lab_binary('${op}', ${v(b,'A')}, ${v(b,'B')})`,g.ORDER_ATOMIC]);
 emit('variables_set',b=>stat(`${g.getVariableName(b.getFieldValue('VAR'))} = _lab_number(${v(b,'VALUE')})\n`));
 emit('math_change',b=>{const name=g.getVariableName(b.getFieldValue('VAR'));return stat(`${name} = _lab_number(_lab_number(${name}) + _lab_number(${v(b,'DELTA')}))\n`);});
 emit('lab_sound_tone',b=>stat(`await _lab_common_tone(${v(b,'FREQUENCY')}, ${v(b,'MS')}, ${Number(b.getFieldValue('VOLUME'))})\n`));
 for(const op of ['mod','random','min','max','round','clamp'])emit('lab_data_'+op,b=>[`_lab_numeric('${op}', ${v(b,'A')}, ${b.getInput('B')?v(b,'B'):'0'}, ${op==='clamp'?v(b,'LOW'):'0'}, ${op==='clamp'?v(b,'HIGH'):'0'})`,g.ORDER_ATOMIC]);
 emit('lab_string_literal',b=>[`_lab_text_value(${JSON.stringify(b.getFieldValue('TEXT'))})`,g.ORDER_ATOMIC]);
 emit('lab_string_join',b=>[`_lab_text_value(_lab_text_value(${v(b,'A',"''")}) + _lab_text_value(${v(b,'B',"''")}))`,g.ORDER_ATOMIC]);
 emit('lab_string_length',b=>[`len(_lab_text_value(${v(b,'VALUE',"''")}))`,g.ORDER_ATOMIC]);
 emit('lab_string_letter',b=>[`_lab_common_letter(${v(b,'VALUE',"''")}, ${v(b,'INDEX')})`,g.ORDER_ATOMIC]);
 for(const op of ['includes','equals'])emit('lab_string_'+op,b=>[`(_lab_text_value(${v(b,'B',"''")}) ${op==='includes'?'in':'=='} _lab_text_value(${v(b,'A',"''")}))`,g.ORDER_ATOMIC]);
 emit('lab_string_number',b=>[`_lab_text_value('%.7g' % _lab_number(${v(b,'VALUE')}))`,g.ORDER_ATOMIC]);
 emit('lab_string_parse',b=>[`_lab_parse_number(${v(b,'VALUE',"''")})`,g.ORDER_ATOMIC]);
}
export const SHARED_RUNTIME=String.raw`
def _lab_number(value):
    if not isinstance(value, (int, float)) or not -3.4028234663852886e38 <= value <= 3.4028234663852886e38:
        raise ValueError('Number is not finite or exceeds the shared numeric range')
    return value

def _lab_binary(op, a, b):
    a, b = _lab_number(a), _lab_number(b)
    if op == 'div' and b == 0:
        raise ValueError('Cannot divide by zero')
    return _lab_number(a + b if op == 'add' else a - b if op == 'sub' else a * b if op == 'mul' else a / b)

def _lab_common_math(op, value):
    value = _lab_number(value)
    if (op == 'sqrt' and value < 0) or (op in ('ln', 'log') and value <= 0) or (op in ('asin', 'acos') and not -1 <= value <= 1) or (op == 'tan' and abs(value % 180) == 90):
        raise ValueError('Math input outside the function domain')
    return _lab_number(_lab_math(op, value))

def _lab_integer(value, lo, hi):
    _lab_number(value)
    if value != int(value) or not lo <= value <= hi:
        raise ValueError('Integer out of range')
    return int(value)

async def _lab_common_tone(frequency, ms, volume):
    frequency = _lab_integer(frequency, 250, 10000)
    ms = _lab_integer(ms, 1, 30000)
    volume = _lab_integer(volume, 0, 100)
    await sound.beep(frequency, ms, volume)

def _lab_text_value(value):
    if not isinstance(value, str) or chr(0) in value or len(value.encode('utf-8')) > 120:
        raise ValueError('Text needs a string within 120 UTF-8 bytes without NUL')
    return value

def _lab_common_letter(value, index):
    value = _lab_text_value(value)
    index = _lab_integer(index, 1, 120)
    return value[index - 1] if index <= len(value) else ''

def _lab_parse_number(value):
    value = _lab_text_value(value)
    # Strict decimal grammar shared with EBL / EBL-RT. Do not accept whitespace,
    # NaN, Infinity, hexadecimal or Python-only underscores.
    i, digits = 0, 0
    if value[:1] in ('+', '-'):
        i += 1
    while i < len(value) and '0' <= value[i] <= '9':
        i += 1
        digits += 1
    if i < len(value) and value[i] == '.':
        i += 1
        while i < len(value) and '0' <= value[i] <= '9':
            i += 1
            digits += 1
    if not digits:
        raise ValueError('Not a decimal number')
    if i < len(value) and value[i] in ('e', 'E'):
        i += 1
        if i < len(value) and value[i] in ('+', '-'):
            i += 1
        digits = 0
        while i < len(value) and '0' <= value[i] <= '9':
            i += 1
            digits += 1
        if not digits:
            raise ValueError('Invalid exponent')
    if i != len(value):
        raise ValueError('Not a decimal number')
    return _lab_number(float(value))

def _lab_numeric(op, a, b=0, low=0, high=0):
    a = _lab_number(a)
    if op in ('mod', 'min', 'max', 'random'):
        b = _lab_number(b)
    if op == 'mod':
        if b == 0:
            raise ValueError('Cannot divide by zero')
        # EBL standard normalizes the remainder to the divisor sign.
        return _lab_number(a % b)
    if op == 'random':
        import random
        a, b = _lab_integer(a, -32767, 32767), _lab_integer(b, -32767, 32767)
        if a > b:
            raise ValueError('Random lower bound exceeds upper bound')
        return random.randint(a, b)
    if op == 'min':
        return min(a, b)
    if op == 'max':
        return max(a, b)
    if op == 'round':
        return _lab_number(math.floor(a + 0.5))
    if op == 'clamp':
        low, high = _lab_number(low), _lab_number(high)
        if low > high:
            raise ValueError('Lower bound exceeds upper bound')
        return min(high, max(low, a))
    raise ValueError('Unknown numeric operation')
`;
