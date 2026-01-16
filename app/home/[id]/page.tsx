// app/contact/[id]/page.tsx
'use client';
import Link from 'next/link';
import { STRAPI_URL } from '@/lib/strapi.server';
import DeleteContactButton from '@/components/DeleteContact.client';
import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';

export default function ContactDetailPage() {
  const { data: session, status } = useSession();
  const params = useParams();
  const router = useRouter();
  const [contact, setContact] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const id = params.id as string;

  useEffect(() => {
    if (!session) return;
    async function fetchContact() {
      if (!session) return;
      try {
        const res = await fetch(`${STRAPI_URL}/api/contacts/${id}?populate=profile_image&populate=users_permissions_user`, {
          headers: { Authorization: `Bearer ${session!.user.jwt}` },
        });
        const json = await res.json();
        if (res.ok) {
          const item = json.data;
          setContact(item);
        //   if (!item.users_permissions_user || item.users_permissions_user.id !== session!.user.id && session!.user.role !== 'SuperAdmin') {
        //     setError('Forbidden');
        //     return;
        //   }
        //   setContact(item);
        // } else {
        //   setError('Contact not found');
        // }
      } }catch (err: any) {
        setError(String(err.message));
      } finally {
        setLoading(false);
      }
    }

    if (id) fetchContact();
  }, [id, session, status, router]);

  if (status === 'loading' || loading) return <div>Loading...</div>;
  if (error) return (
    <section style={{ padding: 20 }}>
      <Link href="/contacts">← Back</Link>
      <h2 style={{ color: 'red' }}>Error</h2>
      <pre>{error}</pre>
    </section>
  );
  if (!contact) return null;

  const attributes = contact;
  const name = attributes?.name ?? 'Unnamed';
  const email = attributes?.email ?? '';
  const phone = attributes?.phone ?? '';
  const age = attributes?.age ?? '';
  const media = attributes?.profile_image ?? null;
  const mediaUrl = media?.url ?? media?.formats?.thumbnail?.url ?? null;
  const avatar =
    mediaUrl && typeof STRAPI_URL === 'string'
      ? `${STRAPI_URL.replace(/\/$/, '')}${mediaUrl}`
      : '/placeholder-avatar.svg';

  return (
    <section style={{ maxWidth: 800, margin: '24px auto', padding: 20 }}>
      <Link href="/contacts" style={{ color: '#0ea5a4' }}>← Back to contacts</Link>
      <div style={{ display: 'flex', gap: 20, marginTop: 18 }}>
        <img src={avatar} alt={`${name} avatar`} width={120} height={120} style={{ borderRadius: 12, objectFit: 'cover' }} />
        <div style={{ flex: 1 }}>
          <h1 style={{ margin: '0 0 6px' }}>{name}</h1>
          <div style={{ color: '#666', marginBottom: 12 }}>{email}</div>
          <div style={{ color: '#444' }}>Phone: {phone}</div>
          <div style={{ color: '#444' }}>Age: {age}</div>

          <div style={{ marginTop: 14 }}>
            <Link href={`/contacts/${id}/edit`} style={{
              display: 'inline-block',
              padding: '8px 12px',
              background: '#0ea5a4',
              color: '#fff',
              borderRadius: 8,
              textDecoration: 'none',
              marginRight: 8
            }}>
              Edit
            </Link>

            {/* Delete button is a Client Component */}
            <DeleteContactButton contactId={String(id)} />
          </div>
        </div>
      </div>
    </section>
  );
}
