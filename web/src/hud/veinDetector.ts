import { fmt, getLang, t } from "@th/shared";
import { fetchVeins, findVeinImage, veinAssetUrl, type VeinData } from "../data/veins";
import "./veinDetector.css";

// Geometry is known (full-frame resize), but patch localization has no human validation record.
export const VEIN_LOCALIZATION_VALIDATED = false;

export function markerPercent(peak: { u: number; v: number }): { left: string; top: string } {
  if (![peak.u, peak.v].every((v) => Number.isFinite(v) && v >= 0 && v <= 1)) throw new Error("Invalid peak");
  return { left: `${peak.u * 100}%`, top: `${peak.v * 100}%` };
}

export function veinMetric(value: number | undefined, percent = false): string {
  return value === undefined ? t("veins.unavailable") : percent ? `${fmt(value * 100, 2)} %` : fmt(value, 4);
}

/** Mounted once per open panel; simulation updates do not replace interactive controls. */
export class VeinDetector {
  private data?: VeinData;
  private selected = "";
  private error = false;
  private loading?: Promise<void>;
  private key = "";

  show(host: HTMLElement, close: () => void): void {
    const key = `${getLang()}:${this.selected}:${this.error}:${Boolean(this.data)}`;
    if (!host.querySelector(".vein-detector") || host.dataset.veinDetector !== key || this.key !== key) {
      this.key = key;
      host.dataset.veinDetector = key;
      this.render(host, close);
    }
    if (!this.data && !this.error && !this.loading) {
      this.loading = fetchVeins().then((data) => {
        this.data = data;
        this.selected = data.images[0].waypoint_id;
      }).catch(() => { this.error = true; }).finally(() => {
        this.loading = undefined;
        // The panel may have been closed or replaced while fetching.
        if (host.querySelector(".vein-detector")) this.show(host, close);
      });
    }
  }

  private render(host: HTMLElement, close: () => void): void {
    host.replaceChildren();
    const root = document.createElement("section");
    root.className = "vein-detector";
    const header = document.createElement("div");
    header.className = "panel-hdr";
    const title = document.createElement("span");
    title.textContent = t("veins.title");
    const exit = document.createElement("button");
    exit.className = "hud-btn";
    exit.dataset.pointable = "";
    exit.textContent = "X";
    exit.setAttribute("aria-label", t("archive.close"));
    exit.onclick = close;
    header.append(title, exit);
    root.append(header);
    host.append(root);
    const note = (message: string, alert = false) => {
      const p = document.createElement("p");
      p.textContent = message;
      if (alert) p.setAttribute("role", "alert");
      root.append(p);
      return p;
    };
    if (!this.data) {
      note(t(this.error ? "veins.error" : "veins.loading"), this.error);
      if (this.error) {
        const retry = document.createElement("button");
        retry.className = "hud-btn";
        retry.textContent = t("veins.retry");
        retry.dataset.pointable = "";
        retry.onclick = () => { this.error = false; this.show(host, close); };
        root.append(retry);
      }
      return;
    }
    const label = document.createElement("label");
    label.textContent = t("veins.photo");
    const select = document.createElement("select");
    select.dataset.pointable = "";
    for (const image of this.data.images) select.add(new Option(`${image.waypoint_id} · Sol ${image.sol} · ${image.instrument}`, image.waypoint_id));
    select.value = this.selected;
    select.onchange = () => { this.selected = select.value; this.show(host, close); };
    label.append(select);
    root.append(label);
    const image = findVeinImage(this.data, this.selected);
    if (!image) { note(t("veins.missing"), true); return; }
    const figure = document.createElement("figure");
    figure.className = "vein-photo";
    const photo = document.createElement("img");
    photo.className = "vein-original";
    photo.alt = `${t("veins.photo")} · ${image.waypoint_id} · Sol ${image.sol}`;
    photo.src = veinAssetUrl(image.image);
    photo.onerror = () => { figure.replaceChildren(); note(t("veins.missing"), true); };
    figure.append(photo);
    root.append(figure);
    if (VEIN_LOCALIZATION_VALIDATED && image.heatmap && image.peak) {
      const heat = document.createElement("img");
      heat.className = "vein-heat";
      heat.alt = t("veins.heatmap");
      heat.src = veinAssetUrl(image.heatmap);
      const marker = document.createElement("span");
      marker.className = "vein-peak";
      marker.setAttribute("aria-label", t("veins.peak"));
      Object.assign(marker.style, markerPercent(image.peak));
      heat.onerror = () => { heat.remove(); marker.remove(); note(t("veins.missing"), true); };
      figure.append(heat, marker);
      note(t("veins.salience"));
    } else note(t("veins.localization_pending"));
    const probability = note(`${t("veins.probability")}: ${veinMetric(image.vein_probability, true)}`);
    probability.className = "vein-probability";
    note(t("veins.candidate"));
    note(t("science.vein_disclaimer"));
    const v = this.data.validation;
    const metrics = document.createElement("dl");
    metrics.className = "vein-metrics";
    for (const [name, value] of [
      [t("veins.precision"), veinMetric(v.precision, true)],
      [t("veins.recall"), veinMetric(v.recall, true)],
      ["ROC-AUC", veinMetric(v.roc_auc)],
      [t("veins.samples"), v.n_images === undefined ? t("veins.unavailable") : String(v.n_images)],
      [t("veins.sols"), v.n_sols === undefined ? t("veins.unavailable") : String(v.n_sols)],
    ]) {
      const dt = document.createElement("dt"); dt.textContent = name;
      const dd = document.createElement("dd"); dd.textContent = value;
      metrics.append(dt, dd);
    }
    root.append(metrics);
    note(`${this.data.model} · ${v.method ?? t("veins.unavailable")}`);
    note(t("veins.metrics_note"));
    note(image.image_credit);
    if (image.nasa_url) {
      const source = document.createElement("a");
      source.href = image.nasa_url; source.target = "_blank"; source.rel = "noopener noreferrer";
      source.textContent = t("veins.source");
      root.append(source);
    }
  }
}
