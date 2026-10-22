# 分镜预设数据契约 v1

本文件定义 `storyboard/js/presets.js` 必须提供的数据结构。主程序只读取
`window.SB_PRESETS`，不依赖预设内部实现。预设脚本必须是**传统 script**（非 ES module），
可被 `file://` 和本地 http 服务直接加载。

```js
(function () {
  'use strict';
  // helpers...
  const PRESETS = [ /* 见下方每项结构 */ ];
  window.SB_PRESETS = PRESETS;
})();
```

## 单个预设

```js
{
  id: 'film-city-establish',     // 全局唯一，kebab-case
  name: '城市定场',               // 中文名，≤ 10 字，避免与同类重复
  en: 'CITY ESTABLISHING',       // 英文，全大写，作为小标签
  category: 'film',              // film | drama | dialogue | action | emotion | transition | basic
  tags: ['定场', '大远景', '城市', '雨夜'], // 3–6 个可搜索中文/英文关键词
  shotSize: 'ELS',               // 从 ELS/LS/MLS/MS/MCU/CU/ECU/OTS/POV/INSERT/AERIAL 中选
  angle: '平视',                  // 平视/仰视/俯视/鸟瞰/主观/过肩/侧逆光
  movement: '固定',               // 固定/推镜/拉镜/横移/跟拍/手持/摇镜/升降/变焦
  duration: 3.5,                 // 默认时长秒，0.5–8，建议 1–5
  note: '先给空城，再让主角从画面右侧进入。', // 导演提示，≤ 36 字
  featured: false,               // 只有示例项目用到的 8 个预设标 true
  drawing: {
    bg: '#f4f1e8',
    elements: [ /* 见绘图元素契约 */ ]
  }
}
```

## 绘图元素契约

坐标系固定 `viewBox="0 0 1600 900"`。画布背景由主程序提供，预设不要绘制整块背景。
所有元素都是可再次编辑/删除的矢量模块。坐标保留到整数即可。

```js
// 手绘/自由曲线
{ type: 'path', d: 'M 120 640 C ...', stroke: '#141414', width: 4, fill: 'none', opacity: 1, dash: '' }

// 直线（arrowEnd: true 时由渲染器画箭头，用于运镜/视线标记）
{ type: 'line', x1: 100, y1: 120, x2: 400, y2: 120, stroke: '#141414', width: 3, opacity: 1, dash: '', arrowEnd: false }

// 矩形（rx 可做圆角）
{ type: 'rect', x: 100, y: 100, w: 400, h: 300, rx: 0, stroke: '#141414', width: 4, fill: 'none', opacity: 1 }

// 椭圆
{ type: 'ellipse', cx: 800, cy: 420, rx: 220, ry: 300, stroke: '#141414', width: 4, fill: 'none', opacity: 1 }

// 文字（中文用 serif 更接近手写分镜标注）
{ type: 'text', x: 120, y: 800, text: '夜 · 外', size: 34, fill: '#141414', anchor: 'start',
  weight: '400', font: 'serif', italic: false, opacity: 1 }
```

字段默认值：`stroke: '#141414'`、`width: 4`、`fill: 'none'`、`opacity: 1`、`anchor: 'start'`、
`size: 34`、`weight: '400'`、`font: 'serif'`。`fill` 仅允许 `none`、`#141414`、`#3b3a37`、
`#6f6c66`、`#a9a49a`、`#ded9cf`、`hatch`、`crosshatch`。不要使用彩色。

## 视觉要求（很重要）

- 这是「导演手绘分镜」，不是扁平插画：线条有粗细层级，主体清楚，留白讲究，带电影感。
- 每张构图必须有：主体 + 环境层次（前/中/后景至少两层）+ 至少一个电影语言标记
  （视线箭头、运镜箭头、构图辅助线、镜头编号、焦距标记等，按需选择，不要每张都堆满）。
- 人体只用极简线条/剪影表达，不要卡通表情。特写应有足够大的头部/手部细节。
- 画面边缘不要画 16:9 黑边；主程序会画。不要让元素超出 `0–1600 × 0–900`，边缘安全区 40px。
- 使用重复 helper（人物、门框、城市天际线、相机、手机、雨线等）保持统一语言，但构图要丰富。
- 不要绘制任何有版权的角色/标志/文字，使用原创、通用的电影桥段。
- 黑、灰、米白不超过 5 个色阶；避免大面积纯黑（会压垮画面）。
- 英文标签只用于画面内的道具/字幕（如 "NO SIGNAL"），不要在每个画面里放预设名。

## 数量和分类

- 至少 **90 个**预设，每个分类至少 **12 个**。
- 分类：`film`（电影感/好莱坞语法）、`drama`（短剧钩子/爽点/反转）、`dialogue`（对话场）、
  `action`（动作/追逐）、`emotion`（情绪/特写）、`transition`（空镜/转场）、`basic`（基础镜位）。
- 构图母版至少 32 种明显不同的场景，不能只是换标签。允许同类预设复用构图但需要改变
  景别、角度、运动标记或人物位置，并在 `note` 里写清区别。
- id 唯一、不可重复；id 前缀与分类对应：
  - film → `film-*`
  - drama → `drama-*`
  - dialogue → `dialogue-*`
  - action → `action-*`
  - emotion → `emotion-*`
  - transition → `transition-*`
  - basic → `basic-*`

## 示例项目必须包含的 8 个 featured 预设

这 8 个预设会用于首屏示例项目，`featured: true`，id 必须严格为：

1. `film-night-city` — 夜城定场，城市天际线 + 湿地反光，ELS，固定，4.0s
2. `film-silhouette-door` — 门框逆光剪影，人物背对镜头，LS，固定，3.0s
3. `drama-phone-hook` — 手机特写钩子，屏幕光打在脸上，CU，推镜，2.0s
4. `dialogue-over-shoulder` — 过肩对峙，两人剪影，OTS，固定，3.5s
5. `emotion-hand-close` — 手部情绪特写（攥紧/松开），ECU，固定，1.5s
6. `action-low-angle-hero` — 低角度英雄入画，仰视，MS，跟拍，2.5s
7. `action-corridor-chase` — 走廊追拍，手持，跟拍，3.0s
8. `transition-title-black` — 黑场片名，极简，1.5s

## 自检

写完后请用 node 做语法与结构校验：

```bash
node --check storyboard/js/presets.js
node -e "global.window={}; require('./storyboard/js/presets.js'); const p=window.SB_PRESETS; console.log(p.length); const ids=new Set(); for(const x of p){ if(ids.has(x.id)) throw Error('dup '+x.id); ids.add(x.id); for(const k of ['id','name','en','category','tags','shotSize','angle','movement','duration','note','drawing']) if(!(k in x)) throw Error(x.id+' missing '+k); if(!x.drawing.elements.length) throw Error(x.id+' empty'); } console.log('featured', p.filter(x=>x.featured).map(x=>x.id));"
```

只写 `storyboard/js/presets.js`，不要动其它文件。
