"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, MapPin, Plus, Loader2, X } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createWarehouseLocation } from "@/actions/warehouse";
import { createWarehouse } from "@/actions/warehouses";
import { toast } from "sonner";

export interface FullLocation {
  id: string;
  warehouse: { id: string; name: string } | null;
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
  disabled?: boolean;
}

/** Return sorted unique non-empty string values for a level from an array of locations. */
function uniqueValues(locs: FullLocation[], key: keyof FullLocation): string[] {
  const set = new Set<string>();
  for (const l of locs) {
    const v = l[key];
    if (v && typeof v === "string") set.add(v);
  }
  return Array.from(set).sort();
}

const UNSET = "__none__";
const ADD = "__add__";

type AddingLevel = "warehouse" | "room" | "zone" | "rack" | "shelf" | "bin" | null;

export function LocationCascadingSelect({
  locations,
  value,
  onValueChange,
  disabled = false,
}: LocationCascadingSelectProps) {
  // Keep a local copy so inline-add can inject new entries immediately
  const [localLocations, setLocalLocations] = useState<FullLocation[]>(locations);

  // Sync when parent refreshes (e.g. after router.refresh())
  useEffect(() => {
    setLocalLocations(locations);
  }, [locations]);

  // Maintain warehouse list: derived from locations + any inline-created warehouses
  const [localWarehouses, setLocalWarehouses] = useState<{ id: string; name: string }[]>(() => {
    const map = new Map<string, { id: string; name: string }>();
    for (const l of locations) {
      if (l.warehouse) map.set(l.warehouse.id, l.warehouse);
    }
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  });

  useEffect(() => {
    setLocalWarehouses((prev) => {
      const map = new Map<string, { id: string; name: string }>();
      for (const w of prev) map.set(w.id, w); // keep inline-added
      for (const l of locations) {
        if (l.warehouse) map.set(l.warehouse.id, l.warehouse);
      }
      return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
    });
  }, [locations]);

  // Initialise cascade from the currently selected location (if any)
  const selected = localLocations.find((l) => l.id === value);

  const [selWarehouse, setSelWarehouse] = useState<string>(selected?.warehouse?.id ?? UNSET);
  const [selRoom, setSelRoom]   = useState<string>(selected?.room  ?? UNSET);
  const [selZone, setSelZone]   = useState<string>(selected?.zone  ?? UNSET);
  const [selRack, setSelRack]   = useState<string>(selected?.rack  ?? UNSET);
  const [selShelf, setSelShelf] = useState<string>(selected?.shelf ?? UNSET);
  const [selBin, setSelBin]     = useState<string>(selected?.bin   ?? UNSET);

  // Sync cascade state when the external value changes (e.g. form reset)
  useEffect(() => {
    const loc = localLocations.find((l) => l.id === value);
    if (loc) {
      setSelWarehouse(loc.warehouse?.id ?? UNSET);
      setSelRoom(loc.room  ?? UNSET);
      setSelZone(loc.zone);
      setSelRack(loc.rack  ?? UNSET);
      setSelShelf(loc.shelf ?? UNSET);
      setSelBin(loc.bin   ?? UNSET);
    } else if (!value) {
      setSelWarehouse(UNSET);
      setSelRoom(UNSET);
      setSelZone(UNSET);
      setSelRack(UNSET);
      setSelShelf(UNSET);
      setSelBin(UNSET);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  // ── Filtering ──────────────────────────────────────────────────────────────
  const byWarehouse = selWarehouse !== UNSET
    ? localLocations.filter((l) => (l.warehouse?.id ?? UNSET) === selWarehouse)
    : localLocations;
  const byRoom  = selRoom  !== UNSET ? byWarehouse.filter((l) => (l.room  ?? UNSET) === selRoom)  : byWarehouse;
  const byZone  = selZone  !== UNSET ? byRoom.filter((l) => l.zone === selZone)                   : byRoom;
  const byRack  = selRack  !== UNSET ? byZone.filter((l) => (l.rack  ?? UNSET) === selRack)       : byZone;
  const byShelf = selShelf !== UNSET ? byRack.filter((l) => (l.shelf ?? UNSET) === selShelf)      : byRack;
  const byBin   = selBin   !== UNSET ? byShelf.filter((l) => (l.bin  ?? UNSET) === selBin)        : byShelf;

  // ── Auto-select ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (byBin.length === 1) {
      onValueChange(byBin[0].id);
    } else {
      onValueChange(undefined);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selWarehouse, selRoom, selZone, selRack, selShelf, selBin]);

  // ── Unique options per level ───────────────────────────────────────────────
  const rooms   = uniqueValues(byWarehouse, "room");
  const zones   = uniqueValues(byRoom, "zone");
  const racks   = uniqueValues(byZone, "rack");
  const shelves = uniqueValues(byRack, "shelf");
  const bins    = uniqueValues(byShelf, "bin");

  // Warehouses actually present in locations (for cascade filter display)
  const warehousesInLocations = useMemo(() => {
    const map = new Map<string, { id: string; name: string }>();
    for (const l of localLocations) {
      if (l.warehouse) map.set(l.warehouse.id, l.warehouse);
    }
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [localLocations]);

  // Show warehouse level if any warehouses exist (in locations or inline-created)
  const showWarehouseLevel = localWarehouses.length > 0;

  // ── Clear cascade helpers ──────────────────────────────────────────────────
  function clearFrom(level: "warehouse" | "room" | "zone" | "rack" | "shelf" | "bin") {
    if (level === "warehouse") { setSelRoom(UNSET); setSelZone(UNSET); setSelRack(UNSET); setSelShelf(UNSET); setSelBin(UNSET); }
    if (level === "room")  { setSelZone(UNSET); setSelRack(UNSET); setSelShelf(UNSET); setSelBin(UNSET); }
    if (level === "zone")  { setSelRack(UNSET); setSelShelf(UNSET); setSelBin(UNSET); }
    if (level === "rack")  { setSelShelf(UNSET); setSelBin(UNSET); }
    if (level === "shelf") { setSelBin(UNSET); }
  }

  const matchedLocation = byBin.length === 1 ? byBin[0] : null;

  // ── Inline "Add new [level]" state ─────────────────────────────────────────
  const [addingAt, setAddingAt] = useState<AddingLevel>(null);
  const [addVal, setAddVal]     = useState("");
  const [addVal2, setAddVal2]   = useState(""); // zone input when adding a Room
  const [addCreating, setAddCreating] = useState(false);

  function cancelAdding() {
    setAddingAt(null);
    setAddVal("");
    setAddVal2("");
  }

  async function handleAdd(level: AddingLevel) {
    if (!addVal.trim()) return;
    setAddCreating(true);
    try {
      if (level === "warehouse") {
        const result = await createWarehouse({ name: addVal.trim() });
        if ("error" in result) { toast.error(result.error); return; }
        const w = result.data as { id: string; name: string };
        setLocalWarehouses((prev) =>
          [...prev, { id: w.id, name: w.name }].sort((a, b) => a.name.localeCompare(b.name))
        );
        cancelAdding();
        setSelWarehouse(w.id);
        clearFrom("warehouse");
        return;
      }

      // Determine zone value (zone is required on all non-warehouse locations)
      let zone = selZone !== UNSET ? selZone : "";
      let room: string | null = selRoom !== UNSET ? selRoom : null;

      if (level === "zone")  { zone = addVal.trim(); }
      if (level === "room")  { room = addVal.trim(); zone = addVal2.trim(); }

      if (!zone) { toast.error("Zone is required"); return; }

      const locationData = {
        warehouseId: selWarehouse !== UNSET ? selWarehouse : null,
        room: room || null,
        zone,
        rack:  level === "rack"  ? addVal.trim() : null,
        shelf: level === "shelf" ? addVal.trim() : null,
        bin:   level === "bin"   ? addVal.trim() : null,
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await createWarehouseLocation(locationData as any);
      if ("error" in result) { toast.error(result.error); return; }

      const d = result.data as {
        id: string;
        warehouse: { id: string; name: string } | null;
        room: string | null;
        zone: string;
        rack: string | null;
        shelf: string | null;
        bin: string | null;
        label: string;
      };

      const newLoc: FullLocation = {
        id: d.id,
        warehouse: d.warehouse ? { id: d.warehouse.id, name: d.warehouse.name } : null,
        room: d.room,
        zone: d.zone,
        rack: d.rack,
        shelf: d.shelf,
        bin: d.bin,
        label: d.label,
      };

      setLocalLocations((prev) => [...prev, newLoc]);
      cancelAdding();

      // Navigate cascade to the new location
      if (level === "room")  { setSelRoom(newLoc.room ?? UNSET); setSelZone(newLoc.zone); clearFrom("zone"); }
      if (level === "zone")  { setSelZone(newLoc.zone); clearFrom("zone"); }
      if (level === "rack")  { setSelRack(newLoc.rack ?? UNSET); clearFrom("rack"); }
      if (level === "shelf") { setSelShelf(newLoc.shelf ?? UNSET); clearFrom("shelf"); }
      if (level === "bin")   { setSelBin(newLoc.bin ?? UNSET); }
    } catch {
      toast.error("Something went wrong");
    } finally {
      setAddCreating(false);
    }
  }

  // ── Shared single-input inline form ───────────────────────────────────────
  function InlineAddForm({ level, placeholder }: { level: AddingLevel; placeholder: string }) {
    return (
      <div className="flex items-center gap-1 mt-1">
        <Input
          autoFocus
          placeholder={placeholder}
          value={addVal}
          onChange={(e) => setAddVal(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") { e.preventDefault(); handleAdd(level); }
            if (e.key === "Escape") cancelAdding();
          }}
          className="h-8 text-sm"
          disabled={addCreating}
        />
        <Button
          type="button"
          size="sm"
          className="h-8 px-2"
          onClick={() => handleAdd(level)}
          disabled={addCreating || !addVal.trim()}
        >
          {addCreating ? <Loader2 className="h-3 w-3 animate-spin" /> : "Add"}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="h-8 px-2"
          onClick={cancelAdding}
          disabled={addCreating}
        >
          <X className="h-3 w-3" />
        </Button>
      </div>
    );
  }

  // ── Show Zone level when: there are zones, or a parent level is selected, or adding ──
  const showZoneLevel = zones.length > 0 || selRoom !== UNSET || selWarehouse !== UNSET || addingAt === "zone";

  return (
    <div className="space-y-2">

      {/* ── Cascade selects — one compact inline row ─────────────────────── */}
      <div className="flex flex-wrap items-end gap-2">

        {/* Warehouse */}
        {showWarehouseLevel && (
          <div className="flex flex-col gap-0.5">
            <span className="text-xs text-muted-foreground">Warehouse</span>
            <Select
              value={addingAt === "warehouse" ? UNSET : selWarehouse}
              onValueChange={(val) => {
                if (val === ADD) { setAddingAt("warehouse"); setAddVal(""); return; }
                setSelWarehouse(val);
                clearFrom("warehouse");
              }}
              disabled={disabled}
            >
              <SelectTrigger className="h-8 text-sm w-32">
                <SelectValue placeholder="—">
                  {selWarehouse !== UNSET
                    ? localWarehouses.find((w) => w.id === selWarehouse)?.name
                    : undefined}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={UNSET}>— Any —</SelectItem>
                {localWarehouses.map((w) => (
                  <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                ))}
                <SelectItem value={ADD}>
                  <span className="flex items-center gap-1 text-muted-foreground">
                    <Plus className="h-3 w-3" /> Add warehouse…
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Room */}
        {(rooms.length > 0 || addingAt === "room") && (
          <div className="flex flex-col gap-0.5">
            <span className="text-xs text-muted-foreground">Room</span>
            <Select
              value={addingAt === "room" ? UNSET : selRoom}
              onValueChange={(val) => {
                if (val === ADD) { setAddingAt("room"); setAddVal(""); setAddVal2(""); return; }
                setSelRoom(val);
                clearFrom("room");
              }}
              disabled={disabled}
            >
              <SelectTrigger className="h-8 text-sm w-28">
                <SelectValue placeholder="—">
                  {selRoom !== UNSET ? selRoom : undefined}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={UNSET}>— Any —</SelectItem>
                {rooms.map((r) => (
                  <SelectItem key={r} value={r}>{r}</SelectItem>
                ))}
                <SelectItem value={ADD}>
                  <span className="flex items-center gap-1 text-muted-foreground">
                    <Plus className="h-3 w-3" /> Add room…
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Zone */}
        {showZoneLevel && (
          <div className="flex flex-col gap-0.5">
            <span className="text-xs text-muted-foreground">Zone</span>
            <Select
              value={addingAt === "zone" ? UNSET : selZone}
              onValueChange={(val) => {
                if (val === ADD) { setAddingAt("zone"); setAddVal(""); return; }
                setSelZone(val);
                clearFrom("zone");
              }}
              disabled={disabled}
            >
              <SelectTrigger className="h-8 text-sm w-28">
                <SelectValue placeholder="—">
                  {selZone !== UNSET ? selZone : undefined}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={UNSET}>— Any —</SelectItem>
                {zones.map((z) => (
                  <SelectItem key={z} value={z}>{z}</SelectItem>
                ))}
                <SelectItem value={ADD}>
                  <span className="flex items-center gap-1 text-muted-foreground">
                    <Plus className="h-3 w-3" /> Add zone…
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Rack */}
        {(racks.length > 0 || addingAt === "rack") && (
          <div className="flex flex-col gap-0.5">
            <span className="text-xs text-muted-foreground">Rack</span>
            <Select
              value={addingAt === "rack" ? UNSET : selRack}
              onValueChange={(val) => {
                if (val === ADD) { setAddingAt("rack"); setAddVal(""); return; }
                setSelRack(val);
                clearFrom("rack");
              }}
              disabled={disabled}
            >
              <SelectTrigger className="h-8 text-sm w-[72px]">
                <SelectValue placeholder="—">
                  {selRack !== UNSET ? selRack : undefined}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={UNSET}>— Any —</SelectItem>
                {racks.map((r) => (
                  <SelectItem key={r} value={r}>{r}</SelectItem>
                ))}
                <SelectItem value={ADD}>
                  <span className="flex items-center gap-1 text-muted-foreground">
                    <Plus className="h-3 w-3" /> Add…
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Shelf */}
        {(shelves.length > 0 || addingAt === "shelf") && (
          <div className="flex flex-col gap-0.5">
            <span className="text-xs text-muted-foreground">Shelf</span>
            <Select
              value={addingAt === "shelf" ? UNSET : selShelf}
              onValueChange={(val) => {
                if (val === ADD) { setAddingAt("shelf"); setAddVal(""); return; }
                setSelShelf(val);
                clearFrom("shelf");
              }}
              disabled={disabled}
            >
              <SelectTrigger className="h-8 text-sm w-[72px]">
                <SelectValue placeholder="—">
                  {selShelf !== UNSET ? selShelf : undefined}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={UNSET}>— Any —</SelectItem>
                {shelves.map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
                <SelectItem value={ADD}>
                  <span className="flex items-center gap-1 text-muted-foreground">
                    <Plus className="h-3 w-3" /> Add…
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Bin */}
        {(bins.length > 0 || addingAt === "bin") && (
          <div className="flex flex-col gap-0.5">
            <span className="text-xs text-muted-foreground">Bin</span>
            <Select
              value={addingAt === "bin" ? UNSET : selBin}
              onValueChange={(val) => {
                if (val === ADD) { setAddingAt("bin"); setAddVal(""); return; }
                setSelBin(val);
              }}
              disabled={disabled}
            >
              <SelectTrigger className="h-8 text-sm w-[72px]">
                <SelectValue placeholder="—">
                  {selBin !== UNSET ? selBin : undefined}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={UNSET}>— Any —</SelectItem>
                {bins.map((b) => (
                  <SelectItem key={b} value={b}>{b}</SelectItem>
                ))}
                <SelectItem value={ADD}>
                  <span className="flex items-center gap-1 text-muted-foreground">
                    <Plus className="h-3 w-3" /> Add…
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

      </div>

      {/* ── Inline add forms — rendered below the row when active ─────────── */}
      {addingAt === "warehouse" && (
        <InlineAddForm level="warehouse" placeholder="Warehouse name…" />
      )}
      {addingAt === "room" && (
        <div className="space-y-1">
          <Input
            autoFocus
            placeholder="Room name…"
            value={addVal}
            onChange={(e) => setAddVal(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Escape") cancelAdding(); }}
            className="h-8 text-sm"
            disabled={addCreating}
          />
          <Input
            placeholder="Zone (required)…"
            value={addVal2}
            onChange={(e) => setAddVal2(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") { e.preventDefault(); handleAdd("room"); }
              if (e.key === "Escape") cancelAdding();
            }}
            className="h-8 text-sm"
            disabled={addCreating}
          />
          <div className="flex gap-1">
            <Button
              type="button" size="sm"
              className="h-7 text-xs px-2"
              onClick={() => handleAdd("room")}
              disabled={addCreating || !addVal.trim() || !addVal2.trim()}
            >
              {addCreating ? <Loader2 className="h-3 w-3 animate-spin" /> : "Add"}
            </Button>
            <Button
              type="button" size="sm" variant="ghost"
              className="h-7 text-xs px-2"
              onClick={cancelAdding}
              disabled={addCreating}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}
      {addingAt === "zone"  && <InlineAddForm level="zone"  placeholder="Zone name…" />}
      {addingAt === "rack"  && <InlineAddForm level="rack"  placeholder="Rack…" />}
      {addingAt === "shelf" && <InlineAddForm level="shelf" placeholder="Shelf…" />}
      {addingAt === "bin"   && <InlineAddForm level="bin"   placeholder="Bin…" />}

      {/* "Add first location" shortcut — only when no data exists at all */}
      {!showWarehouseLevel && zones.length === 0 && rooms.length === 0 && addingAt !== "zone" && addingAt !== "room" && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 px-0 text-xs text-muted-foreground hover:text-foreground"
          onClick={() => { setAddingAt("zone"); setAddVal(""); }}
          disabled={disabled}
        >
          <Plus className="mr-1 h-3 w-3" />
          Add first location
        </Button>
      )}

      {/* Match indicator */}
      {matchedLocation && (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Check className="h-3 w-3 text-green-500" />
          <MapPin className="h-3 w-3" />
          {matchedLocation.warehouse && (
            <span>{matchedLocation.warehouse.name} ·</span>
          )}
          <span className="font-mono">{matchedLocation.label}</span>
        </div>
      )}
      {!matchedLocation && (selZone !== UNSET || selRoom !== UNSET || selWarehouse !== UNSET) && byBin.length === 0 && (
        <p className="text-xs text-destructive">No matching location found</p>
      )}
      {!matchedLocation && byBin.length > 1 && (
        <p className="text-xs text-muted-foreground">
          {byBin.length} locations match — narrow down to select one
        </p>
      )}
    </div>
  );
}
