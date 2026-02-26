import { Slider } from '@nextui-org/react';
import { ProSettings, defaultLayoutSettings } from '@/types/geotag';
import { Settings2, RotateCcw } from 'lucide-react';

interface LayoutSettingsPanelProps {
    settings: ProSettings;
    onChange: (settings: ProSettings) => void;
}

export default function LayoutSettingsPanel({ settings, onChange }: LayoutSettingsPanelProps) {
    const ls = settings.layoutSettings || defaultLayoutSettings;

    const updateLs = (updates: Partial<typeof defaultLayoutSettings>) => {
        onChange({
            ...settings,
            layoutSettings: { ...ls, ...updates },
        });
    };

    const reset = () => {
        onChange({
            ...settings,
            layoutSettings: defaultLayoutSettings,
        });
    };

    return (
        <div className="card-elevated p-4 animate-fade-in space-y-6">
            <div className="flex items-center justify-between">
                <h3 className="section-title flex items-center gap-2 mb-0">
                    <Settings2 className="w-4 h-4 text-primary" />
                    Layout Editor
                </h3>
                <button
                    onClick={reset}
                    className="text-muted-foreground hover:text-primary transition-colors"
                    title="Reset ke Default"
                >
                    <RotateCcw className="w-4 h-4" />
                </button>
            </div>

            <div className="space-y-5">
                <Slider
                    label="InfoBox Height Ratio"
                    size="sm"
                    step={0.01}
                    minValue={0.1}
                    maxValue={0.5}
                    value={ls.infoBoxHeightRatio}
                    onChange={(val) => updateLs({ infoBoxHeightRatio: val as number })}
                    className="max-w-full"
                    renderValue={({ children }) => (
                        <span className="text-xs text-primary font-mono">{Number(children).toFixed(2)}</span>
                    )}
                />

                <Slider
                    label="Map Width Multiplier"
                    size="sm"
                    step={0.01}
                    minValue={0.5}
                    maxValue={2.0}
                    value={ls.miniMapWidthMultiplier}
                    onChange={(val) => updateLs({ miniMapWidthMultiplier: val as number })}
                    className="max-w-full"
                    renderValue={({ children }) => (
                        <span className="text-xs text-primary font-mono">{Number(children).toFixed(2)}</span>
                    )}
                />

                <div className="grid grid-cols-2 gap-4">
                    <Slider
                        label="Main Font"
                        size="sm"
                        step={1}
                        minValue={10}
                        maxValue={80}
                        value={ls.fontSizeTitle}
                        onChange={(val) => updateLs({ fontSizeTitle: val as number })}
                        className="max-w-full"
                        renderValue={({ children }) => (
                            <span className="text-xs text-primary font-mono">{children}</span>
                        )}
                    />
                    <Slider
                        label="Body Font"
                        size="sm"
                        step={1}
                        minValue={10}
                        maxValue={60}
                        value={ls.fontSizeBody}
                        onChange={(val) => updateLs({ fontSizeBody: val as number })}
                        className="max-w-full"
                        renderValue={({ children }) => (
                            <span className="text-xs text-primary font-mono">{children}</span>
                        )}
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <Slider
                        label="Line Height"
                        size="sm"
                        step={0.1}
                        minValue={1.0}
                        maxValue={2.0}
                        value={ls.lineHeight}
                        onChange={(val) => updateLs({ lineHeight: val as number })}
                        className="max-w-full"
                        renderValue={({ children }) => (
                            <span className="text-xs text-primary font-mono">{Number(children).toFixed(1)}</span>
                        )}
                    />
                    <Slider
                        label="Title-Body Gap"
                        size="sm"
                        step={1}
                        minValue={-20}
                        maxValue={20}
                        value={ls.titleBodyGap}
                        onChange={(val) => updateLs({ titleBodyGap: val as number })}
                        className="max-w-full"
                        renderValue={({ children }) => (
                            <span className="text-xs text-primary font-mono">{children}</span>
                        )}
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <Slider
                        label="Padding"
                        size="sm"
                        step={1}
                        minValue={0}
                        maxValue={40}
                        value={ls.padding}
                        onChange={(val) => updateLs({ padding: val as number })}
                        className="max-w-full"
                        renderValue={({ children }) => (
                            <span className="text-xs text-primary font-mono">{children}</span>
                        )}
                    />
                    <Slider
                        label="Margin"
                        size="sm"
                        step={1}
                        minValue={0}
                        maxValue={100}
                        value={ls.margin}
                        onChange={(val) => updateLs({ margin: val as number })}
                        className="max-w-full"
                        renderValue={({ children }) => (
                            <span className="text-xs text-primary font-mono">{children}</span>
                        )}
                    />
                </div>

                <Slider
                    label="Auto-Scale Limit (Max Growth)"
                    size="sm"
                    step={0.1}
                    minValue={1.0}
                    maxValue={4.0}
                    value={ls.currentScaleFactorStart}
                    onChange={(val) => updateLs({ currentScaleFactorStart: val as number })}
                    className="max-w-full"
                    renderValue={({ children }) => (
                        <span className="text-xs text-primary font-mono">{Number(children).toFixed(1)}x</span>
                    )}
                />
            </div>
        </div>
    );
}
