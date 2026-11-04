import { useEffect, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import { canMerge, findRecipeForPair } from "../engine";
import { config, useGame } from "../store/gameStore";
import { CellFace } from "./Tile";

const DRAG_THRESHOLD_PX = 6;

interface DragState {
  from: number;
  pointerId: number;
  x0: number;
  y0: number;
  x: number;
  y: number;
  active: boolean;
  over: number | null;
  size: number;
}

function cellAt(x: number, y: number): number | null {
  const el = document.elementFromPoint(x, y)?.closest<HTMLElement>("[data-cell]");
  return el ? Number(el.dataset.cell) : null;
}

export function Board() {
  const game = useGame(s => s.game)!;
  const selected = useGame(s => s.selected);
  const flash = useGame(s => s.flash);
  const dispatch = useGame(s => s.dispatch);
  const select = useGame(s => s.select);
  const [drag, setDragState] = useState<DragState | null>(null);
  // The ref is the source of truth during a gesture; state only drives rendering.
  const dragRef = useRef<DragState | null>(null);
  const detachRef = useRef<(() => void) | null>(null);

  function setDrag(d: DragState | null) {
    dragRef.current = d;
    setDragState(d);
  }

  useEffect(() => () => detachRef.current?.(), []);

  function finish(e: PointerEvent) {
    const d = dragRef.current;
    detachRef.current?.();
    detachRef.current = null;
    setDrag(null);
    if (!d || e.type === "pointercancel") return;

    const state = useGame.getState();
    const g = state.game;
    if (!g) return;

    if (!d.active) {
      const cell = g.grid[d.from];
      if (cell?.type === "generator") {
        dispatch({ type: "TAP_GENERATOR", generatorId: cell.generatorId });
        select(d.from);
      } else {
        select(state.selected === d.from ? null : d.from);
      }
      return;
    }

    const to = cellAt(e.clientX, e.clientY);
    if (to === null || to === d.from) return;
    // Whatever happens (move, swap, merge, craft) the dragged thing ends up at `to`.
    dispatch({ type: "DROP_ITEM", from: d.from, to });
    select(to);
  }

  function onPointerDown(e: ReactPointerEvent<HTMLDivElement>, index: number) {
    if (!game.grid[index] || e.button > 0 || dragRef.current) return;
    e.preventDefault();
    const pid = e.pointerId;
    const rect = e.currentTarget.getBoundingClientRect();
    setDrag({
      from: index,
      pointerId: pid,
      x0: e.clientX,
      y0: e.clientY,
      x: e.clientX,
      y: e.clientY,
      active: false,
      over: null,
      size: rect.width,
    });

    const onMove = (ev: PointerEvent) => {
      const d = dragRef.current;
      if (!d || ev.pointerId !== pid) return;
      const active = d.active || Math.hypot(ev.clientX - d.x0, ev.clientY - d.y0) > DRAG_THRESHOLD_PX;
      setDrag({ ...d, x: ev.clientX, y: ev.clientY, active, over: active ? cellAt(ev.clientX, ev.clientY) : null });
    };
    const onEnd = (ev: PointerEvent) => {
      if (ev.pointerId === pid) finish(ev);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onEnd);
    window.addEventListener("pointercancel", onEnd);
    detachRef.current = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onEnd);
      window.removeEventListener("pointercancel", onEnd);
    };
  }

  const dragCell = drag?.active ? game.grid[drag.from] : null;

  function dropHint(index: number): string {
    if (!drag?.active || drag.over !== index || index === drag.from) return "";
    const src = game.grid[drag.from];
    const dst = game.grid[index];
    if (src?.type === "item" && dst?.type === "item") {
      if (canMerge(src.item, dst.item)) return " drop-merge";
      if (findRecipeForPair(src.item, dst.item, config)) return " drop-craft";
    }
    return " drop-move";
  }

  return (
    <>
      <div className="board" role="grid" aria-label="Board">
        {game.grid.map((cell, i) => (
          <div
            key={i}
            data-cell={i}
            role="gridcell"
            className={
              "cell" +
              (selected === i ? " is-selected" : "") +
              (drag?.active && drag.from === i ? " is-dragging" : "") +
              (flash?.cell === i ? " is-flash" : "") +
              dropHint(i)
            }
            onPointerDown={e => onPointerDown(e, i)}
          >
            <CellFace key={flash?.cell === i ? flash.n : undefined} cell={cell} generators={game.generators} />
          </div>
        ))}
      </div>
      {drag?.active && dragCell && (
        <div
          className="drag-ghost"
          style={{
            width: drag.size,
            height: drag.size,
            transform: `translate(${drag.x - drag.size / 2}px, ${drag.y - drag.size / 2}px)`,
          }}
        >
          <CellFace cell={dragCell} generators={game.generators} />
        </div>
      )}
    </>
  );
}
