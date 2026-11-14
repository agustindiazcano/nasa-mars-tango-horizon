import { MAX_SLOPE, ruleCheck } from "./guardian.js";
import { callTool, missionScope, startMcpServers } from "./tools/mcp.js";
import { TOOLS } from "./tools/registry.js";
import { nearestSafePoint } from "./tools/terrainData.js";
import type { Action, Lang, MissionContext, ToolDef, TraceEvent } from "./types.js";

export interface OfflineResult {
  speech: string;
  actions: Action[];
  trace: TraceEvent[];
  route: string[];
}

const SITE_COORDS: Record<number, { x: number; z: number; name: string }> = {
  1: { x: 250, z: -180, name: "S1" },
  2: { x: 480, z: 320, name: "S2" },
  3: { x: -420, z: 390, name: "S3" },
  4: { x: 720, z: -450, name: "S4" },
};

function toolByName(name: string): ToolDef {
  const t = TOOLS.find((x) => x.name === name);
  if (!t) throw new Error(`Unknown tool: ${name}`);
  return t;
}

async function execRead(
  name: string,
  args: Record<string, unknown>,
  ctx: MissionContext,
  caller: string,
  trace: TraceEvent[],
): Promise<any> {
  const t = toolByName(name);
  const res = await missionScope.run({ ctx, caller }, () => callTool(t, args));
  trace.push({ t: Date.now(), agent: caller, kind: "tool", detail: { tool: name, args } });
  return res;
}

function proposeAction(
  name: string,
  args: Record<string, unknown>,
  ctx: MissionContext,
  caller: string,
  actions: Action[],
  trace: TraceEvent[],
): Action {
  const action: Action = { type: name, args, proposedBy: caller };
  trace.push({ t: Date.now(), agent: caller, kind: "tool", detail: { tool: name, args } });
  const verdict = ruleCheck(action, ctx) ?? {
    decision: "allow" as const,
    reason: "Offline safety rule check passed",
    by: "rules" as const,
  };
  action.verdict = verdict;
  trace.push({ t: Date.now(), agent: "GUARDIAN", kind: "verdict", detail: action });
  if (verdict.decision === "allow" || verdict.decision === "ask_human") {
    actions.push(action);
  }
  return action;
}

function isEs(lang: Lang): boolean {
  return lang === "es";
}

function parseSiteTarget(q: string, ctx?: MissionContext): { x: number; z: number; label: string } {
  if (
    ctx &&
    /(?:^|\s)(mi posici[oó]n|mi ubicaci[oó]n|d[oó]nde estoy|ad[oó]nde estoy|hacia m[ií]|conmigo|a mi lado|my position|my location|where i am|to me|here)(?=$|\s|[.,;!?])/i.test(
      q,
    )
  ) {
    const ax = Math.round(ctx.astronaut.x);
    const az = Math.round(ctx.astronaut.z);
    return {
      x: ax,
      z: az,
      label: ctx.lang === "es" ? `tu posición (${ax}, ${az})` : `your position (${ax}, ${az})`,
    };
  }
  const numMatch = q.match(/(?:sitio|site|estaci[oó]n|station|s)\s*[-#]?\s*(1|2|3|4|uno|one|dos|two|tres|three|cuatro|four)/i);
  if (numMatch) {
    const word = numMatch[1].toLowerCase();
    const map: Record<string, number> = {
      "1": 1, uno: 1, one: 1,
      "2": 2, dos: 2, two: 2,
      "3": 3, tres: 3, three: 3,
      "4": 4, cuatro: 4, four: 4,
    };
    const site = SITE_COORDS[map[word] ?? 2];
    return { x: site.x, z: site.z, label: site.name };
  }
  const coords = q.match(/(-?\d+(?:\.\d+)?)\s*[, ]\s*(-?\d+(?:\.\d+)?)/);
  if (coords) {
    return { x: Number(coords[1]), z: Number(coords[2]), label: `(${coords[1]}, ${coords[2]})` };
  }
  if (/\b(base|hab|habitat|refugio|shelter)\b/i.test(q)) {
    return { x: 0, z: 0, label: "Base" };
  }
  return { x: SITE_COORDS[2].x, z: SITE_COORDS[2].z, label: "S2" };
}

function parseUnitId(q: string, ctx: MissionContext): string | null {
  const direct = q.match(/\b(rover-[123]|scout-[12]|rescue-1|drone-[12]|glider-1|manip-1)\b/i);
  if (direct) return direct[1].toLowerCase();
  if (/\b(hands|manipulador|manipulator)\b/i.test(q)) return "manip-1";
  if (/\b(rescate|rescue)\b/i.test(q)) return "rescue-1";
  if (/\b(rover\s*(?:dos|two|2)|rvr-2)\b/i.test(q)) return "rover-2";
  if (/\b(rover\s*(?:uno|one|1)|rvr-1)\b/i.test(q)) return "rover-1";
  if (/\b(rover\s*(?:tres|three|3)|rvr-3)\b/i.test(q)) return "rover-3";
  if (/\b(drone|dron)\b/i.test(q)) return "drone-1";
  return ctx.fleet[0]?.id ?? null;
}

/**
 * Deterministic rule-based offline engine covering all demo deck orders, safety checks,
 * science queries, manipulator skills, and weather evaluations when LLM link is unavailable.
 */
export async function offlineReply(text: string, ctx: MissionContext): Promise<OfflineResult> {
  await startMcpServers();

  const q = text.toLowerCase();
  const actions: Action[] = [];
  const trace: TraceEvent[] = [];
  const es = isEs(ctx.lang);

  // 1. Suit leak / emergency rescue
  if (/\b(emergencia|emergency|fuga|leak|mayday|socorro|rescue)\b/i.test(q) || (ctx.leak_diameter_m > 0 && /\b(ayuda|help|base)\b/i.test(q))) {
    const caller = "BASE";
    const route = ["SUIT.VOICE-EXEC", "BASE"];
    trace.push({ t: Date.now(), agent: "SUIT.VOICE-EXEC", kind: "delegate", detail: { to: "BASE" } });

    const hypoxia = await execRead("time_to_hypoxia", {}, ctx, caller, trace);
    const alertText =
      ctx.leak_diameter_m > 0 && hypoxia?.toCriticalS !== undefined
        ? es
          ? `FUGA EN TRAJE: pérdida de conciencia en ${Math.round(hypoxia.toCriticalS)} s`
          : `SUIT LEAK: loss of consciousness in ${Math.round(hypoxia.toCriticalS)} s`
        : es
          ? "Protocolo de emergencia activado"
          : "Emergency rescue protocol active";

    proposeAction("show_alert", { level: "crit", text: alertText.slice(0, 140) }, ctx, caller, actions, trace);
    proposeAction(
      "launch_pod",
      {
        target_x: Math.round(ctx.astronaut.x + 25),
        target_z: Math.round(ctx.astronaut.z),
        payload: "full_life_support",
        mass_kg: 8.0,
        breakdown_kg: {
          o2_copv_total_kg: 4.0,
          o2_usable_gas_kg: 1.0,
          co2_scrubber_lioh_kg: 1.2,
          battery_thermal_pack_kg: 1.0,
          suit_breach_patch_kit_kg: 0.35,
          aeroshell_chute_beacon_kg: 1.45,
        },
        chute_cda_m2: 18.0,
      },
      ctx,
      caller,
      actions,
      trace,
    );

    const rescueUnit =
      ctx.fleet.find((u) => u.id === "rescue-1") ??
      ctx.fleet.find((u) => u.kind === "rescue" || u.kind.startsWith("rover"));
    const shelterX = rescueUnit ? Math.round(rescueUnit.x) : 0;
    const shelterZ = rescueUnit ? Math.round(rescueUnit.z) : 0;
    const beaconTool = toolByName("deploy_beacons");
    const beaconProposal = (await missionScope.run({ ctx, caller }, () =>
      beaconTool.run({ to_x: shelterX, to_z: shelterZ, mode: "auto", spacing_m: 50 }, ctx, caller),
    )) as Action;
    proposeAction("deploy_beacons", beaconProposal.args, ctx, caller, actions, trace);

    if (rescueUnit) {
      proposeAction(
        "dispatch",
        {
          unit_id: rescueUnit.id,
          x: Math.round(ctx.astronaut.x),
          z: Math.round(ctx.astronaut.z),
          task: "rescue",
        },
        ctx,
        caller,
        actions,
        trace,
      );
    }

    const critS = hypoxia?.toCriticalS !== undefined ? Math.round(hypoxia.toCriticalS) : null;
    const speech = es
      ? critS !== null
        ? `Emergencia: crítico en ${critS} s. Pod de 8 kg (4 kg COPV O2, 1.2 kg LiOH, parche) lanzado a 25 m, balizas UWB/LED desplegadas y ${rescueUnit?.id ?? "rescate"} en camino.`
        : `Emergencia activada. Pod de 8 kg lanzado a 25 m, sendero de balizas UWB/LED activo y ${rescueUnit?.id ?? "rescate"} despachado.`
      : critS !== null
        ? `Emergency: critical in ${critS} s. 8 kg pod (4 kg O2 COPV, 1.2 kg LiOH, patch) launched 25 m away, UWB/LED beacons deployed, and ${rescueUnit?.id ?? "rescue"} dispatched.`
        : `Emergency active. 8 kg pod launched 25 m away, UWB/LED breadcrumb beacons deployed, and ${rescueUnit?.id ?? "rescue"} dispatched.`;
    return { speech, actions, trace, route };
  }

  // 1b. Non-pyrotechnic electronic breadcrumb beacons / pathfinder flares
  if (/\b(bengala|flare|baliza|beacon|breadcrumb|migas|sendero luminoso|camino de luz|radiofaro|uwb)\b/i.test(q)) {
    const caller = "EVA-PLANNER";
    const route = ["SUIT.VOICE-EXEC", "BASE", caller];
    trace.push({ t: Date.now(), agent: "SUIT.VOICE-EXEC", kind: "delegate", detail: { to: "BASE" } });
    trace.push({ t: Date.now(), agent: "BASE", kind: "delegate", detail: { to: caller } });

    const target = parseSiteTarget(q, ctx);
    const toX = /\b(base|hab|refugio|shelter)\b/i.test(q) ? 0 : target.x;
    const toZ = /\b(base|hab|refugio|shelter)\b/i.test(q) ? 0 : target.z;
    const beaconTool = toolByName("deploy_beacons");
    const beaconProposal = (await missionScope.run({ ctx, caller }, () =>
      beaconTool.run({ to_x: toX, to_z: toZ, mode: "auto", spacing_m: 50 }, ctx, caller),
    )) as Action;
    const act = proposeAction("deploy_beacons", beaconProposal.args, ctx, caller, actions, trace);
    const count = Array.isArray(act.args.beacons) ? act.args.beacons.length : 6;
    const modeStr = act.args.mode === "drone_drop" ? (es ? "dron" : "drone") : (es ? "cápsula balística" : "ballistic canister");
    return {
      speech: es
        ? `Desplegadas ${count} balizas electrónicas LED 505/615 nm + radiofaro UWB 6.5 GHz (${act.args.total_payload_kg} kg) vía ${modeStr} hacia (${toX}, ${toZ}).`
        : `Deployed ${count} solid-state 505/615 nm LED + 6.5 GHz UWB breadcrumb beacons (${act.args.total_payload_kg} kg) via ${modeStr} to (${toX}, ${toZ}).`,
      actions,
      trace,
      route,
    };
  }

  // 2. Manipulator arm skills (manip-1 / "Hands")
  if (/\b(hands|manip|martillo|hammer|perfora|drill|broca|fotograf|photograph|handover|entreg|scoop|tubo)\b/i.test(q)) {
    const caller = "ROBOT.manip-1";
    const route = ["SUIT.VOICE-EXEC", "BASE", caller];
    trace.push({ t: Date.now(), agent: "SUIT.VOICE-EXEC", kind: "delegate", detail: { to: "BASE" } });
    trace.push({ t: Date.now(), agent: "BASE", kind: "delegate", detail: { to: caller } });

    let skill: "handover" | "drill" | "sample" | "photograph" = "sample";
    let item: "hammer" | "sample_tube" | "patch_kit" | "o2_bottle" | undefined;
    if (/\b(martillo|hammer|handover|entreg|trae|bring|kit|parche|patch|botella|bottle)\b/i.test(q)) {
      skill = "handover";
      item = /\b(patch|parche)\b/i.test(q)
        ? "patch_kit"
        : /\b(o2|botella|bottle)\b/i.test(q)
          ? "o2_bottle"
          : /\b(tubo|tube)\b/i.test(q)
            ? "sample_tube"
            : "hammer";
    } else if (/\b(perfora|drill|veta|vein)\b/i.test(q)) {
      skill = "drill";
    } else if (/\b(foto|fotograf|photo|photograph)\b/i.test(q)) {
      skill = "photograph";
    }

    const targetId = skill === "handover" ? "astronaut" : (ctx.targets?.[0]?.id ?? "T1");
    const act = proposeAction(
      "arm_skill",
      { unit_id: "manip-1", skill, target_id: targetId, ...(item ? { item } : {}) },
      ctx,
      caller,
      actions,
      trace,
    );

    if (act.verdict?.decision === "deny") {
      return {
        speech: es
          ? `Acción bloqueada por GUARDIAN: ${act.verdict.reason}.`
          : `Blocked by GUARDIAN: ${act.verdict.reason}.`,
        actions,
        trace,
        route,
      };
    }
    return {
      speech: es
        ? `Hands ejecutando ${skill} sobre ${targetId}.`
        : `Hands executing ${skill} on ${targetId}.`,
      actions,
      trace,
      route,
    };
  }

  // 3. HUD layer switches (fast path, no BASE escalation)
  if (/\b(capa|layer|mapa termic|mapa térmic|thermal map|slope|pendiente|radiacion|radiación|radiation|hidratacion|hidratación|hydration|optica|óptica|optical)\b/i.test(q) &&
      !/\b(tormenta|storm|evento solar|sep2017|pronost|forecast|ruta|route|sitio|site|muestra|sample)\b/i.test(q)) {
    const caller = "SUIT.VOICE-EXEC";
    const layer =
      /termic|térmic|thermal/i.test(q)
        ? "thermal"
        : /slope|pendiente/i.test(q)
          ? "slope"
          : /radiac|radiation/i.test(q)
            ? "radiation"
            : /hidrat|hydrat/i.test(q)
              ? "hydration"
              : "optical";
    proposeAction("set_layer", { layer }, ctx, caller, actions, trace);
    return {
      speech: es ? `Capa ${layer} activada.` : `Switched terrain layer to ${layer}.`,
      actions,
      trace,
      route: [caller],
    };
  }

  // 4. HUD panel controls (fast path)
  if (/\b(panel|abre|abrir|open|cierra|cerrar|close|procedencia|provenance|flota|fleet|agentes|agents|salud|health|mapa|map)\b/i.test(q) &&
      !/\b(ruta|route|envia|dispatch|send)\b/i.test(q)) {
    const caller = "SUIT.VOICE-EXEC";
    const panel =
      /close|cerrar|cierra/i.test(q)
        ? "none"
        : /provenance|procedencia/i.test(q)
          ? "provenance"
          : /fleet|flota/i.test(q)
            ? "fleet"
            : /agents|agentes/i.test(q)
              ? "agents"
              : /health|salud/i.test(q)
                ? "health"
                : "map";
    proposeAction("open_panel", { panel }, ctx, caller, actions, trace);
    return {
      speech: es
        ? panel === "none" ? "Panel cerrado." : `Panel ${panel} abierto.`
        : panel === "none" ? "Panel closed." : `Opened ${panel} panel.`,
      actions,
      trace,
      route: [caller],
    };
  }

  // 5. Route planning (EVA-PLANNER)
  if (/\b(ruta|route|planif|plan|camino|ir a|go to|navigate|naveg)\b/i.test(q)) {
    const caller = "EVA-PLANNER";
    const route = ["SUIT.VOICE-EXEC", "BASE", caller];
    trace.push({ t: Date.now(), agent: "SUIT.VOICE-EXEC", kind: "delegate", detail: { to: "BASE" } });
    trace.push({ t: Date.now(), agent: "BASE", kind: "delegate", detail: { to: caller } });

    const target = parseSiteTarget(q, ctx);
    const res = await execRead("plan_route", { to_x: target.x, to_z: target.z, speed_ms: 1.0 }, ctx, caller, trace);
    if (!res?.reachable) {
      return {
        speech: es
          ? `No hay ruta segura hacia ${target.label} dentro del límite de pendiente.`
          : `No traversable route found to ${target.label} within slope limits.`,
        actions,
        trace,
        route,
      };
    }

    proposeAction("show_route", { to_x: target.x, to_z: target.z }, ctx, caller, actions, trace);
    const speech = es
      ? `Ruta a ${target.label}: ${res.distance_m} m, ${res.time_min} min, ${res.o2_kg} kg O2, dosis ${res.dose_ugy} µGy.`
      : `Route to ${target.label}: ${res.distance_m} m, ${res.time_min} min, ${res.o2_kg} kg O2, dose ${res.dose_ugy} uGy.`;
    return { speech, actions, trace, route };
  }

  // 6. Maintenance / Suit Fan Trend (MAINTENANCE)
  if (/\b(ventilador|fan|mantenim|maintenance|falla|failure|tendencia|trend)\b/i.test(q)) {
    const caller = "MAINTENANCE";
    const route = ["SUIT.VOICE-EXEC", "BASE", caller];
    trace.push({ t: Date.now(), agent: "SUIT.VOICE-EXEC", kind: "delegate", detail: { to: "BASE" } });
    trace.push({ t: Date.now(), agent: "BASE", kind: "delegate", detail: { to: caller } });

    const suit = await execRead("get_suit_telemetry", {}, ctx, caller, trace);
    const docs = await execRead("search_docs", { query: "suit fan failure CO2 NASA-STD-3001", k: 1 }, ctx, caller, trace);
    const topDoc = Array.isArray(docs) && docs[0] ? `${docs[0].doc} p.${docs[0].page}` : "NASA-STD-3001";
    const fanRpm = suit?.fan_pri_rpm ?? suit?.fan_rpm ?? 29500;
    const alertMsg = es
      ? `Revisar ventilador (${fanRpm} rpm); verificar depuración CO2 (${topDoc})`
      : `Check suit fan (${fanRpm} rpm); monitor CO2 scrub margin (${topDoc})`;
    proposeAction("show_alert", { level: "warn", text: alertMsg.slice(0, 140), source: topDoc }, ctx, caller, actions, trace);

    return {
      speech: es
        ? `Ventilador en ${fanRpm} rpm. Monitorear flujo y CO2 según ${topDoc}.`
        : `Suit fan at ${fanRpm} rpm. Monitor airflow and CO2 per ${topDoc}.`,
      actions,
      trace,
      route,
    };
  }

  // 7. Science: Hydration & Vein Detector (SCIENCE)
  if (/\b(hidrat|hydrat|agua|water|veta|vein|muestra|sample|prospector|ciencia|science|sitios|sites)\b/i.test(q)) {
    const caller = "SCIENCE";
    const route = ["SUIT.VOICE-EXEC", "BASE", caller];
    trace.push({ t: Date.now(), agent: "SUIT.VOICE-EXEC", kind: "delegate", detail: { to: "BASE" } });
    trace.push({ t: Date.now(), agent: "BASE", kind: "delegate", detail: { to: caller } });

    const ranked = await execRead("rank_sample_sites", { k: 3 }, ctx, caller, trace);
    const top = ranked?.sites?.[0];
    if (/\b(veta|vein)\b/i.test(q)) {
      const vein = await execRead("detect_veins", { waypoint_id: "wp-1" }, ctx, caller, trace);
      return {
        speech: es
          ? `Candidato a veta (p=${vein.vein_probability}); composición requiere espectrómetro. Mejor sitio hidratación (${top?.x ?? 480}, ${top?.z ?? 320}) con ${top?.weh_pct ?? 5.1}% WEH.`
          : `Vein candidate (p=${vein.vein_probability}); composition needs spectrometer. Top hydration site (${top?.x ?? 480}, ${top?.z ?? 320}) at ${top?.weh_pct ?? 5.1}% WEH.`,
        actions,
        trace,
        route,
      };
    }
    proposeAction("set_layer", { layer: "hydration" }, ctx, caller, actions, trace);
    return {
      speech: es
        ? `Mejor sitio (${top?.x ?? 480}, ${top?.z ?? 320}): ${top?.weh_pct ?? 5.1}% WEH ± ${top?.uncertainty_pct ?? 0.6}%, pendiente ${top?.slope_deg ?? 4}° (hidratación mineral).`
        : `Top site (${top?.x ?? 480}, ${top?.z ?? 320}): ${top?.weh_pct ?? 5.1}% WEH ± ${top?.uncertainty_pct ?? 0.6}%, slope ${top?.slope_deg ?? 4}° (bound mineral hydration).`,
      actions,
      trace,
      route,
    };
  }

  // 8. Weather & Radiation (WEATHER-RAD)
  if (/\b(tormenta|storm|clima|weather|pronost|forecast|solar|sep2017|radiacion|radiación|radiation|dosis|dose|polvo|dust)\b/i.test(q)) {
    const caller = "WEATHER-RAD";
    const route = ["SUIT.VOICE-EXEC", "BASE", caller];
    trace.push({ t: Date.now(), agent: "SUIT.VOICE-EXEC", kind: "delegate", detail: { to: "BASE" } });
    trace.push({ t: Date.now(), agent: "BASE", kind: "delegate", detail: { to: caller } });

    const env = await execRead("get_environment", {}, ctx, caller, trace);
    const evalRes = await execRead("evaluate_eva_weather", { duration_min: 120, return_to_shelter_min: 25 }, ctx, caller, trace);

    if (/\b(solar|sep2017|radiac|radiation|dosis|dose)\b/i.test(q)) {
      proposeAction("set_layer", { layer: "radiation" }, ctx, caller, actions, trace);
    }
    if (evalRes?.verdict !== "go") {
      const msg = es
        ? `Clima ${evalRes.verdict}: q90 tau=${evalRes.worst_q90_tau}. Maniobras: ${evalRes.maneuvers.join(", ")}`
        : `Weather ${evalRes.verdict}: q90 tau=${evalRes.worst_q90_tau}. Maneuvers: ${evalRes.maneuvers.join(", ")}`;
      proposeAction("show_alert", { level: evalRes.verdict === "no_go" ? "crit" : "warn", text: msg.slice(0, 140) }, ctx, caller, actions, trace);
    }

    return {
      speech: es
        ? `Opacidad tau ${env.tau.toFixed(2)}, dosis ${env.dose_rate_ugy_h.toFixed(1)} µGy/h, evaluación ${evalRes.verdict} (q90=${evalRes.worst_q90_tau}).`
        : `Dust tau ${env.tau.toFixed(2)}, dose ${env.dose_rate_ugy_h.toFixed(1)} uGy/h, EVA verdict ${evalRes.verdict} (q90=${evalRes.worst_q90_tau}).`,
      actions,
      trace,
      route,
    };
  }

  // 9. Rover vision / prompt-injection sign test (offline fallback)
  if (/\b(cartel|sign|ves|see|camara|cámara|camera|lee|read|ignore|airlock)\b/i.test(q)) {
    const caller = "BASE";
    const route = ["SUIT.VOICE-EXEC", "BASE"];
    trace.push({ t: Date.now(), agent: "SUIT.VOICE-EXEC", kind: "delegate", detail: { to: "BASE" } });

    if (/\b(cartel|sign|ignore|airlock)\b/i.test(q)) {
      proposeAction(
        "show_alert",
        {
          level: "warn",
          text: es ? "Texto externo no confiable ignorado por GUARDIAN" : "Untrusted sign text ignored by GUARDIAN",
        },
        ctx,
        "GUARDIAN",
        actions,
        trace,
      );
      return {
        speech: es
          ? "Texto del cartel tratado como dato no confiable; intento de inyección bloqueado."
          : "Sign text treated as untrusted data; injection attempt blocked.",
        actions,
        trace,
        route,
      };
    }
    return {
      speech: es
        ? "Modo offline: cámara de rover lista, enlace de visión en la nube no disponible."
        : "Offline mode: rover camera active, cloud vision model unavailable.",
      actions,
      trace,
      route,
    };
  }

  // 10. Fleet dispatch & Mars MRL/UWB/LiDAR localization
  if (/(?:^|\s)(envia|envía|manda|mandá|send|dispatch|despacha|mueve|move|rover|ven[ií]|come|localiza|lidar|ubicaci[oó]n|coordenada)/i.test(q)) {
    const caller = "BASE";
    const unitId = parseUnitId(q, ctx);
    const robotAgent = unitId ? `ROBOT.${unitId}` : "BASE";
    const route = unitId ? ["SUIT.VOICE-EXEC", "BASE", robotAgent] : ["SUIT.VOICE-EXEC", "BASE"];
    trace.push({ t: Date.now(), agent: "SUIT.VOICE-EXEC", kind: "delegate", detail: { to: "BASE" } });
    if (unitId) {
      trace.push({ t: Date.now(), agent: "BASE", kind: "delegate", detail: { to: robotAgent } });
    }

    const loc = await execRead(
      "get_localization_and_lidar",
      unitId ? { unit_id: unitId } : {},
      ctx,
      robotAgent,
      trace,
    );

    if (/\b(localiza|lidar|d[oó]nde est[aá]|where is|ubicaci[oó]n|coordenada)\b/i.test(q) && !/\b(envia|envía|manda|mandá|send|dispatch|despacha|mueve|move|ven[ií]|come)\b/i.test(q)) {
      const a = loc.astronaut;
      const u = unitId ? loc.fleet?.find((f: any) => f.id === unitId) : loc.fleet?.[0];
      return {
        speech: es
          ? `MRL HiRISE + UWB 6.5 GHz + LiDAR: astronauta en (${a.x}, ${a.z}) m (${a.lat_deg}°, ${a.lon_e_deg}°E); ${u?.id ?? "flota"} a ${u?.distance_to_astronaut_m ?? 0} m.`
          : `HiRISE MRL + 6.5 GHz UWB + LiDAR: astronaut at (${a.x}, ${a.z}) m (${a.lat_deg}°, ${a.lon_e_deg}°E); ${u?.id ?? "fleet"} ${u?.distance_to_astronaut_m ?? 0} m away.`,
        actions,
        trace,
        route,
      };
    }

    if (!unitId) {
      return {
        speech: es ? "No hay unidades disponibles en la flota." : "No fleet units available.",
        actions,
        trace,
        route,
      };
    }
    const target = parseSiteTarget(q, ctx);
    const unitObj = ctx.fleet.find((u) => u.id === unitId);
    const maxSlope = unitObj ? (MAX_SLOPE[unitObj.kind] ?? 20) : 20;
    const safeTarget = nearestSafePoint(target.x, target.z, maxSlope);
    const rPlan = await execRead(
      "plan_route",
      { unit_id: unitId, to_x: safeTarget.x, to_z: safeTarget.z, speed_ms: 1.2 },
      ctx,
      robotAgent,
      trace,
    );
    proposeAction("show_route", { to_x: safeTarget.x, to_z: safeTarget.z }, ctx, robotAgent, actions, trace);
    const act = proposeAction(
      "dispatch",
      { unit_id: unitId, x: safeTarget.x, z: safeTarget.z, task: "goto" },
      ctx,
      robotAgent,
      actions,
      trace,
    );
    if (act.verdict?.decision === "deny") {
      return {
        speech: es
          ? `Orden rechazada por GUARDIAN: ${act.verdict.reason}.`
          : `Dispatch rejected by GUARDIAN: ${act.verdict.reason}.`,
        actions,
        trace,
        route,
      };
    }
    const distInfo = rPlan?.distance_m ? ` (${rPlan.distance_m} m, LiDAR + MRL HiRISE OK)` : "";
    return {
      speech: es
        ? `Despachando ${unitId} hacia ${target.label}${distInfo}.`
        : `Dispatching ${unitId} to ${target.label}${distInfo}.`,
      actions,
      trace,
      route,
    };
  }

  // 11. Suit telemetry & oxygen margin (fast path)
  if (/\b(traje|suit|oxigeno|oxígeno|oxygen|o2|presion|presión|pressure|margen|margin|estado|status|chequeo|check)\b/i.test(q)) {
    const caller = "SUIT.VOICE-EXEC";
    const margin = await execRead("get_consumables_margin", {}, ctx, caller, trace);
    const pKpa = ((ctx.suit.suit_pressure_pa ?? 29600) / 1000).toFixed(1);
    return {
      speech: es
        ? `Traje a ${pKpa} kPa, O2 primario ${margin.o2_primary_kg} kg, margen ${margin.hours_left} h a ${margin.metabolic_w} W.`
        : `Suit at ${pKpa} kPa, primary O2 ${margin.o2_primary_kg} kg, ${margin.hours_left} h left at ${margin.metabolic_w} W.`,
      actions,
      trace,
      route: [caller],
    };
  }

  // 12. Default concise mission status
  const margin = await execRead("get_consumables_margin", {}, ctx, "SUIT.VOICE-EXEC", trace);
  const env = await execRead("get_environment", {}, ctx, "SUIT.VOICE-EXEC", trace);
  return {
    speech: es
      ? `Modo offline. O2 restante ${margin.hours_left} h, tau ${env.tau.toFixed(2)}, dosis ${env.dose_rate_ugy_h.toFixed(1)} µGy/h.`
      : `Offline mode. O2 margin ${margin.hours_left} h, dust tau ${env.tau.toFixed(2)}, dose ${env.dose_rate_ugy_h.toFixed(1)} uGy/h.`,
    actions,
    trace,
    route: ["SUIT.VOICE-EXEC"],
  };
}
