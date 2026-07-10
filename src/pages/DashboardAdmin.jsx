import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { useQuery } from '@tanstack/react-query';
import Clientes from './Clientes';
import Vehiculos from './Vehiculos';
import Inventario from './Inventario';
import Suscripciones from './Suscripciones';
import OrdenesTrabajo from './OrdenesTrabajo';
import Empleados from './Empleados';
import Servicios from './Servicios';
import ChecklistTemplate from './ChecklistTemplate';

// Funciones para obtener conteos
const fetchClientesCount = async () => {
  const { count, error } = await supabase
    .from('clientes')
    .select('*', { count: 'exact', head: true });
  if (error) throw new Error(error.message);
  return count;
};

const fetchVehiculosCount = async () => {
  const { count, error } = await supabase
    .from('vehiculos')
    .select('*', { count: 'exact', head: true });
  if (error) throw new Error(error.message);
  return count;
};

const fetchInventarioCount = async () => {
  const { count, error } = await supabase
    .from('inventario')
    .select('*', { count: 'exact', head: true });
  if (error) throw new Error(error.message);
  return count;
};

const fetchSuscripcionesCount = async () => {
  const { count, error } = await supabase
    .from('suscripciones')
    .select('*', { count: 'exact', head: true })
    .eq('activo', true);
  if (error) throw new Error(error.message);
  return count;
};

const fetchOrdenesCount = async () => {
  const { count, error } = await supabase
    .from('ordenes_trabajo')
    .select('*', { count: 'exact', head: true });
  if (error) throw new Error(error.message);
  return count;
};

const fetchEmpleadosCount = async () => {
  const { count, error } = await supabase
    .from('perfiles')
    .select('*', { count: 'exact', head: true })
    .in('rol', ['admin', 'mecanico']);
  if (error) throw new Error(error.message);
  return count;
};

const fetchServiciosCount = async () => {
  const { count, error } = await supabase
    .from('servicios')
    .select('*', { count: 'exact', head: true })
    .eq('activo', true);
  if (error) throw new Error(error.message);
  return count;
};

const fetchChecklistTemplateCount = async () => {
  const { count, error } = await supabase
    .from('checklist_template')
    .select('*', { count: 'exact', head: true })
    .eq('activo', true);
  if (error) throw new Error(error.message);
  return count;
};

const DashboardAdmin = () => {
  const { user } = useAuth();
  const [vistaActual, setVistaActual] = useState('dashboard');

  const { data: clientesCount, isLoading: clientesLoading } = useQuery({
    queryKey: ['clientesCount'],
    queryFn: fetchClientesCount,
  });

  const { data: vehiculosCount, isLoading: vehiculosLoading } = useQuery({
    queryKey: ['vehiculosCount'],
    queryFn: fetchVehiculosCount,
  });

  const { data: inventarioCount, isLoading: inventarioLoading } = useQuery({
    queryKey: ['inventarioCount'],
    queryFn: fetchInventarioCount,
  });

  const { data: suscripcionesCount, isLoading: suscripcionesLoading } = useQuery({
    queryKey: ['suscripcionesCount'],
    queryFn: fetchSuscripcionesCount,
  });

  const { data: ordenesCount, isLoading: ordenesLoading } = useQuery({
    queryKey: ['ordenesCount'],
    queryFn: fetchOrdenesCount,
  });

  const { data: empleadosCount, isLoading: empleadosLoading } = useQuery({
    queryKey: ['empleadosCount'],
    queryFn: fetchEmpleadosCount,
  });

  const { data: serviciosCount, isLoading: serviciosLoading } = useQuery({
    queryKey: ['serviciosCount'],
    queryFn: fetchServiciosCount,
  });

  const { data: checklistTemplateCount, isLoading: checklistTemplateLoading } = useQuery({
    queryKey: ['checklistTemplateCount'],
    queryFn: fetchChecklistTemplateCount,
  });

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.reload();
  };

  const renderContenido = () => {
    switch (vistaActual) {
      case 'clientes':
        return <Clientes />;
      case 'vehiculos':
        return <Vehiculos />;
      case 'inventario':
        return <Inventario />;
      case 'suscripciones':
        return <Suscripciones />;
      case 'ordenes':
        return <OrdenesTrabajo />;
      case 'empleados':
        return <Empleados />;
      case 'servicios':
        return <Servicios />;
      case 'checklistTemplate':
        return <ChecklistTemplate />;
      default:
        return (
          <div className="p-4 md:p-6 max-w-7xl mx-auto">
            <h2 className="text-xl md:text-2xl font-bold text-gray-800 mb-6">Panel de Administración</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6 mb-8">
              {/* Clientes */}
              <div
                className="bg-white rounded-xl shadow-md p-4 md:p-6 cursor-pointer hover:shadow-lg transition"
                onClick={() => setVistaActual('clientes')}
              >
                <h3 className="text-gray-500 text-sm font-semibold">Clientes</h3>
                <p className="text-2xl md:text-3xl font-bold text-gray-800">
                  {clientesLoading ? '...' : clientesCount ?? 0}
                </p>
                <span className="text-blue-600 text-sm hover:underline">Ver todos</span>
              </div>

              {/* Vehículos */}
              <div
                className="bg-white rounded-xl shadow-md p-4 md:p-6 cursor-pointer hover:shadow-lg transition"
                onClick={() => setVistaActual('vehiculos')}
              >
                <h3 className="text-gray-500 text-sm font-semibold">Vehículos</h3>
                <p className="text-2xl md:text-3xl font-bold text-gray-800">
                  {vehiculosLoading ? '...' : vehiculosCount ?? 0}
                </p>
                <span className="text-blue-600 text-sm hover:underline">Ver todos</span>
              </div>

              {/* Inventario */}
              <div
                className="bg-white rounded-xl shadow-md p-4 md:p-6 cursor-pointer hover:shadow-lg transition"
                onClick={() => setVistaActual('inventario')}
              >
                <h3 className="text-gray-500 text-sm font-semibold">Inventario</h3>
                <p className="text-2xl md:text-3xl font-bold text-gray-800">
                  {inventarioLoading ? '...' : inventarioCount ?? 0}
                </p>
                <span className="text-blue-600 text-sm hover:underline">Gestionar</span>
              </div>

              {/* Servicios */}
              <div
                className="bg-white rounded-xl shadow-md p-4 md:p-6 cursor-pointer hover:shadow-lg transition"
                onClick={() => setVistaActual('servicios')}
              >
                <h3 className="text-gray-500 text-sm font-semibold">Servicios</h3>
                <p className="text-2xl md:text-3xl font-bold text-gray-800">
                  {serviciosLoading ? '...' : serviciosCount ?? 0}
                </p>
                <span className="text-blue-600 text-sm hover:underline">Gestionar</span>
              </div>

              {/* Suscripciones */}
              <div
                className="bg-white rounded-xl shadow-md p-4 md:p-6 cursor-pointer hover:shadow-lg transition"
                onClick={() => setVistaActual('suscripciones')}
              >
                <h3 className="text-gray-500 text-sm font-semibold">Suscripciones</h3>
                <p className="text-2xl md:text-3xl font-bold text-gray-800">
                  {suscripcionesLoading ? '...' : suscripcionesCount ?? 0}
                </p>
                <span className="text-blue-600 text-sm hover:underline">Gestionar</span>
              </div>

              {/* Órdenes */}
              <div
                className="bg-white rounded-xl shadow-md p-4 md:p-6 cursor-pointer hover:shadow-lg transition"
                onClick={() => setVistaActual('ordenes')}
              >
                <h3 className="text-gray-500 text-sm font-semibold">Órdenes</h3>
                <p className="text-2xl md:text-3xl font-bold text-gray-800">
                  {ordenesLoading ? '...' : ordenesCount ?? 0}
                </p>
                <span className="text-blue-600 text-sm hover:underline">Ver todas</span>
              </div>

              {/* Empleados */}
              <div
                className="bg-white rounded-xl shadow-md p-4 md:p-6 cursor-pointer hover:shadow-lg transition"
                onClick={() => setVistaActual('empleados')}
              >
                <h3 className="text-gray-500 text-sm font-semibold">Empleados</h3>
                <p className="text-2xl md:text-3xl font-bold text-gray-800">
                  {empleadosLoading ? '...' : empleadosCount ?? 0}
                </p>
                <span className="text-blue-600 text-sm hover:underline">Gestionar</span>
              </div>

              {/* Checklist Template */}
              <div
                className="bg-white rounded-xl shadow-md p-4 md:p-6 cursor-pointer hover:shadow-lg transition"
                onClick={() => setVistaActual('checklistTemplate')}
              >
                <h3 className="text-gray-500 text-sm font-semibold">Checklist</h3>
                <p className="text-2xl md:text-3xl font-bold text-gray-800">
                  {checklistTemplateLoading ? '...' : checklistTemplateCount ?? 0}
                </p>
                <span className="text-blue-600 text-sm hover:underline">Gestionar ítems</span>
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-md p-4 md:p-6">
              <p className="text-gray-600 text-sm md:text-base">Próximos módulos: PDFs, WhatsApp, Portal Cliente, Reportes.</p>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-white shadow-md p-3 md:p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <h1 className="text-lg md:text-xl font-bold text-gray-800">Taller Móvil - Admin</h1>
        <div className="flex flex-wrap items-center gap-2 md:gap-3 w-full sm:w-auto">
          <span className="text-xs md:text-sm text-gray-600 truncate max-w-[120px] sm:max-w-[200px]">{user?.email}</span>
          {vistaActual !== 'dashboard' && (
            <button
              onClick={() => setVistaActual('dashboard')}
              className="bg-gray-500 hover:bg-gray-600 text-white px-3 py-1 rounded text-xs md:text-sm"
            >
              Volver
            </button>
          )}
          <button
            onClick={handleLogout}
            className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg text-sm w-full sm:w-auto"
          >
            Cerrar sesión
          </button>
        </div>
      </nav>
      {renderContenido()}
    </div>
  );
};

export default DashboardAdmin;