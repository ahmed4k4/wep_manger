'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import {
  Search,
  X,
  Clock,
  Filter,
  ChevronDown,
  ChevronUp,
  FolderKanban,
  CheckSquare,
  Users,
  FileText,
  MessageSquare,
  StickyNote,
  Globe,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { searchAction, getRecentSearchesAction, clearRecentSearchesAction } from '@/app/actions/search';
import type { SearchResultItem, SearchResults, SearchType, SearchFilters } from '@/lib/db/queries/search';
import type { Project, Task } from '@/types/project';

const SEARCH_TYPES: { value: SearchType; label: string; icon: React.ReactNode }[] = [
  { value: 'projects', label: 'Projects', icon: <FolderKanban size={14} /> },
  { value: 'tasks', label: 'Tasks', icon: <CheckSquare size={14} /> },
  { value: 'users', label: 'Users', icon: <Users size={14} /> },
  { value: 'files', label: 'Files', icon: <FileText size={14} /> },
  { value: 'notes', label: 'Notes', icon: <StickyNote size={14} /> },
  { value: 'comments', label: 'Comments', icon: <MessageSquare size={14} /> },
];

const PROJECT_STATUSES = ['ACTIVE', 'ARCHIVED', 'ON_HOLD'] as const;
const TASK_STATUSES = ['TODO', 'IN_PROGRESS', 'REVIEW', 'BLOCKED', 'COMPLETED'] as const;
const TASK_PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'] as const;

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString();
}

function renderHighlightedText(text: string | undefined, fallback: string): React.ReactNode {
  if (!text) return fallback;
  // Parse HTML with mark tags
  const parts = text.split(/(<mark>.*?<\/mark>)/gi);
  return (
    <span>
      {parts.map((part, i) =>
        part.startsWith('<mark>') ? (
          <mark key={i} className="bg-yellow-200 text-yellow-900 dark:bg-yellow-800 dark:text-yellow-100 px-0.5 rounded">
            {part.replace(/<\/?mark>/g, '')}
          </mark>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </span>
  );
}

interface SearchResultGroupProps {
  title: string;
  icon: React.ReactNode;
  results: SearchResultItem[];
  emptyMessage: string;
  locale: string;
}

function SearchResultGroup({ title, icon, results, emptyMessage, locale }: SearchResultGroupProps) {
  if (results.length === 0) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 px-2 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
        {icon}
        <span>{title} ({results.length})</span>
      </div>
      <div className="space-y-1">
        {results.map((result) => (
          <SearchResultItem key={result.id} result={result} locale={locale} />
        ))}
      </div>
    </div>
  );
}

interface SearchResultItemProps {
  result: SearchResultItem;
  locale: string;
}

function SearchResultItem({ result, locale }: SearchResultItemProps) {
  const typeIcons = {
    project: <FolderKanban size={14} className="text-blue-500" />,
    task: <CheckSquare size={14} className="text-green-500" />,
    user: <Users size={14} className="text-purple-500" />,
    file: <FileText size={14} className="text-orange-500" />,
    note: <StickyNote size={14} className="text-yellow-500" />,
    comment: <MessageSquare size={14} className="text-pink-500" />,
  };

  const typeColors = {
    project: 'text-blue-600 bg-blue-50 dark:bg-blue-900/20',
    task: 'text-green-600 bg-green-50 dark:bg-green-900/20',
    user: 'text-purple-600 bg-purple-50 dark:bg-purple-900/20',
    file: 'text-orange-600 bg-orange-50 dark:bg-orange-900/20',
    note: 'text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20',
    comment: 'text-pink-600 bg-pink-50 dark:bg-pink-900/20',
  };

  // Simple type-safe access to highlight properties
  const highlight = result.highlight as Record<string, string | undefined> | undefined;

  return (
    <a
      href={result.url}
      className={cn(
        'flex items-start gap-3 p-2 rounded-lg hover:bg-accent transition-colors group',
        'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2'
      )}
    >
      <div className={cn('flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center', typeColors[result.type])}>
        {typeIcons[result.type]}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium truncate block">
            {renderHighlightedText(highlight?.title, result.title)}
          </span>
          <span className="text-xs px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground whitespace-nowrap">
            {result.type}
          </span>
        </div>
        <p className="text-sm text-muted-foreground truncate mt-0.5">
          {renderHighlightedText(
            highlight?.description || highlight?.content,
            result.subtitle
          )}
        </p>
        {highlight?.content && (
          <p className="text-sm text-muted-foreground/80 line-clamp-2 mt-1">
            {renderHighlightedText(highlight.content, '')}
          </p>
        )}
      </div>
    </a>
  );
}

function SearchFiltersPanel({ filters, onFiltersChange, locale, t }: {
  filters: SearchFilters;
  onFiltersChange: (filters: SearchFilters) => void;
  locale: string;
  t: ReturnType<typeof useTranslations>;
}) {
  const [expanded, setExpanded] = useState<string[]>(['tasks']);

  const toggleSection = (section: string) => {
    setExpanded((prev) => (prev.includes(section) ? prev.filter((s) => s !== section) : [...prev, section]));
  };

  return (
    <div className="space-y-4 border-t pt-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">{t('filters')}</h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onFiltersChange({ ...filters, projects: {}, tasks: {}, files: {} })}
        >
          {t('clearAll')}
        </Button>
      </div>

      <div className="space-y-4">
        {/* Projects Filters */}
        <FilterSection
          title={t('projects')}
          icon={<FolderKanban size={14} />}
          expanded={expanded.includes('projects')}
          onToggle={() => toggleSection('projects')}
        >
          <Select
            value={filters.projects?.status || ''}
            onValueChange={(value) => onFiltersChange({ ...filters, projects: { ...filters.projects, status: value as Project['status'] | undefined } })}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder={t('allStatuses')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">{t('allStatuses')}</SelectItem>
              {PROJECT_STATUSES.map((status) => (
                <SelectItem key={status} value={status}>{t(`projectStatus.${status.toLowerCase()}`)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FilterSection>

        {/* Tasks Filters */}
        <FilterSection
          title={t('tasks')}
          icon={<CheckSquare size={14} />}
          expanded={expanded.includes('tasks')}
          onToggle={() => toggleSection('tasks')}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <Select
              value={filters.tasks?.status || ''}
              onValueChange={(value) => onFiltersChange({ ...filters, tasks: { ...filters.tasks, status: value as Task['status'] | undefined } })}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder={t('allStatuses')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">{t('allStatuses')}</SelectItem>
                {TASK_STATUSES.map((status) => (
                  <SelectItem key={status} value={status}>{t(`taskStatus.${status.toLowerCase().replace('_', '')}`)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={filters.tasks?.priority || ''}
              onValueChange={(value) => onFiltersChange({ ...filters, tasks: { ...filters.tasks, priority: value as Task['priority'] | undefined } })}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder={t('allPriorities')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">{t('allPriorities')}</SelectItem>
                {TASK_PRIORITIES.map((priority) => (
                  <SelectItem key={priority} value={priority}>{t(`taskPriority.${priority.toLowerCase()}`)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={filters.tasks?.overdue || false}
                onChange={(e) => onFiltersChange({ ...filters, tasks: { ...filters.tasks, overdue: e.target.checked || undefined } })}
                className="rounded border-input"
              />
              <span className="text-sm">{t('overdue')}</span>
            </Label>
          </div>
        </FilterSection>

        {/* Files Filters */}
        <FilterSection
          title={t('files')}
          icon={<FileText size={14} />}
          expanded={expanded.includes('files')}
          onToggle={() => toggleSection('files')}
        >
          <Select
            value={filters.files?.mime_type || ''}
            onValueChange={(value) => onFiltersChange({ ...filters, files: { ...filters.files, mime_type: value || undefined } })}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder={t('allFileTypes')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">{t('allFileTypes')}</SelectItem>
              <SelectItem value="image/*">{t('images')}</SelectItem>
              <SelectItem value="application/pdf">{t('pdf')}</SelectItem>
              <SelectItem value="text/*">{t('textFiles')}</SelectItem>
              <SelectItem value="application/*">{t('documents')}</SelectItem>
            </SelectContent>
          </Select>
        </FilterSection>
      </div>
    </div>
  );
}

interface FilterSectionProps {
  title: string;
  icon: React.ReactNode;
  expanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

function FilterSection({ title, icon, expanded, onToggle, children }: FilterSectionProps) {
  return (
    <div className="border rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center gap-2 p-3 hover:bg-accent transition-colors text-left"
      >
        <span className="flex items-center gap-2 font-medium">{icon} {title}</span>
        <span className="ml-auto">{expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}</span>
      </button>
      {expanded && <div className="p-3 border-t">{children}</div>}
    </div>
  );
}

export function SearchModal() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const t = useTranslations('search');
  const isArabic = locale === 'ar';

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResults | null>(null);
  const [loading, setLoading] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [showRecent, setShowRecent] = useState(false);
  const [filters, setFilters] = useState<SearchFilters>({
    query: '',
    types: ['projects', 'tasks', 'users', 'files', 'notes', 'comments'],
    projects: {},
    tasks: {},
    files: {},
  });
  const [selectedTypes, setSelectedTypes] = useState<SearchType[]>(['projects', 'tasks', 'users', 'files', 'notes', 'comments']);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Load recent searches on open
  useEffect(() => {
    if (open) {
      loadRecentSearches();
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (abortControllerRef.current) abortControllerRef.current.abort();
    };
  }, []);

  const loadRecentSearches = async () => {
    try {
      const result = await getRecentSearchesAction();
      if (result.success && result.data) {
        setRecentSearches(result.data);
      }
    } catch (error) {
      console.error('Failed to load recent searches:', error);
    }
  };

  const handleSearch = useCallback(
    async (searchQuery: string) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (abortControllerRef.current) abortControllerRef.current.abort();

      abortControllerRef.current = new AbortController();

      debounceRef.current = setTimeout(async () => {
        if (searchQuery.length < 2) {
          setResults({ projects: [], tasks: [], users: [], files: [], notes: [], comments: [], total: 0 });
          setShowRecent(true);
          return;
        }

        setShowRecent(false);
        setLoading(true);

        try {
          const result = await searchAction({
            query: searchQuery,
            types: selectedTypes,
            projects: filters.projects,
            tasks: filters.tasks,
            files: filters.files,
            page_size: 10,
          });

          if (result.success && result.data) {
            setResults(result.data);
          }
        } catch (error) {
          console.error('Search error:', error);
        } finally {
          setLoading(false);
        }
      }, 300);
    },
    [selectedTypes, filters.projects, filters.tasks, filters.files]
  );

  const handleQueryChange = (value: string) => {
    setQuery(value);
    setFilters((prev) => ({ ...prev, query: value }));
    handleSearch(value);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      setOpen(!open);
    }
    if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  const handleRecentSearchClick = (search: string) => {
    setQuery(search);
    setFilters((prev) => ({ ...prev, query: search }));
    handleSearch(search);
    inputRef.current?.focus();
  };

  const handleClearRecent = async () => {
    const result = await clearRecentSearchesAction();
    if (result.success) {
      setRecentSearches([]);
    }
  };

  const handleTypeToggle = (type: SearchType) => {
    setSelectedTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  };

  const handleClose = () => {
    setOpen(false);
    setQuery('');
    setResults(null);
    setShowRecent(false);
    setFilters({
      query: '',
      types: ['projects', 'tasks', 'users', 'files', 'notes', 'comments'],
    });
    setSelectedTypes(['projects', 'tasks', 'users', 'files', 'notes', 'comments']);
  };

  // Global keyboard shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen(true);
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  const totalResults = results?.total || 0;
  const hasResults = totalResults > 0;
  const hasSearched = query.length >= 2;

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] w-full sm:max-w-4xl">
          <DialogHeader className="pb-4">
            <DialogTitle className="flex items-center gap-2">
              <Search className="text-muted-foreground" size={20} />
              {t('title')}
              <kbd className="ml-auto px-2 py-0.5 text-xs bg-muted rounded font-mono">
                ⌘K
              </kbd>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
              <Input
                ref={inputRef}
                type="search"
                value={query}
                onChange={(e) => handleQueryChange(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={t('placeholder')}
                className="pl-10 pr-10 text-lg"
                autoComplete="off"
                aria-label={t('placeholder')}
              />
              {query && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-2 top-1/2 -translate-y-1/2"
                  onClick={() => {
                    setQuery('');
                    setFilters((prev) => ({ ...prev, query: '' }));
                    setResults(null);
                    setShowRecent(true);
                    inputRef.current?.focus();
                  }}
                  aria-label={t('clear')}
                >
                  <X size={16} />
                </Button>
              )}
              {loading && (
                <Loader2 className="absolute right-10 top-1/2 -translate-y-1/2 text-muted-foreground animate-spin" size={18} />
              )}
            </div>

            {/* Type Filters */}
            <div className="flex flex-wrap gap-2">
              {SEARCH_TYPES.map(({ value, label, icon }) => (
                <Button
                  key={value}
                  type="button"
                  variant={selectedTypes.includes(value) ? 'default' : 'outline'}
                  size="sm"
                  className="gap-1.5"
                  onClick={() => {
                    handleTypeToggle(value);
                    handleSearch(query);
                  }}
                >
                  {icon} <span className="hidden sm:inline">{label}</span>
                </Button>
              ))}
            </div>

            {/* Advanced Filters */}
            <SearchFiltersPanel
              filters={filters}
              onFiltersChange={setFilters}
              locale={locale}
              t={t}
            />

            {/* Results or Recent Searches */}
            <ScrollArea className="max-h-[60vh] pr-2">
              {showRecent && !hasSearched && recentSearches.length > 0 && (
                <div className="space-y-2 mb-4">
                  <div className="flex items-center justify-between px-2">
                    <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      <Clock size={14} />
                      <span>{t('recentSearches')}</span>
                    </div>
                    {recentSearches.length > 0 && (
                      <Button variant="ghost" size="sm" onClick={handleClearRecent}>
                        {t('clear')}
                      </Button>
                    )}
                  </div>
                  <div className="space-y-1">
                    {recentSearches.map((search) => (
                      <button
                        key={search}
                        type="button"
                        onClick={() => handleRecentSearchClick(search)}
                        className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-accent transition-colors text-left"
                      >
                        <Clock size={14} className="text-muted-foreground flex-shrink-0" />
                        <span className="truncate">{search}</span>
                      </button>
                    ))}
                  </div>
                  <Separator className="my-2" />
                </div>
              )}

              {hasSearched && (
                <>
                  {hasResults ? (
                    <div className="space-y-4">
                      <SearchResultGroup
                        title={t('projects')}
                        icon={<FolderKanban size={14} />}
                        results={results!.projects}
                        emptyMessage={t('noProjects')}
                        locale={locale}
                      />
                      <SearchResultGroup
                        title={t('tasks')}
                        icon={<CheckSquare size={14} />}
                        results={results!.tasks}
                        emptyMessage={t('noTasks')}
                        locale={locale}
                      />
                      <SearchResultGroup
                        title={t('users')}
                        icon={<Users size={14} />}
                        results={results!.users}
                        emptyMessage={t('noUsers')}
                        locale={locale}
                      />
                      <SearchResultGroup
                        title={t('files')}
                        icon={<FileText size={14} />}
                        results={results!.files}
                        emptyMessage={t('noFiles')}
                        locale={locale}
                      />
                      <SearchResultGroup
                        title={t('notes')}
                        icon={<StickyNote size={14} />}
                        results={results!.notes}
                        emptyMessage={t('noNotes')}
                        locale={locale}
                      />
                      <SearchResultGroup
                        title={t('comments')}
                        icon={<MessageSquare size={14} />}
                        results={results!.comments}
                        emptyMessage={t('noComments')}
                        locale={locale}
                      />
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                      <Search className="text-muted-foreground/50" size={48} />
                      <h3 className="mt-4 text-lg font-medium">{t('noResults')}</h3>
                      <p className="mt-2 text-sm text-muted-foreground">{t('noResultsDesc')}</p>
                    </div>
                  )}
                </>
              )}

              {!hasSearched && recentSearches.length === 0 && (
                <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                  <Globe className="text-muted-foreground/50" size={48} />
                  <h3 className="mt-4 text-lg font-medium">{t('startSearching')}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{t('startSearchingDesc')}</p>
                </div>
              )}
            </ScrollArea>

            {/* Footer stats */}
            {hasSearched && hasResults && (
              <div className="flex items-center justify-between pt-2 border-t text-sm text-muted-foreground">
                <span>{t('resultsFound', { count: totalResults })}</span>
                <kbd className="px-2 py-0.5 bg-muted rounded font-mono">
                  ⌘K
                </kbd>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
