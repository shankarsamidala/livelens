import { useState, useEffect } from 'react';

export interface SttInterviewerStatus {
    status: 'connected' | 'reconnecting' | 'failed';
    error: string;
    provider: string;
}

/**
 * Subscribes to the `onSttStatusChanged` IPC event and tracks the interviewer
 * channel STT connection state. Must be registered at mount (not inside
 * conditional effects) so events are never dropped during expand/collapse cycles.
 */
export function useSttStatus(): SttInterviewerStatus {
    const [status, setStatus] = useState<'connected' | 'reconnecting' | 'failed'>('connected');
    const [error, setError] = useState('');
    const [provider, setProvider] = useState('');

    useEffect(() => {
        return window.electronAPI.onSttStatusChanged((data) => {
            if (data.channel === 'interviewer') {
                setStatus(data.state);
                setProvider(data.provider);
                if (data.error) setError(data.error);
                if (data.state === 'connected') setError('');
            }
        });
    }, []);

    return { status, error, provider };
}
