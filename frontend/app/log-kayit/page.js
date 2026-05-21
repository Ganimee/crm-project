'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  ShieldAlert,
  Search,
  Download,
  Eye,
  EyeOff,
  FileOutput,
  LogIn,
  Mail,
  Upload,
  Clock,
  List,
  AlertTriangle,
  Calendar,
  X,
  Activity,
  UserCheck,
  ShieldCheck,
  ArrowRight,
  CheckCircle2,
} from 'lucide-react';

import { useTheme } from '../context/ThemeContext';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL;

export default function YetkiPage() {
  const { isDarkMode } = useTheme();
  const darkMode = isDarkMode;
  const styles = getStyles(darkMode);

  const [activeTab, setActiveTab] = useState('audit');
  const [viewMode, setViewMode] = useState('table');
  const [searchTerm, setSearchTerm] = useState('');
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [showReportModal, setShowReportModal] = useState(false);
  const [notification, setNotification] = useState('');
  const [hoveredRow, setHoveredRow] = useState(null);

  const [logs, setLogs] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);

  

  const [stats, setStats] = useState({
    total: 0,
    suspicious: 0,
    activeUsers: 0,
    highRiskUsers: 0,
  });

  const showNotify = (message) => {
    setNotification(message);
    setTimeout(() => setNotification(''), 2500);
  };

  const fetchLogs = async () => {
  try {
    setLoading(true);

    const params = new URLSearchParams();
    params.append('type', filterType || 'all');
    params.append('page', '1');
    params.append('page_size', '100');

    if (searchTerm.trim()) {
      params.append('search', searchTerm.trim());
    }

    const res = await fetch(`${API_BASE}/logs?${params.toString()}`);

    const text = await res.text();

    if (!res.ok) {
      console.error('Backend /logs hata cevabı:', text);
      throw new Error(text || 'Log kayıtları alınamadı.');
    }

    const data = JSON.parse(text);
    setLogs(Array.isArray(data) ? data : []);
  } catch (error) {
    console.error('Log çekme hatası:', error);
    showNotify('Log kayıtları alınamadı. Terminal hatasını kontrol et.');
    setLogs([]);
  } finally {
    setLoading(false);
  }
};

  const fetchStats = async () => {
    try {
      const res = await fetch(`${API_BASE}/logs/stats`);

      if (!res.ok) {
        throw new Error('Log istatistikleri alınamadı.');
      }

      const data = await res.json();

      setStats({
        total: data.total || 0,
        suspicious: data.suspicious || 0,
        activeUsers: data.activeUsers || 0,
        highRiskUsers: data.highRiskUsers || 0,
      });
    } catch (error) {
      console.error('Stats çekme hatası:', error);
    }
  };

  const fetchUsers = async () => {
    try {
      const params = new URLSearchParams();

      if (userSearchTerm.trim()) {
        params.append('search', userSearchTerm.trim());
      }

      const url = params.toString()
       ? `${API_BASE}/logs/users?${params.toString()}`
        : `${API_BASE}/logs/users`;

      const res = await fetch(url);

      if (!res.ok) {
        throw new Error('Kullanıcı takip verileri alınamadı.');
      }

      const data = await res.json();
      setUsers(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Kullanıcı takip çekme hatası:', error);
      setUsers([]);
    }
  };



  useEffect(() => {
    fetchStats();
    fetchUsers();
  }, []);

  useEffect(() => {
    fetchLogs();
  }, [filterType]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchLogs();
    }, 350);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchUsers();
    }, 350);

    return () => clearTimeout(timer);
  }, [userSearchTerm]);

  const getLogIcon = (type) => {
    switch (type) {
      case 'login':
      case 'login_failed':
        return <LogIn size={17} />;
      case 'mask_removal':
        return <EyeOff size={17} />;
      case 'export':
      case 'report_download':
        return <FileOutput size={17} />;
      case 'campaign':
        return <Mail size={17} />;
      case 'data_upload':
        return <Upload size={17} />;
      case 'view':
        return <Eye size={17} />;
      default:
        return <Clock size={17} />;
    }
  };

  const getLogLabel = (type) => {
    const labels = {
      login: 'Giriş',
      login_failed: 'Hatalı Giriş',
      mask_removal: 'KVKK Maske',
      export: 'Excel Export',
      report_download: 'Rapor İndirme',
      campaign: 'Kampanya',
      data_upload: 'Veri Yükleme',
      view: 'Görüntüleme',
      audit: 'Audit',
      sistem_hata: 'Sistem Hatası',
    };

    return labels[type] || type;
  };

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const user = String(log.user || '').toLowerCase();
      const detail = String(log.detail || '').toLowerCase();
      const ip = String(log.ip || '').toLowerCase();

      const searchMatch =
        user.includes(searchTerm.toLowerCase()) ||
        detail.includes(searchTerm.toLowerCase()) ||
        ip.includes(searchTerm.toLowerCase());

      const typeMatch =
        filterType === 'all' ||
        log.type === filterType ||
        (filterType === 'suspicious' && log.status !== 'normal');

      return searchMatch && typeMatch;
    });
  }, [logs, searchTerm, filterType]);

  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      const name = String(user.name || '').toLowerCase();
      const username = String(user.username || '').toLowerCase();
      const role = String(user.role || '').toLowerCase();

      return (
        name.includes(userSearchTerm.toLowerCase()) ||
        username.includes(userSearchTerm.toLowerCase()) ||
        role.includes(userSearchTerm.toLowerCase())
      );
    });
  }, [users, userSearchTerm]);
  const reportName = 'Yetki Logları';
const reportType = 'yetki_loglari';
const fileName = `yetki_loglari_${new Date().toISOString().slice(0, 10)}.csv`;

const exportCsv = async () => {

  const headers = 'Kullanıcı,İşlem,Detay,Tarih,IP,Durum';

  const rows = filteredLogs.map(
    (log) =>
      `${log.user},${getLogLabel(log.type)},${log.detail},${log.date},${log.ip},${log.status}`
  );

  const csv = [headers, ...rows].join('\n');

  const blob = new Blob([csv], {
    type: 'text/csv;charset=utf-8;',
  });

  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();

  const user =
    JSON.parse(localStorage.getItem('user') || 'null') ||
    JSON.parse(localStorage.getItem('currentUser') || 'null');

  const userId =
    user?.kullanici_id ||
    user?.id ||
    localStorage.getItem('kullanici_id') ||
    localStorage.getItem('user_id') ||
    null;

  try {
    await fetch(`${API_BASE}/raporlar/export-log`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
      rapor_adi: reportName,
      rapor_tipi: reportType,
      aciklama: `${reportName} dışa aktarıldı`,
      dosya_adi: fileName,
      dosya_formati: 'csv',
      kullanici_id: userId ? Number(userId) : null,
      filtre_ozeti: filterType || 'all',
    }),
    });

    fetchLogs();
    fetchStats();
  } catch (error) {
    console.error('Rapor indirme logu kaydedilemedi:', error);
  }

  showNotify('Yetki logları dışa aktarıldı.');
};
  return (
    <div style={styles.page}>
      {notification && (
        <div style={styles.toast}>
          <CheckCircle2 size={18} />
          {notification}
        </div>
      )}

      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>
            Yetki <span style={styles.redText}>Yönetimi</span>
          </h1>
      
        </div>

        <button style={styles.primaryButton} onClick={exportCsv}>
          <Download size={17} />
          Excel Export
        </button>
      </div>

      <div style={styles.statsGrid}>
        <StatCard styles={styles} icon={Activity} label="Toplam Log" value={stats.total} tone="red" />
        <StatCard styles={styles} icon={AlertTriangle} label="Şüpheli İşlem" value={stats.suspicious} tone="orange" />
        <StatCard styles={styles} icon={UserCheck} label="Aktif Kullanıcı" value={stats.activeUsers} tone="blue" />
        <StatCard styles={styles} icon={ShieldCheck} label="Yüksek Risk" value={stats.highRiskUsers} tone="purple" />
      </div>

      <div style={styles.tabBox}>
        <button style={{ ...styles.tabButton, ...(activeTab === 'audit' ? styles.tabButtonActive : {}) }} onClick={() => setActiveTab('audit')}>
          <ShieldAlert size={17} />
          Yetki Logları
        </button>

        <button style={{ ...styles.tabButton, ...(activeTab === 'user_tracking' ? styles.tabButtonActive : {}) }} onClick={() => setActiveTab('user_tracking')}>
          <UserCheck size={17} />
          Kullanıcı & Rol
        </button>

      </div>

      {activeTab === 'audit' && (
        <>
          <div style={styles.filterBox}>
            <div style={styles.searchBox}>
              <Search size={17} color={darkMode ? '#fb7185' : '#e11d48'} />
              <input
                style={styles.searchInput}
                placeholder="Kullanıcı, işlem veya IP ara..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <select style={styles.select} value={filterType} onChange={(e) => setFilterType(e.target.value)}>
              <option value="all">Tüm İşlemler</option>
              <option value="suspicious">Sadece Şüpheli</option>
              <option value="login">Girişler</option>
              <option value="login_failed">Hatalı Girişler</option>
              <option value="export">Excel Export</option>
              <option value="mask_removal">KVKK Maske</option>
              <option value="data_upload">Veri Yükleme</option>
            </select>

            <div style={styles.viewSwitch}>
              <button style={{ ...styles.viewButton, ...(viewMode === 'table' ? styles.viewButtonActive : {}) }} onClick={() => setViewMode('table')}>
                <List size={15} />
                Liste
              </button>

              <button style={{ ...styles.viewButton, ...(viewMode === 'timeline' ? styles.viewButtonActive : {}) }} onClick={() => setViewMode('timeline')}>
                <Clock size={15} />
                Timeline
              </button>
            </div>
          </div>

         

          {!loading && viewMode === 'table' ? (
            <div style={styles.tableCard}>
              <table style={styles.table}>
                <thead>
                  <tr style={styles.tableHeadRow}>
                    <th style={styles.th}>İşlem</th>
                    <th style={styles.th}>Kullanıcı</th>
                    <th style={styles.th}>Detay</th>
                    <th style={styles.th}>IP Adresi</th>
                    <th style={styles.th}>Tarih</th>
                    <th style={styles.th}>Durum</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredLogs.map((log) => (
                    <tr
                      key={`${log.source || 'log'}-${log.id}`}
                      style={{
                        ...styles.tr,
                        ...(hoveredRow === `${log.source || 'log'}-${log.id}` ? styles.trHover : {}),
                        ...(log.status === 'alert' ? styles.trCritical : {}),
                      }}
                      onMouseEnter={() => setHoveredRow(`${log.source || 'log'}-${log.id}`)}
                      onMouseLeave={() => setHoveredRow(null)}
                    >
                      <td style={styles.td}>
                        <div style={styles.actionCell}>
                          <span style={styles.actionIcon(log.status, log.type)}>{getLogIcon(log.type)}</span>
                          <span style={styles.actionText}>{getLogLabel(log.type)}</span>
                        </div>
                      </td>

                      <td style={styles.td}><b>{log.user}</b></td>
                      <td style={styles.td}>{log.detail}</td>
                      <td style={styles.td}>{log.ip}</td>
                      <td style={styles.td}>{log.date}</td>

                      <td style={styles.td}>
                        <span style={styles.statusBadge(log.status)}>
                          {log.status === 'alert' ? 'KRİTİK' : log.status === 'suspicious' ? 'ŞÜPHELİ' : 'NORMAL'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {filteredLogs.length === 0 && (
                <div style={styles.empty}>
                  <Search size={34} />
                  <h3>Kayıt Bulunamadı</h3>
                  <p>Seçtiğiniz filtrelere uygun log kaydı yok.</p>
                </div>
              )}
            </div>
          ) : null}

          {!loading && viewMode === 'timeline' && (
            <div style={styles.timelineBox}>
              {filteredLogs.map((log) => (
                <div key={`${log.source || 'log'}-${log.id}`} style={styles.timelineItem}>
                  <div style={styles.timelineIcon(log.status)}>{getLogIcon(log.type)}</div>

                  <div style={styles.timelineCard}>
                    <div style={styles.timelineTop}>
                      <b>{log.user}</b>
                      <span>{log.date}</span>
                    </div>

                    <p style={styles.timelineText}>{log.detail}</p>
                    <small style={styles.timelineIp}>IP: {log.ip}</small>
                  </div>
                </div>
              ))}

              {filteredLogs.length === 0 && (
                <div style={styles.empty}>
                  <Search size={34} />
                  <h3>Kayıt Bulunamadı</h3>
                  <p>Seçtiğiniz filtrelere uygun log kaydı yok.</p>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {activeTab === 'user_tracking' && (
        <>
          <div style={styles.filterBoxSingle}>
            <div style={styles.searchBox}>
              <Search size={17} color={darkMode ? '#fb7185' : '#e11d48'} />
              <input
                style={styles.searchInput}
                placeholder="Kullanıcı, e-posta veya rol ara..."
                value={userSearchTerm}
                onChange={(e) => setUserSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <div style={styles.tableCard}>
            <table style={styles.table}>
              <thead>
                <tr style={styles.tableHeadRow}>
                  <th style={styles.th}>Kullanıcı</th>
                  <th style={styles.th}>E-posta</th>
                  <th style={styles.th}>Rol</th>
                  <th style={styles.th}>Son İşlem</th>
                  <th style={styles.th}>Risk Skoru</th>
                  <th style={styles.th}></th>
                </tr>
              </thead>

              <tbody>
                {filteredUsers.map((user) => (
                  <tr
                    key={user.id}
                    style={{ ...styles.tr, ...(hoveredRow === user.id ? styles.trHover : {}) }}
                    onMouseEnter={() => setHoveredRow(user.id)}
                    onMouseLeave={() => setHoveredRow(null)}
                  >
                    <td style={styles.td}>
                      <div style={styles.profile}>
                        <div style={styles.avatar}>
                          {String(user.name || 'K')
                            .split(' ')
                            .map((x) => x[0])
                            .join('')
                            .slice(0, 2)
                            .toUpperCase()}
                        </div>

                        <div>
                          <div style={styles.name}>{user.name}</div>
                          <div style={styles.smallText}>{user.status === 'active' ? 'Aktif' : 'Pasif'}</div>
                        </div>
                      </div>
                    </td>

                    <td style={styles.td}>{user.username}</td>

                    <td style={styles.td}>
                      <span style={styles.roleBadge}>{user.role}</span>
                    </td>

                    <td style={styles.td}>{user.lastAction}</td>

                    <td style={styles.td}>
                      <div style={styles.riskWrap}>
                        <div style={styles.riskTrack}>
                          <div style={{ ...styles.riskFill(user.riskScore || 0), width: `${user.riskScore || 0}%` }} />
                        </div>
                        <span style={styles.riskText(user.riskScore || 0)}>%{user.riskScore || 0}</span>
                      </div>
                    </td>

                    <td style={styles.td}>
                      <button
                        style={styles.smallButton}
                        onClick={() => {
                          setSearchTerm(user.username);
                          setActiveTab('audit');
                        }}
                      >
                        Kayıtları Gör
                        <ArrowRight size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {filteredUsers.length === 0 && (
              <div style={styles.empty}>
                <Search size={34} />
                <h3>Kullanıcı Bulunamadı</h3>
                <p>Backend üzerinde kullanıcı takip kaydı bulunamadı.</p>
              </div>
            )}
          </div>
        </>
      )}

      

      {showReportModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modal}>
            <button style={styles.closeButton} onClick={() => setShowReportModal(false)}>
              <X size={22} />
            </button>

            <div style={styles.modalIcon}>
              <Download size={30} />
            </div>

            <h2 style={styles.modalTitle}>Yetki Raporu</h2>
            <p style={styles.modalText}>
              CRM yetki hareketleri, KVKK erişimleri ve şüpheli işlemler raporlanacaktır.
            </p>

            <div style={styles.modalRow}>
              <Calendar size={17} />
              <span>Zaman Aralığı</span>
              <b>Son 24 Saat</b>
            </div>

            <div style={styles.modalRow}>
              <ShieldAlert size={17} />
              <span>Şüpheli Olay</span>
              <b>{stats.suspicious} Tespit</b>
            </div>

            <button
              style={styles.modalButton}
              onClick={() => {
                setShowReportModal(false);
                exportCsv();
              }}
            >
              Raporu Oluştur
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ styles, icon: Icon, label, value, tone }) {
  return (
    <div style={styles.statCard}>
      <div style={styles.statIcon(tone)}>
        <Icon size={24} />
      </div>

      <div>
        <div style={styles.statLabel}>{label}</div>
        <div style={styles.statValue}>{value}</div>
      </div>
    </div>
  );
}


const getStyles = (darkMode) => ({
  page: {
    padding: 32,
    minHeight: '100vh',
    background: darkMode
      ? 'radial-gradient(circle at top left, #1f0f16 0%, #050506 34%, #050506 100%)'
      : 'linear-gradient(135deg, #fff7f8 0%, #f8fafc 45%, #ffffff 100%)',
    color: darkMode ? '#f8fafc' : '#0f172a',
  },

  toast: {
    position: 'fixed',
    top: 22,
    right: 100,
    zIndex: 9999,
    background: 'linear-gradient(135deg, #b91c1c, #ef4444)',
    color: '#fff',
    padding: '12px 18px',
    borderRadius: 14,
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    boxShadow: '0 12px 35px rgba(239,68,68,0.42)',
    fontWeight: 800,
  },

  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 28,
    gap: 20,
    paddingRight: 72,
  },

  title: {
    fontSize: 30,
    fontWeight: 900,
    color: darkMode ? '#ffffff' : '#111827',
    margin: 0,
  },

  redText: {
    color: darkMode ? '#fb7185' : '#dc2626',
    fontWeight: 900,
  },

  subtitle: {
    marginTop: 6,
    fontSize: 13,
    color: darkMode ? '#cbd5e1' : '#64748b',
  },

  primaryButton: {
    height: 42,
    padding: '0 18px',
    borderRadius: 18,
    borderWidth: 0,
    background: 'linear-gradient(135deg, #991b1b, #ef4444)',
    color: '#ffffff',
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    cursor: 'pointer',
    fontWeight: 900,
    boxShadow: '0 12px 30px rgba(239,68,68,0.38)',
  },

  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
    gap: 20,
    marginBottom: 24,
    width: '100%',
  },

  statCard: {
    minWidth: 0,
    background: darkMode
      ? 'linear-gradient(145deg, #151519, #211116)'
      : 'linear-gradient(145deg, #ffffff, #fff1f2)',
    border: darkMode ? '1px solid #332025' : '1px solid #fecdd3',
    borderRadius: 18,
    padding: 20,
    display: 'flex',
    alignItems: 'center',
    gap: 18,
    boxShadow: darkMode
      ? '0 12px 28px rgba(0,0,0,0.22)'
      : '0 12px 28px rgba(239,68,68,0.07)',
  },

  statIcon: (tone) => {
    const colorMap = {
      red: ['linear-gradient(135deg, #fee2e2, #fecaca)', '#dc2626'],
      orange: ['linear-gradient(135deg, #ffedd5, #fed7aa)', '#ea580c'],
      blue: ['linear-gradient(135deg, #dbeafe, #bfdbfe)', '#2563eb'],
      purple: ['linear-gradient(135deg, #ede9fe, #ddd6fe)', '#7c3aed'],
    };

    const selected = colorMap[tone] || colorMap.red;

    return {
      width: 54,
      height: 54,
      borderRadius: 16,
      background: selected[0],
      color: selected[1],
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    };
  },

  statLabel: {
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 1,
    color: darkMode ? '#cbd5e1' : '#64748b',
    fontWeight: 900,
  },

  statValue: {
    marginTop: 4,
    fontSize: 24,
    color: darkMode ? '#ffffff' : '#111827',
    fontWeight: 900,
  },

  tabBox: {
    background: darkMode
      ? 'linear-gradient(145deg, #151519, #1f2026)'
      : 'linear-gradient(145deg, #ffffff, #fff7f8)',
    border: darkMode ? '1px solid #332025' : '1px solid #fecdd3',
    borderRadius: 18,
    padding: 8,
    display: 'flex',
    gap: 10,
    marginBottom: 24,
    boxShadow: darkMode
      ? '0 12px 28px rgba(0,0,0,0.22)'
      : '0 12px 28px rgba(239,68,68,0.07)',
  },

  tabButton: {
    height: 42,
    padding: '0 18px',
    borderRadius: 14,
    borderWidth: 0,
    background: 'transparent',
    color: darkMode ? '#94a3b8' : '#64748b',
    display: 'flex',
    alignItems: 'center',
    gap: 9,
    cursor: 'pointer',
    fontWeight: 900,
  },

  tabButtonActive: {
    background: 'linear-gradient(135deg, #991b1b, #ef4444)',
    color: '#ffffff',
    boxShadow: '0 10px 26px rgba(239,68,68,0.34)',
  },

  filterBox: {
    background: darkMode
      ? 'linear-gradient(145deg, #151519, #20212a)'
      : 'linear-gradient(145deg, #ffffff, #fff7f8)',
    border: darkMode ? '1px solid #332025' : '1px solid #fecdd3',
    borderRadius: 18,
    padding: 18,
    display: 'grid',
    gridTemplateColumns: '1.5fr 220px 230px',
    gap: 14,
    marginBottom: 26,
  },

  filterBoxSingle: {
    background: darkMode
      ? 'linear-gradient(145deg, #151519, #20212a)'
      : 'linear-gradient(145deg, #ffffff, #fff7f8)',
    border: darkMode ? '1px solid #332025' : '1px solid #fecdd3',
    borderRadius: 18,
    padding: 18,
    marginBottom: 26,
  },

  searchBox: {
    height: 42,
    borderRadius: 12,
    border: darkMode ? '1px solid #3f3f46' : '1px solid #fecdd3',
    background: darkMode ? '#222329' : '#fff1f2',
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '0 14px',
  },

  searchInput: {
    flex: 1,
    borderWidth: 0,
    outline: 'none',
    background: 'transparent',
    color: darkMode ? '#f8fafc' : '#111827',
    fontSize: 13,
  },

  select: {
    height: 42,
    borderRadius: 12,
    border: darkMode ? '1px solid #3f3f46' : '1px solid #fecdd3',
    background: darkMode ? '#222329' : '#fff1f2',
    color: darkMode ? '#f8fafc' : '#111827',
    padding: '0 12px',
    fontWeight: 800,
    outline: 'none',
  },

  viewSwitch: {
    height: 42,
    borderRadius: 12,
    border: darkMode ? '1px solid #3f3f46' : '1px solid #fecdd3',
    background: darkMode ? '#111114' : '#fff1f2',
    display: 'flex',
    alignItems: 'center',
    padding: 4,
    gap: 4,
  },

  viewButton: {
    height: 32,
    flex: 1,
    borderWidth: 0,
    borderRadius: 10,
    background: 'transparent',
    color: darkMode ? '#94a3b8' : '#64748b',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    fontWeight: 900,
    cursor: 'pointer',
  },

  viewButtonActive: {
    background: 'linear-gradient(135deg, #991b1b, #ef4444)',
    color: '#ffffff',
  },

  tableCard: {
    background: darkMode
      ? 'linear-gradient(145deg, #151519, #1f2026)'
      : '#ffffff',
    border: darkMode ? '1px solid #332025' : '1px solid #fecdd3',
    borderRadius: 22,
    overflow: 'hidden',
    boxShadow: darkMode
      ? '0 18px 42px rgba(0,0,0,0.34)'
      : '0 18px 42px rgba(239,68,68,0.08)',
  },

  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: 13,
  },

  tableHeadRow: {
    background: darkMode
      ? 'linear-gradient(135deg, #20212a, #251820)'
      : 'linear-gradient(135deg, #fff1f2, #f8fafc)',
  },

  th: {
    padding: '18px 16px',
    textAlign: 'left',
    color: darkMode ? '#fda4af' : '#be123c',
    fontSize: 10,
    letterSpacing: 1,
    textTransform: 'uppercase',
    fontWeight: 900,
    whiteSpace: 'nowrap',
  },

  tr: {
    borderTop: darkMode ? '1px solid #2b2c35' : '1px solid #fce7f3',
    color: darkMode ? '#e2e8f0' : '#0f172a',
    transition: 'all 0.2s ease',
  },

  trHover: {
    background: darkMode ? 'rgba(239,68,68,0.08)' : '#fff1f2',
  },

  trCritical: {
    background: darkMode ? 'rgba(127,29,29,0.28)' : '#fee2e2',
  },

  td: {
    padding: '17px 16px',
    color: darkMode ? '#e2e8f0' : '#111827',
    verticalAlign: 'middle',
  },

  actionCell: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
  },

  actionIcon: (status, type) => {
    const map = {
      login: ['linear-gradient(135deg, #dbeafe, #bfdbfe)', '#2563eb'],
      login_failed: ['linear-gradient(135deg, #fee2e2, #fecaca)', '#dc2626'],
      export: ['linear-gradient(135deg, #fee2e2, #fecaca)', '#dc2626'],
      mask_removal: ['linear-gradient(135deg, #fef3c7, #fde68a)', '#b45309'],
      data_upload: ['linear-gradient(135deg, #dcfce7, #bbf7d0)', '#16a34a'],
      campaign: ['linear-gradient(135deg, #fce7f3, #fbcfe8)', '#db2777'],
      view: ['linear-gradient(135deg, #f1f5f9, #e2e8f0)', '#475569'],
    };

    const selected = map[type] || map.login;

    return {
      width: 42,
      height: 42,
      borderRadius: 14,
      background:
        status === 'alert'
          ? 'linear-gradient(135deg, #dc2626, #991b1b)'
          : selected[0],
      color: status === 'alert' ? '#ffffff' : selected[1],
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      boxShadow:
        status === 'alert'
          ? '0 12px 28px rgba(220,38,38,0.45)'
          : '0 10px 24px rgba(15,23,42,0.16)',
    };
  },

  actionText: {
    fontWeight: 900,
  },

  statusBadge: (status) => {
    const isNormal = status === 'normal';
    const isAlert = status === 'alert';

    return {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      minWidth: 76,
      padding: '6px 10px',
      borderRadius: 999,
      fontSize: 10,
      fontWeight: 900,
      background: isAlert
        ? 'linear-gradient(135deg, #991b1b, #ef4444)'
        : isNormal
        ? darkMode
          ? '#27272f'
          : '#f1f5f9'
        : darkMode
        ? 'linear-gradient(135deg, #3b1116, #7f1d1d)'
        : 'linear-gradient(135deg, #fee2e2, #fecaca)',
      color: isAlert ? '#ffffff' : isNormal ? (darkMode ? '#cbd5e1' : '#475569') : '#fb7185',
      boxShadow: isAlert ? '0 8px 22px rgba(239,68,68,0.35)' : 'none',
    };
  },

  timelineBox: {
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
  },

  timelineItem: {
    position: 'relative',
    display: 'flex',
    gap: 16,
  },

  timelineIcon: (status) => ({
    width: 42,
    height: 42,
    borderRadius: 16,
    background:
      status === 'alert'
        ? 'linear-gradient(135deg, #991b1b, #ef4444)'
        : darkMode
        ? 'linear-gradient(135deg, #3b1116, #7f1d1d)'
        : 'linear-gradient(135deg, #fee2e2, #fecaca)',
    color: status === 'alert' ? '#ffffff' : darkMode ? '#fb7185' : '#dc2626',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  }),

  timelineCard: {
    flex: 1,
    background: darkMode
      ? 'linear-gradient(145deg, #151519, #1f2026)'
      : '#ffffff',
    border: darkMode ? '1px solid #332025' : '1px solid #fecdd3',
    borderRadius: 18,
    padding: 18,
  },

  timelineTop: {
    display: 'flex',
    justifyContent: 'space-between',
    color: darkMode ? '#ffffff' : '#111827',
    fontSize: 13,
  },

  timelineText: {
    marginTop: 8,
    marginBottom: 6,
    color: darkMode ? '#cbd5e1' : '#475569',
    fontSize: 13,
  },

  timelineIp: {
    color: darkMode ? '#fb7185' : '#dc2626',
    fontWeight: 800,
  },

  profile: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },

  avatar: {
    width: 38,
    height: 38,
    borderRadius: 14,
    background: darkMode
      ? 'linear-gradient(135deg, #3b1116, #7f1d1d)'
      : 'linear-gradient(135deg, #fee2e2, #fecaca)',
    border: darkMode ? '1px solid #fb7185' : '1px solid #fca5a5',
    color: darkMode ? '#ffe4e6' : '#be123c',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 900,
    fontSize: 12,
    boxShadow: '0 8px 18px rgba(239,68,68,0.18)',
  },

  name: {
    color: darkMode ? '#ffffff' : '#111827',
    fontWeight: 900,
  },

  smallText: {
    marginTop: 3,
    fontSize: 10,
    color: darkMode ? '#cbd5e1' : '#64748b',
    fontWeight: 700,
  },

  roleBadge: {
    background: darkMode
      ? 'linear-gradient(135deg, #3b1116, #7f1d1d)'
      : 'linear-gradient(135deg, #fee2e2, #fecaca)',
    color: darkMode ? '#fb7185' : '#dc2626',
    padding: '6px 10px',
    borderRadius: 999,
    fontSize: 11,
    fontWeight: 900,
  },

  riskWrap: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
  },

  riskTrack: {
    width: 90,
    height: 7,
    borderRadius: 999,
    background: darkMode ? '#33343d' : '#fee2e2',
    overflow: 'hidden',
  },

  riskFill: (score) => ({
    height: '100%',
    borderRadius: 999,
    background:
      score > 70
        ? 'linear-gradient(90deg, #991b1b, #ef4444)'
        : score > 40
        ? 'linear-gradient(90deg, #7f1d1d, #f87171)'
        : 'linear-gradient(90deg, #450a0a, #991b1b)',
    boxShadow: '0 0 12px rgba(239,68,68,0.45)',
  }),

  riskText: (score) => ({
    color: score > 70 ? '#fb7185' : darkMode ? '#e2e8f0' : '#475569',
    fontSize: 11,
    fontWeight: 900,
  }),

  smallButton: {
    height: 34,
    padding: '0 13px',
    borderRadius: 12,
    borderWidth: 0,
    background: 'linear-gradient(135deg, #991b1b, #ef4444)',
    color: '#ffffff',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 7,
    cursor: 'pointer',
    fontWeight: 900,
    boxShadow: '0 8px 22px rgba(239,68,68,0.28)',
  },

  warningCard: {
    gridColumn: '1 / -1',
    background: darkMode
      ? 'linear-gradient(145deg, #151519, #251116)'
      : 'linear-gradient(145deg, #ffffff, #fff1f2)',
    border: darkMode ? '1px solid #332025' : '1px solid #fecdd3',
    borderRadius: 22,
    padding: 24,
    boxShadow: darkMode
      ? '0 18px 42px rgba(0,0,0,0.34)'
      : '0 18px 42px rgba(239,68,68,0.08)',
  },



  modalOverlay: {
    position: 'fixed',
    inset: 0,
    zIndex: 99999,
    background: 'rgba(0,0,0,0.76)',
    backdropFilter: 'blur(8px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },

  modal: {
    width: '100%',
    maxWidth: 430,
    background: darkMode
      ? 'linear-gradient(145deg, #151519, #251116)'
      : '#ffffff',
    border: darkMode ? '1px solid #7f1d1d' : '1px solid #fecaca',
    borderRadius: 28,
    padding: 30,
    position: 'relative',
    boxShadow: '0 24px 70px rgba(239,68,68,0.30)',
  },

  closeButton: {
    position: 'absolute',
    top: 18,
    right: 18,
    width: 38,
    height: 38,
    borderRadius: 14,
    borderWidth: 0,
    background: darkMode ? '#222329' : '#fee2e2',
    color: darkMode ? '#fb7185' : '#dc2626',
    cursor: 'pointer',
  },

  modalIcon: {
    width: 62,
    height: 62,
    borderRadius: 20,
    background: 'linear-gradient(135deg, #991b1b, #ef4444)',
    color: '#ffffff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
    boxShadow: '0 14px 30px rgba(239,68,68,0.36)',
  },

  modalTitle: {
    margin: 0,
    fontSize: 24,
    fontWeight: 900,
    color: darkMode ? '#ffffff' : '#111827',
  },

  modalText: {
    marginTop: 10,
    marginBottom: 22,
    fontSize: 13,
    lineHeight: 1.7,
    color: darkMode ? '#cbd5e1' : '#64748b',
  },

  modalRow: {
    height: 48,
    borderRadius: 16,
    background: darkMode ? '#111114' : '#fff1f2',
    border: darkMode ? '1px solid #332025' : '1px solid #fecdd3',
    color: darkMode ? '#e2e8f0' : '#475569',
    display: 'grid',
    gridTemplateColumns: '24px 1fr auto',
    alignItems: 'center',
    gap: 10,
    padding: '0 14px',
    marginBottom: 12,
    fontSize: 13,
  },

  modalButton: {
    width: '100%',
    height: 46,
    borderRadius: 16,
    borderWidth: 0,
    background: 'linear-gradient(135deg, #991b1b, #ef4444)',
    color: '#ffffff',
    fontWeight: 900,
    cursor: 'pointer',
    marginTop: 12,
    boxShadow: '0 14px 30px rgba(239,68,68,0.36)',
  },

  empty: {
    padding: 80,
    textAlign: 'center',
    color: darkMode ? '#cbd5e1' : '#64748b',
  },
});