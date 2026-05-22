function neighbors(grid, x, y, type) {
  const dirs = [
      [0, -1, "N"],
      [1, 0, "E"],
      [0, 1, "S"],
      [-1, 0, "W"],
    ],
    hits = [];

  for (const d of dirs) {
    if (grid.get(x + d[0] + "," + (y + d[1])) === type) hits.push(d[2]);
  }

  return hits;
}

function neighborIsAny(grid, x, y, direction, types) {
  const offsets = { N: [0, -1], E: [1, 0], S: [0, 1], W: [-1, 0] };
  const o = offsets[direction];

  if (!o) return false;

  const t = grid.get(x + o[0] + "," + (y + o[1]));
  return (types || []).includes(t);
}

function ruleMatches(rule, hits, grid, x, y) {
  const required = rule.requires || [];

  if (!required.every((d) => hits.includes(d))) return false;

  if (Array.isArray(rule.requiresAnyType)) {
    for (const check of rule.requiresAnyType) {
      if (!neighborIsAny(grid, x, y, check.direction, check.types || [])) {
        return false;
      }
    }
  }

  if (
    rule.requiresExactCount !== undefined &&
    hits.length !== rule.requiresExactCount
  ) {
    return false;
  }

  if (
    rule.requiresMinimumCount !== undefined &&
    hits.length < rule.requiresMinimumCount
  ) {
    return false;
  }

  return true;
}

export function buildGrid(rows) {
  const grid = new Map();

  for (const r of rows) grid.set(r.x + "," + r.y, r.label);

  return grid;
}

export function applyGenericRules(ruleDef, grid, x, y, type) {
  if (!ruleDef || !ruleDef.usesModel) {
    return { basePath: null, rotationY: 0, rule: "cube" };
  }

  const hits = neighbors(grid, x, y, type);

  if (Array.isArray(ruleDef.rules)) {
    const fallback = ruleDef.rules.find((r) => r.default) || null;

    for (const rule of ruleDef.rules) {
      if (rule.default) continue;

      if (ruleMatches(rule, hits, grid, x, y)) {
        return {
          basePath: ruleDef.models?.[rule.model] || null,
          rotationY: ((rule.rotationDegrees || 0) * Math.PI) / 180,
          rule: rule.name || "json rule",
        };
      }
    }

    if (fallback && ruleMatches(fallback, hits, grid, x, y)) {
      return {
        basePath: ruleDef.models?.[fallback.model] || null,
        rotationY: ((fallback.rotationDegrees || 0) * Math.PI) / 180,
        rule: fallback.name || "json default",
      };
    }
  }

  const modelKey = ruleDef.models?.default
    ? "default"
    : Object.keys(ruleDef.models || {})[0];

  return {
    basePath: ruleDef.models?.[modelKey] || null,
    rotationY: 0,
    rule: "json default model",
  };
}
