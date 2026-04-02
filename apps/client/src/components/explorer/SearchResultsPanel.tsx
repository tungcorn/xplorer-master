import React, { useRef, useCallback, useEffect, useMemo, useImperativeHandle } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import {
  useLiveSearch,
  type SearchFilterType,
  type LiveSearchResult,
} from '@/hooks/use-live-search';
import { formatFileSize, getFileIcon } from '@/lib/utils';
import type { FileEntry } from '@/lib/tauri-api';

export interface SearchResultsPanelProps {
  basePath: string;
  navigateToPath: (path: string) => void;
  onFileSelect: (file: FileEntry) => void;
  onFileOpen?: (file: FileEntry) => void;
  width?: number;
}

export interface SearchResultsPanelHandle {
  focus: () => void;
}

const FILTERS: { key: SearchFilterType; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'files', label: 'Files' },
  { key: 'folders', label: 'Folders' },
  { key: 'documents', label: 'Documents' },
  { key: 'images', label: 'Images' },
  { key: 'code', label: 'Code' },
];

const highlightMatch = (text: string, query: string): React.ReactNode => {
  if (!query.trim()) return text;

  const parts = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return text;

  const escaped = parts.map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const regex = new RegExp(`(${escaped.join('|')})`, 'gi');
  const segments = text.split(regex);

  if (segments.length <= 1) return text;

  return segments.map((segment, index) => {
    const isMatch = parts.some((part) => segment.toLowerCase() === part);
    const key = `${segment}-${index}`;

    if (isMatch) {
      return (
        <span key={key} style={{ fontWeight: 700, color: 'var(--xp-blue)' }}>
          {segment}
        </span>
      );
    }

    return <span key={key}>{segment}</span>;
  });
};

const renderStatus = (
  isSearching: boolean,
  noResults: boolean,
  query: string,
  resultCount: number,
  totalResultCount: number,
  folderCount: number,
) => {
  if (isSearching) {
    return (
      <>
        <Spinner />
        <span>Searching...</span>
      </>
    );
  }

  if (noResults) {
    return <span>No files matching &apos;{query}&apos;</span>;
  }

  return (
    <span>
      Found {resultCount} file{resultCount !== 1 ? 's' : ''} in {folderCount} folder
      {folderCount !== 1 ? 's' : ''}
      {totalResultCount > resultCount && <> ({totalResultCount} total)</>}
    </span>
  );
};

const renderEmptyState = (
  noQuery: boolean,
  isSearching: boolean,
  resultCount: number,
  query: string,
) => {
  if (noQuery) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '32px 16px',
          gap: '12px',
          color: 'var(--xp-text-muted)',
        }}
      >
        <svg
          width="40"
          height="40"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ opacity: 0.4 }}
        >
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <span style={{ fontSize: '12px', textAlign: 'center' }}>
          Type to search files and folders
        </span>
        <span style={{ fontSize: '10px', opacity: 0.7, textAlign: 'center' }}>
          Ctrl+Shift+F to toggle this panel
        </span>
      </div>
    );
  }

  if (isSearching && resultCount === 0) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '32px 16px',
          gap: '8px',
          color: 'var(--xp-text-muted)',
        }}
      >
        <Spinner />
        <span style={{ fontSize: '12px' }}>Searching...</span>
      </div>
    );
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '32px 16px',
        gap: '8px',
        color: 'var(--xp-text-muted)',
      }}
    >
      <svg
        width="32"
        height="32"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ opacity: 0.4 }}
      >
        <circle cx="11" cy="11" r="8" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
        <line x1="8" y1="11" x2="14" y2="11" />
      </svg>
      <span style={{ fontSize: '12px', textAlign: 'center' }}>
        No files matching &apos;{query}&apos;
      </span>
    </div>
  );
};

interface ResultRowProps {
  item: LiveSearchResult;
  query: string;
  onNavigate: (parentDir: string, file: FileEntry) => void;
  onDoubleClick: (file: FileEntry) => void;
}

const ResultRow = React.memo(({ item, query, onNavigate, onDoubleClick }: ResultRowProps) => {
  const { file } = item;

  return (
    <div
      role="option"
      tabIndex={0}
      style={{
        display: 'flex',
        alignItems: 'center',
        padding: '3px 8px 3px 24px',
        cursor: 'pointer',
        fontSize: '12px',
        lineHeight: '20px',
        gap: '6px',
        borderRadius: '4px',
        transition: 'background 0.1s',
      }}
      className="text-xp-text hover:bg-xp-surface-light"
      onClick={() => onNavigate(item.parentDir, file)}
      onDoubleClick={() => onDoubleClick(file)}
      onKeyDown={(event) => {
        if (event.key === 'Enter') {
          event.preventDefault();
          onNavigate(item.parentDir, file);
        }
      }}
      title={file.path}
    >
      <span style={{ flexShrink: 0, display: 'flex', alignItems: 'center' }}>
        {getFileIcon(file)}
      </span>
      <span
        style={{
          flex: 1,
          minWidth: 0,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {highlightMatch(file.name, query)}
      </span>
      {!file.is_dir && (
        <span
          style={{
            flexShrink: 0,
            fontSize: '10px',
            color: 'var(--xp-text-muted)',
            marginLeft: '4px',
          }}
        >
          {formatFileSize(file.size)}
        </span>
      )}
    </div>
  );
});

ResultRow.displayName = 'ResultRow';

interface GroupHeaderProps {
  parentDir: string;
  basePath: string;
}

const GroupHeader = React.memo(({ parentDir, basePath }: GroupHeaderProps) => {
  let display = parentDir;

  if (display.startsWith(basePath)) {
    display = display.slice(basePath.length);
    if (display.startsWith('/') || display.startsWith('\\')) {
      display = display.slice(1);
    }
  }

  if (!display) display = '.';

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        padding: '4px 8px',
        fontSize: '10px',
        fontWeight: 600,
        letterSpacing: '0.03em',
        gap: '4px',
        marginTop: '4px',
        color: 'var(--xp-text-muted)',
      }}
    >
      <svg
        width="12"
        height="12"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ flexShrink: 0, opacity: 0.7 }}
      >
        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
      </svg>
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {display}
      </span>
    </div>
  );
});

GroupHeader.displayName = 'GroupHeader';

const Spinner = () => {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{
        animation: 'spin 1s linear infinite',
        flexShrink: 0,
      }}
    >
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  );
};

const SearchResultsPanel = React.forwardRef<SearchResultsPanelHandle, SearchResultsPanelProps>(
  ({ basePath, navigateToPath, onFileSelect, onFileOpen, width }, ref) => {
    const {
      query,
      setQuery,
      groupedResults,
      isSearching,
      resultCount,
      totalResultCount,
      folderCount,
      activeFilter,
      setActiveFilter,
      hasMore,
      showMore,
      clearSearch,
    } = useLiveSearch(basePath);

    const inputRef = useRef<HTMLInputElement>(null);
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    useImperativeHandle(
      ref,
      () => ({
        focus: () => {
          inputRef.current?.focus();
        },
      }),
      [],
    );

    type FlatItem =
      | { type: 'group-header'; parentDir: string }
      | { type: 'result'; item: LiveSearchResult };

    const flatItems = useMemo(() => {
      const items: FlatItem[] = [];

      for (const group of groupedResults) {
        items.push({ type: 'group-header', parentDir: group.parentDir });
        for (const item of group.items) {
          items.push({ type: 'result', item });
        }
      }

      return items;
    }, [groupedResults]);

    const virtualizer = useVirtualizer({
      count: flatItems.length + (hasMore ? 1 : 0),
      getScrollElement: () => scrollContainerRef.current,
      estimateSize: (index: number) => {
        if (index >= flatItems.length) return 32;
        return flatItems[index]?.type === 'group-header' ? 28 : 26;
      },
      overscan: 10,
    });

    useEffect(() => {
      const timer = setTimeout(() => inputRef.current?.focus(), 50);
      return () => clearTimeout(timer);
    }, []);

    const handleNavigateToResult = useCallback(
      (parentDir: string, file: FileEntry) => {
        navigateToPath(parentDir);
        onFileSelect(file);
      },
      [navigateToPath, onFileSelect],
    );

    const handleDoubleClickResult = useCallback(
      (file: FileEntry) => {
        onFileOpen?.(file);
      },
      [onFileOpen],
    );

    const handleInputKeyDown = useCallback(
      (event: React.KeyboardEvent) => {
        if (event.key === 'Enter') {
          event.preventDefault();
          const firstResult = flatItems.find((item) => item.type === 'result');
          if (firstResult?.type === 'result') {
            handleNavigateToResult(firstResult.item.parentDir, firstResult.item.file);
          }
          return;
        }

        if (event.key === 'ArrowDown') {
          event.preventDefault();
          const firstResultElement = scrollContainerRef.current?.querySelector('[role="option"]');
          if (firstResultElement instanceof HTMLElement) {
            firstResultElement.focus();
          }
          return;
        }

        if (event.key === 'Escape') {
          event.preventDefault();
          clearSearch();
        }
      },
      [clearSearch, flatItems, handleNavigateToResult],
    );

    const noQuery = !query.trim();
    const noResults = !noQuery && !isSearching && resultCount === 0;

    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          width: width ?? '100%',
          overflow: 'hidden',
        }}
      >
        <div style={{ padding: '8px', borderBottom: '1px solid var(--xp-border)' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              background: 'var(--xp-surface-light)',
              borderRadius: '6px',
              padding: '0 8px',
              gap: '6px',
              border: '1px solid var(--xp-border)',
            }}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--xp-text-muted)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ flexShrink: 0 }}
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>

            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={handleInputKeyDown}
              placeholder="Search files and folders..."
              style={{
                flex: 1,
                background: 'transparent',
                border: 'none',
                outline: 'none',
                padding: '6px 0',
                fontSize: '12px',
                color: 'var(--xp-text)',
                lineHeight: '18px',
              }}
              aria-label="Search files and folders"
            />

            {isSearching && <Spinner />}

            {query && (
              <button
                onClick={clearSearch}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '2px',
                  display: 'flex',
                  alignItems: 'center',
                  color: 'var(--xp-text-muted)',
                  borderRadius: '3px',
                  transition: 'color 0.15s',
                }}
                className="hover:text-xp-text"
                aria-label="Clear search"
              >
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            )}
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            gap: '4px',
            padding: '6px 8px',
            borderBottom: '1px solid var(--xp-border)',
            flexWrap: 'wrap',
          }}
        >
          {FILTERS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setActiveFilter(key)}
              style={{
                padding: '2px 8px',
                fontSize: '10px',
                borderRadius: '10px',
                border: '1px solid',
                borderColor: activeFilter === key ? 'var(--xp-blue)' : 'var(--xp-border)',
                background:
                  activeFilter === key
                    ? 'rgba(var(--xp-blue-rgb, 99, 102, 241), 0.15)'
                    : 'transparent',
                color: activeFilter === key ? 'var(--xp-blue)' : 'var(--xp-text-muted)',
                cursor: 'pointer',
                transition: 'all 0.15s',
                fontWeight: activeFilter === key ? 600 : 400,
                lineHeight: '18px',
              }}
              aria-pressed={activeFilter === key}
            >
              {label}
            </button>
          ))}
        </div>

        {!noQuery && (
          <div
            style={{
              padding: '4px 8px',
              fontSize: '10px',
              color: 'var(--xp-text-muted)',
              borderBottom: '1px solid var(--xp-border)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            {renderStatus(
              isSearching,
              noResults,
              query,
              resultCount,
              totalResultCount,
              folderCount,
            )}
          </div>
        )}

        <div
          ref={scrollContainerRef}
          style={{
            flex: 1,
            overflow: 'auto',
            minHeight: 0,
          }}
          role="listbox"
          aria-label="Search results"
        >
          {noQuery || isSearching || noResults ? (
            renderEmptyState(noQuery, isSearching, resultCount, query)
          ) : (
            <div
              style={{
                height: `${virtualizer.getTotalSize()}px`,
                width: '100%',
                position: 'relative',
              }}
            >
              {virtualizer.getVirtualItems().map((virtualRow) => {
                const index = virtualRow.index;

                if (index >= flatItems.length) {
                  return (
                    <div
                      key="show-more"
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: `${virtualRow.size}px`,
                        transform: `translateY(${virtualRow.start}px)`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <button
                        onClick={showMore}
                        style={{
                          background: 'none',
                          border: '1px solid var(--xp-border)',
                          borderRadius: '4px',
                          padding: '4px 12px',
                          fontSize: '11px',
                          color: 'var(--xp-blue)',
                          cursor: 'pointer',
                          transition: 'background 0.15s',
                        }}
                        className="hover:bg-xp-surface-light"
                      >
                        Show more... ({totalResultCount - resultCount} remaining)
                      </button>
                    </div>
                  );
                }

                const flatItem = flatItems[index];

                if (flatItem?.type === 'group-header') {
                  return (
                    <div
                      key={`header-${flatItem.parentDir}`}
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: `${virtualRow.size}px`,
                        transform: `translateY(${virtualRow.start}px)`,
                      }}
                    >
                      <GroupHeader parentDir={flatItem.parentDir} basePath={basePath} />
                    </div>
                  );
                }

                if (!flatItem || flatItem.type !== 'result') {
                  return null;
                }

                return (
                  <div
                    key={flatItem.item.file.path}
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: `${virtualRow.size}px`,
                      transform: `translateY(${virtualRow.start}px)`,
                    }}
                  >
                    <ResultRow
                      item={flatItem.item}
                      query={query}
                      onNavigate={handleNavigateToResult}
                      onDoubleClick={handleDoubleClickResult}
                    />
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  },
);

export default React.memo(SearchResultsPanel);
