# 部署指南：给你的 AI 装上"眼睛"和"锻造厂"

> 写给：同样用自然语言指挥 AI 干活的人。
> 用法：把下面的提示词**整段复制**给你的 AI（DeepSeek / Claude / Codex 等），它会自己完成部署并汇报。
> 目标环境：DeepSeek Harness（DSH）web 版；其他框架可让 AI 自行适配。

---

## 这段提示词能装什么

| # | 能力 | 效果 |
|---|---|---|
| 1 | GitHub MCP | AI 直接操控你的 GitHub：建仓库、发 issue、管 PR、搜代码 |
| 2 | DS 视觉桥 Plus | 让纯文本 AI 会**看图**、会**生图**、会 OCR、会解析 PDF |
| 3 | Aurora Glass | DSH 界面变成玻璃质感主题（可选美化） |

---

## 提示词（直接复制这一段）

```text
【角色】你是我的 AI 部署助手。请按下面的步骤帮我把三样东西部署好，每步完成后用简短清单汇报结果。不要问多余问题，遇到不确定的先自己探测，探测不到再问我。

【通用规则】
- 我的环境是 DeepSeek Harness（DSH），默认 profile 是 web，DSH home 一般在 ~/.dsh（Windows 为 C:\Users\<用户名>\.dsh），请先探测确认，不要假设。
- 任何 API key / token 都不许写进配置文件或仓库，一律存用户级环境变量，配置里用 ${process.env.XXX} 引用。
- 所有改动前先备份原文件。

【步骤 1：GitHub MCP】
1. 检查用户级环境变量 GITHUB_PAT_TOKEN 是否存在；不存在则告诉我怎么在 GitHub 创建 token（勾选 repo 权限），创建后写入用户级环境变量。
2. 打开 <DSH home>/profiles/<你的 profile>/cordis.patch.yml，在顶层数组追加：
   - insert:
       - id: mcp-github
         name: '@deepseek-ai/dsh-mcp-client'
         config:
           serverName: github
           transport: streamable-http
           url: https://api.githubcopilot.com/mcp/
           headers:
             Authorization: !!js '`Bearer ${process.env.GITHUB_PAT_TOKEN}`'
3. 重启 Harness，然后在会话里问"你现在有哪些 GitHub 工具？"，确认出现 mcp__github__ 开头的工具。
4. 用 mcp__github__get_me 验证能查到我的账号。

【步骤 2：DS 视觉桥 Plus（让 AI 会看图、会生图）】
1. 从 https://github.com/ecrrain/ai-forge 下载 skills/ds-vision-skill-plus 整个目录（或原作者的仓库 https://github.com/KagaribiDev/ds-vision-skill-plus），放到 <DSH home>/skills/ds-vision-skill-plus（没有 skills 目录就创建）。
2. 运行 scripts/setup.ps1 -Status 查看通道状态。
3. 配置识图通道：scripts/setup.ps1 -SetCustom -BaseUrl <服务商地址> -Key <key> -Model <模型> -Verify（推荐：阿里 DashScope 的 qwen 系列，有免费额度，注册 https://platform.qianwenai.com/home）。
4. （可选）配置生图通道：scripts/setup.ps1 -SetGen -BaseUrl <支持 images/generations 的服务商> -Key <key> -Model <模型> -Verify（推荐：硅基流动 https://cloud.siliconflow.cn，模型如 Kwai-Kolors/Kolors，有免费额度）。
5. 发一张图问"看看这张图"，再让它"画一张图"，验证识图和生图都通。

【步骤 3：Aurora Glass 玻璃主题（可选美化）】
1. 从 https://github.com/ecrrain/ai-forge 获取 plugins/aurora-glass/aurora-glass.client.js。
2. 用 cordis_define 定义插件，cordis_run 发布运行，确认界面变成玻璃质感。

【步骤 4：收尾】
1. 汇总三样东西的部署状态：✅/❌ + 一句说明。
2. 提醒我重启后哪些配置需要重新生效。
```

---

## 给人类读者的话

### 部署前准备

- **GitHub token**：到 GitHub Settings → Developer settings → Personal access tokens 创建，勾选 `repo` 权限（有效期建议设长一点，或按需设短）。
- **识图/生图 key**：两者是独立配置，可只配一个；推荐先配识图（qwen 系列免费额度），生图按次计费，确认自己接受费用再配。

### 注意事项

1. **密钥安全**：token / key 永远只进用户级环境变量，不写进任何配置文件、仓库或聊天记录。
2. **路径别写死**：不同机器 DSH home 可能不同，让 AI 自己探测，别把本文档里的 `C:\Users\Administrator\.dsh` 直接抄。
3. **版权红线**：视觉桥 Plus 是第三方 MIT 作品（作者 [KagaribiDev](https://github.com/KagaribiDev/ds-vision-skill-plus)），部署或再分发时**必须保留原 LICENSE 和作者署名**，不要冒名。
4. **隐私**：识图/生图会把图片发给你的服务商（DashScope / 硅基流动 / 其他），敏感图慎发。
5. **重启机制**：GitHub MCP 配置改完一般要重启 Harness 才能继承环境变量；主题和技能支持热加载。

### 验证清单

- [ ] 会话里能看到 `mcp__github__get_me` 等工具，且能查到自己的账号
- [ ] 发一张图，AI 能描述内容（识图通）
- [ ] 说"画一张图"，AI 能生成图片并展示（生图通）
- [ ] 界面变成玻璃质感（主题通）

---

*本指南由 [ecrrain/ai-forge](https://github.com/ecrrain/ai-forge) 提供，部署方式随 DSH 版本演进可能微调，如遇问题让 AI 结合报错信息自行排查。*
