# Aurora Glass · 极光玻璃主题

DSH web 界面的玻璃质感主题插件（glass-1 / pkg-24）。大面积使用 `backdrop-filter` 玻璃模糊、半透明层叠质感与流动的极光渐变背景。

## 效果

- 全局 10px 玻璃模糊 + 饱和度/亮度/对比度增强
- 青色 / 紫色 / 玫红三色极光渐变背景，双图层缓慢流动（14s / 18s 动画周期）
- 对话气泡、输入卡片、弹窗、代码块全部玻璃化
- 暗色系半透明色板，`prefers-reduced-motion` 下自动关闭动画

## 安装

任意会话读取 `aurora-glass.client.js`，`require` 后得到 `code.client` 字符串：

```js
const src = require('./aurora-glass.client.js') // src 即 code.client 字符串
// 用 cordis_define 定义插件，cordis_run 发布并运行，主题立即生效
```

配合 `cordis-memory` 预设的常驻记忆，新会话可自动检查并恢复本主题。

## 权利归属

- 权利人 / 指挥者：**ecrrain**
- 执行者 / 工具：**DeepSeek (dsh agent)** —— 不主张任何知识产权
- 许可证：[MIT](../../LICENSE)，Copyright (c) 2026 ecrrain
- 详见仓库根 [署名与发布规范](../../notes/attribution-policy.md)
