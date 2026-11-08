import React, { useState } from 'react';
import { Menu, X, Play, Clock, Sun, Moon } from 'lucide-react';

export type ActiveNavTab =
  | 'dashboard'
  | 'chapters'
  | 'mastery'
  | 'recall'
  | 'notebook'
  | 'calendar'
  | 'history'
  | 'analytics';

interface NavbarProps {
  activeTab: ActiveNavTab;
  onSelectTab: (tab: ActiveNavTab) => void;
  hasActiveTest: boolean;
  onResumeTest: () => void;
  onStartFullTest: () => void;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  onSelectTab,
  hasActiveTest,
  onResumeTest,
  onStartFullTest,
  theme,
  onToggleTheme,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems: Array<{ id: ActiveNavTab; label: string }> = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'chapters', label: 'Select Chapters' },
    { id: 'mastery', label: 'Mastery' },
    { id: 'recall', label: 'Active Recall' },
    { id: 'notebook', label: 'Mistake Notebook' },
    { id: 'calendar', label: 'Calendar' },
    { id: 'history', label: 'History' },
    { id: 'analytics', label: 'Analytics' },
  ];

  const handleNavClick = (tabId: ActiveNavTab) => {
    onSelectTab(tabId);
    setMobileMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-40 w-full bg-white dark:bg-[#121214] border-b border-neutral-200 dark:border-neutral-800 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-2 sm:gap-4 w-full">
        {/* LEFT: Typographic Wordmark */}
        <div className="shrink-0 flex items-center">
          <button
            type="button"
            onClick={() => handleNavClick('dashboard')}
            className="text-left font-semibold text-base tracking-tight text-neutral-900 dark:text-neutral-100 hover:text-neutral-700 dark:hover:text-white transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 dark:focus-visible:ring-neutral-100 rounded"
          >
            Test Generator
          </button>
        </div>

        {/* CENTRE: Desktop Navigation Links (Visible on lg and larger) */}
        <nav
          className="hidden lg:flex items-center gap-1 text-sm font-medium"
          aria-label="Main Navigation"
        >
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleNavClick(item.id)}
                className={`px-3 py-1.5 text-xs font-medium rounded transition-colors cursor-pointer whitespace-nowrap focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 dark:focus-visible:ring-neutral-100 ${
                  isActive
                    ? 'text-neutral-950 dark:text-white font-semibold bg-neutral-100 dark:bg-neutral-800'
                    : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-950 dark:hover:text-white hover:bg-neutral-50 dark:hover:bg-neutral-800/60'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* RIGHT: Theme Toggle, Primary Action & Mobile Hamburger */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Theme Toggle (Dark / Light Mode) */}
          <button
            type="button"
            onClick={onToggleTheme}
            aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            className="p-1.5 rounded text-neutral-600 dark:text-neutral-400 hover:text-neutral-950 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 dark:focus-visible:ring-neutral-100 flex items-center gap-1.5 text-xs font-medium"
          >
            {theme === 'dark' ? (
              <>
                <Sun className="w-4 h-4 text-amber-400" />
                <span className="hidden sm:inline">Light</span>
              </>
            ) : (
              <>
                <Moon className="w-4 h-4 text-neutral-700" />
                <span className="hidden sm:inline">Dark</span>
              </>
            )}
          </button>

          {/* Primary Action Button */}
          {hasActiveTest ? (
            <button
              type="button"
              onClick={onResumeTest}
              className="px-3.5 py-1.5 text-xs font-medium text-white dark:text-neutral-950 bg-neutral-900 dark:bg-white hover:bg-neutral-800 dark:hover:bg-neutral-200 rounded transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 dark:focus-visible:ring-neutral-100 shrink-0"
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Resume Test</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onStartFullTest}
              className="px-3.5 py-1.5 text-xs font-medium text-white dark:text-neutral-950 bg-neutral-900 dark:bg-white hover:bg-neutral-800 dark:hover:bg-neutral-200 rounded transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 dark:focus-visible:ring-neutral-100 shrink-0"
            >
              <Play className="w-3 h-3 fill-current" />
              <span>Start Test</span>
            </button>
          )}

          {/* Mobile/Tablet Menu Hamburger (Visible below lg) */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label={mobileMenuOpen ? 'Close Navigation Menu' : 'Open Navigation Menu'}
            className="lg:hidden p-1.5 rounded text-neutral-600 dark:text-neutral-400 hover:text-neutral-950 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 cursor-pointer"
          >
            {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Mobile/Tablet Drawer Navigation */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#121214] px-4 py-3 space-y-2 shadow-sm">
          <div className="space-y-1">
            {navItems.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleNavClick(item.id)}
                  className={`w-full text-left px-3 py-2 rounded text-xs font-medium transition-colors ${
                    isActive
                      ? 'text-neutral-950 dark:text-white font-semibold bg-neutral-100 dark:bg-neutral-800'
                      : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-950 dark:hover:text-white hover:bg-neutral-50 dark:hover:bg-neutral-800/60'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </div>

          <div className="pt-2 border-t border-neutral-200 dark:border-neutral-800 flex items-center justify-between px-3 py-1">
            <span className="text-xs text-neutral-600 dark:text-neutral-400">Theme</span>
            <button
              type="button"
              onClick={onToggleTheme}
              className="flex items-center gap-1.5 px-2.5 py-1 text-xs rounded border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 cursor-pointer"
            >
              {theme === 'dark' ? (
                <>
                  <Sun className="w-3.5 h-3.5 text-amber-400" />
                  <span>Light Mode</span>
                </>
              ) : (
                <>
                  <Moon className="w-3.5 h-3.5" />
                  <span>Dark Mode</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
