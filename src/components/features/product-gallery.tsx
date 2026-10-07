"use client";
import Image from "next/image";
import { useState } from "react";
export function ProductGallery({ images }: { images: { id: string; url: string; alt: string }[] }) {
  const [index, setIndex] = useState(0);
  const image = images[index] ?? images[0];
  if (!image) return <div className="empty-state">Visuel à venir</div>;
  return <div className="gallery"><Image className="gallery-main" src={image.url} alt={image.alt} width={400} height={480} preload sizes="(min-width: 800px) 50vw, 100vw" />
    {images.length > 1 && <div className="gallery-thumbnails" aria-label="Choisir une image">{images.map((entry, position) => <button type="button" key={entry.id} aria-pressed={position === index} aria-label={`Afficher l’image ${position + 1} : ${entry.alt}`} onClick={() => setIndex(position)}><Image src={entry.url} alt="" width={64} height={77} /></button>)}</div>}
  </div>;
}
