import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

// Obtener todos los servicios
const fetchServicios = async () => {
  const { data, error } = await supabase
    .from('servicios')
    .select('*')
    .order('nombre', { ascending: true });
  if (error) throw new Error(error.message);
  return data;
};

// Crear servicio
const crearServicio = async (nuevoServicio) => {
  const { data, error } = await supabase
    .from('servicios')
    .insert([nuevoServicio])
    .select();
  if (error) throw new Error(error.message);
  return data[0];
};

// Actualizar servicio
const actualizarServicio = async ({ id, ...datos }) => {
  const { data, error } = await supabase
    .from('servicios')
    .update(datos)
    .eq('id', id)
    .select();
  if (error) throw new Error(error.message);
  return data[0];
};

// Eliminar (desactivar) servicio
const eliminarServicio = async (id) => {
  const { error } = await supabase
    .from('servicios')
    .update({ activo: false })
    .eq('id', id);
  if (error) throw new Error(error.message);
  return id;
};

// Reactivar servicio
const reactivarServicio = async (id) => {
  const { error } = await supabase
    .from('servicios')
    .update({ activo: true })
    .eq('id', id);
  if (error) throw new Error(error.message);
  return id;
};

const Servicios = () => {
  const queryClient = useQueryClient();
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [editandoId, setEditandoId] = useState(null);

  // Estado del formulario
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [precioBase, setPrecioBase] = useState('');
  const [activo, setActivo] = useState(true);

  // Consulta
  const { data: servicios, isLoading, error } = useQuery({
    queryKey: ['servicios'],
    queryFn: fetchServicios,
  });

  // Mutaciones
  const crearMutation = useMutation({
    mutationFn: crearServicio,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['servicios'] });
      resetFormulario();
      alert('Servicio creado exitosamente');
    },
    onError: (error) => {
      alert('Error al crear servicio: ' + error.message);
    },
  });

  const actualizarMutation = useMutation({
    mutationFn: actualizarServicio,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['servicios'] });
      resetFormulario();
      alert('Servicio actualizado exitosamente');
    },
    onError: (error) => {
      alert('Error al actualizar servicio: ' + error.message);
    },
  });

  const eliminarMutation = useMutation({
    mutationFn: eliminarServicio,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['servicios'] });
      alert('Servicio desactivado');
    },
    onError: (error) => {
      alert('Error al desactivar servicio: ' + error.message);
    },
  });

  const reactivarMutation = useMutation({
    mutationFn: reactivarServicio,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['servicios'] });
      alert('Servicio reactivado');
    },
    onError: (error) => {
      alert('Error al reactivar servicio: ' + error.message);
    },
  });

  const resetFormulario = () => {
    setNombre('');
    setDescripcion('');
    setPrecioBase('');
    setActivo(true);
    setEditandoId(null);
    setMostrarFormulario(false);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!nombre.trim() || !precioBase) {
      alert('Nombre y precio son obligatorios');
      return;
    }
    const datos = {
      nombre: nombre.trim(),
      descripcion: descripcion.trim() || null,
      precio_base: parseFloat(precioBase),
      activo: activo,
    };

    if (editandoId) {
      actualizarMutation.mutate({ id: editandoId, ...datos });
    } else {
      crearMutation.mutate(datos);
    }
  };

  const handleEditar = (servicio) => {
    setEditandoId(servicio.id);
    setNombre(servicio.nombre);
    setDescripcion(servicio.descripcion || '');
    setPrecioBase(servicio.precio_base.toString());
    setActivo(servicio.activo);
    setMostrarFormulario(true);
  };

  const handleEliminar = (id, nombreServicio) => {
    if (window.confirm(`¿Desactivar el servicio "${nombreServicio}"?`)) {
      eliminarMutation.mutate(id);
    }
  };

  const handleReactivar = (id) => {
    if (window.confirm(`¿Reactivar este servicio?`)) {
      reactivarMutation.mutate(id);
    }
  };

  if (isLoading) return <div className="p-6 text-gray-600">Cargando servicios...</div>;
  if (error) return <div className="p-6 text-red-600">Error: {error.message}</div>;

  return (
    <div className="p-4 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Catálogo de Servicios</h2>
        <button
          onClick={() => {
            if (mostrarFormulario && editandoId) {
              resetFormulario();
            } else {
              setMostrarFormulario(!mostrarFormulario);
              if (!mostrarFormulario) {
                setEditandoId(null);
                setActivo(true);
              }
            }
          }}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm w-full sm:w-auto"
        >
          {mostrarFormulario ? 'Cancelar' : '+ Nuevo Servicio'}
        </button>
      </div>

      {mostrarFormulario && (
        <div className="bg-white rounded-xl shadow-md p-6 mb-6">
          <h3 className="text-lg font-semibold mb-4">
            {editandoId ? 'Editar Servicio' : 'Nuevo Servicio'}
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
              <label className="block text-sm font-medium text-gray-700 mb-1">Precio base ($) *</label>
              <input
                type="number"
                step="0.01"
                value={precioBase}
                onChange={(e) => setPrecioBase(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                required
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
              <input
                type="text"
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
            {editandoId && (
              <div className="md:col-span-2 flex items-center gap-4">
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={activo}
                    onChange={(e) => setActivo(e.target.checked)}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  Servicio activo
                </label>
              </div>
            )}
            <div className="md:col-span-2 flex justify-end">
              <button
                type="submit"
                disabled={crearMutation.isPending || actualizarMutation.isPending}
                className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg disabled:opacity-50 w-full md:w-auto"
              >
                {crearMutation.isPending || actualizarMutation.isPending
                  ? 'Guardando...'
                  : editandoId
                  ? 'Actualizar Servicio'
                  : 'Guardar Servicio'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {servicios?.length === 0 ? (
          <div className="col-span-full text-center text-gray-500 py-8">No hay servicios en el catálogo</div>
        ) : (
          servicios?.map((s) => (
            <div key={s.id} className={`bg-white rounded-xl shadow-md p-4 flex flex-col h-full ${!s.activo ? 'opacity-60' : ''}`}>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-gray-800 text-lg truncate">{s.nombre}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${s.activo ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {s.activo ? 'Activo' : 'Inactivo'}
                  </span>
                </div>
                <div className="space-y-1 text-sm">
                  <div><strong>Precio:</strong> ${s.precio_base}</div>
                  {s.descripcion && <div><strong>Descripción:</strong> {s.descripcion}</div>}
                </div>
              </div>
              <div className="flex gap-2 mt-4 pt-3 border-t border-gray-100">
                <button
                  onClick={() => handleEditar(s)}
                  className="flex-1 bg-blue-100 text-blue-700 px-3 py-1.5 rounded-lg text-sm hover:bg-blue-200 transition text-center"
                >
                  Editar
                </button>
                {s.activo ? (
                  <button
                    onClick={() => handleEliminar(s.id, s.nombre)}
                    className="flex-1 bg-red-100 text-red-700 px-3 py-1.5 rounded-lg text-sm hover:bg-red-200 transition text-center"
                  >
                    Desactivar
                  </button>
                ) : (
                  <button
                    onClick={() => handleReactivar(s.id)}
                    className="flex-1 bg-green-100 text-green-700 px-3 py-1.5 rounded-lg text-sm hover:bg-green-200 transition text-center"
                  >
                    Reactivar
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

export default Servicios;