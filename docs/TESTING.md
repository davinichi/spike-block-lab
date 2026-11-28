# 実機テスト / SPIKE Block Lab v1.1.0

v1.0.0は機能追加を休止して運用する区切りです。以下の未確認項目は引き続き未確認であり、不具合の再現・修正時に確認します。

標準Hub OS向けを優先します。実機担当：プロジェクトオーナー。SPIKE-RTは今回のテスト対象ではありません。

## 環境と結果の記録

- 日付、Chromebook機種、Chrome / ChromeOS版、学校管理端末の制限
- 本体のHub OS版、アプリの版とコミット
- モーター・センサー種類、接続ポート、タイヤ直径
- 使用サンプル、期待した動作、実際の動作、本体表示
- 作品ファイルと「ログを保存」の記録

## 1. 画面と保存（本体不要）

- [ ] 生徒用の「新しいプログラム」「保存」「開く」が前面にある
- [ ] 「教員・指導者用」にマニュアル、使い方、マイブロック作成・入出力、Pythonの確認・保存、ブロックのことばがある
- [ ] メニューは項目選択・外側クリック・Escで閉じられる
- [ ] 接続状態を押しても接続・転送を開ける。パネルを閉じても接続を維持する
- [ ] 未接続・接続確認中・接続中が文字と印で区別できる
- [ ] 「接続・転送」を閉じると編集領域が広く使える
- [ ] ブロック編集、元に戻す、やり直す、全体表示
- [ ] 保存・読み込み後も、ブロック位置・数値・マイブロックの引数が残る
- [ ] 基本ブロックのことば切り替えで値や接続が変わらない
- [ ] マイブロックの作成・引数・呼び出し・書き出し・読み込み
- [ ] 再読み込みで自動保存した作品が復元される

## 2. 最初はライトと音

他のSPIKEアプリ・接続中のタブを閉じます。本体はSPIKE App 3対応の標準Hub OSを使用し、Bluetoothボタンを押します。

- [ ] 「接続する」で本体を選び、Hub OS版を表示できる
- [ ] 残す作品のない保存番号を選ぶ
- [ ] 「表示・ライト」を転送でき、転送だけでは動かない
- [ ] 「転送して実行」で転送後に実行される
- [ ] 「音だけ」が本体スピーカーで鳴る
- [ ] ブラウザの停止と、本体の中央ボタンでの停止を確認する
- [ ] 切断・ケーブル取り外し後に、本体の番号選択と中央ボタンで実行できる
- [ ] 通常の電源オフ→再起動後にも保存番号から実行できる
- [ ] 転送途中の電源オフ・切断が成功表示にならず、再接続後に転送し直せる

## 3. モーターと走行

最初は車輪を浮かせます。モーターAサンプルはポートA、走行サンプルは左B・右Cです。

- [ ] モーターA：速さ20％で正逆に90度、指定角度で停止
- [ ] 度・回転・秒指定、正逆、速さ、ブレーキ／惰性／保持
- [ ] 前進・後退：タイヤ直径56mmの設定を実物に合わせる
- [ ] 左右ポート、ステアリング、左右別速度
- [ ] 連続回転＋条件待ちの停止、本体の停止操作
- [ ] 実行終了・エラー時に回転中のモーターが止まる

## 4. センサー

距離とカラーのサンプルはDを使用します。同じポートへ異なる種類を指定すると生成時に案内されます。

- [ ] 距離で停止：Dの距離が15cm未満でB/Cが停止する
- [ ] 対象を検出できないときに0cmや近いと誤判定しない
- [ ] 赤で音：Dのカラーセンサーが赤を検出すると音が鳴る
- [ ] 反射光、フォース押下と力（N）、本体の左右ボタン
- [ ] 本体の向き・傾き（度）、モーター回転角度、タイマー
- [ ] 接続パネルのポートA〜Fの機器・値が更新される
- [ ] 切断後も本体側でセンサー判断が変化する

## 5. 制御・変数・マイブロック

- [ ] 「変数と分岐」で1、2、3が順に表示される
- [ ] 引数付きマイブロックで指定距離の走行ができる
- [ ] 四則演算、比較、論理、文字、リストの保存と動作
- [ ] 「走行と表示を並行」で両方が同時に進み、短い処理終了で走行が止まらない
- [ ] 「メッセージで合図」で1秒後に音が鳴る
- [ ] 条件イベントは押し続けても毎回発火せず、条件が戻ってから再発火する
- [ ] 無限ループとイベント処理も本体から停止できる

| 項目 | 成功／失敗／未実施 | 実際の動作・ログ |
|---|---|---|
| 接続・ライト・音 | 未実施 | |
| 保存・切断後実行・再起動 | 未実施 | |
| モーター・走行・停止 | 未実施 | |
| センサー・値表示 | 未実施 | |
| 変数・マイブロック | 未実施 | |
| 並行処理・イベント | 未実施 | |

## 実機確認の報告（2026-10-31）

プロジェクトオーナーからの報告。v0.2.2で以下を確認しました。

- Bluetoothで本体に接続
- プログラム転送、本体にHELLO表示、転送後の実行
- 接続を切った後の本体単独実行
- 電源を入れ直した後の保存保持と本体単独実行
- ポートAのモーター動作

角度・回転数・逆方向の精度、センサー条件、その他の全機能は未確認です。上記を全チェック項目の成功とは扱いません。

## v0.3.0 共通ブロックの実機テスト

オーナー報告追記：v0.2.3で、音、距離センサCが15cm未満になるまで待ってモーターAをブレーキ停止、左B・右Aの直進が成功しました。以下は新しいブロックで改めて確認します。

- [ ] 「動き」の前進・後退：左右順・速さ・距離、タイヤ直径
- [ ] スピン右・左：タイヤ直径とトレッドを合わせ、低速で90度の向きと量
- [ ] ピボット右・左：内側の車輪が止まること、方向と角度
- [ ] モーター1個の角度・回転・時間・連続と、2個の各軸の回転量
- [ ] ブレーキ・惰性・保持と、すべて停止
- [ ] 発展のステアリング・左右別速度の連続・角度・秒指定
- [ ] 引数グループから取り出し、定義内で使用・呼び出し値の反映
- [ ] 新しい距離・反射光・力の比較、値が変わったとき、メッセージ待ち
- [ ] 名前付き文字・数値リスト、PID計算・リセット
- [ ] 記録の開始・値・終了がCSV形式の通信ログへ出力されること
- [ ] 新しい命令でも切断・電源再投入後に本体だけで実行できること

旋回は幾何計算であり、床の滑りや車体の誤差を補正していません。旧作品の読み込み互換は今回の対象から外しました。EV3の加減速プロファイル・停止タイミング同期補正・本体CSVファイル保存は移植していません。

## v0.3.2 マイブロック操作

- [ ] 上部と一覧の「マイブロックを作る」から同じフォームが開く
- [ ] 「＋ 引数を追加」、行ごとの「削除」、名前入力で作成できる
- [ ] 一覧の編集ボタンと定義の右クリックから同じ編集フォームが開く
- [ ] 名前・引数の編集後も呼び出し側の数値とセンサーブロックが保持される
- [ ] 使っている引数の削除は説明付きで止まり、作品を壊さない
- [ ] 保存・再読み込み後にも作成と編集ができ、本体で引数が反映される


## v0.4.1 追加機能の実機確認（未確認）

- [ ] 色・制御形状・変数フォーム・複製・背景クリックで閉じる操作。
- [ ] 送って待つ：受信側に2秒待機→音を置き、送信側が音の後に進む。受信側なしはそのまま進む。循環は転送前エラー。
- [ ] 実測速度、動作後停止の惰性／保持、角度移動途中で別のスタートから20→40％に変更して同じ目標で終了。0で一時停止後に再開。
- [ ] パワー±20％、文字の1番目／包含／一致／数値変換、sin(30)=0.5、空リスト平均はエラー。
- [ ] 本体ランプ点滅／明暗を5秒待機と組み合わせる。通常の色指定・消灯で解除。
- [ ] RecordingTestを転送→切断→実行（DONE）→再接続→Record1、空き番号19などを読み出し用に選択→CSV取得。10行と秒を確認。
- [ ] 本体の電源を入れ直して、記録を再実行せずRecord1を取得。保持されることを確認。
- [ ] ファイル保存不可の場合は通信ログの「Hub file storage unavailable」を保存する。
- [ ] RampTestで台形／S字の加減速、左・右方向、短距離の停止、途中停止を確認。
- [ ] 同期補正有効／無効で2個のモーターの角度と停止を比較。負荷を少し変えた場合も確認。

読み出し用番号の既存プログラムは上書きされます。残したい作品は別の番号を使ってください。本体のCSVファイルは読み出しでは変更しません。


## v0.4.1 電圧・そろばん表示（実機確認待ち）

- [ ] 「加減速」「同期補正」がモーターにあり、動きにはない。
- [ ] 「電圧をそろばん表示」を転送→左ボタン→1秒の音→5×5に電圧表示。
- [ ] 切断して本体で起動しても同じ操作で動く。
- [ ] 7800なら列1の7は最上段と下2灯、列2の8は最上段と下3灯。列0は余白、列3・4の0は無点灯。
- [ ] 固定値12345、0、99999を表示。小数・負数・100000はエラー。


## v0.5.0 共通の動きモーター設定

- スタート直後に左右のポート（実機例：左B・右A）を設定し、前進→後退→右スピン→左ピボットを確認。
- 同じ設定でマイブロック内の前進が動くことを確認。
- 停止後に左右設定を変更し、その後の命令だけ新しい設定を使うことを確認。
- 同じ設定を繰り返しても二重登録エラーが出ないことを確認。
- 設定なし、設定が動きより後、同じ左右ポートを指定した場合に転送前にエラーが出ることを確認。
- 切断後・再起動後は保存したプログラムが先頭から設定を行って動くことを確認。
- 旧作品は先頭に設定を追加し、旧ブロックに選んでいたポートを実機配線と再確認。


## v0.6.0 戻り値（実機未確認）

- 旧作品の戻り値なしマイブロックを読み込み、従来どおり動くこと。
- 「戻り値で音の高さ」で660Hzが鳴ること。
- 「2つの戻り値を受け取る」で13・3が順に表示されること。
- 条件分岐からの途中返却、複数値の一括受取り、繰返し・並行処理でも呼び出し間の値が混ざらないこと。
- 本体へ転送して切断・再起動後にも保存したプログラムが動くこと。

## v0.7.0 追加確認

- 表示一覧と全16サンプルに画像ブロックがなく、従来の画像入り作品は保存・読込・生成できること。
- 共通設定後、前進/後退の速さ20と－20を比較。距離は10cmから開始。スピン/ピボットの正負も比較。加減速の有無で確認。負のピボットは同じ車輪が逆転する。
- 逆転指令の生成は自動試験済み、実機の方向・精度は未確認。0や±100超は有限動作でエラーとする。
- PDF全20章・46ページ、HTMLの目次、現行パレット全ブロックの説明を照合。

- 1366×768および1024×768で、接続パネルの初期非表示、ボタン開閉、閉じる・Esc、編集幅の復元、16pxのアドバイスと長文折返しをブラウザ確認。実機のBluetoothはこの検証では接続しない。

## v0.8.1 加減速・数値入力

- EBL v0.25.6から採取した32ケースの速度指令と照合：台形/S字、正負、時間/角度、短時間、片側0の設定、異なる左右速度・応答を含む。比較対象は速度計算で、EV3の本体内位置制御とSPIKEのエンコーダ監視の終了判定差は含めない。
- 0～10秒、連続回転・即時停止の対象外、速度変更後も目標角度を維持、設定なしの既存動作を確認。
- 全16サンプルの数値が入力欄として固定、旧作品の数値・ID・コードを維持、変数/演算式の差込と取外し、保存再読込を検証。
- 実機はオーナーが担当。停止距離・低速域・逆転・左右比率・短い旋回は未確認。

## v0.8.1 実機で確認する項目

- モーター一覧：L1個・L2個・M1個・M2個の順と、各組の連続・角度・回転数・時間。実機の種類とポートを合わせて確認します。
- 「絶対角度で0度・90度」サンプル：A接続、最短で0度→時計回り90度→反時計回り0度。目印と待機を確認します。すでに目標位置なら回転しない場合があります。
- 絶対角度は本体標準の位置制御です。共通の台形・S字加減速や同期補正は適用しません。停止方法（ブレーキ・惰性・保持）は設定を引き継ぎます。
- 自動テスト71件、全17サンプルの生成・保存読込・Python構文を確認済み。新ブロックの実機動作は未確認です。

## CSV保存先修正の実機確認（v0.8.1）

保存した作品を読み込み直し、記録「Encoder_1」を開始する元のプログラムを再転送します。前進・記録・停止・後退を確認した後、右側の記録名にもEncoder_1を入力してCSVを取り出します。保存先は/flash/sbl_Encoder_1.csvです。

自動テストでは、ルート/への書込みを拒否して/flashだけ許可する環境で保存・読取りを確認しました。添付と同じ構成も模擬環境で前進・60行の記録・停止・後退まで完了しています。実機での保存・取出し・電源再投入後の保持は未確認です。保存失敗時は元のエラー（空き容量・権限・未対応機能等）がログに残り、回転命令へ進みません。

名前違いのCSVは/flashでENOENTとなり、旧保存先が未接続だとENODEVとなる組合せを再現し、記録名を確認する案内になることを確認しました。/flashそのもののENODEVや権限エラーは名前違いへ置き換えず、元のエラーを表示します。取り出し対象の記録名・保存先・読出し用番号を通信ログに表示します。

## v0.8.1 メモリ記録と同期診断

動作中は32KiBの固定バッファへ追加し、ファイルのopen/write/flushは行いません。「停止」→「記録を終える」で保存します。電源断・強制終了では未保存分を失います。最大1000行または32KiBに達すると停止し、それまでを終了処理で保存します。長い計測は周期を延ばしてください。

- 自動テスト74件。全20サンプルを生成・保存読込・Python構文確認。
- 加減速なし・台形・S字の3サンプルを模擬Hubで実行。各動作の記録、停止後だけのファイル書込み、加速・定速・減速のphaseを確認。
- 新ブロック「左右モーターの同期を100ミリ秒ごとに記録する」は、同じtime_sで9項目を記録。非同期処理の譲渡を挟まず左右を順に読み、sample_span_msも残します。
- phase：0停止/動作前、1加速、2定速、3減速、4連続。速度指令と実速度は大きさを度/秒で記録します。
- 確認用サンプルは左B・右A、直径56mm、20％、30cm。実物の配線・寸法を確認し、同期だけ無効に変えた版も記録名末尾Offで試します。
- 同期補正の計算式はEBLと共通のままです。今回の変更で車体のふらつきが解消したとは未確認です。記録なしでの比較、各条件3回、床・機体・電池等をそろえて確認してください。

## v0.8.1 同期補正の緩和と速度記録の修正

同期有効な2軸を対象に、先行量を指定速度比で正規化し、平滑化係数0.25・不感帯1度・最大15％の相対減速を適用します。5％以下の名目指令には同期減速をかけません。指令変化は525度/秒²を上限（整数丸めあり）とし、始動・指令0・方向変更・目標到達・明示停止を優先します。加減速の基本曲線はEBLと共通ですが、同期出力はSBL独自の緩和制御です。

実速度はmotor.velocity()を使わず、角度変化の絶対値×1000÷実測採取間隔ミリ秒で計算します。初回または採取間隔0では速度が定義できないため、初回を空欄とし同じ時刻での重複採取は行いません。各値は前回から今回までの区間平均です。本体API読取値のブロックは度/秒と表示しません。

自動試験78件。基準となる単軸・対称な26ケースでEBLとの照合を継続。非対称な応答遅れを持つ模擬モーター、正逆転、台形/S字、連続運転、低速指令、補正上限・指令変化幅・目標到達、記録速度の単位と不規則な採取間隔を検証しています。

実機では前回のSyscSOnと同じB/C接続・20％・30cm・S字0.5秒/0.5秒・100ms記録で再比較してください。記録名をSyncSNew等にして前のCSVを残し、同期無効でも比較します。特に加速初期の0指令と、定速中の左右交互の大幅減速が減るか、車体の揺れが改善するかを確認します。物理的なふらつき改善・停止精度は未確認です。


## v0.8.2 早期減速（2026-11-23）
- 自動試験79件成功。新規試験に96条件の非対称モーター応答モデルを含みます。20/50％、100/614/2046度、台形/S字、80～500ms遅れ、同期有効/無効で目標到達と停止直前の指令・実速度を確認。
- 正逆転、指令変化幅、低速時の非ゼロ、既存作品の保存読込、CSV記録などの既存試験も成功。時間指定のEBL基準照合を継続し、変更した角度減速を旧指令列へ合わせる判定は廃止。
- 実機未確認。実物のポート設定で20％・100cm・S字0.5/0.5秒、同期有効と無効を比較。採取200ms、停止→記録終了とし、減速区間の指令・区間平均実速度と車体動画を確認。長い走行は記録1000行/32KiBの上限に注意。


## v0.8.3 最低速度（2026-11-23）
標準8％、共通設定ブロック1〜100％を追加。旧作品は設定なしで8％。保存読込・コード生成を検証。角度・距離の始動／減速と同期補正で最低速度を守り、左右速度比と指定上限を維持。最低速度への減速距離を再計算します。
既存96応答条件に加え、低速停止・突発回転モデル24条件で旧3％の症状を再現し、新8/12％で回避・完走を確認。単軸、二軸、逆転、左右比、台形/S字を含みます。実機未確認。20％・100cm・S字0.5/0.5秒・最低8％・採取200msで再確認し、必要なら最低値10/12％へ調整してください。

終端速度域で400ms以上、角度変化2度未満の場合は全選択軸を停止し、最低速度または負荷の見直しを要求するエラーを通知します。自動再始動・自動増速はしません。停止後の記録保存は通常の終了処理に従います。模擬停動試験で400ms付近の検出と全軸停止を確認。

自動試験82件成功。20サンプルの生成Pythonを構文確認。マニュアル49ページの変更箇所を画像で確認。


## v0.8.4 低速区間の短縮（2026-11-23）
最低8％と同期補正を維持。応答が速いと観測できた場合だけ減速開始の余裕を短縮し、推定できない・遅い場合は従来の余裕を残す。旧v0.8.3の保存関数との32条件比較を追加。低速区間・全体時間が増えず、最低指令84度/秒と終端実速度105度/秒以下を確認。既存96応答条件、24低速停止モデル、停動検出も再確認。
実機未確認。旧版と同じ20％・100cm・S字0.5/0.5秒・最低8％・採取200msで3回比較し、8％指令区間の時間と停止直前の速度、角度差、車体動画を確認してください。短縮されない条件もあります。


## v0.8.5 残距離での減速（2026-11-23）
最低8％を維持し、経過時間の減速から残距離による速度再計算へ変更。加速・時間指定は従来どおり。旧v0.8.4の保存関数と32条件を比較し、8％区間660～1160ms、目標到達、終端指令84度/秒以下・模擬実速度105度/秒以下を確認。50％・約100cm・S字・80msモデルは2480→660ms。20％条件や応答が遅い条件では全体時間が長くなる場合があり、全条件の短縮は保証しない。
実機未確認。最低8％、20％と50％・100cm・S字0.5/0.5秒、採取200msで比較し、CSVと動画で停止の滑らかさを確認してください。


## v0.8.6 加減速の時間定義（2026-11-23）
名目指令の最低→最高を加速時間、最高→最低を減速時間とする。48条件で端点と途中のカーブ、短い時間・0秒8条件を確認。応答192条件・低速モデル24条件・停動検出を継続。旧EBLの指令列一致と旧版の低速区間時間は変更仕様の正解基準から外し、Q1000曲線の参照確認を維持。
実機未確認。最低8％・最高50％、加速0.5秒・減速0.1秒を基準に、指令と実速度を区別して確認。全体1秒の時間指定なら採取20msで指令変化を観察できる。長い走行を20ms記録すると1000行/32KiBを超えるため、100cmは採取200msなどへ戻す。


## v0.8.7 距離比率の別ブロック（2026-11-23）
秒指定と別のブロックを追加。100cm・10/10％の境界、S字/台形、符号反転、左右比、0％、合計100％を検証。96動作条件、12非対称応答条件、無効値拒否、方式切り替え、時間動作の明示拒否、保存読込を追加。サンプル21個、マニュアル50ページ。
実機未確認。サンプル「距離比率で加減速（10％・10％）」で配線・タイヤ径を確認し、記録名RatioRampのCSVと動画で最初/最後の10cmを比較。実速度の遅れ、床上距離のずれに注意。秒指定の作品の動作は維持しています。


## v0.8.8 弱い同期補正（2026-11-23）
90件の自動試験成功。指定条件80％・100cm・距離比率各20％・最低8％で216通りの模擬比較を追加。補正の指令変動低減、目標到達、最低速度維持、反転・無効化・停止時の履歴初期化を確認。
実機用サンプル「同期確認：80％・100cm・各20％」を追加（S字、同期有効、左B/右C、直径56mm、100ms記録、記録名Sync80On）。ポートと径は実物へ変更。同一条件で同期無効・記録名Sync80Offにして各3回比較してください。台形も同様。加速・減速区間、角度差、左右の実速度差と交互の指令変動、車体動画を比較し、記録なしでも試してください。
模擬応答の左右差3％では、新方式は旧方式より角度差が残る場合があります。弱い補正は方位を保証しません。床上のふらつき低減は実機未確認です。


## v0.9.0 音・制御・演算・データ・記録・変数・マイブロック・引数
EBL v0.25.6 / EBL-RT editor v0.34.2-ev3rt.1の基本パレット、順序、既定値を比較。文字列120 UTF-8バイト・厳密数値変換・文字位置、負数余り・丸め・乱数境界、音の範囲と完了待ち、数値変数初期値0、PID同一ms/60秒超、引数一覧、8引数/8戻り値の保存読込を検証。
自動試験101件成功。23サンプルの生成Pythonを構文確認。CommonDataを模擬Hubで通し実行し、text=こんにちはSPIKE、length=10、remainder=1、rounded=-1と終了音440Hz/300ms/音量25を確認。
実機では「共通データ・演算・CSV確認」を実行し、CommonData.csvを取り出す。モーターは動かさない。新共通音・文字列とCSVの通し操作、PID走行性能は実機未確認。同期補正・最低8％・加減速の既存回帰試験は維持。
参照元同士の差（EBL-RTの負数余り、EBL標準の小数乱数入力）はEBL-RT-COMMON-GROUPS.txtに記載。EBL/EBL-RT側ソースは今回未変更。


## v0.9.1 接続機器・現在値・反射光（2026-11-23）
Hub OS 1.8.149の102バイト実通知をsensor-notification-fixture.jsonへ固定。カラー通知の9バイト/反射光付き10バイトを完全なレコード境界と範囲で判定し、追加バイトによる誤読を修正。A/BのMモーター、Cの対象なし距離、EのLモーター、Fの黄7・反射光100・RGB606/459/404を確認。
旧形式・0/100％・色なし・混在・BLE分割/優先通知割込み・途中/未対応データの接続維持・部分表示防止を検証。受信待ち、3秒超未更新、停止中、エラー時の前回値、切断消去を検証。RGBからの反射光推測はしない。接続後自動開始し、通知だけを読み、プログラム転送や保存番号変更は行わない。
実機では再読み込み・再接続後に機器名を確認し、カラーへ白/黒を同じ高さで近づけて反射光変化を確認。実ログ再生は成功しているが、実機接続の再確認は未実施。

## v0.9.2 RGB saturation notification fix
User-provided four 102-byte Hub OS 1.8.149 snapshots replay as white (10), reflection 99%, RGB including 1024. RGB now accepts 0..1024; 1025/65535 and reflection 101 remain rejected. Legacy and extended layouts, complete-frame checks, and connected BLE state are covered. Physical sensor testing remains pending.

## v0.9.3 PID cooperative timing and snapshot recording
Removed fixed 10ms delays before statements. Checkpoints yield 1ms only when a 5ms CPU slice has elapsed; loop guards yield 1ms unconditionally. Explicit waits and blocking Hub operations remain awaited. PID equations and saved gains are unchanged.
New lab_log_pid receives four already-computed values, records at a configurable 20..60000ms interval, and appends one atomic five-row snapshot including actual call interval. No file operations during motion. Old recording blocks remain compatible.
Generated-code simulated-clock comparison with a 20ms explicit wait: historical four-item logging 140ms, new no logging / legacy four items / snapshot logging each 21ms (no real CPU/API cost). Cooperative fairness, straight-chain budgets, tick wrap, invalid settings, atomic capacity failures, save/reload, and a 120s/1000ms logging run are tested. Physical Hub timing, PID stability and stop responsiveness remain unverified.

## v0.9.4 My Block and variable presentation
My Block definitions/calls/returns/arguments use red; ordinary variables use orange. Call blocks omit the extra argument prefix. Flyout edit buttons are removed; definition context menu opens the existing editor through a registered block menu action. The 24 related existing tests passed. UI verified colors, flyout entries, call label and opening the definition editor. Additional direct checks covered return-call colors and restored argument labels. No Hub runtime/PID formula changes in this release; physical execution was not tested.

## v0.9.5 Absolute angle 360 alias
Absolute target integers 0..360 are accepted; 360 is normalized to 0 before motor.run_to_absolute_position. This applies equally to literal and computed inputs. SHORTEST_PATH, CLOCKWISE and COUNTERCLOCKWISE, configured stop mode and completion checks remain unchanged. Existing seven motor tests passed with explicit 360-to-0 cases, 359 preservation and rejection of negative, fractional and >360 targets. Documentation updated. Physical arm movement remains untested.

## v0.9.6 Absolute completion response compatibility
Reproduced the reported first-call failure with a generated, saved/reloaded argument-taking My Block called twice (E: 270 degrees then 0 degrees). Absolute moves now recognize READY and the observed one-item tuple (READY,) without accepting failed/malformed completion. Regression checks execute both calls for 0 and (0,), abort on failure, and verify final motor cleanup. Physical arm motion remains unverified.

## v0.9.7 Distance comparison without an echo
Dedicated distance comparisons now read the sensor once. Valid mm values compare in cm. No echo (-1 or None) is treated as no nearby target: GT/GTE/NEQ true, LT/LTE/EQ false. Numeric distance reporter and UI no-measurement display are unchanged. Disconnected-device OSError still propagates. A saved/reloaded argument-taking distance My Block now commands mirrored drive motors for no echo, 30cm, 20cm, then exits at 15cm and cleans up. All six operators and boundary values were tested; actual obstacle-approach motion remains unverified.

## v0.9.8 My Block flyout ordering
Flyout definitions sort by case-sensitive JavaScript character-code comparison, matching ASCII order for ASCII names. Numeric prefixes use lexical order (0, 10, 2); non-ASCII names use the same deterministic character ordering. Return-related entries stay adjacent to their definition call. Direct checks verified shuffled names, case/symbols/Japanese, save/reload and no workspace mutation. Existing 24 related tests passed. No motor runtime changes.

## v0.9.9 primary_school sample
The supplied workspace is stored unchanged in primary-school-sample.js and cloned on selection. primary_school is the first real sample option; all eleven My Block definitions, their arguments and detached blocks are retained. Validate original file, deep equality, independent sample clones, project save/reload and Python generation with every definition reachable. Ten existing sample/manual checks passed. Physical robot operation was not performed.

## v0.9.10 — Display and lamp category merge

Moved all four existing hub lamp blocks into the Display category after the 5x5 light blocks, with a separate section label. Block types and runtime are unchanged, preserving saved projects. Updated both HTML and PDF manual descriptions. Verify palette contents, existing samples, project round trips and generated Python. Physical hardware operation was not performed.

## v0.9.11 — Motor speed saturation

Finite commanded speed percentages clamp to [-100,100] after expression evaluation and before conversion to motor units. Profiles, straight driving, spin/pivot, steering and each tank wheel share the clamp. Direct power is also clamped. Absolute-position motion retains positive-speed/direction-selector semantics while clamping speeds above 100. Non-finite/non-numeric commands and unrelated setting/angle/time constraints still reject invalid values. Added save/reload generated-program coverage for literal, arithmetic and variable overshoots across 31 motor/movement forms, both signs where supported; helper checks cover boundaries, fractions, large finite values, NaN and infinity. Physical robot behavior is not tested.

## 専用同期モーター（0.11.3・実機未確認）
- 負荷を外し、A正/B逆・A正/B正・負の速さで方向を確認する。
- 20％で各90度、0.25回転、1秒を試し、停止後に各軸の角度を確認する。
- 連続同期→待つ→同期停止を試す。同じ連続命令を繰り返しても補正基準が維持されること。
- 途中で同期対象を変更すると旧対象が停止し、動きの左右設定は変わらないこと。
- 個別操作・停止で片側の同期を解除した場合、相手側も停止すること。
- 新旧作品、引数付きマイブロック内の設定・呼び出し、保存再読込を確認する。
- 台形・S字、距離比率、最低8％で確認。実際の負荷差・振動・停止精度は実機評価が必要。

## v0.11.3 ジャイロ旋回（実機未確認）

- 動きの「ジャイロで」ブロックでピボット／スピン、右／左を選択。共通左右設定を先に実行。本体は上面を上にして水平固定。
- サンプル「ジャイロでピボット・スピン」はB/Cで右ピボット90度→待機→左スピン90度。配線に合わせて変更。
- 速さ20％、角度45/90/180/360度を各5回。停止後の角度とばらつきを測る。8％・50％も別途確認する。
- 車輪を浮かせた場合は本体が旋回しないため停止検出になります。モーター方向を確認した後、広い床面で試す。
- 内部で10ms周期・残り角度に応じた減速・指令変化制限・最低速度・ブレーキ停止を使用。共通加減速と同期補正は適用しない。
- 模擬試験は実機の精度保証ではない。固着・測定不良・命令競合で両側が止まることも実機で確認する。

## v0.11.3 ジャイロ直進と旋回精度記録（実機未確認）

- サンプル「ジャイロ直進・後退」は左B/右C、56mm、速さ±20％・50cm、加減速各20％。配線と径を実物に合わせる。
- 同じ床で通常直進と比較。前後・時間/距離比率の台形/S字・最低速度8％・速さ20/50/80％を確認し、横ずれと停止距離を計測する。
- 補正は開始時の向きを維持。左右エンコーダの平均で距離を判断。共通同期補正を重ねず、元の同期設定は維持する。
- 直進の模擬試験は8/20/80/100％の正負、加減速なし・時間/距離の台形/S字、左右の応答差を含む。向きの±180度境界、読取失敗、片側固着、並行命令、停止も確認する。
- サンプル「ジャイロ右90度の精度を記録」は通常のCSVブロックでtarget_deg/actual_deg/error_degを各5回記録。左に変える場合は実測値の符号反転を外す。
- ジャイロ読取値と目標値の一致は実際の車体角度の保証ではない。床の目盛り等で停止角度を別に測る。±180度の折返しがあるため記録サンプルは45/90度用。

2026-11-25：自動試験136件通過。Windowsのコマンド長制限で実行できなかった加減速試験は、標準入力から実行する形に直して通過を確認。ローカル画面で両サンプルを開き、ジャイロ直進・後退のブロックと数値欄、記録用の3項目・5回繰り返し、および転送用プログラム生成の成功表示を確認。実機未確認。

## v0.11.3 ブロックとPythonの比較表示

- [ ] 教員・指導者用→Pythonを見るで左ブロック・右Python。ダイアログで編集を遮らない。
- [ ] 音などの数値変更、元に戻す／やり直す、サンプル・作品読込で自動更新する。
- [ ] 設定不足などのエラーでは直前の生成コードを消し、修復すると最新コードへ戻る。
- [ ] 境界をドラッグ、左右キー、Shift＋左右キー、Home/Endで調整。範囲外へ広げても両側を残す。
- [ ] 境界操作中のキャンセル、ウインドウ幅変更、閉じて再度開く操作でも編集領域が壊れない。
- [ ] 「作った処理へ」で最初のスタートの処理へ移動する。
- [ ] Pythonの閉じる／Escで全幅へ戻る。接続欄と切り替えてもBluetoothを切断しない。
- [ ] Chromebook相当の画面で数値欄を編集でき、Pythonは独立して上下・左右スクロールできる。

2026-11-26：既存139件と追加の実Blockly連携試験1件が通過（計140件）。生成コードの自動更新・エラー時の消去と復帰・幅調整・開閉を自動検証。実画面で左右表示を確認。ブラウザー操作の制約によりドラッグ・数値編集の一連の実画面確認は未完了。Bluetooth接続中の表示切替は実機未確認。


## v0.11.4 作ったPython・内部処理の分離（実機未確認）

- 初期表示はprogram.py。内部処理タブへの切替、再表示時の初期化、自動更新、エラー時に両方の古いコードを消すことを確認。
- ZIPのUTF-8・内容・CRC、2ファイル結合と実際の転送用ソースの一致、全サンプルの構文を自動確認。
- 日本語コメント、使える引数名の維持、予約語・記号・重複・内部名の回避、戻り値と保存読込を確認。
- 実機では転送して、連続するマイブロック、変数、メッセージ、停止・後処理、日本語引数の実行を再確認してください。
- program.py単独実行や通常のimport方式には対応しません。内部処理と結合して実行します。

2026-11-26 日本語／English切り替え：全147件の自動テストに合格。全サンプルの保存データとPython処理内容の一致、日本語の引数・マイブロック名の保持、英語Pythonの構文を確認。実画面で日英の往復切り替えとPythonコメントを確認。英語版でのBluetooth接続・転送は実機未確認。詳細マニュアルは日本語、英語簡易ガイドを追加。


## USB接続の受入確認（2026-11-26）

既存のBluetooth接続による英語版のプログラム転送は、ユーザーが実機で確認済み。以下のUSB接続は追加機能であり、実機未確認です。

1. ChromeまたはEdgeの通常タブでSBLを開き、データ通信対応USBケーブルで本体を接続する。
2. 「接続・転送」→「USBケーブル」→「接続する」で本体を選び、本体情報が表示されることを確認する。
3. ポートA〜Fの機器・センサー値が更新されることを確認する。
4. 「音だけ」または「表示・ライト」を空き番号へ転送し、完了表示と本体での実行を確認する。
5. 実行・停止、切断・再接続、日本語・英語の案内を確認する。
6. 転送途中にケーブルを抜いた場合、成功表示にならずエラーになることを確認する。
7. 通信ログを保存し、使用OS・ブラウザ・Hub OSと結果を記録する。

自動試験では、USBの選択・初期化、分割応答、CRC付き転送、実行・停止、センサー・コンソール、切断・タイムアウト・転送拒否・再接続を検証。


### USB初期接続タイムアウトの調査（usb2）

ユーザー実機でポートを開いた後のInfoRequestがタイムアウト。Bluetooth切断済み、本体再起動後も再現。原因は未特定。公式アプリと照合し、InfoRequestを2秒で1回だけ再送する処理を追加。初期送受信バイト数・完了フレーム数・USB VID/PID・送受信HEX（受信は先頭64バイト以内）を記録。診断採取は初期接続中のみ。プログラム転送・実行の自動再試行や本体リセットは行わない。

自動試験で初回応答欠落後の再送成功、無受信と未完結テキスト受信の区別、診断サイズ制限、従来Bluetoothの切断・タイムアウトを確認。実機での解消は未確認。

## Bluetooth after USB (transport3)
User verified USB connection, upload and robot execution on Hub OS 1.8.149. Switching from USB to Bluetooth reaches GATT notifications but info times out until hub reboot. Added the same bounded, read-only info retry to Bluetooth (2 attempts, 2 seconds each); no automatic run/upload/reset. Mock coverage verifies retry and exhausted retry cleanup. Real hardware switching remains unverified; this is a candidate fix, not a confirmed root cause.


## v0.11.5 本体スロットの削除（実機未確認）

- 教員・指導者用から本体名・番号を選択。初期未選択、未接続・通信中は削除不可。
- 確認キャンセルは通信しない。接続先変更・切断後は閉じて開き直す。
- 模擬BLE/USBで指定番号の停止確認→ClearSlot(0x46)→成功応答(0x47,0)を検証。NAK・不正応答・タイムアウトは成功表示しない。
- 一覧取得命令は標準公開仕様にないため、0〜19は全て保存有無未取得と表示。確認用コードの転送や実行はしない。
- 実機では不要なテスト用番号で削除し、他番号のプログラムが残ること、削除番号を選べなくなることを確認してください。実データの削除は今回行っていません。


## v1.0.0 距離センサーのランプ・本体ジャイロ（実機未確認）

- 表示の距離センサーランプ：明るさ0/100、中間値、未接続・非有限値・範囲外、他機器との同一ポート競合を確認。
- センサーのジャイロ角度・向きリセットは旧作品と同じ型と符号を維持。静止確認付き初期化を追加。
- 20ms採取、全3軸の変動0.5度以内を1秒確認。動けば確認期間をやり直し、最大時間ではリセットせず失敗。折返し・欠損・中断も検証。
- 実機では動かさずに開始し、角度0・点灯/消灯を確認。ドリフト防止・センサー内部校正は行わない。低減効果と実機動作は未確認。

- 角速度はangular_velocity(False)÷10、加速度はacceleration(False)のmG値。3軸の符号・単位・保存読込を模擬確認。
- ストール検知サンプルはB/C・20％・5秒直進。0.1秒周期、5度の進行が1秒なければ停止してから警告。正常・左右片側停止・両側停止・微小角度揺れを模擬検証。空転は検出対象外。

## v1.0.1 数値入力の全角・半角（本体動作は未確認）

数値欄へ「－１２．５」を入力・貼り付け、IME確定後に「-12.5」と「半角に直しました」が表示されること。半角入力では通知せず、名前・文字列の全角文字は保持すること。数値制約・保存再読込・Undoを確認。モーター計算・通信処理は変更していません。

## v1.0.2 サンプル・作品の読み込み修正

- ブラウザー用のキャッシュ識別子により、作品検証用のブロック一覧が別々に作られ、正しいブロックが未対応になる問題を修正。
- サンプル選択・作品を開く・自動保存の復元は同じ検証を利用します。現在の全サンプルを検証し、保存・再読込も確認します。
- 未対応のブロックと500個を超える作品の制限は維持します。
- サンプルを開くと現在の作品を置き換えます。残したい作品は先に保存してください。
- 公開後はページを再読み込みして v1.0.2 を確認してください。キャッシュが残る場合は Ctrl+Shift+R を使います。
- 今回は読み込み処理の修正です。モーター等の実機動作は未確認です。

## 共通ブロックの相互読み込み

[操作と検証範囲](PROJECT-INTEROP.md)。相互変換、変数・引数ID、8個の戻り値、未対応ブロックの保持と生成阻止、キャンセル、元作品の取り出しを検証。実機未確認。
