import { Accordion, AccordionItem, Switch, ButtonGroup, Button } from '@nextui-org/react';
import { Settings } from 'lucide-react';
import type { ProSettings as ProSettingsType } from '@/types/geotag';

interface ProSettingsProps {
  settings: ProSettingsType;
  onChange: (s: ProSettingsType) => void;
}

export default function ProSettingsPanel({ settings, onChange }: ProSettingsProps) {
  return (
    <div className="card-elevated p-4 animate-fade-in">
      <Accordion
        isCompact
        defaultExpandedKeys={[]}
        className="-mx-2"
      >
        <AccordionItem
          key="pro-settings"
          aria-label="Pro Settings"
          title={
            <span className="flex items-center gap-2 text-sm font-semibold">
              <Settings className="w-4 h-4 text-primary" />
              Pro Settings
            </span>
          }
        >
          <div className="flex flex-col gap-4 pb-2">
            <Switch
              size="sm"
              isSelected={settings.showLatLong}
              onValueChange={(val) => onChange({ ...settings, showLatLong: val })}
            >
              Tampilkan Lat/Long
            </Switch>

            <Switch
              size="sm"
              isSelected={settings.showFullAddress}
              onValueChange={(val) => onChange({ ...settings, showFullAddress: val })}
            >
              Tampilkan Alamat Lengkap
            </Switch>

            <Switch
              size="sm"
              isSelected={settings.showPlusCode}
              onValueChange={(val) => onChange({ ...settings, showPlusCode: val })}
            >
              Tampilkan Plus Code
            </Switch>

            <Switch
              size="sm"
              isSelected={settings.use24hFormat}
              onValueChange={(val) => onChange({ ...settings, use24hFormat: val })}
            >
              Format 24 Jam
            </Switch>

            <div>
              <label className="text-sm text-foreground block mb-2">Tipe Peta</label>
              <ButtonGroup size="sm" fullWidth>
                <Button
                  variant={settings.mapType === 'satellite' ? 'solid' : 'flat'}
                  color={settings.mapType === 'satellite' ? 'primary' : 'default'}
                  onPress={() => onChange({ ...settings, mapType: 'satellite' })}
                >
                  Satelite
                </Button>
                <Button
                  variant={settings.mapType === 'roadmap' ? 'solid' : 'flat'}
                  color={settings.mapType === 'roadmap' ? 'primary' : 'default'}
                  onPress={() => onChange({ ...settings, mapType: 'roadmap' })}
                >
                  Normal
                </Button>
              </ButtonGroup>
            </div>
          </div>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
