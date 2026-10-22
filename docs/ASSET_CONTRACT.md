# 矢量素材库契约 v1

`storyboard/js/assets.js` 为画布提供可插入的自有素材。它必须是传统 script（非 ES module），加载后暴露
`window.SB_ASSETS = [...]`。主程序会把每个素材作为一个整体插入画布，允许整体移动、复制、删除。

## 素材对象

```js
{
  id: 'person-stand-front',      // 全局唯一 kebab-case
  name: '站立 · 正面',            // 中文名，≤ 8 字
  category: 'person',             // person | face | part | prop | scene | mark
  tags: ['人物', '站姿', '正面'],  // 3–6 个
  width: 220,                     // 本地坐标宽（素材插入画布时按 1:1 使用）
  height: 430,
  elements: [ /* 标准绘图元素，坐标相对本地 0,0 */ ]
}
```

## 绘图元素

与分镜预设完全相同的元素语法：

```js
{ type: 'path', d, stroke, width, fill, opacity, dash }
{ type: 'line', x1, y1, x2, y2, stroke, width, opacity, dash, arrowEnd }
{ type: 'rect', x, y, w, h, rx, stroke, width, fill, opacity }
{ type: 'ellipse', cx, cy, rx, ry, stroke, width, fill, opacity }
{ type: 'text', x, y, text, size, fill, anchor, weight, font, italic, opacity }
```

- 颜色只允许 `#161512` / `#141414` / `#3b3a37` / `#6f6c66` / `#a9a49a` / `#ded9cf` / `#f4f1e8`，
  以及填充值 `none` / `hatch` / `crosshatch`。
- 素材内部坐标以左上为 `(0,0)`，不要超出 `0..width × 0..height` 太多。
- 每个素材 6–80 个元素；人物和部件要尽量几何、简化。

## 分类与数量

- `person` 12 个：完整体人物组合（站立、行走、奔跑、坐下、蹲下、指向、打电话、拥抱、出拳、倒地、回头、背影）。
- `face` 8 个：圆头 + 极简五官的头部素材（正面、侧脸、低头、仰头、戴帽、哭泣、惊讶、剪影）。
- `part` 8 个：可自由拼装的零件（圆头、方形身体、长条手臂、长条腿、手、脚、眼镜、发型）。
- `prop` 12 个：高频道具（手机、相机、汽车、桌子、椅子、门、窗、楼梯、路灯、雨伞、杯子、床）。
- `scene` 10 个：场景母版（城市天际线、房间一角、办公室、走廊、卧室、雨夜街道、树林、天台、审讯室、医院走廊）。
- `mark` 8 个：镜头标记（推镜箭头、摇镜弧线、视线虚线、对白气泡、动作线、闪光、镜头框、雨线）。
- 合计 **58 个**，每个分类数量不得少。

## 人物绘制规范（核心诉求）

用户明确要求人物可以再简化：**圆形头、方形/矩形身体、长条形手臂和腿**。
人物必须由清晰的几何模块组成，而不是复杂插画：

- 头部用椭圆/圆形，默认 `fill:'#f4f1e8'` 或浅灰，黑描边。
- 躯干用矩形/圆角矩形，可用浅灰填充。
- 手臂、腿用长条 rect 或粗线，保持模块化。
- 表情只保留眼睛/嘴巴等必要线条，不做卡通大眼。
- 轮廓线宽建议 5–8，全部圆角端点；画面一眼能读出姿势和方向。
- 素材是黑白的，不要彩色。

## 视觉要求

- 每个素材都必须能单独读懂；小尺寸缩略图（约 120px 宽）仍要清晰，因此线条不要过细过密。
- 空白边距保持 8–20 单位；不要贴着素材边界裁切。
- 不同姿势之间角度/方向/动作必须明显不同，不要只换名字。
- 所有素材和预设是同一套黑白导演分镜视觉语言，但素材更干净、更模块化。
- 不要在素材里绘制 16:9 画框或大背景；场景素材只画环境。

## 自检

```bash
node --check storyboard/js/assets.js
node -e "global.window={}; require('./storyboard/js/assets.js'); const a=window.SB_ASSETS; console.log(a.length); const cats={}; for(const x of a){ cats[x.category]=(cats[x.category]||0)+1; for(const k of ['id','name','category','tags','width','height','elements']) if(!(k in x)) throw Error(x.id+' missing '+k); if(!x.elements.length) throw Error(x.id+' empty'); } console.log(cats); const ids=new Set(); for(const x of a){if(ids.has(x.id)) throw Error('dup '+x.id); ids.add(x.id);} console.log('unique ok');"
```

只写 `storyboard/js/assets.js`，不要改其他文件。
