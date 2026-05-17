import { useState } from 'react';
import { Loader2, Mail, CheckCircle2 } from 'lucide-react';
import { signInWithMagicLink, signInWithOAuth } from '../lib/auth-client';

export function SignInScreen() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const r = await signInWithMagicLink(email.trim());
      if (r.ok) setSent(true);
      else setError(r.error ?? 'ส่งลิงก์ไม่สำเร็จ');
    } finally {
      setLoading(false);
    }
  };

  const handleOAuth = async (provider: 'google') => {
    setLoading(true);
    setError(null);
    try {
      const r = await signInWithOAuth(provider);
      if (!r.ok) setError(r.error ?? 'OAuth ไม่สำเร็จ');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <div
        className="w-full max-w-sm rounded-xl border p-7 space-y-5"
        style={{
          background: 'var(--color-bg-elevated)',
          borderColor: 'var(--color-border)',
          boxShadow: 'var(--shadow-3)',
        }}
      >
        <div className="text-center space-y-1">
          <img
            src="/wordmark.svg"
            alt="Marnthara"
            className="brand-asset h-6 w-auto mx-auto"
          />
          <div className="font-mono text-[10px] tracking-[0.16em] uppercase text-fg-3">
            Marketing Lab
          </div>
        </div>

        <div className="text-center space-y-1">
          <h1 className="text-lg font-semibold text-fg-1" lang="th">
            เข้าสู่ระบบ
          </h1>
          <p className="text-[12px] text-fg-3 leading-relaxed" lang="th">
            ใช้อีเมลเพื่อรับลิงก์เข้าระบบ ไม่ต้องสร้างรหัสผ่าน
          </p>
        </div>

        {sent ? (
          <div
            className="rounded-md border p-4 text-center space-y-1.5"
            style={{
              background: 'color-mix(in oklch, var(--color-success) 8%, transparent)',
              borderColor: 'color-mix(in oklch, var(--color-success) 35%, transparent)',
            }}
          >
            <CheckCircle2
              className="w-5 h-5 mx-auto"
              strokeWidth={1.5}
              style={{ color: 'var(--color-success)' }}
              aria-hidden="true"
            />
            <p
              className="text-sm font-medium"
              style={{ color: 'var(--color-success)' }}
              lang="th"
            >
              ส่งลิงก์ไปที่อีเมลแล้ว
            </p>
            <p className="text-[11px] text-fg-3" lang="th">
              เปิดอีเมล → คลิกลิงก์ → กลับมาที่หน้านี้
            </p>
            <button
              type="button"
              onClick={() => {
                setSent(false);
                setEmail('');
              }}
              className="text-[11px] text-fg-3 hover:text-fg-1 underline-offset-2 hover:underline mt-2"
              lang="th"
            >
              ใช้อีเมลอื่น
            </button>
          </div>
        ) : (
          <>
            <form onSubmit={handleMagicLink} className="space-y-3">
              <label className="block">
                <span
                  className="block text-[11px] uppercase tracking-wider text-fg-3 mb-1.5 font-mono"
                  lang="th"
                >
                  อีเมล
                </span>
                <input
                  type="email"
                  required
                  autoFocus
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@marnthara.com"
                  className="w-full rounded-md border px-3 py-2 text-sm text-fg-1 placeholder:text-fg-4 focus:outline-none transition-colors"
                  style={{
                    background: 'var(--color-bg)',
                    borderColor: 'var(--color-border)',
                  }}
                />
              </label>
              <button
                type="submit"
                disabled={loading || !email.trim()}
                className="w-full inline-flex items-center justify-center gap-2 min-h-[44px] rounded-md text-sm font-medium transition-colors disabled:opacity-50"
                style={{
                  background: 'var(--color-accent)',
                  color: 'var(--color-accent-fg)',
                }}
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" strokeWidth={1.5} aria-hidden="true" />
                ) : (
                  <Mail className="w-4 h-4" strokeWidth={1.5} aria-hidden="true" />
                )}
                ส่งลิงก์เข้าระบบ
              </button>
            </form>

            <div className="flex items-center gap-2">
              <div className="flex-1 h-px" style={{ background: 'var(--color-border-faint)' }} />
              <span
                className="font-mono text-[10px] tracking-[0.14em] uppercase text-fg-4"
                lang="th"
              >
                หรือ
              </span>
              <div className="flex-1 h-px" style={{ background: 'var(--color-border-faint)' }} />
            </div>

            <button
              type="button"
              onClick={() => handleOAuth('google')}
              disabled={loading}
              className="w-full inline-flex items-center justify-center gap-2 min-h-[44px] rounded-md text-sm font-medium border transition-colors disabled:opacity-50"
              style={{
                background: 'var(--color-bg)',
                borderColor: 'var(--color-border)',
                color: 'var(--color-fg-1)',
              }}
            >
              เข้าด้วย Google
            </button>

            {error && (
              <div
                role="alert"
                className="text-[11px] text-center"
                style={{ color: 'var(--color-danger)' }}
                lang="th"
              >
                {error}
              </div>
            )}
          </>
        )}

        <p
          className="text-[10.5px] text-fg-4 text-center leading-relaxed pt-2 border-t"
          style={{ borderColor: 'var(--color-border-faint)' }}
          lang="th"
        >
          เข้าสู่ระบบฟรี ใช้ได้ทันที — สลับ Free / BYOK / Paid ได้ตลอดเวลา
        </p>
      </div>
    </div>
  );
}
