import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { enviarMensaje } from '../utils/whatsapp';
import { formatearMensaje } from '../constants/mensajes';

// --- FUNCIONES DE CONSULTA ---
const fetchSuscripciones = async () => {
  const { data, error } = await supabase
    .from('suscripciones')
    .select(`
      *,
      clientes (nombre, telefono),
      vehiculos (marca, modelo, placa)
    `)
    .order('fecha_proximo_pago', { ascending: true });
  if (error) throw new Error(error.message);
  return data;
};

const fetchClientes = async () => {
  const { data, error } = await supabase
    .from('clientes')
    .select('id, nombre, telefono')
    .order('nombre');
  if (error) throw new Error(error.message);
  return data;
};

const fetchVehiculosByCliente = async (clienteId) => {
  if (!clienteId) return [];
  const { data, error } = await supabase
    .from('vehiculos')
    .select('id, marca, modelo, placa')
    .eq('cliente_id', clienteId);
  if (error) throw new Error(error.message);
  return data;
};

const fetchPrecioBase = async () => {
  const { data, error } = await supabase
    .from('configuracion')
    .select('valor')
    .eq('clave', 'precio_suscripcion_base')
    .single();
  if (error) throw new Error(error.message);
  return parseFloat(data.valor) || 15.00;
};

// --- MUTACIONES ---
const crearSuscripcion = async (nueva) => {
  const { data, error } = await supabase
    .from('suscripciones')
    .insert([nueva])
    .select();
  if (error) throw new Error(error.message);
  return data[0];
};

const actualizarSuscripcion = async ({ id, ...datos }) => {
  const { data, error } = await supabase
    .from('suscripciones')
    .update(datos)
    .eq('id', id)
    .select();
  if (error) throw new Error(error.message);
  return data[0];
};

const eliminarSuscripcion = async (id) => {
  const { error } = await supabase
    .from('suscripciones')
    .delete()
    .eq('id', id);
  if (error) throw new Error(error.message);
  return id;
};

// --- COMPONENTE ---
const Suscripciones = () => {
  const queryClient = useQueryClient();
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [editandoId, setEditandoId] = useState(null);
  const [clienteId, setClienteId] = useState('');
  const [vehiculoId, setVehiculoId] = useState('');
  const [precioMensual, setPrecioMensual] = useState('');
  const [fechaInicio, setFechaInicio] = useState('');
  const [activo, setActivo] = useState(true);
  const [filtroVencimiento, setFiltroVencimiento] = useState('todas');

  // Consultas
  const { data: suscripciones, isLoading: suscripcionesLoading, error: suscripcionesError } = useQuery({
    queryKey: ['suscripciones'],
    queryFn: fetchSuscripciones,
  });

  const { data: clientes, isLoading: clientesLoading } = useQuery({
    queryKey: ['clientesSelect'],
    queryFn: fetchClientes,
  });

  const { data: vehiculos, isLoading: vehiculosLoading } = useQuery({
    queryKey: ['vehiculosByCliente', clienteId],
    queryFn: () => fetchVehiculosByCliente(clienteId),
    enabled: !!clienteId,
  });

  const { data: precioBase } = useQuery({
    queryKey: ['precioBase'],
    queryFn: fetchPrecioBase,
  });

  // Mutaciones
  const crearMutation = useMutation({
    mutationFn: crearSuscripcion,
    onSuccess: async (data) => {
      queryClient.invalidateQueries({ queryKey: ['suscripciones'] });
      queryClient.invalidateQueries({ queryKey: ['suscripcionesCount'] });

      // --- SIMULACIÓN DE WHATSAPP: NOTIFICAR AL CLIENTE ---
      try {
        // Obtener el cliente
        const { data: clienteData } = await supabase
          .from('clientes')
          .select('nombre, telefono')
          .eq('id', data.cliente_id)
          .single();
        
        if (clienteData) {
          const mensajeTemplate = `¡Felicidades [cliente]! Ya formas parte de nuestro plan de mantenimiento. Tu primera visita preventiva está programada para [fecha]. Puedes ver todos los beneficios en tu portal: [enlace_portal].`;
          const enlacePortal = `${window.location.origin}/portal?token=${clienteData.token_portal}`;
          const mensaje = formatearMensaje(mensajeTemplate, {
            cliente: clienteData.nombre,
            fecha: new Date(data.fecha_inicio).toLocaleDateString('es-SV'),
            enlace_portal: enlacePortal || '#',
          });
          await enviarMensaje(clienteData.telefono || '50370123456', mensaje);
        } else {
          // Cliente de prueba
          await enviarMensaje('50370123456', 'Suscripción creada para Cliente Prueba');
        }
      } catch (err) {
        console.error('Error al notificar al cliente:', err);
        // No bloqueamos la creación si falla la notificación
      }

      resetFormulario();
    },
    onError: (error) => alert('Error: ' + error.message),
  });

  const actualizarMutation = useMutation({
    mutationFn: actualizarSuscripcion,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suscripciones'] });
      queryClient.invalidateQueries({ queryKey: ['suscripcionesCount'] });
      resetFormulario();
      alert('Suscripción actualizada');
    },
    onError: (error) => alert('Error: ' + error.message),
  });

  const eliminarMutation = useMutation({
    mutationFn: eliminarSuscripcion,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suscripciones'] });
      queryClient.invalidateQueries({ queryKey: ['suscripcionesCount'] });
      alert('Suscripción cancelada');
    },
    onError: (error) => alert('Error: ' + error.message),
  });

  const resetFormulario = () => {
    setClienteId('');
    setVehiculoId('');
    setPrecioMensual('');
    setFechaInicio('');
    setActivo(true);
    setEditandoId(null);
    setMostrarFormulario(false);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!clienteId || !vehiculoId || !precioMensual || !fechaInicio) {
      alert('Todos los campos son obligatorios');
      return;
    }
    const datos = {
      cliente_id: parseInt(clienteId),
      vehiculo_id: parseInt(vehiculoId),
      precio_mensual: parseFloat(precioMensual),
      fecha_inicio: fechaInicio,
      fecha_proximo_pago: fechaInicio,
      activo: activo,
    };

    if (editandoId) {
      actualizarMutation.mutate({ id: editandoId, ...datos });
    } else {
      crearMutation.mutate(datos);
    }
  };

  const handleEditar = (suscripcion) => {
    setEditandoId(suscripcion.id);
    setClienteId(suscripcion.cliente_id.toString());
    setVehiculoId(suscripcion.vehiculo_id.toString());
    setPrecioMensual(suscripcion.precio_mensual.toString());
    setFechaInicio(suscripcion.fecha_inicio);
    setActivo(suscripcion.activo);
    setMostrarFormulario(true);
  };

  const handleEliminar = (id, clienteNombre) => {
    if (window.confirm(`¿Cancelar la suscripción de "${clienteNombre}"?`)) {
      eliminarMutation.mutate(id);
    }
  };

  const handleClienteChange = (e) => {
    const id = e.target.value;
    setClienteId(id);
    setVehiculoId('');
  };

  const formatDate = (date) => {
    if (!date) return '-';
    const d = new Date(date);
    return d.toLocaleDateString('es-SV');
  };

  // --- LÓGICA DE FILTRADO ---
  const suscripcionesFiltradas = useMemo(() => {
    if (!suscripciones) return [];

    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    const conEstado = suscripciones.map(s => {
      const fechaPago = new Date(s.fecha_proximo_pago);
      fechaPago.setHours(0, 0, 0, 0);
      const diffDays = Math.ceil((fechaPago - hoy) / (1000 * 60 * 60 * 24));
      
      let estadoVencimiento = 'al_dia';
      if (diffDays < 0) {
        if (diffDays >= -30) estadoVencimiento = 'vencida';
        else estadoVencimiento = 'mora';
      } else if (diffDays <= 7) {
        estadoVencimiento = 'proxima';
      }
      return { ...s, estadoVencimiento, diffDays };
    });

    let filtradas = conEstado;
    if (filtroVencimiento === 'activas') {
      filtradas = filtradas.filter(s => s.activo === true && s.estadoVencimiento === 'al_dia');
    } else if (filtroVencimiento === 'proximas') {
      filtradas = filtradas.filter(s => s.activo === true && s.estadoVencimiento === 'proxima');
    } else if (filtroVencimiento === 'vencidas') {
      filtradas = filtradas.filter(s => s.activo === true && s.estadoVencimiento === 'vencida');
    } else if (filtroVencimiento === 'mora') {
      filtradas = filtradas.filter(s => s.activo === true && s.estadoVencimiento === 'mora');
    } else if (filtroVencimiento === 'inactivas') {
      filtradas = filtradas.filter(s => s.activo === false);
    }

    return filtradas;
  }, [suscripciones, filtroVencimiento]);

  if (suscripcionesLoading || clientesLoading) {
    return <div className="p-6 text-gray-600">Cargando...</div>;
  }

  if (suscripcionesError) {
    return <div className="p-6 text-red-600">Error: {suscripcionesError.message}</div>;
  }

  return (
    <div className="p-4 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Suscripciones</h2>
        <button
          onClick={() => {
            if (mostrarFormulario && editandoId) {
              resetFormulario();
            } else {
              setMostrarFormulario(!mostrarFormulario);
              if (!mostrarFormulario) {
                setEditandoId(null);
                setPrecioMensual(precioBase?.toString() || '15.00');
                setFechaInicio(new Date().toISOString().split('T')[0]);
              }
            }
          }}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm w-full sm:w-auto"
        >
          {mostrarFormulario ? 'Cancelar' : '+ Nueva Suscripción'}
        </button>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-xl shadow-md p-4 mb-6 flex flex-wrap items-center gap-4">
        <div>
          <label className="text-sm font-medium text-gray-700 mr-2">Estado:</label>
          <select
            value={filtroVencimiento}
            onChange={(e) => setFiltroVencimiento(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
          >
            <option value="todas">Todas</option>
            <option value="activas">Activas al día</option>
            <option value="proximas">Próximas a vencer (≤ 7 días)</option>
            <option value="vencidas">Vencidas (≤ 30 días)</option>
            <option value="mora">En mora (&gt; 30 días)</option>
            <option value="inactivas">Inactivas</option>
          </select>
        </div>
        <div className="text-sm text-gray-500 ml-auto">
          {suscripcionesFiltradas.length} suscripciones encontradas
        </div>
      </div>

      {mostrarFormulario && (
        <div className="bg-white rounded-xl shadow-md p-6 mb-6">
          <h3 className="text-lg font-semibold mb-4">
            {editandoId ? 'Editar Suscripción' : 'Nueva Suscripción'}
          </h3>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Cliente *</label>
              <select
                value={clienteId}
                onChange={handleClienteChange}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                required
              >
                <option value="">Seleccionar cliente</option>
                {clientes?.map((c) => (
                  <option key={c.id} value={c.id}>{c.nombre}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Vehículo *</label>
              <select
                value={vehiculoId}
                onChange={(e) => setVehiculoId(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                required
                disabled={!clienteId || vehiculosLoading}
              >
                <option value="">Seleccionar vehículo</option>
                {vehiculos?.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.marca} {v.modelo} - {v.placa || 'sin placa'}
                  </option>
                ))}
              </select>
              {clienteId && vehiculos?.length === 0 && (
                <p className="text-xs text-amber-600 mt-1">Este cliente no tiene vehículos registrados</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Precio mensual ($) *</label>
              <input
                type="number"
                step="0.01"
                value={precioMensual}
                onChange={(e) => setPrecioMensual(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fecha de inicio *</label>
              <input
                type="date"
                value={fechaInicio}
                onChange={(e) => setFechaInicio(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                required
              />
            </div>
            <div className="md:col-span-2 flex items-center gap-4">
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={activo}
                  onChange={(e) => setActivo(e.target.checked)}
                /> Activa
              </label>
            </div>
            <div className="md:col-span-2 flex justify-end">
              <button
                type="submit"
                disabled={crearMutation.isPending || actualizarMutation.isPending}
                className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg disabled:opacity-50 w-full md:w-auto"
              >
                {crearMutation.isPending || actualizarMutation.isPending
                  ? 'Guardando...'
                  : editandoId
                  ? 'Actualizar Suscripción'
                  : 'Guardar Suscripción'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Grid de tarjetas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {suscripcionesFiltradas.length === 0 ? (
          <div className="col-span-full text-center text-gray-500 py-8">No hay suscripciones que coincidan con los filtros.</div>
        ) : (
          suscripcionesFiltradas.map((s) => {
            let badgeLabel = '';
            let badgeColor = 'bg-gray-100 text-gray-700';
            if (s.activo) {
              if (s.estadoVencimiento === 'proxima') {
                badgeLabel = `⏳ Vence en ${Math.abs(s.diffDays)} días`;
                badgeColor = 'bg-yellow-100 text-yellow-700';
              } else if (s.estadoVencimiento === 'vencida') {
                badgeLabel = `⛔ Vencida hace ${Math.abs(s.diffDays)} días`;
                badgeColor = 'bg-red-100 text-red-700';
              } else if (s.estadoVencimiento === 'mora') {
                badgeLabel = `🚨 En mora (${Math.abs(s.diffDays)} días)`;
                badgeColor = 'bg-red-200 text-red-800';
              } else {
                badgeLabel = '✅ Al día';
                badgeColor = 'bg-green-100 text-green-700';
              }
            } else {
              badgeLabel = '❌ Inactiva';
              badgeColor = 'bg-gray-200 text-gray-600';
            }

            return (
              <div key={s.id} className="bg-white rounded-xl shadow-md p-4 flex flex-col h-full">
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-gray-800 text-lg truncate">
                      {s.clientes?.nombre || 'Sin cliente'}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full whitespace-nowrap ${badgeColor}`}>
                      {badgeLabel}
                    </span>
                  </div>
                  <div className="space-y-1 text-sm">
                    <div><strong>Vehículo:</strong> {s.vehiculos?.marca} {s.vehiculos?.modelo} ({s.vehiculos?.placa || 'sin placa'})</div>
                    <div><strong>Precio:</strong> ${s.precio_mensual}</div>
                    <div><strong>Inicio:</strong> {formatDate(s.fecha_inicio)}</div>
                    <div><strong>Próximo pago:</strong> {formatDate(s.fecha_proximo_pago)}</div>
                  </div>
                </div>
                <div className="flex gap-2 mt-4 pt-3 border-t border-gray-100">
                  <button
                    onClick={() => handleEditar(s)}
                    className="flex-1 bg-blue-100 text-blue-700 px-3 py-1.5 rounded-lg text-sm hover:bg-blue-200 transition text-center"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => handleEliminar(s.id, s.clientes?.nombre || '')}
                    className="flex-1 bg-red-100 text-red-700 px-3 py-1.5 rounded-lg text-sm hover:bg-red-200 transition text-center"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default Suscripciones;