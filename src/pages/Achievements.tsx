import { motion, AnimatePresence } from 'motion/react';
import { Trophy, Star, Users, Flag, Award, Calendar, Verified, Sparkles, X, Plus } from 'lucide-react';
import { useState, useEffect } from 'react';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, query, orderBy, onSnapshot, doc, where, getDocs } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/src/lib/utils';
import { useSiteSettings } from '../contexts/SiteContext';

export default function Achievements() {
  const { siteName } = useSiteSettings();
  const navigate = useNavigate();
  const [students, setStudents] = useState<any[]>([]);
  const [excellentClasses, setExcellentClasses] = useState<any[]>([]);
  const [collectiveAchievements, setCollectiveAchievements] = useState<any[]>([]);
  const [selectedAchievement, setSelectedAchievement] = useState<any | null>(null);
  const [globalStats, setGlobalStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const stats = [
    { id: 'exemplary', label: 'Công dân tiêu biểu', value: students.length.toString(), icon: Star, color: 'text-honor-gold', bg: 'bg-amber-50' },
    { id: 'collective', label: 'Thành tích tập thể', value: collectiveAchievements.length.toString(), icon: Users, color: 'text-secondary', bg: 'bg-secondary/10' },
  ];

  useEffect(() => {
    // Listen for global achievement stats
    const unsubscribeStats = onSnapshot(doc(db, 'achievement_stats', 'global'), (docSnap) => {
      if (docSnap.exists()) {
        setGlobalStats(docSnap.data());
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'achievement_stats/global');
    });

    // Listen for collective achievements
    const qCollective = query(collection(db, 'collective_achievements'), orderBy('createdAt', 'desc'));
    const unsubscribeCollective = onSnapshot(qCollective, (snapshot) => {
      const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setCollectiveAchievements(items);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'collective_achievements');
    });

    // Listen for exemplary members and sync with news
    const qMembers = query(collection(db, 'exemplary_members'), orderBy('createdAt', 'desc'));
    const unsubscribeMembers = onSnapshot(qMembers, (snapshot) => {
      const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      // Also fetch news items with category 'Gương sáng đội viên' to sync back
      const qNewsSync = query(
        collection(db, 'news'), 
        where('category', '==', 'Gương sáng đội viên')
      );
      
      getDocs(qNewsSync).then(newsSnap => {
        const newsMembers = newsSnap.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            name: data.title.replace('Công dân số tiêu biểu: ', ''),
            avatar: data.image,
            achievement: data.desc,
            rank: 'Công dân số tiêu biểu', // Default rank for news items
            schoolYear: 'Đang cập nhật',
            class: 'N/A',
            isFromNews: true,
            createdAt: data.createdAt
          };
        });
        
        // Combine and sort
        const now = new Date();
        const combined = [...items, ...newsMembers]
          .filter((item: any) => {
            if (item.publishedAt) {
              const pubDate = item.publishedAt.toDate ? item.publishedAt.toDate() : new Date(item.publishedAt);
              return pubDate <= now;
            }
            return true;
          })
          .sort((a: any, b: any) => {
            const timeA = a.publishedAt?.toMillis?.() || a.createdAt?.toMillis?.() || 0;
            const timeB = b.publishedAt?.toMillis?.() || b.createdAt?.toMillis?.() || 0;
            return timeB - timeA;
          });
        
        setStudents(combined);
        setLoading(false);
      });
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'exemplary_members');
    });

    // Listen for excellent classes
    const qClasses = query(collection(db, 'excellent_classes'), orderBy('createdAt', 'desc'));
    const unsubscribeClasses = onSnapshot(qClasses, (snapshot) => {
      const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setExcellentClasses(items);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'excellent_classes');
    });

    return () => {
      unsubscribeStats();
      unsubscribeMembers();
      unsubscribeClasses();
      unsubscribeCollective();
    };
  }, []);

  return (
    <div className="space-y-20 pb-24">
      {/* Hero */}
      <section className="bg-primary text-white py-24 px-6 text-center relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white/10 to-transparent pointer-events-none" />
        <motion.div 
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="max-w-4xl mx-auto space-y-8 relative z-10"
        >
          <Trophy className="w-20 h-20 text-honor-gold mx-auto drop-shadow-2xl" />
          <h1 className="text-5xl md:text-7xl font-black tracking-tight">Bảng Vàng Thành Tích</h1>
          <p className="text-xl md:text-2xl text-blue-100 font-medium">Tôn vinh những nỗ lực không ngừng nghỉ của tập thể giáo viên và đội viên {siteName} trong học tập và phong trào.</p>
        </motion.div>
      </section>

      {/* Stats */}
      <section className="max-w-7xl mx-auto px-6 -mt-32 relative z-20">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {stats.map((s, i) => (
            <motion.div
              key={s.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 + 0.5 }}
              className="bg-surface-container-lowest p-8 rounded-[32px] shadow-xl border border-outline-variant/30 flex items-center gap-6"
            >
              <div className={`w-16 h-16 rounded-2xl ${s.bg} flex items-center justify-center shrink-0`}>
                <s.icon className={`w-8 h-8 ${s.color}`} />
              </div>
              <div>
                <p className="text-sm font-bold text-on-surface-variant mb-1">{s.label}</p>
                <div className="flex items-center gap-2">
                  <p className={`text-4xl font-black ${s.color}`}>{s.value}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Collective Achievements */}
      <section className="max-w-7xl mx-auto px-6 space-y-12">
        <div className="flex items-center gap-4">
          <Flag className="w-10 h-10 text-secondary" />
          <h2 className="text-3xl md:text-4xl font-black text-on-surface">Thành tích Tập thể</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {collectiveAchievements.length > 0 ? collectiveAchievements.map((ach, i) => (
            <motion.div
              key={ach.id}
              initial={{ opacity: 0, x: i % 2 === 0 ? -20 : 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              onClick={() => setSelectedAchievement(ach)}
              className="group relative bg-white rounded-[40px] border border-outline-variant/30 overflow-hidden cursor-pointer hover:shadow-2xl transition-all"
            >
              <div className="flex flex-col md:flex-row h-full">
                <div className="md:w-2/5 relative aspect-video md:aspect-auto">
                  <img 
                    src={ach.certificateImage || null} 
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" 
                    alt={ach.title} 
                    loading="lazy"
                    decoding="async"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-black/20 group-hover:bg-black/0 transition-colors" />
                </div>
                <div className="md:w-3/5 p-8 flex flex-col justify-center space-y-4">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-secondary" />
                    <span className="text-xs font-black uppercase text-secondary tracking-widest">{ach.date}</span>
                  </div>
                  <h3 className="text-2xl font-black text-on-surface tracking-tight group-hover:text-secondary transition-colors line-clamp-2">{ach.title}</h3>
                  <p className="text-sm font-medium text-on-surface-variant line-clamp-3 leading-relaxed">{ach.content}</p>
                </div>
              </div>
              <div className="absolute bottom-4 right-4 p-3 bg-secondary/10 text-secondary rounded-xl opacity-0 group-hover:opacity-100 transition-all translate-y-2 group-hover:translate-y-0">
                <Plus size={20} />
              </div>
            </motion.div>
          )) : (
            <div className="col-span-full py-20 text-center bg-surface-subtle/50 rounded-[40px] border-2 border-dashed border-outline-variant">
               <p className="text-on-surface-variant font-medium">Chưa có thành tích tập thể nào được ghi nhận.</p>
            </div>
          )}
        </div>
      </section>

      {/* Student Hall of Fame */}
      <section className="max-w-7xl mx-auto px-6 space-y-12">
        <div className="flex items-center gap-4">
          <Star className="w-10 h-10 text-honor-gold fill-current" />
          <h2 className="text-3xl md:text-4xl font-black text-primary">Công dân số tiêu biểu</h2>
        </div>
        
        {loading ? (
          <div className="flex justify-center py-20">
             <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {students.length > 0 ? students.map((st, i) => (
              <motion.div
                key={st.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.1 }}
                onClick={() => navigate(`/tin-tuc/${st.id}`)}
                className="bg-surface-container-lowest rounded-[32px] overflow-hidden border border-outline-variant/30 hover:shadow-2xl hover:-translate-y-2 transition-all group cursor-pointer"
              >
                <div className="h-64 relative overflow-hidden">
                  <img 
                    src={st.avatar || "https://images.unsplash.com/photo-1544717297-fa95b3ee9643?w=800"} 
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
                    alt={st.name} 
                    loading="lazy"
                    decoding="async"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute top-4 right-4 px-4 py-1.5 bg-honor-gold text-primary font-bold rounded-full text-xs shadow-lg flex items-center gap-2">
                    <Award className="w-4 h-4" /> {st.rank}
                  </div>
                </div>
                <div className="p-8 space-y-4 text-center">
                  <h3 className="text-2xl font-bold text-on-surface tracking-tight">{st.name}</h3>
                  <p className="text-sm font-bold text-on-surface-variant flex items-center justify-center gap-2">
                    Năm: <span className="text-primary">{st.schoolYear}</span> • Khu phố: <span className="text-primary">{st.class}</span>
                  </p>
                  <div className="w-full h-px bg-outline-variant/30" />
                  <p className="text-sm font-medium text-trust-blue leading-relaxed">{st.achievement}</p>
                </div>
              </motion.div>
            )) : (
              <div className="col-span-full py-20 text-center bg-surface-subtle/50 rounded-[40px] border-2 border-dashed border-outline-variant">
                 <p className="text-on-surface-variant font-medium">Chưa có gương sáng đội viên nào được đăng tải.</p>
              </div>
            )}
          </div>
        )}
      </section>

      {/* Excellent Weekly Classes */}
      <section className="bg-surface-subtle py-24">
        <div className="max-w-7xl mx-auto px-6 space-y-12">
          <div className="flex items-center gap-4">
            <Sparkles className="w-10 h-10 text-pioneer-red" />
            <h2 className="text-3xl md:text-4xl font-black text-on-surface">Phong Trào Thi Đua Khu Vực</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {excellentClasses.length > 0 ? excellentClasses.slice(0, 4).map((week, i) => (
              <motion.div
                key={week.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="bg-white p-8 rounded-[40px] border border-outline-variant shadow-sm space-y-6 relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 p-4">
                   <div className="w-12 h-12 bg-amber-50 rounded-full flex items-center justify-center text-amber-600">
                      <Trophy size={20} />
                   </div>
                </div>
                <div>
                   <p className="text-[10px] font-black uppercase text-outline tracking-widest mb-1">{week.week}</p>
                   <h3 className="text-lg font-black text-primary">Vinh danh tập thể</h3>
                </div>
                <div className="space-y-3">
                   {[
                     { label: 'Khu vực I', class: week.grade6 },
                     { label: 'Khu vực II', class: week.grade7 },
                     { label: 'Khu vực III', class: week.grade8 },
                     { label: 'Khu vực IV', class: week.grade9 },
                   ].map((g) => (
                     <div key={g.label} className="flex justify-between items-center text-sm">
                        <span className="font-bold text-on-surface-variant">{g.label}</span>
                        <span className="px-3 py-1 bg-primary/5 text-primary rounded-lg font-black">{g.class}</span>
                     </div>
                   ))}
                </div>
              </motion.div>
            )) : (
              <div className="col-span-full py-20 text-center bg-white rounded-[40px] border border-outline-variant">
                 <p className="text-on-surface-variant font-medium italic">Thông tin các phong trào thi đua đang được cập nhật...</p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Collective Achievement Detail Modal */}
      <AnimatePresence>
        {selectedAchievement && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedAchievement(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 40 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 40 }}
              className="relative w-full max-w-5xl bg-white rounded-[48px] shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
            >
              <div className="absolute top-6 right-6 z-10">
                <button 
                  onClick={() => setSelectedAchievement(null)}
                  className="p-3 bg-black/20 hover:bg-black/40 text-white rounded-2xl backdrop-blur-md transition-all"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="overflow-y-auto">
                <div className="relative aspect-video">
                  <img 
                    src={selectedAchievement.certificateImage || null} 
                    className="w-full h-full object-cover" 
                    alt={selectedAchievement.title} 
                    loading="eager"
                    decoding="async"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex flex-col justify-end p-12 space-y-4">
                    <div className="flex items-center gap-3">
                      <Trophy className="w-8 h-8 text-honor-gold" />
                      <span className="px-4 py-1.5 bg-honor-gold text-primary font-black rounded-full text-xs tracking-widest uppercase shadow-lg">
                        {selectedAchievement.date}
                      </span>
                    </div>
                    <h2 className="text-4xl md:text-5xl font-black text-white tracking-tight leading-tight">{selectedAchievement.title}</h2>
                  </div>
                </div>

                <div className="p-12 md:p-16 space-y-12">
                  <div className="space-y-6">
                    <div className="flex items-center gap-3 text-secondary">
                      <Award className="w-6 h-6" />
                      <h3 className="text-xl font-black uppercase tracking-widest">Nội dung khen thưởng</h3>
                    </div>
                    <p className="text-xl md:text-2xl text-on-surface-variant font-medium leading-relaxed">
                      {selectedAchievement.content}
                    </p>
                  </div>

                  {selectedAchievement.gallery && selectedAchievement.gallery.length > 0 && (
                    <div className="space-y-6">
                      <div className="flex items-center gap-3 text-primary">
                        <Users className="w-6 h-6" />
                        <h3 className="text-xl font-black uppercase tracking-widest">Hình ảnh hoạt động</h3>
                      </div>
                      <div className="grid grid-cols-2 lg:grid-cols-3 gap-6">
                        {selectedAchievement.gallery.map((img: string, i: number) => (
                          <motion.div 
                            key={i}
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: i * 0.1 }}
                            className="aspect-square rounded-3xl overflow-hidden hover:shadow-2xl transition-all cursor-zoom-in"
                          >
                            <img 
                              src={img || null} 
                              className="w-full h-full object-cover hover:scale-110 transition-transform duration-700" 
                              alt={`Achievement gallery ${i + 1}`} 
                              loading="lazy"
                              decoding="async"
                              referrerPolicy="no-referrer"
                            />
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
