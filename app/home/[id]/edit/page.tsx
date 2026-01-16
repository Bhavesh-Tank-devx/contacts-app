// app/contacts/[id]/edit/page.tsx
'use client';
import Link from 'next/link';
import ContactEditForm from '@/components/ContactEditForm.client';
import { STRAPI_URL } from '@/lib/strapi.server';
import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';

export default function EditContactPage() {
  const { data: session, status } = useSession();
  const params = useParams();
  const router = useRouter();
  const [contact, setContact] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const id = params.id as string;

  useEffect(() => {
    if (!session) return;
    if (!session) {
      router.push('/login');
      return;
    }

    async function fetchContact() {
      if (!session) return;
      const currentSession = session!;
      try {
        const res = await fetch(`${STRAPI_URL}/api/contacts/${id}?populate=profile_image&populate=users_permissions_user`, {
          headers: { Authorization: `Bearer ${currentSession.user.jwt}` },
        });
        const json = await res.json();
        if (res.ok) {
          const item = json.data;
          // if (!item.users_permissions_user || item.users_permissions_user.id !== currentSession.user.id && currentSession.user.role !== 'SuperAdmin') {
          //   setError('Forbidden');
          //   return;
          // }
          setContact(item);
        } else {
          setError('Contact not found');
        }
      } catch (err: any) {
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
  const media = attributes?.profile_image ?? null;
  const mediaUrl = media?.url ?? media?.formats?.thumbnail?.url ?? null;
  const avatar =
    STRAPI_URL && mediaUrl
      ? `${STRAPI_URL.replace(/\/$/, '')}${mediaUrl}`
      : '/placeholder-avatar.svg';

  // Pass only serializable props to the client component
  const contactData = {
    id: String(contact?.documentId ?? id),
    name: attributes?.name ?? '',
    email: attributes?.email ?? '',
    phone: attributes?.phone ?? '',
    age: attributes?.age ?? '',
    avatar,
  };

  return (
    <section style={{ maxWidth: 720, margin: '24px auto', padding: 24 }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h1 style={{ margin: 0 }}>Edit Contact</h1>
        </div>
        <nav>
          <Link href={`/contacts/${contactData.id}`} style={{ color: '#0ea5a4', textDecoration: 'none' }}>← Back</Link>
        </nav>
      </header>

      <div style={{ padding: 20, borderRadius: 10, boxShadow: '0 4px 14px rgba(0,0,0,0.04)', background: '#fff' }}>
        <ContactEditForm contact={contactData} />
      </div>
    </section>
  );
}
