"use client";

import { useEffect, useState } from "react";
import { Check, MapPin, Plus } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";

export interface FullLocation {
  id: string;
  room: string | null;
  zone: string;
  rack: string | null;
  shelf: string | null;
  bin: string | null;
  label: string;
}

interface LocationCascadingSelectProps {
  locations: FullLocation[];
  value: string | undefined;
  onValueChange: (id: string | undefined) => void;
  onNewLocation?: () => void;
  disabled?: boolean;
}

/** Return sorted unique non-empty values for a level from an array of locations. */
function uniqueValues(locs: FullLocation[], key: keyof FullLocation): string[] {
  const set = new Set<string>();
  for (const l of locs) {
    const v = l[key];
    if (v) set.add(v as string);
  }
  return Array.from(set).sort();
}

const UNSET = "__none__";

export function LocationCascadingSelect({
  locations,
  value,
  onValueChange,
  onNewLocation,
  disabled = false,
}: LocationCascadingSelectProps) {
  // Initialise cascade from the currently selected location (if any)
  const selected = locations.find((l) => l.id === value);

  const [selRoom,  setSelRoom]  = useState<string>(selected?.room  ?? UNSET);
  const [selZone,  setSelZone]  = useState<string>(selected?.zone  ?? UNSET);
  const [selRack,  setSelRack]  = useState<string>(selected?.rack  ?? UNSET);
  const [selShelf, setSelShelf] = useState<string>(selected?.shelf ?? UNSET);
  const [selBin,   setSelBin]   = useState<string>(selected?.bin   ?? UNSET);

  // Sync cascade state when the external value changes (e.g. form reset)
  useEffect(() => {
    const loc = locations.find((l) => l.id === value);
    if (loc) {
      setSelRoom(loc.room  ?? UNSET);
      setSelZone(loc.zone);
      setSelRack(loc.rack  ?? UNSET);
      setSelShelf(loc.shelf ?? UNSET);
      setSelBin(loc.bin   ?? UNSET);
    } else if (!value) {
      setSelRoom(UNSET);
      setSelZone(UNSET);
      setSelRack(UNSET);
      setSelShelf(UNSET);
      setSelBin(UNSET);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  // ── Filtering ──────────────────────────────────────────────────────────────
  const byRoom  = selRoom  !== UNSET ? locations.filter((l) => (l.room  ?? UNSET) === selRoom)  : locations;
  const byZone  = selZone  !== UNSET ? byRoom.filter((l) => l.zone === selZone)  : byRoom;
  const byRack  = selRack  !== UNSET ? byZone.filter((l) => (l.rack  ?? UNSET) === selRack)  : byZone;
  const byShelf = selShelf !== UNSET ? byRack.filter((l) => (l.shelf ?? UNSET) === selShelf) : byRack;
  const byBin   = selBin   !== UNSET ? byShelf.filter((l) => (l.bin  ?? UNSET) === selBin)  : byShelf;

  // ── Auto-select ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (byBin.length === 1) {
      onValueChange(byBin[0].id);
    } else {
      onValueChange(undefined);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selRoom, selZone, selRack, selShelf, selBin]);

  // ── Unique options per level ───────────────────────────────────────────────
  const rooms   = uniqueValues(locations, "room");
  const zones   = uniqueValues(byRoom,  "zone");
  const racks   = uniqueValues(byZone,  "rack");
  const shelves = uniqueValues(byRack,  "shelf");
  const bins    = uniqueValues(byShelf, "bin");

  // ── Clear cascade helpers ──────────────────────────────────────────────────
  function clearFrom(level: "room" | "zone" | "rack" | "shelf" | "bin") {
    if (level === "room")  { setSelZone(UNSET); setSelRack(UNSET); setSelShelf(UNSET); setSelBin(UNSET); }
    if (level === "zone")  { setSelRack(UNSET); setSelShelf(UNSET); setSelBin(UNSET); }
    if (level === "rack")  { setSelShelf(UNSET); setSelBin(UNSET); }
    if (level === "shelf") { setSelBin(UNSET); }
  }

  const matchedLocation = byBin.length === 1 ? byBin[0] : null;

  return (
    <div className="space-y-2">
      {/* Room — only shown if any location has a room */}
      {rooms.length > 0 && (
        <div>
          <p className="text-xs text-muted-foreground mb-1">Room</p>
          <Select
            value={selRoom}
            onValueChange={(val) => {
              setSelRoom(val);
              clearFrom("room");
            }}
            disabled={disabled}
          >
            <SelectTrigger className="h-8 text-sm">
              <SelectValue placeholder="— Any room —" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={UNSET}>— Any room —</SelectItem>
              {rooms.map((r) => (
                <SelectItem key={r} value={r}>{r}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Zone */}
      {zones.length > 0 && (
        <div>
          <p className="text-xs text-muted-foreground mb-1">Zone</p>
          <Select
            value={selZone}
            onValueChange={(val) => {
              setSelZone(val);
              clearFrom("zone");
            }}
            disabled={disabled}
          >
            <SelectTrigger className="h-8 text-sm">
              <SelectValue placeholder="— Any zone —" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={UNSET}>— Any zone —</SelectItem>
              {zones.map((z) => (
                <SelectItem key={z} value={z}>{z}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Rack — only shown when there are options in the filtered set */}
      {racks.length > 0 && (
        <div>
          <p className="text-xs text-muted-foreground mb-1">Rack</p>
          <Select
            value={selRack}
            onValueChange={(val) => {
              setSelRack(val);
              clearFrom("rack");
            }}
            disabled={disabled}
          >
            <SelectTrigger className="h-8 text-sm">
              <SelectValue placeholder="— Any rack —" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={UNSET}>— Any rack —</SelectItem>
              {racks.map((r) => (
                <SelectItem key={r} value={r}>{r}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Shelf */}
      {shelves.length > 0 && (
        <div>
          <p className="text-xs text-muted-foreground mb-1">Shelf</p>
          <Select
            value={selShelf}
            onValueChange={(val) => {
              setSelShelf(val);
              clearFrom("shelf");
            }}
            disabled={disabled}
          >
            <SelectTrigger className="h-8 text-sm">
              <SelectValue placeholder="— Any shelf —" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={UNSET}>— Any shelf —</SelectItem>
              {shelves.map((s) => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Bin */}
      {bins.length > 0 && (
        <div>
          <p className="text-xs text-muted-foreground mb-1">Bin</p>
          <Select
            value={selBin}
            onValueChange={(val) => {
              setSelBin(val);
            }}
            disabled={disabled}
          >
            <SelectTrigger className="h-8 text-sm">
              <SelectValue placeholder="— Any bin —" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={UNSET}>— Any bin —</SelectItem>
              {bins.map((b) => (
                <SelectItem key={b} value={b}>{b}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Match indicator */}
      {matchedLocation && (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Check className="h-3 w-3 text-green-500" />
          <MapPin className="h-3 w-3" />
          <span className="font-mono">{matchedLocation.label}</span>
        </div>
      )}
      {!matchedLocation && (selZone !== UNSET || selRoom !== UNSET) && byBin.length === 0 && (
        <p className="text-xs text-destructive">No matching location found</p>
      )}
      {!matchedLocation && byBin.length > 1 && (
        <p className="text-xs text-muted-foreground">
          {byBin.length} locations match — narrow down to select one
        </p>
      )}

      {/* New location link */}
      {onNewLocation && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 px-0 text-xs text-muted-foreground hover:text-foreground"
          onClick={onNewLocation}
          disabled={disabled}
        >
          <Plus className="mr-1 h-3 w-3" />
          New location
        </Button>
      )}
    </div>
  );
}
