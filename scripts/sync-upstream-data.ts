import { execFileSync } from "node:child_process";

import { importJsonToSqlite } from "../lib/db/importer";

const REMOTE = process.env.PTCG_SYNC_REMOTE ?? "origin";
const BRANCH = process.env.PTCG_SYNC_BRANCH ?? "main";
const TARGETS = ["ptcg_chs_infos.json", "img"];

function git(args: string[]) {
  return execFileSync("git", args, {
    cwd: process.cwd(),
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
}

function hasTargetedChanges(baseRef: string) {
  try {
    git(["diff", "--quiet", baseRef, "--", ...TARGETS]);
    return false;
  } catch {
    return true;
  }
}

function hasLocalTargetedChanges() {
  const output = git(["status", "--porcelain", "--", ...TARGETS]);
  return output.length > 0;
}

async function main() {
  const remoteRef = `${REMOTE}/${BRANCH}`;

  console.log(`Fetching ${remoteRef} ...`);
  git(["fetch", REMOTE, BRANCH]);

  if (!hasTargetedChanges(remoteRef)) {
    console.log("No upstream JSON/image changes detected.");
    return;
  }

  if (hasLocalTargetedChanges()) {
    throw new Error(
      "Local changes exist in ptcg_chs_infos.json or img/. Please commit/stash them before syncing upstream data.",
    );
  }

  console.log(`Updating ${TARGETS.join(", ")} from ${remoteRef} ...`);
  git(["restore", "--source", remoteRef, "--worktree", "--staged", "--", ...TARGETS]);

  console.log("Rebuilding SQLite database ...");
  await importJsonToSqlite();

  console.log("Upstream data sync completed.");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
