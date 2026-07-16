import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useGeolocation } from '../hooks/useGeolocation';

// --- FUNCIONES DE CONSULTA ---
const fetchClientes = async () => {
  const { data, error } = await supabase
    .from('clientes')
    .select('*')
    .order('nombre', { ascending: true });
  if (error) throw new Error(error.message);
  return data;
};

const crearCliente = async (nuevoCliente) => {
  const token = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2) + Date.now().toString(36);
  const expiracion = new Date();
  expiracion.setMonth(expiracion.getMonth() + 1);

  const clienteConToken = {
    ...nuevoCliente,
    token_portal: token,
    token_expiracion: expiracion.toISOString(),
  };

  const { data, error } = await supabase
    .from('clientes')
    .insert([clienteConToken])
    .select();
  if (error) throw new Error(error.message);
  return data[0];
};

const actualizarCliente = async ({ id, ...datos }) => {
  const { data, error } = await supabase
    .from('clientes')
    .update(datos)
    .eq('id', id)
    .select();
  if (error) throw new Error(error.message);
  return data[0];
};

const eliminarCliente = async (id) => {
  const { error } = await supabase
    .from('clientes')
    .delete()
    .eq('id', id);
  if (error) throw new Error(error.message);
  return id;
};

const regenerarToken = async (id) => {
  const token = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2) + Date.now().toString(36);
  const expiracion = new Date();
  expiracion.setMonth(expiracion.getMonth() + 1);

  const { data, error } = await supabase
    .from('clientes')
    .update({ token_portal: token, token_expiracion: expiracion.toISOString() })
    .eq('id', id)
    .select();
  if (error) throw new Error(error.message);
  return data[0];
};

// --- COMPONENTE ---
const Clientes = () => {
  const queryClient = useQueryClient();
  const { location, loading: locationLoading, error: locationError, refreshLocation } = useGeolocation();

  // Estado para toast
  const [toast, setToast] = useState({ message: '', type: '', visible: false });

  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [editandoId, setEditandoId] = useState(null);

  const [nombre, setNombre] = useState('');
  const [telefono, setTelefono] = useState('');
  const [email, setEmail] = useState('');
  const [direccion, setDireccion] = useState('');
  const [tipo, setTipo] = useState('particular');
  const [dui, setDui] = useState('');
  const [genero, setGenero] = useState('masculino');
  const [latitud, setLatitud] = useState('');
  const [longitud, setLongitud] = useState('');

  // Función para mostrar toast
  const showToast = (message, type = 'success') => {
    setToast({ message, type, visible: true });
    setTimeout(() => {
      setToast({ message: '', type: '', visible: false });
    }, 3000);
  };

  const { data: clientes, isLoading, error } = useQuery({
    queryKey: ['clientes'],
    queryFn: fetchClientes,
  });

  const crearMutation = useMutation({
    mutationFn: crearCliente,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clientes'] });
      resetFormulario();
      showToast('Cliente creado con enlace de portal generado', 'success');
    },
    onError: (error) => {
      showToast('Error al crear cliente: ' + error.message, 'error');
    },
  });

  const actualizarMutation = useMutation({
    mutationFn: actualizarCliente,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clientes'] });
      resetFormulario();
      showToast('Cliente actualizado correctamente', 'success');
    },
    onError: (error) => {
      showToast('Error al actualizar cliente: ' + error.message, 'error');
    },
  });

  const eliminarMutation = useMutation({
    mutationFn: eliminarCliente,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clientes'] });
      showToast('Cliente eliminado', 'success');
    },
    onError: (error) => {
      showToast('Error al eliminar cliente: ' + error.message, 'error');
    },
  });

  const regenerarTokenMutation = useMutation({
    mutationFn: regenerarToken,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clientes'] });
      showToast('Token regenerado y enlace actualizado', 'success');
    },
    onError: (error) => {
      showToast('Error al regenerar token: ' + error.message, 'error');
    },
  });

  const resetFormulario = () => {
    setNombre('');
    setTelefono('');
    setEmail('');
    setDireccion('');
    setTipo('particular');
    setDui('');
    setGenero('masculino');
    setLatitud('');
    setLongitud('');
    setEditandoId(null);
    setMostrarFormulario(false);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!nombre.trim()) {
      showToast('El nombre es obligatorio', 'error');
      return;
    }
    const datos = {
      nombre,
      telefono: telefono || null,
      email: email || null,
      direccion: direccion || null,
      tipo,
      dui: dui || null,
      genero: genero || null,
      latitud: latitud ? parseFloat(latitud) : null,
      longitud: longitud ? parseFloat(longitud) : null,
    };

    if (editandoId) {
      actualizarMutation.mutate({ id: editandoId, ...datos });
    } else {
      crearMutation.mutate(datos);
    }
  };

  const handleEditar = (cliente) => {
    setEditandoId(cliente.id);
    setNombre(cliente.nombre);
    setTelefono(cliente.telefono || '');
    setEmail(cliente.email || '');
    setDireccion(cliente.direccion || '');
    setTipo(cliente.tipo || 'particular');
    setDui(cliente.dui || '');
    setGenero(cliente.genero || 'masculino');
    setLatitud(cliente.latitud?.toString() || '');
    setLongitud(cliente.longitud?.toString() || '');
    setMostrarFormulario(true);
  };

  const handleEliminar = (id, nombreCliente) => {
    if (window.confirm(`¿Eliminar al cliente "${nombreCliente}"?`)) {
      eliminarMutation.mutate(id);
    }
  };

  const handleRegenerarToken = (id) => {
    if (window.confirm('¿Regenerar el enlace del portal? El enlace anterior dejará de funcionar.')) {
      regenerarTokenMutation.mutate(id);
    }
  };

  const handleUsarUbicacion = () => {
    if (location) {
      setLatitud(location.lat.toString());
      setLongitud(location.lng.toString());
      showToast('Ubicación capturada correctamente', 'success');
    } else if (locationError) {
      showToast('Error al capturar ubicación: ' + locationError, 'error');
    } else {
      refreshLocation();
      showToast('Intentando capturar ubicación...', 'success');
    }
  };

  if (isLoading) return <div className="p-6 text-gray-600">Cargando clientes...</div>;
  if (error) return <div className="p-6 text-red-600">Error: {error.message}</div>;

  const portalBaseUrl = window.location.origin + '/portal';

  // Estilos para el toast
  const toastStyles = {
    success: 'bg-green-100 border-green-500 text-green-700',
    error: 'bg-red-100 border-red-500 text-red-700',
  };

  return (
    <div className="p-4 max-w-7xl mx-auto">
      {/* Toast (notificación temporal) */}
      {toast.visible && (
        <div className={`fixed top-4 right-4 z-50 p-4 rounded-lg border-l-4 shadow-lg max-w-md ${toastStyles[toast.type]}`}>
          <p>{toast.message}</p>
        </div>
      )}

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Clientes</h2>
        <button
          onClick={() => {
            if (mostrarFormulario && editandoId) {
              resetFormulario();
            } else {
              setMostrarFormulario(!mostrarFormulario);
              if (!mostrarFormulario) setEditandoId(null);
            }
          }}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm w-full sm:w-auto"
        >
          {mostrarFormulario ? 'Cancelar' : '+ Nuevo Cliente'}
        </button>
      </div>

      {mostrarFormulario && (
        <div className="bg-white rounded-xl shadow-md p-6 mb-8">
          <h3 className="text-lg font-semibold mb-4">
            {editandoId ? 'Editar Cliente' : 'Nuevo Cliente'}
          </h3>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
              <input
                type="text"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
              <input
                type="text"
                value={telefono}
                onChange={(e) => setTelefono(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Correo</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Dirección</label>
              <input
                type="text"
                value={direccion}
                onChange={(e) => setDireccion(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
              <select
                value={tipo}
                onChange={(e) => setTipo(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                <option value="particular">Particular</option>
                <option value="empresa">Empresa</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">DUI</label>
              <input
                type="text"
                value={dui}
                onChange={(e) => setDui(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Género</label>
              <select
                value={genero}
                onChange={(e) => setGenero(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                <option value="masculino">Masculino</option>
                <option value="femenino">Femenino</option>
                <option value="empresa">Empresa</option>
              </select>
            </div>
            
            {/* Ubicación geográfica */}
            <div className="md:col-span-2 border-t pt-4 mt-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Ubicación geográfica (para mapas)</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
              <button
                type="button"
                onClick={handleUsarUbicacion}
                className="mt-2 bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-1 rounded text-sm"
                disabled={locationLoading}
              >
                {locationLoading ? 'Obteniendo ubicación...' : '📍 Usar mi ubicación actual'}
              </button>
              {locationError && (
                <p className="text-xs text-red-500 mt-1">Error: {locationError}</p>
              )}
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
                  ? 'Actualizar Cliente'
                  : 'Guardar Cliente'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Lista de clientes en tarjetas (grid responsivo) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {clientes?.length === 0 ? (
          <div className="col-span-full text-center text-gray-500 py-8">No hay clientes registrados</div>
        ) : (
          clientes?.map((cliente) => (
            <div key={cliente.id} className="bg-white rounded-xl shadow-md p-4 flex flex-col h-full">
              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-gray-800 text-lg truncate">{cliente.nombre}</span>
                  <span className="text-xs bg-gray-100 px-2 py-0.5 rounded-full text-gray-600 whitespace-nowrap ml-2">
                    {cliente.tipo === 'empresa' ? 'Empresa' : 'Particular'}
                  </span>
                </div>
                <div className="space-y-1 text-sm">
                  <div><strong>Teléfono:</strong> {cliente.telefono || '-'}</div>
                  <div><strong>Correo:</strong> {cliente.email || '-'}</div>
                  <div><strong>Dirección:</strong> {cliente.direccion || '-'}</div>
                  <div><strong>DUI:</strong> {cliente.dui || '-'}</div>
                  <div><strong>Género:</strong> {cliente.genero || '-'}</div>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 mt-4 pt-3 border-t border-gray-100">
                <button
                  onClick={() => handleEditar(cliente)}
                  className="flex-1 bg-blue-100 text-blue-700 px-3 py-1.5 rounded-lg text-sm hover:bg-blue-200 transition text-center"
                >
                  Editar
                </button>
                <button
                  onClick={() => handleEliminar(cliente.id, cliente.nombre)}
                  className="flex-1 bg-red-100 text-red-700 px-3 py-1.5 rounded-lg text-sm hover:bg-red-200 transition text-center"
                >
                  Eliminar
                </button>
                {cliente.token_portal && (
                  <button
                    onClick={() => {
                      const url = `${portalBaseUrl}?token=${cliente.token_portal}`;
                      navigator.clipboard?.writeText(url);
                      showToast('Enlace copiado al portapapeles', 'success');
                    }}
                    className="w-full mt-1 bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1 rounded-lg text-xs transition text-center"
                  >
                    📋 Copiar enlace portal
                  </button>
                )}
                {cliente.token_portal && (
                  <button
                    onClick={() => handleRegenerarToken(cliente.id)}
                    className="w-full mt-1 bg-amber-100 hover:bg-amber-200 text-amber-700 px-3 py-1 rounded-lg text-xs transition text-center"
                  >
                    🔄 Regenerar enlace
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Clientes;