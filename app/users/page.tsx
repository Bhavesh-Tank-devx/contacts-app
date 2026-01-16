// app/users/page.tsx
'use client';
import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { STRAPI_URL } from '../../lib/strapi.server';

interface User {
  id: number;
  username: string;
  email: string;
  role: { name: string };
}

export default function UsersPage() {
  const { data: session, status } = useSession();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    if (status === 'loading') return;
    if (!session || session.user.role !== 'Superadmin') {
      router.push('/home');
      return;
    }

    async function fetchUsers() {
      if (!session) return;
      const currentSession = session;
      try {
        const res = await fetch(`${STRAPI_URL}/api/users?populate=role`, {
          headers: { Authorization: `Bearer ${currentSession.user.jwt}` },
        });
        const json = await res.json();
        if (res.ok) {
          // Filter to show only Members, or all non-superadmin
          const members = json.filter((user: User) => user.role?.name === 'Member');
          setUsers(members);
        } else {
          console.error('Failed to fetch users', json);
        }
      } catch (err) {
        console.error('Error fetching users', err);
      } finally {
        setLoading(false);
      }
    }

    fetchUsers();
  }, [session, status, router]);

  if (status === 'loading' || loading) return <div>Loading...</div>;
  if (!session || session.user.role !== 'Superadmin') return null;

  return (
    <div style={{ padding: 20 }}>
      <h1>Members List</h1>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20 }}>
        {users.map((user) => (
          <Link key={user.id} href={`/users/${user.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
            <div style={{ border: '1px solid #ccc', padding: 20, borderRadius: 8, width: 200 }}>
              <h3>{user.username}</h3>
              <p>{user.email}</p>
              <p>Role: {user.role?.name}</p>
            </div>
          </Link>
        ))}
      </div>
      <br />
      <Link href="/home">Back to Home</Link>
    </div>
  );
}