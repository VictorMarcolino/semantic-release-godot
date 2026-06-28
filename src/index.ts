import { execFile } from "node:child_process";
import { access, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { promisify } from "node:util";
import type { PrepareContext, VerifyConditionsContext } from "semantic-release";
import { GodotPluginError } from "./error.js";
import { type GodotPluginOptions, resolveGodotConfig } from "./options.js";

const execFileAsync = promisify(execFile);

export type { GodotPluginOptions };

interface Line {
	type: "empty" | "comment" | "keyvalue" | "unknown";
	key?: string;
	value?: string;
	raw: string;
}

interface Section {
	name: string;
	lines: Line[];
}

export function parseGodotConfig(content: string): Section[] {
	const lines = content.split(/\r?\n/);
	const sections: Section[] = [];
	let currentSection: Section = { name: "", lines: [] };
	sections.push(currentSection);

	for (const line of lines) {
		const trimmed = line.trim();
		if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
			const name = trimmed.slice(1, -1);
			currentSection = { name, lines: [] };
			sections.push(currentSection);
			continue;
		}

		if (trimmed === "") {
			currentSection.lines.push({ type: "empty", raw: line });
			continue;
		}

		if (trimmed.startsWith(";")) {
			currentSection.lines.push({ type: "comment", raw: line });
			continue;
		}

		const equalIndex = line.indexOf("=");
		if (equalIndex !== -1) {
			const key = line.slice(0, equalIndex).trim();
			const value = line.slice(equalIndex + 1).trim();
			currentSection.lines.push({
				type: "keyvalue",
				key,
				value,
				raw: line,
			});
		} else {
			currentSection.lines.push({ type: "unknown", raw: line });
		}
	}

	return sections;
}

export function stringifyGodotConfig(sections: Section[]): string {
	const output: string[] = [];
	for (const section of sections) {
		if (section.name !== "") {
			output.push(`[${section.name}]`);
		}
		for (const line of section.lines) {
			if (line.type === "keyvalue") {
				output.push(`${line.key}=${line.value}`);
			} else {
				output.push(line.raw);
			}
		}
	}
	return output.join("\n");
}

export function updateExportPresets(
	content: string,
	versionName: string,
	versionCode: number,
): string {
	const sections = parseGodotConfig(content);

	// Find all preset indices that are Android
	const androidPresets = new Set<string>();
	for (const section of sections) {
		const match = section.name.match(/^preset\.(\d+)$/);
		if (match) {
			const index = match[1];
			if (index) {
				const platformLine = section.lines.find(
					(l) => l.type === "keyvalue" && l.key === "platform",
				);
				if (platformLine?.value === '"Android"') {
					androidPresets.add(index);
				}
			}
		}
	}

	// Update options sections for those presets
	for (const index of androidPresets) {
		const optionsSectionName = `preset.${index}.options`;
		let optionsSection = sections.find((s) => s.name === optionsSectionName);
		if (!optionsSection) {
			optionsSection = { name: optionsSectionName, lines: [] };
			sections.push(optionsSection);
		}

		// Update or add version/code
		const codeLine = optionsSection.lines.find(
			(l) => l.type === "keyvalue" && l.key === "version/code",
		);
		if (codeLine) {
			codeLine.value = String(versionCode);
		} else {
			optionsSection.lines.push({
				type: "keyvalue",
				key: "version/code",
				value: String(versionCode),
				raw: `version/code=${versionCode}`,
			});
		}

		// Update or add version/name
		const nameLine = optionsSection.lines.find(
			(l) => l.type === "keyvalue" && l.key === "version/name",
		);
		if (nameLine) {
			nameLine.value = `"${versionName}"`;
		} else {
			optionsSection.lines.push({
				type: "keyvalue",
				key: "version/name",
				value: `"${versionName}"`,
				raw: `version/name="${versionName}"`,
			});
		}
	}

	return stringifyGodotConfig(sections);
}

export function updateProjectGodot(
	content: string,
	versionName: string,
	versionKey = "config/version",
): string {
	const sections = parseGodotConfig(content);
	let appSection = sections.find((s) => s.name === "application");
	if (!appSection) {
		appSection = { name: "application", lines: [] };
		sections.push(appSection);
	}

	const versionLine = appSection.lines.find(
		(l) => l.type === "keyvalue" && l.key === versionKey,
	);
	if (versionLine) {
		versionLine.value = `"${versionName}"`;
	} else {
		appSection.lines.push({
			type: "keyvalue",
			key: versionKey,
			value: `"${versionName}"`,
			raw: `${versionKey}="${versionName}"`,
		});
	}

	return stringifyGodotConfig(sections);
}

export function updateGDScript(
	content: string,
	versionName: string,
	constantName = "GAME_VERSION",
): string {
	const regex = new RegExp(
		`(${constantName}(?:\\s*:\\s*\\w+)?\\s*=\\s*["'])([^"']*)(["'])`,
	);
	if (!regex.test(content)) {
		throw new GodotPluginError(
			"EGDSCRIPTCONSTANTNOTFOUND",
			`semantic-release-godot: Could not find version constant "${constantName}" in script.`,
			"Verify the constant exists in the GDScript file and is assigned a string value.",
		);
	}
	return content.replace(regex, `$1${versionName}$3`);
}

const resolveScriptPath = (path: string, cwd: string): string => {
	const cleanPath = path.startsWith("res://") ? path.slice(6) : path;
	return resolve(cwd, cleanPath);
};

const getCommitCount = async (cwd: string): Promise<number> => {
	try {
		const { stdout } = await execFileAsync(
			"git",
			["rev-list", "--count", "HEAD"],
			{ cwd },
		);
		return Number.parseInt(stdout.trim(), 10);
	} catch (err: unknown) {
		throw new GodotPluginError(
			"EGITCOMMITCOUNT",
			"semantic-release-godot: Failed to determine git commit count.",
			err instanceof Error ? err.message : String(err),
		);
	}
};

export async function verifyConditions(
	pluginConfig: GodotPluginOptions,
	context: VerifyConditionsContext,
): Promise<void> {
	const config = resolveGodotConfig(pluginConfig, context.env);
	const cwd = context.cwd ?? process.cwd();

	// 1. Verify git is available if versionCode is computed
	if (config.versionCode === null) {
		try {
			await execFileAsync("git", ["--version"], { cwd });
		} catch (err: unknown) {
			throw new GodotPluginError(
				"EGITNOTFOUND",
				"semantic-release-godot: git must be installed to compute versionCode.",
				err instanceof Error ? err.message : String(err),
			);
		}
	}

	// 2. Verify export_presets.cfg exists
	const presetsPath = resolve(cwd, config.exportPresetsPath);
	try {
		await access(presetsPath);
	} catch {
		throw new GodotPluginError(
			"EMISSINGEXPORTPRESETS",
			`semantic-release-godot: export_presets.cfg not found at "${presetsPath}".`,
			"Make sure export_presets.cfg exists in your project repository.",
		);
	}

	// 3. If Approach A is enabled, verify project.godot exists
	if (config.enableApproachA) {
		const projectGodotPath = resolve(cwd, config.projectGodotPath);
		try {
			await access(projectGodotPath);
		} catch {
			throw new GodotPluginError(
				"EMISSINGPROJECTGODOT",
				`semantic-release-godot: project.godot not found at "${projectGodotPath}".`,
				"Approach A is enabled by default. Set enableApproachA to false if you do not want to use it.",
			);
		}
	}

	// 4. If Approach B is enabled, verify gdScriptPath exists
	if (config.enableApproachB && config.gdScriptPath) {
		const scriptPath = resolveScriptPath(config.gdScriptPath, cwd);
		try {
			await access(scriptPath);
		} catch {
			throw new GodotPluginError(
				"EMISSINGGDSCRIPT",
				`semantic-release-godot: GDScript file not found at "${scriptPath}".`,
				"Make sure the gdScriptPath option matches an existing file in your repository.",
			);
		}
	}
}

export async function prepare(
	pluginConfig: GodotPluginOptions,
	context: PrepareContext,
): Promise<void> {
	const config = resolveGodotConfig(pluginConfig, context.env);
	const cwd = context.cwd ?? process.cwd();

	// 1. Calculate version code
	let code = config.versionCode;
	if (code === null) {
		const commitCount = await getCommitCount(cwd);
		code = commitCount + config.versionCodeOffset;
	}

	const versionName = context.nextRelease.version;

	// 2. Update export_presets.cfg
	const presetsPath = resolve(cwd, config.exportPresetsPath);
	const presetsContent = await readFile(presetsPath, "utf8");
	const updatedPresetsContent = updateExportPresets(
		presetsContent,
		versionName,
		code,
	);
	await writeFile(presetsPath, updatedPresetsContent, "utf8");
	context.logger.log(
		`[semantic-release-godot] Updated Android preset options in "${config.exportPresetsPath}" with version/name="${versionName}" and version/code=${code}`,
	);

	// 3. If Approach A is enabled, update project.godot
	if (config.enableApproachA) {
		const projectGodotPath = resolve(cwd, config.projectGodotPath);
		const projectGodotContent = await readFile(projectGodotPath, "utf8");
		const updatedProjectGodotContent = updateProjectGodot(
			projectGodotContent,
			versionName,
			config.projectVersionKey,
		);
		await writeFile(projectGodotPath, updatedProjectGodotContent, "utf8");
		context.logger.log(
			`[semantic-release-godot] Updated "${config.projectGodotPath}" [application] ${config.projectVersionKey} to "${versionName}"`,
		);
	}

	// 4. If Approach B is enabled, update GDScript file
	if (config.enableApproachB && config.gdScriptPath) {
		const scriptPath = resolveScriptPath(config.gdScriptPath, cwd);
		const scriptContent = await readFile(scriptPath, "utf8");
		const updatedScriptContent = updateGDScript(
			scriptContent,
			versionName,
			config.gdScriptVersionConstant,
		);
		await writeFile(scriptPath, updatedScriptContent, "utf8");
		context.logger.log(
			`[semantic-release-godot] Updated GDScript constant "${config.gdScriptVersionConstant}" in "${config.gdScriptPath}" to "${versionName}"`,
		);
	}

	context.logger.success(
		"[semantic-release-godot] Successfully injected version info!",
	);
}
