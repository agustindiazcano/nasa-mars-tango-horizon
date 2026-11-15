import { ARCHIVE_IDS, parseHistoricalSeries, SampleReplay, type HistoricalSeries } from "../data/historicalSeries";

/** Historical playback never writes to design mission telemetry or agent context. */
export function installHistoricalArchive(): void {
  const open = document.createElement("button");
  open.textContent = "Historical data archive";
  open.style.cssText =
    "position:fixed;right:22px;bottom:14px;z-index:100;background:rgba(16,10,7,.72);color:#e8c9a8;border:0;border-bottom:1px solid #ffb36b;padding:6px 10px;font:600 11px Rajdhani,sans-serif;letter-spacing:.14em;text-transform:uppercase;cursor:pointer";
  document.body.append(open);
  const dialog = document.createElement("dialog");
  dialog.style.cssText = "max-width:750px;background:#07111e;color:white;padding:24px";
  const title = document.createElement("h2");
  title.textContent = "Historical replay — independent of mission telemetry";
  const select = document.createElement("select");
  select.setAttribute("aria-label", "Historical dataset");
  for (const name of ARCHIVE_IDS) select.add(new Option(name, name));
  const output = document.createElement("pre");
  output.style.whiteSpace = "pre-wrap";
  output.setAttribute("aria-live", "polite");
  const slider = document.createElement("input");
  slider.type = "range"; slider.min = "0"; slider.step = "1"; slider.value = "0";
  slider.setAttribute("aria-label", "Historical sample");
  const play = document.createElement("button"); play.textContent = "Play";
  const reset = document.createElement("button"); reset.textContent = "Reset";
  const rate = document.createElement("select");
  rate.setAttribute("aria-label", "Replay speed in samples per second");
  for (const speed of [1, 4, 12]) rate.add(new Option(`${speed} samples/s (gaps skipped)`, String(speed)));
  const close = document.createElement("button"); close.textContent = "Close";
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
  function render(): void {
    if (!series || !replay) return;
    slider.value = String(replay.index);
    play.textContent = replay.playing ? "Pause" : "Play";
    output.textContent = `${series.source}\nSample ${replay.index + 1}/${replay.count}\n${series.epochs[replay.index]}\n\n` +
      series.variables.map(v => `${v.key}: ${v.values[replay!.index] ?? "unavailable"} ${v.unit}\n  ${v.category}: ${v.processing}`).join("\n") +
      `\n\n${series.limitations}\nPlayback uses exact source samples only; no interpolation, extrapolation or amplitude scaling. Source time gaps are not playback durations.`;
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
    series = undefined; replay = undefined;
    slider.disabled = play.disabled = reset.disabled = true;
    play.textContent = "Play";
    output.textContent = "Loading historical asset";
    try {
      const id = ARCHIVE_IDS.find(id => id === select.value);
      if (!id) throw new Error("Unknown historical asset");
      const response = await fetch(`/data/env/${id}.json`, { signal: active.signal });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const loaded = parseHistoricalSeries(id, await response.json());
      if (request !== active || active.signal.aborted || !dialog.open) return;
      series = loaded; replay = new SampleReplay(series.epochs.length);
      slider.max = String(replay.count - 1); slider.value = "0";
      slider.disabled = play.disabled = reset.disabled = false;
      render();
    } catch (error) {
      if (request === active && dialog.open) output.textContent = `Historical replay unavailable: ${String(error)}`;
    } finally { clearTimeout(timeout); }
  }
  select.onchange = () => { void load(); };
  open.onclick = () => { dialog.showModal(); void load(); };
}
