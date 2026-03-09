"use client";

import { useState } from "react";
import { Check, ChevronsUpDown, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { getFullName } from "@/lib/format-name";
import { cn } from "@/lib/utils";

interface Performer {
  id: string;
  firstName: string;
  lastName: string;
}

interface PerformerComboboxProps {
  performers: Performer[];
  value: string | undefined;
  onValueChange: (id: string | undefined) => void;
  onNewPerformer?: () => void;
  disabled?: boolean;
}

/**
 * Searchable combobox for selecting a performer.
 * Replaces a plain <Select> when the list is too long to scroll.
 */
export function PerformerCombobox({
  performers,
  value,
  onValueChange,
  onNewPerformer,
  disabled = false,
}: PerformerComboboxProps) {
  const [open, setOpen] = useState(false);

  const selected = performers.find((p) => p.id === value);
  const displayLabel = selected ? getFullName(selected) : "Not assigned";

  function handleSelect(id: string | undefined) {
    onValueChange(id);
    setOpen(false);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            "w-full justify-between font-normal",
            !selected && "text-muted-foreground"
          )}
        >
          {displayLabel}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[--radix-popover-trigger-width] p-0"
        align="start"
      >
        <Command>
          <CommandInput placeholder="Search performers…" />
          <CommandList>
            <CommandEmpty>No performer found.</CommandEmpty>
            <CommandGroup>
              <CommandItem
                value="none"
                onSelect={() => handleSelect(undefined)}
              >
                <Check
                  className={cn(
                    "mr-2 h-4 w-4",
                    !value ? "opacity-100" : "opacity-0"
                  )}
                />
                Not assigned
              </CommandItem>
              {performers.map((p) => (
                <CommandItem
                  key={p.id}
                  value={getFullName(p)}
                  onSelect={() => handleSelect(p.id)}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === p.id ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {getFullName(p)}
                </CommandItem>
              ))}
            </CommandGroup>
            {onNewPerformer && (
              <>
                <CommandSeparator />
                <CommandGroup>
                  <CommandItem
                    value="__new_performer__"
                    onSelect={() => {
                      setOpen(false);
                      onNewPerformer();
                    }}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    New performer
                  </CommandItem>
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
