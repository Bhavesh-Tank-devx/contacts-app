// components/ContactEditForm.client.tsx
'use client';
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';

type Contact = {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  age?: number | string;
  avatar?: string;
};

export default function ContactEditForm({ contact }: { contact: Contact }) {
  const router = useRouter();
  const { data: session } = useSession();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const form = new FormData(e.currentTarget);

      // Explicitly target the PUT endpoint for the specific contact id.
      const res = await fetch(`/api/contacts/${contact?.id}`, {
        method: 'PUT', // must be PUT
        body: form, // multipart if file present
        headers: session?.user?.jwt ? { Authorization: `Bearer ${session!.user!.jwt}` } : {},
      });

      const text = await res.text();

      let json: any = null;
      try { json = text ? JSON.parse(text) : null; } catch (err) { json = text; }

      if (!res.ok) {
        throw new Error(JSON.stringify(json ?? text));
      }

      console.log("here 2")

      // Success: navigate back to the detail page
      router.push(`/contacts/${contact.id}`);
    } catch (err: any) {
      console.error('Edit failed:', err);
      setError(String(err?.message ?? err));
    } finally {
      setLoading(false);
    }
  }

  const inputStyle: React.CSSProperties = {
    padding: '10px 12px',
    borderRadius: 8,
    border: '1px solid #ddd',
    outline: 'none',
    fontSize: 14,
    width: '100%',
  };

  return (
    <form onSubmit={handleSubmit} encType="multipart/form-data">
      <div style={{ display: 'grid', gap: 12 }}>
        <div>
          <label style={{ fontSize: 13, color: '#333' }}>Name</label>
          <input name="name" defaultValue={contact.name} required style={inputStyle} />
        </div>

        <div>
          <label style={{ fontSize: 13, color: '#333' }}>Email</label>
          <input name="email" type="email" defaultValue={contact.email} style={inputStyle} />
        </div>

        <div style={{ display: 'flex', gap: 12 }}>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: 13, color: '#333' }}>Phone</label>
            <input name="phone" defaultValue={contact.phone} style={inputStyle} />
          </div>
          <div style={{ width: 140 }}>
            <label style={{ fontSize: 13, color: '#333' }}>Age</label>
            <input name="age" type="number" defaultValue={String(contact.age ?? '')} style={inputStyle} />
          </div>
        </div>

        <div>
          <label style={{ fontSize: 13, color: '#333' }}>Replace profile image</label>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginTop: 8 }}>
            <img src={contact.avatar} alt="avatar" width={64} height={64} style={{ borderRadius: 8, objectFit: 'cover' }} />
            <input name="profile_image" type="file" accept="image/*" />
          </div>
        </div>

        {error && <div style={{ color: 'red' }}>{error}</div>}

        <div style={{ display: 'flex', gap: 8 }}>
          <button type="submit" disabled={loading} style={{
            padding: '10px 14px',
            background: '#0ea5a4',
            color: 'white',
            border: 'none',
            borderRadius: 8,
            cursor: 'pointer',
            fontWeight: 600
          }}>
            {loading ? 'Saving…' : 'Save changes'}
          </button>

          <button type="button" onClick={() => router.push(`/contacts/${contact.id}`)} style={{
            padding: '10px 14px',
            background: 'transparent',
            color: '#333',
            border: '1px solid #ddd',
            borderRadius: 8,
            cursor: 'pointer'
          }}>
            Cancel
          </button>
        </div>
      </div>
    </form>
  );
}
