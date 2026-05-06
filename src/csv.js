(function () {
  const namespace = window.DPRS || {};

  function parseCsvText(text) {
    const cleanText = String(text || "").replace(/^\ufeff/, "").trim();
    if (!cleanText) {
      return { headers: [], rows: [], errors: [] };
    }

    const rows = [];
    let currentRow = [];
    let currentValue = "";
    let insideQuotes = false;

    for (let index = 0; index < cleanText.length; index += 1) {
      const character = cleanText[index];
      const nextCharacter = cleanText[index + 1];

      if (character === '"') {
        if (insideQuotes && nextCharacter === '"') {
          currentValue += '"';
          index += 1;
        } else {
          insideQuotes = !insideQuotes;
        }
      } else if (character === "," && !insideQuotes) {
        currentRow.push(currentValue);
        currentValue = "";
      } else if ((character === "\n" || character === "\r") && !insideQuotes) {
        if (character === "\r" && nextCharacter === "\n") {
          index += 1;
        }
        currentRow.push(currentValue);
        rows.push(currentRow);
        currentRow = [];
        currentValue = "";
      } else {
        currentValue += character;
      }
    }

    currentRow.push(currentValue);
    rows.push(currentRow);

    const nonEmptyRows = rows
      .map((row) => row.map((value) => String(value || "").trim()))
      .filter((row) => row.some((value) => value !== ""));

    if (nonEmptyRows.length === 0) {
      return { headers: [], rows: [], errors: [] };
    }

    const headers = nonEmptyRows[0].map((header, index) => header || `column_${index + 1}`);
    const records = nonEmptyRows.slice(1).map((row, rowIndex) => {
      const record = {};
      headers.forEach((header, columnIndex) => {
        record[header] = row[columnIndex] || "";
      });
      record.__row_number = rowIndex + 2;
      return record;
    });

    return { headers, rows: records, errors: [] };
  }

  function toCsvValue(value) {
    const text = value === null || value === undefined ? "" : String(value);
    if (/[",\r\n]/.test(text)) {
      return `"${text.replace(/"/g, '""')}"`;
    }
    return text;
  }

  function rowsToCsv(rows, headers) {
    const outputHeaders = headers || Object.keys(rows[0] || {});
    const lines = [outputHeaders.map(toCsvValue).join(",")];
    rows.forEach((row) => {
      lines.push(outputHeaders.map((header) => toCsvValue(row[header])).join(","));
    });
    return lines.join("\r\n");
  }

  function readTextFile(file) {
    return new Promise((resolve, reject) => {
      if (!file) {
        resolve("");
        return;
      }

      if (/\.xlsx$/i.test(file.name)) {
        reject(new Error("XLSX is not parsed in this local browser demo. Export the workbook to CSV first."));
        return;
      }

      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = () => reject(new Error("Could not read the selected file."));
      reader.readAsText(file);
    });
  }

  namespace.csv = {
    parseCsvText,
    rowsToCsv,
    readTextFile,
  };

  window.DPRS = namespace;
})();
