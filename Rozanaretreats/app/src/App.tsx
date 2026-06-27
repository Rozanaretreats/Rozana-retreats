import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { PropertyProvider } from './context/PropertyContext'
import { OpsProvider } from './context/OpsContext'
import { SidebarLayout } from './layouts/SidebarLayout'
import {
  ProtectedRoute,
  OwnerOnlyRoute,
  ManagementOnlyRoute,
  StaffOnlyRoute,
  HomeRedirect,
} from './components/ProtectedRoute'
import { LoginPage } from './pages/LoginPage'
import { AttendancePage } from './pages/AttendancePage'
import { LeavePage } from './pages/LeavePage'
import { HousekeepingPage } from './pages/HousekeepingPage'
import { ReportsPage } from './pages/ReportsPage'
import { StaffMyTasksPage } from './pages/staff/StaffMyTasksPage'
import { StaffMyAttendancePage } from './pages/staff/StaffMyAttendancePage'
import { StaffMyLeavePage } from './pages/staff/StaffMyLeavePage'

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <PropertyProvider>
          <OpsProvider>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <SidebarLayout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<HomeRedirect />} />
                <Route
                  path="attendance"
                  element={
                    <ManagementOnlyRoute>
                      <AttendancePage />
                    </ManagementOnlyRoute>
                  }
                />
                <Route
                  path="leave"
                  element={
                    <ManagementOnlyRoute>
                      <LeavePage />
                    </ManagementOnlyRoute>
                  }
                />
                <Route
                  path="housekeeping"
                  element={
                    <ManagementOnlyRoute>
                      <HousekeepingPage />
                    </ManagementOnlyRoute>
                  }
                />
                <Route
                  path="reports"
                  element={
                    <OwnerOnlyRoute>
                      <ReportsPage />
                    </OwnerOnlyRoute>
                  }
                />
                <Route
                  path="my-tasks"
                  element={
                    <StaffOnlyRoute>
                      <StaffMyTasksPage />
                    </StaffOnlyRoute>
                  }
                />
                <Route
                  path="my-attendance"
                  element={
                    <StaffOnlyRoute>
                      <StaffMyAttendancePage />
                    </StaffOnlyRoute>
                  }
                />
                <Route
                  path="my-leave"
                  element={
                    <StaffOnlyRoute>
                      <StaffMyLeavePage />
                    </StaffOnlyRoute>
                  }
                />
              </Route>
            </Routes>
          </OpsProvider>
        </PropertyProvider>
      </BrowserRouter>
    </AuthProvider>
  )
}
