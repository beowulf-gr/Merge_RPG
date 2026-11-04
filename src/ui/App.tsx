import { useEffect } from "react";
import { useGame } from "../store/gameStore";
import { Board } from "./Board";
import { CLASSES, classContent, t } from "./content";
import { OrderBoard } from "./OrderBoard";
import { Hud, SelectionPanel, SellDialog, Toasts } from "./Panels";
import { tileStyle } from "./tileStyle";

const CLASS_TINT: Record<string, Parameters<typeof tileStyle>[0]> = {
  paladin: "Gen5", rogue: "Gen4", cleric: "Gen3", wizard: "Gen2", bard: "Gen1",
};

function ClassSelect() {
  const startGame = useGame(s => s.startGame);
  return (
    <main className="class-select">
      <h1>{t("appTitle")}</h1>
      <h2>{t("chooseClassTitle")}</h2>
      <p className="muted">{t("chooseClassHint")}</p>
      <div className="class-grid">
        {CLASSES.map(cls => {
          const c = classContent(cls);
          return (
            <button key={cls} className="class-card" onClick={() => startGame(cls)}>
              <span className="class-crest" style={tileStyle(CLASS_TINT[cls])}>
                {c.className.slice(0, 1)}
              </span>
              <span className="class-name">{c.className}</span>
              <span className="class-skill">{c.skillName}</span>
              <span className="class-desc">{c.skillDescription}</span>
              <span className="class-play">{t("playAs", { class: c.className })}</span>
            </button>
          );
        })}
      </div>
    </main>
  );
}

function GameScreen() {
  const tick = useGame(s => s.tick);
  useEffect(() => {
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [tick]);

  return (
    <main className="game">
      <Hud />
      <OrderBoard />
      <Board />
      <SelectionPanel />
      <SellDialog />
    </main>
  );
}

export default function App() {
  const hasGame = useGame(s => s.game !== null);
  return (
    <>
      {hasGame ? <GameScreen /> : <ClassSelect />}
      <Toasts />
    </>
  );
}
