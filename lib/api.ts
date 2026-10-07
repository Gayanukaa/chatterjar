export interface ApiResult<T = Record<string, unknown>> {
  ok: boolean;
  status: number;
  data: T & { error?: string };
}

/** POSTs JSON; adds the admin key header when one is given. */
export async function post<T = Record<string, unknown>>(
  path: string,
  payload: unknown = {},
  adminKey?: string,
): Promise<ApiResult<T>> {
  const headers: Record<string, string> = {
    "content-type": "application/json",
  };
  if (adminKey) headers["x-admin-key"] = adminKey;
  try {
    const res = await fetch(path, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, status: res.status, data };
  } catch {
    return {
      ok: false,
      status: 0,
      data: { error: "No connection. Try again." } as ApiResult<T>["data"],
    };
  }
}
