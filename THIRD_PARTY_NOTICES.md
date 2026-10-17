# Third-party notices

dsh-composer-plus is MIT licensed. Its composer seat integration, model-directory
usage and slider interaction patterns were adapted from the following MIT-licensed
community plugins, which are excellent references for the dsh client plugin API:

## plugin-effort-slider

- Repository: https://github.com/mrSutivu/plugin-effort-slider
- Copyright (c) 2026 Sutivu
- License: MIT
- Used for: the `conversation.input.right` seat approach, the native model
  trigger tuck-away, the notched effort slider interaction model and the
  model-directory snapshot subscription pattern. The implementation in
  `lib/client.js` is a reworked, original-code variant of those patterns.

## @domitor-syh/dsh-ui-skin-switcher

- Repository: https://github.com/domitor-syh/dsh-ui-skin-switcher
- Copyright (c) 2026 domitor-syh
- License: MIT
- Used for: API/UX reference for the composer model seat and per-model effort
  memory; no source files were copied.

## Design

The "quiet tick rail" look (4px hairline track, 2px tick notches, white bordered
knob, violet-to-accent Max state) comes from the author's earlier private
`effort-slider-skin` prototype and is included here as part of the plugin.

## DSH

DeepSeek Harness itself is MIT licensed:
https://github.com/deepseek-ai/deepseek-harness

MIT license texts of the two community plugins are reproduced in full in their
respective repositories; this notice records attribution for the released code.
