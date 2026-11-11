"use client";

import { ChevronDown, ChevronUp, Plus, Trash2 } from "lucide-react";
import RichTextArea from "./RichTextArea";

export type WorkOption = {
  id: string;
  label: string;
  intrinsicValue: string | null;
  currency: string;
  title: string;
  city: string;
  approxAge: string | null;
  dimensions: string | null;
  pileMaterial: string | null;
  condition: string | null;
};

/** One row of the lots editor. Strings throughout — it is form state. */
export type LotDraft = {
  artworkId: string;
  startingPrice: string;
  lotNumber: string;
  lotName: string;
  origin: string;
  era: string;
  lotDimensions: string;
  materials: string;
  weave: string;
  condition: string;
  estimateLow: string;
  estimateHigh: string;
  publishedReserve: string;
  lotNote: string;
};

export function emptyLot(lotNumber = ""): LotDraft {
  return {
    artworkId: "",
    startingPrice: "",
    lotNumber,
    lotName: "",
    origin: "",
    era: "",
    lotDimensions: "",
    materials: "",
    weave: "",
    condition: "",
    estimateLow: "",
    estimateHigh: "",
    publishedReserve: "",
    lotNote: "",
  };
}

/** Only the filled-in fields travel to the server; blanks mean "not recorded". */
export function lotsToPayload(lots: LotDraft[]) {
  return lots
    .filter((l) => l.artworkId)
    .map((l) => {
      const out: Record<string, string | number> = { artworkId: l.artworkId };
      const num = (k: keyof LotDraft) => {
        const v = l[k];
        if (v !== "" && Number.isFinite(Number(v))) out[k] = Number(v);
      };
      const txt = (k: keyof LotDraft) => {
        const v = l[k].trim();
        if (v) out[k] = v;
      };
      num("startingPrice");
      num("lotNumber");
      num("estimateLow");
      num("estimateHigh");
      num("publishedReserve");
      txt("lotName");
      txt("origin");
      txt("era");
      txt("lotDimensions");
      txt("materials");
      txt("weave");
      txt("condition");
      txt("lotNote");
      return out;
    });
}

const inputCls =
  "w-full rounded-lg border border-border bg-void px-3 py-2 text-silk outline-none transition-colors focus:border-gold";
const labelCls = "mb-1.5 block text-sm text-cream/80";
const hintCls = "mt-1 text-xs text-muted";
const iconBtn =
  "rounded-lg border border-border p-1.5 text-cream/60 transition-colors hover:border-gold/50 hover:text-gold-light disabled:opacity-40";

export default function AuctionLotsEditor({
  works,
  lots,
  onChange,
  currency,
}: {
  works: WorkOption[];
  lots: LotDraft[];
  onChange: (lots: LotDraft[]) => void;
  currency: string;
}) {
  // a work already chosen on another row must not be offered again
  const takenBy = new Map(lots.map((l, i) => [l.artworkId, i]));

  const patch = (i: number, p: Partial<LotDraft>) =>
    onChange(lots.map((l, k) => (k === i ? { ...l, ...p } : l)));

  const pickWork = (i: number, id: string) => {
    const w = works.find((x) => x.id === id);
    const l = lots[i];
    // carry across what the work already records, without overwriting
    // anything the admin has typed on this row
    patch(i, {
      artworkId: id,
      lotName: l.lotName || w?.title || "",
      origin: l.origin || w?.city || "",
      era: l.era || w?.approxAge || "",
      lotDimensions: l.lotDimensions || w?.dimensions || "",
      materials: l.materials || w?.pileMaterial || "",
      condition: l.condition || w?.condition || "",
      startingPrice: l.startingPrice || w?.intrinsicValue || "",
    });
  };

  const move = (i: number, dir: -1 | 1) => {
    const to = i + dir;
    if (to < 0 || to >= lots.length) return;
    const next = [...lots];
    [next[i], next[to]] = [next[to], next[i]];
    onChange(next);
  };

  const add = () => {
    // suggest the next lot number, continuing whatever run is on screen
    const highest = lots.reduce(
      (m, l) => Math.max(m, Number(l.lotNumber) || 0),
      0
    );
    onChange([...lots, emptyLot(highest ? String(highest + 1) : "")]);
  };

  return (
    <div className="space-y-5">
      {lots.map((lot, i) => {
        const chosen = works.find((w) => w.id === lot.artworkId) ?? null;
        return (
          <div
            key={i}
            className="rounded-lg border border-gold/15 bg-void/40 p-5"
          >
            <div className="mb-4 flex items-center justify-between gap-3">
              <p className="text-[10px] tracking-[0.3em] text-gold/70">
                {lot.lotNumber ? `LOT ${lot.lotNumber}` : `CARPET ${i + 1}`}
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  title="Move up"
                  disabled={i === 0}
                  onClick={() => move(i, -1)}
                  className={iconBtn}
                >
                  <ChevronUp className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  title="Move down"
                  disabled={i === lots.length - 1}
                  onClick={() => move(i, 1)}
                  className={iconBtn}
                >
                  <ChevronDown className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  title="Remove this carpet"
                  disabled={lots.length === 1}
                  onClick={() => onChange(lots.filter((_, k) => k !== i))}
                  className={`${iconBtn} hover:border-crimson/60 hover:text-crimson-light`}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_120px_140px]">
              <div>
                <label className={labelCls}>Work *</label>
                <select
                  value={lot.artworkId}
                  onChange={(e) => pickWork(i, e.target.value)}
                  className={inputCls}
                >
                  <option value="">Select a work…</option>
                  {works.map((w) => {
                    const owner = takenBy.get(w.id);
                    const taken = owner !== undefined && owner !== i;
                    return (
                      <option key={w.id} value={w.id} disabled={taken}>
                        {w.label}
                        {taken ? " · already in this session" : ""}
                      </option>
                    );
                  })}
                </select>
              </div>
              <div>
                <label className={labelCls}>Lot no.</label>
                <input
                  type="number" min="1" step="1" dir="ltr"
                  value={lot.lotNumber}
                  onChange={(e) => patch(i, { lotNumber: e.target.value })}
                  placeholder="25"
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Starting price</label>
                <input
                  type="number" step="0.01" min="0" dir="ltr"
                  value={lot.startingPrice}
                  onChange={(e) => patch(i, { startingPrice: e.target.value })}
                  placeholder="4500"
                  className={inputCls}
                />
                {chosen?.intrinsicValue && (
                  <p className={hintCls}>From the appraisal — change it freely.</p>
                )}
              </div>
            </div>

            <div className="mt-3">
              <label className={labelCls}>Name</label>
              <input
                value={lot.lotName}
                onChange={(e) => patch(i, { lotName: e.target.value })}
                placeholder="Antique Qashqai Carpet"
                className={inputCls}
              />
            </div>

            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className={labelCls}>Origin</label>
                <input
                  value={lot.origin}
                  onChange={(e) => patch(i, { origin: e.target.value })}
                  placeholder="Fars, Iran"
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Era</label>
                <input
                  value={lot.era}
                  onChange={(e) => patch(i, { era: e.target.value })}
                  placeholder="1920s"
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Dimensions</label>
                <input
                  dir="ltr"
                  value={lot.lotDimensions}
                  onChange={(e) => patch(i, { lotDimensions: e.target.value })}
                  placeholder="218 × 145 cm"
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Weave</label>
                <input
                  value={lot.weave}
                  onChange={(e) => patch(i, { weave: e.target.value })}
                  placeholder="Hand-knotted"
                  className={inputCls}
                />
              </div>
            </div>

            <div className="mt-3">
              <label className={labelCls}>Materials</label>
              <input
                value={lot.materials}
                onChange={(e) => patch(i, { materials: e.target.value })}
                placeholder="Hand-spun wool pile on wool foundation"
                className={inputCls}
              />
            </div>

            <div className="mt-3">
              <label className={labelCls}>Condition</label>
              <input
                value={lot.condition}
                onChange={(e) => patch(i, { condition: e.target.value })}
                placeholder="Very good for age, with expected minor signs of use"
                className={inputCls}
              />
            </div>

            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div>
                <label className={labelCls}>Estimate — low</label>
                <input
                  type="number" step="0.01" min="0" dir="ltr"
                  value={lot.estimateLow}
                  onChange={(e) => patch(i, { estimateLow: e.target.value })}
                  placeholder="2500"
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Estimate — high</label>
                <input
                  type="number" step="0.01" min="0" dir="ltr"
                  value={lot.estimateHigh}
                  onChange={(e) => patch(i, { estimateHigh: e.target.value })}
                  placeholder="4000"
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Published reserve</label>
                <input
                  type="number" step="0.01" min="0" dir="ltr"
                  value={lot.publishedReserve}
                  onChange={(e) => patch(i, { publishedReserve: e.target.value })}
                  placeholder="1200"
                  className={inputCls}
                />
                <p className={hintCls}>Blank keeps it private.</p>
              </div>
            </div>

            <div className="mt-3">
              <label className={labelCls}>Lot note</label>
              <RichTextArea
                rows={3}
                value={lot.lotNote}
                onChange={(v) => patch(i, { lotNote: v })}
                placeholder="Provenance, restoration history, anything a bidder should know…"
                className={inputCls}
              />
            </div>

            {(lot.estimateLow || lot.publishedReserve) && (
              <p className="mt-3 text-xs text-gold">
                {lot.estimateLow &&
                  `Estimated Value: ${currency} ${lot.estimateLow}${
                    lot.estimateHigh ? `–${lot.estimateHigh}` : ""
                  }`}
                {lot.estimateLow && lot.publishedReserve ? "   ·   " : ""}
                {lot.publishedReserve &&
                  `Published Reserve: ${currency} ${lot.publishedReserve}`}
              </p>
            )}
          </div>
        );
      })}

      <button
        type="button"
        onClick={add}
        className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-gold/35 px-4 py-3 text-sm text-gold-light transition-colors hover:border-gold hover:bg-gold/5"
      >
        <Plus className="h-4 w-4" />
        Add another carpet to this session
      </button>
    </div>
  );
}
