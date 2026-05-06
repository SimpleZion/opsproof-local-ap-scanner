(function () {
  const namespace = window.DPRS || {};
  const version = "vendor_normalization_v1";

  const englishSuffixPattern = /\b(inc|incorporated|llc|ltd|limited|co|company|corp|corporation|plc|services|service|the)\b/g;
  const chineseSuffixes = [
    "股份有限公司",
    "有限责任公司",
    "集团有限公司",
    "有限公司",
    "总公司",
    "分公司",
    "集团",
    "公司",
    "工厂",
    "经营部",
    "商行",
    "门市部",
  ];

  function compactText(value) {
    return String(value || "")
      .normalize("NFKC")
      .toLowerCase()
      .replace(/（[^）]*）|\([^)]*\)/g, " ")
      .replace(/&/g, " and ")
      .replace(/[^\p{L}\p{N}]+/gu, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function compactChineseText(value) {
    return String(value || "")
      .normalize("NFKC")
      .replace(/（[^）]*）|\([^)]*\)/g, "")
      .replace(/[^\p{L}\p{N}]+/gu, "")
      .trim();
  }

  function removeEnglishSuffixes(value, evidence) {
    const normalized = value.replace(englishSuffixPattern, " ").replace(/\s+/g, " ").trim();
    if (normalized !== value) {
      evidence.push("english_company_suffix_removed");
    }
    return normalized;
  }

  function removeChineseSuffixes(value, evidence) {
    let output = value;
    let changed = true;
    while (changed) {
      changed = false;
      for (const suffix of chineseSuffixes) {
        if (output.endsWith(suffix) && output.length > suffix.length + 1) {
          output = output.slice(0, -suffix.length);
          evidence.push(`chinese_company_suffix_removed:${suffix}`);
          changed = true;
          break;
        }
      }
    }
    return output;
  }

  function normalizeVendorName(value) {
    const rawValue = String(value || "").trim();
    const evidence = [];
    const compact = compactText(rawValue);
    const compactChinese = compactChineseText(rawValue);
    const looksChinese = /[\u3400-\u9fff]/.test(compactChinese);
    let canonicalKey = looksChinese
      ? removeChineseSuffixes(compactChinese, evidence)
      : removeEnglishSuffixes(compact, evidence);

    canonicalKey = canonicalKey.replace(/\s+/g, " ").trim();
    if (!canonicalKey && compact) {
      canonicalKey = compact;
      evidence.push("fallback_to_compact_name");
    }

    const reviewRequired = looksChinese && canonicalKey.length <= 4;
    if (reviewRequired) {
      evidence.push("short_chinese_core_requires_review");
    }

    return {
      rawValue,
      canonicalKey,
      comparisonKey: canonicalKey,
      evidence,
      reviewRequired,
      version,
    };
  }

  function normalizeVendorKey(value) {
    return normalizeVendorName(value).canonicalKey;
  }

  function buildVendorEntityLedger(value, aliasMap) {
    const normalized = normalizeVendorName(value);
    const aliasCanonicalKey = aliasMap && aliasMap.get(normalized.canonicalKey);
    const evidence = normalized.evidence.slice();
    if (aliasCanonicalKey) {
      evidence.push("alias_map_exact");
    }
    return {
      rawVendor: normalized.rawValue,
      canonicalVendor: aliasCanonicalKey || normalized.canonicalKey,
      candidates: [
        {
          canonicalVendor: aliasCanonicalKey || normalized.canonicalKey,
          score: aliasCanonicalKey ? 100 : (normalized.reviewRequired ? 62 : 88),
          evidence,
          reviewRequired: normalized.reviewRequired,
        },
      ],
      selectedCanonicalVendor: aliasCanonicalKey || normalized.canonicalKey,
      reviewRequired: normalized.reviewRequired,
      version,
    };
  }

  function explainVendorEntityMatch(leftVendor, rightVendor, aliasMap) {
    const left = buildVendorEntityLedger(leftVendor, aliasMap);
    const right = buildVendorEntityLedger(rightVendor, aliasMap);
    const same = left.selectedCanonicalVendor && left.selectedCanonicalVendor === right.selectedCanonicalVendor;
    const evidence = [];
    if (same) {
      evidence.push("canonical_vendor_match");
    }
    if (left.reviewRequired || right.reviewRequired) {
      evidence.push("short_name_requires_review");
    }
    return {
      same,
      left,
      right,
      score: same ? (left.reviewRequired || right.reviewRequired ? 68 : 92) : 0,
      evidence,
      version,
    };
  }

  namespace.vendorNormalization = {
    version,
    normalizeVendorName,
    normalizeVendorKey,
    buildVendorEntityLedger,
    explainVendorEntityMatch,
  };

  window.DPRS = namespace;
})();
