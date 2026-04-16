(function (global) {
  "use strict";

  /**
   * Resolve a selector string or return the element itself.
   * Returns null for missing values.
   */
  function resolveElement(target) {
    if (!target) {
      return null;
    }
    if (typeof target === "string") {
      return document.querySelector(target);
    }
    return target;
  }

  /**
   * Check if a value is a non-empty string after trim.
   */
  function isNonEmptyString(value) {
    return typeof value === "string" && value.trim().length > 0;
  }

  /**
   * Remove trailing slashes from a path-like string.
   */
  function trimTrailingSlash(value) {
    return String(value).replace(/\/+$/, "");
  }

  /**
   * Remove leading slashes from a path-like string.
   */
  function trimLeadingSlash(value) {
    return String(value).replace(/^\/+/, "");
  }

  /**
   * Determine whether a path is absolute-like and should not be prefixed.
   * Covers protocol URLs, scheme-relative URLs, and root-absolute URLs.
   */
  function isAbsoluteLikePath(value) {
    if (!isNonEmptyString(value)) {
      return false;
    }

    var text = value.trim();
    return /^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(text) || text.indexOf("//") === 0 || text.charAt(0) === "/";
  }

  /**
   * Join a base path and child path safely with one slash.
   */
  function joinPath(base, child) {
    if (!isNonEmptyString(base)) {
      return child;
    }
    if (!isNonEmptyString(child)) {
      return base;
    }
    return trimTrailingSlash(base) + "/" + trimLeadingSlash(child);
  }

  /**
   * Detect WebP support once, then reuse result for animated resources.
   */
  function detectWebpSupport() {
    try {
      var canvas = document.createElement("canvas");
      return canvas.toDataURL("image/webp").indexOf("image/webp") !== -1;
    } catch (_err) {
      return false;
    }
  }

  /*
    Map semantic cursor states to converted file names inside theme folders.
    These names come from the converter output.
  */
  var SEMANTIC_STATE_FILES = {
    default: "Normal",
    button: "Link",
    button_active: "Pin",
    input: "Text",
    input_focus: "Text",
    help: "Help",
    progress: "Working",
    wait: "Busy",
    crosshair: "Precision",
    move: "Move",
    ew_resize: "Horizontal",
    ns_resize: "Vertical",
    nwse_resize: "Diagonal1",
    nesw_resize: "Diagonal2",
    not_allowed: "Unavailable",
    up_arrow: "Alternate",
    person: "Person",
    pin: "Pin"
  };

  /*
    Hotspots used for both static and animated cursor rendering.
    Values are [x, y].
  */
  var STATE_HOTSPOTS = {
    default: [2, 2],
    button: [6, 2],
    button_active: [6, 2],
    input: [10, 16],
    input_focus: [10, 16],
    help: [2, 2],
    progress: [2, 2],
    wait: [2, 2],
    crosshair: [16, 16],
    move: [16, 16],
    ew_resize: [16, 16],
    ns_resize: [16, 16],
    nwse_resize: [16, 16],
    nesw_resize: [16, 16],
    not_allowed: [6, 2],
    up_arrow: [6, 2],
    person: [6, 2],
    pin: [6, 2]
  };

  /*
    CSS custom property names to update for static mode declarations.
    Each variable stores a full cursor declaration string.
  */
  var STATIC_CURSOR_VAR_MAP = {
    default: "--sekai-cursor-default",
    button: "--sekai-cursor-button",
    button_active: "--sekai-cursor-button-active",
    input: "--sekai-cursor-input",
    not_allowed: "--sekai-cursor-forbidden",
    progress: "--sekai-cursor-progress",
    help: "--sekai-cursor-help",
    wait: "--sekai-cursor-wait",
    crosshair: "--sekai-cursor-crosshair",
    move: "--sekai-cursor-move",
    ew_resize: "--sekai-cursor-ew",
    ns_resize: "--sekai-cursor-ns",
    nwse_resize: "--sekai-cursor-nwse",
    nesw_resize: "--sekai-cursor-nesw",
    up_arrow: "--sekai-cursor-up",
    person: "--sekai-cursor-person",
    pin: "--sekai-cursor-pin"
  };

  /*
    Fallback browser cursor keywords by semantic state.
    Used in declarations like: url(...) x y, fallback
  */
  var STATIC_CURSOR_FALLBACK = {
    default: "auto",
    button: "pointer",
    button_active: "pointer",
    input: "text",
    not_allowed: "not-allowed",
    progress: "progress",
    help: "help",
    wait: "wait",
    crosshair: "crosshair",
    move: "move",
    ew_resize: "ew-resize",
    ns_resize: "ns-resize",
    nwse_resize: "nwse-resize",
    nesw_resize: "nesw-resize",
    up_arrow: "default",
    person: "pointer",
    pin: "pointer"
  };

  /**
   * Sekai custom cursor component constructor.
   *
   * Options:
   * - host: Element | selector string, default document.body
   * - modeSelect: Element | selector string
   * - themeSelect: Element | selector string
   * - layer: Element | selector string
   * - mode: "static" | "animated" | "system"
   * - theme: theme id
   * - hideNativeCursor: boolean (default true)
   * - manifest: manifest object (default window.CURSOR_MANIFEST)
   * - assetBase: relative or absolute assets root folder (default "assets")
   * - baseUrl: optional prefix for all requests (e.g. CDN/project base)
   * - assetBaseUrl: explicit full assets root; highest priority if provided
   */
  function SekaiCursorComponent(options) {
    var opts = options || {};

    this.host = resolveElement(opts.host) || document.body;
    this.modeSelect = resolveElement(opts.modeSelect);
    this.themeSelect = resolveElement(opts.themeSelect);
    this.layer = resolveElement(opts.layer);

    this.baseUrl = isNonEmptyString(opts.baseUrl) ? opts.baseUrl.trim() : "";
    this.assetBase = isNonEmptyString(opts.assetBase) ? opts.assetBase.trim() : "assets";
    this.assetBaseUrl = isNonEmptyString(opts.assetBaseUrl) ? opts.assetBaseUrl.trim() : "";

    this.hideNativeCursor = opts.hideNativeCursor !== false;
    this.manifest = opts.manifest || global.CURSOR_MANIFEST || null;

    this.currentMode = opts.mode || (this.modeSelect && this.modeSelect.value) || "static";
    this.currentTheme = opts.theme || (this.themeSelect && this.themeSelect.value) || "airi";

    this.resolvedAssetBase = this.resolveAssetBasePath();
    this.webpSupported = detectWebpSupport();
    this.currentSrc = "";
    this.animatedStates = {};

    this.lastPointerX = 18;
    this.lastPointerY = 18;
    this.hasMousePosition = false;
    this.ignoreMouseUntil = 0;
    this.holdButtonActive = false;

    this.boundOnMouseMove = this.onMouseMove.bind(this);
    this.boundOnPointerDown = this.onPointerDown.bind(this);
    this.boundOnPointerUp = this.onPointerUp.bind(this);
    this.boundOnTouchStart = this.onTouchStart.bind(this);
    this.boundOnTouchEnd = this.onTouchEnd.bind(this);
    this.boundOnMouseLeave = this.onMouseLeave.bind(this);
    this.boundOnMouseEnter = this.onMouseEnter.bind(this);
    this.boundOnModeChange = this.onModeChange.bind(this);
    this.boundOnThemeChange = this.onThemeChange.bind(this);

    this.initialized = false;
    this.ownsLayer = false;
  }

  /**
   * Build final assets base path from baseUrl + assetBase, or use assetBaseUrl directly.
   */
  SekaiCursorComponent.prototype.resolveAssetBasePath = function () {
    if (isNonEmptyString(this.assetBaseUrl)) {
      return trimTrailingSlash(this.assetBaseUrl);
    }

    if (isAbsoluteLikePath(this.assetBase)) {
      return trimTrailingSlash(this.assetBase);
    }

    if (isNonEmptyString(this.baseUrl)) {
      return joinPath(this.baseUrl, this.assetBase);
    }

    return trimTrailingSlash(this.assetBase);
  };

  /**
   * Build a full asset URL/path from the resolved assets base and relative file path.
   */
  SekaiCursorComponent.prototype.buildAssetPath = function (relativePath) {
    return joinPath(this.resolvedAssetBase, relativePath);
  };

  /**
   * Read theme ids from manifest order, with safe fallback.
   */
  SekaiCursorComponent.prototype.getThemeIds = function () {
    if (this.manifest && Array.isArray(this.manifest.themeOrder)) {
      return this.manifest.themeOrder;
    }
    return ["airi"];
  };

  /**
   * Resolve display label for one theme id.
   */
  SekaiCursorComponent.prototype.getThemeLabel = function (themeId) {
    if (this.manifest && this.manifest.themes && this.manifest.themes[themeId] && this.manifest.themes[themeId].label) {
      return this.manifest.themes[themeId].label;
    }
    return themeId;
  };

  /**
   * Ensure animated cursor layer exists and has the expected class name.
   */
  SekaiCursorComponent.prototype.ensureLayer = function () {
    if (this.layer) {
      this.layer.classList.add("sekai-cursor-layer");
      return;
    }

    this.layer = document.createElement("div");
    this.layer.className = "sekai-cursor-layer";
    document.body.appendChild(this.layer);
    this.ownsLayer = true;
  };

  /**
   * Build all resource entries for one theme.
   * Includes animated and static paths plus hotspot coordinates.
   */
  SekaiCursorComponent.prototype.buildThemeStates = function (themeId) {
    var states = {};
    var stateNames = Object.keys(SEMANTIC_STATE_FILES);

    for (var i = 0; i < stateNames.length; i += 1) {
      var stateName = stateNames[i];
      var file = SEMANTIC_STATE_FILES[stateName];
      var hotspot = STATE_HOTSPOTS[stateName] || [2, 2];

      states[stateName] = {
        webp: this.buildAssetPath("animated/" + themeId + "/" + file + ".webp"),
        png: this.buildAssetPath("static/" + themeId + "/" + file + ".png"),
        x: hotspot[0],
        y: hotspot[1]
      };
    }

    return states;
  };

  /**
   * Build a cursor declaration string consumed by CSS variables.
   */
  SekaiCursorComponent.prototype.buildCursorDeclaration = function (assetPath, x, y, fallback) {
    return "url(\"" + assetPath + "\") " + x + " " + y + ", " + fallback;
  };

  /**
   * Apply static mode declarations to host-level CSS variables.
   *
   * Using host-level variables fixes static switching when host is not document root,
   * and allows multiple component instances without global variable collisions.
   */
  SekaiCursorComponent.prototype.applyStaticVars = function () {
    var target = this.host || document.documentElement;
    var stateNames = Object.keys(STATIC_CURSOR_VAR_MAP);

    for (var i = 0; i < stateNames.length; i += 1) {
      var stateName = stateNames[i];
      var cssVarName = STATIC_CURSOR_VAR_MAP[stateName];
      var state = this.animatedStates[stateName];
      var fallback = STATIC_CURSOR_FALLBACK[stateName] || "auto";

      if (!state) {
        continue;
      }

      target.style.setProperty(
        cssVarName,
        this.buildCursorDeclaration(state.png, state.x, state.y, fallback)
      );
    }
  };

  /**
   * Render the animated cursor layer with current state and pointer position.
   */
  SekaiCursorComponent.prototype.setAnimatedCursor = function (stateName, x, y) {
    var state = this.animatedStates[stateName] ? stateName : "default";
    var item = this.animatedStates[state];

    if (!item || !this.layer) {
      return;
    }

    var src = this.webpSupported ? item.webp : item.png;
    if (src !== this.currentSrc) {
      this.layer.style.backgroundImage = "url(\"" + src + "\")";
      this.currentSrc = src;
    }

    this.layer.style.transform = "translate(" + (x - item.x) + "px, " + (y - item.y) + "px)";
  };

  /**
   * Move animated layer out of viewport so it is visually hidden.
   */
  SekaiCursorComponent.prototype.hideAnimatedLayer = function () {
    if (!this.layer) {
      return;
    }
    this.layer.style.transform = "translate(-100px, -100px)";
  };

  /**
   * Mark current input as touch/pen and suppress compatibility mouse events.
   */
  SekaiCursorComponent.prototype.markNonMouseInput = function () {
    this.holdButtonActive = false;
    this.hasMousePosition = false;
    this.ignoreMouseUntil = Date.now() + 800;

    if (this.currentMode === "animated") {
      this.hideAnimatedLayer();
    }
  };

  /**
   * Resolve semantic state from DOM context.
   * Priority order intentionally mirrors static CSS semantics.
   */
  SekaiCursorComponent.prototype.resolveStateFromElement = function (target) {
    if (!target) {
      return "default";
    }

    if (target.closest(".sekai-cursor-disabled,[disabled],[data-forbidden='true'],.sekai-cursor-not")) {
      return "not_allowed";
    }

    if (target.closest(".sekai-cursor-progress,[aria-busy='true']")) {
      return "progress";
    }

    var custom = target.closest("[data-cursor-state]");
    if (custom && custom.dataset.cursorState) {
      return custom.dataset.cursorState;
    }

    if (target.closest(".sekai-cursor-input-focus,input:focus,textarea:focus,[contenteditable='true']:focus")) {
      return "input_focus";
    }

    if (target.closest(".sekai-cursor-input,input,textarea,[contenteditable='true']")) {
      return "input";
    }

    if (target.closest(".sekai-cursor-help")) {
      return "help";
    }
    if (target.closest(".sekai-cursor-wait")) {
      return "wait";
    }
    if (target.closest(".sekai-cursor-crosshair")) {
      return "crosshair";
    }
    if (target.closest(".sekai-cursor-move")) {
      return "move";
    }
    if (target.closest(".sekai-cursor-ew")) {
      return "ew_resize";
    }
    if (target.closest(".sekai-cursor-ns")) {
      return "ns_resize";
    }
    if (target.closest(".sekai-cursor-nwse")) {
      return "nwse_resize";
    }
    if (target.closest(".sekai-cursor-nesw")) {
      return "nesw_resize";
    }
    if (target.closest(".sekai-cursor-up")) {
      return "up_arrow";
    }
    if (target.closest(".sekai-cursor-person")) {
      return "person";
    }
    if (target.closest(".sekai-cursor-pin")) {
      return "pin";
    }

    if (target.closest(".sekai-cursor-clickable,a,button,select,[role='button'],label[for],summary,option")) {
      return "button";
    }

    return "default";
  };

  /**
   * Set component mode and sync CSS classes.
   */
  SekaiCursorComponent.prototype.setMode = function (mode) {
    var nextMode = mode || "static";

    this.currentMode = nextMode;
    if (this.modeSelect) {
      this.modeSelect.value = nextMode;
    }

    this.host.classList.remove("sekai-cursor-mode-static", "sekai-cursor-mode-animated", "sekai-cursor-hidden");

    if (nextMode === "animated") {
      this.host.classList.add("sekai-cursor-mode-animated");
      if (this.hideNativeCursor) {
        this.host.classList.add("sekai-cursor-hidden");
      }

      // Only show animated cursor after actual mouse movement.
      if (this.hasMousePosition) {
        this.setAnimatedCursor("default", this.lastPointerX, this.lastPointerY);
      } else {
        this.hideAnimatedLayer();
      }
      return;
    }

    if (nextMode === "static") {
      this.host.classList.add("sekai-cursor-mode-static");
      this.hideAnimatedLayer();
      return;
    }

    this.hideAnimatedLayer();
  };

  /**
   * Set current theme and refresh static/animated resources.
   */
  SekaiCursorComponent.prototype.setTheme = function (themeId) {
    var ids = this.getThemeIds();
    var nextTheme = ids.indexOf(themeId) >= 0 ? themeId : (ids[0] || "airi");

    this.currentTheme = nextTheme;
    this.animatedStates = this.buildThemeStates(nextTheme);
    this.applyStaticVars();

    if (this.themeSelect) {
      this.themeSelect.value = nextTheme;
    }

    if (this.currentMode === "animated" && this.hasMousePosition) {
      var underPointer = document.elementFromPoint(this.lastPointerX, this.lastPointerY);
      var state = this.resolveStateFromElement(underPointer);
      this.setAnimatedCursor(state, this.lastPointerX, this.lastPointerY);
    } else if (this.currentMode === "animated") {
      this.hideAnimatedLayer();
    }
  };

  /**
   * Update only baseUrl, then rebuild effective asset paths in-place.
   */
  SekaiCursorComponent.prototype.setBaseUrl = function (baseUrl) {
    this.baseUrl = isNonEmptyString(baseUrl) ? baseUrl.trim() : "";
    this.resolvedAssetBase = this.resolveAssetBasePath();
    this.setTheme(this.currentTheme);
  };

  /**
   * Update only assetBase, then rebuild effective asset paths in-place.
   */
  SekaiCursorComponent.prototype.setAssetBase = function (assetBase) {
    this.assetBase = isNonEmptyString(assetBase) ? assetBase.trim() : "assets";
    this.resolvedAssetBase = this.resolveAssetBasePath();
    this.setTheme(this.currentTheme);
  };

  /**
   * Update full assets root URL/path directly, then rebuild theme assets.
   */
  SekaiCursorComponent.prototype.setAssetBaseUrl = function (assetBaseUrl) {
    this.assetBaseUrl = isNonEmptyString(assetBaseUrl) ? assetBaseUrl.trim() : "";
    this.resolvedAssetBase = this.resolveAssetBasePath();
    this.setTheme(this.currentTheme);
  };

  /**
   * Fill themeSelect options from current manifest order.
   */
  SekaiCursorComponent.prototype.populateThemeSelect = function () {
    if (!this.themeSelect) {
      return;
    }

    var ids = this.getThemeIds();
    this.themeSelect.innerHTML = "";

    for (var i = 0; i < ids.length; i += 1) {
      var themeId = ids[i];
      var option = document.createElement("option");
      option.value = themeId;
      option.textContent = this.getThemeLabel(themeId) + " (" + themeId + ")";
      this.themeSelect.appendChild(option);
    }
  };

  /**
   * Pointer move handler for animated mode tracking.
   */
  SekaiCursorComponent.prototype.onMouseMove = function (event) {
    if (Date.now() < this.ignoreMouseUntil) {
      this.hasMousePosition = false;
      if (this.currentMode === "animated") {
        this.hideAnimatedLayer();
      }
      return;
    }

    if (event.sourceCapabilities && event.sourceCapabilities.firesTouchEvents) {
      this.markNonMouseInput();
      return;
    }

    this.lastPointerX = event.clientX;
    this.lastPointerY = event.clientY;
    this.hasMousePosition = true;

    if (this.currentMode !== "animated") {
      return;
    }

    var baseState = this.resolveStateFromElement(event.target);
    /*
      Keep pressed state while the pointer is held on interactive controls.
      This matches static :active behavior for drag/press flows:
      hover move -> press pin -> move while holding still pin -> release back to hover state.
    */
    var nextState = this.holdButtonActive ? "button_active" : baseState;
    this.setAnimatedCursor(nextState, this.lastPointerX, this.lastPointerY);
  };

  /**
   * Pointer down handler. Keeps pressed visual state for button-like controls.
   */
  SekaiCursorComponent.prototype.onPointerDown = function (event) {
    if (this.currentMode !== "animated") {
      return;
    }

    // Do not show custom cursor for non-mouse input (touch/pen, etc.).
    if (event.pointerType && event.pointerType !== "mouse") {
      this.markNonMouseInput();
      return;
    }

    var target = event.target;
    var baseState = this.resolveStateFromElement(target);

    if (target.closest("a,button,[role='button']")) {
      this.holdButtonActive = true;
      this.setAnimatedCursor("button_active", this.lastPointerX, this.lastPointerY);
      return;
    }

    this.holdButtonActive = false;
    this.setAnimatedCursor(baseState, this.lastPointerX, this.lastPointerY);
  };

  /**
   * Pointer up handler. Recomputes state under current pointer location.
   */
  SekaiCursorComponent.prototype.onPointerUp = function (event) {
    if (this.currentMode !== "animated") {
      return;
    }

    if (event && event.pointerType && event.pointerType !== "mouse") {
      this.markNonMouseInput();
      return;
    }

    this.holdButtonActive = false;
    var underPointer = document.elementFromPoint(this.lastPointerX, this.lastPointerY);
    var state = this.resolveStateFromElement(underPointer);
    this.setAnimatedCursor(state, this.lastPointerX, this.lastPointerY);
  };

  /**
   * Hide animated layer when pointer leaves viewport.
   */
  SekaiCursorComponent.prototype.onMouseLeave = function () {
    if (this.currentMode === "animated" && this.layer) {
      this.hideAnimatedLayer();
    }
  };

  /**
   * Restore animated default state when pointer re-enters viewport.
   */
  SekaiCursorComponent.prototype.onMouseEnter = function () {
    if (this.currentMode === "animated" && this.hasMousePosition) {
      this.setAnimatedCursor("default", this.lastPointerX, this.lastPointerY);
    }
  };

  /**
   * Touch start handler to suppress synthesized mouse events from taps.
   */
  SekaiCursorComponent.prototype.onTouchStart = function () {
    this.markNonMouseInput();
  };

  /**
   * Touch end handler keeps suppression window active for compatibility events.
   */
  SekaiCursorComponent.prototype.onTouchEnd = function () {
    this.markNonMouseInput();
  };

  /**
   * Mode select change handler.
   */
  SekaiCursorComponent.prototype.onModeChange = function () {
    this.setMode(this.modeSelect ? this.modeSelect.value : "static");
  };

  /**
   * Theme select change handler.
   */
  SekaiCursorComponent.prototype.onThemeChange = function () {
    this.setTheme(this.themeSelect ? this.themeSelect.value : "airi");
  };

  /**
   * Register all event listeners used by the component.
   */
  SekaiCursorComponent.prototype.bindEvents = function () {
    document.addEventListener("mousemove", this.boundOnMouseMove);
    document.addEventListener("pointerdown", this.boundOnPointerDown);
    document.addEventListener("pointerup", this.boundOnPointerUp);
    document.addEventListener("touchstart", this.boundOnTouchStart);
    document.addEventListener("touchend", this.boundOnTouchEnd);
    document.addEventListener("mouseleave", this.boundOnMouseLeave);
    document.addEventListener("mouseenter", this.boundOnMouseEnter);

    if (this.modeSelect) {
      this.modeSelect.addEventListener("change", this.boundOnModeChange);
    }
    if (this.themeSelect) {
      this.themeSelect.addEventListener("change", this.boundOnThemeChange);
    }
  };

  /**
   * Remove all event listeners used by the component.
   */
  SekaiCursorComponent.prototype.unbindEvents = function () {
    document.removeEventListener("mousemove", this.boundOnMouseMove);
    document.removeEventListener("pointerdown", this.boundOnPointerDown);
    document.removeEventListener("pointerup", this.boundOnPointerUp);
    document.removeEventListener("touchstart", this.boundOnTouchStart);
    document.removeEventListener("touchend", this.boundOnTouchEnd);
    document.removeEventListener("mouseleave", this.boundOnMouseLeave);
    document.removeEventListener("mouseenter", this.boundOnMouseEnter);

    if (this.modeSelect) {
      this.modeSelect.removeEventListener("change", this.boundOnModeChange);
    }
    if (this.themeSelect) {
      this.themeSelect.removeEventListener("change", this.boundOnThemeChange);
    }
  };

  /**
   * Initialize component classes, resources, and events.
   */
  SekaiCursorComponent.prototype.init = function () {
    if (this.initialized) {
      return this;
    }

    this.host.classList.add("sekai-cursor-host");
    this.ensureLayer();
    this.populateThemeSelect();

    this.setTheme(this.currentTheme);
    this.setMode(this.currentMode);
    this.bindEvents();

    this.initialized = true;
    return this;
  };

  /**
   * Destroy component and restore DOM to non-enhanced state.
   */
  SekaiCursorComponent.prototype.destroy = function () {
    if (!this.initialized) {
      return;
    }

    this.unbindEvents();
    this.host.classList.remove(
      "sekai-cursor-host",
      "sekai-cursor-mode-static",
      "sekai-cursor-mode-animated",
      "sekai-cursor-hidden"
    );

    if (this.layer) {
      this.hideAnimatedLayer();
      if (this.ownsLayer && this.layer.parentNode) {
        this.layer.parentNode.removeChild(this.layer);
      }
    }

    this.initialized = false;
  };

  /*
    Public exports:
    - Class constructor for advanced control
    - Helper factory for concise initialization
  */
  global.SekaiCursorComponent = SekaiCursorComponent;
  global.createSekaiCursorComponent = function (options) {
    var instance = new SekaiCursorComponent(options);
    return instance.init();
  };
})(window);
