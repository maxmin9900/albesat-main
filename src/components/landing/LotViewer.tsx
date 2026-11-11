"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Zoomable } from "@/components/ui/Lightbox";
import { isVideoUrl } from "@/lib/utils";

/** Every photo and clip on the lot — uncropped, with a thumbnail strip. */
export default function LotViewer({
  media,
  title,
}: {
  media: { id: string; url: string }[];
  title: string;
}) {
  const [active, setActive] = useState(0);
  const current = media[Math.min(active, media.length - 1)];
  const isVideo = isVideoUrl(current.url);

  return (
    <div>
      <Zoomable
        items={media.map((m) => ({ url: m.url, alt: title }))}
        index={Math.min(active, media.length - 1)}
        caption={title}
        className="overflow-hidden rounded-xl border border-gold/15 bg-void shadow-glow-gold"
      >
        {isVideo ? (
          <video
            key={current.url}
            src={current.url}
            controls
            playsInline
            className="block max-h-[76vh] w-full object-contain"
          />
        ) : (
          /* keyed on the url so the fade replays when the thumbnail changes;
             object-contain so no part of the carpet is ever cut away */
          <motion.img
            key={current.url}
            src={current.url}
            alt={title}
            initial={{ opacity: 0, scale: 1.02 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.55, ease: "easeOut" }}
            draggable={false}
            className="block max-h-[76vh] w-full object-contain"
          />
        )}
      </Zoomable>

      {media.length > 1 && (
        <div className="mt-4 grid grid-cols-4 gap-3 sm:grid-cols-6">
          {media.map((item, i) => (
            <button
              type="button"
              key={item.id}
              onClick={() => setActive(i)}
              aria-label={`View media ${i + 1} of ${media.length}`}
              aria-current={i === active}
              className={`group ${i === active ? "" : "opacity-70 hover:opacity-100"}`}
            >
              <span
                className={`block aspect-square overflow-hidden rounded-lg border transition-all ${
                  i === active
                    ? "border-gold shadow-[0_0_18px_rgba(201,162,75,0.35)]"
                    : "border-gold/10"
                }`}
              >
                {isVideoUrl(item.url) ? (
                  <span className="flex h-full w-full items-center justify-center bg-void text-[9px] tracking-widest text-gold/70">
                    VIDEO
                  </span>
                ) : (
                  <span
                    className="block h-full w-full bg-contain bg-center bg-no-repeat transition-transform duration-500 group-hover:scale-105"
                    style={{ backgroundImage: `url(${item.url})` }}
                  />
                )}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
