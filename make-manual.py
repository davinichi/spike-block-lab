"""Build the versioned HTML and PDF manual from one content source.
Requires reportlab. PDF uses an installed Japanese TrueType font.
"""
import json, html, os
from pathlib import Path
from reportlab.pdfgen import canvas
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
 'title':ParagraphStyle('title',fontName='ManualJPBold',fontSize=19,leading=27,textColor=ink,spaceAfter=12,wordWrap='CJK'),
 'lead':ParagraphStyle('lead',fontName='ManualJP',fontSize=10.3,leading=17,textColor=ink,spaceAfter=13,wordWrap='CJK'),
 'heading':ParagraphStyle('heading',fontName='ManualJPBold',fontSize=11,leading=17,textColor=teal,spaceBefore=10,spaceAfter=5,keepWithNext=True,wordWrap='CJK'),
 'body':ParagraphStyle('body',fontName='ManualJP',fontSize=9.3,leading=15.8,textColor=ink,spaceAfter=7,wordWrap='CJK'),
 'cell':ParagraphStyle('cell',fontName='ManualJP',fontSize=8.9,leading=14.5,textColor=ink,wordWrap='CJK'),
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
doc=SimpleDocTemplate(str(pdf_path),pagesize=A4,rightMargin=17*mm,leftMargin=17*mm,topMargin=17*mm,bottomMargin=23*mm,title=f'SPIKE Block Lab マニュアル v{version}',author='SPIKE Block Lab',pageCompression=1)
story=[]
for index,page in enumerate(data['pages']):
 if index:story.append(PageBreak())
 story.append(Paragraph(f'SPIKE BLOCK LAB  /  v{version}',ParagraphStyle('eyebrow',fontName='ManualJPBold',fontSize=8,leading=12,textColor=teal,spaceAfter=9)))
 story.append(para(page['title'],'title'))
 if page.get('lead'):story.append(para(page['lead'],'lead'))
 if page.get('image'):
  story.append(Image(str(ROOT/'manual-overview.jpg'),width=176*mm,height=99*mm))
  story.append(Spacer(1,8*mm))
 if page.get('steps'):
  for i,step in enumerate(page['steps'],1):story.append(para(f'{i}. {step}'))
 if page.get('table'):
  t=page['table'];rows=[[para(x,'headcell') for x in t['headers']]]+[[para(x,'cell') for x in row] for row in t['rows']]
  table=Table(rows,colWidths=[46*mm,130*mm],repeatRows=1,hAlign='LEFT')
  table.setStyle(TableStyle([('BACKGROUND',(0,0),(-1,0),teal),('VALIGN',(0,0),(-1,-1),'TOP'),('LEFTPADDING',(0,0),(-1,-1),8),('RIGHTPADDING',(0,0),(-1,-1),8),('TOPPADDING',(0,0),(-1,-1),7),('BOTTOMPADDING',(0,0),(-1,-1),7),('ROWBACKGROUNDS',(0,1),(-1,-1),[colors.HexColor('#f0f6f5'),colors.white]),('LINEBELOW',(0,1),(-1,-1),.4,colors.HexColor('#dce4e5'))]))
  story.append(table);story.append(Spacer(1,3*mm))
 for section in page.get('sections',[]):
  story.append(para(section['heading'],'heading'))
  for text in section['text']:story.append(para(text))
 if page.get('note'):story.append(para(page['note'],'note'))
doc.build(story,onFirstPage=footer,onLaterPages=footer)

out=['<!doctype html><html lang="ja"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">',f'<title>SPIKE Block Lab マニュアル v{version}</title>',
'''<style>body{font-family:"Yu Gothic UI",Meiryo,sans-serif;color:#243b47;background:#f4f6f7;line-height:1.85;margin:0}header,main{max-width:1000px;margin:auto;padding:24px}header{background:#243b47;color:white;max-width:none}header>div{max-width:1000px;margin:auto}a{color:#126c67}header a{color:#f0d675}nav{background:white;padding:18px;border-radius:9px}section.page{background:white;padding:28px;margin:22px 0;border:1px solid #dce4e5;border-radius:12px}h1{font-size:27px}h2{font-size:23px;color:#126c67}h3{font-size:17px;margin-top:24px}p,li{font-size:15px}table{border-collapse:collapse;width:100%;font-size:14px}th{background:#126c67;color:white;text-align:left}td,th{padding:12px;vertical-align:top;border-bottom:1px solid #dce4e5}td:first-child{width:26%;font-weight:600}tr:nth-child(even){background:#f0f6f5}.note{background:#fff7db;padding:14px;font-size:13px;border-left:3px solid #d3a238}img{max-width:100%;height:auto;border:1px solid #dce4e5;border-radius:8px}@media(max-width:600px){header,main{padding:14px}section.page{padding:18px}td,th{padding:8px}p,li{font-size:14px}}@media print{header,nav{display:none}body{background:white}main{padding:0}section.page{page-break-before:always;border:0;margin:0;padding:0}a{color:inherit}}</style>''',
 f'<header><div><h1>SPIKE Block Lab<br>{html.escape(data["subtitle"])}</h1><p>v{version} / 標準Hub OS向け / {data["date"]}</p><a href="SPIKE-Block-Lab-manual-v{version}.pdf" download>配布・印刷用PDFを保存</a>　 <a href="index.html">アプリに戻る</a></div></header><main><nav><strong>目次</strong><ol>']
for i,page in enumerate(data['pages'],1):out.append(f'<li><a href="#chapter-{i}">{html.escape(page["title"])}</a></li>')
out.append('</ol></nav>')
for i,page in enumerate(data['pages'],1):
 out.append(f'<section class="page" id="chapter-{i}"><h2>{html.escape(page["title"])}</h2>')
 if page.get('lead'):out.append(f'<p>{html.escape(page["lead"])}</p>')
 if page.get('image'):out.append('<img src="manual-overview.jpg" alt="SPIKE Block Lab v0.2.0の画面。上部に保存とマイブロック、左にグループ、右に接続パネル。">')
 if page.get('steps'):out.append('<ol>'+''.join(f'<li>{html.escape(x)}</li>' for x in page['steps'])+'</ol>')
 if page.get('table'):
  t=page['table'];out.append('<table><thead><tr>'+''.join(f'<th>{html.escape(x)}</th>' for x in t['headers'])+'</tr></thead><tbody>')
  for row in t['rows']:out.append('<tr>'+''.join(f'<td>{html.escape(x)}</td>' for x in row)+'</tr>')
  out.append('</tbody></table>')
 for s in page.get('sections',[]):out.append(f'<h3>{html.escape(s["heading"])}</h3>'+''.join(f'<p>{html.escape(x)}</p>' for x in s['text']))
 if page.get('note'):out.append(f'<p class="note">{html.escape(page["note"])}</p>')
 out.append('</section>')
out.append('<p>出典：<a href="https://github.com/davinichi/spike-block-lab">SPIKE Block Lab</a> / <a href="THIRD_PARTY.md">第三者ライセンス</a></p></main></html>')
(ROOT/f'manual-v{version}.html').write_text('\n'.join(out),encoding='utf-8')
print(pdf_path)
