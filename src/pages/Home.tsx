import { motion, AnimatePresence } from 'motion/react';
import { ArrowRight, Trophy, Users, Flag, Calendar, Sparkles, ChevronLeft, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useState, useEffect, useRef, useCallback } from 'react';
import { db } from '../lib/firebase';
import { cn } from '@/src/lib/utils';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { useSiteSettings } from '../contexts/SiteContext';

export default function Home() {
  const { siteName } = useSiteSettings();
  const [latestNews, setLatestNews] = useState<any[]>([]);
  const [featuredPosts, setFeaturedPosts] = useState<any[]>([]);
  const [schedules, setSchedules] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const stopAutoPlay = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const startAutoPlay = useCallback(() => {
    stopAutoPlay();
    if (featuredPosts.length <= 1) return;
    
    timerRef.current = setInterval(() => {
      setCurrentIndex(prev => (prev + 1) % featuredPosts.length);
    }, 5000);
  }, [featuredPosts.length, stopAutoPlay]);

  const getContentSnippet = (content: string, length: number = 160) => {
    if (!content) return '';
    const plainText = content
      .replace(/[#*`_~]/g, '')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/\s+/g, ' ')
      .trim();
    return plainText.length > length ? plainText.substring(0, length) + '...' : plainText;
  };

  const getMillis = (dateObj: any) => {
    if (!dateObj) return 0;
    if (typeof dateObj.toMillis === 'function') return dateObj.toMillis();
    if (dateObj instanceof Date) return dateObj.getTime();
    if (dateObj.seconds !== undefined) return dateObj.seconds * 1000 + (dateObj.nanoseconds || 0) / 1000000;
    const parsed = new Date(dateObj);
    return isNaN(parsed.getTime()) ? 0 : parsed.getTime();
  };

  const getRecentBadge = (item: any) => {
    const pubMillis = getMillis(item.publishedAt) || getMillis(item.createdAt);
    if (!pubMillis) return null;
    const now = Date.now();
    const diff = now - pubMillis;
    const isWithin24h = diff > 0 && diff <= 24 * 60 * 60 * 1000;
    if (!isWithin24h) return null;

    const isHot = (item.views || 0) >= 150 || item.featured;
    return isHot ? { text: 'Nóng 🔥', type: 'hot' } : { text: 'Mới ✨', type: 'new' };
  };

  useEffect(() => {
    let currentNews: any[] = [];
    let currentMembers: any[] = [];
    let currentCollective: any[] = [];

    const updateCombined = () => {
      const bufferTime = 30 * 60 * 1000;
      const now = new Date(Date.now() + bufferTime);

      const items = [...currentNews, ...currentMembers, ...currentCollective]
        .filter(item => {
          if (item.publishedAt) {
            const pubMillis = getMillis(item.publishedAt);
            return pubMillis <= now.getTime();
          }
          return true;
        })
        .sort((a, b) => {
          const timeA = getMillis(a.publishedAt) || getMillis(a.createdAt);
          const timeB = getMillis(b.publishedAt) || getMillis(b.createdAt);
          return timeB - timeA;
        });
      
      const featured = items.filter(item => item.featured);
      setFeaturedPosts(featured);

      // Always show the 3 most recent items in the latest news section
      setLatestNews(items.slice(0, 3));
      setLoading(false);
    };

    const newsRef = collection(db, 'news');
    const q = query(newsRef, orderBy('publishedAt', 'desc'), limit(20));
    const unsubscribeNews = onSnapshot(q, (snapshot) => {
      currentNews = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        date: (doc.data() as any).date || ((doc.data() as any).createdAt?.toDate?.()?.toLocaleDateString('vi-VN'))
      } as any));
      updateCombined();
    }, (error) => {
      console.error("Error listening to news", error);
    });

    const membersRef = collection(db, 'exemplary_members');
    const unsubscribeMembers = onSnapshot(membersRef, (snapshot) => {
      currentMembers = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          title: `Công dân số tiêu biểu: ${data.name}`,
          category: 'Cư dân tiêu biểu',
          image: data.avatar,
          desc: `${data.rank} - Khu phố ${data.class}. ${data.achievement}`,
          isFromExemplary: true,
          date: data.createdAt?.toDate?.()?.toLocaleDateString('vi-VN') || 'Đang cập nhật',
          createdAt: data.createdAt
        };
      });
      updateCombined();
    });

    const collectiveRef = collection(db, 'collective_achievements');
    const unsubscribeCollective = onSnapshot(collectiveRef, (snapshot) => {
      currentCollective = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          title: `Thành tích: ${data.title}`,
          category: 'Tin hoạt động',
          image: data.certificateImage,
          desc: data.content,
          isFromCollective: true,
          date: data.date || 'Đang cập nhật',
          createdAt: data.createdAt
        };
      });
      updateCombined();
    });

    const schedulesRef = collection(db, 'schedules');
    const sq = query(schedulesRef, orderBy('date', 'asc'), limit(3));
    const unsubscribeSchedules = onSnapshot(sq, (snapshot) => {
      const items = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setSchedules(items);
    });

    return () => {
      unsubscribeNews();
      unsubscribeMembers();
      unsubscribeCollective();
      unsubscribeSchedules();
    };
  }, []);

  useEffect(() => {
    if (featuredPosts.length > 1) {
      startAutoPlay();
    }
    return () => stopAutoPlay();
  }, [featuredPosts.length, startAutoPlay, stopAutoPlay]);

  const handleNext = useCallback(() => {
    stopAutoPlay();
    setCurrentIndex(prev => (prev + 1) % featuredPosts.length);
    startAutoPlay();
  }, [featuredPosts.length, stopAutoPlay, startAutoPlay]);

  const handlePrev = useCallback(() => {
    stopAutoPlay();
    setCurrentIndex(prev => (prev - 1 + featuredPosts.length) % featuredPosts.length);
    startAutoPlay();
  }, [featuredPosts.length, stopAutoPlay, startAutoPlay]);

  const paginate = (newDirection: number) => {
    if (newDirection > 0) handleNext();
    else handlePrev();
  };

  const features = [
    { name: 'Tin tức', icon: Calendar, color: 'bg-blue-50 text-blue-600', link: '/tin-tuc?category=Tin hoạt động' },
    { name: 'Thông báo', icon: Sparkles, color: 'bg-amber-50 text-amber-600', link: '/tin-tuc?category=Thông báo' },
    { name: 'Hội thi & Hoạt động', icon: Flag, color: 'bg-red-50 text-red-600', link: '/hoat-dong' },
    { name: 'Lịch hoạt động', icon: Calendar, color: 'bg-emerald-50 text-emerald-600', link: '/lich-hoat-dong' },
  ];

  return (
    <div className="space-y-16 pb-20">
      {/* Hero Banner Slider */}
      <section className="relative w-full px-6 pt-12 pb-24 overflow-hidden">
        <div 
          className="max-w-7xl mx-auto relative min-h-[450px] md:min-h-[570px]"
          onMouseEnter={stopAutoPlay}
          onMouseLeave={startAutoPlay}
        >
          <AnimatePresence>
            <motion.div 
              key={featuredPosts[currentIndex]?.id || 'empty'}
              initial={{ opacity: 0, x: 100 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -100 }}
              transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.2}
              onDragEnd={(_, info) => {
                if (info.offset.x > 100) handlePrev();
                else if (info.offset.x < -100) handleNext();
              }}
              className="absolute inset-0 rounded-[48px] overflow-hidden shadow-2xl group cursor-grab active:cursor-grabbing"
            >
              <img 
                src={featuredPosts[currentIndex]?.image || "https://lh3.googleusercontent.com/aida-public/AB6AXuDdXOyNGZgKBj3LPOp1FvDF0t7kLQqDDX40b1nbK4sTzHf4lNcboPGnEJmE1FQBOqwZKcfY7nK8OsA2h53Q_WzGXqTOm2EsO45MSunHkeHqGYDALuMtos0tN23UqFfugswGlzAsEkheZ0Scyf1ma1yew5K9rPzyF9WZJF7OSEQ_7wpNX4b-8GsTI-mQksdDNnWLiNopDDKP3ICOkB3n2wJvdrxXpoRlfa2trNGvUjBfyEAtIUcVJdF94IvxvRe5WYFxcv1nEDehf64"} 
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105"
                alt={featuredPosts[currentIndex]?.title || "Hero Banner"}
                loading="eager"
                decoding="async"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-primary/95 via-primary/50 to-transparent flex items-center">
                <div className="p-8 md:p-16 max-w-2xl space-y-6">
                  <div className="flex flex-wrap items-center gap-3">
                    <motion.span 
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.3 }}
                      className="inline-block px-4 py-1.5 bg-pioneer-red text-white text-xs font-bold rounded-full uppercase tracking-widest shadow-lg"
                    >
                      Tin mới nổi bật
                    </motion.span>
                    {featuredPosts[currentIndex] && getRecentBadge(featuredPosts[currentIndex]) && (
                      <motion.span
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.35 }}
                        className={cn(
                          "inline-block px-4 py-1.5 text-xs font-black rounded-full uppercase tracking-widest shadow-lg border",
                          getRecentBadge(featuredPosts[currentIndex])?.type === 'hot'
                            ? "bg-amber-500 text-black border-amber-400 animate-pulse"
                            : "bg-emerald-500 text-white border-emerald-400"
                        )}
                      >
                        {getRecentBadge(featuredPosts[currentIndex])?.text}
                      </motion.span>
                    )}
                  </div>
                  <motion.h1 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="text-4xl md:text-6xl font-extrabold text-white leading-tight"
                  >
                    {featuredPosts[currentIndex]?.title || "Cổng thông tin điện tử Phường Cát Lái Số!"}
                  </motion.h1>
                  <p className="text-white/80 line-clamp-2 text-lg font-medium">
                    {featuredPosts[currentIndex]?.desc || (featuredPosts[currentIndex]?.content ? getContentSnippet(featuredPosts[currentIndex].content, 180) : `Cùng theo dõi các hoạt động sôi nổi và những thành tích rực rỡ của ${siteName}.`)}
                  </p>
                  <Link 
                    to={featuredPosts[currentIndex] ? `/tin-tuc/${featuredPosts[currentIndex].id}` : "/tin-tuc"} 
                    className="inline-flex items-center gap-3 px-8 py-4 bg-white text-primary rounded-2xl font-bold hover:shadow-2xl transition-all hover:-translate-y-1 active:scale-95"
                  >
                    {featuredPosts[currentIndex] ? "Đọc bài viết" : "Xem tất cả tin tức"}
                    <ArrowRight className="w-5 h-5" />
                  </Link>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Navigation Controls */}
          {featuredPosts.length > 1 && (
            <>
              <div className="absolute bottom-8 right-8 flex items-center gap-4 z-20">
                <button 
                  onClick={handlePrev}
                  className="w-12 h-12 bg-white/10 backdrop-blur-md border border-white/20 text-white rounded-full flex items-center justify-center hover:bg-white hover:text-primary transition-all active:scale-95"
                >
                  <ChevronLeft size={24} />
                </button>
                <button 
                  onClick={handleNext}
                  className="w-12 h-12 bg-white/10 backdrop-blur-md border border-white/20 text-white rounded-full flex items-center justify-center hover:bg-white hover:text-primary transition-all active:scale-95"
                >
                  <ChevronRight size={24} />
                </button>
              </div>

              {/* Progress Indicators */}
              <div className="absolute left-8 md:left-16 bottom-8 flex items-center gap-2 z-20">
                {featuredPosts.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      stopAutoPlay();
                      setCurrentIndex(idx);
                      startAutoPlay();
                    }}
                    className={cn(
                      "h-1.5 rounded-full transition-all duration-500",
                      currentIndex === idx ? "w-8 bg-white" : "w-2 bg-white/30"
                    )}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </section>

      {/* Quick Access */}
      <section className="max-w-7xl mx-auto px-6 -mt-32 relative z-10">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          {features.map((f, i) => (
            <motion.div
              key={f.name}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 + 0.5 }}
            >
              <Link 
                to={f.link}
                className="flex flex-col items-center justify-center p-6 md:p-8 bg-surface-container-lowest border border-outline-variant/30 rounded-2xl shadow-lg hover:shadow-xl hover:-translate-y-2 transition-all group"
              >
                <div className={`p-4 rounded-2xl mb-4 ${f.color} transition-colors group-hover:bg-primary group-hover:text-white`}>
                  <f.icon className="w-8 h-8" />
                </div>
                <span className="font-bold text-sm md:text-base text-on-surface group-hover:text-primary">{f.name}</span>
              </Link>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Featured News & Activity */}
      <section className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-12 gap-12">
        <div className="lg:col-span-8 space-y-10">
          <div className="flex items-center justify-between">
            <h2 className="text-3xl font-extrabold text-primary border-l-8 border-pioneer-red pl-6">Tin tức mới nhất</h2>
            <Link to="/tin-tuc" className="text-sm font-bold text-primary hover:underline">Tất cả bài viết</Link>
          </div>

          <div className="space-y-8">
            {loading ? (
              <div className="space-y-8">
                <div className="h-64 bg-white/50 animate-pulse rounded-3xl" />
                <div className="h-64 bg-white/50 animate-pulse rounded-3xl" />
              </div>
            ) : latestNews.length > 0 ? (
              latestNews.map((news, i) => (
                <motion.article 
                  key={news.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="bg-surface-container-lowest rounded-3xl overflow-hidden shadow-sm border border-outline-variant/20 flex flex-col md:flex-row group hover:shadow-xl transition-all"
                >
                  <div className="md:w-1/3 h-56 md:h-auto overflow-hidden relative">
                    <img 
                      src={news.image || 'https://images.unsplash.com/photo-1546410531-bb4caa6b424d?auto=format&fit=crop&q=80&w=2071'} 
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                      alt={news.title}
                      loading="lazy"
                      decoding="async"
                      referrerPolicy="no-referrer"
                    />
                    {getRecentBadge(news) && (
                      <div className={cn(
                        "absolute top-4 left-4 px-3 py-1.5 rounded-xl text-xs font-black shadow-lg z-10 uppercase tracking-widest",
                        getRecentBadge(news)?.type === 'hot' 
                          ? "bg-amber-500 text-black border border-amber-400 animate-pulse" 
                          : "bg-emerald-500 text-white border border-emerald-400"
                      )}>
                        {getRecentBadge(news)?.text}
                      </div>
                    )}
                  </div>
                  <div className="p-8 flex-1 space-y-4">
                    <div className="flex items-center gap-3 text-xs font-bold text-on-surface-variant uppercase tracking-wider">
                      <span className="text-secondary font-black">{news.category}</span>
                      <span className="w-1 h-1 bg-outline-variant rounded-full"></span>
                      <span>{news.date}</span>
                    </div>
                    <h3 className="text-2xl font-bold text-on-surface group-hover:text-primary transition-colors line-clamp-2">{news.title}</h3>
                    <p className="text-on-surface-variant text-sm line-clamp-2">
                      {news.desc || (news.content ? getContentSnippet(news.content, 150) : 'Đẩy mạnh các hoạt động chuyển đổi số toàn diện và cải cách thủ tục hành chính tại Phường Cát Lái...')}
                    </p>
                    <Link to={`/tin-tuc/${news.id}`} className="inline-flex items-center gap-2 font-bold text-primary group/link">
                      Đọc tiếp <ArrowRight className="w-4 h-4 group-hover/link:translate-x-1 transition-transform" />
                    </Link>
                  </div>
                </motion.article>
              ))
            ) : (
              <div className="p-20 bg-surface-subtle rounded-3xl text-center border-2 border-dashed border-outline-variant">
                <p className="text-on-surface-variant font-medium italic">Hiện chưa có tin tức mới.</p>
              </div>
            )}
          </div>
        </div>

        <aside className="lg:col-span-4 space-y-10">
          <div className="bg-surface-container-lowest rounded-3xl p-8 border border-outline-variant/30 shadow-sm space-y-8">
            <h3 className="text-xl font-bold text-on-surface flex items-center gap-3">
              <Calendar className="w-6 h-6 text-primary" />
              Lịch tuần này
            </h3>
            <div className="space-y-6">
              {schedules.length > 0 ? (
                schedules.map((ev, i) => {
                  const dateObj = new Date(ev.date);
                  const daysShort = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
                  const dayLabel = daysShort[dateObj.getDay()];
                  const dateLabel = dateObj.getDate();
                  
                  return (
                    <Link 
                      key={ev.id} 
                      to="/lich-hoat-dong"
                      className="flex gap-4 items-center group cursor-pointer p-2 rounded-xl hover:bg-surface-subtle transition-colors"
                    >
                      <div className={cn(
                        "w-14 h-14 rounded-2xl flex flex-col items-center justify-center text-white shrink-0",
                        i === 0 ? "bg-primary" : i === 1 ? "bg-pioneer-red" : "bg-honor-gold"
                      )}>
                        <span className="text-xs font-bold opacity-80">{dayLabel}</span>
                        <span className="text-lg font-black leading-none">{dateLabel}</span>
                      </div>
                      <div className="space-y-1">
                        <h4 className="font-bold text-on-surface group-hover:text-primary transition-colors line-clamp-1">{ev.title}</h4>
                        <p className="text-xs text-on-surface-variant line-clamp-1">{ev.time} • {ev.location}</p>
                      </div>
                    </Link>
                  );
                })
              ) : (
                <p className="text-sm text-on-surface-variant italic py-4">Hiện chưa có lịch hoạt động.</p>
              )}
            </div>
            <Link 
              to="/lich-hoat-dong"
              className="block w-full py-4 text-center text-sm font-bold text-on-surface-variant border-2 border-outline-variant rounded-2xl hover:bg-surface-subtle transition-all"
            >
              Xem lịch chi tiết
            </Link>
          </div>

          <div className="bg-trust-blue rounded-3xl p-8 text-white relative overflow-hidden group">
            <div className="relative z-10 space-y-4">
              <h3 className="text-xl font-bold">Thư viện Ảnh</h3>
              <p className="text-sm opacity-80 leading-relaxed">Khoảnh khắc đáng nhớ của các hoạt động tại {siteName}.</p>
              <div className="pt-4 flex justify-end">
                <div className="p-4 bg-white/10 rounded-2xl group-hover:bg-white/20 transition-all cursor-pointer">
                  <Sparkles className="w-10 h-10" />
                </div>
              </div>
            </div>
            <motion.div 
               animate={{ rotate: 45, scale: 1.5 }}
               className="absolute -right-8 -bottom-8 w-32 h-32 bg-white/5 rounded-full"
            />
          </div>
        </aside>
      </section>

      {/* Hero-like footer CTA */}
      <section className="bg-surface-subtle py-24 text-center space-y-8">
        <div className="max-w-4xl mx-auto px-6">
          <Users className="w-16 h-16 text-primary mx-auto mb-6" />
          <h2 className="text-4xl md:text-5xl font-black text-primary mb-4 leading-tight">Chuyển đổi số toàn diện - Thúc đẩy tương lai</h2>
          <p className="text-xl text-on-surface-variant mb-12">Chung tay cùng đô thị Phường Cát Lái Số để rèn luyện kỹ năng công dân số và thúc đẩy cuộc sống thông minh hơn.</p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link to="/hoat-dong" className="px-10 py-5 bg-primary text-white font-bold rounded-2xl shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all active:scale-95">Tham gia ngay</Link>
            <Link to="/lien-he" className="px-10 py-5 bg-white text-primary border-2 border-primary font-bold rounded-2xl hover:bg-primary/5 transition-all active:scale-95">Liên hệ với chúng tôi</Link>
          </div>
        </div>
      </section>
    </div>
  );
}
