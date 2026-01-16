// // lib/strapi.server.ts
// export const STRAPI_URL = process.env.NEXT_PUBLIC_STRAPI_URL;
// export const API_TOKEN = process.env.STRAPI_API_TOKEN ?? '';

// if (!STRAPI_URL) throw new Error('NEXT_PUBLIC_STRAPI_URL is required (e.g. http://localhost:1337)');
// // NOTE: we no longer throw when API_TOKEN is missing so devs can test with Public role enabled.
// // But prefer using API_TOKEN for server-to-server calls.
// export async function fetchContacts() {
//   if (!STRAPI_URL) {
//     throw new Error('STRAPI_URL is not defined');
//   }
//   const url = `${STRAPI_URL.replace(/\/$/, '')}/api/contacts?populate=profile_image`;
//   const headers: Record<string, string> = { 'Content-Type': 'application/json' };
//   if (API_TOKEN) headers.Authorization = `Bearer ${API_TOKEN}`;

//   const res = await fetch(url, {
//     headers,
//     // SSR (no caching). We'll change revalidate later when we discuss ISR.
//     next: { revalidate: 0 },
//   });

//   const text = await res.text(); // read raw text for better debug messages
//   let json: any;
//   try {
//     json = text ? JSON.parse(text) : null;
//   } catch (err) {
//     throw new Error(`Strapi returned non-JSON. Status: ${res.status}. Body: ${text}`);
//   }

//   if (!res.ok) {
//     // include the JSON (if any) in the thrown error for clarity
//     throw new Error(`Strapi fetch error: ${res.status} ${res.statusText} — ${JSON.stringify(json)}`);
//   }

//   // At this point json should be the normal Strapi shape: { data: [...] }
//   return json;
// }

// export async function fetchContact(id: string) {
//   if (!STRAPI_URL) {
//     throw new Error('STRAPI_URL is not defined');
//   }
//   const url = `${STRAPI_URL.replace(/\/$/, '')}/api/contacts/${encodeURIComponent(id)}?populate=profile_image`;
//   const headers: Record<string, string> = { 'Content-Type': 'application/json' };
//   if (API_TOKEN) headers.Authorization = `Bearer ${API_TOKEN}`;

//   const res = await fetch(url, {
//     headers,
//     next: { revalidate: 0 },
//   });
//     const text = await res.text();
//     let json;
//     try { json = text ? JSON.parse(text) : null; } catch { throw new Error(`Strapi returned non-JSON: ${text}`); }
  
//     if (!res.ok) throw new Error(`Strapi fetch contact failed: ${res.status} ${JSON.stringify(json)}`);
//     // Strapi might return the object directly or nested; normalize:
//     const data = json?.data ?? json;
//     return data;
//   }
// lib/strapi.server.ts
export const STRAPI_URL = process.env.NEXT_PUBLIC_STRAPI_URL?.replace(/\/$/, '') ?? '';
export const API_TOKEN = process.env.STRAPI_API_TOKEN ?? '';

if (!STRAPI_URL) {
  // Throw here so devs notice immediately.
  throw new Error('NEXT_PUBLIC_STRAPI_URL is required (e.g. http://localhost:1337)');
}

// helper: fetch wrapper that sets auth header when available
async function strapiFetch(path: string, opts: RequestInit = {}) {
  const url = `${STRAPI_URL}${path}`;
  const headers: Record<string, string> = opts.headers ? { ...(opts.headers as any) } : {};
  // Do not overwrite Content-Type for multipart/form-data uploads (the boundary must be auto-set)
  if (API_TOKEN) headers.Authorization = `Bearer ${API_TOKEN}`;
  // Merge headers and call fetch
  const res = await fetch(url, { ...opts, headers });
  return res;
}

/**
 * fetchContacts - list all contacts (uses populate=profile_image)
 */
export async function fetchContacts() {
  const res = await strapiFetch(`/api/contacts?populate[]=profile_image`, {
    next: { revalidate: 0 },
  });
  const text = await res.text();
  let json: any;
  try { json = text ? JSON.parse(text) : null; } catch (e) {
    throw new Error(`Strapi returned non-JSON for list: ${text}`);
  }
  if (!res.ok) throw new Error(`Strapi list failed: ${res.status} ${JSON.stringify(json)}`);
  return json;
}

/**
 * fetchContact - tries multiple strategies to find a single contact reliably.
 * id param may be a numeric id (string) or a documentId (uuid-like string).
 */
export async function fetchContact(id: string) {
  if (!id) throw new Error('id is required');

  // 1) Try direct get by numeric id
  try {
    const res = await strapiFetch(`/api/contacts/${encodeURIComponent(id)}?populate[]=profile_image`, {
      next: { revalidate: 0 },
    });
    const text = await res.text();
    let json: any;
    try { json = text ? JSON.parse(text) : null; } catch (e) {
      throw new Error(`Strapi returned non-JSON for GET /api/contacts/${id}: ${text}`);
    }
    if (res.ok) {
      // normalize and return
      return json;
    } else {
      // 404 or other error — log and fall through to next strategy
      console.warn(`[strapi] GET /api/contacts/${id} failed ${res.status} — falling back. Response:`, json);
    }
  } catch (err) {
    console.warn('[strapi] direct GET failed:', String(err));
  }

  // 2) Try filter by documentId (useful if route is using documentId)
  try {
    // Strapi filtering syntax: ?filters[documentId][$eq]=<value>
    const filterPath = `/api/contacts?filters[documentId][$eq]=${encodeURIComponent(id)}&populate[]=profile_image`;
    const res2 = await strapiFetch(filterPath, { next: { revalidate: 0 } });
    const text2 = await res2.text();
    let json2: any;
    try { json2 = text2 ? JSON.parse(text2) : null; } catch (e) {
      throw new Error(`Strapi returned non-JSON for filter by documentId: ${text2}`);
    }
    if (res2.ok) {
      // Strapi returns { data: [...] }
      const found = json2?.data && Array.isArray(json2.data) && json2.data.length > 0 ? json2.data[0] : null;
      if (found) return { data: found };
      // else continue fallback
      console.warn(`[strapi] No item found by documentId filter for "${id}"`);
    } else {
      console.warn(`[strapi] Filter by documentId returned ${res2.status}:`, json2);
    }
  } catch (err) {
    console.warn('[strapi] filter-by-documentId failed:', String(err));
  }

  // 3) Last-resort: fetch list and find by id or documentId
  try {
    const list = await fetchContacts();
    const items = list?.data ?? [];
    const found = items.find((it: any) => String(it?.id) === String(id) || String(it?.documentId) === String(id));
    if (found) return { data: found };
    // nothing found — build informative error
    const sample = items.slice(0, 5).map((it: any) => ({ id: it?.id, documentId: it?.documentId, name: it?.name }));
    throw new Error(`Not found by id or documentId. sample items: ${JSON.stringify(sample)}`);
  } catch (err) {
    // bubble up a clear error
    throw new Error(`Strapi fetch contact failed for "${id}": ${String(err)}`);
  }
}

export async function getCurrentUser(jwt: string) {
  const res = await fetch(`${STRAPI_URL}/api/users/me?populate[]=role`, {
    headers: { Authorization: `Bearer ${jwt}` },
  });
  const text = await res.text();
  let json: any;
  try { json = text ? JSON.parse(text) : null; } catch (e) {
    throw new Error(`Strapi returned non-JSON for user: ${text}`);
  }
  if (!res.ok) throw new Error(`Strapi user fetch failed: ${res.status} ${JSON.stringify(json)}`);
  return json;
}
