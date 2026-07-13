export const generarEnlaceGoogleMaps = (lat, lng) => {
    if (!lat || !lng) return '';
    return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
  };
  
  export const generarEnlaceWaze = (lat, lng) => {
    if (!lat || !lng) return '';
    return `https://waze.com/ul?ll=${lat},${lng}&navigate=yes`;
  };
  
  export const generarEnlacesMapa = (lat, lng) => {
    return {
      googleMaps: generarEnlaceGoogleMaps(lat, lng),
      waze: generarEnlaceWaze(lat, lng),
    };
  };