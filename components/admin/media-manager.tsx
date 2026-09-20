"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Asset = { id: string; name: string; url: string; alt: string | null; mimeType: string; sizeBytes: number };

export function MediaManager({ assets, configured }: { assets: Asset[]; configured: boolean }) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  async function upload(form: FormData) {
    setMessage("Uploading…");
    const response = await fetch("/api/admin/media", { method: "POST", body: form });
    const result = await response.json();
    setMessage(response.ok ? "Image uploaded." : result.error ?? "Upload failed.");
    if (response.ok) router.refresh();
  }
  async function remove(id: string) {
    if (!confirm("Delete this media asset from storage?")) return;
    const response = await fetch(`/api/admin/media?id=${id}`, { method: "DELETE" });
    const result = await response.json();
    setMessage(response.ok ? "Image deleted." : result.error ?? "Delete failed.");
    if (response.ok) router.refresh();
  }
  return <><form action={upload} className="inline-admin-form"><h3>Upload image</h3><div className="form-columns"><label>Image<input name="file" type="file" accept="image/jpeg,image/png,image/webp,image/avif" required disabled={!configured} /></label><label>Alternative text<input name="alt" /></label></div><button className="primary-button" disabled={!configured}>Upload</button>{!configured && <small>Add Supabase Storage credentials to enable uploads. Existing URL-based product images continue to work.</small>}{message && <p aria-live="polite">{message}</p>}</form><div className="media-grid">{assets.map((asset) => <article key={asset.id}><img src={asset.url} alt={asset.alt ?? asset.name} /><b>{asset.name}</b><small>{asset.mimeType} · {(asset.sizeBytes / 1024).toFixed(0)} KB</small><button className="danger-button" onClick={() => remove(asset.id)} disabled={!configured}>Delete</button></article>)}</div>{!assets.length && <p>No uploaded assets yet.</p>}</>;
}
