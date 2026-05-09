(function () {
  const namespace = window.DPRS || {};

  const fieldAliases = {
    vendor: [
      "vendor",
      "vendor name",
      "vendor_name",
      "supplier",
      "supplier name",
      "payee",
      "payee name",
      "beneficiary",
      "merchant",
      "供应商",
      "供应商名称",
      "供应商全称",
      "供应商户名",
      "收款方",
      "收款方名称",
      "收款单位",
      "付款对象",
      "往来单位",
      "往来单位名称",
      "对方单位",
      "对方户名",
      "客商名称",
      "商户",
      "供应商",
      "供应商名称",
      "供应商名",
      "收款方",
      "收款单位",
      "付款对象",
      "往来单位",
      "商户",
      "客户名称",
      "对方户名",
    ],
    invoice_number: [
      "invoice",
      "invoice no",
      "invoice number",
      "invoice_number",
      "invoice_id",
      "bill no",
      "bill number",
      "reference",
      "document number",
      "doc number",
      "发票",
      "发票号",
      "发票号码",
      "发票编号",
      "采购发票号",
      "应付单号",
      "单据号",
      "单据编号",
      "凭证号",
      "凭证编号",
      "凭证字号",
      "账单号",
      "票据号",
      "票据编号",
      "参考号",
      "业务单号",
      "发票",
      "发票号",
      "发票号码",
      "发票编号",
      "单据号",
      "单据编号",
      "凭证号",
      "凭证编号",
      "账单号",
      "票据号",
      "参考号",
      "业务单号",
    ],
    amount: [
      "amount",
      "payment amount",
      "invoice amount",
      "gross amount",
      "total",
      "total amount",
      "paid amount",
      "scheduled amount",
      "金额",
      "付款金额",
      "支付金额",
      "发票金额",
      "账单金额",
      "含税金额",
      "不含税金额",
      "价税合计",
      "应付金额",
      "实付金额",
      "未付金额",
      "本次付款金额",
      "计划付款金额",
      "结算金额",
      "核销金额",
      "本币金额",
      "原币金额",
      "金额",
      "付款金额",
      "支付金额",
      "发票金额",
      "账单金额",
      "含税金额",
      "价税合计",
      "应付金额",
      "实付金额",
      "本币金额",
      "原币金额",
    ],
    date: [
      "date",
      "invoice date",
      "invoice_date",
      "payment date",
      "paid date",
      "scheduled payment date",
      "posting date",
      "transaction date",
      "due date",
      "日期",
      "发票日期",
      "开票日期",
      "付款日期",
      "支付日期",
      "已付日期",
      "付款完成日期",
      "业务日期",
      "单据日期",
      "制单日期",
      "凭证日期",
      "入账日期",
      "记账日期",
      "过账日期",
      "交易日期",
      "结算日期",
      "到期日",
      "预计付款日",
      "计划付款日期",
      "日期",
      "发票日期",
      "开票日期",
      "付款日期",
      "支付日期",
      "入账日期",
      "记账日期",
      "过账日期",
      "交易日期",
      "到期日",
      "预计付款日",
    ],
    payment_id: [
      "payment id",
      "payment_id",
      "payment reference",
      "payment_reference",
      "transaction id",
      "transaction_id",
      "batch id",
      "payment_batch_id",
      "check number",
      "check no",
      "付款编号",
      "付款单号",
      "支付编号",
      "支付单号",
      "付款批次",
      "批次号",
      "付款申请单号",
      "付款申请编号",
      "结算单号",
      "交易流水号",
      "支付流水号",
      "流水号",
      "银行流水号",
      "银行回单号",
      "回单编号",
      "支票号",
      "付款参考号",
      "付款编号",
      "付款单号",
      "支付编号",
      "支付单号",
      "付款批次",
      "批次号",
      "交易流水号",
      "流水号",
      "银行流水号",
      "支票号",
      "付款参考号",
    ],
    status: [
      "status",
      "payment status",
      "payment_status",
      "invoice status",
      "state",
      "paid status",
      "approval status",
      "状态",
      "付款状态",
      "支付状态",
      "发票状态",
      "单据状态",
      "审核状态",
      "审批状态",
      "结算状态",
      "核销状态",
      "付款进度",
      "状态",
      "付款状态",
      "支付状态",
      "发票状态",
      "单据状态",
      "审核状态",
      "审批状态",
      "结算状态",
    ],
  };

  function normalizeHeader(header) {
    return String(header || "")
      .normalize("NFKC")
      .toLowerCase()
      .replace(/[_\-./:：，,；;（）()[\]{}]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function scoreHeader(header, aliases) {
    const normalizedHeader = normalizeHeader(header);
    let bestScore = 0;
    aliases.forEach((alias) => {
      const normalizedAlias = normalizeHeader(alias);
      if (normalizedHeader === normalizedAlias) {
        bestScore = Math.max(bestScore, 100);
      } else if (normalizedHeader.includes(normalizedAlias) || normalizedAlias.includes(normalizedHeader)) {
        bestScore = Math.max(bestScore, Math.min(92, 58 + normalizedAlias.length));
      }
    });
    return bestScore;
  }

  function detectFieldMapping(headers) {
    const mapping = {};
    const confidence = {};
    Object.keys(fieldAliases).forEach((fieldName) => {
      let bestHeader = "";
      let bestScore = 0;
      headers.forEach((header) => {
        const score = scoreHeader(header, fieldAliases[fieldName]);
        if (score > bestScore) {
          bestHeader = header;
          bestScore = score;
        }
      });
      mapping[fieldName] = bestScore >= 58 ? bestHeader : "";
      confidence[fieldName] = bestScore;
    });
    return { mapping, confidence };
  }

  function reviewAwareDetectedMapping(headers, detected) {
    if (!namespace.fieldConfidenceLedger || typeof namespace.fieldConfidenceLedger.buildFieldConfidenceLedger !== "function") {
      return detected;
    }

    const ledgerRows = namespace.fieldConfidenceLedger.buildFieldConfidenceLedger(headers || [], []);
    const mapping = {};
    const confidence = {};
    Object.keys(fieldAliases).forEach((fieldName) => {
      const readyRow = ledgerRows.find((row) => row.selectedField === fieldName);
      const candidateRow = ledgerRows
        .map((row) => {
          const candidate = (row.topCandidates || []).find((item) => item.field === fieldName);
          return candidate ? { row, candidate } : null;
        })
        .filter(Boolean)
        .sort((left, right) => right.candidate.score - left.candidate.score)[0];

      mapping[fieldName] = readyRow ? readyRow.originalField : "";
      confidence[fieldName] = readyRow
        ? readyRow.score
        : candidateRow
          ? candidateRow.candidate.score
          : detected.confidence[fieldName] || 0;
    });

    return { mapping, confidence, ledgerRows };
  }

  const readinessRules = [
    {
      id: "exact_duplicate_invoice",
      label: "Exact duplicate invoice",
      labelZh: "完全重复发票",
      requiredFields: ["vendor", "invoice_number", "amount"],
      nextExport: "Export vendor/payee, invoice number, and amount from the current payment run.",
      nextExportZh: "请从当前付款批次导出供应商/收款方、发票号和金额字段。",
    },
    {
      id: "normalized_invoice_match",
      label: "Normalized invoice match",
      labelZh: "规范化发票号匹配",
      requiredFields: ["vendor", "invoice_number", "amount"],
      nextExport: "Include invoice number exactly as exported, even if punctuation or casing varies.",
      nextExportZh: "请保留系统原始导出的发票号，即使大小写、空格或标点存在差异。",
    },
    {
      id: "same_vendor_amount_date_window",
      label: "Same vendor + amount + date window",
      labelZh: "同供应商同金额短期重复",
      requiredFields: ["vendor", "amount", "date"],
      nextExport: "Add invoice date, payment date, due date, or scheduled payment date.",
      nextExportZh: "请补充发票日期、付款日期、到期日或预计付款日。",
    },
    {
      id: "current_run_duplicate_rows",
      label: "Current run duplicate rows",
      labelZh: "当前付款批次重复行",
      requiredFields: ["vendor", "invoice_number", "amount", "date"],
      nextExport: "Include enough payment-run columns to identify repeated rows before release.",
      nextExportZh: "请补充足够的付款批次字段，用于在放行前识别重复行。",
    },
    {
      id: "historical_paid_comparison",
      label: "Historical paid comparison",
      labelZh: "历史已付款比对",
      requiredFields: ["vendor", "invoice_number", "amount", "date"],
      nextExport: "Export a paid-history CSV with matching vendor, invoice, amount, and paid date fields.",
      nextExportZh: "请导出已付款历史 CSV，并包含供应商、发票号、金额和付款日期字段。",
    },
    {
      id: "vendor_alias_review",
      label: "Vendor/payee alias review",
      labelZh: "供应商/收款方别名复核",
      requiredFields: ["vendor"],
      nextExport: "Add a vendor alias export or a two-column alias map when supplier names vary.",
      nextExportZh: "如果同一供应商存在多个名称，请补充供应商别名导出或两列表名映射。",
    },
  ];

  function analyzeHeaderReadiness(headers) {
    const cleanHeaders = (headers || [])
      .map((header) => String(header || "").trim())
      .filter(Boolean);
    const rawDetected = detectFieldMapping(cleanHeaders);
    const detected = reviewAwareDetectedMapping(cleanHeaders, rawDetected);
    const detectedFields = Object.keys(detected.mapping).filter((fieldName) => detected.mapping[fieldName]);
    const ruleRows = readinessRules.map((rule) => {
      const missingFields = rule.requiredFields.filter((fieldName) => !detected.mapping[fieldName]);
      const reviewFields = rule.requiredFields.filter((fieldName) => rawDetected.mapping[fieldName] && !detected.mapping[fieldName]);
      const weakFields = rule.requiredFields.filter((fieldName) => detected.mapping[fieldName] && detected.confidence[fieldName] < 75);
      let status = "ready";
      if (missingFields.length > 0) {
        status = "blocked";
      } else if (reviewFields.length > 0 || weakFields.length > 0) {
        status = "partial";
      }
      const reviewMessage = "Confirm ambiguous AP headers with one fake or redacted row before relying on this rule.";
      const reviewMessageZh = "请用一行模拟或脱敏样例确认含义模糊的 AP 字段，再依赖这条规则。";
      return {
        id: rule.id,
        label: rule.label,
        labelZh: rule.labelZh,
        status,
        requiredFields: rule.requiredFields,
        missingFields,
        reviewFields,
        weakFields,
        nextExport: missingFields.length > 0 ? rule.nextExport : reviewFields.length > 0 ? reviewMessage : "Ready for a demo-row or redacted-row first run.",
        nextExportZh: missingFields.length > 0 ? rule.nextExportZh : reviewFields.length > 0 ? reviewMessageZh : "可进入模拟数据行或脱敏行的首轮运行。",
      };
    });
    const nextExportRequests = ruleRows
      .filter((row) => row.status !== "ready")
      .map((row) => row.nextExport)
      .filter((value, index, all) => all.indexOf(value) === index);
    const nextExportRequestsZh = ruleRows
      .filter((row) => row.status !== "ready")
      .map((row) => row.nextExportZh)
      .filter((value, index, all) => all.indexOf(value) === index);
    return {
      headers: cleanHeaders,
      mapping: detected.mapping,
      confidence: detected.confidence,
      detectedFields,
      ruleRows,
      readyCount: ruleRows.filter((row) => row.status === "ready").length,
      partialCount: ruleRows.filter((row) => row.status === "partial").length,
      blockedCount: ruleRows.filter((row) => row.status === "blocked").length,
      nextExportRequests,
      nextExportRequestsZh,
    };
  }

  function valueFromRecord(record, mapping, fieldName) {
    const header = mapping[fieldName];
    return header ? record[header] || "" : "";
  }

  namespace.fieldMapping = {
    detectFieldMapping,
    analyzeHeaderReadiness,
    normalizeHeader,
    valueFromRecord,
    fieldAliases,
    readinessRules,
  };

  window.DPRS = namespace;
})();
