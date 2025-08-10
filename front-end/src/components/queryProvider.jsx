import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

// QueryClient 인스턴스 생성
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 3, // 실패시 재시도 횟수
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // 지수 백오프
      staleTime: 5 * 60 * 1000, // 5분 - 데이터가 stale이 되기까지의 시간
      cacheTime: 10 * 60 * 1000, // 10분 - 캐시가 유지되는 시간
      refetchOnWindowFocus: false, // 윈도우 포커스시 refetch 비활성화
      refetchOnMount: true, // 컴포넌트 마운트시 refetch
      refetchOnReconnect: true, // 네트워크 재연결시 refetch
    },
    mutations: {
      retry: 1, // 뮤테이션 실패시 재시도 횟수
    },
  },
});

const QueryProvider = ({ children }) => {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {/* 개발 환경에서만 DevTools 표시 */}
      {process.env.NODE_ENV === 'development' && (
        <ReactQueryDevtools initialIsOpen={false} />
      )}
    </QueryClientProvider>
  );
};

export default QueryProvider;
