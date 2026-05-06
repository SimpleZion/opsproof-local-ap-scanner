const fs = require("fs");
const path = require("path");
const vm = require("vm");

const script_paths = [
  "src/csv.js",
  "src/fieldMapping.js",
  "src/fieldConfidenceLedger.js",
  "src/vendorNormalization.js",
  "src/scanner.js",
  "src/reports.js",
];

function createScannerContext() {
  const context = {
    window: { DPRS: {} },
    console,
    Blob: function Blob(parts) {
      this.parts = parts;
    },
    document: {},
    navigator: {},
  };
  context.window.window = context.window;
  return context;
}

function loadScannerNamespace(root_dir) {
  const context = createScannerContext();
  script_paths.forEach((relative_path) => {
    const code = fs.readFileSync(path.join(root_dir, relative_path), "utf8");
    vm.runInNewContext(code, context, { filename: relative_path });
  });
  return context.window.DPRS;
}

function readSampleCsv(root_dir, file_name) {
  return fs.readFileSync(path.join(root_dir, "sample_data", file_name), "utf8");
}

function buildSampleScan(root_dir, language = "en") {
  const namespace = loadScannerNamespace(root_dir);
  const use_chinese_sample = language === "zh";
  const current_text = readSampleCsv(root_dir, use_chinese_sample ? "fake_current_payment_run_zh_headers.csv" : "fake_current_payment_run.csv");
  const history_text = readSampleCsv(root_dir, use_chinese_sample ? "fake_paid_history_zh_headers.csv" : "fake_paid_history.csv");
  const alias_text = readSampleCsv(root_dir, use_chinese_sample ? "fake_vendor_aliases_zh_headers.csv" : "fake_vendor_aliases.csv");

  const current_parse = namespace.csv.parseCsvText(current_text);
  const history_parse = namespace.csv.parseCsvText(history_text);
  const alias_parse = namespace.csv.parseCsvText(alias_text);
  const scan_result = namespace.scanner.runScan(current_parse, history_parse, alias_parse);

  return {
    namespace,
    current_parse,
    history_parse,
    alias_parse,
    scan_result,
    csv_report: namespace.reports.buildCsvReport(scan_result, language),
    html_report: namespace.reports.buildHtmlReport(scan_result, language),
  };
}

function writeSampleReport(root_dir) {
  const sample_scan = buildSampleScan(root_dir);
  const chinese_sample_scan = buildSampleScan(root_dir, "zh");
  const output_dir = path.join(root_dir, "sample_output");
  const output_path = path.join(output_dir, "sample_duplicate_payment_risk_report.html");
  const chinese_output_path = path.join(output_dir, "sample_duplicate_payment_risk_report_zh.html");
  fs.mkdirSync(output_dir, { recursive: true });
  fs.writeFileSync(output_path, sample_scan.html_report, "utf8");
  fs.writeFileSync(chinese_output_path, chinese_sample_scan.html_report, "utf8");
  return {
    output_path,
    chinese_output_path,
    chinese_html_report: chinese_sample_scan.html_report,
    chinese_scan_result: chinese_sample_scan.scan_result,
    ...sample_scan,
  };
}

module.exports = {
  buildSampleScan,
  loadScannerNamespace,
  writeSampleReport,
};
