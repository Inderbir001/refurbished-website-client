import { backendFetch, isFrontendOnly } from "./remote";

// Which server-side integrations are configured. Their credentials live on the backend, so on the frontend
// of a split deployment we ask the backend instead of reading environment variables.
export type Capabilities = { razorpay: boolean; phonepe: boolean; storage: boolean };

export function localCapabilities(): Capabilities {
  return {
    razorpay: Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET),
    phonepe: Boolean(process.env.PHONEPE_CLIENT_ID && process.env.PHONEPE_CLIENT_SECRET),
    storage: Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY && process.env.STORAGE_BUCKET),
  };
}

export async function getCapabilities(): Promise<Capabilities> {
  if (!isFrontendOnly()) return localCapabilities();
  try {
    const response = await backendFetch("/api/internal/capabilities", { method: "POST", body: "{}" });
    return response.ok ? ((await response.json()) as { data: Capabilities }).data : { razorpay: false, phonepe: false, storage: false };
  } catch { return { razorpay: false, phonepe: false, storage: false }; }
}
