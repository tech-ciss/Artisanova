import { copyFileSync, constants, existsSync } from "node:fs";
import { spawnSync } from "node:child_process";

if (process.env.NODE_ENV === "production") throw new Error("Le setup de démonstration est réservé au développement.");
if (!existsSync(".env")) copyFileSync(".env.example", ".env", constants.COPYFILE_EXCL);

function run(command, args) {
  const result = spawnSync(command, args, { stdio: "inherit" });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}
run("docker", ["compose", "up", "-d", "--wait"]);
run("npm", ["run", "db:generate"]);
run("npm", ["run", "db:migrate"]);
run("npm", ["run", "db:seed"]);
