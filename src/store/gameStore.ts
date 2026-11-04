import { create } from "zustand";
import {
  Action,
  EngineEvent,
  GameState,
  PlayerClass,
  createRng,
  loadBalance,
  newGame,
  step,
  validateBalance,
  wallClock,
} from "../engine";
import { recipeName, t } from "../ui/content";

export const config = loadBalance();
validateBalance(config);

export interface Toast {
  id: number;
  text: string;
  tone: "info" | "good" | "warn";
}

interface GameStore {
  game: GameState | null;
  /** Wall time of the last tick, for countdowns. */
  now: number;
  selected: number | null;
  sellTarget: number | null;
  toasts: Toast[];
  /** Cell to flash briefly after a spawn/merge/craft; n changes to retrigger. */
  flash: { cell: number; n: number } | null;

  startGame(cls: PlayerClass): void;
  dispatch(action: Action): EngineEvent[];
  tick(): void;
  select(cell: number | null): void;
  requestSell(cell: number): void;
  confirmSell(): void;
  cancelSell(): void;
  dismissToast(id: number): void;
}

let toastId = 0;

function randomSeed(): number {
  const a = new Uint32Array(1);
  crypto.getRandomValues(a);
  return a[0];
}

export const useGame = create<GameStore>((set, get) => {
  function toast(text: string, tone: Toast["tone"] = "info") {
    const id = ++toastId;
    set(s => ({ toasts: [...s.toasts.slice(-2), { id, text, tone }] }));
    setTimeout(() => get().dismissToast(id), 2200);
  }

  function flashAt(cell: number) {
    set(s => ({ flash: { cell, n: (s.flash?.n ?? 0) + 1 } }));
  }

  function describe(events: EngineEvent[], game: GameState) {
    const cls = game.playerClass!;
    for (const e of events) {
      switch (e.type) {
        case "tap":
          if (e.feedback === "board_full") toast(t("boardFull"), "warn");
          else if (e.feedback === "no_charges") toast(t("noCharges"), "warn");
          else if (e.cell !== undefined) flashAt(e.cell);
          break;
        case "merged":
          flashAt(e.cell);
          if (e.critCell !== null) toast(t("mergeCrit"), "good");
          break;
        case "crafted":
          flashAt(e.cell);
          toast(t("crafted", { item: recipeName(e.recipeId, cls) }), "good");
          break;
        case "sold":
          toast(t("sold", { gold: e.gold }), "good");
          break;
        case "encounterCompleted":
          toast(t("encounterComplete", { gold: e.gold, xp: e.xp }), "good");
          break;
        case "encounterNotReady":
          toast(t("encounterNotReady"), "warn");
          break;
        default:
          break;
      }
    }
  }

  return {
    game: null,
    now: wallClock(),
    selected: null,
    sellTarget: null,
    toasts: [],
    flash: null,

    startGame(cls) {
      const now = wallClock();
      set({ game: newGame(cls, randomSeed(), config, now), now, selected: null });
    },

    dispatch(action) {
      const game = get().game;
      if (!game) return [];
      const now = wallClock();
      const rng = createRng(game.rngState);
      const result = step(game, action, { rng: rng.next, now, config });
      const next = { ...result.state, rngState: rng.getState() };
      set({ game: next, now });
      describe(result.events, next);
      return result.events;
    },

    tick() {
      if (!get().game) return;
      get().dispatch({ type: "TICK" });
    },

    select(cell) {
      set({ selected: cell });
    },

    requestSell(cell) {
      const game = get().game;
      const c = game?.grid[cell];
      if (!c) return;
      if (c.type === "generator") {
        toast(t("cannotSellGenerator"), "warn");
        return;
      }
      set({ sellTarget: cell });
    },

    confirmSell() {
      const cell = get().sellTarget;
      set({ sellTarget: null });
      if (cell === null) return;
      get().dispatch({ type: "SELL_ITEM", cell });
      set({ selected: null });
    },

    cancelSell() {
      set({ sellTarget: null });
    },

    dismissToast(id) {
      set(s => ({ toasts: s.toasts.filter(x => x.id !== id) }));
    },
  };
});
