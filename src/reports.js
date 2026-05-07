(function () {
  const namespace = window.DPRS || {};

  function translateMlMessage(message, language) {
    const text = String(message || "");
    if (language !== "zh") {
      return text;
    }
    let match = text.match(/^Global robust amount anomaly: ([0-9.]+) median-absolute-deviation units from the local payment baseline\.$/);
    if (match) {
      return `全局金额稳健异常：距离本地付款金额基线 ${match[1]} 个中位数绝对偏差单位。`;
    }
    match = text.match(/^Vendor-level robust amount anomaly: ([0-9.]+) median-absolute-deviation units from this payee's local baseline\.$/);
    if (match) {
      return `供应商金额稳健异常：距离该收款方本地金额基线 ${match[1]} 个中位数绝对偏差单位。`;
    }
    match = text.match(/^Limited vendor baseline: only (\d+) local amount row\(s\) for this payee, so rule evidence should be reviewed before release\.$/);
    if (match) {
      return `供应商本地基线有限：该收款方只有 ${match[1]} 条本地金额记录，付款放行前应人工复核规则证据。`;
    }
    match = text.match(/^Record completeness is (\d+)%; missing fields reduce machine-assisted confidence\.$/);
    if (match) {
      return `记录完整度为 ${match[1]}%；缺失字段会降低本地机器辅助判断的可信度。`;
    }
    if (text === "Vendor/payee is not present in the paid-history baseline supplied to this local scan.") {
      return "该供应商/收款方未出现在本次本地扫描提供的已付款历史基线中。";
    }
    if (text === "No local unsupervised amount, vendor-history, or completeness signal exceeded the review threshold.") {
      return "本地无监督金额、供应商历史或完整度信号均未超过复核阈值。";
    }
    return text;
  }

  function mlEvidenceText(evidence, language) {
    if (Array.isArray(evidence)) {
      return evidence
        .map((entry) => entry && entry.message ? translateMlMessage(entry.message, language) : translateMlMessage(entry || "", language))
        .filter(Boolean)
        .join(" ");
    }
    return translateMlMessage(evidence, language);
  }

  function reasonText(reason, language) {
    const rule = reason && reason.rule ? reason.rule : "";
    const message = reason && reason.message ? reason.message : "";
    if (language !== "zh") {
      return message;
    }

    let match = message.match(/across rows ([0-9,\s]+)/i);
    if (rule === "exact_duplicate_invoice") {
      return match ? `当前付款批次中存在完全重复发票，涉及第 ${match[1].trim()} 行。` : "当前付款批次中存在完全重复发票。";
    }
    if (rule === "normalized_invoice_match") {
      return match ? `发票号去除标点、空格和大小写差异后匹配，涉及第 ${match[1].trim()} 行。` : "发票号规范化后匹配。";
    }

    match = message.match(/appears on rows ([0-9,\s]+)/i);
    if (rule === "current_run_duplicate_rows") {
      return match ? `当前付款批次的重复行签名出现在第 ${match[1].trim()} 行。` : "当前付款批次存在重复行签名。";
    }

    match = message.match(/within (\d+) day\(s\), but invoice numbers differ/i);
    if (rule === "same_vendor_amount_date_window") {
      return match ? `同一供应商同金额在 ${match[1]} 天内重复出现，但发票号不同。` : "同一供应商同金额在短时间窗口内重复出现。";
    }

    match = message.match(/Matches paid history row (\d+) by vendor, normalized invoice, and amount/i);
    if (rule === "historical_paid_comparison" && match) {
      return `与已付款历史第 ${match[1]} 行在供应商、规范化发票号和金额上匹配。`;
    }
    match = message.match(/Near paid-history match: same vendor and amount within (\d+) day\(s\), history row (\d+)/i);
    if (rule === "historical_paid_comparison" && match) {
      return `接近已付款历史匹配：同一供应商同金额在 ${match[1]} 天内出现，历史行号为第 ${match[2]} 行。`;
    }

    match = message.match(/Vendor\/payee aliases may refer to the same payee: (.+)\./i);
    if (rule === "vendor_payee_alias_review") {
      return match ? `供应商/收款方别名可能指向同一收款对象：${match[1]}。` : "供应商/收款方别名可能指向同一收款对象。";
    }

    if (rule === "clear") {
      return "本次扫描未发现入门级重复付款风险。";
    }

    return message;
  }

  function ruleLabel(rule, language) {
    const labels = {
      exact_duplicate_invoice: { en: "Exact duplicate invoice", zh: "完全重复发票" },
      normalized_invoice_match: { en: "Normalized invoice match", zh: "规范化发票号匹配" },
      same_vendor_amount_date_window: { en: "Same vendor + amount + date window", zh: "同供应商同金额短期重复" },
      current_run_duplicate_rows: { en: "Current run duplicate rows", zh: "当前付款批次重复行" },
      historical_paid_comparison: { en: "Historical paid comparison", zh: "历史已付款比对" },
      vendor_payee_alias_review: { en: "Vendor/payee alias review", zh: "供应商/收款方别名复核" },
      vendor_alias_review: { en: "Vendor/payee alias review", zh: "供应商/收款方别名复核" },
      global_amount_anomaly: { en: "Global amount anomaly", zh: "全局金额异常" },
      vendor_amount_anomaly: { en: "Vendor amount anomaly", zh: "供应商金额异常" },
      limited_vendor_baseline: { en: "Limited vendor baseline", zh: "供应商基线有限" },
      missing_vendor_history: { en: "Missing vendor history", zh: "供应商历史缺失" },
      record_completeness_gap: { en: "Record completeness gap", zh: "记录完整度缺口" },
      clear: { en: "No duplicate-payment rule triggered", zh: "未触发重复付款规则" },
    };
    return (labels[rule] || {})[language] || (labels[rule] || {}).en || rule;
  }

  function sourceProfileLabel(value, language) {
    const labels = {
      payment_run_export: { en: "Payment run export", zh: "付款批次导出" },
      paid_history_export: { en: "Paid history export", zh: "已付款历史导出" },
      quickbooks_like_export: { en: "QuickBooks-like export", zh: "QuickBooks 类导出" },
      xero_like_export: { en: "Xero-like export", zh: "Xero 类导出" },
      bank_statement_like_export: { en: "Bank statement-like export", zh: "银行流水类导出" },
      shopify_or_payout_like_export: { en: "Shopify / payout-like export", zh: "Shopify / 回款类导出" },
      odoo_like_export: { en: "Odoo-like export", zh: "Odoo 类导出" },
      generic_ap_export: { en: "Generic AP export", zh: "通用 AP 导出" },
    };
    return (labels[value] || {})[language] || (labels[value] || {}).en || value;
  }

  function sourceNameLabel(value, language) {
    const labels = {
      current: { en: "Current payment run", zh: "当前付款批次" },
      history: { en: "Paid history", zh: "已付款历史" },
      paid_history: { en: "Paid history", zh: "已付款历史" },
      aliases: { en: "Vendor aliases", zh: "供应商别名" },
      alias: { en: "Vendor aliases", zh: "供应商别名" },
      vendor_aliases: { en: "Vendor aliases", zh: "供应商别名" },
    };
    return (labels[value] || {})[language] || (labels[value] || {}).en || value;
  }

  function fieldLabel(field, language) {
    const labels = {
      vendor: { en: "Vendor / Payee", zh: "供应商/收款方" },
      "vendor payee": { en: "Vendor / Payee", zh: "供应商/收款方" },
      invoice_number: { en: "Invoice number", zh: "发票号" },
      "invoice number": { en: "Invoice number", zh: "发票号" },
      amount: { en: "Amount", zh: "金额" },
      date: { en: "Date", zh: "日期" },
      payment_id: { en: "Payment ID", zh: "付款编号" },
      "payment id": { en: "Payment ID", zh: "付款编号" },
      status: { en: "Status", zh: "状态" },
    };
    return (labels[field] || {})[language] || (labels[field] || {}).en || field;
  }

  function scorecardVersionLabel(value, language) {
    return ({
      local_unsupervised_signal_v1: "本地无监督信号 v1",
    })[value] && language === "zh"
      ? "本地无监督信号 v1"
      : ({ local_unsupervised_signal_v1: "Local unsupervised signal v1" })[value] || value;
  }

  function queueDisplayLabel(value, language) {
    const queue = value === "PASS" ? "CLEAR" : value;
    if (language !== "zh") {
      return queue;
    }
    return ({
      HOLD: "HOLD（暂停复核）",
      REVIEW: "REVIEW（人工复核）",
      CLEAR: "CLEAR（可继续）",
    })[queue] || queue;
  }

  function localizedCommaList(value, language, itemTranslator) {
    if (language !== "zh") {
      return value;
    }
    return String(value || "")
      .split(/,\s*/)
      .map((item) => item.trim())
      .filter(Boolean)
      .map((item) => itemTranslator(item, language))
      .join("、");
  }

  function statusText(status, language) {
    const labels = {
      ready: { en: "Ready", zh: "就绪" },
      review: { en: "Needs confirmation", zh: "需确认" },
      missing: { en: "Missing", zh: "缺失" },
      blocked: { en: "Blocked", zh: "阻塞" },
      partial: { en: "Partially ready", zh: "部分就绪" },
      blocked_or_partial: { en: "Blocked or partially ready", zh: "阻塞或部分就绪" },
    };
    return (labels[status] || {})[language] || (labels[status] || {}).en || status;
  }

  function requiredText(required, language) {
    const labels = {
      vendor: { en: "Vendor / Payee", zh: "供应商/收款方" },
      invoice_number: { en: "Invoice number", zh: "发票号" },
      amount: { en: "Amount", zh: "金额" },
      date: { en: "Date", zh: "日期" },
      payment_id: { en: "Payment ID", zh: "付款编号" },
      status: { en: "Status", zh: "状态" },
      "current vendor": { en: "Current vendor / payee", zh: "当前供应商/收款方" },
      "current invoice": { en: "Current invoice number", zh: "当前发票号" },
      "current amount": { en: "Current amount", zh: "当前金额" },
      "history vendor": { en: "History vendor / payee", zh: "历史供应商/收款方" },
      "history invoice": { en: "History invoice number", zh: "历史发票号" },
      "history amount": { en: "History amount", zh: "历史金额" },
      "alias map": { en: "Alias map", zh: "别名映射" },
    };
    return String(required || "")
      .split("; ")
      .map((value) => (labels[value] || {})[language] || (labels[value] || {}).en || value)
      .join(language === "zh" ? "；" : "; ");
  }

  function noteText(note, language) {
    if (language !== "zh") {
      return note;
    }
    return ({
      "Needs current-run vendor, invoice, and amount fields.": "需要当前付款批次中的供应商/收款方、发票号和金额字段。",
      "Needs current-run vendor, invoice, and amount fields; punctuation is normalized locally.": "需要当前付款批次中的供应商/收款方、发票号和金额字段；标点差异会在本地规范化处理。",
      "Best when the current payment run includes a batch or payment reference.": "当前付款批次包含批次号或付款参考号时效果最好。",
      "Needs current-run vendor, amount, and date fields.": "需要当前付款批次中的供应商/收款方、金额和日期字段。",
      "Paid-history rows are available for comparison.": "已付款历史行可用于比对。",
      "Add paid-history rows to unlock historical duplicate checks.": "请补充已付款历史行，以启用历史重复付款检查。",
      "Vendor alias rows are available.": "供应商别名行可用于复核。",
      "Add alias rows to strengthen payee/entity review.": "请补充别名行，以增强收款方/主体复核。",
    })[note] || note;
  }

  function fieldEvidenceText(row, language) {
    const evidenceLabels = {
      reused_field_mapping_alias: { en: "known alias", zh: "已知字段别名" },
      clear_chinese_alias: { en: "Chinese AP alias", zh: "中文 AP 字段别名" },
      reused_detect_field_mapping: { en: "shared mapper", zh: "共享字段映射器" },
      sample_values_look_numeric_amount: { en: "sample values look numeric", zh: "样例值呈现金额特征" },
      sample_values_look_like_dates: { en: "sample values look like dates", zh: "样例值呈现日期特征" },
      sample_values_look_like_invoice_numbers: { en: "sample values look like invoice numbers", zh: "样例值呈现发票号特征" },
      sample_values_look_like_payment_ids: { en: "sample values look like payment ids", zh: "样例值呈现付款编号特征" },
      sample_values_look_like_names: { en: "sample values look like names", zh: "样例值呈现名称特征" },
    };
    const evidenceText = (row.evidence || []).map((item) => {
      const label = (evidenceLabels[item.type] || {})[language] || item.type;
      return `${label}${item.score !== undefined ? ` ${item.score}` : ""}`;
    });
    const candidateText = (row.candidates || []).slice(0, 3).map((candidate) => `${fieldLabel(candidate.field, language)} ${candidate.score}`);
    const prefix = evidenceText.length ? evidenceText.join("; ") : (language === "zh" ? "无直接证据" : "no direct evidence");
    if (!candidateText.length) {
      return prefix;
    }
    return `${prefix} | ${language === "zh" ? "候选" : "candidates"}: ${candidateText.join(", ")}`;
  }

  function displayHeaderList(headers, language) {
    return (headers || [])
      .map((header) => {
        return displayHeaderName(header, language);
      })
      .join(", ");
  }

  function displayHeaderName(header, language) {
    const text = String(header || "");
    if (language === "zh") {
      return text;
    }
    return text.replace(/_/g, " ");
  }

  function reportRows(items, language) {
    return items.map((item) => ({
      queue: item.queue === "PASS" ? "CLEAR" : item.queue,
      risk_score: item.score,
      row_number: item.rowNumber,
      vendor_payee: item.vendor,
      canonical_vendor: item.vendorCanonical,
      invoice_number: item.invoiceNumber,
      normalized_invoice: item.invoiceNormalized,
      amount: namespace.scanner.amountDisplay(item.amountCents),
      date: item.dateText,
      payment_id: item.paymentId,
      status: item.status,
      matched_rows: item.matchedRows.join("; "),
      ml_scorecard_version: item.mlSignal ? scorecardVersionLabel(item.mlSignal.scorecardVersion, language) : "",
      ml_signal_score: item.mlSignal ? item.mlSignal.signalScore : "",
      ml_signal_evidence: item.mlSignal ? mlEvidenceText(item.mlSignal.evidence, language) : "",
      reason: item.reasons.map((reason) => `${ruleLabel(reason.rule, language)}: ${reasonText(reason, language)}`).join(" | "),
    }));
  }

  function escapeHtml(value) {
    return String(value === null || value === undefined ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  const reportText = {
    title: { en: "Duplicate Payment Risk Report", zh: "付款前重复付款风险复核报告" },
    generated: { en: "Generated locally in browser at {time}. No network upload is required by this report generator.", zh: "报告于 {time} 在浏览器本地生成。此报告生成器不需要网络上传，也不会上传敏感财务数据。" },
    bilingualNote: { en: "Language note: this report is in English. Use the scanner language switch to download the Chinese version.", zh: "语言说明：当前报告为中文版本。如需英文版本，请在复核工具中切换到 EN 后重新下载。" },
    mlEvidence: { en: "Local review evidence:", zh: "本地机器辅助证据：" },
    mlScorecard: { en: "Review signal scorecard:", zh: "机器辅助评分卡：" },
    defaultMl: { en: "Local unsupervised signals are included when available.", zh: "如可用，将包含本地无监督信号。" },
    overallRisk: { en: "Overall risk", zh: "本批次总体风险" },
    currentRows: { en: "Current rows", zh: "当前付款明细" },
    historyRows: { en: "Paid history rows", zh: "已付款历史行数" },
    mlSignals: { en: "ML review signals", zh: "本地机器复核信号" },
    controllerSummary: { en: "Controller action summary", zh: "财务复核摘要" },
    immediateAction: { en: "Immediate action", zh: "建议动作" },
    evidenceBasis: { en: "Evidence basis", zh: "证据依据" },
    paymentReleaseImpact: { en: "Payment-release impact", zh: "付款放行影响" },
    actionArea: { en: "Area", zh: "类别" },
    actionCount: { en: "Count", zh: "数量" },
    actionRecommendation: { en: "Recommended action", zh: "推荐处理" },
    actionEvidence: { en: "What triggered it", zh: "触发依据" },
    buyerDecision: { en: "Buyer decision", zh: "下一步建议" },
    runBeforeBuying: { en: "Run scanner before buying.", zh: "购买前请先运行本地复核。" },
    decisionFallback: { en: "Use the field, rule, and signal evidence below before deciding whether to buy the bundle or setup service.", zh: "决定是否购买自助包或首轮字段映射与运行配置服务前，请先查看下方字段、规则和信号证据。" },
    downloadFreeProof: { en: "Download free proof pack", zh: "下载免费验证包" },
    viewSample: { en: "View sample report", zh: "查看样本报告" },
    why: { en: "Why this recommendation", zh: "推荐原因" },
    nextSteps: { en: "Next steps", zh: "后续步骤" },
    queue: { en: "Queue", zh: "队列" },
    score: { en: "Score", zh: "分数" },
    row: { en: "Row", zh: "行号" },
    vendor: { en: "Vendor / Payee", zh: "供应商 / 收款方" },
    invoice: { en: "Invoice", zh: "发票" },
    amount: { en: "Amount", zh: "金额" },
    date: { en: "Date", zh: "日期" },
    reason: { en: "Reason", zh: "原因" },
    sourceProfile: { en: "Source Export Profile", zh: "数据来源画像" },
    source: { en: "Source", zh: "来源" },
    likelyProfile: { en: "Likely profile", zh: "可能来源类型" },
    headers: { en: "Headers", zh: "表头数" },
    rows: { en: "Rows", zh: "行数" },
    headerList: { en: "Header list", zh: "表头列表" },
    anomalySignals: { en: "ML-Assisted Anomaly Signals", zh: "本地机器辅助异常信号" },
    anomalyNote: { en: "These are explainable local unsupervised signals, not a fraud guarantee or audit opinion. They help prioritize review when the same CSV export has amount outliers, limited vendor history, or incomplete evidence fields.", zh: "这些是可解释的本地无监督信号，并非反舞弊保证或审计意见。当同一 CSV 导出存在金额离群、供应商历史有限或证据字段不完整时，它们用于辅助排序复核优先级。" },
    scorecard: { en: "Scorecard", zh: "评分卡" },
    signalScore: { en: "Signal score", zh: "信号分" },
    globalRobustZ: { en: "Global robust Z", zh: "全局稳健 Z" },
    vendorRobustZ: { en: "Vendor robust Z", zh: "供应商稳健 Z" },
    completeness: { en: "Completeness", zh: "完整度" },
    evidence: { en: "Evidence", zh: "证据" },
    fieldLedger: { en: "Field Mapping Confidence Ledger", zh: "字段适配可信度台账" },
    field: { en: "Field", zh: "字段" },
    detectedHeader: { en: "Detected header", zh: "检测到的表头" },
    confidence: { en: "Confidence", zh: "置信度" },
    fieldEvidence: { en: "Mapping evidence", zh: "映射证据" },
    status: { en: "Status", zh: "状态" },
    ruleLedger: { en: "Rule Readiness Ledger", zh: "规则可运行性台账" },
    rule: { en: "Rule", zh: "规则" },
    requiredEvidence: { en: "Required evidence", zh: "所需证据" },
    note: { en: "Note", zh: "说明" },
    notDetected: { en: "Not detected", zh: "未检测到" },
  };

  const buyerText = {
    "Do not buy yet": "暂不购买",
    "Self-serve ready": "适合自助复核",
    "Setup recommended": "建议先做首轮字段映射与运行配置服务",
    "Export is not ready for a paid AP review.": "当前导出尚不适合进入付费 AP 复核。",
    "This export is a fit for the USD49 self-serve bundle.": "当前导出适合使用 49 美元自助复核套件。",
    "This export likely needs the USD149 first-run setup before self-service.": "当前导出在自助使用前，建议先做 149 美元首轮字段映射与运行配置服务。",
    "Core evidence is missing. Use the free proof path first and export stronger AP columns before buying the bundle or setup.": "核心证据字段缺失。购买自助包或首轮字段映射与运行配置服务前，先使用免费验证包，并导出更完整的 AP 字段。",
    "The current export has enough field confidence and rule readiness to use the local AP control workflow without a mapping call.": "当前导出已具备足够的字段适配可信度和规则可运行性，可直接使用本地 AP 内控复核流程，无需额外字段适配沟通。",
    "Some checks are ready, but blocked rules or uncertain fields mean a short mapping review would reduce false confidence.": "部分检查已可运行，但被阻塞规则或不确定字段仍可能造成误判；短字段适配复核可以降低错误信心。",
    "Open USD49 bundle": "查看 49 美元自助包",
    "Open USD149 setup": "查看 149 美元配置服务",
    "View sample report": "查看样本报告",
    "Download free proof pack": "下载免费验证包",
  };

  const reportColumnKeys = [
    "queue",
    "risk_score",
    "row_number",
    "vendor_payee",
    "canonical_vendor",
    "invoice_number",
    "normalized_invoice",
    "amount",
    "date",
    "payment_id",
    "status",
    "matched_rows",
    "ml_scorecard_version",
    "ml_signal_score",
    "ml_signal_evidence",
    "reason",
  ];

  const csvHeaderLabels = {
    en: {
      queue: "Queue",
      risk_score: "Risk score",
      row_number: "Row number",
      vendor_payee: "Vendor / Payee",
      canonical_vendor: "Normalized vendor",
      invoice_number: "Invoice number",
      normalized_invoice: "Normalized invoice",
      amount: "Amount",
      date: "Date",
      payment_id: "Payment ID",
      status: "Status",
      matched_rows: "Matched rows",
      ml_scorecard_version: "Review signal version",
      ml_signal_score: "Review signal score",
      ml_signal_evidence: "Review signal evidence",
      reason: "Reason",
    },
    zh: {
      queue: "队列",
      risk_score: "风险分数",
      row_number: "行号",
      vendor_payee: "供应商/收款方",
      canonical_vendor: "规范化供应商",
      invoice_number: "发票号",
      normalized_invoice: "规范化发票号",
      amount: "金额",
      date: "日期",
      payment_id: "付款编号",
      status: "状态",
      matched_rows: "匹配行",
      ml_scorecard_version: "机器辅助评分卡版本",
      ml_signal_score: "机器辅助信号分",
      ml_signal_evidence: "机器辅助信号证据",
      reason: "原因",
    },
  };

  function csvReportHeaders(language) {
    const labels = csvHeaderLabels[language] || {};
    return reportColumnKeys.map((header) => labels[header] || header);
  }

  function localizeCsvReportRows(rows, language) {
    const labels = csvHeaderLabels[language] || {};
    if (!Object.keys(labels).length) {
      return rows;
    }
    return rows.map((row) => Object.fromEntries(
      reportColumnKeys.map((header) => [labels[header] || header, row[header]])
    ));
  }

  function reportLabel(language, key, values) {
    const entry = reportText[key] || {};
    let template = entry[language] || entry.en || key;
    Object.entries(values || {}).forEach(([name, value]) => {
      template = template.replace(new RegExp(`\\{${name}\\}`, "g"), String(value));
    });
    return template;
  }

  function translateBuyerText(value, language) {
    if (language !== "zh") {
      return String(value || "")
        .replace(/^Source profile: (.+) at (\d+)% confidence\.$/, (_all, profile, confidence) => `Source profile: ${sourceProfileLabel(profile, language)} at ${confidence}% confidence.`)
        .replace(/^Missing core fields: (.+)\.$/, (_all, fields) => `Missing core fields: ${localizedCommaList(fields, language, fieldLabel)}.`)
        .replace(/^Blocked or partial checks: (.+)\.$/, (_all, rules) => `Blocked or partially ready checks: ${localizedCommaList(rules, language, ruleLabel)}.`);
    }
    return (buyerText[value] || value)
      .replace(/^Current export rows: (\d+)\./, "当前导出行数：$1。")
      .replace(/^Paid history rows: (\d+)\./, "已付款历史行数：$1。")
      .replace(/^Alias mappings loaded: (\d+)\./, "已加载别名映射：$1。")
      .replace(/^(\d+)\/(\d+) bundled checks are ready from this local export\.$/, "本地导出中已有 $1/$2 项内置检查具备运行条件。")
      .replace(/^(\d+) AP fields mapped confidently; (\d+) need confirmation; (\d+) are missing\.$/, "$1 个 AP 字段已高置信度适配；$2 个需要确认；$3 个缺失。")
      .replace(/^(\d+) current-run rows, (\d+) paid-history rows, and (\d+) alias rows were available\.$/, "本次可用数据包括 $1 条当前付款行、$2 条已付款历史行和 $3 条别名映射行。")
      .replace(/^Source profile: (.+) at (\d+)% confidence\.$/, (_all, profile, confidence) => `数据来源画像：${sourceProfileLabel(profile, language)}，置信度 ${confidence}%。`)
      .replace(/^Missing core fields: (.+)\.$/, (_all, fields) => `缺少核心字段：${localizedCommaList(fields, language, fieldLabel)}。`)
      .replace(/^Blocked or partial checks: (.+)\.$/, (_all, rules) => `阻塞或部分就绪检查：${localizedCommaList(rules, language, ruleLabel)}。`)
      .replace("Too few checks are ready to make a paid review useful.", "可运行检查太少，付费复核暂时价值有限。")
      .replace("Field confidence should be confirmed before relying on the queue.", "依赖异常队列前，应先确认字段适配可信度。")
      .replace("Run the free proof pack with demo or redacted rows.", "先用模拟数据行或脱敏行运行免费验证包。")
      .replace("Export vendor/payee, invoice number, amount, and payment or bill date columns.", "导出供应商/收款方、发票号、金额，以及付款日期或账单日期字段。")
      .replace("Run the header checker again before sending any private AP rows.", "发送任何私密 AP 明细前，先重新运行表头检查。")
      .replace("Buy setup only after the passport shows enough fields to review.", "只有在导出适配报告显示字段足够复核后，再考虑配置服务。")
      .replace("Export vendor/payee, invoice, amount, date, payment id, and status if available.", "尽量导出供应商/收款方、发票、金额、日期、付款编号和状态。")
      .replace("Use setup only after headers or sample rows show enough AP context.", "只有在表头或样本行呈现足够 AP 上下文后，再使用首轮字段映射与运行配置服务。")
      .replace("Download the bundle and run it against a redacted first export.", "下载自助包，并用第一份脱敏导出文件运行。")
      .replace("Use HOLD rows as the payment stop list and REVIEW rows as the AP follow-up list.", "将 HOLD 行作为付款暂停清单，将 REVIEW 行作为 AP 跟进复核清单。")
      .replace("Keep the CSV/HTML report as local evidence for the run.", "将 CSV/HTML 报告作为本次付款前复核的本地证据留存。")
      .replace("Review HOLD rows first, then REVIEW rows before any payment release.", "付款放行前，先复核 HOLD 行，再复核 REVIEW 行。")
      .replace("Save the HTML report and CSV queue as controller evidence.", "保存 HTML 报告和 CSV 队列，作为财务负责人复核证据。")
      .replace("Use setup only if your live export differs from this sample-ready structure.", "只有当你的真实导出与这个样本结构不同，再考虑配置服务。")
      .replace("Send headers or redacted rows for first-run setup.", "发送表头或脱敏行，用于首轮字段映射与运行配置服务。")
      .replace("Send only headers, demo rows, or redacted rows for mapping review.", "只发送表头、模拟行或脱敏行用于字段映射复核。")
      .replace("Ask for a first-run readiness note before using the queue in a payment process.", "在把异常队列用于付款流程前，先获取首轮就绪说明。")
      .replace("Move to self-serve only after core checks and history comparison are ready.", "只有在核心检查和历史已付款比对都就绪后，再转为自助使用。")
      .replace("Confirm ambiguous fields before relying on self-service queue output.", "依赖自助异常队列输出前，先确认模糊字段。")
      .replace("After setup, use the self-serve bundle for repeat runs.", "设置完成后，用自助包进行后续重复复核。");
  }

  function localizeBuyerGuidance(guidance, language) {
    if (!guidance) {
      return guidance || {};
    }
    const secondaryHref = language === "zh" && guidance.secondaryHref === "https://tools.simplezion.com/sample-report/"
      ? "https://tools.simplezion.com/sample-report/zh.html"
      : guidance.secondaryHref;
    return {
      ...guidance,
      label: translateBuyerText(guidance.label, language),
      title: translateBuyerText(guidance.title, language),
      summary: translateBuyerText(guidance.summary, language),
      primaryCta: translateBuyerText(guidance.primaryCta, language),
      secondaryCta: translateBuyerText(guidance.secondaryCta, language),
      secondaryHref,
      reasons: (guidance.reasons || []).map((reason) => translateBuyerText(reason, language)),
      nextSteps: (guidance.nextSteps || []).map((step) => translateBuyerText(step, language)),
    };
  }

  function amountForQueue(scanResult, queue) {
    const totalCents = (scanResult.items || [])
      .filter((item) => item.queue === queue)
      .reduce((total, item) => total + (Number.isFinite(item.amountCents) ? item.amountCents : 0), 0);
    return namespace.scanner.amountDisplay(totalCents);
  }

  function buildActionSummary(scanResult, buyerGuidance, language) {
    const holdCount = scanResult.queueCounts.HOLD || 0;
    const reviewCount = scanResult.queueCounts.REVIEW || 0;
    const clearCount = scanResult.queueCounts.PASS || 0;
    const readyRules = (scanResult.ruleReadiness || []).filter((rule) => rule.status === "ready").length;
    const totalRules = (scanResult.ruleReadiness || []).length;
    const sourceProfile = ((scanResult.sourceProfiles || []).find((profile) => profile.sourceName === "current") || {}).likelySource || "generic_ap_export";

    if (language === "zh") {
      return {
        lead: `本次样例生成 ${holdCount} 条 HOLD（暂停复核）、${reviewCount} 条 REVIEW（人工复核）、${clearCount} 条 CLEAR（可继续）。HOLD 表示付款前应暂停核对，REVIEW 表示需要人工补充判断，CLEAR 表示在当前导出字段下未触发入门级重复付款信号。`,
        immediate: buyerGuidance.title || "先运行本地复核，再决定是否购买。",
        evidence: `当前付款批次识别为${sourceProfileLabel(sourceProfile, language)}，${readyRules}/${totalRules} 项检查具备运行条件；本报告使用模拟数据，不包含真实供应商、银行、税务、工资、客户、发票或付款数据。`,
        impact: holdCount > 0
          ? `付款放行前应优先复核 HOLD 行，涉及样例金额 ${amountForQueue(scanResult, "HOLD")}。`
          : "本次样例未生成 HOLD 行，但仍应复核 REVIEW 行后再放行。",
        rows: [
          {
            area: "HOLD",
            count: holdCount,
            action: "付款前暂停；核对供应商、发票号、金额、付款批次和已付款历史。",
            evidence: "完全重复、发票号规范化后重复、或当前付款批次内重复行签名。",
          },
          {
            area: "REVIEW",
            count: reviewCount,
            action: "进入人工复核清单；确认是否为分期、拆分付款、周期性付款或供应商别名。",
            evidence: "同供应商同金额短期重复、供应商别名、字段证据不足或本地异常信号。",
          },
          {
            area: "CLEAR",
            count: clearCount,
            action: "可继续走既有审批/付款流程；不要把 CLEAR 理解为审计保证。",
            evidence: "在当前导出字段和入门规则下未发现触发项。",
          },
        ],
      };
    }

    return {
      lead: `This sample produced ${holdCount} HOLD, ${reviewCount} REVIEW, and ${clearCount} CLEAR rows. HOLD means stop before payment release; REVIEW means human follow-up is required; CLEAR means no starter duplicate-payment signal fired from the current export fields.`,
      immediate: buyerGuidance.title || "Run the local review before deciding what to buy.",
      evidence: `Current export profile: ${sourceProfileLabel(sourceProfile, language)}. ${readyRules}/${totalRules} checks are runnable. This report uses simulated rows only; no real supplier, bank, tax, payroll, customer, invoice, or payment data is included.`,
      impact: holdCount > 0
        ? `Review HOLD rows first before payment release. Sample HOLD amount: ${amountForQueue(scanResult, "HOLD")}.`
        : "No HOLD rows were generated in this sample; REVIEW rows still need follow-up before release.",
      rows: [
        {
          area: "HOLD",
          count: holdCount,
          action: "Stop before payment release; verify vendor, invoice, amount, payment run, and paid history.",
          evidence: "Exact duplicates, normalized invoice duplicates, or duplicate row signatures in the current run.",
        },
        {
          area: "REVIEW",
          count: reviewCount,
          action: "Send to human review; confirm installment, split payment, recurring payment, or vendor alias context.",
          evidence: "Same vendor/amount date-window signals, vendor aliases, incomplete evidence, or local anomaly signals.",
        },
        {
          area: "CLEAR",
          count: clearCount,
          action: "Continue normal approval/payment controls; do not treat CLEAR as an audit guarantee.",
          evidence: "No starter rule fired under the current export fields.",
        },
      ],
    };
  }

  function buildCsvReport(scanResult, language) {
    const reportLanguage = language === "zh" ? "zh" : "en";
    const rows = reportRows(scanResult.items, reportLanguage);
    return namespace.csv.rowsToCsv(localizeCsvReportRows(rows, reportLanguage), csvReportHeaders(reportLanguage));
  }

  function buildHtmlReport(scanResult, language) {
    const reportLanguage = language === "zh" ? "zh" : "en";
    const rows = reportRows(scanResult.items, reportLanguage);
    const generatedAt = new Date().toISOString();
    const buyerGuidance = localizeBuyerGuidance(scanResult.buyerDecisionGuidance, reportLanguage);
    const actionSummary = buildActionSummary(scanResult, buyerGuidance, reportLanguage);
    const mlMethod = reportLanguage === "zh"
      ? "可解释的本地无监督信号：稳健金额基线、供应商历史存在性和字段完整度。"
      : ((scanResult.mlSummary || {}).method || reportLabel(reportLanguage, "defaultMl"));
    const mlQueuePolicy = reportLanguage === "zh"
      ? "本地机器辅助信号不会改变 HOLD（暂停复核）/ REVIEW（人工复核）/ CLEAR（可继续）结论；队列只由确定性重复付款规则分配。"
      : ((scanResult.mlSummary || {}).queuePolicy || "");
    const scorecardVersionText = scorecardVersionLabel((scanResult.mlSummary || {}).scorecardVersion || "", reportLanguage);
    const guidanceReasons = (buyerGuidance.reasons || []).map((reason) => `<li>${escapeHtml(reason)}</li>`).join("");
    const guidanceNextSteps = (buyerGuidance.nextSteps || []).map((step) => `<li>${escapeHtml(step)}</li>`).join("");
    const actionRows = actionSummary.rows.map((row) => `
      <tr>
        <td>${escapeHtml(queueDisplayLabel(row.area, reportLanguage))}</td>
        <td>${escapeHtml(row.count)}</td>
        <td>${escapeHtml(row.action)}</td>
        <td>${escapeHtml(row.evidence)}</td>
      </tr>
    `).join("");
    const sourceRows = (scanResult.sourceProfiles || []).map((profile) => `
      <tr>
        <td>${escapeHtml(sourceNameLabel(profile.sourceName, reportLanguage))}</td>
        <td>${escapeHtml(sourceProfileLabel(profile.likelySource, reportLanguage))}</td>
        <td>${escapeHtml(profile.headerCount)}</td>
        <td>${escapeHtml(profile.rowCount)}</td>
        <td>${escapeHtml(displayHeaderList(profile.headers, reportLanguage))}</td>
      </tr>
    `).join("");
    const fieldRows = (scanResult.fieldLedger || []).map((row) => `
      <tr>
        <td>${escapeHtml(sourceNameLabel(row.source, reportLanguage))}</td>
        <td>${escapeHtml(fieldLabel(row.field, reportLanguage))}</td>
        <td>${escapeHtml(row.detectedHeader ? displayHeaderName(row.detectedHeader, reportLanguage) : reportLabel(reportLanguage, "notDetected"))}</td>
        <td>${escapeHtml(row.confidence)}</td>
        <td>${escapeHtml(fieldEvidenceText(row, reportLanguage))}</td>
        <td>${escapeHtml(statusText(row.status, reportLanguage))}</td>
      </tr>
    `).join("");
    const ruleRows = (scanResult.ruleReadiness || []).map((row) => `
      <tr>
        <td>${escapeHtml(ruleLabel(row.rule, reportLanguage))}</td>
        <td>${escapeHtml(statusText(row.status, reportLanguage))}</td>
        <td>${escapeHtml(requiredText(row.required, reportLanguage))}</td>
        <td>${escapeHtml(noteText(row.note, reportLanguage))}</td>
      </tr>
    `).join("");
    const mlRows = (scanResult.mlSignals || []).map((row) => `
      <tr>
        <td>${escapeHtml(row.rowNumber)}</td>
        <td>${escapeHtml(queueDisplayLabel(row.queue, reportLanguage))}</td>
        <td>${escapeHtml(scorecardVersionLabel(row.scorecardVersion, reportLanguage))}</td>
        <td>${escapeHtml(row.signalScore)}</td>
        <td>${escapeHtml(row.vendor)}</td>
        <td>${escapeHtml(row.invoiceNumber)}</td>
        <td>${escapeHtml(row.amount)}</td>
        <td>${escapeHtml(row.globalRobustZ)}</td>
        <td>${escapeHtml(row.vendorRobustZ)}</td>
        <td>${escapeHtml(row.completeness)}</td>
        <td>${escapeHtml(mlEvidenceText(row.evidence, reportLanguage))}</td>
      </tr>
    `).join("");
    const tableRows = rows.map((row) => `
      <tr>
        <td>${escapeHtml(queueDisplayLabel(row.queue, reportLanguage))}</td>
        <td>${escapeHtml(row.risk_score)}</td>
        <td>${escapeHtml(row.row_number)}</td>
        <td>${escapeHtml(row.vendor_payee)}</td>
        <td>${escapeHtml(row.invoice_number)}</td>
        <td>${escapeHtml(row.amount)}</td>
        <td>${escapeHtml(row.date)}</td>
        <td>${escapeHtml(row.reason)}</td>
      </tr>
    `).join("");

    return `<!doctype html>
<html lang="${reportLanguage === "zh" ? "zh-CN" : "en"}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(reportLabel(reportLanguage, "title"))}</title>
  <style>
    *{box-sizing:border-box}
    body{max-width:1180px;font-family:Arial,"Microsoft YaHei","PingFang SC","Noto Sans SC",Helvetica,sans-serif;margin:24px auto;padding:0 16px;color:#1d2521}
    h1{margin-bottom:6px}
    .summary{display:flex;gap:12px;flex-wrap:wrap;margin:18px 0}
    .summary div{border:1px solid #d9e0da;border-radius:8px;padding:12px;min-width:130px;background:#fff}
    .decision-panel{border:1px solid #b8d4ce;border-left:6px solid #10695f;border-radius:8px;background:#f7fbf8;padding:16px;margin:18px 0}
    .decision-panel h2{margin:0 0 4px}
    .decision-panel .label{color:#10695f;font-size:12px;font-weight:800;text-transform:uppercase}
    .decision-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px;margin-top:12px}
    .decision-grid ul{margin:6px 0 0;padding-left:18px}
    .decision-actions{display:flex;gap:10px;flex-wrap:wrap;margin-top:12px}
    .decision-actions a{display:inline-block;border:1px solid #10695f;border-radius:8px;padding:8px 12px;color:#10695f;font-weight:800;text-decoration:none}
    .decision-actions a:first-child{background:#10695f;color:#fff}
    .action-summary{border:1px solid #d7e4dc;border-radius:10px;background:#fbfdf9;padding:16px;margin:18px 0}
    .action-summary h2{margin:0 0 8px}
    .action-summary-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;margin:12px 0}
    .action-summary-grid div{border:1px solid #e0e8e2;border-radius:8px;background:#fff;padding:12px}
    .action-summary-grid span{display:block;color:#5e6c63;font-size:12px;font-weight:800;text-transform:uppercase}
    table{display:block;width:100%;max-width:100%;overflow-x:auto;border-collapse:collapse;font-size:13px}
    th,td{border-bottom:1px solid #d9e0da;padding:9px;text-align:left;vertical-align:top}
    th{background:#f6f7f4}
    h2{margin-top:28px}
    @media (max-width:640px){
      body{margin:16px auto;padding:0 12px}
      .summary{gap:8px}
      .summary div{min-width:calc(50% - 4px);padding:10px}
      .decision-grid{grid-template-columns:1fr}
      .action-summary-grid{grid-template-columns:1fr}
      table{font-size:12px}
      th,td{padding:8px}
    }
  </style>
</head>
<body>
  <h1>${escapeHtml(reportLabel(reportLanguage, "title"))}</h1>
  <p>${escapeHtml(reportLabel(reportLanguage, "generated", { time: generatedAt }))}</p>
  <p><strong>${escapeHtml(reportLabel(reportLanguage, "bilingualNote"))}</strong></p>
  <p><strong>${escapeHtml(reportLabel(reportLanguage, "mlEvidence"))}</strong> ${escapeHtml(mlMethod)}</p>
  <p><strong>${escapeHtml(reportLabel(reportLanguage, "mlScorecard"))}</strong> ${escapeHtml(scorecardVersionText)}. ${escapeHtml(mlQueuePolicy)}</p>
  <div class="summary">
    <div><strong>${escapeHtml(reportLabel(reportLanguage, "overallRisk"))}</strong><br>${escapeHtml(scanResult.overallRisk)}</div>
    <div><strong>${escapeHtml(queueDisplayLabel("HOLD", reportLanguage))}</strong><br>${escapeHtml(scanResult.queueCounts.HOLD)}</div>
    <div><strong>${escapeHtml(queueDisplayLabel("REVIEW", reportLanguage))}</strong><br>${escapeHtml(scanResult.queueCounts.REVIEW)}</div>
    <div><strong>${escapeHtml(queueDisplayLabel("CLEAR", reportLanguage))}</strong><br>${escapeHtml(scanResult.queueCounts.PASS)}</div>
    <div><strong>${escapeHtml(reportLabel(reportLanguage, "currentRows"))}</strong><br>${escapeHtml(scanResult.currentRowCount)}</div>
    <div><strong>${escapeHtml(reportLabel(reportLanguage, "historyRows"))}</strong><br>${escapeHtml(scanResult.historyRowCount)}</div>
    <div><strong>${escapeHtml(reportLabel(reportLanguage, "mlSignals"))}</strong><br>${escapeHtml((scanResult.mlSummary || {}).signalCount || 0)}</div>
  </div>
  <section class="action-summary">
    <h2>${escapeHtml(reportLabel(reportLanguage, "controllerSummary"))}</h2>
    <p>${escapeHtml(actionSummary.lead)}</p>
    <div class="action-summary-grid">
      <div><span>${escapeHtml(reportLabel(reportLanguage, "immediateAction"))}</span><strong>${escapeHtml(actionSummary.immediate)}</strong></div>
      <div><span>${escapeHtml(reportLabel(reportLanguage, "evidenceBasis"))}</span><strong>${escapeHtml(actionSummary.evidence)}</strong></div>
      <div><span>${escapeHtml(reportLabel(reportLanguage, "paymentReleaseImpact"))}</span><strong>${escapeHtml(actionSummary.impact)}</strong></div>
    </div>
    <table>
      <thead><tr><th>${escapeHtml(reportLabel(reportLanguage, "actionArea"))}</th><th>${escapeHtml(reportLabel(reportLanguage, "actionCount"))}</th><th>${escapeHtml(reportLabel(reportLanguage, "actionRecommendation"))}</th><th>${escapeHtml(reportLabel(reportLanguage, "actionEvidence"))}</th></tr></thead>
      <tbody>${actionRows}</tbody>
    </table>
  </section>
  <section class="decision-panel">
    <span class="label">${escapeHtml(buyerGuidance.label || reportLabel(reportLanguage, "buyerDecision"))}</span>
    <h2>${escapeHtml(buyerGuidance.title || reportLabel(reportLanguage, "runBeforeBuying"))}</h2>
    <p>${escapeHtml(buyerGuidance.summary || reportLabel(reportLanguage, "decisionFallback"))}</p>
    <div class="decision-actions">
      <a href="${escapeHtml(buyerGuidance.primaryHref || "https://payhip.com/b/6UYfe")}">${escapeHtml(buyerGuidance.primaryCta || reportLabel(reportLanguage, "downloadFreeProof"))}</a>
      <a href="${escapeHtml(buyerGuidance.secondaryHref || "https://tools.simplezion.com/sample-report/")}">${escapeHtml(buyerGuidance.secondaryCta || reportLabel(reportLanguage, "viewSample"))}</a>
    </div>
    <div class="decision-grid">
      <div><strong>${escapeHtml(reportLabel(reportLanguage, "why"))}</strong><ul>${guidanceReasons}</ul></div>
      <div><strong>${escapeHtml(reportLabel(reportLanguage, "nextSteps"))}</strong><ul>${guidanceNextSteps}</ul></div>
    </div>
  </section>
  <table>
    <thead>
      <tr>
        <th>${escapeHtml(reportLabel(reportLanguage, "queue"))}</th><th>${escapeHtml(reportLabel(reportLanguage, "score"))}</th><th>${escapeHtml(reportLabel(reportLanguage, "row"))}</th><th>${escapeHtml(reportLabel(reportLanguage, "vendor"))}</th><th>${escapeHtml(reportLabel(reportLanguage, "invoice"))}</th><th>${escapeHtml(reportLabel(reportLanguage, "amount"))}</th><th>${escapeHtml(reportLabel(reportLanguage, "date"))}</th><th>${escapeHtml(reportLabel(reportLanguage, "reason"))}</th>
      </tr>
    </thead>
    <tbody>${tableRows}</tbody>
  </table>
  <h2>${escapeHtml(reportLabel(reportLanguage, "sourceProfile"))}</h2>
  <table>
    <thead><tr><th>${escapeHtml(reportLabel(reportLanguage, "source"))}</th><th>${escapeHtml(reportLabel(reportLanguage, "likelyProfile"))}</th><th>${escapeHtml(reportLabel(reportLanguage, "headers"))}</th><th>${escapeHtml(reportLabel(reportLanguage, "rows"))}</th><th>${escapeHtml(reportLabel(reportLanguage, "headerList"))}</th></tr></thead>
    <tbody>${sourceRows}</tbody>
  </table>
  <h2>${escapeHtml(reportLabel(reportLanguage, "anomalySignals"))}</h2>
  <p>${escapeHtml(reportLabel(reportLanguage, "anomalyNote"))}</p>
  <table>
    <thead><tr><th>${escapeHtml(reportLabel(reportLanguage, "row"))}</th><th>${escapeHtml(reportLabel(reportLanguage, "queue"))}</th><th>${escapeHtml(reportLabel(reportLanguage, "scorecard"))}</th><th>${escapeHtml(reportLabel(reportLanguage, "signalScore"))}</th><th>${escapeHtml(reportLabel(reportLanguage, "vendor"))}</th><th>${escapeHtml(reportLabel(reportLanguage, "invoice"))}</th><th>${escapeHtml(reportLabel(reportLanguage, "amount"))}</th><th>${escapeHtml(reportLabel(reportLanguage, "globalRobustZ"))}</th><th>${escapeHtml(reportLabel(reportLanguage, "vendorRobustZ"))}</th><th>${escapeHtml(reportLabel(reportLanguage, "completeness"))}</th><th>${escapeHtml(reportLabel(reportLanguage, "evidence"))}</th></tr></thead>
    <tbody>${mlRows}</tbody>
  </table>
  <h2>${escapeHtml(reportLabel(reportLanguage, "fieldLedger"))}</h2>
  <table>
    <thead><tr><th>${escapeHtml(reportLabel(reportLanguage, "source"))}</th><th>${escapeHtml(reportLabel(reportLanguage, "field"))}</th><th>${escapeHtml(reportLabel(reportLanguage, "detectedHeader"))}</th><th>${escapeHtml(reportLabel(reportLanguage, "confidence"))}</th><th>${escapeHtml(reportLabel(reportLanguage, "fieldEvidence"))}</th><th>${escapeHtml(reportLabel(reportLanguage, "status"))}</th></tr></thead>
    <tbody>${fieldRows}</tbody>
  </table>
  <h2>${escapeHtml(reportLabel(reportLanguage, "ruleLedger"))}</h2>
  <table>
    <thead><tr><th>${escapeHtml(reportLabel(reportLanguage, "rule"))}</th><th>${escapeHtml(reportLabel(reportLanguage, "status"))}</th><th>${escapeHtml(reportLabel(reportLanguage, "requiredEvidence"))}</th><th>${escapeHtml(reportLabel(reportLanguage, "note"))}</th></tr></thead>
    <tbody>${ruleRows}</tbody>
  </table>
</body>
</html>`;
  }

  function downloadText(filename, text, type) {
    const blob = new Blob([text], { type: type || "text/plain" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  namespace.reports = {
    buildCsvReport,
    buildHtmlReport,
    downloadText,
    reportRows,
    mlEvidenceText,
    reasonText,
    ruleLabel,
  };

  window.DPRS = namespace;
})();
