import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import ProjectDetail from './pages/ProjectDetail';
import SessionDetail from './pages/SessionDetail';
import Analytics from './pages/Analytics';
import Search from './pages/Search';
import Tasks from './pages/Tasks';
import MarkdownPreview from './pages/MarkdownPreview';

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/projects/:id" element={<ProjectDetail />} />
        <Route path="/sessions/:id" element={<SessionDetail />} />
        <Route path="/sessions/:id/preview" element={<MarkdownPreview />} />
        <Route path="/analytics" element={<Analytics />} />
        <Route path="/search" element={<Search />} />
        <Route path="/tasks" element={<Tasks />} />
      </Route>
    </Routes>
  );
}
