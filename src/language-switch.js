// Display language is independent of the project format and block wording level.
export function installLanguageSwitch({save, connected, clearDirty}) {
  const english=document.documentElement.lang==='en';
  const label=document.createElement('label');
  label.className='display-language';
  label.append(english?'Language ':'言語 ');
  const select=document.createElement('select');
  select.id='displayLanguage';
  select.setAttribute('aria-label','言語 / Language');
  select.add(new Option('日本語','ja'));
  select.add(new Option('English','en'));
  select.value=english?'en':'ja';
  label.append(select);
  document.querySelector('.header-right').prepend(label);
  select.addEventListener('change',()=>{
    const locale=select.value;
    select.value=english?'en':'ja';
    if(connected()&&!confirm(english
      ?'Changing language disconnects SPIKE. A program already running on the hub will keep running. Continue?'
      :'言語を切り替えるとSPIKEとの接続が切れます。本体で実行中のプログラムは動き続けます。切り替えますか？'))return;
    try{save();}catch{
      alert(english?'The project could not be saved. Save it to a file before changing language.':'作品を自動保存できませんでした。ファイルに保存してから言語を切り替えてください。');
      return;
    }
    clearDirty();
    location.assign(new URL(locale==='en'?'en/index.html':'../index.html',location.href));
  });
}
