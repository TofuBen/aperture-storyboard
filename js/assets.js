/*!
 * APERTURE — 可插入矢量素材库 v1
 * 传统 script（非 ES module），加载后暴露 window.SB_ASSETS。
 *
 * 58 个素材：person 12 / face 8 / part 8 / prop 12 / scene 10 / mark 8
 * 本地坐标左上为 (0,0)，插入画布按 1:1 使用。
 * 视觉语言与分镜预设一致：墨线 + 灰阶 + 米白纸面，黑白导演手绘感。
 * 人物 = 圆形头 + 矩形躯干 + 长条四肢的模块化几何体，姿势一眼可读。
 */
(function () {
  'use strict';

  /* ==========================================================================
   * 0. 调色板、绘图基元与人物模块
   * ========================================================================== */
  const INK   = '#141414'; // 主墨线
  const GRAY  = '#3b3a37'; // 暗部 / 剪影
  const MID   = '#6f6c66'; // 中灰 / 结构线
  const SOFT  = '#a9a49a'; // 浅灰 / 辅助线
  const PALE  = '#ded9cf'; // 米灰 / 亮部
  const PAPER = '#f4f1e8'; // 米白纸面

  const p  = (d, o) => Object.assign({ type: 'path', d: d, stroke: INK, width: 6, fill: 'none', opacity: 1, dash: '' }, o);
  const ln = (x1, y1, x2, y2, o) => Object.assign({ type: 'line', x1: x1, y1: y1, x2: x2, y2: y2, stroke: INK, width: 6, opacity: 1, dash: '', arrowEnd: false }, o);
  const rc = (x, y, w, h, o) => Object.assign({ type: 'rect', x: x, y: y, w: w, h: h, rx: 0, stroke: INK, width: 6, fill: 'none', opacity: 1 }, o);
  const el = (cx, cy, rx, ry, o) => Object.assign({ type: 'ellipse', cx: cx, cy: cy, rx: rx, ry: ry, stroke: INK, width: 6, fill: 'none', opacity: 1 }, o);
  const tx = (x, y, text, o) => Object.assign({ type: 'text', x: x, y: y, text: text, size: 28, fill: INK, anchor: 'start', weight: '400', font: 'serif', italic: false, opacity: 1 }, o);

  /* 长条四肢：按“胶囊”几何描边。外轮廓始终宽 6（符合 5~8 的线宽要求），
     端点天然圆角；多段肢体在折点补一个纸色圆关节，保持模块化拼装感。 */
  function capsule(x1, y1, x2, y2, r) {
    const a = Math.atan2(y2 - y1, x2 - x1);
    const nx = Math.sin(a) * r;
    const ny = -Math.cos(a) * r;
    const f = function (v) { return Math.round(v * 10) / 10; };
    return p('M ' + f(x1 + nx) + ' ' + f(y1 + ny) +
      ' L ' + f(x2 + nx) + ' ' + f(y2 + ny) +
      ' A ' + r + ' ' + r + ' 0 0 1 ' + f(x2 - nx) + ' ' + f(y2 - ny) +
      ' L ' + f(x1 - nx) + ' ' + f(y1 - ny) +
      ' A ' + r + ' ' + r + ' 0 0 1 ' + f(x1 + nx) + ' ' + f(y1 + ny) + ' Z',
      { stroke: INK, width: 6, fill: PAPER });
  }

  function limb(pts, w) {
    const r = (w || 24) / 2;
    const out = [];
    for (let i = 0; i + 1 < pts.length; i++) {
      out.push(capsule(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], r));
    }
    for (let i = 1; i + 1 < pts.length; i++) {
      out.push(el(pts[i][0], pts[i][1], r + 2, r + 2, { fill: PAPER, width: 5 }));
    }
    return out;
  }

  const hand   = (cx, cy, rx, ry, o) => el(cx, cy, rx == null ? 11 : rx, ry == null ? 13 : ry, Object.assign({ fill: PAPER, width: 5 }, o || {}));
  const foot   = (cx, cy, rx, ry, o) => el(cx, cy, rx == null ? 16 : rx, ry == null ? 9 : ry, Object.assign({ fill: PAPER, width: 5 }, o || {}));
  const shadow = (cx, cy, rx, ry) => el(cx, cy, rx, ry, { stroke: SOFT, width: 3, fill: 'hatch', opacity: 0.5 });
  const dot    = (cx, cy, rx, ry) => el(cx, cy, rx == null ? 3.2 : rx, ry == null ? 4.2 : ry, { stroke: INK, width: 3, fill: INK });
  const neck   = (x, y, w, h) => rc(x, y, w, h, { rx: 6, fill: PAPER, width: 5 });
  const torso  = (x, y, w, h, rx) => rc(x, y, w, h, { rx: rx == null ? 16 : rx, fill: PAPER, width: 6 });

  /* 面部：正面 / 侧面（dir = 1 朝右，dir = -1 朝左） */
  function faceFront(cx, cy, s, brow) {
    s = s || 1;
    const out = [
      dot(cx - 16 * s, cy - 3 * s, 3.2 * s, 4.2 * s),
      dot(cx + 16 * s, cy - 3 * s, 3.2 * s, 4.2 * s),
      ln(cx, cy + 4 * s, cx, cy + 14 * s, { stroke: MID, width: 4.5 }),
      ln(cx - 12 * s, cy + 25 * s, cx + 12 * s, cy + 25 * s, { stroke: INK, width: 4.5 })
    ];
    if (brow) {
      out.push(ln(cx - 25 * s, cy - 17 * s, cx - 8 * s, cy - 20 * s, { stroke: INK, width: 4 }));
      out.push(ln(cx + 8 * s, cy - 20 * s, cx + 25 * s, cy - 17 * s, { stroke: INK, width: 4 }));
    }
    return out;
  }

  function faceSide(cx, cy, dir, s, brow) {
    s = s || 1;
    const out = [
      dot(cx + dir * 9 * s, cy - 5 * s, 3.2 * s, 4.2 * s),
      ln(cx + dir * 31 * s, cy - 3 * s, cx + dir * 46 * s, cy + 7 * s, { stroke: INK, width: 5 }),
      ln(cx + dir * 46 * s, cy + 7 * s, cx + dir * 32 * s, cy + 16 * s, { stroke: INK, width: 5 }),
      ln(cx + dir * 7 * s, cy + 23 * s, cx + dir * 22 * s, cy + 21 * s, { stroke: INK, width: 4.5 })
    ];
    if (brow) out.push(ln(cx + dir * 1 * s, cy - 21 * s, cx + dir * 20 * s, cy - 23 * s, { stroke: INK, width: 4 }));
    return out;
  }

  function mk(id, name, category, tags, width, height, elements) {
    return {
      id: id,
      name: name,
      category: category,
      tags: tags,
      width: width,
      height: height,
      elements: elements.flat(Infinity)
    };
  }

  const ASSETS = [];

  /* ==========================================================================
   * 1. PERSON · 12 个完整人物组合（圆头 + 方身 + 长条四肢）
   * ========================================================================== */

  /* 1.1 站立 · 正面 */
  ASSETS.push(mk('person-stand-front', '站立·正面', 'person',
    ['人物', '站姿', '正面', '基础', '中性'], 170, 445, [
      shadow(85, 422, 64, 9),
      torso(53, 108, 64, 142),
      rc(57, 244, 24, 132, { rx: 11, fill: PAPER }),
      rc(89, 244, 24, 132, { rx: 11, fill: PAPER }),
      rc(45, 372, 40, 20, { rx: 9, fill: PAPER }),
      rc(85, 372, 40, 20, { rx: 9, fill: PAPER }),
      rc(29, 122, 24, 122, { rx: 12, fill: PAPER }),
      rc(117, 122, 24, 122, { rx: 12, fill: PAPER }),
      hand(41, 250), hand(129, 250),
      neck(73, 88, 24, 24),
      el(85, 62, 34, 38, { fill: PAPER }),
      el(51, 68, 6, 9, { fill: PAPER, width: 5 }),
      el(119, 68, 6, 9, { fill: PAPER, width: 5 }),
      faceFront(85, 62, 1, false)
    ]));

  /* 1.2 行走 · 侧面（朝右） */
  ASSETS.push(mk('person-walk-side', '行走·侧面', 'person',
    ['人物', '行走', '侧面', '朝右', '动态'], 170, 450, [
      shadow(90, 424, 72, 9),
      limb([[70, 246], [44, 310], [60, 372]], 25),
      foot(66, 382, 18, 9),
      limb([[92, 246], [126, 314], [122, 376]], 25),
      foot(132, 384, 18, 9),
      limb([[62, 128], [38, 186], [50, 236]], 22),
      hand(54, 242, 10, 12),
      torso(50, 108, 62, 142),
      limb([[100, 128], [128, 178], [120, 224]], 22),
      hand(122, 230, 10, 12),
      neck(78, 88, 22, 22),
      el(88, 62, 32, 36, { fill: PAPER }),
      el(56, 66, 6, 9, { fill: PAPER, width: 5 }),
      faceSide(88, 62, 1, 1, false)
    ]));

  /* 1.3 奔跑 · 侧面（朝右、腾空） */
  ASSETS.push(mk('person-run-side', '奔跑·侧面', 'person',
    ['人物', '奔跑', '侧面', '朝右', '动态', '运动'], 210, 450, [
      shadow(105, 426, 80, 9),
      ln(20, 150, 46, 152, { stroke: SOFT, width: 4, opacity: 0.8 }),
      ln(12, 188, 44, 190, { stroke: SOFT, width: 4, opacity: 0.8 }),
      ln(22, 226, 48, 226, { stroke: SOFT, width: 4, opacity: 0.8 }),
      limb([[85, 248], [54, 300], [36, 340]], 26),
      foot(30, 348, 18, 9),
      limb([[110, 248], [150, 284], [132, 338]], 26),
      foot(140, 346, 18, 9),
      limb([[74, 132], [42, 154], [54, 110]], 22),
      hand(56, 102, 10, 12),
      torso(66, 110, 60, 138),
      limb([[118, 132], [150, 150], [136, 108]], 22),
      hand(134, 100, 10, 12),
      neck(86, 88, 20, 22),
      el(100, 64, 30, 34, { fill: PAPER }),
      el(70, 68, 6, 9, { fill: PAPER, width: 5 }),
      faceSide(100, 64, 1, 1, false),
      ln(166, 300, 188, 296, { stroke: SOFT, width: 4, opacity: 0.8 }),
      ln(170, 326, 190, 324, { stroke: SOFT, width: 4, opacity: 0.8 })
    ]));

  /* 1.4 坐下 · 侧面（朝右、坐于方凳） */
  ASSETS.push(mk('person-sit-side', '坐下·侧面', 'person',
    ['人物', '坐姿', '侧面', '朝右', '放松'], 180, 390, [
      shadow(95, 368, 62, 8),
      rc(48, 236, 92, 16, { rx: 6, fill: PAPER, width: 6 }),
      rc(62, 252, 14, 96, { fill: PAPER, width: 5 }),
      rc(120, 252, 14, 96, { fill: PAPER, width: 5 }),
      rc(64, 284, 60, 10, { rx: 3, fill: PAPER, width: 4 }),
      limb([[48, 230], [100, 244]], 26),
      limb([[100, 244], [96, 310]], 24),
      foot(108, 318, 18, 9),
      limb([[44, 132], [34, 198]], 22),
      hand(32, 208, 10, 12),
      torso(28, 110, 60, 124),
      limb([[76, 132], [112, 166], [118, 226]], 22),
      hand(120, 232, 10, 12),
      limb([[66, 228], [118, 240]], 26),
      limb([[118, 240], [114, 310]], 24),
      foot(126, 318, 18, 9),
      neck(50, 92, 22, 20),
      el(62, 62, 32, 36, { fill: PAPER }),
      el(32, 66, 6, 9, { fill: PAPER, width: 5 }),
      faceSide(62, 62, 1, 1, false)
    ]));

  /* 1.5 蹲下 · 正面 */
  ASSETS.push(mk('person-crouch-front', '蹲下·正面', 'person',
    ['人物', '蹲姿', '正面', '收缩', '中性'], 230, 370, [
      shadow(115, 344, 72, 8),
      limb([[90, 254], [58, 278], [50, 318]], 26),
      foot(46, 326, 16, 8),
      limb([[140, 254], [172, 278], [180, 318]], 26),
      foot(184, 326, 16, 8),
      torso(83, 170, 64, 92),
      limb([[88, 186], [64, 230], [62, 270]], 22),
      hand(62, 276, 10, 12),
      limb([[142, 186], [166, 230], [168, 270]], 22),
      hand(168, 276, 10, 12),
      neck(103, 144, 24, 28),
      el(115, 106, 32, 36, { fill: PAPER }),
      el(81, 112, 6, 9, { fill: PAPER, width: 5 }),
      el(149, 112, 6, 9, { fill: PAPER, width: 5 }),
      faceFront(115, 106, 1, false)
    ]));

  /* 1.6 指向 · 侧面（朝右、手臂平举） */
  ASSETS.push(mk('person-point-side', '指向·侧面', 'person',
    ['人物', '指向', '侧面', '朝右', '手势', '动作'], 240, 450, [
      shadow(100, 424, 76, 9),
      torso(50, 110, 62, 142),
      limb([[68, 248], [60, 376]], 24),
      foot(72, 384, 18, 9),
      limb([[94, 248], [102, 376]], 24),
      foot(114, 384, 18, 9),
      limb([[64, 132], [46, 190], [54, 222]], 22),
      hand(56, 228, 10, 12),
      limb([[104, 132], [170, 122]], 22),
      hand(180, 120, 11, 12),
      rc(191, 114, 24, 9, { rx: 4, fill: PAPER, width: 5 }),
      neck(70, 92, 22, 20),
      el(82, 62, 32, 36, { fill: PAPER }),
      el(52, 66, 6, 9, { fill: PAPER, width: 5 }),
      faceSide(82, 62, 1, 1, false)
    ]));

  /* 1.7 打电话 · 侧面（朝左、手机贴耳） */
  ASSETS.push(mk('person-phone-side', '打电话·侧面', 'person',
    ['人物', '打电话', '侧面', '朝左', '手机'], 200, 450, [
      shadow(100, 424, 70, 9),
      limb([[92, 246], [86, 376]], 24),
      foot(78, 384, 18, 9),
      limb([[112, 246], [120, 376]], 24),
      foot(128, 384, 18, 9),
      limb([[82, 130], [70, 192], [78, 224]], 22),
      hand(80, 230, 10, 12),
      torso(70, 108, 62, 142),
      neck(96, 90, 20, 20),
      el(102, 62, 32, 36, { fill: PAPER }),
      el(132, 66, 6, 9, { fill: PAPER, width: 5 }),
      faceSide(102, 62, -1, 1, false),
      rc(122, 66, 20, 46, { rx: 5, fill: PAPER, width: 5 }),
      ln(126, 80, 138, 80, { stroke: MID, width: 4 }),
      limb([[120, 130], [148, 166], [138, 122]], 22),
      hand(138, 116, 10, 12)
    ]));

  /* 1.8 拥抱 · 双人（相向、手臂环抱） */
  ASSETS.push(mk('person-hug', '拥抱·双人', 'person',
    ['人物', '拥抱', '双人', '情感', '亲密'], 270, 450, [
      shadow(130, 426, 110, 9),
      limb([[74, 160], [54, 220], [64, 254]], 22),
      hand(66, 260, 10, 12),
      limb([[198, 154], [218, 212], [208, 250]], 22),
      hand(206, 256, 10, 12),
      limb([[80, 266], [76, 376]], 24),
      foot(68, 384, 17, 9),
      limb([[102, 266], [104, 376]], 24),
      foot(114, 384, 17, 9),
      limb([[186, 264], [182, 376]], 24),
      foot(174, 384, 17, 9),
      limb([[210, 264], [214, 376]], 24),
      foot(224, 384, 17, 9),
      torso(62, 138, 60, 132),
      neck(80, 122, 24, 20),
      el(94, 94, 30, 34, { fill: PAPER }),
      el(64, 98, 6, 9, { fill: PAPER, width: 5 }),
      faceSide(94, 94, 1, 1, false),
      torso(166, 132, 60, 132),
      neck(170, 116, 24, 20),
      el(172, 88, 30, 34, { fill: PAPER }),
      el(202, 92, 6, 9, { fill: PAPER, width: 5 }),
      faceSide(172, 88, -1, 1, false),
      limb([[116, 152], [146, 140], [162, 162]], 22),
      hand(166, 166, 10, 12),
      limb([[118, 198], [148, 194], [164, 210]], 22),
      hand(168, 214, 10, 12),
      limb([[162, 146], [132, 148], [120, 174]], 22),
      hand(116, 178, 10, 12),
      limb([[160, 192], [134, 200], [122, 218]], 22),
      hand(118, 222, 10, 12)
    ]));

  /* 1.9 出拳 · 侧面（朝右、直拳 + 速度线） */
  ASSETS.push(mk('person-punch-side', '出拳·侧面', 'person',
    ['人物', '出拳', '侧面', '朝右', '动作', '力量'], 300, 450, [
      shadow(150, 426, 100, 9),
      limb([[100, 250], [69, 314], [49, 382]], 26),
      foot(43, 390, 18, 9),
      limb([[123, 248], [159, 304], [171, 378]], 26),
      foot(181, 386, 18, 9),
      torso(77, 112, 62, 138),
      limb([[95, 136], [79, 196], [105, 186]], 22),
      hand(109, 182, 11, 12),
      limb([[131, 134], [167, 128], [217, 124]], 24),
      el(229, 122, 13, 15, { fill: PAPER, width: 6 }),
      ln(236, 112, 242, 116, { width: 4 }),
      ln(237, 122, 244, 124, { width: 4 }),
      ln(234, 132, 240, 136, { width: 4 }),
      ln(243, 104, 267, 98, { stroke: SOFT, width: 4, opacity: 0.8 }),
      ln(247, 122, 273, 120, { stroke: SOFT, width: 4, opacity: 0.8 }),
      ln(241, 140, 263, 144, { stroke: SOFT, width: 4, opacity: 0.8 }),
      neck(93, 92, 20, 20),
      el(107, 64, 30, 34, { fill: PAPER }),
      el(77, 68, 6, 9, { fill: PAPER, width: 5 }),
      faceSide(107, 64, 1, 1, false)
    ]));

  /* 1.10 倒地 · 侧面（横卧地面） */
  ASSETS.push(mk('person-fall-side', '倒地·侧面', 'person',
    ['人物', '倒地', '侧面', '横卧', '动作', '受伤'], 470, 220, [
      ln(16, 177, 454, 177, { stroke: MID, width: 5 }),
      el(235, 185, 200, 12, { stroke: SOFT, width: 3, fill: 'hatch', opacity: 0.5 }),
      ln(22, 31, 50, 37, { stroke: SOFT, width: 4, opacity: 0.8 }),
      ln(14, 61, 48, 63, { stroke: SOFT, width: 4, opacity: 0.8 }),
      ln(28, 93, 54, 87, { stroke: SOFT, width: 4, opacity: 0.8 }),
      limb([[168, 113], [132, 67], [104, 39]], 22),
      hand(98, 33, 12, 13),
      limb([[206, 125], [244, 161]], 22),
      hand(252, 165, 12, 13),
      rc(148, 93, 126, 64, { rx: 18, fill: PAPER, width: 7 }),
      limb([[268, 123], [348, 129], [414, 119]], 26),
      foot(432, 117, 18, 10),
      limb([[268, 137], [344, 151], [406, 149]], 26),
      foot(422, 149, 18, 10),
      rc(130, 97, 24, 30, { rx: 6, fill: PAPER, width: 5 }),
      el(102, 99, 30, 34, { fill: PAPER, width: 7 }),
      ln(84, 75, 100, 78, { stroke: MID, width: 4 }),
      ln(86, 89, 98, 92, { width: 4 }),
      ln(112, 87, 124, 90, { width: 4 }),
      p('M 94 117 Q 104 123 114 117', { width: 4 })
    ]));

  /* 1.11 回头 · 背面（身体朝内、头回望左侧） */
  ASSETS.push(mk('person-lookback', '回头·背面', 'person',
    ['人物', '回头', '背面', '转头', '叙事'], 190, 450, [
      shadow(95, 424, 72, 9),
      limb([[76, 250], [72, 376]], 24),
      rc(50, 374, 40, 18, { rx: 8, fill: PAPER, width: 5 }),
      limb([[108, 250], [112, 376]], 24),
      rc(92, 374, 40, 18, { rx: 8, fill: PAPER, width: 5 }),
      limb([[68, 132], [54, 206]], 22),
      hand(52, 216, 10, 12),
      torso(63, 110, 64, 142),
      ln(95, 132, 95, 240, { stroke: MID, width: 4 }),
      limb([[122, 132], [144, 188], [130, 222]], 22),
      hand(128, 228, 10, 12),
      p('M 122 40 Q 142 58 132 82', { stroke: SOFT, width: 4, fill: 'none', opacity: 0.85 }),
      p('M 130 30 Q 158 54 146 86', { stroke: SOFT, width: 3, fill: 'none', opacity: 0.65 }),
      neck(82, 94, 26, 22),
      el(80, 62, 32, 36, { fill: PAPER }),
      p('M 48 62 Q 48 26 80 24 Q 112 26 112 62 Q 100 44 80 44 Q 60 44 48 62 Z',
        { fill: GRAY, stroke: INK, width: 5 }),
      ln(48, 58, 36, 68, { width: 5 }),
      ln(36, 68, 48, 76, { width: 5 }),
      dot(60, 54, 3.2, 4.2),
      ln(50, 82, 64, 82, { width: 4 }),
      el(108, 66, 6, 9, { fill: PAPER, width: 5 })
    ]));

  /* 1.12 背影 · 站立（背对镜头） */
  ASSETS.push(mk('person-back-stand', '背影·站立', 'person',
    ['人物', '背影', '背面', '站姿', '离开'], 180, 450, [
      shadow(90, 424, 68, 9),
      rc(62, 250, 24, 126, { rx: 11, fill: PAPER }),
      rc(94, 250, 24, 126, { rx: 11, fill: PAPER }),
      rc(50, 376, 38, 18, { rx: 8, fill: PAPER, width: 5 }),
      rc(92, 376, 38, 18, { rx: 8, fill: PAPER, width: 5 }),
      torso(58, 110, 64, 142),
      ln(90, 130, 90, 238, { stroke: MID, width: 4 }),
      ln(62, 234, 118, 234, { stroke: MID, width: 4 }),
      p('M 62 124 Q 90 138 118 124', { stroke: INK, width: 4 }),
      rc(30, 122, 24, 122, { rx: 12, fill: PAPER }),
      rc(126, 122, 24, 122, { rx: 12, fill: PAPER }),
      hand(42, 250), hand(138, 250),
      neck(78, 94, 24, 20),
      el(90, 62, 34, 38, { fill: PAPER }),
      el(56, 68, 6, 9, { fill: PAPER, width: 5 }),
      el(124, 68, 6, 9, { fill: PAPER, width: 5 }),
      p('M 56 62 Q 56 24 90 24 Q 124 24 124 62 Q 111 44 90 44 Q 69 44 56 62 Z',
        { fill: GRAY, stroke: INK, width: 5 }),
      p('M 72 92 Q 90 102 108 92', { stroke: INK, width: 4 })
    ]));

  /* ==========================================================================
   * 2. FACE · 8 个头部素材（圆头 + 极简五官，不做卡通大眼）
   * ========================================================================== */

  /* 2.1 头部 · 正面 */
  ASSETS.push(mk('face-front', '头部·正面', 'face',
    ['头部', '正面', '五官', '中性'], 300, 320, [
      neck(118, 226, 64, 46),
      el(150, 130, 100, 104, { fill: PAPER, width: 7 }),
      el(42, 136, 16, 26, { fill: PAPER, width: 6 }),
      el(258, 136, 16, 26, { fill: PAPER, width: 6 }),
      p('M 44 126 Q 54 136 44 148', { stroke: MID, width: 4, fill: 'none' }),
      p('M 256 126 Q 246 136 256 148', { stroke: MID, width: 4, fill: 'none' }),
      el(112, 116, 11, 13, { fill: PAPER, width: 5 }),
      dot(112, 116, 4.5, 5.5),
      el(188, 116, 11, 13, { fill: PAPER, width: 5 }),
      dot(188, 116, 4.5, 5.5),
      ln(92, 92, 122, 88, { width: 5 }),
      ln(178, 88, 208, 92, { width: 5 }),
      ln(150, 124, 150, 156, { stroke: MID, width: 5 }),
      ln(140, 162, 160, 162, { stroke: MID, width: 4 }),
      p('M 126 186 Q 150 192 174 186', { width: 5, fill: 'none' }),
      p('M 40 308 Q 150 278 260 308', { stroke: MID, width: 5, fill: 'none' })
    ]));

  /* 2.2 头部 · 侧脸（朝右） */
  ASSETS.push(mk('face-side', '头部·侧脸', 'face',
    ['头部', '侧脸', '朝右', '轮廓'], 300, 320, [
      neck(108, 226, 60, 44),
      el(140, 130, 96, 104, { fill: PAPER, width: 7 }),
      el(84, 138, 18, 28, { fill: PAPER, width: 6 }),
      p('M 86 122 Q 72 138 86 154', { stroke: MID, width: 4, fill: 'none' }),
      ln(234, 120, 270, 140, { width: 6 }),
      ln(270, 140, 238, 156, { width: 6 }),
      p('M 250 168 Q 240 202 214 218', { stroke: INK, width: 5, fill: 'none' }),
      el(196, 112, 11, 13, { fill: PAPER, width: 5 }),
      dot(196, 112, 4.5, 5.5),
      ln(180, 90, 212, 86, { width: 5 }),
      ln(232, 180, 262, 174, { width: 5 }),
      p('M 48 104 Q 66 58 110 38', { stroke: INK, width: 5, fill: 'none' }),
      p('M 40 308 Q 140 278 250 308', { stroke: MID, width: 5, fill: 'none' })
    ]));

  /* 2.3 头部 · 低头 */
  ASSETS.push(mk('face-down', '头部·低头', 'face',
    ['头部', '低头', '俯视', '情绪', '低落'], 300, 330, [
      neck(118, 228, 64, 50),
      p('M 36 318 Q 150 282 264 318', { width: 6, fill: 'none' }),
      el(150, 136, 100, 102, { fill: PAPER, width: 7 }),
      el(42, 148, 16, 24, { fill: PAPER, width: 6 }),
      el(258, 148, 16, 24, { fill: PAPER, width: 6 }),
      p('M 62 110 Q 100 66 150 62 Q 200 66 238 110', { width: 5, fill: 'none' }),
      ln(104, 158, 136, 166, { width: 5 }),
      ln(164, 166, 196, 158, { width: 5 }),
      p('M 102 176 Q 118 190 134 180', { width: 5, fill: 'none' }),
      p('M 166 180 Q 182 190 198 176', { width: 5, fill: 'none' }),
      ln(150, 176, 150, 204, { stroke: MID, width: 5 }),
      p('M 128 222 Q 150 230 172 222', { width: 5, fill: 'none' })
    ]));

  /* 2.4 头部 · 仰头 */
  ASSETS.push(mk('face-up', '头部·仰头', 'face',
    ['头部', '仰头', '仰望', '情绪', '光线'], 300, 330, [
      neck(120, 210, 60, 60),
      p('M 36 318 Q 150 288 264 318', { stroke: MID, width: 6, fill: 'none' }),
      el(150, 126, 100, 102, { fill: PAPER, width: 7 }),
      el(44, 140, 16, 24, { fill: PAPER, width: 6 }),
      el(256, 140, 16, 24, { fill: PAPER, width: 6 }),
      p('M 104 196 Q 150 218 196 196', { width: 5, fill: 'none' }),
      el(112, 96, 12, 13, { fill: PAPER, width: 5 }),
      dot(112, 90, 4.5, 5),
      el(188, 96, 12, 13, { fill: PAPER, width: 5 }),
      dot(188, 90, 4.5, 5),
      p('M 92 68 Q 114 60 132 66', { width: 5, fill: 'none' }),
      p('M 168 66 Q 186 60 208 68', { width: 5, fill: 'none' }),
      ln(150, 104, 150, 132, { stroke: MID, width: 5 }),
      ln(140, 138, 160, 138, { stroke: MID, width: 4 }),
      p('M 124 158 Q 150 166 176 158', { width: 5, fill: 'none' })
    ]));

  /* 2.5 头部 · 戴帽 */
  ASSETS.push(mk('face-hat', '头部·戴帽', 'face',
    ['头部', '帽子', '造型', '中性'], 270, 330, [
      neck(103, 246, 64, 40),
      el(135, 156, 94, 100, { fill: PAPER, width: 7 }),
      el(39, 166, 16, 24, { fill: PAPER, width: 6 }),
      el(231, 166, 16, 24, { fill: PAPER, width: 6 }),
      rc(23, 100, 224, 22, { rx: 11, fill: PALE, width: 6 }),
      rc(75, 30, 120, 76, { rx: 14, fill: PAPER, width: 6 }),
      ln(77, 84, 193, 84, { width: 5 }),
      p('M 95 42 Q 135 30 175 42', { stroke: MID, width: 4, fill: 'none' }),
      ln(87, 142, 111, 144, { width: 4 }),
      ln(159, 144, 183, 142, { width: 4 }),
      el(101, 164, 11, 13, { fill: PAPER, width: 5 }),
      dot(101, 164, 4.5, 5.5),
      el(169, 164, 11, 13, { fill: PAPER, width: 5 }),
      dot(169, 164, 4.5, 5.5),
      ln(135, 172, 135, 198, { stroke: MID, width: 5 }),
      p('M 113 224 Q 135 230 157 224', { width: 5, fill: 'none' }),
      p('M 23 306 Q 135 280 247 306', { stroke: MID, width: 5, fill: 'none' })
    ]));

  /* 2.6 头部 · 哭泣 */
  ASSETS.push(mk('face-cry', '头部·哭泣', 'face',
    ['头部', '哭泣', '眼泪', '情绪', '悲伤'], 300, 330, [
      neck(118, 240, 64, 46),
      p('M 36 318 Q 150 286 264 318', { stroke: MID, width: 5, fill: 'none' }),
      el(150, 136, 100, 102, { fill: PAPER, width: 7 }),
      el(42, 148, 16, 24, { fill: PAPER, width: 6 }),
      el(258, 148, 16, 24, { fill: PAPER, width: 6 }),
      ln(92, 104, 132, 120, { width: 5 }),
      ln(168, 120, 208, 104, { width: 5 }),
      p('M 100 136 Q 118 152 136 136', { width: 5, fill: 'none' }),
      p('M 164 136 Q 182 152 200 136', { width: 5, fill: 'none' }),
      p('M 104 148 Q 94 180 106 208', { stroke: MID, width: 4, fill: 'none' }),
      el(110, 218, 7, 10, { fill: PALE, stroke: MID, width: 4 }),
      p('M 196 148 Q 206 182 194 210', { stroke: MID, width: 4, fill: 'none' }),
      el(188, 220, 7, 10, { fill: PALE, stroke: MID, width: 4 }),
      ln(150, 150, 150, 180, { stroke: MID, width: 5 }),
      p('M 122 216 Q 136 204 150 216 Q 164 228 178 212', { width: 5, fill: 'none' })
    ]));

  /* 2.7 头部 · 惊讶 */
  ASSETS.push(mk('face-surprise', '头部·惊讶', 'face',
    ['头部', '惊讶', '表情', '反应', '情绪'], 300, 330, [
      neck(118, 236, 64, 48),
      p('M 36 318 Q 150 284 264 318', { stroke: MID, width: 5, fill: 'none' }),
      el(150, 132, 102, 104, { fill: PAPER, width: 7 }),
      el(40, 144, 16, 24, { fill: PAPER, width: 6 }),
      el(260, 144, 16, 24, { fill: PAPER, width: 6 }),
      p('M 88 84 Q 112 66 136 76', { width: 5, fill: 'none' }),
      p('M 164 76 Q 188 66 212 84', { width: 5, fill: 'none' }),
      el(112, 116, 17, 20, { fill: PAPER, width: 5 }),
      dot(112, 116, 6, 8),
      el(188, 116, 17, 20, { fill: PAPER, width: 5 }),
      dot(188, 116, 6, 8),
      ln(150, 130, 150, 160, { stroke: MID, width: 5 }),
      el(150, 196, 18, 24, { fill: GRAY, width: 5 })
    ]));

  /* 2.8 头部 · 剪影（纯黑侧影） */
  ASSETS.push(mk('face-silhouette', '头部·剪影', 'face',
    ['头部', '剪影', '逆光', '侧脸', '氛围'], 300, 340, [
      p('M 24 316 Q 150 252 276 316 L 276 328 L 24 328 Z', { fill: INK, stroke: INK, width: 4 }),
      rc(126, 240, 48, 60, { fill: INK, stroke: INK, width: 4 }),
      p('M 76 250 C 48 224 40 172 54 128 C 70 66 120 34 172 40 C 216 45 244 80 242 120 L 270 148 L 238 164 L 236 180 C 232 210 208 234 180 242 L 178 254 Z',
        { fill: INK, stroke: INK, width: 4 }),
      p('M 64 144 C 74 92 116 56 170 54', { stroke: SOFT, width: 4, fill: 'none' }),
      p('M 56 306 Q 150 270 244 306', { stroke: SOFT, width: 3, fill: 'none', opacity: 0.7 }),
      p('M 118 250 L 150 274 L 182 250', { stroke: MID, width: 4, fill: 'none' })
    ]));

  /* ==========================================================================
   * 3. PART · 8 个可拼装零件（与人物模块同比例：头 68、躯干 64×142、臂长 126、腿长 134）
   * ========================================================================== */

  /* 3.1 圆头 */
  ASSETS.push(mk('part-head', '圆头', 'part',
    ['部件', '头部', '圆形', '拼装'], 110, 124, [
      el(55, 58, 34, 38, { fill: PAPER, width: 6 }),
      el(21, 64, 6, 9, { fill: PAPER, width: 5 }),
      el(89, 64, 6, 9, { fill: PAPER, width: 5 }),
      rc(43, 90, 24, 18, { rx: 4, fill: PAPER, width: 5 }),
      p('M 31 40 Q 55 22 79 40', { stroke: INK, width: 4, fill: 'none' }),
      ln(31, 114, 79, 114, { stroke: SOFT, width: 4, dash: '8 8' })
    ]));

  /* 3.2 方形身体 */
  ASSETS.push(mk('part-body', '方形身体', 'part',
    ['部件', '躯干', '矩形', '拼装'], 120, 184, [
      rc(28, 20, 64, 142, { rx: 16, fill: PAPER, width: 6 }),
      rc(48, 8, 24, 20, { rx: 4, fill: PAPER, width: 5 }),
      p('M 48 22 L 60 34 L 72 22', { stroke: MID, width: 4, fill: 'none' }),
      ln(32, 124, 88, 124, { stroke: MID, width: 4 }),
      ln(36, 172, 84, 172, { stroke: SOFT, width: 4, dash: '8 8' }),
      el(22, 44, 8, 8, { fill: PALE, width: 4 }),
      el(98, 44, 8, 8, { fill: PALE, width: 4 })
    ]));

  /* 3.3 长条手臂 */
  ASSETS.push(mk('part-arm', '长条手臂', 'part',
    ['部件', '手臂', '长条', '拼装'], 80, 184, [
      rc(28, 26, 24, 126, { rx: 12, fill: PAPER, width: 6 }),
      el(40, 20, 13, 13, { fill: PALE, width: 5 }),
      el(40, 163, 11, 13, { fill: PAPER, width: 5 }),
      ln(28, 88, 52, 88, { stroke: MID, width: 4 }),
      ln(30, 152, 50, 152, { stroke: MID, width: 4 }),
      ln(28, 8, 52, 8, { stroke: SOFT, width: 4, dash: '6 6' })
    ]));

  /* 3.4 长条腿 */
  ASSETS.push(mk('part-leg', '长条腿', 'part',
    ['部件', '腿部', '长条', '拼装'], 84, 196, [
      rc(30, 26, 24, 134, { rx: 12, fill: PAPER, width: 6 }),
      el(42, 20, 13, 13, { fill: PALE, width: 5 }),
      el(42, 168, 11, 11, { fill: PALE, width: 5 }),
      ln(30, 94, 54, 94, { stroke: MID, width: 4 }),
      el(42, 94, 8, 8, { fill: PAPER, width: 4 }),
      ln(34, 188, 50, 188, { stroke: SOFT, width: 4, dash: '6 6' })
    ]));

  /* 3.5 手 */
  ASSETS.push(mk('part-hand', '手', 'part',
    ['部件', '手部', '张开', '拼装'], 78, 92, [
      rc(24, 36, 32, 34, { rx: 10, fill: PAPER, width: 5 }),
      rc(25, 14, 8, 26, { rx: 4, fill: PAPER, width: 4 }),
      rc(35, 12, 8, 28, { rx: 4, fill: PAPER, width: 4 }),
      rc(45, 14, 8, 26, { rx: 4, fill: PAPER, width: 4 }),
      rc(55, 20, 8, 22, { rx: 4, fill: PAPER, width: 4 }),
      limb([[25, 48], [15, 58]], 12),
      ln(28, 70, 52, 70, { stroke: MID, width: 4 }),
      rc(28, 70, 24, 14, { rx: 4, fill: PAPER, width: 4 })
    ]));

  /* 3.6 脚 */
  ASSETS.push(mk('part-foot', '脚', 'part',
    ['部件', '脚部', '鞋子', '拼装'], 96, 64, [
      p('M 14 18 L 50 18 L 74 34 Q 80 40 74 44 L 14 44 Z', { fill: PAPER, width: 6 }),
      rc(10, 44, 70, 8, { rx: 3, fill: PALE, width: 4 }),
      ln(26, 26, 44, 26, { stroke: MID, width: 4 }),
      ln(30, 34, 48, 34, { stroke: MID, width: 4 }),
      ln(24, 18, 50, 18, { width: 4 }),
      ln(30, 10, 54, 10, { stroke: SOFT, width: 4, dash: '6 6' })
    ]));

  /* 3.7 眼镜 */
  ASSETS.push(mk('part-glasses', '眼镜', 'part',
    ['部件', '眼镜', '配饰', '拼装'], 132, 64, [
      rc(22, 18, 34, 28, { rx: 12, stroke: INK, width: 6, fill: 'none' }),
      rc(78, 18, 34, 28, { rx: 12, stroke: INK, width: 6, fill: 'none' }),
      p('M 56 30 Q 67 24 78 30', { stroke: INK, width: 6, fill: 'none' }),
      ln(22, 28, 10, 24, { width: 5 }),
      ln(112, 28, 124, 24, { width: 5 }),
      el(58, 40, 3, 3, { fill: INK, stroke: INK, width: 2 }),
      el(76, 40, 3, 3, { fill: INK, stroke: INK, width: 2 })
    ]));

  /* 3.8 发型 */
  ASSETS.push(mk('part-hair', '发型', 'part',
    ['部件', '发型', '头发', '拼装'], 100, 80, [
      p('M 10 58 Q 8 14 50 10 Q 92 14 90 58 Q 76 38 50 38 Q 24 38 10 58 Z',
        { fill: GRAY, stroke: INK, width: 5 }),
      p('M 20 44 L 30 34 L 40 44 L 50 32 L 60 44 L 70 34 L 80 44',
        { stroke: INK, width: 4, fill: 'none' }),
      rc(12, 46, 8, 22, { rx: 3, fill: GRAY, stroke: INK, width: 4 }),
      rc(80, 46, 8, 22, { rx: 3, fill: GRAY, stroke: INK, width: 4 }),
      p('M 34 22 Q 44 34 38 46', { stroke: INK, width: 3, fill: 'none', opacity: 0.6 }),
      p('M 66 22 Q 56 34 62 46', { stroke: INK, width: 3, fill: 'none', opacity: 0.6 })
    ]));

  /* ==========================================================================
   * 4. PROP · 12 个高频道具
   * ========================================================================== */

  /* 4.1 手机 */
  ASSETS.push(mk('prop-phone', '手机', 'prop',
    ['道具', '手机', '通讯', '屏幕', '特写'], 190, 340, [
      rc(26, 20, 138, 300, { rx: 28, fill: PAPER, width: 7 }),
      rc(40, 58, 110, 208, { rx: 10, fill: PALE, width: 5 }),
      rc(76, 34, 38, 12, { rx: 6, fill: INK, stroke: INK, width: 2 }),
      ln(84, 40, 106, 40, { stroke: PAPER, width: 3 }),
      rc(52, 84, 72, 24, { rx: 12, fill: GRAY, stroke: GRAY, width: 2 }),
      rc(68, 122, 66, 24, { rx: 12, fill: PAPER, stroke: MID, width: 4 }),
      rc(52, 160, 58, 22, { rx: 11, fill: GRAY, stroke: GRAY, width: 2 }),
      ln(72, 288, 118, 288, { stroke: MID, width: 5 }),
      ln(166, 96, 166, 128, { width: 5 }),
      rc(122, 70, 20, 9, { rx: 2, stroke: MID, width: 3, fill: 'none' })
    ]));

  /* 4.2 相机 */
  ASSETS.push(mk('prop-camera', '相机', 'prop',
    ['道具', '相机', '拍摄', '镜头', '特写'], 340, 250, [
      el(170, 232, 120, 10, { stroke: SOFT, width: 3, fill: 'hatch', opacity: 0.5 }),
      rc(34, 74, 260, 130, { rx: 18, fill: PAPER, width: 7 }),
      rc(116, 42, 70, 36, { rx: 8, fill: PAPER, width: 6 }),
      rc(46, 54, 34, 18, { rx: 4, fill: PALE, width: 5 }),
      el(164, 138, 56, 56, { fill: PALE, width: 7 }),
      el(164, 138, 36, 36, { fill: PAPER, width: 6 }),
      el(164, 138, 18, 18, { fill: INK, stroke: INK, width: 3 }),
      rc(252, 60, 28, 14, { rx: 4, fill: PALE, width: 4 }),
      ln(268, 108, 268, 132, { width: 4 }),
      ln(276, 108, 276, 132, { width: 4 }),
      ln(284, 108, 284, 132, { width: 4 }),
      el(68, 98, 14, 10, { fill: PALE, width: 4 })
    ]));

  /* 4.3 汽车（侧视） */
  ASSETS.push(mk('prop-car', '汽车', 'prop',
    ['道具', '汽车', '交通', '街道', '侧面'], 800, 250, [
      ln(30, 230, 770, 230, { stroke: MID, width: 5 }),
      p('M 40 178 L 44 134 C 48 112 70 102 100 100 L 200 94 L 250 54 C 262 42 280 38 300 38 L 460 38 C 486 38 504 46 518 62 L 554 96 L 650 102 C 710 106 746 124 758 156 L 760 178 Z',
        { fill: PAPER, width: 8 }),
      p('M 268 90 L 312 46 L 394 46 L 394 90 Z', { fill: PALE, width: 5 }),
      p('M 408 46 L 458 46 L 512 90 L 408 90 Z', { fill: PALE, width: 5 }),
      ln(398, 96, 398, 172, { width: 5 }),
      ln(340, 120, 374, 120, { width: 5 }),
      ln(420, 120, 454, 120, { width: 5 }),
      el(180, 182, 46, 46, { fill: PAPER, width: 8 }),
      el(180, 182, 20, 20, { fill: PALE, width: 5 }),
      el(180, 182, 7, 7, { fill: INK, stroke: INK, width: 2 }),
      el(640, 182, 46, 46, { fill: PAPER, width: 8 }),
      el(640, 182, 20, 20, { fill: PALE, width: 5 }),
      el(640, 182, 7, 7, { fill: INK, stroke: INK, width: 2 }),
      p('M 126 178 Q 180 128 234 178', { stroke: INK, width: 5, fill: 'none' }),
      p('M 586 178 Q 640 128 694 178', { stroke: INK, width: 5, fill: 'none' }),
      rc(748, 134, 14, 12, { rx: 3, fill: PALE, width: 4 }),
      rc(40, 140, 10, 10, { fill: GRAY, stroke: GRAY, width: 2 })
    ]));

  /* 4.4 桌子 */
  ASSETS.push(mk('prop-table', '桌子', 'prop',
    ['道具', '桌子', '家具', '室内'], 440, 205, [
      ln(20, 190, 420, 190, { stroke: MID, width: 5 }),
      rc(20, 36, 400, 22, { rx: 4, fill: PALE, width: 8 }),
      rc(46, 58, 348, 14, { fill: PAPER, width: 5 }),
      rc(54, 58, 20, 120, { fill: PAPER, width: 6 }),
      rc(366, 58, 20, 120, { fill: PAPER, width: 6 }),
      rc(96, 58, 16, 108, { stroke: MID, width: 4, fill: 'none' }),
      rc(160, 62, 120, 42, { rx: 4, fill: PAPER, width: 5 }),
      ln(196, 82, 244, 82, { width: 5 }),
      ln(74, 152, 366, 152, { stroke: MID, width: 5 })
    ]));

  /* 4.5 椅子（侧视） */
  ASSETS.push(mk('prop-chair', '椅子', 'prop',
    ['道具', '椅子', '家具', '室内', '坐具'], 260, 380, [
      ln(20, 356, 240, 356, { stroke: MID, width: 5 }),
      rc(46, 24, 26, 170, { rx: 10, fill: PAPER, width: 7 }),
      ln(59, 42, 59, 178, { stroke: MID, width: 4 }),
      rc(46, 194, 160, 20, { rx: 6, fill: PALE, width: 7 }),
      rc(184, 214, 18, 128, { fill: PAPER, width: 6 }),
      rc(58, 214, 18, 128, { fill: PAPER, width: 6 }),
      ln(66, 292, 194, 292, { stroke: MID, width: 5 }),
      rc(58, 130, 116, 12, { rx: 5, fill: PAPER, width: 5 }),
      rc(164, 142, 12, 52, { fill: PAPER, width: 4 })
    ]));

  /* 4.6 门 */
  ASSETS.push(mk('prop-door', '门', 'prop',
    ['道具', '门', '门框', '室内', '出口'], 300, 500, [
      ln(20, 482, 280, 482, { stroke: MID, width: 5 }),
      rc(24, 20, 252, 462, { rx: 4, stroke: INK, width: 8 }),
      rc(50, 46, 200, 412, { fill: PAPER, width: 7 }),
      rc(76, 80, 148, 150, { rx: 4, stroke: INK, width: 5, fill: 'none' }),
      rc(76, 254, 148, 170, { rx: 4, stroke: INK, width: 5, fill: 'none' }),
      rc(210, 262, 18, 34, { rx: 5, fill: PALE, width: 4 }),
      el(219, 279, 8, 8, { fill: INK, stroke: INK, width: 2 }),
      rc(50, 110, 10, 26, { fill: MID, stroke: MID, width: 2 }),
      rc(50, 380, 10, 26, { fill: MID, stroke: MID, width: 2 })
    ]));

  /* 4.7 窗户 */
  ASSETS.push(mk('prop-window', '窗户', 'prop',
    ['道具', '窗户', '室内', '光线', '建筑'], 420, 400, [
      rc(24, 24, 372, 352, { rx: 2, stroke: INK, width: 8 }),
      rc(44, 44, 332, 312, { fill: PAPER, width: 5 }),
      ln(210, 44, 210, 356, { width: 6 }),
      ln(44, 200, 376, 200, { width: 6 }),
      rc(12, 376, 396, 16, { rx: 4, fill: PALE, width: 6 }),
      p('M 44 44 Q 88 120 62 356', { stroke: INK, width: 5, fill: 'none' }),
      p('M 376 44 Q 332 120 358 356', { stroke: INK, width: 5, fill: 'none' })
    ]));

  /* 4.8 楼梯 */
  ASSETS.push(mk('prop-stairs', '楼梯', 'prop',
    ['道具', '楼梯', '建筑', '上行', '空间'], 480, 260, [
      ln(16, 236, 464, 236, { stroke: MID, width: 5 }),
      p('M 24 202 L 24 175 L 96 175 L 96 148 L 168 148 L 168 121 L 240 121 L 240 94 L 312 94 L 312 67 L 384 67 L 384 40 L 456 40',
        { stroke: INK, width: 8, fill: 'none' }),
      p('M 40 151 L 112 151 L 112 124 L 184 124 L 184 97 L 256 97 L 256 70 L 328 70 L 328 43 L 400 43',
        { stroke: INK, width: 5, fill: 'none' }),
      ln(60, 151, 60, 175, { width: 4 }),
      ln(132, 124, 132, 148, { width: 4 }),
      ln(204, 97, 204, 121, { width: 4 }),
      ln(276, 70, 276, 94, { width: 4 }),
      ln(348, 43, 348, 67, { width: 4 }),
      p('M 24 216 L 456 54', { stroke: MID, width: 4, fill: 'none' }),
      ln(24, 202, 24, 216, { width: 4 })
    ]));

  /* 4.9 路灯 */
  ASSETS.push(mk('prop-streetlamp', '路灯', 'prop',
    ['道具', '路灯', '街道', '夜晚', '光源'], 240, 570, [
      ln(24, 556, 216, 556, { stroke: MID, width: 5 }),
      rc(92, 520, 56, 24, { rx: 5, fill: PALE, width: 6 }),
      rc(110, 120, 16, 402, { fill: PAPER, width: 7 }),
      p('M 118 120 L 118 88 Q 118 68 146 68 L 196 68', { stroke: INK, width: 7, fill: 'none' }),
      p('M 174 68 L 222 68 L 210 104 L 186 104 Z', { fill: PAPER, stroke: INK, width: 6 }),
      el(198, 110, 10, 10, { fill: PALE, width: 4 }),
      ln(198, 132, 198, 154, { stroke: SOFT, width: 4 }),
      ln(168, 118, 148, 138, { stroke: SOFT, width: 4 }),
      ln(226, 114, 232, 132, { stroke: SOFT, width: 4 }),
      ln(198, 58, 198, 36, { stroke: SOFT, width: 4 })
    ]));

  /* 4.10 雨伞 */
  ASSETS.push(mk('prop-umbrella', '雨伞', 'prop',
    ['道具', '雨伞', '雨天', '遮挡', '街景'], 400, 355, [
      p('M 24 180 Q 24 48 200 40 Q 376 48 376 180 Q 350 154 320 180 Q 290 150 260 180 Q 230 150 200 180 Q 170 150 140 180 Q 110 150 80 180 Q 50 154 24 180 Z',
        { fill: PAPER, width: 8 }),
      ln(200, 40, 200, 18, { width: 6 }),
      el(200, 15, 5, 5, { fill: INK, stroke: INK, width: 2 }),
      ln(200, 46, 92, 170, { stroke: MID, width: 4 }),
      ln(200, 46, 308, 170, { stroke: MID, width: 4 }),
      ln(200, 46, 150, 172, { stroke: MID, width: 3 }),
      ln(200, 46, 250, 172, { stroke: MID, width: 3 }),
      ln(200, 180, 200, 312, { width: 7 }),
      p('M 200 312 Q 200 338 172 338 Q 148 338 148 318', { stroke: INK, width: 7, fill: 'none' })
    ]));

  /* 4.11 杯子 */
  ASSETS.push(mk('prop-cup', '杯子', 'prop',
    ['道具', '杯子', '咖啡', '热气', '桌面'], 220, 260, [
      el(100, 224, 78, 16, { fill: PALE, width: 6 }),
      el(100, 224, 46, 9, { fill: PAPER, width: 4 }),
      p('M 42 100 L 58 204 Q 100 224 142 204 L 158 100 Z', { fill: PAPER, width: 7 }),
      el(100, 100, 58, 12, { fill: PALE, width: 6 }),
      el(100, 102, 46, 8, { fill: GRAY, stroke: GRAY, width: 2 }),
      p('M 156 118 Q 194 122 190 158 Q 186 192 146 190', { stroke: INK, width: 7, fill: 'none' }),
      p('M 78 76 Q 68 56 80 38', { stroke: MID, width: 5, fill: 'none' }),
      p('M 102 72 Q 92 50 104 30', { stroke: MID, width: 5, fill: 'none' }),
      p('M 126 76 Q 116 56 128 40', { stroke: MID, width: 5, fill: 'none' })
    ]));

  /* 4.12 床 */
  ASSETS.push(mk('prop-bed', '床', 'prop',
    ['道具', '床', '家具', '卧室', '睡眠'], 640, 340, [
      ln(16, 330, 624, 330, { stroke: MID, width: 5 }),
      rc(28, 44, 26, 236, { rx: 10, fill: PAPER, width: 8 }),
      rc(54, 246, 520, 52, { rx: 8, fill: PAPER, width: 8 }),
      rc(54, 214, 520, 36, { rx: 8, fill: PALE, width: 7 }),
      rc(84, 186, 110, 34, { rx: 14, fill: PAPER, width: 6 }),
      p('M 220 208 L 566 208 L 578 240 L 230 240 Z', { fill: 'hatch', stroke: INK, width: 6 }),
      ln(300, 208, 310, 240, { stroke: MID, width: 4 }),
      ln(400, 208, 410, 240, { stroke: MID, width: 4 }),
      rc(70, 298, 20, 28, { rx: 4, fill: PAPER, width: 5 }),
      rc(544, 298, 20, 28, { rx: 4, fill: PAPER, width: 5 })
    ]));

  /* ==========================================================================
   * 5. SCENE · 10 个场景母版（1320 × 720，只画环境，不画 16:9 画框）
   * ========================================================================== */

  /* 小工具：重复窗格 / 重复雨线，保证画面有节奏但不啰嗦 */
  function grid(x, y, cols, rows, w, h, sx, sy, o) {
    const out = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) out.push(rc(x + c * sx, y + r * sy, w, h, o));
    }
    return out;
  }

  function streaks(n, x, y, spanX, spanY, dx, dy, o) {
    const out = [];
    for (let i = 0; i < n; i++) {
      const px = x + ((i * 89) % spanX);
      const py = y + ((i * 53) % spanY);
      out.push(ln(px, py, px + dx, py + dy, o));
    }
    return out;
  }

  /* 5.1 城市天际线 */
  ASSETS.push(mk('scene-city-skyline', '城市天际线', 'scene',
    ['场景', '城市', '天际线', '夜晚', '远景'], 1320, 720, [
      ln(30, 560, 1290, 560, { width: 7 }),
      rc(70, 340, 150, 220, { stroke: SOFT, width: 5, fill: 'none' }),
      rc(240, 400, 110, 160, { stroke: SOFT, width: 5, fill: 'none' }),
      rc(700, 320, 130, 240, { stroke: SOFT, width: 5, fill: 'none' }),
      rc(860, 410, 100, 150, { stroke: SOFT, width: 5, fill: 'none' }),
      rc(1000, 360, 120, 200, { stroke: SOFT, width: 5, fill: 'none' }),
      rc(1140, 300, 120, 260, { stroke: SOFT, width: 5, fill: 'none' }),
      rc(110, 390, 170, 170, { fill: PAPER, width: 8 }),
      rc(300, 260, 150, 300, { fill: PALE, width: 8 }),
      rc(470, 430, 170, 130, { fill: PAPER, width: 8 }),
      rc(760, 220, 130, 340, { fill: GRAY, stroke: INK, width: 8 }),
      rc(910, 360, 180, 200, { fill: PAPER, width: 8 }),
      rc(1110, 290, 150, 270, { fill: PALE, width: 8 }),
      ln(375, 260, 375, 200, { width: 6 }),
      ln(366, 220, 384, 220, { width: 5 }),
      rc(980, 320, 56, 44, { rx: 4, fill: PALE, width: 5 }),
      rc(830, 240, 56, 40, { rx: 4, fill: PALE, width: 5 }),
      grid(322, 290, 3, 5, 16, 22, 40, 52, { fill: INK, stroke: INK, width: 2 }),
      grid(790, 255, 2, 5, 18, 24, 45, 58, { fill: PALE, stroke: PALE, width: 1 }),
      grid(1136, 320, 2, 3, 20, 24, 54, 62, { fill: INK, stroke: INK, width: 2 }),
      el(1120, 120, 52, 52, { stroke: INK, width: 6, fill: PALE }),
      p('M 1100 100 Q 1112 96 1120 108', { stroke: SOFT, width: 4, fill: 'none' }),
      p('M 1130 140 Q 1140 136 1146 144', { stroke: SOFT, width: 4, fill: 'none' }),
      dot(160, 120, 3, 3), dot(300, 90, 2.5, 2.5), dot(600, 130, 2.5, 2.5),
      p('M 50 600 Q 180 588 310 600 T 570 600 T 830 600 T 1090 600 T 1250 600',
        { stroke: SOFT, width: 5, fill: 'none' }),
      ln(300, 640, 1160, 646, { stroke: SOFT, width: 4, dash: '24 18' })
    ]));

  /* 5.2 房间一角 */
  ASSETS.push(mk('scene-room-corner', '房间一角', 'scene',
    ['场景', '室内', '房间', '角落', '日常'], 1320, 720, [
      ln(620, 40, 620, 560, { width: 7 }),
      ln(30, 560, 1290, 560, { width: 7 }),
      ln(30, 540, 620, 540, { width: 6 }),
      ln(620, 540, 1290, 540, { width: 6 }),
      rc(150, 150, 260, 280, { stroke: INK, width: 8 }),
      ln(280, 150, 280, 430, { width: 6 }),
      ln(150, 290, 410, 290, { width: 6 }),
      rc(130, 430, 300, 18, { fill: PALE, width: 6 }),
      p('M 150 150 Q 200 260 168 430', { stroke: INK, width: 5, fill: 'none' }),
      p('M 410 150 Q 360 260 392 430', { stroke: INK, width: 5, fill: 'none' }),
      rc(460, 180, 110, 150, { fill: PAPER, width: 6 }),
      p('M 476 306 L 510 250 L 532 284 L 546 262 L 564 306', { stroke: MID, width: 4, fill: 'none' }),
      rc(860, 170, 240, 390, { stroke: INK, width: 8 }),
      rc(890, 200, 180, 360, { fill: PAPER, width: 7 }),
      el(1040, 390, 8, 10, { fill: INK, stroke: INK, width: 2 }),
      p('M 540 500 L 554 430 L 606 430 L 620 500 Z', { fill: PALE, width: 6 }),
      p('M 580 430 Q 560 370 532 340', { stroke: INK, width: 5, fill: 'none' }),
      p('M 580 430 Q 584 360 606 320', { stroke: INK, width: 5, fill: 'none' }),
      p('M 580 430 Q 606 384 640 366', { stroke: INK, width: 5, fill: 'none' }),
      p('M 580 430 Q 548 400 522 396', { stroke: INK, width: 5, fill: 'none' }),
      el(900, 610, 220, 44, { fill: 'hatch', stroke: SOFT, width: 4, opacity: 0.5 }),
      ln(990, 40, 990, 150, { width: 5 }),
      p('M 950 150 L 1030 150 L 1010 200 L 970 200 Z', { fill: PAPER, width: 6 }),
      el(990, 204, 8, 8, { fill: PALE, width: 3 }),
      ln(30, 620, 620, 580, { stroke: SOFT, width: 4, opacity: 0.5 }),
      ln(30, 660, 620, 610, { stroke: SOFT, width: 4, opacity: 0.5 })
    ]));

  /* 5.3 办公室 */
  ASSETS.push(mk('scene-office', '办公室', 'scene',
    ['场景', '办公室', '工作', '室内', '白天'], 1320, 720, [
      ln(30, 580, 1290, 580, { width: 7 }),
      ln(30, 556, 1290, 556, { width: 5 }),
      rc(90, 130, 440, 300, { stroke: INK, width: 8 }),
      ln(96, 170, 524, 170, { stroke: MID, width: 5 }),
      ln(96, 208, 524, 208, { stroke: MID, width: 5 }),
      ln(96, 246, 524, 246, { stroke: MID, width: 5 }),
      ln(96, 284, 524, 284, { stroke: MID, width: 5 }),
      ln(96, 322, 524, 322, { stroke: MID, width: 5 }),
      ln(96, 360, 524, 360, { stroke: MID, width: 5 }),
      ln(96, 398, 524, 398, { stroke: MID, width: 5 }),
      ln(310, 130, 310, 430, { width: 6 }),
      rc(70, 430, 480, 18, { fill: PALE, width: 6 }),
      rc(620, 430, 540, 24, { rx: 4, fill: PALE, width: 8 }),
      rc(650, 454, 24, 120, { width: 7 }),
      rc(1106, 454, 24, 120, { width: 7 }),
      rc(650, 454, 480, 14, { stroke: MID, width: 5, fill: 'none' }),
      rc(760, 250, 230, 146, { rx: 6, fill: PAPER, width: 7 }),
      rc(776, 266, 198, 114, { fill: PALE, width: 4 }),
      ln(875, 396, 875, 430, { width: 6 }),
      rc(830, 422, 90, 10, { rx: 4, fill: PALE, width: 5 }),
      rc(1040, 414, 56, 10, { rx: 4, fill: PALE, width: 5 }),
      ln(1068, 414, 1068, 330, { width: 5 }),
      p('M 1038 330 L 1098 330 L 1086 300 L 1050 300 Z', { fill: PAPER, width: 6 }),
      rc(500, 300, 24, 140, { rx: 8, fill: GRAY, stroke: INK, width: 6 }),
      rc(500, 440, 150, 20, { fill: GRAY, stroke: INK, width: 6 }),
      rc(520, 460, 14, 100, { fill: GRAY, width: 5 }),
      rc(620, 460, 14, 100, { fill: GRAY, width: 5 }),
      rc(1060, 404, 44, 20, { fill: PAPER, stroke: MID, width: 4 }),
      ln(660, 40, 660, 110, { width: 4 }),
      p('M 620 110 L 700 110 L 682 150 L 638 150 Z', { fill: PAPER, width: 6 }),
      el(600, 190, 30, 30, { stroke: INK, width: 5, fill: PAPER }),
      ln(600, 190, 600, 172, { width: 4 }),
      ln(600, 190, 614, 196, { width: 4 })
    ]));

  /* 5.4 走廊（一点透视） */
  ASSETS.push(mk('scene-corridor', '走廊', 'scene',
    ['场景', '走廊', '透视', '室内', '纵深'], 1320, 720, [
      rc(640, 280, 240, 160, { fill: PALE, stroke: INK, width: 8 }),
      rc(690, 310, 140, 130, { fill: PAPER, width: 6 }),
      ln(30, 690, 640, 440, { width: 7 }),
      ln(1290, 690, 880, 440, { width: 7 }),
      ln(30, 30, 640, 280, { width: 7 }),
      ln(1290, 30, 880, 280, { width: 7 }),
      ln(30, 30, 30, 690, { width: 7 }),
      ln(1290, 30, 1290, 690, { width: 7 }),
      p('M 100 380 L 260 330 L 260 560 L 100 640 Z', { fill: PAPER, width: 6 }),
      ln(238, 468, 256, 462, { width: 5 }),
      p('M 360 320 L 500 294 L 500 470 L 360 512 Z', { fill: PAPER, width: 6 }),
      ln(478, 382, 496, 376, { width: 5 }),
      p('M 1220 380 L 1060 330 L 1060 560 L 1220 640 Z', { fill: PAPER, width: 6 }),
      ln(1082, 468, 1064, 462, { width: 5 }),
      p('M 960 320 L 820 294 L 820 470 L 960 512 Z', { fill: PAPER, width: 6 }),
      ln(842, 382, 824, 376, { width: 5 }),
      ln(200, 690, 700, 420, { stroke: SOFT, width: 5 }),
      ln(480, 690, 730, 420, { stroke: SOFT, width: 5 }),
      ln(900, 690, 790, 420, { stroke: SOFT, width: 5 }),
      ln(560, 540, 1000, 540, { stroke: SOFT, width: 5 }),
      ln(640, 470, 880, 470, { stroke: SOFT, width: 5 }),
      ln(680, 430, 840, 430, { stroke: SOFT, width: 4 }),
      p('M 520 130 L 640 156 L 652 176 L 532 150 Z', { fill: PALE, stroke: INK, width: 5 }),
      p('M 650 190 L 730 202 L 738 218 L 658 206 Z', { fill: PALE, stroke: INK, width: 4 }),
      rc(700, 286, 120, 22, { fill: PAPER, stroke: INK, width: 4 }),
      tx(760, 303, 'EXIT', { size: 18, fill: INK, anchor: 'middle', font: 'sans' })
    ]));

  /* 5.5 卧室 */
  ASSETS.push(mk('scene-bedroom', '卧室', 'scene',
    ['场景', '卧室', '室内', '夜晚', '私密'], 1320, 720, [
      ln(30, 570, 1290, 570, { width: 7 }),
      ln(30, 546, 1290, 546, { width: 5 }),
      rc(90, 120, 380, 300, { stroke: INK, width: 8 }),
      ln(280, 120, 280, 420, { width: 6 }),
      ln(90, 270, 470, 270, { width: 6 }),
      rc(70, 420, 420, 18, { fill: PALE, width: 6 }),
      el(160, 190, 40, 40, { fill: PALE, stroke: INK, width: 5 }),
      dot(380, 180, 3, 3), dot(420, 230, 2.5, 2.5),
      p('M 90 120 Q 140 250 108 420', { stroke: INK, width: 5, fill: 'none' }),
      p('M 470 120 Q 420 250 452 420', { stroke: INK, width: 5, fill: 'none' }),
      rc(560, 240, 30, 220, { rx: 10, fill: PAPER, width: 8 }),
      rc(590, 430, 460, 50, { rx: 8, fill: PAPER, width: 8 }),
      rc(590, 400, 460, 36, { rx: 8, fill: PALE, width: 7 }),
      rc(620, 370, 120, 36, { rx: 14, fill: PAPER, width: 6 }),
      p('M 760 396 L 1030 396 L 1044 430 L 772 430 Z', { fill: 'hatch', stroke: INK, width: 6 }),
      ln(830, 396, 840, 430, { stroke: MID, width: 4 }),
      ln(920, 396, 930, 430, { stroke: MID, width: 4 }),
      rc(610, 480, 18, 26, { fill: PAPER, width: 5 }),
      rc(1020, 480, 18, 26, { fill: PAPER, width: 5 }),
      rc(440, 430, 100, 130, { fill: PAPER, width: 6 }),
      ln(450, 470, 530, 470, { stroke: MID, width: 4 }),
      ln(480, 486, 500, 486, { width: 4 }),
      ln(495, 430, 495, 390, { width: 5 }),
      rc(475, 426, 40, 8, { rx: 3, fill: PALE, width: 4 }),
      p('M 465 390 L 525 390 L 513 362 L 477 362 Z', { fill: PALE, stroke: INK, width: 6 }),
      el(950, 620, 250, 40, { fill: 'hatch', stroke: SOFT, width: 4, opacity: 0.5 }),
      rc(700, 140, 180, 120, { fill: PAPER, stroke: INK, width: 6 }),
      p('M 720 238 L 760 186 L 800 214 L 830 180 L 860 238', { stroke: MID, width: 4, fill: 'none' })
    ]));

  /* 5.6 雨夜街道 */
  ASSETS.push(mk('scene-rain-street', '雨夜街道', 'scene',
    ['场景', '街道', '雨夜', '路灯', '氛围'], 1320, 720, [
      rc(320, 300, 120, 80, { fill: GRAY, stroke: INK, width: 5 }),
      rc(480, 320, 90, 60, { fill: GRAY, stroke: INK, width: 5 }),
      rc(820, 310, 110, 70, { fill: GRAY, stroke: INK, width: 5 }),
      rc(960, 330, 80, 50, { fill: GRAY, stroke: INK, width: 5 }),
      ln(30, 90, 30, 640, { width: 8 }),
      ln(30, 90, 260, 150, { width: 6 }),
      ln(260, 150, 260, 700, { width: 6 }),
      ln(1290, 90, 1290, 640, { width: 8 }),
      ln(1290, 90, 1080, 160, { width: 6 }),
      ln(1080, 160, 1080, 700, { width: 6 }),
      grid(74, 210, 2, 2, 20, 26, 70, 86, { fill: PALE, stroke: INK, width: 3 }),
      grid(1120, 230, 2, 2, 20, 26, 64, 82, { fill: PALE, stroke: INK, width: 3 }),
      ln(30, 700, 700, 380, { width: 7 }),
      ln(1290, 700, 700, 380, { width: 7 }),
      ln(640, 700, 696, 400, { stroke: MID, width: 5, dash: '26 20' }),
      ln(30, 640, 680, 368, { width: 5 }),
      ln(1290, 640, 720, 368, { width: 5 }),
      ln(390, 460, 390, 250, { width: 6 }),
      p('M 390 250 L 390 230 Q 390 216 408 216 L 440 216', { stroke: INK, width: 6, fill: 'none' }),
      p('M 428 216 L 460 216 L 452 240 L 436 240 Z', { fill: PAPER, stroke: INK, width: 5 }),
      el(444, 244, 7, 7, { fill: PALE, width: 3 }),
      ln(446, 254, 446, 276, { stroke: SOFT, width: 4 }),
      ln(420, 246, 404, 262, { stroke: SOFT, width: 4 }),
      ln(468, 242, 484, 258, { stroke: SOFT, width: 4 }),
      ln(930, 470, 930, 260, { width: 6 }),
      p('M 930 260 L 930 240 Q 930 226 912 226 L 880 226', { stroke: INK, width: 6, fill: 'none' }),
      p('M 892 226 L 860 226 L 868 250 L 884 250 Z', { fill: PAPER, stroke: INK, width: 5 }),
      el(876, 254, 7, 7, { fill: PALE, width: 3 }),
      ln(874, 264, 874, 286, { stroke: SOFT, width: 4 }),
      ln(848, 252, 832, 268, { stroke: SOFT, width: 4 }),
      ln(900, 248, 916, 264, { stroke: SOFT, width: 4 }),
      streaks(16, 80, 80, 1100, 420, -26, 80, { stroke: MID, width: 4, opacity: 0.6 }),
      el(300, 650, 110, 16, { fill: 'hatch', stroke: SOFT, width: 4, opacity: 0.5 }),
      el(820, 680, 150, 18, { fill: 'hatch', stroke: SOFT, width: 4, opacity: 0.5 }),
      el(1150, 650, 90, 14, { fill: 'hatch', stroke: SOFT, width: 4, opacity: 0.5 })
    ]));

  /* 5.7 树林 */
  ASSETS.push(mk('scene-forest', '树林', 'scene',
    ['场景', '树林', '自然', '外景', '光线'], 1320, 720, [
      p('M 30 590 Q 660 550 1290 590', { stroke: INK, width: 7, fill: 'none' }),
      rc(200, 330, 34, 250, { fill: PAPER, width: 7 }),
      el(217, 260, 120, 100, { fill: 'hatch', stroke: INK, width: 6 }),
      el(150, 320, 70, 60, { fill: 'hatch', stroke: INK, width: 5 }),
      el(285, 320, 75, 62, { fill: 'hatch', stroke: INK, width: 5 }),
      rc(500, 280, 40, 300, { fill: PAPER, width: 7 }),
      el(520, 200, 150, 110, { fill: 'hatch', stroke: INK, width: 6 }),
      el(430, 270, 80, 64, { fill: 'hatch', stroke: INK, width: 5 }),
      el(610, 270, 85, 66, { fill: 'hatch', stroke: INK, width: 5 }),
      rc(900, 340, 32, 240, { fill: PAPER, width: 6 }),
      el(916, 270, 110, 90, { fill: 'hatch', stroke: INK, width: 6 }),
      el(990, 320, 70, 54, { fill: 'hatch', stroke: INK, width: 5 }),
      rc(1120, 300, 40, 290, { fill: PAPER, width: 7 }),
      el(1140, 210, 140, 110, { fill: 'hatch', stroke: INK, width: 6 }),
      el(1040, 280, 75, 60, { fill: 'hatch', stroke: INK, width: 5 }),
      rc(76, 420, 28, 170, { fill: PAPER, width: 6 }),
      el(94, 380, 82, 70, { fill: 'hatch', stroke: INK, width: 5 }),
      el(380, 560, 90, 34, { fill: 'hatch', stroke: INK, width: 5 }),
      el(760, 570, 110, 38, { fill: 'hatch', stroke: INK, width: 5 }),
      el(1030, 560, 80, 30, { fill: 'hatch', stroke: INK, width: 5 }),
      p('M 560 700 Q 640 620 660 590', { stroke: MID, width: 5, fill: 'none' }),
      p('M 780 700 Q 700 620 680 590', { stroke: MID, width: 5, fill: 'none' }),
      ln(340, 50, 250, 430, { stroke: SOFT, width: 5, opacity: 0.55 }),
      ln(620, 40, 540, 400, { stroke: SOFT, width: 5, opacity: 0.45 }),
      ln(850, 60, 800, 380, { stroke: SOFT, width: 4, opacity: 0.4 })
    ]));

  /* 5.8 天台 */
  ASSETS.push(mk('scene-rooftop', '天台', 'scene',
    ['场景', '天台', '屋顶', '城市', '外景'], 1320, 720, [
      rc(80, 470, 140, 90, { fill: GRAY, stroke: INK, width: 5 }),
      rc(260, 500, 90, 60, { fill: GRAY, stroke: INK, width: 5 }),
      rc(1000, 460, 180, 100, { fill: GRAY, stroke: INK, width: 5 }),
      rc(1210, 500, 80, 60, { fill: GRAY, stroke: INK, width: 5 }),
      rc(1120, 380, 70, 180, { fill: GRAY, stroke: INK, width: 5 }),
      ln(40, 470, 1280, 470, { width: 7 }),
      ln(40, 530, 1280, 530, { width: 5 }),
      ln(70, 470, 70, 600, { width: 5 }),
      ln(200, 470, 200, 600, { width: 5 }),
      ln(330, 470, 330, 600, { width: 5 }),
      ln(460, 470, 460, 600, { width: 5 }),
      ln(590, 470, 590, 600, { width: 5 }),
      ln(720, 470, 720, 600, { width: 5 }),
      ln(850, 470, 850, 600, { width: 5 }),
      ln(980, 470, 980, 600, { width: 5 }),
      ln(1110, 470, 1110, 600, { width: 5 }),
      ln(1240, 470, 1240, 600, { width: 5 }),
      ln(30, 600, 1290, 600, { width: 8 }),
      el(660, 690, 600, 26, { fill: 'hatch', stroke: SOFT, width: 4, opacity: 0.35 }),
      rc(940, 220, 190, 190, { rx: 10, fill: PAPER, stroke: INK, width: 8 }),
      ln(970, 410, 970, 470, { width: 6 }),
      ln(1100, 410, 1100, 470, { width: 6 }),
      ln(940, 280, 1130, 280, { stroke: MID, width: 5 }),
      rc(930, 200, 210, 24, { rx: 6, fill: PALE, width: 6 }),
      ln(990, 410, 990, 300, { width: 4 }),
      ln(1010, 410, 1010, 300, { width: 4 }),
      ln(990, 340, 1010, 340, { width: 4 }),
      rc(160, 320, 220, 280, { fill: PAPER, stroke: INK, width: 8 }),
      rc(200, 360, 140, 240, { stroke: INK, width: 6, fill: 'none' }),
      el(220, 480, 8, 10, { fill: INK, stroke: INK, width: 2 }),
      rc(480, 520, 70, 80, { fill: PALE, width: 6 }),
      rc(466, 500, 98, 22, { rx: 4, fill: PALE, width: 5 }),
      ln(700, 470, 700, 280, { width: 5 }),
      ln(660, 340, 740, 340, { width: 4 }),
      ln(675, 390, 725, 390, { width: 4 })
    ]));

  /* 5.9 审讯室 */
  ASSETS.push(mk('scene-interrogation', '审讯室', 'scene',
    ['场景', '审讯室', '悬疑', '室内', '压抑'], 1320, 720, [
      ln(30, 580, 1290, 580, { width: 7 }),
      ln(30, 556, 1290, 556, { width: 5 }),
      rc(120, 120, 420, 280, { fill: 'crosshatch', stroke: INK, width: 8 }),
      rc(140, 140, 380, 240, { stroke: INK, width: 4, fill: 'none' }),
      ln(600, 30, 600, 556, { stroke: SOFT, width: 4, opacity: 0.5 }),
      ln(1140, 30, 1140, 556, { stroke: SOFT, width: 4, opacity: 0.5 }),
      rc(280, 360, 20, 120, { fill: GRAY, stroke: INK, width: 6 }),
      rc(260, 460, 120, 18, { fill: GRAY, stroke: INK, width: 6 }),
      ln(270, 478, 270, 560, { width: 5 }),
      ln(370, 478, 370, 560, { width: 5 }),
      rc(720, 350, 20, 100, { fill: GRAY, stroke: INK, width: 6 }),
      rc(700, 450, 120, 18, { fill: GRAY, stroke: INK, width: 5 }),
      rc(420, 470, 480, 26, { rx: 4, fill: PALE, width: 8 }),
      rc(450, 496, 24, 84, { width: 6 }),
      rc(846, 496, 24, 84, { width: 6 }),
      rc(600, 446, 70, 22, { fill: PAPER, stroke: MID, width: 4 }),
      rc(680, 458, 54, 16, { fill: PAPER, stroke: MID, width: 4 }),
      rc(780, 440, 22, 30, { rx: 4, fill: PALE, width: 4 }),
      ln(860, 30, 860, 180, { width: 5 }),
      p('M 800 180 L 920 180 L 890 240 L 830 240 Z', { fill: PAPER, stroke: INK, width: 7 }),
      el(860, 246, 10, 10, { fill: PALE, width: 4 }),
      p('M 830 240 L 890 240 L 1050 580 L 660 580 Z',
        { fill: 'hatch', stroke: SOFT, width: 3, opacity: 0.28 }),
      p('M 860 40 Q 980 20 1100 44', { stroke: MID, width: 4, fill: 'none' }),
      p('M 860 40 Q 740 24 640 50', { stroke: MID, width: 4, fill: 'none' })
    ]));

  /* 5.10 医院走廊 */
  ASSETS.push(mk('scene-hospital', '医院走廊', 'scene',
    ['场景', '医院', '走廊', '冷清', '透视'], 1320, 720, [
      rc(660, 300, 200, 160, { fill: PALE, stroke: INK, width: 8 }),
      rc(700, 330, 120, 130, { fill: PAPER, width: 6 }),
      ln(30, 700, 660, 460, { width: 7 }),
      ln(1290, 700, 860, 460, { width: 7 }),
      ln(30, 30, 660, 300, { width: 7 }),
      ln(1290, 30, 860, 300, { width: 7 }),
      ln(30, 30, 30, 700, { width: 7 }),
      ln(1290, 30, 1290, 700, { width: 7 }),
      ln(30, 430, 660, 392, { width: 6 }),
      ln(30, 500, 660, 424, { width: 4 }),
      ln(1290, 430, 860, 392, { width: 6 }),
      ln(1290, 500, 860, 424, { width: 4 }),
      p('M 90 360 L 250 320 L 250 540 L 90 610 Z', { fill: PAPER, width: 6 }),
      p('M 350 300 L 480 280 L 480 460 L 350 490 Z', { fill: PAPER, width: 6 }),
      p('M 1230 360 L 1070 320 L 1070 540 L 1230 610 Z', { fill: PAPER, width: 6 }),
      p('M 970 300 L 840 280 L 840 460 L 970 490 Z', { fill: PAPER, width: 6 }),
      p('M 520 130 L 640 160 L 654 182 L 534 152 Z', { fill: PALE, stroke: INK, width: 5 }),
      p('M 660 196 L 730 208 L 738 224 L 668 212 Z', { fill: PALE, stroke: INK, width: 4 }),
      rc(736, 254, 48, 40, { fill: PAPER, stroke: INK, width: 5 }),
      ln(760, 262, 760, 286, { width: 6 }),
      ln(748, 274, 772, 274, { width: 6 }),
      rc(980, 520, 200, 16, { rx: 4, fill: GRAY, stroke: INK, width: 5 }),
      rc(980, 500, 180, 20, { fill: PALE, width: 5 }),
      ln(1010, 536, 1010, 600, { width: 5 }),
      ln(1150, 536, 1150, 600, { width: 5 }),
      el(1010, 610, 14, 14, { stroke: INK, width: 5 }),
      el(1150, 610, 14, 14, { stroke: INK, width: 5 }),
      ln(960, 500, 960, 540, { width: 5 }),
      ln(1180, 500, 1180, 540, { width: 5 }),
      ln(180, 700, 700, 440, { stroke: SOFT, width: 4 }),
      ln(460, 700, 740, 440, { stroke: SOFT, width: 4 }),
      ln(900, 700, 800, 440, { stroke: SOFT, width: 4 }),
      ln(560, 560, 940, 560, { stroke: SOFT, width: 4 }),
      ln(620, 500, 880, 500, { stroke: SOFT, width: 4 })
    ]));

  /* ==========================================================================
   * 6. MARK · 8 个镜头语言标记（可直接叠在画面上）
   * ========================================================================== */

  /* 6.1 推镜箭头（向心收拢） */
  ASSETS.push(mk('mark-push-in', '推镜箭头', 'mark',
    ['标记', '推镜', '箭头', '运镜', '向心'], 540, 360, [
      p('M 30 110 L 30 30 L 110 30', { stroke: INK, width: 8, fill: 'none' }),
      p('M 430 30 L 510 30 L 510 110', { stroke: INK, width: 8, fill: 'none' }),
      p('M 510 250 L 510 330 L 430 330', { stroke: INK, width: 8, fill: 'none' }),
      p('M 110 330 L 30 330 L 30 250', { stroke: INK, width: 8, fill: 'none' }),
      rc(130, 90, 280, 180, { stroke: SOFT, width: 4, dash: '12 10', fill: 'none' }),
      ln(80, 80, 150, 140, { width: 7, arrowEnd: true }),
      ln(460, 80, 390, 140, { width: 7, arrowEnd: true }),
      ln(80, 280, 150, 220, { width: 7, arrowEnd: true }),
      ln(460, 280, 390, 220, { width: 7, arrowEnd: true }),
      ln(270, 150, 270, 190, { width: 5 }),
      ln(250, 170, 290, 170, { width: 5 }),
      el(270, 170, 16, 16, { stroke: SOFT, width: 4, fill: 'none' })
    ]));

  /* 6.2 摇镜弧线 */
  ASSETS.push(mk('mark-pan-arc', '摇镜弧线', 'mark',
    ['标记', '摇镜', '弧线', '运镜', '方向'], 620, 340, [
      el(310, 296, 10, 10, { fill: INK, stroke: INK, width: 3 }),
      p('M 90 280 Q 310 60 530 270', { stroke: INK, width: 8, fill: 'none' }),
      p('M 170 278 Q 310 120 450 272', { stroke: SOFT, width: 4, dash: '12 10', fill: 'none' }),
      ln(498, 238, 566, 296, { stroke: INK, width: 7, arrowEnd: true }),
      ln(310, 40, 310, 310, { stroke: SOFT, width: 4, dash: '10 8' }),
      ln(70, 290, 110, 286, { width: 5 })
    ]));

  /* 6.3 视线虚线 */
  ASSETS.push(mk('mark-eyeline', '视线虚线', 'mark',
    ['标记', '视线', '虚线', '方向', '主观'], 540, 220, [
      p('M 40 90 Q 110 62 180 90', { stroke: INK, width: 6, fill: 'none' }),
      p('M 40 130 Q 110 76 180 130', { stroke: INK, width: 8, fill: 'none' }),
      p('M 40 130 Q 110 172 180 130', { stroke: INK, width: 6, fill: 'none' }),
      el(110, 130, 30, 30, { stroke: INK, width: 6, fill: PALE }),
      el(110, 130, 12, 14, { fill: INK, stroke: INK, width: 3 }),
      ln(40, 130, 22, 124, { width: 5 }),
      ln(44, 148, 28, 158, { width: 4 }),
      ln(180, 130, 470, 106, { width: 6, dash: '14 12', arrowEnd: true }),
      el(486, 104, 16, 16, { stroke: INK, width: 5, fill: 'none' }),
      ln(486, 80, 486, 88, { width: 4 }),
      ln(486, 120, 486, 128, { width: 4 })
    ]));

  /* 6.4 对白气泡 */
  ASSETS.push(mk('mark-bubble', '对白气泡', 'mark',
    ['标记', '对白', '气泡', '台词', '说话'], 360, 285, [
      p('M 110 200 L 84 256 L 150 200', { fill: PAPER, stroke: INK, width: 7 }),
      rc(30, 30, 290, 170, { rx: 30, fill: PAPER, stroke: INK, width: 8 }),
      el(100, 115, 12, 12, { fill: INK, stroke: INK, width: 3 }),
      el(180, 115, 12, 12, { fill: INK, stroke: INK, width: 3 }),
      el(260, 115, 12, 12, { fill: INK, stroke: INK, width: 3 }),
      ln(320, 60, 344, 44, { width: 5 }),
      ln(328, 100, 352, 96, { width: 5 })
    ]));

  /* 6.5 动作线 */
  ASSETS.push(mk('mark-action-lines', '动作线', 'mark',
    ['标记', '动作', '冲击', '速度', '力量'], 400, 340, [
      el(200, 170, 26, 20, { fill: INK, stroke: INK, width: 4 }),
      ln(200, 120, 200, 50, { width: 8 }),
      ln(200, 220, 200, 290, { width: 8 }),
      ln(150, 170, 80, 170, { width: 8 }),
      ln(250, 170, 320, 170, { width: 8 }),
      ln(155, 125, 100, 70, { width: 7 }),
      ln(245, 125, 300, 70, { width: 7 }),
      ln(155, 215, 100, 270, { width: 7 }),
      ln(245, 215, 300, 270, { width: 7 }),
      ln(130, 100, 112, 82, { width: 5 }),
      ln(270, 100, 288, 82, { width: 5 }),
      ln(135, 245, 117, 263, { width: 5 }),
      ln(265, 245, 283, 263, { width: 5 })
    ]));

  /* 6.6 闪光 */
  ASSETS.push(mk('mark-flash', '闪光', 'mark',
    ['标记', '闪光', '强光', '爆发', '瞬间'], 380, 380, [
      p('M 190 20 L 208 152 L 340 170 L 208 188 L 190 320 L 172 188 L 40 170 L 172 152 Z',
        { fill: PAPER, stroke: INK, width: 8 }),
      p('M 190 120 L 205 158 L 245 170 L 205 182 L 190 220 L 175 182 L 135 170 L 175 158 Z',
        { fill: INK, stroke: INK, width: 3 }),
      ln(90, 70, 60, 40, { width: 6 }),
      ln(290, 70, 320, 40, { width: 6 }),
      ln(90, 270, 60, 300, { width: 6 }),
      ln(290, 270, 320, 300, { width: 6 }),
      ln(320, 220, 336, 220, { width: 4 }),
      ln(328, 212, 328, 228, { width: 4 })
    ]));

  /* 6.7 镜头框 */
  ASSETS.push(mk('mark-camera-frame', '镜头框', 'mark',
    ['标记', '画框', '构图', '取景', '16:9'], 560, 340, [
      p('M 50 130 L 50 50 L 130 50', { stroke: INK, width: 8, fill: 'none' }),
      p('M 430 50 L 510 50 L 510 130', { stroke: INK, width: 8, fill: 'none' }),
      p('M 510 210 L 510 290 L 430 290', { stroke: INK, width: 8, fill: 'none' }),
      p('M 130 290 L 50 290 L 50 210', { stroke: INK, width: 8, fill: 'none' }),
      ln(203, 70, 203, 270, { stroke: SOFT, width: 4, dash: '10 10' }),
      ln(357, 70, 357, 270, { stroke: SOFT, width: 4, dash: '10 10' }),
      ln(70, 113, 490, 113, { stroke: SOFT, width: 4, dash: '10 10' }),
      ln(70, 227, 490, 227, { stroke: SOFT, width: 4, dash: '10 10' }),
      ln(280, 150, 280, 190, { width: 5 }),
      ln(260, 170, 300, 170, { width: 5 }),
      el(280, 170, 20, 20, { stroke: SOFT, width: 4, fill: 'none' }),
      tx(280, 324, '16:9', { size: 22, fill: MID, anchor: 'middle', font: 'sans' })
    ]));

  /* 6.8 雨线 */
  ASSETS.push(mk('mark-rain', '雨线', 'mark',
    ['标记', '雨线', '天气', '氛围', '叠加'], 420, 480, [
      p('M 60 150 Q 40 100 90 84 Q 100 40 150 50 Q 176 20 220 40 Q 268 26 290 66 Q 344 66 336 116 Q 372 132 352 168 Q 300 190 240 178 Q 170 196 110 180 Q 64 176 60 150 Z',
        { stroke: INK, width: 7, fill: 'none' }),
      streaks(12, 70, 210, 260, 70, -22, 56, { stroke: MID, width: 5, opacity: 0.8 }),
      el(210, 400, 120, 26, { fill: 'hatch', stroke: SOFT, width: 4, opacity: 0.55 }),
      el(210, 400, 70, 14, { stroke: SOFT, width: 4, fill: 'none' }),
      el(210, 400, 32, 7, { stroke: SOFT, width: 3, fill: 'none' }),
      ln(280, 360, 300, 340, { width: 4 }),
      ln(140, 370, 124, 350, { width: 4 })
    ]));

  /* ==========================================================================
   * 7. 收尾：细部线宽统一提升到 ≥5（契约要求 5~8 的导演线稿线宽）
   * ========================================================================== */
  ASSETS.forEach(function (asset) {
    asset.elements.forEach(function (e) {
      if (!e || e.type === 'text') return;
      if (typeof e.width === 'number' && e.width > 0 && e.width < 5) e.width = 5;
    });
  });

  window.SB_ASSETS = ASSETS;
})();
