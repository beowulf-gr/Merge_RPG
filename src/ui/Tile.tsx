import type { CellContent, GeneratorId, ItemId, GeneratorState } from "../engine";
import { tileStyle } from "./tileStyle";

export function ItemFace({ item }: { item: ItemId }) {
  return (
    <div className="tile tile-item" style={tileStyle(item.generator, item.chain, item.level)}>
      <span className="tile-chain">{item.chain.slice(-1)}</span>
      <span className="tile-level">{item.level}</span>
      {item.level >= 10 && <span className="tile-max" aria-hidden>★</span>}
    </div>
  );
}

export function RecipeFace({ recipeId }: { recipeId: string }) {
  const n = recipeId.replace(/\D/g, "");
  return (
    <div className="tile tile-recipe">
      <span className="tile-chain">R</span>
      <span className="tile-level">{n}</span>
    </div>
  );
}

export function GeneratorFace({ gen, state }: { gen: GeneratorId; state?: GeneratorState }) {
  const infinite = state ? !Number.isFinite(state.charges) : false;
  const frac = state && !infinite ? state.charges / state.maxCharges : 1;
  const empty = state && !infinite && state.charges <= 0;
  return (
    <div className={`tile tile-gen${empty ? " is-empty" : ""}`} style={tileStyle(gen)}>
      <span className="gen-label">{gen.replace("Gen", "G")}</span>
      {state && (
        <span className="gen-charges">{infinite ? "∞" : state.charges}</span>
      )}
      <span className="gen-bar">
        <span style={{ width: `${Math.round(frac * 100)}%` }} />
      </span>
    </div>
  );
}

export function CellFace({
  cell,
  generators,
}: {
  cell: CellContent;
  generators?: Record<GeneratorId, GeneratorState>;
}) {
  if (!cell) return null;
  if (cell.type === "item") return <ItemFace item={cell.item} />;
  if (cell.type === "recipe") return <RecipeFace recipeId={cell.recipeId} />;
  return <GeneratorFace gen={cell.generatorId} state={generators?.[cell.generatorId]} />;
}
