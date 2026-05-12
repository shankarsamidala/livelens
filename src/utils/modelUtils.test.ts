import { describe, it, expect } from 'vitest';
import { getModelDisplayName, prettifyModelId, STANDARD_CLOUD_MODELS } from './modelUtils';

describe('prettifyModelId', () => {
    it('returns empty string for empty input', () => {
        expect(prettifyModelId('')).toBe('');
    });

    it('title-cases hyphen-separated ids', () => {
        expect(prettifyModelId('my-model-id')).toBe('My Model Id');
    });

    it('title-cases underscore-separated ids', () => {
        expect(prettifyModelId('some_model_name')).toBe('Some Model Name');
    });
});

describe('getModelDisplayName', () => {
    it('returns empty string for empty modelId', () => {
        expect(getModelDisplayName('')).toBe('');
    });

    it('strips "ollama-" prefix for ollama models', () => {
        expect(getModelDisplayName('ollama-llama3')).toBe('llama3');
    });

    it('returns static name for known model ids', () => {
        const geminiIds = STANDARD_CLOUD_MODELS.gemini.ids;
        const geminiNames = STANDARD_CLOUD_MODELS.gemini.names;
        expect(getModelDisplayName(geminiIds[0])).toBe(geminiNames[0]);
    });

    it('falls back to cloudModels list', () => {
        const cloudModels = [{ id: 'custom-cloud', name: 'Custom Cloud Model' }];
        expect(getModelDisplayName('custom-cloud', cloudModels)).toBe('Custom Cloud Model');
    });

    it('falls back to customProviders list', () => {
        const customProviders = [{ id: 'my-provider', name: 'My Provider' }];
        expect(getModelDisplayName('my-provider', [], customProviders)).toBe('My Provider');
    });

    it('prettifies unknown model ids as last resort', () => {
        expect(getModelDisplayName('unknown-model-xyz')).toBe('Unknown Model Xyz');
    });
});
