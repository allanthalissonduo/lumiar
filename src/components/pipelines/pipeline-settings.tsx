"use client";

import { useEffect, useState } from "react";
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  arrayMove,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { createClient } from "@/lib/supabase/client";
import type { Pipeline, PipelineStage } from "@/types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Trash2,
  Plus,
  GripVertical,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";

const STAGE_COLORS = [
  "#3b82f6",
  "#6366f1",
  "#8b5cf6",
  "#ec4899",
  "#f43f5e",
  "#f97316",
  "#eab308",
  "#22c55e",
  "#14b8a6",
  "#06b6d4",
];

interface PipelineSettingsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pipeline: Pipeline;
  stages: PipelineStage[];
  onPipelinesChanged: () => void;
  onStagesChanged: () => void;
  onCreateNewPipeline: () => void;
}

export function PipelineSettings({
  open,
  onOpenChange,
  pipeline,
  stages,
  onPipelinesChanged,
  onStagesChanged,
  onCreateNewPipeline,
}: PipelineSettingsProps) {
  const supabase = createClient();

  const [name, setName] = useState(pipeline.name);
  const [localStages, setLocalStages] = useState<PipelineStage[]>(stages);
  const [newStageName, setNewStageName] = useState("");
  const [newStageColor, setNewStageColor] = useState(STAGE_COLORS[0]);
  const [saving, setSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Reset form state when the dialog opens or its prop inputs change
  // — legitimate prop-driven sync.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!open) return;
    setName(pipeline.name);
    setLocalStages([...stages].sort((a, b) => a.position - b.position));
    setShowDeleteConfirm(false);
  }, [open, pipeline, stages]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  function handleReorder(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = localStages.findIndex((s) => s.id === active.id);
    const newIndex = localStages.findIndex((s) => s.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    setLocalStages(arrayMove(localStages, oldIndex, newIndex));
  }

  async function handleSave() {
    setSaving(true);

    // One upsert for all stages — batches N stage writes into a single
    // round-trip. Previous implementation did N sequential UPDATEs which
    // latency-scaled linearly with stage count.
    const stageRows = localStages.map((s, i) => ({
      id: s.id,
      pipeline_id: s.pipeline_id,
      name: s.name,
      color: s.color,
      position: i,
    }));

    const [renameRes, stagesRes] = await Promise.all([
      supabase
        .from("pipelines")
        .update({ name: name.trim() })
        .eq("id", pipeline.id),
      supabase.from("pipeline_stages").upsert(stageRows, { onConflict: "id" }),
    ]);

    setSaving(false);

    if (renameRes.error || stagesRes.error) {
      toast.error("Failed to save pipeline");
      return;
    }

    onOpenChange(false);
    onPipelinesChanged();
    onStagesChanged();
    toast.success("Pipeline saved");
  }

  async function handleAddStage() {
    const trimmed = newStageName.trim();
    if (!trimmed) return;
    const { data, error } = await supabase
      .from("pipeline_stages")
      .insert({
        pipeline_id: pipeline.id,
        name: trimmed,
        color: newStageColor,
        position: localStages.length,
      })
      .select()
      .single();
    if (error || !data) {
      toast.error("Failed to add stage");
      return;
    }
    setLocalStages([...localStages, data as PipelineStage]);
    setNewStageName("");
    setNewStageColor(STAGE_COLORS[(localStages.length + 1) % STAGE_COLORS.length]);
  }

  async function handleRemoveStage(stageId: string) {
    // Refuse to delete if deals still reference the stage (FK would fail).
    const { count } = await supabase
      .from("deals")
      .select("id", { count: "exact", head: true })
      .eq("stage_id", stageId);
    if (count && count > 0) {
      toast.error("Move or delete deals in this stage first");
      return;
    }
    const { error } = await supabase
      .from("pipeline_stages")
      .delete()
      .eq("id", stageId);
    if (error) {
      toast.error("Failed to delete stage");
      return;
    }
    setLocalStages(localStages.filter((s) => s.id !== stageId));
  }

  async function handleDeletePipeline() {
    setDeleting(true);
    // ON DELETE CASCADE handles deals + stages.
    const { error } = await supabase
      .from("pipelines")
      .delete()
      .eq("id", pipeline.id);
    setDeleting(false);
    if (error) {
      toast.error("Failed to delete pipeline");
      return;
    }
    onOpenChange(false);
    onPipelinesChanged();
    toast.success("Pipeline deleted");
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto" style={{ backgroundColor: "#0d1e36", border: "1px solid rgba(43,111,219,0.30)" }}>
        <DialogHeader>
          <DialogTitle style={{ color: "var(--ei-offwhite)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Gerenciar Pipeline</DialogTitle>
        </DialogHeader>

        {showDeleteConfirm ? (
          <div className="py-4">
            <div className="flex items-center gap-3 rounded-lg p-4" style={{ border: "1px solid rgba(248,113,113,0.30)", backgroundColor: "rgba(248,113,113,0.10)" }}>
              <AlertTriangle className="h-5 w-5 shrink-0" style={{ color: "#f87171" }} />
              <div>
                <p className="text-sm font-medium" style={{ color: "#f87171", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                  Excluir Pipeline
                </p>
                <p className="mt-1 text-xs" style={{ color: "var(--ei-text-soft)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                  Todos os negócios deste pipeline serão arquivados. Esta ação não pode ser desfeita.
                </p>
              </div>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                className="rounded-lg px-4 py-2 text-sm font-medium transition-colors"
                style={{ border: "1px solid rgba(159,176,201,0.22)", backgroundColor: "transparent", color: "var(--ei-text-soft)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = "rgba(159,176,201,0.08)"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = "transparent"; }}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleDeletePipeline}
                disabled={deleting}
                className="rounded-lg px-4 py-2 text-sm font-medium transition-colors"
                style={{ backgroundColor: "#dc2626", color: "#fff", fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                onMouseEnter={(e) => { if (!deleting) (e.currentTarget as HTMLButtonElement).style.backgroundColor = "#b91c1c"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = "#dc2626"; }}
              >
                {deleting ? "Excluindo..." : "Excluir Pipeline"}
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="grid gap-4 py-2">
              <div className="grid gap-2">
                <Label style={{ color: "var(--ei-text-soft)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Nome do Pipeline</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  style={{ backgroundColor: "rgba(159,176,201,0.08)", border: "1px solid rgba(159,176,201,0.22)", color: "var(--ei-offwhite)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                />
              </div>

              <div className="grid gap-2">
                <Label style={{ color: "var(--ei-text-soft)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Etapas</Label>
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleReorder}
                >
                  <SortableContext
                    items={localStages.map((s) => s.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="space-y-2">
                      {localStages.map((stage, index) => (
                        <SortableStageRow
                          key={stage.id}
                          stage={stage}
                          onNameChange={(v) => {
                            const updated = [...localStages];
                            updated[index] = { ...updated[index], name: v };
                            setLocalStages(updated);
                          }}
                          onColorChange={(v) => {
                            const updated = [...localStages];
                            updated[index] = { ...updated[index], color: v };
                            setLocalStages(updated);
                          }}
                          onRemove={() => handleRemoveStage(stage.id)}
                          colors={STAGE_COLORS}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>

                {/* Add new stage */}
                <div className="mt-1 flex flex-wrap gap-1">
                  {STAGE_COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setNewStageColor(color)}
                      className="h-5 w-5 rounded-full border-2 transition-transform hover:scale-110"
                      style={{
                        backgroundColor: color,
                        borderColor: newStageColor === color ? "var(--ei-offwhite)" : "transparent",
                      }}
                      aria-label={`Escolher cor ${color}`}
                    />
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    value={newStageName}
                    onChange={(e) => setNewStageName(e.target.value)}
                    placeholder="Nome da nova etapa"
                    className="text-sm"
                    style={{ backgroundColor: "rgba(159,176,201,0.08)", border: "1px solid rgba(159,176,201,0.22)", color: "var(--ei-offwhite)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleAddStage();
                    }}
                  />
                  <button
                    type="button"
                    onClick={handleAddStage}
                    disabled={!newStageName.trim()}
                    className="flex shrink-0 items-center rounded-lg px-3 py-2 text-sm font-medium transition-colors"
                    style={{ border: "1px solid rgba(159,176,201,0.22)", backgroundColor: "transparent", color: "var(--ei-text-soft)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                    onMouseEnter={(e) => { if (newStageName.trim()) (e.currentTarget as HTMLButtonElement).style.backgroundColor = "rgba(159,176,201,0.08)"; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = "transparent"; }}
                  >
                    <Plus className="mr-1 h-3 w-3" />
                    Adicionar
                  </button>
                </div>
              </div>

              <button
                type="button"
                onClick={onCreateNewPipeline}
                className="flex w-full items-center justify-center rounded-lg px-4 py-2 text-sm font-medium transition-colors"
                style={{ border: "1px solid rgba(159,176,201,0.22)", backgroundColor: "transparent", color: "var(--ei-text-soft)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = "rgba(159,176,201,0.08)"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = "transparent"; }}
              >
                <Plus className="mr-1 h-3 w-3" />
                Criar novo pipeline
              </button>
            </div>

            <DialogFooter style={{ borderTop: "1px solid rgba(159,176,201,0.14)" }}>
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                className="mr-auto rounded-lg px-4 py-2 text-sm font-medium transition-colors"
                style={{ backgroundColor: "rgba(248,113,113,0.15)", color: "#f87171", border: "1px solid rgba(248,113,113,0.25)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = "rgba(248,113,113,0.25)"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = "rgba(248,113,113,0.15)"; }}
              >
                Excluir Pipeline
              </button>
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="rounded-lg px-4 py-2 text-sm font-medium transition-colors"
                style={{ border: "1px solid rgba(159,176,201,0.22)", backgroundColor: "transparent", color: "var(--ei-text-soft)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = "rgba(159,176,201,0.08)"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = "transparent"; }}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving || !name.trim()}
                className="rounded-lg px-4 py-2 text-sm font-medium transition-colors"
                style={{ backgroundColor: "var(--ei-cobalt)", color: "#fff", fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                onMouseEnter={(e) => { if (!saving && name.trim()) (e.currentTarget as HTMLButtonElement).style.backgroundColor = "var(--ei-royal)"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = "var(--ei-cobalt)"; }}
              >
                {saving ? "Salvando..." : "Salvar Alterações"}
              </button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function SortableStageRow({
  stage,
  onNameChange,
  onColorChange,
  onRemove,
  colors,
}: {
  stage: PipelineStage;
  onNameChange: (v: string) => void;
  onColorChange: (v: string) => void;
  onRemove: () => void;
  colors: string[];
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: stage.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={{ ...style, border: "1px solid rgba(159,176,201,0.16)", backgroundColor: "rgba(159,176,201,0.06)" }}
      className="flex items-center gap-2 rounded-lg p-2"
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        className="cursor-grab touch-none active:cursor-grabbing"
        style={{ color: "var(--ei-text-soft)" }}
        aria-label="Arrastar para reordenar"
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <ColorSwatch value={stage.color} onChange={onColorChange} colors={colors} />
      <Input
        value={stage.name}
        onChange={(e) => onNameChange(e.target.value)}
        className="h-7 flex-1 text-sm"
        style={{ border: "none", backgroundColor: "transparent", color: "var(--ei-offwhite)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}
      />
      <button
        type="button"
        onClick={onRemove}
        className="flex h-6 w-6 items-center justify-center rounded transition-colors"
        style={{ color: "var(--ei-text-soft)" }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "#f87171"; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "var(--ei-text-soft)"; }}
      >
        <Trash2 className="h-3 w-3" />
      </button>
    </div>
  );
}

function ColorSwatch({
  value,
  onChange,
  colors,
}: {
  value: string;
  onChange: (v: string) => void;
  colors: string[];
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="h-4 w-4 rounded-full"
        style={{ backgroundColor: value, border: "1px solid rgba(159,176,201,0.30)" }}
        aria-label="Alterar cor"
      />
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-6 z-20 flex w-36 flex-wrap gap-1 rounded-lg p-2 shadow-lg" style={{ backgroundColor: "#0d1e36", border: "1px solid rgba(43,111,219,0.30)" }}>
            {colors.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => {
                  onChange(c);
                  setOpen(false);
                }}
                className="h-5 w-5 rounded-full border-2 transition-transform hover:scale-110"
                style={{
                  backgroundColor: c,
                  borderColor: c === value ? "var(--ei-offwhite)" : "transparent",
                }}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
