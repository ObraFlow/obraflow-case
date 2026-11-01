import { BrowserRouter, Routes, Route, Link, NavLink } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { LayoutDashboard, FilePlus, Settings, ClipboardCheck } from 'lucide-react';

import OrderForm from './pages/OrderForm';
import OrderList from './pages/OrderList';
import RulesConfig from './pages/RulesConfig';

const queryClient = new QueryClient();

function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-gray-100">
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-6 border-b border-gray-200">
          <h1 className="text-xl font-bold text-blue-600 flex items-center gap-2">
            <ClipboardCheck className="w-6 h-6" />
            ObraFlow
          </h1>
          <p className="text-xs text-gray-500 mt-1">Gestão de Alçadas</p>
        </div>
        
        <nav className="flex-1 p-4 space-y-2">
          <NavLink 
            to="/" 
            className={({ isActive }) => `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${isActive ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-gray-50'}`}
          >
            <LayoutDashboard className="w-5 h-5" />
            <span>Pedidos</span>
          </NavLink>
          <NavLink 
            to="/novo-pedido" 
            className={({ isActive }) => `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${isActive ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-gray-50'}`}
          >
            <FilePlus className="w-5 h-5" />
            <span>Novo Pedido</span>
          </NavLink>
          <NavLink 
            to="/configuracoes" 
            className={({ isActive }) => `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${isActive ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-gray-50'}`}
          >
            <Settings className="w-5 h-5" />
            <span>Regras de Alçada</span>
          </NavLink>
        </nav>
      </aside>

      <main className="flex-1 overflow-auto">
        <header className="bg-white border-b border-gray-200 h-16 flex items-center px-8 justify-between">
          <h2 className="text-lg font-semibold text-gray-800">Fluxo de Aprovações</h2>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-500 italic">Simulando como: João P. Bernardino</span>
          </div>
        </header>
        <div className="p-8">
          {children}
        </div>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Layout>
          <Routes>
            <Route path="/" element={<OrderList />} />
            <Route path="/novo-pedido" element={<OrderForm />} />
            <Route path="/configuracoes" element={<RulesConfig />} />
          </Routes>
        </Layout>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
