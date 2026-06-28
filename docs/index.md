# Godot 4 semantic-release plugin

This plugin automates the injection of version names and build codes for Godot 4 games during the `prepare` phase of the release pipeline.

## Features

- **Android Export Versioning (`export_presets.cfg`)**: Automatically updates or adds `version/name` and `version/code` configuration properties.
- **Approach A (`project.godot`)**: Updates the application config version string so the game can read it dynamically at runtime.
- **Approach B (GDScript Autoload)**: Performs regex-based substitution of a version constant in a GDScript file.

## Lifecycle Placement

The version changes are written locally during the `prepare` step, allowing subsequent steps in your pipeline (like exporting/compiling via the Godot CLI, or committing changed files back to Git) to have access to the exact release version.
