import { ProSettings, defaultLayoutSettings } from '@/types/geotag';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
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

            <div className="space-y-4">
                {/* Height Ratio */}
                <div className="space-y-2">
                    <div className="flex justify-between text-xs">
                        <Label>InfoBox Height Ratio</Label>
                        <span className="text-primary font-mono">{ls.infoBoxHeightRatio.toFixed(2)}</span>
                    </div>
                    <Slider
                        value={[ls.infoBoxHeightRatio]}
                        min={0.1}
                        max={0.5}
                        step={0.01}
                        onValueChange={([val]) => updateLs({ infoBoxHeightRatio: val })}
                    />
                </div>

                {/* Map Width */}
                <div className="space-y-2">
                    <div className="flex justify-between text-xs">
                        <Label>Map Width Multiplier</Label>
                        <span className="text-primary font-mono">{ls.miniMapWidthMultiplier.toFixed(2)}</span>
                    </div>
                    <Slider
                        value={[ls.miniMapWidthMultiplier]}
                        min={0.5}
                        max={2.0}
                        step={0.01}
                        onValueChange={([val]) => updateLs({ miniMapWidthMultiplier: val })}
                    />
                </div>

                {/* Font Sizes */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <div className="flex justify-between text-xs">
                            <Label>Main Font</Label>
                            <span className="text-primary font-mono">{ls.fontSizeTitle}</span>
                        </div>
                        <Slider
                            value={[ls.fontSizeTitle]}
                            min={10}
                            max={80}
                            step={1}
                            onValueChange={([val]) => updateLs({ fontSizeTitle: val })}
                        />
                    </div>
                    <div className="space-y-2">
                        <div className="flex justify-between text-xs">
                            <Label>Body Font</Label>
                            <span className="text-primary font-mono">{ls.fontSizeBody}</span>
                        </div>
                        <Slider
                            value={[ls.fontSizeBody]}
                            min={10}
                            max={60}
                            step={1}
                            onValueChange={([val]) => updateLs({ fontSizeBody: val })}
                        />
                    </div>
                </div>

                {/* Line Height & Gap */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <div className="flex justify-between text-xs">
                            <Label>Line Height</Label>
                            <span className="text-primary font-mono">{ls.lineHeight.toFixed(1)}</span>
                        </div>
                        <Slider
                            value={[ls.lineHeight]}
                            min={1.0}
                            max={2.0}
                            step={0.1}
                            onValueChange={([val]) => updateLs({ lineHeight: val })}
                        />
                    </div>
                    <div className="space-y-2">
                        <div className="flex justify-between text-xs">
                            <Label>Title-Body Gap</Label>
                            <span className="text-primary font-mono">{ls.titleBodyGap}</span>
                        </div>
                        <Slider
                            value={[ls.titleBodyGap]}
                            min={-20}
                            max={20}
                            step={1}
                            onValueChange={([val]) => updateLs({ titleBodyGap: val })}
                        />
                    </div>
                </div>

                {/* Padding & Margin */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <div className="flex justify-between text-xs">
                            <Label>Padding</Label>
                            <span className="text-primary font-mono">{ls.padding}</span>
                        </div>
                        <Slider
                            value={[ls.padding]}
                            min={0}
                            max={40}
                            step={1}
                            onValueChange={([val]) => updateLs({ padding: val })}
                        />
                    </div>
                    <div className="space-y-2">
                        <div className="flex justify-between text-xs">
                            <Label>Margin</Label>
                            <span className="text-primary font-mono">{ls.margin}</span>
                        </div>
                        <Slider
                            value={[ls.margin]}
                            min={0}
                            max={100}
                            step={1}
                            onValueChange={([val]) => updateLs({ margin: val })}
                        />
                    </div>
                </div>

                {/* Start Scale Factor */}
                <div className="space-y-2">
                    <div className="flex justify-between text-xs">
                        <Label>Auto-Scale Limit (Max Growth)</Label>
                        <span className="text-primary font-mono">{ls.currentScaleFactorStart.toFixed(1)}x</span>
                    </div>
                    <Slider
                        value={[ls.currentScaleFactorStart]}
                        min={1.0}
                        max={4.0}
                        step={0.1}
                        onValueChange={([val]) => updateLs({ currentScaleFactorStart: val })}
                    />
                </div>
            </div>
        </div>
    );
}
