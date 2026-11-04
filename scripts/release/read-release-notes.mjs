import {existsSync, readFileSync, writeFileSync} from "node:fs";
import os from "node:os";
import path from "node:path";
import {fileURLToPath} from "node:url";

function fail(message) {
	throw new Error(message);
}

function repoRoot() {
	if (process.env.RELEASE_ROOT) return path.resolve(process.env.RELEASE_ROOT);
	return path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
}

function setOutput(name, value) {
	if (process.env.GITHUB_OUTPUT) {
		writeFileSync(process.env.GITHUB_OUTPUT, `${name}<<EOF\n${value}\nEOF\n`, {flag: "a"});
	} else {
		console.log(`${name}=${value}`);
	}
}

function expectedNotesPath(version) {
	return `.github/release-notes/wordpress-plugin-${version}.md`;
}

export function readReleaseNotes(root, version, releaseType, notesFile) {
	const normalizedVersion = String(version).trim();
	if (!/^\d+\.\d+\.\d+$/.test(normalizedVersion)) {
		fail(`version must be x.y.z. Found: ${version}`);
	}

	const requested = String(notesFile ?? "").trim().replaceAll("\\", "/");
	if (!requested) {
		if (releaseType !== "patch") {
			fail(`release_notes_file is required for ${releaseType} releases. Commit ${expectedNotesPath(normalizedVersion)} and pass that path.`);
		}
		return {
			title: `WordPress Plugin ${normalizedVersion}`,
			body: "",
		};
	}

	const expected = expectedNotesPath(normalizedVersion);
	if (requested !== expected) {
		fail(`release_notes_file must be ${expected}`);
	}

	const absolute = path.join(root, ...expected.split("/"));
	if (!existsSync(absolute)) {
		fail(`release_notes_file does not exist: ${expected}. Commit it before running the release.`);
	}

	const source = readFileSync(absolute, "utf8");
	if (!source.trim()) {
		fail(`release_notes_file must not be empty: ${expected}`);
	}

	const titleMatch = source.match(/^#\s+(.+?)\s*$/m);
	if (!titleMatch || !titleMatch[1].trim()) {
		fail("release_notes_file must contain a first-level Markdown heading, e.g. '# WordPress Plugin 1.12.0'.");
	}

	const title = titleMatch[1].trim();
	if (!title.includes(normalizedVersion)) {
		fail(`Release title must include version ${normalizedVersion}. Found: ${title}`);
	}

	const body = source.replace(/^#\s+.+?\s*\r?$/m, "").replace(/^\s*\r?\n/, "");
	return {title, body};
}

function main() {
	const version = process.env.VERSION;
	const releaseType = process.env.RELEASE_TYPE;
	const notesFile = process.env.RELEASE_NOTES_FILE;
	if (!version || !releaseType) {
		fail("VERSION and RELEASE_TYPE are required.");
	}

	const {title, body} = readReleaseNotes(repoRoot(), version, releaseType, notesFile);
	const bodyPath = path.join(process.env.RUNNER_TEMP || os.tmpdir(), "wordpress-plugin-release-body.md");
	writeFileSync(bodyPath, body);
	setOutput("title", title);
	setOutput("body_path", bodyPath);
	console.log(`Release title: ${title}`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
	main();
}
