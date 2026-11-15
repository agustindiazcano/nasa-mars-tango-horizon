import { afterEach, describe, expect, it, vi } from "vitest";
import {
  categorizeProvenanceKey,
  fetchProvenanceManifest,
  formatProvenanceUrl,
  parseProvenanceManifest,
} from "../provenance";

const VALID_SAMPLE = {
  "terrain/height_2048.u16": {
    source: "USGS Astrogeology, MRO HiRISE SOCET DTMs",
    product_id: "DTEEC_009149_1750_009294_1750_U01",
    url: "https://astrogeo-ard.s3-us-west-2.amazonaws.com/mars/mro/hirise/controlled/dtm/PSP_009149_1750_PSP_009294_1750/DTEEC_009149_1750_009294_1750_U01.tif",
    transform: "4000 m square window centered at (137.4000E, -4.7450N), bilinear resample to 2048x2048 uint16",
    retrieved: "2026-11-14",
  },
  "models/rover.glb": {
    source: "NASA 3D Resources (Mars 2020 Perseverance Rover)",
    product_id: "rover",
    url: "https://raw.githubusercontent.com/nasa/NASA-3D-Resources/master/3D%20Models/Mars%202020%20Perseverance%20Rover/Mars%202020%20Perseverance%20Rover.glb",
    transform: "Copied binary glTF (.glb) asset without geometry modification",
    retrieved: "2026-11-14",
  },
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("parseProvenanceManifest", () => {
  it("parses valid provenance manifest entries", () => {
    const parsed = parseProvenanceManifest(VALID_SAMPLE);
    expect(Object.keys(parsed)).toEqual(["terrain/height_2048.u16", "models/rover.glb"]);
    expect(parsed["terrain/height_2048.u16"].product_id).toBe("DTEEC_009149_1750_009294_1750_U01");
  });

  it("accepts datasets array when url is omitted", () => {
    const parsed = parseProvenanceManifest({
      "terrain/hydration_meta.json": {
        source: "MSL DAN + CRISM + CTX",
        product_id: "tango-horizon-hydration-v1",
        datasets: [{ id: "msldan", url: "https://pds-geosciences.wustl.edu/msl/" }],
        transform: "GroupKFold CV",
        retrieved: "2026-11-14",
      },
    });
    expect(parsed["terrain/hydration_meta.json"].datasets).toHaveLength(1);
  });

  it("keeps the optional license text", () => {
    const parsed = parseProvenanceManifest({
      "models/rover-1.glb": {
        source: "Project owner (original 3D model)",
        product_id: "rover-1",
        datasets: [{ id: "owner-created" }],
        license: "Created by the project owner; all rights held by the owner; personal use",
        transform: "Simplified",
        retrieved: "2026-11-15",
      },
    });
    expect(parsed["models/rover-1.glb"].license).toMatch(/project owner/);
  });

  it("rejects non-object, empty manifests, or incomplete entries", () => {
    expect(() => parseProvenanceManifest(null)).toThrow(/JSON object/);
    expect(() => parseProvenanceManifest({})).toThrow(/not be empty/);
    expect(() =>
      parseProvenanceManifest({
        "env/ephem.json": { source: "JPL", product_id: "x", transform: "t", retrieved: "2026-11-14" },
      }),
    ).toThrow(/url.*datasets/);
  });
});

describe("categorizeProvenanceKey and formatProvenanceUrl", () => {
  it("categorizes asset keys by directory prefix", () => {
    expect(categorizeProvenanceKey("terrain/meta.json")).toBe("terrain");
    expect(categorizeProvenanceKey("env/rems_clear.json")).toBe("env");
    expect(categorizeProvenanceKey("veins/manifest.json")).toBe("veins");
    expect(categorizeProvenanceKey("models/ingenuity.glb")).toBe("models");
    expect(categorizeProvenanceKey("other.json")).toBe("other");
  });

  it("allows only http and https URLs", () => {
    expect(formatProvenanceUrl("https://mars.nasa.gov/api/v1/")).toBe("https://mars.nasa.gov/api/v1/");
    expect(formatProvenanceUrl("http://example.org/data")).toBe("http://example.org/data");
    expect(formatProvenanceUrl("javascript:alert(1)")).toBeNull();
    expect(formatProvenanceUrl("not a url")).toBeNull();
    expect(formatProvenanceUrl(undefined)).toBeNull();
  });
});

describe("fetchProvenanceManifest", () => {
  it("fetches and validates provenance.json", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify(VALID_SAMPLE), { status: 200 })),
    );
    const manifest = await fetchProvenanceManifest("/data/provenance.json");
    expect(manifest["models/rover.glb"].source).toContain("NASA 3D Resources");
  });

  it("throws on non-ok HTTP responses", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("Not Found", { status: 404 })),
    );
    await expect(fetchProvenanceManifest("/data/provenance.json")).rejects.toThrow(/HTTP 404/);
  });
});
