# 03｜DeepSeek 接入 Codex：官方一键脚本 / 手动配置与排障

> 场景：在 Codex（ChatGPT 桌面端 / CLI）里把默认模型换成 DeepSeek-V4-Flash 或 DeepSeek-V4-Pro。
> 结论：核心只有三步——拿到 DeepSeek API key、让 Codex 认识 DeepSeek 模型（官方 `models.json`）、在 `config.toml` 里声明 provider 和 key。官方有一键脚本（macOS/Linux），Windows 手动改配置完全等效。

## 背景
- 目标：Codex 官方默认走 OpenAI 账号，要改用 DeepSeek 的模型，需要把 Codex 的模型提供方指到 DeepSeek API。
- 环境：本机为 Windows + Codex 桌面端，配置目录 `C:\Users\Administrator\.codex`（即 `%USERPROFILE%\.codex`，环境变量 `CODEX_HOME`）。
- 可行性：DeepSeek API 兼容 OpenAI Responses API 格式（`base_url = https://api.deepseek.com/` + `wire_api = "responses"`），Codex 无需改协议即可调用。
- 本机实际时间线（工作记录留痕）：
  - 2026-08-11：首次接入（官方脚本 v1.0.0），备份与改动明细留在 `backup-deepseek\manifest.txt`；
  - 2026-08-13：DeepSeek V4 正式版发布，切到 `deepseek-v4-pro`；
  - 2026-08-15：应老板要求换 key（久鱼电竞 key），后因余额为 0 降级 `deepseek-v4-flash` 省成本；
  - 2026-08-16：恢复原 key，模型保持 `deepseek-v4-flash`，reasoning 保持 high。

## 原理（根因）
- Codex 启动时读 `%USERPROFILE%\.codex\config.toml`：顶层键 `model` / `model_provider` / `model_catalog_json` 决定用哪个模型、走哪个提供方、模型元数据从哪读；`[model_providers.<id>]` 段决定请求发往哪个 base_url、怎么认证。
- `models.json` 是 Codex 的模型目录（model catalog）：声明每个模型的 slug、上下文窗口、工具能力、推理等级（low/high/max）、`minimal_client_version` 等。**不配它，Codex 根本不认识 `deepseek-v4-*`**，会报 model not found 或回退默认模型。
- 官方一键脚本做的事，等价于：
  1. 备份原 `config.toml` → `backup-deepseek\config.toml`，并写 `manifest.txt` 记录改动；
  2. 删除会冲突/过期的键（`service_tier`、`profiles`、`model_context_window`、`base_instructions` 等）；
  3. 写六个顶层键 + `[model_providers.deepseek]`；
  4. 生成 `models.json`（内含 flash 与 pro 两个条目）。
- 所以"怎么把 DeepSeek 接进 Codex"的本质 = 配置这三个东西：API key、provider 段、models.json 目录。

## 正确做法（已验证）

### 方式 A：官方一键脚本（macOS / Linux / Git Bash）

```bash
bash <(curl -fsSL https://cdn.deepseek.com/api-docs/codex-deepseek-setup.sh)
```

- 菜单：1 = deepseek-v4-flash，2 = deepseek-v4-pro，3 = 恢复默认配置；
- API key：脚本优先读环境变量 `DEEPSEEK_API_KEY`（必须以 `sk-` 开头），否则交互输入；
- 安装完会提示：**彻底退出** ChatGPT 桌面端（macOS 用 ⌘Q，只关窗口不算）再重新打开，配置才生效。

### 方式 B：Windows 手动配置（本机实测方式）

1. 创建 API key：登录 [platform.deepseek.com](https://platform.deepseek.com) → API Keys → 创建，得到 `sk-` 开头的 key。
2. 放模型目录：把 DeepSeek 官方 `models.json` 放到 `%USERPROFILE%\.codex\models.json`（文件内含 `deepseek-v4-flash` 与 `deepseek-v4-pro` 两个条目，可从官方脚本/文档获取）。
3. 编辑 `%USERPROFILE%\.codex\config.toml`，在文件顶部和末尾分别加：

```toml
model = "deepseek-v4-flash"
model_reasoning_effort = "high"
model_provider = "deepseek"
preferred_auth_method = "apikey"
forced_login_method = "api"
model_catalog_json = "C:/Users/<你的用户名>/.codex/models.json"

[model_providers.deepseek]
name = "deepseek"
base_url = "https://api.deepseek.com/"
wire_api = "responses"
experimental_bearer_token = "sk-你的key"
```

4. 完全退出并重开 Codex 桌面端，模型列表里应出现 DeepSeek-V4-Flash。

### 切模型 / 换 key
- Flash ↔ Pro：只改顶层 `model = "deepseek-v4-pro"`，其它不动；
- 换 key：只改 `[model_providers.deepseek]` 里的 `experimental_bearer_token`；
- 改完同样要彻底退出重开。

### 一键还原默认
- 官方脚本菜单选 3；Windows 手动：把 `%USERPROFILE%\.codex\backup-deepseek\config.toml` 复制回 `config.toml`，删除 `models.json` 和 `[model_providers.deepseek]` 段。

## 验证标准
1. Codex 正常回复，无 401（key 错）、404（端点错）、400（残留参数）；
2. 界面/设置里模型名显示 DeepSeek-V4-Flash 或 DeepSeek-V4-Pro；
3. API 层自测（2026-08-13 本机实测记录）：`GET https://api.deepseek.com/models` 返回 `deepseek-v4-flash` + `deepseek-v4-pro`；最小 `POST /responses` 返回 `returned_model = deepseek-v4-pro`；
4. 官方脚本安装成功标志：输出 ✓，且 `backup-deepseek\manifest.txt` 里有本次改动明细。

## 错误做法（实测踩坑）
1. 只改 `model`，不配 `model_provider` / `[model_providers.deepseek]` → 请求仍走 OpenAI，报 401 或找不到模型。
2. 保留残留的 `service_tier = "default"` → 该值会作为参数发给 API，可能报 400（脚本 v1.0.0 的 manifest 明确记录并自动删除）。
3. 缺 `models.json` 或 `model_catalog_json` 指错路径 → Codex 不认识 `deepseek-v4-*`。
4. 改完配置没彻底退出桌面端就重开 → 看起来"没生效"。
5. key 余额不足 → `402 Payment Required: Insufficient Balance`（2026-08-15 实测：久鱼电竞 key 余额为 0）。
6. 把真实 API key 写进教材/仓库 → 密钥泄露；教程一律用占位符 `sk-xxxxx`。

## 环境特例 / 反例
- 官方一键脚本是 bash，Windows 原生 PowerShell 跑不了；等效做法就是手动改 `config.toml`（方式 B）。
- 本机 `CODEX_HOME = C:\Users\Administrator\.codex`，`model_catalog_json` 用绝对路径 `C:/Users/Administrator/.codex/models.json`。
- `config.toml` 里 API key 是明文存储，`.codex` 目录不要整体外传或提交到仓库。
- 切 flash/pro、换 key 只动顶部 `model` 和 provider 段，接入机制本身不变；教材写的是机制，不是某个 key。

## 参考
- DeepSeek 官方文档（接入 Codex）：<https://api-docs.deepseek.com/zh-cn/quick_start/agent_integrations/codex/>
- DeepSeek Responses API 说明：<https://api-docs.deepseek.com/guides/responses_api/>
- 官方一键脚本：<https://cdn.deepseek.com/api-docs/codex-deepseek-setup.sh>
- 本机留痕：`C:\Users\Administrator\.codex\config.toml`、`C:\Users\Administrator\.codex\models.json`、`C:\Users\Administrator\.codex\backup-deepseek\manifest.txt`
- 工作记录：`C:\Users\Administrator\Desktop\工作记录\工作清单.txt`（2026-08-13 / 08-15 / 08-16 相关条目）
