import axios from 'axios';
// import process from 'dotenv';

// Axios 인스턴스 생성
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 요청 인터셉터
api.interceptors.request.use(
  (config) => {
    // 필요시 토큰 추가
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 응답 인터셉터
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // 에러 처리
    console.error('API Error:', error);
    return Promise.reject(error);
  }
);



// 강의 관련 API 함수들
export const lecturesAPI = {
  // 달이 바뀌었을 때 해당 년월의 강의 조회
  getLecturesByMonth: (year, month) => {
    // month는 1-12 형태로 전달받음
    const formattedMonth = month.toString().padStart(2, '0');
    console.log(`Fetching lectures for ${year}-${formattedMonth}`);
    console.log(formattedMonth);
    
    return api.get(`/lectures/${year}/${formattedMonth}`);
  },
  
  // 특정 날짜의 강의 조회 (기존 유지)
  getLecturesByDate: (date) => api.get(`/lectures/date/${date}`),
  
  // 특정 강의 조회
  getLectureById: (id) => api.get(`/lectures/${id}`),
  
  // 새 강의 생성
  createLecture: (lectureData) => api.post('/lectures', lectureData),
  
  // 강의 수정
  updateLecture: (id, lectureData) => api.put(`/lectures/${id}`, lectureData),
  
  // 강의 삭제
  deleteLecture: (id) => api.delete(`/lectures/${id}`),
};

// 자료실 관련 API 함수들
export const materialsAPI = {
  // 자료실 탭 활성화시 모든 자료 조회 (파라미터 없음)
  getAllMaterials: () => api.get('/materials'),
  
  // 강의별 자료 조회
  getMaterialsByLecture: (lectureId) => api.get(`/materials/lecture/${lectureId}`),
  
  // 파일 공유 요청 (파라미터: 해당 파일 id)
  shareFile: (fileId) => api.get(`/materials/share/${fileId}`),
  
  // 파일 업로드 (파라미터: 업로드 파일 대상)
  uploadFile: (formData) => api.post('/materials/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  }),
  
  // 자료 삭제
  deleteMaterial: (id) => api.delete(`/materials/${id}`),
};

export default api;