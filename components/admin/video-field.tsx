"use client";
import { useRef, useState } from "react";
import { safeFetch } from "@/lib/safe-fetch";
import { MAX_VIDEO_BYTES, parseVideo, VIDEO_TYPES } from "@/lib/video";

// Videos for a product: upload an MP4 / WebM (up to 50 MB) or paste a YouTube / Vimeo link.
// The file goes straight from the browser to storage, so large videos do not pass through the website.
export function VideoField({ value, onChange }: { value: string[]; onChange: (urls: string[]) => void }) {
  const picker = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [link, setLink] = useState("");

  async function upload(file: File | undefined) {
    if (!file) return;
    setError("");
    if (!VIDEO_TYPES.includes(file.type)) return setError("Please choose an MP4 or WebM video. (Phone videos are usually MP4.)");
    if (file.size > MAX_VIDEO_BYTES) return setError(`That video is ${(file.size / 1048576).toFixed(0)} MB. The limit is 50 MB. Compress it, or paste a YouTube link instead.`);
    if (value.length >= 6) return setError("A product can have up to 6 videos.");
    setProgress(0);
    try {
      const prepared = await safeFetch("/api/admin/media/video", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name: file.name, type: file.type, size: file.size }) });
      const info = await prepared.json();
      if (!prepared.ok) throw new Error(info.error ?? "The upload could not be started.");
      await new Promise<void>((resolve, reject) => {
        const request = new XMLHttpRequest();
        request.open("PUT", info.data.uploadUrl);
        request.setRequestHeader("content-type", file.type);
        request.upload.onprogress = (event) => { if (event.lengthComputable) setProgress(Math.round((event.loaded / event.total) * 100)); };
        request.onload = () => (request.status >= 200 && request.status < 300 ? resolve() : reject(new Error("The upload failed. Please try again.")));
        request.onerror = () => reject(new Error("The connection dropped during the upload. Please try again."));
        request.send(file);
      });
      onChange([...value, info.data.publicUrl]);
    } catch (caught) { setError(caught instanceof Error ? caught.message : "The upload failed."); }
    setProgress(null);
    if (picker.current) picker.current.value = "";
  }
  function addLink() {
    setError("");
    const text = link.trim();
    const parsed = parseVideo(text);
    if (!parsed || parsed.kind === "file") return setError("Paste a YouTube or Vimeo link, for example https://www.youtube.com/watch?v=…");
    if (value.includes(text)) return setError("That video is already added.");
    if (value.length >= 6) return setError("A product can have up to 6 videos.");
    onChange([...value, text]); setLink("");
  }

  return <div className="vf">
    {value.length > 0 && <ul className="vf-list">{value.map((url, index) => {
      const info = parseVideo(url);
      return <li key={url}>
        <div className="vf-thumb">{info?.kind === "youtube" ? <img src={info.thumb} alt="" loading="lazy" /> : info?.kind === "file" ? <video src={`${info.url}#t=0.5`} preload="metadata" muted playsInline /> : <span>▶</span>}<i aria-hidden>▶</i></div>
        <div className="vf-info"><b>{info?.kind === "youtube" ? "YouTube video" : info?.kind === "vimeo" ? "Vimeo video" : "Uploaded video"}</b><small title={url}>{url.replace(/^https?:\/\//, "").slice(0, 60)}</small></div>
        <span className="vf-actions">
          <button type="button" disabled={index === 0} aria-label="Move earlier" onClick={() => { const next = [...value]; [next[index - 1], next[index]] = [next[index], next[index - 1]]; onChange(next); }}>←</button>
          <button type="button" disabled={index === value.length - 1} aria-label="Move later" onClick={() => { const next = [...value]; [next[index + 1], next[index]] = [next[index], next[index + 1]]; onChange(next); }}>→</button>
          <button type="button" className="del" aria-label="Remove video" onClick={() => onChange(value.filter((_, i) => i !== index))}>×</button>
        </span>
      </li>;
    })}</ul>}
    <div className="vf-add">
      <button type="button" className="adm-btn small" disabled={progress !== null} onClick={() => picker.current?.click()}>{progress !== null ? `Uploading… ${progress}%` : "⬆ Upload a video"}</button>
      <input ref={picker} type="file" accept="video/mp4,video/webm" hidden onChange={(event) => void upload(event.target.files?.[0])} />
      <span className="vf-or">or</span>
      <input className="vf-link" value={link} onChange={(event) => setLink(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); addLink(); } }} placeholder="Paste a YouTube or Vimeo link" aria-label="Video link" />
      <button type="button" className="adm-btn small ghost" disabled={!link.trim()} onClick={addLink}>Add link</button>
    </div>
    {progress !== null && <div className="vf-bar" role="progressbar" aria-valuenow={progress}><span style={{ width: `${progress}%` }} /></div>}
    <small className="adm-hint">Upload an MP4 or WebM up to 50 MB (phone videos work), or paste a YouTube link, which has no size limit. Videos appear next to the photos on the product page. Remember to press Save product.</small>
    {error && <small className="imgf-error" role="alert">{error}</small>}
  </div>;
}
