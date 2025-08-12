import axios from 'axios';

// Axios 인스턴스 생성
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 한국 시간 포맷팅 함수
const formatKoreaTime = (utcTimeString) => {
  if (!utcTimeString) return null;
  const date = new Date(utcTimeString);
  return date.toLocaleString('ko-KR', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
};

// UTC 시간을 한국 시간으로 변환하는 함수
const convertTimesToKorea = (obj) => {
  if (!obj || typeof obj !== 'object') return obj;
  
  // 배열인 경우
  if (Array.isArray(obj)) {
    return obj.map(item => convertTimesToKorea(item));
  }
  
  // 객체인 경우
  const converted = { ...obj };
  
  // 시간 관련 필드들을 한국 시간으로 변환
  const timeFields = [
    'uploadDate', 'upload_date',
    'createdAt', 'created_at', 
    'updatedAt', 'updated_at',
    'date', 'time',
    'expiresAt', 'expires_at'
  ];
  
  timeFields.forEach(field => {
    if (converted[field]) {
      // ISO 시간 문자열인지 확인 (Z로 끝나거나 +00:00 형태)
      if (typeof converted[field] === 'string' && 
          (converted[field].includes('T') && 
           (converted[field].endsWith('Z') || converted[field].includes('+')))) {
        converted[field] = formatKoreaTime(converted[field]);
      }
    }
  });
  
  // 중첩된 객체들도 재귀적으로 처리
  Object.keys(converted).forEach(key => {
    if (converted[key] && typeof converted[key] === 'object') {
      converted[key] = convertTimesToKorea(converted[key]);
    }
  });
  
  return converted;
};

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

// 응답 인터셉터 - materials API만 시간 변환
api.interceptors.response.use(
  (response) => {
    // materials API 응답만 시간 변환 처리
    if (response.config.url.includes('/materials')) {
      if (response.data) {
        response.data = convertTimesToKorea(response.data);
      }
      console.log('Materials API Response (시간 변환됨):', response.data);
    }
    
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
    return api.get(`/lectures/${year}/${formattedMonth}`);
  },

};

// 자료실 관련 API 함수들
export const materialsAPI = {
  // 자료실 탭 활성화시 모든 자료 조회 (파라미터 없음)
  getAllMaterials: () => api.get('/materials'),
  
  // 파일 업로드 (파라미터: 업로드 파일 대상)
  uploadFile: (formData) => api.post('/materials/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  }),
  

};

export default api;