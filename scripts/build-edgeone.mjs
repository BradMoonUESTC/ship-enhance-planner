import { cpSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const edgeone = join(root, ".edgeone");
const apiDir = join(edgeone, "cloud-functions", "api-python");
const assetsDir = join(edgeone, "assets");

rmSync(edgeone, { recursive: true, force: true });
mkdirSync(apiDir, { recursive: true });
mkdirSync(assetsDir, { recursive: true });

cpSync(join(root, "dist"), assetsDir, { recursive: true });
cpSync(join(root, "backend", "optimizer.py"), join(apiDir, "optimizer.py"));
cpSync(join(root, "backend", "requirements.txt"), join(apiDir, "requirements.txt"));

writeFileSync(
  join(apiDir, "app.py"),
  `from fastapi import FastAPI\nfrom fastapi.middleware.cors import CORSMiddleware\nfrom pydantic import BaseModel, Field\n\nfrom optimizer import DEFAULT_CAPS, solve_plan\n\n\nclass OptimizeRequest(BaseModel):\n    priority: list[str] = Field(default_factory=lambda: [\"护甲\", \"船耐\", \"转向\", \"横帆\", \"纵帆\", \"抗浪\"])\n    caps: dict[str, int] = Field(default_factory=lambda: DEFAULT_CAPS.copy())\n    start: dict[str, int] = Field(default_factory=dict)\n    steps: int = 7\n    mode: str = \"targetable\"\n    useAllSteps: bool = True\n    timeLimitSeconds: float = 20\n    workers: int = 8\n\n\napp = FastAPI(title=\"Ship Enhance Planner API\")\napp.add_middleware(CORSMiddleware, allow_origins=[\"*\"], allow_credentials=False, allow_methods=[\"*\"], allow_headers=[\"*\"])\n\n\n@app.get(\"/api/health\")\ndef health():\n    return {\"ok\": True}\n\n\n@app.post(\"/api/optimize\")\ndef optimize(request: OptimizeRequest):\n    return solve_plan(request.model_dump())\n`
);

writeFileSync(
  join(apiDir, "config.json"),
  JSON.stringify(
    {
      version: 3,
      routes: [{ src: "^/api/(.*)$" }],
    },
    null,
    2
  )
);

writeFileSync(
  join(edgeone, "config.json"),
  JSON.stringify(
    {
      version: 3,
      routes: [
        { src: "^/api/(.*)$", dest: "/api/$1" },
        { handle: "filesystem" },
        { src: "/.*", dest: "/index.html" },
      ],
    },
    null,
    2
  )
);
