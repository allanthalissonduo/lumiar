import { Package } from "lucide-react";

export default function CatalogPage() {
  return (
    <div className="flex flex-col items-center justify-center py-32">
      <div className="flex h-16 w-16 items-center justify-center rounded-full" style={{ backgroundColor: "rgba(43,111,219,0.12)" }}>
        <Package className="h-8 w-8" style={{ color: "var(--ei-cobalt)" }} />
      </div>
      <h1 className="mt-4 text-lg font-semibold" style={{ color: "var(--ei-offwhite)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
        Catálogo
      </h1>
      <p className="mt-1 text-sm" style={{ color: "var(--ei-text-soft)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
        Em breve — sincronização do catálogo VTEX com WhatsApp Business.
      </p>
    </div>
  );
}
