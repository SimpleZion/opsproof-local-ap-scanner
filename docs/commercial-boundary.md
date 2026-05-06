# Commercial Boundary

This repository is open source so buyers can inspect the local scanner, privacy boundary, deterministic queue logic, and Chinese/English field handling.

中文说明：本仓库公开的是本地扫描器、模拟数据、基础规则和中英文字段处理能力，用来证明工具可本地运行、可检查、不会把用户加载的数据上传到云端。完整商业交付仍然保留在付费包和字段映射服务中。

## Open Source

- Local static scanner.
- Fake sample data.
- Sample HTML reports.
- CSV parsing and report generation.
- Basic field mapping for English and Chinese AP exports.
- Vendor/payee normalization helper.
- Smoke tests.
- Public issue discussions that do not include private finance data.

## 开源部分

- 本地静态扫描器。
- 模拟样例数据。
- 样例 HTML 报告。
- CSV 解析和报告生成。
- 英文和中文 AP 导出字段的基础映射。
- 供应商/收款方名称规范化 helper。
- smoke tests。
- 不包含私人财务数据的公开 issue 讨论。

## Commercial / Not Opened Here

- Customer-specific mappings.
- Setup-service intake and delivery templates.
- Private first-run readiness notes.
- Paid AP control bundle material.
- Advanced customer workflows.
- Future premium rule packs.
- Human review, support, and consulting delivery.

## 商业部分 / 本仓库不公开

- 客户特定字段映射。
- Setup service 的 intake 和交付模板。
- 私有首次运行就绪说明。
- 付费 AP control bundle 材料。
- 高级客户工作流。
- 未来 premium rule packs。
- 人工复核、支持和顾问交付。

## Why This Boundary Exists

The open-source scanner builds trust and creates a useful free entry point. The commercial layer is where a team needs help turning messy AP exports into a repeatable review workflow.

That means the product can stay useful, inspectable, and privacy-first while still leaving room for paid setup and deeper operational assets.

## 为什么要这样划分

开源扫描器负责建立信任和提供可用的免费入口。商业层负责把混乱的 AP 导出字段、供应商别名、首次运行解释和复核流程，变成团队可以重复执行的付款前控制工作流。

这能让产品保持可检查、本地优先和隐私友好，同时仍然保留付费 setup 和更深工作流资产的空间。
