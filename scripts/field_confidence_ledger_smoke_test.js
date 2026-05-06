const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root_dir = path.resolve(__dirname, "..");
const source_files = ["src/fieldMapping.js", "src/fieldConfidenceLedger.js"];
const context = {
  console,
  window: { DPRS: {} },
};

context.window.window = context.window;
context.DPRS = context.window.DPRS;

source_files.forEach((relative_path) => {
  const code = fs.readFileSync(path.join(root_dir, relative_path), "utf8");
  vm.runInNewContext(code, context, { filename: relative_path });
});

const ledger = context.window.DPRS.fieldConfidenceLedger;

function by_original_field(rows, original_field) {
  return rows.find((row) => row.originalField === original_field);
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

const obvious_rows = ledger.buildFieldConfidenceLedger(["供应商名称", "发票金额", "付款日期"]);
const supplier_name = by_original_field(obvious_rows, "供应商名称");
const invoice_amount = by_original_field(obvious_rows, "发票金额");
const payment_date = by_original_field(obvious_rows, "付款日期");

assert(supplier_name.selectedField === "vendor", `Expected 供应商名称 to select vendor, got ${JSON.stringify(supplier_name)}`);
assert(invoice_amount.selectedField === "amount", `Expected 发票金额 to select amount, got ${JSON.stringify(invoice_amount)}`);
assert(payment_date.selectedField === "date", `Expected 付款日期 to select date, got ${JSON.stringify(payment_date)}`);
assert(!supplier_name.reviewRequired && supplier_name.score >= 90, "Expected 供应商名称 to be high confidence.");
assert(!invoice_amount.reviewRequired && invoice_amount.score >= 90, "Expected 发票金额 to be high confidence.");
assert(!payment_date.reviewRequired && payment_date.score >= 90, "Expected 付款日期 to be high confidence.");

const ambiguous_rows = ledger.buildFieldConfidenceLedger(["金额", "日期", "编号"]);
["金额", "日期", "编号"].forEach((field_name) => {
  const row = by_original_field(ambiguous_rows, field_name);
  assert(row.reviewRequired, `Expected ${field_name} to require review without samples, got ${JSON.stringify(row)}`);
  assert(row.selectedField === "", `Expected ${field_name} to stay unselected without samples, got ${JSON.stringify(row)}`);
});

const supported_rows = ledger.buildFieldConfidenceLedger(["金额", "日期"], [
  { 金额: "1280.50", 日期: "2026-05-01" },
  { 金额: "960.00", 日期: "2026-05-02" },
  { 金额: "320.00", 日期: "2026-05-03" },
]);
const supported_amount = by_original_field(supported_rows, "金额");
const supported_date = by_original_field(supported_rows, "日期");

assert(supported_amount.selectedField === "amount", `Expected numeric samples to support 金额, got ${JSON.stringify(supported_amount)}`);
assert(supported_date.selectedField === "date", `Expected date samples to support 日期, got ${JSON.stringify(supported_date)}`);
assert(!supported_amount.reviewRequired, "Expected supported 金额 to avoid manual review.");
assert(!supported_date.reviewRequired, "Expected supported 日期 to avoid manual review.");

const conflict_rows = ledger.buildFieldConfidenceLedger(["付款日期"], [
  { 付款日期: "1280.50" },
  { 付款日期: "960.00" },
  { 付款日期: "320.00" },
]);
const conflicting_payment_date = by_original_field(conflict_rows, "付款日期");

assert(conflicting_payment_date.reviewRequired, `Expected header/sample conflict to require review, got ${JSON.stringify(conflicting_payment_date)}`);
assert(conflicting_payment_date.selectedField === "", "Expected conflicting 付款日期 to stay unselected.");
assert(
  conflicting_payment_date.topCandidates.some((candidate) => candidate.field === "amount"),
  "Expected conflicting numeric samples to surface amount as a candidate."
);

console.log("Field confidence ledger smoke test passed");
console.log(`Version: ${ledger.version}`);
console.log(`Obvious fields: ${obvious_rows.map((row) => `${row.originalField}->${row.selectedField}:${row.score}`).join(", ")}`);
