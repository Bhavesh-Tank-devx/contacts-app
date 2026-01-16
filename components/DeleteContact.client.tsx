// components/DeleteContact.client.tsx
'use client';
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';

export default function DeleteContactButton({ contactId }: { contactId: string }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { data: session } = useSession();

  async function handleDelete() {
    if (!confirm('Delete this contact? This action cannot be undone.')) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/contacts/${contactId}`, { 
        method: 'DELETE',
        headers: session?.user?.jwt ? { Authorization: `Bearer ${session!.user!.jwt}` } : {},
      });
      const json = await res.json();
      if (!res.ok) throw new Error(JSON.stringify(json));
      router.push('/contacts');
    } catch (err: any) {
      alert('Delete failed: ' + String(err.message ?? err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <button onClick={handleDelete} disabled={loading} style={{
      padding: '8px 12px',
      background: '#ef4444',
      color: 'white',
      border: 'none',
      borderRadius: 8,
      cursor: 'pointer'
    }}>
      {loading ? 'Deleting…' : 'Delete'}
    </button>
  );
}
