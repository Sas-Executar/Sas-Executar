import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

if (!process.env.BASEHUB_TOKEN) {
  process.stdout.write(
    "BASEHUB_TOKEN ausente; CMS externo desativado para este build.\n"
  );
  process.exit(0);
}

const executable = fileURLToPath(
  new URL(
    process.platform === "win32"
      ? "../node_modules/.bin/basehub.cmd"
      : "../node_modules/.bin/basehub",
    import.meta.url
  )
);
const result = spawnSync(executable, ["build"], {
  env: process.env,
  stdio: "inherit",
});

if (result.error) {
  throw result.error;
}

process.exit(result.status ?? 1);
