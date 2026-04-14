import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../helpers/api';

// Notification mode definitions
const NOTIFY_MODES = [
  {
    value: 'once',
    emoji: '🔕',
    label: 'Sekali Saja',
    desc: 'Kirim 1 notifikasi per siklus stok. Notif kembali dikirim hanya jika stok sudah habis lalu tersedia lagi.',
    color: 'text-base-content',
    badge: null
  },
  {
    value: 'smart',
    emoji: '🧠',
    label: 'Smart',
    desc: 'Kirim ulang setelah cooldown dan batasi jumlah notifikasi per hari. Direkomendasikan.',
    color: 'text-primary',
    badge: 'Recommended'
  },
  {
    value: 'unlimited',
    emoji: '⚡',
    label: 'Selalu',
    desc: 'Kirim notifikasi setiap kali stok baru terdeteksi. Tidak ada pembatasan.',
    color: 'text-warning',
    badge: 'Tidak disarankan'
  }
];

// Cooldown preset options (in minutes)
const COOLDOWN_OPTIONS = [
  { value: 5,   label: '5 menit' },
  { value: 10,  label: '10 menit' },
  { value: 15,  label: '15 menit' },
  { value: 30,  label: '30 menit' },
  { value: 60,  label: '1 jam' },
  { value: 120, label: '2 jam' }
];

const DEFAULT_FORM = {
  locationIds: [],
  targetWeights: [],
  isActive: true,
  notifyMode: 'smart',
  cooldownMinutes: 30,
  maxDailyNotify: 5
};

export default function Settings() {
  const [boutiques, setBoutiques] = useState([]);
  const [weightOptions, setWeightOptions] = useState([]);
  const [formData, setFormData] = useState(DEFAULT_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [dailyError, setDailyError] = useState('');
  const navigate = useNavigate();

  // ─── Data Fetching ────────────────────────────────────────────────────────

  async function fetchData() {
    try {
      const token = localStorage.getItem('access_token');
      if (!token) { navigate('/login'); return; }

      const [settingsRes, boutiquesRes, weightsRes] = await Promise.all([
        api.get('/api/settings').catch(() => ({ data: { data: null } })),
        api.get('/api/master/boutiques'),
        api.get('/api/master/weights')
      ]);

      setBoutiques(boutiquesRes.data.data || []);
      setWeightOptions(weightsRes.data.data || []);

      if (settingsRes.data.data) {
        const s = settingsRes.data.data;
        setFormData({
          locationIds: s.locationIds || (s.locationId ? [s.locationId] : []),
          targetWeights: s.targetWeights || [],
          isActive: s.isActive ?? true,
          notifyMode: s.notifyMode || 'smart',
          cooldownMinutes: s.cooldownMinutes || 30,
          maxDailyNotify: s.maxDailyNotify || 5
        });
      }
    } catch (err) {
      console.error('Error fetching data:', err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchData(); }, []);

  // ─── Handlers ─────────────────────────────────────────────────────────────

  function handleLocationToggle(locationId) {
    const current = formData.locationIds || [];
    if (current.includes(locationId)) {
      setFormData({ ...formData, locationIds: current.filter(id => id !== locationId) });
    } else {
      if (current.length >= 5) {
        showMessage('error', 'Maksimal 5 lokasi yang dapat dipantau');
        return;
      }
      setFormData({ ...formData, locationIds: [...current, locationId] });
    }
  }

  function handleWeightToggle(weight) {
    const weights = formData.targetWeights.includes(weight)
      ? formData.targetWeights.filter(w => w !== weight)
      : [...formData.targetWeights, weight];
    setFormData({ ...formData, targetWeights: weights });
  }

  function handleModeChange(mode) {
    setFormData({ ...formData, notifyMode: mode });
    setDailyError('');
  }

  function handleDailyChange(val) {
    const n = parseInt(val);
    if (isNaN(n) || val === '') {
      setFormData({ ...formData, maxDailyNotify: val });
      setDailyError('Masukkan angka yang valid');
      return;
    }
    if (n < 1) {
      setFormData({ ...formData, maxDailyNotify: n });
      setDailyError('Minimal 1 notifikasi per hari');
      return;
    }
    if (n > 20) {
      setFormData({ ...formData, maxDailyNotify: n });
      setDailyError('Maksimal 20 notifikasi per hari');
      return;
    }
    setFormData({ ...formData, maxDailyNotify: n });
    setDailyError('');
  }

  function showMessage(type, text) {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 3500);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (dailyError) return;
    setSaving(true);
    setMessage({ type: '', text: '' });

    try {
      await api.put('/api/settings', formData);
      showMessage('success', '✅ Preferensi berhasil disimpan');
    } catch (err) {
      showMessage('error', err.response?.data?.message || 'Gagal menyimpan settings');
    } finally {
      setSaving(false);
    }
  }

  // ─── Loading State ────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <span className="loading loading-spinner loading-lg text-primary"></span>
        <p className="text-base-content/50">Memuat pengaturan...</p>
      </div>
    );
  }

  const currentModeObj = NOTIFY_MODES.find(m => m.value === formData.notifyMode) || NOTIFY_MODES[1];
  const isSmartMode = formData.notifyMode === 'smart';
  const isOnceMode = formData.notifyMode === 'once';
  const isUnlimitedMode = formData.notifyMode === 'unlimited';

  // ─── Render ─────────────────────────────────────────────────────────────

  return (
    <div className="pb-20 max-w-xl mx-auto space-y-6">
      <div className="px-4 lg:px-0">
        <h1 className="text-2xl font-bold hidden lg:block mb-2">Settings</h1>
        <p className="text-base-content/60 hidden lg:block">Sesuaikan preferensi monitoring Anda</p>
      </div>

      {/* Toast message */}
      {message.text && (
        <div className="toast toast-top toast-center z-50">
          <div className={`alert ${message.type === 'success' ? 'alert-success' : 'alert-error'}`}>
            <span>{message.text}</span>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">

        {/* ── Monitoring Toggle ─────────────────────────────────────── */}
        <div className="card bg-base-100 shadow-sm border border-base-200">
          <div className="card-body p-4 sm:p-6">
            <div className="form-control">
              <label className="label cursor-pointer justify-between">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${formData.isActive ? 'bg-primary/10 text-primary' : 'bg-base-200 text-base-content/40'}`}>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                    </svg>
                  </div>
                  <div>
                    <span className="font-semibold block text-lg">Monitoring Aktif</span>
                    <span className="text-sm text-base-content/60">Terima notifikasi Telegram saat tersedia</span>
                  </div>
                </div>
                <input
                  type="checkbox"
                  className="toggle toggle-primary toggle-lg"
                  checked={formData.isActive}
                  onChange={() => setFormData({ ...formData, isActive: !formData.isActive })}
                />
              </label>
            </div>
          </div>
        </div>

        {/* ── Notification Config ───────────────────────────────────── */}
        <div className="card bg-base-100 shadow-sm border border-base-200">
          <div className="card-body p-4 sm:p-6">
            <h2 className="card-title text-base mb-1 flex items-center gap-2">
              <span className="text-xl">🔔</span> Mode Notifikasi
            </h2>
            <p className="text-sm text-base-content/60 mb-4">
              Atur seberapa sering Anda ingin mendapat notifikasi
            </p>

            {/* Mode Cards */}
            <div className="flex flex-col gap-3">
              {NOTIFY_MODES.map(mode => {
                const isSelected = formData.notifyMode === mode.value;
                return (
                  <button
                    key={mode.value}
                    type="button"
                    onClick={() => handleModeChange(mode.value)}
                    className={`w-full text-left rounded-xl border-2 p-4 transition-all duration-200 ${
                      isSelected
                        ? mode.value === 'unlimited'
                          ? 'border-warning bg-warning/10'
                          : 'border-primary bg-primary/8'
                        : 'border-base-200 bg-base-200/40 hover:border-base-300 hover:bg-base-200/70'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {/* Radio indicator */}
                      <div className={`mt-0.5 w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all ${
                        isSelected
                          ? mode.value === 'unlimited'
                            ? 'border-warning bg-warning'
                            : 'border-primary bg-primary'
                          : 'border-base-content/30'
                      }`}>
                        {isSelected && (
                          <div className="w-1.5 h-1.5 rounded-full bg-white"></div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-sm">{mode.emoji} {mode.label}</span>
                          {mode.badge && (
                            <span className={`badge badge-xs ${
                              mode.value === 'unlimited' ? 'badge-warning' : 'badge-primary'
                            }`}>
                              {mode.badge}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-base-content/60 leading-relaxed">{mode.desc}</p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* ── Smart Mode extra controls ─────────────────────────── */}
            {isSmartMode && (
              <div className="mt-5 space-y-4 pt-4 border-t border-base-200">
                <p className="text-xs font-semibold text-base-content/50 uppercase tracking-wider">
                  Konfigurasi Smart Mode
                </p>

                {/* Cooldown */}
                <div className="form-control">
                  <label className="label pb-1">
                    <span className="label-text font-medium flex items-center gap-2">
                      <span>⏱️</span> Jeda Antar Notifikasi (Cooldown)
                    </span>
                    <span className="label-text-alt text-base-content/50">min. 5 menit</span>
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {COOLDOWN_OPTIONS.map(opt => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setFormData({ ...formData, cooldownMinutes: opt.value })}
                        className={`btn btn-sm h-auto py-2.5 flex flex-col gap-0.5 border-opacity-20 transition-all ${
                          formData.cooldownMinutes === opt.value
                            ? 'btn-primary'
                            : 'btn-ghost bg-base-200/60 hover:bg-base-200'
                        }`}
                      >
                        <span className={`text-sm font-bold ${formData.cooldownMinutes === opt.value ? 'text-white' : ''}`}>
                          {opt.label}
                        </span>
                      </button>
                    ))}
                  </div>
                  <div className="label pt-1">
                    <span className="label-text-alt text-base-content/50">
                      Terpilih: <span className="font-semibold text-primary">
                        {COOLDOWN_OPTIONS.find(o => o.value === formData.cooldownMinutes)?.label || `${formData.cooldownMinutes} menit`}
                      </span>
                    </span>
                  </div>
                </div>

                {/* Max Daily Notify */}
                <div className="form-control">
                  <label className="label pb-1">
                    <span className="label-text font-medium flex items-center gap-2">
                      <span>📊</span> Maksimal Notifikasi per Hari
                    </span>
                    <span className="label-text-alt text-base-content/50">1–20</span>
                  </label>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => handleDailyChange(Math.max(1, (formData.maxDailyNotify || 1) - 1))}
                      className="btn btn-square btn-sm btn-ghost bg-base-200/60"
                      disabled={(formData.maxDailyNotify || 1) <= 1}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 12H4" />
                      </svg>
                    </button>

                    <div className="flex-1 relative">
                      <input
                        type="number"
                        min={1}
                        max={20}
                        value={formData.maxDailyNotify}
                        onChange={e => handleDailyChange(e.target.value)}
                        className={`input input-bordered w-full text-center text-lg font-bold ${dailyError ? 'input-error' : ''}`}
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDailyChange(Math.min(20, (formData.maxDailyNotify || 1) + 1))}
                      className="btn btn-square btn-sm btn-ghost bg-base-200/60"
                      disabled={(formData.maxDailyNotify || 20) >= 20}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                      </svg>
                    </button>
                  </div>
                  {dailyError && (
                    <div className="label pt-1">
                      <span className="label-text-alt text-error">{dailyError}</span>
                    </div>
                  )}
                  <div className="label pt-1">
                    <span className="label-text-alt text-base-content/50">
                      Setelah {formData.maxDailyNotify || 5}× notif hari ini, tidak akan ada notif lagi hingga besok
                    </span>
                  </div>
                </div>

                {/* Info summary */}
                <div className="rounded-xl bg-primary/8 border border-primary/20 p-3 text-xs text-base-content/70 leading-relaxed">
                  <span className="font-semibold text-primary">📌 Ringkasan:</span> Notifikasi akan dikirim saat stok tersedia, 
                  lalu menunggu <strong>{COOLDOWN_OPTIONS.find(o => o.value === formData.cooldownMinutes)?.label || `${formData.cooldownMinutes} menit`}</strong> sebelum kirim lagi. 
                  Maksimal <strong>{formData.maxDailyNotify}× per hari</strong>. 
                  Jika stok sudah habis 3 siklus berturut-turut, notifikasi akan direset untuk siklus berikutnya.
                </div>
              </div>
            )}

            {/* ── Once mode info ──────────────────────────────────── */}
            {isOnceMode && (
              <div className="mt-4 rounded-xl bg-base-200/70 border border-base-300 p-3 text-xs text-base-content/70 leading-relaxed">
                <span className="font-semibold">📌 Cara kerja:</span> Anda hanya mendapat 1 notifikasi per kejadian stok tersedia. 
                Notifikasi berikutnya akan dikirim hanya setelah stok habis lalu muncul kembali.
              </div>
            )}

            {/* ── Unlimited mode warning ──────────────────────────── */}
            {isUnlimitedMode && (
              <div className="mt-4 rounded-xl bg-warning/10 border border-warning/30 p-3 text-xs leading-relaxed">
                <p className="font-semibold text-warning flex items-center gap-1 mb-1">
                  <span>⚠️</span> Perhatian
                </p>
                <p className="text-base-content/70">
                  Mode ini mengirim notifikasi setiap kali stok baru terdeteksi, tanpa jeda.
                  Jika stok sering muncul dan hilang, Anda bisa mendapat <strong>banyak notifikasi dalam waktu singkat</strong>.
                  Gunakan hanya jika Anda sedang aktif memantau.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* ── Location Card ─────────────────────────────────────────── */}
        <div className="card bg-base-100 shadow-sm border border-base-200">
          <div className="card-body p-4 sm:p-6">
            <h2 className="card-title text-base mb-2 flex items-center gap-2">
              <span className="text-xl">📍</span> Lokasi Butik
              <span className="badge badge-primary badge-sm ml-auto">{formData.locationIds?.length || 0}/5</span>
            </h2>
            <p className="text-sm text-base-content/60 mb-4">Pilih butik yang ingin dipantau (maks. 5)</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {boutiques.map(boutique => {
                const isSelected = formData.locationIds?.includes(boutique.locationId);
                return (
                  <button
                    key={boutique.locationId}
                    type="button"
                    onClick={() => handleLocationToggle(boutique.locationId)}
                    className={`btn h-auto py-3 px-4 justify-start text-left border-opacity-20 ${
                      isSelected
                        ? 'btn-primary'
                        : 'btn-ghost bg-base-200/50 hover:bg-base-200'
                    }`}
                  >
                    <div className="flex items-center gap-3 w-full">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        readOnly
                        className="checkbox checkbox-sm checkbox-primary"
                      />
                      <div className="flex-1 min-w-0">
                        <div className={`font-semibold truncate ${isSelected ? 'text-white' : ''}`}>
                          {boutique.city}
                        </div>
                        <div className={`text-xs truncate ${isSelected ? 'text-white/70' : 'text-base-content/60'}`}>
                          {boutique.name}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── Weights Card ──────────────────────────────────────────── */}
        <div className="card bg-base-100 shadow-sm border border-base-200">
          <div className="card-body p-4 sm:p-6">
            <h2 className="card-title text-base mb-4 flex items-center gap-2">
              <span className="text-xl">⚖️</span> Filter Berat
            </h2>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
              {weightOptions.map(w => (
                <button
                  key={w.weightLabel}
                  type="button"
                  onClick={() => handleWeightToggle(w.weightLabel)}
                  className={`btn h-auto py-3 px-2 flex flex-col gap-1 border-opacity-20 ${
                    formData.targetWeights.includes(w.weightLabel)
                      ? 'btn-primary border-primary'
                      : 'btn-ghost bg-base-200/50 hover:bg-base-200'
                  }`}
                >
                  <span className={`text-lg font-bold ${formData.targetWeights.includes(w.weightLabel) ? 'text-white' : ''}`}>
                    {w.weightLabel}
                  </span>
                </button>
              ))}
            </div>
            <div className="label">
              <span className="label-text-alt text-base-content/60">Ketuk untuk memilih berat yang diinginkan</span>
            </div>
          </div>
        </div>

        {/* ── Floating Save Button ──────────────────────────────────── */}
        <div className="fixed bottom-20 lg:bottom-10 left-0 right-0 p-4 bg-base-100/80 backdrop-blur-md lg:bg-transparent lg:static lg:p-0 border-t border-base-200 lg:border-none z-10 transition-all">
          <div className="max-w-xl mx-auto">
            <button
              type="submit"
              disabled={saving || !!dailyError}
              className="btn btn-primary w-full btn-lg shadow-lg"
            >
              {saving
                ? <span className="loading loading-spinner"></span>
                : 'Simpan Perubahan'
              }
            </button>
          </div>
        </div>

        {/* Spacer for floating button */}
        <div className="h-24 lg:h-0"></div>

      </form>
    </div>
  );
}
