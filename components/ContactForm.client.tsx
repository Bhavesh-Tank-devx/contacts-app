// components/ContactForm.client.tsx
'use client';
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';

export default function ContactForm() {
  const router = useRouter();
  const { data: session } = useSession();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const form = new FormData(e.currentTarget);

    try {
      const res = await fetch('/api/contacts', { 
        method: 'POST', 
        body: form,
        headers: session?.user?.jwt ? { Authorization: `Bearer ${session!.user!.jwt}` } : {},
      });
      const json = await res.json();
      if (!res.ok) throw new Error(JSON.stringify(json));
      // Redirect to the new contact's detail page
      const newId = json?.data?.documentId;
      if (newId) {
        router.push(`/contacts/${newId}`);
      } else {
        router.push('/contacts');
      }
    } catch (err: any) {
      setError(String(err.message ?? err));
    } finally {
      setLoading(false);
    }
  }

  const fieldStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    marginBottom: 12
  };
  const inputStyle: React.CSSProperties = {
    padding: '10px 12px',
    borderRadius: 8,
    border: '1px solid #ddd',
    outline: 'none',
    fontSize: 14
  };
  const labelStyle: React.CSSProperties = { fontSize: 13, color: '#333' };

  return (
    <form onSubmit={handleSubmit} encType="multipart/form-data">
      <div style={fieldStyle}>
        <label style={labelStyle}>Name</label>
        <input name="name" required style={inputStyle} />
      </div>

      <div style={fieldStyle}>
        <label style={labelStyle}>Email</label>
        <input name="email" type="email" style={inputStyle} />
      </div>

      <div style={{ display: 'flex', gap: 12 }}>
        <div style={{ flex: 1 }}>
          <label style={labelStyle}>Phone</label>
          <input name="phone" style={inputStyle} />
        </div>
        <div style={{ width: 140 }}>
          <label style={labelStyle}>Age</label>
          <input name="age" type="number" min={0} style={inputStyle} />
        </div>
      </div>

      <div style={{ marginTop: 12, marginBottom: 12 }}>
        <label style={labelStyle}>Profile image</label>
        <input name="profile_image" type="file" accept="image/*" style={{ marginTop: 6 }} />
      </div>

      {error && <div style={{ color: 'red', marginBottom: 12 }}>{error}</div>}

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
          {loading ? 'Saving…' : 'Save contact'}
        </button>

        <button type="button" onClick={() => router.push('/contacts')} style={{
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
    </form>
  );
}
