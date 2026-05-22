export function parseCSV(text) {
  const rows = [];
  let cur = "",
    row = [],
    q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i],
      n = text[i + 1];
    if (c === '"' && q && n === '"') {
      cur += '"';
      i++;
    } else if (c === '"') q = !q;
    else if (c === "," && !q) {
      row.push(cur.trim());
      cur = "";
    } else if ((c === "\n" || c === "\r") && !q) {
      if (cur || row.length) {
        row.push(cur.trim());
        rows.push(row);
        row = [];
        cur = "";
      }
      if (c === "\r" && n === "\n") i++;
    } else cur += c;
  }
  if (cur || row.length) rows.push(row.concat([cur.trim()]));
  return rows.filter((r) => r.some((cell) => String(cell).trim() !== ""));
}

export function combineLegacyTriples(row) {
  const combined = [];
  for (let i = 0; i < row.length; ) {
    const a = String(row[i] || "").trim(),
      b = String(row[i + 1] || "").trim(),
      c = String(row[i + 2] || "").trim();
    if (/^D\d{1,2}$/i.test(b) && /^\d{1,3}$/.test(c)) {
      combined.push(a + ", " + b + ", " + c);
      i += 3;
    } else {
      combined.push(a);
      i++;
    }
  }
  return combined;
}

export function parseTileCell(cell, x, y, defaultModelColor = "#808080") {
  const raw = String(cell || "").trim();
  if (!raw) return null;
  const parts = raw
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);
  const assetName = (parts[0] || "").toLowerCase();
  if (
    !assetName ||
    /^D\d{1,2}$/i.test(assetName) ||
    /^\d{1,3}$/.test(assetName)
  )
    return null;
  const damageToken = (parts[1] || "D99").toUpperCase();
  const variant = (parts[2] || "001").padStart(3, "0");
  const damageMatch = damageToken.match(/^D(\d{1,2})$/);
  const damage = damageMatch
    ? Math.max(0, Math.min(99, Number(damageMatch[1])))
    : 99;
  return {
    x: x,
    y: y,
    sheetX: x + 1,
    sheetY: y + 1,
    height: 1,
    label: assetName,
    assetName: assetName,
    damageToken: "D" + String(damage).padStart(2, "0"),
    damage: damage,
    variant: variant,
    color: defaultModelColor,
    rawCell: raw,
  };
}

export function parseGridCSV(text, defaultModelColor = "#808080") {
  const rawRows = parseCSV(text);
  const out = [];
  for (let y = 0; y < rawRows.length; y++) {
    const row = combineLegacyTriples(rawRows[y]);
    for (let x = 0; x < row.length; x++) {
      const tile = parseTileCell(row[x], x, y, defaultModelColor);
      if (tile) out.push(tile);
    }
  }
  return out;
}
