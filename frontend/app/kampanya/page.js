'use client';

import React, { useEffect, useState } from 'react';
import {
  Plus,
  BarChart3,
  Zap,
  ChevronRight,
  ChevronLeft,
  Target,
  TrendingUp,
  Sparkles,
  Calendar,
  Layers,
  AlertCircle,
  BrainCircuit,
  LineChart,
  MessageSquare,
  CheckCircle2,
} from 'lucide-react';


import { useTheme } from '../context/ThemeContext';

const API_BASE = 'http://127.0.0.1:8000';

const makeCouponCode = () => `PROMO${Date.now().toString().slice(-6)}`;

const authHeaders = () => {
  const token =
    localStorage.getItem('token') ||
    localStorage.getItem('access_token') ||
    localStorage.getItem('crm_token');

  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
};

export default function KampanyaYonetimiPage() {
  const { isDarkMode } = useTheme();
  const darkMode = isDarkMode;
  const styles = getStyles(darkMode);

  const [activeTab, setActiveTab] = useState('dashboard');
  const [campaignStep, setCampaignStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [launchMessage, setLaunchMessage] = useState(null);
  const [showToast, setShowToast] = useState(false);
  

  const [predictionResult, setPredictionResult] = useState({
    aiComment: 'Henüz kampanya analizi yapılmadı.',
    aiSuggestion: 'Segment seçip AI strateji oluşturabilirsiniz.',
    expectedRevenue: 0,
    expectedConversion: '%--',
    recommendedCouponRate: '%--',
  });

const [formData, setFormData] = useState({
  name: '',
  targetGoal: 'Satışları Artır',
  segments: [],
  subject: '',
  body: '',
  couponRate: '',
  couponCode: makeCouponCode(),
  couponStartDate: '',
  couponEndDate: '',
  timing: 'now',
  predictedPerformance: null,
});

  const [campaignSummary, setCampaignSummary] = useState({
    active_campaigns: 0,
    coupon_usage: 0,
    conversion_rate: '%0',
    estimated_revenue: 0,
  });

  const [campaigns, setCampaigns] = useState([]);
  const [playbooks, setPlaybooks] = useState([]);
  const [segmentsList, setSegmentsList] = useState([]);

  const fetchSegments = async () => {
    const allSegments = [
      { id: 'Şampiyonlar', name: 'Şampiyonlar', icon: <Sparkles size={16} /> },
      { id: 'Sadık Müşteriler', name: 'Sadık Müşteriler', icon: <Target size={16} /> },
      { id: 'Potansiyel Sadıklar', name: 'Potansiyel Sadıklar', icon: <TrendingUp size={16} /> },
      { id: 'Yeni Müşteriler', name: 'Yeni Müşteriler', icon: <Zap size={16} /> },
      { id: 'Umut Vadedenler', name: 'Umut Vadedenler', icon: <LineChart size={16} /> },
      { id: 'İlgi Gerektirenler', name: 'İlgi Gerektirenler', icon: <AlertCircle size={16} /> },
      { id: 'Uyumak Üzere', name: 'Uyumak Üzere', icon: <Calendar size={16} /> },
      { id: 'Risk Altında', name: 'Risk Altında', icon: <AlertCircle size={16} /> },
      { id: 'Onları Kaybedemezsin', name: 'Onları Kaybedemezsin', icon: <BrainCircuit size={16} /> },
      { id: 'Kış Uykusunda', name: 'Kış Uykusunda', icon: <Layers size={16} /> },
      { id: 'Kayıp', name: 'Kayıp', icon: <MessageSquare size={16} /> },
    ];

    try {
      const res = await fetch(`${API_BASE}/segments`, {
        headers: authHeaders(),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.detail || 'Segmentler alınamadı.');
      }

      const backendSegments = data.segments || data.items || [];

      const formattedSegments = allSegments.map((defaultSeg) => {
        const matched = backendSegments.find((seg) => seg.segment === defaultSeg.name);

        return {
          ...defaultSeg,
          customer_count: matched?.musteri_sayisi || 0,
        };
      });

      setSegmentsList(formattedSegments);
    } catch (error) {
      console.error('Segment liste hatası:', error);

      setSegmentsList(
        allSegments.map((seg) => ({
          ...seg,
          customer_count: 0,
        }))
      );
    }
  };

  const generateSmartCampaign = async () => {
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/ai/campaign-insight`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          campaign_name: formData.name,
          target_goal: formData.targetGoal,
          segments: formData.segments,
        }),
      });

      const parsed = await res.json();

      if (!res.ok) {
        throw new Error(parsed.error || parsed.detail || 'AI kampanya önerisi alınamadı.');
      }

      const couponRate = parsed.couponRate || parsed.recommendedCouponRate || parsed.onerilen_kupon_orani || '15';
      const predictedConversion =
        parsed.predictedConversion || parsed.expectedConversion || parsed.tahmini_donusum || '%8.2';

      setFormData((prev) => ({
        ...prev,
        subject: parsed.subject || '',
        body: parsed.body || '',
        couponRate,
        couponCode: parsed.couponCode || prev.couponCode || makeCouponCode(),
        predictedPerformance: predictedConversion,
      }));

      setPredictionResult({
        aiComment:
          parsed.aiComment ||
          parsed.ai_yorum ||
          'Seçilen segmentler için kampanya yapılabilir görünüyor.',
        aiSuggestion:
          parsed.aiSuggestion ||
          parsed.ai_oneri ||
          parsed.recommendedAction ||
          'Daha iyi dönüşüm için segment bazlı kupon oranı önerilir.',
        expectedRevenue:
          parsed.expectedRevenue ||
          parsed.tahmini_kazanc ||
          parsed.estimated_revenue ||
          0,
        expectedConversion: predictedConversion,
        recommendedCouponRate: `%${String(couponRate).replace('%', '')}`,
      });
    } catch (error) {
      console.error('AI Error:', error);

      setFormData((prev) => ({
        ...prev,
        couponRate: '15',
        couponCode: prev.couponCode || makeCouponCode(),
        predictedPerformance: '%--',
      }));

      setPredictionResult({
        aiComment: 'AI analizi alınamadı.',
        aiSuggestion: 'Backend AI endpointini kontrol et. Manuel kampanya oluşturmaya devam edebilirsin.',
        expectedRevenue: 0,
        expectedConversion: '%--',
        recommendedCouponRate: '%15',
      });
    } finally {
      setLoading(false);
    }
  };



  const fetchCampaigns = async () => {
    try {
      const res = await fetch(`${API_BASE}/campaigns`, {
        headers: authHeaders(),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.detail || 'Kampanyalar alınamadı.');

      setCampaigns(data.items || []);
    } catch (error) {
      console.error('Kampanya liste hatası:', error);
    }
  };

  const saveCampaign = async () => {
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/campaigns`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          name: formData.name,
          target_goal: formData.targetGoal,
          segments: formData.segments,
          subject: formData.subject,
          body: formData.body,
          couponRate: formData.couponRate,
          couponCode: formData.couponCode,
          couponStartDate: formData.couponStartDate,
          couponEndDate: formData.couponEndDate,
          predictedPerformance: formData.predictedPerformance,
          timing: formData.timing,
          aiComment: predictionResult.aiComment,
          aiSuggestion: predictionResult.aiSuggestion,
          expectedRevenue: predictionResult.expectedRevenue,
          expectedConversion: predictionResult.expectedConversion,
          recommendedCouponRate: predictionResult.recommendedCouponRate,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.detail || 'Kampanya kaydedilemedi.');
      }

    if (data.kampanya_id) {
  const launchRes = await fetch(`${API_BASE}/campaigns/${data.kampanya_id}/launch`, {
    method: 'POST',
    headers: authHeaders(),
  });

  const launchData = await launchRes.json();

  if (!launchRes.ok) {
    throw new Error(
      launchData.detail ||
      launchData.message ||
      'Kampanya oluşturuldu ancak mail gönderimi başlatılamadı.'
    );
  }

  setLaunchMessage({
    type: 'success',
    text:
      launchData.message ||
      `Kampanya başlatıldı. ${launchData.sent_count || 0} müşteriye mail gönderimi başlatıldı.`,
  });

  setShowToast(true);

  setTimeout(() => {
    setShowToast(false);
  }, 4000);
}


    
      await fetchCampaigns();

      setActiveTab('dashboard');
      setCampaignStep(1);

      setFormData({
        name: '',
        targetGoal: 'Satışları Artır',
        segments: [],
        subject: '',
        body: '',
        couponRate: '',
        couponCode: makeCouponCode(),
        couponStartDate: '',
        couponEndDate: '',
        timing: 'now',
        predictedPerformance: null,
});
    } catch (error) {
      console.error('Kampanya kayıt hatası:', error);
      alert(error.message || 'Kampanya kaydedilemedi.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCampaigns();
    fetchSegments();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const toggleSegment = (id) => {
    setFormData((prev) => ({
      ...prev,
      segments: prev.segments.includes(id)
        ? prev.segments.filter((s) => s !== id)
        : [...prev.segments, id],
    }));
  };
  const toggleAllSegments = () => {
  setFormData((prev) => {
    const allIds = segmentsList.map((seg) => seg.id);
    const allSelected = allIds.length > 0 && allIds.every((id) => prev.segments.includes(id));

    return {
      ...prev,
      segments: allSelected ? [] : allIds,
    };
  });
};


const Dashboard = () => (
  <>
    <div style={styles.tableCard}>
      <div style={{ padding: 20 }}>
        <div style={styles.cardTitle}>
          <BarChart3 size={20} />
          Mevcut Uygulanan Kampanyalar
        </div>
      </div>

      <table style={styles.table}>
        <thead>
          <tr style={styles.tableHeadRow}>
            <th style={styles.th}>Kampanya Adı</th>
            <th style={styles.th}>Segment</th>
            <th style={styles.th}>Kupon</th>
            <th style={styles.th}>Durum</th>
          </tr>
        </thead>

        <tbody>
          {campaigns.length > 0 ? (
            campaigns.slice(0, 10).map((campaign) => (
              <tr key={campaign.kampanya_id} style={styles.tr}>
                <td style={styles.td}>
                  <b>{campaign.kampanya_adi || '-'}</b>
                </td>
                <td style={styles.td}>
                  <b>{campaign.hedef_segment || 'Genel Kitle'}</b>
                </td>

                <td style={styles.td}>
                  <span style={styles.code}>
                    {campaign.kupon_kodu || '-'}
                  </span>
                </td>

               

                <td style={styles.td}>
                  <span style={styles.statusBadge}>
                    {campaign.durum || 'taslak'}
                  </span>
                </td>
              </tr>
            ))
          ) : (
            <tr style={styles.tr}>
              <td style={styles.td} colSpan="4">
                Henüz kampanya bulunmuyor.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  </>
);



  const renderCreateCampaign = () => {
    const steps = ['Temel Bilgiler', 'Segment Seçimi', 'Kupon Bilgisi', 'Onay'];

    return (
      <div style={styles.createWrap}>
        <div style={styles.stepBox}>
          {steps.map((step, i) => (
            <div key={step} style={styles.stepItem}>
              <div
                style={{
                  ...styles.stepCircle,
                  ...(campaignStep > i + 1 ? styles.stepDone : {}),
                  ...(campaignStep === i + 1 ? styles.stepActive : {}),
                }}
              >
                {campaignStep > i + 1 ? <CheckCircle2 size={18} /> : i + 1}
              </div>
              <span style={styles.stepText}>{step}</span>
            </div>
          ))}
        </div>

        <div style={styles.formCard}>
          {campaignStep === 1 && (
            <div style={styles.formGroup}>
              <h2 style={styles.formTitle}>Kampanyayı Tanımlayın</h2>

              <div>
                <label style={styles.label}>Kampanya Adı</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  style={styles.input}
                  placeholder="Örn: Riskli Müşteri Geri Kazanım"
                />
              </div>

              <div>
                <label style={styles.label}>Ana Hedef</label>
                <input
                  list="targetGoalOptions"
                  name="targetGoal"
                  value={formData.targetGoal}
                  onChange={handleInputChange}
                  style={styles.input}
                  placeholder="Seçin veya elle yazın"
                />

                <datalist id="targetGoalOptions">
                  <option value="Satışları Artır" />
                  <option value="Churn Önle" />
                  <option value="Yeni Ürün Tanıtımı" />
                  <option value="Kayıp Müşteri Geri Kazan" />
                </datalist>
              </div>
            </div>
          )}

          {campaignStep === 2 && (
            <div style={styles.formGroup}>
              <h2 style={styles.formTitle}>Hedef Segmenti Belirleyin</h2>
              <button
                type="button"
                onClick={toggleAllSegments}
                style={styles.secondaryButton}
              >
                <CheckCircle2 size={16} />
                Tümünü Seç
              </button>

              <div style={styles.segmentGrid}>
                {segmentsList.length > 0 ? (
                  segmentsList.map((seg) => {
                    const selected = formData.segments.includes(seg.id);

                    return (
                      <div
                        key={seg.id}
                        onClick={() => toggleSegment(seg.id)}
                        style={{
                          ...styles.segmentCard,
                          ...(selected ? styles.segmentCardActive : {}),
                        }}
                      >
                        <div style={styles.segmentLeft}>
                          <div style={styles.segmentIcon}>{seg.icon}</div>

                          <div>
                            <b>{seg.name}</b>
                            <p>{seg.customer_count} Müşteri</p>
                          </div>
                        </div>

                        <input type="checkbox" checked={selected} readOnly style={styles.checkbox} />
                      </div>
                    );
                  })
                ) : (
                  <div style={styles.segmentCard}>
                    <div>
                      <b>Segment bulunamadı</b>
                      <p>Backend /segments endpointini kontrol et.</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

{campaignStep === 3 && (
  <div style={styles.formGroup}>
    <div style={styles.formHeader}>
      <div>
        <h2 style={styles.formTitle}>AI Kampanya Önerisi</h2>

        <p style={styles.formSub}>
          Seçilen ana hedef ve segmentlere göre AI kampanya önerisi oluşturulur.
        </p>
      </div>

      <button
        style={styles.primaryButton}
        onClick={generateSmartCampaign}
        disabled={loading}
      >
        <BrainCircuit size={17} />
        {loading ? 'AI Kampanya Öneriyor...' : 'AI ile Kampanya Öner'}
      </button>
    </div>

    <div style={styles.aiFormGrid}>
      <div style={styles.formGroup}>
        <div style={styles.twoCol}>
          <div>
            <label style={styles.label}>Kupon Oranı (%)</label>

            <input
              type="number"
              name="couponRate"
              value={formData.couponRate}
              onChange={handleInputChange}
              style={styles.input}
            />
          </div>

          <div>
            <label style={styles.label}>Kupon Kodu</label>

            <input
              type="text"
              name="couponCode"
              value={formData.couponCode}
              onChange={handleInputChange}
              style={styles.input}
            />
          </div>
        </div>

        <div style={styles.twoCol}>
          <div>
            <label style={styles.label}>Kupon Başlangıç Tarihi</label>

            <input
              type="date"
              name="couponStartDate"
              value={formData.couponStartDate}
              onChange={handleInputChange}
              style={styles.input}
            />
          </div>

          <div>
            <label style={styles.label}>Kupon Bitiş Tarihi</label>

            <input
              type="date"
              name="couponEndDate"
              value={formData.couponEndDate}
              onChange={handleInputChange}
              style={styles.input}
            />
          </div>
        </div>

        <div>
          <label style={styles.label}>E-posta Konusu</label>

          <input
            type="text"
            name="subject"
            value={formData.subject}
            onChange={handleInputChange}
            style={styles.input}
            placeholder="AI önerisi burada oluşacak"
          />
        </div>

        <div>
          <label style={styles.label}>Kampanya Mesajı</label>

          <textarea
            name="body"
            value={formData.body}
            onChange={handleInputChange}
            style={{
              ...styles.input,
              minHeight: 140,
              paddingTop: 14,
              resize: 'vertical',
              lineHeight: 1.6,
            }}
            placeholder="AI kampanya mesajı burada oluşacak"
          />
        </div>

    

      
      </div>

      <div style={styles.summaryCard}>
        <h3>Kampanya Önerisi</h3>

        <div style={styles.summaryRow}>
          <span>Ana Hedef:</span>
          <b>{formData.targetGoal || '-'}</b>
        </div>

        <div style={styles.summaryRow}>
          <span>Segment:</span>
          <b>{formData.segments.length} Segment</b>
        </div>

        <div style={styles.summaryRow}>
          <span>Önerilen Kupon:</span>
          <b>{predictionResult.recommendedCouponRate}</b>
        </div>

        
      </div>
    </div>
  </div>
)}

          {campaignStep === 4 && (
            <div style={styles.formGroup}>
              <h2 style={styles.formTitle}>Onay & Kampanya Oluşturma</h2>

              <div style={styles.finalGrid}>
                <div style={styles.formGroup}>
                  <div style={styles.innerCard}>
                    <div style={styles.cardTitle}>
                      <Calendar size={20} />
                      Kampanya Zamanı
                    </div>

                   <div>
                      <button
                        onClick={() => setFormData((p) => ({ ...p, timing: 'now' }))}
                        style={{
                          ...styles.optionButton,
                          ...styles.optionActive,
                          width: '100%',
                        }}
                      >
                        Hemen Başlat
                      </button>
                    </div>
          </div>
                </div>

                <div style={styles.summaryCard}>
                  <h3>Kampanya Özeti</h3>

                  <div style={styles.summaryRow}>
                    <span>Ad:</span>
                    <b>{formData.name || '-'}</b>
                  </div>

                  <div style={styles.summaryRow}>
                    <span>Hedef:</span>
                    <b>{formData.targetGoal}</b>
                  </div>

                  <div style={styles.summaryRow}>
                    <span>Kitle:</span>
                    <b>{formData.segments.length} Segment</b>
                  </div>

                 

    
                </div>
              </div>
            </div>
          )}
        </div>

        <div style={styles.navButtons}>
          <button
            onClick={() => campaignStep > 1 && setCampaignStep(campaignStep - 1)}
            style={{
              ...styles.secondaryButton,
              opacity: campaignStep === 1 ? 0 : 1,
              pointerEvents: campaignStep === 1 ? 'none' : 'auto',
            }}
          >
            <ChevronLeft size={18} />
            Geri
          </button>

          {campaignStep < 4 ? (
            <button style={styles.primaryButton} onClick={() => setCampaignStep(campaignStep + 1)}>
              Devam Et
              <ChevronRight size={18} />
            </button>
          ) : (
            <button style={styles.primaryButton} onClick={saveCampaign} disabled={loading}>
              {loading ? 'Kaydediliyor...' : 'Kampanyayı Oluştur'}
              <Zap size={18} />
            </button>
          )}
        </div>
      </div>
    );
  };

  const renderPlaybooks = () => {
    const fallbackPlaybooks = [
      {
        id: 1,
        title: 'Akıllı Churn Önleme',
        desc: 'Riskli müşterilere otomatik indirim önerisi.',
        rate: '%28',
        icon: <AlertCircle />,
      },
      {
        id: 2,
        title: 'VIP Yükseltme',
        desc: 'Sadık müşterileri üst segmente taşıma stratejisi.',
        rate: '%18',
        icon: <Sparkles />,
      },
      {
        id: 3,
        title: 'Kayıp Müşteri Geri Kazanım',
        desc: 'Uzun süredir alışveriş yapmayan müşterilere kampanya önerisi.',
        rate: '%42',
        icon: <Layers />,
      },
    ];

    const list = playbooks.length > 0 ? playbooks : fallbackPlaybooks;

    return (
      <div style={styles.playbookGrid}>
        {list.map((item, index) => (
          <div key={item.id || item.playbook_id || index} style={styles.playbookCard}>
            <div style={styles.playIcon}>{item.icon || <Layers />}</div>
            <h3>{item.title || item.baslik || 'Kampanya Senaryosu'}</h3>
            <p>{item.desc || item.aciklama || '-'}</p>

            <div style={styles.playFooter}>
              <b>Tahmini Verim: {item.rate || item.tahmini_verim || '%--'}</b>
              <button onClick={() => setActiveTab('create')}>
                <Plus size={18} />
              </button>
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div style={styles.page}>
      {showToast && launchMessage && (
  <div
    style={{
      position: 'fixed',
      top: 24,
      right: 24,
      zIndex: 999999,
      minWidth: 340,
      maxWidth: 420,
      padding: '16px 18px',
      borderRadius: 18,
      backdropFilter: 'blur(14px)',
      background: 'rgba(220,38,38,0.18)',
       border: '1px solid rgba(220,38,38,0.45)',
      color: '#fff',
      boxShadow: '0 18px 50px rgba(0,0,0,0.35)',
      animation: 'slideIn 0.35s ease',
    }}
  >
    <div
      style={{
        fontWeight: 800,
        marginBottom: 4,
        fontSize: 14,
      }}
    >
      {launchMessage.type === 'success'
        ? 'Kampanya Başlatıldı'
        : 'Bilgilendirme'}
    </div>

    <div
      style={{
        fontSize: 13,
        lineHeight: 1.5,
        opacity: 0.92,
      }}
    >
      {launchMessage.text}
    </div>
  </div>
)}
    

      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>
            Kampanya <span style={styles.redText}>Yönetimi</span>
          </h1>
          
        </div>
      </div>

      <div style={styles.tabBox}>
        <button
          style={{ ...styles.tabButton, ...(activeTab === 'dashboard' ? styles.tabButtonActive : {}) }}
          onClick={() => setActiveTab('dashboard')}
        >
          <BarChart3 size={17} />
          Kampanyalar
        </button>

        <button
          style={{ ...styles.tabButton, ...(activeTab === 'create' ? styles.tabButtonActive : {}) }}
          onClick={() => {
            setActiveTab('create');
            setCampaignStep(1);
          }}
        >
          <Plus size={17} />
          Yeni Kampanya
        </button>

      </div>
      

      {activeTab === 'dashboard' && <Dashboard />}
      {activeTab === 'create' && renderCreateCampaign()}
      {activeTab === 'playbooks' && renderPlaybooks()}

      {loading && (
        <div style={styles.loadingOverlay}>
          <div style={styles.loadingBox}>
            <div style={styles.loadingIcon}>
              <BrainCircuit size={34} />
            </div>
            <h2>Veriler İşleniyor</h2>
            <p>AI motoru kampanya tahmini oluşturuyor...</p>
          </div>
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
      ? 'radial-gradient(circle at top left, #1f0f16 0%, #050506 34%, #050506 100%)'
      : 'linear-gradient(135deg, #fff7f8 0%, #f8fafc 45%, #ffffff 100%)',
    color: darkMode ? '#f8fafc' : '#0f172a',
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
    minHeight: 42,
    padding: '0 18px',
    borderRadius: 18,
    borderWidth: 0,
    background: 'linear-gradient(135deg, #991b1b, #ef4444)',
    color: '#ffffff',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    cursor: 'pointer',
    fontWeight: 900,
    boxShadow: '0 12px 30px rgba(239,68,68,0.38)',
  },

  secondaryButton: {
    minHeight: 42,
    padding: '0 18px',
    borderRadius: 18,
    borderWidth: 0,
    background: darkMode ? '#222329' : '#fff1f2',
    color: darkMode ? '#f8fafc' : '#be123c',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    cursor: 'pointer',
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

  aiBanner: {
    background: darkMode
      ? 'linear-gradient(145deg, #151519, #251116)'
      : 'linear-gradient(145deg, #ffffff, #fff1f2)',
    border: darkMode ? '1px solid #332025' : '1px solid #fecdd3',
    borderRadius: 22,
    padding: 24,
    display: 'grid',
    gridTemplateColumns: '1fr 1.6fr',
    gap: 22,
    marginBottom: 24,
    boxShadow: darkMode
      ? '0 18px 42px rgba(0,0,0,0.34)'
      : '0 18px 42px rgba(239,68,68,0.08)',
  },

  aiLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: 18,
  },

  aiIcon: {
    width: 64,
    height: 64,
    borderRadius: 20,
    background: 'linear-gradient(135deg, #991b1b, #ef4444)',
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 14px 30px rgba(239,68,68,0.36)',
  },

  bannerTitle: {
    margin: 0,
    fontSize: 21,
    fontWeight: 900,
    color: darkMode ? '#ffffff' : '#111827',
  },

  bannerText: {
    marginTop: 7,
    fontSize: 13,
    lineHeight: 1.6,
    color: darkMode ? '#cbd5e1' : '#64748b',
  },

  insightGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: 14,
  },

  insightCard: {
    background: darkMode ? '#111114' : '#fff7f8',
    border: darkMode ? '1px solid #332025' : '1px solid #fecdd3',
    borderRadius: 18,
    padding: 18,
    display: 'flex',
    flexDirection: 'column',
    gap: 7,
    color: darkMode ? '#f8fafc' : '#111827',
  },

  insightLabel: {
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 1,
    color: darkMode ? '#94a3b8' : '#64748b',
    fontWeight: 900,
  },

  redInfo: {
    color: darkMode ? '#fb7185' : '#dc2626',
  },

  greenInfo: {
    color: '#22c55e',
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

  dashboardGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1.5fr',
    gap: 22,
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
    marginBottom: 24,
  },

  barChart: {
    height: 210,
    display: 'flex',
    alignItems: 'end',
    gap: 14,
  },

  barItem: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    flexDirection: 'column',
    gap: 9,
  },

  barValue: {
    fontSize: 10,
    color: darkMode ? '#fb7185' : '#dc2626',
    fontWeight: 900,
  },

  bar: (height) => ({
    width: '100%',
    height: `${height}%`,
    borderRadius: '14px 14px 4px 4px',
    background:
      height > 70
        ? 'linear-gradient(180deg, #ef4444, #7f1d1d)'
        : 'linear-gradient(180deg, #991b1b, #3b1116)',
  }),

  barLabel: {
    fontSize: 10,
    color: darkMode ? '#94a3b8' : '#64748b',
    fontWeight: 900,
  },

  tableCard: {
    background: darkMode
      ? 'linear-gradient(145deg, #151519, #1f2026)'
      : '#ffffff',
    border: darkMode ? '1px solid #332025' : '1px solid #fecdd3',
    borderRadius: 22,
    overflow: 'hidden',
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
  },

  tr: {
    borderTop: darkMode ? '1px solid #2b2c35' : '1px solid #fce7f3',
  },

  td: {
    padding: '17px 16px',
    color: darkMode ? '#e2e8f0' : '#111827',
  },

  code: {
    display: 'inline-flex',
    padding: '6px 10px',
    borderRadius: 999,
    background: darkMode ? '#222329' : '#fff1f2',
    color: darkMode ? '#fb7185' : '#dc2626',
    fontWeight: 900,
    fontSize: 11,
  },

  statusBadge: {
    display: 'inline-flex',
    padding: '6px 10px',
    borderRadius: 999,
    background: 'linear-gradient(135deg, #dcfce7, #bbf7d0)',
    color: '#16a34a',
    fontWeight: 900,
    fontSize: 10,
  },

  createWrap: {
    maxWidth: 1050,
    margin: '0 auto',
  },

  stepBox: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: 14,
    marginBottom: 22,
  },

  stepItem: {
    background: darkMode
      ? 'linear-gradient(145deg, #151519, #1f2026)'
      : 'linear-gradient(145deg, #ffffff, #fff7f8)',
    border: darkMode ? '1px solid #332025' : '1px solid #fecdd3',
    borderRadius: 18,
    padding: 14,
    display: 'flex',
    alignItems: 'center',
    gap: 10,
  },

  stepCircle: {
    width: 34,
    height: 34,
    borderRadius: 13,
    background: darkMode ? '#222329' : '#fff1f2',
    color: darkMode ? '#94a3b8' : '#64748b',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 900,
  },

  stepActive: {
    background: 'linear-gradient(135deg, #991b1b, #ef4444)',
    color: '#fff',
  },

  stepDone: {
    background: 'linear-gradient(135deg, #991b1b, #ef4444)',
    color: '#fff',
  },

  stepText: {
    fontSize: 12,
    fontWeight: 900,
    color: darkMode ? '#cbd5e1' : '#475569',
  },

  formCard: {
    background: darkMode
      ? 'linear-gradient(145deg, #151519, #1f2026)'
      : '#ffffff',
    border: darkMode ? '1px solid #332025' : '1px solid #fecdd3',
    borderRadius: 22,
    padding: 26,
    minHeight: 420,
  },

  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: 18,
  },

  formTitle: {
    margin: 0,
    fontSize: 24,
    fontWeight: 900,
    color: darkMode ? '#ffffff' : '#111827',
  },

  formSub: {
    marginTop: 6,
    fontSize: 13,
    color: darkMode ? '#cbd5e1' : '#64748b',
  },

  formHeader: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 16,
  },

  label: {
    display: 'block',
    marginBottom: 8,
    fontSize: 12,
    color: darkMode ? '#cbd5e1' : '#64748b',
    fontWeight: 900,
  },

  input: {
    width: '100%',
    boxSizing: 'border-box',
    height: 44,
    borderRadius: 12,
    border: darkMode ? '1px solid #3f3f46' : '1px solid #fecdd3',
    background: darkMode ? '#222329' : '#fff1f2',
    color: darkMode ? '#f8fafc' : '#111827',
    padding: '0 14px',
    outline: 'none',
    fontWeight: 700,
  },

  segmentGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
    gap: 16,
  },

  segmentCard: {
    border: darkMode ? '1px solid #332025' : '1px solid #fecdd3',
    background: darkMode ? '#111114' : '#fff7f8',
    borderRadius: 18,
    padding: 18,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    cursor: 'pointer',
  },

  segmentCardActive: {
    border: '1px solid #ef4444',
    boxShadow: '0 12px 28px rgba(239,68,68,0.20)',
  },

  segmentLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },

  segmentIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    background: 'linear-gradient(135deg, #fee2e2, #fecaca)',
    color: '#dc2626',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },

  checkbox: {
    accentColor: '#dc2626',
  },

  aiFormGrid: {
    display: 'grid',
    gridTemplateColumns: '1.1fr .9fr',
    gap: 24,
  },

  twoCol: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 14,
  },

  predictionBox: {
    background: darkMode ? 'rgba(239,68,68,0.08)' : '#fee2e2',
    border: darkMode ? '1px solid #7f1d1d' : '1px solid #fecaca',
    color: darkMode ? '#fb7185' : '#991b1b',
    borderRadius: 18,
    padding: 18,
    display: 'flex',
    alignItems: 'center',
    gap: 14,
  },

  previewCard: {
    background: darkMode ? '#111114' : '#fff7f8',
    border: darkMode ? '1px solid #332025' : '1px solid #fecdd3',
    borderRadius: 22,
    padding: 22,
    color: darkMode ? '#f8fafc' : '#111827',
  },

  previewHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    fontWeight: 900,
    color: darkMode ? '#fb7185' : '#dc2626',
    marginBottom: 16,
  },

  previewBanner: {
    height: 95,
    borderRadius: 18,
    background: darkMode
      ? 'linear-gradient(135deg, #20212a, #251820)'
      : 'linear-gradient(135deg, #fee2e2, #ffffff)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: darkMode ? '#94a3b8' : '#64748b',
    marginBottom: 16,
    fontWeight: 900,
  },

  couponBox: {
    border: '2px dashed #ef4444',
    borderRadius: 18,
    padding: 18,
    textAlign: 'center',
    marginTop: 18,
  },

  previewButton: {
    width: '100%',
    height: 42,
    border: 0,
    borderRadius: 14,
    marginTop: 16,
    background: 'linear-gradient(135deg, #991b1b, #ef4444)',
    color: '#fff',
    fontWeight: 900,
  },

  finalGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 22,
  },

  innerCard: {
    background: darkMode ? '#111114' : '#fff7f8',
    border: darkMode ? '1px solid #332025' : '1px solid #fecdd3',
    borderRadius: 18,
    padding: 20,
  },

  optionButton: {
    height: 42,
    border: 0,
    borderRadius: 14,
    background: darkMode ? '#222329' : '#fff1f2',
    color: darkMode ? '#cbd5e1' : '#64748b',
    fontWeight: 900,
    cursor: 'pointer',
  },

  optionActive: {
    background: 'linear-gradient(135deg, #991b1b, #ef4444)',
    color: '#fff',
  },

  channelRow: {
    display: 'flex',
    gap: 18,
    flexWrap: 'wrap',
  },

  channelItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 7,
    fontWeight: 800,
    color: darkMode ? '#cbd5e1' : '#64748b',
  },

  summaryCard: {
    background: darkMode
      ? 'linear-gradient(145deg, #151519, #251116)'
      : 'linear-gradient(145deg, #ffffff, #fff1f2)',
    border: darkMode ? '1px solid #332025' : '1px solid #fecdd3',
    borderRadius: 22,
    padding: 24,
  },

  summaryRow: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: 14,
    color: darkMode ? '#cbd5e1' : '#64748b',
  },

  summaryFinal: {
    display: 'flex',
    justifyContent: 'space-between',
    borderTop: darkMode ? '1px solid #332025' : '1px solid #fecdd3',
    paddingTop: 16,
    marginTop: 16,
    color: darkMode ? '#fb7185' : '#dc2626',
    fontWeight: 900,
  },

  navButtons: {
    display: 'flex',
    justifyContent: 'space-between',
    marginTop: 24,
  },

  playbookGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: 22,
  },

  playbookCard: {
    background: darkMode
      ? 'linear-gradient(145deg, #151519, #1f2026)'
      : '#ffffff',
    border: darkMode ? '1px solid #332025' : '1px solid #fecdd3',
    borderRadius: 22,
    padding: 24,
  },

  playIcon: {
    width: 54,
    height: 54,
    borderRadius: 16,
    background: 'linear-gradient(135deg, #fee2e2, #fecaca)',
    color: '#dc2626',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },

  playFooter: {
    borderTop: darkMode ? '1px solid #332025' : '1px solid #fecdd3',
    marginTop: 18,
    paddingTop: 16,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    color: darkMode ? '#fb7185' : '#dc2626',
  },

  loadingOverlay: {
    position: 'fixed',
    inset: 0,
    zIndex: 99999,
    background: 'rgba(0,0,0,0.76)',
    backdropFilter: 'blur(8px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },

  loadingBox: {
    width: 360,
    background: darkMode
      ? 'linear-gradient(145deg, #151519, #251116)'
      : '#ffffff',
    border: darkMode ? '1px solid #7f1d1d' : '1px solid #fecaca',
    borderRadius: 28,
    padding: 34,
    textAlign: 'center',
    boxShadow: '0 24px 70px rgba(239,68,68,0.30)',
  },

  loadingIcon: {
    width: 70,
    height: 70,
    borderRadius: 22,
    background: 'linear-gradient(135deg, #991b1b, #ef4444)',
    color: '#ffffff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 18px',
  },
});