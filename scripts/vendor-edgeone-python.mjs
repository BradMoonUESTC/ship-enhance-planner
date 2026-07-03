import { writeFileSync } from "node:fs";
import { execFileSync, spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const apiDir = join(root, "cloud-functions", "api");
const requirementsPath = join(root, "cloud-functions", "requirements.txt");

const dependencyNames = [
  "fastapi",
  "fastapi-*.dist-info",
  "starlette",
  "starlette-*.dist-info",
  "pydantic",
  "pydantic-*.dist-info",
  "pydantic_core",
  "pydantic_core-*.dist-info",
  "typing_extensions.py",
  "typing_extensions-*.dist-info",
  "typing_inspection",
  "typing_inspection-*.dist-info",
  "annotated_types",
  "annotated_types-*.dist-info",
  "anyio",
  "anyio-*.dist-info",
  "idna",
  "idna-*.dist-info",
  "sniffio",
  "sniffio-*.dist-info",
  "ortools",
  "ortools-*.dist-info",
  "absl",
  "absl_py-*.dist-info",
  "numpy",
  "numpy-*.dist-info",
  "numpy.libs",
  "protobuf-*.dist-info",
  "google",
  "immutabledict",
  "immutabledict-*.dist-info",
  "pybind11_abseil",
  "bin",
  "__pycache__",
];

const escapedApiDir = apiDir.replace(/'/g, "'\\''");
execFileSync("bash", [
  "-lc",
  `cd '${escapedApiDir}' && rm -rf ${dependencyNames.join(" ")}`,
]);

const python =
  process.env.PYTHON ||
  (spawnSync("python3", ["--version"], { stdio: "ignore" }).status === 0 ? "python3" : "python");

const packages = [
  "fastapi==0.115.6",
  "starlette==0.41.3",
  "pydantic==2.13.4",
  "pydantic-core==2.46.4",
  "typing-extensions==4.16.0",
  "typing-inspection==0.4.2",
  "annotated-types==0.7.0",
  "anyio==4.14.1",
  "idna==3.18",
  "sniffio==1.3.1",
  "ortools==9.15.6755",
  "absl-py==2.4.0",
  "numpy==2.3.5",
  "protobuf==6.33.6",
  "immutabledict==4.3.1",
];

const pipResult = spawnSync(
  python,
  [
    "-m",
    "pip",
    "install",
    "--disable-pip-version-check",
    "--no-cache-dir",
    "--no-deps",
    "-t",
    apiDir,
    ...packages,
  ],
  {
    stdio: "inherit",
    env: {
      ...process.env,
      PYENV_ROOT: join(root, ".pyenv-build"),
      PYTHONUSERBASE: join(root, ".python-user-base"),
      PIP_NO_WARN_SCRIPT_LOCATION: "0",
      PIP_DISABLE_PIP_VERSION_CHECK: "1",
    },
  }
);

if (pipResult.status !== 0 && pipResult.status !== 126) {
  throw new Error(`pip install failed with exit code ${pipResult.status}`);
}

if (pipResult.status === 126) {
  console.warn("pip install returned 126 after installing packages; continuing after import verification.");
}

execFileSync(
  python,
  [
    "-c",
    "import fastapi; from ortools.sat.python import cp_model; print('python deps ok')",
  ],
  {
    stdio: "inherit",
    env: {
      ...process.env,
      PYTHONPATH: apiDir,
    },
  }
);

execFileSync("bash", ["-lc", `find ${JSON.stringify(apiDir)} -type d -name __pycache__ -prune -exec rm -rf {} +`]);
writeFileSync(requirementsPath, "# Dependencies are vendored by npm run build:edgeone-native.\n");
