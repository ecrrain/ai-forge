// 定制外观<暗> 主题插件（glass-1 / aurora-glass）Client 源码
// 用途：任何会话读取本文件，用 cordis_define(code.client = 本字符串) 发布即可恢复主题。
// 用法：const src = require('aurora-glass.client.js') → src 即 code.client 字符串
module.exports = `const TOKENS = {
  '--dsw-alias-bg-base': 'rgba(0, 0, 0, 0.24)',
  '--dsw-alias-bg-layer-1': 'rgba(255, 255, 255, 0.085)',
  '--dsw-alias-bg-layer-2': 'rgba(255, 255, 255, 0.045)',
  '--dsw-alias-bg-overlay': 'rgba(16, 16, 22, 0.58)',
  '--dsw-alias-border-l1': 'rgba(255, 255, 255, 0.12)',
  '--dsw-alias-border-l2': 'rgba(255, 255, 255, 0.20)',
  '--dsw-alias-brand-primary': '#67e8f9',
  '--dsw-alias-label-primary': '#f4f7fb',
  '--dsw-alias-label-secondary': 'rgba(226, 232, 244, 0.64)',
  '--dsw-specific-sidebar-fill': 'rgba(0, 0, 0, 0.26)',
  '--dsw-specific-input-major': 'rgba(0, 0, 0, 0.38)',
  '--dsw-alias-button-elevated-fill': 'rgba(6, 6, 10, 0.68)',
  '--dsw-specific-bubble': 'rgba(0, 0, 0, 0.18)',
}

const PAIRS = {}
for (const name of Object.keys(TOKENS)) {
  PAIRS[name] = { light: TOKENS[name], dark: TOKENS[name] }
}

const CSS = [
  'html { background: #000; }',
  'html body { background: transparent; }',
  '#root {',
  '  position: relative;',
  '  z-index: 2;',
  '  backdrop-filter: blur(10px) saturate(1.4) brightness(1.12) contrast(1.05);',
  '  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.05), inset 0 0 140px rgba(255, 255, 255, 0.02);',
  '}',
  '#root::after {',
  '  content: "";',
  '  position: fixed;',
  '  inset: 0;',
  '  z-index: 2147483000;',
  '  pointer-events: none;',
  '  background: linear-gradient(115deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.02) 28%, rgba(255, 255, 255, 0) 55%, rgba(255, 255, 255, 0) 78%, rgba(255, 255, 255, 0.03) 100%);',
  '  mix-blend-mode: soft-light;',
  '}',
  'body::before, body::after { content: ""; position: fixed; inset: -30%; z-index: 1; pointer-events: none; }',
  'body::before {',
  '  background: radial-gradient(ellipse 42% 36% at 16% 20%, rgba(34, 211, 238, 0.55), transparent 62%),',
  '    radial-gradient(ellipse 46% 40% at 84% 26%, rgba(167, 139, 250, 0.58), transparent 64%),',
  '    radial-gradient(ellipse 44% 38% at 52% 88%, rgba(251, 113, 133, 0.52), transparent 66%);',
  '  filter: blur(60px) saturate(1.3);',
  '  animation: dsh-aurora-a 14s ease-in-out infinite alternate;',
  '}',
  'body::after {',
  '  background: radial-gradient(ellipse 36% 30% at 70% 70%, rgba(34, 211, 238, 0.34), transparent 60%),',
  '    radial-gradient(ellipse 40% 34% at 24% 74%, rgba(167, 139, 250, 0.36), transparent 62%),',
  '    radial-gradient(ellipse 34% 28% at 80% 12%, rgba(251, 113, 133, 0.32), transparent 58%);',
  '  filter: blur(80px) saturate(1.25);',
  '  animation: dsh-aurora-b 18s ease-in-out infinite alternate;',
  '}',
  '@keyframes dsh-aurora-a {',
  '  from { transform: translate3d(-4%, -3%, 0) scale(1) rotate(0deg); }',
  '  to { transform: translate3d(4%, 3%, 0) scale(1.10) rotate(8deg); }',
  '}',
  '@keyframes dsh-aurora-b {',
  '  from { transform: translate3d(4%, 3%, 0) scale(1.08) rotate(-7deg); }',
  '  to { transform: translate3d(-4%, -3%, 0) scale(1) rotate(0deg); }',
  '}',
  '@media (prefers-reduced-motion: reduce) { body::before, body::after { animation: none; } }',
  '[data-shell-overlay] > * { backdrop-filter: blur(14px) saturate(1.45) brightness(1.08); }',
  '[data-composer-card] {',
  '  backdrop-filter: blur(26px) saturate(1.3) brightness(1.08);',
  '  border-color: rgba(255, 255, 255, 0.14);',
  '  box-shadow: 0 10px 36px rgba(0, 0, 0, 0.45), inset 0 1px 0 rgba(255, 255, 255, 0.10), inset 0 -1px 0 rgba(255, 255, 255, 0.04);',
  '  background-image: linear-gradient(115deg, rgba(255, 255, 255, 0.05), rgba(255, 255, 255, 0.012) 40%, transparent 65%);',
  '}',
  '[role="dialog"][aria-modal="true"] {',
  '  background-color: rgba(6, 6, 10, 0.68);',
  '  backdrop-filter: blur(4px) saturate(1.15);',
  '  border-color: rgba(255, 255, 255, 0.12);',
  '}',
  '[data-chat-flow-kind="user"] > [data-slot] > div > div:first-child > div:last-child,',
  '[data-chat-flow-kind="steering"] > [data-slot] > div > div:first-child > div:last-child {',
  '  border: 1px solid rgba(255, 255, 255, 0.22);',
  '  backdrop-filter: blur(14px) saturate(1.3) brightness(1.08);',
  '  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.12), inset 0 -1px 0 rgba(0, 0, 0, 0.25);',
  '}',
  '[data-tool="cordis_run"] pre {',
  '  background: rgba(0, 0, 0, 0.18);',
  '  border: 1px solid rgba(255, 255, 255, 0.22);',
  '  border-radius: 12px;',
  '  backdrop-filter: blur(14px) saturate(1.3) brightness(1.08);',
  '  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.12), inset 0 -1px 0 rgba(0, 0, 0, 0.25);',
  '}',
].join('\\n')

return {
  name: 'aurora-glass',
  apply(ctx) {
    const theme = ctx.get('theme')
    if (theme !== undefined) {
      ctx.effect(() => theme.overrideTokens('aurora-glass', PAIRS))
    }
    ctx.effect(() => styles.insert(CSS))
  },
}`