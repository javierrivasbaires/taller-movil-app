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

  const { data: clientes, isLoading, error } = useQuery({
    queryKey: ['clientes'],
    queryFn: fetchClientes,
  });

  const crearMutation = useMutation({
    mutationFn: crearCliente,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clientes'] });
      resetFormulario();
      alert('Cliente creado con enlace de portal generado');
    },
    onError: (error) => alert('Error: ' + error.message),
  });

  const actualizarMutation = useMutation({
    mutationFn: actualizarCliente,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clientes'] });
      resetFormulario();
      alert('Cliente actualizado');
    },
    onError: (error) => alert('Error: ' + error.message),
  });

  const eliminarMutation = useMutation({
    mutationFn: eliminarCliente,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clientes'] });
      alert('Cliente eliminado');
    },
    onError: (error) => alert('Error: ' + error.message),
  });

  const regenerarTokenMutation = useMutation({
    mutationFn: regenerarToken,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clientes'] });
      alert('Token regenerado y enlace actualizado');
    },
    onError: (error) => alert('Error: ' + error.message),
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
      alert('El nombre es obligatorio');
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
      alert('Ubicación capturada correctamente');
    } else if (locationError) {
      alert('Error al capturar ubicación: ' + locationError);
    } else {
      refreshLocation();
      alert('Intentando capturar ubicación...');
    }
  };

  if (isLoading) return <div className="p-6 text-gray-600">Cargando clientes...</div>;
  if (error) return <div className="p-6 text-red-600">Error: {error.message}</div>;

  const portalBaseUrl = window.location.origin + '/portal';

  return (
    <div className="p-4 max-w-7xl mx-auto">
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
                <option value="otro">Otro</option>
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

      {/* Tabla de clientes */}
      <div className="bg-white rounded-xl shadow-md overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-2 md:px-6 md:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nombre</th>
              <th className="px-3 py-2 md:px-6 md:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Teléfono</th>
              <th className="px-3 py-2 md:px-6 md:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">Correo</th>
              <th className="px-3 py-2 md:px-6 md:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Enlace portal</th>
              <th className="px-3 py-2 md:px-6 md:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden xl:table-cell">Expira</th>
              <th className="px-3 py-2 md:px-6 md:py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {clientes?.length === 0 ? (
              <tr>
                <td colSpan="6" className="px-6 py-4 text-center text-gray-500">No hay clientes registrados</td>
              </tr>
            ) : (
              clientes?.map((cliente) => (
                <tr key={cliente.id} className="hover:bg-gray-50">
                  <td className="px-3 py-2 md:px-6 md:py-4 whitespace-nowrap font-medium text-gray-900">{cliente.nombre}</td>
                  <td className="px-3 py-2 md:px-6 md:py-4 whitespace-nowrap text-gray-600">{cliente.telefono || '-'}</td>
                  <td className="px-3 py-2 md:px-6 md:py-4 whitespace-nowrap text-gray-600 hidden sm:table-cell">{cliente.email || '-'}</td>
                  <td className="px-3 py-2 md:px-6 md:py-4 whitespace-nowrap text-blue-600 text-sm">
                    {cliente.token_portal ? (
                      <button
                        onClick={() => {
                          const url = `${portalBaseUrl}?token=${cliente.token_portal}`;
                          navigator.clipboard?.writeText(url);
                          alert('Enlace copiado al portapapeles');
                        }}
                        className="bg-blue-100 hover:bg-blue-200 text-blue-700 px-2 py-1 rounded text-xs whitespace-nowrap"
                      >
                        📋 Copiar enlace
                      </button>
                    ) : (
                      <span className="text-gray-400">Sin enlace</span>
                    )}
                  </td>
                  <td className="px-3 py-2 md:px-6 md:py-4 whitespace-nowrap text-sm text-gray-600 hidden xl:table-cell">
                    {cliente.token_expiracion ? (
                      new Date(cliente.token_expiracion).toLocaleDateString('es-SV')
                    ) : '-'}
                  </td>
                  <td className="px-3 py-2 md:px-6 md:py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => handleEditar(cliente)}
                      className="text-blue-600 hover:text-blue-900 mr-2"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => handleEliminar(cliente.id, cliente.nombre)}
                      className="text-red-600 hover:text-red-900 mr-2"
                    >
                      Eliminar
                    </button>
                    {cliente.token_portal && (
                      <button
                        onClick={() => handleRegenerarToken(cliente.id)}
                        className="text-amber-600 hover:text-amber-900"
                      >
                        Regenerar enlace
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Clientes;