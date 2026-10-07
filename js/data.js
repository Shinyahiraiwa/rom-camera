// 関節可動域表示ならびに測定法（2022年4月改訂）
// 日本整形外科学会・日本リハビリテーション医学会・日本足の外科学会
// [Jpn J Rehabil Med 2021;58:1188-1200] [日整会誌 2022;96:75-86]
//
// geo.base の種類
//   seg   : 点a→点b の線（基本軸が骨など）
//   vert  : 点at を通る床への垂直線（iPadの傾きセンサーで補正）dir: down|up
//   horiz : 点at を通る水平線
//   perp  : 線a-b への垂線（点at を通る）
//   screenH / screenV : 画面の横線／縦線（真上から撮る場合など、重力が使えないとき）
// geo.move : [c, d] 点c→点d の線（移動軸）
// geo.mode : dir = 向きのある2本の線のなす角(0-180) / line = 線どうしの角(0-90)
// acc : A=カメラ向き（◎） B=条件付きで可（○） C=誤差大・参考値（△）
// models : AIで使うモデル。[] は手動配置のみ
// baseline : true のとき「開始肢位を0°として記録」→最終域との差で測る

export const VIEWS = {
  side:      { name: '側方（真横）', text: '測定側の真横から。カメラの高さは測る関節と同じ高さ、レンズは運動面（矢状面）に垂直に向ける。' },
  front:     { name: '前方（正面）', text: '被検者の正面から。カメラの高さは測る関節と同じ高さ、レンズは前額面に垂直に向ける。' },
  back:      { name: '後方（背面）', text: '被検者の真後ろから。カメラの高さは測る部位と同じ高さ、レンズは前額面に垂直に向ける。' },
  top:       { name: '上方（真上）', text: '被検者の頭上（または真上）からレンズを真下に向ける。iPadを床と平行に保つ（傾き表示が使えないため、画面の縦横を体の向きに合わせる）。' },
  handEnd:   { name: '手の先端側', text: '指先の側から前腕の長軸方向にのぞき込むように撮る。前腕の長軸とレンズの向きを一致させる。' },
  handRadial:{ name: '手の橈側', text: '手の橈側（母指側）の真横から。レンズは手関節の運動面に垂直に向ける。' },
  handDorsal:{ name: '手背側', text: '手背の真上から（手掌面に垂直に）撮る。前腕から指先までが画面に入るようにする。' },
  fingerSide:{ name: '指の側面', text: '測る指の真横から（屈伸の運動面に垂直に）近づいて撮る。隣の指が重ならないようにする。' },
  footTop:   { name: '足部の真上', text: '足背の真上からレンズを真下に向ける。踵から趾先までが画面に入るようにする。' },
  footBack:  { name: '踵の後方', text: '踵の真後ろ、足部の高さから前方に向けて撮る。下腿から足底までが画面に入るようにする。' },
  toeSide:   { name: '足趾の内側', text: '測る趾の真横（第1趾なら内側）から、屈伸の運動面に垂直に近づいて撮る。' },
};

const P = (id, label) => [id, label];

export const MOTIONS = [
  // ───────── 上肢 ─────────
  {
    id: 'sg-flex', group: '上肢', joint: '肩甲帯', name: '屈曲', ref: '0–20', refMax: 20,
    base: '両側の肩峰を結ぶ線', move: '頭頂と肩峰を結ぶ線',
    pos: '座位。頭上から見下ろして測定する。', view: 'top', acc: 'C', models: ['pose'],
    pts: [P('A', '頭頂'), P('B', '肩峰')],
    geo: { base: { t: 'screenH', at: 'A' }, move: ['A', 'B'], mode: 'line' }, baseline: true,
    note: '両側の肩峰を結ぶ線は運動とともに動くため、カメラでは「開始肢位の線」を基準にする。先に開始肢位を0°として記録してから最終域を撮る。',
    auto: L => ({ A: L.mid(L.p('ear'), L.o('ear')), B: L.p('shoulder') }),
  },
  {
    id: 'sg-ext', group: '上肢', joint: '肩甲帯', name: '伸展', ref: '0–20', refMax: 20,
    base: '両側の肩峰を結ぶ線', move: '頭頂と肩峰を結ぶ線',
    pos: '座位。頭上から見下ろして測定する。', view: 'top', acc: 'C', models: ['pose'],
    pts: [P('A', '頭頂'), P('B', '肩峰')],
    geo: { base: { t: 'screenH', at: 'A' }, move: ['A', 'B'], mode: 'line' }, baseline: true,
    note: '開始肢位を0°として記録してから最終域を撮る。',
    auto: L => ({ A: L.mid(L.p('ear'), L.o('ear')), B: L.p('shoulder') }),
  },
  {
    id: 'sg-elev', group: '上肢', joint: '肩甲帯', name: '挙上', ref: '0–20', refMax: 20,
    base: '両側の肩峰を結ぶ線', move: '肩峰と胸骨上縁を結ぶ線',
    pos: '背面から測定する（原法）。カメラでは胸骨上縁が見える前方から撮り、基本軸は開始肢位の両肩峰線（水平線）で近似する。', view: 'front', acc: 'C', models: ['pose'],
    pts: [P('A', '胸骨上縁'), P('B', '肩峰')],
    geo: { base: { t: 'horiz', at: 'A' }, move: ['A', 'B'], mode: 'line' }, baseline: true,
    note: '開始肢位を0°として記録してから最終域を撮ると、姿勢の傾きの影響を減らせる。',
    auto: L => ({ A: L.sternum(), B: L.p('shoulder') }),
  },
  {
    id: 'sg-dep', group: '上肢', joint: '肩甲帯', name: '引き下げ（下制）', ref: '0–10', refMax: 10,
    base: '両側の肩峰を結ぶ線', move: '肩峰と胸骨上縁を結ぶ線',
    pos: '背面から測定する（原法）。カメラでは前方から撮り、基本軸は開始肢位の両肩峰線（水平線）で近似する。', view: 'front', acc: 'C', models: ['pose'],
    pts: [P('A', '胸骨上縁'), P('B', '肩峰')],
    geo: { base: { t: 'horiz', at: 'A' }, move: ['A', 'B'], mode: 'line' }, baseline: true,
    note: '開始肢位を0°として記録してから最終域を撮る。',
    auto: L => ({ A: L.sternum(), B: L.p('shoulder') }),
  },
  {
    id: 'sh-flex', group: '上肢', joint: '肩', name: '屈曲（前方挙上）', ref: '0–180', refMax: 180,
    base: '肩峰を通る床への垂直線（立位または座位）', move: '上腕骨',
    pos: '前腕は中間位とする。体幹が動かないように固定する。脊柱が前後屈しないように注意する。', view: 'side', acc: 'A', models: ['pose'],
    pts: [P('A', '肩峰'), P('B', '上腕骨外側上顆')],
    geo: { base: { t: 'vert', at: 'A', dir: 'down' }, move: ['A', 'B'], mode: 'dir' },
    auto: L => ({ A: L.p('shoulder'), B: L.p('elbow') }),
  },
  {
    id: 'sh-ext', group: '上肢', joint: '肩', name: '伸展（後方挙上）', ref: '0–50', refMax: 50,
    base: '肩峰を通る床への垂直線（立位または座位）', move: '上腕骨',
    pos: '前腕は中間位とする。体幹が動かないように固定する。脊柱が前後屈しないように注意する。', view: 'side', acc: 'A', models: ['pose'],
    pts: [P('A', '肩峰'), P('B', '上腕骨外側上顆')],
    geo: { base: { t: 'vert', at: 'A', dir: 'down' }, move: ['A', 'B'], mode: 'dir' },
    auto: L => ({ A: L.p('shoulder'), B: L.p('elbow') }),
  },
  {
    id: 'sh-abd', group: '上肢', joint: '肩', name: '外転（側方挙上）', ref: '0–180', refMax: 180,
    base: '肩峰を通る床への垂直線（立位または座位）', move: '上腕骨',
    pos: '体幹の側屈が起こらないように、90°以上になったら前腕を回外することを原則とする。', view: 'front', acc: 'A', models: ['pose'],
    pts: [P('A', '肩峰'), P('B', '上腕骨外側上顆')],
    geo: { base: { t: 'vert', at: 'A', dir: 'down' }, move: ['A', 'B'], mode: 'dir' },
    auto: L => ({ A: L.p('shoulder'), B: L.p('elbow') }),
  },
  {
    id: 'sh-add', group: '上肢', joint: '肩', name: '内転', ref: '0', refMax: 0,
    base: '肩峰を通る床への垂直線（立位または座位）', move: '上腕骨',
    pos: '内転の可動域は「その他の検査法」（20°または45°屈曲位での内転）を参照。', view: 'front', acc: 'A', models: ['pose'],
    pts: [P('A', '肩峰'), P('B', '上腕骨外側上顆')],
    geo: { base: { t: 'vert', at: 'A', dir: 'down' }, move: ['A', 'B'], mode: 'dir' },
    auto: L => ({ A: L.p('shoulder'), B: L.p('elbow') }),
  },
  {
    id: 'sh-er1', group: '上肢', joint: '肩', name: '外旋（1st）', ref: '0–60', refMax: 60,
    base: '肘を通る前額面への垂直線', move: '尺骨',
    pos: '上腕を体幹に接して、肘関節を前方に90°屈曲した肢位で行う。前腕は中間位とする。', view: 'top', acc: 'C', models: ['pose'],
    pts: [P('A', '対側の肩峰'), P('B', '肩峰'), P('C', '肘頭'), P('D', '尺骨茎状突起')],
    geo: { base: { t: 'perp', a: 'A', b: 'B', at: 'C' }, move: ['C', 'D'], mode: 'line' },
    note: '真上から撮るため、AIの推定は外れやすい。点は手で合わせ直すこと。前額面＝両肩峰を結ぶ線として、その垂線を基本軸にしている。',
    auto: L => ({ A: L.o('shoulder'), B: L.p('shoulder'), C: L.p('elbow'), D: L.p('wrist') }),
  },
  {
    id: 'sh-ir1', group: '上肢', joint: '肩', name: '内旋（1st）', ref: '0–80', refMax: 80,
    base: '肘を通る前額面への垂直線', move: '尺骨',
    pos: '上腕を体幹に接して、肘関節を前方に90°屈曲した肢位で行う。前腕は中間位とする。', view: 'top', acc: 'C', models: ['pose'],
    pts: [P('A', '対側の肩峰'), P('B', '肩峰'), P('C', '肘頭'), P('D', '尺骨茎状突起')],
    geo: { base: { t: 'perp', a: 'A', b: 'B', at: 'C' }, move: ['C', 'D'], mode: 'line' },
    note: '真上から撮るため、AIの推定は外れやすい。前腕が体幹に当たる場合は体幹の前方で測る。',
    auto: L => ({ A: L.o('shoulder'), B: L.p('shoulder'), C: L.p('elbow'), D: L.p('wrist') }),
  },
  {
    id: 'sh-hflex', group: '上肢', joint: '肩', name: '水平屈曲（水平内転）', ref: '0–135', refMax: 135,
    base: '肩峰を通る矢状面への垂直線', move: '上腕骨',
    pos: '肩関節を90°外転位とする。', view: 'top', acc: 'B', models: ['pose'],
    pts: [P('A', '対側の肩峰'), P('B', '肩峰'), P('C', '上腕骨外側上顆')],
    geo: { base: { t: 'seg', a: 'A', b: 'B' }, move: ['B', 'C'], mode: 'dir' },
    note: '矢状面への垂直線＝両肩峰を結ぶ線の延長として扱っている。',
    auto: L => ({ A: L.o('shoulder'), B: L.p('shoulder'), C: L.p('elbow') }),
  },
  {
    id: 'sh-hext', group: '上肢', joint: '肩', name: '水平伸展（水平外転）', ref: '0–30', refMax: 30,
    base: '肩峰を通る矢状面への垂直線', move: '上腕骨',
    pos: '肩関節を90°外転位とする。', view: 'top', acc: 'B', models: ['pose'],
    pts: [P('A', '対側の肩峰'), P('B', '肩峰'), P('C', '上腕骨外側上顆')],
    geo: { base: { t: 'seg', a: 'A', b: 'B' }, move: ['B', 'C'], mode: 'dir' },
    auto: L => ({ A: L.o('shoulder'), B: L.p('shoulder'), C: L.p('elbow') }),
  },
  {
    id: 'el-flex', group: '上肢', joint: '肘', name: '屈曲', ref: '0–145', refMax: 145,
    base: '上腕骨', move: '橈骨', pos: '前腕は回外位とする。', view: 'side', acc: 'A', models: ['pose'],
    pts: [P('A', '肩峰'), P('B', '上腕骨外側上顆'), P('C', '橈骨茎状突起')],
    geo: { base: { t: 'seg', a: 'A', b: 'B' }, move: ['B', 'C'], mode: 'dir' },
    auto: L => ({ A: L.p('shoulder'), B: L.p('elbow'), C: L.p('wrist') }),
  },
  {
    id: 'el-ext', group: '上肢', joint: '肘', name: '伸展', ref: '0–5', refMax: 5,
    base: '上腕骨', move: '橈骨', pos: '前腕は回外位とする。', view: 'side', acc: 'A', models: ['pose'],
    pts: [P('A', '肩峰'), P('B', '上腕骨外側上顆'), P('C', '橈骨茎状突起')],
    geo: { base: { t: 'seg', a: 'A', b: 'B' }, move: ['B', 'C'], mode: 'dir' },
    auto: L => ({ A: L.p('shoulder'), B: L.p('elbow'), C: L.p('wrist') }),
  },
  {
    id: 'fa-pro', group: '上肢', joint: '前腕', name: '回内', ref: '0–90', refMax: 90,
    base: '上腕骨（床への垂直線）', move: '手指を伸展した手掌面',
    pos: '肩の回旋が入らないように肘を90°に屈曲する。', view: 'handEnd', acc: 'C', models: ['hand'],
    pts: [P('A', '示指MP関節（手掌面の橈側）'), P('B', '小指MP関節（手掌面の尺側）')],
    geo: { base: { t: 'vert', at: 'A', dir: 'down' }, move: ['A', 'B'], mode: 'line' },
    note: '前腕の長軸方向から撮るのが難しく、手掌面が斜めに写ると誤差が大きい。棒（鉛筆など）を握らせて棒の傾きに点を合わせると安定する。',
    auto: L => ({ A: L.h(5), B: L.h(17) }),
  },
  {
    id: 'fa-sup', group: '上肢', joint: '前腕', name: '回外', ref: '0–90', refMax: 90,
    base: '上腕骨（床への垂直線）', move: '手指を伸展した手掌面',
    pos: '肩の回旋が入らないように肘を90°に屈曲する。', view: 'handEnd', acc: 'C', models: ['hand'],
    pts: [P('A', '示指MP関節（手掌面の橈側）'), P('B', '小指MP関節（手掌面の尺側）')],
    geo: { base: { t: 'vert', at: 'A', dir: 'down' }, move: ['A', 'B'], mode: 'line' },
    note: '前腕の長軸方向から撮るのが難しく、誤差が大きい。棒（鉛筆など）を握らせて棒の傾きに点を合わせると安定する。',
    auto: L => ({ A: L.h(5), B: L.h(17) }),
  },
  {
    id: 'wr-flex', group: '上肢', joint: '手', name: '屈曲（掌屈）', ref: '0–90', refMax: 90,
    base: '橈骨', move: '第2中手骨', pos: '前腕は中間位とする。', view: 'handRadial', acc: 'A', models: ['pose', 'hand'],
    pts: [P('A', '橈骨頭（肘）'), P('B', '橈骨茎状突起'), P('C', '第2中手骨頭')],
    geo: { base: { t: 'seg', a: 'A', b: 'B' }, move: ['B', 'C'], mode: 'dir' },
    auto: L => ({ A: L.p('elbow'), B: L.h(0) || L.p('wrist'), C: L.h(5) || L.p('index') }),
  },
  {
    id: 'wr-ext', group: '上肢', joint: '手', name: '伸展（背屈）', ref: '0–70', refMax: 70,
    base: '橈骨', move: '第2中手骨', pos: '前腕は中間位とする。', view: 'handRadial', acc: 'A', models: ['pose', 'hand'],
    pts: [P('A', '橈骨頭（肘）'), P('B', '橈骨茎状突起'), P('C', '第2中手骨頭')],
    geo: { base: { t: 'seg', a: 'A', b: 'B' }, move: ['B', 'C'], mode: 'dir' },
    auto: L => ({ A: L.p('elbow'), B: L.h(0) || L.p('wrist'), C: L.h(5) || L.p('index') }),
  },
  {
    id: 'wr-rad', group: '上肢', joint: '手', name: '橈屈', ref: '0–25', refMax: 25,
    base: '前腕の中央線', move: '第3中手骨', pos: '前腕を回内位で行う。', view: 'handDorsal', acc: 'A', models: ['pose', 'hand'],
    pts: [P('A', '肘（前腕中央線の近位）'), P('B', '手関節中央'), P('C', '第3中手骨頭')],
    geo: { base: { t: 'seg', a: 'A', b: 'B' }, move: ['B', 'C'], mode: 'dir' },
    auto: L => ({ A: L.p('elbow'), B: L.h(0) || L.p('wrist'), C: L.h(9) }),
  },
  {
    id: 'wr-uln', group: '上肢', joint: '手', name: '尺屈', ref: '0–55', refMax: 55,
    base: '前腕の中央線', move: '第3中手骨', pos: '前腕を回内位で行う。', view: 'handDorsal', acc: 'A', models: ['pose', 'hand'],
    pts: [P('A', '肘（前腕中央線の近位）'), P('B', '手関節中央'), P('C', '第3中手骨頭')],
    geo: { base: { t: 'seg', a: 'A', b: 'B' }, move: ['B', 'C'], mode: 'dir' },
    auto: L => ({ A: L.p('elbow'), B: L.h(0) || L.p('wrist'), C: L.h(9) }),
  },

  // ───────── 手指 ─────────
  ...thumbAbd(),
  {
    id: 'th-mcp-flex', group: '手指', joint: '母指', name: '屈曲（MCP）', ref: '0–60', refMax: 60,
    base: '第1中手骨', move: '第1基節骨', pos: '原則として手指の背側に角度計をあてる。', view: 'fingerSide', acc: 'B', models: ['hand'],
    pts: [P('A', '第1中手骨底（CM関節）'), P('B', 'MP関節'), P('C', 'IP関節')],
    geo: { base: { t: 'seg', a: 'A', b: 'B' }, move: ['B', 'C'], mode: 'dir' },
    auto: L => ({ A: L.h(1), B: L.h(2), C: L.h(3) }),
  },
  {
    id: 'th-mcp-ext', group: '手指', joint: '母指', name: '伸展（MCP）', ref: '0–10', refMax: 10,
    base: '第1中手骨', move: '第1基節骨', pos: '原則として手指の背側に角度計をあてる。', view: 'fingerSide', acc: 'B', models: ['hand'],
    pts: [P('A', '第1中手骨底（CM関節）'), P('B', 'MP関節'), P('C', 'IP関節')],
    geo: { base: { t: 'seg', a: 'A', b: 'B' }, move: ['B', 'C'], mode: 'dir' },
    auto: L => ({ A: L.h(1), B: L.h(2), C: L.h(3) }),
  },
  {
    id: 'th-ip-flex', group: '手指', joint: '母指', name: '屈曲（IP）', ref: '0–80', refMax: 80,
    base: '第1基節骨', move: '第1末節骨', pos: '原則として手指の背側に角度計をあてる。', view: 'fingerSide', acc: 'B', models: ['hand'],
    pts: [P('A', 'MP関節'), P('B', 'IP関節'), P('C', '母指先端')],
    geo: { base: { t: 'seg', a: 'A', b: 'B' }, move: ['B', 'C'], mode: 'dir' },
    auto: L => ({ A: L.h(2), B: L.h(3), C: L.h(4) }),
  },
  {
    id: 'th-ip-ext', group: '手指', joint: '母指', name: '伸展（IP）', ref: '0–10', refMax: 10,
    base: '第1基節骨', move: '第1末節骨', pos: '原則として手指の背側に角度計をあてる。', view: 'fingerSide', acc: 'B', models: ['hand'],
    pts: [P('A', 'MP関節'), P('B', 'IP関節'), P('C', '母指先端')],
    geo: { base: { t: 'seg', a: 'A', b: 'B' }, move: ['B', 'C'], mode: 'dir' },
    auto: L => ({ A: L.h(2), B: L.h(3), C: L.h(4) }),
  },
  ...fingerJoints(),
  {
    id: 'fi-abd', group: '手指', joint: '指', name: '外転', ref: '—', refMax: null, finger: true,
    base: '第3中手骨延長線', move: '第2・4・5指軸（中指は橈側外転・尺側外転）', pos: '中指の運動は橈側外転、尺側外転とする。参考可動域の記載なし（「その他の検査法」では指先間の距離（cm）で表示）。',
    view: 'handDorsal', acc: 'B', models: ['hand'],
    pts: [P('A', '手関節中央'), P('B', '第3中手骨頭'), P('C', 'MP関節'), P('D', '指先')],
    geo: { base: { t: 'seg', a: 'A', b: 'B' }, move: ['C', 'D'], mode: 'dir' },
    auto: L => ({ A: L.h(0), B: L.h(9), C: L.f(0), D: L.f(3) }),
  },
  {
    id: 'fi-add', group: '手指', joint: '指', name: '内転', ref: '—', refMax: null, finger: true,
    base: '第3中手骨延長線', move: '第2・4・5指軸', pos: '参考可動域の記載なし。',
    view: 'handDorsal', acc: 'B', models: ['hand'],
    pts: [P('A', '手関節中央'), P('B', '第3中手骨頭'), P('C', 'MP関節'), P('D', '指先')],
    geo: { base: { t: 'seg', a: 'A', b: 'B' }, move: ['C', 'D'], mode: 'dir' },
    auto: L => ({ A: L.h(0), B: L.h(9), C: L.f(0), D: L.f(3) }),
  },

  // ───────── 下肢 ─────────
  {
    id: 'hp-flex', group: '下肢', joint: '股', name: '屈曲', ref: '0–125', refMax: 125,
    base: '体幹と平行な線', move: '大腿骨（大転子と大腿骨外顆の中心を結ぶ線）',
    pos: '骨盤と脊柱を十分に固定する。屈曲は背臥位、膝屈曲位で行う。', view: 'side', acc: 'A', models: ['pose'],
    pts: [P('A', '肩峰（体幹と平行な線上）'), P('B', '大転子'), P('C', '大腿骨外顆')],
    geo: { base: { t: 'seg', a: 'A', b: 'B' }, move: ['B', 'C'], mode: 'dir' },
    auto: L => ({ A: L.p('shoulder'), B: L.p('hip'), C: L.p('knee') }),
  },
  {
    id: 'hp-ext', group: '下肢', joint: '股', name: '伸展', ref: '0–15', refMax: 15,
    base: '体幹と平行な線', move: '大腿骨（大転子と大腿骨外顆の中心を結ぶ線）',
    pos: '骨盤と脊柱を十分に固定する。伸展は腹臥位、膝伸展位で行う。', view: 'side', acc: 'A', models: ['pose'],
    pts: [P('A', '肩峰（体幹と平行な線上）'), P('B', '大転子'), P('C', '大腿骨外顆')],
    geo: { base: { t: 'seg', a: 'A', b: 'B' }, move: ['B', 'C'], mode: 'dir' },
    auto: L => ({ A: L.p('shoulder'), B: L.p('hip'), C: L.p('knee') }),
  },
  {
    id: 'hp-abd', group: '下肢', joint: '股', name: '外転', ref: '0–45', refMax: 45,
    base: '両側の上前腸骨棘を結ぶ線への垂直線', move: '大腿中央線（上前腸骨棘より膝蓋骨中心を結ぶ線）',
    pos: '背臥位で骨盤を固定する。下肢は外旋しないようにする。', view: 'top', acc: 'B', models: ['pose'],
    viewExtra: '背臥位では真上から。立位で代用する場合は前方から撮る。',
    pts: [P('A', '対側の上前腸骨棘'), P('B', '上前腸骨棘'), P('C', '膝蓋骨中心')],
    geo: { base: { t: 'perp', a: 'A', b: 'B', at: 'B' }, move: ['B', 'C'], mode: 'line' },
    note: 'AIの股関節点は上前腸骨棘より内側・下方に出るため、点を手で合わせ直すこと。',
    auto: L => ({ A: L.o('hip'), B: L.p('hip'), C: L.p('knee') }),
  },
  {
    id: 'hp-add', group: '下肢', joint: '股', name: '内転', ref: '0–20', refMax: 20,
    base: '両側の上前腸骨棘を結ぶ線への垂直線', move: '大腿中央線（上前腸骨棘より膝蓋骨中心を結ぶ線）',
    pos: '背臥位で骨盤を固定する。反対側の下肢を屈曲挙上してその下を通して内転させる。', view: 'top', acc: 'B', models: ['pose'],
    viewExtra: '背臥位では真上から。立位で代用する場合は前方から撮る。',
    pts: [P('A', '対側の上前腸骨棘'), P('B', '上前腸骨棘'), P('C', '膝蓋骨中心')],
    geo: { base: { t: 'perp', a: 'A', b: 'B', at: 'B' }, move: ['B', 'C'], mode: 'line' },
    auto: L => ({ A: L.o('hip'), B: L.p('hip'), C: L.p('knee') }),
  },
  {
    id: 'hp-er', group: '下肢', joint: '股', name: '外旋', ref: '0–45', refMax: 45,
    base: '膝蓋骨より下ろした垂直線', move: '下腿中央線（膝蓋骨中心より足関節内外果中央を結ぶ線）',
    pos: '背臥位で、股関節と膝関節を90°屈曲位にして行う。骨盤の代償を少なくする。', view: 'front', acc: 'C', models: ['pose'],
    viewExtra: '原法（背臥位）では足側から下腿の運動面を正面に見る。端座位で代用する場合は正面・膝の高さから撮る。',
    pts: [P('A', '膝蓋骨中心'), P('B', '足関節内外果中央')],
    geo: { base: { t: 'vert', at: 'A', dir: 'down' }, move: ['A', 'B'], mode: 'line' },
    note: '回旋運動は運動面にカメラを正対させにくく、誤差が大きい。iPadを水平（真上から）にしたときは画面の縦線を基準にする。',
    auto: L => ({ A: L.p('knee'), B: L.p('ankle') }),
  },
  {
    id: 'hp-ir', group: '下肢', joint: '股', name: '内旋', ref: '0–45', refMax: 45,
    base: '膝蓋骨より下ろした垂直線', move: '下腿中央線（膝蓋骨中心より足関節内外果中央を結ぶ線）',
    pos: '背臥位で、股関節と膝関節を90°屈曲位にして行う。骨盤の代償を少なくする。', view: 'front', acc: 'C', models: ['pose'],
    viewExtra: '原法（背臥位）では足側から下腿の運動面を正面に見る。端座位で代用する場合は正面・膝の高さから撮る。',
    pts: [P('A', '膝蓋骨中心'), P('B', '足関節内外果中央')],
    geo: { base: { t: 'vert', at: 'A', dir: 'down' }, move: ['A', 'B'], mode: 'line' },
    note: '回旋運動は運動面にカメラを正対させにくく、誤差が大きい。',
    auto: L => ({ A: L.p('knee'), B: L.p('ankle') }),
  },
  {
    id: 'kn-flex', group: '下肢', joint: '膝', name: '屈曲', ref: '0–130', refMax: 130,
    base: '大腿骨', move: '腓骨（腓骨頭と外果を結ぶ線）', pos: '屈曲は股関節を屈曲位で行う。', view: 'side', acc: 'A', models: ['pose'],
    pts: [P('A', '大転子'), P('B', '大腿骨外顆（腓骨頭）'), P('C', '外果')],
    geo: { base: { t: 'seg', a: 'A', b: 'B' }, move: ['B', 'C'], mode: 'dir' },
    auto: L => ({ A: L.p('hip'), B: L.p('knee'), C: L.p('ankle') }),
  },
  {
    id: 'kn-ext', group: '下肢', joint: '膝', name: '伸展', ref: '0', refMax: 0,
    base: '大腿骨', move: '腓骨（腓骨頭と外果を結ぶ線）', pos: '', view: 'side', acc: 'A', models: ['pose'],
    pts: [P('A', '大転子'), P('B', '大腿骨外顆（腓骨頭）'), P('C', '外果')],
    geo: { base: { t: 'seg', a: 'A', b: 'B' }, move: ['B', 'C'], mode: 'dir' },
    auto: L => ({ A: L.p('hip'), B: L.p('knee'), C: L.p('ankle') }),
  },

  // ───────── 足関節・足部・趾 ─────────
  {
    id: 'ft-abd', group: '足部・趾', joint: '足関節・足部', name: '外転', ref: '0–10', refMax: 10,
    base: '第2中足骨長軸', move: '第2中足骨長軸', pos: '膝関節を屈曲位、足関節を0度で行う。', view: 'footTop', acc: 'C', models: [],
    pts: [P('A', '踵（第2中足骨長軸の延長）'), P('B', '第2中足骨頭')],
    geo: { base: { t: 'screenV', at: 'A', dir: 'up' }, move: ['A', 'B'], mode: 'dir' }, baseline: true,
    note: '基本軸は開始肢位の第2中足骨長軸。先に開始肢位を0°として記録し、最終域との差を測る。点は手で置く。',
  },
  {
    id: 'ft-add', group: '足部・趾', joint: '足関節・足部', name: '内転', ref: '0–20', refMax: 20,
    base: '第2中足骨長軸', move: '第2中足骨長軸', pos: '膝関節を屈曲位、足関節を0度で行う。', view: 'footTop', acc: 'C', models: [],
    pts: [P('A', '踵（第2中足骨長軸の延長）'), P('B', '第2中足骨頭')],
    geo: { base: { t: 'screenV', at: 'A', dir: 'up' }, move: ['A', 'B'], mode: 'dir' }, baseline: true,
    note: '基本軸は開始肢位の第2中足骨長軸。先に開始肢位を0°として記録し、最終域との差を測る。点は手で置く。',
  },
  {
    id: 'ft-df', group: '足部・趾', joint: '足関節・足部', name: '背屈', ref: '0–20', refMax: 20,
    base: '矢状面における腓骨長軸への垂直線', move: '足底面', pos: '膝関節を屈曲位で行う。', view: 'side', acc: 'B', models: ['pose'],
    pts: [P('A', '腓骨頭'), P('B', '外果'), P('C', '足底（踵）'), P('D', '足底（第5中足骨頭）')],
    geo: { base: { t: 'perp', a: 'A', b: 'B', at: 'C' }, move: ['C', 'D'], mode: 'line' },
    note: 'AIの踵・つま先の点は足底面からずれやすい。足底のラインに合わせ直すこと。',
    auto: L => ({ A: L.p('knee'), B: L.p('ankle'), C: L.p('heel'), D: L.p('foot') }),
  },
  {
    id: 'ft-pf', group: '足部・趾', joint: '足関節・足部', name: '底屈', ref: '0–45', refMax: 45,
    base: '矢状面における腓骨長軸への垂直線', move: '足底面', pos: '膝関節を屈曲位で行う。', view: 'side', acc: 'B', models: ['pose'],
    pts: [P('A', '腓骨頭'), P('B', '外果'), P('C', '足底（踵）'), P('D', '足底（第5中足骨頭）')],
    geo: { base: { t: 'perp', a: 'A', b: 'B', at: 'C' }, move: ['C', 'D'], mode: 'line' },
    note: 'AIの踵・つま先の点は足底面からずれやすい。足底のラインに合わせ直すこと。',
    auto: L => ({ A: L.p('knee'), B: L.p('ankle'), C: L.p('heel'), D: L.p('foot') }),
  },
  {
    id: 'ft-inv', group: '足部・趾', joint: '足関節・足部', name: '内がえし', ref: '0–30', refMax: 30,
    base: '前額面における下腿軸への垂直線', move: '足底面', pos: '膝関節を屈曲位、足関節を0度で行う。', view: 'footBack', acc: 'C', models: ['pose'],
    pts: [P('A', '下腿中央（近位）'), P('B', '内外果中央'), P('C', '足底の内側縁'), P('D', '足底の外側縁')],
    geo: { base: { t: 'perp', a: 'A', b: 'B', at: 'B' }, move: ['C', 'D'], mode: 'line' },
    note: '足底面の傾きを1本の線で近似するため誤差が大きい。足底の内側縁・外側縁は手で置くこと。',
    auto: L => ({ A: L.p('knee'), B: L.p('ankle') }),
  },
  {
    id: 'ft-eve', group: '足部・趾', joint: '足関節・足部', name: '外がえし', ref: '0–20', refMax: 20,
    base: '前額面における下腿軸への垂直線', move: '足底面', pos: '膝関節を屈曲位、足関節を0度で行う。', view: 'footBack', acc: 'C', models: ['pose'],
    pts: [P('A', '下腿中央（近位）'), P('B', '内外果中央'), P('C', '足底の内側縁'), P('D', '足底の外側縁')],
    geo: { base: { t: 'perp', a: 'A', b: 'B', at: 'B' }, move: ['C', 'D'], mode: 'line' },
    note: '足底面の傾きを1本の線で近似するため誤差が大きい。足底の内側縁・外側縁は手で置くこと。',
    auto: L => ({ A: L.p('knee'), B: L.p('ankle') }),
  },
  ...toeJoints(),

  // ───────── 体幹 ─────────
  {
    id: 'cv-flex', group: '体幹', joint: '頚部', name: '屈曲（前屈）', ref: '0–60', refMax: 60,
    base: '肩峰を通る床への垂直線', move: '外耳孔と頭頂を結ぶ線', pos: '頭部体幹の側面で行う。原則として腰かけ座位とする。', view: 'side', acc: 'B', models: ['pose'],
    pts: [P('A', '肩峰'), P('B', '外耳孔'), P('C', '頭頂')],
    geo: { base: { t: 'vert', at: 'A', dir: 'up' }, move: ['B', 'C'], mode: 'dir' },
    note: '頭頂はAIでは推定値（耳と目の位置から計算）。髪型で見えにくいので手で合わせ直すこと。',
    auto: L => ({ A: L.p('shoulder'), B: L.p('ear'), C: L.vertexSide() }),
  },
  {
    id: 'cv-ext', group: '体幹', joint: '頚部', name: '伸展（後屈）', ref: '0–50', refMax: 50,
    base: '肩峰を通る床への垂直線', move: '外耳孔と頭頂を結ぶ線', pos: '頭部体幹の側面で行う。原則として腰かけ座位とする。', view: 'side', acc: 'B', models: ['pose'],
    pts: [P('A', '肩峰'), P('B', '外耳孔'), P('C', '頭頂')],
    geo: { base: { t: 'vert', at: 'A', dir: 'up' }, move: ['B', 'C'], mode: 'dir' },
    note: '頭頂はAIでは推定値。手で合わせ直すこと。',
    auto: L => ({ A: L.p('shoulder'), B: L.p('ear'), C: L.vertexSide() }),
  },
  {
    id: 'cv-rot', group: '体幹', joint: '頚部', name: '回旋', ref: '左右 0–60', refMax: 60, dirLR: true,
    base: '両側の肩峰を結ぶ線への垂直線', move: '鼻梁と後頭結節を結ぶ線', pos: '腰かけ座位で行う。', view: 'top', acc: 'C', models: ['pose'],
    pts: [P('A', '左肩峰'), P('B', '右肩峰'), P('C', '後頭結節'), P('D', '鼻梁')],
    geo: { base: { t: 'perp', a: 'A', b: 'B', at: 'C' }, move: ['C', 'D'], mode: 'line' },
    note: '真上から撮るためAIの推定は外れやすい。点は手で合わせ直すこと。',
    auto: L => ({ A: L.L('shoulder'), B: L.R('shoulder'), C: L.mid(L.L('ear'), L.R('ear')), D: L.pose(0) }),
  },
  {
    id: 'cv-lat', group: '体幹', joint: '頚部', name: '側屈', ref: '左右 0–50', refMax: 50, dirLR: true,
    base: '第7頚椎棘突起と第1仙椎の棘突起を結ぶ線', move: '頭頂と第7頚椎棘突起を結ぶ線', pos: '体幹の背面で行う。腰かけ座位とする。', view: 'back', acc: 'B', models: ['pose'],
    pts: [P('A', '第1仙椎棘突起'), P('B', '第7頚椎棘突起'), P('C', '頭頂')],
    geo: { base: { t: 'seg', a: 'A', b: 'B' }, move: ['B', 'C'], mode: 'dir' },
    note: 'C7・S1・頭頂はAIでは肩・股・耳からの推定値。触察した位置に合わせ直すこと。',
    auto: L => ({ A: L.mid(L.L('hip'), L.R('hip')), B: L.c7(), C: L.vertexBack() }),
  },
  {
    id: 'tl-flex', group: '体幹', joint: '胸腰部', name: '屈曲（前屈）', ref: '0–45', refMax: 45,
    base: '仙骨後面', move: '第1胸椎棘突起と第5腰椎棘突起を結ぶ線', pos: '体幹側面より行う。立位、腰かけ座位または側臥位で行う。股関節の運動が入らないように行う。', view: 'side', acc: 'C', models: ['pose'],
    pts: [P('A', '仙骨後面（下端）'), P('B', '仙骨後面（上端）'), P('C', '第5腰椎棘突起'), P('D', '第1胸椎棘突起')],
    geo: { base: { t: 'seg', a: 'A', b: 'B' }, move: ['C', 'D'], mode: 'dir' }, baseline: true,
    note: '開始肢位でも仙骨後面と胸腰椎の線は平行ではないため、先に開始肢位を0°として記録し、最終域との差を測る。棘突起はAIでは推定できないので手で置く。',
    auto: L => ({ C: L.p('hip'), D: L.p('shoulder') }),
  },
  {
    id: 'tl-ext', group: '体幹', joint: '胸腰部', name: '伸展（後屈）', ref: '0–30', refMax: 30,
    base: '仙骨後面', move: '第1胸椎棘突起と第5腰椎棘突起を結ぶ線', pos: '体幹側面より行う。立位、腰かけ座位または側臥位で行う。股関節の運動が入らないように行う。', view: 'side', acc: 'C', models: ['pose'],
    pts: [P('A', '仙骨後面（下端）'), P('B', '仙骨後面（上端）'), P('C', '第5腰椎棘突起'), P('D', '第1胸椎棘突起')],
    geo: { base: { t: 'seg', a: 'A', b: 'B' }, move: ['C', 'D'], mode: 'dir' }, baseline: true,
    note: '先に開始肢位を0°として記録し、最終域との差を測る。棘突起は手で置く。',
    auto: L => ({ C: L.p('hip'), D: L.p('shoulder') }),
  },
  {
    id: 'tl-rot', group: '体幹', joint: '胸腰部', name: '回旋', ref: '左右 0–40', refMax: 40, dirLR: true,
    base: '両側の後上腸骨棘を結ぶ線', move: '両側の肩峰を結ぶ線', pos: '座位で骨盤を固定して行う。', view: 'top', acc: 'C', models: ['pose'],
    pts: [P('A', '左後上腸骨棘'), P('B', '右後上腸骨棘'), P('C', '左肩峰'), P('D', '右肩峰')],
    geo: { base: { t: 'seg', a: 'A', b: 'B' }, move: ['C', 'D'], mode: 'line' },
    note: '真上から撮るため骨盤が肩に隠れやすい。後上腸骨棘にシールを貼ると置きやすい。',
    auto: L => ({ A: L.L('hip'), B: L.R('hip'), C: L.L('shoulder'), D: L.R('shoulder') }),
  },
  {
    id: 'tl-lat', group: '体幹', joint: '胸腰部', name: '側屈', ref: '左右 0–50', refMax: 50, dirLR: true,
    base: 'ヤコビー線の中点にたてた垂直線', move: '第1胸椎棘突起と第5腰椎棘突起を結ぶ線', pos: '体幹の背面で行う。腰かけ座位または立位で行う。', view: 'back', acc: 'B', models: ['pose'],
    pts: [P('A', 'ヤコビー線の中点'), P('B', '第5腰椎棘突起'), P('C', '第1胸椎棘突起')],
    geo: { base: { t: 'vert', at: 'A', dir: 'up' }, move: ['B', 'C'], mode: 'dir' },
    note: '棘突起はAIでは股・肩からの推定値。触察した位置に合わせ直すこと。',
    auto: L => ({ A: L.jacoby(), B: L.jacoby(), C: L.c7() }),
  },

  // ───────── その他の検査法 ─────────
  {
    id: 'sh-er2', group: 'その他', joint: '肩', name: '外旋（2nd）', ref: '0–90', refMax: 90,
    base: '肘を通る前額面への垂直線', move: '尺骨', pos: '前腕は中間位とする。肩関節は90°外転し、かつ肘関節は90°屈曲した肢位で行う。', view: 'side', acc: 'B', models: ['pose'],
    pts: [P('A', '肘頭'), P('B', '尺骨茎状突起')],
    geo: { base: { t: 'horiz', at: 'A' }, move: ['A', 'B'], mode: 'line' },
    note: '前額面への垂直線＝肘を通る水平線（前方向）として扱う。上腕がカメラの方を向くので、肘の位置は手で確認すること。',
    auto: L => ({ A: L.p('elbow'), B: L.p('wrist') }),
  },
  {
    id: 'sh-ir2', group: 'その他', joint: '肩', name: '内旋（2nd）', ref: '0–70', refMax: 70,
    base: '肘を通る前額面への垂直線', move: '尺骨', pos: '前腕は中間位とする。肩関節は90°外転し、かつ肘関節は90°屈曲した肢位で行う。', view: 'side', acc: 'B', models: ['pose'],
    pts: [P('A', '肘頭'), P('B', '尺骨茎状突起')],
    geo: { base: { t: 'horiz', at: 'A' }, move: ['A', 'B'], mode: 'line' },
    note: '前額面への垂直線＝肘を通る水平線（前方向）として扱う。',
    auto: L => ({ A: L.p('elbow'), B: L.p('wrist') }),
  },
  {
    id: 'sh-add2', group: 'その他', joint: '肩', name: '内転（20°/45°屈曲位）', ref: '0–75', refMax: 75,
    base: '肩峰を通る床への垂直線', move: '上腕骨', pos: '20°または45°肩関節屈曲位で行う。立位で行う。', view: 'front', acc: 'B', models: ['pose'],
    pts: [P('A', '肩峰'), P('B', '上腕骨外側上顆')],
    geo: { base: { t: 'vert', at: 'A', dir: 'down' }, move: ['A', 'B'], mode: 'dir' },
    note: '屈曲位のため上腕が前額面から外れ、正面像では角度が小さく出やすい。',
    auto: L => ({ A: L.p('shoulder'), B: L.p('elbow') }),
  },
];

function thumbAbd() {
  const common = {
    group: '手指', joint: '母指', base: '示指（橈骨の延長上）', move: '母指', models: ['hand'], acc: 'B',
    pts: [P('A', '第2中手骨底'), P('B', '第2中手骨頭（示指MP）'), P('C', '第1中手骨底（CM関節）'), P('D', '母指MP関節')],
    geo: { base: { t: 'seg', a: 'A', b: 'B' }, move: ['C', 'D'], mode: 'dir' },
    auto: L => ({ A: L.h(0), B: L.h(5), C: L.h(1), D: L.h(2) }),
    note: 'AIの第2中手骨底は手関節中央で代用している。',
  };
  return [
    { ...common, id: 'th-rabd', name: '橈側外転', ref: '0–60', refMax: 60, view: 'handDorsal', pos: '運動は手掌面とする。' },
    { ...common, id: 'th-uadd', name: '尺側内転', ref: '0', refMax: 0, view: 'handDorsal', pos: '運動は手掌面とする。' },
    { ...common, id: 'th-pabd', name: '掌側外転', ref: '0–90', refMax: 90, view: 'handRadial', pos: '運動は手掌面に直角な面とする。' },
    { ...common, id: 'th-padd', name: '掌側内転', ref: '0', refMax: 0, view: 'handRadial', pos: '運動は手掌面に直角な面とする。' },
  ];
}

function fingerJoints() {
  // f(0)=MP, f(1)=PIP, f(2)=DIP, f(3)=指先（選んだ指）
  const defs = [
    ['mcp', 'MCP', '第2–5中手骨', '第2–5基節骨', [P('A', '手関節（中手骨底）'), P('B', 'MP関節'), P('C', 'PIP関節')], L => ({ A: L.h(0), B: L.f(0), C: L.f(1) }),
      [['flex', '屈曲', '0–90', 90], ['ext', '伸展', '0–45', 45]], ''],
    ['pip', 'PIP', '第2–5基節骨', '第2–5中節骨', [P('A', 'MP関節'), P('B', 'PIP関節'), P('C', 'DIP関節')], L => ({ A: L.f(0), B: L.f(1), C: L.f(2) }),
      [['flex', '屈曲', '0–100', 100], ['ext', '伸展', '0', 0]], ''],
    ['dip', 'DIP', '第2–5中節骨', '第2–5末節骨', [P('A', 'PIP関節'), P('B', 'DIP関節'), P('C', '指先')], L => ({ A: L.f(1), B: L.f(2), C: L.f(3) }),
      [['flex', '屈曲', '0–80', 80], ['ext', '伸展', '0', 0]], 'DIPは10°の過伸展をとりうる。'],
  ];
  const out = [];
  for (const [k, jn, base, move, pts, auto, motions, extra] of defs) {
    for (const [mk, mn, ref, max] of motions) {
      out.push({
        id: `fi-${k}-${mk}`, group: '手指', joint: '指', name: `${mn}（${jn}）`, ref, refMax: max, finger: true,
        base, move, pos: ('原則として手指の背側に角度計をあてる。' + extra).trim(), view: 'fingerSide', acc: 'B', models: ['hand'],
        pts, geo: { base: { t: 'seg', a: 'A', b: 'B' }, move: ['B', 'C'], mode: 'dir' }, auto,
      });
    }
  }
  return out;
}

function toeJoints() {
  const defs = [
    ['t1-mtp', '第1趾', 'MTP', '第1中足骨', '第1基節骨', [P('A', '第1中足骨底'), P('B', 'MTP関節'), P('C', 'IP関節')], [['flex', '屈曲', '0–35', 35], ['ext', '伸展', '0–60', 60]]],
    ['t1-ip', '第1趾', 'IP', '第1基節骨', '第1末節骨', [P('A', 'MTP関節'), P('B', 'IP関節'), P('C', '趾先')], [['flex', '屈曲', '0–60', 60], ['ext', '伸展', '0', 0]]],
    ['t-mtp', '趾', 'MTP', '第2–5中足骨', '第2–5基節骨', [P('A', '中足骨底'), P('B', 'MTP関節'), P('C', 'PIP関節')], [['flex', '屈曲', '0–35', 35], ['ext', '伸展', '0–40', 40]]],
    ['t-pip', '趾', 'PIP', '第2–5基節骨', '第2–5中節骨', [P('A', 'MTP関節'), P('B', 'PIP関節'), P('C', 'DIP関節')], [['flex', '屈曲', '0–35', 35], ['ext', '伸展', '0', 0]]],
    ['t-dip', '趾', 'DIP', '第2–5中節骨', '第2–5末節骨', [P('A', 'PIP関節'), P('B', 'DIP関節'), P('C', '趾先')], [['flex', '屈曲', '0–50', 50], ['ext', '伸展', '0', 0]]],
  ];
  const out = [];
  for (const [k, joint, jn, base, move, pts, motions] of defs) {
    for (const [mk, mn, ref, max] of motions) {
      out.push({
        id: `${k}-${mk}`, group: '足部・趾', joint: joint === '第1趾' ? '第1趾（母趾）' : '趾', name: `${mn}（${jn}）`, ref, refMax: max,
        base, move, pos: '原則として趾の背側に角度計をあてる。', view: 'toeSide', acc: 'B', models: [],
        pts, geo: { base: { t: 'seg', a: 'A', b: 'B' }, move: ['B', 'C'], mode: 'dir' },
        note: '足趾はAIで推定できないため、点を手で置く。',
      });
    }
  }
  return out;
}

export const GROUPS = ['上肢', '手指', '下肢', '足部・趾', '体幹', 'その他'];
export const ACC = {
  A: { mark: '◎', label: 'カメラ向き', cls: 'acc-a' },
  B: { mark: '○', label: '条件付き', cls: 'acc-b' },
  C: { mark: '△', label: '参考値（誤差大）', cls: 'acc-c' },
};
