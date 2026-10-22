/*!
 * APERTURE — 分镜预设库 v1
 * 传统 script（非 ES module），直接暴露 window.SB_PRESETS。
 * 统一坐标：1600 × 900。黑白导演手绘分镜语言：墨线 + 灰阶 + 米白纸面。
 */
(function () {
  'use strict';

  /* ==========================================================================
   * 0. 调色板 与 绘图基元
   * ========================================================================== */
  const INK  = '#141414';  // 主墨线、主体
  const GRAY = '#3b3a37';  // 暗部、中景剪影
  const MID  = '#6f6c66';  // 中灰、结构线
  const SOFT = '#a9a49a';  // 浅灰、远景、辅助线
  const PALE = '#ded9cf';  // 米灰、亮部
  const PAPER = '#f4f1e8'; // 米白纸面（背景）

  const p  = (d, o) => Object.assign({ type: 'path', d, stroke: INK, width: 4, fill: 'none', opacity: 1, dash: '' }, o);
  const ln = (x1, y1, x2, y2, o) => Object.assign({ type: 'line', x1, y1, x2, y2, stroke: INK, width: 4, opacity: 1, dash: '', arrowEnd: false }, o);
  const rc = (x, y, w, h, o) => Object.assign({ type: 'rect', x, y, w, h, rx: 0, stroke: INK, width: 4, fill: 'none', opacity: 1 }, o);
  const el = (cx, cy, rx, ry, o) => Object.assign({ type: 'ellipse', cx, cy, rx, ry, stroke: INK, width: 4, fill: 'none', opacity: 1 }, o);
  const tx = (x, y, text, o) => Object.assign({ type: 'text', x, y, text, size: 34, fill: INK, anchor: 'start', weight: '400', font: 'serif', italic: false, opacity: 1 }, o);

  /* 确定性随机：保证每次加载画面一致 */
  let _seed = 20261021;
  const rnd = () => { _seed = (_seed * 1664525 + 1013904223) >>> 0; return _seed / 4294967296; };
  const rr = (a, b) => a + (b - a) * rnd();
  const ri = (a, b) => Math.round(rr(a, b));

  const Z = (o) => Object.assign({ stroke: SOFT, width: 1.4 }, o);            // 远景结构线
  const DASH = (o) => Object.assign({ stroke: SOFT, width: 1.5, dash: '6 8' }, o); // 辅助虚线
  const lerpNum = (a, b, t) => a + (b - a) * t;

  /* ==========================================================================
   * 1. 分镜标注 / 运镜语言标记
   * ========================================================================== */
  // 左上：镜号 + 焦段；左下：场次提示（中文），仅为分镜纸标注
  function slate(no, lens, scene, o) {
    o = o || {};
    const x = o.x == null ? 76 : o.x;
    const y = o.y == null ? 84 : o.y;
    const a = [
      tx(x, y, no + (lens ? '  ' + lens : ''), { size: 18, fill: MID }),
      ln(x, y + 14, x + 96, y + 14, Z({ width: 1.3 }))
    ];
    if (scene) a.push(tx(x, o.sceneY == null ? 838 : o.sceneY, scene, { size: 21, fill: GRAY }));
    return a;
  }

  // 推镜：双层画框
  function markPush(m, label) {
    m = m || 122;
    const k = m + 90;
    return [
      rc(m, m, 1600 - m * 2, 900 - m * 2, DASH({ width: 1.4, opacity: 0.7 })),
      rc(k, k, 1600 - k * 2, 900 - k * 2, DASH({ width: 1.2, opacity: 0.42 })),
      tx(1600 - m, 900 - m + 34, label || 'PUSH IN', { anchor: 'end', size: 17, fill: MID })
    ];
  }

  // 横移 / 跟拍 / 升降：带箭头的运动线
  function markMove(x1, y1, x2, y2, label, o) {
    o = o || {};
    const a = [ln(x1, y1, x2, y2, Object.assign({ stroke: MID, width: 2.2, dash: '14 8', arrowEnd: true, opacity: 0.85 }, o))];
    if (label) {
      const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
      a.push(tx(mx, my - 14, label, { size: 17, fill: MID, anchor: 'middle' }));
    }
    return a;
  }

  // 手持：四角抖动记号
  function markHandheld() {
    return [
      p('M 50 170 l 18 -11 l 5 22 l 21 -16', Z({ width: 1.6 })),
      p('M 1550 730 l -18 11 l -5 -22 l -20 16', Z({ width: 1.6 })),
      tx(1550, 842, 'HANDHELD', { anchor: 'end', size: 17, fill: MID })
    ];
  }

  // 视线 / 对视线（虚线箭头）
  function gaze(x1, y1, x2, y2, label, o) {
    const a = [ln(x1, y1, x2, y2, Object.assign({ stroke: SOFT, width: 1.6, dash: '6 7', arrowEnd: true, opacity: 0.92 }, o))];
    if (label) a.push(tx((x1 + x2) / 2, Math.min(y1, y2) - 12, label, { size: 16, fill: MID, anchor: 'middle' }));
    return a;
  }

  const guideV = (x, o) => ln(x, 46, x, 854, DASH(Object.assign({ width: 1, opacity: 0.38, dash: '2 10' }, o)));
  const guideH = (y, o) => ln(46, y, 1554, y, DASH(Object.assign({ width: 1, opacity: 0.38, dash: '2 10' }, o)));

  /* ==========================================================================
   * 2. 人物：极简身体结构，不画卡通表情
   * ========================================================================== */
  function shadowPatch(x, y, w) {
    return [
      ln(x - w / 2, Math.min(892, y), x - w / 2 + w * 0.4, Math.min(892, y), { stroke: SOFT, width: 1.6 }),
      ln(x - w / 2 + w * 0.1, Math.min(892, y) + 4, x - w / 2 + w * 0.52, Math.min(892, y) + 4, { stroke: SOFT, width: 1.4 }),
      ln(x - w / 2 + w * 0.22, Math.min(892, y) + 8, x - w / 2 + w * 0.62, Math.min(892, y) + 8, { stroke: SOFT, width: 1.2 })
    ];
  }

  // 全身人物：剪影为整块面；线稿保留结构线。pose: stand | walk | back | run | ready | sit | reach
  function figure(x, ground, h, o) {
    o = o || {};
    const sil = !!o.sil;
    const ink = o.ink || (sil ? GRAY : INK);
    const sw = o.w != null ? o.w : Math.max(2.2, h * 0.017);
    const pose = o.pose || 'stand';
    const headR = h * 0.071;
    const top = ground - h;
    const hx = x + (o.dx || 0) * h;
    const lean = pose === 'run' ? h * 0.05 : pose === 'walk' ? h * 0.012 : 0;
    const out = [];
    const shHalf = h * 0.107;
    const waistHalf = h * 0.068;
    const hipY = ground - h * 0.45;
    const hemY = ground - (o.coat ? h * 0.27 : h * 0.37);
    const kneeY = ground - h * 0.245;
    const silStroke = { fill: ink, stroke: ink, width: 1 };
    const line = { stroke: ink };

    // ----- 姿态参数 -----
    let seated = pose === 'sit';
    let hy = top + headR;
    let shY = top + h * 0.205;
    let hipY2 = hipY;
    let footL = [hx - h * 0.052, ground], footR = [hx + h * 0.058, ground];
    let kneeL = [hx - h * 0.05, kneeY], kneeR = [hx + h * 0.056, kneeY];
    let handL = [hx - shHalf * 1.08, ground - h * 0.285], handR = [hx + shHalf * 1.08, ground - h * 0.275];
    let elbowL = [hx - shHalf * 1.06, shY + h * 0.135], elbowR = [hx + shHalf * 1.06, shY + h * 0.135];

    if (seated) {
      hy = ground - h * 0.845 + headR;
      shY = ground - h * 0.79;
      hipY2 = ground - h * 0.44;
      kneeL = [hx + h * 0.14, ground - h * 0.42];
      kneeR = [hx + h * 0.185, ground - h * 0.415];
      footL = [hx + h * 0.18, ground];
      footR = [hx + h * 0.235, ground];
      handL = [hx - h * 0.06, ground - h * 0.36];
      handR = [hx + h * 0.16, ground - h * 0.34];
      elbowL = [hx - shHalf * 0.9, shY + h * 0.14];
      elbowR = [hx + shHalf * 0.9, shY + h * 0.14];
    } else if (pose === 'walk') {
      footL = [hx - h * 0.105, ground];
      footR = [hx + h * 0.115, ground - h * 0.006];
      kneeL = [hx - h * 0.06, kneeY];
      kneeR = [hx + h * 0.07, kneeY - h * 0.01];
      handL = [hx + shHalf * 0.62, ground - h * 0.17];
      handR = [hx - shHalf * 0.6, ground - h * 0.16];
      elbowL = [hx + shHalf * 0.35, shY + h * 0.15];
      elbowR = [hx - shHalf * 0.35, shY + h * 0.15];
    } else if (pose === 'run') {
      footL = [hx - h * 0.135, ground - h * 0.02];
      footR = [hx + h * 0.16, ground];
      kneeL = [hx - h * 0.09, ground - h * 0.31];
      kneeR = [hx + h * 0.11, ground - h * 0.27];
      handL = [hx + h * 0.13, shY + h * 0.12];
      handR = [hx - h * 0.11, shY + h * 0.19];
      elbowL = [hx + h * 0.03, shY + h * 0.14];
      elbowR = [hx - h * 0.03, shY + h * 0.2];
    } else if (pose === 'ready') {
      footL = [hx - h * 0.10, ground];
      footR = [hx + h * 0.11, ground];
      kneeL = [hx - h * 0.085, kneeY];
      kneeR = [hx + h * 0.095, kneeY - h * 0.01];
      handL = [hx - h * 0.03, shY + h * 0.14];
      handR = [hx + h * 0.05, shY + h * 0.1];
      elbowL = [hx - shHalf * 0.65, shY + h * 0.09];
      elbowR = [hx + shHalf * 0.72, shY + h * 0.08];
    } else if (pose === 'reach') {
      handR = [hx + shHalf * 1.05, shY - h * 0.1];
      elbowR = [hx + shHalf * 1.0, shY + h * 0.04];
    }

    const shL = [hx - shHalf + lean, shY];
    const shR = [hx + shHalf + lean, shY];
    const hd = [hx + lean, hy];

    // ----- 腿 -----
    if (seated) {
      if (sil) {
        out.push(p(`M ${hx - h * 0.07} ${hipY2} L ${kneeL[0] - h * 0.02} ${kneeL[1] - h * 0.025} L ${kneeL[0] + h * 0.05} ${kneeL[1] - h * 0.025} L ${hx + h * 0.07} ${hipY2} Z`, silStroke));
        out.push(p(`M ${kneeL[0] + h * 0.005} ${kneeL[1] - h * 0.03} L ${kneeL[0]} ${ground - h * 0.02} L ${footL[0] + h * 0.03} ${ground - h * 0.02} L ${kneeL[0] + h * 0.075} ${kneeL[1] - h * 0.03} Z`, silStroke));
        out.push(p(`M ${footL[0] - h * 0.005} ${ground} L ${footL[0] + h * 0.085} ${ground} L ${footL[0] + h * 0.08} ${ground - h * 0.025} L ${footL[0] + h * 0.005} ${ground - h * 0.025} Z`, silStroke));
        out.push(p(`M ${hx + h * 0.03} ${hipY2} L ${kneeR[0] - h * 0.02} ${kneeR[1] - h * 0.02} L ${kneeR[0] + h * 0.05} ${kneeR[1] - h * 0.02} L ${hx + h * 0.09} ${hipY2} Z`, silStroke));
        out.push(p(`M ${kneeR[0] + h * 0.01} ${kneeR[1] - h * 0.025} L ${kneeR[0] + h * 0.02} ${ground - h * 0.02} L ${footR[0] + h * 0.03} ${ground - h * 0.02} L ${kneeR[0] + h * 0.08} ${kneeR[1] - h * 0.025} Z`, silStroke));
        out.push(p(`M ${footR[0] - h * 0.005} ${ground} L ${footR[0] + h * 0.085} ${ground} L ${footR[0] + h * 0.08} ${ground - h * 0.025} L ${footR[0] + h * 0.005} ${ground - h * 0.025} Z`, silStroke));
      } else {
        out.push(p(`M ${hx} ${hipY2} C ${hx + h * 0.05} ${hipY2}, ${kneeL[0]} ${kneeL[1] + h * 0.02}, ${kneeL[0]} ${kneeL[1]} L ${kneeL[0] + h * 0.005} ${ground - h * 0.015}`, { stroke: ink, width: sw * 1.35 }));
        out.push(ln(kneeL[0] + h * 0.005, ground - h * 0.005, kneeL[0] + h * 0.09, ground - h * 0.005, { stroke: ink, width: sw * 1.3 }));
        out.push(p(`M ${hx + h * 0.035} ${hipY2} C ${hx + h * 0.09} ${hipY2}, ${kneeR[0]} ${kneeR[1] + h * 0.02}, ${kneeR[0]} ${kneeR[1]} L ${kneeR[0] + h * 0.01} ${ground - h * 0.012}`, { stroke: ink, width: sw * 1.35 }));
        out.push(ln(kneeR[0] + h * 0.01, ground - h * 0.002, kneeR[0] + h * 0.1, ground - h * 0.002, { stroke: ink, width: sw * 1.3 }));
        out.push(p(`M ${hx + h * 0.02} ${hipY2 + h * 0.03} C ${hx + h * 0.09} ${hipY2 + h * 0.05}, ${kneeR[0] - h * 0.01} ${kneeR[1] + h * 0.05}, ${kneeR[0] + h * 0.01} ${kneeR[1] + h * 0.02}`, { stroke: ink, width: sw * 0.8, opacity: 0.85 }));
      }
    } else if (sil) {
      const legPath = (hip, knee, foot) => `M ${hip[0] - h * 0.032} ${hip[1]} L ${knee[0] - h * 0.028} ${knee[1]} L ${foot[0] - h * 0.022} ${foot[1] - h * 0.018} L ${foot[0] - h * 0.042} ${foot[1] - h * 0.018} L ${foot[0] - h * 0.05} ${foot[1]} L ${foot[0] + h * 0.042} ${foot[1]} L ${foot[0] + h * 0.032} ${foot[1] - h * 0.018} L ${foot[0] + h * 0.012} ${foot[1] - h * 0.018} L ${knee[0] + h * 0.028} ${knee[1]} L ${hip[0] + h * 0.032} ${hip[1]} Z`;
      out.push(p(legPath([hx - h * 0.035, hipY2], kneeL, footL), silStroke));
      out.push(p(legPath([hx + h * 0.042, hipY2], kneeR, footR), silStroke));
    } else {
      out.push(p(`M ${hx - h * 0.036} ${hipY2} L ${kneeL[0]} ${kneeL[1]} L ${footL[0]} ${footL[1]}`, { stroke: ink, width: sw * 1.5 }));
      out.push(p(`M ${hx + h * 0.043} ${hipY2} L ${kneeR[0]} ${kneeR[1]} L ${footR[0]} ${footR[1]}`, { stroke: ink, width: sw * 1.5 }));
      out.push(ln(footL[0] - h * 0.018, footL[1], footL[0] + h * 0.035, footL[1], { stroke: ink, width: sw * 1.5 }));
      out.push(ln(footR[0] - h * 0.018, footR[1], footR[0] + h * 0.035, footR[1], { stroke: ink, width: sw * 1.5 }));
    }

    // ----- 躯干 / 大衣 -----
    if (sil) {
      const coatD = `M ${shL[0]} ${shY} C ${shL[0] - h * 0.004} ${shY - h * 0.022}, ${hx + lean - shHalf * 0.55} ${shY - h * 0.03}, ${hx + lean} ${shY - h * 0.028} C ${hx + lean + shHalf * 0.55} ${shY - h * 0.03}, ${shR[0] + h * 0.004} ${shY - h * 0.022}, ${shR[0]} ${shY} C ${shR[0] + h * 0.005} ${shY + h * 0.06}, ${hx + waistHalf * 1.25} ${hipY2 - h * 0.05}, ${hx + waistHalf} ${hipY2} L ${hx + (o.coat ? h * 0.112 : h * 0.085)} ${hemY} Q ${hx + h * 0.04} ${hemY + h * 0.025}, ${hx} ${hemY + h * 0.012} Q ${hx - h * 0.04} ${hemY + h * 0.025}, ${hx - (o.coat ? h * 0.112 : h * 0.085)} ${hemY} L ${hx - waistHalf} ${hipY2} C ${hx - waistHalf * 1.25} ${hipY2 - h * 0.05}, ${shL[0] - h * 0.005} ${shY + h * 0.06}, ${shL[0]} ${shY} Z`;
      out.push(p(coatD, silStroke));
      // 衣摆开衩 / 肩线 / 腿缝
      out.push(ln(hx, hemY + h * 0.005, hx, hemY + h * 0.09, { stroke: PALE, width: Math.max(1, h * 0.006), opacity: 0.35 }));
      out.push(p(`M ${hx + lean} ${shY + h * 0.05} L ${hx} ${hemY + h * 0.02}`, { stroke: PALE, width: Math.max(1, h * 0.005), opacity: 0.25 }));
      out.push(ln(hx - h * 0.03, hemY + h * 0.06, hx - h * 0.045, ground - h * 0.03, { stroke: MID, width: Math.max(1, h * 0.005), opacity: 0.35 }));
      out.push(ln(hx + h * 0.03, hemY + h * 0.06, hx + h * 0.045, ground - h * 0.03, { stroke: MID, width: Math.max(1, h * 0.005), opacity: 0.35 }));
      out.push(ln(hx + lean - shHalf * 0.55, shY + h * 0.005, hx + lean - shHalf * 0.15, shY + h * 0.02, { stroke: PALE, width: Math.max(1, h * 0.005), opacity: 0.3 }));
      out.push(ln(hx + lean + shHalf * 0.15, shY + h * 0.02, hx + lean + shHalf * 0.55, shY + h * 0.005, { stroke: PALE, width: Math.max(1, h * 0.005), opacity: 0.3 }));
    } else {
      out.push(p(`M ${shL[0]} ${shY + h * 0.012} C ${shL[0]} ${shY}, ${hx + lean - h * 0.075} ${shY - h * 0.012}, ${hx + lean} ${shY - h * 0.01} C ${hx + lean + h * 0.075} ${shY - h * 0.012}, ${shR[0]} ${shY}, ${shR[0]} ${shY + h * 0.012}`, { stroke: ink, width: sw * 1.2 }));
      out.push(p(`M ${shL[0]} ${shY + h * 0.02} C ${shL[0] + h * 0.008} ${shY + h * 0.1}, ${hx - waistHalf * 1.3} ${hipY2 - h * 0.08}, ${hx - waistHalf} ${hipY2}`, { stroke: ink, width: sw }));
      out.push(p(`M ${shR[0]} ${shY + h * 0.02} C ${shR[0] - h * 0.008} ${shY + h * 0.1}, ${hx + waistHalf * 1.3} ${hipY2 - h * 0.08}, ${hx + waistHalf} ${hipY2}`, { stroke: ink, width: sw }));
      out.push(ln(hx - waistHalf, hipY2, hx + waistHalf, hipY2, { stroke: ink, width: sw }));
      out.push(p(`M ${shL[0]} ${shY + h * 0.02} C ${shL[0] + h * 0.01} ${shY + h * 0.12}, ${hx - waistHalf * 1.35} ${hipY2 - h * 0.08}, ${hx - waistHalf} ${hipY2} L ${hx + waistHalf} ${hipY2} C ${hx + waistHalf * 1.35} ${hipY2 - h * 0.08}, ${shR[0] - h * 0.01} ${shY + h * 0.12}, ${shR[0]} ${shY + h * 0.02} Z`, { fill: 'hatch', stroke: 'none', width: 0, opacity: 0.18 }));
      if (o.coat) {
        out.push(p(`M ${shL[0] - h * 0.004} ${shY + h * 0.02} C ${shL[0] - h * 0.012} ${shY + h * 0.14}, ${hx - h * 0.08} ${hemY - h * 0.08}, ${hx - h * 0.088} ${hemY}`, { stroke: ink, width: sw }));
        out.push(p(`M ${shR[0] + h * 0.004} ${shY + h * 0.02} C ${shR[0] + h * 0.012} ${shY + h * 0.14}, ${hx + h * 0.08} ${hemY - h * 0.08}, ${hx + h * 0.088} ${hemY}`, { stroke: ink, width: sw }));
        out.push(ln(hx - h * 0.088, hemY, hx + h * 0.088, hemY, { stroke: ink, width: sw }));
        out.push(ln(hx + h * 0.004, shY + h * 0.02, hx + h * 0.012, hemY - h * 0.01, { stroke: ink, width: sw * 0.7, opacity: 0.85 }));
        out.push(p(`M ${hx - h * 0.07} ${shY + h * 0.012} L ${hx + h * 0.004} ${shY + h * 0.09} L ${hx + h * 0.075} ${shY + h * 0.008}`, { stroke: ink, width: sw * 0.7 }));
      }
    }

    // ----- 手臂 -----
    if (sil) {
      const armW = Math.max(2.5, h * 0.036);
      out.push(p(`M ${shL[0]} ${shY + h * 0.02} L ${elbowL[0]} ${elbowL[1]} L ${handL[0]} ${handL[1]}`, { stroke: ink, width: armW }));
      out.push(p(`M ${shR[0]} ${shY + h * 0.02} L ${elbowR[0]} ${elbowR[1]} L ${handR[0]} ${handR[1]}`, { stroke: ink, width: armW }));
      out.push(el(handL[0], handL[1] + armW * 0.35, armW * 0.42, armW * 0.55, silStroke));
      out.push(el(handR[0], handR[1] + armW * 0.35, armW * 0.42, armW * 0.55, silStroke));
    } else {
      out.push(p(`M ${shL[0]} ${shY + h * 0.015} C ${shL[0] - h * 0.012} ${shY + h * 0.11}, ${elbowL[0] - h * 0.004} ${elbowL[1] - h * 0.02}, ${elbowL[0]} ${elbowL[1]} L ${handL[0]} ${handL[1]}`, { stroke: ink, width: sw * 1.25 }));
      out.push(p(`M ${shR[0]} ${shY + h * 0.015} C ${shR[0] + h * 0.012} ${shY + h * 0.11}, ${elbowR[0] + h * 0.004} ${elbowR[1] - h * 0.02}, ${elbowR[0]} ${elbowR[1]} L ${handR[0]} ${handR[1]}`, { stroke: ink, width: sw * 1.25 }));
      out.push(ln(handL[0] - h * 0.012, handL[1], handL[0] + h * 0.012, handL[1] + h * 0.004, { stroke: ink, width: sw * 0.9 }));
      out.push(ln(handR[0] - h * 0.012, handR[1], handR[0] + h * 0.012, handR[1] + h * 0.004, { stroke: ink, width: sw * 0.9 }));
    }

    // ----- 头 / 颈 -----
    if (sil) {
      out.push(rc(hx + lean - headR * 0.2, hy + headR * 0.7, headR * 0.4, headR * 0.55, silStroke));
      out.push(el(hd[0], hd[1], headR * 0.9, headR, silStroke));
      out.push(p(`M ${hd[0] - headR * 0.9} ${hd[1] - headR * 0.25} C ${hd[0] - headR * 0.6} ${hd[1] - headR * 1.1}, ${hd[0] + headR * 0.55} ${hd[1] - headR * 1.05}, ${hd[0] + headR * 0.88} ${hd[1] - headR * 0.1}`, silStroke));
      if (o.face !== 'back' && o.face === 'left') out.push(p(`M ${hd[0] - headR * 0.82} ${hd[1] - headR * 0.08} l ${-headR * 0.22} ${headR * 0.1} l ${headR * 0.19} ${headR * 0.12}`, silStroke));
      else if (o.face !== 'back') out.push(p(`M ${hd[0] + headR * 0.82} ${hd[1] - headR * 0.08} l ${headR * 0.22} ${headR * 0.1} l ${-headR * 0.19} ${headR * 0.12}`, silStroke));
    } else {
      out.push(ln(hx + lean - headR * 0.24, hy + headR * 0.86, hx + lean - headR * 0.2, shY + 2, { stroke: ink, width: sw * 0.85 }));
      out.push(ln(hx + lean + headR * 0.24, hy + headR * 0.86, hx + lean + headR * 0.2, shY + 2, { stroke: ink, width: sw * 0.85 }));
      out.push(el(hd[0], hd[1], headR * 0.9, headR, { stroke: ink, width: sw * 1.15 }));
      out.push(p(`M ${hd[0] - headR * 0.84} ${hd[1] - headR * 0.28} C ${hd[0] - headR * 0.7} ${hd[1] - headR * 1.1}, ${hd[0] + headR * 0.55} ${hd[1] - headR * 1.08}, ${hd[0] + headR * 0.86} ${hd[1] - headR * 0.16} C ${hd[0] + headR * 0.5} ${hd[1] - headR * 0.5}, ${hd[0] - headR * 0.3} ${hd[1] - headR * 0.55}, ${hd[0] - headR * 0.84} ${hd[1] - headR * 0.28} Z`, { fill: ink, stroke: ink, width: 1, opacity: 0.9 }));
      if (o.face !== 'back') out.push(p(`M ${hd[0] + headR * 0.8} ${hd[1] - headR * 0.05} l ${headR * 0.24} ${headR * 0.12} l ${-headR * 0.2} ${headR * 0.12}`, { stroke: ink, width: sw * 0.8 }));
    }
    if (o.hat) out.push(p(`M ${hd[0] - headR * 1.35} ${hd[1] - headR * 0.5} L ${hd[0] + headR * 1.2} ${hd[1] - headR * 0.5} L ${hd[0] + headR * 0.9} ${hd[1] - headR * 1.05} L ${hd[0] - headR * 0.8} ${hd[1] - headR * 1.05} Z`, { stroke: ink, width: sw * 0.9 }));
    return out;
  }

  // 半身 / 腰部以上：用于 MS / MCU（画面下沿自然裁切）
  function bust(x, top, H, o) {
    o = o || {};
    const sil = !!o.sil;
    const ink = o.ink || (sil ? GRAY : INK);
    const sw = o.w != null ? o.w : Math.max(2.4, H * 0.022);
    const out = [];
    const cy = top + H * 0.52;
    const hw = H * 0.36;
    const shY = top + H * 1.4;
    const shoulder = H * 1.0;
    const hairD = `M ${x + hw * 0.28} ${cy - H * 0.34} C ${x + hw * 0.1} ${cy - H * 0.56}, ${x - hw * 0.3} ${cy - H * 0.56}, ${x - hw * 0.58} ${cy - H * 0.32} C ${x - hw * 0.9} ${cy - H * 0.06}, ${x - hw * 0.86} ${cy + H * 0.16}, ${x - hw * 0.6} ${cy + H * 0.3} C ${x - hw * 0.66} ${cy + H * 0.08}, ${x - hw * 0.54} ${cy - H * 0.14}, ${x - hw * 0.26} ${cy - H * 0.24} C ${x - hw * 0.04} ${cy - H * 0.31}, ${x + hw * 0.16} ${cy - H * 0.33}, ${x + hw * 0.28} ${cy - H * 0.34} Z`;
    if (sil) {
      out.push(el(x, cy, hw * 0.95, H * 0.5, { fill: ink, stroke: ink, width: 1 }));
      out.push(p(hairD, { fill: ink, stroke: ink, width: 1 }));
      out.push(rc(x - H * 0.1, cy + H * 0.38, H * 0.2, H * 0.3, { fill: ink, stroke: ink, width: 1 }));
      out.push(p(`M ${x - shoulder} ${shY + H * 0.18} C ${x - shoulder * 0.95} ${shY - H * 0.02}, ${x - shoulder * 0.5} ${shY - H * 0.08}, ${x - H * 0.16} ${shY - H * 0.06} L ${x + H * 0.16} ${shY - H * 0.06} C ${x + shoulder * 0.5} ${shY - H * 0.08}, ${x + shoulder * 0.95} ${shY - H * 0.02}, ${x + shoulder} ${shY + H * 0.18} L ${x + shoulder * 1.2} 900 L ${x - shoulder * 1.2} 900 Z`, { fill: ink, stroke: ink, width: 1 }));
      return out;
    }
    // 3/4 头型
    out.push(p(`M ${x - hw * 0.12} ${cy - H * 0.5} C ${x + hw * 0.34} ${cy - H * 0.54}, ${x + hw * 0.98} ${cy - H * 0.3}, ${x + hw * 0.96} ${cy - H * 0.02} C ${x + hw * 0.95} ${cy + H * 0.22}, ${x + hw * 0.7} ${cy + H * 0.43}, ${x + hw * 0.35} ${cy + H * 0.48} C ${x + hw * 0.1} ${cy + H * 0.52}, ${x - hw * 0.24} ${cy + H * 0.44}, ${x - hw * 0.52} ${cy + H * 0.3} C ${x - hw * 0.88} ${cy + H * 0.14}, ${x - hw * 0.98} ${cy - H * 0.12}, ${x - hw * 0.86} ${cy - H * 0.33} C ${x - hw * 0.72} ${cy - H * 0.5}, ${x - hw * 0.4} ${cy - H * 0.54}, ${x - hw * 0.12} ${cy - H * 0.5} Z`, { stroke: ink, width: sw * 1.1 }));
    // 头发
    out.push(p(hairD, { fill: GRAY, stroke: ink, width: sw * 0.7, opacity: 0.88 }));
    out.push(p(`M ${x + hw * 0.1} ${cy - H * 0.36} C ${x - hw * 0.05} ${cy - H * 0.5}, ${x - hw * 0.4} ${cy - H * 0.46}, ${x - hw * 0.6} ${cy - H * 0.26}`, { stroke: ink, width: sw * 0.55, opacity: 0.7 }));
    // 耳
    out.push(p(`M ${x - hw * 0.9} ${cy + H * 0.02} C ${x - hw * 1.04} ${cy + H * 0.0}, ${x - hw * 1.06} ${cy + H * 0.14}, ${x - hw * 0.92} ${cy + H * 0.17}`, { stroke: ink, width: sw * 0.6 }));
    // 眉 / 眼（3/4）
    out.push(p(`M ${x + hw * 0.08} ${cy - H * 0.14} C ${x + hw * 0.24} ${cy - H * 0.17}, ${x + hw * 0.4} ${cy - H * 0.15}, ${x + hw * 0.49} ${cy - H * 0.1}`, { stroke: ink, width: sw * 0.9 }));
    out.push(p(`M ${x - hw * 0.56} ${cy - H * 0.13} C ${x - hw * 0.44} ${cy - H * 0.16}, ${x - hw * 0.32} ${cy - H * 0.15}, ${x - hw * 0.25} ${cy - H * 0.11}`, { stroke: ink, width: sw * 0.7 }));
    out.push(p(`M ${x + hw * 0.12} ${cy - H * 0.04} C ${x + hw * 0.24} ${cy - H * 0.075}, ${x + hw * 0.37} ${cy - H * 0.07}, ${x + hw * 0.45} ${cy - H * 0.03}`, { stroke: ink, width: sw * 0.6 }));
    out.push(p(`M ${x + hw * 0.14} ${cy - H * 0.038} C ${x + hw * 0.25} ${cy - H * 0.015}, ${x + hw * 0.35} ${cy - H * 0.018}, ${x + hw * 0.43} ${cy - H * 0.04}`, { stroke: ink, width: sw * 0.5 }));
    out.push(el(x + hw * 0.29, cy - H * 0.052, H * 0.013, H * 0.014, { fill: GRAY, stroke: ink, width: 1 }));
    out.push(p(`M ${x - hw * 0.46} ${cy - H * 0.045} C ${x - hw * 0.38} ${cy - H * 0.065}, ${x - hw * 0.3} ${cy - H * 0.06}, ${x - hw * 0.25} ${cy - H * 0.04}`, { stroke: ink, width: sw * 0.45 }));
    // 鼻 / 唇 / 下颚
    out.push(p(`M ${x + hw * 0.02} ${cy - H * 0.02} C ${x + hw * 0.03} ${cy + H * 0.1}, ${x + hw * 0.06} ${cy + H * 0.16}, ${x + hw * 0.12} ${cy + H * 0.19}`, { stroke: ink, width: sw * 0.65 }));
    out.push(ln(x - hw * 0.02, cy + H * 0.2, x + hw * 0.07, cy + H * 0.2, { stroke: ink, width: sw * 0.5 }));
    out.push(p(`M ${x - hw * 0.14} ${cy + H * 0.31} C ${x - hw * 0.02} ${cy + H * 0.28}, ${x + hw * 0.1} ${cy + H * 0.29}, ${x + hw * 0.17} ${cy + H * 0.315}`, { stroke: ink, width: sw * 0.7 }));
    out.push(p(`M ${x - hw * 0.1} ${cy + H * 0.34} C ${x + hw * 0.0} ${cy + H * 0.355}, ${x + hw * 0.1} ${cy + H * 0.35}, ${x + hw * 0.14} ${cy + H * 0.335}`, { stroke: ink, width: sw * 0.45 }));
    out.push(p(`M ${x + hw * 0.12} ${cy + H * 0.35} C ${x + hw * 0.18} ${cy + H * 0.4}, ${x + hw * 0.2} ${cy + H * 0.44}, ${x + hw * 0.12} ${cy + H * 0.48}`, { stroke: ink, width: sw * 0.5 }));
    // 阴影排线
    out.push(p(`M ${x - hw * 0.62} ${cy + H * 0.04} l ${hw * 0.1} ${H * 0.12} M ${x - hw * 0.54} ${cy + H * 0.02} l ${hw * 0.1} ${H * 0.12} M ${x - hw * 0.46} ${cy + H * 0.01} l ${hw * 0.1} ${H * 0.1}`, { stroke: MID, width: Math.max(1.1, H * 0.008), opacity: 0.5 }));
    out.push(p(`M ${x + hw * 0.28} ${cy + H * 0.4} l ${-hw * 0.05} ${H * 0.08} M ${x + hw * 0.18} ${cy + H * 0.42} l ${-hw * 0.05} ${H * 0.08}`, { stroke: MID, width: Math.max(1, H * 0.007), opacity: 0.4 }));
    // 颈 / 肩 / 衣领
    out.push(ln(x - H * 0.09, cy + H * 0.45, x - H * 0.075, shY, { stroke: ink, width: sw * 0.8 }));
    out.push(ln(x + H * 0.09, cy + H * 0.45, x + H * 0.075, shY, { stroke: ink, width: sw * 0.8 }));
    out.push(p(`M ${x - H * 0.08} ${cy + H * 0.52} C ${x - H * 0.2} ${cy + H * 0.62}, ${x - H * 0.5} ${cy + H * 0.72}, ${x - shoulder * 0.8} ${cy + H * 0.96}`, { stroke: ink, width: sw * 0.9 }));
    out.push(p(`M ${x + H * 0.08} ${cy + H * 0.52} C ${x + H * 0.22} ${cy + H * 0.62}, ${x + H * 0.5} ${cy + H * 0.72}, ${x + shoulder * 0.8} ${cy + H * 0.96}`, { stroke: ink, width: sw * 0.9 }));
    const shD = `M ${x - shoulder} ${shY + H * 0.17} C ${x - shoulder * 0.95} ${shY - H * 0.02}, ${x - shoulder * 0.5} ${shY - H * 0.08}, ${x - H * 0.16} ${shY - H * 0.06} L ${x + H * 0.16} ${shY - H * 0.06} C ${x + shoulder * 0.5} ${shY - H * 0.08}, ${x + shoulder * 0.95} ${shY - H * 0.02}, ${x + shoulder} ${shY + H * 0.17} L ${x + shoulder * 1.22} 900 L ${x - shoulder * 1.22} 900 Z`;
    out.push(p(shD, { stroke: ink, width: sw }));
    out.push(p(`M ${x - H * 0.15} ${shY - H * 0.05} L ${x + hw * 0.02} ${shY + H * 0.32} L ${x + H * 0.16} ${shY - H * 0.05}`, { stroke: ink, width: sw * 0.75 }));
    out.push(p(`M ${x - shoulder * 0.7} ${shY + H * 0.04} C ${x - shoulder * 0.5} ${shY + H * 0.3}, ${x - shoulder * 0.42} ${shY + H * 0.6}, ${x - shoulder * 0.4} 890`, { stroke: ink, width: sw * 0.55, opacity: 0.75 }));
    out.push(p(`M ${x + shoulder * 0.7} ${shY + H * 0.04} C ${x + shoulder * 0.5} ${shY + H * 0.3}, ${x + shoulder * 0.42} ${shY + H * 0.6}, ${x + shoulder * 0.4} 890`, { stroke: ink, width: sw * 0.55, opacity: 0.75 }));
    // 光边
    out.push(p(`M ${x + hw * 0.9} ${cy - H * 0.22} C ${x + hw * 0.88} ${cy + H * 0.06}, ${x + hw * 0.66} ${cy + H * 0.3}, ${x + hw * 0.3} ${cy + H * 0.42}`, { stroke: PALE, width: sw * 0.8, opacity: 0.6 }));
    return out;
  }

  // 前景肩头（过肩镜头）：一整块剪影，后脑与肩线连成一体，制造景深
  function otsShoulder(side, y, scale) {
    scale = scale || 1;
    const out = [];
    const right = side !== 'left';
    const mx = (v) => right ? v : 1600 - v;
    const cy = y;
    const hR = 126 * scale;
    // 肩背大块
    out.push(p(`M ${mx(1600)} 900 L ${mx(1600)} ${cy + hR * 0.35} C ${mx(1540)} ${cy + hR * 0.1}, ${mx(1400)} ${cy + hR * 0.55}, ${mx(1310)} ${cy + hR * 1.05} C ${mx(1230)} ${cy + hR * 1.5}, ${mx(1190)} ${cy + hR * 2.1}, ${mx(1150)} 900 Z`, { fill: GRAY, stroke: GRAY, width: 1 }));
    // 后脑
    out.push(el(mx(1408), cy, hR * 0.92, hR, { fill: GRAY, stroke: GRAY, width: 1 }));
    // 头发外缘
    out.push(p(`M ${mx(1268)} ${cy - hR * 0.1} C ${mx(1270)} ${cy - hR * 0.72}, ${mx(1350)} ${cy - hR * 1.12}, ${mx(1430)} ${cy - hR * 1.05} C ${mx(1520)} ${cy - hR * 0.98}, ${mx(1550)} ${cy - hR * 0.5}, ${mx(1548)} ${cy - hR * 0.05}`, { stroke: INK, width: 3.4 }));
    out.push(p(`M ${mx(1300)} ${cy - hR * 0.2} C ${mx(1315)} ${cy - hR * 0.78}, ${mx(1380)} ${cy - hR * 1.0}, ${mx(1440)} ${cy - hR * 0.95}`, { stroke: MID, width: 2.2, opacity: 0.65 }));
    // 领口
    out.push(p(`M ${mx(1548)} ${cy + hR * 1.45} C ${mx(1490)} ${cy + hR * 1.2}, ${mx(1400)} ${cy + hR * 1.35}, ${mx(1350)} ${cy + hR * 1.7}`, { stroke: INK, width: 3 }));
    // 轮廓光
    out.push(p(`M ${mx(1544)} ${cy - hR * 0.15} C ${mx(1538)} ${cy - hR * 0.7}, ${mx(1470)} ${cy - hR * 1.0}, ${mx(1400)} ${cy - hR * 1.02}`, { stroke: PALE, width: 2.6, opacity: 0.55 }));
    out.push(p(`M ${mx(1542)} ${cy + hR * 0.6} C ${mx(1480)} ${cy + hR * 0.55}, ${mx(1340)} ${cy + hR * 0.9}, ${mx(1250)} ${cy + hR * 1.45}`, { stroke: PALE, width: 2, opacity: 0.3 }));
    // 失焦的发丝/衣纹
    out.push(p(`M ${mx(1490)} ${cy + hR * 0.4} C ${mx(1460)} ${cy + hR * 0.8}, ${mx(1430)} ${cy + hR * 1.2}, ${mx(1420)} ${cy + hR * 1.6}`, { stroke: MID, width: 2, opacity: 0.4 }));
    out.push(p(`M ${mx(1340)} ${cy + hR * 1.2} C ${mx(1290)} ${cy + hR * 1.55}, ${mx(1260)} ${cy + hR * 1.9}, ${mx(1250)} 890`, { stroke: MID, width: 2, opacity: 0.35 }));
    return out;
  }

  // 前景失焦横线 / 物体边缘（用于特写的层次）
  function blurBar(y, o) {
    o = o || {};
    return [
      ln(o.x1 || 40, y, o.x2 || 1560, y, { stroke: MID, width: o.w || 10, opacity: 0.22 }),
      ln((o.x1 || 40) + 60, y + 18, (o.x2 || 1560) - 90, y + 18, { stroke: MID, width: (o.w || 10) * 0.6, opacity: 0.14 }),
      ln((o.x1 || 40) + 180, y - 16, (o.x2 || 1560) - 240, y - 16, { stroke: SOFT, width: 6, opacity: 0.2 })
    ];
  }

  /* ==========================================================================
   * 3. 大特写：侧脸 / 正面 / 眼睛 / 手 —— 只有结构线，没有卡通表情
   * ========================================================================== */

  // 侧脸特写，面向右。s = 面部高度
  function profileFace(cx, cy, s, o) {
    o = o || {};
    const ink = o.ink || INK;
    const e = [];
    // 后脑与枕骨
    e.push(p(`M ${cx - 0.15 * s} ${cy - 0.47 * s} C ${cx - 0.4 * s} ${cy - 0.41 * s}, ${cx - 0.49 * s} ${cy - 0.13 * s}, ${cx - 0.44 * s} ${cy + 0.08 * s} C ${cx - 0.41 * s} ${cy + 0.23 * s}, ${cx - 0.3 * s} ${cy + 0.33 * s}, ${cx - 0.18 * s} ${cy + 0.36 * s}`, { stroke: ink, width: 4.2 }));
    // 额头 → 鼻 → 唇 → 下巴 → 下颌
    e.push(p(`M ${cx - 0.15 * s} ${cy - 0.47 * s} C ${cx + 0.07 * s} ${cy - 0.53 * s}, ${cx + 0.27 * s} ${cy - 0.37 * s}, ${cx + 0.285 * s} ${cy - 0.2 * s} C ${cx + 0.29 * s} ${cy - 0.13 * s}, ${cx + 0.26 * s} ${cy - 0.09 * s}, ${cx + 0.235 * s} ${cy - 0.055 * s} L ${cx + 0.205 * s} ${cy - 0.035 * s} C ${cx + 0.225 * s} ${cy + 0.02 * s}, ${cx + 0.33 * s} ${cy + 0.075 * s}, ${cx + 0.335 * s} ${cy + 0.12 * s} L ${cx + 0.255 * s} ${cy + 0.14 * s} C ${cx + 0.275 * s} ${cy + 0.158 * s}, ${cx + 0.265 * s} ${cy + 0.178 * s}, ${cx + 0.245 * s} ${cy + 0.19 * s} L ${cx + 0.252 * s} ${cy + 0.21 * s} C ${cx + 0.225 * s} ${cy + 0.23 * s}, ${cx + 0.235 * s} ${cy + 0.245 * s}, ${cx + 0.213 * s} ${cy + 0.258 * s} C ${cx + 0.208 * s} ${cy + 0.318 * s}, ${cx + 0.16 * s} ${cy + 0.39 * s}, ${cx + 0.055 * s} ${cy + 0.437 * s} C ${cx - 0.02 * s} ${cy + 0.467 * s}, ${cx - 0.13 * s} ${cy + 0.4 * s}, ${cx - 0.185 * s} ${cy + 0.32 * s}`, { stroke: ink, width: 4.6 }));
    // 头发（深灰整块）
    e.push(p(`M ${cx + 0.2 * s} ${cy - 0.35 * s} C ${cx + 0.07 * s} ${cy - 0.53 * s}, ${cx - 0.22 * s} ${cy - 0.55 * s}, ${cx - 0.4 * s} ${cy - 0.37 * s} C ${cx - 0.5 * s} ${cy - 0.22 * s}, ${cx - 0.49 * s} ${cy + 0.02 * s}, ${cx - 0.44 * s} ${cy + 0.14 * s} C ${cx - 0.44 * s} ${cy - 0.02 * s}, ${cx - 0.38 * s} ${cy - 0.19 * s}, ${cx - 0.27 * s} ${cy - 0.26 * s} C ${cx - 0.12 * s} ${cy - 0.35 * s}, ${cx + 0.05 * s} ${cy - 0.35 * s}, ${cx + 0.2 * s} ${cy - 0.35 * s} Z`, { fill: GRAY, stroke: ink, width: 2.2, opacity: 0.9 }));
    e.push(p(`M ${cx - 0.32 * s} ${cy - 0.43 * s} C ${cx - 0.37 * s} ${cy - 0.25 * s}, ${cx - 0.38 * s} ${cy - 0.1 * s}, ${cx - 0.33 * s} ${cy + 0.02 * s}`, { stroke: INK, width: 1.6, opacity: 0.7 }));
    e.push(p(`M ${cx - 0.2 * s} ${cy - 0.5 * s} C ${cx - 0.29 * s} ${cy - 0.3 * s}, ${cx - 0.3 * s} ${cy - 0.16 * s}, ${cx - 0.25 * s} ${cy - 0.07 * s}`, { stroke: INK, width: 1.4, opacity: 0.6 }));
    e.push(p(`M ${cx - 0.06 * s} ${cy - 0.52 * s} C ${cx - 0.15 * s} ${cy - 0.38 * s}, ${cx - 0.17 * s} ${cy - 0.26 * s}, ${cx - 0.13 * s} ${cy - 0.19 * s}`, { stroke: INK, width: 1.3, opacity: 0.55 }));
    e.push(p(`M ${cx + 0.2 * s} ${cy - 0.35 * s} C ${cx + 0.24 * s} ${cy - 0.3 * s}, ${cx + 0.26 * s} ${cy - 0.24 * s}, ${cx + 0.26 * s} ${cy - 0.18 * s}`, { stroke: ink, width: 1.4, opacity: 0.6 }));
    // 眉
    e.push(p(`M ${cx + 0.08 * s} ${cy - 0.19 * s} C ${cx + 0.15 * s} ${cy - 0.215 * s}, ${cx + 0.23 * s} ${cy - 0.205 * s}, ${cx + 0.285 * s} ${cy - 0.17 * s}`, { stroke: ink, width: 3.4 }));
    // 眼（窄）
    e.push(p(`M ${cx + 0.085 * s} ${cy - 0.1 * s} C ${cx + 0.14 * s} ${cy - 0.125 * s}, ${cx + 0.215 * s} ${cy - 0.12 * s}, ${cx + 0.262 * s} ${cy - 0.088 * s}`, { stroke: ink, width: 2.6 }));
    e.push(p(`M ${cx + 0.09 * s} ${cy - 0.095 * s} C ${cx + 0.15 * s} ${cy - 0.07 * s}, ${cx + 0.215 * s} ${cy - 0.072 * s}, ${cx + 0.255 * s} ${cy - 0.088 * s}`, { stroke: ink, width: 1.5 }));
    e.push(el(cx + 0.178 * s, cy - 0.098 * s, 0.017 * s, 0.015 * s, { fill: GRAY, stroke: ink, width: 1 }));
    e.push(el(cx + 0.186 * s, cy - 0.098 * s, 0.006 * s, 0.007 * s, { fill: ink, stroke: ink, width: 1 }));
    e.push(p(`M ${cx + 0.1 * s} ${cy - 0.134 * s} C ${cx + 0.16 * s} ${cy - 0.155 * s}, ${cx + 0.225 * s} ${cy - 0.15 * s}, ${cx + 0.27 * s} ${cy - 0.122 * s}`, { stroke: MID, width: 1.4, opacity: 0.6 }));
    // 鼻梁 / 鼻底
    e.push(p(`M ${cx + 0.245 * s} ${cy - 0.045 * s} C ${cx + 0.26 * s} ${cy + 0.02 * s}, ${cx + 0.3 * s} ${cy + 0.075 * s}, ${cx + 0.32 * s} ${cy + 0.105 * s}`, { stroke: MID, width: 1.8, opacity: 0.65 }));
    e.push(ln(cx + 0.268 * s, cy + 0.138 * s, cx + 0.288 * s, cy + 0.142 * s, { stroke: ink, width: 1.8 }));
    // 唇
    e.push(p(`M ${cx + 0.22 * s} ${cy + 0.228 * s} C ${cx + 0.232 * s} ${cy + 0.24 * s}, ${cx + 0.226 * s} ${cy + 0.252 * s}, ${cx + 0.212 * s} ${cy + 0.256 * s}`, { stroke: ink, width: 1.8 }));
    // 耳
    e.push(p(`M ${cx - 0.02 * s} ${cy + 0.02 * s} C ${cx - 0.09 * s} ${cy - 0.01 * s}, ${cx - 0.11 * s} ${cy + 0.08 * s}, ${cx - 0.055 * s} ${cy + 0.125 * s}`, { stroke: ink, width: 2.2 }));
    e.push(p(`M ${cx - 0.05 * s} ${cy + 0.045 * s} C ${cx - 0.08 * s} ${cy + 0.05 * s}, ${cx - 0.08 * s} ${cy + 0.085 * s}, ${cx - 0.055 * s} ${cy + 0.1 * s}`, { stroke: MID, width: 1.3, opacity: 0.7 }));
    // 咬肌 / 颈侧阴影
    e.push(p(`M ${cx - 0.14 * s} ${cy + 0.22 * s} l ${0.06 * s} ${0.12 * s} M ${cx - 0.1 * s} ${cy + 0.19 * s} l ${0.06 * s} ${0.12 * s} M ${cx - 0.06 * s} ${cy + 0.16 * s} l ${0.05 * s} ${0.1 * s}`, { stroke: MID, width: 1.1, opacity: 0.45 }));
    // 颈 / 肩 / 衣领
    e.push(p(`M ${cx - 0.18 * s} ${cy + 0.32 * s} C ${cx - 0.24 * s} ${cy + 0.47 * s}, ${cx - 0.25 * s} ${cy + 0.58 * s}, ${cx - 0.26 * s} ${cy + 0.66 * s}`, { stroke: ink, width: 3.2 }));
    e.push(p(`M ${cx + 0.045 * s} ${cy + 0.44 * s} C ${cx + 0.06 * s} ${cy + 0.53 * s}, ${cx + 0.06 * s} ${cy + 0.6 * s}, ${cx + 0.04 * s} ${cy + 0.66 * s}`, { stroke: ink, width: 2.4 }));
    e.push(ln(cx - 0.26 * s, cy + 0.66 * s, cx + 0.04 * s, cy + 0.66 * s, { stroke: ink, width: 2.8 }));
    e.push(p(`M ${cx - 0.26 * s} ${cy + 0.67 * s} C ${cx - 0.4 * s} ${cy + 0.72 * s}, ${cx - 0.52 * s} ${cy + 0.78 * s}, ${cx - 0.56 * s} ${cy + 0.9 * s}`, { stroke: ink, width: 4 }));
    e.push(p(`M ${cx + 0.06 * s} ${cy + 0.67 * s} C ${cx + 0.24 * s} ${cy + 0.7 * s}, ${cx + 0.4 * s} ${cy + 0.78 * s}, ${cx + 0.5 * s} ${cy + 0.9 * s}`, { stroke: ink, width: 4 }));
    e.push(p(`M ${cx + 0.02 * s} ${cy + 0.67 * s} L ${cx + 0.13 * s} ${cy + 0.9 * s}`, { stroke: ink, width: 2 }));
    e.push(p(`M ${cx + 0.13 * s} ${cy + 0.75 * s} L ${cx + 0.28 * s} ${cy + 0.74 * s}`, { stroke: ink, width: 1.8 }));
    // 轮廓光
    e.push(p(`M ${cx + 0.275 * s} ${cy - 0.12 * s} L ${cx + 0.25 * s} ${cy - 0.04 * s} M ${cx + 0.33 * s} ${cy + 0.1 * s} L ${cx + 0.3 * s} ${cy + 0.13 * s}`, { stroke: PALE, width: 2, opacity: 0.55 }));
    e.push(p(`M ${cx + 0.2 * s} ${cy + 0.29 * s} C ${cx + 0.16 * s} ${cy + 0.36 * s}, ${cx + 0.1 * s} ${cy + 0.41 * s}, ${cx + 0.04 * s} ${cy + 0.43 * s}`, { stroke: PALE, width: 1.6, opacity: 0.4 }));
    return e;
  }

  // 正面 3/4 特写。s = 头部高度
  function faceFront(cx, cy, s, o) {
    o = o || {};
    const e = [];
    const hw = s * 0.37;
    // 头型（3/4，向右偏）
    e.push(p(`M ${cx - hw * 0.18} ${cy - s * 0.5} C ${cx + hw * 0.42} ${cy - s * 0.52}, ${cx + hw * 1.02} ${cy - s * 0.28}, ${cx + hw * 1.0} ${cy - s * 0.01} C ${cx + hw * 0.98} ${cy + s * 0.22}, ${cx + hw * 0.72} ${cy + s * 0.41}, ${cx + hw * 0.36} ${cy + s * 0.46} C ${cx + hw * 0.08} ${cy + s * 0.5}, ${cx - hw * 0.26} ${cy + s * 0.43}, ${cx - hw * 0.54} ${cy + s * 0.29} C ${cx - hw * 0.9} ${cy + s * 0.13}, ${cx - hw * 0.99} ${cy - s * 0.13}, ${cx - hw * 0.86} ${cy - s * 0.34} C ${cx - hw * 0.72} ${cy - s * 0.49}, ${cx - hw * 0.42} ${cy - s * 0.52}, ${cx - hw * 0.18} ${cy - s * 0.5} Z`, { stroke: INK, width: 4.6 }));
    // 头发（深灰 + 发际线）
    e.push(p(`M ${cx + hw * 0.28} ${cy - s * 0.33} C ${cx + hw * 0.12} ${cy - s * 0.55}, ${cx - hw * 0.3} ${cy - s * 0.55}, ${cx - hw * 0.6} ${cy - s * 0.3} C ${cx - hw * 0.94} ${cy - s * 0.02}, ${cx - hw * 0.9} ${cy + s * 0.17}, ${cx - hw * 0.62} ${cy + s * 0.3} C ${cx - hw * 0.68} ${cy + s * 0.06}, ${cx - hw * 0.54} ${cy - s * 0.16}, ${cx - hw * 0.24} ${cy - s * 0.25} C ${cx - hw * 0.02} ${cy - s * 0.32}, ${cx + hw * 0.18} ${cy - s * 0.32}, ${cx + hw * 0.28} ${cy - s * 0.33} Z`, { fill: GRAY, stroke: INK, width: 2.2, opacity: 0.9 }));
    e.push(p(`M ${cx - hw * 0.42} ${cy - s * 0.38} C ${cx - hw * 0.52} ${cy - s * 0.16}, ${cx - hw * 0.5} ${cy - s * 0.0}, ${cx - hw * 0.44} ${cy + s * 0.1}`, { stroke: INK, width: 1.6, opacity: 0.6 }));
    e.push(p(`M ${cx - hw * 0.12} ${cy - s * 0.46} C ${cx - hw * 0.24} ${cy - s * 0.28}, ${cx - hw * 0.26} ${cy - s * 0.12}, ${cx - hw * 0.22} ${cy - s * 0.02}`, { stroke: INK, width: 1.4, opacity: 0.55 }));
    // 耳
    e.push(p(`M ${cx - hw * 0.92} ${cy + s * 0.0} C ${cx - hw * 1.06} ${cy - s * 0.02}, ${cx - hw * 1.07} ${cy + s * 0.12}, ${cx - hw * 0.94} ${cy + s * 0.15}`, { stroke: INK, width: 2.4 }));
    e.push(p(`M ${cx + hw * 0.92} ${cy + s * 0.02} C ${cx + hw * 0.84} ${cy + s * 0.1}, ${cx + hw * 0.85} ${cy + s * 0.17}, ${cx + hw * 0.9} ${cy + s * 0.2}`, { stroke: INK, width: 1.8, opacity: 0.8 }));
    // 眉
    e.push(p(`M ${cx + hw * 0.12} ${cy - s * 0.14} C ${cx + hw * 0.32} ${cy - s * 0.18}, ${cx + hw * 0.52} ${cy - s * 0.16}, ${cx + hw * 0.64} ${cy - s * 0.1}`, { stroke: INK, width: 3.2 }));
    e.push(p(`M ${cx - hw * 0.62} ${cy - s * 0.13} C ${cx - hw * 0.48} ${cy - s * 0.17}, ${cx - hw * 0.3} ${cy - s * 0.16}, ${cx - hw * 0.2} ${cy - s * 0.11}`, { stroke: INK, width: 2.6 }));
    // 眼（窄，虹膜小）
    e.push(p(`M ${cx + hw * 0.16} ${cy - s * 0.03} C ${cx + hw * 0.3} ${cy - s * 0.06}, ${cx + hw * 0.46} ${cy - s * 0.055}, ${cx + hw * 0.58} ${cy - s * 0.02}`, { stroke: INK, width: 2.6 }));
    e.push(p(`M ${cx + hw * 0.17} ${cy - s * 0.025} C ${cx + hw * 0.32} ${cy - s * 0.002}, ${cx + hw * 0.46} ${cy - s * 0.004}, ${cx + hw * 0.56} ${cy - s * 0.025}`, { stroke: INK, width: 1.4 }));
    e.push(el(cx + hw * 0.37, cy - s * 0.035, s * 0.012, s * 0.013, { fill: GRAY, stroke: INK, width: 1 }));
    e.push(p(`M ${cx - hw * 0.58} ${cy - s * 0.025} C ${cx - hw * 0.48} ${cy - s * 0.045}, ${cx - hw * 0.37} ${cy - s * 0.04}, ${cx - hw * 0.3} ${cy - s * 0.02}`, { stroke: INK, width: 2.1 }));
    e.push(p(`M ${cx + hw * 0.2} ${cy - s * 0.065} C ${cx + hw * 0.32} ${cy - s * 0.085}, ${cx + hw * 0.45} ${cy - s * 0.08}, ${cx + hw * 0.55} ${cy - s * 0.058}`, { stroke: MID, width: 1.4, opacity: 0.6 }));
    // 鼻 / 唇 / 颌
    e.push(p(`M ${cx + hw * 0.05} ${cy + s * 0.0} C ${cx + hw * 0.06} ${cy + s * 0.1}, ${cx + hw * 0.1} ${cy + s * 0.16}, ${cx + hw * 0.16} ${cy + s * 0.18}`, { stroke: INK, width: 2.2 }));
    e.push(ln(cx + hw * 0.01, cy + s * 0.19, cx + hw * 0.09, cy + s * 0.19, { stroke: INK, width: 1.8 }));
    e.push(ln(cx + hw * 0.12, cy + s * 0.19, cx + hw * 0.18, cy + s * 0.185, { stroke: MID, width: 1.4, opacity: 0.7 }));
    e.push(p(`M ${cx - hw * 0.14} ${cy + s * 0.3} C ${cx - hw * 0.02} ${cy + s * 0.27}, ${cx + hw * 0.12} ${cy + s * 0.28}, ${cx + hw * 0.2} ${cy + s * 0.3}`, { stroke: INK, width: 2.6 }));
    e.push(p(`M ${cx - hw * 0.1} ${cy + s * 0.33} C ${cx + hw * 0.0} ${cy + s * 0.345}, ${cx + hw * 0.12} ${cy + s * 0.34}, ${cx + hw * 0.17} ${cy + s * 0.325}`, { stroke: INK, width: 1.5 }));
    e.push(p(`M ${cx + hw * 0.14} ${cy + s * 0.34} C ${cx + hw * 0.2} ${cy + s * 0.39}, ${cx + hw * 0.21} ${cy + s * 0.43}, ${cx + hw * 0.13} ${cy + s * 0.46}`, { stroke: INK, width: 1.7 }));
    // 阴影
    e.push(p(`M ${cx - hw * 0.62} ${cy + s * 0.05} l ${hw * 0.08} ${s * 0.1} M ${cx - hw * 0.55} ${cy + s * 0.03} l ${hw * 0.08} ${s * 0.1} M ${cx - hw * 0.48} ${cy + s * 0.02} l ${hw * 0.08} ${s * 0.09}`, { stroke: MID, width: 1.2, opacity: 0.5 }));
    e.push(p(`M ${cx + hw * 0.18} ${cy + s * 0.4} l ${hw * 0.02} ${s * 0.07} M ${cx + hw * 0.08} ${cy + s * 0.42} l ${hw * 0.02} ${s * 0.07}`, { stroke: MID, width: 1.1, opacity: 0.4 }));
    // 颈 / 肩 / 衣领
    e.push(ln(cx - hw * 0.22, cy + s * 0.43, cx - hw * 0.18, cy + s * 0.72, { stroke: INK, width: 3.2 }));
    e.push(ln(cx + hw * 0.26, cy + s * 0.44, cx + hw * 0.2, cy + s * 0.72, { stroke: INK, width: 3.2 }));
    e.push(p(`M ${cx - hw * 1.5} ${s * 0.92 + cy} C ${cx - hw * 1.1} ${cy + s * 0.6}, ${cx - hw * 0.4} ${cy + s * 0.55}, ${cx - hw * 0.2} ${cy + s * 0.74}`, { stroke: INK, width: 4.2 }));
    e.push(p(`M ${cx + hw * 1.5} ${s * 0.92 + cy} C ${cx + hw * 1.1} ${cy + s * 0.6}, ${cx + hw * 0.4} ${cy + s * 0.55}, ${cx + hw * 0.22} ${cy + s * 0.74}`, { stroke: INK, width: 4.2 }));
    e.push(p(`M ${cx - hw * 0.2} ${cy + s * 0.74} L ${cx + hw * 0.12} ${cy + s * 1.0} L ${cx + hw * 0.22} ${cy + s * 0.74}`, { stroke: INK, width: 2.2 }));
    // 轮廓光
    e.push(p(`M ${cx + hw * 0.92} ${cy - s * 0.28} C ${cx + hw * 0.98} ${cy - s * 0.05}, ${cx + hw * 0.9} ${cy + s * 0.2}, ${cx + hw * 0.56} ${cy + s * 0.38}`, { stroke: PALE, width: 2.2, opacity: 0.55 }));
    if (o.tear) e.push(p(`M ${cx + hw * 0.58} ${cy + s * 0.05} C ${cx + hw * 0.63} ${cy + s * 0.17}, ${cx + hw * 0.6} ${cy + s * 0.27}, ${cx + hw * 0.52} ${cy + s * 0.31}`, { stroke: SOFT, width: 2, opacity: 0.7 }));
    return e;
  }

  // 眼睛大特写（s = 半宽，约 300）
  function eyeClose(cx, cy, s, o) {
    o = o || {};
    const e = [];
    // 眼睑轮廓：上睑压住虹膜
    e.push(p(`M ${cx - 0.94 * s} ${cy + 0.1 * s} C ${cx - 0.62 * s} ${cy - 0.18 * s}, ${cx - 0.18 * s} ${cy - 0.3 * s}, ${cx + 0.25 * s} ${cy - 0.26 * s} C ${cx + 0.62 * s} ${cy - 0.22 * s}, ${cx + 0.9 * s} ${cy - 0.08 * s}, ${cx + 0.98 * s} ${cy + 0.04 * s}`, { stroke: INK, width: 5.4 }));
    // 下睑
    e.push(p(`M ${cx - 0.92 * s} ${cy + 0.105 * s} C ${cx - 0.68 * s} ${cy + 0.28 * s}, ${cx - 0.18 * s} ${cy + 0.36 * s}, ${cx + 0.3 * s} ${cy + 0.33 * s} C ${cx + 0.66 * s} ${cy + 0.3 * s}, ${cx + 0.9 * s} ${cy + 0.15 * s}, ${cx + 0.98 * s} ${cy + 0.045 * s}`, { stroke: INK, width: 3.2 }));
    // 虹膜 / 瞳孔（上缘被眼睑压住）
    e.push(p(`M ${cx - 0.28 * s} ${cy + 0.02 * s} C ${cx - 0.28 * s} ${cy - 0.2 * s}, ${cx - 0.12 * s} ${cy - 0.32 * s}, ${cx + 0.08 * s} ${cy - 0.31 * s} C ${cx + 0.3 * s} ${cy - 0.3 * s}, ${cx + 0.46 * s} ${cy - 0.12 * s}, ${cx + 0.47 * s} ${cy + 0.05 * s} C ${cx + 0.47 * s} ${cy + 0.24 * s}, ${cx + 0.28 * s} ${cy + 0.36 * s}, ${cx + 0.07 * s} ${cy + 0.35 * s} C ${cx - 0.14 * s} ${cy + 0.34 * s}, ${cx - 0.28 * s} ${cy + 0.2 * s}, ${cx - 0.28 * s} ${cy + 0.02 * s} Z`, { fill: 'hatch', stroke: INK, width: 2.4 }));
    e.push(el(cx + 0.09 * s, cy + 0.045 * s, 0.105 * s, 0.115 * s, { fill: GRAY, stroke: INK, width: 1.6 }));
    e.push(el(cx + 0.11 * s, cy + 0.05 * s, 0.043 * s, 0.048 * s, { fill: INK, stroke: INK, width: 1 }));
    e.push(el(cx + 0.035 * s, cy - 0.015 * s, 0.028 * s, 0.025 * s, { fill: PALE, stroke: 'none', width: 0 }));
    // 虹膜纹理
    for (let i = 0; i < 9; i++) {
      const a = -1.1 + i * 0.27;
      const ix = cx + 0.09 * s + Math.cos(a) * 0.15 * s;
      const iy = cy + 0.045 * s + Math.sin(a) * 0.16 * s;
      e.push(ln(ix, iy, cx + 0.09 * s + Math.cos(a) * 0.245 * s, cy + 0.045 * s + Math.sin(a) * 0.255 * s, { stroke: INK, width: 1.1, opacity: 0.55 }));
    }
    // 上睑褶皱 / 内眼角 / 泪阜
    e.push(p(`M ${cx - 0.7 * s} ${cy - 0.16 * s} C ${cx - 0.38 * s} ${cy - 0.42 * s}, ${cx + 0.16 * s} ${cy - 0.44 * s}, ${cx + 0.62 * s} ${cy - 0.24 * s}`, { stroke: INK, width: 2.2, opacity: 0.85 }));
    e.push(p(`M ${cx - 0.9 * s} ${cy + 0.105 * s} C ${cx - 0.84 * s} ${cy + 0.14 * s}, ${cx - 0.76 * s} ${cy + 0.14 * s}, ${cx - 0.71 * s} ${cy + 0.11 * s}`, { stroke: INK, width: 2.2 }));
    e.push(p(`M ${cx + 0.94 * s} ${cy + 0.05 * s} C ${cx + 0.9 * s} ${cy + 0.12 * s}, ${cx + 0.84 * s} ${cy + 0.16 * s}, ${cx + 0.78 * s} ${cy + 0.15 * s}`, { stroke: INK, width: 1.8, opacity: 0.8 }));
    // 睫毛（只在上睑外侧几根）
    for (let i = 0; i < 5; i++) {
      const bx = cx - 0.46 * s + i * 0.22 * s, by = cy - 0.27 * s + Math.abs(i - 2) * 0.045 * s;
      e.push(ln(bx, by, bx - 0.055 * s, by - 0.1 * s, { stroke: INK, width: 1.8, opacity: 0.85 }));
    }
    // 眉
    e.push(p(`M ${cx - 1.0 * s} ${cy - 0.6 * s} C ${cx - 0.4 * s} ${cy - 0.84 * s}, ${cx + 0.34 * s} ${cy - 0.8 * s}, ${cx + 0.98 * s} ${cy - 0.48 * s}`, { stroke: INK, width: 9 }));
    e.push(p(`M ${cx - 0.86 * s} ${cy - 0.66 * s} C ${cx - 0.3 * s} ${cy - 0.87 * s}, ${cx + 0.34 * s} ${cy - 0.82 * s}, ${cx + 0.9 * s} ${cy - 0.54 * s}`, { stroke: MID, width: 2.4, opacity: 0.55 }));
    // 眼周结构
    e.push(p(`M ${cx + 0.5 * s} ${cy + 0.36 * s} C ${cx + 0.72 * s} ${cy + 0.34 * s}, ${cx + 0.9 * s} ${cy + 0.22 * s}, ${cx + 1.0 * s} ${cy + 0.06 * s}`, { stroke: SOFT, width: 2, opacity: 0.6 }));
    e.push(p(`M ${cx - 0.5 * s} ${cy + 0.42 * s} l ${0.08 * s} ${0.07 * s} M ${cx - 0.4 * s} ${cy + 0.4 * s} l ${0.08 * s} ${0.07 * s} M ${cx - 0.3 * s} ${cy + 0.39 * s} l ${0.08 * s} ${0.07 * s}`, { stroke: MID, width: 1.2, opacity: 0.45 }));
    e.push(p(`M ${cx - 0.86 * s} ${cy + 0.12 * s} C ${cx - 0.78 * s} ${cy + 0.2 * s}, ${cx - 0.7 * s} ${cy + 0.2 * s}, ${cx - 0.66 * s} ${cy + 0.14 * s}`, { stroke: PALE, width: 2.2, opacity: 0.75 }));
    return e;
  }

  // 手部大特写：state = 'fist' | 'open'。s ≈ 手的大小（约 420–480）
  function handClose(cx, cy, s, state) {
    const e = [];
    const open = state === 'open';
    const wristL = cx - 0.30 * s, wristR = cx + 0.26 * s, wristY = cy + 0.58 * s;
    // 前臂 / 腕
    e.push(p(`M ${cx - 0.48 * s} 900 C ${cx - 0.42 * s} ${cy + 0.92 * s}, ${cx - 0.36 * s} ${cy + 0.74 * s}, ${wristL} ${wristY}`, { stroke: INK, width: 4.2 }));
    e.push(p(`M ${cx + 0.46 * s} 900 C ${cx + 0.4 * s} ${cy + 0.92 * s}, ${cx + 0.34 * s} ${cy + 0.74 * s}, ${wristR} ${wristY}`, { stroke: INK, width: 4.2 }));
    e.push(p(`M ${cx - 0.38 * s} 900 C ${cx - 0.33 * s} ${cy + 0.9 * s}, ${cx - 0.3 * s} ${cy + 0.78 * s}, ${cx - 0.25 * s} ${cy + 0.68 * s}`, { stroke: MID, width: 1.6, opacity: 0.55 }));
    if (open) {
      // 手掌轮廓
      e.push(p(`M ${wristL} ${wristY} C ${cx - 0.4 * s} ${cy + 0.42 * s}, ${cx - 0.46 * s} ${cy + 0.24 * s}, ${cx - 0.42 * s} ${cy + 0.1 * s} L ${cx - 0.4 * s} ${cy + 0.04 * s}`, { stroke: INK, width: 3.4 }));
      e.push(p(`M ${wristR} ${wristY} C ${cx + 0.38 * s} ${cy + 0.42 * s}, ${cx + 0.44 * s} ${cy + 0.24 * s}, ${cx + 0.4 * s} ${cy + 0.1 * s} L ${cx + 0.37 * s} ${cy + 0.04 * s}`, { stroke: INK, width: 3.4 }));
      e.push(p(`M ${wristL} ${wristY} C ${cx - 0.12 * s} ${cy + 0.64 * s}, ${cx + 0.08 * s} ${cy + 0.64 * s}, ${wristR} ${wristY}`, { stroke: INK, width: 3.2 }));
      // 四指（食指→小指，逐渐变短）
      const fingers = [
        [cx - 0.295 * s, cy - 0.3 * s, 0.108 * s],
        [cx - 0.1 * s, cy - 0.43 * s, 0.116 * s],
        [cx + 0.09 * s, cy - 0.4 * s, 0.11 * s],
        [cx + 0.27 * s, cy - 0.24 * s, 0.096 * s]
      ];
      const baseY = cy + 0.06 * s;
      fingers.forEach(function (f, i) {
        const fx = f[0], tip = f[1], fw = f[2];
        const tipX = fx + (i - 1.5) * 0.012 * s;
        e.push(p(`M ${fx - fw / 2} ${baseY} C ${fx - fw / 2} ${baseY - 0.15 * s}, ${tipX - fw * 0.44} ${tip + 0.09 * s}, ${tipX} ${tip + 0.02 * s} C ${tipX + fw * 0.44} ${tip + 0.09 * s}, ${fx + fw / 2} ${baseY - 0.15 * s}, ${fx + fw / 2} ${baseY}`, { stroke: INK, width: 3.1 }));
        // 关节横纹
        e.push(ln(fx - fw * 0.36, baseY - 0.16 * s, fx + fw * 0.36, baseY - 0.16 * s, { stroke: MID, width: 1.4, opacity: 0.65 }));
        if (i < 3) e.push(ln(fx - fw * 0.3, baseY - 0.31 * s, fx + fw * 0.3, baseY - 0.31 * s, { stroke: MID, width: 1.3, opacity: 0.5 }));
        // 指甲
        e.push(p(`M ${tipX - fw * 0.24} ${tip + 0.075 * s} C ${tipX - fw * 0.1} ${tip + 0.035 * s}, ${tipX + fw * 0.1} ${tip + 0.035 * s}, ${tipX + fw * 0.24} ${tip + 0.075 * s}`, { stroke: MID, width: 1.5, opacity: 0.7 }));
      });
      // 拇指
      e.push(p(`M ${cx - 0.42 * s} ${cy + 0.22 * s} C ${cx - 0.52 * s} ${cy + 0.1 * s}, ${cx - 0.6 * s} ${cy - 0.06 * s}, ${cx - 0.56 * s} ${cy - 0.15 * s} C ${cx - 0.48 * s} ${cy - 0.2 * s}, ${cx - 0.4 * s} ${cy - 0.1 * s}, ${cx - 0.33 * s} ${cy + 0.01 * s}`, { stroke: INK, width: 3.6 }));
      e.push(p(`M ${cx - 0.56 * s} ${cy - 0.15 * s} C ${cx - 0.5 * s} ${cy - 0.21 * s}, ${cx - 0.43 * s} ${cy - 0.17 * s}, ${cx - 0.4 * s} ${cy - 0.09 * s}`, { stroke: INK, width: 2.4 }));
      e.push(p(`M ${cx - 0.51 * s} ${cy - 0.11 * s} C ${cx - 0.48 * s} ${cy - 0.13 * s}, ${cx - 0.45 * s} ${cy - 0.12 * s}, ${cx - 0.44 * s} ${cy - 0.09 * s}`, { stroke: MID, width: 1.2, opacity: 0.7 }));
      // 掌纹
      e.push(p(`M ${cx - 0.35 * s} ${cy + 0.3 * s} C ${cx - 0.16 * s} ${cy + 0.22 * s}, ${cx + 0.02 * s} ${cy + 0.3 * s}, ${cx + 0.2 * s} ${cy + 0.4 * s}`, { stroke: MID, width: 2, opacity: 0.65 }));
      e.push(p(`M ${cx - 0.3 * s} ${cy + 0.42 * s} C ${cx - 0.08 * s} ${cy + 0.36 * s}, ${cx + 0.1 * s} ${cy + 0.42 * s}, ${cx + 0.24 * s} ${cy + 0.5 * s}`, { stroke: MID, width: 1.6, opacity: 0.55 }));
      e.push(p(`M ${cx - 0.42 * s} ${cy + 0.16 * s} C ${cx - 0.34 * s} ${cy + 0.3 * s}, ${cx - 0.28 * s} ${cy + 0.42 * s}, ${cx - 0.24 * s} ${cy + 0.52 * s}`, { stroke: MID, width: 1.3, opacity: 0.45 }));
      // 腕纹 / 掌侧阴影
      e.push(p(`M ${cx - 0.28 * s} ${cy + 0.53 * s} C ${cx - 0.1 * s} ${cy + 0.58 * s}, ${cx + 0.1 * s} ${cy + 0.58 * s}, ${cx + 0.27 * s} ${cy + 0.52 * s}`, { stroke: MID, width: 1.6, opacity: 0.55 }));
      e.push(p(`M ${cx + 0.28 * s} ${cy + 0.2 * s} l ${0.03 * s} ${0.14 * s} M ${cx + 0.33 * s} ${cy + 0.26 * s} l ${-0.02 * s} ${0.13 * s}`, { stroke: MID, width: 1.2, opacity: 0.5 }));
      return e;
    }
    // 攥紧的拳（手背朝外，指节在上）
    e.push(p(`M ${wristL} ${wristY} C ${cx - 0.41 * s} ${cy + 0.42 * s}, ${cx - 0.45 * s} ${cy + 0.2 * s}, ${cx - 0.4 * s} ${cy + 0.03 * s} C ${cx - 0.37 * s} ${cy - 0.06 * s}, ${cx - 0.31 * s} ${cy - 0.11 * s}, ${cx - 0.25 * s} ${cy - 0.12 * s} C ${cx - 0.2 * s} ${cy - 0.16 * s}, ${cx - 0.15 * s} ${cy - 0.16 * s}, ${cx - 0.11 * s} ${cy - 0.12 * s} C ${cx - 0.06 * s} ${cy - 0.09 * s}, ${cx - 0.02 * s} ${cy - 0.09 * s}, ${cx + 0.02 * s} ${cy - 0.13 * s} C ${cx + 0.07 * s} ${cy - 0.17 * s}, ${cx + 0.12 * s} ${cy - 0.17 * s}, ${cx + 0.16 * s} ${cy - 0.12 * s} C ${cx + 0.21 * s} ${cy - 0.08 * s}, ${cx + 0.26 * s} ${cy - 0.09 * s}, ${cx + 0.3 * s} ${cy - 0.12 * s} C ${cx + 0.38 * s} ${cy - 0.08 * s}, ${cx + 0.42 * s} ${cy + 0.02 * s}, ${cx + 0.41 * s} ${cy + 0.14 * s} C ${cx + 0.4 * s} ${cy + 0.28 * s}, ${cx + 0.32 * s} ${cy + 0.42 * s}, ${cx + 0.2 * s} ${cy + 0.5 * s} C ${cx + 0.08 * s} ${cy + 0.58 * s}, ${wristR} ${wristY}, ${wristL} ${wristY} Z`, { fill: GRAY, stroke: INK, width: 4.2 }));
    // 前臂剪影
    e.push(p(`M ${wristL} ${wristY - 4} L ${cx - 0.5 * s} 900 L ${cx + 0.48 * s} 900 L ${wristR} ${wristY - 4} Z`, { fill: GRAY, stroke: INK, width: 3.6 }));
    e.push(p(`M ${wristL + 0.02 * s} ${wristY - 10} C ${cx - 0.06 * s} ${wristY - 4}, ${cx + 0.06 * s} ${wristY - 4}, ${wristR - 0.02 * s} ${wristY - 10}`, { stroke: PALE, width: 2.2, opacity: 0.4 }));
    e.push(p(`M ${cx - 0.44 * s} 892 C ${cx - 0.3 * s} 780, ${cx - 0.2 * s} 740, ${wristL + 0.01 * s} ${wristY + 10}`, { stroke: MID, width: 1.8, opacity: 0.5 }));
    // 指节分缝
    e.push(p(`M ${cx - 0.11 * s} ${cy - 0.12 * s} C ${cx - 0.115 * s} ${cy + 0.02 * s}, ${cx - 0.11 * s} ${cy + 0.14 * s}, ${cx - 0.1 * s} ${cy + 0.27 * s}`, { stroke: PALE, width: 2.2, opacity: 0.55 }));
    e.push(p(`M ${cx + 0.02 * s} ${cy - 0.13 * s} C ${cx + 0.03 * s} ${cy + 0.02 * s}, ${cx + 0.035 * s} ${cy + 0.15 * s}, ${cx + 0.045 * s} ${cy + 0.28 * s}`, { stroke: PALE, width: 2.2, opacity: 0.55 }));
    e.push(p(`M ${cx + 0.16 * s} ${cy - 0.12 * s} C ${cx + 0.17 * s} ${cy + 0.02 * s}, ${cx + 0.18 * s} ${cy + 0.15 * s}, ${cx + 0.2 * s} ${cy + 0.27 * s}`, { stroke: PALE, width: 2.2, opacity: 0.5 }));
    // 折指横纹
    e.push(p(`M ${cx - 0.24 * s} ${cy + 0.04 * s} C ${cx - 0.08 * s} ${cy + 0.12 * s}, ${cx + 0.14 * s} ${cy + 0.12 * s}, ${cx + 0.32 * s} ${cy + 0.04 * s}`, { stroke: PALE, width: 1.8, opacity: 0.42 }));
    e.push(p(`M ${cx - 0.24 * s} ${cy + 0.19 * s} C ${cx - 0.06 * s} ${cy + 0.28 * s}, ${cx + 0.16 * s} ${cy + 0.28 * s}, ${cx + 0.32 * s} ${cy + 0.19 * s}`, { stroke: PALE, width: 1.5, opacity: 0.35 }));
    e.push(p(`M ${cx - 0.22 * s} ${cy + 0.33 * s} C ${cx - 0.04 * s} ${cy + 0.4 * s}, ${cx + 0.14 * s} ${cy + 0.4 * s}, ${cx + 0.28 * s} ${cy + 0.33 * s}`, { stroke: PALE, width: 1.2, opacity: 0.28 }));
    // 拇指压在食指上（中灰块面，比拳头亮一阶）
    e.push(p(`M ${cx - 0.46 * s} ${cy + 0.04 * s} C ${cx - 0.37 * s} ${cy + 0.13 * s}, ${cx - 0.27 * s} ${cy + 0.24 * s}, ${cx - 0.16 * s} ${cy + 0.33 * s} L ${cx - 0.07 * s} ${cy + 0.44 * s} C ${cx - 0.06 * s} ${cy + 0.48 * s}, ${cx - 0.1 * s} ${cy + 0.5 * s}, ${cx - 0.15 * s} ${cy + 0.47 * s} L ${cx - 0.3 * s} ${cy + 0.37 * s} C ${cx - 0.42 * s} ${cy + 0.28 * s}, ${cx - 0.49 * s} ${cy + 0.17 * s}, ${cx - 0.5 * s} ${cy + 0.09 * s} Z`, { fill: MID, stroke: INK, width: 3, opacity: 0.55 }));
    e.push(p(`M ${cx - 0.44 * s} ${cy + 0.12 * s} C ${cx - 0.35 * s} ${cy + 0.2 * s}, ${cx - 0.25 * s} ${cy + 0.3 * s}, ${cx - 0.14 * s} ${cy + 0.38 * s}`, { stroke: INK, width: 2.2, opacity: 0.85 }));
    e.push(p(`M ${cx - 0.12 * s} ${cy + 0.4 * s} C ${cx - 0.08 * s} ${cy + 0.44 * s}, ${cx - 0.11 * s} ${cy + 0.48 * s}, ${cx - 0.15 * s} ${cy + 0.46 * s}`, { stroke: INK, width: 2 }));
    // 腕纹
    e.push(p(`M ${cx - 0.28 * s} ${cy + 0.5 * s} C ${cx - 0.1 * s} ${cy + 0.57 * s}, ${cx + 0.1 * s} ${cy + 0.57 * s}, ${cx + 0.3 * s} ${cy + 0.49 * s}`, { stroke: PALE, width: 1.5, opacity: 0.35 }));
    // 暗部 / 用力记号
    e.push(p(`M ${cx + 0.34 * s} ${cy + 0.13 * s} l ${0.04 * s} ${0.13 * s} M ${cx + 0.38 * s} ${cy + 0.19 * s} l ${0.02 * s} ${0.11 * s} M ${cx + 0.28 * s} ${cy + 0.34 * s} l ${0.04 * s} ${0.09 * s}`, { stroke: MID, width: 1.2, opacity: 0.6 }));
    // 指节高光
    e.push(p(`M ${cx - 0.2 * s} ${cy - 0.12 * s} C ${cx - 0.17 * s} ${cy - 0.16 * s}, ${cx - 0.13 * s} ${cy - 0.15 * s}, ${cx - 0.1 * s} ${cy - 0.11 * s}`, { stroke: PALE, width: 1.6, opacity: 0.5 }));
    e.push(p(`M ${cx - 0.06 * s} ${cy - 0.1 * s} C ${cx - 0.01 * s} ${cy - 0.14 * s}, ${cx + 0.04 * s} ${cy - 0.13 * s}, ${cx + 0.07 * s} ${cy - 0.09 * s}`, { stroke: PALE, width: 1.4, opacity: 0.4 }));
    e.push(p(`M ${cx - 0.53 * s} ${cy - 0.05 * s} l ${-0.05 * s} ${-0.03 * s} M ${cx - 0.55 * s} ${cy + 0.1 * s} l ${-0.06 * s} ${-0.01 * s}`, { stroke: MID, width: 1.4, opacity: 0.55 }));
    return e;
  }

  /* ==========================================================================
   * 4. 场景元件：雨、天际线、窗、门、灯、桌、椅、伞、手机、车、钟、电视等
   * ========================================================================== */
  function rain(x1, y1, x2, y2, n, o) {
    o = o || {};
    const len = o.len || 26, slant = o.slant == null ? -0.3 : o.slant;
    const a = [];
    for (let i = 0; i < n; i++) {
      const L = rr(len * 0.55, len * 1.45);
      const x = rr(x1, x2), y = rr(y1, Math.max(y1, y2 - L));
      a.push(ln(x, y, Math.max(x1, Math.min(x2, x + L * slant)), Math.min(y2, y + L), { stroke: o.stroke || MID, width: o.width || 1.2, opacity: rr(0.18, o.opacity || 0.5) }));
    }
    return a;
  }

  function haze(y, o) {
    o = o || {};
    const a = [];
    for (let i = 0; i < (o.n || 4); i++) {
      const yy = y + i * (o.gap || 14);
      a.push(ln(rr(60, 200), yy, rr(1300, 1540), yy, { stroke: SOFT, width: rr(1, 1.8), opacity: rr(0.18, 0.38) }));
    }
    return a;
  }

  // 城市天际线：baseY = 地平线；近景剪影 + 远景轮廓
  function skyline(baseY, o) {
    o = o || {};
    const a = [];
    const x0 = o.x0 == null ? 40 : o.x0;
    const x1 = o.x1 == null ? 1560 : o.x1;
    if (o.far !== false) {
      let x = x0, guard = 0;
      while (x < x1 - 30 && guard++ < 80) {
        const bw = Math.min(rr(46, 108), x1 - x);
        if (bw < 24) break;
        const bh = rr(30, 105);
        a.push(rc(x, baseY - 36 - bh, bw, bh + 36, { stroke: SOFT, width: 1.2, opacity: 0.6 }));
        x += bw + rr(6, 24);
      }
      a.push(ln(x0, baseY - 26, x1, baseY - 26, { stroke: SOFT, width: 1.1, opacity: 0.4 }));
    }
    if (o.mid !== false) {
      let x = x0, guard = 0;
      while (x < x1 - 30 && guard++ < 80) {
        const bw = Math.min(rr(40, 92), x1 - x);
        if (bw < 24) break;
        const bh = rr(65, 165), by = baseY - bh;
        a.push(rc(x, by, bw, bh, { stroke: MID, width: 1.6, opacity: 0.85 }));
        if (o.windows !== false) {
          const cols = Math.min(3, Math.max(1, Math.floor(bw / 26)));
          const rows = Math.min(6, Math.max(2, Math.floor(bh / 28)));
          for (let c = 0; c < cols; c++) for (let r = 0; r < rows; r++) {
            if (rnd() < 0.55) a.push(ln(x + 7 + c * (bw - 14) / cols, by + 8 + r * (bh - 16) / rows, x + 7 + c * (bw - 14) / cols + 7, by + 8 + r * (bh - 16) / rows, { stroke: SOFT, width: 1.5, opacity: 0.6 }));
          }
        }
        x += bw + rr(2, 16);
      }
    }
    if (o.near !== false) {
      let x = x0, guard = 0;
      while (x < x1 - 30 && guard++ < 80) {
        const bw = Math.min(rr(46, 120), x1 - x);
        if (bw < 24) break;
        const bh = rr(80, 245), by = baseY - bh;
        a.push(rc(x, by, bw, bh, { fill: GRAY, stroke: GRAY, width: 1.5 }));
        if (o.windows !== false) {
          const cols = Math.min(3, Math.max(1, Math.floor(bw / 28)));
          const rows = Math.min(8, Math.max(2, Math.floor(bh / 30)));
          for (let c = 0; c < cols; c++) for (let r = 0; r < rows; r++) {
            if (rnd() < 0.5) a.push(rc(x + 8 + c * (bw - 16) / cols, by + 9 + r * (bh - 18) / rows, 6, 3, { fill: PALE, stroke: PALE, width: 0 }));
          }
        }
        if (rnd() < 0.16) a.push(rc(x + 12 + rr(0, bw - 34), by + 12, 4, rr(12, 28), { fill: PALE, stroke: PALE, width: 0, opacity: 0.7 }));
        if (rnd() < 0.4) a.push(ln(x + bw * 0.5, by, x + bw * 0.5, by - rr(16, 46), { stroke: GRAY, width: 2.2 }));
        if (rnd() < 0.22) a.push(p(`M ${x + bw * 0.5} ${by - rr(10, 30)} l ${rr(-22, 22)} ${rr(-16, -8)}`, { stroke: GRAY, width: 1.6 }));
        x += bw + rr(0, 10);
      }
    }
    return a;
  }

  function waterLines(y0, y1, n, o) {
    o = o || {};
    const a = [];
    for (let i = 0; i < (n || 12); i++) {
      const y = rr(y0, y1), x = rr(20, 1300), w = rr(60, 320);
      a.push(ln(x, y, x + w, y, { stroke: rnd() < 0.55 ? SOFT : MID, width: rr(1, 2.2), opacity: rr(0.22, 0.6) }));
    }
    return a;
  }

  function reflectStreaks(x0, x1, top, bottom, n) {
    const a = [];
    for (let i = 0; i < (n || 9); i++) {
      const x = rr(x0, x1), w = rr(3, 9);
      const y = top + rr(0, 20), h = Math.min(rr(40, 130), 888 - y);
      a.push(rc(x, y, w, h, { fill: PALE, stroke: PALE, width: 0, opacity: rr(0.25, 0.55) }));
    }
    return a;
  }

  // 窗（带格栅、窗台、可加雨）
  function windowGrid(x, y, w, h, cols, rows, o) {
    o = o || {};
    const a = [rc(x - 10, y - 10, w + 20, h + 20, { stroke: INK, width: 5 }), rc(x, y, w, h, { stroke: INK, width: 2.2 })];
    for (let c = 1; c < cols; c++) a.push(ln(x + c * w / cols, y, x + c * w / cols, y + h, { stroke: INK, width: 3 }));
    for (let r = 1; r < rows; r++) a.push(ln(x, y + r * h / rows, x + w, y + r * h / rows, { stroke: INK, width: 2.6 }));
    a.push(ln(x - 26, y + h + 16, x + w + 26, y + h + 16, { stroke: INK, width: 3.4 }));
    if (o.rain) a.push.apply(a, rain(x + 6, y + 6, x + w - 6, y + h - 6, o.rain, { len: 20, opacity: 0.5 }));
    if (o.drip) {
      for (let i = 0; i < 4; i++) {
        const dx = x + rr(10, w - 10);
        a.push(ln(dx, y + h + 16, dx, y + h + 16 + rr(20, 60), { stroke: SOFT, width: 1.2, opacity: 0.5 }));
      }
    }
    return a;
  }

  function doorOpening(x, y, w, h, o) {
    o = o || {};
    const a = [];
    a.push(rc(x, y, w, h, { stroke: INK, width: 5 }));
    a.push(rc(x + 16, y + 16, w - 32, h - 16, { stroke: MID, width: 2, opacity: 0.75 }));
    a.push(ln(x - 30, y + h, x, y + h, { stroke: INK, width: 4 }));
    a.push(ln(x + w, y + h, x + w + 30, y + h, { stroke: INK, width: 4 }));
    // 门槛外扩的光带边缘
    a.push(p(`M ${x + 6} ${y + h} L ${x - 70} ${Math.min(890, y + h + 120)} M ${x + w - 6} ${y + h} L ${x + w + 70} ${Math.min(890, y + h + 120)}`, { stroke: SOFT, width: 1.8, opacity: 0.5 }));
    if (o.handle) a.push(el(x + w - 48, y + h * 0.52, 9, 9, { stroke: INK, width: 3 }));
    return a;
  }

  function lampPost(x, ground, h, o) {
    o = o || {};
    const dir = o.dir == null ? 1 : o.dir;
    const a = [];
    a.push(ln(x, ground, x, ground - h, { stroke: INK, width: 5 }));
    a.push(p(`M ${x} ${ground - h} C ${x} ${ground - h - 44}, ${x + dir * 52} ${ground - h - 42}, ${x + dir * 64} ${ground - h - 6}`, { stroke: INK, width: 4 }));
    a.push(p(`M ${x + dir * 36} ${ground - h - 6} L ${x + dir * 88} ${ground - h - 6} L ${x + dir * 74} ${ground - h + 26} L ${x + dir * 50} ${ground - h + 26} Z`, { stroke: INK, width: 3.4 }));
    a.push(ln(x + dir * 46, ground - h + 28, x + dir * 16, Math.min(ground, 880), { stroke: SOFT, width: 1.4, dash: '7 9', opacity: 0.55 }));
    a.push(ln(x + dir * 78, ground - h + 28, x + dir * 120, Math.min(ground, 880), { stroke: SOFT, width: 1.4, dash: '7 9', opacity: 0.55 }));
    a.push(ln(x - 16, ground, x + 16, ground, { stroke: INK, width: 4.4 }));
    return a;
  }

  function table(x, y, w, d, o) {
    o = o || {};
    const a = [
      ln(x - w / 2, y, x + w / 2, y, { stroke: INK, width: 4.4 }),
      ln(x - w / 2 - 12, y + d, x + w / 2 + 12, y + d, { stroke: INK, width: 4 }),
      ln(x - w / 2, y, x - w / 2 - 12, y + d, { stroke: INK, width: 3 }),
      ln(x + w / 2, y, x + w / 2 + 12, y + d, { stroke: INK, width: 3 }),
      ln(x - w * 0.36, y + d, x - w * 0.4, Math.min(880, y + d + 200), { stroke: INK, width: 4 }),
      ln(x + w * 0.36, y + d, x + w * 0.4, Math.min(880, y + d + 200), { stroke: INK, width: 4 })
    ];
    if (o.items) {
      a.push(rc(x - w * 0.25, y - 30, 30, 32, { stroke: INK, width: 2.6 }));
      a.push(el(x + w * 0.16, y - 4, 28, 9, { stroke: INK, width: 2.4 }));
      a.push(ln(x + w * 0.16, y - 4, x + w * 0.16, y - 40, { stroke: INK, width: 2.4 }));
    }
    return a;
  }

  function chair(x, ground, s, o) {
    o = o || {};
    const a = [];
    a.push(ln(x - s * 0.3, ground, x - s * 0.3, ground - s * 0.92, { stroke: INK, width: 4 }));
    a.push(ln(x - s * 0.3, ground - s * 0.92, x + s * 0.16, ground - s * 0.92, { stroke: INK, width: 4 }));
    a.push(ln(x - s * 0.28, ground - s * 0.55, x + s * 0.14, ground - s * 0.55, { stroke: INK, width: 3.4 }));
    a.push(ln(x + s * 0.14, ground - s * 0.55, x + s * 0.2, ground, { stroke: INK, width: 3.6 }));
    a.push(ln(x - s * 0.05, ground - s * 0.55, x - s * 0.02, ground, { stroke: INK, width: 3 }));
    a.push(ln(x + s * 0.14, ground - s * 0.92, x + s * 0.08, ground - s * 0.55, { stroke: INK, width: 3 }));
    return a;
  }

  function umbrella(x, y, r) {
    const a = [p(`M ${x - r} ${y} C ${x - r * 0.72} ${y - r * 0.98}, ${x + r * 0.72} ${y - r * 0.98}, ${x + r} ${y}`, { stroke: INK, width: 4.4 })];
    let d = `M ${x - r} ${y}`;
    for (let i = 0; i < 4; i++) {
      const x1 = x - r + (i + 1) * (2 * r / 4);
      d += ` Q ${x - r + (i + 0.5) * (2 * r / 4)} ${y + 20}, ${x1} ${y}`;
    }
    a.push(p(d, { stroke: INK, width: 3.2 }));
    for (let i = 0; i < 4; i++) a.push(ln(x, y - r * 0.8, x - r + (i + 0.5) * (2 * r / 4), y, { stroke: MID, width: 1.5, opacity: 0.65 }));
    a.push(ln(x, y, x, y + 150, { stroke: INK, width: 4 }));
    a.push(p(`M ${x} ${y + 150} q 18 22 34 4`, { stroke: INK, width: 3.4 }));
    return a;
  }

  // 手机。mode = msg | call | static | camera | map
  function phone(x, y, w, h, mode, o) {
    o = o || {};
    const a = [];
    a.push(rc(x, y, w, h, { rx: w * 0.13, stroke: INK, width: 5 }));
    a.push(rc(x + w * 0.055, y + h * 0.045, w * 0.89, h * 0.91, { rx: w * 0.09, stroke: INK, width: 2.4 }));
    a.push(ln(x + w * 0.37, y + h * 0.068, x + w * 0.63, y + h * 0.068, { stroke: INK, width: 3.2 }));
    // 屏幕光
    a.push(ln(x - 16, y + h * 0.24, x - 42, y + h * 0.13, { stroke: SOFT, width: 1.8, opacity: 0.6 }));
    a.push(ln(x - 10, y + h * 0.4, x - 30, y + h * 0.34, { stroke: SOFT, width: 1.5, opacity: 0.45 }));
    a.push(ln(x - 6, y + h * 0.56, x - 22, y + h * 0.54, { stroke: SOFT, width: 1.4, opacity: 0.35 }));
    const sx = x + w * 0.14, sy = y + h * 0.15, sw = w * 0.72, sh = h * 0.7;
    if (mode === 'msg') {
      a.push(rc(sx, sy, sw * 0.7, sh * 0.15, { rx: 10, stroke: GRAY, width: 2.2 }));
      a.push(ln(sx + 14, sy + sh * 0.06, sx + sw * 0.5, sy + sh * 0.06, { stroke: MID, width: 2, opacity: 0.75 }));
      a.push(ln(sx + 14, sy + sh * 0.1, sx + sw * 0.4, sy + sh * 0.1, { stroke: MID, width: 1.8, opacity: 0.6 }));
      a.push(rc(sx + sw * 0.24, sy + sh * 0.3, sw * 0.76, sh * 0.14, { rx: 10, stroke: GRAY, width: 2.2 }));
      a.push(ln(sx + sw * 0.34, sy + sh * 0.35, sx + sw * 0.8, sy + sh * 0.35, { stroke: MID, width: 2, opacity: 0.7 }));
      a.push(ln(sx + sw * 0.34, sy + sh * 0.39, sx + sw * 0.66, sy + sh * 0.39, { stroke: MID, width: 1.8, opacity: 0.6 }));
      a.push(tx(sx + sw * 0.06, sy + sh * 0.2, '···', { size: 20, fill: MID }));
      a.push(tx(x + w * 0.5, y + h * 0.94, '03:12', { anchor: 'middle', size: 18, fill: MID }));
    } else if (mode === 'call') {
      a.push(tx(x + w * 0.5, sy + sh * 0.12, 'INCOMING', { anchor: 'middle', size: 18, fill: MID }));
      a.push(el(x + w * 0.5, sy + sh * 0.34, w * 0.13, w * 0.13, { stroke: GRAY, width: 3 }));
      a.push(p(`M ${x + w * 0.46} ${sy + sh * 0.35} C ${x + w * 0.48} ${sy + sh * 0.29}, ${x + w * 0.55} ${sy + sh * 0.29}, ${x + w * 0.56} ${sy + sh * 0.35}`, { stroke: GRAY, width: 2.2 }));
      a.push(tx(x + w * 0.5, sy + sh * 0.56, '未知来电', { anchor: 'middle', size: 22, fill: GRAY }));
      a.push(el(x + w * 0.3, y + h * 0.8, w * 0.075, w * 0.075, { stroke: INK, width: 3 }));
      a.push(el(x + w * 0.7, y + h * 0.8, w * 0.075, w * 0.075, { stroke: INK, width: 3 }));
      a.push(p(`M ${x + w * 0.28} ${y + h * 0.8} l ${w * 0.04} ${-w * 0.03}`, { stroke: INK, width: 2.4 }));
      a.push(p(`M ${x + w * 0.68} ${y + h * 0.8} l ${w * 0.04} ${w * 0.03}`, { stroke: INK, width: 2.4 }));
    } else if (mode === 'static') {
      a.push(rc(sx, sy, sw, sh, { fill: 'hatch', stroke: GRAY, width: 2.4 }));
      a.push(tx(x + w * 0.5, sy + sh * 0.47, 'NO SIGNAL', { anchor: 'middle', size: 21, fill: MID }));
      a.push(ln(sx, sy + sh * 0.52, sx + sw, sy + sh * 0.52, { stroke: GRAY, width: 1.4, opacity: 0.6 }));
    } else if (mode === 'camera') {
      a.push(rc(x + w * 0.2, y + h * 0.28, w * 0.6, h * 0.38, { stroke: GRAY, width: 2.2 }));
      const fx = x + w * 0.2, fy = y + h * 0.28, fw = w * 0.6, fh = h * 0.38;
      a.push(p(`M ${fx} ${fy + 18} L ${fx} ${fy} L ${fx + 18} ${fy} M ${fx + fw} ${fy + 18} L ${fx + fw} ${fy} L ${fx + fw - 18} ${fy} M ${fx} ${fy + fh - 18} L ${fx} ${fy + fh} L ${fx + 18} ${fy + fh} M ${fx + fw} ${fy + fh - 18} L ${fx + fw} ${fy + fh} L ${fx + fw - 18} ${fy + fh}`, { stroke: INK, width: 2.6 }));
      a.push(el(x + w * 0.5, sy + sh * 0.2, 8, 8, { fill: GRAY, stroke: GRAY, width: 1 }));
      a.push(tx(x + w * 0.88, sy + sh * 0.2, 'REC', { anchor: 'end', size: 16, fill: MID }));
      a.push(el(x + w * 0.5, y + h * 0.8, w * 0.11, w * 0.11, { stroke: INK, width: 3 }));
    } else if (mode === 'map') {
      for (let i = 0; i < 4; i++) a.push(ln(sx + i * sw / 4, sy, sx + i * sw / 4 + 20, sy + sh, { stroke: SOFT, width: 1.4, opacity: 0.5 }));
      for (let i = 0; i < 3; i++) a.push(ln(sx, sy + i * sh / 3, sx + sw, sy + i * sh / 3 - 10, { stroke: SOFT, width: 1.4, opacity: 0.5 }));
      a.push(p(`M ${sx + sw * 0.1} ${sy + sh * 0.8} L ${sx + sw * 0.4} ${sy + sh * 0.55} L ${sx + sw * 0.55} ${sy + sh * 0.6} L ${sx + sw * 0.9} ${sy + sh * 0.25}`, { stroke: INK, width: 3.4 }));
      a.push(el(sx + sw * 0.9, sy + sh * 0.25, 8, 8, { fill: INK, stroke: INK, width: 1 }));
    }
    return a;
  }

  function treeBare(x, ground, h, o) {
    o = o || {};
    const a = [];
    a.push(p(`M ${x} ${ground} C ${x - h * 0.02} ${ground - h * 0.3}, ${x + h * 0.015} ${ground - h * 0.42}, ${x - h * 0.005} ${ground - h * 0.55}`, { stroke: o.sil ? GRAY : INK, width: Math.max(3, h * 0.018) }));
    const limbs = [
      [x - h * 0.005, ground - h * 0.5, x - h * 0.16, ground - h * 0.68],
      [x - h * 0.005, ground - h * 0.52, x + h * 0.18, ground - h * 0.64],
      [x - h * 0.02, ground - h * 0.55, x - h * 0.07, ground - h * 0.8],
      [x + h * 0.01, ground - h * 0.55, x + h * 0.07, ground - h * 0.78],
      [x - h * 0.02, ground - h * 0.62, x + h * 0.12, ground - h * 0.76],
      [x, ground - h * 0.42, x - h * 0.24, ground - h * 0.48]
    ];
    limbs.forEach(function (b, i) {
      const w = Math.max(1.6, h * 0.011);
      a.push(p(`M ${b[0]} ${b[1]} Q ${(b[0] + b[2]) / 2 + (i % 2 ? 8 : -8)} ${(b[1] + b[3]) / 2}, ${b[2]} ${b[3]}`, { stroke: o.sil ? GRAY : INK, width: w }));
      for (let t = 0; t < 3; t++) {
        const bx = b[2] + rr(-h * 0.05, h * 0.05), by = b[3] + rr(-h * 0.02, h * 0.04);
        a.push(p(`M ${b[2]} ${b[3]} l ${(bx - b[2]) * rr(0.3, 0.8)} ${(by - b[3]) * rr(0.3, 0.8) - h * 0.05}`, { stroke: o.sil ? GRAY : MID, width: 1.2, opacity: 0.7 }));
      }
    });
    return a;
  }

  function carSide(x, ground, s, o) {
    o = o || {};
    const a = [];
    const g = ground;
    a.push(p(`M ${x - 0.5 * s} ${g - 0.06 * s} L ${x - 0.5 * s} ${g - 0.17 * s} C ${x - 0.48 * s} ${g - 0.24 * s}, ${x - 0.4 * s} ${g - 0.26 * s}, ${x - 0.32 * s} ${g - 0.27 * s} L ${x - 0.14 * s} ${g - 0.28 * s} L ${x - 0.02 * s} ${g - 0.4 * s} L ${x + 0.2 * s} ${g - 0.4 * s} L ${x + 0.32 * s} ${g - 0.28 * s} L ${x + 0.44 * s} ${g - 0.26 * s} C ${x + 0.5 * s} ${g - 0.24 * s}, ${x + 0.52 * s} ${g - 0.18 * s}, ${x + 0.51 * s} ${g - 0.06 * s} Z`, { stroke: INK, width: 4.2 }));
    a.push(p(`M ${x - 0.3 * s} ${g - 0.285 * s} L ${x - 0.14 * s} ${g - 0.285 * s} L ${x - 0.03 * s} ${g - 0.385 * s} L ${x - 0.17 * s} ${g - 0.385 * s} Z`, { stroke: MID, width: 2.2 }));
    a.push(p(`M ${x - 0.01 * s} ${g - 0.285 * s} L ${x + 0.18 * s} ${g - 0.285 * s} L ${x + 0.29 * s} ${g - 0.385 * s} L ${x + 0.19 * s} ${g - 0.385 * s} Z`, { stroke: MID, width: 2.2 }));
    a.push(el(x - 0.28 * s, g - 0.08 * s, 0.085 * s, 0.085 * s, { stroke: INK, width: 3.4 }));
    a.push(el(x + 0.3 * s, g - 0.08 * s, 0.085 * s, 0.085 * s, { stroke: INK, width: 3.4 }));
    a.push(ln(x - 0.48 * s, g - 0.14 * s, x - 0.35 * s, g - 0.14 * s, { stroke: MID, width: 1.8 }));
    a.push(ln(x + 0.39 * s, g - 0.14 * s, x + 0.5 * s, g - 0.14 * s, { stroke: MID, width: 1.8 }));
    if (o.light) {
      a.push(p(`M ${x - 0.5 * s} ${g - 0.2 * s} L ${x - 0.82 * s} ${g + 6} L ${x - 0.66 * s} ${g + 8} L ${x - 0.47 * s} ${g - 0.14 * s}`, { stroke: SOFT, width: 2, opacity: 0.6 }));
      a.push(ln(x - 0.5 * s, g - 0.2 * s, x - 0.86 * s, g + 8, { stroke: SOFT, width: 1.3, dash: '6 8', opacity: 0.5 }));
    }
    return a;
  }

  function carFront(x, ground, s, o) {
    o = o || {};
    const a = [];
    a.push(p(`M ${x - 0.42 * s} ${ground} L ${x - 0.46 * s} ${ground - 0.32 * s} C ${x - 0.45 * s} ${ground - 0.5 * s}, ${x - 0.34 * s} ${ground - 0.56 * s}, ${x - 0.24 * s} ${ground - 0.58 * s} L ${x - 0.2 * s} ${ground - 0.8 * s} C ${x - 0.14 * s} ${ground - 0.94 * s}, ${x + 0.14 * s} ${ground - 0.94 * s}, ${x + 0.2 * s} ${ground - 0.8 * s} L ${x + 0.24 * s} ${ground - 0.58 * s} C ${x + 0.34 * s} ${ground - 0.56 * s}, ${x + 0.45 * s} ${ground - 0.5 * s}, ${x + 0.46 * s} ${ground - 0.32 * s} L ${x + 0.42 * s} ${ground}`, { stroke: INK, width: 4.4 }));
    a.push(rc(x - 0.17 * s, ground - 0.78 * s, 0.34 * s, 0.26 * s, { stroke: MID, width: 2.4 }));
    a.push(rc(x - 0.3 * s, ground - 0.46 * s, 0.15 * s, 0.08 * s, { stroke: INK, width: 2.6, fill: 'hatch' }));
    a.push(rc(x + 0.15 * s, ground - 0.46 * s, 0.15 * s, 0.08 * s, { stroke: INK, width: 2.6, fill: 'hatch' }));
    a.push(ln(x - 0.24 * s, ground - 0.3 * s, x + 0.24 * s, ground - 0.3 * s, { stroke: INK, width: 2.4 }));
    if (o.light) {
      a.push(p(`M ${x - 0.38 * s} ${ground - 0.5 * s} L ${x - 0.9 * s} ${ground - 0.6 * s} L ${x - 0.9 * s} ${ground - 0.14 * s} L ${x - 0.38 * s} ${ground - 0.28 * s} Z`, { stroke: SOFT, width: 1.6, fill: 'crosshatch', opacity: 0.5 }));
      a.push(p(`M ${x + 0.38 * s} ${ground - 0.5 * s} L ${x + 0.9 * s} ${ground - 0.6 * s} L ${x + 0.9 * s} ${ground - 0.14 * s} L ${x + 0.38 * s} ${ground - 0.28 * s} Z`, { stroke: SOFT, width: 1.6, fill: 'crosshatch', opacity: 0.5 }));
    }
    return a;
  }

  function clockFace(cx, cy, r, hh, mm) {
    const a = [el(cx, cy, r, r, { stroke: INK, width: 5 }), el(cx, cy, r * 0.9, r * 0.9, { stroke: MID, width: 1.6, opacity: 0.7 })];
    for (let i = 0; i < 12; i++) {
      const ang = i * Math.PI / 6 - Math.PI / 2;
      const r1 = r * (i % 3 === 0 ? 0.78 : 0.84), r2 = r * 0.9;
      a.push(ln(cx + Math.cos(ang) * r1, cy + Math.sin(ang) * r1, cx + Math.cos(ang) * r2, cy + Math.sin(ang) * r2, { stroke: INK, width: i % 3 === 0 ? 3.4 : 1.8 }));
    }
    const ha = (hh % 12 + mm / 60) * Math.PI / 6 - Math.PI / 2;
    const ma = mm * Math.PI / 30 - Math.PI / 2;
    a.push(ln(cx, cy, cx + Math.cos(ha) * r * 0.5, cy + Math.sin(ha) * r * 0.5, { stroke: INK, width: 6 }));
    a.push(ln(cx, cy, cx + Math.cos(ma) * r * 0.76, cy + Math.sin(ma) * r * 0.76, { stroke: INK, width: 3.6 }));
    a.push(el(cx, cy, 9, 9, { fill: INK, stroke: INK, width: 1 }));
    return a;
  }

  function tvSet(x, y, w, h) {
    const a = [];
    a.push(rc(x, y, w, h, { rx: 18, stroke: INK, width: 5 }));
    a.push(rc(x + 22, y + 22, w - 70, h - 50, { rx: 12, stroke: INK, width: 3, fill: 'hatch' }));
    a.push(el(x + w - 32, y + 44, 9, 9, { stroke: INK, width: 2.4 }));
    a.push(el(x + w - 32, y + 74, 9, 9, { stroke: INK, width: 2.4 }));
    for (let i = 0; i < 6; i++) a.push(ln(x + 24, y + 30 + i * 22, x + w - 56, y + 30 + i * 22, { stroke: PALE, width: 1.6, opacity: 0.5 }));
    a.push(p(`M ${x + w * 0.3} ${y} l ${-w * 0.1} ${-h * 0.42} M ${x + w * 0.62} ${y} l ${w * 0.12} ${-h * 0.46}`, { stroke: INK, width: 3 }));
    a.push(ln(x + 40, y + h, x + 26, y + h + 34, { stroke: INK, width: 3.4 }));
    a.push(ln(x + w - 40, y + h, x + w - 26, y + h + 34, { stroke: INK, width: 3.4 }));
    return a;
  }

  function hangingLamp(x, y, s) {
    const a = [
      ln(x, 0, x, y - s * 0.7, { stroke: INK, width: 2.4 }),
      p(`M ${x - s * 0.5} ${y} L ${x + s * 0.5} ${y} L ${x + s * 0.28} ${y - s * 0.7} L ${x - s * 0.28} ${y - s * 0.7} Z`, { stroke: INK, width: 3.6 }),
      p(`M ${x - s * 0.32} ${y + 6} L ${x - s * 1.1} ${Math.min(890, y + s * 2.6)}`, { stroke: SOFT, width: 1.5, dash: '8 10', opacity: 0.55 }),
      p(`M ${x + s * 0.32} ${y + 6} L ${x + s * 1.1} ${Math.min(890, y + s * 2.6)}`, { stroke: SOFT, width: 1.5, dash: '8 10', opacity: 0.55 })
    ];
    return a;
  }

  function crowdRow(ground, specs, o) {
    o = o || {};
    let a = [];
    specs.forEach(function (sp) {
      a = a.concat(figure(sp[0], ground + (sp[2] || 0), sp[1], { sil: true, w: Math.max(2, sp[1] * 0.05) }));
    });
    return a;
  }

  function wires(pts) {
    const a = [];
    for (let i = 0; i < pts.length - 1; i++) {
      const p1 = pts[i], p2 = pts[i + 1];
      a.push(p(`M ${p1[0]} ${p1[1]} Q ${(p1[0] + p2[0]) / 2} ${Math.max(p1[1], p2[1]) + 26}, ${p2[0]} ${p2[1]}`, { stroke: MID, width: 1.5, opacity: 0.65 }));
    }
    return a;
  }

  /* ==========================================================================
   * 5. 构图母版（每张构图 = 一个独立场景函数）
   * ========================================================================== */
  const C = {};

  // 01 夜城定场：层叠天际线 + 河面反光
  C.cityNight = function (o) {
    o = o || {};
    const e = [];
    e.push(p('M 760 150 C 930 118, 1080 168, 1240 138', { stroke: SOFT, width: 1.8, opacity: 0.5 }));
    e.push(p('M 900 208 C 1030 186, 1160 222, 1290 202', { stroke: SOFT, width: 1.4, opacity: 0.35 }));
    e.push(el(1320, 210, 44, 44, { stroke: SOFT, width: 1.6, opacity: 0.55 }));
    e.push.apply(e, skyline(600, { near: true, mid: true, far: true }));
    for (let i = 0; i < 44; i++) e.push(el(rr(50, 1550), rr(584, 600), rr(1, 2.6), rr(1, 2), { fill: PALE, stroke: 'none', width: 0, opacity: rr(0.4, 0.9) }));
    e.push(p('M 180 572 L 760 572 M 300 572 L 300 508 M 640 572 L 640 508 M 300 508 C 400 548, 540 548, 640 508', { stroke: GRAY, width: 2.4 }));
    e.push(p('M 200 572 C 230 588, 260 588, 290 572', { stroke: SOFT, width: 1.4, opacity: 0.5 }));
    e.push(ln(40, 602, 1560, 602, { stroke: GRAY, width: 3.2 }));
    e.push.apply(e, waterLines(640, 878, 28));
    e.push.apply(e, reflectStreaks(120, 1450, 610, 800, 20));
    [260, 520, 760, 980, 1210, 1400].forEach(function (x, i) {
      e.push(ln(x, 612, x + rr(-6, 6), 700 + i * 14, { stroke: PALE, width: rr(1.4, 3), opacity: 0.32 }));
    });
    e.push.apply(e, haze(612, { n: 2, gap: 7 }));
    e.push(ln(0, 690, 430, 668, { stroke: INK, width: 6 }));
    e.push(ln(0, 754, 420, 730, { stroke: INK, width: 4 }));
    [40, 190, 340].forEach(function (x, i) {
      e.push(ln(x, 690 - i * 6, x, 900, { stroke: INK, width: 5 }));
      e.push(ln(x - 14, 898, x + 16, 898, { stroke: INK, width: 4 }));
    });
    e.push(ln(90, 700, 250, 840, { stroke: INK, width: 3, opacity: 0.8 }));
    e.push(p('M 0 900 L 0 806 L 210 792 L 330 900 Z', { fill: 'crosshatch', stroke: 'none', width: 0, opacity: 0.22 }));
    e.push(p('M 1600 900 L 1600 820 L 1400 812 L 1300 900 Z', { fill: 'hatch', stroke: 'none', width: 0, opacity: 0.2 }));
    e.push.apply(e, figure(1470, 720, 92, { sil: true, pose: 'walk', coat: true }));
    e.push.apply(e, shadowPatch(1470, 724, 110));
    e.push(ln(1462, 810, 1462, 884, { stroke: PALE, width: 2, opacity: 0.25 }));
    for (let i = 0; i < 10; i++) e.push(el(rr(60, 1540), rr(760, 880), rr(1, 2.4), rr(1, 2), { fill: PALE, stroke: 'none', width: 0, opacity: rr(0.2, 0.5) }));
    return e;
  };

  // 02 鸟瞰城市：倾斜街区网格 + 车流点
  C.cityAerial = function () {
    const e = [];
    const ax = 0.94, ay = -0.34, bx = 0.34, by = 0.94;
    for (let i = 0; i < 5; i++) {
      for (let j = 0; j < 6; j++) {
        const ox = 130 + i * 235 * ax + j * 178 * bx;
        const oy = 620 + i * 235 * ay + j * 178 * by;
        if (ox < 170 || ox > 1430 || oy < 150 || oy > 780) continue;
        const w = 78, h = 64;
        e.push(p(`M ${ox - w} ${oy - h} L ${ox + w} ${oy - h * 0.4} L ${ox + w * 0.8} ${oy + h} L ${ox - w * 0.9} ${oy + h * 0.5} Z`, { stroke: MID, width: 1.8, fill: rnd() < 0.28 ? 'hatch' : 'none', opacity: 0.75 }));
        e.push(p(`M ${ox - w * 0.4} ${oy - h * 0.5} L ${ox + w * 0.3} ${oy - h * 0.2} L ${ox + w * 0.2} ${oy + h * 0.5} L ${ox - w * 0.5} ${oy + h * 0.2} Z`, { stroke: SOFT, width: 1.2, opacity: 0.5 }));
      }
    }
    e.push(ln(40, 760, 1560, 216, { stroke: INK, width: 2.6, opacity: 0.7 }));
    e.push(ln(40, 812, 1560, 268, { stroke: INK, width: 2.6, opacity: 0.7 }));
    e.push(ln(40, 786, 1560, 242, { stroke: SOFT, width: 1.4, dash: '14 12', opacity: 0.6 }));
    e.push(ln(260, 40, 860, 880, { stroke: INK, width: 2.2, opacity: 0.55 }));
    e.push(ln(310, 40, 910, 880, { stroke: INK, width: 2.2, opacity: 0.55 }));
    for (let i = 0; i < 26; i++) {
      const t = rr(0, 1);
      const x = 60 + t * 1460, y = 750 - t * 522 + rr(-16, 16);
      e.push(ln(x, y, x + rr(9, 18), y - rr(3, 6), { stroke: rnd() < 0.5 ? PALE : MID, width: 2.4, opacity: 0.8 }));
    }
    e.push(p('M 60 130 L 1500 60 L 1540 130 L 110 205 Z', { stroke: SOFT, width: 1.2, fill: 'none', opacity: 0.5 }));
    e.push(ln(120, 430, 1480, 356, { stroke: SOFT, width: 14, opacity: 0.12 }));
    e.push(p('M 0 900 L 0 700 L 300 660 L 420 742 L 430 900 Z', { fill: GRAY, stroke: INK, width: 3 }));
    e.push(p('M 40 742 L 40 700 L 160 686 L 160 734 Z', { stroke: PALE, width: 2, opacity: 0.7 }));
    return e;
  };

  // 03 雨夜街道：两侧建筑夹出的透视纵深
  C.streetRain = function (o) {
    o = o || {};
    const e = [];
    // 远景
    e.push.apply(e, skyline(540, { near: false, mid: true, far: true }));
    e.push(ln(0, 540, 1600, 540, { stroke: GRAY, width: 2.4 }));
    // 左侧前景建筑
    e.push(p('M 0 0 L 470 238 L 470 900 L 0 900 Z', { fill: GRAY, stroke: INK, width: 3 }));
    e.push(p('M 470 238 L 610 306 L 610 900 L 470 900 Z', { fill: 'none', stroke: INK, width: 2.6, opacity: 0.8 }));
    // 右侧前景建筑
    e.push(p('M 1600 0 L 1150 250 L 1150 900 L 1600 900 Z', { fill: GRAY, stroke: INK, width: 3 }));
    e.push(p('M 1150 250 L 1020 312 L 1020 900 L 1150 900 Z', { stroke: INK, width: 2.4, opacity: 0.75 }));
    // 窗光
    for (let i = 0; i < 12; i++) {
      const x = 70 + (i % 3) * 120 + (i > 5 ? 0 : 0);
      const y = 280 + Math.floor(i / 3) * 120;
      if (x < 420) e.push(rc(x, y, 48, 62, { stroke: PALE, width: 2, fill: 'none', opacity: 0.55 }));
    }
    for (let i = 0; i < 9; i++) e.push(rc(1210 + (i % 3) * 100, 300 + Math.floor(i / 3) * 130, 42, 54, { stroke: PALE, width: 2, opacity: 0.45 }));
    // 路面
    e.push(p('M 470 900 L 640 560 L 960 560 L 1130 900 Z', { stroke: 'none', fill: 'none', width: 0 }));
    e.push(ln(660, 900, 800, 560, { stroke: MID, width: 2, opacity: 0.7 }));
    e.push(ln(940, 900, 810, 560, { stroke: MID, width: 2, opacity: 0.7 }));
    for (let i = 0; i < 7; i++) {
      const t = i / 7;
      const y = 880 - t * 300, w = 30 - t * 16;
      e.push(ln(800 - w, y, 800 + w, y, { stroke: SOFT, width: 1.6, opacity: 0.5 }));
    }
    // 路灯
    e.push.apply(e, lampPost(640, 760, 250, { dir: 1 }));
    e.push.apply(e, lampPost(920, 678, 190, { dir: -1 }));
    e.push.apply(e, lampPost(1090, 628, 140, { dir: -1 }));
    // 湿地面反光
    e.push(ln(660, 800, 700, 792, { stroke: PALE, width: 3, opacity: 0.35 }));
    e.push(ln(700, 806, 740, 800, { stroke: PALE, width: 2, opacity: 0.3 }));
    e.push(ln(870, 730, 910, 724, { stroke: PALE, width: 2.4, opacity: 0.3 }));
    // 雨中人
    e.push.apply(e, umbrella(790, 560, 56));
    e.push.apply(e, figure(790, 792, 205, { sil: true, pose: 'walk', coat: true }));
    e.push.apply(e, shadowPatch(790, 796, 90));
    // 前景横杆
    e.push(ln(40, 806, 330, 780, { stroke: INK, width: 6 }));
    e.push(ln(120, 795, 120, 886, { stroke: INK, width: 4 }));
    // 雨
    e.push.apply(e, rain(40, 100, 1560, 860, 95, { len: 30, opacity: 0.45 }));
    return e;
  };

  // 04 大桥：斜拉索 + 水面 + 桥面人影
  C.bridgeSpan = function (o) {
    o = o || {};
    const e = [];
    e.push.apply(e, skyline(584, { near: false, mid: true, far: true }));
    e.push(ln(0, 596, 1600, 596, { stroke: GRAY, width: 3 }));
    // 桥塔
    e.push(ln(430, 596, 430, 178, { stroke: INK, width: 7 }));
    e.push(ln(1170, 596, 1170, 178, { stroke: INK, width: 7 }));
    e.push(ln(410, 252, 450, 252, { stroke: INK, width: 4 }));
    e.push(ln(1150, 252, 1190, 252, { stroke: INK, width: 4 }));
    // 桥面
    e.push(ln(0, 560, 1600, 560, { stroke: INK, width: 6 }));
    e.push(ln(0, 584, 1600, 584, { stroke: INK, width: 3 }));
    // 斜拉索
    for (let i = 0; i < 7; i++) {
      e.push(ln(430, 196 + i * 10, 430 - 60 - i * 56, 560, { stroke: MID, width: 2, opacity: 0.8 }));
      e.push(ln(430, 196 + i * 10, 430 + 60 + i * 64, 560, { stroke: MID, width: 2, opacity: 0.8 }));
      e.push(ln(1170, 196 + i * 10, 1170 - 60 - i * 64, 560, { stroke: MID, width: 2, opacity: 0.8 }));
      e.push(ln(1170, 196 + i * 10, 1170 + 60 + i * 56, 560, { stroke: MID, width: 2, opacity: 0.8 }));
    }
    // 水面
    e.push.apply(e, waterLines(606, 884, 18));
    e.push.apply(e, reflectStreaks(160, 1440, 600, 760, 10));
    // 桥上人影
    e.push.apply(e, figure(1040, 556, 96, { sil: true, pose: 'walk', coat: true }));
    e.push.apply(e, figure(640, 558, 74, { sil: true, pose: 'back' }));
    // 前景桥栏
    e.push(p('M 0 900 L 0 720 L 300 660 L 700 620', { stroke: INK, width: 6 }));
    e.push(p('M 0 780 L 280 728 L 620 690', { stroke: INK, width: 4 }));
    for (let i = 0; i < 5; i++) e.push(ln(60 + i * 135, 900 - i * 32, 70 + i * 135, 760 - i * 30, { stroke: INK, width: 3.4 }));
    // 雾
    e.push.apply(e, haze(590, { n: 2, gap: 7 }));
    return e;
  };

  // 05 天台：女儿墙 / 水塔 / 城市背景
  C.rooftop = function (o) {
    o = o || {};
    const e = [];
    e.push.apply(e, skyline(650, { near: false, mid: true, far: true }));
    e.push(ln(40, 648, 1560, 648, { stroke: GRAY, width: 2.4 }));
    // 天台地面
    e.push(p('M 0 900 L 0 706 L 1600 660 L 1600 900 Z', { stroke: 'none', fill: 'none', width: 0 }));
    e.push(ln(60, 690, 1540, 654, { stroke: INK, width: 5 }));
    e.push(ln(60, 690, 60, 862, { stroke: INK, width: 4.4 }));
    e.push(ln(1400, 662, 1400, 812, { stroke: INK, width: 4 }));
    for (let i = 0; i < 8; i++) e.push(ln(120 + i * 180, 686 - i * 4, 120 + i * 180, 800 - i * 4, { stroke: MID, width: 1.8, opacity: 0.5 }));
    e.push(ln(0, 880, 1600, 834, { stroke: SOFT, width: 2, opacity: 0.5 }));
    // 水塔
    e.push(el(1240, 500, 92, 28, { stroke: INK, width: 3.6 }));
    e.push(rc(1148, 500, 184, 130, { stroke: INK, width: 4 }));
    e.push(el(1240, 630, 92, 26, { stroke: INK, width: 3 }));
    e.push(el(1240, 500, 66, 18, { stroke: MID, width: 2 }));
    e.push(ln(1170, 630, 1170, 702, { stroke: INK, width: 5 }));
    e.push(ln(1310, 630, 1310, 702, { stroke: INK, width: 5 }));
    e.push(ln(1200, 630, 1200, 690, { stroke: MID, width: 2.4 }));
    e.push(ln(1280, 630, 1280, 690, { stroke: MID, width: 2.4 }));
    // 天线与排风管
    e.push(ln(300, 660, 300, 330, { stroke: INK, width: 3.4 }));
    e.push(ln(240, 400, 360, 400, { stroke: INK, width: 2.4 }));
    e.push(ln(260, 350, 340, 350, { stroke: INK, width: 2.4 }));
    e.push(rc(420, 620, 100, 62, { stroke: INK, width: 3.4 }));
    e.push(el(470, 620, 50, 14, { stroke: INK, width: 2.6 }));
    // 人物（背对，站在边缘）
    e.push.apply(e, figure(760, 664, 250, { pose: 'back', coat: true }));
    e.push.apply(e, shadowPatch(760, 668, 120));
    // 追拍变体：第二个人 + 运动线
    if (o.chase) {
      e.push.apply(e, figure(440, 686, 230, { sil: true, pose: 'run', coat: true }));
      e.push.apply(e, figure(960, 660, 240, { sil: true, pose: 'run', coat: true }));
      e.push(p('M 360 660 L 520 640 M 350 700 L 520 676', { stroke: MID, width: 2, dash: '12 8' }));
    }
    // 前景通风口剪影
    e.push(p('M 0 900 L 0 770 L 150 742 L 260 792 L 250 900 Z', { fill: GRAY, stroke: INK, width: 3 }));
    e.push.apply(e, haze(640, { n: 2, gap: 8 }));
    return e;
  };

  // 06 雨窗：窗外城市虚化，窗内背影
  C.windowRain = function (o) {
    o = o || {};
    const e = [];
    // 窗外远景
    e.push.apply(e, skyline(600, { near: false, mid: true, far: true }));
    e.push.apply(e, rain(430, 120, 1360, 700, 60, { len: 22, opacity: 0.4 }));
    // 窗框
    e.push.apply(e, windowGrid(470, 130, 830, 540, 3, 2, { rain: 26 }));
    // 玻璃上的城市光斑
    for (let i = 0; i < 12; i++) e.push(el(rr(500, 1260), rr(180, 600), rr(3, 9), rr(3, 9), { fill: PALE, stroke: 'none', width: 0, opacity: rr(0.3, 0.8) }));
    // 室内墙与窗台
    e.push(ln(40, 706, 1560, 706, { stroke: INK, width: 4 }));
    e.push(ln(40, 706, 40, 900, { stroke: INK, width: 4 }));
    // 窗帘
    e.push(p('M 380 120 C 340 260, 400 470, 350 700', { stroke: INK, width: 3 }));
    e.push(p('M 1430 120 C 1470 260, 1410 470, 1460 700', { stroke: INK, width: 3 }));
    e.push(p('M 380 120 C 410 250, 380 430, 402 610 M 1430 120 C 1398 250, 1430 430, 1410 610', { stroke: MID, width: 1.6, opacity: 0.6 }));
    // 前景：背对镜头的人物头肩
    e.push(p('M 720 900 C 700 790, 700 720, 760 680 C 800 654, 880 650, 930 672 C 990 700, 1000 770, 990 900 Z', { fill: GRAY, stroke: INK, width: 4 }));
    e.push(el(856, 632, 82, 96, { fill: GRAY, stroke: INK, width: 4 }));
    e.push(p('M 790 600 C 810 540, 900 534, 930 596', { stroke: INK, width: 3.4 }));
    // 屏幕/手机光反射到侧脸边缘
    e.push(p('M 930 640 C 960 620, 985 640, 996 686', { stroke: PALE, width: 2.6, opacity: 0.8 }));
    e.push.apply(e, gaze(880, 640, 1120, 470, '视线'));
    return e;
  };

  // 07 站台：列车门光/立柱透视/等待的人
  C.trainPlatform = function (o) {
    o = o || {};
    const e = [];
    // 站台地面
    e.push(p('M 0 900 L 0 620 L 1600 560 L 1600 900 Z', { stroke: 'none', fill: 'none', width: 0 }));
    e.push(ln(0, 620, 1600, 560, { stroke: INK, width: 4 }));
    for (let i = 0; i < 9; i++) e.push(ln(120 + i * 170, 900, 560 + i * 60, 574, { stroke: SOFT, width: 1.5, opacity: 0.5 }));
    // 站台边缘线
    e.push(ln(0, 760, 1600, 688, { stroke: INK, width: 5 }));
    e.push(ln(0, 778, 1600, 704, { stroke: MID, width: 1.8, opacity: 0.6 }));
    // 列车（右侧）
    e.push(rc(1010, 300, 590, 400, { stroke: INK, width: 4 }));
    e.push(ln(1010, 400, 1600, 400, { stroke: GRAY, width: 3 }));
    e.push(ln(1010, 540, 1600, 540, { stroke: GRAY, width: 3 }));
    for (let i = 0; i < 3; i++) e.push(rc(1050 + i * 170, 330, 120, 52, { stroke: INK, width: 3, fill: PALE, opacity: 0.5 }));
    e.push(rc(1080, 560, 100, 180, { stroke: INK, width: 3, fill: PALE, opacity: 0.35 }));
    e.push(ln(1030, 780, 1560, 780, { stroke: INK, width: 4 }));
    e.push(el(1110, 786, 34, 12, { stroke: GRAY, width: 2 }));
    e.push(el(1300, 786, 34, 12, { stroke: GRAY, width: 2 }));
    // 立柱
    for (let i = 0; i < 3; i++) {
      const x = 270 + i * 340, top = 170 + i * 20, bot = 900;
      e.push(rc(x, top, 34, bot - top, { stroke: INK, width: 3.6 }));
      e.push(ln(x - 12, top + 8, x + 46, top + 8, { stroke: INK, width: 3 }));
    }
    // 顶部结构
    e.push(ln(0, 150, 1600, 120, { stroke: INK, width: 4 }));
    e.push(ln(0, 190, 1600, 158, { stroke: MID, width: 2 }));
    // 悬挂指示牌
    e.push(rc(470, 220, 250, 74, { stroke: INK, width: 3.4 }));
    e.push(ln(500, 254, 690, 250, { stroke: MID, width: 2.4 }));
    e.push(ln(500, 274, 640, 271, { stroke: MID, width: 2 }));
    e.push(ln(560, 190, 560, 220, { stroke: INK, width: 2.4 }));
    // 等待的人
    e.push.apply(e, figure(760, 780, 250, { sil: true, pose: 'stand', coat: true }));
    e.push.apply(e, figure(860, 750, 190, { sil: true, pose: 'stand' }));
    e.push.apply(e, shadowPatch(800, 786, 190));
    if (o.chase) {
      e.push.apply(e, figure(530, 812, 260, { sil: true, pose: 'run' }));
      e.push.apply(e, figure(330, 840, 250, { sil: true, pose: 'run' }));
      e.push(p('M 600 770 L 760 748 M 590 810 L 760 786', { stroke: MID, width: 2, dash: '12 9' }));
    }
    // 顶灯
    e.push(ln(690, 158, 970, 150, { stroke: INK, width: 8, opacity: 0.85 }));
    e.push(p('M 700 160 L 660 300 M 960 152 L 1010 296', { stroke: SOFT, width: 1.6, dash: '8 10', opacity: 0.5 }));
    return e;
  };

  // 08 车内：挡风玻璃 / 雨刷 / 驾驶者
  C.carInterior = function (o) {
    o = o || {};
    const e = [];
    // 挡风玻璃外夜景
    e.push(p('M 260 120 L 1360 96 L 1520 560 L 130 560 Z', { stroke: 'none', fill: 'none', width: 0 }));
    e.push.apply(e, skyline(470, { x0: 230, x1: 1400, near: false, mid: true, far: false }));
    e.push(ln(0, 560, 1600, 560, { stroke: GRAY, width: 2.4 }));
    // 雨 / 路面光
    e.push.apply(e, rain(280, 140, 1300, 470, 45, { len: 20, opacity: 0.4 }));
    e.push.apply(e, waterLines(560, 600, 5));
    for (let i = 0; i < 8; i++) e.push(el(rr(300, 1280), rr(500, 548), rr(4, 10), rr(2, 4), { fill: PALE, stroke: 'none', width: 0, opacity: rr(0.3, 0.7) }));
    // 雨刷
    e.push(ln(340, 540, 640, 300, { stroke: INK, width: 5 }));
    e.push(ln(640, 300, 730, 310, { stroke: INK, width: 4 }));
    e.push(ln(1010, 540, 900, 296, { stroke: MID, width: 3, opacity: 0.75 }));
    // 车内顶棚 / A 柱
    e.push(p('M 0 0 L 260 120 L 130 560 L 0 600 Z', { fill: GRAY, stroke: INK, width: 3.6 }));
    e.push(p('M 1600 0 L 1360 96 L 1520 560 L 1600 560 Z', { fill: GRAY, stroke: INK, width: 3.6 }));
    e.push(p('M 0 0 L 1600 0 L 1360 96 L 260 120 Z', { stroke: INK, width: 4 }));
    // 后视镜
    e.push(rc(700, 128, 150, 64, { rx: 12, stroke: INK, width: 4 }));
    e.push(ln(775, 192, 775, 246, { stroke: INK, width: 2.6 }));
    e.push(p('M 775 246 l 14 30 l -28 0 Z', { stroke: INK, width: 2.4 }));
    // 驾驶者（坐姿剪影）
    e.push.apply(e, figure(230, 900, 560, { sil: true, pose: 'sit' }));
    e.push(p('M 292 470 C 294 540, 294 620, 290 700', { stroke: PALE, width: 1.6, opacity: 0.25 }));
    // 方向盘 / 仪表台
    e.push(el(580, 760, 190, 62, { stroke: INK, width: 4 }));
    e.push(p('M 390 900 C 430 790, 560 740, 760 748 C 950 756, 1080 800, 1140 900', { stroke: INK, width: 4.4 }));
    e.push(el(560, 748, 130, 34, { stroke: MID, width: 2.4 }));
    e.push(ln(620, 806, 700, 790, { stroke: MID, width: 2 }));
    // 中控光
    e.push(rc(820, 704, 120, 60, { rx: 6, stroke: MID, width: 2.2 }));
    e.push(ln(840, 724, 920, 724, { stroke: PALE, width: 3, opacity: 0.6 }));
    if (o.dialogue) {
      e.push(el(1330, 590, 64, 74, { fill: GRAY, stroke: INK, width: 3.4 }));
      return e;
    }
    e.push.apply(e, shadowPatch(210, 890, 260));
    // 后视镜里的眼睛（极简）
    e.push(el(768, 160, 10, 5, { stroke: PALE, width: 2, opacity: 0.7 }));
    return e;
  };

  // 09 车外雨夜：低机位车灯 / 湿地反光
  C.carExterior = function (o) {
    o = o || {};
    const e = [];
    e.push.apply(e, skyline(520, { near: false, mid: true, far: true }));
    e.push(ln(0, 520, 1600, 520, { stroke: GRAY, width: 2.4 }));
    // 路面
    e.push(p('M 0 900 L 0 520 L 1600 520 L 1600 900 Z', { stroke: 'none', fill: 'none', width: 0 }));
    e.push(ln(0, 620, 1600, 600, { stroke: SOFT, width: 2, opacity: 0.5 }));
    e.push(ln(0, 780, 1600, 740, { stroke: SOFT, width: 1.6, opacity: 0.35 }));
    // 主车
    e.push.apply(e, carSide(1030, 760, 720, { light: true }));
    e.push.apply(e, carFront(430, 730, 360, { light: false }));
    // 车灯与光锥
    e.push(p('M 670 622 L 40 520 L 40 700 L 660 700 Z', { fill: 'crosshatch', stroke: SOFT, width: 1.4, opacity: 0.35 }));
    e.push(p('M 1390 622 L 1560 540 L 1560 690 L 1390 700 Z', { fill: 'crosshatch', stroke: SOFT, width: 1.4, opacity: 0.3 }));
    e.push(ln(1392, 622, 1560, 548, { stroke: PALE, width: 2, opacity: 0.55 }));
    // 湿地反光
    e.push(ln(960, 790, 1160, 782, { stroke: PALE, width: 3, opacity: 0.3 }));
    e.push(ln(980, 812, 1200, 802, { stroke: PALE, width: 2, opacity: 0.25 }));
    e.push(ln(1300, 770, 1480, 762, { stroke: PALE, width: 2, opacity: 0.25 }));
    e.push.apply(e, waterLines(780, 890, 12));
    // 雨
    e.push.apply(e, rain(40, 80, 1560, 820, 80, { len: 32, opacity: 0.45 }));
    // 前景路肩 / 反光柱
    e.push(ln(40, 880, 420, 840, { stroke: INK, width: 6 }));
    e.push(ln(150, 856, 150, 900, { stroke: INK, width: 3.6 }));
    e.push(ln(300, 840, 300, 888, { stroke: INK, width: 3.2 }));
    if (o.chase) {
      e.push(p('M 700 690 L 560 680 M 700 740 L 540 726', { stroke: MID, width: 2.2, dash: '16 10' }));
      e.push.apply(e, figure(330, 700, 120, { sil: true, pose: 'run' }));
    }
    return e;
  };

  // 10 旷野黄昏：大留白地平线 / 孤树 / 微小人影
  C.fieldDusk = function (o) {
    o = o || {};
    const e = [];
    // 天空
    e.push(p('M 80 300 C 260 262, 460 292, 660 268', { stroke: SOFT, width: 1.6, opacity: 0.5 }));
    e.push(p('M 900 210 C 1120 176, 1320 214, 1520 184', { stroke: SOFT, width: 1.4, opacity: 0.4 }));
    e.push(el(1180, 380, 54, 54, { stroke: SOFT, width: 2, opacity: 0.7 }));
    // 远山 / 树线
    e.push(ln(40, 520, 1560, 520, { stroke: GRAY, width: 2.4 }));
    e.push(p('M 40 520 L 210 500 L 320 514 L 470 496 L 620 512 L 760 502 L 900 516 L 1100 500 L 1260 512 L 1560 500', { stroke: MID, width: 1.8, opacity: 0.75 }));
    // 地面
    for (let i = 0; i < 6; i++) e.push(ln(440 - i * 76, 560 + i * 52, 1160 + i * 76, 560 + i * 52, { stroke: SOFT, width: 1.3, opacity: 0.4 }));
    e.push(ln(80, 900, 1520, 900, { stroke: 'none', width: 0 }));
    // 孤树
    e.push.apply(e, treeBare(360, 720, 360));
    // 远处电杆
    for (let i = 0; i < 3; i++) {
      const x = 940 + i * 190;
      e.push(ln(x, 560 + i * 14, x, 500 + i * 12, { stroke: MID, width: 2.4 }));
      e.push(ln(x - 16, 508 + i * 12, x + 16, 506 + i * 12, { stroke: MID, width: 2 }));
    }
    e.push.apply(e, wires([[940, 500], [1130, 512], [1320, 526]]));
    // 人物
    if (!o.empty) {
      e.push.apply(e, figure(o.sit ? 700 : 760, o.sit ? 700 : 714, 112, { sil: true, pose: o.sit ? 'sit' : 'back', coat: true }));
      if (o.sit) { e.push(ln(688, 700, 740, 696, { stroke: GRAY, width: 4 })); }
      e.push.apply(e, shadowPatch(760, 718, 100));
    }
    // 前景草
    for (let i = 0; i < 45; i++) {
      const x = rr(40, 1560), h = rr(18, 62), y = rr(800, 894);
      e.push(ln(x, y, x + rr(-14, 14), y - h, { stroke: i % 4 === 0 ? INK : MID, width: rr(1.2, 2.4), opacity: rr(0.4, 0.85) }));
    }
    return e;
  };

  // 11 地下通道：拱顶 / 尽头光 / 背影
  C.underpass = function () {
    const e = [];
    // 顶梁 / 拱
    e.push(p('M 0 210 L 1600 168 L 1600 300 L 0 342 Z', { fill: GRAY, stroke: INK, width: 3 }));
    e.push(p('M 0 342 L 1600 300', { stroke: INK, width: 2.6 }));
    e.push(p('M 240 342 C 300 470, 300 620, 260 900', { stroke: INK, width: 5 }));
    e.push(p('M 1360 300 C 1300 440, 1300 610, 1340 900', { stroke: INK, width: 5 }));
    // 柱子
    e.push(rc(470, 420, 90, 480, { stroke: INK, width: 3.4 }));
    e.push(rc(1040, 400, 90, 500, { stroke: INK, width: 3.4 }));
    e.push(ln(478, 500, 552, 498, { stroke: MID, width: 1.8, opacity: 0.6 }));
    e.push(ln(478, 590, 552, 588, { stroke: MID, width: 1.8, opacity: 0.6 }));
    e.push(ln(1048, 480, 1122, 478, { stroke: MID, width: 1.8, opacity: 0.6 }));
    // 尽头光
    e.push(rc(600, 380, 400, 300, { stroke: PALE, width: 2, fill: 'none', opacity: 0.7 }));
    e.push(ln(600, 680, 1000, 680, { stroke: INK, width: 2.4 }));
    e.push(p('M 600 680 L 520 820 M 1000 680 L 1080 820', { stroke: SOFT, width: 1.6, opacity: 0.5 }));
    // 湿地面
    e.push(ln(0, 800, 1600, 780, { stroke: SOFT, width: 1.8, opacity: 0.45 }));
    for (let i = 0; i < 14; i++) e.push(ln(rr(200, 1400), rr(700, 880), rr(240, 1480), rr(700, 880), { stroke: SOFT, width: rr(1, 2), opacity: rr(0.25, 0.55) }));
    // 人物
    e.push.apply(e, figure(800, 760, 150, { sil: true, pose: 'back', coat: true }));
    e.push.apply(e, shadowPatch(800, 766, 110));
    // 前景柱边
    e.push(p('M 0 900 L 0 500 L 70 520 L 130 900 Z', { fill: GRAY, stroke: INK, width: 3 }));
    // 滴水
    for (let i = 0; i < 5; i++) e.push(ln(rr(100, 1500), rr(330, 420), rr(100, 1500), rr(500, 620), { stroke: SOFT, width: 1, opacity: 0.4 }));
    return e;
  };

  // 12 林间小路：树干层次 / 雾 / 背影
  C.forestPath = function () {
    const e = [];
    // 雾
    e.push.apply(e, haze(470, { n: 4, gap: 16 }));
    // 远景树
    for (let i = 0; i < 9; i++) {
      const x = 120 + i * 170;
      e.push(ln(x, 520 + rr(-16, 16), x + rr(-10, 10), 300 + rr(-40, 40), { stroke: SOFT, width: rr(1.6, 2.6), opacity: 0.7 }));
      e.push(p(`M ${x} ${390 + rr(-20, 20)} l ${rr(-40, 40)} ${rr(-40, -14)}`, { stroke: SOFT, width: 1.4, opacity: 0.6 }));
    }
    // 中景树
    for (let i = 0; i < 5; i++) {
      const x = 220 + i * 300;
      e.push(p(`M ${x} 760 C ${x - 10} 660, ${x + 8} 560, ${x - 4} 420`, { stroke: GRAY, width: 5 }));
      e.push(p(`M ${x} 640 l ${rr(-70, -30)} ${rr(-90, -40)} M ${x} 590 l ${rr(40, 80)} ${rr(-80, -40)} M ${x} 500 l ${rr(-50, -20)} ${rr(-40, -10)}`, { stroke: GRAY, width: 3 }));
    }
    // 小路
    e.push(p('M 650 900 C 700 760, 760 640, 790 520 L 822 520 C 840 660, 900 780, 960 900', { stroke: INK, width: 4.2 }));
    e.push(p('M 690 900 C 740 780, 770 650, 795 540', { stroke: MID, width: 1.6, opacity: 0.5 }));
    e.push(p('M 915 900 C 880 780, 840 660, 815 540', { stroke: MID, width: 1.6, opacity: 0.5 }));
    // 人物
    e.push.apply(e, figure(806, 712, 160, { pose: 'back', coat: true }));
    e.push.apply(e, shadowPatch(806, 718, 120));
    // 光柱
    e.push(p('M 560 120 L 700 900 M 760 90 L 920 900', { stroke: SOFT, width: 2, opacity: 0.28 }));
    e.push(p('M 640 120 L 780 900 M 820 96 L 990 900', { stroke: SOFT, width: 1.2, opacity: 0.18 }));
    // 前景树干
    e.push(p('M 0 900 L 30 0 L 140 0 L 120 900 Z', { fill: GRAY, stroke: INK, width: 3 }));
    e.push(p('M 1600 900 L 1560 0 L 1450 0 L 1470 900 Z', { fill: GRAY, stroke: INK, width: 3 }));
    e.push(p('M 40 240 l 100 -12 M 50 420 l 110 18 M 1470 300 l -110 14', { stroke: MID, width: 2 }));
    // 前景草
    for (let i = 0; i < 30; i++) {
      const x = rr(40, 1560), y = rr(840, 896);
      e.push(ln(x, y, x + rr(-10, 10), y - rr(14, 44), { stroke: MID, width: 1.4, opacity: 0.6 }));
    }
    return e;
  };

  // 13 小巷：两侧墙 / 电线 / 深处灯
  C.alley = function (o) {
    o = o || {};
    const e = [];
    // 远处街口
    e.push(rc(700, 430, 200, 250, { stroke: PALE, width: 2, opacity: 0.65 }));
    e.push(ln(700, 680, 900, 680, { stroke: INK, width: 2.4 }));
    // 左墙
    e.push(p('M 0 0 L 0 900 L 470 900 L 700 680 L 700 430 L 470 300 L 0 120 Z', { fill: 'none', stroke: INK, width: 3.6 }));
    // 右墙
    e.push(p('M 1600 0 L 1600 900 L 1130 900 L 900 680 L 900 430 L 1130 300 L 1600 120 Z', { fill: 'none', stroke: INK, width: 3.6 }));
    // 墙面结构线
    for (let i = 0; i < 4; i++) {
      e.push(ln(120 + i * 130, 240 + i * 42, 120 + i * 130, 900, { stroke: SOFT, width: 1.4, opacity: 0.5 }));
      e.push(ln(1480 - i * 130, 240 + i * 42, 1480 - i * 130, 900, { stroke: SOFT, width: 1.4, opacity: 0.5 }));
    }
    e.push(ln(0, 240, 480, 380, { stroke: MID, width: 1.6, opacity: 0.6 }));
    e.push(ln(1600, 240, 1120, 380, { stroke: MID, width: 1.6, opacity: 0.6 }));
    // 电线
    e.push.apply(e, wires([[0, 180], [420, 250], [820, 300], [1200, 240], [1600, 180]]));
    e.push.apply(e, wires([[0, 120], [380, 190], [800, 240], [1180, 180], [1600, 130]]));
    // 管道 / 空调外机
    e.push(p('M 150 360 L 150 900 M 190 360 L 190 900', { stroke: MID, width: 2.4 }));
    e.push(rc(240, 560, 110, 80, { stroke: INK, width: 3.4 }));
    e.push(ln(240, 590, 350, 590, { stroke: MID, width: 2 }));
    e.push(rc(1290, 500, 96, 72, { stroke: INK, width: 3.2 }));
    // 垃圾桶
    e.push(rc(1010, 700, 90, 130, { stroke: INK, width: 3.4, rx: 4 }));
    e.push(el(1055, 700, 45, 12, { stroke: INK, width: 2.6 }));
    // 地面积水
    e.push(ln(400, 820, 1200, 780, { stroke: SOFT, width: 1.8, opacity: 0.5 }));
    e.push(ln(600, 850, 1000, 836, { stroke: SOFT, width: 1.4, opacity: 0.45 }));
    // 人影
    e.push.apply(e, figure(800, 770, 170, { sil: true, pose: 'back', coat: true }));
    e.push.apply(e, shadowPatch(800, 776, 120));
    // 上方灯
    e.push(ln(430, 300, 520, 320, { stroke: INK, width: 3.2 }));
    e.push(rc(520, 320, 34, 26, { stroke: INK, width: 2.6 }));
    e.push(p('M 530 348 L 500 900 M 548 348 L 600 900', { stroke: SOFT, width: 1.2, opacity: 0.28 }));
    // 监控
    e.push(ln(1500, 170, 1500, 240, { stroke: INK, width: 3 }));
    e.push(p('M 1470 240 L 1530 240 L 1524 266 L 1476 266 Z', { stroke: INK, width: 2.6 }));
    if (o.rain) e.push.apply(e, rain(80, 200, 1520, 860, 70, { len: 30, opacity: 0.4 }));
    return e;
  };

  // 14 地铁站台：地下荧光灯 / 轨道 / 车灯接近
  C.subwayPlatform = function () {
    const e = [];
    // 顶部结构
    e.push(ln(0, 150, 1600, 150, { stroke: INK, width: 4.4 }));
    e.push(ln(0, 200, 1600, 200, { stroke: MID, width: 2 }));
    e.push(ln(0, 260, 1600, 260, { stroke: SOFT, width: 1.6, opacity: 0.6 }));
    // 对面墙与瓷砖
    e.push(rc(0, 260, 1600, 430, { stroke: 'none', width: 0 }));
    for (let i = 0; i < 29; i++) e.push(ln(40 + i * 54, 280, 40 + i * 54, 680, { stroke: SOFT, width: 1, opacity: 0.28 }));
    for (let j = 0; j < 7; j++) e.push(ln(40, 300 + j * 56, 1560, 300 + j * 56, { stroke: SOFT, width: 1, opacity: 0.28 }));
    // 站台面
    e.push(ln(0, 700, 1600, 700, { stroke: INK, width: 4 }));
    e.push(ln(0, 726, 1600, 726, { stroke: INK, width: 3 }));
    for (let i = 0; i < 4; i++) e.push(ln(120 + i * 400, 900, 220 + i * 400, 726, { stroke: SOFT, width: 1.2, opacity: 0.35 }));
    // 轨道
    e.push(p('M 0 900 L 0 790 L 1600 740 L 1600 820 Z', { fill: 'none', stroke: 'none', width: 0 }));
    e.push(ln(0, 806, 1600, 762, { stroke: INK, width: 3 }));
    e.push(ln(0, 860, 1600, 816, { stroke: INK, width: 3 }));
    for (let i = 0; i < 14; i++) e.push(ln(80 + i * 110, 790, 80 + i * 110, 890, { stroke: MID, width: 2, opacity: 0.6 }));
    // 立柱
    for (let i = 0; i < 3; i++) {
      const x = 300 + i * 500;
      e.push(rc(x, 250, 40, 456, { stroke: INK, width: 3.8 }));
      e.push(rc(x - 12, 690, 64, 22, { stroke: INK, width: 2.6 }));
    }
    // 顶灯
    for (let i = 0; i < 3; i++) {
      const x = 380 + i * 420;
      e.push(rc(x, 214, 180, 16, { stroke: MID, width: 2, fill: PALE, opacity: 0.6 }));
      e.push(p(`M ${x + 20} 230 L ${x + 40} 350 M ${x + 160} 230 L ${x + 180} 350`, { stroke: SOFT, width: 1, opacity: 0.3 }));
    }
    // 长椅与乘客
    e.push(ln(560, 760, 840, 752, { stroke: INK, width: 4.4 }));
    e.push(ln(590, 760, 610, 810, { stroke: INK, width: 3 }));
    e.push(ln(800, 754, 820, 804, { stroke: INK, width: 3 }));
    e.push.apply(e, figure(930, 780, 210, { sil: true, pose: 'stand', coat: true }));
    e.push.apply(e, figure(1010, 760, 170, { sil: true, pose: 'stand' }));
    e.push.apply(e, shadowPatch(960, 786, 150));
    // 隧道深处车灯
    e.push(el(250, 640, 60, 24, { stroke: PALE, width: 2, opacity: 0.7 }));
    e.push(p('M 190 640 L 40 610 M 190 650 L 40 660 M 310 640 L 420 610', { stroke: PALE, width: 1.6, opacity: 0.45 }));
    // 前景柱边
    e.push(p('M 0 900 L 0 520 L 90 540 L 120 900 Z', { fill: GRAY, stroke: INK, width: 3 }));
    return e;
  };

  // 15 走廊：单点透视 / 追拍
  C.corridor = function (o) {
    o = o || {};
    const e = [];
    const vx = 800, vy = 460;
    const lerp = (a, b, t) => a + (b - a) * t;
    e.push(p('M 0 120 L 800 460 L 0 750 Z', { fill: 'hatch', stroke: 'none', width: 0, opacity: 0.1 }));
    e.push(p('M 1600 120 L 800 460 L 1600 750 Z', { fill: 'hatch', stroke: 'none', width: 0, opacity: 0.1 }));
    e.push(ln(0, 120, vx, vy, { stroke: INK, width: 3.2 }));
    e.push(ln(1600, 120, vx, vy, { stroke: INK, width: 3.2 }));
    e.push(ln(0, 750, vx, vy, { stroke: INK, width: 3.6 }));
    e.push(ln(1600, 750, vx, vy, { stroke: INK, width: 3.6 }));
    e.push(ln(0, 900, 690, 520, { stroke: MID, width: 2 }));
    e.push(ln(1600, 900, 910, 520, { stroke: MID, width: 2 }));
    for (let i = 0; i < 5; i++) {
      const t = [0.15, 0.3, 0.45, 0.6, 0.72][i];
      e.push(ln(lerp(0, vx, t), lerp(900, 520, t), lerp(1600, vx, t), lerp(900, 520, t), { stroke: SOFT, width: 1.1, opacity: 0.3 }));
    }
    e.push(p('M 0 900 L 0 700 L 280 900 Z', { fill: 'hatch', stroke: 'none', width: 0, opacity: 0.2 }));
    e.push(p('M 1600 900 L 1600 700 L 1320 900 Z', { fill: 'hatch', stroke: 'none', width: 0, opacity: 0.2 }));
    e.push(rc(700, 360, 200, 260, { stroke: INK, width: 3.6 }));
    e.push(rc(742, 410, 116, 210, { stroke: INK, width: 2.6, fill: PALE, opacity: 0.5 }));
    e.push(ln(800, 410, 800, 620, { stroke: MID, width: 1.6, opacity: 0.6 }));
    e.push(ln(742, 520, 800, 520, { stroke: MID, width: 1.6, opacity: 0.5 }));
    for (let i = 0; i < 4; i++) {
      const t = [0.12, 0.3, 0.5, 0.7][i];
      const xL = lerp(0, vx, t), fL = lerp(750, vy, t), dh = 310 * (1 - t * 0.68);
      e.push(ln(xL, fL, xL, fL - dh, { stroke: INK, width: 2.8 }));
      e.push(ln(xL, fL - dh, lerp(xL, vx, 0.09), lerp(fL - dh, vy, 0.09), { stroke: INK, width: 2.2 }));
      e.push(ln(xL + 10, fL - 14, xL + 10, fL - dh * 0.94, { stroke: MID, width: 1.4, opacity: 0.55 }));
      e.push(el(xL + 26 * (1 - t), fL - dh * 0.72, 6 * (1 - t), 8 * (1 - t), { fill: PALE, stroke: MID, width: 1.2 }));
      const xR = lerp(1600, vx, t), fR = lerp(750, vy, t);
      e.push(ln(xR, fR, xR, fR - dh, { stroke: INK, width: 2.8 }));
      e.push(ln(xR, fR - dh, lerp(xR, vx, 0.09), lerp(fR - dh, vy, 0.09), { stroke: INK, width: 2.2 }));
      e.push(el(xR - 26 * (1 - t), fR - dh * 0.72, 6 * (1 - t), 8 * (1 - t), { fill: PALE, stroke: MID, width: 1.2 }));
    }
    for (let i = 0; i < 4; i++) {
      const t = [0.1, 0.28, 0.48, 0.68][i];
      const y = lerp(120, vy, t) + 26 * (1 - t);
      const w = 300 * (1 - t * 0.75), h = 12 * (1 - t * 0.7);
      e.push(rc(800 - w / 2, y, w, h, { stroke: MID, width: 1.6, fill: PALE, opacity: 0.6 }));
      e.push(p(`M ${800 - w / 2} ${y + h} L ${800 - w * 0.9} 900 M ${800 + w / 2} ${y + h} L ${800 + w * 0.9} 900`, { stroke: SOFT, width: 1.1, opacity: 0.2 }));
    }
    e.push(ln(700, 520, 200, 900, { stroke: SOFT, width: 1.6, opacity: 0.35 }));
    e.push(ln(900, 520, 1400, 900, { stroke: SOFT, width: 1.6, opacity: 0.35 }));
    if (o.mode === 'chase') {
      e.push.apply(e, figure(640, 862, 400, { sil: true, pose: 'run', coat: true }));
      e.push.apply(e, figure(900, 660, 200, { sil: true, pose: 'run' }));
      e.push.apply(e, figure(770, 548, 110, { sil: true, pose: 'run' }));
      e.push.apply(e, shadowPatch(640, 868, 260));
      e.push(p('M 430 690 L 590 664 M 420 750 L 580 718 M 1000 640 L 1140 618', { stroke: MID, width: 2, dash: '14 9', opacity: 0.75 }));
      [[520, 840], [600, 812], [380, 872], [1020, 824]].forEach(function (pt) {
        e.push(p(`M ${pt[0] - 20} ${pt[1]} L ${pt[0] + 18} ${pt[1] - 6} L ${pt[0] + 24} ${pt[1] + 8} L ${pt[0] - 14} ${pt[1] + 12} Z`, { stroke: MID, width: 1.4, opacity: 0.65 }));
      });
      e.push.apply(e, markMove(340, 786, 720, 760, 'TRACKING'));
    } else if (o.mode === 'dolly') {
      e.push.apply(e, figure(800, 690, 300, { sil: true, pose: 'back', coat: true }));
      e.push.apply(e, shadowPatch(800, 696, 170));
      e.push.apply(e, markPush(150));
    } else if (o.mode === 'walk') {
      e.push.apply(e, figure(760, 700, 280, { sil: true, pose: 'walk', coat: true }));
      e.push.apply(e, shadowPatch(760, 708, 160));
    } else {
      e.push(p('M 520 870 L 540 856 L 556 868 L 536 880 Z', { stroke: MID, width: 1.3, opacity: 0.5 }));
    }
    e.push(p('M 0 0 L 0 900 L 56 900 L 56 40 Z', { fill: GRAY, stroke: INK, width: 3 }));
    e.push(ln(30, 40, 30, 900, { stroke: MID, width: 1.8, opacity: 0.5 }));
    e.push(p('M 1600 0 L 1600 900 L 1544 900 L 1544 40 Z', { fill: GRAY, stroke: INK, width: 3 }));
    e.push(ln(1570, 40, 1570, 900, { stroke: MID, width: 1.8, opacity: 0.5 }));
    return e;
  };

  // 16 酒店走廊：长焦压缩 / 门牌 / 壁灯
  C.hotelHall = function (o) {
    o = o || {};
    const e = [];
    const vx = 800, vy = 430;
    const lerp = (a, b, t) => a + (b - a) * t;
    e.push(ln(0, 100, vx, vy, { stroke: INK, width: 3 }));
    e.push(ln(1600, 100, vx, vy, { stroke: INK, width: 3 }));
    e.push(ln(0, 720, vx, vy, { stroke: INK, width: 3.4 }));
    e.push(ln(1600, 720, vx, vy, { stroke: INK, width: 3.4 }));
    e.push(rc(740, 350, 120, 210, { stroke: INK, width: 3 }));
    // 地毯
    for (let i = 0; i < 5; i++) {
      const t = i / 5;
      e.push(ln(lerp(0, vx, t * 0.85), lerp(720, vy, t * 0.85), lerp(1600, vx, t * 0.85), lerp(720, vy, t * 0.85), { stroke: SOFT, width: 1.3, opacity: 0.4 }));
      e.push(ln(lerp(0, vx, t * 0.85), lerp(900, 520, t * 0.85), lerp(1600, vx, t * 0.85), lerp(900, 520, t * 0.85), { stroke: SOFT, width: 1.1, opacity: 0.3 }));
    }
    for (let i = 0; i < 6; i++) {
      const t = [0.1, 0.24, 0.4, 0.56, 0.7, 0.82][i];
      const x = lerp(0, vx, t), f = lerp(720, vy, t);
      const dh = 250 * (1 - t * 0.72);
      e.push(ln(x, f, x, f - dh, { stroke: INK, width: 2.8 }));
      e.push(ln(x, f - dh, lerp(x, vx, 0.07), lerp(f - dh, vy, 0.07), { stroke: INK, width: 2.2 }));
      // 门牌
      e.push(rc(x + 6, f - dh * 0.62, 18, 12, { stroke: MID, width: 1.6 }));
      // 壁灯
      e.push(p(`M ${x + 2} ${f - dh * 0.88} L ${x + 18} ${f - dh * 0.88} L ${x + 14} ${f - dh * 0.8} L ${x + 6} ${f - dh * 0.8} Z`, { stroke: INK, width: 1.8, fill: 'hatch', opacity: 0.8 }));
      e.push(p(`M ${x + 10} ${f - dh * 0.79} L ${x + 20} ${f - dh * 0.2}`, { stroke: SOFT, width: 1, opacity: 0.3 }));
      // 右侧镜像
      const xr = lerp(1600, vx, t), fr = lerp(720, vy, t);
      e.push(ln(xr, fr, xr, fr - dh, { stroke: INK, width: 2.8 }));
      e.push(ln(xr, fr - dh, lerp(xr, vx, 0.07), lerp(fr - dh, vy, 0.07), { stroke: INK, width: 2.2 }));
    }
    // 尽头的窗
    e.push(rc(780, 360, 40, 120, { stroke: PALE, width: 2, opacity: 0.6 }));
    // 人物
    e.push.apply(e, figure(800, 590, 130, { sil: true, pose: 'walk', coat: true }));
    e.push.apply(e, shadowPatch(800, 596, 90));
    // 前景门框
    e.push(p('M 0 0 L 0 900 L 90 900 L 90 40 Z', { fill: GRAY, stroke: INK, width: 3 }));
    e.push(p('M 1600 0 L 1600 900 L 1510 900 L 1510 40 Z', { fill: GRAY, stroke: INK, width: 3 }));
    e.push(tx(96, 780, 'ROOM 704', { size: 22, fill: MID, anchor: 'start' }));
    return e;
  };

  // 17 楼梯间：折返楼梯 / 窗光 / 奔跑或独坐
  C.stairwell = function (o) {
    o = o || {};
    const e = [];
    // 墙面
    e.push(rc(0, 0, 1600, 900, { stroke: 'none', width: 0 }));
    e.push(ln(40, 120, 1560, 120, { stroke: INK, width: 4.4 }));
    // 窗
    e.push(rc(980, 170, 370, 260, { stroke: INK, width: 4 }));
    e.push(ln(1165, 170, 1165, 430, { stroke: INK, width: 3 }));
    e.push(ln(980, 300, 1350, 300, { stroke: INK, width: 3 }));
    e.push(p('M 1000 430 L 780 900 M 1330 430 L 1570 900', { stroke: SOFT, width: 1.8, opacity: 0.3 }));
    // 下段楼梯 + 上段楼梯（折返）
    const step = (x0, y0, n, dx, dy) => {
      let d = `M ${x0} ${y0}`;
      const a = [];
      for (let i = 0; i < n; i++) {
        d += ` L ${x0 + i * dx} ${y0 + (i + 1) * dy} L ${x0 + (i + 1) * dx} ${y0 + (i + 1) * dy}`;
      }
      a.push(p(d, { stroke: INK, width: 3.2 }));
      return a;
    };
    e.push.apply(e, step(120, 900, 8, 52, -72));
    e.push.apply(e, step(1480, 480, 6, -52, 70));
    // 扶手
    e.push(ln(110, 760, 560, 320, { stroke: INK, width: 4.4 }));
    e.push(ln(150, 790, 600, 350, { stroke: INK, width: 2.2 }));
    e.push(ln(1480, 380, 1100, 780, { stroke: INK, width: 4.4 }));
    for (let i = 0; i < 6; i++) e.push(ln(160 + i * 74, 900 - i * 86, 160 + i * 74, 810 - i * 86, { stroke: INK, width: 2.4 }));
    for (let i = 0; i < 6; i++) e.push(ln(1440 - i * 66, 500 + i * 62, 1440 - i * 66, 430 + i * 62, { stroke: INK, width: 2.4 }));
    // 平台
    e.push(ln(590, 442, 1010, 442, { stroke: INK, width: 3.6 }));
    e.push(ln(590, 900, 590, 442, { stroke: MID, width: 2, opacity: 0.6 }));
    // 人物
    if (o.mode === 'chase') {
      e.push.apply(e, figure(520, 640, 280, { sil: true, pose: 'run', coat: true }));
      e.push.apply(e, figure(340, 760, 260, { sil: true, pose: 'run' }));
      e.push(p('M 610 540 L 700 500 M 600 590 L 690 550', { stroke: MID, width: 2, dash: '14 9' }));
    } else if (o.mode === 'sit') {
      e.push.apply(e, figure(760, 560, 210, { pose: 'sit', w: 4 }));
      e.push(ln(700, 560, 820, 556, { stroke: INK, width: 3.4 }));
    } else {
      e.push.apply(e, figure(770, 690, 250, { sil: true, pose: 'walk' }));
      e.push.apply(e, shadowPatch(770, 696, 140));
    }
    // 暗角排线
    e.push(p('M 40 900 L 40 480 l 60 20 L 60 900 Z', { stroke: 'none', fill: 'crosshatch', width: 0, opacity: 0.35 }));
    e.push(p('M 1520 900 L 1520 500 l 42 -18 L 1560 900 Z', { stroke: 'none', fill: 'hatch', width: 0, opacity: 0.3 }));
    return e;
  };

  // 18 电梯：正面构图 / 门缝光
  C.elevator = function (o) {
    o = o || {};
    const e = [];
    // 后墙
    e.push(rc(330, 90, 940, 700, { stroke: INK, width: 3.6 }));
    e.push(rc(420, 130, 760, 620, { stroke: MID, width: 2, opacity: 0.6 }));
    // 电梯门
    e.push(rc(590, 180, 420, 570, { stroke: INK, width: 4.4 }));
    e.push(ln(800, 180, 800, 750, { stroke: INK, width: 3 }));
    if (o.open) {
      e.push(rc(590, 180, 60, 570, { stroke: INK, width: 2.4, fill: 'none' }));
      e.push(rc(950, 180, 60, 570, { stroke: INK, width: 2.4, fill: 'none' }));
      e.push(rc(650, 180, 300, 570, { stroke: PALE, width: 2, opacity: 0.7 }));
    } else {
      e.push(ln(800, 200, 800, 730, { stroke: MID, width: 1.6, opacity: 0.7 }));
    }
    // 楼层面板
    e.push(rc(760, 96, 80, 52, { stroke: INK, width: 3 }));
    e.push(tx(800, 132, 'B1', { size: 26, fill: GRAY, anchor: 'middle' }));
    e.push(ln(770, 112, 790, 112, { stroke: MID, width: 1.8 }));
    // 侧墙
    e.push(p('M 0 0 L 330 90 L 330 790 L 0 900 Z', { fill: GRAY, stroke: INK, width: 3 }));
    e.push(p('M 1600 0 L 1270 90 L 1270 790 L 1600 900 Z', { fill: GRAY, stroke: INK, width: 3 }));
    // 扶手
    e.push(ln(360, 470, 580, 470, { stroke: INK, width: 3.4 }));
    e.push(ln(1020, 470, 1240, 470, { stroke: INK, width: 3.4 }));
    // 按钮板
    e.push(rc(1090, 360, 54, 210, { stroke: INK, width: 2.6 }));
    for (let i = 0; i < 6; i++) e.push(el(1117, 386 + i * 30, 7, 7, { stroke: MID, width: 1.8 }));
    // 地面
    e.push(ln(0, 810, 1600, 810, { stroke: INK, width: 3.4 }));
    e.push(ln(0, 860, 1600, 860, { stroke: MID, width: 1.8, opacity: 0.6 }));
    // 人物
    if (o.two) {
      e.push.apply(e, figure(720, 810, 300, { sil: true, pose: 'stand' }));
      e.push.apply(e, figure(880, 810, 290, { sil: true, pose: 'stand', coat: true }));
    } else if (o.open) {
      e.push.apply(e, figure(800, 810, 280, { sil: true, pose: 'back', coat: true }));
    } else {
      e.push.apply(e, figure(800, 805, 290, { sil: true, pose: 'back' }));
    }
    e.push.apply(e, shadowPatch(800, 812, 170));
    // 顶灯
    e.push(ln(760, 168, 840, 168, { stroke: INK, width: 6 }));
    e.push(p('M 700 176 L 660 400 M 900 176 L 940 400', { stroke: SOFT, width: 1.2, opacity: 0.3 }));
    return e;
  };

  // 19 公寓：窗、沙发、立灯、站在中央的人
  C.apartment = function (o) {
    o = o || {};
    const e = [];
    // 窗与城市
    e.push.apply(e, skyline(500, { x0: 160, x1: 660, near: false, mid: true, far: true }));
    e.push(rc(160, 180, 500, 330, { stroke: INK, width: 4.4 }));
    e.push(ln(410, 180, 410, 510, { stroke: INK, width: 3 }));
    e.push(ln(160, 380, 660, 380, { stroke: INK, width: 2.6 }));
    e.push(ln(140, 512, 680, 512, { stroke: INK, width: 4 }));
    e.push.apply(e, rain(180, 200, 640, 500, 40, { len: 18, opacity: 0.35 }));
    // 墙 / 地面
    e.push(ln(40, 160, 1560, 160, { stroke: INK, width: 4 }));
    e.push(ln(40, 700, 1560, 700, { stroke: INK, width: 4 }));
    e.push(ln(40, 160, 40, 900, { stroke: INK, width: 4 }));
    e.push(ln(1560, 160, 1560, 900, { stroke: INK, width: 3.6 }));
    for (let i = 0; i < 5; i++) e.push(ln(80 + i * 60, 700, 40 + i * 300, 900, { stroke: SOFT, width: 1.1, opacity: 0.3 }));
    // 沙发
    e.push(p('M 250 700 L 250 560 L 620 560 L 620 700 Z', { stroke: INK, width: 4 }));
    e.push(p('M 290 560 L 290 470 L 580 470 L 580 560', { stroke: INK, width: 4 }));
    e.push(ln(290, 530, 580, 530, { stroke: MID, width: 2 }));
    e.push(ln(430, 470, 430, 700, { stroke: MID, width: 1.6, opacity: 0.6 }));
    e.push(el(250, 560, 60, 18, { stroke: INK, width: 3 }));
    e.push(el(620, 560, 60, 18, { stroke: INK, width: 3 }));
    // 地毯 / 茶几
    e.push(p('M 520 900 L 760 740 L 1320 740 L 1500 900 Z', { stroke: SOFT, width: 1.6, opacity: 0.5 }));
    e.push(el(860, 760, 150, 26, { stroke: INK, width: 3.4 }));
    e.push(ln(790, 772, 790, 850, { stroke: INK, width: 3 }));
    e.push(ln(930, 772, 930, 850, { stroke: INK, width: 3 }));
    e.push(ln(840, 700, 880, 740, { stroke: MID, width: 1.8 }));
    // 立灯
    e.push(ln(1360, 900, 1360, 500, { stroke: INK, width: 4 }));
    e.push(p('M 1290 500 L 1430 500 L 1400 420 L 1320 420 Z', { stroke: INK, width: 3.4 }));
    e.push(p('M 1340 900 L 1380 900', { stroke: INK, width: 4 }));
    e.push(p('M 1310 512 L 1200 900 M 1412 512 L 1520 900', { stroke: SOFT, width: 1.2, dash: '7 10', opacity: 0.35 }));
    // 门厅 / 画 / 植物
    e.push(rc(1140, 380, 160, 300, { stroke: INK, width: 3.6 }));
    e.push(rc(1156, 396, 128, 268, { stroke: MID, width: 1.6, opacity: 0.6 }));
    e.push(ln(1500, 200, 1530, 200, { stroke: INK, width: 3 }));
    e.push(rc(1420, 250, 170, 140, { stroke: INK, width: 3 }));
    e.push(p('M 1440 370 L 1480 300 L 1520 350 L 1550 290', { stroke: MID, width: 1.6 }));
    // 人物
    e.push.apply(e, figure(930, 870, 400, { pose: 'back', coat: true }));
    e.push.apply(e, shadowPatch(930, 878, 220));
    // 窗外闪电般的雨光线
    e.push(p('M 700 170 l -26 40 l 18 4 l -22 36', { stroke: SOFT, width: 1.4, opacity: 0.4 }));
    return e;
  };

  // 20 卧室：床 / 雨窗 / 坐在床沿的人
  C.bedroom = function (o) {
    o = o || {};
    const e = [];
    // 背景墙与窗
    e.push(rc(60, 120, 1480, 620, { stroke: INK, width: 3 }));
    e.push.apply(e, skyline(470, { x0: 120, x1: 620, near: false, mid: true, far: true }));
    e.push(rc(140, 200, 460, 280, { stroke: INK, width: 4 }));
    e.push(ln(370, 200, 370, 480, { stroke: INK, width: 3 }));
    e.push(ln(140, 380, 600, 380, { stroke: INK, width: 2.6 }));
    e.push.apply(e, rain(160, 220, 580, 470, 35, { len: 18, opacity: 0.3 }));
    // 窗帘
    e.push(p('M 60 120 C 120 300, 80 470, 130 690', { stroke: INK, width: 3.2 }));
    e.push(p('M 610 120 C 560 300, 620 470, 560 690', { stroke: INK, width: 3 }));
    e.push(p('M 92 180 C 120 320, 90 480, 112 620', { stroke: MID, width: 1.6, opacity: 0.6 }));
    // 床（透视）
    e.push(p('M 540 620 L 1420 540 L 1500 760 L 620 900 Z', { stroke: INK, width: 4.2 }));
    e.push(p('M 620 900 L 1500 760 L 1500 820 L 700 900 Z', { stroke: INK, width: 3.4 }));
    e.push(p('M 540 620 L 620 900', { stroke: INK, width: 3.4 }));
    e.push(p('M 1420 540 L 1500 760', { stroke: INK, width: 3.4 }));
    // 床垫 / 被子褶皱
    e.push(p('M 760 610 L 1380 556 L 1440 700 L 840 790 Z', { stroke: MID, width: 1.8, opacity: 0.6 }));
    e.push(p('M 900 650 C 1000 610, 1180 600, 1300 620 M 960 700 C 1080 660, 1240 650, 1360 670', { stroke: SOFT, width: 1.6, opacity: 0.6 }));
    // 枕头
    e.push(p('M 690 560 L 900 520 L 950 590 L 740 640 Z', { stroke: INK, width: 3, fill: 'none' }));
    // 床头柜与灯
    e.push(rc(1480, 500, 90, 180, { stroke: INK, width: 3.4 }));
    e.push(p('M 1500 500 L 1520 420 L 1550 500 Z', { stroke: INK, width: 2.6 }));
    e.push(ln(1525, 500, 1525, 470, { stroke: INK, width: 2 }));
    // 床沿的人（坐姿剪影）
    e.push(p('M 640 900 L 640 760 C 650 690, 700 650, 760 650 C 820 650, 850 700, 850 760 L 850 900 Z', { fill: GRAY, stroke: INK, width: 3.6 }));
    e.push(el(748, 606, 58, 66, { fill: GRAY, stroke: INK, width: 3.2 }));
    // 前景床脚与拖鞋
    e.push(p('M 900 900 L 1510 830 L 1540 900 Z', { fill: GRAY, stroke: INK, width: 3 }));
    e.push(p('M 420 900 l 70 -20 l 18 20 l -64 20 Z M 480 872 l 66 -18 l 18 20 l -60 18 Z', { stroke: INK, width: 2.4 }));
    // 月光
    e.push(p('M 600 480 L 900 900 M 620 470 L 1000 900', { stroke: SOFT, width: 1.4, opacity: 0.22 }));
    return e;
  };

  // 21 厨房：冰箱冷光 / 夜里翻找的人
  C.kitchen = function (o) {
    o = o || {};
    const e = [];
    // 墙 / 橱柜
    e.push(ln(40, 120, 1560, 120, { stroke: INK, width: 4 }));
    e.push(ln(40, 620, 1560, 620, { stroke: INK, width: 4 }));
    e.push(rc(680, 190, 420, 220, { stroke: INK, width: 3 }));
    e.push(ln(680, 300, 1100, 300, { stroke: INK, width: 2.2 }));
    // 冰箱（冷光：留白 + 周围暗部排线）
    e.push(rc(120, 260, 320, 500, { stroke: INK, width: 4.4 }));
    e.push(ln(120, 380, 280, 360, { stroke: INK, width: 3 }));
    e.push(p('M 280 360 L 280 260 L 120 260 L 120 380 Z', { fill: 'none', stroke: MID, width: 2 }));
    e.push(p('M 280 360 L 280 900 L 300 900 L 300 380 Z', { fill: GRAY, stroke: INK, width: 2 }));
    // 冰箱内部货架
    for (let i = 0; i < 3; i++) e.push(ln(140, 430 + i * 78, 278, 416 + i * 78, { stroke: MID, width: 2 }));
    e.push(rc(160, 400, 30, 28, { stroke: MID, width: 1.6 }));
    e.push(rc(210, 392, 22, 36, { stroke: MID, width: 1.6 }));
    // 光锥 / 暗部
    e.push(p('M 280 360 L 700 560 L 700 900 L 300 900 Z', { stroke: SOFT, width: 1.2, dash: '7 10', opacity: 0.35 }));
    e.push(p('M 0 900 L 0 120 L 120 120 L 120 900 Z', { fill: 'hatch', stroke: 'none', width: 0, opacity: 0.28 }));
    // 操作台
    e.push(p('M 620 900 L 700 620 L 1560 620 L 1560 900 Z', { stroke: 'none', fill: 'none', width: 0 }));
    e.push(ln(640, 700, 1560, 700, { stroke: INK, width: 4.6 }));
    e.push(ln(640, 700, 640, 900, { stroke: INK, width: 3 }));
    e.push(ln(900, 700, 920, 900, { stroke: MID, width: 2, opacity: 0.7 }));
    // 吊灯 / 灶台 / 瓶
    e.push(ln(980, 120, 980, 300, { stroke: INK, width: 2.2 }));
    e.push(p('M 940 300 L 1020 300 L 1000 340 L 960 340 Z', { stroke: INK, width: 2.6 }));
    e.push(p('M 960 344 L 900 500 M 1000 344 L 1060 500', { stroke: SOFT, width: 1.2, opacity: 0.3 }));
    e.push(el(1220, 686, 52, 8, { stroke: INK, width: 2.6 }));
    e.push(rc(1210, 620, 20, 60, { stroke: INK, width: 2 }));
    e.push(rc(1300, 620, 26, 70, { stroke: INK, width: 2.2 }));
    // 人物背影在冰箱前
    e.push.apply(e, figure(420, 890, 330, { sil: true, pose: 'reach', coat: true }));
    e.push.apply(e, shadowPatch(420, 898, 180));
    // 门口暗部
    e.push(rc(1370, 120, 190, 580, { stroke: INK, width: 2.4, fill: 'crosshatch', opacity: 0.35 }));
    e.push(ln(1370, 700, 1560, 700, { stroke: SOFT, width: 1.6, opacity: 0.5 }));
    return e;
  };

  // 22 浴室镜：镜中脸 / 前景背影 / 蒸汽
  C.bathroomMirror = function (o) {
    o = o || {};
    const e = [];
    // 瓷砖墙
    for (let i = 0; i < 12; i++) e.push(ln(60 + i * 120, 120, 60 + i * 120, 620, { stroke: SOFT, width: 1, opacity: 0.28 }));
    for (let j = 0; j < 5; j++) e.push(ln(60, 160 + j * 100, 1540, 160 + j * 100, { stroke: SOFT, width: 1, opacity: 0.28 }));
    e.push(ln(40, 620, 1560, 620, { stroke: INK, width: 4 }));
    // 镜子
    e.push(rc(560, 150, 660, 420, { stroke: INK, width: 5 }));
    e.push(rc(590, 180, 600, 360, { stroke: MID, width: 1.6, opacity: 0.5 }));
    // 镜中反射的人（正面）
    e.push.apply(e, bust(890, 220, 120, { w: 3 }));
    e.push(p('M 800 420 L 980 420 M 820 400 C 860 380, 920 380, 960 400', { stroke: MID, width: 1.4, opacity: 0.4 }));
    // 雾气 / 水汽
    e.push(p('M 590 190 C 640 160, 700 210, 760 178 C 820 150, 880 200, 940 174', { stroke: PALE, width: 2, opacity: 0.45 }));
    // 洗手台
    e.push(p('M 380 900 L 440 660 L 1280 660 L 1440 900 Z', { stroke: 'none', fill: 'none', width: 0 }));
    e.push(ln(440, 700, 1280, 700, { stroke: INK, width: 4.6 }));
    e.push(p('M 700 700 C 740 760, 900 770, 980 706', { stroke: INK, width: 3.4 }));
    e.push(ln(820, 700, 820, 640, { stroke: INK, width: 4 }));
    e.push(ln(800, 640, 840, 640, { stroke: INK, width: 2.4 }));
    e.push(ln(940, 700, 960, 900, { stroke: MID, width: 2, opacity: 0.6 }));
    // 前景：背对镜头的人
    e.push.apply(e, figure(290, 900, 580, { sil: true, pose: 'back' }));
    e.push(p('M 352 400 C 354 520, 354 680, 348 880', { stroke: PALE, width: 1.6, opacity: 0.25 }));
    // 前景毛巾与杯
    e.push(ln(1480, 300, 1560, 300, { stroke: INK, width: 3 }));
    e.push(p('M 1480 300 L 1470 470 L 1550 470 L 1560 300', { stroke: INK, width: 2.6 }));
    e.push(rc(460, 640, 46, 60, { stroke: INK, width: 2.4 }));
    e.push(ln(478, 620, 486, 640, { stroke: INK, width: 2 }));
    return e;
  };

  // 23 审讯室：顶灯 / 桌子 / 两侧对峙
  C.interrogation = function (o) {
    o = o || {};
    const e = [];
    // 背景墙与百叶窗
    e.push(ln(40, 700, 1560, 700, { stroke: INK, width: 4 }));
    e.push(rc(1080, 190, 420, 300, { stroke: INK, width: 3.4 }));
    for (let i = 0; i < 10; i++) e.push(ln(1090, 210 + i * 28, 1490, 210 + i * 28, { stroke: MID, width: 1.8, opacity: 0.55 }));
    e.push(ln(1080, 490, 1500, 490, { stroke: INK, width: 2.6 }));
    // 暗角
    e.push(p('M 0 900 L 0 0 L 260 0 L 160 900 Z', { fill: 'crosshatch', stroke: 'none', width: 0, opacity: 0.35 }));
    e.push(p('M 1600 900 L 1600 0 L 1400 0 L 1470 900 Z', { fill: 'hatch', stroke: 'none', width: 0, opacity: 0.3 }));
    // 灯
    e.push(ln(760, 0, 760, 150, { stroke: INK, width: 3 }));
    e.push(p('M 690 190 L 830 190 L 805 150 L 715 150 Z', { stroke: INK, width: 3.6 }));
    e.push(p('M 700 194 L 420 700 M 820 194 L 1120 700', { stroke: SOFT, width: 1.4, dash: '8 12', opacity: 0.4 }));
    // 桌子
    e.push(p('M 300 700 L 1300 700 L 1440 830 L 160 830 Z', { stroke: INK, width: 4.6 }));
    e.push(ln(300, 700, 1300, 700, { stroke: INK, width: 4 }));
    e.push(ln(160, 830, 160, 900, { stroke: INK, width: 3.4 }));
    e.push(ln(1440, 830, 1440, 900, { stroke: INK, width: 3.4 }));
    // 桌上物证
    e.push(rc(700, 680, 150, 20, { stroke: INK, width: 2.6 }));
    e.push(el(980, 688, 34, 9, { stroke: INK, width: 2.2 }));
    e.push(ln(990, 688, 1000, 660, { stroke: INK, width: 2 }));
    // 左侧审讯者
    e.push.apply(e, figure(430, 780, 330, { sil: true, pose: 'stand', coat: true }));
    e.push.apply(e, figure(560, 760, 300, { sil: true, pose: 'stand' }));
    // 右侧被审者
    e.push.apply(e, figure(1130, 760, 310, { sil: true, pose: 'sit', w: 4 }));
    e.push.apply(e, shadowPatch(1120, 850, 200));
    // 椅背
    e.push(ln(1030, 760, 1030, 640, { stroke: INK, width: 3 }));
    if (o.one) {
      // 只留一个被审者：移除同伴（简化：遮挡）— 用前景椅背表示空位
      e.push(ln(660, 780, 660, 660, { stroke: INK, width: 3 }));
      e.push(ln(640, 660, 700, 656, { stroke: INK, width: 2.4 }));
    }
    // 前景烟灰缸剪影
    e.push(el(320, 860, 90, 22, { stroke: INK, width: 3.4, fill: GRAY }));
    e.push(el(320, 852, 72, 12, { stroke: INK, width: 1.8 }));
    return e;
  };

  // 24 酒吧：吧台透视 / 酒柜 / 独坐的人
  C.barCounter = function (o) {
    o = o || {};
    const e = [];
    // 后墙酒柜
    e.push(rc(480, 160, 960, 360, { stroke: INK, width: 3.6 }));
    for (let i = 0; i < 3; i++) e.push(ln(500, 280 + i * 90, 1420, 280 + i * 90, { stroke: INK, width: 2.6 }));
    for (let i = 0; i < 28; i++) {
      const shelf = i % 3, x = 520 + (i * 53) % 830;
      const by = 280 + shelf * 90, bh = rr(28, 42);
      e.push(rc(x, by - bh, 16, bh, { rx: 4, stroke: MID, width: 1.4, opacity: 0.8 }));
      e.push(ln(x + 6, by - bh, x + 6, by - bh - 9, { stroke: MID, width: 1.3, opacity: 0.8 }));
      e.push(ln(x + 10, by - bh, x + 10, by - bh - 9, { stroke: MID, width: 1.3, opacity: 0.8 }));
      e.push(ln(x + 4, by - bh - 9, x + 12, by - bh - 9, { stroke: MID, width: 1.2, opacity: 0.8 }));
    }
    // 镜面反光
    e.push(ln(500, 350, 1420, 330, { stroke: SOFT, width: 1.2, opacity: 0.3 }));
    // 吊灯
    e.push(ln(590, 0, 590, 150, { stroke: INK, width: 2 }));
    e.push(p('M 540 190 L 640 190 L 618 150 L 562 150 Z', { stroke: INK, width: 3.2 }));
    e.push(p('M 566 194 L 520 420 M 618 194 L 670 420', { stroke: SOFT, width: 1.2, dash: '8 12', opacity: 0.32 }));
    e.push(ln(1210, 0, 1210, 170, { stroke: INK, width: 1.8 }));
    // 酒保
    e.push.apply(e, figure(940, 660, 320, { sil: true, pose: 'stand', coat: true }));
    // 吧台
    e.push(p('M 0 900 L 60 720 L 1560 640 L 1600 700 L 1600 900 Z', { stroke: INK, width: 4.4 }));
    e.push(ln(60, 720, 1560, 640, { stroke: INK, width: 5 }));
    e.push(ln(60, 740, 1560, 660, { stroke: MID, width: 1.6, opacity: 0.6 }));
    for (let i = 0; i < 4; i++) e.push(ln(120 + i * 370, 748 - i * 12, 120 + i * 370, 900, { stroke: MID, width: 1.4, opacity: 0.32 }));
    // 酒保手臂 / 擦杯
    e.push(ln(1000, 480, 1120, 560, { stroke: INK, width: 3, opacity: 0.9 }));
    e.push(p('M 1090 545 L 1150 590 L 1130 610 L 1075 565 Z', { stroke: INK, width: 2.4 }));
    // 客人（坐）
    e.push.apply(e, figure(1310, 800, 260, { sil: true, pose: 'sit', w: 4 }));
    e.push.apply(e, shadowPatch(1270, 800, 160));
    // 前景杯子 / 烟
    e.push(el(230, 840, 66, 16, { stroke: INK, width: 3 }));
    e.push(ln(250, 840, 210, 780, { stroke: INK, width: 2.6 }));
    e.push(p('M 170 760 C 190 720, 160 690, 180 650', { stroke: SOFT, width: 1.4, opacity: 0.4 }));
    e.push(p('M 300 760 C 320 700, 290 670, 310 620', { stroke: SOFT, width: 1.2, opacity: 0.3 }));
    // 暗角
    e.push(p('M 0 160 L 0 720 L 60 720 L 60 160 Z', { fill: 'hatch', stroke: 'none', width: 0, opacity: 0.3 }));
    e.push(p('M 1560 640 L 1600 700 L 1600 160 L 1560 160 Z', { fill: 'hatch', stroke: 'none', width: 0, opacity: 0.3 }));
    return e;
  };

  // 25 仓库：高空间 / 桁架 / 吊灯 / 远处小人
  C.warehouse = function (o) {
    o = o || {};
    const e = [];
    const vx = 800, vy = 440;
    const lerp = (a, b, t) => a + (b - a) * t;
    // 顶棚桁架
    e.push(ln(0, 100, vx, vy, { stroke: INK, width: 3 }));
    e.push(ln(1600, 100, vx, vy, { stroke: INK, width: 3 }));
    for (let i = 0; i < 3; i++) {
      const t = [0.25, 0.5, 0.75][i];
      e.push(ln(lerp(0, vx, t), lerp(100, vy, t), lerp(1600, vx, t), lerp(100, vy, t), { stroke: MID, width: 2, opacity: 0.7 }));
    }
    // 高窗
    e.push(rc(120, 170, 150, 110, { stroke: INK, width: 3 }));
    e.push(rc(1330, 160, 160, 120, { stroke: INK, width: 3 }));
    e.push(p('M 120 170 L 420 700 L 320 900', { stroke: SOFT, width: 1.2, opacity: 0.18 }));
    e.push(p('M 1490 160 L 1180 700 L 1300 900', { stroke: SOFT, width: 1.2, opacity: 0.18 }));
    // 吊灯
    [560, 900, 1160].forEach(function (x, i) {
      const size = 46 - i * 8;
      e.push(ln(x, i === 1 ? 100 : lerp(100, vy, 0.2), x, 240 + i * 24, { stroke: INK, width: 2 }));
      e.push(p(`M ${x - size} ${240 + i * 24} L ${x + size} ${240 + i * 24} L ${x + size * 0.5} ${210 + i * 20} L ${x - size * 0.5} ${210 + i * 20} Z`, { stroke: INK, width: 2.8 }));
      e.push(p(`M ${x - size * 0.7} ${246 + i * 24} L ${x - size * 1.5} 700 M ${x + size * 0.7} ${246 + i * 24} L ${x + size * 1.5} 700`, { stroke: SOFT, width: 1, dash: '8 12', opacity: 0.25 }));
    });
    // 地面
    e.push(ln(0, 700, vx, vy, { stroke: INK, width: 3.4 }));
    e.push(ln(1600, 700, vx, vy, { stroke: INK, width: 3.4 }));
    for (let i = 0; i < 6; i++) e.push(ln(80 + i * 300, 900, lerp(800, 80 + i * 300, 0.72), 520, { stroke: SOFT, width: 1.1, opacity: 0.3 }));
    // 货箱 / 托盘堆
    e.push(rc(150, 640, 160, 200, { stroke: INK, width: 3.4 }));
    e.push(rc(120, 540, 200, 110, { stroke: INK, width: 3 }));
    e.push(ln(150, 700, 310, 700, { stroke: MID, width: 2 }));
    e.push(ln(150, 760, 310, 760, { stroke: MID, width: 2 }));
    e.push(rc(1260, 660, 220, 180, { stroke: INK, width: 3.4 }));
    e.push(rc(1300, 560, 180, 110, { stroke: INK, width: 3 }));
    e.push(ln(1260, 760, 1480, 760, { stroke: MID, width: 2 }));
    e.push(ln(1280, 620, 1460, 620, { stroke: MID, width: 1.8 }));
    // 人影
    e.push.apply(e, figure(790, 650, 90, { sil: true, pose: 'stand', coat: true }));
    e.push.apply(e, shadowPatch(790, 654, 70));
    // 前景木箱剪影
    e.push(p('M 0 900 L 0 720 L 220 680 L 360 780 L 350 900 Z', { fill: GRAY, stroke: INK, width: 3.4 }));
    e.push(p('M 10 780 L 250 742 M 20 830 L 260 796', { stroke: MID, width: 2, opacity: 0.7 }));
    return e;
  };

  // 26 地下车库：柱列 / 灯管 / 车与影子
  C.garage = function (o) {
    o = o || {};
    const e = [];
    e.push(ln(0, 170, 1600, 150, { stroke: INK, width: 4.4 }));
    e.push(ln(0, 240, 1600, 214, { stroke: MID, width: 2, opacity: 0.7 }));
    // 天花管道
    for (let i = 0; i < 3; i++) e.push(ln(0, 120 + i * 26, 1600, 92 + i * 26, { stroke: MID, width: 1.8, opacity: 0.55 }));
    // 灯管
    e.push(rc(620, 200, 360, 14, { stroke: MID, width: 2, fill: PALE, opacity: 0.55 }));
    e.push(p('M 640 214 L 560 900 M 960 214 L 1050 900', { stroke: SOFT, width: 1.2, opacity: 0.26 }));
    // 柱列
    [180, 620, 1060, 1450].forEach(function (x, i) {
      const w = 95 - i * 10;
      e.push(rc(x, 250 + i * 8, w, 640 - i * 8, { stroke: INK, width: 3.4 }));
      e.push(ln(x + 10, 300 + i * 8, x + 10, 880, { stroke: MID, width: 1.2, opacity: 0.4 }));
      // 柱上警示斜线
      for (let k = 0; k < 3; k++) e.push(ln(x, 820 - k * 22, x + w, 840 - k * 22, { stroke: MID, width: 3, opacity: 0.5 }));
    });
    // 地面
    e.push(ln(0, 900, 1600, 900, { stroke: INK, width: 3.4 }));
    for (let i = 0; i < 7; i++) e.push(ln(0, 820 + i * 12, 1600, 812 + i * 12, { stroke: SOFT, width: 1.1, opacity: 0.3 }));
    e.push(el(820, 878, 130, 16, { stroke: MID, width: 1.6, opacity: 0.45 }));
    e.push(el(420, 860, 80, 12, { stroke: MID, width: 1.4, opacity: 0.4 }));
    // 车
    e.push.apply(e, carSide(1120, 840, 760, {}));
    // 柱子后的人影
    e.push.apply(e, figure(760, 860, 280, { sil: true, pose: 'stand', coat: true }));
    e.push(p('M 700 760 L 820 744', { stroke: MID, width: 2, dash: '10 8', opacity: 0.5 }));
    // 前景柱
    e.push(p('M 0 900 L 0 300 L 120 324 L 140 900 Z', { fill: GRAY, stroke: INK, width: 3.2 }));
    e.push(p('M 60 340 L 60 900', { stroke: MID, width: 2, opacity: 0.6 }));
    return e;
  };

  // 27 教室：课桌透视 / 黑板 / 靠窗的光
  C.classroom = function (o) {
    o = o || {};
    const e = [];
    // 后墙
    e.push(ln(60, 150, 1540, 150, { stroke: INK, width: 4 }));
    e.push(rc(200, 210, 780, 280, { stroke: INK, width: 4.4 }));
    e.push(rc(220, 230, 740, 240, { stroke: MID, width: 1.8, opacity: 0.6 }));
    for (let i = 0; i < 4; i++) e.push(ln(260, 290 + i * 42, 800, 284 + i * 42, { stroke: SOFT, width: 2, opacity: 0.5 }));
    e.push(tx(860, 470, 'A', { size: 30, fill: MID }));
    // 窗
    e.push(rc(1090, 190, 380, 320, { stroke: INK, width: 4 }));
    e.push(ln(1280, 190, 1280, 510, { stroke: INK, width: 3 }));
    e.push(ln(1090, 350, 1470, 350, { stroke: INK, width: 2.6 }));
    e.push(p('M 1500 510 L 1560 900 M 1080 520 L 900 900', { stroke: SOFT, width: 1.2, opacity: 0.2 }));
    // 钟
    e.push.apply(e, clockFace(470, 110, 44, 7, 40));
    // 地板
    e.push(ln(60, 700, 1540, 700, { stroke: INK, width: 3.4 }));
    // 课桌（三排）
    const desk = (x, y, w, h, dk) => {
      const out = [ln(x, y, x + w, y, { stroke: dk || INK, width: 3.4 }), ln(x, y + h, x + w, y + h, { stroke: dk || INK, width: 2.6 })];
      out.push(ln(x, y, x, y + h, { stroke: dk || INK, width: 2.4 }), ln(x + w, y, x + w, y + h, { stroke: dk || INK, width: 2.4 }));
      out.push(ln(x + 20, y + h, x + 20, Math.min(884, y + h + 90), { stroke: dk || INK, width: 2.6 }), ln(x + w - 20, y + h, x + w - 20, Math.min(884, y + h + 90), { stroke: dk || INK, width: 2.6 }));
      return out;
    };
    e.push.apply(e, desk(160, 560, 320, 46));
    e.push.apply(e, desk(620, 560, 320, 46));
    e.push.apply(e, desk(1080, 560, 320, 46));
    e.push.apply(e, desk(340, 660, 380, 56));
    e.push.apply(e, desk(920, 660, 380, 56));
    e.push.apply(e, desk(560, 800, 460, 64));
    // 学生背影（坐在桌后）
    [250, 720, 1180].forEach(function (x, i) {
      e.push(el(x, 520 + i * 4, 30, 34, { fill: GRAY, stroke: INK, width: 2 }));
      e.push(p(`M ${x - 60} 610 C ${x - 45} 560, ${x - 20} 548, ${x} 548 C ${x + 24} 548, ${x + 50} 560, ${x + 62} 610`, { fill: GRAY, stroke: INK, width: 2.4 }));
    });
    // 教师
    e.push.apply(e, figure(880, 720, 300, { sil: true, pose: 'stand', coat: true }));
    e.push(p('M 950 470 L 1030 440', { stroke: INK, width: 2.6 }));
    if (o.two) {
      e.push(el(560, 590, 34, 38, { fill: GRAY, stroke: INK, width: 2 }));
      e.push(el(760, 570, 34, 38, { fill: GRAY, stroke: INK, width: 2 }));
    }
    // 前景课桌剪影
    e.push(p('M 0 900 L 0 760 L 380 720 L 470 810 L 470 900 Z', { fill: GRAY, stroke: INK, width: 3.2 }));
    e.push(ln(40, 790, 330, 756, { stroke: MID, width: 2, opacity: 0.6 }));
    return e;
  };

  // 28 办公室：百叶窗 / 办公桌 / 屏幕冷光
  C.officeRoom = function (o) {
    o = o || {};
    const e = [];
    // 墙
    e.push(ln(40, 130, 1560, 130, { stroke: INK, width: 4 }));
    // 百叶窗
    e.push(rc(540, 170, 640, 330, { stroke: INK, width: 4 }));
    for (let i = 0; i < 12; i++) e.push(ln(550, 190 + i * 26, 1170, 188 + i * 26, { stroke: MID, width: 1.8, opacity: 0.6 }));
    e.push(ln(160, 500, 1440, 500, { stroke: INK, width: 3.4 }));
    // 夜景透窗外
    e.push.apply(e, skyline(480, { x0: 560, x1: 1160, near: false, mid: true, far: false }));
    // 桌面 / 椅子
    e.push(p('M 220 700 L 1400 700 L 1560 900 L 60 900 Z', { stroke: INK, width: 4 }));
    e.push(ln(220, 700, 1400, 700, { stroke: INK, width: 4.6 }));
    e.push(ln(220, 700, 220, 900, { stroke: INK, width: 3 }));
    e.push(ln(1400, 700, 1400, 900, { stroke: INK, width: 3 }));
    // 椅背（前景）
    e.push(p('M 700 900 L 720 760 L 1000 752 L 1030 900 Z', { fill: GRAY, stroke: INK, width: 3.4 }));
    e.push(ln(760, 790, 960, 782, { stroke: MID, width: 2, opacity: 0.7 }));
    // 显示器
    e.push(rc(330, 560, 200, 130, { stroke: INK, width: 3.4 }));
    e.push(rc(342, 572, 176, 106, { stroke: PALE, width: 2, fill: 'none', opacity: 0.8 }));
    e.push(ln(430, 690, 430, 720, { stroke: INK, width: 3 }));
    e.push(ln(390, 720, 470, 720, { stroke: INK, width: 3 }));
    e.push(p('M 342 572 L 300 500 M 518 572 L 560 500', { stroke: SOFT, width: 1.2, opacity: 0.35 }));
    // 台灯
    e.push(ln(1300, 700, 1300, 590, { stroke: INK, width: 3 }));
    e.push(p('M 1250 590 L 1350 590 L 1320 530 L 1280 530 Z', { stroke: INK, width: 2.8 }));
    // 文件
    e.push(p('M 620 690 L 780 682 L 800 700 L 640 710 Z', { stroke: MID, width: 2 }));
    // 人物
    if (o.dialogue) {
      e.push.apply(e, figure(420, 880, 360, { sil: true, pose: 'stand', coat: true }));
      e.push.apply(e, figure(1150, 860, 380, { sil: true, pose: 'stand' }));
    } else {
      e.push.apply(e, figure(1000, 880, 400, { sil: true, pose: 'back', coat: true }));
      e.push.apply(e, shadowPatch(1000, 888, 240));
    }
    // 前景文件与杯
    e.push(el(200, 840, 40, 12, { stroke: INK, width: 2.4 }));
    e.push(rc(160, 780, 90, 40, { stroke: INK, width: 2, rx: 2 }));
    return e;
  };

  // 29 阳台：栏杆 / 城市 / 夜风
  C.balcony = function (o) {
    o = o || {};
    const e = [];
    e.push.apply(e, skyline(600, { near: false, mid: true, far: true }));
    e.push(ln(40, 596, 1560, 596, { stroke: GRAY, width: 2.4 }));
    // 建筑立面
    e.push(p('M 0 0 L 0 900 L 200 900 L 200 140 L 1400 140 L 1400 900 L 1600 900 L 1600 0 Z', { stroke: INK, width: 3 }));
    e.push(ln(260, 140, 260, 700, { stroke: INK, width: 3 }));
    e.push(ln(1340, 140, 1340, 700, { stroke: INK, width: 3 }));
    // 栏杆
    e.push(ln(40, 690, 1560, 660, { stroke: INK, width: 6 }));
    e.push(ln(40, 760, 1560, 730, { stroke: INK, width: 3 }));
    for (let i = 0; i < 17; i++) e.push(ln(60 + i * 94, 690 - i * 1.8, 60 + i * 94, 900, { stroke: INK, width: 2.6 }));
    // 人物
    e.push.apply(e, figure(720, 700, 300, { pose: 'back', coat: true }));
    e.push.apply(e, shadowPatch(720, 706, 150));
    // 门内暖光
    e.push(rc(140, 300, 380, 400, { stroke: INK, width: 3.4 }));
    e.push(rc(160, 320, 340, 360, { stroke: PALE, width: 2, opacity: 0.5 }));
    e.push(p('M 540 320 L 700 220', { stroke: SOFT, width: 1.6, opacity: 0.4 }));
    // 窗帘
    e.push(p('M 520 160 C 460 320, 520 520, 470 700', { stroke: INK, width: 3 }));
    e.push(p('M 560 170 C 520 340, 570 540, 540 700', { stroke: MID, width: 1.6, opacity: 0.6 }));
    // 绿植
    e.push(rc(1400, 740, 100, 130, { stroke: INK, width: 3.2 }));
    e.push(p('M 1450 740 C 1400 660, 1420 600, 1440 560 M 1450 740 C 1510 650, 1500 590, 1480 550 M 1450 740 C 1460 660, 1460 610, 1450 580', { stroke: INK, width: 2.6 }));
    // 灯串
    e.push(p('M 0 240 C 300 340, 600 330, 900 250 C 1200 180, 1400 220, 1600 300', { stroke: INK, width: 1.8 }));
    for (let i = 0; i < 10; i++) {
      const t = i / 9;
      const x = 60 + t * 1480, y = 240 + Math.sin(t * Math.PI * 2) * 60 - t * 30;
      e.push(el(x, y + 12, 7, 10, { stroke: SOFT, width: 1.6, fill: 'none', opacity: 0.7 }));
    }
    return e;
  };

  // 30 公交站：雨棚 / 长椅 / 雨夜等车
  C.busStop = function (o) {
    o = o || {};
    const e = [];
    e.push.apply(e, skyline(560, { near: false, mid: true, far: true }));
    e.push(ln(0, 560, 1600, 560, { stroke: GRAY, width: 2.4 }));
    // 街道远景
    e.push(p('M 0 900 L 0 560 L 600 560 L 700 900 Z', { stroke: 'none', fill: 'none', width: 0 }));
    e.push(ln(0, 760, 900, 620, { stroke: SOFT, width: 2, opacity: 0.4 }));
    // 雨棚
    e.push(ln(880, 380, 1580, 330, { stroke: INK, width: 5 }));
    e.push(ln(880, 420, 1580, 370, { stroke: INK, width: 3 }));
    e.push(ln(920, 400, 920, 900, { stroke: INK, width: 4 }));
    e.push(ln(1520, 360, 1520, 780, { stroke: INK, width: 4 }));
    e.push(rc(990, 430, 450, 300, { stroke: MID, width: 2, opacity: 0.55 }));
    e.push(ln(1215, 430, 1215, 730, { stroke: MID, width: 1.6, opacity: 0.45 }));
    // 长椅
    e.push(ln(1010, 700, 1400, 690, { stroke: INK, width: 4.4 }));
    e.push(ln(1010, 730, 1400, 720, { stroke: INK, width: 3 }));
    e.push(ln(1040, 730, 1040, 810, { stroke: INK, width: 3 }));
    e.push(ln(1360, 720, 1360, 800, { stroke: INK, width: 3 }));
    // 站牌
    e.push(ln(760, 900, 760, 430, { stroke: INK, width: 4.4 }));
    e.push(rc(700, 430, 120, 80, { stroke: INK, width: 3, rx: 4 }));
    e.push(tx(760, 478, 'BUS', { anchor: 'middle', size: 24, fill: GRAY }));
    e.push(ln(720, 496, 800, 496, { stroke: MID, width: 1.8 }));
    // 候车人
    e.push.apply(e, figure(1120, 820, 300, { sil: true, pose: 'sit', w: 4 }));
    e.push.apply(e, figure(900, 840, 330, { sil: true, pose: 'stand', coat: true }));
    e.push.apply(e, shadowPatch(960, 846, 220));
    // 远处驶来的公交灯
    e.push(el(430, 690, 42, 20, { stroke: PALE, width: 2, opacity: 0.7 }));
    e.push(el(500, 690, 42, 20, { stroke: PALE, width: 2, opacity: 0.7 }));
    e.push(p('M 400 690 L 160 640 L 160 760 L 400 710 Z', { fill: 'crosshatch', stroke: SOFT, width: 1.2, opacity: 0.3 }));
    // 地面反光
    e.push(ln(460, 800, 680, 782, { stroke: PALE, width: 3, opacity: 0.25 }));
    e.push(ln(520, 840, 760, 818, { stroke: SOFT, width: 2, opacity: 0.3 }));
    // 雨
    e.push.apply(e, rain(60, 120, 1560, 840, 90, { len: 32, opacity: 0.42 }));
    // 前景路肩
    e.push(ln(0, 884, 1600, 858, { stroke: INK, width: 5 }));
    return e;
  };

  // 31 便利店：玻璃橱窗 / 店内冷光 / 门外的人
  C.storefront = function (o) {
    o = o || {};
    const e = [];
    // 夜街底色
    e.push(ln(60, 120, 1540, 120, { stroke: INK, width: 3 }));
    // 店面结构
    e.push(rc(240, 220, 1120, 480, { stroke: INK, width: 5 }));
    e.push(rc(260, 240, 1080, 440, { stroke: MID, width: 2, opacity: 0.5 }));
    // 店内货架
    for (let i = 0; i < 4; i++) e.push(ln(300, 320 + i * 82, 1080, 310 + i * 82, { stroke: MID, width: 1.8, opacity: 0.7 }));
    for (let i = 0; i < 18; i++) {
      const x = 320 + (i * 47) % 720, y = 300 + (i % 4) * 82;
      e.push(rc(x, y, rr(16, 26), rr(24, 38), { stroke: SOFT, width: 1.4, opacity: 0.7 }));
    }
    // 冷柜
    e.push(rc(300, 370, 160, 250, { stroke: INK, width: 3 }));
    e.push(ln(300, 450, 460, 450, { stroke: MID, width: 2 }));
    e.push(ln(300, 530, 460, 530, { stroke: MID, width: 2 }));
    // 收银台 / 店员
    e.push(ln(880, 610, 1240, 600, { stroke: INK, width: 4 }));
    e.push(ln(880, 610, 880, 700, { stroke: INK, width: 3 }));
    e.push.apply(e, figure(1080, 690, 240, { sil: true, pose: 'stand', coat: true }));
    // 招牌
    e.push(rc(300, 140, 1000, 70, { stroke: INK, width: 4 }));
    e.push(tx(800, 190, '24H', { anchor: 'middle', size: 34, fill: GRAY }));
    e.push(ln(560, 176, 620, 176, { stroke: MID, width: 2 }));
    e.push(ln(980, 176, 1040, 176, { stroke: MID, width: 2 }));
    // 玻璃门上的反光
    e.push(p('M 300 250 L 520 680 M 520 250 L 760 680', { stroke: PALE, width: 1.6, opacity: 0.22 }));
    e.push(p('M 780 250 L 1020 680 M 1000 250 L 1240 680', { stroke: PALE, width: 1.6, opacity: 0.18 }));
    // 门外的人
    e.push.apply(e, figure(760, 830, 340, { pose: 'back', coat: true }));
    e.push.apply(e, shadowPatch(760, 836, 200));
    // 人行道
    e.push(ln(0, 760, 240, 720, { stroke: INK, width: 3 }));
    e.push(ln(1360, 690, 1600, 660, { stroke: INK, width: 3 }));
    for (let i = 0; i < 5; i++) e.push(ln(60 + i * 120, 900, 220 + i * 60, 700, { stroke: SOFT, width: 1.1, opacity: 0.3 }));
    // 雨
    e.push.apply(e, rain(60, 120, 1540, 760, 60, { len: 28, opacity: 0.35 }));
    return e;
  };

  // 32 隧道出口：纵深框架 / 尽头白光
  C.tunnelExit = function (o) {
    o = o || {};
    const e = [];
    const vx = 800, vy = 430;
    // 隧道框架
    [0, 0.28, 0.52, 0.72].forEach(function (t, i) {
      const x1 = 0 + (vx - 0) * t, x2 = 1600 + (vx - 1600) * t;
      const y1 = 0 + (vy - 0) * t, y2 = 900 + (vy - 900) * t;
      e.push(rc(x1, y1, x2 - x1, y2 - y1, { stroke: i === 0 ? GRAY : MID, width: 3.4 - i * 0.4, opacity: 0.9 - i * 0.12 }));
    });
    // 出口
    e.push(rc(730, 370, 140, 120, { stroke: PALE, width: 2, opacity: 0.8 }));
    // 车道线
    e.push(ln(700, 900, 790, 490, { stroke: INK, width: 3.4 }));
    e.push(ln(860, 900, 810, 490, { stroke: INK, width: 3.4 }));
    for (let i = 0; i < 5; i++) e.push(ln(800, 900 - i * 90, 800, 870 - i * 90, { stroke: INK, width: 6, opacity: 0.7 }));
    // 顶灯
    for (let i = 0; i < 4; i++) {
      const t = i / 4;
      e.push(rc(lerpNum(0, 760, t + 0.1), lerpNum(30, 380, t + 0.1), lerpNum(260, 80, t + 0.1), 10, { stroke: MID, width: 1.6, fill: PALE, opacity: 0.5 }));
    }
    // 前车
    e.push(p('M 745 620 L 745 580 C 750 560, 780 552, 800 552 C 820 552, 850 560, 855 580 L 855 620 Z', { fill: GRAY, stroke: INK, width: 2.6 }));
    e.push(el(760, 600, 9, 6, { stroke: PALE, width: 2, opacity: 0.8 }));
    e.push(el(840, 600, 9, 6, { stroke: PALE, width: 2, opacity: 0.8 }));
    // 光晕
    e.push(p('M 730 370 L 560 260 M 870 370 L 1040 260 M 730 490 L 560 620 M 870 490 L 1040 620', { stroke: SOFT, width: 1.4, opacity: 0.35 }));
    // 侧墙暗部
    e.push(p('M 0 0 L 0 900 L 420 900 L 420 420 Z', { fill: 'hatch', stroke: 'none', width: 0, opacity: 0.26 }));
    e.push(p('M 1600 0 L 1600 900 L 1180 900 L 1180 420 Z', { fill: 'hatch', stroke: 'none', width: 0, opacity: 0.26 }));
    return e;
  };

  // 33 扶梯：对角线 / 上下人流
  C.escalator = function (o) {
    o = o || {};
    const e = [];
    // 商场背景
    e.push(ln(0, 180, 1600, 180, { stroke: INK, width: 4 }));
    e.push(rc(80, 220, 240, 380, { stroke: MID, width: 2, opacity: 0.5 }));
    e.push(rc(1280, 200, 260, 400, { stroke: MID, width: 2, opacity: 0.5 }));
    // 上行扶梯
    e.push(p('M 120 900 L 1080 300 L 1140 340 L 200 900 Z', { stroke: INK, width: 4 }));
    e.push(p('M 140 860 L 1090 288 L 1120 310 L 180 880 Z', { stroke: MID, width: 2, opacity: 0.7 }));
    for (let i = 0; i < 12; i++) {
      const t = i / 12;
      e.push(ln(160 + t * 900, 870 - t * 560, 250 + t * 860, 890 - t * 560, { stroke: INK, width: 2.2 }));
    }
    // 下行扶梯
    e.push(p('M 520 260 L 1480 900 L 1420 900 L 460 300 Z', { stroke: INK, width: 4 }));
    e.push(p('M 540 280 L 1460 880 L 1400 884 L 490 292 Z', { stroke: MID, width: 2, opacity: 0.6 }));
    for (let i = 0; i < 11; i++) {
      const t = i / 11;
      e.push(ln(555 + t * 880, 300 + t * 560, 500 + t * 900, 330 + t * 550, { stroke: INK, width: 2 }));
    }
    // 扶手立柱 / 玻璃
    e.push(ln(1080, 300, 1080, 190, { stroke: INK, width: 3 }));
    e.push(ln(520, 260, 520, 150, { stroke: INK, width: 3 }));
    e.push(p('M 200 900 L 200 380 M 1400 900 L 1400 300', { stroke: INK, width: 3 }));
    // 人
    e.push.apply(e, figure(700, 660, 230, { sil: true, pose: 'stand', coat: true }));
    e.push.apply(e, figure(430, 790, 210, { sil: true, pose: 'stand' }));
    e.push.apply(e, figure(1060, 600, 180, { sil: true, pose: 'back' }));
    // 前景扶手
    e.push(p('M 0 900 L 460 560', { stroke: GRAY, width: 10 }));
    e.push(p('M 0 900 L 470 590', { stroke: INK, width: 3 }));
    return e;
  };

  // 34 夜泳池：水面 / 扶梯 / 岸边的人
  C.poolNight = function (o) {
    o = o || {};
    const e = [];
    // 池边建筑
    e.push(rc(60, 100, 1480, 460, { stroke: INK, width: 3 }));
    for (let i = 0; i < 6; i++) e.push(rc(160 + i * 230, 160, 120, 200, { stroke: MID, width: 2, opacity: 0.55 }));
    e.push(ln(60, 560, 1540, 560, { stroke: INK, width: 4 }));
    // 泳池边
    e.push(ln(60, 640, 1540, 640, { stroke: INK, width: 5 }));
    e.push(ln(60, 620, 1540, 620, { stroke: MID, width: 1.8, opacity: 0.6 }));
    // 水面
    e.push(rc(60, 640, 1480, 220, { stroke: MID, width: 1.6, opacity: 0.6 }));
    for (let i = 0; i < 16; i++) {
      const y = 660 + i * 12, x = rr(80, 1300), w = rr(70, 320);
      e.push(ln(x, y, x + w, y + rr(-3, 3), { stroke: rnd() < 0.5 ? SOFT : MID, width: rr(1, 2), opacity: rr(0.25, 0.55) }));
    }
    // 泳道线
    e.push(ln(80, 680, 1500, 672, { stroke: MID, width: 1.8, dash: '10 14', opacity: 0.6 }));
    e.push(ln(80, 780, 1500, 772, { stroke: MID, width: 1.8, dash: '10 14', opacity: 0.6 }));
    // 扶梯
    e.push(p('M 1240 640 L 1240 500 C 1240 478, 1276 478, 1276 500 L 1276 640', { stroke: INK, width: 3.4 }));
    e.push(p('M 1300 640 L 1300 520 C 1300 500, 1336 500, 1336 520 L 1336 640', { stroke: INK, width: 3.4 }));
    e.push(ln(1258, 530, 1318, 530, { stroke: INK, width: 2.4 }));
    // 岸边坐着的人
    e.push.apply(e, figure(450, 640, 240, { sil: true, pose: 'sit', w: 4 }));
    e.push(p('M 380 640 C 380 700, 440 700, 440 640', { stroke: INK, width: 2.6 }));
    // 水面倒影
    e.push.apply(e, reflectStreaks(320, 1400, 650, 800, 8));
    // 前景池沿
    e.push(p('M 0 900 L 0 820 L 1600 790 L 1600 900 Z', { fill: GRAY, stroke: INK, width: 3 }));
    e.push(ln(80, 850, 1520, 820, { stroke: MID, width: 2, opacity: 0.7 }));
    // 夜风
    e.push(p('M 200 300 C 400 280, 520 330, 700 300', { stroke: SOFT, width: 1.4, opacity: 0.35 }));
    return e;
  };

  // 35 门框逆光剪影：全片最重要的空镜之一
  C.doorSilhouette = function (o) {
    o = o || {};
    const e = [];
    e.push(ln(0, 100, 1560, 100, { stroke: INK, width: 4 }));
    e.push(ln(0, 100, 0, 800, { stroke: INK, width: 3 }));
    e.push(ln(1560, 100, 1560, 800, { stroke: INK, width: 3 }));
    e.push(ln(0, 800, 1560, 800, { stroke: INK, width: 3 }));
    e.push(p('M 0 100 L 0 800 L 120 800 L 120 100 Z', { fill: 'hatch', stroke: 'none', width: 0, opacity: 0.18 }));
    e.push(p('M 1560 100 L 1560 800 L 1440 800 L 1440 100 Z', { fill: 'hatch', stroke: 'none', width: 0, opacity: 0.18 }));
    for (let i = 0; i < 7; i++) e.push(p(`M ${70 + i * 36} 240 l 24 54`, { stroke: MID, width: 1.2, opacity: 0.4 }));
    for (let i = 0; i < 7; i++) e.push(p(`M ${1330 + i * 30} 300 l 22 50`, { stroke: MID, width: 1.2, opacity: 0.4 }));
    e.push(rc(600, 170, 390, 630, { stroke: INK, width: 6 }));
    e.push(rc(632, 200, 326, 570, { stroke: MID, width: 1.8, opacity: 0.55 }));
    e.push(p('M 600 170 L 560 150 L 560 800 L 600 800', { stroke: GRAY, width: 3 }));
    e.push(p('M 990 170 L 1030 150 L 1030 800 L 990 800', { stroke: GRAY, width: 3 }));
    e.push(ln(598, 280, 618, 280, { stroke: MID, width: 2.2 }));
    e.push(ln(598, 520, 618, 520, { stroke: MID, width: 2.2 }));
    e.push(ln(560, 800, 632, 800, { stroke: INK, width: 4 }));
    e.push(ln(958, 800, 1030, 800, { stroke: INK, width: 4 }));
    e.push(p('M 632 200 L 560 60 M 958 200 L 1030 60', { stroke: PALE, width: 2, opacity: 0.4 }));
    e.push(p('M 632 760 L 480 900 M 958 760 L 1110 900', { stroke: SOFT, width: 1.6, opacity: 0.4 }));
    e.push(p('M 600 800 L 470 900 L 0 900 L 0 800 Z', { fill: 'crosshatch', stroke: 'none', width: 0, opacity: 0.25 }));
    e.push(p('M 990 800 L 1120 900 L 1560 900 L 1560 800 Z', { fill: 'crosshatch', stroke: 'none', width: 0, opacity: 0.25 }));
    e.push(ln(600, 800, 470, 900, { stroke: MID, width: 2, opacity: 0.6 }));
    e.push(ln(990, 800, 1120, 900, { stroke: MID, width: 2, opacity: 0.6 }));
    for (let i = 0; i < 6; i++) e.push(ln(600 + i * 9, 832 + i * 12, 990 - i * 9, 832 + i * 12, { stroke: SOFT, width: 0.9, opacity: 0.3 }));
    e.push.apply(e, figure(795, 800, 470, { sil: true, pose: 'back', coat: true }));
    e.push(p('M 733 545 C 731 645, 733 745, 737 792 M 857 545 C 859 645, 857 745, 853 792', { stroke: PALE, width: 1.6, opacity: 0.3 }));
    e.push(p('M 744 472 C 760 434, 840 434, 846 472', { stroke: PALE, width: 1.4, opacity: 0.28 }));
    e.push.apply(e, shadowPatch(795, 804, 190));
    e.push(p('M 0 900 L 0 470 C 40 500, 72 560, 80 640 C 88 720, 84 810, 96 900 Z', { fill: GRAY, stroke: INK, width: 3 }));
    e.push(p('M 20 520 C 50 640, 46 760, 58 880', { stroke: MID, width: 2, opacity: 0.5 }));
    e.push(p('M 0 470 C 30 500, 55 550, 62 620', { stroke: PALE, width: 1.6, opacity: 0.3 }));
    for (let i = 0; i < 16; i++) e.push(el(rr(590, 1000), rr(220, 780), rr(1.2, 3), rr(1.2, 3), { fill: PALE, stroke: 'none', width: 0, opacity: rr(0.3, 0.75) }));
    return e;
  };

  // 36 推门而入：门扇斜开 / 光切进暗房
  C.doorwayEnter = function (o) {
    o = o || {};
    const e = [];
    // 暗房内部
    e.push(ln(60, 130, 1560, 110, { stroke: INK, width: 3.4 }));
    e.push(ln(60, 760, 1560, 744, { stroke: INK, width: 3.4 }));
    e.push(rc(1140, 220, 330, 300, { stroke: MID, width: 2, opacity: 0.5 }));
    e.push(ln(1160, 300, 1450, 300, { stroke: SOFT, width: 1.4, opacity: 0.4 }));
    // 门扇（斜开）
    e.push(p('M 200 160 L 420 200 L 420 760 L 200 740 Z', { stroke: INK, width: 4.4 }));
    e.push(p('M 240 190 L 240 745 M 300 200 L 300 750', { stroke: MID, width: 1.6, opacity: 0.5 }));
    // 门外亮部
    e.push(rc(150, 170, 160, 570, { stroke: PALE, width: 2, opacity: 0.8 }));
    // 光楔
    e.push(p('M 420 740 L 760 900 L 420 900 Z', { fill: 'crosshatch', stroke: SOFT, width: 1, opacity: 0.22 }));
    e.push(p('M 360 200 L 640 110 M 420 420 L 720 330', { stroke: SOFT, width: 1.2, opacity: 0.3 }));
    // 进门的人
    e.push.apply(e, figure(570, 840, 430, { sil: true, pose: 'walk', coat: true }));
    e.push(p('M 500 470 C 520 420, 610 404, 650 440', { stroke: PALE, width: 1.8, opacity: 0.3 }));
    e.push.apply(e, shadowPatch(570, 846, 240));
    // 暗房家具剪影
    e.push(p('M 980 900 L 980 780 L 1250 760 L 1350 820 L 1340 900 Z', { fill: GRAY, stroke: INK, width: 3 }));
    e.push(ln(1080, 760, 1100, 660, { stroke: INK, width: 3 }));
    e.push(ln(1080, 660, 1180, 648, { stroke: INK, width: 3 }));
    // 前景椅背
    e.push(p('M 1420 900 L 1420 680 L 1560 660 L 1560 900 Z', { fill: GRAY, stroke: INK, width: 3 }));
    return e;
  };

  // 37 人潮中的主角：逆光人群 / 站厅
  C.crowdStation = function (o) {
    o = o || {};
    const e = [];
    // 站厅大窗
    e.push(rc(60, 140, 1480, 460, { stroke: INK, width: 4 }));
    for (let i = 0; i < 6; i++) e.push(ln(60 + i * 296, 140, 60 + i * 296, 600, { stroke: INK, width: 3.2 }));
    e.push(ln(60, 370, 1540, 370, { stroke: INK, width: 2.4 }));
    e.push(ln(60, 600, 1540, 600, { stroke: INK, width: 3.4 }));
    // 窗格光
    for (let i = 0; i < 6; i++) e.push(p(`M ${90 + i * 296} 380 L ${90 + i * 296} 588`, { stroke: SOFT, width: 1.2, opacity: 0.35 }));
    // 背景人群
    e.push.apply(e, crowdRow(650, [[120, 110], [220, 100], [330, 116], [440, 104], [520, 96], [620, 112], [980, 100], [1080, 112], [1180, 96], [1290, 116], [1400, 104], [1510, 110]]));
    // 中景人群
    e.push.apply(e, crowdRow(740, [[180, 190], [300, 210], [430, 180], [590, 200], [1050, 186], [1230, 210], [1390, 192]]));
    // 主角：稍大，亮边
    e.push.apply(e, figure(800, 830, 390, { sil: true, pose: 'back', coat: true }));
    e.push(p('M 738 470 C 748 420, 852 420, 862 470', { stroke: PALE, width: 2, opacity: 0.4 }));
    e.push(p('M 704 540 C 710 640, 712 740, 708 820 M 896 540 C 892 640, 890 740, 894 820', { stroke: PALE, width: 1.4, opacity: 0.25 }));
    // 前景人头（失焦）
    e.push(p('M 0 900 L 0 790 C 60 720, 180 706, 270 780 C 312 818, 330 860, 334 900 Z', { fill: GRAY, stroke: INK, width: 2 }));
    e.push(p('M 1600 900 L 1600 786 C 1540 718, 1420 708, 1330 780 C 1288 818, 1268 860, 1264 900 Z', { fill: GRAY, stroke: INK, width: 2 }));
    e.push(p('M 0 900 L 0 820 C 60 780, 160 780, 240 900 Z', { fill: GRAY, stroke: INK, width: 2 }));
    e.push(p('M 1600 900 L 1600 810 C 1540 770, 1440 780, 1340 900 Z', { fill: GRAY, stroke: INK, width: 2 }));
    // 地面
    e.push(ln(60, 760, 1540, 744, { stroke: MID, width: 1.6, opacity: 0.4 }));
    return e;
  };

  // 38 空房窗帘：风、椅子、浮尘（极简空镜）
  C.emptyRoomCurtain = function (o) {
    o = o || {};
    const e = [];
    // 窗
    e.push(rc(480, 150, 700, 470, { stroke: INK, width: 4.4 }));
    e.push(ln(830, 150, 830, 620, { stroke: INK, width: 3 }));
    e.push(ln(480, 380, 1180, 380, { stroke: INK, width: 2.6 }));
    e.push.apply(e, skyline(620, { x0: 500, x1: 1160, near: false, mid: true, far: true }));
    // 吹起的窗帘
    e.push(p('M 1180 150 C 1050 240, 1130 360, 980 430 C 860 486, 900 560, 780 610 L 1180 620 Z', { stroke: INK, width: 3.4, fill: 'none' }));
    e.push(p('M 1180 160 C 1080 250, 1150 340, 1030 420 C 930 486, 990 540, 880 600', { stroke: MID, width: 1.8, opacity: 0.65 }));
    e.push(p('M 1120 190 C 1040 280, 1080 360, 980 460', { stroke: SOFT, width: 1.4, opacity: 0.5 }));
    // 风线
    e.push(p('M 520 700 C 700 690, 900 690, 1120 676', { stroke: SOFT, width: 1.2, opacity: 0.4 }));
    // 空椅
    e.push.apply(e, chair(760, 800, 260, {}));
    e.push(p('M 620 800 L 900 792', { stroke: SOFT, width: 1.2, opacity: 0.4 }));
    // 地板
    e.push(ln(60, 780, 1540, 750, { stroke: INK, width: 3.4 }));
    for (let i = 0; i < 6; i++) e.push(ln(120 + i * 260, 900, 220 + i * 220, 760, { stroke: SOFT, width: 1.1, opacity: 0.3 }));
    // 光柱
    e.push(p('M 520 620 L 300 900 M 1120 620 L 1360 900', { stroke: SOFT, width: 1.6, opacity: 0.22 }));
    // 浮尘
    for (let i = 0; i < 22; i++) e.push(el(rr(420, 1280), rr(200, 820), rr(1, 3), rr(1, 3), { fill: PALE, stroke: 'none', width: 0, opacity: rr(0.3, 0.8) }));
    // 前景门框暗边
    e.push(p('M 0 900 L 0 0 L 60 0 L 60 900 Z', { fill: GRAY, stroke: INK, width: 2 }));
    return e;
  };

  // 39 路灯与水洼：无人空镜
  C.lampPuddle = function (o) {
    o = o || {};
    const e = [];
    e.push.apply(e, skyline(520, { near: false, mid: true, far: true }));
    e.push(ln(0, 520, 1600, 520, { stroke: GRAY, width: 2.4 }));
    // 墙面剪影
    e.push(p('M 0 900 L 0 300 L 260 340 L 300 900 Z', { fill: GRAY, stroke: INK, width: 3 }));
    e.push(p('M 1600 900 L 1600 360 L 1330 330 L 1290 900 Z', { fill: GRAY, stroke: INK, width: 3 }));
    // 路灯
    e.push.apply(e, lampPost(560, 800, 360, { dir: 1 }));
    e.push.apply(e, lampPost(1180, 760, 280, { dir: -1 }));
    // 地面
    e.push(ln(0, 810, 1600, 780, { stroke: INK, width: 3 }));
    // 水洼
    e.push(el(820, 826, 480, 60, { stroke: MID, width: 2.4, fill: 'none' }));
    e.push(el(820, 826, 430, 44, { stroke: SOFT, width: 1.4, opacity: 0.6 }));
    e.push.apply(e, reflectStreaks(600, 1050, 815, 875, 8));
    e.push(ln(680, 860, 960, 860, { stroke: PALE, width: 2, opacity: 0.4 }));
    // 雨
    e.push.apply(e, rain(60, 100, 1540, 800, 80, { len: 32, opacity: 0.44 }));
    e.push.apply(e, waterLines(790, 890, 12));
    // 前景路沿
    e.push(ln(0, 890, 1600, 862, { stroke: INK, width: 5 }));
    return e;
  };

  // 40 黑场片名（背景由 drawing.bg 提供）
  C.titleCard = function (o) {
    o = o || {};
    const e = [];
    // 片名
    e.push(tx(800, 430, '长 夜', { size: 108, fill: PALE, anchor: 'middle', font: 'serif', weight: '400' }));
    e.push(tx(800, 496, 'N I G H T W A L K', { size: 22, fill: MID, anchor: 'middle' }));
    e.push(ln(612, 536, 988, 536, { stroke: MID, width: 1.6 }));
    e.push(tx(800, 592, '第 一 幕', { size: 25, fill: GRAY, anchor: 'middle' }));
    // 四角裁切标记
    [[96, 96, 1, 1], [1504, 96, -1, 1], [96, 804, 1, -1], [1504, 804, -1, -1]].forEach(function (c) {
      e.push(ln(c[0], c[1], c[0] + 36 * c[2], c[1], { stroke: 'none', width: 0 }));
      e.push(ln(c[0], c[1], c[0], c[1] + 36 * c[3], { stroke: MID, width: 1.4 }));
      e.push(ln(c[0], c[1], c[0] + 36 * c[2], c[1], { stroke: MID, width: 1.4 }));
    });
    // 一条极细的场记分隔
    e.push(ln(96, 804, 260, 804, { stroke: MID, width: 1.2 }));
    e.push(tx(96, 792, 'REEL 01', { size: 17, fill: GRAY }));
    e.push(ln(1340, 804, 1504, 804, { stroke: MID, width: 1.2 }));
    e.push(tx(1504, 792, '01:00:00', { size: 17, fill: GRAY, anchor: 'end' }));
    return e;
  };

  // 41 时钟插镜：时间压力
  C.clockInsert = function (o) {
    o = o || {};
    const e = [];
    // 背景墙
    for (let i = 0; i < 6; i++) e.push(ln(60, 120 + i * 120, 1540, 100 + i * 120, { stroke: SOFT, width: 1.1, opacity: 0.3 }));
    e.push.apply(e, clockFace(900, 430, 250, 3, 7));
    // 表盘细节：裂纹 / 高光
    e.push(p('M 830 300 l 26 52 l -14 8 l 20 40', { stroke: MID, width: 1.6, opacity: 0.65 }));
    e.push(el(820, 340, 46, 26, { stroke: PALE, width: 2, opacity: 0.5 }));
    // 投影
    e.push(el(1030, 560, 190, 52, { stroke: SOFT, width: 1.2, opacity: 0.4 }));
    // 前景失焦门框
    e.push(p('M 0 900 L 0 0 L 90 0 L 90 900 Z', { fill: GRAY, stroke: INK, width: 2.4 }));
    e.push(p('M 1600 900 L 1600 0 L 1500 0 L 1500 900 Z', { fill: GRAY, stroke: INK, width: 2.4 }));
    // 墙上的影子
    e.push(p('M 1150 690 C 1140 790, 1180 860, 1160 900 L 1240 900 C 1220 830, 1210 760, 1220 700 Z', { fill: GRAY, stroke: 'none', width: 0, opacity: 0.5 }));
    return e;
  };

  // 42 电视雪花：屏幕光里的背影
  C.tvStatic = function (o) {
    o = o || {};
    const e = [];
    // 房间墙
    e.push(ln(40, 140, 1560, 120, { stroke: INK, width: 3.4 }));
    e.push(ln(40, 820, 1560, 800, { stroke: INK, width: 3 }));
    // 电视
    e.push.apply(e, tvSet(300, 320, 620, 410));
    // 屏幕光
    e.push(p('M 920 380 L 1320 250 L 1520 900 L 920 760 Z', { fill: 'crosshatch', stroke: SOFT, width: 1.2, opacity: 0.25 }));
    for (let i = 0; i < 8; i++) e.push(ln(920, 400 + i * 40, 1380 - i * 24, 300 + i * 52, { stroke: PALE, width: 1.2, opacity: 0.25 }));
    // 前景背影（看着电视）
    e.push.apply(e, figure(1200, 900, 640, { sil: true, pose: 'back' }));
    e.push(p('M 1110 400 C 1120 360, 1180 340, 1250 352', { stroke: PALE, width: 2, opacity: 0.3 }));
    // 前景矮桌 / 遥控器
    e.push(ln(0, 900, 0, 820, { stroke: INK, width: 4 }));
    e.push(el(340, 860, 60, 14, { stroke: INK, width: 2.6 }));
    e.push(rc(300, 826, 30, 18, { stroke: INK, width: 2 }));
    // 电源线
    e.push(p('M 300 730 C 200 760, 220 840, 120 880', { stroke: MID, width: 1.8, opacity: 0.6 }));
    // 暗角排线
    e.push(p('M 40 120 L 40 300 l 40 20 L 80 120 Z', { fill: 'hatch', stroke: 'none', width: 0, opacity: 0.3 }));
    return e;
  };

  // 43 俯拍：地板上的身体与散落物
  C.overheadFloor = function (o) {
    o = o || {};
    const e = [];
    // 地板
    for (let i = 0; i < 9; i++) e.push(ln(40, 120 + i * 88, 1560, 110 + i * 88, { stroke: SOFT, width: 1, opacity: 0.28 }));
    e.push(ln(40, 60, 40, 860, { stroke: INK, width: 3 }));
    // 地毯
    e.push(rc(380, 260, 840, 460, { stroke: MID, width: 2, opacity: 0.6 }));
    e.push(rc(420, 300, 760, 380, { stroke: SOFT, width: 1.4, opacity: 0.4 }));
    // 倒地的人（俯视剪影）
    e.push(p('M 560 560 C 540 500, 580 450, 650 448 C 700 446, 740 470, 748 500 C 790 500, 840 510, 880 540 C 900 560, 890 600, 850 620 C 780 652, 690 650, 620 630 C 580 618, 560 595, 560 560 Z', { fill: GRAY, stroke: INK, width: 3.4 }));
    e.push(el(560, 540, 48, 56, { fill: GRAY, stroke: INK, width: 3 }));
    e.push(p('M 700 620 C 700 680, 710 730, 690 780 M 780 640 C 800 690, 820 740, 850 780', { stroke: GRAY, width: 16 }));
    e.push(p('M 640 480 C 600 430, 570 400, 520 386 M 740 470 C 780 430, 820 410, 870 404', { stroke: GRAY, width: 14 }));
    // 散落物
    e.push(p('M 1120 640 L 1300 620 L 1320 700 L 1140 720 Z', { stroke: INK, width: 2.6 }));
    e.push(p('M 1120 640 L 1160 610 M 1320 620 L 1300 590', { stroke: MID, width: 2 }));
    e.push(el(1200, 790, 46, 46, { stroke: INK, width: 3 }));
    e.push(p('M 1170 790 C 1190 770, 1230 770, 1250 790', { stroke: MID, width: 2 }));
    e.push(rc(320, 720, 110, 70, { stroke: INK, width: 2.8, rx: 5 }));
    e.push(ln(330, 745, 420, 745, { stroke: MID, width: 1.8 }));
    e.push(el(300, 620, 22, 46, { stroke: INK, width: 2.6 }));
    e.push(el(340, 630, 22, 46, { stroke: INK, width: 2.6 }));
    // 打翻的杯子与水渍
    e.push(el(1320, 420, 34, 34, { stroke: INK, width: 2.6 }));
    e.push(p('M 1354 430 C 1400 450, 1430 500, 1420 540', { stroke: MID, width: 1.6, opacity: 0.6 }));
    // 前景暗角
    e.push(p('M 0 0 L 0 900 L 120 900 L 120 0 Z', { fill: 'hatch', stroke: 'none', width: 0, opacity: 0.25 }));
    e.push(p('M 1480 0 L 1600 0 L 1600 900 L 1480 900 Z', { fill: 'hatch', stroke: 'none', width: 0, opacity: 0.25 }));
    return e;
  };

  // 44 远去公路：背影 / 长路 / 天地线
  C.roadWalkAway = function (o) {
    o = o || {};
    const e = [];
    // 天空
    e.push(p('M 60 250 C 300 210, 520 260, 760 230', { stroke: SOFT, width: 1.5, opacity: 0.4 }));
    e.push(p('M 900 180 C 1140 150, 1360 190, 1560 164', { stroke: SOFT, width: 1.3, opacity: 0.35 }));
    // 地平线 / 远山
    e.push(ln(40, 430, 1560, 430, { stroke: GRAY, width: 2.6 }));
    e.push(p('M 40 430 L 260 400 L 420 422 L 620 396 L 820 424 L 1050 398 L 1260 420 L 1560 402', { stroke: MID, width: 1.6, opacity: 0.7 }));
    // 公路
    e.push(p('M 0 900 L 660 430 L 940 430 L 1600 900 Z', { stroke: INK, width: 4.4 }));
    e.push(p('M 660 430 L 780 430 L 760 900 L 420 900 Z', { stroke: 'none', width: 0 }));
    // 中心虚线
    for (let i = 0; i < 7; i++) {
      const t = i / 7;
      e.push(ln(800, 860 - t * 380, 800, 810 - t * 380, { stroke: MID, width: 6 - t * 4, opacity: 0.8 }));
    }
    // 路肩线
    e.push(ln(620, 900, 700, 440, { stroke: INK, width: 2.4 }));
    e.push(ln(980, 900, 900, 440, { stroke: INK, width: 2.4 }));
    // 电杆
    for (let i = 0; i < 4; i++) {
      const t = i / 4;
      const x = 250 + t * 160, y = 900 - t * 430;
      e.push(ln(x, y, x + t * 20, y - 240 + t * 160, { stroke: MID, width: 3 - t }));
      e.push(ln(x + t * 20 - 20, y - 210 + t * 144, x + t * 20 + 20, y - 212 + t * 146, { stroke: MID, width: 2 }));
    }
    // 人物（背影）
    e.push.apply(e, figure(800, 780, 180, { sil: true, pose: 'back', coat: true }));
    e.push.apply(e, shadowPatch(800, 786, 120));
    // 前景路面纹理
    for (let i = 0; i < 14; i++) e.push(ln(rr(60, 1540), rr(830, 894), rr(80, 1560), rr(830, 894), { stroke: SOFT, width: rr(1, 2), opacity: rr(0.15, 0.3) }));
    // 路牌
    e.push(ln(1280, 720, 1280, 560, { stroke: INK, width: 3.4 }));
    e.push(rc(1210, 500, 140, 66, { stroke: INK, width: 3, rx: 2 }));
    e.push(ln(1230, 526, 1330, 524, { stroke: MID, width: 2 }));
    e.push(ln(1230, 546, 1300, 544, { stroke: MID, width: 1.8 }));
    return e;
  };

  // 45 窗边独坐：情绪空镜 / 对话静场
  C.windowSeat = function (o) {
    o = o || {};
    const e = [];
    // 窗外
    e.push.apply(e, skyline(560, { x0: 180, x1: 900, near: false, mid: true, far: true }));
    e.push(rc(180, 150, 720, 430, { stroke: INK, width: 4.4 }));
    e.push(ln(540, 150, 540, 580, { stroke: INK, width: 3 }));
    e.push(ln(180, 370, 900, 370, { stroke: INK, width: 2.6 }));
    e.push(ln(160, 584, 920, 584, { stroke: INK, width: 4.6 }));
    e.push.apply(e, rain(200, 170, 880, 560, 40, { len: 20, opacity: 0.35 }));
    // 墙和地面
    e.push(ln(60, 130, 1560, 130, { stroke: INK, width: 4 }));
    e.push(ln(60, 720, 1560, 720, { stroke: INK, width: 4 }));
    e.push(ln(1560, 130, 1560, 900, { stroke: INK, width: 3 }));
    // 窗台
    e.push(ln(140, 610, 940, 610, { stroke: INK, width: 5 }));
    e.push(ln(140, 650, 940, 650, { stroke: MID, width: 2 }));
    // 坐着的人（侧背影，面向窗）
    e.push.apply(e, figure(1080, 820, 340, { pose: 'sit', w: 4 }));
    // 椅子
    e.push(ln(980, 820, 980, 660, { stroke: INK, width: 4 }));
    e.push(ln(980, 660, 1160, 650, { stroke: INK, width: 3.4 }));
    e.push(ln(1020, 820, 1020, 700, { stroke: MID, width: 3 }));
    // 窗帘
    e.push(p('M 900 130 C 860 300, 900 480, 850 610', { stroke: INK, width: 3 }));
    e.push(p('M 940 140 C 900 320, 940 500, 890 610', { stroke: MID, width: 1.6, opacity: 0.6 }));
    // 前景桌面 / 杯
    e.push(ln(1180, 900, 1180, 760, { stroke: INK, width: 3.4 }));
    e.push(el(1290, 840, 70, 16, { stroke: INK, width: 2.6 }));
    e.push(ln(1320, 838, 1340, 900, { stroke: MID, width: 1.6, opacity: 0.6 }));
    // 月光 / 雨光
    e.push(p('M 940 584 L 1040 900 M 900 590 L 980 900', { stroke: SOFT, width: 1.4, opacity: 0.22 }));
    return e;
  };

  // 46 镜前对话：前景背影 / 镜中正脸
  C.mirrorTalk = function (o) {
    o = o || {};
    const e = [];
    // 房间墙
    e.push(ln(40, 120, 1560, 120, { stroke: INK, width: 4 }));
    e.push(ln(40, 720, 1560, 720, { stroke: INK, width: 4 }));
    // 镜子
    e.push(rc(880, 150, 600, 470, { stroke: INK, width: 6 }));
    e.push(rc(910, 180, 540, 410, { stroke: MID, width: 1.8, opacity: 0.6 }));
    // 镜像：正面的人
    e.push.apply(e, bust(1180, 220, 120, { w: 3 }));
    e.push(p('M 1080 420 L 1280 420 M 1100 400 C 1140 380, 1220 380, 1260 400', { stroke: MID, width: 1.4, opacity: 0.4 }));
    if (o.two) e.push.apply(e, bust(1030, 250, 100, { w: 2.4, ink: MID }));
    // 镜中背景：房间反向
    e.push(ln(950, 300, 1420, 300, { stroke: SOFT, width: 1.2, opacity: 0.3 }));
    e.push(ln(1200, 180, 1200, 590, { stroke: SOFT, width: 1, opacity: 0.25 }));
    // 前景：背对镜头的人
    e.push.apply(e, figure(520, 900, 640, { sil: true, pose: 'back' }));
    e.push(p('M 590 330 C 592 470, 592 660, 586 880', { stroke: PALE, width: 1.6, opacity: 0.25 }));
    // 镜框上沿的光
    e.push(ln(880, 150, 1480, 150, { stroke: PALE, width: 2, opacity: 0.5 }));
    // 梳妆台
    e.push(p('M 820 900 L 860 720 L 1560 700 L 1560 900 Z', { stroke: INK, width: 3.4 }));
    e.push(ln(860, 740, 1560, 720, { stroke: INK, width: 4.4 }));
    e.push(el(1040, 800, 120, 20, { stroke: MID, width: 2, opacity: 0.6 }));
    // 前景物件
    e.push(rc(140, 740, 90, 130, { stroke: INK, width: 3 }));
    e.push(ln(160, 760, 210, 760, { stroke: MID, width: 1.8 }));
    e.push(el(1420, 780, 40, 12, { stroke: INK, width: 2.4 }));
    return e;
  };

  // 47 雨玻璃：掌印 / 模糊的脸 / 水痕
  C.rainGlass = function (o) {
    o = o || {};
    const e = [];
    // 窗外虚焦光
    for (let i = 0; i < 16; i++) e.push(el(rr(160, 1440), rr(120, 700), rr(4, 16), rr(4, 16), { fill: PALE, stroke: 'none', width: 0, opacity: rr(0.2, 0.55) }));
    // 玻璃上的雨滴
    for (let i = 0; i < 70; i++) {
      const x = rr(120, 1500), y = rr(90, 830);
      e.push(el(x, y, rr(2, 7), rr(3, 10), { stroke: SOFT, width: 1.2, fill: 'none', opacity: rr(0.3, 0.7) }));
      if (i % 4 === 0) e.push(ln(x, y + 6, x + rr(-3, 3), y + rr(20, 90), { stroke: SOFT, width: 1.2, opacity: 0.35 }));
    }
    // 玻璃后的脸（模糊）
    const f = profileFace(620, 430, 360, { ink: MID });
    f.forEach(function (el2) { if (el2.type !== 'path' || el2.fill !== 'hatch') { el2.opacity = 0.4; el2.width = Math.min(3, el2.width || 3); } });
    e.push.apply(e, f);
    // 贴在玻璃上的手（掌心向外）
    e.push.apply(e, handClose(950, 470, 420, 'open'));
    // 水痕与掌印边缘
    e.push(p('M 800 680 C 880 720, 1030 720, 1110 680', { stroke: PALE, width: 2.2, opacity: 0.4 }));
    e.push(p('M 820 300 C 900 340, 1020 340, 1090 300', { stroke: PALE, width: 1.6, opacity: 0.3 }));
    // 窗框
    e.push(p('M 0 0 L 0 900 L 120 900 L 120 0 Z', { fill: GRAY, stroke: INK, width: 3 }));
    e.push(p('M 1600 0 L 1600 900 L 1500 900 L 1500 0 Z', { fill: GRAY, stroke: INK, width: 3 }));
    e.push(ln(120, 900, 1500, 900, { stroke: INK, width: 4 }));
    return e;
  };

  // 48 手机光里的脸：短剧钩子
  C.phoneFace = function (o) {
    o = o || {};
    const e = [];
    e.push(ln(80, 120, 1520, 100, { stroke: MID, width: 2, opacity: 0.4 }));
    e.push(ln(120, 140, 120, 770, { stroke: MID, width: 2.2, opacity: 0.45 }));
    for (let i = 0; i < 3; i++) e.push(ln(140, 240 + i * 170, 760, 230 + i * 170, { stroke: SOFT, width: 1.3, opacity: 0.3 }));
    for (let i = 0; i < 12; i++) e.push(el(rr(1050, 1500), rr(160, 420), rr(3, 9), rr(3, 9), { fill: PALE, stroke: 'none', width: 0, opacity: rr(0.3, 0.65) }));
    e.push(p('M 80 120 L 80 780 L 120 800 L 120 140 Z', { fill: 'hatch', stroke: 'none', width: 0, opacity: 0.28 }));
    e.push(p('M 1520 100 L 1520 520 L 1560 500 L 1560 100 Z', { fill: 'hatch', stroke: 'none', width: 0, opacity: 0.22 }));
    e.push.apply(e, profileFace(700, 420, 440, {}));
    e.push(p('M 716 208 L 730 330 M 892 360 L 914 430 M 858 520 L 812 588', { stroke: PALE, width: 2.4, opacity: 0.45 }));
    e.push(p('M 800 440 l 34 40 M 780 470 l 30 38 M 760 500 l 26 32', { stroke: PALE, width: 1.3, opacity: 0.25 }));
    e.push.apply(e, phone(1030, 430, 250, 450, 'call'));
    e.push(p('M 1352 900 C 1330 800, 1288 736, 1252 704 L 1178 742 C 1190 810, 1210 860, 1220 900 Z', { fill: GRAY, stroke: INK, width: 3.6 }));
    e.push(p('M 1252 704 C 1214 676, 1160 680, 1120 704', { stroke: INK, width: 3.4 }));
    e.push(p('M 1120 704 C 1090 700, 1060 714, 1046 736', { stroke: INK, width: 3 }));
    e.push(p('M 1128 720 C 1100 718, 1074 730, 1060 750', { stroke: MID, width: 2.2, opacity: 0.7 }));
    e.push(p('M 1246 742 C 1200 728, 1136 716, 1088 732 C 1068 738, 1062 760, 1080 770 C 1110 786, 1170 790, 1218 780', { stroke: INK, width: 3.4 }));
    e.push(p('M 1088 732 C 1082 742, 1084 756, 1096 764', { stroke: INK, width: 2.4 }));
    e.push(p('M 1030 588 C 1014 590, 1004 600, 1006 612 C 1008 624, 1020 630, 1032 626', { stroke: INK, width: 2.6 }));
    e.push(p('M 1030 640 C 1012 642, 1002 652, 1006 666 C 1010 678, 1022 682, 1034 678', { stroke: INK, width: 2.6 }));
    e.push(p('M 1032 692 C 1016 694, 1008 704, 1012 716 C 1016 728, 1028 730, 1038 726', { stroke: MID, width: 2.2 }));
    e.push(p('M 1600 900 L 1600 690 C 1540 660, 1420 676, 1340 744 C 1290 786, 1266 848, 1262 900 Z', { fill: GRAY, stroke: INK, width: 3 }));
    e.push(p('M 1580 700 C 1500 686, 1400 706, 1320 790', { stroke: PALE, width: 2, opacity: 0.35 }));
    e.push(p('M 1380 780 l 24 30 M 1420 760 l 24 32', { stroke: MID, width: 1.6, opacity: 0.4 }));
    e.push(ln(40, 872, 620, 880, { stroke: MID, width: 18, opacity: 0.2 }));
    e.push(ln(140, 890, 540, 896, { stroke: MID, width: 9, opacity: 0.13 }));
    return e;
  };

  // 49 手机屏插镜：消息 / 来电 / 无信号
  C.phoneScreen = function (o) {
    o = o || {};
    const mode = o.mode || 'msg';
    const e = [];
    // 背景暗部
    e.push(p('M 0 0 L 1600 0 L 1600 900 L 0 900 Z', { stroke: 'none', width: 0 }));
    for (let i = 0; i < 4; i++) e.push(ln(80, 180 + i * 160, 1520, 140 + i * 160, { stroke: SOFT, width: 1.1, opacity: 0.22 }));
    // 大手机
    e.push.apply(e, phone(520, 100, 560, 760, mode));
    // 握持的手
    e.push(p('M 480 900 C 480 780, 500 700, 560 650', { stroke: INK, width: 3.6 }));
    e.push(p('M 500 760 C 530 740, 560 750, 580 770', { stroke: INK, width: 3 }));
    e.push(p('M 1120 900 C 1120 800, 1090 720, 1040 660', { stroke: INK, width: 3.6 }));
    e.push(p('M 1060 600 C 1020 610, 990 640, 980 680 M 1100 560 C 1060 570, 1020 600, 1000 640', { stroke: INK, width: 3 }));
    // 屏幕光
    e.push(p('M 440 300 L 300 220 M 440 500 L 260 470 M 440 700 L 300 800', { stroke: SOFT, width: 1.6, dash: '8 12', opacity: 0.4 }));
    e.push(p('M 1160 300 L 1300 220 M 1160 520 L 1340 480 M 1160 700 L 1320 790', { stroke: SOFT, width: 1.6, dash: '8 12', opacity: 0.35 }));
    // 前景失焦
    e.push(ln(40, 860, 1560, 872, { stroke: MID, width: 22, opacity: 0.16 }));
    return e;
  };

  // 50 坠落的手机：动作插镜
  C.phoneDrop = function (o) {
    o = o || {};
    const e = [];
    // 地面 / 楼梯间背景
    e.push(ln(40, 760, 1560, 740, { stroke: INK, width: 3.4 }));
    e.push(ln(40, 760, 40, 900, { stroke: INK, width: 2.6 }));
    for (let i = 0; i < 5; i++) e.push(ln(120 + i * 300, 900, 220 + i * 260, 760, { stroke: SOFT, width: 1.2, opacity: 0.28 }));
    // 手机（下落中）
    e.push.apply(e, phone(690, 350, 220, 400, 'call'));
    // 速度线
    for (let i = 0; i < 6; i++) e.push(ln(680 + i * 42, 300, 680 + i * 42, 160 + (i % 2) * 30, { stroke: SOFT, width: 1.6, dash: '10 12', opacity: 0.4 }));
    e.push(ln(650, 470, 640, 300, { stroke: MID, width: 2, opacity: 0.5 }));
    e.push(ln(950, 470, 970, 300, { stroke: MID, width: 2, opacity: 0.5 }));
    // 两只伸出的手
    e.push(p('M 260 900 C 300 780, 380 700, 520 660', { stroke: INK, width: 4 }));
    e.push(p('M 520 660 C 560 650, 610 660, 650 686', { stroke: INK, width: 3.4 }));
    e.push(p('M 520 680 C 560 676, 600 686, 636 710', { stroke: INK, width: 2.8 }));
    e.push(p('M 660 700 C 690 690, 710 700, 720 720', { stroke: INK, width: 2.6 }));
    e.push(p('M 1340 900 C 1300 790, 1220 720, 1110 680', { stroke: INK, width: 4 }));
    e.push(p('M 1110 680 C 1070 670, 1020 680, 980 700', { stroke: INK, width: 3.4 }));
    e.push(p('M 1110 700 C 1070 696, 1030 706, 1000 726', { stroke: INK, width: 2.8 }));
    // 地面反光
    e.push(el(800, 860, 240, 22, { stroke: SOFT, width: 1.6, opacity: 0.4 }));
    // 前景地板暗角
    e.push(p('M 0 900 L 0 820 L 160 900 Z', { fill: 'hatch', stroke: 'none', width: 0, opacity: 0.3 }));
    e.push(p('M 1600 900 L 1600 820 L 1440 900 Z', { fill: 'hatch', stroke: 'none', width: 0, opacity: 0.3 }));
    return e;
  };

  // 51 手部情绪：攥紧 / 松开
  C.handEmotion = function (o) {
    o = o || {};
    const e = [];
    for (let i = 0; i < 6; i++) e.push(ln(80, 160 + i * 44, 1520, 150 + i * 44, { stroke: SOFT, width: 1.1, opacity: 0.18 }));
    e.push(ln(150, 120, 150, 800, { stroke: MID, width: 2, opacity: 0.4 }));
    e.push(el(1260, 330, 115, 115, { stroke: PALE, width: 2, opacity: 0.45 }));
    e.push(p('M 1180 330 L 990 440 M 1180 370 L 970 500', { stroke: SOFT, width: 1.2, opacity: 0.2 }));
    e.push.apply(e, handClose(800, 430, 500, o.state || 'fist'));
    e.push(p('M 560 852 C 640 818, 1000 814, 1080 850', { stroke: SOFT, width: 1.4, opacity: 0.35 }));
    e.push(ln(0, 842, 1600, 812, { stroke: INK, width: 4 }));
    e.push(p('M 0 900 L 0 862 L 1600 830 L 1600 900 Z', { fill: 'hatch', stroke: 'none', width: 0, opacity: 0.22 }));
    e.push(ln(420, 566, 344, 548, { stroke: SOFT, width: 1.4, opacity: 0.5 }));
    e.push(ln(426, 612, 352, 602, { stroke: SOFT, width: 1.2, opacity: 0.4 }));
    e.push(p('M 0 120 L 0 220 L 90 240 L 90 120 Z', { fill: 'hatch', stroke: 'none', width: 0, opacity: 0.2 }));
    return e;
  };

  // 52 眼部大特写：隐忍
  C.eyeEmotion = function (o) {
    o = o || {};
    const e = [];
    // 背景失焦横线
    for (let i = 0; i < 5; i++) e.push(ln(80, 180 + i * 120, 1520, 160 + i * 120, { stroke: SOFT, width: 2, opacity: 0.2 }));
    e.push(ln(120, 120, 120, 820, { stroke: MID, width: 2, opacity: 0.4 }));
    e.push.apply(e, eyeClose(800, 440, 330, {}));
    // 泪痕
    e.push(p('M 660 560 C 650 640, 668 700, 650 780', { stroke: SOFT, width: 2, opacity: 0.55 }));
    e.push(p('M 676 574 C 668 640, 680 690, 670 740', { stroke: PALE, width: 1.4, opacity: 0.5 }));
    // 皮肤排线
    e.push(p('M 440 620 C 520 680, 620 700, 700 700 M 460 660 C 540 710, 640 730, 720 730', { stroke: MID, width: 1.2, opacity: 0.4 }));
    // 前景发丝
    e.push(p('M 300 120 C 420 260, 500 200, 640 300', { stroke: GRAY, width: 6 }));
    e.push(p('M 340 140 C 450 280, 520 240, 620 330', { stroke: INK, width: 2.6 }));
    return e;
  };

  // 53 侧脸特写：光切过轮廓
  C.faceProfile = function (o) {
    o = o || {};
    const e = [];
    // 背景窗格
    e.push(ln(140, 150, 140, 720, { stroke: INK, width: 3 }));
    e.push(ln(140, 150, 900, 150, { stroke: INK, width: 2.4 }));
    e.push(ln(980, 130, 980, 760, { stroke: MID, width: 2, opacity: 0.5 }));
    for (let i = 0; i < 3; i++) e.push(ln(140, 300 + i * 140, 980, 290 + i * 140, { stroke: SOFT, width: 1.4, opacity: 0.4 }));
    // 暗部
    e.push(p('M 980 130 L 980 760 l 620 30 L 1600 130 Z', { fill: 'hatch', stroke: 'none', width: 0, opacity: 0.25 }));
    // 侧脸
    e.push.apply(e, profileFace(730, 460, 430, {}));
    // 轮廓光
    e.push(p('M 690 210 L 712 330 M 850 325 L 878 380 M 880 455 L 845 505 M 800 590 L 760 640', { stroke: PALE, width: 2.4, opacity: 0.5 }));
    // 前景肩头
    e.push(p('M 0 900 L 0 720 C 80 660, 200 660, 280 720 L 320 900 Z', { fill: GRAY, stroke: INK, width: 3.4 }));
    // 视线
    if (o.gaze) e.push.apply(e, gaze(860, 400, 1400, 300, ''));
    return e;
  };

  // 54 正面特写：压着的情绪
  C.faceFrontal = function (o) {
    o = o || {};
    const e = [];
    for (let i = 0; i < 9; i++) e.push(ln(60 + i * 76, 120, 40 + i * 76, 830, { stroke: SOFT, width: 1.3, opacity: 0.16 }));
    e.push(ln(40, 120, 1560, 120, { stroke: MID, width: 2, opacity: 0.45 }));
    e.push(p('M 0 900 L 0 0 L 160 0 L 70 900 Z', { fill: 'hatch', stroke: 'none', width: 0, opacity: 0.25 }));
    e.push(p('M 1600 900 L 1600 0 L 1440 0 L 1530 900 Z', { fill: 'hatch', stroke: 'none', width: 0, opacity: 0.25 }));
    e.push.apply(e, faceFront(790, 430, 430, { tear: !!o.tear }));
    e.push(p('M 1000 300 C 1010 400, 1000 520, 950 620', { stroke: PALE, width: 2, opacity: 0.3 }));
    e.push(p('M 1600 900 L 1600 720 C 1530 690, 1420 710, 1350 780 C 1310 820, 1290 860, 1286 900 Z', { fill: GRAY, stroke: INK, width: 3 }));
    e.push(p('M 1570 730 C 1490 712, 1400 740, 1330 810', { stroke: PALE, width: 1.8, opacity: 0.3 }));
    e.push(ln(40, 874, 900, 886, { stroke: MID, width: 14, opacity: 0.16 }));
    return e;
  };

  // 55 对峙双人：两人剪影 / 中间一道光
  C.faceOff = function (o) {
    o = o || {};
    const e = [];
    // 背景高窗
    e.push(rc(600, 100, 400, 420, { stroke: INK, width: 4 }));
    e.push(ln(800, 100, 800, 520, { stroke: INK, width: 3 }));
    e.push(ln(600, 310, 1000, 310, { stroke: INK, width: 2.4 }));
    e.push(p('M 600 520 L 420 900 M 1000 520 L 1180 900', { stroke: SOFT, width: 1.4, opacity: 0.3 }));
    // 两侧墙
    e.push(p('M 0 0 L 0 900 L 380 900 L 380 120 Z', { fill: 'hatch', stroke: 'none', width: 0, opacity: 0.25 }));
    e.push(p('M 1600 0 L 1600 900 L 1220 900 L 1220 120 Z', { fill: 'hatch', stroke: 'none', width: 0, opacity: 0.25 }));
    // 两人
    e.push.apply(e, figure(560, 820, 500, { sil: true, pose: 'stand', coat: true }));
    e.push.apply(e, figure(1040, 820, 500, { sil: true, pose: 'stand', face: 'left' }));
    e.push.apply(e, shadowPatch(560, 826, 300));
    e.push.apply(e, shadowPatch(1040, 826, 300));
    // 轮廓光
    e.push(p('M 620 400 C 640 500, 642 650, 636 800 M 980 400 C 960 500, 958 650, 964 800', { stroke: PALE, width: 2, opacity: 0.3 }));
    // 视线与张力
    e.push.apply(e, gaze(590, 380, 960, 380, ''));
    e.push(ln(760, 300, 800, 340, { stroke: SOFT, width: 1.2, opacity: 0.4 }));
    // 前景地面
    e.push(ln(40, 826, 1560, 826, { stroke: MID, width: 2, opacity: 0.4 }));
    return e;
  };

  // 56 过肩对峙
  C.ots = function (o) {
    o = o || {};
    const e = [];
    e.push.apply(e, skyline(520, { x0: 220, x1: 980, near: false, mid: true, far: true }));
    e.push(rc(200, 150, 800, 400, { stroke: INK, width: 4 }));
    for (let i = 0; i < 10; i++) e.push(ln(210, 170 + i * 38, 990, 168 + i * 38, { stroke: MID, width: 1.4, opacity: 0.42 }));
    e.push(ln(180, 552, 1020, 552, { stroke: INK, width: 4 }));
    e.push(ln(40, 130, 1560, 130, { stroke: INK, width: 4 }));
    e.push(ln(40, 660, 1560, 660, { stroke: INK, width: 3.4 }));
    e.push(p('M 40 130 L 40 660 L 90 660 L 90 130 Z', { fill: 'hatch', stroke: 'none', width: 0, opacity: 0.2 }));
    e.push.apply(e, bust(690, 245, 180, { w: 3.2 }));
    e.push(p('M 500 690 L 500 560 L 610 552', { stroke: INK, width: 3 }));
    e.push.apply(e, table(760, 730, 540, 80, { items: true }));
    e.push(ln(680, 712, 1000, 706, { stroke: PALE, width: 2, opacity: 0.35 }));
    e.push(p('M 900 704 L 1000 698 L 1010 720 L 910 724 Z', { stroke: MID, width: 1.8, opacity: 0.6 }));
    e.push.apply(e, otsShoulder('right', 610, 1.12));
    e.push.apply(e, gaze(760, 344, 1300, 610, ''));
    e.push(p('M 0 900 L 0 860 L 1600 826 L 1600 900 Z', { fill: 'hatch', stroke: 'none', width: 0, opacity: 0.18 }));
    return e;
  };

  // 57 桌面双人：对称 / 隔着桌子的两个人
  C.twoShotTable = function (o) {
    o = o || {};
    const e = [];
    // 背景窗
    e.push.apply(e, skyline(540, { x0: 560, x1: 1040, near: false, mid: true, far: true }));
    e.push(rc(520, 160, 560, 380, { stroke: INK, width: 4 }));
    e.push(ln(800, 160, 800, 540, { stroke: INK, width: 3 }));
    e.push(ln(520, 350, 1080, 350, { stroke: INK, width: 2.6 }));
    e.push.apply(e, rain(540, 180, 1060, 520, 30, { len: 18, opacity: 0.3 }));
    // 墙 / 地面
    e.push(ln(40, 130, 1560, 130, { stroke: INK, width: 4 }));
    e.push(ln(40, 700, 1560, 700, { stroke: INK, width: 3.4 }));
    e.push(ln(40, 700, 40, 900, { stroke: INK, width: 3 }));
    e.push(ln(1560, 700, 1560, 900, { stroke: INK, width: 3 }));
    // 吊灯
    e.push.apply(e, hangingLamp(800, 120, 60));
    // 桌子
    e.push.apply(e, table(800, 730, 620, 70, { items: true }));
    e.push(ln(660, 900, 660, 800, { stroke: INK, width: 3.4 }));
    e.push(ln(940, 900, 940, 800, { stroke: INK, width: 3.4 }));
    // 两个人
    e.push.apply(e, figure(470, 810, 340, { pose: 'stand', coat: true }));
    e.push.apply(e, figure(1130, 810, 340, { pose: 'stand' }));
    // 视线
    e.push.apply(e, gaze(520, 480, 1080, 480, ''));
    // 椅子
    e.push(ln(400, 810, 400, 680, { stroke: INK, width: 3 }));
    e.push(ln(1200, 810, 1200, 680, { stroke: INK, width: 3 }));
    // 前景桌沿
    e.push(ln(160, 900, 1440, 900, { stroke: INK, width: 5 }));
    return e;
  };

  // 58 并肩行走对话
  C.walkingTalk = function (o) {
    o = o || {};
    const e = [];
    e.push.apply(e, skyline(560, { near: false, mid: true, far: true }));
    e.push(ln(0, 560, 1600, 560, { stroke: GRAY, width: 2.4 }));
    // 街道透视
    e.push(ln(0, 900, 700, 560, { stroke: INK, width: 3 }));
    e.push(ln(1600, 900, 900, 560, { stroke: INK, width: 3 }));
    e.push(ln(0, 780, 760, 560, { stroke: MID, width: 1.8, opacity: 0.6 }));
    e.push(ln(1600, 780, 840, 560, { stroke: MID, width: 1.8, opacity: 0.6 }));
    // 路灯
    e.push.apply(e, lampPost(360, 780, 340, { dir: 1 }));
    // 两人并肩背影
    e.push.apply(e, figure(760, 850, 360, { sil: true, pose: 'walk', coat: true }));
    e.push.apply(e, figure(860, 850, 340, { sil: true, pose: 'walk' }));
    e.push.apply(e, shadowPatch(810, 856, 220));
    // 跟拍运动线
    e.push(ln(300, 690, 560, 686, { stroke: SOFT, width: 1.6, dash: '16 12', opacity: 0.5 }));
    e.push(ln(1080, 700, 1320, 694, { stroke: SOFT, width: 1.6, dash: '16 12', opacity: 0.5 }));
    // 前景路面
    e.push(ln(0, 890, 1600, 872, { stroke: INK, width: 4 }));
    return e;
  };

  // 59 打斗冲击：接触瞬间
  C.impactFight = function (o) {
    o = o || {};
    const e = [];
    // 背景暗墙 / 雨
    e.push(ln(40, 150, 1560, 130, { stroke: INK, width: 3 }));
    e.push(ln(40, 760, 1560, 750, { stroke: INK, width: 3 }));
    for (let i = 0; i < 10; i++) e.push(ln(80 + i * 160, 160, 100 + i * 160, 760, { stroke: SOFT, width: 1, opacity: 0.2 }));
    e.push(p('M 0 900 L 0 700 L 1600 660 L 1600 900 Z', { stroke: 'none', fill: 'none', width: 0 }));
    // 两个人
    e.push.apply(e, figure(560, 840, 400, { sil: true, pose: 'run', coat: true }));
    e.push.apply(e, figure(1090, 840, 400, { sil: true, pose: 'ready' }));
    // 接触点
    e.push(el(820, 560, 24, 24, { fill: PALE, stroke: INK, width: 2.6 }));
    for (let i = 0; i < 10; i++) {
      const a = i * Math.PI / 5;
      e.push(ln(820 + Math.cos(a) * 34, 560 + Math.sin(a) * 34, 820 + Math.cos(a) * 120, 560 + Math.sin(a) * 120, { stroke: INK, width: 2.2, opacity: 0.8 }));
    }
    // 冲击弧线
    e.push(p('M 620 660 C 700 600, 900 590, 1000 650', { stroke: MID, width: 2, dash: '12 8', opacity: 0.7 }));
    e.push(p('M 640 720 C 720 660, 920 650, 1020 710', { stroke: MID, width: 1.6, dash: '10 8', opacity: 0.5 }));
    // 碎片
    for (let i = 0; i < 16; i++) {
      const a = rr(0, Math.PI * 2), d = rr(130, 380);
      e.push(el(820 + Math.cos(a) * d, 560 + Math.sin(a) * d * 0.7, rr(2, 6), rr(1, 3), { stroke: MID, width: 1.4, opacity: 0.7 }));
    }
    // 前景地面纹理
    for (let i = 0; i < 6; i++) e.push(ln(rr(40, 1540), rr(820, 890), rr(60, 1560), rr(820, 890), { stroke: SOFT, width: 1.4, opacity: 0.25 }));
    // 暗角
    e.push(p('M 0 900 L 0 0 L 120 0 L 120 900 Z', { fill: 'hatch', stroke: 'none', width: 0, opacity: 0.22 }));
    return e;
  };

  // 60 枪口插镜：手与枪
  C.gunInsert = function (o) {
    o = o || {};
    const e = [];
    // 背景暗部
    e.push(ln(80, 160, 1520, 140, { stroke: MID, width: 1.8, opacity: 0.5 }));
    e.push(p('M 0 900 L 0 760 L 1600 700 L 1600 900 Z', { fill: 'none', stroke: 'none', width: 0 }));
    for (let i = 0; i < 9; i++) e.push(ln(80 + i * 30, 180, 140 + i * 30, 760, { stroke: SOFT, width: 1, opacity: 0.2 }));
    // 枪（原创通用造型）
    e.push(p('M 760 520 L 1130 496 L 1140 556 L 900 580 L 900 600 L 980 606 L 980 640 L 860 636 L 830 700 L 750 710 L 770 590 Z', { fill: GRAY, stroke: INK, width: 3.4 }));
    e.push(p('M 890 580 L 900 660 L 850 700', { stroke: INK, width: 2.4 }));
    e.push(el(856, 620, 30, 34, { stroke: INK, width: 2.6 }));
    e.push(ln(1140, 508, 1200, 504, { stroke: INK, width: 3 }));
    e.push(ln(1140, 544, 1200, 540, { stroke: INK, width: 2.4 }));
    e.push(p('M 780 500 L 1000 486', { stroke: PALE, width: 2.2, opacity: 0.5 }));
    // 握枪的手
    e.push(p('M 700 900 L 700 780 C 700 720, 720 690, 760 670 L 820 720 L 780 900 Z', { fill: 'none', stroke: INK, width: 3.6 }));
    e.push(p('M 760 660 C 800 640, 840 640, 870 660', { stroke: INK, width: 3.2 }));
    e.push(p('M 800 700 C 840 690, 880 700, 900 720', { stroke: INK, width: 2.8 }));
    e.push(p('M 790 740 C 830 730, 860 740, 880 760', { stroke: INK, width: 2.6 }));
    e.push(p('M 820 780 C 850 770, 870 780, 890 795', { stroke: INK, width: 2.2 }));
    e.push(ln(790, 820, 850, 806, { stroke: MID, width: 1.8, opacity: 0.6 }));
    // 前景虚焦
    e.push(ln(40, 856, 620, 866, { stroke: MID, width: 18, opacity: 0.18 }));
    return e;
  };

  // 61 握手插镜：达成交易
  C.handshakeInsert = function (o) {
    o = o || {};
    const e = [];
    // 背景：两个模糊人影
    e.push.apply(e, figure(430, 760, 300, { sil: true, pose: 'stand', coat: true, ink: SOFT }));
    e.push.apply(e, figure(1170, 760, 300, { sil: true, pose: 'stand', ink: SOFT }));
    e.push(p('M 0 0 L 0 900 L 1600 900 L 1600 0 Z', { stroke: 'none', width: 0 }));
    // 桌面
    e.push(ln(40, 700, 1560, 680, { stroke: INK, width: 4 }));
    e.push(ln(40, 760, 1560, 740, { stroke: MID, width: 1.6, opacity: 0.5 }));
    // 两只手（相握）
    e.push(p('M 200 900 L 260 720 C 300 640, 400 610, 520 630 C 600 644, 660 674, 700 704', { stroke: GRAY, width: 46 }));
    e.push(p('M 1400 900 L 1340 720 C 1300 640, 1200 610, 1080 630 C 1000 644, 940 674, 900 704', { stroke: GRAY, width: 46 }));
    e.push(p('M 500 620 C 640 560, 780 566, 900 610 C 960 634, 980 686, 940 720 C 880 770, 740 780, 640 742 C 560 712, 512 670, 500 620 Z', { fill: 'none', stroke: INK, width: 4 }));
    e.push(p('M 540 604 C 640 570, 760 576, 860 606', { stroke: INK, width: 3 }));
    e.push(p('M 540 650 C 650 620, 780 626, 880 656 M 560 696 C 660 668, 780 674, 900 704', { stroke: MID, width: 2.4 }));
    e.push(p('M 560 730 C 680 700, 800 706, 920 740', { stroke: INK, width: 2.8 }));
    e.push(p('M 600 660 L 640 700 M 700 646 L 740 690 M 800 650 L 840 692', { stroke: MID, width: 1.8, opacity: 0.7 }));
    // 侧光
    e.push(ln(440, 780, 1180, 760, { stroke: PALE, width: 2, opacity: 0.3 }));
    // 前景桌沿
    e.push(p('M 0 900 L 0 860 L 1600 830 L 1600 900 Z', { fill: 'hatch', stroke: 'none', width: 0, opacity: 0.2 }));
    return e;
  };

  // 62 桌面证物插镜：信 / 钥匙 / 照片
  C.deskInsert = function (o) {
    o = o || {};
    const e = [];
    // 桌面木纹
    for (let i = 0; i < 9; i++) e.push(ln(60, 190 + i * 78, 1540, 176 + i * 78, { stroke: SOFT, width: 1, opacity: 0.24 }));
    // 台灯光
    e.push(el(360, 300, 110, 110, { stroke: PALE, width: 2, opacity: 0.55 }));
    e.push(p('M 470 330 L 820 250 L 1000 760 L 620 820 Z', { fill: 'hatch', stroke: 'none', width: 0, opacity: 0.1 }));
    e.push(ln(300, 900, 300, 560, { stroke: INK, width: 4 }));
    e.push(p('M 240 560 L 360 560 L 330 500 L 270 500 Z', { stroke: INK, width: 3 }));
    // 信纸
    e.push(p('M 600 480 L 980 460 L 1000 700 L 620 720 Z', { stroke: INK, width: 3.4 }));
    for (let i = 0; i < 6; i++) e.push(ln(630 + i * 2, 520 + i * 30, 950 + i * 2, 504 + i * 30, { stroke: MID, width: 1.6, opacity: 0.55 }));
    e.push(p('M 900 640 C 920 620, 940 640, 930 660 C 920 680, 890 670, 890 650 C 890 630, 930 610, 950 630', { stroke: INK, width: 1.8 }));
    // 照片
    e.push(p('M 380 640 L 560 630 L 570 740 L 390 750 Z', { stroke: INK, width: 3 }));
    e.push(p('M 400 655 L 545 647 L 550 720 L 405 728 Z', { stroke: MID, width: 1.6, opacity: 0.6 }));
    e.push(el(470, 682, 26, 30, { stroke: MID, width: 1.8 }));
    // 钥匙
    e.push(el(1120, 620, 26, 26, { stroke: INK, width: 2.6 }));
    e.push(ln(1146, 620, 1240, 616, { stroke: INK, width: 3 }));
    e.push(ln(1210, 616, 1210, 640, { stroke: INK, width: 2.4 }));
    e.push(ln(1232, 616, 1232, 634, { stroke: INK, width: 2.2 }));
    // 烟灰缸
    e.push(el(1180, 800, 90, 24, { stroke: INK, width: 3 }));
    e.push(el(1180, 790, 70, 14, { stroke: MID, width: 1.8 }));
    e.push(ln(1220, 780, 1260, 740, { stroke: INK, width: 2.4 }));
    e.push(p('M 1260 740 C 1300 720, 1300 680, 1270 660', { stroke: SOFT, width: 1.4, opacity: 0.45 }));
    // 一只手入画
    e.push(p('M 1560 900 L 1520 780 C 1500 730, 1460 700, 1400 690', { stroke: INK, width: 3.6 }));
    e.push(p('M 1400 690 C 1360 684, 1330 700, 1310 720', { stroke: INK, width: 3 }));
    // 前景暗角
    e.push(p('M 0 900 L 0 840 L 1600 800 L 1600 900 Z', { fill: 'hatch', stroke: 'none', width: 0, opacity: 0.2 }));
    return e;
  };

  // 63 水洼倒影：低机位 / 路灯与人的倒影
  C.puddleReflection = function (o) {
    o = o || {};
    const e = [];
    e.push.apply(e, skyline(520, { near: false, mid: true, far: true }));
    e.push(ln(0, 500, 1600, 500, { stroke: GRAY, width: 2.4 }));
    // 店面剪影
    e.push(p('M 40 900 L 40 320 L 400 360 L 440 900 Z', { fill: GRAY, stroke: INK, width: 3 }));
    e.push(p('M 1560 900 L 1560 350 L 1200 320 L 1160 900 Z', { fill: GRAY, stroke: INK, width: 3 }));
    // 路灯
    e.push.apply(e, lampPost(520, 620, 380, { dir: 1 }));
    // 湿地面
    e.push(ln(0, 620, 1600, 610, { stroke: INK, width: 3.4 }));
    // 水洼
    e.push(p('M 280 900 C 360 740, 700 700, 960 720 C 1240 740, 1420 810, 1500 900 Z', { stroke: MID, width: 2.4 }));
    e.push(p('M 360 880 C 460 760, 740 730, 980 750 C 1200 770, 1340 830, 1400 890', { stroke: SOFT, width: 1.4, opacity: 0.6 }));
    // 倒影：灯的拉伸
    e.push(p('M 500 730 L 470 860 M 545 730 L 570 860 M 520 730 L 520 880', { stroke: PALE, width: 2.2, opacity: 0.5 }));
    e.push(p('M 600 760 C 620 800, 620 840, 600 872', { stroke: MID, width: 1.6, opacity: 0.5 }));
    // 倒影：人
    e.push(p('M 860 780 C 830 800, 830 840, 850 858 C 870 878, 900 870, 910 850 C 920 830, 900 800, 860 780 Z', { fill: GRAY, stroke: 'none', width: 0, opacity: 0.5 }));
    e.push(el(872, 806, 22, 26, { fill: GRAY, stroke: 'none', width: 0, opacity: 0.5 }));
    // 站在水洼边的人（只入画到膝）
    e.push.apply(e, figure(880, 660, 400, { sil: true, pose: 'stand', coat: true }));
    e.push(ln(820, 660, 940, 660, { stroke: INK, width: 3 }));
    // 雨与涟漪
    e.push.apply(e, rain(60, 100, 1540, 600, 60, { len: 28, opacity: 0.4 }));
    for (let i = 0; i < 6; i++) e.push(el(500 + i * 130, 820 + (i % 2) * 30, 40, 8, { stroke: SOFT, width: 1.3, opacity: 0.5 }));
    // 前景路沿
    e.push(p('M 0 900 L 0 870 L 1600 840 L 1600 900 Z', { fill: GRAY, stroke: INK, width: 2.6 }));
    return e;
  };

  // 64 烛光：极简暗场
  C.candleDark = function (o) {
    o = o || {};
    const e = [];
    // 暗室：周边排线
    e.push(p('M 0 0 L 0 900 L 340 900 L 340 0 Z', { fill: 'crosshatch', stroke: 'none', width: 0, opacity: 0.3 }));
    e.push(p('M 1600 0 L 1600 900 L 1260 900 L 1260 0 Z', { fill: 'crosshatch', stroke: 'none', width: 0, opacity: 0.3 }));
    // 桌面
    e.push(ln(260, 700, 1340, 676, { stroke: INK, width: 4 }));
    e.push(ln(260, 700, 260, 900, { stroke: INK, width: 3 }));
    e.push(ln(1340, 676, 1340, 900, { stroke: INK, width: 3 }));
    // 烛台与蜡烛
    e.push(el(640, 700, 80, 16, { stroke: INK, width: 3 }));
    e.push(ln(640, 700, 640, 600, { stroke: INK, width: 6 }));
    e.push(rc(624, 530, 32, 74, { stroke: INK, width: 2.6 }));
    // 火焰与光晕
    e.push(p('M 640 528 C 620 500, 640 470, 640 452 C 640 470, 664 500, 640 528 Z', { stroke: INK, width: 2.4, fill: 'none' }));
    e.push(el(640, 490, 28, 44, { stroke: PALE, width: 2, opacity: 0.7 }));
    e.push(el(640, 500, 70, 96, { stroke: SOFT, width: 1.4, opacity: 0.35 }));
    // 光在桌面上的圈
    e.push(el(640, 690, 220, 40, { stroke: SOFT, width: 1.2, opacity: 0.35 }));
    // 空椅
    e.push(ln(1080, 900, 1080, 560, { stroke: INK, width: 4 }));
    e.push(ln(1080, 560, 1240, 552, { stroke: INK, width: 3.6 }));
    e.push(ln(1240, 900, 1240, 552, { stroke: INK, width: 3 }));
    e.push(ln(1080, 720, 1240, 712, { stroke: MID, width: 3 }));
    // 烟 / 余烬
    e.push(p('M 660 450 C 680 410, 650 380, 680 340', { stroke: SOFT, width: 1.4, opacity: 0.4 }));
    e.push(p('M 690 440 C 710 400, 690 370, 720 330', { stroke: SOFT, width: 1.1, opacity: 0.25 }));
    // 前景桌面暗部
    e.push(p('M 0 900 L 0 780 L 1600 740 L 1600 900 Z', { fill: 'hatch', stroke: 'none', width: 0, opacity: 0.25 }));
    return e;
  };

  // 65 低角度英雄入画
  C.lowAngleHero = function (o) {
    o = o || {};
    const e = [];
    e.push(p('M 640 150 C 840 116, 1020 160, 1220 128', { stroke: SOFT, width: 1.6, opacity: 0.4 }));
    e.push(ln(0, 900, 560, 150, { stroke: SOFT, width: 1.5, opacity: 0.5 }));
    e.push(ln(1600, 900, 1040, 150, { stroke: SOFT, width: 1.5, opacity: 0.5 }));
    e.push(ln(240, 900, 660, 150, { stroke: SOFT, width: 1, opacity: 0.28 }));
    e.push(ln(1360, 900, 940, 150, { stroke: SOFT, width: 1, opacity: 0.28 }));
    e.push.apply(e, skyline(540, { far: true, mid: true, near: false, windows: true }));
    e.push(ln(0, 540, 1600, 540, { stroke: GRAY, width: 2.4 }));
    e.push.apply(e, haze(535, { n: 2, gap: 8 }));
    e.push.apply(e, lampPost(280, 600, 230, { dir: 1 }));
    e.push.apply(e, lampPost(1360, 610, 200, { dir: -1 }));
    e.push(el(1220, 566, 52, 16, { stroke: PALE, width: 1.8, opacity: 0.55 }));
    e.push(p('M 1180 566 L 1040 520 L 1040 620 L 1180 586 Z', { fill: 'crosshatch', stroke: SOFT, width: 1.2, opacity: 0.22 }));
    e.push(ln(0, 858, 1600, 838, { stroke: INK, width: 3.4 }));
    for (let i = 0; i < 9; i++) e.push(ln(rr(40, 1540), rr(872, 894), rr(60, 1560), rr(866, 890), { stroke: SOFT, width: 1.4, opacity: 0.25 }));
    e.push(p('M 0 900 L 0 872 L 1600 842 L 1600 900 Z', { fill: 'hatch', stroke: 'none', width: 0, opacity: 0.16 }));
    e.push.apply(e, figure(720, 862, 670, { sil: true, pose: 'walk', coat: true }));
    e.push.apply(e, shadowPatch(720, 868, 340));
    e.push(p('M 790 260 C 806 400, 808 600, 800 800 M 700 430 L 696 620 M 760 450 L 762 700', { stroke: PALE, width: 2.4, opacity: 0.45 }));
    e.push(p('M 742 470 C 748 560, 750 680, 748 790', { stroke: PALE, width: 1.6, opacity: 0.3 }));
    e.push.apply(e, rain(60, 160, 1540, 800, 60, { len: 26, opacity: 0.35 }));
    e.push(ln(240, 700, 520, 690, { stroke: MID, width: 2, dash: '18 12', opacity: 0.5 }));
    e.push(ln(1100, 710, 1380, 700, { stroke: MID, width: 2, dash: '18 12', opacity: 0.5 }));
    e.push(ln(0, 900, 1600, 890, { stroke: INK, width: 5 }));
    for (let i = 0; i < 12; i++) e.push(el(rr(520, 1100), rr(200, 500), rr(1.4, 3), rr(1.4, 3), { fill: PALE, stroke: 'none', width: 0, opacity: rr(0.3, 0.6) }));
    return e;
  };
  /* ==========================================================================
   * 6. 预设装配：自动镜号、焦段、运镜标记
   * ========================================================================== */
  const LENS_BY_SIZE = {
    ELS: '24MM', LS: '32MM', MLS: '35MM', MS: '50MM', MCU: '65MM', CU: '85MM', ECU: '100MM',
    OTS: '50MM', POV: '24MM', INSERT: '50MM', AERIAL: '24MM'
  };

  const MOVE_MARK = {
    '固定': function () { return []; },
    '推镜': function () { return markPush(132, 'PUSH IN'); },
    '拉镜': function () { return markPush(138, 'PULL OUT'); },
    '变焦': function () { return markPush(144, 'ZOOM'); },
    '横移': function () { return markMove(260, 800, 940, 800, 'PAN'); },
    '跟拍': function () { return markMove(250, 786, 810, 770, 'TRACKING'); },
    '手持': function () { return markHandheld(); },
    '摇镜': function () { return markMove(290, 812, 960, 792, 'PAN'); },
    '升降': function () { return [ln(1512, 780, 1512, 330, { stroke: MID, width: 2.2, dash: '14 9', arrowEnd: true, opacity: 0.85 }), tx(1528, 320, 'TILT', { size: 17, fill: MID })]; }
  };

  const PRESETS = [];
  let SHOT_INDEX = 0;

  function addPreset(id, name, en, category, tags, shotSize, angle, movement, duration, note, sceneFn, opts) {
    opts = opts ? Object.assign({}, opts) : {};
    const bg = opts.bg || PAPER;
    const silent = !!opts.noSlate;
    const plain = !!opts.noMark;
    delete opts.bg;
    delete opts.noSlate;
    delete opts.noMark;
    const elements = sceneFn(opts);
    if (!silent) {
      SHOT_INDEX += 1;
      const no = SHOT_INDEX < 10 ? '0' + SHOT_INDEX : '' + SHOT_INDEX;
      elements.push.apply(elements, slate('SHOT ' + no, opts.lens || LENS_BY_SIZE[shotSize] || '35MM'));
    }
    if (!plain) elements.push.apply(elements, MOVE_MARK[movement]());
    PRESETS.push({
      id: id, name: name, en: en, category: category, tags: tags,
      shotSize: shotSize, angle: angle, movement: movement, duration: duration,
      note: note, featured: false, drawing: { bg: bg, elements: elements }
    });
  }

  function addFeatured() {
    addPreset.apply(null, arguments);
    PRESETS[PRESETS.length - 1].featured = true;
  }

  /* ==========================================================================
   * 7. film —— 电影感 / 好莱坞语法
   * ========================================================================== */
  addFeatured(
    'film-night-city', '夜城定场', 'NIGHT CITY', 'film',
    ['定场', '大远景', '城市', '雨夜', '河面'], 'ELS', '平视', '固定', 4.0,
    '先给空城，再让主角从画面右侧进入。',
    C.cityNight, { lens: '24MM' }
  );
  addPreset('film-city-aerial', '鸟瞰城市', 'AERIAL CITY', 'film',
    ['航拍', '城市', '夜景', '车流'], 'AERIAL', '鸟瞰', '升降', 3.5,
    '航拍从城市上空压下来，先交代尺度。',
    C.cityAerial, {});
  addPreset('film-street-rain', '雨夜街道', 'RAIN STREET', 'film',
    ['雨夜', '街道', '横移', '霓虹'], 'LS', '平视', '横移', 3.2,
    '雨夜街道横移，让伞下的人始终压住画面中线。',
    C.streetRain, {});
  addPreset('film-bridge-cable', '跨江大桥', 'BRIDGE SPAN', 'film',
    ['大桥', '水面', '推镜', '纵深'], 'ELS', '仰视', '推镜', 4.0,
    '桥塔先入画，再推到桥面上两个小小的人。',
    C.bridgeSpan, {});
  addPreset('film-rooftop-edge', '天台边缘', 'ROOFTOP EDGE', 'film',
    ['天台', '城市', '边缘', '夜风'], 'ELS', '平视', '固定', 3.0,
    '天台边缘，城市在脚下，风把衣角吹起来。',
    C.rooftop, {});
  addPreset('film-window-rain', '雨窗内外', 'RAIN WINDOW', 'film',
    ['雨窗', '室内', '背影', '城市'], 'LS', '平视', '推镜', 3.5,
    '从窗内推向玻璃上的雨，人物始终在前景。',
    C.windowRain, {});
  addPreset('film-train-platform', '站台纵深', 'TRAIN PLATFORM', 'film',
    ['站台', '列车', '纵深', '夜'], 'ELS', '平视', '固定', 3.0,
    '站台纵深先立住，列车灯把地面扫亮。',
    C.trainPlatform, {});
  addPreset('film-car-night', '车内夜路', 'CAR NIGHT', 'film',
    ['车内', '主观', '雨夜', '车灯'], 'MS', '主观', '跟拍', 2.5,
    '车内主观，雨刷每摆一次就给一次路灯光。',
    C.carInterior, {});
  addPreset('film-corridor-dolly', '走廊推近', 'CORRIDOR DOLLY', 'film',
    ['走廊', '对称', '推镜', '压迫'], 'LS', '平视', '推镜', 3.0,
    '对称走廊缓慢推近，压迫感来自透视本身。',
    C.corridor, { mode: 'dolly' });
  addFeatured(
    'film-silhouette-door', '门框剪影', 'DOOR SILHOUETTE', 'film',
    ['剪影', '门框', '逆光', '背影', '悬念'], 'LS', '侧逆光', '固定', 3.0,
    '门框里只留一个背影，光比就是戏。',
    C.doorSilhouette, { lens: '32MM' }
  );
  addPreset('film-field-lone', '旷野孤影', 'LONE FIELD', 'film',
    ['旷野', '留白', '地平线', '孤独'], 'ELS', '平视', '固定', 4.0,
    '旷野留白，人物小到几乎被天地吞掉。',
    C.fieldDusk, {});
  addPreset('film-crowd-hero', '人潮逆光', 'CROWD BACKLIGHT', 'film',
    ['人潮', '逆光', '主角', '推镜'], 'LS', '平视', '推镜', 3.0,
    '人潮逆光，主角静止，镜头慢慢逼近。',
    C.crowdStation, {});
  addPreset('film-underpass-exit', '地下通道', 'UNDERPASS', 'film',
    ['通道', '尽头光', '背影', '悬疑'], 'LS', '平视', '固定', 3.5,
    '地下通道尽头有光，背影往里走，别给脸。',
    C.underpass, {});
  addPreset('film-bar-dark', '吧台暗部', 'BAR COUNTER', 'film',
    ['酒吧', '暗部', '横移', '人物'], 'LS', '侧逆光', '横移', 3.0,
    '吧台横移，前景酒杯虚焦，人物藏在暗部。',
    C.barCounter, {});

  /* ==========================================================================
   * 8. drama —— 短剧钩子 / 爽点 / 反转
   * ========================================================================== */
  addFeatured(
    'drama-phone-hook', '手机钩子', 'PHONE HOOK', 'drama',
    ['手机', '特写', '推镜', '钩子', '夜'], 'CU', '平视', '推镜', 2.0,
    '屏幕亮起的一瞬，把观众钉在脸上。',
    C.phoneFace, { lens: '85MM' }
  );
  addPreset('drama-phone-message', '屏幕插镜', 'PHONE MESSAGE', 'drama',
    ['手机', '消息', '插镜', '反转'], 'INSERT', '俯视', '固定', 2.0,
    '手机屏插镜，一行字就够翻转剧情。',
    C.phoneScreen, { mode: 'msg' });
  addPreset('drama-door-enter', '推门而入', 'DOOR ENTER', 'drama',
    ['推门', '逆光', '进入', '悬念'], 'LS', '侧逆光', '推镜', 2.5,
    '门开一条缝，光先进入画，人随后。',
    C.doorwayEnter, {});
  addPreset('drama-storefront', '便利店外', 'STORE FRONT', 'drama',
    ['便利店', '夜', '玻璃', '对峙'], 'LS', '平视', '固定', 3.0,
    '便利店的玻璃前，门里门外是两个世界。',
    C.storefront, {});
  addPreset('drama-hotel-hall', '酒店长廊', 'HOTEL HALL', 'drama',
    ['酒店', '长廊', '跟拍', '悬疑'], 'LS', '平视', '跟拍', 3.0,
    '长焦走廊别停步，门牌一闪而过。',
    C.hotelHall, { lens: '50MM' });
  addPreset('drama-apartment', '客厅定场', 'APARTMENT', 'drama',
    ['客厅', '定场', '空房', '城市'], 'LS', '平视', '固定', 3.5,
    '客厅定场，让观众先看清家里的空。',
    C.apartment, {});
  addPreset('drama-kitchen-fridge', '冰箱冷光', 'FRIDGE LIGHT', 'drama',
    ['厨房', '冰箱', '冷光', '夜'], 'MS', '平视', '手持', 2.5,
    '冰箱冷光切在半张脸上，不敢开灯。',
    C.kitchen, {});
  addPreset('drama-interrogation', '审讯对峙', 'INTERROGATION', 'drama',
    ['审讯', '顶光', '对峙', '压迫'], 'MS', '仰视', '固定', 4.0,
    '顶灯压着桌面，两人的脸都在暗处。',
    C.interrogation, {});
  addPreset('drama-balcony-call', '阳台来电', 'BALCONY CALL', 'drama',
    ['阳台', '城市', '电话', '孤独'], 'LS', '平视', '固定', 3.0,
    '阳台打电话，城市在身后，话却说不出口。',
    C.balcony, {});
  addPreset('drama-bus-stop', '雨棚等车', 'BUS STOP', 'drama',
    ['公交站', '雨夜', '等待', '车灯'], 'LS', '平视', '固定', 3.0,
    '雨棚下等车，远处车灯越来越近。',
    C.busStop, {});
  addPreset('drama-bathroom-mirror', '镜前的人', 'BATHROOM MIRROR', 'drama',
    ['浴室', '镜子', '蒸汽', '推镜'], 'MS', '平视', '推镜', 3.0,
    '镜子里先看见脸，再看见站在镜前的人。',
    C.bathroomMirror, {});
  addPreset('drama-stairwell-hide', '楼梯藏身', 'STAIRWELL HIDE', 'drama',
    ['楼梯间', '躲藏', '俯拍', '紧张'], 'MS', '俯视', '手持', 2.5,
    '楼梯间藏着喘息，听脚步声靠近。',
    C.stairwell, { mode: 'sit' });
  addPreset('drama-puddle-reflection', '水洼照人', 'PUDDLE MIRROR', 'drama',
    ['水洼', '倒影', '低机位', '雨'], 'INSERT', '俯视', '固定', 2.5,
    '水洼里先照见人，再抬头才看见脸。',
    C.puddleReflection, {});
  addPreset('drama-desk-clue', '桌面证物', 'DESK CLUE', 'drama',
    ['桌面', '证物', '插镜', '线索'], 'INSERT', '俯视', '推镜', 2.0,
    '桌上摊开的信，手指停在关键一行。',
    C.deskInsert, {});

  /* ==========================================================================
   * 9. dialogue —— 对话场
   * ========================================================================== */
  addFeatured(
    'dialogue-over-shoulder', '过肩对峙', 'OVER THE SHOULDER', 'dialogue',
    ['过肩', '对峙', '桌边', '视线'], 'OTS', '过肩', '固定', 3.5,
    '过肩压住前景，对面的人始终在焦点上。',
    C.ots, { lens: '50MM' }
  );
  addPreset('dialogue-two-shot-table', '隔桌双人', 'TABLE TWO SHOT', 'dialogue',
    ['双人', '桌边', '对称', '雨夜'], 'MLS', '平视', '固定', 3.5,
    '隔着桌子对坐，谁都不肯先移开视线。',
    C.twoShotTable, {});
  addPreset('dialogue-face-off', '站定对峙', 'FACE OFF', 'dialogue',
    ['对峙', '双人', '剪影', '压迫'], 'MS', '仰视', '固定', 3.0,
    '两人站定，中间那道光就是第三个人。',
    C.faceOff, {});
  addPreset('dialogue-bar', '吧台两端', 'BAR TALK', 'dialogue',
    ['酒吧', '对话', '横移', '暗部'], 'MS', '侧逆光', '横移', 3.0,
    '吧台两端说话，酒保在中间擦杯子。',
    C.barCounter, {});
  addPreset('dialogue-classroom', '教室后排', 'CLASSROOM', 'dialogue',
    ['教室', '学生', '秘密', '窗光'], 'MLS', '平视', '固定', 3.0,
    '后排传纸条，老师的声音在画外。',
    C.classroom, { two: true });
  addPreset('dialogue-office', '办公桌两侧', 'OFFICE TALK', 'dialogue',
    ['办公室', '百叶窗', '对话', '推镜'], 'MS', '平视', '推镜', 3.5,
    '办公桌两侧，屏幕冷光当补光。',
    C.officeRoom, { dialogue: true });
  addPreset('dialogue-car', '车内谈话', 'CAR TALK', 'dialogue',
    ['车内', '对话', '雨夜', '后视镜'], 'MS', '主观', '固定', 2.5,
    '车内对话，后视镜里交换一个眼神。',
    C.carInterior, { dialogue: true });
  addPreset('dialogue-elevator', '电梯同乘', 'ELEVATOR TALK', 'dialogue',
    ['电梯', '同乘', '沉默', '压迫'], 'MS', '平视', '固定', 3.0,
    '电梯里两个人，谁都没按楼层。',
    C.elevator, { two: true });
  addPreset('dialogue-mirror', '镜中对白', 'MIRROR TALK', 'dialogue',
    ['镜子', '对白', '前景背影', '推镜'], 'MS', '平视', '推镜', 3.0,
    '对着镜子说话，镜里镜外两个答案。',
    C.mirrorTalk, {});
  addPreset('dialogue-walk-talk', '并肩交谈', 'WALK AND TALK', 'dialogue',
    ['并肩', '行走', '跟拍', '夜街'], 'MLS', '平视', '跟拍', 3.0,
    '并肩走，话赶着脚步，谁也没看谁。',
    C.walkingTalk, {});
  addPreset('dialogue-window-seat', '窗边被打断', 'WINDOW TALK', 'dialogue',
    ['窗边', '独坐', '雨', '打断'], 'MS', '平视', '固定', 3.0,
    '窗边独坐的人，被另一个人打断。',
    C.windowSeat, {});
  addPreset('dialogue-interrogation', '审讯桌旁', 'INTERROGATION TALK', 'dialogue',
    ['审讯', '桌边', '顶光', '沉默'], 'MS', '俯视', '固定', 4.0,
    '审讯桌两侧，灯泡晃了一下。',
    C.interrogation, {});
  addPreset('dialogue-phone-call', '听电话的侧脸', 'PHONE LISTEN', 'dialogue',
    ['电话', '侧脸', '轮廓光', '沉默'], 'MCU', '侧逆光', '固定', 2.5,
    '电话贴着耳朵，侧脸只有一道轮廓光。',
    C.faceProfile, {});

  /* ==========================================================================
   * 10. action —— 动作 / 追逐
   * ========================================================================== */
  addFeatured(
    'action-low-angle-hero', '低角英雄', 'LOW ANGLE HERO', 'action',
    ['低机位', '仰拍', '英雄', '入画', '跟拍'], 'MS', '仰视', '跟拍', 2.5,
    '低机位跟上去，让英雄踩着镜头走进来。',
    C.lowAngleHero, { lens: '24MM' }
  );
  addFeatured(
    'action-corridor-chase', '走廊追拍', 'CORRIDOR CHASE', 'action',
    ['走廊', '追逐', '手持', '跟拍', '压迫'], 'MLS', '平视', '手持', 3.0,
    '手持紧跟，走廊尽头永远差一步。',
    C.corridor, { mode: 'chase' }
  );
  addPreset('action-stair-chase', '楼梯折返', 'STAIR CHASE', 'action',
    ['楼梯', '追逐', '折返', '手持'], 'MS', '俯视', '手持', 2.5,
    '楼梯折返追，画框跟着脚步一起晃。',
    C.stairwell, { mode: 'chase' });
  addPreset('action-roof-chase', '屋顶追逐', 'ROOF CHASE', 'action',
    ['屋顶', '追逐', '城市', '危险'], 'MS', '仰视', '手持', 2.5,
    '屋顶追过去，城市在脚下退成背景。',
    C.rooftop, { chase: true });
  addPreset('action-train-chase', '站台狂奔', 'PLATFORM RUN', 'action',
    ['站台', '奔跑', '列车', '手持'], 'MLS', '平视', '手持', 3.0,
    '站台奔向车门，列车灯从侧面扫过。',
    C.trainPlatform, { chase: true });
  addPreset('action-car-chase', '雨夜追车', 'CAR CHASE', 'action',
    ['追车', '雨夜', '车灯', '跟拍'], 'MS', '平视', '跟拍', 3.0,
    '车灯咬住车尾，雨把路面变成镜子。',
    C.carExterior, { chase: true });
  addPreset('action-fight-impact', '冲击一帧', 'IMPACT FRAME', 'action',
    ['打斗', '冲击', '定格', '手持'], 'MS', '平视', '手持', 1.5,
    '拳头接触的一帧，所有线都向外炸开。',
    C.impactFight, {});
  addPreset('action-gun-insert', '枪口插镜', 'GUN INSERT', 'action',
    ['枪', '插镜', '手部', '威胁'], 'INSERT', '侧逆光', '推镜', 2.0,
    '枪口插镜，手指收紧比开枪更吓人。',
    C.gunInsert, {});
  addPreset('action-phone-drop', '手机坠落', 'PHONE DROP', 'action',
    ['坠落', '手机', '慢动作', '失重'], 'INSERT', '俯视', '手持', 1.5,
    '手机脱手，所有声音都被拉长。',
    C.phoneDrop, {});
  addPreset('action-garage-lurk', '车库伏击', 'GARAGE LURK', 'action',
    ['车库', '埋伏', '灯管', '影子'], 'LS', '仰视', '固定', 3.0,
    '车库里只有一根灯管在响，柱子后有人。',
    C.garage, {});
  addPreset('action-underpass-track', '通道追踪', 'UNDERPASS TRACK', 'action',
    ['通道', '追踪', '背影', '跟拍'], 'LS', '侧逆光', '跟拍', 3.0,
    '通道尽头有人回头，脚步先停住。',
    C.underpass, {});
  addPreset('action-subway-last', '末班进站', 'LAST TRAIN', 'action',
    ['地铁', '末班车', '灯光', '危险'], 'LS', '平视', '手持', 3.0,
    '末班车进站，灯光一节一节推近。',
    C.subwayPlatform, {});
  addPreset('action-tunnel-chase', '隧道追光', 'TUNNEL CHASE', 'action',
    ['隧道', '追车', '出口', '速度'], 'MS', '仰视', '跟拍', 2.5,
    '隧道尽头白得刺眼，前面的尾灯不能丢。',
    C.tunnelExit, { chase: true });
  addPreset('action-warehouse-ambush', '仓库伏兵', 'WAREHOUSE AMBUSH', 'action',
    ['仓库', '伏击', '高窗', '静止'], 'ELS', '俯视', '固定', 4.0,
    '仓库高窗漏光，谁先动谁就输。',
    C.warehouse, {});

  /* ==========================================================================
   * 11. emotion —— 情绪 / 特写
   * ========================================================================== */
  addFeatured(
    'emotion-hand-close', '指节收紧', 'CLENCHED HAND', 'emotion',
    ['手', '大特写', '情绪', '攥紧'], 'ECU', '平视', '固定', 1.5,
    '手比脸诚实，指节一点点收紧。',
    C.handEmotion, { state: 'fist', lens: '100MM' }
  );
  addPreset('emotion-hand-open', '松开的手', 'OPEN HAND', 'emotion',
    ['手', '大特写', '松开', '失去'], 'ECU', '平视', '固定', 1.5,
    '手松开，留不住的都从指缝漏走。',
    C.handEmotion, { state: 'open' });
  addPreset('emotion-eye-close', '红了的眼', 'EYE CLOSE', 'emotion',
    ['眼睛', '大特写', '隐忍', '泪'], 'ECU', '平视', '固定', 2.0,
    '眼睛先红，泪才落下来。',
    C.eyeEmotion, {});
  addPreset('emotion-face-profile', '侧脸逆光', 'PROFILE LIGHT', 'emotion',
    ['侧脸', '特写', '轮廓光', '沉默'], 'CU', '侧逆光', '固定', 3.0,
    '侧脸贴着窗，光只给一条边。',
    C.faceProfile, { gaze: false });
  addPreset('emotion-face-front', '正面隐忍', 'FRONTAL FEAR', 'emotion',
    ['正面', '特写', '隐忍', '推镜'], 'CU', '平视', '推镜', 2.5,
    '正视镜头，所有情绪都压在下颌。',
    C.faceFrontal, { tear: true });
  addPreset('emotion-rain-glass', '雨玻璃掌印', 'RAIN GLASS', 'emotion',
    ['雨', '玻璃', '手掌', '脸'], 'ECU', '平视', '推镜', 2.5,
    '手掌按在雨玻璃上，脸在玻璃那边。',
    C.rainGlass, {});
  addPreset('emotion-window-seat', '窗边独坐', 'WINDOW SIT', 'emotion',
    ['窗边', '独坐', '拉镜', '空'], 'MS', '平视', '拉镜', 3.0,
    '从窗边慢慢拉开，房间越来越空。',
    C.windowSeat, {});
  addPreset('emotion-mirror', '镜中先哭', 'MIRROR CRY', 'emotion',
    ['镜子', '情绪', '前景', '倒影'], 'MS', '平视', '固定', 3.0,
    '镜里的人比本人先哭。',
    C.mirrorTalk, {});
  addPreset('emotion-stair-sit', '楼梯坐一会', 'STAIR SIT', 'emotion',
    ['楼梯', '独坐', '俯拍', '留白'], 'MS', '俯视', '固定', 3.0,
    '楼梯上坐一会儿，让情绪沉下去。',
    C.stairwell, { mode: 'sit' });
  addPreset('emotion-empty-chair', '人去帘动', 'EMPTY CHAIR', 'emotion',
    ['空房', '椅子', '窗帘', '空镜'], 'MLS', '平视', '固定', 4.0,
    '人走了，窗帘还在动。',
    C.emptyRoomCurtain, {});
  addPreset('emotion-candle', '烛火一晃', 'CANDLE', 'emotion',
    ['烛光', '暗场', '影子', '推镜'], 'MS', '侧逆光', '推镜', 3.0,
    '烛火晃一下，影子就换了一个人。',
    C.candleDark, {});
  addPreset('emotion-crowd-alone', '人潮里的他', 'CROWD ALONE', 'emotion',
    ['人潮', '孤独', '逆光', '推镜'], 'LS', '平视', '推镜', 3.5,
    '人越多，他越像一个人。',
    C.crowdStation, {});
  addPreset('emotion-phone-light', '屏幕告解', 'PHONE LIGHT', 'emotion',
    ['手机', '冷光', '侧脸', '等待'], 'MCU', '侧逆光', '固定', 2.0,
    '屏幕光照着脸，等一句不会来的回复。',
    C.phoneFace, {});
  addPreset('emotion-bathroom-stare', '镜前凝视', 'MIRROR STARE', 'emotion',
    ['浴室', '镜子', '凝视', '推镜'], 'MS', '平视', '推镜', 2.5,
    '镜子里的人盯着自己，先移开视线。',
    C.bathroomMirror, {});

  /* ==========================================================================
   * 12. transition —— 空镜 / 转场
   * ========================================================================== */
  addFeatured(
    'transition-title-black', '黑场片名', 'TITLE CARD', 'transition',
    ['黑场', '片名', '极简', '转场'], 'INSERT', '平视', '固定', 1.5,
    '黑场只留片名，让观众先安静下来。',
    C.titleCard, { bg: '#141414', noSlate: true, noMark: true }
  );
  addPreset('transition-empty-room', '空房帘动', 'EMPTY ROOM', 'transition',
    ['空镜', '窗帘', '风', '灰尘'], 'MLS', '平视', '固定', 4.0,
    '空房、窗帘、风，用环境接下一场。',
    C.emptyRoomCurtain, {});
  addPreset('transition-lamp-puddle', '路灯水洼', 'LAMP PUDDLE', 'transition',
    ['路灯', '水洼', '雨', '空镜'], 'ELS', '俯视', '固定', 3.0,
    '路灯在水洼里碎掉，夜色接住上一场。',
    C.lampPuddle, {});
  addPreset('transition-clock', '钟面插镜', 'CLOCK INSERT', 'transition',
    ['时钟', '插镜', '时间', '推镜'], 'ECU', '俯视', '推镜', 2.0,
    '钟面插镜，时间替我们翻页。',
    C.clockInsert, {});
  addPreset('transition-tv-static', '电视雪花', 'TV STATIC', 'transition',
    ['电视', '雪花', '深夜', '空镜'], 'MS', '平视', '固定', 2.5,
    '电视雪花闪两下，声音先断。',
    C.tvStatic, {});
  addPreset('transition-overhead', '地板俯拍', 'OVERHEAD FLOOR', 'transition',
    ['俯拍', '地板', '静止', '现场'], 'ELS', '鸟瞰', '固定', 3.0,
    '俯拍地板，让画面静止一秒。',
    C.overheadFloor, {});
  addPreset('transition-road-away', '长路远去', 'ROAD AWAY', 'transition',
    ['公路', '背影', '拉镜', '告别'], 'ELS', '平视', '拉镜', 3.5,
    '长路拉远，人慢慢变成一个点。',
    C.roadWalkAway, {});
  addPreset('transition-window-rain', '雨窗空镜', 'RAIN WINDOW', 'transition',
    ['雨窗', '空镜', '城市', '静'], 'LS', '平视', '固定', 3.0,
    '雨窗空镜，玻璃替我们流泪。',
    C.windowRain, {});
  addPreset('transition-pool', '夜泳池面', 'POOL NIGHT', 'transition',
    ['泳池', '水面', '夜', '空镜'], 'LS', '俯视', '固定', 3.5,
    '泳池水面没人动，只有灯在晃。',
    C.poolNight, {});
  addPreset('transition-bridge-fog', '雾中大桥', 'BRIDGE FOG', 'transition',
    ['大桥', '雾', '水面', '转场'], 'ELS', '平视', '固定', 4.0,
    '雾里的桥，接住上一个镜头的情绪。',
    C.bridgeSpan, {});
  addPreset('transition-field', '旷野空镜', 'EMPTY FIELD', 'transition',
    ['旷野', '空镜', '风', '留白'], 'ELS', '平视', '固定', 4.0,
    '旷野空镜，风从画左吹到画右。',
    C.fieldDusk, { empty: true });
  addPreset('transition-corridor-empty', '空走廊', 'EMPTY CORRIDOR', 'transition',
    ['走廊', '空镜', '透视', '推镜'], 'LS', '平视', '推镜', 3.0,
    '空走廊，灯一盏一盏亮到尽头。',
    C.corridor, {});
  addPreset('transition-forest', '林间雾径', 'FOREST PATH', 'transition',
    ['森林', '雾', '小路', '空镜'], 'LS', '平视', '固定', 3.0,
    '林间小路，雾把时间藏起来。',
    C.forestPath, {});
  addPreset('transition-escalator', '扶梯上下', 'ESCALATOR', 'transition',
    ['扶梯', '商场', '人流', '转场'], 'LS', '平视', '固定', 3.0,
    '扶梯上上下下，城市在换气。',
    C.escalator, {});

  /* ==========================================================================
   * 13. basic —— 基础镜位
   * ========================================================================== */
  addPreset('basic-wide-street', '街道全景', 'WIDE STREET', 'basic',
    ['全景', '街道', '基础', '雨夜'], 'LS', '平视', '固定', 3.0,
    '基础全景：先交代街道和人物关系。',
    C.streetRain, {});
  addPreset('basic-establish-city', '城市定场', 'CITY WIDE', 'basic',
    ['定场', '大全景', '城市', '基础'], 'ELS', '平视', '固定', 3.5,
    '基础定场：城市天际线压住画面上沿。',
    C.cityNight, {});
  addPreset('basic-medium-walk', '中景行走', 'MEDIUM WALK', 'basic',
    ['中景', '行走', '跟拍', '人物'], 'MS', '平视', '跟拍', 2.5,
    '基础中景：人物全身入画，动作看得清。',
    C.walkingTalk, {});
  addPreset('basic-close-face', '正面特写', 'CLOSE FACE', 'basic',
    ['特写', '正面', '情绪', '基础'], 'CU', '平视', '固定', 2.0,
    '基础特写：整张脸占据画面，情绪可读。',
    C.faceFrontal, {});
  addPreset('basic-extreme-eye', '眼部大特写', 'EYE ECU', 'basic',
    ['大特写', '眼睛', '基础', '细节'], 'ECU', '平视', '固定', 1.5,
    '基础大特写：只留眼睛，其他都删掉。',
    C.eyeEmotion, {});
  addPreset('basic-insert-phone', '手机插镜', 'PHONE INSERT', 'basic',
    ['插镜', '手机', '信息', '基础'], 'INSERT', '俯视', '固定', 1.5,
    '基础插镜：手机屏幕交代关键信息。',
    C.phoneScreen, { mode: 'msg' });
  addPreset('basic-ots', '过肩基础', 'BASIC OTS', 'basic',
    ['过肩', '对话', '基础', '关系'], 'OTS', '过肩', '固定', 3.0,
    '基础过肩：前景压一边，对话关系成立。',
    C.ots, {});
  addPreset('basic-pov-street', '主观视角', 'POV STREET', 'basic',
    ['主观', '视角', '街道', '基础'], 'POV', '主观', '手持', 2.5,
    '基础主观：镜头就是角色的眼睛。',
    C.streetRain, {});
  addPreset('basic-low-angle', '低机位仰拍', 'LOW ANGLE', 'basic',
    ['仰拍', '低机位', '人物', '基础'], 'MS', '仰视', '跟拍', 2.0,
    '基础仰拍：低机位让人物显得更高。',
    C.lowAngleHero, {});
  addPreset('basic-high-angle', '高处俯拍', 'HIGH ANGLE', 'basic',
    ['俯拍', '高处', '空间', '基础'], 'LS', '俯视', '固定', 3.0,
    '基础俯拍：走廊在脚下延伸，人物变小。',
    C.hotelHall, {});
  addPreset('basic-two-shot', '双人基础', 'BASIC TWO SHOT', 'basic',
    ['双人', '对话', '基础', '空间'], 'MLS', '平视', '固定', 3.0,
    '基础双人：两个人都在画，空间关系清楚。',
    C.twoShotTable, {});
  addPreset('basic-silhouette', '剪影基础', 'BASIC SILHOUETTE', 'basic',
    ['剪影', '逆光', '轮廓', '基础'], 'LS', '侧逆光', '固定', 2.5,
    '基础剪影：背光下只保留轮廓。',
    C.doorSilhouette, {});
  addPreset('basic-insert-hand', '手部插镜', 'HAND INSERT', 'basic',
    ['插镜', '手', '局部', '基础'], 'ECU', '平视', '固定', 1.5,
    '基础手部插镜：用局部动作代替台词。',
    C.handEmotion, { state: 'fist' });

  /* ==========================================================================
   * 14. 暴露接口（兼容 node 校验：可预先设置 global.window）
   * ========================================================================== */
  if (typeof window !== 'undefined') window.SB_PRESETS = PRESETS;
  if (typeof module !== 'undefined' && module.exports) module.exports = PRESETS;
})();
