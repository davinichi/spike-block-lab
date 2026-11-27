const validName=name=>typeof name==='string'&&/^[A-Za-z0-9_-]{1,31}$/.test(name);
export function recordingReader(name,token){
 if(!validName(name)||!/^[a-f0-9]{24}$/.test(token))throw Error('記録名は英数字・「-」「_」で1〜31文字にしてください。');
 return `# SBL read-only CSV retrieval helper; user-selected slot is overwritten.\nimport runloop\nasync def main():\n    try:\n        try:\n            f = open('/flash/sbl_${name}.csv', 'rb')\n        except OSError as e:\n            if not e.args or e.args[0] != 2:\n                raise\n            try:\n                f = open('/sbl_${name}.csv', 'rb')\n            except OSError as legacy_error:\n                if legacy_error.args and legacy_error.args[0] in (2, 19):\n                    raise RuntimeError('SBL_NOT_FOUND:${name}')\n                raise\n        print('SBLCSV:${token}:BEGIN')\n        sequence, size, checksum = 0, 0, 2166136261\n        try:\n            while True:\n                data = f.read(96)\n                if not data:\n                    break\n                size += len(data)\n                if size > 2097152:\n                    raise ValueError('CSV exceeds 2 MiB')\n                for byte in data:\n                    checksum = ((checksum ^ byte) * 16777619) & 0xffffffff\n                print('SBLCSV:${token}:DATA:' + str(sequence) + ':' + ''.join('%02x' % byte for byte in data))\n                sequence += 1\n                await runloop.sleep_ms(5)\n        finally:\n            f.close()\n        print('SBLCSV:${token}:END:' + str(sequence) + ':' + str(size) + ':' + str(checksum))\n    except Exception as e:\n        print('SBLCSV:${token}:ERROR:' + str(e))\nrunloop.run(main())\n`;
}
export class RecordingReceiver{
 constructor(token,onProgress=()=>{}){this.prefix=`SBLCSV:${token}:`;this.onProgress=onProgress;this.buffer='';this.parts=[];this.size=0;this.hash=2166136261;this.started=false;this.finished=false;this.error=null;this.bytes=null;}
 push(text){
  if(this.finished)return;
  this.buffer+=text;if(this.buffer.length>8192){this.fail('記録の応答が長すぎます。');return;}
  let i;while(!this.finished&&(i=this.buffer.indexOf('\n'))>=0){const line=this.buffer.slice(0,i).replace(/\r$/,'');this.buffer=this.buffer.slice(i+1);if(line.startsWith(this.prefix))this.line(line.slice(this.prefix.length));}
 }
 fail(message){this.finished=true;this.error=Error(message);}
 line(line){
  if(line==='BEGIN'){if(this.started){this.fail('記録の応答が重複しました。');return;}this.started=true;return;}
  if(line.startsWith('ERROR:SBL_NOT_FOUND:')){const name=line.slice('ERROR:SBL_NOT_FOUND:'.length);this.fail(`記録「${name}」が見つかりません。「記録を始める」ブロックと同じ記録名を入力してください。`);return;}
  if(line.startsWith('ERROR:')){this.fail('記録を取り出せません：'+line.slice(6));return;}
  if(!this.started){this.fail('記録の開始応答がありません。');return;}
  const data=/^DATA:(\d+):([a-f0-9]+)$/.exec(line);
  if(data){if(Number(data[1])!==this.parts.length||data[2].length%2||data[2].length>192){this.fail('記録の順番またはデータが不正です。もう一度取り出してください。');return;}
   const bytes=Uint8Array.from(data[2].match(/../g).map(x=>parseInt(x,16)));this.size+=bytes.length;if(this.size>2097152){this.fail('記録が2 MiBを超えています。');return;}
   for(const byte of bytes)this.hash=Math.imul(this.hash^byte,16777619)>>>0;this.parts.push(bytes);this.onProgress(this.size);return;
  }
  const end=/^END:(\d+):(\d+):(\d+)$/.exec(line);
  if(!end||Number(end[1])!==this.parts.length||Number(end[2])!==this.size||Number(end[3])!==this.hash){this.fail('記録の照合に失敗しました。もう一度取り出してください。');return;}
  const bytes=new Uint8Array(this.size);let offset=0;for(const p of this.parts){bytes.set(p,offset);offset+=p.length;}
  try{new TextDecoder('utf-8',{fatal:true}).decode(bytes);}catch{this.fail('記録の文字データが不正です。');return;}
  this.bytes=bytes;this.finished=true;
 }
}
