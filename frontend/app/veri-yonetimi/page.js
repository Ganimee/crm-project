'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  Upload,
  Download,
  FileText,
  Database,
  AlertCircle,
  CheckCircle2,
  BarChart3,
  ArrowUpRight,
  RefreshCw,
  Zap,
  ShieldCheck,
  FileSpreadsheet,
  History,
  ExternalLink,
  XCircle,
  Info,
  FileWarning,
} from 'lucide-react';

import { useTheme } from '../context/ThemeContext';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

export default function VeriYonetimiPage() {
  const { isDarkMode } = useTheme();
  const darkMode = isDarkMode;

  const [activeTab, setActiveTab] = useState('import');
  const [selectedFile, setSelectedFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadResult, setUploadResult] = useState(null);

  const [reportData, setReportData] = useState(null);
  const [isReportLoading, setIsReportLoading] = useState(false);
  const [reportError, setReportError] = useState('');

  const [batchHistory, setBatchHistory] = useState([]);
  const [isBatchLoading, setIsBatchLoading] = useState(false);
  const [batchError, setBatchError] = useState('');
  const [qualityMode, setQualityMode] = useState('summary');
  const [selectedQualityBatchId, setSelectedQualityBatchId] = useState('');
  const [isQualityLoading, setIsQualityLoading] = useState(false);
  const [qualityError, setQualityError] = useState('');

  const colors = getColors(darkMode);

  const getToken = () => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('token') || localStorage.getItem('access_token');
  };

  const formatDate = (value) => {
    if (!value) return '-';

    try {
      return new Date(value).toLocaleString('tr-TR');
    } catch {
      return String(value);
    }
  };

  const calculateBatchQuality = (batch) => {
    const total = Number(batch.toplam_kayit || 0);
    const error = Number(batch.hatali_kayit || 0);

    if (total === 0) return 0;

    const score = Math.round(100 - (error / total) * 100);
    return Math.max(0, Math.min(100, score));
  };

  const getBatchStatus = (batch) => {
    const total = Number(batch.toplam_kayit || 0);
    const error = Number(batch.hatali_kayit || 0);
    const pending = Number(batch.pending_kayit || 0);
    const cleaned = Number(batch.cleaned_kayit || 0);
    const processed = Number(batch.processed_kayit || 0);

    if (error > 0) return 'Uyarılı';
    if (processed > 0 && processed >= total) return 'Tamamlandı';
    if (cleaned > 0) return 'Temizlendi';
    if (pending > 0) return 'Bekliyor';
    return 'Tamamlandı';
  };

  const fetchBatchHistory = async () => {
  try {
    setIsBatchLoading(true);
    setBatchError('');

    const token = getToken();

    const response = await fetch(`${API_BASE_URL}/import/batches`, {
      method: 'GET',
      headers: token
        ? {
            Authorization: `Bearer ${token}`,
          }
        : {},
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.detail || data.message || 'Batch geçmişi alınamadı.');
    }

    console.log("BATCH DATA:", data);

    const list = Array.isArray(data)
      ? data
      : data.items || data.data || data.batches || data.results || [];

    setBatchHistory(list);

  } catch (error) {
    setBatchError(error.message || 'Batch geçmişi alınamadı.');
    setBatchHistory([]);
  } finally {
    setIsBatchLoading(false);
  }
};
  useEffect(() => {
    fetchBatchHistory();
    fetchQualityData('summary', '');
  }, []);

const fetchQualityData = async (mode = qualityMode, batchId = selectedQualityBatchId) => {
  try {
    setIsQualityLoading(true);
    setQualityError('');

    const token = getToken();

    const url =
      mode === 'batch' && batchId
        ? `${API_BASE_URL}/import/batches/${batchId}/quality`
        : `${API_BASE_URL}/import/quality/summary`;

    const response = await fetch(url, {
      method: 'GET',
      headers: token
        ? {
            Authorization: `Bearer ${token}`,
          }
        : {},
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.detail || data.message || 'Kalite analizi alınamadı.');
    }

    setUploadResult(data);
  } catch (error) {
    setQualityError(error.message || 'Kalite analizi alınamadı.');
  } finally {
    setIsQualityLoading(false);
  }
};

const handleGenerateReport = async () => {
  try {
    setIsReportLoading(true);
    setReportError('');

    const token = getToken();

    const url =
      qualityMode === 'batch' && selectedQualityBatchId
        ? `${API_BASE_URL}/import/batches/${selectedQualityBatchId}/quality`
        : `${API_BASE_URL}/import/quality/summary`;

    const response = await fetch(url, {
      method: 'GET',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.detail || 'Kalite raporu oluşturulamadı.');
    }

    setReportData(data);
  } catch (error) {
    setReportError(error.message || 'Kalite raporu oluşturulamadı.');
  } finally {
    setIsReportLoading(false);
  }
};


  const qualityDimensions = useMemo(() => {
    const score = uploadResult?.quality_score ?? 91;

    return [
      {
        id: 'completeness',
        name: 'Tamlık',
        score: uploadResult?.completeness_score ?? 86,
        color: '#2563eb',
        bg: darkMode ? '#172554' : '#dbeafe',
        desc: 'Eksik müşteri ve sipariş alanı analizi',
      },
      {
        id: 'validity',
        name: 'Geçerlilik',
        score: uploadResult?.validity_score ?? 90,
        color: '#dc2626',
        bg: darkMode ? '#3b1116' : '#fee2e2',
        desc: 'Format ve zorunlu alan kontrolü',
      },
      {
        id: 'consistency',
        name: 'Tutarlılık',
        score: uploadResult?.consistency_score ?? 84,
        color: '#ca8a04',
        bg: darkMode ? '#422006' : '#fef3c7',
        desc: 'Belge tipi, tarih ve tutar uyumu',
      },
      {
        id: 'uniqueness',
        name: 'Tekillik',
        score: uploadResult?.uniqueness_score ?? 95,
        color: '#9333ea',
        bg: darkMode ? '#2e1065' : '#f3e8ff',
        desc: 'Mükerrer müşteri ve fatura kontrolü',
      },
      {
        id: 'accuracy',
        name: 'Doğruluk',
        score: uploadResult?.accuracy_score ?? 88,
        color: '#16a34a',
        bg: darkMode ? '#052e16' : '#dcfce7',
        desc: 'CRM referans verileriyle uyum',
      },
      {
        id: 'global',
        name: 'Genel Skor',
        score,
        color: score >= 80 ? '#16a34a' : score >= 60 ? '#ca8a04' : '#dc2626',
        bg:
          score >= 80
            ? darkMode
              ? '#052e16'
              : '#dcfce7'
            : score >= 60
            ? darkMode
              ? '#422006'
              : '#fef3c7'
            : darkMode
            ? '#3b1116'
            : '#fee2e2',
        desc: 'Toplam veri kalite puanı',
      },
    ];
  }, [uploadResult, darkMode]);

  const errorLogs = useMemo(() => {
    const critical = uploadResult?.critical_errors || [];
    const warnings = uploadResult?.warnings || [];

    const criticalRows = critical.map((item, index) => ({
      id: `critical-${index}`,
      type: 'Kritik',
      dimension: 'Geçerlilik',
      field: item.field || item.alan || 'CRM Alanı',
      message: item.message || item.mesaj || String(item),
      value: item.value || item.deger || '-',
      impact: '-20%',
    }));

    const warningRows = warnings.map((item, index) => ({
      id: `warning-${index}`,
      type: 'Uyarı',
      dimension: 'Tamlık',
      field: item.field || item.alan || 'CRM Alanı',
      message: item.message || item.mesaj || String(item),
      value: item.value || item.deger || '-',
      impact: '-3%',
    }));

    if (criticalRows.length || warningRows.length) {
      return [...criticalRows, ...warningRows];
    }

    return [
      {
        id: 1,
        type: 'Uyarı',
        dimension: 'Tamlık',
        field: 'MUSTERI_MAIL_ADRESI',
        message: 'Bazı kayıtlarda e-posta eksik olabilir',
        value: 'null',
        impact: '-3%',
      },
      {
        id: 2,
        type: 'Uyarı',
        dimension: 'Tamlık',
        field: 'MUSTERI_GSM_NO',
        message: 'Telefon bilgisi olmayan müşteriler bulunabilir',
        value: 'null',
        impact: '-2%',
      },
    ];
  }, [uploadResult]);

  const criticalRules = [
    'MUSTERI_KODU boş olamaz',
    'FATURA_TARIHI boş veya hatalı formatta olamaz',
    'FATURA_TUTARI boş, negatif veya sayıya çevrilemez olamaz',
    'FATURA_NUMARASI boş olamaz',
    'BELGE_TIPI sadece 1 veya 2 olabilir',
    'SIPARIS_DETAY boş olamaz',
  ];

  const warningRules = [
    'MUSTERI_MAIL_ADRESI boş olabilir ama uyarı oluşturur',
    'MUSTERI_GSM_NO boş olabilir ama uyarı oluşturur',
    'MUSTERI_ADI_SOYADI eksikse uyarı oluşturur',
    'SATIS_YERI eksikse Bilinmeyen Şube atanabilir',
    'Telefon veya e-posta formatı bozuksa kalite skoru düşer',
  ];

  const normalizeBackendResponse = (data) => {
    const status = data.status || data.durum || data.upload_status || data.import_status || 'completed';

    const criticalErrors =
      data.critical_errors || data.kritik_hatalar || data.errors || data.hatalar || [];

    const warnings = data.warnings || data.uyarilar || data.warning_messages || [];

    const qualityScore =
      data.quality_score ??
      data.veri_kalite_skoru ??
      data.score ??
      (criticalErrors.length > 0 ? 45 : warnings.length > 0 ? 82 : 96);

    let normalizedStatus = status;

    if (
      status === 'rejected' ||
      status === 'Reddedildi' ||
      status === 'error' ||
      status === 'failed' ||
      criticalErrors.length > 0
    ) {
      normalizedStatus = 'rejected';
    } else if (
      status === 'completed_with_warnings' ||
      status === 'warning' ||
      status === 'Uyarılı' ||
      warnings.length > 0
    ) {
      normalizedStatus = 'completed_with_warnings';
    } else {
      normalizedStatus = 'completed';
    }

    return {
      status: normalizedStatus,
      message:
        data.message ||
        data.mesaj ||
        (normalizedStatus === 'rejected'
          ? 'Kritik veri hataları nedeniyle yükleme reddedildi.'
          : normalizedStatus === 'completed_with_warnings'
          ? 'Veri yüklendi fakat bazı küçük uyarılar oluştu.'
          : 'Veri başarıyla yüklendi.'),
      batch_id: data.batch_id || data.batchId || data.batch || null,
      inserted_count: data.inserted_count || data.imported || data.eklenen_kayit || data.kayit_sayisi || 0,
      rejected_count: data.rejected_count || criticalErrors.length,
      warning_count: data.warning_count || data.atlanan_kayit || warnings.length,
      quality_score: qualityScore,
      critical_errors: criticalErrors,
      warnings,
      completeness_score: data.completeness_score,
      validity_score: data.validity_score,
      consistency_score: data.consistency_score,
      uniqueness_score: data.uniqueness_score,
      accuracy_score: data.accuracy_score,
    };
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];

    if (!file) return;

    const allowedExtensions = ['csv', 'json', 'xlsx'];
    const extension = file.name.split('.').pop()?.toLowerCase();

    if (!allowedExtensions.includes(extension)) {
      setUploadResult({
        status: 'rejected',
        message: 'Sadece CSV, JSON veya XLSX dosyası yükleyebilirsin.',
        quality_score: 0,
        critical_errors: [
          {
            field: 'DOSYA_TIPI',
            message: 'Desteklenmeyen dosya formatı',
            value: extension || 'bilinmiyor',
          },
        ],
        warnings: [],
      });
      setSelectedFile(null);
      return;
    }

    setSelectedFile(file);
    setUploadResult(null);
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setUploadResult({
        status: 'rejected',
        message: 'Lütfen önce bir dosya seç.',
        quality_score: 0,
        critical_errors: [
          {
            field: 'DOSYA',
            message: 'Yüklenecek dosya seçilmedi',
            value: '-',
          },
        ],
        warnings: [],
      });
      return;
    }

    try {
      setIsUploading(true);
      setUploadProgress(15);
      setUploadResult(null);

      const token = getToken();

      const formData = new FormData();
      formData.append('file', selectedFile);

      const progressTimer = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev >= 88) return prev;
          return prev + 8;
        });
      }, 180);

      const response = await fetch(`${API_BASE_URL}/import`, {
        method: 'POST',
        headers: token
          ? {
              Authorization: `Bearer ${token}`,
            }
          : {},
        body: formData,
      });

      clearInterval(progressTimer);
      setUploadProgress(100);

      let data = null;

      try {
        data = await response.json();
      } catch {
        data = {};
      }

      if (!response.ok) {
        const errorData = normalizeBackendResponse({
          ...data,
          status: 'rejected',
          message:
            data.detail ||
            data.message ||
            'Backend kritik hata döndürdü. Veri yükleme iptal edildi.',
          errors:
            data.critical_errors ||
            data.errors ||
            [
              {
                field: 'BACKEND',
                message: data.detail || data.message || `HTTP ${response.status} hatası oluştu`,
                value: response.status,
              },
            ],
        });

        setUploadResult(errorData);
        return;
      }

      const normalized = normalizeBackendResponse(data);
      setUploadResult(normalized);
      fetchBatchHistory();
    } catch (error) {
      setUploadProgress(100);
      setUploadResult({
        status: 'rejected',
        message: 'Backend bağlantısı kurulamadı. FastAPI çalışıyor mu kontrol et.',
        quality_score: 0,
        critical_errors: [
          {
            field: 'API',
            message: error.message || 'Bağlantı hatası',
            value: `${API_BASE_URL}/import`,
          },
        ],
        warnings: [],
      });
    } finally {
      setTimeout(() => {
        setIsUploading(false);
      }, 600);
    }
  };

  const TabButton = ({ id, label, icon: Icon }) => {
    const active = activeTab === id;

    return (
      <button
        onClick={() => setActiveTab(id)}
        style={{
          ...styles.tabButton,
          background: active ? colors.softRed : 'transparent',
          color: active ? colors.accent : colors.subText,
        }}
      >
        <Icon size={17} />
        {label}
      </button>
    );
  };

  return (
    <div style={{ ...styles.page, background: colors.bg, color: colors.text }}>
      <header style={styles.header}>
        <div>
          <h1 style={{ ...styles.title, color: colors.text }}>
            <Database color="#dc2626" />
            CRM Veri <span style={{ color: '#dc2626' }}>Yönetimi</span>
          </h1>

         
        </div>

       
      </header>

      <div style={styles.tabs}>
        <TabButton id="import" label="Veri Yükleme" icon={Upload} />
        <TabButton id="quality" label="Veri Kalite Analizi" icon={ShieldCheck} />
        <TabButton id="history" label="Batch İşlem Geçmişi" icon={History} />
      
      </div>

      {activeTab === 'import' && (
        <div style={styles.importGrid}>
          <section style={cardStyle(colors)}>
            <div
              style={{
                ...styles.uploadBox,
                border: `2px dashed ${colors.cardBorder}`,
                background: darkMode ? '#101114' : '#fff7f8',
              }}
            >
              <div style={{ ...styles.uploadIcon, background: colors.softRed }}>
                <Upload size={44} />
              </div>

              <h2 style={{ ...styles.uploadTitle, color: colors.text }}>CRM Veri Yükleme</h2>

            

              <input
                id="crm-file-input"
                type="file"
                accept=".csv,.json,.xlsx"
                onChange={handleFileChange}
                style={{ display: 'none' }}
              />

              <div style={styles.uploadActions}>
                <label
                  htmlFor="crm-file-input"
                  style={{
                    ...styles.fileButton,
                    background: darkMode ? '#222329' : '#ffffff',
                    border: `1px solid ${colors.cardBorder}`,
                    color: colors.text,
                  }}
                >
                  DOSYA SEÇ
                </label>

                <button
                  onClick={handleUpload}
                  disabled={isUploading}
                  style={{
                    ...styles.uploadButton,
                    cursor: isUploading ? 'not-allowed' : 'pointer',
                    opacity: isUploading ? 0.65 : 1,
                  }}
                >
                  KONTROL ET VE YÜKLE
                </button>
              </div>

              {selectedFile && (
                <div
                  style={{
                    ...styles.selectedFile,
                    background: darkMode ? '#17181d' : '#ffffff',
                    border: `1px solid ${colors.cardBorder}`,
                  }}
                >
                  <FileSpreadsheet size={20} color="#dc2626" />
                  <div style={{ textAlign: 'left' }}>
                    <div style={styles.selectedFileName}>{selectedFile.name}</div>
                    <div style={{ ...styles.selectedFileSize, color: colors.subText }}>
                      {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                    </div>
                  </div>
                </div>
              )}
            </div>

            {isUploading && (
              <div
                style={{
                  ...styles.progressCard,
                  background: darkMode ? '#111217' : '#fff7f8',
                  border: `1px solid ${colors.cardBorder}`,
                }}
              >
                <div style={styles.progressTop}>
                  <div style={{ ...styles.progressLabel, color: colors.subText }}>
                    <RefreshCw size={15} color="#dc2626" />
                    CRM veri kalite kontrolü çalışıyor
                  </div>

                  <span style={styles.progressPercent}>%{uploadProgress}</span>
                </div>

                <div
                  style={{
                    ...styles.progressTrack,
                    background: darkMode ? '#27272a' : '#fee2e2',
                  }}
                >
                  <div style={{ ...styles.progressFill, width: `${uploadProgress}%` }} />
                </div>
              </div>
            )}

            {uploadResult && <ResultBox colors={colors} uploadResult={uploadResult} />}
          </section>

          
        </div>
      )}

      {activeTab === 'quality' && (
        <div style={styles.columnGap}>
        <section style={cardStyle(colors)}>
  <div style={styles.qualityControlHeader}>
    <div>
      <h3 style={{ margin: 0, fontSize: 18, fontWeight: 900 }}>
        Kalite Analizi Seçimi
      </h3>
      <p style={{ margin: '6px 0 0', fontSize: 12, color: colors.subText }}>
        Genel veri kalitesini veya belirli bir batch yüklemesinin kalitesini görüntüle.
      </p>
    </div>

    <button
      onClick={() => fetchQualityData(qualityMode, selectedQualityBatchId)}
      style={{
        ...styles.refreshButton,
        background: darkMode ? '#101114' : '#fff7f8',
        border: `1px solid ${colors.cardBorder}`,
        color: colors.text,
      }}
    >
      <RefreshCw size={15} />
      Yenile
    </button>
  </div>

  <div style={styles.qualityControls}>
    <label style={styles.radioLabel}>
      <input
        type="radio"
        name="qualityMode"
        checked={qualityMode === 'summary'}
        onChange={() => {
          setQualityMode('summary');
          setSelectedQualityBatchId('');
          fetchQualityData('summary', '');
        }}
      />
      Genel Kalite
    </label>

    <label style={styles.radioLabel}>
      <input
        type="radio"
        name="qualityMode"
        checked={qualityMode === 'batch'}
        onChange={() => {
          setQualityMode('batch');
          const firstBatchId = batchHistory?.[0]?.batch_id || '';
          setSelectedQualityBatchId(firstBatchId);
          if (firstBatchId) {
            fetchQualityData('batch', firstBatchId);
          }
        }}
      />
      Batch Bazlı Kalite
    </label>

    {qualityMode === 'batch' && (
      <select
        value={selectedQualityBatchId}
        onChange={(e) => {
          setSelectedQualityBatchId(e.target.value);
          fetchQualityData('batch', e.target.value);
        }}
        style={{
          ...styles.batchSelect,
          background: darkMode ? '#101114' : '#fff7f8',
          border: `1px solid ${colors.cardBorder}`,
          color: colors.text,
        }}
      >
        <option value="">Batch seç</option>
        {batchHistory.map((batch) => (
          <option key={batch.batch_id} value={batch.batch_id}>
            Batch #{batch.batch_id} - {String(batch.kaynak_tipi || '').toUpperCase()}
          </option>
        ))}
      </select>
    )}
  </div>

  {isQualityLoading && (
    <div style={{ ...styles.infoBox, color: colors.subText }}>
      Kalite analizi yükleniyor...
    </div>
  )}

  {qualityError && (
    <div style={styles.errorBox}>
      {qualityError}
    </div>
  )}
</section>
          <div style={styles.threeGrid}>
            <section style={cardStyle(colors)}>
              <p style={smallLabel(colors)}>CRM Veri Kalite Skoru</p>
              <div style={styles.scoreLine}>
                <h2 style={styles.bigScore}>%{uploadResult?.quality_score ?? 91}</h2>
                <span style={styles.activeBadge}>
                  <ArrowUpRight size={14} />
                  Aktif
                </span>
              </div>
              <p style={{ ...styles.smallInfo, color: colors.subText }}>
                Son yüklenen CRM verisi baz alınır.
              </p>
            </section>

            <section style={cardStyle(colors)}>
              <p style={smallLabel(colors)}>Hata Dağılımı</p>
              <div
                style={{
                  ...styles.errorDistribution,
                  background: darkMode ? '#27272a' : '#fee2e2',
                }}
              >
                <div style={{ width: '35%', background: '#dc2626' }} />
                <div style={{ width: '40%', background: '#ca8a04' }} />
                <div style={{ width: '25%', background: '#2563eb' }} />
              </div>
              <div style={{ ...styles.errorLabels, color: colors.subText }}>
                <span>KRİTİK</span>
                <span>UYARI</span>
                <span>EKSİK</span>
              </div>
            </section>

            <section style={styles.redCard}>
              <Zap size={24} />
              <h3 style={styles.redCardTitle}>Akıllı Veri Kontrolü</h3>
              <p style={styles.redCardText}>
                Kritik alanlar yükleme öncesinde kontrol edilir. Küçük hatalar kalite raporuna eklenir.
              </p>
            </section>
          </div>

          <div style={styles.threeGrid}>
            {qualityDimensions.map((dim) => (
              <section key={dim.id} style={cardStyle(colors)}>
                <div style={styles.qualityHeader}>
                  <div
                    style={{
                      ...styles.qualityIcon,
                      background: dim.bg,
                      color: dim.color,
                    }}
                  >
                    <ShieldCheck size={20} />
                  </div>

                  <span style={{ ...styles.qualityScore, color: dim.color }}>%{dim.score}</span>
                </div>

                <h4 style={styles.qualityTitle}>{dim.name}</h4>

                <p style={{ ...styles.qualityDesc, color: colors.subText }}>{dim.desc}</p>

                <div
                  style={{
                    ...styles.miniProgressTrack,
                    background: darkMode ? '#27272a' : '#fee2e2',
                  }}
                >
                  <div
                    style={{
                      ...styles.miniProgressFill,
                      width: `${dim.score}%`,
                      background: dim.color,
                    }}
                  />
                </div>
              </section>
            ))}
          </div>

          <section style={cardStyle(colors)}>
            <div style={cardTitleStyle(colors)}>
              <AlertCircle size={18} color="#dc2626" />
              CRM Veri Hata Matrisi
            </div>

            <div style={styles.tableWrap}>
              <table style={styles.table}>
                <thead>
                  <tr style={{ color: colors.subText, textAlign: 'left', fontSize: 10 }}>
                    <th style={thStyle(colors)}>Önem</th>
                    <th style={thStyle(colors)}>Boyut</th>
                    <th style={thStyle(colors)}>Alan</th>
                    <th style={thStyle(colors)}>Değer</th>
                    <th style={thStyle(colors)}>Açıklama</th>
                    <th style={thStyle(colors)}>Etki</th>
                  </tr>
                </thead>

                <tbody>
                  {errorLogs.map((log) => (
                    <tr key={log.id}>
                      <td style={tdStyle(colors)}>
                        <span
                          style={{
                            ...styles.statusPill,
                            background: log.type === 'Kritik' ? '#dc2626' : '#fef3c7',
                            color: log.type === 'Kritik' ? '#ffffff' : '#854d0e',
                          }}
                        >
                          {log.type}
                        </span>
                      </td>
                      <td style={tdStyle(colors)}>{log.dimension}</td>
                      <td style={{ ...tdStyle(colors), color: '#dc2626', fontWeight: 900 }}>
                        {log.field}
                      </td>
                      <td style={tdStyle(colors)}>{log.value}</td>
                      <td style={tdStyle(colors)}>{log.message}</td>
                      <td style={{ ...tdStyle(colors), color: '#dc2626', fontWeight: 900 }}>
                        {log.impact}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}

      {activeTab === 'history' && (
        <section style={cardStyle(colors)}>
          <div style={styles.historyHeader}>
            <div style={cardTitleStyle(colors)}>
              <History size={18} color="#dc2626" />
              Batch İşlem Geçmişi
            </div>

            <button
              onClick={fetchBatchHistory}
              style={{
                ...styles.refreshButton,
                background: darkMode ? '#101114' : '#fff7f8',
                border: `1px solid ${colors.cardBorder}`,
                color: colors.text,
              }}
            >
              <RefreshCw size={15} />
              Yenile
            </button>
          </div>

          {isBatchLoading && (
            <div style={{ ...styles.infoBox, color: colors.subText }}>
              Batch kayıtları yükleniyor...
            </div>
          )}

          {batchError && (
            <div style={styles.errorBox}>
              {batchError}
            </div>
          )}

          {!isBatchLoading && !batchError && batchHistory.length === 0 && (
            <div style={{ ...styles.infoBox, color: colors.subText }}>
              Henüz batch kaydı bulunamadı.
            </div>
          )}

          {batchHistory.length > 0 && (
            <div style={styles.tableWrap}>
              <table style={styles.table}>
                <thead>
                  <tr style={{ color: colors.subText, textAlign: 'left', fontSize: 10 }}>
                    <th style={thStyle(colors)}>Batch ID</th>
                    <th style={thStyle(colors)}>Tarih</th>
                    <th style={thStyle(colors)}>Kaynak</th>
                    <th style={thStyle(colors)}>Kayıt</th>
                    <th style={thStyle(colors)}>Durum</th>
                    <th style={thStyle(colors)}>Kalite</th>
                    <th style={thStyle(colors)}>İşlem</th>
                  </tr>
                </thead>

                <tbody>
                  {batchHistory.map((batch) => {
                    const status = getBatchStatus(batch);
                    const quality = calculateBatchQuality(batch);

                    return (
                      <tr key={batch.batch_id}>
                        <td style={{ ...tdStyle(colors), color: '#dc2626', fontWeight: 900 }}>
                          #{batch.batch_id}
                        </td>

                        <td style={tdStyle(colors)}>
                          {formatDate(batch.olusturma_tarihi || batch.baslama_zamani)}
                        </td>

                        <td style={tdStyle(colors)}>
                          <div style={styles.sourceCell}>
                            <FileSpreadsheet size={15} color="#dc2626" />
                            {String(batch.kaynak_tipi || '-').toUpperCase()}
                          </div>
                        </td>

                        <td style={tdStyle(colors)}>
                          {Number(batch.toplam_kayit || 0).toLocaleString('tr-TR')}
                        </td>

                        <td style={tdStyle(colors)}>
                          <span
                            style={{
                              ...styles.statusPill,
                              background:
                                status === 'Tamamlandı'
                                  ? '#dcfce7'
                                  : status === 'Uyarılı'
                                  ? '#fef3c7'
                                  : status === 'Temizlendi'
                                  ? '#dbeafe'
                                  : '#fee2e2',
                              color:
                                status === 'Tamamlandı'
                                  ? '#166534'
                                  : status === 'Uyarılı'
                                  ? '#854d0e'
                                  : status === 'Temizlendi'
                                  ? '#1d4ed8'
                                  : '#991b1b',
                            }}
                          >
                            {status}
                          </span>
                        </td>

                        <td style={tdStyle(colors)}>%{quality}</td>

                        <td style={tdStyle(colors)}>
                          <div style={styles.actionIcons}>
                            <ExternalLink size={16} color={colors.subText} />
                            <Download size={16} color={colors.subText} />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {activeTab === 'reports' && (
        <div style={styles.reportGrid}>
          <section style={cardStyle(colors)}>
            <div style={cardTitleStyle(colors)}>
              <FileText size={18} color="#dc2626" />
              Kalite Rapor Parametreleri
            </div>

            {[
              'Eksik Müşteri Bilgileri',
              'Fatura Tutarı Kontrolü',
              'Belge Tipi Kontrolü',
              'Mükerrer Müşteri Kontrolü',
            ].map((item) => (
              <label
                key={item}
                style={{
                  ...styles.checkboxRow,
                  border: `1px solid ${colors.cardBorder}`,
                  background: darkMode ? '#101114' : '#fff7f8',
                  color: colors.text,
                }}
              >
                <input type="checkbox" defaultChecked />
                {item}
              </label>
            ))}

            <button
  onClick={handleGenerateReport}
  disabled={isReportLoading}
  style={{
    ...styles.reportButton,
    opacity: isReportLoading ? 0.65 : 1,
    cursor: isReportLoading ? 'not-allowed' : 'pointer',
  }}
>
  {isReportLoading ? 'RAPOR OLUŞTURULUYOR...' : 'RAPORU OLUŞTUR'}
</button>
          </section>

          <section style={{ ...cardStyle(colors), ...styles.reportPreview }}>
  {!reportData ? (
    <>
      <BarChart3 size={78} color={darkMode ? '#27272a' : '#fecaca'} />
      <h3 style={styles.reportPreviewTitle}>CRM Veri Kalite Raporu</h3>
      <p style={{ ...styles.reportPreviewText, color: colors.subText }}>
        Raporu oluşturunca kalite skoru, işlenen kayıt, hata ve bekleyen kayıtlar burada görünür.
      </p>
    </>
  ) : (
    <div style={{ width: '100%' }}>
      <h3 style={styles.reportPreviewTitle}>Kalite Raporu</h3>

      <div style={styles.reportKpiGrid}>
        <div style={styles.reportKpiBox}>
          <strong>%{reportData.quality_score ?? 0}</strong>
          <span>Kalite Skoru</span>
        </div>

        <div style={styles.reportKpiBox}>
          <strong>{reportData.toplam ?? 0}</strong>
          <span>Toplam Kayıt</span>
        </div>

        <div style={styles.reportKpiBox}>
          <strong>{reportData.processed ?? 0}</strong>
          <span>Processed</span>
        </div>

        <div style={styles.reportKpiBox}>
          <strong>{reportData.error ?? 0}</strong>
          <span>Error</span>
        </div>
      </div>
    </div>
  )}
</section>
        </div>
      )}

    </div>
  );
}

function ResultBox({ colors, uploadResult }) {
  const isRejected = uploadResult.status === 'rejected';
  const isWarning = uploadResult.status === 'completed_with_warnings';

  return (
    <div
      style={{
        marginTop: 20,
        padding: 20,
        borderRadius: 18,
        background: isRejected ? '#fee2e2' : isWarning ? '#fef3c7' : '#dcfce7',
        color: isRejected ? '#991b1b' : isWarning ? '#854d0e' : '#166534',
        border: `1px solid ${colors.cardBorder}`,
      }}
    >
      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
        {isRejected ? <XCircle size={24} /> : isWarning ? <FileWarning size={24} /> : <CheckCircle2 size={24} />}

        <div>
          <h3 style={{ margin: 0, fontSize: 17, fontWeight: 900 }}>
            {isRejected
              ? 'Yükleme Reddedildi'
              : isWarning
              ? 'Yükleme Uyarılarla Tamamlandı'
              : 'Yükleme Başarılı'}
          </h3>

          <p style={{ margin: '7px 0 0', fontSize: 13 }}>{uploadResult.message}</p>
        </div>
      </div>
    </div>
  );
}

/* =========================
   STİL KISMI
========================= */

function getColors(darkMode) {
  return {
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
    inputBg: darkMode ? '#101114' : '#fff7f8',
  };
}

const styles = {
  page: {
    minHeight: '100vh',
    padding: 32,
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
    margin: 0,
    fontSize: 30,
    fontWeight: 900,
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },
  description: {
    marginTop: 6,
    fontSize: 13,
  },
  statusBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '10px 16px',
    borderRadius: 16,
    color: '#dc2626',
    fontWeight: 900,
    fontSize: 12,
  },
  tabs: {
    display: 'flex',
    gap: 10,
    flexWrap: 'wrap',
    marginBottom: 26,
  },
  tabButton: {
    border: 'none',
    padding: '13px 18px',
    borderRadius: 16,
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    fontWeight: 900,
    fontSize: 12,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
importGrid: {
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  width: '100%',
},
  uploadBox: {
    minHeight: 360,
    borderRadius: 26,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center',
    padding: 34,
  },
  uploadIcon: {
    width: 92,
    height: 92,
    borderRadius: 28,
    color: '#dc2626',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 22,
  },
  uploadTitle: {
    margin: 0,
    fontSize: 24,
    fontWeight: 900,
  },
  uploadText: {
    marginTop: 10,
    marginBottom: 28,
    fontSize: 13,
    maxWidth: 560,
    lineHeight: 1.7,
  },
  uploadActions: {
    display: 'flex',
    gap: 12,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  fileButton: {
    padding: '13px 26px',
    borderRadius: 15,
    fontWeight: 900,
    fontSize: 12,
    cursor: 'pointer',
  },
  uploadButton: {
    padding: '13px 26px',
    borderRadius: 15,
    border: 'none',
    background: '#dc2626',
    color: '#ffffff',
    fontWeight: 900,
    fontSize: 12,
    boxShadow: '0 15px 30px rgba(220,38,38,0.28)',
  },
  selectedFile: {
    marginTop: 22,
    padding: '14px 18px',
    borderRadius: 16,
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },
  selectedFileName: {
    fontSize: 13,
    fontWeight: 900,
  },
  selectedFileSize: {
    fontSize: 10,
    marginTop: 3,
  },
  progressCard: {
    marginTop: 20,
    padding: 20,
    borderRadius: 18,
  },
  progressTop: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  progressLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    fontSize: 12,
    fontWeight: 900,
  },
  progressPercent: {
    color: '#dc2626',
    fontWeight: 900,
  },
  progressTrack: {
    height: 10,
    borderRadius: 999,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    background: '#dc2626',
    borderRadius: 999,
    transition: 'width 0.2s ease',
  },
  sideColumn: {
    display: 'flex',
    flexDirection: 'column',
    gap: 22,
  },
  ruleList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  },
  ruleItem: {
    padding: 12,
    borderRadius: 14,
    display: 'flex',
    gap: 9,
    fontSize: 12,
    lineHeight: 1.5,
  },
  columnGap: {
    display: 'flex',
    flexDirection: 'column',
    gap: 22,
  },
  threeGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
    gap: 18,
  },
  scoreLine: {
    display: 'flex',
    alignItems: 'end',
    gap: 8,
  },
  bigScore: {
    margin: 0,
    color: '#dc2626',
    fontSize: 38,
    fontWeight: 900,
  },
  activeBadge: {
    color: '#16a34a',
    fontSize: 11,
    fontWeight: 900,
    marginBottom: 7,
    display: 'flex',
    alignItems: 'center',
    gap: 4,
  },
  smallInfo: {
    margin: '8px 0 0',
    fontSize: 11,
  },
  errorDistribution: {
    height: 14,
    borderRadius: 999,
    overflow: 'hidden',
    display: 'flex',
    marginTop: 18,
  },
  errorLabels: {
    marginTop: 14,
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: 10,
    fontWeight: 900,
  },
  redCard: {
    background: 'linear-gradient(135deg, #dc2626, #991b1b)',
    color: '#ffffff',
    border: 'none',
    borderRadius: 22,
    padding: 22,
    boxShadow: '0 18px 42px rgba(0,0,0,0.18)',
  },
  redCardTitle: {
    margin: '12px 0 6px',
    fontSize: 18,
    fontWeight: 900,
  },
  redCardText: {
    margin: 0,
    fontSize: 12,
    lineHeight: 1.6,
    color: '#fee2e2',
  },
  qualityHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  qualityIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  qualityScore: {
    fontSize: 21,
    fontWeight: 900,
  },
  qualityTitle: {
    margin: '0 0 5px',
    fontSize: 14,
    fontWeight: 900,
  },
  qualityDesc: {
    margin: '0 0 15px',
    fontSize: 12,
  },
  miniProgressTrack: {
    height: 7,
    borderRadius: 999,
    overflow: 'hidden',
  },
  miniProgressFill: {
    height: '100%',
    borderRadius: 999,
  },
  tableWrap: {
    overflowX: 'auto',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: 13,
  },
  statusPill: {
    padding: '5px 9px',
    borderRadius: 9,
    fontSize: 10,
    fontWeight: 900,
  },
  historyHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  refreshButton: {
    height: 38,
    padding: '0 14px',
    borderRadius: 13,
    display: 'flex',
    alignItems: 'center',
    gap: 7,
    fontWeight: 900,
    fontSize: 11,
    cursor: 'pointer',
  },
  infoBox: {
    padding: 18,
    fontSize: 13,
    fontWeight: 800,
  },
  errorBox: {
    padding: 14,
    borderRadius: 14,
    background: '#fee2e2',
    color: '#991b1b',
    fontSize: 13,
    fontWeight: 800,
  },
  qualityControlHeader: {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
  gap: 16,
  marginBottom: 18,
},

qualityControls: {
  display: 'flex',
  alignItems: 'center',
  gap: 14,
  flexWrap: 'wrap',
},

radioLabel: {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  fontSize: 13,
  fontWeight: 900,
  cursor: 'pointer',
},

batchSelect: {
  minWidth: 240,
  height: 42,
  borderRadius: 13,
  padding: '0 12px',
  fontSize: 12,
  fontWeight: 800,
  outline: 'none',
},
  sourceCell: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  actionIcons: {
    display: 'flex',
    gap: 8,
  },
  reportGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 2fr',
    gap: 22,
  },
  checkboxRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: 13,
    borderRadius: 14,
    marginBottom: 10,
    fontSize: 12,
    fontWeight: 800,
  },
  reportButton: {
    marginTop: 12,
    width: '100%',
    padding: 14,
    borderRadius: 16,
    border: 'none',
    background: '#dc2626',
    color: '#ffffff',
    fontWeight: 900,
    cursor: 'pointer',
  },
  reportPreview: {
    minHeight: 420,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center',
  },
  reportPreviewTitle: {
    margin: '18px 0 8px',
    fontSize: 24,
    fontWeight: 900,
  },
  reportKpiGrid: {
  display: 'grid',
  gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
  gap: 14,
  marginTop: 18,
},

reportKpiBox: {
  minHeight: 90,
  borderRadius: 18,
  background: 'rgba(220,38,38,0.08)',
  border: '1px solid rgba(220,38,38,0.25)',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 7,
  fontSize: 12,
  fontWeight: 900,
},
  reportPreviewText: {
    fontSize: 13,
    maxWidth: 430,
    lineHeight: 1.7,
  },
  footer: {
    marginTop: 50,
    paddingTop: 28,
    textAlign: 'center',
    fontSize: 10,
    fontWeight: 900,
    letterSpacing: 3,
    textTransform: 'uppercase',
  },
};

function cardStyle(colors) {
  return {
    width: '100%',
    maxWidth: 1200,
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

function smallLabel(colors) {
  return {
    margin: 0,
    fontSize: 11,
    color: colors.subText,
    fontWeight: 900,
    textTransform: 'uppercase',
    letterSpacing: 1,
  };
}

function thStyle(colors) {
  return {
    padding: '14px 12px',
    borderBottom: `1px solid ${colors.cardBorder}`,
    fontWeight: 900,
    textTransform: 'uppercase',
    letterSpacing: 1,
  };
}

function tdStyle(colors) {
  return {
    padding: '15px 12px',
    borderBottom: `1px solid ${colors.cardBorder}`,
    color: colors.text,
  };
  
}