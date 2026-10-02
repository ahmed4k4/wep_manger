'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';
import { LoaderCircle, LogIn, UserPlus } from 'lucide-react';
import { signInAction, signUpAction } from '@/app/actions/auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function AuthForm({ returnTo }: { returnTo: string }) {
  const locale = useLocale();
  const ar = locale === 'ar';
  const router = useRouter();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (busy) return;
    setBusy(true); setError(''); setSuccess('');
    try {
      const result = mode === 'login'
        ? await signInAction(email, password)
        : await signUpAction(email, password, fullName);
      if (!result.success) { setError(result.error || (ar ? 'تعذر إكمال العملية.' : 'Could not complete the request.')); return; }
      if (mode === 'signup' && 'confirmationRequired' in result && result.confirmationRequired) {
        setSuccess(ar ? 'تم إنشاء الحساب. تحقق من بريدك الإلكتروني لتأكيده قبل تسجيل الدخول.' : 'Account created. Check your email to confirm it before signing in.');
        setMode('login');
        return;
      }
      router.replace(returnTo);
      router.refresh();
    } catch {
      setError(ar ? 'تعذر الاتصال بالخدمة.' : 'Could not reach the authentication service.');
    } finally { setBusy(false); }
  };

  return <Card className="mx-auto w-full max-w-md rounded-2xl"><CardHeader><div className="mb-2 grid h-11 w-11 place-items-center rounded-xl bg-primary/10 text-primary">{mode === 'login' ? <LogIn size={19} /> : <UserPlus size={19} />}</div>
    <CardTitle>{mode === 'login' ? (ar ? 'تسجيل الدخول' : 'Sign in') : (ar ? 'إنشاء حساب' : 'Create account')}</CardTitle>
  </CardHeader><CardContent><form onSubmit={submit} className="space-y-4">
    {mode === 'signup' && <div className="space-y-2"><Label htmlFor="full-name">{ar ? 'الاسم' : 'Full name'}</Label><Input id="full-name" value={fullName} onChange={(event) => setFullName(event.target.value)} autoComplete="name" minLength={2} maxLength={100} required /></div>}
    <div className="space-y-2"><Label htmlFor="email">{ar ? 'البريد الإلكتروني' : 'Email'}</Label><Input id="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" required /></div>
    <div className="space-y-2"><Label htmlFor="password">{ar ? 'كلمة المرور' : 'Password'}</Label><Input id="password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} minLength={mode === 'signup' ? 8 : undefined} required /></div>
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}{success && <p role="status" className="text-sm text-green-700 dark:text-green-400">{success}</p>}
    <Button type="submit" className="w-full gap-2" disabled={busy}>{busy && <LoaderCircle size={16} className="animate-spin" />}{mode === 'login' ? (ar ? 'دخول' : 'Sign in') : (ar ? 'إنشاء حساب' : 'Create account')}</Button>
    <p className="text-center text-sm text-muted-foreground">{mode === 'login' ? (ar ? 'ليس لديك حساب؟' : "Don't have an account?") : (ar ? 'لديك حساب بالفعل؟' : 'Already have an account?')} <button type="button" className="font-medium text-primary underline-offset-4 hover:underline" onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError(''); setSuccess(''); }}>{mode === 'login' ? (ar ? 'إنشاء حساب' : 'Create one') : (ar ? 'تسجيل الدخول' : 'Sign in')}</button></p>
  </form></CardContent></Card>;
}
