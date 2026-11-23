import React, { useRef, useEffect, useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';
import {
  registerNativeOcrRunner,
  registerNativeTagDetector,
} from '../../src/services/labelOcr.native';

const OCR_HTML = `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <script src="https://cdn.jsdelivr.net/npm/tesseract.js@7/dist/tesseract.min.js"></script>
  </head>
  <body>
    <script>
      function post(payload) {
        if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
          window.ReactNativeWebView.postMessage(JSON.stringify(payload));
        }
      }

      function resizeRgba(src, srcW, srcH, dstW, dstH) {
        if (srcW === dstW && srcH === dstH) return new Uint8ClampedArray(src);
        var dst = new Uint8ClampedArray(dstW * dstH * 4);
        var sxR = srcW / dstW, syR = srcH / dstH;
        for (var y = 0; y < dstH; y++) {
          var sy = Math.min(srcH - 1, (y + 0.5) * syR - 0.5);
          var y0 = Math.max(0, Math.floor(sy)), y1 = Math.min(srcH - 1, y0 + 1), wy = sy - y0;
          for (var x = 0; x < dstW; x++) {
            var sx = Math.min(srcW - 1, (x + 0.5) * sxR - 0.5);
            var x0 = Math.max(0, Math.floor(sx)), x1 = Math.min(srcW - 1, x0 + 1), wx = sx - x0;
            var i00 = (y0 * srcW + x0) * 4, i10 = (y0 * srcW + x1) * 4;
            var i01 = (y1 * srcW + x0) * 4, i11 = (y1 * srcW + x1) * 4;
            var o = (y * dstW + x) * 4;
            for (var c = 0; c < 3; c++) {
              var top = src[i00 + c] * (1 - wx) + src[i10 + c] * wx;
              var bot = src[i01 + c] * (1 - wx) + src[i11 + c] * wx;
              dst[o + c] = Math.round(top * (1 - wy) + bot * wy);
            }
            dst[o + 3] = 255;
          }
        }
        return dst;
      }

      function cropRgba(src, srcW, x0, y0, x1, y1) {
        var cw = Math.max(1, x1 - x0), ch = Math.max(1, y1 - y0);
        var out = new Uint8ClampedArray(cw * ch * 4);
        for (var y = 0; y < ch; y++) {
          var s = ((y0 + y) * srcW + x0) * 4;
          out.set(src.subarray(s, s + cw * 4), y * cw * 4);
        }
        return { data: out, width: cw, height: ch };
      }

      function toPaddedCanvas(data, w, h, padX, padY) {
        var cw = w + padX * 2, ch = h + padY * 2;
        var canvas = document.createElement('canvas');
        canvas.width = cw;
        canvas.height = ch;
        var ctx = canvas.getContext('2d');
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, cw, ch);
        var imgData = new ImageData(new Uint8ClampedArray(data), w, h);
        ctx.putImageData(imgData, padX, padY);
        return canvas;
      }

      function preprocessTag(img) {
        var w = img.naturalWidth || img.width || 1000;
        var h = img.naturalHeight || img.height || 500;
        var sc = document.createElement('canvas');
        sc.width = w; sc.height = h;
        var sctx = sc.getContext('2d');
        sctx.drawImage(img, 0, 0, w, h);
        var rgba = sctx.getImageData(0, 0, w, h).data;

        function bright(idx) {
          var r = rgba[idx], g = rgba[idx+1], b = rgba[idx+2];
          return (r > 150 && g > 130) || (0.299*r + 0.587*g + 0.114*b > 165);
        }

        var ty0 = -1, ty1 = -1;
        for (var y = 0; y < h; y++) {
          var cnt = 0, ro = y * w * 4;
          for (var x = 0; x < w; x++) if (bright(ro + x * 4)) cnt++;
          if (cnt / w > 0.55) { if (ty0 === -1) ty0 = y; ty1 = y; }
        }
        if (ty0 === -1 || ty1 - ty0 < h * 0.25) { ty0 = 0; ty1 = h - 1; }

        var spanH = ty1 - ty0 + 1, tx0 = -1, tx1 = -1;
        for (var x = 0; x < w; x++) {
          var cnt = 0;
          for (var y = ty0; y <= ty1; y++) if (bright((y * w + x) * 4)) cnt++;
          if (cnt / spanH > 0.55) { if (tx0 === -1) tx0 = x; tx1 = x; }
        }
        if (tx0 === -1 || tx1 - tx0 < w * 0.25) { tx0 = 0; tx1 = w - 1; }

        // Preserva bordas em recortes rentes para não cortar caracteres nas extremidades
        var iso = cropRgba(rgba, w, Math.max(0, tx0), Math.max(0, ty0), Math.min(w, tx1+1), Math.min(h, ty1+1));

        var scale = iso.width > 1100 ? 1100 / iso.width : (iso.width < 1100 ? Math.min(2.2, 1100 / iso.width) : 1);
        var nw = Math.max(1, Math.round(iso.width * scale));
        var nh = Math.max(1, Math.round(iso.height * scale));
        var resized = resizeRgba(iso.data, iso.width, iso.height, nw, nh);

        var lum = new Uint8Array(nw * nh);
        var rawGray = new Uint8ClampedArray(nw * nh * 4);
        var minL = 255, maxL = 0;
        for (var i = 0, p = 0; i < resized.length; i += 4, p++) {
          var lv = Math.round(0.299 * resized[i] + 0.587 * resized[i+1] + 0.114 * resized[i+2]);
          lum[p] = lv;
          if (lv < minL) minL = lv;
          if (lv > maxL) maxL = lv;
        }
        var lSpan = Math.max(30, maxL - minL);
        for (var p = 0; p < lum.length; p++) {
          var stretched = Math.min(255, Math.max(0, Math.round(((lum[p] - minL) / lSpan) * 255)));
          var o = p * 4;
          rawGray[o] = stretched; rawGray[o+1] = stretched; rawGray[o+2] = stretched; rawGray[o+3] = 255;
        }

        var stride = nw + 1, integ = new Int32Array(stride * (nh + 1));
        for (var y = 0; y < nh; y++) {
          var rs = 0;
          for (var x = 0; x < nw; x++) {
            rs += lum[y * nw + x];
            integ[(y+1)*stride + (x+1)] = integ[y*stride + (x+1)] + rs;
          }
        }

        var rad = Math.max(24, Math.round(nw * 0.04));
        var soft = new Uint8ClampedArray(nw * nh * 4), ink = new Uint8Array(nw * nh);
        for (var y = 0; y < nh; y++) {
          var y0 = Math.max(0, y - rad), y1 = Math.min(nh - 1, y + rad);
          for (var x = 0; x < nw; x++) {
            var x0 = Math.max(0, x - rad), x1 = Math.min(nw - 1, x + rad);
            var cnt = (y1 - y0 + 1) * (x1 - x0 + 1);
            var tot = integ[(y1+1)*stride + (x1+1)] - integ[y0*stride + (x1+1)] - integ[(y1+1)*stride + x0] + integ[y0*stride + x0];
            var mean = tot / cnt, p = y * nw + x, val = lum[p];
            ink[p] = (val < mean - 22 && val < 170) ? 1 : 0;
            // Normalização adaptativa que limpa fundos amarelos mesmo sob sombra
            var norm = Math.min(255, Math.max(0, Math.round((val / Math.max(mean, 125)) * 245)));
            if (norm > 175) norm = 255;
            var o = p * 4;
            soft[o] = norm; soft[o+1] = norm; soft[o+2] = norm; soft[o+3] = 255;
          }
        }

        var visited = new Uint8Array(nw * nh), queue = new Int32Array(nw * nh), comps = [];
        for (var sy = 0; sy < nh; sy++) {
          for (var sx = 0; sx < nw; sx++) {
            var sIdx = sy * nw + sx;
            if (!ink[sIdx] || visited[sIdx]) continue;
            var head = 0, tail = 0;
            queue[tail++] = sIdx; visited[sIdx] = 1;
            var minX = sx, maxX = sx, minY = sy, maxY = sy, area = 0;
            while (head < tail) {
              var idx = queue[head++], cx = idx % nw, cy = (idx - cx) / nw;
              area++;
              if (cx < minX) minX = cx; if (cx > maxX) maxX = cx;
              if (cy < minY) minY = cy; if (cy > maxY) maxY = cy;
              if (cx+1 < nw && ink[idx+1] && !visited[idx+1]) { visited[idx+1]=1; queue[tail++]=idx+1; }
              if (cx-1 >= 0 && ink[idx-1] && !visited[idx-1]) { visited[idx-1]=1; queue[tail++]=idx-1; }
              if (cy+1 < nh && ink[idx+nw] && !visited[idx+nw]) { visited[idx+nw]=1; queue[tail++]=idx+nw; }
              if (cy-1 >= 0 && ink[idx-nw] && !visited[idx-nw]) { visited[idx-nw]=1; queue[tail++]=idx-nw; }
            }
            var cw = maxX - minX + 1, ch = maxY - minY + 1;
            if (area >= 15 && ch >= 10) comps.push({ x0: minX, y0: minY, x1: maxX, y1: maxY, w: cw, h: ch });
          }
        }

        var maxCh = 0;
        for (var i = 0; i < comps.length; i++) if (comps[i].h > maxCh) maxCh = comps[i].h;
        var giant = comps.filter(function (c) { return c.h >= Math.max(nh * 0.25, maxCh * 0.6) && c.w >= 10 && c.y0 >= nh * 0.15; });

        var priceCanvas = null, gY0 = Math.round(nh * 0.4);
        if (giant.length >= 2) {
          var gx0 = nw, gx1 = 0, gy1 = 0; gY0 = nh;
          for (var i = 0; i < giant.length; i++) {
            if (giant[i].x0 < gx0) gx0 = giant[i].x0;
            if (giant[i].y0 < gY0) gY0 = giant[i].y0;
            if (giant[i].x1 > gx1) gx1 = giant[i].x1;
            if (giant[i].y1 > gy1) gy1 = giant[i].y1;
          }
          gx0 = Math.max(0, gx0 - 10); gY0 = Math.max(0, gY0 - 10);
          gx1 = Math.min(nw, gx1 + 10); gy1 = Math.min(nh, gy1 + 12);
          var rp = cropRgba(soft, nw, gx0, gY0, gx1, gy1);
          var ps = rp.height > 75 ? 75 / rp.height : 1;
          var pw = Math.max(1, Math.round(rp.width * ps)), ph = Math.max(1, Math.round(rp.height * ps));
          priceCanvas = toPaddedCanvas(resizeRgba(rp.data, rp.width, rp.height, pw, ph), pw, ph, 36, 28);
        }

        var titleLimitY = giant.length >= 2 ? Math.max(Math.round(nh * 0.28), gY0 - 6) : Math.round(nh * 0.4);
        var leftStripCount = comps.filter(function (c) { return c.x1 < nw * 0.085 && c.y0 > titleLimitY && c.h < nh * 0.12; }).length;
        var minTitleX = leftStripCount >= 3 ? nw * 0.08 : 0;
        var tc = comps.filter(function (c) { return c.y1 <= titleLimitY && c.h >= 12 && c.h <= nh * 0.28 && c.w >= 3 && c.w <= nw * 0.35 && c.x0 >= minTitleX; });
        tc.sort(function (a, b) { return a.y0 - b.y0; });
        var rows = [];
        for (var i = 0; i < tc.length; i++) {
          var c = tc[i], cy = (c.y0 + c.y1) / 2, r = null;
          for (var j = 0; j < rows.length; j++) if (cy >= rows[j].minY - 8 && cy <= rows[j].maxY + 8) { r = rows[j]; break; }
          if (!r) { r = { items: [], minY: c.y0, maxY: c.y1, minX: c.x0, maxX: c.x1 }; rows.push(r); }
          r.items.push(c);
          if (c.y0 < r.minY) r.minY = c.y0; if (c.y1 > r.maxY) r.maxY = c.y1;
          if (c.x0 < r.minX) r.minX = c.x0; if (c.x1 > r.maxX) r.maxX = c.x1;
        }
        var vr = rows.filter(function (r) { return r.items.length >= 3 && (r.maxX - r.minX) >= nw * 0.18; });
        vr.sort(function (a, b) { return a.minY - b.minY; });
        var titleCanvas = null;
        if (vr.length > 0) {
          var tr = vr[0];
          var rt = cropRgba(soft, nw, Math.max(0, tr.minX - 10), Math.max(0, tr.minY - 8), Math.min(nw, tr.maxX + 10), Math.min(nh, tr.maxY + 8));
          var tw = Math.max(1, Math.round(rt.width * 1.35));
          var th = rt.height > 48 ? Math.round(rt.height * 0.75) : rt.height;
          titleCanvas = toPaddedCanvas(resizeRgba(rt.data, rt.width, rt.height, tw, th), tw, th, 36, 28);
        }

        return {
          fullCanvas: toPaddedCanvas(soft, nw, nh, 48, 48),
          rawPaddedCanvas: toPaddedCanvas(rawGray, nw, nh, 48, 48),
          titleCanvas: titleCanvas,
          priceCanvas: priceCanvas
        };
      }

      async function handleImage(dataUri, requestId) {
        var worker = null;
        try {
          if (!window.Tesseract) {
            post({ type: 'result', requestId: requestId, data: null });
            return;
          }
          var img = new Image();
          img.onload = async function () {
            try {
              var prep = preprocessTag(img);
              worker = await window.Tesseract.createWorker('por', 1, {
                logger: function (m) {
                  if (m && m.status === 'recognizing text') {
                    post({ type: 'progress', requestId: requestId, progress: m.progress || 0 });
                  }
                }
              }, { load_system_dawg: '0', load_freq_dawg: '0' });
              function extractFromTesseractData(tData) {
                var outLines = [], outWords = [];
                var tBlocks = (tData && tData.blocks) ? tData.blocks : [];
                function toFrame(b) {
                  if (!b) return null;
                  var left = Number(b.x0) || 0;
                  var top = Number(b.y0) || 0;
                  var width = Math.max(0, (Number(b.x1) || 0) - left);
                  var height = Math.max(0, (Number(b.y1) || 0) - top);
                  return { top: top, left: left, width: width, height: height };
                }
                for (var bi = 0; bi < tBlocks.length; bi++) {
                  var paras = tBlocks[bi].paragraphs || [];
                  for (var pi = 0; pi < paras.length; pi++) {
                    var ls = paras[pi].lines || [];
                    for (var li = 0; li < ls.length; li++) {
                      var ws = ls[li].words || [];
                      var lineWords = [];
                      for (var wi = 0; wi < ws.length; wi++) {
                        var wObj = {
                          text: ws[wi].text || '',
                          bbox: ws[wi].bbox || null,
                          frame: toFrame(ws[wi].bbox)
                        };
                        lineWords.push(wObj);
                        outWords.push(wObj);
                      }
                      outLines.push({
                        text: ls[li].text || '',
                        bbox: ls[li].bbox || null,
                        frame: toFrame(ls[li].bbox),
                        words: lineWords
                      });
                    }
                  }
                }
                return {
                  text: (tData && tData.text) ? tData.text : '',
                  lines: outLines,
                  words: outWords
                };
              }

              await worker.setParameters({ tessedit_pageseg_mode: window.Tesseract.PSM.AUTO });
              var res = await worker.recognize(prep.fullCanvas, {}, { blocks: true, text: true });
              var primary = extractFromTesseractData(res && res.data ? res.data : {});

              // Fallback automático para etiquetas amarelas/recortadas rentes que retornaram pouco texto ou sem preço
              var primaryNonEmptyLines = primary.lines.filter(function (l) {
                return String(l.text || '').trim().length >= 2;
              });
              var primaryHasPrice = /\\d{1,4}\\s*[,.]\\s*\\d{2}/.test(primary.text);
              if (prep.rawPaddedCanvas && (!primaryHasPrice || primaryNonEmptyLines.length < 2)) {
                var fbRes = await worker.recognize(prep.rawPaddedCanvas, {}, { blocks: true, text: true });
                var fallback = extractFromTesseractData(fbRes && fbRes.data ? fbRes.data : {});
                var fbHasPrice = /\\d{1,4}\\s*[,.]\\s*\\d{2}/.test(fallback.text);
                var fbNonEmptyLines = fallback.lines.filter(function (l) {
                  return String(l.text || '').trim().length >= 2;
                });
                if ((fbHasPrice && !primaryHasPrice) || fbNonEmptyLines.length > primaryNonEmptyLines.length) {
                  primary = fallback;
                }
              }

              var lines = primary.lines;
              var words = primary.words;
              var data = { text: primary.text };

              var titleText = '', giantPriceText = '';
              if (prep.titleCanvas) {
                await worker.setParameters({ tessedit_pageseg_mode: window.Tesseract.PSM.SINGLE_LINE });
                var tr = await worker.recognize(prep.titleCanvas);
                titleText = tr && tr.data ? (tr.data.text || '') : '';
              }
              if (prep.priceCanvas) {
                await worker.setParameters({ tessedit_pageseg_mode: window.Tesseract.PSM.SINGLE_LINE });
                var pr = await worker.recognize(prep.priceCanvas);
                giantPriceText = pr && pr.data ? (pr.data.text || '') : '';
              }

              post({
                type: 'result',
                requestId: requestId,
                data: {
                  text: data.text || '',
                  lines: lines,
                  words: words,
                  elements: words,
                  imageWidth: prep.fullCanvas.width,
                  imageHeight: prep.fullCanvas.height,
                  titleText: titleText,
                  giantPriceText: giantPriceText
                }
              });
            } catch (err) {
              post({ type: 'result', requestId: requestId, data: null });
            } finally {
              if (worker) worker.terminate().catch(function(){});
            }
          };
          img.onerror = function () {
            post({ type: 'result', requestId: requestId, data: null });
          };
          img.src = dataUri;
        } catch (e) {
          post({ type: 'result', requestId: requestId, data: null });
        }
      }

      function detectShelfTagBounds(dataUri, requestId) {
        try {
          var img = new Image();
          img.onload = function () {
            try {
              var natW = img.naturalWidth || img.width || 0;
              var natH = img.naturalHeight || img.height || 0;
              if (natW < 40 || natH < 40) {
                post({ type: 'bounds', requestId: requestId, data: null });
                return;
              }
              var scale = natW > 360 ? 360 / natW : 1;
              var w = Math.max(40, Math.round(natW * scale));
              var h = Math.max(40, Math.round(natH * scale));
              var canvas = document.createElement('canvas');
              canvas.width = w;
              canvas.height = h;
              var ctx = canvas.getContext('2d');
              ctx.drawImage(img, 0, 0, w, h);
              var rgba = ctx.getImageData(0, 0, w, h).data;

              // Detecta pixels típicos de etiqueta (papel branco ou amarelo vivo) e texto escuro interno
              var mask = new Uint8Array(w * h);
              var lum = new Uint8Array(w * h);
              for (var i = 0, p = 0; i < rgba.length; i += 4, p++) {
                var r = rgba[i], g = rgba[i + 1], b = rgba[i + 2];
                var l = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
                lum[p] = l;
                var isYellowTag = r > 150 && g > 125 && (r - b) > 45;
                var isWhiteTag = l > 170 && Math.max(r, g, b) - Math.min(r, g, b) < 42;
                mask[p] = (isYellowTag || isWhiteTag) ? 1 : 0;
              }

              // Ignora 4% extremos das bordas para evitar ruído periférico
              var bx0 = Math.round(w * 0.04), bx1 = Math.round(w * 0.96);
              var by0 = Math.round(h * 0.06), by1 = Math.round(h * 0.94);

              // Encontra linhas e colunas com concentração de etiqueta + contraste de tinta (texto/preço)
              var rowTag = new Float32Array(h);
              var rowInk = new Float32Array(h);
              for (var y = by0; y < by1; y++) {
                var tCnt = 0, iCnt = 0;
                for (var x = bx0; x < bx1; x++) {
                  var idx = y * w + x;
                  if (mask[idx]) tCnt++;
                  if (x > bx0 && Math.abs(lum[idx] - lum[idx - 1]) > 35) iCnt++;
                }
                var span = Math.max(1, bx1 - bx0);
                rowTag[y] = tCnt / span;
                rowInk[y] = iCnt / span;
              }

              // Busca melhor faixa vertical contígua (etiqueta geralmente ocupa 14% a 65% da altura)
              var bestScore = 0, bestY0 = -1, bestY1 = -1;
              var curY0 = -1;
              for (var y = by0; y <= by1; y++) {
                var active = y < by1 && rowTag[y] > 0.24 && (rowInk[y] > 0.02 || rowTag[y] > 0.45);
                if (active && curY0 === -1) curY0 = y;
                if (!active && curY0 !== -1) {
                  var segH = y - curY0;
                  if (segH >= h * 0.10) {
                    var sumScore = 0;
                    for (var k = curY0; k < y; k++) {
                      // Leve preferência pela região central onde o usuário aponta a câmera
                      var centerWeight = 1.15 - Math.abs((k / h) - 0.5);
                      sumScore += (rowTag[k] + rowInk[k] * 2.5) * centerWeight;
                    }
                    if (sumScore > bestScore) {
                      bestScore = sumScore;
                      bestY0 = curY0;
                      bestY1 = y - 1;
                    }
                  }
                  curY0 = -1;
                }
              }

              if (bestY0 === -1 || bestY1 - bestY0 < h * 0.10) {
                post({ type: 'bounds', requestId: requestId, data: null });
                return;
              }

              // Refina limites horizontais dentro da faixa vertical detectada
              var segSpanH = Math.max(1, bestY1 - bestY0 + 1);
              var bestX0 = -1, bestX1 = -1;
              for (var x = bx0; x < bx1; x++) {
                var cCnt = 0;
                for (var y = bestY0; y <= bestY1; y++) {
                  if (mask[y * w + x]) cCnt++;
                }
                if (cCnt / segSpanH > 0.30) {
                  if (bestX0 === -1) bestX0 = x;
                  bestX1 = x;
                }
              }

              if (bestX0 === -1 || bestX1 - bestX0 < w * 0.22) {
                post({ type: 'bounds', requestId: requestId, data: null });
                return;
              }

              // Aplica margem confortável (~11% horizontal e ~12% vertical) para não cortar texto nem preço
              var rawW = bestX1 - bestX0 + 1;
              var rawH = bestY1 - bestY0 + 1;
              var padX = Math.round(rawW * 0.11);
              var padY = Math.round(rawH * 0.12);
              var fx0 = Math.max(0, bestX0 - padX);
              var fy0 = Math.max(0, bestY0 - padY);
              var fx1 = Math.min(w, bestX1 + 1 + padX);
              var fy1 = Math.min(h, bestY1 + 1 + padY);

              var normW = (fx1 - fx0) / w;
              var normH = (fy1 - fy0) / h;
              // Se cobrir quase a imagem inteira (>92% em ambos), usa fallback padrão
              if (normW > 0.94 && normH > 0.90) {
                post({ type: 'bounds', requestId: requestId, data: null });
                return;
              }

              post({
                type: 'bounds',
                requestId: requestId,
                data: {
                  x: fx0 / w,
                  y: fy0 / h,
                  width: normW,
                  height: normH
                }
              });
            } catch (err) {
              post({ type: 'bounds', requestId: requestId, data: null });
            }
          };
          img.onerror = function () {
            post({ type: 'bounds', requestId: requestId, data: null });
          };
          img.src = dataUri;
        } catch (e) {
          post({ type: 'bounds', requestId: requestId, data: null });
        }
      }

      window.__runLabelOcr = handleImage;
      window.__detectShelfTagBounds = detectShelfTagBounds;
    </script>
  </body>
</html>`;

export default function NativeOcrBridge() {
  const webViewRef = useRef(null);
  const resolverRef = useRef(null);
  const progressRef = useRef(null);
  const timeoutRef = useRef(null);
  const boundsResolverRef = useRef(null);
  const boundsTimeoutRef = useRef(null);

  const runOcr = useCallback((dataUri, onProgress) => {
    return new Promise((resolve) => {
      if (!webViewRef.current || !dataUri) {
        resolve(null);
        return;
      }

      const requestId = String(Date.now());
      resolverRef.current = resolve;
      progressRef.current = onProgress || null;

      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
        if (resolverRef.current) {
          const r = resolverRef.current;
          resolverRef.current = null;
          r(null);
        }
      }, 25000);

      const safeData = JSON.stringify(dataUri);
      const safeId = JSON.stringify(requestId);
      webViewRef.current.injectJavaScript(
        `window.__runLabelOcr && window.__runLabelOcr(${safeData}, ${safeId}); true;`
      );
    });
  }, []);

  const detectBounds = useCallback((dataUri) => {
    return new Promise((resolve) => {
      if (!webViewRef.current || !dataUri) {
        resolve(null);
        return;
      }

      const requestId = `b_${Date.now()}`;
      boundsResolverRef.current = resolve;

      if (boundsTimeoutRef.current) clearTimeout(boundsTimeoutRef.current);
      boundsTimeoutRef.current = setTimeout(() => {
        if (boundsResolverRef.current) {
          const r = boundsResolverRef.current;
          boundsResolverRef.current = null;
          r(null);
        }
      }, 1500);

      const safeData = JSON.stringify(dataUri);
      const safeId = JSON.stringify(requestId);
      webViewRef.current.injectJavaScript(
        `window.__detectShelfTagBounds && window.__detectShelfTagBounds(${safeData}, ${safeId}); true;`
      );
    });
  }, []);

  useEffect(() => {
    const unregisterOcr = registerNativeOcrRunner(runOcr);
    const unregisterDetector = registerNativeTagDetector(detectBounds);
    return () => {
      unregisterOcr();
      unregisterDetector();
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (boundsTimeoutRef.current) clearTimeout(boundsTimeoutRef.current);
    };
  }, [runOcr, detectBounds]);

  const handleMessage = (event) => {
    try {
      const payload = JSON.parse(event.nativeEvent.data);
      if (payload.type === 'progress' && progressRef.current) {
        progressRef.current(payload.progress);
      } else if (payload.type === 'result' && resolverRef.current) {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        const r = resolverRef.current;
        resolverRef.current = null;
        r(payload.data || null);
      } else if (payload.type === 'bounds' && boundsResolverRef.current) {
        if (boundsTimeoutRef.current) clearTimeout(boundsTimeoutRef.current);
        const r = boundsResolverRef.current;
        boundsResolverRef.current = null;
        r(payload.data || null);
      }
    } catch {
      if (resolverRef.current) {
        const r = resolverRef.current;
        resolverRef.current = null;
        r(null);
      }
      if (boundsResolverRef.current) {
        const r = boundsResolverRef.current;
        boundsResolverRef.current = null;
        r(null);
      }
    }
  };

  return (
    <View style={styles.hidden} pointerEvents="none">
      <WebView
        ref={webViewRef}
        originWhitelist={['*']}
        source={{ html: OCR_HTML }}
        javaScriptEnabled={true}
        onMessage={handleMessage}
        onError={() => {
          if (resolverRef.current) {
            const r = resolverRef.current;
            resolverRef.current = null;
            r(null);
          }
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  hidden: {
    width: 1,
    height: 1,
    opacity: 0,
    position: 'absolute',
    left: -9999,
    top: -9999,
  },
});
