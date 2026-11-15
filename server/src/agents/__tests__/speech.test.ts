import { describe, expect, it } from "vitest";
import { plainSpeech } from "../speech.js";

describe("plainSpeech", () => {
  it("strips Markdown emphasis, code and headings", () => {
    expect(plainSpeech("Weather is **GO WITH CHANGES** for `rover-1`.")).toBe("Weather is GO WITH CHANGES for rover-1.");
    expect(plainSpeech("## Status\n- O2 at 1.08 kg\n- tau 0.48")).toBe("Status O2 at 1.08 kg tau 0.48");
  });

  it("turns LaTeX into speakable text", () => {
    expect(plainSpeech("Dust opacity $\\tau$ = 2.20 exceeds 1.8.")).toBe("Dust opacity tau = 2.20 exceeds 1.8.");
    expect(plainSpeech("Slope 12.27$^\\circ$, CO$_{2}$ nominal")).toBe("Slope 12.27 degrees, CO2 nominal");
  });

  it("leaves plain replies, negative coordinates and unit ids untouched", () => {
    const s = "Ruta a (100, -200): 348.7 m, 5.81 min, 0.0079 kg O2.";
    expect(plainSpeech(s)).toBe(s);
    expect(plainSpeech("rover_crew unit rescue-1 at x = -120 m")).toBe("rover_crew unit rescue-1 at x = -120 m");
  });
});
