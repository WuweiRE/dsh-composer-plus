<h1 align="center">dsh-composer-plus</h1>

<p align="center">One plugin, three things: <b>model picker</b> + <b>draggable reasoning-effort rail</b> + <b>DeepSeek account hider</b>.</p>

<p align="center"><img src="docs/composer-light.png" alt="composer-plus in the light theme" width="728"></p>

<p align="center"><a href="README.zh.md">中文</a> | English</p>

## What it is

`dsh-composer-plus` is a pure front-end plugin for the [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) (dsh) **web client**. It folds the composer's right-hand controls into one pill:

| Feature | What it does |
| --- | --- |
| **Model picker** | Click the model name to get a provider-grouped list (no submenu). A pick applies immediately. |
| **Effort rail (drag bar)** | A notched slider: click, drag, or use `←`/`→`/`Home`/`End`. Levels come from each model's own `reasoningEfforts`; the top level gets a gradient sweep and halo. |
| **Hide DeepSeek account** | The bundle patch disables the official account entry (sidebar account menu, account settings page, credential onboarding), and the custom model menu filters the `deepseek-account` channel. |
| **Theme-aware** | Every color binds to `--dsw-alias-*` theme variables, so light/dark and third-party skins stay readable. |
| **Zero intrusion** | A modular bundle: no core changes, nothing written outside the profile, clean removal. |

<p align="center"><img src="docs/composer-dark.png" alt="Dark theme" width="728"></p>
<p align="center"><img src="docs/model-menu.png" alt="Model list" width="734"></p>

## Compatibility

- dsh **0.1.5+** (the `ctx.modelDirectories` / `session/selectModel` generation) and a **web client** (`dsh web`, or the web UI inside the desktop app).
- End-to-end tested on dsh **0.1.7-rc.2**: model switching, drag + keyboard effort changes, light/dark themes, no account entry in Settings.
- The rail only appears for models that declare reasoning levels; other models show the picker alone.
- The plugin draws into the composer's `conversation.input.right` seat and tucks the native model trigger away. If a future dsh changes the composer DOM and the native trigger is not hidden, please open an issue.

## Install

### Web profile (`dsh web`)

```sh
# straight from GitHub — no npm account needed
dsh plugin --profile web add github:WuweiRE/dsh-composer-plus
```

Or clone and install the local directory:

```sh
git clone https://github.com/WuweiRE/dsh-composer-plus.git
dsh plugin --profile web add ./dsh-composer-plus
```

Restart `dsh web` (or `dsh --profile web`) once and refresh the page. Later client-only updates usually need just a refresh.

### Desktop app

The desktop profile is managed by the Electron app (`dsh plugin --profile desktop` is refused). Install this bundle from the app's **Plugins** page (GitHub repo or a local directory), then restart the app. If your build has no such entry, validate on a web profile first and point the app at that profile.

> The plugin participates in profile composition, so install/remove needs one app restart; CSS/client-only changes only need a refresh.

## Configuration

Both switches are on by default and live in the bundle's own `cordis.patch.yml`:

```yaml
- insert:
    - id: ui-composer-plus
      name: dsh-composer-plus
      config:
        hideAccount: true        # account menu / account settings page / credential onboarding + leftover rows
        hideAccountModels: true  # filter the deepseek-account channel from the custom model menu
```

To bring the official account UI back, override the row in **your profile's `cordis.patch.yml`** and delete these two patches, which are what actually close the account page:

```yaml
- id: ui-settings-account
  disabled: true
- id: ui-settings-models
  name: '@deepseek-ai/dsh-client-ui-settings-models'
  config:
    credentialOnboarding: false
```

## Uninstall

```sh
dsh plugin --profile web remove dsh-composer-plus
```

Then restart `dsh web` / the app. The plugin stores no runtime data; the last selected effort stays in dsh's own session state.

## Layout

```text
dsh-composer-plus/
├─ package.json          # bundle + web client manifest (immediately / inject)
├─ cordis.patch.yml      # account hider patches + plugin row
├─ lib/index.js          # host half: publishes options as window.__DSH_COMPOSER_PLUS__
├─ lib/client.js         # browser half: pill, model menu, rail, account-row hider
├─ locale/{zh,en}.json   # plugin-manager title/description
├─ icon.svg              # plugin icon
└─ docs/*.png            # README screenshots
```

There is no build step: `lib/client.js` is a browser-executed `window.__ModuleLoader__.load({...})` factory and React comes from the dsh module table.

## Known limits

- Account hiding is **patch-layer disable + client-side fallback**: another plugin that re-adds account UI can override it; disable that plugin first.
- The account-model filter only affects this plugin's menu; the native `/model` popup is still dsh's (use it to pick an account model temporarily).
- Web client only; headless/TUI profiles never render the composer.

## License

[MIT](./LICENSE). Third-party credits: [THIRD_PARTY_NOTICES.md](./THIRD_PARTY_NOTICES.md).
