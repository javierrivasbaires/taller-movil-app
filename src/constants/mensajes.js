export const PLANTILLAS_MENSAJES = {
    cita_agendada: {
      titulo: 'Cita agendada',
      cuerpo: `¡Hola [cliente]! Hemos agendado tu cita para [fecha] a las [hora]. Ubicación: [direccion]. Abre tu ubicación en el mapa: [enlace_maps].`,
    },
    recordatorio_cita: {
      titulo: 'Recordatorio de cita',
      cuerpo: `Recordatorio: mañana a las [hora] te esperamos para el servicio de tu vehículo en: [direccion]. Confirma tu ubicación: [enlace_maps].`,
    },
    mecanico_en_camino: {
      titulo: 'Mecánico en camino',
      cuerpo: `Hola [cliente], el mecánico ya va en camino a tu ubicación: [direccion]. Sigue su llegada aquí: [enlace_maps].`,
    },
    mecanico_llego: {
      titulo: 'Mecánico ha llegado',
      cuerpo: `Hola [cliente], el mecánico ha llegado a tu ubicación: [direccion]. Te espera para revisar tu vehículo.`,
    },
    presupuesto_listo: {
      titulo: 'Presupuesto listo',
      cuerpo: `Hola [cliente], el presupuesto para tu vehículo [vehiculo] está listo. Total: $[total]. Puedes verlo y pagarlo aquí: [enlace_pago].`,
    },
    cierre_servicio: {
      titulo: 'Servicio completado',
      cuerpo: `Hola [cliente], el servicio de tu vehículo ha sido completado. Puedes descargar tu factura desde tu portal: [enlace_portal]. ¡Gracias por confiar en nosotros!`,
    },
    encuesta_satisfaccion: {
      titulo: 'Encuesta de satisfacción',
      cuerpo: `¿Cómo fue tu experiencia con nuestro mecánico? Tu opinión nos ayuda a mejorar. Responde con un ✅ si quedaste satisfecho.`,
    },
    nueva_orden_asignada: {
      titulo: 'Nueva orden asignada',
      cuerpo: `Hola [mecanico], tienes una nueva orden de trabajo para [cliente] - [vehiculo] el [fecha]. Ubicación: [direccion]. Abre la ubicación: [enlace_maps].`,
    },
    checklist_completado: {
      titulo: 'Checklist completado',
      cuerpo: `Hola [admin], el checklist de mantenimiento para [cliente] (orden #[id]) está completado. Revisa el informe y el presupuesto.`,
    },
    pago_confirmado: {
      titulo: 'Pago confirmado',
      cuerpo: `Pago confirmado: [cliente] ha pagado $[total] por la orden #[id]. Puedes completar la facturación.`,
    },
    recordatorio_suscripcion: {
      titulo: 'Recordatorio de suscripción',
      cuerpo: `Hola [cliente], tu suscripción de $[precio] vence el [fecha]. Realiza tu pago para seguir disfrutando de los beneficios.`,
    },
    suscripcion_nueva: {
      titulo: 'Suscripción activada',
      cuerpo: `¡Felicidades [cliente]! Ya formas parte de nuestro plan de mantenimiento. Tu primera visita preventiva está programada para [fecha]. Puedes ver todos los beneficios en tu portal: [enlace_portal].`,
    },
    suscripcion_renovada: {
      titulo: 'Suscripción renovada',
      cuerpo: `¡Gracias [cliente]! Tu suscripción ha sido renovada por otro mes. Seguimos cuidando tu vehículo.`,
    },
    cliente_inactivo: {
      titulo: 'Cliente inactivo',
      cuerpo: `Hola [cliente], ha pasado un tiempo desde tu última visita. Te ofrecemos un 10% de descuento en tu próximo servicio de mantenimiento. Agenda ahora: [enlace_agenda].`,
    },
    bienvenida_portal: {
      titulo: 'Portal del cliente',
      cuerpo: `Hola [cliente], accede a tu portal para ver el estado de tu vehículo y tu historial: [enlace_portal].`,
    },
  };
  
  export const formatearMensaje = (plantilla, datos) => {
    let mensaje = plantilla;
    Object.keys(datos).forEach((key) => {
      const valor = datos[key] || '';
      mensaje = mensaje.replace(new RegExp(`\\[${key}\\]`, 'g'), valor);
    });
    return mensaje;
  };