import { useState, useEffect, useRef } from 'react';

const API = '';

function genId() {
  return Math.random().toString(36).substring(2, 10);
}

function fmt(n) {
  return '$' + Number(n || 0).toFixed(2);
}

function fmtDate(d) {
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

// Storage helpers
function load(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) || fallback; }
  catch { return fallback; }
}
function save(key, val) { localStorage.setItem(key, JSON.stringify(val)); }

export default function App() {
  const [token, setToken] = useState(localStorage.getItem('pokescan-token') || '');
  const [view, setView] = useState('scan'); // scan | inventory | log
  const [mode, setMode] = useState('sell');
  const [batch, setBatch] = useState([]);
  const [scanning, setScanning] = useState(false);
  const [inventory, setInventory] = useState(() => load('pokescan-inventory', []));
  const [log, setLog] = useState(() => load('pokescan-log', []));
  const [showConfirm, setShowConfirm] = useState(false);
  const [toast, setToast] = useState(null);
  const [search, setSearch] = useState('');
  const [loginPw, setLoginPw] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const fileRef = useRef();

  useEffect(() => { save('pokescan-inventory', inventory); }, [inventory]);
  useEffect(() => { save('pokescan-log', log); }, [log]);

  function showToast(msg, type) {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }

  // Auth
  async function handleLogin(e) {
    e.preventDefault();
    setLoginLoading(true);
    setLoginError('');
    try {
      const res = await fetch(API + '/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: loginPw }),
      });
      if (!res.ok) { setLoginError('Wrong password'); return; }
      const { token: t } = await res.json();
      localStorage.setItem('pokescan-token', t);
      setToken(t);
    } catch { setLoginError('Connection error'); }
    finally { setLoginLoading(false); }
  }

  function logout() {
    localStorage.removeItem('pokescan-token');
    setToken('');
  }

  // Camera
  function handleSnap() { fileRef.current?.click(); }

  async function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    setScanning(true);
    try {
      const base64 = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result.split(',')[1]);
        reader.readAsDataURL(file);
      });
      const res = await fetch(API + '/api/scan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + token,
        },
        body: JSON.stringify({ image: base64, media_type: file.type || 'image/jpeg' }),
      });
      if (!res.ok) throw new Error('Scan failed');
      const { cards } = await res.json();
      const newCards = (cards || []).map(c => ({
        ...c,
        id: genId(),
        price: c.price != null ? Number(c.price) : null,
      }));
      setBatch(prev => [...prev, ...newCards]);
    } catch (err) {
      showToast('Scan failed — try again', 'buy');
    }
    setScanning(false);
  }

  function updateCardPrice(id, val) {
    setBatch(prev => prev.map(c => c.id === id ? { ...c, price: val === '' ? null : Number(val) } : c));
  }

  function removeCard(id) {
    setBatch(prev => prev.filter(c => c.id !== id));
  }

  // Complete transaction
  function handleComplete() {
    const allPriced = batch.every(c => c.price != null && c.price >= 0);
    if (!allPriced) return;
    setShowConfirm(true);
  }

  function confirmTransaction() {
    const now = new Date().toISOString();
    const total = batch.reduce((s, c) => s + (c.price || 0), 0);

    if (mode === 'sell') {
      // Remove from inventory — for now just log the sale
      const entry = {
        type: 'sell',
        cards: batch.map(c => ({ name: c.name, set: c.set, number: c.number, price: c.price })),
        count: batch.length,
        total,
        date: now,
      };
      setLog(prev => [entry, ...prev]);
      showToast(`Sold ${batch.length} cards — ${fmt(total)}`, 'sell');
    } else {
      // Add to inventory
      const newCards = batch.map(c => ({
        id: genId(),
        name: c.name,
        set: c.set || '',
        number: c.number || '',
        price: c.price,
        cost: c.price,
        condition: c.condition || 'NM',
        notes: c.notes || '',
        addedAt: now,
      }));
      setInventory(prev => [...newCards, ...prev]);
      const entry = {
        type: 'buy',
        cards: batch.map(c => ({ name: c.name, set: c.set, number: c.number, price: c.price })),
        count: batch.length,
        total,
        date: now,
      };
      setLog(prev => [entry, ...prev]);
      showToast(`Bought ${batch.length} cards — ${fmt(total)}`, 'buy');
    }

    setBatch([]);
    setShowConfirm(false);
  }

  // Export / Import
  function exportData() {
    const data = { inventory, log, exportedAt: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pokescan-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function importData() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const data = JSON.parse(reader.result);
          if (data.inventory) setInventory(data.inventory);
          if (data.log) setLog(data.log);
          showToast('Data imported', 'sell');
        } catch { showToast('Invalid backup file', 'buy'); }
      };
      reader.readAsText(file);
    };
    input.click();
  }

  // Login screen
  if (!token) {
    return (
      <div className="app">
        <form className="login-screen" onSubmit={handleLogin}>
          <h1>PokeScan</h1>
          <input
            type="password"
            placeholder="Password"
            value={loginPw}
            onChange={e => setLoginPw(e.target.value)}
            autoFocus
          />
          <button className="login-btn" type="submit" disabled={loginLoading}>
            {loginLoading ? 'Checking...' : 'Enter'}
          </button>
          {loginError && <div className="login-error">{loginError}</div>}
        </form>
      </div>
    );
  }

  // Inventory view
  if (view === 'inventory') {
    const filtered = inventory.filter(c => {
      const q = search.toLowerCase();
      return !q || c.name.toLowerCase().includes(q) || (c.set || '').toLowerCase().includes(q) || (c.number || '').includes(q);
    });
    const totalValue = inventory.reduce((s, c) => s + (c.price || 0), 0);
    const totalCost = inventory.reduce((s, c) => s + (c.cost || 0), 0);

    return (
      <div className="app">
        <div className="view-header">
          <button className="back-btn" onClick={() => { setView('scan'); setSearch(''); }}>&larr;</button>
          <h1>Inventory</h1>
          <span className="header-badge">{inventory.length}</span>
        </div>
        <input className="search-bar" placeholder="Search cards..." value={search} onChange={e => setSearch(e.target.value)} />
        <div className="stat-boxes">
          <div className="stat-box"><div className="label">Total Value</div><div className="value green">{fmt(totalValue)}</div></div>
          <div className="stat-box"><div className="label">Total Cost</div><div className="value amber">{fmt(totalCost)}</div></div>
        </div>
        {filtered.length === 0 && <div className="empty-state">No cards in inventory</div>}
        {filtered.map(c => (
          <div key={c.id} className="inv-item">
            <div>
              <div className="inv-name">{c.name}</div>
              <div className="inv-sub">{[c.set, c.number, c.condition, c.notes].filter(Boolean).join(' · ')} · {fmtDate(c.addedAt)}</div>
            </div>
            <div className="inv-price">{fmt(c.price)}</div>
          </div>
        ))}
        <div className="data-btns">
          <button className="data-btn" onClick={exportData}>Export Data</button>
          <button className="data-btn" onClick={importData}>Import Data</button>
        </div>
      </div>
    );
  }

  // Activity Log view
  if (view === 'log') {
    const totalSold = log.filter(e => e.type === 'sell').reduce((s, e) => s + e.total, 0);
    const totalBought = log.filter(e => e.type === 'buy').reduce((s, e) => s + e.total, 0);

    return (
      <div className="app">
        <div className="view-header">
          <button className="back-btn" onClick={() => setView('scan')}>&larr;</button>
          <h1>Activity Log</h1>
        </div>
        <div className="stat-boxes">
          <div className="stat-box"><div className="label">Total Sold</div><div className="value green">{fmt(totalSold)}</div></div>
          <div className="stat-box"><div className="label">Total Bought</div><div className="value red">{fmt(totalBought)}</div></div>
        </div>
        {log.length === 0 && <div className="empty-state">No activity yet</div>}
        {log.map((entry, i) => (
          <div key={i} className="log-entry">
            <div className="log-header">
              <span className={`log-badge ${entry.type}`}>{entry.type === 'sell' ? 'SOLD' : 'BOUGHT'}</span>
              <span className={`log-amount ${entry.type}`}>{fmt(entry.total)}</span>
            </div>
            <div className="log-detail">{entry.count} cards · {fmtDate(entry.date)}</div>
            <div className="log-cards">{entry.cards.map(c => c.name).join(', ')}</div>
          </div>
        ))}
      </div>
    );
  }

  // Scan view (main)
  const needsPricing = batch.filter(c => c.price == null).length;
  const allPriced = batch.length > 0 && needsPricing === 0;
  const batchTotal = batch.reduce((s, c) => s + (c.price || 0), 0);

  return (
    <div className="app">
      <div className="header">
        <h1>PokeScan</h1>
        <div className="header-right">
          <span className="header-badge">{inventory.length} cards</span>
          <button className="nav-btn" onClick={() => setView('inventory')} title="Inventory">📦</button>
          <button className="nav-btn" onClick={() => setView('log')} title="Activity Log">📊</button>
          <button className="logout-btn" onClick={logout}>Logout</button>
        </div>
      </div>

      <div className="mode-toggle">
        <button
          className={`mode-btn ${mode === 'buy' ? 'buy-active' : ''}`}
          onClick={() => { setMode('buy'); setBatch([]); }}
        >
          🛒 Buying
        </button>
        <button
          className={`mode-btn ${mode === 'sell' ? 'sell-active' : ''}`}
          onClick={() => { setMode('sell'); setBatch([]); }}
        >
          💰 Selling
        </button>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="file-input"
        onChange={handleFile}
      />
      <button className="snap-btn" onClick={handleSnap} disabled={scanning}>
        📸 Snap Cards
      </button>

      {scanning && <div className="scanning">Scanning cards...</div>}

      {batch.map(card => (
        <div key={card.id} className="card-item">
          <div className="card-info">
            <div className="card-name">{card.name}</div>
            <div className="card-sub">
              {[card.set, card.number, card.condition, card.notes].filter(Boolean).join(' · ')}
            </div>
          </div>
          <input
            type="number"
            step="0.01"
            min="0"
            className={`card-price-input ${card.price == null ? 'needs-price' : ''}`}
            placeholder="$0.00"
            value={card.price != null ? card.price : ''}
            onChange={e => updateCardPrice(card.id, e.target.value)}
          />
          <button className="card-remove" onClick={() => removeCard(card.id)}>✕</button>
        </div>
      ))}

      {batch.length > 0 && (
        <>
          <div className="batch-summary">
            <div className="count">{batch.length} cards scanned</div>
            {needsPricing > 0 && <div className="needs-pricing">{needsPricing} needs pricing</div>}
            <div className="total">{fmt(batchTotal)}</div>
          </div>
          <div className="action-row">
            <button className="clear-btn" onClick={() => setBatch([])}>Clear</button>
            <button
              className={`complete-btn ${mode}`}
              disabled={!allPriced}
              onClick={handleComplete}
            >
              {mode === 'sell' ? 'Complete Sale' : 'Complete Purchase'}
            </button>
          </div>
        </>
      )}

      {showConfirm && (
        <div className="overlay">
          <div className="overlay-box">
            <h2>{mode === 'sell' ? 'Confirm Sale' : 'Confirm Purchase'}</h2>
            <div className="detail">{batch.length} cards</div>
            <div className="amount">{fmt(batchTotal)}</div>
            <div className="overlay-btns">
              <button className="overlay-back" onClick={() => setShowConfirm(false)}>Back</button>
              <button className={`overlay-confirm ${mode === 'buy' ? 'buy' : ''}`} onClick={confirmTransaction}>
                ✓ Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && <div className={`toast ${toast.type}`}>{toast.msg}</div>}
    </div>
  );
}
