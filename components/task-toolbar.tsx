"use client";

import { ArrowDownWideNarrow, Eye, EyeOff, Search, X } from "lucide-react";
import { SearchableSelect } from "@/components/searchable-select";
import { useLang } from "@/components/language";
import type { SortOption } from "@/lib/types";

export function TaskToolbar({
  query,
  onQuery,
  showCompleted,
  onShowCompleted,
  sort,
  onSort,
  searchPlaceholder,
}: {
  query: string;
  onQuery: (q: string) => void;
  showCompleted: boolean;
  onShowCompleted: (v: boolean) => void;
  sort: SortOption;
  onSort: (s: SortOption) => void;
  searchPlaceholder?: string;
}) {
  const { t } = useLang();

  const SORT_OPTIONS = [
    { id: "due_date", label: t.sort.dueDate },
    { id: "priority", label: t.sort.priority },
    { id: "title", label: t.sort.title },
    { id: "created_at", label: t.sort.recent },
    { id: "manual", label: t.sort.manual },
  ];

  return (
    <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
      {/* Buscador en tiempo real */}
      <div className="relative w-full flex-1">
        <Search
          size={15}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none"
        />
        <input
          type="text"
          value={query}
          onChange={(e) => onQuery(e.target.value)}
          placeholder={searchPlaceholder ?? t.toolbar.searchPh}
          spellCheck={false}
          className="w-full h-10 pl-9 pr-8 text-sm rounded-xl glass-input text-foreground placeholder:text-muted outline-none transition-colors"
        />
        {query && (
          <button
            type="button"
            aria-label={t.toolbar.clearSearch}
            onClick={() => onQuery("")}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-md text-muted hover:text-foreground hover:bg-default/20 transition-colors cursor-pointer"
          >
            <X size={14} />
          </button>
        )}
      </div>

      <div className="flex items-center gap-2">
        {/* Switch ver/ocultar completadas */}
        <button
          type="button"
          role="switch"
          aria-checked={showCompleted}
          aria-label={showCompleted ? t.toolbar.hideCompleted : t.toolbar.showCompleted}
          title={showCompleted ? t.toolbar.hideCompleted : t.toolbar.showCompleted}
          onClick={() => onShowCompleted(!showCompleted)}
          className="flex h-10 items-center gap-2 rounded-xl glass-input px-3 text-xs font-medium text-muted hover:text-foreground transition-colors cursor-pointer shrink-0"
        >
          {showCompleted ? <Eye size={15} /> : <EyeOff size={15} />}
          <span className="hidden lg:inline">{t.toolbar.completed}</span>
          <span
            className={`relative h-5 w-9 rounded-full transition-colors shrink-0 ${
              showCompleted ? "bg-accent" : "bg-white/20 dark:bg-white/10"
            }`}
          >
            <span
              className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${
                showCompleted ? "left-[18px]" : "left-0.5"
              }`}
            />
          </span>
        </button>

        {/* Ordenación */}
        <div className="flex items-center gap-1.5 min-w-0">
          <ArrowDownWideNarrow size={15} className="text-muted shrink-0" aria-hidden />
          <div className="w-40 shrink-0">
            <SearchableSelect
              options={SORT_OPTIONS}
              value={sort}
              onChange={(v) => {
                if (v) onSort(v as SortOption);
              }}
              allowClear={false}
              searchPlaceholder={t.toolbar.searchOptions}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
