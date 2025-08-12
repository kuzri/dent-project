// src/pages/MainPage.jsx
import React, { useState } from 'react';
import { Calendar, FileText } from 'lucide-react';
import LectureCalendar from '../components/calendar/LectureCalendar';
import Materials from '../components/materials/Materials';
import styles from './MainPage.module.css';

const MainPage = () => {
  const [activeTab, setActiveTab] = useState('calendar');

  return (
    <div className={styles.container}>
      {/* 최상단 네비게이션 */}
      <nav className={styles.nav}>
        <div className={styles.navContainer}>
          <div className={styles.navTabs}>
            <button
              onClick={() => setActiveTab('calendar')}
              className={`${styles.navTab} ${
                activeTab === 'calendar' ? styles.navTabActive : styles.navTabInactive
              }`}
            >
              <Calendar className={styles.navIcon} />
              강의 캘린더
            </button>
            <button
              onClick={() => setActiveTab('materials')}
              className={`${styles.navTab} ${
                activeTab === 'materials' ? styles.navTabActive : styles.navTabInactive
              }`}
            >
              <FileText className={styles.navIcon} />
              자료실
            </button>
          </div>
        </div>
      </nav>

      {/* 헤더 */}
      <header className={styles.header}>
        <div className={styles.headerContainer}>
          <h1 className={styles.headerTitle}>
            {activeTab === 'calendar' ? '강의 관리 시스템' : '자료실'}
          </h1>
        </div>
      </header>

      {/* 메인 콘텐츠 */}
      <main className={styles.mainContent}>
        <div className={styles.contentContainer}>
          {activeTab === 'calendar' && <LectureCalendar />}
          {activeTab === 'materials' && <Materials />}
        </div>
      </main>
    </div>
  );
};

export default MainPage;