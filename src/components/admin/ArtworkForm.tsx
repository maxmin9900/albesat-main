"use client";

import { useActionState, useRef, useState, useTransition } from "react";
import { saveArtwork, type SaveState } from "@/app/admin/(panel)/collection/actions";
import {
  createCategory,
  createCity,
  type TaxonomyResult,
} from "@/app/admin/(panel)/taxonomy/actions";
import { IMAGE_TYPE } from "@/lib/labels";
import { isVideoUrl } from "@/lib/utils";
import { Trash2, Plus, UploadCloud, Loader2, X } from "lucide-react";
import { Zoomable } from "@/components/ui/Lightbox";
import RichTextArea from "./RichTextArea";

type ImageItem = { url: string; type: string };

export type ArtworkFormData = {
  id?: string;
  code?: string;
  title?: string;
  city?: string;
  category?: string;
  price?: string;
  currency?: string;
  intrinsicValue?: string;
  intrinsicValueSource?: string;
  lengthCm?: string;
  widthCm?: string;
  pileMaterial?: string;
  approxAge?: string;
  description?: string;
  status?: string;
  images?: ImageItem[];
  dossier?: Record<string, string | null>;
};

const inputCls =
  "w-full rounded-lg border border-border bg-void px-3 py-2 text-silk outline-none transition-colors focus:border-gold";
const labelCls = "mb-1.5 block text-sm text-cream/80";
// same label, in a row that supplies its own bottom margin
const rowLabelCls = "block text-sm text-cream/80";

export default function ArtworkForm({
  data,
  cities = [],
  categories = [],
}: {
  data?: ArtworkFormData;
  /** the weaving cities, managed at /admin/taxonomy */
  cities?: string[];
  /** the style categories, managed at /admin/taxonomy */
  categories?: string[];
}) {
  const [state, formAction, pending] = useActionState<SaveState, FormData>(
    saveArtwork,
    {}
  );
  // both lists grow in place when a new entry is added from the pickers below
  const [cityList, setCityList] = useState(cities);
  const [categoryList, setCategoryList] = useState(categories);
  const [city, setCity] = useState(data?.city ?? "");
  const [category, setCategory] = useState(data?.category ?? "");
  const [images, setImages] = useState<ImageItem[]>(data?.images ?? []);
  const [newUrl, setNewUrl] = useState("");
  const [newType, setNewType] = useState("GALLERY");
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<{
    name: string;
    index: number;
    total: number;
    percent: number;
  } | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dossier = data?.dossier ?? {};

  const addImage = () => {
    if (!newUrl.trim()) return;
    setImages((prev) => [...prev, { url: newUrl.trim(), type: newType }]);
    setNewUrl("");
  };

  /**
   * POST one file and resolve with its stored URL.
   *
   * XMLHttpRequest rather than fetch(): fetch cannot report upload progress,
   * and a full-resolution photo or a video over a slow line otherwise looks
   * like the panel has frozen.
   */
  const putFile = (file: File, onProgress: (percent: number) => void) =>
    new Promise<string>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("POST", "/api/admin/upload");
      xhr.timeout = 0; // a large video may legitimately take minutes

      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          onProgress(Math.round((e.loaded / e.total) * 100));
        }
      };

      xhr.onload = () => {
        let json: { url?: string; error?: string } = {};
        try {
          json = JSON.parse(xhr.responseText);
        } catch {
          /* a proxy error page is not JSON */
        }
        if (xhr.status === 413) {
          // nginx refused the body before it ever reached the app
          reject(
            new Error(
              `"${file.name}" was rejected by the web server as too large. ` +
                "Raise client_max_body_size in the nginx config."
            )
          );
        } else if (xhr.status >= 200 && xhr.status < 300 && json.url) {
          resolve(json.url);
        } else {
          reject(
            new Error(json.error ?? `Upload failed (HTTP ${xhr.status})`)
          );
        }
      };

      xhr.onerror = () =>
        reject(new Error(`Connection lost while uploading "${file.name}".`));

      const body = new FormData();
      body.append("file", file);
      xhr.send(body);
    });

  // upload one or more picked/dropped files, appending each as new media
  const uploadFiles = async (files: FileList | File[]) => {
    const list = Array.from(files).filter(
      (f) => f.type.startsWith("image/") || f.type.startsWith("video/")
    );
    if (list.length === 0) return;
    setUploading(true);
    setUploadError(null);
    try {
      for (const [i, file] of list.entries()) {
        setProgress({ name: file.name, index: i + 1, total: list.length, percent: 0 });
        const url = await putFile(file, (percent) =>
          setProgress({ name: file.name, index: i + 1, total: list.length, percent })
        );
        setImages((prev) => [...prev, { url, type: newType }]);
      }
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
      setProgress(null);
    }
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files?.length) uploadFiles(e.dataTransfer.files);
  };

  const err = (f: string) => state.fieldErrors?.[f];

  // A work saved before the city list changed — or filed under a city that has
  // since been hidden — keeps its old value as an extra option, so opening it
  // for editing never silently rewrites the city or the category.
  const legacyCity = city && !cityList.includes(city) ? city : null;
  const legacyCategory =
    category && !categoryList.includes(category) ? category : null;

  return (
    <form action={formAction} className="space-y-8 pb-16">
      {data?.id && <input type="hidden" name="id" value={data.id} />}
      <input type="hidden" name="images" value={JSON.stringify(images)} />

      {state.error && (
        <p className="rounded-lg border border-crimson/40 bg-crimson/10 px-4 py-2 text-sm text-crimson-light">
          {state.error}
        </p>
      )}

      {/* --- Work details --- */}
      <section className="rounded-xl border border-gold/10 bg-surface p-6">
        <h3 className="mb-5 font-display text-xl text-gold-light">
          Work details
        </h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="md:col-span-2">
            <label className={labelCls}>Title *</label>
            <input name="title" defaultValue={data?.title} className={inputCls} />
            {err("title") && (
              <p className="mt-1 text-xs text-crimson-light">{err("title")}</p>
            )}
          </div>

          <div>
            <label className={labelCls}>Code (auto-generated)</label>
            <input
              disabled
              value={data?.code ?? "Generated on save"}
              dir="ltr"
              className={`${inputCls} opacity-60`}
            />
          </div>

          <div>
            <div className="mb-1.5 flex items-center justify-between gap-2">
              <label className={rowLabelCls}>City *</label>
              <QuickAddToggle
                label="New city"
                fields={[
                  { key: "name", placeholder: "City name, e.g. Heriz" },
                  { key: "province", placeholder: "Province (optional)" },
                ]}
                onAdd={(v) => createCity(v.name, v.province ?? "")}
                onAdded={(name) => {
                  setCityList((prev) =>
                    prev.includes(name) ? prev : [...prev, name]
                  );
                  setCity(name);
                }}
              />
            </div>
            {/* A fixed list, not a free-text box. A work whose city is not one
                of these never appears on the public collection page, and as a
                typed input that failed silently — a stray value (a Persian
                spelling, "Isfahan" for "Esfahan") just made the piece vanish.
                The list itself is editable at /admin/taxonomy. */}
            <select
              name="city"
              required
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className={inputCls}
            >
              <option value="" disabled>
                Select a city…
              </option>
              {cityList.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
              {legacyCity && (
                <option value={legacyCity}>{legacyCity} — not in list</option>
              )}
            </select>
            {err("city") && (
              <p className="mt-1 text-xs text-crimson-light">{err("city")}</p>
            )}
          </div>

          <div>
            <div className="mb-1.5 flex items-center justify-between gap-2">
              <label className={rowLabelCls}>Category *</label>
              <QuickAddToggle
                label="New category"
                fields={[
                  { key: "name", placeholder: "Category name, e.g. Hunting Scene" },
                ]}
                onAdd={(v) => createCategory(v.name)}
                onAdded={(name) => {
                  setCategoryList((prev) =>
                    prev.includes(name) ? prev : [...prev, name]
                  );
                  setCategory(name);
                }}
              />
            </div>
            <select
              name="category"
              required
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className={inputCls}
            >
              <option value="" disabled>
                Select a category…
              </option>
              {categoryList.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
              {legacyCategory && (
                <option value={legacyCategory}>
                  {legacyCategory} — not in list
                </option>
              )}
            </select>
            {err("category") && (
              <p className="mt-1 text-xs text-crimson-light">
                {err("category")}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Price *</label>
              <input
                name="price"
                type="number"
                step="0.01"
                min="0.01"
                required
                defaultValue={data?.price}
                dir="ltr"
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Currency</label>
              <select
                name="currency"
                defaultValue={data?.currency ?? "OMR"}
                className={inputCls}
              >
                <option value="OMR">OMR</option>
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="AED">AED</option>
                <option value="IRR">IRR</option>
              </select>
            </div>
          </div>

          {/* length and width are captured separately so the site can quote
              the piece in both cm and feet */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Length (cm)</label>
              <input
                name="lengthCm"
                type="number"
                step="0.1"
                min="0"
                defaultValue={data?.lengthCm}
                placeholder="300"
                dir="ltr"
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Width (cm)</label>
              <input
                name="widthCm"
                type="number"
                step="0.1"
                min="0"
                defaultValue={data?.widthCm}
                placeholder="200"
                dir="ltr"
                className={inputCls}
              />
            </div>
          </div>
          <div className="md:col-span-2 rounded-lg border border-gold/15 bg-void/40 p-4">
            <label className={labelCls}>
              AI intrinsic value{" "}
              <span className="text-xs text-muted">— starting price if this work goes to auction</span>
            </label>
            <div className="flex items-center gap-3">
              <input
                name="intrinsicValue"
                type="number"
                step="0.01"
                min="0"
                defaultValue={data?.intrinsicValue}
                placeholder="e.g. 12000"
                dir="ltr"
                className={`${inputCls} max-w-xs`}
              />
              <span className="text-xs text-muted">
                {data?.intrinsicValueSource
                  ? `recorded (${data.intrinsicValueSource})`
                  : "recorded through the valuation service; an AI appraiser can replace manual entry later"}
              </span>
            </div>
          </div>
          <div>
            <label className={labelCls}>Pile material</label>
            <input
              name="pileMaterial"
              defaultValue={data?.pileMaterial}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Approx. age</label>
            <input
              name="approxAge"
              defaultValue={data?.approxAge}
              className={inputCls}
            />
          </div>
          <div className="md:col-span-2">
            <label className={labelCls}>Description</label>
            <RichTextArea
              name="description"
              defaultValue={data?.description}
              rows={6}
              className={inputCls}
            />
          </div>
        </div>
      </section>

      {/* --- Media --- */}
      <section className="rounded-xl border border-gold/10 bg-surface p-6">
        <h3 className="mb-1 font-display text-xl text-gold-light">
          Images &amp; video
        </h3>
        <p className="mb-5 text-xs text-muted">
          The first item in the list is the one shown on the collection page.
        </p>

        {/* the "Type" chosen here applies to uploaded, dropped, and URL media */}
        <div className="mb-4 flex items-center gap-3">
          <label className="text-sm text-cream/80">Image type</label>
          <select
            value={newType}
            onChange={(e) => setNewType(e.target.value)}
            className={`${inputCls} w-auto`}
          >
            {Object.entries(IMAGE_TYPE).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </div>

        {/* drag & drop / click to upload */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,video/*"
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files?.length) uploadFiles(e.target.files);
            e.target.value = "";
          }}
        />
        <div
          role="button"
          tabIndex={0}
          onClick={() => fileInputRef.current?.click()}
          onKeyDown={(e) =>
            (e.key === "Enter" || e.key === " ") && fileInputRef.current?.click()
          }
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-6 py-8 text-center transition-colors ${
            dragOver
              ? "border-gold bg-gold/10"
              : "border-border hover:border-gold/50 hover:bg-void/40"
          }`}
        >
          {uploading ? (
            <Loader2 className="h-7 w-7 animate-spin text-gold" />
          ) : (
            <UploadCloud className="h-7 w-7 text-gold/70" />
          )}
          <p className="text-sm text-cream/80">
            {progress
              ? `Uploading ${progress.index} of ${progress.total} — ${progress.percent}%`
              : uploading
                ? "Uploading…"
                : "Drag & drop carpet images or video here, or click to choose"}
          </p>
          {progress ? (
            <>
              <span
                className="block w-full max-w-sm overflow-hidden rounded-full bg-void"
                role="progressbar"
                aria-valuenow={progress.percent}
                aria-valuemin={0}
                aria-valuemax={100}
              >
                <span
                  className="block h-1.5 bg-gold transition-[width] duration-200"
                  style={{ width: `${progress.percent}%` }}
                />
              </span>
              <p className="max-w-sm truncate text-xs text-muted">
                {progress.name}
              </p>
            </>
          ) : (
            <p className="text-xs text-muted">
              Photos and video · any format, any size
            </p>
          )}
        </div>
        {uploadError && (
          <p className="mt-2 text-xs text-crimson-light">{uploadError}</p>
        )}

        {/* optional: paste an external image URL */}
        <div className="mt-4 flex flex-wrap items-end gap-3">
          <div className="min-w-[220px] flex-1">
            <label className={labelCls}>…or paste an image / video URL</label>
            <input
              value={newUrl}
              onChange={(e) => setNewUrl(e.target.value)}
              dir="ltr"
              placeholder="https://…"
              className={inputCls}
            />
          </div>
          <button
            type="button"
            onClick={addImage}
            className="flex items-center gap-2 rounded-lg border border-gold px-4 py-2 text-sm text-gold hover:bg-gold hover:text-void"
          >
            <Plus className="h-4 w-4" /> Add
          </button>
        </div>

        <div className="mb-4" />

        {images.length === 0 ? (
          <p className="text-sm text-muted">No media added yet.</p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {images.map((img, i) => (
              <div
                key={i}
                className={`group relative overflow-hidden rounded-lg border bg-void ${
                  i === 0 ? "border-gold" : "border-gold/10"
                }`}
              >
                {/* object-contain, never crop — the piece is shown as shot.
                    Click opens the full-size viewer at this tile. */}
                <Zoomable
                  items={images.map((m) => ({ url: m.url }))}
                  index={i}
                  caption={data?.title}
                >
                  {isVideoUrl(img.url) ? (
                    <video
                      src={img.url}
                      muted
                      playsInline
                      className="h-28 w-full object-contain"
                    />
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={img.url}
                      alt=""
                      className="h-28 w-full object-contain"
                    />
                  )}
                </Zoomable>
                {i === 0 && (
                  <span className="absolute left-1 top-1 rounded bg-gold px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-void">
                    FIRST IMAGE
                  </span>
                )}
                <button
                  type="button"
                  onClick={() =>
                    setImages((prev) => prev.filter((_, idx) => idx !== i))
                  }
                  className="absolute right-1 top-1 rounded bg-void/70 p-1 text-crimson-light opacity-0 transition-opacity group-hover:opacity-100"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* --- Dossier --- */}
      <section className="rounded-xl border border-gold/10 bg-surface p-6">
        <h3 className="mb-1 font-display text-xl text-gold-light">
          Dossier — Certificate of Authenticity
        </h3>
        <p className="mb-5 text-xs text-muted">Digital provenance of the piece</p>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {[
            ["dossierOrigin", "Origin"],
            ["dossierDimensions", "Dimensions"],
            ["dossierMaterial", "Material"],
            ["dossierFoundation", "Foundation"],
            ["dossierAge", "Age"],
            ["dossierAuthentication", "Authentication"],
            ["dossierArtisan", "Artisan"],
            ["dossierCollection", "Collection"],
          ].map(([name, label]) => (
            <div key={name}>
              <label className={labelCls}>{label}</label>
              <input
                name={name}
                defaultValue={dossier[name.replace("dossier", "").toLowerCase()] ?? ""}
                className={inputCls}
              />
            </div>
          ))}
          <div className="md:col-span-2">
            <label className={labelCls}>Craft Story</label>
            <RichTextArea
              name="dossierCraftStory"
              defaultValue={dossier["craftstory"] ?? ""}
              rows={5}
              className={inputCls}
            />
          </div>
        </div>
      </section>

      {/* --- Publish --- */}
      <section className="rounded-xl border border-gold/10 bg-surface p-6">
        <h3 className="mb-5 font-display text-xl text-gold-light">Publish</h3>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="w-full max-w-xs">
            <label className={labelCls}>Publication status</label>
            <select
              name="status"
              defaultValue={data?.status ?? "DRAFT"}
              className={inputCls}
            >
              <option value="DRAFT">Draft</option>
              <option value="PRIVATE">Private</option>
              <option value="PUBLISHED">Published</option>
              <option value="SOLD">Sold</option>
              <option value="ARCHIVED">Archived</option>
            </select>
          </div>
          <button
            type="submit"
            disabled={pending}
            className="rounded-lg bg-gold px-8 py-2.5 font-medium text-void transition-colors hover:bg-gold-light disabled:opacity-60"
          >
            {pending ? "Saving…" : data?.id ? "Save changes" : "Create work"}
          </button>
        </div>
      </section>
    </form>
  );
}

/**
 * The "+ New city" / "+ New category" affordance sitting next to a picker.
 *
 * Adding an origin or a style used to mean a code change and a redeploy. This
 * writes it straight to the shared list (the same one /admin/taxonomy edits)
 * and selects it, so a work can be filed without leaving the form half-typed.
 */
function QuickAddToggle({
  label,
  fields,
  onAdd,
  onAdded,
}: {
  label: string;
  fields: { key: string; placeholder: string }[];
  onAdd: (values: Record<string, string>) => Promise<TaxonomyResult>;
  onAdded: (name: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [saving, start] = useTransition();

  const submit = () =>
    start(async () => {
      const res = await onAdd(values);
      if (res.ok && res.name) {
        onAdded(res.name);
        setValues({});
        setError(null);
        setOpen(false);
      } else {
        setError(res.error ?? "That could not be added.");
      }
    });

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-1 text-xs text-gold/80 transition-colors hover:text-gold-light"
      >
        <Plus className="h-3.5 w-3.5" />
        {label}
      </button>
    );
  }

  return (
    <div className="min-w-0 flex-1">
      <div className="flex flex-wrap items-center gap-2">
        {fields.map((f) => (
          <input
            key={f.key}
            autoFocus={f.key === fields[0].key}
            value={values[f.key] ?? ""}
            placeholder={f.placeholder}
            onChange={(e) =>
              setValues((prev) => ({ ...prev, [f.key]: e.target.value }))
            }
            onKeyDown={(e) => {
              // this sits inside the work form — Enter must add the entry, not
              // submit the half-filled work around it
              if (e.key === "Enter") {
                e.preventDefault();
                submit();
              }
            }}
            className="min-w-0 flex-1 rounded-lg border border-border bg-void px-2.5 py-1.5 text-xs text-silk outline-none focus:border-gold"
          />
        ))}
        <button
          type="button"
          onClick={submit}
          disabled={saving || !(values[fields[0].key] ?? "").trim()}
          className="rounded-lg border border-gold px-3 py-1.5 text-xs text-gold-light transition-colors hover:bg-gold hover:text-void disabled:opacity-40"
        >
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Add"}
        </button>
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            setError(null);
          }}
          className="rounded-lg border border-border p-1.5 text-cream/60 transition-colors hover:text-silk"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
      {error && <p className="mt-1 text-xs text-crimson-light">{error}</p>}
    </div>
  );
}
