import * as React from "react";
import { Input } from "./input";
import { Button } from "./button";
import { Badge } from "./badge";
import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ActiveFilterChip {
  id: string;
  label: string;
  value: string;
}

export interface FilterBarProps extends React.HTMLAttributes<HTMLDivElement> {
  searchQuery?: string;
  onSearchChange?: (val: string) => void;
  searchPlaceholder?: string;
  activeFilters?: ActiveFilterChip[];
  onRemoveFilter?: (id: string) => void;
  onClearFilters?: () => void;
  selectedCount?: number;
  selectedActions?: React.ReactNode;
  onClearSelection?: () => void;
  filterControls?: React.ReactNode;
  viewControls?: React.ReactNode;
}

export function FilterBar({
  searchQuery,
  onSearchChange,
  searchPlaceholder = "Filter items...",
  activeFilters = [],
  onRemoveFilter,
  onClearFilters,
  selectedCount = 0,
  selectedActions,
  onClearSelection,
  filterControls,
  viewControls,
  className,
  ...props
}: FilterBarProps) {
  const isBulkActive = selectedCount > 0;

  return (
    <div className={cn("space-y-2.5", className)} {...props}>
      {/* Contextual Bulk Action Bar vs Standard Filter Bar */}
      {isBulkActive ? (
        <div className="flex items-center justify-between rounded-lg border border-primary/30 bg-primary/5 px-3.5 py-2 transition-all animate-in fade-in-50 duration-150">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-5 items-center justify-center rounded bg-primary/20 px-2 text-xs font-semibold text-primary font-tabular">
              {selectedCount} selected
            </span>
            {onClearSelection && (
              <Button
                variant="ghost"
                size="xs"
                onClick={onClearSelection}
                className="text-xs text-muted-foreground hover:text-foreground h-6 px-2"
              >
                Deselect all
              </Button>
            )}
          </div>

          {selectedActions && (
            <div className="flex items-center gap-1.5">
              {selectedActions}
            </div>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          {/* Search Input */}
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/70 pointer-events-none" />
            <Input
              type="text"
              value={searchQuery ?? ""}
              onChange={(e) => onSearchChange?.(e.target.value)}
              placeholder={searchPlaceholder}
              className="h-8 pl-8 pr-3 text-xs bg-background"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => onSearchChange?.("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-3 w-3" />
                <span className="sr-only">Clear search</span>
              </button>
            )}
          </div>

          {/* Action & View Controls */}
          <div className="flex items-center gap-1.5 self-end sm:self-auto">
            {filterControls}
            {viewControls}
          </div>
        </div>
      )}

      {/* Active Filter Chips */}
      {!isBulkActive && activeFilters.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
          {activeFilters.map((chip) => (
            <Badge
              key={chip.id}
              variant="neutral"
              className="inline-flex items-center gap-1 pl-2 pr-1 py-0.5 text-[11px] bg-secondary border-border"
            >
              <span className="text-muted-foreground">{chip.label}:</span>
              <span className="font-medium text-foreground">{chip.value}</span>
              {onRemoveFilter && (
                <button
                  type="button"
                  onClick={() => onRemoveFilter(chip.id)}
                  className="rounded-full p-0.5 text-muted-foreground hover:bg-muted-foreground/20 hover:text-foreground"
                >
                  <X className="h-2.5 w-2.5" />
                  <span className="sr-only">Remove {chip.label} filter</span>
                </button>
              )}
            </Badge>
          ))}

          {onClearFilters && (
            <Button
              variant="ghost"
              size="xs"
              onClick={onClearFilters}
              className="h-5 px-1.5 text-[11px] text-muted-foreground hover:text-foreground"
            >
              Clear all
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
