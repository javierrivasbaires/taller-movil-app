import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

// Obtener vehículos con datos del cliente
const fetchVehiculos = async () => {
  const { data, error } = await supabase
    .from('vehiculos')
    .select(`
      *,
      clientes (nombre)
    `)
    .order('id', { ascending: false });
  if (error) throw new Error(error.message);
  return data;
};

// Obtener clientes para el select
const fetchClientes = async () => {
  const { data, error } = await supabase
    .from('clientes')
    .select('id, nombre')
    .order('nombre');
  if (error) throw new Error(error.message);
  return data;
};

// Crear vehículo
const crearVehiculo = async (nuevoVehiculo) => {
  const { data, error } = await supabase
    .from('vehiculos')
    .insert([nuevoVehiculo])
    .select();
  if (error) throw new Error(error.message);
  return data[0];
};

// Actualizar vehículo
const actualizarVehiculo = async ({ id, ...datos }) => {
  const { data, error } = await supabase
    .from('vehiculos')
    .update(datos)
    .eq('id', id)
    .select();
  if (error) throw new Error(error.message);
  return data[0];
};

// Eliminar vehículo
const eliminarVehiculo = async (id) => {
  const { error } = await supabase
    .from('vehiculos')
    .delete()
    .eq('id', id);
  if (error) throw new Error(error.message);
  return id;
};

const Vehiculos = () => {
  const queryClient = useQueryClient();
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [editandoId, setEditandoId] = useState(null);
  const [clienteId, setClienteId] = useState('');
  const [marca, setMarca] = useState('');
  const [modelo, setModelo] = useState('');
  const [anio, setAnio] = useState('');
  const [placa, setPlaca] = useState('');
  const [vin, setVin] = useState('');

  // Consultas
  const { data: vehiculos, isLoading: vehiculosLoading, error: vehiculosError } = useQuery({
    queryKey: ['vehiculos'],
    queryFn: fetchVehiculos,
  });

  const { data: clientes, isLoading: clientesLoading } = useQuery({
    queryKey: ['clientesSelect'],
    queryFn: fetchClientes,
  });

  // Mutaciones
  const crearMutation = useMutation({
    mutationFn: crearVehiculo,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehiculos'] });
      queryClient.invalidateQueries({ queryKey: ['vehiculosCount'] });
      resetFormulario();
      alert('Vehículo creado exitosamente');
    },
    onError: (error) => {
      alert('Error al crear vehículo: ' + error.message);
    },
  });

  const actualizarMutation = useMutation({
    mutationFn: actualizarVehiculo,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehiculos'] });
      resetFormulario();
      alert('Vehículo actualizado exitosamente');
    },
    onError: (error) => {
      alert('Error al actualizar vehículo: ' + error.message);
    },
  });

  const eliminarMutation = useMutation({
    mutationFn: eliminarVehiculo,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehiculos'] });
      queryClient.invalidateQueries({ queryKey: ['vehiculosCount'] });
      alert('Vehículo eliminado');
    },
    onError: (error) => {
      alert('Error al eliminar vehículo: ' + error.message);
    },
  });

  const resetFormulario = () => {
    setClienteId('');
    setMarca('');
    setModelo('');
    setAnio('');
    setPlaca('');
    setVin('');
    setEditandoId(null);
    setMostrarFormulario(false);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!clienteId || !marca.trim() || !modelo.trim()) {
      alert('Cliente, marca y modelo son obligatorios');
      return;
    }
    const datos = {
      cliente_id: parseInt(clienteId),
      marca: marca.trim(),
      modelo: modelo.trim(),
      anio: anio ? parseInt(anio) : null,
      placa: placa.trim() || null,
      vin: vin.trim() || null,
    };

    if (editandoId) {
      actualizarMutation.mutate({ id: editandoId, ...datos });
    } else {
      crearMutation.mutate(datos);
    }
  };

  const handleEditar = (vehiculo) => {
    setEditandoId(vehiculo.id);
    setClienteId(vehiculo.cliente_id.toString());
    setMarca(vehiculo.marca);
    setModelo(vehiculo.modelo);
    setAnio(vehiculo.anio?.toString() || '');
    setPlaca(vehiculo.placa || '');
    setVin(vehiculo.vin || '');
    setMostrarFormulario(true);
  };

  const handleEliminar = (id, nombreVehiculo) => {
    if (window.confirm(`¿Eliminar el vehículo "${nombreVehiculo}"?`)) {
      eliminarMutation.mutate(id);
    }
  };

  if (vehiculosLoading || clientesLoading) {
    return <div className="p-6 text-gray-600">Cargando...</div>;
  }

  if (vehiculosError) {
    return <div className="p-6 text-red-600">Error: {vehiculosError.message}</div>;
  }

  return (
    <div className="p-4 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Vehículos</h2>
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
          {mostrarFormulario ? 'Cancelar' : '+ Nuevo Vehículo'}
        </button>
      </div>

      {mostrarFormulario && (
        <div className="bg-white rounded-xl shadow-md p-6 mb-6">
          <h3 className="text-lg font-semibold mb-4">
            {editandoId ? 'Editar Vehículo' : 'Nuevo Vehículo'}
          </h3>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Cliente *</label>
              <select
                value={clienteId}
                onChange={(e) => setClienteId(e.target.value)}
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
              <label className="block text-sm font-medium text-gray-700 mb-1">Marca *</label>
              <input
                type="text"
                value={marca}
                onChange={(e) => setMarca(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Modelo *</label>
              <input
                type="text"
                value={modelo}
                onChange={(e) => setModelo(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Año</label>
              <input
                type="number"
                value={anio}
                onChange={(e) => setAnio(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Placa</label>
              <input
                type="text"
                value={placa}
                onChange={(e) => setPlaca(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">VIN</label>
              <input
                type="text"
                value={vin}
                onChange={(e) => setVin(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
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
                  ? 'Actualizar Vehículo'
                  : 'Guardar Vehículo'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Grid de tarjetas responsivo */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {vehiculos?.length === 0 ? (
          <div className="col-span-full text-center text-gray-500 py-8">No hay vehículos registrados</div>
        ) : (
          vehiculos?.map((v) => (
            <div key={v.id} className="bg-white rounded-xl shadow-md p-4 flex flex-col h-full">
              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-gray-800 text-lg truncate">
                    {v.marca} {v.modelo}
                  </span>
                </div>
                <div className="space-y-1 text-sm">
                  <div><strong>Cliente:</strong> {v.clientes?.nombre || 'Sin cliente'}</div>
                  <div><strong>Año:</strong> {v.anio || '-'}</div>
                  <div><strong>Placa:</strong> {v.placa || '-'}</div>
                  <div><strong>VIN:</strong> {v.vin || '-'}</div>
                </div>
              </div>
              <div className="flex gap-2 mt-4 pt-3 border-t border-gray-100">
                <button
                  onClick={() => handleEditar(v)}
                  className="flex-1 bg-blue-100 text-blue-700 px-3 py-1.5 rounded-lg text-sm hover:bg-blue-200 transition text-center"
                >
                  Editar
                </button>
                <button
                  onClick={() => handleEliminar(v.id, `${v.marca} ${v.modelo}`)}
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

export default Vehiculos;