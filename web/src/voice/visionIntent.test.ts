import { describe, expect, it } from "vitest";
import { isVisionQuestion } from "./visionIntent";

describe("visionIntent (web)", () => {
  const visionQueries = [
    "What do you see?",
    "what does the rover see",
    "What does rover 2 see?",
    "read the sign",
    "read that sign",
    "camera view",
    "show me the camera",
    "show camera",
    "show me the rover 2 camera",
    "Rover 2, qué ves",
    "¿Qué ve el rover dos?",
    "qué ves?",
    "leé el cartel",
    "leer el cartel",
    "vista de la cámara",
    "vista de camara",
    "mostrame la cámara del rover",
    "ver la cámara",
  ];

  it.each(visionQueries)("detects vision question %j", (phrase) => {
    expect(isVisionQuestion(phrase)).toBe(true);
  });

  const nonVisionCommands = [
    "Rover two, go to site 3",
    "Rover dos, relevá la zona del norte",
    "Rover uno, seguime",
    "Drone uno despegá y fotografiá la zona",
    "Show me the map",
    "show the thermal layer",
    "Mostrá la capa térmica",
    "Plan a route to site 2",
    "planificá una ruta",
    "How much oxygen do I have left",
    "read the telemetry",
    "sign the checklist",
    "the camera is dusty",
    "A qué velocidad va el rover",
    "qué vehículo está más cerca",
    "cómo están mis signos",
  ];

  it.each(nonVisionCommands)("discriminates non-vision command %j", (phrase) => {
    expect(isVisionQuestion(phrase)).toBe(false);
  });
});
