import { describe, it, expect } from "vitest";
import Ajv from "ajv";
import schema from "../content/items.schema.json";
import items from "../content/items.json";

const ajv = new Ajv({ strict: true });
const validate = ajv.compile(schema);

describe("items.json validation", () => {
  it("validates against items.schema.json", () => {
    const valid = validate(items);
    if (!valid) {
      console.error(ajv.errorsText(validate.errors));
    }
    expect(valid).toBe(true);
  });

  const classes = ["paladin", "rogue", "cleric", "wizard", "bard"] as const;

  for (const cls of classes) {
    it(`${cls}: Gen6 is named "Wondrous Items"`, () => {
      const classData = (items as Record<string, { generators: Record<string, { generatorName: string }> }>)[cls];
      expect(classData.generators["Gen6"].generatorName).toBe("Wondrous Items");
    });

    it(`${cls}: all chains have exactly 10 items`, () => {
      const classData = (items as Record<string, { generators: Record<string, { chains: Record<string, string[]> }> }>)[cls];
      for (const [genId, gen] of Object.entries(classData.generators)) {
        for (const [chainId, chain] of Object.entries(gen.chains)) {
          expect(chain).toHaveLength(10, `${cls} ${genId} ${chainId}`);
        }
      }
    });

    it(`${cls}: placeholder names are unique across all items`, () => {
      const classData = (items as Record<string, { generators: Record<string, { chains: Record<string, string[]> }> }>)[cls];
      const names: string[] = [];
      for (const gen of Object.values(classData.generators)) {
        for (const chain of Object.values(gen.chains)) {
          names.push(...chain);
        }
      }
      const unique = new Set(names);
      expect(unique.size).toBe(names.length);
    });
  }

  it("has a ui block", () => {
    expect((items as Record<string, unknown>).ui).toBeDefined();
  });
});
