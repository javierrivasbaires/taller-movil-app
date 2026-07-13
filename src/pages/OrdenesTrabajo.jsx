import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import Select from 'react-select';
import { useGeolocation } from '../hooks/useGeolocation';
import { generarEnlacesMapa } from '../utils/ubicacion';

// --- FUNCIONES DE CONSULTA ---
const fetchOrdenes = async () => {
  const { data, error } = await supabase
    .from('ordenes_trabajo')
    .select(`
      *,
      clientes (nombre, telefono, latitud, longitud),
      vehiculos (marca, modelo, placa),
      mecanico:perfiles!ordenes_trabajo_mecanico_id_fkey (nombre),
      orden_servicios (servicio_id, precio_aplicado, servicios (nombre, precio_base)),
      orden_productos (producto_id, cantidad, precio_aplicado, inventario (nombre_producto, precio_venta))
    `)
    .order('fecha_hora', { ascending: false });
  if (error) throw new Error(error.message);
  return data;
};

const fetchClientes = async () => {
  const { data, error } = await supabase
    .from('clientes')
    .select('id, nombre, latitud, longitud, direccion')
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

const fetchMecanicos = async () => {
  const { data, error } = await supabase
    .from('perfiles')
    .select('id, nombre')
    .eq('rol', 'mecanico');
  if (error) throw new Error(error.message);
  return data;
};

const fetchServicios = async () => {
  const { data, error } = await supabase
    .from('servicios')
    .select('*')
    .eq('activo', true)
    .order('nombre');
  if (error) throw new Error(error.message);
  return data;
};

const fetchProductos = async () => {
  const { data, error } = await supabase
    .from('inventario')
    .select('id, nombre_producto, precio_venta, stock')
    .gt('stock', 0);
  if (error) throw new Error(error.message);
  return data;
};

const fetchTemplates = async () => {
  const { data, error } = await supabase
    .from('checklist_templates')
    .select('id, nombre, descripcion')
    .eq('activo', true)
    .order('nombre');
  if (error) throw new Error(error.message);
  return data;
};

// --- MUTACIONES ---
const crearOrden = async ({ orden, servicios, productos }) => {
  const { data: ordenData, error: ordenError } = await supabase
    .from('ordenes_trabajo')
    .insert([orden])
    .select();
  if (ordenError) throw new Error(ordenError.message);
  const nuevaOrden = ordenData[0];

  if (servicios.length > 0) {
    const serviciosPayload = servicios.map(s => ({
      orden_trabajo_id: nuevaOrden.id,
      servicio_id: s.id,
      precio_aplicado: s.precio,
    }));
    const { error: servError } = await supabase.from('orden_servicios').insert(serviciosPayload);
    if (servError) throw new Error(servError.message);
  }

  if (productos.length > 0) {
    const productosPayload = productos.map(p => ({
      orden_trabajo_id: nuevaOrden.id,
      producto_id: p.id,
      cantidad: p.cantidad || 1,
      precio_aplicado: p.precio,
    }));
    const { error: prodError } = await supabase.from('orden_productos').insert(productosPayload);
    if (prodError) throw new Error(prodError.message);
  }

  return nuevaOrden;
};

const actualizarOrden = async ({ id, orden, servicios, productos }) => {
  const { error: ordenError } = await supabase
    .from('ordenes_trabajo')
    .update(orden)
    .eq('id', id);
  if (ordenError) throw new Error(ordenError.message);

  await supabase.from('orden_servicios').delete().eq('orden_trabajo_id', id);
  await supabase.from('orden_productos').delete().eq('orden_trabajo_id', id);

  if (servicios.length > 0) {
    const serviciosPayload = servicios.map(s => ({
      orden_trabajo_id: id,
      servicio_id: s.id,
      precio_aplicado: s.precio,
    }));
    const { error: servError } = await supabase.from('orden_servicios').insert(serviciosPayload);
    if (servError) throw new Error(servError.message);
  }

  if (productos.length > 0) {
    const productosPayload = productos.map(p => ({
      orden_trabajo_id: id,
      producto_id: p.id,
      cantidad: p.cantidad || 1,
      precio_aplicado: p.precio,
    }));
    const { error: prodError } = await supabase.from('orden_productos').insert(productosPayload);
    if (prodError) throw new Error(prodError.message);
  }

  return { id };
};

const eliminarOrden = async (id) => {
  const { error } = await supabase.from('ordenes_trabajo').delete().eq('id', id);
  if (error) throw new Error(error.message);
  return id;
};

// --- COMPONENTE ---
const OrdenesTrabajo = () => {
  const queryClient = useQueryClient();
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [editandoId, setEditandoId] = useState(null);

  // Filtros
  const [filtroEstado, setFiltroEstado] = useState('todos');
  const [filtroFecha, setFiltroFecha] = useState('todos');
  const [filtroMecanico, setFiltroMecanico] = useState('todos');

  // Estado del formulario
  const [clienteId, setClienteId] = useState('');
  const [vehiculoId, setVehiculoId] = useState('');
  const [mecanicoId, setMecanicoId] = useState('');
  const [fechaHora, setFechaHora] = useState('');
  const [tipoServicio, setTipoServicio] = useState('preventivo');
  const [estado, setEstado] = useState('agendado');
  const [kilometraje, setKilometraje] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [templateId, setTemplateId] = useState('');
  
  // Ubicación
  const [latitud, setLatitud] = useState('');
  const [longitud, setLongitud] = useState('');
  const [direccionServicio, setDireccionServicio] = useState('');

  const [serviciosSeleccionados, setServiciosSeleccionados] = useState([]);
  const [productosSeleccionados, setProductosSeleccionados] = useState([]);

  // --- Consultas ---
  const { data: ordenes, isLoading: ordenesLoading, error: ordenesError } = useQuery({
    queryKey: ['ordenes'],
    queryFn: fetchOrdenes,
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

  const { data: mecanicos, isLoading: mecanicosLoading } = useQuery({
    queryKey: ['mecanicos'],
    queryFn: fetchMecanicos,
  });

  const { data: servicios, isLoading: serviciosLoading } = useQuery({
    queryKey: ['servicios'],
    queryFn: fetchServicios,
  });

  const { data: productos, isLoading: productosLoading } = useQuery({
    queryKey: ['productosInventario'],
    queryFn: fetchProductos,
  });

  const { data: templates, isLoading: templatesLoading } = useQuery({
    queryKey: ['checklistTemplatesActivas'],
    queryFn: fetchTemplates,
  });

  // --- Mutaciones ---
  const crearMutation = useMutation({
    mutationFn: crearOrden,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ordenes'] });
      queryClient.invalidateQueries({ queryKey: ['ordenesCount'] });
      resetFormulario();
      alert('Orden creada exitosamente');
    },
    onError: (error) => alert('Error: ' + error.message),
  });

  const actualizarMutation = useMutation({
    mutationFn: actualizarOrden,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ordenes'] });
      resetFormulario();
      alert('Orden actualizada');
    },
    onError: (error) => alert('Error: ' + error.message),
  });

  const eliminarMutation = useMutation({
    mutationFn: eliminarOrden,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ordenes'] });
      queryClient.invalidateQueries({ queryKey: ['ordenesCount'] });
      alert('Orden eliminada');
    },
    onError: (error) => alert('Error: ' + error.message),
  });

  // --- Utilidades ---
  const resetFormulario = () => {
    setClienteId('');
    setVehiculoId('');
    setMecanicoId('');
    setFechaHora('');
    setTipoServicio('preventivo');
    setEstado('agendado');
    setKilometraje('');
    setObservaciones('');
    setTemplateId('');
    setLatitud('');
    setLongitud('');
    setDireccionServicio('');
    setServiciosSeleccionados([]);
    setProductosSeleccionados([]);
    setEditandoId(null);
    setMostrarFormulario(false);
  };

  const calcularTotal = () => {
    let total = 0;
    serviciosSeleccionados.forEach(s => total += parseFloat(s.precio || 0));
    productosSeleccionados.forEach(p => total += parseFloat(p.precio || 0) * (p.cantidad || 1));
    return total.toFixed(2);
  };

  const cargarUbicacionCliente = (clienteId) => {
    const cliente = clientes?.find(c => c.id === parseInt(clienteId));
    if (cliente) {
      setLatitud(cliente.latitud?.toString() || '');
      setLongitud(cliente.longitud?.toString() || '');
      setDireccionServicio(cliente.direccion || '');
    } else {
      setLatitud('');
      setLongitud('');
      setDireccionServicio('');
    }
  };

  const handleClienteChange = (e) => {
    const id = e.target.value;
    setClienteId(id);
    setVehiculoId('');
    cargarUbicacionCliente(id);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!clienteId || !vehiculoId || !mecanicoId || !fechaHora) {
      alert('Cliente, vehículo, mecánico y fecha/hora son obligatorios');
      return;
    }

    const templateIdFinal = templateId ? parseInt(templateId) : null;

    const ordenData = {
      cliente_id: parseInt(clienteId),
      vehiculo_id: parseInt(vehiculoId),
      mecanico_id: mecanicoId,
      fecha_hora: fechaHora,
      tipo_servicio: tipoServicio,
      estado: estado,
      kilometraje: kilometraje ? parseInt(kilometraje) : null,
      observaciones: observaciones.trim() || null,
      total: parseFloat(calcularTotal()),
      template_id: templateIdFinal,
      latitud: latitud ? parseFloat(latitud) : null,
      longitud: longitud ? parseFloat(longitud) : null,
      direccion_servicio: direccionServicio.trim() || null,
    };

    const serviciosPayload = serviciosSeleccionados.map(s => ({ id: s.id, precio: s.precio }));
    const productosPayload = productosSeleccionados.map(p => ({ id: p.id, precio: p.precio, cantidad: p.cantidad || 1 }));

    if (editandoId) {
      actualizarMutation.mutate({ id: editandoId, orden: ordenData, servicios: serviciosPayload, productos: productosPayload });
    } else {
      crearMutation.mutate({ orden: ordenData, servicios: serviciosPayload, productos: productosPayload });
    }
  };

  const handleEditar = (orden) => {
    setEditandoId(orden.id);
    setClienteId(orden.cliente_id.toString());
    setVehiculoId(orden.vehiculo_id.toString());
    setMecanicoId(orden.mecanico_id);
    setFechaHora(orden.fecha_hora.slice(0, 16));
    setTipoServicio(orden.tipo_servicio);
    setEstado(orden.estado);
    setKilometraje(orden.kilometraje?.toString() || '');
    setObservaciones(orden.observaciones || '');
    setTemplateId(orden.template_id?.toString() || '');
    setLatitud(orden.latitud?.toString() || '');
    setLongitud(orden.longitud?.toString() || '');
    setDireccionServicio(orden.direccion_servicio || '');

    const serviciosCargados = orden.orden_servicios?.map(os => ({
      value: os.servicio_id,
      label: os.servicios?.nombre || 'Servicio',
      id: os.servicio_id,
      precio: os.precio_aplicado,
    })) || [];
    setServiciosSeleccionados(serviciosCargados);

    const productosCargados = orden.orden_productos?.map(op => ({
      value: op.producto_id,
      label: op.inventario?.nombre_producto || 'Producto',
      id: op.producto_id,
      precio: op.precio_aplicado,
      cantidad: op.cantidad,
    })) || [];
    setProductosSeleccionados(productosCargados);

    setMostrarFormulario(true);
  };

  const handleEliminar = (id, clienteNombre) => {
    if (window.confirm(`¿Eliminar orden para "${clienteNombre}"?`)) {
      eliminarMutation.mutate(id);
    }
  };

  const formatDate = (date) => {
    if (!date) return '-';
    const d = new Date(date);
    return d.toLocaleString('es-SV');
  };

  // --- LÓGICA DE FILTRADO ---
  const ordenesFiltradas = React.useMemo(() => {
    if (!ordenes) return [];

    let filtradas = ordenes;

    if (filtroEstado !== 'todos') {
      filtradas = filtradas.filter(o => o.estado === filtroEstado);
    }

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

    if (filtroMecanico !== 'todos') {
      filtradas = filtradas.filter(o => o.mecanico_id === filtroMecanico);
    }

    return filtradas;
  }, [ordenes, filtroEstado, filtroFecha, filtroMecanico]);

  // Preparar opciones para react-select
  const serviciosOptions = servicios?.map(s => ({
    value: s.id,
    label: `${s.nombre} ($${s.precio_base})`,
    id: s.id,
    precio: s.precio_base,
  })) || [];

  const productosOptions = productos?.map(p => ({
    value: p.id,
    label: `${p.nombre_producto} ($${p.precio_venta} | stock: ${p.stock})`,
    id: p.id,
    precio: p.precio_venta,
    stock: p.stock,
  })) || [];

  const templatesOptions = templates?.map(t => ({
    value: t.id,
    label: `${t.nombre} (${t.descripcion || 'sin descripción'})`,
  })) || [];

  const mecanicosOptions = mecanicos?.map(m => ({
    value: m.id,
    label: m.nombre,
  })) || [];

  if (ordenesLoading || clientesLoading || mecanicosLoading || serviciosLoading || templatesLoading) {
    return <div className="p-6 text-gray-600">Cargando...</div>;
  }

  if (ordenesError) {
    return <div className="p-6 text-red-600">Error: {ordenesError.message}</div>;
  }

  return (
    <div className="p-4 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Órdenes de Trabajo</h2>
        <button
          onClick={() => {
            if (mostrarFormulario && editandoId) {
              resetFormulario();
            } else {
              setMostrarFormulario(!mostrarFormulario);
              if (!mostrarFormulario) {
                setEditandoId(null);
                setFechaHora(new Date().toISOString().slice(0, 16));
              }
            }
          }}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm w-full sm:w-auto"
        >
          {mostrarFormulario ? 'Cancelar' : '+ Nueva Orden'}
        </button>
      </div>

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
            <option value="todos">Todos</option>
            <option value="hoy">Hoy</option>
            <option value="semana">Esta semana</option>
            <option value="mes">Este mes</option>
          </select>
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700 mr-2">Mecánico:</label>
          <select
            value={filtroMecanico}
            onChange={(e) => setFiltroMecanico(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
          >
            <option value="todos">Todos</option>
            {mecanicosOptions.map((m) => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
        </div>
        <div className="text-sm text-gray-500 ml-auto">
          {ordenesFiltradas.length} órdenes encontradas
        </div>
      </div>

      {mostrarFormulario && (
        <div className="bg-white rounded-xl shadow-md p-6 mb-6">
          <h3 className="text-lg font-semibold mb-4">
            {editandoId ? 'Editar Orden' : 'Nueva Orden de Trabajo'}
          </h3>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Campos básicos */}
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
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mecánico *</label>
              <select
                value={mecanicoId}
                onChange={(e) => setMecanicoId(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                required
              >
                <option value="">Seleccionar mecánico</option>
                {mecanicos?.map((m) => (
                  <option key={m.id} value={m.id}>{m.nombre}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fecha y hora *</label>
              <input
                type="datetime-local"
                value={fechaHora}
                onChange={(e) => setFechaHora(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de servicio</label>
              <select
                value={tipoServicio}
                onChange={(e) => setTipoServicio(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                <option value="preventivo">Preventivo</option>
                <option value="correctivo">Correctivo</option>
                <option value="diagnostico">Diagnóstico</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
              <select
                value={estado}
                onChange={(e) => setEstado(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                <option value="agendado">Agendado</option>
                <option value="en_proceso">En proceso</option>
                <option value="completado">Completado</option>
                <option value="facturado">Facturado</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Kilometraje</label>
              <input
                type="number"
                value={kilometraje}
                onChange={(e) => setKilometraje(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Observaciones</label>
              <textarea
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
                rows="2"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            {/* Ubicación geográfica */}
            <div className="md:col-span-2 border-t pt-4 mt-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">📍 Ubicación del servicio</label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Dirección (texto)</label>
                  <input
                    type="text"
                    value={direccionServicio}
                    onChange={(e) => setDireccionServicio(e.target.value)}
                    placeholder="Dirección donde se realizará el servicio"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Latitud</label>
                    <input
                      type="number"
                      step="any"
                      value={latitud}
                      onChange={(e) => setLatitud(e.target.value)}
                      placeholder="Ej: 13.6919"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Longitud</label>
                    <input
                      type="number"
                      step="any"
                      value={longitud}
                      onChange={(e) => setLongitud(e.target.value)}
                      placeholder="Ej: -89.2182"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (clienteId) {
                    cargarUbicacionCliente(clienteId);
                    alert('Ubicación del cliente cargada');
                  } else {
                    alert('Primero selecciona un cliente');
                  }
                }}
                className="mt-2 bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-1 rounded text-sm"
              >
                📍 Usar ubicación del cliente
              </button>
            </div>

            {/* Selector de plantilla (opcional) */}
            <div className="md:col-span-2 border-t pt-4 mt-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Plantilla de checklist (opcional)</label>
              <select
                value={templateId}
                onChange={(e) => setTemplateId(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                <option value="">Sin plantilla</option>
                {templatesOptions.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>

            {/* Servicios y productos */}
            <div className="md:col-span-2 border-t pt-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Servicios realizados</label>
              <Select
                isMulti
                options={serviciosOptions}
                value={serviciosSeleccionados}
                onChange={(selected) => setServiciosSeleccionados(selected || [])}
                placeholder="Buscar y seleccionar servicios..."
                className="text-sm"
                classNamePrefix="react-select"
                getOptionLabel={(option) => option.label}
                getOptionValue={(option) => option.value}
                noOptionsMessage={() => 'No hay servicios disponibles'}
                isClearable={false}
              />
            </div>

            <div className="md:col-span-2 border-t pt-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Productos usados (venta cruzada)</label>
              <Select
                isMulti
                options={productosOptions}
                value={productosSeleccionados}
                onChange={(selected) => setProductosSeleccionados(selected || [])}
                placeholder="Buscar y seleccionar productos..."
                className="text-sm"
                classNamePrefix="react-select"
                getOptionLabel={(option) => option.label}
                getOptionValue={(option) => option.value}
                noOptionsMessage={() => 'No hay productos en inventario'}
                isClearable={false}
              />
            </div>

            {/* Total */}
            <div className="md:col-span-2">
              <div className="bg-gray-50 p-3 rounded-lg">
                <span className="font-semibold text-gray-700">Total: </span>
                <span className="text-xl font-bold text-green-600">${calcularTotal()}</span>
              </div>
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
                  ? 'Actualizar Orden'
                  : 'Guardar Orden'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Listado de órdenes filtradas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {ordenesFiltradas.length === 0 ? (
          <div className="col-span-full text-center text-gray-500 py-8">No hay órdenes que coincidan con los filtros.</div>
        ) : (
          ordenesFiltradas.map((o) => (
            <div key={o.id} className="bg-white rounded-xl shadow-md p-4 flex flex-col h-full">
              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-gray-800 text-lg truncate">
                    {o.clientes?.nombre || 'Sin cliente'}
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    o.estado === 'completado' ? 'bg-green-100 text-green-700' :
                    o.estado === 'en_proceso' ? 'bg-yellow-100 text-yellow-700' :
                    o.estado === 'facturado' ? 'bg-blue-100 text-blue-700' :
                    'bg-gray-100 text-gray-700'
                  }`}>
                    {o.estado}
                  </span>
                </div>
                <div className="space-y-1 text-sm">
                  <div><strong>Vehículo:</strong> {o.vehiculos?.marca} {o.vehiculos?.modelo} ({o.vehiculos?.placa || 'sin placa'})</div>
                  <div><strong>Mecánico:</strong> {o.mecanico?.nombre || '-'}</div>
                  <div><strong>Fecha:</strong> {formatDate(o.fecha_hora)}</div>
                  <div><strong>Plantilla:</strong> {templates?.find(t => t.id === o.template_id)?.nombre || 'Sin plantilla'}</div>
                  <div><strong>Total:</strong> ${o.total}</div>
                  {o.direccion_servicio && (
                    <div className="text-xs text-gray-500 truncate">📍 {o.direccion_servicio}</div>
                  )}
                </div>
              </div>
              <div className="flex gap-2 mt-4 pt-3 border-t border-gray-100">
                <button
                  onClick={() => handleEditar(o)}
                  className="flex-1 bg-blue-100 text-blue-700 px-3 py-1.5 rounded-lg text-sm hover:bg-blue-200 transition text-center"
                >
                  Editar
                </button>
                <button
                  onClick={() => handleEliminar(o.id, o.clientes?.nombre || '')}
                  className="flex-1 bg-red-100 text-red-700 px-3 py-1.5 rounded-lg text-sm hover:bg-red-200 transition text-center"
                >
                  Eliminar
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default OrdenesTrabajo;