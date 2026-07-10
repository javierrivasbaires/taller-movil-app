import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

// Obtener todos los productos
const fetchInventario = async () => {
  const { data, error } = await supabase
    .from('inventario')
    .select('*')
    .order('nombre_producto', { ascending: true });
  if (error) throw new Error(error.message);
  return data;
};

// Crear producto
const crearProducto = async (nuevoProducto) => {
  const { data, error } = await supabase
    .from('inventario')
    .insert([nuevoProducto])
    .select();
  if (error) throw new Error(error.message);
  return data[0];
};

// Actualizar producto
const actualizarProducto = async ({ id, ...datos }) => {
  const { data, error } = await supabase
    .from('inventario')
    .update(datos)
    .eq('id', id)
    .select();
  if (error) throw new Error(error.message);
  return data[0];
};

// Eliminar producto
const eliminarProducto = async (id) => {
  const { error } = await supabase
    .from('inventario')
    .delete()
    .eq('id', id);
  if (error) throw new Error(error.message);
  return id;
};

const Inventario = () => {
  const queryClient = useQueryClient();
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [editandoId, setEditandoId] = useState(null);
  const [nombreProducto, setNombreProducto] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [stock, setStock] = useState('');
  const [precioVenta, setPrecioVenta] = useState('');
  const [proveedor, setProveedor] = useState('');

  const { data: productos, isLoading, error } = useQuery({
    queryKey: ['inventario'],
    queryFn: fetchInventario,
  });

  const crearMutation = useMutation({
    mutationFn: crearProducto,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventario'] });
      queryClient.invalidateQueries({ queryKey: ['inventarioCount'] }); // 🔁 Actualiza el contador
      resetFormulario();
      alert('Producto creado exitosamente');
    },
    onError: (error) => {
      alert('Error al crear producto: ' + error.message);
    },
  });

  const actualizarMutation = useMutation({
    mutationFn: actualizarProducto,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventario'] });
      resetFormulario();
      alert('Producto actualizado exitosamente');
    },
    onError: (error) => {
      alert('Error al actualizar producto: ' + error.message);
    },
  });

  const eliminarMutation = useMutation({
    mutationFn: eliminarProducto,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventario'] });
      queryClient.invalidateQueries({ queryKey: ['inventarioCount'] }); // 🔁 Actualiza el contador
      alert('Producto eliminado');
    },
    onError: (error) => {
      alert('Error al eliminar producto: ' + error.message);
    },
  });

  const resetFormulario = () => {
    setNombreProducto('');
    setDescripcion('');
    setStock('');
    setPrecioVenta('');
    setProveedor('');
    setEditandoId(null);
    setMostrarFormulario(false);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!nombreProducto.trim() || !stock || !precioVenta) {
      alert('Nombre, stock y precio son obligatorios');
      return;
    }
    const datos = {
      nombre_producto: nombreProducto.trim(),
      descripcion: descripcion.trim() || null,
      stock: parseInt(stock),
      precio_venta: parseFloat(precioVenta),
      proveedor: proveedor.trim() || null,
    };

    if (editandoId) {
      actualizarMutation.mutate({ id: editandoId, ...datos });
    } else {
      crearMutation.mutate(datos);
    }
  };

  const handleEditar = (producto) => {
    setEditandoId(producto.id);
    setNombreProducto(producto.nombre_producto);
    setDescripcion(producto.descripcion || '');
    setStock(producto.stock.toString());
    setPrecioVenta(producto.precio_venta.toString());
    setProveedor(producto.proveedor || '');
    setMostrarFormulario(true);
  };

  const handleEliminar = (id, nombreProducto) => {
    if (window.confirm(`¿Eliminar el producto "${nombreProducto}"?`)) {
      eliminarMutation.mutate(id);
    }
  };

  if (isLoading) return <div className="p-6 text-gray-600">Cargando inventario...</div>;
  if (error) return <div className="p-6 text-red-600">Error: {error.message}</div>;

  return (
    <div className="p-4 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Inventario</h2>
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
          {mostrarFormulario ? 'Cancelar' : '+ Nuevo Producto'}
        </button>
      </div>

      {mostrarFormulario && (
        <div className="bg-white rounded-xl shadow-md p-6 mb-6">
          <h3 className="text-lg font-semibold mb-4">
            {editandoId ? 'Editar Producto' : 'Nuevo Producto'}
          </h3>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nombre del producto *</label>
              <input
                type="text"
                value={nombreProducto}
                onChange={(e) => setNombreProducto(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
              <input
                type="text"
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Stock *</label>
              <input
                type="number"
                value={stock}
                onChange={(e) => setStock(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Precio de venta ($) *</label>
              <input
                type="number"
                step="0.01"
                value={precioVenta}
                onChange={(e) => setPrecioVenta(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                required
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Proveedor</label>
              <input
                type="text"
                value={proveedor}
                onChange={(e) => setProveedor(e.target.value)}
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
                  ? 'Actualizar Producto'
                  : 'Guardar Producto'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {productos?.length === 0 ? (
          <div className="col-span-full text-center text-gray-500 py-8">No hay productos en el inventario</div>
        ) : (
          productos?.map((p) => (
            <div key={p.id} className="bg-white rounded-xl shadow-md p-4 flex flex-col h-full">
              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-gray-800 text-lg truncate">{p.nombre_producto}</span>
                </div>
                <div className="space-y-1 text-sm">
                  <div><strong>Stock:</strong> {p.stock}</div>
                  <div><strong>Precio:</strong> ${p.precio_venta}</div>
                  <div><strong>Proveedor:</strong> {p.proveedor || '-'}</div>
                  {p.descripcion && <div><strong>Desc.:</strong> {p.descripcion}</div>}
                </div>
              </div>
              <div className="flex gap-2 mt-4 pt-3 border-t border-gray-100">
                <button
                  onClick={() => handleEditar(p)}
                  className="flex-1 bg-blue-100 text-blue-700 px-3 py-1.5 rounded-lg text-sm hover:bg-blue-200 transition text-center"
                >
                  Editar
                </button>
                <button
                  onClick={() => handleEliminar(p.id, p.nombre_producto)}
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

export default Inventario;