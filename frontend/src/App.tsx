import { Navigate, Route, BrowserRouter as Router, Routes } from 'react-router-dom';
import { AppShell } from './components/layout/AppShell';
import { AprovacoesPage } from './pages/AprovacoesPage';
import { NovoPedidoPage } from './pages/NovoPedidoPage';
import { RegrasPage } from './pages/RegrasPage';

export default function App() {
  return (
    <Router>
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={<Navigate to="/aprovacoes" replace />} />
          <Route path="/aprovacoes" element={<AprovacoesPage />} />
          <Route path="/pedidos/novo" element={<NovoPedidoPage />} />
          <Route path="/regras" element={<RegrasPage />} />
          <Route path="*" element={<Navigate to="/aprovacoes" replace />} />
        </Route>
      </Routes>
    </Router>
  );
}
