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
  getAvailabilityByPiece,
  type PieceAvailability,
} from "@/actions/availability";
import { StatusBadge } from "@/components/shared/status-badge";
import { PIECE_STATUS_LABELS, PIECE_CONDITION_LABELS } from "@/lib/constants";
import { toast } from "sonner";

interface AvailabilityDetailProps {
  itemId: string;
  itemName: string;
  onBack: () => void;
}

export function AvailabilityDetail({
  itemId,
  itemName,
  onBack,
}: AvailabilityDetailProps) {
  const [pieces, setPieces] = useState<PieceAvailability[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const result = await getAvailabilityByPiece(itemId);
      if ("error" in result) {
        toast.error(result.error);
      } else {
        setPieces(result.data);
      }
      setLoading(false);
    }
    load();
  }, [itemId]);

  return (
    <div className="space-y-4">
      <Button variant="outline" onClick={onBack}>
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to overview
      </Button>

      <Card>
        <CardHeader>
          <CardTitle>{itemName} -- Pieces</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : pieces.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              No pieces found for this item.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Piece ID</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Condition</TableHead>
                  <TableHead>Color</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pieces.map((piece) => (
                  <TableRow key={piece.pieceId}>
                    <TableCell className="font-mono font-medium">
                      {piece.humanReadableId}
                    </TableCell>
                    <TableCell>
                      <StatusBadge
                        status={piece.status}
                        label={PIECE_STATUS_LABELS[piece.status]}
                      />
                    </TableCell>
                    <TableCell>
                      <StatusBadge
                        status={piece.condition}
                        label={PIECE_CONDITION_LABELS[piece.condition]}
                      />
                    </TableCell>
                    <TableCell>
                      {piece.color ? (
                        <Badge variant="secondary">{piece.color}</Badge>
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
