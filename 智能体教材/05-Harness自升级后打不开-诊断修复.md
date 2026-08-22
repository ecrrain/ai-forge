# 05｜DeepSeek Harness 自升级后"打不开"：残留进程占端口 + 启动脚本检测盲区

> 场景：Harness 自升级（安装目录被官方源码仓库替换）后，双击启动脚本打不开，Web UI（http://127.0.0.1:3080）无法使用。
> 结论：两层根因——① 旧后端进程未停、继续持有 3080 端口，但旧代码文件已被替换（"半死状态"）；② 启动脚本用 `Get-NetTCPConnection` 检测端口在某些环境下查不到监听（而 `netstat -ano` 能看到），误判端口空闲后启动新实例，新实例 bind 3080 报 `EADDRINUSE`。修复=杀残留进程 + 启动脚本升级为"双检测 + 探活 + 只清 node"。

## 背景
- 环境：Windows 桌面，安装目录 `C:\Users\Administrator\Desktop\DeepSeek-Harness`，数据目录 `C:\Users\Administrator\.dsh`（DSH_HOME），启动脚本 `C:\Users\Administrator\Desktop\start-harness.ps1`（bat 只包一层 PowerShell）。
- 版本：Harness 自 v0.1.0-rc.5 便携包自升级为 v0.1.1-rc.2 官方源码仓库后出现。
- 时间线（2026-08-22）：
  - 20:34 旧后端启动（PID 18400），监听 3080，页面正常；
  - 22:05-22:30 自升级：安装目录整体替换为官方源码仓库（出现 `.git`、`packages`、`docs` 等），`node_modules` 重建、`.dsh-build` 生成；
  - 22:31+ 用户双击启动脚本失败，UI 打不开。

## 根因（关键，两层）
### 根因 1：残留旧后端进程占 3080
自升级把安装目录整个替换了，但 20:34 启动的旧后端还在内存里运行、继续持有 3080。它引用的旧代码文件已被删除/替换，页面实际不可用，却占着端口 → 新实例 bind 失败。

### 根因 2：启动脚本端口检测有盲区
脚本原先只用：
```powershell
$existing = Get-NetTCPConnection -LocalPort 3080 -State Listen -ErrorAction SilentlyContinue
if (-not $existing) { ...启动... }
```
`Get-NetTCPConnection` 在某些情况（跨会话/进程权限差异）查不到该监听，而 `netstat -ano` 能看到 → 脚本误判端口空闲 → 启动新实例 → `EADDRINUSE` → 启动失败。用户看到的整体结果就是"打不开"。

## 错误做法（实测踩坑）
1. **只看日志猜原因**：`harness_web.out.log`/`err.log` 没有新错误——失败的实例根本没把错误写进去（或还没写到就被覆盖）；日志只证明"上次成功过"。
2. **在沙箱/受限环境复现**：先报 `EPERM: operation not permitted, symlink ...`（新版启动要把依赖闭包 junction 到 `.dsh\profiles\node_modules`）。这是沙箱权限假象，真实用户环境 junction 创建成功，不要被误导。诊断优先在真实环境复现。
3. **直接用 `netstat` 看到占用就杀进程**：必须先确认 PID 身份（监听 3080 + 启动时间与日志吻合 + 进程名 node），避免误杀无关服务（本例 8900 端口 node 与 Harness 无关，未动）。

## 正确做法（已验证）
### 第一步：查进程 + 端口（netstat 与 Get-NetTCPConnection 对比）
```powershell
Get-Process | Where-Object { $_.ProcessName -match 'node' }
netstat -ano | findstr ":3080"
Get-NetTCPConnection -LocalPort 3080 -State Listen   # 实测可能为空！与 netstat 结果不一致是关键线索
```

### 第二步：手动前台复现，拿真实报错（真实用户环境）
```powershell
$env:DEEPSEEK_API_KEY = <你的API Key>
$env:DSH_HOME = 'C:\Users\Administrator\.dsh'
Set-Location 'C:\Users\Administrator\Desktop\DeepSeek-Harness'
node --import tsx/esm apps/cli/src/bin.ts web
```
真实报错：
```
Error: dsh: plugin tree failed to load: ... webserver (@deepseek-ai/dsh-host-webserver):
listen EADDRINUSE: address already in use 127.0.0.1:3080
```

### 第三步：结束残留旧后端（先确认身份再杀）
```powershell
Stop-Process -Id 18400 -Force   # 用第一步确认的 PID
```

### 第四步：用新代码启动 + 验证
```powershell
$env:DEEPSEEK_API_KEY = <你的API Key>
$env:DSH_HOME = 'C:\Users\Administrator\.dsh'
Set-Location 'C:\Users\Administrator\Desktop\DeepSeek-Harness'
Start-Process node -ArgumentList @('--import','tsx/esm','apps/cli/src/bin.ts','web') -WindowStyle Hidden

netstat -ano | findstr ":3080"                                  # 新 PID LISTENING
Invoke-WebRequest -Uri 'http://127.0.0.1:3080' -UseBasicParsing  # HTTP 200
```
用 Edge 打开 `http://127.0.0.1:3080` 即可看到 UI。

## 验证标准
- 新后端 PID 监听 3080，`HTTP 200`（实测页面 14.7KB HTML）；
- Edge 建立多条 ESTABLISHED 连接，UI 可用；
- 视觉模型 `deepseek-v4-flash-vision-exp` 在新版内置模型目录（`packages/llm/llm-deepseek/src/index.ts` DEFAULT_MODELS，支持 `text`+`image`），且官方 API `GET /models` 返回该模型 → 可用。

## 防复发：启动脚本加固（双检测 + 探活 + 自动清理）
```powershell
function Get-3080ListenerPid {
    # 1) netstat 优先（实测比 Get-NetTCPConnection 可靠）
    $line = netstat -ano | Select-String ':3080\s+.*LISTENING' | Select-Object -First 1
    if ($line) {
        $owner = ($line.ToString().Trim() -split '\s+')[-1]
        if ($owner -match '^\d+$') { return [int]$owner }
    }
    # 2) Get-NetTCPConnection 兜底
    $conn = Get-NetTCPConnection -LocalPort 3080 -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($conn) { return [int]$conn.OwningProcess }
    return $null
}

function Test-WebAlive {
    try {
        Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 3 | Out-Null
        return $true
    } catch {
        return $false
    }
}
```
启动逻辑：
- 端口 3080 无监听 → 正常启动新实例；
- 端口 3080 有监听 + 页面通 → 直接开浏览器（不重复启动）；
- 端口 3080 有监听 + 页面不通 → 占用者是 node → 杀掉残留进程后重启；不是 node → 报错提示，绝不误杀。

安全边界：只有占用进程名为 `node` 才允许自动清理；其他程序占用 3080 时只抛错并提示人工处理。

## 环境特例 / 反例
- 沙箱复现出现 junction `EPERM` ≠ 真实环境问题，是权限假象；
- 端口 8900 的 node（PID 9400）与 Harness 无关，未处理；
- 真实 DEEPSEEK_API_KEY 不写入文档，用环境变量引用；
- 用户配置与安装目录分离：`.dsh` 数据目录（settings、profiles、presets、sessions）不被升级覆盖，所以视觉模型配置、cordis-memory 修复、aurora-glass 主题都还在；升级后优先检查它们是否完好，而不是重配。

## 经验教训（Checklist）
1. 升级/替换安装目录前，先停掉正在运行的旧后端，否则旧进程占端口、页面依赖的旧文件消失，形成"半死状态"。
2. 端口检测别只用 `Get-NetTCPConnection`，`netstat -ano` 更可靠；重要脚本两者双保险。
3. "打不开"优先查三层：进程在不在 → 端口监听在不在 → 页面 HTTP 通不通。逐层排除，不要直接重装。
4. 启动失败先看真实报错：手动前台跑一次启动命令抓 stderr，比猜原因快；区分沙箱与真实环境差异。
5. 残留进程清理前确认身份（端口 + 启动时间 + 进程名），避免误杀其他服务。
6. 配置与安装目录分离，升级后先检查 `.dsh` 配置完好，而不是重配。

## 参考
- 原始故障复盘：`C:\Users\Administrator\Desktop\Harness_自升级打不开_诊断修复_给Harness_20260822.md`
- 启动脚本：`C:\Users\Administrator\Desktop\start-harness.ps1`
