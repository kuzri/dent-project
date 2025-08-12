// src/components/materials/UploadModal.jsx
import React from 'react';
import { X, Upload } from 'lucide-react';
import styles from './Modal.module.css';

const UploadModal = ({ 
  isOpen, 
  onClose, 
  selectedFiles, 
  uploadData, 
  setUploadData, 
  onSubmit, 
  isLoading,
  onFileSelect
}) => {
  if (!isOpen) return null;

  const handleSubmit = () => {
    if (!uploadData.title.trim()) {
      alert('제목을 입력해주세요.');
      return;
    }
    if (selectedFiles.length === 0) {
      alert('업로드할 파일을 선택해주세요.');
      return;
    }
    onSubmit();
  };

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modal}>
        <div className={styles.modalHeader}>
          <h2>자료 업로드</h2>
          <button 
            className={styles.modalCloseButton}
            onClick={onClose}
          >
            <X size={20} />
          </button>
        </div>
        
        <div className={styles.modalContent}>
          {/* 파일 선택 */}
          <div className={styles.inputGroup}>
            <label htmlFor="fileInput">파일 선택 *</label>
            <label className={styles.fileSelectButton}>
              <Upload className={styles.uploadIcon} />
              파일 선택
              <input
                id="fileInput"
                type="file"
                onChange={onFileSelect}
                style={{ display: 'none' }}
                accept="*/*"
              />
            </label>
          </div>

          {/* 선택된 파일 정보 */}
          {selectedFiles.length > 0 && (
            <div className={styles.selectedFiles}>
              <h4>선택된 파일:</h4>
              <div className={styles.fileItem}>
                {selectedFiles[0].name} ({(selectedFiles[0].size / 1024 / 1024).toFixed(2)} MB)
              </div>
            </div>
          )}

          {/* 제목 입력 */}
          <div className={styles.inputGroup}>
            <label htmlFor="title">제목 *</label>
            <input
              id="title"
              type="text"
              value={uploadData.title}
              onChange={(e) => setUploadData(prev => ({ ...prev, title: e.target.value }))}
              placeholder="자료의 제목을 입력하세요"
              className={styles.input}
            />
          </div>

          {/* 내용 입력 */}
          <div className={styles.inputGroup}>
            <label htmlFor="content">내용</label>
            <textarea
              id="content"
              value={uploadData.content}
              onChange={(e) => setUploadData(prev => ({ ...prev, content: e.target.value }))}
              placeholder="자료에 대한 설명을 입력하세요"
              className={styles.textarea}
              rows="4"
            />
          </div>
        </div>

        <div className={styles.modalFooter}>
          <button 
            className={styles.cancelButton}
            onClick={onClose}
          >
            취소
          </button>
          <button 
            className={styles.submitButton}
            onClick={handleSubmit}
            disabled={isLoading}
          >
            {isLoading ? '업로드 중...' : '게시'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default UploadModal;