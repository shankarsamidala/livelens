import React, { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { Check, Loader2 } from 'lucide-react';
import { STANDARD_CLOUD_MODELS, prettifyModelId } from '../utils/modelUtils';
import { useResolvedTheme } from '../hooks/useResolvedTheme';

interface ModelOption {
    id: string;
    name: string;
    type: 'cloud' | 'local' | 'custom' | 'ollama';
    provider?: string;
}

const PROVIDER_DOTS: Record<string, string> = {
    gemini:   '#4285F4',
    openai:   '#10a37f',
    groq:     '#f97316',
    claude:   '#c77dff',
    natively: '#83a6ff',
};

function ProviderDot({ provider, type }: { provider?: string; type: ModelOption['type'] }) {
    const isLocal = type === 'ollama' || type === 'local';
    const color = isLocal
        ? 'rgba(226,229,237,0.35)'
        : (provider ? (PROVIDER_DOTS[provider] ?? 'rgba(226,229,237,0.35)') : 'rgba(226,229,237,0.35)');
    return (
        <span style={{
            width: 6, height: 6, borderRadius: '50%',
            backgroundColor: color, flexShrink: 0, display: 'inline-block',
        }} />
    );
}

const ModelSelectorWindow = () => {
    const isLight = false; // always dark — floats over the dark overlay
    const [currentModel, setCurrentModel] = useState<string>(() => localStorage.getItem('cached-current-model') || '');
    const [availableModels, setAvailableModels] = useState<ModelOption[]>(() => {
        try {
            const cached = localStorage.getItem('cached-models');
            return cached ? JSON.parse(cached) : [];
        } catch { return []; }
    });
    const [isLoading, setIsLoading] = useState<boolean>(() => availableModels.length === 0);

    useEffect(() => {
        const loadModels = async () => {
            try {
                if (availableModels.length === 0) setIsLoading(true);

                const creds = await window.electronAPI?.getStoredCredentials?.();
                const customProviders = await window.electronAPI?.getCustomProviders?.() || [];

                let ollamaModels: string[] = [];
                try {
                    let oModels = await window.electronAPI?.getAvailableOllamaModels?.();
                    if (!oModels || oModels.length === 0) {
                        try {
                            // @ts-ignore
                            if (window.electronAPI?.forceRestartOllama) {
                                // @ts-ignore
                                await window.electronAPI.forceRestartOllama();
                                await new Promise(resolve => setTimeout(resolve, 1500));
                                oModels = await window.electronAPI?.getAvailableOllamaModels?.();
                            }
                        } catch (e) { console.warn("Retrying Ollama failed", e); }
                    }
                    if (oModels) ollamaModels = oModels;
                } catch (e) { /* ignore */ }

                const models: ModelOption[] = [];

                if (creds?.hasLiveLensKey) {
                    models.push({ id: 'natively', name: 'LiveLens API', type: 'cloud', provider: 'natively' });
                }

                for (const [prov, cfg] of Object.entries(STANDARD_CLOUD_MODELS)) {
                    if (!cfg.hasKeyCheck(creds)) continue;
                    cfg.ids.forEach((id, i) => {
                        models.push({ id, name: cfg.names[i], type: 'cloud', provider: prov });
                    });
                    const pm = creds?.[cfg.pmKey];
                    if (pm && !cfg.ids.includes(pm)) {
                        models.push({ id: pm, name: prettifyModelId(pm), type: 'cloud', provider: prov });
                    }
                }

                customProviders.forEach((p: any) => {
                    models.push({ id: p.id, name: p.name, type: 'custom' });
                });

                ollamaModels.forEach((m: string) => {
                    models.push({ id: `ollama-${m}`, name: m, type: 'ollama' });
                });

                localStorage.setItem('cached-models', JSON.stringify(models));
                setAvailableModels(models);

                const config = await window.electronAPI?.getCurrentLlmConfig?.();
                if (config && config.model) {
                    setCurrentModel(config.model);
                    localStorage.setItem('cached-current-model', config.model);
                }
            } catch (err) {
                console.error("Failed to load models:", err);
            } finally {
                setIsLoading(false);
            }
        };

        loadModels();
        window.addEventListener('focus', loadModels);

        const unsubscribe = window.electronAPI?.onModelChanged?.((modelId: string) => {
            setCurrentModel(modelId);
        });
        return () => {
            unsubscribe?.();
            window.removeEventListener('focus', loadModels);
        };
    }, []);

    const panelRef = useRef<HTMLDivElement>(null);

    useLayoutEffect(() => {
        if (!panelRef.current) return;
        const observer = new ResizeObserver((entries) => {
            for (const entry of entries) {
                const rect = entry.target.getBoundingClientRect();
                try {
                    window.electronAPI?.updateContentDimensions?.({
                        width: Math.ceil(rect.width),
                        height: Math.ceil(rect.height),
                    });
                } catch (e) { console.warn('ModelSelector resize failed', e); }
            }
        });
        observer.observe(panelRef.current);
        return () => observer.disconnect();
    }, []);

    const handleSelectFn = (modelId: string) => {
        setCurrentModel(modelId);
        localStorage.setItem('cached-current-model', modelId);
        window.electronAPI?.setModel(modelId)
            .catch((err: any) => console.error("Failed to set model:", err));
    };

    // Split models into cloud and local groups
    const cloudModels = availableModels.filter(m => m.type === 'cloud' || m.type === 'custom');
    const localModels = availableModels.filter(m => m.type === 'ollama' || m.type === 'local');

    // Light / dark tokens
    const panelBg     = isLight ? '#F3F4F6'                    : '#0d0f14';
    const panelBorder = isLight ? 'rgba(0,0,0,0.10)'           : 'rgba(255,255,255,0.09)';
    const panelShadow = 'none';

    const sectionHeaderColor  = isLight ? 'rgba(0,0,0,0.30)'           : 'rgba(226,229,237,0.25)';
    const rowNameColor        = isLight ? 'rgba(0,0,0,0.55)'           : 'rgba(226,229,237,0.65)';
    const rowNameHoverColor   = isLight ? 'rgba(0,0,0,0.85)'           : 'rgba(226,229,237,0.90)';
    const rowNameActiveColor  = isLight ? '#111'                        : '#e2e5ed';
    const rowHoverBg          = isLight ? 'rgba(0,0,0,0.04)'           : 'rgba(255,255,255,0.06)';
    const rowActiveBg         = isLight ? 'rgba(0,0,0,0.07)'           : 'rgba(255,255,255,0.09)';
    const rowActiveBorder     = isLight ? 'rgba(0,0,0,0.08)'           : 'rgba(255,255,255,0.08)';
    const dividerColor        = isLight ? 'rgba(0,0,0,0.07)'           : 'rgba(255,255,255,0.06)';
    const loadingColor        = isLight ? 'rgba(0,0,0,0.35)'           : 'rgba(226,229,237,0.40)';
    const emptyColor          = isLight ? 'rgba(0,0,0,0.35)'           : 'rgba(226,229,237,0.35)';
    const checkColor          = isLight ? 'rgba(0,0,0,0.50)'           : 'rgba(226,229,237,0.65)';

    const renderRow = (model: ModelOption) => {
        const isSelected = currentModel === model.id;
        return (
            <button
                key={model.id}
                onClick={() => handleSelectFn(model.id)}
                style={{
                    width: '100%',
                    textAlign: 'left',
                    padding: '7px 10px',
                    borderRadius: 9,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 8,
                    background: isSelected ? rowActiveBg : 'transparent',
                    border: isSelected ? `1px solid ${rowActiveBorder}` : '1px solid transparent',
                    cursor: 'pointer',
                    transition: 'background 0.12s',
                }}
                onMouseEnter={e => { if (!isSelected) (e.currentTarget as HTMLButtonElement).style.background = rowHoverBg; }}
                onMouseLeave={e => { if (!isSelected) (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
            >
                <span style={{ display: 'flex', alignItems: 'center', gap: 7, minWidth: 0, flex: 1 }}>
                    <ProviderDot provider={model.provider} type={model.type} />
                    <span style={{
                        fontSize: 12,
                        fontWeight: 500,
                        color: isSelected ? rowNameActiveColor : rowNameColor,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                    }}>
                        {model.name}
                    </span>
                </span>
                {isSelected && (
                    <Check style={{ width: 12, height: 12, flexShrink: 0, color: checkColor }} />
                )}
            </button>
        );
    };

    return (
        <div style={{ background: 'transparent' }}>
            <div
                ref={panelRef}
                style={{
                    width: 200,
                    maxHeight: 280,
                    borderRadius: 14,
                    overflow: 'hidden',
                    backgroundColor: panelBg,
                    border: `1px solid ${panelBorder}`,
                    boxShadow: panelShadow,
                    padding: 6,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 2,
                }}
            >
                {isLoading ? (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '14px 0', color: loadingColor, gap: 6 }}>
                        <Loader2 style={{ width: 14, height: 14 }} className="animate-spin" />
                        <span style={{ fontSize: 12 }}>Loading…</span>
                    </div>
                ) : availableModels.length === 0 ? (
                    <div style={{ padding: '12px 10px', textAlign: 'center', fontSize: 11.5, color: emptyColor, lineHeight: 1.5 }}>
                        No models connected.<br />Check Settings.
                    </div>
                ) : (
                    <div style={{ overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 1 }}>
                        {/* Cloud section */}
                        {cloudModels.length > 0 && (
                            <>
                                {localModels.length > 0 && (
                                    <div style={{ padding: '4px 10px 2px', fontSize: 9.5, fontWeight: 700, letterSpacing: '0.09em', textTransform: 'uppercase', color: sectionHeaderColor }}>
                                        Cloud
                                    </div>
                                )}
                                {cloudModels.map(renderRow)}
                            </>
                        )}

                        {/* Divider */}
                        {cloudModels.length > 0 && localModels.length > 0 && (
                            <div style={{ height: 1, background: dividerColor, margin: '3px 6px' }} />
                        )}

                        {/* Local section */}
                        {localModels.length > 0 && (
                            <>
                                {cloudModels.length > 0 && (
                                    <div style={{ padding: '4px 10px 2px', fontSize: 9.5, fontWeight: 700, letterSpacing: '0.09em', textTransform: 'uppercase', color: sectionHeaderColor }}>
                                        Local
                                    </div>
                                )}
                                {localModels.map(renderRow)}
                            </>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default ModelSelectorWindow;
