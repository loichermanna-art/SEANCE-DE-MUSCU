import { lazy, Suspense, type ReactNode } from 'react'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import Layout from './components/Layout'
import PWAStatus from './components/PWAStatus'

const DashboardPage = lazy(() => import('./features/DashboardPage'))
const ExercisesPage = lazy(() => import('./features/ExercisesPage'))
const ProfilePage = lazy(() => import('./features/ProfilePage'))
const ProgramsPage = lazy(() => import('./features/ProgramsPage').then(module => ({ default: module.ProgramsPage })))
const WorkoutPage = lazy(() => import('./features/WorkoutPage'))
const ProgressPage = lazy(() => import('./features/ProgressPage'))
const RecoveryPage = lazy(() => import('./features/RecoveryPage'))

function route(element: ReactNode) {
  return <Suspense fallback={<div role="status" className="rounded-2xl border border-line bg-surface p-6 text-sm text-muted">Chargement de la page…</div>}>{element}</Suspense>
}

const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      { index: true, element: route(<DashboardPage />) },
      { path: 'programme', element: route(<ProgramsPage />) },
      { path: 'exercices', element: route(<ExercisesPage />) },
      { path: 'seance', element: route(<WorkoutPage />) },
      { path: 'progression', element: route(<ProgressPage />) },
      { path: 'recuperation', element: route(<RecoveryPage />) },
      { path: 'profil', element: route(<ProfilePage />) },
    ],
  },
])

export default function App() {
  return <><RouterProvider router={router} /><PWAStatus /></>
}
