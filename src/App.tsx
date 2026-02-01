import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";

// Pages
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";

// Admin Pages
import Dashboard from "./pages/admin/Dashboard";
import Students from "./pages/admin/Students";
import StudentLogbook from "./pages/admin/StudentLogbook";
import Workouts from "./pages/admin/Workouts";
import StudentWorkouts from "./pages/admin/StudentWorkouts";
import Library from "./pages/admin/Library";
import GuidesAdmin from "./pages/admin/Guides";

// Student Pages
import MyWorkouts from "./pages/student/MyWorkouts";
import Logbook from "./pages/student/Logbook";
import ActiveWorkout from "./pages/student/ActiveWorkout";
import GuidesStudent from "./pages/student/Guides";
import Platform from "./pages/student/Platform";
import CourseViewer from "./pages/student/CourseViewer";

// Layout
import Layout from "./components/layout/Layout";

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return <Layout>{children}</Layout>;
}

function AuthRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (user) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

function AppRoutes() {
  const { isAdmin } = useAuth();

  return (
    <Routes>
      {/* Auth */}
      <Route
        path="/auth"
        element={
          <AuthRoute>
            <Auth />
          </AuthRoute>
        }
      />

      {/* Protected Routes */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            {isAdmin ? <Dashboard /> : <MyWorkouts />}
          </ProtectedRoute>
        }
      />

      {/* Admin Routes */}
      <Route
        path="/students"
        element={
          <ProtectedRoute>
            {isAdmin ? <Students /> : <Navigate to="/" replace />}
          </ProtectedRoute>
        }
      />
      <Route
        path="/students/:studentId/logbook"
        element={
          <ProtectedRoute>
            {isAdmin ? <StudentLogbook /> : <Navigate to="/" replace />}
          </ProtectedRoute>
        }
      />
      <Route
        path="/students/:studentId/workouts"
        element={
          <ProtectedRoute>
            {isAdmin ? <StudentWorkouts /> : <Navigate to="/" replace />}
          </ProtectedRoute>
        }
      />
      <Route
        path="/library"
        element={
          <ProtectedRoute>
            {isAdmin ? <Library /> : <Navigate to="/" replace />}
          </ProtectedRoute>
        }
      />
      <Route
        path="/workouts"
        element={
          <ProtectedRoute>
            {isAdmin ? <Workouts /> : <Navigate to="/" replace />}
          </ProtectedRoute>
        }
      />

      {/* Student Routes */}
      <Route
        path="/logbook"
        element={
          <ProtectedRoute>
            {!isAdmin ? <Logbook /> : <Navigate to="/" replace />}
          </ProtectedRoute>
        }
      />
      <Route
        path="/workout/:workoutId"
        element={
          <ProtectedRoute>
            {!isAdmin ? <ActiveWorkout /> : <Navigate to="/" replace />}
          </ProtectedRoute>
        }
      />

      {/* Guides - Both can access */}
      <Route
        path="/guides"
        element={
          <ProtectedRoute>
            {isAdmin ? <GuidesAdmin /> : <GuidesStudent />}
          </ProtectedRoute>
        }
      />

      {/* Platform - Student only */}
      <Route
        path="/platform"
        element={
          <ProtectedRoute>
            {!isAdmin ? <Platform /> : <Navigate to="/" replace />}
          </ProtectedRoute>
        }
      />
      <Route
        path="/platform/course/:courseId"
        element={
          <ProtectedRoute>
            {!isAdmin ? <CourseViewer /> : <Navigate to="/" replace />}
          </ProtectedRoute>
        }
      />

      {/* 404 */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
