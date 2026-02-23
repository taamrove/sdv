"use client";

import { useState } from "react";
import { Plus, Bug, Lightbulb, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/shared/status-badge";
import { FeedbackForm } from "./feedback-form";
import {
  FEEDBACK_STATUS_LABELS,
  FEEDBACK_CATEGORY_LABELS,
} from "@/lib/constants";

interface FeedbackItem {
  id: string;
  title: string;
  description: string | null;
  category: string;
  status: string;
  priority: string;
  devNotes: string | null;
  createdAt: string;
  updatedAt: string;
}

interface FeedbackListProps {
  feedback: FeedbackItem[];
}

const CATEGORY_ICONS: Record<string, typeof Bug> = {
  BUG: Bug,
  FEATURE_REQUEST: Lightbulb,
  IMPROVEMENT: Sparkles,
};

export function FeedbackList({ feedback }: FeedbackListProps) {
  const [formOpen, setFormOpen] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setFormOpen(true)}>
          <Plus className="mr-2 size-4" />
          Submit Feedback
        </Button>
      </div>

      {feedback.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            You haven&apos;t submitted any feedback yet.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {feedback.map((item) => {
            const Icon = CATEGORY_ICONS[item.category] ?? Sparkles;
            const date = new Date(item.createdAt);

            return (
              <Card key={item.id}>
                <CardContent className="py-4">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 rounded-md border p-2">
                      <Icon className="size-4 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium">{item.title}</span>
                        <StatusBadge
                          status={item.category}
                          label={FEEDBACK_CATEGORY_LABELS[item.category]}
                        />
                        <StatusBadge
                          status={item.status}
                          label={FEEDBACK_STATUS_LABELS[item.status]}
                        />
                      </div>
                      {item.description && (
                        <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                          {item.description}
                        </p>
                      )}
                      <p className="mt-1 text-xs text-muted-foreground">
                        {date.toLocaleDateString("en-GB", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <FeedbackForm open={formOpen} onOpenChange={setFormOpen} />
    </div>
  );
}
