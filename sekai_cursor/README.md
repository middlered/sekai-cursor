# Sekai Cursor Component

## Quick Start

1. Include the CSS and JS on your page

```html
<link rel="stylesheet" href="lib/sekai-cursor-component.css">
<script src="assets/manifest.js"></script>
<script src="lib/sekai-cursor-component.js"></script>
```

2. (Optional) Prepare selects for mode and theme. The component can populate the theme select from the manifest

```html
<label for="modeSelect">Cursor Mode:</label>
<select id="modeSelect">
  <option value="static">static</option>
  <option value="animated">animated</option>
  <option value="system">system</option>
</select>

<label for="themeSelect">Cursor Style:</label>
<select id="themeSelect"></select>
```

3. Initialize the component

```html
<script>
  const cursor = createSekaiCursorComponent({
    host: document.body,
    modeSelect: "#modeSelect",
    themeSelect: "#themeSelect",
    mode: "static",
    theme: "airi",
    assetBase: "assets"
  });
</script>
```

## Options

Pass an options object to `createSekaiCursorComponent(options)` with these supported fields:

- host
  - Type: Element | string
  - Default: `document.body`
  - Description: The container element for the component. If a string is provided, `document.querySelector` is used.

- modeSelect
  - Type: Element | string
  - Default: `null`
  - Description: A select element to control the cursor mode (`static` | `animated` | `system`).

- themeSelect
  - Type: Element | string
  - Default: `null`
  - Description: A select element for choosing theme; the component will populate it from the manifest.

- layer
  - Type: Element | string
  - Default: `null`
  - Description: The follow layer used in `animated` mode. If not provided, the component creates one and appends it to `document.body`.

- mode
  - Type: `"static"` | `"animated"` | `"system"`
  - Default: reads `modeSelect.value` if present, otherwise `static`
  - Description:
    - `static`: use CSS `cursor` declarations.
    - `animated`: use a JS-driven follow layer for animated cursors.
    - `system`: disable custom cursor behavior (use system defaults).

- theme
  - Type: string
  - Default: reads `themeSelect.value` if present, otherwise `airi`
  - Description: Theme id such as `airi`, `kanade`, `mizuki`.

- assetBase
  - Type: string
  - Default: `assets`
  - Description: Resource base path segment (relative or absolute). Final asset paths are formed as:
    - `${assetBase}/static/[theme]/[name].png`
    - `${assetBase}/animated/[theme]/[name].webp`

- baseUrl
  - Type: string
  - Default: `""`
  - Description: Request prefix for hosting under a subpath or for CDN usage.

- assetBaseUrl
  - Type: string
  - Default: `""`
  - Description: Full asset base URL; highest priority and overrides `baseUrl + assetBase`.

- hideNativeCursor
  - Type: boolean
  - Default: `true`
  - Description: In `animated` mode, whether to hide the native system cursor.

- manifest
  - Type: object
  - Default: `window.CURSOR_MANIFEST`
  - Description: Theme metadata source.

## Public Methods

- `instance.setMode("static" | "animated" | "system")`
- `instance.setTheme(themeId)`
- `instance.setBaseUrl(baseUrl)`
- `instance.setAssetBase(assetBase)`
- `instance.setAssetBaseUrl(assetBaseUrl)`
- `instance.populateThemeSelect()`
- `instance.destroy()`

## Available CSS classes for cursor

| CSS class | Circumstance | Fallback |
|-----------|---------|------------------|
| `.sekai-cursor-normal` | Default cursor | `auto` |
| `.sekai-cursor-clickable` | Clickable elements | `pointer` |
| `.sekai-cursor-pin` | Pressed / pinned state | `pointer` |
| `.sekai-cursor-input` | Text inputs | `text` |
| `.sekai-cursor-input-focus` | Input focus state | `text` |
| `.sekai-cursor-disabled` | Disabled / non-interactive elements | `not-allowed` |
| `.sekai-cursor-progress` | Busy / loading state | `progress` |
| `.sekai-cursor-help` | Help tooltip | `help` |
| `.sekai-cursor-wait` | Waiting / blocking | `wait` |
| `.sekai-cursor-crosshair` | Precision crosshair | `crosshair` |
| `.sekai-cursor-move` | Move gesture | `move` |
| `.sekai-cursor-ew` | Horizontal resize (E-W) | `ew-resize` |
| `.sekai-cursor-ns` | Vertical resize (N-S) | `ns-resize` |
| `.sekai-cursor-nwse` | Diagonal resize (NW-SE) | `nwse-resize` |
| `.sekai-cursor-nesw` | Diagonal resize (NE-SW) | `nesw-resize` |
| `.sekai-cursor-not` | Explicitly not-allowed | `not-allowed` |
| `.sekai-cursor-up` | Up / default pointer |  `default` |
| `.sekai-cursor-person` | Person / avatar related |  `pointer` |
