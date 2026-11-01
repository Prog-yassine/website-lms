/** Shared public authentication client. Set REACT_APP_API_URL before building. */
export const API_BASE_URL = (process.env.REACT_APP_API_URL || "http://localhost:5000").replace(/\/+$/, "");

export async function postAuth(endpoint, body, { signal } = {}) {
  let response;
  try {
    response = await fetch(`${API_BASE_URL}/api/auth/${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(body),
      signal,
    });
  } catch (error) {
    if (error.name === "AbortError") throw error;
    throw new Error("We couldn't reach the server. Check your connection and try again.");
  }

  let data;
  try {
    data = await response.json();
  } catch {
    throw new Error("The server returned an unexpected response. Please try again.");
  }
  if (!response.ok) {
    const message = typeof data?.error === "string" ? data.error :
      typeof data?.message === "string" ? data.message : "Something went wrong. Please try again.";
    throw new Error(message.slice(0, 300));
  }
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw new Error("The server returned an unexpected response. Please try again.");
  }
  return data;
}
