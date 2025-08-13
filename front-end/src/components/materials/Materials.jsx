// src/components/materials/Materials.jsx
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Upload, Eye } from 'lucide-react';
import { materialsAPI } from '../../api/axios';
import UploadModal from './UploadModal';
import DetailModal from './DetailModal';
import styles from './Materials.module.css';

const Materials = () => {
  const queryClient = useQueryClient();
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedMaterial, setSelectedMaterial] = useState(null);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [uploadData, setUploadData] = useState({
    title: '',
    content: ''
  });

  // React Query를 사용하여 자료 데이터 조회
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
      return response.data?.data || response.data || [];
    },
    staleTime: 5 * 60 * 1000,
    cacheTime: 10 * 60 * 1000,
    retry: 3,
    refetchOnWindowFocus: false,
  });

  // 파일 업로드 mutation
  const uploadFileMutation = useMutation({
    mutationFn: async (uploadPayload) => {
      const formData = new FormData();
      uploadPayload.files.forEach((file) => {
        formData.append('files', file);
      });
      formData.append('title', uploadPayload.title);
      formData.append('content', uploadPayload.content);
      
      return await materialsAPI.uploadFile(formData);
    },
    onSuccess: () => {
      refetchMaterials();
      setIsUploadModalOpen(false);
      setSelectedFiles([]);
      setUploadData({ title: '', content: '' });
      alert('파일이 성공적으로 업로드되었습니다.');
    },
    onError: (error) => {
      alert(`파일 업로드 실패: ${error.message}`);
    },
  });

  // 업로드 버튼 클릭 핸들러
  const handleUploadClick = () => {
    setIsUploadModalOpen(true);
  };

  // 파일 선택 핸들러 (모달 내에서 사용)
  const handleFileSelect = (event) => {
    const files = Array.from(event.target.files);
    if (files.length > 0) {
      setSelectedFiles([files[0]]); // 첫 번째 파일만 선택
    }
  };

  // 업로드 제출 핸들러
  const handleUploadSubmit = () => {
    if (!uploadData.title.trim()) {
      alert('제목을 입력해주세요.');
      return;
    }
    if (selectedFiles.length === 0) {
      alert('업로드할 파일을 선택해주세요.');
      return;
    }

    uploadFileMutation.mutate({
      files: selectedFiles,
      title: uploadData.title,
      content: uploadData.content
    });
  };

  // 업로드 모달 닫기
  const closeUploadModal = () => {
    setIsUploadModalOpen(false);
    setSelectedFiles([]);
    setUploadData({ title: '', content: '' });
  };

  // 상세 모달 열기
  const openDetailModal = (material) => {
    setSelectedMaterial(material);
    setIsDetailModalOpen(true);
  };

  // 상세 모달 닫기
  const closeDetailModal = () => {
    setIsDetailModalOpen(false);
    setSelectedMaterial(null);
  };

  const handleRefresh = () => {
    refetchMaterials();
  };

  // 로딩 상태 처리
  if (materialsLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.loadingContainer}>
          <div className={styles.loadingSpinner}></div>
          <p>자료를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  // 에러 상태 처리
  if (materialsError) {
    return (
      <div className={styles.container}>
        <div className={styles.errorContainer}>
          <h2>데이터를 불러오는 중 오류가 발생했습니다</h2>
          <p>{materialsErrorMsg?.message || '알 수 없는 오류가 발생했습니다'}</p>
          <button onClick={handleRefresh} className={styles.retryButton}>
            다시 시도
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* 자료실 상단 정보 */}
      <div className={styles.materialsInfo}>
        <div className={styles.materialsCount}>
          총 {materials.length}개의 자료
        </div>
        <div className={styles.materialsActions}>
          <button onClick={handleRefresh} className={styles.refreshButton}>
            새로고침
          </button>
          <button 
            className={styles.uploadButton}
            onClick={handleUploadClick}
          >
            <Upload className={styles.uploadIcon} />
            업로드
          </button>
        </div>
      </div>

      {/* 자료실 컨테이너 */}
      <div className={styles.materialsContainer}>
        {/* 자료 목록 */}
        <div className={styles.materialsGrid}>
          {materials && materials.length > 0 ? (
            materials.map((material) => (
              <div key={material.id} className={styles.materialCard}>
                <div className={styles.materialInfo}>
                  <h3 
                    className={styles.materialTitle}
                    onClick={() => openDetailModal(material)}
                  >
                    {material.title || material.name}
                  </h3>
                  <p className={styles.materialName}>{material.name}</p>
                  <p className={styles.materialSize}>{material.size}</p>
                  <p className={styles.materialDate}>{material.uploadDate}</p>
                </div>
                <div className={styles.materialActions}>
                  <button 
                    className={styles.viewButton}
                    onClick={() => openDetailModal(material)}
                  >
                    <Eye className={styles.viewIcon} />
                    상세보기
                  </button>
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

      {/* 업로드 모달 */}
      <UploadModal
        isOpen={isUploadModalOpen}
        onClose={closeUploadModal}
        selectedFiles={selectedFiles}
        uploadData={uploadData}
        setUploadData={setUploadData}
        onSubmit={handleUploadSubmit}
        isLoading={uploadFileMutation.isLoading}
        onFileSelect={handleFileSelect}
      />

      {/* 상세보기 모달 */}
      <DetailModal
        isOpen={isDetailModalOpen}
        onClose={closeDetailModal}
        material={selectedMaterial}
      />
    </div>
  );
};

export default Materials;