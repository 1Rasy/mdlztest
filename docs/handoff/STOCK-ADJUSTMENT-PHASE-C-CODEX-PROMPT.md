# 库存调整 Phase C 接手提示词

把下面内容完整发送给 Codex。开始执行前必须先读取仓库文档，不要根据旧聊天或旧审查评论自行恢复过时方案。

---

请接手仓库 `1Rasy/spr` 的 PR #3：`feat: add stock adjustment phase C`，继续在原分支 `feat/stock-adjustment-phase-c` 上工作。

## 一、开始前读取

必须按顺序读取：

1. `docs/status/STOCK-ADJUSTMENT-PHASE-C.md`
2. `docs/handoff/STOCK-ADJUSTMENT-PHASE-C-HANDOFF.md`
3. `docs/decisions/STOCK-ADJUSTMENT-UI-002.md`
4. `docs/decisions/BRANCH-TEST-FILES-001.md`
5. `docs/decisions/IMPLEMENTATION-STATUS-SYNC-001.md`
6. `docs/superpowers/plans/2026-07-12-stock-adjustment-stabilization.md`
7. PR #3 最新描述、最新提交和最新评论

以仓库状态文档和最新 UI 决策为准，不要根据早期审查评论恢复已经被用户否定的界面。

## 二、当前阶段

当前不是继续扩展新功能，而是进入库存调整 Phase C 的稳定性收口阶段。

本轮唯一目标：

1. 验收当前 Vercel 页面；
2. 修复实际复现的问题；
3. 将员工端“先保存、再提交”改成单个原子 RPC；
4. 完整验证员工提交、管理员审核、库存变化和库存流水；
5. 更新测试、状态文档和两个分支。

PR 保持 Draft，不要合并，不要改成 Ready for review。

## 三、当前已确认的员工端规则

必须保持：

- 库存修改入口位于库存管理页；
- 进入修改页时不能先显示库存管理页上跳或闪动；
- 修改页只保留一个返回按钮；
- 商品名称下方不重复显示规格口味行；
- 增加在上、减少在下，竖向排列在数量控件左边；
- 只调整整数散数；
- 散数使用开单页相同的 1–25、5×5 数量弹窗；
- 当前库存和预计库存左对齐；
- 待审核、已驳回、未提交草稿、历史记录、已撤回申请位于页面上方并分开显示；
- 页面主体不提前显示修改原因；
- 点击提交后才弹出原因和备注面板；
- 原因只保留盘点差异、破损报废、调货、其他；
- 不存在“漏录入库”；
- 编辑负数申请时恢复为“减少 + 绝对值散数”；
- 单商品方向和数量变化只更新当前行与摘要，不重新加载整页。

禁止恢复：

- 箱、盒、整件、价格输入；
- 普通数字输入框；
- 增加/减少下拉框；
- 开单首页顶层库存调整入口；
- “漏录入库”原因；
- 与销售、售后、ERP 有关的新范围。

## 四、先做实际页面验收

在 Vercel 测试分支实际检查：

1. 从库存管理页进入库存修改，是否直接切换且无中间跳动；
2. 是否只有一个返回按钮；
3. 申请记录是否在商品列表上方且分组顺序正确；
4. 商品卡片是否没有多余规格口味行；
5. 增加、减少是否上下排列在数量左边；
6. 点击数量是否出现 25 个数字按钮的 5×5 弹窗；
7. 当前库存和预计库存是否左对齐；
8. 原因面板是否只在点击提交后出现；
9. 是否不存在漏录入库；
10. 关闭提交面板后已选商品、方向和数量是否保留。

每项记录 PASS 或 FAIL。发现问题先增加失败测试或写出可重复复现步骤，再修改代码。

## 五、实现原子提交

当前员工端调用：

```text
save_stock_adjustment_request
然后
submit_stock_adjustment_request
```

两个请求之间失败时可能留下半完成草稿。

请按计划新增一个新 migration，例如：

```text
database/20260712_stock_adjustment_atomic_submit.sql
```

新增 RPC：

```text
save_and_submit_stock_adjustment_request
```

它必须在同一个数据库事务内完成：

- 新建或更新申请；
- 替换明细；
- 校验原因和整数散数；
- 提交为待审核；
- 更新版本和提交时间；
- 写入历史；
- 返回完整申请快照。

任何一步失败必须整单回滚，不能留下草稿、部分明细或多余历史。

不要修改已经应用的旧 migration，必须新增 migration。

然后：

- 在 `stock-adjustment-api.js` 增加 `saveAndSubmit(...)`；
- 在 `tests/stock-adjustment-api.test.mjs` 验证它只调用一次 `save_and_submit_stock_adjustment_request`；
- 将 `store-stock-adjustment.js` 的提交逻辑改为只调用一次 `stockAdjustmentApi.saveAndSubmit(...)`；
- 提交失败时保留商品、方向、数量、原因、说明和备注；
- 提交成功后再清空并刷新。

旧的 `save` 和 `submit` API 暂时保留，不要在本轮删除。

## 六、真实业务回归

至少验证：

1. 增加库存申请通过后库存增加并生成一条流水；
2. 减少库存申请通过后库存减少，允许结果为负数；
3. 多商品同时包含增加和减少；
4. 驳回不改库存，编辑重提保留方向、数量、原因和备注；
5. 撤回不改库存，编辑重提成功；
6. 重复提交、重复同意、重复驳回不会产生重复状态或流水；
7. 任一商品失败时整单回滚；
8. 负数申请编辑时正确恢复减少；
9. 其他原因必须填写说明；
10. 库存流水页能查到审核通过产生的流水。

测试数据必须明确标记，并在结束后删除或事务回滚。记录每个场景的请求号、商品、调整前库存、调整后库存、流水数量和清理结果。

## 七、测试

实际运行：

```bash
node --check stock-adjustment-api.js
node --check store-stock-adjustment.js
node --check store-qty-popup.js
node --check stock-adjustment-review.js
node --check inventory-movements-page.js

node --test tests/stock-adjustment-api.test.mjs
node --test tests/stock-adjustment-employee-ui.test.mjs
node --test tests/stock-adjustment-core.test.mjs
node --test tests/stock-adjustment-pages.test.mjs
node --test tests/inventory-movement-export.test.mjs
node --test tests/utf8-source-guard.test.mjs
node --test tests/*.test.mjs
```

必须报告真实命令、通过数、失败数和既有失败。区分静态测试和真实数据库流程，不要用 Vercel 部署成功代替功能测试。

## 八、文档和分支同步

每轮代码修改必须在同一次推送中：

1. 更新测试；
2. 更新 `docs/status/STOCK-ADJUSTMENT-PHASE-C.md`；
3. 必要时更新接手文档和实施计划；
4. 推送 `feat/stock-adjustment-phase-c`；
5. 将 `stock-adjustment-phase-c` 同步到相同提交；
6. 确认两个分支 `status=identical`、`ahead_by=0`、`behind_by=0`；
7. 更新 PR #3 描述中的最新提交和真实测试结果。

源码、`tests/` 和 `docs/` 必须在同一个提交。

## 九、完成后回复

只报告：

- 实际发现的问题；
- 修改的文件；
- 原子提交如何实现；
- 真实业务回归结果；
- 测试命令及通过/失败数量；
- 最新提交；
- 两个分支是否一致；
- 状态文档是否已更新。

不要合并 PR。
