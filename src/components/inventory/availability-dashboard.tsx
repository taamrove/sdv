"use client";

import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Eye, Package } from "lucide-react";
import { AvailabilityDetail } from "./availability-detail";
import type { ProductAvailability } from "@/actions/availability";

interface Category {
  id: string;
  code: string;
  name: string;
}

interface AvailabilityDashboardProps {
  groups: ProductAvailability[];
  categories: Category[];
}

export function AvailabilityDashboard({
  groups,
  categories,
}: AvailabilityDashboardProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [drillDownProductId, setDrillDownProductId] = useState<string | null>(null);
  const [drillDownProductName, setDrillDownProductName] = useState<string>("");

  function handleCategoryFilter(value: string) {
    startTransition(() => {
      const sp = new URLSearchParams(searchParams.toString());
      if (value === "all") {
        sp.delete("categoryId");
      } else {
        sp.set("categoryId", value);
      }
      router.push(`?${sp.toString()}`);
    });
  }

  function handleDrillDown(productId: string, productName: string) {
    setDrillDownProductId(productId);
    setDrillDownProductName(productName);
  }

  function handleBack() {
    setDrillDownProductId(null);
    setDrillDownProductName("");
  }

  if (drillDownProductId) {
    return (
      <AvailabilityDetail
        productId={drillDownProductId}
        productName={drillDownProductName}
        onBack={handleBack}
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* Filter Bar */}
      <div className="flex gap-4">
        <Select
          value={searchParams.get("categoryId") ?? "all"}
          onValueChange={handleCategoryFilter}
        >
          <SelectTrigger className="w-[220px]">
            <SelectValue placeholder="All categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {categories.map((cat) => (
              <SelectItem key={cat.id} value={cat.id}>
                {cat.code} - {cat.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {isPending && (
          <span className="text-sm text-muted-foreground self-center">
            Loading...
          </span>
        )}
      </div>

      {/* Empty State */}
      {groups.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
          <Package className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium">No products found</h3>
          <p className="text-sm text-muted-foreground mt-1">
            There are no items in the inventory matching the selected filters.
          </p>
        </div>
      ) : (
        /* Card Grid */
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {groups.map((group) => (
            <Card key={group.productId}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">
                    {group.productName}
                  </CardTitle>
                  <Badge variant="outline">
                    {group.categoryCode} - {group.categoryName}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {/* Available - big green number */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      Available
                    </span>
                    <span className="text-2xl font-bold text-green-600">
                      {group.availableItems}
                    </span>
                  </div>

                  {/* Status breakdown */}
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="flex items-center justify-between rounded-md bg-yellow-50 px-2 py-1 dark:bg-yellow-950/30">
                      <span className="text-yellow-700 dark:text-yellow-400">
                        Assigned
                      </span>
                      <span className="font-medium text-yellow-700 dark:text-yellow-400">
                        {group.assignedItems}
                      </span>
                    </div>
                    <div className="flex items-center justify-between rounded-md bg-red-50 px-2 py-1 dark:bg-red-950/30">
                      <span className="text-red-700 dark:text-red-400">
                        Maintenance
                      </span>
                      <span className="font-medium text-red-700 dark:text-red-400">
                        {group.maintenanceItems}
                      </span>
                    </div>
                  </div>

                  {group.externalItems > 0 && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">External</span>
                      <Badge variant="secondary">{group.externalItems}</Badge>
                    </div>
                  )}

                  <div className="flex items-center justify-between border-t pt-2">
                    <span className="text-sm font-medium">Total</span>
                    <span className="text-sm font-bold">
                      {group.totalItems}
                    </span>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() =>
                      handleDrillDown(group.productId, group.productName)
                    }
                  >
                    <Eye className="mr-2 h-4 w-4" />
                    View items
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
