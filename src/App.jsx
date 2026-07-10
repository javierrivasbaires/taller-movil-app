import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Login from './pages/Login';
import DashboardAdmin from './pages/DashboardAdmin';
import DashboardMecanico from './pages/DashboardMecanico';
import PortalCliente from './pages/PortalCliente';

// Componente que protege las rutas privadas (requieren autenticación)
const ProtectedRoutes = () => {
  const { user, rol, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <p className="text-gray-600">Cargando...</p>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  if (rol === 'admin') {
    return <DashboardAdmin />;
  } else if (rol === 'mecanico') {
    return <DashboardMecanico />;
  } else {
    // Si no tiene rol asignado (por seguridad)
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="bg-white p-8 rounded-xl shadow-lg text-center">
          <h1 className="text-xl font-bold text-red-600">Rol no reconocido</h1>
          <p className="text-gray-600 mt-2">Contacta al administrador.</p>
          <button
            onClick={() => supabase.auth.signOut()}
            className="mt-4 bg-red-500 text-white px-4 py-2 rounded"
          >
            Cerrar sesión
          </button>
        </div>
      </div>
    );
  }
};

function App() {
  return (
    <Routes>
      {/* Ruta pública para el portal del cliente (no requiere login) */}
      <Route path="/portal" element={<PortalCliente />} />
      {/* Todas las demás rutas requieren autenticación */}
      <Route path="/*" element={<ProtectedRoutes />} />
    </Routes>
  );
}

export default App;