const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root_dir = path.resolve(__dirname, "..");
const context = {
  window: { DPRS: {} },
  console,
};
context.window.window = context.window;

const code = fs.readFileSync(path.join(root_dir, "src", "vendorNormalization.js"), "utf8");
vm.runInNewContext(code, context, { filename: "src/vendorNormalization.js" });

const normalization = context.window.DPRS.vendorNormalization;

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

const shanghai_limited = normalization.normalizeVendorName("上海北辰办公用品有限公司");
const shanghai_llc = normalization.normalizeVendorName("上海北辰办公用品有限责任公司");
const beijing_limited = normalization.normalizeVendorName("北京北辰办公用品有限公司");
const short_vendor = normalization.normalizeVendorName("北辰");

assert(shanghai_limited.canonicalKey === "上海北辰办公用品", `unexpected Shanghai canonical: ${JSON.stringify(shanghai_limited)}`);
assert(shanghai_limited.canonicalKey === shanghai_llc.canonicalKey, "Chinese company suffix variants should share a canonical key.");
assert(shanghai_limited.canonicalKey !== beijing_limited.canonicalKey, "Different city-qualified Chinese vendors must not auto-merge.");
assert(shanghai_limited.evidence.some((item) => item.includes("chinese_company_suffix_removed")), "Expected suffix removal evidence.");
assert(short_vendor.reviewRequired, "Short Chinese vendor cores should require review.");

const alias_map = new Map();
alias_map.set(normalization.normalizeVendorKey("深圳蓝峰软件有限责任公司"), normalization.normalizeVendorKey("深圳蓝峰软件有限公司"));
const alias_ledger = normalization.buildVendorEntityLedger("深圳蓝峰软件有限责任公司", alias_map);
assert(alias_ledger.selectedCanonicalVendor === "深圳蓝峰软件", "Alias map exact match should select canonical supplier.");
assert(alias_ledger.candidates[0].evidence.includes("alias_map_exact"), "Alias ledger should explain exact alias-map evidence.");

const match = normalization.explainVendorEntityMatch("上海北辰办公用品有限公司", "上海北辰办公用品有限责任公司", new Map());
assert(match.same, "Suffix-normalized Chinese vendor variants should match.");
assert(match.evidence.includes("canonical_vendor_match"), "Match explanation should include canonical_vendor_match evidence.");

console.log("Vendor normalization smoke test passed");
console.log(`Version: ${normalization.version}`);
console.log(`Shanghai key: ${shanghai_limited.canonicalKey}`);
console.log(`Alias evidence: ${alias_ledger.candidates[0].evidence.join(", ")}`);
