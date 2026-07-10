import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';

const PortalCliente = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [cliente, setCliente] = useState(null);
  const [vehiculos, setVehiculos] = useState([]);
  const [ordenes, setOrdenes] = useState([]);
  const [suscripcion, setSuscripcion] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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

        // 4. Obtener órdenes de trabajo (limitadas a 5 para no sobrecargar)
        const { data: ordenesData } = await supabase
          .from('ordenes_trabajo')
          .select(`
            id, fecha_hora, tipo_servicio, estado, total,
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

  // Formatear fecha
  const formatDate = (date) => {
    if (!date) return '-';
    const d = new Date(date);
    return d.toLocaleDateString('es-SV', { year: 'numeric', month: 'long', day: 'numeric' });
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Encabezado */}
        <div className="bg-blue-600 text-white rounded-t-xl p-6">
          <h1 className="text-2xl font-bold">Bienvenido, {cliente.nombre}</h1>
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
        <div className="bg-white rounded-xl shadow-md p-6">
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

        {/* Botón de contacto (placeholder) */}
        <div className="mt-6 text-center text-sm text-gray-500">
          <p>¿Necesitas agendar un servicio? Contáctanos por WhatsApp al <strong>+503 0000-0000</strong></p>
          <p className="text-xs text-gray-400 mt-1">(El número será actualizado próximamente)</p>
        </div>
      </div>
    </div>
  );
};

export default PortalCliente;