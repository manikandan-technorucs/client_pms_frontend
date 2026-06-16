import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ProjectsProvider } from './context/ProjectsContext';
import Layout from './components/ui/Layout';
import ProjectsPage from './pages/ProjectsPage';
import ProjectDetailPage from './pages/ProjectDetailPage';
import NotFoundPage from './pages/NotFoundPage';
import LoginPage from './pages/LoginPage';

const PrivateRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" />;
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/*"
            element={
              <PrivateRoute>
                {/* ProjectsProvider wraps the entire authenticated app so
                    Layout, ProjectsPage, and ProjectDetailPage all share ONE
                    fetch — eliminating 3× duplicate GET /projects/ calls. */}
                <ProjectsProvider>
                  <Layout>
                    <Routes>
                      <Route path="/" element={<Navigate to="/projects" replace />} />
                      <Route path="/projects" element={<ProjectsPage />} />
                      <Route path="/projects/:projectId" element={<ProjectDetailPage />} />
                      <Route path="*" element={<NotFoundPage />} />
                    </Routes>
                  </Layout>
                </ProjectsProvider>
              </PrivateRoute>
            }
          />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;
