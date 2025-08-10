import React, { useState, useEffect } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, Calendar, Upload, Clock, User, FileText } from 'lucide-react';
import LectureModal from './lectureModal';
import { lecturesAPI, materialsAPI } from './axios';
import styles from './calendar.module.css';

const LectureCalendar = () => {
  const [viewMode, setViewMode] = useState('monthly');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedLecture, setSelectedLecture] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [activeTab, setActiveTab] = useState('calendar');
  
  const queryClient = useQueryClient();

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

  // React Query를 사용하여 자료 데이터 조회 (탭 활성화시)
  const {
    data: materials = [],
    isLoading: materialsLoading,
    isError: materialsError,
    error: materialsErrorMsg,
    refetch: refetchMaterials
  } = useQuery({
    queryKey: ['materials'],
    queryFn: async () => {
      const response = await materialsAPI.getAllMaterials();
      console.log('자료 API 응답:', response.data);
      console.log('실제 자료 배열:', response.data?.data);
      // 중첩된 data 구조 처리
      return response.data?.data || response.data || [];
    },
    enabled: activeTab === 'materials', // 자료실 탭이 활성화된 경우에만 요청
    staleTime: 5 * 60 * 1000,
    cacheTime: 10 * 60 * 1000,
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

  // 파일 업로드 mutation
  const uploadFileMutation = useMutation({
    mutationFn: (formData) => materialsAPI.uploadFile(formData),
    onSuccess: () => {
      // 업로드 성공시 자료 목록 새로고침
      refetchMaterials();
      alert('파일이 성공적으로 업로드되었습니다.');
    },
    onError: (error) => {
      alert(`파일 업로드 실패: ${error.message}`);
    },
  });

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
    if (activeTab === 'calendar') {
      refetchLectures();
    } else {
      refetchMaterials();
    }
  };

  // 파일 업로드 핸들러
  const handleFileUpload = (event) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      const formData = new FormData();
      Array.from(files).forEach((file) => {
        formData.append('files', file);
      });
      uploadFileMutation.mutate(formData);
    }
  };

  // 로딩 상태 처리
  const isLoading = activeTab === 'calendar' ? lecturesLoading : materialsLoading;
  const isError = activeTab === 'calendar' ? lecturesError : materialsError;
  const error = activeTab === 'calendar' ? lecturesErrorMsg : materialsErrorMsg;

  if (isLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.loadingContainer}>
          <div className={styles.loadingSpinner}></div>
          <p>{activeTab === 'calendar' ? '강의 데이터를 불러오는 중...' : '자료를 불러오는 중...'}</p>
        </div>
      </div>
    );
  }

  // 에러 상태 처리
  if (isError) {
    return (
      <div className={styles.container}>
        <div className={styles.errorContainer}>
          <h2>데이터를 불러오는 중 오류가 발생했습니다</h2>
          <p>{error?.message || '알 수 없는 오류가 발생했습니다'}</p>
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
                          <Clock className={styles.modalMetaIcon} />
                          {lecture.time}
                        </div>
                        <div className={styles.dailyLectureMetaItem}>
                          <User className={styles.modalMetaIcon} />
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
              <Calendar className={styles.modalMetaIcon} />
              강의 캘린더
            </button>
            <button
              onClick={() => setActiveTab('materials')}
              className={`${styles.navTab} ${
                activeTab === 'materials' ? styles.navTabActive : styles.navTabInactive
              }`}
            >
              <FileText className={styles.modalMetaIcon} />
              자료실
            </button>
          </div>
          
          <div className={styles.navButtons}>
            {activeTab === 'calendar' && (
              <button 
                onClick={handleRefresh}
                className={`${styles.navButton} ${styles.refreshButton}`}
              >
                새로고침
              </button>
            )}
            {activeTab === 'materials' && (
              <label className={`${styles.navButton} ${styles.uploadButton}`}>
                <Upload className="w-3 h-3 mr-1" />
                업로드
                <input
                  type="file"
                  multiple
                  onChange={handleFileUpload}
                  style={{ display: 'none' }}
                  accept="*/*"
                />
              </label>
            )}
          </div>
        </div>
      </nav>

      {/* 헤더 */}
      <header className={styles.header}>
        <div className={styles.headerContainer}>
          <h1 className={styles.headerTitle}>
            {activeTab === 'calendar' ? '강의 관리 시스템' : '자료실'}
          </h1>
          {lectures && lectures.length > 0 && (
            <div className={styles.lectureCount}>
              총 {lectures.length}개의 강의
            </div>
          )}
        </div>
      </header>

      {activeTab === 'calendar' && (
        <div className={styles.mainContent}>
          <div className={styles.contentContainer}>
            {/* 캘린더 컨트롤 */}
            <div className={styles.calendarControls}>
              <div className={styles.dateNavigation}>
                <button
                  onClick={() => navigateDate(-1)}
                  className={styles.dateNavButton}
                >
                  <ChevronLeft className={styles.modalMetaIcon} />
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
                  <ChevronRight className={styles.modalMetaIcon} />
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
          </div>
        </div>
      )}

      {activeTab === 'materials' && (
        <div className={styles.mainContent}>
          <div className={styles.contentContainer}>
            <div className={styles.materialsContainer}>
              <h2 className={styles.materialsTitle}>자료실</h2>
              
              {/* 업로드 상태 표시 */}
              {uploadFileMutation.isLoading && (
                <div className={styles.uploadStatus}>
                  파일을 업로드하는 중...
                </div>
              )}
              
              {/* 자료 목록 */}
              <div className={styles.materialsGrid}>
                {materials && materials.length > 0 ? (
                  materials.map((material) => (
                    <div key={material.id} className={styles.materialCard}>
                      <div className={styles.materialInfo}>
                        <h3 className={styles.materialTitle}>{material.name}</h3>
                        <p className={styles.materialSize}>{material.size}</p>
                        <p className={styles.materialDate}>{material.uploadDate}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className={styles.materialsEmptyState}>
                    업로드된 자료가 없습니다.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

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