/*!
 * dsh-composer-plus — browser half.
 *
 * One client bundle that gives the DeepSeek Harness composer three things:
 *   1. a direct model picker (no submenu; the account channel can be filtered out)
 *   2. a notched, draggable reasoning-effort rail (drag / click / arrow keys)
 *   3. a DeepSeek-account hider: account rows and any leftover account chrome
 *      are marked with data-composer-plus-hidden and removed from the layout
 *
 * The host half ships the same options as window.__DSH_COMPOSER_PLUS__.
 * MIT licensed; see THIRD_PARTY_NOTICES.md for the upstream UX inspiration.
 */
window.__ModuleLoader__.load({
  id: "dsh-composer-plus",
  factory: (require) => {
    var module = { exports: {} };
    var exports = module.exports;
    Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
    const React = require("react");

    /** Locale namespace owned by this plugin. */
    const NS = "composer-plus";
    /** Plugin-owned copy: zh is the key-set source of truth, en mirrors it. */
    const DICTS = {
      zh: {
        "model.aria": "选择模型，当前 {model}",
        "model.loading": "正在加载模型…",
        "model.empty": "没有可用的模型。",
        "model.hiddenGroup": "已在插件中隐藏",
        "slider.help": "拖动以调整推理强度",
        "slider.aria": "推理强度 {effort}"
      },
      en: {
        "model.aria": "Select model, current {model}",
        "model.loading": "Loading models…",
        "model.empty": "No models available.",
        "model.hiddenGroup": "Hidden by the plugin",
        "slider.help": "Drag to adjust reasoning effort",
        "slider.aria": "Effort {effort}"
      }
    };

    /** Options injected by the host half; every field has a safe default. */
    const OPTIONS = Object.assign(
      { hideAccount: true, hideAccountModels: true },
      (typeof window !== "undefined" && window.__DSH_COMPOSER_PLUS__) || {}
    );

    /** Same accent source as the send button, so themes recolor the pill too. */
    const ACCENT = "var(--dsw-alias-button-info-fill, var(--dsw-alias-brand-primary, #6b8afd))";
    const ACCENT_HOVER = "var(--dsw-alias-button-info-hover, var(--dsw-alias-brand-primary, #5b7cfa))";

    /** Provider id of the official DeepSeek account channel (not the API-key one). */
    const ACCOUNT_PROVIDER_PREFIX = "deepseek-account";

    /** True for a model-directory group that belongs to the DeepSeek account channel. */
    function isAccountGroup(group) {
      if (!group || typeof group.id !== "string") return false;
      const id = group.id.toLowerCase();
      return id === ACCOUNT_PROVIDER_PREFIX || id.indexOf(ACCOUNT_PROVIDER_PREFIX + "-") === 0 || id.indexOf("account") === 0;
    }

    /** The live options object, re-read on every render so a host update is visible. */
    function options() {
      try {
        return Object.assign({}, OPTIONS, window.__DSH_COMPOSER_PLUS__ || {});
      } catch (e) {
        return OPTIONS;
      }
    }

    /** Text values that identify a settings row as the DeepSeek account entry. */
    const ACCOUNT_ROW_TEXTS = ["账号", "账户", "account", "deepseek 账号", "deepseek 账户", "deepseek account", "deepseek 账号（account）"];
    /** True when the trimmed text looks like an account settings row. */
    function isAccountRowText(text) {
      const value = String(text == null ? "" : text).trim().toLowerCase();
      if (value.length === 0 || value.length > 32) return false;
      return ACCOUNT_ROW_TEXTS.indexOf(value) !== -1;
    }

    /** Element attribute that removes an account row from the layout. */
    const HIDDEN_ATTR = "data-composer-plus-hidden";

    //#region styles
    const CSS_TRACK = ".cp-track{position:absolute;left:9px;right:9px;top:50%;transform:translateY(-50%);height:4px;border-radius:999px;background:color-mix(in srgb,var(--dsw-alias-label-primary) 13%,transparent);}";
    const CSS_FILL = ".cp-fill{position:absolute;left:9px;top:50%;transform:translateY(-50%);height:4px;border-radius:999px;background:" + ACCENT + ";transition:width .15s ease-out;pointer-events:none;}";
    const CSS_DOTS = ".cp-dots{display:flex;justify-content:space-between;align-items:center;width:100%;padding:0 8px;position:relative;z-index:1;pointer-events:none;}";
    const CSS_DOT = ".cp-dot{width:2px;height:9px;border-radius:1px;flex:none;background:color-mix(in srgb,var(--dsw-alias-label-primary) 30%,transparent);transition:background .12s ease,height .12s ease;}";
    const CSS_DOT_PASSED = ".cp-dotPassed{background:color-mix(in srgb," + ACCENT + " 55%,transparent);}";
    const CSS_DOT_ACTIVE = ".cp-dotActive{height:10px;background:" + ACCENT + ";}";
    const CSS_THUMB = ".cp-thumb{position:absolute;top:50%;width:18px;height:18px;margin-top:-9px;margin-left:-9px;transition:left .16s cubic-bezier(.3,1.35,.45,1);will-change:left;}";
    const CSS_THUMB_CIRCLE = "[data-composer-card] .cp-thumb svg{display:block;filter:drop-shadow(0 1px 2px rgba(17,17,32,.28));}[data-composer-card] .cp-thumb circle{fill:var(--dsw-specific-menu,#fff);stroke:var(--dsw-alias-border-l2);stroke-width:1px;r:7px;transition:r .15s ease,stroke .15s ease;}";
    const CSS_THUMB_HOVER = "[data-composer-card] .cp-slider:hover .cp-thumb circle,[data-composer-card] .cp-slider:active .cp-thumb circle{stroke:" + ACCENT + ";r:8px;}";
    const CSS_MAX = "[data-composer-card] .cp-max .cp-fill{background:linear-gradient(90deg,#7c6bff 0%," + ACCENT + " 72%," + ACCENT + " 100%);background-size:220% 100%;animation:cp-sweep 3.4s ease-in-out infinite alternate;}[data-composer-card] .cp-max .cp-thumb{animation:cp-halo 2.6s ease-in-out infinite;}[data-composer-card] .cp-max .cp-thumb circle{stroke:" + ACCENT + ";}[data-composer-card] .cp-max .cp-value{color:" + ACCENT + ";}";
    const CSS_KEYFRAMES = "@keyframes cp-sweep{to{background-position:100% 0;}}@keyframes cp-halo{0%,100%{filter:drop-shadow(0 0 1.5px " + ACCENT + ");}50%{filter:drop-shadow(0 0 5px " + ACCENT + ");}}";
    const CSS_ACCOUNT = "[" + HIDDEN_ATTR + "]{display:none!important;}";
    const CSS_STATIC = [
      "[data-composer-card].cp-active .cp-trailing{gap:8px!important;}",
      ".cp-shipped-hidden{display:none!important;}",
      ".cp-pill{position:relative;display:flex;align-items:center;min-height:36px;max-width:100%;border:1px solid var(--dsw-alias-border-l2);border-radius:999px;background:transparent;font-family:inherit;padding:3px 12px 3px 4px;box-sizing:border-box;}",
      ".cp-model-btn{display:flex;align-items:center;gap:4px;max-width:220px;height:30px;padding:0 8px;background:transparent;border:none;border-radius:999px;cursor:pointer;outline:none;flex:none;color:var(--dsw-alias-label-primary);font-size:13px;font-weight:500;line-height:20px;}",
      ".cp-model-btn:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover);}",
      ".cp-model-btn:focus-visible{box-shadow:0 0 0 2px var(--dsw-alias-border-l3,#c4b5fd);}",
      ".cp-model-btn:disabled{cursor:default;opacity:.6;}",
      ".cp-model-label{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;min-width:0;}",
      ".cp-chevron{color:var(--dsw-alias-label-caption);flex:none;display:inline-flex;transition:transform .12s;}",
      ".cp-chevron.open{transform:rotate(180deg);}",
      ".cp-sep{width:1px;align-self:stretch;margin:8px 10px;background:var(--dsw-alias-border-l1);flex:none;}",
      ".cp-menu{position:absolute;bottom:calc(100% + 8px);left:0;z-index:20;background:var(--dsw-specific-menu);box-shadow:var(--dsw-elevation-prominent);min-width:240px;max-width:min(340px,90vw);max-height:min(320px,60vh);overflow-y:auto;border-radius:20px;padding:4px;color:var(--dsw-alias-label-primary);}",
      ".cp-status{color:var(--dsw-alias-label-tertiary);padding:10px;font-size:13px;line-height:20px;}",
      ".cp-group{padding:2px 0 4px;}",
      ".cp-grouptitle{color:var(--dsw-alias-label-tertiary);font-size:11px;line-height:16px;font-weight:500;padding:6px 10px 2px;}",
      ".cp-opt{display:flex;align-items:center;gap:8px;width:100%;text-align:left;cursor:pointer;background:transparent;border:none;border-radius:12px;padding:7px 10px;color:var(--dsw-alias-label-primary);font-size:13px;line-height:20px;}",
      ".cp-opt:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover);}",
      ".cp-opt:disabled{cursor:default;opacity:.6;}",
      ".cp-optname{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}",
      ".cp-check{color:" + ACCENT + ";flex:none;font-weight:700;}",
      ".cp-root{display:flex;flex-direction:row;align-items:center;gap:10px;width:208px;min-width:208px;max-width:208px;font-family:inherit;}",
      ".cp-slider{position:relative;flex:1;height:22px;display:flex;align-items:center;cursor:pointer;outline:none;border-radius:999px;min-width:0;touch-action:none;}",
      ".cp-slider:focus-visible{box-shadow:0 0 0 2px var(--dsw-alias-border-l3,#c4b5fd);}",
      // The value column is a 1x1 grid holding every level name stacked in the same
      // cell, so its width is the widest name of the current model and never changes
      // when the active level changes. That keeps the rail length fixed (no jitter).
      ".cp-value{display:grid;grid-template-areas:\"v\";font-size:12px;font-weight:500;color:var(--dsw-alias-label-secondary,var(--dsw-alias-label-caption));white-space:nowrap;}",
      ".cp-value>span{grid-area:v;visibility:hidden;white-space:nowrap;}",
      ".cp-value>span.cp-value-on{visibility:visible;}",
      "@media (prefers-reduced-motion:reduce){[data-composer-card] .cp-max .cp-fill,[data-composer-card] .cp-max .cp-thumb{animation:none;}[data-composer-card] .cp-thumb{transition:none;}}"
    ].join("\n");
    //#endregion

    /** Complete stylesheet, assembled once. */
    const CSS = [CSS_STATIC, CSS_TRACK, CSS_FILL, CSS_DOTS, CSS_DOT, CSS_DOT_PASSED, CSS_DOT_ACTIVE, CSS_THUMB, CSS_THUMB_CIRCLE, CSS_THUMB_HOVER, CSS_MAX, CSS_KEYFRAMES, CSS_ACCOUNT].join("\n");

    /** Insert one stylesheet and return its disposer. */
    function injectCss() {
      const tag = document.createElement("style");
      tag.dataset.plugin = "dsh-composer-plus";
      tag.dataset.pluginCss = "dsh-composer-plus/style.css";
      tag.textContent = CSS;
      document.head.appendChild(tag);
      return () => { try { tag.remove(); } catch (e) {} };
    }

    /** Mark settings-dialog rows that identify as the DeepSeek account entry. */
    function hideAccountRows() {
      let rows;
      try {
        rows = document.querySelectorAll('[role="dialog"] button, [role="dialog"] a, [role="dialog"] [role="tab"], [role="dialog"] [role="menuitem"], [role="dialog"] [role="option"]');
      } catch (e) {
        return;
      }
      for (let i = 0; i < rows.length; i++) {
        const el = rows[i];
        let label = "";
        try { label = el.getAttribute("aria-label") || el.textContent || ""; } catch (e) { continue; }
        if (label.length > 48) continue;
        if (isAccountRowText(label)) {
          try { el.setAttribute(HIDDEN_ATTR, "1"); } catch (e) {}
        }
      }
    }

    /** Keep account chrome hidden while the settings dialog and sidebar re-render. */
    function startAccountHider() {
      if (!options().hideAccount) return () => {};
      let scheduled = false;
      const run = () => {
        if (scheduled) return;
        scheduled = true;
        const flush = () => {
          scheduled = false;
          try {
            if (!document.querySelector('[role="dialog"]')) return;
            hideAccountRows();
          } catch (e) {}
        };
        try { window.requestAnimationFrame(flush); } catch (e) { flush(); }
      };
      run();
      let observer = null;
      try {
        observer = new MutationObserver(run);
        observer.observe(document.body, { childList: true, subtree: true });
      } catch (e) {}
      return () => { try { if (observer) observer.disconnect(); } catch (e) {} };
    }

    /** Selector for the shipped model trigger: a menu button that is not ours. */
    const SHIPPED_MODEL_SEL = 'button[aria-haspopup="menu"]:not([data-cp-model-btn])';

    /** Find the shipped model trigger inside the composer's trailing row. */
    function findNativeModelButton(trailing, modelName) {
      try {
        const buttons = Array.prototype.slice.call(trailing.querySelectorAll(SHIPPED_MODEL_SEL));
        if (modelName) {
          for (let i = 0; i < buttons.length; i++) {
            const button = buttons[i];
            const text = (button.getAttribute("aria-label") || "") + " " + (button.textContent || "");
            if (text.indexOf(modelName) !== -1) return button;
          }
        }
        return buttons.length > 0 ? buttons[0] : null;
      } catch (e) {
        return null;
      }
    }

    /** The trailing row is the nearest ancestor that holds the shipped selector. */
    function findTrailing(card, sliderRoot, modelName) {
      let node = sliderRoot.parentElement;
      while (node && node !== card) {
        try {
          if (findNativeModelButton(node, modelName)) return node;
        } catch (e) {}
        node = node.parentElement;
      }
      return null;
    }

    /** Split the trailing row into the slider wrapper and the shipped model wrapper. */
    function findModelWrap(trailing, sliderRoot, modelName) {
      try {
        const kids = Array.prototype.slice.call(trailing.children);
        const sliderWrap = kids.filter((kid) => { try { return kid.contains(sliderRoot); } catch (e) { return false; } })[0] || null;
        const button = findNativeModelButton(trailing, modelName);
        let modelWrap = null;
        if (button) {
          let node = button;
          while (node && node.parentElement !== trailing) node = node.parentElement;
          if (node && node !== sliderWrap) modelWrap = node;
        }
        return { sliderWrap: sliderWrap, modelWrap: modelWrap };
      } catch (e) {
        return { sliderWrap: null, modelWrap: null };
      }
    }

    /** The context meter (an svg with at least two circles) lives in the trailing row. */
    function findMeterNode(trailing) {
      try {
        const svgs = Array.prototype.slice.call(trailing.querySelectorAll("svg"));
        for (let i = 0; i < svgs.length; i++) {
          if (svgs[i].querySelectorAll("circle").length >= 2) {
            let node = svgs[i];
            while (node && node.parentElement !== trailing) node = node.parentElement;
            return node || svgs[i];
          }
        }
      } catch (e) {}
      return null;
    }

    /** The stats row that receives the moved context meter. */
    function findStatsRoot(card) {
      try {
        const seat = card.closest("[data-composer-seat]") || card.parentElement;
        return (seat || document).querySelector("[data-composer-stats]") || document.querySelector("[data-composer-stats]");
      } catch (e) {
        return null;
      }
    }

    /** Fallback translator when the host did not inject a t seat. */
    function fallbackT(key, params) {
      const table = DICTS.en;
      let text = table[key] || key;
      if (params) {
        Object.keys(params).forEach((name) => {
          text = text.split("{" + name + "}").join(String(params[name]));
        });
      }
      return text;
    }

    /** Render nothing while the seat is inactive, so the inner component keeps a stable hook list. */
    function ComposerPlus(props) {
      const available = props.available;
      const directory = props.directory;
      if (!available) return null;
      if (!directory || typeof directory.subscribe !== "function") return null;
      return React.createElement(ComposerPlusInner, props);
    }

    function ComposerPlusInner(props) {
      const tr = typeof props.t === "function" ? props.t : fallbackT;
      const directory = props.directory;
      const load = props.load;
      const select = props.select;
      const useSync = React.useSyncExternalStore || function (subscribe, getSnapshot) {
        const pair = React.useState(getSnapshot);
        const value = pair[0];
        const setValue = pair[1];
        React.useEffect(function () { return subscribe(function () { setValue(getSnapshot()); }); }, [subscribe, getSnapshot]);
        return value;
      };
      const state = useSync(
        React.useCallback(function (listener) { return directory.subscribe(listener); }, [directory]),
        React.useCallback(function () { return directory.getSnapshot(); }, [directory])
      );
      React.useEffect(function () {
        if (state.status === "idle" || state.status === "loading") {
          try { load(); } catch (e) {}
        }
      }, [state.status]);

      const live = options();
      const groups = (state.groups || []).filter(function (group) {
        return !(live.hideAccountModels && isAccountGroup(group));
      });
      const current = state.current;
      let choice = null;
      let currentModelName = "";
      if (current) {
        for (let gi = 0; gi < groups.length; gi++) {
          const group = groups[gi];
          for (let mi = 0; mi < group.models.length; mi++) {
            const model = group.models[mi];
            if (group.id === current.provider && model.id === current.model) {
              choice = { group: group, model: model };
              currentModelName = model.name || model.id;
              break;
            }
          }
          if (choice) break;
        }
        if (!currentModelName && current.model) currentModelName = String(current.model);
      }
      const reasoning = choice && choice.model && choice.model.reasoning;
      const hasReasoning = !!(reasoning && Array.isArray(reasoning.efforts) && reasoning.efforts.length >= 2);

      const wrapRef = React.useRef(null);
      const trackRef = React.useRef(null);
      const menuRootRef = React.useRef(null);
      const dragIndexPair = React.useState(null);
      const dragIndex = dragIndexPair[0];
      const setDragIndex = dragIndexPair[1];
      const menuPair = React.useState(false);
      const menuOpen = menuPair[0];
      const setMenuOpen = menuPair[1];

      // Tuck the shipped model trigger away and move the context meter into the stats row.
      // Everything is restored on unmount or when the current model has no effort levels.
      React.useEffect(function () {
        if (!hasReasoning) return undefined;
        const sliderRoot = wrapRef.current;
        if (!sliderRoot) return undefined;
        let card = null;
        try { card = sliderRoot.closest("[data-composer-card]"); } catch (e) {}
        if (!card) return undefined;
        let trailing = null;
        let modelWrap = null;
        let meterNode = null;
        let placeholder = null;
        let statsRoot = null;
        let observer = null;
        const restores = [];
        try {
          card.classList.add("cp-active");
          restores.push(function () { try { card.classList.remove("cp-active"); } catch (e) {} });
          trailing = findTrailing(card, sliderRoot, currentModelName);
          if (trailing) {
            trailing.classList.add("cp-trailing");
            restores.push(function () { try { trailing.classList.remove("cp-trailing"); } catch (e) {} });
            const found = findModelWrap(trailing, sliderRoot, currentModelName);
            modelWrap = found.modelWrap;
            if (modelWrap) {
              modelWrap.classList.add("cp-shipped-hidden");
              restores.push(function () { try { modelWrap.classList.remove("cp-shipped-hidden"); } catch (e) {} });
            }
          }
        } catch (e) {}
        const moveMeter = function () {
          try {
            if (!trailing) return;
            if (!statsRoot || !statsRoot.isConnected) statsRoot = findStatsRoot(card);
            if (!statsRoot) return;
            if (!meterNode || !meterNode.isConnected) meterNode = findMeterNode(trailing);
            if (!meterNode) return;
            if (meterNode.parentElement === statsRoot) {
              statsRoot.classList.add("cp-with-meter");
              return;
            }
            if (!placeholder) placeholder = document.createComment("cp-meter");
            if (meterNode.parentElement === trailing && placeholder.parentElement !== trailing) {
              trailing.insertBefore(placeholder, meterNode);
            }
            statsRoot.appendChild(meterNode);
            meterNode.classList.add("cp-meter-moved");
            statsRoot.classList.add("cp-with-meter");
          } catch (e) {}
        };
        moveMeter();
        try {
          observer = new MutationObserver(moveMeter);
          if (trailing) observer.observe(trailing, { childList: true });
          const seat = (card.closest && card.closest("[data-composer-seat]")) || card.parentElement;
          if (seat) observer.observe(seat, { childList: true, subtree: true });
        } catch (e) {}
        return function () {
          try { if (observer) observer.disconnect(); } catch (e) {}
          try {
            if (meterNode) {
              meterNode.classList.remove("cp-meter-moved");
              if (placeholder && placeholder.parentElement === trailing && meterNode.isConnected) {
                trailing.insertBefore(meterNode, placeholder);
              }
            }
            if (placeholder && placeholder.parentElement) placeholder.parentElement.removeChild(placeholder);
          } catch (e) {}
          try {
            const stats = findStatsRoot(card);
            if (stats && !stats.querySelector(".cp-meter-moved")) stats.classList.remove("cp-with-meter");
          } catch (e) {}
          try { restores.forEach(function (fn) { fn(); }); } catch (e) {}
        };
      }, [hasReasoning, currentModelName]);

      // Close the model menu on an outside click or Escape.
      React.useEffect(function () {
        if (!menuOpen) return undefined;
        const onDown = function (event) {
          try {
            if (menuRootRef.current && !menuRootRef.current.contains(event.target)) setMenuOpen(false);
          } catch (e) {}
        };
        const onKey = function (event) { if (event.key === "Escape") setMenuOpen(false); };
        document.addEventListener("mousedown", onDown);
        document.addEventListener("keydown", onKey);
        return function () {
          document.removeEventListener("mousedown", onDown);
          document.removeEventListener("keydown", onKey);
        };
      }, [menuOpen]);

      const effortList = reasoning && Array.isArray(reasoning.efforts) ? reasoning.efforts : [];
      const effectiveEffort = current && (current.reasoningEffort !== undefined ? current.reasoningEffort : reasoning ? reasoning.defaultEffort : undefined);
      let currentIndex = -1;
      if (effectiveEffort !== undefined) {
        for (let i = 0; i < effortList.length; i++) if (effortList[i].id === effectiveEffort) { currentIndex = i; break; }
      }
      if (currentIndex === -1 && effortList.length > 0) {
        const fallback = reasoning && reasoning.defaultEffort !== undefined ? reasoning.defaultEffort : effortList[0] && effortList[0].id;
        for (let i = 0; i < effortList.length; i++) if (effortList[i].id === fallback) { currentIndex = i; break; }
        if (currentIndex === -1) currentIndex = 0;
      }
      if (currentIndex === -1) currentIndex = 0;
      const dragging = dragIndex !== null;
      const displayIndex = dragging ? dragIndex : currentIndex;
      const isMax = effortList.length > 1 && displayIndex === effortList.length - 1;
      const busy = state.status === "selecting" && !dragging;
      const effortLabels = effortList.map(function (effort) { return (effort && (effort.name || effort.id)) || ""; });
      const currentEffortName = effortLabels[currentIndex] || effectiveEffort || "";
      const displayEffortName = effortLabels[displayIndex] || currentEffortName || "";
      React.useEffect(function () { if (!dragging) setDragIndex(null); }, [currentIndex, dragging]);

      const selectEffort = React.useCallback(function (id) {
        if (!current) return;
        if (id === effectiveEffort) return;
        try { select({ provider: current.provider, model: current.model, reasoningEffort: id }); } catch (e) {}
      }, [current, effectiveEffort, select]);
      const chooseModel = React.useCallback(function (provider, model) {
        setMenuOpen(false);
        if (current && current.provider === provider && current.model === model) return;
        try { select({ provider: provider, model: model }); } catch (e) {}
      }, [current, select]);
      const indexFromClientX = React.useCallback(function (clientX) {
        if (effortList.length === 0) return 0;
        const element = trackRef.current;
        if (!element) return currentIndex;
        const rect = element.getBoundingClientRect();
        const inset = 9;
        const usable = rect.width - inset * 2;
        if (usable <= 0) return currentIndex;
        const ratio = Math.max(0, Math.min(1, (clientX - rect.left - inset) / usable));
        return Math.max(0, Math.min(effortList.length - 1, Math.round(ratio * (effortList.length - 1))));
      }, [effortList.length, currentIndex]);
      const handlePointerDown = React.useCallback(function (event) {
        event.preventDefault();
        setDragIndex(indexFromClientX(event.clientX));
        try { event.currentTarget.setPointerCapture(event.pointerId); } catch (e) {}
      }, [indexFromClientX]);
      const handlePointerMove = React.useCallback(function (event) {
        if (dragIndex === null) return;
        if (event.buttons === 0) return;
        const index = indexFromClientX(event.clientX);
        if (index !== dragIndex) setDragIndex(index);
      }, [dragIndex, indexFromClientX]);
      const handlePointerUp = React.useCallback(function (event) {
        if (dragIndex === null) return;
        const index = indexFromClientX(event.clientX);
        const finalIndex = index !== undefined && index !== null ? index : dragIndex;
        setDragIndex(null);
        try { event.currentTarget.releasePointerCapture(event.pointerId); } catch (e) {}
        if (finalIndex !== currentIndex && effortList[finalIndex]) selectEffort(effortList[finalIndex].id);
      }, [dragIndex, currentIndex, effortList, indexFromClientX, selectEffort]);
      const handlePointerCancel = React.useCallback(function (event) {
        setDragIndex(null);
        try { event.currentTarget.releasePointerCapture(event.pointerId); } catch (e) {}
      }, []);
      const onKeyDown = React.useCallback(function (event) {
        if (effortList.length === 0) return;
        if (event.key === "ArrowLeft" || event.key === "ArrowDown") {
          event.preventDefault();
          const next = Math.max(0, currentIndex - 1);
          if (next !== currentIndex) selectEffort(effortList[next].id);
        } else if (event.key === "ArrowRight" || event.key === "ArrowUp") {
          event.preventDefault();
          const next = Math.min(effortList.length - 1, currentIndex + 1);
          if (next !== currentIndex) selectEffort(effortList[next].id);
        } else if (event.key === "Home") {
          event.preventDefault();
          selectEffort(effortList[0].id);
        } else if (event.key === "End") {
          event.preventDefault();
          selectEffort(effortList[effortList.length - 1].id);
        }
      }, [currentIndex, effortList, selectEffort]);

      // Safe to leave the DOM empty now: every hook above already ran.
      if (!hasReasoning) return null;

      const ratio = effortList.length > 1 ? displayIndex / (effortList.length - 1) : 0;
      const thumbLeft = "calc(9px + (100% - 18px) * " + ratio + ")";
      const fillWidth = "calc((100% - 18px) * " + ratio + ")";
      const ariaLabel = safeT(tr, "slider.aria", { effort: displayEffortName }, "Effort " + displayEffortName);
      const help = safeT(tr, "slider.help", null, "Drag to adjust");
      const modelAria = safeT(tr, "model.aria", { model: currentModelName }, "Select model, current " + currentModelName);
      const loadingText = safeT(tr, "model.loading", null, "Loading models…");
      const emptyText = safeT(tr, "model.empty", null, "No models available.");

      const chevron = React.createElement("svg", {
        width: 14, height: 14, viewBox: "0 0 16 16", fill: "none", "aria-hidden": true, className: "cp-chevron" + (menuOpen ? " open" : "")
      }, React.createElement("path", { d: "M4 6l4 4 4-4", stroke: "currentColor", strokeWidth: 1.5, strokeLinecap: "round", strokeLinejoin: "round" }));
      const menu = React.createElement("div", { className: "cp-menu", role: "menu", "aria-label": modelAria },
        groups.length === 0
          ? React.createElement("div", { className: "cp-status" }, state.status === "loading" || state.status === "idle" ? loadingText : emptyText)
          : groups.map(function (group) {
              return React.createElement("div", { className: "cp-group", key: group.id, role: "group", "aria-label": group.name },
                React.createElement("div", { className: "cp-grouptitle" }, group.name || group.id),
                group.models.map(function (model) {
                  const selected = current && current.provider === group.id && current.model === model.id;
                  return React.createElement("button", {
                    key: group.id + "/" + model.id, type: "button", role: "menuitemradio", "aria-checked": selected,
                    className: "cp-opt", title: model.name, onClick: function () { chooseModel(group.id, model.id); }
                  },
                    React.createElement("span", { className: "cp-optname" }, model.name || model.id),
                    selected ? React.createElement("span", { className: "cp-check", "aria-hidden": true }, "✓") : null
                  );
                })
              );
            })
      );
      const dots = React.createElement("div", { className: "cp-dots" }, effortList.map(function (effort, index) {
        return React.createElement("div", {
          key: effort.id,
          className: "cp-dot" + (index === displayIndex ? " cp-dotActive" : "") + (index < displayIndex ? " cp-dotPassed" : ""),
          title: effort.name
        });
      }));
      const slider = React.createElement("div", {
        className: "cp-slider", ref: trackRef, role: "slider",
        "aria-valuenow": displayIndex, "aria-valuemin": 0, "aria-valuemax": effortList.length - 1,
        "aria-valuetext": displayEffortName, "aria-label": ariaLabel, tabIndex: 0,
        onPointerDown: handlePointerDown, onPointerMove: handlePointerMove,
        onPointerUp: handlePointerUp, onPointerCancel: handlePointerCancel, onLostPointerCapture: handlePointerCancel, onKeyDown: onKeyDown
      },
        React.createElement("div", { className: "cp-track" }),
        React.createElement("div", { className: "cp-fill", style: { width: fillWidth } }),
        dots,
        React.createElement("div", { className: "cp-thumb", style: { left: thumbLeft } },
          React.createElement("svg", { width: 18, height: 18, viewBox: "0 0 18 18", "aria-hidden": true },
            React.createElement("circle", { cx: 9, cy: 9, r: 9 })))
      );
      return React.createElement("div", { className: "cp-pill", ref: wrapRef, title: help },
        React.createElement("div", { ref: menuRootRef, style: { display: "contents" } },
          React.createElement("button", {
            type: "button", className: "cp-model-btn", "data-cp-model-btn": "1",
            "aria-label": modelAria, "aria-haspopup": "menu", "aria-expanded": menuOpen, title: currentModelName,
            onClick: function () { try { load(); } catch (e) {} setMenuOpen(function (open) { return !open; }); }
          },
            React.createElement("span", { className: "cp-model-label" }, currentModelName),
            chevron
          ),
          menuOpen ? menu : null
        ),
        React.createElement("div", { className: "cp-sep", "aria-hidden": true }),
        React.createElement("div", { className: "cp-root" + (isMax ? " cp-max" : "") }, slider,
          React.createElement("span", { className: "cp-value", title: displayEffortName },
            effortList.map(function (effort, index) {
              return React.createElement("span", {
                key: effort.id,
                className: index === displayIndex ? "cp-value-on" : "",
                "aria-hidden": index === displayIndex ? undefined : "true"
              }, effortLabels[index]);
            })
          ))
      );
    }

    /** Read one localized string with a fallback when the host has no dictionary. */
    function safeT(t, key, params, fallback) {
      try {
        const value = typeof t === "function" ? t(key, params || {}) : fallback;
        return value === undefined || value === null || value === key ? fallback : value;
      } catch (e) {
        return fallback;
      }
    }

    /**
     * Client plugin body: register copy + styles once, keep the account chrome
     * hidden, then fill the composer's trailing seat with the model + effort pill.
     * @param ctx - client root context carrying the slot registry and model directory
     */
    function apply(ctx) {
      ctx.effect(function () { return ctx.locale.register(NS, DICTS); }, "composer-plus: dictionaries");
      ctx.effect(function () { return injectCss(); }, "composer-plus: styles");
      ctx.effect(function () { return startAccountHider(); }, "composer-plus: account hider");
      const slots = ctx.slots;
      const modelDirectories = ctx.modelDirectories;
      const sessions = ctx.sessions;
      /** Placeholder seat payload used when no session is available. */
      const inactive = {
        available: false,
        directory: {
          getSnapshot: function () { return { current: null, groups: [], status: "idle", error: null }; },
          subscribe: function () { return function () {}; }
        },
        load: function () {},
        select: function () { return Promise.resolve(false); }
      };
      slots.inject("conversation.input.right", function () {
        return slots.register({
          name: "conversation.input.right",
          id: "composer-plus",
          order: -10,
          locale: NS,
          inject: function () {
            let sessionId = null;
            const first = arguments[0];
            if (typeof first === "string" && first) sessionId = first;
            else if (first && typeof first === "object" && first.sessionId) sessionId = first.sessionId;
            if (!sessionId) {
              try { sessionId = sessions.list.getSnapshot().current; } catch (e) {}
            }
            if (!sessionId || typeof sessionId !== "string") return inactive;
            try {
              const directory = modelDirectories.directoryFor(sessionId);
              let available = true;
              try { available = sessions.subagentAddress(sessionId) === undefined; } catch (e) { available = true; }
              return {
                available: available,
                directory: directory.store,
                load: function () { if (available) directory.load().catch(function () {}); },
                select: function (selection) {
                  if (!available) return Promise.resolve(false);
                  return directory.select(selection).then(function () { return true; }, function () { return false; });
                }
              };
            } catch (e) {
              return inactive;
            }
          }
        }, ComposerPlus);
      });
    }


    exports.inject = ["locale", "slots", "modelDirectories", "sessions", "remote", "remote.session"];
    exports.apply = apply;
    return module.exports;
  }
});