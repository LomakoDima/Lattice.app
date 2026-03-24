import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthProvider';
import { useAuth } from './contexts/useAuth';
import { NavigationProvider, useNavigation } from './contexts/NavigationContext';
import { ToastProvider } from './contexts/ToastContext';
import { Layout } from './components/layout/Layout';
import { Auth } from './components/screens/Auth';
import { Landing } from './pages/Landing';
import { News } from './pages/News';
import { Dashboard } from './components/screens/Dashboard';
import { Pomodoro } from './components/screens/Pomodoro';
import { CreateTask } from './components/screens/CreateTask';
import { CreateGoal } from './components/screens/CreateGoal';
import { TaskList } from './components/screens/TaskList';
import { GoalList } from './components/screens/GoalList';
import { Settings } from './components/screens/Settings';
import { LoadingSpinner } from './components/ui/LoadingSpinner';

function AppShell() {
  const { currentScreen } = useNavigation();

  const renderScreen = () => {
    switch (currentScreen) {
      case 'dashboard':
        return <Dashboard />;
      case 'pomodoro':
        return <Pomodoro />;
      case 'create-task':
        return <CreateTask />;
      case 'create-goal':
        return <CreateGoal />;
      case 'tasks':
        return <TaskList />;
      case 'goals':
        return <GoalList />;
      case 'settings':
        return <Settings />;
      default:
        return <Dashboard />;
    }
  };

  return <Layout>{renderScreen()}</Layout>;
}

function AppRoutes() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-nexus-void">
        <LoadingSpinner size="lg" text="Loading Lattice…" />
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/" element={user ? <Navigate to="/app" replace /> : <Landing />} />
      <Route path="/landing" element={<Landing />} />
      <Route path="/news" element={<News />} />
      <Route path="/auth" element={user ? <Navigate to="/app" replace /> : <Auth />} />
      <Route
        path="/app/*"
        element={
          user ? (
            <NavigationProvider>
              <ToastProvider>
                <AppShell />
              </ToastProvider>
            </NavigationProvider>
          ) : (
            <Navigate to="/auth" replace />
          )
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}
