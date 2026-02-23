"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createFeedback } from "@/actions/feedback";
import { FEEDBACK_CATEGORY_LABELS } from "@/lib/constants";

interface FeedbackFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function FeedbackForm({ open, onOpenChange }: FeedbackFormProps) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<string>("IMPROVEMENT");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function handleReset() {
    setTitle("");
    setCategory("IMPROVEMENT");
    setDescription("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      toast.error("Title is required");
      return;
    }

    setSubmitting(true);
    try {
      const result = await createFeedback({
        title: title.trim(),
        category: category as "BUG" | "FEATURE_REQUEST" | "IMPROVEMENT",
        description: description.trim() || undefined,
      });

      if ("error" in result) {
        toast.error(result.error);
      } else {
        toast.success("Feedback submitted! Thank you.");
        handleReset();
        onOpenChange(false);
        router.refresh();
      }
    } catch {
      toast.error("Failed to submit feedback");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) handleReset();
        onOpenChange(v);
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Submit Feedback</DialogTitle>
          <DialogDescription>
            Share a bug report, feature request, or improvement suggestion.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="fb-title">Title</Label>
            <Input
              id="fb-title"
              placeholder="Brief summary..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={200}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="fb-category">Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger id="fb-category">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(FEEDBACK_CATEGORY_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="fb-description">Description (optional)</Label>
            <Textarea
              id="fb-description"
              placeholder="Provide more details..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              maxLength={2000}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Submitting..." : "Submit"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
