from fastapi import APIRouter
from pydantic import BaseModel
from typing import Dict, Any, List, Optional

from services.gemini_service import generate_rfm_analysis


router = APIRouter(prefix="/ai", tags=["AI"])


class RfmAiRequest(BaseModel):
    stats: Dict[str, Any]
    segment_data: List[Dict[str, Any]]
    heatmap_data: List[List[int]]
    trend_data: List[Dict[str, Any]]
    live_segment_analysis: Dict[str, Any]
    finance_label: str
    reference_label: str
    focus_segment: Optional[str] = None


# RFM MATRİSİ SAYFA
@router.post("/rfm-insight")
def rfm_ai(req: RfmAiRequest):
    prompt = f"""
Sen profesyonel bir CRM ve RFM müşteri analitiği uzmanısın.

Aşağıdaki RFM analiz sayfası verilerini incele:

KPI VERİLERİ:
{req.stats}

SEGMENT DAĞILIMI:
{req.segment_data}

RFM MATRİSİ:
{req.heatmap_data}

GELİR TRENDİ:
{req.trend_data}

CANLI SEGMENT ANALİZİ:
{req.live_segment_analysis}

Finansal görünüm:
{req.finance_label}

Tarih referansı:
{req.reference_label}

Odak segment:
{req.focus_segment if req.focus_segment else "Genel analiz"}

Görevin:
- En önemli 3 içgörüyü üret
- Riskli segmenti belirt
- Tek kampanya önerisi ver
- Gelir trendini kısa yorumla

Kurallar:
- Türkçe yaz
- Maksimum 3 madde yaz
- Her madde tek cümle olsun
- Kısa ve net yaz
- Genel konuşma yapma
- Sayısal veriye göre yorum yap
- CRM yöneticisine rapor sunuyormuş gibi yaz

Örnek format:
• Riskli müşteri oranı yükseliyor, geri kazanım kampanyası önerilir.
• VIP segmenti güçlü büyüyor, premium sadakat avantajı sunulabilir.
• Gelir trendi son dönemde düşüşte, kupon dönüşüm kampanyası önerilir.
"""

    try:
        result = generate_rfm_analysis(prompt)

        return {
            "success": True,
            "analysis": result
        }

    except Exception as e:
        return {
            "success": False,
            "analysis": f"AI analiz sırasında hata oluştu: {str(e)}"
        }


# MÜŞTERİ 360
class CustomerInsightRequest(BaseModel):
    customer: Dict[str, Any]


@router.post("/customer-insight")
def customer_ai_insight(req: CustomerInsightRequest):
    prompt = f"""
Sen profesyonel bir CRM müşteri analitiği uzmanısın.

Aşağıdaki müşteri datasını analiz et:

MÜŞTERİ DATASI:
{req.customer}

Görevin:
- Müşterinin risk durumunu yorumla
- Tek kampanya önerisi oluştur
- Sadakat veya geri kazanım aksiyonu öner

Kurallar:
- Türkçe yaz
- En fazla 3 kısa madde yaz
- Her madde tek cümle olsun
- Çok kısa yaz
- Genel konuşma yapma
- Gerçek CRM aksiyonu öner
- Veriye göre yorum yap
- Her madde yeni satırda başlasın
- Her satır "•" ile başlasın
- Madde formatını bozma

Örnek format:
• Müşteri uzun süredir alışveriş yapmıyor, %15 geri kazanım kuponu önerilir.
• Ortalama sepet tutarı yüksek olduğu için premium kampanyalara dahil edilebilir.
• İade oranı düşük olduğu için çapraz satış kampanyası uygulanabilir.
"""

    try:
        result = generate_rfm_analysis(prompt)

        return {
            "success": True,
            "analysis": result
        }

    except Exception as e:
        return {
            "success": False,
            "analysis": f"AI analiz sırasında hata oluştu: {str(e)}"
        }

# KAMPANYA YÖNETİMİ AI

class CampaignInsightRequest(BaseModel):
    campaign_name: Optional[str] = None
    target_goal: Optional[str] = None
    segments: Optional[List[str]] = []

# Kampanyalar sayfası için
@router.post("/campaign-insight")
def campaign_ai_insight(req: CampaignInsightRequest):
    segment_text = ", ".join(req.segments or []) if req.segments else "Genel müşteri kitlesi"

    prompt = f"""
Sen profesyonel bir CRM kampanya stratejisi uzmanısın.

Aşağıdaki kampanya oluşturma verilerini incele:

KAMPANYA ADI:
{req.campaign_name or "Belirtilmedi"}

KAMPANYA HEDEFİ:
{req.target_goal or "Belirtilmedi"}

HEDEF SEGMENTLER:
{segment_text}

Görevin:
- Kampanya için etkili mail konu başlığı üret
- Kısa kampanya mesajı üret
- Uygun kupon oranı öner
- Uygun kupon kodu öner
- Tahmini dönüşüm oranı tahmini ver
- Churn riski ve önerilen aksiyonu kısa belirt

Kurallar:
- Sadece JSON döndür
- Markdown kullanma
- Açıklama yazma
- Türkçe yaz
- Kupon oranı sadece sayı olsun
- Tahmini dönüşüm % ile yazılsın
- Her madde yeni satırda başlasın
- Her satır "•" ile başlasın
- Madde formatını bozma

JSON formatı:
{{
  "subject": "...",
  "body": "...",
  "couponRate": "15",
  "couponCode": "CRM15",
  "predictedConversion": "%8.2",
  "churnRisk": "...",
  "recommendedAction": "...",
  "hotTrend": "..."
}}
"""

    try:
        result = generate_rfm_analysis(prompt)

        clean_result = (
            result
            .replace("```json", "")
            .replace("```", "")
            .strip()
        )

        import json
        parsed = json.loads(clean_result)

        return {
            "success": True,
            **parsed
        }

    except Exception as e:
        return {
            "success": False,
            "subject": "Size Özel Kampanya Fırsatı",
            "body": "CRM müşteri segmentinize özel kampanya içeriği hazırlanmıştır.",
            "couponRate": "15",
            "couponCode": "CRM15",
            "predictedConversion": "%8.2",
            "churnRisk": "Analiz Edildi",
            "recommendedAction": "Segment bazlı kampanya gönder",
            "hotTrend": "Kişiselleştirilmiş kupon önerisi",
            "error": str(e)
        }



from pydantic import BaseModel
from typing import Any, Dict, List


class CampaignSuggestionRequest(BaseModel):
    customer: Dict[str, Any]
    spendingRows: List[Dict[str, Any]] = []
    timeline: List[Dict[str, Any]] = []


    #360

@router.post("/customer-campaign-suggestions")
def customer_campaign_suggestions(
    payload: CampaignSuggestionRequest
):
    customer = payload.customer
    spending_rows = payload.spendingRows
    timeline = payload.timeline

    orders = customer.get("metrics", {}).get("orders", 0)
    returns = customer.get("metrics", {}).get("returns", 0)
    avg_order = customer.get("metrics", {}).get("avgOrder", "₺0")
    segment = customer.get("segment", "Segment Yok")
    churn_status = customer.get("metrics", {}).get("churnStatus", "Risk Yok")

    suggestions = []

    if churn_status in ["Yüksek Risk", "Riskli", "Risk Altında"] or returns >= 2:
        suggestions.append({
            "badge": "%15",
            "title": "Geri Kazanım Kuponu",
            "description": "Müşterinin iade/risk davranışı yüksek olduğu için güven artırıcı indirim önerilir.",
            "condition": "₺1.000 ve üzeri alışverişte %15 indirim"
        })

    if orders >= 5:
        suggestions.append({
            "badge": "VIP",
            "title": "Sadakat Kampanyası",
            "description": "Müşteri tekrar alışveriş yapan grupta olduğu için sadakat avantajı sunulabilir.",
            "condition": "Sonraki alışverişte ücretsiz kargo + %10 kupon"
        })

    if orders <= 1:
        suggestions.append({
            "badge": "2.AL",
            "title": "İkinci Alışveriş Teşviki",
            "description": "Müşteri az alışveriş yaptığı için tekrar satın almaya yönlendirilmelidir.",
            "condition": "İkinci alışverişte ₺250 indirim"
        })

    online_count = len([
        item for item in timeline
        if "online" in str(item.get("channel", "")).lower()
        or "sporthink.com" in str(item.get("store", "")).lower()
    ])

    physical_count = len(timeline) - online_count

    if online_count > physical_count:
        suggestions.append({
            "badge": "ONLINE",
            "title": "Online Mağaza Kuponu",
            "description": "Müşteri daha çok online kanaldan alışveriş yaptığı için online özel kampanya önerilir.",
            "condition": "Online mağazada ₺1.500 üzeri alışverişte %12 indirim"
        })
    else:
        suggestions.append({
            "badge": "MAĞAZA",
            "title": "Fiziksel Mağaza Ziyaret Kampanyası",
            "description": "Müşteri fiziksel mağaza alışverişine daha yatkın görünüyor.",
            "condition": "Mağazada geçerli ₺300 indirim kuponu"
        })

    if len(suggestions) == 0:
        suggestions.append({
            "badge": "%10",
            "title": "Genel Sepet Artırma Kampanyası",
            "description": "Müşterinin harcama geçmişine göre sepet tutarını artırmaya yönelik kampanya önerilir.",
            "condition": "₺1.000 üzeri alışverişte %10 indirim"
        })

    return {
        "success": True,
        "suggestions": suggestions[:3]
    }
class ApplyCustomerCampaignRequest(BaseModel):
    customerId: int
    customerName: str
    email: Optional[str] = None
    campaign: Dict[str, Any]


@router.post("/apply-customer-campaign")
def apply_customer_campaign(req: ApplyCustomerCampaignRequest):
    if not req.email:
        return {
            "success": False,
            "message": "Müşterinin mail adresi bulunamadı."
        }

    campaign = req.campaign

    print("KAMPANYA UYGULANDI")
    print("Müşteri:", req.customerName)
    print("Mail:", req.email)
    print("Kampanya:", campaign)

    return {
        "success": True,
        "message": "Kampanya uygulandı ve mail gönderimi için hazırlandı."
    }

# DASHBOARD AI AKILLI ÖZET

class DashboardInsightRequest(BaseModel):
    kpis: Dict[str, Any]
    ciro_trend: List[Dict[str, Any]]
    segment_dagilimi: List[Dict[str, Any]]
    kategori_performansi: List[Dict[str, Any]]
    bolgesel_dagilim: List[Dict[str, Any]]
    siparis_yogunluk_heatmap: List[Dict[str, Any]]
    filters: Dict[str, Any]


@router.post("/dashboard-insight")
def dashboard_ai_insight(req: DashboardInsightRequest):

    prompt = f"""
Sen üst düzey CRM ve perakende analitiği uzmanısın.
Bir CRM dashboard verisini yorumlayarak yönetime profesyonel içgörü sunuyorsun.

Aşağıdaki verileri analiz et:

========================
KPI VERİLERİ
========================
{req.kpis}

========================
CİRO TRENDİ
========================
{req.ciro_trend}

========================
SEGMENT DAĞILIMI
========================
{req.segment_dagilimi}

========================
KATEGORİ PERFORMANSI
========================
{req.kategori_performansi}

========================
BÖLGESEL DAĞILIM
========================
{req.bolgesel_dagilim}

========================
ALIŞVERİŞ YOĞUNLUĞU
========================
{req.siparis_yogunluk_heatmap}

========================
AKTİF FİLTRELER
========================
{req.filters}

GÖREVLERİN:

1. Dashboard verilerini detaylı analiz et
2. Trendleri yorumla
3. Düşüş / risk alanlarını belirt
4. Güçlü performans alanlarını belirt
5. Segment davranışlarını yorumla
6. Satış fırsatlarını belirt
7. Kampanya önerileri üret
8. Operasyonel risk varsa belirt
9. Saat / kategori / bölge bazlı fırsatları yorumla
10. Yöneticiye sunulacak profesyonel özet çıkar

YAZIM KURALLARI:

- Türkçe yaz
- Genel konuşma yapma
- Verilere göre yorum yap
- Maddeler halinde yaz
- Her madde yeni satırda başlasın
- Her satır "•" ile başlasın
- Minimum 8 madde yaz
- Maksimum 15 madde yaz
- Her madde en az 1 tam cümle olsun
- Kısa cevap verme
- Tekrar eden cümle kurma
- Sayısal verileri yorumlamaya çalış
- Profesyonel CRM yöneticisi dili kullan
- Analiz odaklı yaz
- İçgörü üret
- Sadece veri özeti verme
- Veriden anlam çıkar
- Mümkünse karşılaştırmalı yorum yap

ÖZELLİKLE ŞUNLARI YORUMLA:

- Reel vs nominal farkı
- İade etkisi
- En güçlü kategori
- Zayıf kategori
- En güçlü müşteri segmenti
- Riskli müşteri davranışı
- Bölgesel yoğunluk
- Alışveriş saatleri
- Sepet davranışı
- Satın alma yoğunluğu
- Tekrar satın alma eğilimi
- Kampanya fırsatı
- Cross-sell fırsatı
- Upsell fırsatı

ÇIKTI FORMATI ÖRNEĞİ:

• Reel ciro nominal ciroya yakın ilerlediği için fiyat artışından bağımsız gerçek satış performansı korunuyor görünüyor.
• En yüksek satış performansı spor ayakkabı kategorisinde oluşurken aksesuar kategorisinde belirgin zayıflama dikkat çekiyor.
• VIP müşteri segmentinin toplam ciro katkısı yüksek olduğu için premium kampanyalar bu segmentte daha yüksek dönüş sağlayabilir.
• Akşam saatlerinde sipariş yoğunluğu arttığı için push bildirim kampanyalarının 18:00 sonrası planlanması önerilir.
• İade oranı belirli kategorilerde yükseldiği için ürün kalite ve beden uyumu analizlerinin gözden geçirilmesi önerilir.
"""

    try:
        result = generate_rfm_analysis(prompt)

        return {
            "success": True,
            "analysis": result
        }

    except Exception as e:
        return {
            "success": False,
            "analysis": f"Dashboard AI analiz sırasında hata oluştu: {str(e)}"
        }