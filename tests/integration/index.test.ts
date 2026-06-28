import { afterEach, describe, expect, test } from "bun:test";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { PrepareContext, VerifyConditionsContext } from "semantic-release";
import { prepare, verifyConditions } from "../../src/index.js";

const tempDirs: string[] = [];

afterEach(async () => {
	await Promise.all(
		tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })),
	);
});

interface CapturedLogger {
	readonly logs: string[];
	log(message: string): void;
	success(message: string): void;
	warn(message: string): void;
	error(message: string): void;
}

const makeLogger = (): CapturedLogger => {
	const logs: string[] = [];
	return {
		logs,
		log: (message: string) => logs.push(message),
		success: (message: string) => logs.push(message),
		warn: (message: string) => logs.push(message),
		error: (message: string) => logs.push(message),
	};
};

const makeContext = (root: string, logger: CapturedLogger): PrepareContext =>
	({
		cwd: root,
		env: {},
		logger,
		nextRelease: {
			version: "1.2.3",
			type: "minor",
			gitHead: "abc123",
			gitTag: "v1.2.3",
			name: "v1.2.3",
			channel: "latest",
			notes: "",
		},
	}) as unknown as PrepareContext;

describe("semantic-release-godot lifecycle integration", () => {
	test("verifies conditions and prepares version changes in config files", async () => {
		const root = join(
			tmpdir(),
			`godot-plugin-test-${Date.now()}-${Math.random()}`,
		);
		await mkdir(root, { recursive: true });
		tempDirs.push(root);

		const presetsContent = `[preset.0]
name="Android"
platform="Android"

[preset.0.options]
version/code=1
version/name="0.1.0"
`;
		await writeFile(join(root, "export_presets.cfg"), presetsContent, "utf8");

		const projectGodotContent = `[application]
config/name="Demo Game"
config/version="0.1.0"
`;
		await writeFile(join(root, "project.godot"), projectGodotContent, "utf8");

		const gdScriptContent = `extends Node
const GAME_VERSION = "0.1.0"
`;
		await writeFile(join(root, "Version.gd"), gdScriptContent, "utf8");

		const logger = makeLogger();
		const context = makeContext(root, logger);

		const pluginConfig = {
			exportPresetsPath: "export_presets.cfg",
			projectGodotPath: "project.godot",
			enableApproachA: true,
			enableApproachB: true,
			gdScriptPath: "Version.gd",
			versionCode: 42, // Manual version code to bypass git call in test
		};

		// 1. Verify Conditions
		await verifyConditions(
			pluginConfig,
			context as unknown as VerifyConditionsContext,
		);
		expect(logger.logs).toHaveLength(0);

		// 2. Prepare Version Injection
		await prepare(pluginConfig, context);

		// 3. Verify files updated correctly
		const updatedPresets = await readFile(
			join(root, "export_presets.cfg"),
			"utf8",
		);
		expect(updatedPresets).toContain("version/code=42");
		expect(updatedPresets).toContain('version/name="1.2.3"');

		const updatedProjectGodot = await readFile(
			join(root, "project.godot"),
			"utf8",
		);
		expect(updatedProjectGodot).toContain('config/version="1.2.3"');

		const updatedGDScript = await readFile(join(root, "Version.gd"), "utf8");
		expect(updatedGDScript).toContain('const GAME_VERSION = "1.2.3"');
	});

	test("verifyConditions throws if export_presets.cfg is missing", async () => {
		const root = join(
			tmpdir(),
			`godot-plugin-test-${Date.now()}-${Math.random()}`,
		);
		await mkdir(root, { recursive: true });
		tempDirs.push(root);

		const logger = makeLogger();
		const context = makeContext(root, logger);

		const pluginConfig = {
			exportPresetsPath: "export_presets.cfg",
			versionCode: 42,
		};

		await expect(
			verifyConditions(
				pluginConfig,
				context as unknown as VerifyConditionsContext,
			),
		).rejects.toThrow("export_presets.cfg not found");
	});
});
