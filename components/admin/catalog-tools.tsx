"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

// Download the catalog as spreadsheets, or add many products at once from a CSV file.
export function CatalogTools() {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  async function upload(form: FormData) {
    const file = form.get("file");
    if (!(file instanceof File) || !file.size) { setMessage("Choose a CSV file first."); return; }
    setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/admin/products/import", { method: "POST", headers: { "content-type": "text/csv" }, body: await file.text() });
      const result = await response.json();
      if (response.ok) { setMessage(`Imported ${result.data.importedProducts} products and ${result.data.importedVariants} variants.`); router.refresh(); }
      else setMessage(result.data?.errors ? result.data.errors.map((item: { row: number; message: string }) => `Row ${item.row}: ${item.message}`).join(" · ") : result.error ?? "Import failed.");
    } catch { setMessage("Could not reach the server. Please try again."); }
    setBusy(false);
  }
  return <div className="catalog-tools">
    <div className="tool-row">
      <a className="secondary-button" href="/api/admin/products/export">Download products</a>
      <a className="secondary-button" href="/api/admin/products/template">Download CSV template</a>
      <a className="secondary-button" href="/api/admin/inventory/export">Download stock list</a>
    </div>
    <form className="import-box" onSubmit={(event) => { event.preventDefault(); void upload(new FormData(event.currentTarget)); }}>
      <div className="import-text"><b>Add many products from a CSV file</b><small>Start from the template. Every row is checked first: if one row has a problem, nothing is imported and you see which row to fix.</small></div>
      <input name="file" type="file" accept=".csv,text/csv" required aria-label="CSV file" />
      <button className="primary-button" disabled={busy}>{busy ? "Importing…" : "Import products"}</button>
    </form>
    {message && <p aria-live="polite">{message}</p>}
  </div>;
}
