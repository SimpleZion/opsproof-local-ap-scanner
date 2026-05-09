(function () {
  const namespace = window.DPRS || {};
  const fieldMapping = namespace.fieldMapping || {};
  const version = "field_confidence_ledger_v0";

  const chineseAliases = {
    vendor: ["供应商", "供应商名称", "供应商全称", "收款方", "收款方名称", "往来单位", "对方单位"],
    invoice_number: ["发票", "发票号", "发票号码", "发票编号", "票据编号", "采购发票号"],
    amount: ["金额", "发票金额", "付款金额", "支付金额", "含税金额", "价税合计", "本次付款金额"],
    date: ["日期", "付款日期", "支付日期", "发票日期", "开票日期", "业务日期", "交易日期", "到期日"],
    payment_id: ["付款编号", "付款单号", "支付编号", "支付单号", "流水号", "付款申请单号", "交易流水号"],
    status: ["状态", "付款状态", "支付状态", "发票状态", "审核状态", "审批状态"],
  };

  const ambiguousHeaders = {
    "金额": ["amount"],
    "日期": ["date"],
    "名称": ["vendor"],
    "单号": ["invoice_number", "payment_id"],
    "号码": ["invoice_number", "payment_id"],
    "编号": ["invoice_number", "payment_id"],
  };

  function normalizeHeader(header) {
    if (typeof fieldMapping.normalizeHeader === "function") {
      return fieldMapping.normalizeHeader(header);
    }
    return String(header || "")
      .normalize("NFKC")
      .toLowerCase()
      .replace(/[_\-./:，,（）()[\]{}]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function cleanHeaders(headers) {
    return (headers || []).map((header) => String(header || "").trim()).filter(Boolean);
  }

  function allFieldNames() {
    const aliasFields = Object.keys(fieldMapping.fieldAliases || {});
    const chineseFields = Object.keys(chineseAliases);
    return aliasFields.concat(chineseFields.filter((fieldName) => aliasFields.indexOf(fieldName) === -1));
  }

  function aliasesForField(fieldName) {
    return (fieldMapping.fieldAliases || {})[fieldName] || [];
  }

  function scoreAgainstAliases(header, aliases) {
    const normalizedHeader = normalizeHeader(header);
    return aliases.reduce((bestScore, alias) => {
      const normalizedAlias = normalizeHeader(alias);
      if (!normalizedAlias) {
        return bestScore;
      }
      if (normalizedHeader === normalizedAlias) {
        return Math.max(bestScore, 100);
      }
      if (normalizedHeader.includes(normalizedAlias) || normalizedAlias.includes(normalizedHeader)) {
        return Math.max(bestScore, Math.min(92, 58 + normalizedAlias.length));
      }
      return bestScore;
    }, 0);
  }

  function headerEvidence(header, fieldName, detectedMapping) {
    const reusedAliasScore = scoreAgainstAliases(header, aliasesForField(fieldName));
    const chineseAliasScore = scoreAgainstAliases(header, chineseAliases[fieldName] || []);
    const detectedScore = detectedMapping[fieldName] === header ? Math.max(reusedAliasScore, 72) : 0;
    const score = Math.max(reusedAliasScore, chineseAliasScore, detectedScore);
    const evidence = [];
    if (reusedAliasScore > 0) {
      evidence.push({ type: "reused_field_mapping_alias", score: reusedAliasScore });
    }
    if (chineseAliasScore > 0) {
      evidence.push({ type: "clear_chinese_alias", score: chineseAliasScore });
    }
    if (detectedScore > 0) {
      evidence.push({ type: "reused_detect_field_mapping", score: detectedScore });
    }
    return { score, evidence };
  }

  function sampleValuesForHeader(sampleRows, header) {
    return (sampleRows || [])
      .map((row) => {
        if (Array.isArray(row)) {
          return "";
        }
        return row && Object.prototype.hasOwnProperty.call(row, header) ? row[header] : "";
      })
      .map((value) => String(value == null ? "" : value).trim())
      .filter(Boolean);
  }

  function sampleProfile(values) {
    const total = values.length || 1;
    const numericCount = values.filter((value) => /^-?(\d{1,3}(,\d{3})+|\d+)(\.\d+)?$/.test(value.replace(/[￥¥$,\s]/g, ""))).length;
    const dateCount = values.filter((value) => /^\d{4}[-/年.]\d{1,2}([-/月.]\d{1,2}日?)?$/.test(value) || /^\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4}$/.test(value)).length;
    const invoiceCount = values.filter((value) => /^(fp|inv|invoice|发票|票据)?[-_ ]?[a-z0-9]{5,}$/i.test(value) && /\d/.test(value)).length;
    const paymentCount = values.filter((value) => /^(pay|pmt|付款|支付|流水|txn|tx)[-_ ]?[a-z0-9]{4,}$/i.test(value)).length;
    const textCount = values.filter((value) => /[\u4e00-\u9fff]/.test(value) || /company|corp|ltd|inc|supplier|vendor/i.test(value)).length;
    return {
      values,
      numericRatio: numericCount / total,
      dateRatio: dateCount / total,
      invoiceRatio: invoiceCount / total,
      paymentRatio: paymentCount / total,
      textRatio: textCount / total,
    };
  }

  function sampleEvidence(fieldName, profile) {
    const evidenceByField = {
      amount: profile.numericRatio >= 0.75 ? { type: "sample_values_look_numeric_amount", score: 24 } : null,
      date: profile.dateRatio >= 0.75 ? { type: "sample_values_look_like_dates", score: 24 } : null,
      invoice_number: profile.invoiceRatio >= 0.75 ? { type: "sample_values_look_like_invoice_numbers", score: 18 } : null,
      payment_id: profile.paymentRatio >= 0.75 ? { type: "sample_values_look_like_payment_ids", score: 18 } : null,
      vendor: profile.textRatio >= 0.75 && profile.numericRatio < 0.25 ? { type: "sample_values_look_like_names", score: 12 } : null,
    };
    return evidenceByField[fieldName] || null;
  }

  function buildCandidate(header, fieldName, detectedMapping, profile) {
    const headerResult = headerEvidence(header, fieldName, detectedMapping);
    const sampleResult = sampleEvidence(fieldName, profile);
    const score = Math.min(100, headerResult.score + (sampleResult ? sampleResult.score : 0));
    return {
      field: fieldName,
      score,
      evidence: sampleResult ? headerResult.evidence.concat([sampleResult]) : headerResult.evidence,
    };
  }

  function topCandidatesForHeader(header, detectedMapping, sampleRows) {
    const profile = sampleProfile(sampleValuesForHeader(sampleRows, header));
    return allFieldNames()
      .map((fieldName) => buildCandidate(header, fieldName, detectedMapping, profile))
      .filter((candidate) => candidate.score > 0)
      .sort((left, right) => right.score - left.score || left.field.localeCompare(right.field))
      .slice(0, 3);
  }

  function hasSampleSupport(candidate) {
    return candidate.evidence.some((item) => item.type.indexOf("sample_values_look") === 0);
  }

  function hasConflict(topCandidate, candidates) {
    if (!topCandidate) {
      return false;
    }
    return candidates.some((candidate) => candidate.field !== topCandidate.field && candidate.score >= topCandidate.score - 8);
  }

  function hasContradictingSampleSupport(topCandidate, candidates) {
    if (!topCandidate) {
      return false;
    }
    return candidates.some((candidate) => candidate.field !== topCandidate.field && hasSampleSupport(candidate));
  }

  function isAmbiguousHeader(header) {
    return Boolean(ambiguousHeaders[normalizeHeader(header)]);
  }

  function reviewRequiredForHeader(header, topCandidate, candidates) {
    if (!topCandidate || topCandidate.score < 65) {
      return true;
    }
    if (hasConflict(topCandidate, candidates)) {
      return true;
    }
    if (!hasSampleSupport(topCandidate) && hasContradictingSampleSupport(topCandidate, candidates)) {
      return true;
    }
    if (isAmbiguousHeader(header) && !hasSampleSupport(topCandidate)) {
      return true;
    }
    return topCandidate.score < 80;
  }

  function ledgerEntry(header, detectedMapping, sampleRows) {
    const candidates = topCandidatesForHeader(header, detectedMapping, sampleRows);
    const topCandidate = candidates[0] || null;
    const reviewRequired = reviewRequiredForHeader(header, topCandidate, candidates);
    return {
      originalField: header,
      topCandidates: candidates,
      score: topCandidate ? topCandidate.score : 0,
      evidence: topCandidate ? topCandidate.evidence : [],
      selectedField: reviewRequired || !topCandidate ? "" : topCandidate.field,
      reviewRequired,
      version,
    };
  }

  function buildFieldConfidenceLedger(headers, sampleRows) {
    const normalizedHeaders = cleanHeaders(headers);
    const detected = typeof fieldMapping.detectFieldMapping === "function" ? fieldMapping.detectFieldMapping(normalizedHeaders) : { mapping: {} };
    return normalizedHeaders.map((header) => ledgerEntry(header, detected.mapping || {}, sampleRows || []));
  }

  namespace.fieldConfidenceLedger = {
    buildFieldConfidenceLedger,
    normalizeHeader,
    version,
  };

  window.DPRS = namespace;
})();
