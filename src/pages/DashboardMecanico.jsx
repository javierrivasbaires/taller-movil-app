import React, { useState, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Checklist from '../components/Checklist';

// --- FUNCIONES DE CONSULTA ---
const fetchMisOrdenes = async (mecanicoId) => {
  const { data, error } = await supabase
    .from('ordenes_trabajo')
    .select(`
      *,
      clientes (nombre, telefono),
      vehiculos (marca, modelo, placa),
      orden_servicios (servicio_id, precio_aplicado, servicios (nombre, precio_base)),
      orden_productos (producto_id, cantidad, precio_aplicado, inventario (nombre_producto, precio_venta))
    `)
    .eq('mecanico_id', mecanicoId)
    .order('fecha_hora', { ascending: false });
  if (error) throw new Error(error.message);
  return data;
};

const fetchChecklistItems = async (ordenId) => {
  const { data, error } = await supabase
    .from('checklist_items')
    .select('*')
    .eq('orden_trabajo_id', ordenId);
  if (error) throw new Error(error.message);
  return data;
};

// --- MUTACIONES ---
const actualizarEstadoOrden = async ({ id, estado }) => {
  const { data, error } = await supabase
    .from('ordenes_trabajo')
    .update({ estado })
    .eq('id', id)
    .select();
  if (error) throw new Error(error.message);
  return data[0];
};

// --- COMPONENTE ---
const DashboardMecanico = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [vistaActual, setVistaActual] = useState('dashboard');
  const [ordenSeleccionadaId, setOrdenSeleccionadaId] = useState(null);
  const [filtroEstado, setFiltroEstado] = useState('todos');
  const [filtroFecha, setFiltroFecha] = useState('hoy');

  // Consulta de órdenes asignadas
  const { data: ordenes, isLoading, error } = useQuery({
    queryKey: ['misOrdenes', user.id],
    queryFn: () => fetchMisOrdenes(user.id),
    enabled: !!user?.id,
  });

  // Consulta de checklist para una orden específica
  const { data: checklistExistente } = useQuery({
    queryKey: ['checklist', ordenSeleccionadaId],
    queryFn: () => fetchChecklistItems(ordenSeleccionadaId),
    enabled: !!ordenSeleccionadaId && vistaActual === 'checklist',
  });

  // Mutación para cambiar estado
  const mutationEstado = useMutation({
    mutationFn: actualizarEstadoOrden,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['misOrdenes'] });
      alert('Estado actualizado');
    },
    onError: (error) => {
      alert('Error al actualizar estado: ' + error.message);
    },
  });

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.reload();
  };

  // --- LÓGICA DE FILTRADO ---
  const ordenesFiltradas = useMemo(() => {
    if (!ordenes) return [];

    // 1. Filtrar por estado
    let filtradas = ordenes;
    if (filtroEstado !== 'todos') {
      filtradas = filtradas.filter(o => o.estado === filtroEstado);
    }

    // 2. Filtrar por fecha
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const finDia = new Date(hoy);
    finDia.setHours(23, 59, 59, 999);
    
    const inicioSemana = new Date(hoy);
    inicioSemana.setDate(hoy.getDate() - hoy.getDay());
    const finSemana = new Date(inicioSemana);
    finSemana.setDate(inicioSemana.getDate() + 6);
    finSemana.setHours(23, 59, 59, 999);

    const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
    const finMes = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0);
    finMes.setHours(23, 59, 59, 999);

    if (filtroFecha === 'hoy') {
      filtradas = filtradas.filter(o => {
        const fecha = new Date(o.fecha_hora);
        return fecha >= hoy && fecha <= finDia;
      });
    } else if (filtroFecha === 'semana') {
      filtradas = filtradas.filter(o => {
        const fecha = new Date(o.fecha_hora);
        return fecha >= inicioSemana && fecha <= finSemana;
      });
    } else if (filtroFecha === 'mes') {
      filtradas = filtradas.filter(o => {
        const fecha = new Date(o.fecha_hora);
        return fecha >= inicioMes && fecha <= finMes;
      });
    }

    return filtradas;
  }, [ordenes, filtroEstado, filtroFecha]);

  // Agrupar por estado
  const agrupadasPorEstado = useMemo(() => {
    const grupos = {
      agendado: [],
      en_proceso: [],
      completado: [],
      facturado: [],
    };
    ordenesFiltradas.forEach(o => {
      if (grupos[o.estado]) {
        grupos[o.estado].push(o);
      }
    });
    return grupos;
  }, [ordenesFiltradas]);

  // --- VISTAS ---
  const renderDashboard = () => {
    if (isLoading) return <div className="p-6 text-gray-600">Cargando tus órdenes...</div>;
    if (error) return <div className="p-6 text-red-600">Error: {error.message}</div>;

    return (
      <div className="p-4 md:p-6 max-w-7xl mx-auto">
        <h2 className="text-2xl font-bold text-gray-800 mb-6">Mis Órdenes de Trabajo</h2>
        
        {/* Filtros */}
        <div className="bg-white rounded-xl shadow-md p-4 mb-6 flex flex-wrap items-center gap-4">
          <div>
            <label className="text-sm font-medium text-gray-700 mr-2">Estado:</label>
            <select
              value={filtroEstado}
              onChange={(e) => setFiltroEstado(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
              <option value="todos">Todos</option>
              <option value="agendado">Agendado</option>
              <option value="en_proceso">En proceso</option>
              <option value="completado">Completado</option>
              <option value="facturado">Facturado</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 mr-2">Fecha:</label>
            <select
              value={filtroFecha}
              onChange={(e) => setFiltroFecha(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
              <option value="hoy">Hoy</option>
              <option value="semana">Esta semana</option>
              <option value="mes">Este mes</option>
              <option value="todos">Todos</option>
            </select>
          </div>
          <div className="text-sm text-gray-500 ml-auto">
            {ordenesFiltradas.length} órdenes encontradas
          </div>
        </div>

        {/* Agrupación por estado */}
        {Object.entries(agrupadasPorEstado).map(([estado, items]) => {
          if (items.length === 0) return null;
          const estadoLabel = {
            agendado: '📅 Agendado',
            en_proceso: '⚙️ En proceso',
            completado: '✅ Completado',
            facturado: '🧾 Facturado'
          }[estado] || estado;

          return (
            <div key={estado} className="mb-8">
              <h3 className="text-lg font-semibold text-gray-700 mb-3 flex items-center gap-2">
                {estadoLabel}
                <span className="bg-gray-200 text-gray-700 text-xs px-2 py-0.5 rounded-full">{items.length}</span>
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {items.map((o) => (
                  <div key={o.id} className="bg-white rounded-xl shadow-md p-4 flex flex-col h-full">
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold text-gray-800 text-lg truncate">
                          {o.clientes?.nombre || 'Sin cliente'}
                        </span>
                      </div>
                      <div className="space-y-1 text-sm">
                        <div><strong>Vehículo:</strong> {o.vehiculos?.marca} {o.vehiculos?.modelo}</div>
                        <div><strong>Placa:</strong> {o.vehiculos?.placa || 'N/A'}</div>
                        <div><strong>Servicio:</strong> {o.tipo_servicio}</div>
                        <div><strong>Fecha:</strong> {new Date(o.fecha_hora).toLocaleDateString('es-SV')}</div>
                        <div>
                          <strong>Checklist:</strong> 
                          {o.checklist_completado ? ' ✅ Completado' : ' ⏳ Pendiente'}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setOrdenSeleccionadaId(o.id);
                        setVistaActual('detalle');
                      }}
                      className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm w-full"
                    >
                      Gestionar Orden
                    </button>
                  </div>
                ))}
              </div>
            </div>
          );
        })}

        {ordenesFiltradas.length === 0 && (
          <div className="text-center text-gray-500 py-10">No hay órdenes que coincidan con los filtros.</div>
        )}
      </div>
    );
  };

  const renderDetalle = () => {
    const orden = ordenes?.find(o => o.id === ordenSeleccionadaId);
    if (!orden) return <div className="p-6 text-red-600">Orden no encontrada</div>;

    const handleEstadoChange = (e) => {
      const nuevoEstado = e.target.value;
      mutationEstado.mutate({ id: orden.id, estado: nuevoEstado });
    };

    return (
      <div className="p-4 md:p-6 max-w-4xl mx-auto">
        <button
          onClick={() => setVistaActual('dashboard')}
          className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg text-sm mb-6"
        >
          ← Volver a mis órdenes
        </button>

        <div className="bg-white rounded-xl shadow-md p-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Detalle de Orden</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div><strong>Cliente:</strong> {orden.clientes?.nombre}</div>
            <div><strong>Teléfono:</strong> {orden.clientes?.telefono || 'N/A'}</div>
            <div><strong>Vehículo:</strong> {orden.vehiculos?.marca} {orden.vehiculos?.modelo}</div>
            <div><strong>Placa:</strong> {orden.vehiculos?.placa || 'N/A'}</div>
            <div><strong>Tipo:</strong> {orden.tipo_servicio}</div>
            <div><strong>Fecha:</strong> {new Date(orden.fecha_hora).toLocaleString('es-SV')}</div>
            <div><strong>Kilometraje:</strong> {orden.kilometraje || 'N/A'}</div>
            <div><strong>Total:</strong> ${orden.total}</div>
            <div className="md:col-span-2"><strong>Observaciones:</strong> {orden.observaciones || 'Ninguna'}</div>
            <div className="md:col-span-2">
              <strong>Servicios:</strong>
              {orden.orden_servicios?.length > 0 ? (
                <ul className="list-disc list-inside">
                  {orden.orden_servicios.map(os => (
                    <li key={os.servicio_id}>{os.servicios?.nombre} (${os.precio_aplicado})</li>
                  ))}
                </ul>
              ) : 'Ninguno'}
            </div>
            <div className="md:col-span-2">
              <strong>Productos:</strong>
              {orden.orden_productos?.length > 0 ? (
                <ul className="list-disc list-inside">
                  {orden.orden_productos.map(op => (
                    <li key={op.producto_id}>{op.inventario?.nombre_producto} x{op.cantidad} (${op.precio_aplicado})</li>
                  ))}
                </ul>
              ) : 'Ninguno'}
            </div>
            <div className="md:col-span-2">
              <strong>Estado actual:</strong> 
              <select
                value={orden.estado}
                onChange={handleEstadoChange}
                className="ml-3 border border-gray-300 rounded-lg px-3 py-1 focus:ring-2 focus:ring-blue-500"
                disabled={mutationEstado.isPending}
              >
                <option value="agendado">Agendado</option>
                <option value="en_proceso">En proceso</option>
                <option value="completado">Completado</option>
                <option value="facturado">Facturado</option>
              </select>
              {mutationEstado.isPending && <span className="ml-2 text-gray-500 text-sm">Guardando...</span>}
            </div>
          </div>

          <div className="flex gap-4 mt-4">
            {orden.template_id && (
              <button
                onClick={() => setVistaActual('checklist')}
                className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg text-sm"
              >
                📋 Checklist de 25 puntos
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderChecklist = () => {
    const orden = ordenes?.find(o => o.id === ordenSeleccionadaId);
    if (!orden) return <div className="p-6 text-red-600">Orden no encontrada</div>;

    return (
      <Checklist
        ordenId={ordenSeleccionadaId}
        orden={orden}
        checklistExistente={checklistExistente}
        onClose={() => setVistaActual('detalle')}
        onComplete={() => {
          queryClient.invalidateQueries({ queryKey: ['misOrdenes'] });
          setVistaActual('dashboard');
        }}
      />
    );
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-white shadow-md p-3 md:p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <h1 className="text-lg md:text-xl font-bold text-gray-800">Taller Móvil - Mecánico</h1>
        <div className="flex flex-wrap items-center gap-2 md:gap-3 w-full sm:w-auto">
          <span className="text-xs md:text-sm text-gray-600 truncate max-w-[120px] sm:max-w-[200px]">{user?.email}</span>
          <button
            onClick={handleLogout}
            className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg text-sm w-full sm:w-auto"
          >
            Cerrar sesión
          </button>
        </div>
      </nav>

      {vistaActual === 'dashboard' && renderDashboard()}
      {vistaActual === 'detalle' && renderDetalle()}
      {vistaActual === 'checklist' && renderChecklist()}
    </div>
  );
};

export default DashboardMecanico;