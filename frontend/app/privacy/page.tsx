import Link from 'next/link'

export const metadata = { title: 'Privacy Policy — PropertyState AI' }

export default function PrivacyPage() {
  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F5EDE3' }}>
      <header className="border-b" style={{ backgroundColor: '#1A0F07', borderColor: 'rgba(196,149,106,0.4)' }}>
        <div className="max-w-3xl mx-auto px-6 py-4">
          <Link href="/" className="text-sm font-semibold" style={{ color: '#C4956A' }}>← PropertyState AI</Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-12 prose-styled" style={{ color: '#2C1A0E' }}>
        <h1 className="text-3xl font-black mb-2">Privacy Policy</h1>
        <p className="text-sm mb-8" style={{ color: '#8B5E3C' }}>Last updated: 2026-05-23</p>

        <p className="mb-4">
          PropertyState AI (&quot;we&quot;, &quot;us&quot;) takes your privacy seriously. This policy explains what we collect,
          why, and what control you have. <strong>This is a template — replace with legal advice from a lawyer
          familiar with the Australian Privacy Act 1988 and the GDPR before going to production.</strong>
        </p>

        <Section title="1. What we collect">
          <ul>
            <li><strong>Account data</strong> — your email and a bcrypt-hashed password.</li>
            <li><strong>Property details</strong> you submit for analysis (address, suburb, price, rent, loan details).</li>
            <li><strong>Generated reports</strong> — the AI&apos;s output, retained so you can revisit it.</li>
            <li><strong>Usage data</strong> — token counts and number of analyses per calendar month.</li>
            <li><strong>Technical data</strong> — IP address (for rate limiting only, not stored long-term) and a per-request id.</li>
          </ul>
        </Section>

        <Section title="2. How we use it">
          <ul>
            <li>To run the AI analyses you request.</li>
            <li>To save your reports to your personal library.</li>
            <li>To enforce monthly plan limits.</li>
            <li>To prevent abuse (rate limiting).</li>
          </ul>
        </Section>

        <Section title="3. Who we share it with">
          <p>Your inputs are sent to <strong>Anthropic</strong> (the LLM provider) to generate analyses. We do not sell
          or share your data with any other third parties for marketing.</p>
        </Section>

        <Section title="4. Your rights">
          <ul>
            <li><strong>Access</strong> — download all your data as JSON from <Link href="/account" className="underline" style={{ color: '#6B3A1F' }}>your account page</Link>.</li>
            <li><strong>Deletion</strong> — delete your account and all associated data at any time.</li>
            <li><strong>Rectification</strong> — sign in and update your details.</li>
          </ul>
        </Section>

        <Section title="5. Retention">
          <p>Reports are kept until you delete them. Deleted accounts are removed immediately along with all associated reports.</p>
        </Section>

        <Section title="6. Cookies">
          <p>We use <strong>localStorage</strong> (not cookies) to store your auth token and model preference. No third-party tracking.</p>
        </Section>

        <Section title="7. Contact">
          <p>Questions? <em>[Replace with your contact email]</em></p>
        </Section>
      </main>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-8">
      <h2 className="text-lg font-bold mb-2" style={{ color: '#2C1A0E' }}>{title}</h2>
      <div style={{ color: '#4A2C0A' }}>{children}</div>
    </div>
  )
}
