import {readFileSync, writeFileSync} from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

const RELEASE_TYPES = new Set(["patch", "minor", "major"]);

function fail(message) {
	throw new Error(message);
}

function repoRoot() {
	if (process.env.RELEASE_ROOT) return path.resolve(process.env.RELEASE_ROOT);
	return path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
}

export function normalizeVersion(value) {
	const match = /^(\d+)\.(\d+)(?:\.(\d+))?$/.exec(String(value).trim());
	if (!match) return null;
	return `${Number(match[1])}.${Number(match[2])}.${match[3] ? Number(match[3]) : 0}`;
}

export function bumpVersion(version, releaseType) {
	const normalized = normalizeVersion(version);
	if (!normalized) fail(`Cannot bump invalid version: ${version}`);
	if (!RELEASE_TYPES.has(releaseType)) fail(`Invalid release type: ${releaseType}`);

	const [major, minor, patch] = normalized.split(".").map(Number);
	if (releaseType === "major") return `${major + 1}.0.0`;
	if (releaseType === "minor") return `${major}.${minor + 1}.0`;
	return `${major}.${minor}.${patch + 1}`;
}

function replaceOnce(source, pattern, replacement, label) {
	const flags = pattern.flags.includes("g") ? pattern.flags : `${pattern.flags}g`;
	const matches = source.match(new RegExp(pattern.source, flags));
	if (!matches || matches.length !== 1) {
		fail(`${label} matched ${matches ? matches.length : 0} times.`);
	}
	return source.replace(pattern, replacement);
}

function readVersions(root) {
	const packageJsonPath = path.join(root, "package.json");
	const pluginPath = path.join(root, "src", "sd-wp.php");
	const packageJson = readFileSync(packageJsonPath, "utf8");
	const plugin = readFileSync(pluginPath, "utf8");

	const packageMatch = packageJson.match(/"version":\s*"([^"]+)"/);
	const headerMatch = plugin.match(/\* Version:\s*([0-9.]+)/);
	const constantMatch = plugin.match(/define\('SHAPEDIVER_PLUGIN_VERSION',\s*'([^']+)'\)/);
	if (!packageMatch || !headerMatch || !constantMatch) {
		fail("Could not read the current version from package.json and src/sd-wp.php.");
	}

	const versions = [packageMatch[1], headerMatch[1], constantMatch[1]].map(normalizeVersion);
	if (versions.some((version) => !version)) {
		fail(`Version strings must be x.y or x.y.z. Found: ${[packageMatch[1], headerMatch[1], constantMatch[1]].join(", ")}`);
	}
	if (new Set(versions).size !== 1) {
		fail(`package.json and src/sd-wp.php versions differ: ${[packageMatch[1], headerMatch[1], constantMatch[1]].join(", ")}`);
	}

	return {current: versions[0], packageJson, plugin, packageJsonPath, pluginPath};
}

export function applyVersionBump(root, releaseType) {
	const {current, packageJson, plugin, packageJsonPath, pluginPath} = readVersions(root);
	const next = bumpVersion(current, releaseType);

	const nextPackageJson = replaceOnce(
		packageJson,
		/"version":\s*"[^"]+"/,
		`"version": "${next}"`,
		"package.json version",
	);
	let nextPlugin = replaceOnce(plugin, /(\* Version:\s*)[0-9.]+/, `$1${next}`, "plugin header version");
	nextPlugin = replaceOnce(
		nextPlugin,
		/(define\('SHAPEDIVER_PLUGIN_VERSION',\s*')[^']+(')/,
		`$1${next}$2`,
		"plugin version constant",
	);

	writeFileSync(packageJsonPath, nextPackageJson);
	writeFileSync(pluginPath, nextPlugin);
	return {current, next};
}

export function currentVersion(root = repoRoot()) {
	return readVersions(root).current;
}

function setOutput(name, value) {
	if (!process.env.GITHUB_OUTPUT) return;
	writeFileSync(process.env.GITHUB_OUTPUT, `${name}=${value}\n`, {flag: "a"});
}

function main() {
	const releaseType = process.argv[2];
	if (releaseType === "current") {
		console.log(currentVersion());
		return;
	}
	if (!RELEASE_TYPES.has(releaseType)) {
		fail("Usage: node scripts/release/bump-version.mjs <current|patch|minor|major>");
	}

	const {current, next} = applyVersionBump(repoRoot(), releaseType);
	setOutput("version", next);
	console.log(`Bumped version ${current} -> ${next}`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
	main();
}
