import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, useRef } from 'react';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import Home from './pages/Home';
import News from './pages/News';
import Activities from './pages/Activities';
import Achievements from './pages/Achievements';
import Contact from './pages/Contact';
import Admin from './pages/Admin';
import CreatePost from './pages/CreatePost';
import NewsDetail from './pages/NewsDetail';
import Schedules from './pages/Schedules';
import Clubs from './pages/Clubs';
import { AdminGuard } from './components/AdminGuard';
import { db } from './lib/firebase';
import { doc, updateDoc, increment, setDoc, getDoc } from 'firebase/firestore';

import { AuthProvider } from './contexts/AuthContext';
import { SiteProvider } from './contexts/SiteContext';

export default function App() {
  const visitRecorded = useRef(false);

  useEffect(() => {
    if (visitRecorded.current) return;
    visitRecorded.current = true;

    const recordVisit = async () => {
      const statsRef = doc(db, 'stats', 'global');
      try {
        const docSnap = await getDoc(statsRef);
        if (docSnap.exists()) {
          await updateDoc(statsRef, {
            totalVisits: increment(1)
          });
        } else {
          await setDoc(statsRef, { totalVisits: 1 });
        }
      } catch (error) {
        console.error('Error tracking visit:', error);
      }
    };
    recordVisit();
  }, []);

  return (
    <AuthProvider>
      <SiteProvider>
        <Router>
          <div className="min-h-screen flex flex-col overflow-x-hidden selection:bg-primary selection:text-white">
              <Navbar />
              <main className="flex-grow bg-surface">
                <Routes>
                  <Route path="/" element={<Home />} />
                  <Route path="/tin-tuc" element={<News />} />
                  <Route path="/tin-tuc/:id" element={<NewsDetail />} />
                  <Route path="/hoat-dong" element={<Activities />} />
                  <Route path="/lich-hoat-dong" element={<Schedules />} />
                  <Route path="/cau-lac-bo" element={<Clubs />} />
                  <Route path="/schedules" element={<Navigate to="/lich-hoat-dong" replace />} />
                  <Route path="/thanh-tich" element={<Achievements />} />
                  <Route path="/lien-he" element={<Contact />} />
                  <Route path="/admin/*" element={
                    <AdminGuard>
                      <Routes>
                        <Route path="create-post" element={<CreatePost />} />
                        <Route path="edit-post/:id" element={<CreatePost />} />
                        <Route path="*" element={<Admin />} />
                      </Routes>
                    </AdminGuard>
                  } />
                </Routes>
              </main>
              <Footer />
            </div>
        </Router>
      </SiteProvider>
    </AuthProvider>
  );
}
