# 出典と第三者ライセンス

## Blockly 13.4.0

https://github.com/RaspberryPiFoundation/blockly

Apache License 2.0。npmで取得し、ビルド時にJS・メディアと完全なライセンスをdist/vendorへコピーします。

## SPIKE-RT

https://github.com/spike-rt/spike-rt

対象版：v0.2.0。rt-template.cdlは公式sample/motor/motor.cdl（main確認コミット62a2824e4b513aaf65fde4670ccbc5620e1733a6）を出典とします。著作権表示とMITライセンス全文はRT-NOTICE.txtに同梱します。生成ZIPにも同梱します。

SPIKE-RT全体と依存ライブラリの再配布時には、各コンポーネントの条件（TOPPERS、Pybricksなど）も確認してください。本リポジトリはSPIKE-RTバイナリやカーネルを配布しません。

## LEGO SPIKE App 3通信仕様

https://lego.github.io/spike-prime-docs/

https://github.com/LEGO/spike-prime-docs/tree/main/examples/python

仕様を参照してJavaScriptの通信処理を実装しています。COBSの区切り・XOR、CRCの4バイトアライン、転送応答を使用します。公式Python実装そのものは同梱していません。

## EV3 Block Lab

https://github.com/davinichi/ev3-block-lab

v0.20.1の設計を参考に、SPIKE用の最小編集・保存・コード生成を新規実装しています。元リポジトリの独自コードには再利用ライセンスが未設定です。本リポジトリでも独自コードの公開ライセンスは未設定です。

LEGO、SPIKE、MINDSTORMSはLEGO Groupの商標です。本アプリはLEGO Groupの提供・承認によるものではありません。
