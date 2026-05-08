import React, { useState, useEffect } from "react"
import { QueryClient, QueryClientProvider } from "react-query"
import { ToastProvider, ToastViewport } from "./components/ui/toast"
import LiveLensInterface from "./components/LiveLensInterface"
import SettingsPopup from "./components/SettingsPopup"
import Launcher from "./components/Launcher"
import ModelSelectorWindow from "./components/ModelSelectorWindow"
import StartupSequence from "./components/StartupSequence"
import { AnimatePresence, motion } from "framer-motion"
import UpdateBanner from "./components/UpdateBanner"
import { SupportToaster } from "./components/SupportToaster"
import { PermissionsToaster } from "./components/onboarding/PermissionsToaster"
import { OllamaSetupToaster } from "./components/onboarding/OllamaSetupToaster"
import { AlertCircle } from "lucide-react"
import { clampOverlayOpacity, OVERLAY_OPACITY_DEFAULT, getDefaultOverlayOpacity } from "./lib/overlayAppearance"
import { analytics } from "./lib/analytics/analytics.service"
import { ErrorBoundary } from "./components/ErrorBoundary"

const queryClient = new QueryClient()

const App: React.FC = () => {
  const isSettingsWindow = new URLSearchParams(window.location.search).get('window') === 'settings';
  const isLauncherWindow = new URLSearchParams(window.location.search).get('window') === 'launcher';
  const isOverlayWindow = new URLSearchParams(window.location.search).get('window') === 'overlay';
  const isModelSelectorWindow = new URLSearchParams(window.location.search).get('window') === 'model-selector';
  const isCropperWindow = new URLSearchParams(window.location.search).get('window') === 'cropper';
  const isCompactWindow = new URLSearchParams(window.location.search).get('window') === 'compact';

  const isDefault = !isSettingsWindow && !isOverlayWindow && !isModelSelectorWindow && !isCropperWindow && !isCompactWindow;

  if (isCropperWindow) {
    const Cropper = React.lazy(() => import('./components/Cropper'));
    return (
      <React.Suspense fallback={<div className="w-screen h-screen bg-transparent" />}>
        <Cropper />
      </React.Suspense>
    );
  }

  if (isCompactWindow) {
    const CompactMode = React.lazy(() => import('./components/CompactMode'));
    return (
      <React.Suspense fallback={<div className="w-screen h-screen bg-transparent" />}>
        <CompactMode />
      </React.Suspense>
    );
  }

  useEffect(() => {
    analytics.initAnalytics();
    if (isLauncherWindow || isDefault) analytics.trackAppOpen();
    if (isOverlayWindow) analytics.trackAssistantStart();

    const handleUnload = () => {
      if (isOverlayWindow) analytics.trackAssistantStop();
      if (isLauncherWindow || isDefault) analytics.trackAppClose();
    };
    window.addEventListener('beforeunload', handleUnload);
    return () => window.removeEventListener('beforeunload', handleUnload);
  }, [isLauncherWindow, isOverlayWindow, isDefault]);

  // State
  const [showStartup, setShowStartup] = useState(true);

  const [overlayOpacity, setOverlayOpacity] = useState<number>(() => {
    const stored = localStorage.getItem('natively_overlay_opacity');
    const parsed = stored ? parseFloat(stored) : NaN;
    const isUserSet = Number.isFinite(parsed) && parsed !== OVERLAY_OPACITY_DEFAULT;
    return isUserSet ? clampOverlayOpacity(parsed) : getDefaultOverlayOpacity();
  });

  const [ollamaPullStatus, setOllamaPullStatus] = useState<'idle' | 'downloading' | 'complete' | 'failed'>('idle');
  const [ollamaPullPercent, setOllamaPullPercent] = useState<number>(0);
  const [ollamaPullMessage, setOllamaPullMessage] = useState<string>('');

  const [incompatibleWarning, setIncompatibleWarning] = useState<{count: number; oldProvider: string; newProvider: string} | null>(null);

  const [showPermissionsToaster, setShowPermissionsToaster] = useState(false);
  const [showOllamaSetup, setShowOllamaSetup] = useState(false);

  useEffect(() => {
    localStorage.removeItem('useLegacyAudioBackend');

    // Onboarding toasters
    if (isLauncherWindow || isDefault) {
      const permsShown = localStorage.getItem('natively_perms_shown_v1');
      const ollamaDone = localStorage.getItem('natively_ollama_setup_done');
      if (!permsShown) {
        setShowPermissionsToaster(true);
      } else if (!ollamaDone) {
        setShowOllamaSetup(true);
      }
    }

    // Ollama auto-pull progress
    let removeProgress: (() => void) | undefined;
    let removeComplete: (() => void) | undefined;
    if (window.electronAPI?.onOllamaPullProgress && window.electronAPI?.onOllamaPullComplete) {
      removeProgress = window.electronAPI.onOllamaPullProgress((data) => {
        setOllamaPullStatus('downloading');
        setOllamaPullPercent(data.percent || 0);
        setOllamaPullMessage(data.status || 'Downloading...');
      });
      removeComplete = window.electronAPI.onOllamaPullComplete(() => {
        setOllamaPullStatus('complete');
        setOllamaPullMessage('Local AI memory ready');
        setOllamaPullPercent(100);
        setTimeout(() => setOllamaPullStatus('idle'), 3000);
      });
    }

    let removeWarning: (() => void) | undefined;
    if (window.electronAPI?.onIncompatibleProviderWarning) {
      removeWarning = window.electronAPI.onIncompatibleProviderWarning((data) => {
        setIncompatibleWarning(data);
      });
    }

    return () => {
      if (removeProgress) removeProgress();
      if (removeComplete) removeComplete();
      if (removeWarning) removeWarning();
    };
  }, []);

  // Overlay opacity sync
  useEffect(() => {
    if (!isOverlayWindow) return;
    const removeOpacityListener = window.electronAPI?.onOverlayOpacityChanged?.((opacity) => {
      setOverlayOpacity(opacity);
    });
    return () => { if (removeOpacityListener) removeOpacityListener(); };
  }, [isOverlayWindow]);

  useEffect(() => {
    if (!isOverlayWindow || !window.electronAPI?.onThemeChanged) return;
    return window.electronAPI.onThemeChanged(() => {
      const stored = localStorage.getItem('natively_overlay_opacity');
      if (!stored) setOverlayOpacity(getDefaultOverlayOpacity());
    });
  }, [isOverlayWindow]);

  const handleReindex = async () => {
    if (window.electronAPI?.reindexIncompatibleMeetings) {
      setIncompatibleWarning(null);
      await window.electronAPI.reindexIncompatibleMeetings();
    }
  };

  const handleStartMeeting = async () => {
    try {
      localStorage.setItem('natively_last_meeting_start', Date.now().toString());
      const inputDeviceId = localStorage.getItem('preferredInputDeviceId');
      let outputDeviceId = localStorage.getItem('preferredOutputDeviceId');
      const useExperimentalSck = localStorage.getItem('useExperimentalSckBackend') === 'true';

      if (useExperimentalSck) {
        outputDeviceId = "sck";
      }

      const result = await window.electronAPI.startMeeting({
        audio: { inputDeviceId, outputDeviceId }
      });
      if (result.success) {
        analytics.trackMeetingStarted();
        await window.electronAPI.setWindowMode('overlay');
      } else {
        console.error("Failed to start meeting:", result.error);
      }
    } catch (err) {
      console.error("Failed to start meeting:", err);
    }
  };

  const handleEndMeeting = async () => {
    analytics.trackMeetingEnded();
    try {
      await window.electronAPI.endMeeting();
      localStorage.removeItem('natively_last_meeting_start');
      await window.electronAPI.setWindowMode('launcher');
    } catch (err) {
      console.error("Failed to end meeting:", err);
      window.electronAPI.setWindowMode('launcher');
    }
  };

  // ── Settings popup window ──
  if (isSettingsWindow) {
    return (
      <ErrorBoundary context="SettingsPopup">
        <div style={{ background: 'transparent' }} className="h-full min-h-0 w-full">
          <QueryClientProvider client={queryClient}>
            <ToastProvider>
              <SettingsPopup />
              <ToastViewport />
            </ToastProvider>
          </QueryClientProvider>
        </div>
      </ErrorBoundary>
    );
  }

  // ── Model selector window ──
  if (isModelSelectorWindow) {
    return (
      <ErrorBoundary context="ModelSelector">
        <div style={{ background: 'transparent' }} className="h-full min-h-0 w-full overflow-hidden">
          <QueryClientProvider client={queryClient}>
            <ToastProvider>
              <ModelSelectorWindow />
              <ToastViewport />
            </ToastProvider>
          </QueryClientProvider>
        </div>
      </ErrorBoundary>
    );
  }

  // ── Overlay window ──
  if (isOverlayWindow) {
    return (
      <ErrorBoundary context="Overlay">
        <div className="w-full relative bg-transparent">
          <QueryClientProvider client={queryClient}>
            <ToastProvider>
              <div
                style={{
                  ['--overlay-opacity' as '--overlay-opacity']: String(overlayOpacity),
                  transition: 'background-color 75ms ease, border-color 75ms ease, box-shadow 75ms ease'
                } as React.CSSProperties}
              >
                <LiveLensInterface
                  onEndMeeting={handleEndMeeting}
                  overlayOpacity={overlayOpacity}
                />
              </div>
              <ToastViewport />
            </ToastProvider>
          </QueryClientProvider>
        </div>
      </ErrorBoundary>
    );
  }

  // ── Launcher window ──
  return (
    <ErrorBoundary context="Launcher">
    <div className="h-full min-h-0 w-full relative bg-[#000000]">
      <AnimatePresence>
        {showStartup ? (
          <motion.div
            key="startup"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 1.1, pointerEvents: "none", transition: { duration: 0.6, ease: "easeInOut" } }}
          >
            <StartupSequence onComplete={() => setShowStartup(false)} />
          </motion.div>
        ) : (
          <motion.div
            key="main"
            className="h-full w-full"
            initial={{ opacity: 0, scale: 0.98, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.19, 1, 0.22, 1], delay: 0.1 }}
          >
            <QueryClientProvider client={queryClient}>
              <ToastProvider>
                <div id="launcher-container" className="h-full w-full relative">
                  <Launcher
                    onStartMeeting={handleStartMeeting}
                    ollamaPullStatus={ollamaPullStatus}
                    ollamaPullPercent={ollamaPullPercent}
                    ollamaPullMessage={ollamaPullMessage}
                  />
                </div>
                <ToastViewport />
              </ToastProvider>
            </QueryClientProvider>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {incompatibleWarning && isDefault && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed bottom-6 right-6 z-50 pointer-events-auto"
          >
            <div className="bg-[#1A1A1A] border border-[#ff3333]/30 shadow-2xl rounded-2xl p-5 max-w-[340px] flex flex-col gap-3">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-[#ff3333] shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-[#E0E0E0] font-medium text-sm">Provider Changed</h3>
                  <p className="text-[#A0A0A0] text-xs mt-1 leading-relaxed">
                    ⚠ {incompatibleWarning.count} meetings used your previous AI provider ({incompatibleWarning.oldProvider}) and won't appear in search results under {incompatibleWarning.newProvider}.
                  </p>
                </div>
              </div>
              <div className="flex gap-2 mt-1 justify-end">
                <button
                  onClick={() => setIncompatibleWarning(null)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium text-[#A0A0A0] hover:text-white hover:bg-white/5 transition-colors"
                >
                  Dismiss
                </button>
                <button
                  onClick={handleReindex}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#ff3333]/10 text-[#ff3333] hover:bg-[#ff3333]/20 transition-colors"
                >
                  Re-index automatically
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <UpdateBanner />
      <SupportToaster />

      <PermissionsToaster
        isOpen={showPermissionsToaster}
        onDismiss={() => {
          localStorage.setItem('natively_perms_shown_v1', '1');
          setShowPermissionsToaster(false);
          const ollamaDone = localStorage.getItem('natively_ollama_setup_done');
          if (!ollamaDone) setShowOllamaSetup(true);
        }}
      />

      <OllamaSetupToaster
        isOpen={showOllamaSetup}
        onDismiss={() => setShowOllamaSetup(false)}
        onUseProviders={() => {
          setShowOllamaSetup(false);
          window.electronAPI?.openSettingsTab?.('ai-providers');
        }}
      />
    </div>
    </ErrorBoundary>
  )
}

export default App
