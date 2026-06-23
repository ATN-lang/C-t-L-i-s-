import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Users, Plus, X, Search, Calendar, User, Info, Send, Trash2, ArrowRight, Settings } from 'lucide-react';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, addDoc, serverTimestamp, query, orderBy, onSnapshot, doc, updateDoc, deleteDoc, increment, setDoc } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import { useSiteSettings } from '../contexts/SiteContext';
import { cn } from '@/src/lib/utils';

export default function Clubs() {
  const siteSettings = useSiteSettings();
  const [clubs, setClubs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [search, setSearch] = useState('');
  const [isDetailModalOpen, setIsDetailModalOpen] = useState<{ open: boolean, club?: any }>({ open: false });
  const [isJoinModalOpen, setIsJoinModalOpen] = useState<{ open: boolean, club?: any }>({ open: false });
  
  const { user, isAdmin } = useAuth();
  
  // Join Club Form
  const [joinForm, setJoinForm] = useState({
    userName: '',
    userClass: '',
    userEmail: '',
  });

  const [memberships, setMemberships] = useState<any[]>([]);

  useEffect(() => {
    const q = query(collection(db, 'clubs'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setClubs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    });

    const mq = query(collection(db, 'club_memberships'));
    const unsubscribeMembers = onSnapshot(mq, (snapshot) => {
      setMemberships(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => {
      unsubscribe();
      unsubscribeMembers();
    };
  }, []);

  const handleJoinClub = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isJoinModalOpen.club) return;

    // Use a guest ID if not logged in
    const currentUserId = user?.uid || `guest_${Math.random().toString(36).substring(2, 11)}`;

    const autoApprove = siteSettings.autoApproveMembers;

    try {
      const membershipData = {
        clubId: isJoinModalOpen.club.id,
        clubName: isJoinModalOpen.club.name,
        userId: currentUserId,
        userEmail: joinForm.userEmail || user?.email || '',
        userName: joinForm.userName,
        userClass: joinForm.userClass,
        status: autoApprove ? 'approved' : 'pending',
        joinedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      await addDoc(collection(db, 'club_memberships'), membershipData);

      if (autoApprove) {
        // Increment memberCount for the club
        await updateDoc(doc(db, 'clubs', isJoinModalOpen.club.id), {
          memberCount: increment(1),
          updatedAt: serverTimestamp()
        });
        alert('Chúc mừng! Bạn đã trở thành thành viên của câu lạc bộ.');
      } else {
        alert('Đã gửi yêu cầu tham gia câu lạc bộ. Vui lòng chờ Ban chủ nhiệm phê duyệt!');
      }

      setIsJoinModalOpen({ open: false });
      setJoinForm({ userName: '', userClass: '', userEmail: '' });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'club_memberships');
    }
  };

  const filteredClubs = clubs.filter(club => 
    club.name.toLowerCase().includes(search.toLowerCase()) ||
    club.description.toLowerCase().includes(search.toLowerCase())
  );

  const getMembership = (clubId: string) => {
    return memberships.find(m => m.clubId === clubId && m.userId === user?.uid);
  };

  return (
    <div className="min-h-screen bg-surface pt-24 pb-20 px-6">
      <div className="max-w-7xl mx-auto space-y-12">
        {/* Header */}
        <section className="flex flex-col md:flex-row md:items-end justify-between gap-8 pb-12 border-b border-outline-variant/30">
          <div className="space-y-4">
            <div className="flex items-center gap-3 text-primary">
              <Users size={32} strokeWidth={2.5} />
              <span className="text-xs font-black uppercase tracking-[0.2em] bg-primary/10 px-4 py-2 rounded-full">Khám phá</span>
            </div>
            <h1 className="text-5xl md:text-7xl font-black text-on-surface tracking-tighter leading-[0.9]">
              CÂU LẠC <br className="hidden md:block" /> BỘ <span className="text-primary italic font-serif">.</span>
            </h1>
            <p className="text-on-surface-variant font-medium max-w-lg leading-relaxed">
              Nơi kết nối đam mê, bồi dưỡng tài năng và đóng góp tích cực cho phong trào văn hóa, chuyển đổi số tại địa phương.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch gap-4">
            <div className="relative group">
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-outline group-focus-within:text-primary transition-colors" size={20} />
              <input 
                type="text" 
                placeholder="Tìm tên câu lạc bộ..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full sm:w-[300px] h-14 pl-14 pr-6 bg-surface-container-lowest border-2 border-outline-variant/30 rounded-3xl outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all font-bold text-sm"
              />
            </div>
          </div>
        </section>

        {/* Clubs Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {loading ? (
            Array(6).fill(0).map((_, i) => (
              <div key={i} className="aspect-[4/5] bg-surface-container rounded-[40px] animate-pulse" />
            ))
          ) : filteredClubs.length > 0 ? (
            filteredClubs.map((club) => {
              const membership = getMembership(club.id);
              return (
                <motion.div 
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  key={club.id}
                  className="group relative bg-surface-container-lowest rounded-[40px] overflow-hidden border border-outline-variant/30 shadow-sm hover:shadow-2xl hover:shadow-primary/10 transition-all duration-500"
                >
                  <div className="aspect-[4/5] relative overflow-hidden">
                    <img 
                      src={club.posterUrl || null} 
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
                      alt={club.name}
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-on-surface/90 via-on-surface/20 to-transparent" />
                    
                    <div className="absolute top-6 left-6 flex flex-wrap gap-2">
                       <span className="px-4 py-2 bg-white/20 backdrop-blur-xl text-white text-[10px] font-black uppercase tracking-widest rounded-full border border-white/30">
                        {club.memberCount || 0} Thành viên
                      </span>
                    </div>

                    <div className="absolute bottom-8 left-8 right-8 space-y-4">
                      <div>
                        <p className="text-white/60 text-[10px] font-black uppercase tracking-[0.2em] mb-2">{club.leaderName}</p>
                        <h3 className="text-3xl font-black text-white leading-tight">{club.name}</h3>
                      </div>
                      
                      <div className="flex gap-2">
                        <button 
                          onClick={() => setIsDetailModalOpen({ open: true, club })}
                          className="flex-1 py-4 rounded-2xl bg-white text-on-surface text-[10px] font-black uppercase tracking-widest hover:bg-primary hover:text-white transition-all shadow-xl"
                        >
                          Xem chi tiết
                        </button>
                        
                        {membership ? (
                          <div className={cn(
                            "flex-1 px-4 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center",
                            membership.status === 'approved' ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : 
                            "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                          )}>
                            {membership.status === 'approved' ? 'Thành viên' : 'Đang duyệt'}
                          </div>
                        ) : (
                          <button 
                            onClick={() => setIsJoinModalOpen({ open: true, club })}
                            className="flex-1 py-4 rounded-2xl bg-primary text-white text-[10px] font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-xl shadow-primary/40"
                          >
                            Đăng ký ngay
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })
          ) : (
             <div className="col-span-full py-20 text-center space-y-6">
              <div className="w-24 h-24 bg-surface-subtle rounded-full mx-auto flex items-center justify-center text-outline">
                <Users size={48} />
              </div>
              <div className="space-y-2">
                <p className="text-xl font-bold text-on-surface">Không tìm thấy câu lạc bộ nào</p>
                <p className="text-on-surface-variant font-medium">Hãy thử tìm kiếm với từ khóa khác.</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Join Club Modal */}
      <AnimatePresence>
        {isJoinModalOpen.open && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsJoinModalOpen({ open: false })}
              className="absolute inset-0 bg-on-surface/40 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-md bg-surface-container-lowest rounded-[40px] shadow-2xl overflow-hidden p-8 md:p-12 text-center"
            >
              <div className="w-20 h-20 bg-primary/10 text-primary rounded-full mx-auto flex items-center justify-center mb-6">
                <Send size={32} />
              </div>
              <h2 className="text-2xl font-black text-on-surface mb-2">Đăng ký gia nhập</h2>
              <p className="text-on-surface-variant font-medium mb-8">
                Bạn đang đăng ký tham gia CLB: <span className="text-primary font-bold">{isJoinModalOpen.club?.name}</span>
              </p>

              <form onSubmit={handleJoinClub} className="space-y-4">
                <div className="space-y-2 text-left">
                  <label className="text-xs font-black text-on-surface-variant uppercase tracking-widest pl-2">Họ và tên</label>
                  <input 
                    required
                    type="text"
                    value={joinForm.userName}
                    onChange={(e) => setJoinForm({ ...joinForm, userName: e.target.value })}
                    className="w-full h-14 px-6 bg-surface-subtle rounded-2xl border-0 outline-none focus:ring-4 focus:ring-primary/10 transition-all font-bold text-sm"
                  />
                </div>
                <div className="space-y-2 text-left">
                  <label className="text-xs font-black text-on-surface-variant uppercase tracking-widest pl-2">Khu phố</label>
                  <input 
                    required
                    type="text"
                    placeholder="VD: Khu phố 1"
                    value={joinForm.userClass}
                    onChange={(e) => setJoinForm({ ...joinForm, userClass: e.target.value })}
                    className="w-full h-14 px-6 bg-surface-subtle rounded-2xl border-0 outline-none focus:ring-4 focus:ring-primary/10 transition-all font-bold text-sm"
                  />
                </div>
                <div className="space-y-2 text-left">
                  <label className="text-xs font-black text-on-surface-variant uppercase tracking-widest pl-2">Email / Số điện thoại</label>
                  <input 
                    required
                    type="text"
                    placeholder="Để chúng tôi liên hệ"
                    value={joinForm.userEmail}
                    onChange={(e) => setJoinForm({ ...joinForm, userEmail: e.target.value })}
                    className="w-full h-14 px-6 bg-surface-subtle rounded-2xl border-0 outline-none focus:ring-4 focus:ring-primary/10 transition-all font-bold text-sm"
                  />
                </div>
                <button 
                  type="submit"
                  className="w-full py-5 bg-primary text-white rounded-3xl font-black text-sm uppercase tracking-widest shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all mt-4"
                >
                  GỬI YÊU CẦU GIA NHẬP
                </button>
                <button 
                  type="button"
                  onClick={() => setIsJoinModalOpen({ open: false })}
                  className="w-full py-4 text-on-surface-variant font-bold text-xs uppercase tracking-widest hover:underline"
                >
                  HỦY BỎ
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Detail Modal */}
      <AnimatePresence>
        {isDetailModalOpen.open && isDetailModalOpen.club && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsDetailModalOpen({ open: false })}
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
                  src={isDetailModalOpen.club.posterUrl || null} 
                  className="w-full h-full object-cover" 
                  alt={isDetailModalOpen.club.name}
                  referrerPolicy="no-referrer"
                />
              </div>

              <div className="w-full md:w-1/2 p-8 md:p-12 flex flex-col overflow-y-auto custom-scrollbar">
                <div className="flex justify-between items-start mb-8">
                  <div className="space-y-4">
                    <span className="px-4 py-2 bg-primary/10 text-primary text-[10px] font-black uppercase tracking-widest rounded-full">
                      Thông tin CLB
                    </span>
                    <h2 className="text-4xl font-black text-on-surface leading-tight">
                      {isDetailModalOpen.club.name}
                    </h2>
                  </div>
                  <button 
                    onClick={() => setIsDetailModalOpen({ open: false })}
                    className="p-3 hover:bg-surface-subtle rounded-2xl transition-all"
                  >
                    <X size={24} />
                  </button>
                </div>

                <div className="space-y-8 flex-1">
                  <div className="grid grid-cols-1 gap-4">
                    <div className="flex items-center gap-4 p-5 bg-surface-subtle/50 rounded-3xl border border-outline-variant/30">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                         <User size={20} />
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-outline uppercase tracking-widest">Trưởng CLB</p>
                        <p className="font-bold text-on-surface">{isDetailModalOpen.club.leaderName}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 p-5 bg-surface-subtle/50 rounded-3xl border border-outline-variant/30">
                      <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                         <Calendar size={20} />
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-outline uppercase tracking-widest">Lịch sinh hoạt</p>
                        <p className="font-bold text-on-surface">{isDetailModalOpen.club.schedule || "Đang cập nhật"}</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <p className="text-[10px] font-black text-outline uppercase tracking-widest flex items-center gap-2">
                       <Info size={14} className="text-primary" /> Giới thiệu chung
                    </p>
                    <p className="text-on-surface-variant leading-loose font-medium">
                      {isDetailModalOpen.club.description}
                    </p>
                  </div>
                </div>

                <div className="pt-10 mt-auto">
                   {(() => {
                     const membership = getMembership(isDetailModalOpen.club.id);
                     if (!membership) {
                       return (
                         <button 
                           onClick={() => {
                             setIsJoinModalOpen({ open: true, club: isDetailModalOpen.club });
                             setIsDetailModalOpen({ open: false });
                           }}
                           className="w-full py-5 rounded-3xl bg-primary text-white font-black text-sm shadow-2xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all uppercase tracking-widest flex items-center justify-center gap-3"
                         >
                           ĐĂNG KÝ GIA NHẬP NGAY <ArrowRight size={20} />
                         </button>
                       );
                     }
                     
                     return (
                       <div className="space-y-4">
                         <div className={cn(
                           "p-6 rounded-3xl text-center font-bold border-2 border-dashed transition-all",
                           membership.status === 'approved' ? "bg-emerald-50 border-emerald-200 text-emerald-700" : 
                           "bg-surface-subtle border-outline-variant text-on-surface-variant"
                         )}>
                           {membership.status === 'approved' ? 'Bạn đã là thành viên chính thức.' : 
                            'Bạn đã gửi yêu cầu tham gia CLB này.'}
                         </div>
                       </div>
                     );
                   })()}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
