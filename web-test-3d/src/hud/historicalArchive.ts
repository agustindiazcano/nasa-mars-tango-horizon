/** Independent historical inspection: never merges epochs into mission telemetry. */
export function installHistoricalArchive(): void {
  const open = document.createElement("button");
  open.textContent = "Historical data archive";
  open.style.cssText = "position:fixed;right:16px;bottom:8px;z-index:100";
  document.body.append(open);
  const dialog = document.createElement("dialog");
  dialog.style.cssText = "max-width:750px;background:#07111e;color:white;padding:24px";
  const title = document.createElement("h2");
  title.textContent = "Independent historical records (mission state is unchanged)";
  const select = document.createElement("select");
  for (const name of ["rems_clear", "rems_storm2018", "rad_quiet", "rad_sep2017", "ephem"]) {
    select.add(new Option(name, name));
  }
  const output = document.createElement("pre");
  output.style.whiteSpace = "pre-wrap";
  const slider = document.createElement("input");
  slider.type = "range"; slider.min = "0"; slider.step = "1"; slider.value = "0";
  const close = document.createElement("button"); close.textContent = "Close";
  close.onclick = () => dialog.close();
  dialog.append(title, select, slider, output, close); document.body.append(dialog);
  let generation = 0;
  async function load(): Promise<void> {
    const current = ++generation;
    slider.disabled = true; output.textContent = "Loading historical asset";
    try {
      const name = select.value;
      const response = await fetch(`/data/env/${name}.json`, { signal: AbortSignal.timeout(30000) });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      if (typeof data.source !== "string") throw new Error("Missing source");
      const ephem = name === "ephem";
      const rad = name.startsWith("rad_");
      const times: number[] = ephem ? data.earth_series.map((r: { jdtdb: number }) => r.jdtdb) : data.hours;
      const values: number[] = ephem ? data.earth_series.map((r: { light_time_s: number }) => r.light_time_s) : rad ? data.dose_rate_ugy_h : data.tau;
      if (!Array.isArray(times) || !Array.isArray(values) || !times.length || times.length !== values.length ||
          !times.every(Number.isFinite) || !values.every(Number.isFinite) ||
          times.some((t, i) => i > 0 && t <= times[i - 1])) throw new Error("Invalid historical series");
      if (rad && (data.unit !== "uGy/h" || data.quality_factor_applied !== null)) throw new Error("Unsupported radiation units");
      if (current !== generation) return;
      slider.max = String(times.length - 1); slider.value = "0"; slider.disabled = false;
      function render(): void {
        const i = Number(slider.value);
        const category = ephem ? "Ephemeris calculation" : rad ? "Absorbed dose in silicon detector B; no equivalent dose conversion" : "Derived UV opacity proxy; not Mastcam measured tau";
        const epoch = ephem ? data.earth_series[i].tdb : rad ? data.source : `Selected sols: ${data.sols.join(", ")}; file hours compress nonconsecutive sols`;
        output.textContent = `${data.source}\n${category}\n${epoch}\nSample ${i + 1}/${values.length}: ${values[i]} ${ephem ? "s one-way light time" : rad ? "uGy/h" : "dimensionless opacity proxy"}\nCoordinate: ${times[i]} ${ephem ? "JD TDB" : "file hours"}\nMaximum: ${Math.max(...values)}\nManual sample playback: exact samples only; gaps are not interpolated, no extrapolation. Selection resets to the first sample.\n${data.tau_note ?? ""}`;
      }
      slider.oninput = render; render();
    } catch (error) {
      if (current === generation) output.textContent = `Historical replay unavailable: ${String(error)}`;
    }
  }
  select.onchange = () => { void load(); };
  open.onclick = () => { dialog.showModal(); void load(); };
}
