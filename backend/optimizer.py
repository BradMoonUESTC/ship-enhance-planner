from __future__ import annotations

from dataclasses import dataclass
from typing import Dict, List, Tuple

from ortools.sat.python import cp_model


STATS = ["护甲", "船耐", "转向", "横帆", "纵帆", "抗浪"]
ALL_STATS = ["横帆", "纵帆", "转向", "抗浪", "护甲", "船耐"]
ROWING_STAT = "桨力"
DEFAULT_CAPS = {
    "横帆": 105,
    "纵帆": 105,
    "转向": 40,
    "抗浪": 42,
    "护甲": 25,
    "船耐": 900,
    ROWING_STAT: 0,
}


@dataclass(frozen=True)
class Material:
    category: str
    quality: str
    gains: Dict[str, Tuple[int, int]]

    @property
    def name(self) -> str:
        return f"{self.category}（{self.quality}）"


def active_stats(has_rowing: bool) -> List[str]:
    return ALL_STATS + ([ROWING_STAT] if has_rowing else [])


def priority_stats(has_rowing: bool) -> List[str]:
    return STATS + ([ROWING_STAT] if has_rowing else [])


def build_materials(has_rowing: bool) -> List[Material]:
    orange = "橙"
    materials = [
        Material("备用帆套件", orange, {"横帆": (6, 14), "纵帆": (6, 14)}),
        Material("船帆养护工具", orange, {"横帆": (4, 10), "纵帆": (9, 18)}),
        Material("帆布专用涂料", orange, {"横帆": (9, 18), "纵帆": (4, 10)}),
        Material("控帆绳索套件", orange, {"横帆": (5, 10), "纵帆": (5, 10), "转向": (2, 4)}),
        Material("船舵养护工具", orange, {"转向": (4, 7), "船耐": (10, 60)}),
        Material("舵叶清理工具", orange, {"转向": (4, 10)}),
        Material("甲板养护工具", orange, {"护甲": (3, 5), "船耐": (10, 60)}),
        Material("船体防污涂料", orange, {"护甲": (3, 7)}),
        Material("减摇水舱", orange, {"抗浪": (5, 10)}),
        Material("船体防水涂料", orange, {"抗浪": (3, 6), "护甲": (2, 3)}),
        Material("船体养护工具", orange, {"抗浪": (2, 4), "护甲": (2, 3), "船耐": (10, 40)}),
        Material("船体防腐涂料", orange, {"抗浪": (2, 6), "船耐": (30, 80)}),
        Material("船底覆铜套件", orange, {"转向": (3, 5), "抗浪": (2, 6)}),
        Material("船尾回廊", orange, {"护甲": (2, 4), "船耐": (25, 95)}),
        Material("龙骨维护工具", orange, {"船耐": (80, 180)}),
    ]
    if has_rowing:
        materials.extend([
            Material("划船辅助套件", orange, {ROWING_STAT: (3, 7), "转向": (2, 4)}),
            Material("备用桨套件", orange, {ROWING_STAT: (5, 11)}),
        ])
    return materials


def complete_priority(priority: List[str], stats: List[str], fallback: List[str]) -> List[str]:
    ordered = []
    for stat in priority:
        if stat not in stats:
            raise ValueError(f"未知属性：{stat}")
        if stat not in ordered:
            ordered.append(stat)
    for stat in fallback:
        if stat not in ordered:
            ordered.append(stat)
    return ordered


def mode_bounds(mode: str, low: int, high: int) -> Tuple[int, int]:
    if mode == "targetable":
        return low, high
    if mode == "max":
        return high, high
    if mode == "min":
        return low, low
    raise ValueError(f"未知滚值模式：{mode}")


def solve_plan(payload: dict) -> dict:
    has_rowing = bool(payload.get("hasRowing", False))
    stats = active_stats(has_rowing)
    priority = complete_priority(
        payload.get("priority") or ["护甲", "船耐", "转向", "横帆", "纵帆", "抗浪"],
        stats,
        priority_stats(has_rowing),
    )
    caps = {**DEFAULT_CAPS, **{k: int(v) for k, v in (payload.get("caps") or {}).items()}}
    start = {stat: int((payload.get("start") or {}).get(stat, 0)) for stat in stats}
    steps = int(payload.get("steps") or 7)
    mode = payload.get("mode") or "targetable"
    use_all_steps = bool(payload.get("useAllSteps", True))
    time_limit = float(payload.get("timeLimitSeconds") or 20)
    materials = build_materials(has_rowing)

    model = cp_model.CpModel()
    stat_upper = {
        stat: start[stat] + steps * sum(
            sorted([m.gains.get(stat, (0, 0))[1] for m in materials], reverse=True)[:4]
        )
        for stat in stats
    }

    before = {}
    after = {}
    active = {}
    selected = {}
    gain = {}
    gain_active = {}
    stat_open = {}
    stat_over_after = {}
    stat_crossing = {}

    for t in range(steps):
        active[t] = model.NewBoolVar(f"active_{t}")
        if use_all_steps:
            model.Add(active[t] == 1)

        for stat in stats:
            before[t, stat] = model.NewIntVar(0, stat_upper[stat], f"before_{t}_{stat}")
            after[t, stat] = model.NewIntVar(0, stat_upper[stat], f"after_{t}_{stat}")
            if t == 0:
                model.Add(before[t, stat] == start[stat])
            else:
                model.Add(before[t, stat] == after[t - 1, stat])
            stat_open[t, stat] = model.NewBoolVar(f"open_{t}_{stat}")
            model.Add(before[t, stat] <= caps[stat] - 1).OnlyEnforceIf(stat_open[t, stat])
            model.Add(before[t, stat] >= caps[stat]).OnlyEnforceIf(stat_open[t, stat].Not())
            stat_over_after[t, stat] = model.NewBoolVar(f"over_after_{t}_{stat}")
            model.Add(after[t, stat] >= caps[stat] + 1).OnlyEnforceIf(stat_over_after[t, stat])
            model.Add(after[t, stat] <= caps[stat]).OnlyEnforceIf(stat_over_after[t, stat].Not())
            stat_crossing[t, stat] = model.NewBoolVar(f"crossing_{t}_{stat}")
            model.Add(stat_crossing[t, stat] <= stat_open[t, stat])
            model.Add(stat_crossing[t, stat] <= stat_over_after[t, stat])
            model.Add(stat_crossing[t, stat] >= stat_open[t, stat] + stat_over_after[t, stat] - 1)
            model.Add(before[t, stat] == caps[stat] - 1).OnlyEnforceIf(stat_crossing[t, stat])

        for i, material in enumerate(materials):
            selected[t, i] = model.NewBoolVar(f"pick_{t}_{i}")
            for stat in stats:
                raw_low, raw_high = material.gains.get(stat, (0, 0))
                low, high = mode_bounds(mode, raw_low, raw_high)
                gain[t, i, stat] = model.NewIntVar(0, high, f"gain_{t}_{i}_{stat}")
                gain_active[t, i, stat] = model.NewBoolVar(f"gain_active_{t}_{i}_{stat}")
                model.Add(gain_active[t, i, stat] <= selected[t, i])
                model.Add(gain_active[t, i, stat] <= stat_open[t, stat])
                model.Add(gain_active[t, i, stat] >= selected[t, i] + stat_open[t, stat] - 1)
                model.Add(gain[t, i, stat] >= low * gain_active[t, i, stat])
                model.Add(gain[t, i, stat] <= high * gain_active[t, i, stat])

        model.Add(sum(selected[t, i] for i in range(len(materials))) == 4 * active[t])
        for category in sorted({m.category for m in materials}):
            model.Add(sum(selected[t, i] for i, m in enumerate(materials) if m.category == category) <= 1)
        for stat in stats:
            model.Add(after[t, stat] == before[t, stat] + sum(gain[t, i, stat] for i in range(len(materials))))
            model.Add(
                sum(
                    selected[t, i]
                    for i, material in enumerate(materials)
                    if material.gains.get(stat, (0, 0))[1] > 0
                )
                == 4
            ).OnlyEnforceIf(stat_crossing[t, stat])

    solver = cp_model.CpSolver()
    solver.parameters.max_time_in_seconds = time_limit
    solver.parameters.num_search_workers = int(payload.get("workers") or 8)

    status = cp_model.UNKNOWN
    locked = {}
    for stat in priority:
        model.Maximize(after[steps - 1, stat])
        status = solver.Solve(model)
        if status not in (cp_model.OPTIMAL, cp_model.FEASIBLE):
            return {"status": "INFEASIBLE", "message": "没有找到可行方案"}
        value = solver.Value(after[steps - 1, stat])
        locked[stat] = value
        model.Add(after[steps - 1, stat] == value)

    if not use_all_steps:
        model.Minimize(sum(active[t] for t in range(steps)))
        status = solver.Solve(model)

    status_name = "OPTIMAL" if status == cp_model.OPTIMAL else "FEASIBLE"
    final = {stat: solver.Value(after[steps - 1, stat]) for stat in stats}
    plan_steps = []
    for t in range(steps):
        if solver.Value(active[t]) == 0:
            continue
        picked = []
        step_gain = {stat: 0 for stat in stats}
        for i, material in enumerate(materials):
            if not solver.Value(selected[t, i]):
                continue
            gains = {}
            for stat in stats:
                value = solver.Value(gain[t, i, stat])
                if value:
                    gains[stat] = {
                        "value": value,
                        "range": list(material.gains[stat]),
                    }
                    step_gain[stat] += value
            picked.append({"name": material.name, "category": material.category, "gains": gains})
        plan_steps.append({
            "index": len(plan_steps) + 1,
            "before": {stat: solver.Value(before[t, stat]) for stat in stats},
            "after": {stat: solver.Value(after[t, stat]) for stat in stats},
            "gain": step_gain,
            "materials": picked,
        })

    key_points = []
    for step in plan_steps:
        for stat in priority:
            if step["before"][stat] < caps[stat] < step["after"][stat]:
                key_points.append(f"第 {step['index']} 次：{stat} 从 {step['before'][stat]} 冲过上限 {caps[stat]} 到 {step['after'][stat]}")

    return {
        "status": status_name,
        "priority": priority,
        "caps": caps,
        "start": start,
        "steps": plan_steps,
        "final": final,
        "locked": locked,
        "keyPoints": key_points,
        "mode": mode,
        "hasRowing": has_rowing,
    }
