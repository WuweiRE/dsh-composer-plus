/**
 * dsh-composer-plus — host half.
 *
 * The feature set is browser-side (lib/client.js). This half only:
 *   1. validates the optional row config into safe defaults, and
 *   2. publishes those options to the page as window.__DSH_COMPOSER_PLUS__
 *      before browser plugins activate (the same bootstrap channel the
 *      official account plugin uses for its public options).
 *
 * Options (all optional, see cordis.patch.yml):
 *   hideAccount        (default true)  keep account menus / account rows out of the UI
 *   hideAccountModels  (default true)  filter the DeepSeek account channel from our model menu
 *
 * @param ctx - host cordis context
 * @param config - row config from cordis.patch.yml, already resolved by the Loader
 */
export const name = "dsh-composer-plus";

/** Public option shape shared with the browser half. */
const DEFAULTS = {
  hideAccount: true,
  hideAccountModels: true
};

/** Normalize one boolean option; anything that is not a boolean keeps the default. */
function booleanOption(value, fallback) {
  return typeof value === "boolean" ? value : fallback;
}

export function apply(ctx, config) {
  const options = {
    hideAccount: booleanOption(config && config.hideAccount, DEFAULTS.hideAccount),
    hideAccountModels: booleanOption(config && config.hideAccountModels, DEFAULTS.hideAccountModels)
  };
  try {
    ctx.on("webserver/index-inject", (table) => {
      table.push({ kind: "global", name: "__DSH_COMPOSER_PLUS__", value: options });
    });
  } catch (error) {
    // Non-web profiles (headless/TUI) simply never publish the global; the
    // browser half then falls back to the same defaults on its own.
    try { ctx.logger?.debug?.("[composer-plus] no webserver index-inject channel"); } catch (ignored) {}
  }
}
