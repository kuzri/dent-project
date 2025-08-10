import QueryProvider from './components/queryProvider';
import LectureCalendar from './calendar/calendar'

function App() {
  return (
    <QueryProvider>
      <LectureCalendar/>
    </QueryProvider>
  )
}

export default App
