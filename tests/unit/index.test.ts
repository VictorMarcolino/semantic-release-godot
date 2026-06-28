import { describe, expect, test } from "bun:test";
import {
	parseGodotConfig,
	stringifyGodotConfig,
	updateExportPresets,
	updateGDScript,
	updateProjectGodot,
} from "../../src/index.js";

describe("Godot Config Helpers", () => {
	test("parse and stringify preserves content and updates keys", () => {
		const raw = `[preset.0]

name="Android"
platform="Android"
runnable=true

[preset.0.options]

version/code=22
version/name="1.0.0"
`;
		const sections = parseGodotConfig(raw);
		expect(sections).toHaveLength(3); // default empty section, preset.0, preset.0.options
		expect(sections[1]?.name).toBe("preset.0");
		expect(sections[2]?.name).toBe("preset.0.options");

		const rebuilt = stringifyGodotConfig(sections);
		expect(rebuilt.trim()).toBe(raw.trim());
	});

	test("updateExportPresets modifies Android preset options", () => {
		const raw = `[preset.0]
name="Android"
platform="Android"

[preset.0.options]
version/code=22
version/name="1.0.0"

[preset.1]
name="Windows Desktop"
platform="Windows Desktop"

[preset.1.options]
application/file_version="1.0.0"
`;
		const result = updateExportPresets(raw, "1.2.3", 45);
		expect(result).toContain("version/code=45");
		expect(result).toContain('version/name="1.2.3"');
		expect(result).toContain('application/file_version="1.0.0"'); // unaffected
	});

	test("updateProjectGodot updates the application version", () => {
		const raw = `[application]
config/name="Demo Game"
config/version="1.0.0"
`;
		const result = updateProjectGodot(raw, "1.2.3");
		expect(result).toContain('config/version="1.2.3"');
	});

	test("updateGDScript updates GDScript GAME_VERSION constant", () => {
		const raw = `extends Node
const GAME_VERSION = "1.0.0"
`;
		const result = updateGDScript(raw, "1.2.3");
		expect(result).toContain('const GAME_VERSION = "1.2.3"');
	});

	test("updateGDScript supports type hints and single quotes", () => {
		const raw = `extends Node
const GAME_VERSION: String = '1.0.0'
`;
		const result = updateGDScript(raw, "1.2.3");
		expect(result).toContain("const GAME_VERSION: String = '1.2.3'");
	});
});
