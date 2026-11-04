import { goldMultiplierFor, heldCounts, parseItemKey, planFulfilment } from "../engine";
import type { Encounter } from "../engine";
import { config, useGame } from "../store/gameStore";
import { getDisplay, t } from "./content";
import { ItemFace } from "./Tile";

function EncounterCard({ enc }: { enc: Encounter }) {
  const game = useGame(s => s.game)!;
  const dispatch = useGame(s => s.dispatch);
  const cls = game.playerClass!;
  const ready = planFulfilment(enc, game.grid, game.inventory) !== null;
  const counts = heldCounts(enc, game.grid, game.inventory);
  const gold = Math.round(enc.rewards.gold * goldMultiplierFor(game.upgrades, config));

  return (
    <article className={`encounter diff-${enc.difficulty.toLowerCase()}${ready ? " is-ready" : ""}`}>
      <header>
        <span className="diff-chip">{t(`difficulty${enc.difficulty}`)}</span>
        <button
          className="icon-btn"
          aria-label={t("dismissEncounter")}
          title={t("dismissEncounter")}
          onClick={() => dispatch({ type: "DISMISS_ENCOUNTER", encounterId: enc.id })}
        >
          ×
        </button>
      </header>
      <ul className="req-list">
        {[...counts.entries()].map(([key, { need, have }]) => {
          const item = parseItemKey(key);
          return (
            <li key={key} className={have >= need ? "has" : ""} title={getDisplay(item, cls)}>
              <div className="req-tile">
                <ItemFace item={item} />
                {have >= need && <span className="req-check" aria-hidden>✓</span>}
              </div>
              {need > 1 && <span className="req-count">{have}/{need}</span>}
            </li>
          );
        })}
      </ul>
      <footer>
        <span className="rewards">{t("rewards", { gold, xp: enc.rewards.xp })}</span>
        <button
          className="btn btn-primary btn-sm"
          disabled={!ready}
          onClick={() => dispatch({ type: "COMPLETE_ENCOUNTER", encounterId: enc.id })}
        >
          {t("completeEncounter")}
        </button>
      </footer>
    </article>
  );
}

export function OrderBoard() {
  const encounters = useGame(s => s.game!.encounters);
  return (
    <section className="order-board" aria-label={t("orderBoard")}>
      <h2>{t("orderBoard")}</h2>
      <div className="encounter-row">
        {encounters.map(e => (
          <EncounterCard key={e.id} enc={e} />
        ))}
      </div>
    </section>
  );
}
