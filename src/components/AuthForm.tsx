import { useState } from 'react';
import { account } from '@/lib/appwrite';
import { AppwriteException, ID } from 'appwrite';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useMutation, useQueryClient } from '@tanstack/react-query'; // <-- Import useQueryClient

// Eliminamos la prop 'onLoginSuccess' de la interfaz
interface AuthFormProps {
  // onLoginSuccess: (user: any) => void; // <-- ELIMINADO
}

// Eliminamos 'onLoginSuccess' de los props del componente
const AuthForm = (/*{ onLoginSuccess }: AuthFormProps*/) => { // <-- ELIMINADO
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState(''); // Para registro
  const { toast } = useToast();
  const queryClient = useQueryClient(); // <-- Obtener el queryClient

  // --- Mutación para Login ---
  const loginMutation = useMutation({
    mutationFn: ({ email, password }: { email: string, password: string }) =>
      account.createEmailPasswordSession(email, password),
    onSuccess: (/*session*/) => {
      toast({ title: 'Inicio de sesión exitoso' });
      // En lugar de llamar a onLoginSuccess, invalidamos la query del usuario
      queryClient.invalidateQueries({ queryKey: ['user'] }); // <-- MODIFICADO
      // App.tsx detectará el cambio y redirigirá
    },
    onError: (error: AppwriteException) => {
      toast({
        title: 'Error al iniciar sesión',
        description: error.message || 'Credenciales incorrectas.',
        variant: 'destructive',
      });
    },
  });

  // --- Mutación para Registro ---
  const registerMutation = useMutation({
    mutationFn: ({ email, password, name }: { email: string, password: string, name: string }) =>
      account.create(ID.unique(), email, password, name),
    onSuccess: async (/*user*/) => {
      toast({ title: 'Registro exitoso', description: 'Por favor, inicia sesión.' });
      // Podríamos intentar iniciar sesión automáticamente aquí si quisiéramos
      // await loginMutation.mutateAsync({ email, password });
      // O simplemente dejar que el usuario inicie sesión manualmente
    },
    onError: (error: AppwriteException) => {
      toast({
        title: 'Error en el registro',
        description: error.message || 'No se pudo crear la cuenta.',
        variant: 'destructive',
      });
    },
  });

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    loginMutation.mutate({ email, password });
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    registerMutation.mutate({ email, password, name });
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-muted/40">
      <Tabs defaultValue="login" className="w-[400px]">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="login">Iniciar Sesión</TabsTrigger>
          <TabsTrigger value="register">Registrarse</TabsTrigger>
        </TabsList>

        {/* Pestaña de Login */}
        <TabsContent value="login">
          <Card>
            <CardHeader>
              <CardTitle>Iniciar Sesión</CardTitle>
              <CardDescription>Accede a tu cuenta de Lipoout.</CardDescription>
            </CardHeader>
            <form onSubmit={handleLogin}>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="login-email">Email</Label>
                  <Input
                    id="login-email"
                    type="email"
                    placeholder="tu@email.com"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="login-password">Contraseña</Label>
                  <Input
                    id="login-password"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
              </CardContent>
              <CardFooter>
                <Button type="submit" className="w-full" disabled={loginMutation.isPending}>
                  {loginMutation.isPending ? 'Accediendo...' : 'Acceder'}
                </Button>
              </CardFooter>
            </form>
          </Card>
        </TabsContent>

        {/* Pestaña de Registro */}
        <TabsContent value="register">
          <Card>
            <CardHeader>
              <CardTitle>Registrarse</CardTitle>
              <CardDescription>Crea una nueva cuenta para acceder.</CardDescription>
            </CardHeader>
            <form onSubmit={handleRegister}>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="register-name">Nombre</Label>
                  <Input
                    id="register-name"
                    type="text"
                    placeholder="Tu Nombre"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="register-email">Email</Label>
                  <Input
                    id="register-email"
                    type="email"
                    placeholder="tu@email.com"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="register-password">Contraseña</Label>
                  <Input
                    id="register-password"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
              </CardContent>
              <CardFooter>
                <Button type="submit" className="w-full" disabled={registerMutation.isPending}>
                  {registerMutation.isPending ? 'Registrando...' : 'Crear Cuenta'}
                </Button>
              </CardFooter>
            </form>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AuthForm;