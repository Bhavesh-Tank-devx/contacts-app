// app/api/contacts/route.ts
import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { STRAPI_URL, API_TOKEN, getCurrentUser } from '../../../lib/strapi.server';

if (!STRAPI_URL) {
  throw new Error('NEXT_PUBLIC_STRAPI_URL must be set in .env.local (e.g. http://localhost:1337)');
}
if (!API_TOKEN) {
  // For dev you might allow public writes, but in production always require a server token.
  console.warn('Warning: STRAPI_API_TOKEN is not set. Requests to create/upload will likely fail (use API token for server-to-server).');
}

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const jwt = authHeader.replace('Bearer ', '');
    const user = await getCurrentUser(jwt);

    const form = await req.formData();

    // basic fields
    const name = String(form.get('name') ?? '');
    const email = String(form.get('email') ?? '');
    const phone = String(form.get('phone') ?? '');
    const age = form.get('age') ? Number(String(form.get('age'))) : undefined;

    // profile image file (if provided)
    const file = form.get('profile_image') as File | null;

    let mediaId: number | null = null;

    if (file && (file as any).size > 0) {
      // Upload file(s) to Strapi via multipart/form-data
      const uploadForm = new FormData();
      // Strapi expects the key `files` (you can upload multiple files)
      uploadForm.append('files', file, (file as any).name || 'file');

      const uploadRes = await fetch(`${STRAPI_URL}/api/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${API_TOKEN}` },
        body: uploadForm,
      });

      if (!uploadRes.ok) {
        const text = await uploadRes.text();
        return NextResponse.json({ error: 'Strapi upload failed', details: text }, { status: uploadRes.status });
      }

      // Strapi returns an array of file objects (or flattened objects depending on version).
      // We'll try a few shapes to extract an ID robustly.
      const uploadJson = await uploadRes.json();
      // Example possibilities:
      // - uploadJson is an array -> uploadJson[0].id
      // - uploadJson.data -> array (v4-like)
      // - uploadJson[0] -> object with id
      const maybeArray = Array.isArray(uploadJson) ? uploadJson
        : uploadJson?.data ? uploadJson.data
        : uploadJson;
      const first = Array.isArray(maybeArray) ? maybeArray[0] : maybeArray;
      mediaId = first?.id ?? first?.attributes?.id ?? null;
    }

    // Build payload to create a contact in Strapi.
    // In Strapi v5 the REST create expects: POST /api/contacts with { data: { ... } }
    const createBody: any = { data: { name, email, phone, users_permissions_user: { id: user.id } } };
    if (typeof age === 'number' && !Number.isNaN(age)) createBody.data.age = age;
    if (mediaId) {
      // Attach media by ID. If this fails in your Strapi instance, we will adjust to other accepted shapes.
      createBody.data.profile_image = mediaId;
    }

    const createRes = await fetch(`${STRAPI_URL}/api/contacts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${API_TOKEN}`,
      },
      body: JSON.stringify(createBody),
    });

    const createJson = await createRes.json();

    if (!createRes.ok) {
      return NextResponse.json({ error: 'Strapi create contact failed', details: createJson }, { status: createRes.status });
    }

    // Invalidate cached /contacts page so users see the new contact.
    // Server environment: revalidatePath can be used to revalidate a specific path.
    try {
      revalidatePath('/contacts');
    } catch (e) {
      // Not fatal; log for debugging
      console.warn('revalidatePath error:', e);
    }

    return NextResponse.json(createJson, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: String(err.message ?? err) }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const jwt = authHeader.replace('Bearer ', '');
    const user = await getCurrentUser(jwt);

    let filter = '';
    if (user.role?.name !== 'superadmin') {
      filter = `&filters[users_permissions_user][id][$eq]=${user.id}`;
    }

    const res = await fetch(`${STRAPI_URL}/api/contacts?fields=id,name,email,phone,age,documentId,status&populate=profile_image&populate=users_permissions_user&sort=name:asc${filter}`, {
      headers: { Authorization: `Bearer ${API_TOKEN}` },
    });

    const text = await res.text();
    let json: any;
    try { json = text ? JSON.parse(text) : null; } catch (e) { json = text; }

    if (!res.ok) {
      return NextResponse.json({ error: 'Strapi fetch failed', details: json }, { status: res.status });
    }

    return NextResponse.json(json);
  } catch (err: any) {
    return NextResponse.json({ error: String(err.message ?? err) }, { status: 500 });
  }
}
