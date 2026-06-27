import type { ReactNode } from "react";
import { UserButton } from "@clerk/clerk-react";
import { NavLink } from "react-router-dom";
import { Receipt, ShoppingBag, Store } from "lucide-react";

import { cn } from "@/lib/utils";
import { CarritoSheet } from "@/components/CarritoSheet";

// Barra superior fija: marca + navegación a la izquierda; carrito y menú de
// usuario de Clerk (avatar + cerrar sesión) a la derecha. Ocupa todo el ancho.
export function Header() {
  return (
    <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur">
      <div className="flex h-14 w-full items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-6">
          <span className="flex items-center gap-2 font-semibold">
            <ShoppingBag className="size-5 text-emerald-600" />
            Carrito Feliz
          </span>
          <nav className="flex items-center gap-1">
            <Enlace to="/" icono={<Store className="size-4" />}>
              Tienda
            </Enlace>
            <Enlace to="/receipt" icono={<Receipt className="size-4" />}>
              Boletas
            </Enlace>
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <CarritoSheet />
          <UserButton />
        </div>
      </div>
    </header>
  );
}

function Enlace({
  to,
  icono,
  children,
}: {
  to: string;
  icono: ReactNode;
  children: string;
}) {
  return (
    <NavLink
      to={to}
      end
      className={({ isActive }) =>
        cn(
          "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
          isActive
            ? "bg-secondary text-secondary-foreground"
            : "text-muted-foreground hover:text-foreground",
        )
      }
    >
      {icono}
      <span className="hidden sm:inline">{children}</span>
    </NavLink>
  );
}
