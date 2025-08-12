import QueryProvider from './components/QueryProvider';
// import LectureCalendar from './calendar/Calendar'
import MainPage from './pages/MainPage';

function App() {
  return (
    <QueryProvider>
      <MainPage/>
    </QueryProvider>
  )
}

export default App
