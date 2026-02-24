"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Loader2 } from "lucide-react";
import {
  getItemAvailabilityByProduct,
  type ItemAvailability,
} from "@/actions/availability";
import { StatusBadge } from "@/components/shared/status-badge";
import { ITEM_STATUS_LABELS, ITEM_CONDITION_LABELS } from "@/lib/constants";
import { toast } from "sonner";

interface AvailabilityDetailProps {
  productId: string;
  productName: string;
  onBack: () => void;
}

export function AvailabilityDetail({
  productId,
  productName,
  onBack,
}: AvailabilityDetailProps) {
  const [items, setItems] = useState<ItemAvailability[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const result = await getItemAvailabilityByProduct(productId);
      if ("error" in result) {
        toast.error(result.error);
      } else {
        setItems(result.data);
      }
      setLoading(false);
    }
    load();
  }, [productId]);

  return (
    <div className="space-y-4">
      <Button variant="outline" onClick={onBack}>
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to overview
      </Button>

      <Card>
        <CardHeader>
          <CardTitle>{productName} -- Items</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : items.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              No items found for this product.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item ID</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Condition</TableHead>
                  <TableHead>Color</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => (
                  <TableRow key={item.itemId}>
                    <TableCell className="font-mono font-medium">
                      {item.humanReadableId}
                    </TableCell>
                    <TableCell>
                      <StatusBadge
                        status={item.status}
                        label={ITEM_STATUS_LABELS[item.status]}
                      />
                    </TableCell>
                    <TableCell>
                      <StatusBadge
                        status={item.condition}
                        label={ITEM_CONDITION_LABELS[item.condition]}
                      />
                    </TableCell>
                    <TableCell>
                      {item.color ? (
                        <Badge variant="secondary">{item.color}</Badge>
                      ) : (
                        <span className="text-muted-foreground text-sm">
                          --
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
