# 船只强化规划器

一个用于《大航海时代传说》船只强化的 CP-SAT 规划器。

输入：

- 6 个属性优先级
- 船只强化上限
- 强化次数
- 当前强化值
- 理论可控 / 满滚模式

输出：

- 优先级词典序下的最大理论值
- 每次强化应该放的 4 个材料
- 每步属性变化
- 关键超限点

超限规则按严格模型处理：某属性要超过强化上限时，强化前必须等于 `上限 - 1`，并且本次 4 个材料都必须能强化这个属性。

## 本地运行

```bash
npm install
npm run build
python3 -m pip install -r backend/requirements.txt
python3 -m uvicorn backend.app:app --host 127.0.0.1 --port 5178
```

打开：

```text
http://127.0.0.1:5178
```

## EdgeOne Makers 部署

EdgeOne 官方文档支持从 Git 仓库导入项目，并支持 Python Runtime 云函数。这个项目使用 Vite 前端加 `cloud-functions/api/[[default]].py` FastAPI 云函数：

```bash
npm install
npm run build
```

推荐在 EdgeOne Makers 中使用：

```text
Framework preset: Vite
Build command: npm run build
Output directory: dist
```

后端依赖在 `cloud-functions/requirements.txt`，EdgeOne 会在构建云函数时安装。

如果需要 Build Output API 产物，也可以运行：

```bash
npm run build:edgeone
```

但 EdgeOne 控制台部署推荐优先使用 Vite + `cloud-functions` 源码模式。

## Docker

```bash
docker build -t ship-enhance-planner .
docker run --rm -p 8000:8000 ship-enhance-planner
```

打开：

```text
http://127.0.0.1:8000
```
