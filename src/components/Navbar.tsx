import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Search, Menu, GraduationCap, X, LayoutDashboard, FileText, BarChart, UserCheck, Settings, LogOut, LogIn } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { GlobalSearch } from './GlobalSearch';

import { useAuth } from '../contexts/AuthContext';
import { useSiteSettings } from '../contexts/SiteContext';

export function Navbar() {
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const { user, login, signOut: logOut } = useAuth();
  const siteSettings = useSiteSettings();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchOpen(prev => !prev);
      }
      if (e.key === 'Escape') {
        setIsSearchOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const isAdmin = location.pathname.startsWith('/admin');

  const navLinks = [
    { name: 'Trang chủ', path: '/' },
    { name: 'Tin tức', path: '/tin-tuc' },
    { name: 'Hoạt động', path: '/hoat-dong' },
    { name: 'CLB', path: '/cau-lac-bo' },
    { name: 'Lịch hoạt động', path: '/lich-hoat-dong' },
    { name: 'Thành tích', path: '/thanh-tich' },
    { name: 'Liên hệ', path: '/lien-he' },
  ];

  const adminLinks = [
    { name: 'Tổng quan', path: '/admin', icon: LayoutDashboard },
    { name: 'Tin tức', path: '/admin/news', icon: FileText },
    { name: 'Hoạt động', path: '/admin/activities', icon: BarChart },
    { name: 'Thành viên', path: '/admin/members', icon: UserCheck },
    { name: 'Cài đặt', path: '/admin/settings', icon: Settings },
  ];

  return (
    <nav className="sticky top-0 z-50 w-full bg-surface-container-lowest/80 backdrop-blur-md border-b border-outline-variant shadow-sm px-6 py-3">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3 transition-transform hover:scale-[1.02]">
          <div className="p-2 bg-primary/10 rounded-xl w-10 h-10 flex items-center justify-center overflow-hidden">
            {siteSettings.logoUrl ? (
              <img 
                src={siteSettings.logoUrl} 
                alt="Logo" 
                className="w-full h-full object-contain" 
                loading="eager"
                decoding="async"
                referrerPolicy="no-referrer"
              />
            ) : (
              <GraduationCap className="w-6 h-6 text-primary" strokeWidth={2.5} />
            )}
          </div>
          <span className="font-bold text-lg md:text-xl text-primary tracking-tight hidden sm:block">
            {siteSettings.siteName}
          </span>
          <span className="font-bold text-lg text-primary sm:hidden line-clamp-1">
            {siteSettings.siteName}
          </span>
        </Link>

        {/* Desktop Nav */}
        <div className="hidden md:flex items-center gap-1">
          {navLinks.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              className={cn(
                "px-4 py-2 rounded-lg font-semibold text-sm transition-all duration-200",
                location.pathname === link.path
                  ? "bg-primary/10 text-primary"
                  : "text-on-surface-variant hover:bg-surface-subtle hover:text-primary"
              )}
            >
              {link.name}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <button 
            onClick={() => setIsSearchOpen(true)}
            className="group relative p-2.5 text-on-surface-variant hover:bg-surface-subtle rounded-full transition-colors"
          >
            <Search className="w-5 h-5" />
            <span className="absolute top-full mt-2 right-0 hidden group-hover:block bg-on-surface text-white text-[10px] px-2 py-1 rounded-md whitespace-nowrap font-bold shadow-xl animate-in fade-in slide-in-from-top-1">
              Tìm kiếm (⌘K)
            </span>
          </button>
          
          {user ? (
            <div className="flex items-center gap-3 pl-2 border-l border-outline-variant ml-2">
              <div className="hidden sm:block text-right">
                <p className="text-xs font-bold text-on-surface line-clamp-1">{user.displayName}</p>
                <button 
                  onClick={() => {
                    logOut();
                  }} 
                  className="text-[10px] font-black text-pioneer-red uppercase tracking-wider hover:underline"
                >
                  Đăng xuất
                </button>
              </div>
              <Link to="/admin" className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center overflow-hidden border-2 border-primary/20">
                {user.photoURL ? (
                  <img 
                    src={user.photoURL} 
                    alt={user.displayName || ''} 
                    className="w-full h-full object-cover" 
                    referrerPolicy="no-referrer" 
                    loading="eager"
                    decoding="async"
                  />
                ) : (
                  <span className="text-primary font-black uppercase">{user.displayName?.charAt(0)}</span>
                )}
              </Link>
            </div>
          ) : (
            isAdmin && (
              <button 
                onClick={() => login()}
                className="hidden lg:flex items-center gap-2 px-6 py-2.5 bg-primary text-white rounded-xl font-semibold text-sm hover:bg-primary-container transition-all active:scale-95 shadow-lg shadow-primary/20"
              >
                Đăng nhập Google
              </button>
            )
          )}

          <button 
            className="md:hidden p-2.5 text-on-surface-variant hover:bg-surface-subtle rounded-full transition-colors relative z-50 ml-1"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isMenuOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMenuOpen(false)}
              className="md:hidden fixed inset-0 bg-on-surface/40 backdrop-blur-md z-40"
            />
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300, mass: 0.8 }}
              className="md:hidden fixed right-0 top-0 h-full w-[85%] max-w-sm bg-surface-container-lowest z-50 shadow-[0_0_50px_rgba(0,0,0,0.1)] flex flex-col p-8 border-l border-outline-variant/30"
            >
              <div className="flex justify-between items-center mb-10">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-xl w-10 h-10 flex items-center justify-center overflow-hidden">
                    {siteSettings.logoUrl ? (
                      <img 
                        src={siteSettings.logoUrl} 
                        alt="Logo" 
                        className="w-full h-full object-contain" 
                        loading="eager"
                        decoding="async"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <GraduationCap className="w-6 h-6 text-primary" />
                    )}
                  </div>
                  <span className="font-bold text-lg text-primary tracking-tight">Danh mục</span>
                </div>
                <button 
                  onClick={() => setIsMenuOpen(false)}
                  className="p-2.5 text-on-surface-variant hover:bg-surface-subtle rounded-full transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="flex-1 space-y-8 overflow-y-auto custom-scrollbar pr-2 -mr-2">
                <div className="space-y-2">
                  <p className="px-4 text-[10px] font-black text-outline uppercase tracking-widest mb-3">Điều hướng chính</p>
                  <div className="grid gap-1">
                    {navLinks.map((link) => (
                      <Link
                        key={link.path}
                        to={link.path}
                        onClick={() => setIsMenuOpen(false)}
                        className={cn(
                          "flex items-center gap-4 px-4 py-3.5 rounded-2xl font-bold transition-all text-sm",
                          location.pathname === link.path
                            ? "bg-primary text-white shadow-lg shadow-primary/20 scale-[1.02]"
                            : "text-on-surface-variant hover:bg-surface-subtle"
                        )}
                      >
                        {link.name}
                      </Link>
                    ))}
                  </div>
                </div>

                {isAdmin && (
                  <div className="space-y-2">
                    <p className="px-4 text-[10px] font-black text-primary uppercase tracking-widest mb-3">Hệ thống Quản trị</p>
                    <div className="grid gap-1">
                      {adminLinks.map((link) => (
                        <Link
                          key={link.path}
                          to={link.path}
                          onClick={() => setIsMenuOpen(false)}
                          className={cn(
                            "flex items-center gap-4 px-4 py-3.5 rounded-2xl font-bold transition-all text-sm",
                            location.pathname === link.path
                              ? "bg-primary-container text-primary shadow-md shadow-primary/10"
                              : "text-on-surface-variant hover:bg-surface-subtle"
                          )}
                        >
                          <link.icon size={18} />
                          {link.name}
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-auto pt-8 border-t border-outline-variant/30">
                {user ? (
                  <div className="space-y-5">
                    <div className="flex items-center gap-4 px-4 py-2">
                       <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center overflow-hidden border-2 border-primary/20 shadow-inner">
                        {user.photoURL ? (
                          <img 
                            src={user.photoURL} 
                            alt={user.displayName || ''} 
                            className="w-full h-full object-cover" 
                            referrerPolicy="no-referrer" 
                            loading="eager"
                            decoding="async"
                          />
                        ) : (
                          <span className="text-xl text-primary font-black uppercase">{user.displayName?.charAt(0)}</span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-black text-on-surface truncate">{user.displayName}</p>
                        <p className="text-xs text-on-surface-variant truncate font-medium">{user.email}</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => {
                        logOut();
                        setIsMenuOpen(false);
                      }} 
                      className="w-full flex items-center justify-center gap-3 py-4 bg-surface-subtle text-pioneer-red rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-pioneer-red/10 transition-colors"
                    >
                      <LogOut size={18} />
                      ĐĂNG XUẤT TÀI KHOẢN
                    </button>
                  </div>
                ) : (
                  isAdmin && (
                    <button 
                      onClick={() => {
                        login();
                        setIsMenuOpen(false);
                      }}
                      className="w-full flex items-center justify-center gap-3 py-4 bg-primary text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all"
                    >
                      <LogIn size={18} />
                      ĐĂNG NHẬP GOOGLE
                    </button>
                  )
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <GlobalSearch 
        isOpen={isSearchOpen} 
        onClose={() => setIsSearchOpen(false)} 
      />
    </nav>
  );
}
