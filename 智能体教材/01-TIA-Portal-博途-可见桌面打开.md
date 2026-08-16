# 01｜TIA Portal 博途：把 GUI 打开到用户可见桌面

> 场景：TIA_Portal_Openness_MCP 生成工程后，需要让用户亲眼看到博途界面。
> 结论：agent 环境启动的 GUI 默认落到**隐藏桌面**，必须用计划任务交互模式 `/it` 投到用户可见桌面。

## 背景
- 目标：生成 PLC 工程（S7-1200 + FB + 变量表，编译 0 错），并在博途 V20 GUI 中打开给用户看。
- 现象：工程生成成功（0 错 0 警告），但博途"打不开"——`Siemens.Automation.Portal.exe` 进程活着，却始终没有窗口，用户看不到任何界面。

## 根因（关键）
- Codex / DeepSeek Harness 这类 agent 的 shell 跑在**隐藏桌面**（实测桌面名 `CodexSandboxDesktop-xxxx`）。
- 从隐藏桌面用 `Start-Process` 或 Openness `new TiaPortal(WithUserInterface)` 启动的 GUI 全部开到隐藏桌面 → 用户屏幕上看不到。
- **不是博途的问题，是启动环境的问题。** 诊断口诀：GUI 进程活着但无窗口 → 先怀疑桌面/窗口站，别去查 Defender、权限、软件本身。

## 错误做法（实测踩坑）
1. `Start-Process Siemens.Automation.Portal.exe "<工程>.ap20"` → 进程很快退出或无窗口。
2. C# 客户端 `new TiaPortal(TiaPortalMode.WithUserInterface)` + 打开工程 → 窗口出现在隐藏桌面；且客户端用 15 分钟 Sleep 挂住没有自愈，客户端一退出，TIA 被连带关闭。

## 正确做法（已验证）
用一次性交互式计划任务把 GUI 投到可见桌面：

```powershell
# 1) 清掉旧博途进程（避免单实例占用）
Stop-Process -Name 'Siemens.Automation.Portal' -Force -ErrorAction SilentlyContinue

# 2) 建一次性交互任务（/it = 登录用户可见桌面），立即执行，用完即删
$tr = '"C:\Program Files\Siemens\Automation\Portal V20\Bin\Siemens.Automation.Portal.exe" "D:\...\工程\工程.ap20"'
schtasks /create /tn "OpenTIA_x" /tr $tr /sc once /st 23:59 /it /f
schtasks /run /tn "OpenTIA_x"
schtasks /query /tn "OpenTIA_x" /v /fo list | Select-String 'Status|Last Run Time|Last Result'  # 267009 = 0x41301 = Running
schtasks /delete /tn "OpenTIA_x" /f
```

- 判定成功：任务状态 Running（Last Result = 267009 = SCHED_S_TASK_RUNNING）；出现新的 `Siemens.Automation.Portal.exe`；窗口标题变成工程路径；用户能亲眼看到。
- 该方式启动的博途**不依赖任何客户端存活**，比"客户端挂住"健壮。

## 环境特例（DSH 沙箱）
- DSH 文件沙箱（workspace-write）会拦 `schtasks.exe`（报"拒绝访问 / 找不到路径"）。
- 解决办法：给该命令加 `sandbox_permissions=danger-full-access` 重试一次即可。

## 配套坑位
- MCP 的 `OpenProject` 在已有 Openness 拉起实例时可能**另起一个隐藏实例**，可见实例仍停在开始页。正确顺序：先 `schtasks /it` 打开工程 → 再让 MCP `Connect` 挂接已打开实例（自动绑定有工程的实例）。
- SCL 外部源必须 **UTF-8 带 BOM**（EF BB BF），否则博途导入报语法错。验证：读文件头 3 字节 = `EF BB BF`。
- headless 生成默认 `WithoutUserInterface`，别指望生成过程弹窗；要给人看，生成完单独开 GUI。
- TIA V20 必须用 V20 版 `TiaMcpServer.exe`（如 `D:\ai\TIA\TIA_Portal_Openness_MCP-master\tools\tiaportal-mcp\src\TiaMcpServer\bin-v20\Debug\net48\`）；桌面源码包可能是 V21 运行时，会不兼容。

## 参考
- Codex 完整教程：`C:\Users\Administrator\Desktop\TIA_MCP_操作教程_DeepSeekHarness_20260816.md`
- durable-memory 技能：`C:\Users\Administrator\.dsh\.agent-presets\cordis-memory\skills\durable-memory\SKILL.md`
- 已生成工程：`D:\DeepSeek Harness\TIA_Projects\PLC_Basic_Test`（FB_Test + TagTable_Test，编译 0 错）
