# `@marcolino/semantic-release-godot`

`semantic-release` plugin to automate version and build number injection for Godot 4 projects, specifically targeting Android and global game configurations.

The plugin runs during the semantic-release `prepare` lifecycle, ensuring that version numbers are baked into project files before your build/export stage and before the release is tagged in Git.

---

## How It Works

This plugin automates three common versioning techniques in Godot 4:

### 1. Android Preset Options (`export_presets.cfg`)
Bakes the user-facing version name and unique build code into the Android preset options before you trigger `godot --export-release`.
- **`version/name`**: Set to the next release version (e.g., `"1.0.1"`).
- **`version/code`**: Set to a strictly increasing integer. By default, it computes the **total git commit count** (`git rev-list --count HEAD`) to use as the build number. You can also specify an offset or override this manually.

### 2. Custom Global Config (Approach A - `project.godot`)
By default, this is enabled and writes/updates the game version inside `project.godot` (default key is `config/version` under `[application]`).
You can read this at runtime in GDScript:
```gdscript
var game_version = ProjectSettings.get_setting("application/config/version")
```

### 3. Autoload Script Constant (Approach B - GDScript)
Optionally updates a specific version constant (default name `GAME_VERSION`) in an Autoload script (e.g. `res://scripts/Version.gd`):
```gdscript
extends Node
const GAME_VERSION = "1.0.1"
```

---

## Install

```sh
npm install --save-dev @marcolino/semantic-release-godot
```

## Usage

Configure the plugin in your `release.config.js` or `.releaserc`:

```js
export default {
  plugins: [
    "@semantic-release/commit-analyzer",
    "@semantic-release/release-notes-generator",
    [
      "@marcolino/semantic-release-godot",
      {
        // By default, Approach A is enabled, Approach B is disabled
        enableApproachA: true,
        enableApproachB: true,
        gdScriptPath: "res://scripts/Version.gd"
      }
    ],
    "@semantic-release/github"
  ]
};
```

---

## Configuration Options

| Option | Env Fallback | Default | Description |
|---|---|---|---|
| `exportPresetsPath` | `GODOT_EXPORT_PRESETS_PATH` | `export_presets.cfg` | Path to your Godot export configuration file. |
| `projectGodotPath` | `GODOT_PROJECT_GODOT_PATH` | `project.godot` | Path to your `project.godot` file. |
| `enableApproachA` | `GODOT_ENABLE_APPROACH_A` | `true` | Update the version inside `project.godot`. |
| `projectVersionKey` | `GODOT_PROJECT_VERSION_KEY` | `config/version` | The key under `[application]` to write the version to in `project.godot`. |
| `enableApproachB` | `GODOT_ENABLE_APPROACH_B` | `false` | Update a version constant inside a GDScript file. |
| `gdScriptPath` | `GODOT_GDSCRIPT_PATH` | `null` | Path to the GDScript file (supports `res://` prefix). Required if `enableApproachB` is `true`. |
| `gdScriptVersionConstant` | `GODOT_GDSCRIPT_VERSION_CONSTANT` | `GAME_VERSION` | The variable/constant name in the GDScript to update. |
| `versionCode` | `GODOT_VERSION_CODE` | `null` | Manual version code value. If not specified, git commit count is used. |
| `versionCodeOffset` | `GODOT_VERSION_CODE_OFFSET` | `0` | Offset added to the computed git commit count version code. |

---

## License

MIT
