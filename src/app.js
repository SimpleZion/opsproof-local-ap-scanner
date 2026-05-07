(function () {
  const namespace = window.DPRS || {};
  let lastScanResult = null;
  let activeQueue = "ALL";
  let networkAttempts = 0;
  let currentLanguage = "en";

  const elements = {
    currentInput: document.getElementById("current-input"),
    currentFile: document.getElementById("current-file"),
    historyInput: document.getElementById("history-input"),
    historyFile: document.getElementById("history-file"),
    aliasInput: document.getElementById("alias-input"),
    aliasFile: document.getElementById("alias-file"),
    headerInput: document.getElementById("header-input"),
    headerReadinessOutput: document.getElementById("header-readiness-output"),
    scanMessage: document.getElementById("scan-message"),
    overallRisk: document.getElementById("overall-risk"),
    overallCopy: document.getElementById("overall-copy"),
    holdCount: document.getElementById("hold-count"),
    reviewCount: document.getElementById("review-count"),
    passCount: document.getElementById("pass-count"),
    mappingCopy: document.getElementById("mapping-copy"),
    mappingList: document.getElementById("mapping-list"),
    evidencePassport: document.getElementById("evidence-passport"),
    passportSource: document.getElementById("passport-source"),
    passportSourceDetail: document.getElementById("passport-source-detail"),
    passportFields: document.getElementById("passport-fields"),
    passportFieldsDetail: document.getElementById("passport-fields-detail"),
    passportRules: document.getElementById("passport-rules"),
    passportRulesDetail: document.getElementById("passport-rules-detail"),
    passportSignals: document.getElementById("passport-signals"),
    passportSignalsDetail: document.getElementById("passport-signals-detail"),
    passportProfileList: document.getElementById("passport-profile-list"),
    passportSignalList: document.getElementById("passport-signal-list"),
    passportDecisionCard: document.getElementById("passport-decision-card"),
    passportDecisionLabel: document.getElementById("passport-decision-label"),
    passportDecisionTitle: document.getElementById("passport-decision-title"),
    passportDecisionSummary: document.getElementById("passport-decision-summary"),
    passportDecisionPrimary: document.getElementById("passport-decision-primary"),
    passportDecisionSecondary: document.getElementById("passport-decision-secondary"),
    passportDecisionReasons: document.getElementById("passport-decision-reasons"),
    passportDecisionNextSteps: document.getElementById("passport-decision-next-steps"),
    resultDecisionCard: document.getElementById("result-decision-card"),
    resultDecisionLabel: document.getElementById("result-decision-label"),
    resultDecisionTitle: document.getElementById("result-decision-title"),
    resultDecisionSummary: document.getElementById("result-decision-summary"),
    resultDecisionPrimary: document.getElementById("result-decision-primary"),
    resultDecisionSecondary: document.getElementById("result-decision-secondary"),
    resultDecisionReason: document.getElementById("result-decision-reason"),
    resultBody: document.getElementById("result-body"),
    mobileResultList: document.getElementById("mobile-result-list"),
    downloadCsv: document.getElementById("download-csv"),
    downloadHtml: document.getElementById("download-html"),
    reportReady: document.getElementById("report-ready"),
    privacyStatus: document.getElementById("privacy-status"),
    networkAttempts: document.getElementById("network-attempts"),
  };

  const uiText = {
    blockedApi: { en: "External API call blocked", zh: "外部 API 调用已阻止" },
    blockedApiError: { en: "External API calls are blocked by this local scanner page.", zh: "此本地复核页面已阻止外部 API 调用。" },
    mappingSummary: { en: "{current} current row(s), {history} paid-history row(s), {aliases} alias mapping(s).", zh: "{current} 条当前付款明细，{history} 条已付款历史，{aliases} 条供应商别名映射。" },
    notDetected: { en: "Not detected", zh: "未检测到" },
    confidence: { en: "{score}% confidence", zh: "{score}% 置信度" },
    buyerDecision: { en: "Buyer decision", zh: "下一步建议" },
    runScannerFirst: { en: "Run scanner first.", zh: "请先运行本地复核。" },
    defaultDecisionSummary: { en: "The scanner will recommend whether to use the free proof path, the self-serve bundle, or the first-run setup service.", zh: "复核工具会建议使用免费验证包、自助复核套件、首轮字段映射与运行配置服务，或暂不购买。" },
    downloadFreeProofPack: { en: "Download free proof pack", zh: "下载免费验证包" },
    viewSampleReport: { en: "View sample report", zh: "查看样本报告" },
    recommendedBuyerAction: { en: "Recommended buyer action: {label}", zh: "建议购买动作：{label}" },
    scannerResultBeforeBuy: { en: "Use the scanner result before deciding what to buy.", zh: "先根据本地复核结果判断是否购买以及购买哪一项。" },
    rowHeaderDetail: { en: "{rows} row(s), {headers} header(s), {fields} AP field(s) mapped.", zh: "{rows} 条明细，{headers} 个表头，已适配 {fields} 个 AP 字段。" },
    readyCount: { en: "{count} ready", zh: "{count} 个就绪" },
    fieldDetail: { en: "{review} need confirmation, {missing} missing. {fields}", zh: "{review} 个字段需确认，{missing} 个字段缺失。{fields}" },
    noReadyFields: { en: "No ready fields yet.", zh: "还没有就绪字段。" },
    rulesReady: { en: "{ready}/{total} ready", zh: "{ready}/{total} 项规则可运行" },
    blockedRules: { en: "{count} check(s) need more fields or history exports.", zh: "{count} 项检查还需要更多字段或历史导出才能运行。" },
    allChecksReady: { en: "All bundled checks have the required local fields.", zh: "所有内置检查都已具备所需本地字段。" },
    signalsShown: { en: "{count} shown", zh: "显示 {count} 个" },
    localSignalsNoOverride: { en: "Local review signals never override HOLD / REVIEW / CLEAR.", zh: "本地复核信号仅用于排序，不会覆盖 HOLD / REVIEW / CLEAR 队列结论。" },
    missingUsefulHeaders: { en: "Missing useful headers: {headers}", zh: "缺少有用表头：{headers}" },
    noHeaderGaps: { en: "No core AP header gaps found in the current export.", zh: "当前导出未发现核心 AP 表头缺口。" },
    signalLine: { en: "row {row}: {score} signal", zh: "第 {row} 行：{score} 分信号" },
    reviewSignalAvailable: { en: "Review signal available.", zh: "存在可复核信号。" },
    noSignals: { en: "No local ML-assisted signal exceeded the review threshold. Deterministic duplicate rules still control the queue.", zh: "没有本地 ML 辅助信号超过复核阈值。异常队列仍由确定性重复付款规则控制。" },
    pasteHeaders: { en: "Paste headers to see ready, partial, and blocked rules.", zh: "粘贴表头，查看哪些规则已就绪、部分就绪或被字段缺口阻塞。" },
    pasteHeadersFirst: { en: "Paste export headers first.", zh: "请先粘贴导出表头。" },
    missing: { en: "Missing", zh: "缺失" },
    readyForFirstRun: { en: "Ready for fake-row or redacted-row first run.", zh: "可用于模拟数据行或脱敏行的首轮运行。" },
    missingFields: { en: "Missing: {fields}", zh: "缺失：{fields}" },
    nextFakeRun: { en: "Next step: run fake rows or redacted rows through the scanner.", zh: "下一步：用模拟数据行或脱敏行运行本地复核工具。" },
    nextExportRequest: { en: "Next export request", zh: "下一次导出建议" },
    headerComplete: { en: "Header check complete: {ready} ready, {blocked} blocked.", zh: "表头检查完成：{ready} 个就绪，{blocked} 个阻塞。" },
    emptyQueueBuild: { en: "Run the scanner to build a review queue.", zh: "运行本地复核工具以生成异常队列。" },
    noRowsQueue: { en: "No rows in this queue.", zh: "此队列中没有行。" },
    highRisk: { en: "High-risk duplicate evidence found. Review HOLD rows before payment.", zh: "发现高风险重复付款证据。付款放行前请优先复核 HOLD 行。" },
    noHold: { en: "No HOLD rows found by this local browser scan. Review any REVIEW rows before release.", zh: "本地浏览器复核未生成 HOLD 行。付款放行前仍需复核所有 REVIEW 行。" },
    reportDisabled: { en: "Run the scanner to enable CSV and HTML reports.", zh: "运行本地复核后可下载 CSV 和 HTML 报告。" },
    reportReady: { en: "Report ready: {rows} current rows scanned, {hold} HOLD, {review} REVIEW, {signals} ML-assisted local signals. Download CSV or HTML.", zh: "报告已就绪：已复核 {rows} 条当前付款明细，{hold} 个 HOLD，{review} 个 REVIEW，{signals} 个本地 ML 辅助信号。可下载 CSV 或 HTML。" },
    currentCsvRequired: { en: "Current payment run CSV is required.", zh: "必须提供当前付款批次 CSV。" },
    scannedRows: { en: "Scanned {rows} current row(s).", zh: "已扫描 {rows} 条当前付款行。" },
    csvLoaded: { en: "CSV loaded locally. Run the scanner when ready.", zh: "CSV 已在本地加载。准备好后运行复核工具。" },
    currentSampleLoaded: { en: "Loaded fake current payment run sample.", zh: "已加载当前付款批次模拟样本。" },
    historySampleLoaded: { en: "Loaded fake paid history sample.", zh: "已加载已付款历史模拟样本。" },
    aliasSampleLoaded: { en: "Loaded fake vendor alias sample.", zh: "已加载供应商别名模拟样本。" },
    noInputScanned: { en: "No input scanned yet.", zh: "尚未扫描输入。" },
    clearedInputs: { en: "Cleared local inputs.", zh: "已清空本地输入。" },
    vendorPayee: { en: "Vendor / Payee", zh: "供应商 / 收款方" },
    invoice: { en: "Invoice", zh: "发票" },
    amount: { en: "Amount", zh: "金额" },
    date: { en: "Date", zh: "日期" },
    status: { en: "Status", zh: "状态" },
    reason: { en: "Reason", zh: "原因" },
    score: { en: "Score", zh: "分数" },
    queue: { en: "Queue", zh: "队列" },
    row: { en: "row {row}", zh: "第 {row} 行" },
  };

  const staticText = {
    "Skip to scanner": "跳到复核工具",
    "Duplicate Payment Risk Scanner": "付款前重复付款风险复核",
    "Local browser demo": "本地浏览器演示",
    "Run": "运行",
    "Scanner": "复核工具",
    "Header check": "表头检查",
    "Results": "结果",
    "Sample report": "样本报告",
    "Next step": "下一步",
    "Privacy": "隐私",
    "Rules": "规则",
    "View the sample report first. Then run a local AP CSV check.": "先查看样例报告，再运行本地 AP CSV 付款前复核。",
    "Start with the public fake-data report, then load the fake sample or choose local CSVs in this browser. The scanner maps common AP fields, builds HOLD / REVIEW / CLEAR, adds explainable local ML-assisted anomaly signals, and enables downloadable CSV and HTML reports without Python or cloud upload.": "先看公开模拟数据报告，再加载模拟样本或在本浏览器中选择本地 CSV。复核工具会自动适配常见 AP 字段，生成 HOLD / REVIEW / CLEAR 队列，补充可解释的本地 ML 辅助异常信号，并在无需 Python、无需云上传的情况下导出 CSV 和 HTML 报告。",
    "Find duplicate payment risk before a payment run goes out.": "在付款批次放行前识别重复付款风险。",
    "Local-first boundary": "本地优先边界",
    "CSV scan is designed to run in this browser": "CSV 扫描设计为在此浏览器中运行",
    "Inputs are parsed in this static page. No ERP login, bank connection, account login, or cloud upload is needed for the scanner workflow. Use fake or redacted rows first.": "输入只会在这个静态页面中解析。复核流程不需要 ERP 登录、银行连接、账号登录或云端上传；请优先使用模拟行或脱敏行。",
    "Blocked API attempts": "已阻止 API 尝试",
    "Storage writes": "存储写入",
    "Runtime": "运行方式",
    "Static file": "静态文件",
    "Non-technical buyer path": "非技术用户购买前路径",
    "1. View public sample report": "1. 查看公开样本报告",
    "2. Download free proof pack": "2. 下载免费验证包",
    "3. Preview setup only if mapping is unclear": "3. 字段不清时预览配置服务",
    "CSV-first and local-first.": "CSV 优先，本地运行。",
    "Export spreadsheet tabs to CSV, then paste, click-select, or drag the CSV here. The demo is a static browser workflow; start with fake or redacted data before private AP files.": "先把电子表格工作表导出为 CSV，再粘贴、点击选择或拖入这里。本演示是静态浏览器流程；在处理私密 AP 文件前，请先使用模拟数据或脱敏数据。",
    "Fastest proof path: sample report -> fake sample -> queue": "最快验证路径：样本报告 -> 模拟样本 -> 异常队列",
    "Load fake sample or drag CSV": "加载模拟样本或拖入 CSV",
    "Generate HOLD / REVIEW / CLEAR": "生成 HOLD / REVIEW / CLEAR 队列",
    "Download CSV or HTML report": "下载 CSV 或 HTML 报告",
    "Fastest proof path": "最快验证路径",
    "View public sample report": "查看公开样本报告",
    "Load fake samples and run": "加载模拟样本并运行",
    "Download sample HTML report": "下载样本 HTML 报告",
    "Open bundled sample report": "打开内置样本报告",
    "Inspect the public fake-data report first, then load bundled fake CSVs and run the scanner. No account, ERP login, bank connection, cloud upload, or Python step is needed.": "先查看公开模拟数据报告，再加载内置模拟 CSV 并运行复核工具。无需账号、ERP 登录、银行连接、云上传或 Python 步骤。",
    "Header-only first step": "仅表头的第一步",
    "Paste export headers before sharing any AP rows.": "在提供任何 AP 明细前，先粘贴导出表头做字段适配检查。",
    "Check which duplicate-payment rules can run from column names alone. This is designed for QuickBooks, Xero, BILL, ERP, bank, or spreadsheet exports when you are not ready to paste private payment data.": "仅通过字段名判断哪些重复付款复核规则可以运行。适用于 QuickBooks、Xero、BILL、ERP、银行流水或电子表格导出，尤其适合还不想粘贴私密付款数据的阶段。",
    "Load sample headers": "加载样本表头",
    "Check rule readiness": "检查规则可运行性",
    "Paste headers to see ready, partial, and blocked rules.": "粘贴表头后查看已就绪、部分就绪和被阻塞的规则。",
    "1. Current payment run": "1. 当前付款批次",
    "2. Paid history": "2. 已付款历史",
    "3. Vendor aliases": "3. 供应商别名",
    "Required. Include vendor/payee, invoice number, amount, date, and any payment id or status columns you have.": "必填。请包含供应商/收款方、发票号、金额、日期，以及已有的付款编号或付款状态字段。",
    "Optional. Paid invoices make the historical paid comparison rule useful.": "可选。已付款历史会增强历史重复付款比对规则。",
    "Optional. Two columns are enough: alias, canonical_vendor.": "可选。两列即可：别名、标准供应商名称。",
    "Load sample": "加载样本",
    "Drop or choose current-run CSV": "拖入或选择当前付款批次 CSV",
    "Drop or choose paid-history CSV": "拖入或选择已付款历史 CSV",
    "Drop or choose vendor-alias CSV": "拖入或选择供应商别名 CSV",
    "Required input for the scan.": "扫描所需输入。",
    "Optional, but improves already-paid checks.": "可选，但会增强历史已付款比对。",
    "Optional two-column alias map.": "可选的两列别名映射。",
    "Upload CSV or XLSX": "上传 CSV 或 XLSX",
    "Or paste CSV": "或粘贴 CSV",
    "Run risk scan": "运行风险扫描",
    "Clear": "清空",
    "Waiting for fake sample or current payment-run CSV.": "等待模拟样本或当前付款批次 CSV。",
    "Waiting for current payment run CSV.": "等待当前付款批次 CSV。",
    "Overall run risk": "整体运行风险",
    "Run the scanner to see queue counts and top reasons.": "运行本地复核工具，查看异常队列数量和主要原因。",
    "Pause before payment.": "付款放行前暂停。",
    "Needs AP confirmation.": "需要 AP 人工复核。",
    "No duplicate-payment risk found.": "未发现重复付款风险。",
    "Recommended buyer action": "建议购买动作",
    "Run the fake sample first.": "请先运行模拟样本。",
    "The scanner will recommend free proof pack, USD49 self-serve bundle, USD149 setup, or do not buy yet.": "复核工具会建议免费验证包、49 美元自助包、149 美元首轮字段映射与运行配置服务，或暂不购买。",
    "No AP export has been scanned yet.": "尚未扫描 AP 导出。",
    "All": "全部",
    "Download CSV report": "下载 CSV 报告",
    "Download HTML report": "下载 HTML 报告",
    "Detected field mapping": "检测到的字段映射",
    "Export Evidence Passport": "导出适配报告（Evidence Passport）",
    "Export 导出适配报告": "导出适配报告（Evidence Passport）",
    "Field fit, rule readiness, and local signals before any setup call.": "在任何设置沟通前，先检查字段适配、规则可运行性和本地复核信号。",
    "Use this section to decide whether your AP export is ready for a first-run review. It stays local and does not change the HOLD / REVIEW / CLEAR queue.": "用这一部分判断你的 AP 导出是否适合进入首轮付款前复核。它完全留在本地，也不会改变 HOLD / REVIEW / CLEAR 异常队列结论。",
    "Need mapping help?": "需要映射帮助？",
    "Source profile": "来源画像",
    "Run scanner": "运行复核工具",
    "Load fake samples or a local CSV to see source confidence.": "加载模拟样本或本地 CSV，查看数据来源可信度。",
    "Field confidence": "字段适配可信度",
    "0 ready": "0 个就绪",
    "Mapped fields and weak headers will appear here.": "已映射字段和弱表头会显示在这里。",
    "Rule readiness": "规则可运行性",
    "Ready and blocked checks are summarized here.": "就绪和阻塞检查会在这里汇总。",
    "Local review signals": "本地复核信号",
    "0 signals": "0 个信号",
    "Local signals are review aids only; they do not change queue decisions.": "本地信号仅辅助复核排序，不会改变异常队列结论。",
    "Buyer decision": "下一步建议",
    "Run scanner first.": "请先运行复核工具。",
    "Why this recommendation": "推荐原因",
    "Next steps": "后续步骤",
    "Profile evidence": "画像证据",
    "Top local signals": "主要本地信号",
    "When setup is the better path": "何时应选择首轮字段映射与运行配置服务",
    "Example: mapping unclear -> use USD149 setup before self-service.": "示例：字段适配不清 -> 自助前先使用 149 美元首轮字段映射与运行配置服务。",
    "If your export only has weak labels like `Name`, `Ref`, `Total`, or is missing invoice/date/payment references, the Passport should not push you straight to the bundle.": "如果你的导出只有 `Name`、`Ref`、`Total` 这类弱字段，或者缺少发票、日期、付款参考信息，导出适配报告不应直接建议购买自助包。",
    "2/6 checks ready": "2/6 项检查就绪",
    "3 fields need review": "3 个字段需复核",
    "Recommended action": "建议操作",
    "vendor + amount detected, invoice/date/payment id unclear": "已识别供应商和金额，但发票、日期、付款编号仍不清晰",
    "header meaning should be confirmed before relying on the queue": "依赖异常队列前，应先确认字段含义",
    "send headers, fake rows, or redacted rows for first-run setup": "发送表头、模拟行或脱敏行用于首轮配置",
    "Open USD149 setup example path": "查看 149 美元配置示例",
    "Queue": "队列",
    "Score": "分数",
    "Vendor / Payee": "供应商 / 收款方",
    "Invoice": "发票",
    "Amount": "金额",
    "Date": "日期",
    "Status": "状态",
    "Reason": "原因",
    "Buyer path": "选择路径",
    "Turn the sample scan into a repeatable AP review.": "把样本复核转化为可重复执行的 AP 付款前复核流程。",
    "Open the public fake-data report first, then use the free ZIP to run this scanner locally and check whether your export headers are ready. Buy only after the queue, evidence fields, and report shape match your workflow.": "先打开公开模拟数据报告，再使用免费 ZIP 在本地运行复核工具，确认你的导出表头是否就绪。只有当异常队列、证据字段和报告形态与你的工作流匹配后，再考虑购买。",
    "Download free proof pack": "下载免费验证包",
    "Preview USD149 setup": "预览 149 美元配置服务",
    "See USD49 self-serve bundle": "查看 49 美元自助包",
    "Rules included in this demo": "本演示包含的复核规则",
    "Exact duplicate invoice": "完全重复发票",
    "Same normalized vendor, same raw invoice value, and same amount inside the current run.": "在当前付款批次中，供应商标准化结果、原始发票号和金额完全一致。",
    "Normalized invoice match": "标准化发票匹配",
    "Same vendor and amount after removing invoice punctuation, spaces, and case differences.": "去除发票号标点、空格和大小写差异后，同一供应商与同一金额再次匹配。",
    "Same vendor + amount + date window": "相同供应商 + 金额 + 日期窗口",
    "Same vendor and amount within a configurable date window even when invoice numbers differ.": "即使发票号不同，同一供应商与同一金额在可配置日期窗口内重复出现。",
    "Current run duplicate rows": "当前批次重复行",
    "Identical payment run row signature appears more than once.": "当前付款批次中，相同付款行签名出现多次。",
    "Historical paid comparison": "历史已付款比较",
    "Current run item matches optional paid history by invoice or near-date payment evidence.": "当前付款行与可选的已付款历史在发票号或近日期付款证据上匹配。",
    "Vendor/payee alias review": "供应商 / 收款方别名复核",
    "Flags likely aliases and buyer-provided alias mappings that need AP review.": "标记可能指向同一主体的别名，以及买家提供、需要 AP 复核的别名映射。",
  };

  const placeholderText = {
    headerInput: {
      en: "vendor_name,invoice_number,amount,invoice_date,payment_id,status",
      zh: "供应商名称,发票号,付款金额,付款日期,付款编号,付款状态",
    },
    currentInput: {
      en: "vendor_name,invoice_number,amount,invoice_date,payment_id,status",
      zh: "供应商名称,发票号,付款金额,付款日期,付款编号,付款状态",
    },
    historyInput: {
      en: "payee,invoice_no,amount,paid_date,payment_reference,payment_status",
      zh: "收款方,发票号,金额,已付日期,付款参考号,付款状态",
    },
    aliasInput: {
      en: "alias,canonical_vendor",
      zh: "别名,标准供应商名称",
    },
  };

  const documentTitleText = {
    en: "Duplicate Payment Risk Scanner Demo",
    zh: "付款前重复付款风险复核工具演示",
  };

  const bundledSamplePairs = [
    { elementName: "currentInput", englishKey: "currentRun", chineseKey: "currentRunZh" },
    { elementName: "historyInput", englishKey: "history", chineseKey: "historyZh" },
    { elementName: "aliasInput", englishKey: "aliases", chineseKey: "aliasesZh" },
  ];

  const originalTextNodes = new WeakMap();
  const buyerText = {
    "Do not buy yet": "暂不购买",
    "Self-serve ready": "适合自助复核",
    "Setup recommended": "建议先做字段映射与首轮复核配置",
    "Export is not ready for a paid AP review.": "当前导出尚不适合进入付费 AP 复核。",
    "This export is a fit for the USD49 self-serve bundle.": "当前导出适合使用 49 美元自助复核套件。",
    "This export likely needs the USD149 first-run setup before self-service.": "当前导出在自助使用前，建议先做 149 美元字段映射与首轮复核配置服务。",
    "Core evidence is missing. Use the free proof path first and export stronger AP columns before buying the bundle or setup.": "核心证据字段缺失。购买自助包或字段映射与首轮运行配置服务前，先使用免费验证包，并导出更完整的 AP 字段。",
    "The current export has enough field confidence and rule readiness to use the local AP control workflow without a mapping call.": "当前导出已具备足够的字段适配可信度和规则可运行性，可直接使用本地 AP 内控复核流程，无需额外字段适配沟通。",
    "Some checks are ready, but blocked rules or uncertain fields mean a short mapping review would reduce false confidence.": "部分检查已可运行，但被阻塞规则或不确定字段仍可能造成误判；短字段适配复核可以降低错误信心。",
    "Open USD49 bundle": "查看 49 美元自助包",
    "Open USD149 setup": "查看 149 美元配置服务",
    "View sample report": "查看样本报告",
    "Download free proof pack": "下载免费验证包",
  };

  function text(key, values) {
    const entry = uiText[key] || {};
    let template = entry[currentLanguage] || entry.en || key;
    Object.entries(values || {}).forEach(([name, value]) => {
      template = template.replace(new RegExp(`\\{${name}\\}`, "g"), String(value));
    });
    return template;
  }

  function translateStatic(value) {
    return currentLanguage === "zh" ? (staticText[value] || value) : value;
  }

  function rawDisplayName(value) {
    return String(value || "")
      .replace(/_/g, " ")
      .replace(/\b\w/g, (letter) => letter.toUpperCase());
  }

  function sourceProfileLabel(value) {
    if (currentLanguage !== "zh") {
      return rawDisplayName(value);
    }
    return ({
      payment_run_export: "付款批次导出",
      paid_history_export: "已付款历史导出",
      quickbooks_like_export: "QuickBooks 类导出",
      xero_like_export: "Xero 类导出",
      bank_statement_like_export: "银行流水类导出",
      shopify_or_payout_like_export: "Shopify / 回款类导出",
      odoo_like_export: "Odoo 类导出",
      generic_ap_export: "通用 AP 导出",
    })[value] || rawDisplayName(value);
  }

  function translateShortFieldName(value) {
    if (currentLanguage !== "zh") {
      return value;
    }
    return ({
      vendor: "供应商/收款方",
      "vendor payee": "供应商/收款方",
      "invoice number": "发票号",
      invoice_number: "发票号",
      amount: "金额",
      date: "日期",
      "payment id": "付款编号",
      payment_id: "付款编号",
      status: "状态",
    })[String(value || "").toLowerCase()] || value;
  }

  function translateHeaderList(values) {
    return (values || []).map(translateShortFieldName).join(", ");
  }

  function translateRuleName(value) {
    if (currentLanguage !== "zh") {
      return value;
    }
    if (namespace.reports && typeof namespace.reports.ruleLabel === "function") {
      return namespace.reports.ruleLabel(String(value || "").trim(), currentLanguage);
    }
    return value;
  }

  function translateCommaList(value, translator) {
    if (currentLanguage !== "zh") {
      return value;
    }
    return String(value || "")
      .split(/,\s*/)
      .map((item) => item.trim())
      .filter(Boolean)
      .map(translator)
      .join("、");
  }

  function translateProfileSignal(value) {
    const textValue = String(value || "");
    if (currentLanguage !== "zh") {
      return textValue;
    }
    const exact = {
      "payment or batch reference": "付款编号或批次引用",
      "payment status": "付款状态",
      "AP core fields": "AP 核心字段",
      "paid date or posted date": "已付款日期或入账日期",
      "paid status": "已付款状态",
      "QuickBooks marker": "QuickBooks 导出特征",
      "bill or vendor fields": "账单或供应商字段",
      "Xero marker": "Xero 导出特征",
      "contact and amount fields": "联系人与金额字段",
      "bank transaction marker": "银行交易特征",
      "date and amount fields": "日期与金额字段",
      "payout or order marker": "回款或订单特征",
      "processor settlement fields": "支付处理/结算字段",
      "Odoo accounting marker": "Odoo 会计字段特征",
      "vendor bill fields": "供应商账单字段",
      "generic AP column structure": "通用 AP 字段结构",
      "Profile is a routing hint, not an ERP connection or accounting conclusion.": "来源画像只是路由提示，不是 ERP 连接结果，也不是会计结论。",
    };
    if (exact[textValue]) {
      return exact[textValue];
    }
    let match = textValue.match(/^Low confidence: confirm source type and field meaning before relying on the queue\.$/);
    if (match) {
      return "来源画像置信度偏低；依赖异常队列前，请先确认导出来源类型和字段含义。";
    }
    match = textValue.match(/^Missing useful headers: (.+)$/);
    if (match) {
      return `缺少有用表头：${translateHeaderList(match[1].split(/,\s*/))}`;
    }
    return textValue
      .replace(/\bpayment_run_export\b/g, "付款批次导出")
      .replace(/\bgeneric_ap_export\b/g, "通用 AP 导出");
  }

  function translateBuyerText(value) {
    if (currentLanguage !== "zh") {
      return value;
    }
    let output = buyerText[value] || value;
    output = output
      .replace(/^(\d+)\/(\d+) bundled checks are ready from this local export\.$/, "本地导出中已有 $1/$2 项内置检查具备运行条件。")
      .replace(/^(\d+) AP fields mapped confidently; (\d+) need confirmation; (\d+) are missing\.$/, "$1 个 AP 字段已高置信度适配；$2 个需要确认；$3 个缺失。")
      .replace(/^(\d+) current-run rows, (\d+) paid-history rows, and (\d+) alias rows were available\.$/, "本次可用数据包括 $1 条当前付款行、$2 条已付款历史行和 $3 条别名映射行。")
      .replace(/^Source profile: (.+) at (\d+)% confidence\.$/, (_all, source, confidence) => `来源画像：${sourceProfileLabel(source)}，置信度 ${confidence}%。`)
      .replace(/^Current export rows: (\d+)\./, "当前导出行数：$1。")
      .replace(/^Paid history rows: (\d+)\./, "已付款历史行数：$1。")
      .replace(/^Alias mappings loaded: (\d+)\./, "已加载别名映射：$1。")
      .replace(/^Missing core fields: (.+)\.$/, (_all, fields) => `缺少核心字段：${translateCommaList(fields, translateShortFieldName)}。`)
      .replace(/^Blocked or partial checks: (.+)\.$/, (_all, rules) => `阻塞或部分就绪检查：${translateCommaList(rules, translateRuleName)}。`)
      .replace("Too few checks are ready to make a paid review useful.", "可运行检查太少，付费复核暂时价值有限。")
      .replace("Field confidence should be confirmed before relying on the queue.", "依赖异常队列前，应先确认字段适配可信度。")
      .replace("Run the free proof pack with fake or redacted rows.", "先用模拟数据行或脱敏行运行免费验证包。")
      .replace("Export vendor/payee, invoice, amount, date, payment id, and status if available.", "尽量导出供应商/收款方、发票、金额、日期、付款编号和状态。")
      .replace("Use setup only after headers or sample rows show enough AP context.", "只有在表头或样本行呈现足够 AP 上下文后，再使用字段映射与首轮运行配置服务。")
      .replace("Download the bundle and run it against a redacted first export.", "下载自助包，并用第一份脱敏导出文件运行。")
      .replace("Use HOLD rows as the payment stop list and REVIEW rows as the AP follow-up list.", "将 HOLD 行作为付款暂停清单，将 REVIEW 行作为 AP 跟进复核清单。")
      .replace("Keep the CSV/HTML report as local evidence for the run.", "将 CSV/HTML 报告作为本次付款前复核的本地证据留存。")
      .replace("Send headers or redacted rows for first-run setup.", "发送表头或脱敏行用于字段映射与首轮复核配置。")
      .replace("Send only headers, fake rows, or redacted rows for mapping review.", "只发送表头、模拟行或脱敏行用于字段映射复核。")
      .replace("Ask for a first-run readiness note before using the queue in a payment process.", "在把异常队列用于付款流程前，先获取首轮就绪说明。")
      .replace("Move to self-serve only after core checks and history comparison are ready.", "只有在核心检查和历史已付款比对都就绪后，再转为自助使用。")
      .replace("Review HOLD rows first, then REVIEW rows before any payment release.", "任何付款放行前，先复核 HOLD 行，再处理 REVIEW 行。")
      .replace("Save the HTML report and CSV queue as controller evidence.", "保存 HTML 报告和 CSV 队列，作为财务负责人复核证据。")
      .replace("Use setup only if your live export differs from this sample-ready structure.", "只有当真实导出与当前样例就绪结构不一致时，再使用配置服务。")
      .replace("Export vendor/payee, invoice number, amount, and payment or bill date columns.", "导出供应商/收款方、发票号、金额，以及付款日期或账单日期字段。")
      .replace("Run the header checker again before sending any private AP rows.", "在发送任何私密 AP 明细前，先重新运行表头检查。")
      .replace("Buy setup only after the passport shows enough fields to review.", "只有当导出适配报告显示字段足够复核时，再购买配置服务。")
      .replace("Confirm ambiguous fields before relying on self-service queue output.", "依赖自助异常队列输出前，先确认模糊字段。")
      .replace("After setup, use the self-serve bundle for repeat runs.", "设置完成后，用自助包进行后续重复复核。");
    return output;
  }

  function translateBuyerGuidance(guidance) {
    if (!guidance || currentLanguage !== "zh") {
      return guidance;
    }
    return {
      ...guidance,
      label: translateBuyerText(guidance.label),
      title: translateBuyerText(guidance.title),
      summary: translateBuyerText(guidance.summary),
      primaryCta: translateBuyerText(guidance.primaryCta),
      secondaryCta: translateBuyerText(guidance.secondaryCta),
      reasons: (guidance.reasons || []).map(translateBuyerText),
      nextSteps: (guidance.nextSteps || []).map(translateBuyerText),
    };
  }

  function fieldLabel(value) {
    const labels = {
      vendor: { en: "Vendor / Payee", zh: "供应商/收款方" },
      invoice_number: { en: "Invoice number", zh: "发票号" },
      amount: { en: "Amount", zh: "金额" },
      date: { en: "Date", zh: "日期" },
      payment_id: { en: "Payment ID", zh: "付款编号" },
      status: { en: "Status", zh: "状态" },
    };
    return (labels[value] || { en: String(value).replace("_", " ") })[currentLanguage] || String(value).replace("_", " ");
  }

  function applyStaticTranslations() {
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        const parent = node.parentElement;
        if (!parent || ["SCRIPT", "STYLE", "TEXTAREA"].includes(parent.tagName)) {
          return NodeFilter.FILTER_REJECT;
        }
        return node.nodeValue.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
      },
    });
    let node = walker.nextNode();
    while (node) {
      if (!originalTextNodes.has(node)) {
        originalTextNodes.set(node, node.nodeValue);
      }
      const original = originalTextNodes.get(node);
      const trimmed = original.trim();
      const translated = translateStatic(trimmed);
      node.nodeValue = original.replace(trimmed, translated);
      node = walker.nextNode();
    }
  }

  function applyLanguageAttributes() {
    Object.entries(placeholderText).forEach(([elementName, translations]) => {
      const element = elements[elementName];
      if (element) {
        element.setAttribute("placeholder", translations[currentLanguage] || translations.en);
      }
    });
  }

  function fallbackSampleReportHref() {
    return currentLanguage === "zh"
      ? "https://tools.simplezion.com/sample-report/zh.html"
      : "https://tools.simplezion.com/sample-report/";
  }

  function localizedSampleReportHref() {
    const sampleReportLink = document.querySelector("[data-sample-report-link]");
    if (!sampleReportLink) {
      return fallbackSampleReportHref();
    }
    const languageHref = currentLanguage === "zh"
      ? sampleReportLink.dataset.sampleReportZh
      : sampleReportLink.dataset.sampleReportEn;
    return languageHref || sampleReportLink.getAttribute("href") || fallbackSampleReportHref();
  }

  function applyLocalizedLinks() {
    document.querySelectorAll("[data-sample-report-link]").forEach((link) => {
      const languageHref = currentLanguage === "zh"
        ? link.dataset.sampleReportZh
        : link.dataset.sampleReportEn;
      if (languageHref) {
        link.setAttribute("href", languageHref);
      }
    });
  }

  function refreshBundledSamplesForLanguage(previousLanguage) {
    if (previousLanguage === currentLanguage) {
      return;
    }
    bundledSamplePairs.forEach(({ elementName, englishKey, chineseKey }) => {
      const element = elements[elementName];
      if (!element || !element.value.trim()) {
        return;
      }
      const englishSample = namespace.samples[englishKey];
      const chineseSample = namespace.samples[chineseKey];
      if (!englishSample || !chineseSample) {
        return;
      }
      if (element.value === englishSample || element.value === chineseSample) {
        element.value = currentLanguage === "zh" ? chineseSample : englishSample;
      }
    });
  }

  function setLanguage(language) {
    const previousLanguage = currentLanguage;
    currentLanguage = language === "zh" ? "zh" : "en";
    document.documentElement.lang = currentLanguage === "zh" ? "zh-CN" : "en";
    document.title = documentTitleText[currentLanguage];
    document.querySelectorAll("[data-language]").forEach((button) => {
      button.setAttribute("aria-pressed", String(button.dataset.language === currentLanguage));
    });
    applyStaticTranslations();
    applyLanguageAttributes();
    applyLocalizedLinks();
    refreshBundledSamplesForLanguage(previousLanguage);
    namespace.i18n = {
      getLanguage: () => currentLanguage,
      translateBuyerGuidance,
    };
    if (lastScanResult) {
      renderSummary(lastScanResult);
      renderMapping(lastScanResult);
      renderEvidencePassport(lastScanResult);
    } else {
      renderSummary({ overallRisk: 0, queueCounts: { HOLD: 0, REVIEW: 0, PASS: 0 }, items: [] });
      renderBuyerDecisionGuidance(null);
    }
    renderRows();
  }

  function installNetworkGuard() {
    const markAttempt = () => {
      networkAttempts += 1;
      elements.networkAttempts.textContent = String(networkAttempts);
      elements.privacyStatus.textContent = text("blockedApi");
      throw new Error(text("blockedApiError"));
    };

    window.fetch = markAttempt;
    window.XMLHttpRequest = function () {
      markAttempt();
    };
    navigator.sendBeacon = function () {
      markAttempt();
      return false;
    };
  }

  function setMessage(text, isError) {
    elements.scanMessage.textContent = text;
    elements.scanMessage.style.color = isError ? "#a7302c" : "";
  }

  function renderMapping(scanResult) {
    const fields = ["vendor", "invoice_number", "amount", "date", "payment_id", "status"];
    const mapping = scanResult.currentMapping.mapping;
    const confidence = scanResult.currentMapping.confidence;
    elements.mappingCopy.textContent = text("mappingSummary", { current: scanResult.currentRowCount, history: scanResult.historyRowCount, aliases: scanResult.aliasCount });
    elements.mappingList.innerHTML = fields.map((fieldName) => {
      const header = mapping[fieldName] || text("notDetected");
      const score = confidence[fieldName] || 0;
      return `<div class="mapping-chip"><span>${escapeHtml(fieldLabel(fieldName))}</span><strong>${escapeHtml(header)}</strong><small>${escapeHtml(text("confidence", { score }))}</small></div>`;
    }).join("");
  }

  function displayName(value) {
    if (currentLanguage === "zh") {
      return sourceProfileLabel(value);
    }
    return rawDisplayName(value);
  }

  function sampleReportHref() {
    return localizedSampleReportHref();
  }

  function renderBuyerDecisionGuidance(guidance) {
    const safeGuidance = translateBuyerGuidance(guidance) || {
      status: "not_ready",
      label: text("buyerDecision"),
      title: text("runScannerFirst"),
      summary: text("defaultDecisionSummary"),
      primaryCta: text("downloadFreeProofPack"),
      primaryHref: "https://payhip.com/b/6UYfe",
      secondaryCta: text("viewSampleReport"),
      secondaryHref: sampleReportHref(),
      reasons: [],
      nextSteps: [],
    };
    if (currentLanguage === "zh" && safeGuidance.secondaryHref === "https://tools.simplezion.com/sample-report/") {
      safeGuidance.secondaryHref = sampleReportHref();
    }
    elements.passportDecisionCard.dataset.status = safeGuidance.status || "not_ready";
    elements.passportDecisionLabel.textContent = safeGuidance.label || text("buyerDecision");
    elements.passportDecisionTitle.textContent = safeGuidance.title || text("runScannerFirst");
    elements.passportDecisionSummary.textContent = safeGuidance.summary || "";
    elements.passportDecisionPrimary.textContent = safeGuidance.primaryCta || text("downloadFreeProofPack");
    elements.passportDecisionPrimary.href = safeGuidance.primaryHref || "https://payhip.com/b/6UYfe";
    elements.passportDecisionSecondary.textContent = safeGuidance.secondaryCta || text("viewSampleReport");
    elements.passportDecisionSecondary.href = safeGuidance.secondaryHref || sampleReportHref();
    elements.passportDecisionReasons.innerHTML = (safeGuidance.reasons || []).map((reason) => `<li>${escapeHtml(reason)}</li>`).join("");
    elements.passportDecisionNextSteps.innerHTML = (safeGuidance.nextSteps || []).map((step) => `<li>${escapeHtml(step)}</li>`).join("");
    elements.resultDecisionCard.dataset.status = safeGuidance.status || "not_ready";
    elements.resultDecisionLabel.textContent = text("recommendedBuyerAction", { label: safeGuidance.label || text("buyerDecision") });
    elements.resultDecisionTitle.textContent = safeGuidance.title || text("runScannerFirst");
    elements.resultDecisionSummary.textContent = safeGuidance.summary || "";
    elements.resultDecisionPrimary.textContent = safeGuidance.primaryCta || text("downloadFreeProofPack");
    elements.resultDecisionPrimary.href = safeGuidance.primaryHref || "https://payhip.com/b/6UYfe";
    elements.resultDecisionSecondary.textContent = safeGuidance.secondaryCta || text("viewSampleReport");
    elements.resultDecisionSecondary.href = safeGuidance.secondaryHref || sampleReportHref();
    elements.resultDecisionReason.textContent = (safeGuidance.reasons || [])[0] || text("scannerResultBeforeBuy");
  }

  function renderEvidencePassport(scanResult) {
    if (!scanResult || !scanResult.items) {
      elements.evidencePassport.hidden = true;
      return;
    }

    const currentProfile = (scanResult.sourceProfiles || []).find((profile) => profile.sourceName === "current") || {};
    const currentFieldRows = (scanResult.fieldLedger || []).filter((row) => row.source === "current");
    const readyFields = currentFieldRows.filter((row) => row.status === "ready");
    const reviewFields = currentFieldRows.filter((row) => row.status === "review");
    const missingFields = currentFieldRows.filter((row) => row.status === "missing");
    const readyRules = (scanResult.ruleReadiness || []).filter((rule) => rule.status === "ready");
    const blockedRules = (scanResult.ruleReadiness || []).filter((rule) => rule.status !== "ready");
    const topSignals = (scanResult.mlSignals || []).filter((signal) => signal.signalScore >= 25).slice(0, 3);

    elements.evidencePassport.hidden = false;
    elements.passportSource.textContent = `${displayName(currentProfile.likelySource)} (${currentProfile.profileConfidence || 0}%)`;
    elements.passportSourceDetail.textContent = text("rowHeaderDetail", { rows: currentProfile.rowCount || 0, headers: currentProfile.headerCount || 0, fields: currentProfile.readyFieldCount || 0 });
    elements.passportFields.textContent = text("readyCount", { count: readyFields.length });
    elements.passportFieldsDetail.textContent = text("fieldDetail", { review: reviewFields.length, missing: missingFields.length, fields: readyFields.map((row) => fieldLabel(row.field)).join(", ") || text("noReadyFields") });
    elements.passportRules.textContent = text("rulesReady", { ready: readyRules.length, total: (scanResult.ruleReadiness || []).length });
    elements.passportRulesDetail.textContent = blockedRules.length
      ? text("blockedRules", { count: blockedRules.length })
      : text("allChecksReady");
    elements.passportSignals.textContent = text("signalsShown", { count: topSignals.length });
    elements.passportSignalsDetail.textContent = text("localSignalsNoOverride");
    renderBuyerDecisionGuidance(scanResult.buyerDecisionGuidance);

    const localizedMissingHeaders = (currentProfile.missingUsefulHeaders || []).length
      ? `<li>${escapeHtml(text("missingUsefulHeaders", { headers: translateHeaderList(currentProfile.missingUsefulHeaders) }))}</li>`
      : `<li>${escapeHtml(text("noHeaderGaps"))}</li>`;
    const profileSignals = (currentProfile.matchedProfileSignals || [])
      .map((signal) => `<li>${escapeHtml(translateProfileSignal(signal))}</li>`)
      .join("");
    elements.passportProfileList.innerHTML = `${profileSignals}${localizedMissingHeaders}<li>${escapeHtml(translateProfileSignal(currentProfile.profileWarning || ""))}</li>`;

    elements.passportSignalList.innerHTML = topSignals.length
      ? topSignals.map((signal) => {
        const firstEvidence = (signal.evidence || [])[0] || {};
        const evidenceText = firstEvidence.message
          ? namespace.reports.mlEvidenceText([firstEvidence], currentLanguage)
          : text("reviewSignalAvailable");
        return `<li><strong>${escapeHtml(text("signalLine", { row: signal.rowNumber, score: signal.signalScore }))}</strong><span>${escapeHtml(evidenceText)}</span></li>`;
      }).join("")
      : `<li>${escapeHtml(text("noSignals"))}</li>`;
  }

  function parseHeaderText(text) {
    const rawText = String(text || "").trim();
    if (!rawText) {
      return [];
    }
    const csvParse = namespace.csv.parseCsvText(rawText);
    if (csvParse.headers.length > 1) {
      return csvParse.headers;
    }
    return rawText
      .split(/[\n\r,\t;|]+/)
      .map((value) => value.trim())
      .filter(Boolean);
  }

  function renderHeaderReadiness() {
    const headers = parseHeaderText(elements.headerInput.value);
    if (headers.length === 0) {
      elements.headerReadinessOutput.innerHTML = text("pasteHeaders");
      setMessage(text("pasteHeadersFirst"), true);
      return;
    }

    const readiness = namespace.fieldMapping.analyzeHeaderReadiness(headers);
    const mappingRows = ["vendor", "invoice_number", "amount", "date", "payment_id", "status"].map((fieldName) => {
      const header = readiness.mapping[fieldName] || text("missing");
      const score = readiness.confidence[fieldName] || 0;
      return `<span><strong>${escapeHtml(fieldLabel(fieldName))}</strong>${escapeHtml(header)}<small>${escapeHtml(text("confidence", { score }))}</small></span>`;
    }).join("");
    const ruleRows = readiness.ruleRows.map((rule) => {
      const detail = rule.status === "ready"
        ? text("readyForFirstRun")
        : text("missingFields", { fields: rule.missingFields.join(", ") || rule.weakFields.join(", ") });
      const ruleLabel = currentLanguage === "zh" && rule.labelZh ? rule.labelZh : rule.label;
      const statusLabel = currentLanguage === "zh"
        ? ({ ready: "就绪", partial: "部分就绪", blocked: "阻塞" }[rule.status] || rule.status)
        : rule.status.toUpperCase();
      return `<li class="${escapeHtml(rule.status)}"><strong>${escapeHtml(statusLabel)}</strong> ${escapeHtml(ruleLabel)} <span>${detail}</span></li>`;
    }).join("");
    const nextExportRequests = currentLanguage === "zh" ? readiness.nextExportRequestsZh : readiness.nextExportRequests;
    const nextExports = nextExportRequests.length
      ? nextExportRequests.map((request) => `<li>${escapeHtml(request)}</li>`).join("")
      : `<li>${escapeHtml(text("nextFakeRun"))}</li>`;
    elements.headerReadinessOutput.innerHTML = `<div class="readiness-summary">
        <strong>${currentLanguage === "zh" ? `${readiness.readyCount} 就绪` : `${readiness.readyCount} ready`}</strong>
        <strong>${currentLanguage === "zh" ? `${readiness.partialCount} 部分就绪` : `${readiness.partialCount} partial`}</strong>
        <strong>${currentLanguage === "zh" ? `${readiness.blockedCount} 阻塞` : `${readiness.blockedCount} blocked`}</strong>
      </div>
      <div class="readiness-mapping">${mappingRows}</div>
      <ul class="readiness-rules">${ruleRows}</ul>
      <div class="next-export-request"><strong>${escapeHtml(text("nextExportRequest"))}</strong><ul>${nextExports}</ul></div>`;
    setMessage(text("headerComplete", { ready: readiness.readyCount, blocked: readiness.blockedCount }), false);
  }

  function buildSampleScanResult() {
    const currentParse = namespace.csv.parseCsvText(currentLanguage === "zh" ? namespace.samples.currentRunZh : namespace.samples.currentRun);
    const historyParse = namespace.csv.parseCsvText(currentLanguage === "zh" ? namespace.samples.historyZh : namespace.samples.history);
    const aliasParse = namespace.csv.parseCsvText(currentLanguage === "zh" ? namespace.samples.aliasesZh : namespace.samples.aliases);
    return namespace.scanner.runScan(currentParse, historyParse, aliasParse);
  }

  function escapeHtml(value) {
    return String(value === null || value === undefined ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function renderRows() {
    if (!lastScanResult) {
      elements.resultBody.innerHTML = `<tr class="empty-row"><td colspan="8" class="empty">${escapeHtml(text("emptyQueueBuild"))}</td></tr>`;
      elements.mobileResultList.innerHTML = `<p class="empty">${escapeHtml(text("emptyQueueBuild"))}</p>`;
      return;
    }

    const items = lastScanResult.items.filter((item) => activeQueue === "ALL" || item.queue === activeQueue);
    if (items.length === 0) {
      elements.resultBody.innerHTML = `<tr class="empty-row"><td colspan="8" class="empty">${escapeHtml(text("noRowsQueue"))}</td></tr>`;
      elements.mobileResultList.innerHTML = `<p class="empty">${escapeHtml(text("noRowsQueue"))}</p>`;
      return;
    }

    elements.resultBody.innerHTML = items.map((item) => {
      const reasons = item.reasons.map((reason) => `<li>${escapeHtml(namespace.reports.reasonText(reason, currentLanguage))}</li>`).join("");
      const queueLabel = item.queue === "PASS" ? "CLEAR" : item.queue;
      return `<tr>
        <td data-label="${escapeHtml(text("queue"))}"><span class="queue-badge ${item.queue.toLowerCase()}">${queueLabel}</span></td>
        <td data-label="${escapeHtml(text("score"))}"><strong>${item.score}</strong></td>
        <td data-label="${escapeHtml(text("vendorPayee"))}">${escapeHtml(item.vendor)}<br><small>${escapeHtml(text("row", { row: item.rowNumber }))}</small></td>
        <td data-label="${escapeHtml(text("invoice"))}">${escapeHtml(item.invoiceNumber)}<br><small>${escapeHtml(item.invoiceNormalized)}</small></td>
        <td data-label="${escapeHtml(text("amount"))}">${escapeHtml(namespace.scanner.amountDisplay(item.amountCents))}</td>
        <td data-label="${escapeHtml(text("date"))}">${escapeHtml(item.dateText)}</td>
        <td data-label="${escapeHtml(text("status"))}">${escapeHtml(item.status || "")}<br><small>${escapeHtml(item.paymentId || "")}</small></td>
        <td data-label="${escapeHtml(text("reason"))}"><ul class="reason-list">${reasons}</ul></td>
      </tr>`;
    }).join("");

    elements.mobileResultList.innerHTML = items.map((item) => {
      const reasons = item.reasons.map((reason) => `<li>${escapeHtml(namespace.reports.reasonText(reason, currentLanguage))}</li>`).join("");
      const queueLabel = item.queue === "PASS" ? "CLEAR" : item.queue;
      return `<article class="mobile-result-card">
        <div class="mobile-result-topline">
          <span class="queue-badge ${item.queue.toLowerCase()}">${queueLabel}</span>
          <strong>${item.score}</strong>
          <span>${escapeHtml(namespace.scanner.amountDisplay(item.amountCents))}</span>
        </div>
        <dl>
          <div><dt>${escapeHtml(text("vendorPayee"))}</dt><dd>${escapeHtml(item.vendor)} <small>${escapeHtml(text("row", { row: item.rowNumber }))}</small></dd></div>
          <div><dt>${escapeHtml(text("invoice"))}</dt><dd>${escapeHtml(item.invoiceNumber)} <small>${escapeHtml(item.invoiceNormalized)}</small></dd></div>
          <div><dt>${escapeHtml(text("date"))}</dt><dd>${escapeHtml(item.dateText)}</dd></div>
          <div><dt>${escapeHtml(text("status"))}</dt><dd>${escapeHtml(item.status || "")} <small>${escapeHtml(item.paymentId || "")}</small></dd></div>
        </dl>
        <div class="mobile-result-reasons"><span>${escapeHtml(text("reason"))}</span><ul class="reason-list">${reasons}</ul></div>
      </article>`;
    }).join("");
  }

  function renderSummary(scanResult) {
    elements.overallRisk.textContent = String(scanResult.overallRisk);
    elements.holdCount.textContent = String(scanResult.queueCounts.HOLD);
    elements.reviewCount.textContent = String(scanResult.queueCounts.REVIEW);
    elements.passCount.textContent = String(scanResult.queueCounts.PASS);
    elements.overallCopy.textContent = scanResult.queueCounts.HOLD > 0
      ? text("highRisk")
      : text("noHold");
    elements.downloadCsv.disabled = scanResult.items.length === 0;
    elements.downloadHtml.disabled = scanResult.items.length === 0;
    elements.reportReady.textContent = scanResult.items.length === 0
      ? text("reportDisabled")
      : text("reportReady", { rows: scanResult.currentRowCount || 0, hold: scanResult.queueCounts.HOLD, review: scanResult.queueCounts.REVIEW, signals: (scanResult.mlSummary || {}).signalCount || 0 });
  }

  function runScanner() {
    try {
      const currentParse = namespace.csv.parseCsvText(elements.currentInput.value);
      const historyParse = namespace.csv.parseCsvText(elements.historyInput.value);
      const aliasParse = namespace.csv.parseCsvText(elements.aliasInput.value);

      if (currentParse.rows.length === 0) {
        throw new Error(text("currentCsvRequired"));
      }

      lastScanResult = namespace.scanner.runScan(currentParse, historyParse, aliasParse);
      renderSummary(lastScanResult);
      renderMapping(lastScanResult);
      renderEvidencePassport(lastScanResult);
      renderRows();
      setMessage(text("scannedRows", { rows: lastScanResult.currentRowCount }), false);
    } catch (error) {
      setMessage(error.message, true);
    }
  }

  async function loadFileToTextarea(file, textareaElement) {
    textareaElement.value = await namespace.csv.readTextFile(file);
    setMessage(text("csvLoaded"), false);
  }

  function bindFile(inputElement, textareaElement) {
    inputElement.addEventListener("change", async () => {
      try {
        await loadFileToTextarea(inputElement.files[0], textareaElement);
      } catch (error) {
        inputElement.value = "";
        setMessage(error.message, true);
      }
    });

    const dropZone = inputElement.closest(".file-drop");
    if (!dropZone) {
      return;
    }

    dropZone.addEventListener("dragover", (event) => {
      event.preventDefault();
      dropZone.classList.add("is-dragging");
    });

    dropZone.addEventListener("dragleave", () => {
      dropZone.classList.remove("is-dragging");
    });

    dropZone.addEventListener("drop", async (event) => {
      event.preventDefault();
      dropZone.classList.remove("is-dragging");

      try {
        const file = event.dataTransfer.files[0];
        if (!file) {
          return;
        }
        await loadFileToTextarea(file, textareaElement);
      } catch (error) {
        setMessage(error.message, true);
      }
    });
  }

  function bindEvents() {
    const sampleText = (key) => {
      const chineseKey = `${key}Zh`;
      return currentLanguage === "zh" && namespace.samples[chineseKey]
        ? namespace.samples[chineseKey]
        : namespace.samples[key];
    };

    const loadSamplesAndRun = () => {
      elements.currentInput.value = sampleText("currentRun");
      elements.historyInput.value = sampleText("history");
      elements.aliasInput.value = sampleText("aliases");
      runScanner();
      document.getElementById("results").scrollIntoView({ behavior: "smooth", block: "start" });
    };

    document.getElementById("load-current-sample").addEventListener("click", () => {
      elements.currentInput.value = sampleText("currentRun");
      setMessage(text("currentSampleLoaded"), false);
    });
    document.getElementById("load-history-sample").addEventListener("click", () => {
      elements.historyInput.value = sampleText("history");
      setMessage(text("historySampleLoaded"), false);
    });
    document.getElementById("load-alias-sample").addEventListener("click", () => {
      elements.aliasInput.value = sampleText("aliases");
      setMessage(text("aliasSampleLoaded"), false);
    });
    document.getElementById("load-all-samples").addEventListener("click", loadSamplesAndRun);
    document.getElementById("mobile-load-all-samples").addEventListener("click", loadSamplesAndRun);
    const sampleDownloadButton = document.getElementById("download-sample-html");
    if (sampleDownloadButton) {
      sampleDownloadButton.addEventListener("click", () => {
        const sampleScanResult = buildSampleScanResult();
        namespace.reports.downloadText(
          "sample_duplicate_payment_risk_report.html",
          namespace.reports.buildHtmlReport(sampleScanResult, currentLanguage),
          "text/html"
        );
        setMessage(currentLanguage === "zh" ? "已在本地下载模拟样本 HTML 证据报告。" : "Downloaded fake-sample HTML proof report locally.", false);
      });
    }
    document.getElementById("load-header-sample").addEventListener("click", () => {
      elements.headerInput.value = currentLanguage === "zh"
        ? "供应商名称,发票号,付款金额,付款日期,付款编号,付款状态"
        : "vendor_name,invoice_number,amount,invoice_date,payment_id,status";
      renderHeaderReadiness();
    });
    document.getElementById("run-header-check").addEventListener("click", renderHeaderReadiness);
    document.getElementById("run-scan").addEventListener("click", runScanner);
    document.getElementById("clear-all").addEventListener("click", () => {
      elements.currentInput.value = "";
      elements.historyInput.value = "";
      elements.aliasInput.value = "";
      elements.headerInput.value = "";
      elements.currentFile.value = "";
      elements.historyFile.value = "";
      elements.aliasFile.value = "";
      lastScanResult = null;
      renderSummary({ overallRisk: 0, queueCounts: { HOLD: 0, REVIEW: 0, PASS: 0 }, items: [] });
      renderBuyerDecisionGuidance(null);
      elements.resultDecisionCard.dataset.status = "not_run";
      elements.mappingCopy.textContent = text("noInputScanned");
      elements.mappingList.innerHTML = "";
      renderEvidencePassport(null);
      elements.headerReadinessOutput.innerHTML = text("pasteHeaders");
      renderRows();
      setMessage(text("clearedInputs"), false);
    });

    document.querySelectorAll(".tab").forEach((button) => {
      button.addEventListener("click", () => {
        activeQueue = button.dataset.queue === "CLEAR" ? "PASS" : button.dataset.queue;
        document.querySelectorAll(".tab").forEach((tab) => tab.classList.remove("active"));
        button.classList.add("active");
        renderRows();
      });
    });

    elements.downloadCsv.addEventListener("click", () => {
      if (!lastScanResult) {
        return;
      }
      namespace.reports.downloadText("duplicate_payment_risk_report.csv", namespace.reports.buildCsvReport(lastScanResult, currentLanguage), "text/csv");
    });

    elements.downloadHtml.addEventListener("click", () => {
      if (!lastScanResult) {
        return;
      }
      namespace.reports.downloadText("duplicate_payment_risk_report.html", namespace.reports.buildHtmlReport(lastScanResult, currentLanguage), "text/html");
    });

    bindFile(elements.currentFile, elements.currentInput);
    bindFile(elements.historyFile, elements.historyInput);
    bindFile(elements.aliasFile, elements.aliasInput);
    document.querySelectorAll("[data-language]").forEach((button) => {
      button.addEventListener("click", () => setLanguage(button.dataset.language));
    });
  }

  namespace.i18n = {
    getLanguage: () => currentLanguage,
    translateBuyerGuidance,
  };
  installNetworkGuard();
  bindEvents();
  setLanguage("en");
})();
