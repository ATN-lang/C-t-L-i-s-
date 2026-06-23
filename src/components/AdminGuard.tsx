import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Lock, LogIn, KeyRound, User as UserIcon, AlertCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface AdminGuardProps {
  children: React.ReactNode;
}

export function AdminGuard({ children }: AdminGuardProps) {
  const { user, loading, isAdmin, isSuperAdmin, login, loginWithCredentials, signOut } = useAuth();
  const [isAuthorizing, setIsAuthorizing] = useState(false);
  const [activeTab, setActiveTab] = useState<'credentials' | 'google'>('credentials');
  
  // Credentials login states
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-surface-container-low">
        <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (isAdmin || isSuperAdmin) {
    return <>{children}</>;
  }

  const handleCredentialsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setErrorMsg('Vui lòng nhập đầy đủ tên đăng nhập và mật khẩu!');
      return;
    }
    setErrorMsg(null);
    setIsAuthorizing(true);
    try {
      await loginWithCredentials(username, password);
    } catch (err: any) {
      setErrorMsg(err.message || 'Đăng nhập không thành công, vui lòng kiểm tra lại!');
    } finally {
      setIsAuthorizing(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-surface-container-low">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md bg-white rounded-[40px] shadow-2xl overflow-hidden border border-outline-variant/30"
      >
        <div className="p-10 bg-primary/5 text-center space-y-4 border-b border-outline-variant/30 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 blur-3xl"></div>
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-primary/5 rounded-full -ml-16 -mb-16 blur-3xl"></div>
          
          <div className="w-20 h-20 bg-primary/10 rounded-3xl flex items-center justify-center text-primary mx-auto shadow-inner relative z-10">
            <Lock size={40} />
          </div>
          <div className="space-y-1 relative z-10">
            <h2 className="text-2xl font-black text-on-surface uppercase tracking-tight">Khu Vực Hạn Chế</h2>
            <p className="text-sm text-on-surface-variant font-medium">Bạn cần quyền quản trị để truy cập trang này</p>
          </div>
        </div>

        <div className="p-8 space-y-6">
          {user ? (
            <div className="text-center space-y-6">
              <div className="p-4 bg-error/5 border border-error/20 rounded-2xl">
                <p className="text-sm text-error font-bold">
                  Tài khoản <span className="font-black underline">{user.email}</span> không có quyền quản trị.
                </p>
              </div>
              <div className="flex flex-col gap-3">
                <button 
                  onClick={() => signOut()}
                  className="w-full py-4 bg-surface-subtle text-on-surface rounded-2xl font-bold transition-all hover:bg-surface-on/5 cursor-pointer"
                >
                  Đăng xuất
                </button>
                <button 
                  onClick={() => window.location.href = '/'}
                  className="w-full py-4 text-primary font-black uppercase tracking-widest text-xs cursor-pointer hover:underline"
                >
                  Về trang chủ
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Tab Selector */}
              <div className="flex bg-surface-subtle p-1 rounded-2xl border border-outline-variant/20">
                <button
                  type="button"
                  onClick={() => { setActiveTab('credentials'); setErrorMsg(null); }}
                  className={`flex-1 py-3 text-center text-xs font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer ${
                    activeTab === 'credentials' 
                      ? 'bg-white text-primary shadow-md' 
                      : 'text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  Tài khoản Admin
                </button>
                <button
                  type="button"
                  onClick={() => { setActiveTab('google'); setErrorMsg(null); }}
                  className={`flex-1 py-3 text-center text-xs font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer ${
                    activeTab === 'google' 
                      ? 'bg-white text-primary shadow-md' 
                      : 'text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  Tài khoản Google
                </button>
              </div>

              {activeTab === 'credentials' ? (
                <form onSubmit={handleCredentialsSubmit} className="space-y-4">
                  {errorMsg && (
                    <div className="p-4 bg-error/5 border border-error/20 rounded-2xl flex items-start gap-3">
                      <AlertCircle size={18} className="text-error flex-shrink-0 mt-0.5" />
                      <p className="text-xs text-error font-bold">{errorMsg}</p>
                    </div>
                  )}

                  {/* Username Field */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-outline tracking-wider block">Tên đăng nhập</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-outline">
                        <UserIcon size={16} />
                      </div>
                      <input
                        type="text"
                        required
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="Nhập tên đăng nhập..."
                        className="w-full pl-11 pr-6 py-3.5 bg-surface-subtle border border-outline-variant/20 rounded-2xl outline-none text-sm font-bold text-on-surface focus:border-primary/50 transition-all"
                      />
                    </div>
                  </div>

                  {/* Password Field */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-outline tracking-wider block">Mật khẩu</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-outline">
                        <KeyRound size={16} />
                      </div>
                      <input
                        type="password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full pl-11 pr-6 py-3.5 bg-surface-subtle border border-outline-variant/20 rounded-2xl outline-none text-sm font-bold text-on-surface focus:border-primary/50 transition-all"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isAuthorizing}
                    className="w-full py-4 bg-primary text-white rounded-2xl font-black shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3 uppercase tracking-widest text-xs disabled:opacity-50 disabled:scale-100 cursor-pointer"
                  >
                    <LogIn size={18} />
                    {isAuthorizing ? 'ĐANG ĐĂNG NHẬP...' : 'XÁC THỰC ADMIN'}
                  </button>

                  <div className="bg-primary/5 p-4 rounded-2xl space-y-1 text-center border border-primary/10">
                    <p className="text-[10px] text-primary font-black uppercase tracking-wider">Tài khoản mặc định đầu tiên</p>
                    <p className="text-[10px] text-on-surface-variant font-medium">
                      Tên: <span className="font-extrabold text-on-surface underline">superadmin</span> | Pass: <span className="font-extrabold text-on-surface underline">admin123</span>
                    </p>
                  </div>
                </form>
              ) : (
                <div className="space-y-4">
                  <button 
                    onClick={async () => {
                      setIsAuthorizing(true);
                      setErrorMsg(null);
                      try {
                        await login();
                      } catch (err: any) {
                        setErrorMsg(err.message || 'Lỗi đăng đăng nhập Google SSO');
                      } finally {
                        setIsAuthorizing(false);
                      }
                    }}
                    disabled={isAuthorizing}
                    className="w-full py-4 bg-surface-subtle border border-outline-variant text-on-surface rounded-2xl font-black shadow-sm hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3 uppercase tracking-widest text-xs disabled:opacity-50 disabled:scale-100 cursor-pointer"
                  >
                    <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-5 h-5" alt="Google Logo" />
                    {isAuthorizing ? 'ĐANG LOG IN...' : 'ĐĂNG NHẬP GOOGLE'}
                  </button>
                  <div className="text-center">
                    <p className="text-[10px] text-on-surface-variant font-medium">Sử dụng tài khoản Google đã được cấp quyền quản trị để tiếp tục.</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="px-10 pb-10 flex justify-center border-t border-outline-variant/30 pt-6 bg-surface-subtle/50">
          <p className="text-[10px] text-outline font-bold uppercase tracking-widest">© 2026 Pioneer Management System</p>
        </div>
      </motion.div>
    </div>
  );
}
