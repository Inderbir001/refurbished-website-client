// fetch() for our own JSON endpoints that never throws and always answers with JSON the screen can show.
// Without it, a sleeping/restarting backend (an HTML 502 page) or a dropped connection left forms stuck with no message,
// because `await response.json()` blows up on HTML and `fetch` rejects on network errors.
const json = (error: string, status: number) => new Response(JSON.stringify({ error }), { status, headers: { "content-type": "application/json" } });

export async function safeFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  try {
    const response = await fetch(input, init);
    if ((response.headers.get("content-type") ?? "").includes("application/json") || response.status === 204) return response;
    return json(response.status >= 500 || response.ok ? "The server is busy right now. Please try again in a moment." : response.status === 404 ? "That could not be found." : "Unexpected response from the server.", response.ok ? 502 : response.status);
  } catch {
    return json("Network problem. Please check your connection and try again.", 503);
  }
}
