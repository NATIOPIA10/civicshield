/** Opens the spot on OpenStreetMap. */
export const mapLink = (lat: number, lng: number) =>
  `https://www.openstreetmap.org/?mlat=${lat.toFixed(6)}&mlon=${lng.toFixed(6)}#map=18/${lat.toFixed(6)}/${lng.toFixed(6)}`;

/** Driving directions to the spot (OpenStreetMap's route planner, which uses OSRM). The start point is chosen on the page. */
export const directionsLink = (lat: number, lng: number) =>
  `https://www.openstreetmap.org/directions?engine=fossgis_osrm_car&route=${encodeURIComponent(`;${lat.toFixed(6)},${lng.toFixed(6)}`)}`;
