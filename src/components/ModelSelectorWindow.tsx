import { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { Check, Loader2 } from 'lucide-react';
import { STANDARD_CLOUD_MODELS, prettifyModelId } from '../utils/modelUtils';


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
        <span className="w-1.5 h-1.5 rounded-full shrink-0 inline-block" style={{ backgroundColor: color }} />
    );
}

const ModelSelectorWindow = () => {
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
                            await window.electronAPI?.ensureOllamaRunning?.();
                            await new Promise(resolve => setTimeout(resolve, 1500));
                            oModels = await window.electronAPI?.getAvailableOllamaModels?.();
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

    const cloudModels = availableModels.filter(m => m.type === 'cloud' || m.type === 'custom');
    const localModels = availableModels.filter(m => m.type === 'ollama' || m.type === 'local');

    const renderRow = (model: ModelOption) => {
        const isSelected = currentModel === model.id;
        return (
            <button
                key={model.id}
                onClick={() => handleSelectFn(model.id)}
                className={`w-full text-left px-2.5 py-[7px] rounded-[9px] flex items-center justify-between gap-2 cursor-pointer transition-colors duration-[120ms] border ${
                    isSelected
                        ? 'bg-white/[0.09] border-white/[0.08]'
                        : 'bg-transparent border-transparent hover:bg-white/[0.06]'
                }`}
            >
                <span className="flex items-center gap-[7px] min-w-0 flex-1">
                    <ProviderDot provider={model.provider} type={model.type} />
                    <span className={`text-[12px] font-medium whitespace-nowrap overflow-hidden text-ellipsis ${isSelected ? 'text-[#e2e5ed]' : 'text-[rgba(226,229,237,0.65)]'}`}>
                        {model.name}
                    </span>
                </span>
                {isSelected && (
                    <Check size={12} className="shrink-0 text-[rgba(226,229,237,0.65)]" />
                )}
            </button>
        );
    };

    return (
        <div className="bg-transparent">
            <div
                ref={panelRef}
                className="w-[200px] max-h-[280px] rounded-[14px] overflow-hidden bg-bg-panel border border-white/[0.09] p-1.5 flex flex-col gap-0.5"
            >
                {isLoading ? (
                    <div className="flex items-center justify-center py-3.5 text-[rgba(226,229,237,0.40)] gap-1.5">
                        <Loader2 size={14} className="animate-spin" />
                        <span className="text-[12px]">Loading…</span>
                    </div>
                ) : availableModels.length === 0 ? (
                    <div className="px-2.5 py-3 text-center text-[11.5px] text-[rgba(226,229,237,0.35)] leading-[1.5]">
                        No models connected.<br />Check Settings.
                    </div>
                ) : (
                    <div className="overflow-y-auto flex flex-col gap-[1px]">
                        {/* Cloud section */}
                        {cloudModels.length > 0 && (
                            <>
                                {localModels.length > 0 && (
                                    <div className="px-2.5 pt-1 pb-0.5 text-[9.5px] font-bold tracking-[0.09em] uppercase text-[rgba(226,229,237,0.25)]">
                                        Cloud
                                    </div>
                                )}
                                {cloudModels.map(renderRow)}
                            </>
                        )}

                        {/* Divider */}
                        {cloudModels.length > 0 && localModels.length > 0 && (
                            <div className="h-px bg-white/[0.06] mx-1.5 my-[3px]" />
                        )}

                        {/* Local section */}
                        {localModels.length > 0 && (
                            <>
                                {cloudModels.length > 0 && (
                                    <div className="px-2.5 pt-1 pb-0.5 text-[9.5px] font-bold tracking-[0.09em] uppercase text-[rgba(226,229,237,0.25)]">
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
