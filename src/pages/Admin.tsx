import { motion, AnimatePresence } from 'motion/react';
import { LayoutDashboard, LayoutGrid, FileText, UserCheck, Settings, LogOut, ChevronRight, BarChart, Bell, Plus, Save, Eye, Edit3, Type, List, Bold, Italic, LogIn, Trash2, ExternalLink, X, Clock, MapPin, Calendar, Sparkles, Phone, Trophy, GraduationCap, Mail, Check, ShieldAlert, Lock, Filter, Users, User, ArrowRight, ChevronDown, Activity, UserPlus, Search, Star, MessageCircle, AlertCircle, Upload, Database, Download, RefreshCw, Server } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { auth, db, loginWithGoogle, logout, handleFirestoreError, OperationType, syncAchievementStats } from '../lib/firebase';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { collection, query, orderBy, onSnapshot, doc, deleteDoc, updateDoc, serverTimestamp, setDoc, getDoc, addDoc, where, limit, getDocs, runTransaction, increment } from 'firebase/firestore';

import { useAuth } from '../contexts/AuthContext';
import { useSiteSettings } from '../contexts/SiteContext';

export default function Admin() {
  const navigate = useNavigate();
  const location = useLocation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isUploading, setIsUploading] = useState(false);

  const { user, loading, isAdmin, isSuperAdmin, permissions, login: loginWithGoogle, signOut: logout } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const canDelete = isSuperAdmin || permissions?.canDeleteContent;
  const canCreate = isSuperAdmin || permissions?.canCreateContent;
  const canEdit = isSuperAdmin || permissions?.canEditContent;

  useEffect(() => {
    const path = location.pathname;
    if (path === '/admin' || path === '/admin/') {
      setActiveTab('dashboard');
      return;
    }

    const tabMap: { [key: string]: string } = {
      '/admin/news': 'news',
      '/admin/activities_manager': 'activities_manager',
      '/admin/activities': 'activities_manager',
      '/admin/settings': 'settings',
      '/admin/messages': 'messages',
      '/admin/schedules': 'schedules',
      '/admin/registrations': 'registrations',
      '/admin/club_registrations': 'club_registrations',
      '/admin/clubs': 'clubs',
      '/admin/achievements': 'achievements',
      '/admin/user_management': 'user_management',
      '/admin/stats' : 'activities'
    };

    let found = false;
    for (const [route, tab] of Object.entries(tabMap)) {
      if (path.startsWith(route)) {
        setActiveTab(tab);
        found = true;
        break;
      }
    }
    
    if (!found && path.startsWith('/admin')) {
      setActiveTab('dashboard');
    }
  }, [location.pathname]);

  // State Management
  const [newsList, setNewsList] = useState<any[]>([]);
  const [usersList, setUsersList] = useState<any[]>([]);
  const [schedules, setSchedules] = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const [registrations, setRegistrations] = useState<any[]>([]);
  const [exemplaryMembers, setExemplaryMembers] = useState<any[]>([]);
  const [excellentClasses, setExcellentClasses] = useState<any[]>([]);
  const [collectiveAchievements, setCollectiveAchievements] = useState<any[]>([]);
  const [clubs, setClubs] = useState<any[]>([]);
  const [scoutStats, setScoutStats] = useState<any[]>([]);
  const [allClubMemberships, setAllClubMemberships] = useState<any[]>([]);
  const [contactMessages, setContactMessages] = useState<any[]>([]);
  const [giftsList, setGiftsList] = useState<any[]>([]);
  const [userStarsList, setUserStarsList] = useState<any[]>([]);
  const [starTransactions, setStarTransactions] = useState<any[]>([]);
  const [redemptionsList, setRedemptionsList] = useState<any[]>([]);
  const [giftModal, setGiftModal] = useState<{ open: boolean, data?: any }>({ open: false });
  const [giftForm, setGiftForm] = useState({ title: '', description: '', starsRequired: 10, quantity: 10, imageUrl: '' });
  const [siteStats, setSiteStats] = useState<any>({ totalVisits: 0 });
  const [isBackupExporting, setIsBackupExporting] = useState(false);
  const [isBackupImporting, setIsBackupImporting] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);
  const [isWiping, setIsWiping] = useState<string | null>(null);
  const [siteSettings, setSiteSettings] = useState({
    logoUrl: 'https://pioneer.shiningstar.edu.vn/logo.png',
    siteName: 'LIÊN ĐỘI TIỂU HỌC & THCS NGÔI SAO HÀ NỘI',
    address: 'Lô T1, KĐT Trung Hòa - Nhân Chính, Thanh Xuân, Hà Nội',
    phone: '024 3556 8595',
    email: 'info@ngoisaohanoi.edu.vn',
    autoApproveMembers: false,
    maxClubsPerStudent: 3
  });

  // Modal States
  const [userModal, setUserModal] = useState<{ open: boolean, data?: any }>({ open: false });
  const [scheduleModal, setScheduleModal] = useState<{ open: boolean, data?: any }>({ open: false });
  const [activityModal, setActivityModal] = useState<{ open: boolean, data?: any }>({ open: false });
  const [exemplaryModal, setExemplaryModal] = useState<{ open: boolean, data?: any }>({ open: false });
  const [excellentModal, setExcellentModal] = useState<{ open: boolean, data?: any }>({ open: false });
  const [collectiveModal, setCollectiveModal] = useState<{ open: boolean, data?: any }>({ open: false });
  const [clubModal, setClubModal] = useState<{ open: boolean, data?: any }>({ open: false });
  const [scoutModal, setScoutModal] = useState<{ open: boolean, data?: any }>({ open: false });
  const [manageMembersModal, setManageMembersModal] = useState<{ open: boolean, club?: any }>({ open: false });
  const [messageModal, setMessageModal] = useState<{ open: boolean, data?: any }>({ open: false });
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string, title: string, type?: string, metadata?: any } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'success'>('idle');

  // Filter States
  const [membershipFilter, setMembershipFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
  const [registrationActivityFilter, setRegistrationActivityFilter] = useState<string>('all');

  // Form States
  const [userForm, setUserForm] = useState({ 
    email: '', 
    password: '',
    isSuperAdmin: false,
    isAdmin: true, 
    permissions: { 
      canManageNews: true, canManageActivities: false, canManageSchedules: false,
      canManageRegistrations: false, canManageAchievements: false, canManageMembers: false,
      canManageMessages: false, canManageSettings: false, canManageUsers: false,
      canManageClubs: false, canDeleteContent: false,
      canCreateContent: true, canEditContent: true
    } 
  });
  const [scheduleForm, setScheduleForm] = useState({ title: '', date: '', time: '', location: '', description: '' });
  const [activityForm, setActivityForm] = useState({ 
    title: '', startDate: '', startTime: '', endDate: '', endTime: '', location: '', description: '', posterUrl: '', maxParticipants: 50 
  });
  const [clubForm, setClubForm] = useState({
    name: '', description: '', posterUrl: '',
    leaderName: '', foundedDate: new Date().toISOString().split('T')[0], schedule: ''
  });
  const [excellentForm, setExcellentForm] = useState({ week: '', grade6: '', grade7: '', grade8: '', grade9: '' });
  const [collectiveForm, setCollectiveForm] = useState({ title: '', date: '', content: '', certificateImage: '', gallery: [] as string[] });
  const [exemplaryForm, setExemplaryForm] = useState({ name: '', class: '', schoolYear: '2023 - 2024', achievement: '', rank: 'Xuất sắc', avatar: '' });
  const [scoutForm, setScoutForm] = useState({ 
    className: '', 
    maleCount: 0, 
    femaleCount: 0 
  });

  const [clubMembers, setClubMembers] = useState<any[]>([]);

  // Real-time Data Fetching
  useEffect(() => {
    if (!user) return;

    const unsubscribers = [
      onSnapshot(query(collection(db, 'news'), orderBy('createdAt', 'desc')), (snapshot) => {
        setNewsList(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      }, (err) => console.warn('Could not subscribe to news:', err)),
      onSnapshot(query(collection(db, 'roles'), orderBy('createdAt', 'desc')), (snapshot) => {
        setUsersList(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      }, (err) => console.warn('Could not subscribe to roles:', err)),
      onSnapshot(query(collection(db, 'schedules'), orderBy('date', 'desc')), (snapshot) => {
        setSchedules(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      }, (err) => console.warn('Could not subscribe to schedules:', err)),
      onSnapshot(query(collection(db, 'activities'), orderBy('startDate', 'desc')), (snapshot) => {
        setActivities(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      }, (err) => console.warn('Could not subscribe to activities:', err)),
      onSnapshot(query(collection(db, 'registrations'), orderBy('createdAt', 'desc')), (snapshot) => {
        setRegistrations(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      }, (err) => console.warn('Could not subscribe to registrations:', err)),
      onSnapshot(query(collection(db, 'exemplary_members'), orderBy('createdAt', 'desc')), (snapshot) => {
        setExemplaryMembers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      }, (err) => console.warn('Could not subscribe to exemplary_members:', err)),
      onSnapshot(query(collection(db, 'excellent_classes'), orderBy('createdAt', 'desc')), (snapshot) => {
        setExcellentClasses(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      }, (err) => console.warn('Could not subscribe to excellent_classes:', err)),
      onSnapshot(query(collection(db, 'collective_achievements'), orderBy('createdAt', 'desc')), (snapshot) => {
        setCollectiveAchievements(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      }, (err) => console.warn('Could not subscribe to collective_achievements:', err)),
      onSnapshot(query(collection(db, 'clubs'), orderBy('createdAt', 'desc')), (snapshot) => {
        setClubs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      }, (err) => console.warn('Could not subscribe to clubs:', err)),
      onSnapshot(query(collection(db, 'club_memberships'), orderBy('joinedAt', 'desc')), (snapshot) => {
        setAllClubMemberships(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      }, (err) => console.warn('Could not subscribe to club_memberships:', err)),
      onSnapshot(query(collection(db, 'scout_stats'), orderBy('className', 'asc')), (snapshot) => {
        setScoutStats(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      }, (err) => console.warn('Could not subscribe to scout_stats:', err)),
      onSnapshot(query(collection(db, 'contact_messages'), orderBy('createdAt', 'desc')), (snapshot) => {
        setContactMessages(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      }, (err) => console.warn('Could not subscribe to contact_messages:', err)),
      onSnapshot(query(collection(db, 'gifts'), orderBy('createdAt', 'desc')), (snapshot) => {
        setGiftsList(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      }, (err) => console.warn('Could not subscribe to gifts:', err)),
      onSnapshot(query(collection(db, 'user_stars'), orderBy('stars', 'desc')), (snapshot) => {
        setUserStarsList(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      }, (err) => console.warn('Could not subscribe to user_stars:', err)),
      onSnapshot(query(collection(db, 'star_transactions'), orderBy('createdAt', 'desc')), (snapshot) => {
        setStarTransactions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      }, (err) => console.warn('Could not subscribe to star_transactions:', err)),
      onSnapshot(query(collection(db, 'redemptions'), orderBy('createdAt', 'desc')), (snapshot) => {
        setRedemptionsList(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      }, (err) => console.warn('Could not subscribe to redemptions:', err)),
      onSnapshot(doc(db, 'stats', 'global'), (docSnap) => {
        if (docSnap.exists()) setSiteStats(docSnap.data());
      }, (err) => console.warn('Could not subscribe to stats/global:', err)),
      onSnapshot(doc(db, 'site_settings', 'global'), (docSnap) => {
        if (docSnap.exists()) setSiteSettings(docSnap.data() as any);
      }, (err) => console.warn('Could not subscribe to site_settings/global:', err))
    ];

    return () => unsubscribers.forEach(unsub => unsub());
  }, [user]);

  useEffect(() => {
    if (manageMembersModal.open && manageMembersModal.club?.id) {
      const q = query(collection(db, 'club_memberships'), where('clubId', '==', manageMembersModal.club.id));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        setClubMembers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      });
      return () => unsubscribe();
    }
  }, [manageMembersModal.open, manageMembersModal.club?.id]);

  // Handlers
  const handleDeleteItem = async (id: string) => {
    if (!id || !canDelete) return;
    setIsDeleting(true);
    try {
      const type = deleteConfirm?.type;
      if (type === 'club_membership') {
        const { memberId, clubId, status } = deleteConfirm.metadata;
        await runTransaction(db, async (transaction) => {
          const membershipRef = doc(db, 'club_memberships', memberId);
          const memberSnap = await transaction.get(membershipRef);
          if (memberSnap.exists()) {
            let clubSnap: any = null;
            if (status === 'approved' && clubId) {
              const clubRef = doc(db, 'clubs', clubId);
              clubSnap = await transaction.get(clubRef);
            }

            // All reads complete, now writes
            transaction.delete(membershipRef);
            if (clubSnap && clubSnap.exists()) {
              transaction.update(doc(db, 'clubs', clubId), {
                memberCount: increment(-1),
                updatedAt: serverTimestamp()
              });
            }
          }
        });
      } else if (type === 'registration') {
        const activityId = deleteConfirm?.metadata?.activityId;
        await runTransaction(db, async (transaction) => {
          const regRef = doc(db, 'registrations', id);
          const regSnap = await transaction.get(regRef);
          
          let actSnap: any = null;
          let actIdToUse = activityId;
          
          if (regSnap.exists()) {
            const regData = regSnap.data();
            actIdToUse = actIdToUse || regData.activityId;
          }
          
          if (actIdToUse) {
            const actRef = doc(db, 'activities', actIdToUse);
            actSnap = await transaction.get(actRef);
          }
          
          transaction.delete(regRef);
          if (actSnap && actSnap.exists()) {
            const actData = actSnap.data();
            const currentPr = actData.currentParticipants || 0;
            if (currentPr > 0) {
              transaction.update(doc(db, 'activities', actIdToUse), {
                currentParticipants: increment(-1),
                updatedAt: serverTimestamp()
              });
            }
          }
        });
      } else {
        const collectionMap: any = {
           news: 'news', schedule: 'schedules', activity: 'activities', club: 'clubs',
           exemplary_member: 'exemplary_members', excellent_class: 'excellent_classes',
           collective_achievement: 'collective_achievements', role: 'roles', message: 'contact_messages',
           scout: 'scout_stats'
        };
        const col = collectionMap[type || ''] || type;
        await deleteDoc(doc(db, col, id));

        // If deleting an activity, also delete its synced schedule
        if (type === 'activity') {
          try {
            await deleteDoc(doc(db, 'schedules', `activity_${id}`));
          } catch (err) {
            console.error("Error deleting synced schedule:", err);
          }
        }

        // If deleting a club, also delete all associated memberships
        if (type === 'club') {
          try {
            const q = query(collection(db, 'club_memberships'), where('clubId', '==', id));
            const snapshot = await getDocs(q);
            const deletePromises = snapshot.docs.map(doc => deleteDoc(doc.ref));
            await Promise.all(deletePromises);
          } catch (err) {
            console.error("Error deleting club memberships:", err);
          }
        }
      }

      // Sync stats if achievement related
      if (['exemplary_member', 'collective_achievement', 'news'].includes(deleteConfirm?.type || '')) {
        await syncAchievementStats();
      }

      setDeleteConfirm(null);
    } catch (error) {
      const type = deleteConfirm?.type;
      const collectionMap: any = {
         news: 'news', schedule: 'schedules', activity: 'activities', club: 'clubs',
         exemplary_member: 'exemplary_members', excellent_class: 'excellent_classes',
         collective_achievement: 'collective_achievements', role: 'roles', message: 'contact_messages',
         scout: 'scout_stats', registration: 'registrations', club_membership: 'club_memberships'
      };
      const col = collectionMap[type || ''] || type;
      handleFirestoreError(error, OperationType.DELETE, `${col}/${id}`);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleUpdateMemberStatus = async (memberId: string, clubId: string | undefined, newStatus: 'approved' | 'rejected' | 'pending', reason?: string) => {
    if (isUpdatingStatus) return;
    setIsUpdatingStatus(memberId);
    try {
      await runTransaction(db, async (transaction) => {
        const memberRef = doc(db, 'club_memberships', memberId);
        const memberSnap = await transaction.get(memberRef);
        if (!memberSnap.exists()) throw new Error('Không tìm thấy bản ghi đăng ký.');
        
        const data = memberSnap.data();
        const oldStatus = data.status;
        const targetClubId = clubId || data.clubId;
        
        if (!targetClubId) throw new Error('Không xác định được ID câu lạc bộ.');
        
        // Read club data first
        const clubRef = doc(db, 'clubs', targetClubId);
        const clubSnap = await transaction.get(clubRef);

        // If status hasn't changed, do nothing
        if (oldStatus === newStatus && !reason) return;

        const updateData: any = { 
          status: newStatus, 
          updatedAt: serverTimestamp() 
        };

        if (reason !== undefined) {
          updateData.rejectionReason = reason;
        } else if (newStatus === 'approved' || newStatus === 'pending') {
          // Clear reason if approved or sent back to pending
          updateData.rejectionReason = '';
        }

        transaction.update(memberRef, updateData);
        
        if (clubSnap.exists()) {
          if (oldStatus !== 'approved' && newStatus === 'approved') {
            transaction.update(clubRef, { 
              memberCount: increment(1), 
              updatedAt: serverTimestamp() 
            });
          } else if (oldStatus === 'approved' && newStatus !== 'approved') {
            transaction.update(clubRef, { 
              memberCount: increment(-1), 
              updatedAt: serverTimestamp() 
            });
          }
        }
      });
      console.log(`Updated status to ${newStatus} for membership ${memberId}`);
    } catch (error: any) {
      handleFirestoreError(error, OperationType.UPDATE, `club_memberships/${memberId}`);
    } finally {
      setIsUpdatingStatus(null);
    }
  };

  const handleSyncRegistrations = async () => {
    if (syncStatus !== 'idle') return;
    setSyncStatus('syncing');
    try {
      const actQuery = query(collection(db, 'activities'));
      const actSnapshot = await getDocs(actQuery);
      
      const regQuery = query(collection(db, 'registrations'));
      const regSnapshot = await getDocs(regQuery);
      
      const regs = regSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() as any }));
      
      for (const actDoc of actSnapshot.docs) {
        const actId = actDoc.id;
        const actData = actDoc.data();
        const actualCount = regs.filter(r => r.activityId === actId).length;
        
        if (actData.currentParticipants !== actualCount) {
          await updateDoc(doc(db, 'activities', actId), {
            currentParticipants: actualCount,
            updatedAt: serverTimestamp()
          });
        }
      }
      setSyncStatus('success');
      setTimeout(() => setSyncStatus('idle'), 3000);
    } catch (err) {
      console.error("Error syncing registrations:", err);
      setSyncStatus('idle');
    }
  };

  useEffect(() => {
    if (user && isSuperAdmin) {
      const quietSync = async () => {
        try {
          const actQuery = query(collection(db, 'activities'));
          const actSnapshot = await getDocs(actQuery);
          
          const regQuery = query(collection(db, 'registrations'));
          const regSnapshot = await getDocs(regQuery);
          
          const regs = regSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() as any }));
          
          for (const actDoc of actSnapshot.docs) {
            const actId = actDoc.id;
            const actData = actDoc.data();
            const actualCount = regs.filter(r => r.activityId === actId).length;
            
            if (actData.currentParticipants !== actualCount) {
              await updateDoc(doc(db, 'activities', actId), {
                currentParticipants: actualCount,
                updatedAt: serverTimestamp()
              });
            }
          }
        } catch (e) {
          console.warn("Quiet sync error:", e);
        }
      };
      quietSync();
    }
  }, [user, isSuperAdmin]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file size (limit to 5MB before compression)
    if (file.size > 5 * 1024 * 1024) {
      alert('Kích thước ảnh quá lớn (tối đa 5MB)');
      return;
    }

    setIsUploading(true);
    try {
      const reader = new FileReader();
      const loadPromise = new Promise<string>((resolve, reject) => {
        reader.onload = async (event) => {
          try {
            const base64 = event.target?.result as string;
            const compressed = await compressImage(base64, 0.6, 1200);
            resolve(compressed);
          } catch (err) {
            reject(err);
          }
        };
        reader.onerror = reject;
      });

      reader.readAsDataURL(file);
      const compressed = await loadPromise;
      
      if (clubModal.open) {
        setClubForm({ ...clubForm, posterUrl: compressed });
      } else if (activityModal.open) {
        setActivityForm({ ...activityForm, posterUrl: compressed });
      }
    } catch (error) {
      console.error('Lỗi khi tải ảnh:', error);
      alert('Đã có lỗi xảy ra khi tải ảnh lên.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSaveClub = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSuperAdmin && !permissions?.canManageClubs) return;
    try {
      const data = { ...clubForm, updatedAt: serverTimestamp() };
      if (clubModal.data) {
        await updateDoc(doc(db, 'clubs', clubModal.data.id), data);
      } else {
        await addDoc(collection(db, 'clubs'), { ...data, memberCount: 0, createdAt: serverTimestamp() });
      }
      setClubModal({ open: false });
      alert('Lưu thông tin thành công!');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'clubs');
    }
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSuperAdmin && !permissions?.canManageUsers) return;
    try {
      const email = userForm.email.toLowerCase().trim();
      const userData = { 
        ...userForm, 
        email, 
        password: userForm.password || '',
        isSuperAdmin: userForm.isSuperAdmin || false,
        updatedAt: serverTimestamp() 
      };
      if (userModal.data) await updateDoc(doc(db, 'roles', userModal.data.id), userData);
      else await setDoc(doc(db, 'roles', email), { ...userData, createdAt: serverTimestamp() });
      setUserModal({ open: false });
      alert('Lưu thông tin người dùng thành công!');
    } catch (error) {
       handleFirestoreError(error, OperationType.WRITE, 'roles');
    }
  }

  const compressImage = async (base64: string, quality = 0.5, maxWidth = 1000): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = base64;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        if (width > maxWidth) {
          height = (maxWidth / width) * height;
          width = maxWidth;
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
    });
  };

  const handleSaveActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const data = { ...activityForm, updatedAt: serverTimestamp() };
      let activityId = activityModal.data?.id;
      
      if (activityModal.data) {
        await updateDoc(doc(db, 'activities', activityId), data);
      } else {
        const docRef = await addDoc(collection(db, 'activities'), { 
          ...data, 
          currentParticipants: 0, 
          createdAt: serverTimestamp() 
        });
        activityId = docRef.id;
      }
      
      // Auto-sync with schedules
      const scheduleId = `activity_${activityId}`;
      const scheduleData: any = {
        title: data.title,
        date: data.startDate,
        time: data.startTime || '',
        location: data.location,
        description: data.description,
        activityId: activityId,
        isAutoSynced: true,
        updatedAt: serverTimestamp(),
      };
      
      if (!activityModal.data) {
        scheduleData.createdAt = serverTimestamp();
      }

      await setDoc(doc(db, 'schedules', scheduleId), scheduleData, { merge: true });

      setActivityModal({ open: false });
      alert('Đã lưu hoạt động và cập nhật vào lịch trình liên đội!');
    } catch (error) { 
      handleFirestoreError(error, OperationType.WRITE, 'activities'); 
    }
  };

  const handleSaveExcellent = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const data = { ...excellentForm, updatedAt: serverTimestamp() };
      if (excellentModal.data) await updateDoc(doc(db, 'excellent_classes', excellentModal.data.id), data);
      else await addDoc(collection(db, 'excellent_classes'), { ...data, createdAt: serverTimestamp() });
      await syncAchievementStats();
      setExcellentModal({ open: false });
    } catch (error) { handleFirestoreError(error, OperationType.WRITE, 'excellent_classes'); }
  };

  const handleSaveCollective = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const data = { ...collectiveForm, updatedAt: serverTimestamp() };
      if (collectiveModal.data) await updateDoc(doc(db, 'collective_achievements', collectiveModal.data.id), data);
      else await addDoc(collection(db, 'collective_achievements'), { ...data, createdAt: serverTimestamp() });
      await syncAchievementStats();
      setCollectiveModal({ open: false });
    } catch (error) { handleFirestoreError(error, OperationType.WRITE, 'collective_achievements'); }
  };

  const handleSaveExemplary = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const data = { ...exemplaryForm, updatedAt: serverTimestamp() };
      if (exemplaryModal.data) await updateDoc(doc(db, 'exemplary_members', exemplaryModal.data.id), data);
      else await addDoc(collection(db, 'exemplary_members'), { ...data, createdAt: serverTimestamp() });
      await syncAchievementStats();
      setExemplaryModal({ open: false });
    } catch (error) { handleFirestoreError(error, OperationType.WRITE, 'exemplary_members'); }
  };

  const handleSaveScout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSuperAdmin && !permissions?.canManageMembers) return;
    try {
      const data = { 
        ...scoutForm, 
        maleCount: Number(scoutForm.maleCount),
        femaleCount: Number(scoutForm.femaleCount),
        updatedAt: serverTimestamp() 
      };
      if (scoutModal.data) {
        await updateDoc(doc(db, 'scout_stats', scoutModal.data.id), data);
        alert('Cập nhật thống kê khu phố thành công!');
      } else {
        await addDoc(collection(db, 'scout_stats'), { ...data, createdAt: serverTimestamp() });
        alert('Thêm thống kê khu phố mới thành công!');
      }
      setScoutModal({ open: false });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'scout_stats');
    }
  };

  const menuItems = [
    { id: 'dashboard', label: 'TỔNG QUAN', icon: LayoutDashboard, show: true },
    { id: 'news', label: 'TIN TỨC', icon: FileText, show: isSuperAdmin || permissions?.canManageNews },
    { id: 'messages', label: 'TIN NHẮN', icon: Mail, show: isSuperAdmin || permissions?.canManageMessages },
    { id: 'activities_manager', label: 'HOẠT ĐỘNG', icon: Sparkles, show: isSuperAdmin || permissions?.canManageActivities },
    { id: 'schedules', label: 'LỊCH TRÌNH', icon: Calendar, show: isSuperAdmin || permissions?.canManageSchedules },
    { id: 'registrations', label: 'ĐĂNG KÝ', icon: UserCheck, show: isSuperAdmin || permissions?.canManageRegistrations },
    { id: 'club_registrations', label: 'ĐĂNG KÝ CLB', icon: UserCheck, show: isSuperAdmin || permissions?.canManageClubs },
    { id: 'clubs', label: 'CÂU LẠC BỘ', icon: Users, show: isSuperAdmin || permissions?.canManageClubs },
    { id: 'achievements', label: 'BẢNG VÀNG', icon: Trophy, show: isSuperAdmin || permissions?.canManageAchievements },
    { id: 'activities', label: 'THỐNG KÊ', icon: BarChart, show: true },
    { id: 'user_management', label: 'NGƯỜI DÙNG', icon: ShieldAlert, show: isSuperAdmin || permissions?.canManageUsers },
    { id: 'database', label: 'CƠ SỞ DỮ LIỆU', icon: Database, show: isSuperAdmin },
    { id: 'settings', label: 'CÀI ĐẶT', icon: Settings, show: isSuperAdmin || permissions?.canManageSettings },
  ];

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSuperAdmin && !permissions?.canManageSettings) return;
    try {
      await setDoc(doc(db, 'site_settings', 'global'), { 
        ...siteSettings, 
        updatedAt: serverTimestamp() 
      }, { merge: true });
      alert('Cập nhật cấu hình hệ thống thành công!');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'site_settings/global');
    }
  };

  const handleBackupDatabase = () => {
    setIsBackupExporting(true);
    try {
      const dbDump = {
        meta: {
          exporter: auth.currentUser?.email || 'Admin',
          exportedAt: new Date().toISOString(),
          version: '1.2.0',
          siteName: siteSettings.siteName || 'Phường Cát Lái Số'
        },
        data: {
          news: newsList,
          users: usersList,
          schedules: schedules,
          activities: activities,
          registrations: registrations,
          exemplary_members: exemplaryMembers,
          excellent_classes: excellentClasses,
          collective_achievements: collectiveAchievements,
          clubs: clubs,
          scout_stats: scoutStats,
          club_memberships: allClubMemberships,
          contact_messages: contactMessages,
          site_stats: siteStats,
          site_settings: siteSettings
        }
      };

      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(dbDump, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `bk_database_liendoi_${new Date().toISOString().slice(0,10)}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      alert('Xuất bản bản sao lưu cơ sở dữ liệu học đường thành công!');
    } catch (err) {
      alert('Có lỗi xảy ra khi sao lưu cơ sở dữ liệu: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setIsBackupExporting(false);
    }
  };

  const handleImportDatabase = async (file: File) => {
    if (!window.confirm('Cơ sở dữ liệu nhập vào sẽ ghi đè lên các bản ghi trùng lặp (dựa trên ID). Bạn có chắc chắn muốn tiến hành khôi phục?')) {
      return;
    }
    setIsBackupImporting(true);
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      if (!parsed || !parsed.data) {
        throw new Error('Định dạng tệp sao lưu không hợp lệ hoặc thiếu dữ liệu.');
      }

      const backupData = parsed.data;
      let totalImported = 0;

      const importCollection = async (collectionName: string, items: any[]) => {
        if (!items || !Array.isArray(items)) return;
        for (const item of items) {
          if (!item || !item.id) continue;
          const cleaned = { ...item };
          const docId = item.id;
          delete cleaned.id;

          await setDoc(doc(db, collectionName, docId), cleaned, { merge: true });
          totalImported++;
        }
      };

      if (backupData.news) await importCollection('news', backupData.news);
      if (backupData.schedules) await importCollection('schedules', backupData.schedules);
      if (backupData.activities) await importCollection('activities', backupData.activities);
      if (backupData.registrations) await importCollection('registrations', backupData.registrations);
      if (backupData.exemplary_members) await importCollection('exemplary_members', backupData.exemplary_members);
      if (backupData.excellent_classes) await importCollection('excellent_classes', backupData.excellent_classes);
      if (backupData.collective_achievements) await importCollection('collective_achievements', backupData.collective_achievements);
      if (backupData.clubs) await importCollection('clubs', backupData.clubs);
      if (backupData.scout_stats) await importCollection('scout_stats', backupData.scout_stats);
      if (backupData.club_memberships) await importCollection('club_memberships', backupData.club_memberships);
      if (backupData.contact_messages) await importCollection('contact_messages', backupData.contact_messages);

      if (backupData.site_settings) {
        await setDoc(doc(db, 'site_settings', 'global'), backupData.site_settings, { merge: true });
        totalImported++;
      }

      await syncAchievementStats();
      alert(`Khôi phục thành công! Đã xử lý ${totalImported} tài liệu trong cơ sở dữ liệu.`);
    } catch (err) {
      alert('Lỗi nhập dữ liệu sao lưu: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setIsBackupImporting(false);
    }
  };

  const handleSeedMockData = async () => {
    if (!window.confirm('Hệ thống sẽ ghi nhận dữ liệu mẫu về hoạt động, tin tức, lịch trình mới. Bạn có chắc chắn muốn tiến hành?')) {
      return;
    }
    setIsSeeding(true);
    try {
      let docCount = 0;

      const mockNews = [
        {
          title: "Khai mạc Ngày hội Chuyển đổi số đô thị Phường Cát Lái Số",
          category: "Sự kiện Đô thị số",
          desc: "Ngày hội đã phát hiện nhiều mô hình ứng dụng số hiệu quả và trao giải thưởng thiết thực cho đại diện các khu phố tích cực.",
          content: "## Ngày hội Chuyển đổi số Phường Cát Lái\n\nSáng ngày hôm qua, Ủy ban Nhân dân Phường Cát Lái đã long trọng khai mạc Ngày hội Chuyển đổi số đô thị trong không khí phấn khởi và tràn đầy khí thế công nghệ.\n\nĐại hội đã trưng bày và giới thiệu hơn 15 sáng kiến tiện ích công nghệ cho cư dân, giúp kết nối thủ tục hành chính nhanh chóng, đem lại hiệu quả bền vững.",
          image: "https://images.unsplash.com/photo-1546410531-bb4caa6b424d?auto=format&fit=crop&q=80&w=2071",
          authorId: auth.currentUser?.uid || "admin",
          createdAt: serverTimestamp(),
          publishedAt: serverTimestamp(),
          views: 180,
          featured: true
        },
        {
          title: "Chiến dịch Nâng cao Kỹ năng số & Ứng dụng công nghệ thực hành",
          category: "Phong trào số",
          desc: "Tổ chức các buổi tập huấn thực hành công nghệ số, trang bị kỹ năng dịch vụ trực tuyến và hỗ trợ giải quyết thủ tục công.",
          content: "## Kỹ năng số trong đời sống đô thị hiện đại\n\nPhường Cát Lái đã đẩy mạnh hoạt động tuyên truyền và phổ cập rộng rãi kỹ năng công nghệ thông tin cho cư dân tại các khu phố, tập trung hướng dẫn nộp thủ tục hành chính trực tuyến, thanh toán không tiền mặt và phòng chống lừa đảo mạng.\n\nHoạt động đã thu hút hàng trăm cư dân tham gia hưởng ứng và đạt kết quả thiết thực.",
          image: "https://images.unsplash.com/photo-1517486808906-6ca8b3f04846?auto=format&fit=crop&q=80&w=2071",
          authorId: auth.currentUser?.uid || "admin",
          createdAt: serverTimestamp(),
          publishedAt: serverTimestamp(),
          views: 95,
          featured: false
        }
      ];

      for (const news of mockNews) {
        await addDoc(collection(db, 'news'), news);
        docCount++;
      }

      const mockActivities = [
        {
          title: "Chiến dịch Môi trường xanh - Hành lang không rác thải nhựa",
          startDate: "2026-06-05",
          startTime: "07:30",
          endDate: "2026-06-05",
          endTime: "11:30",
          location: "Khuôn viên và sân trường THCS Nguyễn Thị Định",
          maxParticipants: 100,
          currentParticipants: 12,
          posterUrl: "https://images.unsplash.com/photo-1618477461853-cf6edfe6f8c5?auto=format&fit=crop&q=80&w=1000",
          description: "Chiến dịch thu gom pin cũ, đồ dùng bằng nhựa phân loại bảo vệ môi trường, tô điểm sắc xanh học đường xanh - sạch - đẹp.",
          createdAt: serverTimestamp()
        },
        {
          title: "Hội thi Sáng lập Khoa học trẻ - Tin học liên chi đội lần I",
          startDate: "2026-06-20",
          startTime: "08:00",
          endDate: "2026-06-21",
          endTime: "17:00",
          location: "Phòng chức năng và CNTT tầng B",
          maxParticipants: 50,
          currentParticipants: 8,
          posterUrl: "https://images.unsplash.com/photo-1531482615713-2afd69097998?auto=format&fit=crop&q=80&w=1000",
          description: "Nơi tôn vinh các dự án công nghệ, phần mềm tự viết và các lắp ráp cơ học, kích thích tư duy logic đổi mới sáng tạo cư dân.",
          createdAt: serverTimestamp()
        }
      ];

      for (const act of mockActivities) {
        await addDoc(collection(db, 'activities'), act);
        docCount++;
      }

      const mockSchedules = [
        {
          title: "Sinh hoạt Sao Nhi đồng & Toàn đội nghi thức mẫu tuần 30",
          date: "2026-06-01",
          time: "07:00 - 07:45",
          location: "Sân lễ chào cờ chính",
          description: "Tập hợp nề nếp toàn liên đội, kiểm tra đồng phục, tay áo, khăn quàng đỏ và tập trung nhịp điệu bài trống truyền thống.",
          createdAt: serverTimestamp()
        },
        {
          title: "Họp đại diện Tổ dân phố thống nhất công tác chuyển đổi số cộng đồng",
          date: "2026-06-08",
          time: "15:00 - 16:30",
          location: "Phòng hội nghị UBND Phường",
          description: "Bàn bạc lịch trình, chi phí và phân công phụ trách quản lý an toàn cho chuyến đi trải nghiệm thực tế.",
          createdAt: serverTimestamp()
        }
      ];

      for (const sch of mockSchedules) {
        await addDoc(collection(db, 'schedules'), sch);
        docCount++;
      }

      const mockExemplary = [
        {
          name: "Lê Văn Minh Triết",
          class: "9A1",
          achievement: "Thủ khoa Kỳ thi Học sinh giỏi cấp Thành phố môn Vật Lý",
          rank: "Kiện tướng nỗ lực xuất sắc",
          avatar: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&q=80&w=500",
          createdAt: serverTimestamp()
        },
        {
          name: "Nguyễn Hoàng Nhã Phương",
          class: "8A4",
          achievement: "Giải Nhất hội diễn tiếng hát Chỉ huy Đội giỏi cấp Quận",
          rank: "Chỉ huy đội gương sáng xuất sắc",
          avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=500",
          createdAt: serverTimestamp()
        }
      ];

      for (const member of mockExemplary) {
        await addDoc(collection(db, 'exemplary_members'), member);
        docCount++;
      }

      await syncAchievementStats();
      alert(`Đã khởi tạo thành công ${docCount} ghi nhận dữ liệu mẫu vào trang quản trị!`);
    } catch (err) {
      alert('Có lỗi xảy ra khi tạo dữ liệu thử nghiệm: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setIsSeeding(false);
    }
  };

  const handleWipeCollection = async (collectionId: string, label: string) => {
    const confirmationWord = 'XÓA';
    const confirmVal = window.prompt(`CẢNH BÁO: Thao tác này sẽ xóa vĩnh viễn toàn bộ dữ liệu trong bộ sưu tập "${label}" (${collectionId}).\nĐể xác nhận, hãy nhập chữ "${confirmationWord}" vào ô dưới đây:`);
    if (confirmVal !== confirmationWord) {
      if (confirmVal !== null) alert('Xác nhận không đúng, đã hủy thao tác xóa.');
      return;
    }

    setIsWiping(collectionId);
    try {
      const q = query(collection(db, collectionId));
      const querySnapshot = await getDocs(q);
      let deletedCount = 0;
      
      const deletePromises = querySnapshot.docs.map(async (docSnapshot) => {
        await deleteDoc(doc(db, collectionId, docSnapshot.id));
        deletedCount++;
      });
      await Promise.all(deletePromises);

      if (collectionId === 'exemplary_members' || collectionId === 'collective_achievements' || collectionId === 'news') {
        await syncAchievementStats();
      }

      alert(`Đã xóa vĩnh viễn thành công ${deletedCount} tài liệu khỏi bộ sưu tập "${label}"!`);
    } catch (error) {
      alert('Lỗi khi xóa dữ liệu: ' + (error instanceof Error ? error.message : String(error)));
    } finally {
      setIsWiping(null);
    }
  };

  const handleLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      alert('Kích thước logo quá lớn (tối đa 2MB)');
      return;
    }

    setIsUploading(true);
    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const base64 = event.target?.result as string;
        const compressed = await compressImage(base64, 0.8, 400);
        setSiteSettings(prev => ({ ...prev, logoUrl: compressed }));
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Lỗi khi tải logo:', error);
      alert('Đã có lỗi xảy ra khi tải logo.');
    } finally {
      setIsUploading(false);
    }
  };

  const permissionGroups = [
    {
      title: 'Hành động Nội dung',
      icon: FileText,
      permissions: [
        { key: 'canCreateContent', label: 'Tạo nội dung mới', description: 'Cho phép đăng bài viết, hoạt động, lịch trình mới' },
        { key: 'canEditContent', label: 'Chỉnh sửa nội dung', description: 'Cho phép sửa các nội dung đã tồn tại trên hệ thống' },
        { key: 'canDeleteContent', label: 'Xóa nội dung', description: 'Cho phép xóa vĩnh viễn các dữ liệu' },
      ]
    },
    {
      title: 'Quản lý Chuyên mục',
      icon: LayoutGrid,
      permissions: [
        { key: 'canManageNews', label: 'Tin tức & Thông báo', description: 'Quyền truy cập mục Tin tức' },
        { key: 'canManageActivities', label: 'Hoạt động & Sự kiện', description: 'Quyền truy cập mục Hoạt động' },
        { key: 'canManageSchedules', label: 'Lịch trình công tác', description: 'Quyền truy cập mục Lịch trình' },
        { key: 'canManageAchievements', label: 'Thành tích & Gương sáng', description: 'Quyền truy cập mục Thành tích' },
        { key: 'canManageClubs', label: 'Câu lạc bộ Cư dân', description: 'Quyền truy cập mục Câu lạc bộ' },
      ]
    },
    {
      title: 'Quản lý Tương tác',
      icon: MessageCircle,
      permissions: [
        { key: 'canManageRegistrations', label: 'Đăng ký Hoạt động', description: 'Xem và quản lý danh sách cư dân đăng ký' },
        { key: 'canManageMessages', label: 'Tin nhắn & Liên hệ', description: 'Xem và xử lý các tin nhắn từ người dùng' },
      ]
    },
    {
      title: 'Quản trị & Hệ thống',
      icon: Settings,
      permissions: [
        { key: 'canManageUsers', label: 'Quản trị Người dùng', description: 'Phân quyền và quản lý tài khoản admin khác' },
        { key: 'canManageSettings', label: 'Cấu hình Hệ thống', description: 'Thay đổi thông tin liên đội, logo, cài đặt' },
        { key: 'canManageMembers', label: 'Quản lý Công dân', description: 'Thống kê số lượng và danh sách cư dân số' },
      ]
    }
  ];

  const stats = [
    { label: 'Thành tích Tập thể', value: collectiveAchievements.length.toString(), change: 'Live', icon: Trophy },
    { label: 'Công dân số tiêu biểu', value: exemplaryMembers.length.toString(), change: 'Live', icon: UserCheck },
    { label: 'Tổng truy cập', value: siteStats.totalVisits.toLocaleString(), change: 'Live', icon: Eye },
    { label: 'Tin tức & Bài viết', value: newsList.length.toString(), change: 'Live', icon: FileText },
  ];

  return (
    <div className="flex min-h-[calc(100vh-72px)] bg-surface-subtle">
      {/* Admin Sidebar */}
      <aside className="w-64 bg-white border-r border-outline-variant hidden md:flex flex-col p-6 space-y-8">
        <div className="flex items-center gap-3 px-2">
          <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center text-white shadow-lg shadow-primary/20">
            <LayoutDashboard size={20} />
          </div>
          <span className="font-black text-primary tracking-tight">Admin CMS</span>
        </div>

        <nav className="flex-1 space-y-1">
          {menuItems.filter(item => item.show).map((item) => (
            <button
              key={item.id}
              onClick={() => {
                 if (item.id === 'dashboard') navigate('/admin');
                 else if (item.id === 'activities') navigate('/admin/stats');
                 else navigate(`/admin/${item.id}`);
              }}
              className={cn(
                "w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-bold transition-all",
                activeTab === item.id 
                  ? "bg-primary text-white shadow-lg shadow-primary/20" 
                  : "text-on-surface-variant hover:bg-surface-container"
              )}
            >
              <div className="flex items-center gap-3">
                <item.icon size={18} />
                {item.label}
              </div>
              {item.id === 'club_registrations' && allClubMemberships.filter(m => m.status === 'pending').length > 0 && (
                <span className="px-2 py-0.5 bg-error text-white text-[10px] font-black rounded-full animate-pulse">
                  {allClubMemberships.filter(m => m.status === 'pending').length}
                </span>
              )}
            </button>
          ))}
        </nav>

        <button onClick={logout} className="flex items-center gap-3 px-4 py-3 text-sm font-bold text-error hover:bg-error/10 rounded-xl transition-all">
          <LogOut size={18} /> ĐĂNG XUẤT
        </button>
      </aside>

      {/* Main Panel */}
      <main className="flex-1 p-6 md:p-10 space-y-10 overflow-y-auto w-full">
        {!user && !loading ? (
             <div className="h-full flex flex-col items-center justify-center space-y-8">
                <div className="w-24 h-24 bg-primary/10 rounded-[32px] flex items-center justify-center text-primary">
                  <LayoutDashboard size={48} />
                </div>
                <div className="text-center space-y-2">
                  <h2 className="text-3xl font-black text-on-surface">Đăng nhập Admin</h2>
                  <p className="text-on-surface-variant font-medium">Vui lòng đăng nhập để truy cập hệ thống quản trị.</p>
                </div>
                <button onClick={loginWithGoogle} className="flex items-center gap-3 px-10 py-5 bg-white border-2 border-outline-variant rounded-3xl font-black text-on-surface hover:bg-surface-subtle transition-all shadow-sm">
                  <LogIn size={20} className="text-primary" /> ĐĂNG NHẬP VỚI GOOGLE
                </button>
              </div>
        ) : loading ? (
          <div className="h-full flex items-center justify-center">
            <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
          </div>
        ) : (
          <>
            <header className="flex justify-between items-center bg-white md:bg-transparent p-4 md:p-0 rounded-3xl md:rounded-none border border-outline-variant/30 md:border-0 shadow-sm md:shadow-none">
              <div>
                <h1 className="text-2xl md:text-3xl font-black text-primary uppercase tracking-tight">{menuItems.find(m => m.id === activeTab)?.label || 'CMS'}</h1>
                <p className="text-on-surface-variant text-xs md:text-sm font-medium">Chào mừng, {user?.displayName || 'Quản trị viên'}.</p>
              </div>
              <div className="flex items-center gap-3">
                 <button 
                   onClick={() => setIsMobileMenuOpen(true)}
                   className="md:hidden p-3 bg-surface-container-high text-on-surface rounded-2xl border border-outline-variant/30 active:scale-95 transition-all"
                 >
                   <List size={20} />
                 </button>
                  {activeTab === 'news' && (isSuperAdmin || permissions?.canManageNews) && (
                    <Link to="/admin/create-post" className="flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-xl font-bold text-sm shadow-xl shadow-primary/10">
                      <Plus size={18} /> ĐĂNG BÀI MỚI
                    </Link>
                  )}
                  {activeTab === 'clubs' && (isSuperAdmin || permissions?.canManageClubs) && canCreate && (
                    <button onClick={() => { setClubForm({ name: '', description: '', posterUrl: '', leaderName: '', foundedDate: new Date().toISOString().split('T')[0], schedule: '' }); setClubModal({ open: true }); }} className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold text-sm shadow-xl shadow-indigo-500/10"><Plus size={18} /> TẠO CLB MỚI</button>
                  )}
                  {activeTab === 'activities_manager' && (isSuperAdmin || permissions?.canManageActivities) && canCreate && (
                    <button onClick={() => { setActivityForm({ title: '', startDate: '', startTime: '', endDate: '', endTime: '', location: '', description: '', posterUrl: '', maxParticipants: 50 }); setActivityModal({ open: true }); }} className="flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-xl font-bold text-sm shadow-xl shadow-emerald-500/10"><Plus size={18} /> TẠO HOẠT ĐỘNG</button>
                  )}
                  {activeTab === 'achievements' && (isSuperAdmin || permissions?.canManageAchievements) && canCreate && (
                    <div className="flex gap-2">
                      <button onClick={() => { setExemplaryForm({ name: '', class: '', schoolYear: '2023 - 2024', achievement: '', rank: 'Xuất sắc', avatar: '' }); setExemplaryModal({ open: true }); }} className="flex items-center gap-2 px-6 py-3 bg-amber-500 text-white rounded-xl font-bold text-sm shadow-xl shadow-amber-500/10"><Plus size={18} /> GƯƠNG SÁNG</button>
                      <button onClick={() => { setCollectiveForm({ title: '', date: '', content: '', certificateImage: '', gallery: [] }); setCollectiveModal({ open: true }); }} className="flex items-center gap-2 px-6 py-3 bg-secondary text-white rounded-xl font-bold text-sm shadow-xl shadow-secondary/10"><Plus size={18} /> THÀNH TÍCH</button>
                    </div>
                  )}
                  {activeTab === 'user_management' && (isSuperAdmin || permissions?.canManageUsers) && canCreate && (
                    <button onClick={() => { setUserForm({ email: '', password: '', isSuperAdmin: false, isAdmin: true, permissions: { canManageNews: true, canManageActivities: false, canManageSchedules: false, canManageRegistrations: false, canManageAchievements: false, canManageMembers: false, canManageMessages: false, canManageSettings: false, canManageUsers: false, canManageClubs: false, canDeleteContent: false, canCreateContent: false, canEditContent: false } }); setUserModal({ open: true }); }} className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold text-sm shadow-xl shadow-indigo-500/10"><Plus size={18} /> THÊM NGƯỜI DÙNG</button>
                 )}
                  {activeTab === 'dashboard' && (isSuperAdmin || permissions?.canManageMembers) && canCreate && (
                    <button onClick={() => { setScoutForm({ className: '', maleCount: 0, femaleCount: 0 }); setScoutModal({ open: true }); }} className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold text-sm shadow-xl shadow-indigo-500/10"><Plus size={18} /> THÊM KHU PHỐ</button>
                 )}
              </div>
            </header>

            <AnimatePresence>
              {isMobileMenuOpen && (
                <div className="fixed inset-0 z-[100] md:hidden">
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="absolute inset-0 bg-surface-on/40 backdrop-blur-md"
                  />
                  <motion.div 
                    initial={{ x: '-100%' }}
                    animate={{ x: 0 }}
                    exit={{ x: '-100%' }}
                    transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                    className="absolute inset-y-0 left-0 w-80 bg-white shadow-2xl p-8 flex flex-col"
                  >
                    <div className="flex items-center justify-between mb-10">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-primary text-white rounded-[14px] flex items-center justify-center font-black">P</div>
                        <div>
                          <h3 className="text-lg font-black text-on-surface tracking-tight">PIONEER</h3>
                          <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Admin Control</p>
                        </div>
                      </div>
                      <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 border border-outline-variant/30 rounded-xl hover:bg-surface-subtle transition-all">
                        <X size={20} />
                      </button>
                    </div>

                    <nav className="flex-1 space-y-2 overflow-y-auto pr-2">
                       {menuItems.filter(m => m.show).map((item) => (
                         <button
                           key={item.id}
                           onClick={() => {
                             if (item.id === 'dashboard') navigate('/admin');
                             else if (item.id === 'activities') navigate('/admin/stats');
                             else navigate(`/admin/${item.id}`);
                             setIsMobileMenuOpen(false);
                           }}
                           className={cn(
                             "w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-bold transition-all",
                             activeTab === item.id 
                               ? "bg-primary text-white shadow-lg shadow-primary/20" 
                               : "text-on-surface-variant hover:bg-surface-container"
                           )}
                         >
                            <div className="flex items-center gap-3">
                              <item.icon size={18} />
                              {item.label}
                            </div>
                         </button>
                       ))}
                    </nav>

                    <button onClick={() => { logout(); setIsMobileMenuOpen(false); }} className="mt-8 flex items-center gap-3 px-4 py-4 text-sm font-black text-error bg-error/5 rounded-2xl transition-all">
                       <LogOut size={18} /> ĐĂNG XUẤT
                    </button>
                  </motion.div>
                </div>
              )}
            </AnimatePresence>

            <AnimatePresence mode="wait">
               {activeTab === 'dashboard' && (
                 <motion.div key="dashboard" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-10">
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-6">
                      {stats.map((s, i) => (
                        <div key={s.label} className="bg-white p-8 rounded-[32px] border border-outline-variant shadow-sm space-y-4">
                           <div className="p-3 bg-surface-subtle w-fit rounded-xl text-primary"><s.icon size={24} /></div>
                           <div><p className="text-4xl font-black text-on-surface">{s.value}</p><p className="text-sm font-bold text-on-surface-variant">{s.label}</p></div>
                        </div>
                      ))}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="bg-white p-8 rounded-[32px] border border-outline-variant shadow-sm flex items-center justify-between">
                        <div>
                          <p className="text-sm font-bold text-on-surface-variant uppercase tracking-wider">Tổng số Cư dân</p>
                          <p className="text-4xl font-black text-primary mt-1">
                            {scoutStats.reduce((acc, curr) => acc + (Number(curr.maleCount) || 0) + (Number(curr.femaleCount) || 0), 0)}
                          </p>
                        </div>
                        <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center text-primary">
                          <Users size={28} />
                        </div>
                      </div>
                      <div className="bg-white p-8 rounded-[32px] border border-outline-variant shadow-sm flex items-center justify-between">
                        <div>
                          <p className="text-sm font-bold text-on-surface-variant uppercase tracking-wider">Nam cư dân</p>
                          <p className="text-4xl font-black text-indigo-600 mt-1">
                            {scoutStats.reduce((acc, curr) => acc + (Number(curr.maleCount) || 0), 0)}
                          </p>
                        </div>
                        <div className="w-14 h-14 bg-indigo-100 rounded-2xl flex items-center justify-center text-indigo-600">
                          <User size={28} />
                        </div>
                      </div>
                      <div className="bg-white p-8 rounded-[32px] border border-outline-variant shadow-sm flex items-center justify-between">
                        <div>
                          <p className="text-sm font-bold text-on-surface-variant uppercase tracking-wider">Nữ cư dân</p>
                          <p className="text-4xl font-black text-rose-500 mt-1">
                            {scoutStats.reduce((acc, curr) => acc + (Number(curr.femaleCount) || 0), 0)}
                          </p>
                        </div>
                        <div className="w-14 h-14 bg-rose-50 rounded-2xl flex items-center justify-center text-rose-500">
                          <User size={28} />
                        </div>
                      </div>
                    </div>

                    <div className="bg-white rounded-[40px] border border-outline-variant shadow-sm overflow-hidden">
                      <div className="p-8 border-b border-outline-variant/30 flex justify-between items-center">
                        <h2 className="text-xl font-black text-on-surface">Thống kê Cư dân theo Khu phố</h2>
                        <button 
                          onClick={() => { setScoutForm({ className: '', maleCount: 0, femaleCount: 0 }); setScoutModal({ open: true }); }}
                          className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold text-sm shadow-xl shadow-indigo-500/10 hover:scale-[1.02] active:scale-95 transition-all cursor-pointer"
                        >
                          <Plus size={18} /> THÊM KHU PHỐ
                        </button>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="bg-surface-subtle/50 text-[10px] font-black text-on-surface-variant uppercase tracking-widest border-b border-outline-variant/30">
                              <th className="px-8 py-4">Khu phố</th>
                              <th className="px-8 py-4 text-center">Nam</th>
                              <th className="px-8 py-4 text-center">Nữ</th>
                              <th className="px-8 py-4 text-center">Tổng cộng</th>
                              <th className="px-8 py-4 text-right">Thao tác</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-outline-variant/30">
                            {scoutStats.map((s) => (
                              <tr key={s.id} className="hover:bg-surface-subtle/30 transition-colors group">
                                <td className="px-8 py-6">
                                   <p className="font-black text-lg text-primary">{s.className}</p>
                                </td>
                                <td className="px-8 py-6 text-center">
                                   <span className="px-4 py-2 bg-indigo-50 text-indigo-600 rounded-full font-black text-sm">{s.maleCount}</span>
                                </td>
                                <td className="px-8 py-6 text-center">
                                   <span className="px-4 py-2 bg-rose-50 text-rose-500 rounded-full font-black text-sm">{s.femaleCount}</span>
                                </td>
                                <td className="px-8 py-6 text-center">
                                   <span className="px-4 py-2 bg-primary/10 text-primary rounded-full font-black text-sm">{(Number(s.maleCount) || 0) + (Number(s.femaleCount) || 0)}</span>
                                </td>
                                <td className="px-8 py-6 text-right">
                                   <div className="flex justify-end gap-2">
                                      <button 
                                        onClick={() => { setScoutForm({ className: s.className, maleCount: s.maleCount, femaleCount: s.femaleCount }); setScoutModal({ open: true, data: s }); }}
                                        className="p-3 bg-surface-subtle text-on-surface-variant hover:text-primary hover:bg-primary/10 rounded-2xl transition-all cursor-pointer"
                                      >
                                        <Edit3 size={18} />
                                      </button>
                                      <button 
                                        onClick={() => setDeleteConfirm({ id: s.id, title: `Thống kê khu phố ${s.className}`, type: 'scout' })}
                                        className="p-3 bg-surface-subtle text-error/60 hover:text-error hover:bg-error/10 rounded-2xl transition-all cursor-pointer"
                                      >
                                        <Trash2 size={18} />
                                      </button>
                                   </div>
                                </td>
                              </tr>
                            ))}
                            {scoutStats.length === 0 && (
                              <tr>
                                <td colSpan={5} className="px-8 py-20 text-center text-on-surface-variant font-bold italic">
                                  Chưa có dữ liệu thống kê khu phố nào.
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                 </motion.div>
               )}

               {activeTab === 'clubs' && (
                 <motion.div key="clubs" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
                    <div className="bg-white rounded-[40px] border border-outline-variant shadow-sm overflow-hidden">
                      <div className="p-8 border-b border-outline-variant/30 flex justify-between items-center"><h2 className="text-xl font-black text-on-surface">Danh sách câu lạc bộ ({clubs.length})</h2></div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="bg-surface-subtle/50 text-xs font-black text-on-surface-variant uppercase tracking-widest border-b border-outline-variant/30">
                              <th className="px-8 py-4">Câu lạc bộ</th><th className="px-8 py-4">Trưởng CLB</th><th className="px-8 py-4">Lịch trình</th><th className="px-8 py-4 text-center">Thành viên</th><th className="px-8 py-4 text-right">Thao tác</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-outline-variant/30">
                            {clubs.map((club) => (
                              <tr key={club.id} className="hover:bg-surface-subtle/30 transition-colors group">
                                <td className="px-8 py-6"><div className="flex items-center gap-4"><img src={club.posterUrl || null} className="w-12 h-12 rounded-lg object-cover" alt="" /><p className="font-bold text-on-surface">{club.name}</p></div></td>
                                <td className="px-8 py-6"><p className="text-sm font-bold">{club.leaderName}</p></td>
                                <td className="px-8 py-6 text-sm text-on-surface-variant">{club.schedule || 'Chưa cập nhật'}</td>
                                <td className="px-8 py-6 text-center"><span className="px-3 py-1 rounded-lg text-xs font-black bg-primary/10 text-primary">{club.memberCount || 0}</span></td>
                                <td className="px-8 py-6 text-right flex items-center justify-end gap-1">
                                  {canEdit && <button onClick={() => { setClubForm({ name: club.name, description: club.description, posterUrl: club.posterUrl, leaderName: club.leaderName, foundedDate: club.foundedDate || '', schedule: club.schedule || '' }); setClubModal({ open: true, data: club }); }} className="p-2.5 text-on-surface-variant hover:text-primary transition-all"><Edit3 size={18} /></button>}
                                  <button onClick={() => setManageMembersModal({ open: true, club })} className="p-2.5 text-on-surface-variant hover:text-amber-500 transition-all"><Users size={18} /></button>
                                  {canDelete && <button onClick={() => setDeleteConfirm({ id: club.id, title: club.name, type: 'club' })} className="p-2.5 text-error/60 hover:text-error transition-all"><Trash2 size={18} /></button>}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                 </motion.div>
               )}

               {activeTab === 'news' && (
                 <motion.div key="news" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                    <div className="bg-white rounded-[40px] border border-outline-variant shadow-sm overflow-hidden">
                      <div className="p-8 border-b border-outline-variant/30 flex justify-between items-center">
                        <h2 className="text-xl font-black text-on-surface">Tin tức & Bài viết ({newsList.length})</h2>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="bg-surface-subtle/50 text-[10px] font-black text-on-surface-variant uppercase tracking-widest border-b border-outline-variant/30">
                              <th className="px-8 py-4">Tiêu đề bài viết</th><th className="px-8 py-4">Chuyên mục</th><th className="px-8 py-4">Ngày đăng</th><th className="px-8 py-4 text-right">Thao tác</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-outline-variant/30">
                            {newsList.map((news) => (
                              <tr key={news.id} className="hover:bg-surface-subtle/30 transition-colors group">
                                <td className="px-8 py-6">
                                  <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 bg-surface-subtle">
                                      <img src={news.image || 'https://via.placeholder.com/100'} className="w-full h-full object-cover" />
                                    </div>
                                    <p className="font-bold text-on-surface line-clamp-1">{news.title}</p>
                                  </div>
                                </td>
                                <td className="px-8 py-6"><span className="px-3 py-1 rounded-lg text-xs font-black bg-primary/5 text-primary border border-primary/10">{news.category}</span></td>
                                <td className="px-8 py-6 text-sm text-on-surface-variant">{news.createdAt?.toDate?.()?.toLocaleDateString('vi-VN') || 'N/A'}</td>
                                <td className="px-8 py-6 text-right flex items-center justify-end gap-2">
                                  {canEdit && <Link to={`/admin/edit-post/${news.id}`} className="p-2.5 text-on-surface-variant hover:text-primary transition-all"><Edit3 size={18} /></Link>}
                                  {canDelete && <button onClick={() => setDeleteConfirm({ id: news.id, title: news.title, type: 'news' })} className="p-2.5 text-error/60 hover:text-error transition-all"><Trash2 size={18} /></button>}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                 </motion.div>
               )}

               {activeTab === 'user_management' && (
                 <motion.div key="user_management" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                    <div className="bg-white rounded-[40px] border border-outline-variant shadow-sm overflow-hidden">
                      <div className="p-8 border-b border-outline-variant/30 flex justify-between items-center">
                        <h2 className="text-xl font-black text-on-surface">Quản lý phân quyền ({usersList.length})</h2>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="bg-surface-subtle/50 text-[10px] font-black text-on-surface-variant uppercase tracking-widest border-b border-outline-variant/30">
                              <th className="px-8 py-4">Tài khoản</th><th className="px-8 py-4">Mật khẩu</th><th className="px-8 py-4">Giải pháp Auth</th><th className="px-8 py-4">Vai trò</th><th className="px-8 py-4 text-right">Thao tác</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-outline-variant/30">
                            {usersList.map((u) => (
                              <tr key={u.id} className="hover:bg-surface-subtle/30 transition-colors group">
                                <td className="px-8 py-6 font-bold text-primary">{u.email || u.id}</td>
                                <td className="px-8 py-6 text-sm font-mono">{u.password ? <span className="bg-surface-subtle px-2 py-1 rounded border border-outline-variant/20">{u.password}</span> : <span className="text-outline text-xs">-</span>}</td>
                                 <td className="px-8 py-6 text-xs">{u.password ? <span className="bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full font-bold">Mật khẩu</span> : <span className="bg-sky-50 text-sky-700 px-2.5 py-1 rounded-full font-bold">Google SSO</span>}</td>
                                 <td className="px-8 py-6">
                                   {u.isSuperAdmin ? (
                                     <span className="px-3 py-1 rounded-lg text-[10px] font-black uppercase bg-red-100 text-red-600">Super Admin</span>
                                   ) : (
                                     <span className={cn("px-3 py-1 rounded-lg text-[10px] font-black uppercase", u.isAdmin ? "bg-indigo-100 text-indigo-600" : "bg-surface-subtle text-on-surface-variant")}>{u.isAdmin ? 'Người điều hành' : 'Người dùng'}</span>
                                   )}
                                 </td>
                                <td className="px-8 py-6 text-right flex items-center justify-end gap-2">
                                  {canEdit && <button onClick={() => { setUserForm({ email: u.email || u.id, password: u.password || '', isSuperAdmin: u.isSuperAdmin || false, isAdmin: u.isAdmin !== undefined ? u.isAdmin : true, permissions: u.permissions || { canManageNews: false, canManageActivities: false, canManageSchedules: false, canManageRegistrations: false, canManageAchievements: false, canManageMembers: false, canManageMessages: false, canManageSettings: false, canManageUsers: false, canManageClubs: false, canDeleteContent: false, canCreateContent: false, canEditContent: false } }); setUserModal({ open: true, data: u }); }} className="p-2.5 text-on-surface-variant hover:text-primary transition-all cursor-pointer"><Edit3 size={18} /></button>}
                                  {isSuperAdmin && <button onClick={() => setDeleteConfirm({ id: u.id, title: u.email || u.id, type: 'role' })} className="p-2.5 text-error/60 hover:text-error transition-all cursor-pointer"><Trash2 size={18} /></button>}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                 </motion.div>
               )}
               {activeTab === 'activities_manager' && (
                 <motion.div key="activities_manager" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                    <div className="bg-white rounded-[40px] border border-outline-variant shadow-sm overflow-hidden">
                      <div className="p-8 border-b border-outline-variant/30 flex justify-between items-center">
                        <h2 className="text-xl font-black text-on-surface">Quản lý Hoạt động ({activities.length})</h2>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="bg-surface-subtle/50 text-[10px] font-black text-on-surface-variant uppercase tracking-widest border-b border-outline-variant/30">
                              <th className="px-8 py-4">Hoạt động</th><th className="px-8 py-4">Thời gian</th><th className="px-8 py-4">Địa điểm</th><th className="px-8 py-4 text-center">Đăng ký</th><th className="px-8 py-4 text-right">Thao tác</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-outline-variant/30">
                            {activities.map((act) => (
                              <tr key={act.id} className="hover:bg-surface-subtle/30 transition-colors group">
                                <td className="px-8 py-6">
                                  <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 bg-surface-subtle">
                                      <img src={act.posterUrl || 'https://via.placeholder.com/100'} className="w-full h-full object-cover" />
                                    </div>
                                    <p className="font-bold text-on-surface line-clamp-1">{act.title}</p>
                                  </div>
                                </td>
                                <td className="px-8 py-6 text-sm font-medium">
                                  <div className="flex flex-col">
                                    <span>{act.startDate} {act.startTime || ''}</span>
                                    {act.endDate && (
                                      <span className="text-[10px] text-on-surface-variant font-medium">Đến: {act.endDate} {act.endTime || ''}</span>
                                    )}
                                  </div>
                                </td>
                                <td className="px-8 py-6 text-sm text-on-surface-variant italic">{act.location}</td>
                                <td className="px-8 py-6 text-center">
                                  <span className="px-3 py-1 rounded-lg text-xs font-black bg-primary/10 text-primary">{act.currentParticipants || 0}/{act.maxParticipants}</span>
                                </td>
                                <td className="px-8 py-6 text-right flex items-center justify-end gap-2">
                                  {canEdit && <button onClick={() => { setActivityForm({ title: act.title, startDate: act.startDate, startTime: act.startTime || '', endDate: act.endDate || '', endTime: act.endTime || '', location: act.location, description: act.description, posterUrl: act.posterUrl, maxParticipants: act.maxParticipants }); setActivityModal({ open: true, data: act }); }} className="p-2.5 text-on-surface-variant hover:text-primary transition-all"><Edit3 size={18} /></button>}
                                  {canDelete && <button onClick={() => setDeleteConfirm({ id: act.id, title: act.title, type: 'activity' })} className="p-2.5 text-error/60 hover:text-error transition-all"><Trash2 size={18} /></button>}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                 </motion.div>
               )}

               {activeTab === 'schedules' && (
                 <motion.div key="schedules" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                    <div className="bg-white rounded-[40px] border border-outline-variant shadow-sm overflow-hidden">
                      <div className="p-8 border-b border-outline-variant/30 flex justify-between items-center">
                        <h2 className="text-xl font-black text-on-surface">Lịch trình công tác ({schedules.length})</h2>
                        {canCreate && (
                          <button onClick={() => { setScheduleForm({ title: '', date: '', time: '', location: '', description: '' }); setScheduleModal({ open: true }); }} className="flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-xl font-bold text-sm shadow-xl shadow-primary/10">
                            <Plus size={18} /> THÊM LỊCH MỚI
                          </button>
                        )}
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="bg-surface-subtle/50 text-[10px] font-black text-on-surface-variant uppercase tracking-widest border-b border-outline-variant/30">
                              <th className="px-8 py-4">Sự kiện</th><th className="px-8 py-4">Thời gian</th><th className="px-8 py-4">Địa điểm</th><th className="px-8 py-4 text-right">Thao tác</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-outline-variant/30">
                            {schedules.map((s) => (
                              <tr key={s.id} className="hover:bg-surface-subtle/30 transition-colors group">
                                <td className="px-8 py-6 font-bold">
                                  <div className="flex items-center gap-2">
                                    {s.title}
                                    {s.isAutoSynced && (
                                      <span className="px-2 py-0.5 bg-emerald-100 text-emerald-600 text-[8px] font-black uppercase rounded-md tracking-widest border border-emerald-200">
                                        Hoạt động
                                      </span>
                                    )}
                                  </div>
                                </td>
                                <td className="px-8 py-6 text-sm">{s.date} - {s.time}</td>
                                <td className="px-8 py-6 text-sm text-on-surface-variant italic">{s.location}</td>
                                <td className="px-8 py-6 text-right flex items-center justify-end gap-2">
                                  {canEdit && <button onClick={() => { setScheduleForm({ title: s.title, date: s.date, time: s.time, location: s.location, description: s.description || '' }); setScheduleModal({ open: true, data: s }); }} className="p-2.5 text-on-surface-variant hover:text-primary transition-all"><Edit3 size={18} /></button>}
                                  {canDelete && <button onClick={() => setDeleteConfirm({ id: s.id, title: s.title, type: 'schedule' })} className="p-2.5 text-error/60 hover:text-error transition-all"><Trash2 size={18} /></button>}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                 </motion.div>
               )}

               {activeTab === 'registrations' && (
                 <motion.div key="registrations" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                    <div className="bg-white rounded-[40px] border border-outline-variant shadow-sm overflow-hidden">
                      <div className="p-8 border-b border-outline-variant/30 flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                          <h2 className="text-xl font-black text-on-surface">Đăng ký tham gia hoạt động ({registrations.filter(r => registrationActivityFilter === 'all' || r.activityId === registrationActivityFilter).length})</h2>
                          <p className="text-sm font-medium text-on-surface-variant">Danh sách cư dân đăng ký các hoạt động chuyển đổi số</p>
                        </div>
                        <div className="flex flex-wrap items-center gap-4">
                          <button
                            onClick={handleSyncRegistrations}
                            disabled={syncStatus !== 'idle'}
                            className={cn(
                              "flex items-center gap-2 px-5 py-2.5 rounded-2xl font-black text-xs transition-all border shadow-sm uppercase tracking-wider",
                              syncStatus === 'syncing' 
                                ? "bg-amber-50 text-amber-700 border-amber-200" 
                                : syncStatus === 'success'
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : "bg-white text-on-surface border-outline-variant hover:bg-surface-subtle"
                            )}
                          >
                            <RefreshCw size={14} className={cn(syncStatus === 'syncing' && "animate-spin")} />
                            {syncStatus === 'syncing' ? 'ĐANG ĐỒNG BỘ...' : syncStatus === 'success' ? 'ĐÃ ĐỒNG BỘ!' : 'ĐỒNG BỘ SỐ LIỆU'}
                          </button>

                          <div className="flex items-center gap-3 bg-surface-subtle p-2 rounded-2xl border border-outline-variant/30">
                            <Filter size={16} className="text-on-surface-variant ml-2" />
                            <select 
                              value={registrationActivityFilter}
                              onChange={(e) => setRegistrationActivityFilter(e.target.value)}
                              className="bg-transparent text-sm font-bold text-on-surface focus:outline-none pr-4 cursor-pointer"
                            >
                              <option value="all">Tất cả hoạt động</option>
                              {activities.map(act => (
                                <option key={act.id} value={act.id}>{act.title}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="bg-surface-subtle/50 text-[10px] font-black text-on-surface-variant uppercase tracking-widest border-b border-outline-variant/30">
                              <th className="px-8 py-4">Cư dân</th><th className="px-8 py-4">Hoạt động</th><th className="px-8 py-4">Ngày đăng ký</th><th className="px-8 py-4 text-right">Thao tác</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-outline-variant/30">
                            {registrations
                              .filter(r => registrationActivityFilter === 'all' || r.activityId === registrationActivityFilter)
                              .map((r) => {
                                const userName = r.userName || r.user_name || r.name || r.fullName || r.fullname || r.residentName || r.resident_name || r.tenCuDan || r.hoTen || r.hoten || r.ho_ten || r.username || r.user?.name || r.user?.userName || r.user?.fullName || r.user?.hoTen || 'N/A';
                                const userClass = r.userClass || r.user_class || r.class || r.className || r.classname || r.khuPho || r.khu_pho || r.kp || r.lop || r.class_name || r.group || r.user?.class || r.user?.userClass || r.user?.khuPho || 'N/A';
                                const phone = r.phone || r.userPhone || r.phoneNumber || r.phone_number || r.sdt || r.soDienThoai || r.so_dien_thoai || r.telephone || r.user?.phone || r.user?.phoneNumber || 'N/A';
                                const activityTitle = r.activityTitle || r.activity_title || r.title || r.activityName || r.activity || r.tenHoatDong || r.ten_hoat_dong || r.event || r.eventName || r.activity?.title || r.activity?.name || r.activity?.activityTitle || 'N/A';

                                return (
                                  <tr key={r.id} className="hover:bg-surface-subtle/30 transition-colors group">
                                    <td className="px-8 py-6">
                                      <p className="font-bold">{userName}</p>
                                      <p className="text-[10px] text-on-surface-variant">{userClass} • {phone}</p>
                                    </td>
                                    <td className="px-8 py-6 text-sm font-medium">{activityTitle}</td>
                                    <td className="px-8 py-6 text-sm text-on-surface-variant">
                                      {(() => {
                                        if (!r.createdAt) return 'N/A';
                                        if (typeof r.createdAt.toDate === 'function') return r.createdAt.toDate().toLocaleDateString('vi-VN');
                                        if (r.createdAt instanceof Date) return r.createdAt.toLocaleDateString('vi-VN');
                                        if (typeof r.createdAt === 'string') return new Date(r.createdAt).toLocaleDateString('vi-VN');
                                        if (r.createdAt.seconds) return new Date(r.createdAt.seconds * 1000).toLocaleDateString('vi-VN');
                                        return 'N/A';
                                      })()}
                                    </td>
                                    <td className="px-8 py-6 text-right">
                                      <button onClick={() => setDeleteConfirm({ id: r.id, title: `Đăng ký của ${userName}`, type: 'registration', metadata: { activityId: r.activityId } })} className="p-2.5 text-error/60 hover:text-error transition-all"><Trash2 size={18} /></button>
                                    </td>
                                  </tr>
                                );
                              })}
                            {registrations.filter(r => registrationActivityFilter === 'all' || r.activityId === registrationActivityFilter).length === 0 && (
                              <tr>
                                <td colSpan={4} className="px-8 py-20 text-center text-on-surface-variant font-bold italic">
                                  {registrationActivityFilter === 'all' ? 'Chưa có lượt đăng ký nào.' : 'Chưa có lượt đăng ký cho hoạt động này.'}
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                 </motion.div>
               )}
               {activeTab === 'club_registrations' && (
                 <motion.div key="club_registrations" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
                    <div className="bg-white rounded-[40px] border border-outline-variant shadow-sm overflow-hidden">
                      <div className="p-8 border-b border-outline-variant/30 flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div><h2 className="text-xl font-black text-on-surface">Yêu cầu tham gia CLB ({allClubMemberships.length})</h2><p className="text-sm font-medium text-on-surface-variant">Quản lý và duyệt đăng ký tham gia</p></div>
                        <div className="flex gap-2">
                           {['all', 'pending', 'approved'].map(f => (
                             <button key={f} onClick={() => setMembershipFilter(f as any)} className={cn("px-4 py-2 rounded-xl text-xs font-black transition-all", membershipFilter === f ? "bg-primary text-white" : "bg-surface-subtle text-on-surface-variant")}>
                               {f === 'all' ? 'Tất cả' : f === 'pending' ? 'Chờ duyệt' : 'Phê duyệt'}
                             </button>
                           ))}
                        </div>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                           <thead>
                             <tr className="bg-surface-subtle/50 text-[10px] font-black text-on-surface-variant uppercase tracking-widest border-b border-outline-variant/30">
                               <th className="px-8 py-4">Thành viên</th><th className="px-8 py-4">CLB</th><th className="px-8 py-4">Trạng thái</th><th className="px-8 py-4 text-right">Thao tác</th>
                             </tr>
                           </thead>
                           <tbody className="divide-y divide-outline-variant/30">
                             {allClubMemberships.filter(m => membershipFilter === 'all' || m.status === membershipFilter).map(m => (
                               <tr key={m.id} className="hover:bg-surface-subtle/30 transition-colors group">
                                 <td className="px-8 py-6">
                                   <div>
                                     <p className="font-bold text-on-surface">{m.userName}</p>
                                     <p className="text-[10px] text-on-surface-variant">{m.userClass} • {m.userEmail}</p>
                                   </div>
                                 </td>
                                 <td className="px-8 py-6"><span className="px-3 py-1 rounded-lg text-xs font-black bg-indigo-50 text-indigo-600 border border-indigo-100">{m.clubName}</span></td>
                                 <td className="px-8 py-6"><span className={cn("px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter", m.status === 'approved' ? "bg-emerald-100 text-emerald-600" : "bg-amber-100 text-amber-600")}>{m.status === 'approved' ? 'Thành viên' : 'Chờ duyệt'}</span></td>
                                 <td className="px-8 py-6 text-right flex items-center justify-end gap-2 text-nowrap">
                                    {m.status !== 'approved' && (
                                      <button 
                                        disabled={isUpdatingStatus === m.id}
                                        onClick={() => handleUpdateMemberStatus(m.id, m.clubId, 'approved')} 
                                        className="p-2 bg-emerald-500 text-white rounded-lg shadow-lg shadow-emerald-500/20 hover:scale-110 active:scale-95 transition-all disabled:opacity-50"
                                        title="Duyệt"
                                      >
                                        {isUpdatingStatus === m.id ? <Clock size={14} className="animate-spin" /> : <Check size={14} />}
                                      </button>
                                    )}
                                    {m.status === 'approved' && (
                                      <button 
                                        disabled={isUpdatingStatus === m.id}
                                        onClick={() => handleUpdateMemberStatus(m.id, m.clubId, 'pending')}
                                        className="p-2 bg-surface-subtle text-on-surface-variant rounded-lg hover:bg-surface-container transition-all"
                                        title="Hoàn tác về chờ duyệt"
                                      >
                                        <Clock size={14} />
                                      </button>
                                    )}
                                    <button onClick={() => setDeleteConfirm({ id: m.id, title: `Đăng ký của ${m.userName}`, type: 'club_membership', metadata: { memberId: m.id, clubId: m.clubId, status: m.status } })} className="p-2 bg-error text-white rounded-lg shadow-lg shadow-error/20 hover:scale-110 active:scale-95 transition-all"><Trash2 size={14} /></button>
                                 </td>
                               </tr>
                             ))}
                           </tbody>
                        </table>
                      </div>
                    </div>
                 </motion.div>
               )}
                {activeTab === 'achievements' && (
                  <motion.div key="achievements" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-10">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                      {/* Exemplary Members */}
                       <div className="bg-white rounded-[40px] border border-outline-variant shadow-sm overflow-hidden flex flex-col">
                        <div className="p-8 border-b border-outline-variant/30 flex justify-between items-center">
                          <div className="flex items-center gap-3">
                            <Star className="text-amber-500" fill="currentColor" />
                            <h2 className="text-xl font-black text-on-surface uppercase tracking-tight">Gương mặt tiêu biểu</h2>
                          </div>
                          <button onClick={() => { setExemplaryForm({ name: '', class: '', schoolYear: '2023 - 2024', achievement: '', rank: 'Xuất sắc', avatar: '' }); setExemplaryModal({ open: true }); }} className="p-2 bg-amber-50 text-amber-600 rounded-xl hover:bg-amber-100 transition-all"><Plus size={20} /></button>
                        </div>
                        <div className="p-4 space-y-3 overflow-y-auto max-h-[500px]">
                          {exemplaryMembers.map(a => (
                            <div key={a.id} className="flex items-center justify-between p-4 bg-surface-subtle/50 rounded-2xl hover:bg-surface-subtle transition-colors group">
                               <div className="flex items-center gap-4">
                                 <div className="w-12 h-12 rounded-full overflow-hidden bg-surface-subtle border-2 border-white shadow-sm">
                                   <img src={a.avatar || "https://via.placeholder.com/100"} alt="" className="w-full h-full object-cover" />
                                 </div>
                                 <div>
                                   <p className="font-black text-on-surface">{a.name} - {a.class}</p>
                                   <p className="text-xs font-bold text-on-surface-variant italic line-clamp-1">{a.achievement}</p>
                                 </div>
                               </div>
                               <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  {canEdit && <button onClick={() => { setExemplaryForm({ name: a.name, class: a.class, schoolYear: a.schoolYear || '2023 - 2024', achievement: a.achievement, rank: a.rank || 'Xuất sắc', avatar: a.avatar || '' }); setExemplaryModal({ open: true, data: a }); }} className="p-2 text-primary hover:bg-primary/10 rounded-lg"><Edit3 size={16} /></button>}
                                  {canDelete && <button onClick={() => setDeleteConfirm({ id: a.id, title: a.name, type: 'exemplary_member' })} className="p-2 text-error hover:bg-error/10 rounded-lg"><Trash2 size={16} /></button>}
                               </div>
                            </div>
                          ))}
                          {exemplaryMembers.length === 0 && <p className="text-center py-10 text-on-surface-variant font-medium italic">Chưa có dữ liệu đội viên tiêu biểu.</p>}
                        </div>
                      </div>

                      {/* Collective Achievements */}
                      <div className="bg-white rounded-[40px] border border-outline-variant shadow-sm overflow-hidden flex flex-col">
                        <div className="p-8 border-b border-outline-variant/30 flex justify-between items-center">
                          <div className="flex items-center gap-3">
                            <Trophy className="text-primary" fill="currentColor" />
                            <h2 className="text-xl font-black text-on-surface uppercase tracking-tight">Thành tích tập thể</h2>
                          </div>
                          <button onClick={() => { setCollectiveForm({ title: '', date: '', content: '', certificateImage: '', gallery: [] }); setCollectiveModal({ open: true }); }} className="p-2 bg-primary/5 text-primary rounded-xl hover:bg-primary/10 transition-all"><Plus size={20} /></button>
                        </div>
                        <div className="p-4 space-y-3 overflow-y-auto max-h-[500px]">
                          {collectiveAchievements.map(a => (
                            <div key={a.id} className="flex items-center justify-between p-4 bg-surface-subtle/50 rounded-2xl hover:bg-surface-subtle transition-colors group">
                               <div className="flex items-center gap-4">
                                 <div className="w-16 h-12 rounded-lg overflow-hidden bg-surface-subtle">
                                   <img src={a.certificateImage || "https://via.placeholder.com/150"} alt="" className="w-full h-full object-cover" />
                                 </div>
                                 <div>
                                   <p className="font-black text-on-surface line-clamp-1">{a.title}</p>
                                   <p className="text-xs font-bold text-on-surface-variant">{a.date}</p>
                                 </div>
                               </div>
                               <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  {canEdit && <button onClick={() => { setCollectiveForm({ title: a.title, date: a.date, content: a.content, certificateImage: a.certificateImage, gallery: a.gallery || [] }); setCollectiveModal({ open: true, data: a }); }} className="p-2 text-primary hover:bg-primary/10 rounded-lg"><Edit3 size={16} /></button>}
                                  {canDelete && <button onClick={() => setDeleteConfirm({ id: a.id, title: a.title, type: 'collective_achievement' })} className="p-2 text-error hover:bg-error/10 rounded-lg"><Trash2 size={16} /></button>}
                               </div>
                            </div>
                          ))}
                          {collectiveAchievements.length === 0 && <p className="text-center py-10 text-on-surface-variant font-medium italic">Chưa có thành tích tập thể nào.</p>}
                        </div>
                      </div>
                    </div>

                    {/* Excellent Classes Section */}
                    <div className="bg-white rounded-[40px] border border-outline-variant shadow-sm overflow-hidden flex flex-col">
                      <div className="p-8 border-b border-outline-variant/30 flex justify-between items-center">
                        <div className="flex items-center gap-3">
                          <Sparkles className="text-rose-500" fill="currentColor" />
                          <h2 className="text-xl font-black text-on-surface uppercase tracking-tight">Vinh danh lớp xuất sắc</h2>
                        </div>
                        <button onClick={() => { setExcellentForm({ week: `Tuần ${Math.ceil(new Date().getDate() / 7)} - Tháng ${new Date().getMonth() + 1}`, grade6: '', grade7: '', grade8: '', grade9: '' }); setExcellentModal({ open: true }); }} className="flex items-center gap-2 px-6 py-3 bg-rose-500 text-white rounded-xl font-bold text-sm shadow-xl shadow-rose-500/10 hover:scale-105 transition-all"><Plus size={18} /> THÊM TUẦN MỚI</button>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="bg-surface-subtle/50 text-[10px] font-black text-on-surface-variant uppercase tracking-widest border-b border-outline-variant/30">
                              <th className="px-8 py-4">Tuần / Tháng</th>
                              <th className="px-8 py-4 text-center">Khối 6</th>
                              <th className="px-8 py-4 text-center">Khối 7</th>
                              <th className="px-8 py-4 text-center">Khối 8</th>
                              <th className="px-8 py-4 text-center">Khối 9</th>
                              <th className="px-8 py-4 text-right">Thao tác</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-outline-variant/30">
                            {excellentClasses.map((item) => (
                              <tr key={item.id} className="hover:bg-surface-subtle/30 transition-colors group">
                                <td className="px-8 py-6 font-black text-primary">{item.week}</td>
                                <td className="px-8 py-6 text-center"><span className="px-3 py-1 bg-surface-subtle rounded-lg text-xs font-bold">{item.grade6}</span></td>
                                <td className="px-8 py-6 text-center"><span className="px-3 py-1 bg-surface-subtle rounded-lg text-xs font-bold">{item.grade7}</span></td>
                                <td className="px-8 py-6 text-center"><span className="px-3 py-1 bg-surface-subtle rounded-lg text-xs font-bold">{item.grade8}</span></td>
                                <td className="px-8 py-6 text-center"><span className="px-3 py-1 bg-surface-subtle rounded-lg text-xs font-bold">{item.grade9}</span></td>
                                <td className="px-8 py-6 text-right">
                                  <div className="flex justify-end gap-2">
                                     {canEdit && <button onClick={() => { setExcellentForm({ week: item.week, grade6: item.grade6, grade7: item.grade7, grade8: item.grade8, grade9: item.grade9 }); setExcellentModal({ open: true, data: item }); }} className="p-2.5 text-primary hover:bg-primary/5 rounded-xl transition-all"><Edit3 size={18} /></button>}
                                     {canDelete && <button onClick={() => setDeleteConfirm({ id: item.id, title: item.week, type: 'excellent_class' })} className="p-2.5 text-error/60 hover:text-error hover:bg-error/5 rounded-xl transition-all"><Trash2 size={18} /></button>}
                                  </div>
                                </td>
                              </tr>
                            ))}
                            {excellentClasses.length === 0 && (
                              <tr><td colSpan={6} className="px-8 py-10 text-center text-on-surface-variant font-medium italic">Chưa có dữ liệu lớp xuất sắc.</td></tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </motion.div>
                )}

               {activeTab === 'messages' && (
                 <motion.div key="messages" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                    <div className="bg-white rounded-[40px] border border-outline-variant shadow-sm overflow-hidden">
                      <div className="p-8 border-b border-outline-variant/30 flex justify-between items-center">
                        <h2 className="text-xl font-black text-on-surface">Trung tâm Tin nhắn ({contactMessages.length})</h2>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="bg-surface-subtle/50 text-[10px] font-black text-on-surface-variant uppercase tracking-widest border-b border-outline-variant/30">
                              <th className="px-8 py-4">Người gửi</th>
                              <th className="px-8 py-4">Chủ đề</th>
                              <th className="px-8 py-4">Ngày gửi</th>
                              <th className="px-8 py-4 text-center">Trạng thái</th>
                              <th className="px-8 py-4 text-right">Thao tác</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-outline-variant/30">
                            {contactMessages.map((m) => (
                              <tr key={m.id} className="hover:bg-surface-subtle/30 transition-colors group">
                                <td className="px-8 py-6">
                                   <div className="flex items-center gap-4">
                                      <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 font-black text-xs">{m.name?.charAt(0).toUpperCase()}</div>
                                      <div>
                                        <p className="font-bold text-on-surface">{m.name}</p>
                                        <p className="text-[10px] text-on-surface-variant italic">{m.contact}</p>
                                      </div>
                                   </div>
                                </td>
                                <td className="px-8 py-6">
                                   <p className="text-sm font-medium text-on-surface line-clamp-1">{m.subject}</p>
                                </td>
                                <td className="px-8 py-6 whitespace-nowrap">
                                   <p className="text-sm text-on-surface-variant">{m.createdAt?.toDate ? m.createdAt.toDate().toLocaleDateString('vi-VN') : 'N/A'}</p>
                                </td>
                                <td className="px-8 py-6 text-center">
                                   <span className={cn(
                                     "px-3 py-1 rounded-lg text-[10px] font-black uppercase",
                                     m.status === 'unread' ? "bg-amber-100 text-amber-600" : "bg-emerald-100 text-emerald-600"
                                   )}>
                                     {m.status === 'unread' ? 'Chưa đọc' : 'Đã đọc'}
                                   </span>
                                </td>
                                <td className="px-8 py-6 text-right">
                                   <div className="flex justify-end gap-2">
                                      <button 
                                        onClick={() => { setMessageModal({ open: true, data: m }); if(m.status === 'unread') updateDoc(doc(db, 'contact_messages', m.id), { status: 'read' }); }} 
                                        className="p-3 bg-surface-subtle text-on-surface-variant hover:text-primary hover:bg-primary/10 rounded-2xl transition-all"
                                      >
                                        <Eye size={18} />
                                      </button>
                                      <button 
                                        onClick={() => setDeleteConfirm({ id: m.id, title: `Tin nhắn từ ${m.name}`, type: 'message' })} 
                                        className="p-3 bg-surface-subtle text-error/60 hover:text-error hover:bg-error/10 rounded-2xl transition-all"
                                      >
                                        <Trash2 size={18} />
                                      </button>
                                   </div>
                                </td>
                              </tr>
                            ))}
                            {contactMessages.length === 0 && (
                              <tr>
                                <td colSpan={5} className="px-8 py-20 text-center text-on-surface-variant font-bold italic">
                                  Hòm thư hiện đang trống.
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                 </motion.div>
               )}

               {activeTab === 'settings' && (
                 <motion.div key="settings" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                   <form onSubmit={handleSaveSettings} className="bg-white rounded-[40px] border border-outline-variant shadow-sm overflow-hidden p-10 space-y-10">
                      <div className="space-y-2">
                        <h2 className="text-3xl font-black text-on-surface tracking-tighter uppercase">Cấu hình Hệ thống</h2>
                        <p className="text-on-surface-variant font-medium italic">Điều chỉnh các thông tin cơ bản của website và liên hệ.</p>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                        {/* Site Branding */}
                        <div className="space-y-8">
                          <div className="flex items-center gap-2 text-xs font-black uppercase text-primary tracking-widest border-b border-outline-variant/30 pb-3">
                            <Sparkles size={14} /> Thông tin hiển thị
                          </div>
                          
                          <div className="space-y-6">
                             <div className="space-y-4">
                                <label className="text-[10px] font-black uppercase text-outline px-2">Logo Website</label>
                                <div className="flex items-center gap-6">
                                   <div className="w-24 h-24 bg-surface-subtle rounded-3xl border-2 border-outline-variant flex items-center justify-center overflow-hidden relative group">
                                      <img src={siteSettings.logoUrl || null} className="w-full h-full object-contain p-2" alt="Logo" />
                                      {isUploading && (
                                        <div className="absolute inset-0 bg-white/60 flex items-center justify-center">
                                          <div className="w-6 h-6 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
                                        </div>
                                      )}
                                   </div>
                                   <div className="space-y-2">
                                      <button 
                                        type="button"
                                        onClick={() => {
                                          const input = document.createElement('input');
                                          input.type = 'file';
                                          input.accept = 'image/*';
                                          input.onchange = (e) => handleLogoChange(e as any);
                                          input.click();
                                        }}
                                        className="px-4 py-2 bg-primary/10 text-primary text-xs font-black rounded-xl hover:bg-primary/20 transition-all"
                                      >
                                        TẢI LÊN LOGO MỚI
                                      </button>
                                      <p className="text-[10px] text-on-surface-variant font-medium">Định dạng PNG, JPG (Tối đa 2MB)</p>
                                   </div>
                                </div>
                             </div>

                             <div className="space-y-1">
                                <label className="text-[10px] font-black uppercase text-outline px-2">Tên Website / Tên Phường</label>
                                <input 
                                  required
                                  value={siteSettings.siteName || ''} 
                                  onChange={e => setSiteSettings({...siteSettings, siteName: e.target.value})} 
                                  className="w-full px-5 py-4 bg-surface-subtle rounded-2xl outline-none font-bold text-sm focus:ring-2 ring-primary/20 transition-all border border-transparent focus:border-primary/30"
                                />
                             </div>
                          </div>
                        </div>

                        {/* Contact Info */}
                        <div className="space-y-8">
                          <div className="flex items-center gap-2 text-xs font-black uppercase text-indigo-600 tracking-widest border-b border-outline-variant/30 pb-3">
                            <Mail size={14} /> Thông tin liên hệ
                          </div>

                          <div className="space-y-6">
                             <div className="space-y-1">
                                <label className="text-[10px] font-black uppercase text-outline px-2">Địa chỉ</label>
                                <input 
                                  required
                                  value={siteSettings.address || ''} 
                                  onChange={e => setSiteSettings({...siteSettings, address: e.target.value})} 
                                  className="w-full px-5 py-4 bg-surface-subtle rounded-2xl outline-none font-bold text-sm focus:ring-2 ring-primary/20 transition-all border border-transparent focus:border-primary/30"
                                />
                             </div>
                             <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                   <label className="text-[10px] font-black uppercase text-outline px-2">Số điện thoại</label>
                                   <input 
                                     required
                                     value={siteSettings.phone || ''} 
                                     onChange={e => setSiteSettings({...siteSettings, phone: e.target.value})} 
                                     className="w-full px-5 py-4 bg-surface-subtle rounded-2xl outline-none font-bold text-sm focus:ring-2 ring-primary/20 transition-all border border-transparent focus:border-primary/30"
                                   />
                                </div>
                                <div className="space-y-1">
                                   <label className="text-[10px] font-black uppercase text-outline px-2">Email hệ thống</label>
                                   <input 
                                     required
                                     type="email"
                                     value={siteSettings.email || ''} 
                                     onChange={e => setSiteSettings({...siteSettings, email: e.target.value})} 
                                     className="w-full px-5 py-4 bg-surface-subtle rounded-2xl outline-none font-bold text-sm focus:ring-2 ring-primary/20 transition-all border border-transparent focus:border-primary/30"
                                   />
                                </div>
                             </div>
                          </div>
                        </div>
                      </div>

                      <div className="pt-10 border-t border-outline-variant/30 flex flex-col md:flex-row md:items-center justify-between gap-6">
                         <div className="flex items-center gap-3 p-4 bg-amber-50 border border-amber-100 rounded-2xl text-amber-700">
                           <AlertCircle size={20} />
                           <p className="text-xs font-bold leading-relaxed italic">Các thay đổi về cấu hình sẽ có hiệu lực ngay lập tức với toàn bộ người dùng đang trực tuyến.</p>
                         </div>
                         <button 
                           type="submit"
                           className="px-10 py-5 bg-primary text-white rounded-3xl font-black shadow-2xl shadow-primary/20 uppercase tracking-widest text-sm hover:scale-105 active:scale-95 transition-all"
                         >
                           LƯU CẤU HÌNH HỆ THỐNG
                         </button>
                      </div>
                   </form>

                   {/* Secondary Settings */}
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="bg-white p-8 rounded-[40px] border border-outline-variant shadow-sm space-y-6">
                         <div className="flex items-center gap-2 text-xs font-black uppercase text-outline tracking-widest">
                            <Lock size={14} /> Quyền hạn câu lạc bộ
                         </div>
                         <div className="space-y-4">
                            <div className="flex justify-between items-center p-4 bg-surface-subtle rounded-2xl border border-outline-variant/20">
                               <div className="space-y-0.5">
                                  <p className="text-sm font-bold">Duyệt tự động ứng viên</p>
                                  <p className="text-[10px] text-on-surface-variant">Cho phép cư dân tham gia CLB không cần phê duyệt</p>
                               </div>
                               <button 
                                 type="button"
                                 onClick={() => setSiteSettings(prev => ({ ...prev, autoApproveMembers: !prev.autoApproveMembers }))}
                                 className={`w-12 h-6 rounded-full relative transition-colors duration-300 ${siteSettings.autoApproveMembers ? 'bg-primary' : 'bg-surface-container'}`}
                               >
                                  <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all duration-300 ${siteSettings.autoApproveMembers ? 'left-7' : 'left-1'}`}></div>
                                </button>
                            </div>
                         </div>
                      </div>

                      <div className="bg-white p-8 rounded-[40px] border border-outline-variant shadow-sm space-y-6">
                         <div className="flex items-center gap-2 text-xs font-black uppercase text-outline tracking-widest">
                            <ShieldAlert size={14} /> Quản trị viên lâm thời
                         </div>
                         <div className="space-y-2">
                           {usersList.filter(u => u.isAdmin).map(u => (
                             <div key={u.id} className="flex items-center justify-between p-4 bg-indigo-50 border border-indigo-100 rounded-2xl group">
                                <div className="flex items-center gap-3">
                                   <div className="w-8 h-8 bg-indigo-200 rounded-full flex items-center justify-center text-indigo-700 text-[10px] font-black">
                                      {u.email.charAt(0).toUpperCase()}
                                   </div>
                                   <span className="text-xs font-bold text-indigo-900">{u.email}</span>
                                </div>
                                <span className="text-[10px] font-black bg-white text-indigo-700 px-2 py-1 rounded-lg border border-indigo-100 shadow-sm">CORE</span>
                             </div>
                           ))}
                         </div>
                      </div>
                   </div>
                 </motion.div>
               )}

               {activeTab === 'database' && (
                 <motion.div key="database" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-8">
                   <div className="bg-white rounded-[40px] border border-outline-variant shadow-sm overflow-hidden p-10 space-y-10">
                     {/* Header Section */}
                     <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-outline-variant/30">
                       <div className="space-y-2">
                         <div className="flex items-center gap-2">
                           <span className="relative flex h-3 w-3">
                             <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                             <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                           </span>
                           <span className="text-xs font-black text-emerald-600 uppercase tracking-widest bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100">
                             Cloud Firestore Trực Tuyến
                           </span>
                         </div>
                         <h2 className="text-3xl font-black text-on-surface tracking-tighter uppercase">Hệ thống Cơ sở dữ liệu và Lưu trữ</h2>
                         <p className="text-on-surface-variant font-medium text-sm">
                           Bảng điều khiển sao lưu, phục hồi và kiểm soát vòng đời dữ liệu thời gian thực của Cổng thông tin Phường Cát Lái.
                         </p>
                       </div>
                       
                       <div className="flex items-center gap-4">
                         <button
                           type="button"
                           onClick={handleBackupDatabase}
                           disabled={isBackupExporting}
                           className="flex items-center gap-2 px-6 py-4 bg-primary text-white text-xs font-black rounded-2xl hover:bg-primary/90 transition-all disabled:opacity-50"
                         >
                           <Download size={16} /> 
                           {isBackupExporting ? 'ĐANG SAO LƯU...' : 'SAO LƯU TOÀN BỘ (JSON)'}
                         </button>
                         <button
                           type="button"
                           onClick={handleSeedMockData}
                           disabled={isSeeding}
                           className="flex items-center gap-2 px-6 py-4 bg-amber-500 text-black text-xs font-black rounded-2xl hover:bg-amber-600 transition-all disabled:opacity-50"
                         >
                           <RefreshCw size={16} className={isSeeding ? 'animate-spin' : ''} /> 
                           {isSeeding ? 'ĐANG PHÁT SINH...' : 'KHỞI TẠO DỮ LIỆU MẪU'}
                         </button>
                       </div>
                     </div>

                     {/* Stats Panel */}
                     <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                       <div className="bg-surface-subtle p-6 rounded-3xl border border-outline-variant/30 text-center space-y-1">
                         <p className="text-[10px] font-black uppercase text-outline">Tổng Số Bản Ghi</p>
                         <p className="text-3xl font-black text-primary">
                           {(newsList.length + schedules.length + activities.length + registrations.length + exemplaryMembers.length + excellentClasses.length + collectiveAchievements.length + clubs.length + scoutStats.length + allClubMemberships.length + contactMessages.length + usersList.length).toLocaleString()}
                         </p>
                         <p className="text-[9px] text-on-surface-variant font-medium">Bản ghi được listener cập nhật</p>
                       </div>
                       <div className="bg-surface-subtle p-6 rounded-3xl border border-outline-variant/30 text-center space-y-1">
                         <p className="text-[10px] font-black uppercase text-outline">Tài Khoản Thành Viên</p>
                         <p className="text-3xl font-black text-on-surface">
                           {usersList.length}
                         </p>
                         <p className="text-[9px] text-on-surface-variant font-medium">Học sinh & ban chỉ huy đội</p>
                       </div>
                       <div className="bg-surface-subtle p-6 rounded-3xl border border-outline-variant/30 text-center space-y-1">
                         <p className="text-[10px] font-black uppercase text-outline">Bộ Sưu Tập Ghi Nhận</p>
                         <p className="text-3xl font-black text-on-surface">11</p>
                         <p className="text-[9px] text-on-surface-variant font-medium">Cấu trúc bảng dữ liệu độc lập</p>
                       </div>
                       <div className="bg-surface-subtle p-6 rounded-3xl border border-outline-variant/30 text-center space-y-1">
                         <p className="text-[10px] font-black uppercase text-outline">Bộ Nhớ Cache</p>
                         <p className="text-3xl font-black text-emerald-600">Đã Kích Hoạt</p>
                         <p className="text-[9px] text-on-surface-variant font-medium">Hỗ trợ hoạt động offline</p>
                       </div>
                     </div>

                     {/* Import / Restore Section */}
                     <div className="bg-indigo-50/50 rounded-3xl border border-indigo-100 p-8 space-y-6">
                       <div className="flex items-center gap-3">
                         <div className="p-3 bg-indigo-100/60 text-indigo-700 rounded-2xl">
                           <Server size={20} />
                         </div>
                         <div>
                           <h4 className="text-base font-black text-indigo-900 uppercase tracking-tight">Khôi phục từ tệp sao lưu (Restore Database)</h4>
                           <p className="text-xs text-indigo-800 font-bold">Nhập vào tệp dạng .json đã được xuất ra trước đó để khôi phục trạng thái hoạt động.</p>
                         </div>
                       </div>
                       
                       <div className="flex items-center gap-4 bg-white p-4 rounded-2xl border border-indigo-200">
                         <input 
                           type="file" 
                           accept=".json" 
                           disabled={isBackupImporting}
                           onChange={(e) => {
                             const file = e.target.files?.[0];
                             if (file) {
                               handleImportDatabase(file);
                             }
                           }}
                           className="text-xs font-bold text-on-surface-gradient file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-black file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer"
                         />
                         {isBackupImporting && (
                           <div className="flex items-center gap-2 text-xs font-black text-indigo-700 animate-pulse ml-auto">
                             <RefreshCw size={14} className="animate-spin" /> ĐẢNG NHẬP DỮ LIỆU...
                           </div>
                         )}
                       </div>
                     </div>

                     {/* Collections List Section */}
                     <div className="space-y-4">
                       <div className="flex items-center justify-between">
                         <h3 className="text-xl font-black text-on-surface tracking-tight uppercase">Danh sách bộ sưu tập dữ liệu</h3>
                         <span className="text-xs font-bold text-on-surface-variant font-bold">Cập Nhật Trực Tiếp</span>
                       </div>

                       <div className="overflow-x-auto border border-outline-variant/30 rounded-3xl">
                         <table className="w-full text-left border-collapse">
                           <thead>
                             <tr className="bg-surface-subtle text-outline text-[10px] font-black uppercase tracking-wider border-b border-outline-variant/40">
                               <th className="px-8 py-4">Tên Bộ Sưu Tập</th>
                               <th className="px-8 py-4">Mã Bộ Sưu Tập</th>
                               <th className="px-8 py-4 text-center">Số Lượng Bản Ghi</th>
                               <th className="px-8 py-4">Chế Độ Giám Sát</th>
                               <th className="px-8 py-4 text-right">Khôi Phục/Xóa</th>
                             </tr>
                           </thead>
                           <tbody className="divide-y divide-outline-variant/20 text-sm">
                             {[
                               { label: 'Tin tức & Bài viết', id: 'news', count: newsList.length },
                               { label: 'Sự kiện & Hoạt động', id: 'activities', count: activities.length },
                               { label: 'Đăng ký Hoạt động', id: 'registrations', count: registrations.length },
                               { label: 'Công dân tiêu biểu', id: 'exemplary_members', count: exemplaryMembers.length },
                               { label: 'Lớp xuất sắc tuần', id: 'excellent_classes', count: excellentClasses.length },
                               { label: 'Thành tích Tập thể', id: 'collective_achievements', count: collectiveAchievements.length },
                               { label: 'Danh Sách Câu Lạc Bộ', id: 'clubs', count: clubs.length },
                               { label: 'Chứng nhận Thành viên CLB', id: 'club_memberships', count: allClubMemberships.length },
                               { label: 'Lịch hoạt động Đội', id: 'schedules', count: schedules.length },
                               { label: 'Thống kê mật độ Lớp', id: 'scout_stats', count: scoutStats.length },
                               { label: 'Tin Nhắn & Liên Hệ', id: 'contact_messages', count: contactMessages.length }
                             ].map((col) => (
                               <tr key={col.id} className="hover:bg-surface-subtle/30 transition-colors">
                                 <td className="px-8 py-5 font-bold text-on-surface">{col.label}</td>
                                 <td className="px-8 py-5 font-mono text-xs text-on-surface-variant">{col.id}</td>
                                 <td className="px-8 py-5 font-black text-center text-primary">{col.count}</td>
                                 <td className="px-8 py-5">
                                   <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black bg-emerald-50 text-emerald-700 border border-emerald-100">
                                     <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> LIVE SYNC
                                   </span>
                                 </td>
                                 <td className="px-8 py-5 text-right font-medium">
                                   <button 
                                     type="button"
                                     onClick={() => handleWipeCollection(col.id, col.label)}
                                     disabled={isWiping === col.id}
                                     className="px-3 py-1.5 bg-error/10 text-error hover:bg-error/20 rounded-xl text-xs font-black transition-all disabled:opacity-50 inline-flex items-center gap-1.5"
                                   >
                                     <Trash2 size={12} />
                                     {isWiping === col.id ? 'Đang xóa...' : 'XÓA BẢN GHI'}
                                   </button>
                                 </td>
                               </tr>
                             ))}
                           </tbody>
                         </table>
                       </div>
                     </div>
                   </div>
                 </motion.div>
               )}
               {activeTab === 'activities' && (
                 <motion.div key="activities" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-8">
                   {/* Detailed Stats Cards */}
                   <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                     <div className="bg-white p-8 rounded-[32px] border border-outline-variant shadow-sm space-y-2">
                       <p className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest">Tỉ lệ Duyệt CLB</p>
                       <div className="flex items-baseline gap-2">
                         <h4 className="text-3xl font-black text-primary">
                           {allClubMemberships.length > 0 
                             ? Math.round((allClubMemberships.filter(m => m.status === 'approved').length / allClubMemberships.length) * 100) 
                             : 0}%
                         </h4>
                         <span className="text-xs font-bold text-on-surface-variant">Thành công</span>
                       </div>
                       <div className="w-full h-2 bg-surface-subtle rounded-full overflow-hidden">
                         <div 
                           className="h-full bg-primary transition-all duration-1000" 
                           style={{ width: `${allClubMemberships.length > 0 ? (allClubMemberships.filter(m => m.status === 'approved').length / allClubMemberships.length) * 100 : 0}%` }} 
                         />
                       </div>
                     </div>
                     
                     <div className="bg-white p-8 rounded-[32px] border border-outline-variant shadow-sm space-y-2">
                       <p className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest">Đăng ký Hoạt động</p>
                       <div className="flex items-baseline gap-2">
                         <h4 className="text-3xl font-black text-emerald-600">{registrations.length}</h4>
                         <span className="text-xs font-bold text-on-surface-variant">Lượt đăng ký</span>
                       </div>
                       <p className="text-[10px] font-medium text-on-surface-variant">Tổng số cư dân đăng ký các hoạt động</p>
                     </div>

                     <div className="bg-white p-8 rounded-[32px] border border-outline-variant shadow-sm space-y-2">
                       <p className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest">Tin nhắn phản hồi</p>
                       <div className="flex items-baseline gap-2">
                         <h4 className="text-3xl font-black text-amber-500">{contactMessages.length}</h4>
                         <span className="text-xs font-bold text-on-surface-variant">Tin nhắn</span>
                       </div>
                       <p className="text-[10px] font-medium text-on-surface-variant">Cần xử lý: {contactMessages.filter(m => m.status === 'unread').length}</p>
                     </div>
                   </div>

                   <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                      <div className="bg-white rounded-[40px] border border-outline-variant shadow-sm overflow-hidden flex flex-col">
                         <div className="p-8 border-b border-outline-variant/30">
                           <h3 className="text-xl font-black text-on-surface uppercase tracking-tight">Thống kê Truy cập</h3>
                           <p className="text-xs font-medium text-on-surface-variant">Số liệu tổng hợp lượt xem toàn trang</p>
                         </div>
                         <div className="p-8 space-y-8">
                           <div className="flex items-center gap-8">
                             <div className="flex-1 space-y-1">
                               <p className="text-sm font-black text-primary">{siteStats.totalVisits.toLocaleString()}</p>
                               <p className="text-[10px] font-black text-outline uppercase tracking-widest">Tổng lượt truy cập</p>
                             </div>
                             <div className="w-[1px] h-10 bg-outline-variant/30" />
                             <div className="flex-1 space-y-1">
                               <p className="text-sm font-black text-secondary">{newsList.reduce((acc: number, n: any) => acc + (n.views || 0), 0).toLocaleString()}</p>
                               <p className="text-[10px] font-black text-outline uppercase tracking-widest">Lượt xem bài viết</p>
                             </div>
                           </div>
                           
                           <div className="h-48 flex items-end justify-between gap-3 px-2">
                             {[35, 55, 42, 85, 60, 75, 95].map((h, i) => (
                               <div key={i} className="flex-1 bg-primary/10 rounded-t-2xl relative group hover:bg-primary/20 transition-all cursor-help" style={{ height: `${h}%` }}>
                                  <div className="absolute -top-10 left-1/2 -translate-x-1/2 px-3 py-1 bg-on-surface text-white text-[10px] font-black rounded-lg opacity-0 group-hover:opacity-100 transition-all whitespace-nowrap shadow-xl">
                                    ~{Math.round((siteStats.totalVisits / 100) * h)} lượt
                                  </div>
                               </div>
                             ))}
                           </div>
                           <div className="flex justify-between text-[10px] font-black text-outline uppercase px-2">
                              <span>T2</span><span>T3</span><span>T4</span><span>T5</span><span>T6</span><span>T7</span><span>CN</span>
                           </div>
                         </div>
                      </div>

                      <div className="bg-white rounded-[40px] border border-outline-variant shadow-sm overflow-hidden flex flex-col">
                         <div className="p-8 border-b border-outline-variant/30">
                           <h3 className="text-xl font-black text-on-surface uppercase tracking-tight">Cơ cấu Nội dung</h3>
                           <p className="text-xs font-medium text-on-surface-variant">Phân tích chuyên mục tin bài</p>
                         </div>
                         <div className="p-8 space-y-6">
                            {['Tin hoạt động', 'Thông báo', 'Gương sáng đội viên', 'Video'].map((cat, idx) => {
                              const count = newsList.filter(n => n.category === cat).length;
                              const percentage = newsList.length > 0 ? Math.round((count / newsList.length) * 100) : 0;
                              const colors = ['bg-indigo-500', 'bg-emerald-500', 'bg-amber-500', 'bg-rose-500'];
                              return (
                                <div key={cat} className="space-y-2">
                                   <div className="flex justify-between items-end">
                                     <span className="text-xs font-black text-on-surface">{cat}</span>
                                     <span className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest">{count} bài ({percentage}%)</span>
                                   </div>
                                   <div className="w-full h-2.5 bg-surface-subtle rounded-full overflow-hidden">
                                     <motion.div 
                                       initial={{ width: 0 }}
                                       animate={{ width: `${percentage}%` }}
                                       transition={{ duration: 1, delay: idx * 0.1 }}
                                       className={cn("h-full rounded-full", colors[idx % colors.length])} 
                                     />
                                   </div>
                                </div>
                              );
                            })}
                            
                            <div className="mt-10 pt-8 border-t border-outline-variant/30 flex items-center justify-between">
                              <div>
                                <p className="text-2xl font-black text-on-surface">{newsList.length}</p>
                                <p className="text-[10px] font-black text-outline uppercase tracking-widest">Tổng số bài viết</p>
                              </div>
                              <button onClick={() => setActiveTab('news')} className="px-6 py-3 bg-surface-subtle hover:bg-surface-container rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all">Chi tiết bài viết</button>
                             </div>
                         </div>
                      </div>
                   </div>
                 </motion.div>
               )}
            </AnimatePresence>
          </>
        )}
      </main>

      {/* Modals */}
      <AnimatePresence>
        {exemplaryModal.open && (
           <div className="fixed inset-0 z-[160] flex items-center justify-center p-6">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setExemplaryModal({ open: false })} className="absolute inset-0 bg-surface-on/40 backdrop-blur-md" />
              <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }} className="relative w-full max-w-xl bg-white rounded-[40px] shadow-2xl p-8 space-y-6">
                 <div className="flex justify-between items-center"><h3 className="text-2xl font-black">{exemplaryModal.data ? 'Cập Nhật Gương Sáng' : 'Thêm Gương Sáng Mới'}</h3><button onClick={() => setExemplaryModal({ open: false })} className="p-2 hover:bg-surface-subtle rounded-xl"><X size={20} /></button></div>
                 <form onSubmit={handleSaveExemplary} className="space-y-5">
                    <div className="flex gap-6 items-start">
                       <div className="shrink-0 space-y-2">
                          <label className="text-[10px] font-black uppercase text-outline px-2">Ảnh đại diện</label>
                          <div 
                            onClick={() => {
                               const input = document.createElement('input');
                               input.type = 'file';
                               input.accept = 'image/*';
                               input.onchange = async (e) => {
                                  const file = (e.target as HTMLInputElement).files?.[0];
                                  if (!file) return;
                                  const reader = new FileReader();
                                  reader.onload = async (event) => {
                                     const base64 = event.target?.result as string;
                                     const compressed = await compressImage(base64, 0.7, 400);
                                     setExemplaryForm({ ...exemplaryForm, avatar: compressed });
                                  };
                                  reader.readAsDataURL(file);
                               };
                               input.click();
                            }}
                            className="w-24 h-24 rounded-full bg-surface-subtle border-2 border-dashed border-outline-variant flex items-center justify-center cursor-pointer hover:bg-surface-container overflow-hidden"
                          >
                             {exemplaryForm.avatar ? <img src={exemplaryForm.avatar} className="w-full h-full object-cover" alt="" /> : <Upload size={24} className="text-outline" />}
                          </div>
                       </div>
                       <div className="flex-1 space-y-4">
                          <div className="space-y-1"><label className="text-[10px] font-black uppercase text-outline">Họ và tên</label><input required value={exemplaryForm.name || ''} onChange={e => setExemplaryForm({...exemplaryForm, name: e.target.value})} className="w-full px-5 py-3 bg-surface-subtle rounded-xl outline-none font-bold text-sm" /></div>
                          <div className="grid grid-cols-2 gap-3">
                             <div className="space-y-1"><label className="text-[10px] font-black uppercase text-outline">Lớp</label><input required value={exemplaryForm.class || ''} onChange={e => setExemplaryForm({...exemplaryForm, class: e.target.value})} className="w-full px-5 py-3 bg-surface-subtle rounded-xl outline-none font-bold text-sm" /></div>
                             <div className="space-y-1"><label className="text-[10px] font-black uppercase text-outline">Niên khóa</label><input required value={exemplaryForm.schoolYear || ''} onChange={e => setExemplaryForm({...exemplaryForm, schoolYear: e.target.value})} className="w-full px-5 py-3 bg-surface-subtle rounded-xl outline-none font-bold text-sm" /></div>
                          </div>
                       </div>
                    </div>
                    <div className="space-y-1"><label className="text-[10px] font-black uppercase text-outline">Danh hiệu / Xếp loại</label><input required value={exemplaryForm.rank || ''} onChange={e => setExemplaryForm({...exemplaryForm, rank: e.target.value})} className="w-full px-5 py-3 bg-surface-subtle rounded-xl outline-none font-bold text-sm" /></div>
                    <div className="space-y-1"><label className="text-[10px] font-black uppercase text-outline">Thành tích tiêu biểu</label><textarea required value={exemplaryForm.achievement || ''} onChange={e => setExemplaryForm({...exemplaryForm, achievement: e.target.value})} rows={3} className="w-full px-5 py-3 bg-surface-subtle rounded-xl outline-none font-bold text-sm resize-none" /></div>
                    <button type="submit" className="w-full py-4 bg-amber-500 text-white font-black rounded-2xl shadow-xl shadow-amber-500/10 uppercase tracking-widest text-xs">LƯU THÔNG TIN</button>
                 </form>
              </motion.div>
           </div>
        )}
        {excellentModal.open && (
           <div className="fixed inset-0 z-[160] flex items-center justify-center p-6">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setExcellentModal({ open: false })} className="absolute inset-0 bg-surface-on/40 backdrop-blur-md" />
              <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }} className="relative w-full max-w-lg bg-white rounded-[40px] shadow-2xl p-8 space-y-6">
                 <div className="flex justify-between items-center"><h3 className="text-2xl font-black">{excellentModal.data ? 'Sửa Lớp Xuất Sắc' : 'Thêm Tuần Vinh Danh'}</h3><button onClick={() => setExcellentModal({ open: false })} className="p-2 hover:bg-surface-subtle rounded-xl"><X size={20} /></button></div>
                 <form onSubmit={handleSaveExcellent} className="space-y-4">
                    <div className="space-y-1"><label className="text-[10px] font-black uppercase text-outline">Tuần / Tháng vinh danh</label><input required value={excellentForm.week || ''} onChange={e => setExcellentForm({...excellentForm, week: e.target.value})} className="w-full px-5 py-3 bg-surface-subtle rounded-xl outline-none font-bold text-sm" placeholder="Tuần 1 - Tháng 10" /></div>
                    <div className="grid grid-cols-2 gap-4">
                       <div className="space-y-1"><label className="text-[10px] font-black uppercase text-outline">Lớp Khối 6</label><input required value={excellentForm.grade6 || ''} onChange={e => setExcellentForm({...excellentForm, grade6: e.target.value})} className="w-full px-5 py-3 bg-surface-subtle rounded-xl outline-none font-bold text-sm" placeholder="6A1" /></div>
                       <div className="space-y-1"><label className="text-[10px] font-black uppercase text-outline">Lớp Khối 7</label><input required value={excellentForm.grade7 || ''} onChange={e => setExcellentForm({...excellentForm, grade7: e.target.value})} className="w-full px-5 py-3 bg-surface-subtle rounded-xl outline-none font-bold text-sm" placeholder="7A1" /></div>
                       <div className="space-y-1"><label className="text-[10px] font-black uppercase text-outline">Lớp Khối 8</label><input required value={excellentForm.grade8 || ''} onChange={e => setExcellentForm({...excellentForm, grade8: e.target.value})} className="w-full px-5 py-3 bg-surface-subtle rounded-xl outline-none font-bold text-sm" placeholder="8A1" /></div>
                       <div className="space-y-1"><label className="text-[10px] font-black uppercase text-outline">Lớp Khối 9</label><input required value={excellentForm.grade9 || ''} onChange={e => setExcellentForm({...excellentForm, grade9: e.target.value})} className="w-full px-5 py-3 bg-surface-subtle rounded-xl outline-none font-bold text-sm" placeholder="9A1" /></div>
                    </div>
                    <button type="submit" className="w-full py-4 bg-rose-500 text-white font-black rounded-2xl shadow-xl shadow-rose-500/10 uppercase tracking-widest text-xs">XÁC NHẬN LƯU</button>
                 </form>
              </motion.div>
           </div>
        )}
        {collectiveModal.open && (
           <div className="fixed inset-0 z-[160] flex items-center justify-center p-6">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setCollectiveModal({ open: false })} className="absolute inset-0 bg-surface-on/40 backdrop-blur-md" />
              <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }} className="relative w-full max-w-2xl bg-white rounded-[40px] shadow-2xl p-8 space-y-6 max-h-[90vh] overflow-y-auto">
                 <div className="flex justify-between items-center"><h3 className="text-2xl font-black">{collectiveModal.data ? 'Sửa Thành Tích Tập Thể' : 'Thêm Thành Tích Tập Thể'}</h3><button onClick={() => setCollectiveModal({ open: false })} className="p-2 hover:bg-surface-subtle rounded-xl"><X size={20} /></button></div>
                 <form onSubmit={handleSaveCollective} className="space-y-5">
                    <div className="grid grid-cols-2 gap-4">
                       <div className="space-y-1"><label className="text-[10px] font-black uppercase text-outline">Tiêu đề thành tích</label><input required value={collectiveForm.title || ''} onChange={e => setCollectiveForm({...collectiveForm, title: e.target.value})} className="w-full px-5 py-3 bg-surface-subtle rounded-xl outline-none font-bold text-sm" /></div>
                       <div className="space-y-1"><label className="text-[10px] font-black uppercase text-outline">Thời gian / Niên khóa</label><input required value={collectiveForm.date || ''} onChange={e => setCollectiveForm({...collectiveForm, date: e.target.value})} className="w-full px-5 py-3 bg-surface-subtle rounded-xl outline-none font-bold text-sm" placeholder="Tháng 10/2023" /></div>
                    </div>
                    <div className="space-y-1"><label className="text-[10px] font-black uppercase text-outline">Nội dung chi tiết</label><textarea required value={collectiveForm.content || ''} onChange={e => setCollectiveForm({...collectiveForm, content: e.target.value})} rows={4} className="w-full px-5 py-3 bg-surface-subtle rounded-xl outline-none font-bold text-sm resize-none" /></div>
                    
                    <div className="space-y-2">
                       <label className="text-[10px] font-black uppercase text-outline px-2">Ảnh chứng nhận / Bằng khen</label>
                       <div 
                         onClick={() => {
                            const input = document.createElement('input');
                            input.type = 'file';
                            input.accept = 'image/*';
                            input.onchange = async (e) => {
                               const file = (e.target as HTMLInputElement).files?.[0];
                               if (!file) return;
                               const reader = new FileReader();
                               reader.onload = async (event) => {
                                  const base64 = event.target?.result as string;
                                  const compressed = await compressImage(base64, 0.6, 1200);
                                  setCollectiveForm({ ...collectiveForm, certificateImage: compressed });
                               };
                               reader.readAsDataURL(file);
                            };
                            input.click();
                         }}
                         className="w-full h-40 rounded-2xl bg-surface-subtle border-2 border-dashed border-outline-variant flex flex-col items-center justify-center cursor-pointer hover:bg-surface-container overflow-hidden"
                       >
                          {collectiveForm.certificateImage ? <img src={collectiveForm.certificateImage} className="w-full h-full object-cover" alt="" /> : <div className="text-center text-outline"><Upload size={32} className="mx-auto mb-2" /><span className="text-[10px] font-black uppercase">Tải ảnh lên</span></div>}
                       </div>
                    </div>

                    <div className="space-y-3">
                       <div className="flex justify-between items-center"><label className="text-[10px] font-black uppercase text-outline px-2">Bộ sưu tập ảnh ({collectiveForm.gallery?.length || 0})</label><button type="button" onClick={() => {
                          const input = document.createElement('input');
                          input.type = 'file';
                          input.accept = 'image/*';
                          input.onchange = async (e) => {
                              const file = (e.target as HTMLInputElement).files?.[0];
                              if (!file) return;
                              const reader = new FileReader();
                              reader.onload = async (event) => {
                                 const base64 = event.target?.result as string;
                                 const compressed = await compressImage(base64, 0.6, 800);
                                 setCollectiveForm({ ...collectiveForm, gallery: [...(collectiveForm.gallery || []), compressed] });
                              };
                              reader.readAsDataURL(file);
                          };
                          input.click();
                       }} className="text-[10px] font-black text-primary hover:underline uppercase">Thêm ảnh +</button></div>
                       <div className="grid grid-cols-4 gap-3">
                          {collectiveForm.gallery?.map((img, idx) => (
                            <div key={idx} className="relative aspect-square rounded-lg overflow-hidden group">
                               <img src={img} className="w-full h-full object-cover" alt="" />
                               <button type="button" onClick={() => setCollectiveForm({...collectiveForm, gallery: collectiveForm.gallery.filter((_, i) => i !== idx)})} className="absolute top-1 right-1 p-1 bg-error text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"><X size={10} /></button>
                            </div>
                          ))}
                       </div>
                    </div>

                    <button type="submit" className="w-full py-4 bg-secondary text-white font-black rounded-2xl shadow-xl shadow-secondary/10 uppercase tracking-widest text-xs">LƯU THÀNH TÍCH</button>
                 </form>
              </motion.div>
           </div>
        )}
        {messageModal.open && (
           <div className="fixed inset-0 z-[150] flex items-center justify-center p-6">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setMessageModal({ open: false })} className="absolute inset-0 bg-surface-on/40 backdrop-blur-md" />
              <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }} className="relative w-full max-w-xl bg-white rounded-[40px] shadow-2xl p-8 space-y-6">
                <div className="flex justify-between items-center"><h3 className="text-2xl font-black">Chi tiết Tin nhắn</h3><button onClick={() => setMessageModal({ open: false })} className="p-2 hover:bg-surface-subtle rounded-xl"><X size={20} /></button></div>
                {messageModal.data && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 bg-surface-subtle rounded-2xl">
                        <p className="text-[10px] font-black uppercase text-outline">Người gửi</p>
                        <p className="font-bold text-on-surface">{messageModal.data.name}</p>
                      </div>
                      <div className="p-4 bg-surface-subtle rounded-2xl">
                        <p className="text-[10px] font-black uppercase text-outline">Liên hệ</p>
                        <p className="font-bold text-on-surface">{messageModal.data.contact}</p>
                      </div>
                    </div>
                    <div className="p-4 bg-surface-subtle rounded-2xl">
                        <p className="text-[10px] font-black uppercase text-outline">Chủ đề</p>
                        <p className="font-bold text-on-surface">{messageModal.data.subject}</p>
                    </div>
                    <div className="p-6 bg-surface-subtle rounded-3xl min-h-[150px]">
                        <p className="text-[10px] font-black uppercase text-outline mb-2">Nội dung</p>
                        <p className="text-on-surface font-medium leading-relaxed whitespace-pre-wrap">{messageModal.data.message}</p>
                    </div>
                    <div className="flex justify-between items-center text-[10px] font-bold text-on-surface-variant italic">
                       <span>Gửi lúc: {messageModal.data.createdAt?.toDate?.()?.toLocaleString('vi-VN') || 'N/A'}</span>
                    </div>
                    <button onClick={() => setMessageModal({ open: false })} className="w-full py-4 bg-primary text-white font-black rounded-3xl uppercase tracking-widest text-sm shadow-xl shadow-primary/20">ĐÓNG TAB</button>
                  </div>
                )}
              </motion.div>
           </div>
        )}
        {deleteConfirm && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => !isDeleting && setDeleteConfirm(null)} className="absolute inset-0 bg-surface-on/40 backdrop-blur-md" />
            <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }} className="relative w-full max-w-md bg-white rounded-[40px] shadow-2xl p-10 text-center space-y-8">
              <div className="w-20 h-20 bg-error/10 rounded-full flex items-center justify-center mx-auto text-error"><Trash2 size={40} /></div>
              <div className="space-y-3">
                <h3 className="text-2xl font-black text-on-surface">Xác nhận xóa?</h3>
                <p className="text-on-surface-variant font-medium leading-relaxed italic">"{deleteConfirm.title}"</p>
                <p className="text-sm text-error/80 font-bold uppercase tracking-widest">Hành động này không thể hoàn tác</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <button onClick={() => setDeleteConfirm(null)} disabled={isDeleting} className="px-8 py-4 bg-surface-container text-on-surface font-black rounded-2xl">HUỶ</button>
                <button onClick={() => handleDeleteItem(deleteConfirm.id)} disabled={isDeleting} className="px-8 py-4 bg-error text-white font-black rounded-2xl shadow-xl">{isDeleting ? 'ĐANG XÓA...' : 'XÓA'}</button>
              </div>
            </motion.div>
          </div>
        )}
        {scheduleModal.open && (
          <div className="fixed inset-0 z-[160] flex items-center justify-center p-6">
             <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setScheduleModal({ open: false })} className="absolute inset-0 bg-surface-on/40 backdrop-blur-md" />
             <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }} className="relative w-full max-w-xl bg-white rounded-[40px] shadow-2xl p-8 space-y-6">
                <h3 className="text-2xl font-black">{scheduleModal.data ? 'Sửa Lịch Trình' : 'Thêm Lịch Mới'}</h3>
                <div className="space-y-4">
                  <input value={scheduleForm.title || ''} onChange={e => setScheduleForm({...scheduleForm, title: e.target.value})} placeholder="Têu đề" className="w-full px-6 py-3 bg-surface-subtle rounded-2xl" />
                  <div className="grid grid-cols-2 gap-4">
                    <input type="date" value={scheduleForm.date || ''} onChange={e => setScheduleForm({...scheduleForm, date: e.target.value})} className="w-full px-6 py-3 bg-surface-subtle rounded-2xl" />
                    <input type="time" value={scheduleForm.time || ''} onChange={e => setScheduleForm({...scheduleForm, time: e.target.value})} className="w-full px-6 py-3 bg-surface-subtle rounded-2xl" />
                  </div>
                  <input value={scheduleForm.location || ''} onChange={e => setScheduleForm({...scheduleForm, location: e.target.value})} placeholder="Địa điểm" className="w-full px-6 py-3 bg-surface-subtle rounded-2xl" />
                  <textarea value={scheduleForm.description || ''} onChange={e => setScheduleForm({...scheduleForm, description: e.target.value})} placeholder="Ghi chú" rows={3} className="w-full px-6 py-3 bg-surface-subtle rounded-2xl" />
                  <button onClick={async () => {
                     try {
                       const data = { ...scheduleForm, updatedAt: serverTimestamp() };
                       if (scheduleModal.data) await updateDoc(doc(db, 'schedules', scheduleModal.data.id), data);
                       else await addDoc(collection(db, 'schedules'), { ...data, createdAt: serverTimestamp() });
                       setScheduleModal({ open: false });
                     } catch(e) { console.error(e); }
                  }} className="w-full py-4 bg-primary text-white font-black rounded-3xl">LƯU THAY ĐỔI</button>
                </div>
             </motion.div>
          </div>
        )}
        {activityModal.open && (
           <div className="fixed inset-0 z-[160] flex items-center justify-center p-6">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setActivityModal({ open: false })} className="absolute inset-0 bg-surface-on/40 backdrop-blur-md" />
              <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }} className="relative w-full max-w-2xl bg-white rounded-[40px] shadow-2xl p-8 space-y-6 flex flex-col max-h-[90vh]">
                 <h3 className="text-2xl font-black">{activityModal.data ? 'Sửa Hoạt Động' : 'Thêm Hoạt Động'}</h3>
                 <div className="flex-1 overflow-y-auto space-y-4">
                    <input value={activityForm.title || ''} onChange={e => setActivityForm({...activityForm, title: e.target.value})} placeholder="Tên hoạt động" className="w-full px-6 py-3 bg-surface-subtle rounded-2xl font-bold" />
                  <div className="grid grid-cols-2 gap-4">
                     <div className="space-y-4">
                        <div className="space-y-1">
                           <label className="text-[10px] font-black uppercase text-outline px-2">Ngày bắt đầu</label>
                           <input type="date" value={activityForm.startDate || ''} onChange={e => setActivityForm({...activityForm, startDate: e.target.value})} className="w-full px-6 py-3 bg-surface-subtle rounded-2xl" />
                        </div>
                        <div className="space-y-1">
                           <label className="text-[10px] font-black uppercase text-outline px-2">Giờ bắt đầu</label>
                           <input type="time" value={activityForm.startTime || ''} onChange={e => setActivityForm({...activityForm, startTime: e.target.value})} className="w-full px-6 py-3 bg-surface-subtle rounded-2xl" />
                        </div>
                     </div>
                     <div className="space-y-4">
                        <div className="space-y-1">
                           <label className="text-[10px] font-black uppercase text-outline px-2">Ngày kết thúc</label>
                           <input type="date" value={activityForm.endDate || ''} onChange={e => setActivityForm({...activityForm, endDate: e.target.value})} className="w-full px-6 py-3 bg-surface-subtle rounded-2xl" />
                        </div>
                        <div className="space-y-1">
                           <label className="text-[10px] font-black uppercase text-outline px-2">Giờ kết thúc</label>
                           <input type="time" value={activityForm.endTime || ''} onChange={e => setActivityForm({...activityForm, endTime: e.target.value})} className="w-full px-6 py-3 bg-surface-subtle rounded-2xl" />
                        </div>
                     </div>
                  </div>
                    <input value={activityForm.location || ''} onChange={e => setActivityForm({...activityForm, location: e.target.value})} placeholder="Địa điểm" className="w-full px-6 py-3 bg-surface-subtle rounded-2xl" />
                    <input type="number" value={activityForm.maxParticipants ?? 50} onChange={e => setActivityForm({...activityForm, maxParticipants: parseInt(e.target.value)})} placeholder="Số lượng tối đa" className="w-full px-6 py-3 bg-surface-subtle rounded-2xl" />
                    <div className="space-y-1">
                      <label className="text-xs font-black uppercase text-outline">Ảnh bìa hoạt động</label>
                      <div 
                        onClick={() => fileInputRef.current?.click()}
                        className={cn(
                          "w-full h-48 bg-surface-subtle rounded-3xl border-2 border-dashed border-outline-variant/50 flex flex-col items-center justify-center cursor-pointer hover:bg-surface-container transition-all overflow-hidden relative group",
                          isUploading && "animate-pulse cursor-wait"
                        )}
                      >
                        {activityForm.posterUrl ? (
                          <>
                            <img src={activityForm.posterUrl} className="w-full h-full object-cover group-hover:opacity-50 transition-opacity" alt="Preview" />
                            <div className="absolute inset-0 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-surface-on/20 text-white">
                              <Upload size={32} className="mb-2" />
                              <span className="text-xs font-black tracking-widest uppercase">Thay đổi ảnh</span>
                            </div>
                          </>
                        ) : (
                          <div className="flex flex-col items-center justify-center text-on-surface-variant">
                            <Upload size={40} className="mb-4 text-emerald-600" />
                            <span className="text-sm font-black uppercase tracking-widest">Tải ảnh từ thiết bị</span>
                            <p className="text-[10px] mt-2 font-medium">Định dạng JPG, PNG (Tối đa 5MB)</p>
                          </div>
                        )}
                        
                        {isUploading && (
                          <div className="absolute inset-0 bg-white/60 flex items-center justify-center">
                            <div className="flex flex-col items-center gap-2">
                              <div className="w-8 h-8 border-4 border-emerald-600/20 border-t-emerald-600 rounded-full animate-spin" />
                              <span className="text-[10px] font-black text-emerald-600">ĐANG XỬ LÝ...</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                    <textarea value={activityForm.description || ''} onChange={e => setActivityForm({...activityForm, description: e.target.value})} placeholder="Mô tả chi tiết" rows={5} className="w-full px-6 py-3 bg-surface-subtle rounded-2xl" />
                 </div>
                 <button onClick={handleSaveActivity} className="w-full py-5 bg-emerald-600 text-white font-black rounded-3xl shrink-0 uppercase tracking-widest shadow-xl shadow-emerald-500/10">LƯU HOẠT ĐỘNG</button>
              </motion.div>
           </div>
        )}
        {userModal.open && (
           <div className="fixed inset-0 z-[150] flex items-center justify-center p-6">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setUserModal({ open: false })} className="absolute inset-0 bg-surface-on/40 backdrop-blur-md" />
              <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }} className="relative w-full max-w-xl bg-white rounded-[40px] shadow-2xl p-8 space-y-6 max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center"><h3 className="text-2xl font-black">{userModal.data ? 'Sửa Người Dùng' : 'Thêm Người Dùng'}</h3><button onClick={() => setUserModal({ open: false })} className="p-2 hover:bg-surface-subtle rounded-xl"><X size={20} /></button></div>
                <form onSubmit={handleSaveUser} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-1">
                      <label className="text-xs font-black uppercase text-outline">Tên Đăng Nhập / Email</label>
                      <input required value={userForm.email || ''} onChange={e => setUserForm({...userForm, email: e.target.value})} className="w-full px-6 py-3 bg-surface-subtle rounded-2xl outline-none font-bold text-on-surface" placeholder="example hoặc example@gmail.com" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-black uppercase text-outline">Mật Khẩu (Để trống nếu dùng Google SSO)</label>
                      <input value={userForm.password || ''} onChange={e => setUserForm({...userForm, password: e.target.value})} className="w-full px-6 py-3 bg-surface-subtle rounded-2xl outline-none font-bold text-on-surface" placeholder="Nhập mật khẩu..." />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center gap-3 bg-indigo-50 p-4 rounded-2xl">
                       <input type="checkbox" id="isAdmin" checked={userForm.isAdmin} onChange={e => setUserForm({...userForm, isAdmin: e.target.checked})} className="w-5 h-5 accent-indigo-600" />
                       <label htmlFor="isAdmin" className="text-xs font-black text-indigo-900">Có quyền truy cập Admin Panel</label>
                    </div>
                    <div className="flex items-center gap-3 bg-amber-50 p-4 rounded-2xl">
                       <input type="checkbox" id="isSuperAdmin" checked={userForm.isSuperAdmin} onChange={e => setUserForm({...userForm, isSuperAdmin: e.target.checked})} className="w-5 h-5 accent-amber-600" />
                       <label htmlFor="isSuperAdmin" className="text-xs font-black text-amber-900">Là Super Admin (Không giới hạn quyền)</label>
                    </div>
                  </div>
                  {userForm.isAdmin && (
                    <div className="space-y-6">
                      <div className="flex items-center justify-between border-b border-outline-variant/30 pb-2">
                        <p className="text-sm font-black text-on-surface uppercase tracking-widest">Phân quyền chi tiết</p>
                        <button 
                          type="button"
                          onClick={() => {
                            const allTrue = Object.values(userForm.permissions).every(v => v);
                            const nextValue = !allTrue;
                            const nextPerms = { ...userForm.permissions };
                            Object.keys(nextPerms).forEach(k => (nextPerms as any)[k] = nextValue);
                            setUserForm({ ...userForm, permissions: nextPerms });
                          }}
                          className="text-[10px] font-black text-primary hover:underline uppercase tracking-widest"
                        >
                          {Object.values(userForm.permissions).every(v => v) ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
                        </button>
                      </div>

                      <div className="space-y-8">
                        {permissionGroups.map((group) => (
                          <div key={group.title} className="space-y-4">
                            <div className="flex items-center gap-2 text-xs font-black text-outline uppercase tracking-wider">
                              <group.icon size={14} className="text-primary" />
                              {group.title}
                            </div>
                            <div className="grid grid-cols-1 gap-3">
                               {group.permissions.map((perm) => (
                                 <label 
                                   key={perm.key} 
                                   className={cn(
                                     "flex items-start gap-4 p-4 rounded-2xl cursor-pointer border-2 transition-all group",
                                     (userForm.permissions as any)[perm.key] 
                                       ? "bg-primary/5 border-primary/20 ring-1 ring-primary/10" 
                                       : "bg-surface-subtle border-transparent hover:border-outline-variant/30"
                                   )}
                                 >
                                    <div className="pt-0.5">
                                      <input 
                                        type="checkbox" 
                                        checked={(userForm.permissions as any)[perm.key]} 
                                        onChange={e => setUserForm({ ...userForm, permissions: { ...userForm.permissions, [perm.key]: e.target.checked } })} 
                                        className="w-5 h-5 accent-primary rounded-lg" 
                                      />
                                    </div>
                                    <div className="space-y-0.5">
                                       <span className="text-sm font-black text-on-surface block group-hover:text-primary transition-colors">
                                          {perm.label}
                                       </span>
                                       <p className="text-[10px] font-medium text-on-surface-variant leading-relaxed">
                                          {perm.description}
                                       </p>
                                    </div>
                                 </label>
                               ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  <button type="submit" className="w-full py-5 bg-indigo-600 text-white rounded-3xl font-black shadow-xl shadow-indigo-500/10 uppercase tracking-widest">LƯU CÀI ĐẶT</button>
                </form>
              </motion.div>
           </div>
        )}
        {clubModal.open && (
           <div className="fixed inset-0 z-[150] flex items-center justify-center p-6">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setClubModal({ open: false })} className="absolute inset-0 bg-surface-on/40 backdrop-blur-md" />
              <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }} className="relative w-full max-w-2xl bg-white rounded-[40px] shadow-2xl p-8 space-y-6 max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center"><h3 className="text-2xl font-black">{clubModal.data ? 'Cập Nhật CLB' : 'Tạo CLB Mới'}</h3><button onClick={() => setClubModal({ open: false })} className="p-2 hover:bg-surface-subtle rounded-xl"><X size={20} /></button></div>
                <form onSubmit={handleSaveClub} className="space-y-6">
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-1"><label className="text-xs font-black uppercase text-outline">Tên câu lạc bộ</label><input required value={clubForm.name || ''} onChange={e => setClubForm({...clubForm, name: e.target.value})} className="w-full px-6 py-3 bg-surface-subtle rounded-2xl outline-none font-bold" /></div>
                    <div className="space-y-1"><label className="text-xs font-black uppercase text-outline">Trưởng CLB</label><input required value={clubForm.leaderName || ''} onChange={e => setClubForm({...clubForm, leaderName: e.target.value})} className="w-full px-6 py-3 bg-surface-subtle rounded-2xl outline-none font-bold" /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-6">
                     <div className="space-y-1"><label className="text-xs font-black uppercase text-outline">Lịch trình</label><input value={clubForm.schedule || ''} onChange={e => setClubForm({...clubForm, schedule: e.target.value})} className="w-full px-6 py-3 bg-surface-subtle rounded-2xl outline-none font-bold" /></div>
                     <div className="space-y-1"><label className="text-xs font-black uppercase text-outline">Ngày thành lập</label><input type="date" value={clubForm.foundedDate || ''} onChange={e => setClubForm({...clubForm, foundedDate: e.target.value})} className="w-full px-6 py-3 bg-surface-subtle rounded-2xl outline-none font-bold" /></div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-black uppercase text-outline">Ảnh bìa câu lạc bộ</label>
                    <div 
                      onClick={() => fileInputRef.current?.click()}
                      className={cn(
                        "w-full h-48 bg-surface-subtle rounded-3xl border-2 border-dashed border-outline-variant/50 flex flex-col items-center justify-center cursor-pointer hover:bg-surface-container transition-all overflow-hidden relative group",
                        isUploading && "animate-pulse cursor-wait"
                      )}
                    >
                      {clubForm.posterUrl ? (
                        <>
                          <img src={clubForm.posterUrl} className="w-full h-full object-cover group-hover:opacity-50 transition-opacity" alt="Preview" />
                          <div className="absolute inset-0 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-surface-on/20 text-white">
                            <Upload size={32} className="mb-2" />
                            <span className="text-xs font-black tracking-widest uppercase">Thay đổi ảnh</span>
                          </div>
                        </>
                      ) : (
                        <div className="flex flex-col items-center justify-center text-on-surface-variant">
                          <Upload size={40} className="mb-4 text-primary" />
                          <span className="text-sm font-black uppercase tracking-widest">Tải ảnh từ thiết bị</span>
                          <p className="text-[10px] mt-2 font-medium">Định dạng JPG, PNG (Tối đa 5MB)</p>
                        </div>
                      )}
                      
                      {isUploading && (
                        <div className="absolute inset-0 bg-white/60 flex items-center justify-center">
                          <div className="flex flex-col items-center gap-2">
                            <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                            <span className="text-[10px] font-black text-primary">ĐANG XỬ LÝ...</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="space-y-1"><label className="text-xs font-black uppercase text-outline">Mô tả</label><textarea value={clubForm.description || ''} onChange={e => setClubForm({...clubForm, description: e.target.value})} rows={4} className="w-full px-6 py-3 bg-surface-subtle rounded-2xl outline-none font-bold resize-none" /></div>
                  <button type="submit" className="w-full py-5 bg-indigo-600 text-white rounded-3xl font-black shadow-xl shadow-indigo-500/10 uppercase tracking-widest">{clubModal.data ? 'CẬP NHẬT' : 'TẠO MỚI'}</button>
                </form>
              </motion.div>
           </div>
        )}
        {scoutModal.open && (
           <div className="fixed inset-0 z-[150] flex items-center justify-center p-6">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setScoutModal({ open: false })} className="absolute inset-0 bg-surface-on/40 backdrop-blur-md" />
              <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }} className="relative w-full max-w-md bg-white rounded-[40px] shadow-2xl p-8 space-y-6">
                <div className="flex justify-between items-center"><h3 className="text-2xl font-black tracking-tight">{scoutModal.data ? 'Sửa Thống Kê Khu Phố' : 'Thêm Khu Phố Mới'}</h3><button onClick={() => setScoutModal({ open: false })} className="p-2 hover:bg-surface-subtle rounded-xl cursor-pointer"><X size={20} /></button></div>
                <form onSubmit={handleSaveScout} className="space-y-6">
                   <div className="space-y-1">
                      <label className="text-xs font-black uppercase text-outline">Tên Khu Phố</label>
                      <input required value={scoutForm.className || ''} onChange={e => setScoutForm({...scoutForm, className: e.target.value})} className="w-full px-6 py-3 bg-surface-subtle rounded-2xl outline-none font-bold text-on-surface" placeholder="VD: Khu phố 1" />
                   </div>
                   <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-xs font-black uppercase text-outline">Số lượng Nam</label>
                        <input type="number" required value={scoutForm.maleCount ?? 0} onChange={e => setScoutForm({...scoutForm, maleCount: parseInt(e.target.value) || 0})} className="w-full px-6 py-3 bg-surface-subtle rounded-2xl outline-none font-bold" min="0" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-black uppercase text-outline">Số lượng Nữ</label>
                        <input type="number" required value={scoutForm.femaleCount ?? 0} onChange={e => setScoutForm({...scoutForm, femaleCount: parseInt(e.target.value) || 0})} className="w-full px-6 py-3 bg-surface-subtle rounded-2xl outline-none font-bold" min="0" />
                      </div>
                   </div>
                   
                   <div className="p-6 bg-primary/5 rounded-[32px] border border-primary/10 flex justify-between items-center">
                     <span className="text-xs font-black uppercase text-primary tracking-widest">Tổng cộng</span>
                     <span className="text-2xl font-black text-primary">{Number(scoutForm.maleCount) + Number(scoutForm.femaleCount)}</span>
                   </div>

                   <button type="submit" className="w-full py-5 bg-indigo-600 text-white rounded-3xl font-black shadow-xl shadow-indigo-500/20 uppercase tracking-widest text-sm">LƯU THỐNG KÊ</button>
                </form>
              </motion.div>
           </div>
        )}
        {manageMembersModal.open && (
          <div className="fixed inset-0 z-[160] flex items-center justify-center p-6">
             <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setManageMembersModal({ open: false })} className="absolute inset-0 bg-surface-on/40 backdrop-blur-md" />
             <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }} className="relative w-full max-w-4xl bg-white rounded-[40px] shadow-2xl p-8 space-y-6 max-h-[90vh] flex flex-col">
                <div className="flex justify-between items-center"><div><h3 className="text-2xl font-black">Quản lý thành viên: {manageMembersModal.club?.name}</h3><p className="text-sm font-medium text-on-surface-variant">Danh sách thành viên hiện tại và phê duyệt</p></div><button onClick={() => setManageMembersModal({ open: false })} className="p-2 hover:bg-surface-subtle rounded-xl"><X size={20} /></button></div>
                <div className="flex-1 overflow-y-auto">
                   <table className="w-full text-left border-collapse">
                      <thead className="sticky top-0 bg-white">
                        <tr className="bg-surface-subtle/50 text-[10px] font-black uppercase tracking-widest border-b border-outline-variant/30"><th className="px-4 py-3">Thành viên</th><th className="px-4 py-3">Trạng thái</th><th className="px-4 py-3 text-right">Thao tác</th></tr>
                      </thead>
                      <tbody>
                        {clubMembers.map(m => (
                          <tr key={m.id} className="border-b border-outline-variant/10">
                            <td className="px-4 py-4">
                              <div>
                                <p className="font-bold">{m.userName}</p>
                                <p className="text-[10px] text-on-surface-variant">Khu phố {m.userClass} • {m.userEmail}</p>
                              </div>
                            </td>
                            <td className="px-4 py-4">
                              <span className={cn(
                                "px-3 py-1 rounded-full text-[10px] font-black uppercase", 
                                m.status === 'approved' ? "bg-emerald-100 text-emerald-600" : 
                                "bg-amber-100 text-amber-600"
                              )}>
                                {m.status === 'approved' ? 'Thành viên' : 'Chờ duyệt'}
                              </span>
                            </td>
                            <td className="px-4 py-4 text-right flex justify-end gap-2">
                               {m.status !== 'approved' && (
                                 <button 
                                   disabled={isUpdatingStatus === m.id}
                                   onClick={() => handleUpdateMemberStatus(m.id, manageMembersModal.club.id, 'approved')} 
                                   className="p-2 bg-emerald-500 text-white rounded-lg hover:scale-110 active:scale-95 transition-all disabled:opacity-50"
                                   title="Duyệt"
                                 >
                                   {isUpdatingStatus === m.id ? <Clock size={14} className="animate-spin" /> : <Check size={14} />}
                                 </button>
                               )}
                               {m.status === 'approved' && (
                                  <button 
                                    disabled={isUpdatingStatus === m.id}
                                    onClick={() => handleUpdateMemberStatus(m.id, manageMembersModal.club.id, 'pending')}
                                    className="p-2 bg-surface-subtle text-on-surface-variant rounded-lg hover:bg-surface-container transition-all"
                                    title="Chuyển về trạng thái chờ"
                                  >
                                    <Clock size={14} />
                                  </button>
                               )}
                               <button onClick={() => setDeleteConfirm({ id: m.id, title: `Thành viên ${m.userName}`, type: 'club_membership', metadata: { memberId: m.id, clubId: manageMembersModal.club.id, status: m.status } })} className="p-2 bg-error text-white rounded-lg hover:scale-110 active:scale-95 transition-all"><Trash2 size={14} /></button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                   </table>
                </div>
             </motion.div>
          </div>
        )}
      </AnimatePresence>
      <input 
        type="file" 
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*"
        className="hidden"
      />
    </div>
  );
}
