import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import Layout from './components/Layout'
import DashboardPage from './features/DashboardPage'
import ExercisesPage from './features/ExercisesPage'
import ProfilePage from './features/ProfilePage'
import ProgramsPage from './features/ProgramsPage'
import ProgramDetailPage from './features/ProgramDetailPage'
import { ProgressPage, RecoveryPage, WorkoutPage } from './features/PlaceholderPages'

const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      { index: true, element: <DashboardPage /> },
      { path: 'programme', element: <ProgramsPage /> },
      { path: 'programme/:id', element: <ProgramDetailPage /> },
      { path: 'exercices', element: <ExercisesPage /> },
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
