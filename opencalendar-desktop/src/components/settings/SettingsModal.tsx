import { useState } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { X, Moon, Sun, Monitor, User, Info, LogOut, Palette, RefreshCw } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const { isDarkMode, setDarkMode } = useTheme();
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<'general' | 'appearance' | 'account'>('general');

  if (!isOpen) return null;

  const handleLogout = async () => {
    if (confirm('Weet je zeker dat je wilt uitloggen?')) {
      await logout();
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal - groter en consistent met app styling */}
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-hidden rounded-2xl shadow-2xl border border-border bg-card flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
          <h2 className="text-xl font-semibold text-foreground">Instellingen</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex flex-1 min-h-0">
          {/* Sidebar - breder en met betere spacing */}
          <div className="w-56 shrink-0 border-r border-border p-4 bg-muted/50">
            <nav className="space-y-1">
              <button
                onClick={() => setActiveTab('general')}
                className={`w-full flex items-center gap-3 text-left px-4 py-3 rounded-lg transition-colors ${
                  activeTab === 'general'
                    ? 'bg-accent text-accent-foreground font-medium'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                <Info className="w-5 h-5 shrink-0" />
                Algemeen
              </button>
              <button
                onClick={() => setActiveTab('appearance')}
                className={`w-full flex items-center gap-3 text-left px-4 py-3 rounded-lg transition-colors ${
                  activeTab === 'appearance'
                    ? 'bg-accent text-accent-foreground font-medium'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                <Palette className="w-5 h-5 shrink-0" />
                Weergave
              </button>
              <button
                onClick={() => setActiveTab('account')}
                className={`w-full flex items-center gap-3 text-left px-4 py-3 rounded-lg transition-colors ${
                  activeTab === 'account'
                    ? 'bg-accent text-accent-foreground font-medium'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                <User className="w-5 h-5 shrink-0" />
                Account
              </button>
            </nav>
          </div>

          {/* Content - meer ruimte en betere scroll */}
          <div className="flex-1 overflow-y-auto p-6 min-w-0">
            {activeTab === 'general' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-foreground mb-4">
                    Algemene instellingen
                  </h3>

                  <div className="space-y-4">
                    <div className="p-4 rounded-xl border border-border bg-muted/50">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-muted">
                          <Info className="w-5 h-5 text-muted-foreground" />
                        </div>
                        <div>
                          <h4 className="font-medium text-foreground">Versie</h4>
                          <p className="text-sm text-muted-foreground">
                            OpenCalendar Desktop v1.0.0
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="p-4 rounded-xl border border-border bg-muted/50">
                      <div className="flex items-center gap-3 mb-2">
                        <RefreshCw className="w-5 h-5 text-muted-foreground" />
                        <h4 className="font-medium text-foreground">Automatische updates</h4>
                      </div>
                      <label className="flex items-center gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          defaultChecked
                          className="rounded border-border text-accent focus:ring-accent"
                        />
                        <span className="text-sm text-muted-foreground">
                          Automatisch controleren op updates bij het opstarten
                        </span>
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'appearance' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-foreground mb-4">
                    Weergave
                  </h3>

                  <div className="p-4 rounded-xl border border-border bg-muted/50">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-muted">
                        <Moon className="w-5 h-5 text-muted-foreground" />
                      </div>
                      <div>
                        <h4 className="font-medium text-foreground">Thema</h4>
                        <p className="text-sm text-muted-foreground">
                          Kies tussen licht of donker modus
                        </p>
                      </div>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-3">
                      <label
                        className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                          !isDarkMode
                            ? 'border-accent bg-accent-light'
                            : 'border-border hover:border-accent/50'
                        }`}
                      >
                        <input
                          type="radio"
                          name="theme"
                          checked={!isDarkMode}
                          onChange={() => setDarkMode(false)}
                          className="sr-only"
                        />
                        <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-muted">
                          <Sun className="w-6 h-6 text-muted-foreground" />
                        </div>
                        <div>
                          <span className="block font-medium text-foreground">Licht</span>
                          <span className="block text-xs text-muted-foreground">Lichte achtergrond</span>
                        </div>
                      </label>

                      <label
                        className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                          isDarkMode
                            ? 'border-accent bg-accent-light'
                            : 'border-border hover:border-accent/50'
                        }`}
                      >
                        <input
                          type="radio"
                          name="theme"
                          checked={isDarkMode}
                          onChange={() => setDarkMode(true)}
                          className="sr-only"
                        />
                        <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-muted">
                          <Moon className="w-6 h-6 text-muted-foreground" />
                        </div>
                        <div>
                          <span className="block font-medium text-foreground">Donker</span>
                          <span className="block text-xs text-muted-foreground">Donkere achtergrond</span>
                        </div>
                      </label>

                      <div className="flex items-center gap-3 p-4 rounded-xl border-2 border-dashed border-border opacity-60">
                        <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-muted">
                          <Monitor className="w-6 h-6 text-muted-foreground" />
                        </div>
                        <div>
                          <span className="block font-medium text-foreground">Systeem</span>
                          <span className="block text-xs text-muted-foreground">Binnenkort</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'account' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-foreground mb-4">
                    Account
                  </h3>

                  <div className="p-4 rounded-xl border border-border bg-muted/50 mb-4">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center shrink-0">
                        <User className="w-7 h-7 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="font-medium text-foreground text-base">
                          {user?.email || 'Niet ingelogd'}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Persoonlijk account
                        </p>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-red-500 hover:bg-red-600 text-white font-medium transition-colors"
                  >
                    <LogOut className="w-5 h-5" />
                    Uitloggen
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
