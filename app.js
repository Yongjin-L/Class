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
  let fullPage = false;
  function setFullPage(enabled) {
    fullPage = enabled;
    document.body.classList.toggle('full-page', enabled);
    document.querySelectorAll('.full-page-btn').forEach((button) => {
      button.textContent = enabled ? 'Exit full page' : 'Full page';
      button.setAttribute('aria-pressed', String(enabled));
    });
    sizeCanvas();
    drawWheel();
  }
  document.querySelectorAll('.full-page-btn').forEach((button) => {
    button.addEventListener('click', () => setFullPage(!fullPage));
  });
  window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && fullPage) {
      setFullPage(false);
      document.querySelector('.view.active .full-page-btn').focus();
    }
  });
  function route() {
    if (fullPage) setFullPage(false);
    cancelGroupAnimation();
    const view = (location.hash || '#home').slice(1);
    const target = $('view-' + view) ? view : 'home';
    document.querySelectorAll('.view').forEach((v) => v.classList.toggle('active', v.id === 'view-' + target));
    document.querySelectorAll('.nav-item').forEach((n) => n.classList.toggle('active', n.dataset.view === target));
    $('sidebar').classList.remove('open');
    if (target === 'groups' && !$('groupNames').value.trim()) $('groupNames').value = state.roster.join('\n');
    refresh();
    if (target === 'picker') { sizeCanvas(); loadWheel(); }
  }
  window.addEventListener('hashchange', route);
  $('menuBtn').addEventListener('click', () => $('sidebar').classList.toggle('open'));

  function refresh() {
    const n = state.roster.length;
    $('navCount').textContent = n;
    $('topbarClass').textContent = state.className || (n ? `${n} students` : 'No roster yet');
    $('heroTitle').textContent = state.className ? `Welcome to ${state.className}` : 'Welcome to Class Support';
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
    loadWheel();
    toast(`Roster saved · ${state.roster.length} students`);
  });

  // ---------- Group maker ----------
  let lastGroups = [];
  let groupTimer;
  let grouping = false;
  function setGrouping(busy) {
    grouping = busy;
    ['makeGroupsBtn', 'groupNames', 'groupMode', 'groupValue'].forEach((id) => { $(id).disabled = busy; });
    $('makeGroupsBtn').textContent = busy ? 'Shuffling…' : 'Make groups';
    $('copyGroupsBtn').disabled = busy || !lastGroups.length;
    $('groupsOut').setAttribute('aria-busy', String(busy));
    $('groupShuffle').hidden = !busy;
  }
  function cancelGroupAnimation() {
    if (!grouping) return;
    clearTimeout(groupTimer);
    setGrouping(false);
    $('groupHint').textContent = 'Shuffle cancelled. Make groups to try again.';
  }
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
    if (grouping) return;
    const names = parseNames($('groupNames').value);
    const value = parseInt($('groupValue').value, 10);
    const mode = $('groupMode').value;
    if (!names.length) { $('groupHint').textContent = 'Add some student names first.'; return; }
    if (!value || value < 1) { $('groupHint').textContent = 'Enter a number of 1 or more.'; return; }

    const result = makeGroups(names, mode, value);
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const reveal = () => {
      lastGroups = result;
      const sizes = lastGroups.map((g) => g.length);
      const uneven = Math.min(...sizes) !== Math.max(...sizes);
      $('groupHint').textContent = `${names.length} students → ${lastGroups.length} group${lastGroups.length === 1 ? '' : 's'}` +
        (uneven ? ` (sizes ${Math.min(...sizes)}–${Math.max(...sizes)}, balanced as evenly as possible)` : ` of ${sizes[0]}`);

      $('groupsOut').innerHTML = lastGroups.map((g, i) => `
        <div class="group" style="animation-delay:${Math.min(i * 100, 900)}ms">
          <h3><span><span class="group-dot" style="background:${COLORS[i % COLORS.length]}"></span>Group ${i + 1}</span>
          <span class="muted small">${g.length}</span></h3>
          <ul>${g.map((n) => `<li>${esc(n)}</li>`).join('')}</ul>
        </div>`).join('');
      setGrouping(false);
      state.groupsMade += 1;
      save();
      refresh();
    };
    if (reducedMotion) { reveal(); return; }
    lastGroups = [];
    $('groupsOut').replaceChildren();
    setGrouping(true);
    $('groupHint').textContent = 'Shuffling students into balanced groups…';
    const preview = shuffle(names);
    let step = 0;
    const tick = () => {
      $('shuffleName').textContent = preview[step % preview.length];
      step += 1;
      groupTimer = setTimeout(step < 12 ? tick : reveal, 90 + step * 8);
    };
    tick();
  });

  $('copyGroupsBtn').addEventListener('click', async () => {
    const text = lastGroups.map((g, i) => `Group ${i + 1}: ${g.join(', ')}`).join('\n');
    try { await navigator.clipboard.writeText(text); toast('Groups copied to clipboard'); }
    catch { toast('Copy failed — select and copy manually'); }
  });

  // ---------- Spin the wheel ----------
  const WHEEL_COLORS = ['#f87171', '#fb923c', '#facc15', '#4ade80', '#2dd4bf', '#60a5fa', '#818cf8', '#c084fc', '#f472b6'];
  const TAU = Math.PI * 2;
  const canvas = $('wheel');
  const ctx = canvas.getContext('2d');
  let wheelNames = [];   // segments currently drawn
  let rotation = 0;      // radians; segment i sits under the pointer when -rotation falls in its slice
  let spinning = false;
  let highlight = -1;

  function pickPool() {
    if (!$('noRepeat').checked) return state.roster.slice();
    return state.roster.filter((n) => !state.pickedPool.includes(n));
  }
  function renderHistory() {
    $('history').innerHTML = state.picks.slice().reverse().map((p) => `<li>${esc(p)}</li>`).join('');
    $('remainingLabel').textContent = state.roster.length ? `${pickPool().length} left on wheel` : '';
  }

  function segColor(i, n) {
    let c = i % WHEEL_COLORS.length;
    // Avoid the last slice matching the first one where the wheel wraps around.
    if (i === n - 1 && n > 1 && c === 0) c = 2;
    return WHEEL_COLORS[c];
  }

  function sizeCanvas() {
    const dpr = window.devicePixelRatio || 1;
    const css = canvas.clientWidth || 440;
    canvas.width = canvas.height = Math.round(css * dpr);
  }

  function drawWheel() {
    const size = canvas.width;
    const r = size / 2;
    const n = wheelNames.length;
    ctx.clearRect(0, 0, size, size);
    ctx.save();
    ctx.translate(r, r);

    if (!n) {
      ctx.beginPath();
      ctx.arc(0, 0, r - 4, 0, TAU);
      ctx.fillStyle = '#d4d4d4';
      ctx.fill();
      ctx.restore();
      return;
    }

    const slice = TAU / n;
    ctx.rotate(rotation - Math.PI / 2); // angle 0 points at the pointer (top)
    for (let i = 0; i < n; i++) {
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, r - 4, i * slice, (i + 1) * slice);
      ctx.closePath();
      ctx.fillStyle = segColor(i, n);
      ctx.globalAlpha = highlight === -1 || highlight === i ? 1 : 0.35;
      ctx.fill();
      ctx.globalAlpha = 1;
      if (n > 1) { ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.lineWidth = size / 220; ctx.stroke(); }

      // Name along the middle of the slice
      ctx.save();
      ctx.rotate((i + 0.5) * slice);
      const fontPx = Math.max(size / 48, Math.min(size / 20, (slice * r) * 0.45));
      ctx.font = `600 ${fontPx}px -apple-system, "Segoe UI", Roboto, sans-serif`;
      ctx.fillStyle = '#1f1f1f';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      let label = wheelNames[i];
      const maxW = r * 0.66;
      while (ctx.measureText(label).width > maxW && label.length > 3) label = label.slice(0, -2) + '…';
      ctx.fillText(label, r - size / 28, 0);
      ctx.restore();
    }
    ctx.restore();

    // Outer ring
    ctx.beginPath();
    ctx.arc(r, r, r - 4, 0, TAU);
    ctx.lineWidth = size / 70;
    ctx.strokeStyle = '#fff';
    ctx.stroke();
  }

  function loadWheel() {
    if (spinning) return;
    const pool = pickPool();
    wheelNames = pool.length ? shuffle(pool) : [];
    highlight = -1;
    drawWheel();
    if (!state.roster.length) {
      $('winnerLabel').innerHTML = 'Your roster is empty. <a href="#roster"><u>Add students</u></a> to fill the wheel.';
      $('winnerName').textContent = '';
    }
  }

  function confetti() {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    for (let i = 0; i < 60; i++) {
      const c = document.createElement('div');
      c.className = 'confetti';
      c.style.left = Math.random() * 100 + 'vw';
      c.style.background = WHEEL_COLORS[i % WHEEL_COLORS.length];
      c.style.animationDuration = 1.6 + Math.random() * 1.6 + 's';
      c.style.animationDelay = Math.random() * 0.3 + 's';
      document.body.appendChild(c);
      setTimeout(() => c.remove(), 3800);
    }
  }

  function spin() {
    if (spinning) return;
    if (!state.roster.length) { loadWheel(); return; }
    if (!pickPool().length) {
      // New round, but don't let the student just picked come up again straight away.
      const last = state.picks[state.picks.length - 1];
      state.pickedPool = state.roster.length > 1 && state.roster.includes(last) ? [last] : [];
      toast('Everyone has had a turn. Starting a new round!');
    }
    loadWheel();

    const n = wheelNames.length;
    const slice = TAU / n;
    const target = Math.floor(Math.random() * n);
    // Land somewhere inside the target slice (not exactly on its edge).
    const offset = (target + 0.5 + (Math.random() - 0.5) * 0.7) * slice;
    const current = ((rotation % TAU) + TAU) % TAU;
    const desired = ((TAU - offset) % TAU + TAU) % TAU;
    const extraTurns = 5 + Math.floor(Math.random() * 3);
    const start = rotation;
    const delta = extraTurns * TAU + ((desired - current + TAU) % TAU);
    const duration = 4200 + Math.random() * 1200;
    const t0 = performance.now();

    spinning = true;
    $('pickBtn').disabled = $('hubBtn').disabled = true;
    $('winnerLabel').textContent = 'Spinning…';
    $('winnerName').textContent = '';
    $('winnerName').classList.remove('pop');
    $('pickerHint').textContent = '';

    const frame = (now) => {
      const t = Math.min(1, (now - t0) / duration);
      const eased = 1 - Math.pow(1 - t, 4); // ease-out quart
      rotation = start + delta * eased;
      drawWheel();
      if (t < 1) { requestAnimationFrame(frame); return; }

      const winner = wheelNames[target];
      highlight = target;
      drawWheel();
      $('winnerLabel').textContent = 'You’re up!';
      $('winnerName').textContent = winner;
      void $('winnerName').offsetWidth;
      $('winnerName').classList.add('pop');
      confetti();
      state.picks.push(winner);
      if (!state.pickedPool.includes(winner)) state.pickedPool.push(winner);
      save();
      spinning = false;
      $('pickBtn').disabled = $('hubBtn').disabled = false;
      refresh(); // wheel keeps showing the winner until the next spin
    };
    requestAnimationFrame(frame);
  }

  $('pickBtn').addEventListener('click', spin);
  $('hubBtn').addEventListener('click', spin);
  $('resetPickBtn').addEventListener('click', () => {
    if (spinning) return;
    state.picks = [];
    state.pickedPool = [];
    save();
    $('winnerLabel').textContent = 'Press spin to pick a student';
    $('winnerName').textContent = '';
    refresh();
    loadWheel();
  });
  $('noRepeat').addEventListener('change', () => { refresh(); loadWheel(); });
  window.addEventListener('resize', () => { sizeCanvas(); drawWheel(); });

  $('heroDate').textContent = new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
  syncGroupLabel();
  route();
})();
