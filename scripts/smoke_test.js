const fs = require("fs");
const path = require("path");
const { buildSampleScan, writeSampleReport } = require("./sample_report_builder");

const root_dir = path.resolve(__dirname, "..");
const sample_scan = buildSampleScan(root_dir);
const generated_sample = writeSampleReport(root_dir);
const namespace = sample_scan.namespace;
const current_parse = sample_scan.current_parse;
const scan_result = sample_scan.scan_result;
const csv_report = sample_scan.csv_report;
const html_report = sample_scan.html_report;
const sample_proof_report = generated_sample.html_report;
const chinese_sample_proof_report = generated_sample.chinese_html_report;
const chinese_current_text = fs.readFileSync(path.join(root_dir, "sample_data", "fake_current_payment_run_zh_headers.csv"), "utf8");
const chinese_history_text = fs.readFileSync(path.join(root_dir, "sample_data", "fake_paid_history_zh_headers.csv"), "utf8");
const chinese_alias_text = fs.readFileSync(path.join(root_dir, "sample_data", "fake_vendor_aliases_zh_headers.csv"), "utf8");
const common_china_current_text = fs.readFileSync(path.join(root_dir, "sample_data", "fake_current_payment_run_common_cn_headers.csv"), "utf8");
const common_china_history_text = fs.readFileSync(path.join(root_dir, "sample_data", "fake_paid_history_common_cn_headers.csv"), "utf8");
const common_china_alias_text = fs.readFileSync(path.join(root_dir, "sample_data", "fake_vendor_aliases_common_cn_headers.csv"), "utf8");
const chinese_current_parse = namespace.csv.parseCsvText(chinese_current_text);
const chinese_history_parse = namespace.csv.parseCsvText(chinese_history_text);
const chinese_alias_parse = namespace.csv.parseCsvText(chinese_alias_text);
const chinese_scan_result = namespace.scanner.runScan(chinese_current_parse, chinese_history_parse, chinese_alias_parse);
const chinese_csv_report = namespace.reports.buildCsvReport(chinese_scan_result, "zh");
const chinese_html_report = namespace.reports.buildHtmlReport(chinese_scan_result, "zh");
const common_china_current_parse = namespace.csv.parseCsvText(common_china_current_text);
const common_china_history_parse = namespace.csv.parseCsvText(common_china_history_text);
const common_china_alias_parse = namespace.csv.parseCsvText(common_china_alias_text);
const common_china_scan_result = namespace.scanner.runScan(common_china_current_parse, common_china_history_parse, common_china_alias_parse);
const header_readiness = namespace.fieldMapping.analyzeHeaderReadiness([
  "vendor_name",
  "invoice_number",
  "amount",
  "invoice_date",
  "payment_id",
  "status",
]);
const blocked_header_readiness = namespace.fieldMapping.analyzeHeaderReadiness([
  "vendor_name",
  "amount",
]);
const chinese_header_readiness = namespace.fieldMapping.analyzeHeaderReadiness([
  "供应商名称",
  "发票号",
  "付款金额",
  "付款日期",
  "付款编号",
  "付款状态",
]);
const common_china_header_readiness = namespace.fieldMapping.analyzeHeaderReadiness([
  "往来单位名称",
  "采购发票号",
  "本次付款金额",
  "业务日期",
  "付款申请单号",
  "付款进度",
]);

const detected_fields = Object.values(scan_result.currentMapping.mapping).filter(Boolean).length;

if (current_parse.rows.length !== 12) {
  throw new Error(`Expected 12 current rows, got ${current_parse.rows.length}`);
}

if (detected_fields < 6) {
  throw new Error(`Expected at least 6 detected fields, got ${detected_fields}`);
}

if (header_readiness.readyCount < 6 || header_readiness.blockedCount !== 0) {
  throw new Error("Expected sample headers to unlock all readiness rules.");
}

if (blocked_header_readiness.blockedCount < 1 || blocked_header_readiness.nextExportRequests.length < 1) {
  throw new Error("Expected incomplete headers to produce blocked rules and next export requests.");
}

if (chinese_header_readiness.mapping.vendor !== "供应商名称" || chinese_header_readiness.mapping.invoice_number !== "发票号" || chinese_header_readiness.mapping.amount !== "付款金额" || chinese_header_readiness.mapping.date !== "付款日期" || chinese_header_readiness.mapping.payment_id !== "付款编号" || chinese_header_readiness.mapping.status !== "付款状态") {
  throw new Error(`Expected Chinese headers to map cleanly, got ${JSON.stringify(chinese_header_readiness.mapping)}`);
}

if (chinese_header_readiness.readyCount < 6 || chinese_header_readiness.blockedCount !== 0) {
  throw new Error("Expected Chinese sample headers to unlock all readiness rules.");
}

if (
  common_china_header_readiness.mapping.vendor !== "往来单位名称" ||
  common_china_header_readiness.mapping.invoice_number !== "采购发票号" ||
  common_china_header_readiness.mapping.amount !== "本次付款金额" ||
  common_china_header_readiness.mapping.date !== "业务日期" ||
  common_china_header_readiness.mapping.payment_id !== "付款申请单号" ||
  common_china_header_readiness.mapping.status !== "付款进度"
) {
  throw new Error(`Expected common China AP headers to map cleanly, got ${JSON.stringify(common_china_header_readiness.mapping)}`);
}

if (common_china_header_readiness.readyCount < 6 || common_china_header_readiness.blockedCount !== 0) {
  throw new Error("Expected common China AP headers to unlock all readiness rules.");
}

if (scan_result.queueCounts.HOLD < 1) {
  throw new Error("Expected at least one HOLD row from sample data.");
}

if (chinese_scan_result.queueCounts.HOLD < 1) {
  throw new Error("Expected at least one HOLD row from Chinese sample data.");
}

if (common_china_scan_result.queueCounts.HOLD < 1) {
  throw new Error("Expected at least one HOLD row from common China AP sample data.");
}

if (!chinese_scan_result.items.some((item) => item.vendor === "上海北辰办公用品有限公司" && item.score >= 85)) {
  throw new Error("Expected Chinese supplier names to survive normalization and duplicate scoring.");
}

if (scan_result.queueCounts.REVIEW < 1) {
  throw new Error("Expected at least one REVIEW row from sample data.");
}

if ((scan_result.mlSummary || {}).scorecardVersion !== "local_unsupervised_signal_v1") {
  throw new Error("Expected ML scorecard version local_unsupervised_signal_v1.");
}

if (!scan_result.mlSignals.every((signal) => signal.scorecardVersion === "local_unsupervised_signal_v1")) {
  throw new Error("Expected every ML signal to carry the scorecard version.");
}

if (!scan_result.items.every((item) => !item.mlSignal || Array.isArray(item.mlSignal.evidence))) {
  throw new Error("Expected ML signal evidence to stay structured inside scan results.");
}

if (!scan_result.items.every((item) => !item.mlSignal || (item.queue === "PASS" ? "CLEAR" : item.queue) === item.mlSignal.queue)) {
  throw new Error("ML signals must mirror, not change, deterministic HOLD/REVIEW/CLEAR queues.");
}

if ((scan_result.buyerDecisionGuidance || {}).status !== "self_serve_ready") {
  throw new Error("Expected complete fake samples to be marked self_serve_ready for buyer guidance.");
}

if (!(scan_result.buyerDecisionGuidance || {}).reasons || scan_result.buyerDecisionGuidance.reasons.length < 3) {
  throw new Error("Expected buyer guidance to include evidence reasons.");
}

if (!csv_report.includes("Historical paid comparison")) {
  throw new Error("Expected CSV report to include historical paid comparison reason.");
}

if (!csv_report.includes("ML scorecard version") || !csv_report.includes("Local unsupervised signal v1")) {
  throw new Error("Expected CSV report to include ML scorecard version.");
}

if (!html_report.includes("Duplicate Payment Risk Report")) {
  throw new Error("Expected HTML report title.");
}

if (!html_report.includes("ML scorecard") || !html_report.includes("Local unsupervised signal v1")) {
  throw new Error("Expected HTML report to include ML scorecard version.");
}

if (!html_report.includes("Self-serve ready") || !html_report.includes("Open USD49 bundle")) {
  throw new Error("Expected HTML report to include buyer decision guidance.");
}

if (!sample_proof_report.includes("Duplicate Payment Risk Report") || !sample_proof_report.includes("HOLD")) {
  throw new Error("Expected fake-sample proof report to include buyer-visible risk output.");
}

const english_report_banned_snippets = [
  "payment_run_export",
  "paid_history",
  "vendor_aliases",
  "historical_paid_comparison",
  "local_unsupervised_signal_v1",
];

english_report_banned_snippets.forEach((snippet) => {
  if (html_report.includes(snippet) || csv_report.includes(snippet) || sample_proof_report.includes(snippet)) {
    throw new Error(`English report leaked buyer-visible code text: ${snippet}`);
  }
});

if (!chinese_sample_proof_report.includes("付款前重复付款风险复核报告") || !chinese_sample_proof_report.includes("当前付款批次中存在完全重复发票")) {
  throw new Error("Expected Chinese fake-sample proof report to include localized risk output.");
}

if (!chinese_csv_report.includes("队列") || !chinese_csv_report.includes("风险分数") || !chinese_csv_report.includes("供应商/收款方") || !chinese_csv_report.includes("当前付款批次中存在完全重复发票")) {
  throw new Error("Expected Chinese CSV report headers and localized reasons.");
}

if (!chinese_html_report.includes("付款前重复付款风险复核报告") || !chinese_html_report.includes("当前付款批次中存在完全重复发票")) {
  throw new Error("Expected Chinese HTML report title and localized reasons.");
}

if (chinese_html_report.includes("Exact duplicate invoice in current run") || chinese_html_report.includes("Matches paid history row")) {
  throw new Error("Chinese HTML report should not leak core English rule reasons.");
}

const chinese_report_banned_snippets = [
  "Language note:",
  "Send only headers",
  "Ask for a first-run",
  "Move to self-serve",
  "fake rows",
  "redacted rows",
  "payment process",
  "paid_history",
  "vendor_aliases",
  "local_unsupervised_signal_v1",
];

chinese_report_banned_snippets.forEach((snippet) => {
  if (chinese_html_report.includes(snippet) || chinese_sample_proof_report.includes(snippet)) {
    throw new Error(`Chinese HTML report leaked buyer-visible English/code text: ${snippet}`);
  }
  if (chinese_csv_report.includes(snippet)) {
    throw new Error(`Chinese CSV report leaked buyer-visible English/code text: ${snippet}`);
  }
});

if (csv_report.includes("PASS") || html_report.includes(">PASS<")) {
  throw new Error("Buyer-visible reports should use CLEAR instead of PASS.");
}

console.log("Smoke test passed");
console.log(`Rows: ${current_parse.rows.length}`);
console.log(`Detected fields: ${detected_fields}`);
console.log(`Queues: HOLD=${scan_result.queueCounts.HOLD}, REVIEW=${scan_result.queueCounts.REVIEW}, CLEAR=${scan_result.queueCounts.PASS}`);
console.log(`Overall risk: ${scan_result.overallRisk}`);
