import { describe, expect, test } from "bun:test";
import { GodotPluginError } from "../../src/error.js";
import { resolveGodotConfig } from "../../src/options.js";

describe("resolveGodotConfig", () => {
	test("resolves defaults correctly", () => {
		const config = resolveGodotConfig({}, {});

		expect(config).toEqual({
			exportPresetsPath: "export_presets.cfg",
			projectGodotPath: "project.godot",
			enableApproachA: true,
			projectVersionKey: "config/version",
			enableApproachB: false,
			gdScriptPath: null,
			gdScriptVersionConstant: "GAME_VERSION",
			versionCode: null,
			versionCodeOffset: 0,
		});
	});

	test("respects custom option values", () => {
		const config = resolveGodotConfig(
			{
				exportPresetsPath: "custom_presets.cfg",
				projectGodotPath: "custom_project.godot",
				enableApproachA: false,
				projectVersionKey: "custom/version",
				enableApproachB: true,
				gdScriptPath: "scripts/CustomVersion.gd",
				gdScriptVersionConstant: "CUSTOM_VERSION_CONST",
				versionCode: 42,
				versionCodeOffset: 10,
			},
			{},
		);

		expect(config).toEqual({
			exportPresetsPath: "custom_presets.cfg",
			projectGodotPath: "custom_project.godot",
			enableApproachA: false,
			projectVersionKey: "custom/version",
			enableApproachB: true,
			gdScriptPath: "scripts/CustomVersion.gd",
			gdScriptVersionConstant: "CUSTOM_VERSION_CONST",
			versionCode: 42,
			versionCodeOffset: 10,
		});
	});

	test("respects environment variables", () => {
		const config = resolveGodotConfig(
			{},
			{
				GODOT_EXPORT_PRESETS_PATH: "env_presets.cfg",
				GODOT_PROJECT_GODOT_PATH: "env_project.godot",
				GODOT_ENABLE_APPROACH_A: "false",
				GODOT_PROJECT_VERSION_KEY: "env/version",
				GODOT_ENABLE_APPROACH_B: "true",
				GODOT_GDSCRIPT_PATH: "scripts/EnvVersion.gd",
				GODOT_GDSCRIPT_VERSION_CONSTANT: "ENV_VERSION_CONST",
				GODOT_VERSION_CODE: "99",
				GODOT_VERSION_CODE_OFFSET: "5",
			},
		);

		expect(config).toEqual({
			exportPresetsPath: "env_presets.cfg",
			projectGodotPath: "env_project.godot",
			enableApproachA: false,
			projectVersionKey: "env/version",
			enableApproachB: true,
			gdScriptPath: "scripts/EnvVersion.gd",
			gdScriptVersionConstant: "ENV_VERSION_CONST",
			versionCode: 99,
			versionCodeOffset: 5,
		});
	});

	test("throws error if Approach B is enabled without a gdScriptPath", () => {
		expect(() => resolveGodotConfig({ enableApproachB: true }, {})).toThrow(
			GodotPluginError,
		);
	});
});
