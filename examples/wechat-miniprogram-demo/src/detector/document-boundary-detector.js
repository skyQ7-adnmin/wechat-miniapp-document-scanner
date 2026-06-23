const CONFIG = {
  autoApplyConfidence: 0.86,
  maxSide: 720,
  softTimeoutMs: 900,
  hardTimeoutMs: 1160,
  minAreaRatio: 0.2,
  maxAreaRatio: 0.92,
  minAspectRatio: 0.35,
  maxAspectRatio: 2.6,
  minEdgeConfidence: 0.68,
  safePaddingRatio: 0.018,
};

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function median(values) {
  if (!values.length) return null;
  const sorted = values.slice().sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
}

function mean(values) {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function mad(values, center) {
  if (!values.length || center == null) return 999;
  return median(values.map((value) => Math.abs(value - center))) || 0;
}

function percentile(values, ratio) {
  if (!values.length) return 0;
  const sorted = values.slice().sort((a, b) => a - b);
  return sorted[clamp(Math.floor(sorted.length * ratio), 0, sorted.length - 1)];
}

function luma(r, g, b) {
  return r * 0.299 + g * 0.587 + b * 0.114;
}

function saturation(r, g, b) {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  return max ? (max - min) / max : 0;
}

function timedOut(startedAt, hard) {
  return Date.now() - startedAt > (hard ? CONFIG.hardTimeoutMs : CONFIG.softTimeoutMs);
}

function fallbackRect(width, height) {
  return {
    left: width * 0.05,
    top: height * 0.05,
    right: width * 0.95,
    bottom: height * 0.95,
  };
}

function extractFeatures(data, width, height, startedAt) {
  const total = width * height;
  const gray = new Uint8Array(total);
  const sat = new Uint8Array(total);
  const gx = new Uint8Array(total);
  const gy = new Uint8Array(total);
  const edge = new Uint8Array(total);
  const lumas = [];

  for (let i = 0; i < total; i += 1) {
    const offset = i * 4;
    const value = luma(data[offset], data[offset + 1], data[offset + 2]);
    gray[i] = clamp(Math.round(value), 0, 255);
    sat[i] = clamp(Math.round(saturation(data[offset], data[offset + 1], data[offset + 2]) * 255), 0, 255);
    if (i % 5 === 0) lumas.push(value);
  }

  for (let y = 1; y < height - 1; y += 1) {
    if (timedOut(startedAt, true)) break;
    for (let x = 1; x < width - 1; x += 1) {
      const index = y * width + x;
      const dx = Math.abs(gray[index + 1] - gray[index - 1]);
      const dy = Math.abs(gray[index + width] - gray[index - width]);
      gx[index] = clamp(dx, 0, 255);
      gy[index] = clamp(dy, 0, 255);
      edge[index] = clamp(Math.max(dx, dy), 0, 255);
    }
  }

  return {
    width,
    height,
    gray,
    sat,
    gx,
    gy,
    edge,
    brightFloor: clamp(percentile(lumas, 0.62) - 6, 126, 214),
  };
}

function buildPaperAnchor(features, startedAt) {
  const { width, height, gray, sat, edge, brightFloor } = features;
  const xs = [];
  const ys = [];
  const step = Math.max(2, Math.round(Math.max(width, height) / 360));
  let sampled = 0;
  let paperCount = 0;

  for (let y = 2; y < height - 2; y += step) {
    if (timedOut(startedAt, true)) break;
    for (let x = 2; x < width - 2; x += step) {
      sampled += 1;
      const index = y * width + x;
      const paperLike = (gray[index] > brightFloor && sat[index] < 118) || (gray[index] > 176 && sat[index] < 138);
      const structure = edge[index] > 45 && gray[index] > 70;
      if (paperLike) paperCount += 1;
      if ((paperLike && structure) || (paperLike && gray[index] > 132)) {
        xs.push(x);
        ys.push(y);
      }
    }
  }

  if (xs.length < sampled * 0.015) {
    return { anchor: null, confidence: 0, source: 'none' };
  }

  const rect = {
    left: percentile(xs, 0.01),
    right: percentile(xs, 0.99),
    top: percentile(ys, 0.01),
    bottom: percentile(ys, 0.99),
  };
  const confidence = clamp((paperCount / Math.max(1, sampled)) * 1.25, 0, 1);
  return { anchor: rect, confidence, source: 'paper' };
}

function detectLongLines(features, startedAt) {
  const { width, height, gray, gx, gy, edge } = features;
  const horizontal = [];
  const vertical = [];
  const sampleStep = 2;

  for (let y = 1; y < height - 1; y += 1) {
    if (timedOut(startedAt, true)) break;
    let score = 0;
    for (let x = 1; x < width - 1; x += sampleStep) {
      const index = y * width + x;
      if (gy[index] > 26 || edge[index] > 54 || gray[index] < 118) score += 1;
    }
    const coverage = score / (width / sampleStep);
    if (coverage > 0.18) horizontal.push({ y, coverage });
  }

  for (let x = 1; x < width - 1; x += 1) {
    if (timedOut(startedAt, true)) break;
    let score = 0;
    for (let y = 1; y < height - 1; y += sampleStep) {
      const index = y * width + x;
      if (gx[index] > 26 || edge[index] > 54 || gray[index] < 118) score += 1;
    }
    const coverage = score / (height / sampleStep);
    if (coverage > 0.16) vertical.push({ x, coverage });
  }

  return {
    horizontal: clusterLines(horizontal, 'y').slice(0, 24),
    vertical: clusterLines(vertical, 'x').slice(0, 24),
  };
}

function clusterLines(lines, key) {
  const sorted = lines.slice().sort((a, b) => a[key] - b[key]);
  const clustered = [];
  let group = [];
  sorted.forEach((line) => {
    if (!group.length || Math.abs(line[key] - group[group.length - 1][key]) <= 3) {
      group.push(line);
      return;
    }
    clustered.push(bestLine(group, key));
    group = [line];
  });
  if (group.length) clustered.push(bestLine(group, key));
  return clustered.sort((a, b) => b.coverage - a.coverage);
}

function bestLine(group, key) {
  const total = group.reduce((sum, line) => sum + line.coverage, 0);
  return {
    [key]: Math.round(group.reduce((sum, line) => sum + line[key] * line.coverage, 0) / Math.max(0.001, total)),
    coverage: Math.max(...group.map((line) => line.coverage)),
  };
}

function buildTableAnchor(lines, width, height) {
  const horizontal = lines.horizontal.filter((line) => line.coverage > 0.24);
  const vertical = lines.vertical.filter((line) => line.coverage > 0.22);
  if (horizontal.length < 3 || vertical.length < 3) {
    return { anchor: null, confidence: 0, intersections: 0 };
  }

  const ys = horizontal.map((line) => line.y);
  const xs = vertical.map((line) => line.x);
  const rect = {
    left: Math.min(...xs),
    right: Math.max(...xs),
    top: Math.min(...ys),
    bottom: Math.max(...ys),
  };
  const areaRatio = ((rect.right - rect.left) * (rect.bottom - rect.top)) / (width * height);
  const avgCellW = (rect.right - rect.left) / Math.max(1, vertical.length - 1);
  const avgCellH = (rect.bottom - rect.top) / Math.max(1, horizontal.length - 1);
  const keyboardLike = rect.top > height * 0.58 && avgCellW < width * 0.09 && avgCellH < height * 0.055;

  if (areaRatio < 0.035 || areaRatio > 0.72 || keyboardLike) {
    return {
      anchor: null,
      confidence: 0,
      intersections: horizontal.length * vertical.length,
      keyboardLike,
    };
  }

  const confidence = clamp(
    horizontal.length / 12 * 0.32 +
      vertical.length / 10 * 0.32 +
      Math.min(areaRatio / 0.18, 1) * 0.22 +
      Math.min((horizontal.length * vertical.length) / 38, 1) * 0.14,
    0,
    1,
  );
  return {
    anchor: rect,
    confidence,
    intersections: horizontal.length * vertical.length,
    keyboardLike: false,
  };
}

function findEdges(features, anchor) {
  const { width, height } = features;
  const anchorW = anchor.right - anchor.left;
  const anchorH = anchor.bottom - anchor.top;
  const bounds = {
    left: clamp(anchor.left - anchorW * 0.55, 0, width - 1),
    right: clamp(anchor.right + anchorW * 0.55, 1, width),
    top: clamp(anchor.top - anchorH * 0.85, 0, height - 1),
    bottom: clamp(anchor.bottom + anchorH * 0.95, 1, height),
  };
  return {
    left: findEdge(features, anchor, bounds, 'left'),
    right: findEdge(features, anchor, bounds, 'right'),
    top: findEdge(features, anchor, bounds, 'top'),
    bottom: findEdge(features, anchor, bounds, 'bottom'),
  };
}

function findEdge(features, anchor, bounds, side) {
  const { width, height, gray, sat, edge } = features;
  const positions = [];
  const scores = [];
  const bandCount = 7;
  const insideOffset = 8;

  if (side === 'left' || side === 'right') {
    const start = side === 'left' ? bounds.left : anchor.right;
    const end = side === 'left' ? anchor.left : bounds.right;
    for (let band = 1; band <= bandCount; band += 1) {
      const y = Math.round(anchor.top + (anchor.bottom - anchor.top) * band / (bandCount + 1));
      const candidates = [];
      for (let x = Math.round(start); x <= Math.round(end); x += 2) {
        const px = clamp(x, 1, width - 2);
        const py = clamp(y, 1, height - 2);
        const i = py * width + px;
        const insideX = clamp(side === 'left' ? px + insideOffset : px - insideOffset, 1, width - 2);
        const outsideX = clamp(side === 'left' ? px - insideOffset : px + insideOffset, 1, width - 2);
        candidates.push({
          pos: px,
          score: edge[i] * 0.38 +
            Math.abs(gray[py * width + insideX] - gray[py * width + outsideX]) * 0.44 +
            Math.abs(sat[py * width + insideX] - sat[py * width + outsideX]) * 0.18,
        });
      }
      pushBestEdgeCandidate(candidates, positions, scores);
    }
  } else {
    const start = side === 'top' ? bounds.top : anchor.bottom;
    const end = side === 'top' ? anchor.top : bounds.bottom;
    for (let band = 1; band <= bandCount; band += 1) {
      const x = Math.round(anchor.left + (anchor.right - anchor.left) * band / (bandCount + 1));
      const candidates = [];
      for (let y = Math.round(start); y <= Math.round(end); y += 2) {
        const px = clamp(x, 1, width - 2);
        const py = clamp(y, 1, height - 2);
        const i = py * width + px;
        const insideY = clamp(side === 'top' ? py + insideOffset : py - insideOffset, 1, height - 2);
        const outsideY = clamp(side === 'top' ? py - insideOffset : py + insideOffset, 1, height - 2);
        candidates.push({
          pos: py,
          score: edge[i] * 0.38 +
            Math.abs(gray[insideY * width + px] - gray[outsideY * width + px]) * 0.44 +
            Math.abs(sat[insideY * width + px] - sat[outsideY * width + px]) * 0.18,
        });
      }
      pushBestEdgeCandidate(candidates, positions, scores);
    }
  }

  const center = median(positions);
  const spread = mad(positions, center);
  const support = positions.length / bandCount;
  const score = mean(scores);
  const maxSpread = (side === 'left' || side === 'right' ? width : height) * 0.035;
  const confidence = center == null ? 0 : clamp(
    support * 0.42 +
      clamp(score / 58, 0, 1) * 0.38 +
      clamp(1 - spread / Math.max(1, maxSpread), 0, 1) * 0.2,
    0,
    1,
  );
  return {
    position: center,
    support,
    spread,
    confidence,
    score,
    valid: center != null && support >= 0.6 && spread <= maxSpread && score >= 22,
  };
}

function pushBestEdgeCandidate(candidates, positions, scores) {
  if (!candidates.length) return;
  candidates.sort((a, b) => b.score - a.score);
  const best = candidates[0];
  if (best && best.score >= 18) {
    positions.push(best.pos);
    scores.push(best.score);
  }
}

function validateRect(rect, width, height, anchor) {
  const boxW = rect.right - rect.left;
  const boxH = rect.bottom - rect.top;
  const areaRatio = boxW * boxH / (width * height);
  const aspect = boxW / Math.max(1, boxH);
  if (areaRatio < CONFIG.minAreaRatio) return 'abnormal-area';
  if (areaRatio > CONFIG.maxAreaRatio) return 'abnormal-area';
  if (aspect < CONFIG.minAspectRatio || aspect > CONFIG.maxAspectRatio) return 'abnormal-area';
  if (boxW < width * 0.22 || boxH < height * 0.22) return 'abnormal-area';
  if (
    anchor &&
    (rect.left > anchor.left || rect.right < anchor.right || rect.top > anchor.top || rect.bottom < anchor.bottom)
  ) {
    return 'anchor-outside';
  }
  return '';
}

function addSafePadding(rect, width, height) {
  const padX = width * CONFIG.safePaddingRatio;
  const padY = height * CONFIG.safePaddingRatio;
  return {
    left: clamp(rect.left - padX, 0, width),
    top: clamp(rect.top - padY, 0, height),
    right: clamp(rect.right + padX, 0, width),
    bottom: clamp(rect.bottom + padY, 0, height),
  };
}

function detectDocumentBoundary(data, width, height, options) {
  const startedAt = options && options.startedAt ? options.startedAt : Date.now();
  const features = extractFeatures(data, width, height, startedAt);
  const diagnostics = {
    imageSize: { width, height },
    anchorSource: 'none',
    anchorRect: null,
    horizontalLongLines: 0,
    verticalLongLines: 0,
    edgeSupport: {},
    edgeSpread: {},
    edgeConfidence: {},
    finalConfidence: 0,
    applied: false,
    fallbackReason: '',
    elapsedMs: 0,
  };

  if (timedOut(startedAt, true)) {
    diagnostics.fallbackReason = 'timeout';
    diagnostics.elapsedMs = Date.now() - startedAt;
    return { rect: fallbackRect(width, height), confidence: 0, source: 'fallback', diagnostics };
  }

  const paper = buildPaperAnchor(features, startedAt);
  const lines = detectLongLines(features, startedAt);
  diagnostics.horizontalLongLines = lines.horizontal.length;
  diagnostics.verticalLongLines = lines.vertical.length;
  const table = buildTableAnchor(lines, width, height);

  let anchor = null;
  let anchorConfidence = 0;
  let anchorSource = 'none';
  if (table.anchor && table.confidence >= 0.42) {
    anchor = table.anchor;
    anchorConfidence = table.confidence;
    anchorSource = 'table';
  } else if (paper.anchor && paper.confidence >= 0.48) {
    anchor = paper.anchor;
    anchorConfidence = paper.confidence;
    anchorSource = 'paper';
  }

  diagnostics.anchorSource = anchorSource;
  diagnostics.anchorRect = anchor;
  if (!anchor) {
    diagnostics.fallbackReason = table.keyboardLike ? 'keyboard-like' : 'no-anchor';
    diagnostics.elapsedMs = Date.now() - startedAt;
    return { rect: fallbackRect(width, height), confidence: 0, source: 'fallback', diagnostics };
  }

  if (timedOut(startedAt, false)) {
    diagnostics.fallbackReason = 'timeout';
    diagnostics.elapsedMs = Date.now() - startedAt;
    return { rect: fallbackRect(width, height), confidence: 0, source: 'fallback', diagnostics };
  }

  const edges = findEdges(features, anchor);
  const edgeNames = ['left', 'top', 'right', 'bottom'];
  edgeNames.forEach((name) => {
    diagnostics.edgeSupport[name] = edges[name].support;
    diagnostics.edgeSpread[name] = edges[name].spread;
    diagnostics.edgeConfidence[name] = edges[name].confidence;
  });

  const invalidEdge = edgeNames.find((name) => !edges[name].valid);
  if (invalidEdge) {
    diagnostics.fallbackReason = `unstable-${invalidEdge}`;
    diagnostics.elapsedMs = Date.now() - startedAt;
    return { rect: fallbackRect(width, height), confidence: 0, source: 'fallback', diagnostics };
  }

  let rect = addSafePadding({
    left: edges.left.position,
    top: edges.top.position,
    right: edges.right.position,
    bottom: edges.bottom.position,
  }, width, height);

  const invalidReason = validateRect(rect, width, height, anchor);
  if (invalidReason) {
    diagnostics.fallbackReason = invalidReason;
    diagnostics.elapsedMs = Date.now() - startedAt;
    return { rect: fallbackRect(width, height), confidence: 0, source: 'fallback', diagnostics };
  }

  const edgeConfidence = mean(edgeNames.map((name) => edges[name].confidence));
  const confidence = clamp(
    edgeConfidence * 0.56 +
      anchorConfidence * 0.22 +
      Math.min(table.intersections || 0, 36) / 36 * 0.1 +
      paper.confidence * 0.12,
    0,
    1,
  );
  diagnostics.finalConfidence = confidence;
  diagnostics.elapsedMs = Date.now() - startedAt;

  if (
    confidence < CONFIG.autoApplyConfidence ||
    edgeNames.some((name) => edges[name].confidence < CONFIG.minEdgeConfidence)
  ) {
    diagnostics.fallbackReason = 'low-confidence';
    return { rect: fallbackRect(width, height), confidence, source: 'fallback', diagnostics };
  }

  diagnostics.applied = true;
  return {
    rect,
    confidence,
    source: anchorSource === 'table' ? 'table_edge_rect' : 'paper_edge_rect',
    diagnostics,
  };
}

module.exports = {
  detectDocumentBoundary,
};
