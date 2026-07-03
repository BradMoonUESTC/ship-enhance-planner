from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field
from pathlib import Path

from backend.optimizer import DEFAULT_CAPS, solve_plan


class OptimizeRequest(BaseModel):
    priority: list[str] = Field(default_factory=lambda: ["护甲", "船耐", "转向", "横帆", "纵帆", "抗浪"])
    caps: dict[str, int] = Field(default_factory=lambda: DEFAULT_CAPS.copy())
    start: dict[str, int] = Field(default_factory=dict)
    steps: int = 7
    mode: str = "targetable"
    hasRowing: bool = False
    useAllSteps: bool = True
    timeLimitSeconds: float = 20
    workers: int = 8


app = FastAPI(title="Ship Enhance Planner")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
def health():
    return {"ok": True}


@app.post("/api/optimize")
def optimize(request: OptimizeRequest):
    return solve_plan(request.model_dump())


DIST_DIR = Path(__file__).resolve().parent.parent / "dist"
if DIST_DIR.exists():
    app.mount("/assets", StaticFiles(directory=DIST_DIR / "assets"), name="assets")


@app.get("/{path:path}")
def index(path: str):
    index_file = DIST_DIR / "index.html"
    if index_file.exists():
        return FileResponse(index_file)
    return {"message": "Frontend has not been built yet."}
