// src/components/materials/DetailModal.jsx
import React from 'react';
import { X } from 'lucide-react';
import styles from './Modal.module.css';

const DetailModal = ({ isOpen, onClose, material }) => {
  if (!isOpen || !material) return null;

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modal}>
        <div className={styles.modalHeader}>
          <h2>자료 상세보기</h2>
          <button 
            className={styles.modalCloseButton}
            onClick={onClose}
          >
            <X size={20} />
          </button>
        </div>
        
        <div className={styles.modalContent}>
          <div className={styles.detailSection}>
            <h4>제목</h4>
            <p>{material.title || material.name}</p>
          </div>
          
          <div className={styles.detailSection}>
            <h4>파일 정보</h4>
            <p>크기: {material.size}</p>
            <p>업로드 날짜: {material.uploadDate}</p>
          </div>
          
          {material.content && (
            <div className={styles.detailSection}>
              <h4>내용</h4>
              <div className={styles.contentText}>
                {material.content}
              </div>
            </div>
          )}
        </div>

        <div className={styles.modalFooter}>
          <button 
            className={styles.cancelButton}
            onClick={onClose}
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
};

export default DetailModal;