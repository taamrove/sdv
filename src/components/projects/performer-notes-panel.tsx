"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Pencil, Trash2, StickyNote, Check, X } from "lucide-react";
import {
  createPerformerNote,
  updatePerformerNote,
  deletePerformerNote,
} from "@/actions/performer-booking-notes";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface Note {
  id: string;
  notes: string;
  createdAt: Date | string;
  bookingId: string | null;
}

interface PerformerNotesPanelProps {
  assignmentId: string;
  notes: Note[];
}

export function PerformerNotesPanel({
  assignmentId,
  notes,
}: PerformerNotesPanelProps) {
  const router = useRouter();
  const [adding, setAdding] = useState(false);
  const [newText, setNewText] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleAdd() {
    if (!newText.trim()) return;
    setSaving(true);
    try {
      const result = await createPerformerNote(assignmentId, newText.trim());
      if ("error" in result) {
        toast.error(result.error);
      } else {
        toast.success("Note added");
        setNewText("");
        setAdding(false);
        router.refresh();
      }
    } catch {
      toast.error("Failed to add note");
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdate(noteId: string) {
    if (!editText.trim()) return;
    setSaving(true);
    try {
      const result = await updatePerformerNote(noteId, editText.trim());
      if ("error" in result) {
        toast.error(result.error);
      } else {
        toast.success("Note updated");
        setEditingId(null);
        setEditText("");
        router.refresh();
      }
    } catch {
      toast.error("Failed to update note");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(noteId: string) {
    setSaving(true);
    try {
      const result = await deletePerformerNote(noteId);
      if ("error" in result) {
        toast.error(result.error);
      } else {
        toast.success("Note deleted");
        router.refresh();
      }
    } catch {
      toast.error("Failed to delete note");
    } finally {
      setSaving(false);
    }
  }

  function startEdit(note: Note) {
    setEditingId(note.id);
    setEditText(note.notes);
    setAdding(false);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditText("");
  }

  return (
    <div className="space-y-2 border-t pt-3 mt-3">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          <StickyNote className="h-3 w-3" />
          Notes
          {notes.length > 0 && (
            <span className="ml-1 rounded-full bg-muted px-1.5 py-0.5 text-xs">
              {notes.length}
            </span>
          )}
        </span>
        {!adding && !editingId && (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-xs"
            onClick={() => setAdding(true)}
          >
            <Plus className="h-3 w-3 mr-1" />
            Add note
          </Button>
        )}
      </div>

      {/* Existing notes */}
      {notes.map((note) => (
        <div key={note.id} className="rounded-md bg-muted/50 px-3 py-2 text-sm">
          {editingId === note.id ? (
            <div className="space-y-2">
              <Textarea
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                rows={2}
                className="text-sm"
                autoFocus
              />
              <div className="flex justify-end gap-1">
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 px-2"
                  onClick={cancelEdit}
                  disabled={saving}
                >
                  <X className="h-3 w-3" />
                </Button>
                <Button
                  size="sm"
                  className="h-6 px-2"
                  onClick={() => handleUpdate(note.id)}
                  disabled={saving || !editText.trim()}
                >
                  <Check className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex items-start justify-between gap-2">
              <p className="whitespace-pre-wrap leading-snug">{note.notes}</p>
              <div className="flex shrink-0 gap-0.5">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5"
                  onClick={() => startEdit(note)}
                  disabled={saving}
                >
                  <Pencil className="h-3 w-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5 text-destructive hover:text-destructive"
                  onClick={() => handleDelete(note.id)}
                  disabled={saving}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
          )}
        </div>
      ))}

      {/* Add note form */}
      {adding && (
        <div className="space-y-2">
          <Textarea
            placeholder="Add a note about this performer's booking needs..."
            value={newText}
            onChange={(e) => setNewText(e.target.value)}
            rows={2}
            className="text-sm"
            autoFocus
          />
          <div className="flex justify-end gap-1">
            <Button
              size="sm"
              variant="ghost"
              className="h-6 px-2"
              onClick={() => {
                setAdding(false);
                setNewText("");
              }}
              disabled={saving}
            >
              <X className="h-3 w-3" />
            </Button>
            <Button
              size="sm"
              className="h-6 px-2"
              onClick={handleAdd}
              disabled={saving || !newText.trim()}
            >
              <Check className="h-3 w-3" />
              Save
            </Button>
          </div>
        </div>
      )}

      {notes.length === 0 && !adding && (
        <p className="text-xs text-muted-foreground italic">No notes yet.</p>
      )}
    </div>
  );
}
