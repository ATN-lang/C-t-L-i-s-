import { motion, AnimatePresence } from 'motion/react';
import { Mail, Phone, MapPin, Send, HelpCircle, ChevronDown, Map as MapIcon, CheckCircle2, AlertCircle } from 'lucide-react';
import React, { useState } from 'react';
import { useSiteSettings } from '../contexts/SiteContext';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

export default function Contact() {
  const { address, phone, email } = useSiteSettings();
  const [formData, setFormData] = useState({
    name: '',
    contact: '',
    subject: 'Hỏi đáp chung',
    message: ''
  });
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  
  const faqs = [
    { q: "Làm sao để tham gia Câu lạc bộ?", a: "Bạn có thể đăng ký trực tiếp tại phòng Đoàn - Đội vào giờ ra chơi các ngày trong tuần, hoặc điền form online trong mục Hoạt động." },
    { q: "Thời gian sinh hoạt Đội là khi nào?", a: "Lịch sinh hoạt thường xuyên diễn ra vào tiết 5 chiều Thứ Sáu hàng tuần. Các hoạt động ngoại khóa sẽ được thông báo cụ thể." },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.contact || !formData.message) {
      alert('Vui lòng điền đầy đủ các thông tin bắt buộc.');
      return;
    }

    setStatus('submitting');
    try {
      await addDoc(collection(db, 'contact_messages'), {
        ...formData,
        status: 'unread',
        createdAt: serverTimestamp()
      });
      setStatus('success');
      setFormData({ name: '', contact: '', subject: 'Hỏi đáp chung', message: '' });
      setTimeout(() => setStatus('idle'), 5000);
    } catch (error) {
      console.error(error);
      setStatus('error');
      handleFirestoreError(error, OperationType.CREATE, 'contact_messages');
    }
  };

  return (
    <div className="space-y-16 pb-24">
      {/* Hero */}
      <section className="bg-surface-container-lowest py-20 px-6 text-center border-b border-outline-variant/30">
        <div className="max-w-3xl mx-auto space-y-6">
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl md:text-6xl font-black text-primary tracking-tight"
          >
            Liên hệ với chúng tôi
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-lg text-on-surface-variant leading-relaxed"
          >
            Chúng tôi luôn sẵn sàng lắng nghe, giải đáp các thắc mắc thủ tục hành chính, dịch vụ công trực tuyến và hỗ trợ cư dân Phường Cát Lái. Hãy gửi những câu hỏi đề xuất hoặc phản hồi để cùng xây dựng địa bàn chuyển đổi số văn minh.
          </motion.p>
        </div>
      </section>

      {/* Info Cards */}
      <section className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-8">
        {[
          { label: 'Địa chỉ', info: [address || 'Đang cập nhật địa chỉ...'], icon: MapPin, color: 'bg-blue-50 text-blue-600' },
          { label: 'Hotline', info: [phone || 'Đang cập nhật SĐT...', 'Thứ 2 - Thứ 6 (7:30 - 17:00)'], icon: Phone, color: 'bg-red-50 text-red-600' },
          { label: 'Email', info: [email || 'Đang cập nhật Email...', 'Phản hồi trong 24h'], icon: Mail, color: 'bg-amber-50 text-amber-600' },
        ].map((item, i) => (
          <motion.div
            key={item.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-surface-container-lowest p-10 rounded-[32px] border border-outline-variant/30 text-center space-y-6 shadow-sm hover:shadow-xl hover:-translate-y-2 transition-all group"
          >
            <div className={`w-20 h-20 rounded-full ${item.color} mx-auto flex items-center justify-center transition-transform group-hover:scale-110 shadow-inner`}>
              <item.icon className="w-10 h-10" />
            </div>
            <div className="space-y-2">
              <h3 className="text-2xl font-bold text-on-surface">{item.label}</h3>
              {item.info.map((line, idx) => (
                <p key={idx} className="text-on-surface-variant">{line}</p>
              ))}
            </div>
          </motion.div>
        ))}
      </section>

      {/* Form and Sidebar */}
      <section className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-12 gap-12">
        <div className="lg:col-span-8 bg-surface-container-lowest p-10 rounded-[40px] border border-outline-variant/30 shadow-sm relative overflow-hidden">
          <AnimatePresence>
            {status === 'success' && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="absolute inset-0 bg-emerald-500/95 backdrop-blur-sm z-10 flex flex-col items-center justify-center text-white p-6 text-center"
              >
                <CheckCircle2 size={80} className="mb-6 animate-bounce" />
                <h3 className="text-3xl font-black mb-4">Gửi tin nhắn thành công!</h3>
                <p className="max-w-md font-bold text-emerald-50">Cảm ơn bạn đã liên hệ. Chúng tôi đã nhận được thông tin và sẽ phản hồi sớm nhất có thể.</p>
                <button 
                  onClick={() => setStatus('idle')}
                  className="mt-8 px-8 py-3 bg-white text-emerald-600 rounded-2xl font-black hover:bg-emerald-50 transition-all"
                >
                  Gửi tin mới
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          <h2 className="text-3xl font-extrabold text-on-surface mb-10">Gửi tin nhắn cho chúng tôi</h2>
          <form className="space-y-8" onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-3">
                <label className="text-sm font-bold text-on-surface-variant ml-2">Họ và tên <span className="text-pioneer-red">*</span></label>
                <input 
                  type="text" 
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Nhập họ và tên..."
                  className="w-full h-16 px-6 bg-surface-subtle border-0 rounded-2xl focus:ring-4 focus:ring-primary/10 transition-all outline-none text-on-surface font-medium"
                />
              </div>
              <div className="space-y-3">
                <label className="text-sm font-bold text-on-surface-variant ml-2">Email hoặc Số điện thoại <span className="text-pioneer-red">*</span></label>
                <input 
                  type="text" 
                  required
                  value={formData.contact}
                  onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
                  placeholder="Nhập thông tin liên lạc..."
                  className="w-full h-16 px-6 bg-surface-subtle border-0 rounded-2xl focus:ring-4 focus:ring-primary/10 transition-all outline-none text-on-surface font-medium"
                />
              </div>
            </div>
            <div className="space-y-3">
              <label className="text-sm font-bold text-on-surface-variant ml-2">Chủ đề</label>
              <select 
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                className="w-full h-16 px-6 bg-surface-subtle border-0 rounded-2xl focus:ring-4 focus:ring-primary/10 transition-all outline-none text-on-surface font-medium appearance-none"
              >
                <option>Hỏi đáp chung</option>
                <option>Đăng ký tham gia hoạt động</option>
                <option>Đóng góp ý kiến</option>
              </select>
            </div>
            <div className="space-y-3">
              <label className="text-sm font-bold text-on-surface-variant ml-2">Nội dung tin nhắn <span className="text-pioneer-red">*</span></label>
              <textarea 
                rows={6}
                required
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                placeholder="Hãy viết thông điệp của bạn tại đây..."
                className="w-full p-6 bg-surface-subtle border-0 rounded-2xl focus:ring-4 focus:ring-primary/10 transition-all outline-none text-on-surface font-medium resize-none"
              />
            </div>
            <div className="flex justify-end pt-4 items-center gap-6">
              {status === 'error' && (
                <div className="text-pioneer-red flex items-center gap-2 text-sm font-bold">
                  <AlertCircle size={18} />
                  Có lỗi xảy ra, thử lại sau.
                </div>
              )}
              <button 
                disabled={status === 'submitting'}
                className="h-16 px-12 bg-pioneer-red text-white font-bold rounded-2xl flex items-center gap-3 hover:shadow-2xl hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:scale-100"
              >
                {status === 'submitting' ? (
                  <div className="w-6 h-6 border-4 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Send className="w-5 h-5" />
                )}
                {status === 'submitting' ? 'Đang gửi...' : 'Gửi tin nhắn'}
              </button>
            </div>
          </form>
        </div>

        <aside className="lg:col-span-4 space-y-12">
          {/* Map */}
          <div className="rounded-[40px] overflow-hidden group border border-outline-variant/30 shadow-sm relative h-[450px]">
            {address ? (
              <iframe
                title="Google Maps"
                width="100%"
                height="100%"
                style={{ border: 0 }}
                src={import.meta.env.VITE_GOOGLE_MAPS_API_KEY 
                  ? `https://www.google.com/maps/embed/v1/place?key=${import.meta.env.VITE_GOOGLE_MAPS_API_KEY}&q=${encodeURIComponent(address)}`
                  : `https://maps.google.com/maps?q=${encodeURIComponent(address)}&output=embed`}
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                className="grayscale-[0.2] contrast-[1.1] brightness-[0.95]"
              ></iframe>
            ) : (
              <div className="w-full h-full bg-surface-subtle flex flex-col items-center justify-center p-8 text-center space-y-4">
                <MapIcon className="w-12 h-12 text-outline-variant" />
                <p className="text-on-surface-variant font-medium">Chưa có thông tin địa chỉ để hiển thị bản đồ.</p>
              </div>
            )}
            
            {address && (
              <div className="absolute bottom-6 left-6 right-6">
                <button 
                  onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`, '_blank')}
                  className="w-full py-4 bg-white/90 backdrop-blur-md text-primary rounded-2xl font-black shadow-2xl flex items-center justify-center gap-3 hover:bg-white hover:scale-[1.02] active:scale-95 transition-all text-xs uppercase tracking-widest border border-primary/10"
                >
                  <MapIcon className="w-5 h-5" />
                  Mở bản đồ lớn
                </button>
              </div>
            )}
          </div>

          {/* FAQ */}
          <div className="bg-surface-container-lowest p-8 rounded-[40px] border border-outline-variant/30 shadow-sm space-y-8">
            <h3 className="text-2xl font-bold text-on-surface flex items-center gap-3">
              <HelpCircle className="w-8 h-8 text-honor-gold" />
              Câu hỏi thường gặp
            </h3>
            <div className="space-y-4">
              {faqs.map((f, i) => (
                <details key={i} className="group overflow-hidden rounded-2xl border border-outline-variant/20">
                  <summary className="p-5 font-bold text-on-surface cursor-pointer list-none flex justify-between items-center bg-surface-subtle group-open:bg-primary group-open:text-white transition-all">
                    {f.q}
                    <ChevronDown className="w-5 h-5 transition-transform group-open:rotate-180" />
                  </summary>
                  <div className="p-6 text-on-surface-variant text-sm leading-relaxed border-t border-outline-variant/20 italic">
                    {f.a}
                  </div>
                </details>
              ))}
            </div>
          </div>
        </aside>
      </section>
    </div>
  );
}
