# BRANCH-TEST-FILES-001：Vercel 测试分支必须包含测试目录

状态：已确认

## 决策

1. 用于 Vercel 预览和验收的功能分支必须包含完整的 `tests/` 目录。
2. 应用源码和测试文件必须位于同一个已验证提交，不能只推送页面代码而遗漏测试。
3. 本次库存调整功能在完成验证后，同时更新：
   - PR 分支：`feat/stock-adjustment-phase-c`
   - Vercel 测试分支：`stock-adjustment-phase-c`
4. 两个分支必须指向同一个提交，避免 Vercel 预览内容和 PR 审查内容不一致。
5. 后续创建供 Vercel 验收的功能分支时，继续遵循同样规则。
