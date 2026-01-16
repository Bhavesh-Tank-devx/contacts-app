// components/ContactCard.client.tsx
'use client';

import React from 'react';
import Link from 'next/link';

type Props = {
  id: string;
  name: string;
  email?: string;
  avatarUrl?: string;
};

export default function ContactCard({ id, name, email, avatarUrl }: Props) {
  // anchor wrapping the whole card keeps semantics and keyboard support for free
  return (
    <Link
      href={`/contacts/${id}`}
      style={{ textDecoration: 'none', color: 'inherit' }}
      aria-label={`Open contact ${name}`}
    >
      <article
        // make visual/interactive affordance
        style={{
          display: 'flex',
          gap: 12,
          alignItems: 'center',
          padding: 12,
          border: '1px solid #eee',
          borderRadius: 10,
          cursor: 'pointer',
          transition: 'box-shadow 120ms ease, transform 120ms ease',
        }}
        // hover effect via inline style fallback
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLElement).style.boxShadow = '0 6px 18px rgba(16,24,40,0.06)';
          (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)';
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLElement).style.boxShadow = 'none';
          (e.currentTarget as HTMLElement).style.transform = 'none';
        }}
      >
        <img
          src={avatarUrl ?? '/placeholder-avatar.svg'}
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
    </Link>
  );
}
