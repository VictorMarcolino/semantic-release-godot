import { GodotPluginError } from "./error.js";

export interface GodotPluginOptions {
	readonly exportPresetsPath?: string;
	readonly projectGodotPath?: string;
	readonly enableApproachA?: boolean;
	readonly projectVersionKey?: string;
	readonly enableApproachB?: boolean;
	readonly gdScriptPath?: string;
	readonly gdScriptVersionConstant?: string;
	readonly versionCode?: number;
	readonly versionCodeOffset?: number;
	/** Optional shell command to run after version files are patched (e.g. "make android-release"). Runs in the project cwd and inherits all environment variables. */
	readonly buildCommand?: string;
}

export interface ResolvedGodotPluginConfig {
	readonly exportPresetsPath: string;
	readonly projectGodotPath: string;
	readonly enableApproachA: boolean;
	readonly projectVersionKey: string;
	readonly enableApproachB: boolean;
	readonly gdScriptPath: string | null;
	readonly gdScriptVersionConstant: string;
	readonly versionCode: number | null;
	readonly versionCodeOffset: number;
	readonly buildCommand: string | null;
}

const parseBoolean = (
	name: string,
	value: boolean | string | undefined,
	defaultValue: boolean,
): boolean => {
	if (value === undefined) {
		return defaultValue;
	}
	if (typeof value === "boolean") {
		return value;
	}
	const normalized = value.trim().toLowerCase();
	if (["true", "1", "yes"].includes(normalized)) {
		return true;
	}
	if (["false", "0", "no"].includes(normalized)) {
		return false;
	}
	throw new GodotPluginError(
		"EINVALIDBOOLEAN",
		`semantic-release-godot: ${name} must be a boolean.`,
		`Use true/false for ${name}.`,
	);
};

export function resolveGodotConfig(
	pluginConfig: GodotPluginOptions,
	env: Readonly<Record<string, string | undefined>>,
): ResolvedGodotPluginConfig {
	const enableApproachA = parseBoolean(
		"enableApproachA",
		pluginConfig.enableApproachA ?? env.GODOT_ENABLE_APPROACH_A,
		true,
	);
	const enableApproachB = parseBoolean(
		"enableApproachB",
		pluginConfig.enableApproachB ?? env.GODOT_ENABLE_APPROACH_B,
		false,
	);

	const gdScriptPath =
		pluginConfig.gdScriptPath || env.GODOT_GDSCRIPT_PATH || null;
	if (enableApproachB && !gdScriptPath) {
		throw new GodotPluginError(
			"EMISSINGGDSCRIPTPATH",
			"semantic-release-godot: gdScriptPath is required when enableApproachB is true.",
			"Set gdScriptPath in plugin options or GODOT_GDSCRIPT_PATH environment variable.",
		);
	}

	let versionCodeRaw: number | null = null;
	if (pluginConfig.versionCode !== undefined) {
		versionCodeRaw = pluginConfig.versionCode;
	} else if (env.GODOT_VERSION_CODE) {
		versionCodeRaw = Number.parseInt(env.GODOT_VERSION_CODE, 10);
	}

	let versionCodeOffset = 0;
	if (pluginConfig.versionCodeOffset !== undefined) {
		versionCodeOffset = pluginConfig.versionCodeOffset;
	} else if (env.GODOT_VERSION_CODE_OFFSET) {
		versionCodeOffset = Number.parseInt(env.GODOT_VERSION_CODE_OFFSET, 10);
	}

	return {
		exportPresetsPath:
			pluginConfig.exportPresetsPath ||
			env.GODOT_EXPORT_PRESETS_PATH ||
			"export_presets.cfg",
		projectGodotPath:
			pluginConfig.projectGodotPath ||
			env.GODOT_PROJECT_GODOT_PATH ||
			"project.godot",
		enableApproachA,
		projectVersionKey:
			pluginConfig.projectVersionKey ||
			env.GODOT_PROJECT_VERSION_KEY ||
			"config/version",
		enableApproachB,
		gdScriptPath,
		gdScriptVersionConstant:
			pluginConfig.gdScriptVersionConstant ||
			env.GODOT_GDSCRIPT_VERSION_CONSTANT ||
			"GAME_VERSION",
		versionCode: versionCodeRaw,
		versionCodeOffset,
		buildCommand: pluginConfig.buildCommand || env.GODOT_BUILD_COMMAND || null,
	};
}
