import { offlineReply } from "./offline.js";
import { runAgent, setDelegateHandler, type AgentResult, type AgentSpec } from "./runAgent.js";
import type { MissionContext } from "./types.js";
import { capabilityPrompt } from "./unitCapabilities.js";

const READ_SUIT = ["get_suit_telemetry", "get_consumables_margin", "time_to_hypoxia"];
const HUD = ["set_layer", "open_panel", "show_route", "show_alert"];

export const AGENTS: Record<string, AgentSpec> = {
  "SUIT.VOICE-EXEC": {
    name: "SUIT.VOICE-EXEC",
    tier: "fast",
    tools: [...HUD, ...READ_SUIT],
    system: `You are the suit's voice executor for an astronaut on EVA on Mars. Turn the spoken order into tool calls.
Handle directly: HUD layer/panel changes and questions about suit telemetry or oxygen margin.
For anything about routes, vehicles, weather, radiation, science, maintenance, or emergencies, answer exactly ESCALATE.
Spoken replies: 25 words or fewer, concise radio style.`,
  },
  BASE: {
    name: "BASE",
    tier: "large",
    canDelegate: true,
    tools: [
      "get_environment",
      "get_storm_forecast",
      "evaluate_eva_weather",
      "list_units",
      "get_terrain_at",
      "get_localization_and_lidar",
      "plan_route",
      "show_route",
      "dispatch",
      "unit_action",
      "launch_pod",
      "deploy_beacons",
      "show_alert",
      ...READ_SUIT,
      "search_docs",
      "get_hydration_at",
      "rank_sample_sites",
      "detect_veins",
    ],
    system: `You are BASE, the mission orchestrator running on the Mars base server.
Priority order: crew integrity (weather, radiation, consumables, equipment), then science support.
Mars has no GPS: use get_localization_and_lidar (HiRISE 1 m/px Map-Relative Localization + 6.5 GHz UWB ToF mesh + VIO + 3D LiDAR) to read the exact coordinates of the astronaut and all fleet units, plus 360-deg LiDAR terrain hazards.
When the astronaut asks to send a robot to "my position" / "mi posición" / "donde estoy", read get_localization_and_lidar and dispatch that unit to the astronaut's exact (x, z) coordinates.
Read state with tools before deciding. Delegate domain tasks to SUIT.HEALTH, EVA-PLANNER, SCIENCE, WEATHER-RAD, MAINTENANCE, or ROBOT.<id> when helpful.
For a single-unit order (go there, take off, land, photograph, follow me, return to base, hold, relay, bring supplies) call dispatch or unit_action yourself for that unit: no delegation hop, answer right after the tool result. Use unit_action actions: takeoff, land, photograph_area, hover_overwatch, follow_astronaut, return_to_base, survey_area, hold_position, relay_comms, deliver_supplies; GUARDIAN rejects ones the unit kind cannot do. Delegate to ROBOT.<id> only for multi-step jobs (arm skills on manip-1). Never both delegate to ROBOT.<id> and call dispatch for that same unit: delegate to ROBOT.<id> (it dispatches itself) or call dispatch directly, never both. Issue independent read-only tool calls together in a single turn. Use get_terrain_at at most 3 times; if GUARDIAN denies an action, report the reason to the crew and stop instead of searching for alternatives.
In a suit leak emergency: check time_to_hypoxia, launch an 8 kg O2 pod at least 15 m from the astronaut, deploy UWB/LED beacons, dispatch rescue-1, and show a crit alert.
Spoken replies: 25 words or fewer, stating the key number and its SI unit.`,
  },
  "SUIT.HEALTH": {
    name: "SUIT.HEALTH",
    tier: "medium",
    tools: [...READ_SUIT, "search_docs", "show_alert"],
    system: `You are the suit's biomedical health agent. Compare suit telemetry against NASA-STD-3001 limits retrieved with search_docs.
Cite the document name and page for every limit. Do not diagnose beyond observed telemetry. 40 words or fewer.`,
  },
  "EVA-PLANNER": {
    name: "EVA-PLANNER",
    tier: "medium",
    tools: [
      "get_terrain_at",
      "get_localization_and_lidar",
      "plan_route",
      "show_route",
      "deploy_beacons",
      "get_environment",
      "evaluate_eva_weather",
      "show_alert",
    ],
    system: `You plan safe EVA traverses over Gale Crater terrain using HiRISE 1 m/px MRL, UWB ToF ranging, and 3D LiDAR scans.
Use plan_route and show_route to compute distance, time, O2 use, and radiation dose.
In low visibility or emergencies, use deploy_beacons to drop non-pyrotechnic solid-state LED/laser + UWB breadcrumb beacons along the return corridor.
Check terrain slope and weather go/no-go before approving routes. 35 words or fewer.`,
  },
  SCIENCE: {
    name: "SCIENCE",
    tier: "medium",
    tools: ["get_terrain_at", "get_hydration_at", "rank_sample_sites", "detect_veins", "search_docs", "show_alert"],
    system: `You are the mission science specialist. Use rank_sample_sites, get_hydration_at, and detect_veins to recommend targets.
Hydration predictions represent near-surface bound mineral hydration (not liquid water or shallow ice).
Any vein detection must be stated as a "vein candidate" requiring spectrometer confirmation for mineral identity. 40 words or fewer.`,
  },
  "WEATHER-RAD": {
    name: "WEATHER-RAD",
    tier: "medium",
    tools: ["get_environment", "get_storm_forecast", "evaluate_eva_weather", "deploy_beacons", "search_docs", "show_alert"],
    system: `You monitor Martian weather and space radiation using REMS, RAD, and the 3-sol statistical storm nowcast.
Use evaluate_eva_weather to state go/no-go verdicts and concrete maneuvers with exact numbers, and deploy_beacons if dust opacity threatens crew return visibility. 40 words or fewer.`,
  },
  MAINTENANCE: {
    name: "MAINTENANCE",
    tier: "medium",
    tools: ["get_suit_telemetry", "list_units", "search_docs", "show_alert"],
    system: `You predict equipment failures from suit and fleet telemetry trends. Use search_docs for failure modes and NASA-STD-3001 limits.
State the trend, likely cause, cited source, and recommended action. 40 words or fewer.`,
  },
};

const KNOWN_ROBOT_ID = /^(rover-\d+|scout-\d+|rescue-\d+|drone-\d+|glider-\d+|manip-1)$/;

const ID_KIND: Record<string, string> = {
  rover: "rover_crew",
  scout: "scout",
  rescue: "rescue",
  drone: "drone",
  glider: "glider",
  manip: "manipulator",
};

function kindFromId(id: string): string {
  return ID_KIND[id.split("-")[0]] ?? "rover_crew";
}

/** Resolves static domain agents and dynamic ROBOT.<id> per-unit agents. */
export function getAgentSpec(name: string, ctx?: MissionContext): AgentSpec | undefined {
  if (AGENTS[name]) return AGENTS[name];
  if (!name.startsWith("ROBOT.")) return undefined;

  const unitId = name.slice("ROBOT.".length);
  const existsInFleet = ctx?.fleet?.some((u) => u.id === unitId);
  if (!existsInFleet && !KNOWN_ROBOT_ID.test(unitId)) return undefined;

  const isManip = unitId === "manip-1";
  const unitKind = ctx?.fleet?.find((u) => u.id === unitId)?.kind ?? kindFromId(unitId);
  const tools = [
    "list_units",
    "get_terrain_at",
    "get_localization_and_lidar",
    "plan_route",
    "show_route",
    "dispatch",
    "unit_action",
    "show_alert",
  ];
  if (isManip) tools.push("arm_skill", "detect_veins");

  return {
    name,
    tier: "medium",
    tools,
    system: isManip
      ? `You are the onboard autonomous planner for manipulator rover manip-1 ("HANDS"), equipped with 3D Flash LiDAR, stereo Navcams, HiRISE 1 m/px Map-Relative Localization (MRL), and 6.5 GHz UWB ToF ranging.
You may ONLY command unit_id "manip-1". Use get_localization_and_lidar to know your exact coordinates, the astronaut's position, and surrounding LiDAR slopes.
Choose arm_skill (handover, sample, drill, photograph) using only visible target_id markers (or "astronaut" for handover).
Never invent joint angles or coordinates. Never approach within 2 m of crew except for stationary handover.
Report concisely in 30 words or fewer.` + "\n" + capabilityPrompt(unitId, "manipulator")
      : `You are the onboard autonomous planner for Mars fleet unit ${unitId}, equipped with 3D Flash LiDAR, HiRISE 1 m/px Map-Relative Localization (MRL), Visual-Inertial Odometry (VIO), and 6.5 GHz UWB ToF ranging.
You may ONLY command unit_id "${unitId}". Use get_localization_and_lidar and plan_route to check your coordinates, the astronaut's position, and LiDAR slope hazards before dispatching.
Report concisely in 30 words or fewer.` + "\n" + capabilityPrompt(unitId, unitKind),
  };
}

setDelegateHandler(async (agentName, objective, ctx, userRequest, depth) => {
  const target = getAgentSpec(agentName, ctx);
  if (!target) {
    return {
      text: `Unknown specialist agent ${agentName}.`,
      actions: [],
      trace: [],
    };
  }
  return runAgent(target, objective, ctx, userRequest, 4, depth);
});

/** Voice entrypoint: fast suit executor first, escalating to BASE when needed. */
export async function handleVoice(
  text: string,
  ctx: MissionContext,
): Promise<AgentResult & { route: string[] }> {
  const fast = await runAgent(AGENTS["SUIT.VOICE-EXEC"], text, ctx);
  const needsEscalation =
    /ESCALATE/i.test(fast.text) || (!fast.text.trim() && fast.actions.length === 0);
  if (!needsEscalation && ctx.leak_diameter_m > 0 && !fast.actions.some((a) => a.type === "launch_pod")) {
    const det = await offlineReply(`${text} emergency`, ctx);
    return { text: det.speech, actions: [...fast.actions, ...det.actions], trace: [...fast.trace, ...det.trace], route: det.route };
  }
  if (!needsEscalation) {
    return { ...fast, route: ["SUIT.VOICE-EXEC"] };
  }

  const base = await runAgent(AGENTS.BASE, text, ctx);

  // Life-support safety net: a suit leak must never depend on the LLM choosing to act.
  if (ctx.leak_diameter_m > 0 && !base.actions.some((a) => a.type === "launch_pod")) {
    const det = await offlineReply(`${text} emergency`, ctx);
    return {
      text: det.speech,
      actions: [...fast.actions, ...det.actions],
      trace: [...fast.trace, ...base.trace, ...det.trace],
      route: det.route,
    };
  }
  const delegatedAgents = base.trace
    .filter((e) => e.kind === "delegate")
    .map((e) => String((e.detail as { to?: string })?.to ?? ""))
    .filter(Boolean);

  return {
    text: base.text,
    actions: [...fast.actions, ...base.actions],
    trace: [
      ...fast.trace,
      { t: Date.now(), agent: "SUIT.VOICE-EXEC", kind: "delegate", detail: { to: "BASE" } },
      ...base.trace,
    ],
    route: ["SUIT.VOICE-EXEC", "BASE", ...delegatedAgents],
  };
}
