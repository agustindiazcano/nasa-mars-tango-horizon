import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createContext, runInContext } from "node:vm";
import { describe, expect, it } from "vitest";

function reviewTool() {
  const source = readFileSync(resolve(__dirname, "../../../tools/veins/review.html"), "utf8").match(/<script>([\s\S]*?)<\/script>/)![1];
  const elements = new Map<string, Record<string, unknown>>();
  const element = (id: string) => {
    if (!elements.has(id)) elements.set(id, { value: "", disabled: true, replaceChildren() {}, append() {} });
    return elements.get(id)!;
  };
  const context = createContext({ document: { getElementById: element, addEventListener() {} }, window: { addEventListener() {} }, URL: { revokeObjectURL() {} } });
  runInContext(source, context);
  return { run: (s: string) => runInContext(s, context), element };
}

describe("standalone human label review", () => {
  it("imports pending labels without auto-review and preserves extra quoted fields", () => {
    const tool = reviewTool();
    const result = tool.run(`parseCsv('name,sol,vein,reviewed_by,note\\nphoto.jpg,925,1,,"rock, bright"\\n')`);
    expect(result.rows[0]).toMatchObject({ name: "photo.jpg", vein: "1", reviewed_by: "", note: "rock, bright" });
  });
  it("requires compatible headers and binary labels", () => {
    const tool = reviewTool();
    expect(() => tool.run(`parseCsv('name,sol,vein\\nphoto.jpg,925,1')`)).toThrow();
    expect(() => tool.run(`parseCsv('name,sol,vein,reviewed_by\\nphoto.jpg,925,maybe,')`)).toThrow();
  });
  it("exports pending rows and round-trips quoted reviewer identities", () => {
    const tool = reviewTool();
    tool.run(`({headers, rows} = parseCsv('name,sol,vein,reviewed_by\\nphoto.jpg,925,1,\\nother.jpg,926,0,')); rows[0].reviewed_by = 'Reviewer, A';`);
    const csv = tool.run("csvText()");
    expect(csv).toContain('"Reviewer, A"');
    expect(tool.run(`parseCsv(${JSON.stringify(csv)}).rows[1].reviewed_by`)).toBe("");
  });
  it("only records explicit accept/flip after reviewer identity and image availability", () => {
    const tool = reviewTool();
    tool.run(`({headers, rows} = parseCsv('name,sol,vein,reviewed_by\\nphoto.jpg,925,1,')); imageReady = true; updateActions(); review(true);`);
    expect(tool.run("rows[0].reviewed_by")).toBe("");
    tool.element("reviewer").value = "Reviewer A";
    tool.run("updateActions(); review(true)");
    expect(tool.run("rows[0].vein")).toBe("0");
    expect(tool.run("rows[0].reviewed_by")).toBe("Reviewer A");
  });
});
