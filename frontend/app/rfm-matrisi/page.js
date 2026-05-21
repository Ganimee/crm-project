'use client';

import React, { useMemo, useState, useEffect } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

import {
  Users,
  TrendingUp,
  AlertTriangle,
  LayoutDashboard,
  DollarSign,
  Info,
  Maximize2,
  Sparkles,
  Loader2,
  RefreshCw,
  CheckCircle2,
  SlidersHorizontal,
  CalendarClock,
  Activity,
  Database,
  WalletCards,
} from 'lucide-react';

import { useTheme } from '../context/ThemeContext';

const API_BASE = 'http://127.0.0.1:8000';

export default function RfmAnalizPage() {
  const { isDarkMode } = useTheme();
  const darkMode = isDarkMode;

  const [selectedCell, setSelectedCell] = useState(null);
  const [aiInsight, setAiInsight] = useState(
    'RFM dağılımına göre riskli müşteri grupları için geri kazanım kampanyaları, Champions grubu için ise sadakat ödülleri önerilir.'
  );
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [notification, setNotification] = useState('');

  const [kpis, setKpis] = useState(null);
  const [matrixFromApi, setMatrixFromApi] = useState(null);
  const [segmentsFromApi, setSegmentsFromApi] = useState([]);
  const [trendFromApi, setTrendFromApi] = useState([]);
  const [isPageLoading, setIsPageLoading] = useState(false);

  const [dateMode, setDateMode] = useState('dataset');
  const [financeMode, setFinanceMode] = useState('inflation');

  const [rfmSettings, setRfmSettings] = useState({
    recencyDays: 30,
    frequencyMin: 1,
    frequencyMax: 10,
    monetaryMin: 500,
    monetaryMax: 5000,
  });

  const [isRfmRunning, setIsRfmRunning] = useState(false);

  const colors = {
    bg: darkMode
      ? 'radial-gradient(circle at top left, #1f0f16 0%, #050506 34%, #050506 100%)'
      : 'linear-gradient(135deg, #fff7f8 0%, #f8fafc 45%, #ffffff 100%)',
    card: darkMode ? 'linear-gradient(145deg, #151519, #1f2026)' : '#ffffff',
    cardBorder: darkMode ? '#332025' : '#fecdd3',
    text: darkMode ? '#ffffff' : '#111827',
    subText: darkMode ? '#cbd5e1' : '#64748b',
    accent: '#dc2626',
    softRed: darkMode ? '#3b1116' : '#fee2e2',
    grid: darkMode ? '#262626' : '#e5e7eb',
  };

  const showNotify = (message) => {
    setNotification(message);
    setTimeout(() => setNotification(''), 2500);
  };

  const getToken = () => {
    if (typeof window === 'undefined') return '';
    return localStorage.getItem('token') || localStorage.getItem('access_token') || '';
  };

  const authHeaders = () => {
    const token = getToken();

    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  };

  const buildQueryParams = () => {
    const params = new URLSearchParams({
      date_mode: dateMode,
      finance_mode: financeMode,
    });

    return params.toString();
  };

  const fetchRfmPageData = async () => {
    setIsPageLoading(true);

    try {
      const query = buildQueryParams();

      const [customerRes, matrixRes, segmentRes, dashboardRes] = await Promise.all([
        fetch(`${API_BASE}/customers?page=1&page_size=1`, {
          headers: authHeaders(),

       }),
        fetch(`${API_BASE}/analytics/rfm/matrix?${query}`, {
          headers: authHeaders(),
        }),
        fetch(`${API_BASE}/segments?${query}`, {
          headers: authHeaders(),
        }),
        fetch(`${API_BASE}/dashboard/summary?${query}`, {
          headers: authHeaders(),
        }),
      ]);

      if (!customerRes.ok) throw new Error('KPI verisi alınamadı.');
      if (!matrixRes.ok) throw new Error('RFM matrix verisi alınamadı.');
      if (!segmentRes.ok) throw new Error('Segment verisi alınamadı.');

      const customerData = await customerRes.json();
      const matrixData = await matrixRes.json();
      const segmentData = await segmentRes.json();

      setKpis(customerData.kpis || {});
      setMatrixFromApi(matrixData);
      setSegmentsFromApi(segmentData);

      if (dashboardRes.ok) {
        const dashboardData = await dashboardRes.json();

        const trendData =
          dashboardData.aylik_ciro_trendi ||
          dashboardData.kazanim_trendi ||
          dashboardData.revenue_trend ||
          dashboardData.trend ||
          dashboardData.monthly_trend ||
          [];

        setTrendFromApi(Array.isArray(trendData) ? trendData : []);
      }
    } catch (error) {
      console.error('RFM sayfa veri hatası:', error);
      showNotify('Backend veri alınamadı.');
    } finally {
      setIsPageLoading(false);
    }
  };

  useEffect(() => {
    fetchRfmPageData();
  }, [dateMode, financeMode]);

  const stats = useMemo(() => {
    return {
      totalCustomers:
        segmentsFromApi?.toplam_musteri ||
        kpis?.total_customers ||
        kpis?.toplam_musteri ||
        0,

      totalRevenue:
        segmentsFromApi?.segments?.reduce(
          (acc, item) =>
            acc +
            Number(
              financeMode === 'inflation'
                ? item.reel_harcama || item.toplam_reel_harcama || item.toplam_harcama || 0
                : item.toplam_harcama || 0
            ),
          0
        ) || 0,

      avgBasket:
        financeMode === 'inflation'
          ? kpis?.real_avg_order_value || kpis?.avg_order_value || 0
          : kpis?.avg_order_value || 0,

      riskCount:
        segmentsFromApi?.segments?.reduce((acc, item) => {
          const riskliSegmentler = [
            'Risk Altında',
            'Kayıp',
            'Kış Uykusunda',
            'Uyumak Üzere',
            'Onları Kaybedemezsin',
            'Dikkat Gerekiyor',
          ];

          if (riskliSegmentler.includes(item.segment)) {
            return acc + Number(item.musteri_sayisi || 0);
          }

          return acc;
        }, 0) || 0,
    };
  }, [kpis, segmentsFromApi, financeMode]);

  const segmentData = useMemo(() => {
    const list = segmentsFromApi?.segments || [];

    return list.map((item) => ({
      name: item.segment || 'Bilinmeyen',
      value: item.musteri_sayisi || 0,
      revenue:
        financeMode === 'inflation'
          ? item.reel_harcama || item.toplam_reel_harcama || item.toplam_harcama || 0
          : item.toplam_harcama || 0,
    }));
  }, [segmentsFromApi, financeMode]);

  const heatmapData = useMemo(() => {
    const emptyMatrix = Array(5)
      .fill(0)
      .map(() => Array(5).fill(0));

    const rows = matrixFromApi?.matrix;

    if (!Array.isArray(rows)) return emptyMatrix;

    return rows.map((row) =>
      row.cells.map((cell) => cell.musteri_sayisi || 0)
    );
  }, [matrixFromApi]);

  const trendData = useMemo(() => {
    if (!trendFromApi.length) return [];

    return trendFromApi.map((item, index) => ({
      n:
        item.n ||
        item.name ||
        item.ay_adi ||
        (item.yil && item.ay ? `${item.ay}/${item.yil}` : null) ||
        item.ay ||
        item.month ||
        item.tarih ||
        `${index + 1}`,

      v:
        financeMode === 'inflation'
          ? item.reel_toplam_ciro ||
            item.reel_deger ||
            item.real_value ||
            item.reel_gelir ||
            item.toplam_ciro ||
            item.v ||
            item.value ||
            item.total ||
            0
          : item.toplam_ciro ||
            item.v ||
            item.value ||
            item.kazanim ||
            item.gelir ||
            item.ciro ||
            item.total ||
            0,
    }));
  }, [trendFromApi, financeMode]);

  const liveSegmentAnalysis = useMemo(() => {
    const segments = segmentsFromApi?.segments || [];

    const total = segments.reduce(
      (acc, item) => acc + Number(item.musteri_sayisi || 0),
      0
    );

    const riskliSegmentler = [
      'Risk Altında',
      'Kayıp',
      'Kış Uykusunda',
      'Uyumak Üzere',
      'Onları Kaybedemezsin',
      'Dikkat Gerekiyor',
    ];

    const riskliCount = segments.reduce((acc, item) => {
      if (riskliSegmentler.includes(item.segment)) {
        return acc + Number(item.musteri_sayisi || 0);
      }

      return acc;
    }, 0);

    const strongCount = segments.reduce((acc, item) => {
      if (['Şampiyon', 'Sadık Müşteri'].includes(item.segment)) {
        return acc + Number(item.musteri_sayisi || 0);
      }

      return acc;
    }, 0);

    const topSegment = [...segments].sort(
      (a, b) => Number(b.musteri_sayisi || 0) - Number(a.musteri_sayisi || 0)
    )[0];

    return {
      total,
      topSegmentName: topSegment?.segment || '-',
      topSegmentCount: topSegment?.musteri_sayisi || 0,
      riskliCount,
      riskliRate: total ? Math.round((riskliCount * 100) / total) : 0,
      strongCount,
      strongRate: total ? Math.round((strongCount * 100) / total) : 0,
    };
  }, [segmentsFromApi]);

  const referenceLabel =
    dateMode === 'live' ? 'Canlı sistem tarihine göre' : 'Veri setindeki son sipariş tarihine göre';

  const financeLabel =
    financeMode === 'inflation' ? 'Reel TÜFE düzeltilmiş' : 'Nominal tutar';

  const handleRfmSettingChange = (key, value) => {
    setRfmSettings((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const runRfmRecalculate = async () => {
    setIsRfmRunning(true);

    try {
      const query = new URLSearchParams({
        date_mode: dateMode,
        finance_mode: financeMode,
      }).toString();

      const res = await fetch(`${API_BASE}/analytics/rfm/run?${query}`, {
        method: 'POST',
        headers: authHeaders(),
      });

      if (!res.ok) {
        throw new Error('RFM hesaplama başarısız.');
      }

      await fetchRfmPageData();

      showNotify(`RFM yeniden hesaplandı • ${dateMode} • ${financeMode}`);
    } catch (error) {
      console.error('RFM hesaplama hatası:', error);
      showNotify('RFM hesaplama sırasında hata oluştu.');
    } finally {
      setIsRfmRunning(false);
    }
  };

  const generateAIAnalysis = async (focusSegment = null) => {
  setIsAiLoading(true);
  setAiInsight('');

  try {
    const res = await fetch(`${API_BASE}/ai/rfm-insight`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({
        stats,
        segment_data: segmentData,
        heatmap_data: heatmapData,
        trend_data: trendData,
        live_segment_analysis: liveSegmentAnalysis,
        finance_label: financeLabel,
        reference_label: referenceLabel,
        focus_segment: focusSegment,
      }),
    });

    const data = await res.json();

    if (!res.ok || !data.success) {
      throw new Error(data.analysis || 'AI analiz alınamadı.');
    }

    setAiInsight(data.analysis);
    showNotify('AI stratejik analiz güncellendi.');
  } catch (error) {
    console.error('AI analiz hatası:', error);
    setAiInsight('AI analiz alınamadı. Backend, Gemini API key veya internet bağlantısını kontrol et.');
    showNotify('AI analiz alınamadı.');
  } finally {
    setIsAiLoading(false);
  }
};
  const styles = getStyles(colors, darkMode);

  return (
    <div style={styles.page}>
      {notification && (
        <div style={styles.notification}>
          <CheckCircle2 size={18} />
          {notification}
        </div>
      )}

      <header style={styles.header}>
        <div>
          <h1 style={styles.pageTitle}>
            <LayoutDashboard color="#dc2626" />
            Müşteri RFM <span style={{ color: '#dc2626' }}>Analiz Paneli</span>
          </h1>

          
        </div>

        <div style={styles.aiStatus}>
          {isPageLoading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
          {isPageLoading ? 'Veriler Yükleniyor' : 'AI Motoru Aktif'}
        </div>
      </header>

      <section style={{ ...cardStyle(colors), marginBottom: 26 }}>
        <div style={cardTitleStyle(colors)}>
          <Activity size={19} color="#dc2626" />
          Analiz Modu Kontrolleri

          <span style={styles.sectionRightNote}>
            RFM matrisi, KPI ve grafikler seçili moda göre güncellenir
          </span>
        </div>

        <div style={styles.modeGrid}>
          <div style={styles.innerCardSoft}>
            <div style={styles.smallTitleRow}>
              <CalendarClock size={17} color="#dc2626" />
              <h3 style={styles.innerTitle}>Tarih Referansı</h3>
            </div>

            <p style={styles.innerText}>
              Recency hesabında sistem tarihi veya verideki son sipariş tarihi kullanılabilir.
            </p>

            <div style={styles.buttonRow}>
              <ModeButton colors={colors} active={dateMode === 'live'} label="Canlı Sistem" onClick={() => setDateMode('live')} />
              <ModeButton colors={colors} active={dateMode === 'dataset'} label="Veri Seti" onClick={() => setDateMode('dataset')} />
            </div>
          </div>

          <div style={styles.innerCard}>
            <div style={styles.smallTitleRow}>
              <WalletCards size={17} color="#dc2626" />
              <h3 style={styles.innerTitle}>Finansal Görünüm</h3>
            </div>

            <p style={styles.innerText}>
              Monetary değeri nominal veya TÜFE’ye göre reel hesaplanabilir.
            </p>

            <div style={styles.buttonRow}>
              <ModeButton colors={colors} active={financeMode === 'nominal'} label="Nominal" onClick={() => setFinanceMode('nominal')} />
              <ModeButton colors={colors} active={financeMode === 'inflation'} label="Reel TÜFE" onClick={() => setFinanceMode('inflation')} />
            </div>
          </div>

          <div style={styles.innerCard}>
            <div style={styles.smallTitleRow}>
              <Database size={17} color="#dc2626" />
              <h3 style={styles.innerTitle}>Aktif Analiz Yorumu</h3>
            </div>

            <div style={styles.infoGrid}>
              <InfoBadge colors={colors} label="Tarih Modu" value={dateMode === 'live' ? 'Canlı sistem tarihi' : 'Veri seti tarihi'} />
              <InfoBadge colors={colors} label="Parasal Mod" value={financeMode === 'inflation' ? 'Enflasyon düzeltilmiş reel değer' : 'Ham nominal değer'} />
            </div>
          </div>
        </div>
      </section>

      <div style={styles.statGrid}>
        <StatCard colors={colors} icon={Users} label="Toplam Müşteri" value={stats.totalCustomers} tone="blue" />
        <StatCard colors={colors} icon={DollarSign} label={financeMode === 'inflation' ? 'Toplam Reel Gelir' : 'Toplam Gelir'} value={`₺${Number(stats.totalRevenue).toLocaleString('tr-TR')}`} tone="green" />
        <StatCard colors={colors} icon={TrendingUp} label={financeMode === 'inflation' ? 'Reel Ort. Sepet' : 'Ort. Sepet Tutarı'} value={`₺${Number(stats.avgBasket).toLocaleString('tr-TR')}`} tone="red" />
        <StatCard colors={colors} icon={AlertTriangle} label="Riskli Müşteri" value={stats.riskCount} tone="orange" />
      </div>

      <section style={{ ...cardStyle(colors), marginBottom: 26 }}>
        <div style={cardTitleStyle(colors)}>
          <SlidersHorizontal size={19} color="#dc2626" />
          RFM Motor Ayarları

          
        </div>

        <div style={styles.rfmMotorGrid}>
          <div style={styles.innerCardSoft}>
            <h3 style={styles.innerTitle}>Segment Mantığı</h3>

            <p style={styles.innerText}>
              Recency, Frequency ve Monetary eşiklerini değiştirerek segment
              hesaplama davranışını kontrol edebilirsin.
            </p>

            <div style={styles.settingGrid}>
              <SettingRow colors={colors} label="Recency Gün" value={rfmSettings.recencyDays} onChange={(value) => handleRfmSettingChange('recencyDays', Number(value))} />
              <SettingRow colors={colors} label="Frequency Min" value={rfmSettings.frequencyMin} onChange={(value) => handleRfmSettingChange('frequencyMin', Number(value))} />
              <SettingRow colors={colors} label="Frequency Max" value={rfmSettings.frequencyMax} onChange={(value) => handleRfmSettingChange('frequencyMax', Number(value))} />
              <SettingRow colors={colors} label="Monetary Min" value={rfmSettings.monetaryMin} onChange={(value) => handleRfmSettingChange('monetaryMin', Number(value))} />
              <SettingRow colors={colors} label="Monetary Max" value={rfmSettings.monetaryMax} onChange={(value) => handleRfmSettingChange('monetaryMax', Number(value))} />
            </div>
          </div>

          <div style={styles.innerCard}>
            <div style={styles.smallTitleRow}>
              <Sparkles size={18} color="#dc2626" />
              <h3 style={styles.innerTitle}>AI Stratejik Analiz</h3>

              <button
                onClick={() => generateAIAnalysis()}
                disabled={isAiLoading}
                style={styles.aiRefreshButton}
              >
                <RefreshCw size={15} className={isAiLoading ? 'animate-spin' : ''} />
              </button>
            </div>

            <div style={styles.aiTextBox}>
              {isAiLoading ? (
                <div style={styles.aiLoadingBox}>
                  <Loader2 size={28} color="#dc2626" className="animate-spin" />
                  <p>Veriler analiz ediliyor...</p>
                </div>
              ) : (
                aiInsight
              )}
            </div>

            <div style={styles.aiSource}>
              <Info size={13} />
              Analiz Kaynağı: CRM RFM Veri Modeli
            </div>
          </div>

          <div style={styles.rfmButtonWrapper}>
            <button
              onClick={runRfmRecalculate}
              disabled={isRfmRunning}
              style={styles.rfmCalcButton}
            >
              {isRfmRunning ? (
                <>
                  <Loader2 size={20} className="animate-spin" />
                  Hesaplanıyor
                </>
              ) : (
                <>
                  <RefreshCw size={20} />
                  RFM Hesapla
                </>
              )}
            </button>
          </div>
        </div>
      </section>

      <div style={styles.matrixGrid}>
        <section style={cardStyle(colors)}>
          <div style={cardTitleStyle(colors)}>
            <Maximize2 size={19} color="#dc2626" />
            Ana RFM Matrisi

            <span style={styles.monetaryBadge}>
              {financeMode === 'inflation' ? 'REEL MONETARY AKTİF' : 'NOMİNAL MONETARY'}
            </span>

            <button
              onClick={() => setSelectedCell(null)}
              style={styles.clearButton}
            >
              FİLTREYİ KALDIR
            </button>
          </div>

          <div style={styles.heatmapOuter}>
            <div style={styles.verticalLabel}>
              Sıklık / Frequency
            </div>

            <div style={styles.heatmapWrap}>
              <div style={styles.heatmapGrid}>
                {heatmapData.map((row, rowIndex) =>
                  row.map((value, colIndex) => {
                    const r = colIndex + 1;
                    const f = 5 - rowIndex;

                    return (
                      <button
                        key={`${rowIndex}-${colIndex}`}
                        onClick={() => setSelectedCell({ r, f })}
                        title={`R${r} F${f} | ${value} müşteri | ${financeLabel}`}
                        style={{
                          ...styles.heatmapCell,
                          border:
                            selectedCell?.r === r && selectedCell?.f === f
                              ? '2px solid #ffffff'
                              : `1px solid ${colors.cardBorder}`,
                          background: `rgba(220, 38, 38, ${Math.min(0.25 + Number(value) / 80, 0.9)})`,
                        }}
                      >
                        {value}
                      </button>
                    );
                  })
                )}
              </div>

              <div style={styles.heatmapAxis}>
                <span>R1 Eski</span>
                <span>R2</span>
                <span>R3</span>
                <span>R4</span>
                <span>R5 Yeni</span>
              </div>

              <div style={styles.heatmapInfo}>
                {referenceLabel} • {financeLabel}
              </div>
            </div>
          </div>
        </section>

        <section style={cardStyle(colors)}>
          <div style={cardTitleStyle(colors)}>
            <Sparkles size={18} color="#dc2626" />
            Canlı Segment Analizi
          </div>

          <div style={styles.liveMetricGrid}>
            <MiniMetric colors={colors} label="En Yoğun Segment" value={liveSegmentAnalysis.topSegmentName} />
            <MiniMetric colors={colors} label="Müşteri Sayısı" value={liveSegmentAnalysis.topSegmentCount} />
            <MiniMetric colors={colors} label="Riskli Oran" value={`%${liveSegmentAnalysis.riskliRate}`} />
            <MiniMetric colors={colors} label="Güçlü Oran" value={`%${liveSegmentAnalysis.strongRate}`} />
          </div>

          <div style={styles.liveAnalysisBox}>
            RFM matrisi yeniden hesaplandıkça segment yoğunluğu, risk oranı ve güçlü müşteri oranı otomatik güncellenir.
            Riskli oran yükseliyorsa geri kazanım kampanyaları önceliklendirilebilir.
          </div>

          <div style={styles.aiSource}>
            <Info size={13} />
            Kaynak: Segment dağılımı ve RFM skorları
          </div>
        </section>
      </div>

      <div style={styles.chartGrid}>
        <ChartCard colors={colors} title="Segment Hacmi">
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={segmentData}
                innerRadius={60}
                outerRadius={82}
                paddingAngle={4}
                dataKey="value"
                onClick={(data) => generateAIAnalysis(data.name)}
              >
                {segmentData.map((entry, index) => (
                  <Cell
                    key={entry.name}
                    fill={index % 2 === 0 ? '#dc2626' : darkMode ? '#33343d' : '#fecaca'}
                    cursor="pointer"
                  />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: darkMode ? '#141414' : '#ffffff',
                  border: `1px solid ${colors.cardBorder}`,
                  borderRadius: 12,
                  color: colors.text,
                }}
              />
            </PieChart>
          </ResponsiveContainer>

          <p style={styles.chartNote}>
            Segmente tıklayarak AI önerisi alabilirsiniz.
          </p>
        </ChartCard>

        <ChartCard colors={colors} title={financeMode === 'inflation' ? 'Reel Gelir / Segment Dağılımı' : 'Gelir / Segment Dağılımı'}>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={[...segmentData].sort((a, b) => b.revenue - a.revenue).slice(0, 5)}>
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#71717a' }} />
              <Tooltip
                cursor={{ fill: 'transparent' }}
                contentStyle={{
                  backgroundColor: darkMode ? '#141414' : '#ffffff',
                  border: `1px solid ${colors.cardBorder}`,
                  borderRadius: 12,
                }}
              />
              <Bar dataKey="revenue" fill="#dc2626" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard colors={colors} title={financeMode === 'inflation' ? 'Reel Gelir Trendi' : 'Gelir Trendi'}>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} vertical={false} />
              <XAxis dataKey="n" hide />
              <Tooltip
                contentStyle={{
                  backgroundColor: darkMode ? '#141414' : '#ffffff',
                  border: `1px solid ${colors.cardBorder}`,
                  borderRadius: 12,
                }}
              />
              <Line type="monotone" dataKey="v" stroke="#dc2626" strokeWidth={3} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <footer style={styles.footer}>
        Stratejik RFM Dashboard • CRM Analitik Karar Destek Paneli
      </footer>
    </div>
  );
}

function ModeButton({ colors, active, label, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        flex: 1,
        height: 42,
        borderRadius: 14,
        border: active ? '1px solid #dc2626' : `1px solid ${colors.cardBorder}`,
        background: active ? 'linear-gradient(135deg, #b91c1c, #ef4444)' : colors.card,
        color: active ? '#ffffff' : colors.text,
        fontWeight: 900,
        fontSize: 12,
        cursor: 'pointer',
        boxShadow: active ? '0 12px 24px rgba(239,68,68,0.28)' : 'none',
      }}
    >
      {label}
    </button>
  );
}

function InfoBadge({ colors, label, value }) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '110px 1fr',
        gap: 10,
        alignItems: 'center',
        padding: '10px 12px',
        borderRadius: 14,
        border: `1px solid ${colors.cardBorder}`,
        background: colors.softRed,
        fontSize: 12,
      }}
    >
      <span style={{ color: colors.subText, fontWeight: 900 }}>{label}</span>
      <b style={{ color: colors.text }}>{value}</b>
    </div>
  );
}

function MiniMetric({ colors, label, value }) {
  return (
    <div
      style={{
        padding: '12px 12px',
        borderRadius: 14,
        border: `1px solid ${colors.cardBorder}`,
        background: colors.softRed,
        minHeight: 70,
      }}
    >
      <p
        style={{
          margin: 0,
          color: colors.subText,
          fontSize: 10,
          fontWeight: 900,
          textTransform: 'uppercase',
          letterSpacing: 0.8,
        }}
      >
        {label}
      </p>

      <h4
        style={{
          margin: '8px 0 0',
          color: colors.text,
          fontSize: 15,
          fontWeight: 900,
          lineHeight: 1.25,
        }}
      >
        {value}
      </h4>
    </div>
  );
}

function StatCard({ colors, icon: Icon, label, value, tone }) {
  const toneMap = {
    blue: ['#dbeafe', '#2563eb'],
    green: ['#dcfce7', '#16a34a'],
    red: ['#fee2e2', '#dc2626'],
    orange: ['#ffedd5', '#ea580c'],
  };

  const selected = toneMap[tone] || toneMap.red;

  return (
    <div style={cardStyle(colors)}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 14 }}>
        <div>
          <p
            style={{
              margin: 0,
              fontSize: 11,
              color: colors.subText,
              fontWeight: 900,
              textTransform: 'uppercase',
              letterSpacing: 1,
            }}
          >
            {label}
          </p>

          <h3
            style={{
              margin: '8px 0 0',
              fontSize: 24,
              color: colors.text,
              fontWeight: 900,
            }}
          >
            {value}
          </h3>
        </div>

        <div
          style={{
            width: 46,
            height: 46,
            borderRadius: 15,
            background: selected[0],
            color: selected[1],
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <Icon size={22} />
        </div>
      </div>
    </div>
  );
}

function ChartCard({ colors, title, children }) {
  return (
    <section style={cardStyle(colors)}>
      <h3
        style={{
          margin: '0 0 18px',
          fontSize: 12,
          color: colors.subText,
          fontWeight: 900,
          textTransform: 'uppercase',
          letterSpacing: 1.2,
        }}
      >
        {title}
      </h3>

      {children}
    </section>
  );
}

function SettingRow({ colors, label, value, onChange }) {
  return (
    <label
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr 110px',
        alignItems: 'center',
        gap: 12,
        fontSize: 12,
        color: colors.subText,
        fontWeight: 800,
      }}
    >
      <span>{label}</span>

      <input
        type="number"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          height: 38,
          borderRadius: 12,
          border: `1px solid ${colors.cardBorder}`,
          background: colors.card,
          color: colors.text,
          outline: 'none',
          padding: '0 12px',
          fontWeight: 900,
          width: '100%',
        }}
      />
    </label>
  );
}

function cardStyle(colors) {
  return {
    background: colors.card,
    border: `1px solid ${colors.cardBorder}`,
    borderRadius: 22,
    padding: 22,
    boxShadow: '0 18px 42px rgba(0,0,0,0.18)',
  };
}

function cardTitleStyle(colors) {
  return {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    marginBottom: 22,
    color: colors.text,
    fontWeight: 900,
    fontSize: 18,
  };
}

function getStyles(colors, darkMode) {
  return {
    page: {
      minHeight: '100vh',
      padding: 32,
      background: colors.bg,
      color: colors.text,
    },
    notification: {
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
    pageTitle: {
      margin: 0,
      fontSize: 30,
      fontWeight: 900,
      color: colors.text,
      display: 'flex',
      alignItems: 'center',
      gap: 12,
    },
    pageSubtitle: {
      marginTop: 6,
      fontSize: 13,
      color: colors.subText,
    },
    aiStatus: {
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      padding: '10px 16px',
      borderRadius: 16,
      background: darkMode ? '#17181d' : '#fff1f2',
      border: `1px solid ${colors.cardBorder}`,
      color: '#dc2626',
      fontWeight: 900,
      fontSize: 12,
    },
    sectionRightNote: {
      marginLeft: 'auto',
      fontSize: 10,
      color: colors.subText,
      fontWeight: 900,
      letterSpacing: 1,
      textTransform: 'uppercase',
    },
    modeGrid: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr 1.2fr',
      gap: 18,
    },
    innerCardSoft: {
      border: `1px solid ${colors.cardBorder}`,
      borderRadius: 18,
      padding: 18,
      background: darkMode ? '#17181d' : '#fff7f7',
    },
    innerCard: {
      border: `1px solid ${colors.cardBorder}`,
      borderRadius: 18,
      padding: 18,
      background: darkMode ? '#17181d' : '#ffffff',
    },
    smallTitleRow: {
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      marginBottom: 12,
    },
    innerTitle: {
      margin: 0,
      fontSize: 15,
      fontWeight: 900,
    },
    innerText: {
      marginTop: 6,
      marginBottom: 18,
      color: colors.subText,
      fontSize: 12,
      lineHeight: 1.6,
    },
    buttonRow: {
      display: 'flex',
      gap: 10,
    },
    infoGrid: {
      display: 'grid',
      gap: 10,
    },
    statGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
      gap: 18,
      marginBottom: 26,
    },
    rfmMotorGrid: {
      display: 'grid',
      gridTemplateColumns: '30fr 50fr 20fr',
      gap: 18,
      alignItems: 'stretch',
    },
    settingGrid: {
      display: 'grid',
      gap: 12,
    },
    aiRefreshButton: {
      marginLeft: 'auto',
      border: 'none',
      background: darkMode ? '#222329' : '#fff1f2',
      color: colors.text,
      borderRadius: 12,
      width: 34,
      height: 34,
      cursor: 'pointer',
    },
    aiTextBox: {
      minHeight: 160,
      color: colors.subText,
      fontSize: 12,
      lineHeight: 1.7,
      whiteSpace: 'pre-wrap',
    },
    aiLoadingBox: {
      textAlign: 'center',
      width: '100%',
    },
    aiSource: {
      marginTop: 14,
      paddingTop: 12,
      borderTop: `1px solid ${colors.cardBorder}`,
      fontSize: 10,
      color: colors.subText,
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      fontWeight: 900,
      textTransform: 'uppercase',
      letterSpacing: 1,
    },
    rfmButtonWrapper: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    },
    rfmCalcButton: {
      width: '100%',
      minWidth: 150,
      height: 76,
      borderRadius: 22,
      border: 'none',
      background: 'linear-gradient(135deg, #b91c1c, #ef4444)',
      color: '#ffffff',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
      boxShadow: '0 18px 35px rgba(239,68,68,0.35)',
      opacity: 1,
      fontWeight: 900,
      fontSize: 14,
    },
    matrixGrid: {
      display: 'grid',
      gridTemplateColumns: '1.7fr 1fr',
      gap: 22,
      marginBottom: 26,
    },
    monetaryBadge: {
     marginLeft: 8,
      padding: '6px 10px',
      borderRadius: 999,
      background: '#dc2626',
     color: '#ffffff',
     fontSize: 10,
     fontWeight: 900,
    },Weight: 900,
    
    clearButton: {
      marginLeft: 'auto',
      border: 'none',
      background: 'transparent',
      color: '#dc2626',
      fontSize: 10,
      fontWeight: 900,
      cursor: 'pointer',
      letterSpacing: 1,
    },
    heatmapOuter: {
      display: 'flex',
      alignItems: 'center',
      gap: 24,
    },
    verticalLabel: {
      writingMode: 'vertical-lr',
      transform: 'rotate(180deg)',
      fontSize: 10,
      color: colors.subText,
      fontWeight: 900,
      textTransform: 'uppercase',
    },
    heatmapWrap: {
      flex: 1,
      maxWidth: 400,
      margin: '0 auto',
    },
    heatmapGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(5, 70px)',
      justifyContent: 'center',
      gap: 8,
    },
    heatmapCell: {
      width: 60,
      height: 60,
      borderRadius: 14,
      color: '#fff',
      fontSize: 16,
      fontWeight: 900,
      cursor: 'pointer',
    },
    heatmapAxis: {
      display: 'flex',
      justifyContent: 'space-between',
      marginTop: 12,
      fontSize: 10,
      color: colors.subText,
      fontWeight: 900,
      letterSpacing: 1,
    },
    heatmapInfo: {
      marginTop: 12,
      textAlign: 'center',
      fontSize: 11,
      color: colors.subText,
      fontWeight: 800,
    },
    liveMetricGrid: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: 12,
      marginBottom: 16,
    },
    liveAnalysisBox: {
      color: colors.subText,
      fontSize: 12,
      lineHeight: 1.7,
      padding: 14,
      borderRadius: 16,
      border: `1px solid ${colors.cardBorder}`,
      background: darkMode ? '#17181d' : '#fff7f7',
    },
    chartGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
      gap: 22,
    },
    chartNote: {
      textAlign: 'center',
      fontSize: 10,
      color: colors.subText,
      fontWeight: 800,
    },
    footer: {
      marginTop: 50,
      paddingTop: 28,
      borderTop: `1px solid ${colors.cardBorder}`,
      textAlign: 'center',
      color: colors.subText,
      fontSize: 10,
      fontWeight: 900,
      letterSpacing: 3,
      textTransform: 'uppercase',
    },
  };
}