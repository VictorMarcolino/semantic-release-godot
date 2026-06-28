export default {
	branches: ["main", { name: "next", prerelease: true }],
	plugins: [
		"@semantic-release/commit-analyzer",
		"@semantic-release/release-notes-generator",
		[
			"@marcolino/semantic-release-godot",
			{
				exportPresetsPath: "export_presets.cfg",
				projectGodotPath: "project.godot",
				enableApproachA: true,
				enableApproachB: true,
				gdScriptPath: "res://scripts/Version.gd",
			},
		],
		[
			"@semantic-release/git",
			{
				assets: [
					"export_presets.cfg",
					"project.godot",
					"scripts/Version.gd",
				],
				message:
					"chore(release): ${nextRelease.version} [skip ci]\n\n${nextRelease.notes}",
			},
		],
		"@semantic-release/github",
	],
};
