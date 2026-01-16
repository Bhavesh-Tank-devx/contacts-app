// app/contacts/page.tsx (Client Component)
'use client';
import Link from 'next/link';
import ContactCard from '@/components/ContactCard.client';
import { STRAPI_URL } from '../../lib/strapi.server';
import { useSession, signOut } from 'next-auth/react';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function ContactsPage() {
  const { data: session, status } = useSession();
  const [contacts, setContacts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    if (!session) return;
    async function fetchContacts() {
      if (!session) return;
      const currentSession = session!;
      try {
        const res = await fetch(`${STRAPI_URL}/api/contacts/?populate=profile_image&populate=users_permissions_user`, {
          headers: { Authorization: `Bearer ${currentSession.user.jwt}` },
        });
        const json = await res.json();
        if (res.ok) {
          setContacts(json.data);
        } else {
          console.error('Failed to fetch contacts', json);
        }
      } catch (err) {
        console.error('Error fetching contacts', err);
      } finally {
        setLoading(false);
      }
    }

    fetchContacts();
  }, [session, status, router]);

  if (status === 'loading' || loading) return <div>Loading...</div>;
  if (!session) return null;

  const contactItems = contacts.map((item: any) => {
    const id = item?.documentId ?? null;
    const attributes = item;
    const name = attributes?.name ?? 'Unnamed';
    const email = attributes?.email ?? '';
    const media = attributes?.profile_image || null;
    let mediaUrl = null;
    if (media) {
      mediaUrl =
        media.url ??
        (media.formats && media.formats.thumbnail && media.formats.thumbnail.url) ??
        null;
    }
    const avatarUrl = (mediaUrl && typeof STRAPI_URL === 'string')
      ? `${STRAPI_URL.replace(/\/$/, '')}${mediaUrl}`
      : '/placeholder-avatar.svg';
    return { id, name, email, avatarUrl };
  });

  return (
    <section style={{ maxWidth: 980, margin: '0 auto', padding: 20 }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h1 style={{ margin: 0 }}>Contacts</h1>
          <p style={{ margin: '6px 0 0', color: '#666' }}>Manage your contacts.</p>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          {session.user.role === 'Superadmin' && (
            <Link href="/users" style={{
              padding: '8px 14px',
              background: '#0070f3',
              color: 'white',
              borderRadius: 8,
              textDecoration: 'none',
              fontWeight: 600
            }}>
              Users
            </Link>
          )}
          <Link href="/contacts/new" style={{
            padding: '8px 14px',
            background: '#0ea5a4',
            color: 'white',
            borderRadius: 8,
            textDecoration: 'none',
            fontWeight: 600
          }}>
            + Create contact
          </Link>
          <button onClick={() => signOut()} style={{
            padding: '8px 14px',
            background: '#ef4444',
            color: 'white',
            border: 'none',
            borderRadius: 8,
            cursor: 'pointer'
          }}>
            Logout
          </button>
        </div>
      </header>

      <div style={{ display: 'grid', gap: 12 }}>
        {contactItems.map((c: any) => (
          <ContactCard key={String(c.id)} id={String(c.id)} name={c.name} email={c.email} avatarUrl={c.avatarUrl} />
        ))}
      </div>
    </section>
  );
}
