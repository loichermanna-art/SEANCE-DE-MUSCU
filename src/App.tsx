import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import Layout from './components/Layout'
import DashboardPage from './features/DashboardPage'
import ExercisesPage from './features/ExercisesPage'
import ExerciseDetailPage from './features/ExerciseDetailPage'
import ProfilePage from './features/ProfilePage'
import ProgramsPage from './features/ProgramsPage'
import ProgramDetailPage from './features/ProgramDetailPage'
import WorkoutPage from './features/WorkoutPage'
import ProgressPage from './features/ProgressPage'
import { RecoveryPage } from './features/PlaceholderPages'

const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      { index: true, element: <DashboardPage /> },
      { path: 'programme', element: <ProgramsPage /> },
      { path: 'programme/:id', element: <ProgramDetailPage /> },
      { path: 'exercices', element: <ExercisesPage /> },
      { path: 'exercices/:id', element: <ExerciseDetailPage /> },
      { path: 'seance', element: <WorkoutPage /> },
      { path: 'progression', element: <ProgressPage /> },
      { path: 'recuperation', element: <RecoveryPage /> },
      { path: 'profil', element: <ProfilePage /> },
    ],
  },
])

export default function App() {
  return <RouterProvider router={router} />
}
