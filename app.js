/* ═══════════════════════════════════════════════════════════════
   Convertitore ASCII Art in PNG — Application Logic
   Rendering canvas, anteprima in tempo reale, download PNG
   ═══════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  /* ── DOM references ──────────────────────────── */
  const textarea        = document.getElementById('ascii-input');
  const fontSelect      = document.getElementById('font-family');
  const fontSizeSlider  = document.getElementById('font-size-slider');
  const fontSizeInput   = document.getElementById('font-size-input');
  const textColorInput  = document.getElementById('text-color');
  const textColorHex    = document.getElementById('text-color-hex');
  const bgColorInput    = document.getElementById('bg-color');
  const bgColorHex      = document.getElementById('bg-color-hex');
  const bgColorGroup    = document.getElementById('bg-color-group');
  const transparentCb   = document.getElementById('transparent-bg');
  const previewCanvas   = document.getElementById('preview-canvas');
  const previewCtx      = previewCanvas.getContext('2d');
  const previewEmpty    = document.getElementById('preview-empty');
  const downloadBtn     = document.getElementById('download-btn');

  /* ── State ───────────────────────────────────── */
  var state = {
    text:          '',
    fontFamily:    'Courier New',
    fontSize:      20,
    textColor:     '#1C1C28',
    bgColor:       '#FEFCF8',
    transparentBg: false
  };

  /* ── Debounce ────────────────────────────────── */
  var renderTimer = null;
  var RENDER_DELAY = 120; // ms

  function scheduleRender() {
    if (renderTimer) clearTimeout(renderTimer);
    renderTimer = setTimeout(render, RENDER_DELAY);
  }

  /* ── Font loading ────────────────────────────── */
  function ensureFont(family, size) {
    // For system fonts (Courier New), skip loading check
    if (family === 'Courier New' || family === 'Consolas' || family === 'Monaco') {
      return Promise.resolve();
    }
    try {
      return document.fonts.load(size + 'px ' + family).catch(function () {
        // Font may fail to load (offline, blocked); proceed with fallback
      });
    } catch (e) {
      return Promise.resolve();
    }
  }

  /* ── Canvas text measurement ─────────────────── */
  // Use a dedicated measuring canvas (reused)
  var measureCanvas = null;
  var measureCtx = null;

  function getMeasureCtx() {
    if (!measureCanvas) {
      measureCanvas = document.createElement('canvas');
      measureCtx = measureCanvas.getContext('2d');
    }
    return measureCtx;
  }

  /**
   * Measure all lines of text with the given canvas font string.
   * Returns { lines, widths[], maxWidth, lineHeight, charWidth }
   */
  function measureLines(text, font, fontSize) {
    var ctx = getMeasureCtx();
    ctx.font = font;

    var lines = text.split('\n');
    var widths = [];
    var maxWidth = 0;

    for (var i = 0; i < lines.length; i++) {
      var w = ctx.measureText(lines[i]).width;
      // Round up to avoid clipping
      w = Math.ceil(w);
      widths.push(w);
      if (w > maxWidth) maxWidth = w;
    }

    // Measure character cell width (monospace: all chars have same width)
    // Use 'W' as reference — in monospace fonts it has the same width as any other char
    var charWidth = ctx.measureText('W').width;

    var lineHeight = Math.round(fontSize * 1.45);

    return {
      lines: lines,
      widths: widths,
      maxWidth: maxWidth,
      lineHeight: lineHeight,
      charWidth: charWidth
    };
  }

  /* ── Render preview ──────────────────────────── */
  function render() {
    // Read current state from DOM
    state.text          = textarea.value;
    state.fontFamily    = fontSelect.value;
    state.fontSize      = parseInt(fontSizeSlider.value, 10);
    state.textColor     = textColorInput.value;
    state.bgColor       = bgColorInput.value;
    state.transparentBg = transparentCb.checked;

    var text = state.text;

    // Empty state
    if (!text.trim()) {
      previewCanvas.style.display = 'none';
      previewEmpty.style.display = 'flex';
      downloadBtn.disabled = true;
      return;
    }

    // Ensure font is available, then draw
    var fontStr = state.fontSize + 'px "' + state.fontFamily + '", monospace';

    ensureFont(state.fontFamily, state.fontSize).then(function () {
      var metrics = measureLines(text, fontStr, state.fontSize);
      drawPreview(metrics, fontStr);
    }).catch(function () {
      // If font loading fails, try drawing anyway
      var metrics = measureLines(text, fontStr, state.fontSize);
      drawPreview(metrics, fontStr);
    });
  }

  function drawPreview(metrics, fontStr) {
    var lines       = metrics.lines;
    var maxWidth    = metrics.maxWidth;
    var lineHeight  = metrics.lineHeight;
    var charWidth   = metrics.charWidth;

    var padding = Math.round(state.fontSize * 0.75);
    var canvasW = maxWidth + padding * 2;
    var canvasH = lines.length * lineHeight + padding * 2;

    // Minimum canvas size
    if (canvasW < 40) canvasW = 40;
    if (canvasH < 20) canvasH = 20;

    // Device pixel ratio for sharp rendering
    var dpr = window.devicePixelRatio || 1;

    previewCanvas.width  = canvasW * dpr;
    previewCanvas.height = canvasH * dpr;
    previewCanvas.style.width  = canvasW + 'px';
    previewCanvas.style.height = canvasH + 'px';

    previewCtx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // Clear
    previewCtx.clearRect(0, 0, canvasW, canvasH);

    // Background
    if (state.transparentBg) {
      drawCheckerboard(previewCtx, canvasW, canvasH, Math.max(8, state.fontSize * 0.5));
    } else {
      previewCtx.fillStyle = state.bgColor;
      previewCtx.fillRect(0, 0, canvasW, canvasH);
    }

    // Draw text
    previewCtx.fillStyle = state.textColor;
    previewCtx.font = fontStr;
    previewCtx.textBaseline = 'alphabetic';
    previewCtx.textRendering = 'optimizeLegibility';

    for (var i = 0; i < lines.length; i++) {
      // Position: baseline at padding + (i+1)*lineHeight, but centering text vertically within line
      var y = padding + (i + 1) * lineHeight - (lineHeight - state.fontSize) / 2;
      // Adjust for font descent
      y = Math.round(y);
      previewCtx.fillText(lines[i], padding, y);
    }

    // Draw dot-grid overlay (signature element)
    drawDotGrid(previewCtx, canvasW, canvasH, metrics, padding);

    // Show canvas, hide empty state
    previewCanvas.style.display = 'block';
    previewEmpty.style.display = 'none';
    downloadBtn.disabled = false;

    // Store render dimensions for download
    previewCanvas._renderWidth  = canvasW;
    previewCanvas._renderHeight = canvasH;
  }

  /* ── Checkerboard pattern (transparent preview) ── */
  function drawCheckerboard(ctx, w, h, size) {
    var cols = Math.ceil(w / size);
    var rows = Math.ceil(h / size);

    for (var y = 0; y < rows; y++) {
      for (var x = 0; x < cols; x++) {
        var isEven = (x + y) % 2 === 0;
        ctx.fillStyle = isEven ? '#F4F1EC' : '#E8E3DB';
        ctx.fillRect(x * size, y * size, size, size);
      }
    }
  }

  /* ── Dot grid overlay ────────────────────────── */
  function drawDotGrid(ctx, w, h, metrics, padding) {
    var charWidth  = metrics.charWidth;
    var lineHeight = metrics.lineHeight;
    var fontSize   = state.fontSize;

    // Dot radius proportional to font size, capped
    var dotRadius = Math.max(1, Math.min(2.5, fontSize / 14));

    // Use subtle color — more visible on transparent bg
    var dotAlpha = state.transparentBg ? 0.25 : 0.10;
    ctx.fillStyle = 'rgba(120, 113, 108, ' + dotAlpha + ')';

    var cols = Math.floor((w - padding * 2) / charWidth) + 1;
    var rows = Math.floor((h - padding * 2) / lineHeight) + 1;

    for (var row = 0; row < rows; row++) {
      for (var col = 0; col < cols; col++) {
        var x = padding + col * charWidth;
        var y = padding + row * lineHeight;
        ctx.beginPath();
        ctx.arc(x, y, dotRadius, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  /* ── Download PNG ────────────────────────────── */
  function downloadPNG() {
    var text = state.text;
    if (!text.trim()) return;

    var fontStr = state.fontSize + 'px "' + state.fontFamily + '", monospace';

    ensureFont(state.fontFamily, state.fontSize).then(function () {
      var metrics = measureLines(text, fontStr, state.fontSize);
      generateAndDownload(metrics, fontStr);
    }).catch(function () {
      var metrics = measureLines(text, fontStr, state.fontSize);
      generateAndDownload(metrics, fontStr);
    });
  }

  function generateAndDownload(metrics, fontStr) {
    var lines      = metrics.lines;
    var maxWidth   = metrics.maxWidth;
    var lineHeight = metrics.lineHeight;

    var padding = Math.round(state.fontSize * 0.75);
    var canvasW = maxWidth + padding * 2;
    var canvasH = lines.length * lineHeight + padding * 2;

    if (canvasW < 1) canvasW = 1;
    if (canvasH < 1) canvasH = 1;

    var canvas = document.createElement('canvas');
    canvas.width  = canvasW;
    canvas.height = canvasH;
    var ctx = canvas.getContext('2d');

    // Disable image smoothing for pixel-perfect text
    ctx.imageSmoothingEnabled = false;

    // Background
    if (!state.transparentBg) {
      ctx.fillStyle = state.bgColor;
      ctx.fillRect(0, 0, canvasW, canvasH);
    }
    // If transparent, we leave the canvas clear (alpha = 0)

    // Text
    ctx.fillStyle = state.textColor;
    ctx.font = fontStr;
    ctx.textBaseline = 'alphabetic';
    ctx.textRendering = 'optimizeLegibility';

    for (var i = 0; i < lines.length; i++) {
      var y = padding + (i + 1) * lineHeight - (lineHeight - state.fontSize) / 2;
      y = Math.round(y);
      ctx.fillText(lines[i], padding, y);
    }

    // Convert to blob and trigger download
    canvas.toBlob(function (blob) {
      if (!blob) {
        alert('Impossibile generare il PNG. Riprova con un browser più recente.');
        return;
      }

      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      a.download = 'ascii-art.png';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      // Clean up after a short delay
      setTimeout(function () {
        URL.revokeObjectURL(url);
      }, 200);
    }, 'image/png');
  }

  /* ── Event listeners ─────────────────────────── */

  // Textarea input
  textarea.addEventListener('input', function () {
    state.text = textarea.value;
    scheduleRender();
  });

  // Also handle paste event for immediate feedback
  textarea.addEventListener('paste', function () {
    // Let the paste complete, then render
    setTimeout(scheduleRender, 20);
  });

  // Font family
  fontSelect.addEventListener('change', function () {
    state.fontFamily = fontSelect.value;
    scheduleRender();
  });

  // Font size slider
  fontSizeSlider.addEventListener('input', function () {
    var val = parseInt(fontSizeSlider.value, 10);
    state.fontSize = val;
    fontSizeInput.value = val;
    scheduleRender();
  });

  // Font size number input
  fontSizeInput.addEventListener('input', function () {
    var val = parseInt(fontSizeInput.value, 10);
    if (isNaN(val)) return;
    val = Math.max(8, Math.min(96, val));
    state.fontSize = val;
    fontSizeSlider.value = val;
    fontSizeInput.value = val;
    scheduleRender();
  });

  fontSizeInput.addEventListener('change', function () {
    var val = parseInt(fontSizeInput.value, 10);
    if (isNaN(val) || val < 8) {
      fontSizeInput.value = 8;
      fontSizeSlider.value = 8;
      state.fontSize = 8;
    } else if (val > 96) {
      fontSizeInput.value = 96;
      fontSizeSlider.value = 96;
      state.fontSize = 96;
    }
    scheduleRender();
  });

  // Text color
  textColorInput.addEventListener('input', function () {
    state.textColor = textColorInput.value;
    textColorHex.textContent = textColorInput.value.toUpperCase();
    scheduleRender();
  });

  // Background color
  bgColorInput.addEventListener('input', function () {
    state.bgColor = bgColorInput.value;
    bgColorHex.textContent = bgColorInput.value.toUpperCase();
    if (!state.transparentBg) {
      scheduleRender();
    }
  });

  // Transparent background toggle
  transparentCb.addEventListener('change', function () {
    state.transparentBg = transparentCb.checked;
    // Disable bg color picker when transparent
    if (state.transparentBg) {
      bgColorGroup.style.opacity = '0.45';
      bgColorGroup.style.pointerEvents = 'none';
    } else {
      bgColorGroup.style.opacity = '1';
      bgColorGroup.style.pointerEvents = 'auto';
    }
    scheduleRender();
  });

  // Download button
  downloadBtn.addEventListener('click', function () {
    if (!state.text.trim()) return;
    downloadPNG();
  });

  /* ── Keyboard shortcut: Ctrl+Enter / Cmd+Enter ── */
  textarea.addEventListener('keydown', function (e) {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      if (state.text.trim()) {
        downloadPNG();
      }
    }
  });

  /* ── Initial state ───────────────────────────── */
  function initState() {
    state.text          = textarea.value;
    state.fontFamily    = fontSelect.value;
    state.fontSize      = parseInt(fontSizeSlider.value, 10);
    state.textColor     = textColorInput.value;
    state.bgColor       = bgColorInput.value;
    state.transparentBg = transparentCb.checked;

    textColorHex.textContent = state.textColor.toUpperCase();
    bgColorHex.textContent   = state.bgColor.toUpperCase();

    if (state.transparentBg) {
      bgColorGroup.style.opacity = '0.45';
      bgColorGroup.style.pointerEvents = 'none';
    }

    // Initial render (empty state)
    if (state.text.trim()) {
      scheduleRender();
    } else {
      previewCanvas.style.display = 'none';
      previewEmpty.style.display = 'flex';
      downloadBtn.disabled = true;
    }
  }

  /* ── Handle window resize (re-render for DPR changes) ── */
  var resizeTimer = null;
  window.addEventListener('resize', function () {
    if (resizeTimer) clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () {
      if (state.text.trim()) {
        render();
      }
    }, 200);
  });

  /* ── Boot ────────────────────────────────────── */
  initState();

  // Expose for testing
  window.__asciiToPng = {
    getState: function () { return state; },
    render: render,
    downloadPNG: downloadPNG,
    measureLines: measureLines,
    getMeasureCtx: getMeasureCtx
  };

})();
