'use client';

import React, { useMemo, useState, useEffect } from 'react';
import {
  Users as UsersIcon,
  Plus as PlusIcon,
  Search as SearchIcon,
  Save as SaveIcon,
  CheckSquare,
  Square,
  CheckCircle2,
  Edit3,
  Lock,
  ShieldCheck as ShieldCheckIcon,
  X,
} from 'lucide-react';

import { useTheme } from '../context/ThemeContext';

export default function YetkilendirmePage() {
  const { isDarkMode } = useTheme();
  const darkMode = isDarkMode;
  const styles = useMemo(() => getStyles(darkMode), [darkMode]);

  const [activeSubTab, setActiveSubTab] = useState('roles');
  const [rolePerms, setRolePerms] = useState([]);
  const [selectedRole, setSelectedRole] = useState(null);
  const [users, setUsers] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingRole, setSavingRole] = useState(false);
  const [notification, setNotification] = useState(null);
  const [search, setSearch] = useState('');
  const [hoveredUser, setHoveredUser] = useState(null);

  const [showUserModal, setShowUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [userForm, setUserForm] = useState({
    name: '',
    email: '',
    role: '',
    status: 'Aktif',
  });

  const notify = (msg) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 2500);
  };

  const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL;

  const fetchYetkiData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');

      const [usersRes, rolesRes] = await Promise.all([
        fetch(`${API_BASE}/auth/users`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_BASE}/auth/roles-permissions`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (!usersRes.ok || !rolesRes.ok) {
        throw new Error('Yetkilendirme verileri alınamadı.');
      }

      const usersData = await usersRes.json();
      const rolesData = await rolesRes.json();

      const roles = rolesData.roles || [];

      setUsers(usersData.items || []);
      setRolePerms(roles);
      setPermissions(rolesData.permissions || []);

      setSelectedRole((prev) => {
        if (!prev) return roles[0] || null;
        return roles.find((role) => role.id === prev.id) || roles[0] || null;
      });
    } catch (err) {
      console.error('Yetkilendirme API hatası:', err);
      notify('Yetkilendirme verileri alınamadı.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchYetkiData();
  }, []);

  const groupedPermissions = useMemo(() => {
    return permissions.reduce((acc, curr) => {
      const moduleName = curr.module || 'Diğer';
      if (!acc[moduleName]) acc[moduleName] = [];
      acc[moduleName].push(curr);
      return acc;
    }, {});
  }, [permissions]);

  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      const name = user.name || '';
      const email = user.email || '';
      const role = user.role || '';

      return (
        name.toLowerCase().includes(search.toLowerCase()) ||
        email.toLowerCase().includes(search.toLowerCase()) ||
        role.toLowerCase().includes(search.toLowerCase())
      );
    });
  }, [users, search]);

  const togglePermission = (roleId, permCode) => {
    if (!roleId) return;

    setRolePerms((prev) =>
      prev.map((role) => {
        if (role.id !== roleId) return role;

        const hasPerm = role.permissions.includes(permCode);
        const newPerms = hasPerm
          ? role.permissions.filter((p) => p !== permCode)
          : [...role.permissions, permCode];

        return { ...role, permissions: newPerms };
      })
    );

    setSelectedRole((prev) => {
      if (!prev || prev.id !== roleId) return prev;

      const hasPerm = prev.permissions.includes(permCode);

      return {
        ...prev,
        permissions: hasPerm
          ? prev.permissions.filter((p) => p !== permCode)
          : [...prev.permissions, permCode],
      };
    });
  };

  const saveRolePermissions = async () => {
    if (!selectedRole) {
      notify('Kaydedilecek rol seçili değil.');
      return;
    }

    try {
      setSavingRole(true);
      const token = localStorage.getItem('token');

      const res = await fetch(
        `${API_BASE}/auth/roles/${selectedRole.id}/permissions`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            permissions: selectedRole.permissions || [],
          }),
        }
      );

      if (!res.ok) {
        const err = await res.json();
        console.error('Rol yetki kaydetme hatası:', err);
        notify('Yetkiler veritabanına kaydedilemedi.');
        return;
      }

      await fetchYetkiData();
      notify(`${selectedRole.label || selectedRole.name} yetkileri kaydedildi.`);
    } catch (err) {
      console.error('Rol yetki kaydetme hatası:', err);
      notify('Sunucu bağlantı hatası.');
    } finally {
      setSavingRole(false);
    }
  };

  const getRoleLabel = (roleName) => {
    const role = rolePerms.find((r) => r.name === roleName);
    return role?.label || roleName;
  };

  const openNewUserModal = () => {
    setEditingUser(null);
    setUserForm({
      name: '',
      email: '',
      role: rolePerms[0]?.name || '',
      status: 'Aktif',
    });
    setShowUserModal(true);
  };

  const openEditUserModal = (user) => {
    setEditingUser(user);
    setUserForm({
      name: user.name || '',
      email: user.email || '',
      role: user.role || '',
      status: user.status || 'Aktif',
    });
    setShowUserModal(true);
  };

  const closeUserModal = () => {
    setShowUserModal(false);
    setEditingUser(null);
  };

  const saveUser = async () => {
  if (!userForm.name || !userForm.email || !userForm.role) {
    notify('İsim, e-posta ve rol alanları zorunludur.');
    return;
  }

  try {
    const token = localStorage.getItem('token');

    const url = editingUser
      ? `${API_BASE}/auth/users/${editingUser.id}`
      : `${API_BASE}/auth/users`;;

    const method = editingUser ? 'PUT' : 'POST';

    const res = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        name: userForm.name,
        email: userForm.email,
        role: userForm.role,
        status: userForm.status,
      }),
    });

    if (!res.ok) {
      const err = await res.json();
      console.error('Kullanıcı kaydetme hatası:', err);

      const message = Array.isArray(err.detail)
        ? err.detail.map((e) => e.msg).join(', ')
        : err.detail;

      notify(message || 'Kullanıcı veritabanına kaydedilemedi.');
      return;
    }

    await fetchYetkiData();
    notify(editingUser ? 'Kullanıcı güncellendi.' : 'Yeni kullanıcı eklendi.');
    closeUserModal();
  } catch (err) {
    console.error('Kullanıcı kaydetme hatası:', err);
    notify('Sunucu bağlantı hatası.');
  }
};

 const deleteUser = async () => {
  if (!editingUser) return;

  try {
    const token = localStorage.getItem('token');

    const res = await fetch(
      `${API_BASE}/auth/users/${editingUser.id}`,
      {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!res.ok) {
      const err = await res.json();
      console.error('Kullanıcı silme hatası:', err);
      notify('Kullanıcı silinemedi.');
      return;
    }

    await fetchYetkiData();
    notify('Kullanıcı pasifleştirildi.');
    closeUserModal();
  } catch (err) {
    console.error('Kullanıcı silme hatası:', err);
    notify('Sunucu bağlantı hatası.');
  }
};

  return (
    <div style={styles.page}>
      {notification && (
        <div style={styles.toast}>
          <CheckCircle2 size={18} />
          <span>{notification}</span>
        </div>
      )}

      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>
            Yetkilendirme <span style={styles.redText}>Yönetimi</span>
          </h1>
          <p style={styles.subtitle}></p>
        </div>
      </div>

      <div style={styles.statsGrid}>
        <StatCard styles={styles} icon={UsersIcon} label="Toplam Kullanıcı" value={users.length} tone="blue" />
        <StatCard styles={styles} icon={Lock} label="Rol Şablonu" value={rolePerms.length} tone="red" />
        <StatCard
          styles={styles}
          icon={ShieldCheckIcon}
          label={`${selectedRole?.label || 'Rol'} Aktif Yetki`}
          value={selectedRole?.permissions?.length || 0}
          tone="purple"
        />
      </div>

      <div style={styles.tabBox}>
        <button
          style={{
            ...styles.tabButton,
            ...(activeSubTab === 'users' ? styles.tabButtonActive : {}),
          }}
          onClick={() => setActiveSubTab('users')}
        >
          <UsersIcon size={17} />
          Kullanıcılar
        </button>

        <button
          style={{
            ...styles.tabButton,
            ...(activeSubTab === 'roles' ? styles.tabButtonActive : {}),
          }}
          onClick={() => setActiveSubTab('roles')}
        >
          <Lock size={17} />
          Rol Matrisi
        </button>
      </div>

      {activeSubTab === 'users' && (
        <section style={styles.tableCard}>
          <div style={styles.tableToolbar}>
            <div style={styles.searchBox}>
              <SearchIcon size={17} color={darkMode ? '#fb7185' : '#e11d48'} />
              <input
                style={styles.searchInput}
                placeholder="Kullanıcı, e-posta veya rol ara..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

           
          </div>

          <table style={styles.table}>
            <thead>
              <tr style={styles.tableHeadRow}>
                <th style={styles.th}>Kullanıcı</th>
                <th style={styles.th}>E-posta</th>
                <th style={styles.th}>Aktif Rol</th>
                <th style={styles.th}>Durum</th>
                <th style={styles.thRight}>İşlem</th>
              </tr>
            </thead>

            <tbody>
              {filteredUsers.map((user) => (
                <tr
                  key={user.id}
                  style={{
                    ...styles.tr,
                    ...(hoveredUser === user.id ? styles.trHover : {}),
                  }}
                  onMouseEnter={() => setHoveredUser(user.id)}
                  onMouseLeave={() => setHoveredUser(null)}
                >
                  <td style={styles.td}>
                    <div style={styles.userCell}>
                      <div style={styles.avatar}>
                        {(user.name || '?')
                          .split(' ')
                          .map((x) => x[0])
                          .join('')}
                      </div>

                      <div>
                        <div style={styles.userName}>{user.name}</div>
                        <div style={styles.userSub}>CRM Kullanıcısı</div>
                      </div>
                    </div>
                  </td>

                  <td style={styles.td}>{user.email}</td>

                  <td style={styles.td}>
                    <span style={styles.roleTag}>{getRoleLabel(user.role)}</span>
                  </td>

                  <td style={styles.td}>
                    <span style={styles.statusBadge(user.status)}>{user.status}</span>
                  </td>

                  <td style={styles.tdRight}>
                    <button style={styles.iconBtn} onClick={() => openEditUserModal(user)}>
                      <Edit3 size={15} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredUsers.length === 0 && (
            <div style={styles.empty}>
              <SearchIcon size={34} />
              <h3>Kullanıcı Bulunamadı</h3>
              <p>Arama kriterine uygun kullanıcı yok.</p>
            </div>
          )}
        </section>
      )}

      {activeSubTab === 'roles' && (
        <div style={styles.matrixContainer}>
          <aside style={styles.matrixSidebar}>
            <div style={styles.matrixSidebarHeader}>ROL ŞABLONLARI</div>

            <div style={styles.sidebarList}>
              {rolePerms.map((role) => (
                <button
                  key={role.id}
                  style={styles.roleCard(selectedRole?.id === role.id)}
                  onClick={() => setSelectedRole(role)}
                >
                  <div style={styles.roleCardTitle}>{role.label}</div>
                  <div style={styles.roleCardDesc}>{role.desc}</div>
                  <div style={styles.roleCardFooter}>{role.permissions.length} AKTİF YETKİ</div>
                </button>
              ))}
            </div>

            <button style={styles.newRoleButton} onClick={() => notify('Yeni rol şablonu için backend endpointi bağlanmalı.')}>
              <PlusIcon size={14} />
              Yeni Rol Şablonu
            </button>
          </aside>

          <section style={styles.matrixMain}>
            <div style={styles.matrixHeader}>
              <div>
                <div style={styles.matrixTitle}>
                  Yetki Atamaları:{' '}
                  <span style={styles.redText}>{selectedRole?.label}</span>
                </div>
                <div style={styles.matrixSubtitle}>
                  CRM modülleri ve erişim seviyeleri
                </div>
              </div>

              <button
                style={styles.primaryButtonSmall}
                onClick={saveRolePermissions}
                disabled={savingRole}
              >
                <SaveIcon size={16} />
                {savingRole ? 'Kaydediliyor...' : 'Kaydet'}
              </button>
            </div>

            <div style={styles.matrixScroll}>
              {Object.entries(groupedPermissions).map(([module, perms]) => (
                <div key={module} style={styles.moduleGroup}>
                  <div style={styles.moduleTitle}>
                    <div style={styles.moduleLine} />
                    {module}
                  </div>

                  <div style={styles.permissionGrid}>
                    {perms.map((perm) => {
                      const hasPerm = selectedRole?.permissions?.includes(perm.code);

                      return (
                        <button
                          key={perm.code}
                          style={styles.permItem(hasPerm)}
                          onClick={() => togglePermission(selectedRole?.id, perm.code)}
                        >
                          <div style={styles.permCheck(hasPerm)}>
                            {hasPerm ? <CheckSquare size={17} /> : <Square size={17} />}
                          </div>

                          <div style={styles.permTextArea}>
                            <div style={styles.permName}>
                              {perm.name}
                              {perm.code.includes('sensitive') && (
                                <span style={styles.criticalBadge}>KRİTİK</span>
                              )}
                            </div>
                            <div style={styles.permDesc}>{perm.desc}</div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}

      {showUserModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalCard}>
            <div style={styles.modalHeader}>
              <div>
                <h2 style={styles.modalTitle}>
                  {editingUser ? 'Kullanıcı Düzenle' : 'Yeni Kullanıcı Ekle'}
                </h2>
                <p style={styles.modalSubtitle}>
                  Kullanıcı adı, e-posta ve rol bilgilerini yönet.
                </p>
              </div>

              <button style={styles.closeButton} onClick={closeUserModal}>
                <X size={18} />
              </button>
            </div>

            <div style={styles.formGrid}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Ad Soyad</label>
                <input
                  style={styles.formInput}
                  value={userForm.name}
                  onChange={(e) => setUserForm({ ...userForm, name: e.target.value })}
                  placeholder="Örn: Hüseyin Bayram"
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>E-posta</label>
                <input
                  style={styles.formInput}
                  value={userForm.email}
                  onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                  placeholder="ornek@crm.com"
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Rol / Yetki</label>
                <select
                  style={styles.formInput}
                  value={userForm.role}
                  onChange={(e) => setUserForm({ ...userForm, role: e.target.value })}
                >
                  {rolePerms.map((role) => (
                    <option key={role.id} value={role.name}>
                      {role.label}
                    </option>
                  ))}
                </select>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Durum</label>
                <select
                  style={styles.formInput}
                  value={userForm.status}
                  onChange={(e) => setUserForm({ ...userForm, status: e.target.value })}
                >
                  <option value="Aktif">Aktif</option>
                  <option value="Pasif">Pasif</option>
                </select>
              </div>
            </div>

            <div style={styles.modalActions}>
              

              <div style={styles.modalRightActions}>
                <button style={styles.cancelButton} onClick={closeUserModal}>
                  Vazgeç
                </button>

                <button style={styles.saveUserButton} onClick={saveUser}>
                  {editingUser ? 'Güncelle' : 'Kullanıcı Ekle'}
                </button>
              </div>
            </div>
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
    minHeight: '100vh',
    padding: 32,
    background: darkMode
      ? 'radial-gradient(circle at top left, #1f0f16 0%, #050506 34%, #050506 100%)'
      : 'linear-gradient(135deg, #fff7f8 0%, #f8fafc 45%, #ffffff 100%)',
    color: darkMode ? '#f8fafc' : '#0f172a',
    fontFamily:
      'Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
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
    lineHeight: 1.6,
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

  primaryButtonSmall: {
    height: 38,
    padding: '0 16px',
    borderRadius: 14,
    borderWidth: 0,
    background: 'linear-gradient(135deg, #991b1b, #ef4444)',
    color: '#ffffff',
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    cursor: 'pointer',
    fontWeight: 900,
    boxShadow: '0 10px 24px rgba(239,68,68,0.30)',
  },

  secondaryButton: {
    height: 38,
    padding: '0 16px',
    borderRadius: 14,
    borderWidth: 0,
    background: 'linear-gradient(135deg, #991b1b, #ef4444)',
    color: '#ffffff',
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    cursor: 'pointer',
    fontWeight: 900,
    boxShadow: '0 10px 24px rgba(239,68,68,0.30)',
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

  tableToolbar: {
    padding: 18,
    display: 'flex',
    justifyContent: 'space-between',
    gap: 14,
    borderBottom: darkMode ? '1px solid #332025' : '1px solid #fecdd3',
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
    minWidth: 320,
  },

  searchInput: {
    flex: 1,
    borderWidth: 0,
    outline: 'none',
    background: 'transparent',
    color: darkMode ? '#f8fafc' : '#111827',
    fontSize: 13,
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

  thRight: {
    padding: '18px 16px',
    textAlign: 'right',
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

  td: {
    padding: '17px 16px',
    color: darkMode ? '#e2e8f0' : '#111827',
    verticalAlign: 'middle',
  },

  tdRight: {
    padding: '17px 16px',
    textAlign: 'right',
  },

  userCell: {
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

  userName: {
    color: darkMode ? '#ffffff' : '#111827',
    fontWeight: 900,
  },

  userSub: {
    marginTop: 3,
    fontSize: 10,
    color: darkMode ? '#cbd5e1' : '#64748b',
    fontWeight: 700,
  },

  roleTag: {
    background: darkMode
      ? 'linear-gradient(135deg, #3b1116, #7f1d1d)'
      : 'linear-gradient(135deg, #fee2e2, #fecaca)',
    color: darkMode ? '#fb7185' : '#dc2626',
    padding: '6px 10px',
    borderRadius: 999,
    fontSize: 11,
    fontWeight: 900,
  },

  statusBadge: (status) => ({
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 62,
    padding: '6px 10px',
    borderRadius: 999,
    fontSize: 10,
    fontWeight: 900,
    background:
      status === 'Aktif'
        ? darkMode
          ? '#052e16'
          : '#dcfce7'
        : darkMode
        ? '#27272f'
        : '#f1f5f9',
    color:
      status === 'Aktif'
        ? '#16a34a'
        : darkMode
        ? '#cbd5e1'
        : '#475569',
  }),

  iconBtn: {
    width: 34,
    height: 34,
    borderRadius: 12,
    borderWidth: 0,
    background: darkMode ? '#222329' : '#fff1f2',
    color: darkMode ? '#fb7185' : '#dc2626',
    cursor: 'pointer',
  },

  empty: {
    padding: 80,
    textAlign: 'center',
    color: darkMode ? '#cbd5e1' : '#64748b',
  },

  matrixContainer: {
    display: 'grid',
    gridTemplateColumns: '280px 1fr',
    gap: 22,
    alignItems: 'start',
  },

  matrixSidebar: {
    background: darkMode
      ? 'linear-gradient(145deg, #151519, #1f2026)'
      : 'linear-gradient(145deg, #ffffff, #fff7f8)',
    border: darkMode ? '1px solid #332025' : '1px solid #fecdd3',
    borderRadius: 22,
    padding: 18,
    boxShadow: darkMode
      ? '0 18px 42px rgba(0,0,0,0.34)'
      : '0 18px 42px rgba(239,68,68,0.08)',
  },

  matrixSidebarHeader: {
    fontSize: 10,
    fontWeight: 900,
    color: darkMode ? '#fda4af' : '#be123c',
    letterSpacing: 1,
    marginBottom: 14,
  },

  sidebarList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
    marginBottom: 16,
  },

  roleCard: (active) => ({
    width: '100%',
    textAlign: 'left',
    borderRadius: 16,
    padding: 14,
    cursor: 'pointer',
    border: active
      ? '1px solid #ef4444'
      : darkMode
      ? '1px solid #332025'
      : '1px solid #fecdd3',
    background: active
      ? 'linear-gradient(135deg, rgba(153,27,27,0.35), rgba(239,68,68,0.14))'
      : darkMode
      ? '#111114'
      : '#fff1f2',
    color: darkMode ? '#ffffff' : '#111827',
  }),

  roleCardTitle: {
    fontSize: 14,
    fontWeight: 900,
    marginBottom: 4,
  },

  roleCardDesc: {
    fontSize: 11,
    color: darkMode ? '#cbd5e1' : '#64748b',
    lineHeight: 1.5,
    marginBottom: 8,
  },

  roleCardFooter: {
    fontSize: 10,
    color: darkMode ? '#fb7185' : '#dc2626',
    fontWeight: 900,
  },

  newRoleButton: {
    width: '100%',
    height: 42,
    borderRadius: 14,
    border: darkMode ? '1px dashed #7f1d1d' : '1px dashed #fca5a5',
    background: 'transparent',
    color: darkMode ? '#fb7185' : '#dc2626',
    fontWeight: 900,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },

  matrixMain: {
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

  matrixHeader: {
    padding: 20,
    background: darkMode
      ? 'linear-gradient(135deg, #20212a, #251820)'
      : 'linear-gradient(135deg, #fff1f2, #f8fafc)',
    borderBottom: darkMode ? '1px solid #332025' : '1px solid #fecdd3',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 14,
  },

  matrixTitle: {
    fontSize: 18,
    fontWeight: 900,
    color: darkMode ? '#ffffff' : '#111827',
  },

  matrixSubtitle: {
    fontSize: 12,
    color: darkMode ? '#cbd5e1' : '#64748b',
    marginTop: 4,
  },

  matrixScroll: {
    padding: 22,
  },

  moduleGroup: {
    marginBottom: 28,
  },

  moduleTitle: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    fontSize: 12,
    fontWeight: 900,
    color: darkMode ? '#fb7185' : '#dc2626',
    textTransform: 'uppercase',
    marginBottom: 14,
    letterSpacing: 1,
  },

  moduleLine: {
    width: 4,
    height: 14,
    background: 'linear-gradient(135deg, #991b1b, #ef4444)',
    borderRadius: 99,
  },

  permissionGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))',
    gap: 12,
  },

  permItem: (active) => ({
    borderRadius: 16,
    border: active
      ? '1px solid rgba(239,68,68,0.55)'
      : darkMode
      ? '1px solid #332025'
      : '1px solid #fecdd3',
    background: active
      ? darkMode
        ? 'rgba(239,68,68,0.09)'
        : '#fff1f2'
      : darkMode
      ? '#111114'
      : '#ffffff',
    padding: 14,
    display: 'flex',
    alignItems: 'flex-start',
    gap: 10,
    cursor: 'pointer',
    textAlign: 'left',
    color: darkMode ? '#ffffff' : '#111827',
  }),

  permCheck: (active) => ({
    color: active ? '#ef4444' : darkMode ? '#52525b' : '#94a3b8',
    marginTop: 2,
    flexShrink: 0,
  }),

  permTextArea: {
    flex: 1,
    minWidth: 0,
  },

  permName: {
    fontSize: 13,
    fontWeight: 900,
    marginBottom: 4,
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    color: darkMode ? '#ffffff' : '#111827',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },

  permDesc: {
    fontSize: 11,
    color: darkMode ? '#cbd5e1' : '#64748b',
    lineHeight: 1.45,
  },

  criticalBadge: {
    fontSize: 8,
    fontWeight: 900,
    padding: '2px 5px',
    background: 'linear-gradient(135deg, #991b1b, #ef4444)',
    color: '#fff',
    borderRadius: 6,
    flexShrink: 0,
  },

  footer: {
    marginTop: 50,
    paddingTop: 28,
    borderTop: darkMode ? '1px solid #332025' : '1px solid #fecdd3',
    textAlign: 'center',
    color: darkMode ? '#cbd5e1' : '#64748b',
    fontSize: 10,
    fontWeight: 900,
    letterSpacing: 3,
    textTransform: 'uppercase',
  },
  modalOverlay: {
  position: 'fixed',
  inset: 0,
  zIndex: 9998,
  background: darkMode ? 'rgba(0,0,0,0.72)' : 'rgba(15,23,42,0.35)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 20,
},

modalCard: {
  width: '100%',
  maxWidth: 540,
  background: darkMode
    ? 'linear-gradient(145deg, #151519, #1f2026)'
    : 'linear-gradient(145deg, #ffffff, #fff7f8)',
  border: darkMode ? '1px solid #332025' : '1px solid #fecdd3',
  borderRadius: 24,
  padding: 24,
  boxShadow: darkMode
    ? '0 24px 70px rgba(0,0,0,0.55)'
    : '0 24px 70px rgba(239,68,68,0.18)',
},

modalHeader: {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
  gap: 16,
  marginBottom: 22,
},

modalTitle: {
  margin: 0,
  fontSize: 22,
  fontWeight: 900,
  color: darkMode ? '#ffffff' : '#111827',
},

modalSubtitle: {
  margin: '6px 0 0',
  fontSize: 12,
  color: darkMode ? '#cbd5e1' : '#64748b',
  fontWeight: 700,
},

closeButton: {
  width: 36,
  height: 36,
  borderRadius: 12,
  borderWidth: 0,
  background: darkMode ? '#222329' : '#fff1f2',
  color: darkMode ? '#fb7185' : '#dc2626',
  cursor: 'pointer',
},

formGrid: {
  display: 'grid',
  gridTemplateColumns: '1fr',
  gap: 15,
},

formGroup: {
  display: 'flex',
  flexDirection: 'column',
  gap: 7,
},

label: {
  fontSize: 11,
  fontWeight: 900,
  color: darkMode ? '#fda4af' : '#be123c',
  textTransform: 'uppercase',
  letterSpacing: 0.8,
},

formInput: {
  height: 42,
  borderRadius: 13,
  border: darkMode ? '1px solid #3f3f46' : '1px solid #fecdd3',
  background: darkMode ? '#111114' : '#ffffff',
  color: darkMode ? '#f8fafc' : '#111827',
  outline: 'none',
  padding: '0 13px',
  fontSize: 13,
  fontWeight: 700,
},

modalActions: {
  marginTop: 24,
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  gap: 14,
},

modalRightActions: {
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  marginLeft: 'auto',
},

cancelButton: {
  height: 38,
  padding: '0 15px',
  borderRadius: 13,
  border: darkMode ? '1px solid #3f3f46' : '1px solid #fecdd3',
  background: darkMode ? '#222329' : '#ffffff',
  color: darkMode ? '#e2e8f0' : '#475569',
  cursor: 'pointer',
  fontWeight: 900,
},

saveUserButton: {
  height: 38,
  padding: '0 16px',
  borderRadius: 13,
  borderWidth: 0,
  background: 'linear-gradient(135deg, #991b1b, #ef4444)',
  color: '#ffffff',
  cursor: 'pointer',
  fontWeight: 900,
  boxShadow: '0 10px 24px rgba(239,68,68,0.30)',
},

deleteButton: {
  height: 38,
  padding: '0 15px',
  borderRadius: 13,
  borderWidth: 0,
  background: darkMode ? '#3b1116' : '#fee2e2',
  color: darkMode ? '#fb7185' : '#b91c1c',
  cursor: 'pointer',
  fontWeight: 900,
  display: 'flex',
  alignItems: 'center',
  gap: 8,
},
});