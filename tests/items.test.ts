import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import Ajv from 'ajv';

const itemsPath  = resolve(__dirname, '../content/items.json');
const schemaPath = resolve(__dirname, '../content/items.schema.json');
const items  = JSON.parse(readFileSync(itemsPath,  'utf-8'));
const schema = JSON.parse(readFileSync(schemaPath, 'utf-8'));

const ajv = new Ajv({ strict: false });

describe('items.json schema validation', () => {
  it('validates against items.schema.json', () => {
    const validate = ajv.compile(schema);
    const valid = validate(items);
    if (!valid) console.error(ajv.errorsText(validate.errors));
    expect(valid).toBe(true);
  });
});

describe('items.json completeness', () => {
  const classes = ['paladin', 'rogue', 'cleric', 'wizard', 'bard'];
  const genChains: Record<string, string[]> = {
    Gen0: ['ChainA'],
    Gen1: ['ChainA', 'ChainB'],
    Gen2: ['ChainA', 'ChainB', 'ChainC'],
    Gen3: ['ChainA'],
    Gen4: ['ChainA', 'ChainB'],
    Gen5: ['ChainA', 'ChainB'],
    Gen6: ['ChainA'],
  };

  for (const cls of classes) {
    describe(`class: ${cls}`, () => {
      it('has className, skillName, skillDescription', () => {
        const c = items.classes[cls];
        expect(typeof c.className).toBe('string');
        expect(typeof c.skillName).toBe('string');
        expect(typeof c.skillDescription).toBe('string');
      });

      for (const [gen, chains] of Object.entries(genChains)) {
        it(`has generator ${gen}`, () => {
          expect(items.classes[cls].generators).toHaveProperty(gen);
        });

        for (const chain of chains) {
          it(`has ${gen} ${chain} with 10 items`, () => {
            const chainItems = items.classes[cls].generators[gen].chains[chain];
            expect(Array.isArray(chainItems)).toBe(true);
            expect(chainItems).toHaveLength(10);
            for (const name of chainItems) {
              expect(typeof name).toBe('string');
              expect(name.length).toBeGreaterThan(0);
            }
          });
        }
      }

      it('Gen6 generatorName is "Wondrous Items"', () => {
        expect(items.classes[cls].generators.Gen6.generatorName).toBe('Wondrous Items');
      });

      it('has at least 2 recipes', () => {
        expect(items.classes[cls].recipes.length).toBeGreaterThanOrEqual(2);
      });
    });
  }

  it('has top-level ui block', () => {
    expect(items).toHaveProperty('ui');
    expect(typeof items.ui).toBe('object');
  });
});
