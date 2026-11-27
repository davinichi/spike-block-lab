import {readFile,writeFile,mkdir,copyFile} from 'node:fs/promises';
import path from 'node:path';

// Build a static English edition. Never translate serialized projects or user input.
// Keeping translation at build time also avoids changing labels while Blockly edits.
export async function buildEnglish(root,out,files){
  const dictionaries=await Promise.all(['i18n-blocks.json','i18n-ui.json','i18n-python.json','i18n-usb.json','i18n-slots.json','i18n-gyro.json'].map(async name=>JSON.parse(await readFile(path.join(root,name),'utf8'))));
  const dictionary=Object.assign({},...dictionaries);
  const keys=Object.keys(dictionary).sort((a,b)=>b.length-a.length);
  const pattern=new RegExp(keys.map(key=>key.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('|'),'g');
  const translate=source=>source.replace(pattern,key=>dictionary[key]);
  const target=path.join(out,'en');await mkdir(target,{recursive:true});
  for(const name of files.filter(name=>name.endsWith('.js')||name==='index.html')){
    let source=await readFile(path.join(out,name),'utf8');
    // Keep sample project data intact: names and string literals are learning content.
    if(!['classroom-samples.js','primary-school-sample.js','language-switch.js'].includes(name)){
      // Legacy projects omit these return names. Their serialization defaults
      // must stay the same in both editions, including XML mutation loading.
      if(['returns.js','return-runtime.js'].includes(name))source=source.replaceAll("['値']","['__SBL_LEGACY_RETURN_NAME__']");
      source=translate(source).replaceAll('__SBL_LEGACY_RETURN_NAME__','値');
    }
    if(name==='index.html'){
      source=source.replace('<html lang="ja">','<html lang="en">')
        .replaceAll('src="vendor/','src="../vendor/').replace('../vendor/ja.js','../vendor/en.js')
        .replace('href="style.css','href="../style.css')
        .replaceAll('href="SPIKE-Block-Lab-manual-','href="../SPIKE-Block-Lab-manual-')
        .replaceAll('href="manual-v','href="../manual-v')
        .replaceAll('href="TESTING.md"','href="../TESTING.md"')
        .replaceAll('href="credits.html"','href="../credits.html"')
        .replaceAll('href="THIRD_PARTY.md"','href="../THIRD_PARTY.md"')
        .replaceAll('href="EBL-RT-COMMON-GROUPS.txt"','href="../EBL-RT-COMMON-GROUPS.txt"')
        .replace('<a id="manualDownload"','<a class="menu-action" href="guide.html" target="_blank" rel="noopener">English quick-start guide</a><a id="manualDownload"');
    }
    if(name==='app.js')source=source.replace("media:'vendor/media/'","media:'../vendor/media/'");
    await writeFile(path.join(target,name),source);
  }
  await copyFile(path.join(root,'guide-en.html'),path.join(target,'guide.html'));
  await copyFile(path.join(root,'node_modules/blockly/msg/en.js'),path.join(out,'vendor/en.js'));
  console.log('Built English edition: en/index.html');
}
