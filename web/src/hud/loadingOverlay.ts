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
  root.append(marsStage, backdrop, modalWrap);
  parent.append(root);

  let destroyed = false;
  let cleanupTimer = 0;

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

  const destroy = (immediate = false): void => {
    if (destroyed) return;
    destroyed = true;

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
