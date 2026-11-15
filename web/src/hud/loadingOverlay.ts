import "./loadingOverlay.css";

export type LoadingTone = "normal" | "warn" | "error";
export type LoadingActionVariant = "cancel" | "retry";

export interface LoadingStatusOptions {
  phase?: string;
  tone?: LoadingTone;
  /** Progress percentage in [0, 100]; omit for animated indeterminate sweep. */
  progress?: number;
}

export interface LoadingOverlayHandle {
  readonly root: HTMLDivElement;
  setStatus(message: string, options?: LoadingStatusOptions): void;
  setAction(button: HTMLButtonElement | null, variant?: LoadingActionVariant): void;
  destroy(immediate?: boolean): void;
  remove(): void;
}

interface Rgb {
  r: number;
  g: number;
  b: number;
}

interface GlitchCell {
  c: number;
  r: number;
  x: number;
  y: number;
  ch: string;
  visible: boolean;
  energy: number;
  tint: Rgb;
  phase: number;
}

interface RainStream {
  headRow: number;
  speedRowsPerSec: number;
  trailLength: number;
  tint: Rgb;
}

const TELEMETRY_SYMBOLS = "0123456789ABCDEF+-*/:=[]<>#·";
const GLITCH_COLORS = ["#ff8a5b", "#7df9ff", "#ffb36b", "#f3ece3"];

function parseHexToRgb(hex: string): Rgb {
  const clean = hex.replace("#", "").trim();
  const full =
    clean.length === 3
      ? clean
          .split("")
          .map((ch) => ch + ch)
          .join("")
      : clean.padEnd(6, "f");
  const num = Number.parseInt(full.slice(0, 6), 16);
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
}

function inferStatusMeta(message: string): {
  phase: string;
  tone: LoadingTone;
  progress?: number;
} {
  const lower = message.toLowerCase();
  const pctMatch = message.match(/(\d+(?:\.\d+)?)\s*%/);
  const parsedPct = pctMatch ? Number.parseFloat(pctMatch[1]) : undefined;

  if (lower.includes("cancelled")) {
    return { phase: "DOWNLINK INTERRUPTED · STANDBY", tone: "warn", progress: 0 };
  }
  if (lower.includes("unavailable") || lower.includes("error") || lower.includes("failed")) {
    return { phase: "TELEMETRY FAULT · LINK RETRY READY", tone: "error", progress: 0 };
  }
  if (lower.includes("hirise") || lower.includes("orthoimage")) {
    return { phase: "OPTICAL ORTHOIMAGE · PASS 02/03", tone: "normal", progress: parsedPct ?? 72 };
  }
  if (lower.includes("raster") || lower.includes("dan")) {
    return { phase: "SCIENTIFIC RASTERS & DAN · PASS 03/03", tone: "normal", progress: parsedPct ?? 90 };
  }
  return {
    phase: "DEM TERRAIN STREAM · PASS 01/03",
    tone: "normal",
    progress: parsedPct,
  };
}

function renderColoredMessage(container: HTMLElement, message: string, tone: LoadingTone): void {
  container.replaceChildren();
  const tokenRe = /(\d+(?:\.\d+)?%|\b\d+(?:\.\d+)?(?:\s*(?:MB|KB|GB|m|px|x\d+))?\b|HiRISE|Gale\s+Crater|DEM|MSL|DAN|orthoimage|rasters?|terrain|cancelled|unavailable)/gi;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = tokenRe.exec(message)) !== null) {
    if (match.index > lastIndex) {
      const plain = document.createElement("span");
      plain.className = "th-boot-tok-base";
      plain.textContent = message.slice(lastIndex, match.index);
      container.append(plain);
    }

    const tokenText = match[0];
    const span = document.createElement("span");
    const lower = tokenText.toLowerCase();
    if (lower === "cancelled" || lower === "unavailable") {
      span.className = tone === "error" ? "th-boot-tok-error" : "th-boot-tok-mars";
    } else if (/^\d/.test(tokenText)) {
      span.className = "th-boot-tok-cyan";
    } else {
      span.className = "th-boot-tok-mars";
    }
    span.textContent = tokenText;
    container.append(span);
    lastIndex = tokenRe.lastIndex;
  }

  if (lastIndex < message.length) {
    const tail = document.createElement("span");
    tail.className = tone === "error" ? "th-boot-tok-error" : "th-boot-tok-base";
    tail.textContent = message.slice(lastIndex);
    container.append(tail);
  }

  if (!container.childNodes.length) {
    const fallback = document.createElement("span");
    fallback.className = "th-boot-tok-base";
    fallback.textContent = message;
    container.append(fallback);
  }
}

export function createLoadingOverlay(parent: HTMLElement = document.body): LoadingOverlayHandle {
  const root = document.createElement("div");
  root.className = "th-boot-overlay";
  root.setAttribute("role", "status");
  root.setAttribute("aria-live", "polite");

  // Layer 0: Spinning Mars globe
  const marsStage = document.createElement("div");
  marsStage.className = "th-boot-mars-stage";
  marsStage.setAttribute("aria-hidden", "true");
  const marsSphere = document.createElement("div");
  marsSphere.className = "th-boot-mars-sphere";
  marsStage.append(marsSphere);

  // Layer 1: Fullscreen blur & crimson/navy cosmos tint
  const backdrop = document.createElement("div");
  backdrop.className = "th-boot-backdrop";
  backdrop.setAttribute("aria-hidden", "true");

  // Layer 2: Falling telemetry numbers / LetterGlitch canvas
  const glitchCanvas = document.createElement("canvas");
  glitchCanvas.className = "th-boot-glitch-canvas";
  glitchCanvas.setAttribute("aria-hidden", "true");

  // Layer 3: Frosted glass modal card
  const modalWrap = document.createElement("div");
  modalWrap.className = "th-boot-modal-wrap";

  const card = document.createElement("div");
  card.className = "th-boot-card";

  const emblem = document.createElement("div");
  emblem.className = "th-boot-emblem";
  const spinner = document.createElement("div");
  spinner.className = "th-boot-spinner";
  const spinnerInner = document.createElement("div");
  spinnerInner.className = "th-boot-spinner-inner";
  const logoFrame = document.createElement("div");
  logoFrame.className = "th-boot-logo-frame";
  const logoImg = document.createElement("img");
  logoImg.className = "th-boot-logo";
  logoImg.src = "/images/tango-horizon-mars-exploration-logo.jpeg";
  logoImg.alt = "Tango Horizon Mars Exploration";
  logoFrame.append(logoImg);
  emblem.append(spinner, spinnerInner, logoFrame);

  const eyebrow = document.createElement("div");
  eyebrow.className = "th-boot-eyebrow";
  const eyebrowDot = document.createElement("span");
  eyebrowDot.className = "th-boot-eyebrow-dot";
  const eyebrowText = document.createElement("span");
  eyebrowText.textContent = "SOLAR CONJUNCTION DOWNLINK // GALE CRATER";
  eyebrow.append(eyebrowDot, eyebrowText);

  const title = document.createElement("h1");
  title.className = "th-boot-title";
  title.textContent = "TANGO HORIZON · GALE CRATER TELEMETRY LINK";

  const phaseEl = document.createElement("div");
  phaseEl.className = "th-boot-phase";
  phaseEl.textContent = "DEM TERRAIN STREAM · PASS 01/03";

  const statusEl = document.createElement("div");
  statusEl.className = "th-boot-status";

  const progressTrack = document.createElement("div");
  progressTrack.className = "th-boot-progress-track th-boot-progress-track--indeterminate";
  const progressFill = document.createElement("div");
  progressFill.className = "th-boot-progress-fill";
  progressTrack.append(progressFill);

  const actionsEl = document.createElement("div");
  actionsEl.className = "th-boot-actions";

  const footer = document.createElement("div");
  footer.className = "th-boot-footer";
  const footerLeft = document.createElement("span");
  footerLeft.textContent = "HIRISE 2048×2048 DEM · MSL DAN";
  const footerRight = document.createElement("span");
  footerRight.className = "th-boot-footer-accent";
  footerRight.textContent = "4.59°S 137.44°E";
  footer.append(footerLeft, footerRight);

  card.append(emblem, eyebrow, title, phaseEl, statusEl, progressTrack, actionsEl, footer);
  modalWrap.append(card);
  root.append(marsStage, backdrop, glitchCanvas, modalWrap);
  parent.append(root);

  // Setup falling telemetry numbers + LetterGlitch canvas animation
  const ctx = glitchCanvas.getContext("2d");
  const palette = GLITCH_COLORS.map(parseHexToRgb);
  const baseRgb = parseHexToRgb("#f3ece3");
  const fontSize = 14;
  const baseOpacity = 0.085;
  const cursorRadius = 140;
  const mouse = { x: -9999, y: -9999, active: false };

  let width = 0;
  let height = 0;
  let cols = 0;
  let rows = 0;
  let cellW = 14;
  let cellH = 20;
  let cells: GlitchCell[] = [];
  let streams: RainStream[] = [];
  let animId = 0;
  let destroyed = false;
  let cleanupTimer = 0;

  const pickSymbol = () => TELEMETRY_SYMBOLS[(Math.random() * TELEMETRY_SYMBOLS.length) | 0];
  const pickColor = () => palette[(Math.random() * palette.length) | 0];

  const rebuildGrid = () => {
    if (!ctx || destroyed) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = Math.max(1, root.clientWidth || window.innerWidth);
    height = Math.max(1, root.clientHeight || window.innerHeight);
    glitchCanvas.width = Math.round(width * dpr);
    glitchCanvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    cellW = Math.max(12, Math.round(fontSize * 1.05));
    cellH = Math.max(16, Math.round(fontSize * 1.45));
    cols = Math.max(1, Math.ceil(width / cellW));
    rows = Math.max(1, Math.ceil(height / cellH));

    cells = Array.from({ length: cols * rows }, (_, idx) => {
      const c = idx % cols;
      const r = Math.floor(idx / cols);
      return {
        c,
        r,
        x: c * cellW + cellW * 0.5,
        y: r * cellH + cellH * 0.5,
        ch: pickSymbol(),
        visible: Math.random() < 0.78,
        energy: Math.random() * 0.5,
        tint: pickColor(),
        phase: Math.random() * Math.PI * 2,
      };
    });

    streams = Array.from({ length: cols }, () => ({
      headRow: -Math.random() * rows,
      speedRowsPerSec: 3.5 + Math.random() * 8.5,
      trailLength: 5 + Math.floor(Math.random() * 9),
      tint: pickColor(),
    }));
  };

  const onMove = (e: PointerEvent) => {
    const rect = root.getBoundingClientRect();
    mouse.x = e.clientX - rect.left;
    mouse.y = e.clientY - rect.top;
    mouse.active = mouse.x >= 0 && mouse.y >= 0 && mouse.x <= rect.width && mouse.y <= rect.height;
  };

  if (ctx) {
    rebuildGrid();
    window.addEventListener("resize", rebuildGrid);
    window.addEventListener("pointermove", onMove, { passive: true });

    const startClock = performance.now();
    let prev = startClock;

    const render = (now: number) => {
      if (destroyed) return;
      const dt = Math.min(0.05, Math.max(0.001, (now - prev) / 1000));
      prev = now;
      const elapsed = (now - startClock) / 1000;

      ctx.clearRect(0, 0, width, height);
      ctx.font = `500 ${fontSize}px "IBM Plex Mono", ui-monospace, SFMono-Regular, Menlo, Consolas, monospace`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      // Advance falling telemetry rain streams
      for (let c = 0; c < cols; c++) {
        const stream = streams[c];
        const prevRow = Math.floor(stream.headRow);
        stream.headRow += stream.speedRowsPerSec * dt;
        const nextRow = Math.floor(stream.headRow);

        if (nextRow !== prevRow && nextRow >= 0 && nextRow < rows) {
          const headCell = cells[nextRow * cols + c];
          if (headCell) {
            headCell.ch = pickSymbol();
            headCell.tint = stream.tint;
            headCell.energy = 0.92;
            headCell.visible = true;
          }
        }

        if (stream.headRow - stream.trailLength > rows) {
          stream.headRow = -Math.random() * 6;
          stream.speedRowsPerSec = 3.5 + Math.random() * 8.5;
          stream.trailLength = 5 + Math.floor(Math.random() * 9);
          stream.tint = pickColor();
        }
      }

      // Random LetterGlitch sparks
      const sparkCount = Math.max(1, Math.floor(cells.length * 0.009));
      for (let s = 0; s < sparkCount; s++) {
        const target = cells[(Math.random() * cells.length) | 0];
        if (target) {
          target.ch = pickSymbol();
          target.energy = Math.max(target.energy, 0.45 + Math.random() * 0.45);
          target.tint = pickColor();
        }
      }

      const decay = Math.exp(-dt * 2.9);

      for (let i = 0; i < cells.length; i++) {
        const cell = cells[i];
        if (!cell.visible && cell.energy < 0.04) continue;

        if (mouse.active) {
          const dist = Math.hypot(cell.x - mouse.x, cell.y - mouse.y);
          if (dist < cursorRadius) {
            const boost = (1 - dist / cursorRadius) ** 2;
            if (Math.random() < boost * 0.22) {
              cell.ch = pickSymbol();
              cell.tint = pickColor();
              cell.energy = Math.max(cell.energy, boost * 0.95);
            }
          }
        }

        const stream = streams[cell.c];
        const trailDelta = stream.headRow - cell.r;
        let rainBoost = 0;
        if (trailDelta >= 0 && trailDelta <= stream.trailLength) {
          rainBoost = (1 - trailDelta / stream.trailLength) * 0.58;
        }

        const wave = 0.65 + 0.35 * Math.sin(elapsed * 1.4 + cell.c * 0.18 + cell.r * 0.14 + cell.phase);
        let alpha = baseOpacity * wave;
        let r = baseRgb.r;
        let g = baseRgb.g;
        let b = baseRgb.b;

        const combinedEnergy = Math.max(cell.energy, rainBoost);
        if (combinedEnergy > 0.02) {
          const e = Math.min(1, combinedEnergy);
          const tint = rainBoost > cell.energy ? stream.tint : cell.tint;
          r = Math.round(baseRgb.r * (1 - e) + tint.r * e);
          g = Math.round(baseRgb.g * (1 - e) + tint.g * e);
          b = Math.round(baseRgb.b * (1 - e) + tint.b * e);
          alpha = Math.min(0.86, alpha + e * 0.64);
        }

        cell.energy = cell.energy > 0.02 ? cell.energy * decay : 0;

        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha.toFixed(3)})`;
        ctx.fillText(cell.ch, cell.x, cell.y);
      }

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
  }

  const setStatus = (message: string, options?: LoadingStatusOptions): void => {
    const inferred = inferStatusMeta(message);
    const tone = options?.tone ?? inferred.tone;
    const phase = options?.phase ?? inferred.phase;
    const progress = options?.progress ?? inferred.progress;

    phaseEl.textContent = phase;
    statusEl.classList.remove("th-boot-status--warn", "th-boot-status--error");
    if (tone === "warn") statusEl.classList.add("th-boot-status--warn");
    if (tone === "error") statusEl.classList.add("th-boot-status--error");

    renderColoredMessage(statusEl, message, tone);

    if (typeof progress === "number" && Number.isFinite(progress)) {
      progressTrack.classList.remove("th-boot-progress-track--indeterminate");
      const clamped = Math.max(0, Math.min(100, progress));
      progressFill.style.width = `${clamped}%`;
    } else {
      progressTrack.classList.add("th-boot-progress-track--indeterminate");
      progressFill.style.width = "";
    }
  };

  const setAction = (button: HTMLButtonElement | null, variant: LoadingActionVariant = "cancel"): void => {
    if (!button) {
      actionsEl.replaceChildren();
      return;
    }
    button.classList.add("th-boot-btn");
    button.classList.remove("th-boot-btn--cancel", "th-boot-btn--retry");
    button.classList.add(variant === "retry" ? "th-boot-btn--retry" : "th-boot-btn--cancel");
    if (actionsEl.childElementCount === 1 && actionsEl.firstElementChild === button) {
      return;
    }
    actionsEl.replaceChildren(button);
  };

  const stopAnimationAndListeners = (): void => {
    if (animId) {
      cancelAnimationFrame(animId);
      animId = 0;
    }
    window.removeEventListener("resize", rebuildGrid);
    window.removeEventListener("pointermove", onMove);
  };

  const destroy = (immediate = false): void => {
    if (destroyed) return;
    destroyed = true;
    stopAnimationAndListeners();

    if (immediate) {
      if (cleanupTimer) {
        window.clearTimeout(cleanupTimer);
        cleanupTimer = 0;
      }
      root.remove();
      return;
    }

    root.classList.add("th-boot-overlay--closing");
    const finalize = () => {
      if (cleanupTimer) {
        window.clearTimeout(cleanupTimer);
        cleanupTimer = 0;
      }
      root.remove();
    };
    root.addEventListener("transitionend", finalize, { once: true });
    cleanupTimer = window.setTimeout(finalize, 420);
  };

  setStatus("Initializing Gale Crater telemetry link...");

  return {
    root,
    setStatus,
    setAction,
    destroy,
    remove: () => destroy(false),
  };
}
