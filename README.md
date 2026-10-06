# 企业订单数据中心

基于 Angular 20、Angular Material、NgRx、RxJS 与 Angular CDK 的大型数据表格示例。

## 运行

```bash
export PATH="/Applications/ChatGPT.app/Contents/Resources/cua_node/bin:$PATH"
corepack pnpm install
corepack pnpm dev
```

生产构建：

```bash
corepack pnpm build
```

## 已实现

- 5 万行本地 mock 数据，通过服务类模拟服务端分页、排序、筛选、分组与聚合
- 可嵌套“且 / 或”条件组、全文搜索和字段运算表达式
- CDK 虚拟滚动列表，支持紧凑、标准、宽松三种行高
- 列宽拖拽、列显隐、列排序、列固定
- 行选择、分组统计卡片、树形展开、单元格双击内联编辑
- NgRx 管理查询状态、选择状态、列状态、视图及未提交单元格变更
- 列宽、筛选、排序、分组等保存为视图并写入 localStorage
- 方向键、Enter、Space、Ctrl/Cmd+A、Escape 等键盘操作
- CSV 导出、查询耗时、加载状态与结果统计
- 查询版本化：筛选 / 分组 / 分页每次改动都会让旧查询作废，慢响应乱序返回不会覆盖新条件
- 分页、订单汇总与 CSV 导出共用同一份查询快照，导出不会混用两次查询的结果
- 查询失败时保留上一次可用快照，可从出错的那次请求一键重试（工具栏可注入偶发 / 始终失败）
- 视图保存带 revision 乐观并发：两人同时保存同一视图时，后保存的人先看到双方差异，确认后才覆盖
