import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useQuery } from '@tanstack/react-query';

// --- FUNCIÓN PARA OBTENER LOS ÍTEMS DE UNA PLANTILLA ---
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

const Checklist = ({ ordenId, orden, checklistExistente, onClose, onComplete }) => {
  const templateId = orden?.template_id;

  const { data: templateItems, isLoading: templateLoading, error: templateError } = useQuery({
    queryKey: ['checklistTemplateItems', templateId],
    queryFn: () => fetchItemsForTemplate(templateId),
    enabled: !!templateId,
  });

  const [itemsState, setItemsState] = useState([]);
  const [guardando, setGuardando] = useState(false);
  const [completando, setCompletando] = useState(false);

  useEffect(() => {
    if (!templateItems) return;

    const initialItems = templateItems.map(item => {
      const existente = checklistExistente?.find(c => c.item_nombre === item.nombre);
      let cumplido = existente?.cumplido;
      
      if (typeof cumplido === 'boolean') {
        cumplido = cumplido ? 'ok' : 'no_ok';
      }
      if (!cumplido) {
        cumplido = 'pendiente';
      }

      return {
        ...item,
        cumplido: cumplido,
        comentario: existente?.comentario || '',
        foto: existente?.foto || '',
        filePath: existente?.file_path || '',
        id: existente?.id || null,
        constId: item.id,
        fotoSeleccionada: null,
        fotoPreview: '',
      };
    });
    setItemsState(initialItems);
  }, [templateItems, checklistExistente]);

  const handleItemChange = (constId, field, value) => {
    setItemsState(prev => prev.map(item =>
      item.constId === constId ? { ...item, [field]: value } : item
    ));
  };

  const handleFileSelect = (constId, file) => {
    if (!file) return;
    const previewUrl = URL.createObjectURL(file);
    handleItemChange(constId, 'fotoSeleccionada', file);
    handleItemChange(constId, 'fotoPreview', previewUrl);
  };

  const handleDeletePhotoLocal = (constId) => {
    const currentItem = itemsState.find(item => item.constId === constId);
    if (!currentItem) return;
    handleItemChange(constId, 'foto', '');
    handleItemChange(constId, 'filePath', '');
    handleItemChange(constId, 'fotoSeleccionada', null);
    if (currentItem.fotoPreview) {
      URL.revokeObjectURL(currentItem.fotoPreview);
    }
    handleItemChange(constId, 'fotoPreview', '');
  };

  const guardarItem = async (item) => {
    let nuevaFoto = item.foto;
    let nuevoFilePath = item.filePath;

    if (item.fotoSeleccionada) {
      if (item.filePath) {
        await supabase.storage
          .from('fotos_checklist')
          .remove([item.filePath])
          .catch(err => console.warn('Error al eliminar foto anterior:', err));
      }

      const filePath = `${ordenId}/${item.constId}_${Date.now()}`;
      const { error } = await supabase.storage
        .from('fotos_checklist')
        .upload(filePath, item.fotoSeleccionada);
      if (error) throw new Error('Error al subir foto: ' + error.message);

      const { data: urlData } = supabase.storage
        .from('fotos_checklist')
        .getPublicUrl(filePath);
      
      nuevaFoto = urlData.publicUrl;
      nuevoFilePath = filePath;
    } else if (!item.foto && item.filePath) {
      await supabase.storage
        .from('fotos_checklist')
        .remove([item.filePath])
        .catch(err => console.warn('Error al eliminar foto:', err));
      nuevoFilePath = '';
    }

    const payload = {
      orden_trabajo_id: ordenId,
      item_nombre: item.nombre,
      cumplido: item.cumplido,
      comentario: item.comentario,
      foto: nuevaFoto || '',
      file_path: nuevoFilePath || '',
    };
    if (item.id) payload.id = item.id;

    const { error } = await supabase
      .from('checklist_items')
      .upsert([payload], { onConflict: 'id' });
    if (error) throw new Error('Error al guardar en BD: ' + error.message);

    return {
      ...item,
      foto: nuevaFoto,
      filePath: nuevoFilePath,
      fotoSeleccionada: null,
      fotoPreview: '',
    };
  };

  const handleGuardarItem = async (constId) => {
    const item = itemsState.find(i => i.constId === constId);
    if (!item) return;
    try {
      const updated = await guardarItem(item);
      setItemsState(prev => prev.map(i =>
        i.constId === constId ? updated : i
      ));
      alert(`✓ "${item.nombre}" guardado`);
    } catch (err) {
      alert('Error al guardar ítem: ' + err.message);
    }
  };

  const handleGuardarTodos = async () => {
    setGuardando(true);
    try {
      const updatedItems = [];
      for (const item of itemsState) {
        const updated = await guardarItem(item);
        updatedItems.push(updated);
      }
      setItemsState(prev => prev.map(item => {
        const updated = updatedItems.find(u => u.constId === item.constId);
        return updated || item;
      }));
      alert('Checklist guardado correctamente');
    } catch (err) {
      alert('Error al guardar todo: ' + err.message);
    } finally {
      setGuardando(false);
    }
  };

  const handleCompletar = async () => {
    setCompletando(true);
    try {
      const updatedItems = [];
      for (const item of itemsState) {
        const updated = await guardarItem(item);
        updatedItems.push(updated);
      }
      setItemsState(prev => prev.map(item => {
        const updated = updatedItems.find(u => u.constId === item.constId);
        return updated || item;
      }));

      const { error } = await supabase
        .from('ordenes_trabajo')
        .update({ checklist_completado: true })
        .eq('id', ordenId);
      if (error) throw new Error('Error al completar orden: ' + error.message);
      
      alert('Checklist completado y guardado');
      onComplete();
    } catch (err) {
      alert('Error al completar: ' + err.message);
    } finally {
      setCompletando(false);
    }
  };

  if (templateLoading) {
    return <div className="p-6 text-gray-600">Cargando plantilla...</div>;
  }

  if (templateError) {
    return <div className="p-6 text-red-600">Error al cargar plantilla: {templateError.message}</div>;
  }

  if (!templateId) {
    return <div className="p-6 text-red-600">Esta orden no tiene una plantilla asignada. Contacta al administrador.</div>;
  }

  if (itemsState.length === 0) {
    return <div className="p-6 text-gray-600">No hay ítems activos en esta plantilla.</div>;
  }

  const groupedItems = itemsState.reduce((acc, item) => {
    if (!acc[item.categoria]) acc[item.categoria] = [];
    acc[item.categoria].push(item);
    return acc;
  }, {});

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto">
      <button
        onClick={onClose}
        className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg text-sm mb-6"
      >
        ← Volver
      </button>

      <div className="bg-white rounded-xl shadow-md p-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Checklist de {itemsState.length} puntos</h2>
        <p className="text-sm text-gray-500 mb-6">
          Orden #{ordenId} - {orden.clientes?.nombre} - {orden.vehiculos?.marca} {orden.vehiculos?.modelo}
        </p>

        {Object.entries(groupedItems).map(([categoria, items]) => (
          <div key={categoria} className="mb-8">
            <h3 className="text-lg font-semibold bg-gray-100 p-2 rounded mb-3">{categoria}</h3>
            <div className="space-y-4">
              {items.map((item) => (
                <div key={item.constId} className="border-b pb-4">
                  <div className="flex flex-col md:flex-row md:items-start gap-3">
                    <div className="flex-1">
                      <p className="font-medium text-gray-800">{item.nombre}</p>
                      <div className="flex flex-wrap gap-3 mt-1">
                        <label className="flex items-center gap-1 text-sm">
                          <input
                            type="radio"
                            name={`estado_${item.constId}`}
                            value="ok"
                            checked={item.cumplido === 'ok'}
                            onChange={() => handleItemChange(item.constId, 'cumplido', 'ok')}
                          /> OK
                        </label>
                        <label className="flex items-center gap-1 text-sm">
                          <input
                            type="radio"
                            name={`estado_${item.constId}`}
                            value="no_ok"
                            checked={item.cumplido === 'no_ok'}
                            onChange={() => handleItemChange(item.constId, 'cumplido', 'no_ok')}
                          /> NO OK
                        </label>
                        <label className="flex items-center gap-1 text-sm">
                          <input
                            type="radio"
                            name={`estado_${item.constId}`}
                            value="na"
                            checked={item.cumplido === 'na'}
                            onChange={() => handleItemChange(item.constId, 'cumplido', 'na')}
                          /> N/A
                        </label>
                      </div>
                    </div>
                    <div className="flex-1">
                      <input
                        type="text"
                        placeholder="Observaciones..."
                        value={item.comentario || ''}
                        onChange={(e) => handleItemChange(item.constId, 'comentario', e.target.value)}
                        className="w-full border border-gray-300 rounded-lg px-2 py-1 text-sm mb-1"
                      />
                      <div className="flex flex-wrap items-center gap-2">
                        <input
                          type="file"
                          accept="image/*"
                          id={`foto_${item.constId}`}
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files[0];
                            if (file) handleFileSelect(item.constId, file);
                            e.target.value = '';
                          }}
                        />
                        <button
                          onClick={() => document.getElementById(`foto_${item.constId}`).click()}
                          className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-2 py-1 rounded text-xs"
                        >
                          {item.fotoPreview ? 'Cambiar foto' : '📸 Seleccionar foto'}
                        </button>

                        {item.fotoPreview && (
                          <span className="text-xs text-green-600">⏳ (nueva foto pendiente)</span>
                        )}

                        {item.foto && !item.fotoPreview && (
                          <a href={item.foto} target="_blank" rel="noreferrer" className="text-blue-500 text-xs underline">
                            Ver foto guardada
                          </a>
                        )}

                        {(item.foto || item.fotoPreview) && (
                          <button
                            onClick={() => handleDeletePhotoLocal(item.constId)}
                            className="text-red-500 hover:text-red-700 text-xs"
                          >
                            🗑️ Eliminar foto
                          </button>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => handleGuardarItem(item.constId)}
                      className="bg-blue-100 hover:bg-blue-200 text-blue-700 px-3 py-1 rounded text-xs whitespace-nowrap"
                    >
                      Guardar ítem
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}

        <div className="flex flex-wrap gap-4 mt-6 border-t pt-6">
          <button
            onClick={handleGuardarTodos}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg text-sm"
            disabled={guardando}
          >
            {guardando ? 'Guardando...' : 'Guardar todo el checklist'}
          </button>
          <button
            onClick={handleCompletar}
            className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg text-sm"
            disabled={completando}
          >
            {completando ? 'Finalizando...' : '✅ Finalizar checklist y marcar orden'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Checklist;