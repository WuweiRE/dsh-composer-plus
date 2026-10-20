<h1 align="center">dsh-composer-plus</h1>

<p align="center">一个插件，四件事：<b>模型选择</b> + <b>可拖动思考强度条</b> + <b>隐藏 DeepSeek 账号</b> + <b>文件右键动作</b>。</p>

<p align="center"><img src="docs/composer-light.png" alt="composer-plus 在浅色主题下的样子" width="728"></p>

<p align="center">中文 | <a href="README.md">English</a></p>

## 这是什么

`dsh-composer-plus` 是给 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness)（dsh）**web 客户端**用的纯前端插件。它把输入框右侧原本分散的交互收进一枚胶囊里：

| 能力 | 说明 |
| --- | --- |
| **模型选择** | 点模型名直接展开按厂商分组的模型列表（不再跳子菜单），选中立即生效。 |
| **拖动栏（思考强度）** | 带刻度点的滑杆，可点击、可拖动、可键盘 `←`/`→`/`Home`/`End`；档位来自模型自己声明的 `reasoningEfforts`，最高档有渐变流光与光晕。 |
| **隐藏 DS 账号** | 插件自带的 patch 层关闭官方账号入口（侧栏账号菜单、设置里的账号页、凭证引导），自绘的模型菜单也会过滤 `deepseek-account` 渠道的模型。 |
| **文件右键菜单** | 对会话里的文件改动卡片、交付文件卡片、右侧栏文件树的行，以及 markdown 里渲染出来的路径链接点右键：选择「在侧边栏打开」或「在 Finder 中显示」（Windows / Linux 为资源管理器 / 文件管理器）。 |
| **跟随主题** | 颜色全部绑定 `--dsw-alias-*` 主题变量，深浅色、第三方主题皮肤下都能读。 |
| **零侵入** | 100% 模块化 bundle：不改 dsh 核心、不写 profile 之外的目录、卸载即恢复。 |

文件右键菜单复用 DSH 已有的能力：预览点击、`shell.overlay` / `Menu` / `Toast` 原语，以及 Session Remote 的 `openWorkspacePath({ action: 'reveal' })`（macOS 上由宿主执行 `open -R`），没有新增 host 路由。

<p align="center"><img src="docs/composer-dark.png" alt="深色主题" width="728"></p>
<p align="center"><img src="docs/model-menu.png" alt="模型列表" width="734"></p>

## 兼容性

- 需要 dsh **0.1.5 及以上**（使用 `ctx.modelDirectories` / `session/selectModel` 这代接口），并且是 **web 客户端**（`dsh web` 或桌面版内置的 web 界面）。
- 已在 dsh **0.2.1-rc.2** 上完成端到端实测（模型切换、拖动/键盘调档、深浅主题、设置页无账号入口、文件右键菜单）。
- 只有模型声明了思考强度档位时才会出现滑杆；没有档位的模型只显示模型选择器。
- 插件通过 composer 的 `conversation.input.right` 席位绘制胶囊，并把原生模型触发器收起来。若未来 dsh 改了 composer 的 DOM 结构导致原生触发器没被收起，请提 issue。
- 文件右键菜单识别 DSH 的 DOM 契约（`data-changed-files`、`data-presented-file`、`data-files-path/entry`，以及带 `title` 的路径链接按钮）。dsh 大版本升级若改了这些标记，菜单会安静地不出现而不是误伤其它右键。

## 安装

### Web profile（`dsh web`）

```sh
# 直接从 GitHub 安装（不需要 npm 账号）
dsh plugin --profile web add github:WuweiRE/dsh-composer-plus
```

或者先 clone 再装本地目录：

```sh
git clone https://github.com/WuweiRE/dsh-composer-plus.git
dsh plugin --profile web add ./dsh-composer-plus
```

装完重启一次 `dsh web`（或 `dsh --profile web`）并刷新页面。之后纯前端更新通常只要刷新页面。

### 桌面版（DeepSeek Harness App）

桌面版的 profile 由 App 自己管理（`dsh plugin --profile desktop` 会被拒绝），请用 App 侧边栏的 **插件** 页安装这个 bundle（从 GitHub 仓库或本地目录），然后重启 App。若你的 App 版本没有该入口，请先按上面的 web profile 方式验证，再在 App 的设置里指向同一个 profile。

> 注意：插件参与 profile 组合，安装/卸载后需要重启一次 App；只改 CSS/客户端代码时刷新页面即可。

## 配置

三个开关默认都打开，写在插件自带的 `cordis.patch.yml` 里：

```yaml
- insert:
    - id: ui-composer-plus
      name: dsh-composer-plus
      config:
        hideAccount: true        # 关闭账号菜单 / 账号设置页 / 凭证引导 + 设置页残留行
        hideAccountModels: true  # 自绘模型菜单里过滤 deepseek-account 渠道的模型
        fileActions: true         # 文件 / 路径链接的右键菜单（在侧边栏打开 / 在 Finder 中显示）
```

要临时恢复官方账号 UI：在 **你 profile 的 `cordis.patch.yml`** 里覆盖同一行并去掉/置 false 对应开关；账号页本身由下面两条 patch 关闭，删掉它们即可恢复：

```yaml
- id: ui-settings-account
  disabled: true
- id: ui-settings-models
  name: '@deepseek-ai/dsh-client-ui-settings-models'
  config:
    credentialOnboarding: false
```

## 卸载

```sh
dsh plugin --profile web remove dsh-composer-plus
```

然后重启 `dsh web` / App。插件不写任何运行期数据；思考强度沿用 dsh 自己的会话选择，卸载后仍是最后一次选中的档位。

## 目录结构

```text
dsh-composer-plus/
├─ package.json          # bundle + web client 声明（immediately / inject）
├─ cordis.patch.yml      # 隐藏账号 + 插入插件行
├─ lib/index.js          # host 半侧：把开关注入 window.__DSH_COMPOSER_PLUS__
├─ lib/client.js         # 浏览器半侧：胶囊、模型菜单、滑杆、账号行隐藏、文件右键菜单
├─ locale/{zh,en}.json   # 插件管理页显示的标题/描述
├─ icon.svg              # 插件图标
├─ test/context-menu.smoke.mjs  # 文件右键菜单的 Node 冒烟测试（npm test）
└─ docs/*.png            # README 截图
```

没有构建步骤：`lib/client.js` 是浏览器直接执行的 `window.__ModuleLoader__.load({...})` 工厂，React 从 dsh 基座表取。

## 已知限制

- 隐藏账号用的是 **patch 层禁用 + 客户端兜底**：如果你同时装了别的修改账号 UI 的插件，可能互相覆盖，先禁用对方再试。
- 账号模型过滤只作用于本插件的模型菜单；原生 `/model` 弹窗仍由 dsh 控制（可用它临时选账号模型）。
- 只支持 web 客户端；headless / TUI profile 不会渲染输入框。
- 文件右键菜单只能作用于 ui 已渲染的文件元素；对话正文里既不是链接也不是文件卡片的纯文本路径不会弹菜单。

## 许可证

[MIT](./LICENSE)。第三方致谢见 [THIRD_PARTY_NOTICES.md](./THIRD_PARTY_NOTICES.md)。
