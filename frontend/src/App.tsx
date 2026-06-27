import {
  SignedIn,
  SignedOut,
  SignInButton,
  SignOutButton,
  useUser,
} from "@clerk/clerk-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

function App() {
  return (
    <main className="flex min-h-svh items-center justify-center bg-background p-4">
      {/* Clerk decide cuál bloque se muestra según el estado de sesión. */}
      <SignedOut>
        <LoginScreen />
      </SignedOut>
      <SignedIn>
        <Dashboard />
      </SignedIn>
    </main>
  );
}

// --- Sin sesión: login ------------------------------------------------------
function LoginScreen() {
  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>Carvuk</CardTitle>
        <CardDescription>Iniciá sesión para continuar.</CardDescription>
      </CardHeader>
      <CardContent>
        {/* Clerk clona el botón y le inyecta el onClick que abre el modal. */}
        <SignInButton mode="modal">
          <Button className="w-full">Iniciar sesión</Button>
        </SignInButton>
      </CardContent>
    </Card>
  );
}

// --- Con sesión: pantalla con el nombre + cerrar sesión ---------------------
function Dashboard() {
  const { user } = useUser();

  // Clerk no garantiza fullName/firstName según el método de registro;
  // bajamos por la cadena hasta algo siempre presente (el email).
  const displayName =
    user?.fullName ||
    user?.firstName ||
    user?.username ||
    user?.primaryEmailAddress?.emailAddress ||
    "usuario";

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardDescription>Sesión activa</CardDescription>
        <CardTitle className="text-xl">Hola, {displayName}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          Esta es una pantalla de ejemplo. Estás dentro.
        </p>
      </CardContent>
      <CardFooter>
        <SignOutButton>
          <Button variant="outline" className="w-full">
            Cerrar sesión
          </Button>
        </SignOutButton>
      </CardFooter>
    </Card>
  );
}

export default App;
