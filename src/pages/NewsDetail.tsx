import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, Calendar, User, Tag, Play, Image as ImageIcon, ChevronLeft, ChevronRight, X, FileText, Download, ExternalLink } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { auth, db, handleFirestoreError, OperationType } from '../lib/firebase';
import { doc, getDoc, updateDoc, increment } from 'firebase/firestore';
import { cn } from '@/src/lib/utils';

export default function NewsDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [post, setPost] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [selectedGalleryImage, setSelectedGalleryImage] = useState<string | null>(null);
  const viewRecordedFor = useRef<string | null>(null);

  useEffect(() => {
    const fetchPost = async () => {
      if (!id) return;
      try {
        // Try fetching from news collection first
        const postRef = doc(db, 'news', id);
        const postDoc = await getDoc(postRef);
        
        if (postDoc.exists()) {
          const data = postDoc.data();
          const now = new Date();
          const publishedAtDate = data.publishedAt?.toDate ? data.publishedAt.toDate() : (data.publishedAt ? new Date(data.publishedAt) : null);
          
          // Check if post is scheduled for future
          const isScheduledFuture = publishedAtDate && publishedAtDate > now;
          
          // Only show to admins if it's in the future
          // Since we don't have auth state easily here without adding useAuth,
          // usually admins will be fine seeing it if they have the link, 
          // but for strictness we should check.
          // However, we want to allow admins to preview from Admin panel.
          // Let's check for a 'preview' search param or just allow if logged in.
          
          setPost({ id: postDoc.id, ...data });
          
          // If scheduled for future and not an admin (we'll check auth.currentUser as a proxy)
          if (isScheduledFuture && !auth.currentUser) {
            navigate('/tin-tuc');
            return;
          }
          
          // Increment views (only if already published or user is not the one who just posted it)
          if (!isScheduledFuture && viewRecordedFor.current !== id) {
            viewRecordedFor.current = id;
            updateDoc(postRef, {
              views: increment(1)
            }).catch(err => console.error("Could not increment views:", err));
          }
        } else {
          // If not in news, check exemplary_members (synced data)
          const memberRef = doc(db, 'exemplary_members', id);
          const memberDoc = await getDoc(memberRef);
          
          if (memberDoc.exists()) {
            const data = memberDoc.data();
            setPost({
              id: memberDoc.id,
              title: `Công dân số tiêu biểu: ${data.name}`,
              category: 'Cư dân tiêu biểu',
              image: data.avatar,
              content: `# ${data.name}\n\n**Năm khen thưởng:** ${data.schoolYear}\n**Khu phố/Đoàn thể:** ${data.class}\n**Danh hiệu:** ${data.rank}\n\n### Sáng kiến & Thành tích:\n${data.achievement}`,
              authorName: 'Ủy ban Nhân dân',
              date: data.createdAt?.toDate?.()?.toLocaleDateString('vi-VN') || 'Đang cập nhật',
              views: 0
            });
          } else {
            // Check collective achievements
            const collectiveRef = doc(db, 'collective_achievements', id);
            const collectiveDoc = await getDoc(collectiveRef);

            if (collectiveDoc.exists()) {
              const data = collectiveDoc.data();
              setPost({
                id: collectiveDoc.id,
                title: `Thành tích: ${data.title}`,
                category: 'Thành tích',
                image: data.certificateImage,
                images: data.gallery || [],
                content: `${data.content}`,
                authorName: 'Ban Liên Đội',
                date: data.date || 'Đang cập nhật',
                views: 0
              });
            } else {
              navigate('/tin-tuc');
            }
          }
        }
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, `content/${id}`);
      } finally {
        setLoading(false);
      }
    };
    fetchPost();
    window.scrollTo(0, 0);
  }, [id, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-surface-subtle flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!post) return null;

  const galleryImages = post.images || [];

  return (
    <div className="min-h-screen bg-surface-subtle pb-20 selection:bg-primary/10">
      {/* Lightbox */}
      <AnimatePresence>
        {selectedGalleryImage && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/95 backdrop-blur-xl"
            onClick={() => setSelectedGalleryImage(null)}
          >
            <button className="absolute top-8 right-8 text-white hover:scale-110 transition-transform"><X size={32} /></button>
            <motion.img 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              src={selectedGalleryImage} 
              className="max-w-full max-h-[90vh] object-contain rounded-2xl shadow-2xl" 
              loading="eager"
              decoding="async"
              referrerPolicy="no-referrer"
              alt="Gallery Preview"
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hero Header */}
      <header className="relative h-[60vh] md:h-[70vh] overflow-hidden">
        <img 
          src={post.image || 'https://images.unsplash.com/photo-1546410531-bb4caa6b424d?auto=format&fit=crop&q=80&w=2071'} 
          className="absolute inset-0 w-full h-full object-cover"
          alt={post.title}
          loading="eager"
          decoding="async"
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
        
        <div className="absolute inset-0 flex flex-col justify-end">
          <div className="max-w-5xl mx-auto px-6 pb-16 w-full space-y-6">
            <button 
              onClick={() => navigate(-1)}
              className="flex items-center gap-2 text-white/80 hover:text-white font-bold group transition-colors"
            >
              <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" /> 
              QUAY LẠI
            </button>
            <div className="space-y-4">
              <span className="px-4 py-1.5 bg-pioneer-red text-white rounded-xl text-xs font-black uppercase tracking-widest">
                {post.category}
              </span>
              <h1 className="text-4xl md:text-7xl font-black text-white leading-[1.1] tracking-tighter uppercase">
                {post.title}
              </h1>
              <div className="flex flex-wrap items-center gap-6 text-white/70 text-sm md:text-base font-bold">
                <div className="flex items-center gap-2">
                  <User size={18} className="text-amber-400" /> {post.authorName}
                </div>
                <div className="flex items-center gap-2">
                  <Calendar size={18} className="text-amber-400" /> {post.date}
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 -mt-10 relative z-10">
        <div className="bg-white rounded-[48px] shadow-2xl p-8 md:p-16 space-y-12">
          {/* Gallery Slider if multiple images */}
          {galleryImages.length > 0 && (
            <div className="space-y-6">
              <div className="relative aspect-video rounded-[32px] overflow-hidden group">
                <AnimatePresence mode="wait">
                  <motion.img
                    key={activeImageIndex}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    src={galleryImages[activeImageIndex]}
                    className="w-full h-full object-cover cursor-zoom-in"
                    onClick={() => setSelectedGalleryImage(galleryImages[activeImageIndex])}
                    loading="lazy"
                    decoding="async"
                    referrerPolicy="no-referrer"
                    alt={`Gallery image ${activeImageIndex + 1}`}
                  />
                </AnimatePresence>
                
                <div className="absolute inset-x-6 top-1/2 -translate-y-1/2 flex justify-between opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={() => setActiveImageIndex(prev => (prev > 0 ? prev - 1 : galleryImages.length - 1))}
                    className="p-3 bg-white/20 backdrop-blur-md rounded-2xl text-white hover:bg-white/40"
                  >
                    <ChevronLeft size={24} />
                  </button>
                  <button 
                    onClick={() => setActiveImageIndex(prev => (prev < galleryImages.length - 1 ? prev + 1 : 0))}
                    className="p-3 bg-white/20 backdrop-blur-md rounded-2xl text-white hover:bg-white/40"
                  >
                    <ChevronRight size={24} />
                  </button>
                </div>

                <div className="absolute bottom-6 inset-x-0 flex justify-center gap-2">
                  {galleryImages.map((_, i) => (
                    <button 
                      key={i}
                      onClick={() => setActiveImageIndex(i)}
                      className={cn(
                        "w-2 h-2 rounded-full transition-all",
                        i === activeImageIndex ? "w-8 bg-white" : "bg-white/50"
                      )}
                    />
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-4 md:grid-cols-6 gap-4">
                {galleryImages.map((img, i) => (
                  <button 
                    key={i}
                    onClick={() => setActiveImageIndex(i)}
                    className={cn(
                      "aspect-square rounded-2xl overflow-hidden border-2 transition-all",
                      i === activeImageIndex ? "border-primary scale-105 shadow-lg" : "border-transparent opacity-60 hover:opacity-100"
                    )}
                  >
                    <img 
                      src={img} 
                      className="w-full h-full object-cover" 
                      alt={`Thumbnail ${i + 1}`} 
                      loading="lazy"
                      decoding="async"
                      referrerPolicy="no-referrer"
                    />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Video Section */}
          {post.videoUrl && (
            <div className="aspect-video rounded-[32px] overflow-hidden shadow-xl bg-black">
              {post.videoUrl.includes('youtube.com') || post.videoUrl.includes('youtu.be') ? (
                <iframe 
                  src={`https://www.youtube.com/embed/${post.videoUrl.split('v=')[1] || post.videoUrl.split('/').pop()}`}
                  className="w-full h-full"
                  allowFullScreen
                />
              ) : (
                <video src={post.videoUrl} controls className="w-full h-full" />
              )}
            </div>
          )}

          {/* PDF Section */}
          {post.pdfUrl && (
            <div className="bg-surface-subtle border-2 border-dashed border-outline-variant/30 rounded-[32px] p-8 space-y-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="flex items-center gap-6">
                <div className="w-16 h-16 bg-pioneer-red/10 text-pioneer-red rounded-2xl flex items-center justify-center shadow-lg">
                  <FileText size={32} />
                </div>
                <div>
                  <h4 className="text-xl font-black text-on-surface uppercase tracking-tight">Tài liệu đính kèm (PDF)</h4>
                  <p className="text-sm text-on-surface-variant font-medium">Bấm vào nút bên cạnh để xem hoặc tải về tài liệu chính thức.</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <a 
                  href={post.pdfUrl} 
                  target="_blank" 
                  rel="noreferrer"
                  className="flex items-center gap-2 px-6 py-3 bg-white border border-outline-variant/30 rounded-xl font-bold text-sm hover:bg-surface-subtle transition-all"
                >
                  <ExternalLink size={18} /> XEM TRỰC TIẾP
                </a>
                <a 
                  href={post.pdfUrl} 
                  download 
                  className="flex items-center gap-2 px-6 py-3 bg-pioneer-red text-white rounded-xl font-bold text-sm shadow-xl shadow-pioneer-red/20 hover:scale-[1.02] active:scale-95 transition-all"
                >
                  <Download size={18} /> TẢI VỀ
                </a>
              </div>
            </div>
          )}

          <div className="markdown-body prose max-w-none prose-lg md:prose-xl prose-emerald prose-headings:font-black prose-headings:tracking-tight prose-p:font-medium prose-p:text-on-surface-variant prose-p:leading-relaxed">
            <ReactMarkdown>{post.content}</ReactMarkdown>
          </div>

          <div className="pt-12 border-t border-outline-variant/30 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="text-on-surface-variant font-bold text-sm">Chia sẻ bài viết:</span>
              <div className="flex gap-2">
                {['Facebook', 'Zalo', 'Copy Link'].map(p => (
                  <button key={p} className="px-4 py-2 bg-surface-subtle border border-outline-variant/30 rounded-xl text-xs font-bold hover:bg-primary hover:text-white transition-all">
                    {p}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2 text-primary font-black text-sm uppercase tracking-widest cursor-pointer hover:gap-3 transition-all" onClick={() => navigate('/tin-tuc')}>
              Cùng chuyên mục <ArrowLeft className="rotate-180" />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
