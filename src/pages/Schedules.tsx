import { motion, AnimatePresence } from 'motion/react';
import { Calendar, MapPin, Clock, Info, ChevronLeft, ChevronRight, Sparkles, X, ExternalLink } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { db } from '../lib/firebase';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { cn } from '@/src/lib/utils';
import { useSiteSettings } from '../contexts/SiteContext';

export default function Schedules() {
  const [searchParams] = useSearchParams();
  const { siteName } = useSiteSettings();
  const [schedules, setSchedules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());

  useEffect(() => {
    const qSchedules = query(collection(db, 'schedules'), orderBy('date', 'asc'));

    const unsubscribeSchedules = onSnapshot(qSchedules, (snapshot) => {
      const items = snapshot.docs.map(doc => ({
        id: doc.id,
        type: 'schedule',
        ...doc.data()
      }));
      setSchedules(items);
      setLoading(false);
    });

    return () => {
      unsubscribeSchedules();
    };
  }, []);

  useEffect(() => {
    if (!loading && schedules.length > 0) {
      const eventId = searchParams.get('eventId');
      if (eventId) {
        const event = schedules.find(s => s.id === eventId);
        if (event && event.date) {
          const eventDate = new Date(event.date);
          if (eventDate.getMonth() !== currentDate.getMonth() || eventDate.getFullYear() !== currentDate.getFullYear()) {
            setCurrentDate(new Date(eventDate.getFullYear(), eventDate.getMonth(), 1));
          }
          
          setTimeout(() => scrollToEvent(eventId), 300);
        }
      }
    }
  }, [loading, schedules, searchParams]);

  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (year: number, month: number) => {
    return new Date(year, month, 1).getDay();
  };

  const monthNames = [
    "Tháng 1", "Tháng 2", "Tháng 3", "Tháng 4", "Tháng 5", "Tháng 6",
    "Tháng 7", "Tháng 8", "Tháng 9", "Tháng 10", "Tháng 11", "Tháng 12"
  ];

  const days = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];

  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const formatFullDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    } catch {
      return dateStr;
    }
  };

  const monthSchedules = schedules.filter(s => {
    if (!s.date) return false;
    const parts = s.date.split('-');
    if (parts.length < 2) return false;
    const year = parseInt(parts[0]);
    const month = parseInt(parts[1]) - 1;
    return month === currentDate.getMonth() && year === currentDate.getFullYear();
  });

  const upcomingSchedules = schedules.filter(s => {
    if (!s.date) return false;
    const sDate = new Date(s.date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return sDate >= today;
  }).slice(0, 5);

  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [dayDetailModal, setDayDetailModal] = useState<{ open: boolean, date: string, activities: any[] }>({ 
    open: false, 
    date: '', 
    activities: [] 
  });

  const scrollToEvent = (id: string) => {
    const el = document.getElementById(`event-${id}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.add('ring-4', 'ring-primary/20');
      setTimeout(() => el.classList.remove('ring-4', 'ring-primary/20'), 2000);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-16 space-y-12">
      <section className="text-center space-y-4">
        <motion.h1 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-4xl md:text-5xl font-black text-primary leading-tight"
        >
          Lịch Hoạt Động <span className="text-pioneer-red">Đô Thị Số</span>
        </motion.h1>
        <p className="text-on-surface-variant max-w-2xl mx-auto font-medium">
          Theo dõi các hoạt động, sự kiện tập huấn và lịch công tác sắp tới tại Phường Cát Lái.
        </p>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
        {/* Calendar View */}
        <div className="lg:col-span-8 space-y-8">
          <div className="bg-surface-container-lowest rounded-[40px] border border-outline-variant/30 shadow-xl overflow-hidden">
            <div className="p-8 bg-primary text-white flex items-center justify-between">
              <h2 className="text-2xl font-bold">
                {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
              </h2>
              <div className="flex gap-2">
                <button onClick={prevMonth} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                  <ChevronLeft className="w-6 h-6" />
                </button>
                <button onClick={nextMonth} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                  <ChevronRight className="w-6 h-6" />
                </button>
              </div>
            </div>

            <div className="p-4 grid grid-cols-7 gap-2">
              {days.map(d => (
                <div key={d} className="text-center py-4 text-xs font-black text-on-surface-variant uppercase tracking-widest">
                  {d}
                </div>
              ))}
              
              {Array.from({ length: getFirstDayOfMonth(currentDate.getFullYear(), currentDate.getMonth()) }).map((_, i) => (
                <div key={`empty-${i}`} className="aspect-square" />
              ))}

              {Array.from({ length: getDaysInMonth(currentDate.getFullYear(), currentDate.getMonth()) }).map((_, i) => {
                const day = i + 1;
                const dStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                const daySchedules = schedules.filter(s => s.date === dStr);
                const dateObj = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
                const isToday = new Date().toDateString() === dateObj.toDateString();
                const isSelected = selectedDay === day;

                return (
                  <div 
                    key={day} 
                    onClick={() => {
                      if (daySchedules.length > 0) {
                        setSelectedDay(day);
                        setDayDetailModal({
                          open: true,
                          date: dStr,
                          activities: daySchedules
                        });
                      }
                    }}
                    className={cn(
                      "aspect-square p-2 border border-outline-variant/10 rounded-2xl flex flex-col items-center justify-center relative transition-all group",
                      isToday ? "bg-primary/5 border-primary/30" : "hover:bg-surface-subtle",
                      isSelected ? "bg-primary border-primary shadow-lg shadow-primary/20 scale-105 z-10" : "",
                      daySchedules.length > 0 && "cursor-pointer"
                    )}
                  >
                    <span className={cn(
                      "text-lg font-black transition-colors",
                      isSelected ? "text-white" : (isToday ? "text-primary" : "text-on-surface-variant group-hover:text-primary"),
                      (daySchedules.length > 0 && !isSelected) && "text-pioneer-red underline decoration-2 underline-offset-4"
                    )}>
                      {day}
                    </span>
                    {daySchedules.length > 0 && (
                      <div className="absolute bottom-2 flex gap-0.5">
                        {daySchedules.slice(0, 3).map((_, idx) => (
                          <div key={idx} className="w-1.5 h-1.5 rounded-full bg-pioneer-red" />
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-3xl p-6 flex gap-4 items-start">
            <Info className="w-6 h-6 text-amber-600 shrink-0 mt-1" />
            <p className="text-amber-900 text-sm font-medium">
              Lưu ý: Lịch hoạt động và tập huấn có thể thay đổi tùy theo tình hình thực tế. Cư dân vui lòng cập nhật thường xuyên thông báo từ Ủy ban Nhân dân Phường Cát Lái Số.
            </p>
          </div>
        </div>

        {/* List View */}
        <div className="lg:col-span-4 space-y-8">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-black text-on-surface">Sự kiện sắp tới</h2>
            <div className="w-12 h-1 bg-pioneer-red rounded-full" />
          </div>

          <div className="space-y-6">
            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-32 bg-surface-container-lowest animate-pulse rounded-3xl border border-outline-variant/30" />
                ))}
              </div>
            ) : upcomingSchedules.length > 0 ? (
              upcomingSchedules.map((s, i) => (
                <motion.div
                  key={s.id}
                  id={`event-${s.id}`}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="bg-surface-container-lowest p-6 rounded-3xl border border-outline-variant/20 shadow-sm hover:shadow-md transition-all group scroll-mt-24"
                >
                  <div className="flex gap-4 items-start">
                    <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shrink-0 group-hover:bg-primary group-hover:text-white transition-colors">
                      <Calendar className="w-6 h-6" />
                    </div>
                    <div className="space-y-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          {s.activityId && (
                            <span className="px-2 py-0.5 bg-pioneer-red/10 text-pioneer-red text-[8px] font-black uppercase rounded-full">Hoạt động</span>
                          )}
                        </div>
                        <p className="text-xs text-on-surface-variant line-clamp-1">{s.description || 'Không có mô tả cho sự kiện này.'}</p>
                      </div>
                      <div className="flex flex-wrap gap-4 text-[10px] font-black uppercase tracking-widest text-outline">
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-pioneer-red" />
                          <span>{s.time} • {formatFullDate(s.date)}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-honor-gold" />
                          <span>{s.location}</span>
                        </div>
                      </div>

                      {s.activityId && (
                        <Link 
                          to={`/hoat-dong?id=${s.activityId}`}
                          className="flex items-center justify-center gap-2 w-full py-2.5 bg-primary/10 text-primary text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-primary hover:text-white transition-all"
                        >
                          Đăng ký ngay
                          <ExternalLink size={12} />
                        </Link>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))
            ) : (
              <div className="p-12 text-center bg-surface-subtle rounded-[40px] border-2 border-dashed border-outline-variant">
                <p className="text-on-surface-variant font-medium italic">Không có hoạt động nào sắp tới.</p>
              </div>
            )}
          </div>

          <div className="bg-primary rounded-[40px] p-8 text-white space-y-6 relative overflow-hidden">
            <Sparkles className="w-12 h-12 text-white/20 absolute -right-4 -top-4 rotate-12" />
            <div className="relative z-10 space-y-2">
              <h3 className="text-xl font-bold">Bạn có ý tưởng?</h3>
              <p className="text-sm opacity-80 leading-relaxed">Gửi đề xuất hỗ trợ hoặc sáng kiến chuyển đổi số cho UBND để xây dựng đô thị thông minh văn minh hơn.</p>
            </div>
            <button className="w-full py-4 bg-white text-primary font-black rounded-2xl hover:shadow-2xl transition-all active:scale-95 text-sm uppercase tracking-widest">
              Gửi Đề Xuất
            </button>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {dayDetailModal.open && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDayDetailModal({ ...dayDetailModal, open: false })}
              className="absolute inset-0 bg-on-surface/40 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-2xl bg-surface-container-lowest rounded-[40px] shadow-2xl border border-outline-variant/30 overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-8 bg-primary text-white flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center backdrop-blur-sm">
                    <Calendar className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold">Hoạt động ngày</h3>
                    <p className="text-sm opacity-80 font-medium">{formatFullDate(dayDetailModal.date)}</p>
                  </div>
                </div>
                <button 
                  onClick={() => setDayDetailModal({ ...dayDetailModal, open: false })}
                  className="p-2.5 hover:bg-white/10 rounded-full transition-colors"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                <div className="space-y-6">
                  {dayDetailModal.activities.map((s, i) => (
                    <motion.div
                      key={s.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="bg-surface-subtle/30 p-6 rounded-3xl border border-outline-variant/20 hover:border-primary/30 transition-all group"
                    >
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="space-y-3">
                          <div className="flex items-center gap-3">
                            <h4 className="text-lg font-bold text-on-surface group-hover:text-primary transition-colors">
                              {s.title}
                            </h4>
                            {s.activityId && (
                              <span className="px-2.5 py-1 bg-pioneer-red/10 text-pioneer-red text-[10px] font-black uppercase rounded-full">
                                Hoạt động chính
                              </span>
                            )}
                          </div>
                          
                          <p className="text-sm text-on-surface-variant leading-relaxed">
                            {s.description || 'Không có mô tả chi tiết cho sự kiện này.'}
                          </p>

                          <div className="flex flex-wrap gap-5 pt-1">
                            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-outline">
                              <Clock className="w-4 h-4 text-pioneer-red" />
                              <span>{s.time}</span>
                            </div>
                            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-outline">
                              <MapPin className="w-4 h-4 text-honor-gold" />
                              <span>{s.location}</span>
                            </div>
                          </div>
                        </div>

                        {s.activityId && (
                          <Link 
                            to={`/hoat-dong?id=${s.activityId}`}
                            className="flex items-center justify-center gap-2 px-6 py-3 bg-primary text-white text-xs font-black uppercase tracking-widest rounded-2xl hover:shadow-lg hover:shadow-primary/20 transition-all active:scale-95 whitespace-nowrap"
                          >
                            Chi tiết
                            <ExternalLink size={14} />
                          </Link>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>

              <div className="p-8 border-t border-outline-variant/30 bg-surface-subtle/10">
                <button 
                  onClick={() => setDayDetailModal({ ...dayDetailModal, open: false })}
                  className="w-full py-4 bg-outline-variant/20 text-on-surface font-black rounded-2xl hover:bg-outline-variant/30 transition-all text-xs uppercase tracking-widest"
                >
                  Đóng
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
