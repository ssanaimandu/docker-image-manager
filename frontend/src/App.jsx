import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ToastProvider } from './components/Toast';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Sources from './pages/Sources';
import Images from './pages/Images';
import Policies from './pages/Policies';
import Cleanup from './pages/Cleanup';

import Login from './pages/Login';

export default function App() {
  return (
    <ToastProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route element={<Layout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/sources" element={<Sources />} />
            <Route path="/images" element={<Images />} />
            <Route path="/policies" element={<Policies />} />
            <Route path="/cleanup" element={<Cleanup />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ToastProvider>
  );
}
