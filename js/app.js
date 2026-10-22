/* ============================================================
   APERTURE — storyboard studio application
   Classic script. Local-only: localStorage + MediaRecorder.
   ============================================================ */
(function () {
  'use strict';

  const D = window.SBDraw;
  if (!D) {
    console.error('APERTURE: drawing engine missing');
    return;
  }

  /* ============================================================
     DOM helpers
     ============================================================ */

  const $ = function (sel, root) { return (root || document).querySelector(sel); };
  const $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };

  function escapeHtml(v) {
    return String(v == null ? '' : v)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function escapeAttr(v) { return escapeHtml(v); }

  function clamp(v, lo, hi) { return Math.min(hi, Math.max(lo, Number(v) || 0)); }
  function round1(v) { return Math.round(Number(v) * 10) / 10; }
  function pad2(v) { return String(Math.max(0, v | 0)).padStart(2, '0'); }
  function uid(prefix) {
    return (prefix || 'id') + '-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 7);
  }
  function deepClone(v) { return JSON.parse(JSON.stringify(v)); }
  function toArray(v) { return Array.isArray(v) ? v : []; }

  function formatSeconds(v) {
    const n = round1(Math.max(0, Number(v) || 0));
    return n.toFixed(1) + 's';
  }

  function formatClock(v) {
    const n = Math.max(0, Number(v) || 0);
    const m = Math.floor(n / 60);
    const s = Math.floor(n % 60);
    return pad2(m) + ':' + pad2(s);
  }

  function formatClockPrecise(v) {
    const n = Math.max(0, Number(v) || 0);
    const m = Math.floor(n / 60);
    const s = n - m * 60;
    return m + ':' + (s < 10 ? '0' : '') + s.toFixed(1);
  }

  function formatTimecode(v, fps) {
    const rate = fps || 24;
    const frames = Math.max(0, Math.round((Number(v) || 0) * rate));
    const ff = frames % rate;
    const seconds = Math.floor(frames / rate);
    const ss = seconds % 60;
    const mm = Math.floor(seconds / 60) % 60;
    const hh = Math.floor(seconds / 3600);
    return pad2(hh) + ':' + pad2(mm) + ':' + pad2(ss) + ':' + pad2(ff);
  }

  function formatRuler(v) {
    const n = Math.max(0, Number(v) || 0);
    if (n < 60) return n + 's';
    return Math.floor(n / 60) + ':' + pad2(n % 60);
  }

  function debounce(fn, wait) {
    let timer = 0;
    return function () {
      const args = arguments;
      const self = this;
      clearTimeout(timer);
      timer = setTimeout(function () { fn.apply(self, args); }, wait);
    };
  }

  function safeFileName(name) {
    return String(name || 'storyboard')
      .replace(/[\\/:*?"<>|\u0000-\u001f]/g, '-')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 64) || 'storyboard';
  }

  function isTypingTarget(target) {
    if (!target) return false;
    const tag = target.tagName;
    return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable;
  }

  /* ============================================================
     Constants
     ============================================================ */

  const GUEST_COOKIE = 'aperture_guest';
  const MAX_HISTORY = 48;
  const DEFAULT_FPS = 24;
  const CANVAS_W = 1600;
  const CANVAS_H = 900;
  const CATEGORY_LIST = [
    { id: 'all', label: '全部' },
    { id: 'film', label: '电影' },
    { id: 'drama', label: '短剧' },
    { id: 'dialogue', label: '对话' },
    { id: 'action', label: '动作' },
    { id: 'emotion', label: '情绪' },
    { id: 'transition', label: '空镜' },
    { id: 'basic', label: '基础' }
  ];
  const VALID_CATEGORIES = new Set(CATEGORY_LIST.map(function (c) { return c.id; }));

  const SHOT_SIZES = [
    { value: 'ELS', label: '大远景 · ELS' },
    { value: 'LS', label: '远景 · LS' },
    { value: 'MLS', label: '中远景 · MLS' },
    { value: 'MS', label: '中景 · MS' },
    { value: 'MCU', label: '中近景 · MCU' },
    { value: 'CU', label: '特写 · CU' },
    { value: 'ECU', label: '大特写 · ECU' },
    { value: 'OTS', label: '过肩 · OTS' },
    { value: 'POV', label: '主观 · POV' },
    { value: 'INSERT', label: '插入 · INSERT' },
    { value: 'AERIAL', label: '航拍 · AERIAL' }
  ];

  const ANGLES = [
    { value: '平视', label: '平视' },
    { value: '仰视', label: '仰视 / 低角' },
    { value: '俯视', label: '俯视 / 高角' },
    { value: '鸟瞰', label: '鸟瞰' },
    { value: '主观', label: '主观视角' },
    { value: '过肩', label: '过肩' },
    { value: '侧逆光', label: '侧逆光' },
    { value: '斜角', label: '荷兰角' }
  ];

  const MOVEMENTS = [
    { value: '固定', label: '固定' },
    { value: '推镜', label: '推镜' },
    { value: '拉镜', label: '拉镜' },
    { value: '横移', label: '横移' },
    { value: '跟拍', label: '跟拍' },
    { value: '手持', label: '手持' },
    { value: '摇镜', label: '摇镜' },
    { value: '升降', label: '升降' },
    { value: '变焦', label: '变焦' },
    { value: '环绕', label: '环绕' }
  ];

  const FEATURED_ORDER = [
    'film-night-city',
    'film-silhouette-door',
    'drama-phone-hook',
    'dialogue-over-shoulder',
    'emotion-hand-close',
    'action-low-angle-hero',
    'action-corridor-chase',
    'transition-title-black'
  ];

  const TOOL_HINTS = {
    select: '拖动移动 · Shift 多选 / 拖空白框选 · 边角缩放旋转',
    pencil: '按住并拖动，自由绘制草图线条',
    pen: '点击添加节点 · 点回起点闭合 · Enter 完成 · Esc 取消',
    line: '拖出一条直线',
    arrow: '拖出运镜方向或视线箭头',
    rect: '拖出一个矩形模块',
    ellipse: '拖出一个椭圆模块',
    text: '点击画面放置文字标注',
    eraser: '点击线条或形状即可擦除'
  };

  const ALLOWED_TOOLS = new Set(['select', 'pencil', 'pen', 'line', 'arrow', 'rect', 'ellipse', 'text', 'eraser']);
  const ZOOM_STEPS = [0.5, 0.75, 1, 1.25, 1.5, 2];

  const RECORDER_FORMATS = [
    { mime: 'video/mp4;codecs=avc1.42E01E', ext: 'mp4', label: 'MP4 · H.264' },
    { mime: 'video/mp4', ext: 'mp4', label: 'MP4' },
    { mime: 'video/webm;codecs=vp9', ext: 'webm', label: 'WEBM · VP9' },
    { mime: 'video/webm;codecs=vp8', ext: 'webm', label: 'WEBM · VP8' },
    { mime: 'video/webm', ext: 'webm', label: 'WEBM' }
  ];

  /* ============================================================
     DOM cache
     ============================================================ */

  const dom = {
    projectNumber: $('#projectNumber'),
    projectTitle: $('#projectTitle'),
    projectMenuBtn: $('#projectMenuBtn'),
    saveState: $('#saveState'),
    saveLabel: $('#saveLabel'),
    previewBtn: $('#previewBtn'),
    exportBtn: $('#exportBtn'),
    libraryPanel: $('#libraryPanel'),
    libraryCount: $('#libraryCount'),
    libraryTitle: $('#libraryTitle'),
    libraryModeTabs: $('#libraryModeTabs'),
    presetSearch: $('#presetSearch'),
    categoryTabs: $('#categoryTabs'),
    presetMeta: $('#presetMeta'),
    libraryActionHint: $('#libraryActionHint'),
    presetGrid: $('#presetGrid'),
    stage: $('#stage'),
    stageShotTag: $('#stageShotTag'),
    stageShotTitle: $('#stageShotTitle'),
    stageShotEn: $('#stageShotEn'),
    undoBtn: $('#undoBtn'),
    redoBtn: $('#redoBtn'),
    duplicateShotBtn: $('#duplicateShotBtn'),
    deleteShotBtn: $('#deleteShotBtn'),
    toolRail: $('#toolRail'),
    guidesBtn: $('#guidesBtn'),
    clearDrawingBtn: $('#clearDrawingBtn'),
    imageToolBtn: $('#imageToolBtn'),
    imageFileInput: $('#imageFileInput'),
    boardViewport: $('#boardViewport'),
    boardFrame: $('#boardFrame'),
    boardSvg: $('#boardSvg'),
    boardElements: $('#boardElements'),
    boardSelection: $('#boardSelection'),
    boardSnapGuides: $('#boardSnapGuides'),
    boardGuides: $('#boardGuides'),
    boardEmpty: $('#boardEmpty'),
    boardSideLabel: $('#boardSideLabel'),
    boardCaptionText: $('#boardCaptionText'),
    boardFitBtn: $('#boardFitBtn'),
    elementCount: $('#elementCount'),
    elementScaleInput: $('#elementScaleInput'),
    elementRotationInput: $('#elementRotationInput'),
    boardFullscreenBtn: $('#boardFullscreenBtn'),
    canvasZoomOut: $('#canvasZoomOut'),
    canvasZoomIn: $('#canvasZoomIn'),
    canvasZoomLabel: $('#canvasZoomLabel'),
    inspectorPanel: $('#inspectorPanel'),
    inspectorIndex: $('#inspectorIndex'),
    inspectorMinus: $('#inspectorMinus'),
    inspectorPlus: $('#inspectorPlus'),
    inspectorDuration: $('#inspectorDuration'),
    inspectorChips: $('#inspectorChips'),
    inspectorFrames: $('#inspectorFrames'),
    inspectorShare: $('#inspectorShare'),
    shotSizeSelect: $('#shotSizeSelect'),
    angleSelect: $('#angleSelect'),
    movementSelect: $('#movementSelect'),
    shotNote: $('#shotNote'),
    shotNameInput: $('#shotNameInput'),
    strokeWidthSeg: $('#strokeWidthSeg'),
    fillSeg: $('#fillSeg'),
    selectedElementLabel: $('#selectedElementLabel'),
    layerList: $('#layerList'),
    layerCount: $('#layerCount'),
    layerUpBtn: $('#layerUpBtn'),
    layerDownBtn: $('#layerDownBtn'),
    duplicateElementBtn: $('#duplicateElementBtn'),
    deleteElementBtn: $('#deleteElementBtn'),
    safeAreaToggle: $('#safeAreaToggle'),
    emptyAddPresetBtn: $('#emptyAddPresetBtn'),
    emptyDemoBtn: $('#emptyDemoBtn'),
    sequenceNumber: $('#sequenceNumber'),
    timeline: $('#timeline'),
    timeCurrent: $('#timeCurrent'),
    timeTotal: $('#timeTotal'),
    timelineTotal: $('#timelineTotal'),
    zoomOutBtn: $('#zoomOutBtn'),
    zoomLabel: $('#zoomLabel'),
    zoomInBtn: $('#zoomInBtn'),
    addBlankBtn: $('#addBlankBtn'),
    timelineScroll: $('#timelineScroll'),
    timelineCanvas: $('#timelineCanvas'),
    ruler: $('#ruler'),
    trackArea: $('#trackArea'),
    shotTrack: $('#shotTrack'),
    playhead: $('#playhead'),
    timelinePlayBtn: $('#timelinePlayBtn'),
    timelinePlayIcon: $('#timelinePlayIcon'),
    goStartBtn: $('#goStartBtn'),
    goEndBtn: $('#goEndBtn'),
    dockShot: $('#dockShot'),
    durationChoices: $('#durationChoices'),
    durationCustom: $('#durationCustom'),
    dockFrames: $('#dockFrames'),
    moveShotLeft: $('#moveShotLeft'),
    moveShotRight: $('#moveShotRight'),
    previewShotBtn: $('#previewShotBtn'),
    projectMenu: $('#projectMenu'),
    importFile: $('#importFile'),
    previewOverlay: $('#previewOverlay'),
    previewTimecode: $('#previewTimecode'),
    previewCloseBtn: $('#previewCloseBtn'),
    previewCanvas: $('#previewCanvas'),
    previewBigPlay: $('#previewBigPlay'),
    previewShotLabel: $('#previewShotLabel'),
    previewShotTitle: $('#previewShotTitle'),
    previewShotMeta: $('#previewShotMeta'),
    previewPlayBtn: $('#previewPlayBtn'),
    previewProgress: $('#previewProgress'),
    previewProgressFill: $('#previewProgressFill'),
    previewProgressKnob: $('#previewProgressKnob'),
    previewDuration: $('#previewDuration'),
    previewRestartBtn: $('#previewRestartBtn'),
    previewStageWrap: $('.preview-stage-wrap'),
    previewCanvasShell: $('.preview-canvas-shell'),
    previewCaption: $('#previewCaption'),
    exportModal: $('#exportModal'),
    exportCloseBtn: $('#exportCloseBtn'),
    exportShotCount: $('#exportShotCount'),
    exportDuration: $('#exportDuration'),
    exportFormatLabel: $('#exportFormatLabel'),
    resolutionSeg: $('#resolutionSeg'),
    fpsSeg: $('#fpsSeg'),
    burnInToggle: $('#burnInToggle'),
    pushInToggle: $('#pushInToggle'),
    startRenderBtn: $('#startRenderBtn'),
    startRenderLabel: $('#startRenderLabel'),
    exportSheetBtn: $('#exportSheetBtn'),
    exportReel: $('#exportReel'),
    exportReelTotal: $('#exportReelTotal'),
    exportStatus: $('#exportStatus'),
    exportCanvasWrap: $('#exportCanvasWrap'),
    exportCanvas: $('#exportCanvas'),
    exportReadyMark: $('#exportReadyMark'),
    exportProgressWrap: $('#exportProgressWrap'),
    exportStageText: $('#exportStageText'),
    exportPercent: $('#exportPercent'),
    exportProgressFill: $('#exportProgressFill'),
    exportFrameText: $('#exportFrameText'),
    exportElapsedText: $('#exportElapsedText'),
    exportResult: $('#exportResult'),
    exportVideo: $('#exportVideo'),
    downloadVideoBtn: $('#downloadVideoBtn'),
    renderAgainBtn: $('#renderAgainBtn'),
    confirmModal: $('#confirmModal'),
    projectsModal: $('#projectsModal'),
    projectsCloseBtn: $('#projectsCloseBtn'),
    projectsCloseBtn2: $('#projectsCloseBtn2'),
    projectsNewBtn: $('#projectsNewBtn'),
    projectListEl: $('#projectListEl'),
    projectsEmpty: $('#projectsEmpty'),
    confirmTitle: $('#confirmTitle'),
    confirmText: $('#confirmText'),
    confirmCancel: $('#confirmCancel'),
    confirmOk: $('#confirmOk'),
    selectionToolbar: $('#selectionToolbar'),
    selectionToolbarLabel: $('#selectionToolbarLabel'),
    selectionCopyBtn: $('#selectionCopyBtn'),
    selectionDeleteBtn: $('#selectionDeleteBtn'),
    selectionAlignGroup: $('#selectionAlignGroup'),
    selectionAlignDivider: $('#selectionAlignDivider'),
    selectionLayerUpBtn: $('#selectionLayerUpBtn'),
    selectionLayerDownBtn: $('#selectionLayerDownBtn'),
    contextMenu: $('#contextMenu'),
    themeToggle: $('#themeToggle'),
    assetToolBtn: $('#assetToolBtn'),
    mobileLibraryBtn: $('#mobileLibraryBtn'),
    libraryScrim: $('#libraryScrim'),
    libraryCloseBtn: $('#libraryCloseBtn'),
    toastWrap: $('#toastWrap')
  };

  /* ============================================================
     Presets + project data
     ============================================================ */

  const rawPresets = Array.isArray(window.SB_PRESETS) && window.SB_PRESETS.length
    ? window.SB_PRESETS
    : D.fallbackPresets();

  const PRESETS = [];
  const PRESET_MAP = {};
  const seenPresetIds = new Set();

  function finiteNumber(v, fallback) {
    const n = Number(v);
    return Number.isFinite(n) ? n : fallback;
  }

  const ELEMENT_NUMERIC_KEYS = [
    'x', 'y', 'w', 'h', 'rx', 'ry', 'cx', 'cy', 'x1', 'y1', 'x2', 'y2',
    'width', 'size', 'opacity', 'tx', 'ty', 'scale', 'scaleX', 'scaleY', 'rotation', 'pivotX', 'pivotY'
  ];

  function sanitizeElement(input) {
    if (!input || typeof input !== 'object') return null;
    const type = input.type;
    if (type !== 'path' && type !== 'line' && type !== 'rect' && type !== 'ellipse' && type !== 'text' && type !== 'asset' && type !== 'image') return null;
    const out = { type: type };
    ELEMENT_NUMERIC_KEYS.forEach(function (key) {
      if (input[key] != null) out[key] = finiteNumber(input[key], 0);
    });
    if (type === 'asset') {
      if (typeof input.assetId !== 'string' || !input.assetId.trim()) return null;
      out.assetId = input.assetId.slice(0, 100);
      out.x = finiteNumber(input.x, 0);
      out.y = finiteNumber(input.y, 0);
      out.scale = clamp(finiteNumber(input.scale, 1), 0.05, 10);
      out.rotation = finiteNumber(input.rotation, 0);
      return out;
    }
    if (type === 'image') {
      if (typeof input.src !== 'string' || !/^data:image\/(?:png|jpeg|webp);base64,/i.test(input.src)) return null;
      if (input.src.length > 3500000) return null;
      out.src = input.src;
      out.x = finiteNumber(input.x, 0);
      out.y = finiteNumber(input.y, 0);
      out.w = clamp(finiteNumber(input.w, 400), 8, 4800);
      out.h = clamp(finiteNumber(input.h, 300), 8, 4800);
      out.rotation = finiteNumber(input.rotation, 0);
      return out;
    }
    if (type === 'path') {
      if (typeof input.d !== 'string' || !input.d.trim()) return null;
      out.d = input.d.slice(0, 24000);
      if (input.closed) out.closed = true;
      if (Array.isArray(input.points)) {
        out.points = input.points.slice(0, 400).map(function (p) {
          return { x: finiteNumber(p && p.x, 0), y: finiteNumber(p && p.y, 0) };
        });
      }
    }
    if (type === 'text') {
      if (input.text == null) return null;
      out.text = String(input.text).slice(0, 240);
      out.x = finiteNumber(input.x, 0);
      out.y = finiteNumber(input.y, 0);
      if (typeof input.font === 'string') out.font = input.font.slice(0, 20);
      if (typeof input.anchor === 'string') out.anchor = input.anchor.slice(0, 20);
      if (typeof input.weight === 'string' || typeof input.weight === 'number') out.weight = String(input.weight).slice(0, 10);
      if (input.italic) out.italic = true;
    }
    if (typeof input.stroke === 'string') out.stroke = input.stroke.slice(0, 24);
    if (typeof input.fill === 'string') out.fill = input.fill.slice(0, 24);
    if (typeof input.dash === 'string') out.dash = input.dash.slice(0, 40);
    if (input.arrowEnd) out.arrowEnd = true;
    if (type === 'line') {
      out.x1 = finiteNumber(out.x1, 0);
      out.y1 = finiteNumber(out.y1, 0);
      out.x2 = finiteNumber(out.x2, 0);
      out.y2 = finiteNumber(out.y2, 0);
    }
    if (type === 'rect') {
      out.x = finiteNumber(out.x, 0);
      out.y = finiteNumber(out.y, 0);
      out.w = Math.max(0, finiteNumber(out.w, 0));
      out.h = Math.max(0, finiteNumber(out.h, 0));
    }
    if (type === 'ellipse') {
      out.cx = finiteNumber(out.cx, 0);
      out.cy = finiteNumber(out.cy, 0);
      out.rx = Math.max(0, finiteNumber(out.rx, 0));
      out.ry = Math.max(0, finiteNumber(out.ry, 0));
    }
    if (type === 'path' || type === 'line' || type === 'rect' || type === 'ellipse') {
      out.width = clamp(finiteNumber(out.width, 4), 0, 40);
      out.fill = out.fill || 'none';
      out.opacity = clamp(finiteNumber(out.opacity, 1), 0, 1);
    }
    return out;
  }

  function sanitizeDrawing(input) {
    const drawing = input && typeof input === 'object' ? input : {};
    const elements = toArray(drawing.elements)
      .slice(0, 1800)
      .map(sanitizeElement)
      .filter(Boolean);
    return { bg: typeof drawing.bg === 'string' ? drawing.bg.slice(0, 24) : D.BG, elements: elements };
  }

  function sanitizePreset(raw, index) {
    if (!raw || typeof raw !== 'object') return null;
    let id = String(raw.id || 'preset-' + index).trim().slice(0, 80);
    if (!id) id = 'preset-' + index;
    if (seenPresetIds.has(id)) id = id + '-' + index;
    seenPresetIds.add(id);
    let category = String(raw.category || 'film');
    if (!VALID_CATEGORIES.has(category) || category === 'all') category = 'film';
    const drawing = sanitizeDrawing(raw.drawing);
    return {
      id: id,
      name: String(raw.name || '未命名镜头').slice(0, 24),
      en: String(raw.en || '').slice(0, 48),
      category: category,
      tags: toArray(raw.tags).slice(0, 8).map(function (t) { return String(t).slice(0, 20); }),
      shotSize: String(raw.shotSize || 'MS').slice(0, 20),
      angle: String(raw.angle || '平视').slice(0, 20),
      movement: String(raw.movement || '固定').slice(0, 20),
      duration: clamp(round1(finiteNumber(raw.duration, 2.5)), 0.5, 60),
      note: String(raw.note || '').slice(0, 120),
      featured: !!raw.featured,
      drawing: drawing
    };
  }

  rawPresets.forEach(function (p, i) {
    const clean = sanitizePreset(p, i);
    if (clean) {
      PRESETS.push(clean);
      PRESET_MAP[clean.id] = clean;
    }
  });

  const ASSET_CATEGORIES = [
    { id: 'all', label: '全部' },
    { id: 'person', label: '人物' },
    { id: 'face', label: '头部' },
    { id: 'part', label: '部件' },
    { id: 'prop', label: '道具' },
    { id: 'scene', label: '场景' },
    { id: 'mark', label: '标记' }
  ];
  const VALID_ASSET_CATEGORIES = new Set(ASSET_CATEGORIES.map(function (c) { return c.id; }));
  const rawAssets = Array.isArray(window.SB_ASSETS) ? window.SB_ASSETS : [];
  const ASSETS = [];
  const ASSET_MAP = {};

  function sanitizeAsset(raw, index) {
    if (!raw || typeof raw !== 'object') return null;
    const id = String(raw.id || 'asset-' + index).trim().slice(0, 100);
    if (!id) return null;
    let category = String(raw.category || 'person');
    if (!VALID_ASSET_CATEGORIES.has(category) || category === 'all') category = 'person';
    const width = clamp(finiteNumber(raw.width, 200), 20, 1600);
    const height = clamp(finiteNumber(raw.height, 300), 20, 1600);
    const elements = sanitizeDrawing({ elements: raw.elements }).elements;
    if (!elements.length) return null;
    return {
      id: id,
      name: String(raw.name || '素材').slice(0, 24),
      category: category,
      tags: toArray(raw.tags).slice(0, 8).map(function (t) { return String(t).slice(0, 20); }),
      width: width,
      height: height,
      elements: elements
    };
  }

  rawAssets.forEach(function (asset, i) {
    const clean = sanitizeAsset(asset, i);
    if (clean && !ASSET_MAP[clean.id]) {
      ASSETS.push(clean);
      ASSET_MAP[clean.id] = clean;
    }
  });

  function normalizeShot(raw, index) {
    if (!raw || typeof raw !== 'object') return null;
    const name = String(raw.name || '镜头 ' + (index + 1)).slice(0, 24);
    return {
      id: String(raw.id || uid('shot')).slice(0, 80),
      presetId: raw.presetId ? String(raw.presetId).slice(0, 80) : null,
      name: name,
      en: String(raw.en || '').slice(0, 48),
      shotSize: String(raw.shotSize || 'MS').slice(0, 20),
      angle: String(raw.angle || '平视').slice(0, 20),
      movement: String(raw.movement || '固定').slice(0, 20),
      duration: clamp(round1(finiteNumber(raw.duration, 2.5)), 0.5, 60),
      note: String(raw.note || '').slice(0, 120),
      drawing: sanitizeDrawing(raw.drawing)
    };
  }

  function normalizeProject(raw) {
    if (!raw || typeof raw !== 'object') return null;
    const usedIds = new Set();
    const shots = toArray(raw.shots).map(normalizeShot).filter(Boolean).map(function (shot) {
      if (usedIds.has(shot.id)) shot.id = uid('shot');
      usedIds.add(shot.id);
      return shot;
    });
    return {
      version: 1,
      id: typeof raw.id === 'string' && raw.id.trim() ? raw.id.slice(0, 80) : uid('project'),
      title: String(raw.title || '未命名分镜').trim().slice(0, 32) || '未命名分镜',
      createdAt: finiteNumber(raw.createdAt, Date.now()),
      shots: shots
    };
  }

  function shotFromPreset(preset) {
    return {
      id: uid('shot'),
      presetId: preset.id,
      name: preset.name,
      en: preset.en,
      shotSize: preset.shotSize,
      angle: preset.angle,
      movement: preset.movement,
      duration: preset.duration,
      note: preset.note,
      drawing: deepClone(preset.drawing)
    };
  }

  function makeBlankShot() {
    return {
      id: uid('shot'),
      presetId: null,
      name: '空镜头',
      en: 'BLANK FRAME',
      shotSize: 'MS',
      angle: '平视',
      movement: '固定',
      duration: 2,
      note: '',
      drawing: { bg: D.BG, elements: [] }
    };
  }

  function buildDemoProject() {
    const byId = {};
    PRESETS.forEach(function (p) { byId[p.id] = p; });
    const chosen = [];
    const used = new Set();
    FEATURED_ORDER.forEach(function (id) {
      if (byId[id] && !used.has(id)) {
        chosen.push(byId[id]);
        used.add(id);
      }
    });
    PRESETS.forEach(function (p) {
      if (chosen.length >= 8) return;
      if (!used.has(p.id)) {
        chosen.push(p);
        used.add(p.id);
      }
    });
    return {
      version: 1,
      title: '夜行 · 序章',
      createdAt: Date.now(),
      shots: chosen.slice(0, 8).map(shotFromPreset)
    };
  }

  function readCookie(name) {
    try {
      const match = document.cookie.match(new RegExp('(?:^|; )' + name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '=([^;]*)'));
      return match ? decodeURIComponent(match[1]) : null;
    } catch (err) {
      return null;
    }
  }

  function writeCookie(name, value) {
    try {
      document.cookie = name + '=' + encodeURIComponent(value) + '; path=/; max-age=31536000; SameSite=Lax';
    } catch (err) { /* cookies may be unavailable on file:// */ }
  }

  let guestIdCache = null;
  function getGuestId() {
    if (guestIdCache) return guestIdCache;
    let guest = readCookie(GUEST_COOKIE);
    if (!guest) {
      if (window.crypto && typeof window.crypto.randomUUID === 'function') {
        guest = 'g-' + window.crypto.randomUUID().slice(0, 18);
      } else {
        guest = 'g-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
      }
      writeCookie(GUEST_COOKIE, guest);
    }
    guestIdCache = guest;
    return guest;
  }

  function projectStorageKey() {
    return 'aperture.project.' + getGuestId() + '.v2';
  }

  function projectListStorageKey() {
    return 'aperture.projects.' + getGuestId() + '.v2';
  }

  function makeEmptyProject(title) {
    return {
      version: 1,
      id: uid('project'),
      title: title || '未命名分镜',
      createdAt: Date.now(),
      shots: []
    };
  }

  function ensureProjectId(project) {
    if (!project || typeof project !== 'object') return null;
    if (typeof project.id !== 'string' || !project.id.trim()) project.id = uid('project');
    return project.id;
  }

  function readProjectList() {
    try {
      const raw = localStorage.getItem(projectListStorageKey());
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed.filter(function (rec) {
        return rec && rec.project && typeof rec.project === 'object';
      }).slice(0, 30);
    } catch (err) {
      return [];
    }
  }

  function writeProjectList(list) {
    try {
      localStorage.setItem(projectListStorageKey(), JSON.stringify(list.slice(0, 15)));
      return true;
    } catch (err) {
      return false;
    }
  }

  function upsertProjectInList(force) {
    if (!state.project) return;
    const id = ensureProjectId(state.project);
    const list = readProjectList();
    const existing = list.findIndex(function (rec) { return rec.id === id; });
    if (state.project.shots.length === 0 && existing < 0 && !force) return;
    const record = {
      id: id,
      title: state.project.title || '未命名分镜',
      updatedAt: Date.now(),
      project: state.project
    };
    if (existing >= 0) list.splice(existing, 1);
    list.unshift(record);
    writeProjectList(list);
    renderProjectsModal();
  }

  function loadInitialProject() {
    getGuestId();
    let stored = null;
    try {
      const raw = localStorage.getItem(projectStorageKey());
      if (raw) {
        const parsed = JSON.parse(raw);
        stored = normalizeProject(parsed && parsed.project ? parsed.project : parsed);
      }
    } catch (err) {
      stored = null;
    }
    if (stored) return stored;
    const list = readProjectList();
    if (list.length) {
      const latest = list.slice().sort(function (a, b) {
        return (b.updatedAt || 0) - (a.updatedAt || 0);
      })[0];
      const normalized = normalizeProject(latest.project);
      if (normalized) return normalized;
    }
    return makeEmptyProject('未命名分镜');
  }

  /* ============================================================
     Application state
     ============================================================ */

  const state = {
    project: null,
    selectedShotId: null,
    selectedElementIndex: null,
    multiSelection: [],
    tool: 'select',
    brushWidth: 4,
    brushFill: 'none',
    category: 'all',
    assetCategory: 'all',
    libraryMode: 'presets',
    search: '',
    theme: 'light',
    contextTarget: null,
    guides: true,
    safeArea: true,
    zoom: 1,
    canvasZoom: 1,
    canvasPanX: 0,
    canvasPanY: 0,
    boardBaseW: 0,
    boardBaseH: 0,
    basePps: null,
    currentPps: 60,
    playhead: 0,
    history: [],
    future: [],
    interaction: null,
    penDraft: null,
    pathEdit: null,
    lastBoardTap: null,
    clipboard: [],
    textEditor: null,
    noteEdit: null,
    titleEdit: null,
    nameEdit: null,
    saveTimer: null,
    saveStateValue: 'saved',
    confirmAction: null,
    focusMode: false,
    dirtyLibraryFrame: 0
  };

  const preview = {
    open: false,
    playing: false,
    token: 0,
    time: 0,
    total: 0,
    baseOffset: 0,
    sequence: null,
    images: [],
    raf: 0,
    lastTs: 0,
    currentIndex: -1
  };

  const exportState = {
    open: false,
    rendering: false,
    cancelled: false,
    token: 0,
    res: 1080,
    fps: DEFAULT_FPS,
    burnIn: true,
    pushIn: true,
    raf: 0,
    finishTimer: 0,
    recorder: null,
    stream: null,
    chunks: [],
    resultUrl: null,
    format: null
  };

  /* ============================================================
     Selection / timeline data helpers
     ============================================================ */

  function getShotList() { return state.project ? state.project.shots : []; }

  function getShotIndexById(id) {
    return getShotList().findIndex(function (s) { return s.id === id; });
  }

  function getSelectedShotIndex() {
    return getShotIndexById(state.selectedShotId);
  }

  function getSelectedShot() {
    return getShotList()[getSelectedShotIndex()] || null;
  }

  function getShotById(id) {
    return getShotList()[getShotIndexById(id)] || null;
  }

  function getShotStarts() {
    let acc = 0;
    return getShotList().map(function (shot) {
      const start = acc;
      acc += shot.duration;
      return start;
    });
  }

  function totalDuration() {
    return getShotList().reduce(function (sum, shot) { return sum + shot.duration; }, 0);
  }

  function clampPlayhead() {
    state.playhead = clamp(state.playhead, 0, totalDuration());
  }

  /* ============================================================
     Save / history
     ============================================================ */

  function setSaveState(kind, label) {
    state.saveStateValue = kind;
    if (!dom.saveState) return;
    dom.saveState.classList.remove('is-saving', 'is-saved');
    if (kind === 'saving') dom.saveState.classList.add('is-saving');
    if (kind === 'saved') dom.saveState.classList.add('is-saved');
    if (label && dom.saveLabel) dom.saveLabel.textContent = label;
  }

  function persistProject() {
    if (!state.project) return;
    clearTimeout(state.saveTimer);
    state.saveTimer = 0;
    ensureProjectId(state.project);
    try {
      localStorage.setItem(projectStorageKey(), JSON.stringify({
        version: 1,
        savedAt: Date.now(),
        project: state.project,
        guest: getGuestId()
      }));
      setSaveState('saved', '已保存');
    } catch (err) {
      setSaveState('error', '本地存储空间不足');
      return;
    }
    upsertProjectInList();
  }

  function saveSoon() {
    setSaveState('saving', '保存中');
    clearTimeout(state.saveTimer);
    state.saveTimer = setTimeout(persistProject, 360);
  }

  function snapshotState() {
    return {
      project: deepClone(state.project),
      selectedShotId: state.selectedShotId,
      selectedElementIndex: state.selectedElementIndex,
      multiSelection: state.multiSelection.slice()
    };
  }

  function pushHistory() {
    if (!state.project) return;
    const snap = snapshotState();
    const last = state.history[state.history.length - 1];
    if (last && JSON.stringify(last.project) === JSON.stringify(snap.project)) return;
    state.history.push(snap);
    if (state.history.length > MAX_HISTORY) state.history.shift();
    state.future = [];
    updateHistoryButtons();
  }

  function updateHistoryButtons() {
    if (dom.undoBtn) dom.undoBtn.disabled = state.history.length === 0;
    if (dom.redoBtn) dom.redoBtn.disabled = state.future.length === 0;
  }

  function restoreSnapshot(snap) {
    state.project = snap.project;
    state.selectedShotId = snap.selectedShotId;
    if (!getSelectedShot()) {
      state.selectedShotId = getShotList()[0] ? getShotList()[0].id : null;
    }
    state.selectedElementIndex = snap.selectedElementIndex != null ? snap.selectedElementIndex : null;
    const restoredShot = getSelectedShot();
    if (!restoredShot || !restoredShot.drawing.elements[state.selectedElementIndex]) {
      state.selectedElementIndex = null;
    }
    state.multiSelection = (snap.multiSelection || []).filter(function (i) {
      return restoredShot && restoredShot.drawing.elements[i];
    }).filter(function (i) { return i !== state.selectedElementIndex; });
    state.basePps = null;
    clampPlayhead();
    renderAll();
    fitBoard();
    saveSoon();
  }

  function undo() {
    if (!state.history.length) return;
    const current = snapshotState();
    state.future.push(current);
    const prev = state.history.pop();
    restoreSnapshot(prev);
    updateHistoryButtons();
    setSaveState('saving', '保存中');
  }

  function redo() {
    if (!state.future.length) return;
    const current = snapshotState();
    state.history.push(current);
    const next = state.future.pop();
    restoreSnapshot(next);
    updateHistoryButtons();
    setSaveState('saving', '保存中');
  }

  /* ============================================================
     Toast / confirm
     ============================================================ */

  function toast(message, timeout) {
    if (!dom.toastWrap) return;
    const node = document.createElement('div');
    node.className = 'toast';
    node.textContent = message;
    dom.toastWrap.appendChild(node);
    const life = timeout || 2600;
    setTimeout(function () {
      node.classList.add('out');
      setTimeout(function () { node.remove(); }, 240);
    }, life);
  }

  function openConfirm(options) {
    state.confirmAction = options && options.onConfirm ? options.onConfirm : null;
    dom.confirmTitle.textContent = (options && options.title) || '确认操作？';
    dom.confirmText.textContent = (options && options.text) || '此操作不可撤销。';
    if (dom.confirmOk) dom.confirmOk.textContent = (options && options.confirmLabel) || '确认';
    dom.confirmModal.hidden = false;
    setTimeout(function () { if (dom.confirmOk) dom.confirmOk.focus(); }, 30);
  }

  function closeConfirm() {
    dom.confirmModal.hidden = true;
    state.confirmAction = null;
  }

  function closeProjectsModal() {
    if (dom.projectsModal) dom.projectsModal.hidden = true;
  }

  function formatProjectTime(timestamp) {
    const ts = Number(timestamp) || 0;
    if (!ts) return '—';
    const d = new Date(ts);
    const pad = function (n) { return n < 10 ? '0' + n : String(n); };
    return (d.getMonth() + 1) + '月' + d.getDate() + '日 ' + pad(d.getHours()) + ':' + pad(d.getMinutes());
  }

  function renderProjectsModal() {
    if (!dom.projectListEl) return;
    const list = readProjectList().slice().sort(function (a, b) {
      return (b.updatedAt || 0) - (a.updatedAt || 0);
    });
    const currentId = state.project ? ensureProjectId(state.project) : null;
    if (!list.length) {
      dom.projectListEl.innerHTML = '';
      if (dom.projectsEmpty) dom.projectsEmpty.hidden = false;
      return;
    }
    if (dom.projectsEmpty) dom.projectsEmpty.hidden = true;
    dom.projectListEl.innerHTML = list.map(function (rec) {
      const p = rec.project || {};
      const shots = Array.isArray(p.shots) ? p.shots.length : 0;
      const isCurrent = rec.id === currentId;
      return '<div class="project-row' + (isCurrent ? ' current' : '') + '" data-project-id="' + escapeAttr(rec.id) + '">' +
        '<div class="project-row-main">' +
          '<div class="project-row-title">' + escapeHtml(rec.title || p.title || '未命名分镜') + (isCurrent ? '<span class="project-current-badge">当前</span>' : '') + '</div>' +
          '<div class="project-row-meta">' + shots + ' 个镜头 · ' + formatProjectTime(rec.updatedAt) + '</div>' +
        '</div>' +
        '<div class="project-row-actions">' +
          '<button type="button" class="project-open-btn" data-project-open="' + escapeAttr(rec.id) + '">打开</button>' +
          '<button type="button" class="project-delete-btn" data-project-delete="' + escapeAttr(rec.id) + '" title="删除工程">删除</button>' +
        '</div>' +
      '</div>';
    }).join('');
  }

  function openProjectsModal() {
    if (state.project && state.project.shots.length) persistProject();
    renderProjectsModal();
    if (dom.projectsModal) dom.projectsModal.hidden = false;
    setTimeout(function () { if (dom.projectsCloseBtn) dom.projectsCloseBtn.focus(); }, 30);
  }

  function openProjectById(id) {
    const rec = readProjectList().find(function (r) { return r.id === id; });
    if (!rec) return;
    const project = normalizeProject(rec.project);
    if (!project) {
      toast('这个工程无法打开');
      return;
    }
    closeProjectsModal();
    state.project = project;
    state.selectedShotId = getShotList()[0] ? getShotList()[0].id : null;
    state.selectedElementIndex = null;
    state.multiSelection = [];
    state.penDraft = null;
    state.playhead = 0;
    state.basePps = null;
    state.history = [];
    state.future = [];
    persistProject();
    renderAll();
    fitBoard();
    toast('已打开：' + (project.title || '未命名分镜'));
  }

  function deleteProjectById(id) {
    const list = readProjectList();
    const rec = list.find(function (r) { return r.id === id; });
    if (!rec) return;
    openConfirm({
      title: '删除这个工程？',
      text: '「' + (rec.title || '未命名分镜') + '」会从这台浏览器移除，无法恢复。',
      confirmLabel: '删除工程',
      onConfirm: function () {
        const next = readProjectList().filter(function (r) { return r.id !== id; });
        writeProjectList(next);
        const currentId = state.project ? state.project.id : null;
        if (currentId === id) {
          if (next.length) {
            const project = normalizeProject(next[0].project);
            state.project = project || makeEmptyProject();
          } else {
            state.project = makeEmptyProject();
          }
          state.selectedShotId = getShotList()[0] ? getShotList()[0].id : null;
          state.selectedElementIndex = null;
          state.multiSelection = [];
          state.penDraft = null;
          state.playhead = 0;
          state.basePps = null;
          state.history = [];
          state.future = [];
          renderAll();
          fitBoard();
          persistProject();
        }
        renderProjectsModal();
        toast('工程已删除');
      }
    });
  }

  function hideContextMenu() {
    if (!dom.contextMenu) return;
    dom.contextMenu.hidden = true;
    dom.contextMenu.innerHTML = '';
    state.contextTarget = null;
  }

  function showContextMenu(clientX, clientY, items, target) {
    if (!dom.contextMenu) return;
    state.contextTarget = target || null;
    dom.contextMenu.innerHTML = items.map(function (item) {
      if (item.separator) return '<span class="context-sep"></span>';
      return '<button type="button" class="context-item' + (item.danger ? ' danger' : '') + '" data-context-action="' +
        escapeAttr(item.action) + '"' + (item.disabled ? ' disabled' : '') + '>' +
        '<span>' + escapeHtml(item.label) + '</span>' + (item.shortcut ? '<kbd>' + escapeHtml(item.shortcut) + '</kbd>' : '') +
      '</button>';
    }).join('');
    dom.contextMenu.hidden = false;
    const rect = dom.contextMenu.getBoundingClientRect();
    const left = Math.min(window.innerWidth - rect.width - 12, Math.max(12, clientX));
    const top = Math.min(window.innerHeight - rect.height - 12, Math.max(12, clientY));
    dom.contextMenu.style.left = left + 'px';
    dom.contextMenu.style.top = top + 'px';
  }

  function openElementContextMenu(index, x, y) {
    const shot = getSelectedShot();
    if (!shot || !shot.drawing.elements[index]) return;
    state.selectedElementIndex = index;
    renderSelectionOverlay();
    updateSelectionToolbar();
    renderInspector();
    const count = shot.drawing.elements.length;
    showContextMenu(x, y, [
      { action: 'element-duplicate', label: '复制元素', shortcut: '⌘D' },
      { action: 'element-up', label: '上移一层', disabled: index >= count - 1 },
      { action: 'element-down', label: '下移一层', disabled: index <= 0 },
      { action: 'element-delete', label: '删除元素', shortcut: 'Del', danger: true }
    ], { kind: 'element', index: index });
  }

  function openShotContextMenu(shotId, x, y) {
    const index = getShotIndexById(shotId);
    const shots = getShotList();
    if (index < 0) return;
    selectShot(shotId, { seek: true });
    showContextMenu(x, y, [
      { action: 'shot-duplicate', label: '复制镜头' },
      { action: 'shot-up', label: '镜头前移', disabled: index <= 0 },
      { action: 'shot-down', label: '镜头后移', disabled: index >= shots.length - 1 },
      { action: 'shot-delete', label: '删除镜头', danger: true }
    ], { kind: 'shot', index: index, shotId: shotId });
  }

  /* ============================================================
     Rendering — library
     ============================================================ */

  function libraryModeCounts(mode) {
    if (mode === 'assets') {
      const counts = {};
      ASSETS.forEach(function (a) { counts[a.category] = (counts[a.category] || 0) + 1; });
      return { all: ASSETS.length, counts: counts, categories: ASSET_CATEGORIES };
    }
    const counts = {};
    PRESETS.forEach(function (p) { counts[p.category] = (counts[p.category] || 0) + 1; });
    return { all: PRESETS.length, counts: counts, categories: CATEGORY_LIST };
  }

  function renderCategoryTabs() {
    const mode = state.libraryMode;
    const data = libraryModeCounts(mode);
    const activeCategory = mode === 'assets' ? state.assetCategory : state.category;
    if (dom.libraryTitle) dom.libraryTitle.textContent = mode === 'assets' ? '素材库' : '分镜库';
    if (dom.libraryCount) dom.libraryCount.textContent = String(data.all).padStart(2, '0');
    if (dom.libraryModeTabs) {
      dom.libraryModeTabs.innerHTML =
        '<button class="library-mode-btn' + (mode === 'presets' ? ' active' : '') + '" data-mode="presets" type="button">分镜预设<span>' + PRESETS.length + '</span></button>' +
        '<button class="library-mode-btn' + (mode === 'assets' ? ' active' : '') + '" data-mode="assets" type="button">素材<span>' + ASSETS.length + '</span></button>';
    }
    dom.categoryTabs.innerHTML = data.categories.map(function (cat) {
      const count = cat.id === 'all' ? data.all : (data.counts[cat.id] || 0);
      return '<button class="cat-tab' + (activeCategory === cat.id ? ' active' : '') +
        '" data-category="' + cat.id + '" role="tab" aria-selected="' + (activeCategory === cat.id) + '">' +
        escapeHtml(cat.label) + '<em>' + count + '</em></button>';
    }).join('');
    if (dom.presetSearch) {
      dom.presetSearch.placeholder = mode === 'assets' ? '搜索 人物 / 道具 / 场景' : '搜索 景别 / 运镜 / 情绪';
      dom.presetSearch.setAttribute('aria-label', mode === 'assets' ? '搜索素材' : '搜索分镜预设');
    }
    if (dom.libraryActionHint) dom.libraryActionHint.textContent = mode === 'assets' ? '点按插入画布' : '点按加入时间轴';
  }

  function filteredPresets() {
    const q = state.search.trim().toLowerCase();
    return PRESETS.filter(function (p) {
      if (state.category !== 'all' && p.category !== state.category) return false;
      if (!q) return true;
      const haystack = [
        p.name, p.en, p.category, p.shotSize, p.angle, p.movement, p.note,
        p.tags.join(' '), PRESET_CATEGORY_LABEL(p.category)
      ].join(' ').toLowerCase();
      return haystack.indexOf(q) !== -1;
    });
  }

  function filteredAssets() {
    const q = state.search.trim().toLowerCase();
    return ASSETS.filter(function (a) {
      if (state.assetCategory !== 'all' && a.category !== state.assetCategory) return false;
      if (!q) return true;
      const haystack = [
        a.name, a.category, a.tags.join(' '), assetCategoryLabel(a.category)
      ].join(' ').toLowerCase();
      return haystack.indexOf(q) !== -1;
    });
  }

  function PRESET_CATEGORY_LABEL(id) {
    for (let i = 0; i < CATEGORY_LIST.length; i++) {
      if (CATEGORY_LIST[i].id === id) return CATEGORY_LIST[i].label;
    }
    return id;
  }

  function assetCategoryLabel(id) {
    for (let i = 0; i < ASSET_CATEGORIES.length; i++) {
      if (ASSET_CATEGORIES[i].id === id) return ASSET_CATEGORIES[i].label;
    }
    return id;
  }

  function assetPreviewMarkup(asset) {
    const pad = 18;
    const w = asset.width + pad * 2;
    const h = asset.height + pad * 2;
    const inner = D.elementMarkup({ type: 'asset', assetId: asset.id, x: pad, y: pad, scale: 1 }, null, false);
    return '<svg class="asset-preview" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + w + ' ' + h +
      '" preserveAspectRatio="xMidYMid meet">' + D.defsMarkup() + inner + '</svg>';
  }

  function renderLibraryGrid() {
    const isAssets = state.libraryMode === 'assets';
    if (isAssets) {
      const list = filteredAssets();
      if (dom.presetMeta) dom.presetMeta.textContent = list.length + ' 个素材';
      if (!list.length) {
        dom.presetGrid.innerHTML = '<div class="preset-empty"><span class="empty-plus">＋</span><span>没有找到匹配的素材</span><button class="outline-btn" type="button" id="resetSearchBtn">清除筛选</button></div>';
        return;
      }
      dom.presetGrid.classList.add('asset-grid');
      dom.presetGrid.innerHTML = list.map(function (asset) {
        return '<button class="preset-card asset-card" type="button" draggable="true" data-asset-id="' + escapeAttr(asset.id) +
          '" title="' + escapeAttr('点击插入或拖到画布：' + asset.name) + '">' +
          '<span class="preset-thumb asset-thumb">' + assetPreviewMarkup(asset) +
            '<span class="preset-add" aria-hidden="true">＋</span>' +
          '</span>' +
          '<span class="preset-card-body">' +
            '<span class="preset-card-name">' + escapeHtml(asset.name) + '</span>' +
            '<span class="preset-card-meta"><span>' + escapeHtml(assetCategoryLabel(asset.category)) + '</span></span>' +
          '</span>' +
        '</button>';
      }).join('');
      return;
    }
    dom.presetGrid.classList.remove('asset-grid');
    const list = filteredPresets();
    if (dom.presetMeta) dom.presetMeta.textContent = list.length + ' 个分镜';
    if (!list.length) {
      dom.presetGrid.innerHTML = '<div class="preset-empty"><span class="empty-plus">＋</span><span>没有找到匹配的分镜预设</span><button class="outline-btn" type="button" id="resetSearchBtn">清除筛选</button></div>';
      return;
    }
    const order = list.slice().sort(function (a, b) {
      return (b.featured ? 1 : 0) - (a.featured ? 1 : 0);
    });
    dom.presetGrid.innerHTML = order.map(function (p) {
      const svg = D.drawingMarkup(p.drawing, { className: 'thumb-art', indexed: false });
      return '<button class="preset-card" type="button" data-preset-id="' + escapeAttr(p.id) +
        '" title="' + escapeAttr(p.name + ' · ' + p.note) + '">' +
        '<span class="preset-thumb">' + svg +
          (p.featured ? '<em class="featured-mark">示例</em>' : '') +
          '<span class="preset-add" aria-hidden="true">＋</span>' +
        '</span>' +
        '<span class="preset-card-body">' +
          '<span class="preset-card-name">' + escapeHtml(p.name) + '</span>' +
          '<span class="preset-card-meta"><span>' + escapeHtml(p.shotSize) + ' · ' + escapeHtml(p.movement) + '</span><span>' + formatSeconds(p.duration) + '</span></span>' +
        '</span>' +
      '</button>';
    }).join('');
  }

  function updateCategoryTabsActive() {
    const activeCategory = state.libraryMode === 'assets' ? state.assetCategory : state.category;
    $$('.cat-tab', dom.categoryTabs).forEach(function (tab) {
      const active = tab.dataset.category === activeCategory;
      tab.classList.toggle('active', active);
      tab.setAttribute('aria-selected', active ? 'true' : 'false');
    });
  }

  function setLibraryMode(mode) {
    if (mode !== 'presets' && mode !== 'assets') return;
    if (state.libraryMode === mode) return;
    state.libraryMode = mode;
    state.search = '';
    if (dom.presetSearch) dom.presetSearch.value = '';
    if (mode === 'assets') {
      state.assetCategory = 'all';
    } else {
      state.category = 'all';
    }
    renderCategoryTabs();
    renderLibraryGrid();
    if (dom.presetGrid) dom.presetGrid.scrollTop = 0;
    if (dom.presetSearch && window.innerWidth > 700) dom.presetSearch.focus();
  }

  /* ============================================================
     Rendering — stage / board
     ============================================================ */

  function setBoardGuides() {
    if (!dom.boardGuides) return;
    dom.boardGuides.classList.toggle('visible', !!state.guides);
    dom.boardGuides.classList.toggle('hide-safe', !state.safeArea);
  }

  function renderStage() {
    const shot = getSelectedShot();
    const index = getSelectedShotIndex();
    setBoardGuides();

    if (!shot) {
      dom.stageShotTag.textContent = '—';
      dom.stageShotTitle.textContent = '未选择镜头';
      dom.stageShotEn.textContent = '从左侧预设或时间轴开始';
      dom.inspectorIndex.textContent = '—';
      dom.duplicateShotBtn.disabled = true;
      dom.deleteShotBtn.disabled = true;
      dom.boardEmpty.hidden = !(state.tool === 'select' || state.tool === 'eraser');
      dom.boardElements.innerHTML = '';
      dom.boardSelection.innerHTML = '';
      dom.boardCaptionText.textContent = '从左侧选择一个预设分镜，或新建空镜头';
      if (dom.elementCount) dom.elementCount.textContent = '0 个元素';
      dom.boardSvg.setAttribute('data-tool', state.tool);
      updateToolRail();
      return;
    }

    dom.stageShotTag.textContent = '镜头 ' + pad2(index + 1);
    dom.stageShotTitle.textContent = shot.name;
    dom.stageShotEn.textContent = [shot.shotSize, shot.movement, formatSeconds(shot.duration)].filter(Boolean).join(' · ');
    dom.inspectorIndex.textContent = pad2(index + 1);
    dom.duplicateShotBtn.disabled = false;
    dom.deleteShotBtn.disabled = false;
    dom.boardEmpty.hidden = true;
    dom.boardSvg.setAttribute('data-tool', state.tool);
    dom.boardCaptionText.textContent = TOOL_HINTS[state.tool] || TOOL_HINTS.select;
    if (dom.elementCount) {
      dom.elementCount.textContent = shot.drawing.elements.length + ' 个元素';
    }
    updateToolRail();
    renderBoard();
  }

  function renderBoard() {
    const shot = getSelectedShot();
    if (!shot) {
      dom.boardElements.innerHTML = '';
      dom.boardSelection.innerHTML = '';
      updateSelectionToolbar();
      return;
    }
    const elements = shot.drawing.elements;
    dom.boardElements.innerHTML = D.elementListMarkup(shot.drawing, { hits: true });
    if (dom.elementCount) dom.elementCount.textContent = elements.length + ' 个元素';
    if (state.selectedElementIndex != null && !elements[state.selectedElementIndex]) {
      state.selectedElementIndex = null;
    }
    state.multiSelection = state.multiSelection.filter(function (i) { return !!elements[i]; });
    renderSelectionOverlay();
    updateSelectionToolbar();
  }

  function getSelectedElementIndices() {
    const shot = getSelectedShot();
    if (!shot) return [];
    const set = new Set();
    if (state.selectedElementIndex != null && shot.drawing.elements[state.selectedElementIndex]) {
      set.add(state.selectedElementIndex);
    }
    (state.multiSelection || []).forEach(function (i) {
      if (shot.drawing.elements[i]) set.add(i);
    });
    return Array.from(set).sort(function (a, b) { return a - b; });
  }

  function setElementSelection(indices, primary) {
    const shot = getSelectedShot();
    if (!shot) {
      state.selectedElementIndex = null;
      state.multiSelection = [];
      return;
    }
    const valid = Array.from(new Set((indices || []).filter(function (i) {
      return Number.isInteger(i) && !!shot.drawing.elements[i];
    }))).sort(function (a, b) { return a - b; });
    if (!valid.length) {
      state.selectedElementIndex = null;
      state.multiSelection = [];
      return;
    }
    let p = primary != null && valid.indexOf(primary) >= 0 ? primary : valid[0];
    state.selectedElementIndex = p;
    state.multiSelection = valid.filter(function (i) { return i !== p; });
    state.pathEdit = null;
  }

  function clearElementSelection() {
    state.selectedElementIndex = null;
    state.multiSelection = [];
  }

  function isMultiSelection() {
    return getSelectedElementIndices().length > 1;
  }

  function renderMarqueeOverlay(interaction) {
    const viewBox = dom.boardSvg.getBoundingClientRect();
    if (!viewBox.width || !viewBox.height) return;
    const unit = CANVAS_W / viewBox.width;
    const x1 = Math.min(interaction.startClientX, interaction.currentClientX);
    const y1 = Math.min(interaction.startClientY, interaction.currentClientY);
    const x2 = Math.max(interaction.startClientX, interaction.currentClientX);
    const y2 = Math.max(interaction.startClientY, interaction.currentClientY);
    dom.boardSelection.innerHTML = '<rect class="marquee-selection" x="' + ((x1 - viewBox.left) * unit) +
      '" y="' + ((y1 - viewBox.top) * unit) + '" width="' + ((x2 - x1) * unit) + '" height="' + ((y2 - y1) * unit) +
      '" rx="2" pointer-events="none"/>';
  }

  function finishMarqueeSelection(interaction) {
    if (!interaction.moved) {
      renderSelectionOverlay();
      return;
    }
    const left = Math.min(interaction.startClientX, interaction.currentClientX);
    const top = Math.min(interaction.startClientY, interaction.currentClientY);
    const right = Math.max(interaction.startClientX, interaction.currentClientX);
    const bottom = Math.max(interaction.startClientY, interaction.currentClientY);
    const shot = getSelectedShot();
    const picked = [];
    if (shot) {
      $$('g[data-el-index]', dom.boardElements).forEach(function (group) {
        const idx = Number(group.dataset.elIndex);
        if (!Number.isInteger(idx) || !shot.drawing.elements[idx]) return;
        const rect = group.getBoundingClientRect();
        if (rect.right >= left && rect.left <= right && rect.bottom >= top && rect.top <= bottom) picked.push(idx);
      });
    }
    const base = interaction.additive ? interaction.baseSelection : [];
    setElementSelection(base.concat(picked), null);
    renderSelectionOverlay();
    renderInspector();
    renderLayerList();
    updateSelectionToolbar();
    if (picked.length > 1) toast('已框选 ' + getSelectedElementIndices().length + ' 个元素');
  }

  function renderPathEditOverlay() {
    const shot = getSelectedShot();
    const edit = state.pathEdit;
    if (!shot || !edit || !shot.drawing.elements[edit.index]) {
      state.pathEdit = null;
      return;
    }
    const el = shot.drawing.elements[edit.index];
    if (!el || el.type !== 'path' || !Array.isArray(el.points) || !el.points.length) {
      state.pathEdit = null;
      return;
    }
    const group = dom.boardElements.querySelector('g[data-el-index="' + edit.index + '"]');
    if (!group) return;
    const viewBox = dom.boardSvg.getBoundingClientRect();
    if (!viewBox.width) return;
    const unit = CANVAS_W / viewBox.width;
    const r = 5.2 * unit;
    const rect = group.getBoundingClientRect();
    const x = (rect.left - viewBox.left) * unit;
    const y = (rect.top - viewBox.top) * unit;
    const w = Math.max(8, rect.width * unit);
    const h = Math.max(8, rect.height * unit);
    let matrix = null;
    try { matrix = group.getScreenCTM(); } catch (err) { matrix = null; }
    let markup = '<rect class="selection-outline" x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" rx="6" pointer-events="none"/>';
    el.points.forEach(function (p, i) {
      let cx = p.x;
      let cy = p.y;
      if (matrix) {
        try {
          const screen = new DOMPoint(p.x, p.y).matrixTransform(matrix);
          cx = (screen.x - viewBox.left) * unit;
          cy = (screen.y - viewBox.top) * unit;
        } catch (err) { /* fall back to local points */ }
      }
      markup += '<circle class="path-node" data-path-node="' + i + '" cx="' + cx + '" cy="' + cy + '" r="' + (i === 0 ? r * 1.25 : r) +
        '" pointer-events="all"/>';
    });
    dom.boardSelection.innerHTML = markup;
    updateSelectionToolbar();
  }

  function startPathNodeDrag(e, nodeIndex) {
    const shot = getSelectedShot();
    const edit = state.pathEdit;
    if (!shot || !edit || !shot.drawing.elements[edit.index]) return;
    const el = shot.drawing.elements[edit.index];
    if (!el || el.type !== 'path' || !Array.isArray(el.points)) return;
    e.preventDefault();
    e.stopPropagation();
    state.interaction = {
      type: 'path-node',
      index: edit.index,
      nodeIndex: nodeIndex,
      moved: false,
      historyPushed: false
    };
  }

  function updatePathNodeFromPointer(e) {
    const shot = getSelectedShot();
    const interaction = state.interaction;
    if (!shot || !interaction) return;
    const el = shot.drawing.elements[interaction.index];
    if (!el || el.type !== 'path' || !Array.isArray(el.points)) return;
    const group = dom.boardElements.querySelector('g[data-el-index="' + interaction.index + '"]');
    if (!group) return;
    let raw = eventToBoardPoint(e);
    try {
      const matrix = group.getScreenCTM();
      if (matrix) {
        const inv = matrix.inverse();
        const local = new DOMPoint(e.clientX, e.clientY).matrixTransform(inv);
        raw = { x: local.x, y: local.y };
      }
    } catch (err) { /* fall back to board coordinates */ }
    el.points[interaction.nodeIndex] = { x: round1(raw.x), y: round1(raw.y) };
    el.d = makePolylinePath(el.points, !!el.closed);
    const pathNode = group.querySelector('path');
    if (pathNode) pathNode.setAttribute('d', el.d);
    renderPathEditOverlay();
  }

  function renderSelectionOverlay() {
    if (state.penDraft && state.tool === 'pen') {
      renderPenDraft();
      return;
    }
    if (state.pathEdit) {
      renderPathEditOverlay();
      return;
    }
    const shot = getSelectedShot();
    const indices = getSelectedElementIndices();
    if (!shot || !indices.length) {
      dom.boardSelection.innerHTML = '';
      updateSelectionToolbar();
      return;
    }
    const groups = indices.map(function (i) {
      return dom.boardElements.querySelector('g[data-el-index="' + i + '"]');
    }).filter(Boolean);
    if (!groups.length) {
      dom.boardSelection.innerHTML = '';
      updateSelectionToolbar();
      return;
    }
    try {
      const viewBox = dom.boardSvg.getBoundingClientRect();
      if (!viewBox.width || !viewBox.height) throw new Error('board not visible');
      const rects = groups.map(function (g) { return g.getBoundingClientRect(); });
      const left = Math.min.apply(null, rects.map(function (r) { return r.left; }));
      const top = Math.min.apply(null, rects.map(function (r) { return r.top; }));
      const right = Math.max.apply(null, rects.map(function (r) { return r.right; }));
      const bottom = Math.max.apply(null, rects.map(function (r) { return r.bottom; }));
      const unit = CANVAS_W / viewBox.width;
      const x = (left - viewBox.left) * unit;
      const y = (top - viewBox.top) * unit;
      const w = Math.max(6, (right - left) * unit);
      const h = Math.max(6, (bottom - top) * unit);
      const multi = indices.length > 1;
      let controls = '';
      if (!multi) {
        const coarse = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
        const hs = (coarse ? 14 : 9) * unit;
        const rotateOffset = (coarse ? 34 : 26) * unit;
        const cx = x + w / 2;
        const handleRects = [
          [x, y], [x + w, y], [x, y + h], [x + w, y + h]
        ].map(function (p) {
          return '<rect class="transform-handle" data-transform-handle="scale" x="' + (p[0] - hs / 2) +
            '" y="' + (p[1] - hs / 2) + '" width="' + hs + '" height="' + hs + '" rx="2" pointer-events="all"/>';
        }).join('');
        controls =
          '<line class="selection-rotate-line" x1="' + cx + '" y1="' + y + '" x2="' + cx + '" y2="' + (y - rotateOffset) +
          '" pointer-events="none"/>' +
          '<circle class="transform-handle rotate" data-transform-handle="rotate" cx="' + cx + '" cy="' + (y - rotateOffset - hs) +
          '" r="' + (hs * 0.62) + '" pointer-events="all"/>' +
          handleRects;
      } else {
        const dot = Math.max(3, 2.4 * unit);
        controls = [
          [x, y], [x + w, y], [x, y + h], [x + w, y + h]
        ].map(function (p) {
          return '<rect class="selection-dot" x="' + (p[0] - dot) + '" y="' + (p[1] - dot) +
            '" width="' + (dot * 2) + '" height="' + (dot * 2) + '" rx="' + dot + '" pointer-events="none"/>';
        }).join('');
      }
      dom.boardSelection.innerHTML =
        '<rect class="selection-outline' + (multi ? ' is-multi' : '') + '" x="' + x + '" y="' + y + '" width="' + w +
        '" height="' + h + '" rx="6" pointer-events="none"/>' + controls;
    } catch (err) {
      dom.boardSelection.innerHTML = '';
    }
    updateSelectionToolbar();
  }

  function ensureTransformPivot(el, group) {
    if (el.type === 'asset') return { x: (ASSET_MAP[el.assetId] ? ASSET_MAP[el.assetId].width : 200) / 2, y: (ASSET_MAP[el.assetId] ? ASSET_MAP[el.assetId].height : 200) / 2 };
    if (Number.isFinite(Number(el.pivotX)) && Number.isFinite(Number(el.pivotY))) {
      return { x: Number(el.pivotX), y: Number(el.pivotY) };
    }
    const bbox = group.getBBox();
    el.pivotX = round1(bbox.x + bbox.width / 2);
    el.pivotY = round1(bbox.y + bbox.height / 2);
    return { x: el.pivotX, y: el.pivotY };
  }

  function updateElementGroupTransform(index) {
    const shot = getSelectedShot();
    if (!shot || !shot.drawing.elements[index]) return;
    const el = shot.drawing.elements[index];
    const group = dom.boardElements.querySelector('g[data-el-index="' + index + '"]');
    if (!group) return;
    if (el.type === 'asset') {
      group.setAttribute('transform', D.assetTransform(el, ASSET_MAP[el.assetId]));
    } else {
      group.setAttribute('transform', D.elementTransform(el));
    }
  }

  function startTransformInteraction(e, mode) {
    const shot = getSelectedShot();
    const index = state.selectedElementIndex;
    if (!shot || index == null || !shot.drawing.elements[index]) return;
    const el = shot.drawing.elements[index];
    const group = dom.boardElements.querySelector('g[data-el-index="' + index + '"]');
    if (!group) return;
    e.preventDefault();
    e.stopPropagation();
    const rect = group.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const asset = el.type === 'asset' ? ASSET_MAP[el.assetId] : null;
    const interaction = {
      type: 'transform',
      mode: mode,
      index: index,
      shotId: shot.id,
      centerX: centerX,
      centerY: centerY,
      startClientX: e.clientX,
      startClientY: e.clientY,
      startDist: Math.max(1, Math.hypot(e.clientX - centerX, e.clientY - centerY)),
      startAngle: Math.atan2(e.clientY - centerY, e.clientX - centerX),
      moved: false,
      historyPushed: false
    };
    if (mode === 'rotate') {
      interaction.initialRotation = Number(el.rotation) || 0;
      if (el.type !== 'asset') interaction.pivot = ensureTransformPivot(el, group);
    } else {
      if (el.type === 'asset') {
        const scale = Number(el.scale) || 1;
        interaction.initialScale = scale;
        interaction.assetCenterX = (Number(el.x) || 0) + (asset ? asset.width : 200) * scale / 2;
        interaction.assetCenterY = (Number(el.y) || 0) + (asset ? asset.height : 200) * scale / 2;
        interaction.asset = asset;
      } else {
        const pivot = ensureTransformPivot(el, group);
        interaction.pivot = pivot;
        interaction.initialScaleX = Number(el.scaleX) || 1;
        interaction.initialScaleY = Number(el.scaleY) || 1;
      }
    }
    state.interaction = interaction;
  }

  function renderTransformPreview(el, index) {
    updateElementGroupTransform(index);
    renderSelectionOverlay();
  }

  function updateToolRail() {
    $$('.tool-btn[data-tool]', dom.toolRail).forEach(function (btn) {
      btn.classList.toggle('active', btn.dataset.tool === state.tool);
    });
    if (dom.guidesBtn) dom.guidesBtn.classList.toggle('active', !!state.guides);
  }

  function setActiveTool(tool) {
    if (!ALLOWED_TOOLS.has(tool)) return;
    if (state.textEditor) commitTextEditor(true);
    if (state.tool === 'pen' && tool !== 'pen' && state.penDraft) finishPenDraft(false);
    state.tool = tool;
    dom.boardSvg.setAttribute('data-tool', tool);
    if (!getSelectedShot() && dom.boardEmpty) {
      dom.boardEmpty.hidden = !(tool === 'select' || tool === 'eraser');
    }
    dom.boardCaptionText.textContent = TOOL_HINTS[tool] || TOOL_HINTS.select;
    updateToolRail();
    renderSelectionOverlay();
    updateSelectionToolbar();
    renderInspector();
  }

  function resetDrawingSelection() {
    state.selectedElementIndex = null;
    state.multiSelection = [];
    state.pathEdit = null;
    renderSelectionOverlay();
    updateSelectionToolbar();
    renderInspector();
  }

  function updateSelectionToolbar() {
    if (!dom.selectionToolbar) return;
    const shot = getSelectedShot();
    const indices = getSelectedElementIndices();
    const idx = state.selectedElementIndex;
    const el = shot && idx != null ? shot.drawing.elements[idx] : null;
    if (!el) {
      dom.selectionToolbar.hidden = true;
      if (dom.selectionAlignGroup) dom.selectionAlignGroup.hidden = true;
      if (dom.selectionAlignDivider) dom.selectionAlignDivider.hidden = true;
      return;
    }
    dom.selectionToolbar.hidden = false;
    const multi = indices.length > 1;
    if (dom.selectionToolbarLabel) {
      dom.selectionToolbarLabel.textContent = multi ? (indices.length + ' 个元素') : elementTypeLabel(el);
    }
    [dom.selectionCopyBtn, dom.selectionDeleteBtn].forEach(function (btn) { if (btn) btn.disabled = false; });
    if (dom.selectionLayerUpBtn) dom.selectionLayerUpBtn.disabled = multi || idx >= shot.drawing.elements.length - 1;
    if (dom.selectionLayerDownBtn) dom.selectionLayerDownBtn.disabled = multi || idx <= 0;
    if (dom.selectionAlignGroup) dom.selectionAlignGroup.hidden = !multi;
    if (dom.selectionAlignDivider) dom.selectionAlignDivider.hidden = !multi;
    if (multi && dom.selectionAlignGroup) {
      $$('[data-align]', dom.selectionAlignGroup).forEach(function (btn) {
        const isDistribute = btn.dataset.align.indexOf('distribute') === 0;
        btn.disabled = isDistribute && indices.length < 3;
      });
    }
  }

  /* ============================================================
     Rendering — inspector
     ============================================================ */

  function fillSelectOptions(select, options, currentValue) {
    if (!select) return;
    const list = options.slice();
    if (currentValue && !list.some(function (o) { return o.value === currentValue; })) {
      list.push({ value: currentValue, label: currentValue });
    }
    select.innerHTML = list.map(function (o) {
      return '<option value="' + escapeAttr(o.value) + '">' + escapeHtml(o.label) + '</option>';
    }).join('');
    if (currentValue) select.value = currentValue;
  }

  function setSelectValue(select, options, value) {
    if (!select) return;
    const exists = options.some(function (o) { return o.value === value; });
    if (!exists) {
      const opt = document.createElement('option');
      opt.value = value || '';
      opt.textContent = value || '—';
      select.appendChild(opt);
    }
    select.value = value || '';
  }

  function populateStaticSelects() {
    fillSelectOptions(dom.shotSizeSelect, SHOT_SIZES, 'MS');
    fillSelectOptions(dom.angleSelect, ANGLES, '平视');
    fillSelectOptions(dom.movementSelect, MOVEMENTS, '固定');
  }

  function setSegmentedActive(container, attr, value) {
    if (!container) return;
    $$('button', container).forEach(function (btn) {
      btn.classList.toggle('active', String(btn.dataset[attr]) === String(value));
    });
  }

  function setInspectorDisabled(disabled) {
    dom.inspectorPanel.classList.toggle('is-disabled', disabled);
    [
      dom.inspectorMinus, dom.inspectorPlus, dom.inspectorDuration, dom.shotSizeSelect,
      dom.angleSelect, dom.movementSelect, dom.shotNote, dom.shotNameInput
    ].forEach(function (node) {
      if (node) node.disabled = disabled;
    });
    $$('button', dom.inspectorChips).forEach(function (b) { b.disabled = disabled; });
    $$('.step-btn', dom.inspectorPanel).forEach(function (b) { b.disabled = disabled; });
  }

  function renderInspector() {
    const shot = getSelectedShot();
    setInspectorDisabled(!shot);

    if (!shot) {
      if (dom.inspectorDuration) dom.inspectorDuration.value = '';
      if (dom.inspectorFrames) dom.inspectorFrames.textContent = '—';
      if (dom.inspectorShare) dom.inspectorShare.textContent = '—';
      if (dom.shotNote) dom.shotNote.value = '';
      if (dom.shotNameInput) dom.shotNameInput.value = '';
      if (dom.dockShot) dom.dockShot.textContent = '未选择镜头';
      if (dom.selectedElementLabel) dom.selectedElementLabel.textContent = '未选择元素';
      if (dom.elementScaleInput) { dom.elementScaleInput.value = ''; dom.elementScaleInput.disabled = true; }
      if (dom.elementRotationInput) { dom.elementRotationInput.value = ''; dom.elementRotationInput.disabled = true; }
      if (dom.layerList) dom.layerList.innerHTML = '<div class="layer-empty">画布还空着</div>';
      if (dom.layerCount) dom.layerCount.textContent = '0';
      setSegmentedActive(dom.strokeWidthSeg, 'width', state.brushWidth);
      setSegmentedActive(dom.fillSeg, 'fill', state.brushFill);
      updateElementActionButtons();
      syncDurationUI();
      return;
    }

    if (dom.shotNameInput && document.activeElement !== dom.shotNameInput) {
      dom.shotNameInput.value = shot.name || '';
    }
    setSelectValue(dom.shotSizeSelect, SHOT_SIZES, shot.shotSize);
    setSelectValue(dom.angleSelect, ANGLES, shot.angle);
    setSelectValue(dom.movementSelect, MOVEMENTS, shot.movement);
    if (document.activeElement !== dom.shotNote) dom.shotNote.value = shot.note || '';

    const total = totalDuration();
    const share = total > 0 ? Math.round((shot.duration / total) * 100) : 0;
    if (dom.inspectorFrames) dom.inspectorFrames.textContent = Math.round(shot.duration * DEFAULT_FPS) + ' 帧';
    if (dom.inspectorShare) dom.inspectorShare.textContent = '占全片 ' + share + '%';

    const selectedIndices = getSelectedElementIndices();
    const selectedEl = state.selectedElementIndex != null ? shot.drawing.elements[state.selectedElementIndex] : null;
    const isMulti = selectedIndices.length > 1;
    if (dom.selectedElementLabel) {
      dom.selectedElementLabel.textContent = isMulti
        ? ('已选 ' + selectedIndices.length + ' 个元素')
        : (selectedEl ? ('#' + pad2(state.selectedElementIndex + 1) + ' · ' + elementTypeLabel(selectedEl)) : '未选择元素');
    }
    if (selectedEl) {
      setSegmentedActive(dom.strokeWidthSeg, 'width', Math.round(selectedEl.width) || 4);
      const fill = selectedEl.fill || 'none';
      setSegmentedActive(dom.fillSeg, 'fill', fill);
    } else {
      setSegmentedActive(dom.strokeWidthSeg, 'width', state.brushWidth);
      setSegmentedActive(dom.fillSeg, 'fill', state.brushFill);
    }
    const isPaintless = !!(selectedEl && (selectedEl.type === 'asset' || selectedEl.type === 'image'));
    if (dom.strokeWidthSeg) dom.strokeWidthSeg.classList.toggle('is-disabled', isPaintless);
    if (dom.fillSeg) dom.fillSeg.classList.toggle('is-disabled', isPaintless);
    if (dom.elementScaleInput) {
      if (selectedEl && !isMulti) {
        const pct = selectedEl.type === 'asset'
          ? (Number(selectedEl.scale) || 1) * 100
          : (Number(selectedEl.scaleX) || 1) * 100;
        if (document.activeElement !== dom.elementScaleInput) dom.elementScaleInput.value = String(Math.round(pct));
        dom.elementScaleInput.disabled = false;
      } else {
        dom.elementScaleInput.value = isMulti ? '—' : '';
        dom.elementScaleInput.disabled = true;
      }
    }
    if (dom.elementRotationInput) {
      if (selectedEl && !isMulti) {
        if (document.activeElement !== dom.elementRotationInput) dom.elementRotationInput.value = String(round1(Number(selectedEl.rotation) || 0));
        dom.elementRotationInput.disabled = false;
      } else {
        dom.elementRotationInput.value = isMulti ? '—' : '';
        dom.elementRotationInput.disabled = true;
      }
    }
    updateElementActionButtons();
    updateSelectionToolbar();
    renderLayerList();
    syncDurationUI();
  }

  function elementLayerName(el, index) {
    if (!el) return '元素';
    if (el.type === 'asset') {
      const asset = ASSET_MAP[el.assetId];
      return asset ? asset.name : '素材';
    }
    if (el.type === 'text') return '文字 · ' + String(el.text || '').slice(0, 10);
    return elementTypeLabel(el);
  }

  function renderLayerList() {
    if (!dom.layerList) return;
    const shot = getSelectedShot();
    if (!shot) {
      dom.layerList.innerHTML = '<div class="layer-empty">画布还空着</div>';
      if (dom.layerCount) dom.layerCount.textContent = '0';
      return;
    }
    const els = shot.drawing.elements;
    if (dom.layerCount) dom.layerCount.textContent = String(els.length);
    if (!els.length) {
      dom.layerList.innerHTML = '<div class="layer-empty">画布还空着</div>';
      return;
    }
    const rows = [];
    const selectedSet = new Set(getSelectedElementIndices());
    for (let i = els.length - 1; i >= 0; i--) {
      const el = els[i];
      const active = selectedSet.has(i);
      const icon = el.type === 'asset' ? '#i-person' : (el.type === 'image' ? '#i-image' : (el.type === 'text' ? '#i-text' : (el.type === 'line' ? '#i-line' : (el.type === 'path' ? '#i-pencil' : '#i-rect'))));
      rows.push('<button type="button" class="layer-item' + (active ? ' active' : '') + '" data-layer-index="' + i + '">' +
        '<span class="layer-icon"><svg class="icon"><use href="' + icon + '"/></svg></span>' +
        '<span class="layer-name">' + escapeHtml(elementLayerName(el, i)) + '</span>' +
        '<span class="layer-no">' + pad2(i + 1) + '</span>' +
      '</button>');
    }
    dom.layerList.innerHTML = rows.join('');
  }

  function selectElement(index) {
    const shot = getSelectedShot();
    if (!shot || !shot.drawing.elements[index]) return;
    state.selectedElementIndex = index;
    state.multiSelection = [];
    state.pathEdit = null;
    renderSelectionOverlay();
    renderInspector();
  }

  function elementTypeLabel(el) {
    if (!el) return '元素';
    if (el.type === 'line') return el.arrowEnd ? '箭头' : '直线';
    if (el.type === 'path') return '自由线条';
    if (el.type === 'rect') return '矩形';
    if (el.type === 'ellipse') return '椭圆';
    if (el.type === 'text') return '文字';
    if (el.type === 'image') return '图片';
    if (el.type === 'asset') {
      const asset = ASSET_MAP[el.assetId];
      return asset ? asset.name : '素材';
    }
    return '元素';
  }

  function updateElementActionButtons() {
    const shot = getSelectedShot();
    const indices = getSelectedElementIndices();
    const has = indices.length > 0 && !!shot;
    const multi = indices.length > 1;
    const idx = state.selectedElementIndex;
    const maxIndex = shot ? shot.drawing.elements.length - 1 : -1;
    [dom.layerUpBtn, dom.layerDownBtn].forEach(function (btn) {
      if (btn) btn.disabled = !has || multi;
    });
    if (dom.layerUpBtn) dom.layerUpBtn.disabled = !has || multi || idx == null || idx >= maxIndex;
    if (dom.layerDownBtn) dom.layerDownBtn.disabled = !has || multi || idx == null || idx <= 0;
    [dom.duplicateElementBtn, dom.deleteElementBtn].forEach(function (btn) {
      if (btn) btn.disabled = !has;
    });
  }

  function setChipActive(container, value) {
    if (!container) return;
    $$('[data-duration]', container).forEach(function (btn) {
      const v = Number(btn.dataset.duration);
      btn.classList.toggle('active', Math.abs(v - Number(value)) < 0.001);
    });
  }

  function syncDurationUI() {
    const shot = getSelectedShot();
    const total = totalDuration();
    const totalText = formatSeconds(total);

    if (dom.timeTotal) dom.timeTotal.textContent = formatTimecode(total);
    if (dom.timelineTotal) dom.timelineTotal.textContent = totalText;
    if (dom.timeCurrent) dom.timeCurrent.textContent = formatTimecode(state.playhead);

    const pausedInput = document.activeElement;
    if (shot) {
      if (dom.inspectorDuration && pausedInput !== dom.inspectorDuration) {
        dom.inspectorDuration.value = String(round1(shot.duration));
      }
      if (dom.durationCustom && pausedInput !== dom.durationCustom) {
        dom.durationCustom.value = String(round1(shot.duration));
      }
      if (dom.inspectorFrames) dom.inspectorFrames.textContent = Math.round(shot.duration * DEFAULT_FPS) + ' 帧';
      if (dom.inspectorShare) {
        dom.inspectorShare.textContent = '占全片 ' + (total > 0 ? Math.round(shot.duration / total * 100) : 0) + '%';
      }
      if (dom.dockFrames) dom.dockFrames.textContent = Math.round(shot.duration * DEFAULT_FPS) + ' 帧';
      const index = getShotIndexById(shot.id);
      if (dom.dockShot) dom.dockShot.textContent = '镜头 ' + pad2(index + 1) + ' · ' + shot.name;
      setChipActive(dom.inspectorChips, shot.duration);
      setChipActive(dom.durationChoices, shot.duration);
    } else {
      if (dom.inspectorDuration) dom.inspectorDuration.value = '';
      if (dom.durationCustom) dom.durationCustom.value = '';
      if (dom.inspectorFrames) dom.inspectorFrames.textContent = '—';
      if (dom.inspectorShare) dom.inspectorShare.textContent = '—';
      if (dom.dockFrames) dom.dockFrames.textContent = '—';
      if (dom.dockShot) dom.dockShot.textContent = '未选择镜头';
      setChipActive(dom.inspectorChips, -1);
      setChipActive(dom.durationChoices, -1);
    }
    if (dom.zoomLabel) dom.zoomLabel.textContent = String(Math.round(state.zoom * 100));
    [dom.inspectorMinus, dom.inspectorPlus, dom.inspectorDuration].forEach(function (node) {
      if (node) node.disabled = !shot;
    });
    $$('[data-duration]', dom.durationChoices).forEach(function (b) { b.disabled = !shot; });
    if (dom.durationCustom) dom.durationCustom.disabled = !shot;
    if (dom.previewShotBtn) dom.previewShotBtn.disabled = !shot;
    if (dom.timelinePlayBtn) dom.timelinePlayBtn.disabled = getShotList().length === 0;
    updateOrderButtons();
  }

  /* ============================================================
     Rendering — timeline
     ============================================================ */

  function computeBasePps() {
    const width = Math.max(320, (dom.timelineScroll ? dom.timelineScroll.clientWidth : 1200) - 100);
    const total = Math.max(0.5, totalDuration());
    state.basePps = clamp(width / total, 54, 110);
  }

  function currentPps() {
    if (!state.basePps) computeBasePps();
    return state.basePps * state.zoom;
  }

  function renderTimeline() {
    if (!state.project) return;
    const shots = getShotList();
    const total = totalDuration();
    const pps = currentPps();
    state.currentPps = pps;
    const baseWidth = Math.max(300, (dom.timelineScroll.clientWidth || 1100) - 40);
    const contentWidth = Math.max(baseWidth, 4 + total * pps + 72);
    dom.timelineCanvas.style.width = contentWidth + 'px';
    dom.playhead.hidden = shots.length === 0;

    const step = pps >= 40 ? 1 : pps >= 20 ? 2 : 5;
    const endSecond = Math.max(0, Math.ceil(total + 0.01));
    let rulerHtml = '';
    for (let s = 0; s <= endSecond; s++) {
      const left = 4 + s * pps;
      if (left > contentWidth - 18) break;
      const major = s % step === 0;
      rulerHtml += '<span class="ruler-tick ' + (major ? 'major' : 'minor') + '" style="left:' + left + 'px">' +
        (major ? formatRuler(s) : '') + '</span>';
    }
    dom.ruler.innerHTML = rulerHtml;

    if (!shots.length) {
      dom.shotTrack.innerHTML = '<div class="timeline-empty">还没有镜头，从左侧加入第一个分镜</div>';
    } else {
      const starts = getShotStarts();
      dom.shotTrack.innerHTML = shots.map(function (shot, index) {
        const width = Math.max(18, shot.duration * pps);
        const selected = shot.id === state.selectedShotId;
        const hasDrawing = shot.drawing.elements.length > 0;
        const svg = hasDrawing
          ? D.drawingMarkup(shot.drawing, { className: 'thumb-art', indexed: false })
          : '';
        return '<div class="shot-block' + (selected ? ' selected' : '') + '" role="button" tabindex="0" title="拖动调整镜头顺序 · 拖右缘改时长" data-shot-id="' +
          escapeAttr(shot.id) + '" style="left:' + (4 + starts[index] * pps) + 'px;width:' + width + 'px">' +
          '<span class="block-preview' + (hasDrawing ? '' : ' empty-drawing') + '">' + svg + '</span>' +
          '<span class="block-shade"></span>' +
          '<span class="block-topline"><span class="block-index">' + pad2(index + 1) + '</span></span>' +
          '<span class="block-bottom"><span class="block-name">' + escapeHtml(shot.name) + '</span><span class="block-duration">' + formatSeconds(shot.duration) + '</span></span>' +
          '<span class="resize-handle" title="拖动调整时长" aria-hidden="true"></span>' +
        '</div>';
      }).join('');
    }

    if (dom.sequenceNumber) dom.sequenceNumber.textContent = shots.length + ' 个镜头';
    setPlayheadUI(state.playhead);
    syncDurationUI();
  }

  function setPlayheadUI(time) {
    const total = totalDuration();
    state.playhead = clamp(time, 0, total);
    const pps = state.currentPps || currentPps();
    if (dom.playhead) {
      dom.playhead.style.left = (4 + state.playhead * pps) + 'px';
      dom.playhead.hidden = getShotList().length === 0;
    }
    if (dom.timeCurrent) dom.timeCurrent.textContent = formatTimecode(state.playhead);
  }

  function syncTimelineSelection() {
    if (!dom.shotTrack) return;
    $$('.shot-block', dom.shotTrack).forEach(function (block) {
      block.classList.toggle('selected', block.dataset.shotId === state.selectedShotId);
    });
  }

  function scrollToShot(shotId) {
    const blocks = $$('.shot-block', dom.shotTrack);
    const block = blocks.find(function (b) { return b.dataset.shotId === shotId; });
    if (!block) return;
    const left = parseFloat(block.style.left) || 0;
    const width = parseFloat(block.style.width) || 60;
    const viewport = dom.timelineScroll.clientWidth;
    if (left + width > dom.timelineScroll.scrollLeft + viewport - 40 || left < dom.timelineScroll.scrollLeft + 10) {
      dom.timelineScroll.scrollTo({ left: Math.max(0, left - 80), behavior: 'smooth' });
    }
  }

  /* ============================================================
     Main render
     ============================================================ */

  function renderAll() {
    if (!state.project) return;
    if (!getSelectedShot() && getShotList().length) {
      state.selectedShotId = getShotList()[0].id;
    }
    if (dom.projectTitle && document.activeElement !== dom.projectTitle) {
      dom.projectTitle.value = state.project.title;
    }
    if (dom.projectNumber) dom.projectNumber.textContent = '01';
    renderStage();
    renderInspector();
    renderTimeline();
    updateHistoryButtons();
    updateToolRail();
    setSaveState(state.saveStateValue === 'saving' ? 'saving' : 'saved', state.saveStateValue === 'saving' ? '保存中' : '已保存');
    document.title = state.project.title + ' · APERTURE';
  }

  /* ============================================================
     Layout
     ============================================================ */

  function fitBoard() {
    if (!dom.boardViewport || !dom.boardFrame) return;
    const viewport = dom.boardViewport;
    const style = window.getComputedStyle(viewport);
    const padX = parseFloat(style.paddingLeft || '0') + parseFloat(style.paddingRight || '0');
    const padY = parseFloat(style.paddingTop || '0') + parseFloat(style.paddingBottom || '0');
    const availW = Math.max(80, viewport.clientWidth - padX);
    const availH = Math.max(60, viewport.clientHeight - padY);
    let width = availW;
    let height = width * 9 / 16;
    if (height > availH) {
      height = availH;
      width = height * 16 / 9;
    }
    state.boardBaseW = Math.max(120, Math.floor(width));
    state.boardBaseH = Math.max(68, Math.floor(height));
    applyCanvasView();
  }

  function clampCanvasPan() {
    const frameW = state.boardBaseW * state.canvasZoom;
    const frameH = state.boardBaseH * state.canvasZoom;
    const viewW = dom.boardViewport ? dom.boardViewport.clientWidth : frameW;
    const viewH = dom.boardViewport ? dom.boardViewport.clientHeight : frameH;
    if (state.canvasZoom <= 1) {
      state.canvasPanX = 0;
      state.canvasPanY = 0;
      return;
    }
    const maxX = Math.max(0, (frameW - viewW) / 2 + 30);
    const maxY = Math.max(0, (frameH - viewH) / 2 + 30);
    state.canvasPanX = clamp(state.canvasPanX, -maxX, maxX);
    state.canvasPanY = clamp(state.canvasPanY, -maxY, maxY);
  }

  function applyCanvasView() {
    if (!dom.boardFrame || !state.boardBaseW || !state.boardBaseH) return;
    clampCanvasPan();
    const width = Math.floor(state.boardBaseW * state.canvasZoom);
    const height = Math.floor(state.boardBaseH * state.canvasZoom);
    dom.boardFrame.style.width = width + 'px';
    dom.boardFrame.style.height = height + 'px';
    dom.boardFrame.style.transform = 'translate(' + state.canvasPanX + 'px, ' + state.canvasPanY + 'px)';
    if (dom.canvasZoomLabel) dom.canvasZoomLabel.textContent = Math.round(state.canvasZoom * 100) + '%';
    renderSelectionOverlay();
  }

  function setCanvasZoom(next) {
    state.canvasZoom = clamp(Math.round(next * 100) / 100, 0.25, 4);
    if (state.canvasZoom <= 1) {
      state.canvasPanX = 0;
      state.canvasPanY = 0;
    }
    applyCanvasView();
  }

  function resetCanvasView() {
    state.canvasZoom = 1;
    state.canvasPanX = 0;
    state.canvasPanY = 0;
    fitBoard();
    applyCanvasView();
  }

  function resetTimelineScaleAndRender() {
    state.basePps = null;
    renderTimeline();
  }

  /* ============================================================
     Selection and mutations
     ============================================================ */

  function selectShot(id, options) {
    if (!id) return;
    if (!getShotById(id)) return;
    const opts = options || {};
    state.selectedShotId = id;
    state.selectedElementIndex = null;
    state.multiSelection = [];
    state.penDraft = null;
    state.pathEdit = null;
    if (opts.seek !== false) {
      const idx = getShotIndexById(id);
      const starts = getShotStarts();
      setPlayheadUI(starts[idx] || 0);
    }
    renderStage();
    renderInspector();
    syncTimelineSelection();
    if (opts.scroll) scrollToShot(id);
  }

  function createNewShot(shot, options) {
    const opts = options || {};
    pushHistory();
    if (!state.project) state.project = makeEmptyProject('未命名分镜');
    state.project.shots.push(shot);
    state.selectedShotId = shot.id;
    state.selectedElementIndex = null;
    state.multiSelection = [];
    if (!opts.keepTool) state.tool = 'select';
    clampPlayhead();
    const starts = getShotStarts();
    const idx = getShotIndexById(shot.id);
    state.playhead = starts[idx] || 0;
    state.basePps = null;
    renderAll();
    fitBoard();
    saveSoon();
    requestAnimationFrame(function () { scrollToShot(shot.id); });
    if (opts.toast !== false) toast((opts.label || '已加入时间轴') + ' · ' + shot.name);
  }

  function addPresetToTimeline(presetId) {
    const preset = PRESET_MAP[presetId];
    if (!preset) return;
    createNewShot(shotFromPreset(preset), { label: '已加入预设' });
    if (window.innerWidth <= 700) closeMobileLibrary();
  }

  function readImageFile(file) {
    return new Promise(function (resolve, reject) {
      if (!file || !/^image\//i.test(file.type || '')) {
        reject(new Error('请选择 PNG / JPG / WebP 图片'));
        return;
      }
      if (file.size > 20 * 1024 * 1024) {
        reject(new Error('图片超过 20MB，请压缩后再试'));
        return;
      }
      const reader = new FileReader();
      reader.onerror = function () { reject(new Error('图片读取失败')); };
      reader.onload = function () {
        const image = new Image();
        image.onerror = function () { reject(new Error('图片格式无法识别')); };
        image.onload = function () {
          try {
            const ratio = Math.min(1, 1600 / Math.max(1, image.naturalWidth), 1600 / Math.max(1, image.naturalHeight));
            const cw = Math.max(1, Math.round(image.naturalWidth * ratio));
            const ch = Math.max(1, Math.round(image.naturalHeight * ratio));
            const canvas = document.createElement('canvas');
            canvas.width = cw;
            canvas.height = ch;
            const ctx = canvas.getContext('2d');
            ctx.fillStyle = '#fffdf8';
            ctx.fillRect(0, 0, cw, ch);
            ctx.drawImage(image, 0, 0, cw, ch);
            resolve({ src: canvas.toDataURL('image/jpeg', 0.86), width: cw, height: ch });
          } catch (err) {
            reject(new Error('图片处理失败'));
          }
        };
        image.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  }

  async function importImageFile(file) {
    let imageData;
    try {
      imageData = await readImageFile(file);
    } catch (err) {
      toast(err.message || '图片导入失败');
      return;
    }
    if (!getSelectedShot()) {
      createNewShot(makeBlankShot(), { toast: false, label: '' });
    }
    const shot = getSelectedShot();
    if (!shot) return;
    const fit = Math.min(1, 1320 / Math.max(1, imageData.width), 720 / Math.max(1, imageData.height));
    const w = round1(imageData.width * fit);
    const h = round1(imageData.height * fit);
    const el = {
      type: 'image',
      src: imageData.src,
      x: round1((CANVAS_W - w) / 2),
      y: round1((CANVAS_H - h) / 2),
      w: w,
      h: h,
      opacity: 1
    };
    pushHistory();
    shot.drawing.elements.push(el);
    setElementSelection([shot.drawing.elements.length - 1], shot.drawing.elements.length - 1);
    renderStage();
    renderInspector();
    renderTimeline();
    saveSoon();
    toast('图片已插入 · 拖动角点缩放');
  }

  function insertAsset(assetId, dropPoint) {
    const asset = ASSET_MAP[assetId];
    if (!asset) {
      toast('素材加载失败');
      return;
    }
    if (!ASSETS.length) {
      toast('素材库还未准备好');
      return;
    }
    if (!getSelectedShot()) {
      createNewShot(makeBlankShot(), { toast: false, label: '' });
    }
    const shot = getSelectedShot();
    if (!shot) return;
    const scale = Math.min(1, 1320 / Math.max(1, asset.width), 720 / Math.max(1, asset.height));
    let x = round1((CANVAS_W - asset.width * scale) / 2);
    let y = round1((CANVAS_H - asset.height * scale) / 2);
    if (dropPoint) {
      x = round1(clamp(dropPoint.x - asset.width * scale / 2, 0, CANVAS_W - asset.width * scale));
      y = round1(clamp(dropPoint.y - asset.height * scale / 2, 0, CANVAS_H - asset.height * scale));
    }
    pushHistory();
    shot.drawing.elements.push({
      type: 'asset',
      assetId: asset.id,
      x: x,
      y: y,
      scale: round1(scale * 100) / 100
    });
    state.selectedElementIndex = shot.drawing.elements.length - 1;
    state.tool = 'select';
    renderStage();
    renderInspector();
    renderTimeline();
    updateToolRail();
    saveSoon();
    if (window.innerWidth <= 700) closeMobileLibrary();
    toast('已插入素材 · ' + asset.name);
  }

  function addBlankShot() {
    const shot = makeBlankShot();
    createNewShot(shot, { label: '新建空镜头' });
    setTimeout(function () {
      state.tool = 'pencil';
      setActiveTool('pencil');
    }, 50);
  }

  function duplicateSelectedShot() {
    const shot = getSelectedShot();
    if (!shot) return;
    pushHistory();
    const copy = deepClone(shot);
    copy.id = uid('shot');
    const idx = getSelectedShotIndex();
    state.project.shots.splice(idx + 1, 0, copy);
    state.selectedShotId = copy.id;
    state.selectedElementIndex = null;
    state.basePps = null;
    clampPlayhead();
    renderAll();
    fitBoard();
    saveSoon();
    toast('镜头已复制');
  }

  function deleteSelectedShot() {
    const shot = getSelectedShot();
    if (!shot) return;
    pushHistory();
    const idx = getSelectedShotIndex();
    state.project.shots.splice(idx, 1);
    if (state.project.shots.length) {
      state.selectedShotId = state.project.shots[Math.min(idx, state.project.shots.length - 1)].id;
    } else {
      state.selectedShotId = null;
    }
    state.selectedElementIndex = null;
    state.multiSelection = [];
    state.basePps = null;
    clampPlayhead();
    renderAll();
    fitBoard();
    saveSoon();
    toast('已删除镜头 · ⌘Z 可撤销');
  }

  function changeDuration(value, options) {
    const opts = options || {};
    const shot = getSelectedShot();
    if (!shot) return;
    const next = clamp(round1(value), 0.5, 60);
    if (Math.abs(shot.duration - next) < 0.001) {
      syncDurationUI();
      return;
    }
    if (opts.history !== false) pushHistory();
    shot.duration = next;
    clampPlayhead();
    renderTimeline();
    saveSoon();
  }

  function stepDuration(delta) {
    const shot = getSelectedShot();
    if (!shot) return;
    changeDuration(shot.duration + delta);
  }

  function removeElementAt(index, interaction) {
    const shot = getSelectedShot();
    if (!shot || !shot.drawing.elements[index]) return false;
    if (interaction && interaction.historyPushed) {
      // One undo step for a whole eraser stroke.
    } else {
      pushHistory();
      if (interaction) interaction.historyPushed = true;
    }
    shot.drawing.elements.splice(index, 1);
    if (state.selectedElementIndex === index) state.selectedElementIndex = null;
    else if (state.selectedElementIndex != null && state.selectedElementIndex > index) state.selectedElementIndex -= 1;
    state.multiSelection = state.multiSelection
      .filter(function (i) { return i !== index; })
      .map(function (i) { return i > index ? i - 1 : i; });
    renderBoard();
    renderInspector();
    renderStage();
    renderTimeline();
    updateSelectionToolbar();
    saveSoon();
    return true;
  }

  function elementIndexAtPoint(clientX, clientY) {
    const node = document.elementFromPoint(clientX, clientY);
    if (!node || !node.closest || !dom.boardFrame.contains(node)) return null;
    const group = node.closest('g[data-el-index]');
    if (!group) return null;
    const raw = group.getAttribute('data-el-index');
    if (raw == null || raw === '') return null;
    const idx = Number(raw);
    return Number.isInteger(idx) ? idx : null;
  }

  function copySelectedElements() {
    const shot = getSelectedShot();
    const indices = getSelectedElementIndices();
    if (!shot || !indices.length) return;
    state.clipboard = indices.map(function (i) { return deepClone(shot.drawing.elements[i]); });
    toast('已复制 ' + indices.length + ' 个元素 · ⌘V 粘贴');
  }

  function pasteElements() {
    if (!state.clipboard || !state.clipboard.length) return;
    let shot = getSelectedShot();
    if (!shot) {
      createNewShot(makeBlankShot(), { toast: false, label: '' });
      shot = getSelectedShot();
    }
    if (!shot) return;
    pushHistory();
    const added = [];
    state.clipboard.forEach(function (source) {
      const copy = deepClone(source);
      if (copy.type === 'asset') {
        copy.x = (Number(copy.x) || 0) + 32;
        copy.y = (Number(copy.y) || 0) + 32;
      } else {
        copy.tx = (Number(copy.tx) || 0) + 32;
        copy.ty = (Number(copy.ty) || 0) + 32;
      }
      shot.drawing.elements.push(copy);
      added.push(shot.drawing.elements.length - 1);
    });
    setElementSelection(added, added[added.length - 1]);
    renderStage();
    renderInspector();
    renderTimeline();
    saveSoon();
    toast('已粘贴 ' + added.length + ' 个元素');
  }

  function duplicateSelectedElement() {
    const shot = getSelectedShot();
    const indices = getSelectedElementIndices();
    if (!shot || !indices.length) return;
    pushHistory();
    if (indices.length === 1) {
      const idx = indices[0];
      const copy = deepClone(shot.drawing.elements[idx]);
      if (copy.type === 'asset') {
        copy.x = (Number(copy.x) || 0) + 28;
        copy.y = (Number(copy.y) || 0) + 28;
      } else {
        copy.tx = (Number(copy.tx) || 0) + 28;
        copy.ty = (Number(copy.ty) || 0) + 28;
      }
      shot.drawing.elements.splice(idx + 1, 0, copy);
      setElementSelection([idx + 1], idx + 1);
    } else {
      const newIndices = [];
      indices.forEach(function (idx) {
        const copy = deepClone(shot.drawing.elements[idx]);
        if (copy.type === 'asset') {
          copy.x = (Number(copy.x) || 0) + 28;
          copy.y = (Number(copy.y) || 0) + 28;
        } else {
          copy.tx = (Number(copy.tx) || 0) + 28;
          copy.ty = (Number(copy.ty) || 0) + 28;
        }
        shot.drawing.elements.push(copy);
        newIndices.push(shot.drawing.elements.length - 1);
      });
      setElementSelection(newIndices, newIndices[newIndices.length - 1]);
      toast('已复制 ' + indices.length + ' 个元素 · ⌘Z 可撤销');
    }
    renderBoard();
    renderInspector();
    renderTimeline();
    saveSoon();
  }

  function deleteSelectedElements() {
    const shot = getSelectedShot();
    const indices = getSelectedElementIndices();
    if (!shot || !indices.length) return;
    pushHistory();
    indices.slice().sort(function (a, b) { return b - a; }).forEach(function (idx) {
      shot.drawing.elements.splice(idx, 1);
    });
    clearElementSelection();
    renderBoard();
    renderInspector();
    renderStage();
    renderTimeline();
    updateSelectionToolbar();
    saveSoon();
    if (indices.length > 1) toast('已删除 ' + indices.length + ' 个元素 · ⌘Z 可撤销');
  }

  function alignSelectedElements(mode) {
    const shot = getSelectedShot();
    const indices = getSelectedElementIndices();
    if (!shot || indices.length < 2) return;
    const boardRect = dom.boardSvg.getBoundingClientRect();
    if (!boardRect.width || !boardRect.height) return;
    const items = indices.map(function (idx) {
      const group = dom.boardElements.querySelector('g[data-el-index="' + idx + '"]');
      const rect = group ? group.getBoundingClientRect() : null;
      return { index: idx, rect: rect, el: shot.drawing.elements[idx] };
    }).filter(function (it) { return it.rect && it.el; });
    if (items.length < 2) return;
    const left = Math.min.apply(null, items.map(function (it) { return it.rect.left; }));
    const top = Math.min.apply(null, items.map(function (it) { return it.rect.top; }));
    const right = Math.max.apply(null, items.map(function (it) { return it.rect.right; }));
    const bottom = Math.max.apply(null, items.map(function (it) { return it.rect.bottom; }));
    const centerX = (left + right) / 2;
    const centerY = (top + bottom) / 2;
    const moves = items.map(function (it) { return { index: it.index, dx: 0, dy: 0, el: it.el }; });
    if (mode === 'left') moves.forEach(function (m, i) { m.dx = left - items[i].rect.left; });
    else if (mode === 'right') moves.forEach(function (m, i) { m.dx = right - items[i].rect.right; });
    else if (mode === 'hcenter') moves.forEach(function (m, i) { m.dx = centerX - (items[i].rect.left + items[i].rect.right) / 2; });
    else if (mode === 'top') moves.forEach(function (m, i) { m.dy = top - items[i].rect.top; });
    else if (mode === 'bottom') moves.forEach(function (m, i) { m.dy = bottom - items[i].rect.bottom; });
    else if (mode === 'vcenter') moves.forEach(function (m, i) { m.dy = centerY - (items[i].rect.top + items[i].rect.bottom) / 2; });
    else if (mode === 'distribute-h') {
      if (items.length < 3) return;
      const ordered = items.slice().sort(function (a, b) { return a.rect.left - b.rect.left; });
      const widths = ordered.reduce(function (sum, it) { return sum + it.rect.width; }, 0);
      const gap = (right - left - widths) / (ordered.length - 1);
      let cursor = left;
      ordered.forEach(function (it) {
        const move = moves.find(function (m) { return m.index === it.index; });
        if (move) move.dx = cursor - it.rect.left;
        cursor += it.rect.width + gap;
      });
    } else if (mode === 'distribute-v') {
      if (items.length < 3) return;
      const ordered = items.slice().sort(function (a, b) { return a.rect.top - b.rect.top; });
      const heights = ordered.reduce(function (sum, it) { return sum + it.rect.height; }, 0);
      const gap = (bottom - top - heights) / (ordered.length - 1);
      let cursor = top;
      ordered.forEach(function (it) {
        const move = moves.find(function (m) { return m.index === it.index; });
        if (move) move.dy = cursor - it.rect.top;
        cursor += it.rect.height + gap;
      });
    } else return;
    const scaleX = CANVAS_W / Math.max(1, boardRect.width);
    const scaleY = CANVAS_H / Math.max(1, boardRect.height);
    if (!moves.some(function (m) { return Math.abs(m.dx) > 0.1 || Math.abs(m.dy) > 0.1; })) return;
    pushHistory();
    moves.forEach(function (move) {
      const el = move.el;
      if (!el) return;
      if (el.type === 'asset') {
        el.x = round1((Number(el.x) || 0) + move.dx * scaleX);
        el.y = round1((Number(el.y) || 0) + move.dy * scaleY);
      } else {
        el.tx = round1((Number(el.tx) || 0) + move.dx * scaleX);
        el.ty = round1((Number(el.ty) || 0) + move.dy * scaleY);
      }
    });
    renderBoard();
    renderInspector();
    renderTimeline();
    saveSoon();
  }

  function moveElementLayer(delta) {
    const shot = getSelectedShot();
    const idx = state.selectedElementIndex;
    if (!shot || idx == null) return;
    const target = idx + delta;
    if (target < 0 || target >= shot.drawing.elements.length) return;
    pushHistory();
    const arr = shot.drawing.elements;
    const tmp = arr[idx];
    arr[idx] = arr[target];
    arr[target] = tmp;
    state.selectedElementIndex = target;
    renderBoard();
    renderInspector();
    renderTimeline();
    saveSoon();
  }

  function updateSelectedElementStyle(patch, options) {
    const shot = getSelectedShot();
    const idx = state.selectedElementIndex;
    if (!shot || idx == null) return false;
    const el = shot.drawing.elements[idx];
    if (!el || el.type === 'asset') return false;
    pushHistory();
    Object.keys(patch).forEach(function (key) { el[key] = patch[key]; });
    renderBoard();
    renderInspector();
    renderTimeline();
    saveSoon();
    return true;
  }

  function applyElementTransformFromInputs(scalePercent, rotationDegrees) {
    const shot = getSelectedShot();
    const idx = state.selectedElementIndex;
    if (!shot || idx == null) return;
    const el = shot.drawing.elements[idx];
    if (!el) return;
    const group = dom.boardElements.querySelector('g[data-el-index="' + idx + '"]');
    if (!group) return;
    pushHistory();
    if (Number.isFinite(scalePercent)) {
      const factor = clamp(scalePercent / 100, 0.05, 20);
      if (el.type === 'asset') {
        const asset = ASSET_MAP[el.assetId];
        const oldScale = Number(el.scale) || 1;
        const cx = (Number(el.x) || 0) + (asset ? asset.width : 200) * oldScale / 2;
        const cy = (Number(el.y) || 0) + (asset ? asset.height : 200) * oldScale / 2;
        el.scale = round1(factor * 100) / 100;
        el.x = round1(cx - (asset ? asset.width : 200) * factor / 2);
        el.y = round1(cy - (asset ? asset.height : 200) * factor / 2);
      } else {
        const pivot = ensureTransformPivot(el, group);
        el.pivotX = pivot.x;
        el.pivotY = pivot.y;
        el.scaleX = round1(factor * 100) / 100;
        el.scaleY = el.scaleX;
      }
    }
    if (Number.isFinite(rotationDegrees)) {
      if (el.type !== 'asset' && !Number.isFinite(Number(el.pivotX))) {
        const pivot = ensureTransformPivot(el, group);
        el.pivotX = pivot.x;
        el.pivotY = pivot.y;
      }
      el.rotation = round1(rotationDegrees);
    }
    updateElementGroupTransform(idx);
    renderBoard();
    renderInspector();
    renderTimeline();
    saveSoon();
  }

  /* ============================================================
     Text editor
     ============================================================ */

  function openTextEditor(x, y, index) {
    const shot = getSelectedShot();
    if (!shot) return;
    if (state.textEditor) commitTextEditor(true);
    const existing = index != null && shot.drawing.elements[index] ? shot.drawing.elements[index] : null;
    const frame = dom.boardFrame.getBoundingClientRect();
    if (!frame.width) return;
    const scale = frame.width / CANVAS_W;
    const size = existing ? clamp(Number(existing.size) || 34, 14, 140) : 34;
    const anchorX = existing ? (Number(existing.x) || 0) + (Number(existing.tx) || 0) : x;
    const anchorY = existing ? (Number(existing.y) || 0) + (Number(existing.ty) || 0) : y;

    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'text-editor';
    input.setAttribute('aria-label', '输入画面文字');
    input.value = existing ? String(existing.text || '') : '';
    input.spellcheck = false;
    const left = clamp(anchorX * scale, 4, Math.max(4, frame.width - 110));
    const fontPx = Math.max(11, size * scale);
    const top = clamp(anchorY * scale - fontPx * 0.82, 4, Math.max(4, frame.height - fontPx * 1.7));
    input.style.left = left + 'px';
    input.style.top = top + 'px';
    input.style.fontSize = fontPx + 'px';
    input.style.height = Math.max(22, fontPx * 1.5) + 'px';
    input.style.width = Math.max(110, Math.min(380, frame.width - left - 10)) + 'px';

    dom.boardFrame.appendChild(input);
    input.focus();
    input.select();

    const editor = {
      input: input,
      x: anchorX,
      y: anchorY,
      existingIndex: existing ? index : null,
      shotId: shot.id,
      done: false
    };

    function finish(commit) {
      if (editor.done) return;
      editor.done = true;
      const text = input.value.trim();
      input.remove();
      if (state.textEditor === editor) state.textEditor = null;
      if (!commit) return;
      const liveShot = getShotById(editor.shotId);
      if (!liveShot) return;
      const els = liveShot.drawing.elements;
      if (editor.existingIndex != null && els[editor.existingIndex]) {
        if (text === String(els[editor.existingIndex].text || '')) return;
        pushHistory();
        if (!text) {
          els.splice(editor.existingIndex, 1);
          state.selectedElementIndex = null;
          state.multiSelection = [];
        } else {
          els[editor.existingIndex].text = text;
        }
      } else if (text) {
        pushHistory();
        const el = {
          type: 'text', x: round1(editor.x), y: round1(editor.y), text: text,
          size: 34, fill: '#161512', anchor: 'start', weight: '400', font: 'serif'
        };
        els.push(el);
        state.selectedElementIndex = els.length - 1;
      }
      renderStage();
      renderInspector();
      renderTimeline();
      saveSoon();
    }

    state.textEditor = editor;
    input.addEventListener('keydown', function (e) {
      e.stopPropagation();
      if (e.key === 'Enter') {
        e.preventDefault();
        finish(true);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        finish(false);
      }
    });
    input.addEventListener('blur', function () { finish(true); });
  }

  function commitTextEditor(silent) {
    const editor = state.textEditor;
    if (!editor) return;
    const input = editor.input;
    if (input && input.parentNode) {
      // Trigger the same commit path as blur/Enter.
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    }
    if (state.textEditor) {
      state.textEditor = null;
      if (input && input.parentNode) input.remove();
    }
    if (!silent) renderBoard();
  }

  /* ============================================================
     Scoring helpers
     ============================================================ */

  function eventToBoardPoint(e) {
    const rect = dom.boardSvg.getBoundingClientRect();
    return {
      x: clamp((e.clientX - rect.left) / Math.max(1, rect.width) * CANVAS_W, 0, CANVAS_W),
      y: clamp((e.clientY - rect.top) / Math.max(1, rect.height) * CANVAS_H, 0, CANVAS_H)
    };
  }

  function makePolylinePath(points, closed) {
    if (!points || points.length < 2) return '';
    let d = 'M ' + round1(points[0].x) + ' ' + round1(points[0].y);
    for (let i = 1; i < points.length; i++) {
      d += ' L ' + round1(points[i].x) + ' ' + round1(points[i].y);
    }
    if (closed) d += ' Z';
    return d;
  }

  function renderPenDraft() {
    const draft = state.penDraft;
    if (!draft || !draft.points.length) {
      if (state.tool === 'pen') dom.boardSelection.innerHTML = '';
      return;
    }
    const pts = draft.points;
    const d = makePolylinePath(pts, false);
    const viewBox = dom.boardSvg.getBoundingClientRect();
    const unit = viewBox.width ? CANVAS_W / viewBox.width : 1;
    const r = 5 * unit;
    let markup = '<path d="' + d + '" fill="none" stroke="#161512" stroke-width="' + (state.brushWidth + 1) + '" stroke-dasharray="8 5" pointer-events="none"/>';
    pts.forEach(function (p, i) {
      markup += '<circle cx="' + p.x + '" cy="' + p.y + '" r="' + (i === 0 ? r * 1.3 : r) + '" fill="' +
        (i === 0 ? '#161512' : '#fffdf8') + '" stroke="#161512" stroke-width="1.4" pointer-events="none"/>';
    });
    dom.boardSelection.innerHTML = markup;
  }

  function addPenPoint(point) {
    if (!state.penDraft) {
      state.penDraft = { shotId: state.selectedShotId, points: [point] };
    } else {
      if (state.penDraft.shotId !== state.selectedShotId) state.penDraft = { shotId: state.selectedShotId, points: [] };
      const pts = state.penDraft.points;
      if (pts.length >= 3) {
        const first = pts[0];
        if (Math.hypot(point.x - first.x, point.y - first.y) < 28) {
          finishPenDraft(true);
          return;
        }
      }
      pts.push(point);
    }
    clearElementSelection();
    updateSelectionToolbar();
    renderPenDraft();
  }

  function finishPenDraft(closed) {
    const draft = state.penDraft;
    state.penDraft = null;
    if (!draft || draft.points.length < 2) {
      renderSelectionOverlay();
      return;
    }
    const shot = getShotById(draft.shotId) || getSelectedShot();
    if (!shot) {
      renderSelectionOverlay();
      return;
    }
    pushHistory();
    const el = {
      type: 'path',
      d: makePolylinePath(draft.points, !!closed),
      points: draft.points.map(function (p) { return { x: round1(p.x), y: round1(p.y) }; }),
      width: state.brushWidth,
      stroke: '#161512',
      closed: !!closed,
      fill: closed && state.brushFill !== 'none' ? state.brushFill : 'none'
    };
    shot.drawing.elements.push(el);
    state.selectedElementIndex = shot.drawing.elements.length - 1;
    state.multiSelection = [];
    renderStage();
    renderInspector();
    renderTimeline();
    saveSoon();
    toast(closed ? '已闭合钢笔路径' : '钢笔路径已添加');
  }

  function cancelPenDraft() {
    state.penDraft = null;
    renderSelectionOverlay();
  }

  function makePencilPath(points) {
    if (!points || points.length < 2) return '';
    let d = 'M ' + round1(points[0].x) + ' ' + round1(points[0].y);
    if (points.length === 2) {
      d += ' L ' + round1(points[1].x) + ' ' + round1(points[1].y);
      return d;
    }
    for (let i = 1; i < points.length - 1; i++) {
      const p = points[i];
      const next = points[i + 1];
      const mx = (p.x + next.x) / 2;
      const my = (p.y + next.y) / 2;
      d += ' Q ' + round1(p.x) + ' ' + round1(p.y) + ' ' + round1(mx) + ' ' + round1(my);
    }
    const last = points[points.length - 1];
    const prev = points[points.length - 2];
    if (prev) d += ' L ' + round1(last.x) + ' ' + round1(last.y);
    return d;
  }

  function previewDrawingInteraction(interaction, point) {
    if (!interaction || interaction.type !== 'draw') return;
    const tool = interaction.tool;
    const start = interaction.start;
    let element = null;
    if (tool === 'pencil') {
      const pts = interaction.points;
      const d = makePencilPath(pts);
      if (!d) return;
      element = { type: 'path', d: d, width: state.brushWidth, fill: 'none', opacity: 0.6 };
    } else if (tool === 'line' || tool === 'arrow') {
      element = {
        type: 'line', x1: round1(start.x), y1: round1(start.y), x2: round1(point.x), y2: round1(point.y),
        width: state.brushWidth, opacity: 0.65, arrowEnd: tool === 'arrow'
      };
    } else if (tool === 'rect') {
      const x = Math.min(start.x, point.x);
      const y = Math.min(start.y, point.y);
      const w = Math.abs(point.x - start.x);
      const h = Math.abs(point.y - start.y);
      element = { type: 'rect', x: round1(x), y: round1(y), w: round1(w), h: round1(h), width: state.brushWidth, fill: state.brushFill, opacity: 0.62 };
    } else if (tool === 'ellipse') {
      const cx = (start.x + point.x) / 2;
      const cy = (start.y + point.y) / 2;
      const rx = Math.abs(point.x - start.x) / 2;
      const ry = Math.abs(point.y - start.y) / 2;
      element = { type: 'ellipse', cx: round1(cx), cy: round1(cy), rx: round1(rx), ry: round1(ry), width: state.brushWidth, fill: state.brushFill, opacity: 0.62 };
    }
    if (!element) return;
    dom.boardSelection.innerHTML = D.elementMarkup(element, null);
    interaction.previewElement = element;
  }

  function commitDrawingInteraction(interaction) {
    const tool = interaction.tool;
    const shot = getSelectedShot();
    if (!shot) return;
    const point = interaction.lastPoint || interaction.start;
    const start = interaction.start;
    let element = null;

    if (tool === 'pencil') {
      if (interaction.points.length < 2) return;
      const d = makePencilPath(interaction.points);
      if (!d) return;
      element = {
        type: 'path', d: d, width: state.brushWidth, fill: 'none', stroke: '#161512'
      };
    } else if (tool === 'line' || tool === 'arrow') {
      const dist = Math.hypot(point.x - start.x, point.y - start.y);
      if (dist < 12) return;
      element = {
        type: 'line', x1: round1(start.x), y1: round1(start.y), x2: round1(point.x), y2: round1(point.y),
        width: state.brushWidth, stroke: '#161512', arrowEnd: tool === 'arrow', fill: 'none'
      };
    } else if (tool === 'rect') {
      const x = Math.min(start.x, point.x);
      const y = Math.min(start.y, point.y);
      const w = Math.abs(point.x - start.x);
      const h = Math.abs(point.y - start.y);
      if (w < 10 || h < 10) return;
      element = {
        type: 'rect', x: round1(x), y: round1(y), w: round1(w), h: round1(h),
        width: state.brushWidth, stroke: '#161512', fill: state.brushFill
      };
    } else if (tool === 'ellipse') {
      const rx = Math.abs(point.x - start.x) / 2;
      const ry = Math.abs(point.y - start.y) / 2;
      if (rx < 8 || ry < 8) return;
      element = {
        type: 'ellipse', cx: round1((start.x + point.x) / 2), cy: round1((start.y + point.y) / 2),
        rx: round1(rx), ry: round1(ry), width: state.brushWidth, stroke: '#161512', fill: state.brushFill
      };
    }
    if (!element) return;
    pushHistory();
    shot.drawing.elements.push(element);
    state.selectedElementIndex = shot.drawing.elements.length - 1;
    renderStage();
    renderInspector();
    renderTimeline();
    saveSoon();
  }

  /* ============================================================
     Pointer interactions
     ============================================================ */

  function isTextEditorTarget(target) {
    return target && target.classList && target.classList.contains('text-editor');
  }

  function clearSnapGuides() {
    if (dom.boardSnapGuides) dom.boardSnapGuides.innerHTML = '';
  }

  function selectionScreenBox(interaction) {
    const rects = (interaction.indices || []).map(function (i) {
      const g = dom.boardElements.querySelector('g[data-el-index="' + i + '"]');
      return g ? g.getBoundingClientRect() : null;
    }).filter(Boolean);
    if (!rects.length) return null;
    return {
      left: Math.min.apply(null, rects.map(function (r) { return r.left; })),
      top: Math.min.apply(null, rects.map(function (r) { return r.top; })),
      right: Math.max.apply(null, rects.map(function (r) { return r.right; })),
      bottom: Math.max.apply(null, rects.map(function (r) { return r.bottom; }))
    };
  }

  function computeSnap(interaction, dxPx, dyPx, e) {
    const boardRect = dom.boardSvg.getBoundingClientRect();
    if (e.altKey) {
      clearSnapGuides();
      return { dx: dxPx, dy: dyPx };
    }
    const box = interaction.screenBox;
    if (!box || !boardRect.width || !boardRect.height) return { dx: dxPx, dy: dyPx };
    const projected = {
      left: box.left + dxPx,
      right: box.right + dxPx,
      top: box.top + dyPx,
      bottom: box.bottom + dyPx
    };
    projected.cx = (projected.left + projected.right) / 2;
    projected.cy = (projected.top + projected.bottom) / 2;
    const xt = [0, 1 / 3, 1 / 2, 2 / 3, 1].map(function (f) { return boardRect.left + boardRect.width * f; });
    const yt = [0, 1 / 3, 1 / 2, 2 / 3, 1].map(function (f) { return boardRect.top + boardRect.height * f; });
    let bestX = null;
    let bestY = null;
    [projected.left, projected.cx, projected.right].forEach(function (pos) {
      xt.forEach(function (target) {
        const d = target - pos;
        if (Math.abs(d) <= 7 && (!bestX || Math.abs(d) < Math.abs(bestX.d))) bestX = { d: d, target: target };
      });
    });
    [projected.top, projected.cy, projected.bottom].forEach(function (pos) {
      yt.forEach(function (target) {
        const d = target - pos;
        if (Math.abs(d) <= 7 && (!bestY || Math.abs(d) < Math.abs(bestY.d))) bestY = { d: d, target: target };
      });
    });
    clearSnapGuides();
    if (bestX && dom.boardSnapGuides) {
      const sx = (bestX.target - boardRect.left) / boardRect.width * CANVAS_W;
      dom.boardSnapGuides.innerHTML += '<line class="snap-guide" x1="' + sx + '" y1="0" x2="' + sx + '" y2="' + CANVAS_H + '"/>';
    }
    if (bestY && dom.boardSnapGuides) {
      const sy = (bestY.target - boardRect.top) / boardRect.height * CANVAS_H;
      dom.boardSnapGuides.innerHTML += '<line class="snap-guide" x1="0" y1="' + sy + '" x2="' + CANVAS_W + '" y2="' + sy + '"/>';
    }
    return { dx: dxPx + (bestX ? bestX.d : 0), dy: dyPx + (bestY ? bestY.d : 0), snappedX: !!bestX, snappedY: !!bestY };
  }

  function onBoardPointerDown(e) {
    if (e.button !== 0) return;
    let shot = getSelectedShot();
    if (!shot) {
      const drawable = ['pencil', 'pen', 'line', 'arrow', 'rect', 'ellipse', 'text'].indexOf(state.tool) >= 0;
      if (!drawable) return;
      createNewShot(makeBlankShot(), { toast: false, label: '', keepTool: true });
      shot = getSelectedShot();
      if (!shot) return;
    }
    if (state.textEditor) {
      commitTextEditor(true);
      return;
    }
    if (isTextEditorTarget(e.target)) return;
    const pathNode = e.target && e.target.closest ? e.target.closest('[data-path-node]') : null;
    if (pathNode && state.pathEdit) {
      startPathNodeDrag(e, Number(pathNode.getAttribute('data-path-node')));
      return;
    }
    if (state.pathEdit) {
      state.pathEdit = null;
      renderSelectionOverlay();
    }
    const transformHandle = e.target && e.target.closest ? e.target.closest('[data-transform-handle]') : null;
    if (transformHandle) {
      startTransformInteraction(e, transformHandle.getAttribute('data-transform-handle'));
      return;
    }
    const point = eventToBoardPoint(e);
    const targetGroup = e.target && e.target.closest ? e.target.closest('g[data-el-index]') : null;
    const targetIndex = targetGroup ? Number(targetGroup.dataset.elIndex) : null;

    if (state.tool === 'select') {
      const currentIndices = getSelectedElementIndices();
      if (targetIndex != null && isBoardDoubleTap(e, targetIndex)) {
        handleElementDoubleTap(targetIndex);
        e.preventDefault();
        return;
      }
      if (targetIndex == null) state.lastBoardTap = null;
      if (targetIndex != null && shot.drawing.elements[targetIndex]) {
        if (e.shiftKey) {
          const next = currentIndices.slice();
          const at = next.indexOf(targetIndex);
          if (at >= 0) next.splice(at, 1);
          else next.push(targetIndex);
          setElementSelection(next, targetIndex);
          renderSelectionOverlay();
          renderInspector();
          renderLayerList();
          e.preventDefault();
          return;
        }
        if (currentIndices.indexOf(targetIndex) < 0) setElementSelection([targetIndex], targetIndex);
        renderSelectionOverlay();
        renderInspector();
        const indices = getSelectedElementIndices();
        const moves = indices.map(function (i) {
          const element = shot.drawing.elements[i];
          return {
            index: i,
            tx0: Number(element.tx) || 0,
            ty0: Number(element.ty) || 0,
            x0: Number(element.x) || 0,
            y0: Number(element.y) || 0,
            isAsset: element.type === 'asset'
          };
        });
        state.interaction = {
          type: 'move',
          indices: indices,
          moves: moves,
          screenBox: selectionScreenBox({ indices: indices }),
          index: targetIndex,
          startClientX: e.clientX,
          startClientY: e.clientY,
          historyPushed: false,
          moved: false
        };
      } else {
        if (!e.shiftKey) {
          clearElementSelection();
          renderSelectionOverlay();
          renderInspector();
        }
        state.interaction = {
          type: 'marquee',
          additive: !!e.shiftKey,
          baseSelection: e.shiftKey ? currentIndices : [],
          startClientX: e.clientX,
          startClientY: e.clientY,
          currentClientX: e.clientX,
          currentClientY: e.clientY,
          moved: false
        };
      }
      e.preventDefault();
      return;
    }

    if (state.tool === 'eraser') {
      const interaction = { type: 'erase', historyPushed: false, startClientX: e.clientX, startClientY: e.clientY, erased: 0 };
      state.interaction = interaction;
      if (targetIndex != null) {
        removeElementAt(targetIndex, interaction);
        interaction.erased++;
      }
      e.preventDefault();
      return;
    }

    if (state.tool === 'text') {
      openTextEditor(point.x, point.y, null);
      e.preventDefault();
      return;
    }

    if (state.tool === 'pen') {
      addPenPoint(point);
      e.preventDefault();
      return;
    }

    if (state.tool === 'pencil' || state.tool === 'line' || state.tool === 'arrow' || state.tool === 'rect' || state.tool === 'ellipse') {
      clearElementSelection();
      updateSelectionToolbar();
      state.interaction = {
        type: 'draw',
        tool: state.tool,
        start: point,
        lastPoint: point,
        points: [point],
        previewElement: null
      };
      renderSelectionOverlay();
      updateSelectionToolbar();
      e.preventDefault();
    }
  }

  function isBoardDoubleTap(e, targetIndex) {
    if (state.tool !== 'select') return false;
    const now = (window.performance && performance.now) ? performance.now() : Date.now();
    const last = state.lastBoardTap;
    state.lastBoardTap = { time: now, index: targetIndex, x: e.clientX, y: e.clientY };
    if (!last || last.index !== targetIndex) return false;
    return now - last.time < 360 && Math.hypot(e.clientX - last.x, e.clientY - last.y) < 12;
  }

  function handleElementDoubleTap(index) {
    const shot = getSelectedShot();
    if (!shot) return;
    const el = shot.drawing.elements[index];
    if (!el) return;
    if (el.type === 'text') {
      setElementSelection([index], index);
      openTextEditor((Number(el.x) || 0) + (Number(el.tx) || 0), (Number(el.y) || 0) + (Number(el.ty) || 0), index);
      return;
    }
    if (el.type === 'path' && Array.isArray(el.points) && el.points.length) {
      setElementSelection([index], index);
      state.pathEdit = { index: index };
      renderSelectionOverlay();
      renderInspector();
      toast('拖动节点编辑路径 · Esc 退出');
    }
  }

  function onBoardDoubleClick(e) {
    if (!getSelectedShot()) return;
    const targetGroup = e.target && e.target.closest ? e.target.closest('g[data-el-index]') : null;
    if (!targetGroup) return;
    const idx = Number(targetGroup.dataset.elIndex);
    const el = getSelectedShot().drawing.elements[idx];
    if (!el) return;
    if (el.type === 'text') {
      e.preventDefault();
      state.selectedElementIndex = idx;
      state.multiSelection = [];
      openTextEditor((Number(el.x) || 0) + (Number(el.tx) || 0), (Number(el.y) || 0) + (Number(el.ty) || 0), idx);
      return;
    }
    if (el.type === 'path' && Array.isArray(el.points) && el.points.length) {
      e.preventDefault();
      setElementSelection([idx], idx);
      state.pathEdit = { index: idx };
      renderSelectionOverlay();
      renderInspector();
      toast('拖动节点编辑路径 · Esc 退出');
    }
  }

  function startScrub(e) {
    if (e.button !== 0) return;
    if (e.target.closest && e.target.closest('.shot-block')) return;
    const total = totalDuration();
    if (total <= 0) return;
    e.preventDefault();
    updateScrubFromClientX(e.clientX);
    dom.playhead.classList.add('scrubbing');
    state.interaction = { type: 'scrub' };
  }

  function updateScrubFromClientX(clientX) {
    const total = totalDuration();
    const rect = dom.timelineCanvas.getBoundingClientRect();
    const pps = state.currentPps || currentPps();
    setPlayheadUI(clamp((clientX - rect.left - 4) / pps, 0, total));
  }

  function startDurationDrag(e, shotId) {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    const shot = getShotById(shotId);
    if (!shot) return;
    if (state.selectedShotId !== shotId) selectShot(shotId, { seek: true });
    state.interaction = {
      type: 'resize',
      shotId: shotId,
      startClientX: e.clientX,
      startDuration: shot.duration,
      startScroll: dom.timelineScroll.scrollLeft,
      pps: state.currentPps || currentPps(),
      historyPushed: false,
      moved: false,
      block: null,
      bubble: null
    };
    const block = e.target.closest('.shot-block');
    if (block) {
      block.classList.add('dragging-duration');
      state.interaction.block = block;
    }
    const bubble = document.createElement('div');
    bubble.className = 'duration-bubble';
    bubble.style.position = 'fixed';
    bubble.textContent = formatSeconds(shot.duration);
    document.body.appendChild(bubble);
    state.interaction.bubble = bubble;
  }

  function positionDurationBubble(e, duration) {
    const bubble = state.interaction && state.interaction.bubble;
    if (!bubble) return;
    bubble.textContent = formatSeconds(duration);
    bubble.style.left = e.clientX + 'px';
    bubble.style.top = (e.clientY - 14) + 'px';
    bubble.hidden = false;
  }

  function updateLiveDuration(shot, duration) {
    shot.duration = duration;
    const shots = getShotList();
    const pps = state.currentPps || currentPps();
    const starts = getShotStarts();
    let maxRight = 4;
    const blocks = $$('.shot-block', dom.shotTrack);
    blocks.forEach(function (block) {
      const id = block.dataset.shotId;
      const index = getShotIndexById(id);
      if (index < 0) return;
      const s = shots[index];
      const left = 4 + starts[index] * pps;
      const width = Math.max(18, s.duration * pps);
      block.style.left = left + 'px';
      block.style.width = width + 'px';
      const badge = block.querySelector('.block-duration-badge');
      if (badge) badge.textContent = formatSeconds(s.duration);
      const dur = block.querySelector('.block-duration');
      if (dur) dur.textContent = formatSeconds(s.duration);
      maxRight = Math.max(maxRight, left + width);
    });
    const total = totalDuration();
    const contentWidth = Math.max(Math.max(300, dom.timelineScroll.clientWidth - 40), maxRight + 72);
    dom.timelineCanvas.style.width = contentWidth + 'px';
    clampPlayhead();
    setPlayheadUI(state.playhead);
    if (dom.inspectorDuration && document.activeElement !== dom.inspectorDuration) dom.inspectorDuration.value = String(round1(shot.duration));
    if (dom.durationCustom && document.activeElement !== dom.durationCustom) dom.durationCustom.value = String(round1(shot.duration));
    if (dom.inspectorFrames) dom.inspectorFrames.textContent = Math.round(shot.duration * DEFAULT_FPS) + ' 帧';
    if (dom.inspectorShare) dom.inspectorShare.textContent = '占全片 ' + (total > 0 ? Math.round(shot.duration / total * 100) : 0) + '%';
    if (dom.dockFrames) dom.dockFrames.textContent = Math.round(shot.duration * DEFAULT_FPS) + ' 帧';
    if (dom.dockShot) dom.dockShot.textContent = '镜头 ' + pad2(getShotIndexById(shot.id) + 1) + ' · ' + shot.name;
    setChipActive(dom.inspectorChips, shot.duration);
    setChipActive(dom.durationChoices, shot.duration);
    if (dom.timelineTotal) dom.timelineTotal.textContent = formatSeconds(total);
    if (dom.timeTotal) dom.timeTotal.textContent = formatTimecode(total);
    if (dom.timeCurrent) dom.timeCurrent.textContent = formatTimecode(state.playhead);
  }

  function removeReorderIndicator() {
    const node = dom.trackArea.querySelector('.reorder-indicator');
    if (node) node.remove();
  }

  function updateReorderTarget(interaction, clientX) {
    const blocks = $$('.shot-block', dom.shotTrack).filter(function (b) {
      return b.dataset.shotId !== interaction.shotId;
    });
    let target = 0;
    blocks.forEach(function (b) {
      const r = b.getBoundingClientRect();
      if (clientX > r.left + r.width / 2) target++;
    });
    interaction.targetIndex = target;
    removeReorderIndicator();
    const indicator = document.createElement('span');
    indicator.className = 'reorder-indicator';
    let x = 4;
    if (blocks.length) {
      if (target < blocks.length) {
        x = blocks[target].offsetLeft - 2;
      } else {
        const last = blocks[blocks.length - 1];
        x = last.offsetLeft + last.offsetWidth + 2;
      }
    }
    indicator.style.left = x + 'px';
    dom.trackArea.appendChild(indicator);
    return target;
  }

  function finishShotReorder(interaction) {
    removeReorderIndicator();
    const block = dom.shotTrack.querySelector('.shot-block[data-shot-id="' + CSS.escape(interaction.shotId) + '"]');
    if (block) block.classList.remove('dragging-reorder');
    if (!interaction.active) return;
    if (interaction.targetIndex === interaction.originalIndex || interaction.targetIndex == null) {
      renderTimeline();
      return;
    }
    pushHistory();
    const shots = getShotList();
    const moved = shots.splice(interaction.originalIndex, 1)[0];
    shots.splice(interaction.targetIndex, 0, moved);
    state.selectedShotId = moved.id;
    state.basePps = null;
    state.playhead = getShotStarts()[interaction.targetIndex] || 0;
    renderAll();
    saveSoon();
    requestAnimationFrame(function () { scrollToShot(moved.id); });
    toast('镜头已移到第 ' + (interaction.targetIndex + 1) + ' 位');
  }

  function handlePointerMove(e) {
    const interaction = state.interaction;
    if (!interaction) return;

    if (interaction.type === 'canvas-pan') {
      state.canvasPanX = interaction.startPanX + (e.clientX - interaction.startClientX);
      state.canvasPanY = interaction.startPanY + (e.clientY - interaction.startClientY);
      applyCanvasView();
      return;
    }

    if (interaction.type === 'shot-reorder') {
      const dx = e.clientX - interaction.startClientX;
      const dy = e.clientY - interaction.startClientY;
      if (!interaction.active) {
        if (Math.abs(dx) < 6 || Math.abs(dx) < Math.abs(dy)) return;
        interaction.active = true;
        const block = dom.shotTrack.querySelector('.shot-block[data-shot-id="' + CSS.escape(interaction.shotId) + '"]');
        if (block) block.classList.add('dragging-reorder');
        document.body.style.cursor = 'grabbing';
      }
      const viewport = dom.timelineScroll.getBoundingClientRect();
      if (e.clientX < viewport.left + 45) dom.timelineScroll.scrollLeft -= 16;
      else if (e.clientX > viewport.right - 45) dom.timelineScroll.scrollLeft += 16;
      updateReorderTarget(interaction, e.clientX);
      return;
    }

    if (interaction.type === 'scrub') {
      updateScrubFromClientX(e.clientX);
      return;
    }

    if (interaction.type === 'resize') {
      const dx = e.clientX - interaction.startClientX + (dom.timelineScroll.scrollLeft - interaction.startScroll);
      const delta = dx / interaction.pps;
      const raw = interaction.startDuration + delta;
      const snap = e.shiftKey ? 0.5 : 0.1;
      const next = clamp(round1(Math.round(raw / snap) * snap), 0.5, 60);
      const shot = getShotById(interaction.shotId);
      if (!shot) return;
      if (Math.abs(shot.duration - next) < 0.001) {
        positionDurationBubble(e, next);
        return;
      }
      if (!interaction.historyPushed) {
        pushHistory();
        interaction.historyPushed = true;
      }
      interaction.moved = true;
      updateLiveDuration(shot, next);
      const block = interaction.block || dom.shotTrack.querySelector('.shot-block[data-shot-id="' + CSS.escape(interaction.shotId) + '"]');
      if (block) block.classList.add('dragging-duration');
      positionDurationBubble(e, next);
      return;
    }

    if (interaction.type === 'transform') {
      if (!interaction.moved && Math.hypot(e.clientX - interaction.startClientX, e.clientY - interaction.startClientY) < 2) return;
      if (!interaction.historyPushed) {
        pushHistory();
        interaction.historyPushed = true;
      }
      interaction.moved = true;
      const shot = getSelectedShot();
      if (!shot) return;
      const el = shot.drawing.elements[interaction.index];
      if (!el) return;
      if (interaction.mode === 'scale') {
        const dist = Math.max(1, Math.hypot(e.clientX - interaction.centerX, e.clientY - interaction.centerY));
        const factor = clamp(dist / interaction.startDist, 0.08, 12);
        if (el.type === 'asset' && interaction.asset) {
          const newScale = clamp(interaction.initialScale * factor, 0.05, 20);
          el.scale = round1(newScale * 100) / 100;
          el.x = round1(interaction.assetCenterX - interaction.asset.width * newScale / 2);
          el.y = round1(interaction.assetCenterY - interaction.asset.height * newScale / 2);
        } else {
          el.scaleX = round1((interaction.initialScaleX || 1) * factor * 100) / 100;
          el.scaleY = round1((interaction.initialScaleY || 1) * factor * 100) / 100;
          if (interaction.pivot) { el.pivotX = interaction.pivot.x; el.pivotY = interaction.pivot.y; }
        }
      } else {
        const angle = Math.atan2(e.clientY - interaction.centerY, e.clientX - interaction.centerX);
        let delta = (angle - interaction.startAngle) * 180 / Math.PI;
        let next = interaction.initialRotation + delta;
        if (e.shiftKey) next = Math.round(next / 15) * 15;
        el.rotation = round1(next);
        if (interaction.pivot) { el.pivotX = interaction.pivot.x; el.pivotY = interaction.pivot.y; }
      }
      updateElementGroupTransform(interaction.index);
      renderSelectionOverlay();
      return;
    }

    if (interaction.type === 'erase') {
      const idx = elementIndexAtPoint(e.clientX, e.clientY);
      if (idx != null) {
        if (removeElementAt(idx, interaction)) interaction.erased++;
      }
      return;
    }

    if (interaction.type === 'path-node') {
      if (!interaction.historyPushed) {
        pushHistory();
        interaction.historyPushed = true;
      }
      interaction.moved = true;
      updatePathNodeFromPointer(e);
      return;
    }

    if (interaction.type === 'marquee') {
      const dx = e.clientX - interaction.startClientX;
      const dy = e.clientY - interaction.startClientY;
      if (!interaction.moved && Math.abs(dx) + Math.abs(dy) < 3) return;
      interaction.moved = true;
      interaction.currentClientX = e.clientX;
      interaction.currentClientY = e.clientY;
      renderMarqueeOverlay(interaction);
      return;
    }

    if (interaction.type === 'move') {
      const dx = e.clientX - interaction.startClientX;
      const dy = e.clientY - interaction.startClientY;
      if (!interaction.moved && Math.abs(dx) + Math.abs(dy) < 2) return;
      const shot = getSelectedShot();
      if (!shot) return;
      if (!interaction.historyPushed) {
        pushHistory();
        interaction.historyPushed = true;
      }
      interaction.moved = true;
      const rect = dom.boardSvg.getBoundingClientRect();
      const scaleX = CANVAS_W / Math.max(1, rect.width);
      const scaleY = CANVAS_H / Math.max(1, rect.height);
      const snapped = computeSnap(interaction, dx, dy, e);
      const sdx = snapped.dx;
      const sdy = snapped.dy;
      interaction.moves.forEach(function (move) {
        const el = shot.drawing.elements[move.index];
        if (!el) return;
        if (move.isAsset) {
          el.x = round1(move.x0 + sdx * scaleX);
          el.y = round1(move.y0 + sdy * scaleY);
        } else {
          el.tx = round1(move.tx0 + sdx * scaleX);
          el.ty = round1(move.ty0 + sdy * scaleY);
        }
        const group = dom.boardElements.querySelector('g[data-el-index="' + move.index + '"]');
        if (!group) return;
        if (move.isAsset) group.setAttribute('transform', D.assetTransform(el, ASSET_MAP[el.assetId]));
        else group.setAttribute('transform', D.elementTransform(el));
      });
      renderSelectionOverlay();
      return;
    }

    if (interaction.type === 'draw') {
      const point = eventToBoardPoint(e);
      interaction.lastPoint = point;
      if (interaction.tool === 'pencil') {
        const prev = interaction.points[interaction.points.length - 1];
        if (!prev || Math.hypot(point.x - prev.x, point.y - prev.y) > 3) interaction.points.push(point);
      }
      previewDrawingInteraction(interaction, point);
      return;
    }
  }

  function finishResize(interaction) {
    if (interaction.bubble) interaction.bubble.remove();
    const block = dom.shotTrack.querySelector('.shot-block[data-shot-id="' + CSS.escape(interaction.shotId) + '"]');
    if (block) block.classList.remove('dragging-duration');
    renderTimeline();
    saveSoon();
    updateHistoryButtons();
  }

  function handlePointerUp(e) {
    const interaction = state.interaction;
    if (!interaction) return;
    state.interaction = null;

    if (interaction.type === 'scrub') {
      dom.playhead.classList.remove('scrubbing');
      return;
    }

    if (interaction.type === 'path-node') {
      if (!interaction.historyPushed) {
        pushHistory();
        interaction.historyPushed = true;
      }
      interaction.moved = true;
      updatePathNodeFromPointer(e);
      return;
    }

    if (interaction.type === 'path-node') {
      if (interaction.moved) {
        renderBoard();
        renderInspector();
        renderTimeline();
        saveSoon();
      }
      state.pathEdit = { index: interaction.index };
      renderSelectionOverlay();
      return;
    }

    if (interaction.type === 'marquee') {
      clearSnapGuides();
      finishMarqueeSelection(interaction);
      return;
    }

    if (interaction.type === 'canvas-pan') {
      dom.boardViewport.classList.remove('panning');
      return;
    }

    if (interaction.type === 'shot-reorder') {
      document.body.style.cursor = '';
      finishShotReorder(interaction);
      return;
    }

    if (interaction.type === 'resize') {
      finishResize(interaction);
      return;
    }

    if (interaction.type === 'transform') {
      clearSnapGuides();
      if (interaction.moved) {
        renderBoard();
        renderInspector();
        renderTimeline();
        saveSoon();
      }
      return;
    }

    if (interaction.type === 'erase') {
      if (interaction.erased > 0) {
        renderStage();
        renderInspector();
        renderTimeline();
        saveSoon();
        toast('已擦除 ' + interaction.erased + ' 个元素 · ⌘Z 可撤销');
      }
      return;
    }

    if (interaction.type === 'move') {
      clearSnapGuides();
      if (interaction.moved) {
        renderBoard();
        renderInspector();
        renderTimeline();
        saveSoon();
      }
      return;
    }

    if (interaction.type === 'draw') {
      dom.boardSelection.innerHTML = '';
      commitDrawingInteraction(interaction);
      return;
    }
  }

  function onShotPointerDown(e) {
    if (e.button !== 0) return;
    const block = e.target.closest('.shot-block');
    if (!block) return;
    const shotId = block.dataset.shotId;
    if (!shotId) return;
    if (e.target.closest('.resize-handle')) {
      startDurationDrag(e, shotId);
      return;
    }
    e.preventDefault();
    selectShot(shotId, { seek: true });
    state.interaction = {
      type: 'shot-reorder',
      shotId: shotId,
      originalIndex: getShotIndexById(shotId),
      targetIndex: getShotIndexById(shotId),
      startClientX: e.clientX,
      startClientY: e.clientY,
      active: false
    };
  }

  /* ============================================================
     Undo buttons etc. actions
     ============================================================ */

  function clearCurrentDrawing() {
    const shot = getSelectedShot();
    if (!shot || shot.drawing.elements.length === 0) {
      toast('当前画布已经是空的');
      return;
    }
    openConfirm({
      title: '清空当前画布？',
      text: '这一镜的所有线条会被删除，但仍可以用撤销找回。',
      confirmLabel: '清空画布',
      onConfirm: function () {
        pushHistory();
        shot.drawing.elements = [];
        clearElementSelection();
        renderStage();
        renderInspector();
        saveSoon();
        toast('画布已清空 · ⌘Z 可撤销');
      }
    });
  }

  function updateProjectTitle(value) {
    if (!state.project) return;
    state.project.title = String(value || '').slice(0, 32);
    if (dom.projectTitle) dom.projectTitle.value = state.project.title;
    document.title = (state.project.title || '未命名分镜') + ' · APERTURE';
    saveSoon();
  }

  function updateShotField(field, value) {
    const shot = getSelectedShot();
    if (!shot) return;
    pushHistory();
    shot[field] = value;
    renderStage();
    renderTimeline();
    saveSoon();
  }

  function paintShotName(shot) {
    if (!shot) return;
    if (dom.stageShotTitle) dom.stageShotTitle.textContent = shot.name;
    const block = dom.shotTrack && dom.shotTrack.querySelector('.shot-block[data-shot-id="' + CSS.escape(shot.id) + '"]');
    if (block) {
      const name = block.querySelector('.block-name');
      if (name) name.textContent = shot.name;
      block.setAttribute('aria-label', '镜头 ' + pad2(getShotIndexById(shot.id) + 1) + ' · ' + shot.name);
    }
    if (dom.dockShot) dom.dockShot.textContent = '镜头 ' + pad2(getShotIndexById(shot.id) + 1) + ' · ' + shot.name;
  }

  function openMobileLibrary() {
    if (!dom.libraryPanel || window.innerWidth > 700) return;
    dom.libraryPanel.classList.add('mobile-open');
    if (dom.libraryScrim) dom.libraryScrim.hidden = false;
  }

  function closeMobileLibrary() {
    if (!dom.libraryPanel) return;
    dom.libraryPanel.classList.remove('mobile-open');
    if (dom.libraryScrim) dom.libraryScrim.hidden = true;
  }

  function toggleMobileLibrary() {
    if (!dom.libraryPanel) return;
    if (dom.libraryPanel.classList.contains('mobile-open')) closeMobileLibrary();
    else openMobileLibrary();
  }

  /* ============================================================
     Preview
     ============================================================ */

  function makeSequence(shotsWithIndex) {
    const items = [];
    let acc = 0;
    shotsWithIndex.forEach(function (entry) {
      const shot = entry.shot;
      items.push({
        shot: shot,
        originalIndex: entry.originalIndex,
        start: acc,
        duration: shot.duration
      });
      acc += shot.duration;
    });
    return { items: items, total: acc };
  }

  function locateSequence(seq, time) {
    if (!seq.items.length) return { index: 0, localTime: 0, progress: 0, item: null };
    if (time >= seq.total) {
      return { index: seq.items.length - 1, localTime: seq.items.length ? seq.items[seq.items.length - 1].duration : 0, progress: 1, item: seq.items[seq.items.length - 1] };
    }
    const t = clamp(time, 0, Math.max(0, seq.total - 0.0001));
    for (let i = 0; i < seq.items.length; i++) {
      const item = seq.items[i];
      if (t < item.start + item.duration || i === seq.items.length - 1) {
        return {
          index: i,
          localTime: Math.max(0, t - item.start),
          progress: item.duration > 0 ? clamp((t - item.start) / item.duration, 0, 1) : 0,
          item: item
        };
      }
    }
    return { index: 0, localTime: 0, progress: 0, item: seq.items[0] };
  }

  function loadImage(src) {
    return new Promise(function (resolve) {
      const img = new Image();
      img.onload = function () { resolve({ ok: true, img: img }); };
      img.onerror = function () { resolve({ ok: false, img: null }); };
      img.src = src;
    });
  }

  async function prepareSequenceImages(seq, width, height) {
    if (document.fonts && document.fonts.ready) {
      try { await document.fonts.ready; } catch (err) { /* fonts are optional */ }
    }
    return Promise.all(seq.items.map(function (item) {
      return loadImage(D.svgDataUri(item.shot.drawing, width, height));
    }));
  }

  function paintSlate(ctx, canvas, label, sub) {
    const w = canvas.width;
    const h = canvas.height;
    ctx.save();
    ctx.fillStyle = '#0a0a09';
    ctx.fillRect(0, 0, w, h);
    const u = w / 1920;
    ctx.strokeStyle = 'rgba(244,241,232,0.18)';
    ctx.lineWidth = Math.max(1, u);
    ctx.strokeRect(50 * u, 50 * u, w - 100 * u, h - 100 * u);
    ctx.strokeStyle = 'rgba(244,241,232,0.08)';
    ctx.beginPath();
    ctx.moveTo(w / 2, 50 * u); ctx.lineTo(w / 2, h - 50 * u);
    ctx.moveTo(50 * u, h / 2); ctx.lineTo(w - 50 * u, h / 2);
    ctx.stroke();
    ctx.fillStyle = 'rgba(244,241,232,0.42)';
    ctx.font = '500 ' + Math.round(15 * u) + 'px ' + "'SFMono-Regular','Menlo',monospace";
    ctx.fillText('APERTURE / STORYBOARD RENDER', 80 * u, 100 * u);
    ctx.fillStyle = 'rgba(244,241,232,0.82)';
    ctx.font = '400 ' + Math.round(54 * u) + 'px ' + "'Bodoni 72','Didot','Songti SC',serif";
    ctx.fillText(label || 'STORYBOARD', 80 * u, h / 2 - 22 * u);
    if (sub) {
      ctx.fillStyle = 'rgba(244,241,232,0.4)';
      ctx.font = '400 ' + Math.round(16 * u) + 'px ' + "'SFMono-Regular','Menlo',monospace";
      ctx.fillText(sub, 80 * u, h / 2 + 26 * u);
    }
    ctx.restore();
  }

  function drawSequenceFrame(ctx, canvas, seq, images, time, options) {
    const opts = options || {};
    const w = canvas.width;
    const h = canvas.height;
    ctx.save();
    ctx.fillStyle = '#070706';
    ctx.fillRect(0, 0, w, h);
    if (!seq.items.length) {
      paintSlate(ctx, canvas, 'NO SHOT', 'ADD A STORYBOARD FRAME FIRST');
      ctx.restore();
      return;
    }
    const loc = locateSequence(seq, time);
    const loaded = images[loc.index];
    if (loaded && loaded.ok) {
      const push = opts.pushIn ? 1 + 0.018 * loc.progress : 1;
      const dw = w * push;
      const dh = h * push;
      ctx.drawImage(loaded.img, (w - dw) / 2, (h - dh) / 2, dw, dh);
    } else {
      ctx.fillStyle = '#f4f1e8';
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = 'rgba(22,21,18,0.45)';
      ctx.font = '400 ' + Math.round(w / 32) + 'px ' + "'Songti SC','serif";
      ctx.fillText('画稿载入中', w * 0.06, h * 0.5);
    }
    if (opts.burnIn) drawBurnIn(ctx, canvas, seq, loc, time, opts);
    ctx.restore();
  }

  function fitCanvasText(ctx, text, maxWidth) {
    const value = String(text || '');
    if (ctx.measureText(value).width <= maxWidth) return value;
    let lo = 0;
    let hi = value.length;
    while (lo < hi) {
      const mid = Math.ceil((lo + hi) / 2);
      if (ctx.measureText(value.slice(0, mid) + '…').width <= maxWidth) lo = mid;
      else hi = mid - 1;
    }
    return value.slice(0, Math.max(0, lo)).trimEnd() + '…';
  }

  function drawBurnIn(ctx, canvas, seq, loc, time, options) {
    const opts = options || {};
    const w = canvas.width;
    const h = canvas.height;
    const u = w / 1920;
    const pad = 54 * u;
    const item = loc.item;
    if (!item) return;
    const shot = item.shot;
    const mono = "'SFMono-Regular','SF Mono','Menlo','Roboto Mono',monospace";
    const display = "'Songti SC','Noto Serif SC','Bodoni 72','Didot',serif";
    ctx.save();

    // Frame line — a quiet cinema border.
    ctx.strokeStyle = 'rgba(244,241,232,0.14)';
    ctx.lineWidth = Math.max(1, u);
    ctx.strokeRect(28 * u, 28 * u, w - 56 * u, h - 56 * u);

    // Top-right identification tab. Keep the top-left clear for the
    // handwritten "SHOT 01 / 24MM" labels that live inside many boards.
    const topW = 320 * u;
    const topH = 30 * u;
    const topX = w - pad - topW;
    const topY = pad - 9 * u;
    ctx.fillStyle = 'rgba(8,8,7,0.74)';
    ctx.fillRect(topX, topY, topW, topH);
    ctx.textAlign = 'right';
    ctx.fillStyle = 'rgba(244,241,232,0.86)';
    ctx.font = '500 ' + Math.round(12 * u) + 'px ' + mono;
    ctx.fillText('APERTURE / ANIMATIC', w - pad - 10 * u, topY + 20 * u);

    // Lower-left shot card.
    const boxW = Math.min(w * 0.54, 880 * u);
    const boxH = 108 * u;
    const boxX = pad;
    const boxY = h - pad - boxH;
    ctx.fillStyle = 'rgba(8,8,7,0.8)';
    ctx.fillRect(boxX, boxY, boxW, boxH);
    ctx.textAlign = 'left';
    ctx.fillStyle = 'rgba(244,241,232,0.78)';
    ctx.font = '500 ' + Math.round(12.5 * u) + 'px ' + mono;
    ctx.fillText('SHOT ' + pad2(item.originalIndex + 1) + ' / ' + pad2(seq.items.length), boxX + 18 * u, boxY + 27 * u);
    ctx.fillStyle = '#f4f1e8';
    ctx.font = '400 ' + Math.round(38 * u) + 'px ' + display;
    ctx.fillText(fitCanvasText(ctx, shot.name, boxW - 38 * u), boxX + 16 * u, boxY + 67 * u);
    ctx.fillStyle = 'rgba(244,241,232,0.55)';
    ctx.font = '400 ' + Math.round(12 * u) + 'px ' + mono;
    ctx.fillText(fitCanvasText(ctx, shot.shotSize + '  ·  ' + shot.movement + '  ·  ' + shot.duration.toFixed(1) + ' SEC', boxW - 38 * u), boxX + 18 * u, boxY + 90 * u);

    // Timecode / format, lower-right, on its own ink plate so it
    // stays readable over either a light or a dark board.
    const tcW = 300 * u;
    const tcH = 70 * u;
    const tcX = w - pad - tcW;
    const tcY = h - pad - tcH;
    ctx.fillStyle = 'rgba(8,8,7,0.78)';
    ctx.fillRect(tcX, tcY, tcW, tcH);
    ctx.textAlign = 'right';
    ctx.fillStyle = 'rgba(244,241,232,0.92)';
    ctx.font = '500 ' + Math.round(14 * u) + 'px ' + mono;
    ctx.fillText(formatTimecode((opts.baseOffset || 0) + time), w - pad - 12 * u, tcY + 30 * u);
    ctx.fillStyle = 'rgba(244,241,232,0.46)';
    ctx.font = '400 ' + Math.round(10 * u) + 'px ' + mono;
    ctx.fillText('16:9  /  B&W  /  ' + Math.round(opts.fps || DEFAULT_FPS) + ' FPS', w - pad - 12 * u, tcY + 52 * u);
    ctx.restore();
  }

  function setPreviewDurationText() {
    if (!dom.previewDuration) return;
    dom.previewDuration.textContent = formatClockPrecise(preview.time) + ' / ' + formatClockPrecise(preview.total);
  }

  function setPreviewPlayingIcon(playing) {
    const playBtn = dom.previewPlayBtn;
    if (playBtn) {
      const use = playBtn.querySelector('use');
      if (use) use.setAttribute('href', playing ? '#i-pause' : '#i-play');
    }
    const big = dom.previewBigPlay;
    if (big) {
      big.hidden = !!playing;
      const use = big.querySelector('use');
      if (use) use.setAttribute('href', '#i-play');
    }
  }

  function drawPreviewFrame() {
    if (!preview.sequence) return;
    const canvas = dom.previewCanvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    drawSequenceFrame(ctx, canvas, preview.sequence, preview.images, preview.time, {
      pushIn: true,
      burnIn: false
    });
    const loc = locateSequence(preview.sequence, preview.time);
    if (loc.item) {
      if (preview.currentIndex !== loc.index) {
        preview.currentIndex = loc.index;
        dom.previewShotLabel.textContent = '镜头 ' + pad2(loc.item.originalIndex + 1) + ' / ' + pad2(getShotList().length);
        dom.previewShotTitle.textContent = loc.item.shot.name;
        dom.previewShotMeta.textContent = [loc.item.shot.shotSize, loc.item.shot.movement, formatSeconds(loc.item.shot.duration)].filter(Boolean).join(' · ');
      }
    }
    const ratio = preview.total > 0 ? clamp(preview.time / preview.total, 0, 1) : 0;
    if (dom.previewProgressFill) dom.previewProgressFill.style.width = (ratio * 100) + '%';
    if (dom.previewProgressKnob) dom.previewProgressKnob.style.left = (ratio * 100) + '%';
    const globalTime = clamp(preview.baseOffset + preview.time, 0, totalDuration());
    state.playhead = globalTime;
    setPlayheadUI(state.playhead);
    if (dom.previewTimecode) dom.previewTimecode.textContent = formatTimecode(globalTime);
    if (dom.previewShotLabel && loc.item) dom.previewShotLabel.textContent = '镜头 ' + pad2(loc.item.originalIndex + 1) + ' / ' + pad2(getShotList().length);
    if (dom.previewShotTitle && loc.item) dom.previewShotTitle.textContent = loc.item.shot.name;
    if (dom.previewShotMeta && loc.item) dom.previewShotMeta.textContent = [loc.item.shot.shotSize, loc.item.shot.movement, formatSeconds(loc.item.shot.duration)].filter(Boolean).join(' · ');
    setPreviewDurationText();
  }

  function previewLoop(ts) {
    if (!preview.open || !preview.playing) return;
    if (!preview.lastTs) preview.lastTs = ts;
    const dt = Math.min(0.14, Math.max(0, (ts - preview.lastTs) / 1000));
    preview.lastTs = ts;
    if (preview.total <= 0) { pausePreview(true); return; }
    preview.time += dt;
    if (preview.time >= preview.total) {
      preview.time = preview.total;
      drawPreviewFrame();
      pausePreview(true);
      return;
    }
    drawPreviewFrame();
    preview.raf = requestAnimationFrame(previewLoop);
  }

  function playPreview() {
    if (!preview.sequence) return;
    if (preview.time >= preview.total - 0.001) preview.time = 0;
    preview.playing = true;
    preview.lastTs = 0;
    setPreviewPlayingIcon(true);
    cancelAnimationFrame(preview.raf);
    preview.raf = requestAnimationFrame(previewLoop);
  }

  function pausePreview(atEnd) {
    preview.playing = false;
    cancelAnimationFrame(preview.raf);
    preview.raf = 0;
    setPreviewPlayingIcon(false);
    drawPreviewFrame();
  }

  function togglePreviewPlayback() {
    if (!preview.open) return;
    if (preview.playing) pausePreview(false);
    else playPreview();
  }

  async function openPreview(singleShot) {
    const shots = getShotList();
    if (!shots.length) {
      toast('时间轴里还没有镜头');
      return;
    }
    let entries;
    let baseOffset = 0;
    if (singleShot) {
      const idx = getSelectedShotIndex();
      if (idx < 0) return;
      entries = [{ shot: shots[idx], originalIndex: idx }];
      baseOffset = getShotStarts()[idx] || 0;
    } else {
      entries = shots.map(function (shot, i) { return { shot: shot, originalIndex: i }; });
      baseOffset = 0;
    }
    const seq = makeSequence(entries);
    preview.token += 1;
    const token = preview.token;
    preview.open = true;
    preview.playing = false;
    preview.time = 0;
    preview.total = seq.total;
    preview.baseOffset = baseOffset;
    preview.sequence = seq;
    preview.images = [];
    preview.currentIndex = -1;
    dom.previewOverlay.hidden = false;
    dom.previewBigPlay.hidden = true;
    cancelAnimationFrame(preview.raf);
    const canvas = dom.previewCanvas;
    canvas.width = 1280;
    canvas.height = 720;
    const ctx = canvas.getContext('2d');
    if (ctx) paintSlate(ctx, canvas, 'PREPARING ANIMATIC', entries.length + ' SHOT' + (entries.length > 1 ? 'S' : ''));
    if (dom.previewTimecode) dom.previewTimecode.textContent = formatTimecode(baseOffset);
    setPreviewDurationText();
    setPreviewPlayingIcon(false);
    if (entries[0]) {
      dom.previewShotLabel.textContent = '镜头 ' + pad2(entries[0].originalIndex + 1) + ' / ' + pad2(shots.length);
      dom.previewShotTitle.textContent = entries[0].shot.name;
      dom.previewShotMeta.textContent = [entries[0].shot.shotSize, entries[0].shot.movement, formatSeconds(entries[0].shot.duration)].join(' · ');
    }
    state.playhead = baseOffset;
    setPlayheadUI(state.playhead);
    fitPreviewCanvas();

    const images = await prepareSequenceImages(seq, 1280, 720);
    if (token !== preview.token || !preview.open) return;
    preview.images = images;
    drawPreviewFrame();
    playPreview();
  }

  function fitPreviewCanvas() {
    if (!dom.previewCanvasShell || !dom.previewStageWrap) return;
    const wrapRect = dom.previewStageWrap.getBoundingClientRect();
    if (!wrapRect.width || !wrapRect.height) return;
    let width = wrapRect.width;
    let height = width * 9 / 16;
    if (height > wrapRect.height) {
      height = wrapRect.height;
      width = height * 16 / 9;
    }
    dom.previewCanvasShell.style.width = Math.max(200, Math.floor(width)) + 'px';
    dom.previewCanvasShell.style.height = Math.max(112, Math.floor(height)) + 'px';
  }

  function closePreview() {
    if (!preview.open) return;
    preview.open = false;
    preview.playing = false;
    preview.token += 1;
    cancelAnimationFrame(preview.raf);
    dom.previewOverlay.hidden = true;
    state.playhead = clamp(preview.baseOffset + preview.time, 0, totalDuration());
    setPlayheadUI(state.playhead);
    if (dom.timeline) renderTimeline();
  }

  function seekPreviewFromClientX(clientX) {
    if (!dom.previewProgress || !preview.sequence) return;
    const rect = dom.previewProgress.getBoundingClientRect();
    const ratio = clamp((clientX - rect.left) / Math.max(1, rect.width), 0, 1);
    preview.time = ratio * preview.total;
    preview.lastTs = 0;
    drawPreviewFrame();
    if (!preview.playing) setPreviewPlayingIcon(false);
  }

  /* ============================================================
     Export
     ============================================================ */

  function pickRecorderFormat() {
    if (!window.MediaRecorder || typeof window.MediaRecorder !== 'function') return null;
    for (let i = 0; i < RECORDER_FORMATS.length; i++) {
      const fmt = RECORDER_FORMATS[i];
      try {
        if (MediaRecorder.isTypeSupported(fmt.mime)) return fmt;
      } catch (err) { /* try next */ }
    }
    return null;
  }

  function exportResolution() {
    if (exportState.res === 720) return { width: 1280, height: 720 };
    if (exportState.res === 540) return { width: 960, height: 540 };
    return { width: 1920, height: 1080 };
  }

  function formatBytes(bytes) {
    if (!Number.isFinite(bytes)) return '—';
    if (bytes > 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    return Math.max(1, Math.round(bytes / 1024)) + ' KB';
  }

  function resetExportResultUI() {
    if (exportState.resultUrl) {
      try { URL.revokeObjectURL(exportState.resultUrl); } catch (err) { /* noop */ }
      exportState.resultUrl = null;
    }
    if (dom.exportVideo) {
      dom.exportVideo.removeAttribute('src');
      try { dom.exportVideo.load(); } catch (err) { /* noop */ }
    }
    if (dom.downloadVideoBtn) {
      dom.downloadVideoBtn.removeAttribute('href');
      dom.downloadVideoBtn.removeAttribute('download');
    }
    if (dom.exportResult) dom.exportResult.hidden = true;
    if (dom.exportCanvasWrap) dom.exportCanvasWrap.hidden = false;
    if (dom.exportReadyMark) dom.exportReadyMark.hidden = false;
    if (dom.exportProgressWrap) dom.exportProgressWrap.hidden = true;
    if (dom.exportStatus) dom.exportStatus.textContent = '待渲染';
    if (dom.startRenderBtn) {
      dom.startRenderBtn.classList.remove('is-stop');
      dom.startRenderBtn.disabled = false;
    }
    if (dom.startRenderLabel) dom.startRenderLabel.textContent = '开始渲染';
  }

  function resetExportUI() {
    exportState.token += 1;
    exportState.rendering = false;
    exportState.cancelled = false;
    exportState.chunks = [];
    cancelAnimationFrame(exportState.raf);
    clearTimeout(exportState.finishTimer);
    if (exportState.stream) {
      try { exportState.stream.getTracks().forEach(function (t) { t.stop(); }); } catch (err) { /* noop */ }
      exportState.stream = null;
    }
    exportState.recorder = null;
    resetExportResultUI();
    if (dom.exportCanvas) {
      dom.exportCanvas.width = 1280;
      dom.exportCanvas.height = 720;
      const ctx = dom.exportCanvas.getContext('2d');
      if (ctx) paintSlate(ctx, dom.exportCanvas, 'STORYBOARD', 'SET OPTIONS AND PRESS RENDER');
    }
    updateExportSummary();
    updateExportFormatInfo();
    setExportControlsDisabled(false);
  }

  function setExportControlsDisabled(disabled) {
    [dom.resolutionSeg, dom.fpsSeg, dom.burnInToggle, dom.pushInToggle, dom.exportCloseBtn, dom.exportSheetBtn].forEach(function (node) {
      if (!node) return;
      node.classList.toggle('is-disabled', !!disabled);
      if (node.tagName === 'BUTTON') node.disabled = !!disabled;
      if (node.tagName === 'INPUT') node.disabled = !!disabled;
    });
    if (dom.resolutionSeg) {
      $$('button', dom.resolutionSeg).forEach(function (b) { b.disabled = !!disabled; });
    }
    if (dom.fpsSeg) {
      $$('button', dom.fpsSeg).forEach(function (b) { b.disabled = !!disabled; });
    }
    if (disabled) {
      if (dom.exportCloseBtn) dom.exportCloseBtn.disabled = true;
      if (dom.exportSheetBtn) dom.exportSheetBtn.disabled = true;
    }
  }

  function renderExportReel() {
    if (!dom.exportReel) return;
    const shots = getShotList();
    if (dom.exportReelTotal) dom.exportReelTotal.textContent = shots.length + ' 个镜头 · ' + formatTimecode(totalDuration());
    dom.exportReel.innerHTML = shots.map(function (shot, index) {
      const svg = D.drawingMarkup(shot.drawing, { className: 'thumb-art', indexed: false });
      return '<div class="export-reel-item" title="' + escapeAttr('镜头 ' + pad2(index + 1) + ' · ' + shot.name) + '">' +
        '<span class="export-reel-thumb">' + svg + '</span>' +
        '<span class="export-reel-meta"><b>' + pad2(index + 1) + '</b><em>' + formatSeconds(shot.duration) + '</em></span>' +
      '</div>';
    }).join('');
  }

  function updateExportSummary() {
    const shots = getShotList();
    const total = totalDuration();
    if (dom.exportShotCount) dom.exportShotCount.textContent = shots.length + ' 个镜头';
    if (dom.exportDuration) dom.exportDuration.textContent = formatSeconds(total) + ' / ' + formatTimecode(total);
    renderExportReel();
  }

  function updateExportFormatInfo() {
    const fmt = pickRecorderFormat();
    if (dom.exportFormatLabel) {
      dom.exportFormatLabel.textContent = fmt ? fmt.label : '不支持录制';
    }
    return fmt;
  }

  function openExport() {
    if (!getShotList().length) {
      toast('先加入至少一个分镜再导出');
      return;
    }
    if (state.interaction) return;
    if (dom.projectMenu) dom.projectMenu.hidden = true;
    dom.exportModal.hidden = false;
    exportState.open = true;
    exportState.res = 1080;
    exportState.fps = DEFAULT_FPS;
    exportState.burnIn = true;
    exportState.pushIn = true;
    if (dom.burnInToggle) dom.burnInToggle.checked = true;
    if (dom.pushInToggle) dom.pushInToggle.checked = true;
    setExportSegmentActive(dom.resolutionSeg, 'res', 1080);
    setExportSegmentActive(dom.fpsSeg, 'fps', DEFAULT_FPS);
    resetExportUI();
    setTimeout(function () {
      if (dom.startRenderBtn) dom.startRenderBtn.focus();
    }, 40);
    drawExportPoster(exportState.token);
  }

  async function drawExportPoster(token) {
    const first = getShotList()[0];
    if (!first) return;
    const seq = makeSequence([{ shot: first, originalIndex: 0 }]);
    const images = await prepareSequenceImages(seq, 1280, 720);
    if (token !== exportState.token || !exportState.open || exportState.rendering || dom.exportModal.hidden) return;
    const canvas = dom.exportCanvas;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    drawSequenceFrame(ctx, canvas, seq, images, 0, { pushIn: false, burnIn: false });
  }

  function setExportSegmentActive(container, attr, value) {
    if (!container) return;
    $$('button', container).forEach(function (b) {
      b.classList.toggle('active', String(b.dataset[attr]) === String(value));
    });
  }

  function closeExport() {
    if (exportState.rendering) {
      toast('渲染中，请先取消渲染');
      return;
    }
    dom.exportModal.hidden = true;
    exportState.open = false;
  }

  function updateExportProgress(time, seq) {
    const ratio = seq.total > 0 ? clamp(time / seq.total, 0, 1) : 0;
    const loc = locateSequence(seq, time);
    if (dom.exportPercent) dom.exportPercent.textContent = Math.round(ratio * 100) + '%';
    if (dom.exportProgressFill) dom.exportProgressFill.style.width = (ratio * 100) + '%';
    if (dom.exportStageText && loc.item) {
      dom.exportStageText.textContent = '正在渲染 · 第 ' + pad2(loc.item.originalIndex + 1) + ' / ' + pad2(seq.items.length) + ' 镜 · ' + loc.item.shot.name;
    }
    if (dom.exportFrameText) {
      dom.exportFrameText.textContent = Math.floor(time * exportState.fps) + ' / ' + Math.floor(seq.total * exportState.fps) + ' 帧';
    }
    if (dom.exportElapsedText) dom.exportElapsedText.textContent = formatClockPrecise(time) + ' / ' + formatClockPrecise(seq.total);
    if (dom.exportStatus) dom.exportStatus.textContent = '渲染中';
  }

  function exportVideo() {
    if (exportState.rendering) {
      cancelExportRender();
      return;
    }
    const shots = getShotList();
    if (!shots.length) { toast('没有可导出的镜头'); return; }
    const fmt = pickRecorderFormat();
    if (!fmt) {
      toast('当前浏览器不支持视频录制，请使用最新版 Chrome / Edge / Safari');
      return;
    }
    const dims = exportResolution();
    const fps = exportState.fps;
    const seq = makeSequence(shots.map(function (s, i) { return { shot: s, originalIndex: i }; }));
    exportState.token += 1;
    const token = exportState.token;
    exportState.rendering = true;
    exportState.cancelled = false;
    exportState.chunks = [];
    exportState.format = fmt;
    if (dom.exportResult) dom.exportResult.hidden = true;
    if (dom.exportCanvasWrap) dom.exportCanvasWrap.hidden = false;
    if (dom.exportReadyMark) dom.exportReadyMark.hidden = true;
    if (dom.exportProgressWrap) dom.exportProgressWrap.hidden = false;
    if (dom.exportStatus) dom.exportStatus.textContent = '准备素材';
    if (dom.exportPercent) dom.exportPercent.textContent = '0%';
    if (dom.exportProgressFill) dom.exportProgressFill.style.width = '0%';
    if (dom.exportStageText) dom.exportStageText.textContent = '准备画稿…';
    if (dom.exportFrameText) dom.exportFrameText.textContent = '0 / ' + Math.floor(seq.total * fps) + ' 帧';
    if (dom.exportElapsedText) dom.exportElapsedText.textContent = '0:00.0 / ' + formatClockPrecise(seq.total);
    if (dom.startRenderLabel) dom.startRenderLabel.textContent = '取消渲染';
    if (dom.startRenderBtn) {
      dom.startRenderBtn.classList.add('is-stop');
      dom.startRenderBtn.disabled = false;
    }
    setExportControlsDisabled(true);

    const canvas = dom.exportCanvas;
    canvas.width = dims.width;
    canvas.height = dims.height;
    const ctx = canvas.getContext('2d');
    if (ctx) paintSlate(ctx, canvas, 'PREPARING', String(shots.length) + ' SHOTS · ' + formatSeconds(seq.total) + ' · ' + fps + ' FPS');

    (async function () {
      try {
        const images = await prepareSequenceImages(seq, dims.width, dims.height);
        if (token !== exportState.token || !exportState.rendering || exportState.cancelled) {
          if (token === exportState.token) abortPreparingExport();
          return;
        }
        if (ctx) drawSequenceFrame(ctx, canvas, seq, images, 0, {
          pushIn: exportState.pushIn, burnIn: exportState.burnIn, fps: fps, baseOffset: 0
        });
        const stream = canvas.captureStream(fps);
        const bitrate = exportState.res === 1080 ? 10000000 : exportState.res === 720 ? 6500000 : 4000000;
        let recorder;
        try {
          recorder = new MediaRecorder(stream, { mimeType: fmt.mime, videoBitsPerSecond: bitrate });
        } catch (recErr) {
          try {
            recorder = new MediaRecorder(stream);
          } catch (recErr2) {
            stream.getTracks().forEach(function (t) { t.stop(); });
            throw recErr2;
          }
        }
        exportState.recorder = recorder;
        exportState.stream = stream;
        recorder.ondataavailable = function (event) {
          if (event.data && event.data.size > 0) exportState.chunks.push(event.data);
        };
        recorder.onstop = function () {
          finalizeExportRender(token, fmt);
        };
        recorder.start(240);
        const startedAt = performance.now();
        if (dom.exportStatus) dom.exportStatus.textContent = '渲染中';
        if (dom.exportStageText) dom.exportStageText.textContent = '正在渲染…';
        const tick = function (now) {
          if (token !== exportState.token || exportState.cancelled) return;
          const t = Math.min(seq.total, (now - startedAt) / 1000);
          if (ctx) drawSequenceFrame(ctx, canvas, seq, images, t, {
            pushIn: exportState.pushIn, burnIn: exportState.burnIn, fps: fps, baseOffset: 0
          });
          updateExportProgress(t, seq);
          if (t >= seq.total) {
            exportState.finishTimer = setTimeout(function () {
              try {
                if (recorder.state !== 'inactive') recorder.stop();
              } catch (err) { finalizeExportRender(token, fmt); }
            }, 260);
            return;
          }
          exportState.raf = requestAnimationFrame(tick);
        };
        exportState.raf = requestAnimationFrame(tick);
      } catch (err) {
        if (token === exportState.token) {
          setExportControlsDisabled(false);
          exportState.rendering = false;
          if (dom.exportStatus) dom.exportStatus.textContent = '渲染失败';
          if (dom.startRenderBtn) dom.startRenderBtn.disabled = false;
          if (dom.startRenderLabel) dom.startRenderLabel.textContent = '重新尝试';
          if (dom.exportProgressWrap) dom.exportProgressWrap.hidden = true;
          if (dom.exportReadyMark) dom.exportReadyMark.hidden = false;
          toast('渲染失败：' + (err && err.message ? err.message : '未知错误'));
        }
      }
    })();
  }

  function finalizeExportRender(token, fmt) {
    if (token !== exportState.token) return;
    cancelAnimationFrame(exportState.raf);
    clearTimeout(exportState.finishTimer);
    if (exportState.stream) {
      try { exportState.stream.getTracks().forEach(function (t) { t.stop(); }); } catch (err) { /* noop */ }
      exportState.stream = null;
    }
    exportState.recorder = null;
    if (exportState.cancelled) {
      exportState.rendering = false;
      exportState.cancelled = false;
      resetExportUI();
      toast('已取消渲染');
      return;
    }
    if (!exportState.chunks.length) {
      exportState.rendering = false;
      resetExportUI();
      toast('没有录到视频数据，请重试');
      return;
    }
    const blob = new Blob(exportState.chunks, { type: fmt.mime.split(';')[0] });
    exportState.chunks = [];
    exportState.rendering = false;
    exportState.open = true;
    if (exportState.resultUrl) {
      try { URL.revokeObjectURL(exportState.resultUrl); } catch (err) { /* noop */ }
    }
    const url = URL.createObjectURL(blob);
    exportState.resultUrl = url;
    if (dom.exportVideo) {
      dom.exportVideo.src = url;
      dom.exportVideo.load();
    }
    if (dom.downloadVideoBtn) {
      const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
      dom.downloadVideoBtn.href = url;
      dom.downloadVideoBtn.download = safeFileName(state.project.title) + '-' + stamp + '.' + fmt.ext;
    }
    if (dom.exportProgressWrap) dom.exportProgressWrap.hidden = true;
    if (dom.exportCanvasWrap) dom.exportCanvasWrap.hidden = true;
    if (dom.exportResult) dom.exportResult.hidden = false;
    if (dom.exportStatus) dom.exportStatus.textContent = '已完成 · ' + formatBytes(blob.size);
    if (dom.startRenderBtn) {
      dom.startRenderBtn.classList.remove('is-stop');
      dom.startRenderBtn.disabled = false;
    }
    if (dom.startRenderLabel) dom.startRenderLabel.textContent = '重新渲染';
    setExportControlsDisabled(false);
    toast('分镜视频渲染完成');
  }

  function abortPreparingExport() {
    exportState.rendering = false;
    exportState.cancelled = false;
    resetExportUI();
    toast('已取消渲染');
  }

  function cancelExportRender() {
    if (!exportState.rendering) return;
    exportState.cancelled = true;
    cancelAnimationFrame(exportState.raf);
    clearTimeout(exportState.finishTimer);
    if (exportState.recorder) {
      try {
        if (exportState.recorder.state !== 'inactive') exportState.recorder.stop();
      } catch (err) {
        exportState.rendering = false;
        resetExportUI();
      }
    } else {
      abortPreparingExport();
    }
  }

  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 3000);
  }

  /* ============================================================
     Contact sheet export
     ============================================================ */

  async function exportContactSheet() {
    const shots = getShotList();
    if (!shots.length) {
      toast('没有可导出的镜头');
      return;
    }
    if (dom.projectMenu) dom.projectMenu.hidden = true;
    toast('正在生成镜头表…');
    try {
      if (document.fonts && document.fonts.ready) await document.fonts.ready;
      const seq = makeSequence(shots.map(function (s, i) { return { shot: s, originalIndex: i }; }));
      const images = await prepareSequenceImages(seq, 600, 338);
      const W = 1920;
      const margin = 70;
      const gap = 34;
      const cols = 3;
      const cardW = (W - margin * 2 - gap * (cols - 1)) / cols;
      const thumbH = cardW * 9 / 16;
      const infoH = 108;
      const cardH = thumbH + infoH;
      const headerH = 235;
      const rows = Math.ceil(shots.length / cols);
      const H = headerH + rows * (cardH + gap) + margin;
      const canvas = document.createElement('canvas');
      canvas.width = W;
      canvas.height = H;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#f4f1e8';
      ctx.fillRect(0, 0, W, H);

      // paper texture
      ctx.save();
      ctx.globalAlpha = 0.055;
      ctx.strokeStyle = '#161512';
      for (let i = 0; i < 130; i++) {
        const x = ((i * 769) % W);
        const y = ((i * 1279) % H);
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + 20, y + 9);
        ctx.stroke();
      }
      ctx.restore();

      // header
      ctx.fillStyle = '#161512';
      ctx.font = '500 14px "SFMono-Regular","Menlo",monospace';
      ctx.fillText('APERTURE  /  STORYBOARD SHOOTING BOARD', margin, 76);
      ctx.font = '400 56px "Songti SC","Bodoni 72","Noto Serif SC",serif';
      ctx.fillText(state.project.title || '未命名分镜', margin, 142);
      ctx.textAlign = 'right';
      ctx.font = '500 13px "SFMono-Regular","Menlo",monospace';
      ctx.fillText(shots.length + ' 个镜头  ·  ' + formatTimecode(totalDuration()) + '  ·  16:9 黑白  ·  ' + DEFAULT_FPS + ' FPS', W - margin, 80);
      ctx.textAlign = 'left';
      ctx.strokeStyle = 'rgba(22,21,18,0.35)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(margin, 184.5);
      ctx.lineTo(W - margin, 184.5);
      ctx.stroke();

      for (let i = 0; i < shots.length; i++) {
        const shot = shots[i];
        const col = i % cols;
        const row = Math.floor(i / cols);
        const x = margin + col * (cardW + gap);
        const y = headerH + row * (cardH + gap);
        const loaded = images[i];
        if (loaded && loaded.ok) {
          ctx.drawImage(loaded.img, x, y, cardW, thumbH);
        } else {
          ctx.fillStyle = '#e8e3d7';
          ctx.fillRect(x, y, cardW, thumbH);
        }
        ctx.strokeStyle = 'rgba(22,21,18,0.45)';
        ctx.lineWidth = 1;
        ctx.strokeRect(x + 0.5, y + 0.5, cardW - 1, thumbH - 1);

        ctx.fillStyle = '#161512';
        ctx.font = '500 12px "SFMono-Regular","Menlo",monospace';
        ctx.fillText('镜头 ' + pad2(i + 1), x, y + thumbH + 26);
        ctx.textAlign = 'right';
        ctx.fillText(formatSeconds(shot.duration), x + cardW, y + thumbH + 26);
        ctx.textAlign = 'left';
        ctx.font = '400 25px "Songti SC","Bodoni 72","Noto Serif SC",serif';
        ctx.fillText(shot.name, x, y + thumbH + 58);
        ctx.fillStyle = 'rgba(22,21,18,0.58)';
        ctx.font = '400 11px "SFMono-Regular","Menlo",monospace';
        ctx.fillText([shot.shotSize, shot.angle, shot.movement].filter(Boolean).join('  /  '), x, y + thumbH + 78);
        ctx.fillStyle = 'rgba(22,21,18,0.48)';
        ctx.font = '400 11px "Helvetica Neue","PingFang SC",sans-serif';
        const note = shot.note || '—';
        ctx.fillText(note.length > 34 ? note.slice(0, 34) + '…' : note, x, y + thumbH + 97);
      }

      ctx.fillStyle = 'rgba(22,21,18,0.42)';
      ctx.font = '400 10px "SFMono-Regular","Menlo",monospace';
      ctx.fillText('GENERATED LOCALLY BY APERTURE  /  ' + new Date().toLocaleString(), margin, H - 26);
      ctx.textAlign = 'right';
      ctx.fillText('1 / 1', W - margin, H - 26);
      ctx.textAlign = 'left';

      canvas.toBlob(function (blob) {
        if (!blob) {
          toast('镜头表生成失败');
          return;
        }
        downloadBlob(blob, safeFileName(state.project.title) + '-shot-sheet.png');
        toast('镜头表 PNG 已生成');
      }, 'image/png');
    } catch (err) {
      toast('镜头表生成失败：' + (err && err.message ? err.message : '未知错误'));
    }
  }

  /* ============================================================
     Project serialization / import / new
     ============================================================ */

  function serializeProject() {
    return JSON.stringify({
      app: 'APERTURE Storyboard Studio',
      version: 1,
      exportedAt: new Date().toISOString(),
      project: state.project
    }, null, 2);
  }

  function downloadProjectJson() {
    if (!state.project) return;
    const blob = new Blob([serializeProject()], { type: 'application/json;charset=utf-8' });
    downloadBlob(blob, safeFileName(state.project.title) + '.json');
    toast('工程 JSON 已导出');
  }

  function importProjectFile(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function () {
      try {
        const parsed = JSON.parse(String(reader.result || ''));
        const raw = parsed && parsed.project ? parsed.project : parsed;
        const normalized = normalizeProject(raw);
        if (!normalized) throw new Error('文件里没有可用的分镜项目');
        normalized.id = uid('project');
        state.project = normalized;
        state.selectedShotId = normalized.shots[0] ? normalized.shots[0].id : null;
        state.selectedElementIndex = null;
        state.multiSelection = [];
        state.playhead = 0;
        state.history = [];
        state.future = [];
        state.basePps = null;
        renderAll();
        fitBoard();
        saveSoon();
        toast('工程已导入 · ' + normalized.shots.length + ' 个镜头');
      } catch (err) {
        toast('导入失败：' + (err && err.message ? err.message : 'JSON 格式不正确'));
      }
    };
    reader.onerror = function () { toast('文件读取失败'); };
    reader.readAsText(file);
  }

  function loadDemoProject() {
    openConfirm({
      title: '载入示例项目？',
      text: '当前时间轴会被替换为「夜行 · 序章」示例。建议先导出工程 JSON 备份现有内容。',
      confirmLabel: '载入示例',
      onConfirm: function () {
        state.project = normalizeProject(buildDemoProject());
        state.selectedShotId = getShotList()[0] ? getShotList()[0].id : null;
        state.selectedElementIndex = null;
        state.multiSelection = [];
        state.playhead = 0;
        state.history = [];
        state.future = [];
        state.basePps = null;
        state.tool = 'select';
        renderAll();
        fitBoard();
        saveSoon();
        toast('示例项目已载入');
      }
    });
  }

  function newProject() {
    openConfirm({
      title: '新建项目？',
      text: '当前时间轴和所有分镜会被清空。建议先用「导出工程 JSON」保存一份备份。',
      confirmLabel: '新建空白项目',
      onConfirm: function () {
        state.project = makeEmptyProject('未命名分镜');
        state.selectedShotId = null;
        state.selectedElementIndex = null;
        state.multiSelection = [];
        state.playhead = 0;
        state.history = [];
        state.future = [];
        state.basePps = null;
        state.tool = 'select';
        renderAll();
        fitBoard();
        setSaveState('saved', '已保存');
        persistProject();
        upsertProjectInList(true);
        toast('已新建空白项目');
      }
    });
  }

  /* ============================================================
     Project menu
     ============================================================ */

  function positionProjectMenu() {
    if (!dom.projectMenu || !dom.projectMenuBtn) return;
    const rect = dom.projectMenuBtn.getBoundingClientRect();
    const width = 224;
    dom.projectMenu.style.left = Math.min(window.innerWidth - width - 12, Math.max(12, rect.left - 130)) + 'px';
    dom.projectMenu.style.top = (rect.bottom + 8) + 'px';
  }

  function toggleProjectMenu(force) {
    if (!dom.projectMenu) return;
    const show = typeof force === 'boolean' ? force : dom.projectMenu.hidden;
    dom.projectMenu.hidden = !show;
    if (dom.projectMenuBtn) dom.projectMenuBtn.setAttribute('aria-expanded', show ? 'true' : 'false');
    if (show) positionProjectMenu();
  }

  function handleContextAction(action, target) {
    if (!target) return;
    if (target.kind === 'element') {
      const shot = getSelectedShot();
      if (!shot) return;
      state.selectedElementIndex = target.index;
      if (action === 'element-duplicate') duplicateSelectedElement();
      else if (action === 'element-up') moveElementLayer(1);
      else if (action === 'element-down') moveElementLayer(-1);
      else if (action === 'element-delete') removeElementAt(target.index);
      return;
    }
    if (target.kind === 'shot') {
      selectShot(target.shotId, { seek: true });
      if (action === 'shot-duplicate') duplicateSelectedShot();
      else if (action === 'shot-delete') deleteSelectedShot();
      else if (action === 'shot-up') moveSelectedShot(-1);
      else if (action === 'shot-down') moveSelectedShot(1);
    }
  }

  function applyTheme(theme, persist) {
    const next = theme === 'dark' ? 'dark' : 'light';
    state.theme = next;
    document.documentElement.dataset.theme = next;
    if (dom.themeToggle) {
      const use = dom.themeToggle.querySelector('use');
      if (use) use.setAttribute('href', next === 'dark' ? '#i-sun' : '#i-moon');
      dom.themeToggle.setAttribute('aria-label', next === 'dark' ? '切换到亮色主题' : '切换到深色主题');
      dom.themeToggle.setAttribute('title', next === 'dark' ? '切换到亮色主题' : '切换到深色主题');
    }
    if (persist) {
      try { localStorage.setItem('aperture.theme', next); } catch (err) { /* noop */ }
    }
  }

  function toggleTheme() {
    applyTheme(state.theme === 'dark' ? 'light' : 'dark', true);
  }

  /* ============================================================
     Event bindings
     ============================================================ */

  function bindEvents() {
    // project title
    if (dom.projectTitle) {
      dom.projectTitle.addEventListener('focus', function () {
        state.titleEdit = { pushed: false };
      });
      dom.projectTitle.addEventListener('input', function () {
        if (!state.project) return;
        if (state.titleEdit && !state.titleEdit.pushed) {
          pushHistory();
          state.titleEdit.pushed = true;
        }
        updateProjectTitle(dom.projectTitle.value);
      });
      dom.projectTitle.addEventListener('blur', function () {
        if (!state.project) return;
        const value = dom.projectTitle.value.trim() || '未命名分镜';
        if (state.project.title !== value) updateProjectTitle(value);
        else dom.projectTitle.value = value;
        state.titleEdit = null;
        persistProject();
      });
      dom.projectTitle.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') { e.preventDefault(); dom.projectTitle.blur(); }
      });
    }

    if (dom.projectMenuBtn) {
      dom.projectMenuBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        toggleProjectMenu();
      });
    }
    if (dom.projectMenu) {
      dom.projectMenu.addEventListener('click', function (e) {
        const btn = e.target.closest('[data-action]');
        if (!btn) return;
        toggleProjectMenu(false);
        const action = btn.dataset.action;
        if (action === 'projects') openProjectsModal();
        else if (action === 'new') newProject();
        else if (action === 'demo') loadDemoProject();
        else if (action === 'save-json') downloadProjectJson();
        else if (action === 'import-json') dom.importFile.click();
        else if (action === 'sheet') exportContactSheet();
      });
    }
    document.addEventListener('click', function (e) {
      if (dom.projectMenu && !dom.projectMenu.hidden &&
        !dom.projectMenu.contains(e.target) && !dom.projectMenuBtn.contains(e.target)) {
        toggleProjectMenu(false);
      }
      if (dom.contextMenu && !dom.contextMenu.hidden && !dom.contextMenu.contains(e.target)) {
        hideContextMenu();
      }
    });
    if (dom.projectsCloseBtn) dom.projectsCloseBtn.addEventListener('click', closeProjectsModal);
    if (dom.projectsCloseBtn2) dom.projectsCloseBtn2.addEventListener('click', closeProjectsModal);
    if (dom.projectsNewBtn) dom.projectsNewBtn.addEventListener('click', function () {
      closeProjectsModal();
      newProject();
    });
    if (dom.projectsModal) {
      dom.projectsModal.addEventListener('click', function (e) {
        if (e.target === dom.projectsModal) closeProjectsModal();
      });
    }
    if (dom.projectListEl) {
      dom.projectListEl.addEventListener('click', function (e) {
        const openBtn = e.target.closest('[data-project-open]');
        if (openBtn) { openProjectById(openBtn.getAttribute('data-project-open')); return; }
        const delBtn = e.target.closest('[data-project-delete]');
        if (delBtn) { deleteProjectById(delBtn.getAttribute('data-project-delete')); return; }
        const row = e.target.closest('[data-project-id]');
        if (row) openProjectById(row.getAttribute('data-project-id'));
      });
    }
    if (dom.importFile) {
      dom.importFile.addEventListener('change', function () {
        const file = dom.importFile.files && dom.importFile.files[0];
        dom.importFile.value = '';
        if (file) importProjectFile(file);
      });
    }

    // library
    dom.presetSearch.addEventListener('input', debounce(function () {
      state.search = dom.presetSearch.value || '';
      renderLibraryGrid();
    }, 70));
    dom.presetSearch.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        const first = dom.presetGrid.querySelector('.preset-card');
        if (!first) return;
        if (state.libraryMode === 'assets') insertAsset(first.dataset.assetId);
        else addPresetToTimeline(first.dataset.presetId);
      }
    });
    if (dom.libraryModeTabs) {
      dom.libraryModeTabs.addEventListener('click', function (e) {
        const btn = e.target.closest('[data-mode]');
        if (!btn) return;
        setLibraryMode(btn.dataset.mode);
      });
    }
    dom.categoryTabs.addEventListener('click', function (e) {
      const tab = e.target.closest('[data-category]');
      if (!tab) return;
      if (state.libraryMode === 'assets') state.assetCategory = tab.dataset.category;
      else state.category = tab.dataset.category;
      updateCategoryTabsActive();
      renderLibraryGrid();
    });
    dom.presetGrid.addEventListener('dragstart', function (e) {
      const card = e.target.closest('[data-asset-id]');
      if (!card) { e.preventDefault(); return; }
      try {
        e.dataTransfer.effectAllowed = 'copy';
        e.dataTransfer.setData('text/plain', 'aperture-asset:' + card.dataset.assetId);
      } catch (err) { /* noop */ }
    });
    if (dom.boardViewport) {
      dom.boardViewport.addEventListener('dragover', function (e) {
        const hasFiles = e.dataTransfer && Array.from(e.dataTransfer.types || []).indexOf('Files') >= 0;
        if (!hasFiles && (!state.libraryMode || state.libraryMode !== 'assets')) return;
        e.preventDefault();
        try { e.dataTransfer.dropEffect = 'copy'; } catch (err) { /* noop */ }
        dom.boardViewport.classList.add('drag-over');
      });
      dom.boardViewport.addEventListener('dragleave', function (e) {
        if (!dom.boardViewport.contains(e.relatedTarget)) dom.boardViewport.classList.remove('drag-over');
      });
      dom.boardViewport.addEventListener('drop', function (e) {
        e.preventDefault();
        dom.boardViewport.classList.remove('drag-over');
        const files = e.dataTransfer && e.dataTransfer.files;
        if (files && files[0] && /^image\//i.test(files[0].type || '')) {
          importImageFile(files[0]);
          return;
        }
        let raw = '';
        try { raw = e.dataTransfer.getData('text/plain') || ''; } catch (err) { raw = ''; }
        if (raw.indexOf('aperture-asset:') !== 0) return;
        const assetId = raw.slice('aperture-asset:'.length);
        const point = eventToBoardPoint(e);
        insertAsset(assetId, point);
      });
    }
    dom.presetGrid.addEventListener('click', function (e) {
      const resetBtn = e.target.closest('#resetSearchBtn');
      if (resetBtn) {
        state.search = '';
        dom.presetSearch.value = '';
        if (state.libraryMode === 'assets') state.assetCategory = 'all';
        else state.category = 'all';
        updateCategoryTabsActive();
        renderLibraryGrid();
        return;
      }
      if (state.libraryMode === 'assets') {
        const assetCard = e.target.closest('[data-asset-id]');
        if (assetCard) insertAsset(assetCard.dataset.assetId);
        return;
      }
      const card = e.target.closest('[data-preset-id]');
      if (!card) return;
      addPresetToTimeline(card.dataset.presetId);
    });
    if (dom.emptyAddPresetBtn) {
      dom.emptyAddPresetBtn.addEventListener('click', function () {
        setLibraryMode('assets');
        if (window.innerWidth <= 700) openMobileLibrary();
        else dom.presetSearch.focus();
        toast('选择人物或道具，插入这一镜');
      });
    }
    if (dom.emptyDemoBtn) dom.emptyDemoBtn.addEventListener('click', loadDemoProject);
    if (dom.assetToolBtn) {
      dom.assetToolBtn.addEventListener('click', function () {
        setLibraryMode('assets');
        if (window.innerWidth <= 700) openMobileLibrary();
        else dom.presetSearch.focus();
      });
    }

    // mobile preset drawer
    if (dom.mobileLibraryBtn) dom.mobileLibraryBtn.addEventListener('click', toggleMobileLibrary);
    if (dom.libraryScrim) dom.libraryScrim.addEventListener('click', closeMobileLibrary);
    if (dom.libraryCloseBtn) dom.libraryCloseBtn.addEventListener('click', closeMobileLibrary);

    // topbar / stage actions
    dom.previewBtn.addEventListener('click', function () { openPreview(false); });
    dom.exportBtn.addEventListener('click', openExport);
    dom.undoBtn.addEventListener('click', undo);
    dom.redoBtn.addEventListener('click', redo);
    dom.duplicateShotBtn.addEventListener('click', duplicateSelectedShot);
    dom.deleteShotBtn.addEventListener('click', deleteSelectedShot);

    // tools
    dom.toolRail.addEventListener('click', function (e) {
      const toolBtn = e.target.closest('[data-tool]');
      if (toolBtn) setActiveTool(toolBtn.dataset.tool);
    });
    dom.guidesBtn.addEventListener('click', function () {
      state.guides = !state.guides;
      setBoardGuides();
      updateToolRail();
    });
    dom.clearDrawingBtn.addEventListener('click', clearCurrentDrawing);
    if (dom.imageToolBtn && dom.imageFileInput) {
      dom.imageToolBtn.addEventListener('click', function () {
        if (!getSelectedShot()) toast('将自动新建一个空镜头');
        dom.imageFileInput.value = '';
        dom.imageFileInput.click();
      });
      dom.imageFileInput.addEventListener('change', function () {
        const file = dom.imageFileInput.files && dom.imageFileInput.files[0];
        if (file) importImageFile(file);
      });
    }
    dom.boardFitBtn.addEventListener('click', function () {
      resetCanvasView();
      toast('画布已适配窗口');
    });
    if (dom.canvasZoomOut) dom.canvasZoomOut.addEventListener('click', function () { setCanvasZoom(state.canvasZoom / 1.2); });
    if (dom.canvasZoomIn) dom.canvasZoomIn.addEventListener('click', function () { setCanvasZoom(state.canvasZoom * 1.2); });
    if (dom.canvasZoomLabel) dom.canvasZoomLabel.addEventListener('click', function () { setCanvasZoom(1); });
    if (dom.boardViewport) {
      dom.boardViewport.addEventListener('wheel', function (e) {
        if (!e.ctrlKey && !e.metaKey) return;
        e.preventDefault();
        const factor = e.deltaY < 0 ? 1.12 : 0.89;
        setCanvasZoom(state.canvasZoom * factor);
      }, { passive: false });
      dom.boardViewport.addEventListener('pointerdown', function (e) {
        if (e.button !== 1) return;
        e.preventDefault();
        commitTextEditor(true);
        state.interaction = {
          type: 'canvas-pan',
          startClientX: e.clientX,
          startClientY: e.clientY,
          startPanX: state.canvasPanX,
          startPanY: state.canvasPanY
        };
        dom.boardViewport.classList.add('panning');
      });
    }
    dom.boardFullscreenBtn.addEventListener('click', toggleFocusMode);
    dom.boardViewport.addEventListener('dblclick', function (e) {
      if (e.target === dom.boardViewport) toggleFocusMode();
    });
    dom.safeAreaToggle.addEventListener('change', function () {
      state.safeArea = dom.safeAreaToggle.checked;
      setBoardGuides();
    });

    // board events
    dom.boardSvg.addEventListener('pointerdown', onBoardPointerDown);
    dom.boardSvg.addEventListener('contextmenu', function (e) {
      const group = e.target && e.target.closest ? e.target.closest('g[data-el-index]') : null;
      if (!group) { hideContextMenu(); return; }
      const raw = group.getAttribute('data-el-index');
      if (!raw) return;
      e.preventDefault();
      openElementContextMenu(Number(raw), e.clientX, e.clientY);
    });
    document.addEventListener('pointermove', handlePointerMove);
    document.addEventListener('pointerup', handlePointerUp);
    document.addEventListener('pointercancel', handlePointerUp);

    // inspector duration
    dom.inspectorMinus.addEventListener('click', function () { stepDuration(-0.5); });
    dom.inspectorPlus.addEventListener('click', function () { stepDuration(0.5); });
    dom.inspectorDuration.addEventListener('change', function () {
      const v = parseFloat(dom.inspectorDuration.value);
      if (Number.isFinite(v)) changeDuration(v);
      syncDurationUI();
    });
    dom.inspectorDuration.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { e.preventDefault(); dom.inspectorDuration.blur(); }
    });
    dom.inspectorChips.addEventListener('click', function (e) {
      const btn = e.target.closest('[data-duration]');
      if (!btn) return;
      changeDuration(Number(btn.dataset.duration));
    });
    dom.durationChoices.addEventListener('click', function (e) {
      const btn = e.target.closest('[data-duration]');
      if (!btn) return;
      changeDuration(Number(btn.dataset.duration));
    });
    dom.durationCustom.addEventListener('change', function () {
      const v = parseFloat(dom.durationCustom.value);
      if (Number.isFinite(v)) changeDuration(v);
      syncDurationUI();
    });
    dom.durationCustom.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { e.preventDefault(); dom.durationCustom.blur(); }
    });
    dom.previewShotBtn.addEventListener('click', function () { openPreview(true); });

    // inspector metadata
    dom.shotSizeSelect.addEventListener('change', function () { updateShotField('shotSize', dom.shotSizeSelect.value); });
    dom.angleSelect.addEventListener('change', function () { updateShotField('angle', dom.angleSelect.value); });
    dom.movementSelect.addEventListener('change', function () { updateShotField('movement', dom.movementSelect.value); });
    dom.shotNote.addEventListener('focus', function () {
      const shot = getSelectedShot();
      state.noteEdit = shot ? { shotId: shot.id, pushed: false } : null;
    });
    dom.shotNote.addEventListener('input', function () {
      const shot = getSelectedShot();
      if (!shot) return;
      if (state.noteEdit && state.noteEdit.shotId === shot.id && !state.noteEdit.pushed) {
        pushHistory();
        state.noteEdit.pushed = true;
      }
      shot.note = dom.shotNote.value.slice(0, 120);
      saveSoon();
    });
    dom.shotNote.addEventListener('blur', function () {
      state.noteEdit = null;
      persistProject();
    });

    // shot name
    if (dom.shotNameInput) {
      dom.shotNameInput.addEventListener('focus', function () {
        const shot = getSelectedShot();
        state.nameEdit = shot ? { shotId: shot.id, pushed: false } : null;
      });
      dom.shotNameInput.addEventListener('input', function () {
        const shot = getSelectedShot();
        if (!shot) return;
        if (state.nameEdit && state.nameEdit.shotId === shot.id && !state.nameEdit.pushed) {
          pushHistory();
          state.nameEdit.pushed = true;
        }
        shot.name = dom.shotNameInput.value.slice(0, 24);
        paintShotName(shot);
        saveSoon();
      });
      dom.shotNameInput.addEventListener('blur', function () {
        const shot = getSelectedShot();
        if (!shot) return;
        const value = dom.shotNameInput.value.trim() || '未命名镜头';
        if (shot.name !== value) {
          shot.name = value;
          dom.shotNameInput.value = value;
          paintShotName(shot);
        }
        state.nameEdit = null;
        saveSoon();
        persistProject();
      });
      dom.shotNameInput.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') { e.preventDefault(); dom.shotNameInput.blur(); }
      });
    }

    // ink controls
    dom.strokeWidthSeg.addEventListener('click', function (e) {
      const btn = e.target.closest('[data-width]');
      if (!btn) return;
      const width = Number(btn.dataset.width);
      state.brushWidth = width;
      const shot = getSelectedShot();
      if (shot && state.selectedElementIndex != null) {
        const el = shot.drawing.elements[state.selectedElementIndex];
        if (el) {
          updateSelectedElementStyle({ width: width, stroke: '#161512' });
          return;
        }
      }
      renderInspector();
    });
    dom.fillSeg.addEventListener('click', function (e) {
      const btn = e.target.closest('[data-fill]');
      if (!btn) return;
      const fill = btn.dataset.fill;
      state.brushFill = fill;
      const shot = getSelectedShot();
      if (shot && state.selectedElementIndex != null) {
        const el = shot.drawing.elements[state.selectedElementIndex];
        if (el && el.type !== 'line' && el.type !== 'path' && el.type !== 'text') {
          updateSelectedElementStyle({ fill: fill });
          return;
        }
      }
      renderInspector();
    });

    // floating selection toolbar
    if (dom.selectionCopyBtn) dom.selectionCopyBtn.addEventListener('click', duplicateSelectedElement);
    if (dom.selectionDeleteBtn) dom.selectionDeleteBtn.addEventListener('click', deleteSelectedElements);
    if (dom.selectionAlignGroup) {
      dom.selectionAlignGroup.addEventListener('click', function (e) {
        const btn = e.target.closest('[data-align]');
        if (!btn) return;
        alignSelectedElements(btn.dataset.align);
      });
    }
    if (dom.selectionLayerUpBtn) dom.selectionLayerUpBtn.addEventListener('click', function () { moveElementLayer(1); });
    if (dom.selectionLayerDownBtn) dom.selectionLayerDownBtn.addEventListener('click', function () { moveElementLayer(-1); });

    if (dom.layerList) {
      dom.layerList.addEventListener('click', function (e) {
        const item = e.target.closest('[data-layer-index]');
        if (!item) return;
        const index = Number(item.dataset.layerIndex);
        if (e.shiftKey) {
          const next = getSelectedElementIndices();
          const at = next.indexOf(index);
          if (at >= 0) next.splice(at, 1);
          else next.push(index);
          setElementSelection(next, index);
          renderSelectionOverlay();
          renderInspector();
        } else {
          selectElement(index);
        }
      });
    }

    // selected element actions (inspector)
    dom.layerUpBtn.addEventListener('click', function () { moveElementLayer(1); });
    dom.layerDownBtn.addEventListener('click', function () { moveElementLayer(-1); });
    dom.duplicateElementBtn.addEventListener('click', duplicateSelectedElement);
    dom.deleteElementBtn.addEventListener('click', deleteSelectedElements);
    if (dom.elementScaleInput) {
      dom.elementScaleInput.addEventListener('change', function () {
        const v = parseFloat(dom.elementScaleInput.value);
        if (Number.isFinite(v)) applyElementTransformFromInputs(v, NaN);
        renderInspector();
      });
      dom.elementScaleInput.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') { e.preventDefault(); dom.elementScaleInput.blur(); }
      });
    }
    if (dom.elementRotationInput) {
      dom.elementRotationInput.addEventListener('change', function () {
        const v = parseFloat(dom.elementRotationInput.value);
        if (Number.isFinite(v)) applyElementTransformFromInputs(NaN, v);
        renderInspector();
      });
      dom.elementRotationInput.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') { e.preventDefault(); dom.elementRotationInput.blur(); }
      });
    }

    // timeline interaction
    dom.shotTrack.addEventListener('pointerdown', onShotPointerDown);
    dom.shotTrack.addEventListener('keydown', function (e) {
      const block = e.target.closest('.shot-block');
      if (!block) return;
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        selectShot(block.dataset.shotId, { seek: true });
      }
    });
    dom.shotTrack.addEventListener('contextmenu', function (e) {
      const block = e.target.closest('.shot-block');
      if (!block) return;
      e.preventDefault();
      openShotContextMenu(block.dataset.shotId, e.clientX, e.clientY);
    });
    if (dom.contextMenu) {
      dom.contextMenu.addEventListener('click', function (e) {
        const item = e.target.closest('[data-context-action]');
        if (!item) return;
        const action = item.dataset.contextAction;
        const target = state.contextTarget;
        hideContextMenu();
        handleContextAction(action, target);
      });
    }
    dom.ruler.addEventListener('pointerdown', startScrub);
    dom.trackArea.addEventListener('pointerdown', function (e) {
      if (e.target.closest('.shot-block')) return;
      startScrub(e);
    });
    dom.timelinePlayBtn.addEventListener('click', function () { openPreview(false); });
    dom.goStartBtn.addEventListener('click', function () { setPlayheadUI(0); });
    dom.goEndBtn.addEventListener('click', function () { setPlayheadUI(totalDuration()); });
    dom.addBlankBtn.addEventListener('click', addBlankShot);
    if (dom.moveShotLeft) dom.moveShotLeft.addEventListener('click', function () { moveSelectedShot(-1); });
    if (dom.moveShotRight) dom.moveShotRight.addEventListener('click', function () { moveSelectedShot(1); });
    dom.zoomOutBtn.addEventListener('click', function () { zoomTimeline(-1); });
    dom.zoomInBtn.addEventListener('click', function () { zoomTimeline(1); });

    // preview overlay
    dom.previewCloseBtn.addEventListener('click', closePreview);
    dom.previewPlayBtn.addEventListener('click', togglePreviewPlayback);
    dom.previewRestartBtn.addEventListener('click', function () {
      if (!preview.sequence) return;
      preview.time = 0;
      preview.lastTs = 0;
      drawPreviewFrame();
      playPreview();
    });
    dom.previewStageWrap.addEventListener('click', function () { if (preview.sequence) togglePreviewPlayback(); });
    dom.previewProgress.addEventListener('pointerdown', function (e) {
      e.stopPropagation();
      e.preventDefault();
      seekPreviewFromClientX(e.clientX);
      const move = function (ev) { seekPreviewFromClientX(ev.clientX); };
      const up = function () {
        document.removeEventListener('pointermove', move);
        document.removeEventListener('pointerup', up);
      };
      document.addEventListener('pointermove', move);
      document.addEventListener('pointerup', up);
    });

    // export modal
    dom.exportCloseBtn.addEventListener('click', closeExport);
    dom.resolutionSeg.addEventListener('click', function (e) {
      if (exportState.rendering) return;
      const btn = e.target.closest('[data-res]');
      if (!btn) return;
      exportState.res = Number(btn.dataset.res);
      setExportSegmentActive(dom.resolutionSeg, 'res', exportState.res);
    });
    dom.fpsSeg.addEventListener('click', function (e) {
      if (exportState.rendering) return;
      const btn = e.target.closest('[data-fps]');
      if (!btn) return;
      exportState.fps = Number(btn.dataset.fps);
      setExportSegmentActive(dom.fpsSeg, 'fps', exportState.fps);
    });
    dom.burnInToggle.addEventListener('change', function () { exportState.burnIn = dom.burnInToggle.checked; });
    dom.pushInToggle.addEventListener('change', function () { exportState.pushIn = dom.pushInToggle.checked; });
    dom.startRenderBtn.addEventListener('click', exportVideo);
    dom.exportSheetBtn.addEventListener('click', exportContactSheet);
    dom.renderAgainBtn.addEventListener('click', function () {
      resetExportUI();
      exportState.res = 1080;
      exportState.fps = DEFAULT_FPS;
      setExportSegmentActive(dom.resolutionSeg, 'res', 1080);
      setExportSegmentActive(dom.fpsSeg, 'fps', DEFAULT_FPS);
    });
    dom.exportModal.addEventListener('click', function (e) {
      if (e.target === dom.exportModal && !exportState.rendering) closeExport();
    });

    // confirm
    dom.confirmCancel.addEventListener('click', closeConfirm);
    dom.confirmOk.addEventListener('click', function () {
      const action = state.confirmAction;
      dom.confirmModal.hidden = true;
      state.confirmAction = null;
      if (typeof action === 'function') action();
    });
    dom.confirmModal.addEventListener('click', function (e) {
      if (e.target === dom.confirmModal) closeConfirm();
    });

    // theme
    if (dom.themeToggle) {
      dom.themeToggle.addEventListener('click', toggleTheme);
    }

    dom.timelineScroll.addEventListener('scroll', hideContextMenu, { passive: true });
    window.addEventListener('blur', hideContextMenu);

    // keyboard
    document.addEventListener('keydown', onGlobalKeyDown);
    window.addEventListener('resize', debounce(function () {
      fitBoard();
      if (preview.open) fitPreviewCanvas();
      if (window.innerWidth > 700) closeMobileLibrary();
      state.basePps = null;
      if (dom.timelineScroll) renderTimeline();
    }, 120));
    window.addEventListener('beforeunload', persistProject);

    // pointer scrub bubble cleanup for editor blur
    dom.shotNote.addEventListener('change', persistProject);
  }

  function onGlobalKeyDown(e) {
    // Text fields and select controls keep their native keyboard behaviour.
    if (state.textEditor && e.target === state.textEditor.input) return;

    if (e.key === 'Escape') {
      if (dom.contextMenu && !dom.contextMenu.hidden) { hideContextMenu(); return; }
      if (!dom.exportModal.hidden) {
        if (!exportState.rendering) closeExport();
        return;
      }
      if (!dom.projectsModal.hidden) { closeProjectsModal(); return; }
      if (!dom.confirmModal.hidden) { closeConfirm(); return; }
      if (preview.open) { closePreview(); return; }
      if (!dom.projectMenu.hidden) { toggleProjectMenu(false); return; }
      if (dom.libraryPanel && dom.libraryPanel.classList.contains('mobile-open')) { closeMobileLibrary(); return; }
      if (state.focusMode) { toggleFocusMode(); return; }
      if (state.penDraft) { cancelPenDraft(); return; }
      if (state.pathEdit) { state.pathEdit = null; renderSelectionOverlay(); return; }
      if (state.selectedElementIndex != null) { resetDrawingSelection(); return; }
      return;
    }

    if (preview.open) {
      if (e.key === ' ') {
        e.preventDefault();
        togglePreviewPlayback();
        return;
      }
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        preview.time = clamp(preview.time - 1, 0, preview.total);
        drawPreviewFrame();
        return;
      }
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        preview.time = clamp(preview.time + 1, 0, preview.total);
        drawPreviewFrame();
        return;
      }
      return;
    }

    if (!dom.exportModal.hidden || !dom.confirmModal.hidden) return;
    if (isTypingTarget(e.target)) return;

    if (state.tool === 'pen' && state.penDraft) {
      if (e.key === 'Enter') { e.preventDefault(); finishPenDraft(false); return; }
      if (e.key === 'Escape') { e.preventDefault(); cancelPenDraft(); return; }
    }

    const meta = e.metaKey || e.ctrlKey;
    if (meta && e.key.toLowerCase() === 'z') {
      e.preventDefault();
      if (e.shiftKey) redo();
      else undo();
      return;
    }
    if (meta && e.key.toLowerCase() === 'y') {
      e.preventDefault();
      redo();
      return;
    }
    if (meta && e.key.toLowerCase() === 'c') {
      if (getSelectedElementIndices().length) {
        e.preventDefault();
        copySelectedElements();
      }
      return;
    }
    if (meta && e.key.toLowerCase() === 'v') {
      if (state.clipboard && state.clipboard.length) {
        e.preventDefault();
        pasteElements();
      }
      return;
    }
    if (meta && e.key.toLowerCase() === 'd') {
      e.preventDefault();
      if (getSelectedElementIndices().length) duplicateSelectedElement();
      else duplicateSelectedShot();
      return;
    }
    if (e.key === 'Delete' || e.key === 'Backspace') {
      if (getSelectedElementIndices().length) {
        e.preventDefault();
        deleteSelectedElements();
      }
      return;
    }
    if (e.key === ' ') {
      e.preventDefault();
      openPreview(false);
      return;
    }
    if (e.key === '/') {
      e.preventDefault();
      dom.presetSearch.focus();
      return;
    }
    if (e.key === 'g' || e.key === 'G') {
      state.guides = !state.guides;
      setBoardGuides();
      updateToolRail();
      return;
    }
    const key = e.key.toLowerCase();
    const shortcut = { v: 'select', p: 'pencil', l: 'line', a: 'arrow', r: 'rect', o: 'ellipse', t: 'text', e: 'eraser' };
    if (!meta && shortcut[key]) {
      e.preventDefault();
      setActiveTool(shortcut[key]);
    }
  }

  function updateOrderButtons() {
    const index = getSelectedShotIndex();
    const count = getShotList().length;
    if (dom.moveShotLeft) dom.moveShotLeft.disabled = index <= 0;
    if (dom.moveShotRight) dom.moveShotRight.disabled = index < 0 || index >= count - 1;
  }

  function moveSelectedShot(delta) {
    const index = getSelectedShotIndex();
    const target = index + delta;
    const shots = getShotList();
    if (index < 0 || target < 0 || target >= shots.length) return;
    pushHistory();
    const moved = shots.splice(index, 1)[0];
    shots.splice(target, 0, moved);
    state.selectedShotId = moved.id;
    state.selectedElementIndex = null;
    state.multiSelection = [];
    state.basePps = null;
    const starts = getShotStarts();
    state.playhead = starts[target] || 0;
    renderAll();
    saveSoon();
    requestAnimationFrame(function () { scrollToShot(moved.id); });
    toast(delta < 0 ? '镜头已前移' : '镜头已后移');
  }

  function zoomTimeline(dir) {
    let idx = ZOOM_STEPS.indexOf(state.zoom);
    if (idx < 0) idx = 2;
    idx = clamp(idx + dir, 0, ZOOM_STEPS.length - 1);
    state.zoom = ZOOM_STEPS[idx];
    renderTimeline();
    if (dom.zoomLabel) dom.zoomLabel.textContent = String(Math.round(state.zoom * 100));
  }

  function toggleFocusMode() {
    state.focusMode = !state.focusMode;
    dom.stage.classList.toggle('focus-mode', state.focusMode);
    if (dom.boardFullscreenBtn) {
      dom.boardFullscreenBtn.innerHTML = '<svg class="icon"><use href="' + (state.focusMode ? '#i-close' : '#i-expand') + '"/></svg>' + (state.focusMode ? '退出' : '专注');
    }
    if (dom.timeline) dom.timeline.style.visibility = state.focusMode ? 'hidden' : '';
    if (dom.libraryPanel) dom.libraryPanel.style.visibility = state.focusMode ? 'hidden' : '';
    if (dom.inspectorPanel) dom.inspectorPanel.style.visibility = state.focusMode ? 'hidden' : '';
    setTimeout(fitBoard, 40);
  }

  /* ============================================================
     Boot
     ============================================================ */

  function setupObservers() {
    if (window.ResizeObserver) {
      const ro = new ResizeObserver(debounce(function () { fitBoard(); }, 60));
      if (dom.boardViewport) ro.observe(dom.boardViewport);
      const tro = new ResizeObserver(debounce(function () {
        if (!getShotList().length) return;
        state.basePps = null;
        renderTimeline();
      }, 160));
      if (dom.timelineScroll) tro.observe(dom.timelineScroll);
    }
  }

  function boot() {
    try {
      const savedTheme = localStorage.getItem('aperture.theme');
      if (savedTheme === 'dark') applyTheme('dark', false);
      else applyTheme('light', false);
    } catch (err) { applyTheme('light', false); }
    populateStaticSelects();
    state.project = loadInitialProject();
    state.selectedShotId = getShotList()[0] ? getShotList()[0].id : null;
    state.playhead = 0;
    state.basePps = null;
    renderCategoryTabs();
    renderLibraryGrid();
    bindEvents();
    renderAll();
    fitBoard();
    updateSaveStateInitial();
    persistProject();
    setupObservers();
    requestAnimationFrame(function () {
      fitBoard();
      renderTimeline();
    });
    // Warm up the image cache for the demo so first preview feels immediate.
    setTimeout(function () {
      if (preview.open) return;
      try { D.svgDataUri(state.project.shots[0].drawing, 640, 360); } catch (err) { /* noop */ }
    }, 400);
  }

  function updateSaveStateInitial() {
    setSaveState('saved', '已保存');
  }

  boot();
})();
