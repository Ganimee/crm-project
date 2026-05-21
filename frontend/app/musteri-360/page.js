'use client';

import React, { useMemo, useState, useEffect, Suspense } from 'react';
import {
  Eye,
  EyeOff,
  Mail,
  Ticket,
  TrendingUp,
  AlertCircle,
  History,
  ShoppingBag,
  RotateCcw,
  Star,
  ArrowUpRight,
  ShieldCheck,
  Search,
  Target,
  Wallet,
  CheckCircle2,
  User,
  BrainCircuit,
  Phone,
  MapPin,
  Calendar,
  ChevronDown,
  ChevronUp,
  ArrowLeftRight,
  Tag,
  Send,
  Edit3,
  Gift,
  Sparkles,
} from 'lucide-react';

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
} from 'recharts';

import { useTheme } from '../context/ThemeContext';
import { useSearchParams } from 'next/navigation';

export default function Musteri360Page() {
  return (
    <Suspense fallback={<div>Müşteri verisi yükleniyor...</div>}>
      <Musteri360Content />
    </Suspense>
  );
}

function Musteri360Content() {
  const { isDarkMode } = useTheme();
  const darkMode = isDarkMode;
  const styles = getStyles(darkMode);

  const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL;
  const searchParams = useSearchParams();
  const customerIdFromUrl = searchParams.get('id');

  const [allCustomers, setAllCustomers] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [showMaskedData, setShowMaskedData] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [notification, setNotification] = useState('');
  const [aiAnalysis, setAiAnalysis] = useState('');
  const [campaignAiLoading, setCampaignAiLoading] = useState(false);
  const [campaignAiSuggestions, setCampaignAiSuggestions] = useState([]);

  const [selectedCampaignIndex, setSelectedCampaignIndex] = useState(null);
  const [editableCampaign, setEditableCampaign] = useState(null);
  const [campaignApplyLoading, setCampaignApplyLoading] = useState(false);

  const [activeCustomerTab, setActiveCustomerTab] = useState('info');
  const [timelineSearch, setTimelineSearch] = useState('');
  const [timelineTypeFilter, setTimelineTypeFilter] = useState('all');
  const [timelineChannelFilter, setTimelineChannelFilter] = useState('all');
  const [expandedTimelineItems, setExpandedTimelineItems] = useState({});
  const [dateRangeOpen, setDateRangeOpen] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const authHeaders = () => {
    const rawToken = localStorage.getItem('token');

    if (!rawToken) return {};

    const token = rawToken.startsWith('Bearer ')
      ? rawToken.replace('Bearer ', '')
      : rawToken;

    return {
      Authorization: `Bearer ${token}`,
    };
  };

  const showNotify = (message) => {
    setNotification(message);
    setTimeout(() => setNotification(''), 2500);
  };

  const fetchCustomerAi = async (customerData) => {
    setIsAiLoading(true);

    try {
      const res = await fetch(`${API_BASE}/ai/customer-insight`, {
        method: 'POST',
        headers: {
          ...authHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          customer: customerData,
        }),
      });

      const data = await res.json();

      if (data.success) {
        setAiAnalysis(data.analysis);
      } else {
        setAiAnalysis('AI analizi oluşturulamadı.');
      }
    } catch (err) {
      console.error(err);
      setAiAnalysis('AI analizi sırasında hata oluştu.');
    } finally {
      setIsAiLoading(false);
    }
  };

  const fetchCampaignSuggestionsAi = async () => {
  if (!selectedCustomer) return;

  setCampaignAiLoading(true);

  try {
    const res = await fetch(`${API_BASE}/ai/customer-campaign-suggestions`, {
      method: 'POST',
      headers: {
        ...authHeaders(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        customer: selectedCustomer,
        spendingRows: selectedCustomer.spendingRows || [],
        timeline: selectedCustomer.timeline || [],
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.detail || 'Kampanya önerisi alınamadı.');
    }

    setCampaignAiSuggestions(data.suggestions || []);
  } catch (err) {
    console.error(err);
    showNotify('AI kampanya önerisi alınamadı.');
  } finally {
    setCampaignAiLoading(false);
  }
};

const handleSelectCampaign = (campaign, index) => {
  setSelectedCampaignIndex(index);
  setEditableCampaign({
    badge: campaign.badge || '',
    title: campaign.title || '',
    description: campaign.description || '',
    condition: campaign.condition || '',
    couponCode: campaign.couponCode || `CRM${String(index + 1).padStart(2, '0')}`,
    mailSubject: `${selectedCustomer?.name || 'Değerli müşterimiz'}, size özel kampanya!`,
    mailBody: `Merhaba ${selectedCustomer?.name || ''},

Size özel hazırladığımız kampanyadan yararlanabilirsiniz.

Kampanya: ${campaign.title || ''}
Detay: ${campaign.description || ''}
Koşul: ${campaign.condition || ''}

Kupon Kodunuz: CRM${String(index + 1).padStart(2, '0')}

İyi alışverişler dileriz.`
  });
};

const updateEditableCampaign = (field, value) => {
  setEditableCampaign((prev) => ({
    ...prev,
    [field]: value,
  }));
};

const applyCampaignAndSendMail = async () => {
  if (!selectedCustomer || !editableCampaign) {
    showNotify('Lütfen önce bir kampanya seçin.');
    return;
  }

  setCampaignApplyLoading(true);

  try {
    const res = await fetch(`${API_BASE}/ai/apply-customer-campaign`, {
      method: 'POST',
      headers: {
        ...authHeaders(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        customerId: selectedCustomer.id,
        customerName: selectedCustomer.name,
        email: selectedCustomer.contact?.fullEmail,
        campaign: editableCampaign,
      }),
    });

    const data = await res.json();

    if (!res.ok || !data.success) {
      throw new Error(data.detail || data.message || 'Kampanya uygulanamadı.');
    }

    showNotify('Kampanya uygulandı ve mail gönderildi.');
    await fetch(`${API_BASE}/campaigns/customer-applied`, {
  method: 'POST',
  headers: {
    ...authHeaders(),
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    customerId: selectedCustomer.id,
    customerName: selectedCustomer.name,
    email: selectedCustomer.contact?.fullEmail,
    campaign: editableCampaign,
  }),
});
  } catch (err) {
    console.error(err);
    showNotify('Kampanya uygulanırken hata oluştu.');
  } finally {
    setCampaignApplyLoading(false);
  }
};


  const fetchCustomerDetail = async (customerId) => {
    setIsLoading(true);

    try {
      const res = await fetch(`${API_BASE}/customers/${customerId}/360`, {
        headers: authHeaders(),
      });

      if (!res.ok) throw new Error('Müşteri detayı alınamadı.');

      const data = await res.json();

      setSelectedCustomer(data);
      setAiAnalysis('');
      setCampaignAiSuggestions([]);
      setSelectedCampaignIndex(null);
      setEditableCampaign(null);
      setSearchQuery('');
      setIsSearchFocused(false);
      setActiveCustomerTab('info');
      setTimelineSearch('');
      setTimelineTypeFilter('all');
      setTimelineChannelFilter('all');
      setStartDate('');
      setEndDate('');
      setExpandedTimelineItems({});
    } catch (err) {
      console.error(err);
      showNotify('Müşteri detayı alınamadı.');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCustomerList = async (query = '') => {
    try {
      const res = await fetch(
        `${API_BASE}/customers/search/list?q=${encodeURIComponent(query)}`,
        {
          headers: authHeaders(),
        }
      );

      if (!res.ok) throw new Error('Müşteri listesi alınamadı.');

      const data = await res.json();

      setAllCustomers(data);

      if (data.length > 0 && !selectedCustomer && !customerIdFromUrl) {
        fetchCustomerDetail(data[0].id);
      }
    } catch (err) {
      console.error(err);
      showNotify('Müşteri listesi alınamadı.');
    }
  };

  useEffect(() => {
    if (customerIdFromUrl) {
      fetchCustomerDetail(customerIdFromUrl);
    } else {
      fetchCustomerList('');
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerIdFromUrl]);

  const filteredCustomers = useMemo(() => {
    return allCustomers.filter(
      (customer) =>
        customer.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        String(customer.id).toLowerCase().includes(searchQuery.toLowerCase()) ||
        customer.code?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery, allCustomers]);

  const handleCustomerSelect = (customer) => {
    fetchCustomerDetail(customer.id);
  };

  const toggleTimelineExpand = (id) => {
    setExpandedTimelineItems((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const parseTimelineDate = (value) => {
    if (!value) return null;

    if (/^\d{4}-\d{2}-\d{2}/.test(value)) {
      return new Date(value);
    }

    const months = {
      Ocak: 0,
      Şubat: 1,
      Mart: 2,
      Nisan: 3,
      Mayıs: 4,
      Haziran: 5,
      Temmuz: 6,
      Ağustos: 7,
      Eylül: 8,
      Ekim: 9,
      Kasım: 10,
      Aralık: 11,
    };

    const parts = String(value).split(' ');

    if (parts.length >= 3) {
      const day = Number(parts[0]);
      const month = months[parts[1]];
      const year = Number(parts[2]);

      if (!Number.isNaN(day) && month !== undefined && !Number.isNaN(year)) {
        return new Date(year, month, day);
      }
    }

    return null;
  };

  const normalizeTimelineType = (type) => {
    const value = String(type || '').toLowerCase();

    if (value.includes('return') || value.includes('iade')) return 'return';
    if (value.includes('segment')) return 'segment';

    return 'order';
  };
  const normalizeTimelineChannel = (item) => {
  const store = String(item.store || '').toLowerCase();
  const channel = String(item.channel || '').toLowerCase();

  if (
    store.includes('sporthink.com') ||
    store.includes('sporthink.com.tr') ||
    channel.includes('online')
  ) {
    return 'online';
  }

  return 'physical';
};

const getStoreText = (store) => {
  let text = String(store || '-').trim();

  text = text.replace(/^Mağaza\s*/i, '');

  text = text.replace(
    /([a-zçğıöşü])([A-ZÇĞİÖŞÜ])/g,
    '$1 $2'
  );

  text = text.replace(/\s+/g, ' ').trim();

  return text;
};

  const timelineItems = selectedCustomer?.timeline || [];

  const filteredTimelineItems = timelineItems.filter((item) => {
    const search = timelineSearch.toLowerCase();

    const productsText = Array.isArray(item.products)
      ? item.products.join(' ')
      : String(item.products || '');

    const itemType = normalizeTimelineType(item.type);
    const itemChannel = normalizeTimelineChannel(item);
    const itemDate = parseTimelineDate(item.date);

    const matchesSearch =
      !search ||
      String(item.event || '').toLowerCase().includes(search) ||
      String(item.store || '').toLowerCase().includes(search) ||
      String(item.channel || '').toLowerCase().includes(search) ||
      productsText.toLowerCase().includes(search);

    const matchesType =
      timelineTypeFilter === 'all' || itemType === timelineTypeFilter;

   const matchesChannel =
    timelineChannelFilter === 'all' ||
    itemChannel === timelineChannelFilter;

    const start = startDate ? new Date(startDate) : null;
    const end = endDate ? new Date(endDate) : null;

    const matchesDate =
      !itemDate ||
      ((!start || itemDate >= start) && (!end || itemDate <= end));

    return matchesSearch && matchesType && matchesChannel && matchesDate;
  });

  const getCampaignSuggestions = (customer) => {
    const segment = customer?.segment || '';
    const risk = customer?.metrics?.churnStatus || '';
    const orders = Number(customer?.metrics?.orders || 0);
    const returns = Number(customer?.metrics?.returns || 0);
    const avgOrderText = customer?.metrics?.avgOrder || '₺0';

    if (risk === 'Yüksek Risk' || segment === 'Risk Altında' || segment === 'Kayıp') {
      return [
        {
          badge: '%15',
          title: 'Geri Kazanım Kuponu',
          description: 'Riskli müşteriye özel sınırlı süreli indirim önerilir.',
        },
        {
          badge: 'SMS',
          title: 'Memnuniyet Hatırlatması',
          description: 'Müşteriye kısa bir geri dönüş ve özel teklif gönderilebilir.',
        },
      ];
    }

    if (segment === 'Şampiyon' || segment === 'Sadık Müşteri' || customer?.status === 'Premium') {
      return [
        {
          badge: 'VIP',
          title: 'Premium Sadakat Kampanyası',
          description: 'Sadık müşteriye özel ücretsiz kargo veya erken erişim önerilir.',
        },
        {
          badge: '+1',
          title: 'Çapraz Satış Önerisi',
          description: `Ortalama sepet ${avgOrderText}; tamamlayıcı ürün önerisi yapılabilir.`,
        },
      ];
    }

    if (orders <= 1) {
      return [
        {
          badge: '2.AL',
          title: 'İkinci Alışveriş Teşviki',
          description: 'Tek alışveriş yapan müşteriye ikinci sipariş için kupon önerilir.',
        },
        {
          badge: '%10',
          title: 'Yeni Müşteri Kuponu',
          description: 'Müşteriyi tekrar alışverişe yönlendirmek için düşük oranlı indirim sunulabilir.',
        },
      ];
    }

    if (returns > 0) {
      return [
        {
          badge: 'DESTEK',
          title: 'İade Sonrası Memnuniyet',
          description: 'İade yapan müşteriye güven artırıcı destek ve küçük avantaj sunulabilir.',
        },
        {
          badge: '%10',
          title: 'Güven Tazeleme Kuponu',
          description: 'Bir sonraki alışveriş için düşük riskli kupon önerilir.',
        },
      ];
    }

    return [
      {
        badge: '%10',
        title: 'Sepet Artırma Kampanyası',
        description: 'Ortalama sepeti artırmak için tamamlayıcı ürün indirimi önerilir.',
      },
      {
        badge: 'KARGO',
        title: 'Ücretsiz Kargo Eşiği',
        description: 'Müşteriyi daha yüksek sepet tutarına yönlendirmek için kargo avantajı sunulabilir.',
      },
    ];
  };

  if (!selectedCustomer) {
    return (
      <div style={styles.page}>
        <div style={styles.tableCard}>
          Müşteri verisi yükleniyor...
        </div>
      </div>
    );
  }

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
            Müşteri <span style={styles.redText}>360</span>
          </h1>
        </div>
      </div>

      <div style={styles.topActionRow}>
        <div style={styles.searchPanel}>
          <div style={styles.searchBox}>
            <Search size={17} color={darkMode ? '#fb7185' : '#dc2626'} />

            <input
              style={styles.searchInput}
              placeholder="Müşteri adı veya ID ara..."
              value={searchQuery}
              onChange={(e) => {
                const value = e.target.value;
                setSearchQuery(value);
                fetchCustomerList(value);
              }}
              onFocus={() => setIsSearchFocused(true)}
            />
          </div>

          {isSearchFocused && searchQuery && (
            <div style={styles.searchDropdown}>
              {filteredCustomers.map((customer) => (
                <button
                  key={customer.id}
                  style={styles.searchResult}
                  onClick={() => handleCustomerSelect(customer)}
                >
                  <div style={styles.searchAvatar}>
                    {customer.name?.[0] || '?'}
                  </div>

                  <div>
                    <div style={styles.searchName}>{customer.name}</div>
                    <div style={styles.searchId}>{customer.id}</div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div style={styles.customerTabMenu}>
        <button
          style={
            activeCustomerTab === 'info'
              ? styles.customerTabButtonActive
              : styles.customerTabButton
          }
          onClick={() => setActiveCustomerTab('info')}
        >
          <User size={16} />
          Müşteri Bilgisi
        </button>

        <button
          style={
            activeCustomerTab === 'timeline'
              ? styles.customerTabButtonActive
              : styles.customerTabButton
          }
          onClick={() => setActiveCustomerTab('timeline')}
        >
          <History size={16} />
          Etkileşim Geçmişi
        </button>
      </div>

      {activeCustomerTab === 'info' && (
        <>
          <section style={styles.profileCard}>
            <div style={styles.profileLeft}>
              <div style={styles.bigAvatar}>
                {selectedCustomer.name
                  .split(' ')
                  .map((x) => x[0])
                  .join('')}
              </div>

              <div>
                <div style={styles.profileTitleRow}>
                  <h2 style={styles.customerName}>{selectedCustomer.name}</h2>

                  <span style={styles.statusBadge(selectedCustomer.segment)}>
                    {selectedCustomer.status}
                  </span>
                </div>

                <div style={styles.tagRow}>
                  {selectedCustomer.tags.map((tag) => (
                    <span key={tag} style={styles.tag}>
                      {tag}
                    </span>
                  ))}
                </div>

                <div style={styles.infoRow}>
                  <div style={styles.infoPill}>
                    <ShieldCheck size={15} />
                    {selectedCustomer.id}
                  </div>

                  <div style={styles.infoPill}>
                    <MapPin size={15} />
                    {selectedCustomer.city}
                  </div>
                </div>
              </div>
            </div>

            <div style={styles.profileActions}>
              <button
                style={styles.secondaryButton}
                onClick={() => setShowMaskedData((prev) => !prev)}
              >
                {showMaskedData ? <EyeOff size={17} /> : <Eye size={17} />}
                {showMaskedData ? 'Maskele' : 'Göster'}
              </button>
            </div>
          </section>

          <div style={styles.contactBox}>
            <div style={styles.contactItem}>
              <Mail size={17} />
              <span style={styles.contactLabel}>E-posta</span>

              <b style={styles.contactValue}>
                {showMaskedData
                  ? selectedCustomer.contact.fullEmail
                  : selectedCustomer.contact.email}
              </b>
            </div>

            <div style={styles.contactItem}>
              <Phone size={17} />
              <span style={styles.contactLabel}>Telefon</span>

              <b style={styles.contactValue}>
                {showMaskedData
                  ? selectedCustomer.contact.fullPhone
                  : selectedCustomer.contact.phone}
              </b>
            </div>

            <div style={styles.contactItem}>
              <User size={17} />
              <span style={styles.contactLabel}>Segment</span>

              <b style={styles.contactValue}>
                {selectedCustomer.segment}
              </b>
            </div>
          </div>

          <div style={styles.statsGrid}>
            <MetricCard styles={styles} icon={Target} title="RFM Skoru">
              <div style={styles.rfmBox}>
                <RfmItem label="R" value={selectedCustomer.metrics.rfm.r} styles={styles} />
                <RfmItem label="F" value={selectedCustomer.metrics.rfm.f} styles={styles} />
                <RfmItem label="M" value={selectedCustomer.metrics.rfm.m} styles={styles} />
              </div>
            </MetricCard>

            <MetricCard styles={styles} icon={TrendingUp} title="Yaşam Boyu Değer">
              <h3 style={styles.metricBig}>{selectedCustomer.metrics.ltv}</h3>
              <p style={styles.metricSub}>Tahmini müşteri değeri</p>
            </MetricCard>

            <MetricCard styles={styles} icon={AlertCircle} title="Churn Analizi">
              <h3 style={styles.metricBig}>{selectedCustomer.metrics.churn}</h3>

              <span style={styles.churnBadge(selectedCustomer.metrics.churnStatus)}>
                {selectedCustomer.metrics.churnStatus}
              </span>
            </MetricCard>

            <MetricCard styles={styles} icon={Wallet} title="Sepet Ortalaması">
              <h3 style={styles.metricBig}>{selectedCustomer.metrics.avgOrder}</h3>
              <p style={styles.metricSub}>Ortalama sipariş tutarı</p>
            </MetricCard>
          </div>

          <div style={styles.segmentStoreGrid}>
  <div style={styles.tableCard}>
    <div style={styles.cardTitle}>
      <ArrowLeftRight size={19} />
      Segment Değişim Süreci
    </div>

    <div style={styles.segmentHistoryList}>
      {(selectedCustomer.segmentHistory || []).length === 0 ? (
        <div style={styles.emptyCampaignAiBox}>
          Segment geçmişi bulunamadı.
        </div>
      ) : (
        selectedCustomer.segmentHistory.map((item, index) => (
          <div key={index} style={styles.segmentHistoryItem}>
            <div style={styles.segmentDot} />
            <div>
              <b>{item.segment}</b>
              <span>{item.date} • RFM: {item.rfmScore}</span>
            </div>
          </div>
        ))
      )}
    </div>
  </div>

  <div style={styles.tableCard}>
    <div style={styles.cardTitle}>
      <MapPin size={19} />
      Alışveriş Yapılan Şubeler
    </div>

    <div style={styles.storeChartBox}>
      <ResponsiveContainer width="100%" height={260}>
        <BarChart
          data={(selectedCustomer.storeDistribution || []).map((row) => ({
            store: getStoreText(row.store),
            orders: Number(row.orders || 0),
            amount: Number(row.amount || 0),
          }))}
          margin={{ top: 12, right: 18, left: 0, bottom: 8 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            vertical={false}
            stroke={darkMode ? '#332025' : '#fecdd3'}
          />

          <XAxis
            dataKey="store"
            tick={{
              fill: darkMode ? '#cbd5e1' : '#64748b',
              fontSize: 10,
              fontWeight: 700,
            }}
            axisLine={false}
            tickLine={false}
          />

          <YAxis
            tick={{
              fill: darkMode ? '#cbd5e1' : '#64748b',
              fontSize: 10,
              fontWeight: 700,
            }}
            axisLine={false}
            tickLine={false}
          />

          <Tooltip
            formatter={(value, name) => [
              name === 'orders'
                ? `${value} sipariş`
                : `₺${Number(value).toLocaleString('tr-TR')}`,
              name === 'orders' ? 'Sipariş Sayısı' : 'Toplam Tutar',
            ]}
          />

          <Bar
            dataKey="orders"
            radius={[10, 10, 0, 0]}
            fill="#dc2626"
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  </div>
</div>

          <div style={styles.mainGrid}>
            <div style={styles.chartCard}>
              <div style={styles.cardTitle}>
                <TrendingUp size={19} />
                Harcama Trendi
              </div>

              <div style={styles.realChartBox}>
                <ResponsiveContainer width="100%" height={260}>
                  <AreaChart
                    data={(selectedCustomer.spendingRows || []).map((row, index) => ({
                      name: `${index + 1}. ${row.type || 'Alışveriş'}`,
                      date: row.date,
                      nominal: Number(row.nominal || 0),
                      real: Number(row.real || 0),
                    }))}
                    margin={{ top: 20, right: 24, left: 0, bottom: 8 }}
                  >
                    <defs>
                      <linearGradient id="nominalGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0.03} />
                      </linearGradient>

                      <linearGradient id="realGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#111827" stopOpacity={0.22} />
                        <stop offset="95%" stopColor="#111827" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>

                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      stroke={darkMode ? '#332025' : '#fecdd3'}
                    />

                    <XAxis
                      dataKey="name"
                      tick={{
                        fill: darkMode ? '#cbd5e1' : '#64748b',
                        fontSize: 11,
                        fontWeight: 700,
                      }}
                      axisLine={false}
                      tickLine={false}
                    />

                    <YAxis
                      tickFormatter={(value) => `₺${Number(value).toLocaleString('tr-TR')}`}
                      tick={{
                        fill: darkMode ? '#cbd5e1' : '#64748b',
                        fontSize: 11,
                        fontWeight: 700,
                      }}
                      axisLine={false}
                      tickLine={false}
                      width={90}
                    />

                    <Tooltip
                      formatter={(value, name) => [
                        `₺${Number(value).toLocaleString('tr-TR')}`,
                        name === 'nominal' ? 'Nominal Harcama' : 'Reel Harcama',
                      ]}
                      labelStyle={{ fontWeight: 900, color: '#111827' }}
                      contentStyle={{
                        borderRadius: 14,
                        border: '1px solid #fecdd3',
                        boxShadow: '0 14px 30px rgba(0,0,0,0.16)',
                      }}
                    />

                    <Area
                      type="monotone"
                      dataKey="real"
                      stroke="#111827"
                      strokeWidth={3}
                      fill="url(#realGradient)"
                      dot={{ r: 4, strokeWidth: 2, stroke: '#111827', fill: '#ffffff' }}
                    />

                    <Area
                      type="monotone"
                      dataKey="nominal"
                      stroke="#dc2626"
                      strokeWidth={4}
                      fill="url(#nominalGradient)"
                      dot={{ r: 5, strokeWidth: 3, stroke: '#dc2626', fill: '#ffffff' }}
                      activeDot={{ r: 8, strokeWidth: 3, stroke: '#991b1b', fill: '#ef4444' }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div style={styles.aiCard}>
              <div style={styles.aiIcon}>
                <BrainCircuit size={28} />
              </div>

              <h3 style={styles.aiTitle}>AI Destekli Öneri</h3>

              <div style={styles.aiText}>
                {isAiLoading
                  ? 'AI analiz oluşturuluyor...'
                  : aiAnalysis || 'AI analizi bekleniyor...'}
              </div>

              <button
                style={styles.primaryButton}
                onClick={() => fetchCustomerAi(selectedCustomer)}
              >
                <BrainCircuit size={16} />
                {isAiLoading ? 'AI Analiz Oluşturuyor...' : 'AI ile Analiz Et'}
              </button>
            </div>
          </div>

          <div style={styles.bottomGridInfo}>
            <div style={styles.tableCard}>
              <div style={styles.cardTitle}>
                <ShoppingBag size={19} />
                İşlem Özeti
              </div>

              <div style={styles.transactionGrid}>
                <div style={styles.transactionBox}>
                  <ShoppingBag size={22} />
                  <b>{selectedCustomer.metrics.orders}</b>
                  <span>Sipariş</span>
                </div>

                <div style={styles.transactionBox}>
                  <RotateCcw size={22} />
                  <b>{selectedCustomer.metrics.returns}</b>
                  <span>İade</span>
                </div>

                
              </div>
            </div>

         <div style={styles.campaignCardModern}>
  <div style={styles.campaignHeaderModern}>
    <div style={styles.campaignHeaderLeft}>
      <div style={styles.campaignHeaderIcon}>
        <Sparkles size={22} />
      </div>

      <div>
        <h3 style={styles.campaignTitleModern}>AI Kampanya Önerileri</h3>
        <p style={styles.campaignAiDescription}>
          Müşterinin harcama geçmişi, alışveriş sıklığı, iade davranışı ve mağaza tercihine göre kişiselleştirilmiş kampanya önerileri.
        </p>
      </div>
    </div>

    <button
      style={styles.primaryButton}
      onClick={fetchCampaignSuggestionsAi}
      disabled={campaignAiLoading}
    >
      <BrainCircuit size={16} />
      {campaignAiLoading ? 'AI analiz ediyor...' : 'AI ile Kampanya Öner'}
    </button>
  </div>

  <div style={styles.campaignAiListModern}>
    {campaignAiSuggestions.length === 0 && (
      <div style={styles.emptyCampaignAiBox}>
        Henüz AI kampanya önerisi oluşturulmadı.
      </div>
    )}

    {campaignAiSuggestions.map((campaign, index) => {
      const isSelected = selectedCampaignIndex === index;

      return (
        <button
          key={index}
          type="button"
          style={isSelected ? styles.campaignSelectCardActive : styles.campaignSelectCard}
          onClick={() => handleSelectCampaign(campaign, index)}
        >
          <div style={styles.campaignBadgeBox}>
            <Gift size={22} />
            <span>{campaign.badge}</span>
          </div>

          <div style={styles.campaignContentBox}>
            <div style={styles.campaignCardTopLine}>
              <span style={styles.campaignSmallBadge}>ÖNERİ {index + 1}</span>
              {isSelected && <span style={styles.selectedCampaignBadge}>SEÇİLDİ</span>}
            </div>

            <b style={styles.campaignCardTitle}>{campaign.title}</b>
            <p style={styles.campaignCardDesc}>{campaign.description}</p>

            {campaign.condition && (
              <small style={styles.campaignConditionModern}>
                Koşul: {campaign.condition}
              </small>
            )}
          </div>
        </button>
      );
    })}
  </div>

  {editableCampaign && (
    <div style={styles.campaignEditPanel}>
      <div style={styles.campaignEditHeader}>
        <div>
          <h4 style={styles.campaignEditTitle}>
            <Edit3 size={17} />
            Seçilen Kampanyayı Düzenle
          </h4>
          <p style={styles.campaignEditSub}>
            Kampanya bilgilerini düzenleyip müşteriye mail olarak gönderebilirsin.
          </p>
        </div>
      </div>

      <div style={styles.campaignFormGrid}>
        <label style={styles.campaignFormLabel}>
          Kampanya Rozeti
          <input
            style={styles.campaignInput}
            value={editableCampaign.badge}
            onChange={(e) => updateEditableCampaign('badge', e.target.value)}
          />
        </label>

        <label style={styles.campaignFormLabel}>
          Kupon Kodu
          <input
            style={styles.campaignInput}
            value={editableCampaign.couponCode}
            onChange={(e) => updateEditableCampaign('couponCode', e.target.value)}
          />
        </label>

        <label style={styles.campaignFormLabelFull}>
          Kampanya Başlığı
          <input
            style={styles.campaignInput}
            value={editableCampaign.title}
            onChange={(e) => updateEditableCampaign('title', e.target.value)}
          />
        </label>

        <label style={styles.campaignFormLabelFull}>
          Açıklama
          <textarea
            style={styles.campaignTextarea}
            value={editableCampaign.description}
            onChange={(e) => updateEditableCampaign('description', e.target.value)}
          />
        </label>

        <label style={styles.campaignFormLabelFull}>
          Kampanya Koşulu
          <input
            style={styles.campaignInput}
            value={editableCampaign.condition}
            onChange={(e) => updateEditableCampaign('condition', e.target.value)}
          />
        </label>

        <label style={styles.campaignFormLabelFull}>
          Mail Konusu
          <input
            style={styles.campaignInput}
            value={editableCampaign.mailSubject}
            onChange={(e) => updateEditableCampaign('mailSubject', e.target.value)}
          />
        </label>

        <label style={styles.campaignFormLabelFull}>
          Mail İçeriği
          <textarea
            style={styles.mailTextarea}
            value={editableCampaign.mailBody}
            onChange={(e) => updateEditableCampaign('mailBody', e.target.value)}
          />
        </label>
      </div>

      <button
        style={styles.applyCampaignButton}
        onClick={applyCampaignAndSendMail}
        disabled={campaignApplyLoading}
      >
        <Send size={17} />
        {campaignApplyLoading ? 'Mail gönderiliyor...' : 'Kampanyayı Uygula ve Mail Gönder'}
      </button>
    </div>
  )}
</div>
          </div>
        </>
      )}

      {activeCustomerTab === 'timeline' && (
        <section style={styles.timelinePageCard}>
          <div style={styles.timelineFilterBar}>
            <div style={styles.timelineSearchBox}>
              <Search size={16} color={darkMode ? '#94a3b8' : '#64748b'} />

              <input
                style={styles.timelineSearchInput}
                placeholder="Ürün, mağaza veya işlem ara..."
                value={timelineSearch}
                onChange={(e) => setTimelineSearch(e.target.value)}
              />
            </div>

            <div style={styles.filterButtonGroup}>
              <button
                style={timelineTypeFilter === 'all' ? styles.filterButtonActive : styles.filterButton}
                onClick={() => setTimelineTypeFilter('all')}
              >
                Tümü
              </button>

              <button
                style={timelineTypeFilter === 'order' ? styles.filterButtonActive : styles.filterButton}
                onClick={() =>
              setTimelineTypeFilter((prev) => (prev === 'order' ? 'all' : 'order'))
            }
              >
                Alışveriş
              </button>
              <button
                style={timelineTypeFilter === 'return' ? styles.filterButtonActive : styles.filterButton}
                onClick={() =>
                  setTimelineTypeFilter((prev) => (prev === 'return' ? 'all' : 'return'))
                }
              >
                İade
              </button>

              <button
            style={timelineChannelFilter === 'online' ? styles.filterButtonGreen : styles.filterButton}
            onClick={() =>
              setTimelineChannelFilter((prev) => (prev === 'online' ? 'all' : 'online'))
            }
          >
            Online Mağaza
          </button>

          <button
            style={timelineChannelFilter === 'physical' ? styles.filterButtonBlue : styles.filterButton}
            onClick={() =>
              setTimelineChannelFilter((prev) => (prev === 'physical' ? 'all' : 'physical'))
            }
          >
            Fiziksel Mağaza
          </button>

              {dateRangeOpen && (
                <div style={styles.dateRangeDropdown}>
                  <label style={styles.dateLabel}>Başlangıç Tarihi</label>

                  <input
                    type="date"
                    style={styles.dateInput}
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />

                  <label style={styles.dateLabel}>Bitiş Tarihi</label>

                  <input
                    type="date"
                    style={styles.dateInput}
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />

                  <button
                    style={styles.clearDateButton}
                    onClick={() => {
                      setStartDate('');
                      setEndDate('');
                    }}
                  >
                    Tarihi Temizle
                  </button>
                </div>
              )}
            </div>
          </div>

          <div style={styles.timelineHeaderNew}>
            <div style={styles.timelineHeaderLeft}>
              <h3 style={styles.timelineHeaderTitle}>Etkileşim Geçmişi</h3>

              <span style={styles.timelineCountBadge}>
                {filteredTimelineItems.length} İşlem
              </span>
            </div>

            <span style={styles.timelineUpdateText}>Son güncelleme: Bugün</span>
          </div>

          {filteredTimelineItems.length === 0 ? (
            <div style={styles.emptyTimelineBox}>
              Aradığınız kriterlere uygun etkileşim bulunamadı.
            </div>
          ) : (
            <div style={styles.timelineLineWrap}>
              <div style={styles.timelineVerticalLine} />

              <div style={styles.timelineListNew}>
                {filteredTimelineItems.map((item) => {
                  const itemType = normalizeTimelineType(item.type);
                  const isExpanded = expandedTimelineItems[item.id];

                  const products = Array.isArray(item.products)
                    ? item.products
                    : String(item.products || '')
                        .split(',')
                        .map((x) => x.trim())
                        .filter(Boolean);

                  return (
                    <div key={item.id} style={styles.timelineItemBetter}>
                      <div style={styles.timelineIconBetter(itemType, item.channel)}>
                        {itemType === 'return' ? (
                          <RotateCcw size={17} />
                        ) : (
                          <ShoppingBag size={17} />
                        )}
                      </div>

                      <div style={styles.timelineCardBetter}>
                        <div style={styles.timelineCardTop}>
                          <div style={styles.timelineBadgeRow}>
                            <span style={styles.timelineTypeBadgeBetter(itemType)}>
                              {itemType === 'return'
                                ? 'İade'
                                : itemType === 'segment'
                                ? 'Segment'
                                : 'Alışveriş'}
                            </span>

                            <span style={styles.timelineChannelBadge(item.channel)}>
                              {normalizeTimelineChannel(item) === 'online' ? 'Online Mağaza' : 'Fiziksel Mağaza'}
                            </span>
                          </div>

                          <div style={styles.timelineDateBetter}>
                            <Calendar size={14} />
                            <span>{item.date}</span>

                            {item.time && (
                              <>
                                <span>•</span>
                                <span>{item.time}</span>
                              </>
                            )}
                          </div>
                        </div>

                        <div style={styles.timelineAmountTitle}>
                          {item.event || 'İşlem kaydı'}
                        </div>

                        <div style={styles.timelineInfoGrid}>
                          <div style={styles.timelineInfoItem}>
                            <MapPin size={16} />

                            <div>
                              <span></span>
                              <b>{getStoreText(item.store)}</b>
                            </div>
                          </div>

                         
                        </div>

                        <button
                          style={styles.productToggleButton}
                          onClick={() => toggleTimelineExpand(item.id)}
                        >
                          <span>
                            <Tag size={14} />
                            {itemType === 'return'
                            ? `İade Edilen Ürünler (${products.length})`
                            : `Satın Alınan Ürünler (${products.length})`}
                          </span>

                          {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </button>

                        {isExpanded && (
                          <ul style={styles.productListBetter}>
                            {products.map((product, index) => (
                              <li key={index}>{product}</li>
                            ))}
                          </ul>
                        )}

                        
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </section>
      )}
    </div>
  );
}

function MetricCard({ styles, icon: Icon, title, children }) {
  return (
    <div style={styles.metricCard}>
      <div style={styles.metricHeader}>
        <div style={styles.metricIcon}>
          <Icon size={22} />
        </div>

        <span>{title}</span>
        <ArrowUpRight size={15} />
      </div>

      {children}
    </div>
  );
}

function RfmItem({ styles, label, value }) {
  return (
    <div style={styles.rfmItem}>
      <span>{label}</span>
      <b>{value}</b>
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
    alignItems: 'center',
    marginBottom: 26,
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

  primaryButton: {
    height: 42,
    padding: '0 18px',
    borderRadius: 18,
    borderWidth: 0,
    background: 'linear-gradient(135deg, #991b1b, #ef4444)',
    color: '#ffffff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    cursor: 'pointer',
    fontWeight: 900,
    boxShadow: '0 12px 30px rgba(239,68,68,0.38)',
  },

  secondaryButton: {
    height: 42,
    padding: '0 16px',
    borderRadius: 16,
    border: darkMode ? '1px solid #332025' : '1px solid #fecdd3',
    background: darkMode ? '#17181d' : '#fff1f2',
    color: darkMode ? '#fb7185' : '#dc2626',
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    cursor: 'pointer',
    fontWeight: 900,
  },

  topActionRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 16,
    marginBottom: 14,
  },

  searchPanel: {
    position: 'relative',
    maxWidth: 520,
    width: '100%',
  },

  searchBox: {
    height: 46,
    borderRadius: 16,
    border: darkMode ? '1px solid #332025' : '1px solid #fecdd3',
    background: darkMode ? '#17181d' : '#fff1f2',
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '0 16px',
    boxShadow: darkMode
      ? '0 12px 28px rgba(0,0,0,0.20)'
      : '0 12px 28px rgba(239,68,68,0.07)',
  },

  searchInput: {
    flex: 1,
    borderWidth: 0,
    outline: 'none',
    background: 'transparent',
    color: darkMode ? '#f8fafc' : '#111827',
    fontSize: 13,
    fontWeight: 700,
  },

  searchDropdown: {
    position: 'absolute',
    top: 56,
    left: 0,
    right: 0,
    zIndex: 50,
    borderRadius: 18,
    overflow: 'hidden',
    background: darkMode ? '#111114' : '#ffffff',
    border: darkMode ? '1px solid #332025' : '1px solid #fecdd3',
    boxShadow: '0 18px 42px rgba(0,0,0,0.25)',
  },

  searchResult: {
    width: '100%',
    padding: 14,
    borderWidth: 0,
    background: 'transparent',
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    cursor: 'pointer',
    textAlign: 'left',
    color: darkMode ? '#f8fafc' : '#111827',
  },

  searchAvatar: {
    width: 38,
    height: 38,
    borderRadius: 14,
    background: 'linear-gradient(135deg, #991b1b, #ef4444)',
    color: '#ffffff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 900,
  },

  searchName: {
    fontWeight: 900,
    fontSize: 13,
  },

  searchId: {
    marginTop: 2,
    fontSize: 10,
    color: darkMode ? '#94a3b8' : '#64748b',
    fontWeight: 800,
  },

  customerTabMenu: {
    display: 'flex',
    gap: 12,
    marginBottom: 24,
    background: darkMode ? '#111114' : '#ffffff',
    border: darkMode ? '1px solid #332025' : '1px solid #fecdd3',
    borderRadius: 20,
    padding: 8,
    width: 'fit-content',
  },

  customerTabButton: {
    height: 42,
    padding: '0 18px',
    borderRadius: 14,
    borderWidth: 0,
    background: 'transparent',
    color: darkMode ? '#94a3b8' : '#64748b',
    fontWeight: 900,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },

  customerTabButtonActive: {
    height: 42,
    padding: '0 18px',
    borderRadius: 14,
    borderWidth: 0,
    background: 'linear-gradient(135deg, #991b1b, #ef4444)',
    color: '#ffffff',
    fontWeight: 900,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    boxShadow: '0 12px 28px rgba(239,68,68,0.30)',
  },

  profileCard: {
    background: darkMode
      ? 'linear-gradient(145deg, #151519, #211116)'
      : 'linear-gradient(145deg, #ffffff, #fff1f2)',
    border: darkMode ? '1px solid #332025' : '1px solid #fecdd3',
    borderRadius: 24,
    padding: 24,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 24,
    marginBottom: 22,
    boxShadow: darkMode
      ? '0 18px 42px rgba(0,0,0,0.34)'
      : '0 18px 42px rgba(239,68,68,0.08)',
  },

  profileLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: 18,
  },

  bigAvatar: {
    width: 76,
    height: 76,
    borderRadius: 24,
    background: 'linear-gradient(135deg, #991b1b, #ef4444)',
    color: '#ffffff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 24,
    fontWeight: 900,
    boxShadow: '0 14px 34px rgba(239,68,68,0.35)',
  },

  profileTitleRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    flexWrap: 'wrap',
  },

  customerName: {
    fontSize: 30,
    fontWeight: 900,
    color: darkMode ? '#ffffff' : '#111827',
    margin: 0,
  },

  statusBadge: (segment) => ({
    padding: '6px 11px',
    borderRadius: 999,
    fontSize: 10,
    fontWeight: 900,
    background:
      segment === 'Riskli'
        ? 'linear-gradient(135deg, #991b1b, #ef4444)'
        : darkMode
        ? 'linear-gradient(135deg, #3b1116, #7f1d1d)'
        : 'linear-gradient(135deg, #fee2e2, #fecaca)',
    color: segment === 'Riskli' ? '#ffffff' : darkMode ? '#fb7185' : '#dc2626',
  }),

  tagRow: {
    display: 'flex',
    gap: 8,
    marginTop: 10,
    flexWrap: 'wrap',
  },

  tag: {
    padding: '6px 10px',
    borderRadius: 999,
    background: darkMode ? '#222329' : '#ffffff',
    color: darkMode ? '#cbd5e1' : '#64748b',
    border: darkMode ? '1px solid #332025' : '1px solid #fecdd3',
    fontSize: 10,
    fontWeight: 900,
  },

  infoRow: {
    display: 'flex',
    gap: 10,
    marginTop: 12,
    flexWrap: 'wrap',
  },

  infoPill: {
    display: 'flex',
    alignItems: 'center',
    gap: 7,
    padding: '8px 12px',
    borderRadius: 14,
    background: darkMode ? '#111114' : '#fff7f8',
    color: darkMode ? '#f8fafc' : '#111827',
    border: darkMode ? '1px solid #332025' : '1px solid #fecdd3',
    fontSize: 12,
    fontWeight: 900,
  },

  profileActions: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    flexWrap: 'wrap',
  },

  contactBox: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
    gap: 18,
    marginBottom: 22,
  },

  contactItem: {
    background: darkMode
      ? 'linear-gradient(145deg, #151519, #1f2026)'
      : '#ffffff',
    border: darkMode ? '1px solid #332025' : '1px solid #fecdd3',
    borderRadius: 18,
    padding: 18,
    display: 'flex',
    alignItems: 'center',
    gap: 14,
  },

  contactLabel: {
    fontSize: 11,
    color: darkMode ? '#94a3b8' : '#64748b',
    fontWeight: 900,
  },

  contactValue: {
    fontSize: 13,
    color: darkMode ? '#ffffff' : '#111827',
  },

  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
    gap: 18,
    marginBottom: 22,
  },

  metricCard: {
    background: darkMode
      ? 'linear-gradient(145deg, #151519, #1f2026)'
      : '#ffffff',
    border: darkMode ? '1px solid #332025' : '1px solid #fecdd3',
    borderRadius: 22,
    padding: 20,
    boxShadow: darkMode
      ? '0 14px 32px rgba(0,0,0,0.28)'
      : '0 12px 30px rgba(239,68,68,0.08)',
  },

  metricHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    color: darkMode ? '#cbd5e1' : '#64748b',
    fontSize: 11,
    fontWeight: 900,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 18,
  },

  metricIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    background: darkMode
      ? 'linear-gradient(135deg, #3b1116, #7f1d1d)'
      : 'linear-gradient(135deg, #fee2e2, #fecaca)',
    color: darkMode ? '#fb7185' : '#dc2626',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },

  rfmBox: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: 10,
  },

  rfmItem: {
    textAlign: 'center',
    borderRadius: 16,
    padding: 12,
    background: darkMode ? '#111114' : '#fff1f2',
  },

  metricBig: {
    fontSize: 28,
    fontWeight: 900,
    margin: 0,
    color: darkMode ? '#ffffff' : '#111827',
  },

  metricSub: {
    marginTop: 6,
    fontSize: 12,
    color: darkMode ? '#94a3b8' : '#64748b',
  },

  churnBadge: (status) => ({
    display: 'inline-flex',
    marginTop: 10,
    padding: '6px 10px',
    borderRadius: 999,
    fontSize: 10,
    fontWeight: 900,
    background:
      status === 'Yüksek Risk'
        ? 'linear-gradient(135deg, #991b1b, #ef4444)'
        : 'linear-gradient(135deg, #14532d, #22c55e)',
    color: '#ffffff',
  }),

  mainGrid: {
    display: 'grid',
    gridTemplateColumns: '2fr 1fr',
    gap: 22,
    marginBottom: 22,
  },

  chartCard: {
    background: darkMode
      ? 'linear-gradient(145deg, #151519, #1f2026)'
      : '#ffffff',
    border: darkMode ? '1px solid #332025' : '1px solid #fecdd3',
    borderRadius: 22,
    padding: 24,
  },

  cardTitle: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    color: darkMode ? '#ffffff' : '#111827',
    fontWeight: 900,
    marginBottom: 22,
  },

  realChartBox: {
    width: '100%',
    height: 290,
    borderRadius: 20,
    padding: 14,
    background: darkMode
      ? 'linear-gradient(135deg, #111114, #1f2026)'
      : 'linear-gradient(135deg, #ffffff, #fff7f8)',
    border: darkMode ? '1px solid #332025' : '1px solid #fecdd3',
  },

  aiCard: {
    background: darkMode
      ? 'linear-gradient(145deg, #251116, #151519)'
      : 'linear-gradient(145deg, #ffffff, #fff1f2)',
    border: darkMode ? '1px solid #7f1d1d' : '1px solid #fecdd3',
    borderRadius: 22,
    padding: 24,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    gap: 16,
  },

  aiIcon: {
    width: 58,
    height: 58,
    borderRadius: 20,
    background: 'linear-gradient(135deg, #991b1b, #ef4444)',
    color: '#ffffff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 14px 30px rgba(239,68,68,0.36)',
  },

  aiTitle: {
    margin: 0,
    fontSize: 18,
    fontWeight: 900,
    color: darkMode ? '#ffffff' : '#111827',
  },

  aiText: {
    fontSize: 13,
    lineHeight: 1.6,
    color: darkMode ? '#cbd5e1' : '#475569',
    whiteSpace: 'pre-line',
  },

  bottomGridInfo: {
  display: 'grid',
  gridTemplateColumns: 'minmax(360px, 520px) 1fr',
  gap: 22,
  alignItems: 'start',
},

  tableCard: {
    background: darkMode
      ? 'linear-gradient(145deg, #151519, #1f2026)'
      : '#ffffff',
    border: darkMode ? '1px solid #332025' : '1px solid #fecdd3',
    borderRadius: 22,
    padding: 24,
  },
transactionGrid: {
  display: 'grid',
  gridTemplateColumns: 'repeat(2, 120px)',
  gap: 12,
},

  transactionBox: {
    height: 100,
    borderRadius: 18,
    padding: 18,
    background: darkMode ? '#111114' : '#fff1f2',
    color: darkMode ? '#fb7185' : '#dc2626',
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    gap: 7,
    alignItems: 'center',
  },

  campaignCard: {
    background: darkMode
      ? 'linear-gradient(145deg, #151519, #251116)'
      : 'linear-gradient(145deg, #ffffff, #fff1f2)',
    border: darkMode ? '1px solid #332025' : '1px solid #fecdd3',
    borderRadius: 22,
    padding: 24,
  },

  campaignItem: {
    display: 'flex',
    gap: 14,
    padding: 16,
    borderRadius: 18,
    background: darkMode ? '#111114' : '#ffffff',
    border: darkMode ? '1px solid #332025' : '1px solid #fecdd3',
    marginBottom: 12,
  },

  campaignItemActive: {
    display: 'flex',
    gap: 14,
    padding: 16,
    borderRadius: 18,
    background: 'linear-gradient(135deg, #991b1b, #ef4444)',
    color: '#ffffff',
    marginBottom: 12,
  },

  timelinePageCard: {
    background: darkMode ? 'linear-gradient(145deg, #151519, #1f2026)' : '#ffffff',
    border: darkMode ? '1px solid #332025' : '1px solid #fecdd3',
    borderRadius: 24,
    padding: 24,
  },

  timelineFilterBar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 14,
    flexWrap: 'wrap',
    marginBottom: 24,
  },

  timelineSearchBox: {
    height: 42,
    minWidth: 280,
    flex: 1,
    borderRadius: 14,
    border: darkMode ? '1px solid #332025' : '1px solid #e2e8f0',
    background: darkMode ? '#111114' : '#f8fafc',
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '0 14px',
  },

  timelineSearchInput: {
    flex: 1,
    borderWidth: 0,
    outline: 'none',
    background: 'transparent',
    color: darkMode ? '#f8fafc' : '#111827',
    fontSize: 12,
    fontWeight: 700,
  },

  filterButtonGroup: {
    display: 'flex',
    gap: 8,
    flexWrap: 'wrap',
  },

  filterButton: {
    height: 36,
    padding: '0 13px',
    borderRadius: 12,
    borderWidth: 0,
    background: darkMode ? '#1f2026' : '#f1f5f9',
    color: darkMode ? '#cbd5e1' : '#64748b',
    fontSize: 11,
    fontWeight: 900,
    cursor: 'pointer',
  },

  filterButtonActive: {
  height: 36,
  padding: '0 13px',
  borderRadius: 12,
  borderWidth: 0,
  background: 'linear-gradient(135deg, #991b1b, #ef4444)',
  color: '#ffffff',
  fontSize: 11,
  fontWeight: 900,
  cursor: 'pointer',
  boxShadow: '0 10px 24px rgba(239,68,68,0.28)',
},

filterButtonGreen: {
  height: 36,
  padding: '0 13px',
  borderRadius: 12,
  borderWidth: 0,
  background: 'linear-gradient(135deg, #991b1b, #ef4444)',
  color: '#ffffff',
  fontSize: 11,
  fontWeight: 900,
  cursor: 'pointer',
  boxShadow: '0 10px 24px rgba(239,68,68,0.28)',
},

filterButtonBlue: {
  height: 36,
  padding: '0 13px',
  borderRadius: 12,
  borderWidth: 0,
  background: 'linear-gradient(135deg, #991b1b, #ef4444)',
  color: '#ffffff',
  fontSize: 11,
  fontWeight: 900,
  cursor: 'pointer',
  boxShadow: '0 10px 24px rgba(239,68,68,0.28)',
  cursor: 'pointer',
  },

  dateRangeWrap: {
    position: 'relative',
  },

  dateRangeButton: {
    height: 36,
    padding: '0 13px',
    borderRadius: 12,
    border: darkMode ? '1px solid #332025' : '1px solid #e2e8f0',
    background: darkMode ? '#111114' : '#ffffff',
    color: darkMode ? '#f8fafc' : '#475569',
    fontSize: 11,
    fontWeight: 900,
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    cursor: 'pointer',
  },

  dateRangeDropdown: {
    position: 'absolute',
    top: 44,
    right: 0,
    zIndex: 30,
    width: 240,
    padding: 14,
    borderRadius: 16,
    background: darkMode ? '#111114' : '#ffffff',
    border: darkMode ? '1px solid #332025' : '1px solid #e2e8f0',
    boxShadow: '0 18px 40px rgba(0,0,0,0.20)',
  },

  dateLabel: {
    display: 'block',
    fontSize: 10,
    fontWeight: 900,
    color: darkMode ? '#94a3b8' : '#64748b',
    marginBottom: 6,
  },

  dateInput: {
    width: '100%',
    height: 36,
    borderRadius: 10,
    border: darkMode ? '1px solid #332025' : '1px solid #e2e8f0',
    background: darkMode ? '#1f2026' : '#f8fafc',
    color: darkMode ? '#f8fafc' : '#111827',
    padding: '0 10px',
    marginBottom: 10,
    fontWeight: 800,
  },

  clearDateButton: {
    width: '100%',
    height: 34,
    borderRadius: 10,
    borderWidth: 0,
    background: '#fee2e2',
    color: '#dc2626',
    fontWeight: 900,
    cursor: 'pointer',
  },

  timelineHeaderNew: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottom: darkMode ? '1px solid #332025' : '1px solid #e2e8f0',
    paddingBottom: 16,
    marginBottom: 26,
  },

  timelineHeaderLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
  },

  timelineHeaderTitle: {
    margin: 0,
    fontSize: 16,
    fontWeight: 900,
    color: darkMode ? '#ffffff' : '#111827',
  },

  timelineCountBadge: {
    background: darkMode ? '#1f2026' : '#f1f5f9',
    color: darkMode ? '#cbd5e1' : '#64748b',
    padding: '5px 10px',
    borderRadius: 999,
    fontSize: 11,
    fontWeight: 900,
  },

  timelineUpdateText: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: 800,
  },

  emptyTimelineBox: {
    padding: 42,
    textAlign: 'center',
    color: darkMode ? '#94a3b8' : '#64748b',
    fontWeight: 800,
  },

  timelineLineWrap: {
    position: 'relative',
    paddingLeft: 36,
  },

  timelineVerticalLine: {
    position: 'absolute',
    left: 12,
    top: 12,
    bottom: 12,
    width: 2,
    borderRadius: 999,
    background: 'linear-gradient(180deg, #10b981, #fecdd3, transparent)',
  },

  timelineListNew: {
    display: 'flex',
    flexDirection: 'column',
    gap: 22,
  },

  timelineItemBetter: {
    position: 'relative',
  },

  timelineIconBetter: (type, channel) => ({
  position: 'absolute',
  left: -42,
  top: 8,
  width: 36,
  height: 36,
  borderRadius: 14,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: darkMode
    ? 'linear-gradient(135deg, #3b1116, #7f1d1d)'
    : 'linear-gradient(135deg, #fee2e2, #fecaca)',
  color: darkMode ? '#fb7185' : '#dc2626',
  boxShadow: '0 10px 24px rgba(239,68,68,0.20)',
}),

  timelineCardBetter: {
    borderRadius: 20,
    padding: 20,
    background: darkMode ? '#111114' : '#ffffff',
    border: darkMode ? '1px solid #332025' : '1px solid #e2e8f0',
    boxShadow: darkMode ? 'none' : '0 12px 30px rgba(15,23,42,0.05)',
  },

  timelineCardTop: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
    flexWrap: 'wrap',
    marginBottom: 14,
  },

  timelineBadgeRow: {
    display: 'flex',
    gap: 8,
    flexWrap: 'wrap',
  },

 timelineTypeBadgeBetter: (type) => ({
  padding: '6px 10px',
  borderRadius: 10,
  fontSize: 10,
  fontWeight: 900,
  textTransform: 'uppercase',
  background: darkMode ? '#3b1116' : '#fee2e2',
  color: darkMode ? '#fb7185' : '#dc2626',
}),

  timelineChannelBadge: () => ({
    padding: '6px 10px',
    borderRadius: 10,
    fontSize: 10,
    fontWeight: 900,
    background: darkMode ? '#1f2026' : '#f1f5f9',
    color: darkMode ? '#cbd5e1' : '#64748b',
  }),

  timelineDateBetter: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    fontSize: 11,
    fontWeight: 800,
    color: darkMode ? '#94a3b8' : '#64748b',
  },

  timelineAmountTitle: {
    fontSize: 15,
    fontWeight: 900,
    color: darkMode ? '#ffffff' : '#111827',
    marginBottom: 14,
  },

  timelineInfoGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
    gap: 12,
    padding: 14,
    borderRadius: 16,
    background: darkMode ? '#1f2026' : '#f8fafc',
    border: darkMode ? '1px solid #332025' : '1px solid #e2e8f0',
    marginBottom: 14,
  },

  timelineInfoItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    color: darkMode ? '#94a3b8' : '#64748b',
  },

  productToggleButton: {
    width: '100%',
    borderWidth: 0,
    borderTop: darkMode ? '1px solid #332025' : '1px solid #e2e8f0',
    background: 'transparent',
    color: darkMode ? '#cbd5e1' : '#64748b',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 0',
    fontSize: 12,
    fontWeight: 900,
    cursor: 'pointer',
  },

  productListBetter: {
    margin: '4px 0 0 18px',
    padding: 0,
    color: darkMode ? '#cbd5e1' : '#475569',
    fontSize: 12,
    lineHeight: 1.9,
    fontWeight: 700,
  },

  timelineFooterActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    marginTop: 14,
    paddingTop: 12,
    borderTop: darkMode ? '1px solid #332025' : '1px solid #f1f5f9',
  },

  invoiceButton: {
    height: 34,
    padding: '0 12px',
    borderRadius: 10,
    borderWidth: 0,
    background: darkMode ? '#1f2026' : '#f8fafc',
    color: darkMode ? '#cbd5e1' : '#64748b',
    display: 'flex',
    alignItems: 'center',
    gap: 7,
    fontSize: 11,
    fontWeight: 900,
    cursor: 'pointer',
  },

  campaignAiDescription: {
  fontSize: 12,
  lineHeight: 1.6,
  color: darkMode ? '#cbd5e1' : '#64748b',
  fontWeight: 700,
  marginBottom: 14,
},

campaignAiList: {
  marginTop: 16,
},

emptyCampaignAiBox: {
  padding: 18,
  borderRadius: 16,
  background: darkMode ? '#111114' : '#fff1f2',
  color: darkMode ? '#94a3b8' : '#64748b',
  fontSize: 12,
  fontWeight: 800,
  textAlign: 'center',
  border: darkMode ? '1px solid #332025' : '1px solid #fecdd3',
},

campaignCondition: {
  display: 'block',
  marginTop: 6,
  fontSize: 10,
  fontWeight: 900,
  color: 'inherit',
  opacity: 0.9,
},

campaignCardModern: {
  background: darkMode
    ? 'linear-gradient(145deg, #151519, #251116)'
    : 'linear-gradient(145deg, #ffffff, #fff7f8)',
  border: darkMode ? '1px solid #332025' : '1px solid #fecdd3',
  borderRadius: 24,
  padding: 24,
  boxShadow: darkMode
    ? '0 18px 42px rgba(0,0,0,0.30)'
    : '0 18px 42px rgba(239,68,68,0.08)',
},

campaignHeaderModern: {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
  gap: 18,
  marginBottom: 20,
  flexWrap: 'wrap',
},

campaignHeaderLeft: {
  display: 'flex',
  gap: 14,
  alignItems: 'flex-start',
},

campaignHeaderIcon: {
  width: 52,
  height: 52,
  borderRadius: 18,
  background: 'linear-gradient(135deg, #991b1b, #ef4444)',
  color: '#ffffff',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  boxShadow: '0 14px 30px rgba(239,68,68,0.35)',
},

campaignTitleModern: {
  margin: 0,
  fontSize: 18,
  fontWeight: 900,
  color: darkMode ? '#ffffff' : '#111827',
},

campaignAiListModern: {
  display: 'grid',
  gap: 14,
  marginTop: 16,
},

campaignSelectCard: {
  width: '100%',
  border: darkMode ? '1px solid #332025' : '1px solid #fecdd3',
  background: darkMode ? '#111114' : '#ffffff',
  borderRadius: 20,
  padding: 16,
  display: 'grid',
  gridTemplateColumns: '74px 1fr',
  gap: 16,
  textAlign: 'left',
  cursor: 'pointer',
  color: darkMode ? '#f8fafc' : '#111827',
  transition: '0.2s ease',
},

campaignSelectCardActive: {
  width: '100%',
  border: '2px solid #ef4444',
  background: darkMode
    ? 'linear-gradient(135deg, #251116, #111114)'
    : 'linear-gradient(135deg, #fff1f2, #ffffff)',
  borderRadius: 20,
  padding: 16,
  display: 'grid',
  gridTemplateColumns: '74px 1fr',
  gap: 16,
  textAlign: 'left',
  cursor: 'pointer',
  color: darkMode ? '#f8fafc' : '#111827',
  boxShadow: '0 16px 34px rgba(239,68,68,0.18)',
},

campaignBadgeBox: {
  width: 66,
  height: 66,
  borderRadius: 20,
  background: 'linear-gradient(135deg, #991b1b, #ef4444)',
  color: '#ffffff',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 4,
  fontWeight: 900,
  boxShadow: '0 12px 28px rgba(239,68,68,0.32)',
},

campaignContentBox: {
  minWidth: 0,
},

campaignCardTopLine: {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  marginBottom: 8,
  flexWrap: 'wrap',
},

campaignSmallBadge: {
  padding: '5px 9px',
  borderRadius: 999,
  background: darkMode ? '#3b1116' : '#fee2e2',
  color: darkMode ? '#fb7185' : '#dc2626',
  fontSize: 10,
  fontWeight: 900,
},

selectedCampaignBadge: {
  padding: '5px 9px',
  borderRadius: 999,
  background: '#dc2626',
  color: '#ffffff',
  fontSize: 10,
  fontWeight: 900,
},

campaignCardTitle: {
  display: 'block',
  fontSize: 15,
  fontWeight: 900,
  marginBottom: 6,
},

campaignCardDesc: {
  margin: 0,
  fontSize: 12,
  lineHeight: 1.6,
  color: darkMode ? '#cbd5e1' : '#475569',
  fontWeight: 700,
},

campaignConditionModern: {
  display: 'inline-flex',
  marginTop: 10,
  padding: '7px 10px',
  borderRadius: 12,
  background: darkMode ? '#1f2026' : '#fff1f2',
  color: darkMode ? '#fca5a5' : '#b91c1c',
  fontSize: 10,
  fontWeight: 900,
},

campaignEditPanel: {
  marginTop: 20,
  padding: 20,
  borderRadius: 22,
  background: darkMode ? '#111114' : '#ffffff',
  border: darkMode ? '1px solid #332025' : '1px solid #fecdd3',
},

campaignEditHeader: {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: 16,
},

campaignEditTitle: {
  margin: 0,
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  fontSize: 15,
  fontWeight: 900,
  color: darkMode ? '#ffffff' : '#111827',
},

campaignEditSub: {
  margin: '6px 0 0',
  fontSize: 11,
  color: darkMode ? '#94a3b8' : '#64748b',
  fontWeight: 700,
},

campaignFormGrid: {
  display: 'grid',
  gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
  gap: 12,
},

campaignFormLabel: {
  display: 'flex',
  flexDirection: 'column',
  gap: 6,
  fontSize: 11,
  fontWeight: 900,
  color: darkMode ? '#cbd5e1' : '#475569',
},

campaignFormLabelFull: {
  gridColumn: '1 / -1',
  display: 'flex',
  flexDirection: 'column',
  gap: 6,
  fontSize: 11,
  fontWeight: 900,
  color: darkMode ? '#cbd5e1' : '#475569',
},

campaignInput: {
  height: 40,
  borderRadius: 12,
  border: darkMode ? '1px solid #332025' : '1px solid #fecdd3',
  background: darkMode ? '#1f2026' : '#fff7f8',
  color: darkMode ? '#ffffff' : '#111827',
  padding: '0 12px',
  outline: 'none',
  fontWeight: 800,
},

campaignTextarea: {
  minHeight: 74,
  borderRadius: 12,
  border: darkMode ? '1px solid #332025' : '1px solid #fecdd3',
  background: darkMode ? '#1f2026' : '#fff7f8',
  color: darkMode ? '#ffffff' : '#111827',
  padding: 12,
  outline: 'none',
  fontWeight: 700,
  resize: 'vertical',
},

mailTextarea: {
  minHeight: 150,
  borderRadius: 12,
  border: darkMode ? '1px solid #332025' : '1px solid #fecdd3',
  background: darkMode ? '#1f2026' : '#fff7f8',
  color: darkMode ? '#ffffff' : '#111827',
  padding: 12,
  outline: 'none',
  fontWeight: 700,
  resize: 'vertical',
  lineHeight: 1.6,
},

applyCampaignButton: {
  marginTop: 16,
  width: '100%',
  height: 44,
  borderRadius: 16,
  borderWidth: 0,
  background: 'linear-gradient(135deg, #7f1d1d, #ef4444)',
  color: '#ffffff',
  fontWeight: 900,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 10,
  cursor: 'pointer',
  boxShadow: '0 14px 32px rgba(239,68,68,0.32)',
},

segmentStoreGrid: {
  display: 'grid',
  gridTemplateColumns: '1fr 1.4fr',
  gap: 22,
  marginBottom: 22,
},

segmentHistoryList: {
  display: 'flex',
  flexDirection: 'column',
  gap: 12,
},

segmentHistoryItem: {
  display: 'flex',
  alignItems: 'center',
  gap: 12,
  padding: 14,
  borderRadius: 16,
  background: darkMode ? '#111114' : '#fff1f2',
  border: darkMode ? '1px solid #332025' : '1px solid #fecdd3',
},

segmentDot: {
  width: 12,
  height: 12,
  borderRadius: 999,
  background: 'linear-gradient(135deg, #991b1b, #ef4444)',
  boxShadow: '0 0 0 5px rgba(239,68,68,0.12)',
},

storeChartBox: {
  height: 290,
  borderRadius: 18,
  padding: 14,
  background: darkMode ? '#111114' : '#fff7f8',
  border: darkMode ? '1px solid #332025' : '1px solid #fecdd3',
},
});