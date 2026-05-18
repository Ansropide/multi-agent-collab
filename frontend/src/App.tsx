import { BrowserRouter, Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage';
import AgentList from './pages/AgentList';
import AgentCreate from './pages/AgentCreate';
import AgentWorkspace from './pages/AgentWorkspace';
import GroupList from './pages/GroupList';
import GroupCreate from './pages/GroupCreate';
import Settings from './pages/Settings';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/agents" element={<AgentList />} />
        <Route path="/agents/create" element={<AgentCreate />} />
        <Route path="/agents/:agentId/workspace" element={<AgentWorkspace />} />
        <Route path="/groups" element={<GroupList />} />
        <Route path="/groups/create" element={<GroupCreate />} />
        <Route path="/settings" element={<Settings />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
