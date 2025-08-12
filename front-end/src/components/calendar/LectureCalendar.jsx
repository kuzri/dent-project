// src/components/calendar/LectureCalendar.jsx
import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, Clock, User } from 'lucide-react';
import LectureModal from './LectureModal';
import { lecturesAPI } from '../../api/axios';
import styles from './LectureCalendar.module.css';

const LectureCalendar = () => {
  const [viewMode, setViewMode] = useState('monthly');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedLecture, setSelectedLecture] = useState(null);
  const [showModal, setShowModal] = useState(false);

  // React Query를 사용하여 강의 데이터 조회 (월별)
  const {
    data: lectures = [],
    isLoading: lecturesLoading,
    isError: lecturesError,
    error: lecturesErrorMsg,
    refetch: refetchLectures
  } = useQuery({
    queryKey: ['lectures', currentDate.getFullYear(), currentDate.getMonth() + 1],
    queryFn: async () => {
      console.log('API 호출 - 년:', currentDate.getFullYear(), '월:', currentDate.getMonth() + 1);
      const response = await lecturesAPI.getLecturesByMonth(
        currentDate.getFullYear(),
        currentDate.getMonth() + 1
      );
      console.log('API 응답 전체:', response);
      console.log('API 응답 데이터:', response.data);
      console.log('실제 강의 배열:', response.data?.data);
      console.log('데이터 타입:', typeof response.data?.data, Array.isArray(response.data?.data));
      // 중첩된 data 구조 처리
      return response.data?.data || response.data || [];
    },
    staleTime: 5 * 60 * 1000, // 5분
    cacheTime: 10 * 60 * 1000, // 10분
    retry: 3,
    refetchOnWindowFocus: false,
  });

  // 데이터 구조 디버깅
  useEffect(() => {
    if (lectures) {
      console.log('=== 강의 데이터 구조 분석 ===');
      console.log('강의 데이터 타입:', typeof lectures);
      console.log('배열 여부:', Array.isArray(lectures));
      console.log('전체 강의 데이터:', lectures);
      console.log('강의 개수:', lectures.length);
      
      if (lectures.length > 0 && lectures[0]) {
        console.log('첫 번째 강의:', lectures[0]);
        console.log('첫 번째 강의의 키들:', Object.keys(lectures[0]));
        console.log('날짜 필드:', lectures[0].date);
        console.log('날짜 타입:', typeof lectures[0].date);
      }
    } else {
      console.log('강의 데이터가 없거나 빈 배열입니다:', lectures);
    }
  }, [lectures]);

  // 날짜 유틸리티 함수들
  const getMonthName = (date) => {
    return date.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long' });
  };

  const getWeekDates = (date) => {
    const week = [];
    const startOfWeek = new Date(date);
    const day = startOfWeek.getDay();
    startOfWeek.setDate(startOfWeek.getDate() - day);
    
    for (let i = 0; i < 7; i++) {
      const day = new Date(startOfWeek);
      day.setDate(startOfWeek.getDate() + i);
      week.push(day);
    }
    return week;
  };

  const getMonthDates = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());
    
    const dates = [];
    const currentDate = new Date(startDate);
    
    for (let i = 0; i < 42; i++) {
      dates.push(new Date(currentDate));
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return dates;
  };

  const getLecturesForDate = (date) => {
    if (!lectures || !Array.isArray(lectures)) {
      console.warn('강의 데이터가 배열이 아닙니다:', lectures);
      return [];
    }

    const dateStr = date.toISOString().split('T')[0];
    console.log('날짜별 강의 검색:', dateStr);
    console.log('전체 강의 개수:', lectures.length);
    
    const filteredLectures = lectures.filter((lecture, index) => {
      if (!lecture.date) {
        console.warn(`강의[${index}]에 날짜가 없습니다:`, lecture);
        return false;
      }
      
      // 날짜 정규화
      const lectureDate = new Date(lecture.date).toISOString().split('T')[0];
      const matches = lectureDate === dateStr;
      
      if (matches) {
        console.log(`매칭된 강의[${index}]:`, lecture);
      }
      
      return matches;
    });
    
    // 중복 제거 (id 기준)
    const uniqueLectures = filteredLectures.filter((lecture, index, self) => 
      index === self.findIndex(l => l.id === lecture.id)
    );
    
    console.log(`${dateStr}의 강의 ${uniqueLectures.length}개 발견 (중복 제거 후)`);
    if (filteredLectures.length !== uniqueLectures.length) {
      console.warn(`중복된 강의 ${filteredLectures.length - uniqueLectures.length}개 제거됨`);
    }
    
    return uniqueLectures;
  };

  const navigateDate = (direction) => {
    const newDate = new Date(currentDate);
    if (viewMode === 'monthly') {
      newDate.setMonth(newDate.getMonth() + direction);
    } else if (viewMode === 'weekly') {
      newDate.setDate(newDate.getDate() + (direction * 7));
    } else {
      newDate.setDate(newDate.getDate() + direction);
    }
    setCurrentDate(newDate);
  };

  const openLectureModal = (lecture) => {
    setSelectedLecture(lecture);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedLecture(null);
  };

  const handleRefresh = () => {
    refetchLectures();
  };

  // 로딩 상태 처리
  if (lecturesLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.loadingContainer}>
          <div className={styles.loadingSpinner}></div>
          <p>강의 데이터를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  // 에러 상태 처리
  if (lecturesError) {
    return (
      <div className={styles.container}>
        <div className={styles.errorContainer}>
          <h2>데이터를 불러오는 중 오류가 발생했습니다</h2>
          <p>{lecturesErrorMsg?.message || '알 수 없는 오류가 발생했습니다'}</p>
          <button onClick={handleRefresh} className={styles.retryButton}>
            다시 시도
          </button>
        </div>
      </div>
    );
  }

  // 강의 카드 컴포넌트
  const LectureCard = ({ lecture, compact = false }) => (
    <div
      className={`${styles.lectureCard} ${styles[lecture.colorClass]}`}
      onClick={() => openLectureModal(lecture)}
    >
      <div className={styles.lectureCardTitle}>{lecture.title}</div>
      {!compact && (
        <>
          <div className={styles.lectureCardTime}>{lecture.time}</div>
          <div className={styles.lectureCardInstructor}>{lecture.instructor}</div>
        </>
      )}
    </div>
  );

  // 월간 뷰
  const MonthlyView = () => {
    const monthDates = getMonthDates(currentDate);
    const today = new Date().toDateString();
    
    return (
      <div className={styles.monthlyView}>
        <div className={styles.monthlyGrid}>
          {/* 요일 헤더 */}
          {['일', '월', '화', '수', '목', '금', '토'].map(day => (
            <div key={day} className={styles.dayHeader}>
              {day}
            </div>
          ))}
          
          {/* 날짜 셀들 */}
          {monthDates.map((date, index) => {
            const isCurrentMonth = date.getMonth() === currentDate.getMonth();
            const isToday = date.toDateString() === today;
            const dateLectures = getLecturesForDate(date);
            
            return (
              <div
                key={index}
                className={`${styles.dateCell} ${
                  isCurrentMonth ? styles.dateCellCurrentMonth : styles.dateCellOtherMonth
                } ${isToday ? styles.dateCellToday : ''}`}
              >
                <div className={`${styles.dateNumber} ${
                  isCurrentMonth ? styles.dateNumberCurrentMonth : styles.dateNumberOtherMonth
                } ${isToday ? styles.dateNumberToday : ''}`}>
                  {date.getDate()}
                </div>
                
                <div className={styles.lectureList}>
                  {dateLectures.map((lecture, lectureIndex) => (
                    <LectureCard key={`${lecture.id}-${lectureIndex}`} lecture={lecture} compact />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // 주간 뷰
  const WeeklyView = () => {
    const weekDates = getWeekDates(currentDate);
    const today = new Date().toDateString();
    
    return (
      <div className={styles.weeklyView}>
        <div className={styles.weeklyGrid}>
          {weekDates.map((date, index) => {
            const isToday = date.toDateString() === today;
            const dateLectures = getLecturesForDate(date);
            
            return (
              <div key={index} className={`${styles.weeklyDayCard} ${
                isToday ? styles.weeklyDayCardToday : ''
              }`}>
                <div className={styles.weeklyDayHeader}>
                  <div className={styles.weeklyDayName}>
                    {date.toLocaleDateString('ko-KR', { weekday: 'short' })}
                  </div>
                  <div className={`${styles.weeklyDayNumber} ${isToday ? styles.weeklyDayNumberToday : ''}`}>
                    {date.getDate()}
                  </div>
                </div>
                
                <div className={styles.weeklyLectureList}>
                  {dateLectures.map((lecture, lectureIndex) => (
                    <LectureCard key={`${lecture.id}-${lectureIndex}`} lecture={lecture} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // 일간 뷰
  const DailyView = () => {
    const dateLectures = getLecturesForDate(currentDate);
    const today = new Date().toDateString();
    const isToday = currentDate.toDateString() === today;
    
    return (
      <div className={styles.dailyView}>
        <div className={styles.dailyContainer}>
          <div className={styles.dailyHeader}>
            <div className={`${styles.dailyDate} ${isToday ? styles.dailyDateToday : ''}`}>
              {currentDate.toLocaleDateString('ko-KR', { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric',
                weekday: 'long'
              })}
            </div>
          </div>
          
          <div className={styles.dailyLectureList}>
            {dateLectures.length > 0 ? (
              dateLectures.map((lecture, lectureIndex) => (
                <div
                  key={`${lecture.id}-${lectureIndex}`}
                  className={styles.dailyLectureCard}
                  onClick={() => openLectureModal(lecture)}
                >
                  <div className={styles.dailyLectureContent}>
                    <div className={styles.dailyLectureInfo}>
                      <h3 className={styles.dailyLectureTitle}>{lecture.title}</h3>
                      <div className={styles.dailyLectureMeta}>
                        <div className={styles.dailyLectureMetaItem}>
                          <Clock className={styles.metaIcon} />
                          {lecture.time}
                        </div>
                        <div className={styles.dailyLectureMetaItem}>
                          <User className={styles.metaIcon} />
                          {lecture.instructor}
                        </div>
                      </div>
                      <p className={styles.dailyLectureDescription}>{lecture.description}</p>
                    </div>
                    <div className={`${styles.dailyLectureColorBar} ${styles[lecture.colorClass]}`}></div>
                  </div>
                </div>
              ))
            ) : (
              <div className={styles.emptyState}>
                선택한 날짜에 예정된 강의가 없습니다.
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className={styles.container}>
      {/* 캘린더 상단 정보 */}
      <div className={styles.calendarInfo}>
        {lectures && lectures.length > 0 && (
          <div className={styles.lectureCount}>
            총 {lectures.length}개의 강의
          </div>
        )}
        <button 
          onClick={handleRefresh}
          className={styles.refreshButton}
        >
          새로고침
        </button>
      </div>

      {/* 캘린더 컨트롤 */}
      <div className={styles.calendarControls}>
        <div className={styles.dateNavigation}>
          <button
            onClick={() => navigateDate(-1)}
            className={styles.dateNavButton}
          >
            <ChevronLeft className={styles.navIcon} />
          </button>
          
          <h2 className={styles.currentDate}>
            {viewMode === 'monthly' && getMonthName(currentDate)}
            {viewMode === 'weekly' && `${getWeekDates(currentDate)[0].toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })} - ${getWeekDates(currentDate)[6].toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}`}
            {viewMode === 'daily' && currentDate.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })}
          </h2>
          
          <button
            onClick={() => navigateDate(1)}
            className={styles.dateNavButton}
          >
            <ChevronRight className={styles.navIcon} />
          </button>
        </div>
        
        {/* 뷰 모드 버튼들 */}
        <div className={styles.viewModeToggle}>
          {[
            { key: 'monthly', label: '월간' },
            { key: 'weekly', label: '주간' },
            { key: 'daily', label: '일간' }
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => key !== viewMode && setViewMode(key)}
              disabled={key === viewMode}
              className={`${styles.viewModeButton} ${
                viewMode === key ? styles.viewModeButtonActive : styles.viewModeButtonInactive
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* 캘린더 뷰 */}
      <div className={styles.calendarView}>
        {viewMode === 'monthly' && <MonthlyView />}
        {viewMode === 'weekly' && <WeeklyView />}
        {viewMode === 'daily' && <DailyView />}
      </div>

      {/* 강의 상세 모달 */}
      <LectureModal 
        showModal={showModal}
        selectedLecture={selectedLecture}
        onClose={closeModal}
      />
    </div>
  );
};

export default LectureCalendar;