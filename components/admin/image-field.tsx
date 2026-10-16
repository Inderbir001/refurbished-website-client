"use client";
import { useEffect, useRef, useState } from "react";
import { uploadImage } from "@/lib/image-upload";

// Photo pickers for the admin: upload from the computer (the normal way) or, if you already have a link, paste it.
// Both write into a normal form field, so the surrounding forms keep reading the value by its name.

function useReset(anchor: React.RefObject<HTMLElement | null>, onReset: () => void) {
  useEffect(() => {
    const form = anchor.current?.closest("form");
    if (!form) return;
    const handler = () => setTimeout(onReset, 0);
    form.addEventListener("reset", handler);
    return () => form.removeEventListener("reset", handler);
  }); // eslint-disable-line react-hooks/exhaustive-deps
}

export function ImageField({ name, label, defaultValue = "", required = false, hint, alt = "", onValue }: { name: string; label: string; defaultValue?: string; required?: boolean; hint?: string; alt?: string; onValue?: (url: string) => void }) {
  const [value, setValue] = useState(defaultValue);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [paste, setPaste] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const proxy = useRef<HTMLInputElement>(null);
  const picker = useRef<HTMLInputElement>(null);
  useReset(root, () => { setValue(defaultValue); setError(""); });
  useEffect(() => { proxy.current?.setCustomValidity(required && !value ? "Please upload a photo." : ""); onValue?.(value); }, [required, value]); // eslint-disable-line react-hooks/exhaustive-deps

  async function choose(file: File | undefined) {
    if (!file) return;
    setBusy(true); setError("");
    try { setValue(await uploadImage(file, alt)); } catch (caught) { setError(caught instanceof Error ? caught.message : "The upload failed."); }
    setBusy(false);
    if (picker.current) picker.current.value = "";
  }
  return <div className="imgf" ref={root}>
    <span className="imgf-label">{label}{required && " *"}</span>
    <div className="imgf-box">
      <div className="imgf-preview">{value ? <img src={value} alt="" /> : <span aria-hidden>🖼</span>}</div>
      <div className="imgf-actions">
        <button type="button" className="secondary-button" disabled={busy} onClick={() => picker.current?.click()}>{busy ? "Uploading…" : value ? "Change photo" : "Upload photo"}</button>
        {value && !busy && <button type="button" className="imgf-link" onClick={() => setValue("")}>Remove</button>}
        <input ref={picker} type="file" accept="image/*" hidden onChange={(event) => void choose(event.target.files?.[0])} />
        <input ref={proxy} className="imgf-proxy" name={name} value={value} required={required} onChange={() => undefined} tabIndex={-1} aria-hidden />
      </div>
    </div>
    {paste
      ? <input className="imgf-url" type="url" placeholder="https://…" value={value} onChange={(event) => setValue(event.target.value)} aria-label={`${label} link`} />
      : <button type="button" className="imgf-link small" onClick={() => setPaste(true)}>Or paste an image link</button>}
    {hint && <small className="imgf-hint">{hint}</small>}
    {error && <small className="imgf-error" role="alert">{error}</small>}
  </div>;
}

export function ImageListField({ name, label, defaultValue = [], alt = "" }: { name: string; label: string; defaultValue?: string[]; alt?: string }) {
  const [urls, setUrls] = useState(defaultValue);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [link, setLink] = useState("");
  const root = useRef<HTMLDivElement>(null);
  const picker = useRef<HTMLInputElement>(null);
  useReset(root, () => { setUrls(defaultValue); setError(""); });

  async function add(files: FileList | null) {
    if (!files?.length) return;
    setBusy(true); setError("");
    const added: string[] = [];
    for (const file of Array.from(files)) {
      try { added.push(await uploadImage(file, alt)); } catch (caught) { setError(`${file.name}: ${caught instanceof Error ? caught.message : "the upload failed."}`); }
    }
    if (added.length) setUrls((current) => [...current, ...added]);
    setBusy(false);
    if (picker.current) picker.current.value = "";
  }
  const move = (index: number, step: number) => setUrls((current) => { const next = [...current]; const target = index + step; if (target < 0 || target >= next.length) return current; [next[index], next[target]] = [next[target], next[index]]; return next; });
  return <div className="imgf wide" ref={root}>
    <span className="imgf-label">{label}</span>
    <div className="imgf-grid">
      {urls.map((url, index) => <figure key={url + index}>
        <img src={url} alt="" />
        {index === 0 && <em>Main</em>}
        <figcaption>
          <button type="button" aria-label="Move earlier" disabled={index === 0} onClick={() => move(index, -1)}>←</button>
          <button type="button" aria-label="Move later" disabled={index === urls.length - 1} onClick={() => move(index, 1)}>→</button>
          <button type="button" aria-label="Remove photo" className="del" onClick={() => setUrls((current) => current.filter((_, i) => i !== index))}>×</button>
        </figcaption>
      </figure>)}
      <button type="button" className="imgf-add" disabled={busy} onClick={() => picker.current?.click()}><b>+</b>{busy ? "Uploading…" : "Add photos"}</button>
    </div>
    <input ref={picker} type="file" accept="image/*" multiple hidden onChange={(event) => void add(event.target.files)} />
    <input type="hidden" name={name} value={urls.join("\n")} />
    <div className="imgf-paste"><input type="url" placeholder="Or paste an image link and press Add" value={link} onChange={(event) => setLink(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); if (/^https?:\/\//i.test(link.trim())) { setUrls((current) => [...current, link.trim()]); setLink(""); } } }} /><button type="button" className="secondary-button" disabled={!/^https?:\/\//i.test(link.trim())} onClick={() => { setUrls((current) => [...current, link.trim()]); setLink(""); }}>Add</button></div>
    <small className="imgf-hint">The first photo is the main one customers see. Use the arrows to reorder.</small>
    {error && <small className="imgf-error" role="alert">{error}</small>}
  </div>;
}
