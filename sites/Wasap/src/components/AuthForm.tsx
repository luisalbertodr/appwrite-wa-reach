import React, { useState } from 'react';
import { account } from '../lib/appwrite';
import { OAuthProvider } from 'appwrite';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { Card, CardHeader, CardContent, CardFooter, CardTitle, CardDescription } from './ui/card';

const AuthForm: React.FC<{ onLoginSuccess: (user: any) => void }> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleEmailPasswordAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await account.createEmailPasswordSession(email, password);
      const user = await account.get();
      onLoginSuccess(user);
    } catch (err: any) {
      setError(err.message || 'An error occurred during authentication.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    setError('');
    setLoading(true);
    try {
      // --- INICIO DE LA MODIFICACIÓN ---
      // Reemplaza "https://tu-dominio.com/" con la URL de tu aplicación desplegada
      const successUrl = 'https://wasap.lipoout.com/';
      const failureUrl = 'https://wasap.lipoout.com/login';
      await account.createOAuth2Session(OAuthProvider.Google, successUrl, failureUrl);
      // --- FIN DE LA MODIFICACIÓN ---
    } catch (err: any) {
      setError(err.message || 'An error occurred during Google authentication.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl text-center">
            Login
          </CardTitle>
          <CardDescription className="text-center">
            Introduce tu email y contraseña o usa Google
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          {error && <p className="text-red-500 text-center">{error}</p>}
          <form onSubmit={handleEmailPasswordAuth} className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="m@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">Contraseña</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Iniciando...' : 'Iniciar Sesión'}
            </Button>
          </form>
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                O continuar con
              </span>
            </div>
          </div>
          <Button variant="outline" className="w-full" onClick={handleGoogleAuth} disabled={loading}>
            Google
          </Button>
        </CardContent>
        <CardFooter className="flex justify-center" />
      </Card>
    </div>
  );
};

export default AuthForm;