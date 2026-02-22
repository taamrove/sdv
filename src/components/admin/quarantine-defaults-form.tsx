"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MAINTENANCE_SEVERITY_LABELS } from "@/lib/constants";
import { upsertQuarantineDefault } from "@/actions/quarantine-defaults";
import { Save } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Category {
  id: string;
  code: string;
  name: string;
}

interface QuarantineDefault {
  id: string;
  categoryId: string;
  severity: string;
  defaultQuarantineDays: number;
}

interface QuarantineDefaultsFormProps {
  categories: Category[];
  defaults: QuarantineDefault[];
}

const SEVERITIES = ["MINOR", "MODERATE", "UNUSABLE"] as const;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function QuarantineDefaultsForm({
  categories,
  defaults,
}: QuarantineDefaultsFormProps) {
  const router = useRouter();

  // Build a lookup map: categoryId-severity -> days
  const initialValues: Record<string, string> = {};
  for (const d of defaults) {
    initialValues[`${d.categoryId}-${d.severity}`] =
      String(d.defaultQuarantineDays);
  }

  const [values, setValues] = useState<Record<string, string>>(initialValues);
  const [savingRow, setSavingRow] = useState<string | null>(null);

  function getValue(categoryId: string, severity: string): string {
    return values[`${categoryId}-${severity}`] ?? "";
  }

  function setValue(categoryId: string, severity: string, val: string) {
    setValues((prev) => ({
      ...prev,
      [`${categoryId}-${severity}`]: val,
    }));
  }

  async function handleSaveRow(categoryId: string) {
    setSavingRow(categoryId);
    try {
      let hasError = false;

      for (const severity of SEVERITIES) {
        const raw = getValue(categoryId, severity);
        if (raw === "") continue;

        const days = parseInt(raw, 10);
        if (isNaN(days) || days < 0 || days > 365) {
          toast.error(
            `Invalid value for ${MAINTENANCE_SEVERITY_LABELS[severity]}: must be 0-365`
          );
          hasError = true;
          break;
        }

        const result = await upsertQuarantineDefault({
          categoryId,
          severity,
          defaultQuarantineDays: days,
        });

        if ("error" in result) {
          toast.error(result.error);
          hasError = true;
          break;
        }
      }

      if (!hasError) {
        toast.success("Quarantine defaults saved");
        router.refresh();
      }
    } catch {
      toast.error("Failed to save quarantine defaults");
    } finally {
      setSavingRow(null);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">
          Default Quarantine Days by Category and Severity
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[200px]">Category</TableHead>
              {SEVERITIES.map((sev) => (
                <TableHead key={sev} className="text-center w-[140px]">
                  {MAINTENANCE_SEVERITY_LABELS[sev]}
                </TableHead>
              ))}
              <TableHead className="text-right w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {categories.map((category) => (
              <TableRow key={category.id}>
                <TableCell className="font-medium">{category.name}</TableCell>
                {SEVERITIES.map((severity) => (
                  <TableCell key={severity} className="text-center">
                    <Input
                      type="number"
                      min={0}
                      max={365}
                      placeholder="--"
                      className="w-20 mx-auto text-center"
                      value={getValue(category.id, severity)}
                      onChange={(e) =>
                        setValue(category.id, severity, e.target.value)
                      }
                    />
                  </TableCell>
                ))}
                <TableCell className="text-right">
                  <Button
                    size="sm"
                    disabled={savingRow === category.id}
                    onClick={() => handleSaveRow(category.id)}
                  >
                    <Save className="mr-1 h-3 w-3" />
                    {savingRow === category.id ? "Saving..." : "Save"}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <p className="text-xs text-muted-foreground mt-4">
          Set the number of quarantine days for each category and severity level.
          Leave blank for no quarantine. Items with MINOR severity are never
          quarantined regardless of the configured value.
        </p>
      </CardContent>
    </Card>
  );
}
