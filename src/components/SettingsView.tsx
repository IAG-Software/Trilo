'use client'

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  User, 
  Bell, 
  Lock, 
  Palette, 
  Monitor, 
  Cloud, 
  Shield, 
  HelpCircle,
  ChevronRight,
  Globe,
  Database,
  Check,
  RotateCcw,
  Layout,
  Eye,
  EyeOff,
  Zap,
  Download,
  Upload,
  Keyboard,
  Info,
  ExternalLink,
  Command,
  ArrowUp,
  ArrowDown,
  CornerDownLeft,
  X,
  Search,
  Settings,
  Sparkles,
  CreditCard,
  LogOut,
  Moon,
  Sun,
  Laptop
} from 'lucide-react';
import { 
  Card, 
  CardBody, 
  Button, 
  Switch, 
  Divider, 
  Avatar, 
  Input, 
  Tooltip,
  Tabs,
  Tab,
  Slider,
  Select,
  SelectItem,
  Badge,
  Kbd,
  ScrollShadow
} from '@nextui-org/react';

interface SettingsViewProps {
  onUpdateName: (name: string) => void;
  onUpdateBg: (index: number) => void;
  currentName: string;
  currentBg: number;
}

import { BACKGROUNDS } from '@/lib/constants';

const SettingsView: React.FC<SettingsViewProps> = ({ onUpdateName, onUpdateBg, currentName, currentBg }) => {
  const [activeTab, setActiveTab] = useState('account');
  const [searchQuery, setSearchQuery] = useState('');
  const [tempName, setTempName] = useState(currentName);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success'>('idle');
  
  // Local states for UI settings (synced with DB)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [glassIntensity, setGlassIntensity] = useState(12);
  const [language, setLanguage] = useState('english');

  useEffect(() => {
    const loadSettings = async () => {
      try {
        // @ts-ignore
        const res = await window.electronAPI.cgiCall('get-setting', { key: 'sidebarCollapsed' });
        if (res !== null) setSidebarCollapsed(res === 'true');
        
        // @ts-ignore
        const res2 = await window.electronAPI.cgiCall('get-setting', { key: 'notificationsEnabled' });
        if (res2 !== null) setNotificationsEnabled(res2 === 'true');

        // @ts-ignore
        const res3 = await window.electronAPI.cgiCall('get-setting', { key: 'glassIntensity' });
        if (res3 !== null) setGlassIntensity(parseInt(res3));
      } catch (err) {
        console.error('Failed to load extra settings:', err);
      }
    };
    loadSettings();
  }, []);

  const handleSaveSetting = async (key: string, value: any) => {
    try {
      // @ts-ignore
      await window.electronAPI.cgiCall('save-setting', { key, value: String(value) });
    } catch (err) {
      console.error(`Failed to save setting ${key}:`, err);
    }
  };

  const handleSaveName = async () => {
    setIsSaving(true);
    try {
      // @ts-ignore
      await window.electronAPI.cgiCall('save-setting', { key: 'userName', value: tempName });
      onUpdateName(tempName);
      setSaveStatus('success');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (err) {
      console.error('Failed to save name:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleBgSelect = async (index: number) => {
    try {
      // @ts-ignore
      await window.electronAPI.cgiCall('save-setting', { key: 'bgIndex', value: String(index) });
      onUpdateBg(index);
    } catch (err) {
      console.error('Failed to save background:', err);
    }
  };

  const handleResetDb = async () => {
    if (confirm('Are you sure you want to reset the entire database? This will delete all boards, columns, and tasks.')) {
      try {
        // @ts-ignore
        await window.electronAPI.cgiCall('reset-db', {});
        window.location.reload();
      } catch (err) {
        console.error('Failed to reset database:', err);
      }
    }
  };

  const handleExportData = async () => {
    try {
      // @ts-ignore
      const boards = await window.electronAPI.cgiCall('get-boards', {});
      const data = {
        version: '0.1.0',
        timestamp: new Date().toISOString(),
        boards: boards
      };
      
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `trilo-export-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to export data:', err);
    }
  };

  const handleImportData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const content = event.target?.result as string;
        const data = JSON.parse(content);
        if (data.boards) {
          alert('Successfully parsed ' + data.boards.length + ' boards. Feature to merge data is coming in the next update!');
        }
      } catch (err) {
        alert('Failed to parse import file.');
      }
    };
    reader.readAsText(file);
  };

  const categories = [
    { id: 'account', label: 'Account', icon: User, color: 'text-blue-400' },
    { id: 'appearance', label: 'Appearance', icon: Palette, color: 'text-purple-400' },
    { id: 'notifications', label: 'Notifications', icon: Bell, color: 'text-amber-400' },
    { id: 'data', label: 'Data & Privacy', icon: Database, color: 'text-emerald-400' },
    { id: 'shortcuts', label: 'Shortcuts', icon: Keyboard, color: 'text-rose-400' },
    { id: 'about', label: 'About', icon: Info, color: 'text-sky-400' },
  ];

  const filteredCategories = useMemo(() => {
    if (!searchQuery) return categories;
    return categories.filter(cat => cat.label.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [searchQuery]);

  const containerVariants = {
    hidden: { opacity: 0, x: 20 },
    visible: { 
      opacity: 1, 
      x: 0,
      transition: { 
        duration: 0.4, 
        staggerChildren: 0.05 
      }
    },
    exit: { opacity: 0, x: -20, transition: { duration: 0.2 } }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0 }
  };

  return (
    <div className="flex h-full w-full max-w-6xl mx-auto overflow-hidden px-4 py-8 gap-8">
      {/* Settings Sidebar */}
      <div className="w-72 flex flex-col gap-6 flex-shrink-0">
        <div className="px-2">
          <h1 className="text-3xl font-black text-white tracking-tight mb-1 flex items-center gap-3">
            <Settings className="text-blue-500" size={28} />
            Settings
          </h1>
          <p className="text-white/40 text-sm font-medium">Manage your workspace</p>
        </div>

        <div className="relative px-2">
          <Input
            placeholder="Search settings..."
            variant="flat"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            startContent={<Search size={18} className="text-white/30" />}
            classNames={{
              inputWrapper: "bg-white/[0.03] hover:bg-white/[0.05] border border-white/5 rounded-2xl h-12 transition-all duration-300",
              input: "text-sm text-white placeholder:text-white/20",
            }}
          />
        </div>

        <ScrollShadow className="flex-1 px-2 pb-4">
          <nav className="space-y-1">
            {filteredCategories.map((cat) => (
              <motion.button
                key={cat.id}
                whileHover={{ x: 4 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setActiveTab(cat.id)}
                className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all duration-300 group ${
                  activeTab === cat.id 
                  ? 'bg-blue-500/10 text-white border border-blue-500/20 shadow-xl shadow-blue-500/5' 
                  : 'text-white/40 hover:text-white/80 hover:bg-white/5'
                }`}
              >
                <div className={`p-2 rounded-xl transition-all duration-300 ${
                  activeTab === cat.id ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/30' : 'bg-white/5 group-hover:bg-white/10'
                }`}>
                  <cat.icon size={18} />
                </div>
                <span className="font-bold text-sm tracking-wide">{cat.label}</span>
                {activeTab === cat.id && (
                  <motion.div 
                    layoutId="active-indicator"
                    className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.8)]"
                  />
                )}
              </motion.button>
            ))}
          </nav>

          <Divider className="my-6 bg-white/5" />

          <div className="px-4 space-y-4">
            <div className="flex items-center gap-3 text-white/30 hover:text-white/60 transition-colors cursor-pointer group">
              <HelpCircle size={16} />
              <span className="text-xs font-bold uppercase tracking-widest">Help & Support</span>
            </div>
            <div 
              className="flex items-center gap-3 text-red-400/40 hover:text-red-400 transition-colors cursor-pointer group"
              onClick={() => alert('Log out functionality would go here!')}
            >
              <LogOut size={16} />
              <span className="text-xs font-bold uppercase tracking-widest">Log Out</span>
            </div>
          </div>
        </ScrollShadow>
      </div>

      {/* Settings Content Area */}
      <div className="flex-1 relative overflow-hidden bg-white/[0.02] border border-white/5 rounded-[40px] shadow-3xl backdrop-blur-3xl">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-purple-500/5 pointer-events-none" />
        
        <ScrollShadow className="h-full w-full overflow-y-auto custom-scrollbar">
          <div className="p-12 max-w-3xl">
            <AnimatePresence mode="wait">
              {activeTab === 'account' && (
                <motion.div
                  key="account"
                  variants={containerVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  className="space-y-12"
                >
                  <motion.div variants={itemVariants}>
                    <h2 className="text-3xl font-extrabold text-white mb-2">Account</h2>
                    <p className="text-white/40 font-medium">Manage your profile and account settings.</p>
                  </motion.div>

                  <motion.div variants={itemVariants}>
                    <Card className="bg-white/[0.03] border-white/10 shadow-2xl overflow-hidden rounded-[32px]">
                      <CardBody className="p-8">
                        <div className="flex flex-col md:flex-row items-center gap-10">
                          <div className="relative group">
                            <div className="absolute -inset-1.5 bg-gradient-to-tr from-blue-500 to-purple-500 rounded-full blur-md opacity-20 group-hover:opacity-40 transition duration-1000"></div>
                            <Avatar 
                              src="https://i.pravatar.cc/150?u=a042581f4e29026704d" 
                              className="w-32 h-32 border-4 border-black/50 relative shadow-2xl"
                            />
                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-all duration-300 rounded-full flex items-center justify-center cursor-pointer backdrop-blur-md border-2 border-white/10">
                              <Sparkles size={24} className="text-white" />
                            </div>
                          </div>
                          <div className="flex-1 w-full space-y-8">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              <Input 
                                label="Display Name"
                                labelPlacement="outside"
                                placeholder="Your name"
                                variant="bordered"
                                value={tempName}
                                onChange={(e) => setTempName(e.target.value)}
                                classNames={{
                                  input: "text-white font-semibold placeholder:text-white/20",
                                  label: "text-white/40 font-bold text-xs uppercase tracking-widest mb-3 px-1",
                                  inputWrapper: "h-14 bg-white/[0.04] border-white/10 hover:border-blue-500/30 focus-within:border-blue-500/50 transition-all duration-500 rounded-2xl px-5"
                                }}
                              />
                              <Input 
                                label="Email Address"
                                labelPlacement="outside"
                                placeholder="najem@example.com"
                                variant="bordered"
                                isDisabled
                                classNames={{
                                  input: "text-white/40",
                                  label: "text-white/40 font-bold text-xs uppercase tracking-widest mb-3 px-1",
                                  inputWrapper: "h-14 bg-white/[0.01] border-white/5 cursor-not-allowed rounded-2xl px-5"
                                }}
                              />
                            </div>
                            <div className="flex justify-end">
                              <Button 
                                color={saveStatus === 'success' ? 'success' : 'primary'} 
                                className="font-black px-10 h-14 rounded-2xl shadow-xl shadow-blue-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
                                onPress={handleSaveName}
                                isLoading={isSaving}
                                startContent={saveStatus === 'success' ? <Check size={18} /> : <Zap size={18} />}
                              >
                                {saveStatus === 'success' ? 'Changes Saved' : 'Update Profile'}
                              </Button>
                            </div>
                          </div>
                        </div>
                      </CardBody>
                    </Card>
                  </motion.div>

                  <motion.div variants={itemVariants} className="space-y-6">
                    <h3 className="text-xs font-black text-white/20 uppercase tracking-[0.2em] ml-1">Language & Region</h3>
                    <div className="bg-white/[0.03] border border-white/5 rounded-[32px] p-8 flex items-center justify-between group hover:bg-white/[0.05] transition-all duration-500">
                      <div className="flex items-center gap-6">
                        <div className="p-4 rounded-[20px] bg-blue-500/10 text-blue-400 border border-blue-500/20 group-hover:bg-blue-500/20 transition-all">
                          <Globe size={24} />
                        </div>
                        <div>
                          <h4 className="text-lg font-bold text-white mb-1">Interface Language</h4>
                          <p className="text-sm text-white/40 font-medium">Customize your localized experience.</p>
                        </div>
                      </div>
                      <Select 
                        size="lg"
                        className="max-w-[200px]"
                        selectedKeys={[language]}
                        variant="flat"
                        onSelectionChange={(keys) => {
                          const val = Array.from(keys)[0] as string;
                          setLanguage(val);
                          handleSaveSetting('language', val);
                        }}
                        classNames={{
                          trigger: "bg-white/[0.05] hover:bg-white/[0.08] border border-white/10 transition-all px-5 h-14 rounded-2xl",
                          value: "text-white font-bold",
                          popoverContent: "bg-[#0c0c0c]/95 backdrop-blur-3xl border border-white/10 shadow-3xl p-1 rounded-2xl",
                        }}
                      >
                        <SelectItem key="english" textValue="English" className="text-white hover:bg-blue-500/20 rounded-xl py-3 px-4">English (UK)</SelectItem>
                        <SelectItem key="spanish" textValue="Español" className="text-white hover:bg-blue-500/20 rounded-xl py-3 px-4">Español</SelectItem>
                        <SelectItem key="french" textValue="Français" className="text-white hover:bg-blue-500/20 rounded-xl py-3 px-4">Français</SelectItem>
                        <SelectItem key="arabic" textValue="العربية" className="text-white hover:bg-blue-500/20 rounded-xl py-3 px-4">العربية</SelectItem>
                      </Select>
                    </div>
                  </motion.div>
                </motion.div>
              )}

              {activeTab === 'appearance' && (
                <motion.div
                  key="appearance"
                  variants={containerVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  className="space-y-12"
                >
                  <motion.div variants={itemVariants}>
                    <h2 className="text-3xl font-extrabold text-white mb-2">Appearance</h2>
                    <p className="text-white/40 font-medium">Personalize the look and feel of your workspace.</p>
                  </motion.div>

                  <motion.div variants={itemVariants} className="space-y-6">
                    <div className="flex items-center justify-between px-1">
                      <h3 className="text-xs font-black text-white/20 uppercase tracking-[0.2em]">Wallpapers</h3>
                      <Badge content={BACKGROUNDS.length} color="primary" variant="flat" size="sm" />
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                      {BACKGROUNDS.map((thumb, i) => (
                        <motion.div 
                          key={i}
                          whileHover={{ scale: 1.05, y: -4 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => handleBgSelect(i)}
                          className={`group relative aspect-[16/10] rounded-3xl overflow-hidden cursor-pointer border-3 transition-all duration-500 ${
                            currentBg === i 
                            ? 'border-blue-500 shadow-2xl shadow-blue-500/30 ring-4 ring-blue-500/20' 
                            : 'border-white/5 hover:border-white/20 shadow-xl'
                          }`}
                        >
                          <img src={thumb} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" alt="Background" />
                          <div className={`absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex items-center justify-center transition-all duration-500 ${currentBg === i ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                            <div className={`p-4 rounded-full backdrop-blur-xl ${currentBg === i ? 'bg-blue-500 shadow-xl text-white' : 'bg-white/10 text-white/80 border border-white/20'}`}>
                              {currentBg === i ? <Check size={28} strokeWidth={3} /> : <Eye size={28} />}
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </motion.div>

                  <motion.div variants={itemVariants} className="space-y-6">
                    <h3 className="text-xs font-black text-white/20 uppercase tracking-[0.2em] ml-1">UI Customization</h3>
                    <div className="bg-white/[0.03] border border-white/5 rounded-[32px] p-8 space-y-10">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-6">
                          <div className="p-4 rounded-2xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
                            <Monitor size={24} />
                          </div>
                          <div>
                            <h4 className="text-lg font-bold text-white mb-1">Glass Intensity</h4>
                            <p className="text-sm text-white/40 font-medium">Adjust the blur and saturation of panels.</p>
                          </div>
                        </div>
                        <div className="w-64">
                          <Slider 
                            size="md"
                            step={1} 
                            maxValue={40} 
                            minValue={0} 
                            defaultValue={glassIntensity}
                            onChange={(val) => {
                              setGlassIntensity(val as number);
                              handleSaveSetting('glassIntensity', val);
                            }}
                            className="max-w-md"
                            classNames={{
                              thumb: "bg-white border-2 border-blue-500 w-6 h-6 shadow-xl",
                              track: "bg-white/10 h-2.5",
                              filler: "bg-gradient-to-r from-blue-600 to-purple-600 rounded-full"
                            }}
                          />
                        </div>
                      </div>

                      <Divider className="bg-white/5" />

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-6">
                          <div className="p-4 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                            <Layout size={24} />
                          </div>
                          <div>
                            <h4 className="text-lg font-bold text-white mb-1">Sidebar Auto-Collapse</h4>
                            <p className="text-sm text-white/40 font-medium">Save space by keeping the sidebar minimal.</p>
                          </div>
                        </div>
                        <Switch 
                          isSelected={sidebarCollapsed}
                          onValueChange={(val) => {
                            setSidebarCollapsed(val);
                            handleSaveSetting('sidebarCollapsed', val);
                          }}
                          size="lg"
                          classNames={{
                            wrapper: "group-data-[selected=true]:bg-blue-500 group-data-[selected=true]:shadow-[0_0_20px_rgba(59,130,246,0.4)] h-8 w-14",
                            thumb: "bg-white w-6 h-6 group-data-[selected=true]:ml-6"
                          }}
                        />
                      </div>
                    </div>
                  </motion.div>
                </motion.div>
              )}

              {activeTab === 'notifications' && (
                <motion.div
                  key="notifications"
                  variants={containerVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  className="space-y-12"
                >
                  <motion.div variants={itemVariants}>
                    <h2 className="text-3xl font-extrabold text-white mb-2">Notifications</h2>
                    <p className="text-white/40 font-medium">Control how and when you want to be alerted.</p>
                  </motion.div>

                  <motion.div variants={itemVariants} className="bg-white/[0.03] border border-white/5 rounded-[32px] p-8 space-y-10">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-6">
                        <div className="p-4 rounded-2xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
                          <Bell size={24} />
                        </div>
                        <div>
                          <h4 className="text-lg font-bold text-white mb-1">Push Alerts</h4>
                          <p className="text-sm text-white/40 font-medium">System level notifications for due tasks.</p>
                        </div>
                      </div>
                      <Switch 
                        isSelected={notificationsEnabled}
                        onValueChange={(val) => {
                          setNotificationsEnabled(val);
                          handleSaveSetting('notificationsEnabled', val);
                        }}
                        size="lg"
                        classNames={{
                          wrapper: "group-data-[selected=true]:bg-blue-500 h-8 w-14 shadow-lg shadow-blue-500/10",
                          thumb: "bg-white w-6 h-6"
                        }}
                      />
                    </div>

                    <Divider className="bg-white/5" />

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-6">
                        <div className="p-4 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          <Zap size={24} />
                        </div>
                        <div>
                          <h4 className="text-lg font-bold text-white mb-1">Acoustic Feedback</h4>
                          <p className="text-sm text-white/40 font-medium">Play subtle sounds on interface interactions.</p>
                        </div>
                      </div>
                      <Switch 
                        isSelected={soundEnabled}
                        onValueChange={(val) => {
                          setSoundEnabled(val);
                          handleSaveSetting('soundEnabled', val);
                        }}
                        size="lg"
                        classNames={{
                          wrapper: "group-data-[selected=true]:bg-emerald-500 h-8 w-14 shadow-lg shadow-emerald-500/10",
                          thumb: "bg-white w-6 h-6"
                        }}
                      />
                    </div>
                  </motion.div>
                </motion.div>
              )}

              {activeTab === 'data' && (
                <motion.div
                  key="data"
                  variants={containerVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  className="space-y-12"
                >
                  <motion.div variants={itemVariants}>
                    <h2 className="text-3xl font-extrabold text-white mb-2">Data & Privacy</h2>
                    <p className="text-white/40 font-medium">Manage your workspace data and security settings.</p>
                  </motion.div>

                  <motion.div variants={itemVariants} className="bg-white/[0.03] border border-white/5 rounded-[32px] p-8 space-y-10">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-6">
                        <div className="p-4 rounded-2xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
                          <Download size={24} />
                        </div>
                        <div>
                          <h4 className="text-lg font-bold text-white mb-1">Export Workspace</h4>
                          <p className="text-sm text-white/40 font-medium">Backup your data to a portable JSON file.</p>
                        </div>
                      </div>
                      <Button 
                        variant="flat" 
                        size="lg" 
                        className="font-black bg-white/5 hover:bg-white/10 text-white px-8 h-14 rounded-2xl transition-all"
                        onPress={handleExportData}
                        startContent={<Download size={20} />}
                      >
                        Download JSON
                      </Button>
                    </div>

                    <Divider className="bg-white/5" />

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-6">
                        <div className="p-4 rounded-2xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
                          <Upload size={24} />
                        </div>
                        <div>
                          <h4 className="text-lg font-bold text-white mb-1">Import Snapshot</h4>
                          <p className="text-sm text-white/40 font-medium">Restore your workspace from a previous state.</p>
                        </div>
                      </div>
                      <Button 
                        variant="flat" 
                        size="lg" 
                        className="font-black bg-white/5 hover:bg-white/10 text-white relative px-8 h-14 rounded-2xl transition-all"
                        startContent={<Upload size={20} />}
                      >
                        Restore Backup
                        <input 
                          type="file" 
                          className="absolute inset-0 opacity-0 cursor-pointer" 
                          accept=".json"
                          onChange={handleImportData}
                        />
                      </Button>
                    </div>
                  </motion.div>

                  <motion.div variants={itemVariants} className="space-y-6">
                    <h3 className="text-xs font-black text-red-500/40 uppercase tracking-[0.2em] ml-1">Danger Zone</h3>
                    <div className="bg-red-500/[0.03] border border-red-500/10 rounded-[32px] p-8 flex items-center justify-between group hover:bg-red-500/[0.05] transition-all">
                      <div className="flex items-center gap-6">
                        <div className="p-4 rounded-2xl bg-red-500/10 text-red-400 border border-red-500/20 group-hover:bg-red-500/20 transition-all">
                          <RotateCcw size={24} />
                        </div>
                        <div>
                          <h4 className="text-lg font-bold text-white mb-1">Factory Reset</h4>
                          <p className="text-sm text-white/40 font-medium">Wipe all boards and settings permanently.</p>
                        </div>
                      </div>
                      <Button 
                        color="danger" 
                        variant="flat" 
                        size="lg" 
                        className="font-black px-8 h-14 rounded-2xl shadow-xl shadow-red-500/5 hover:bg-red-500 hover:text-white transition-all"
                        startContent={<RotateCcw size={20} />}
                        onPress={handleResetDb}
                      >
                        Purge Everything
                      </Button>
                    </div>
                  </motion.div>
                </motion.div>
              )}

              {activeTab === 'shortcuts' && (
                <motion.div
                  key="shortcuts"
                  variants={containerVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  className="space-y-12"
                >
                  <motion.div variants={itemVariants}>
                    <h2 className="text-3xl font-extrabold text-white mb-2">Keyboard Shortcuts</h2>
                    <p className="text-white/40 font-medium">Master Trilo with lightning-fast key bindings.</p>
                  </motion.div>

                  <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {[
                      { key: 'Global Search', shortcut: 'Ctrl + K', icon: <Command size={18} /> },
                      { key: 'Create Board', shortcut: 'Alt + N', icon: <Layout size={18} /> },
                      { key: 'Navigate Tabs', shortcut: 'Alt + [1-5]', icon: <Zap size={18} /> },
                      { key: 'Close Modals', shortcut: 'Esc', icon: <X size={18} /> },
                      { key: 'Quick Capture', shortcut: 'Alt + C', icon: <Zap size={18} /> },
                      { key: 'Refresh App', shortcut: 'Ctrl + R', icon: <RotateCcw size={18} /> },
                    ].map((item) => (
                      <Card key={item.key} className="bg-white/[0.03] border-white/5 hover:bg-white/[0.06] hover:border-white/10 transition-all duration-300 rounded-3xl shadow-xl">
                        <CardBody className="p-6 flex flex-row items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="p-3 rounded-2xl bg-white/5 text-white/40 group-hover:text-blue-400 transition-colors">
                              {item.icon}
                            </div>
                            <span className="font-bold text-white/80">{item.key}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            {item.shortcut.split(' + ').map((k) => (
                              <Kbd key={k} className="bg-black/40 border-white/10 text-white font-bold text-[10px] min-w-0 px-2.5 h-7 shadow-xl">
                                {k}
                              </Kbd>
                            ))}
                          </div>
                        </CardBody>
                      </Card>
                    ))}
                  </motion.div>

                  <motion.div variants={itemVariants} className="p-10 rounded-[40px] bg-blue-500/[0.04] border border-blue-500/10 flex items-center gap-8 shadow-3xl">
                    <div className="p-5 rounded-3xl bg-blue-500/10 text-blue-400 shadow-2xl shadow-blue-500/20">
                      <Zap size={36} strokeWidth={2.5} />
                    </div>
                    <div>
                      <h4 className="text-xl font-bold text-white mb-2">Efficiency Expert</h4>
                      <p className="text-base text-white/40 font-medium leading-relaxed max-w-lg">
                        Use <Kbd className="bg-white/5 border-white/10 text-[10px] h-6 mx-1">↑</Kbd> and <Kbd className="bg-white/5 border-white/10 text-[10px] h-6 mx-1">↓</Kbd> to navigate search results without leaving your keyboard.
                      </p>
                    </div>
                  </motion.div>
                </motion.div>
              )}

              {activeTab === 'about' && (
                <motion.div
                  key="about"
                  variants={containerVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  className="space-y-12"
                >
                  <motion.div variants={itemVariants}>
                    <Card className="bg-[#080808] border-white/10 overflow-hidden rounded-[40px] shadow-3xl">
                      <div className="h-56 bg-[url('https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=2564&auto=format&fit=crop')] bg-cover bg-center relative">
                        <div className="absolute inset-0 bg-blue-900/30 backdrop-blur-md" />
                        <div className="absolute inset-0 bg-gradient-to-t from-[#080808] via-[#080808]/20 to-transparent" />
                        <div className="absolute bottom-10 left-10 flex items-center gap-6">
                          <div className="p-5 rounded-[28px] bg-blue-600 shadow-2xl shadow-blue-500/50 ring-4 ring-white/10">
                            <Layout size={40} className="text-white" />
                          </div>
                          <div>
                            <h1 className="text-6xl font-black text-white tracking-tighter mb-1">Trilo</h1>
                            <p className="text-white/60 font-bold tracking-[0.2em] uppercase text-xs">V0.1.0-ALPHA • 2026.04.25</p>
                          </div>
                        </div>
                      </div>
                      <CardBody className="p-12 space-y-10">
                        <div className="flex justify-between items-start">
                          <div className="space-y-3">
                            <h4 className="text-2xl font-black text-white">Next Generation Productivity</h4>
                            <p className="text-base text-white/40 font-medium">Crafted with Next.js, Electron, and Python.</p>
                          </div>
                          <Badge content="Stable Release Candidate" color="primary" variant="flat" className="px-4 py-2 font-black text-xs" />
                        </div>

                        <p className="text-lg text-white/60 leading-relaxed max-w-2xl font-medium">
                          Trilo is a high-performance productivity ecosystem designed for deep work. 
                          By blending the fluidity of modern web technologies with the uncompromising power of native desktop performance, we've created the ultimate canvas for your ideas.
                        </p>

                        <Divider className="bg-white/5" />

                        <div className="grid grid-cols-2 gap-8">
                          <Button 
                            variant="flat" 
                            className="bg-white/5 hover:bg-white/10 text-white h-16 font-black text-base rounded-[24px] transition-all border border-white/5" 
                            startContent={<ExternalLink size={20} />}
                          >
                            Product Roadmap
                          </Button>
                          <Button 
                            variant="flat" 
                            className="bg-white/5 hover:bg-white/10 text-white h-16 font-black text-base rounded-[24px] transition-all border border-white/5" 
                            startContent={<ExternalLink size={20} />}
                          >
                            Security Whitepaper
                          </Button>
                        </div>
                        
                        <div className="pt-8 text-center space-y-4">
                          <p className="text-sm text-white/30 font-bold flex items-center justify-center gap-3">
                            Developed with ❤️ in London • <HelpCircle size={16} /> Enterprise Support Available
                          </p>
                          <p className="text-[10px] text-white/10 uppercase tracking-[0.5em] font-black">
                            © 2026 Trilo Technologies Ltd. All rights reserved.
                          </p>
                        </div>
                      </CardBody>
                    </Card>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </ScrollShadow>
      </div>
    </div>
  );
};

export default SettingsView;
