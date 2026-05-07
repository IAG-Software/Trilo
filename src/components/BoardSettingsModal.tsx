'use client'

import React, { useState, useEffect } from 'react';
import { 
  Modal, 
  ModalContent, 
  ModalHeader, 
  ModalBody, 
  ModalFooter, 
  Button, 
  Input, 
  Textarea,
  Switch,
  Slider,
  Divider,
  Tabs,
  Tab,
  Card,
  CardBody
} from '@nextui-org/react';
import { 
  Settings, 
  Layout, 
  Palette, 
  Zap, 
  Trash2, 
  Save, 
  X,
  Sliders,
  Type,
  Eye,
  Sparkles,
  Columns
} from 'lucide-react';
import { BACKGROUNDS } from '@/lib/constants';

interface BoardSettings {
  description?: string;
  columnWidth?: number;
  cardGap?: number;
  compactMode?: boolean;
  showPriority?: boolean;
  enableAISuggestions?: boolean;
  glassIntensity?: number;
}

interface BoardSettingsModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  boardId: string;
  boardTitle: string;
  currentSettings: BoardSettings;
  currentWallpaperIndex: number | null;
  onSave: (title: string, settings: BoardSettings, wallpaperIndex: number | null) => void;
  onDelete: () => void;
}

const BoardSettingsModal: React.FC<BoardSettingsModalProps> = ({
  isOpen,
  onOpenChange,
  boardId,
  boardTitle,
  currentSettings,
  currentWallpaperIndex,
  onSave,
  onDelete
}) => {
  const [title, setTitle] = useState(boardTitle);
  const [settings, setSettings] = useState<BoardSettings>(currentSettings);
  const [wallpaperIndex, setWallpaperIndex] = useState<number | null>(currentWallpaperIndex);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setTitle(boardTitle);
    setSettings(currentSettings);
    setWallpaperIndex(currentWallpaperIndex);
  }, [boardTitle, currentSettings, currentWallpaperIndex, isOpen]);

  const handleSave = async () => {
    setIsSaving(true);
    await onSave(title, settings, wallpaperIndex);
    setIsSaving(false);
    onOpenChange(false);
  };

  const updateSetting = (key: keyof BoardSettings, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  return (
    <Modal 
      isOpen={isOpen} 
      onOpenChange={onOpenChange}
      size="3xl"
      scrollBehavior="inside"
      backdrop="blur"
      className="glass-panel border border-white/10 rounded-[32px] overflow-hidden"
      classNames={{
        base: "bg-[#0a0a0a]/90 backdrop-blur-3xl text-white",
        header: "border-b border-white/5 p-6",
        body: "p-0",
        footer: "border-t border-white/5 p-6"
      }}
    >
      <ModalContent>
        {(onClose) => (
          <>
            <ModalHeader className="flex flex-col gap-1">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400">
                  <Settings size={20} />
                </div>
                <div>
                  <h2 className="text-xl font-bold">Board Settings</h2>
                  <p className="text-xs text-white/40 font-normal">Customize "{boardTitle}" to fit your workflow</p>
                </div>
              </div>
            </ModalHeader>
            <ModalBody>
              <Tabs 
                aria-label="Board Settings Tabs" 
                variant="underlined"
                fullWidth
                classNames={{
                  base: "w-full",
                  tabList: "gap-6 relative rounded-none p-0 border-b border-white/5 px-6",
                  cursor: "w-full bg-blue-500",
                  tab: "max-w-fit px-4 h-14",
                  tabContent: "group-data-[selected=true]:text-white font-bold text-white/40"
                }}
              >
                <Tab 
                  key="general" 
                  title={
                    <div className="flex items-center gap-2">
                      <Type size={16} />
                      <span>Identity</span>
                    </div>
                  }
                >
                  <div className="p-8 space-y-8">
                    <div className="space-y-6">
                      <Input 
                        label="Board Title"
                        labelPlacement="outside"
                        placeholder="Enter board name..."
                        variant="bordered"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        classNames={{
                          input: "text-white text-lg font-semibold",
                          label: "text-white/40 font-medium mb-2",
                          inputWrapper: "h-14 bg-white/[0.03] border-white/10 hover:border-white/20 focus-within:border-blue-500/50 px-4"
                        }}
                      />
                      <Textarea 
                        label="Description"
                        labelPlacement="outside"
                        placeholder="What's this board about?"
                        variant="bordered"
                        value={settings.description || ''}
                        onChange={(e) => updateSetting('description', e.target.value)}
                        classNames={{
                          input: "text-white/80",
                          label: "text-white/40 font-medium mb-2",
                          inputWrapper: "bg-white/[0.03] border-white/10 hover:border-white/20 focus-within:border-blue-500/50 px-4"
                        }}
                      />
                    </div>

                    <Divider className="bg-white/5" />

                    <div className="space-y-4">
                      <h4 className="text-sm font-bold text-red-400/60 uppercase tracking-widest flex items-center gap-2">
                        <Trash2 size={14} />
                        Danger Zone
                      </h4>
                      <Card className="bg-red-500/5 border border-red-500/10 shadow-none rounded-2xl">
                        <CardBody className="p-5 flex flex-row items-center justify-between">
                          <div>
                            <p className="text-sm font-bold text-white">Delete this board</p>
                            <p className="text-xs text-white/40">This will permanently remove all tasks and columns.</p>
                          </div>
                          <Button 
                            color="danger" 
                            variant="flat" 
                            size="sm" 
                            className="font-bold rounded-xl"
                            onPress={onDelete}
                          >
                            Delete Board
                          </Button>
                        </CardBody>
                      </Card>
                    </div>
                  </div>
                </Tab>

                <Tab 
                  key="layout" 
                  title={
                    <div className="flex items-center gap-2">
                      <Layout size={16} />
                      <span>Layout</span>
                    </div>
                  }
                >
                  <div className="p-8 space-y-10">
                    <div className="grid grid-cols-1 gap-10">
                      <div className="space-y-6">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/10">
                              <Columns size={20} />
                            </div>
                            <div>
                              <h4 className="text-base font-bold text-white">Column Width</h4>
                              <p className="text-xs text-white/40">Adjust the width of lists on the board.</p>
                            </div>
                          </div>
                          <div className="w-48">
                            <Slider 
                              size="sm"
                              step={10} 
                              maxValue={500} 
                              minValue={200} 
                              defaultValue={settings.columnWidth || 280}
                              onChange={(val) => updateSetting('columnWidth', val)}
                              classNames={{
                                thumb: "bg-white border-2 border-purple-500",
                                filler: "bg-purple-500"
                              }}
                            />
                          </div>
                        </div>

                        <Divider className="bg-white/5" />

                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/10">
                              <Sliders size={20} />
                            </div>
                            <div>
                              <h4 className="text-base font-bold text-white">Card Spacing</h4>
                              <p className="text-xs text-white/40">Vertical gap between task cards.</p>
                            </div>
                          </div>
                          <div className="w-48">
                            <Slider 
                              size="sm"
                              step={2} 
                              maxValue={20} 
                              minValue={4} 
                              defaultValue={settings.cardGap || 8}
                              onChange={(val) => updateSetting('cardGap', val)}
                            />
                          </div>
                        </div>

                        <Divider className="bg-white/5" />

                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/10">
                              <Eye size={20} />
                            </div>
                            <div>
                              <h4 className="text-base font-bold text-white">Priority Indicators</h4>
                              <p className="text-xs text-white/40">Show colored priority bars on cards.</p>
                            </div>
                          </div>
                          <Switch 
                            isSelected={settings.showPriority !== false}
                            onValueChange={(val) => updateSetting('showPriority', val)}
                          />
                        </div>

                        <Divider className="bg-white/5" />

                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/10">
                              <Zap size={20} />
                            </div>
                            <div>
                              <h4 className="text-base font-bold text-white">Compact Mode</h4>
                              <p className="text-xs text-white/40">Smaller cards with tighter typography.</p>
                            </div>
                          </div>
                          <Switch 
                            isSelected={settings.compactMode || false}
                            onValueChange={(val) => updateSetting('compactMode', val)}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </Tab>

                <Tab 
                  key="appearance" 
                  title={
                    <div className="flex items-center gap-2">
                      <Palette size={16} />
                      <span>Appearance</span>
                    </div>
                  }
                >
                  <div className="p-8 space-y-8">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-bold text-white/60 uppercase tracking-widest">Board Wallpaper</h4>
                        <Button 
                          size="sm" 
                          variant="light" 
                          className="text-xs text-blue-400"
                          onPress={() => setWallpaperIndex(null)}
                        >
                          Use Global Default
                        </Button>
                      </div>
                      <div className="grid grid-cols-4 gap-4">
                        {BACKGROUNDS.map((bg, i) => (
                          <div 
                            key={i}
                            onClick={() => setWallpaperIndex(i)}
                            className={`relative aspect-video rounded-xl overflow-hidden cursor-pointer border-2 transition-all ${
                              wallpaperIndex === i ? 'border-blue-500 ring-4 ring-blue-500/20' : 'border-white/5 hover:border-white/20'
                            }`}
                          >
                            <img src={bg} className="w-full h-full object-cover" alt={`Bg ${i}`} />
                            {wallpaperIndex === i && (
                              <div className="absolute inset-0 bg-blue-500/20 flex items-center justify-center">
                                <Palette size={20} className="text-white" />
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    <Divider className="bg-white/5" />

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/10">
                          <Sparkles size={20} />
                        </div>
                        <div>
                          <h4 className="text-base font-bold text-white">Enable AI Suggestions</h4>
                          <p className="text-xs text-white/40">Show AI help button on lists.</p>
                        </div>
                      </div>
                      <Switch 
                        isSelected={settings.enableAISuggestions !== false}
                        onValueChange={(val) => updateSetting('enableAISuggestions', val)}
                      />
                    </div>
                  </div>
                </Tab>
              </Tabs>
            </ModalBody>
            <ModalFooter>
              <Button variant="light" onPress={onClose} className="text-white/60 rounded-2xl h-12 px-6">
                Cancel
              </Button>
              <Button 
                color="primary" 
                className="font-bold rounded-2xl h-12 px-8 shadow-xl shadow-blue-500/20"
                startContent={<Save size={18} />}
                isLoading={isSaving}
                onPress={handleSave}
              >
                Save Settings
              </Button>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
};

export default BoardSettingsModal;
