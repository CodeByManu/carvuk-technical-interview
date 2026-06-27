import { SignedIn, SignedOut, SignIn } from "@clerk/clerk-react";
import { Navigate, Route, Routes } from "react-router-dom";

import { Header } from "@/components/Header";
import { Catalogo } from "@/components/Catalogo";
import { Boletas } from "@/components/Boletas";
import { CarritoProvider } from "@/lib/carrito";
import { Toaster } from "@/components/ui/sonner";

function App() {
  return (
    <>
      {/* Clerk decide cuál bloque se muestra según el estado de sesión. */}
      <SignedOut>
        <main className="flex min-h-svh items-center justify-center bg-muted/40 p-4">
          {/* Vista directa de inicio de sesión / crear cuenta. */}
          <SignIn routing="hash" />
        </main>
      </SignedOut>
      <SignedIn>
        <CarritoProvider>
          <div className="min-h-svh bg-background">
            <Header />
            <Routes>
              <Route path="/" element={<Catalogo />} />
              <Route path="/receipt" element={<Boletas />} />
              {/* Cualquier ruta desconocida vuelve a la tienda. */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </div>
          <Toaster />
        </CarritoProvider>
      </SignedIn>
    </>
  );
}

export default App;
