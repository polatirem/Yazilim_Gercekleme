import { spawn, spawnSync } from "node:child_process";

const isWindows = process.platform === "win32";
const pythonCommand = isWindows ? "python" : "python3";

// Each service is supervised on its own: if one exits (a crash, or Next.js restarting after a config change)
// it is started again instead of taking the other one down with it.
const services = [
  { name: "API", command: pythonCommand, args: ["-m", "uvicorn", "axiom_api.main:app", "--app-dir", "apps/api", "--host", "127.0.0.1", "--port", "8000", "--reload"] },
  isWindows
    ? { name: "WEB", command: "npm --workspace @axiom/web run dev", args: [], shell: true }
    : { name: "WEB", command: "npm", args: ["--workspace", "@axiom/web", "run", "dev"] },
];

let stopping = false;
const running = new Map();

function start(service) {
  const child = spawn(service.command, service.args, { stdio: "inherit", env: process.env, shell: service.shell || false });
  running.set(service.name, child);
  const startedAt = Date.now();
  child.on("error", error => console.error(`[axiom] ${service.name} başlatılamadı: ${error.message}`));
  child.on("exit", code => {
    running.delete(service.name);
    if (stopping) return;
    // Back off when a service keeps dying immediately (e.g. a syntax error) so the log stays readable.
    const delay = Date.now() - startedAt < 5000 ? 3000 : 500;
    console.error(`[axiom] ${service.name} durdu (çıkış kodu ${code}). ${delay / 1000} sn sonra yeniden başlatılıyor…`);
    setTimeout(() => { if (!stopping) start(service); }, delay);
  });
}

function killTree(child) {
  if (!child.pid) return;
  // On Windows a shell-spawned npm/uvicorn keeps its own children alive unless the whole tree is killed.
  if (isWindows) spawnSync("taskkill", ["/pid", String(child.pid), "/T", "/F"], { stdio: "ignore" });
  else child.kill("SIGTERM");
}

function stop(exitCode = 0) {
  if (stopping) return;
  stopping = true;
  for (const child of running.values()) killTree(child);
  setTimeout(() => process.exit(exitCode), 300).unref();
}

process.on("SIGINT", () => stop(0));
process.on("SIGTERM", () => stop(0));
for (const service of services) start(service);
console.log("[axiom] API http://127.0.0.1:8000 ve web http://localhost:3000 adresinde başlatılıyor (durdurmak için Ctrl+C)");
