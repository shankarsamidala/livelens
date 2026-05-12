import React from 'react';
import {
    Eye,
    PointerOff,
    MessageSquare,
    Camera,
    Crop,
    RotateCcw,
    Sparkles,
    Mic,
    Zap,
    ArrowUp,
    ArrowDown,
    ArrowLeft,
    ArrowRight,
    RefreshCw,
} from 'lucide-react';
import { KeyRecorder } from '../ui/KeyRecorder';
import { ShortcutConfig } from '../../hooks/useShortcuts';

interface KeybindsTabProps {
    shortcuts: ShortcutConfig;
    updateShortcut: (actionId: keyof ShortcutConfig, keys: string[]) => void;
    resetShortcuts: () => void;
}

export const KeybindsTab: React.FC<KeybindsTabProps> = ({ shortcuts, updateShortcut, resetShortcuts }) => {
    const row = (icon: React.ReactNode, label: string, id: keyof ShortcutConfig) => (
        <div className="flex items-center justify-between px-4 py-[10px] rounded-[10px] bg-white/[0.03] border border-white/[0.07] group">
            <div className="flex items-center gap-3">
                <span className="text-text-tertiary group-hover:text-text-primary transition-colors w-5 flex justify-center">
                    {icon}
                </span>
                <span className="text-sm text-text-secondary font-medium group-hover:text-text-primary transition-colors">
                    {label}
                </span>
            </div>
            <KeyRecorder
                currentKeys={shortcuts[id]}
                onSave={(keys) => updateShortcut(id, keys)}
            />
        </div>
    );

    return (
        <div className="space-y-5 animated fadeIn select-text pb-4">
            <div className="flex items-start justify-between">
                <div>
                    <h3 className="text-[18px] font-semibold text-[#e2e5ed] tracking-[-0.02em] mb-[6px]">
                        Shortcuts
                    </h3>
                    <p className="text-[12.5px] text-[#e2e5ed]/38 leading-[1.5]">
                        Click any shortcut to remap it.
                    </p>
                </div>
                <button
                    onClick={resetShortcuts}
                    className="flex items-center gap-2 px-4 py-1.5 rounded-full border border-white/[0.07] bg-white/[0.03] hover:bg-white/[0.06] transition-all duration-200 text-[12px] font-medium text-[#e2e5ed]/50 hover:text-[#e2e5ed]/80 active:scale-95 mt-1"
                >
                    <RotateCcw size={13} strokeWidth={2.5} />
                    Restore Default
                </button>
            </div>

            <div className="grid gap-6">
                {/* General Category */}
                <div>
                    <h4 className="text-[13px] font-semibold text-[#e2e5ed]/70 mb-3">General</h4>
                    <div className="space-y-2">
                        {row(<Eye size={14} />, 'Toggle Visibility', 'toggleVisibility')}
                        {row(<PointerOff size={14} />, 'Toggle Mouse Passthrough', 'toggleMousePassthrough')}
                        {row(<MessageSquare size={14} />, 'Process Screenshots', 'processScreenshots')}
                        {row(<Sparkles size={14} />, 'Capture Screen & Ask AI', 'captureAndProcess')}
                        {row(<RotateCcw size={14} />, 'Reset / Cancel', 'resetCancel')}
                        {row(<Camera size={14} />, 'Take Screenshot', 'takeScreenshot')}
                        {row(<Crop size={14} />, 'Selective Screenshot', 'selectiveScreenshot')}
                    </div>
                </div>

                {/* Chat Category */}
                <div>
                    <h4 className="text-[13px] font-semibold text-[#e2e5ed]/70 mb-3">Chat</h4>
                    <div className="space-y-2">
                        {(
                            [
                                { id: 'whatToAnswer', label: 'What to Answer', icon: <Sparkles size={14} /> },
                                { id: 'clarify', label: 'Clarify', icon: <MessageSquare size={14} /> },
                                { id: 'followUp', label: 'Follow Up', icon: <MessageSquare size={14} /> },
                                { id: 'dynamicAction4', label: 'Recap / Brainstorm', icon: <RefreshCw size={14} /> },
                                { id: 'answer', label: 'Answer / Record', icon: <Mic size={14} /> },
                                { id: 'codeHint', label: 'Get Code Hint', icon: <Zap size={14} /> },
                                { id: 'brainstorm', label: 'Brainstorm Approaches', icon: <Zap size={14} /> },
                                { id: 'scrollUp', label: 'Scroll Up', icon: <ArrowUp size={14} /> },
                                { id: 'scrollDown', label: 'Scroll Down', icon: <ArrowDown size={14} /> },
                            ] as { id: keyof ShortcutConfig; label: string; icon: React.ReactNode }[]
                        ).map((item) => (
                            <div
                                key={item.id}
                                className="flex items-center justify-between px-4 py-[10px] rounded-[10px] bg-white/[0.03] border border-white/[0.07] group"
                            >
                                <div className="flex items-center gap-3">
                                    <span className="text-text-tertiary group-hover:text-text-primary transition-colors w-5 flex justify-center">
                                        {item.icon}
                                    </span>
                                    <span className="text-sm text-text-secondary font-medium group-hover:text-text-primary transition-colors">
                                        {item.label}
                                    </span>
                                </div>
                                <KeyRecorder
                                    currentKeys={shortcuts[item.id]}
                                    onSave={(keys) => updateShortcut(item.id, keys)}
                                />
                            </div>
                        ))}
                    </div>
                </div>

                {/* Window Category */}
                <div>
                    <h4 className="text-[13px] font-semibold text-[#e2e5ed]/70 mb-3">Window</h4>
                    <div className="space-y-2">
                        {(
                            [
                                { id: 'moveWindowUp', label: 'Move Window Up', icon: <ArrowUp size={14} /> },
                                { id: 'moveWindowDown', label: 'Move Window Down', icon: <ArrowDown size={14} /> },
                                { id: 'moveWindowLeft', label: 'Move Window Left', icon: <ArrowLeft size={14} /> },
                                { id: 'moveWindowRight', label: 'Move Window Right', icon: <ArrowRight size={14} /> },
                            ] as { id: keyof ShortcutConfig; label: string; icon: React.ReactNode }[]
                        ).map((item) => (
                            <div
                                key={item.id}
                                className="flex items-center justify-between px-4 py-[10px] rounded-[10px] bg-white/[0.03] border border-white/[0.07] group"
                            >
                                <div className="flex items-center gap-3">
                                    <span className="text-text-tertiary group-hover:text-text-primary transition-colors w-5 flex justify-center">
                                        {item.icon}
                                    </span>
                                    <span className="text-sm text-text-secondary font-medium group-hover:text-text-primary transition-colors">
                                        {item.label}
                                    </span>
                                </div>
                                <KeyRecorder
                                    currentKeys={shortcuts[item.id]}
                                    onSave={(keys) => updateShortcut(item.id, keys)}
                                />
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};
