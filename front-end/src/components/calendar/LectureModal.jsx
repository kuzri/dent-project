// src/components/calendar/LectureModal.jsx
import React from 'react';
import { Calendar, Clock, User, X } from 'lucide-react';
import styles from './LectureModal.module.css';

const LectureModal = ({ showModal, selectedLecture, onClose }) => {
  if (!showModal || !selectedLecture) return null;

  const lectureColors = {
    lectureBlue: styles.lectureBlue,
    lectureGreen: styles.lectureGreen,
    lecturePurple: styles.lecturePurple,
    lectureOrange: styles.lectureOrange,
    lectureRed: styles.lectureRed,
    lecturePink: styles.lecturePink,
  };

  return (
    <div className={styles.modalOverlay}>
      {/* 오버레이 */}
      <div 
        className={styles.modalBackdrop}
        onClick={onClose}
      />
      
      {/* 모달 컨텐츠 */}
      <div className={styles.modalContent}>
        {/* 헤더 */}
        <div className={`${styles.modalHeader} ${lectureColors[selectedLecture.colorClass]}`}>
          <div className={styles.modalHeaderContent}>
            <div>
              <h2 className={styles.modalTitle}>{selectedLecture.title}</h2>
              <div className={styles.modalHeaderMeta}>
                <span className={styles.modalMetaItem}>
                  <Calendar className={styles.modalMetaIcon} />
                  {new Date(selectedLecture.date).toLocaleDateString('ko-KR', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </span>
                <span className={styles.modalMetaItem}>
                  <Clock className={styles.modalMetaIcon} />
                  {selectedLecture.time}
                </span>
              </div>
            </div>
            <button
              onClick={onClose}
              className={styles.modalCloseButton}
            >
              <X className={styles.modalCloseIcon} />
            </button>
          </div>
        </div>
        
        {/* 바디 */}
        <div className={styles.modalBody}>
          {/* 강사 정보 */}
          <div className={styles.modalSection}>
            <h3 className={styles.modalSectionTitle}>강사</h3>
            <div className={styles.modalInstructorInfo}>
              <User className={styles.modalInstructorIcon} />
              <span className={styles.modalInstructorName}>{selectedLecture.instructor}</span>
            </div>
          </div>
          
          {/* 강의 설명 */}
          <div className={styles.modalSection}>
            <h3 className={styles.modalSectionTitle}>강의 내용</h3>
            <p className={styles.modalDescription}>
              {selectedLecture.description}
            </p>
          </div>
        </div>
        
        {/* 푸터 */}
        <div className={styles.modalFooter}>
          <div className={styles.modalFooterActions}>
            <button
              onClick={onClose}
              className={styles.modalCloseButtonSecondary}
            >
              닫기
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LectureModal;