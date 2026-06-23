import { motion, AnimatePresence } from 'motion/react';
import { Search, Filter, ArrowRight, Play, Eye, MessageSquare, ChevronLeft, ChevronRight, Sparkles, ImagePlus, Upload, X } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { cn } from '@/src/lib/utils';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, getDocs, query, orderBy, onSnapshot } from 'firebase/firestore';
import { useSiteSettings } from '../contexts/SiteContext';

export default function News() {
  const { siteName } = useSiteSettings();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialCategory = searchParams.get('category') || 'Tất cả';
  
  const [newsItems, setNewsItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState(initialCategory);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const newsSectionRef = useRef<HTMLDivElement>(null);

  const itemsPerPage = 6;

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
    // If the category parameter changes, update the filter state
    const cat = searchParams.get('category');
    if (cat) {
      setFilter(cat);
      setCurrentPage(1);
    }
  }, [searchParams]);

  useEffect(() => {
    let unsubscribeNews: (() => void) | undefined;
    let unsubscribeMembers: (() => void) | undefined;
    let unsubscribeCollective: (() => void) | undefined;
    
    let currentNews: any[] = [];
    let currentMembers: any[] = [];
    let currentCollective: any[] = [];

    const updateCombined = () => {
      const bufferTime = 30 * 60 * 1000;
      const now = new Date(Date.now() + bufferTime);

      const combined = [...currentNews, ...currentMembers, ...currentCollective]
        .filter((item: any) => {
          if (item.publishedAt) {
            const pubMillis = getMillis(item.publishedAt);
            return pubMillis <= now.getTime();
          }
          return true;
        })
        .sort((a: any, b: any) => {
          const timeA = getMillis(a.publishedAt) || getMillis(a.createdAt);
          const timeB = getMillis(b.publishedAt) || getMillis(b.createdAt);
          return timeB - timeA;
        });

      setNewsItems(combined);
      setLoading(false);
    };

    try {
      const newsRef = collection(db, 'news');
      const q = query(newsRef, orderBy('publishedAt', 'desc'));
      unsubscribeNews = onSnapshot(q, (snapshot) => {
        currentNews = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          date: (doc.data() as any).date || ((doc.data() as any).createdAt?.toDate?.()?.toLocaleDateString('vi-VN'))
        }));
        updateCombined();
      });

      const membersRef = collection(db, 'exemplary_members');
      unsubscribeMembers = onSnapshot(membersRef, (snapshot) => {
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
      unsubscribeCollective = onSnapshot(collectiveRef, (snapshot) => {
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
    } catch (error) {
      console.error("Error setting up listeners:", error);
      setLoading(false);
    }

    return () => {
      unsubscribeNews?.();
      unsubscribeMembers?.();
      unsubscribeCollective?.();
    };
  }, []);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    newsSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const categories = ['Tất cả', 'Tin hoạt động', 'Thông báo', 'Gương sáng đội viên', 'Video'];

  const filteredNews = newsItems.filter(item => {
    const matchesFilter = filter === 'Tất cả' || item.category === filter;
    const matchesSearch = item.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (item.desc?.toLowerCase().includes(searchTerm.toLowerCase()) || false) ||
                          (item.content?.toLowerCase().includes(searchTerm.toLowerCase()) || false);
    return matchesFilter && matchesSearch;
  });

  const getCategoryCount = (cat: string) => {
    if (cat === 'Tất cả') return newsItems.length;
    return newsItems.filter(item => item.category === cat).length;
  };

  const getContentSnippet = (content: string, length: number = 160) => {
    if (!content) return '';
    // Simple markdown stripping
    const plainText = content
      .replace(/[#*`_~]/g, '') // Remove basic MD markers
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Remove links
      .replace(/\s+/g, ' ') // Normalize spaces
      .trim();
    return plainText.length > length ? plainText.substring(0, length) + '...' : plainText;
  };

  const handleFilterChange = (cat: string) => {
    setFilter(cat);
    setCurrentPage(1);
    // Update URL without reloading
    const params = new URLSearchParams(window.location.search);
    if (cat === 'Tất cả') {
      params.delete('category');
    } else {
      params.set('category', cat);
    }
    navigate(`/tin-tuc?${params.toString()}`, { replace: true });
  };

  const featuredNews = filteredNews.find(item => item.featured);
  const otherNews = filteredNews.filter(item => item.id !== (featuredNews?.id || ''));

  const totalPages = Math.ceil(otherNews.length / itemsPerPage);
  const currentOtherNews = otherNews.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const [selectedVideo, setSelectedVideo] = useState<string | null>(null);

  const getYoutubeId = (url: string) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  return (
    <div className="min-h-screen bg-surface-subtle selection:bg-primary/10">
      {/* Video Modal */}
      <AnimatePresence>
        {selectedVideo && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-10 bg-black/90 backdrop-blur-sm"
            onClick={() => setSelectedVideo(null)}
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative w-full max-w-5xl aspect-video bg-black rounded-[32px] overflow-hidden shadow-2xl"
              onClick={e => e.stopPropagation()}
            >
              <button 
                onClick={() => setSelectedVideo(null)}
                className="absolute top-6 right-6 z-10 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-all hover:scale-110"
              >
                <X size={24} />
              </button>
              {getYoutubeId(selectedVideo) ? (
                <iframe 
                  src={`https://www.youtube.com/embed/${getYoutubeId(selectedVideo)}?autoplay=1`}
                  className="w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              ) : (
                <video src={selectedVideo} controls autoPlay className="w-full h-full" />
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-7xl mx-auto px-6 py-12 lg:py-20 space-y-12" ref={newsSectionRef}>
      <section className="space-y-4">
        <h1 className="text-4xl md:text-6xl font-black text-primary tracking-tight">Tin tức Cát Lái Số</h1>
        <p className="text-on-surface-variant max-w-2xl text-lg font-medium">Cập nhật những tin tức đô thị mới nhất, thông báo quan trọng từ Ủy ban Nhân dân và các gương sáng công dân số tiêu biểu của {siteName}.</p>
      </section>

      {/* Search Bar */}
      <div className="max-w-xl">
        <div className="relative group">
          <input 
            type="text" 
            placeholder="Tìm kiếm tin tức..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full h-16 pl-14 pr-6 bg-white rounded-2xl border border-outline-variant/30 shadow-sm focus:ring-4 focus:ring-primary/10 transition-all outline-none font-bold text-sm"
          />
          <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-primary w-5 h-5" />
          {searchTerm && (
            <button 
              onClick={() => setSearchTerm('')}
              className="absolute right-6 top-1/2 -translate-y-1/2 p-2 hover:bg-surface-subtle rounded-full"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="space-y-6">
        <div className="flex items-center gap-2 text-primary">
          <Filter size={20} />
          <span className="text-xs font-black uppercase tracking-widest">Chuyên mục</span>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => handleFilterChange(cat)}
              className={cn(
                "px-6 py-3 rounded-2xl text-sm font-bold transition-all whitespace-nowrap flex items-center gap-3 border-2",
                filter === cat 
                  ? "bg-primary text-white border-primary shadow-lg shadow-primary/20 scale-105" 
                  : "bg-white text-on-surface-variant border-outline-variant/30 hover:border-primary/30 hover:text-primary"
              )}
            >
              {cat}
              <span className={cn(
                "px-2 py-0.5 rounded-lg text-[10px] font-black",
                filter === cat ? "bg-white/20 text-white" : "bg-surface-subtle text-outline"
              )}>
                {getCategoryCount(cat)}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
        {/* Main News List */}
        <div className="lg:col-span-8 space-y-12">
          {loading ? (
            <div className="space-y-12">
              <div className="w-full h-[500px] bg-white rounded-[48px] animate-pulse" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="h-96 bg-white rounded-[40px] animate-pulse" />
                <div className="h-96 bg-white rounded-[40px] animate-pulse" />
              </div>
            </div>
          ) : filteredNews.length > 0 ? (
            <>
              {/* Featured Large Card */}
              {featuredNews && (
                <motion.article 
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="relative rounded-[48px] overflow-hidden group shadow-2xl min-h-[500px]"
                >
                  <img 
                    src={featuredNews.image || 'https://images.unsplash.com/photo-1546410531-bb4caa6b424d?auto=format&fit=crop&q=80&w=2071'} 
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105" 
                    alt={featuredNews.title} 
                    loading="eager"
                    decoding="async"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent p-12 flex flex-col justify-end text-white">
                    <div className="flex flex-wrap items-center gap-4 mb-4">
                      <span className="px-4 py-1 bg-pioneer-red rounded-lg text-xs font-bold w-fit">{featuredNews.category}</span>
                      <span className="flex items-center gap-1 px-3 py-1 bg-amber-500 rounded-lg text-xs font-bold w-fit text-black">
                        <Sparkles size={12} /> NỔI BẬT
                      </span>
                      {getRecentBadge(featuredNews) && (
                        <span className={cn(
                          "px-3 py-1 rounded-lg text-xs font-black inline-flex items-center gap-1 shadow-sm",
                          getRecentBadge(featuredNews)?.type === 'hot' 
                            ? "bg-amber-500 text-black border border-amber-400 animate-pulse" 
                            : "bg-emerald-500 text-white border border-emerald-400"
                        )}>
                          {getRecentBadge(featuredNews)?.text}
                        </span>
                      )}
                    </div>
                    <h2 className="text-3xl md:text-5xl font-black mb-4 leading-tight group-hover:text-amber-400 transition-colors uppercase tracking-tighter">{featuredNews.title}</h2>
                    <p className="text-zinc-300 max-w-2xl line-clamp-2 md:line-clamp-3 mb-6 text-sm md:text-base font-medium">
                      {featuredNews.desc || getContentSnippet(featuredNews.content, 200)}
                    </p>
                    
                    <div className="flex items-center gap-6">
                      <button 
                        onClick={() => navigate(`/tin-tuc/${featuredNews.id}`)}
                        className="flex items-center gap-3 font-bold text-sm hover:translate-x-2 transition-transform bg-white/20 hover:bg-white/30 backdrop-blur-md px-6 py-3 rounded-2xl border border-white/20"
                      >
                        XEM CHI TIẾT <ArrowRight className="w-5 h-5" />
                      </button>
                      {featuredNews.videoUrl && (
                        <button 
                          onClick={() => setSelectedVideo(featuredNews.videoUrl)}
                          className="flex items-center gap-3 font-bold text-sm bg-primary text-white px-6 py-3 rounded-2xl shadow-xl shadow-primary/20 hover:scale-105 transition-all"
                        >
                          <Play size={18} fill="currentColor" /> XEM VIDEO
                        </button>
                      )}
                    </div>
                  </div>
                </motion.article>
              )}

              {/* Grid of smaller cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {currentOtherNews.map((item) => (
                  <motion.article 
                    key={item.id}
                    whileHover={{ y: -8 }}
                    className="bg-surface-container-lowest rounded-[40px] overflow-hidden border border-outline-variant/30 shadow-sm hover:shadow-xl transition-all group"
                  >
                    <div className="h-56 overflow-hidden relative">
                      <img 
                        src={item.image || 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&q=80&w=2070'} 
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" 
                        alt={item.title} 
                        loading="lazy"
                        decoding="async"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute top-6 left-6 px-4 py-1.5 bg-white/90 backdrop-blur text-primary rounded-xl text-xs font-black shadow-sm">
                        {item.category}
                      </div>
                      {getRecentBadge(item) && (
                        <div className={cn(
                          "absolute top-6 right-6 px-3 py-1.5 rounded-xl text-xs font-black shadow-md z-10 uppercase tracking-widest",
                          getRecentBadge(item)?.type === 'hot' 
                            ? "bg-amber-500 text-black border border-amber-400 animate-pulse" 
                            : "bg-emerald-500 text-white border border-emerald-400"
                        )}>
                          {getRecentBadge(item)?.text}
                        </div>
                      )}
                      {item.videoUrl && (
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedVideo(item.videoUrl);
                          }}
                          className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/40 transition-colors"
                        >
                          <div className="w-14 h-14 bg-primary text-white rounded-full flex items-center justify-center shadow-2xl scale-90 group-hover:scale-100 transition-transform">
                            <Play size={24} fill="currentColor" />
                          </div>
                        </button>
                      )}
                    </div>
                    <div className="p-8 space-y-4">
                      <span className="text-xs font-bold text-on-surface-variant/60">{item.date}</span>
                      <h3 className="text-xl font-bold text-on-surface group-hover:text-primary transition-colors leading-tight line-clamp-2">{item.title}</h3>
                      <p className="text-sm text-on-surface-variant line-clamp-2 leading-relaxed font-medium">
                        {item.desc || getContentSnippet(item.content, 150) || 'Đẩy mạnh các hoạt động chuyển đổi số văn minh và cải cách hành chính tại Phường Cát Lái...'}
                      </p>
                      <div className="flex items-center justify-between pt-2">
                        <button 
                          onClick={() => navigate(`/tin-tuc/${item.id}`)}
                          className="text-primary font-bold text-sm flex items-center gap-2 hover:translate-x-1 transition-transform"
                        >
                          Xem chi tiết <ArrowRight className="w-4 h-4" />
                        </button>
                        {item.videoUrl && <Play size={16} className="text-primary animate-pulse" />}
                      </div>
                    </div>
                  </motion.article>
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-4 pt-10">
                  <button 
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="p-3 border border-outline-variant rounded-xl text-on-surface-variant hover:bg-surface-subtle disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                  >
                    <ChevronLeft size={20} />
                  </button>
                  {[...Array(totalPages)].map((_, i) => (
                    <button
                      key={i}
                      onClick={() => handlePageChange(i + 1)}
                      className={cn(
                        "w-12 h-12 rounded-xl font-black text-sm transition-all shadow-sm",
                        currentPage === i + 1 
                          ? "bg-primary text-white shadow-primary/20 scale-110" 
                          : "bg-surface text-on-surface-variant hover:bg-surface-subtle"
                      )}
                    >
                      {i + 1}
                    </button>
                  ))}
                  <button 
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="p-3 border border-outline-variant rounded-xl text-on-surface-variant hover:bg-surface-subtle disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                  >
                    <ChevronRight size={20} />
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="bg-surface-subtle rounded-[40px] p-20 text-center space-y-4 border-2 border-dashed border-outline-variant">
              <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto text-on-surface-variant/20">
                <Search size={40} />
              </div>
              <h3 className="text-2xl font-black text-on-surface">Không tìm thấy tin tức</h3>
              <p className="text-on-surface-variant">Hãy thử tìm kiếm với từ khóa khác hoặc xóa bộ lọc.</p>
              <button 
                onClick={() => { setSearchTerm(''); setFilter('Tất cả'); }}
                className="px-8 py-3 bg-primary text-white rounded-2xl font-bold shadow-lg shadow-primary/20 hover:scale-105 transition-all"
              >
                Xóa tất cả bộ lọc
              </button>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <aside className="lg:col-span-4 space-y-12">
          {/* Search Sidebar (Hidden or changed) */}
          <div className="bg-surface-container-lowest p-8 rounded-[40px] border border-outline-variant/30 shadow-sm relative overflow-hidden">
            <h3 className="text-xl font-black text-on-surface mb-6 flex items-center gap-3"><Search className="text-primary" /> Từ khóa hot</h3>
            <div className="flex flex-wrap gap-2">
              {['Hội trại', '26/3', 'Khen thưởng', 'Học kỳ quân đội', 'Văn nghệ'].map(tag => (
                <button 
                  key={tag}
                  onClick={() => setSearchTerm(tag)}
                  className="px-4 py-2 bg-surface-subtle hover:bg-primary/10 hover:text-primary rounded-xl text-xs font-bold transition-all"
                >
                  #{tag}
                </button>
              ))}
            </div>
          </div>

          {/* Top viewed */}
          <div className="bg-surface-container-lowest p-8 rounded-[40px] border border-outline-variant/30 shadow-sm space-y-8">
            <h3 className="text-xl font-black text-on-surface">Tin xem nhiều nhất</h3>
            <div className="space-y-8">
              {newsItems
                .filter(item => !item.category?.includes('Video')) // Optional: exclude videos or not
                .sort((a, b) => (b.views || 0) - (a.views || 0))
                .slice(0, 5)
                .map((item, i) => (
                <div 
                  key={item.id} 
                  className="flex gap-6 group cursor-pointer"
                  onClick={() => navigate(`/tin-tuc/${item.id}`)}
                >
                  <span className="text-3xl font-black text-outline-variant group-hover:text-primary transition-colors">0{i + 1}</span>
                  <div className="space-y-1">
                    <h4 className="font-bold text-on-surface group-hover:text-primary transition-colors text-sm leading-tight line-clamp-2">{item.title}</h4>
                    <span className="text-[10px] uppercase font-black text-outline tracking-widest">{(item.views || 0).toLocaleString()} lượt xem</span>
                  </div>
                </div>
              ))}
              {newsItems.length === 0 && (
                <p className="text-xs text-on-surface-variant italic">Chưa có dữ liệu thống kê.</p>
              )}
            </div>
          </div>

          {/* Newsletter */}
          <div className="bg-secondary p-10 rounded-[40px] text-white space-y-8 relative overflow-hidden">
            <Sparkles className="absolute -right-10 top-1/2 -translate-y-1/2 w-48 h-48 opacity-10" />
            <div className="relative z-10 space-y-6">
              <h3 className="text-2xl font-black">Đăng ký nhận tin</h3>
              <p className="text-sm opacity-80 leading-relaxed italic">Đừng bỏ lỡ các thông báo cư dân quan trọng từ Phường Cát Lái Số.</p>
              <div className="space-y-4">
                <input 
                  type="email" 
                  placeholder="Email của bạn"
                  className="w-full h-14 px-6 bg-white rounded-2xl border-0 text-on-surface font-bold text-sm focus:ring-4 focus:ring-amber-400 outline-none"
                />
                <button className="w-full py-4 bg-honor-gold text-primary font-black rounded-2xl shadow-xl hover:scale-105 active:scale-95 transition-all">Đăng ký ngay</button>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  </div>
  );
}
