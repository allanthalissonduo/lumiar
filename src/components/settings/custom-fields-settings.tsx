'use client';

import { Shield, SlidersHorizontal } from 'lucide-react';

import { CustomFieldsPanel } from '@/components/contacts/custom-fields-manager';
import { SettingsChip } from './settings-chip';

export function CustomFieldsSettings() {
  return (
    <div style={{ backgroundColor: "rgba(159,176,201,0.04)", border: "1px solid rgba(159,176,201,0.16)", borderRadius: "12px", padding: "20px" }}>
      <div className="flex items-center gap-2 mb-1">
        <SlidersHorizontal className="size-4" style={{ color: "var(--ei-cobalt)" }} />
        <p className="font-semibold" style={{ color: "var(--ei-offwhite)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Campos personalizados</p>
        <SettingsChip variant="admin" className="font-medium">
          <Shield />
          Admin
        </SettingsChip>
      </div>
      <p className="text-sm mb-4" style={{ color: "var(--ei-text-soft)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
        Campos extras para contatos (ex. CEP, origem do lead). Aparecem em todos os contatos e na ação de automação &quot;Atualizar Campo do Contato&quot;.
      </p>
      <CustomFieldsPanel />
    </div>
  );
}
