import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

// --- FUNCIONES DE CONSULTA ---
const fetchTemplates = async () => {
  const { data, error } = await supabase
    .from('checklist_templates')
    .select('*')
    .order('id', { ascending: true });
  if (error) throw new Error(error.message);
  return data;
};

const fetchItemsForTemplate = async (templateId) => {
  if (!templateId) return [];
  const { data, error } = await supabase
    .from('checklist_template_items')
    .select('*')
    .eq('template_id', templateId)
    .order('orden_visual', { ascending: true });
  if (error) throw new Error(error.message);
  return data;
};

// --- MUTACIONES PARA PLANTILLAS ---
const crearTemplate = async (nuevo) => {
  const { data, error } = await supabase
    .from('checklist_templates')
    .insert([nuevo])
    .select();
  if (error) throw new Error(error.message);
  return data[0];
};

const actualizarTemplate = async ({ id, ...datos }) => {
  const { data, error } = await supabase
    .from('checklist_templates')
    .update(datos)
    .eq('id', id)
    .select();
  if (error) throw new Error(error.message);
  return data[0];
};

const eliminarTemplate = async (id) => {
  const { error } = await supabase
    .from('checklist_templates')
    .delete()
    .eq('id', id);
  if (error) throw new Error(error.message);
  return id;
};

// --- MUTACIONES PARA ÍTEMS ---
const crearItem = async (nuevo) => {
  const { data, error } = await supabase
    .from('checklist_template_items')
    .insert([nuevo])
    .select();
  if (error) throw new Error(error.message);
  return data[0];
};

const actualizarItem = async ({ id, ...datos }) => {
  const { data, error } = await supabase
    .from('checklist_template_items')
    .update(datos)
    .eq('id', id)
    .select();
  if (error) throw new Error(error.message);
  return data[0];
};

const eliminarItem = async (id) => {
  const { error } = await supabase
    .from('checklist_template_items')
    .delete()
    .eq('id', id);
  if (error) throw new Error(error.message);
  return id;
};

// --- COMPONENTE ---
const ChecklistTemplate = () => {
  const queryClient = useQueryClient();
  const [templateSeleccionadoId, setTemplateSeleccionadoId] = useState(null);
  const [mostrarFormTemplate, setMostrarFormTemplate] = useState(false);
  const [editandoTemplateId, setEditandoTemplateId] = useState(null);
  const [nombreTemplate, setNombreTemplate] = useState('');
  const [descripcionTemplate, setDescripcionTemplate] = useState('');
  const [activoTemplate, setActivoTemplate] = useState(true);

  const [mostrarFormItem, setMostrarFormItem] = useState(false);
  const [editandoItemId, setEditandoItemId] = useState(null);
  const [categoriaItem, setCategoriaItem] = useState('');
  const [nombreItem, setNombreItem] = useState('');
  const [ordenItem, setOrdenItem] = useState(0);

  // Consultas
  const { data: templates, isLoading: templatesLoading } = useQuery({
    queryKey: ['checklistTemplates'],
    queryFn: fetchTemplates,
  });

  const { data: items, isLoading: itemsLoading } = useQuery({
    queryKey: ['checklistTemplateItems', templateSeleccionadoId],
    queryFn: () => fetchItemsForTemplate(templateSeleccionadoId),
    enabled: !!templateSeleccionadoId,
  });

  // Mutaciones para plantillas
  const crearTemplateMut = useMutation({
    mutationFn: crearTemplate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checklistTemplates'] });
      resetFormTemplate();
      alert('Plantilla creada');
    },
    onError: (error) => alert('Error: ' + error.message),
  });

  const actualizarTemplateMut = useMutation({
    mutationFn: actualizarTemplate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checklistTemplates'] });
      resetFormTemplate();
      alert('Plantilla actualizada');
    },
    onError: (error) => alert('Error: ' + error.message),
  });

  const eliminarTemplateMut = useMutation({
    mutationFn: eliminarTemplate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checklistTemplates'] });
      if (templateSeleccionadoId) setTemplateSeleccionadoId(null);
      alert('Plantilla eliminada');
    },
    onError: (error) => alert('Error: ' + error.message),
  });

  // Mutaciones para ítems
  const crearItemMut = useMutation({
    mutationFn: crearItem,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checklistTemplateItems', templateSeleccionadoId] });
      resetFormItem();
      alert('Ítem agregado');
    },
    onError: (error) => alert('Error: ' + error.message),
  });

  const actualizarItemMut = useMutation({
    mutationFn: actualizarItem,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checklistTemplateItems', templateSeleccionadoId] });
      resetFormItem();
      alert('Ítem actualizado');
    },
    onError: (error) => alert('Error: ' + error.message),
  });

  const eliminarItemMut = useMutation({
    mutationFn: eliminarItem,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checklistTemplateItems', templateSeleccionadoId] });
      alert('Ítem eliminado');
    },
    onError: (error) => alert('Error: ' + error.message),
  });

  // --- Reset de formularios ---
  const resetFormTemplate = () => {
    setNombreTemplate('');
    setDescripcionTemplate('');
    setActivoTemplate(true);
    setEditandoTemplateId(null);
    setMostrarFormTemplate(false);
  };

  const resetFormItem = () => {
    setCategoriaItem('');
    setNombreItem('');
    setOrdenItem(0);
    setEditandoItemId(null);
    setMostrarFormItem(false);
  };

  // --- Handlers ---
  const handleSubmitTemplate = (e) => {
    e.preventDefault();
    if (!nombreTemplate.trim()) {
      alert('El nombre de la plantilla es obligatorio');
      return;
    }
    const datos = {
      nombre: nombreTemplate.trim(),
      descripcion: descripcionTemplate.trim() || null,
      activo: activoTemplate,
    };
    if (editandoTemplateId) {
      actualizarTemplateMut.mutate({ id: editandoTemplateId, ...datos });
    } else {
      crearTemplateMut.mutate(datos);
    }
  };

  const handleSubmitItem = (e) => {
    e.preventDefault();
    if (!categoriaItem.trim() || !nombreItem.trim()) {
      alert('Categoría y nombre son obligatorios');
      return;
    }
    const datos = {
      template_id: templateSeleccionadoId,
      categoria: categoriaItem.trim(),
      nombre: nombreItem.trim(),
      orden_visual: parseInt(ordenItem) || 0,
    };
    if (editandoItemId) {
      actualizarItemMut.mutate({ id: editandoItemId, ...datos });
    } else {
      crearItemMut.mutate(datos);
    }
  };

  const handleEditarTemplate = (template) => {
    setEditandoTemplateId(template.id);
    setNombreTemplate(template.nombre);
    setDescripcionTemplate(template.descripcion || '');
    setActivoTemplate(template.activo);
    setMostrarFormTemplate(true);
  };

  const handleEliminarTemplate = (id, nombre) => {
    if (window.confirm(`¿Eliminar la plantilla "${nombre}" y todos sus ítems?`)) {
      eliminarTemplateMut.mutate(id);
    }
  };

  const handleEditarItem = (item) => {
    setEditandoItemId(item.id);
    setCategoriaItem(item.categoria);
    setNombreItem(item.nombre);
    setOrdenItem(item.orden_visual || 0);
    setMostrarFormItem(true);
  };

  const handleEliminarItem = (id, nombre) => {
    if (window.confirm(`¿Eliminar el ítem "${nombre}"?`)) {
      eliminarItemMut.mutate(id);
    }
  };

  if (templatesLoading) return <div className="p-6 text-gray-600">Cargando...</div>;

  return (
    <div className="p-4 max-w-7xl mx-auto">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Gestión de Plantillas de Checklist</h2>

      {/* --- SECCIÓN DE PLANTILLAS --- */}
      <div className="bg-white rounded-xl shadow-md p-6 mb-8">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Plantillas</h3>
          <button
            onClick={() => {
              resetFormTemplate();
              setMostrarFormTemplate(!mostrarFormTemplate);
            }}
            className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700"
          >
            {mostrarFormTemplate ? 'Cancelar' : '+ Nueva Plantilla'}
          </button>
        </div>

        {mostrarFormTemplate && (
          <form onSubmit={handleSubmitTemplate} className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <input
              type="text"
              placeholder="Nombre *"
              value={nombreTemplate}
              onChange={(e) => setNombreTemplate(e.target.value)}
              className="border p-2 rounded"
              required
            />
            <input
              type="text"
              placeholder="Descripción"
              value={descripcionTemplate}
              onChange={(e) => setDescripcionTemplate(e.target.value)}
              className="border p-2 rounded"
            />
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-1 text-sm">
                <input
                  type="checkbox"
                  checked={activoTemplate}
                  onChange={(e) => setActivoTemplate(e.target.checked)}
                /> Activa
              </label>
              <button type="submit" className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700">
                {editandoTemplateId ? 'Actualizar' : 'Guardar'}
              </button>
            </div>
          </form>
        )}

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Nombre</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Descripción</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Ítems</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Acciones</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {templates?.length === 0 ? (
                <tr><td colSpan="5" className="px-4 py-4 text-center text-gray-500">No hay plantillas</td></tr>
              ) : (
                templates?.map((t) => (
                  <tr key={t.id} className={!t.activo ? 'opacity-50' : ''}>
                    <td className="px-4 py-2">{t.nombre}</td>
                    <td className="px-4 py-2">{t.descripcion || '-'}</td>
                    <td className="px-4 py-2">{t.activo ? '✅ Activa' : '❌ Inactiva'}</td>
                    <td className="px-4 py-2">
                      <button
                        onClick={() => setTemplateSeleccionadoId(
                          templateSeleccionadoId === t.id ? null : t.id
                        )}
                        className="text-blue-600 hover:underline text-sm"
                      >
                        {templateSeleccionadoId === t.id ? 'Ocultar' : 'Ver ítems'}
                      </button>
                    </td>
                    <td className="px-4 py-2 text-right">
                      <button onClick={() => handleEditarTemplate(t)} className="text-blue-600 hover:text-blue-900 mr-3">Editar</button>
                      <button onClick={() => handleEliminarTemplate(t.id, t.nombre)} className="text-red-600 hover:text-red-900">Eliminar</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* --- SECCIÓN DE ÍTEMS (si hay plantilla seleccionada) --- */}
      {templateSeleccionadoId && (
        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">
              Ítems de "{templates?.find(t => t.id === templateSeleccionadoId)?.nombre || 'Plantilla'}"
            </h3>
            <button
              onClick={() => {
                resetFormItem();
                setMostrarFormItem(!mostrarFormItem);
              }}
              className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700"
            >
              {mostrarFormItem ? 'Cancelar' : '+ Nuevo Ítem'}
            </button>
          </div>

          {mostrarFormItem && (
            <form onSubmit={handleSubmitItem} className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <input
                type="text"
                placeholder="Categoría *"
                value={categoriaItem}
                onChange={(e) => setCategoriaItem(e.target.value)}
                className="border p-2 rounded"
                required
              />
              <input
                type="text"
                placeholder="Nombre del ítem *"
                value={nombreItem}
                onChange={(e) => setNombreItem(e.target.value)}
                className="border p-2 rounded"
                required
              />
              <input
                type="number"
                placeholder="Orden visual"
                value={ordenItem}
                onChange={(e) => setOrdenItem(e.target.value)}
                className="border p-2 rounded"
              />
              <button type="submit" className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700">
                {editandoItemId ? 'Actualizar' : 'Guardar'}
              </button>
            </form>
          )}

          {itemsLoading ? (
            <p className="text-gray-500">Cargando ítems...</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Categoría</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Nombre</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Orden</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Acciones</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {items?.length === 0 ? (
                    <tr><td colSpan="4" className="px-4 py-4 text-center text-gray-500">No hay ítems en esta plantilla</td></tr>
                  ) : (
                    items?.map((item) => (
                      <tr key={item.id}>
                        <td className="px-4 py-2">{item.categoria}</td>
                        <td className="px-4 py-2">{item.nombre}</td>
                        <td className="px-4 py-2">{item.orden_visual || 0}</td>
                        <td className="px-4 py-2 text-right">
                          <button onClick={() => handleEditarItem(item)} className="text-blue-600 hover:text-blue-900 mr-3">Editar</button>
                          <button onClick={() => handleEliminarItem(item.id, item.nombre)} className="text-red-600 hover:text-red-900">Eliminar</button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ChecklistTemplate;