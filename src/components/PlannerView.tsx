'use client'

import React, { useState, useMemo } from 'react';
import { Droppable } from '@hello-pangea/dnd';
import { 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Clock, 
  Calendar as CalendarIcon,
  Search,
  Filter,
  MoreHorizontal,
  LayoutGrid,
  List,
  AlertCircle
} from 'lucide-react';
import { 
  Button, 
  Card, 
  CardBody, 
  Tooltip, 
  Modal, 
  ModalContent, 
  ModalHeader, 
  ModalBody, 
  ModalFooter,
  useDisclosure,
  Input,
  Select,
  SelectItem
} from '@nextui-org/react';
import { motion, AnimatePresence } from 'framer-motion';

interface Event {
  id: string;
  title: string;
  date: Date;
  type: 'task' | 'meeting' | 'reminder' | 'deadline';
  priority: 'low' | 'medium' | 'high';
}

const PlannerView = ({ isDualView = false }: { isDualView?: boolean }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<Event[]>([
    { id: '1', title: 'Backend IPC Refactor', date: new Date(2026, 3, 25), type: 'task', priority: 'high' },
    { id: '2', title: 'Client Sync', date: new Date(2026, 3, 26), type: 'meeting', priority: 'medium' },
    { id: '3', title: 'UI Review', date: new Date(2026, 3, 28), type: 'task', priority: 'low' },
    { id: '4', title: 'Release v1.0', date: new Date(2026, 4, 1), type: 'deadline', priority: 'high' },
  ]);
  
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const [newEventTitle, setNewEventTitle] = useState('');
  const [newEventType, setNewEventType] = useState('task');
  const [viewMode, setViewMode] = useState<'month' | 'week' | 'list'>('month');

  // Calendar Logic
  const daysInMonth = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    return new Date(year, month + 1, 0).getDate();
  }, [currentDate]);

  const firstDayOfMonth = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    return new Date(year, month, 1).getDay();
  }, [currentDate]);

  const monthName = currentDate.toLocaleString('default', { month: 'long' });
  const year = currentDate.getFullYear();

  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const handleDateClick = (day: number) => {
    setSelectedDate(new Date(currentDate.getFullYear(), currentDate.getMonth(), day));
    onOpen();
  };

  const handleQuickAdd = () => {
    setSelectedDate(new Date());
    onOpen();
  };

  const handleAddEvent = () => {
    if (!newEventTitle.trim() || !selectedDate) return;

    const newEvent: Event = {
      id: Math.random().toString(36).substr(2, 9),
      title: newEventTitle,
      date: selectedDate,
      type: newEventType as any,
      priority: 'medium'
    };

    setEvents([...events, newEvent]);
    setNewEventTitle('');
    onClose();
  };

  const getEventsForDay = (day: number) => {
    return events.filter(event => {
      return event.date.getDate() === day && 
             event.date.getMonth() === currentDate.getMonth() &&
             event.date.getFullYear() === currentDate.getFullYear();
    });
  };

  const typeColors = {
    task: 'bg-blue-500',
    meeting: 'bg-purple-500',
    reminder: 'bg-amber-500',
    deadline: 'bg-rose-500'
  };

  return (
    <div className={`h-full flex flex-col gap-6 p-2 ${isDualView ? 'max-w-full' : 'max-w-[1400px]'} mx-auto`}>
      {/* Planner Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-2">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1 bg-white/5 p-1.5 rounded-2xl backdrop-blur-xl border border-white/10 shadow-lg">
            <Button isIconOnly variant="light" size="sm" onPress={prevMonth} className="text-white/40 hover:text-white hover:bg-white/10 rounded-xl transition-all">
              <ChevronLeft size={18} />
            </Button>
            <h2 className="text-sm font-black text-white px-6 min-w-[180px] text-center uppercase tracking-[0.3em]">
              {monthName} <span className="text-blue-500/80">{year}</span>
            </h2>
            <Button isIconOnly variant="light" size="sm" onPress={nextMonth} className="text-white/40 hover:text-white hover:bg-white/10 rounded-xl transition-all">
              <ChevronRight size={18} />
            </Button>
          </div>
          <Button 
            variant="flat" 
            size="sm" 
            onPress={() => setCurrentDate(new Date())} 
            className="bg-white/10 hover:bg-white/20 text-white text-[10px] font-black uppercase tracking-widest h-10 px-6 rounded-2xl border border-white/5 transition-all"
          >
            Today
          </Button>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 bg-white/5 p-1 rounded-2xl border border-white/10 backdrop-blur-xl shadow-inner">
            <Button 
              size="sm" 
              variant={viewMode === 'month' ? 'solid' : 'light'} 
              onPress={() => setViewMode('month')}
              className={`h-9 px-5 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${viewMode === 'month' ? 'bg-blue-600 text-white shadow-lg' : 'text-white/30 hover:text-white/60'}`}
              startContent={<LayoutGrid size={14} strokeWidth={3} />}
            >
              Month
            </Button>
            <Button 
              size="sm" 
              variant={viewMode === 'list' ? 'solid' : 'light'} 
              onPress={() => setViewMode('list')}
              className={`h-9 px-5 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${viewMode === 'list' ? 'bg-blue-600 text-white shadow-lg' : 'text-white/30 hover:text-white/60'}`}
              startContent={<List size={14} strokeWidth={3} />}
            >
              List
            </Button>
          </div>
          <Button 
            className="font-black text-[11px] uppercase tracking-wider h-10 px-6 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-[0_8px_20px_-6px_rgba(37,99,235,0.5)] hover:shadow-[0_12px_24px_-6px_rgba(37,99,235,0.6)] hover:scale-[1.02] active:scale-[0.98] transition-all border-t border-white/20"
            startContent={<Plus size={16} strokeWidth={3} />}
            onPress={handleQuickAdd}
          >
            Add Event
          </Button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex gap-6 overflow-hidden min-h-0">
        {/* Calendar Grid */}
        <div className={`flex-1 glass-panel rounded-[32px] overflow-hidden flex flex-col ${isDualView ? 'min-w-0' : 'min-w-[600px]'} border-white/10 shadow-2xl`}>
          {/* Days of Week Header */}
          <div className="grid grid-cols-7 border-b border-white/5 bg-white/[0.02]">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="py-4 text-center text-[10px] font-black text-white/20 uppercase tracking-[0.4em]">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Body */}
          <div className="flex-1 grid grid-cols-7 grid-rows-6 auto-rows-fr h-full">
            {/* Empty cells for previous month */}
            {Array.from({ length: firstDayOfMonth }).map((_, i) => (
              <div key={`empty-${i}`} className="border-r border-b border-white/[0.03] bg-white/[0.01]" />
            ))}

            {/* Days of current month */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const dayEvents = getEventsForDay(day);
              const isToday = day === new Date().getDate() && 
                             currentDate.getMonth() === new Date().getMonth() && 
                             currentDate.getFullYear() === new Date().getFullYear();

              return (
                <Droppable key={day} droppableId={`planner-day-${year}-${currentDate.getMonth()}-${day}`}>
                  {(provided, snapshot) => (
                    <div 
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      onClick={() => handleDateClick(day)}
                      className={`relative group border-r border-b border-white/[0.05] p-3 transition-all cursor-pointer flex flex-col gap-2 min-h-[120px] ${snapshot.isDraggingOver ? 'bg-blue-500/10' : 'hover:bg-white/[0.03]'}`}
                    >
                      <div className="flex justify-between items-center mb-1">
                        <span className={`text-[11px] font-black transition-all ${isToday ? 'bg-blue-600 text-white w-7 h-7 rounded-lg flex items-center justify-center -ml-1 shadow-[0_4px_12px_rgba(37,99,235,0.4)] border-t border-white/30' : 'text-white/20 group-hover:text-white/40'}`}>
                          {day}
                        </span>
                        {dayEvents.length > 0 && (
                          <div className="flex -space-x-1">
                            {Array.from(new Set(dayEvents.map(e => e.type))).slice(0, 3).map(type => (
                              <div key={type} className={`w-1.5 h-1.5 rounded-full ${typeColors[type]} border border-black/50 shadow-sm`} />
                            ))}
                          </div>
                        )}
                      </div>
                      
                      <div className="flex flex-col gap-1.5 mt-1 overflow-y-auto max-h-[100px] no-scrollbar">
                        {dayEvents.map(event => (
                          <motion.div 
                            key={event.id}
                            initial={{ opacity: 0, y: 5 }}
                            animate={{ opacity: 1, y: 0 }}
                            whileHover={{ scale: 1.02 }}
                            className={`text-[9px] px-2 py-1.5 rounded-xl text-white/90 font-bold ${typeColors[event.type]} bg-opacity-10 border border-white/10 backdrop-blur-sm truncate flex items-center gap-2 hover:bg-opacity-20 hover:border-white/20 transition-all shadow-sm`}
                          >
                            <div className={`w-1.5 h-1.5 rounded-full ${typeColors[event.type]} shrink-0 shadow-[0_0_8px_rgba(255,255,255,0.2)]`} />
                            <span className="truncate tracking-tight">{event.title}</span>
                          </motion.div>
                        ))}
                      </div>

                      <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-all scale-75 group-hover:scale-100">
                        <div className="bg-white/10 p-1 rounded-lg backdrop-blur-md border border-white/10">
                          <Plus size={14} className="text-white" />
                        </div>
                      </div>
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              );
            })}

            {/* Empty cells for next month to fill the 6x7 grid */}
            {Array.from({ length: 42 - (firstDayOfMonth + daysInMonth) }).map((_, i) => (
              <div key={`empty-next-${i}`} className="border-r border-b border-white/[0.03] bg-white/[0.01]" />
            ))}
          </div>
        </div>

        {/* Sidebar: Insights & Upcoming */}
        {!isDualView && (
          <div className="w-80 flex flex-col gap-6 overflow-y-auto pr-2 custom-scrollbar">
            {/* Stats Card */}
            <Card className="glass-panel border-white/10 shadow-xl overflow-visible">
              <CardBody className="p-6">
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-[20px] bg-gradient-to-br from-blue-500/20 to-indigo-600/10 flex items-center justify-center border border-blue-500/20 shadow-inner">
                      <Clock size={22} className="text-blue-400 drop-shadow-[0_0_8px_rgba(96,165,250,0.5)]" />
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-white uppercase tracking-wider">Productivity</h3>
                      <p className="text-[9px] text-white/30 uppercase font-black tracking-[0.25em] mt-1">Week Overview</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-1 h-1 rounded-full bg-blue-500 animate-pulse" />
                    <span className="text-[9px] font-black text-blue-500 uppercase tracking-widest">Live</span>
                  </div>
                </div>
                
                <div className="space-y-4 px-2">
                  <div className="flex justify-between items-end gap-1 h-32">
                    {[40, 70, 45, 90, 65, 30, 55].map((val, i) => (
                      <div key={i} className="flex flex-col items-center gap-3 flex-1 group">
                        <div className="w-full bg-white/5 rounded-2xl relative h-full overflow-hidden border border-white/5">
                          <motion.div 
                            initial={{ height: 0 }}
                            animate={{ height: `${val}%` }}
                            transition={{ duration: 1.2, delay: i * 0.1, ease: [0.23, 1, 0.32, 1] }}
                            className="absolute bottom-0 w-full bg-gradient-to-t from-blue-600/80 via-blue-400/60 to-indigo-400/40 backdrop-blur-sm" 
                          />
                          <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                        <span className="text-[9px] font-black text-white/20 group-hover:text-white/60 transition-colors uppercase">
                          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][i].substring(0, 1)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </CardBody>
            </Card>

            {/* Upcoming Events */}
            <div className="space-y-5">
              <div className="flex items-center justify-between px-2">
                <h3 className="text-[10px] font-black text-white/30 uppercase tracking-[0.3em]">Upcoming</h3>
                <Button size="sm" variant="light" className="text-blue-500/60 hover:text-blue-400 text-[9px] uppercase font-black h-6 tracking-widest px-0 min-w-unit-0">View All</Button>
              </div>
              
              <div className="space-y-3 px-1">
                {events.slice(0, 4).map(event => (
                  <div key={event.id} className="group glass-card p-4 rounded-[24px] border-white/5 hover:border-white/10 hover:bg-white/[0.04] transition-all flex items-center gap-4 cursor-pointer">
                    <div className={`w-3 h-3 rounded-full ${typeColors[event.type]} shadow-[0_0_12px_rgba(0,0,0,0.4)] border border-white/20`} />
                    <div className="flex-1 min-w-0">
                      <h4 className="text-[11px] font-black text-white/90 group-hover:text-blue-400 transition-colors leading-tight truncate uppercase tracking-tight">{event.title}</h4>
                      <p className="text-[9px] text-white/30 mt-1.5 flex items-center gap-2 uppercase font-black tracking-widest">
                        <CalendarIcon size={10} className="text-blue-500/40" />
                        {event.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </p>
                    </div>
                    <Button isIconOnly size="sm" variant="light" className="text-white/20 group-hover:text-white/60 h-8 w-8 rounded-xl transition-all">
                      <MoreHorizontal size={14} />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Action Card */}
            <Card className="bg-gradient-to-br from-indigo-600/30 via-purple-600/20 to-blue-900/40 border border-white/10 overflow-hidden rounded-[32px] shadow-2xl relative group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 blur-3xl group-hover:bg-white/10 transition-all duration-700" />
              <CardBody className="p-6 relative z-10">
                <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center mb-4 border border-white/10">
                  <AlertCircle size={20} className="text-indigo-300" />
                </div>
                <h4 className="text-xs font-black text-white mb-2 uppercase tracking-widest">Weekly Digest</h4>
                <p className="text-[11px] text-white/60 mb-5 leading-relaxed font-medium">
                  You have <span className="text-white font-black">4 deadlines</span> approaching this week. Ready to tackle them?
                </p>
                <Button 
                  fullWidth 
                  size="sm" 
                  className="bg-white hover:bg-indigo-50 text-indigo-900 font-black h-11 rounded-2xl shadow-xl transition-all active:scale-95"
                >
                  Open Smart Planner
                </Button>
              </CardBody>
            </Card>
          </div>
        )}
      </div>

      {/* Add Event Modal */}
      <Modal 
        isOpen={isOpen} 
        onClose={onClose}
        placement="center"
        backdrop="blur"
        classNames={{
          base: "bg-[#121212] border border-white/10",
          header: "border-b border-white/5",
          footer: "border-t border-white/5",
        }}
      >
        <ModalContent>
          <ModalHeader className="flex flex-col gap-1 text-white">
            Add New Event
            <span className="text-xs font-normal text-white/40">
              {selectedDate?.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </span>
          </ModalHeader>
          <ModalBody className="py-6">
            <div className="space-y-4">
              <Input
                label="Event Title"
                placeholder="What are you planning?"
                variant="bordered"
                classNames={{
                  label: "text-white/60",
                  input: "text-white",
                  inputWrapper: "border-white/10 group-data-[focus=true]:border-blue-500",
                }}
                value={newEventTitle}
                onChange={(e) => setNewEventTitle(e.target.value)}
              />
              
              <div className="grid grid-cols-2 gap-4">
                <Select 
                  label="Type"
                  variant="bordered"
                  classNames={{
                    label: "text-white/60",
                    value: "text-white",
                    trigger: "border-white/10",
                    popoverContent: "bg-[#121212] border border-white/10",
                  }}
                  selectedKeys={[newEventType]}
                  onSelectionChange={(keys) => setNewEventType(Array.from(keys)[0] as string)}
                >
                  <SelectItem key="task" value="task">Task</SelectItem>
                  <SelectItem key="meeting" value="meeting">Meeting</SelectItem>
                  <SelectItem key="reminder" value="reminder">Reminder</SelectItem>
                  <SelectItem key="deadline" value="deadline">Deadline</SelectItem>
                </Select>

                <Select 
                  label="Priority"
                  variant="bordered"
                  defaultSelectedKeys={["medium"]}
                  classNames={{
                    label: "text-white/60",
                    value: "text-white",
                    trigger: "border-white/10",
                    popoverContent: "bg-[#121212] border border-white/10",
                  }}
                >
                  <SelectItem key="low" value="low">Low</SelectItem>
                  <SelectItem key="medium" value="medium">Medium</SelectItem>
                  <SelectItem key="high" value="high">High</SelectItem>
                </Select>
              </div>
            </div>
          </ModalBody>
          <ModalFooter>
            <Button variant="light" onPress={onClose} className="text-white/60">
              Cancel
            </Button>
            <Button color="primary" onPress={handleAddEvent} className="font-bold">
              Create Event
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
};

export default PlannerView;
