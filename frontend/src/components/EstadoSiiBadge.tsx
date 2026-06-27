import { AlertCircle, CheckCircle2, Clock } from "lucide-react";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import type { EstadoSii } from "@/lib/types";

const CONFIG = {
  pendiente: {
    label: "Pendiente",
    icon: Clock,
    clase: "border-amber-200 bg-amber-50 text-amber-700",
  },
  emitida: {
    label: "Emitida",
    icon: CheckCircle2,
    clase: "border-emerald-200 bg-emerald-50 text-emerald-700",
  },
  error: {
    label: "Error",
    icon: AlertCircle,
    clase: "border-red-200 bg-red-50 text-red-700",
  },
} as const;

// Estado de la emisión SII de una boleta, con color e ícono.
export function EstadoSiiBadge({ estado }: { estado: EstadoSii }) {
  const { label, icon: Icon, clase } = CONFIG[estado];
  return (
    <Badge variant="outline" className={cn("gap-1 font-medium", clase)}>
      <Icon className="size-3" />
      {label}
    </Badge>
  );
}
