import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { TauriAPI, type FileEntry } from '@/lib/tauri-api';
import type { TabItem } from '@/types/split-view';
import type { VimModeState } from '@/hooks/use-vim-mode';
import { GitBranch, Search, Folder, FileText } from 'lucide-react';
import { useTranslation } from 'react-i18next';

// ── Cursor position event type ───────────────────────────────────────────────

export interface CursorPositionDetail {
  line: number;
  column: number;
}

// ── Props ────────────────────────────────────────────────────────────────────

interface StatusBarProps {
  files: FileEntry[];
  selectedFiles: Set<string>;
  currentPath: string;
  /** The currently active tab object, used to detect editor mode. */
  activeTab?: TabItem | null;
  /** Vim mode state — when provided and enabled, shows the vim indicator in the left section. */
  vimState?: VimModeState | null;
  /** Current view mode label (e.g. "Details", "Grid", "List"). */
  viewMode?: string;
}

// ── Git status counts ────────────────────────────────────────────────────────

interface GitInfo {
  branch: string;
  modifiedCount: number;
  stagedCount: number;
  untrackedCount: number;
}

// ── Component ────────────────────────────────────────────────────────────────

const StatusBar = ({
  files,
  selectedFiles: _selectedFiles,
  currentPath,
  activeTab: _activeTab,
  vimState: _vimState,
  viewMode,
}: StatusBarProps) => {
  const { t } = useTranslation();
  const [gitInfo, setGitInfo] = useState<GitInfo | null>(null);

  // Track previous path to avoid redundant git lookups
  const prevPathRef = useRef<string>('');

  // Counts
  const folderCount = useMemo(() => files.filter((f) => f.is_dir).length, [files]);
  const fileCount = useMemo(() => files.filter((f) => !f.is_dir).length, [files]);
  const totalFiles = files.length;

  // Fetch git info (branch + file status counts)
  const refreshGitInfo = useCallback(async () => {
    if (currentPath.startsWith('xplorer://')) return;
    try {
      const repoPath = await TauriAPI.findGitRepository(currentPath);
      if (repoPath) {
        const info = await TauriAPI.getRepositoryInfo(repoPath);
        setGitInfo({
          branch: info.current_branch,
          modifiedCount: info.modified_files?.length ?? 0,
          stagedCount: info.staged_files?.length ?? 0,
          untrackedCount: info.untracked_files?.length ?? 0,
        });
      } else {
        setGitInfo(null);
      }
    } catch {
      setGitInfo(null);
    }
  }, [currentPath]);

  // Refresh when path changes
  useEffect(() => {
    if (currentPath.startsWith('xplorer://') || currentPath === prevPathRef.current) return;
    prevPathRef.current = currentPath;
    refreshGitInfo();
  }, [currentPath, refreshGitInfo]);

  // Re-fetch when extension switches branches
  useEffect(() => {
    const handler = () => {
      refreshGitInfo();
    };
    window.addEventListener('git-branch-changed', handler);
    return () => window.removeEventListener('git-branch-changed', handler);
  }, [refreshGitInfo]);

  // Git status summary for tooltip
  const gitTooltip = useMemo(() => {
    if (!gitInfo) return '';
    const parts = [t('statusBar.branch', { name: gitInfo.branch })];
    if (gitInfo.modifiedCount > 0) {
      parts.push(t('statusBar.modified', { count: gitInfo.modifiedCount }));
    }
    if (gitInfo.stagedCount > 0) parts.push(t('statusBar.staged', { count: gitInfo.stagedCount }));
    if (gitInfo.untrackedCount > 0) {
      parts.push(t('statusBar.untracked', { count: gitInfo.untrackedCount }));
    }
    return parts.join(' | ');
  }, [gitInfo, t]);

  const totalGitChanges = gitInfo
    ? gitInfo.modifiedCount + gitInfo.stagedCount + gitInfo.untrackedCount
    : 0;

  return (
    <div
      role="status"
      aria-live="polite"
      className="bg-xp-bg border-xp-border flex flex-shrink-0 select-none items-center justify-between border-t px-3 text-xs"
      style={{ minHeight: '40px', height: '40px' }}
    >
      {/* Left: Filter input */}
      <div className="flex min-w-0 flex-1 items-center">
        <div className="flex max-w-xs flex-1 items-center gap-1.5">
          <Search className="text-xp-text-muted h-3.5 w-3.5 flex-shrink-0" aria-hidden="true" />
          <input
            type="text"
            readOnly
            placeholder={t('statusBar.filterPlaceholder', { count: totalFiles })}
            className="text-xp-text-muted placeholder:text-xp-text-muted min-w-0 flex-1 border-none bg-transparent text-xs outline-none"
            aria-label={t('statusBar.filterFiles')}
          />
        </div>
      </div>

      {/* Right: Stats */}
      <div className="text-xp-text-secondary flex items-center gap-4">
        {/* Folder count */}
        <span
          className="flex items-center gap-1"
          title={t('statusBar.folderCount', { count: folderCount })}
        >
          <Folder className="h-3.5 w-3.5" aria-hidden="true" />
          <span>{folderCount}</span>
        </span>

        {/* File count */}
        <span
          className="flex items-center gap-1"
          title={t('statusBar.fileCountDetail', { count: fileCount, total: totalFiles })}
        >
          <FileText className="h-3.5 w-3.5" aria-hidden="true" />
          <span>
            {fileCount}/{totalFiles}
          </span>
        </span>

        {/* View mode */}
        {viewMode && <span className="text-xp-text-muted">{viewMode}</span>}

        {/* Git info */}
        {gitInfo && (
          <div
            className="flex items-center gap-1"
            title={gitTooltip || gitInfo.branch}
            aria-label={gitTooltip || gitInfo.branch}
          >
            <GitBranch className="h-3.5 w-3.5" aria-hidden="true" />
            <span>{gitInfo.branch}</span>
            {totalGitChanges > 0 && (
              <span
                className="inline-flex items-center justify-center rounded-full px-1 text-[10px] font-semibold leading-[14px]"
                style={{
                  background: 'var(--xp-orange, #e8a854)',
                  color: 'var(--xp-bg, #0a0a1a)',
                }}
                title={`${gitInfo.modifiedCount}M ${gitInfo.stagedCount}S ${gitInfo.untrackedCount}U`}
              >
                {totalGitChanges}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default StatusBar;
