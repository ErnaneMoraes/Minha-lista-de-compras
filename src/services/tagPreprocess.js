function resizeRgba(src, srcW, srcH, dstW, dstH) {
  if (srcW === dstW && srcH === dstH) {
    return new Uint8ClampedArray(src);
  }
  const dst = new Uint8ClampedArray(dstW * dstH * 4);
  const scaleX = srcW / dstW;
  const scaleY = srcH / dstH;

  for (let y = 0; y < dstH; y += 1) {
    const sy = Math.min(srcH - 1, (y + 0.5) * scaleY - 0.5);
    const y0 = Math.max(0, Math.floor(sy));
    const y1 = Math.min(srcH - 1, y0 + 1);
    const wy = sy - y0;

    for (let x = 0; x < dstW; x += 1) {
      const sx = Math.min(srcW - 1, (x + 0.5) * scaleX - 0.5);
      const x0 = Math.max(0, Math.floor(sx));
      const x1 = Math.min(srcW - 1, x0 + 1);
      const wx = sx - x0;

      const idx00 = (y0 * srcW + x0) * 4;
      const idx10 = (y0 * srcW + x1) * 4;
      const idx01 = (y1 * srcW + x0) * 4;
      const idx11 = (y1 * srcW + x1) * 4;
      const outIdx = (y * dstW + x) * 4;

      for (let c = 0; c < 3; c += 1) {
        const top = src[idx00 + c] * (1 - wx) + src[idx10 + c] * wx;
        const bot = src[idx01 + c] * (1 - wx) + src[idx11 + c] * wx;
        dst[outIdx + c] = Math.round(top * (1 - wy) + bot * wy);
      }
      dst[outIdx + 3] = 255;
    }
  }
  return dst;
}

function cropRgba(src, srcW, x0, y0, x1, y1) {
  const cw = Math.max(1, x1 - x0);
  const ch = Math.max(1, y1 - y0);
  const out = new Uint8ClampedArray(cw * ch * 4);
  for (let y = 0; y < ch; y += 1) {
    const srcStart = ((y0 + y) * srcW + x0) * 4;
    const dstStart = y * cw * 4;
    out.set(src.subarray(srcStart, srcStart + cw * 4), dstStart);
  }
  return { data: out, width: cw, height: ch };
}

function padWhiteRgba(src, srcW, srcH, padX, padY) {
  const outW = srcW + padX * 2;
  const outH = srcH + padY * 2;
  const out = new Uint8ClampedArray(outW * outH * 4);
  out.fill(255);
  for (let y = 0; y < srcH; y += 1) {
    const srcStart = y * srcW * 4;
    const dstStart = ((y + padY) * outW + padX) * 4;
    out.set(src.subarray(srcStart, srcStart + srcW * 4), dstStart);
  }
  return { data: out, width: outW, height: outH };
}

function isolateTagBounds(rgba, w, h) {
  const isBrightPaper = (idx) => {
    const r = rgba[idx];
    const g = rgba[idx + 1];
    const b = rgba[idx + 2];
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;
    return (r > 165 && g > 155) || lum > 175;
  };

  const rowRatio = new Float32Array(h);
  for (let y = 0; y < h; y += 1) {
    let bright = 0;
    const rowOff = y * w * 4;
    for (let x = 0; x < w; x += 1) {
      if (isBrightPaper(rowOff + x * 4)) bright += 1;
    }
    rowRatio[y] = bright / w;
  }

  let ty0 = -1;
  let ty1 = -1;
  for (let y = 0; y < h; y += 1) {
    if (rowRatio[y] > 0.55) {
      if (ty0 === -1) ty0 = y;
      ty1 = y;
    }
  }

  if (ty0 === -1 || ty1 - ty0 < h * 0.25) {
    return { x0: 0, y0: 0, x1: w, y1: h };
  }

  const spanH = ty1 - ty0 + 1;
  const colRatio = new Float32Array(w);
  for (let x = 0; x < w; x += 1) {
    let bright = 0;
    for (let y = ty0; y <= ty1; y += 1) {
      if (isBrightPaper((y * w + x) * 4)) bright += 1;
    }
    colRatio[x] = bright / spanH;
  }

  let tx0 = -1;
  let tx1 = -1;
  for (let x = 0; x < w; x += 1) {
    if (colRatio[x] > 0.55) {
      if (tx0 === -1) tx0 = x;
      tx1 = x;
    }
  }

  if (tx0 === -1 || tx1 - tx0 < w * 0.25) {
    return { x0: 0, y0: 0, x1: w, y1: h };
  }

  const trimmedY = ty0 > 4 || ty1 < h - 5;
  const trimmedX = tx0 > 4 || tx1 < w - 5;
  const mx = trimmedX ? Math.round((tx1 - tx0) * 0.015) : 0;
  const my = trimmedY ? Math.round((ty1 - ty0) * 0.03) : 0;

  return {
    x0: Math.max(0, tx0 + mx),
    y0: Math.max(0, ty0 + my),
    x1: Math.min(w, tx1 + 1 - mx),
    y1: Math.min(h, ty1 + 1 - my),
  };
}

function findConnectedComponents(ink, nw, nh) {
  const total = nw * nh;
  const visited = new Uint8Array(total);
  const queue = new Int32Array(total);
  const comps = [];

  for (let sy = 0; sy < nh; sy += 1) {
    for (let sx = 0; sx < nw; sx += 1) {
      const startIdx = sy * nw + sx;
      if (!ink[startIdx] || visited[startIdx]) continue;

      let head = 0;
      let tail = 0;
      queue[tail++] = startIdx;
      visited[startIdx] = 1;

      let minX = sx;
      let maxX = sx;
      let minY = sy;
      let maxY = sy;
      let area = 0;

      while (head < tail) {
        const idx = queue[head++];
        const cx = idx % nw;
        const cy = (idx - cx) / nw;
        area += 1;
        if (cx < minX) minX = cx;
        if (cx > maxX) maxX = cx;
        if (cy < minY) minY = cy;
        if (cy > maxY) maxY = cy;

        if (cx + 1 < nw) {
          const n = idx + 1;
          if (ink[n] && !visited[n]) {
            visited[n] = 1;
            queue[tail++] = n;
          }
        }
        if (cx - 1 >= 0) {
          const n = idx - 1;
          if (ink[n] && !visited[n]) {
            visited[n] = 1;
            queue[tail++] = n;
          }
        }
        if (cy + 1 < nh) {
          const n = idx + nw;
          if (ink[n] && !visited[n]) {
            visited[n] = 1;
            queue[tail++] = n;
          }
        }
        if (cy - 1 >= 0) {
          const n = idx - nw;
          if (ink[n] && !visited[n]) {
            visited[n] = 1;
            queue[tail++] = n;
          }
        }
      }

      const w = maxX - minX + 1;
      const h = maxY - minY + 1;
      if (area >= 15 && h >= 10) {
        comps.push({ x0: minX, y0: minY, x1: maxX, y1: maxY, w, h, area });
      }
    }
  }

  return comps;
}

function selectTopTitleRow(comps, titleLimitY, nw, nh) {
  const candidates = comps.filter(
    (c) =>
      c.y1 <= titleLimitY &&
      c.h >= 12 &&
      c.h <= nh * 0.26 &&
      c.w >= 3 &&
      c.w <= nw * 0.25 &&
      c.x0 >= nw * 0.08
  );
  if (candidates.length === 0) return null;

  // Group components into horizontal text rows by vertical overlap
  const sorted = [...candidates].sort((a, b) => a.y0 - b.y0);
  const rows = [];

  for (const comp of sorted) {
    const cy = (comp.y0 + comp.y1) / 2;
    let targetRow = rows.find((r) => cy >= r.minY - 8 && cy <= r.maxY + 8);
    if (!targetRow) {
      targetRow = { items: [], minY: comp.y0, maxY: comp.y1, minX: comp.x0, maxX: comp.x1 };
      rows.push(targetRow);
    }
    targetRow.items.push(comp);
    if (comp.y0 < targetRow.minY) targetRow.minY = comp.y0;
    if (comp.y1 > targetRow.maxY) targetRow.maxY = comp.y1;
    if (comp.x0 < targetRow.minX) targetRow.minX = comp.x0;
    if (comp.x1 > targetRow.maxX) targetRow.maxX = comp.x1;
  }

  const validRows = rows.filter((r) => r.items.length >= 3 && r.maxX - r.minX >= nw * 0.18);
  if (validRows.length === 0) return null;

  // Pick top-most valid title row
  validRows.sort((a, b) => a.minY - b.minY);
  const topRow = validRows[0];

  return {
    x0: Math.max(0, topRow.minX - 10),
    y0: Math.max(0, topRow.minY - 8),
    x1: Math.min(nw, topRow.maxX + 10),
    y1: Math.min(nh, topRow.maxY + 8),
  };
}

export function analyzeAndBuildTagImages(rgba, width, height) {
  const bounds = isolateTagBounds(rgba, width, height);
  const isolated = cropRgba(rgba, width, bounds.x0, bounds.y0, bounds.x1, bounds.y1);

  let scale = 1;
  if (isolated.width > 1100) {
    scale = 1100 / isolated.width;
  } else if (isolated.width < 900) {
    scale = Math.min(2, 1050 / isolated.width);
  }

  const nw = Math.max(1, Math.round(isolated.width * scale));
  const nh = Math.max(1, Math.round(isolated.height * scale));
  const resized = resizeRgba(isolated.data, isolated.width, isolated.height, nw, nh);

  const lum = new Uint8Array(nw * nh);
  for (let i = 0, p = 0; i < resized.length; i += 4, p += 1) {
    lum[p] = Math.round(0.299 * resized[i] + 0.587 * resized[i + 1] + 0.114 * resized[i + 2]);
  }

  const stride = nw + 1;
  const integ = new Int32Array(stride * (nh + 1));
  for (let y = 0; y < nh; y += 1) {
    let rowSum = 0;
    for (let x = 0; x < nw; x += 1) {
      rowSum += lum[y * nw + x];
      integ[(y + 1) * stride + (x + 1)] = integ[y * stride + (x + 1)] + rowSum;
    }
  }

  const rad = Math.max(24, Math.round(nw * 0.04));
  const softData = new Uint8ClampedArray(nw * nh * 4);
  const ink = new Uint8Array(nw * nh);

  for (let y = 0; y < nh; y += 1) {
    const y0 = Math.max(0, y - rad);
    const y1 = Math.min(nh - 1, y + rad);
    for (let x = 0; x < nw; x += 1) {
      const x0 = Math.max(0, x - rad);
      const x1 = Math.min(nw - 1, x + rad);
      const cnt = (y1 - y0 + 1) * (x1 - x0 + 1);
      const tot =
        integ[(y1 + 1) * stride + (x1 + 1)] -
        integ[y0 * stride + (x1 + 1)] -
        integ[(y1 + 1) * stride + x0] +
        integ[y0 * stride + x0];
      const mean = tot / cnt;
      const p = y * nw + x;
      const val = lum[p];

      ink[p] = val < mean - 24 && val < 168 ? 1 : 0;

      const bg = Math.max(mean, 175);
      let norm = Math.min(255, Math.max(0, Math.round((val / bg) * 245)));
      if (norm > 185) norm = 255;

      const idx = p * 4;
      softData[idx] = norm;
      softData[idx + 1] = norm;
      softData[idx + 2] = norm;
      softData[idx + 3] = 255;
    }
  }

  const fullGray = padWhiteRgba(softData, nw, nh, 24, 24);
  const comps = findConnectedComponents(ink, nw, nh);

  const maxCh = comps.reduce((m, c) => Math.max(m, c.h), 0);
  const giant = comps.filter(
    (c) => c.h >= Math.max(nh * 0.25, maxCh * 0.6) && c.w >= 10 && c.y0 >= nh * 0.15
  );

  let priceGray = null;
  let gY0 = Math.round(nh * 0.4);
  if (giant.length >= 2) {
    const gx0 = Math.max(0, Math.min(...giant.map((c) => c.x0)) - 10);
    gY0 = Math.max(0, Math.min(...giant.map((c) => c.y0)) - 10);
    const gx1 = Math.min(nw, Math.max(...giant.map((c) => c.x1)) + 10);
    const gy1 = Math.min(nh, Math.max(...giant.map((c) => c.y1)) + 12);

    const rawPrice = cropRgba(softData, nw, gx0, gY0, gx1, gy1);
    const pScale = rawPrice.height > 75 ? 75 / rawPrice.height : 1;
    const pw = Math.max(1, Math.round(rawPrice.width * pScale));
    const ph = Math.max(1, Math.round(rawPrice.height * pScale));
    const scaledPrice = resizeRgba(rawPrice.data, rawPrice.width, rawPrice.height, pw, ph);
    priceGray = padWhiteRgba(scaledPrice, pw, ph, 36, 28);
  }

  let titleGray = null;
  const titleLimitY = giant.length >= 2 ? Math.max(Math.round(nh * 0.28), gY0 - 6) : Math.round(nh * 0.4);
  const titleBox = selectTopTitleRow(comps, titleLimitY, nw, nh);
  if (titleBox) {
    const rawTitle = cropRgba(softData, nw, titleBox.x0, titleBox.y0, titleBox.x1, titleBox.y1);
    const tw = Math.max(1, Math.round(rawTitle.width * 1.35));
    const th = rawTitle.height > 48 ? Math.round(rawTitle.height * 0.75) : rawTitle.height;
    const stretchedTitle = resizeRgba(rawTitle.data, rawTitle.width, rawTitle.height, tw, th);
    titleGray = padWhiteRgba(stretchedTitle, tw, th, 36, 28);
  }

  return {
    fullGray,
    titleGray,
    priceGray,
  };
}
