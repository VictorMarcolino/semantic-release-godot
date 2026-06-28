# Examples

These examples show how to configure `@marcolino/semantic-release-godot` in a `semantic-release` pipeline.

## Files

- [`semantic-release.config.js`](./semantic-release.config.js): A typical semantic-release plugin chain setup that modifies your Android export presets, `project.godot` file, and an Autoload GDScript file containing a version constant, and then commits the modified files back to Git before creating the release.
