# 04｜阿里云 ECS 密钥绑定失败：SSH 一直 Permission denied 的排查与修复

> 场景：新买阿里云 ECS（99 元经济型 e 实例），控制台"绑定密钥对"显示成功并重启，但本地 `ssh` 始终 `Permission denied (publickey)`。
> 结论：**公钥匹配成功 ≠ 登录成功**。最隐蔽的坑是本地私钥被误加了 passphrase（生成参数写错），导致"服务器接受公钥、客户端签名失败"。诊断必须看 `ssh -v` 输出中"Server accepts key"之后的环节。

## 背景
- 环境：阿里云 ECS（Ubuntu 24.04.4 LTS，杭州），控制台创建/导入密钥对 `ecrrain-ecs` 并绑定实例，强制重启。
- 现象：
  - 22 端口通（`Test-NetConnection` 显示 TcpTestSucceeded=True）
  - 控制台显示密钥对已绑定、指纹正常
  - `ssh -i key root@IP` 永远 `Permission denied (publickey)`
  - 但阿里云 Workbench（网页终端）能正常登录 root

## 根因（关键）
**本地私钥被加密了。** 生成密钥时执行了：

```powershell
ssh-keygen -t rsa -b 2048 -f ecrrain_ecs -N '""' -C "ecrrain-ecs"
```

PowerShell 把 `'""'` 当作**字面两字符 `""`** 传给 `-N`，于是私钥带上了 passphrase（`""`），文件头部出现 `aes256-ctr` 加密标记。

SSH 认证链路：
1. 客户端发送公钥 → 服务器在 `authorized_keys` 中找到匹配 → 输出 `Server accepts key` ✅
2. 客户端需要用**私钥签名** → 私钥被加密且 `BatchMode` 禁止输入密码 → 签名失败 ❌
3. 最终结果：`Permission denied (publickey)` —— 看起来像"密钥没绑上"，其实是"私钥用不了"。

## 错误做法（实测踩坑）
1. 反复在控制台"解绑→绑定→重启" → 无用，问题根本不在服务器端。
2. 怀疑 authorized_keys 权限：反复 `chmod 700 /root/.ssh`、`chmod 600 authorized_keys` → 权限本来就对，无用。
3. 怀疑 sshd 配置：查 `PermitRootLogin`、`PubkeyAuthentication` → 都是 yes，无用。
4. 反复删除重绑密钥对 → 无用。

## 正确做法（已验证）

### 第一步：诊断要看 ssh -v
```powershell
ssh -i key -v -o BatchMode=yes root@IP "echo ok"
```
关键行：
```
debug1: Offering public key: ... RSA SHA256:xxx
debug1: Server accepts key: ... RSA SHA256:xxx   ← 公钥匹配成功
root@IP: Permission denied (publickey)           ← 但签名失败
```
看到"accepts key"后仍然 denied → **不是公钥问题，是私钥/签名问题**。

### 第二步：确认私钥是否加密
```powershell
# 查看私钥文件头部
Get-Content key -TotalCount 2
# 第 2 行 base64 解码后含 aes256-ctr = 私钥被加密
# 正常无密码私钥解码后是 "openssh-key-v1...none..."

# 也可以直接试：
ssh-keygen -y -f key   # 加密私钥会卡住等密码，无密码私钥直接输出公钥
```

### 第三步：解锁私钥（无密码化）
```powershell
# 先复制到临时文件并设置仅当前用户权限（ssh-keygen 会检查权限）
Copy-Item key $env:TEMP\key_unlocked -Force
icacls $env:TEMP\key_unlocked /inheritance:r /grant:r "$env:USERNAME:(R,W)"

# 用旧 passphrase 解掉密码（这里旧密码就是字面 ""）
ssh-keygen -p -f $env:TEMP\key_unlocked -P '""' -N ""

# 放回（注意目标文件权限别设成只读，否则覆盖失败）
Copy-Item $env:TEMP\key_unlocked <原路径> -Force
```

### 第四步：重新连接
```powershell
ssh -i <无密码私钥> root@IP "whoami"   # 输出 root = 成功
```

## 验证标准
- `ssh -i key root@IP "whoami"` 输出 `root`，退出码 0。
- `ssh -v` 中看到 `Authenticated to ...` 字样。
- 私钥第 2 行 base64 解码含 `none`（无加密）。

## 环境特例 / 反例
- **阿里云 ECS 有 AuthorizedKeysCommand**（`/usr/bin/ecs config instance connect`），Workbench 登录走的是这条通道，**不代表** SSH 公钥登录已就绪——不要被"Workbench 能进"迷惑。
- Windows OpenSSH 对私钥权限严格：`icacls` 需清继承、仅当前用户可读，否则报 `UNPROTECTED PRIVATE KEY FILE`。
- 私钥文件所有者必须是当前 SSH 用户：`takeown /F key` 可修复"owned by sandbox user"问题。
- PowerShell 传参陷阱：`-N '""'` 不是空密码，正确写法是 `-N ""`（不加引号传空字符串）或干脆省略 `-N`。

## 参考
- 服务器：ECS 121.40.223.43（i-bp1i4wctmjyz81ntlbcr），密钥：`C:\Users\Administrator\Desktop\ecrrain-home\keys\ecrrain_ecs_nopass`
- 流程规范：桌面 `验证上生产流程.md`
- 诊断命令记录：桌面 `ECS诊断命令*.txt`（权限、sshd 配置、auth.log、生效配置四轮排查）
