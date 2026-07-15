import React, { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

// --- FUNCIONES DE CONSULTA ---
const fetchEmpleados = async () => {
  const { data, error } = await supabase
    .from('perfiles')
    .select('*')
    .in('rol', ['admin', 'mecanico'])
    .order('nombre', { ascending: true });
  if (error) throw new Error(error.message);
  return data;
};

// --- MUTACIONES ---
const crearEmpleado = async ({ email, password, nombre, rol, ...datos }) => {
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
  });
  if (authError) throw new Error(authError.message);
  if (!authData.user) throw new Error('No se pudo crear el usuario');

  const perfilData = {
    id: authData.user.id,
    email: email,
    nombre: nombre,
    rol: rol,
    telefono: datos.telefono_movil || null,
    activo: true,
    dui: datos.dui || null,
    telefono_movil: datos.telefono_movil || null,
    correo_personal: datos.correo_personal || null,
    banco: datos.banco || null,
    tipo_cuenta: datos.tipo_cuenta || null,
    numero_cuenta: datos.numero_cuenta || null,
    direccion_residencia: datos.direccion_residencia || null,
    imagen_dui: datos.imagen_dui || null,
  };

  const { error: perfilError } = await supabase
    .from('perfiles')
    .insert(perfilData);
  if (perfilError) throw new Error(perfilError.message);

  return authData.user;
};

const actualizarEmpleado = async ({ id, ...datos }) => {
  const perfilData = {
    nombre: datos.nombre,
    rol: datos.rol,
    activo: datos.activo,
    telefono: datos.telefono_movil || null,
    dui: datos.dui || null,
    telefono_movil: datos.telefono_movil || null,
    correo_personal: datos.correo_personal || null,
    banco: datos.banco || null,
    tipo_cuenta: datos.tipo_cuenta || null,
    numero_cuenta: datos.numero_cuenta || null,
    direccion_residencia: datos.direccion_residencia || null,
    imagen_dui: datos.imagen_dui || null,
  };

  const { data, error } = await supabase
    .from('perfiles')
    .update(perfilData)
    .eq('id', id)
    .select();
  if (error) throw new Error(error.message);
  return data[0];
};

const desactivarEmpleado = async (id) => {
  const { error } = await supabase
    .from('perfiles')
    .update({ activo: false })
    .eq('id', id);
  if (error) throw new Error(error.message);
  return id;
};

const reactivarEmpleado = async (id) => {
  const { error } = await supabase
    .from('perfiles')
    .update({ activo: true })
    .eq('id', id);
  if (error) throw new Error(error.message);
  return id;
};

// --- COMPONENTE ---
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
  const [dui, setDui] = useState('');
  const [telefonoMovil, setTelefonoMovil] = useState('');
  const [correoPersonal, setCorreoPersonal] = useState('');
  const [banco, setBanco] = useState('');
  const [tipoCuenta, setTipoCuenta] = useState('');
  const [numeroCuenta, setNumeroCuenta] = useState('');
  const [direccionResidencia, setDireccionResidencia] = useState('');
  const [imagenDui, setImagenDui] = useState('');
  const [uploading, setUploading] = useState(false);

  // Estado para el toast
  const [toast, setToast] = useState({ message: '', type: '', visible: false });

  const formRef = useRef(null);
  const nombreInputRef = useRef(null);

  const { data: empleados, isLoading, error } = useQuery({
    queryKey: ['empleados'],
    queryFn: fetchEmpleados,
  });

  const showToast = (message, type = 'success') => {
    setToast({ message, type, visible: true });
    setTimeout(() => {
      setToast({ message: '', type: '', visible: false });
    }, 3000);
  };

  // Mutaciones...
  const crearMutation = useMutation({
    mutationFn: crearEmpleado,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['empleados'] });
      queryClient.invalidateQueries({ queryKey: ['mecanicos'] });
      resetFormulario();
      showToast('Empleado creado exitosamente', 'success');
    },
    onError: (error) => {
      showToast('Error al crear empleado: ' + error.message, 'error');
    },
  });

  const actualizarMutation = useMutation({
    mutationFn: actualizarEmpleado,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['empleados'] });
      queryClient.invalidateQueries({ queryKey: ['mecanicos'] });
      resetFormulario();
      showToast('Empleado actualizado exitosamente', 'success');
    },
    onError: (error) => {
      showToast('Error al actualizar empleado: ' + error.message, 'error');
    },
  });

  const desactivarMutation = useMutation({
    mutationFn: desactivarEmpleado,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['empleados'] });
      queryClient.invalidateQueries({ queryKey: ['mecanicos'] });
      showToast('Empleado desactivado', 'success');
    },
    onError: (error) => {
      showToast('Error al desactivar empleado: ' + error.message, 'error');
    },
  });

  const reactivarMutation = useMutation({
    mutationFn: reactivarEmpleado,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['empleados'] });
      queryClient.invalidateQueries({ queryKey: ['mecanicos'] });
      showToast('Empleado reactivado', 'success');
    },
    onError: (error) => {
      showToast('Error al reactivar empleado: ' + error.message, 'error');
    },
  });

  const resetFormulario = () => {
    setEmail('');
    setPassword('');
    setNombre('');
    setRol('mecanico');
    setActivo(true);
    setDui('');
    setTelefonoMovil('');
    setCorreoPersonal('');
    setBanco('');
    setTipoCuenta('');
    setNumeroCuenta('');
    setDireccionResidencia('');
    setImagenDui('');
    setEditandoId(null);
    setMostrarFormulario(false);
  };

  const handleUploadDui = async (file) => {
    if (!file) return;
    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `dui/${fileName}`;
      
      const { error: uploadError } = await supabase.storage
        .from('dui')
        .upload(filePath, file);
      if (uploadError) throw new Error(uploadError.message);

      const { data: urlData } = supabase.storage
        .from('dui')
        .getPublicUrl(filePath);
      
      setImagenDui(urlData.publicUrl);
      showToast('Imagen del DUI subida correctamente', 'success');
    } catch (err) {
      showToast('Error al subir imagen: ' + err.message, 'error');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editandoId) {
      actualizarMutation.mutate({
        id: editandoId,
        nombre,
        rol,
        activo,
        dui,
        telefono_movil: telefonoMovil,
        correo_personal: correoPersonal,
        banco,
        tipo_cuenta: tipoCuenta,
        numero_cuenta: numeroCuenta,
        direccion_residencia: direccionResidencia,
        imagen_dui: imagenDui,
      });
    } else {
      if (!email || !password || !nombre) {
        showToast('Email, contraseña y nombre son obligatorios', 'error');
        return;
      }
      crearMutation.mutate({
        email,
        password,
        nombre,
        rol,
        dui,
        telefono_movil: telefonoMovil,
        correo_personal: correoPersonal,
        banco,
        tipo_cuenta: tipoCuenta,
        numero_cuenta: numeroCuenta,
        direccion_residencia: direccionResidencia,
        imagen_dui: imagenDui,
      });
    }
  };

  const handleEditar = (empleado) => {
    setEditandoId(empleado.id);
    setNombre(empleado.nombre);
    setRol(empleado.rol);
    setActivo(empleado.activo);
    setEmail(empleado.email || '');
    setPassword('');
    setDui(empleado.dui || '');
    setTelefonoMovil(empleado.telefono_movil || '');
    setCorreoPersonal(empleado.correo_personal || '');
    setBanco(empleado.banco || '');
    setTipoCuenta(empleado.tipo_cuenta || '');
    setNumeroCuenta(empleado.numero_cuenta || '');
    setDireccionResidencia(empleado.direccion_residencia || '');
    setImagenDui(empleado.imagen_dui || '');
    setMostrarFormulario(true);

    setTimeout(() => {
      if (formRef.current) {
        formRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
        if (nombreInputRef.current) {
          nombreInputRef.current.focus();
        }
      }
    }, 100);
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

  const toastStyles = {
    success: 'bg-green-100 border-green-500 text-green-700',
    error: 'bg-red-100 border-red-500 text-red-700',
  };

  return (
    <div className="p-4 max-w-7xl mx-auto">
      {toast.visible && (
        <div className={`fixed top-4 right-4 z-50 p-4 rounded-lg border-l-4 shadow-lg max-w-md ${toastStyles[toast.type]}`}>
          <p>{toast.message}</p>
        </div>
      )}

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
                setDui('');
                setTelefonoMovil('');
                setCorreoPersonal('');
                setBanco('');
                setTipoCuenta('');
                setNumeroCuenta('');
                setDireccionResidencia('');
                setImagenDui('');
              }
            }
          }}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm w-full sm:w-auto"
        >
          {mostrarFormulario ? 'Cancelar' : '+ Nuevo Empleado'}
        </button>
      </div>

      {mostrarFormulario && (
        <div ref={formRef} className="bg-white rounded-xl shadow-md p-6 mb-6">
          <h3 className="text-lg font-semibold mb-4">
            {editandoId ? 'Editar Empleado' : 'Nuevo Empleado'}
          </h3>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* ... (el formulario es el mismo de antes, no lo repito para no alargar) ... */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
              <input ref={nombreInputRef} type="text" value={nombre} onChange={(e) => setNombre(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Rol</label>
              <select value={rol} onChange={(e) => setRol(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none">
                <option value="mecanico">Mecánico</option>
                <option value="admin">Administrador</option>
              </select>
            </div>
            {/* ... resto de campos ... */}
            <div className="md:col-span-2 flex justify-end">
              <button type="submit" disabled={crearMutation.isPending || actualizarMutation.isPending} className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg disabled:opacity-50 w-full md:w-auto">
                {crearMutation.isPending || actualizarMutation.isPending ? 'Guardando...' : editandoId ? 'Actualizar Empleado' : 'Guardar Empleado'}
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
                  <span className={`text-xs px-2 py-0.5 rounded-full ${e.rol === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                    {e.rol === 'admin' ? 'Admin' : 'Mecánico'}
                  </span>
                </div>
                <div className="space-y-1 text-sm">
                  <div><strong>Email:</strong> {e.email || 'Sin email'}</div>
                  <div><strong>Teléfono:</strong> {e.telefono_movil || '-'}</div>
                  <div><strong>DUI:</strong> {e.dui || '-'}</div>
                  <div><strong>Banco:</strong> {e.banco || '-'} ({e.tipo_cuenta || '-'})</div>
                  <div><strong>Cuenta:</strong> {e.numero_cuenta || '-'}</div>
                  <div><strong>Dirección:</strong> {e.direccion_residencia || '-'}</div>
                  <div><strong>Estado:</strong> {e.activo ? '✅ Activo' : '❌ Inactivo'}</div>
                </div>
                {/* 🖼️ IMAGEN DEL DUI FUERA DEL space-y-1 */}
                {e.imagen_dui && (
                  <div className="mt-2 w-full flex justify-start items-start">
                    <div>
                      <span className="text-sm font-medium text-gray-700">DUI (imagen):</span>
                      <div className="mt-1">
                        <a href={e.imagen_dui} target="_blank" rel="noreferrer" className="block">
                          <img src={e.imagen_dui} alt="DUI" className="w-24 h-24 object-cover rounded border border-gray-200 hover:opacity-80 transition" />
                        </a>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              <div className="flex gap-2 mt-4 pt-3 border-t border-gray-100 flex-wrap">
                <button onClick={() => handleEditar(e)} className="flex-1 bg-blue-100 text-blue-700 px-3 py-1.5 rounded-lg text-sm hover:bg-blue-200 transition text-center">
                  Editar
                </button>
                {e.activo ? (
                  <button onClick={() => handleDesactivar(e.id, e.nombre)} className="flex-1 bg-red-100 text-red-700 px-3 py-1.5 rounded-lg text-sm hover:bg-red-200 transition text-center">
                    Desactivar
                  </button>
                ) : (
                  <button onClick={() => handleReactivar(e.id)} className="flex-1 bg-green-100 text-green-700 px-3 py-1.5 rounded-lg text-sm hover:bg-green-200 transition text-center">
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