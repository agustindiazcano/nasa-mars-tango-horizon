import { onLangChange, t } from "@th/shared";
import { ARCHIVE_IDS, parseHistoricalSeries, SampleReplay, type HistoricalSeries } from "../data/historicalSeries";

/** Historical playback never writes to design mission telemetry or agent context. */
export function installHistoricalArchive(): void {
  const open = document.createElement("button");
  open.textContent = t("archive.title");
  open.style.cssText =
    "position:fixed;right:22px;bottom:14px;z-index:100;background:rgba(16,10,7,.72);color:#e8c9a8;border:0;border-bottom:1px solid #ffb36b;padding:6px 10px;font:600 11px Rajdhani,sans-serif;letter-spacing:.14em;text-transform:uppercase;cursor:pointer";
  document.body.append(open);
  const dialog = document.createElement("dialog");
  dialog.style.cssText = "max-width:750px;background:#07111e;color:white;padding:24px";
  const title = document.createElement("h2");
  title.textContent = t("archive.replay");
  const select = document.createElement("select");
  select.setAttribute("aria-label", t("archive.dataset"));
  for (const name of ARCHIVE_IDS) select.add(new Option(name, name));
  const output = document.createElement("pre");
  output.style.whiteSpace = "pre-wrap";
  output.setAttribute("aria-live", "polite");
  const slider = document.createElement("input");
  slider.type = "range"; slider.min = "0"; slider.step = "1"; slider.value = "0";
  slider.setAttribute("aria-label", t("archive.sample_label"));
  const play = document.createElement("button"); play.textContent = t("archive.play");
  const reset = document.createElement("button"); reset.textContent = t("archive.reset");
  const rate = document.createElement("select");
  rate.setAttribute("aria-label", t("archive.speed"));
  for (const speed of [1, 4, 12]) rate.add(new Option(t("archive.rate", { n: speed }), String(speed)));
  const close = document.createElement("button"); close.textContent = t("archive.close");
  dialog.append(title, select, slider, play, reset, rate, output, close);
  document.body.append(dialog);
  // Archive keyboard interaction must not trigger mission shortcuts or push-to-talk.
  dialog.addEventListener("keydown", event => event.stopPropagation());
  dialog.addEventListener("keyup", event => event.stopPropagation());
  let request: AbortController | undefined;
  let series: HistoricalSeries | undefined;
  let replay: SampleReplay | undefined;
  let frame = 0;
  let lastTime = 0;
  let loadError: string | undefined;
  function translateControls(): void {
    open.textContent = t("archive.title");
    title.textContent = t("archive.replay");
    select.setAttribute("aria-label", t("archive.dataset"));
    slider.setAttribute("aria-label", t("archive.sample_label"));
    rate.setAttribute("aria-label", t("archive.speed"));
    for (const option of rate.options) option.textContent = t("archive.rate", { n: option.value });
    play.textContent = replay?.playing ? t("archive.pause") : t("archive.play");
    reset.textContent = t("archive.reset");
    close.textContent = t("archive.close");
    if (series && replay) render();
    else if (loadError !== undefined) output.textContent = t("archive.error", { error: loadError });
    else if (request) output.textContent = t("archive.loading");
  }
  onLangChange(translateControls);
  function render(): void {
    if (!series || !replay) return;
    slider.value = String(replay.index);
    play.textContent = replay.playing ? t("archive.pause") : t("archive.play");
    output.textContent = `${series.source}\n${t("archive.sample", { n: replay.index + 1, count: replay.count })}\n${series.epochs[replay.index]}\n\n` +
      series.variables.map(v => `${v.key}: ${v.values[replay!.index] ?? t("archive.missing")} ${v.unit}\n  ${v.category}: ${v.processing}`).join("\n") +
      `\n\n${series.limitations}\n${t("archive.note")}`;
  }
  function stop(): void {
    cancelAnimationFrame(frame);
    if (replay) replay.playing = false;
  }
  function animate(now: number): void {
    if (!replay?.playing || !dialog.open) return;
    replay.advance((now - lastTime) / 1000, Number(rate.value));
    lastTime = now; render();
    if (replay.playing) frame = requestAnimationFrame(animate);
  }
  play.onclick = () => {
    if (!replay) return;
    if (replay.playing) stop();
    else {
      if (replay.index === replay.count - 1) replay.reset();
      replay.playing = true; lastTime = performance.now(); frame = requestAnimationFrame(animate);
    }
    render();
  };
  slider.oninput = () => { stop(); replay?.seek(Number(slider.value)); render(); };
  reset.onclick = () => { stop(); replay?.reset(); render(); };
  rate.onchange = () => { stop(); render(); };
  dialog.addEventListener("close", () => { stop(); request?.abort(); });
  close.onclick = () => dialog.close();
  async function load(): Promise<void> {
    stop(); request?.abort();
    const active = new AbortController(); request = active;
    const timeout = setTimeout(() => active.abort(), 30000);
    series = undefined; replay = undefined; loadError = undefined;
    slider.disabled = play.disabled = reset.disabled = true;
    play.textContent = t("archive.play");
    output.textContent = t("archive.loading");
    try {
      const id = ARCHIVE_IDS.find(id => id === select.value);
      if (!id) throw new Error(t("archive.unknown"));
      const response = await fetch(`/data/env/${id}.json`, { signal: active.signal });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const loaded = parseHistoricalSeries(id, await response.json());
      if (request !== active || active.signal.aborted || !dialog.open) return;
      series = loaded; replay = new SampleReplay(series.epochs.length);
      slider.max = String(replay.count - 1); slider.value = "0";
      slider.disabled = play.disabled = reset.disabled = false;
      render();
    } catch (error) {
      if (request === active && dialog.open) {
        loadError = String(error);
        output.textContent = t("archive.error", { error: loadError });
      }
    } finally { clearTimeout(timeout); }
  }
  select.onchange = () => { void load(); };
  open.onclick = () => { dialog.showModal(); void load(); };
}
