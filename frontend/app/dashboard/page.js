
'use client';


import React, { useEffect, useMemo, useState } from 'react';
import {
  TrendingUp,
  Users,
  AlertTriangle,
  Download,
  BrainCircuit,
  Filter,
  MapPin,
  Store,
  Tags,
  ShoppingBag,
  RotateCcw,
  Package,
  PieChart,
  
  Loader2,
  CalendarDays ,
} from 'lucide-react';

import {
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart as RePieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';



import { useTheme } from '../context/ThemeContext';



const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL;

const COLORS = ['#ef4444', '#dc2626', '#b91c1c', '#991b1b', '#7f1d1d', '#450a0a'];

function KPICard({ styles, title, value, icon: Icon, highlight = false }) {
  return (
    <div style={{ ...styles.kpiCard, ...(highlight ? styles.kpiCardRed : {}) }}>
      <div style={styles.kpiTop}>
        <div>
          <p style={styles.kpiTitle}>{title}</p>
          <p style={styles.kpiValue}>{value}</p>
        </div>

        <div style={{ ...styles.kpiIconBox, ...(highlight ? styles.kpiIconBoxRed : {}) }}>
          <Icon size={23} />
        </div>
      </div>

      <p style={styles.kpiSubText}>seçilen filtrelere göre</p>
    </div>
  );
}

function SectionHeader({ styles, title, description }) {
  return (
    <div style={styles.sectionHeader}>
      <h3 style={styles.sectionTitle}>{title}</h3>
      <p style={styles.sectionDesc}>{description}</p>
    </div>
  );
}

function EmptyChart({ styles, text = 'Bu grafik için veri bulunamadı.' }) {
  return (
    <div style={styles.emptyChart}>
      <p style={styles.emptyChartText}>{text}</p>
    </div>
  );
}

function ChartCard({ styles, title, description, children }) {
  return (
    <div style={styles.card}>
      <SectionHeader styles={styles} title={title} description={description} />
      {children}
    </div>
  );
}

function FilterSelect({
  styles,
  label,
  icon: Icon,
  value,
  onChange,
  options,
  compact = false,
  wide = false,
}) {
  return (
    <div
      style={{
        ...styles.inputGroup,
        ...(compact ? styles.inputGroupCompact : {}),
        ...(wide ? styles.inputGroupWide : {}),
      }}
    >
      <label style={styles.inputLabel}>
        {Icon && <Icon size={13} />}
        {label}
      </label>

      <CustomSelect
        value={value}
        options={options}
        onChange={onChange}
        placeholder={label}
        styles={styles}
      />
    </div>
  );
}

function FilterInput({
  styles,
  label,
  icon: Icon,
  type = 'text',
  value,
  onChange,
  placeholder,
  compact = false,
  wide = false,
}) {
  return (
    <div
      style={{
        ...styles.inputGroup,
        ...(compact ? styles.inputGroupCompact : {}),
        ...(wide ? styles.inputGroupWide : {}),
      }}
    >
      <label style={styles.inputLabel}>
        {Icon && <Icon size={13} />}
        {label}
      </label>

      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={styles.input}
      />
    </div>
  );
}


function CustomSelect({ value, options, onChange, placeholder, styles }) {
  const [open, setOpen] = useState(false);

  const getLabel = (item) => {
    if (typeof item === 'object' && item !== null) return item.label;
    if (item === 'Tümü' || item === '') return placeholder;
    return item;
  };

  const getValue = (item) => {
    return typeof item === 'object' && item !== null ? item.value : item;
  };

  return (
    <div style={styles.customSelectWrapper}>
      <button
        type="button"
        style={styles.customSelectButton(open)}
        onClick={() => setOpen((prev) => !prev)}
      >
        {getLabel(options.find((x) => getValue(x) === value) || value)}

        <span
          style={{
            transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: '0.2s',
          }}
        >
          ▼
        </span>
      </button>

      {open && (
        <div style={styles.customDropdown}>
          {options.map((item) => {
            const optionValue = getValue(item);

            return (
              <div
                key={optionValue}
                style={{
                  ...styles.customDropdownItem,
                  ...(value === optionValue ? styles.customDropdownItemActive : {}),
                }}
                onClick={() => {
                  onChange(optionValue);
                  setOpen(false);
                }}
              >
                {getLabel(item)}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function DashboardPage() {
  const { isDarkMode } = useTheme();
  const darkMode = isDarkMode;
  const styles = getStyles(darkMode);

  

  const [activeTab, setActiveTab] = useState('sales');

  const [amountMode, setAmountMode] = useState('reel');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [city, setCity] = useState('Tümü');
  const [branch, setBranch] = useState('Tümü');
  const [brand, setBrand] = useState('Tümü');
  const [category, setCategory] = useState('Tümü');
  const [channel, setChannel] = useState('Tümü');
  const [campaignSale, setCampaignSale] = useState('Tümü');
  const [includeReturns, setIncludeReturns] = useState('Dahil');
  const [returnStatus, setReturnStatus] = useState('Tümü');
  const [segment, setSegment] = useState('Tümü');
  const [riskStatus, setRiskStatus] = useState('Tümü');
  const [vipFilter, setVipFilter] = useState('Tümü');
  const [customerType, setCustomerType] = useState('Tümü');
  const [minRevenue, setMinRevenue] = useState('');
  const [maxRevenue, setMaxRevenue] = useState('');
  const [minOrderAmount, setMinOrderAmount] = useState('');
  const [productCount, setProductCount] = useState('');
  const [minLtv, setMinLtv] = useState('');
  const [minFrequency, setMinFrequency] = useState('');
  const [lastPurchaseDate, setLastPurchaseDate] = useState('');

  const [filterOptions, setFilterOptions] = useState({
    cities: ['Tümü'],
    branches: ['Tümü'],
    brands: ['Tümü'],
    categories: ['Tümü'],
    channels: ['Tümü'],
    segments: ['Tümü'],
  });

  const [salesData, setSalesData] = useState(null);
  const [orderData, setOrderData] = useState(null);
  const [customerData, setCustomerData] = useState(null);

  const [loading, setLoading] = useState(false);
  const [filterLoading, setFilterLoading] = useState(false);
  const [error, setError] = useState('');
  const [aiResult, setAiResult] = useState('');

  const activeLabel = useMemo(() => {
    if (activeTab === 'sales') return 'Satış';
    if (activeTab === 'orders') return 'Sipariş';
    return 'Müşteri';
  }, [activeTab]);

  const authHeaders = () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

    return {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
  };

  const formatCurrency = (value) => {
    return `₺${Number(value || 0).toLocaleString('tr-TR', {
      maximumFractionDigits: 0,
    })}`;
  };

  const formatNumber = (value) => {
    return Number(value || 0).toLocaleString('tr-TR');
  };

  const formatPercent = (value) => {
    return `%${Number(value || 0).toLocaleString('tr-TR', {
      maximumFractionDigits: 2,
    })}`;
  };

  const fetchFilterOptions = async () => {
    setFilterLoading(true);

    try {
      const res = await fetch(`${API_BASE}/dashboard/filters`, {
        headers: authHeaders(),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.detail || 'Filtreler alınamadı.');
      }

      setFilterOptions({
        cities: data.cities || ['Tümü'],
        branches: data.branches || ['Tümü'],
        brands: data.brands || ['Tümü'],
        categories: data.categories || ['Tümü'],
        channels: data.channels || ['Tümü'],
        segments: data.segments || ['Tümü'],
      });
    } catch (err) {
      console.error('Dashboard filtre hatası:', err);

      setFilterOptions({
        cities: ['Tümü'],
        branches: ['Tümü'],
        brands: ['Tümü'],
        categories: ['Tümü'],
        channels: ['Tümü'],
        segments: ['Tümü'],
      });
    } finally {
      setFilterLoading(false);
    }
  };

  const buildParams = () => {
    const params = new URLSearchParams();

    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);

    params.append('city', city);
    params.append('amount_mode', amountMode);

    if (activeTab === 'sales') {
      params.append('branch', branch);
      params.append('brand', brand);
      params.append('category', category);
      params.append('channel', channel);
      params.append('campaign_sale', campaignSale);
      params.append('include_returns', includeReturns);

      if (minRevenue) params.append('min_revenue', minRevenue);
      if (maxRevenue) params.append('max_revenue', maxRevenue);
    }

    if (activeTab === 'orders') {
      params.append('branch', branch);
      params.append('brand', brand);
      params.append('category', category);
      params.append('channel', channel);
      params.append('return_status', returnStatus);

      if (minOrderAmount) params.append('min_order_amount', minOrderAmount);
      if (productCount) params.append('product_count', productCount);
    }

    if (activeTab === 'customers') {
      params.append('segment', segment);
      params.append('risk_status', riskStatus);
      params.append('vip_filter', vipFilter);
      params.append('customer_type', customerType);

      if (minLtv) params.append('min_ltv', minLtv);
      if (minFrequency) params.append('min_frequency', minFrequency);
      if (lastPurchaseDate) params.append('last_purchase_date', lastPurchaseDate);
    }

    return params;
  };

  const fetchDashboardData = async () => {
    setLoading(true);
    setError('');
    setAiResult('');

    try {
      let endpoint = '/dashboard/sales';

      if (activeTab === 'orders') endpoint = '/dashboard/orders';
      if (activeTab === 'customers') endpoint = '/dashboard/customers';

      const params = buildParams();
    const res = await fetch(`${API_BASE}${endpoint}?${params.toString()}`, {
      headers: authHeaders(),
    });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.detail || 'Dashboard verisi alınamadı.');
      }

      if (activeTab === 'sales') setSalesData(data);
      if (activeTab === 'orders') setOrderData(data);
      if (activeTab === 'customers') setCustomerData(data);
    } catch (err) {
      if (err.name === 'AbortError') return;

      console.error('Dashboard veri hatası:', err);
      setError(err.message || 'Dashboard verisi alınamadı.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFilterOptions();
  }, []);

useEffect(() => {
  const timer = setTimeout(() => {
    fetchDashboardData();
  }, 500);

  return () => {
    clearTimeout(timer);
  };
}, [
    activeTab,
    amountMode,
    startDate,
    endDate,
    city,
    branch,
    brand,
    category,
    channel,
    campaignSale,
    includeReturns,
    returnStatus,
    segment,
    riskStatus,
    vipFilter,
    customerType,
    minRevenue,
    maxRevenue,
    minOrderAmount,
    productCount,
    minLtv,
    minFrequency,
    lastPurchaseDate,
  ]);

  const salesKpis = salesData?.kpis || {};
  const orderKpis = orderData?.kpis || {};
  const customerKpis = customerData?.kpis || {};

  const salesTrendData = salesData?.ciro_trend || [];
  const nominalReelData = salesData?.reel_nominal_karsilastirma || [];
  const brandPerformanceData = salesData?.marka_performansi || [];
  const categoryPerformanceData = salesData?.kategori_performansi || [];

  const salesChannelData = useMemo(() => {
    const rawData = salesData?.satis_kanali_dagilimi || [];

    const grouped = {
      Online: 0,
      Mağaza: 0,
    };

    rawData.forEach((item) => {
      const name = String(item.name || '').toLowerCase();
      const value = Number(item.value || 0);

      if (
        name.includes('online') ||
        name.includes('web') ||
        name.includes('internet') ||
        name.includes('sporthink.com.tr') ||
        name.includes('.com')
      ) {
        grouped.Online += value;
      } else {
        grouped.Mağaza += value;
      }
    });

    return Object.entries(grouped)
      .filter(([, value]) => value > 0)
      .map(([name, value]) => ({ name, value }));
  }, [salesData]);

  const orderTrendData = orderData?.siparis_trend || [];
  const salesReturnCompareData = orderData?.satis_iade_karsilastirma || [];
  const returnTrendData = orderData?.iade_trend || [];
  const brandReturnData = orderData?.marka_bazli_iade || [];
  const categoryReturnData = orderData?.kategori_bazli_iade || [];

  const orderChannelData = useMemo(() => {
    const rawData = orderData?.siparis_kanali_dagilimi || [];

    const grouped = {
      Online: 0,
      Mağaza: 0,
    };

    rawData.forEach((item) => {
      const name = String(item.name || '').toLowerCase();
      const value = Number(item.value || 0);

      if (
        name.includes('online') ||
        name.includes('web') ||
        name.includes('internet') ||
        name.includes('sporthink.com.tr') ||
        name.includes('.com')
      ) {
        grouped.Online += value;
      } else {
        grouped.Mağaza += value;
      }
    });

    return Object.entries(grouped)
      .filter(([, value]) => value > 0)
      .map(([name, value]) => ({ name, value }));
  }, [orderData]);

  const avgProductTrendData = orderData?.ortalama_urun_sayisi_trend || [];

  const avgProductPerOrder = useMemo(() => {
  if (!avgProductTrendData || avgProductTrendData.length === 0) return 0;

  const total = avgProductTrendData.reduce(
    (sum, item) => sum + Number(item.value || 0),
    0
  );

  return total / avgProductTrendData.length;
}, [avgProductTrendData]);

  const newReturningCustomerData = customerData?.yeni_vs_geri_donen || [];
  const cohortData = customerData?.cohort_analizi || [];
  const lifecycleFunnelData = customerData?.musteri_yasam_dongusu || [];
  const churnTrendData = customerData?.churn_trend || [];
  const cityCustomerData = customerData?.sehir_bazli_musteri || [];
  const segmentDistributionData = customerData?.segment_dagilimi || [];
  const purchaseFrequencyData = customerData?.satin_alma_frekansi || [];
  const ltvTrendData = customerData?.ortalama_ltv_trend || [];
  const riskyActiveData = customerData?.riskli_vs_aktif || [];
  const acquisitionSourceData = customerData?.musteri_kazanim_kaynagi || [];



  const runLocalAIAnalysis = () => {
    if (activeTab === 'sales') {
      setAiResult(
        `Satış tarafında ${formatCurrency(
          salesKpis.toplam_ciro_nominal
        )} nominal ciro ve ${formatCurrency(
          salesKpis.toplam_ciro_reel
        )} reel ciro oluştu. En güçlü marka ${
          salesKpis.en_guclu_marka || '-'
        }, en güçlü kategori ${
          salesKpis.en_guclu_kategori || '-'
        }. Reel/nominal farkı ve marka performansı birlikte yorumlanmalı.`
      );
    }

    if (activeTab === 'orders') {
      setAiResult(
        `Sipariş tarafında toplam ${formatNumber(
          orderKpis.toplam_siparis
        )} sipariş var. İade oranı ${formatPercent(
          orderKpis.iade_orani
        )}. Marka ve kategori bazlı iade grafikleri, hangi ürün gruplarında operasyonel risk olduğunu gösterir.`
      );
    }

    if (activeTab === 'customers') {
      setAiResult(
        `Müşteri tarafında toplam ${formatNumber(
          customerKpis.toplam_musteri
        )} müşteri var. Riskli müşteri sayısı ${formatNumber(
          customerKpis.riskli_musteri
        )}. Ortalama LTV ${formatCurrency(
          customerKpis.ortalama_ltv
        )} ve tekrar satın alma oranı ${formatPercent(
          customerKpis.tekrar_satin_alma_orani
        )}.`
      );
    }
  };

  const convertRowsToCsv = (rows) => {
    if (!rows || rows.length === 0) {
      return 'Veri bulunamadı\n';
    }

    const headers = Object.keys(rows[0]);

    const csvRows = [
      headers.join(';'),
      ...rows.map((row) =>
        headers
          .map((key) => {
            const value = row[key] ?? '';
            return `"${String(value).replaceAll('"', '""')}"`;
          })
          .join(';')
      ),
    ];

    return csvRows.join('\n');
  };

  const exportToExcel = () => {
    let sections = [];

    if (activeTab === 'sales') {
      sections = [
        ['KPI', [salesKpis]],
        ['Ciro Trend', salesTrendData],
        ['Reel Nominal Karşılaştırma', nominalReelData],
        ['Marka Performansı', brandPerformanceData],
        ['Kategori Performansı', categoryPerformanceData],
        ['Satış Kanalı Dağılımı', salesChannelData],
      ];
    }

    if (activeTab === 'orders') {
      sections = [
        ['KPI', [orderKpis]],
        ['Sipariş Trend', orderTrendData],
       
        ['Satış İade Karşılaştırma', salesReturnCompareData],
        ['İade Trend', returnTrendData],
        ['Marka Bazlı İade', brandReturnData],
        ['Kategori Bazlı İade', categoryReturnData],
      
       
      ];
    }

    if (activeTab === 'customers') {
      sections = [
        ['KPI', [customerKpis]],
        ['Yeni vs Geri Dönen', newReturningCustomerData],
        ['Cohort Analizi', cohortData],
        ['Müşteri Yaşam Döngüsü', lifecycleFunnelData],
        ['Churn Trend', churnTrendData],
        ['Şehir Bazlı Müşteri', cityCustomerData],
        ['Segment Dağılımı', segmentDistributionData],
        ['Satın Alma Frekansı', purchaseFrequencyData],
        ['Ortalama LTV Trend', ltvTrendData],
        ['Riskli vs Aktif', riskyActiveData],
        ['Müşteri Kazanım Kaynağı', acquisitionSourceData],
      ];
    }

    const csvContent = sections
      .map(([title, rows]) => `${title}\n${convertRowsToCsv(rows)}`)
      .join('\n\n');

    const blob = new Blob([`\uFEFF${csvContent}`], {
      type: 'text/csv;charset=utf-8;',
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.setAttribute('href', url);
    link.setAttribute('download', `${activeLabel.toLowerCase()}_analiz_raporu.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

 const renderSalesFilters = () => (
  <div style={styles.filterGrid}>
    <FilterInput
      styles={styles}
      label="Başlangıç Tarihi"
      icon={CalendarDays}
      type="date"
      value={startDate}
      onChange={setStartDate}
    />

    <FilterInput
      styles={styles}
      label="Bitiş Tarihi"
      icon={CalendarDays}
      type="date"
      value={endDate}
      onChange={setEndDate}
    />

      <FilterSelect styles={styles} label="Şehir" icon={MapPin} value={city} onChange={setCity} options={filterOptions.cities} />
      <FilterSelect styles={styles} label="Şube" icon={Store} value={branch} onChange={setBranch} options={filterOptions.branches} />
      <FilterSelect styles={styles} label="Marka" icon={Tags} value={brand} onChange={setBrand} options={filterOptions.brands} />
      <FilterSelect styles={styles} label="Kategori" icon={Package} value={category} onChange={setCategory} options={filterOptions.categories} />
      <FilterSelect styles={styles} label="Satış Kanalı" icon={ShoppingBag} value={channel} onChange={setChannel} options={filterOptions.channels} />

      <FilterSelect
        styles={styles}
        label="Ciro Tipi"
        value={amountMode}
        onChange={setAmountMode}
        options={[
          { label: 'Reel Ciro', value: 'reel' },
          { label: 'Nominal Ciro', value: 'nominal' },
        ]}
        compact
      />

      <FilterInput styles={styles} label="Min Ciro" type="number" value={minRevenue} onChange={setMinRevenue} placeholder="₺ min" />
      <FilterInput styles={styles} label="Max Ciro" type="number" value={maxRevenue} onChange={setMaxRevenue} placeholder="₺ max" />

      <FilterSelect styles={styles} label="İade Dahil Et" value={includeReturns} onChange={setIncludeReturns} options={['Dahil', 'Hariç']} />
    </div>
  );

 const renderOrderFilters = () => (
  <div style={styles.filterGrid}>
    <FilterInput
      styles={styles}
      label="Başlangıç Tarihi"
      icon={CalendarDays}
      type="date"
      value={startDate}
      onChange={setStartDate}
    />

    <FilterInput
      styles={styles}
      label="Bitiş Tarihi"
      icon={CalendarDays}
      type="date"
      value={endDate}
      onChange={setEndDate}
    />

      <FilterSelect styles={styles} label="İade Durumu" icon={RotateCcw} value={returnStatus} onChange={setReturnStatus} options={['Tümü', 'İade Var', 'İade Yok']} />
      <FilterSelect styles={styles} label="Marka" icon={Tags} value={brand} onChange={setBrand} options={filterOptions.brands} />
      <FilterSelect styles={styles} label="Kategori" icon={Package} value={category} onChange={setCategory} options={filterOptions.categories} />
      <FilterSelect styles={styles} label="Şehir" icon={MapPin} value={city} onChange={setCity} options={filterOptions.cities} />
      <FilterSelect styles={styles} label="Şube" icon={Store} value={branch} onChange={setBranch} options={filterOptions.branches} />
      <FilterSelect styles={styles} label="Sipariş Kanalı" icon={ShoppingBag} value={channel} onChange={setChannel} options={filterOptions.channels} />

      <FilterInput styles={styles} label="Min Sipariş Tutarı" type="number" value={minOrderAmount} onChange={setMinOrderAmount} placeholder="₺ min" />
      <FilterInput styles={styles} label="Ürün Adedi" type="number" value={productCount} onChange={setProductCount} placeholder="adet" />

      <FilterSelect
        styles={styles}
        label="Ciro Tipi"
        value={amountMode}
        onChange={setAmountMode}
        options={[
          { label: 'Reel Ciro', value: 'reel' },
          { label: 'Nominal Ciro', value: 'nominal' },
        ]}
      />
    </div>
  );

  const renderCustomerFilters = () => (
  <div style={styles.filterGrid}>
    <FilterInput
      styles={styles}
      label="Başlangıç Tarihi"
      icon={CalendarDays}
      type="date"
      value={startDate}
      onChange={setStartDate}
    />

    <FilterInput
      styles={styles}
      label="Bitiş Tarihi"
      icon={CalendarDays}
      type="date"
      value={endDate}
      onChange={setEndDate}
    />

      <FilterSelect styles={styles} label="Şehir" icon={MapPin} value={city} onChange={setCity} options={filterOptions.cities} />
      <FilterSelect styles={styles} label="Segment" icon={PieChart} value={segment} onChange={setSegment} options={filterOptions.segments} />
      <FilterSelect styles={styles} label="Risk Durumu" icon={AlertTriangle} value={riskStatus} onChange={setRiskStatus} options={['Tümü', 'Riskli', 'Normal']} />
      <FilterInput styles={styles} label="Min LTV" type="number" value={minLtv} onChange={setMinLtv} placeholder="₺ min" />
      <FilterInput styles={styles} label="Min Frequency" type="number" value={minFrequency} onChange={setMinFrequency} placeholder="min alışveriş" />
      <FilterInput styles={styles} label="Son Alışveriş Tarihi" type="date" value={lastPurchaseDate} onChange={setLastPurchaseDate} />

      <FilterSelect styles={styles} label="Yeni / Geri Dönen" value={customerType} onChange={setCustomerType} options={['Tümü', 'Yeni', 'Geri Dönen']} />

      <FilterSelect
        styles={styles}
        label="Ciro Tipi"
        value={amountMode}
        onChange={setAmountMode}
        options={[
          { label: 'Reel Ciro', value: 'reel' },
          { label: 'Nominal Ciro', value: 'nominal' },
        ]}
        compact
      />
    </div>
  );

  const renderSalesPage = () => (
    <>
      <div style={styles.kpiGrid}>
        <KPICard styles={styles} title="Toplam Ciro Nominal" value={formatCurrency(salesKpis.toplam_ciro_nominal)} icon={TrendingUp} highlight />
        <KPICard styles={styles} title="Toplam Ciro Reel" value={formatCurrency(salesKpis.toplam_ciro_reel)} icon={TrendingUp} />
        <KPICard styles={styles} title="Satış Adedi" value={formatNumber(salesKpis.toplam_satis_adedi)} icon={ShoppingBag} />
        <KPICard styles={styles} title="Ortalama Sepet" value={formatCurrency(salesKpis.ortalama_sepet)} icon={ShoppingBag} />
        <KPICard styles={styles} title="En Güçlü Marka" value={salesKpis.en_guclu_marka || '-'} icon={Tags} />
        <KPICard styles={styles} title="En Güçlü Kategori" value={salesKpis.en_guclu_kategori || '-'} icon={Package} />
      </div>

      <div style={styles.contentGrid}>
        <div style={styles.leftColumn}>
          <ChartCard styles={styles} title="Ciro Trend Analizi" description="Zamana göre satış performansı">
            <div style={styles.bigChart}>
              {salesTrendData.length === 0 ? (
                <EmptyChart styles={styles} />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={salesTrendData}>
                    <CartesianGrid strokeDasharray="3 3" stroke={styles.chart.grid} vertical={false} />
                    <XAxis dataKey="name" stroke={styles.chart.text} />
                    <YAxis stroke={styles.chart.text} tickFormatter={(v) => formatCurrency(v)} />
                    <Tooltip contentStyle={styles.tooltipStyle} formatter={(v) => formatCurrency(v)} />
                    <Area type="monotone" dataKey="value" name={amountMode === 'reel' ? 'Reel Ciro' : 'Nominal Ciro'} stroke="#ef4444" fill="#ef4444" fillOpacity={0.18} strokeWidth={3} />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </ChartCard>

          <div style={styles.twoGrid}>
            <ChartCard styles={styles} title="Marka Performansı" description="Marka bazlı ciro / satış adedi">
              <div style={styles.mediumChart}>
                {brandPerformanceData.length === 0 ? (
                  <EmptyChart styles={styles} />
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart layout="vertical" data={brandPerformanceData}>
                      <XAxis type="number" hide />
                      <YAxis dataKey="name" type="category" stroke={styles.chart.text} width={95} />
                      <Tooltip contentStyle={styles.tooltipStyle} formatter={(v) => formatCurrency(v)} />
                      <Bar dataKey="value" fill="#ef4444" radius={[0, 8, 8, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </ChartCard>

            <ChartCard styles={styles} title="Kategori Performansı" description="Kategori dağılımı">
              <div style={styles.mediumChart}>
                {categoryPerformanceData.length === 0 ? (
                  <EmptyChart styles={styles} />
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <RePieChart>
                      <Pie data={categoryPerformanceData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={80}>
                        {categoryPerformanceData.map((entry, index) => (
                          <Cell key={index} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={styles.tooltipStyle} formatter={(v) => formatCurrency(v)} />
                      <Legend />
                    </RePieChart>
                  </ResponsiveContainer>
                )}
              </div>
            </ChartCard>
          </div>
        </div>

        <div style={styles.rightColumn}>
          <div style={styles.aiCard}>
            <BrainCircuit size={60} color="rgba(255,255,255,0.18)" style={styles.aiBgIcon} />
            <div style={styles.aiHeader}>
              <div style={styles.aiIcon}>
                <BrainCircuit size={18} />
              </div>
              <h3 style={styles.aiTitle}>Satış AI Özeti</h3>
            </div>

            <p style={styles.aiText}>
              Ciro trendi, reel/nominal farkı, marka performansı, kategori dağılımı ve satış kanalı analiz edilir.
            </p>

            <button onClick={runLocalAIAnalysis} style={styles.aiButton}>
              Satış Analizi Oluştur
            </button>

            {aiResult && activeTab === 'sales' && <p style={styles.aiResult}>{aiResult}</p>}
          </div>

          <ChartCard styles={styles} title="Reel vs Nominal Karşılaştırma" description="Enflasyon etkisi">
            <div style={styles.mediumChart}>
              {nominalReelData.length === 0 ? (
                <EmptyChart styles={styles} />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={nominalReelData}>
                    <CartesianGrid strokeDasharray="3 3" stroke={styles.chart.grid} vertical={false} />
                    <XAxis dataKey="name" stroke={styles.chart.text} />
                    <YAxis stroke={styles.chart.text} tickFormatter={(v) => formatCurrency(v)} />
                    <Tooltip contentStyle={styles.tooltipStyle} formatter={(v) => formatCurrency(v)} />
                    <Line type="monotone" dataKey="nominal" name="Nominal Ciro" stroke="#ef4444" strokeWidth={3} />
                    <Line type="monotone" dataKey="reel" name="Reel Ciro" stroke="#991b1b" strokeWidth={3} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </ChartCard>

         
        </div>
      </div>
    </>
  );

  const renderOrdersPage = () => (
    <>
     <div style={styles.kpiGrid}>
  <KPICard styles={styles} title="Toplam Sipariş" value={formatNumber(orderKpis.toplam_siparis)} icon={ShoppingBag} highlight />
  <KPICard styles={styles} title="İade Oranı" value={formatPercent(orderKpis.iade_orani)} icon={RotateCcw} />
  <KPICard styles={styles} title="Toplam İade" value={formatNumber(orderKpis.toplam_iade)} icon={RotateCcw} />
  <KPICard
    styles={styles}
    title="Sepet Başına Ürün"
    value={Number(avgProductPerOrder || 0).toLocaleString('tr-TR', {
      maximumFractionDigits: 2,
    })}
    icon={Package}
  />
</div>

      <div style={styles.contentGrid}>
        <div style={styles.leftColumn}>
          <ChartCard styles={styles} title="Sipariş Trend Grafiği" description="Zamana göre sipariş sayısı">
            <div style={styles.bigChart}>
              {orderTrendData.length === 0 ? (
                <EmptyChart styles={styles} />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={orderTrendData}>
                    <CartesianGrid strokeDasharray="3 3" stroke={styles.chart.grid} vertical={false} />
                    <XAxis dataKey="name" stroke={styles.chart.text} />
                    <YAxis stroke={styles.chart.text} />
                    <Tooltip contentStyle={styles.tooltipStyle} />
                    <Line type="monotone" dataKey="value" name="Sipariş" stroke="#ef4444" strokeWidth={3} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </ChartCard>

          <div style={styles.twoGrid}>
            
            <ChartCard styles={styles} title="Satış vs İade Karşılaştırması" description="Stacked bar görünümü">
              <div style={styles.mediumChart}>
                {salesReturnCompareData.length === 0 ? (
                  <EmptyChart styles={styles} />
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={salesReturnCompareData}>
                      <CartesianGrid strokeDasharray="3 3" stroke={styles.chart.grid} vertical={false} />
                      <XAxis dataKey="name" stroke={styles.chart.text} />
                      <YAxis stroke={styles.chart.text} />
                      <Tooltip contentStyle={styles.tooltipStyle} />
                      <Bar dataKey="satis" stackId="a" fill="#ef4444" />
                      <Bar dataKey="iade" stackId="a" fill="#7f1d1d" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </ChartCard>

            <ChartCard styles={styles} title="İade Trend Analizi" description="Zamana göre iade oranı">
              <div style={styles.mediumChart}>
                {returnTrendData.length === 0 ? (
                  <EmptyChart styles={styles} />
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={returnTrendData}>
                      <CartesianGrid strokeDasharray="3 3" stroke={styles.chart.grid} vertical={false} />
                      <XAxis dataKey="name" stroke={styles.chart.text} />
                      <YAxis stroke={styles.chart.text} />
                      <Tooltip contentStyle={styles.tooltipStyle} formatter={(v) => formatPercent(v)} />
                      <Line type="monotone" dataKey="value" name="İade Oranı" stroke="#ef4444" strokeWidth={3} />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>
            </ChartCard>

            <ChartCard styles={styles} title="Marka Bazlı İade Oranı" description="Kategori bazında satışa göre iade yüzdesi">
              <div style={styles.mediumChart}>
                {brandReturnData.length === 0 ? (
                  <EmptyChart styles={styles} />
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart layout="vertical" data={brandReturnData}>
                    <XAxis type="number" hide />
                    <YAxis dataKey="name" type="category" stroke={styles.chart.text} width={95} />

                    <Tooltip
                      contentStyle={styles.tooltipStyle}
                      formatter={(value) => [`%${Number(value).toFixed(2)}`, 'İade Oranı']}
                    />

                    <Bar dataKey="value" fill="#ef4444" radius={[0, 8, 8, 0]} />
                  </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </ChartCard>

            <ChartCard styles={styles} title="Kategori Bazlı İade Oranı" description="Kategori bazında satışa göre iade yüzdesi">
              <div style={styles.mediumChart}>
                {categoryReturnData.length === 0 ? (
                  <EmptyChart styles={styles} />
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={categoryReturnData}>
                      <CartesianGrid strokeDasharray="3 3" stroke={styles.chart.grid} vertical={false} />
                      <XAxis dataKey="name" stroke={styles.chart.text} />
                      <YAxis stroke={styles.chart.text} />
                      <Tooltip
                          contentStyle={styles.tooltipStyle}
                          formatter={(value, name, props) => [
                            `%${Number(value || 0).toLocaleString('tr-TR', { maximumFractionDigits: 2 })}`,
                            `İade Oranı | Satış: ${props.payload?.satis || 0} | İade: ${props.payload?.iade || 0}`,
                          ]}
                        />
                      <Bar dataKey="value" fill="#ef4444" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </ChartCard>

          

            
          </div>
        </div>

        <div style={styles.rightColumn}>
          <div style={styles.aiCard}>
            <BrainCircuit size={60} color="rgba(255,255,255,0.18)" style={styles.aiBgIcon} />
            <div style={styles.aiHeader}>
              <div style={styles.aiIcon}>
                <BrainCircuit size={18} />
              </div>
              <h3 style={styles.aiTitle}>Sipariş AI Özeti</h3>
            </div>

            <p style={styles.aiText}>İade, yoğun saat, kanal ve ürün adedi analizleri yorumlanır.</p>

            <button onClick={runLocalAIAnalysis} style={styles.aiButton}>
              Sipariş Analizi Oluştur
            </button>

            {aiResult && activeTab === 'orders' && <p style={styles.aiResult}>{aiResult}</p>}
          </div>
        </div>
      </div>
    </>
  );

  const renderCustomerPage = () => (
    <>
      <div style={styles.kpiGrid}>
        <KPICard styles={styles} title="Toplam Müşteri" value={formatNumber(customerKpis.toplam_musteri)} icon={Users} highlight />
        <KPICard styles={styles} title="Riskli Müşteri" value={formatNumber(customerKpis.riskli_musteri)} icon={AlertTriangle} />
        <KPICard styles={styles} title="Ortalama LTV" value={formatCurrency(customerKpis.ortalama_ltv)} icon={TrendingUp} />
        <KPICard styles={styles} title="Tekrar Satın Alma" value={formatPercent(customerKpis.tekrar_satin_alma_orani)} icon={ShoppingBag} />
        <KPICard styles={styles} title="Yeni Müşteri" value={formatNumber(customerKpis.yeni_musteri)} icon={Users} />
      </div>

      <div style={styles.contentGrid}>
        <div style={styles.leftColumn}>
          <ChartCard styles={styles} title="Yeni vs Geri Dönen Müşteri" description="Müşteri kazanımı ve geri dönüş">
            <div style={styles.bigChart}>
              {newReturningCustomerData.length === 0 ? (
                <EmptyChart styles={styles} />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={newReturningCustomerData}>
                    <CartesianGrid strokeDasharray="3 3" stroke={styles.chart.grid} vertical={false} />
                    <XAxis dataKey="name" stroke={styles.chart.text} />
                    <YAxis stroke={styles.chart.text} />
                    <Tooltip contentStyle={styles.tooltipStyle} />
                    <Area type="monotone" dataKey="yeni" stackId="1" stroke="#ef4444" fill="#ef4444" fillOpacity={0.22} />
                    <Area type="monotone" dataKey="geri_donen" stackId="1" stroke="#991b1b" fill="#991b1b" fillOpacity={0.22} />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </ChartCard>

          <div style={styles.twoGrid}>
         <ChartCard styles={styles} title="Cohort Analizi" description="Aylık müşteri geri dönüş oranı">
  <div style={styles.mediumChart}>
    {cohortData.length === 0 ? (
      <EmptyChart styles={styles} />
    ) : (
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={cohortData}>
          <CartesianGrid strokeDasharray="3 3" stroke={styles.chart.grid} vertical={false} />
          <XAxis dataKey="cohort" stroke={styles.chart.text} />
          <YAxis stroke={styles.chart.text} tickFormatter={(v) => `%${v}`} />
          <Tooltip
            contentStyle={styles.tooltipStyle}
            formatter={(value, name) => {
              if (name === 'retention') return [`%${value}`, 'Retention'];
              if (name === 'toplam') return [value, 'Toplam Müşteri'];
              if (name === 'tekrar_eden') return [value, 'Tekrar Eden'];
              return [value, name];
            }}
          />
          <Line
            type="monotone"
            dataKey="retention"
            name="Retention"
            stroke="#ef4444"
            strokeWidth={3}
            dot={{ r: 4 }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    )}
  </div>
</ChartCard>

            <ChartCard styles={styles} title="Müşteri Yaşam Döngüsü Funnel" description="Müşteri akış aşamaları">
              <div style={styles.funnelList}>
                {lifecycleFunnelData.length === 0 ? (
                  <EmptyChart styles={styles} />
                ) : (
                  lifecycleFunnelData.map((item) => (
                    <div key={item.name}>
                      <div style={styles.funnelTop}>
                        <span style={styles.funnelLabel}>{item.name}</span>
                        <span style={styles.funnelValue}>{formatNumber(item.value)}</span>
                      </div>

                      <div style={styles.funnelTrack}>
                        <div style={{ ...styles.funnelFill, width: `${item.percent || 0}%`, background: '#ef4444' }} />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </ChartCard>

            <ChartCard styles={styles} title="Churn Trend Analizi" description="Riskli müşteri eğilimi">
              <div style={styles.mediumChart}>
                {churnTrendData.length === 0 ? (
                  <EmptyChart styles={styles} />
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={churnTrendData}>
                      <CartesianGrid strokeDasharray="3 3" stroke={styles.chart.grid} vertical={false} />
                      <XAxis dataKey="name" stroke={styles.chart.text} />
                      <YAxis stroke={styles.chart.text} />
                      <Tooltip contentStyle={styles.tooltipStyle} />
                      <Line type="monotone" dataKey="riskli" name="Riskli" stroke="#ef4444" strokeWidth={3} />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>
            </ChartCard>

            <ChartCard styles={styles} title="Şehir Bazlı Müşteri Dağılımı" description="Lokasyona göre müşteri sayısı">
              <div style={styles.mediumChart}>
                {cityCustomerData.length === 0 ? (
                  <EmptyChart styles={styles} />
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={cityCustomerData}>
                      <CartesianGrid strokeDasharray="3 3" stroke={styles.chart.grid} vertical={false} />
                      <XAxis dataKey="name" stroke={styles.chart.text} />
                      <YAxis stroke={styles.chart.text} />
                      <Tooltip contentStyle={styles.tooltipStyle} />
                      <Bar dataKey="value" fill="#ef4444" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </ChartCard>

            <ChartCard styles={styles} title="Segment Dağılımı" description="Üst seviye müşteri segmentleri">
              <div style={styles.mediumChart}>
                {segmentDistributionData.length === 0 ? (
                  <EmptyChart styles={styles} />
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <RePieChart>
                      <Pie data={segmentDistributionData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={80}>
                        {segmentDistributionData.map((entry, index) => (
                          <Cell key={index} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={styles.tooltipStyle} />
                      <Legend />
                    </RePieChart>
                  </ResponsiveContainer>
                )}
              </div>
            </ChartCard>

            <ChartCard styles={styles} title="Satın Alma Frekansı" description="Müşteri alışveriş sıklığı">
              <div style={styles.mediumChart}>
                {purchaseFrequencyData.length === 0 ? (
                  <EmptyChart styles={styles} />
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={purchaseFrequencyData}>
                      <CartesianGrid strokeDasharray="3 3" stroke={styles.chart.grid} vertical={false} />
                      <XAxis dataKey="name" stroke={styles.chart.text} />
                      <YAxis stroke={styles.chart.text} />
                      <Tooltip contentStyle={styles.tooltipStyle} />
                      <Bar dataKey="value" fill="#ef4444" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </ChartCard>

            <ChartCard styles={styles} title="Ortalama LTV Trend" description="Zamana göre LTV değişimi">
              <div style={styles.mediumChart}>
                {ltvTrendData.length === 0 ? (
                  <EmptyChart styles={styles} />
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={ltvTrendData}>
                      <CartesianGrid strokeDasharray="3 3" stroke={styles.chart.grid} vertical={false} />
                      <XAxis dataKey="name" stroke={styles.chart.text} />
                      <YAxis stroke={styles.chart.text} tickFormatter={(v) => formatCurrency(v)} />
                      <Tooltip contentStyle={styles.tooltipStyle} formatter={(v) => formatCurrency(v)} />
                      <Area type="monotone" dataKey="value" stroke="#ef4444" fill="#ef4444" fillOpacity={0.18} />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </div>
            </ChartCard>

            <ChartCard styles={styles} title="Riskli vs Aktif Müşteri" description="Risk ve aktiflik karşılaştırması">
              <div style={styles.mediumChart}>
                {riskyActiveData.length === 0 ? (
                  <EmptyChart styles={styles} />
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={riskyActiveData}>
                      <CartesianGrid strokeDasharray="3 3" stroke={styles.chart.grid} vertical={false} />
                      <XAxis dataKey="name" stroke={styles.chart.text} />
                      <YAxis stroke={styles.chart.text} />
                      <Tooltip contentStyle={styles.tooltipStyle} />
                      <Bar dataKey="aktif" stackId="a" fill="#ef4444" />
                      <Bar dataKey="riskli" stackId="a" fill="#7f1d1d" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </ChartCard>

            <ChartCard styles={styles} title="Müşteri Kazanım Kaynağı" description="Kaynak bazlı müşteri kazanımı">
              <div style={styles.mediumChart}>
                {acquisitionSourceData.length === 0 ? (
                  <EmptyChart styles={styles} />
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <RePieChart>
                      <Pie data={acquisitionSourceData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={80}>
                        {acquisitionSourceData.map((entry, index) => (
                          <Cell key={index} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={styles.tooltipStyle} />
                      <Legend />
                    </RePieChart>
                  </ResponsiveContainer>
                )}
              </div>
            </ChartCard>
          </div>
        </div>

        <div style={styles.rightColumn}>
          <div style={styles.aiCard}>
            <BrainCircuit size={60} color="rgba(255,255,255,0.18)" style={styles.aiBgIcon} />
            <div style={styles.aiHeader}>
              <div style={styles.aiIcon}>
                <BrainCircuit size={18} />
              </div>
              <h3 style={styles.aiTitle}>Müşteri AI Özeti</h3>
            </div>

            <p style={styles.aiText}>Churn, LTV, yeni/geri dönen müşteri ve segment analizi yorumlanır.</p>

            <button onClick={runLocalAIAnalysis} style={styles.aiButton}>
              Müşteri Analizi Oluştur
            </button>

            {aiResult && activeTab === 'customers' && <p style={styles.aiResult}>{aiResult}</p>}
          </div>
        </div>
      </div>
    </>
  );

  return (
  <div style={styles.page}>
    
       
        <main style={styles.main}>
        <div style={styles.header}>
          <div>
            <h1 style={styles.title}>
              CRM <span style={styles.redText}>Dashboard</span>
            </h1>
           
          </div>

          <div style={styles.headerActions}>
            <button onClick={exportToExcel} style={styles.secondaryButton}>
              <Download size={16} />
              Excel Export
            </button>
          </div>
        </div>

        <div style={styles.tabCard}>
          {[
            { key: 'sales', label: 'Satış Analizleri', icon: TrendingUp },
            { key: 'orders', label: 'Sipariş Analizleri', icon: ShoppingBag },
            { key: 'customers', label: 'Müşteri Analizleri', icon: Users },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.key;

            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                style={{
                  ...styles.tabButton,
                  ...(active ? styles.tabButtonActive : {}),
                }}
              >
                <Icon size={18} />
                {tab.label}
              </button>
            );
          })}
        </div>

        <div style={styles.filterCard}>
          <div style={styles.filterTitle}>
            <Filter size={18} />
            {activeLabel} Filtreleri
            {filterLoading && <Loader2 size={16} />}
          </div>

          {activeTab === 'sales' && renderSalesFilters()}
          {activeTab === 'orders' && renderOrderFilters()}
          {activeTab === 'customers' && renderCustomerFilters()}

          {loading && (
            <p style={styles.loadingText}>
              <Loader2 size={16} /> Veriler yükleniyor...
            </p>
          )}

          {error && <p style={styles.errorText}>{error}</p>}
        </div>

        {activeTab === 'sales' && renderSalesPage()}
        {activeTab === 'orders' && renderOrdersPage()}
        {activeTab === 'customers' && renderCustomerPage()}
      </main>
    </div>
  );
}

const getStyles = (darkMode) => ({
  page: {
    minHeight: '100vh',
    background: darkMode
      ? 'radial-gradient(circle at top left, #1f0f16 0%, #050506 34%, #050506 100%)'
      : 'linear-gradient(135deg, #fff7f8 0%, #f8fafc 45%, #ffffff 100%)',
    color: darkMode ? '#f8fafc' : '#0f172a',
  },

  main: {
    padding: 32,
  },

  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 20,
    marginBottom: 22,
  },

  title: {
    margin: 0,
    fontSize: 32,
    fontWeight: 900,
    color: darkMode ? '#ffffff' : '#111827',
  },

  redText: {
    color: '#ef4444',
  },

  subtitle: {
    marginTop: 8,
    marginBottom: 0,
    color: darkMode ? '#cbd5e1' : '#64748b',
    fontSize: 13,
    fontWeight: 700,
  },

  headerActions: {
    display: 'flex',
    gap: 12,
    alignItems: 'center',
  },

  primaryButton: {
    height: 42,
    padding: '0 18px',
    borderRadius: 16,
    border: 'none',
    background: 'linear-gradient(135deg, #991b1b, #ef4444)',
    color: '#ffffff',
    display: 'flex',
    alignItems: 'center',
    gap: 9,
    cursor: 'pointer',
    fontWeight: 900,
  },

  secondaryButton: {
    height: 42,
    padding: '0 18px',
    borderRadius: 16,
    border: darkMode ? '1px solid #332025' : '1px solid #fecdd3',
    background: darkMode ? '#17181d' : '#ffffff',
    color: darkMode ? '#f8fafc' : '#111827',
    display: 'flex',
    alignItems: 'center',
    gap: 9,
    cursor: 'pointer',
    fontWeight: 900,
  },

  tabCard: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
    gap: 12,
    background: darkMode ? 'rgba(21,21,25,0.78)' : '#ffffff',
    border: darkMode ? '1px solid #332025' : '1px solid #fecdd3',
    borderRadius: 24,
    padding: 10,
    marginBottom: 22,
  },

  tabButton: {
    height: 54,
    borderRadius: 18,
    border: darkMode ? '1px solid #332025' : '1px solid #fecdd3',
    background: darkMode ? '#111114' : '#fff7f8',
    color: darkMode ? '#cbd5e1' : '#64748b',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    fontWeight: 900,
    cursor: 'pointer',
  },

  tabButtonActive: {
    background: 'linear-gradient(135deg, #991b1b, #ef4444)',
    color: '#ffffff',
    border: '1px solid transparent',
    boxShadow: '0 18px 34px rgba(239,68,68,0.22)',
  },

  filterTitle: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    fontWeight: 900,
    color: darkMode ? '#ffffff' : '#111827',
    marginBottom: 18,
  },

  filterCard: {
    background: darkMode ? 'linear-gradient(145deg, #151519, #1f2026)' : '#fff7f8',
    border: darkMode ? '1px solid #332025' : '1px solid #fecdd3',
    borderRadius: 18,
    padding: 16,
    marginBottom: 22,
  },

  filterGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
    gap: 10,
    alignItems: 'end',
  },

  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    minWidth: 0,
  },

  inputGroupCompact: {
    maxWidth: 150,
  },

  inputGroupWide: {
    minWidth: 170,
  },

  inputLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: 5,
    fontSize: 10,
    fontWeight: 900,
    color: '#e11d48',
    textTransform: 'uppercase',
  },

  input: {
  height: 36,
  borderRadius: 10,
  border: darkMode ? '1px solid #3f252c' : '1px solid #fecdd3',
  background: darkMode ? '#111114' : '#fff1f2',
  color: darkMode ? '#ffffff' : '#111827',
  padding: '0 10px',
  outline: 'none',
  fontWeight: 800,
  fontSize: 12,
  colorScheme: darkMode ? 'dark' : 'light',
},
  select: {
    height: 36,
    borderRadius: 10,
    border: darkMode ? '1px solid #3f252c' : '1px solid #fecdd3',
    background: darkMode ? '#111114' : '#fff1f2',
    color: darkMode ? '#ffffff' : '#111827',
    padding: '0 10px',
    outline: 'none',
    fontWeight: 800,
    fontSize: 12,
    cursor: 'pointer',
  },

  customSelectWrapper: {
    position: 'relative',
    width: '100%',
  },

  customSelectButton: (open) => ({
    width: '100%',
    height: 36,
    borderRadius: 10,
    border: darkMode ? '1px solid #3f252c' : '1px solid #fecdd3',
    background: darkMode ? '#111114' : '#fff1f2',
    color: darkMode ? '#ffffff' : '#111827',
    padding: '0 10px',
    outline: 'none',
    fontWeight: 800,
    fontSize: 12,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    boxShadow: open ? '0 0 0 3px rgba(239,68,68,0.12)' : 'none',
  }),

  customDropdown: {
    position: 'absolute',
    top: 42,
    left: 0,
    right: 0,
    zIndex: 50,
    maxHeight: 220,
    overflowY: 'auto',
    borderRadius: 12,
    border: darkMode ? '1px solid #3f252c' : '1px solid #fecdd3',
    background: darkMode ? '#111114' : '#ffffff',
    boxShadow: '0 18px 32px rgba(0,0,0,0.16)',
    padding: 6,
  },

  customDropdownItem: {
    padding: '9px 10px',
    borderRadius: 10,
    color: darkMode ? '#f8fafc' : '#111827',
    fontSize: 12,
    fontWeight: 800,
    cursor: 'pointer',
  },

  customDropdownItemActive: {
    background: 'linear-gradient(135deg, #991b1b, #ef4444)',
    color: '#ffffff',
  },

  toggleButton: {
    height: 42,
    borderRadius: 14,
    border: 'none',
    background: 'linear-gradient(135deg, #991b1b, #ef4444)',
    color: '#ffffff',
    fontWeight: 900,
    cursor: 'pointer',
  },

  loadingText: {
    margin: '16px 0 0',
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    color: darkMode ? '#cbd5e1' : '#64748b',
    fontSize: 12,
    fontWeight: 800,
  },

  errorText: {
    margin: '16px 0 0',
    color: '#ef4444',
    fontSize: 12,
    fontWeight: 900,
  },

  kpiGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(6, minmax(0, 1fr))',
    gap: 18,
    marginBottom: 22,
  },

  kpiCard: {
    background: darkMode ? 'linear-gradient(145deg, #151519, #1f2026)' : '#ffffff',
    border: darkMode ? '1px solid #332025' : '1px solid #fecdd3',
    borderRadius: 22,
    padding: 20,
  },

  kpiCardRed: {
    background: darkMode ? 'linear-gradient(145deg, #251116, #151519)' : 'linear-gradient(145deg, #ffffff, #fff1f2)',
  },

  kpiTop: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: 10,
  },

  kpiTitle: {
    margin: 0,
    fontSize: 11,
    color: darkMode ? '#94a3b8' : '#64748b',
    fontWeight: 900,
    textTransform: 'uppercase',
  },

  kpiValue: {
    margin: '8px 0 0',
    fontSize: 24,
    color: darkMode ? '#ffffff' : '#111827',
    fontWeight: 900,
  },

  kpiIconBox: {
    width: 44,
    height: 44,
    borderRadius: 16,
    background: darkMode ? '#111114' : '#fff1f2',
    color: '#ef4444',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },

  kpiIconBoxRed: {
    background: 'linear-gradient(135deg, #991b1b, #ef4444)',
    color: '#ffffff',
  },

  kpiSubText: {
    margin: '14px 0 0',
    color: darkMode ? '#94a3b8' : '#64748b',
    fontSize: 11,
    fontWeight: 700,
  },

  contentGrid: {
    display: 'grid',
    gridTemplateColumns: '2fr 1fr',
    gap: 22,
    alignItems: 'start',
  },

  leftColumn: {
    display: 'flex',
    flexDirection: 'column',
    gap: 22,
  },

  rightColumn: {
    display: 'flex',
    flexDirection: 'column',
    gap: 22,
  },

  twoGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 22,
  },

  card: {
    background: darkMode ? 'linear-gradient(145deg, #151519, #1f2026)' : '#ffffff',
    border: darkMode ? '1px solid #332025' : '1px solid #fecdd3',
    borderRadius: 22,
    padding: 24,
  },

  sectionHeader: {
    marginBottom: 18,
  },

  sectionTitle: {
    margin: 0,
    fontSize: 17,
    color: darkMode ? '#ffffff' : '#111827',
    fontWeight: 900,
  },

  sectionDesc: {
    margin: '6px 0 0',
    color: darkMode ? '#94a3b8' : '#64748b',
    fontSize: 12,
    fontWeight: 700,
  },

  bigChart: {
    height: 330,
  },

  mediumChart: {
    height: 250,
  },

  emptyChart: {
    height: '100%',
    minHeight: 210,
    borderRadius: 18,
    border: darkMode ? '1px dashed #3f252c' : '1px dashed #fecdd3',
    background: darkMode ? '#111114' : '#fff7f8',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    textAlign: 'center',
    padding: 20,
  },

  emptyChartText: {
    margin: 0,
    color: darkMode ? '#94a3b8' : '#64748b',
    fontSize: 12,
    fontWeight: 800,
  },

  aiCard: {
    position: 'relative',
    overflow: 'hidden',
    background: 'linear-gradient(135deg, #450a0a, #991b1b, #ef4444)',
    color: '#ffffff',
    borderRadius: 24,
    padding: 24,
  },

  aiBgIcon: {
    position: 'absolute',
    right: 18,
    top: 18,
  },

  aiHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
  },

  aiIcon: {
    width: 36,
    height: 36,
    borderRadius: 14,
    background: 'rgba(255,255,255,0.18)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },

  aiTitle: {
    margin: 0,
    fontSize: 18,
    fontWeight: 900,
  },

  aiText: {
    fontSize: 13,
    lineHeight: 1.6,
    fontWeight: 700,
  },

  aiButton: {
    height: 40,
    width: '100%',
    borderRadius: 14,
    border: 'none',
    background: '#ffffff',
    color: '#991b1b',
    fontWeight: 900,
    cursor: 'pointer',
    marginTop: 14,
  },

  aiResult: {
    margin: '16px 0 0',
    padding: 14,
    borderRadius: 16,
    background: 'rgba(255,255,255,0.14)',
    border: '1px solid rgba(255,255,255,0.18)',
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 700,
    lineHeight: 1.7,
  },

  funnelList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
  },

  funnelTop: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: 8,
  },

  funnelLabel: {
    fontWeight: 900,
    color: darkMode ? '#ffffff' : '#111827',
    fontSize: 12,
  },

  funnelValue: {
    fontWeight: 900,
    color: '#ef4444',
    fontSize: 12,
  },

  funnelTrack: {
    height: 12,
    borderRadius: 999,
    background: darkMode ? '#09090b' : '#fee2e2',
    overflow: 'hidden',
  },

  funnelFill: {
    height: '100%',
    borderRadius: 999,
  },

  tableWrap: {
    overflowX: 'auto',
    minHeight: 250,
  },

  table: {
    width: '100%',
    borderCollapse: 'collapse',
  },

  tableRow: {
    borderBottom: darkMode ? '1px solid #27272a' : '1px solid #fee2e2',
  },

  tableMonth: {
    padding: 10,
    fontWeight: 900,
    color: darkMode ? '#ffffff' : '#111827',
  },

  chart: {
    grid: darkMode ? '#27272a' : '#fee2e2',
    text: darkMode ? '#94a3b8' : '#64748b',
    tooltipText: darkMode ? '#ffffff' : '#111827',
  },

  tooltipStyle: {
    background: darkMode ? '#111114' : '#ffffff',
    border: darkMode ? '1px solid #332025' : '1px solid #fecdd3',
    borderRadius: 14,
    color: darkMode ? '#ffffff' : '#111827',
  },
dateBox: {
  height: 36,
  borderRadius: 10,
  border: 'none',
  background: darkMode ? '#111114' : '#fff1f2',
  color: darkMode ? '#ffffff' : '#111827',
  display: 'flex',
  alignItems: 'center',
  padding: '0 10px',
  outline: 'none',
  boxShadow: 'none',
},
});