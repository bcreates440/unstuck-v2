// Measurement formatting, governed by Settings. The app stores everything internally
// in metric/Celsius (weather gating, distances); this layer is display-only, so a user
// in any country can read temperatures and distances in their own units.
//
// Methods reference the global `Units`/`Settings` (not `this`), so they can be passed
// around as bare functions (e.g. handed to the engine via ambient.fmt).
const Units = {
  tempUnit() { return Settings.get('tempUnit') || 'C'; },
  system() { return Settings.get('units') || 'metric'; },

  // Celsius in -> formatted string in the user's chosen unit.
  temp(c) {
    if (c == null) return '';
    if (Units.tempUnit() === 'F') return `${Math.round(c * 9 / 5 + 32)}°F`;
    return `${Math.round(c)}°C`;
  },

  // metres in -> friendly distance in the user's chosen system.
  distance(m) {
    if (m == null) return '';
    if (Units.system() === 'imperial') {
      const ft = m * 3.28084;
      if (ft < 528) return `${Math.round(ft / 10) * 10} ft`; // round to 10 ft
      return `${(m / 1609.344).toFixed(1)} mi`;
    }
    if (m < 950) return `${Math.round(m / 10) * 10} m`; // round to 10 m
    return `${(m / 1000).toFixed(1)} km`;
  },

  // centimetres in -> short length (for object-sized instructions).
  smallLen(cm) {
    if (cm == null) return '';
    if (Units.system() === 'imperial') return `${Math.round(cm / 2.54)} in`;
    return `${Math.round(cm)} cm`;
  },
};
