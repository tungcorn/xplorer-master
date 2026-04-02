import React, { useState, useRef, useImperativeHandle, forwardRef } from 'react';
import { FileEntry } from '@/lib/tauri-api';
import SearchResultsPanel, {
  type SearchResultsPanelHandle,
} from '@/components/explorer/SearchResultsPanel';
import SidebarBookmarks from '@/components/explorer/sidebar/SidebarBookmarks';
import SidebarDrives from '@/components/explorer/sidebar/SidebarDrives';
import { ChevronRight, ChevronDown, Search } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export interface LeftSidebarHandle {
  focusSearch: () => void;
}

interface LeftSidebarProps {
  currentPath: string;
  navigateToPath: (path: string) => void;
  handleFileClick: (file: FileEntry) => void;
  handleFileRightClick?: (file: FileEntry, event: React.MouseEvent) => void;
  handleFileOpen?: (file: FileEntry) => void;
  getFileIcon: (file: FileEntry) => React.ReactNode;
  width?: number;
  searchPanelOpen?: boolean;
  onToggleSearchPanel?: () => void;
  'data-tour'?: string;
}

interface CollapsibleSectionProps {
  label: string;
  defaultExpanded?: boolean;
  children?: React.ReactNode;
}

const CollapsibleSection = ({
  label,
  defaultExpanded = true,
  children,
}: CollapsibleSectionProps) => {
  const [expanded, setExpanded] = useState(defaultExpanded);

  return (
    <div>
      <button
        type="button"
        onClick={() => setExpanded((prev) => !prev)}
        className="text-xp-text-muted hover:text-xp-text-secondary flex w-full cursor-pointer items-center justify-between px-3 py-1.5 text-xs font-semibold uppercase tracking-wider"
        style={{ minHeight: '30px' }}
        aria-expanded={expanded}
      >
        <span className="flex items-center gap-1">
          {expanded ? (
            <ChevronDown className="h-3 w-3" aria-hidden="true" />
          ) : (
            <ChevronRight className="h-3 w-3" aria-hidden="true" />
          )}
          {label}
        </span>
      </button>
      {expanded && children}
    </div>
  );
};

const LeftSidebar = forwardRef<LeftSidebarHandle, LeftSidebarProps>(
  (
    {
      currentPath,
      navigateToPath,
      handleFileClick: _handleFileClick,
      handleFileRightClick,
      handleFileOpen,
      getFileIcon: _getFileIcon,
      width,
      searchPanelOpen = false,
      onToggleSearchPanel,
      'data-tour': dataTour,
    },
    ref,
  ) => {
    const { t } = useTranslation();
    const searchPanelRef = useRef<SearchResultsPanelHandle>(null);

    useImperativeHandle(ref, () => ({
      focusSearch: () => {
        if (!searchPanelOpen && onToggleSearchPanel) {
          onToggleSearchPanel();
          setTimeout(() => searchPanelRef.current?.focus(), 100);
        } else {
          searchPanelRef.current?.focus();
        }
      },
    }));

    if (searchPanelOpen) {
      return (
        <nav
          data-tour={dataTour}
          role="navigation"
          aria-label="File explorer sidebar"
          className="bg-xp-surface border-xp-border flex flex-shrink-0 flex-col border-r"
          style={{ width: width ?? 200, minHeight: 0, overflow: 'hidden' }}
        >
          <SearchResultsPanel
            ref={searchPanelRef}
            basePath={currentPath}
            navigateToPath={navigateToPath}
            onFileSelect={_handleFileClick}
            onFileOpen={handleFileOpen}
          />
        </nav>
      );
    }

    return (
      <nav
        data-tour={dataTour}
        role="navigation"
        aria-label="File explorer sidebar"
        className="bg-xp-surface border-xp-border flex flex-shrink-0 flex-col border-r"
        style={{ width: width ?? 200, minHeight: 0, overflow: 'hidden' }}
      >
        <div className="border-xp-border flex items-center gap-1.5 border-b px-3 py-2">
          <Search className="text-xp-text-muted h-3.5 w-3.5 flex-shrink-0" aria-hidden="true" />
          <input
            type="text"
            readOnly
            placeholder={t('sidebar.filter')}
            className="text-xp-text-muted placeholder:text-xp-text-muted min-w-0 flex-1 border-none bg-transparent text-xs outline-none"
            aria-label={t('sidebar.filterAria')}
          />
        </div>

        <div className="flex-1 overflow-y-auto overflow-x-hidden">
          <CollapsibleSection label={t('sidebar.storage')}>
            <SidebarDrives navigateToPath={navigateToPath} />
          </CollapsibleSection>

          <CollapsibleSection label={t('sidebar.recents')} defaultExpanded={false} />

          <CollapsibleSection label={t('sidebar.places')} defaultExpanded={false} />

          <CollapsibleSection label={t('sidebar.bookmarks')}>
            <SidebarBookmarks
              currentPath={currentPath}
              navigateToPath={navigateToPath}
              handleFileRightClick={handleFileRightClick}
            />
          </CollapsibleSection>
        </div>
      </nav>
    );
  },
);

LeftSidebar.displayName = 'LeftSidebar';

export default LeftSidebar;
