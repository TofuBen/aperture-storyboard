/* ============================================================
   APERTURE drawing primitives + offline fallback presets.
   Classic script: exposes window.SBDraw. No external dependencies.
   ============================================================ */
(function () {
  'use strict';

  const BG = '#f4f1e8';
  const INK = '#161512';
  const PAPER = '#f4f1e8';
  const FONT_SERIF = "'Bodoni 72','Didot','Songti SC','Noto Serif SC','Times New Roman',serif";
  const FONT_SANS = "'Helvetica Neue','PingFang SC','Hiragino Sans GB',Arial,sans-serif";
  const FONT_MONO = "'SFMono-Regular','SF Mono','Menlo','Roboto Mono',monospace";

  const COLOR_MAP = {
    ink: INK,
    black: '#141414',
    '#141414': '#141414',
    '#161512': '#161512',
    '#3b3a37': '#3b3a37',
    '#6f6c66': '#6f6c66',
    '#a9a49a': '#a9a49a',
    '#ded9cf': '#ded9cf',
    '#e8e3d7': '#e8e3d7',
    '#f4f1e8': PAPER,
    '#ffffff': PAPER,
    paper: PAPER,
    white: PAPER
  };

  function esc(v) {
    return String(v == null ? '' : v)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  function num(v, fallback) {
    const n = Number(v);
    return Number.isFinite(n) ? n : (fallback || 0);
  }

  function safeColor(c, fallback) {
    if (typeof c === 'string' && COLOR_MAP[c.toLowerCase()]) return COLOR_MAP[c.toLowerCase()];
    if (typeof c === 'string' && /^#[0-9a-f]{3,8}$/i.test(c)) {
      // Keep drawings monochrome: any supplied hex is thresholded toward a
      // neutral warm-gray so imported files never break the black & white look.
      const h = c.replace('#', '');
      const full = h.length === 3 ? h.split('').map(function (x) { return x + x; }).join('') : h.slice(0, 6);
      const r = parseInt(full.slice(0, 2), 16);
      const g = parseInt(full.slice(2, 4), 16);
      const b = parseInt(full.slice(4, 6), 16);
      if (![r, g, b].every(Number.isFinite)) return fallback || INK;
      const lum = Math.round(r * 0.299 + g * 0.587 + b * 0.114);
      if (lum < 50) return INK;
      if (lum < 115) return '#3b3a37';
      if (lum < 168) return '#6f6c66';
      if (lum < 215) return '#a9a49a';
      return '#ded9cf';
    }
    return fallback || INK;
  }

  function fillValue(fill) {
    if (fill === 'hatch') return 'url(#sb-hatch)';
    if (fill === 'crosshatch') return 'url(#sb-crosshatch)';
    if (!fill || fill === 'none' || fill === 'transparent') return 'none';
    return safeColor(fill, 'none');
  }

  function defsMarkup() {
    return '<defs>' +
      '<pattern id="sb-hatch" patternUnits="userSpaceOnUse" width="15" height="15" patternTransform="rotate(38)">' +
        '<line x1="0" y1="0" x2="0" y2="15" stroke="#161512" stroke-width="1.35" opacity="0.55"/>' +
      '</pattern>' +
      '<pattern id="sb-crosshatch" patternUnits="userSpaceOnUse" width="15" height="15" patternTransform="rotate(38)">' +
        '<line x1="0" y1="0" x2="0" y2="15" stroke="#161512" stroke-width="1.2" opacity="0.45"/>' +
        '<line x1="0" y1="15" x2="15" y2="0" stroke="#161512" stroke-width="1.2" opacity="0.45"/>' +
      '</pattern>' +
    '</defs>';
  }

  function arrowHeadPath(x1, y1, x2, y2, width) {
    const angle = Math.atan2(y2 - y1, x2 - x1);
    const size = 15 + width * 2.1;
    const spread = 0.5;
    const bx = x2 - Math.cos(angle) * size;
    const by = y2 - Math.sin(angle) * size;
    const px = Math.sin(angle) * size * spread;
    const py = -Math.cos(angle) * size * spread;
    return 'M ' + (x2).toFixed(2) + ' ' + (y2).toFixed(2) +
      ' L ' + (bx + px).toFixed(2) + ' ' + (by + py).toFixed(2) +
      ' L ' + (bx - px).toFixed(2) + ' ' + (by - py).toFixed(2) + ' Z';
  }

  function styleAttrs(el, opts) {
    const sw = Math.max(0, Math.min(40, num(el.width, 4)));
    const stroke = safeColor(el.stroke, INK);
    const fill = fillValue(el.fill);
    const opacity = Math.max(0, Math.min(1, num(el.opacity, 1)));
    const dash = el.dash ? ' stroke-dasharray="' + esc(el.dash) + '"' : '';
    let attrs = ' stroke="' + esc(stroke) + '" stroke-width="' + sw + '"' +
      ' stroke-linecap="round" stroke-linejoin="round" fill="' + esc(fill) + '"' + dash;
    if (opacity < 1) attrs += ' opacity="' + opacity.toFixed(3) + '"';
    return attrs;
  }

  let assetSourceRef = null;
  let assetMap = {};

  function getAsset(id) {
    const source = window.SB_ASSETS;
    if (source !== assetSourceRef) {
      assetSourceRef = source;
      assetMap = {};
      if (Array.isArray(source)) {
        source.forEach(function (asset) {
          if (asset && asset.id) assetMap[asset.id] = asset;
        });
      }
    }
    return assetMap[id] || null;
  }

  function primitiveMarkup(el) {
    if (!el || typeof el !== 'object') return '';
    const type = el.type;
    const size = Math.max(0, Math.min(200, num(el.size, 34)));
    let inner = '';

    if (type === 'image') {
      if (!el.src || !el.w || !el.h) return '';
      inner = '<image href="' + esc(el.src) + '" x="' + num(el.x, 0) + '" y="' + num(el.y, 0) +
        '" width="' + num(el.w, 0) + '" height="' + num(el.h, 0) + '" preserveAspectRatio="xMidYMid meet"/>';
    } else if (type === 'path') {
      if (!el.d) return '';
      inner = '<path d="' + esc(el.d) + '"' + styleAttrs(el) + '/>';
    } else if (type === 'line') {
      const x1 = num(el.x1, 0), y1 = num(el.y1, 0), x2 = num(el.x2, 0), y2 = num(el.y2, 0);
      const sw = Math.max(0, Math.min(40, num(el.width, 4)));
      inner = '<line x1="' + x1 + '" y1="' + y1 + '" x2="' + x2 + '" y2="' + y2 + '"' + styleAttrs(el) + '/>';
      if (el.arrowEnd) {
        inner += '<path d="' + arrowHeadPath(x1, y1, x2, y2, sw) + '" fill="' + esc(safeColor(el.stroke, INK)) +
          '" stroke="none" data-arrow-head="1"/>';
      }
    } else if (type === 'rect') {
      const w = num(el.w, 0), h = num(el.h, 0);
      if (w <= 0 || h <= 0) return '';
      const rx = Math.max(0, num(el.rx, 0));
      inner = '<rect x="' + num(el.x, 0) + '" y="' + num(el.y, 0) + '" width="' + w + '" height="' + h +
        '" rx="' + rx + '"' + styleAttrs(el) + '/>';
    } else if (type === 'ellipse') {
      const rx = num(el.rx, 0), ry = num(el.ry, 0);
      if (rx <= 0 || ry <= 0) return '';
      inner = '<ellipse cx="' + num(el.cx, 0) + '" cy="' + num(el.cy, 0) + '" rx="' + rx +
        '" ry="' + ry + '"' + styleAttrs(el) + '/>';
    } else if (type === 'text') {
      const text = el.text == null ? '' : String(el.text);
      if (!text) return '';
      const fill = safeColor(el.fill, INK) || INK;
      const anchor = el.anchor === 'middle' || el.anchor === 'end' ? el.anchor : 'start';
      const weight = String(el.weight || '400');
      const family = el.font === 'sans' ? FONT_SANS : (el.font === 'mono' ? FONT_MONO : FONT_SERIF);
      const italic = el.italic ? ' font-style="italic"' : '';
      const opacity = Math.max(0, Math.min(1, num(el.opacity, 1)));
      inner = '<text x="' + num(el.x, 0) + '" y="' + num(el.y, 0) + '" font-family="' + family +
        '" font-size="' + size + '" font-weight="' + esc(weight) + '" fill="' + esc(fill) +
        '" text-anchor="' + anchor + '"' + italic + (opacity < 1 ? ' opacity="' + opacity + '"' : '') +
        ' xml:space="preserve">' + esc(text) + '</text>';
    }
    return inner;
  }

  // Invisible, generous pointer target so thin pencil lines and shape
  // outlines are easy to select and erase.
  function hitMarkup(el) {
    if (!el || typeof el !== 'object') return '';
    const sw = Math.max(0, Math.min(40, num(el.width, 4)));
    const hit = ' fill="transparent" stroke="transparent" stroke-width="' + Math.max(24, sw + 18) + '" pointer-events="all"';
    if (el.type === 'image') {
      return '<rect x="' + num(el.x, 0) + '" y="' + num(el.y, 0) + '" width="' + num(el.w, 0) +
        '" height="' + num(el.h, 0) + '" fill="transparent" pointer-events="all"/>';
    }
    if (el.type === 'path' && el.d) {
      return '<path d="' + esc(el.d) + '" fill="none" stroke="transparent" stroke-width="' +
        Math.max(26, sw + 18) + '" pointer-events="stroke"/>';
    }
    if (el.type === 'line') {
      return '<line x1="' + num(el.x1, 0) + '" y1="' + num(el.y1, 0) + '" x2="' + num(el.x2, 0) +
        '" y2="' + num(el.y2, 0) + '" fill="none" stroke="transparent" stroke-width="' +
        Math.max(26, sw + 18) + '" pointer-events="stroke"/>';
    }
    if (el.type === 'rect') {
      return '<rect x="' + num(el.x, 0) + '" y="' + num(el.y, 0) + '" width="' + num(el.w, 0) +
        '" height="' + num(el.h, 0) + '"' + hit + '/>';
    }
    if (el.type === 'ellipse') {
      return '<ellipse cx="' + num(el.cx, 0) + '" cy="' + num(el.cy, 0) + '" rx="' + num(el.rx, 0) +
        '" ry="' + num(el.ry, 0) + '"' + hit + '/>';
    }
    if (el.type === 'text') {
      const size = Math.max(12, num(el.size, 34));
      const text = el.text == null ? '' : String(el.text);
      const width = Math.max(52, text.length * size * 0.82);
      return '<rect x="' + (num(el.x, 0) - 8) + '" y="' + (num(el.y, 0) - size * 1.08) +
        '" width="' + width + '" height="' + size * 1.4 + '" fill="transparent" pointer-events="all"/>';
    }
    return '';
  }

  function elementTransform(el) {
    const tx = num(el.tx, 0);
    const ty = num(el.ty, 0);
    const scaleX = Math.abs(num(el.scaleX, 1)) || 1;
    const scaleY = Math.abs(num(el.scaleY, 1)) || 1;
    const rotation = num(el.rotation, 0);
    const parts = [];
    if (tx || ty) parts.push('translate(' + tx + ' ' + ty + ')');
    if (rotation || scaleX !== 1 || scaleY !== 1) {
      const px = num(el.pivotX, 0);
      const py = num(el.pivotY, 0);
      parts.push('translate(' + px + ' ' + py + ') rotate(' + rotation + ') scale(' + scaleX + ' ' + scaleY + ') translate(' + (-px) + ' ' + (-py) + ')');
    }
    return parts.join(' ');
  }

  function assetTransform(el, asset) {
    const x = num(el.x, 0);
    const y = num(el.y, 0);
    const scale = Math.max(0.02, Math.min(20, num(el.scale, 1)));
    const rotation = num(el.rotation, 0);
    const parts = ['translate(' + x + ' ' + y + ')', 'scale(' + scale + ')'];
    if (rotation) {
      const cx = asset ? num(asset.width, 200) / 2 : 110;
      const cy = asset ? num(asset.height, 200) / 2 : 110;
      parts.push('translate(' + cx + ' ' + cy + ') rotate(' + rotation + ') translate(' + (-cx) + ' ' + (-cy) + ')');
    }
    return parts.join(' ');
  }

  function assetGroupMarkup(el, index, includeHit) {
    const asset = getAsset(el.assetId);
    const x = num(el.x, 0);
    const y = num(el.y, 0);
    const scale = Math.max(0.02, Math.min(20, num(el.scale, 1)));
    let inner = '';
    if (!asset) {
      inner = '<rect x="0" y="0" width="220" height="140" rx="12" fill="none" stroke="#a9a49a" stroke-width="4" stroke-dasharray="10 8"/>' +
        '<text x="110" y="78" text-anchor="middle" font-size="22" fill="#6f6c66" font-family="' + FONT_SANS + '">素材缺失</text>';
    } else {
      const elements = Array.isArray(asset.elements) ? asset.elements : [];
      inner = elements.map(function (child) { return primitiveMarkup(child); }).join('');
    }
    const hit = includeHit
      ? '<rect x="0" y="0" width="' + (asset ? Math.max(1, num(asset.width, 220)) : 220) +
        '" height="' + (asset ? Math.max(1, num(asset.height, 140)) : 140) +
        '" fill="transparent" pointer-events="all"/>'
      : '';
    return '<g data-el-index="' + (index == null ? '' : index) + '" data-asset-id="' + esc(el.assetId) +
      '" data-asset-x="' + x + '" data-asset-y="' + y + '" transform="' + assetTransform(el, asset) + '">' +
      inner + hit + '</g>';
  }

  function elementMarkup(el, index, includeHit) {
    if (!el || typeof el !== 'object' || typeof el.type !== 'string') return '';
    if (el.type === 'asset') return assetGroupMarkup(el, index, includeHit);
    const transform = elementTransform(el);
    const inner = primitiveMarkup(el);
    if (!inner) return '';
    const hit = includeHit ? hitMarkup(el) : '';
    return '<g data-el-index="' + (index == null ? '' : index) + '"' + (transform ? ' transform="' + transform + '"' : '') + '>' + inner + hit + '</g>';
  }

  function drawingMarkup(drawing, opts) {
    opts = opts || {};
    const d = drawing && typeof drawing === 'object' ? drawing : { elements: [] };
    const els = Array.isArray(d.elements) ? d.elements : [];
    const width = opts.width ? ' width="' + Math.round(opts.width) + '"' : '';
    const height = opts.height ? ' height="' + Math.round(opts.height) + '"' : '';
    const klass = opts.className ? ' class="' + esc(opts.className) + '"' : '';
    const bg = opts.includeBg === false ? '' :
      '<rect width="1600" height="900" fill="' + esc(safeColor(d.bg, BG)) + '"/>';
    const body = els.map(function (el, i) {
      return elementMarkup(el, opts.indexed === false ? null : i);
    }).join('');
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid meet"' +
      width + height + klass + '>' + defsMarkup() + bg + body + '</svg>';
  }

  function elementListMarkup(drawing, opts) {
    const els = drawing && Array.isArray(drawing.elements) ? drawing.elements : [];
    const hits = !!(opts && opts.hits);
    return defsMarkup() + els.map(function (el, i) { return elementMarkup(el, i, hits); }).join('');
  }

  function svgDataUri(drawing, width, height) {
    const svg = drawingMarkup(drawing, { width: width, height: height, includeBg: true, indexed: false });
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  }

  /* ----------------------------------------------------------
     Fallback preset collection (used only when presets.js fails
     to load). These eight shots also power the first-run demo.
     ---------------------------------------------------------- */

  const E = {
    line: function (x1, y1, x2, y2, width, extra) {
      return Object.assign({ type: 'line', x1: x1, y1: y1, x2: x2, y2: y2, width: width || 4 }, extra || {});
    },
    path: function (d, width, extra) {
      return Object.assign({ type: 'path', d: d, width: width || 4, fill: 'none' }, extra || {});
    },
    rect: function (x, y, w, h, width, extra) {
      return Object.assign({ type: 'rect', x: x, y: y, w: w, h: h, width: width || 4, fill: 'none' }, extra || {});
    },
    ellipse: function (cx, cy, rx, ry, width, extra) {
      return Object.assign({ type: 'ellipse', cx: cx, cy: cy, rx: rx, ry: ry, width: width || 4, fill: 'none' }, extra || {});
    },
    text: function (x, y, text, size, extra) {
      return Object.assign({ type: 'text', x: x, y: y, text: text, size: size || 30, fill: INK }, extra || {});
    },
    rain: function (x, y, count, len, gap) {
      let out = [];
      for (let i = 0; i < count; i++) {
        out.push(E.line(x + (i % 4) * (gap || 48), y + Math.floor(i / 4) * 43,
          x + (i % 4) * (gap || 48) - 18, y + Math.floor(i / 4) * 43 + (len || 56), 2, { stroke: '#6f6c66', opacity: 0.55 }));
      }
      return out;
    },
    figure: function (cx, cy, h, extra) {
      const s = h / 300;
      const out = [
        E.ellipse(cx, cy - 210 * s, 30 * s, 34 * s, 5),
        E.path('M ' + cx + ' ' + (cy - 173 * s) + ' C ' + (cx - 34 * s) + ' ' + (cy - 150 * s) +
          ', ' + (cx - 44 * s) + ' ' + (cy - 52 * s) + ', ' + (cx - 47 * s) + ' ' + (cy + 34 * s) +
          ' L ' + (cx + 47 * s) + ' ' + (cy + 34 * s) + ' C ' + (cx + 42 * s) + ' ' + (cy - 54 * s) +
          ', ' + (cx + 30 * s) + ' ' + (cy - 150 * s) + ', ' + cx + ' ' + (cy - 173 * s) + ' Z', 5),
        E.line(cx - 45 * s, cy + 28 * s, cx - 67 * s, cy + 170 * s, 5),
        E.line(cx + 44 * s, cy + 28 * s, cx + 62 * s, cy + 170 * s, 5),
        E.line(cx - 71 * s, cy + 178 * s, cx - 30 * s, cy + 178 * s, 5),
        E.line(cx + 58 * s, cy + 178 * s, cx + 98 * s, cy + 178 * s, 5)
      ];
      if (extra && extra.run) {
        out.splice(2, 3,
          E.line(cx - 45 * s, cy + 24 * s, cx - 110 * s, cy + 112 * s, 5),
          E.line(cx - 110 * s, cy + 112 * s, cx - 70 * s, cy + 200 * s, 5),
          E.line(cx + 44 * s, cy + 23 * s, cx + 95 * s, cy + 105 * s, 5),
          E.line(cx + 95 * s, cy + 105 * s, cx + 145 * s, cy + 80 * s, 5));
      }
      return out;
    }
  };

  function fallbackPresets() {
    let city = [
      E.ellipse(1268, 173, 66, 66, 3),
      E.line(72, 604, 1528, 604, 4),
      E.path('M 70 606 L 70 460 L 120 460 L 120 398 L 185 398 L 185 480 L 250 480 L 250 330 L 318 330 L 318 420 L 386 420 L 386 270 L 455 270 L 455 438 L 525 438 L 525 352 L 590 352 L 590 470 L 654 470 L 654 300 L 720 300 L 720 420 L 790 420 L 790 360 L 860 360 L 860 480 L 925 480 L 925 390 L 990 390 L 990 500 L 1052 500 L 1052 310 L 1120 310 L 1120 470 L 1185 470 L 1185 400 L 1245 400 L 1245 500 L 1310 500 L 1310 350 L 1378 350 L 1378 500 L 1450 500 L 1450 430 L 1528 430 L 1528 606', 4)
    ];
    for (let i = 0; i < 18; i++) {
      const x = 95 + (i * 81) % 1390;
      const y = 340 + (i * 53) % 190;
      city.push(E.rect(x, y, 16, 22, 0, { fill: '#a9a49a', stroke: '#a9a49a' }));
    }
    city.push(
      E.path('M 0 690 C 300 660, 610 672, 830 708 C 1030 740, 1300 735, 1600 692', 2),
      E.line(805, 900, 792, 685, 2, { opacity: 0.5 }),
      E.line(948, 900, 882, 690, 2, { opacity: 0.5 }),
      E.line(592, 900, 735, 690, 2, { opacity: 0.5 }),
      E.line(1010, 744, 1140, 738, 3, { arrowEnd: true }),
      E.text(92, 820, 'NIGHT CITY  /  02:14', 27, { font: 'mono' })
    );
    city = city.concat(E.rain(190, 210, 16, 46, 78));
    city.splice(2, 0, E.figure(835, 746, 190)[0], E.figure(835, 746, 190)[1], E.figure(835, 746, 190)[3], E.figure(835, 746, 190)[4], E.figure(835, 746, 190)[5]);
    city.push(E.path('M 120 690 L 360 690 L 306 900 L 20 900 Z', 0, { fill: 'hatch', stroke: 'none', opacity: 0.35 }));

    const silhouette = [
      E.rect(570, 118, 460, 668, 5),
      E.rect(611, 158, 378, 588, 2, { opacity: 0.7 }),
      E.line(60, 786, 1540, 786, 3),
      E.path('M 735 786 L 735 420 C 735 340, 870 340, 870 420 L 870 786', 3),
      E.path('M 640 230 L 370 118 M 640 350 L 300 330 M 640 500 L 330 610 M 960 230 L 1230 118 M 960 350 L 1300 330 M 960 500 L 1270 610', 1.5, { opacity: 0.35 }),
      E.ellipse(804, 425, 34, 42, 5, { fill: '#161512' }),
      E.path('M 804 467 C 758 478, 744 566, 748 662 L 748 786 L 782 786 L 798 662 L 816 786 L 858 786 L 854 650 C 864 548, 850 484, 804 467 Z', 5, { fill: '#161512' }),
      E.ellipse(1120, 609, 26, 31, 0, { fill: '#161512' }),
      E.path('M 1120 642 C 1098 650, 1090 706, 1094 786 L 1160 786 C 1164 700, 1152 650, 1120 642 Z', 0, { fill: '#161512' }),
      E.text(90, 838, 'DOORWAY  /  SILHOUETTE', 25, { font: 'mono', opacity: 0.65 })
    ];

    const phone = [
      E.path('M 1080 900 C 1010 790, 1020 700, 1090 620 C 1135 566, 1180 530, 1240 515 C 1300 498, 1360 520, 1390 570 L 1260 730 L 1330 900', 4),
      E.path('M 610 700 L 660 270 L 900 300 L 860 725 Z', 5, { fill: '#f4f1e8' }),
      E.path('M 632 690 L 676 292 L 880 318 L 844 700 Z', 3),
      E.rect(690, 345, 150, 290, 2, { opacity: 0.6 }),
      E.text(714, 430, '03:17', 60, { font: 'mono', weight: '600' }),
      E.text(714, 478, 'NO SIGNAL', 19, { font: 'mono', opacity: 0.6 }),
      E.ellipse(352, 570, 235, 300, 5),
      E.path('M 130 430 C 245 495, 235 680, 150 785 C 260 840, 450 790, 502 650', 4),
      E.path('M 560 555 L 1010 500 L 1300 190 L 1560 310 L 1300 620 L 1430 900 L 620 900 Z', 0, { fill: 'hatch', stroke: 'none', opacity: 0.35 }),
      E.text(102, 838, 'THE PHONE LIGHTS HER FACE', 24, { font: 'mono', opacity: 0.65 }),
      E.line(1064, 470, 890, 470, 3, { arrowEnd: true, opacity: 0.7 })
    ];

    const ots = [
      E.ellipse(258, 744, 166, 200, 4, { fill: '#3b3a37' }),
      E.path('M 74 900 C 98 740, 180 676, 266 676 C 356 676, 430 760, 450 900 Z', 0, { fill: '#3b3a37' }),
      E.ellipse(1000, 372, 73, 86, 5),
      E.path('M 1000 462 C 914 496, 890 620, 893 770 L 1108 770 C 1111 620, 1086 496, 1000 462 Z', 5),
      E.line(80, 744, 1520, 744, 4),
      E.rect(1128, 210, 290, 350, 3),
      E.line(1176, 250, 1368, 250, 2, { opacity: 0.55 }),
      E.line(1176, 290, 1332, 290, 2, { opacity: 0.55 }),
      E.path('M 915 400 L 760 420 M 1085 400 L 1180 425', 2, { opacity: 0.45 }),
      E.line(1012, 706, 1270, 690, 2, { arrowEnd: true, opacity: 0.55 }),
      E.text(90, 835, 'O.S.  /  STANDOFF', 24, { font: 'mono', opacity: 0.65 }),
      E.text(1250, 812, 'HER', 18, { font: 'mono', anchor: 'end', opacity: 0.45 })
    ];

    const hand = [
      E.path('M 470 900 C 470 790, 510 735, 585 700 C 620 650, 664 603, 688 623 C 711 642, 690 684, 663 719 C 706 670, 748 629, 774 649 C 800 670, 768 717, 735 751 C 790 700, 832 669, 855 691 C 879 714, 844 758, 802 791 C 858 755, 897 738, 916 762 C 936 788, 900 818, 858 842 L 858 900 Z', 5),
      E.path('M 625 758 C 682 802, 752 816, 802 803', 2.5, { opacity: 0.35 }),
      E.path('M 512 610 C 552 580, 604 570, 652 580', 2.5, { opacity: 0.3 }),
      E.path('M 860 625 L 935 572 M 900 665 L 990 622 M 912 718 L 1010 692', 4, { opacity: 0.55 }),
      E.rect(1022, 566, 118, 202, 3, { rx: 12 }),
      E.text(1040, 608, '01:42', 22, { font: 'mono', opacity: 0.7 }),
      E.line(1108, 706, 1108, 736, 5, { arrowEnd: true, opacity: 0.55 }),
      E.text(120, 828, 'ECU  /  THE HAND', 23, { font: 'mono', opacity: 0.65 }),
      E.ellipse(956, 750, 140, 92, 2, { opacity: 0.25, dash: '7 9' })
    ];

    const lowAngle = [
      E.line(40, 690, 1560, 690, 4),
      E.path('M 0 900 L 360 690 M 1600 900 L 1250 690 M 240 900 L 485 690 M 1380 900 L 1130 690', 2, { opacity: 0.4 }),
      E.rect(320, 392, 210, 300, 3, { opacity: 0.6 }),
      E.rect(1040, 320, 260, 370, 3, { opacity: 0.6 }),
      E.rect(1340, 448, 140, 242, 2, { opacity: 0.4 }),
      E.line(610, 150, 826, 690, 1.5, { opacity: 0.28 }),
      E.line(1000, 140, 900, 690, 1.5, { opacity: 0.28 }),
      E.ellipse(837, 308, 46, 56, 5),
      E.path('M 837 362 C 760 386, 724 492, 728 690 L 770 690 L 790 544 L 814 690 L 864 690 L 889 532 L 918 690 L 962 690 C 953 484, 920 386, 837 362 Z', 5),
      E.line(540, 900, 688, 542, 3, { arrowEnd: true, opacity: 0.7 }),
      E.text(100, 165, 'LOW ANGLE  /  HERO WALK', 25, { font: 'mono', opacity: 0.65 }),
      E.text(1430, 850, '↑ 24mm', 22, { font: 'mono', opacity: 0.45, anchor: 'end' })
    ];

    const chase = [
      E.path('M 0 0 L 560 330 L 560 590 L 0 900 Z', 0, { fill: '#ded9cf', stroke: 'none' }),
      E.path('M 1600 0 L 1040 330 L 1040 590 L 1600 900 Z', 0, { fill: '#ded9cf', stroke: 'none' }),
      E.path('M 0 0 L 1600 0 M 0 900 L 1600 900 M 0 0 L 0 900 M 1600 0 L 1600 900', 3),
      E.line(0, 0, 640, 390, 3), E.line(1600, 0, 960, 390, 3),
      E.line(0, 900, 640, 520, 3), E.line(1600, 900, 960, 520, 3),
      E.line(640, 390, 960, 390, 2), E.line(640, 520, 960, 520, 2),
      E.rect(64, 205, 108, 310, 2, { opacity: 0.45 }),
      E.rect(1434, 235, 105, 280, 2, { opacity: 0.45 }),
      E.text(690, 445, 'EXIT', 22, { font: 'mono', opacity: 0.55 }),
      E.ellipse(810, 560, 24, 29, 4, { fill: '#161512' }),
      E.path('M 810 590 C 790 608, 772 648, 756 710 L 806 710 L 815 650 L 842 710 L 888 710 C 876 650, 855 604, 810 590 Z', 4, { fill: '#161512' }),
      E.line(580, 560, 390, 620, 3, { arrowEnd: true }),
      E.line(540, 635, 330, 650, 2, { arrowEnd: true, opacity: 0.5 }),
      E.line(1060, 675, 1300, 610, 3, { arrowEnd: true, opacity: 0.45 }),
      E.text(92, 842, 'HANDHELD  /  FOLLOW', 24, { font: 'mono', opacity: 0.65 })
    ];

    const title = [
      E.rect(170, 160, 1260, 555, 3, { fill: '#161512', stroke: '#161512' }),
      E.line(255, 270, 1345, 270, 2, { stroke: '#ded9cf', opacity: 0.45 }),
      E.line(255, 620, 1345, 620, 2, { stroke: '#ded9cf', opacity: 0.45 }),
      E.text(800, 420, 'NIGHT WALK', 108, { font: 'serif', anchor: 'middle', fill: '#f4f1e8', weight: '400' }),
      E.text(800, 485, 'A SHORT FILM  /  CHAPTER ONE', 24, { font: 'mono', anchor: 'middle', fill: '#ded9cf', opacity: 0.8 }),
      E.text(800, 700, 'FADE IN:', 24, { font: 'mono', anchor: 'middle', opacity: 0.5 }),
      E.text(90, 820, 'TITLE CARD  /  BLACK', 21, { font: 'mono', opacity: 0.5 })
    ];

    const base = {
      category: 'film', featured: true
    };

    return [
      Object.assign({}, base, {
        id: 'film-night-city', name: '夜城定场', en: 'NIGHT CITY', category: 'film',
        tags: ['定场', '大远景', '城市', '雨夜'], shotSize: 'ELS', angle: '俯视', movement: '固定',
        duration: 4, note: '先给空城，再让主角从画面右侧进入。',
        drawing: { bg: BG, elements: city }
      }),
      Object.assign({}, base, {
        id: 'film-silhouette-door', name: '门框剪影', en: 'SILHOUETTE IN DOORWAY', category: 'film',
        tags: ['剪影', '门框', '逆光', '登场'], shotSize: 'LS', angle: '平视', movement: '固定',
        duration: 3, note: '把光留在身后，人物只保留轮廓。',
        drawing: { bg: BG, elements: silhouette }
      }),
      Object.assign({}, base, {
        id: 'drama-phone-hook', name: '手机钩子', en: 'PHONE HOOK', category: 'drama',
        tags: ['手机', '特写', '信息', '钩子'], shotSize: 'CU', angle: '过肩', movement: '推镜',
        duration: 2, note: '先拍屏幕，再让表情被蓝光吃掉。',
        drawing: { bg: BG, elements: phone }
      }),
      Object.assign({}, base, {
        id: 'dialogue-over-shoulder', name: '过肩对峙', en: 'OVER THE SHOULDER', category: 'dialogue',
        tags: ['对话', '过肩', '对峙', '关系'], shotSize: 'OTS', angle: '过肩', movement: '固定',
        duration: 3.5, note: '前景肩膀压住构图，给对手留出呼吸。',
        drawing: { bg: BG, elements: ots }
      }),
      Object.assign({}, base, {
        id: 'emotion-hand-close', name: '手的情绪', en: 'THE HAND', category: 'emotion',
        tags: ['手', '大特写', '情绪', '攥紧'], shotSize: 'ECU', angle: '俯视', movement: '固定',
        duration: 1.5, note: '攥紧一次，不用给脸。',
        drawing: { bg: BG, elements: hand }
      }),
      Object.assign({}, base, {
        id: 'action-low-angle-hero', name: '低角英雄', en: 'LOW ANGLE HERO', category: 'action',
        tags: ['仰拍', '英雄', '入画', '跟拍'], shotSize: 'MS', angle: '仰视', movement: '跟拍',
        duration: 2.5, note: '让地平线压低，人物从画面中轴走来。',
        drawing: { bg: BG, elements: lowAngle }
      }),
      Object.assign({}, base, {
        id: 'action-corridor-chase', name: '走廊追拍', en: 'CORRIDOR CHASE', category: 'action',
        tags: ['走廊', '追逐', '手持', '透视'], shotSize: 'MS', angle: '平视', movement: '手持',
        duration: 3, note: '保持呼吸感，运动箭头指向画外。',
        drawing: { bg: BG, elements: chase }
      }),
      Object.assign({}, base, {
        id: 'transition-title-black', name: '黑场片名', en: 'TITLE CARD / BLACK', category: 'transition',
        tags: ['黑场', '片名', '转场', '极简'], shotSize: 'INSERT', angle: '平视', movement: '固定',
        duration: 1.5, note: '最后留给片名，不出声。',
        drawing: { bg: BG, elements: title }
      })
    ];
  }

  window.SBDraw = {
    BG: BG,
    INK: INK,
    PAPER: PAPER,
    defsMarkup: defsMarkup,
    elementMarkup: elementMarkup,
    elementListMarkup: elementListMarkup,
    drawingMarkup: drawingMarkup,
    svgDataUri: svgDataUri,
    getAsset: getAsset,
    elementTransform: elementTransform,
    assetTransform: assetTransform,
    assetGroupMarkup: assetGroupMarkup,
    escapeText: esc,
    safeColor: safeColor,
    fillValue: fillValue,
    fallbackPresets: fallbackPresets
  };
})();
