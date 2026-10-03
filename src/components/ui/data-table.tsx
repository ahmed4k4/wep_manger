/**
 * DataTable Component
 * Premium SaaS design system
 */

'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { ChevronUp, ChevronDown, MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';

export interface Column<T> {
  key: string;
  header: string;
  render?: (value: unknown, row: T, index: number) => React.ReactNode;
  sortable?: boolean;
  width?: string;
  align?: 'left' | 'center' | 'right';
  className?: string;
}

export interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (row: T) => string;
  sortable?: boolean;
  filterable?: boolean;
  selectable?: boolean;
  onSelectionChange?: (selectedKeys: Set<string>) => void;
  selectedKeys?: Set<string>;
  loading?: boolean;
  emptyMessage?: string;
  emptyIcon?: React.ReactNode;
  className?: string;
  rowClassName?: (row: T, index: number) => string;
  onRowClick?: (row: T, event: React.MouseEvent) => void;
  pagination?: {
    page: number;
    pageSize: number;
    total: number;
    onPageChange: (page: number) => void;
    onPageSizeChange: (pageSize: number) => void;
  };
}

interface SortState {
  key: string | null;
  direction: 'asc' | 'desc';
}

function DataTable<T>({
  columns,
  data,
  keyExtractor,
  sortable = true,
  filterable = false,
  selectable = false,
  onSelectionChange,
  selectedKeys = new Set(),
  loading = false,
  emptyMessage = 'No data available',
  emptyIcon,
  className,
  rowClassName,
  onRowClick,
  pagination,
}: DataTableProps<T>) {
  const [sortState, setSortState] = React.useState<SortState>({ key: null, direction: 'asc' });
  const [filterValues, setFilterValues] = React.useState<Record<string, string>>({});
  const [selectAll, setSelectAll] = React.useState(false);

  const handleSort = (key: string) => {
    if (!sortable) return;
    setSortState((prev) => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  const handleSelectAll = (checked: boolean) => {
    setSelectAll(checked);
    const newSelection = new Set<string>();
    if (checked) {
      data.forEach((row) => newSelection.add(keyExtractor(row)));
    }
    onSelectionChange?.(newSelection);
  };

  const handleRowSelect = (key: string, checked: boolean) => {
    const newSelection = new Set(selectedKeys);
    if (checked) {
      newSelection.add(key);
    } else {
      newSelection.delete(key);
    }
    setSelectAll(newSelection.size === data.length && data.length > 0);
    onSelectionChange?.(newSelection);
  };

  const filteredAndSortedData = React.useMemo(() => {
    let result = [...data];

    // Apply filters
    if (filterable) {
      Object.entries(filterValues).forEach(([key, value]) => {
        if (value) {
          result = result.filter((row) => {
            const cellValue = String((row as Record<string, unknown>)[key] ?? '').toLowerCase();
            return cellValue.includes(value.toLowerCase());
          });
        }
      });
    }

    // Apply sorting
    if (sortState.key) {
      result.sort((a, b) => {
        const aVal = (a as Record<string, unknown>)[sortState.key!];
        const bVal = (b as Record<string, unknown>)[sortState.key!];
        
        if (aVal == null && bVal == null) return 0;
        if (aVal == null) return 1;
        if (bVal == null) return -1;
        
        const comparison = String(aVal).localeCompare(String(bVal), undefined, { numeric: true });
        return sortState.direction === 'asc' ? comparison : -comparison;
      });
    }

    return result;
  }, [data, filterValues, sortState, filterable]);

  const displayData = pagination ? filteredAndSortedData : filteredAndSortedData;

  const totalPages = pagination ? Math.ceil(pagination.total / pagination.pageSize) : 1;

  if (loading) {
    return (
      <div className={cn('rounded-xl border bg-card overflow-hidden', className)}>
        <TableSkeleton columns={columns.length} selectable={selectable} />
      </div>
    );
  }

  if (displayData.length === 0) {
    return (
      <div className={cn('rounded-xl border bg-card overflow-hidden', className)}>
        <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
          {emptyIcon || (
            <svg className="h-12 w-12 text-muted-foreground/50 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          )}
          <p className="text-muted-foreground text-sm">{emptyMessage}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('rounded-xl border bg-card overflow-hidden', className)}>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead className="bg-muted/30">
            <tr className="border-b border-border">
              {selectable && (
                <th className="w-12 px-4 py-3">
                  <Checkbox
                    checked={selectAll}
                    onCheckedChange={handleSelectAll}
                    aria-label="Select all rows"
                  />
                </th>
              )}
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={cn(
                    'px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider',
                    column.align === 'center' && 'text-center',
                    column.align === 'right' && 'text-right',
                    column.sortable && sortable && 'cursor-pointer select-none hover:text-foreground transition-colors',
                    column.className
                  )}
                  style={{ width: column.width }}
                  onClick={() => column.sortable && sortable && handleSort(column.key)}
                >
                  <div className="flex items-center justify-content gap-1.5">
                    <span>{column.header}</span>
                    {column.sortable && sortable && sortState.key === column.key && (
                      sortState.direction === 'asc' ? (
                        <ChevronUp className="h-3.5 w-3.5 text-primary" />
                      ) : (
                        <ChevronDown className="h-3.5 w-3.5 text-primary" />
                      )
                    )}
                  </div>
                </th>
              ))}
              <th className="w-12 px-4 py-3"></th>
            </tr>
            {filterable && (
              <tr className="border-b border-border">
                {selectable && <th className="w-12 px-4 py-2"></th>}
                {columns.map((column) => (
                  <th key={`${column.key}-filter`} className="px-4 py-2">
                    <Input
                      type="text"
                      placeholder={`Filter ${column.header}...`}
                      value={filterValues[column.key] || ''}
                      onChange={(e) => setFilterValues((prev) => ({ ...prev, [column.key]: e.target.value }))}
                      className="h-8 text-xs"
                      size="sm"
                    />
                  </th>
                ))}
                <th className="w-12 px-4 py-2"></th>
              </tr>
            )}
          </thead>
          <tbody className="divide-y divide-border/50">
            {displayData.map((row, index) => {
              const key = keyExtractor(row);
              const isSelected = selectedKeys.has(key);
              return (
                <tr
                  key={key}
                  className={cn(
                    'transition-colors',
                    'hover:bg-accent/50',
                    isSelected && 'bg-primary/5',
                    rowClassName ? rowClassName(row, index) : ''
                  )}
                  onClick={(e) => onRowClick?.(row, e)}
                >
                  {selectable && (
                    <td className="px-4 py-3">
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={(checked) => handleRowSelect(key, checked as boolean)}
                        aria-label={`Select row ${index + 1}`}
                      />
                    </td>
                  )}
                  {columns.map((column) => (
                    <td
                      key={column.key}
                      className={cn(
                        'px-4 py-3 text-sm',
                        column.align === 'center' && 'text-center',
                        column.align === 'right' && 'text-right'
                      )}
                    >
                      {column.render
                        ? column.render((row as Record<string, unknown>)[column.key], row, index)
                        : String((row as Record<string, unknown>)[column.key] ?? '')}
                    </td>
                  ))}
                  <td className="px-4 py-3 text-right">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8"
                      aria-label="More actions"
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {pagination && totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-border/50">
          <div className="text-sm text-muted-foreground">
            Showing {((pagination.page - 1) * pagination.pageSize) + 1} to {Math.min(pagination.page * pagination.pageSize, pagination.total)} of {pagination.total} results
          </div>
          <div className="flex items-center gap-2">
            <select
              value={String(pagination.pageSize)}
              onChange={(e) => pagination.onPageSizeChange(Number(e.target.value))}
              className="h-8 px-2 text-sm border border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring"
            >
              {[10, 25, 50, 100].map((size) => (
                <option key={size} value={String(size)}>{size} per page</option>
              ))}
            </select>
            <Button
              variant="outline"
              size="sm"
              onClick={() => pagination.onPageChange(pagination.page - 1)}
              disabled={pagination.page === 1}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => pagination.onPageChange(pagination.page + 1)}
              disabled={pagination.page === totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function TableSkeleton({ columns, selectable }: { columns: number; selectable: boolean }) {
  return (
    <div className="animate-pulse">
      <table className="w-full border-collapse">
        <thead className="bg-muted/30">
          <tr className="border-b border-border">
            {selectable && <th className="w-12 px-4 py-3"></th>}
            {Array.from({ length: columns }).map((_, i) => (
              <th key={i} className="px-4 py-3">
                <div className="h-4 w-3/4 bg-muted rounded" />
              </th>
            ))}
            <th className="w-12 px-4 py-3"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/50">
          {Array.from({ length: 5 }).map((_, rowIndex) => (
            <tr key={rowIndex}>
              {selectable && <td className="px-4 py-3"><div className="h-4 w-4 bg-muted rounded mx-auto" /></td>}
              {Array.from({ length: columns }).map((_, colIndex) => (
                <td key={colIndex} className="px-4 py-3">
                  <div className="h-4 w-1/2 bg-muted rounded" />
                </td>
              ))}
              <td className="px-4 py-3"></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

DataTable.displayName = 'DataTable';

export { DataTable };