import React, { useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { ArrowDown, ArrowUp, Calculator, Loader2, RotateCcw, ShipWheel } from "lucide-react";
import { DEFAULT_CAPS, STATS } from "./materials.js";
import "./styles.css";

const defaultPriority = ["护甲", "船耐", "转向", "横帆", "纵帆", "抗浪"];
const apiBase = import.meta.env.VITE_API_BASE ?? "";

function emptyStats(value = 0) {
  return Object.fromEntries(STATS.map((stat) => [stat, value]));
}

function moveItem(items, index, direction) {
  const next = [...items];
  const target = index + direction;
  if (target < 0 || target >= next.length) return next;
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}

function formatGain(step) {
  return STATS.filter((stat) => step.gain[stat] > 0)
    .map((stat) => `${stat}+${step.gain[stat]}`)
    .join("，");
}

function App() {
  const [priority, setPriority] = useState(defaultPriority);
  const [caps, setCaps] = useState(DEFAULT_CAPS);
  const [start, setStart] = useState(emptyStats(0));
  const [steps, setSteps] = useState(7);
  const [mode, setMode] = useState("targetable");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const priorityText = useMemo(() => priority.join(" > "), [priority]);

  async function run() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`${apiBase}/api/optimize`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          priority,
          caps,
          start,
          steps: Number(steps),
          mode,
          useAllSteps: true,
          timeLimitSeconds: 30,
        }),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      if (data.status === "INFEASIBLE") throw new Error(data.message || "没有找到可行方案");
      setResult(data);
    } catch (err) {
      setError(err.message || "计算失败");
    } finally {
      setLoading(false);
    }
  }

  function reset() {
    setPriority(defaultPriority);
    setCaps(DEFAULT_CAPS);
    setStart(emptyStats(0));
    setSteps(7);
    setMode("targetable");
    setResult(null);
    setError("");
  }

  return (
    <main className="shell">
      <section className="workspace">
        <aside className="panel controls">
          <div className="brand">
            <ShipWheel size={24} />
            <div>
              <h1>船只强化规划器</h1>
              <p>CP-SAT 词典序最优</p>
            </div>
          </div>

          <div className="field">
            <label>强化次数</label>
            <input value={steps} min="1" max="12" type="number" onChange={(event) => setSteps(event.target.value)} />
          </div>

          <div className="field">
            <label>滚值模式</label>
            <div className="segmented">
              <button className={mode === "targetable" ? "active" : ""} onClick={() => setMode("targetable")}>理论可控</button>
              <button className={mode === "max" ? "active" : ""} onClick={() => setMode("max")}>满滚</button>
            </div>
          </div>

          <div className="field">
            <label>优先级</label>
            <div className="priority-list">
              {priority.map((stat, index) => (
                <div className="priority-row" key={stat}>
                  <span className="rank">{index + 1}</span>
                  <strong>{stat}</strong>
                  <button aria-label={`${stat} 上移`} onClick={() => setPriority(moveItem(priority, index, -1))}><ArrowUp size={16} /></button>
                  <button aria-label={`${stat} 下移`} onClick={() => setPriority(moveItem(priority, index, 1))}><ArrowDown size={16} /></button>
                </div>
              ))}
            </div>
          </div>

          <div className="field">
            <label>强化上限</label>
            <div className="stat-grid">
              {STATS.map((stat) => (
                <label className="number-field" key={stat}>
                  <span>{stat}</span>
                  <input value={caps[stat]} type="number" onChange={(event) => setCaps({ ...caps, [stat]: Number(event.target.value) })} />
                </label>
              ))}
            </div>
          </div>

          <div className="field">
            <label>当前强化值</label>
            <div className="stat-grid">
              {STATS.map((stat) => (
                <label className="number-field" key={stat}>
                  <span>{stat}</span>
                  <input value={start[stat]} type="number" onChange={(event) => setStart({ ...start, [stat]: Number(event.target.value) })} />
                </label>
              ))}
            </div>
          </div>

          <div className="actions">
            <button className="primary" onClick={run} disabled={loading}>
              {loading ? <Loader2 className="spin" size={18} /> : <Calculator size={18} />}
              计算强化顺序
            </button>
            <button className="icon-button" aria-label="重置" onClick={reset}><RotateCcw size={18} /></button>
          </div>
        </aside>

        <section className="results">
          <div className="summary-bar">
            <div>
              <span>当前排序</span>
              <strong>{priorityText}</strong>
            </div>
            <div>
              <span>材料</span>
              <strong>橙色材料 / 每次 4 类</strong>
            </div>
            <div>
              <span>规则</span>
              <strong>超限前必须卡到上限 - 1</strong>
            </div>
          </div>

          {error && <div className="error">{error}</div>}

          {!result && !error && (
            <div className="empty">
              <h2>等待计算</h2>
              <p>输入参数后生成最大理论值、材料顺序和关键超限点。</p>
            </div>
          )}

          {result && (
            <>
              <section className="panel">
                <div className="section-title">
                  <h2>最大理论值</h2>
                  <span>{result.status} · {result.mode === "max" ? "满滚" : "理论可控"}</span>
                </div>
                <div className="final-grid">
                  {priority.map((stat, index) => (
                    <div className="stat-card" key={stat}>
                      <span>{index + 1}. {stat}</span>
                      <strong>{result.final[stat]}</strong>
                      <small>上限 {result.caps[stat]} / {result.final[stat] - result.caps[stat] >= 0 ? "+" : ""}{result.final[stat] - result.caps[stat]}</small>
                    </div>
                  ))}
                </div>
              </section>

              <section className="panel">
                <div className="section-title">
                  <h2>关键点</h2>
                  <span>{result.keyPoints.length} 个</span>
                </div>
                <div className="keypoints">
                  {result.keyPoints.map((point) => <p key={point}>{point}</p>)}
                </div>
              </section>

              <section className="timeline">
                {result.steps.map((step) => (
                  <article className="step" key={step.index}>
                    <header>
                      <div>
                        <span>第 {step.index} 次</span>
                        <strong>{formatGain(step)}</strong>
                      </div>
                      <p>{priority.map((stat) => `${stat} ${step.before[stat]}→${step.after[stat]}`).join(" / ")}</p>
                    </header>
                    <div className="material-grid">
                      {step.materials.map((material) => (
                        <div className="material" key={material.name}>
                          <strong>{material.name}</strong>
                          <span>
                            {Object.entries(material.gains).map(([stat, gain]) => `${stat}+${gain.value}`).join("，") || "属性已封顶"}
                          </span>
                        </div>
                      ))}
                    </div>
                  </article>
                ))}
              </section>
            </>
          )}
        </section>
      </section>
    </main>
  );
}

createRoot(document.getElementById("root")).render(<App />);
