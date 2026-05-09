(function () {
  const namespace = window.DPRS || {};
  const valueFromRecord = namespace.fieldMapping.valueFromRecord;
  const vendorNormalization = namespace.vendorNormalization;
  const SCORECARD_VERSION = "local_unsupervised_signal_v1";

  function normalizeVendor(value) {
    if (vendorNormalization && vendorNormalization.normalizeVendorKey) {
      return vendorNormalization.normalizeVendorKey(value);
    }
    return String(value || "")
      .normalize("NFKC")
      .toLowerCase()
      .replace(/&/g, " and ")
      .replace(/\b(inc|incorporated|llc|ltd|limited|co|company|corp|corporation|plc|services|service|the)\b/g, " ")
      .replace(/(股份有限公司|有限责任公司|集团有限公司|有限公司|总公司|分公司|集团|公司)/g, " ")
      .replace(/(股份有限公司|有限责任公司|集团有限公司|有限公司|总公司|分公司|集团|公司)/g, " ")
      .replace(/[^\p{L}\p{N}]+/gu, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function normalizeInvoice(value) {
    return String(value || "")
      .normalize("NFKC")
      .toUpperCase()
      .replace(/[^\p{L}\p{N}]/gu, "")
      .replace(/^0+/, "");
  }

  function normalizeStatus(value) {
    return String(value || "").normalize("NFKC").toLowerCase().trim();
  }

  function parseAmount(value) {
    let cleanValue = String(value || "")
      .normalize("NFKC")
      .trim();
    if (!cleanValue) {
      return null;
    }

    const isNegative = /^\(.*\)$/.test(cleanValue) || /^-/.test(cleanValue);
    cleanValue = cleanValue
      .replace(/[()]/g, "")
      .replace(/^(人民币|元|rmb|cny|usd|us\$|hk\$|hkd|eur|gbp)/i, "")
      .replace(/^(人民币|rmb|cny|usd|us\$|hk\$|hkd|eur|gbp)/i, "")
      .replace(/(人民币|元|圆|rmb|cny|usd|hkd|eur|gbp)$/i, "")
      .replace(/[￥¥$€£,\s]/g, "")
      .replace(/(人民币|元|rmb|cny|usd|hkd|eur|gbp)$/i, "")
      .replace(/[￥¥]/g, "")
      .replace(/^[-+]/, "");

    if (!cleanValue || !/[0-9]/.test(cleanValue)) {
      return null;
    }

    const amount = Number(cleanValue);
    return Number.isFinite(amount) ? Math.round((isNegative ? -amount : amount) * 100) : null;
  }

  function amountDisplay(cents) {
    if (cents === null || cents === undefined) {
      return "";
    }
    return (cents / 100).toFixed(2);
  }

  function parseDateValue(value) {
    const text = String(value || "").normalize("NFKC").trim();
    if (!text) {
      return null;
    }

    const chineseDateNative = text.match(/^(\d{4})\s*年\s*(\d{1,2})\s*月\s*(\d{1,2})\s*日$/);
    if (chineseDateNative) {
      return new Date(Date.UTC(Number(chineseDateNative[1]), Number(chineseDateNative[2]) - 1, Number(chineseDateNative[3])));
    }

    const chineseDate = text.match(/^(\d{4})\s*年\s*(\d{1,2})\s*月\s*(\d{1,2})\s*日?$/);
    if (chineseDate) {
      return new Date(Date.UTC(Number(chineseDate[1]), Number(chineseDate[2]) - 1, Number(chineseDate[3])));
    }

    const yearFirstDate = text.match(/^(\d{4})[./-](\d{1,2})[./-](\d{1,2})$/);
    if (yearFirstDate) {
      return new Date(Date.UTC(Number(yearFirstDate[1]), Number(yearFirstDate[2]) - 1, Number(yearFirstDate[3])));
    }

    const nativeDate = new Date(text);
    if (!Number.isNaN(nativeDate.getTime())) {
      return new Date(Date.UTC(nativeDate.getFullYear(), nativeDate.getMonth(), nativeDate.getDate()));
    }

    const match = text.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
    if (match) {
      const month = Number(match[1]) - 1;
      const day = Number(match[2]);
      const year = Number(match[3].length === 2 ? `20${match[3]}` : match[3]);
      return new Date(Date.UTC(year, month, day));
    }

    return null;
  }

  function dateDisplay(dateValue) {
    if (!dateValue) {
      return "";
    }
    return dateValue.toISOString().slice(0, 10);
  }

  function daysBetween(leftDate, rightDate) {
    if (!leftDate || !rightDate) {
      return null;
    }
    return Math.abs(Math.round((leftDate.getTime() - rightDate.getTime()) / 86400000));
  }

  function buildAliasMap(aliasRows) {
    const aliasMap = new Map();
    aliasRows.forEach((row) => {
      const keys = Object.keys(row).filter((key) => !key.startsWith("__"));
      const realChinaAliasHeader = keys.find((key) => /别名|曾用名|供应商别名|收款方别名|付款对象|往来单位/i.test(key));
      const realChinaCanonicalHeader = keys.find((key) => /标准|规范|统一|正式|供应商主数据|标准供应商|规范供应商/i.test(key));
      const aliasHeader = keys.find((key) => /alias|payee|vendor|supplier|别名|曾用名|供应商|收款方|付款对象|往来单位/i.test(key)) || keys[0];
      const canonicalHeader = keys.find((key) => /canonical|standard|master|统一|标准|规范|主数据|正式|供应商主数据/i.test(key)) || keys[1];
      const aliasValue = row[realChinaAliasHeader || aliasHeader];
      const canonicalValue = row[realChinaCanonicalHeader || canonicalHeader];
      if (aliasValue && canonicalValue) {
        aliasMap.set(normalizeVendor(aliasValue), normalizeVendor(canonicalValue));
      }
    });
    return aliasMap;
  }

  function canonicalVendor(value, aliasMap) {
    const normalizedVendor = normalizeVendor(value);
    return aliasMap.get(normalizedVendor) || normalizedVendor;
  }

  function mapRows(rows, mapping, aliasMap, sourceName) {
    return rows.map((row, index) => {
      const vendor = valueFromRecord(row, mapping, "vendor");
      const invoiceNumber = valueFromRecord(row, mapping, "invoice_number");
      const amount = valueFromRecord(row, mapping, "amount");
      const dateValue = valueFromRecord(row, mapping, "date");
      const paymentId = valueFromRecord(row, mapping, "payment_id");
      const status = valueFromRecord(row, mapping, "status");
      const parsedDate = parseDateValue(dateValue);

      return {
        id: `${sourceName}-${index + 1}`,
        source: sourceName,
        rowNumber: row.__row_number || index + 2,
        raw: row,
        vendor,
        vendorEntityLedger: vendorNormalization && vendorNormalization.buildVendorEntityLedger
          ? vendorNormalization.buildVendorEntityLedger(vendor, aliasMap)
          : null,
        vendorCore: normalizeVendor(vendor),
        vendorCanonical: canonicalVendor(vendor, aliasMap),
        invoiceNumber,
        invoiceExact: String(invoiceNumber || "").trim().toUpperCase(),
        invoiceNormalized: normalizeInvoice(invoiceNumber),
        amountCents: parseAmount(amount),
        date: parsedDate,
        dateText: dateDisplay(parsedDate) || String(dateValue || ""),
        paymentId,
        status,
        statusNormalized: normalizeStatus(status),
        reasons: [],
        matchedRows: [],
        score: 0,
      };
    });
  }

  function addReason(item, score, rule, message, matchedRows) {
    item.reasons.push({ rule, message, score });
    item.score = Math.min(100, Math.max(item.score, score));
    (matchedRows || []).forEach((rowNumber) => {
      if (!item.matchedRows.includes(rowNumber)) {
        item.matchedRows.push(rowNumber);
      }
    });
  }

  function groupBy(items, keyBuilder) {
    const groups = new Map();
    items.forEach((item) => {
      const key = keyBuilder(item);
      if (!key) {
        return;
      }
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key).push(item);
    });
    return groups;
  }

  function markDuplicateGroups(groups, score, rule, messageBuilder) {
    groups.forEach((items) => {
      if (items.length < 2) {
        return;
      }
      const rowNumbers = items.map((item) => item.rowNumber);
      items.forEach((item) => {
        addReason(item, score, rule, messageBuilder(items), rowNumbers.filter((rowNumber) => rowNumber !== item.rowNumber));
      });
    });
  }

  function statusLooksPaid(status) {
    if (!status) {
      return true;
    }
    if (/(已付款|已支付|已付|已入账|已记账|已结清|已清算|已完成|已过账|已结算)/i.test(status)) {
      return true;
    }
    return /(paid|posted|complete|completed|cleared|settled|已付款|已支付|已付|已入账|已记账|已结清|已清算|已完成|已过账|已结算)/i.test(status);
  }

  function median(values) {
    const sortedValues = values
      .filter((value) => Number.isFinite(value))
      .slice()
      .sort((left, right) => left - right);

    if (sortedValues.length === 0) {
      return null;
    }

    const middleIndex = Math.floor(sortedValues.length / 2);
    if (sortedValues.length % 2 === 1) {
      return sortedValues[middleIndex];
    }
    return (sortedValues[middleIndex - 1] + sortedValues[middleIndex]) / 2;
  }

  function robustBaseline(values) {
    const center = median(values);
    if (center === null) {
      return { center: null, mad: null, count: 0 };
    }

    const deviations = values
      .filter((value) => Number.isFinite(value))
      .map((value) => Math.abs(value - center));
    return { center, mad: median(deviations), count: deviations.length };
  }

  function robustZScore(value, baseline) {
    if (!Number.isFinite(value) || !baseline || baseline.center === null || !baseline.mad) {
      return null;
    }
    return Math.abs(0.6745 * (value - baseline.center) / baseline.mad);
  }

  function completenessScore(item) {
    const checks = [
      Boolean(item.vendor),
      Boolean(item.invoiceNumber),
      item.amountCents !== null,
      Boolean(item.dateText),
      Boolean(item.paymentId),
      Boolean(item.status),
    ];
    return Math.round(100 * checks.filter(Boolean).length / checks.length);
  }

  function buildVendorBaselines(items) {
    const vendorValues = new Map();
    items.forEach((item) => {
      if (!item.vendorCanonical || !Number.isFinite(item.amountCents)) {
        return;
      }
      if (!vendorValues.has(item.vendorCanonical)) {
        vendorValues.set(item.vendorCanonical, []);
      }
      vendorValues.get(item.vendorCanonical).push(item.amountCents);
    });

    const baselines = new Map();
    vendorValues.forEach((values, vendor) => {
      baselines.set(vendor, robustBaseline(values));
    });
    return baselines;
  }

  function mlAssistedSignals(currentItems, historyItems) {
    const baselineItems = currentItems.concat(historyItems).filter((item) => Number.isFinite(item.amountCents));
    const globalBaseline = robustBaseline(baselineItems.map((item) => item.amountCents));
    const vendorBaselines = buildVendorBaselines(baselineItems);
    const historyVendors = new Set(historyItems.map((item) => item.vendorCanonical).filter(Boolean));

    return currentItems.map((item) => {
      const signals = [];
      const globalZ = robustZScore(item.amountCents, globalBaseline);
      const vendorBaseline = vendorBaselines.get(item.vendorCanonical);
      const vendorZ = robustZScore(item.amountCents, vendorBaseline);
      const completeness = completenessScore(item);
      let signalScore = 0;

      if (globalZ !== null && globalZ >= 3.5) {
        const score = Math.min(80, Math.round(45 + globalZ * 6));
        signalScore = Math.max(signalScore, score);
        signals.push({
          type: "global_amount_anomaly",
          score,
          message: `Global robust amount anomaly: ${globalZ.toFixed(1)} median-absolute-deviation units from the local payment baseline.`,
          metrics: {
            robustZ: globalZ.toFixed(2),
            baselineCount: globalBaseline.count,
          },
        });
      }

      if (vendorZ !== null && vendorBaseline.count >= 3 && vendorZ >= 3) {
        const score = Math.min(85, Math.round(50 + vendorZ * 7));
        signalScore = Math.max(signalScore, score);
        signals.push({
          type: "vendor_amount_anomaly",
          score,
          message: `Vendor-level robust amount anomaly: ${vendorZ.toFixed(1)} median-absolute-deviation units from this payee's local baseline.`,
          metrics: {
            robustZ: vendorZ.toFixed(2),
            baselineCount: vendorBaseline.count,
          },
        });
      }

      if (vendorBaseline && vendorBaseline.count < 3 && item.score > 0) {
        signalScore = Math.max(signalScore, 30);
        signals.push({
          type: "limited_vendor_baseline",
          score: 30,
          message: `Limited vendor baseline: only ${vendorBaseline.count} local amount row(s) for this payee, so rule evidence should be reviewed before release.`,
          metrics: {
            baselineCount: vendorBaseline.count,
          },
        });
      }

      if (!historyVendors.has(item.vendorCanonical) && item.vendorCanonical) {
        signalScore = Math.max(signalScore, 28);
        signals.push({
          type: "missing_vendor_history",
          score: 28,
          message: "Vendor/payee is not present in the paid-history baseline supplied to this local scan.",
          metrics: {
            historyVendorCount: historyVendors.size,
          },
        });
      }

      if (completeness < 85) {
        signalScore = Math.max(signalScore, 25);
        signals.push({
          type: "record_completeness_gap",
          score: 25,
          message: `Record completeness is ${completeness}%; missing fields reduce machine-assisted confidence.`,
          metrics: {
            completeness,
          },
        });
      }

      if (signals.length === 0) {
        signals.push({
          type: "no_local_threshold_signal",
          score: 0,
          message: "No local unsupervised amount, vendor-history, or completeness signal exceeded the review threshold.",
          metrics: {},
        });
      }

      return {
        scorecardVersion: SCORECARD_VERSION,
        rowNumber: item.rowNumber,
        queue: item.queue,
        vendor: item.vendor,
        invoiceNumber: item.invoiceNumber,
        amount: amountDisplay(item.amountCents),
        signalScore,
        globalRobustZ: globalZ === null ? "" : globalZ.toFixed(2),
        vendorRobustZ: vendorZ === null ? "" : vendorZ.toFixed(2),
        completeness,
        evidence: signals,
      };
    });
  }

  function sourceProfile(headers, rows, sourceName) {
    const cleanHeaders = headers || [];
    const normalizedHeaders = cleanHeaders.map((header) => namespace.fieldMapping.normalizeHeader(header));
    const mappingResult = namespace.fieldMapping.detectFieldMapping(cleanHeaders);
    const readyFields = Object.keys(mappingResult.mapping).filter((fieldName) => Boolean(mappingResult.mapping[fieldName]));
    const profileDefinitions = [
      {
        id: "payment_run_export",
        signals: [
          { label: "payment or batch reference", pattern: /payment id|payment reference|payment batch|batch id|check number|付款编号|付款参考|付款批次|批次号|交易流水|支票号/ },
          { label: "payment status", pattern: /payment status|status|scheduled|approved|cleared|付款状态|支付状态|待付款|已审批|已结清/ },
          { label: "AP core fields", fields: ["vendor", "invoice_number", "amount"] },
        ],
      },
      {
        id: "paid_history_export",
        signals: [
          { label: "paid date or posted date", pattern: /paid date|posted date|settlement date|cleared date|已付日期|付款日期|支付日期|入账日期|过账日期|结算日期/ },
          { label: "paid status", pattern: /paid|posted|settled|cleared|已付款|已支付|已入账|已结清|已结算/ },
          { label: "AP core fields", fields: ["vendor", "invoice_number", "amount"] },
        ],
      },
      {
        id: "quickbooks_like_export",
        signals: [
          { label: "QuickBooks marker", pattern: /quickbooks|qbo|doc num|num|name|memo/ },
          { label: "bill or vendor fields", pattern: /vendor|bill|document|doc num/ },
        ],
      },
      {
        id: "xero_like_export",
        signals: [
          { label: "Xero marker", pattern: /xero|contact|bill reference|reference/ },
          { label: "contact and amount fields", pattern: /contact|total|amount due|paid/ },
        ],
      },
      {
        id: "bank_statement_like_export",
        signals: [
          { label: "bank transaction marker", pattern: /bank|transaction|debit|credit|statement|deposit|withdrawal|银行|交易|借方|贷方|流水|对账单|收入|支出/ },
          { label: "date and amount fields", fields: ["date", "amount"] },
        ],
      },
      {
        id: "shopify_or_payout_like_export",
        signals: [
          { label: "payout or order marker", pattern: /shopify|payout|order|fee|refund|net/ },
          { label: "processor settlement fields", pattern: /gross|net|fee|adjustment|deposit/ },
        ],
      },
      {
        id: "odoo_like_export",
        signals: [
          { label: "Odoo accounting marker", pattern: /odoo|partner|move|journal|reconcile/ },
          { label: "vendor bill fields", pattern: /bill|vendor|amount|reference/ },
        ],
      },
    ];

    const scoredProfiles = profileDefinitions.map((profile) => {
      const matchedSignals = profile.signals.filter((signal) => {
        if (signal.pattern && normalizedHeaders.some((header) => signal.pattern.test(header))) {
          return true;
        }
        if (signal.fields && signal.fields.every((fieldName) => readyFields.includes(fieldName))) {
          return true;
        }
        return false;
      });
      return {
        id: profile.id,
        matchedSignals: matchedSignals.map((signal) => signal.label),
        score: matchedSignals.length,
      };
    }).sort((left, right) => right.score - left.score);

    const bestProfile = scoredProfiles[0] || { id: "generic_ap_export", matchedSignals: [], score: 0 };
    const likelySource = bestProfile.score > 0 ? bestProfile.id : "generic_ap_export";
    const profileConfidence = Math.min(92, Math.max(25, 25 + bestProfile.score * 24 + readyFields.length * 4));
    const missingUsefulHeaders = ["vendor", "invoice_number", "amount", "date", "payment_id", "status"]
      .filter((fieldName) => !mappingResult.mapping[fieldName])
      .map((fieldName) => fieldName.replace("_", " "));
    const matchedProfileSignals = bestProfile.matchedSignals.length ? bestProfile.matchedSignals : ["generic AP column structure"];
    const profileWarning = profileConfidence < 70
      ? "Low confidence: confirm source type and field meaning before relying on the queue."
      : "Profile is a routing hint, not an ERP connection or accounting conclusion.";

    return {
      sourceName,
      likelySource,
      profileConfidence,
      matchedProfileSignals,
      missingUsefulHeaders,
      profileWarning,
      readyFieldCount: readyFields.length,
      headerCount: cleanHeaders.length,
      rowCount: (rows || []).length,
      headers: cleanHeaders,
    };
  }

  function fieldLedger(sourceName, mappingResult, headers, rows) {
    const standardFields = Object.keys(namespace.fieldMapping.fieldAliases);
    if (namespace.fieldConfidenceLedger && typeof namespace.fieldConfidenceLedger.buildFieldConfidenceLedger === "function") {
      const detailedRows = namespace.fieldConfidenceLedger.buildFieldConfidenceLedger(headers || [], rows || []);
      return standardFields.map((fieldName) => {
        const selectedRow = detailedRows.find((row) => row.selectedField === fieldName);
        const candidateRows = detailedRows
          .map((row) => {
            const candidate = (row.topCandidates || []).find((item) => item.field === fieldName);
            return candidate ? { row, candidate } : null;
          })
          .filter(Boolean)
          .sort((left, right) => right.candidate.score - left.candidate.score);
        const ledgerRow = selectedRow || (candidateRows[0] || {}).row || null;
        const candidate = selectedRow
          ? (selectedRow.topCandidates || []).find((item) => item.field === fieldName) || { score: selectedRow.score, evidence: selectedRow.evidence || [] }
          : (candidateRows[0] || {}).candidate || null;
        const fallbackConfidence = mappingResult.confidence[fieldName] || 0;
        const fallbackHeader = mappingResult.mapping[fieldName] || "";
        const confidence = candidate ? candidate.score : fallbackConfidence;
        const detectedHeader = ledgerRow ? ledgerRow.originalField : fallbackHeader;
        const reviewRequired = ledgerRow ? ledgerRow.reviewRequired || ledgerRow.selectedField !== fieldName : confidence < 80;
        return {
          source: sourceName,
          field: fieldName,
          detectedHeader,
          confidence,
          status: detectedHeader && confidence >= 80 && !reviewRequired ? "ready" : detectedHeader ? "review" : "missing",
          evidence: candidate ? candidate.evidence || [] : [],
          candidates: ledgerRow ? ledgerRow.topCandidates || [] : [],
          version: ledgerRow ? ledgerRow.version : namespace.fieldConfidenceLedger.version,
        };
      });
    }

    return standardFields.map((fieldName) => {
      const confidence = mappingResult.confidence[fieldName] || 0;
      const detectedHeader = mappingResult.mapping[fieldName] || "";
      return {
        source: sourceName,
        field: fieldName,
        detectedHeader,
        confidence,
        status: detectedHeader && confidence >= 80 ? "ready" : detectedHeader ? "review" : "missing",
      };
    });
  }

  function ruleReadiness(currentMapping, historyMapping, historyRowCount, aliasCount) {
    const hasCurrent = (fieldName) => Boolean(currentMapping.mapping[fieldName]);
    const hasHistory = (fieldName) => Boolean(historyMapping.mapping[fieldName]);
    const rules = [
      {
        rule: "exact_duplicate_invoice",
        required: ["vendor", "invoice_number", "amount"],
        ready: hasCurrent("vendor") && hasCurrent("invoice_number") && hasCurrent("amount"),
        note: "Needs current-run vendor, invoice, and amount fields.",
      },
      {
        rule: "normalized_invoice_match",
        required: ["vendor", "invoice_number", "amount"],
        ready: hasCurrent("vendor") && hasCurrent("invoice_number") && hasCurrent("amount"),
        note: "Needs current-run vendor, invoice, and amount fields; punctuation is normalized locally.",
      },
      {
        rule: "current_run_duplicate_rows",
        required: ["vendor", "invoice_number", "amount", "date", "payment_id"],
        ready: hasCurrent("vendor") && hasCurrent("invoice_number") && hasCurrent("amount") && hasCurrent("date") && hasCurrent("payment_id"),
        note: "Best when the current payment run includes a batch or payment reference.",
      },
      {
        rule: "same_vendor_amount_date_window",
        required: ["vendor", "amount", "date"],
        ready: hasCurrent("vendor") && hasCurrent("amount") && hasCurrent("date"),
        note: "Needs current-run vendor, amount, and date fields.",
      },
      {
        rule: "historical_paid_comparison",
        required: ["current vendor", "current invoice", "current amount", "history vendor", "history invoice", "history amount"],
        ready: hasCurrent("vendor") && hasCurrent("invoice_number") && hasCurrent("amount") && hasHistory("vendor") && hasHistory("invoice_number") && hasHistory("amount") && historyRowCount > 0,
        note: historyRowCount > 0 ? "Paid-history rows are available for comparison." : "Add paid-history rows to unlock historical duplicate checks.",
      },
      {
        rule: "vendor_payee_alias_review",
        required: ["vendor", "amount", "date", "alias map"],
        ready: hasCurrent("vendor") && hasCurrent("amount") && hasCurrent("date") && aliasCount > 0,
        note: aliasCount > 0 ? "Vendor alias rows are available." : "Add alias rows to strengthen payee/entity review.",
      },
    ];

    return rules.map((rule) => ({
      rule: rule.rule,
      status: rule.ready ? "ready" : "blocked_or_partial",
      required: rule.required.join("; "),
      note: rule.note,
    }));
  }

  function buildBuyerDecisionGuidance(sourceProfiles, fieldLedgerRows, ruleReadinessRows, currentRowCount, historyRowCount, aliasCount) {
    const currentProfile = (sourceProfiles || []).find((profile) => profile.sourceName === "current") || {};
    const currentFieldRows = (fieldLedgerRows || []).filter((row) => row.source === "current");
    const readyFields = currentFieldRows.filter((row) => row.status === "ready");
    const reviewFields = currentFieldRows.filter((row) => row.status === "review");
    const missingFields = currentFieldRows.filter((row) => row.status === "missing");
    const missingCoreFields = ["vendor", "invoice_number", "amount"]
      .filter((fieldName) => !readyFields.some((row) => row.field === fieldName))
      .map((fieldName) => fieldName.replace("_", " "));
    const readyRules = (ruleReadinessRows || []).filter((rule) => rule.status === "ready");
    const blockedRules = (ruleReadinessRows || []).filter((rule) => rule.status !== "ready");
    const reasons = [
      `${readyRules.length}/${ruleReadinessRows.length} bundled checks are ready from this local export.`,
      `${readyFields.length} AP fields mapped confidently; ${reviewFields.length} need confirmation; ${missingFields.length} are missing.`,
      `${currentRowCount || 0} current-run rows, ${historyRowCount || 0} paid-history rows, and ${aliasCount || 0} alias rows were available.`,
      `Source profile: ${currentProfile.likelySource || "generic_ap_export"} at ${currentProfile.profileConfidence || 0}% confidence.`,
    ];

    if (missingCoreFields.length > 0 || readyRules.length < 2) {
      return {
        status: "not_ready",
        label: "Do not buy yet",
        title: "Export is not ready for a paid AP review.",
        summary: "Core evidence is missing. Use the free proof path first and export stronger AP columns before buying the bundle or setup.",
        primaryCta: "Download free proof pack",
        primaryHref: "https://payhip.com/b/6UYfe",
        secondaryCta: "View sample report",
        secondaryHref: "https://tools.simplezion.com/sample-report/",
        reasons: reasons.concat(missingCoreFields.length ? [`Missing core fields: ${missingCoreFields.join(", ")}.`] : ["Too few checks are ready to make a paid review useful."]),
        nextSteps: [
          "Export vendor/payee, invoice number, amount, and payment or bill date columns.",
          "Run the header checker again before sending any private AP rows.",
          "Buy setup only after the passport shows enough fields to review.",
        ],
      };
    }

    if (readyRules.length >= 5 && missingFields.length === 0 && reviewFields.length <= 1) {
      return {
        status: "self_serve_ready",
        label: "Self-serve ready",
        title: "This export is a fit for the USD49 self-serve bundle.",
        summary: "The current export has enough field confidence and rule readiness to use the local AP control workflow without a mapping call.",
        primaryCta: "Open USD49 bundle",
        primaryHref: "https://payhip.com/b/n6oUD",
        secondaryCta: "Download free proof pack",
        secondaryHref: "https://payhip.com/b/6UYfe",
        reasons,
        nextSteps: [
          "Review HOLD rows first, then REVIEW rows before any payment release.",
          "Save the HTML report and CSV queue as controller evidence.",
          "Use setup only if your live export differs from this sample-ready structure.",
        ],
      };
    }

    return {
      status: "setup_recommended",
      label: "Setup recommended",
      title: "This export likely needs the USD149 first-run setup before self-service.",
      summary: "Some checks are ready, but blocked rules or uncertain fields mean a short mapping review would reduce false confidence.",
      primaryCta: "Open USD149 setup",
      primaryHref: "https://tools.simplezion.com/setup-service/",
      secondaryCta: "Download free proof pack",
      secondaryHref: "https://payhip.com/b/6UYfe",
      reasons: reasons.concat(blockedRules.length ? [`Blocked or partial checks: ${blockedRules.map((rule) => rule.rule).join(", ")}.`] : ["Field confidence should be confirmed before relying on the queue."]),
      nextSteps: [
        "Send only headers, demo rows, or redacted rows for mapping review.",
        "Ask for a first-run readiness note before using the queue in a payment process.",
        "Move to self-serve only after core checks and history comparison are ready.",
      ],
    };
  }

  function runScan(currentParse, historyParse, aliasParse) {
    const currentMapping = namespace.fieldMapping.detectFieldMapping(currentParse.headers || []);
    const historyMapping = namespace.fieldMapping.detectFieldMapping(historyParse.headers || []);
    const aliasMap = buildAliasMap(aliasParse.rows || []);
    const currentItems = mapRows(currentParse.rows || [], currentMapping.mapping, aliasMap, "current");
    const historyItems = mapRows(historyParse.rows || [], historyMapping.mapping, aliasMap, "history").filter((item) => statusLooksPaid(item.statusNormalized));

    markDuplicateGroups(
      groupBy(currentItems, (item) => item.invoiceExact ? `${item.vendorCanonical}|${item.invoiceExact}|${item.amountCents}` : ""),
      95,
      "exact_duplicate_invoice",
      (items) => `Exact duplicate invoice in current run across rows ${items.map((item) => item.rowNumber).join(", ")}.`
    );

    markDuplicateGroups(
      groupBy(currentItems, (item) => item.invoiceNormalized ? `${item.vendorCanonical}|${item.invoiceNormalized}|${item.amountCents}` : ""),
      88,
      "normalized_invoice_match",
      (items) => `Normalized invoice match after removing punctuation/case across rows ${items.map((item) => item.rowNumber).join(", ")}.`
    );

    markDuplicateGroups(
      groupBy(currentItems, (item) => `${item.vendorCanonical}|${item.invoiceNormalized}|${item.amountCents}|${item.dateText}|${item.paymentId}`),
      90,
      "current_run_duplicate_rows",
      (items) => `Current run duplicate row signature appears on rows ${items.map((item) => item.rowNumber).join(", ")}.`
    );

    for (let leftIndex = 0; leftIndex < currentItems.length; leftIndex += 1) {
      for (let rightIndex = leftIndex + 1; rightIndex < currentItems.length; rightIndex += 1) {
        const leftItem = currentItems[leftIndex];
        const rightItem = currentItems[rightIndex];
        const dayGap = daysBetween(leftItem.date, rightItem.date);
        const sameVendorAmount = leftItem.vendorCanonical && leftItem.vendorCanonical === rightItem.vendorCanonical && leftItem.amountCents !== null && leftItem.amountCents === rightItem.amountCents;
        const differentInvoice = leftItem.invoiceNormalized !== rightItem.invoiceNormalized;
        if (sameVendorAmount && dayGap !== null && dayGap <= 3 && differentInvoice) {
          const message = `Same vendor and amount within ${dayGap} day(s), but invoice numbers differ.`;
          addReason(leftItem, 68, "same_vendor_amount_date_window", message, [rightItem.rowNumber]);
          addReason(rightItem, 68, "same_vendor_amount_date_window", message, [leftItem.rowNumber]);
        }
      }
    }

    currentItems.forEach((currentItem) => {
      historyItems.forEach((historyItem) => {
        const sameVendorAmount = currentItem.vendorCanonical && currentItem.vendorCanonical === historyItem.vendorCanonical && currentItem.amountCents !== null && currentItem.amountCents === historyItem.amountCents;
        const sameInvoice = currentItem.invoiceNormalized && currentItem.invoiceNormalized === historyItem.invoiceNormalized;
        const dayGap = daysBetween(currentItem.date, historyItem.date);
        if (sameVendorAmount && sameInvoice) {
          addReason(currentItem, 92, "historical_paid_comparison", `Matches paid history row ${historyItem.rowNumber} by vendor, normalized invoice, and amount.`, [historyItem.rowNumber]);
        } else if (sameVendorAmount && dayGap !== null && dayGap <= 7) {
          addReason(currentItem, 72, "historical_paid_comparison", `Near paid-history match: same vendor and amount within ${dayGap} day(s), history row ${historyItem.rowNumber}.`, [historyItem.rowNumber]);
        }
      });
    });

    const vendorGroups = groupBy(currentItems, (item) => `${item.vendorCanonical}|${item.amountCents}|${item.dateText}`);
    vendorGroups.forEach((items) => {
      const vendorCores = Array.from(new Set(items.map((item) => item.vendorCore).filter(Boolean)));
      if (items.length > 1 && vendorCores.length > 1) {
        const rowNumbers = items.map((item) => item.rowNumber);
        items.forEach((item) => {
          addReason(item, 45, "vendor_payee_alias_review", `Vendor/payee aliases may refer to the same payee: ${vendorCores.join(" / ")}.`, rowNumbers.filter((rowNumber) => rowNumber !== item.rowNumber));
        });
      }
    });

    currentItems.forEach((item) => {
      if (item.score >= 85) {
        item.queue = "HOLD";
      } else if (item.score >= 35) {
        item.queue = "REVIEW";
      } else {
        item.queue = "CLEAR";
        if (item.reasons.length === 0) {
          item.reasons.push({ rule: "clear", message: "No duplicate payment risk found by this scan.", score: 0 });
        }
      }
    });

    const mlSignals = mlAssistedSignals(currentItems, historyItems);
    const signalsByRow = new Map(mlSignals.map((signal) => [signal.rowNumber, signal]));
    currentItems.forEach((item) => {
      item.mlSignal = signalsByRow.get(item.rowNumber) || null;
    });

    const sortedItems = currentItems.slice().sort((left, right) => right.score - left.score || left.rowNumber - right.rowNumber);
    const queueCounts = {
      HOLD: sortedItems.filter((item) => item.queue === "HOLD").length,
      REVIEW: sortedItems.filter((item) => item.queue === "REVIEW").length,
      CLEAR: sortedItems.filter((item) => item.queue === "CLEAR").length,
    };
    const sourceProfiles = [
      sourceProfile(currentParse.headers || [], currentParse.rows || [], "current"),
      sourceProfile(historyParse.headers || [], historyParse.rows || [], "paid_history"),
      sourceProfile(aliasParse.headers || [], aliasParse.rows || [], "vendor_aliases"),
    ];
    const fieldLedgerRows = fieldLedger("current", currentMapping, currentParse.headers || [], currentParse.rows || [])
      .concat(fieldLedger("paid_history", historyMapping, historyParse.headers || [], historyParse.rows || []));
    const ruleReadinessRows = ruleReadiness(currentMapping, historyMapping, historyItems.length, aliasMap.size);

    return {
      items: sortedItems,
      currentMapping,
      historyMapping,
      sourceProfiles,
      fieldLedger: fieldLedgerRows,
      ruleReadiness: ruleReadinessRows,
      buyerDecisionGuidance: buildBuyerDecisionGuidance(sourceProfiles, fieldLedgerRows, ruleReadinessRows, currentItems.length, historyItems.length, aliasMap.size),
      mlSignals: mlSignals.slice().sort((left, right) => right.signalScore - left.signalScore || left.rowNumber - right.rowNumber),
      mlSummary: {
        scorecardVersion: SCORECARD_VERSION,
        method: "Explainable local unsupervised signals: robust amount baselines, vendor-history presence, and field completeness.",
        queuePolicy: "Local review signals do not change HOLD/REVIEW/CLEAR decisions; queues are assigned only from deterministic duplicate-payment rules.",
        signalCount: mlSignals.filter((signal) => signal.signalScore >= 25).length,
        highSignalCount: mlSignals.filter((signal) => signal.signalScore >= 50).length,
      },
      queueCounts,
      overallRisk: sortedItems.length ? Math.max(...sortedItems.map((item) => item.score)) : 0,
      currentRowCount: currentItems.length,
      historyRowCount: historyItems.length,
      aliasCount: aliasMap.size,
    };
  }

  namespace.scanner = {
    runScan,
    normalizeVendor,
    normalizeInvoice,
    parseAmount,
    parseDateValue,
    amountDisplay,
    buildBuyerDecisionGuidance,
  };

  window.DPRS = namespace;
})();
