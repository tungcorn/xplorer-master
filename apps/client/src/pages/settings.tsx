import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import {
  ArrowLeft,
  FolderOpen,
  Search,
  Accessibility,
  Keyboard,
  HardDrive,
  ClipboardList,
  History,
  MousePointerClick,
  Settings2,
  ChevronRight,
} from 'lucide-react';
import TokenizerSettings from '@/components/TokenizerSettings';
import BackupRestoreSettings from '@/components/settings/BackupRestoreSettings';
import AuditLogSettings from '@/components/settings/AuditLogSettings';
import VersioningSettings from '@/components/settings/VersioningSettings';
import ContextMenuRulesCard from '@/components/settings/ContextMenuRulesCard';
import ShortcutsSettingsPanel from '@/components/settings/ShortcutsSettings';
import GeneralSettings from '@/components/settings/GeneralSettings';
import ExplorerSettings from '@/components/settings/ExplorerSettings';
import AccessibilitySettings from '@/components/settings/AccessibilitySettings';
import { loadFontSize } from '@/lib/utils';
import { AppSettings, DEFAULT_SETTINGS, SETTINGS_KEY } from '@/components/settings/shared';

type SettingsTab =
  | 'general'
  | 'explorer'
  | 'context-menu'
  | 'indexing'
  | 'shortcuts'
  | 'accessibility'
  | 'backup'
  | 'audit'
  | 'versioning';

const tabs: { id: SettingsTab; label: string; icon: React.ElementType; description: string }[] = [
  { id: 'general', label: 'General', icon: Settings2, description: 'Appearance, layout & system' },
  { id: 'explorer', label: 'File Explorer', icon: FolderOpen, description: 'Views & file display' },
  {
    id: 'context-menu',
    label: 'Context Menu',
    icon: MousePointerClick,
    description: 'Right-click menu rules',
  },
  { id: 'indexing', label: 'Indexing', icon: Search, description: 'File search & tokenizer' },
  { id: 'shortcuts', label: 'Shortcuts', icon: Keyboard, description: 'Key bindings & profiles' },
  {
    id: 'accessibility',
    label: 'Accessibility',
    icon: Accessibility,
    description: 'Motion & focus',
  },
  {
    id: 'backup',
    label: 'Backup & Restore',
    icon: HardDrive,
    description: 'Import & export settings',
  },
  { id: 'audit', label: 'Audit Log', icon: ClipboardList, description: 'File operation history' },
  { id: 'versioning', label: 'Versioning', icon: History, description: 'File version history' },
];

export default function Settings() {
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState<SettingsTab>('general');

  const [settings, setSettings] = useState<AppSettings>(() => {
    try {
      const saved = localStorage.getItem(SETTINGS_KEY);
      if (saved) return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
    } catch {
      /* ignore localStorage/parse errors */
    }
    return DEFAULT_SETTINGS;
  });

  useEffect(() => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    loadFontSize();
    if (settings.reducedMotion) document.documentElement.classList.add('reduce-motion');
    if (settings.enhancedFocus) document.documentElement.classList.add('enhanced-focus');
    if (settings.highContrast) document.documentElement.classList.add('high-contrast');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updateSetting = (key: string, value: string | boolean | number) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'general':
        return (
          <GeneralSettings
            settings={settings}
            updateSetting={updateSetting}
            setSettings={setSettings}
          />
        );
      case 'explorer':
        return <ExplorerSettings settings={settings} updateSetting={updateSetting} />;
      case 'context-menu':
        return <ContextMenuRulesCard />;
      case 'indexing':
        return (
          <div className="px-4 py-2">
            <TokenizerSettings />
          </div>
        );
      case 'shortcuts':
        return <ShortcutsSettingsPanel />;
      case 'accessibility':
        return <AccessibilitySettings settings={settings} updateSetting={updateSetting} />;
      case 'backup':
        return <BackupRestoreSettings />;
      case 'audit':
        return <AuditLogSettings />;
      case 'versioning':
        return <VersioningSettings />;
    }
  };

  return (
    <div className="bg-xp-bg text-xp-text flex min-h-screen flex-col">
      {/* Header */}
      <div className="border-xp-border/50 bg-xp-bg/80 shrink-0 border-b backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-6 py-4">
          <button
            onClick={() => setLocation('/')}
            className="text-xp-text-secondary hover:bg-xp-surface hover:text-xp-text flex h-8 w-8 items-center justify-center rounded-md transition-colors"
            title="Back to Home"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-xp-text text-lg font-semibold leading-tight">Settings</h1>
            <p className="text-xp-text-secondary text-xs">Customize your Xplorer experience</p>
          </div>
        </div>
      </div>

      {/* Body: Sidebar + Content */}
      <div className="flex-1 overflow-hidden">
        <div className="mx-auto flex h-full max-w-6xl">
          {/* Sidebar */}
          <nav className="border-xp-border/50 w-56 shrink-0 overflow-y-auto border-r px-3 py-4">
            <div className="space-y-1">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-all ${
                      isActive
                        ? 'bg-xp-accent/15 text-xp-accent'
                        : 'text-xp-text-secondary hover:bg-xp-surface hover:text-xp-text'
                    }`}
                  >
                    <Icon size={18} className={isActive ? 'text-xp-accent' : ''} />
                    <div className="min-w-0 flex-1">
                      <div
                        className={`truncate text-sm font-medium ${isActive ? 'text-xp-accent' : ''}`}
                      >
                        {tab.label}
                      </div>
                      <div className="text-xp-text-secondary/60 truncate text-[10px]">
                        {tab.description}
                      </div>
                    </div>
                    {isActive && <ChevronRight size={14} className="text-xp-accent/60 shrink-0" />}
                  </button>
                );
              })}
            </div>
          </nav>

          {/* Content */}
          <main className="flex-1 overflow-y-auto px-2 py-4">
            <div className="max-w-2xl">
              {/* Tab heading */}
              <div className="mb-4 px-4">
                <h2 className="text-xp-text text-xl font-semibold">
                  {tabs.find((t) => t.id === activeTab)?.label}
                </h2>
                <p className="text-xp-text-secondary mt-0.5 text-sm">
                  {tabs.find((t) => t.id === activeTab)?.description}
                </p>
              </div>

              {/* Settings content */}
              {renderTabContent()}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
