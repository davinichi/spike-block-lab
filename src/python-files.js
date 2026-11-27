import {zipFiles} from './zip.js';

// Both files share one namespace when assembled. Do not import the runtime as a
// Python module: user globals (wheel size, timers, messages) must remain shared.
export function combinePythonFiles(runtimeSource,programSource){
  return runtimeSource+'\n'+programSource;
}
export function pythonDownloadFiles(result){
  return {
    'program.py':result.programSource,
    'sbl_runtime.py':result.runtimeSource,
    'README.txt':'SPIKE Block Lab / Pythonファイル\n\nprogram.py：ブロックで作ったプログラム。\nsbl_runtime.py：モーター制御・記録などの内部処理。\n\nprogram.pyには、命令の意味が分かる日本語コメントを付けています。マイブロックの引数は、Pythonで使える名前をできるだけ残します。\n\nこの2ファイルは同じ名前空間で使うコードです。program.py単体や、通常のimportでの実行には対応していません。SBLは転送時に sbl_runtime.py、改行、program.py の順で1つにまとめます。\n\n編集を続ける場合は、SBLの「保存」で.spikelab作品も保存してください。Pythonを編集してブロックへ戻す機能はありません。転送用の1ファイルは「教員・指導者用」から別に保存できます。\n'
  };
}
export const zipPythonFiles=result=>zipFiles(pythonDownloadFiles(result));
