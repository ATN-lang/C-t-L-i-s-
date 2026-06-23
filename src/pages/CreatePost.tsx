import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate, useParams } from 'react-router-dom';
import { Save, Eye, Edit3, Type, List, Bold, Italic, ImagePlus, X, Upload, ArrowLeft, Send, Sparkles, Plus, Trash2, Trophy, Star, Clock } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import ReactMarkdown from 'react-markdown';
import { auth, db, handleFirestoreError, OperationType, syncAchievementStats } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, addDoc, serverTimestamp, doc, getDoc, updateDoc, deleteDoc } from 'firebase/firestore';

export default function CreatePost() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { isAdmin, permissions, loading: authLoading } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const isEditing = !!id;
  const [activeTab, setActiveTab] = useState<'edit' | 'preview'>('edit');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCompressing, setIsCompressing] = useState(false);
  
  const [formData, setFormData] = useState({
    title: '',
    category: 'Tin hoạt động',
    content: '',
    desc: '',
    image: '',
    images: [] as string[],
    videoUrl: '',
    pdfUrl: '',
    featured: false,
    isAward: false,
    isExemplary: false,
    exemplaryYear: '',
    publishedAt: new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16)
  });

  const [loadingForm, setLoadingForm] = useState(true);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    if (!authLoading) {
      if (!isAdmin) {
        navigate('/admin');
        return;
      }

      // Check specific permissions
      if (isEditing) {
        if (!permissions?.canManageNews) {
          alert('Bạn không có quyền chỉnh sửa bài viết.');
          navigate('/admin');
        }
      } else {
        if (!permissions?.canManageNews) {
          alert('Bạn không có quyền đăng bài viết mới.');
          navigate('/admin');
        }
      }
      setLoadingForm(false);
    }
  }, [authLoading, isAdmin, permissions, isEditing, navigate]);

  const toLocalISO = (date: Date) => {
    return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  };

  useEffect(() => {
    if (isEditing && auth.currentUser) {
      const fetchPost = async () => {
        try {
          const postDoc = await getDoc(doc(db, 'news', id!));
            if (postDoc.exists()) {
            const data = postDoc.data();
            setFormData({
              title: data.title || '',
              category: data.category || 'Tin hoạt động',
              content: data.content || '',
              desc: data.desc || '',
              image: data.image || '',
              images: data.images || [],
              videoUrl: data.videoUrl || '',
              pdfUrl: data.pdfUrl || '',
              featured: data.featured || false,
              isAward: data.isAward || false,
              isExemplary: data.isExemplary || false,
              exemplaryYear: data.exemplaryYear || '',
              publishedAt: data.publishedAt?.toDate 
                ? toLocalISO(data.publishedAt.toDate()) 
                : (data.publishedAt ? toLocalISO(new Date(data.publishedAt)) : toLocalISO(new Date()))
            });
          }
        } catch (error) {
          console.error("Error fetching post for edit:", error);
        }
      };
      fetchPost();
    }
  }, [id, isEditing]);

  const categories = ['Tin hoạt động', 'Thông báo', 'Gương sáng đội viên', 'Video'];

  const handleToolbarAction = (prefix: string, suffix: string = '') => {
    const textarea = document.getElementById('post-editor') as HTMLTextAreaElement;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const before = text.substring(0, start);
    const selection = text.substring(start, end);
    const after = text.substring(end);

    const newText = before + prefix + selection + suffix + after;
    setFormData({ ...formData, content: newText });
    
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + prefix.length, end + prefix.length);
    }, 0);
  };

  const compressImage = (base64Str: string, quality: number = 0.7): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = base64Str;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 1200;
        const MAX_HEIGHT = 800;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
    });
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, isGallery: boolean = false) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (isGallery) {
      setIsCompressing(true);
      try {
        const newImages = [...formData.images];
        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          if (file.size > 5 * 1024 * 1024) continue;
          
          const base64 = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(file);
          });
          
          const compressed = await compressImage(base64, 0.6); // Lower quality for gallery items
          newImages.push(compressed);
        }
        setFormData({ ...formData, images: newImages.slice(0, 10) });
      } catch (error) {
        console.error('Gallery upload error:', error);
      } finally {
        setIsCompressing(false);
      }
    } else {
      const file = files[0];
      if (file.size > 5 * 1024 * 1024) {
        alert('File quá lớn. Vui lòng chọn ảnh dưới 5MB.');
        return;
      }

      const reader = new FileReader();
      reader.onloadend = async () => {
        setIsCompressing(true);
        try {
          const base64 = reader.result as string;
          const compressed = await compressImage(base64);
          setFormData({ ...formData, image: compressed });
        } catch (error) {
          console.error('Compression error:', error);
        } finally {
          setIsCompressing(false);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) {
      alert('Vui lòng đăng nhập để đăng bài');
      return;
    }

    if (!formData.title || !formData.content) {
      alert('Vui lòng nhập đầy đủ tiêu đề và nội dung');
      return;
    }

    setIsSubmitting(true);
    try {
      const publishDate = new Date(formData.publishedAt);
      const isScheduled = publishDate.getTime() > Date.now();

      if (isEditing) {
        const newsRef = doc(db, 'news', id!);
        await updateDoc(newsRef, {
          ...formData,
          publishedAt: publishDate,
          updatedAt: serverTimestamp()
        });
        alert('Cập nhật bài viết thành công!');
      } else {
        const newsRef = collection(db, 'news');
        await addDoc(newsRef, {
          ...formData,
          authorId: auth.currentUser.uid,
          authorName: auth.currentUser.displayName || 'Ẩn danh',
          publishedAt: publishDate,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          date: publishDate.toLocaleDateString('vi-VN')
        });
        alert(isScheduled ? 'Đã lên lịch đăng bài thành công!' : 'Đăng bài thành công!');
      }

      // Automatically sync stats if it was an award
      if (formData.isAward) {
        await syncAchievementStats();
      }
      
      navigate('/tin-tuc');
    } catch (error) {
      handleFirestoreError(error, isEditing ? OperationType.UPDATE : OperationType.CREATE, isEditing ? `news/${id}` : 'news');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!isEditing || !id) return;
    setIsSubmitting(true);
    try {
      await deleteDoc(doc(db, 'news', id));
      await syncAchievementStats();
      alert('Đã xóa bài viết thành công!');
      navigate('/admin');
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `news/${id}`);
      alert('Lỗi: Không thể xóa bài viết. Hãy kiểm tra lại quyền hạn.');
    } finally {
      setIsSubmitting(false);
      setShowDeleteConfirm(false);
    }
  };

  if (loadingForm) {
    return (
      <div className="min-h-screen bg-surface-subtle flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-subtle pb-20">
      <div className="max-w-5xl mx-auto px-6 pt-10 space-y-8">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <button 
              onClick={() => navigate('/admin')}
              className="flex items-center gap-2 text-on-surface-variant hover:text-primary font-bold text-sm transition-colors"
            >
              <ArrowLeft size={16} /> Quay lại Admin
            </button>
            <h1 className="text-4xl font-black text-primary tracking-tight">
              {isEditing ? 'Chỉnh sửa bài viết' : 'Tạo bài viết mới'}
            </h1>
          </div>
          <div className="flex items-center gap-4">
            {isEditing && (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                disabled={isSubmitting}
                className="flex items-center gap-2 px-6 py-3.5 bg-error/10 text-error rounded-2xl font-black text-sm hover:bg-error hover:text-white transition-all disabled:opacity-50"
              >
                <Trash2 size={18} /> XÓA BÀI
              </button>
            )}
            <div className="flex items-center gap-2 bg-white/50 p-1.5 rounded-2xl border border-outline-variant/30">
              <button 
                onClick={() => setActiveTab('edit')}
                className={cn(
                  "flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all",
                  activeTab === 'edit' ? "bg-primary text-white shadow-lg shadow-primary/20" : "text-on-surface-variant hover:bg-surface-subtle"
                )}
              >
                <Edit3 size={16} /> Soạn thảo
              </button>
              <button 
                onClick={() => setActiveTab('preview')}
                className={cn(
                  "flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all",
                  activeTab === 'preview' ? "bg-primary text-white shadow-lg shadow-primary/20" : "text-on-surface-variant hover:bg-surface-subtle"
                )}
              >
                <Eye size={16} /> Xem trước
              </button>
            </div>
            <button 
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="flex items-center gap-2 px-8 py-3.5 bg-primary text-white rounded-2xl font-black text-sm shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (isEditing ? 'ĐANG CẬP NHẬT...' : 'ĐANG ĐĂNG...') : <><Send size={18} /> {isEditing ? 'CẬP NHẬT' : 'ĐĂNG BÀI'}</>}
            </button>
          </div>
        </header>

        <main className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          <div className="lg:col-span-8">
            <AnimatePresence mode="wait">
              {activeTab === 'edit' ? (
                <motion.div
                  key="edit"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="space-y-6"
                >
                  <div className="bg-white p-8 rounded-[40px] border border-outline-variant/30 shadow-sm space-y-6">
                    <input 
                      type="text"
                      placeholder="Tiêu đề bài viết..."
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      className="w-full text-3xl font-black text-on-surface border-0 focus:ring-0 placeholder:text-outline-variant outline-none"
                    />
                    
                    <div className="flex items-center gap-2 pb-2 border-b border-outline-variant/30 overflow-x-auto">
                      <button onClick={() => handleToolbarAction('### ')} className="p-2.5 hover:bg-surface-subtle rounded-xl" title="Tiêu đề"><Type size={20} /></button>
                      <div className="w-[1px] h-6 bg-outline-variant/30 mx-1" />
                      <button onClick={() => handleToolbarAction('**', '**')} className="p-2.5 hover:bg-surface-subtle rounded-xl font-bold" title="In đậm"><Bold size={20} /></button>
                      <button onClick={() => handleToolbarAction('_', '_')} className="p-2.5 hover:bg-surface-subtle rounded-xl italic" title="In nghiêng"><Italic size={20} /></button>
                      <div className="w-[1px] h-6 bg-outline-variant/30 mx-1" />
                      <button onClick={() => handleToolbarAction('- ')} className="p-2.5 hover:bg-surface-subtle rounded-xl" title="Danh sách"><List size={20} /></button>
                    </div>

                    <textarea
                      id="post-editor"
                      placeholder="Viết nội dung bài viết bằng Markdown..."
                      value={formData.content}
                      onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                      className="w-full min-h-[500px] bg-transparent border-0 focus:ring-0 outline-none font-medium text-lg leading-relaxed placeholder:text-outline-variant/50 resize-none"
                    />
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="preview"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="bg-white p-12 rounded-[40px] border border-outline-variant/30 shadow-sm min-h-[600px]"
                >
                  <div className="space-y-8">
                    {formData.image && (
                      <div className="w-full aspect-video rounded-[32px] overflow-hidden shadow-xl">
                        <img 
                          src={formData.image} 
                          className="w-full h-full object-cover" 
                          alt="Preview" 
                          loading="eager"
                          decoding="async"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                    )}
                    <div className="space-y-6">
                      <div className="flex items-center gap-3">
                        <span className="px-4 py-1.5 bg-primary/10 text-primary rounded-xl text-xs font-black uppercase tracking-wider">
                          {formData.category}
                        </span>
                        {formData.featured && (
                          <span className="px-4 py-1.5 bg-amber-100 text-amber-700 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1">
                            <Sparkles size={12} /> Nổi bật
                          </span>
                        )}
                      </div>
                      <h2 className="text-4xl md:text-5xl font-black text-on-surface leading-tight tracking-tight">
                        {formData.title || 'Tiêu đề chưa nhập'}
                      </h2>
                      <div className="flex items-center gap-4 text-on-surface-variant text-sm font-medium border-y border-outline-variant/30 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">
                            {auth.currentUser?.displayName?.[0] || 'A'}
                          </div>
                          <span>{auth.currentUser?.displayName || 'Ẩn danh'}</span>
                        </div>
                        <span className="w-1 h-1 bg-outline-variant rounded-full" />
                        <span>{new Date().toLocaleDateString('vi-VN')}</span>
                      </div>
                      <div className="markdown-body prose max-w-none prose-lg md:prose-xl prose-emerald">
                        <ReactMarkdown>{formData.content || '_Nội dung bài viết sẽ hiển thị ở đây..._'}</ReactMarkdown>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <aside className="lg:col-span-4 space-y-8">
            <section className="bg-white p-8 rounded-[40px] border border-outline-variant/30 shadow-sm space-y-6">
              <h3 className="text-xl font-black text-on-surface flex items-center gap-3">
                <Sparkles className="text-primary" /> Thiết lập
              </h3>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-black text-on-surface-variant uppercase tracking-widest pl-2">Danh mục</label>
                  <select 
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full h-14 px-5 bg-surface-subtle rounded-2xl border-0 focus:ring-4 focus:ring-primary/10 transition-all font-bold text-sm"
                  >
                    {categories.map(cat => <option key={cat}>{cat}</option>)}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-black text-on-surface-variant uppercase tracking-widest pl-2">Tóm tắt (Trình bày ở trang chủ)</label>
                  <textarea 
                    value={formData.desc}
                    onChange={(e) => setFormData({ ...formData, desc: e.target.value })}
                    placeholder="Nhập mô tả ngắn..."
                    className="w-full h-32 p-5 bg-surface-subtle rounded-2xl border-0 focus:ring-4 focus:ring-primary/10 transition-all font-bold text-sm resize-none outline-none"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-black text-on-surface-variant uppercase tracking-widest pl-2">Video URL (YouTube/Vimeo)</label>
                  <input 
                    type="text"
                    value={formData.videoUrl}
                    onChange={(e) => setFormData({ ...formData, videoUrl: e.target.value })}
                    placeholder="https://www.youtube.com/watch?v=..."
                    className="w-full h-14 px-5 bg-surface-subtle rounded-2xl border-0 focus:ring-4 focus:ring-primary/10 transition-all font-bold text-sm outline-none"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-black text-on-surface-variant uppercase tracking-widest pl-2">PDF URL (Tài liệu đính kèm)</label>
                  <input 
                    type="text"
                    value={formData.pdfUrl}
                    onChange={(e) => setFormData({ ...formData, pdfUrl: e.target.value })}
                    placeholder="https://example.com/document.pdf"
                    className="w-full h-14 px-5 bg-surface-subtle rounded-2xl border-0 focus:ring-4 focus:ring-primary/10 transition-all font-bold text-sm outline-none"
                  />
                </div>

                <div className="flex items-center justify-between p-4 bg-surface-subtle rounded-2xl">
                  <span className="text-sm font-bold text-on-surface">Bài viết nổi bật?</span>
                  <button 
                    onClick={() => setFormData({ ...formData, featured: !formData.featured })}
                    className={cn(
                      "w-12 h-6 rounded-full transition-all relative",
                      formData.featured ? "bg-primary" : "bg-outline-variant"
                    )}
                  >
                    <div className={cn(
                      "absolute top-1 w-4 h-4 bg-white rounded-full transition-all",
                      formData.featured ? "left-7" : "left-1"
                    )} />
                  </button>
                </div>

                <div className="flex items-center justify-between p-4 bg-surface-subtle rounded-2xl">
                  <span className="text-sm font-bold text-on-surface flex items-center gap-2">
                    <Trophy size={16} className="text-honor-gold" /> Đây là giải thưởng?
                  </span>
                  <button 
                    onClick={() => setFormData({ ...formData, isAward: !formData.isAward })}
                    className={cn(
                      "w-12 h-6 rounded-full transition-all relative",
                      formData.isAward ? "bg-honor-gold" : "bg-outline-variant"
                    )}
                  >
                    <div className={cn(
                      "absolute top-1 w-4 h-4 bg-white rounded-full transition-all",
                      formData.isAward ? "left-7" : "left-1"
                    )} />
                  </button>
                </div>

                <div className="flex items-center justify-between p-4 bg-surface-subtle rounded-2xl">
                  <span className="text-sm font-bold text-on-surface flex items-center gap-2">
                    <Star size={16} className="text-honor-gold" /> Đây là đội viên tiêu biểu?
                  </span>
                  <button 
                    onClick={() => setFormData({ ...formData, isExemplary: !formData.isExemplary })}
                    className={cn(
                      "w-12 h-6 rounded-full transition-all relative",
                      formData.isExemplary ? "bg-honor-gold" : "bg-outline-variant"
                    )}
                  >
                    <div className={cn(
                      "absolute top-1 w-4 h-4 bg-white rounded-full transition-all",
                      formData.isExemplary ? "left-7" : "left-1"
                    )} />
                  </button>
                </div>

                <div className="space-y-2 pt-4 border-t border-outline-variant/30">
                  <label className="text-xs font-black text-on-surface-variant uppercase tracking-widest pl-2 flex items-center gap-2">
                    <Clock size={14} className="text-primary" /> Thời gian đăng bài
                  </label>
                  <input 
                    type="datetime-local"
                    value={formData.publishedAt}
                    onChange={(e) => setFormData({ ...formData, publishedAt: e.target.value })}
                    className="w-full h-12 px-5 bg-surface-subtle rounded-2xl border-0 focus:ring-4 focus:ring-primary/10 transition-all font-bold text-sm outline-none"
                  />
                  <p className="text-[10px] text-on-surface-variant font-medium pl-2 italic">
                    Bài viết sẽ hiển thị công khai sau thời gian này.
                  </p>
                </div>

                {formData.isExemplary && (
                  <div className="space-y-2 pt-2 border-t border-outline-variant/30">
                    <label className="text-xs font-black text-honor-gold uppercase tracking-widest pl-2">Niên khóa của đội viên</label>
                    <input 
                      type="text"
                      value={formData.exemplaryYear || ''}
                      onChange={(e) => setFormData({ ...formData, exemplaryYear: e.target.value })}
                      placeholder="VD: 2022-2026"
                      className="w-full h-12 px-5 bg-amber-50 rounded-2xl border border-amber-100 focus:ring-4 focus:ring-amber-500/10 transition-all font-bold text-sm outline-none"
                    />
                  </div>
                )}
              </div>
            </section>

              <section className="bg-white p-8 rounded-[40px] border border-outline-variant/30 shadow-sm space-y-6">
                <h3 className="text-xl font-black text-on-surface flex items-center gap-3">
                  <ImagePlus className="text-primary" /> Thư viện ảnh (Tối đa 10)
                </h3>
                
                <div className="grid grid-cols-2 gap-4">
                  {formData.images.map((img, idx) => (
                    <div key={idx} className="relative aspect-square rounded-2xl overflow-hidden group border border-outline-variant/30">
                      <img 
                        src={img} 
                        className="w-full h-full object-cover" 
                        alt="" 
                        loading="eager"
                        decoding="async"
                        referrerPolicy="no-referrer"
                      />
                      <button 
                        type="button"
                        onClick={() => {
                          const newImgs = [...formData.images];
                          newImgs.splice(idx, 1);
                          setFormData({ ...formData, images: newImgs });
                        }}
                        className="absolute top-2 right-2 p-1.5 bg-pioneer-red text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                  
                  {formData.images.length < 10 && (
                    <button 
                      type="button"
                      onClick={() => {
                        const input = document.createElement('input');
                        input.type = 'file';
                        input.multiple = true;
                        input.accept = 'image/*';
                        input.onchange = (e) => handleImageUpload(e as any, true);
                        input.click();
                      }}
                      className="aspect-square border-2 border-dashed border-outline-variant rounded-2xl flex flex-col items-center justify-center gap-2 text-on-surface-variant hover:bg-surface-subtle transition-all"
                    >
                      <Plus size={24} />
                      <span className="text-[10px] font-black uppercase tracking-widest">Thêm ảnh</span>
                    </button>
                  )}
                </div>
              </section>

            <section className="bg-white p-8 rounded-[40px] border border-outline-variant/30 shadow-sm space-y-6">
              <h3 className="text-xl font-black text-on-surface flex items-center gap-3">
                <ImagePlus className="text-primary" /> Ảnh bìa
              </h3>
              
              <div className="space-y-4">
                <input 
                  type="file"
                  ref={fileInputRef}
                  onChange={handleImageUpload}
                  className="hidden"
                  accept="image/*"
                />
                
                {formData.image ? (
                  <div className="relative aspect-video rounded-3xl overflow-hidden group">
                    <img 
                      src={formData.image} 
                      className={cn("w-full h-full object-cover", isCompressing && "opacity-50 blur-sm")} 
                      alt="Cover" 
                      loading="eager"
                      decoding="async"
                      referrerPolicy="no-referrer"
                    />
                    {isCompressing && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                      <button onClick={() => fileInputRef.current?.click()} disabled={isCompressing} className="p-3 bg-white text-primary rounded-xl hover:scale-110 transition-transform disabled:opacity-50"><Upload size={20} /></button>
                      <button onClick={() => setFormData({ ...formData, image: '' })} disabled={isCompressing} className="p-3 bg-pioneer-red text-white rounded-xl hover:scale-110 transition-transform disabled:opacity-50"><X size={20} /></button>
                    </div>
                  </div>
                ) : (
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isCompressing}
                    className="w-full aspect-video border-2 border-dashed border-outline-variant rounded-3xl flex flex-col items-center justify-center gap-4 text-on-surface-variant hover:bg-surface-subtle hover:border-primary/50 transition-all group disabled:opacity-50"
                  >
                    <div className="p-4 bg-surface-subtle rounded-full group-hover:scale-110 transition-transform">
                      {isCompressing ? (
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                      ) : (
                        <ImagePlus size={32} />
                      )}
                    </div>
                    <span className="text-xs font-black uppercase tracking-widest">
                      {isCompressing ? 'Đang xử lý ảnh...' : 'Tải lên ảnh bìa'}
                    </span>
                  </button>
                )}
              </div>
            </section>
          </aside>
        </main>
      </div>

      {/* Custom Delete Confirmation Modal */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !isSubmitting && setShowDeleteConfirm(false)}
              className="absolute inset-0 bg-surface-on/40 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-[40px] shadow-2xl p-10 text-center space-y-8"
            >
              <div className="w-20 h-20 bg-error/10 rounded-full flex items-center justify-center mx-auto text-error">
                <Trash2 size={40} />
              </div>
              <div className="space-y-3">
                <h3 className="text-2xl font-black text-on-surface">Bạn vẫn muốn xóa bài viết này?</h3>
                <p className="text-on-surface-variant font-medium leading-relaxed italic">
                  "{formData.title}"
                </p>
                <p className="text-sm text-error/80 font-bold uppercase tracking-widest">
                  Hành động này không thể hoàn tác
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <button 
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={isSubmitting}
                  className="px-8 py-4 bg-surface-container text-on-surface rounded-2xl font-black hover:bg-outline-variant/30 transition-all disabled:opacity-50"
                >
                  KHÔNG
                </button>
                <button 
                  onClick={handleDelete}
                  disabled={isSubmitting}
                  className="px-8 py-4 bg-error text-white rounded-2xl font-black shadow-xl shadow-error/20 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50"
                >
                  {isSubmitting ? 'ĐANG XÓA...' : 'CÓ, XÓA NGAY'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
