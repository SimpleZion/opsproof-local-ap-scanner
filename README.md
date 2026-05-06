# OpsProof Local AP Scanner

Local-first duplicate-payment risk scanner for accounts payable payment-run exports.

中文说明见 [README.zh-CN.md](README.zh-CN.md).

![Scanner first view](docs/assets/scanner-first-view.png)

## What This Is

OpsProof Local AP Scanner is a static browser tool for reviewing fake, redacted, or local AP CSV exports before a payment run goes out.

It is designed for bookkeepers, SMB controllers, finance operations teams, and AP consultants who want an explainable HOLD / REVIEW / CLEAR queue without sending payment data to a cloud service.

The first path requires no Python, no ERP login, no bank connection, and no server.

## Try It

1. Download or clone this repository.
2. Open `index.html` directly in Chrome or Edge.
3. Click `Load fake samples and run`.
4. Review HOLD / REVIEW / CLEAR.
5. Download the CSV or HTML report.

You can also inspect the bundled fake-data report first:

- [English sample report](sample_output/sample_duplicate_payment_risk_report.html)
- [Chinese sample report](sample_output/sample_duplicate_payment_risk_report_zh.html)

Live entry points:

- Live scanner and website: [tools.simplezion.com](https://tools.simplezion.com/)
- Free proof pack: [Payhip free pack](https://payhip.com/b/6UYfe)
- Paid self-serve bundle: [AP Control Evidence Bundle](https://payhip.com/b/n6oUD)
- Setup service: [AP CSV mapping and first-run review](https://tools.simplezion.com/setup-service/)

## Supported Inputs

- Current payment-run CSV.
- Optional paid-history CSV.
- Optional vendor alias CSV.
- Header-only checks before sharing any rows.
- English AP field names.
- Chinese AP field names, including common China-style export headers such as `供应商名称`, `往来单位名称`, `采购发票号`, `本次付款金额`, `业务日期`, and `付款申请单号`.

## Included Checks

- Exact duplicate invoice in the current run.
- Normalized invoice match after punctuation, spacing, and case cleanup.
- Same vendor + same amount + near-date review.
- Duplicate current-run row signatures.
- Historical paid comparison when paid-history data is provided.
- Vendor/payee alias review.
- Local, explainable anomaly signals that never override the deterministic queue.

## Privacy Boundary

This repository is designed around a local-first review path:

- No ERP login.
- No bank connection.
- No account login.
- No cloud upload for the scanner workflow.
- No storage writes.
- Network APIs are blocked inside the page after startup.

Use fake, sample, redacted, or header-only exports first. Do not paste private vendor, bank, tax, payroll, customer, or payment-card data into any public issue.

## Tests

Run:

```powershell
npm test
```

The smoke tests validate English and Chinese field mapping, Chinese supplier-name normalization, HOLD / REVIEW / CLEAR output, report generation, and the local signal evidence contract.

## Open-Core Boundary

This repository is the open-source proof layer. It is intentionally useful on its own, but it is not the full commercial AP review workflow.

Paid/commercial work may include deeper review packs, field-mapping service, first-run readiness notes, private customer-specific mappings, advanced rule packs, consultant workflow material, and support.

See [Commercial Boundary](docs/commercial-boundary.md).

## Not Accounting Advice

This tool is not an accounting approval workflow, audit opinion, fraud guarantee, payment approval system, ERP connector, bank connector, or legal/tax service. It produces review evidence for human AP review.
