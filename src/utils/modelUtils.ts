export const STANDARD_CLOUD_MODELS: Record<
    string,
    {
        hasKeyCheck: (creds: any) => boolean;
        ids: string[];
        names: string[];
        descs: string[];
        pmKey: 'geminiPreferredModel' | 'openaiPreferredModel' | 'claudePreferredModel' | 'groqPreferredModel';
    }
> = {
    gemini: {
        hasKeyCheck: (creds) => !!creds?.hasGeminiKey,
        ids: ['gemini-3.1-flash-lite-preview', 'gemini-3.1-pro-preview'],
        names: ['Gemini 3.1 Flash', 'Gemini 3.1 Pro'],
        descs: ['Fastest • Multimodal', 'Reasoning • High Quality'],
        pmKey: 'geminiPreferredModel',
    },
    openai: {
        hasKeyCheck: (creds) => !!creds?.hasOpenaiKey,
        ids: ['gpt-5.4'],
        names: ['GPT 5.4'],
        descs: ['OpenAI'],
        pmKey: 'openaiPreferredModel',
    },
    claude: {
        hasKeyCheck: (creds) => !!creds?.hasClaudeKey,
        ids: ['claude-sonnet-4-6'],
        names: ['Sonnet 4.6'],
        descs: ['Anthropic'],
        pmKey: 'claudePreferredModel',
    },
    groq: {
        hasKeyCheck: (creds) => !!creds?.hasGroqKey,
        ids: ['llama-3.3-70b-versatile'],
        names: ['Groq Llama 3.3'],
        descs: ['Ultra Fast'],
        pmKey: 'groqPreferredModel',
    },
};

export const prettifyModelId = (id: string): string => {
    if (!id) return '';
    return id.replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
};

/** Static id→display-name map built from STANDARD_CLOUD_MODELS. */
const STATIC_NAME_MAP: Record<string, string> = Object.values(STANDARD_CLOUD_MODELS).reduce(
    (acc, provider) => {
        provider.ids.forEach((id, i) => {
            acc[id] = provider.names[i];
        });
        return acc;
    },
    {} as Record<string, string>
);

export interface ModelLike {
    id: string;
    name: string;
}

/**
 * Returns a human-readable display name for a model id.
 * Falls back to dynamic lists (cloudModels, customProviders) when provided,
 * and ultimately to prettifyModelId.
 */
export const getModelDisplayName = (
    modelId: string,
    cloudModels: ModelLike[] = [],
    customProviders: ModelLike[] = []
): string => {
    if (!modelId) return '';
    if (modelId.startsWith('ollama-')) return modelId.replace('ollama-', '');
    if (STATIC_NAME_MAP[modelId]) return STATIC_NAME_MAP[modelId];
    const cloud = cloudModels.find((m) => m.id === modelId);
    if (cloud) return cloud.name;
    const custom = customProviders.find((p) => p.id === modelId || p.name === modelId);
    if (custom) return custom.name;
    return prettifyModelId(modelId);
};
