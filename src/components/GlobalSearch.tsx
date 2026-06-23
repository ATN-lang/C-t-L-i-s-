import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, X, ArrowRight, FileText, Sparkles, UserCheck, Calendar, Clock, MapPin } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { db } from '../lib/firebase';
import { collection, getDocs, query, orderBy, limit } from 'firebase/firestore';
import { cn } from '@/src/lib/utils';

interface GlobalSearchProps {
  isOpen: boolean;
  onClose: () => void;
}

interface SearchResult {
  id: string;
  type: 'news' | 'activity' | 'member';
  title: string;
  description: string;
  date?: string;
  image?: string;
  path: string;
}

export function GlobalSearch({ isOpen, onClose }: GlobalSearchProps) {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
      setSearchTerm('');
      setResults([]);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleSearch = async () => {
      if (!searchTerm.trim() || searchTerm.length < 2) {
        setResults([]);
        return;
      }

      setLoading(true);
      try {
        const searchLower = searchTerm.toLowerCase();
        
        // Fetch News
        const newsSnap = await getDocs(query(collection(db, 'news'), orderBy('createdAt', 'desc'), limit(15)));
        const newsResults: SearchResult[] = newsSnap.docs
          .map(doc => ({ id: doc.id, ...doc.data() } as any))
          .filter(item => item.title.toLowerCase().includes(searchLower) || item.desc?.toLowerCase().includes(searchLower))
          .map(item => ({
            id: item.id,
            type: 'news',
            title: item.title,
            description: item.desc || '',
            date: item.date || item.createdAt?.toDate().toLocaleDateString('vi-VN'),
            image: item.image,
            path: `/tin-tuc/${item.id}`
          }));

        // Fetch Exemplary Members
        const membersSnap = await getDocs(query(collection(db, 'exemplary_members'), limit(15)));
        const memberResults: SearchResult[] = membersSnap.docs
          .map(doc => ({ id: doc.id, ...doc.data() } as any))
          .filter(item => item.name.toLowerCase().includes(searchLower) || item.achievement.toLowerCase().includes(searchLower))
          .map(item => ({
            id: item.id,
            type: 'member',
            title: `Công dân số tiêu biểu: ${item.name}`,
            description: `Khu phố ${item.class} - ${item.achievement}`,
            date: item.createdAt?.toDate().toLocaleDateString('vi-VN'),
            image: item.avatar,
            path: `/tin-tuc/${item.id}` // They are rendered in news detail page if ID matches
          }));

        // Fetch Activities
        const activitiesSnap = await getDocs(query(collection(db, 'activities'), orderBy('createdAt', 'desc'), limit(15)));
        const activityResults: SearchResult[] = activitiesSnap.docs
          .map(doc => ({ id: doc.id, ...doc.data() } as any))
          .filter(item => item.title.toLowerCase().includes(searchLower) || item.description?.toLowerCase().includes(searchLower))
          .map(item => ({
            id: item.id,
            type: 'activity',
            title: item.title,
            description: item.description || '',
            date: item.startDate,
            image: item.posterUrl,
            path: '/hoat-dong'
          }));

        // Fetch Collective Achievements
        const collectiveSnap = await getDocs(query(collection(db, 'collective_achievements'), limit(15)));
        const collectiveResults: SearchResult[] = collectiveSnap.docs
          .map(doc => ({ id: doc.id, ...doc.data() } as any))
          .filter(item => item.title.toLowerCase().includes(searchLower) || item.content?.toLowerCase().includes(searchLower))
          .map(item => ({
            id: item.id,
            type: 'news', // Treat as news for navigation purposes
            title: `Thành tích: ${item.title}`,
            description: item.content || '',
            date: item.date,
            image: item.certificateImage,
            path: '/thanh-tich'
          }));

        setResults([...newsResults, ...memberResults, ...activityResults, ...collectiveResults]);
      } catch (error) {
        console.error("Search error:", error);
      } finally {
        setLoading(false);
      }
    };

    const timeoutId = setTimeout(handleSearch, 300);
    return () => clearTimeout(timeoutId);
  }, [searchTerm]);

  const handleSelect = (path: string) => {
    navigate(path);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex flex-col bg-surface-container-lowest/95 backdrop-blur-xl"
        >
          {/* Header */}
          <div className="p-6 border-b border-outline-variant flex items-center justify-between max-w-7xl mx-auto w-full">
            <div className="flex items-center gap-4 flex-1">
              <Search className="text-primary w-6 h-6" />
              <input
                ref={inputRef}
                type="text"
                placeholder="Tìm kiếm tin tức, hoạt động, sự kiện..."
                className="bg-transparent border-none outline-none text-2xl font-black text-on-surface w-full placeholder:text-outline-variant"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <button
              onClick={onClose}
              className="p-3 hover:bg-surface-subtle transition-colors rounded-full"
            >
              <X className="w-6 h-6 text-on-surface-variant" />
            </button>
          </div>

          {/* Results Area */}
          <div className="flex-1 overflow-y-auto p-6">
            <div className="max-w-4xl mx-auto space-y-12 py-10">
              {loading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="h-24 bg-surface-subtle animate-pulse rounded-3xl" />
                  ))}
                </div>
              ) : results.length > 0 ? (
                <div className="space-y-6">
                  <p className="text-[10px] font-black text-outline-variant uppercase tracking-[0.2em] px-4">Kết quả tìm kiếm ({results.length})</p>
                  <div className="grid grid-cols-1 gap-4">
                    {results.map((result) => (
                      <motion.button
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        key={`${result.type}-${result.id}`}
                        onClick={() => handleSelect(result.path)}
                        className="group flex items-center gap-6 p-6 bg-white border border-outline-variant/30 rounded-[32px] hover:border-primary/30 hover:shadow-xl transition-all text-left w-full"
                      >
                        <div className="w-20 h-20 rounded-2xl bg-surface-subtle flex-shrink-0 overflow-hidden">
                          {result.image ? (
                            <img 
                              src={result.image} 
                              className="w-full h-full object-cover" 
                              alt={result.title} 
                              loading="lazy"
                              decoding="async"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-primary/20">
                              {result.type === 'news' ? <FileText size={32} /> : <Sparkles size={32} />}
                            </div>
                          )}
                        </div>
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center gap-2">
                            <span className={cn(
                              "text-[8px] font-black px-2 py-0.5 rounded-md uppercase",
                              result.type === 'news' ? "bg-primary/10 text-primary" : "bg-blue-500/10 text-blue-600"
                            )}>
                              {result.type === 'news' ? 'Tin tức' : 'Hoạt động'}
                            </span>
                            {result.date && <span className="text-[10px] font-bold text-on-surface-variant/50">{result.date}</span>}
                          </div>
                          <h4 className="text-xl font-black text-on-surface group-hover:text-primary transition-colors line-clamp-1">{result.title}</h4>
                          <p className="text-sm text-on-surface-variant line-clamp-1 font-medium">{result.description}</p>
                        </div>
                        <div className="p-3 bg-surface-subtle rounded-xl text-on-surface-variant group-hover:bg-primary group-hover:text-white transition-all transform group-hover:translate-x-2">
                          <ArrowRight size={20} />
                        </div>
                      </motion.button>
                    ))}
                  </div>
                </div>
              ) : searchTerm.length >= 2 ? (
                <div className="text-center py-20 space-y-4">
                  <div className="w-20 h-20 bg-surface-subtle rounded-full flex items-center justify-center mx-auto text-primary/20">
                    <Search size={40} />
                  </div>
                  <h3 className="text-2xl font-black text-on-surface">Không tìm thấy kết quả</h3>
                  <p className="text-on-surface-variant">Thử tìm kiếm với từ khóa khác như "Hội trại", "Lễ hội"...</p>
                </div>
              ) : (
                <div className="space-y-12">
                   <div className="space-y-6">
                    <p className="text-[10px] font-black text-outline-variant uppercase tracking-[0.2em] px-4">Gợi ý tìm kiếm</p>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 px-4">
                      {['Tin tức', 'Hoạt động', 'Lịch tuần', 'Bảng vàng', 'Liên hệ', 'Công dân số'].map(tag => (
                        <button 
                          key={tag}
                          onClick={() => setSearchTerm(tag)}
                          className="p-4 bg-white border border-outline-variant/30 rounded-2xl font-bold text-sm text-on-surface-variant hover:bg-primary/10 hover:text-primary hover:border-primary/20 transition-all text-center"
                        >
                          {tag}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 px-4">
                    <div className="p-8 bg-surface-subtle rounded-[40px] space-y-4 group cursor-pointer" onClick={() => handleSelect('/tin-tuc')}>
                      <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-primary shadow-sm mb-2 group-hover:scale-110 transition-transform">
                        <FileText size={24} />
                      </div>
                      <h4 className="text-xl font-black text-on-surface uppercase">Xem tin tức mới</h4>
                      <p className="text-sm text-on-surface-variant font-medium leading-relaxed">Cập nhật tin tức mới nhất về các hoạt động chuyển đổi số và phát triển đô thị.</p>
                    </div>
                    <div className="p-8 bg-primary/5 rounded-[40px] space-y-4 border border-primary/10 group cursor-pointer" onClick={() => handleSelect('/hoat-dong')}>
                      <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-primary shadow-sm mb-2 group-hover:scale-110 transition-transform">
                        <Sparkles size={24} />
                      </div>
                      <h4 className="text-xl font-black text-primary uppercase">Khám phá hoạt động</h4>
                      <p className="text-sm text-on-surface-variant font-medium leading-relaxed">Tham gia tập huấn chuyên đề, ứng dụng số và các sự kiện bổ ích dành cho cư dân.</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
