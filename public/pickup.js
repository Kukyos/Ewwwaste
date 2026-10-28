// Pickup booking page: validation, geolocation, and sending the request to the backend.

const form = document.getElementById('pickup-form');
const msg = document.getElementById('form-msg');
const list = document.getElementById('request-list');
const empty = document.getElementById('empty');
const locateBtn = document.getElementById('locate-btn');
const locateStatus = document.getElementById('locate-status');
const map = document.getElementById('map');
const itemBoxes = [...form.querySelectorAll('input[name="items"]')];

// ---------- Date: earliest pickup is tomorrow, latest 30 days out ----------
// Built from local date parts, not toISOString(), which is UTC and can be a day off.
function ymd(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
const dateInput = document.getElementById('date');
const day = new Date();
day.setDate(day.getDate() + 1);
dateInput.min = dateInput.value = ymd(day);
day.setDate(day.getDate() + 29);
dateInput.max = ymd(day);

// ---------- Prefill from the scanner (pickup.html?item=battery) and from the profile ----------
const preset = new URLSearchParams(location.search).get('item');
const presetBox = itemBoxes.find((b) => b.value === preset);
if (presetBox) presetBox.checked = true;

api('profile').then(({ user }) => {
  const f = form.elements;
  if (!f.phone.value) f.phone.value = user.phone || '';
  if (!f.address.value) f.address.value = user.address || '';
  if (!f.pincode.value) f.pincode.value = user.pincode || '';
}).catch(() => {});

// ---------- Location ----------
function showMap(lat, lon) {
  const d = 0.004; // about 400 m around the point
  map.hidden = false; // show first: a hidden iframe has zero size and the map only draws one tile
  map.src = `https://www.openstreetmap.org/export/embed.html?bbox=${lon - d},${lat - d},${lon + d},${lat + d}&layer=mapnik&marker=${lat},${lon}`;
}

locateBtn.addEventListener('click', () => {
  if (!('geolocation' in navigator)) {
    locateStatus.textContent = 'Your browser cannot share location. Type the address instead.';
    locateStatus.className = 'hint bad';
    return;
  }
  locateBtn.disabled = true;
  locateStatus.className = 'hint';
  locateStatus.textContent = 'Finding you…';

  navigator.geolocation.getCurrentPosition(async (pos) => {
    const { latitude: lat, longitude: lon, accuracy } = pos.coords;
    form.elements.lat.value = lat.toFixed(6);
    form.elements.lon.value = lon.toFixed(6);
    showMap(lat, lon);
    locateStatus.textContent = `Located (accurate to about ${Math.round(accuracy)} m). Looking up the address…`;

    // Turn coordinates into a street address with OpenStreetMap's free geocoder.
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}`);
      if (!res.ok) throw new Error(res.status);
      const data = await res.json();
      if (data.display_name) form.elements.address.value = data.display_name;
      if (data.address && /^\d{6}$/.test(data.address.postcode || '')) form.elements.pincode.value = data.address.postcode;
      locateStatus.textContent = 'Address filled in. Check it and add your house number.';
    } catch {
      locateStatus.textContent = 'Got your location, but not the street address. Please type it in.';
    }
    locateBtn.disabled = false;
  }, (err) => {
    const reasons = {
      1: 'Location permission was denied.',
      2: 'Your location is unavailable right now.',
      3: 'Finding your location took too long.',
    };
    locateStatus.textContent = `${reasons[err.code] || 'Could not get your location.'} Type the address instead.`;
    locateStatus.className = 'hint bad';
    locateBtn.disabled = false;
  }, { enableHighAccuracy: true, timeout: 15000 });
});

// ---------- Submit ----------
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const f = form.elements;
  const items = itemBoxes.filter((b) => b.checked).map((b) => b.value);

  const errors = checkFields(form, ['address', 'pincode', 'phone']);
  if (!items.length) errors.items = 'Pick at least one item.';
  if (!f.date.value || f.date.value < dateInput.min || f.date.value > dateInput.max) {
    errors.date = 'Pick a date between tomorrow and 30 days from now.';
  }
  if (!f.wiped.checked) errors.wiped = 'Please confirm your data is wiped.';
  showFieldErrors(form, errors);
  if (Object.keys(errors).length) {
    msg.textContent = 'Please fix the highlighted fields.';
    msg.className = 'form-msg bad';
    return;
  }

  const button = form.querySelector('button[type=submit]');
  button.disabled = true;
  msg.className = 'form-msg';
  msg.textContent = 'Booking…';
  try {
    const { pickup } = await api('pickups', { method: 'POST', body: {
      items, size: f.size.value, address: f.address.value.trim(), pincode: f.pincode.value.trim(),
      landmark: f.landmark.value.trim(), lat: f.lat.value || null, lon: f.lon.value || null,
      date: f.date.value, slot: f.slot.value, phone: f.phone.value.trim(), notes: f.notes.value.trim(),
    } });
    form.reset();
    dateInput.value = dateInput.min;
    map.hidden = true;
    locateStatus.textContent = '';
    msg.textContent = `Booked! Your request ID is ${pickup.code}. The collector will call ${pickup.phone} before arriving.`;
    msg.className = 'form-msg ok';
    renderPickups(list, empty, null, pickup._id);
  } catch (err) {
    showFieldErrors(form, err.fields);
    msg.textContent = err.message;
    msg.className = 'form-msg bad';
  }
  button.disabled = false;
});

renderPickups(list, empty);
