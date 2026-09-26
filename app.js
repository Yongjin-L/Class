(() => {
  const $ = (id) => document.getElementById(id);
  const STORE_KEY = 'class-support-v1';
  const COLORS = ['#36a2eb', '#ff6384', '#4bc0c0', '#ff9f40', '#9966ff', '#ffcd56', '#2ecc71', '#e67e22', '#8e44ad', '#16a085'];
  const SAMPLE = ['Alex Kim', 'Jordan Lee', 'Sam Patel', 'Taylor Nguyen', 'Morgan Garcia', 'Casey Johnson',
    'Riley Chen', 'Jamie Smith', 'Avery Brown', 'Quinn Davis', 'Drew Wilson', 'Parker Martinez',
    'Reese Lopez', 'Skyler Clark', 'Harper Lewis', 'Emerson Hall'];

  // ---------- State ----------
  const state = load();
  function load() {
    const fallback = { className: '', roster: [], groupsMade: 0, picks: [], pickDay: today(), pickedPool: [] };
    try {
      const saved = JSON.parse(localStorage.getItem(STORE_KEY));
      return saved ? { ...fallback, ...saved } : fallback;
    } catch { return fallback; }
  }
  function save() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch { /* storage unavailable */ }
  }
  function today() { return new Date().toISOString().slice(0, 10); }
  if (state.pickDay !== today()) { state.picks = []; state.pickDay = today(); }

  // ---------- Helpers ----------
  const parseNames = (text) => [...new Set(
    text.split(/[\n,;]+/).map((s) => s.trim()).filter(Boolean)
  )];
  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }
  const esc = (s) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  let toastTimer;
  function toast(msg) {
    const t = $('toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('show'), 1800);
  }

  // ---------- Navigation ----------
  function route() {
    const view = (location.hash || '#home').slice(1);
    const target = $('view-' + view) ? view : 'home';
    document.querySelectorAll('.view').forEach((v) => v.classList.toggle('active', v.id === 'view-' + target));
    document.querySelectorAll('.nav-item').forEach((n) => n.classList.toggle('active', n.dataset.view === target));
    $('sidebar').classList.remove('open');
    if (target === 'groups' && !$('groupNames').value.trim()) $('groupNames').value = state.roster.join('\n');
    refresh();
  }
  window.addEventListener('hashchange', route);
  $('menuBtn').addEventListener('click', () => $('sidebar').classList.toggle('open'));

  function refresh() {
    const n = state.roster.length;
    $('navCount').textContent = n;
    $('topbarClass').textContent = state.className || (n ? `${n} students` : 'No roster yet');
    $('statStudents').textContent = n;
    $('statGroups').textContent = state.groupsMade;
    $('statPicks').textContent = state.picks.length;
    $('statRemaining').textContent = pickPool().length;
    renderHistory();
  }

  // ---------- Roster ----------
  $('className').value = state.className;
  $('rosterInput').value = state.roster.join('\n');
  const updateRosterCount = () => {
    const c = parseNames($('rosterInput').value).length;
    $('rosterCount').textContent = `${c} student${c === 1 ? '' : 's'}`;
  };
  updateRosterCount();
  $('rosterInput').addEventListener('input', updateRosterCount);
  $('sampleBtn').addEventListener('click', () => { $('rosterInput').value = SAMPLE.join('\n'); updateRosterCount(); });
  $('clearRosterBtn').addEventListener('click', () => { $('rosterInput').value = ''; updateRosterCount(); });
  $('saveRosterBtn').addEventListener('click', () => {
    state.className = $('className').value.trim();
    state.roster = parseNames($('rosterInput').value);
    state.pickedPool = state.pickedPool.filter((p) => state.roster.includes(p));
    $('rosterInput').value = state.roster.join('\n');
    $('groupNames').value = state.roster.join('\n');
    save();
    refresh();
    toast(`Roster saved · ${state.roster.length} students`);
  });

  // ---------- Group maker ----------
  let lastGroups = [];
  const syncGroupLabel = () => {
    $('groupValueLabel').textContent = $('groupMode').value === 'size' ? 'Members per group' : 'Number of groups';
  };
  $('groupMode').addEventListener('change', syncGroupLabel);

  function makeGroups(names, mode, value) {
    const count = mode === 'size' ? Math.ceil(names.length / value) : Math.min(value, names.length);
    const groups = Array.from({ length: count }, () => []);
    // Deal shuffled names round-robin so group sizes differ by at most one.
    shuffle(names).forEach((name, i) => groups[i % count].push(name));
    return groups;
  }

  $('makeGroupsBtn').addEventListener('click', () => {
    const names = parseNames($('groupNames').value);
    const value = parseInt($('groupValue').value, 10);
    const mode = $('groupMode').value;
    if (!names.length) { $('groupHint').textContent = 'Add some student names first.'; return; }
    if (!value || value < 1) { $('groupHint').textContent = 'Enter a number of 1 or more.'; return; }

    lastGroups = makeGroups(names, mode, value);
    const sizes = lastGroups.map((g) => g.length);
    const uneven = Math.min(...sizes) !== Math.max(...sizes);
    $('groupHint').textContent = `${names.length} students → ${lastGroups.length} group${lastGroups.length === 1 ? '' : 's'}` +
      (uneven ? ` (sizes ${Math.min(...sizes)}–${Math.max(...sizes)}, balanced as evenly as possible)` : ` of ${sizes[0]}`);

    $('groupsOut').innerHTML = lastGroups.map((g, i) => `
      <div class="group" style="animation-delay:${i * 40}ms">
        <h3><span><span class="group-dot" style="background:${COLORS[i % COLORS.length]}"></span>Group ${i + 1}</span>
        <span class="muted small">${g.length}</span></h3>
        <ul>${g.map((n) => `<li>${esc(n)}</li>`).join('')}</ul>
      </div>`).join('');
    $('copyGroupsBtn').disabled = false;
    state.groupsMade += 1;
    save();
    refresh();
  });

  $('copyGroupsBtn').addEventListener('click', async () => {
    const text = lastGroups.map((g, i) => `Group ${i + 1}: ${g.join(', ')}`).join('\n');
    try { await navigator.clipboard.writeText(text); toast('Groups copied to clipboard'); }
    catch { toast('Copy failed — select and copy manually'); }
  });

  // ---------- Random picker ----------
  function pickPool() {
    if (!$('noRepeat').checked) return state.roster.slice();
    return state.roster.filter((n) => !state.pickedPool.includes(n));
  }
  function renderHistory() {
    $('history').innerHTML = state.picks.slice().reverse().map((p) => `<li>${esc(p)}</li>`).join('');
    $('remainingLabel').textContent = state.roster.length ? `${pickPool().length} left` : '';
  }

  let rolling = false;
  $('pickBtn').addEventListener('click', () => {
    if (rolling) return;
    if (!state.roster.length) { $('pickerHint').innerHTML = 'Your roster is empty — <a href="#roster"><u>add students</u></a>.'; return; }
    let pool = pickPool();
    if (!pool.length) {
      state.pickedPool = [];
      pool = pickPool();
      toast('Everyone has been picked — starting a new round');
    }
    $('pickerHint').textContent = '';
    const winner = pool[Math.floor(Math.random() * pool.length)];
    const nameEl = $('pickerName');
    rolling = true;
    $('pickBtn').disabled = true;
    nameEl.className = 'picker-name rolling';

    // Slow down gradually, like a spinning wheel.
    let delay = 40;
    const tick = () => {
      if (delay < 320) {
        nameEl.textContent = state.roster[Math.floor(Math.random() * state.roster.length)];
        delay *= 1.15;
        setTimeout(tick, delay);
      } else {
        nameEl.textContent = winner;
        nameEl.className = 'picker-name winner';
        state.picks.push(winner);
        if (!state.pickedPool.includes(winner)) state.pickedPool.push(winner);
        save();
        refresh();
        rolling = false;
        $('pickBtn').disabled = false;
      }
    };
    tick();
  });

  $('resetPickBtn').addEventListener('click', () => {
    state.picks = [];
    state.pickedPool = [];
    $('pickerName').textContent = 'Ready?';
    $('pickerName').className = 'picker-name';
    save();
    refresh();
  });
  $('noRepeat').addEventListener('change', refresh);

  syncGroupLabel();
  route();
})();
