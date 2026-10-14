/** Mock access requests can succeed before a network response is lost. Never
 * automatically retry a purchase: refresh server-confirmed access first. */
export async function completeMockRequest(url: string, options: RequestInit): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const response = await fetch(url, options);
    if (response.ok) return { ok: true };
    const data = await response.json().catch(() => null);
    return { ok: false, error: typeof data?.error === 'string' ? data.error : 'Could not complete this request. Please try again.' };
  } catch {
    return { ok: false, error: 'Connection lost. Refresh to check your access before trying again.' };
  }
}
