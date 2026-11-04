import { useRef } from "react";
import { msUntilNextCharge, sellPrice } from "../engine";
import { config, useGame } from "../store/gameStore";
import { cellName, classContent, formatDuration, t } from "./content";
import { CellFace } from "./Tile";

export function Hud() {
  const game = useGame(s => s.game)!;
  const cls = classContent(game.playerClass!);
  return (
    <header className="hud">
      <div className="hud-class">
        <span className="hud-title">{t("appTitle")}</span>
        <span className="hud-sub">{cls.className}</span>
      </div>
      <dl className="hud-stats">
        <div className="stat stat-gold">
          <dt>{t("gold")}</dt>
          <dd>{game.gold.toLocaleString()}</dd>
        </div>
        <div className="stat stat-xp">
          <dt>{t("xp")}</dt>
          <dd>{game.xp.toLocaleString()}</dd>
        </div>
        <div className="stat stat-level">
          <dt>{t("playerLevel")}</dt>
          <dd>{game.playerLevel}</dd>
        </div>
      </dl>
    </header>
  );
}

export function SelectionPanel() {
  const game = useGame(s => s.game)!;
  const now = useGame(s => s.now);
  const selected = useGame(s => s.selected);
  const requestSell = useGame(s => s.requestSell);
  const cls = game.playerClass!;
  const cell = selected !== null ? game.grid[selected] : null;

  if (!cell || selected === null) {
    return (
      <section className="panel panel-hint">
        <p>{t("boardHint")}</p>
      </section>
    );
  }

  let detail: string;
  let canSell = false;
  if (cell.type === "generator") {
    const gen = game.generators[cell.generatorId];
    if (!Number.isFinite(gen.charges)) detail = t("chargesInfinite");
    else {
      const next = msUntilNextCharge(gen, now, game.upgrades, config);
      detail =
        t("charges", { charges: gen.charges, max: gen.maxCharges }) +
        " · " +
        (next === null ? t("chargesFull") : t("nextCharge", { time: formatDuration(next) }));
    }
  } else if (cell.type === "recipe") {
    detail = t("recipeItem");
    canSell = true;
  } else {
    detail = t("itemLevel", { level: cell.item.level });
    canSell = true;
  }

  const price = sellPrice(cell, config);

  return (
    <section className="panel panel-selection">
      <div className="panel-tile">
        <CellFace cell={cell} generators={game.generators} />
      </div>
      <div className="panel-text">
        <strong>{cellName(cell, cls)}</strong>
        <span>{cell.type === "generator" ? `${t("generator")} · ${detail}` : detail}</span>
      </div>
      {canSell && price !== null && (
        <button className="btn btn-gold btn-sm" onClick={() => requestSell(selected)}>
          {t("sell")} · {price}
        </button>
      )}
    </section>
  );
}

export function SellDialog() {
  const game = useGame(s => s.game);
  const target = useGame(s => s.sellTarget);
  const confirmSell = useGame(s => s.confirmSell);
  const cancelSell = useGame(s => s.cancelSell);
  const backdropPress = useRef(false);
  if (!game || target === null) return null;
  const cell = game.grid[target];
  const price = sellPrice(cell, config);
  if (!cell || price === null) return null;
  const name = cellName(cell, game.playerClass!);

  return (
    <div
      className="modal-backdrop"
      // Close only when the press both starts and ends on the backdrop, so the
      // click that opened the dialog (or a touch ghost-click) can't dismiss it.
      onPointerDown={e => {
        backdropPress.current = e.target === e.currentTarget;
      }}
      onClick={e => {
        if (backdropPress.current && e.target === e.currentTarget) cancelSell();
        backdropPress.current = false;
      }}
    >
      <div
        className="modal merchant"
        role="dialog"
        aria-modal="true"
        aria-labelledby="sell-title"
        onClick={e => e.stopPropagation()}
      >
        <div className="merchant-emblem" aria-hidden>
          <span>⚖</span>
        </div>
        <h2 id="sell-title">{t("sellTitle")}</h2>
        <div className="merchant-item">
          <CellFace cell={cell} />
        </div>
        <p>{t("sellBody", { gold: price, item: name })}</p>
        <div className="modal-actions">
          <button className="btn btn-ghost" onClick={cancelSell} autoFocus>
            {t("sellCancel")}
          </button>
          <button className="btn btn-gold" onClick={confirmSell}>
            {t("sellConfirm", { gold: price })}
          </button>
        </div>
      </div>
    </div>
  );
}

export function Toasts() {
  const toasts = useGame(s => s.toasts);
  return (
    <div className="toasts" aria-live="polite">
      {toasts.map(x => (
        <div key={x.id} className={`toast toast-${x.tone}`}>
          {x.text}
        </div>
      ))}
    </div>
  );
}
