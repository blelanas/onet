/** Text a spreadsheet would run as a formula when the file is opened (CSV / formula injection). */
const FORMULA_START = /^[=+\-@\t\r]/;
/** A plain signed number ("-12.500"): a value, not a formula — left as is. */
const PLAIN_NUMBER = /^[+-]?\d+(?:[.,]\d+)?$/;

/**
 * RFC-4180 CSV with BOM so Excel opens UTF-8 (Arabic) correctly. Text cells starting with `=`, `+`, `-`,
 * `@`, a tab or a carriage return get a leading `'` so Excel / LibreOffice show them as text instead of
 * running them (member-supplied names, notes…). Numbers passed as numbers, and strings that are just a
 * signed number, are untouched; a phone typed "+216 …" is shown with the quote (still readable as text).
 */
export function toCsv(rows: (string | number | null | undefined)[][]) {
  const esc = (v: string | number | null | undefined) => {
    let s = v == null ? "" : String(v);
    if (typeof v === "string" && FORMULA_START.test(s) && !PLAIN_NUMBER.test(s)) s = `'${s}`;
    return /[",\n\r;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return "﻿" + rows.map((r) => r.map(esc).join(",")).join("\r\n");
}
