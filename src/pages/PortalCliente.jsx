import React, { useEffect, useState, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useGeolocation } from '../hooks/useGeolocation';

// --- COMPONENTE ---
const PortalCliente = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  // Estado del cliente
  const [cliente, setCliente] = useState(null);
  const [vehiculos, setVehiculos] = useState([]);
  const [ordenes, setOrdenes] = useState([]);
  const [suscripcion, setSuscripcion] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Estado para el formulario de cita
  const [mostrarModalCita, setMostrarModalCita] = useState(false);
  const [fechaCita, setFechaCita] = useState('');
  const [horaCita, setHoraCita] = useState('');
  const [vehiculoSeleccionado, setVehiculoSeleccionado] = useState('');
  const [direccionCita, setDireccionCita] = useState('');
  const [mensajeCita, setMensajeCita] = useState('');
  const [guardandoCita, setGuardandoCita] = useState(false);

  // Estado para toast (notificación temporal)
  const [toast, setToast] = useState({ message: '', type: '', visible: false });

  // Geolocalización
  const { location, loading: locationLoading, error: locationError, refreshLocation } = useGeolocation();

  // Referencia para el formulario
  const formRef = useRef(null);

  // Función para mostrar toast
  const showToast = (message, type = 'success') => {
    setToast({ message, type, visible: true });
    setTimeout(() => {
      setToast({ message: '', type: '', visible: false });
    }, 3000);
  };

  // Cargar datos del cliente al montar el componente
  useEffect(() => {
    if (!token) {
      setError('No se proporcionó un enlace válido.');
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      try {
        // 1. Buscar cliente por token
        const { data: clienteData, error: clienteError } = await supabase
          .from('clientes')
          .select('*')
          .eq('token_portal', token)
          .single();

        if (clienteError || !clienteData) {
          setError('Enlace inválido o expirado. Contacta a tu taller de confianza.');
          setLoading(false);
          return;
        }

        // 2. Verificar expiración
        const ahora = new Date();
        const expiracion = new Date(clienteData.token_expiracion);
        if (ahora > expiracion) {
          setError('Este enlace ha expirado. Solicita uno nuevo al taller.');
          setLoading(false);
          return;
        }

        setCliente(clienteData);

        // 3. Obtener vehículos
        const { data: vehiculosData } = await supabase
          .from('vehiculos')
          .select('*')
          .eq('cliente_id', clienteData.id);

        setVehiculos(vehiculosData || []);

        // 4. Obtener órdenes de trabajo (limitadas a 5)
        const { data: ordenesData } = await supabase
          .from('ordenes_trabajo')
          .select(`
            id,
            fecha_hora,
            tipo_servicio,
            estado,
            total,
            vehiculos (marca, modelo, placa)
          `)
          .eq('cliente_id', clienteData.id)
          .order('fecha_hora', { ascending: false })
          .limit(5);

        setOrdenes(ordenesData || []);

        // 5. Obtener suscripción activa
        const { data: suscripcionData } = await supabase
          .from('suscripciones')
          .select('*')
          .eq('cliente_id', clienteData.id)
          .eq('activo', true)
          .single();

        setSuscripcion(suscripcionData || null);

      } catch (err) {
        setError('Error al cargar los datos. Intenta de nuevo más tarde.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [token]);

  // Función para obtener el saludo personalizado según el género
  const getSaludo = (cliente) => {
    if (!cliente) return '';
    const nombre = cliente.nombre || 'Cliente';
    const genero = cliente.genero || 'otro';

    if (genero === 'masculino') {
      return `Bienvenido ${nombre}`;
    } else if (genero === 'femenino') {
      return `Bienvenida ${nombre}`;
    } else if (genero === 'empresa') {
      return `Bienvenido equipo de ${nombre}`;
    } else {
      return `Bienvenido/a ${nombre}`;
    }
  };

  // Función para usar la ubicación del cliente en el formulario de cita
  const handleUsarUbicacionCita = () => {
    if (location) {
      setDireccionCita(`${location.lat}, ${location.lng}`);
      showToast('Ubicación capturada correctamente', 'success');
    } else if (locationError) {
      showToast('Error al capturar ubicación: ' + locationError, 'error');
    } else {
      refreshLocation();
      showToast('Intentando capturar ubicación...', 'success');
    }
  };

  // Función para agendar cita
  const handleAgendarCita = async (e) => {
    e.preventDefault();
    if (!fechaCita || !horaCita || !direccionCita) {
      showToast('Fecha, hora y dirección son obligatorios', 'error');
      return;
    }

    setGuardandoCita(true);
    try {
      const fechaHora = new Date(`${fechaCita}T${horaCita}`).toISOString();
      
      // Separar latitud y longitud si la dirección es un par de coordenadas
      let latitud = null;
      let longitud = null;
      let direccionTexto = direccionCita;
      
      // Si la dirección es como "13.6919, -89.2182", extraer coordenadas
      const coordsMatch = direccionCita.match(/^(-?\d+\.?\d*),\s*(-?\d+\.?\d*)$/);
      if (coordsMatch) {
        latitud = parseFloat(coordsMatch[1]);
        longitud = parseFloat(coordsMatch[2]);
      }

      const nuevaCita = {
        cliente_id: cliente.id,
        vehiculo_id: vehiculoSeleccionado || null,
        fecha_hora: fechaHora,
        direccion: direccionTexto,
        estado: 'pendiente',
        observaciones: mensajeCita || null,
        latitud: latitud,
        longitud: longitud,
      };

      const { error: insertError } = await supabase
        .from('citas')
        .insert([nuevaCita]);

      if (insertError) throw new Error(insertError.message);

      showToast('¡Cita agendada exitosamente! Te contactaremos para confirmar.', 'success');
      // Cerrar modal y limpiar formulario
      setMostrarModalCita(false);
      setFechaCita('');
      setHoraCita('');
      setVehiculoSeleccionado('');
      setDireccionCita('');
      setMensajeCita('');
    } catch (err) {
      showToast('Error al agendar cita: ' + err.message, 'error');
    } finally {
      setGuardandoCita(false);
    }
  };

  // Formatear fecha
  const formatDate = (date) => {
    if (!date) return '-';
    const d = new Date(date);
    return d.toLocaleDateString('es-SV', { year: 'numeric', month: 'long', day: 'numeric' });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
        <div className="bg-white p-8 rounded-xl shadow-lg text-center">
          <p className="text-gray-600">Cargando tu información...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
        <div className="bg-white p-8 rounded-xl shadow-lg text-center max-w-md">
          <h2 className="text-2xl font-bold text-red-600 mb-4">⚠️ Enlace no válido</h2>
          <p className="text-gray-600">{error}</p>
          <p className="text-sm text-gray-500 mt-4">Contacta a tu taller para obtener un nuevo enlace.</p>
        </div>
      </div>
    );
  }

  if (!cliente) {
    return <div className="p-6 text-center text-gray-500">No se encontraron datos.</div>;
  }

  // Estilos del toast
  const toastStyles = {
    success: 'bg-green-100 border-green-500 text-green-700',
    error: 'bg-red-100 border-red-500 text-red-700',
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4 md:p-8">
      {/* Toast (notificación temporal) */}
      {toast.visible && (
        <div className={`fixed top-4 right-4 z-50 p-4 rounded-lg border-l-4 shadow-lg max-w-md ${toastStyles[toast.type]}`}>
          <p>{toast.message}</p>
        </div>
      )}

      <div className="max-w-4xl mx-auto">
        {/* Encabezado */}
        <div className="bg-blue-600 text-white rounded-t-xl p-6">
          <h1 className="text-2xl font-bold">{getSaludo(cliente)}</h1>
          <p className="text-sm text-blue-100 mt-1">Portal de seguimiento de tu vehículo</p>
        </div>

        {/* Datos personales */}
        <div className="bg-white rounded-b-xl shadow-md p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><strong>Teléfono:</strong> {cliente.telefono || '-'}</div>
            <div><strong>Correo:</strong> {cliente.email || '-'}</div>
            <div><strong>Dirección:</strong> {cliente.direccion || '-'}</div>
            <div><strong>Tipo:</strong> {cliente.tipo === 'empresa' ? 'Empresa' : 'Particular'}</div>
          </div>
        </div>

        {/* Vehículos */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Mis Vehículos</h2>
          {vehiculos.length === 0 ? (
            <p className="text-gray-500">No tienes vehículos registrados.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {vehiculos.map((v) => (
                <div key={v.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="font-semibold text-gray-800">{v.marca} {v.modelo}</div>
                  <div className="text-sm text-gray-600">Placa: {v.placa || 'N/A'} - Año: {v.anio || 'N/A'}</div>
                  <div className="text-xs text-gray-500">VIN: {v.vin || 'N/A'}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Suscripción */}
        {suscripcion && (
          <div className="bg-white rounded-xl shadow-md p-6 mb-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Mi Suscripción</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div><strong>Estado:</strong> <span className="text-green-600">Activa</span></div>
              <div><strong>Precio mensual:</strong> ${suscripcion.precio_mensual}</div>
              <div><strong>Próximo pago:</strong> {formatDate(suscripcion.fecha_proximo_pago)}</div>
            </div>
          </div>
        )}

        {/* Últimas órdenes */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Últimos Servicios</h2>
          {ordenes.length === 0 ? (
            <p className="text-gray-500">Aún no tienes servicios registrados.</p>
          ) : (
            <div className="space-y-4">
              {ordenes.map((o) => (
                <div key={o.id} className="border-b border-gray-100 pb-3 last:border-0">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-medium text-gray-800">{o.tipo_servicio}</div>
                      <div className="text-sm text-gray-600">
                        {o.vehiculos?.marca} {o.vehiculos?.modelo} ({o.vehiculos?.placa || 'sin placa'})
                      </div>
                      <div className="text-sm text-gray-500">{formatDate(o.fecha_hora)}</div>
                    </div>
                    <div className="text-right">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        o.estado === 'completado' ? 'bg-green-100 text-green-700' :
                        o.estado === 'en_proceso' ? 'bg-yellow-100 text-yellow-700' :
                        o.estado === 'facturado' ? 'bg-blue-100 text-blue-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {o.estado}
                      </span>
                      <div className="text-sm font-bold text-gray-800 mt-1">${o.total}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Botón para agendar cita */}
        <div className="flex justify-center mt-6">
          <button
            onClick={() => setMostrarModalCita(true)}
            className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg text-lg font-semibold shadow-md transition"
          >
            📅 Agendar Cita
          </button>
        </div>
      </div>

      {/* Modal para agendar cita */}
      {mostrarModalCita && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-lg max-w-lg w-full max-h-[90vh] overflow-y-auto p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Agendar Cita</h2>
            <form onSubmit={handleAgendarCita} ref={formRef}>
              {/* Fecha */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Fecha *</label>
                <input
                  type="date"
                  value={fechaCita}
                  onChange={(e) => setFechaCita(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  required
                />
              </div>

              {/* Hora */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Hora *</label>
                <input
                  type="time"
                  value={horaCita}
                  onChange={(e) => setHoraCita(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  required
                />
              </div>

              {/* Vehículo */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Vehículo (opcional)</label>
                <select
                  value={vehiculoSeleccionado}
                  onChange={(e) => setVehiculoSeleccionado(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  <option value="">Seleccionar vehículo</option>
                  {vehiculos.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.marca} {v.modelo} ({v.placa || 'sin placa'})
                    </option>
                  ))}
                </select>
              </div>

              {/* Dirección */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Dirección *</label>
                <input
                  type="text"
                  value={direccionCita}
                  onChange={(e) => setDireccionCita(e.target.value)}
                  placeholder="Ingresa la dirección donde deseas el servicio"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  required
                />
                <button
                  type="button"
                  onClick={handleUsarUbicacionCita}
                  className="mt-2 bg-gray-200 hover:bg-gray-300 text-gray-700 px-3 py-1 rounded text-sm"
                  disabled={locationLoading}
                >
                  {locationLoading ? 'Obteniendo ubicación...' : '📍 Usar mi ubicación actual'}
                </button>
                {locationError && (
                  <p className="text-xs text-red-500 mt-1">Error: {locationError}</p>
                )}
              </div>

              {/* Mensaje adicional */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Mensaje adicional (opcional)</label>
                <textarea
                  value={mensajeCita}
                  onChange={(e) => setMensajeCita(e.target.value)}
                  rows="3"
                  placeholder="Ej: El vehículo no arranca, ruido en los frenos..."
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              {/* Botones */}
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setMostrarModalCita(false);
                    setFechaCita('');
                    setHoraCita('');
                    setVehiculoSeleccionado('');
                    setDireccionCita('');
                    setMensajeCita('');
                  }}
                  className="bg-gray-300 hover:bg-gray-400 text-gray-800 px-4 py-2 rounded-lg text-sm"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={guardandoCita}
                  className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg text-sm disabled:opacity-50"
                >
                  {guardandoCita ? 'Guardando...' : 'Agendar Cita'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PortalCliente;