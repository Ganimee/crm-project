'use client';

import React, { useState, useEffect } from 'react';
import {
  Search,
  Download,
  Star,
  AlertTriangle,
  TrendingUp,
  Users,
  MoreVertical,
  CheckCircle2,
  ChevronDown,
  CalendarDays,
} from 'lucide-react';

import { useTheme } from '../context/ThemeContext';
import { useRouter } from 'next/navigation';

import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

export default function MusteriListesiPage() {
  const { isDarkMode } = useTheme();
  const darkMode = isDarkMode;
  const styles = getStyles(darkMode);
  const router = useRouter();

  const [customers, setCustomers] = useState([]);

  const [kpis, setKpis] = useState({
    total_customers: 0,
    repeat_purchase_rate: 0,
    risky_customers: 0,
    avg_spend: 0,
  });

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const pageSize = 50;

  const [searchTerm, setSearchTerm] = useState('');
  const [city, setCity] = useState('Tümü');
  const [segment, setSegment] = useState('Tümü');
  const [risk, setRisk] = useState('Tümü');

  const [minSpend, setMinSpend] = useState('');
  const [maxSpend, setMaxSpend] = useState('');
  const [minOrders, setMinOrders] = useState('');
  const [maxOrders, setMaxOrders] = useState('');

  const [lastPurchaseFrom, setLastPurchaseFrom] = useState('');
  const [lastPurchaseTo, setLastPurchaseTo] = useState('');

  const [behaviorFilter, setBehaviorFilter] = useState('');

  const [rMin, setRMin] = useState('');
  const [rMax, setRMax] = useState('');
  const [fMin, setFMin] = useState('');
  const [fMax, setFMax] = useState('');
  const [mMin, setMMin] = useState('');
  const [mMax, setMMax] = useState('');
  const [rfmScore, setRfmScore] = useState('');

  const [salesChannel, setSalesChannel] = useState('Tümü');
  const [lastStore, setLastStore] = useState('');

  const [returnFilter, setReturnFilter] = useState('');
  const [minReturns, setMinReturns] = useState('');
  const [maxReturns, setMaxReturns] = useState('');

  const [selectedIds, setSelectedIds] = useState([]);
  const [notification, setNotification] = useState('');
  const [hoveredRow, setHoveredRow] = useState(null);

  const [allCities, setAllCities] = useState(['Tümü']);
  const [allSegments, setAllSegments] = useState(['Tümü']);

  const behaviorButtons = [
    { label: 'Son 7 Gün', value: 'last7' },
    { label: 'Son 15 Gün', value: 'last15' },
    { label: 'Son 30 Gün', value: 'last30' },
  ];

  useEffect(() => {
    const fetchFilters = async () => {
      try {
        const token =
          localStorage.getItem('token') ||
          localStorage.getItem('access_token');

        if (!token) return;

        const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/customers/filters`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const data = await res.json();

        if (!res.ok) {
          console.error('Filtre API hatası:', data);
          return;
        }

        setAllCities(data.cities || ['Tümü']);
        setAllSegments(data.segments || ['Tümü']);
      } catch (err) {
        console.error('Filtreler alınamadı:', err);
      }
    };

    fetchFilters();
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    const fetchCustomers = async () => {
      try {
        const token =
          localStorage.getItem('token') ||
          localStorage.getItem('access_token');

        if (!token) return;

        const params = new URLSearchParams({
          page: page.toString(),
          page_size: pageSize.toString(),
        });

        if (searchTerm.trim()) params.append('search', searchTerm.trim());
        if (city !== 'Tümü') params.append('city', city);
        if (segment !== 'Tümü') params.append('segment', segment);
        if (risk !== 'Tümü') params.append('risk', risk);

        if (minSpend !== '') params.append('min_spend', minSpend);
        if (maxSpend !== '') params.append('max_spend', maxSpend);
        if (minOrders !== '') params.append('min_orders', minOrders);
        if (maxOrders !== '') params.append('max_orders', maxOrders);

        if (lastPurchaseFrom !== '') params.append('last_purchase_from', lastPurchaseFrom);
        if (lastPurchaseTo !== '') params.append('last_purchase_to', lastPurchaseTo);

        if (behaviorFilter) params.append('behavior_filter', behaviorFilter);

        if (rMin !== '') params.append('r_min', rMin);
        if (rMax !== '') params.append('r_max', rMax);
        if (fMin !== '') params.append('f_min', fMin);
        if (fMax !== '') params.append('f_max', fMax);
        if (mMin !== '') params.append('m_min', mMin);
        if (mMax !== '') params.append('m_max', mMax);
        if (rfmScore !== '') params.append('rfm_score', rfmScore);

        if (salesChannel !== 'Tümü') params.append('sales_channel', salesChannel);
        if (lastStore !== '') params.append('last_store', lastStore);

        if (returnFilter) params.append('return_filter', returnFilter);
        if (minReturns !== '') params.append('min_returns', minReturns);
        if (maxReturns !== '') params.append('max_returns', maxReturns);

        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_BASE_URL}/customers?${params.toString()}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
            signal: controller.signal,
          }
        );

        const data = await res.json();

        if (!res.ok) {
          console.error('Müşteri API hatası:', data);
          return;
        }

        setCustomers(data.items || []);
        setTotalPages(data.total_pages || 1);

        setKpis({
          total_customers: data.kpis?.total_customers || data.total || 0,
          repeat_purchase_rate: data.kpis?.repeat_purchase_rate || 0,
          risky_customers: data.kpis?.risky_customers || 0,
          avg_spend: data.kpis?.avg_spend || 0,
        });

        setSelectedIds([]);
      } catch (err) {
        if (err.name !== 'AbortError') {
          console.error('Müşteri listesi API hatası:', err);
        }
      }
    };

    fetchCustomers();

    return () => controller.abort();
  }, [
    page,
    searchTerm,
    city,
    segment,
    risk,
    minSpend,
    maxSpend,
    minOrders,
    maxOrders,
    lastPurchaseFrom,
    lastPurchaseTo,
    behaviorFilter,
    rMin,
    rMax,
    fMin,
    fMax,
    mMin,
    mMax,
    rfmScore,
    salesChannel,
    lastStore,
    returnFilter,
    minReturns,
    maxReturns,
  ]);

  const cities = allCities;
  const segments = allSegments;
  const filteredCustomers = customers;

  const showNotify = (message) => {
    setNotification(message);
    setTimeout(() => setNotification(''), 2500);
  };

  const clearFilters = () => {
    setSearchTerm('');
    setCity('Tümü');
    setSegment('Tümü');
    setRisk('Tümü');
    setMinSpend('');
    setMaxSpend('');
    setMinOrders('');
    setMaxOrders('');
    setLastPurchaseFrom('');
    setLastPurchaseTo('');
    setBehaviorFilter('');
    setRMin('');
    setRMax('');
    setFMin('');
    setFMax('');
    setMMin('');
    setMMax('');
    setRfmScore('');
    setSalesChannel('Tümü');
    setLastStore('');
    setReturnFilter('');
    setMinReturns('');
    setMaxReturns('');
    setPage(1);
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedIds(filteredCustomers.map((c) => c.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectRow = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const exportExcel = async () => {
    try {
      const token =
        localStorage.getItem('token') ||
        localStorage.getItem('access_token');

      if (!token) return;

      const params = new URLSearchParams();

      if (searchTerm.trim()) params.append('search', searchTerm.trim());
      if (city !== 'Tümü') params.append('city', city);
      if (segment !== 'Tümü') params.append('segment', segment);
      if (risk !== 'Tümü') params.append('risk', risk);

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/customers/export?${params.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!res.ok) {
        const data = await res.json();
        console.error('Excel export hatası:', data);
        return;
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = url;
      link.download = 'musteri_listesi.xlsx';
      document.body.appendChild(link);
      link.click();
      link.remove();

      window.URL.revokeObjectURL(url);

      showNotify('Excel dosyası indirildi.');
    } catch (err) {
      console.error('Excel indirme hatası:', err);
    }
  };

  return (
    <div style={styles.page}>
      <style jsx global>{`
        .crm-date-picker {
          width: 100%;
          border: none;
          outline: none;
          background: transparent;
          color: ${darkMode ? '#f8fafc' : '#111827'};
          font-size: 12px;
          font-weight: 800;
          cursor: pointer;
        }

        .crm-date-picker::placeholder {
          color: ${darkMode ? '#94a3b8' : '#64748b'};
        }

        .crm-calendar {
          border-radius: 18px !important;
          overflow: hidden !important;
          border: 1px solid #fecdd3 !important;
          box-shadow: 0 18px 40px rgba(225,29,72,0.22) !important;
          font-family: inherit !important;
        }

        .crm-calendar-dark {
          background: #17181d !important;
          border: 1px solid #3f3f46 !important;
        }

        .crm-calendar .react-datepicker__header {
          background: linear-gradient(135deg, #e11d48, #fb7185) !important;
          border-bottom: none !important;
        }

        .crm-calendar .react-datepicker__current-month,
        .crm-calendar .react-datepicker__day-name {
          color: white !important;
          font-weight: 900 !important;
        }

        .crm-calendar .react-datepicker__month {
          background: ${darkMode ? '#17181d' : '#ffffff'} !important;
          padding: 10px !important;
          margin: 0 !important;
        }

        .crm-calendar .react-datepicker__day {
          color: ${darkMode ? '#e2e8f0' : '#111827'} !important;
          border-radius: 10px !important;
          font-weight: 700 !important;
        }

        .crm-calendar .react-datepicker__day:hover {
          background: rgba(225,29,72,0.15) !important;
          color: #e11d48 !important;
        }

        .crm-calendar .react-datepicker__day--selected,
        .crm-calendar .react-datepicker__day--keyboard-selected {
          background: linear-gradient(135deg, #e11d48, #fb7185) !important;
          color: white !important;
        }

        .react-datepicker-popper {
          z-index: 99999 !important;
        }
          .crm-calendar .react-datepicker__month-dropdown,
.crm-calendar .react-datepicker__year-dropdown {
  background: #17181d !important;
  border: 1px solid #3f3f46 !important;
  border-radius: 12px !important;
  overflow: hidden !important;
  box-shadow: 0 12px 30px rgba(0,0,0,0.35) !important;
}

.crm-calendar .react-datepicker__month-option,
.crm-calendar .react-datepicker__year-option {
  color: #f8fafc !important;
  background: #17181d !important;
  font-weight: 700 !important;
  padding: 10px 14px !important;
}

.crm-calendar .react-datepicker__month-option:hover,
.crm-calendar .react-datepicker__year-option:hover {
  background: rgba(251,113,133,0.16) !important;
  color: #fb7185 !important;
}

.crm-calendar .react-datepicker__month-read-view,
.crm-calendar .react-datepicker__year-read-view {
  border-radius: 10px !important;
  padding: 4px 10px !important;
  background: rgba(255,255,255,0.08) !important;
  color: white !important;
  font-weight: 800 !important;
  border: 1px solid rgba(255,255,255,0.08) !important;
}

.crm-calendar .react-datepicker__month-read-view:hover,
.crm-calendar .react-datepicker__year-read-view:hover {
  background: rgba(251,113,133,0.16) !important;
  border-color: rgba(251,113,133,0.35) !important;
}

.crm-calendar .react-datepicker__navigation-icon::before {
  border-color: #ffffff !important;
}

.crm-calendar .react-datepicker__triangle {
  display: none !important;
}
      `}</style>

      {notification && (
        <div style={styles.toast}>
          <CheckCircle2 size={18} />
          {notification}
        </div>
      )}

      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>
            Müşteri <span style={styles.redText}> Listesi </span>
          </h1>
        </div>

        <button style={styles.primaryButton} onClick={exportExcel}>
          <Download size={17} />
          Excel Export
        </button>
      </div>

      <div style={styles.statsGrid}>
        <StatCard styles={styles} icon={Users} label="Toplam Müşteri" value={kpis.total_customers} tone="blue" />
        <StatCard styles={styles} icon={Star} label="Tekrar Satın Alma" value={`%${Number(kpis.repeat_purchase_rate || 0).toFixed(1)}`} tone="yellow" />
        <StatCard styles={styles} icon={AlertTriangle} label="Riskli Müşteriler" value={kpis.risky_customers} tone="red" />
        <StatCard
          styles={styles}
          icon={TrendingUp}
          label="Ortalama Harcama"
          value={`₺${Number(kpis.avg_spend || 0).toLocaleString('tr-TR')}`}
          tone="green"
        />
      </div>

      <div style={styles.filterBox}>
        <div style={styles.searchBox}>
          <Search size={17} color={darkMode ? '#fb7185' : '#e11d48'} />
          <input
            style={styles.searchInput}
            placeholder="Müşteri ara..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setPage(1);
            }}
          />
        </div>

        <CustomSelect value={city} options={cities} placeholder="Tüm Şehirler" styles={styles} onChange={(value) => { setCity(value); setPage(1); }} />
        <CustomSelect value={segment} options={segments} placeholder="Tüm Segmentler" styles={styles} onChange={(value) => { setSegment(value); setPage(1); }} />
        <CustomSelect value={risk} options={['Tümü', 'Düşük', 'Orta', 'Yüksek']} placeholder="Tüm Risk Grupları" styles={styles} onChange={(value) => { setRisk(value); setPage(1); }} />
        <CustomSelect value={salesChannel} options={['Tümü', 'Online', 'Mağaza']} placeholder="Tüm Kanallar" styles={styles} onChange={(value) => { setSalesChannel(value); setPage(1); }} />
        <CustomSelect value={returnFilter} options={['', 'has_returns', 'high_return_rate']} placeholder="İade Durumu" styles={styles} onChange={(value) => { setReturnFilter(value); setPage(1); }} />

        <div style={styles.filterPair}>
          <div style={styles.dateBox}>
            <CalendarDays size={16} color={darkMode ? '#fb7185' : '#e11d48'} />
            <span style={styles.minLabel}>BAŞ.</span>
            <DatePicker
              selected={lastPurchaseFrom ? new Date(lastPurchaseFrom) : null}
              onChange={(date) => {
                if (!date) return;
                setLastPurchaseFrom(date.toISOString().split('T')[0]);
                setPage(1);
              }}

             dateFormat="dd.MM.yyyy"
              placeholderText=""
              className="crm-date-picker"
              calendarClassName={darkMode ? 'crm-calendar crm-calendar-dark' : 'crm-calendar'}
              showMonthDropdown
              showYearDropdown
              scrollableYearDropdown
              yearDropdownItemNumber={80}
            />
          </div>

          <div style={styles.dateBox}>
            <CalendarDays size={16} color={darkMode ? '#fb7185' : '#e11d48'} />
            <span style={styles.minLabel}>BİT.</span>
            <DatePicker
              selected={lastPurchaseTo ? new Date(lastPurchaseTo) : null}
              onChange={(date) => {
                if (!date) return;
                setLastPurchaseTo(date.toISOString().split('T')[0]);
                setPage(1);
              }}
              dateFormat="dd.MM.yyyy"
                placeholderText=""
                className="crm-date-picker"
                calendarClassName={darkMode ? 'crm-calendar crm-calendar-dark' : 'crm-calendar'}
                showMonthDropdown
                showYearDropdown
                scrollableYearDropdown
                yearDropdownItemNumber={80}
            />
          </div>
        </div>

        <FilterNumberPair styles={styles} leftLabel="MİN SİP." leftValue={minOrders} leftSet={setMinOrders} rightLabel="MAX SİP." rightValue={maxOrders} rightSet={setMaxOrders} setPage={setPage} />
        <FilterNumberPair styles={styles} leftLabel="R MIN" leftValue={rMin} leftSet={setRMin} rightLabel="R MAX" rightValue={rMax} rightSet={setRMax} setPage={setPage} />
        <FilterNumberPair styles={styles} leftLabel="F MIN" leftValue={fMin} leftSet={setFMin} rightLabel="F MAX" rightValue={fMax} rightSet={setFMax} setPage={setPage} />
        <FilterNumberPair styles={styles} leftLabel="M MIN" leftValue={mMin} leftSet={setMMin} rightLabel="M MAX" rightValue={mMax} rightSet={setMMax} setPage={setPage} />
        <FilterNumberPair styles={styles} leftLabel="İADE MIN" leftValue={minReturns} leftSet={setMinReturns} rightLabel="İADE MAX" rightValue={maxReturns} rightSet={setMaxReturns} setPage={setPage} />

        <div style={styles.filterPair}>
          <div style={styles.minBox}>
            <span style={styles.minLabel}>RFM</span>
            <input style={styles.minInput} type="text" placeholder="" value={rfmScore} onChange={(e) => { setRfmScore(e.target.value); setPage(1); }} />
          </div>

          <div style={styles.minBox}>
            <span style={styles.minLabel}>MAĞAZA</span>
            <input style={styles.minInput} type="text" placeholder="" value={lastStore} onChange={(e) => { setLastStore(e.target.value); setPage(1); }} />
          </div>
        </div>

        <button style={styles.clearButton} onClick={clearFilters}>
          Filtreleri Temizle
        </button>
      </div>

      <div style={styles.behaviorBar}>
        {behaviorButtons.map((item) => (
          <button
            key={item.value}
            style={{
              ...styles.behaviorButton,
              ...(behaviorFilter === item.value ? styles.behaviorButtonActive : {}),
            }}
            onClick={() => {
              setBehaviorFilter((prev) => (prev === item.value ? '' : item.value));
              setPage(1);
            }}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div style={styles.tableCard}>
        <table style={styles.table}>
          <thead>
            <tr style={styles.tableHeadRow}>
              <th style={styles.th}>
                <input
                  type="checkbox"
                  checked={selectedIds.length === filteredCustomers.length && filteredCustomers.length > 0}
                  onChange={handleSelectAll}
                />
              </th>
              <th style={styles.th}>Müşteri Profili <ChevronDown size={12} /></th>
              <th style={styles.th}>Lokasyon</th>
              <th style={styles.th}>Segment</th>
              <th style={styles.th}>Finansal Veri</th>
              <th style={styles.th}>R</th>
              <th style={styles.th}>F</th>
              <th style={styles.th}>M</th>
              <th style={styles.th}>Risk</th>
              <th style={styles.th}>Son Alışveriş</th>
              <th style={styles.th}>Kanal / Mağaza</th>
              <th style={styles.th}></th>
            </tr>
          </thead>

          <tbody>
            {filteredCustomers.map((customer, index) => (
              <tr
                key={`${customer.id}-${customer.code}-${index}`}
                style={{
                  ...styles.tr,
                  ...(hoveredRow === customer.id ? styles.trHover : {}),
                  ...(selectedIds.includes(customer.id) ? styles.trSelected : {}),
                  cursor: 'pointer',
                }}
                onMouseEnter={() => setHoveredRow(customer.id)}
                onMouseLeave={() => setHoveredRow(null)}
                onClick={() => router.push(`/musteri-360?id=${customer.id}`)}
              >
                <td style={styles.td}>
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(customer.id)}
                    onClick={(e) => e.stopPropagation()}
                    onChange={() => handleSelectRow(customer.id)}
                  />
                </td>

                <td style={styles.td}>
                  <div style={styles.profile}>
                    <div style={styles.avatar}>
                      {(customer.name || '?').split(' ').map((x) => x[0]).join('')}
                    </div>

                    <div>
                      <div style={styles.nameRow}>
                        <span style={styles.name}>{customer.name || 'İsimsiz Müşteri'}</span>
                        {customer.isFavorite ? <Star size={14} fill="#facc15" color="#facc15" /> : null}
                      </div>
                      <div style={styles.code}>ID: {customer.code || '-'}</div>
                    </div>
                  </div>
                </td>

                <td style={styles.td}>{customer.city || 'Bilinmeyen'}</td>

                <td style={styles.td}>
                  <span style={styles.segmentBadge(customer.segment || 'Segmentsiz')}>
                    {customer.segment || 'Segmentsiz'}
                  </span>
                </td>

                <td style={styles.td}>
                  <div style={styles.money}>
                    Toplam: ₺{Number(customer.totalSpend || 0).toLocaleString('tr-TR')}
                  </div>
                  <div style={styles.smallText}>
                    Reel: ₺{Number(customer.realSpend || 0).toLocaleString('tr-TR')}
                  </div>
                  <div style={styles.smallText}>
                    Ort. Sipariş: ₺{Number(customer.avgOrderSpend || 0).toLocaleString('tr-TR')}
                  </div>
                  <div style={styles.smallText}>
                    {customer.orderCount || 0} sipariş
                  </div>
                </td>

                <td style={styles.td}>{customer.r_score || '-'}</td>
                <td style={styles.td}>{customer.f_score || '-'}</td>
                <td style={styles.td}>{customer.m_score || '-'}</td>

                <td style={styles.td}>
                  <span style={styles.riskBadge(customer.churnRisk || 'Düşük')}>
                    <span style={styles.dot(customer.churnRisk || 'Düşük')}></span>
                    {customer.churnRisk || 'Düşük'}
                  </span>
                </td>

                <td style={styles.td}>{customer.lastPurchase || '-'}</td>

                <td style={styles.td}>
                  {customer.lastChannel === 'Online' ? 'Online' : customer.lastStore || '-'}
                </td>

                <td style={styles.td}>
                  <button style={styles.moreButton}>
                    <MoreVertical size={18} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredCustomers.length === 0 && (
          <div style={styles.empty}>
            <Search size={34} />
            <h3>Kayıt Bulunamadı</h3>
            <p>Seçtiğiniz filtrelere uygun müşteri kaydı yok.</p>
          </div>
        )}
      </div>

      <div style={styles.pagination}>
        <button
          disabled={page === 1}
          onClick={() => setPage((p) => Math.max(p - 1, 1))}
          style={{
            ...styles.primaryButton,
            opacity: page === 1 ? 0.5 : 1,
            cursor: page === 1 ? 'not-allowed' : 'pointer',
          }}
        >
          Önceki
        </button>

        <span style={{ fontWeight: 900 }}>
          Sayfa {page} / {totalPages}
        </span>

        <button
          disabled={page === totalPages}
          onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
          style={{
            ...styles.primaryButton,
            opacity: page === totalPages ? 0.5 : 1,
            cursor: page === totalPages ? 'not-allowed' : 'pointer',
          }}
        >
          Sonraki
        </button>
      </div>
    </div>
  );
}

function FilterNumberPair({
  styles,
  leftLabel,
  leftValue,
  leftSet,
  rightLabel,
  rightValue,
  rightSet,
  setPage,
}) {
  return (
    <div style={styles.filterPair}>
      <div style={styles.minBox}>
        <span style={styles.minLabel}>{leftLabel}</span>
        <input
          style={styles.minInput}
          type="number"
          value={leftValue}
          onChange={(e) => {
            leftSet(e.target.value);
            setPage(1);
          }}
        />
      </div>

      <div style={styles.minBox}>
        <span style={styles.minLabel}>{rightLabel}</span>
        <input
          style={styles.minInput}
          type="number"
          value={rightValue}
          onChange={(e) => {
            rightSet(e.target.value);
            setPage(1);
          }}
        />
      </div>
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

function CustomSelect({ value, options, onChange, placeholder, styles }) {
  const [open, setOpen] = React.useState(false);

  const getLabel = (item) => {
    if (item === 'Tümü' || item === '') return placeholder;
    if (item === 'has_returns') return 'İade Yapmış';
    if (item === 'high_return_rate') return 'İade Oranı Yüksek';
    return item;
  };

  return (
    <div style={styles.customSelectWrapper}>
      <button
        type="button"
        style={styles.customSelectButton(open)}
        onClick={() => setOpen((prev) => !prev)}
      >
        <span>{getLabel(value)}</span>
        <span style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)', transition: '0.2s' }}>
          ▼
        </span>
      </button>

      {open && (
        <div style={styles.customDropdown}>
          {options.map((item) => (
            <div
              key={item || 'empty'}
              style={{
                ...styles.customDropdownItem,
                ...(value === item ? styles.customDropdownItemActive : {}),
              }}
              onClick={() => {
                onChange(item);
                setOpen(false);
              }}
            >
              {getLabel(item)}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const getStyles = (darkMode) => ({
  page: {
    padding: 32,
    minHeight: '100vh',
    background: darkMode
      ? 'radial-gradient(circle at top left, #1f0f16 0%, #050506 32%, #050506 100%)'
      : 'linear-gradient(135deg, #fff7f8 0%, #f8fafc 45%, #eef2ff 100%)',
    color: darkMode ? '#f8fafc' : '#0f172a',
  },

  toast: {
    position: 'fixed',
    top: 22,
    right: 100,
    zIndex: 9999,
    background: 'linear-gradient(135deg, #e11d48, #fb7185)',
    color: '#fff',
    padding: '12px 18px',
    borderRadius: 14,
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    boxShadow: '0 12px 35px rgba(225,29,72,0.42)',
    fontWeight: 700,
  },

  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 28,
    gap: 20,
  },

  title: {
    fontSize: 30,
    fontWeight: 900,
    color: darkMode ? '#ffffff' : '#111827',
    margin: 0,
  },

  redText: {
    color: darkMode ? '#fb7185' : '#e11d48',
    fontWeight: 900,
  },

  strongText: {
    color: darkMode ? '#ffffff' : '#111827',
    fontWeight: 900,
  },

  primaryButton: {
    height: 42,
    padding: '0 18px',
    borderRadius: 18,
    border: 'none',
    background: 'linear-gradient(135deg, #e11d48, #fb7185)',
    color: '#ffffff',
    display: 'flex',
    alignItems: 'center',
    gap: 18,
    cursor: 'pointer',
    fontWeight: 900,
    boxShadow: '0 12px 30px rgba(225,29,72,0.38)',
    marginTop: 39,
  },

  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
    gap: 20,
    marginBottom: 26,
  },

  statCard: {
    background: darkMode
      ? 'linear-gradient(145deg, #17181d, #20212a)'
      : 'linear-gradient(145deg, #ffffff, #fff5f6)',
    border: darkMode ? '1px solid #32323c' : '1px solid #ffe4e6',
    borderRadius: 18,
    padding: 20,
    display: 'flex',
    alignItems: 'center',
    gap: 18,
    boxShadow: darkMode
      ? '0 14px 32px rgba(0,0,0,0.26)'
      : '0 12px 30px rgba(225,29,72,0.08)',
  },

  statIcon: (tone) => {
    const colors = {
      yellow: ['linear-gradient(135deg, #422f06, #713f12)', '#fde68a'],
      red: ['linear-gradient(135deg, #3b161b, #881337)', '#fb7185'],
      green: ['linear-gradient(135deg, #102e1d, #14532d)', '#4ade80'],
      blue: ['linear-gradient(135deg, #11284a, #1e3a8a)', '#60a5fa'],
    };

    const lightColors = {
      yellow: ['linear-gradient(135deg, #fef3c7, #fde68a)', '#b45309'],
      red: ['linear-gradient(135deg, #ffe4e6, #fecdd3)', '#e11d48'],
      green: ['linear-gradient(135deg, #dcfce7, #bbf7d0)', '#16a34a'],
      blue: ['linear-gradient(135deg, #dbeafe, #bfdbfe)', '#2563eb'],
    };

    const selected = darkMode ? colors[tone] : lightColors[tone];

    return {
      width: 54,
      height: 54,
      borderRadius: 16,
      background: selected[0],
      color: selected[1],
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      boxShadow:
        tone === 'red'
          ? '0 12px 25px rgba(225,29,72,0.22)'
          : '0 10px 22px rgba(15,23,42,0.10)',
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

  filterBox: {
    background: darkMode
      ? 'linear-gradient(145deg, #17181d, #20212a)'
      : 'linear-gradient(145deg, #ffffff, #fff7f8)',
    border: darkMode ? '1px solid #32323c' : '1px solid #ffe4e6',
    borderRadius: 18,
    padding: 18,
    display: 'grid',
    gridTemplateColumns: '1.4fr repeat(4, 1fr)',
    gap: 14,
    marginBottom: 26,
    boxShadow: darkMode
      ? '0 12px 28px rgba(0,0,0,0.22)'
      : '0 12px 28px rgba(225,29,72,0.07)',
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
    border: 'none',
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
    fontWeight: 700,
    outline: 'none',
  },

  customSelectWrapper: {
    position: 'relative',
    width: '100%',
    zIndex: 20,
  },

  customSelectButton: (open) => ({
    height: 42,
    width: '100%',
    borderRadius: 12,
    border: open
      ? '1px solid #fb7185'
      : darkMode
        ? '1px solid #3f3f46'
        : '1px solid #fecdd3',
    background: darkMode ? '#222329' : '#fff1f2',
    color: darkMode ? '#f8fafc' : '#111827',
    padding: '0 12px',
    fontWeight: 800,
    outline: 'none',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    boxShadow: open
      ? '0 0 0 3px rgba(225,29,72,0.18), 0 12px 26px rgba(225,29,72,0.22)'
      : 'none',
  }),

  customDropdown: {
    position: 'absolute',
    top: 48,
    left: 0,
    right: 0,
    zIndex: 9999,
    maxHeight: 230,
    overflowY: 'auto',
    padding: 6,
    borderRadius: 14,
    background: darkMode
      ? 'linear-gradient(145deg, #17181d, #222329)'
      : 'linear-gradient(145deg, #ffffff, #fff1f2)',
    border: darkMode ? '1px solid #3f3f46' : '1px solid #fecdd3',
    boxShadow: darkMode
      ? '0 18px 40px rgba(0,0,0,0.45)'
      : '0 18px 40px rgba(225,29,72,0.18)',
  },

  customDropdownItem: {
    padding: '11px 12px',
    borderRadius: 10,
    color: darkMode ? '#e2e8f0' : '#111827',
    fontWeight: 800,
    fontSize: 13,
    cursor: 'pointer',
    transition: '0.2s ease',
  },

  customDropdownItemActive: {
    background: 'linear-gradient(135deg, #e11d48, #fb7185)',
    color: '#ffffff',
    boxShadow: '0 8px 18px rgba(225,29,72,0.28)',
  },

  minBox: {
    height: 42,
    borderRadius: 12,
    border: darkMode ? '1px solid #3f3f46' : '1px solid #fecdd3',
    background: darkMode ? '#222329' : '#fff1f2',
    display: 'flex',
    alignItems: 'center',
    padding: '0 12px',
    gap: 8,
  },

  dateBox: {
    height: 42,
    borderRadius: 12,
    border: darkMode ? '1px solid #3f3f46' : '1px solid #fecdd3',
    background: darkMode ? '#222329' : '#fff1f2',
    display: 'flex',
    alignItems: 'center',
    padding: '0 12px',
    gap: 8,
    boxShadow: darkMode
      ? 'inset 0 0 0 1px rgba(251,113,133,0.05)'
      : 'inset 0 0 0 1px rgba(225,29,72,0.06)',
  },

  dateInput: {
    width: '100%',
    border: 'none',
    outline: 'none',
    background: 'transparent',
    color: darkMode ? '#f8fafc' : '#111827',
    fontWeight: 800,
    fontSize: 12,
    cursor: 'pointer',
    colorScheme: darkMode ? 'dark' : 'light',
  },

  minLabel: {
    color: darkMode ? '#fb7185' : '#e11d48',
    fontSize: 10,
    fontWeight: 900,
    whiteSpace: 'nowrap',
  },

  minInput: {
    width: '100%',
    border: 'none',
    outline: 'none',
    background: 'transparent',
    color: darkMode ? '#f8fafc' : '#111827',
    fontWeight: 700,
  },

  clearButton: {
    height: 42,
    borderRadius: 12,
    border: darkMode ? '1px solid #3f3f46' : '1px solid #fecdd3',
    background: darkMode ? '#222329' : '#ffffff',
    color: darkMode ? '#fb7185' : '#e11d48',
    fontWeight: 900,
    cursor: 'pointer',
  },

  tableCard: {
    background: darkMode
      ? 'linear-gradient(145deg, #17181d, #1f2026)'
      : '#ffffff',
    border: darkMode ? '1px solid #32323c' : '1px solid #ffe4e6',
    borderRadius: 22,
    overflow: 'hidden',
    boxShadow: darkMode
      ? '0 18px 42px rgba(0,0,0,0.34)'
      : '0 18px 42px rgba(225,29,72,0.08)',
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
    background: darkMode ? 'rgba(225,29,72,0.08)' : '#fff1f2',
  },

  trSelected: {
    background: darkMode ? 'rgba(225,29,72,0.12)' : '#ffe4e6',
  },

  td: {
    padding: '17px 16px',
    color: darkMode ? '#e2e8f0' : '#111827',
    verticalAlign: 'middle',
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
      ? 'linear-gradient(135deg, #3b161b, #881337)'
      : 'linear-gradient(135deg, #ffe4e6, #fecdd3)',
    border: darkMode ? '1px solid #fb7185' : '1px solid #fda4af',
    color: darkMode ? '#ffe4e6' : '#be123c',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 900,
    fontSize: 12,
    boxShadow: '0 8px 18px rgba(225,29,72,0.18)',
  },

  nameRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },

  name: {
    color: darkMode ? '#ffffff' : '#111827',
    fontWeight: 900,
  },

  code: {
    marginTop: 3,
    fontSize: 10,
    color: darkMode ? '#cbd5e1' : '#64748b',
    fontWeight: 700,
  },

  segmentBadge: (segment) => {
    const map = {
      VIP: darkMode
        ? ['linear-gradient(135deg, #422f06, #713f12)', '#fde68a']
        : ['linear-gradient(135deg, #fef3c7, #fde68a)', '#b45309'],
      Premium: darkMode
        ? ['linear-gradient(135deg, #3b161b, #881337)', '#fb7185']
        : ['linear-gradient(135deg, #ffe4e6, #fecdd3)', '#e11d48'],
      Standart: darkMode
        ? ['linear-gradient(135deg, #11284a, #1e3a8a)', '#60a5fa']
        : ['linear-gradient(135deg, #dbeafe, #bfdbfe)', '#2563eb'],
      'Kayıp Adayı': darkMode
        ? ['linear-gradient(135deg, #27272f, #3f3f46)', '#e2e8f0']
        : ['linear-gradient(135deg, #f1f5f9, #e2e8f0)', '#475569'],
      Segmentsiz: darkMode
        ? ['linear-gradient(135deg, #27272f, #3f3f46)', '#e2e8f0']
        : ['linear-gradient(135deg, #f1f5f9, #e2e8f0)', '#475569'],
    };

    const selected = map[segment] || map.Segmentsiz;

    return {
      background: selected[0],
      color: selected[1],
      padding: '5px 9px',
      borderRadius: 8,
      fontSize: 10,
      fontWeight: 900,
      textTransform: 'uppercase',
      boxShadow: '0 8px 18px rgba(15,23,42,0.08)',
    };
  },

  money: {
    color: darkMode ? '#ffffff' : '#111827',
    fontWeight: 900,
  },

  smallText: {
    marginTop: 4,
    fontSize: 10,
    color: darkMode ? '#cbd5e1' : '#64748b',
  },

  riskBadge: (risk) => {
    const colors = {
      Düşük: darkMode
        ? ['linear-gradient(135deg, #102e1d, #14532d)', '#4ade80']
        : ['linear-gradient(135deg, #dcfce7, #bbf7d0)', '#16a34a'],
      Orta: darkMode
        ? ['linear-gradient(135deg, #422f06, #713f12)', '#fde68a']
        : ['linear-gradient(135deg, #fef3c7, #fde68a)', '#b45309'],
      Yüksek: darkMode
        ? ['linear-gradient(135deg, #3b161b, #881337)', '#fb7185']
        : ['linear-gradient(135deg, #ffe4e6, #fecdd3)', '#e11d48'],
    };

    const selected = colors[risk] || colors.Düşük;

    return {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6,
      background: selected[0],
      color: selected[1],
      padding: '5px 10px',
      borderRadius: 999,
      fontSize: 11,
      fontWeight: 900,
      boxShadow: '0 8px 18px rgba(15,23,42,0.08)',
    };
  },

  dot: (risk) => ({
    width: 6,
    height: 6,
    borderRadius: '50%',
    background:
      risk === 'Yüksek' ? '#fb7185' : risk === 'Orta' ? '#facc15' : '#4ade80',
    boxShadow:
      risk === 'Yüksek'
        ? '0 0 10px rgba(251,113,133,0.8)'
        : risk === 'Orta'
          ? '0 0 10px rgba(250,204,21,0.8)'
          : '0 0 10px rgba(74,222,128,0.8)',
  }),

  moreButton: {
    width: 34,
    height: 34,
    borderRadius: 10,
    border: darkMode ? '1px solid #32323c' : '1px solid #ffe4e6',
    background: darkMode ? '#222329' : '#fff1f2',
    color: darkMode ? '#fb7185' : '#e11d48',
    cursor: 'pointer',
  },

  empty: {
    padding: 80,
    textAlign: 'center',
    color: darkMode ? '#cbd5e1' : '#64748b',
  },

  pagination: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    marginTop: 20,
  },

  behaviorBar: {
    display: 'flex',
    gap: 10,
    flexWrap: 'wrap',
    marginBottom: 24,
  },

  behaviorButton: {
    border: darkMode ? '1px solid #3f3f46' : '1px solid #fecdd3',
    background: darkMode ? '#222329' : '#ffffff',
    color: darkMode ? '#fb7185' : '#e11d48',
    borderRadius: 999,
    padding: '10px 16px',
    fontWeight: 900,
    cursor: 'pointer',
  },

  behaviorButtonActive: {
    background: 'linear-gradient(135deg, #e11d48, #fb7185)',
    color: '#ffffff',
    border: '1px solid transparent',
  },

  filterPair: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 10,
  },
});