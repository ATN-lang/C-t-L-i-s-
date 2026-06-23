import React, { createContext, useContext, useEffect, useState } from 'react';
import { db } from '../lib/firebase';
import { doc, onSnapshot } from 'firebase/firestore';

interface SiteSettings {
  logoUrl: string;
  siteName: string;
  address?: string;
  phone?: string;
  email?: string;
  autoApproveMembers?: boolean;
  maxClubsPerStudent?: number;
}

interface SiteContextType {
  siteSettings: SiteSettings;
}

const SiteContext = createContext<SiteContextType | undefined>(undefined);

export function SiteProvider({ children }: { children: React.ReactNode }) {
  const [siteSettings, setSiteSettings] = useState<SiteSettings>({
    logoUrl: '',
    siteName: 'Cổng thông tin Phường Cát Lái Số',
    address: 'Số 1 Đường Nguyễn Thị Định, Phường Cát Lái, TP. Thủ Đức, TP. Hồ Chí Minh',
    phone: '028 3742 1122',
    email: 'ubnd.catlai@tphcm.gov.vn',
    autoApproveMembers: true,
    maxClubsPerStudent: 5
  });

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'site_settings', 'global'), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setSiteSettings(prev => ({
          ...prev,
          ...data
        }));
        if (data.siteName) {
          document.title = data.siteName;
        }
      }
    });

    return () => unsub();
  }, []);

  return (
    <SiteContext.Provider value={{ siteSettings }}>
      {children}
    </SiteContext.Provider>
  );
}

export function useSiteSettings() {
  const context = useContext(SiteContext);
  if (context === undefined) {
    throw new Error('useSiteSettings must be used within a SiteProvider');
  }
  return context.siteSettings;
}
