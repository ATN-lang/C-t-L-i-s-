import { motion, AnimatePresence } from 'motion/react';
import { Calendar, MapPin, ArrowRight, NotebookText, Edit, Send, Info, Sparkles, X, User, Users as UsersIcon, Phone, CheckCircle2, Clock, AlertTriangle } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { cn } from '@/src/lib/utils';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, addDoc, serverTimestamp, query, orderBy, onSnapshot, doc, runTransaction, increment } from 'firebase/firestore';

export default function Activities() {
  const [activeTab, setActiveTab] = useState('Tất cả');
  const [searchParams] = useSearchParams();
  const calendarRef = useRef<HTMLDivElement>(null);
  
  const [activities, setActivities] = useState<any[]>([]);
  const [schedules, setSchedules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [regModal, setRegModal] = useState<{ open: boolean, activity?: any }>({ open: false });
  const [detailModal, setDetailModal] = useState<{ open: boolean, activity?: any }>({ open: false });
  const [regForm, setRegForm] = useState({ name: '', class: '', role: '', phone: '' });
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const q = query(collection(db, 'activities'), orderBy('startDate', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setActivities(items);
      setLoading(false);
    });

    const qSchedules = query(collection(db, 'schedules'), orderBy('date', 'asc'));
    const unsubscribeSchedules = onSnapshot(qSchedules, (snapshot) => {
      const items = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setSchedules(items);
    });

    return () => {
      unsubscribe();
      unsubscribeSchedules();
    };
  }, []);

  const currentMonthData = schedules.filter(s => {
    if (!s.date) return false;
    const parts = s.date.split('-');
    if (parts.length < 2) return false;
    const month = parseInt(parts[1]) - 1;
    const year = parseInt(parts[0]);
    const now = new Date();
    return month === now.getMonth() && year === now.getFullYear();
  }).slice(0, 4);

  const monthName = new Date().toLocaleDateString('vi-VN', { month: 'long' });

  useEffect(() => {
    if (searchParams.get('view') === 'calendar') {
      calendarRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    
    const activityId = searchParams.get('id');
    if (activityId && activities.length > 0) {
      const activity = activities.find(a => a.id === activityId);
      if (activity) {
        setRegModal({ open: true, activity });
      }
    }
  }, [searchParams, activities]);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regModal.activity) return;
    
    setSubmitting(true);
    setError(null);
    try {
      const activityRef = doc(db, 'activities', regModal.activity.id);
      
      await runTransaction(db, async (transaction) => {
        const activityDoc = await transaction.get(activityRef);
        if (!activityDoc.exists()) {
          throw new Error("Hoạt động không tồn tại!");
        }

        const data = activityDoc.data();
        const currentParticipants = data.currentParticipants || 0;
        const maxParticipants = data.maxParticipants || 0;

        if (currentParticipants >= maxParticipants) {
          throw new Error("Rất tiếc, hoạt động đã đủ số lượng đăng ký!");
        }

        const regRef = doc(collection(db, 'registrations'));
        transaction.set(regRef, {
          activityId: regModal.activity.id,
          activityTitle: regModal.activity.title,
          userName: regForm.name,
          userClass: regForm.class,
          userRole: regForm.role,
          phone: regForm.phone,
          createdAt: serverTimestamp()
        });

        transaction.update(activityRef, {
          currentParticipants: increment(1),
          updatedAt: serverTimestamp()
        });
      });

      setSuccess(true);
      setTimeout(() => {
        setRegModal({ open: false });
        setSuccess(false);
        setRegForm({ name: '', class: '', role: '', phone: '' });
      }, 2000);
    } catch (err: any) {
      console.error('Registration error:', err);
      setError(err.message || 'Đã có lỗi xảy ra. Vui lòng thử lại sau.');
    } finally {
      setSubmitting(false);
    }
  };

  const getFilteredActivities = () => {
    const now = new Date();
    return activities.filter(act => {
      const startDate = new Date(act.startDate);
      const endDate = act.endDate ? new Date(act.endDate) : new Date(startDate.getTime() + 24 * 60 * 60 * 1000); // Default 1 day if not specified
      
      if (activeTab === 'Tất cả') {
        return true;
      }
      if (activeTab === 'Đang diễn ra') {
        return now >= startDate && now <= endDate;
      }
      if (activeTab === 'Sắp tới') {
        return now < startDate;
      }
      if (activeTab === 'Đã kết thúc') {
        return now > endDate;
      }
      return false;
    });
  };

  const filteredActivities = getFilteredActivities();

  const getStatusInfo = (act: any) => {
    const now = new Date();
    const startDate = new Date(act.startDate);
    const endDate = act.endDate ? new Date(act.endDate) : new Date(startDate.getTime() + 24 * 60 * 60 * 1000);

    if (now >= startDate && now <= endDate) {
      return { label: 'Đang diễn ra', color: 'bg-emerald-100 text-emerald-800' };
    }
    if (now < startDate) {
      return { label: 'Sắp tới', color: 'bg-amber-100 text-amber-800' };
    }
    return { label: 'Đã kết thúc', color: 'bg-zinc-100 text-zinc-600' };
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-12 lg:py-20 flex flex-col lg:flex-row gap-12">
      <div className="flex-1 space-y-12">
        <section className="bg-surface-container-lowest rounded-[40px] p-12 border border-outline-variant/30 shadow-sm relative overflow-hidden">
          <div className="absolute -right-20 -top-20 opacity-5">
            <NotebookText size={300} className="text-primary" />
          </div>
          <div className="relative z-10 space-y-6">
            <h1 className="text-4xl md:text-5xl font-black text-primary">Hoạt động Phường Cát Lái Số</h1>
            <p className="text-lg text-on-surface-variant max-w-2xl leading-relaxed">
              Khám phá các hoạt động khoa học công nghệ, phổ cập chuyên đề ứng dụng, nâng cao kỹ năng số và thiện nguyện phục vụ xã hội. Nơi mỗi công dân cùng đồng hành, chia sẻ kiến thức và cùng nhau xây dựng cộng đồng văn minh hiện đại.
            </p>
          </div>
        </section>

        <div className="flex items-center gap-4 border-b border-outline-variant/30 pb-2 overflow-x-auto">
          {['Tất cả', 'Sắp tới', 'Đang diễn ra', 'Đã kết thúc'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "px-8 py-4 font-bold text-sm transition-all rounded-t-2xl whitespace-nowrap",
                activeTab === tab 
                  ? "bg-primary text-white shadow-lg" 
                  : "text-on-surface-variant hover:bg-surface-subtle"
              )}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {loading ? (
             <div className="col-span-full py-20 flex flex-col items-center justify-center text-on-surface-variant text-sm font-medium">
               <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin mb-4" />
               Đang tải hoạt động...
             </div>
          ) : filteredActivities.length === 0 ? (
            <div className="col-span-full py-20 text-center bg-surface-container-lowest rounded-[40px] border border-outline-variant/30 italic text-on-surface-variant">
              Hiện chưa có hoạt động nào trong mục này.
            </div>
          ) : filteredActivities.map((act, i) => {
            const status = getStatusInfo(act);
            const isFull = act.currentParticipants >= act.maxParticipants;
            
            return (
              <motion.article 
                key={act.id}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="bg-surface-container-lowest rounded-[32px] overflow-hidden border border-outline-variant/30 shadow-sm hover:shadow-2xl hover:-translate-y-2 transition-all group flex flex-col"
              >
                <div className="aspect-square overflow-hidden relative">
                  <img 
                    src={act.posterUrl || null} 
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
                    alt={act.title} 
                    loading="lazy"
                    decoding="async"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute top-6 left-6 flex flex-col gap-2">
                    <span className={cn("px-4 py-1.5 rounded-full text-[10px] font-black shadow-lg flex items-center gap-2 uppercase tracking-widest", status.color)}>
                      <span className="w-2 h-2 rounded-full bg-current animate-pulse" />
                      {status.label}
                    </span>
                    {isFull && (
                      <span className="px-4 py-1.5 rounded-full text-[10px] font-black shadow-lg bg-error text-white uppercase tracking-widest">
                        ĐÃ ĐỦ SỐ LƯỢNG
                      </span>
                    )}
                  </div>
                </div>
                <div className="p-8 space-y-6 flex-grow flex flex-col">
                  <div className="space-y-2">
                    <h3 className="text-xl font-black text-on-surface group-hover:text-primary transition-colors leading-tight line-clamp-2">{act.title}</h3>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-surface-subtle rounded-full overflow-hidden">
                        <div 
                          className={cn("h-full transition-all duration-1000", isFull ? "bg-error" : "bg-primary")}
                          style={{ width: `${Math.min(100, (act.currentParticipants / act.maxParticipants) * 100)}%` }}
                        />
                      </div>
                      <span className="text-[10px] font-black text-on-surface-variant uppercase">{act.currentParticipants || 0}/{act.maxParticipants}</span>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-start gap-3 text-on-surface-variant text-xs font-bold leading-relaxed">
                      <Clock className="w-4 h-4 text-primary shrink-0 mt-0.5" /> 
                    <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded uppercase">Bắt đầu</span>
                          <span className="font-bold">{act.startDate}</span>
                          {act.startTime && <span className="text-primary ml-1">{act.startTime}</span>}
                        </div>
                        {act.endDate ? (
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded uppercase">Kết thúc</span>
                            <span className="font-bold">{act.endDate}</span>
                            {act.endTime && <span className="text-amber-700 ml-1">{act.endTime}</span>}
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 text-[10px] text-on-surface-variant/60 italic font-medium">
                            <div className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                            Kết thúc trong ngày
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 text-on-surface-variant text-xs font-bold">
                      <MapPin className="w-4 h-4 text-primary shrink-0" /> {act.location}
                    </div>
                  </div>

                  <div className="pt-4 mt-auto grid grid-cols-2 gap-3">
                    <button 
                      onClick={() => setDetailModal({ open: true, activity: act })}
                      className="w-full py-4 rounded-2xl font-black text-[10px] bg-surface-subtle text-on-surface hover:bg-surface-subtle/80 transition-all uppercase tracking-widest"
                    >
                      Chi tiết
                    </button>
                    <button 
                      onClick={() => {
                        setRegModal({ open: true, activity: act });
                      }}
                      disabled={isFull || status.label === 'Đã kết thúc'}
                      className={cn(
                        "w-full py-4 rounded-2xl font-black text-[10px] flex items-center justify-center gap-2 transition-all group/reg uppercase tracking-widest",
                        isFull || status.label === 'Đã kết thúc' 
                          ? "bg-surface-subtle text-outline-variant cursor-not-allowed" 
                          : "bg-primary text-white shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95"
                      )}
                    >
                      {isFull ? 'Đủ' : status.label === 'Đã kết thúc' ? 'Hết' : (
                        <>Đăng ký <Edit className="w-3 h-3 group-hover/reg:rotate-12 transition-transform" /></>
                      )}
                    </button>
                  </div>
                </div>
              </motion.article>
            );
          })}
        </div>
      </div>

      <aside className="w-full lg:w-96 space-y-12 shrink-0">
        <div 
          ref={calendarRef}
          className="bg-surface-container-lowest p-8 rounded-[40px] border border-outline-variant/30 shadow-sm space-y-8 scroll-mt-20"
        >
          <h2 className="text-2xl font-bold text-on-surface flex items-center gap-3 capitalize">
            <NotebookText className="w-8 h-8 text-primary" /> {monthName}
          </h2>
          <div className="space-y-6">
            {currentMonthData.length > 0 ? currentMonthData.map((ev, i) => {
              const d = new Date(ev.date);
              const dayNames = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
              const dayName = dayNames[d.getDay()];
              const dayNum = d.getDate();
              const colors = ['border-blue-500', 'border-red-500', 'border-amber-500', 'border-emerald-500'];
              
              return (
                <Link 
                  key={i} 
                  to={`/lich-hoat-dong?eventId=${ev.id}`}
                  className={cn("flex gap-4 items-start p-4 rounded-3xl hover:bg-surface-subtle transition-all cursor-pointer border-l-8", colors[i % colors.length])}
                >
                  <div className="flex flex-col items-center justify-center min-w-[56px] bg-primary/10 text-primary rounded-2xl py-2 px-1">
                    <span className="text-xs font-bold opacity-80">{dayName}</span>
                    <span className="text-xl font-black">{dayNum}</span>
                  </div>
                  <div className="space-y-1">
                    <h4 className="font-bold text-on-surface text-sm line-clamp-2">{ev.title}</h4>
                    <p className="text-xs text-on-surface-variant font-medium">{ev.time} - {ev.location}</p>
                  </div>
                </Link>
              );
            }) : (
              <div className="py-6 text-center text-sm italic text-on-surface-variant">
                Không có sự kiện nào trong tháng này.
              </div>
            )}
          </div>
          <Link to="/lich-hoat-dong" className="block w-full py-4 text-center text-sm font-bold text-primary hover:bg-primary/5 rounded-2xl transition-all">Xem toàn bộ lịch</Link>
        </div>

        <div className="bg-primary-container p-8 rounded-[40px] text-white space-y-8 shadow-2xl relative overflow-hidden">
          <Sparkles className="absolute -right-8 -bottom-8 w-40 h-40 opacity-10 rotate-12" />
          <div className="relative z-10 space-y-6">
            <h2 className="text-2xl font-black flex items-center gap-3">Góc đăng ký nhanh</h2>
            <p className="text-sm opacity-90 leading-relaxed font-medium">Đăng ký tham gia các hoạt động dịch vụ công, tập huấn số nổi bật của Phường.</p>
            <div className="space-y-4">
              <select 
                className="w-full h-14 px-4 bg-white/10 border-0 rounded-2xl outline-none font-bold text-sm appearance-none focus:bg-white/20"
                onChange={(e) => {
                  const title = e.target.value;
                  const activity = activities.find(a => a.title === title);
                  if (activity) {
                    setRegModal({ open: true, activity });
                  }
                }}
              >
                <option value="" className="text-on-surface">Chọn hoạt động...</option>
                 {activities.map(a => (
                   <option key={a.title} value={a.title} className="text-on-surface">{a.title}</option>
                 ))}
              </select>
              <button 
                onClick={() => {
                   const select = document.querySelector('select');
                   const title = select?.value;
                   const activity = activities.find(a => a.title === title);
                   if (activity) setRegModal({ open: true, activity });
                }}
                className="w-full py-5 bg-white text-primary font-black rounded-2xl shadow-xl hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-3"
              >
                Đăng ký ngay <Send className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Registration Modal */}
      <AnimatePresence>
        {regModal.open && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setRegModal({ open: false })}
              className="absolute inset-0 bg-surface-on/40 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-xl bg-white rounded-[40px] shadow-2xl p-8 md:p-12 space-y-8 overflow-hidden"
            >
              {success ? (
                <div className="py-12 flex flex-col items-center justify-center text-center space-y-6">
                  <div className="w-24 h-24 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                    <CheckCircle2 size={60} />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-3xl font-black text-on-surface">Đăng ký thành công!</h3>
                    <p className="text-on-surface-variant font-medium">Cảm ơn bạn đã quan tâm tham gia hoạt động của Phường Cát Lái Số.</p>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex justify-between items-start">
                    <div className="space-y-2">
                      <span className="inline-block px-4 py-1.5 bg-primary/10 text-primary text-xs font-black rounded-full uppercase tracking-widest">Đơn đăng ký</span>
                      <h3 className="text-2xl font-black text-on-surface leading-tight">{regModal.activity?.title}</h3>
                    </div>
                    <button 
                      onClick={() => setRegModal({ open: false })}
                      className="p-2 hover:bg-surface-subtle rounded-2xl transition-all"
                    >
                      <X size={24} />
                    </button>
                  </div>

                  {error && (
                    <div className="p-4 bg-error/10 text-error rounded-2xl flex items-center gap-3 text-sm font-bold border border-error/20">
                      <AlertTriangle size={20} />
                      {error}
                    </div>
                  )}

                  {(() => {
                    const status = regModal.activity ? getStatusInfo(regModal.activity) : { label: '' };
                    const isFull = regModal.activity && regModal.activity.currentParticipants >= regModal.activity.maxParticipants;
                    const isClosed = isFull || status.label === 'Đã kết thúc';

                    if (isClosed) {
                      return (
                        <div className="py-8 bg-surface-subtle/50 rounded-3xl p-8 flex flex-col items-center justify-center text-center space-y-4 border-2 border-dashed border-outline-variant/30">
                          <div className={cn("p-4 rounded-2xl", isFull ? "bg-error/10 text-error" : "bg-zinc-100 text-zinc-500")}>
                            {isFull ? <UsersIcon size={32} /> : <Clock size={32} />}
                          </div>
                          <div className="space-y-1">
                            <h4 className="text-xl font-bold text-on-surface">
                              {isFull ? "Hoạt động đã đủ số lượng" : "Hoạt động đã kết thúc"}
                            </h4>
                            <p className="text-sm text-on-surface-variant font-medium">
                              {isFull ? "Rất tiếc, số lượng đăng ký đã đạt mức tối đa." : "Hoạt động này đã diễn ra hoặc thời hạn đăng ký đã hết."}
                            </p>
                          </div>
                          <button 
                            onClick={() => setRegModal({ open: false })}
                            className="px-8 py-3 bg-on-surface text-surface-container-lowest text-xs font-black uppercase tracking-widest rounded-xl hover:scale-105 active:scale-95 transition-all"
                          >
                            Quay lại
                          </button>
                        </div>
                      );
                    }

                    return (
                      <form onSubmit={handleRegister} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="space-y-2">
                            <label className="text-xs font-black uppercase text-outline tracking-widest pl-2 flex items-center gap-2">
                              <User size={14} className="text-primary" /> Họ và tên
                            </label>
                            <input 
                              required
                              value={regForm.name}
                              onChange={e => setRegForm({...regForm, name: e.target.value})}
                              placeholder="Nguyễn Văn A"
                              className="w-full px-6 py-4 bg-surface-subtle border-2 border-transparent focus:border-primary/20 rounded-2xl outline-none font-bold"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-xs font-black uppercase text-outline tracking-widest pl-2 flex items-center gap-2">
                              <UsersIcon size={14} className="text-primary" /> Khu phố
                            </label>
                            <input 
                              required
                              value={regForm.class}
                              onChange={e => setRegForm({...regForm, class: e.target.value})}
                              placeholder="Khu phố 3"
                              className="w-full px-6 py-4 bg-surface-subtle border-2 border-transparent focus:border-primary/20 rounded-2xl outline-none font-bold"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="space-y-2">
                            <label className="text-xs font-black uppercase text-outline tracking-widest pl-2 flex items-center gap-2">
                              <Sparkles size={14} className="text-primary" /> Chức danh / Vai trò
                            </label>
                            <input 
                              value={regForm.role}
                              onChange={e => setRegForm({...regForm, role: e.target.value})}
                              placeholder="Cư dân / Đại biểu"
                              className="w-full px-6 py-4 bg-surface-subtle border-2 border-transparent focus:border-primary/20 rounded-2xl outline-none font-bold"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-xs font-black uppercase text-outline tracking-widest pl-2 flex items-center gap-2">
                              <Phone size={14} className="text-primary" /> Số điện thoại liên hệ
                            </label>
                            <input 
                              value={regForm.phone}
                              onChange={e => setRegForm({...regForm, phone: e.target.value})}
                              placeholder="0901234567"
                              className="w-full px-6 py-4 bg-surface-subtle border-2 border-transparent focus:border-primary/20 rounded-2xl outline-none font-bold"
                            />
                          </div>
                        </div>

                        <div className="pt-4">
                          <button 
                            type="submit"
                            disabled={submitting}
                            className="w-full py-5 bg-primary text-white rounded-3xl font-black shadow-2xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed group/submit"
                          >
                            {submitting ? 'ĐANG XỬ LÝ...' : (
                              <>
                                XÁC NHẬN ĐĂNG KÝ <Send className="w-5 h-5 group-hover/submit:translate-x-1 group-hover/submit:-translate-y-1 transition-transform" />
                              </>
                            )}
                          </button>
                        </div>
                      </form>
                    );
                  })()}
                </>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Activity Detail Modal */}
      <AnimatePresence>
        {detailModal.open && detailModal.activity && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDetailModal({ open: false })}
              className="absolute inset-0 bg-on-surface/40 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-4xl bg-surface-container-lowest rounded-[40px] shadow-2xl overflow-hidden flex flex-col md:flex-row max-h-[90vh]"
            >
              <div className="w-full md:w-1/2 aspect-square md:aspect-auto relative bg-surface-container">
                <img 
                  src={detailModal.activity.posterUrl || null} 
                  className="w-full h-full object-cover" 
                  alt={detailModal.activity.title}
                  referrerPolicy="no-referrer"
                />
                <button 
                  onClick={() => setDetailModal({ open: false })}
                  className="absolute top-4 right-4 p-2 bg-on-surface/20 hover:bg-on-surface/40 text-white rounded-full backdrop-blur-md transition-all md:hidden"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="w-full md:w-1/2 p-8 md:p-12 flex flex-col overflow-y-auto custom-scrollbar">
                <div className="flex justify-between items-start mb-8">
                  <div className="space-y-4">
                    <div className="flex flex-wrap gap-2">
                      <span className={cn("px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest", getStatusInfo(detailModal.activity).color)}>
                        {getStatusInfo(detailModal.activity).label}
                      </span>
                      <span className="px-4 py-1.5 bg-primary/10 text-primary text-[10px] font-black rounded-full uppercase tracking-widest">
                        Chi tiết hoạt động
                      </span>
                    </div>
                    <h2 className="text-3xl font-black text-on-surface leading-tight">
                      {detailModal.activity.title}
                    </h2>
                  </div>
                  <button 
                    onClick={() => setDetailModal({ open: false })}
                    className="p-3 hover:bg-surface-subtle rounded-2xl transition-all hidden md:block"
                  >
                    <X size={24} />
                  </button>
                </div>

                <div className="space-y-8 flex-1">
                  <div className="grid grid-cols-1 gap-6">
                    <div className="flex items-start gap-4 p-6 bg-surface-subtle/50 rounded-3xl border border-outline-variant/30">
                      <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                        <Clock size={24} />
                      </div>
                      <div className="space-y-1">
                        <p className="text-[10px] font-black text-outline uppercase tracking-widest">Thời gian diễn ra</p>
                        <div className="space-y-1">
                          <p className="font-bold text-on-surface">Bắt đầu: {detailModal.activity.startDate} {detailModal.activity.startTime || ''}</p>
                          {detailModal.activity.endDate ? (
                            <p className="font-bold text-on-surface">Kết thúc: {detailModal.activity.endDate} {detailModal.activity.endTime || ''}</p>
                          ) : (
                            <p className="text-sm font-medium italic text-on-surface-variant">Kết thúc trong ngày</p>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-start gap-4 p-6 bg-surface-subtle/50 rounded-3xl border border-outline-variant/30">
                      <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                        <MapPin size={24} />
                      </div>
                      <div className="space-y-1">
                        <p className="text-[10px] font-black text-outline uppercase tracking-widest">Địa điểm</p>
                        <p className="font-bold text-on-surface">{detailModal.activity.location}</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <p className="text-[10px] font-black text-outline uppercase tracking-widest flex items-center gap-2">
                       <NotebookText size={14} className="text-primary" /> Mô tả hoạt động
                    </p>
                    <div className="text-on-surface-variant leading-loose whitespace-pre-wrap font-medium">
                      {detailModal.activity.description || "Chưa có mô tả chi tiết cho hoạt động này."}
                    </div>
                  </div>
                </div>

                <div className="pt-10 mt-auto">
                  <button 
                    onClick={() => {
                      setRegModal({ open: true, activity: detailModal.activity });
                      setDetailModal({ open: false });
                    }}
                    disabled={detailModal.activity.currentParticipants >= detailModal.activity.maxParticipants || getStatusInfo(detailModal.activity).label === 'Đã kết thúc'}
                    className={cn(
                      "w-full py-5 rounded-3xl font-black text-sm flex items-center justify-center gap-3 transition-all shadow-2xl uppercase tracking-widest",
                      detailModal.activity.currentParticipants >= detailModal.activity.maxParticipants || getStatusInfo(detailModal.activity).label === 'Đã kết thúc'
                        ? "bg-surface-subtle text-outline-variant cursor-not-allowed"
                        : "bg-primary text-white shadow-primary/20 hover:scale-[1.02] active:scale-95"
                    )}
                  >
                    {detailModal.activity.currentParticipants >= detailModal.activity.maxParticipants 
                      ? 'ĐÃ ĐỦ SỐ LƯỢNG' 
                      : getStatusInfo(detailModal.activity).label === 'Đã kết thúc' 
                        ? 'ĐÃ KẾT THÚC' 
                        : (
                          <>ĐĂNG KÝ THAM GIA <ArrowRight size={20} /></>
                        )}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
