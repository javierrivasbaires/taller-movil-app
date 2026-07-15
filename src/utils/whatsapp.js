import { PLANTILLAS_MENSAJES, formatearMensaje } from '../constants/mensajes';
import { generarEnlacesMapa } from './ubicacion';

/**
 * Función base para enviar mensaje (simulación con alerta).
 * Muestra el mensaje en una alerta emergente y en consola.
 */
export const enviarMensaje = async (telefono, mensaje) => {
  if (!telefono) {
    alert('⚠️ No se pudo enviar mensaje: número de teléfono faltante.');
    console.warn('⚠️ No se pudo enviar mensaje: número de teléfono faltante.');
    return;
  }

  // Mostrar alerta emergente (simulación de WhatsApp)
  alert(`📱 Mensaje para ${telefono}:\n\n${mensaje}`);

  // También en consola para referencia (opcional)
  console.log(`📱 Enviando mensaje a ${telefono}:`);
  console.log(mensaje);
  console.log('---');
};

/**
 * Enviar mensaje de cita agendada al cliente
 */
export const enviarCitaAgendada = async (cliente, orden, enlacePago = '') => {
  const enlaces = generarEnlacesMapa(orden.latitud, orden.longitud);
  const mensaje = formatearMensaje(PLANTILLAS_MENSAJES.cita_agendada.cuerpo, {
    cliente: cliente.nombre,
    fecha: new Date(orden.fecha_hora).toLocaleDateString('es-SV'),
    hora: new Date(orden.fecha_hora).toLocaleTimeString('es-SV', { hour: '2-digit', minute: '2-digit' }),
    direccion: orden.direccion_servicio || cliente.direccion || 'No especificada',
    enlace_maps: enlaces.googleMaps,
  });
  await enviarMensaje(cliente.telefono, mensaje);
};

/**
 * Enviar recordatorio de cita al cliente
 */
export const enviarRecordatorioCita = async (cliente, orden) => {
  const enlaces = generarEnlacesMapa(orden.latitud, orden.longitud);
  const mensaje = formatearMensaje(PLANTILLAS_MENSAJES.recordatorio_cita.cuerpo, {
    hora: new Date(orden.fecha_hora).toLocaleTimeString('es-SV', { hour: '2-digit', minute: '2-digit' }),
    direccion: orden.direccion_servicio || cliente.direccion || 'No especificada',
    enlace_maps: enlaces.googleMaps,
  });
  await enviarMensaje(cliente.telefono, mensaje);
};

/**
 * Enviar mensaje al mecánico cuando se le asigna una orden
 */
export const enviarNuevaOrdenMecanico = async (mecanico, cliente, orden) => {
  const enlaces = generarEnlacesMapa(orden.latitud, orden.longitud);
  const mensaje = formatearMensaje(PLANTILLAS_MENSAJES.nueva_orden_asignada.cuerpo, {
    mecanico: mecanico.nombre,
    cliente: cliente.nombre,
    vehiculo: `${orden.vehiculos?.marca || ''} ${orden.vehiculos?.modelo || ''}`.trim() || 'Vehículo',
    fecha: new Date(orden.fecha_hora).toLocaleDateString('es-SV'),
    direccion: orden.direccion_servicio || cliente.direccion || 'No especificada',
    enlace_maps: enlaces.googleMaps,
  });
  await enviarMensaje(mecanico.telefono, mensaje);
};

/**
 * Enviar mensaje al administrador cuando el mecánico completa el checklist
 */
export const enviarChecklistCompletadoAdmin = async (admin, cliente, orden) => {
  const mensaje = formatearMensaje(PLANTILLAS_MENSAJES.checklist_completado.cuerpo, {
    admin: admin.nombre || 'Administrador',
    cliente: cliente.nombre,
    id: orden.id,
  });
  await enviarMensaje(admin.telefono, mensaje);
};

/**
 * Enviar presupuesto al cliente
 */
export const enviarPresupuestoCliente = async (cliente, orden, enlacePago) => {
  const mensaje = formatearMensaje(PLANTILLAS_MENSAJES.presupuesto_listo.cuerpo, {
    cliente: cliente.nombre,
    vehiculo: `${orden.vehiculos?.marca || ''} ${orden.vehiculos?.modelo || ''}`.trim() || 'Vehículo',
    total: orden.total,
    enlace_pago: enlacePago || '#',
  });
  await enviarMensaje(cliente.telefono, mensaje);
};

/**
 * Enviar mensaje de portal del cliente
 */
export const enviarPortalCliente = async (cliente) => {
  const portalUrl = `${window.location.origin}/portal?token=${cliente.token_portal}`;
  const mensaje = formatearMensaje(PLANTILLAS_MENSAJES.bienvenida_portal.cuerpo, {
    cliente: cliente.nombre,
    enlace_portal: portalUrl,
  });
  await enviarMensaje(cliente.telefono, mensaje);
};

/**
 * Enviar recordatorio de suscripción al cliente
 */
export const enviarRecordatorioSuscripcion = async (cliente, suscripcion) => {
  const mensaje = formatearMensaje(PLANTILLAS_MENSAJES.recordatorio_suscripcion.cuerpo, {
    cliente: cliente.nombre,
    precio: suscripcion.precio_mensual,
    fecha: new Date(suscripcion.fecha_proximo_pago).toLocaleDateString('es-SV'),
  });
  await enviarMensaje(cliente.telefono, mensaje);
};

/**
 * Enviar mensaje de cierre de servicio al cliente
 */
export const enviarCierreServicio = async (cliente, orden) => {
  const portalUrl = `${window.location.origin}/portal?token=${cliente.token_portal}`;
  const mensaje = formatearMensaje(PLANTILLAS_MENSAJES.cierre_servicio.cuerpo, {
    cliente: cliente.nombre,
    enlace_portal: portalUrl,
  });
  await enviarMensaje(cliente.telefono, mensaje);
};