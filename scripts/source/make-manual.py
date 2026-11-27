"""Build the versioned HTML and PDF manual from one content source.
Requires reportlab. PDF uses an installed Japanese TrueType font.
"""
import json, html, os
from pathlib import Path
from reportlab.pdfgen import canvas
from reportlab.graphics.shapes import Drawing, Line, Rect, String, PolyLine, Circle
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.units import mm
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, Image, KeepTogether

ROOT=Path(__file__).resolve().parent
data=json.loads((ROOT/'manual-data.json').read_text(encoding='utf-8'))
version=data['version']
font_path=os.environ.get('MANUAL_JAPANESE_FONT',r'C:\Windows\Fonts\meiryo.ttc')
bold_path=os.environ.get('MANUAL_JAPANESE_BOLD_FONT',r'C:\Windows\Fonts\meiryob.ttc')
pdfmetrics.registerFont(TTFont('ManualJP',font_path,subfontIndex=0))
pdfmetrics.registerFont(TTFont('ManualJPBold',bold_path,subfontIndex=0))
pdfmetrics.registerFontFamily('ManualJP',normal='ManualJP',bold='ManualJPBold',italic='ManualJP',boldItalic='ManualJPBold')
teal=colors.HexColor('#126c67'); ink=colors.HexColor('#243b47'); muted=colors.HexColor('#657d86')
styles={
 'title':ParagraphStyle('title',fontName='ManualJPBold',fontSize=18,leading=25,textColor=ink,spaceAfter=12,wordWrap='CJK'),
 'lead':ParagraphStyle('lead',fontName='ManualJP',fontSize=10.3,leading=17,textColor=ink,spaceAfter=13,wordWrap='CJK'),
 'heading':ParagraphStyle('heading',fontName='ManualJPBold',fontSize=11,leading=17,textColor=teal,spaceBefore=10,spaceAfter=5,keepWithNext=True,wordWrap='CJK'),
 'body':ParagraphStyle('body',fontName='ManualJP',fontSize=10.1,leading=17,textColor=ink,spaceAfter=7,wordWrap='CJK'),
 'cell':ParagraphStyle('cell',fontName='ManualJP',fontSize=9.7,leading=16,textColor=ink,wordWrap='CJK'),
 'headcell':ParagraphStyle('headcell',fontName='ManualJPBold',fontSize=9,leading=15,textColor=colors.white,wordWrap='CJK'),
 'note':ParagraphStyle('note',fontName='ManualJP',fontSize=8.5,leading=14,textColor=muted,spaceBefore=12,wordWrap='CJK')
}
def para(text,style='body'):return Paragraph(html.escape(text),styles[style])
def footer(c,doc):
 c.saveState();w,h=A4
 c.setStrokeColor(colors.HexColor('#dce4e5'));c.line(17*mm,16*mm,w-17*mm,16*mm)
 c.setFont('ManualJP',8);c.setFillColor(muted)
 c.drawString(17*mm,11*mm,f'SPIKE Block Lab  |  v{version}  |  Standard Hub OS')
 c.drawRightString(w-17*mm,11*mm,str(doc.page));c.restoreState()
pdf_path=ROOT/f'SPIKE-Block-Lab-manual-v{version}.pdf'
class ManualDoc(SimpleDocTemplate):
 def afterFlowable(self,flowable):
  if hasattr(flowable,'chapter_key'):
   self.canv.bookmarkPage(flowable.chapter_key)
   self.canv.addOutlineEntry(flowable.chapter_title,flowable.chapter_key,0,False)

def diagram(spec):
 d=Drawing(490,70)
 kind=spec['kind']
 if kind=='abacus':
  for group,number in enumerate([7,7800]):
   label=str(number).rjust(5,' ')
   for x,ch in enumerate(label):
    n=int(ch) if ch!=' ' else 0
    for y in range(5):
     on=(n>=5 if y==0 else y<=n%5)
     d.add(Circle(35+group*230+x*12,58-y*11,4,fillColor=teal if on else colors.HexColor('#e4eaeb'),strokeWidth=0))
   d.add(String(108+group*230,32,str(number),fontName='ManualJPBold',fontSize=13,fillColor=ink))
 elif kind=='ramp':
  d.add(Line(22,12,470,12,strokeColor=muted));d.add(Line(22,12,22,66,strokeColor=muted))
  d.add(PolyLine([22,12,22,22,100,57,310,57,400,22,440,22,440,12],strokeColor=teal,strokeWidth=2))
  for x,t in [(55,'加速'),(200,'一定速度'),(355,'最低速度→停止')]:d.add(String(x,1,t,fontName='ManualJP',fontSize=9,fillColor=ink))
 else:
  labels=spec.get('labels',['共通設定 左B・右A','前進・後退','旋回・マイブロック'])
  gap=8;width=(480-gap*(len(labels)-1))/len(labels)
  for i,label in enumerate(labels):
   x=i*(width+gap)
   d.add(Rect(x,20,width,32,fillColor=colors.HexColor('#fff8d6'),strokeColor=teal,rx=4))
   d.add(String(x+width/2,32,label,fontName='ManualJP',fontSize=8.8,textAnchor='middle',fillColor=ink))
   if i:d.add(Line(x-gap,36,x,36,strokeColor=teal))
 return d

doc=ManualDoc(str(pdf_path),pagesize=A4,rightMargin=17*mm,leftMargin=17*mm,topMargin=17*mm,bottomMargin=23*mm,title=f'SPIKE Block Lab マニュアル v{version}',author='SPIKE Block Lab',pageCompression=1)
story=[para('SPIKE Block Lab','title'),para(f'操作・ブロック・作例と発展の手引き v{version}','lead'),para('目次','heading')]
for ch,title in enumerate(data['chapters'],1):
 first=next(i for i,p in enumerate(data['pages']) if p['chapter']==ch)+2
 story.append(Paragraph(f'<a href="#chapter-{ch}" color="#126c67">第{ch}章　{html.escape(title)}</a>　{first}',styles['body']))
story.append(para('v1.0運用版・標準Hub OS向け。当面は機能追加を休止し、不具合修正を随時行います。実機確認範囲は各章をご確認ください。','note'))
seen=set()
for index,page in enumerate(data['pages']):
 story.append(PageBreak())
 story.append(Paragraph(f'SPIKE BLOCK LAB  /  v{version}  /  第{page["chapter"]}章',ParagraphStyle('eyebrow',fontName='ManualJPBold',fontSize=8,leading=12,textColor=teal,spaceAfter=9)))
 title=para(page['title'],'title')
 if page['chapter'] not in seen:
  title.chapter_key=f"chapter-{page['chapter']}";title.chapter_title=f"第{page['chapter']}章 {data['chapters'][page['chapter']-1]}";seen.add(page['chapter'])
 story.append(title)
 if page.get('lead'):story.append(para(page['lead'],'lead'))
 if page.get('image'):
  story.append(Image(str(ROOT/'manual-overview.jpg'),width=80*mm,height=45*mm))
  story.append(Spacer(1,8*mm))
 if page.get('diagram'):story.append(diagram(page['diagram']))
 if page.get('steps'):
  for i,step in enumerate(page['steps'],1):story.append(para(f'{i}. {step}'))
 if page.get('table'):
  t=page['table'];rows=[[para(x,'headcell') for x in t['headers']]]+[[para(x,'cell') for x in row] for row in t['rows']]
  table=Table(rows,colWidths=[46*mm,130*mm],repeatRows=1,hAlign='LEFT')
  table.setStyle(TableStyle([('BACKGROUND',(0,0),(-1,0),teal),('VALIGN',(0,0),(-1,-1),'TOP'),('LEFTPADDING',(0,0),(-1,-1),8),('RIGHTPADDING',(0,0),(-1,-1),8),('TOPPADDING',(0,0),(-1,-1),5),('BOTTOMPADDING',(0,0),(-1,-1),5),('ROWBACKGROUNDS',(0,1),(-1,-1),[colors.HexColor('#f0f6f5'),colors.white]),('LINEBELOW',(0,1),(-1,-1),.4,colors.HexColor('#dce4e5'))]))
  story.append(table);story.append(Spacer(1,3*mm))
 for section in page.get('sections',[]):
  story.append(para(section['heading'],'heading'))
  for text in section['text']:story.append(para(text))
 if page.get('note'):story.append(para(page['note'],'note'))
doc.build(story,onFirstPage=footer,onLaterPages=footer)

out=['<!doctype html><html lang="ja"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">',f'<title>SPIKE Block Lab マニュアル v{version}</title>',
'''<style>body{font-family:"Yu Gothic UI",Meiryo,sans-serif;color:#243b47;background:#f4f6f7;line-height:1.85;margin:0}header,main{max-width:1000px;margin:auto;padding:24px}header{background:#243b47;color:white;max-width:none}header>div{max-width:1000px;margin:auto}a{color:#126c67}header a{color:#f0d675}nav{background:white;padding:18px;border-radius:9px}section.page{background:white;padding:28px;margin:22px 0;border:1px solid #dce4e5;border-radius:12px}h1{font-size:27px}h2{font-size:23px;color:#126c67}h3{font-size:17px;margin-top:24px}p,li{font-size:15px}table{border-collapse:collapse;width:100%;font-size:14px}th{background:#126c67;color:white;text-align:left}td,th{padding:12px;vertical-align:top;border-bottom:1px solid #dce4e5}td:first-child{width:26%;font-weight:600}tr:nth-child(even){background:#f0f6f5}.note{background:#fff7db;padding:14px;font-size:13px;border-left:3px solid #d3a238}img{max-width:100%;height:auto;border:1px solid #dce4e5;border-radius:8px}@media(max-width:600px){header,main{padding:14px}section.page{padding:18px}td,th{padding:8px}p,li{font-size:14px}}@media print{header,nav{display:none}body{background:white}main{padding:0}section.page{page-break-before:always;border:0;margin:0;padding:0}a{color:inherit}}</style>''',
 f'<header><div><h1>SPIKE Block Lab<br>{html.escape(data["subtitle"])}</h1><p>v{version} / 標準Hub OS向け / {data["date"]}</p><a href="SPIKE-Block-Lab-manual-v{version}.pdf" download>配布・印刷用PDFを保存</a>　 <a href="index.html">アプリに戻る</a></div></header><main><nav><strong>目次</strong><ol>']
for ch,title in enumerate(data['chapters'],1):out.append(f'<li><a href="#chapter-{ch}">{html.escape(title)}</a></li>')
out.append('</ol></nav>')
seen=set()
for i,page in enumerate(data['pages'],1):
 ch=page['chapter']
 if ch not in seen:out.append(f'<div id="chapter-{ch}"></div>');seen.add(ch)
 out.append(f'<section class="page" id="page-{i}"><p>第{ch}章 / PDF {i+1}ページ</p><h2>{html.escape(page["title"])}</h2>')
 if page.get('lead'):out.append(f'<p>{html.escape(page["lead"])}</p>')
 if page.get('image'):out.append('<img src="manual-overview.jpg" alt="SPIKE Block Labの画面。淡い黄色のプログラム名バーと左のグループ一覧。">')
 if page.get('diagram'):
  spec=page['diagram'];kind=spec['kind'];items=[]
  if kind=='ramp':items=['<polyline points="20,60 20,48 110,12 310,12 400,48 440,48 440,60" fill="none" stroke="#126c67" stroke-width="3"/>','<text x="40" y="79">加速</text><text x="210" y="79">一定速度</text><text x="350" y="79">最低速度→停止</text>']
  elif kind=='abacus':
   for group,number in enumerate([7,7800]):
    for x,ch in enumerate(str(number).rjust(5,' ')):
     n=int(ch) if ch!=' ' else 0
     for y in range(5):
      fill='#126c67' if (n>=5 if y==0 else y<=n%5) else '#e4eaeb'
      items.append(f'<circle cx="{35+group*230+x*12}" cy="{12+y*11}" r="4" fill="{fill}"/>')
    items.append(f'<text x="{108+group*230}" y="40">{number}</text>')
  else:
   labels=spec.get('labels',['共通設定 左B・右A','前進・後退','旋回・マイブロック']);width=480/len(labels)
   for j,label in enumerate(labels):items.append(f'<rect x="{j*width}" y="15" width="{width-5}" height="35" rx="4" fill="#fff8d6" stroke="#126c67"/><text x="{j*width+width/2}" y="37" text-anchor="middle">{html.escape(label)}</text>')
  out.append('<svg viewBox="0 0 490 85" role="img" aria-label="'+html.escape(page['title'])+'の図" style="max-width:620px;font:12px Meiryo,sans-serif">'+''.join(items)+'</svg>')
 if page.get('steps'):out.append('<ol>'+''.join(f'<li>{html.escape(x)}</li>' for x in page['steps'])+'</ol>')
 if page.get('table'):
  t=page['table'];out.append('<table><thead><tr>'+''.join(f'<th>{html.escape(x)}</th>' for x in t['headers'])+'</tr></thead><tbody>')
  for row in t['rows']:out.append('<tr>'+''.join(f'<td>{html.escape(x)}</td>' for x in row)+'</tr>')
  out.append('</tbody></table>')
 for s in page.get('sections',[]):out.append(f'<h3>{html.escape(s["heading"])}</h3>'+''.join(f'<p>{html.escape(x)}</p>' for x in s['text']))
 if page.get('note'):out.append(f'<p class="note">{html.escape(page["note"])}</p>')
 out.append('<p><a href="#">目次へ戻る</a></p></section>')
out.append('<p>出典：<a href="https://github.com/davinichi/spike-block-lab">SPIKE Block Lab</a> / <a href="THIRD_PARTY.md">第三者ライセンス</a></p></main></html>')
(ROOT/f'manual-v{version}.html').write_text('\n'.join(out),encoding='utf-8')
print(pdf_path)
