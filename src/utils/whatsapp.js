import { PLANTILLAS_MENSAJES, formatearMensaje } from '../constants/mensajes';
import { generarEnlacesMapa } from './ubicacion';

export const enviarMensaje = async (telefono, mensaje) => {
  if (!telefono) {
    console.warn('⚠️ No se pudo enviar mensaje: número de teléfono faltante.');
    return;
  }
  console.log(`📱 Enviando mensaje a ${telefono}:`);
  console.log(mensaje);
  console.log('---');
};

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

export const enviarRecordatorioCita = async (cliente, orden) => {
  const enlaces = generarEnlacesMapa(orden.latitud, orden.longitud);
  const mensaje = formatearMensaje(PLANTILLAS_MENSAJES.recordatorio_cita.cuerpo, {
    hora: new Date(orden.fecha_hora).toLocaleTimeString('es-SV', { hour: '2-digit', minute: '2-digit' }),
    direccion: orden.direccion_servicio || cliente.direccion || 'No especificada',
    enlace_maps: enlaces.googleMaps,
  });
  await enviarMensaje(cliente.telefono, mensaje);
};

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

export const enviarChecklistCompletadoAdmin = async (admin, cliente, orden) => {
  const mensaje = formatearMensaje(PLANTILLAS_MENSAJES.checklist_completado.cuerpo, {
    admin: admin.nombre || 'Administrador',
    cliente: cliente.nombre,
    id: orden.id,
  });
  await enviarMensaje(admin.telefono, mensaje);
};

export const enviarPresupuestoCliente = async (cliente, orden, enlacePago) => {
  const mensaje = formatearMensaje(PLANTILLAS_MENSAJES.presupuesto_listo.cuerpo, {
    cliente: cliente.nombre,
    vehiculo: `${orden.vehiculos?.marca || ''} ${orden.vehiculos?.modelo || ''}`.trim() || 'Vehículo',
    total: orden.total,
    enlace_pago: enlacePago || '#',
  });
  await enviarMensaje(cliente.telefono, mensaje);
};

export const enviarPortalCliente = async (cliente) => {
  const portalUrl = `${window.location.origin}/portal?token=${cliente.token_portal}`;
  const mensaje = formatearMensaje(PLANTILLAS_MENSAJES.bienvenida_portal.cuerpo, {
    cliente: cliente.nombre,
    enlace_portal: portalUrl,
  });
  await enviarMensaje(cliente.telefono, mensaje);
};

export const enviarRecordatorioSuscripcion = async (cliente, suscripcion) => {
  const mensaje = formatearMensaje(PLANTILLAS_MENSAJES.recordatorio_suscripcion.cuerpo, {
    cliente: cliente.nombre,
    precio: suscripcion.precio_mensual,
    fecha: new Date(suscripcion.fecha_proximo_pago).toLocaleDateString('es-SV'),
  });
  await enviarMensaje(cliente.telefono, mensaje);
};

export const enviarCierreServicio = async (cliente, orden) => {
  const portalUrl = `${window.location.origin}/portal?token=${cliente.token_portal}`;
  const mensaje = formatearMensaje(PLANTILLAS_MENSAJES.cierre_servicio.cuerpo, {
    cliente: cliente.nombre,
    enlace_portal: portalUrl,
  });
  await enviarMensaje(cliente.telefono, mensaje);
};