import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

// Obtener todos los empleados (perfiles con rol admin o mecanico)
const fetchEmpleados = async () => {
  const { data, error } = await supabase
    .from('perfiles')
    .select('*')
    .in('rol', ['admin', 'mecanico'])
    .order('nombre', { ascending: true });
  if (error) throw new Error(error.message);
  return data;
};

// Crear un nuevo empleado (usuario Auth + perfil)
const crearEmpleado = async ({ email, password, nombre, rol }) => {
  // 1. Crear usuario en Auth
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
  });
  if (authError) throw new Error(authError.message);
  if (!authData.user) throw new Error('No se pudo crear el usuario');

  // 2. Insertar perfil en la tabla perfiles
  const { error: perfilError } = await supabase
    .from('perfiles')
    .insert({
      id: authData.user.id,
      email: email,
      nombre: nombre,
      rol: rol,
      activo: true,
    });
  if (perfilError) throw new Error(perfilError.message);

  return authData.user;
};

// Actualizar empleado (solo perfil, no contraseña)
const actualizarEmpleado = async ({ id, nombre, rol, activo }) => {
  const { data, error } = await supabase
    .from('perfiles')
    .update({ nombre, rol, activo })
    .eq('id', id)
    .select();
  if (error) throw new Error(error.message);
  return data[0];
};

// Eliminar (desactivar) empleado - lo desactivamos en lugar de borrar
const desactivarEmpleado = async (id) => {
  const { error } = await supabase
    .from('perfiles')
    .update({ activo: false })
    .eq('id', id);
  if (error) throw new Error(error.message);
  return id;
};

// Reactivar empleado
const reactivarEmpleado = async (id) => {
  const { error } = await supabase
    .from('perfiles')
    .update({ activo: true })
    .eq('id', id);
  if (error) throw new Error(error.message);
  return id;
};

const Empleados = () => {
  const queryClient = useQueryClient();
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [editandoId, setEditandoId] = useState(null);

  // Estado del formulario
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nombre, setNombre] = useState('');
  const [rol, setRol] = useState('mecanico');
  const [activo, setActivo] = useState(true);

  // Consulta
  const { data: empleados, isLoading, error } = useQuery({
    queryKey: ['empleados'],
    queryFn: fetchEmpleados,
  });

  // Mutaciones
  const crearMutation = useMutation({
    mutationFn: crearEmpleado,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['empleados'] });
      // También invalidamos la lista de mecánicos usada en Órdenes de Trabajo
      queryClient.invalidateQueries({ queryKey: ['mecanicos'] });
      resetFormulario();
      alert('Empleado creado exitosamente. Se ha enviado un correo de confirmación al nuevo usuario.');
    },
    onError: (error) => {
      alert('Error al crear empleado: ' + error.message);
    },
  });

  const actualizarMutation = useMutation({
    mutationFn: actualizarEmpleado,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['empleados'] });
      queryClient.invalidateQueries({ queryKey: ['mecanicos'] });
      resetFormulario();
      alert('Empleado actualizado exitosamente');
    },
    onError: (error) => {
      alert('Error al actualizar empleado: ' + error.message);
    },
  });

  const desactivarMutation = useMutation({
    mutationFn: desactivarEmpleado,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['empleados'] });
      queryClient.invalidateQueries({ queryKey: ['mecanicos'] });
      alert('Empleado desactivado');
    },
    onError: (error) => {
      alert('Error al desactivar empleado: ' + error.message);
    },
  });

  const reactivarMutation = useMutation({
    mutationFn: reactivarEmpleado,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['empleados'] });
      queryClient.invalidateQueries({ queryKey: ['mecanicos'] });
      alert('Empleado reactivado');
    },
    onError: (error) => {
      alert('Error al reactivar empleado: ' + error.message);
    },
  });

  const resetFormulario = () => {
    setEmail('');
    setPassword('');
    setNombre('');
    setRol('mecanico');
    setActivo(true);
    setEditandoId(null);
    setMostrarFormulario(false);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editandoId) {
      // Editar empleado existente (no se puede cambiar email ni password aquí)
      actualizarMutation.mutate({ id: editandoId, nombre, rol, activo });
    } else {
      // Crear nuevo empleado
      if (!email || !password || !nombre) {
        alert('Email, contraseña y nombre son obligatorios');
        return;
      }
      crearMutation.mutate({ email, password, nombre, rol });
    }
  };

  const handleEditar = (empleado) => {
    setEditandoId(empleado.id);
    setNombre(empleado.nombre);
    setRol(empleado.rol);
    setActivo(empleado.activo);
    setEmail(empleado.email || ''); // Solo para mostrar, no editable en edición
    setPassword(''); // No se puede cambiar la contraseña desde aquí
    setMostrarFormulario(true);
  };

  const handleDesactivar = (id, nombreEmpleado) => {
    if (window.confirm(`¿Desactivar al empleado "${nombreEmpleado}"?`)) {
      desactivarMutation.mutate(id);
    }
  };

  const handleReactivar = (id) => {
    if (window.confirm(`¿Reactivar a este empleado?`)) {
      reactivarMutation.mutate(id);
    }
  };

  if (isLoading) return <div className="p-6 text-gray-600">Cargando empleados...</div>;
  if (error) return <div className="p-6 text-red-600">Error: {error.message}</div>;

  return (
    <div className="p-4 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Empleados</h2>
        <button
          onClick={() => {
            if (mostrarFormulario && editandoId) {
              resetFormulario();
            } else {
              setMostrarFormulario(!mostrarFormulario);
              if (!mostrarFormulario) {
                setEditandoId(null);
                setEmail('');
                setPassword('');
                setNombre('');
                setRol('mecanico');
                setActivo(true);
              }
            }
          }}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm w-full sm:w-auto"
        >
          {mostrarFormulario ? 'Cancelar' : '+ Nuevo Empleado'}
        </button>
      </div>

      {mostrarFormulario && (
        <div className="bg-white rounded-xl shadow-md p-6 mb-6">
          <h3 className="text-lg font-semibold mb-4">
            {editandoId ? 'Editar Empleado' : 'Nuevo Empleado'}
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
              <label className="block text-sm font-medium text-gray-700 mb-1">Rol</label>
              <select
                value={rol}
                onChange={(e) => setRol(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                <option value="mecanico">Mecánico</option>
                <option value="admin">Administrador</option>
              </select>
            </div>
            {!editandoId ? (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña *</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    required
                  />
                </div>
              </>
            ) : (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email (no editable)</label>
                  <input
                    type="email"
                    value={email}
                    disabled
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-gray-100 text-gray-500 cursor-not-allowed"
                  />
                  <p className="text-xs text-gray-500 mt-1">Para cambiar el email, usa el panel de Supabase.</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
                  <select
                    value={activo ? 'true' : 'false'}
                    onChange={(e) => setActivo(e.target.value === 'true')}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    <option value="true">Activo</option>
                    <option value="false">Inactivo</option>
                  </select>
                </div>
              </>
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
                  ? 'Actualizar Empleado'
                  : 'Guardar Empleado'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Lista de empleados en tarjetas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {empleados?.length === 0 ? (
          <div className="col-span-full text-center text-gray-500 py-8">No hay empleados registrados</div>
        ) : (
          empleados?.map((e) => (
            <div key={e.id} className={`bg-white rounded-xl shadow-md p-4 flex flex-col h-full ${!e.activo ? 'opacity-60' : ''}`}>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-gray-800 text-lg truncate">{e.nombre}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    e.rol === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                  }`}>
                    {e.rol === 'admin' ? 'Admin' : 'Mecánico'}
                  </span>
                </div>
                <div className="space-y-1 text-sm">
                  <div><strong>Email:</strong> {e.email || 'Sin email'}</div>
                  <div><strong>Estado:</strong> {e.activo ? '✅ Activo' : '❌ Inactivo'}</div>
                </div>
              </div>
              <div className="flex gap-2 mt-4 pt-3 border-t border-gray-100 flex-wrap">
                <button
                  onClick={() => handleEditar(e)}
                  className="flex-1 bg-blue-100 text-blue-700 px-3 py-1.5 rounded-lg text-sm hover:bg-blue-200 transition text-center"
                >
                  Editar
                </button>
                {e.activo ? (
                  <button
                    onClick={() => handleDesactivar(e.id, e.nombre)}
                    className="flex-1 bg-red-100 text-red-700 px-3 py-1.5 rounded-lg text-sm hover:bg-red-200 transition text-center"
                  >
                    Desactivar
                  </button>
                ) : (
                  <button
                    onClick={() => handleReactivar(e.id)}
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

export default Empleados;