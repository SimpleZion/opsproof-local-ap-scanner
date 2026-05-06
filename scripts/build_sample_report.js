const path = require("path");
const { writeSampleReport } = require("./sample_report_builder");

const root_dir = path.resolve(__dirname, "..");
const result = writeSampleReport(root_dir);

console.log(`Wrote ${result.output_path}`);
console.log(`Wrote ${result.chinese_output_path}`);
console.log(`Rows: ${result.current_parse.rows.length}`);
console.log(`Queues: HOLD=${result.scan_result.queueCounts.HOLD}, REVIEW=${result.scan_result.queueCounts.REVIEW}, CLEAR=${result.scan_result.queueCounts.PASS}`);
console.log(`Chinese queues: HOLD=${result.chinese_scan_result.queueCounts.HOLD}, REVIEW=${result.chinese_scan_result.queueCounts.REVIEW}, CLEAR=${result.chinese_scan_result.queueCounts.PASS}`);
console.log(`Overall risk: ${result.scan_result.overallRisk}`);
