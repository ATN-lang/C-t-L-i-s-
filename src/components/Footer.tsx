import { Mail, Phone, MapPin, ShieldCheck, Github, Facebook, Youtube } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useSiteSettings } from '../contexts/SiteContext';

export function Footer() {
  const { siteName, address, phone, email } = useSiteSettings();

  return (
    <footer className="w-full bg-surface-container-high border-t border-outline-variant pt-16 pb-8 px-6">
      <div className="max-w-7xl mx-auto space-y-12">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-12">
          <div className="md:col-span-5 space-y-6">
            <div className="space-y-4">
              <h2 className="text-2xl font-extrabold text-primary tracking-tight">
                {siteName}
              </h2>
              <p className="text-on-surface-variant text-base leading-relaxed max-w-md italic">
                "Cùng nhau tỏa sáng - Học tập tốt, rèn luyện chăm."
              </p>
            </div>
            <div className="flex gap-4">
              {[Facebook, Youtube, Github].map((Icon, i) => (
                <a 
                  key={i} 
                  href="#" 
                  className="p-3 bg-white rounded-full text-primary shadow-sm hover:shadow-md hover:-translate-y-1 transition-all"
                >
                  <Icon className="w-5 h-5 transition-transform" />
                </a>
              ))}
            </div>
          </div>

          <div className="md:col-span-3 space-y-6">
            <h3 className="font-bold text-on-surface text-lg">Liên hệ</h3>
            <ul className="space-y-4 text-on-surface-variant text-sm">
              <li className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-primary shrink-0" />
                <span>{address || 'Đang cập nhật địa chỉ...'}</span>
              </li>
              <li className="flex items-center gap-3">
                <Phone className="w-5 h-5 text-primary shrink-0" />
                <span>{phone || 'Đang cập nhật SĐT...'}</span>
              </li>
              <li className="flex items-center gap-3">
                <Mail className="w-5 h-5 text-primary shrink-0" />
                <span>{email || 'Đang cập nhật Email...'}</span>
              </li>
            </ul>
          </div>

          <div className="md:col-span-4 space-y-6">
            <h3 className="font-bold text-on-surface text-lg">Liên kết nhanh</h3>
            <div className="grid grid-cols-2 gap-4">
              <ul className="space-y-3 text-on-surface-variant text-sm">
                <li><Link to="/" className="hover:text-primary hover:underline transition-colors underline-offset-4">Trang chủ</Link></li>
                <li><Link to="/tin-tuc" className="hover:text-primary hover:underline transition-all underline-offset-4">Tin tức</Link></li>
                <li><Link to="/hoat-dong" className="hover:text-primary hover:underline transition-all underline-offset-4">Hoạt động</Link></li>
              </ul>
              <ul className="space-y-3 text-on-surface-variant text-sm">
                <li><Link to="/thanh-tich" className="hover:text-primary hover:underline transition-all underline-offset-4">Thành tích</Link></li>
                <li><Link to="/admin" className="hover:text-primary hover:underline transition-all underline-offset-4 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4" /> Hệ thống Admin
                </Link></li>
              </ul>
            </div>
          </div>
        </div>

        <div className="pt-8 border-t border-outline-variant/30 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-on-surface-variant">
          <p>© 2024 {siteName}. Thiết kế bởi Ban Truyền Thông.</p>
          <div className="flex gap-6">
            <a href="#" className="hover:text-primary transition-colors">Điều khoản sử dụng</a>
            <a href="#" className="hover:text-primary transition-colors">Chính sách bảo mật</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
