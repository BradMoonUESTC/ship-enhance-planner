export const ROWING_STAT = "桨力";
export const STATS = ["护甲", "船耐", "转向", "横帆", "纵帆", "抗浪"];
export const ROWING_STATS = [...STATS, ROWING_STAT];

export const DEFAULT_CAPS = {
  横帆: 105,
  纵帆: 105,
  转向: 40,
  抗浪: 42,
  护甲: 25,
  船耐: 900,
  桨力: 40,
};

const q = "橙";

export const MATERIALS = [
  { category: "备用帆套件", quality: q, gains: { 横帆: [6, 14], 纵帆: [6, 14] } },
  { category: "船帆养护工具", quality: q, gains: { 横帆: [4, 10], 纵帆: [9, 18] } },
  { category: "帆布专用涂料", quality: q, gains: { 横帆: [9, 18], 纵帆: [4, 10] } },
  { category: "控帆绳索套件", quality: q, gains: { 横帆: [5, 10], 纵帆: [5, 10], 转向: [2, 4] } },
  { category: "船舵养护工具", quality: q, gains: { 转向: [4, 7], 船耐: [10, 60] } },
  { category: "舵叶清理工具", quality: q, gains: { 转向: [4, 10] } },
  { category: "甲板养护工具", quality: q, gains: { 护甲: [3, 5], 船耐: [10, 60] } },
  { category: "船体防污涂料", quality: q, gains: { 护甲: [3, 7] } },
  { category: "减摇水舱", quality: q, gains: { 抗浪: [5, 10] } },
  { category: "船体防水涂料", quality: q, gains: { 抗浪: [3, 6], 护甲: [2, 3] } },
  { category: "船体养护工具", quality: q, gains: { 抗浪: [2, 4], 护甲: [2, 3], 船耐: [10, 40] } },
  { category: "船体防腐涂料", quality: q, gains: { 抗浪: [2, 6], 船耐: [30, 80] } },
  { category: "船底覆铜套件", quality: q, gains: { 转向: [3, 5], 抗浪: [2, 6] } },
  { category: "船尾回廊", quality: q, gains: { 护甲: [2, 4], 船耐: [25, 95] } },
  { category: "龙骨维护工具", quality: q, gains: { 船耐: [80, 180] } },
];
