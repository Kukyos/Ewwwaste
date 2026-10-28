// Renders the logged-in user's pickup requests (used on the pickup and profile pages).

const ITEM_NAMES = {
  phone: 'Phone / tablet', laptop: 'Laptop / computer', display: 'TV / monitor', battery: 'Batteries',
  charger: 'Chargers', cable: 'Cables', pcb: 'Circuit boards', storage: 'Hard drives',
  audio: 'Audio devices', lamp: 'Lamps / bulbs', peripheral: 'Small electronics',
};
const SIZE_NAMES = { small: 'Small bag', box: 'A box', large: 'Large items' };
const SLOT_NAMES = { '9-12': '9 am – 12 pm', '12-3': '12 pm – 3 pm', '3-6': '3 pm – 6 pm' };

const prettyDate = (s) => new Date(s + 'T00:00').toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });

function el(tag, className, text) {
  const e = document.createElement(tag);
  if (className) e.className = className;
  if (text !== undefined) e.textContent = text;
  return e;
}

// onChange runs after a cancel, so the page can refresh anything else (e.g. profile stats).
async function renderPickups(list, empty, onChange, flashId) {
  let pickups;
  try {
    ({ pickups } = await api('pickups'));
  } catch (err) {
    list.replaceChildren(el('li', 'hint bad', err.message));
    return;
  }
  empty.hidden = pickups.length > 0;
  list.replaceChildren(...pickups.map((p) => {
    const li = el('li', p.status === 'cancelled' ? 'is-cancelled' : '');
    if (p._id === flashId) li.classList.add('flash');

    const head = el('div', 'head');
    head.append(el('span', 'id', p.code), el('span', `status ${p.status}`, p.status));
    li.append(
      head,
      el('div', '', `${prettyDate(p.date)}, ${SLOT_NAMES[p.slot] || p.slot}`),
      el('div', 'meta', `${p.items.map((i) => ITEM_NAMES[i] || i).join(', ')} · ${SIZE_NAMES[p.size] || p.size}`),
      el('div', 'meta', `${p.address} – ${p.pincode}`),
    );

    if (p.status === 'scheduled') {
      const cancel = el('button', 'btn small', 'Cancel pickup');
      cancel.type = 'button';
      cancel.addEventListener('click', async () => {
        cancel.disabled = true;
        try {
          await api(`pickups?id=${p._id}`, { method: 'PATCH', body: { status: 'cancelled' } });
          renderPickups(list, empty, onChange);
          if (onChange) onChange();
        } catch (err) {
          cancel.disabled = false;
          cancel.textContent = err.message;
        }
      });
      li.append(cancel);
    }
    return li;
  }));
}
