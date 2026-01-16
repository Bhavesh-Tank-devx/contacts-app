// app/users/[id]/page.tsx
'use client';
import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import ContactCard from '@/components/ContactCard.client';
import { STRAPI_URL } from '../../../lib/strapi.server';

export default function UserContactsPage() {
  const { data: session, status } = useSession();
  const [contacts, setContacts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const router = useRouter();
  const params = useParams();
  const userId = params.id as string;

  useEffect(() => {
    if (status === 'loading') return;
    if (!session || session.user.role !== 'Superadmin') {
      router.push('/home');
      return;
    }

    async function fetchUserAndContacts() {
      if (!session) return;
      const currentSession = session;
      try {
        // Fetch user details
        const userRes = await fetch(`${STRAPI_URL}/api/users/${userId}?populate=role`, {
          headers: { Authorization: `Bearer ${currentSession.user.jwt}` },
        });
        const userJson = await userRes.json();
        if (userRes.ok) {
          setUser(userJson);
        }

        // Fetch contacts for this user
        const contactsRes = await fetch(`${STRAPI_URL}/api/contacts?filters[users_permissions_user][id][$eq]=${userId}&populate=profile_image&populate=users_permissions_user`, {
          headers: { Authorization: `Bearer ${currentSession.user.jwt}` },
        });
        const contactsJson = await contactsRes.json();
        if (contactsRes.ok) {
          setContacts(contactsJson.data);
        } else {
          console.error('Failed to fetch contacts', contactsJson);
        }
      } catch (err) {
        console.error('Error fetching data', err);
      } finally {
        setLoading(false);
      }
    }

    fetchUserAndContacts();
  }, [session, status, router, userId]);

  if (status === 'loading' || loading) return <div>Loading...</div>;
  if (!session || session.user.role !== 'Superadmin') return null;

  const contactItems = contacts.map((item: any) => {
    const id = item?.documentId ?? null;
    const attributes = item;
    const name = attributes?.name ?? 'Unnamed';
    const email = attributes?.email ?? '';
    const media = attributes?.profile_image || null;
    let mediaUrl = null;
    if (media && media.url) {
      mediaUrl = `${STRAPI_URL}${media.url}`;
    }

    return (
      <article
        key={id}
        style={{
          display: 'flex',
          gap: 12,
          alignItems: 'center',
          padding: 12,
          border: '1px solid #eee',
          borderRadius: 10,
        }}
      >
        <img
          src={mediaUrl ?? '/placeholder-avatar.svg'}
          alt={`${name} avatar`}
          width={56}
          height={56}
          style={{ borderRadius: 12, objectFit: 'cover', flex: '0 0 56px' }}
        />

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <strong style={{ fontSize: 16, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{name}</strong>
          </div>
          <div style={{ fontSize: 13, color: '#666', marginTop: 6, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {email ?? '—'}
          </div>
        </div>
      </article>
    );
  });

  return (
    <div style={{ padding: 20 }}>
      <h1>Contacts for {user?.username || 'User'}</h1>
      <p>Email: {user?.email}</p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20, marginTop: 20 }}>
        {contactItems.length > 0 ? contactItems : <p>No contacts found.</p>}
      </div>
      <br />
      <Link href="/users">Back to Users</Link>
      <br />
      <Link href="/home">Back to Home</Link>
    </div>
  );
}