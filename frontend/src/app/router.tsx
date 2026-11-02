import { lazy, Suspense } from 'react'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { Layout } from './Layout'
import { DashboardPage } from '../features/dashboard/DashboardPage'
import { PageSkeleton } from '../components/ui'

const StationPage = lazy(() => import('../features/stations/StationPage'))
const HistoryPage = lazy(() => import('../features/history/HistoryPage'))
const AlertsPage = lazy(() => import('../features/alerts/AlertsPage'))
const LabPage = lazy(() => import('../features/lab/LabPage'))
const ModelPage = lazy(() => import('../features/model/ModelPage'))
const AboutPage = lazy(() => import('../features/about/AboutPage'))

const wrap = (el: React.ReactNode) => <Suspense fallback={<PageSkeleton />}>{el}</Suspense>

const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      { path: '/', element: <DashboardPage /> },
      { path: '/stations/:id', element: wrap(<StationPage />) },
      { path: '/history', element: wrap(<HistoryPage />) },
      { path: '/alerts', element: wrap(<AlertsPage />) },
      { path: '/lab', element: wrap(<LabPage />) },
      { path: '/lab/:structure', element: wrap(<LabPage />) },
      { path: '/model', element: wrap(<ModelPage />) },
      { path: '/about', element: wrap(<AboutPage />) },
    ],
  },
])

export function AppRouter() {
  return <RouterProvider router={router} />
}
