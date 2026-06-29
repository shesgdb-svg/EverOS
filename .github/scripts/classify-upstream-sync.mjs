import { execFileSync } from "node:child_process";
import { appendFileSync } from "node:fs";

function git(args) {
  return execFileSync("git", args, { encoding: "utf8" }).trim();
}

const base = git(["merge-base", "origin/main", "upstream/main"]);
const files = git(["diff", "--name-only", `${base}..upstream/main`])
  .split("\n")
  .map((line) => line.trim())
  .filter(Boolean);

const commitCount = Number(git(["rev-list", "--count", `${base}..upstream/main`]) || "0");
const hasUpdates = commitCount > 0;

const majorPatterns = [
  /^\.github\/workflows\//,
  /^pyproject\.toml$/,
  /^uv\.lock$/,
  /^config\.example\.toml$/,
  /^src\/everos\/entrypoints\//,
  /^src\/everos\/service\//,
  /^src\/everos\/memory\//,
  /^src\/everos\/infra\/persistence\//,
  /^src\/everos\/infra\/ome\//,
  /^src\/everos\/config\//,
  /^docs\/(architecture|storage_layout|openapi|migration|security)/i,
  /^SECURITY\.md$/,
  /^CHANGELOG\.md$/,
  /(^|\/)migrations?\//,
  /(^|\/)schema\.(py|sql|toml)$/,
];

const matched = files.filter((file) => majorPatterns.some((pattern) => pattern.test(file)));
const tooManyFiles = files.length > 60;
const tooManyCommits = commitCount > 15;
const major = matched.length > 0 || tooManyFiles || tooManyCommits;

const reasons = [];
if (matched.length) {
  reasons.push(`Sensitive files changed:\n${matched.slice(0, 40).map((file) => `- ${file}`).join("\n")}`);
}
if (tooManyFiles) {
  reasons.push(`Large file delta: ${files.length} files changed.`);
}
if (tooManyCommits) {
  reasons.push(`Large commit delta: ${commitCount} commits.`);
}
if (!reasons.length) {
  reasons.push(`Small upstream delta: ${commitCount} commits, ${files.length} files.`);
}

const outputPath = process.env.GITHUB_OUTPUT;
appendFileSync(outputPath, `has_updates=${hasUpdates ? "true" : "false"}\n`);
appendFileSync(outputPath, `major=${major ? "true" : "false"}\n`);
appendFileSync(outputPath, `reason<<EOF\n${reasons.join("\n\n")}\nEOF\n`);
