// app/contacts/new/page.tsx
import Link from 'next/link';
import ContactForm from '@/components/ContactForm.client';

export const metadata = {
  title: 'Create contact',
  description: 'Create a new contact with a profile image',
};

// This is a Server Component (no "use client" at top).
export default function NewContactPage() {
  return (
    <section style={{ maxWidth: 800, margin: '0 auto', padding: 16 }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <h1 style={{ margin: 0 }}>New Contact</h1>
          <p style={{ margin: '4px 0 0', color: '#666' }}>Add a name, email, phone, age and upload a profile image.</p>
        </div>
        <nav>
          <Link href="/contacts">← Back to contacts</Link>
        </nav>
      </header>

      <div style={{ padding: 16, border: '1px solid #eee', borderRadius: 8 }}>
        {/* ContactForm is a Client Component that handles submission to /api/contacts */}
        <ContactForm />
      </div>
    </section>
  );
}
