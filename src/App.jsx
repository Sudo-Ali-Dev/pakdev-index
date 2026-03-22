import React, { useState, useCallback } from 'react';
import Header from './components/Header';
import Footer from './components/Footer';
import Leaderboard from './pages/Leaderboard';
import Register from './pages/Register';
import WeeklyDigest from './pages/WeeklyDigest';
import Archives from './pages/Archives';
import ReportDetail from './pages/ReportDetail';

function App() {
  const [activeTab, setActiveTab] = useState('leaderboard');
  const [selectedVolume, setSelectedVolume] = useState(null);

  const handleChangeTab = useCallback((tab, volumeNumber) => {
    setActiveTab(tab);
    if (tab === 'report_detail' && volumeNumber != null) {
      setSelectedVolume(volumeNumber);
    }
  }, []);

  return (
    <>
      <Header activeTab={activeTab} onChangeTab={handleChangeTab} />
      {activeTab === 'leaderboard' && <Leaderboard />}
      {activeTab === 'register' && <Register />}
      {activeTab === 'weekly_digest' && <WeeklyDigest onChangeTab={handleChangeTab} />}
      {activeTab === 'archives' && <Archives onChangeTab={handleChangeTab} />}
      {activeTab === 'report_detail' && <ReportDetail volumeNumber={selectedVolume} onChangeTab={handleChangeTab} />}
      <Footer />
    </>
  );
}

export default App;
