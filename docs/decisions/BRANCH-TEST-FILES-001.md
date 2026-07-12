# BRANCH-TEST-FILES-001：Vercel 测试分支必须包含测试与进度文档

状态：已确认

## 决策

1. 用于 Vercel 预览和验收的功能分支必须包含完整的 `tests/` 目录。
2. 应用源码、测试文件和对应的 `docs` 进度文档必须位于同一个已验证提交。
3. 不能只推送页面代码而遗漏测试或进度记录。
4. 本次库存调整功能在完成验证后，同时更新：
   - PR 分支：`feat/stock-adjustment-phase-c`
   - Vercel 测试分支：`stock-adjustment-phase-c`
5. 两个分支必须指向同一个提交，避免 Vercel 预览、PR 审查和仓库进度记录不一致。
6. 库存调整统一进度入口为：
   - `docs/status/STOCK-ADJUSTMENT-PHASE-C.md`
7. 后续创建供 Vercel 验收的功能分支时，继续遵循同样规则：源码、测试、决策和状态文档一起提交。