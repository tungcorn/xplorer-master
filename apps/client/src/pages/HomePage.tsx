import React, { useState, useEffect, useCallback } from 'react';
import { TauriAPI, type RecentFile } from '@/lib/tauri-api';
import { formatFileSize, applyTheme } from '@/lib/utils';
import { isWindows, ROOT_PATH, PATH_SEPARATOR, CLOCK_UPDATE_INTERVAL_MS } from '@/lib/constants';
import { useAllThemes } from '@/lib/theme-registry';
import { useToast } from '@/hooks/use-toast';

interface QuickStats {
  totalFiles: number;
  totalFolders: number;
  totalSize: string;
  recentFiles: string[];
}

interface UserDirectories {
  home: string;
  documents: string;
  downloads: string;
  desktop: string;
  pictures: string;
  videos: string;
  music: string;
}

interface HomePageProps {
  onNavigate: (path: string) => void;
  theme: string;
  setTheme: (theme: string) => void;
}

// Solid SVG Icon components — filled style for crisp rendering at small sizes
const FolderIcon = ({ className = 'w-5 h-5' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M19.5 21a3 3 0 003-3v-4.5a3 3 0 00-3-3h-15a3 3 0 00-3 3V18a3 3 0 003 3h15zM1.5 10.146V6a3 3 0 013-3h5.379a2.25 2.25 0 011.59.659l2.122 2.121c.14.141.331.22.53.22H19.5a3 3 0 013 3v1.146A4.483 4.483 0 0019.5 9h-15a4.483 4.483 0 00-3 1.146z" />
  </svg>
);

const DocumentIcon = ({ className = 'w-5 h-5' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path
      fillRule="evenodd"
      d="M5.625 1.5c-1.036 0-1.875.84-1.875 1.875v17.25c0 1.035.84 1.875 1.875 1.875h12.75c1.035 0 1.875-.84 1.875-1.875V12.75A3.75 3.75 0 0016.5 9h-1.875a1.875 1.875 0 01-1.875-1.875V5.25A3.75 3.75 0 009 1.5H5.625zM7.5 15a.75.75 0 01.75-.75h7.5a.75.75 0 010 1.5h-7.5A.75.75 0 017.5 15zm.75 2.25a.75.75 0 000 1.5H12a.75.75 0 000-1.5H8.25z"
      clipRule="evenodd"
    />
    <path d="M12.971 1.816A5.23 5.23 0 0114.25 5.25v1.875c0 .207.168.375.375.375H16.5a5.23 5.23 0 013.434 1.279 9.768 9.768 0 00-6.963-6.963z" />
  </svg>
);

const DownloadIcon = ({ className = 'w-5 h-5' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path
      fillRule="evenodd"
      d="M12 2.25a.75.75 0 01.75.75v11.69l3.22-3.22a.75.75 0 111.06 1.06l-4.5 4.5a.75.75 0 01-1.06 0l-4.5-4.5a.75.75 0 111.06-1.06l3.22 3.22V3a.75.75 0 01.75-.75zm-9 13.5a.75.75 0 01.75.75v2.25a1.5 1.5 0 001.5 1.5h13.5a1.5 1.5 0 001.5-1.5V16.5a.75.75 0 011.5 0v2.25a3 3 0 01-3 3H5.25a3 3 0 01-3-3V16.5a.75.75 0 01.75-.75z"
      clipRule="evenodd"
    />
  </svg>
);

const DesktopIcon = ({ className = 'w-5 h-5' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path
      fillRule="evenodd"
      d="M2.25 5.25a3 3 0 013-3h13.5a3 3 0 013 3V15a3 3 0 01-3 3h-3v.257c0 .597.237 1.17.659 1.591l.621.622a.75.75 0 01-.53 1.28h-9a.75.75 0 01-.53-1.28l.621-.622a2.25 2.25 0 00.659-1.59V18h-3a3 3 0 01-3-3V5.25zm1.5 0v7.5a1.5 1.5 0 001.5 1.5h13.5a1.5 1.5 0 001.5-1.5v-7.5a1.5 1.5 0 00-1.5-1.5H5.25a1.5 1.5 0 00-1.5 1.5z"
      clipRule="evenodd"
    />
  </svg>
);

const PhotoIcon = ({ className = 'w-5 h-5' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path
      fillRule="evenodd"
      d="M1.5 6a2.25 2.25 0 012.25-2.25h16.5A2.25 2.25 0 0122.5 6v12a2.25 2.25 0 01-2.25 2.25H3.75A2.25 2.25 0 011.5 18V6zM3 16.06V18c0 .414.336.75.75.75h16.5A.75.75 0 0021 18v-1.94l-2.69-2.689a1.5 1.5 0 00-2.12 0l-.88.879.97.97a.75.75 0 11-1.06 1.06l-5.16-5.159a1.5 1.5 0 00-2.12 0L3 16.061zm10.125-7.81a1.125 1.125 0 112.25 0 1.125 1.125 0 01-2.25 0z"
      clipRule="evenodd"
    />
  </svg>
);

const VideoIcon = ({ className = 'w-5 h-5' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M4.5 4.5a3 3 0 00-3 3v9a3 3 0 003 3h8.25a3 3 0 003-3v-9a3 3 0 00-3-3H4.5zM19.94 18.75l-2.69-2.689V7.939l2.69-2.689c.944-.945 2.56-.276 2.56 1.06v11.38c0 1.336-1.616 2.005-2.56 1.06z" />
  </svg>
);

const MusicIcon = ({ className = 'w-5 h-5' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path
      fillRule="evenodd"
      d="M19.952 1.651a.75.75 0 01.298.599V16.303a3 3 0 01-2.176 2.884l-1.32.377a2.553 2.553 0 11-1.403-4.909l2.311-.66a1.5 1.5 0 001.088-1.442V6.994l-9 2.572v9.737a3 3 0 01-2.176 2.884l-1.32.377a2.553 2.553 0 11-1.402-4.909l2.31-.66a1.5 1.5 0 001.088-1.442V5.25a.75.75 0 01.544-.721l10.5-3a.75.75 0 01.706.122z"
      clipRule="evenodd"
    />
  </svg>
);

const TrashIcon = ({ className = 'w-5 h-5' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path
      fillRule="evenodd"
      d="M16.5 4.478v.227a48.816 48.816 0 013.878.512.75.75 0 11-.256 1.478l-.209-.035-1.005 13.07a3 3 0 01-2.991 2.77H8.084a3 3 0 01-2.991-2.77L4.087 6.66l-.209.035a.75.75 0 01-.256-1.478A48.567 48.567 0 017.5 4.705v-.227c0-1.564 1.213-2.9 2.816-2.951a52.662 52.662 0 013.369 0c1.603.051 2.815 1.387 2.815 2.951zm-6.136-1.452a51.196 51.196 0 013.273 0C14.39 3.05 15 3.684 15 4.478v.113a49.488 49.488 0 00-6 0v-.113c0-.794.609-1.428 1.364-1.452zm-.355 5.945a.75.75 0 10-1.5.058l.347 9a.75.75 0 101.499-.058l-.346-9zm5.48.058a.75.75 0 10-1.498-.058l-.347 9a.75.75 0 001.5.058l.345-9z"
      clipRule="evenodd"
    />
  </svg>
);

const _SearchIcon = ({ className = 'w-5 h-5' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path
      fillRule="evenodd"
      d="M10.5 3.75a6.75 6.75 0 100 13.5 6.75 6.75 0 000-13.5zM2.25 10.5a8.25 8.25 0 1114.59 5.28l4.69 4.69a.75.75 0 11-1.06 1.06l-4.69-4.69A8.25 8.25 0 012.25 10.5z"
      clipRule="evenodd"
    />
  </svg>
);

const _TerminalIcon = ({ className = 'w-5 h-5' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path
      fillRule="evenodd"
      d="M2.25 6a3 3 0 013-3h13.5a3 3 0 013 3v12a3 3 0 01-3 3H5.25a3 3 0 01-3-3V6zm3.97 1.28a.75.75 0 011.06 0l3 3a.75.75 0 010 1.06l-3 3a.75.75 0 01-1.06-1.06l2.47-2.47-2.47-2.47a.75.75 0 010-1.06zm4.28 4.97a.75.75 0 000 1.5h3a.75.75 0 000-1.5h-3z"
      clipRule="evenodd"
    />
  </svg>
);

const _SparklesIcon = ({ className = 'w-5 h-5' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path
      fillRule="evenodd"
      d="M9 4.5a.75.75 0 01.721.544l.813 2.846a3.75 3.75 0 002.576 2.576l2.846.813a.75.75 0 010 1.442l-2.846.813a3.75 3.75 0 00-2.576 2.576l-.813 2.846a.75.75 0 01-1.442 0l-.813-2.846a3.75 3.75 0 00-2.576-2.576l-2.846-.813a.75.75 0 010-1.442l2.846-.813A3.75 3.75 0 007.466 7.89l.813-2.846A.75.75 0 019 4.5zM18 1.5a.75.75 0 01.728.568l.258 1.036c.236.94.97 1.674 1.91 1.91l1.036.258a.75.75 0 010 1.456l-1.036.258c-.94.236-1.674.97-1.91 1.91l-.258 1.036a.75.75 0 01-1.456 0l-.258-1.036a2.625 2.625 0 00-1.91-1.91l-1.036-.258a.75.75 0 010-1.456l1.036-.258a2.625 2.625 0 001.91-1.91l.258-1.036A.75.75 0 0118 1.5zM16.5 15a.75.75 0 01.712.513l.394 1.183c.15.447.5.799.948.948l1.183.395a.75.75 0 010 1.422l-1.183.395c-.447.15-.799.5-.948.948l-.395 1.183a.75.75 0 01-1.422 0l-.395-1.183a1.5 1.5 0 00-.948-.948l-1.183-.395a.75.75 0 010-1.422l1.183-.395c.447-.15.799-.5.948-.948l.395-1.183A.75.75 0 0116.5 15z"
      clipRule="evenodd"
    />
  </svg>
);

const _ServerIcon = ({ className = 'w-5 h-5' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M4.08 5.227A3 3 0 016.979 3h10.042a3 3 0 012.899 2.227l2.747 10.11A6.017 6.017 0 0019.5 15H4.5c-1.16 0-2.24.329-3.157.338L4.08 5.227z" />
    <path
      fillRule="evenodd"
      d="M1.5 16.5A3 3 0 014.5 13.5h15a3 3 0 013 3v.75a3 3 0 01-3 3h-15a3 3 0 01-3-3v-.75zm15.75 0a.75.75 0 100 1.5.75.75 0 000-1.5zm-2.25.75a.75.75 0 111.5 0 .75.75 0 01-1.5 0z"
      clipRule="evenodd"
    />
  </svg>
);

const DriveIcon = ({ className = 'w-5 h-5' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path
      fillRule="evenodd"
      d="M2.25 13.5a8.25 8.25 0 0119.5 0v.75a.75.75 0 01-.75.75H3a.75.75 0 01-.75-.75v-.75zm9-5.25a.75.75 0 01.75-.75h.008a.75.75 0 01.75.75v.008a.75.75 0 01-.75.75H12a.75.75 0 01-.75-.75V8.25zM12 12a.75.75 0 100 1.5.75.75 0 000-1.5z"
      clipRule="evenodd"
    />
    <path d="M2.25 16.5a.75.75 0 01.75-.75h18a.75.75 0 01.75.75v2.25a2.25 2.25 0 01-2.25 2.25H4.5a2.25 2.25 0 01-2.25-2.25V16.5zm15.75.75a.75.75 0 100 1.5.75.75 0 000-1.5zm-2.25.75a.75.75 0 111.5 0 .75.75 0 01-1.5 0z" />
  </svg>
);

const _ArrowRightIcon = ({ className = 'w-4 h-4' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 20 20" fill="currentColor">
    <path
      fillRule="evenodd"
      d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z"
      clipRule="evenodd"
    />
  </svg>
);

const ClockIcon = ({ className = 'w-4 h-4' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path
      fillRule="evenodd"
      d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25zM12.75 6a.75.75 0 00-1.5 0v6c0 .414.336.75.75.75h4.5a.75.75 0 000-1.5h-3.75V6z"
      clipRule="evenodd"
    />
  </svg>
);

const _CheckCircleIcon = ({ className = 'w-4 h-4' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path
      fillRule="evenodd"
      d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm13.36-1.814a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z"
      clipRule="evenodd"
    />
  </svg>
);

/** Returns a human-readable relative time string. */
const relativeTime = (timestampMs: number): string => {
  const now = Date.now();
  const diff = now - timestampMs;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days}d ago`;
  return `${Math.floor(days / 7)}w ago`;
};

/** Icon gradient based on file type. */
const recentFileGradient = (fileType: string): string => {
  const t = fileType.toLowerCase();
  if (t === 'folder') return 'from-amber-500 to-amber-600';
  if (['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'bmp', 'ico'].includes(t)) {
    return 'from-pink-500 to-pink-600';
  }
  if (['mp4', 'mkv', 'avi', 'mov', 'wmv', 'webm'].includes(t)) {
    return 'from-orange-500 to-orange-600';
  }
  if (['mp3', 'wav', 'ogg', 'flac', 'aac', 'wma'].includes(t)) return 'from-cyan-500 to-cyan-600';
  if (['zip', 'rar', '7z', 'tar', 'gz', 'bz2', 'xz'].includes(t)) {
    return 'from-yellow-500 to-yellow-600';
  }
  if (
    [
      'js',
      'ts',
      'jsx',
      'tsx',
      'py',
      'rs',
      'go',
      'java',
      'c',
      'cpp',
      'html',
      'css',
      'json',
      'yaml',
      'toml',
      'xml',
    ].includes(t)
  ) {
    return 'from-emerald-500 to-emerald-600';
  }
  if (['txt', 'md', 'rtf', 'doc', 'docx', 'pdf', 'csv', 'log'].includes(t)) {
    return 'from-blue-500 to-blue-600';
  }
  return 'from-slate-500 to-slate-600';
};

/** Simple SVG icon for recent files based on type. */
const RecentFileTypeIcon = ({
  fileType,
  className = 'w-3.5 h-3.5',
}: {
  fileType: string;
  className?: string;
}) => {
  const t = fileType.toLowerCase();
  if (t === 'folder') return <FolderIcon className={className} />;
  return <DocumentIcon className={className} />;
};

const Clock = () => {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), CLOCK_UPDATE_INTERVAL_MS);
    return () => clearInterval(timer);
  }, []);

  const hour = currentTime.getHours();
  let greeting = 'Good evening';
  if (hour < 12) {
    greeting = 'Good morning';
  } else if (hour < 17) {
    greeting = 'Good afternoon';
  }

  return (
    <div className="flex items-end justify-between">
      <div>
        <p className="text-xp-text-muted mb-1 flex items-center gap-1.5 text-sm">
          <ClockIcon />
          {currentTime.toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
          })}
        </p>
        <h1 className="text-xp-text text-3xl font-bold">{greeting}</h1>
      </div>
      <p className="text-xp-text-muted text-2xl font-light tabular-nums">
        {currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
      </p>
    </div>
  );
};

const HomePage = ({ onNavigate, theme: _theme, setTheme }: HomePageProps) => {
  const themes = useAllThemes();
  const { toast } = useToast();
  const [recommendedFolders, setRecommendedFolders] = useState<string[]>([]);
  const [userDirectories, setUserDirectories] = useState<UserDirectories | null>(null);
  const [_quickStats, setQuickStats] = useState<QuickStats>({
    totalFiles: 0,
    totalFolders: 0,
    totalSize: '0 B',
    recentFiles: [],
  });
  const [_systemStats, setSystemStats] = useState<{
    os: string;
    arch: string;
    version: string;
    hostname: string;
  } | null>(null);

  // Recent files state
  const [recentFiles, setRecentFiles] = useState<RecentFile[]>([]);
  const [recentFilesLoading, setRecentFilesLoading] = useState(true);

  const loadRecentFiles = useCallback(async () => {
    setRecentFilesLoading(true);
    try {
      const files = await TauriAPI.getRecentFiles(12);
      setRecentFiles(files);
    } catch (err) {
      console.error('Failed to load recent files:', err);
    } finally {
      setRecentFilesLoading(false);
    }
  }, []);

  const handleClearRecentFiles = async () => {
    try {
      await TauriAPI.clearRecentFiles();
      setRecentFiles([]);
    } catch (err) {
      console.error('Failed to clear recent files:', err);
    }
  };

  const handleRemoveRecentFile = async (e: React.MouseEvent, path: string) => {
    e.stopPropagation();
    try {
      await TauriAPI.removeRecentFile(path);
      setRecentFiles((prev) => prev.filter((f) => f.path !== path));
    } catch (err) {
      console.error('Failed to remove recent file:', err);
    }
  };

  const handleRecentFileClick = (file: RecentFile) => {
    if (file.file_type === 'folder') {
      handleNavigate(file.path);
    } else {
      // Navigate to the parent directory
      const sep = file.path.includes('/') ? '/' : '\\';
      const parts = file.path.split(sep);
      parts.pop();
      const parentDir = parts.join(sep);
      if (parentDir) {
        handleNavigate(parentDir);
      }
    }
  };

  useEffect(() => {
    loadUserData();
    loadSystemStats();
    loadRecentFiles();
    // Mount-only initialization
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadUserData = async () => {
    try {
      const userDirs = await TauriAPI.getUserDirectories();
      setUserDirectories(userDirs);

      const recent = await TauriAPI.getRecentFolders();
      setRecommendedFolders(recent.slice(0, 4));

      const homeExists = await TauriAPI.fileExists(userDirs.home);
      if (homeExists) {
        const files = await TauriAPI.readDirectory(userDirs.home);
        const totalFiles = files.filter((f) => !f.is_dir).length;
        const totalFolders = files.filter((f) => f.is_dir).length;
        const totalSize = files.reduce((sum, f) => sum + f.size, 0);
        setQuickStats({
          totalFiles,
          totalFolders,
          totalSize: formatFileSize(totalSize),
          recentFiles: [],
        });
      }
    } catch (error) {
      console.error('Failed to load user data:', error);
      const home = isWindows ? 'C:\\Users\\Public' : '/home/user';
      setUserDirectories({
        home,
        documents: `${home + PATH_SEPARATOR}Documents`,
        downloads: `${home + PATH_SEPARATOR}Downloads`,
        desktop: `${home + PATH_SEPARATOR}Desktop`,
        pictures: `${home + PATH_SEPARATOR}Pictures`,
        videos: `${home + PATH_SEPARATOR}Videos`,
        music: `${home + PATH_SEPARATOR}Music`,
      });
    }
  };

  const loadSystemStats = async () => {
    try {
      const systemInfo = await TauriAPI.getSystemInfo();
      setSystemStats(systemInfo);
    } catch (error) {
      console.error('Failed to load system stats:', error);
    }
  };

  const handleNavigate = async (path: string) => {
    await TauriAPI.addToRecentFolders(path);
    onNavigate(path);
  };

  const _handleThemeChange = (newTheme: string) => {
    setTheme(newTheme);
    applyTheme(newTheme);
    const themeData = themes[newTheme as keyof typeof themes];
    toast({
      title: 'Theme Changed',
      description: `Applied ${themeData?.name || newTheme} theme`,
    });
  };

  const quickAccessFolders = userDirectories
    ? [
        {
          name: 'Documents',
          path: userDirectories.documents,
          icon: DocumentIcon,
          gradient: 'from-blue-500 to-blue-600',
        },
        {
          name: 'Downloads',
          path: userDirectories.downloads,
          icon: DownloadIcon,
          gradient: 'from-emerald-500 to-emerald-600',
        },
        {
          name: 'Desktop',
          path: userDirectories.desktop,
          icon: DesktopIcon,
          gradient: 'from-violet-500 to-violet-600',
        },
        {
          name: 'Pictures',
          path: userDirectories.pictures,
          icon: PhotoIcon,
          gradient: 'from-pink-500 to-pink-600',
        },
        {
          name: 'Videos',
          path: userDirectories.videos,
          icon: VideoIcon,
          gradient: 'from-orange-500 to-orange-600',
        },
        {
          name: 'Music',
          path: userDirectories.music,
          icon: MusicIcon,
          gradient: 'from-cyan-500 to-cyan-600',
        },
      ]
    : [];

  return (
    <div className="bg-xp-bg text-xp-text flex h-full flex-col overflow-auto">
      <div className="mx-auto flex min-h-0 w-full max-w-5xl flex-1 flex-col px-6 py-8">
        {/* Hero / Greeting */}
        <div className="mb-6">
          <Clock />
        </div>

        {/* Quick Links */}
        <div className="mb-6">
          <div className="flex flex-wrap gap-2">
            {quickAccessFolders.map((folder) => {
              const Icon = folder.icon;
              return (
                <button
                  key={folder.name}
                  onClick={() => handleNavigate(folder.path)}
                  className="bg-xp-surface/50 border-xp-border hover:border-xp-text-muted hover:bg-xp-surface group flex items-center gap-2.5 rounded-lg border px-3.5 py-2.5 transition-all duration-150"
                >
                  <div
                    className={`h-7 w-7 rounded-md bg-gradient-to-br ${folder.gradient} flex flex-shrink-0 items-center justify-center`}
                  >
                    <Icon className="h-3.5 w-3.5 text-white" />
                  </div>
                  <span className="text-xp-text text-sm font-medium">{folder.name}</span>
                </button>
              );
            })}
            <button
              onClick={() => handleNavigate('xplorer://trash')}
              className="bg-xp-surface/50 border-xp-border hover:border-xp-text-muted hover:bg-xp-surface group flex items-center gap-2.5 rounded-lg border px-3.5 py-2.5 transition-all duration-150"
            >
              <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md bg-gradient-to-br from-red-500 to-red-600">
                <TrashIcon className="h-3.5 w-3.5 text-white" />
              </div>
              <span className="text-xp-text text-sm font-medium">Trash</span>
            </button>
            <button
              onClick={() => handleNavigate(ROOT_PATH)}
              className="bg-xp-surface/50 border-xp-border hover:border-xp-text-muted hover:bg-xp-surface group flex items-center gap-2.5 rounded-lg border px-3.5 py-2.5 transition-all duration-150"
            >
              <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md bg-gradient-to-br from-slate-500 to-slate-600">
                <DriveIcon className="h-3.5 w-3.5 text-white" />
              </div>
              <span className="text-xp-text text-sm font-medium">
                {isWindows ? 'C:' : 'Macintosh HD'}
              </span>
            </button>
          </div>

          {/* Recent folders inline */}
          {recommendedFolders.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {recommendedFolders.map((path) => {
                const name = path.split(/[\\/]/).pop() || path;
                return (
                  <button
                    key={path}
                    onClick={() => handleNavigate(path)}
                    className="bg-xp-bg/40 border-xp-border hover:border-xp-text-muted group flex items-center gap-2 rounded-md border px-3 py-1.5 text-xs transition-colors"
                    title={path}
                  >
                    <FolderIcon className="text-xp-blue h-3 w-3 flex-shrink-0" />
                    <span className="text-xp-text-muted group-hover:text-xp-text max-w-[140px] truncate">
                      {name}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Recent Files */}
        {!recentFilesLoading && recentFiles.length > 0 && (
          <div className="mb-6">
            <div className="mb-2 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <ClockIcon />
                <span className="text-xp-text text-sm font-medium">Recent Files</span>
              </div>
              <button
                onClick={handleClearRecentFiles}
                className="text-xp-text-muted hover:text-xp-error text-[11px] transition-colors"
              >
                Clear all
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
              {recentFiles.map((file) => {
                const gradient = recentFileGradient(file.file_type);
                return (
                  <div
                    key={`${file.path}-${file.accessed_at}`}
                    onClick={() => handleRecentFileClick(file)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleRecentFileClick(file);
                      }
                    }}
                    role="button"
                    tabIndex={0}
                    className="bg-xp-surface/50 border-xp-border hover:border-xp-text-muted hover:bg-xp-surface group relative flex cursor-pointer items-center gap-2.5 rounded-lg border px-3 py-2.5 text-left transition-all duration-150"
                    title={file.path}
                  >
                    <div
                      className={`h-7 w-7 rounded-md bg-gradient-to-br ${gradient} flex flex-shrink-0 items-center justify-center`}
                    >
                      <RecentFileTypeIcon
                        fileType={file.file_type}
                        className="h-3.5 w-3.5 text-white"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xp-text truncate text-sm font-medium">{file.name}</p>
                      <p className="text-xp-text-muted text-[10px]">
                        {relativeTime(file.accessed_at)}
                      </p>
                    </div>
                    {/* Remove button on hover */}
                    <button
                      onClick={(e) => handleRemoveRecentFile(e, file.path)}
                      className="hover:bg-xp-error/20 text-xp-text-muted hover:text-xp-error absolute right-1 top-1 rounded p-0.5 opacity-0 transition-all group-hover:opacity-100"
                      title="Remove from recent"
                    >
                      <svg
                        className="h-3 w-3"
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
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default HomePage;
