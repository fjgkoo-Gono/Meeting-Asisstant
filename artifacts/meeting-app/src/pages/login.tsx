import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/lib/supabase';

type Mode = 'signIn' | 'signUp';

export default function Login() {
  const [mode, setMode] = useState<Mode>('signIn');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [signUpDone, setSignUpDone] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (mode === 'signIn') {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) throw signInError;
      } else {
        const { data, error: signUpError } = await supabase.auth.signUp({ email, password });
        if (signUpError) throw signUpError;
        // If the project has email confirmation disabled, signUp already
        // returns an active session — Gate picks it up via onAuthStateChange
        // and there's nothing else to show here.
        if (!data.session) setSignUpDone(true);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ocurrió un error. Inténtalo de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center px-6 py-12 bg-background text-foreground">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-serif font-bold text-center mb-1">Meeting Assistant</h1>
        <p className="text-sm text-muted-foreground text-center mb-8">
          {mode === 'signIn' ? 'Inicia sesión para continuar' : 'Crea tu cuenta para empezar'}
        </p>

        {signUpDone ? (
          <div className="text-center space-y-4">
            <p className="text-sm text-foreground">
              Revisa tu correo (<span className="font-medium">{email}</span>) para confirmar tu cuenta antes de iniciar sesión.
            </p>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                setSignUpDone(false);
                setMode('signIn');
              }}
            >
              Volver a iniciar sesión
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">Correo electrónico</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="rounded-xl h-11"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Contraseña</Label>
              <Input
                id="password"
                type="password"
                autoComplete={mode === 'signIn' ? 'current-password' : 'new-password'}
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="rounded-xl h-11"
              />
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <Button type="submit" className="w-full h-11 rounded-xl" disabled={loading}>
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : mode === 'signIn' ? (
                'Iniciar sesión'
              ) : (
                'Crear cuenta'
              )}
            </Button>

            <p className="text-sm text-center text-muted-foreground">
              {mode === 'signIn' ? '¿No tienes cuenta? ' : '¿Ya tienes cuenta? '}
              <button
                type="button"
                className="text-primary font-medium hover:underline"
                onClick={() => {
                  setError(null);
                  setMode(mode === 'signIn' ? 'signUp' : 'signIn');
                }}
              >
                {mode === 'signIn' ? 'Crear cuenta' : 'Iniciar sesión'}
              </button>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
