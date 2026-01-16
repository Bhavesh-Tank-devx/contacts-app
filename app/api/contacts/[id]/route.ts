// app/api/contacts/[id]/route.ts
import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { STRAPI_URL, API_TOKEN, getCurrentUser } from '@/lib/strapi.server';

if (!STRAPI_URL) throw new Error('STRAPI_URL not configured');

async function getRawId(params: { id: string } | Promise<{ id: string }> | undefined): Promise<string | null> {
  if (!params) return null;
  const resolved = (await params) as { id: string };
  return resolved?.id ?? null;
}

export async function PUT(req: Request, { params }: { params: { id: string } | Promise<{ id: string }> }) {
  const rawId = await getRawId(params);
  if (!rawId) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const authHeader = req.headers.get('authorization');
  if (!authHeader) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const jwt = authHeader.replace('Bearer ', '');
  const user = await getCurrentUser(jwt);

  try {
    // Fetch contact to check ownership
    const contactRes = await fetch(`${STRAPI_URL}/api/contacts/${encodeURIComponent(rawId)}?populate=users_permissions_user`, {
      headers: { Authorization: `Bearer ${jwt}` },
    });
    console.log('Contact fetch response:', contactRes);
    const contactJson = await contactRes.json();
    if (!contactRes.ok) return NextResponse.json({ error: 'Contact not found' }, { status: 404 });
    const contact = contactJson.data;
    console.log(contact, "contact")
    console.log(user, "user")
    if (contact.users_permissions_user.id !== user.id && user.role?.name !== 'Super Admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const contentType = req.headers.get('content-type') ?? '';
    let name: string | undefined;
    let email: string | undefined;
    let phone: string | undefined;
    let age: number | undefined;
    let mediaId: number | null = null;

    if (contentType.includes('multipart/form-data')) {
      const form = await req.formData();
      name = String(form.get('name') ?? '');
      email = String(form.get('email') ?? '');
      phone = String(form.get('phone') ?? '');
      age = form.get('age') ? Number(String(form.get('age'))) : undefined;
      const file = form.get('profile_image') as File | null;

      if (file && (file as any).size > 0) {
        const uploadForm = new FormData();
        uploadForm.append('files', file, (file as any).name || 'file');

        const uploadRes = await fetch(`${STRAPI_URL}/api/upload`, {
          method: 'POST',
          headers: API_TOKEN ? { Authorization: `Bearer ${API_TOKEN}` } : {},
          body: uploadForm,
        });

        if (!uploadRes.ok) {
          const t = await uploadRes.text();
          console.warn('[route PUT] upload failed', t);
          return NextResponse.json({ error: 'upload failed', details: t }, { status: uploadRes.status });
        }

        const uploadJson = await uploadRes.json();
        const maybeArray = Array.isArray(uploadJson) ? uploadJson : uploadJson?.data ? uploadJson.data : uploadJson;
        const first = Array.isArray(maybeArray) ? maybeArray[0] : maybeArray;
        mediaId = first?.id ?? first?.attributes?.id ?? null;
      }
    } else {
      const json = await req.json();
      name = json.name;
      email = json.email;
      phone = json.phone;
      age = json.age;
    }

    const updateBody: any = { data: {} as any };
    if (typeof name === 'string' && name.length) updateBody.data.name = name;
    if (typeof email === 'string' && email.length) updateBody.data.email = email;
    if (typeof phone === 'string' && phone.length) updateBody.data.phone = phone;
    if (typeof age === 'number' && !Number.isNaN(age)) updateBody.data.age = age;
    if (mediaId) updateBody.data.profile_image = mediaId;

    const updateRes = await fetch(`${STRAPI_URL}/api/contacts/${encodeURIComponent(rawId)}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${API_TOKEN}`,
      },
      body: JSON.stringify(updateBody),
    });

    const updateText = await updateRes.text();
    let updateJson: any = null;
    try { updateJson = updateText ? JSON.parse(updateText) : null; } catch (e) { /* ignore */ }

    if (!updateRes.ok) {
      console.warn('[route PUT] update failed', updateRes.status, updateJson ?? updateText);
      return NextResponse.json({ error: 'update failed', details: updateJson ?? updateText }, { status: updateRes.status });
    }

    try { revalidatePath('/contacts'); revalidatePath(`/contacts/${rawId}`); } catch (e) { console.warn('[route PUT] revalidate failed', e); }

    return NextResponse.json(updateJson, { status: updateRes.status });
  } catch (err: any) {
    console.error('[route PUT] error', err);
    return NextResponse.json({ error: String(err.message ?? err) }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } | Promise<{ id: string }> }) {
  const rawId = await getRawId(params);
  if (!rawId) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const authHeader = req.headers.get('authorization');
  if (!authHeader) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const jwt = authHeader.replace('Bearer ', '');
  const user = await getCurrentUser(jwt);

  try {
    // Fetch contact to check ownership
    const contactRes = await fetch(`${STRAPI_URL}/api/contacts/${encodeURIComponent(rawId)}?populate=users_permissions_user`, {
      headers: { Authorization: `Bearer ${jwt}` },
    });
    const contactJson = await contactRes.json();
    if (!contactRes.ok) return NextResponse.json({ error: 'Contact not found' }, { status: 404 });
    const contact = contactJson.data;
    if (contact.users_permissions_user.id !== user.id && user.role?.name !== 'Super Admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const url = `${STRAPI_URL}/api/contacts/${encodeURIComponent(rawId)}`;
    const res = await fetch(url, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${API_TOKEN}`,
      },
    });

    const text = await res.text();
    let json: any = null;
    try { json = text ? JSON.parse(text) : null; } catch (e) { json = text; }

    if (!res.ok) {
      console.warn('[route DELETE] strapi delete failed', res.status, json ?? text);
      return NextResponse.json({ error: 'Strapi delete failed', details: json ?? text }, { status: res.status });
    }

    // Verify deletion: attempt to GET resource — expect 404
    try {
      const verify = await fetch(`${STRAPI_URL}/api/contacts/${encodeURIComponent(rawId)}`, {
        headers: { Authorization: `Bearer ${API_TOKEN}` },
      });
      if (verify.status !== 404) {
        const verifyText = await verify.text();
        console.warn('[route DELETE] verification failed - resource still exists', verify.status, verifyText);
        return NextResponse.json({ error: 'Deletion may not have completed. Resource still present after DELETE.', details: verifyText }, { status: 500 });
      }
    } catch (e) {
      console.warn('[route DELETE] verify request failed', String(e));
    }

    try { revalidatePath('/contacts'); } catch (e) { console.warn('[route DELETE] revalidate failed', e); }
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error('[route DELETE] error', err);
    return NextResponse.json({ error: String(err.message ?? err) }, { status: 500 });
  }
}
